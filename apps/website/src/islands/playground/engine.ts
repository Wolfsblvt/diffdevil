// SPDX-License-Identifier: AGPL-3.0-only
/**
 * The playground computes nothing itself. This module calls the shared engine in the
 * browser: read the policy, compile, evaluate against the acquired report, plan the
 * desired effects, and render the real presenters. Controls lower to the same policy
 * document the Policy editor edits; unsupported keys are carried, never dropped.
 */
import { readReport, withPathPolicy } from '@wolfsblvt/diffdevil/core';
import type { Diagnostic, EffectPlan, NumericMeasurement, Report, Result } from '@wolfsblvt/diffdevil/core';
import { compilePolicy, createPlan, evaluatePolicy, explainPolicy, readPolicyYaml } from '@wolfsblvt/diffdevil/policy';
import type { CompiledPolicy, PolicyDocument, PolicyResult } from '@wolfsblvt/diffdevil/policy';
import { formatReport } from '@wolfsblvt/diffdevil/format';
import { formatPlan } from '@wolfsblvt/diffdevil/policy';
import { stringify as stringifyYaml } from 'yaml';
import { checkSummary } from '../../../../shared/check-summary.mjs';

export type { Diagnostic, EffectPlan, NumericMeasurement, Report, PolicyResult, PolicyDocument };

export interface Evaluation {
  readonly ok: true;
  readonly policy: CompiledPolicy;
  readonly document: PolicyDocument;          // the user's document as written
  readonly effective: PolicyDocument;         // normalized: presets expanded
  readonly origins: readonly { path: string; layer: string; replaces?: string }[];
  readonly result: PolicyResult;
  readonly report: Report;                    // evaluated: metrics, bands, rules attached
  readonly plan: EffectPlan | undefined;
  readonly planDiagnostics: readonly Diagnostic[];
  readonly focusMetric: string;
  readonly focusBand: string | undefined;
}
export interface EvaluationFailure { readonly ok: false; readonly diagnostics: readonly Diagnostic[] }

const TARGET = { repository: 'owner/repo', pullRequest: 123 };

export function targetFor(report: Report): { repository: string; pullRequest: number } {
  return report.source.repository && report.source.pullRequest ? { repository: report.source.repository, pullRequest: report.source.pullRequest } : TARGET;
}

/** Evaluate one policy text against one acquired report. Pure; safe to call on every edit. */
export function evaluate(policyText: string, policyName: string, report: Report, focus?: string): Evaluation | EvaluationFailure {
  const source = readPolicyYaml(policyText, { name: policyName });
  if (!source.ok) return { ok: false, diagnostics: source.diagnostics };
  const compiled = compilePolicy(source.value, { sourceName: policyName });
  if (!compiled.ok) return { ok: false, diagnostics: compiled.diagnostics };
  const evaluated = evaluatePolicy(compiled.value, report);
  if (!evaluated.ok) return { ok: false, diagnostics: evaluated.diagnostics };
  const explanation = explainPolicy(compiled.value);
  const plan = createPlan(evaluated.value, targetFor(report));
  const effective = explanation.document;
  const metrics = Object.keys(effective.metrics ?? {});
  const focusMetric = focus && metrics.includes(focus) ? focus : metrics.includes('review') ? 'review' : metrics[0] ?? 'review';
  const focusBand = Object.entries(effective.bands ?? {}).find(([, band]) => band.value === `metrics.${focusMetric}`)?.[0];
  return {
    ok: true, policy: compiled.value, document: source.value.document as PolicyDocument, effective, origins: explanation.origins,
    result: evaluated.value, report: evaluated.value.report,
    plan: plan.ok ? plan.value : undefined, planDiagnostics: plan.ok ? [] : plan.diagnostics,
    focusMetric, focusBand,
  };
}

export function readSavedReport(value: unknown): Result<Report> { return readReport(value); }

/* ── presenters (the real ones) ── */
export function human(report: Report): string { return present(formatReport(report, 'human')); }
export function agent(report: Report): string { return present(formatReport(report, 'agent')); }
export function json(report: Report): string { return JSON.stringify(report, null, 2); }
export function planHuman(plan: EffectPlan): string { return present(formatPlan(plan, 'human')); }
export function planJson(plan: EffectPlan): string { return JSON.stringify(plan, null, 2); }
export function appCheckSummary(report: Report, plan: EffectPlan | undefined): string {
  return checkSummary(report, { changed: plan ? plan.operations.length : 0 });
}
function present(result: Result<{ stdout: string }>): string {
  return result.ok ? result.value.stdout : result.diagnostics.map(d => `${d.code}: ${d.message}`).join('\n');
}

/* ── controls: a small graphical surface over the policy document ── */
export interface BandRow { readonly id: string; readonly lt: number | undefined; readonly label: string | undefined }
export interface Controls {
  readonly preset: 'size@1' | 'none';
  readonly metricMeasure: string | undefined;     // e.g. lines.changed when the focus metric is a measure
  readonly metricFormula: string | undefined;     // when the focus metric is a formula
  readonly bands: readonly BandRow[];
  readonly bandLabelGroup: string | undefined;
  readonly exclude: readonly string[];
  readonly forceInclude: readonly string[];
  readonly comment: boolean;
  readonly commentRule: string | undefined;
  readonly kept: readonly string[];               // keys the controls cannot represent
}

export const MEASURES = ['lines.changed', 'lines.modified', 'lines.added', 'lines.deleted', 'raw.churn', 'raw.added', 'raw.deleted', 'files.included', 'files.total'] as const;

/** What the controls show: read from the effective (normalized) document. */
export function controlsFrom(evaluation: Evaluation): Controls {
  const user = evaluation.document, effective = evaluation.effective;
  const metric = effective.metrics?.[evaluation.focusMetric];
  const band = evaluation.focusBand ? effective.bands?.[evaluation.focusBand] : undefined;
  const rule = Object.entries(effective.rules ?? {}).find(([, r]) => 'band' in r && r.band === evaluation.focusBand)?.[1];
  const byBand = rule && 'band' in rule && rule.effects?.labels && 'byBand' in rule.effects.labels ? rule.effects.labels.byBand : undefined;
  const commentRule = Object.entries(user.rules ?? {}).find(([, r]) => r.effects?.comment)?.[0];
  const kept: string[] = [];
  const own = (key: keyof PolicyDocument): boolean => user[key] !== undefined;
  if (own('scopes')) kept.push(`scopes ${Object.keys(user.scopes!).join(', ')}`);
  const otherMetrics = Object.keys(user.metrics ?? {}).filter(id => id !== evaluation.focusMetric);
  if (otherMetrics.length) kept.push(`metrics ${otherMetrics.join(', ')}`);
  const otherRules = Object.entries(user.rules ?? {}).filter(([id, r]) => !('band' in r && r.band === evaluation.focusBand) && id !== commentRule).map(([id]) => id);
  if (otherRules.length) kept.push(`rules ${otherRules.join(', ')}`);
  if (own('parameters')) kept.push(`${Object.keys(user.parameters!).length} parameter${Object.keys(user.parameters!).length === 1 ? '' : 's'}`);
  if (own('queries')) kept.push(`${Object.keys(user.queries!).length} quer${Object.keys(user.queries!).length === 1 ? 'y' : 'ies'}`);
  if (own('labelDefinitions')) kept.push('label definitions');
  if (user.defaults?.paths?.includeOnly?.length) kept.push('defaults.paths.includeOnly');
  return {
    preset: (user.presets ?? ['size@1']).includes('size@1') ? 'size@1' : 'none',
    metricMeasure: metric && 'measure' in metric ? metric.measure : undefined,
    metricFormula: metric && 'formula' in metric ? metric.formula : undefined,
    bands: band ? band.ranges.map(range => ({ id: range.id, lt: 'lt' in range ? range.lt : undefined, label: byBand?.[range.id] })) : [],
    bandLabelGroup: rule && 'band' in rule && rule.effects?.labels && 'group' in rule.effects.labels ? rule.effects.labels.group : undefined,
    exclude: user.defaults?.paths?.exclude ?? [],
    forceInclude: user.defaults?.paths?.forceInclude ?? [],
    comment: commentRule !== undefined,
    commentRule,
    kept,
  };
}

export type ControlEdit =
  | { kind: 'preset'; preset: 'size@1' | 'none' }
  | { kind: 'measure'; measure: string }
  | { kind: 'threshold'; id: string; lt: number }
  | { kind: 'label'; id: string; label: string }
  | { kind: 'exclude'; patterns: readonly string[] }
  | { kind: 'forceInclude'; patterns: readonly string[] }
  | { kind: 'comment'; on: boolean };

const DEFAULT_COMMENT = { mode: 'upsert', trigger: 'always', template: '**Change summary**\n\nReplacement-aware changed lines: {{ totals.lines.changed }}\nRaw churn: {{ totals.raw.churn }}\nIncluded files: {{ totals.files.included }}\n\nThese are diff measurements, not a judgment of code quality or risk.\n' } as const;

/**
 * Apply one control edit to the user's document. Only the keys the control represents
 * change; every other key is carried unchanged. Formatting is regenerated from data.
 */
export function applyControl(evaluation: Evaluation, edit: ControlEdit): string {
  const doc = structuredClone(evaluation.document) as Record<string, any>;
  const usesPreset = (doc.presets ?? ['size@1']).includes('size@1');
  const ownBand = evaluation.focusBand && doc.bands?.[evaluation.focusBand];
  switch (edit.kind) {
    case 'preset':
      doc.presets = edit.preset === 'size@1' ? ['size@1'] : [];
      if (edit.preset === 'none') delete doc.size;
      break;
    case 'measure':
      if (doc.metrics?.[evaluation.focusMetric]) doc.metrics[evaluation.focusMetric] = { ...doc.metrics[evaluation.focusMetric], measure: edit.measure, formula: undefined };
      else if (usesPreset) doc.size = { ...(doc.size ?? {}), metric: edit.measure };
      else doc.metrics = { ...(doc.metrics ?? {}), [evaluation.focusMetric]: { measure: edit.measure } };
      break;
    case 'threshold':
      if (ownBand) ownBand.ranges = ownBand.ranges.map((range: any) => range.id === edit.id ? { ...range, lt: edit.lt } : range);
      else if (usesPreset) {
        const current = Object.fromEntries(evaluation.effective.bands!.size!.ranges.filter(r => 'lt' in r).map(r => [r.id, (r as { lt: number }).lt]));
        doc.size = { ...(doc.size ?? {}), thresholds: { xs: current.xs, s: current.s, m: current.m, l: current.l, [edit.id]: edit.lt } };
      }
      break;
    case 'label': {
      const rules = doc.rules ?? {};
      const ruleId = Object.keys(rules).find(id => rules[id].band === evaluation.focusBand);
      if (ruleId && rules[ruleId].effects?.labels?.byBand) rules[ruleId].effects.labels.byBand[edit.id] = edit.label;
      else if (usesPreset) {
        const effectiveRule = Object.values(evaluation.effective.rules ?? {}).find(r => 'band' in r && r.band === 'size') as any;
        const byBand = effectiveRule?.effects?.labels?.byBand ?? {};
        doc.size = { ...(doc.size ?? {}), labels: { xs: byBand.xs, s: byBand.s, m: byBand.m, l: byBand.l, xl: byBand.xl, unknown: effectiveRule?.effects?.labels?.unknown ?? 'size/Unknown', [edit.id]: edit.label } };
      }
      break;
    }
    case 'exclude':
      doc.defaults = { ...(doc.defaults ?? {}), paths: { ...(doc.defaults?.paths ?? {}), exclude: [...edit.patterns] } };
      if (doc.defaults.paths.exclude.length === 0) delete doc.defaults.paths.exclude;
      break;
    case 'forceInclude':
      doc.defaults = { ...(doc.defaults ?? {}), paths: { ...(doc.defaults?.paths ?? {}), forceInclude: [...edit.patterns] } };
      if (doc.defaults.paths.forceInclude.length === 0) delete doc.defaults.paths.forceInclude;
      break;
    case 'comment': {
      const rules = doc.rules ?? {};
      const existing = Object.keys(rules).find(id => rules[id].effects?.comment);
      if (edit.on && !existing) doc.rules = { ...rules, reviewSummary: { when: 'true', effects: { comment: { ...DEFAULT_COMMENT } } } };
      if (!edit.on && existing) { delete rules[existing]; if (Object.keys(rules).length === 0) delete doc.rules; }
      break;
    }
  }
  return stringifyYaml(doc, { lineWidth: 0 });
}

/** How many observed files one pattern would exclude on its own. */
export function patternMatches(report: Report, pattern: string): number | undefined {
  try {
    const applied = withPathPolicy(report, { exclude: [pattern] });
    return applied.files.filter(file => !file.included).length;
  } catch { return undefined; }
}

/* ── display helpers ── */
export const evidenceGlyph = { exact: '=', bounded: '≈', unknown: '?', unmeasurable: '∅' } as const;
const nf = new Intl.NumberFormat('en');
export function display(measurement: NumericMeasurement | undefined): string {
  if (!measurement) return '—';
  switch (measurement.status) {
    case 'exact': return nf.format(measurement.value);
    case 'bounded': return `${nf.format(measurement.lower)}–${nf.format(measurement.upper)}`;
    case 'unknown': return measurement.lower !== undefined ? `≥ ${nf.format(measurement.lower)}` : '?';
    case 'unmeasurable': return '∅';
  }
}
export function observedTotals(report: Report): { churn: number; changed: number; all: boolean } {
  let churn = 0, changed = 0, all = true;
  for (const file of report.files) {
    if (file.raw.churn.status === 'exact') churn += file.raw.churn.value; else all = false;
    if (file.lines.changed.status === 'exact') changed += file.lines.changed.value; else all = false;
  }
  return { churn, changed, all };
}
