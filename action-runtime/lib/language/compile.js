import { capture, fail } from '../errors.js';
import { canonicalJson, contentId, deepFreeze, FORBIDDEN_KEYS, inertCopy, record } from '../inert.js';
import { DEFAULT_LIMITS, enforceBytes } from '../limits.js';
import { compilePathPattern } from '../paths.js';
import { collection, FUNCTION_NAMES, isNumeric, isOptional, itemType, joinTypes, optional, present, recordType, requireType, ROOT_NAMES } from './types.js';
import { readSchema } from './values.js';
import { boundReferences } from './references.js';
const programs = new WeakMap();
export function programState(program) {
    const state = programs.get(program);
    if (!state)
        fail('E_PROGRAM', 'Only a successfully compiled program can be evaluated.');
    return state;
}
export function expressionReferences(program) {
    const state = programState(program);
    return boundReferences(state.node, state.schema);
}
export const schemaId = (schema) => contentId('schema', schema);
const binders = new Set(['filter', 'map', 'any', 'all', 'sum', 'min', 'max', 'avg', 'sortBy']);
const binaryOperators = new Set(['+', '-', '*', '/', '%', '<', '<=', '>', '>=', '==', '!=', 'in', '&&', '||']);
function validSpan(value) {
    const span = record(value, 'AST span', 'E_AST');
    if (typeof span.start !== 'number' || typeof span.end !== 'number' || !Number.isSafeInteger(span.start) || !Number.isSafeInteger(span.end) || span.start < 0 || span.end < span.start || span.source !== undefined && typeof span.source !== 'string')
        fail('E_AST', 'AST spans must be ordered UTF-16 offsets.', 'bind');
    return { start: span.start, end: span.end, ...(typeof span.source === 'string' ? { source: span.source } : {}) };
}
function forbidden(name, span) {
    if (FORBIDDEN_KEYS.has(name))
        fail('E_FORBIDDEN_NAME', `Forbidden name ${name}.`, 'bind', span);
}
function identity(node) {
    if (node.kind === 'identifier')
        return node.name;
    if (node.kind === 'member') {
        const parent = identity(node.object);
        return parent === undefined ? undefined : `${parent}[${JSON.stringify(node.key)}]`;
    }
    return undefined;
}
function trueGuards(node, inherited) {
    const guards = new Map(inherited);
    const visit = (n) => {
        if (n.kind === 'binary' && n.operator === '&&') {
            visit(n.left);
            visit(n.right);
        }
        if (n.kind === 'unary' && n.operator === '!' && n.operand.kind === 'call' && ['isMissing', 'isNull'].includes(n.operand.name) && n.operand.arguments.length === 1) {
            const key = identity(n.operand.arguments[0]);
            if (key !== undefined)
                guards.set(key, (guards.get(key) ?? 0) | (n.operand.name === 'isMissing' ? 1 : 2));
        }
    };
    visit(node);
    return guards;
}
/** Compile structured syntax through the same binder/checker used by detail. */
export function compileAst(input, options) {
    return capture(() => {
        const limits = options.limits ?? DEFAULT_LIMITS;
        const copied = inertCopy(input, { maximumDepth: limits.nestingDepth * 3 + 8, maximumNodes: limits.astNodes * 16, forbidKeys: false, code: 'E_AST' });
        const schema = readSchema(inertCopy(options.environment, { code: 'E_INPUT' }));
        const context = options.context ?? 'query';
        if (!['query', 'condition', 'metric', 'band'].includes(context))
            fail('E_CONTEXT', 'Unsupported expression context.', 'bind');
        let nodes = 0;
        const walk = (node, locals, guards, depth) => {
            if (++nodes > limits.astNodes || depth > limits.nestingDepth)
                fail('E_LIMIT', 'Expression exceeds the selected node or nesting limit.', 'bind');
            if (!node || typeof node !== 'object')
                fail('E_AST', 'Expected an AST node.', 'bind');
            const span = validSpan(node.span);
            const child = (n, g = guards) => walk(n, locals, g, depth + 1);
            const base = (type) => ({ type, span });
            switch (node.kind) {
                case 'literal': {
                    const t = node.literalType;
                    if (!['integer', 'float', 'string', 'boolean', 'null'].includes(t) || typeof node.raw !== 'string')
                        fail('E_AST', 'Invalid literal syntax node.', 'bind', span);
                    if (isNumeric(t) && (typeof node.value !== 'number' || !Number.isFinite(node.value) || t === 'integer' && !Number.isSafeInteger(node.value)))
                        fail('E_NUMERIC_LITERAL', 'Literal is outside its numeric domain.', 'lex', span);
                    if (t === 'string') {
                        if (typeof node.value !== 'string')
                            fail('E_AST', 'String literal requires a string value.', 'bind', span);
                        enforceBytes(node.value, limits.stringBytes, 'String literal', 'lex');
                    }
                    if (t === 'boolean' && typeof node.value !== 'boolean' || t === 'null' && node.value !== null)
                        fail('E_AST', 'Literal value disagrees with its type.', 'bind', span);
                    return { ...base(t), kind: 'literal', value: node.value };
                }
                case 'identifier': {
                    if (typeof node.name !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(node.name))
                        fail('E_AST', 'Invalid identifier.', 'bind', span);
                    forbidden(node.name, span);
                    const localType = locals.get(node.name);
                    const available = context === 'query' || node.name !== 'rules' && (node.name !== 'bands' || context === 'condition');
                    const type = localType ?? (available ? schema[node.name] : undefined);
                    if (type === undefined)
                        fail('E_UNKNOWN_NAME', `Unknown name ${node.name}.`, 'bind', span);
                    return { ...base(guards.get(node.name) === 3 ? present(type) : type), kind: 'identifier', name: node.name, binding: localType === undefined ? 'root' : 'local' };
                }
                case 'member': {
                    if (typeof node.key !== 'string')
                        fail('E_AST', 'Member keys must be literal strings.', 'bind', span);
                    const keySpan = validSpan(node.keySpan);
                    forbidden(node.key, keySpan);
                    const object = child(node.object);
                    if (isOptional(object.type))
                        fail('E_OPTIONAL_VALUE', 'Handle optional record presence before member access.', 'type', span);
                    if (typeof object.type !== 'object' || object.type.kind !== 'record')
                        fail('E_TYPE', 'Only statically known record members can be selected.', 'type', span);
                    const type = object.type.fields[node.key];
                    if (type === undefined)
                        fail('E_UNKNOWN_FIELD', `Unknown field ${node.key}.`, 'bind', keySpan);
                    return { ...base(guards.get(identity(node) ?? '') === 3 ? present(type) : type), kind: 'member', object, key: node.key };
                }
                case 'unary': {
                    validSpan(node.operatorSpan);
                    if (!['!', '+', '-'].includes(node.operator))
                        fail('E_AST', 'Unsupported unary operator.', 'bind', span);
                    const operand = child(node.operand);
                    requireType(operand.type, node.operator === '!' ? 'boolean' : 'number', node.operatorSpan);
                    return { ...base(operand.type), kind: 'unary', operator: node.operator, operand };
                }
                case 'binary': {
                    validSpan(node.operatorSpan);
                    if (!binaryOperators.has(node.operator))
                        fail('E_AST', 'Unsupported binary operator.', 'bind', span);
                    const left = child(node.left), right = child(node.right, node.operator === '&&' ? trueGuards(node.left, guards) : guards);
                    const op = node.operator;
                    let type = 'boolean';
                    if (['+', '-', '*', '/', '%'].includes(op)) {
                        requireType(left.type, op === '%' ? 'integer' : 'number', node.left.span);
                        requireType(right.type, op === '%' ? 'integer' : 'number', node.right.span);
                        type = op === '/' ? 'float' : joinTypes(left.type, right.type, span);
                    }
                    else if (op === '&&' || op === '||') {
                        requireType(left.type, 'boolean', node.left.span);
                        requireType(right.type, 'boolean', node.right.span);
                    }
                    else {
                        const rhs = op === 'in' ? itemType(right.type, node.right.span) : right.type;
                        if (left.type === 'null' && rhs === 'null' && (op === '==' || op === '!=')) { /* Explicit null equality. */ }
                        else {
                            requireType(left.type, 'scalar', node.left.span);
                            requireType(rhs, 'scalar', node.right.span);
                            joinTypes(left.type, rhs, span);
                            if (['<', '<=', '>', '>='].includes(op) && left.type === 'boolean')
                                fail('E_TYPE', 'Booleans support equality, not ordering.', 'type', span);
                        }
                    }
                    return { ...base(type), kind: 'binary', operator: op, left, right };
                }
                case 'conditional': {
                    const condition = child(node.condition);
                    requireType(condition.type, 'boolean', node.condition.span);
                    const whenTrue = child(node.whenTrue, trueGuards(node.condition, guards)), whenFalse = child(node.whenFalse);
                    return { ...base(joinTypes(whenTrue.type, whenFalse.type, span)), kind: 'conditional', condition, whenTrue, whenFalse };
                }
                case 'list': {
                    if (!Array.isArray(node.items))
                        fail('E_AST', 'A list requires ordered items.', 'bind', span);
                    const items = node.items.map(n => child(n));
                    return { ...base(collection(items.reduce((type, n) => joinTypes(type, n.type, n.span), 'never'))), kind: 'list', items };
                }
                case 'record': {
                    if (!Array.isArray(node.fields))
                        fail('E_AST', 'A record requires ordered fields.', 'bind', span);
                    const fields = [], types = Object.create(null);
                    for (const field of node.fields) {
                        if (typeof field.key !== 'string')
                            fail('E_AST', 'A record field requires a literal key.', 'bind', span);
                        forbidden(field.key, validSpan(field.keySpan));
                        if (Object.hasOwn(types, field.key))
                            fail('E_DUPLICATE_FIELD', `Duplicate field ${field.key}.`, 'bind', field.keySpan);
                        const value = child(field.value);
                        types[field.key] = value.type;
                        fields.push({ key: field.key, value });
                    }
                    return { ...base(recordType(types)), kind: 'record', fields };
                }
                case 'lambda': fail('E_BINDER_POSITION', 'Lambdas are accepted only in designated collection arguments.', 'bind', span);
                case 'call': {
                    validSpan(node.nameSpan);
                    if (!FUNCTION_NAMES.includes(node.name))
                        fail('E_UNKNOWN_FUNCTION', `Unknown function ${node.name}.`, 'bind', node.nameSpan);
                    if (!Array.isArray(node.arguments))
                        fail('E_AST', 'A call requires ordered arguments.', 'bind', span);
                    const name = node.name, args = node.arguments;
                    const allowedArity = ['filter', 'map', 'any', 'all', 'orElse', 'take', 'startsWith', 'endsWith', 'contains', 'glob', 'pathMatches'].includes(name) ? [2]
                        : name === 'sortBy' ? [2, 3] : ['sum', 'min', 'max', 'avg'].includes(name) ? [1, 2] : [1];
                    if (!allowedArity.includes(args.length))
                        fail('E_ARITY', `${name} expects ${allowedArity.join(' or ')} arguments.`, 'bind', span);
                    args.forEach((arg, index) => { if (arg.kind === 'lambda' && !(index === 1 && binders.has(name)))
                        fail('E_BINDER_POSITION', `Argument ${index + 1} of ${name} does not accept a lambda.`, 'bind', arg.span); });
                    const first = child(args[0]), bound = [first];
                    if (binders.has(name) && args.length >= 2) {
                        const item = itemType(first.type, first.span), lambda = args[1];
                        if (lambda.kind !== 'lambda')
                            fail('E_BINDER_POSITION', `${name} requires a lambda in argument 2.`, 'bind', lambda.span);
                        forbidden(lambda.parameter, validSpan(lambda.parameterSpan));
                        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(lambda.parameter))
                            fail('E_AST', 'Invalid lambda parameter.', 'bind', lambda.parameterSpan);
                        if (locals.has(lambda.parameter) || ROOT_NAMES.includes(lambda.parameter) || FUNCTION_NAMES.includes(lambda.parameter) || Object.hasOwn(schema, lambda.parameter))
                            fail('E_SHADOWING', `Lambda parameter ${lambda.parameter} shadows an active name.`, 'bind', lambda.parameterSpan);
                        const nested = new Map(locals);
                        nested.set(lambda.parameter, item);
                        const body = walk(lambda.body, nested, guards, depth + 1);
                        bound.push({ type: body.type, span: lambda.span, kind: 'lambda', parameter: lambda.parameter, body });
                        if (args.length === 3)
                            bound.push(child(args[2]));
                    }
                    else
                        bound.push(...args.slice(1).map(n => child(n)));
                    const a = first.type, b = bound[1]?.type;
                    let type;
                    switch (name) {
                        case 'status':
                        case 'isExact':
                        case 'lowerBound':
                        case 'upperBound':
                        case 'requireExact':
                        case 'abs':
                        case 'floor':
                        case 'ceil':
                            requireType(a, 'number', first.span);
                            type = name === 'status' ? 'string' : name === 'isExact' ? 'boolean' : name === 'floor' || name === 'ceil' ? 'integer' : a;
                            break;
                        case 'isMissing':
                        case 'isNull':
                            type = 'boolean';
                            break;
                        case 'requirePresent':
                            type = present(a);
                            if (type === 'null')
                                type = 'never';
                            break;
                        case 'orElse':
                            type = joinTypes(a === 'null' ? 'never' : present(a), b, span);
                            break;
                        case 'count':
                            itemType(a, first.span);
                            type = 'integer';
                            break;
                        case 'certain':
                            itemType(a, first.span);
                            type = a;
                            break;
                        case 'take':
                            itemType(a, first.span);
                            requireType(b, 'integer', bound[1].span);
                            type = a;
                            break;
                        case 'filter':
                        case 'any':
                        case 'all':
                            itemType(a, first.span);
                            requireType(b, 'boolean', bound[1].span);
                            type = name === 'filter' ? a : 'boolean';
                            break;
                        case 'map':
                            type = collection(b);
                            break;
                        case 'sum':
                        case 'min':
                        case 'max':
                        case 'avg': {
                            const selected = b ?? itemType(a, first.span);
                            requireType(selected, 'number', span);
                            const numeric = selected === 'never' ? 'integer' : selected;
                            type = name === 'sum' ? numeric : optional(name === 'avg' ? 'float' : numeric);
                            break;
                        }
                        case 'sortBy':
                            requireType(b, 'scalar', bound[1].span);
                            if (args[2] && (args[2].kind !== 'literal' || !['asc', 'desc'].includes(String(args[2].value))))
                                fail('E_TYPE', 'Sort direction must be the literal "asc" or "desc".', 'type', args[2].span);
                            type = a;
                            break;
                        case 'length':
                            requireType(a, 'string', first.span);
                            type = 'integer';
                            break;
                        case 'startsWith':
                        case 'endsWith':
                        case 'contains':
                        case 'glob':
                            requireType(a, 'string', first.span);
                            requireType(b, 'string', bound[1].span);
                            type = 'boolean';
                            break;
                        case 'pathMatches':
                            if (typeof a !== 'object' || a.kind !== 'record' || a.fields.path !== 'string')
                                fail('E_TYPE', 'pathMatches requires a file record.', 'type', first.span);
                            requireType(b, 'string', bound[1].span);
                            type = 'boolean';
                            break;
                    }
                    if ((name === 'glob' || name === 'pathMatches') && args[1]?.kind === 'literal' && typeof args[1].value === 'string')
                        compilePathPattern(args[1].value);
                    return { ...base(type), kind: 'call', name, arguments: bound };
                }
                default: fail('E_AST', 'Unsupported syntax node.', 'bind', span);
            }
        };
        const node = walk(copied, new Map(), new Map(), 0);
        if (context === 'condition')
            requireType(node.type, 'boolean', node.span);
        if (context === 'metric' || context === 'band')
            requireType(node.type, 'number', node.span);
        const program = deepFreeze({ kind: 'diffdevil.expression', language: 'diffdevil-expr/1', resultType: node.type, schemaId: schemaId(schema), dependencies: boundReferences(node, schema).metrics });
        programs.set(program, { node: deepFreeze(node), schema: deepFreeze(schema), limits });
        return program;
    });
}
//# sourceMappingURL=compile.js.map