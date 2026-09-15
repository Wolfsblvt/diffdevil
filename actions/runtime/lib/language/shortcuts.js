import { capture, fail, unwrap } from '../errors.js';
import { inertCopy } from '../inert.js';
import { ast } from './ast.js';
import { compileAst } from './compile.js';
/** These spellings are verified against src/diffdevil/contracts/detail/v1/shortcuts.json. */
export const METRIC_ALIASES = Object.freeze({
    changed: 'lines.changed', 'added-only': 'lines.added', 'deleted-only': 'lines.deleted', modified: 'lines.modified',
    'raw-added': 'raw.added', 'raw-deleted': 'raw.deleted', 'raw-churn': 'raw.churn', destructive: 'lines.deleted + lines.modified',
    files: 'files.included', 'files-added': 'files.added', 'files-deleted': 'files.deleted', 'files-modified': 'files.modified', 'files-renamed': 'files.renamed',
    'files-copied': 'files.copied', 'files-binary': 'files.binary', 'files-unmeasurable': 'files.unmeasurable',
});
export const MEASURES = Object.freeze(['raw.added', 'raw.deleted', 'raw.churn', 'lines.added', 'lines.deleted', 'lines.modified', 'lines.changed', 'files.total', 'files.included', 'files.excluded', 'files.added', 'files.deleted', 'files.modified', 'files.renamed', 'files.copied', 'files.binary', 'files.unmeasurable']);
export const COMPARATORS = Object.freeze({ gt: '>', gte: '>=', lt: '<', lte: '<=', eq: '==', ne: '!=' });
export const PROJECTIONS = Object.freeze({ path: 'path', 'old-path': 'oldPath', 'change-type': 'changeType', changed: 'lines.changed', modified: 'lines.modified', 'added-only': 'lines.added', 'deleted-only': 'lines.deleted', 'raw-added': 'raw.added', 'raw-deleted': 'raw.deleted', 'raw-churn': 'raw.churn' });
/** Literal numeric transport, not expression parsing. */
export function parseNumericInput(text) {
    if (!/^[+-]?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?$/.test(text))
        fail('E_NUMERIC_LITERAL', 'Expected one decimal numeric literal.', 'config');
    const value = Number(text), numericType = /[.eE]/.test(text) ? 'float' : 'integer';
    if (!Number.isFinite(value) || numericType === 'integer' && !Number.isSafeInteger(value))
        fail('E_NUMERIC_LITERAL', 'Numeric input exceeds its finite or safe-integer domain.', 'config');
    return { value, numericType };
}
function access(root, path) { return path.split('.').reduce((value, key) => ast.member(value, key), root); }
function measured(root, metric) {
    if (metric === 'lines.deleted + lines.modified')
        return ast.binary('+', access(root, 'lines.deleted'), access(root, 'lines.modified'));
    return access(root, metric);
}
const call = (name, ...args) => ast.call(name, args);
const lambda = (body) => ast.lambda('f', body);
/** Lower structured selectors into ordinary syntax nodes; data is never interpolated. */
export function shortcutAst(input) {
    const s = inertCopy(input, { code: 'E_CONFIG' });
    for (const key of Object.keys(s))
        if (!['kind', 'metric', 'files', 'scope', 'paths', 'allFiles', 'certain', 'select', 'comparison', 'status'].includes(key))
            fail('E_CONFIG', `Unknown shortcut field ${key}.`, 'config');
    if (s.kind !== 'query' && s.kind !== 'check')
        fail('E_CONFIG', 'Shortcut kind must be query or check.', 'config');
    if (s.metric !== undefined && typeof s.metric !== 'string' || s.scope !== undefined && (typeof s.scope !== 'string' || !s.scope))
        fail('E_CONFIG', 'Metric and scope names must be nonempty strings.', 'config');
    for (const key of ['allFiles', 'certain'])
        if (s[key] !== undefined && typeof s[key] !== 'boolean')
            fail('E_CONFIG', `${key} must be boolean.`, 'config');
    if (s.paths !== undefined && (!Array.isArray(s.paths) || s.paths.some(x => typeof x !== 'string')))
        fail('E_CONFIG', 'Paths must be literal pattern strings.', 'config');
    if (s.select !== undefined && (!Array.isArray(s.select) || !s.select.length || s.select.some(x => typeof x !== 'string') || new Set(s.select).size !== s.select.length))
        fail('E_CONFIG', 'Select requires distinct projection names.', 'config');
    const fileMode = s.files !== undefined;
    if (fileMode && (s.kind === 'query' ? s.files !== true : !['any', 'all'].includes(String(s.files))))
        fail('E_CONFIG', 'query --files is a flag; check --files requires any or all.', 'config');
    if (s.scope && s.allFiles || s.certain && s.kind === 'check' || s.select && !fileMode || s.certain && !fileMode)
        fail('E_CONFIG_CONFLICT', 'The selected scope, projection or evidence options conflict.', 'config');
    if (s.status && s.comparison)
        fail('E_CONFIG_CONFLICT', 'Select an evidence status or a numeric comparator, not both.', 'config');
    if (s.status && !['exact', 'bounded', 'unknown', 'unmeasurable'].includes(s.status))
        fail('E_CONFIG', 'Unsupported measurement status.', 'config');
    if (s.comparison && (typeof s.comparison !== 'object' || !Object.hasOwn(COMPARATORS, s.comparison.operator) || typeof s.comparison.value !== 'number' || !Number.isFinite(s.comparison.value)))
        fail('E_CONFIG', 'Invalid numeric comparison.', 'config');
    const predicateRequested = s.comparison !== undefined || s.status !== undefined;
    if (s.kind === 'check' && !predicateRequested)
        fail('E_CONFIG', 'A shortcut check requires a comparator or status predicate.', 'config');
    if (s.kind === 'query' && predicateRequested && !fileMode)
        fail('E_CONFIG_CONFLICT', 'Use check for a scalar condition; query predicates require --files.', 'config');
    const metricInput = s.metric ?? 'changed';
    const named = metricInput.startsWith('metrics.');
    if (named && (fileMode || s.scope || s.paths?.length || s.allFiles))
        fail('E_CONFIG_CONFLICT', 'A named metric keeps its declared scope and cannot be rebound by a shortcut.', 'config');
    const metric = METRIC_ALIASES[metricInput] ?? metricInput;
    if (!named && metric !== 'lines.deleted + lines.modified' && !MEASURES.includes(metric))
        fail('E_UNKNOWN_MEASURE', `Unknown metric ${metricInput}.`, 'bind');
    if (fileMode && predicateRequested && metric.startsWith('files.'))
        fail('E_CONFIG_CONFLICT', 'A file count cannot be a per-file metric predicate.', 'config');
    if ((s.scope || s.paths?.length || s.allFiles) && ['files.total', 'files.excluded'].includes(metric))
        fail('E_CONFIG_CONFLICT', 'Global acquisition counts cannot be rebound to a file selection.', 'config');
    const f = ast.name('f');
    let files = s.scope ? ast.path(['scopes', s.scope, 'files']) : ast.name('files');
    let filter = s.scope || !s.allFiles ? ast.member(f, 'included') : undefined;
    if (s.paths?.length) {
        const paths = s.paths.map(pattern => call('pathMatches', f, ast.literal(pattern)));
        const match = paths.slice(1).reduce((a, b) => ast.binary('||', a, b), paths[0]);
        filter = filter ? ast.binary('&&', filter, match) : match;
    }
    const condition = (value) => s.status ? ast.binary('==', call('status', value), ast.literal(s.status)) : ast.binary(COMPARATORS[s.comparison.operator], value, ast.literal(s.comparison.value, undefined, s.comparison.numericType));
    if (fileMode && s.kind === 'query') {
        if (predicateRequested) {
            const predicate = condition(measured(f, metric));
            filter = filter ? ast.binary('&&', filter, predicate) : predicate;
        }
        if (filter)
            files = call('filter', files, lambda(filter));
        if (s.certain)
            files = call('certain', files);
        const names = s.select ?? ['path'];
        for (const name of names)
            if (!Object.hasOwn(PROJECTIONS, name))
                fail('E_CONFIG', `Unknown projection ${name}.`, 'config');
        const project = names.length === 1 ? access(f, PROJECTIONS[names[0]]) : ast.record(Object.fromEntries(names.map(name => {
            const field = PROJECTIONS[name], key = field.startsWith('lines.') ? field.slice(6) : field.startsWith('raw.') ? `raw${field.slice(4, 5).toUpperCase()}${field.slice(5)}` : field;
            return [key, access(f, field)];
        })));
        return call('map', files, lambda(project));
    }
    if (filter)
        files = call('filter', files, lambda(filter));
    if (fileMode)
        return call(s.files, files, lambda(condition(measured(f, metric))));
    let result;
    if (named)
        result = ast.path(['metrics', metricInput.slice(8)]);
    else if (!s.paths?.length && !s.allFiles)
        result = measured(s.scope ? ast.path(['scopes', s.scope, 'totals']) : ast.name('totals'), metric);
    else if (!metric.startsWith('files.'))
        result = call('sum', files, lambda(measured(f, metric)));
    else {
        const category = metric.slice(6);
        if (category !== 'included') {
            const member = category === 'binary' ? ast.member(f, 'kind') : category === 'unmeasurable' ? access(f, 'measurement.status') : ast.member(f, 'changeType');
            files = call('filter', files, lambda(ast.binary('==', member, ast.literal(category))));
        }
        result = call('count', files);
    }
    return s.kind === 'check' ? condition(result) : result;
}
/** A learning projection only; this printed source is never the execution path. */
export function printAst(node) {
    switch (node.kind) {
        case 'literal': return node.literalType === 'float' && typeof node.value === 'number' && Number.isInteger(node.value) ? `${node.value}.0` : JSON.stringify(node.value);
        case 'identifier': return node.name;
        case 'member': return `${printAst(node.object)}${/^[A-Za-z_][A-Za-z0-9_]*$/.test(node.key) ? '.' + node.key : '[' + JSON.stringify(node.key) + ']'}`;
        case 'unary': return `${node.operator}(${printAst(node.operand)})`;
        case 'binary': return `(${printAst(node.left)} ${node.operator} ${printAst(node.right)})`;
        case 'conditional': return `(${printAst(node.condition)} ? ${printAst(node.whenTrue)} : ${printAst(node.whenFalse)})`;
        case 'call': return `${node.name}(${node.arguments.map(printAst).join(', ')})`;
        case 'lambda': return `${node.parameter} => ${printAst(node.body)}`;
        case 'list': return `[${node.items.map(printAst).join(', ')}]`;
        case 'record': return `{ ${node.fields.map(f => `${JSON.stringify(f.key)}: ${printAst(f.value)}`).join(', ')} }`;
    }
}
export function expandShortcut(input) { return capture(() => ({ expression: printAst(shortcutAst(input)) })); }
export function compileShortcut(input, options) {
    return capture(() => unwrap(compileAst(shortcutAst(input), { ...options, context: input.kind === 'check' ? 'condition' : 'query' })));
}
//# sourceMappingURL=shortcuts.js.map