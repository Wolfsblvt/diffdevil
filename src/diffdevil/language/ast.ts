import type { SourceRange } from '../model.js';

export type UnaryOperator = '!' | '+' | '-';
export type BinaryOperator = '+' | '-' | '*' | '/' | '%' | '<' | '<=' | '>' | '>=' | '==' | '!=' | 'in' | '&&' | '||';
interface Node { readonly span: SourceRange }
/** Internal syntax contract. Persist reports and results, not executable ASTs. */
export type Ast =
  | (Node & { readonly kind: 'literal'; readonly literalType: 'integer' | 'float' | 'string' | 'boolean' | 'null'; readonly raw: string; readonly value: number | string | boolean | null })
  | (Node & { readonly kind: 'identifier'; readonly name: string })
  | (Node & { readonly kind: 'member'; readonly object: Ast; readonly key: string; readonly keySpan: SourceRange })
  | (Node & { readonly kind: 'unary'; readonly operator: UnaryOperator; readonly operatorSpan: SourceRange; readonly operand: Ast })
  | (Node & { readonly kind: 'binary'; readonly operator: BinaryOperator; readonly operatorSpan: SourceRange; readonly left: Ast; readonly right: Ast })
  | (Node & { readonly kind: 'conditional'; readonly condition: Ast; readonly whenTrue: Ast; readonly whenFalse: Ast })
  | (Node & { readonly kind: 'call'; readonly name: string; readonly nameSpan: SourceRange; readonly arguments: readonly Ast[] })
  | (Node & { readonly kind: 'lambda'; readonly parameter: string; readonly parameterSpan: SourceRange; readonly body: Ast })
  | (Node & { readonly kind: 'list'; readonly items: readonly Ast[] })
  | (Node & { readonly kind: 'record'; readonly fields: readonly { readonly key: string; readonly keySpan: SourceRange; readonly value: Ast }[] });

const generated: SourceRange = Object.freeze({ source: 'generated', start: 0, end: 0 });
/** Shared builders for structured shortcuts, policies, and focused compiler tests. */
export const ast = {
  literal(value: number | string | boolean | null, span = generated, numericType?: 'integer' | 'float'): Ast {
    const literalType = typeof value === 'number' ? numericType ?? (Number.isInteger(value) ? 'integer' : 'float') : value === null ? 'null' : typeof value as 'string' | 'boolean';
    return { kind: 'literal', literalType, raw: JSON.stringify(value), value, span };
  },
  name(name: string, span = generated): Ast { return { kind: 'identifier', name, span }; },
  member(object: Ast, key: string, span = generated): Ast { return { kind: 'member', object, key, keySpan: span, span }; },
  path(parts: readonly string[], span = generated): Ast {
    if (!parts.length) throw new Error('An AST path requires a root.');
    return parts.slice(1).reduce<Ast>((node, key) => ast.member(node, key, span), ast.name(parts[0]!, span));
  },
  unary(operator: UnaryOperator, operand: Ast, span = generated): Ast { return { kind: 'unary', operator, operand, operatorSpan: span, span }; },
  binary(operator: BinaryOperator, left: Ast, right: Ast, span = generated): Ast { return { kind: 'binary', operator, left, right, operatorSpan: span, span }; },
  call(name: string, args: readonly Ast[], span = generated): Ast { return { kind: 'call', name, arguments: args, nameSpan: span, span }; },
  lambda(parameter: string, body: Ast, span = generated): Ast { return { kind: 'lambda', parameter, body, parameterSpan: span, span }; },
  list(items: readonly Ast[], span = generated): Ast { return { kind: 'list', items, span }; },
  record(fields: Readonly<Record<string, Ast>>, span = generated): Ast { return { kind: 'record', fields: Object.entries(fields).map(([key, value]) => ({ key, value, keySpan: span })), span }; },
  conditional(condition: Ast, whenTrue: Ast, whenFalse: Ast, span = generated): Ast { return { kind: 'conditional', condition, whenTrue, whenFalse, span }; },
};
