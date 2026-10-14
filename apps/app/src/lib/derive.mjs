// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * The App's measurement model over the backend contract. Pull requests arrive as the
 * analytical service's rows (retained lifecycle, one final merged comparison per merged PR,
 * current-policy interpretation) and, for repositories whose named history is not retained
 * yet, as the older pathless analyses by analysis time. Both become one record shape here,
 * with the basis named on every population, so a page never mixes the two silently. Four
 * facts stay separate throughout: what was measured (Changed, raw churn, evidence), what
 * policy judged (band), what the App wanted (desired label) and what GitHub shows (observed
 * label). Nothing here invents a lifecycle from an analysis time.
 */
import { bound, exact, sumBounds, intervalMedian, unknown } from './intervals.mjs';
import { median as contractMedian } from '../../../github-app/analytical-data.mjs';

export const DAY = 86_400_000;
export const WEEK = 7 * DAY;

import { BANDS, UNKNOWN_BAND, bandById } from './bands.mjs';
export { BANDS, UNKNOWN_BAND, bandById };
const bandOfValue = value => BANDS.find(band => value < band.lt);

function resultSet(record) {
  return Array.isArray(record.results) ? { metrics: record.results, scopes: [], bands: [], rules: [] } : (record.results ?? {});
}

/**
 * The band a pathless analysis carries. Newer analyses record the resolved band; older ones
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

/** The band the current policy judged for a retained row: judged now, not recorded then. */
export function currentBand(judged) {
  if (judged?.status === 'resolved' && bandById(judged.id)) return { ...bandById(judged.id), standing: 'current' };
  if (judged?.status) return { ...UNKNOWN_BAND, standing: 'current' };
  return { ...UNKNOWN_BAND, standing: 'unknown' };
}

/** What the retained label effects say GitHub shows for a pathless analysis. */
export function labelLane(effects) {
  const labels = effects.filter(effect => typeof effect.kind === 'string' && effect.kind.startsWith('label.') && !effect.kind.endsWith('-definition'));
  if (labels.length === 0) return { standing: 'none', adds: 0, removes: 0, detail: 'no label effect recorded' };
  const adds = labels.filter(effect => effect.kind === 'label.add').length, removes = labels.filter(effect => effect.kind === 'label.remove').length;
  if (labels.every(effect => effect.readback === 'verified')) return { standing: 'observed', adds, removes, detail: labels.every(effect => effect.outcome === 'unchanged') ? 'already present on GitHub' : 'written and read back' };
  if (labels.some(effect => effect.request === 'rejected')) return { standing: 'refused', adds, removes, detail: 'GitHub refused a label write' };
  return { standing: 'unverified', adds, removes, detail: 'written, read-back not verified' };
}

/** Desired versus observed label on a retained row: the App's intent and GitHub's state stay distinct. */
export function retainedLabelLane(row) {
  const desired = row.desiredLabel ?? null, observed = row.observedLabel ?? null;
  if (observed && desired && observed === desired) return { standing: 'observed', adds: 1, removes: 0, detail: 'observed on GitHub at the analysed head', desired, observed };
  if (observed) return { standing: 'differs', adds: 0, removes: 0, detail: `GitHub shows ${observed}`, desired, observed };
  if (desired) return { standing: 'unverified', adds: 1, removes: 0, detail: 'desired label; observed state not retained for this head', desired, observed };
  return { standing: 'none', adds: 0, removes: 0, detail: 'no label effect retained', desired, observed };
}

function measurementBounds(record) {
  const totals = record.projection?.totals ?? {};
  return {
    changed: bound(totals.lines?.changed), raw: bound(totals.raw?.churn),
    added: bound(totals.lines?.added), deleted: bound(totals.lines?.deleted), modified: bound(totals.lines?.modified),
    rawAdded: bound(totals.raw?.added), rawDeleted: bound(totals.raw?.deleted)
  };
}

/** One pathless analysis as the facts a view needs. */
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

/** Group pathless analyses into pull requests: revisions oldest first, the latest analysis as the current fact. */
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
    group.basis = 'pathless';
    group.revisions = revisions;
    group.latest = revisions.at(-1);
    group.first = revisions[0];
    group.heads = new Set(revisions.map(revision => revision.head ?? revision.comparisonId)).size;
    group.observedAt = group.latest.observedAt;
    group.state = 'unknown';
    group.lifecycle = undefined;
    group.unrecovered = false;
  }
  return groups;
}

const amount = value => (value && typeof value === 'object' ? { status: value.status === 'unavailable' ? 'unknown' : value.status, lower: value.lower ?? 0, upper: value.upper ?? null } : unknown());

/** One analytical service row as the record shape every page consumes. */
export function fromRetained(row, { first } = {}) {
  const changed = amount(row.changed), raw = amount(row.rawChurn);
  const composition = row.composition ?? {};
  const latest = {
    changed, raw, added: amount(composition.addedOnly), deleted: amount(composition.deletedOnly), modified: amount(composition.modified),
    rawAdded: amount(composition.rawAdded), rawDeleted: amount(composition.rawDeleted),
    band: currentBand(row.band), labels: retainedLabelLane(row), evidence: changed.status === 'exact' ? 'exact' : changed.upper === null ? 'unknown' : 'bounded',
    files: { complete: row.measurement?.files?.complete === true, total: amount(row.measurement?.files?.total), included: unknown(), excluded: unknown(), observed: exact(row.measurement?.files?.observed ?? 0) },
    head: row.measurement?.head ?? null, base: row.measurement?.base ?? null, observedAt: row.measurement?.observedAt ?? row.updatedAt, policyId: row.policy?.id ?? null, comparisonId: row.measurement?.head ?? null
  };
  return {
    key: `${row.repositoryId}#${row.pullRequest}`, repositoryId: row.repositoryId, number: row.pullRequest, basis: 'retained',
    state: row.state, lifecycle: { openedAt: row.openedAt, readyAt: row.readyAt, mergedAt: row.mergedAt, closedAt: row.closedAt, updatedAt: row.updatedAt, state: row.state },
    observedAt: latest.observedAt, heads: row.analyzedHeads ?? 0, unrecovered: row.measurement?.standing !== 'recovered',
    latest, first: first ? { changed: amount(first) } : undefined, revisions: [], measurement: row.measurement, freshness: row.freshness, policy: row.policy, original: row.original ?? null
  };
}

/** Join provider display context (title, URL) onto records when the signed-in person's own read supplied it. */
export function attachTitles(pullRequests, titlesByRepository) {
  for (const pr of pullRequests.values()) {
    const source = titlesByRepository.get(pr.repositoryId);
    const pull = source?.get(pr.number);
    if (!pull) continue;
    pr.title = pull.title;
    pr.url = pull.url;
    pr.currentHead = pull.headSha;
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
/** The median a population's tiles use: the service's envelope on the retained basis, nearest-rank intervals otherwise. */
export const medianFor = basis => (basis === 'retained' ? values => { const result = contractMedian(values); return { status: result.status === 'unavailable' ? 'empty' : result.status === 'unknown' ? 'open' : result.status, lower: result.lower, upper: result.upper, sample: result.samples }; } : intervalMedian);

/**
 * Population statistics for one window. On the retained basis the measurement population is
 * merged pull requests in the window with a recovered final comparison, lifecycle counts come
 * from retained lifecycle facts, and a window that begins before the first retained
 * observation is marked partial so comparisons across it are withheld. On the pathless basis
 * the population is analysed pull requests by their latest analysis time.
 */
export function periodStats({ pullRequests, lifecycle, from, to }) {
  const prs = [...pullRequests.values()];
  const retained = lifecycle?.standing === 'available';
  const med = medianFor(retained ? 'retained' : 'pathless');
  const merged = retained ? prs.filter(pr => pr.lifecycle && within(pr.lifecycle.mergedAt, from, to)) : [];
  const analysed = retained ? merged.filter(pr => !pr.unrecovered) : prs.filter(pr => within(pr.observedAt, from, to));
  const population = retained ? merged : analysed;
  const changed = population.map(pr => pr.unrecovered ? unknown() : pr.latest.changed), raw = population.map(pr => pr.unrecovered ? unknown() : pr.latest.raw);
  const exactPrs = analysed.filter(pr => pr.latest.changed.status === 'exact');
  const boundedPrs = analysed.filter(pr => pr.latest.changed.status !== 'exact');
  const decomposition = {
    added: sumBounds(population.map(pr => pr.unrecovered ? unknown() : pr.latest.added)), deleted: sumBounds(population.map(pr => pr.unrecovered ? unknown() : pr.latest.deleted)), modified: sumBounds(population.map(pr => pr.unrecovered ? unknown() : pr.latest.modified)),
    boundedLow: boundedPrs.reduce((total, pr) => total + (pr.latest.changed.lower ?? 0), 0),
    boundedHigh: boundedPrs.every(pr => pr.latest.changed.upper !== null) ? boundedPrs.reduce((total, pr) => total + pr.latest.changed.upper, 0) : null,
    boundedCount: boundedPrs.length
  };
  const evidence = { exact: exactPrs.length, bounded: analysed.filter(pr => pr.latest.evidence === 'bounded').length, unknown: analysed.filter(pr => pr.latest.evidence === 'unknown').length };
  const stats = {
    from, to, basis: retained ? 'retained' : 'pathless', analysed, analysedCount: analysed.length,
    revisions: analysed.reduce((total, pr) => total + (pr.revisions ?? []).filter(revision => within(revision.observedAt, from, to)).length, 0),
    heads: med(analysed.map(pr => exact(pr.heads))),
    medianChanged: med(changed), medianRaw: med(raw),
    medianFiles: med(analysed.map(pr => pr.latest.files.included.status !== 'unknown' ? pr.latest.files.included : pr.latest.files.total)),
    changedTotal: sumBounds(changed), rawTotal: sumBounds(raw), decomposition, evidence,
    labels: { observed: analysed.filter(pr => pr.latest.labels.standing === 'observed').length, unverified: analysed.filter(pr => pr.latest.labels.standing === 'unverified').length, none: analysed.filter(pr => pr.latest.labels.standing === 'none').length },
    lifecycle: { standing: lifecycle?.standing ?? 'unavailable', reason: lifecycle?.reason },
    windowCovered: !retained || !lifecycle.coverageFrom || from >= lifecycle.coverageFrom
  };
  if (retained) {
    const pulls = prs.filter(pr => pr.lifecycle);
    const opened = pulls.filter(pr => within(pr.lifecycle.openedAt, from, to));
    const closed = pulls.filter(pr => pr.state === 'closed' && within(pr.lifecycle.closedAt, from, to));
    const ttm = merged.map(pr => elapsedDays(pr.lifecycle.openedAt, pr.lifecycle.mergedAt)).filter(value => value !== null);
    Object.assign(stats, {
      opened: opened.length, merged: merged.length, closedUnmerged: closed.length, backlog: opened.length - merged.length - closed.length,
      openNow: pulls.filter(pr => pr.state === 'open').length, draftNow: pulls.filter(pr => pr.state === 'draft').length,
      mergedRecovered: analysed.length, mergedFinalHead: analysed.filter(pr => pr.measurement?.basis === 'final-merged-comparison').length,
      timeToMerge: med(ttm.map(exact)),
      timeToMergeByBand: BANDS.map(band => { const sample = analysed.filter(pr => pr.latest.band.id === band.id).map(pr => elapsedDays(pr.lifecycle.openedAt, pr.lifecycle.mergedAt)).filter(value => value !== null); return { band, sample: sample.length, median: med(sample.map(exact)) }; }).filter(row => row.sample),
      mergedPullRequests: merged
    });
  }
  return stats;
}

/** Size mix over a population; Unknown and derived standings stay visible. */
export function sizeMix(prs, basis = 'retained') {
  const med = medianFor(basis);
  const rows = BANDS.map(band => {
    const members = prs.filter(pr => pr.latest.band.id === band.id);
    return { band, count: members.length, median: med(members.map(pr => pr.latest.changed)), derived: members.filter(pr => pr.latest.band.standing === 'derived').length };
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
 * Change volume per bucket. On the retained basis the population is merged pull requests by
 * merge time, each carrying its final merged comparison under current policy (an unrecovered
 * final leaves the bucket partial); on the pathless basis it is analysed pull requests by
 * their latest analysis time. The basis travels with the result.
 */
export function changeVolume({ buckets, pullRequests, lifecycle }) {
  const prs = [...pullRequests.values()];
  const basis = lifecycle?.standing === 'available' ? 'merged' : 'analysed';
  const members = basis === 'merged'
    ? prs.filter(pr => pr.lifecycle?.mergedAt).map(pr => ({ at: pr.lifecycle.mergedAt, pr, recovered: !pr.unrecovered }))
    : prs.map(pr => ({ at: pr.observedAt, pr, recovered: true }));
  const list = buckets.map(bucket => {
    const inside = members.filter(member => within(member.at, bucket.start, bucket.end));
    const recovered = inside.filter(member => member.recovered);
    const exactOnes = recovered.filter(member => member.pr.latest.changed.status === 'exact');
    const boundedOnes = recovered.filter(member => member.pr.latest.changed.status !== 'exact');
    const sum = (list, key) => list.reduce((total, member) => total + (member.pr.latest[key].lower ?? 0), 0);
    return {
      ...bucket, covered: !lifecycle?.coverageFrom || bucket.start >= lifecycle.coverageFrom, count: inside.length, recovered: recovered.length, coverage: inside.length > recovered.length ? 'partial' : 'complete',
      added: sum(exactOnes, 'added'), deleted: sum(exactOnes, 'deleted'), modified: sum(exactOnes, 'modified'),
      boundedLow: sum(boundedOnes, 'changed'), boundedHigh: boundedOnes.every(member => member.pr.latest.changed.upper !== null) ? boundedOnes.reduce((total, member) => total + member.pr.latest.changed.upper, 0) : null, boundedCount: boundedOnes.length,
      rawChurn: recovered.reduce((total, member) => total + (member.pr.latest.raw.lower ?? 0), 0),
      evidence: Object.fromEntries([['changed', 'changed'], ['modified', 'modified'], ['added', 'added'], ['deleted', 'deleted'], ['rawChurn', 'raw']].map(([key, measure]) => [key,
        sumBounds(inside.map(member => member.recovered ? member.pr.latest[measure] : unknown()))])),
      members: inside.map(member => member.pr)
    };
  });
  const totals = { count: list.reduce((n, bucket) => n + bucket.count, 0), recovered: list.reduce((n, bucket) => n + bucket.recovered, 0), partial: list.filter(bucket => bucket.coverage === 'partial').length,
    added: list.reduce((n, bucket) => n + bucket.added, 0), deleted: list.reduce((n, bucket) => n + bucket.deleted, 0), modified: list.reduce((n, bucket) => n + bucket.modified, 0),
    boundedLow: list.reduce((n, bucket) => n + bucket.boundedLow, 0), boundedHigh: list.every(bucket => bucket.boundedHigh !== null) ? list.reduce((n, bucket) => n + bucket.boundedHigh, 0) : null, boundedCount: list.reduce((n, bucket) => n + bucket.boundedCount, 0),
    rawChurn: list.reduce((n, bucket) => n + bucket.rawChurn, 0) };
  return { basis, list, totals };
}

/** Weekly flow over a 13-week context: opened, merged and closed unmerged from retained lifecycle, plus analysed pull requests. */
export function weeklyFlow({ pullRequests, lifecycle, nowIso }) {
  const { list } = bucketsFor('90d', nowIso);
  const prs = [...pullRequests.values()];
  const pulls = lifecycle?.standing === 'available' ? prs.filter(pr => pr.lifecycle) : [];
  return list.map(bucket => ({
    ...bucket,
    covered: !lifecycle?.coverageFrom || bucket.start >= lifecycle.coverageFrom,
    analysed: prs.filter(pr => within(pr.observedAt, bucket.start, bucket.end)).length,
    opened: pulls.filter(pr => within(pr.lifecycle.openedAt, bucket.start, bucket.end)).length,
    merged: pulls.filter(pr => within(pr.lifecycle.mergedAt, bucket.start, bucket.end)).length,
    closed: pulls.filter(pr => pr.state === 'closed' && within(pr.lifecycle.closedAt, bucket.start, bucket.end)).length,
    openAtEnd: pulls.filter(pr => pr.lifecycle.openedAt < bucket.end && !(pr.lifecycle.mergedAt && pr.lifecycle.mergedAt < bucket.end) && !(pr.lifecycle.closedAt && pr.lifecycle.closedAt < bucket.end)).length
  }));
}

/** Analysed heads per pull request: how many distinct heads reached an analysis, and the first-to-latest growth. */
export function headsPerPullRequest(prs, basis = 'retained') {
  const med = medianFor(basis);
  const counts = [1, 2, 3, 4].map(n => prs.filter(pr => n === 4 ? pr.heads >= 4 : pr.heads === n).length);
  const multi = prs.filter(pr => pr.heads > 1 && pr.first?.changed.status === 'exact' && pr.latest.changed.status === 'exact');
  const growth = multi.map(pr => pr.latest.changed.lower - pr.first.changed.lower);
  const growthPct = multi.filter(pr => pr.first.changed.lower > 0).map(pr => ((pr.latest.changed.lower - pr.first.changed.lower) / pr.first.changed.lower) * 100);
  return { counts, total: prs.length, multi: multi.length, medianHeads: med(prs.map(pr => exact(pr.heads))),
    medianGrowth: med(growth.map(exact)), medianGrowthPct: med(growthPct.map(exact)) };
}

/** Development of one pull request across its analysed heads, with the band at each head. */
export function development(pr) {
  return pr.revisions.map((revision, index) => ({ index, head: revision.head, observedAt: revision.observedAt, changed: revision.changed, band: revision.band, evidence: revision.evidence }));
}

/** Band transition between the previous and latest analysed heads, when both carry a band. */
export function lastTransition(pr) {
  for (let index = pr.revisions.length - 1; index > 0; index--) {
    const current = pr.revisions[index], previous = pr.revisions[index - 1];
    if (current.band && previous.band && current.band.id !== previous.band.id) return { from: previous.band, to: current.band, head: index + 1, at: current.observedAt };
  }
  return undefined;
}

export { bound, exact, unknown, sumBounds, intervalMedian };
