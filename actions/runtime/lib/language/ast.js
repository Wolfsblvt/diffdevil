const generated = Object.freeze({ source: 'generated', start: 0, end: 0 });
/** Shared builders for structured shortcuts, policies, and focused compiler tests. */
export const ast = {
    literal(value, span = generated, numericType) {
        const literalType = typeof value === 'number' ? numericType ?? (Number.isInteger(value) ? 'integer' : 'float') : value === null ? 'null' : typeof value;
        return { kind: 'literal', literalType, raw: JSON.stringify(value), value, span };
    },
    name(name, span = generated) { return { kind: 'identifier', name, span }; },
    member(object, key, span = generated) { return { kind: 'member', object, key, keySpan: span, span }; },
    path(parts, span = generated) {
        if (!parts.length)
            throw new Error('An AST path requires a root.');
        return parts.slice(1).reduce((node, key) => ast.member(node, key, span), ast.name(parts[0], span));
    },
    unary(operator, operand, span = generated) { return { kind: 'unary', operator, operand, operatorSpan: span, span }; },
    binary(operator, left, right, span = generated) { return { kind: 'binary', operator, left, right, operatorSpan: span, span }; },
    call(name, args, span = generated) { return { kind: 'call', name, arguments: args, nameSpan: span, span }; },
    lambda(parameter, body, span = generated) { return { kind: 'lambda', parameter, body, parameterSpan: span, span }; },
    list(items, span = generated) { return { kind: 'list', items, span }; },
    record(fields, span = generated) { return { kind: 'record', fields: Object.entries(fields).map(([key, value]) => ({ key, value, keySpan: span })), span }; },
    conditional(condition, whenTrue, whenFalse, span = generated) { return { kind: 'conditional', condition, whenTrue, whenFalse, span }; },
};
//# sourceMappingURL=ast.js.map