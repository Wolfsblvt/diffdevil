// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * The current-change facts the brief may state, read from one evaluated engine report and the effective policy that
 * produced it. Raw churn, replacement-aware Changed, the policy band and provider effects stay separate: this reader
 * carries the first three and nothing about effects, which only the check reports.
 */
import { interval } from './markdown.mjs';

const measured = value => value && (value.status === 'exact' || value.status === 'bounded') ? interval(value) : null;
/** An unknown total may still carry a proven lower bound (“at least 202”); its open upper side stays open. */
const lowerBound = value => value?.status === 'unknown' && Number.isFinite(value.lower) ? { lower: value.lower, upper: Number.isFinite(value.upper) ? value.upper : null } : measured(value);

/** Display name of a band: the managed label's suffix when the policy maps one (`size/M` → `M`), else its ID. */
function bandLabel(document, bandId, id) {
  for (const rule of Object.values(document?.rules ?? {})) {
    const name = rule?.band === bandId ? rule.effects?.labels?.byBand?.[id] : undefined;
    if (typeof name === 'string' && name) return name.slice(name.lastIndexOf('/') + 1);
  }
  return id;
}

/** The ordered ranges of one band as `{ id, label, lower, upper }`, upper exclusive; the last range is open. */
export function bandRanges(document, bandId = 'size') {
  const band = document?.bands?.[bandId];
  if (!band || !Array.isArray(band.ranges)) return [];
  let lower = Number.isFinite(band.minimum) ? band.minimum : null;
  return band.ranges.map(range => {
    const row = { id: range.id, label: bandLabel(document, bandId, range.id), lower, upper: Number.isFinite(range.lt) ? range.lt : null };
    lower = row.upper;
    return row;
  });
}

/** Measures whose value the brief can name in reader terms; any other basis is named by its policy metric. */
const NAMED_MEASURES = Object.freeze({ 'lines.changed': 'changed', 'raw.churn': 'raw-churn' });

/**
 * What a band's thresholds are measured in. `size@1` bands Changed; a portable policy may band raw churn or its own
 * metric, and the brief must not explain those thresholds as Changed. A scoped or formula metric is named, not
 * translated: `{ kind: 'metric', metric }`.
 */
export function bandBasis(document, bandId = 'size') {
  const value = document?.bands?.[bandId]?.value;
  if (typeof value !== 'string') return { kind: 'unknown' };
  const direct = NAMED_MEASURES[value.trim()];
  if (direct) return { kind: direct };
  const metricId = /^metrics\.([A-Za-z_][A-Za-z0-9_-]*)$/u.exec(value.trim())?.[1];
  if (!metricId) return { kind: 'expression' };
  const metric = document?.metrics?.[metricId];
  const measured = metric && typeof metric.measure === 'string' && metric.scope === undefined ? NAMED_MEASURES[metric.measure] : undefined;
  return measured ? { kind: measured, metric: metricId } : { kind: 'metric', metric: metricId };
}

/**
 * Read the brief's current facts. `policyName` names the attributable policy (`size@1` when the band comes from the
 * preset unchanged); `observedAt` is retained only for preview copy, never printed into a live body.
 */
export function currentFacts(report, { policyDocument, policyName = null, bandId = 'size' } = {}) {
  const source = report?.source ?? {};
  const files = Array.isArray(report?.files) ? report.files : [];
  const fileSetKnown = report?.fileSet?.complete === true;
  const population = fileSetKnown ? 'complete' : files.length ? 'incomplete' : 'unavailable';
  const included = files.filter(file => file.included).map(file => ({
    path: file.path, changeType: file.changeType,
    changed: measured(file.lines?.changed),
    composition: ['modified', 'added', 'deleted'].every(key => file.lines?.[key]?.status === 'exact')
      ? { modified: file.lines.modified.value, addedOnly: file.lines.added.value, deletedOnly: file.lines.deleted.value } : null,
    raw: { added: measured(file.raw?.added), deleted: measured(file.raw?.deleted) }
  }));
  const excluded = files.filter(file => !file.included).map(file => file.path);
  const totals = report?.totals ?? {};
  const composition = ['modified', 'added', 'deleted'].every(key => totals.lines?.[key]?.status === 'exact')
    ? { modified: totals.lines.modified.value, addedOnly: totals.lines.added.value, deletedOnly: totals.lines.deleted.value } : null;
  const band = report?.bands?.[bandId];
  const ranges = bandRanges(policyDocument, bandId);
  // The provider's own changed-file count, when observed, so an incomplete list can say how much of it was returned.
  const total = report?.fileSet?.total;
  const providerTotal = total?.status === 'exact' && Number.isSafeInteger(total.value) ? total.value : null;
  return {
    comparison: { base: source.base ?? null, head: source.head ?? null, id: source.comparisonId ?? null },
    population,
    listed: { files: files.length, total: providerTotal },
    files: included,
    excluded,
    totals: {
      changed: lowerBound(totals.lines?.changed),
      composition,
      raw: { added: lowerBound(totals.raw?.added), deleted: lowerBound(totals.raw?.deleted), churn: lowerBound(totals.raw?.churn) }
    },
    band: band?.status === 'resolved' ? { status: 'resolved', id: band.id, label: bandLabel(policyDocument, bandId, band.id) }
      : { status: 'unknown', candidates: Array.isArray(band?.candidates) ? band.candidates : [] },
    policy: { name: policyName, ranges, basis: bandBasis(policyDocument, bandId) }
  };
}
