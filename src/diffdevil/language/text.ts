import { tokenMatcher } from 'chevrotain';
import { capture, fail, unwrap } from '../errors.js';
import { deepFreeze } from '../inert.js';
import { DEFAULT_LIMITS, type EvaluationLimits } from '../limits.js';
import type { Result } from '../model.js';
import type { Ast } from './ast.js';
import { compileAst, type CompileOptions, type CompiledExpression } from './compile.js';
import { AstVisitor } from './cst-to-ast.js';
import { ComparisonOperator, EqualityOperator, lexSource } from './lexer.js';
import { detailParser } from './parser.js';
import { expressionSource, locateDiagnostic, sourceRange, type ExpressionSource } from './source.js';

function children(node: Ast): readonly Ast[] {
  switch (node.kind) {
    case 'member': return [node.object];
    case 'unary': return [node.operand];
    case 'binary': return [node.left, node.right];
    case 'conditional': return [node.condition, node.whenTrue, node.whenFalse];
    case 'call': return node.arguments;
    case 'lambda': return [node.body];
    case 'list': return node.items;
    case 'record': return node.fields.map(field => field.value);
    default: return [];
  }
}
function checkAstSize(ast: Ast, limits: EvaluationLimits): void {
  const pending: { node: Ast; depth: number }[] = [{ node: ast, depth: 0 }];
  let count = 0;
  while (pending.length) {
    const { node, depth } = pending.pop()!;
    if (++count > limits.astNodes || depth > limits.nestingDepth) fail('E_LIMIT', 'Expression exceeds its AST size or nesting limit.', 'parse', node.span);
    for (const child of children(node)) pending.push({ node: child, depth: depth + 1 });
  }
}
function parse(source: ExpressionSource, limits: EvaluationLimits): Ast {
  const tokens = lexSource(source, limits);
  detailParser.prepare(source, tokens, limits);
  try {
    const cst = detailParser.source();
    const error = detailParser.errors[0];
    if (error) {
      const token = error.token, offset = token.startOffset;
      const start = Number.isFinite(offset) && offset >= 0 ? offset : source.text.length;
      const end = Number.isFinite(token.endOffset) && token.endOffset! >= start ? token.endOffset! + 1 : start;
      const atEnd = error.context.ruleStack.at(-1) === 'source';
      const chained = tokenMatcher(token, ComparisonOperator) || tokenMatcher(token, EqualityOperator);
      fail(atEnd && !chained ? 'E_TRAILING_INPUT' : 'E_PARSE',
        atEnd && !chained ? 'Unexpected input after the complete expression.' : 'Invalid or incomplete expression syntax.',
        'parse', sourceRange(source, start, end));
    }
    const ast = new AstVisitor(source).visit(cst) as Ast;
    checkAstSize(ast, limits);
    return deepFreeze(ast);
  } finally { detailParser.release(); }
}
function withSource<T>(input: string | ExpressionSource, action: (source: ExpressionSource) => T): Result<T> {
  let source: ExpressionSource | undefined;
  const result = capture(() => { source = expressionSource(input); return action(source); });
  return result.ok || !source ? result : { ok: false, diagnostics: result.diagnostics.map(d => locateDiagnostic(d, source!)) };
}
/** Parse complete detail source to immutable, toolkit-independent syntax. Not a persisted-program format. */
export function parseExpression(source: string | ExpressionSource, options: { readonly limits?: EvaluationLimits } = {}): Result<Ast> {
  return withSource(source, text => parse(text, options.limits ?? DEFAULT_LIMITS));
}
/** Lex, parse, construct syntax, bind and type-check through the existing compiler. */
export function compileExpression(source: string | ExpressionSource, options: CompileOptions): Result<CompiledExpression> {
  return withSource(source, text => unwrap(compileAst(parse(text, options.limits ?? DEFAULT_LIMITS), options)));
}
