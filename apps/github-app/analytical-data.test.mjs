// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Miniflare } from 'miniflare';
import { analyzeChanges, analyzeDiff, unwrap } from '@wolfsblvt/diffdevil';
import { createAnalyticalDataService, normalizeAnalyticalRecord, median, turnover, fileContinuity } from './analytical-data.mjs';
import { collectAnalyticalPullRequest, observeFileSize, captureDefaultBranchSizes, recoverFinalComparison, mergedCommit } from './analytical-collection.mjs';
import { D1AppStore } from './storage.mjs';
import { analyticalHttp } from './analytical-http.mjs';
import { createGitHubAppWorker } from './app.mjs';
import { base, head, other, from, to, at, patch, query, actor, record, fixture, revisions, transition } from './analytical-data.fixtures.mjs';

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
  for (const surface of ['prs', 'history', 'pr']) {
    const result = await service.query(query(surface, { pullRequest: 1, path: 'a.txt' }), actor);
    assert.equal(result.surface, surface);
    assert.equal(result.coverage.completeWindow, false);
  }
  // An entitled reader of a Community service gets the truthful standing, not an empty result or a zero.
  for (const surface of ['files', 'file']) {
    const result = await service.query(query(surface, { path: 'a.txt' }), actor);
    assert.equal(result.surface, surface);
    assert.equal(result.standing, 'premium-not-provided');
    assert.equal(result.entitlements.premium.enabled, true);
    assert.equal(result.entitlements.premium.provided, false);
    assert.deepEqual(result.result.files, []);
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
  assert.equal(detail.result.alsoInProgress, null, 'file context is the premium extension\'s');
  assert.equal(detail.result.cochange, undefined);
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

test('scope selects namespace versus viewer entitlement and gives a Free reader the funded namespaces to point to', async () => {
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
  const request = scope => query('overview', { repositoryIds: [17, 18, 19, 20], scope });
  const namespace = await service.query(request({ kind: 'namespace', namespaceId: 9 }), reader);
  assert.equal(namespace.entitlements.aggregatePlan, 'pro');
  assert.deepEqual(namespace.entitlements.premium.repositoryIds, [17, 18]);
  assert.equal(namespace.coverage.authorizedRepositories, 3);
  assert.equal(namespace.coverage.representedRepositories, 2);
  assert.equal(namespace.entitlements.repositories.some(row => row.repositoryId === 20), false);
  const withoutDenied = await service.query({ ...request({ kind: 'namespace', namespaceId: 9 }), repositoryIds: [17, 18, 19] }, reader);
  assert.equal(withoutDenied.entitlements.aggregatePlan, namespace.entitlements.aggregatePlan, 'an inaccessible repository does not change the plan');
  const allFree = await service.query(request({ kind: 'all' }), reader);
  assert.equal(allFree.entitlements.premium.enabled, false);
  assert.deepEqual(allFree.fundedNamespaces, [{ namespaceId: 9, repositoryIds: [17, 18], plan: 'pro' }]);
  const oneRepoAll = await service.query(query('files', { repositoryIds: [17], scope: { kind: 'all' } }), reader);
  assert.equal(oneRepoAll.standing, 'free', 'All follows the viewer even with only one repository');
  viewerPlan = 'pro';
  const allPaid = await service.query(request({ kind: 'all' }), reader);
  assert.deepEqual(allPaid.entitlements.premium.repositoryIds, [17, 18]);
  assert.equal(allPaid.entitlements.premium.excludedFreeRepositories, 1);
  assert.equal(allPaid.result.overview.mergedPullRequests, 3, 'basic aggregates still include authorized Free repositories');
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

test('default-branch size observation publishes immutable sizes and refuses a moved branch', async () => {
  let changed = false, branchReads = 0;
  const writes = [];
  const client = { json: async route => route.startsWith('/repositories/') ? { id: 17, full_name: 'owner/repo', default_branch: 'main' }
    : { commit: { sha: changed && ++branchReads > 1 ? other : head } }, request: async () => ({ text: 'one\ntwo\n' }) };
  const store = { historySettings: async () => ({ enabled: true }), analyticalRecords: async () => [record()], analyticalSizesAt: async () => [],
    recordAnalyticalSizes: async values => { writes.push(...values); return { status: 'published', published: values.length }; } };
  assert.equal((await captureDefaultBranchSizes({ client, store, repositoryId: 17, now: () => to })).files, 1);
  assert.deepEqual(writes[0], { repositoryId: 17, path: 'a.txt', revision: head, size: 2, observedAt: to, captureSince: to });
  changed = true; branchReads = 0; writes.length = 0;
  await assert.rejects(captureDefaultBranchSizes({ client, store, repositoryId: 17, now: () => to }), { code: 'E_APP_DATA_STALE' });
  assert.equal(writes.length, 0);
});

test('a capture larger than its allowance continues in parts that repeat nothing, reuse immutable sizes and follow one revision', async () => {
  const paths = Array.from({ length: 250 }, (_, index) => `src/f${String(index).padStart(3, '0')}.ts`);
  const report = unwrap(analyzeChanges(paths.map(path => ({ path, changeType: 'modified', kind: 'text', additions: 1, deletions: 1 })),
    { source: { kind: 'github-api', comparison: 'direct', comparisonId: 'final', base, head } }));
  let branch = head, enabled = true, now = '2026-10-01T00:00:00.000Z';
  const reads = [], rows = [{ path: paths[0], observedAt: '2026-09-01T00:00:00.000Z', revision: head, size: 7 }];
  const client = { json: async route => route.startsWith('/repositories/') ? { id: 17, full_name: 'owner/repo', default_branch: 'main' } : { commit: { sha: branch } },
    request: async route => { reads.push(route); return { text: 'one\ntwo\n' }; } };
  const merged = normalizeAnalyticalRecord({ ...record(), final: { ...record().final, report, sizes: [] } });
  const store = { historySettings: async () => ({ enabled }), analyticalRecords: async () => [merged],
    analyticalSizesAt: async (_, revision, { captureSince } = {}) => rows.filter(row => row.revision === revision)
      .map(row => ({ ...row, captured: row.captureSince === captureSince })),
    recordAnalyticalSizes: async values => enabled ? (rows.push(...values), { status: 'published', published: values.length }) : { status: 'disabled' } };
  // The first part may spend on 120 paths: one full chunk and 20 more.
  let budget = 120;
  const first = await captureDefaultBranchSizes({ client, store, repositoryId: 17, now: () => now, proceed: () => budget-- > 0 });
  assert.equal(first.status, 'continued');
  assert.deepEqual([first.files, first.remaining, first.revision, first.since], [120, 130, head, now]);
  assert.equal(first.reused, 1, 'a size retained at the same immutable revision is not read again');
  assert.equal(reads.length, 119);
  assert.equal(rows.filter(row => row.observedAt === now).length, 120);

  // A later complete capture cannot claim this unfinished capture's remaining paths.
  now = '2026-10-01T00:00:02.000Z';
  assert.equal((await captureDefaultBranchSizes({ client, store, repositoryId: 17, now: () => now })).files, 250);

  // The next part captures exactly what remains at the pinned revision.
  now = '2026-10-01T00:00:05.000Z';
  const second = await captureDefaultBranchSizes({ client, store, repositoryId: 17, revision: first.revision, since: first.since, now: () => now });
  assert.deepEqual([second.status, second.files, second.remaining], ['observed', 130, 0]);
  const captured = rows.filter(row => row.revision === head && row.captureSince === first.since);
  assert.deepEqual(captured.map(row => row.path).toSorted(), paths, 'every known path is observed once by the chain');
  // Running a finished part again repeats nothing.
  assert.equal((await captureDefaultBranchSizes({ client, store, repositoryId: 17, revision: head, since: first.since, now: () => now })).files, 0);

  // A pinned revision the branch has left ends the chain; a withdrawal stops it without writing.
  branch = other;
  await assert.rejects(captureDefaultBranchSizes({ client, store, repositoryId: 17, revision: head, since: first.since, now: () => now }), { code: 'E_APP_DATA_STALE' });
  const before = rows.length;
  enabled = false;
  assert.deepEqual(await captureDefaultBranchSizes({ client, store, repositoryId: 17, now: () => now }), { status: 'disabled' });
  assert.equal(rows.length, before);
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

test('current API merged identities require the matching timeline event, with pagination and no guessed head', async () => {
  const pull = { number: 1, merged_at: at, head: { sha: other } };
  let events = [{ event: 'merged', created_at: at, commit_id: head }];
  const pages = [];
  const client = { json: async route => { pages.push(route); return route.endsWith('page=1') ? Array(100).fill({ event: 'commented' }) : events; } };
  assert.equal(await mergedCommit(client, 'owner/repo', pull), head);
  assert.equal(pages.length, 2);
  events = [];
  assert.equal(await mergedCommit(client, 'owner/repo', pull), null);
  events = [{ event: 'merged', created_at: from, commit_id: head }];
  assert.equal(await mergedCommit(client, 'owner/repo', pull), null);
  events = [{ event: 'merged', created_at: at, commit_id: head }, { event: 'merged', created_at: at, commit_id: other }];
  assert.equal(await mergedCommit(client, 'owner/repo', pull), null);
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
