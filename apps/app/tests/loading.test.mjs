// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyticalRoute, openAnalyticalShell } from '../src/lib/analytical-request.mjs';
import { createContextCache } from '../src/lib/viewer.mjs';
import { loadView } from '../src/lib/view.mjs';

test('only the six analytical routes enter the progressive document path', () => {
  for (const path of ['/', '/prs', '/history', '/files', '/pr/owner/repo/12', '/file/owner/repo/' + 'a'.repeat(22)]) assert.ok(analyticalRoute(path));
  for (const path of ['/manage', '/api/analytics', '/auth/session', '/render/analytical-shell', '/file/owner/repo/path.ts']) assert.equal(analyticalRoute(path), null);
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
