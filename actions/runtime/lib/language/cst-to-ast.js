import {} from 'chevrotain';
import { fail } from '../errors.js';
import { numericValue, stringValue } from './lexer.js';
import { detailParser } from './parser.js';
import { sourceRange } from './source.js';
const Visitor = detailParser.getBaseCstVisitorConstructor();
const child = (context, key, index = 0) => context[key][index];
const token = (context, key) => context[key][0];
/** Pure CST translation. Binding, type checks, and evaluation remain separate passes. */
export class AstVisitor extends Visitor {
    input;
    constructor(input) {
        super();
        this.input = input;
        this.validateVisitor();
    }
    ast(node) { return this.visit(node); }
    range(start, end) { return sourceRange(this.input, start, end); }
    tokenRange(value) { return this.range(value.startOffset, value.endOffset + 1); }
    span(context) {
        const entries = Object.values(context).flat();
        const starts = entries.map(e => 'tokenType' in e ? e.startOffset : e.location?.startOffset).filter((n) => n !== undefined && Number.isFinite(n) && n >= 0);
        const ends = entries.map(e => 'tokenType' in e ? e.endOffset : e.location?.endOffset).filter((n) => n !== undefined && Number.isFinite(n) && n >= 0);
        if (!starts.length || !ends.length)
            fail('E_INTERNAL', 'A complete CST node has no source location.', 'parse');
        return this.range(Math.min(...starts), Math.max(...ends) + 1);
    }
    chain(context, operand, operator) {
        const operands = context[operand];
        let result = this.ast(operands[0]);
        for (let i = 0; i < (context[operator]?.length ?? 0); i++) {
            const op = context[operator][i], right = this.ast(operands[i + 1]);
            result = { kind: 'binary', operator: op.image, left: result, right,
                operatorSpan: this.tokenRange(op), span: this.range(result.span.start, right.span.end) };
        }
        return result;
    }
    source(context) { return this.ast(child(context, 'expression')); }
    expression(context) { return this.ast(child(context, 'conditional')); }
    conditional(context) {
        const condition = this.ast(child(context, 'disjunction'));
        if (!context.Question)
            return condition;
        return { kind: 'conditional', condition, whenTrue: this.ast(child(context, 'conditional')),
            whenFalse: this.ast(child(context, 'conditional', 1)), span: this.span(context) };
    }
    disjunction(context) { return this.chain(context, 'conjunction', 'Or'); }
    conjunction(context) { return this.chain(context, 'equality', 'And'); }
    equality(context) { return this.chain(context, 'comparison', 'EqualityOperator'); }
    comparison(context) { return this.chain(context, 'additive', 'ComparisonOperator'); }
    additive(context) { return this.chain(context, 'product', 'AdditiveOperator'); }
    product(context) { return this.chain(context, 'unary', 'ProductOperator'); }
    unary(context) {
        let result = this.ast(child(context, 'access'));
        const prefixes = (context.UnaryOperator ?? []);
        for (let i = prefixes.length - 1; i >= 0; i--) {
            const op = prefixes[i];
            result = { kind: 'unary', operator: op.image, operatorSpan: this.tokenRange(op),
                operand: result, span: this.range(op.startOffset, result.span.end) };
        }
        return result;
    }
    access(context) {
        let result = this.ast(child(context, 'primary'));
        for (const node of (context.member ?? [])) {
            const suffix = this.visit(node);
            result = { kind: 'member', object: result, key: suffix.key, keySpan: suffix.keySpan,
                span: this.range(result.span.start, suffix.end) };
        }
        return result;
    }
    member(context) {
        const key = token(context, context.Identifier ? 'Identifier' : 'StringLiteral');
        return { key: context.Identifier ? key.image : stringValue(key, this.input), keySpan: this.tokenRange(key), end: this.span(context).end };
    }
    primary(context) {
        if (context.Identifier) {
            const name = token(context, 'Identifier');
            return context.callSuffix
                ? { kind: 'call', name: name.image, nameSpan: this.tokenRange(name), arguments: this.visit(child(context, 'callSuffix')), span: this.span(context) }
                : { kind: 'identifier', name: name.image, span: this.tokenRange(name) };
        }
        if (context.expression)
            return { ...this.ast(child(context, 'expression')), span: this.span(context) };
        return this.ast(child(context, context.literal ? 'literal' : context.list ? 'list' : 'record'));
    }
    callSuffix(context) { return (context.argument ?? []).map(node => this.ast(node)); }
    argument(context) { return this.ast(child(context, context.lambda ? 'lambda' : 'expression')); }
    lambda(context) {
        const parameter = token(context, 'Identifier');
        return { kind: 'lambda', parameter: parameter.image, parameterSpan: this.tokenRange(parameter),
            body: this.ast(child(context, 'expression')), span: this.span(context) };
    }
    list(context) {
        return { kind: 'list', items: (context.expression ?? []).map(node => this.ast(node)), span: this.span(context) };
    }
    record(context) {
        return { kind: 'record', fields: (context.field ?? []).map(node => this.visit(node)), span: this.span(context) };
    }
    field(context) {
        const key = token(context, context.Identifier ? 'Identifier' : 'StringLiteral');
        return { key: context.Identifier ? key.image : stringValue(key, this.input), keySpan: this.tokenRange(key), value: this.ast(child(context, 'expression')) };
    }
    literal(context) {
        const key = Object.keys(context)[0], value = token(context, key), base = { kind: 'literal', raw: value.image, span: this.tokenRange(value) };
        if (context.NumberLiteral)
            return { ...base, ...numericValue(value, this.input) };
        if (context.StringLiteral)
            return { ...base, literalType: 'string', value: stringValue(value, this.input) };
        if (context.Null)
            return { ...base, literalType: 'null', value: null };
        return { ...base, literalType: 'boolean', value: !!context.True };
    }
}
//# sourceMappingURL=cst-to-ast.js.map