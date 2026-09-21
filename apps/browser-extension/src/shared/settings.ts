// SPDX-License-Identifier: AGPL-3.0-only
import { compileBrowserPolicy, readPolicyText, stringifyPolicy, type PolicyLayers, type HumanReportView } from '@wolfsblvt/diffdevil/browser';
import { SETTINGS, DEFAULTS, type Settings, type SettingValue } from './catalogue.js';
export { SETTINGS_KEY } from './settings-key.js';
export const bytes = (value: unknown): number => new TextEncoder().encode(typeof value === 'string' ? value : JSON.stringify(value)).byteLength;
export interface Band { id: string; name: string; lt: number | null; label: string; color: string }
export interface Override { mode?: PolicyLayers['mode']; yaml?: string }
export function repositoryKey(value: string): string {
  const key = value.toLowerCase();
  if (!/^[a-z0-9_.-]+\/[a-z0-9_.-]+$/u.test(key) || key.split('/').some(part => part === '.' || part === '..')) throw new Error('Use owner/repository, without a URL.');
  return key;
}

export function bands(text: string): Band[] {
  const value: unknown = JSON.parse(text);
  if (!Array.isArray(value) || !value.length || value.length > 20) throw new Error('Configure between 1 and 20 bands.');
  const ids = new Set<string>(); const labels = new Set<string>(); let previous = 0;
  return value.map((entry: unknown, index): Band => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error('Each band must be an object.');
    const item = entry as Record<string, unknown>;
    if (Object.keys(item).some(key => !['id', 'name', 'lt', 'label', 'color'].includes(key))) throw new Error('Unknown band field.');
    if (typeof item.id !== 'string' || !/^[a-z][a-z0-9_]*$/u.test(item.id) || ids.has(item.id)) throw new Error('Band IDs must be unique lowercase identifiers.'); ids.add(item.id);
    if (typeof item.name !== 'string' || !item.name.trim() || item.name.length > 50) throw new Error('Each band needs a short human-readable name.');
    if (index === value.length - 1 ? item.lt !== null : typeof item.lt !== 'number' || !Number.isSafeInteger(item.lt) || item.lt <= previous) throw new Error('Upper limits must increase. Only the final band has no limit.');
    if (typeof item.lt === 'number') previous = item.lt;
    if (typeof item.label !== 'string' || item.label.length > 50 || /[\x00-\x1f]/u.test(item.label) || item.label.trim() && labels.has(item.label.trim())) throw new Error('Mapped labels must be unique, short, single-line names, or empty.'); if (item.label.trim()) labels.add(item.label.trim());
    if (typeof item.color !== 'string' || item.color && !/^[a-f\d]{6}$/iu.test(item.color)) throw new Error('Colour must be six hexadecimal digits, or empty.');
    return { id: item.id, name: item.name.trim(), lt: item.lt as number | null, label: item.label.trim(), color: item.color.toUpperCase() };
  });
}
export function overrides(text: string): Record<string, Override> {
  if (bytes(text) > 1024 * 1024) throw new Error('Repository overrides exceed 1 MiB.');
  const input: unknown = JSON.parse(text); if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Overrides must be keyed by repository.');
  const result: Record<string, Override> = Object.create(null) as Record<string, Override>;
  for (const [key, entry] of Object.entries(input)) {
    const repo = repositoryKey(key); if (Object.hasOwn(result, repo)) throw new Error('Duplicate repository identity.');
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error('Each override must be an object.');
    const item = entry as Record<string, unknown>; if (Object.keys(item).some(key => !['mode', 'yaml'].includes(key))) throw new Error('Unknown repository override field.');
    if (item.mode !== undefined && !['composed', 'repository', 'personal-only'].includes(String(item.mode))) throw new Error('Unknown policy mode.');
    if (item.yaml !== undefined && (typeof item.yaml !== 'string' || bytes(item.yaml) > 256 * 1024)) throw new Error('Override YAML must be text of at most 256 KiB.');
    if (typeof item.yaml === 'string' && item.yaml.trim()) { const checked = readPolicyText(item.yaml); if (!checked.ok) throw new Error(checked.diagnostics.map(error => error.message).join('\n')); }
    result[repo] = { ...(item.mode ? { mode: item.mode as PolicyLayers['mode'] } : {}), ...(typeof item.yaml === 'string' ? { yaml: item.yaml } : {}) };
  }
  return result;
}
export function personalYaml(settings: Settings): string {
  const yaml = String(settings['policy.advancedYaml']); if (yaml.trim()) return yaml;
  const pathLines = (key: string): string[] => String(settings[`policy.${key}`]).split(/\r?\n/u).map(line => line.trim()).filter(Boolean);
  const includeOnly = pathLines('includeOnly');
  // Explicit includeOnly: [] means no files in the engine. Blank guided input
  // means no restriction, so omit the member instead of changing core semantics.
  const paths = { ...(includeOnly.length ? { includeOnly } : {}), exclude: pathLines('exclude'), forceInclude: pathLines('forceInclude') };
  if (settings['policy.preset'] === 'none') return stringifyPolicy({ version: 1, presets: [], defaults: { paths } });
  const ranges = bands(String(settings['policy.bands'])); const mapped = ranges.every(band => band.label);
  return stringifyPolicy({ version: 1, presets: [], defaults: { paths }, metrics: { review: { measure: settings['policy.primaryMetric'] } },
    bands: { size: { value: 'metrics.review', minimum: 0, ranges: ranges.map(band => band.lt === null ? { id: band.id, otherwise: true } : { id: band.id, lt: band.lt }) } },
    ...(mapped ? { labelGroups: { size: ranges.map(band => band.label) }, labelDefinitions: Object.fromEntries(ranges.map(band => [band.label, { color: band.color || 'D1D5DB', description: 'Configured diffdevil size band' }])), rules: { size: { band: 'size', onUnknown: 'hold', effects: { labels: { group: 'size', byBand: Object.fromEntries(ranges.map(band => [band.id, band.label])) } } } } } : {}) });
}
export function selectedPolicy(settings: Settings, repository: string): PolicyLayers {
  const local = overrides(String(settings['policy.repositoryOverrides']))[repositoryKey(repository)];
  return { mode: local?.mode ?? settings['policy.mode'] as PolicyLayers['mode'], personal: personalYaml(settings), ...(local?.yaml?.trim() ? { override: local.yaml } : {}) };
}
export function validateSettings(input: unknown, previous: Settings = { ...DEFAULTS }): Settings {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Settings must be an object.');
  const result = { ...previous };
  for (const [id, value] of Object.entries(input)) {
    const item = SETTINGS.find(item => item.id === id && item.kind !== 'action'); if (!item) throw new Error(`Unknown setting: ${id}`);
    if (typeof value !== typeof item.default) throw new Error(`${item.name} has the wrong value type.`);
    if (item.choices && !item.choices.some(([choice]) => choice === value)) throw new Error(`${item.name} has an unsupported choice.`);
    if (item.kind === 'number' && (!Number.isInteger(value) || Number(value) < 4 || Number(value) > 128)) throw new Error('Cache limit must be 4–128 MiB.');
    if (typeof value === 'string' && bytes(value) > (item.kind === 'overrides' ? 1024 * 1024 : 256 * 1024)) throw new Error(`${item.name} is too large.`);
    result[id] = value as SettingValue;
  }
  bands(String(result['policy.bands'])); overrides(String(result['policy.repositoryOverrides']));
  const compiled = compileBrowserPolicy(JSON.stringify({ mode: 'personal-only', personal: personalYaml(result) }));
  if (!compiled.ok && !compiled.diagnostics.every(error => error.code === 'E_TEMPLATE_SOURCE')) throw new Error(compiled.diagnostics.map(error => error.message).join('\n'));
  return result;
}
/** Guided names/colours are presentation preferences, not a second policy dialect. */
export function decorateView(view: HumanReportView, settings: Settings): HumanReportView {
  if (String(settings['policy.advancedYaml']).trim() || settings['policy.preset'] === 'none' || !view.policy) return view;
  const origin = view.policy.origins.find(item => item.path === '/bands/size');
  if (origin?.layer !== 'personal') return view;
  const configured = bands(String(settings['policy.bands']));
  const result = view.rails.map(rail => rail.id !== 'size' ? rail : { ...rail,
    ...(!rail.label && rail.selected && configured.find(band => band.id === rail.selected)?.label ? { label: configured.find(band => band.id === rail.selected)!.label, group: 'personal size mapping', members: configured.map(band => band.label).filter(Boolean) } : {}), cells: rail.cells.map(cell => {
    const band = configured.find(band => band.id === cell.id);
    return band ? { ...cell, name: band.name, ...(cell.color ? {} : band.color ? { color: band.color } : {}), ...(cell.label ? {} : band.label ? { label: band.label } : {}) } : cell;
  }) });
  return { ...view, rails: result };
}
