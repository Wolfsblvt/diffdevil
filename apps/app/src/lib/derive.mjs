// SPDX-License-Identifier: AGPL-3.0-only
/**
 * The App's measurement model: retained analyses become per-pull-request facts, named
 * populations, buckets and interval-aware statistics. Four facts stay separate throughout:
 * what was measured (Changed, raw churn, evidence), what policy judged (band), what the App
 * wanted (desired labels) and what GitHub shows (observed effects). Lifecycle facts (opened,
 * merged, closed) come from a separate source and may be unavailable; nothing here invents
 * them from analysis times.
 */
import { bound, exact, sumBounds, intervalMedian, unknown } from './intervals.mjs';

export const DAY = 86_400_000;
export const WEEK = 7 * DAY;

/** The size-v1 label vocabulary: the shipped preset's bands and GitHub label colours. */
export const BANDS = Object.freeze([
  { id: 'xs', label: 'size/XS', short: 'XS', color: '#C2E0C6', lt: 20 },
  { id: 's', label: 'size/S', short: 'S', color: '#BFDADC', lt: 100 },
  { id: 'm', label: 'size/M', short: 'M', color: '#C5DEF5', lt: 500 },
  { id: 'l', label: 'size/L', short: 'L', color: '#D4C5F9', lt: 1000 },
  { id: 'xl', label: 'size/XL', short: 'XL', color: '#DCC6E0', lt: Infinity }
]);
export const UNKNOWN_BAND = Object.freeze({ id: 'unknown', label: 'size/Unknown', short: 'Unknown', color: '#D1D5DB' });
export const bandById = id => BANDS.find(band => band.id === id);
const bandOfValue = value => BANDS.find(band => value < band.lt);

function resultSet(record) {
  return Array.isArray(record.results) ? { metrics: record.results, scopes: [], bands: [], rules: [] } : (record.results ?? {});
}

/**
 * The band a recorded analysis carries. Newer analyses record the resolved band; older ones
 * recorded only metrics, so their band is derived from exact Changed with the size-v1
 * thresholds and marked as derived. A bounded Changed whose range crosses a threshold is Unknown.
 */
export function bandOf(record, changed) {
  const results = resultSet(record);
  const recorded = results.bands?.find(band => band.ref === 'size') ?? results.bands?.[0];
  if (recorded) {
    if (recorded.status === 'resolved' && bandById(recorded.id)) return { ...bandById(recorded.id), standing: 'recorded' };
    return { ...UNKNOWN_BAND, standing: 'recorded' };
  }
  const rule = results.rules?.find(entry => entry.band);
  if (rule?.band && bandById(rule.band)) return { ...bandById(rule.band), standing: 'recorded' };
  if (changed.status === 'exact') return { ...bandOfValue(changed.lower), standing: 'derived' };
  if (changed.status === 'bounded' && changed.upper !== null && bandOfValue(changed.lower) === bandOfValue(changed.upper)) return { ...bandOfValue(changed.lower), standing: 'derived' };
  return { ...UNKNOWN_BAND, standing: changed.status === 'unknown' ? 'unknown' : 'derived' };
}

/** What the retained label effects say GitHub shows for this analysis. */
export function labelLane(effects) {
  const labels = effects.filter(effect => typeof effect.kind === 'string' && effect.kind.startsWith('label.') && !effect.kind.endsWith('-definition'));
  if (labels.length === 0) return { standing: 'none', adds: 0, removes: 0, detail: 'no label effect recorded' };
  const adds = labels.filter(effect => effect.kind === 'label.add').length, removes = labels.filter(effect => effect.kind === 'label.remove').length;
  if (labels.every(effect => effect.readback === 'verified')) return { standing: 'observed', adds, removes, detail: labels.every(effect => effect.outcome === 'unchanged') ? 'already present on GitHub' : 'written and read back' };
  if (labels.some(effect => effect.request === 'rejected')) return { standing: 'refused', adds, removes, detail: 'GitHub refused a label write' };
  return { standing: 'unverified', adds, removes, detail: 'written, read-back not verified' };
}

function measurementBounds(record) {
  const totals = record.projection?.totals ?? {};
  return {
    changed: bound(totals.lines?.changed), raw: bound(totals.raw?.churn),
    added: bound(totals.lines?.added), deleted: bound(totals.lines?.deleted), modified: bound(totals.lines?.modified),
    rawAdded: bound(totals.raw?.added), rawDeleted: bound(totals.raw?.deleted)
  };
}

/** One retained analysis as the facts a view needs. */
export function analysisFacts(record) {
  const measures = measurementBounds(record);
  const fileSet = record.fileSet ?? {};
  return {
    comparisonId: record.comparisonId, policyId: record.policyId, base: record.base, head: record.head, observedAt: record.observedAt,
    schemaVersion: record.schemaVersion, evidence: record.projection?.evidence ?? 'unknown',
    ...measures,
    files: { complete: fileSet.complete === true, total: bound(fileSet.total), included: bound(fileSet.included), excluded: bound(fileSet.excluded), observed: bound(fileSet.observed) },
    band: bandOf(record, measures.changed), labels: labelLane(record.effects ?? []), gaps: record.gaps ?? [],
    fileRows: record.files ?? [], effects: record.effects ?? []
  };
}

/** Group analyses into pull requests: revisions oldest first, the latest analysis as the current fact. */
export function groupPullRequests(records) {
  const groups = new Map();
  for (const record of records) {
    const key = `${record.repositoryId}#${record.pullRequest}`;
    if (!groups.has(key)) groups.set(key, { key, repositoryId: record.repositoryId, number: record.pullRequest, records: [] });
    groups.get(key).records.push(record);
  }
  for (const group of groups.values()) {
    group.records.sort((a, b) => a.observedAt.localeCompare(b.observedAt) || a.id - b.id);
    const revisions = [];
    for (const record of group.records) {
      const facts = analysisFacts(record);
      const previous = revisions.at(-1);
      if (previous && previous.comparisonId === facts.comparisonId) revisions[revisions.length - 1] = facts;
      else revisions.push(facts);
    }
    group.revisions = revisions;
    group.latest = revisions.at(-1);
    group.first = revisions[0];
    group.heads = new Set(revisions.map(revision => revision.head ?? revision.comparisonId)).size;
    group.observedAt = group.latest.observedAt;
    group.state = 'unknown';
    group.lifecycle = undefined;
  }
  return groups;
}

/** Join provider lifecycle facts (title, state, times) onto analysed pull requests when a source supplied them. */
export function attachLifecycle(pullRequests, lifecycleByRepository) {
  for (const pr of pullRequests.values()) {
    const source = lifecycleByRepository.get(pr.repositoryId);
    const pull = source?.pullRequests?.get(pr.number);
    if (!pull) continue;
    pr.lifecycle = pull;
    pr.state = pull.state;
    pr.title = pull.title;
    pr.finalHeadAnalysed = typeof pull.headSha === 'string' && pr.latest.head === pull.headSha;
  }
  return pullRequests;
}

/** Elapsed days between two ISO times, or null when one is missing. */
export function elapsedDays(from, to) {
  if (!from || !to) return null;
  const ms = Date.parse(to) - Date.parse(from);
  return Number.isFinite(ms) && ms >= 0 ? ms / DAY : null;
}

const within = (iso, from, to) => typeof iso === 'string' && iso >= from && iso < to;

/**
 * Population statistics for one window. Measurement populations use analysed pull requests;
 * lifecycle populations use the lifecycle source (when available) over the same repositories.
 */
export function periodStats({ pullRequests, lifecycle, from, to }) {
  const prs = [...pullRequests.values()];
  const analysed = prs.filter(pr => within(pr.observedAt, from, to));
  const changed = analysed.map(pr => pr.latest.changed), raw = analysed.map(pr => pr.latest.raw);
  const exactPrs = analysed.filter(pr => pr.latest.changed.status === 'exact');
  const decomposition = {
    added: sumBounds(exactPrs.map(pr => pr.latest.added)), deleted: sumBounds(exactPrs.map(pr => pr.latest.deleted)), modified: sumBounds(exactPrs.map(pr => pr.latest.modified)),
    boundedLow: analysed.filter(pr => pr.latest.changed.status !== 'exact').reduce((total, pr) => total + (pr.latest.changed.lower ?? 0), 0),
    boundedHigh: analysed.filter(pr => pr.latest.changed.status !== 'exact').every(pr => pr.latest.changed.upper !== null) ? analysed.filter(pr => pr.latest.changed.status !== 'exact').reduce((total, pr) => total + pr.latest.changed.upper, 0) : null,
    boundedCount: analysed.filter(pr => pr.latest.changed.status !== 'exact').length
  };
  const evidence = { exact: exactPrs.length, bounded: analysed.filter(pr => pr.latest.evidence === 'bounded').length, unknown: analysed.filter(pr => pr.latest.evidence === 'unknown').length };
  const stats = {
    from, to, analysed, analysedCount: analysed.length,
    revisions: analysed.reduce((total, pr) => total + pr.revisions.filter(revision => within(revision.observedAt, from, to)).length, 0),
    heads: intervalMedian(analysed.map(pr => exact(pr.heads))),
    medianChanged: intervalMedian(changed), medianRaw: intervalMedian(raw),
    medianFiles: intervalMedian(analysed.map(pr => pr.latest.files.included.status === 'unknown' ? pr.latest.files.total : pr.latest.files.included)),
    changedTotal: sumBounds(changed), rawTotal: sumBounds(raw), decomposition, evidence,
    labels: { observed: analysed.filter(pr => pr.latest.labels.standing === 'observed').length, unverified: analysed.filter(pr => pr.latest.labels.standing === 'unverified').length, none: analysed.filter(pr => pr.latest.labels.standing === 'none').length },
    lifecycle: { standing: lifecycle?.standing ?? 'unavailable', reason: lifecycle?.reason }
  };
  if (lifecycle?.standing === 'available') {
    const pulls = lifecycle.all;
    const opened = pulls.filter(pull => within(pull.openedAt, from, to));
    const merged = pulls.filter(pull => within(pull.mergedAt, from, to));
    const closed = pulls.filter(pull => pull.state === 'closed' && within(pull.closedAt, from, to));
    const analysedByKey = new Map(prs.map(pr => [`${pr.repositoryId}#${pr.number}`, pr]));
    const mergedAnalysed = merged.map(pull => analysedByKey.get(`${pull.repositoryId}#${pull.number}`)).filter(Boolean);
    const ttm = merged.map(pull => elapsedDays(pull.openedAt, pull.mergedAt)).filter(value => value !== null);
    Object.assign(stats, {
      opened: opened.length, merged: merged.length, closedUnmerged: closed.length, backlog: opened.length - merged.length - closed.length,
      openNow: pulls.filter(pull => pull.state === 'open').length, draftNow: pulls.filter(pull => pull.state === 'draft').length,
      mergedRecovered: mergedAnalysed.length, mergedFinalHead: mergedAnalysed.filter(pr => pr.finalHeadAnalysed).length,
      timeToMerge: ttm.length ? intervalMedian(ttm.map(exact)) : intervalMedian([]),
      timeToMergeByBand: BANDS.map(band => { const sample = mergedAnalysed.filter(pr => pr.latest.band.id === band.id).map(pr => elapsedDays(pr.lifecycle.openedAt, pr.lifecycle.mergedAt)).filter(value => value !== null); return { band, sample: sample.length, median: intervalMedian(sample.map(exact)) }; }).filter(row => row.sample),
      mergedPullRequests: merged, listingComplete: lifecycle.complete
    });
  }
  return stats;
}

/** Size mix over a population of analysed pull requests; Unknown and derived standings stay visible. */
export function sizeMix(prs) {
  const rows = BANDS.map(band => {
    const members = prs.filter(pr => pr.latest.band.id === band.id);
    return { band, count: members.length, median: intervalMedian(members.map(pr => pr.latest.changed)), derived: members.filter(pr => pr.latest.band.standing === 'derived').length };
  });
  const unknownMembers = prs.filter(pr => pr.latest.band.id === 'unknown');
  const known = prs.length - unknownMembers.length;
  return { rows, known, unknown: unknownMembers.length, derived: prs.filter(pr => pr.latest.band.standing === 'derived').length, total: prs.length,
    most: rows.slice().sort((a, b) => b.count - a.count)[0], smallShare: known ? Math.round(((rows[0].count + rows[1].count) / known) * 100) : null };
}

const startOfDay = ms => { const date = new Date(ms); return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()); };
const startOfWeek = ms => { const day = startOfDay(ms); const weekday = (new Date(day).getUTCDay() + 6) % 7; return day - weekday * DAY; };
const startOfMonth = ms => { const date = new Date(ms); return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1); };
const addMonths = (ms, count) => { const date = new Date(ms); return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + count, 1); };

/** Calendar-aligned buckets for the selected period: days, two-day blocks, weeks (Monday) or months. */
export function bucketsFor(periodKey, nowIso, firstObservedIso) {
  const now = Date.parse(nowIso);
  const make = (starts, unit, size) => starts.map((start, index) => ({ index, start: new Date(start).toISOString(), end: new Date(Math.min(starts[index + 1] ?? size(start), now + 1)).toISOString(), unit }));
  if (periodKey === '7d') return { unit: 'day', list: make(Array.from({ length: 7 }, (_, index) => startOfDay(now) - (6 - index) * DAY), 'day', start => start + DAY) };
  if (periodKey === '90d') return { unit: 'week', list: make(Array.from({ length: 13 }, (_, index) => startOfWeek(now) - (12 - index) * WEEK), 'week', start => start + WEEK) };
  if (periodKey === '1y') {
    const starts = Array.from({ length: 12 }, (_, index) => addMonths(startOfMonth(now), index - 11));
    const firstMonth = firstObservedIso ? startOfMonth(Date.parse(firstObservedIso)) : null;
    const kept = firstMonth === null ? starts : starts.filter(start => addMonths(start, 1) > firstMonth);
    return { unit: 'month', list: make(kept.length ? kept : starts.slice(-1), 'month', start => addMonths(start, 1)), note: firstObservedIso && kept.length < 12 ? 'History begins later than a year ago; earlier months are not shown as zero.' : undefined };
  }
  return { unit: '2 days', list: make(Array.from({ length: 15 }, (_, index) => startOfDay(now) - (29 - 2 * index) * DAY), '2 days', start => start + 2 * DAY) };
}

/**
 * Change volume per bucket. With lifecycle available, the population is merged pull
 * requests by merge time and each carries its latest retained analysis (the final analysed
 * head when it matches the merged head); without lifecycle, it is analysed pull requests by
 * their latest analysis time. The basis travels with the result.
 */
export function changeVolume({ buckets, pullRequests, lifecycle }) {
  const prs = [...pullRequests.values()];
  const basis = lifecycle?.standing === 'available' ? 'merged' : 'analysed';
  const members = basis === 'merged'
    ? lifecycle.all.filter(pull => pull.mergedAt).map(pull => ({ at: pull.mergedAt, pull, pr: prs.find(pr => pr.repositoryId === pull.repositoryId && pr.number === pull.number) }))
    : prs.map(pr => ({ at: pr.observedAt, pr }));
  const list = buckets.map(bucket => {
    const inside = members.filter(member => within(member.at, bucket.start, bucket.end));
    const recovered = inside.filter(member => member.pr);
    const exactOnes = recovered.filter(member => member.pr.latest.changed.status === 'exact');
    const boundedOnes = recovered.filter(member => member.pr.latest.changed.status !== 'exact');
    const sum = (list, key) => list.reduce((total, member) => total + (member.pr.latest[key].lower ?? 0), 0);
    return {
      ...bucket, count: inside.length, recovered: recovered.length, coverage: inside.length > recovered.length ? 'partial' : 'complete',
      added: sum(exactOnes, 'added'), deleted: sum(exactOnes, 'deleted'), modified: sum(exactOnes, 'modified'),
      boundedLow: sum(boundedOnes, 'changed'), boundedHigh: boundedOnes.every(member => member.pr.latest.changed.upper !== null) ? boundedOnes.reduce((total, member) => total + member.pr.latest.changed.upper, 0) : null, boundedCount: boundedOnes.length,
      rawChurn: recovered.reduce((total, member) => total + (member.pr.latest.raw.lower ?? 0), 0),
      members: inside.map(member => member.pr ?? { number: member.pull.number, repositoryId: member.pull.repositoryId, lifecycle: member.pull, state: member.pull.state, title: member.pull.title, unrecovered: true })
    };
  });
  const totals = { count: list.reduce((n, bucket) => n + bucket.count, 0), recovered: list.reduce((n, bucket) => n + bucket.recovered, 0), partial: list.filter(bucket => bucket.coverage === 'partial').length,
    added: list.reduce((n, bucket) => n + bucket.added, 0), deleted: list.reduce((n, bucket) => n + bucket.deleted, 0), modified: list.reduce((n, bucket) => n + bucket.modified, 0),
    boundedLow: list.reduce((n, bucket) => n + bucket.boundedLow, 0), boundedHigh: list.every(bucket => bucket.boundedHigh !== null) ? list.reduce((n, bucket) => n + bucket.boundedHigh, 0) : null, boundedCount: list.reduce((n, bucket) => n + bucket.boundedCount, 0),
    rawChurn: list.reduce((n, bucket) => n + bucket.rawChurn, 0) };
  return { basis, list, totals };
}

/** Weekly flow over a 13-week context: opened, merged and closed unmerged (lifecycle) plus analysed pull requests. */
export function weeklyFlow({ pullRequests, lifecycle, nowIso }) {
  const { list } = bucketsFor('90d', nowIso);
  const prs = [...pullRequests.values()];
  const pulls = lifecycle?.standing === 'available' ? lifecycle.all : [];
  return list.map(bucket => ({
    ...bucket,
    analysed: prs.filter(pr => within(pr.observedAt, bucket.start, bucket.end)).length,
    opened: pulls.filter(pull => within(pull.openedAt, bucket.start, bucket.end)).length,
    merged: pulls.filter(pull => within(pull.mergedAt, bucket.start, bucket.end)).length,
    closed: pulls.filter(pull => pull.state === 'closed' && within(pull.closedAt, bucket.start, bucket.end)).length,
    openAtEnd: pulls.filter(pull => pull.openedAt < bucket.end && !(pull.mergedAt && pull.mergedAt < bucket.end) && !(pull.closedAt && pull.closedAt < bucket.end)).length
  }));
}

/** Analysed heads per pull request: how many distinct heads reached an analysis, and the first-to-latest growth. */
export function headsPerPullRequest(prs) {
  const counts = [1, 2, 3, 4].map(n => prs.filter(pr => n === 4 ? pr.heads >= 4 : pr.heads === n).length);
  const multi = prs.filter(pr => pr.heads > 1 && pr.first.changed.status === 'exact' && pr.latest.changed.status === 'exact');
  const growth = multi.map(pr => pr.latest.changed.lower - pr.first.changed.lower);
  const growthPct = multi.filter(pr => pr.first.changed.lower > 0).map(pr => ((pr.latest.changed.lower - pr.first.changed.lower) / pr.first.changed.lower) * 100);
  return { counts, total: prs.length, multi: multi.length, medianHeads: intervalMedian(prs.map(pr => exact(pr.heads))),
    medianGrowth: intervalMedian(growth.map(exact)), medianGrowthPct: intervalMedian(growthPct.map(exact)) };
}

/** Development of one pull request across its analysed heads, with the derived band at each head. */
export function development(pr) {
  return pr.revisions.map((revision, index) => ({ index, head: revision.head, observedAt: revision.observedAt, changed: revision.changed, band: revision.band, evidence: revision.evidence }));
}

/** Label transition between the previous and latest analysed heads, when both recorded a band. */
export function lastTransition(pr) {
  for (let index = pr.revisions.length - 1; index > 0; index--) {
    const current = pr.revisions[index], previous = pr.revisions[index - 1];
    if (current.band.id !== previous.band.id) return { from: previous.band, to: current.band, head: index + 1, at: current.observedAt };
  }
  return undefined;
}

export { bound, exact, unknown, sumBounds, intervalMedian };
