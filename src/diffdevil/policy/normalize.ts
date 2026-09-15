import { capture, unwrap } from '../errors.js';
import { deepFreeze, inertCopy } from '../inert.js';
import { SEMANTICS } from '../model.js';
import type { LabelDefinition, PathPolicy, Result } from '../model.js';
import { expandShortcut, shortcutAst } from '../language/shortcuts.js';
import type { BandRange } from './bands.js';
import type { Ast } from '../language/ast.js';
import { SIZE_PRESET } from './size-preset.js';
import { configError, pointer, policyRecord, readPathPolicy, readPolicyDocument } from './validation.js';
import type { NormalizedPolicy, PathOverrides, PolicyDocument, PolicyOrigin } from './types.js';

export interface NormalizeOptions { readonly paths?: PathOverrides; readonly presets?: readonly 'size@1'[] }
export interface Normalization extends NormalizedPolicy { readonly generated: ReadonlyMap<string, Ast> }
const dictionaries = ['scopes', 'parameters', 'metrics', 'bands', 'queries', 'labelGroups', 'labelDefinitions', 'rules'] as const;
/** Expand bundled data and declared replacement semantics without executing policy. */
export function normalizePolicy(input: unknown = { version: 1 }, options: NormalizeOptions = {}): Result<Normalization> {
  return capture(() => {
    const user = readPolicyDocument(input);
    const presets = options.presets ?? user.presets ?? ['size@1'];
    if (presets.some(p => p !== 'size@1') || new Set(presets).size !== presets.length) configError('Invalid preset selection.', '/presets');
    if (user.size && !presets.includes('size@1')) configError('size overrides require size@1.', '/size', 'E_CONFIG_CONFLICT');
    const base = (presets.includes('size@1') ? inertCopy(SIZE_PRESET) : { version: 1, presets: [] }) as Record<string, unknown>;
    const origins: PolicyOrigin[] = [];
    const layers = new Map<string, string>();
    const generated = new Map<string, Ast>();
    const touch = (path: string, layer: string): void => {
      const previous = layers.get(path);
      origins.push({ path, layer, ...(previous === undefined ? {} : { replaces: previous }) });
      layers.set(path, layer);
    };
    for (const section of dictionaries) for (const name of Object.keys((base[section] ?? {}) as object)) touch(pointer(`/${section}`, name), 'preset:size@1');
    const conflict = (section: typeof dictionaries[number], name: string): void => {
      if (Object.hasOwn(user[section] ?? {}, name)) configError('A size override and an explicit declaration modify the same generated value.', pointer(`/${section}`, name), 'E_CONFIG_CONFLICT');
    };
    if (user.size?.metric !== undefined) {
      conflict('metrics', 'review');
      const shortcut = { kind: 'query' as const, metric: user.size.metric };
      const expression = unwrap(expandShortcut(shortcut)).expression;
      (base.metrics as Record<string, unknown>).review = { formula: expression };
      generated.set('/metrics/review/formula', shortcutAst(shortcut));
      touch('/metrics/review', 'size.metric');
    }
    if (user.size?.thresholds) {
      conflict('bands', 'size');
      const band = (base.bands as Record<string, Record<string, unknown>>).size!;
      const ranges: BandRange[] = (['xs', 's', 'm', 'l'] as const).map(id => ({ id, lt: user.size!.thresholds![id] }));
      ranges.push({ id: 'xl', otherwise: true });
      band.ranges = ranges;
      touch('/bands/size', 'size.thresholds');
    }
    if (user.size?.labels) {
      conflict('labelGroups', 'size'); conflict('rules', 'size');
      const labels = user.size.labels;
      const oldNames = SIZE_PRESET.labelGroups.size;
      const newNames = ['xs', 's', 'm', 'l', 'xl', 'unknown'].map(id => labels[id as keyof typeof labels]);
      const definitions = base.labelDefinitions as Record<string, LabelDefinition>;
      const moved = oldNames.map((name, index) => [newNames[index]!, definitions[name]!] as const);
      for (const name of [...oldNames, ...newNames]) conflict('labelDefinitions', name);
      for (const name of oldNames) delete definitions[name];
      for (const [name, definition] of moved) { definitions[name] = definition; touch(pointer('/labelDefinitions', name), 'size.labels'); }
      (base.labelGroups as Record<string, unknown>).size = newNames;
      const rule = (base.rules as Record<string, Record<string, unknown>>).size!;
      rule.effects = { labels: { group: 'size', byBand: { xs: labels.xs, s: labels.s, m: labels.m, l: labels.l, xl: labels.xl }, unknown: labels.unknown } };
      touch('/labelGroups/size', 'size.labels'); touch('/rules/size', 'size.labels');
    }
    // Changing the measurement invalidates numeric default descriptions, not names/colors.
    if (user.size?.metric !== undefined || user.size?.thresholds !== undefined) {
      const definitions = base.labelDefinitions as Record<string, LabelDefinition>;
      for (const name of Object.keys(definitions)) {
        conflict('labelDefinitions', name);
        definitions[name] = { ...definitions[name]!, description: name === (user.size.labels?.unknown ?? 'size/Unknown') ? 'Available evidence cannot establish one size band' : 'Configured diffdevil size band' };
        touch(pointer('/labelDefinitions', name), 'size.measurement');
      }
    }
    for (const section of dictionaries) {
      const entries = user[section]; if (!entries) continue;
      const merged = { ...((base[section] ?? {}) as Record<string, unknown>) };
      for (const [name, declaration] of Object.entries(entries)) { merged[name] = declaration; touch(pointer(`/${section}`, name), 'config'); }
      base[section] = merged;
    }
    const prior = ((base.defaults as { paths?: PathPolicy } | undefined)?.paths ?? {});
    let paths: PathPolicy = { ...prior, ...user.defaults?.paths };
    for (const key of Object.keys(user.defaults?.paths ?? {})) touch(`/defaults/paths/${key}`, 'config');
    if (options.paths) {
      const overrides = policyRecord(inertCopy(options.paths, { code: 'E_CONFIG' }), '/invocation/paths', ['exclude', 'includeOnly', 'forceInclude', 'excludeMode', 'includeOnlyMode', 'forceIncludeMode']);
      const values: Record<string, unknown> = { ...paths };
      for (const key of ['exclude', 'includeOnly', 'forceInclude'] as const) {
        const mode = overrides[`${key}Mode`] ?? 'append';
        if (mode !== 'append' && mode !== 'replace') configError('Path mode must be append or replace.', `/invocation/paths/${key}Mode`);
        if (overrides[key] === undefined) continue;
        readPathPolicy({ [key]: overrides[key] }, '/invocation/paths');
        values[key] = mode === 'replace' ? overrides[key] : [...new Set([...(paths[key] ?? []), ...(overrides[key] as readonly string[])])];
        touch(`/defaults/paths/${key}`, `invocation:${mode}`);
      }
      paths = values as PathPolicy;
    }
    base.defaults = { paths };
    base.version = 1; base.language = SEMANTICS.language; base.presets = [];
    base.measurement = { replacementLines: SEMANTICS.replacementLines };
    const document = readPolicyDocument(base);
    return { document: deepFreeze(document), semantics: deepFreeze({ ...SEMANTICS, presets: [...presets] }), origins: deepFreeze(origins), generated };
  });
}
