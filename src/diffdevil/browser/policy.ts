// SPDX-License-Identifier: MIT
import { capture, fail, unwrap } from '../errors.js';
import { deepFreeze, inertCopy, record } from '../inert.js';
import type { Result } from '../model.js';
import { compilePolicy, explainPolicy, type CompiledPolicy } from '../policy/compile.js';
import { readPolicyYaml } from '../policy/yaml.js';
import { readPolicyDocument } from '../policy/validation.js';
import type { PolicyDocument, PolicyOrigin } from '../policy/types.js';

export type BrowserPolicyMode = 'repository' | 'composed' | 'personal-only';
export interface BrowserPolicyLayer { readonly name: string; readonly yaml: string }
export interface BrowserPolicyInput {
  readonly mode: BrowserPolicyMode;
  readonly personal: BrowserPolicyLayer;
  readonly repository?: BrowserPolicyLayer;
  readonly override?: BrowserPolicyLayer;
  /** Trusted base-revision templates supplied by the host; the compiler never fetches. */
  readonly templateFiles?: Readonly<Record<string, string>>;
}
export interface BrowserPolicy {
  readonly compiled: CompiledPolicy;
  readonly document: PolicyDocument;
  readonly effective: PolicyDocument;
  readonly origins: readonly PolicyOrigin[];
  readonly layers: readonly string[];
  readonly mode: BrowserPolicyMode;
}
const DECLARATIONS = new Set(['scopes', 'parameters', 'metrics', 'bands', 'queries', 'labelGroups', 'labelDefinitions', 'rules']);
const escapePointer = (key: string): string => key.replaceAll('~', '~0').replaceAll('/', '~1');

function selectedLayers(input: BrowserPolicyInput): readonly BrowserPolicyLayer[] {
  switch (input.mode) {
    case 'repository': return input.repository ? [input.repository] : [input.personal];
    case 'composed': return [input.personal, ...(input.repository ? [input.repository] : []), ...(input.override ? [input.override] : [])];
    case 'personal-only': return [input.personal, ...(input.override ? [input.override] : [])];
    default: return fail('E_CONFIG', 'Unknown browser policy mode.', 'config');
  }
}

/** Locate only explicit template-file declarations; paths remain inert strings. */
export function browserTemplatePaths(input: BrowserPolicyInput): Result<readonly string[]> {
  return capture(() => {
    const paths = new Set<string>();
    for (const layer of selectedLayers(input)) {
      const source = unwrap(readPolicyYaml(layer.yaml, { name: layer.name }));
      const document = readPolicyDocument(source.document);
      for (const rule of Object.values(document.rules ?? {})) {
        const path = rule.effects?.comment?.templateFile;
        if (path !== undefined) paths.add(path);
      }
    }
    return [...paths];
  });
}

/**
 * Layers retain the real policy dialect. Named declarations and arrays replace;
 * convenience/path objects merge by explicit member. Each composed prefix is
 * checked before the next layer, so an override cannot hide broken repository policy
 * while repository expressions can refer to personal declarations beneath them. The final shared compiler remains the only policy authority.
 */
export function compileBrowserPolicy(input: BrowserPolicyInput): Result<BrowserPolicy> {
  return capture(() => {
    const origins = new Map<string, PolicyOrigin>();
    let merged: Record<string, unknown> = { version: 1 };
    const layers = selectedLayers(input);
    const mark = (value: unknown, path: string, layer: string): void => {
      if (value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length) {
        for (const [key, child] of Object.entries(value)) mark(child, `${path}/${escapePointer(key)}`, layer);
      } else {
        const previous = origins.get(path)?.layer;
        origins.set(path, { path, layer, ...(previous === undefined ? {} : { replaces: previous }) });
      }
    };
    const replace = (value: unknown, path: string, layer: string): unknown => {
      const previous = [...origins.values()].find(origin => origin.path === path || origin.path.startsWith(`${path}/`))?.layer;
      for (const key of [...origins.keys()]) if (key === path || key.startsWith(`${path}/`)) origins.delete(key);
      mark(value, path, layer);
      if (previous !== undefined) for (const [key, origin] of origins) if (key === path || key.startsWith(`${path}/`)) origins.set(key, { ...origin, replaces: previous });
      return value;
    };
    const merge = (lower: Record<string, unknown>, upper: Record<string, unknown>, path: string, layer: string): Record<string, unknown> => {
      const result: Record<string, unknown> = { ...lower };
      for (const [key, value] of Object.entries(upper)) {
        const at = `${path}/${escapePointer(key)}`;
        const declaration = path.split('/').length === 2 && DECLARATIONS.has(path.slice(1));
        if (!declaration && value && typeof value === 'object' && !Array.isArray(value)) {
          const before = result[key];
          result[key] = merge(before && typeof before === 'object' && !Array.isArray(before) ? before as Record<string, unknown> : {}, value as Record<string, unknown>, at, layer);
        } else result[key] = replace(value, at, layer);
      }
      return result;
    };
    for (const layer of layers) {
      const source = unwrap(readPolicyYaml(layer.yaml, { name: layer.name }));
      const document = readPolicyDocument(source.document);
      // Validate even a lower declaration that a later override would replace.
      merged = merge(merged, record(inertCopy(document), 'Policy layer'), '', layer.name);
      unwrap(compilePolicy(merged, { ...(input.templateFiles ? { templateFiles: input.templateFiles } : {}) }));
    }
    const compiled = unwrap(compilePolicy(merged, { ...(input.templateFiles ? { templateFiles: input.templateFiles } : {}) }));
    const explanation = explainPolicy(compiled);
    return deepFreeze({ compiled, document: readPolicyDocument(merged), effective: explanation.document,
      origins: [...explanation.origins.filter(origin => origin.layer.startsWith('preset:')), ...origins.values()],
      layers: layers.map(layer => layer.name), mode: input.mode });
  });
}
