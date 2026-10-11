// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
import { interval, amount, sum } from './analytical-math.mjs';

/**
 * turnover-v1: the public definition and evidence rules. A file's Changed divided by its time-weighted average
 * size in the period, where the size comes only from observed sizes and recorded continuity. The file rows, the
 * tail observation and the exploration that consume it belong to the premium extension.
 *
 * Each recorded complete final comparison is one atomic default-branch transition. A chain of them from one
 * observed revision to another that never names a path establishes that the path stayed unchanged throughout,
 * including while unrelated pull requests merged. A net comparison of the two endpoints cannot: a change and
 * revert inside the gap leaves the same endpoint tree but a different time-weighted size. Direct pushes,
 * unrecovered or incomplete comparisons, history-off time and expired records leave no link, so continuity
 * across them stays unestablished.
 */
export function fileContinuity(records) {
  const transitions = new Map();
  for (const record of records) {
    const report = record.final?.report;
    if (!report?.fileSet.complete || !record.mergedAt) continue;
    const link = { base: record.final.base, at: Date.parse(record.mergedAt),
      paths: new Set(report.files.flatMap(file => file.oldPath ? [file.path, file.oldPath] : [file.path])) };
    transitions.set(record.final.head, [...(transitions.get(record.final.head) ?? []), link]);
  }
  const chains = new Map();
  // Walk back from the later revision. A transition before the earlier revision's observation cannot follow it;
  // one second absorbs provider timestamp precision, and skipping only ever withholds continuity.
  const chain = (from, to, since) => {
    const stack = [[to, []]], seen = new Set([to]);
    while (stack.length) {
      const [node, links] = stack.pop();
      for (const link of transitions.get(node) ?? []) {
        if (link.at < since - 1000) continue;
        if (link.base === from) return [...links, link];
        if (!seen.has(link.base)) { seen.add(link.base); stack.push([link.base, [...links, link]]); }
      }
    }
    return null;
  };
  return (from, to, since, name) => {
    if (from === null || to === null) return false;
    if (from === to) return true;
    const key = `${from}>${to}>${since}`;
    if (!chains.has(key)) chains.set(key, chain(from, to, since));
    return chains.get(key)?.every(link => !link.paths.has(name)) ?? false;
  };
}

/** turnover-v1 uses observed sizes. Unobserved time and unestablished file continuity widen its denominator. */
export function turnover(contributions, query, observations = [], unchanged) {
  return turnoverEvidence(contributions, query, observations, unchanged).ratio;
}

/**
 * The ratio, plus the open closing tail when the period ends after its latest continuous size observation:
 * the revision, time and size from which a later observation would have to be continuous to close it.
 */
export function turnoverEvidence(contributions, query, observations = [], unchanged = (from, to) => from !== null && from === to) {
  const ordered = contributions.toSorted((a, b) => a.mergedAt.localeCompare(b.mergedAt));
  if (ordered.some(value => ['added', 'deleted'].includes(value.file.changeType))) return { ratio: { status: 'unavailable', reason: 'created-or-deleted-in-period', version: 'turnover-v1' }, tail: null };
  const start = Date.parse(query.from), end = Date.parse(query.to);
  const first = observations.filter(value => value.observedAt <= query.from).toSorted((a, b) => b.observedAt.localeCompare(a.observedAt))[0];
  const last = observations.filter(value => value.observedAt >= query.to).toSorted((a, b) => a.observedAt.localeCompare(b.observedAt))[0];
  let cursor = start, prior = first?.size ?? null, priorRevision = first?.revision ?? null, priorAt = first ? Date.parse(first.observedAt) : null;
  let areaLower = 0, areaUpper = 0, unknown = false, discontinuities = 0;
  for (const contribution of ordered) {
    const at = Date.parse(contribution.mergedAt), before = contribution.size?.before ?? null, after = contribution.size?.after ?? null;
    const continuous = prior !== null && before !== null && prior === before && unchanged(priorRevision, contribution.base, priorAt);
    // The first before-size is observed at the first merge, not at period start.
    if (!continuous && at > cursor) { unknown = true; discontinuities++; }
    if (continuous) { areaLower += prior * (at - cursor); areaUpper += prior * (at - cursor); }
    cursor = at; prior = after; priorRevision = contribution.head; priorAt = at;
  }
  // Close with the earliest observation after the period, else the latest continuous one inside it. Time after
  // the latest continuous observation stays unobserved: direct pushes or unrecovered PRs may have intervened.
  let observedThrough = end, tail = null;
  if (cursor < end) {
    const within = observations.filter(value => Date.parse(value.observedAt) > cursor && value.observedAt < query.to)
      .toSorted((a, b) => b.observedAt.localeCompare(a.observedAt));
    const closing = [last, ...within].find(value => value && prior !== null && value.size === prior && unchanged(priorRevision, value.revision, priorAt));
    const observed = closing ? Math.min(end, Date.parse(closing.observedAt)) : cursor;
    if (closing) { areaLower += prior * (observed - cursor); areaUpper += prior * (observed - cursor); }
    if (observed < end) {
      unknown = true; observedThrough = observed;
      if (prior !== null) tail = closing ? { revision: closing.revision, since: Date.parse(closing.observedAt), size: prior } : { revision: priorRevision, since: priorAt, size: prior };
    }
  }
  const average = amount(areaLower / (end - start), unknown ? null : areaUpper / (end - start));
  const numerator = interval(sum(ordered.map(value => value.file.lines.changed)));
  if (!unknown && average.upper === 0) return { ratio: { status: 'unavailable', reason: 'zero-average-size', version: 'turnover-v1' }, tail: null };
  return { ratio: { ...amount(average.upper === null ? 0 : numerator.lower / average.upper,
    average.lower > 0 && numerator.upper !== null ? numerator.upper / average.lower : null),
    version: 'turnover-v1', averageSize: average, discontinuities, observedThrough: new Date(observedThrough).toISOString(), sizeBasis: 'observed-final-comparisons' }, tail };
}
