import { createRequire } from 'node:module';
import { capture, DiffdevilError } from './errors.js';
import { deepFreeze, inertCopy } from './inert.js';
const validators = createRequire(import.meta.url)('./validation/schemas.cjs');
/** Internal assertion on already-inert data; semantic checks remain with the owning model. */
export function assertSchema(kind, value) {
    const validator = validators[kind];
    if (validator(value))
        return;
    const error = validator.errors?.[0];
    const phase = kind === 'policy' ? 'config' : kind === 'plan' ? 'plan' : 'source';
    const code = kind === 'policy' ? 'E_CONFIG' : kind === 'plan' ? 'E_PLAN_INVALID' : 'E_REPORT_INVALID';
    const extra = error?.params.additionalProperty ?? error?.params.missingProperty;
    const configPath = (error?.instancePath ?? '') + (typeof extra === 'string' ? '/' + extra.replaceAll('~', '~0').replaceAll('/', '~1') : '');
    throw new DiffdevilError({ code, phase, severity: 'error', message: `${kind} schema validation failed: ${error?.message ?? 'invalid document'}.`,
        configPath: configPath || '/', ...(error ? { details: { keyword: error.keyword, schemaPath: error.schemaPath, ...error.params } } : {}) });
}
/** Validate and freeze inert shape data. This does not establish semantic validity or authorization. */
export function validateSchema(kind, input) {
    return capture(() => {
        if (!Object.hasOwn(validators, kind))
            throw new DiffdevilError({ code: 'E_CONFIG', phase: 'config', severity: 'error', message: 'Unknown product schema.' });
        const copy = inertCopy(input);
        assertSchema(kind, copy);
        return deepFreeze(copy);
    });
}
//# sourceMappingURL=schema.js.map