// SPDX-License-Identifier: MIT
import { capture, fail, unwrap } from '../errors.js';
import { contentId, deepFreeze } from '../inert.js';
import { compilePolicy, type CompiledPolicy } from '../policy/compile.js';
import { normalizePolicy } from '../policy/normalize.js';
import { readPolicyYaml } from '../policy/yaml.js';
import { readPolicyDocument } from '../policy/validation.js';
import type { PolicyDocument, PolicyOrigin } from '../policy/types.js';
import type { Result } from '../model.js';
export type PolicyMode = 'composed' | 'repository' | 'personal-only';
export interface PolicyLayers { readonly mode: PolicyMode; readonly personal: string; readonly repository?: string; readonly override?: string; readonly templateFiles?: Readonly<Record<string, string>> }
export interface BrowserPolicy { readonly program: CompiledPolicy; readonly document: PolicyDocument; readonly origins: readonly PolicyOrigin[]; readonly mode: PolicyMode; readonly digest: string; readonly layers: readonly string[] }
export function readPolicyText(text: string, name = 'personal.yml'): Result<PolicyDocument> {
  return capture(() => readPolicyDocument(unwrap(readPolicyYaml(text, { name })).document));
}
const parts = (path: string): string[] => path.slice(1).split('/').map(key => key.replaceAll('~1', '/').replaceAll('~0', '~'));
function lookup(value: unknown, path: string): unknown { return parts(path).reduce<unknown>((parent, key) => parent && typeof parent === 'object' ? (parent as Record<string, unknown>)[key] : undefined, value); }
function assign(root: Record<string, unknown>, path: string, value: unknown): void {
  const keys = parts(path); const leaf = keys.pop()!; let parent = root;
  for (const key of keys) { if (!parent[key] || typeof parent[key] !== 'object') parent[key] = Object.create(null) as object; parent = parent[key] as Record<string, unknown>; }
  if (value === undefined) delete parent[leaf]; else parent[leaf] = value;
}
/** Compose normalized declarations; never let implicit upper presets reset personal policy. */
export function compileBrowserPolicy(json: string): Result<BrowserPolicy> {
  return capture(() => {
    if (typeof json !== 'string' || new TextEncoder().encode(json).byteLength > 3 * 1024 * 1024) fail('E_BROWSER_POLICY_LIMIT', 'Policy input exceeds 3 MiB.', 'config');
    const input = JSON.parse(json) as PolicyLayers;
    if (!input || !['composed', 'repository', 'personal-only'].includes(input.mode)) fail('E_CONFIG', 'Unknown browser policy mode.', 'config');
    const selected: { name: string; text: string }[] = [];
    const repository = input.mode !== 'personal-only' && input.repository !== undefined;
    if (input.mode !== 'repository' || !repository) selected.push({ name: 'personal', text: input.personal });
    if (repository) selected.push({ name: 'repository', text: input.repository! });
    if (input.mode !== 'repository' && input.override !== undefined) selected.push({ name: 'repository-personal-override', text: input.override });
    const document: Record<string, unknown> = { version: 1, presets: [] }; const origins = new Map<string, PolicyOrigin>(); let program: CompiledPolicy | undefined;
    for (const [index, layer] of selected.entries()) {
      const authored = unwrap(readPolicyText(layer.text, layer.name)); const normalized = unwrap(normalizePolicy(authored));
      const lastOrigins = new Map(normalized.origins.map(origin => [origin.path, origin]));
      if (authored.presets !== undefined) for (const [path, origin] of origins) if (origin.layer.includes(':preset:')) { assign(document, path, undefined); origins.delete(path); }
      for (const [path, origin] of lastOrigins) {
        const preset = origin.layer.startsWith('preset:');
        if (preset && index > 0 && authored.presets === undefined) continue;
        const previous = origins.get(path)?.layer; assign(document, path, lookup(normalized.document, path));
        origins.set(path, { path, layer: preset ? `${layer.name}:${origin.layer}` : layer.name, ...(previous === undefined ? {} : { replaces: previous }) });
      }
      program = unwrap(compilePolicy(document, { ...(input.templateFiles ? { templateFiles: input.templateFiles } : {}) }));
    }
    if (!program) program = unwrap(compilePolicy(document));
    const effectiveOrigins = [...origins.values()];
    return deepFreeze({ program, document: readPolicyDocument(document), origins: effectiveOrigins, mode: input.mode,
      digest: contentId('browser-policy', [program.id, input.mode, effectiveOrigins]), layers: selected.map(layer => layer.name) });
  });
}
/** Host-provided, trusted-base files only. This discovery function does no I/O. */
export function requiredTemplates(json: string): Result<readonly string[]> {
  return capture(() => {
    const input = JSON.parse(json) as PolicyLayers; const result = new Set<string>();
    const texts = input.mode === 'repository' && input.repository !== undefined ? [input.repository] : [input.personal, ...(input.mode === 'personal-only' ? [] : [input.repository]), ...(input.mode === 'repository' ? [] : [input.override])];
    for (const text of texts) if (text !== undefined) {
      const document = unwrap(readPolicyText(text));
      for (const rule of Object.values(document.rules ?? {})) { const path = rule.effects?.comment?.templateFile; if (path) result.add(path); }
    }
    return [...result];
  });
}
