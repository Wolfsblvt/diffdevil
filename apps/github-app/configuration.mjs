// SPDX-License-Identifier: AGPL-3.0-only

import { compilePolicy, explainPolicy, unwrap } from '@wolfsblvt/diffdevil';

const dictionaries = ['scopes', 'parameters', 'metrics', 'bands', 'queries', 'labelGroups', 'labelDefinitions', 'rules'];
const configurationKeys = new Set(['presets', ...dictionaries, 'defaults']);

export const DEFAULT_SIZE_POLICY = Object.freeze({ version: 1, presets: ['size@1'] });

function record(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${name} must be an object.`);
  return value;
}

/** Apply the selected precedence once and retain which source supplied every effective policy section. */
export function resolveEffectivePolicy({ preset = {}, account = {}, repository = {}, supplied = {} } = {}) {
  const effective = { version: 1, presets: [] }, provenance = {};
  for (const [name, layer] of Object.entries({ preset, account, repository, supplied })) {
    const input = record(layer, `${name} configuration`);
    if (input.presets !== undefined) {
      if (!Array.isArray(input.presets) || input.presets.some(value => typeof value !== 'string')) throw new TypeError(`${name}.presets must be an array of preset identifiers.`);
      effective.presets = [...input.presets];
      provenance['/presets'] = name;
    }
    for (const section of dictionaries) {
      if (input[section] === undefined) continue;
      const declarations = record(input[section], `${name}.${section}`);
      effective[section] = { ...(effective[section] ?? {}), ...declarations };
      for (const key of Object.keys(declarations)) provenance[`/${section}/${key}`] = name;
    }
    if (input.defaults !== undefined) {
      const defaults = record(input.defaults, `${name}.defaults`);
      effective.defaults = { ...(effective.defaults ?? {}), ...defaults, paths: { ...(effective.defaults?.paths ?? {}), ...(defaults.paths ?? {}) } };
      for (const key of Object.keys(defaults.paths ?? {})) provenance[`/defaults/paths/${key}`] = name;
    }
  }
  const policy = unwrap(compilePolicy(effective));
  return { policy, document: explainPolicy(policy).document, provenance };
}

/** Store only the repository-authored policy subset; provider responses and secret-bearing blobs are not settings. */
export function validateRepositoryConfiguration(value) {
  const outer = record(value, 'Repository configuration');
  if (Object.keys(outer).length !== 1 || !Object.hasOwn(outer, 'repository')) throw new TypeError('Repository configuration must contain only the repository policy layer.');
  const configuration = record(outer.repository, 'Repository policy configuration');
  for (const key of Object.keys(configuration)) if (!configurationKeys.has(key)) throw new TypeError(`Repository configuration does not allow ${key}.`);
  const serialized = JSON.stringify({ repository: configuration });
  if (serialized === undefined || new TextEncoder().encode(serialized).byteLength > 262_144) throw new TypeError('Repository configuration exceeds the 256 KiB limit.');
  const normalized = JSON.parse(serialized);
  const effective = resolveEffectivePolicy({ preset: DEFAULT_SIZE_POLICY, repository: normalized.repository });
  return { value: normalized, policyId: effective.policy.id, document: effective.document, provenance: effective.provenance };
}

/** Versioned, non-secret portable App configuration: history/evidence records are intentionally not included. */
export function readConfigurationExport(value) {
  if (!value || value.kind !== 'diffdevil.github-app-export' || ![3, 4].includes(value.version) || !Array.isArray(value.configurations) || !Array.isArray(value.tombstones)) throw new TypeError('Unsupported App configuration export.');
  return value;
}
