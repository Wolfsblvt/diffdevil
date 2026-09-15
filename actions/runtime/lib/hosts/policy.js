import { dirname, resolve } from 'node:path';
import { fail, unwrap } from '../errors.js';
import { DEFAULT_LIMITS, enforceBytes } from '../limits.js';
import { compilePolicy } from '../policy/compile.js';
import { normalizePolicy } from '../policy/normalize.js';
import { locatePolicyDiagnostic, readPolicyJson } from '../policy/source.js';
import { readPolicyYaml } from '../policy/yaml.js';
import { readUtf8, readWorkspaceUtf8 } from './io.js';
/** The host acquires template text; policy evaluation never receives a filesystem callback. */
export async function compilePolicyText(text, name, options = {}, readTemplate) {
    const reader = /\.json$/iu.test(name) ? readPolicyJson : readPolicyYaml;
    const parsed = unwrap(reader(text, { name, ...(options.limits ? { limits: options.limits } : {}) }));
    const normalization = normalizePolicy(parsed.document, options);
    const normalized = unwrap(normalization.ok ? normalization : {
        ok: false, diagnostics: normalization.diagnostics.map(d => locatePolicyDiagnostic(parsed, d)),
    });
    const templates = Object.create(null);
    let acquired = text;
    for (const rule of Object.values(normalized.document.rules ?? {})) {
        const path = rule.effects?.comment?.templateFile;
        if (path === undefined || Object.hasOwn(templates, path))
            continue;
        if (!readTemplate)
            fail('E_POLICY_SOURCE', 'This host has no trusted source for template files.', 'config');
        const contents = await readTemplate(path);
        acquired += contents;
        enforceBytes(acquired, options.limits?.configBytes ?? DEFAULT_LIMITS.configBytes, 'Policy and templates', 'config');
        templates[path] = contents;
    }
    return unwrap(compilePolicy(parsed, { ...options, templateFiles: templates }));
}
/** Explicit local policy selection; discovery and trust posture belong to the calling host. */
export async function loadLocalPolicy(file, cwd, options = {}, workspaceRoot) {
    if (!file)
        return unwrap(compilePolicy({ version: 1 }, options));
    const path = resolve(cwd, file), maximum = options.limits?.configBytes ?? DEFAULT_LIMITS.configBytes;
    const read = (source) => workspaceRoot === undefined
        ? readUtf8(source, { maximum, preserveBom: true })
        : readWorkspaceUtf8(source, workspaceRoot, { maximum, preserveBom: true });
    return compilePolicyText(await read(path), path, options, name => read(resolve(dirname(path), name)));
}
//# sourceMappingURL=policy.js.map