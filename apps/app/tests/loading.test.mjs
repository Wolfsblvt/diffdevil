// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyticalRoute, openAnalyticalShell } from '../src/lib/analytical-request.mjs';
import { createContextCache } from '../src/lib/viewer.mjs';
import { loadView } from '../src/lib/view.mjs';
import { analyticalAcquisitionKey } from '../src/lib/scope.mjs';

test('only the six analytical routes enter the progressive document path', () => {
  for (const path of ['/', '/prs', '/history', '/files', '/pr/owner/repo/12', '/file/owner/repo/' + 'a'.repeat(22)]) assert.ok(analyticalRoute(path));
  for (const path of ['/manage', '/api/analytics', '/auth/session', '/render/analytical-shell', '/file/owner/repo/path.ts']) assert.equal(analyticalRoute(path), null);
});

test('only Files-local query/page edits preserve an acquisition; population and latest-navigation identities remain distinct', () => {
  const url = new URL('https://app.example/files?s=reader%2Frepo&per=7d&m=changed&sel=' + 'a'.repeat(22) + '&q=before&page=2');
  const edited = new URL(url);
  edited.searchParams.set('q', 'after'.repeat(60)); edited.searchParams.set('page', '8'); edited.hash = 'ranked';
  edited.searchParams.sort();
  assert.equal(analyticalAcquisitionKey(edited), analyticalAcquisitionKey(url));
  for (const [key, value] of [['s', 'reader/other'], ['per', '90d'], ['m', 'turnover'], ['sel', 'b'.repeat(22)], ['sort', 'changed']]) {
    const changed = new URL(edited); changed.searchParams.set(key, value);
    assert.notEqual(analyticalAcquisitionKey(changed), analyticalAcquisitionKey(url), key);
  }
  for (const pathname of ['/prs', '/history', '/file/reader/repo/' + 'a'.repeat(22)]) {
    const original = new URL(url), localEdit = new URL(edited);
    original.pathname = pathname; localEdit.pathname = pathname;
    assert.notEqual(analyticalAcquisitionKey(original), analyticalAcquisitionKey(localEdit), pathname);
  }
});

test('the generic protected shell needs a live local session, never provider or analytical reads', async () => {
  const runtime = { auth: { async serviceConnection({ session }) { assert.equal(session, 'fixture'); } }, provider: new Proxy({}, { get() { throw new Error('Provider data cannot gate the shell'); } }), store: new Proxy({}, { get() { throw new Error('Analytical D1 cannot gate the shell'); } }) };
  assert.equal(await openAnalyticalShell(new Request('https://app.example/'), runtime, () => 'fixture', 'session'), null);
  runtime.auth.serviceConnection = async () => { throw Object.assign(new Error('revoked'), { code: 'E_SESSION_UNAVAILABLE' }); };
  assert.equal(await openAnalyticalShell(new Request('https://app.example/'), runtime, () => 'fixture', 'session'), 'E_SESSION_UNAVAILABLE');
});

test('concurrent navigation and population share one pending provider read, and failures remain retryable', async () => {
  const cache = createContextCache();
  let release, calls = 0;
  const gate = new Promise(resolve => { release = resolve; });
  const load = async () => { calls++; await gate; return ['current-repository']; };
  const first = cache.get('repositories:123:9', load), second = cache.get('repositories:123:9', load);
  release();
  assert.deepEqual(await Promise.all([first, second]), [['current-repository'], ['current-repository']]);
  assert.equal(calls, 1);
  await assert.rejects(cache.get('profile:456', async () => { throw new Error('unavailable'); }));
  assert.equal(await cache.get('profile:456', async () => 'recovered'), 'recovered');
  assert.equal(await cache.get('repositories:456:9', async () => 'other-user'), 'other-user');
});

test('a failed analytical population cannot reach the chart renderer as an empty count', async () => {
  const repository = { repositoryId: 1, owner: 'reader', fullName: 'reader/repo', standing: { historyReadable: true } };
  const runtime = { now: () => '2026-10-21T00:00:00.000Z', store: {
    analyticalCoverage: async () => ({ counts: new Map([[1, 3]]) }), observationBounds: async () => ({}) },
    cache: createContextCache(), analytics: { query: async () => { throw new Error('D1 unavailable'); } } };
  const viewer = { userId: 123, plan: 'Free', namespaces: [], repositories: [repository] };
  await assert.rejects(loadView({ url: new URL('https://app.example/'), viewer, session: { reads: { recentPullRequests: async () => ({ pullRequests: [] }) } }, runtime }), { code: 'E_ANALYTICAL_UNAVAILABLE' });
});

test('file detail separates retained identity from selected-period rows while retaining broader navigation context', async () => {
  const repositories = [1, 2].map(repositoryId => ({ repositoryId, owner: 'reader', fullName: `reader/repo${repositoryId}`, standing: { historyReadable: true } }));
  let requested, hasSelectedPeriodActivity = false;
  const runtime = { now: () => '2026-10-21T00:00:00.000Z', store: {
    analyticalCoverage: async ids => { assert.deepEqual(ids, [2]); return { counts: new Map([[2, 3]]) }; }, observationBounds: async () => ({}) },
    cache: createContextCache(), premium: { provided: false }, locator: { plausible: () => true, resolve: async (_locator, rows) => rows[0] },
    analytics: { service: { fileCandidates: () => [{ repositoryId: 2, path: 'src/selected.ts', hasSelectedPeriodActivity }] }, query: async input => { requested = input; return { result: { files: [] } }; } } };
  const viewer = { userId: 123, plan: 'Pro', namespaces: [{ login: 'reader', yours: true }], repositories };
  const detail = { repositoryId: 2, fileLocator: 'a'.repeat(22) };
  const url = new URL('https://app.example/file/reader/repo2/' + 'a'.repeat(22) + '?s=all&per=30d');
  const session = { reads: { recentPullRequests: async () => ({ pullRequests: [] }) } };
  const view = await loadView({ url, viewer, session, runtime, surface: 'file', detail });
  assert.equal(requested.surface, 'file', 'detail routing does not enter the Files aggregation surface');
  assert.deepEqual(requested.repositoryIds, [2]);
  assert.deepEqual(requested.scope, { kind: 'repository', repositoryId: 2 });
  assert.equal(view.scope.kind, 'all');
  assert.deepEqual(view.fileIdentity, { repositoryId: 2, path: 'src/selected.ts', hasSelectedPeriodActivity: false });
  assert.equal(view.fileHasSelectedPeriodActivity, false);
  assert.deepEqual(view.files, [], 'a retained identity without a selected-period row is not passed as aggregate detail');
  assert.equal(view.state.per, '30d');

  hasSelectedPeriodActivity = true;
  const activeView = await loadView({ url, viewer, session, runtime, surface: 'file', detail });
  assert.deepEqual(activeView.fileIdentity, { repositoryId: 2, path: 'src/selected.ts', hasSelectedPeriodActivity: true });
  assert.equal(activeView.fileHasSelectedPeriodActivity, true, 'the pathless locator response carries active-period state');
  assert.deepEqual(activeView.files, [], 'pathless locator metadata is not mislabeled as rich aggregate detail');
});

test('invalid file detail does not query a broader analytical population before its not-found page can render', async () => {
  const repository = { repositoryId: 1, owner: 'reader', fullName: 'reader/repo', standing: { historyReadable: true } };
  const runtime = { now: () => '2026-10-21T00:00:00.000Z', store: {
    analyticalCoverage: async ids => ({ counts: new Map(ids.map(id => [id, 3])) }), observationBounds: async () => ({}) },
    cache: createContextCache(), premium: { provided: false },
    analytics: { query: async () => { throw new Error('An invalid detail route must not read another population'); } } };
  const viewer = { userId: 123, plan: 'Pro', namespaces: [], repositories: [repository] };
  const view = await loadView({ url: new URL('https://app.example/file/reader/repo/not-a-locator'), viewer,
    session: { reads: { recentPullRequests: async () => ({ pullRequests: [] }) } }, runtime, surface: 'file',
    detail: { repositoryId: undefined, fileLocator: 'not-a-locator' } });
  assert.deepEqual(view.ids, []);
  assert.equal(view.dataStanding, 'none');
  assert.equal(view.fileIdentity, undefined);
  assert.deepEqual(view.repositories, [repository], 'the authorised navigation remains available');
});
