// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createHash } from 'node:crypto';
import { handleManageAction } from '../src/lib/manage/actions.mjs';
import { openSession, SESSION_COOKIE } from '../src/lib/routes.mjs';
import { resolveViewer } from '../src/lib/viewer.mjs';
import { fixture, disposeFixture, signIn, ORIGIN } from './support.mjs';
import { INSTALLATIONS, REPOSITORIES } from '../qa/fixture.mjs';
import { closeLocalAccount } from '../src/lib/manage/account-closure.mjs';
import { D1AuthorizationStore } from '../../github-app/authorization-storage.mjs';

after(disposeFixture);

// Closure needs populated ownership/control and a few retained rows, not the full analytical chart population.
async function seedClosure(store) {
  for (const installation of INSTALLATIONS) {
    await store.recordLifecycle({ installationId: installation.id, action: 'created', addedRepositories: REPOSITORIES.filter(r => r.installationId === installation.id).map(r => r.repositoryId), removedRepositories: [] });
    await store.recordInstallationAccount(installation.id, installation.account.id, installation.account.type === 'Organization' ? 'organization' : 'user');
  }
  for (const repository of REPOSITORIES) {
    await store.setRepositoryExecution(repository.repositoryId, { enabled: true, origin: 'fixture' });
    await store.setRepositoryConsent(repository.repositoryId, { enabled: true, retentionDays: 30, origin: 'fixture' });
  }
  for (const repositoryId of [1001, 1004, 1005]) await store.database.prepare(`INSERT INTO history_records
    (repository_id,pull_request,comparison_id,policy_id,schema_version,engine_version,report_version,metric_version,observed_at,projection_json,coverage_json,results_json,gaps_json,state)
    VALUES (?,1,'fixture','fixture',1,'fixture','fixture','fixture',?,'{}','{}','{}','[]','published')`).bind(repositoryId, store.now()).run();
}

async function close(app, cookie, confirm = 'ada-sample') {
  const session = await openSession(new Request(`${ORIGIN}/manage/account`, { headers: { cookie: `${SESSION_COOKIE}=${cookie}` } }), app);
  const viewer = await resolveViewer({ reads: session.reads, actor: session.actor, store: app.store, entitlement: app.entitlement, cache: app.cache });
  return handleManageAction(new Request(`${ORIGIN}/manage/do`, { method: 'POST', headers: { origin: ORIGIN },
    body: new URLSearchParams({ action: 'close-account', confirm, back: '/manage/account' }) }), { runtime: app, session, viewer });
}

test('a late account-closure failure retains the whole account; retry commits every local consequence', async () => {
  const { app: compose } = await fixture({ seed: seedClosure });
  const app = compose(), database = app.appStore.database;
  const { cookie } = await signIn(app);
  const { cookie: otherSession } = await signIn(app);
  await app.manage.select(1004, 123);
  await app.manage.connectFree(123, 7001);
  await app.manage.recordDeparture(123, { purpose: 'fixture' });
  await app.manage.savePlanChoice(123, { target: 'free' });
  await app.manage.saveNamespaceDefault(123, { configuration: {}, expectedRevision: 0 });
  const personalPolicy = await app.manage.createLinkedPolicy({ accountId: 123, name: 'Personal', configuration: {} });
  const organisationPolicy = await app.manage.createLinkedPolicy({ accountId: 7001, name: 'Organisation', configuration: {} });
  await database.prepare('INSERT INTO policy_links(repository_id,policy_id,linked_at) VALUES (1004,?,?)').bind(personalPolicy, app.now()).run();
  const publication = await app.manage.createPublication({ policyId: personalPolicy, revision: 1, repositoryIds: [1004] });
  await database.prepare("INSERT INTO participation_prompts(user_id,campaign_key,campaign_version) VALUES (123,'fixture',1)").run();
  const before = await app.appStore.repositoryAdmission(1004);
  const history = await database.prepare('SELECT count(*) AS count FROM history_records WHERE repository_id=1004').first();
  assert.ok(history.count > 0);
  // A real SQLite failure at the late participation leg, after history and Manage work in the old route.
  await database.exec("CREATE TRIGGER fixture_closure_failure BEFORE DELETE ON participation_prompts BEGIN SELECT RAISE(ABORT,'fixture interruption'); END");
  try {
    const failed = await close(app, cookie);
    assert.equal(new URL(failed.headers.get('location'), ORIGIN).searchParams.get('m'), 'close-incomplete');
    assert.deepEqual(await app.appStore.repositoryAdmission(1004), before, 'failed closure cannot leave a stopped/deleted personal repository');
    assert.deepEqual(await database.prepare('SELECT count(*) AS count FROM history_records WHERE repository_id=1004').first(), history);
    assert.ok(await app.manage.selection(1004));
    assert.equal((await app.manage.freeConnection(123)).organisationId, 7001);
    assert.ok(!(await database.prepare('SELECT revoked_at FROM user_authorizations WHERE user_id=123').first()).revoked_at);
  } finally { await database.exec('DROP TRIGGER fixture_closure_failure'); }
  await database.exec("CREATE TRIGGER fixture_closure_failure BEFORE UPDATE OF revoked_at ON user_authorizations BEGIN SELECT RAISE(ABORT,'fixture revocation interruption'); END");
  try {
    assert.equal(new URL((await close(app, cookie)).headers.get('location'), ORIGIN).searchParams.get('m'), 'close-incomplete');
    assert.deepEqual(await app.appStore.repositoryAdmission(1004), before);
    assert.ok(await app.manage.selection(1004));
    assert.equal((await database.prepare('SELECT count(*) AS n FROM participation_prompts WHERE user_id=123').first()).n, 1, 'even a revocation failure restores the participation rows');
  } finally { await database.exec('DROP TRIGGER fixture_closure_failure'); }
  const completed = await close(app, cookie);
  assert.equal(completed.headers.get('location'), '/sign-in?reason=E_ACCOUNT_CLOSED');
  for (const id of [1004, 1005]) {
    assert.equal((await app.appStore.repositoryAdmission(id)).history.enabled, false);
    assert.equal((await app.appStore.repositoryAdmission(id)).revision, 1, 'each personal target advances in the same commit');
  }
  assert.equal((await app.appStore.repositoryAdmission(1004)).execution.reason, 'explicitly-disabled');
  assert.equal((await database.prepare('SELECT count(*) AS count FROM history_records WHERE repository_id=1004').first()).count, 0);
  assert.equal(await app.manage.selection(1004), null);
  assert.equal(await app.manage.freeConnection(123), null);
  assert.equal(await app.manage.departure(123), null);
  assert.equal(await app.manage.planChoice(123), null);
  assert.equal(await app.manage.namespaceDefault(123), null);
  assert.equal(await app.manage.linkedPolicy(personalPolicy), null);
  assert.ok(await app.manage.linkedPolicy(organisationPolicy), 'the organisation policy remains');
  assert.equal((await database.prepare('SELECT count(*) AS n FROM policy_links WHERE policy_id=?').bind(personalPolicy).first()).n, 0);
  assert.equal((await database.prepare('SELECT count(*) AS n FROM policy_publication_results WHERE publication_id=?').bind(publication).first()).n, 0);
  assert.equal((await database.prepare('SELECT count(*) AS count FROM participation_prompts WHERE user_id=123').first()).count, 0);
  assert.equal((await app.appStore.repositoryAdmission(1001)).history.enabled, true, 'organisation history stays');
  assert.equal((await openSession(new Request(`${ORIGIN}/`, { headers: { cookie: `${SESSION_COOKIE}=${cookie}` } }), app)).refusal, 'E_SESSION_UNAVAILABLE');
  assert.equal((await openSession(new Request(`${ORIGIN}/`, { headers: { cookie: `${SESSION_COOKIE}=${otherSession}` } }), app)).refusal, 'E_SESSION_UNAVAILABLE', 'closure ends every current session, including after updating its initiating session');
});

test('closure checks every current update grant and its request origin before destructive writes', async () => {
  const { app: compose, github } = await fixture();
  const app = compose();
  const { cookie } = await signIn(app);
  const request = { session: cookie, method: 'POST', origin: ORIGIN, repositoryIds: [1004,1005] };
  const before = await app.appStore.repositoryAdmission(1004);
  await assert.rejects(app.auth.closeAccount({ ...request, method: 'GET' }), { code: 'E_AUTH_METHOD' });
  await assert.rejects(app.auth.closeAccount({ ...request, origin: 'https://foreign.invalid' }), { code: 'E_AUTH_ORIGIN' });
  github.state.admin.set(1005, false);
  try { await assert.rejects(app.auth.closeAccount(request), { code: 'E_ADMISSION_UNAUTHORIZED' }); }
  finally { github.state.admin.delete(1005); }
  assert.deepEqual(await app.appStore.repositoryAdmission(1004), before, 'an earlier admitted target is not stopped when another target is refused');
});

test('stale revisions, foreign targets and a newly linked plan refuse the entire closure set', async () => {
  const { app: compose } = await fixture();
  const app = compose(), database = app.appStore.database;
  const { cookie } = await signIn(app);
  await app.manage.select(1004, 123);
  const targets = await Promise.all([1004, 1005].map(async repositoryId => ({ repositoryId, revision: (await app.appStore.repositoryAdmission(repositoryId)).revision })));
  const sessionHash = createHash('sha256').update(cookie).digest('hex');
  const attempt = repositories => closeLocalAccount({ database, userId: 123, repositories, sessionHash, now: app.now });
  for (const targetsToRefuse of [targets.map((r, i) => i === 1 ? { ...r, revision: r.revision - 1 } : r), [...targets, { repositoryId: 1001, revision: 0 }]]) {
    await assert.rejects(attempt(targetsToRefuse), { code: 'E_ADMISSION_STALE' });
    assert.ok(await app.manage.selection(1004));
    assert.equal((await database.prepare('SELECT revoked_at FROM user_authorizations WHERE user_id=123').first()).revoked_at, null);
  }
  await database.prepare("INSERT INTO commercial_links(link_id,product_account,works_account,state,established_at,protected_grant,updated_at) VALUES ('closure-link',123,'fixture','active',?,'fixture',?)").bind(app.now(), app.now()).run();
  try { await assert.rejects(attempt(targets), { code: 'E_ADMISSION_STALE' }); }
  finally { await database.prepare("DELETE FROM commercial_links WHERE link_id='closure-link'").run(); }
  assert.ok(await app.manage.selection(1004));
  assert.equal(new URL((await close(app, cookie, 'wrong')).headers.get('location'), ORIGIN).searchParams.get('m'), 'confirm-mismatch');
});

test('closure handles a personal set beyond one hundred SQL parameters without partial batches', async () => {
  const { app: compose } = await fixture();
  const app = compose(), database = app.appStore.database;
  const { cookie } = await signIn(app), sessionHash = createHash('sha256').update(cookie).digest('hex');
  const ids = Array.from({ length: 120 }, (_, index) => 2000 + index);
  await app.appStore.recordLifecycle({ installationId: 9, action: 'created', addedRepositories: ids, removedRepositories: [] });
  const repositories = await app.appStore.personalClosureRepositories(123);
  await closeLocalAccount({ database, userId: 123, repositories, sessionHash, now: app.now });
  const rows = (await database.prepare('SELECT settings_revision,history_consent_reason,execution_consent_reason FROM repositories WHERE repository_id>=2000').all()).results;
  assert.equal(rows.length, ids.length);
  assert.ok(rows.every(r => r.settings_revision === 1 && r.history_consent_reason === 'explicitly-disabled' && r.execution_consent_reason === 'explicitly-disabled'));
  const original = await database.prepare("SELECT deleted_at,reapply_until FROM deletion_tombstones WHERE scope='history:2000'").first();
  await assert.rejects(closeLocalAccount({ database, userId: 123, repositories, sessionHash, now: () => '2026-10-10T00:00:00.000Z' }), { code: 'E_ADMISSION_STALE' });
  assert.deepEqual(await database.prepare("SELECT deleted_at,reapply_until FROM deletion_tombstones WHERE scope='history:2000'").first(), original, 'the spent request does not move deletion time or lifetime');
  await database.prepare("UPDATE repositories SET state='offboarding',access_state='removed' WHERE repository_id>=2000").run();
});

test('a lost closure response leaves a complete commit and the spent session cannot erase later reconsent', async () => {
  const { app: compose, clock } = await fixture();
  const original = compose(), database = original.appStore.database;
  let revocationPrepared = false;
  const interrupted = {
    prepare(sql) { if (sql.includes('UPDATE browser_sessions SET revoked_at=')) revocationPrepared = true; return database.prepare(sql); },
    async batch(statements) {
      const loseResponse = revocationPrepared; revocationPrepared = false;
      const result = await database.batch(statements);
      if (loseResponse) throw new Error('fixture lost committed response');
      return result;
    }
  };
  const app = compose(undefined, { env: { APP_DB: interrupted } });
  const { cookie } = await signIn(app);
  clock.value = '2026-10-11T00:00:00.000Z';
  assert.equal(new URL((await close(app, cookie)).headers.get('location'), ORIGIN).searchParams.get('m'), 'close-incomplete');
  const deletion = await database.prepare("SELECT deleted_at,reapply_until FROM deletion_tombstones WHERE scope='history:1004'").first();
  assert.equal(deletion.deleted_at, clock.value);
  assert.equal((await original.appStore.repositoryAdmission(1004)).history.enabled, false);
  assert.equal((await database.prepare('SELECT protected_material FROM user_authorizations WHERE user_id=123').first()).protected_material, '');
  await assert.rejects(original.auth.closeAccount({ session: cookie, method: 'POST', origin: ORIGIN, repositoryIds: [1004,1005] }), { code: 'E_SESSION_UNAVAILABLE' });
  const { cookie: later } = await signIn(original);
  const current = await original.appStore.repositoryAdmission(1004);
  await original.auth.updateAdmission({ session: later, method: 'POST', origin: ORIGIN, repositoryId: 1004,
    settings: { revision: current.revision, history: { enabled: true, retentionDays: 30 } } });
  await assert.rejects(original.auth.closeAccount({ session: cookie, method: 'POST', origin: ORIGIN, repositoryIds: [1004,1005] }), { code: 'E_SESSION_UNAVAILABLE' });
  assert.equal((await original.appStore.repositoryAdmission(1004)).history.enabled, true);
  assert.deepEqual(await database.prepare("SELECT deleted_at,reapply_until FROM deletion_tombstones WHERE scope='history:1004'").first(), deletion);
});

test('a delayed closure with no personal targets cannot revoke a later sign-in after its session ended', async () => {
  const { app: compose } = await fixture({ seed: seedClosure });
  const original = compose(), database = original.appStore.database;
  await database.prepare('UPDATE installations SET account_id=456 WHERE installation_id=9').run();
  const { cookie } = await signIn(original);
  let enter, release, closurePrepared = false;
  const entered = new Promise(resolve => { enter = resolve; });
  const resume = new Promise(resolve => { release = resolve; });
  const delayed = {
    prepare(sql) { if (sql.includes('AS admitted')) closurePrepared = true; return database.prepare(sql); },
    async batch(statements) {
      if (closurePrepared) { closurePrepared = false; enter(); await resume; }
      return database.batch(statements);
    }
  };
  const app = compose(undefined, { env: { APP_DB: delayed } });
  const pending = app.auth.closeAccount({ session: cookie, method: 'POST', origin: ORIGIN, repositoryIds: [] });
  // Observe rejection immediately too, so the controlled await never creates an unhandled rejection.
  const outcome = pending.then(() => null, error => error);
  await entered;
  await original.auth.revokeAuthorization({ session: cookie, method: 'POST', origin: ORIGIN });
  const { cookie: later } = await signIn(original);
  release();
  assert.equal((await outcome)?.code, 'E_ADMISSION_STALE');
  assert.ok((await original.auth.authenticate(later)).userId === 123, 'the newer authorization and session stay usable');
  await original.auth.closeAccount({ session: later, method: 'POST', origin: ORIGIN });
  await assert.rejects(original.auth.authenticate(later), { code: 'E_SESSION_UNAVAILABLE' });
  await database.prepare('UPDATE installations SET account_id=123 WHERE installation_id=9').run();
});

test('closure refuses incomplete local sets and erases retained offboarding rows despite an empty viewer projection', async () => {
  const { app: compose } = await fixture({ seed: seedClosure });
  const app = compose(), database = app.appStore.database;
  const { cookie } = await signIn(app), sessionHash = createHash('sha256').update(cookie).digest('hex');
  const repositories = (await database.prepare('SELECT repository_id AS repositoryId,settings_revision AS revision FROM repositories WHERE installation_id=9').all()).results;
  for (const targets of [[], repositories.slice(1)]) {
    await assert.rejects(closeLocalAccount({ database, userId: 123, repositories: targets, sessionHash, now: app.now }), { code: 'E_ADMISSION_STALE' });
    assert.equal((await app.auth.authenticate(cookie)).userId, 123);
  }
  await database.prepare("UPDATE repositories SET state=CASE WHEN repository_id=1004 THEN 'offboarding' ELSE 'removed' END,access_state='removed' WHERE installation_id=9").run();
  await database.prepare("INSERT INTO history_records(repository_id,pull_request,comparison_id,policy_id,schema_version,engine_version,report_version,metric_version,observed_at,projection_json,coverage_json,results_json,gaps_json,state) VALUES (1004,99,'retained','fixture',1,'fixture','fixture','fixture',?,'{}','{}','{}','[]','published')").bind(app.now()).run();
  const session = await openSession(new Request(`${ORIGIN}/manage/account`, { headers: { cookie: `${SESSION_COOKIE}=${cookie}` } }), app);
  const response = await handleManageAction(new Request(`${ORIGIN}/manage/do`, { method: 'POST', headers: { origin: ORIGIN }, body: new URLSearchParams({ action: 'close-account', confirm: 'ada-sample' }) }),
    { runtime: app, session, viewer: { userId: 123, login: 'ada-sample', repositories: [], namespaces: [] } });
  assert.equal(response.headers.get('location'), '/sign-in?reason=E_ACCOUNT_CLOSED');
  assert.equal((await database.prepare('SELECT count(*) AS n FROM history_records WHERE repository_id=1004').first()).n, 0);
  assert.equal((await database.prepare('SELECT state FROM repositories WHERE repository_id=1004').first()).state, 'offboarding', 'closure must not restore removed provider reach');
});

test('delayed account writers cannot recreate erased facts or revoke a newer sign-in', async () => {
  const { app: compose } = await fixture({ seed: seedClosure });
  const app = compose(), database = app.appStore.database;
  const { cookie } = await signIn(app), sessionHash = createHash('sha256').update(cookie).digest('hex');
  const personalPolicy = await app.manage.createLinkedPolicy({ accountId: 123, name: 'Closing policy', configuration: {} });
  const session = await openSession(new Request(`${ORIGIN}/manage/account`, { headers: { cookie: `${SESSION_COOKIE}=${cookie}` } }), app);
  let enter, release;
  const entered = new Promise(resolve => { enter = resolve; }), resumed = new Promise(resolve => { release = resolve; });
  const pending = handleManageAction(new Request(`${ORIGIN}/manage/do`, { method: 'POST', headers: { origin: ORIGIN }, body: new URLSearchParams({ action: 'link' }) }),
    { runtime: { ...app, commercial: { async beginLink() { enter(); await resumed; return { outcome: 'authorize', authorizationUrl: `${ORIGIN}/fixture`, headers: {}, attemptStateHash: 'fixture' }; } } }, session, viewer: { userId: 123, login: 'ada-sample', repositories: [] } });
  await entered;
  await app.auth.closeAccount({ session: cookie, method: 'POST', origin: ORIGIN });
  const { cookie: later } = await signIn(app);
  release();
  await pending;
  await app.manage.select(1004, 123, sessionHash);
  await app.manage.connectFree(123, 7001, sessionHash);
  await app.manage.savePlanChoice(123, { target: 'free' }, sessionHash);
  await app.manage.saveNamespaceDefault(123, { configuration: {}, actorId: 123, expectedRevision: 0, sessionHash });
  await app.manage.createLinkedPolicy({ accountId: 123, name: 'Stale policy', configuration: {}, actorId: 123, sessionHash });
  await app.manage.linkRepository(1004, personalPolicy, 123, sessionHash);
  await app.manage.createPublication({ policyId: personalPolicy, revision: 1, repositoryIds: [1004] });
  await app.manage.saveAutomaticSetup(123, { actorId: 123, sessionHash });
  await app.manage.grantDelegation({ accountId: 123, userId: 456, login: 'fixture', role: 'account-admin', grantedBy: 123, sessionHash });
  await app.manage.recordEvent({ accountId: 123, actor: { id: 123 }, where: 'fixture', what: 'stale', result: 'applied', sessionHash });
  const campaign = { key: 'fixture', version: 1, survey: 'fixture' };
  await app.participationStore.saveDraft(123, campaign, {}, sessionHash);
  await app.participationStore.complete(123, campaign, {}, sessionHash);
  await app.participationStore.recordInvitation(123, campaign, sessionHash);
  await app.participationStore.dismiss(123, campaign, sessionHash);
  await app.participationStore.savePreview(123, 'monthly', {}, '2027-01-01T00:00:00.000Z', sessionHash);
  await new D1AuthorizationStore(database, { now: app.now }).revokeAuthorization(123, { disconnectService: true, sessionHash });
  await app.manage.revokeUserSessions(123, sessionHash);
  for (const [table, column] of [['repository_selections','actor_id'],['free_connections','user_id'],['works_departures','user_id'],['plan_change_choices','user_id'],['namespace_defaults','account_id'],['linked_policies','account_id'],['automatic_setup','account_id'],['administrative_events','account_id'],['participation_responses','user_id'],['participation_prompts','user_id'],['participation_previews','user_id'],['user_service_connections','user_id']]) {
    assert.equal((await database.prepare(`SELECT count(*) AS n FROM ${table} WHERE ${column}=123`).first()).n, 0, `${table} stays erased`);
  }
  assert.equal((await database.prepare('SELECT count(*) AS n FROM policy_publications WHERE policy_id=?').bind(personalPolicy).first()).n, 0);
  assert.equal((await app.auth.authenticate(later)).userId, 123);
  const laterHash = createHash('sha256').update(later).digest('hex');
  await app.manage.connectFree(123, 7001, laterHash);
  await app.manage.recordDeparture(123, { purpose: 'new-choice', sessionHash: laterHash });
  await app.manage.saveNamespaceDefault(123, { configuration: { name: 'new' }, actorId: 123, expectedRevision: 0, sessionHash: laterHash });
  await app.participationStore.saveDraft(123, campaign, { newAnswer: true }, laterHash);
  await app.manage.disconnectFree(123, sessionHash);
  await app.manage.clearDeparture(123, sessionHash);
  await app.manage.removeNamespaceDefault(123, sessionHash);
  await app.manage.saveNamespaceDefault(123, { configuration: { name: 'old' }, actorId: 123, expectedRevision: 1, sessionHash });
  await app.participationStore.deleteAnswers(123, campaign, sessionHash);
  await app.participationStore.complete(123, campaign, { oldAnswer: true }, sessionHash);
  assert.equal((await app.manage.freeConnection(123)).organisationId, 7001);
  assert.equal((await app.manage.departure(123)).purpose, 'new-choice');
  assert.equal((await app.manage.namespaceDefault(123)).configuration.name, 'new');
  assert.deepEqual((await app.participationStore.response(123, campaign)).answers, { newAnswer: true });
});
