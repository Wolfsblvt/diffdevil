// SPDX-License-Identifier: AGPL-3.0-only
import { DEFAULT_FILE_LIMIT, FILE_LIMIT } from './coverage.js';
export type SettingValue = boolean | string | number;
export type Settings = Record<string, SettingValue>;
export interface Setting {
  readonly id: string; readonly name: string; readonly description: string;
  readonly group: 'Display' | 'Policy' | 'Analysis' | 'Integration' | 'Data' | 'Appearance';
  readonly kind: 'boolean' | 'choice' | 'bands' | 'paths' | 'yaml' | 'overrides' | 'number' | 'action' | 'paused' | 'inventory';
  readonly default: SettingValue; readonly advanced?: boolean; readonly min?: number; readonly max?: number; readonly unit?: string; readonly choices?: readonly (readonly [string, string])[]; readonly keywords?: string; readonly destructive?: boolean;
}
const flag = (id: string, name: string, description: string, value = true, advanced = false): Setting => ({ id, name, description, default: value, advanced, kind: 'boolean', group: id.startsWith('app.') || id.startsWith('labels.') ? 'Integration' : 'Display' });
export const DEFAULT_BANDS = JSON.stringify([
  { id: 'xs', name: 'XS', lt: 20, label: 'size/XS', color: 'C2E0C6' },
  { id: 's', name: 'S', lt: 100, label: 'size/S', color: 'BFDADC' },
  { id: 'm', name: 'M', lt: 500, label: 'size/M', color: 'C5DEF5' },
  { id: 'l', name: 'L', lt: 1000, label: 'size/L', color: 'D4C5F9' },
  { id: 'xl', name: 'XL', lt: null, label: 'size/XL', color: 'DCC6E0' },
]);
/** A real public pull request the extension is exercised against: the first-install section links here, and the public installed QA reads it. */
export const EXAMPLE_PULL_REQUEST = 'https://github.com/Wolfsblvt/diffdevil/pull/48';
/** Settings that hold a value; an action or the local-data view only presents controls. */
export const holdsValue = (item: Setting): boolean => item.kind !== 'action' && item.kind !== 'inventory';
export const SETTINGS: readonly Setting[] = [
  flag('display.enabled', 'Enable diffdevil on GitHub', 'Add replacement-aware measurements to pull-request pages. Disabling removes injected controls and restores native counters.'),
  // Extension Grammar v1 §10: two rendering preferences, both cosmetic. What the
  // seats show (Changed, the decomposition, the size chip, the rail, provenance)
  // is a fact of the comparison, not a preference.
  { id: 'display.brandIcon', name: 'Diffdevil icon', description: 'The glyph in the current text colour, the full-colour micro symbol, or no icon. Changed remains visible text; the report header always uses the glyph.', group: 'Display', kind: 'choice', default: 'monochrome', choices: [['monochrome', 'Glyph'], ['full-color', 'Colour symbol'], ['none', 'None']], keywords: 'brand hide icon full color colour symbol glyph monochrome' },
  { id: 'display.nativeChurn', name: 'GitHub’s raw churn', description: 'Once Changed is known, GitHub’s own additions, deletions and ratio bar are hidden by default. Faint keeps them after Changed, muted and desaturated. While loading and after a failure they always stay at full strength.', group: 'Display', kind: 'choice', default: 'hidden', choices: [['hidden', 'Hidden'], ['faint', 'Faint']], keywords: 'native diffstat raw additions deletions dim hide bar' },
  { id: 'policy.mode', name: 'Policy mode', description: 'Composed layers personal defaults, trusted base-revision repository policy, then explicit personal repository overrides. Personal only deliberately ignores the repository policy.', group: 'Policy', kind: 'choice', default: 'composed', choices: [['composed', 'Composed'], ['repository', 'Repository'], ['personal-only', 'Personal only']] },
  { id: 'policy.preset', name: 'Personal preset', description: 'Use a configurable size policy or no classification. Advanced YAML can express the full policy directly.', group: 'Policy', kind: 'choice', default: 'size@1', choices: [['size@1', 'size@1'], ['none', 'No size policy']] },
  { id: 'policy.primaryMetric', name: 'Classification metric', description: 'Choose the fact that determines the size band. Changed remains the primary displayed measurement.', group: 'Policy', kind: 'choice', default: 'lines.changed', choices: [['lines.changed', 'Replacement-aware Changed'], ['raw.churn', 'Raw churn'], ['raw.added', 'Raw additions'], ['raw.deleted', 'Raw deletions'], ['lines.modified', 'Modified positions']] },
  { id: 'policy.bands', name: 'Bands and label mappings', description: 'Upper limits are exclusive; the last band is unbounded. Optional existing-label mappings and colours remain inspectable.', group: 'Policy', kind: 'bands', default: DEFAULT_BANDS, keywords: 'tier threshold size label colour color range' },
  flag('app.preferExactReport', 'Prefer a matching App report', 'Retained preference for future immutable App report delivery. This build analyzes locally and never calls a hosted analysis endpoint.'),
  ...(['includeOnly', 'exclude', 'forceInclude'] as const).map((key): Setting => ({ id: `policy.${key}`, name: { includeOnly: 'Include only paths', exclude: 'Exclude paths', forceInclude: 'Force-include paths' }[key], description: 'One diffdevil glob per line. Force-included paths win. Repository layers may replace personal path defaults; excluded file facts remain inspectable.', group: 'Policy', kind: 'paths', default: '', advanced: true, keywords: 'glob filter scope path' })),
  { id: 'policy.repositoryOverrides', name: 'Repository overrides', description: 'Local-only policy modes and explicit YAML keyed by owner/repository. These do not change repository configuration.', group: 'Policy', kind: 'overrides', default: '{}', advanced: true },
  { id: 'policy.advancedYaml', name: 'Advanced personal policy', description: 'Use the real diffdevil schema, scopes, metrics, bands, queries and rules. Nonempty YAML replaces guided personal controls; those controls remain preserved.', group: 'Policy', kind: 'yaml', default: '', advanced: true, keywords: 'configuration schema compiler validation import export' },
  flag('app.showPolicyMismatch', 'Show App policy mismatches', 'Retained for future report delivery. A personal policy result must stay separate from a different App policy.', true, true),
  flag('app.showStaleResult', 'Show stale App standing', 'Retained for future report delivery. An older-head report must never validate the current comparison.', true, true),
  flag('labels.nativeHandoff', 'Offer the native label picker', 'Open and search GitHub’s visible picker for the mapped existing label. You confirm the native selection. No hidden POST, label creation or automatic mutation.', true, true),
  { id: 'analysis.maximumFiles', name: 'Automatically analyzed files', description: 'How many files diffdevil measures by itself when it opens a pull request, and again as you scroll onto files it has not measured. Files beyond it stay bounded until you open one or choose Analyze remaining files; the aggregate says so and is never extrapolated. This limits automatic work, not GitHub or what you can inspect.', group: 'Analysis', kind: 'number', default: DEFAULT_FILE_LIMIT, min: FILE_LIMIT.minimum, max: FILE_LIMIT.maximum, unit: 'files', keywords: 'maximum limit large pull request budget partial coverage bounded performance' },
  { id: 'repositories.paused', name: 'Paused repositories', description: 'Repositories where diffdevil does nothing: no analysis, no seats, and GitHub’s own counters come back at once. Local to this browser profile; it never changes a repository’s .diffdevil.yml, an App or GitHub. Cached data and your policy stay until you clear them.', group: 'Data', kind: 'paused', default: '{}', keywords: 'pause resume stop disable repository' },
  { id: 'data.controls', name: 'Local data', description: 'What this browser holds for each repository and pull request, and a separate control to clear exactly that. Reports hold normalized counts, paths and revision identities. Raw patches, page HTML and credentials are never stored.', group: 'Data', kind: 'inventory', default: '', keywords: 'purge clear delete cache reports storage privacy size' },
  { id: 'cache.maximumSize', name: 'Rebuildable cache limit', description: 'MiB for normalized reports and trusted-base policy documents. Least-recently-used entries are evicted. Raw patches are never stored.', group: 'Data', kind: 'number', default: 16, min: 4, max: 128, unit: 'MiB', advanced: true },
  { id: 'appearance.theme', name: 'Settings theme', description: 'Follow the system, or select the authored dark or light settings theme. GitHub controls follow GitHub’s theme independently.', group: 'Appearance', kind: 'choice', default: 'system', choices: [['dark', 'Dark'], ['system', 'Automatic'], ['light', 'Light']] },
  ...[
    ['data.clearAnalysisCache', 'Clear all reports', 'Delete every stored normalized report, for every repository, without changing preferences or policy documents.', false],
    ['data.clearPolicyCache', 'Clear trusted policy', 'Delete every stored trusted-base policy document and exact-base missing-file result. Reports stay.', false],
    ['data.clearRepositoryOverrides', 'Clear repository overrides', 'Remove all explicit per-repository preferences. Global personal settings remain.', true],
    ['data.resetAll', 'Reset all extension data', 'Delete preferences, overrides, paused repositories, caches and diagnostics after confirmation.', true],
    ['diagnostics.copySupportSnapshot', 'Copy support snapshot', 'Copy versions, safe display preferences, sanitized error codes and storage totals. No source, private paths, repository identities or policy text.', false],
  ].map(([id, name, description, destructive]): Setting => ({ id: id as string, name: name as string, description: description as string, destructive: destructive as boolean, group: 'Data', kind: 'action', default: '', advanced: true })),
];
export const DEFAULTS: Readonly<Settings> = Object.freeze(Object.fromEntries(SETTINGS.filter(holdsValue).map(item => [item.id, item.default])));
export const findSetting = (id: string): Setting | undefined => SETTINGS.find(item => item.id === id);
export const advancedChanges = (settings: Settings): readonly Setting[] => SETTINGS.filter(item => item.advanced && holdsValue(item) && settings[item.id] !== item.default);
export function searchSettings(query: string, values?: Settings): readonly Setting[] {
  const terms = query.toLocaleLowerCase('en').trim().split(/\s+/u).filter(Boolean);
  return SETTINGS.filter(item => terms.every(term => term === '@modified' ? values && values[item.id] !== item.default && holdsValue(item) : term === '@advanced' ? item.advanced : `${item.id} ${item.name} ${item.description} ${item.group} ${item.keywords ?? ''}`.toLocaleLowerCase('en').includes(term.replace(/^#/u, ''))));
}
