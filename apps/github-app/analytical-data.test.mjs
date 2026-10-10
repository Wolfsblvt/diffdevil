// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Miniflare } from 'miniflare';
import { analyzeDiff, analyzeChanges, compilePolicy, unwrap } from '@wolfsblvt/diffdevil';
import { createAnalyticalDataService, normalizeAnalyticalRecord, median, turnover, fileContinuity } from './analytical-data.mjs';
import { collectAnalyticalPullRequest, observeFileSize, captureDefaultBranchSizes, recoverFinalComparison, observeCurrentSizes, createCurrentSizeObserver } from './analytical-collection.mjs';
import { D1AppStore } from './storage.mjs';
import { analyticalHttp } from './analytical-http.mjs';
import { createGitHubAppWorker, createAnalyticalSizeObserver } from './app.mjs';

const base = 'a'.repeat(40), head = 'b'.repeat(40), other = 'c'.repeat(40);
const from = '2026-09-01T00:00:00.000Z', to = '2026-10-01T00:00:00.000Z';
const at = '2026-09-15T00:00:00.000Z';
const patch = 'diff --git a/a.txt b/a.txt\n--- a/a.txt\n+++ b/a.txt\n@@ -1 +1 @@\n-old\n+new\n';
const query = (surface, extra = {}) => ({ version: 1, surface, repositoryIds: [17], from, to, ...extra });
const actor = { userId: 123, authorizedRepositoryIds: [17] };
function record(number = 1, report = unwrap(analyzeDiff(patch, { source: { kind: 'github-api', comparison: 'direct', comparisonId: 'final', base, head } }))) {
  return normalizeAnalyticalRecord({ version: 1, repositoryId: 17, pullRequest: number, state: 'merged', openedAt: from, readyAt: from,
    mergedAt: at, closedAt: at, updatedAt: at, currentHead: other, revisions: [],
     final: report ? { base, head, observedAt: at, report,
       sizes: report.files.map(file => ({ path: file.path, before: 100, after: 100 })), basis: 'final-merged-comparison' } : null });
}
function fixture(records = [record()], plan = 'pro') {
  let accesses = true;
  const store = { analyticalRecords: async id => records.filter(row => row.repositoryId === id), analyticalSizes: async () => [] };
  const service = createAnalyticalDataService({ store, authorize: async () => accesses, namespace: async () => 9,
    currentPolicy: async () => ({ id: 'current', compiled: unwrap(compilePolicy({ version: 1, defaults: { paths: { exclude: ['a.txt'] } } })) }),
    entitlement: async () => plan, now: () => to });
  return { service, records, revoke: () => { accesses = false; } };
}

test('medians include bounded and unrecovered observations, and empty is unavailable', () => {
  assert.deepEqual(median([]), { status: 'unavailable', lower: null, upper: null, samples: 0 });
  assert.deepEqual(median([{ status: 'exact', value: 10 }, { status: 'bounded', lower: 20, upper: 100 }]), { status: 'bounded', lower: 15, upper: 55, samples: 2 });
  assert.deepEqual(median([undefined, { status: 'exact', value: 10 }, { status: 'unknown', lower: 50 }]), { status: 'unknown', lower: 10, upper: null, samples: 3 });
});

test('six surfaces use final merged facts, independent revisions, current policy, and honest coverage', async () => {
  const { service, records } = fixture([record(), record(2, null)]);
  const overview = await service.query(query('overview'), actor);
  assert.equal(overview.result.overview.mergedPullRequests, 2);
  assert.equal(overview.result.overview.coverage.countMeaning, 'observed-lower-bounds');
  assert.equal(overview.result.overview.lifecycleBasis, 'last-observed-state');
  assert.equal(overview.result.comparison.delta, null, 'incomplete periods do not establish a repository-wide delta');
  assert.equal(overview.result.comparison.previous.coverage.completeWindow, false);
  assert.ok(overview.result.flow.buckets.every(bucket => bucket.coverage.completeWindow === false));
  assert.equal(overview.result.overview.medianChanged.samples, 2);
  assert.equal(overview.result.overview.changed.upper, null);
  assert.equal(overview.coverage.recoveredMerged, 1);
  assert.equal(overview.result.overview.changed.lower, 0, 'current policy excludes the retained named file');
  assert.equal(records[0].final.report.files[0].included, true, 'base numerical facts survive for compatible replay');
  for (const surface of ['prs', 'history', 'files', 'pr', 'file']) {
    const result = await service.query(query(surface, { pullRequest: 1, path: 'a.txt' }), actor);
    assert.equal(result.surface, surface);
    assert.equal(result.coverage.completeWindow, false);
  }
  const detail = await service.query(query('pr', { pullRequest: 1 }), actor);
  assert.equal(detail.result.freshness.standing, 'unavailable');
  assert.equal(detail.result.measurement.head, head);
  assert.equal(detail.result.measurement.basis, 'final-merged-comparison');
  assert.equal(detail.result.measurement.standing, 'recovered');
  assert.equal(detail.result.measurement.files.observed, 1);
  assert.equal(detail.result.composition.modified.lower, 0, 'PR composition follows current policy');
  const baseService = createAnalyticalDataService({ store: { analyticalRecords: async () => [record()], analyticalSizes: async () => [] },
    authorize: async () => true, entitlement: async () => 'pro', namespace: async () => 9, currentPolicy: async () => null });
  const baseHistory = await baseService.query(query('history'), actor);
  assert.equal(baseHistory.result.buckets.find(bucket => bucket.samples === 1).composition.modified.lower, 1, 'mosaic composition comes from engine facts rather than raw-churn subtraction');
  assert.equal(baseHistory.result.buckets.find(bucket => bucket.samples === 1).coverage.countMeaning, 'observed-lower-bounds');
  assert.equal(detail.result.files[0].included, false);
  const file = await service.query(query('file', { path: 'a.txt' }), actor);
  assert.equal(file.result.cochange.samples, 1, 'co-change excludes unrecovered rows from every denominator');
  assert.equal(file.result.inclusion, 'excluded');
  assert.equal(file.result.contributions[0].prChanged.value, 1, 'file-versus-PR comparison uses the same all-observed quantity');
  assert.equal(file.result.contributions[0].prPolicyChanged.value, 0, 'current-policy totals stay separate');
});

test('co-change names its subject and partner counts and keeps the meter subject-directed', async () => {
  const files = ['small.txt', 'hub.txt'];
  const changedFiles = paths => paths.map(path =>
    `diff --git a/${path} b/${path}\n--- a/${path}\n+++ b/${path}\n@@ -1 +1 @@\n-old\n+new\n`).join('');
  const report = unwrap(analyzeDiff(changedFiles(files), { source: {
    kind: 'github-api', comparison: 'direct', comparisonId: 'cochange', base, head,
  } }));
  const records = [
    record(1, report),
    record(2, report),
    ...Array.from({ length: 8 }, (_, index) => record(index + 3, unwrap(analyzeDiff(
      changedFiles(['hub.txt']), { source: { kind: 'github-api', comparison: 'direct', comparisonId: `hub-${index}`, base, head } })))),
  ];
  const { service } = fixture(records);
  const small = await service.query(query('file', { path: 'small.txt' }), actor);
  const hub = await service.query(query('file', { path: 'hub.txt' }), actor);

  assert.equal(small.result.cochange.subjectPullRequests, 2);
  assert.deepEqual(small.result.cochange.companions[0], {
    repositoryId: 17, path: 'hub.txt', together: 2, subjectPullRequests: 2, partnerPullRequests: 10,
  });
  assert.equal(small.result.cochange.companions[0].together / small.result.cochange.subjectPullRequests, 1);
  assert.deepEqual(hub.result.cochange.companions.find(value => value.path === 'small.txt'), {
    repositoryId: 17, path: 'small.txt', together: 2, subjectPullRequests: 10, partnerPullRequests: 2,
  });
  assert.equal(hub.result.cochange.companions.find(value => value.path === 'small.txt').together
    / hub.result.cochange.subjectPullRequests, 0.2);
});

test('Free and unauthorized readers cannot obtain premium names or aggregate file history', async () => {
  const { service, revoke } = fixture(undefined, 'free');
  const freeFiles = await service.query(query('files'), actor);
  assert.equal(freeFiles.standing, 'free');
  assert.equal(freeFiles.result.historyScope.surface, 'history');
  const overview = await service.query(query('overview'), actor);
  assert.deepEqual(overview.result.files, []);
  assert.equal(overview.entitlements.aggregatePlan, 'free');
  const detail = await service.query(query('pr', { pullRequest: 1 }), actor);
  assert.equal(detail.result.alsoInProgress, null);
  assert.equal(detail.result.cochange, undefined);
  await assert.rejects(service.query(query('overview'), { authorizedRepositoryIds: [] }), { code: 'E_APP_DATA_UNAUTHORIZED' });
  revoke();
  await assert.rejects(service.query(query('overview'), actor), { code: 'E_APP_DATA_UNAUTHORIZED' });
});

test('scope selects namespace versus viewer entitlement, filters premium data, and gives Free Files useful context', async () => {
  const rows = [record(), { ...record(2), repositoryId: 18 }, { ...record(3), repositoryId: 19 }];
  const reader = { userId: 123, authorizedRepositoryIds: [17, 18, 19] };
  let viewerPlan = 'free';
  const service = createAnalyticalDataService({ store: { analyticalRecords: async id => rows.filter(row => row.repositoryId === id), analyticalSizes: async () => [] },
    authorize: async ({ repositoryId }) => reader.authorizedRepositoryIds.includes(repositoryId),
    entitlement: async ({ repositoryId }) => repositoryId === null ? viewerPlan : repositoryId === 19 ? 'free' : 'pro',
    namespace: async ({ repositoryId }) => {
      assert.notEqual(repositoryId, 20, 'namespace metadata is never read for an inaccessible repository');
      return repositoryId === 19 ? 123 : 9;
    }, currentPolicy: async () => null });
  const request = scope => query('files', { repositoryIds: [17, 18, 19, 20], scope });
  const namespace = await service.query(request({ kind: 'namespace', namespaceId: 9 }), reader);
  assert.equal(namespace.entitlements.aggregatePlan, 'pro');
  assert.deepEqual(namespace.result.files.map(file => file.repositoryId), [17, 18]);
  assert.equal(namespace.coverage.authorizedRepositories, 3);
  assert.equal(namespace.coverage.representedRepositories, 2);
  assert.equal(namespace.entitlements.repositories.some(row => row.repositoryId === 20), false);
  const withoutDenied = await service.query({ ...request({ kind: 'namespace', namespaceId: 9 }), repositoryIds: [17, 18, 19] }, reader);
  assert.equal(withoutDenied.entitlements.aggregatePlan, namespace.entitlements.aggregatePlan, 'an inaccessible repository does not change the plan');
  const allFree = await service.query(request({ kind: 'all' }), reader);
  assert.equal(allFree.standing, 'free');
  assert.deepEqual(allFree.fundedNamespaces, [{ namespaceId: 9, repositoryIds: [17, 18], plan: 'pro' }]);
  assert.equal(allFree.result.historyScope.surface, 'history');
  const oneRepoAll = await service.query(query('files', { repositoryIds: [17], scope: { kind: 'all' } }), reader);
  assert.equal(oneRepoAll.standing, 'free', 'All follows the viewer even with only one repository');
  viewerPlan = 'pro';
  const allPaid = await service.query(request({ kind: 'all' }), reader);
  assert.deepEqual(allPaid.result.files.map(file => file.repositoryId), [17, 18]);
  assert.equal(allPaid.entitlements.premium.excludedFreeRepositories, 1);
  const basic = await service.query({ ...request({ kind: 'all' }), surface: 'overview' }, reader);
  assert.equal(basic.result.overview.mergedPullRequests, 3, 'basic aggregates still include authorized Free repositories');
});

test('turnover requires observed endpoint sizes and revision continuity, never summed growth', () => {
  const contribution = { mergedAt: at, base, head, file: { changeType: 'modified', lines: { changed: { status: 'exact', value: 10 } } }, size: { before: 100, after: 100 } };
  const observations = [{ observedAt: from, revision: base, size: 100 }, { observedAt: to, revision: head, size: 100 }];
  const exact = turnover([contribution], { from, to }, observations);
  assert.equal(exact.lower, 0.1);
  assert.equal(exact.upper, 0.1);
  assert.equal(turnover([contribution], { from, to }, [{ ...observations[0], observedAt: '2026-08-31T00:00:00.000Z' },
    { ...observations[1], observedAt: '2026-10-02T00:00:00.000Z' }]).upper, 0.1, 'bracketing observations with the same immutable revisions supply the interval');
  const gap = turnover([contribution], { from, to }, [{ ...observations[0], revision: other }, observations[1]]);
  assert.equal(gap.lower, 0);
  assert.equal(gap.averageSize.upper, null);
  assert.ok(gap.discontinuities > 0);
  assert.equal(turnover([{ ...contribution, file: { ...contribution.file, changeType: 'added' } }], { from, to }).reason, 'created-or-deleted-in-period');
  assert.equal(turnover([{ ...contribution, file: { ...contribution.file, changeType: 'renamed' } }], { from, to }).status, 'unknown', 'a rename widens unresolved continuity without inventing a creation/deletion refusal');
});

const revisions = Array.from({ length: 6 }, (_, index) => String(index + 1).repeat(40));
function transition(number, name, [before, after], mergedAt, { complete = true, oldPath } = {}) {
  const lines = oldPath ? `diff --git a/${oldPath} b/${name}\nsimilarity index 90%\nrename from ${oldPath}\nrename to ${name}\n--- a/${oldPath}\n+++ b/${name}\n@@ -1 +1 @@\n-old\n+new\n`
    : `diff --git a/${name} b/${name}\n--- a/${name}\n+++ b/${name}\n@@ -1 +1 @@\n-old\n+new\n`;
  const report = unwrap(analyzeDiff(lines, { fileSet: complete ? undefined : { complete: false, total: { status: 'unknown', lower: 1, reasons: [{ code: 'FILE_SET_INCOMPLETE' }] } },
    source: { kind: 'github-api', comparison: 'direct', comparisonId: `final:${before}:${after}`, base: before, head: after } }));
  return normalizeAnalyticalRecord({ version: 1, repositoryId: 17, pullRequest: number, state: 'merged', openedAt: '2026-08-01T00:00:00.000Z',
    mergedAt, closedAt: mergedAt, updatedAt: mergedAt, currentHead: after, revisions: [],
    final: { base: before, head: after, observedAt: mergedAt, report, sizes: [{ path: name, before: 100, after: 100 }], basis: 'final-merged-comparison' } });
}

test('recorded complete transitions establish per-file continuity; a naming, incomplete or absent link does not', () => {
  const [r1, r2, r3, r4] = revisions, since = Date.parse('2026-09-01T00:00:00.000Z');
  const unchanged = fileContinuity([transition(1, 'a.txt', [r1, r2], '2026-09-05T00:00:00.000Z'),
    transition(2, 'b.txt', [r2, r3], '2026-09-10T00:00:00.000Z', { oldPath: 'c.txt' }),
    transition(3, 'd.txt', [r3, r4], '2026-09-12T00:00:00.000Z', { complete: false })]);
  assert.equal(unchanged(r2, r3, since, 'a.txt'), true, 'an unrelated merge keeps the file continuous');
  assert.equal(unchanged(r1, r3, since, 'a.txt'), false, 'a recorded transition naming the file is a change, even with equal endpoint sizes');
  assert.equal(unchanged(r1, r3, since, 'e.txt'), true);
  assert.equal(unchanged(r1, r3, since, 'c.txt'), false, 'a rename source is named by the transition');
  assert.equal(unchanged(r3, r4, since, 'a.txt'), false, 'an incomplete file set cannot establish that the file was untouched');
  assert.equal(unchanged(r2, revisions[4], since, 'a.txt'), false, 'without a recorded path between revisions continuity stays unestablished');
  assert.equal(unchanged(r2, r3, Date.parse('2026-09-11T00:00:00.000Z'), 'a.txt'), false, 'a transition before the earlier observation cannot follow it');
});

test('turnover stays exact across interleaved unrelated merges and bounded across unobserved gaps', async () => {
  const [r1, r2, r3, r4] = revisions;
  const observe = (revision, observedAt) => ({ repositoryId: 17, path: 'a.txt', revision, observedAt, size: 100 });
  const service = (records, sizes) => createAnalyticalDataService({ store: { analyticalRecords: async () => records, analyticalSizes: async () => sizes },
    authorize: async () => true, namespace: async () => 9, currentPolicy: async () => null, entitlement: async () => 'pro', now: () => to });
  const first = transition(1, 'a.txt', [r1, r2], '2026-09-05T00:00:00.000Z'), unrelated = transition(2, 'b.txt', [r2, r3], '2026-09-10T00:00:00.000Z');
  const second = transition(3, 'a.txt', [r3, r4], '2026-09-20T00:00:00.000Z');
  const bracketing = [observe(r1, '2026-08-31T00:00:00.000Z'), observe(r4, '2026-10-02T00:00:00.000Z')];
  const read = async (records, sizes) => (await service(records, sizes).query(query('file', { path: 'a.txt' }), actor)).result.turnover;

  const interleaved = await read([first, unrelated, second], bracketing);
  assert.equal(interleaved.status, 'exact');
  assert.equal(interleaved.lower, 0.02);
  assert.equal(interleaved.upper, 0.02);
  assert.equal(interleaved.discontinuities, 0);
  const adjacency = turnover([first, second].map(record => ({ mergedAt: record.mergedAt, base: record.final.base, head: record.final.head,
    file: record.final.report.files[0], size: record.final.sizes[0] })), { from, to }, bracketing);
  assert.equal(adjacency.lower, 0, 'whole-branch commit adjacency alone loses the bound');

  // r2 -> r3 by direct pushes or an unrecovered merge: equal endpoint sizes do not show the file stayed that size.
  const unobserved = await read([first, second], bracketing);
  assert.equal(unobserved.status, 'bounded');
  assert.equal(unobserved.lower, 0);
  assert.equal(unobserved.averageSize.upper, null);
  assert.equal(unobserved.discontinuities, 1);

  // A window ending after the latest observation keeps its unobserved tail, but the observed span still counts.
  const open = await read([first, unrelated, second], [bracketing[0], observe(r4, '2026-09-25T00:00:00.000Z')]);
  assert.equal(open.lower, 0);
  assert.equal(open.upper, 0.025);
  assert.equal(open.averageSize.lower, 80);
  assert.equal(open.discontinuities, 0);
});

test('unknown file measurements retain non-negative lower bounds without erasing finite bounded medians', async () => {
  const report = unwrap(analyzeChanges([{ path: 'a.txt', changeType: 'modified', kind: 'text', additions: 10, deletions: 10, incompleteReason: 'PATCH_OMITTED' }],
    { source: { kind: 'github-api', comparison: 'direct', comparisonId: 'bounded', base, head } }));
  const { service } = fixture([record(1, report)]);
  const result = await service.query(query('file', { path: 'a.txt' }), actor);
  assert.equal(result.result.changed.lower, 10);
  assert.equal(result.result.changed.upper, 20);
});

test('default-branch size observation publishes immutable sizes and refuses a moved branch', async () => {
  let changed = false, branchReads = 0;
  const writes = [];
  const client = { json: async route => route.startsWith('/repositories/') ? { id: 17, full_name: 'owner/repo', default_branch: 'main' }
    : { commit: { sha: changed && ++branchReads > 1 ? other : head } }, request: async () => ({ text: 'one\ntwo\n' }) };
  const store = { historySettings: async () => ({ enabled: true }), analyticalRecords: async () => [record()], recordAnalyticalSize: async value => writes.push(value) };
  assert.equal((await captureDefaultBranchSizes({ client, store, repositoryId: 17, now: () => to })).files, 1);
  assert.deepEqual(writes[0], { repositoryId: 17, path: 'a.txt', revision: head, size: 2, observedAt: to });
  changed = true; branchReads = 0; writes.length = 0;
  await assert.rejects(captureDefaultBranchSizes({ client, store, repositoryId: 17, now: () => to }), { code: 'E_APP_DATA_STALE' });
  assert.equal(writes.length, 0);
});

test('single-parent squash and rebase boundaries follow the current default-branch commit introducer', async () => {
  const middle = 'd'.repeat(40);
  let rebased = false, onDefault = true;
  const commits = () => new Map([[head, { sha: head, parents: [{ sha: rebased ? middle : base }] }],
    [middle, { sha: middle, parents: [{ sha: base }] }], [base, { sha: base, parents: [] }]]);
  const client = { json: async route => {
    if (route.includes('/branches/')) return { commit: { sha: head } };
    if (route.includes('/compare/')) return { merge_base_commit: { sha: onDefault ? head : other } };
    if (route.includes('/git/commits/')) return commits().get(route.split('/').at(-1));
    const revision = route.split('/commits/')[1].split('/')[0];
    return revision === head || (rebased && revision === middle) ? [{ number: 1, merged_at: at }] : [{ number: 2, merged_at: from }];
  } };
  const options = () => ({ client, repository: 'owner/repo', pull: { number: 1, merge_commit_sha: head, commits: 2 }, commit: commits().get(head), defaultBranch: 'main' });
  assert.deepEqual(await recoverFinalComparison(options()), { base, head });
  rebased = true;
  assert.deepEqual(await recoverFinalComparison(options()), { base, head });
  onDefault = false;
  assert.equal(await recoverFinalComparison(options()), null, 'a non-default-branch association does not prove the merged boundary');
});

test('path-bearing HTTP reads use same-origin bodies and every response suppresses referrers', async () => {
  const authorization = { analyticalQuery: async ({ query }) => ({ body: { surface: query.surface }, headers: {} }) };
  const url = 'https://app.example.test/api/analytics';
  const headers = { cookie: '__Host-diffdevil-session=fixture', origin: 'https://app.example.test', 'content-type': 'application/json' };
  const body = JSON.stringify(query('file', { path: 'private/file.txt' }));
  const allowed = await analyticalHttp(new Request(url, { method: 'POST', headers, body }), authorization);
  assert.equal(allowed.status, 200);
  assert.equal(allowed.headers.get('referrer-policy'), 'no-referrer');
  assert.equal((await analyticalHttp(new Request(`${url}?query=${encodeURIComponent(body)}`, { headers }), authorization)).status, 400);
  const denied = await analyticalHttp(new Request(url, { method: 'POST', headers: { ...headers, origin: 'https://other.example.test' }, body }), authorization);
  assert.equal(denied.status, 403);
  assert.equal(denied.headers.get('referrer-policy'), 'no-referrer');
});

test('local D1 writes, reads, exports, expiry, consent loss and restore-resistant deletion', async () => {
  const clock = { value: at };
  const runtime = new Miniflare({ workers: [{ config: { name: 'analytics-test', type: 'worker', compatibilityDate: '2026-09-17',
    env: { APP_DB: { type: 'd1', id: `analytics-${crypto.randomUUID()}` } }, manifest: { mainModule: 'worker.mjs', modulesRoot: resolve('.'),
      modules: { 'worker.mjs': { type: 'esm', contents: 'export default { fetch() { return new Response("ok"); } };' } } } } }] });
  try {
    const database = await runtime.getD1Database('APP_DB');
    const store = new D1AppStore(database, { now: () => clock.value });
    for (const name of (await readdir('apps/github-app/migrations')).sort()) await store.migrate(await readFile(`apps/github-app/migrations/${name}`, 'utf8'));
    await store.recordLifecycle({ installationId: 9, action: 'created', addedRepositories: [17], removedRepositories: [] });
    assert.equal((await store.recordAnalytical(record())).status, 'disabled');
    await store.setRepositoryConsent(17, { enabled: true, retentionDays: 30, origin: 'fixture' });
    assert.equal(await store.executionAllowed(17), false);
    assert.equal((await store.recordAnalytical(record())).status, 'published');
    assert.equal((await store.analyticalRecords(17)).length, 1);
    await store.recordAnalyticalSize({ repositoryId: 17, path: 'a.txt', observedAt: from, revision: base, size: 100 });
    const exported = await store.exportAnalytical(17);
    assert.equal(exported.sizes.length, 1);
    assert.ok(!JSON.stringify(exported).includes('old\n'), 'source is never archived');
    const storedService = createAnalyticalDataService({ store, authorize: async () => true, currentPolicy: async () => null, namespace: async () => 9, entitlement: async () => 'pro' });
    const http = createGitHubAppWorker({ authorization: { analyticalQuery: async ({ session, query }) => {
      assert.equal(session, 'fixture-session'); return { body: await storedService.query(query, actor), headers: {} };
    } } });
    const response = await http.fetch(new Request(`https://app.example.test/api/analytics?query=${encodeURIComponent(JSON.stringify(query('overview')))}`,
      { headers: { cookie: '__Host-diffdevil-session=fixture-session' } }), {});
    assert.equal(response.status, 200);
    assert.equal((await response.json()).result.overview.changed.lower, 1);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.equal((await analyticalHttp(new Request('https://app.example.test/api/analytics'), {})).status, 401);
    await store.deleteHistory(17);
    assert.equal((await store.analyticalRecords(17)).length, 0);
    assert.equal((await store.importAnalytical(exported)).published, 0);
    assert.equal(await database.prepare('SELECT 1 FROM analytical_file_sizes WHERE repository_id=17').first(), null);
    await store.recordLifecycle({ installationId: 9, action: 'created', addedRepositories: [18], removedRepositories: [] });
    await store.setRepositoryExecution(18, { enabled: true, origin: 'fixture' });
    await store.setRepositoryConsent(18, { enabled: true, retentionDays: 1, origin: 'fixture' });
    await store.recordAnalytical({ ...record(), repositoryId: 18 });
    const restoration = { ...exported, repositoryId: 18,
      records: exported.records.map(row => ({ ...row, record: { ...row.record, repositoryId: 18, pullRequest: 2 } })),
      sizes: exported.sizes.map(row => ({ ...row, repositoryId: 18 })) };
    assert.equal((await store.importAnalytical(restoration)).published, 2);
    assert.equal((await store.analyticalRecords(18)).length, 2);
    const readBack = await store.exportAnalytical(18);
    assert.equal(readBack.records[1].expiresAt, '2026-09-16T00:00:00.000Z', 'restore obeys the stricter current retention');
    clock.value = '2026-09-17T00:00:00.000Z';
    await store.maintain();
    assert.equal((await store.analyticalRecords(18)).length, 0);
  } finally { await runtime.dispose(); }
});

test('Queue gives effects priority, collects closed/history-only PRs, and preserves analytical failures separately', async () => {
  const run = async execute => {
    const calls = [], envelope = { kind: 'diffdevil.github-app-queue', version: 1, type: 'pull-request', event: 'pull_request', action: 'closed',
      installationId: 9, repositoryId: 17, pullRequest: 1, deliveryId: 'test-delivery', receivedAt: at };
    const store = { claimDelivery: async () => ({ kind: 'claimed' }), claimExecution: async () => ({ kind: 'claimed' }),
      finish: async (_envelope, _lease, state) => calls.push(state), recordAnalyticalRepair: async (_envelope, code) => calls.push(code) };
    await createGitHubAppWorker({ store, execute: async () => { calls.push('execute'); return execute(); },
      collectAnalytics: async () => { calls.push('collect'); throw { code: 'E_GITHUB_RATE_LIMIT' }; } }).queue({ messages: [{ body: envelope,
        ack: () => calls.push('ack'), retry: () => calls.push('retry') }] }, {});
    return calls;
  };
  assert.deepEqual(await run(() => ({ status: 'verified' })), ['execute', 'collect', 'E_GITHUB_RATE_LIMIT', 'complete', 'ack']);
  assert.deepEqual(await run(() => { throw { code: 'E_PULL_REQUEST_CLOSED' }; }), ['execute', 'collect', 'E_GITHUB_RATE_LIMIT', 'rejected', 'ack']);
  assert.deepEqual(await run(() => { throw { code: 'E_ACCESS_DISABLED' }; }), ['execute', 'collect', 'E_GITHUB_RATE_LIMIT', 'rejected', 'ack']);
  assert.deepEqual(await run(() => { throw { code: 'E_EFFECT_INCOMPLETE' }; }), ['execute', 'collect', 'E_GITHUB_RATE_LIMIT', 'repair', 'ack']);
});

test('collector recovers actual merge parents, observes sizes, refuses a fabricated final from revisions', async () => {
  let saved, singleParent = false;
  const pull = { number: 1, state: 'closed', merged_at: at, closed_at: at, created_at: from, updated_at: at, head: { sha: other }, merge_commit_sha: head };
  const client = {
    json: async route => route.startsWith('/repositories/') ? { id: 17, full_name: 'owner/repo' }
      : route.includes('/git/commits/') ? { sha: head, parents: singleParent ? [{ sha: base }] : [{ sha: base }, { sha: other }] }
        : route.includes('/compare/') ? { merge_base_commit: { sha: base }, files: [{ filename: 'a.txt' }] } : pull,
    request: async route => ({ text: route.includes('/compare/') ? patch : 'one\ntwo\n' })
  };
  const store = { historySettings: async () => ({ enabled: true }), analyticalRecords: async () => [], recordAnalytical: async value => { saved = value; return { status: 'published' }; } };
  assert.equal((await collectAnalyticalPullRequest({ client, store, repositoryId: 17, pullRequest: 1, now: () => at })).recovery, null);
  assert.equal(saved.final.sizes[0].before, 2);
  assert.equal(saved.final.report.source.comparison, 'direct');
  singleParent = true;
  assert.equal((await collectAnalyticalPullRequest({ client, store, repositoryId: 17, pullRequest: 1, now: () => at })).recovery, 'final-merge-boundary-unrecovered');
  assert.equal(saved.final, null);
  singleParent = false;
  const failedComparison = { ...client, request: async () => { throw { code: 'E_GITHUB_RATE_LIMIT' }; } };
  const unavailable = await collectAnalyticalPullRequest({ client: failedComparison, store, repositoryId: 17, pullRequest: 1, now: () => at });
  assert.equal(unavailable.code, 'E_GITHUB_RATE_LIMIT');
  assert.equal(saved.mergedAt, at, 'comparison failure retains the known merged PR in the population');
  assert.equal(saved.final, null);
  assert.equal(await observeFileSize({ request: async () => { throw { status: 404 }; } }, 'owner/repo', 'a.txt', base), null, '404 is not proof of absence');
});

// A default App window ends now, after the latest retained observation: r1 -a-> r2 -b-> r3 -a-> r4, captured at r4 on 09-25.
function currentWindow() {
  const [r1, r2, r3, r4, r5] = revisions;
  const records = [transition(1, 'a.txt', [r1, r2], '2026-09-05T00:00:00.000Z'), transition(2, 'b.txt', [r2, r3], '2026-09-10T00:00:00.000Z'),
    transition(3, 'a.txt', [r3, r4], '2026-09-20T00:00:00.000Z')];
  const sizes = [{ repositoryId: 17, path: 'a.txt', revision: r1, observedAt: '2026-08-31T00:00:00.000Z', size: 100 },
    { repositoryId: 17, path: 'a.txt', revision: r4, observedAt: '2026-09-25T00:00:00.000Z', size: 100 }];
  return { r4, r5, records, sizes };
}
function providerDouble({ heads, lines = 100, fail } = {}) {
  const calls = { repository: 0, branch: 0, contents: 0 };
  const client = {
    json: async route => {
      if (fail) throw fail;
      if (route.startsWith('/repositories/')) { calls.repository++; return { id: 17, full_name: 'owner/repo', default_branch: 'main' }; }
      calls.branch++;
      return { commit: { sha: heads[Math.min(calls.branch, heads.length) - 1] } };
    },
    request: async () => { calls.contents++; return { text: 'line\n'.repeat(lines) }; }
  };
  return { client, calls };
}

test('a current window closes its tail with a fresh default-branch observation only where continuity carries it', async () => {
  const { r4, r5, records, sizes } = currentWindow();
  const writes = [];
  const store = { analyticalRecords: async () => records, analyticalSizes: async () => sizes, historySettings: async () => ({ enabled: true }),
    recordAnalyticalSize: async value => { writes.push(value); return { status: 'published' }; } };
  const observedAt = '2026-10-01T00:00:03.000Z';
  const read = async (provider, extraRecords = []) => {
    const service = createAnalyticalDataService({ store: { ...store, analyticalRecords: async () => [...records, ...extraRecords] },
      authorize: async () => true, namespace: async () => 9, currentPolicy: async () => null, entitlement: async () => 'pro', now: () => to,
      ...(provider ? { observeCurrentSizes: createCurrentSizeObserver({ store, clientFor: async () => provider.client, now: () => observedAt }) } : {}) });
    const response = await service.query(query('file', { path: 'a.txt' }), actor);
    return { turnover: response.result.turnover, observation: response.sizeObservation[0], observed: response.result.observedSize };
  };

  const unconfigured = await read();
  assert.deepEqual([unconfigured.turnover.lower, unconfigured.turnover.upper], [0, 0.025], 'without an observer the tail stays open');
  assert.equal(unconfigured.turnover.observedThrough, '2026-09-25T00:00:00.000Z');
  assert.deepEqual(unconfigured.observation, { repositoryId: 17, standing: 'unconfigured', openTails: 1 });

  // Branch still at the captured revision: the retained immutable size is reused; no content is read.
  const steady = providerDouble({ heads: [r4] });
  const unchanged = await read(steady);
  assert.equal(unchanged.turnover.status, 'exact');
  assert.equal(unchanged.turnover.lower, 0.02);
  assert.equal(unchanged.turnover.observedThrough, to);
  assert.deepEqual(steady.calls, { repository: 1, branch: 2, contents: 0 });
  assert.equal(unchanged.observation.closedTails, 1);
  assert.deepEqual(unchanged.observation.paths, { reused: 1, read: 0, notContinuous: 0, persisted: 0 });
  assert.equal(unchanged.observed.observedAt, observedAt, 'the file row shows the fresh observation time');
  assert.equal(writes.length, 0, 'a re-stamped retained revision is not written again');

  // Branch moved through a retained complete merge that does not name the file: one content read, then retained.
  const unrelated = transition(4, 'b.txt', [r4, r5], '2026-10-01T00:00:01.000Z');
  const moved = providerDouble({ heads: [r5] });
  const carried = await read(moved, [unrelated]);
  assert.equal(carried.turnover.lower, 0.02);
  assert.deepEqual(moved.calls, { repository: 1, branch: 2, contents: 1 });
  assert.deepEqual(writes, [{ repositoryId: 17, path: 'a.txt', size: 100, revision: r5, observedAt }]);

  // A direct push or uncollected merge leaves no link: the fresh revision cannot close the tail and is not read.
  const pushed = providerDouble({ heads: [r5] });
  const open = await read(pushed);
  assert.deepEqual([open.turnover.lower, open.turnover.upper], [0, 0.025]);
  assert.deepEqual(pushed.calls, { repository: 1, branch: 1, contents: 0 });
  assert.equal(open.observation.standing, 'observed');
  assert.equal(open.observation.closedTails, 0);
  assert.equal(open.observation.paths.notContinuous, 1);

  // A read that contradicts the carried size never closes; a provider failure keeps the tail and its freshness.
  const contradicted = await read(providerDouble({ heads: [r5], lines: 90 }), [unrelated]);
  assert.equal(contradicted.turnover.lower, 0);
  const failed = await read(providerDouble({ heads: [r4], fail: { code: 'E_GITHUB_RATE_LIMIT' } }));
  assert.deepEqual(failed.observation, { repositoryId: 17, standing: 'unavailable', openTails: 1, code: 'E_GITHUB_RATE_LIMIT' });
  assert.equal(failed.turnover.observedThrough, '2026-09-25T00:00:00.000Z');
  assert.equal(failed.turnover.lower, 0);
});

test('the current-size observer refuses a moved branch, honors consent and accounts for its reads', async () => {
  const { r4, r5 } = currentWindow();
  const writes = [];
  const store = { historySettings: async () => ({ enabled: true }), recordAnalyticalSize: async value => { writes.push(value); return { status: 'published' }; } };
  const moving = providerDouble({ heads: [r4, r5] });
  await assert.rejects(observeCurrentSizes({ client: moving.client, store, repositoryId: 17, paths: ['a.txt'], accepts: () => true }), { code: 'E_APP_DATA_STALE' });
  assert.equal(writes.length, 0);
  const disabled = providerDouble({ heads: [r4] });
  assert.deepEqual(await observeCurrentSizes({ client: disabled.client, store: { historySettings: async () => ({ enabled: false }) }, repositoryId: 17, paths: ['a.txt'], accepts: () => true }), { standing: 'disabled' });
  assert.deepEqual(disabled.calls, { repository: 0, branch: 0, contents: 0 });
  const steady = providerDouble({ heads: [r4] });
  const result = await observeCurrentSizes({ client: steady.client, store, repositoryId: 17, paths: ['a.txt', 'b.txt', 'a.txt'], accepts: path => path === 'a.txt', now: () => to });
  assert.deepEqual({ ...result, sizes: undefined }, { standing: 'observed', revision: r4, observedAt: to, sizes: undefined, reused: 0, read: 1, skipped: 1, persisted: 1,
    providerReads: { repository: 1, branch: 2, contents: 1 } });
});

test('joined D1 data serves a closed current window through the Worker route with a contents-read credential', async () => {
  const { r4, records } = currentWindow();
  const clock = { value: '2026-09-25T00:00:00.000Z' };
  const runtime = new Miniflare({ workers: [{ config: { name: 'analytics-current-test', type: 'worker', compatibilityDate: '2026-09-17',
    env: { APP_DB: { type: 'd1', id: `analytics-${crypto.randomUUID()}` } }, manifest: { mainModule: 'worker.mjs', modulesRoot: resolve('.'),
      modules: { 'worker.mjs': { type: 'esm', contents: 'export default { fetch() { return new Response("ok"); } };' } } } } }] });
  try {
    const store = new D1AppStore(await runtime.getD1Database('APP_DB'), { now: () => clock.value });
    for (const name of (await readdir('apps/github-app/migrations')).sort()) await store.migrate(await readFile(`apps/github-app/migrations/${name}`, 'utf8'));
    await store.recordLifecycle({ installationId: 9, action: 'created', addedRepositories: [17], removedRepositories: [] });
    await store.setRepositoryConsent(17, { enabled: true, retentionDays: 90, origin: 'fixture' });
    for (const value of records) assert.equal((await store.recordAnalytical(value)).status, 'published');
    await store.recordAnalyticalSize({ repositoryId: 17, path: 'a.txt', observedAt: '2026-08-31T00:00:00.000Z', revision: revisions[0], size: 100 });
    // The collector's own post-merge capture, at the last merged revision.
    const capture = providerDouble({ heads: [r4] });
    await captureDefaultBranchSizes({ client: capture.client, store, repositoryId: 17, now: () => clock.value });

    clock.value = '2026-10-01T00:00:03.000Z';
    const requests = [];
    const fetch = async (url, init = {}) => {
      const route = new URL(String(url)).pathname;
      requests.push({ method: init.method ?? 'GET', route, body: init.body });
      if (route === '/app/installations/9/access_tokens') return new Response(JSON.stringify({ token: 'read-token', expires_at: new Date(Date.now() + 60_000).toISOString() }), { status: 201 });
      if (route === '/repositories/17') return new Response(JSON.stringify({ id: 17, full_name: 'owner/repo', default_branch: 'main' }));
      if (route === '/repos/owner/repo/branches/main') return new Response(JSON.stringify({ commit: { sha: r4 } }));
      return new Response('{}', { status: 404 });
    };
    const observer = createAnalyticalSizeObserver({ GITHUB_APP_ID: '123', GITHUB_APP_PRIVATE_KEY: 'not-used-by-fixture' },
      { store, installationOf: async () => 9, createJwt: async () => 'app-jwt', fetch });
    const service = createAnalyticalDataService({ store, authorize: async () => true, currentPolicy: async () => null, namespace: async () => 9,
      entitlement: async () => 'pro', observeCurrentSizes: observer, now: () => clock.value });
    const worker = createGitHubAppWorker({ authorization: { analyticalQuery: async ({ query }) => ({ body: await service.query(query, actor), headers: {} }) } });
    const response = await worker.fetch(new Request('https://app.example.test/api/analytics', { method: 'POST',
      headers: { cookie: '__Host-diffdevil-session=fixture', origin: 'https://app.example.test', 'content-type': 'application/json' },
      body: JSON.stringify(query('files', { metric: 'turnover', to: '2026-10-01T00:00:00.000Z' })) }), {});
    assert.equal(response.status, 200);
    const body = await response.json();
    const file = body.result.files.find(row => row.path === 'a.txt');
    assert.equal(file.turnover.status, 'exact');
    assert.equal(file.turnover.lower, 0.02);
    assert.equal(body.sizeObservation[0].standing, 'observed');
    assert.deepEqual([body.sizeObservation[0].openTails, body.sizeObservation[0].closedTails], [2, 2], 'both returned files close from the one branch observation');
    assert.deepEqual(body.sizeObservation[0].paths, { reused: 2, read: 0, notContinuous: 0, persisted: 0 });
    assert.deepEqual(requests.map(value => `${value.method} ${value.route}`), ['POST /app/installations/9/access_tokens', 'GET /repositories/17',
      'GET /repos/owner/repo/branches/main', 'GET /repos/owner/repo/branches/main']);
    assert.deepEqual(JSON.parse(requests[0].body), { repository_ids: [17], permissions: { contents: 'read' } });
  } finally { await runtime.dispose(); }
});
