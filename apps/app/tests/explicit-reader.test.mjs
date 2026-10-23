// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createGitHubAppWorker } from '../../github-app/app.mjs';
import { createAppRuntime } from '../src/lib/runtime.mjs';
import { openSession, SESSION_COOKIE } from '../src/lib/routes.mjs';
import { resolveViewer } from '../src/lib/viewer.mjs';
import { loadView, namespacePlan } from '../src/lib/view.mjs';
import { analyticalRepositoryNames } from '../src/lib/analytical-request.mjs';
import { INSTALLATIONS } from '../qa/fixture.mjs';
import { COMMERCIAL_PRO } from '../qa/manage.mjs';
import { fixture, disposeFixture, signIn, ORIGIN, NOW } from './support.mjs';

after(disposeFixture);

test('a pull-only Free reader resolves an explicit connected funded repository omitted by installation enumeration', async () => {
  const { env, github, clock } = await fixture();
  github.state.roles.set('parser-guild', 'member');
  const direct = { id: 1001, name: 'parser-lab', full_name: 'parser-guild/parser-lab', private: true,
    owner: { id: 7001, login: 'parser-guild', type: 'Organization' }, permissions: { pull: true, push: false, admin: false } };
  const directReads = [];
  const app = createAppRuntime({ ...env, APP_ENTITLEMENT_FIXTURE: JSON.stringify({ 123: 'Free', 7001: 'Pro' }) }, {
    now: () => clock.value,
    fetch: (input, init) => {
      const url = new URL(input);
      if (url.pathname === '/user/installations') return Promise.resolve(Response.json({ installations: [] }));
      if (url.pathname === '/repos/parser-guild/parser-lab') {
        directReads.push(init.headers.authorization);
        return Promise.resolve(Response.json(direct));
      }
      return github.fetch(input, init);
    }
  });
  app.cache.clear();
  const { cookie } = await signIn(app);
  const opened = await openSession(new Request(`${ORIGIN}/?s=parser-guild/parser-lab`, { headers: { cookie: `${SESSION_COOKIE}=${cookie}` } }), app);
  const viewer = await resolveViewer({ reads: opened.reads, actor: opened.actor, store: app.store, entitlement: app.entitlement,
    cache: app.cache, explicitRepositories: ['parser-guild/parser-lab'] });
  assert.deepEqual(viewer.repositories.map(row => row.repositoryId), [1001]);
  assert.equal(viewer.plan, 'Free');
  assert.equal(viewer.namespaces[0].plan, 'Pro');
  assert.equal(viewer.repositories[0].canAdminister, false);
  assert.equal(viewer.repositories[0].canWrite, false);
  const model = await loadView({ url: new URL(`${ORIGIN}/?s=parser-guild/parser-lab`), viewer, session: opened, runtime: app });
  assert.ok(model.data, 'the actual analytical loader reaches the retained population');
  assert.ok(directReads.length > 0, 'the explicit identity uses the signed-in GitHub grant');
});

const fullName = 'parser-guild/parser-lab';
async function readerFixture() {
  const { env, github, clock } = await fixture();
  github.state.installations = [];
  github.state.inaccessibleRepositoryIds.clear(); github.state.repositoryStatus.clear();
  github.state.push.set(1001, false); github.state.admin.set(1001, false);
  github.state.roles.set('parser-guild', 'member');
  const app = createAppRuntime({ ...env, APP_ENTITLEMENT_FIXTURE: JSON.stringify({ 123: 'Free', 7001: 'Pro' }) }, {
    now: () => clock.value, fetch: github.fetch
  });
  app.cache.clear();
  const { cookie } = await signIn(app);
  const opened = await openSession(new Request(ORIGIN, { headers: { cookie: `${SESSION_COOKIE}=${cookie}` } }), app);
  const viewer = names => resolveViewer({ reads: opened.reads, actor: opened.actor, store: app.store, entitlement: app.entitlement,
    cache: app.cache, explicitRepositories: names });
  const worker = createGitHubAppWorker({ authorization: app.auth });
  const api = (patch = {}) => {
    const query = { version: 1, surface: 'overview', repositoryIds: [1001], repositoryIdentities: [{ repositoryId: 1001, fullName }],
      scope: { kind: 'repository', repositoryId: 1001 }, from: '2026-01-01T00:00:00.000Z', to: NOW, ...patch };
    return worker.fetch(new Request(`${ORIGIN}/api/analytics?query=${encodeURIComponent(JSON.stringify(query))}`,
      { headers: { cookie: `${SESSION_COOKIE}=${cookie}` } }), {});
  };
  return { app, github, cookie, opened, viewer, api };
}

test('the actual analytical HTTP caller uses current pull access and namespace funding without granting Manage or All premium', async () => {
  const f = await readerFixture();
  const viewer = await f.viewer([fullName]);
  assert.equal(viewer.namespaces[0].yours, false);
  const model = await loadView({ url: new URL(`${ORIGIN}/?s=${fullName}`), viewer, session: f.opened, runtime: f.app });
  assert.equal(model.entitlement.plan, 'Pro');
  assert.equal(model.entitlement.premium, true);
  const response = await f.api();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  const body = await response.json();
  assert.deepEqual(body.repositoryIdentities, [{ repositoryId: 1001, fullName }]);
  assert.equal(body.entitlements.aggregatePlan, 'pro');
  assert.equal(body.entitlements.premium.enabled, true);
  const all = await (await f.api({ scope: { kind: 'all' } })).json();
  assert.equal(all.entitlements.aggregatePlan, 'free');
  assert.equal(all.entitlements.premium.enabled, false);
  await assert.rejects(f.app.auth.readAdmission({ session: f.cookie, repositoryId: 1001 }), { code: 'E_ADMISSION_UNAUTHORIZED' });
  assert.equal(f.github.state.installationTokens.length, 0, 'reader authorization never borrows an installation credential');
});

test('a warm viewer never caches explicit authority and backend reads recheck refusals, unknowns and revocation', async () => {
  const f = await readerFixture();
  await f.viewer([fullName]);
  for (const [status, code] of [[403, 'E_PROVIDER_REQUEST'], [429, 'E_GITHUB_RATE_LIMIT'], [503, 'E_PROVIDER_REQUEST']]) {
    f.github.state.repositoryStatus.set(1001, status);
    await assert.rejects(f.viewer([fullName]), { code });
    const response = await f.api();
    assert.equal(response.status, 503);
    const body = await response.json();
    assert.equal(body.result, undefined);
    assert.equal(body.repositoryIdentities, undefined);
  }
  f.github.state.repositoryStatus.set(1001, 404);
  const unavailable = await f.viewer([fullName]);
  assert.deepEqual(unavailable.repositories, []);
  const model = await loadView({ url: new URL(`${ORIGIN}/?s=${fullName}`), viewer: unavailable, session: f.opened, runtime: f.app });
  assert.equal(model.scopeUnavailable, true);
  assert.equal(model.dataStanding, 'scope-unavailable');
  assert.equal(model.data, null);
  assert.equal((await f.api()).status, 403);
  f.github.state.repositoryStatus.clear();
  assert.deepEqual((await f.viewer([fullName])).repositories.map(repository => repository.repositoryId), [1001]);
  assert.equal((await f.api()).status, 200);
  f.github.state.tokenValid = false;
  try { assert.equal((await f.api()).status, 401); }
  finally { f.github.state.tokenValid = true; }
});

test('names cannot grant an inaccessible sibling or an unconnected repository', async () => {
  const f = await readerFixture();
  f.github.state.inaccessibleRepositoryIds.add(1003);
  assert.deepEqual((await f.viewer(['parser-guild/grammar-fuzz'])).repositories, []);
  const response = await f.api({ repositoryIds: [1003], scope: { kind: 'repository', repositoryId: 1003 }, repositoryIdentities: [{ repositoryId: 1003, fullName }] });
  assert.equal(response.status, 403, 'a readable name with the wrong numeric ID grants nothing');
  f.github.state.extraRepositories.push({ repositoryId: 999999, installationId: 10, fullName: 'parser-guild/unconnected', private: false, admin: false });
  try { assert.deepEqual((await f.viewer(['parser-guild/unconnected'])).repositories, []); }
  finally { f.github.state.extraRepositories.pop(); }
  for (const repositoryIdentities of [[{ repositoryId: 1002, fullName }], [{ repositoryId: 1001, fullName: 'https://other.example/repository' }],
    [{ repositoryId: 1001, fullName }, { repositoryId: 1001, fullName }]]) {
    assert.equal((await f.api({ repositoryIdentities })).status, 400);
  }
});

test('ordinary discovery never fans out to targets; only supported explicit analytical URLs name repositories', async () => {
  const f = await readerFixture(), before = f.github.calls.length;
  assert.deepEqual((await f.viewer([])).repositories, []);
  assert.equal(f.github.calls.slice(before).some(call => call.path.startsWith('/repos/')), false);
  for (const path of [`/?s=${fullName}`, `/files?s=${fullName}`, `/pr/${fullName}/24`, `/file/${fullName}/abcdefghijklmnopqrstuv`]) {
    assert.deepEqual(analyticalRepositoryNames(new URL(path, ORIGIN)), [fullName]);
  }
  for (const path of ['/', '/files?s=@parser-guild', '/manage?s=parser-guild/parser-lab', '/api/analytics']) {
    assert.deepEqual(analyticalRepositoryNames(new URL(path, ORIGIN)), []);
  }
  f.github.state.installations = INSTALLATIONS;
  f.app.cache.clear();
  assert.ok((await f.viewer([])).repositories.some(repository => repository.repositoryId === 1001));
  f.github.state.inaccessibleRepositoryIds.add(1001);
  const current = await f.viewer([fullName]);
  assert.equal(current.repositories.some(repository => repository.repositoryId === 1001), false, 'fresh explicit refusal removes the cached target');
  assert.ok(current.repositories.some(repository => repository.repositoryId === 1003), 'other authorized repositories keep their navigation context');
});

test('an explicit reader omitted by discovery keeps actual organisation funding independent of personal Pro and administration', async () => {
  const { env, github, clock } = await fixture();
  github.state.installations = INSTALLATIONS;
  github.state.inaccessibleRepositoryIds.clear();
  github.state.roles.set('parser-guild', 'admin');
  for (const [spec, plan] of [
    [{ ...COMMERCIAL_PRO, capacity: [] }, 'Free'],
    [COMMERCIAL_PRO, 'Pro'],
    [{ ...COMMERCIAL_PRO, capacity: [], others: { 7001: 'unknown' } }, 'Unknown']
  ]) {
    const app = createAppRuntime({ ...env, APP_COMMERCIAL_FIXTURE: JSON.stringify(spec) }, {
      now: () => clock.value,
      fetch: (input, init) => new URL(input).pathname === '/user/installations'
        ? Promise.resolve(Response.json({ installations: [] })) : github.fetch(input, init)
    });
    app.cache.clear();
    const { cookie } = await signIn(app);
    const opened = await openSession(new Request(ORIGIN, { headers: { cookie: `${SESSION_COOKIE}=${cookie}` } }), app);
    const viewer = await resolveViewer({ reads: opened.reads, actor: opened.actor, store: app.store, entitlement: app.entitlement,
      cache: app.cache, explicitRepositories: [fullName] });
    assert.deepEqual(viewer.repositories.map(repository => repository.repositoryId), [1001]);
    assert.equal(viewer.plan, 'Pro');
    assert.equal(viewer.namespaces[0].yours, true, 'current organisation administration still controls placement');
    assert.equal(namespacePlan(viewer, viewer.namespaces[0]), plan);
    const model = await loadView({ url: new URL(`${ORIGIN}/files?s=${fullName}&per=90d`), viewer, session: opened, runtime: app, surface: 'files' });
    assert.equal(model.entitlement.plan, plan);
    assert.equal(model.entitlement.premium, plan === 'Pro');
    if (plan === 'Unknown') assert.equal(model.dataStanding, 'entitlement-unavailable');
  }
});

test('canonical and case-varied history-off links retain the actual namespace plan without an analytical response', async () => {
  const f = await readerFixture();
  const repositoryName = 'parser-guild/grammar-fuzz';
  for (const spelling of [repositoryName, repositoryName.toUpperCase()]) {
    const viewer = await f.viewer([spelling]);
    for (const plan of ['Pro', 'Unknown']) {
      const current = { ...viewer, namespaces: viewer.namespaces.map(namespace => ({ ...namespace, plan })) };
      const model = await loadView({ url: new URL(`${ORIGIN}/files?s=${spelling}`), viewer: current, session: f.opened, runtime: f.app, surface: 'files' });
      assert.deepEqual(model.ids, []);
      assert.equal(model.data, null);
      assert.equal(model.entitlement.plan, plan, `${spelling}: ${plan}`);
      assert.equal(model.scope.namespace, 'parser-guild');
      assert.equal(model.scope.repository, repositoryName);
    }
  }
});

test('namespace continuation carries only the freshly authorised explicit target and drops it on All or another namespace', async () => {
  const f = await readerFixture();
  const viewer = await f.viewer([fullName]);
  const model = await loadView({ url: new URL(`${ORIGIN}/files?s=${fullName}`), viewer, session: f.opened, runtime: f.app, surface: 'files' });
  const continuation = new URL(model.href('/files', { s: '@parser-guild' }), ORIGIN);
  assert.equal(continuation.searchParams.get('r'), fullName);
  const currentViewer = await f.viewer(analyticalRepositoryNames(continuation));
  const current = await loadView({ url: continuation, viewer: currentViewer, session: f.opened, runtime: f.app, surface: 'files' });
  assert.deepEqual(current.ids, [1001]);
  assert.equal(current.namespacePartial, true);
  assert.equal(current.entitlement.plan, 'Pro');
  const across = new URL(current.href('/files', { s: 'all' }), ORIGIN);
  assert.deepEqual(analyticalRepositoryNames(across), []);
  assert.equal(across.searchParams.has('r'), false);
  assert.deepEqual((await f.viewer(analyticalRepositoryNames(across))).repositories, []);
  assert.deepEqual(analyticalRepositoryNames(new URL(current.href('/files', { s: '@northwind-tools' }), ORIGIN)), []);
  assert.deepEqual(analyticalRepositoryNames(new URL(`/files?s=@northwind-tools&r=${fullName}`, ORIGIN)), []);
  assert.deepEqual(analyticalRepositoryNames(new URL(`/files?s=all&r=${fullName}`, ORIGIN)), []);
  f.github.state.repositoryStatus.set(1001, 404);
  const deniedViewer = await f.viewer(analyticalRepositoryNames(continuation));
  const denied = await loadView({ url: continuation, viewer: deniedViewer, session: f.opened, runtime: f.app, surface: 'files' });
  assert.equal(denied.scopeUnavailable, true);
});

test('known funding with history off is a history availability state independent of an absent premium build', async () => {
  const f = await readerFixture();
  const repositoryName = 'parser-guild/grammar-fuzz';
  const viewer = await f.viewer([repositoryName]);
  const model = await loadView({ url: new URL(`${ORIGIN}/files?s=${repositoryName}`), viewer, session: f.opened, runtime: f.app, surface: 'files' });
  assert.equal(model.entitlement.plan, 'Pro');
  assert.equal(model.entitlement.premium, false);
  assert.equal(model.historyUnavailable, true);
  assert.equal(model.premiumProvided, false);
  f.github.state.installations = INSTALLATIONS;
  f.github.state.admin.set(1003, false);
  f.app.cache.clear();
  const contextualViewer = await f.viewer([repositoryName]);
  const detail = await loadView({ url: new URL(`${ORIGIN}/file/${repositoryName}/xxxxxxxxxxxxxxxxxxxxxx?s=all`),
    viewer: contextualViewer, session: f.opened, runtime: f.app, surface: 'file', detail: { repositoryId: 1003 } });
  assert.equal(detail.historyUnavailable, true);
  assert.equal(detail.historyManageable, false, 'administration of another repository cannot select this target history action');
});

test('fresh GitHub access cannot restore withdrawn App history consent', async () => {
  const f = await readerFixture();
  await f.app.appStore.deleteHistory(1001);
  const viewer = await f.viewer([fullName]);
  assert.equal(viewer.repositories[0].standing.historyReadable, false);
  const model = await loadView({ url: new URL(`${ORIGIN}/?s=${fullName}`), viewer, session: f.opened, runtime: f.app });
  assert.equal(model.data, null);
});
