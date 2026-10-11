// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * The repository's effective configuration as Manage shows it: preset → stored App settings → the repository's
 * own file. The settings name an adopted default or published linked revision and each row names the layer
 * it came from. The rows come from the engine's explained document and the resolver's provenance, so what is shown
 * is what compiles; the repository file is read from GitHub only at execution time (and for the brief preview when
 * the deployment has App credentials), so without that observation the chain says so instead of guessing.
 */
import { DEFAULT_SIZE_POLICY, resolveEffectivePolicy } from '../../../../github-app/configuration.mjs';
import { adoptedConfiguration } from './defaults.mjs';

export const LAYER_LABEL = Object.freeze({ preset: 'preset', account: 'default', repository: 'App settings', supplied: 'repository file', app: 'App' });
/** The layer words when the repository's App settings are a linked Business policy. */
export const LINKED_LAYER_LABEL = Object.freeze({ ...LAYER_LABEL, repository: 'linked policy' });

/**
 * `{ document, provenance, policyId, observed, chain }` for one repository from its admission projection and namespace.
 * `link` names the Business policy the repository's stored settings are linked to (`{ name, revision, appliedRevision }`),
 * so the chain says which policy revision the App settings layer is.
 */
export function effectiveConfiguration({ admission, adoption = null, login = '', link = null }) {
  const stored = admission.configuration.value ?? {};
  const observed = admission.policy?.standing === 'observed';
  // The locally compiled view: the same layers the runtime applies, without the repository file this page cannot read.
  let local;
  try { local = resolveEffectivePolicy({ preset: DEFAULT_SIZE_POLICY, ...(stored.repository ? { repository: stored.repository } : {}) }); }
  catch { local = null; }
  const document = local?.document ?? null;
  // When the brief preview observed the trusted policy, its provenance names the values the repository file sets.
  const provenance = observed ? { ...(local?.provenance ?? {}), ...(admission.policy.provenance ?? {}) } : local?.provenance ?? {};
  const policyId = observed ? admission.policy.policyId : local?.policy.id ?? null;
  const hasStored = Boolean(stored.repository) && Object.keys(stored.repository).length > 0;
  const chain = [
    { key: 'preset', label: 'size@1 preset', tone: 'preset' },
    ...(hasStored ? [{ key: 'repository', label: link ? `linked policy ${link.name} · rev ${link.appliedRevision ?? '?'}${link.appliedRevision !== null && link.appliedRevision !== undefined && link.revision > link.appliedRevision ? ` (rev ${link.revision} not published here yet)` : ''}` : `App settings · rev ${admission.revision}${adoption ? ` · from ${login} default rev ${adoption.revision}` : ''}`, tone: 'default' }] : []),
    observed && admission.policy.source === 'trusted-base' ? { key: 'supplied', label: `.diffdevil.yml · ${String(admission.policy.sourceIdentity ?? '').replace(/^\.diffdevil\.yml@/u, '').slice(0, 7) || 'default branch'}`, tone: 'file' }
      : observed ? { key: 'supplied', label: '.diffdevil.yml · none on the default branch', tone: 'unobserved' }
        : { key: 'supplied', label: '.diffdevil.yml · read at execution time, not observed here', tone: 'unobserved' }
  ];
  return { document, provenance, policyId, observed, chain, compiles: local !== null, rows: document ? rowsOf(document, provenance).map(row => (row.from === 'supplied' ? { ...row, value: 'set in .diffdevil.yml, read on GitHub', note: `without the file: ${row.value}` } : row)) : [] };
}

/**
 * What adopting the namespace default would change in this repository, before anything is written (Pro, D057): the
 * effective rows now and with the default applied over the stored App settings, the rows that differ, and the
 * resulting policy identity. The repository file is not observed here, so a value it sets still wins after applying.
 */
export function defaultComparison({ admission, namespaceDefault }) {
  if (!namespaceDefault) return null;
  const stored = admission.configuration.value ?? {};
  const resolve = repository => { try { return resolveEffectivePolicy({ preset: DEFAULT_SIZE_POLICY, ...(repository ? { repository } : {}) }); } catch { return null; } };
  const before = resolve(stored.repository), next = adoptedConfiguration(stored, namespaceDefault), after = resolve(next.repository);
  if (!after) return { compiles: false, differences: [], configuration: next };
  const rowsBefore = before ? rowsOf(before.document, before.provenance) : [];
  const rowsAfter = rowsOf(after.document, after.provenance);
  const keys = [...new Set([...rowsBefore, ...rowsAfter].map(row => row.key))];
  const differences = keys.map(key => ({ key, before: rowsBefore.find(row => row.key === key)?.value ?? '—', after: rowsAfter.find(row => row.key === key)?.value ?? '—' })).filter(row => row.before !== row.after);
  return { compiles: true, differences, configuration: next, policyIdBefore: before?.policy.id ?? null, policyIdAfter: after.policy.id, revision: namespaceDefault.revision };
}

const bandWord = range => (range.otherwise ? range.id.toUpperCase() : `${range.id.toUpperCase()} < ${range.lt}`);
function rowsOf(document, provenance) {
  const from = (path, fallback = 'preset') => provenance[path] ?? fallback;
  const rows = [];
  rows.push({ key: 'presets', value: (document.presets ?? []).length ? document.presets.join(', ') : '— (expanded)', from: from('/presets') });
  for (const [name, band] of Object.entries(document.bands ?? {})) rows.push({ key: `bands.${name}`, value: (band.ranges ?? []).map(bandWord).join(' · '), from: from(`/bands/${name}`), note: band.value ? `on ${band.value}` : undefined });
  for (const [name, scope] of Object.entries(document.scopes ?? {})) rows.push({ key: `scopes.${name}`, value: [...(scope.include ? [`include ${[].concat(scope.include).join(', ')}`] : []), ...(scope.exclude ? [`exclude ${[].concat(scope.exclude).join(', ')}`] : [])].join(' · ') || '(empty)', from: from(`/scopes/${name}`, 'repository') });
  for (const [name, group] of Object.entries(document.labelGroups ?? {})) rows.push({ key: `labels.${name}`, value: (group ?? []).join(' · '), from: from(`/labelGroups/${name}`) });
  const definitions = Object.keys(document.labelDefinitions ?? {});
  if (definitions.length) rows.push({ key: 'labels.definitions', value: `${definitions.length} managed definitions`, from: Object.keys(provenance).some(path => path.startsWith('/labelDefinitions/')) ? provenance[Object.keys(provenance).find(path => path.startsWith('/labelDefinitions/'))] : 'preset', note: 'missing definitions are created; existing ones are never rewritten' });
  for (const [name, rule] of Object.entries(document.rules ?? {})) {
    const effects = rule?.effects ?? {};
    const parts = [...(effects.labels ? [`labels in ${effects.labels.group ?? 'group'}`] : []), ...(effects.comment ? [`comment · ${effects.comment.mode ?? 'upsert'}`] : [])];
    rows.push({ key: `rules.${name}`, value: `${rule?.band ? `band ${rule.band}` : rule?.when ? `when ${rule.when}` : 'rule'}${parts.length ? ` → ${parts.join(', ')}` : ''}`, from: from(`/rules/${name}`), note: rule?.onUnknown ? `unknown: ${rule.onUnknown}` : undefined });
  }
  for (const [name, value] of Object.entries(document.defaults?.paths ?? {})) rows.push({ key: `defaults.paths.${name}`, value: String(value), from: from(`/defaults/paths/${name}`, 'repository') });
  return rows;
}
