import { type CstChildrenDictionary, type CstNode, type IToken } from 'chevrotain';
import { fail } from '../errors.js';
import type { SourceRange } from '../model.js';
import type { Ast, BinaryOperator, UnaryOperator } from './ast.js';
import { numericValue, stringValue } from './lexer.js';
import { detailParser } from './parser.js';
import { sourceRange, type ExpressionSource } from './source.js';

type Context = CstChildrenDictionary;
type Field = Extract<Ast, { kind: 'record' }>['fields'][number];
type Member = { key: string; keySpan: SourceRange; end: number };
const Visitor = detailParser.getBaseCstVisitorConstructor<undefined, unknown>();
const child = (context: Context, key: string, index = 0): CstNode => context[key]![index] as CstNode;
const token = (context: Context, key: string): IToken => context[key]![0] as IToken;

/** Pure CST translation. Binding, type checks, and evaluation remain separate passes. */
export class AstVisitor extends Visitor {
  constructor(private readonly input: ExpressionSource) { super(); this.validateVisitor(); }
  private ast(node: CstNode): Ast { return this.visit(node) as Ast; }
  private range(start: number, end: number): SourceRange { return sourceRange(this.input, start, end); }
  private tokenRange(value: IToken): SourceRange { return this.range(value.startOffset, value.endOffset! + 1); }
  private span(context: Context): SourceRange {
    const entries = Object.values(context).flat();
    const starts = entries.map(e => 'tokenType' in e ? e.startOffset : e.location?.startOffset).filter((n): n is number => n !== undefined && Number.isFinite(n) && n >= 0);
    const ends = entries.map(e => 'tokenType' in e ? e.endOffset : e.location?.endOffset).filter((n): n is number => n !== undefined && Number.isFinite(n) && n >= 0);
    if (!starts.length || !ends.length) fail('E_INTERNAL', 'A complete CST node has no source location.', 'parse');
    return this.range(Math.min(...starts), Math.max(...ends) + 1);
  }
  private chain(context: Context, operand: string, operator: string): Ast {
    const operands = context[operand] as CstNode[];
    let result = this.ast(operands[0]!);
    for (let i = 0; i < (context[operator]?.length ?? 0); i++) {
      const op = context[operator]![i] as IToken, right = this.ast(operands[i + 1]!);
      result = { kind: 'binary', operator: op.image as BinaryOperator, left: result, right,
        operatorSpan: this.tokenRange(op), span: this.range(result.span.start, right.span.end) };
    }
    return result;
  }
  source(context: Context): Ast { return this.ast(child(context, 'expression')); }
  expression(context: Context): Ast { return this.ast(child(context, 'conditional')); }
  conditional(context: Context): Ast {
    const condition = this.ast(child(context, 'disjunction'));
    if (!context.Question) return condition;
    return { kind: 'conditional', condition, whenTrue: this.ast(child(context, 'conditional')),
      whenFalse: this.ast(child(context, 'conditional', 1)), span: this.span(context) };
  }
  disjunction(context: Context): Ast { return this.chain(context, 'conjunction', 'Or'); }
  conjunction(context: Context): Ast { return this.chain(context, 'equality', 'And'); }
  equality(context: Context): Ast { return this.chain(context, 'comparison', 'EqualityOperator'); }
  comparison(context: Context): Ast { return this.chain(context, 'additive', 'ComparisonOperator'); }
  additive(context: Context): Ast { return this.chain(context, 'product', 'AdditiveOperator'); }
  product(context: Context): Ast { return this.chain(context, 'unary', 'ProductOperator'); }
  unary(context: Context): Ast {
    let result = this.ast(child(context, 'access'));
    const prefixes = (context.UnaryOperator ?? []) as IToken[];
    for (let i = prefixes.length - 1; i >= 0; i--) {
      const op = prefixes[i]!;
      result = { kind: 'unary', operator: op.image as UnaryOperator, operatorSpan: this.tokenRange(op),
        operand: result, span: this.range(op.startOffset, result.span.end) };
    }
    return result;
  }
  access(context: Context): Ast {
    let result = this.ast(child(context, 'primary'));
    for (const node of (context.member ?? []) as CstNode[]) {
      const suffix = this.visit(node) as Member;
      result = { kind: 'member', object: result, key: suffix.key, keySpan: suffix.keySpan,
        span: this.range(result.span.start, suffix.end) };
    }
    return result;
  }
  member(context: Context): Member {
    const key = token(context, context.Identifier ? 'Identifier' : 'StringLiteral');
    return { key: context.Identifier ? key.image : stringValue(key, this.input), keySpan: this.tokenRange(key), end: this.span(context).end };
  }
  primary(context: Context): Ast {
    if (context.Identifier) {
      const name = token(context, 'Identifier');
      return context.callSuffix
        ? { kind: 'call', name: name.image, nameSpan: this.tokenRange(name), arguments: this.visit(child(context, 'callSuffix')) as Ast[], span: this.span(context) }
        : { kind: 'identifier', name: name.image, span: this.tokenRange(name) };
    }
    if (context.expression) return { ...this.ast(child(context, 'expression')), span: this.span(context) };
    return this.ast(child(context, context.literal ? 'literal' : context.list ? 'list' : 'record'));
  }
  callSuffix(context: Context): Ast[] { return ((context.argument ?? []) as CstNode[]).map(node => this.ast(node)); }
  argument(context: Context): Ast { return this.ast(child(context, context.lambda ? 'lambda' : 'expression')); }
  lambda(context: Context): Ast {
    const parameter = token(context, 'Identifier');
    return { kind: 'lambda', parameter: parameter.image, parameterSpan: this.tokenRange(parameter),
      body: this.ast(child(context, 'expression')), span: this.span(context) };
  }
  list(context: Context): Ast {
    return { kind: 'list', items: ((context.expression ?? []) as CstNode[]).map(node => this.ast(node)), span: this.span(context) };
  }
  record(context: Context): Ast {
    return { kind: 'record', fields: ((context.field ?? []) as CstNode[]).map(node => this.visit(node) as Field), span: this.span(context) };
  }
  field(context: Context): Field {
    const key = token(context, context.Identifier ? 'Identifier' : 'StringLiteral');
    return { key: context.Identifier ? key.image : stringValue(key, this.input), keySpan: this.tokenRange(key), value: this.ast(child(context, 'expression')) };
  }
  literal(context: Context): Ast {
    const key = Object.keys(context)[0]!, value = token(context, key), base = { kind: 'literal' as const, raw: value.image, span: this.tokenRange(value) };
    if (context.NumberLiteral) return { ...base, ...numericValue(value, this.input) };
    if (context.StringLiteral) return { ...base, literalType: 'string', value: stringValue(value, this.input) };
    if (context.Null) return { ...base, literalType: 'null', value: null };
    return { ...base, literalType: 'boolean', value: !!context.True };
  }
}
