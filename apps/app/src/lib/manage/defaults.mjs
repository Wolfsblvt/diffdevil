// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * The reusable namespace default: one policy document per personal account or funded organisation, read with the
 * same engine and schema as the CLI and Actions. It holds the repository-authored policy subset only (presets, scopes,
 * parameters, metrics, bands, queries, label groups and definitions, rules, defaults); brief settings and provider
 * material are not part of a default.
 *
 * On Pro a repository adopts the default from its own settings (D057): applying it writes the default's sections into
 * that repository's App settings, so the default is never a live layer and a repository keeps exactly what it runs
 * when the default changes, is removed or the plan ends. On Business the same stored document is the namespace's
 * linked policy and joins the effective policy as its `account` layer. A repository's own `.diffdevil.yml` still wins.
 */
import { readPolicyYaml, readPolicyJson, unwrap } from '@wolfsblvt/diffdevil';
import { DEFAULT_SIZE_POLICY, resolveEffectivePolicy } from '../../../../github-app/configuration.mjs';

const SECTIONS = ['presets', 'scopes', 'parameters', 'metrics', 'bands', 'queries', 'labelGroups', 'labelDefinitions', 'rules', 'defaults'];
const LIMIT_BYTES = 65_536;

function defaultError(message) { return Object.assign(new TypeError(message), { code: 'E_NAMESPACE_DEFAULT' }); }

/** Parse a YAML or JSON policy document into the stored account layer and prove it compiles over the preset. */
export function readNamespaceDefault(text) {
  if (typeof text !== 'string' || text.trim().length === 0) throw defaultError('A default needs a policy document.');
  if (new TextEncoder().encode(text).byteLength > LIMIT_BYTES) throw defaultError('A default is at most 64 KiB.');
  const source = unwrap(text.trimStart().startsWith('{') ? readPolicyJson(text, { name: 'namespace default' }) : readPolicyYaml(text, { name: 'namespace default' }));
  const document = source.document ?? source;
  const configuration = {};
  for (const section of SECTIONS) if (document[section] !== undefined) configuration[section] = document[section];
  for (const key of Object.keys(document)) if (!SECTIONS.includes(key) && !['version', 'language', 'measurement'].includes(key)) throw defaultError(`A default does not allow ${key}.`);
  const effective = resolveEffectivePolicy({ preset: DEFAULT_SIZE_POLICY, account: configuration });
  return { configuration, policyId: effective.policy.id, document: effective.document };
}

/** The same reader for a Business linked policy's revision: one policy document, the repository-authored subset, proven to compile. */
export const readPolicyDocument = readNamespaceDefault;


/** The repository settings that adopting `namespaceDefault` writes: its sections replace the same sections of the stored App settings; others stay. */
export function adoptedConfiguration(stored, namespaceDefault) {
  const current = stored ?? {};
  return { ...current, repository: { ...(current.repository ?? {}), ...(namespaceDefault?.configuration ?? {}) } };
}
