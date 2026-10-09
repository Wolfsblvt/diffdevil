// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Miniflare } from 'miniflare';
import { analyzeDiff, analyzeChanges, compilePolicy, unwrap } from '@wolfsblvt/diffdevil';
import { createAnalyticalDataService, normalizeAnalyticalRecord, median, turnover } from './analytical-data.mjs';
import { collectAnalyticalPullRequest, observeFileSize, captureDefaultBranchSizes } from './analytical-collection.mjs';
import { D1AppStore } from './storage.mjs';
import { analyticalHttp } from './analytical-http.mjs';
import { createGitHubAppWorker } from './app.mjs';

const base = 'a'.repeat(40), head = 'b'.repeat(40), other = 'c'.repeat(40);
const from = '2026-09-01T00:00:00.000Z', to = '2026-10-01T00:00:00.000Z';
const at = '2026-09-15T00:00:00.000Z';
const patch = 'diff --git a/a.txt b/a.txt\n--- a/a.txt\n+++ b/a.txt\n@@ -1 +1 @@\n-old\n+new\n';
const query = (surface, extra = {}) => ({ version: 1, surface, repositoryIds: [17], from, to, ...extra });
const actor = { userId: 123, authorizedRepositoryIds: [17] };
function record(number = 1, report = unwrap(analyzeDiff(patch, { source: { kind: 'github-api', comparison: 'direct', comparisonId: 'final', base, head } }))) {
  return normalizeAnalyticalRecord({ version: 1, repositoryId: 17, pullRequest: number, state: 'merged', openedAt: from, readyAt: from,
    mergedAt: at, closedAt: at, updatedAt: at, currentHead: other, revisions: [],
    final: report ? { base, head, observedAt: at, report, sizes: [{ path: 'a.txt', before: 100, after: 100 }], basis: 'final-merged-comparison' } : null });
}
function fixture(records = [record()], plan = 'pro') {
  let accesses = true;
  const store = { analyticalRecords: async id => records.filter(row => row.repositoryId === id), analyticalSizes: async () => [] };
  const service = createAnalyticalDataService({ store, authorize: async () => accesses,
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
  assert.equal(detail.result.files[0].included, false);
  const file = await service.query(query('file', { path: 'a.txt' }), actor);
  assert.equal(file.result.cochange.samples, 1, 'co-change excludes unrecovered rows from every denominator');
  assert.equal(file.result.inclusion, 'excluded');
  assert.equal(file.result.contributions[0].prChanged.value, 1, 'file-versus-PR comparison uses the same all-observed quantity');
  assert.equal(file.result.contributions[0].prPolicyChanged.value, 0, 'current-policy totals stay separate');
});

test('Free and unauthorized readers cannot obtain premium names or aggregate file history', async () => {
  const { service, revoke } = fixture(undefined, 'free');
  assert.equal((await service.query(query('files'), actor)).standing, 'plan-required');
  const overview = await service.query(query('overview'), actor);
  assert.deepEqual(overview.result.files, []);
  const detail = await service.query(query('pr', { pullRequest: 1 }), actor);
  assert.equal(detail.result.alsoInProgress, null);
  assert.equal(detail.result.cochange, undefined);
  await assert.rejects(service.query(query('overview'), { authorizedRepositoryIds: [] }), { code: 'E_APP_DATA_UNAUTHORIZED' });
  revoke();
  await assert.rejects(service.query(query('overview'), actor), { code: 'E_APP_DATA_UNAUTHORIZED' });
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
  assert.equal(turnover([{ ...contribution, file: { ...contribution.file, changeType: 'added' } }], { from, to }).reason, 'created-deleted-or-renamed-in-period');
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
    const storedService = createAnalyticalDataService({ store, authorize: async () => true, currentPolicy: async () => null, entitlement: async () => 'pro' });
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
  assert.equal(await observeFileSize({ request: async () => { throw { status: 404 }; } }, 'owner/repo', 'a.txt', base), null, '404 is not proof of absence');
});
