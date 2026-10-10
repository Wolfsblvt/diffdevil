// SPDX-License-Identifier: AGPL-3.0-only

import assert from 'node:assert/strict';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { Miniflare } from 'miniflare';
import { COMMERCIAL_ROUTES, createGitHubAppWorker } from './app.mjs';
import { commercialFromEnv, decideProjection } from './commercial.mjs';
import { D1CommercialStore } from './commercial-storage.mjs';
import { readSigningKeys, signedHeaders, verifySignedMessage } from './commercial-wirt.mjs';
import { normalizeWebhookEvent } from './contracts.mjs';
import { D1AppStore } from './storage.mjs';
import { D1AuthorizationStore } from './authorization-storage.mjs';
import { createAuthorizationService } from './authorization.mjs';

const migrations = ['0001_initial.sql', '0002_consent-provenance.sql', '0003_preserve-active-consent.sql', '0004_admission-settings.sql',
  '0005_offboarding-consent-tombstones.sql', '0006_user-authorization.sql', '0007_consent-actors.sql', '0010_commercial-links.sql'];
const APP = 'https://app.example.test';
const WIRT = 'https://works.example.test';
const KEY = 'fixture-signing-key-material-of-at-least-32-bytes';
const PREVIOUS = 'fixture-previous-key-material-of-at-least-32-bytes';
const CALLBACK = `${APP}${COMMERCIAL_ROUTES.callback}`;
const CONTINUATION = `${APP}/account/plan`;
const USER = 123, ORG = 9001, OTHER_USER = 456;
const SESSION = 'session-for-user-123', OTHER_SESSION = 'session-for-user-456';

// An independent implementation of Wirt's PHP grammar: hash_hmac over LF-joined lines, no trailing LF.
function wirtSignature(key, { method, path, account, timestamp, nonce, body }) {
  const bodyHash = createHash('sha256').update(body).digest('hex');
  return createHmac('sha256', key).update(['wirt-http/v1', 'diffdevil', method, path, account, timestamp, nonce, bodyHash].join('\n')).digest('hex');
}
function wirtHeaders(key, { method, path, account, body, clock, keyId = 'current', nonce = randomUUID() }) {
  const timestamp = String(Math.floor(Date.parse(clock.value) / 1000));
  return { 'x-wirt-key': keyId, 'x-wirt-time': timestamp, 'x-wirt-nonce': nonce, 'x-wirt-product-account': account,
    'x-wirt-signature': wirtSignature(key, { method, path, account, timestamp, nonce, body }) };
}
const s256 = verifier => createHash('sha256').update(verifier).digest('base64url');

function projection({ linkId, worksAccount = '77', productAccount = USER, epoch = 1, version = 1, standing = 'funded', tier = 'pro', slots = ['slot-included'], lineage = [] }) {
  return { schema: 'wirt.benefit-projection/v1', client: 'diffdevil',
    stream: { works_account: worksAccount, link: { id: linkId, product_account: { github_user_id: productAccount } } },
    account_lineage: lineage, order: { epoch, version }, generated_at: '2027-03-01T06:00:12Z', source_operation: null,
    commercial: { standing, tier, cadence: 'monthly', period: { started_on: '2027-03-01', ends_on: '2027-04-01' }, renewal_preference: 'automatic',
      cancellation_intent: 'none', grace: standing === 'renewal-in-grace' ? { renewal: 'payment-due' } : null, ended: null,
      next_renewal: { on: '2027-04-01', total_cents: 900, currency: 'EUR', tax_inclusive: true } },
    benefits: { organisation_capacity: slots.map(slot => ({ slot, funding: slot === 'slot-included' ? 'included' : 'paid', pending_end_on: null })), grants: [], protection: null },
    pending: [], bindings_seen: [] };
}
function notice({ linkId, worksAccount = '77', productAccount = USER, epoch = 1, version = 9 }) {
  return { schema: 'wirt.link-ended/v1', client: 'diffdevil', stream: { works_account: worksAccount, link: { id: linkId, product_account: { github_user_id: productAccount } } },
    order: { epoch, version }, ended_at: '2027-03-16T09:30:00Z' };
}

/**
 * A disposable Wirt double that independently verifies signed bytes, PKCE, expiring owner tokens and the
 * report-history rule: a reused report version with different content is divergence.
 */
function wirtDouble(clock) {
  const state = { intents: new Map(), links: new Map(), codes: new Map(), tokens: new Map(), refresh: new Map(), reports: [], cases: [], requests: [],
    reportAnswer: undefined, establishmentLost: 0, latest: new Map(), history: new Map(), down: false };
  const respond = (status, value, headers = {}) => new Response(value === undefined ? null : JSON.stringify(value), { status, headers: { 'content-type': 'application/json', ...headers } });
  const issue = userId => {
    const access = `access-${randomUUID()}`, refresh = `refresh-${randomUUID()}`;
    state.tokens.set(access, { userId, expiresAt: Date.parse(clock.value) + 3_600_000 }); state.refresh.set(refresh, userId);
    return { token_type: 'Bearer', expires_in: 3600, access_token: access, refresh_token: refresh };
  };
  // Wirt keeps report history across a product rollback; this mirrors its duplicate/out-of-order/divergent answers.
  const recordReport = (linkId, text) => {
    const report = JSON.parse(text), history = state.history.get(linkId) ?? new Map();
    state.history.set(linkId, history);
    const high = Math.max(0, ...history.keys());
    if (report.report_version <= high) {
      const previous = history.get(report.report_version);
      if (previous !== undefined && previous !== text) return respond(409, { message: 'divergent-report' });
      return respond(200, { result: report.report_version === high ? 'duplicate' : 'out-of-order' });
    }
    history.set(report.report_version, text);
    return undefined;
  };
  const signedTerminal = (path, account, value) => {
    const body = JSON.stringify(value);
    return respond(410, value, wirtHeaders(KEY, { method: 'RESPONSE', path, account, body, clock }));
  };
  async function fetch(input, init) {
    const url = new URL(input), path = url.pathname, method = init.method, headers = new Headers(init.headers);
    const body = init.body === undefined ? new Uint8Array() : new Uint8Array(init.body);
    const text = new TextDecoder().decode(body);
    state.requests.push({ method, path, headers, text });
    assert.equal(init.redirect, 'manual', 'Wirt calls never follow redirects');
    if (state.down) throw new TypeError('connection refused');
    if (path === '/api/oauth/token') {
      const form = new URLSearchParams(text);
      assert.equal(form.get('client_id'), 'diffdevil-public-client');
      if (form.get('grant_type') === 'authorization_code') {
        const code = state.codes.get(form.get('code'));
        state.codes.delete(form.get('code'));
        if (!code || form.get('redirect_uri') !== CALLBACK || s256(form.get('code_verifier')) !== code.challenge) return respond(400, { error: 'invalid_grant' });
        return respond(200, issue(code.userId));
      }
      const userId = state.refresh.get(form.get('refresh_token'));
      if (!userId) return respond(400, { error: 'invalid_grant' });
      state.refresh.delete(form.get('refresh_token'));
      for (const [token, entry] of state.tokens) if (entry.userId === userId) state.tokens.delete(token); // Native refresh revokes the prior access token.
      return respond(200, issue(userId));
    }
    const signature = headers.get('x-wirt-signature');
    const expected = wirtSignature(KEY, { method, path, account: headers.get('x-wirt-product-account'), timestamp: headers.get('x-wirt-time'), nonce: headers.get('x-wirt-nonce'), body });
    if (signature !== expected) return respond(401, { message: 'unauthenticated' });
    if (path === '/api/wirt/diffdevil/link-intents') {
      const input = JSON.parse(text), id = randomUUID();
      assert.match(input.challenge, /^[A-Za-z0-9_-]{43}$/u);
      state.intents.set(id, { ...input, approved: false });
      return respond(201, { intent: id, authorization_url: `${WIRT}/wirt/products/diffdevil/link/${id}` });
    }
    const token = state.tokens.get((headers.get('authorization') ?? '').replace(/^Bearer /u, ''));
    const owner = token && token.expiresAt > Date.parse(clock.value) ? token.userId : undefined;
    if (path === '/api/wirt/diffdevil/links' && method === 'POST') {
      const intent = state.intents.get(JSON.parse(text).intent);
      if (!owner) return respond(401, {});
      if (!intent?.approved || intent.owner !== owner) return respond(403, {});
      if (!intent.link) {
        intent.link = randomUUID();
        state.links.set(intent.link, { id: intent.link, owner, productAccount: intent.product_account, ended: false });
      }
      if (state.establishmentLost > 0) { state.establishmentLost--; throw new TypeError('connection reset'); }
      return respond(201, { stream: { works_account: String(owner), link: { id: intent.link, product_account: { github_user_id: intent.product_account } } } });
    }
    const match = path.match(/^\/api\/wirt\/diffdevil\/links\/([^/]+)(\/projection|\/reports)?$/u);
    const link = match && state.links.get(decodeURIComponent(match[1]));
    if (match && !match[2] && method === 'DELETE') {
      if (!owner) return respond(401, {});
      if (!link || link.owner !== owner) return respond(404, {});
      link.ended = true;
      return respond(204);
    }
    if (!link || headers.get('x-wirt-product-account') !== String(link.productAccount)) return respond(404, {});
    if (link.ended) return signedTerminal(path, String(link.productAccount), notice({ linkId: link.id, worksAccount: String(link.owner), productAccount: link.productAccount }));
    if (match[2] === '/projection') {
      const latest = state.latest.get(link.id) ?? state.seed?.(link);
      return latest ? respond(200, latest) : respond(409, { message: 'Commercial state is not yet available.' });
    }
    const report = JSON.parse(text);
    // Wirt's report shape: authority is present|absent|unknown, a label only with present authority,
    // and `partially-applied` opens a product-disagreement case (commercial-projection.md at e370ae6).
    if (report.bindings.some(binding => !['present', 'absent', 'unknown'].includes(binding.authority) || (binding.authority !== 'present' && binding.display !== null))) return respond(422, {});
    if (report.applied.result === 'partially-applied') state.cases.push({ linkId: link.id, case: 'product-partially-applied' });
    state.reports.push(report);
    if (state.reportAnswer) return state.reportAnswer(path, link);
    const answered = recordReport(link.id, text);
    if (answered) return answered;
    return respond(200, { result: 'recorded', applied_result: JSON.parse(text).applied.result });
  }
  function approve(intentId, owner) {
    const intent = state.intents.get(intentId);
    intent.approved = true; intent.owner = owner;
    const code = `code-${randomUUID()}`;
    state.codes.set(code, { userId: owner, challenge: intent.challenge });
    return { code, state: intent.state };
  }
  return { state, fetch, approve, signedTerminal };
}

async function fixture({ Store = D1CommercialStore, realAuthorization = false } = {}) {
  const clock = { value: '2027-03-01T06:00:20.000Z' };
  const now = () => clock.value;
  const runtime = new Miniflare({ workers: [{
    config: { name: 'commercial-test', type: 'worker', compatibilityDate: '2026-09-17', env: { APP_DB: { type: 'd1', id: `commercial-${randomUUID()}` } }, manifest: { mainModule: 'worker.mjs', modulesRoot: resolve('.'), modules: { 'worker.mjs': { type: 'esm', contents: 'export default { fetch() { return new Response("ok"); } };' } } } }
  }] });
  const database = await runtime.getD1Database('APP_DB');
  const appStore = new D1AppStore(database, { now });
  for (const name of migrations) await appStore.migrate(await readFile(resolve('apps/github-app/migrations', name), 'utf8'));
  const store = new Store(database, { now });
  const wirt = wirtDouble(clock);
  const vault = new Map();
  const protector = { seal: async value => { const handle = `sealed:${randomUUID()}`; vault.set(handle, structuredClone(value)); return handle; }, open: async handle => structuredClone(vault.get(handle)) };
  const administers = new Map([[USER, new Set([ORG])], [OTHER_USER, new Set([ORG])]]);
  const sessions = new Map([[SESSION, USER], [OTHER_SESSION, OTHER_USER]]);
  // Users whose GitHub authorization the product still retains; the background observation needs it.
  const retained = new Set([USER, OTHER_USER]);
  const github = { answering: true };
  const observe = userId => organisationId => {
    // The real adapter answers `unknown` when GitHub does not answer the administration check.
    if (!github.answering) return { userId, authority: 'unknown', display: null };
    const present = administers.get(userId)?.has(organisationId);
    return { userId, authority: present ? 'present' : 'absent', display: present ? 'example-org' : null };
  };
  let authorization = {
    authenticate: async session => { if (!sessions.has(session)) throw Object.assign(new Error('E_SESSION_UNAVAILABLE'), { code: 'E_SESSION_UNAVAILABLE' }); return { userId: sessions.get(session) }; },
    organisationAuthority: async ({ session, organisationId }) => {
      const userId = sessions.get(session);
      if (!userId) throw Object.assign(new Error('E_SESSION_UNAVAILABLE'), { code: 'E_SESSION_UNAVAILABLE' });
      return observe(userId)(organisationId);
    },
    observeOrganisationAuthority: async ({ userId, organisationId }) => retained.has(userId) ? observe(userId)(organisationId) : { userId, authority: 'unknown', display: null }
  };
  const authStore = new D1AuthorizationStore(database, { now });
  const browserSessions = new Map();
  let signIn;
  if (realAuthorization) {
    const provider = {
      authorizationUrl: async ({ state }) => `https://github.com/login/oauth/authorize?state=${state}&redirect_uri=${encodeURIComponent(`${APP}/oauth/callback`)}`,
      exchangeCode: async ({ code }) => ({ material: { userId: Number(code) }, expiresAt: '2027-04-01T00:00:00.000Z' }),
      userForAuthorization: async material => material.userId,
      verifyUserAuthorization: async ({ userId, material }) => ({ valid: retained.has(userId) && material.userId === userId }),
      checkOrganisationAdministration: async ({ userId, material, organisationId }) => {
        assert.equal(material.userId, userId);
        if (!github.answering) throw new Error('fixture provider unavailable');
        return { administer: administers.get(userId)?.has(organisationId) === true, login: 'example-org' };
      }
    };
    authorization = createAuthorizationService({ store: authStore, admission: {}, provider, protector, returnContexts: ['account'],
      allowedOrigins: [APP], allowedCallbackUrls: [`${APP}/oauth/callback`], sessionLifetimeMs: 60 * 60_000, now });
    signIn = async (userId, previousSession) => {
      const begun = await authorization.begin('account');
      const browserBinding = begun.headers['Set-Cookie'].match(/^__Host-diffdevil-oauth=([^;]+)/u)[1];
      const completed = await authorization.complete({ state: begun.state, code: String(userId), browserBinding });
      const exchanged = await authorization.exchange({ artifact: completed.artifact, returnContext: 'account', method: 'POST', origin: APP, previousSession });
      const session = exchanged.headers['Set-Cookie'].match(/^__Host-diffdevil-session=([^;]+)/u)[1];
      browserSessions.set(userId === USER ? SESSION : OTHER_SESSION, session);
      return session;
    };
    await signIn(USER);
    await signIn(OTHER_USER);
  }
  const env = { APP_DB: database, WIRT_SIGNING_KEY_CURRENT: KEY, WIRT_SIGNING_KEY_PREVIOUS: PREVIOUS, WIRT_ORIGIN: WIRT, WIRT_OAUTH_CLIENT_ID: 'diffdevil-public-client', WIRT_LINK_CALLBACK_URL: CALLBACK };
  const commercial = commercialFromEnv(env, { store, authorization, protector, allowedOrigins: [APP], linkContinuationUrl: CONTINUATION, fetch: wirt.fetch, now });
  const worker = createGitHubAppWorker({ store: appStore, commercial });
  const call = (path, init = {}) => worker.fetch(new Request(`${APP}${path}`, init), env);
  const browser = (session = SESSION, cookies = '') => ({ cookie: [`__Host-diffdevil-session=${browserSessions.get(session) ?? session}`, cookies].filter(Boolean).join('; '), origin: APP });
  return { runtime, database, appStore, store, wirt, clock, commercial, worker, env, call, browser, administers, retained, github, vault,
    authorization, authStore, browserSessions, signIn };
}

const at = source => Date.parse(source.clock.value);
const rows = async (source, table) => (await source.database.prepare(`SELECT * FROM ${table}`).all()).results ?? [];
/** Every retained commercial byte, to prove where a private label survives and where it does not. */
async function commercialBytes(source) {
  const tables = ['commercial_links', 'commercial_bindings', 'commercial_refusals', 'commercial_reports', 'commercial_link_attempts'];
  return JSON.stringify(await Promise.all(tables.map(table => rows(source, table))));
}

async function link(source, { session = SESSION, owner = USER } = {}) {
  const begun = await source.call(COMMERCIAL_ROUTES.link, { method: 'POST', headers: source.browser(session) });
  assert.equal(begun.status, 200);
  const binding = begun.headers.get('set-cookie').match(/^__Host-diffdevil-works-link=([^;]+)/u)[1];
  const { authorizationUrl } = await begun.json();
  const intent = new URL(authorizationUrl).pathname.split('/').at(-1);
  const approved = source.wirt.approve(intent, owner);
  const callback = await source.call(`${COMMERCIAL_ROUTES.callback}?code=${approved.code}&state=${approved.state}`, { headers: source.browser(session, `__Host-diffdevil-works-link=${binding}`) });
  return { callback, intent, binding, approved };
}

async function push(source, value, { account = String(value.stream.link.product_account.github_user_id), key = KEY, keyId = 'current', path = COMMERCIAL_ROUTES.projection, body = JSON.stringify(value), nonce } = {}) {
  return source.call(path, { method: 'POST', headers: { 'content-type': 'application/json', ...wirtHeaders(key, { method: 'POST', path: path.split('?')[0], account, body, clock: source.clock, keyId, nonce }) }, body });
}

test('outbound signing matches an independent implementation of the Wirt byte grammar', async () => {
  const clock = { value: '2027-03-01T00:00:00.000Z' };
  const signing = readSigningKeys({ current: KEY, previous: PREVIOUS });
  const body = '{"intent":"x"}';
  const headers = await signedHeaders(signing, { method: 'post', path: '/api/wirt/diffdevil/links', body, account: '', now: () => Date.parse(clock.value) });
  assert.equal(headers['X-Wirt-Signature'], wirtSignature(KEY, { method: 'POST', path: '/api/wirt/diffdevil/links', account: '', timestamp: headers['X-Wirt-Time'], nonce: headers['X-Wirt-Nonce'], body }));
  const check = (overrides = {}, verifyAt = clock) => verifySignedMessage(signing, { method: 'POST', path: '/p', body: new TextEncoder().encode(overrides.body ?? body),
    headers: new Headers(wirtHeaders(overrides.key ?? KEY, { method: 'POST', path: overrides.signedPath ?? '/p', account: '5', body, clock, keyId: overrides.keyId ?? 'current' })), now: () => Date.parse(verifyAt.value) });
  assert.equal((await check()).account, '5');
  assert.equal((await check({ key: PREVIOUS, keyId: 'previous' })).keyId, 'previous', 'an overlap key verifies during rotation');
  await assert.rejects(check({ body: '{"intent":"y"}' }), { code: 'E_COMMERCIAL_SIGNATURE' });
  await assert.rejects(check({ signedPath: '/other' }), { code: 'E_COMMERCIAL_SIGNATURE' });
  await assert.rejects(check({ keyId: 'previous' }), { code: 'E_COMMERCIAL_SIGNATURE' });
  await assert.rejects(check({}, { value: '2027-03-01T00:05:01.000Z' }), { code: 'E_COMMERCIAL_SIGNATURE' }, 'more than five minutes of skew is refused');
  assert.throws(() => readSigningKeys({ current: 'too-short' }), { code: 'E_COMMERCIAL_CONFIGURATION' });
});

test('consumption decisions follow the Wirt contract specimens', () => {
  // Wirt fixtures/commercial/projection-examples.v1.json consumption_cases at 04e253a8.
  const record = (works, epoch, version) => ({ works_account: works, applied_epoch: epoch, applied_version: version });
  const message = (works, epoch, version, lineage = []) => ({ stream: { worksAccount: works }, order: { epoch, version }, lineage });
  assert.equal(decideProjection(record('acct-ada', 1, 4), message('acct-ada', 1, 5)).kind, 'apply');
  assert.equal(decideProjection(record('acct-ada', 1, 5), message('acct-ada', 1, 5)).kind, 'no-op');
  assert.equal(decideProjection(record('acct-ada', 1, 6), message('acct-sam', 2, 3, ['acct-ada'])).kind, 'apply-and-rekey');
  assert.equal(decideProjection(record('acct-ada', 1, 6), message('acct-tom', 3, 1, ['acct-ada', 'acct-sam'])).kind, 'apply-and-rekey');
  assert.equal(decideProjection(record('acct-zed', 1, 6), message('acct-tom', 3, 1, ['acct-ada', 'acct-sam'])).kind, 'reject');
  assert.equal(decideProjection(record('acct-ada', 2, 4), message('acct-sam', 2, 3, ['acct-ada'])).kind, 'not-applied', 'lineage never overrides ordering');
  assert.equal(decideProjection({ works_account: 'acct-ada', applied_epoch: null }, message('acct-ada', 1, 1)).kind, 'apply');
});

test('a customer-approved link is browser-bound, PKCE-protected, resumable and seeded from the pull fallback', async () => {
  const source = await fixture();
  try {
    const { call, browser, wirt, store } = source;
    assert.equal((await call(COMMERCIAL_ROUTES.link, { method: 'POST', headers: { ...browser(), origin: 'https://evil.example' } })).status, 403);
    assert.equal((await call(COMMERCIAL_ROUTES.link, { method: 'POST', headers: browser('not-a-session') })).status, 401);

    // A different browser cannot finish someone else's approval, even in the same product account.
    const begun = await call(COMMERCIAL_ROUTES.link, { method: 'POST', headers: browser() });
    const { authorizationUrl } = await begun.json();
    assert.equal(new URL(authorizationUrl).origin, WIRT);
    assert.match(begun.headers.get('set-cookie'), /HttpOnly; Secure; SameSite=Lax/u);
    assert.equal(begun.headers.get('cache-control'), 'private, no-store');
    const approved = wirt.approve(new URL(authorizationUrl).pathname.split('/').at(-1), 77);
    const foreign = await call(`${COMMERCIAL_ROUTES.callback}?code=${approved.code}&state=${approved.state}`, { headers: browser(SESSION, '__Host-diffdevil-works-link=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') });
    assert.equal(foreign.status, 303);
    assert.equal(new URL(foreign.headers.get('location')).searchParams.get('works-link'), 'invalid');
    assert.equal(wirt.state.links.size, 0, 'a foreign browser never reaches code exchange');

    wirt.state.establishmentLost = 1; // Wirt commits the link, then the first response is lost.
    const lost = await link(source, { owner: 77 });
    assert.equal(new URL(lost.callback.headers.get('location')).searchParams.get('works-link'), 'pending', 'an unknown outcome is not reported as a failure');
    assert.equal(await store.activeLink(USER), null);
    wirt.state.seed = value => projection({ linkId: value.id, worksAccount: String(value.owner), version: 1 });
    const resumed = await call(COMMERCIAL_ROUTES.link, { method: 'POST', headers: browser() });
    assert.deepEqual(await resumed.json(), { ok: true, result: 'linked' }, 'retry reuses the same intent and owner grant; no second consent');
    assert.equal(wirt.state.links.size, 1, 'Wirt created exactly one association');
    const record = await store.activeLink(USER);
    assert.equal(record.works_account, '77');
    assert.equal(record.applied_version, 1, 'the pull fallback seeded current state at establishment');
    assert.equal(await source.commercial.entitlement({ repositoryId: null, actor: { userId: USER } }), 'pro');
    assert.equal(JSON.stringify(await source.database.prepare('SELECT * FROM commercial_links').all()).includes('access-'), false, 'owner tokens are sealed, never stored raw');
    assert.equal((await call(COMMERCIAL_ROUTES.link, { method: 'POST', headers: browser() })).status, 409);

    // Denial returns the customer to the product with a typed outcome and no link.
    const denied = await call(COMMERCIAL_ROUTES.link, { method: 'POST', headers: browser(OTHER_SESSION) });
    const deniedBinding = denied.headers.get('set-cookie').match(/^__Host-diffdevil-works-link=([^;]+)/u)[1];
    const deniedIntent = wirt.state.intents.get(new URL((await denied.json()).authorizationUrl).pathname.split('/').at(-1));
    const refusal = await call(`${COMMERCIAL_ROUTES.callback}?error=access_denied&state=${deniedIntent.state}`, { headers: browser(OTHER_SESSION, `__Host-diffdevil-works-link=${deniedBinding}`) });
    assert.equal(new URL(refusal.headers.get('location')).searchParams.get('works-link'), 'denied');
    assert.match(refusal.headers.get('set-cookie'), /^__Host-diffdevil-works-link=;/u);
    assert.equal(await store.activeLink(OTHER_USER), null);
  } finally { await source.runtime.dispose(); }
});

test('signed pushes apply in order, report after durable state and stop at the terminal notice', async () => {
  const source = await fixture();
  try {
    const { call, wirt, store, appStore } = source;
    await link(source, { owner: 77 });
    const linkId = (await store.activeLink(USER)).link_id;
    assert.equal((await store.link(linkId)).applied_epoch, null, 'a link alone is not commercial confirmation');
    const lifecycle = normalizeWebhookEvent('installation', { action: 'created', installation: { id: 9, account: { id: USER } }, repositories: [{ id: 17 }] }, source.clock.value, 'lifecycle-1');
    assert.equal(lifecycle.accountId, USER);
    await appStore.recordLifecycle(lifecycle);
    await appStore.recordInstallationAccount(9, lifecycle.accountId);
    await appStore.recordLifecycle({ installationId: 10, action: 'created', addedRepositories: [18], removedRepositories: [] });
    assert.equal(await source.commercial.entitlement({ repositoryId: 17, actor: { userId: OTHER_USER } }), 'free');
    assert.equal(await source.commercial.entitlement({ repositoryId: 18, actor: { userId: USER } }), 'unknown', 'an unrecorded namespace is not free');

    const first = projection({ linkId, version: 4 });
    const nonce = randomUUID();
    const applied = await push(source, first, { nonce });
    assert.equal(applied.status, 200);
    assert.deepEqual(await applied.json(), { ok: true, result: 'apply' });
    assert.equal(await source.commercial.entitlement({ repositoryId: 17, actor: { userId: OTHER_USER } }), 'pro', 'the funded namespace, not the reader, carries the plan');
    assert.equal(await source.commercial.entitlement({ repositoryId: null, actor: { userId: USER } }), 'pro');
    assert.equal(wirt.state.reports.length, 1);
    assert.deepEqual(wirt.state.reports[0], { schema: 'wirt.product-report/v1', client: 'diffdevil',
      stream: { works_account: '77', link: { id: linkId, product_account: { github_user_id: USER } } }, report_version: at(source),
      applied: { epoch: 1, version: 4, result: 'applied', reason: null, at: source.clock.value }, bindings: [], refused_bindings: [] });

    assert.equal((await push(source, first, { nonce })).status, 409, 'a reused nonce is refused before payload use');
    assert.equal((await push(source, first, { key: 'an-unconfigured-key-of-at-least-32-bytes!!' })).status, 401);
    assert.equal((await push(source, first, { account: String(OTHER_USER) })).status, 404, 'a signed header for another account never selects this link');
    assert.equal((await push(source, first, { path: `${COMMERCIAL_ROUTES.projection}?x=1` })).status, 400);
    assert.equal((await push(source, first, { body: JSON.stringify(first) + ' '.repeat(65_537) })).status, 413);
    assert.equal((await push(source, { ...first, commercial: { ...first.commercial, standing: 'paid' } })).status, 422);
    assert.equal((await push(source, projection({ linkId: randomUUID(), version: 5 }))).status, 404, 'an unknown link is indistinguishable');
    assert.equal((await push(source, projection({ linkId, productAccount: OTHER_USER, version: 5 }))).status, 404, 'a stream for another product account is not applied');

    assert.deepEqual(await (await push(source, first)).json(), { ok: true, result: 'no-op' });
    assert.equal(wirt.state.reports.at(-1).report_version, at(source) + 1, 'an equal redelivery re-reports the same applied order under the next version');
    assert.deepEqual(wirt.state.reports.at(-1).applied, wirt.state.reports[0].applied);
    assert.deepEqual(await (await push(source, projection({ linkId, version: 3, standing: 'ended' }))).json(), { ok: true, result: 'not-applied' });
    assert.deepEqual(wirt.state.reports.at(-1).applied.version, 4, 'a lower order is evidence; the product reports what it actually applied');
    assert.equal(await source.commercial.entitlement({ repositoryId: 17, actor: { userId: USER } }), 'pro');

    await push(source, projection({ linkId, version: 6, standing: 'renewal-in-grace', tier: 'business' }));
    assert.equal(await source.commercial.entitlement({ repositoryId: 17, actor: { userId: USER } }), 'business', 'grace keeps benefits');
    assert.deepEqual(await (await push(source, projection({ linkId, worksAccount: '78', version: 7 }))).json(), { ok: true, result: 'reject' });
    assert.equal(wirt.state.reports.at(-1).applied.result, 'rejected');
    assert.equal((await store.link(linkId)).works_account, '77', 'an account outside the lineage never re-keys the link');
    assert.deepEqual(await (await push(source, projection({ linkId, worksAccount: '78', epoch: 2, version: 1, lineage: ['77'] }))).json(), { ok: true, result: 'apply-and-rekey' });
    assert.equal((await store.link(linkId)).works_account, '78');
    await push(source, projection({ linkId, worksAccount: '78', epoch: 2, version: 2, standing: 'first-payment-pending' }));
    assert.equal(await source.commercial.entitlement({ repositoryId: 17, actor: { userId: USER } }), 'free', 'only funded or grace standing grants premium');

    const reports = wirt.state.reports.length;
    assert.deepEqual(await (await push(source, notice({ linkId, worksAccount: '78', epoch: 2, version: 3 }))).json(), { ok: true, result: 'ended' });
    assert.equal(await source.commercial.entitlement({ repositoryId: 17, actor: { userId: USER } }), 'free');
    assert.equal((await store.link(linkId)).protected_grant, null);
    assert.equal((await push(source, projection({ linkId, worksAccount: '78', epoch: 2, version: 4 }))).status, 409, 'an ended link never revives');
    assert.deepEqual(await (await push(source, notice({ linkId, worksAccount: '78', epoch: 2, version: 3 }))).json(), { ok: true, result: 'ended' }, 'terminal redelivery is idempotent');
    assert.equal(wirt.state.reports.length, reports, 'no further reports after the link ended');
  } finally { await source.runtime.dispose(); }
});

test('organisation bindings need current authority, one funder and purchased capacity', async () => {
  const source = await fixture();
  try {
    const { call, browser, wirt, store, appStore, administers } = source;
    await link(source, { owner: 77 });
    const linkId = (await store.activeLink(USER)).link_id;
    await push(source, projection({ linkId, version: 1, tier: 'business', slots: ['slot-included', 'slot-1'] }));
    await appStore.recordLifecycle({ installationId: 11, action: 'created', addedRepositories: [21], removedRepositories: [] });
    await appStore.recordInstallationAccount(11, ORG);
    const bind = (body, session = SESSION) => call(COMMERCIAL_ROUTES.bindings, { method: 'POST', headers: { ...browser(session), 'content-type': 'application/json' }, body: JSON.stringify(body) });

    assert.equal((await bind({ action: 'bind', slot: 'slot-9', organisationId: ORG })).status, 409, 'only purchased capacity can be bound');
    administers.get(USER).delete(ORG);
    assert.deepEqual(await (await bind({ action: 'bind', slot: 'slot-1', organisationId: ORG })).json(), { ok: false, result: 'refused', code: 'organisation-authority-not-present' });
    assert.deepEqual(wirt.state.reports.at(-1).refused_bindings, [{ slot: 'slot-1', github_org_id: ORG, reason: 'organisation-authority-not-present' }]);
    assert.equal(await source.commercial.entitlement({ repositoryId: 21, actor: { userId: USER } }), 'free', 'payment never grants an organisation it cannot administer');

    administers.get(USER).add(ORG);
    assert.deepEqual(await (await bind({ action: 'bind', slot: 'slot-1', organisationId: ORG })).json(), { ok: true, result: 'bound' });
    assert.deepEqual(wirt.state.reports.at(-1).bindings, [{ slot: 'slot-1', github_org_id: ORG, display: 'example-org', authority: 'present', since: '2027-03-01' }]);
    assert.deepEqual(wirt.state.reports.at(-1).refused_bindings, [], 'a refusal is reported once Wirt accepted it');
    assert.equal(await source.commercial.entitlement({ repositoryId: 21, actor: { userId: OTHER_USER } }), 'business');

    // A second subscriber cannot stack funding on the same organisation.
    await link(source, { session: OTHER_SESSION, owner: 88 });
    const otherLink = (await store.activeLink(OTHER_USER)).link_id;
    await push(source, projection({ linkId: otherLink, worksAccount: '88', productAccount: OTHER_USER, version: 1 }));
    assert.deepEqual(await (await bind({ action: 'bind', slot: 'slot-included', organisationId: ORG }, OTHER_SESSION)).json(), { ok: false, result: 'refused', code: 'organisation-has-funder' });

    // The organisation's administrator may disconnect another person's funding.
    assert.deepEqual(await (await bind({ action: 'unbind', organisationId: ORG }, OTHER_SESSION)).json(), { ok: true, result: 'unbound' });
    assert.equal(await source.commercial.entitlement({ repositoryId: 21, actor: { userId: USER } }), 'free');
    await bind({ action: 'bind', slot: 'slot-1', organisationId: ORG });
    // A slot removed from the applied capacity no longer funds its organisation.
    await push(source, projection({ linkId, version: 2, tier: 'business', slots: ['slot-included'] }));
    assert.equal(await store.binding(ORG), null);
    assert.equal(await source.commercial.entitlement({ repositoryId: 21, actor: { userId: USER } }), 'free');

    source.clock.value = '2027-04-01T00:00:00.000Z';
    await source.commercial.maintain();
    const retained = (await source.database.prepare('SELECT link_id, report_version FROM commercial_reports ORDER BY link_id').all()).results;
    assert.deepEqual(retained.map(row => row.report_version), [...new Set(retained.map(row => row.link_id))].map(id => Math.max(...retained.filter(row => row.link_id === id).map(row => row.report_version))),
      'accepted report bodies age out while each link keeps its latest report');
  } finally { await source.runtime.dispose(); }
});

test('reports retry, record conflicts and accept only a signed terminal answer', async () => {
  const source = await fixture();
  try {
    const { wirt, store, clock } = source;
    await link(source, { owner: 77 });
    const linkId = (await store.activeLink(USER)).link_id;
    wirt.state.reportAnswer = () => new Response('{}', { status: 503 });
    await push(source, projection({ linkId, version: 1 }));
    let report = await store.latestReport(linkId);
    assert.equal(report.state, 'pending');
    assert.equal(report.attempts, 1);
    assert.equal(report.next_attempt_at, '2027-03-01T06:01:20.000Z');

    // An unsigned 410 cannot end the link.
    wirt.state.reportAnswer = () => new Response(JSON.stringify(notice({ linkId })), { status: 410 });
    clock.value = '2027-03-01T06:01:21.000Z';
    await source.commercial.flushReports();
    assert.equal((await store.link(linkId)).state, 'active');
    report = await store.latestReport(linkId);
    assert.equal(report.attempts, 2);

    // A 401 on a signed report may be clock skew; it stays within the bounded backoff instead of failing permanently.
    wirt.state.reportAnswer = () => new Response('{}', { status: 401 });
    clock.value = '2027-03-01T06:06:22.000Z';
    await source.commercial.flushReports();
    report = await store.latestReport(linkId);
    assert.equal(report.state, 'pending');
    assert.equal(report.code, 'E_COMMERCIAL_REPORT_UNAUTHENTICATED');
    assert.equal(report.last_status, 401);

    wirt.state.reportAnswer = () => new Response('{}', { status: 409 });
    clock.value = '2027-03-01T06:21:23.000Z';
    await source.commercial.flushReports();
    report = await store.latestReport(linkId);
    assert.equal(report.state, 'failed');
    assert.equal(report.code, 'E_COMMERCIAL_REPORT_CONFLICT');

    wirt.state.reportAnswer = (path, linkState) => wirt.signedTerminal(path, String(USER), notice({ linkId: linkState.id }));
    await push(source, projection({ linkId, version: 2 }));
    assert.equal((await store.link(linkId)).state, 'ended', 'a signed 410 is authoritative');
    assert.equal((await store.link(linkId)).end_source, 'wirt-answer');
  } finally { await source.runtime.dispose(); }
});

test('product unlink rotates an expired owner grant, ends benefits and keeps working through Wirt', async () => {
  const source = await fixture();
  try {
    const { call, browser, wirt, store, clock } = source;
    await link(source, { owner: 77 });
    const record = await store.activeLink(USER);
    await push(source, projection({ linkId: record.link_id, version: 1 }));
    clock.value = '2027-03-01T08:00:00.000Z'; // The access token has expired; the refresh grant remains.
    const response = await call(COMMERCIAL_ROUTES.unlink, { method: 'POST', headers: browser() });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, result: 'unlinked' });
    assert.equal(wirt.state.requests.filter(request => request.path === '/api/oauth/token').length, 2, 'one code exchange and one refresh');
    const revoke = wirt.state.requests.find(request => request.method === 'DELETE');
    assert.equal(revoke.headers.get('x-wirt-product-account'), '', 'owner-token operations carry an empty account header');
    const ended = await store.link(record.link_id);
    assert.equal(ended.state, 'ended');
    assert.equal(ended.end_source, 'product-unlink');
    assert.equal(await source.commercial.entitlement({ repositoryId: null, actor: { userId: USER } }), 'free');
    assert.equal((await call(COMMERCIAL_ROUTES.unlink, { method: 'POST', headers: browser() })).status, 404);
    const status = await call(COMMERCIAL_ROUTES.status, { headers: browser() });
    assert.deepEqual(await status.json(), { linked: false });
  } finally { await source.runtime.dispose(); }
});

test('the default Worker serves only the signed receiver from configuration and refuses unconfigured routes', async () => {
  const source = await fixture();
  try {
    const worker = createGitHubAppWorker({ store: source.appStore });
    const unconfigured = await worker.fetch(new Request(`${APP}${COMMERCIAL_ROUTES.projection}`, { method: 'POST', body: '{}' }), { APP_DB: source.database });
    assert.equal(unconfigured.status, 503);
    const env = { APP_DB: source.database, WIRT_SIGNING_KEY_CURRENT: KEY };
    const body = JSON.stringify(projection({ linkId: randomUUID() }));
    const headers = wirtHeaders(KEY, { method: 'POST', path: COMMERCIAL_ROUTES.projection, account: String(USER), body, clock: { value: new Date().toISOString() } });
    assert.equal((await worker.fetch(new Request(`${APP}${COMMERCIAL_ROUTES.projection}`, { method: 'POST', headers, body }), env)).status, 404, 'verified, then unknown');
    assert.equal((await worker.fetch(new Request(`${APP}${COMMERCIAL_ROUTES.link}`, { method: 'POST', headers: { origin: APP } }), env)).status, 503, 'browser routes need the installed authorization adapter');
    assert.equal((await worker.fetch(new Request(`${APP}/integrations/wirt/other`), env)).status, 404);
  } finally { await source.runtime.dispose(); }
});

/** Runs one injected writer between a handler's read of a link and its transition batch. */
class InterleavingStore extends D1CommercialStore {
  async transition(link, change) {
    const between = this.between;
    this.between = undefined;
    if (between) await between(link);
    return super.transition(link, change);
  }
}

async function fundedOrganisation(source, linkId, version = 1) {
  await push(source, projection({ linkId, version, tier: 'business', slots: ['slot-included', 'slot-1'] }));
  await source.appStore.recordLifecycle({ installationId: 11, action: 'created', addedRepositories: [21], removedRepositories: [] });
  await source.appStore.recordInstallationAccount(11, ORG);
}
const bindRequest = (source, body, session = SESSION) => source.call(COMMERCIAL_ROUTES.bindings, { method: 'POST',
  headers: { ...source.browser(session), 'content-type': 'application/json' }, body: JSON.stringify(body) });

test('a lost compare-and-set leaves no binding, refusal or report behind', async () => {
  const source = await fixture({ Store: InterleavingStore });
  try {
    const { store, vault } = source;
    await link(source, { owner: 77 });
    const ended = (await store.activeLink(USER)).link_id;
    await fundedOrganisation(source, ended);
    const reportsBefore = (await rows(source, 'commercial_reports')).length;

    // A terminal notice wins after the binding handler read its link and before its batch ran.
    store.between = stale => store.endLink(stale.link_id, { source: 'wirt-notice', endedAt: source.clock.value });
    const refused = await bindRequest(source, { action: 'bind', slot: 'slot-1', organisationId: ORG });
    assert.equal(refused.status, 404);
    assert.equal((await refused.json()).code, 'E_COMMERCIAL_NOT_LINKED');
    assert.equal(await store.binding(ORG), null, 'no binding is recreated on the ended link');
    assert.equal((await rows(source, 'commercial_reports')).length, reportsBefore, 'no report is queued by the lost transaction');

    // The organisation's unique funder key is free, so a legitimate new link can fund it.
    await link(source, { owner: 77 });
    const current = (await store.activeLink(USER)).link_id;
    await fundedOrganisation(source, current);
    const count = async () => (await rows(source, 'commercial_reports')).filter(row => row.link_id === current).length;

    // A grant rotation advances the revision by exactly one; the stale decision must not borrow it.
    let before = await count();
    store.between = async stale => {
      const rotated = `sealed:${randomUUID()}`;
      vault.set(rotated, vault.get(stale.protected_grant));
      assert.equal(await store.replaceGrant(stale.link_id, stale.protected_grant, rotated), true);
    };
    assert.deepEqual(await (await bindRequest(source, { action: 'bind', slot: 'slot-1', organisationId: ORG })).json(), { ok: true, result: 'bound' });
    assert.equal(await count(), before + 1, 'only the transaction that won the revision queued a report');

    // A different active transition (a newer projection) wins the same race.
    before = await count();
    store.between = () => push(source, projection({ linkId: current, version: 2, tier: 'business', slots: ['slot-included', 'slot-1'] }));
    assert.deepEqual(await (await bindRequest(source, { action: 'unbind', organisationId: ORG })).json(), { ok: true, result: 'unbound' });
    assert.equal(await count(), before + 2, 'the projection and the re-decided unbind each queued exactly one report');
    assert.equal(await store.binding(ORG), null);
    assert.equal(new Set((await rows(source, 'commercial_reports')).map(row => `${row.link_id}:${row.report_version}`)).size, (await rows(source, 'commercial_reports')).length);
  } finally { await source.runtime.dispose(); }
});

const RESTORED_TABLES = ['commercial_links', 'commercial_bindings', 'commercial_refusals', 'commercial_reports', 'commercial_link_attempts'];
async function snapshot(source) { return Promise.all(RESTORED_TABLES.map(table => rows(source, table))); }
/** A disposable restore of the commercial tables to an earlier point, as a database restore would leave them. */
async function restore(source, point) {
  const statements = [...RESTORED_TABLES].reverse().map(table => source.database.prepare(`DELETE FROM ${table}`));
  RESTORED_TABLES.forEach((table, index) => {
    for (const row of point[index]) {
      const columns = Object.keys(row);
      statements.push(source.database.prepare(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`).bind(...columns.map(column => row[column])));
    }
  });
  await source.database.batch(statements);
}

test('a restored store holds Works funding until Wirt reconciles it and reports above Wirt\'s retained versions', async () => {
  const source = await fixture();
  try {
    const { call, browser, wirt, store, clock, commercial } = source;
    await link(source, { owner: 77 });
    const unlinked = (await store.activeLink(USER)).link_id;
    await push(source, projection({ linkId: unlinked, version: 1 }));
    await link(source, { session: OTHER_SESSION, owner: 88 });
    const kept = (await store.activeLink(OTHER_USER)).link_id;
    await push(source, projection({ linkId: kept, worksAccount: '88', productAccount: OTHER_USER, version: 1 }));
    const point = await snapshot(source);

    // After the restore point: one customer unlinks, the other's subscription changes.
    clock.value = '2027-03-02T06:00:00.000Z';
    assert.equal((await call(COMMERCIAL_ROUTES.unlink, { method: 'POST', headers: browser() })).status, 200);
    const upgraded = projection({ linkId: kept, worksAccount: '88', productAccount: OTHER_USER, version: 2, tier: 'business' });
    wirt.state.latest.set(kept, upgraded);
    await push(source, upgraded);
    const retainedByWirt = Math.max(...wirt.state.history.get(kept).keys());

    clock.value = '2027-03-03T06:00:00.000Z';
    await restore(source, point);
    assert.equal(await commercial.entitlement({ repositoryId: null, actor: { userId: USER } }), 'pro', 'the restored rows alone are stale: this is why the restore occasion runs the seam');
    assert.ok((await store.link(kept)).report_version < retainedByWirt, 'the restored report counter is below what Wirt already holds');

    // The restore occasion: Wirt is briefly unreachable, so both links stay held rather than served.
    wirt.state.down = true;
    assert.deepEqual(await commercial.reconcileAfterRestore(), { held: 2, current: 0, ended: 0, unavailable: 2 });
    assert.equal(await commercial.entitlement({ repositoryId: null, actor: { userId: USER } }), 'unknown', 'a held link grants nothing until Wirt answers');
    assert.equal(await commercial.entitlement({ repositoryId: null, actor: { userId: OTHER_USER } }), 'unknown');
    const status = await (await call(COMMERCIAL_ROUTES.status, { headers: browser(OTHER_SESSION) })).json();
    assert.equal(status.reconciling, true);
    assert.equal(status.plan, 'unknown');

    // Scheduled maintenance finishes reconciliation once Wirt answers.
    wirt.state.down = false;
    clock.value = '2027-03-03T07:00:00.000Z';
    assert.deepEqual((await commercial.maintain()).restored, { current: 1, ended: 1, unavailable: 0 });
    assert.equal((await store.link(unlinked)).state, 'ended', 'a link that ended after the restore point stays ended');
    assert.equal(await commercial.entitlement({ repositoryId: null, actor: { userId: USER } }), 'free');
    assert.equal(await commercial.entitlement({ repositoryId: null, actor: { userId: OTHER_USER } }), 'business', 'Wirt\'s current projection replaced the restored one');
    assert.equal((await store.link(kept)).restored_at, null);
    assert.ok(Math.max(...wirt.state.history.get(kept).keys()) > retainedByWirt, 'the next report exceeds every version Wirt already holds');
    assert.deepEqual((await rows(source, 'commercial_reports')).filter(row => row.state === 'failed'), [], 'no reused version diverged');
    assert.deepEqual((await commercial.maintain()).restored, { current: 0, ended: 0, unavailable: 0 }, 'released links are not pulled again');
  } finally { await source.runtime.dispose(); }
});

test('authority is an observed, rechecked fact: funding survives its loss, organisation use and labels do not', async () => {
  const source = await fixture();
  try {
    const { call, browser, wirt, store, administers, retained, clock, commercial } = source;
    await link(source, { owner: 77 });
    const linkId = (await store.activeLink(USER)).link_id;
    await fundedOrganisation(source, linkId);
    assert.deepEqual(await (await bindRequest(source, { action: 'bind', slot: 'slot-1', organisationId: ORG })).json(), { ok: true, result: 'bound' });
    assert.equal(wirt.state.reports.at(-1).bindings[0].display, 'example-org', 'the pending report disclosed the current label');
    assert.equal((await rows(source, 'commercial_reports')).some(row => row.body.includes('example-org') || row.disclosure), false, 'sent report evidence keeps no label');
    const statusOf = async () => (await (await call(COMMERCIAL_ROUTES.status, { headers: browser() })).json());

    // The funder reads their status after losing administration: absence is observed, funding survives.
    administers.get(USER).delete(ORG);
    clock.value = '2027-03-01T07:00:00.000Z';
    let status = await statusOf();
    assert.equal(status.plan, 'business', 'the subscription itself is unchanged');
    assert.deepEqual(status.capacity.find(value => value.slot === 'slot-1').binding, { organisationId: ORG, authority: 'absent', authorityCheckedAt: clock.value, display: null });
    assert.equal(await commercial.entitlement({ repositoryId: 21, actor: { userId: OTHER_USER } }), 'free', 'absent authority withholds organisation use');
    assert.equal((await store.binding(ORG)).slot, 'slot-1', 'the binding and its funded slot remain');
    await commercial.flushReports();
    assert.deepEqual(wirt.state.reports.at(-1).bindings, [{ slot: 'slot-1', github_org_id: ORG, display: null, authority: 'absent', since: '2027-03-01' }], 'Wirt is told to drop the label');
    assert.equal((await commercialBytes(source)).includes('example-org'), false, 'no label is retained after authority loss');

    // Regained administration observed at the next encounter restores use and the label.
    administers.get(USER).add(ORG);
    clock.value = '2027-03-01T08:00:00.000Z';
    status = await statusOf();
    assert.equal(status.capacity.find(value => value.slot === 'slot-1').binding.authority, 'present');
    assert.equal(await commercial.entitlement({ repositoryId: 21, actor: { userId: OTHER_USER } }), 'business');
    const reportsBefore = wirt.state.reports.length;
    await statusOf();
    await commercial.flushReports();
    assert.equal(wirt.state.reports.length, reportsBefore + 1, 'an unchanged observation only moves its time');

    // Away from the product, daily maintenance re-observes through the funder's retained authorization.
    administers.get(USER).delete(ORG);
    clock.value = '2027-03-02T09:00:00.000Z';
    assert.deepEqual((await commercial.maintain()).authority, { observed: 1, unknown: 0 });
    assert.equal((await store.binding(ORG)).authority_observed, 'absent');
    assert.equal(await commercial.entitlement({ repositoryId: 21, actor: { userId: OTHER_USER } }), 'free');

    // A fully applied order stays `applied`; the authority lapse rides only on the binding.
    await push(source, projection({ linkId, version: 2, tier: 'business', slots: ['slot-included', 'slot-1'] }));
    await commercial.flushReports();
    assert.deepEqual(wirt.state.reports.at(-1).applied, { epoch: 1, version: 2, result: 'applied', reason: null, at: clock.value });
    assert.deepEqual(wirt.state.reports.at(-1).bindings, [{ slot: 'slot-1', github_org_id: ORG, display: null, authority: 'absent', since: '2027-03-01' }]);

    // GitHub not answering the funder's status read is `unknown`, not the earlier observation.
    administers.get(USER).add(ORG);
    clock.value = '2027-03-03T10:00:00.000Z';
    assert.equal((await statusOf()).capacity.find(value => value.slot === 'slot-1').binding.authority, 'present');
    source.github.answering = false;
    status = await statusOf();
    assert.deepEqual(status.capacity.find(value => value.slot === 'slot-1').binding, { organisationId: ORG, authority: 'unknown', authorityCheckedAt: clock.value, display: null });
    assert.equal(status.plan, 'business');
    assert.equal(await commercial.entitlement({ repositoryId: 21, actor: { userId: OTHER_USER } }), 'unknown', 'an unobservable check withholds organisation use');
    source.github.answering = true;
    assert.equal((await statusOf()).capacity.find(value => value.slot === 'slot-1').binding.authority, 'present');

    // The funder's authorization is revoked. The next check cannot
    // observe authority, so it records `unknown` rather than letting an earlier `present` stand.
    retained.delete(USER);
    clock.value = '2027-03-04T11:00:00.000Z';
    assert.deepEqual((await commercial.maintain()).authority, { observed: 0, unknown: 1 });
    assert.deepEqual(await store.binding(ORG).then(row => [row.slot, row.authority_observed, row.authority_checked_at, row.display]), ['slot-1', 'unknown', clock.value, null],
      'the binding and its funded slot remain');
    assert.equal(await commercial.entitlement({ repositoryId: 21, actor: { userId: OTHER_USER } }), 'unknown');
    assert.equal(await commercial.entitlement({ repositoryId: null, actor: { userId: USER } }), 'business', "the funder's own plan is unaffected");
    assert.deepEqual(wirt.state.reports.at(-1).bindings, [{ slot: 'slot-1', github_org_id: ORG, display: null, authority: 'unknown', since: '2027-03-01' }]);
    assert.equal(wirt.state.reports.at(-1).applied.result, 'applied');
    assert.equal((await commercialBytes(source)).includes('example-org'), false, 'no label is retained while authority is unknown');
    // `unknown` is rechecked at every maintenance pass; still unobservable only moves its time.
    const reportsWhileUnknown = wirt.state.reports.length;
    clock.value = '2027-03-04T12:00:00.000Z';
    assert.deepEqual((await commercial.maintain()).authority, { observed: 0, unknown: 1 });
    assert.equal((await store.binding(ORG)).authority_checked_at, clock.value);
    assert.equal(wirt.state.reports.length, reportsWhileUnknown);
    assert.deepEqual(wirt.state.cases, [], 'no authority change opened a partially-applied case at Wirt');

    // The funder's next visit observes authority again. A pending report holds the label only until it
    // leaves the outbox; ending removes every label.
    retained.add(USER);
    status = await statusOf();
    assert.equal(status.capacity.find(value => value.slot === 'slot-1').binding.display, 'example-org');
    assert.equal((await store.latestReport(linkId)).state, 'pending');
    assert.equal((await commercialBytes(source)).includes('example-org'), true);
    assert.equal((await call(COMMERCIAL_ROUTES.unlink, { method: 'POST', headers: browser() })).status, 200);
    assert.equal((await commercialBytes(source)).includes('example-org'), false, 'ending leaves no label anywhere');

    clock.value = '2027-04-20T00:00:00.000Z';
    await commercial.maintain();
    assert.deepEqual((await rows(source, 'commercial_reports')).filter(row => row.link_id === linkId), [], 'an ended link keeps only its link identity after thirty days');
    assert.equal((await store.link(linkId)).state, 'ended');
  } finally { await source.runtime.dispose(); }
});

test('premium encounters and queued reports recheck funder authority before maintenance or a dashboard visit', async () => {
  const source = await fixture();
  try {
    const { commercial, store, administers, github, clock, wirt } = source;
    await link(source, { owner: 77 });
    const linkId = (await store.activeLink(USER)).link_id;
    await fundedOrganisation(source, linkId);
    await bindRequest(source, { action: 'bind', slot: 'slot-1', organisationId: ORG });
    const entitlement = () => commercial.entitlement({ repositoryId: 21, actor: { userId: OTHER_USER } });

    administers.get(USER).delete(ORG);
    clock.value = '2027-03-01T06:01:00.000Z';
    assert.equal(await entitlement(), 'free', 'a recent stored present cannot authorize the next premium encounter');
    assert.deepEqual(await store.binding(ORG).then(row => [row.authority_observed, row.authority_checked_at, row.display]), ['absent', clock.value, null]);
    await commercial.flushReports();
    assert.equal(wirt.state.reports.at(-1).bindings[0].display, null);
    assert.equal(wirt.state.reports.at(-1).applied.result, 'applied');

    administers.get(USER).add(ORG);
    assert.equal(await entitlement(), 'business', 'recovery happens at the same encounter without a funder visit');
    github.answering = false;
    assert.equal(await entitlement(), 'unknown');
    assert.equal((await store.binding(ORG)).display, null);
    github.answering = true;
    assert.equal(await entitlement(), 'business');

    // The recovered label is queued, then authority is lost before the transport sends it.
    assert.ok((await store.latestReport(linkId)).disclosure);
    administers.get(USER).delete(ORG);
    await commercial.flushReports();
    assert.equal(wirt.state.reports.at(-1).bindings[0].authority, 'absent');
    assert.equal(wirt.state.reports.at(-1).bindings[0].display, null, 'an unsent present report cannot disclose a now-unconfirmed label');
    assert.equal((await commercialBytes(source)).includes('example-org'), false);
    assert.equal((await store.binding(ORG)).slot, 'slot-1');
    assert.equal(await commercial.entitlement({ repositoryId: null, actor: { userId: USER } }), 'business');
    assert.deepEqual(wirt.state.cases, []);
    administers.get(USER).add(ORG);
    assert.equal(await entitlement(), 'business');
    administers.get(USER).delete(ORG);
    store.transition = async () => false;
    await assert.rejects(entitlement(), { code: 'E_COMMERCIAL_CONFLICT' }, 'an unrecorded authority loss cannot return the stored premium plan');
  } finally { await source.runtime.dispose(); }
});

test('a bound funder grant survives real logout, account switching and session expiry, but not revocation', async () => {
  const source = await fixture({ realAuthorization: true });
  try {
    const { commercial, store, authorization, authStore, browserSessions, clock, signIn } = source;
    await link(source, { owner: 77 });
    await fundedOrganisation(source, (await store.activeLink(USER)).link_id);
    await bindRequest(source, { action: 'bind', slot: 'slot-1', organisationId: ORG });
    const entitlement = () => commercial.entitlement({ repositoryId: 21, actor: { userId: OTHER_USER } });
    const funderSession = browserSessions.get(SESSION);
    await authorization.logout({ session: funderSession, method: 'POST', origin: APP });
    await assert.rejects(authorization.authenticate(funderSession), { code: 'E_SESSION_UNAVAILABLE' });
    assert.ok((await authStore.authorization(USER))?.protected_material);
    const reader = await authorization.authenticate(browserSessions.get(OTHER_SESSION));
    assert.equal(await commercial.entitlement({ repositoryId: 21, actor: reader }), 'business');

    // Replacing a funder cookie with a different account also releases only the browser session.
    const nextFunderSession = await signIn(USER);
    await signIn(OTHER_USER, nextFunderSession);
    await assert.rejects(authorization.authenticate(nextFunderSession), { code: 'E_SESSION_UNAVAILABLE' });
    clock.value = '2027-03-01T08:00:00.000Z';
    await authStore.maintain();
    assert.ok((await authStore.authorization(USER))?.protected_material, 'active service retains the grant after every session expires');
    assert.equal(await authStore.authorization(OTHER_USER), null, 'a reader without funded bindings still loses a dormant grant');
    assert.equal(await entitlement(), 'business');

    await authStore.revokeAuthorization(USER);
    assert.equal(await entitlement(), 'unknown', 'retention never substitutes for current grant authority');
    assert.equal((await store.binding(ORG)).slot, 'slot-1', 'grant revocation does not end funding');
    await authStore.maintain();
    assert.equal(await authStore.authorization(USER), null);

    await signIn(USER);
    await authorization.logout({ session: browserSessions.get(SESSION), method: 'POST', origin: APP });
    assert.equal(await entitlement(), 'business', 'a renewed authorization restores service without keeping its session');
    clock.value = '2027-04-01T00:00:00.000Z';
    assert.equal(await entitlement(), 'unknown', 'an expired retained grant cannot supply authority');
    await authStore.maintain();
    assert.equal(await authStore.authorization(USER), null);
  } finally { await source.runtime.dispose(); }
});

test('ending the last binding purpose releases a sessionless protected grant', async t => {
  for (const ending of ['unbind', 'capacity-removal', 'link-ended']) await t.test(ending, async () => {
    const source = await fixture({ realAuthorization: true });
    try {
      const { commercial, store, authorization, authStore, browserSessions } = source;
      await link(source, { owner: 77 });
      const linkId = (await store.activeLink(USER)).link_id;
      await fundedOrganisation(source, linkId);
      await bindRequest(source, { action: 'bind', slot: 'slot-1', organisationId: ORG });
      await authorization.logout({ session: browserSessions.get(SESSION), method: 'POST', origin: APP });
      if (ending === 'unbind') {
        assert.equal((await bindRequest(source, { action: 'unbind', organisationId: ORG }, OTHER_SESSION)).status, 200);
      } else if (ending === 'capacity-removal') {
        await push(source, projection({ linkId, version: 2, tier: 'business', slots: [] }));
      } else {
        assert.equal((await push(source, notice({ linkId, version: 2 }))).status, 200);
      }
      assert.equal(await store.binding(ORG), null);
      await authStore.maintain();
      assert.equal(await authStore.authorization(USER), null, 'no paid binding leaves a dormant grant behind');
      assert.equal(await commercial.entitlement({ repositoryId: 21, actor: { userId: OTHER_USER } }), 'free');
    } finally { await source.runtime.dispose(); }
  });
});

test('an interrupted link recovers its committed association with a refreshed retained grant', async () => {
  const source = await fixture();
  try {
    const { call, browser, wirt, store, clock, commercial } = source;
    wirt.state.establishmentLost = 1;
    assert.equal(new URL((await link(source, { owner: 77 })).callback.headers.get('location')).searchParams.get('works-link'), 'pending');
    const intents = wirt.state.intents.size;
    const unfinished = (await rows(source, 'commercial_link_attempts')).find(row => row.protected_grant !== null);
    assert.equal(unfinished.last_establish, 'outcome-unknown');

    // Two hours later the retained access token has expired, and Wirt is briefly unreachable.
    clock.value = '2027-03-01T08:00:20.000Z';
    wirt.state.down = true;
    const unreachable = await call(COMMERCIAL_ROUTES.link, { method: 'POST', headers: browser() });
    assert.equal(unreachable.status, 503);
    assert.equal((await unreachable.json()).code, 'E_COMMERCIAL_LINK_PENDING');
    assert.equal(wirt.state.intents.size, intents, 'an unknown outcome never starts a second consent');
    assert.equal((await store.attempt(unfinished.state_hash)).last_establish, 'grant-unavailable');

    wirt.state.down = false;
    wirt.state.seed = value => projection({ linkId: value.id, worksAccount: String(value.owner) });
    const refreshes = () => wirt.state.requests.filter(request => request.path === '/api/oauth/token' && new URLSearchParams(request.text).get('grant_type') === 'refresh_token').length;
    const attempted = refreshes(); // The unreachable attempt never reached Wirt, so its refresh token is still valid.
    const resumed = await call(COMMERCIAL_ROUTES.link, { method: 'POST', headers: browser() });
    assert.deepEqual(await resumed.json(), { ok: true, result: 'linked' }, 'the same intent is established with the refreshed grant');
    assert.equal(refreshes() - attempted, 1);
    assert.equal(wirt.state.intents.size, intents);
    assert.equal(wirt.state.links.size, 1, 'Wirt holds exactly one association');
    const finished = await store.attempt(unfinished.state_hash);
    assert.equal(finished.last_establish, 'grant-refreshed');
    assert.notEqual(finished.finished_at, null);
    assert.equal(finished.protected_grant, null, 'the retained grant moves to the link and leaves the attempt');
    assert.equal(await commercial.entitlement({ repositoryId: null, actor: { userId: USER } }), 'pro');

    // A refresh grant Wirt refuses cannot recover the attempt; only then does a fresh consent begin.
    wirt.state.establishmentLost = 1;
    await link(source, { session: OTHER_SESSION, owner: 88 });
    wirt.state.refresh.clear();
    clock.value = '2027-03-01T10:00:20.000Z';
    const fresh = await call(COMMERCIAL_ROUTES.link, { method: 'POST', headers: browser(OTHER_SESSION) });
    assert.equal((await fresh.json()).result, 'authorize');
    assert.equal((await rows(source, 'commercial_link_attempts')).filter(row => row.user_id === OTHER_USER && row.last_establish === 'grant-refused').length, 1);
  } finally { await source.runtime.dispose(); }
});
