// SPDX-License-Identifier: MIT
import { capture, fail, unwrap } from '../errors.js';
import { contentId, deepFreeze } from '../inert.js';
import { aggregateFiles, readReport, summarizeMeasurements } from '../report.js';
import { evaluatePolicy } from '../policy/evaluate.js';
import type { BandRange } from '../policy/bands.js';
import type { BandResult, Diagnostic, FileRecord, NumericMeasurement, Report, Result } from '../model.js';
import type { PolicyOrigin } from '../policy/types.js';
import type { BrowserPolicy } from './policy.js';

export const HUMAN_REPORT_VIEW_VERSION = 'diffdevil.human-report-view/1';
export interface BandCell {
  readonly id: string;
  readonly label?: string;
  readonly color?: string;
  readonly lower?: number;
  readonly upper?: number;
}
export interface BandView {
  readonly name: string;
  readonly expression: string;
  readonly result: BandResult;
  readonly cells: readonly BandCell[];
  readonly selected?: string;
  readonly mappedLabel?: string;
  readonly managedGroup?: string;
  readonly managedMembers?: readonly string[];
}
export interface HumanReportView {
  readonly kind: typeof HUMAN_REPORT_VIEW_VERSION;
  readonly report: Report;
  readonly path?: string;
  readonly included: boolean;
  readonly changed: NumericMeasurement;
  readonly addedOnly: NumericMeasurement;
  readonly deletedOnly: NumericMeasurement;
  readonly modified: NumericMeasurement;
  readonly raw: Report['totals']['raw'];
  readonly bands: readonly BandView[];
  readonly policy: { readonly id: string; readonly mode: string; readonly layers: readonly string[]; readonly origins: readonly PolicyOrigin[] };
  readonly diagnostics: readonly Diagnostic[];
}

const symbols = { exact: '=', bounded: '≈', unknown: '?', unmeasurable: '∅' } as const;
export function evidenceText(status: NumericMeasurement['status']): string { return `${symbols[status]} ${status}`; }
export function measurementText(value: NumericMeasurement): string {
  const number = (n: number): string => new Intl.NumberFormat('en').format(n);
  switch (value.status) {
    case 'exact': return number(value.value);
    case 'bounded': return `${number(value.lower)}–${number(value.upper)}`;
    case 'unknown': return value.lower === undefined ? '?' : `≥${number(value.lower)}`;
    case 'unmeasurable': return '∅';
  }
}
function fileReport(report: Report, file: FileRecord): Report {
  const fileSet = { complete: true, total: { status: 'exact' as const, value: 1 } };
  const totals = aggregateFiles([file], fileSet);
  return unwrap(readReport({ kind: report.kind, schemaVersion: report.schemaVersion, semantics: report.semantics,
    source: report.source, fileSet, files: [file], totals,
    measurement: summarizeMeasurements([...Object.values(totals.raw), ...Object.values(totals.lines), ...Object.values(totals.files)], file.measurement.reasons) }));
}
function cells(ranges: readonly BandRange[], minimum: number | undefined, labels: Readonly<Record<string, string>>, policy: BrowserPolicy): BandCell[] {
  let lower = minimum;
  return ranges.map(range => {
    const label = labels[range.id];
    const color = label === undefined ? undefined : policy.effective.labelDefinitions?.[label]?.color;
    const cell: BandCell = { id: range.id, ...(label === undefined ? {} : { label }), ...(color === undefined ? {} : { color }),
      ...(lower === undefined ? {} : { lower }), ...(range.lt === undefined ? {} : { upper: range.lt }) };
    lower = range.lt;
    return cell;
  });
}

/** A shared typed human projection. Hosts render DOM/text, never recalculate facts. */
export function buildHumanReportView(input: Report, policy: BrowserPolicy, path?: string): Result<HumanReportView> {
  return capture(() => {
    const report = unwrap(readReport(input));
    const selectedFile = path === undefined ? undefined : report.files.find(file => file.path === path);
    if (path !== undefined && !selectedFile) fail('E_BROWSER_FILE', 'This file is not in the current acquired report.', 'source');
    const base = selectedFile ? fileReport(report, selectedFile) : report;
    const evaluated = unwrap(evaluatePolicy(policy.compiled, base));
    const result = evaluated.report;
    const file = selectedFile ? result.files[0] : undefined;
    const included = file?.included ?? true;
    const bands: BandView[] = [];
    if (included) for (const [name, definition] of Object.entries(policy.effective.bands ?? {})) {
      const decision = result.bands?.[name];
      if (!decision) continue;
      const rule = Object.values(policy.effective.rules ?? {}).find(rule => 'band' in rule && rule.band === name && rule.effects?.labels && 'byBand' in rule.effects.labels);
      const mapping = rule?.effects?.labels && 'byBand' in rule.effects.labels ? rule.effects.labels : undefined;
      const selected = decision.status === 'resolved' ? decision.id : undefined;
      const mappedLabel = selected === undefined ? undefined : mapping?.byBand[selected];
      bands.push({ name, expression: definition.value, result: decision, cells: cells(definition.ranges, definition.minimum, mapping?.byBand ?? {}, policy),
        ...(selected === undefined ? {} : { selected }), ...(mappedLabel === undefined ? {} : { mappedLabel }),
        ...(mapping === undefined ? {} : { managedGroup: mapping.group, managedMembers: policy.effective.labelGroups?.[mapping.group] ?? [] }) });
    }
    const lines = file?.lines ?? result.totals.lines;
    return deepFreeze({ kind: HUMAN_REPORT_VIEW_VERSION, report: result, ...(path === undefined ? {} : { path }), included,
      changed: lines.changed, addedOnly: lines.added, deletedOnly: lines.deleted, modified: lines.modified,
      raw: file?.raw ?? result.totals.raw, bands,
      policy: { id: evaluated.policyId, mode: policy.mode, layers: policy.layers, origins: policy.origins }, diagnostics: [] });
  });
}

/** Raw evidence still has a useful display when policy is invalid; it has no band. */
export function buildUnclassifiedView(input: Report, diagnostics: readonly Diagnostic[], path?: string): Result<HumanReportView> {
  return capture(() => {
    const report = unwrap(readReport(input));
    const file = path === undefined ? undefined : report.files.find(file => file.path === path);
    if (path !== undefined && !file) fail('E_BROWSER_FILE', 'This file is not in the current acquired report.', 'source');
    const lines = file?.lines ?? report.totals.lines;
    return deepFreeze({ kind: HUMAN_REPORT_VIEW_VERSION, report, ...(path === undefined ? {} : { path }), included: file?.included ?? true,
      changed: lines.changed, addedOnly: lines.added, deletedOnly: lines.deleted, modified: lines.modified, raw: file?.raw ?? report.totals.raw,
      bands: [], policy: { id: contentId('invalid-policy', diagnostics), mode: 'invalid', layers: [], origins: [] }, diagnostics });
  });
}
