// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * The Community App against a real local D1 (Miniflare) carrying every managed-App migration, seeded through the managed
 * App's own write paths, with GitHub replaced by the fixture's wire double and no premium extension joined. Exercises
 * the sign-in journey end to end, the viewer and scope model with server-selected plans, the page loader on the retained
 * and pathless bases, the Free and All-repositories entitlement answers, an entitled reader's truthful
 * `premium-not-provided` standing, the installed `/api/analytics` adapter and the document header reconciliation.
 * The premium behaviour of the same fixture is tested in premium/tests. One seeded database serves the file; the
 * consent-withdrawal case runs last.
 */
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createGitHubAppWorker } from '../../github-app/app.mjs';
import { D1AuthorizationStore } from '../../github-app/authorization-storage.mjs';
import { createProtector } from '../src/lib/protector.mjs';
import { createAppRuntime } from '../src/lib/runtime.mjs';
import { authSession, authLogout, briefPreview, openSession, cookieValue, SESSION_COOKIE } from '../src/lib/routes.mjs';
import { scopeRepositories, loadTitles, resolveViewer } from '../src/lib/viewer.mjs';
import { loadView, entitlementFor } from '../src/lib/view.mjs';
import { describeScope } from '../src/lib/scope.mjs';
import { composePremium } from '../src/premium/registry.mjs';
import { openAnalyticalShell } from '../src/lib/analytical-request.mjs';
import { REPOSITORIES, ENTITLEMENT_FIXTURE, CODE, USER, createFakeGitHub } from '../qa/fixture.mjs';
import { fixture, disposeFixture, signIn, viewerFor, ORIGIN, NOW } from './support.mjs';

after(disposeFixture);

test('independent App runtimes reuse only unchanged interpretations after fresh native D1 reads', async t => {
  const { env, github, clock } = await fixture();
  const compose = () => createAppRuntime(env, { fetch: github.fetch, now: () => clock.value });
  const first = compose(); first.cache.clear();
  const actor = { userId: 123, authorizedRepositoryIds: [1001] };
  const input = { surface: 'overview', repositoryIds: [1001], scope: { kind: 'repository', repositoryId: 1001 }, from: '2026-01-01T00:00:00.000Z', to: NOW };
  let validations = 0;
  const descriptors = Object.getOwnPropertyDescriptors;
  t.mock.method(Object, 'getOwnPropertyDescriptors', value => {
    if (value?.kind === 'diffdevil.report') validations++;
    return descriptors(value);
  });
  const before = await first.analytics.query(input, actor);
  assert.ok(before.coverage.merged > 0);
  const count = validations;
  assert.ok(count > 0);
  assert.deepEqual(await compose().analytics.query(input, actor), before);
  assert.equal(validations, count, 'the actual runtime passes the shared calculation cache across independent compositions');
  const row = await first.appStore.statement("SELECT pull_request,expires_at FROM analytical_pull_requests WHERE repository_id=1001 AND json_extract(record_json,'$.state')='merged' LIMIT 1").first();
  try {
    await first.appStore.statement('UPDATE analytical_pull_requests SET expires_at=? WHERE repository_id=1001 AND pull_request=?', NOW, row.pull_request).run();
    assert.equal((await compose().analytics.query(input, actor)).coverage.merged, before.coverage.merged - 1, 'fresh native expiry still determines the population');
  } finally {
    await first.appStore.statement('UPDATE analytical_pull_requests SET expires_at=? WHERE repository_id=1001 AND pull_request=?', row.expires_at, row.pull_request).run();
    first.cache.clear();
  }
});

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
  // Sign-out discloses the account's local funding-connection standing to the sign-in page; this account funds nothing.
  assert.equal(out.headers.get('location'), '/sign-in?signed-out=not-retained');
  assert.equal((await openSession(request, app)).refusal, 'E_SESSION_UNAVAILABLE');
});

test('the viewer sees GitHub-reachable repositories with their App standing and server-selected namespace plans', async () => {
  const { app: compose } = await fixture();
  const free = compose();
  const { viewer, opened } = await viewerFor(free);
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
  const titles = await loadTitles({ reads: opened.reads, repositories: scopeRepositories(viewer, describeScope('parser-guild/parser-lab')), cache: free.cache, userId: viewer.userId });
  assert.equal(titles.standing, 'available');
  assert.ok(titles.byRepository.get(1001).size > 0, 'display titles come from the person\'s own read');
  // The loopback fixture keys plans by numeric account: the viewer and parser-guild are Pro, northwind-tools is Business.
  const funded = compose(ENTITLEMENT_FIXTURE);
  const { viewer: paid } = await viewerFor(funded);
  assert.equal(paid.plan, 'Pro');
  assert.equal(paid.entitlementSource, 'local-fixture');
  assert.deepEqual(Object.fromEntries(paid.namespaces.map(namespace => [namespace.login, namespace.plan])), { 'ada-sample': 'Pro', 'parser-guild': 'Pro', 'northwind-tools': 'Business', 'kai-sample': 'Free' });
});

test('listed roles stay permission-free and the signed-in authority observes an omitted organisation through the targeted read', async () => {
  const { app: compose, github } = await fixture();
  const app = compose();
  const { cookie } = await signIn(app);
  const callStart = github.calls.length;
  try {
    assert.deepEqual(await app.auth.organisationAuthority({ session: cookie, organisationId: 7001 }), { userId: 123, authority: 'present', display: 'parser-guild' });
    github.state.roles.set('northwind-tools', 'billing_manager');
    assert.deepEqual(await app.auth.organisationAuthority({ session: cookie, organisationId: 7001 }), { userId: 123, authority: 'present', display: 'parser-guild' });
    assert.deepEqual(await app.auth.organisationAuthority({ session: cookie, organisationId: 7002 }), { userId: 123, authority: 'absent', display: null });
    const opened = await openSession(new Request(`${ORIGIN}/`, { headers: { cookie: `${SESSION_COOKIE}=${cookie}` } }), app);
    const billingViewer = await resolveViewer({ reads: opened.reads, actor: opened.actor, store: app.store, entitlement: app.entitlement, cache: app.cache });
    assert.equal(billingViewer.namespaces.find(namespace => namespace.login === 'parser-guild').role, 'admin');
    assert.equal(billingViewer.namespaces.find(namespace => namespace.login === 'parser-guild').yours, true);
    assert.equal(billingViewer.namespaces.find(namespace => namespace.login === 'northwind-tools').role, 'member');
    assert.equal(billingViewer.namespaces.find(namespace => namespace.login === 'northwind-tools').yours, false);
    github.state.membershipStates.set('parser-guild', 'pending');
    assert.deepEqual(await app.auth.organisationAuthority({ session: cookie, organisationId: 7001 }), { userId: 123, authority: 'absent', display: null });
    assert.equal(await opened.reads.organizationRole('parser-guild'), 'none');
    // Only the membership endpoint is unavailable; the same stored grant still verifies.
    github.state.membershipStatus = 404;
    assert.deepEqual(await app.auth.organisationAuthority({ session: cookie, organisationId: 7001 }), { userId: 123, authority: 'unknown', display: null });
    await assert.rejects(opened.reads.organizationRole('parser-guild'), { code: 'E_PROVIDER_NOT_FOUND' });
    app.cache.clear();
    const viewer = await resolveViewer({ reads: opened.reads, actor: opened.actor, store: app.store, entitlement: app.entitlement, cache: app.cache });
    assert.equal(viewer.namespaces.find(namespace => namespace.login === 'parser-guild').role, 'unknown');
    assert.equal(viewer.namespaces.find(namespace => namespace.login === 'parser-guild').yours, false);
    const paths = github.calls.slice(callStart).map(call => call.path);
    assert.ok(paths.includes('/user/memberships/orgs'));
    assert.equal(paths.some(path => /^\/user\/memberships\/orgs\//u.test(path)), false);

    github.state.membershipStatus = 200;
    github.state.omittedMemberships.add(7001);
    assert.deepEqual(await app.auth.organisationAuthority({ session: cookie, organisationId: 7001 }), { userId: 123, authority: 'unknown', display: null });
    await assert.rejects(opened.reads.organizationRole('parser-guild'), { code: 'E_PROVIDER_REQUEST', status: 403 });
    app.cache.clear();
    const omitted = await resolveViewer({ reads: opened.reads, actor: opened.actor, store: app.store, entitlement: app.entitlement, cache: app.cache });
    assert.equal(omitted.namespaces.find(namespace => namespace.login === 'parser-guild').role, 'unknown');
    assert.equal(omitted.namespaces.find(namespace => namespace.login === 'parser-guild').yours, false);
    assert.ok(omitted.repositories.some(repository => repository.owner === 'parser-guild'), 'the role omission preserves authorised reading');
    github.state.targetedMembershipStatus = 200;
    github.state.membershipStates.delete('parser-guild');
    assert.deepEqual(await app.auth.organisationAuthority({ session: cookie, organisationId: 7001 }), { userId: 123, authority: 'present', display: 'parser-guild' });
    const recovered = await resolveViewer({ reads: opened.reads, actor: opened.actor, store: app.store, entitlement: app.entitlement, cache: app.cache });
    assert.equal(recovered.namespaces.find(namespace => namespace.login === 'parser-guild').role, 'admin', 'the documented target result restores administration without caching the earlier refusal');
    github.state.roles.set('parser-guild', 'member');
    assert.equal(await opened.reads.organizationRole('parser-guild'), 'member', 'each action re-observes the targeted role');
  } finally {
    github.state.roles.clear(); github.state.membershipStates.clear(); github.state.omittedMemberships.clear(); github.state.membershipStatus = 200; github.state.targetedMembershipStatus = 403; app.cache.clear();
  }
});

test('independent request runtimes rotate a one-use grant once and preserve both browser reads', async () => {
  const { env, clock } = await fixture();
  const userId = 8124;
  const github = createFakeGitHub({ user: { ...USER, id: userId, login: 'refresh-race-fixture' } });
  const first = createAppRuntime(env, { fetch: github.fetch, now: () => clock.value });
  const second = createAppRuntime(env, { fetch: github.fetch, now: () => clock.value });
  const store = new D1AuthorizationStore(env.APP_DB, { now: () => clock.value });
  const protector = createProtector({ secret: env.APP_SEAL_KEY });
  let release, entered;
  const gate = new Promise(resolve => { release = resolve; });
  const started = new Promise(resolve => { entered = resolve; });
  let refreshes = 0;
  try {
    const { cookie } = await signIn(first);
    const original = await store.authorization(userId);
    const material = { ...await protector.open(original.protected_material), refreshToken: 'fixture-one-use', accessExpiresAt: clock.value };
    await store.refreshAuthorization(userId, original.protected_material, await protector.seal(material), original.expires_at);
    github.state.refreshResponse = async () => {
      refreshes++;
      if (refreshes > 1) return Response.json({ error: 'bad_refresh_token' }, { status: 400 });
      entered(); await gate;
      return Response.json({ access_token: material.accessToken, refresh_token: 'fixture-next-refresh', expires_in: 28800, refresh_token_expires_in: 15897600 });
    };
    const a = first.auth.authenticate(cookie);
    await started;
    assert.ok((await store.authorization(userId)).refresh_claim, 'the persistent claim precedes the held provider effect');
    const b = second.auth.authenticate(cookie);
    const premature = await Promise.race([b.then(() => true, () => true), new Promise(resolve => setTimeout(() => resolve(false), 80))]);
    release();
    assert.equal(premature, false, 'the second runtime does not spend or revoke the in-flight grant');
    assert.deepEqual(await Promise.all([a, b]), [{ userId, returnContext: 'app' }, { userId, returnContext: 'app' }]);
    assert.equal(refreshes, 1);
    const row = await store.authorization(userId);
    assert.equal(row.refresh_claim, null);
    assert.equal(row.revoked_at, null);
    assert.equal((await protector.open(row.protected_material)).refreshToken, 'fixture-next-refresh');
    assert.equal((await second.auth.authenticate(cookie)).userId, userId);
  } finally { release(); first.cache.clear(); second.cache.clear(); }
});

test('real GitHub verification uncertainty preserves sealed grants and sessions in D1 while invalidation and disconnect still retire them', async () => {
  const { env, clock } = await fixture();
  const userId = 8123;
  const github = createFakeGitHub({ user: { ...USER, id: userId, login: 'verification-fixture' } });
  const app = createAppRuntime(env, { fetch: github.fetch, now: () => clock.value });
  const store = new D1AuthorizationStore(env.APP_DB, { now: () => clock.value });
  const protector = createProtector({ secret: env.APP_SEAL_KEY });
  const sessions = async () => (await env.APP_DB.prepare('SELECT session_hash, revoked_at FROM browser_sessions WHERE user_id=? ORDER BY session_hash').bind(userId).all()).results;
  const assertRetired = async cookie => {
    const row = await store.authorization(userId);
    assert.equal(row.protected_material, '');
    assert.ok(row.revoked_at);
    assert.ok((await sessions()).every(row => row.revoked_at));
    await assert.rejects(app.auth.authenticate(cookie), { code: 'E_SESSION_UNAVAILABLE' });
  };
  try {
    let { cookie } = await signIn(app);
    const original = await store.authorization(userId), originalSessions = await sessions();
    const unavailable = [
      () => Response.json({}, { status: 503 }),
      () => Response.json({}, { status: 401 }),
      () => Response.json({}, { status: 429 }),
      () => Response.json({}),
      () => new Response('fixture malformed body'),
      () => { throw new Error('fixture transport failure'); }
    ];
    for (const answer of unavailable) {
      github.state.tokenCheckResponse = answer;
      await assert.rejects(app.auth.authenticate(cookie), { code: 'E_AUTHORIZATION_UNAVAILABLE' });
      assert.equal((await app.auth.observeOrganisationAuthority({ userId, organisationId: 7001 })).authority, 'unknown');
      assert.deepEqual(await store.authorization(userId), original);
      assert.deepEqual(await sessions(), originalSessions);
    }
    github.state.tokenCheckResponse = null;
    assert.equal((await app.auth.authenticate(cookie)).userId, userId, 'the same session recovers on a later successful encounter');
    github.state.tokenValid = false;
    await assert.rejects(app.auth.authenticate(cookie), { code: 'E_AUTHORIZATION_UNAVAILABLE' });
    await assertRetired(cookie);
    github.state.tokenValid = true;

    ({ cookie } = await signIn(app));
    const signedIn = await store.authorization(userId);
    const expiring = { ...await protector.open(signedIn.protected_material), refreshToken: 'fixture-refresh', accessExpiresAt: new Date(Date.parse(clock.value) + 30_000).toISOString() };
    const sealed = await protector.seal(expiring);
    assert.equal(await store.refreshAuthorization(userId, signedIn.protected_material, sealed, signedIn.expires_at), true);
    let beforeRefresh = await store.authorization(userId), refreshSessions = await sessions();
    for (const answer of [...unavailable, () => Response.json({ error: 'incorrect_client_credentials' }), () => Response.json({ error: 'unknown_oauth_error' })]) {
      github.state.refreshResponse = answer;
      await assert.rejects(app.auth.authenticate(cookie), { code: 'E_AUTHORIZATION_UNAVAILABLE' });
      const uncertain = await store.authorization(userId);
      assert.equal(uncertain.protected_material, beforeRefresh.protected_material);
      assert.equal(uncertain.revoked_at, null);
      assert.ok(uncertain.refresh_claim, 'an ambiguous one-use refresh cannot be retried by another request');
      assert.deepEqual(await sessions(), refreshSessions);
      // A genuinely new verified grant resolves the interrupted provider transition;
      // it is not manufactured by a timeout or by replaying the old refresh token.
      github.state.refreshResponse = null;
      ({ cookie } = await signIn(app));
      const fresh = await store.authorization(userId);
      await store.refreshAuthorization(userId, fresh.protected_material, await protector.seal(expiring), fresh.expires_at);
      beforeRefresh = await store.authorization(userId); refreshSessions = await sessions();
    }
    github.state.refreshResponse = null;
    assert.equal((await app.auth.authenticate(cookie)).userId, userId);
    const refreshed = await store.authorization(userId);
    assert.notEqual(refreshed.protected_material, sealed);
    assert.equal((await protector.open(refreshed.protected_material)).refreshToken, 'fixture-next-refresh');
    assert.equal(refreshed.expires_at, new Date(Date.parse(clock.value) + 15897600_000).toISOString());
    assert.deepEqual(await sessions(), refreshSessions, 'successful rotation preserves the browser sessions');

    assert.equal(await store.refreshAuthorization(userId, refreshed.protected_material, await protector.seal(expiring), refreshed.expires_at), true);
    github.state.refreshResponse = () => Response.json({ error: 'bad_refresh_token' }, { status: 400 });
    await assert.rejects(app.auth.authenticate(cookie), { code: 'E_AUTHORIZATION_UNAVAILABLE' });
    await assertRetired(cookie);
    github.state.refreshResponse = null;
    ({ cookie } = await signIn(app));
    github.state.tokenCheckResponse = () => Response.json({}, { status: 503 });
    await app.auth.revokeAuthorization({ session: cookie, method: 'POST', origin: ORIGIN });
    await assertRetired(cookie);
    assert.equal(await store.serviceDisconnected(userId), true, 'explicit disconnect retains its separate durable preference');
  } finally {
    github.state.tokenCheckResponse = null; github.state.refreshResponse = null; github.state.tokenValid = true; app.cache.clear();
  }
});

test('the page loader drives populations from the retained analytical records and falls back to pathless analyses where none are retained', async () => {
  const { app: compose, written } = await fixture();
  const app = compose(ENTITLEMENT_FIXTURE);
  assert.ok(written.written > 20, `fixture wrote ${written.written} pathless analyses`);
  assert.ok(written.retained > 20, `fixture retained ${written.retained} analytical records`);
  const ids = REPOSITORIES.map(repository => repository.repositoryId);
  const coverage = await app.store.analyticalCoverage(ids);
  assert.ok(coverage.counts.get(1001) > 0);
  assert.equal(coverage.counts.get(1007), undefined, 'the pathless-only repository has no retained record');
  assert.equal(coverage.counts.get(1003), undefined, 'history-off repositories are not read');
  const { viewer, opened } = await viewerFor(app);
  const viewerAfterNamespaceAccessLoss = {
    ...viewer,
    repositories: viewer.repositories.filter(repository => repository.owner !== 'parser-guild'),
    namespaces: viewer.namespaces.filter(namespace => namespace.login !== 'parser-guild')
  };
  let inaccessibleScopeReads = 0;
  const accessLossRuntime = {
    ...app,
    analytics: { ...app.analytics, async query(...args) { inaccessibleScopeReads++; return app.analytics.query(...args); } }
  };
  const inaccessibleScope = await loadView({
    url: new URL(`${ORIGIN}/?s=%40parser-guild&per=90d`),
    viewer: viewerAfterNamespaceAccessLoss,
    session: opened,
    runtime: accessLossRuntime,
    surface: 'overview'
  });
  assert.equal(inaccessibleScope.scopeUnavailable, true, 'a selected namespace absent from current authorized repositories is unresolved, not an empty population');
  assert.equal(inaccessibleScope.dataStanding, 'scope-unavailable');
  assert.equal(inaccessibleScope.data, null);
  assert.deepEqual(inaccessibleScope.ids, []);
  assert.equal(inaccessibleScope.entitlement.premium, false, 'unavailable scope has no inferred premium offer');
  assert.equal(inaccessibleScopeReads, 0, 'the unresolved selection does not fall back to an All repositories read');
  const viewerAfterRepositoryAccessLoss = {
    ...viewer,
    repositories: viewer.repositories.filter(repository => repository.repositoryId !== 1001),
    namespaces: viewer.namespaces.map(namespace => namespace.login === 'parser-guild'
      ? { ...namespace, repositories: namespace.repositories.filter(repository => repository.repositoryId !== 1001) }
      : namespace)
  };
  const inaccessibleRepository = await loadView({
    url: new URL(`${ORIGIN}/?s=parser-guild%2Fparser-lab&per=90d`),
    viewer: viewerAfterRepositoryAccessLoss,
    session: opened,
    runtime: accessLossRuntime,
    surface: 'overview'
  });
  assert.equal(inaccessibleRepository.scopeUnavailable, true, 'a selected repository absent from current authorized repositories is unresolved even while a namespace sibling remains');
  assert.equal(inaccessibleRepository.dataStanding, 'scope-unavailable');
  assert.equal(inaccessibleRepository.data, null);
  assert.deepEqual(inaccessibleRepository.ids, []);
  assert.equal(inaccessibleRepository.entitlement.premium, false, 'unavailable repository scope has no inferred premium offer');
  assert.equal(inaccessibleScopeReads, 0, 'the unresolved repository selection does not fall back to an All repositories read');
  assert.ok(viewerAfterRepositoryAccessLoss.repositories.some(repository => repository.fullName === 'parser-guild/grammar-fuzz'), 'the accessible sibling remains visible');
  const authorizedEmptyRepository = await loadView({
    url: new URL(`${ORIGIN}/?s=parser-guild%2Fgrammar-fuzz&per=90d`),
    viewer,
    session: opened,
    runtime: app,
    surface: 'overview'
  });
  assert.equal(authorizedEmptyRepository.scopeUnavailable, false, 'an authorized history-off repository remains a valid empty population');
  assert.equal(authorizedEmptyRepository.dataStanding, 'none');
  const accessibleDetail = await loadView({
    url: new URL(`${ORIGIN}/pr/parser-guild/parser-lab/452?s=%40missing-org&q=452`),
    viewer,
    session: opened,
    runtime: app,
    surface: 'pr',
    detail: { repositoryId: 1001, pullRequest: 452 }
  });
  assert.equal(accessibleDetail.scopeUnavailable, false, "a detail route's unavailable navigation context does not hide its authorized repository detail");
  assert.equal(accessibleDetail.dataStanding, 'available');
  const view = await loadView({ url: new URL(`${ORIGIN}/?s=parser-guild%2Fparser-lab&per=90d`), viewer, session: opened, runtime: app, surface: 'prs' });
  assert.equal(view.scope.kind, 'repository');
  assert.equal(view.lifecycle.standing, 'available');
  assert.equal(view.lifecycle.source, 'retained-analytical-records');
  assert.equal(view.current.basis, 'retained');
  assert.ok(view.current.merged > 0, 'merged pull requests come from retained lifecycle');
  assert.ok(view.current.mergedRecovered < view.current.merged, 'a merged PR without a recovered final comparison stays in the population unmeasured');
  assert.ok([...view.pullRequests.values()].some(pr => pr.title), 'titles attach from the transient read');
  assert.ok([...view.pullRequests.values()].every(pr => pr.basis === 'retained'));
  assert.equal(view.entitlement.premium, true, 'your own namespace follows the viewer plan');
  assert.equal(view.entitlement.source, 'service', 'the service answered the entitlement');
  assert.ok([...view.pullRequests.values()].some(pr => pr.latest.band.standing === 'current'), 'bands are judged by the current policy');
  const searchedDetail = await loadView({ url: new URL(`${ORIGIN}/pr/parser-guild/parser-lab/452?q=452`), viewer, session: opened, runtime: app, surface: 'pr', detail: { repositoryId: 1001, pullRequest: 452 } });
  assert.equal(searchedDetail.dataStanding, 'available', 'a retained PR detail read uses the repository named in its route even when its search context has no scope parameter');
  assert.equal(searchedDetail.data.result.repositoryId, 1001);
  assert.equal(searchedDetail.data.result.pullRequest, 452);
  assert.equal(searchedDetail.state.q, '452', 'the original search remains available to the return link');
  assert.equal(searchedDetail.href('/prs'), '/prs?q=452');
  const failedDetailRuntime = {
    ...app,
    premium: { provided: true },
    analytics: {
      ...app.analytics,
      async query() { throw Object.assign(new Error('fixture analytics outage'), { code: 'E_APP_DATA_QUERY' }); }
    }
  };
  const unavailableFreeDetail = await loadView({ url: new URL(`${ORIGIN}/pr/kai-sample/tree-sitter-dd/452?q=452`), viewer, session: opened, runtime: failedDetailRuntime, surface: 'pr', detail: { repositoryId: 1007, pullRequest: 452 } });
  assert.equal(unavailableFreeDetail.scope.kind, 'all', 'the search query remains all-repositories navigation context');
  assert.equal(unavailableFreeDetail.dataStanding, 'unavailable');
  assert.equal(unavailableFreeDetail.entitlement.plan, 'Free', 'the unanswered detail uses the resolved repository namespace plan');
  assert.equal(unavailableFreeDetail.entitlement.premium, false, 'a Pro viewer does not lend their plan to a Free repository detail');
  assert.equal(unavailableFreeDetail.premiumHere, false, 'the premium detail slot follows the Free repository after its read fails');
  // The pathless-only repository keeps its older analyses, by analysis time, and says so.
  const pathless = await loadView({ url: new URL(`${ORIGIN}/?s=kai-sample%2Ftree-sitter-dd&per=90d`), viewer, session: opened, runtime: app, surface: 'prs' });
  assert.equal(pathless.lifecycle.standing, 'unavailable');
  assert.equal(pathless.current.basis, 'pathless');
  assert.ok(pathless.current.analysedCount > 0);
  assert.equal(pathless.current.opened, undefined, 'no lifecycle count is invented from analysis times');
  assert.ok([...pathless.pullRequests.values()].some(pr => pr.latest.band.standing === 'derived'), 'older analyses without a recorded band derive it and say so');
  // Files on an entitled scope without the premium extension: the plan stands, the implementation is absent, and nothing is invented.
  const files = await loadView({ url: new URL(`${ORIGIN}/files?s=parser-guild%2Flexer-kit&per=90d`), viewer, session: opened, runtime: app, surface: 'files' });
  assert.equal(files.entitlement.premium, true, 'the plan still includes file history');
  assert.equal(files.premiumProvided, false);
  assert.equal(files.premiumHere, false, 'no premium slot renders in a Community build');
  assert.equal(files.dataStanding, 'premium-not-provided', 'the service says the result was not computed rather than answering empty');
  assert.deepEqual(files.files, []);
  assert.equal(files.data.entitlements.premium.provided, false);
});

test('a Free reader keeps a funded namespace\'s plan inside it, and All repositories follows the reader with pointers to funded namespaces', async () => {
  const { app: compose } = await fixture();
  // A Free viewer (account 123 unfunded) in a world where parser-guild is Pro and northwind-tools is Business.
  const app = compose({ 7001: 'Pro', 7002: 'Business' });
  const { viewer, opened } = await viewerFor(app);
  assert.equal(viewer.plan, 'Free');
  const inside = await loadView({ url: new URL(`${ORIGIN}/files?s=%40northwind-tools&per=90d`), viewer, session: opened, runtime: app, surface: 'files' });
  assert.equal(inside.entitlement.premium, true, 'the funded namespace keeps its plan for a Free collaborator');
  assert.equal(inside.entitlement.plan, 'Business');
  assert.equal(inside.entitlement.scope, 'namespace');
  const all = await loadView({ url: new URL(`${ORIGIN}/files?s=all&per=90d`), viewer, session: opened, runtime: app, surface: 'files' });
  assert.equal(all.entitlement.premium, false, 'All repositories follows the Free viewer');
  assert.equal(all.dataStanding, 'plan-required');
  assert.deepEqual(all.entitlement.fundedNamespaces.sort(), ['northwind-tools', 'parser-guild'], 'the Free page can point to the funded namespaces');
  assert.deepEqual(all.entitlement.sharedPaid, ['northwind-tools'], 'only a namespace the viewer does not own is a shared paid pointer');
  assert.equal(all.files.length, 0);
  const allPrs = await loadView({ url: new URL(`${ORIGIN}/prs?s=all&per=90d`), viewer, session: opened, runtime: app, surface: 'prs' });
  assert.equal(allPrs.entitlement.premium, false);
  assert.ok(allPrs.current.merged > 0, 'Free keeps the useful merged populations on the other destinations');
  // A paid viewer across namespaces aggregates only premium-funded repositories and names the excluded count.
  const paid = compose({ 123: 'Pro', 7001: 'Pro' });
  const { viewer: payer, opened: payerSession } = await viewerFor(paid);
  const across = await loadView({ url: new URL(`${ORIGIN}/files?s=all&per=90d`), viewer: payer, session: payerSession, runtime: paid, surface: 'files' });
  assert.equal(across.entitlement.premium, true);
  assert.equal(across.entitlement.scope, 'all');
  assert.ok(across.entitlement.excluded >= 1, 'a Free-funded history repository is named as excluded');
  // The shell's expectation before data agrees with the rule.
  assert.equal(entitlementFor(viewer, describeScope('all'), viewer.repositories).premium, false);
  assert.equal(entitlementFor(viewer, describeScope('@northwind-tools'), scopeRepositories(viewer, describeScope('@northwind-tools'))).plan, 'Business');
});

test('the protected analytics route serves the same contract behind the App\'s installed authorization adapter', async () => {
  const { app: compose, env } = await fixture();
  const app = compose(ENTITLEMENT_FIXTURE);
  const { cookie } = await viewerFor(app);
  const worker = createGitHubAppWorker({ authorization: app.auth, commercial: app.commercial });
  const query = { version: 1, surface: 'overview', repositoryIds: [1001, 1002, 1003, 9999], from: '2026-07-11T14:00:00.000Z', to: NOW };
  const response = await worker.fetch(new Request(`${ORIGIN}/api/analytics`, { method: 'POST', headers: { cookie: `${SESSION_COOKIE}=${cookie}`, origin: ORIGIN, 'content-type': 'application/json' }, body: JSON.stringify(query) }), env);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer', 'the JSON route keeps the managed App policy');
  const body = await response.json();
  assert.equal(body.surface, 'overview');
  assert.equal(body.coverage.requestedRepositories, 4);
  assert.equal(body.coverage.authorizedRepositories, 3, 'an unknown repository is dropped by the server, never granted');
  assert.deepEqual(body.repositoryIdentities.map(entry => entry.fullName).sort(), ['parser-guild/grammar-fuzz', 'parser-guild/lexer-kit', 'parser-guild/parser-lab']);
  assert.equal(body.scope.kind, 'all', 'an aggregate request without a declared scope reads as All repositories');
  assert.equal(body.entitlements.premium.enabled, true);
  const denied = await worker.fetch(new Request(`${ORIGIN}/api/analytics`, { method: 'POST', headers: { origin: ORIGIN, 'content-type': 'application/json' }, body: JSON.stringify(query) }), env);
  assert.equal(denied.status, 401);
});

test('the brief preview route serves an administrator an effect-free synthetic preview and refuses everyone else', async () => {
  const { app: compose } = await fixture();
  const app = compose(ENTITLEMENT_FIXTURE);
  const { cookie } = await signIn(app);
  const post = (body, headers = {}) => briefPreview(new Request(`${ORIGIN}/api/brief/preview`, { method: 'POST', headers: { cookie: `${SESSION_COOKIE}=${cookie}`, origin: ORIGIN, 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) }), app);
  const writesBefore = JSON.stringify(await app.appStore.repositoryAdmission(1001));
  const response = await post({ repositoryId: 1001, settings: { mode: 'standard', finalSummary: true } });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  const preview = await response.json();
  assert.equal(preview.synthetic, true); assert.equal(preview.effects, 'none');
  assert.deepEqual(Object.keys(preview.states), ['exact', 'bounded', 'partial', 'unknown', 'context-unavailable', 'file-population-unavailable']);
  assert.equal(preview.writer.login, 'diffdevil[bot]');
  assert.ok(['standing', 'kind'].some(key => key in preview.source));
  // A Community build joins no provider: the basic brief is complete and the premium modules say they are not provided.
  assert.ok(preview.modules.some(module => module.tier === 'premium' && module.standing === 'not-provided'), 'premium modules are reported not provided');
  assert.equal(JSON.stringify(await app.appStore.repositoryAdmission(1001)), writesBefore, 'preview stores nothing');
  assert.equal((await post({ repositoryId: 1006 })).status, 403, 'a non-administrator cannot preview');
  assert.equal((await post({ repositoryId: 1001 }, { origin: 'https://evil.example' })).status, 403);
  assert.equal((await post({ repositoryId: 1001, settings: { mode: 'llm' } })).status, 400);
});

test('the local-session shell and common history answer while provider, D1 and premium work are held', async () => {
  const { app: compose } = await fixture();
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  let fileCalls = 0;
  const premium = composePremium({ service: () => ({ files: async () => { fileCalls++; await gate; return { files: [], sizeObservation: [] }; } }) });
  const app = compose(ENTITLEMENT_FIXTURE, { premium });
  const { cookie } = await signIn(app);
  const request = new Request(`${ORIGIN}/`, { headers: { cookie: `${SESSION_COOKIE}=${cookie}` } });
  const opened = await openSession(request, app);
  const viewer = await resolveViewer({ reads: opened.reads, actor: opened.actor, store: app.store, entitlement: app.entitlement, cache: app.cache });
  const query = { surface: 'history', repositoryIds: [1001], scope: { kind: 'repository', repositoryId: 1001 }, from: '2026-07-01T00:00:00.000Z', to: NOW };
  const actor = { userId: viewer.userId, authorizedRepositoryIds: [1001] };
  const enriched = app.analytics.query(query, actor);
  const common = await app.baseAnalytics.query(query, actor);
  assert.ok(common.result.buckets.some(bucket => bucket.pullRequests.length > 0), 'the common response is populated retained history');
  assert.equal(fileCalls, 1, 'only the enriched request entered the held extension');
  // A second viewer load and page load are held at their actual provider and analytical-D1 seams.
  const providerRead = resolveViewer({ reads: { ...opened.reads, profile: async () => { await gate; return opened.reads.profile(); } }, actor: opened.actor, store: app.store, entitlement: app.entitlement, cache: { get: (_key, load) => load() } });
  const dataRead = loadView({ url: new URL(`${ORIGIN}/history`), viewer, session: opened, runtime: { ...app, store: { ...app.store,
    analyticalCoverage: async (...args) => { await gate; return app.store.analyticalCoverage(...args); }, observationBounds: (...args) => app.store.observationBounds(...args) } }, surface: 'history' });
  assert.equal(await openAnalyticalShell(request, app, cookieValue, SESSION_COOKIE), null, 'the protected generic shell does not await those held reads');
  release();
  await Promise.all([enriched, providerRead, dataRead]);
});

test('a withdrawn consent stops serving that repository on both bases', async () => {
  const { app: compose } = await fixture();
  const app = compose();
  const before = await app.store.analyses([1002], '2026-01-01T00:00:00.000Z', NOW);
  assert.ok(before.records.length > 0);
  assert.ok((await app.store.analyticalCoverage([1002])).counts.get(1002) > 0);
  await app.appStore.setRepositoryConsent(1002, { enabled: false, origin: 'fixture' });
  const after = await app.store.analyses([1002], '2026-01-01T00:00:00.000Z', NOW);
  assert.equal(after.records.length, 0);
  assert.deepEqual(await app.store.observationBounds([1002]), { first: null, latest: null });
  assert.equal((await app.store.analyticalCoverage([1002])).counts.get(1002), undefined);
  assert.deepEqual(await app.appStore.analyticalRecords(1002), []);
});
