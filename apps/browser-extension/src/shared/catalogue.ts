// SPDX-License-Identifier: AGPL-3.0-only
export type SettingValue = boolean | string | number;
export type Settings = Record<string, SettingValue>;
export interface Setting {
  readonly id: string; readonly name: string; readonly description: string;
  readonly group: 'Display' | 'Policy' | 'Integration' | 'Data' | 'Appearance';
  readonly kind: 'boolean' | 'choice' | 'bands' | 'paths' | 'yaml' | 'overrides' | 'number' | 'action';
  readonly default: SettingValue; readonly advanced?: boolean; readonly choices?: readonly (readonly [string, string])[]; readonly keywords?: string; readonly destructive?: boolean;
}
const flag = (id: string, name: string, description: string, value = true, advanced = false): Setting => ({ id, name, description, default: value, advanced, kind: 'boolean', group: id.startsWith('app.') || id.startsWith('labels.') ? 'Integration' : 'Display' });
export const DEFAULT_BANDS = JSON.stringify([
  { id: 'xs', name: 'XS', lt: 20, label: 'size/XS', color: 'C2E0C6' },
  { id: 's', name: 'S', lt: 100, label: 'size/S', color: 'BFDADC' },
  { id: 'm', name: 'M', lt: 500, label: 'size/M', color: 'C5DEF5' },
  { id: 'l', name: 'L', lt: 1000, label: 'size/L', color: 'D4C5F9' },
  { id: 'xl', name: 'XL', lt: null, label: 'size/XL', color: 'DCC6E0' },
]);
export const SETTINGS: readonly Setting[] = [
  flag('display.enabled', 'Enable diffdevil on GitHub', 'Add replacement-aware measurements to pull-request pages. Disabling removes injected controls and restores native counters.'),
  flag('display.aggregateChanged', 'Show pull-request Changed', 'Show the complete pull-request measurement across Conversation, Commits, Checks and Files changed.'),
  flag('display.fileChanged', 'Show per-file Changed', 'Measure each file independently as its header appears. A file does not inherit the pull request’s size tier.'),
  flag('display.decomposition', 'Show added, deleted and modified lines', 'Keep +added-only, −deleted-only and ~modified beside Changed. Replacements count once.'),
  flag('display.rawChurn', 'Show raw churn', 'Show raw additions and deletions below Changed. This is separate from GitHub’s own counters.'),
  flag('display.dimNativeDiffstat', 'Dim GitHub’s native diffstat', 'Make native green/red numbers and the ratio bar secondary without dimming keyboard focus outlines.'),
  flag('display.bandRail', 'Show the policy band rail', 'One cell per configured band. A cell is selected only when the evidence proves that classification.'),
  flag('display.virtualBandPill', 'Show the virtual size pill', 'Display your policy classification even in repositories you do not own. This does not apply a label.'),
  flag('display.appStanding', 'Show result provenance', 'Identify local analysis. A matching App checkmark requires authenticated report delivery, which is not configured in this build.'),
  { id: 'display.brandIcon', name: 'Diffdevil icon', description: 'Quiet monochrome provenance, the full-colour micro symbol, or no icon. Changed remains visible text.', group: 'Display', kind: 'choice', default: 'monochrome', choices: [['monochrome', 'Monochrome glyph'], ['full-color', 'Full-colour symbol'], ['none', 'None']], keywords: 'brand hide icon full color colour symbol' },
  { id: 'policy.mode', name: 'Policy mode', description: 'Composed layers personal defaults, trusted base-revision repository policy, then explicit personal repository overrides. Personal only deliberately ignores the repository policy.', group: 'Policy', kind: 'choice', default: 'composed', choices: [['composed', 'Composed'], ['repository', 'Repository'], ['personal-only', 'Personal only']] },
  { id: 'policy.preset', name: 'Personal preset', description: 'Use a configurable size policy or no classification. Advanced YAML can express the full policy directly.', group: 'Policy', kind: 'choice', default: 'size@1', choices: [['size@1', 'size@1'], ['none', 'No size policy']] },
  { id: 'policy.primaryMetric', name: 'Classification metric', description: 'Choose the fact that determines the size band. Changed remains the primary displayed measurement.', group: 'Policy', kind: 'choice', default: 'lines.changed', choices: [['lines.changed', 'Replacement-aware Changed'], ['raw.churn', 'Raw churn'], ['raw.added', 'Raw additions'], ['raw.deleted', 'Raw deletions'], ['lines.modified', 'Modified positions']] },
  { id: 'policy.bands', name: 'Bands and label mappings', description: 'Upper limits are exclusive; the last band is unbounded. Optional existing-label mappings and colours remain inspectable.', group: 'Policy', kind: 'bands', default: DEFAULT_BANDS, keywords: 'tier threshold size label colour color range' },
  flag('app.preferExactReport', 'Prefer a matching App report', 'Retained preference for future immutable App report delivery. This build analyzes locally and never calls a hosted analysis endpoint.'),
  flag('display.hideNativeDiffstat', 'Hide GitHub’s native diffstat', 'Hide the native raw counters and ratio bar. This explicit choice takes precedence over dimming.', false, true),
  flag('display.detailDefaultOpen', 'Open aggregate details by default', 'Open a non-modal report once for each newly acquired comparison. File reports remain on demand.', false, true),
  { id: 'display.density', name: 'Display density', description: 'Compact rows or more comfortable spacing, with the same measurements.', group: 'Display', kind: 'choice', default: 'compact', advanced: true, choices: [['compact', 'Compact'], ['comfortable', 'Comfortable']] },
  ...(['includeOnly', 'exclude', 'forceInclude'] as const).map((key): Setting => ({ id: `policy.${key}`, name: { includeOnly: 'Include only paths', exclude: 'Exclude paths', forceInclude: 'Force-include paths' }[key], description: 'One diffdevil glob per line. Force-included paths win. Repository layers may replace personal path defaults; excluded file facts remain inspectable.', group: 'Policy', kind: 'paths', default: '', advanced: true, keywords: 'glob filter scope path' })),
  { id: 'policy.repositoryOverrides', name: 'Repository overrides', description: 'Local-only policy modes and explicit YAML keyed by owner/repository. These do not change repository configuration.', group: 'Policy', kind: 'overrides', default: '{}', advanced: true },
  { id: 'policy.advancedYaml', name: 'Advanced personal policy', description: 'Use the real diffdevil schema, scopes, metrics, bands, queries and rules. Nonempty YAML replaces guided personal controls; those controls remain preserved.', group: 'Policy', kind: 'yaml', default: '', advanced: true, keywords: 'configuration schema compiler validation import export' },
  flag('app.showPolicyMismatch', 'Show App policy mismatches', 'Retained for future report delivery. A personal policy result must stay separate from a different App policy.', true, true),
  flag('app.showStaleResult', 'Show stale App standing', 'Retained for future report delivery. An older-head report must never validate the current comparison.', true, true),
  flag('labels.nativeHandoff', 'Offer the native label picker', 'Open and search GitHub’s visible picker for the mapped existing label. You confirm the native selection. No hidden POST, label creation or automatic mutation.', true, true),
  { id: 'cache.maximumSize', name: 'Rebuildable cache limit', description: 'MiB for normalized reports and trusted-base policy documents. Least-recently-used entries are evicted. Raw patches are never stored.', group: 'Data', kind: 'number', default: 16, advanced: true },
  { id: 'appearance.theme', name: 'Settings theme', description: 'Follow the system, or select the authored dark or light settings theme. GitHub controls follow GitHub’s theme independently.', group: 'Appearance', kind: 'choice', default: 'system', choices: [['dark', 'Dark'], ['system', 'Automatic'], ['light', 'Light']] },
  ...[
    ['data.clearAnalysisCache', 'Clear analysis cache', 'Delete normalized reports without changing preferences or policy documents.', false],
    ['data.clearPolicyCache', 'Clear repository-policy cache', 'Delete trusted-base policy documents and exact-base missing-file results.', false],
    ['data.clearRepositoryOverrides', 'Clear repository overrides', 'Remove all explicit per-repository preferences. Global personal settings remain.', true],
    ['data.resetAll', 'Reset all extension data', 'Delete preferences, overrides, caches and diagnostics after confirmation.', true],
    ['diagnostics.copySupportSnapshot', 'Copy support snapshot', 'Copy versions, safe display preferences, sanitized error codes and storage totals. No source, private paths, repository identities or policy text.', false],
  ].map(([id, name, description, destructive]): Setting => ({ id: id as string, name: name as string, description: description as string, destructive: destructive as boolean, group: 'Data', kind: 'action', default: '', advanced: true })),
];
export const DEFAULTS: Readonly<Settings> = Object.freeze(Object.fromEntries(SETTINGS.filter(item => item.kind !== 'action').map(item => [item.id, item.default])));
export const findSetting = (id: string): Setting | undefined => SETTINGS.find(item => item.id === id);
export const advancedChanges = (settings: Settings): readonly Setting[] => SETTINGS.filter(item => item.advanced && item.kind !== 'action' && settings[item.id] !== item.default);
export function searchSettings(query: string, values?: Settings): readonly Setting[] {
  const terms = query.toLocaleLowerCase('en').trim().split(/\s+/u).filter(Boolean);
  return SETTINGS.filter(item => terms.every(term => term === '@modified' ? values && values[item.id] !== item.default && item.kind !== 'action' : term === '@advanced' ? item.advanced : `${item.id} ${item.name} ${item.description} ${item.group} ${item.keywords ?? ''}`.toLocaleLowerCase('en').includes(term.replace(/^#/u, ''))));
}
