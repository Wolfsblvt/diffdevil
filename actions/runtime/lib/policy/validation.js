import { assertSchema } from '../schema.js';
import { DiffdevilError, unwrap } from '../errors.js';
import { inertCopy, FORBIDDEN_KEYS } from '../inert.js';
import { DEFAULT_LIMITS, enforceBytes } from '../limits.js';
import { compilePathPolicy } from '../paths.js';
import { MEASURES } from '../language/shortcuts.js';
import { compileBands } from './bands.js';
import { commentLifecycle } from './templates.js';
export function configError(message, path, code = 'E_CONFIG') {
    throw new DiffdevilError({ code, phase: 'config', severity: 'error', message, configPath: path || '/' });
}
export const pointer = (path, key) => `${path}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`;
export function policyRecord(value, path, allowed, required = []) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        configError('Expected a record.', path);
    const record = value;
    for (const name of Object.keys(record)) {
        if (FORBIDDEN_KEYS.has(name))
            configError(`Forbidden key ${name}.`, path, 'E_FORBIDDEN_NAME');
        if (allowed && !allowed.includes(name))
            configError(`Unknown property ${name}.`, pointer(path, name));
    }
    for (const name of required)
        if (!Object.hasOwn(record, name))
            configError(`Missing required property ${name}.`, pointer(path, name));
    return record;
}
export function policyString(value, path, allowEmpty = false) {
    if (typeof value !== 'string' || !allowEmpty && value.length === 0)
        configError('Expected a nonempty string.', path);
    return value;
}
export function policyStrings(value, path, nonempty = false) {
    if (!Array.isArray(value) || nonempty && !value.length)
        configError('Expected an array of strings.', path);
    const strings = value.map((v, i) => policyString(v, pointer(path, String(i))));
    if (new Set(strings).size !== strings.length)
        configError('Duplicate entries are not allowed.', path);
    return strings;
}
export function finiteNumber(value, path) {
    if (typeof value !== 'number' || !Number.isFinite(value))
        configError('Expected a finite number.', path);
    return value;
}
export function parameterValue(type, value, path) {
    if (type === 'integer') {
        if (typeof value !== 'number' || !Number.isSafeInteger(value))
            configError('Expected a safe integer.', path, 'E_PARAMETER_TYPE');
    }
    else if (type === 'float')
        finiteNumber(value, path);
    else if (type === 'boolean') {
        if (typeof value !== 'boolean')
            configError('Expected a boolean.', path, 'E_PARAMETER_TYPE');
    }
    else if (type === 'string')
        policyString(value, path, true);
    else
        configError('Unsupported parameter type.', path);
    return value;
}
export function readPathPolicy(value, path) {
    const policy = policyRecord(value, path, ['includeOnly', 'exclude', 'forceInclude']);
    for (const key of Object.keys(policy))
        policyStrings(policy[key], pointer(path, key));
    compilePathPolicy(policy);
    return policy;
}
export function readLabelDefinition(value, path) {
    const definition = policyRecord(value, path, ['color', 'description'], ['color', 'description']);
    if (!/^[0-9A-Fa-f]{6}$/.test(policyString(definition.color, pointer(path, 'color'))))
        configError('Color must be six hexadecimal digits without #.', path);
    if ([...policyString(definition.description, pointer(path, 'description'), true)].length > 100)
        configError('Label description exceeds 100 Unicode characters.', path);
    return { color: definition.color, description: definition.description };
}
function readComment(value, path, rule) {
    const comment = policyRecord(value, path, ['mode', 'trigger', 'template', 'templateFile'], ['mode']);
    if (Object.hasOwn(comment, 'template') === Object.hasOwn(comment, 'templateFile'))
        configError('Supply exactly one template or templateFile.', path);
    policyString(comment.template ?? comment.templateFile, path, Object.hasOwn(comment, 'template'));
    policyString(comment.mode, pointer(path, 'mode'));
    if (comment.trigger !== undefined)
        policyString(comment.trigger, pointer(path, 'trigger'));
    commentLifecycle(comment.mode, comment.trigger, rule);
}
/** Structural checks mirror policy-v1; semantic cross-references are compiled separately. */
export function readPolicyDocument(input) {
    const value = inertCopy(input, { code: 'E_CONFIG' });
    enforceBytes(JSON.stringify(value), DEFAULT_LIMITS.configBytes, 'Policy', 'config');
    const policy = policyRecord(value, '', ['version', 'language', 'presets', 'size', 'measurement', 'defaults', 'scopes', 'parameters', 'metrics', 'bands', 'queries', 'labelGroups', 'labelDefinitions', 'rules'], ['version']);
    if (policy.version !== 1 || policy.language !== undefined && policy.language !== 'diffdevil-expr/1')
        configError('Unsupported policy or language version.', '', 'E_VERSION');
    if (policy.presets !== undefined && policyStrings(policy.presets, '/presets').some(p => p !== 'size@1'))
        configError('Only bundled preset size@1 is supported.', '/presets');
    if (policy.measurement !== undefined) {
        const measurement = policyRecord(policy.measurement, '/measurement', ['replacementLines'], ['replacementLines']);
        if (measurement.replacementLines !== 'replacement-lines-v1')
            configError('Unsupported measurement profile.', '/measurement', 'E_VERSION');
    }
    if (policy.defaults !== undefined) {
        const defaults = policyRecord(policy.defaults, '/defaults', ['paths']);
        if (defaults.paths !== undefined)
            readPathPolicy(defaults.paths, '/defaults/paths');
    }
    if (policy.size !== undefined) {
        const size = policyRecord(policy.size, '/size', ['metric', 'thresholds', 'labels']);
        if (size.metric !== undefined)
            policyString(size.metric, '/size/metric');
        if (size.thresholds !== undefined) {
            const keys = ['xs', 's', 'm', 'l'];
            const cuts = policyRecord(size.thresholds, '/size/thresholds', keys, keys);
            for (const key of keys)
                finiteNumber(cuts[key], `/size/thresholds/${key}`);
        }
        if (size.labels !== undefined) {
            const keys = ['xs', 's', 'm', 'l', 'xl', 'unknown'];
            const labels = policyRecord(size.labels, '/size/labels', keys, keys);
            for (const key of keys)
                policyString(labels[key], `/size/labels/${key}`);
            if (new Set(Object.values(labels)).size !== keys.length)
                configError('Size labels must be distinct.', '/size/labels');
        }
    }
    for (const section of ['scopes', 'parameters', 'metrics', 'bands', 'queries', 'labelGroups', 'labelDefinitions', 'rules']) {
        if (policy[section] === undefined)
            continue;
        const entries = policyRecord(policy[section], `/${section}`);
        for (const [name, input] of Object.entries(entries)) {
            policyString(name, `/${section}`);
            const path = pointer(`/${section}`, name);
            switch (section) {
                case 'scopes':
                    readPathPolicy(input, path);
                    break;
                case 'parameters': {
                    const p = policyRecord(input, path, ['type', 'default', 'required'], ['type']);
                    if (!['integer', 'float', 'boolean', 'string'].includes(String(p.type)))
                        configError('Unsupported parameter type.', path);
                    if (Object.hasOwn(p, 'default') === Object.hasOwn(p, 'required') || p.required !== undefined && p.required !== true)
                        configError('A parameter needs exactly a default or required: true.', path);
                    if (Object.hasOwn(p, 'default'))
                        parameterValue(p.type, p.default, pointer(path, 'default'));
                    break;
                }
                case 'metrics': {
                    const metric = policyRecord(input, path, ['measure', 'scope', 'formula']);
                    if (Object.hasOwn(metric, 'measure') === Object.hasOwn(metric, 'formula'))
                        configError('A metric needs exactly a canonical measure or a formula.', path);
                    if (metric.formula !== undefined) {
                        policyString(metric.formula, pointer(path, 'formula'));
                        if (metric.scope !== undefined)
                            configError('scope is valid only with a measure.', path);
                    }
                    else {
                        if (!MEASURES.includes(metric.measure))
                            configError('Unknown canonical measure.', pointer(path, 'measure'));
                        if (metric.scope !== undefined)
                            policyString(metric.scope, pointer(path, 'scope'));
                    }
                    break;
                }
                case 'bands': {
                    const band = policyRecord(input, path, ['value', 'minimum', 'ranges'], ['value', 'ranges']);
                    policyString(band.value, pointer(path, 'value'));
                    const { value: expression, ...definition } = band;
                    unwrap(compileBands(definition));
                    break;
                }
                case 'queries': {
                    const query = policyRecord(input, path, ['expression'], ['expression']);
                    policyString(query.expression, pointer(path, 'expression'));
                    break;
                }
                case 'labelGroups':
                    policyStrings(input, path, true);
                    break;
                case 'labelDefinitions':
                    readLabelDefinition(input, path);
                    break;
                case 'rules': {
                    const rule = policyRecord(input, path, ['when', 'band', 'onUnknown', 'effects']);
                    if (Object.hasOwn(rule, 'when') === Object.hasOwn(rule, 'band'))
                        configError('A rule needs exactly when or band.', path);
                    const boolean = rule.when !== undefined;
                    policyString(boolean ? rule.when : rule.band, path);
                    if (rule.onUnknown !== undefined && !['hold', 'fail'].includes(String(rule.onUnknown)))
                        configError('onUnknown must be hold or fail.', path);
                    if (rule.effects === undefined)
                        break;
                    const effects = policyRecord(rule.effects, pointer(path, 'effects'), ['labels', 'comment']);
                    if (effects.labels !== undefined) {
                        const where = pointer(pointer(path, 'effects'), 'labels');
                        if (boolean) {
                            const labels = policyRecord(effects.labels, where, ['add', 'removeWhenFalse'], ['add']);
                            policyStrings(labels.add, where, true);
                            if (labels.removeWhenFalse !== undefined && typeof labels.removeWhenFalse !== 'boolean')
                                configError('removeWhenFalse must be boolean.', where);
                        }
                        else {
                            const labels = policyRecord(effects.labels, where, ['group', 'byBand', 'unknown'], ['group', 'byBand']);
                            policyString(labels.group, pointer(where, 'group'));
                            for (const [id, label] of Object.entries(policyRecord(labels.byBand, pointer(where, 'byBand')))) {
                                policyString(id, where);
                                policyString(label, pointer(where, id));
                            }
                            if (labels.unknown !== undefined)
                                policyString(labels.unknown, pointer(where, 'unknown'));
                        }
                    }
                    if (effects.comment !== undefined)
                        readComment(effects.comment, pointer(pointer(path, 'effects'), 'comment'), boolean ? 'boolean' : 'band');
                    break;
                }
            }
        }
    }
    assertSchema('policy', policy);
    return policy;
}
//# sourceMappingURL=validation.js.map