// SPDX-License-Identifier: AGPL-3.0-only
/**
 * The signed-in App against a real local D1 (Miniflare) seeded through the managed App's own
 * write paths, with GitHub replaced by the fixture's wire double. Exercises the sign-in
 * journey end to end, the viewer and scope model, the read store, and the page loader.
 * One seeded database serves the file; the consent-withdrawal case runs last.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { after, test } from 'node:test';
import { Miniflare } from 'miniflare';
import { D1AppStore } from '../../github-app/storage.mjs';
import { createAppRuntime } from '../src/lib/runtime.mjs';
import { authStart, authCallback, authSession, authLogout, openSession, cookieValue, OAUTH_COOKIE, SESSION_COOKIE } from '../src/lib/routes.mjs';
import { resolveViewer, scopeRepositories, loadLifecycle } from '../src/lib/viewer.mjs';
import { loadView, entitlementFor } from '../src/lib/view.mjs';
import { describeScope } from '../src/lib/scope.mjs';
import { createFakeGitHub, seedStore, NOW, REPOSITORIES, CODE } from '../qa/fixture.mjs';

const migrationNames = ['0001_initial.sql', '0002_consent-provenance.sql', '0003_preserve-active-consent.sql', '0004_admission-settings.sql', '0005_offboarding-consent-tombstones.sql', '0006_user-authorization.sql', '0007_consent-actors.sql'];
const ORIGIN = 'http://127.0.0.1:4412';

let shared;
async function fixture() {
  shared ??= (async () => {
    const clock = { value: NOW };
    const runtime = new Miniflare({ workers: [{
      config: { name: 'app-test', type: 'worker', compatibilityDate: '2026-09-17', env: { APP_DB: { type: 'd1', id: `app-${crypto.randomUUID()}` } }, manifest: { mainModule: 'worker.mjs', modulesRoot: resolve('.'), modules: { 'worker.mjs': { type: 'esm', contents: 'export default { fetch() { return new Response("ok"); } };' } } } }
    }] });
    try {
      const database = await runtime.getD1Database('APP_DB');
      const appStore = new D1AppStore(database, { now: () => clock.value });
      for (const name of migrationNames) await appStore.migrate(await readFile(resolve('apps/github-app/migrations', name), 'utf8'));
      const written = await seedStore(appStore, clock);
      const github = createFakeGitHub();
      const env = { APP_DB: database, APP_ORIGIN: ORIGIN, APP_SEAL_KEY: 'fixture-seal-key-with-enough-length', GITHUB_OAUTH_CLIENT_ID: 'fixture-client', GITHUB_OAUTH_CLIENT_SECRET: 'fixture-secret-private', GITHUB_API_BASE: 'http://github.invalid', GITHUB_OAUTH_BASE: 'http://github.invalid' };
      const app = entitlement => { const composed = createAppRuntime({ ...env, ...(entitlement ? { APP_ENTITLEMENT_FIXTURE: JSON.stringify(entitlement) } : {}) }, { fetch: github.fetch, now: () => clock.value }); composed.cache.clear(); return composed; };
      return { runtime, app, github, clock, written, env };
    } catch (error) { await runtime.dispose(); throw error; }
  })();
  return shared;
}
after(async () => { if (shared) await (await shared).runtime.dispose(); });

async function signIn(app) {
  const started = await authStart(new Request(`${ORIGIN}/auth/start`), app);
  assert.equal(started.status, 303);
  const destination = new URL(started.headers.get('location'));
  assert.equal(destination.origin, 'https://github.com');
  const state = destination.searchParams.get('state');
  const oauthCookie = started.headers.get('set-cookie').match(/^__Host-diffdevil-oauth=([^;]+)/u)[1];
  const callback = await authCallback(new Request(`${ORIGIN}/auth/callback?state=${state}&code=${CODE}`, { headers: { cookie: `${OAUTH_COOKIE}=${oauthCookie}` } }), app);
  assert.equal(callback.status, 200);
  const html = await callback.text();
  const artifact = /name="artifact" value="([^"]+)"/u.exec(html)[1];
  const form = new URLSearchParams({ artifact, return: 'app' });
  const session = await authSession(new Request(`${ORIGIN}/auth/session`, { method: 'POST', body: form, headers: { origin: ORIGIN, 'content-type': 'application/x-www-form-urlencoded' } }), app);
  assert.equal(session.status, 303);
  assert.equal(session.headers.get('location'), '/');
  const cookie = session.headers.get('set-cookie').match(/^__Host-diffdevil-session=([^;]+)/u)[1];
  return { cookie, html };
}

test('the sign-in journey issues an opaque session, refuses foreign posts and signs out cleanly', async () => {
  const { app: compose, github } = await fixture();
  const app = compose();
  const { cookie, html } = await signIn(app);
  assert.ok(html.includes('action="/auth/session"'), 'the continuation page posts the one-time artifact');
  assert.equal(html.includes(CODE), false, 'the provider code is not echoed');
  const request = new Request(`${ORIGIN}/`, { headers: { cookie: `${SESSION_COOKIE}=${cookie}` } });
  assert.equal(cookieValue(request, SESSION_COOKIE), cookie);
  const opened = await openSession(request, app);
  assert.equal(opened.actor.userId, 123);
  assert.equal(github.calls.some(call => call.path === '/login/oauth/access_token'), true);
  const foreign = await authSession(new Request(`${ORIGIN}/auth/session`, { method: 'POST', body: new URLSearchParams({ artifact: 'x'.repeat(43), return: 'app' }), headers: { origin: 'https://evil.example' } }), app);
  assert.equal(new URL(foreign.headers.get('location'), ORIGIN).searchParams.get('reason'), 'E_AUTH_ORIGIN');
  assert.equal((await openSession(new Request(`${ORIGIN}/`), app)).refusal, 'E_SESSION_UNAVAILABLE');
  const out = await authLogout(new Request(`${ORIGIN}/auth/logout`, { method: 'POST', headers: { origin: ORIGIN, cookie: `${SESSION_COOKIE}=${cookie}` } }), app);
  assert.equal(out.headers.get('location'), '/sign-in');
  assert.equal((await openSession(request, app)).refusal, 'E_SESSION_UNAVAILABLE');
});

test('the viewer sees GitHub-reachable repositories with their App standing, grouped into yours and shared', async () => {
  const { app: compose } = await fixture();
  const app = compose();
  const { cookie } = await signIn(app);
  const opened = await openSession(new Request(`${ORIGIN}/`, { headers: { cookie: `${SESSION_COOKIE}=${cookie}` } }), app);
  const viewer = await resolveViewer({ reads: opened.reads, actor: opened.actor, store: app.store, entitlement: app.entitlement, cache: app.cache });
  assert.equal(viewer.login, 'ada-sample');
  assert.equal(viewer.repositories.length, REPOSITORIES.length);
  assert.deepEqual(viewer.namespaces.filter(namespace => namespace.yours).map(namespace => namespace.login), ['ada-sample', 'parser-guild']);
  assert.deepEqual(viewer.namespaces.filter(namespace => !namespace.yours).map(namespace => namespace.login).sort(), ['kai-sample', 'northwind-tools']);
  const standing = Object.fromEntries(viewer.repositories.map(repository => [repository.fullName, repository.status]));
  assert.equal(standing['parser-guild/parser-lab'], 'history');
  assert.equal(standing['parser-guild/grammar-fuzz'], 'history-off');
  assert.equal(standing['ada-sample/notes-site'], 'labels-only');
  assert.equal(viewer.plan, 'Free');
  assert.equal(viewer.entitlementSource, 'none-connected');
  assert.equal(scopeRepositories(viewer, describeScope('@parser-guild')).length, 3);
  assert.equal(scopeRepositories(viewer, describeScope('someone/else')).length, 0);
  const lifecycle = await loadLifecycle({ reads: opened.reads, repositories: scopeRepositories(viewer, describeScope('parser-guild/parser-lab')), cache: app.cache, userId: viewer.userId });
  assert.equal(lifecycle.standing, 'available');
  assert.ok(lifecycle.all.length > 0);
});

test('the read store serves history only for consenting repositories and the page loader derives named populations', async () => {
  const { app: compose, github, written } = await fixture();
  const app = compose({ 'ada-sample': 'Pro', 'northwind-tools': 'Business' });
  assert.ok(written > 20, `fixture wrote ${written} analyses`);
  const ids = REPOSITORIES.map(repository => repository.repositoryId);
  const standings = await app.store.repositoryStandings(ids);
  assert.equal(standings.get(1003).historyEnabled, false);
  assert.equal(standings.get(1001).historyEnabled, true);
  const analyses = await app.store.analyses(ids, '2026-09-01T00:00:00.000Z', NOW);
  assert.ok(analyses.records.length > 0);
  assert.equal(analyses.records.every(record => record.repositoryId !== 1003), true);
  assert.equal(analyses.records[0].files.length > 0, true);
  assert.equal(JSON.stringify(analyses.records).includes('src/parser.ts'), false, 'paths never reach the App from history');
  const { cookie } = await signIn(app);
  const opened = await openSession(new Request(`${ORIGIN}/`, { headers: { cookie: `${SESSION_COOKIE}=${cookie}` } }), app);
  const viewer = await resolveViewer({ reads: opened.reads, actor: opened.actor, store: app.store, entitlement: app.entitlement, cache: app.cache });
  assert.equal(viewer.plan, 'Pro');
  const view = await loadView({ url: new URL(`${ORIGIN}/?s=parser-guild%2Fparser-lab&per=90d`), viewer, session: opened, runtime: app });
  assert.equal(view.scope.kind, 'repository');
  assert.equal(view.current.lifecycle.standing, 'available');
  assert.ok(view.current.merged > 0);
  assert.ok(view.current.analysedCount > 0);
  assert.ok(view.current.mergedRecovered <= view.current.merged);
  assert.equal(view.entitlement.premium, true, 'your own namespaces follow the viewer plan');
  const shared = entitlementFor(viewer, describeScope('@northwind-tools'), scopeRepositories(viewer, describeScope('@northwind-tools')));
  assert.equal(shared.plan, 'Business');
  const freeViewer = { ...viewer, plan: 'Free' };
  assert.equal(entitlementFor(freeViewer, describeScope('all'), viewer.repositories).premium, false, 'all-repository premium aggregates follow the viewer plan');
  assert.deepEqual(entitlementFor(freeViewer, describeScope('all'), viewer.repositories).sharedPaid, ['northwind-tools']);
  assert.equal(entitlementFor(freeViewer, describeScope('@kai-sample'), scopeRepositories(viewer, describeScope('@kai-sample'))).premium, false);
  github.state.rateLimited = true;
  app.cache.clear();
  const limited = await loadLifecycle({ reads: opened.reads, repositories: view.repositories, cache: app.cache, userId: viewer.userId });
  assert.equal(limited.standing, 'unavailable');
  assert.match(limited.reason, /rate limit/u);
  github.state.rateLimited = false;
  const bounded = [...view.pullRequests.values()].filter(pr => pr.latest.changed.status === 'bounded');
  assert.ok(bounded.length > 0, 'bounded specimens survive into the view');
  assert.ok([...view.pullRequests.values()].some(pr => pr.latest.band.standing === 'recorded'));
  assert.ok([...view.pullRequests.values()].some(pr => pr.latest.band.standing === 'derived'));
  const detail = await app.store.pullRequestAnalyses(1001, [...view.pullRequests.values()][0].number);
  assert.ok(detail.length >= 1);
  assert.equal(detail[0].observedAt <= detail.at(-1).observedAt, true);
});

test('a withdrawn consent stops serving that repository', async () => {
  const { app: compose } = await fixture();
  const app = compose();
  const before = await app.store.analyses([1002], '2026-01-01T00:00:00.000Z', NOW);
  assert.ok(before.records.length > 0);
  await app.appStore.setRepositoryConsent(1002, { enabled: false, origin: 'fixture' });
  const after = await app.store.analyses([1002], '2026-01-01T00:00:00.000Z', NOW);
  assert.equal(after.records.length, 0);
  assert.deepEqual(await app.store.observationBounds([1002]), { first: null, latest: null });
});
