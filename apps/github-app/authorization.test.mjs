// SPDX-License-Identifier: AGPL-3.0-only

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { Miniflare } from 'miniflare';
import { D1AppStore } from './storage.mjs';
import { D1AuthorizationStore } from './authorization-storage.mjs';
import { createAuthorizationService, protectedHeaders } from './authorization.mjs';
import { createAdmissionService } from './admission.mjs';

const migrationNames = [
  '0001_initial.sql', '0002_consent-provenance.sql', '0003_preserve-active-consent.sql',
  '0004_admission-settings.sql', '0005_offboarding-consent-tombstones.sql', '0006_user-authorization.sql'
];
const ORIGIN = 'https://dashboard.example.test';
const CALLBACK = `${ORIGIN}/oauth/callback`;
const CONTEXT = 'operator-home';
const CODE = 'callback-code-private';
const TOKEN = 'github-user-token-private';
const PROVIDER_BODY = 'provider-body-private';
const REPOSITORY_NAME = 'private/repository-name';
const TEST_SESSION_MS = 2 * 60 * 60_000;

function oauthBinding(beginResult) {
  const binding = beginResult.headers['Set-Cookie'].match(/^__Host-diffdevil-oauth=([^;]+)/u)?.[1];
  assert.ok(binding);
  return binding;
}

async function fixture() {
  const clock = { value: '2026-09-23T00:00:00.000Z' };
  const runtime = new Miniflare({ workers: [{
    config: { name: 'auth-test', type: 'worker', compatibilityDate: '2026-09-17', env: { APP_DB: { type: 'd1', id: `auth-${crypto.randomUUID()}` } }, manifest: { mainModule: 'worker.mjs', modulesRoot: resolve('.'), modules: { 'worker.mjs': { type: 'esm', contents: 'export default { fetch() { return new Response("ok"); } };' } } } }
  }] });
  const database = await runtime.getD1Database('APP_DB');
  const appStore = new D1AppStore(database, { now: () => clock.value });
  for (const name of migrationNames) await appStore.migrate(await readFile(resolve('apps/github-app/migrations', name), 'utf8'));
  await appStore.recordLifecycle({ installationId: 9, action: 'created', addedRepositories: [17], removedRepositories: [] });
  const store = new D1AuthorizationStore(database, { now: () => clock.value });
  const vault = new Map();
  const protector = {
    seal: async material => { const handle = `sealed:${crypto.randomUUID()}`; vault.set(handle, material); return handle; },
    open: async handle => vault.get(handle)
  };
  const providerState = { userValid: true, installation: 'active', repository: 'available', canAdminister: true, checks: 0, exchanges: 0,
    authorizationExpiresAt: '2026-09-23T01:00:00.000Z' };
  const provider = {
    authorizationUrl: async ({ state }) => providerState.authorizationUrlOverride?.(state)
      ?? `https://github.com/login/oauth/authorize?client_id=fixture&state=${state}&redirect_uri=${encodeURIComponent(CALLBACK)}`,
    exchangeCode: async ({ code }) => { assert.equal(code, CODE); providerState.exchanges++; return { material: { accessToken: TOKEN, refreshToken: 'refresh-private', body: PROVIDER_BODY }, expiresAt: providerState.authorizationExpiresAt }; },
    userForAuthorization: async material => { assert.equal(material.accessToken, TOKEN); return 123; },
    verifyUserAuthorization: async ({ userId, material }) => {
      assert.equal(userId, 123); assert.equal(material.accessToken, TOKEN);
      const shouldRefresh = providerState.refreshOnVerify;
      await providerState.onVerify?.();
      return shouldRefresh
        ? { valid: providerState.userValid, material: { ...material, refreshToken: 'rotated-private' }, expiresAt: '2026-09-23T02:00:00.000Z' }
        : { valid: providerState.userValid };
    },
    checkRepositoryAccess: async ({ userId, installationId, repositoryId, kind }) => {
      assert.equal(userId, 123); assert.equal(installationId, 9); assert.equal(repositoryId, 17);
      assert.ok(['read', 'update'].includes(kind)); providerState.checks++;
      return { installation: providerState.installation, repository: providerState.repository, canAdminister: providerState.canAdminister, fullName: REPOSITORY_NAME };
    }
  };
  const admission = createAdmissionService({ store: appStore, authorize: async request => request.actor?.role === 'repository-admin' });
  const service = createAuthorizationService({ store, admission, provider, protector, returnContexts: [CONTEXT, 'account-home'], allowedOrigins: [ORIGIN], allowedCallbackUrls: [CALLBACK], sessionLifetimeMs: TEST_SESSION_MS, now: () => clock.value });
  return { runtime, database, appStore, store, service, clock, providerState, protector };
}

async function signIn(service) {
  const begun = await service.begin(CONTEXT);
  const { artifact, returnContext } = await service.complete({ state: begun.state, code: CODE, browserBinding: oauthBinding(begun) });
  assert.equal(returnContext, CONTEXT);
  const result = await service.exchange({ artifact, returnContext: CONTEXT, method: 'POST', origin: ORIGIN });
  const session = result.headers['Set-Cookie'].match(/^__Host-diffdevil-session=([^;]+)/u)?.[1];
  assert.ok(session);
  return { state: begun.state, browserBinding: oauthBinding(begun), artifact, session, result };
}

test('state is bound to the initiating browser, while return context, expiry and replay remain enforced', async () => {
  const source = await fixture();
  try {
    const { service, clock, providerState } = source;
    await assert.rejects(service.begin('https://evil.example/'), { code: 'E_AUTH_RETURN_CONTEXT' });
    await assert.rejects(service.begin('//evil.example/'), { code: 'E_AUTH_RETURN_CONTEXT' });
    const first = await service.begin(CONTEXT);
    assert.match(first.authorizationUrl, /^https:\/\/github\.com\/login\/oauth\/authorize\?/u);
    assert.match(first.headers['Set-Cookie'], /HttpOnly; Secure; SameSite=Lax/u);
    const victim = await service.begin(CONTEXT);
    await assert.rejects(service.complete({ state: first.state, code: CODE, browserBinding: oauthBinding(victim) }), { code: 'E_AUTH_STATE' });
    await assert.rejects(service.complete({ state: first.state, code: CODE }), { code: 'E_AUTH_STATE' });
    assert.equal(providerState.exchanges, 0, 'a foreign browser never reaches code exchange');
    const valid = await service.complete({ state: first.state, code: CODE, browserBinding: oauthBinding(first) });
    assert.equal(valid.returnContext, CONTEXT);
    assert.match(valid.headers['Set-Cookie'], /^__Host-diffdevil-oauth=;/u);
    await assert.rejects(service.complete({ state: first.state, code: CODE, browserBinding: oauthBinding(first) }), { code: 'E_AUTH_STATE' });
    await assert.rejects(service.exchange({ artifact: valid.artifact, returnContext: 'other', method: 'POST', origin: ORIGIN }), { code: 'E_AUTH_RETURN_CONTEXT' });
    await assert.rejects(service.exchange({ artifact: valid.artifact, returnContext: 'account-home', method: 'POST', origin: ORIGIN }), { code: 'E_AUTH_ARTIFACT' });
    const artifactExpires = await service.begin(CONTEXT);
    const short = await service.complete({ state: artifactExpires.state, code: CODE, browserBinding: oauthBinding(artifactExpires) });
    clock.value = '2026-09-23T00:03:00.000Z';
    await assert.rejects(service.exchange({ artifact: short.artifact, returnContext: CONTEXT, method: 'POST', origin: ORIGIN }), { code: 'E_AUTH_ARTIFACT' });
    const expiring = await service.begin(CONTEXT);
    clock.value = '2026-09-23T00:14:00.000Z';
    await assert.rejects(service.complete({ state: expiring.state, code: CODE, browserBinding: oauthBinding(expiring) }), { code: 'E_AUTH_STATE' });
  } finally { await source.runtime.dispose(); }
});

test('callback, one-time artifact and rotated session preserve consent and do not persist browser secrets', async () => {
  const source = await fixture();
  try {
    const { service, appStore, database } = source;
    const before = await appStore.repositoryConsentState(17);
    const { state, browserBinding, artifact, session, result } = await signIn(service);
    assert.deepEqual(await service.authenticate(session), { userId: 123, returnContext: CONTEXT });
    assert.equal(result.headers['Set-Cookie'].includes('HttpOnly; Secure; SameSite=Lax'), true);
    assert.equal(result.headers['Set-Cookie'].includes('Path=/'), true);
    assert.deepEqual(protectedHeaders(), { 'Cache-Control': 'private, no-store', Vary: 'Cookie' });
    assert.deepEqual(await appStore.repositoryConsentState(17), before);
    await assert.rejects(service.exchange({ artifact, returnContext: CONTEXT, method: 'POST', origin: ORIGIN }), { code: 'E_AUTH_ARTIFACT' });

    const persisted = JSON.stringify({
      attempts: (await database.prepare('SELECT * FROM authorization_attempts').all()).results,
      authorizations: (await database.prepare('SELECT * FROM user_authorizations').all()).results,
      artifacts: (await database.prepare('SELECT * FROM authorization_artifacts').all()).results,
      sessions: (await database.prepare('SELECT * FROM browser_sessions').all()).results
    });
    for (const privateValue of [state, browserBinding, artifact, session, CODE, TOKEN, PROVIDER_BODY, REPOSITORY_NAME]) assert.equal(persisted.includes(privateValue), false);
    const rotated = await service.rotate({ session, method: 'POST', origin: ORIGIN });
    const nextSession = rotated.headers['Set-Cookie'].match(/^__Host-diffdevil-session=([^;]+)/u)?.[1];
    assert.ok(nextSession && nextSession !== session);
    await assert.rejects(service.authenticate(session), { code: 'E_SESSION_UNAVAILABLE' });
    assert.deepEqual(await service.authenticate(nextSession), { userId: 123, returnContext: CONTEXT });
    const logout = await service.logout({ session: nextSession, method: 'POST', origin: ORIGIN });
    assert.match(logout.headers['Set-Cookie'], /Max-Age=0; HttpOnly; Secure; SameSite=Lax/u);
    await assert.rejects(service.authenticate(nextSession), { code: 'E_SESSION_UNAVAILABLE' });
  } finally { await source.runtime.dispose(); }
});

test('mutations require a same-origin non-GET request and current administrator authority', async () => {
  const source = await fixture();
  try {
    const { service, appStore, database, providerState, clock } = source;
    const { session } = await signIn(service);
    const initial = await service.readAdmission({ session, repositoryId: 17 });
    assert.equal(initial.headers['Cache-Control'], 'private, no-store');
    assert.equal(initial.body.execution.reason, 'never-enabled');
    const settings = { origin: 'account-default', revision: initial.body.revision, writer: { confidence: 'administrator-declared' }, execution: true };
    await assert.rejects(service.updateAdmission({ session, repositoryId: 17, method: 'GET', origin: ORIGIN, settings }), { code: 'E_AUTH_METHOD' });
    await assert.rejects(service.updateAdmission({ session, repositoryId: 17, method: 'POST', origin: 'https://evil.example', settings }), { code: 'E_AUTH_ORIGIN' });
    await assert.rejects(service.updateAdmission({ session, repositoryId: 17, method: 'POST', settings }), { code: 'E_AUTH_ORIGIN' });
    assert.equal((await appStore.repositoryAdmission(17)).revision, initial.body.revision);
    const changed = await service.updateAdmission({ session, repositoryId: 17, method: 'POST', origin: ORIGIN, settings });
    assert.equal(changed.body.writer.confidence, 'administrator-declared');
    assert.equal(changed.body.writer.origin, 'dashboard');
    assert.equal(changed.body.execution.origin, 'dashboard');
    assert.equal((await appStore.historySettings(17)).enabled, false);
    await assert.rejects(service.updateAdmission({ session, repositoryId: 17, method: 'POST', origin: ORIGIN, settings }), { code: 'E_ADMISSION_STALE' });
    await assert.rejects(service.updateAdmission({ session, repositoryId: 17, method: 'POST', origin: ORIGIN,
      settings: { revision: changed.body.revision, configuration: { unknownKey: true } } }), { code: 'E_ADMISSION_CONFIGURATION' });
    assert.equal(providerState.checks, 4, 'current access is reacquired on every authorized admission attempt');

    providerState.repository = 'removed';
    await assert.rejects(service.readAdmission({ session, repositoryId: 17 }), { code: 'E_ADMISSION_UNAUTHORIZED' });
    providerState.repository = 'available'; providerState.installation = 'suspended';
    await assert.rejects(service.updateAdmission({ session, repositoryId: 17, method: 'POST', origin: ORIGIN, settings: { ...settings, revision: changed.body.revision } }), { code: 'E_ADMISSION_UNAUTHORIZED' });
    providerState.installation = 'active'; providerState.canAdminister = false;
    await assert.rejects(service.readAdmission({ session, repositoryId: 17 }), { code: 'E_ADMISSION_UNAUTHORIZED' });
    providerState.canAdminister = true;
    await appStore.recordLifecycle({ installationId: 9, action: 'suspend', addedRepositories: [], removedRepositories: [] });
    await assert.rejects(service.updateAdmission({ session, repositoryId: 17, method: 'POST', origin: ORIGIN, settings: { ...settings, revision: changed.body.revision } }), { code: 'E_ADMISSION_UNAVAILABLE' });
    await appStore.recordLifecycle({ installationId: 9, action: 'unsuspend', addedRepositories: [], removedRepositories: [] });
    await database.prepare('INSERT INTO deletion_tombstones (scope, deleted_at, reapply_until) VALUES (?, ?, ?)').bind('repository:17', clock.value, '2026-09-24T00:00:00.000Z').run();
    await assert.rejects(service.updateAdmission({ session, repositoryId: 17, method: 'POST', origin: ORIGIN, settings: { ...settings, revision: changed.body.revision } }), { code: 'E_ADMISSION_TOMBSTONED' });
  } finally { await source.runtime.dispose(); }
});

test('expired or revoked user authorization denies sessions independently of installation consent', async () => {
  const source = await fixture();
  try {
    const { service, store, clock, providerState, appStore } = source;
    const { session } = await signIn(service);
    providerState.userValid = false;
    await assert.rejects(service.authenticate(session), { code: 'E_AUTHORIZATION_UNAVAILABLE' });
    providerState.userValid = true;
    clock.value = '2026-09-23T01:00:00.000Z';
    await assert.rejects(service.authenticate(session), { code: 'E_AUTHORIZATION_UNAVAILABLE' });
    assert.equal((await appStore.repositoryConsentState(17)).execution.reason, 'never-enabled');
    clock.value = '2026-09-23T00:30:00.000Z';
    await store.revokeAuthorization(123);
    await assert.rejects(service.authenticate(session), { code: 'E_SESSION_UNAVAILABLE' });
  } finally { await source.runtime.dispose(); }
});

test('provider and authorization refusals expose only stable codes and protected headers', async () => {
  const source = await fixture();
  try {
    const { service, providerState } = source;
    const { session } = await signIn(service);
    providerState.repository = 'removed';
    let error;
    try { await service.readAdmission({ session, repositoryId: 17 }); } catch (caught) { error = caught; }
    assert.equal(error?.code, 'E_ADMISSION_UNAUTHORIZED');
    assert.deepEqual(error?.headers, protectedHeaders());
    const snapshot = JSON.stringify({ code: error.code, message: error.message, headers: error.headers });
    for (const privateValue of [CODE, TOKEN, PROVIDER_BODY, REPOSITORY_NAME, session]) assert.equal(snapshot.includes(privateValue), false);
  } finally { await source.runtime.dispose(); }
});

test('a concurrent revocation cannot be undone by authorization refresh', async () => {
  const source = await fixture();
  try {
    const { service, store, providerState, database } = source;
    const { session } = await signIn(service);
    providerState.refreshOnVerify = true;
    providerState.onVerify = () => store.revokeAuthorization(123);
    await assert.rejects(service.authenticate(session), { code: 'E_AUTHORIZATION_UNAVAILABLE' });
    assert.ok((await store.authorization(123)).revoked_at);
    assert.equal((await database.prepare('SELECT count(*) AS count FROM browser_sessions WHERE user_id=123 AND revoked_at IS NOT NULL').first()).count, 1);
  } finally { await source.runtime.dispose(); }
});

test('authorization begins only at GitHub with the exact state and selected callback', async () => {
  const source = await fixture();
  try {
    const { service, providerState } = source;
    providerState.authorizationUrlOverride = state => `https://evil.example/login/oauth/authorize?state=${state}&redirect_uri=${encodeURIComponent(CALLBACK)}`;
    await assert.rejects(service.begin(CONTEXT), { code: 'E_AUTH_DESTINATION' });
    providerState.authorizationUrlOverride = state => `https://github.com/login/oauth/authorize?state=${state}&state=other&redirect_uri=${encodeURIComponent(CALLBACK)}`;
    await assert.rejects(service.begin(CONTEXT), { code: 'E_AUTH_DESTINATION' });
    providerState.authorizationUrlOverride = state => `https://github.com/login/oauth/authorize?state=${state}&redirect_uri=https%3A%2F%2Fevil.example%2Fcallback`;
    await assert.rejects(service.begin(CONTEXT), { code: 'E_AUTH_DESTINATION' });
  } finally { await source.runtime.dispose(); }
});

test('the last logout removes a dormant grant, while a pending artifact keeps sign-in usable', async () => {
  const source = await fixture();
  try {
    const { service, store, clock, providerState } = source;
    providerState.authorizationExpiresAt = '2027-03-23T00:00:00.000Z';
    const first = await signIn(service);
    const second = await signIn(service);
    const begun = await service.begin(CONTEXT);
    const pending = await service.complete({ state: begun.state, code: CODE, browserBinding: oauthBinding(begun) });
    await service.logout({ session: first.session, method: 'POST', origin: ORIGIN });
    assert.ok((await store.authorization(123))?.protected_material, 'another usable session retains the grant');
    await service.logout({ session: second.session, method: 'POST', origin: ORIGIN });
    assert.ok((await store.authorization(123))?.protected_material, 'a pending artifact retains the grant');
    await store.maintain();
    assert.ok((await store.authorization(123))?.protected_material, 'maintenance preserves the in-flight exchange');
    const exchanged = await service.exchange({ artifact: pending.artifact, returnContext: CONTEXT, method: 'POST', origin: ORIGIN });
    const session = exchanged.headers['Set-Cookie'].match(/^__Host-diffdevil-session=([^;]+)/u)?.[1];
    assert.deepEqual(await service.authenticate(session), { userId: 123, returnContext: CONTEXT });
    await service.logout({ session, method: 'POST', origin: ORIGIN });
    assert.equal(await store.authorization(123), null, 'the final logout removes protected material');

    const later = await signIn(service);
    clock.value = '2026-09-23T02:01:00.000Z';
    await store.maintain();
    assert.equal(await store.authorization(123), null, 'expiry maintenance removes a grant with no usable session');
    await assert.rejects(service.authenticate(later.session), { code: 'E_SESSION_UNAVAILABLE' });
  } finally { await source.runtime.dispose(); }
});

test('a malformed old session does not consume a valid authorization artifact', async () => {
  const source = await fixture();
  try {
    const { service } = source;
    const begun = await service.begin(CONTEXT);
    const pending = await service.complete({ state: begun.state, code: CODE, browserBinding: oauthBinding(begun) });
    const exchanged = await service.exchange({ artifact: pending.artifact, returnContext: CONTEXT, method: 'POST', origin: ORIGIN, previousSession: 'broken' });
    const session = exchanged.headers['Set-Cookie'].match(/^__Host-diffdevil-session=([^;]+)/u)?.[1];
    assert.deepEqual(await service.authenticate(session), { userId: 123, returnContext: CONTEXT });
    await assert.rejects(service.authenticate('broken'), { code: 'E_SESSION_UNAVAILABLE' });
  } finally { await source.runtime.dispose(); }
});

test('artifact exchange replaces an old session only when the new session is committed', async () => {
  const source = await fixture();
  try {
    const { service, store } = source;
    const old = await signIn(service);
    const begun = await service.begin(CONTEXT);
    const pending = await service.complete({ state: begun.state, code: CODE, browserBinding: oauthBinding(begun) });
    await assert.rejects(service.exchange({ artifact: 'broken', returnContext: CONTEXT, method: 'POST', origin: ORIGIN,
      previousSession: old.session }), { code: 'E_AUTH_ARTIFACT' });
    assert.deepEqual(await service.authenticate(old.session), { userId: 123, returnContext: CONTEXT });
    const replacement = await service.exchange({ artifact: pending.artifact, returnContext: CONTEXT, method: 'POST', origin: ORIGIN,
      previousSession: old.session });
    const session = replacement.headers['Set-Cookie'].match(/^__Host-diffdevil-session=([^;]+)/u)?.[1];
    await assert.rejects(service.authenticate(old.session), { code: 'E_SESSION_UNAVAILABLE' });
    assert.deepEqual(await service.authenticate(session), { userId: 123, returnContext: CONTEXT });
    assert.ok((await store.authorization(123))?.protected_material);
  } finally { await source.runtime.dispose(); }
});

test('a concurrent refresh winner remains usable without reviving revoked grants', async () => {
  const source = await fixture();
  try {
    const { service, store, protector, providerState } = source;
    const { session } = await signIn(service);
    providerState.refreshOnVerify = true;
    providerState.onVerify = async () => {
      providerState.onVerify = undefined;
      providerState.refreshOnVerify = false;
      const row = await store.authorization(123);
      const replacement = await protector.seal({ accessToken: TOKEN, refreshToken: 'winner-private' });
      assert.equal(await store.refreshAuthorization(123, row.protected_material, replacement, '2026-09-23T02:00:00.000Z'), true);
    };
    assert.deepEqual(await service.authenticate(session), { userId: 123, returnContext: CONTEXT });
    assert.equal((await store.authorization(123)).revoked_at, null);
  } finally { await source.runtime.dispose(); }
});
