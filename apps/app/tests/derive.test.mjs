// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bound, sumBounds, intervalMedian, describeBound, n0 } from '../src/lib/intervals.mjs';
import { bandOf, labelLane, groupPullRequests, periodStats, sizeMix, bucketsFor, changeVolume, headsPerPullRequest, lastTransition, fromRetained, attachTitles, currentBand, retainedLabelLane } from '../src/lib/derive.mjs';
import { readViewState, link, describeScope } from '../src/lib/scope.mjs';


/** A row as the analytical service returns it for one pull request. `changed: null` is a merged PR without a recovered final comparison. */
function row({ pullRequest, state, openedAt, mergedAt = null, closedAt = null, changed, basis = 'final-merged-comparison' }) {
  const amount = value => (value === null ? { status: 'unknown', lower: 0, upper: null } : { status: 'exact', lower: value, upper: value });
  return { repositoryId: 1, pullRequest, state, openedAt, readyAt: null, mergedAt, closedAt, updatedAt: closedAt ?? openedAt,
    changed: amount(changed), rawChurn: amount(changed === null ? null : changed * 2), band: changed === null ? null : { status: 'resolved', id: changed < 20 ? 'xs' : changed < 100 ? 's' : 'm' },
    composition: { addedOnly: amount(changed === null ? null : Math.floor(changed / 3)), deletedOnly: amount(changed === null ? null : Math.floor(changed / 3)), modified: amount(changed === null ? null : changed - 2 * Math.floor(changed / 3)), rawAdded: amount(changed), rawDeleted: amount(changed) },
    policy: { id: 'size-v1', basis: changed === null ? 'comparison-unrecovered' : 'current-policy', requestedId: 'size-v1' },
    measurement: { basis, standing: changed === null ? 'unrecovered' : 'recovered', quality: 'exact', files: changed === null ? null : { complete: true, total: { status: 'exact', lower: 1, upper: 1 }, observed: 1 }, base: 'b', head: 'h1', observedAt: mergedAt ?? openedAt },
    analyzedHeads: 1, freshness: { basis: 'pr-development-head', analyzedHead: 'h1', currentHead: 'h1', standing: 'current' }, original: { policyId: 'size-v1', band: 'm' }, desiredLabel: 'size/M', observedLabel: 'size/M' };
}

const exact = value => ({ status: 'exact', value });
const bounded = (minimum, maximum) => ({ status: 'bounded', minimum, maximum });

test('bounds keep unknown distinct from zero and give counts their zero floor', () => {
  assert.deepEqual(bound(exact(12)), { status: 'exact', lower: 12, upper: 12 });
  assert.deepEqual(bound(bounded(10, 30)), { status: 'bounded', lower: 10, upper: 30 });
  assert.deepEqual(bound({ status: 'bounded', minimum: 10 }), { status: 'bounded', lower: 10, upper: null });
  assert.deepEqual(bound(undefined), { status: 'unknown', lower: 0, upper: null });
  assert.deepEqual(bound({ status: 'unknown' }, { nonNegative: false }), { status: 'unknown', lower: null, upper: null });
  assert.equal(describeBound(bound(undefined)), 'unknown');
  assert.equal(describeBound(bound({ status: 'bounded', minimum: 10 })), '≥ 10');
  assert.equal(describeBound(bound(bounded(10, 30))), '10–30');
  assert.equal(describeBound(bound(exact(1234))), '1,234');
  assert.equal(n0(null), '—');
});

test('sums and interval medians keep both ends instead of dropping bounded members', () => {
  const values = [bound(exact(10)), bound(exact(20)), bound(bounded(100, 200))];
  assert.deepEqual(sumBounds(values), { status: 'bounded', lower: 130, upper: 230 });
  const median = intervalMedian(values);
  assert.equal(median.status, 'exact', 'both ends agree, so the median is exact even with a bounded member');
  assert.equal(median.lower, 20);
  assert.equal(median.upper, 20);
  const skewed = intervalMedian([bound(exact(10)), bound(bounded(100, 200)), bound(bounded(150, 400))]);
  assert.deepEqual([skewed.lower, skewed.upper], [100, 200]);
  const open = intervalMedian([bound(exact(10)), bound({ status: 'bounded', minimum: 50 })]);
  assert.equal(open.upper, null);
  assert.equal(describeBound(open), '≥ 10');
  assert.equal(intervalMedian([]).status, 'empty');
  assert.equal(describeBound(intervalMedian([])), 'n/a');
});

test('bands come from the recorded result, or are derived from exact Changed and marked so', () => {
  const recorded = bandOf({ results: { metrics: [], bands: [{ ref: 'size', status: 'resolved', id: 'm' }] } }, bound(exact(300)));
  assert.deepEqual([recorded.id, recorded.standing], ['m', 'recorded']);
  const unknownRecorded = bandOf({ results: { metrics: [], bands: [{ ref: 'size', status: 'unknown' }] } }, bound(exact(300)));
  assert.deepEqual([unknownRecorded.id, unknownRecorded.standing], ['unknown', 'recorded']);
  const derived = bandOf({ results: [] }, bound(exact(300)));
  assert.deepEqual([derived.id, derived.standing], ['m', 'derived']);
  const crossing = bandOf({ results: [] }, bound(bounded(90, 120)));
  assert.deepEqual([crossing.id, crossing.standing], ['unknown', 'derived']);
  const inside = bandOf({ results: [] }, bound(bounded(110, 120)));
  assert.deepEqual([inside.id, inside.standing], ['m', 'derived']);
  assert.equal(bandOf({ results: [] }, bound(undefined)).standing, 'unknown');
});

test('label lanes read observed, unverified, refused and absent effects', () => {
  assert.equal(labelLane([]).standing, 'none');
  assert.equal(labelLane([{ kind: 'label.add', outcome: 'changed', request: 'acknowledged', readback: 'verified' }]).standing, 'observed');
  assert.equal(labelLane([{ kind: 'label.add', outcome: 'unchanged', request: 'not-needed', readback: 'verified' }]).detail, 'already present on GitHub');
  assert.equal(labelLane([{ kind: 'label.add', outcome: 'unresolved', request: 'acknowledged', readback: 'unobserved' }]).standing, 'unverified');
  assert.equal(labelLane([{ kind: 'label.add', outcome: 'unresolved', request: 'rejected', readback: 'failed' }]).standing, 'refused');
  assert.equal(labelLane([{ kind: 'label.create-definition', outcome: 'changed', request: 'acknowledged', readback: 'verified' }]).standing, 'none');
});

function record(id, pullRequest, head, changed, observedAt, extra = {}) {
  return { id, repositoryId: 1, pullRequest, comparisonId: `cmp-${head}`, policyId: 'p', schemaVersion: 3, head, base: 'b', observedAt,
    projection: { evidence: changed.status, totals: { lines: { changed, added: exact(2), deleted: exact(1), modified: exact(3) }, raw: { churn: exact(9), added: exact(5), deleted: exact(4) } } },
    fileSet: { complete: true, total: exact(2), included: exact(2), excluded: exact(0) }, results: [], gaps: [], files: [], effects: [], ...extra };
}

test('pull requests group their revisions oldest first and expose the latest facts, heads and transitions', () => {
  const groups = groupPullRequests([record(3, 7, 'h3', exact(120), '2026-10-03T00:00:00.000Z'), record(1, 7, 'h1', exact(30), '2026-10-01T00:00:00.000Z'), record(2, 7, 'h2', exact(80), '2026-10-02T00:00:00.000Z'), record(4, 8, 'x1', bounded(10, 50), '2026-10-04T00:00:00.000Z')]);
  const pr = groups.get('1#7');
  assert.equal(pr.heads, 3);
  assert.equal(pr.latest.head, 'h3');
  assert.equal(pr.first.changed.lower, 30);
  const transition = lastTransition(pr);
  assert.deepEqual([transition.from.id, transition.to.id, transition.head], ['s', 'm', 3]);
  assert.equal(groups.get('1#8').latest.changed.status, 'bounded');
  const heads = headsPerPullRequest([...groups.values()]);
  assert.deepEqual(heads.counts, [1, 0, 1, 0]);
  assert.equal(heads.medianGrowth.lower, 90);
});

test('period statistics name populations and never invent lifecycle facts', () => {
  const groups = groupPullRequests([record(1, 7, 'h1', exact(30), '2026-10-05T00:00:00.000Z'), record(2, 8, 'x1', bounded(10, 50), '2026-10-06T00:00:00.000Z'), record(3, 9, 'y1', exact(500), '2026-09-01T00:00:00.000Z')]);
  const stats = periodStats({ pullRequests: groups, lifecycle: { standing: 'unavailable', reason: 'test' }, from: '2026-10-01T00:00:00.000Z', to: '2026-10-09T00:00:00.000Z' });
  assert.equal(stats.analysedCount, 2);
  assert.equal(stats.lifecycle.standing, 'unavailable');
  assert.equal(stats.opened, undefined);
  // nearest-rank-v1 takes the lower middle for an even population, on both ends
  assert.deepEqual([stats.medianChanged.lower, stats.medianChanged.upper], [10, 30]);
  assert.equal(describeBound(stats.medianChanged), '10–30');
  // The retained basis: the service's rows carry lifecycle, final comparisons and current-policy facts.
  const retained = new Map([
    ['1#7', fromRetained(row({ pullRequest: 7, state: 'merged', openedAt: '2026-10-02T00:00:00.000Z', mergedAt: '2026-10-05T12:00:00.000Z', closedAt: '2026-10-05T12:00:00.000Z', changed: 30 }))],
    ['1#8', fromRetained(row({ pullRequest: 8, state: 'open', openedAt: '2026-10-03T00:00:00.000Z', changed: 20, basis: 'pull-request-revision' }))],
    ['1#11', fromRetained(row({ pullRequest: 11, state: 'closed', openedAt: '2026-10-03T00:00:00.000Z', closedAt: '2026-10-04T00:00:00.000Z', changed: 5, basis: 'pull-request-revision' }))],
    ['1#12', fromRetained(row({ pullRequest: 12, state: 'merged', openedAt: '2026-10-01T00:00:00.000Z', mergedAt: '2026-10-06T00:00:00.000Z', closedAt: '2026-10-06T00:00:00.000Z', changed: null }))]
  ]);
  attachTitles(retained, new Map([[1, new Map([[7, { title: 'Seven', url: 'https://github.com/o/r/pull/7', headSha: 'h1' }]])]]));
  assert.equal(retained.get('1#7').title, 'Seven');
  assert.equal(retained.get('1#12').unrecovered, true, 'a merged PR without a recovered final comparison is in the population but not measured');
  const lifecycle = { standing: 'available', source: 'retained-analytical-records', coverageFrom: '2026-09-20T00:00:00.000Z' };
  const withLife = periodStats({ pullRequests: retained, lifecycle, from: '2026-10-01T00:00:00.000Z', to: '2026-10-09T00:00:00.000Z' });
  assert.equal(withLife.basis, 'retained');
  assert.deepEqual([withLife.opened, withLife.merged, withLife.closedUnmerged, withLife.openNow, withLife.backlog], [4, 2, 1, 1, 1]);
  assert.equal(withLife.mergedRecovered, 1, 'only the recovered final comparison is measured');
  assert.equal(withLife.changedTotal.upper, null, 'the missing comparison stays in the merged total');
  assert.equal(withLife.rawTotal.upper, null);
  assert.equal(withLife.decomposition.modified.upper, null);
  assert.equal(withLife.analysedCount, 1);
  assert.equal(withLife.timeToMerge.lower, 4.25, 'the contract median averages the two central merged durations');
  assert.equal(withLife.windowCovered, true);
  const earlier = periodStats({ pullRequests: retained, lifecycle, from: '2026-09-01T00:00:00.000Z', to: '2026-10-01T00:00:00.000Z' });
  assert.equal(earlier.windowCovered, false, 'a window that begins before the first retained observation is partial');
});

test('retained rows keep judged bands, desired and observed labels distinct', () => {
  assert.equal(currentBand({ status: 'resolved', id: 'm' }).standing, 'current');
  assert.equal(currentBand(null).id, 'unknown');
  assert.equal(retainedLabelLane({ desiredLabel: 'size/M', observedLabel: 'size/M' }).standing, 'observed');
  assert.equal(retainedLabelLane({ desiredLabel: 'size/M', observedLabel: 'size/S' }).standing, 'differs');
  assert.equal(retainedLabelLane({ desiredLabel: 'size/M', observedLabel: null }).standing, 'unverified');
  assert.equal(retainedLabelLane({}).standing, 'none');
});

test('size mix keeps Unknown apart and counts derived bands', () => {
  const groups = groupPullRequests([record(1, 1, 'a', exact(10), '2026-10-05T00:00:00.000Z'), record(2, 2, 'b', exact(150), '2026-10-05T00:00:00.000Z'), record(3, 3, 'c', bounded(90, 130), '2026-10-05T00:00:00.000Z')]);
  const mix = sizeMix([...groups.values()]);
  assert.equal(mix.total, 3);
  assert.equal(mix.unknown, 1);
  assert.equal(mix.known, 2);
  assert.equal(mix.derived, 3);
  assert.equal(mix.rows.find(row => row.band.id === 'xs').count, 1);
});

test('buckets align to calendar days, two-day blocks, Monday weeks and months, and change volume keeps coverage honest', () => {
  const now = '2026-10-09T14:00:00.000Z';
  assert.equal(bucketsFor('7d', now).list.length, 7);
  assert.equal(bucketsFor('30d', now).list.length, 15);
  const weeks = bucketsFor('90d', now).list;
  assert.equal(weeks.length, 13);
  assert.equal(new Date(weeks[0].start).getUTCDay(), 1);
  const months = bucketsFor('1y', now, '2026-06-15T00:00:00.000Z');
  assert.equal(months.list.length, 5);
  assert.ok(months.note);
  assert.equal(months.list.at(-1).start, '2026-10-01T00:00:00.000Z');
  const groups = new Map([
    ['1#7', fromRetained(row({ pullRequest: 7, state: 'merged', openedAt: '2026-10-02T00:00:00.000Z', mergedAt: '2026-10-06T00:00:00.000Z', closedAt: '2026-10-06T00:00:00.000Z', changed: 30 }))],
    ['1#12', fromRetained(row({ pullRequest: 12, state: 'merged', openedAt: '2026-10-02T00:00:00.000Z', mergedAt: '2026-10-06T06:00:00.000Z', closedAt: '2026-10-06T06:00:00.000Z', changed: null }))]
  ]);
  const lifecycle = { standing: 'available', source: 'retained-analytical-records', coverageFrom: null };
  const volume = changeVolume({ buckets: bucketsFor('7d', now).list, pullRequests: groups, lifecycle });
  assert.equal(volume.basis, 'merged');
  const day = volume.list.find(bucket => bucket.start === '2026-10-06T00:00:00.000Z');
  assert.deepEqual([day.count, day.recovered, day.coverage], [2, 1, 'partial']);
  assert.equal(volume.totals.recovered, 1);
  const pathless = groupPullRequests([record(1, 7, 'h1', exact(30), '2026-10-05T00:00:00.000Z')]);
  const analysedBasis = changeVolume({ buckets: bucketsFor('7d', now).list, pullRequests: pathless, lifecycle: { standing: 'unavailable' } });
  assert.equal(analysedBasis.basis, 'analysed');
  assert.equal(analysedBasis.totals.count, 1);
});

test('URL state parses defensively and links omit defaults', () => {
  const state = readViewState(new URL('https://app.example/prs?s=parser-guild%2Fparser-lab&per=90d&band=m&page=3&q=lexer&w=7&evil=1'));
  assert.equal(state.s, 'parser-guild/parser-lab');
  assert.equal(state.per, '90d');
  assert.equal(state.page, '3');
  assert.equal(state.w, '7');
  assert.equal(readViewState(new URL('https://app.example/?s=../etc&per=2y&page=-1')).s, 'all');
  assert.equal(readViewState(new URL('https://app.example/?per=2y')).per, '30d');
  assert.equal(link({ s: 'all', per: '30d', f: '' }, '/prs'), '/prs');
  assert.equal(link({ s: '@parser-guild', per: '7d' }, '/history', { w: '3' }), '/history?s=%40parser-guild&per=7d&w=3');
  assert.deepEqual(describeScope('@parser-guild'), { kind: 'namespace', namespace: 'parser-guild' });
  assert.equal(describeScope('owner/repo').kind, 'repository');
  assert.equal(describeScope('nonsense').kind, 'all');
});

test('Files preserves a complete query through period, metric, card, paging and file-return links', () => {
  const query = 'path/' + 'a'.repeat(148) + '/package-lock.json';
  assert.equal(query.length, 171);
  for (const pathname of ['/files', '/file/parser-guild/parser-lab/' + 'a'.repeat(22)]) {
    const url = new URL(pathname, 'https://app.example');
    url.search = new URLSearchParams({ s: 'parser-guild/parser-lab', per: '7d', m: 'changed', q: query, page: '3', sel: 'b'.repeat(22) }).toString();
    const state = readViewState(url);
    assert.equal(state.q, query);
    for (const patch of [{ per: '90d' }, { m: 'turnover' }, { sel: 'c'.repeat(22) }, { page: '4' }, {}]) {
      const carried = new URL(link(state, '/files', patch), url);
      assert.equal(carried.searchParams.get('q'), query);
      assert.equal(carried.searchParams.get('s'), 'parser-guild/parser-lab');
      assert.equal(readViewState(carried).q, query);
    }
  }
  assert.equal(readViewState(new URL('https://app.example/prs?' + new URLSearchParams({ q: query }))).q, query.slice(0, 120), 'the PR search policy is unchanged');
});
