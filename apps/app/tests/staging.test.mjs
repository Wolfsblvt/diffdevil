// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/** Two real local D1 consumers, with independent GitHub/Wirt wire doubles. No provider or customer effects. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { Miniflare } from 'miniflare';
import { unstable_readConfig as readConfig } from 'wrangler';
import { appBuildTarget } from '../build-target.mjs';
import { createAppRuntime } from '../src/lib/runtime.mjs';
import { authStart, authCallback, authSession, openSession } from '../src/lib/routes.mjs';
import { D1AppStore } from '../../github-app/storage.mjs';
import { createGitHubAppWorker, createInstallationClient, collectDeliveryAnalytics, COMMERCIAL_ROUTES } from '../../github-app/app.mjs';
import { stagingInstallationAccounts } from '../../github-app/staging-admission.mjs';
import { normalizeWebhookEvent, historyCaptureEnvelope, briefRefreshEnvelope, historyJobEnvelope } from '../../github-app/contracts.mjs';
import { D1HistoryJobStore } from '../../github-app/history-jobs.mjs';
import { D1ParticipationStore } from '../src/lib/participation/store.mjs';
import { migrationNames } from '../qa/seed.mjs';
import { createFakeGitHub, analyticalRecords, CODE, NOW } from '../qa/fixture.mjs';
import { readOwnedComments } from '../../../dist/lib/github/comments.js';

const stagingConfig = readConfig({ config: 'apps/app/staging/wrangler.json' });
const productionConfig = readConfig({ config: 'apps/app/wrangler.jsonc' });

test('the selected staging build has distinct Worker, D1, queues, artifacts and secret lookup directory', () => {
  const staging = appBuildTarget({ DIFFDEVIL_APP_TARGET: 'staging' });
  const production = appBuildTarget({});
  assert.equal(staging.origin, stagingConfig.vars.APP_ORIGIN);
  assert.notEqual(staging.origin, production.origin);
  assert.notEqual(staging.artifacts, production.artifacts);
  assert.notEqual(stagingConfig.name, productionConfig.name);
  assert.notEqual(stagingConfig.d1_databases[0].database_id, productionConfig.d1_databases[0].database_id);
  assert.notEqual(stagingConfig.d1_databases[0].database_name, productionConfig.d1_databases[0].database_name);
  assert.notEqual(stagingConfig.queues.producers[0].queue, productionConfig.queues.producers[0].queue);
  assert.equal(stagingConfig.queues.consumers[0].queue, stagingConfig.queues.producers[0].queue);
  assert.notEqual(stagingConfig.queues.consumers[0].dead_letter_queue, productionConfig.queues.consumers[0].dead_letter_queue);
  assert.equal(resolve('apps/app/staging', stagingConfig.d1_databases[0].migrations_dir), resolve('apps/app', productionConfig.d1_databases[0].migrations_dir));
  assert.equal(stagingConfig.main, productionConfig.main);
  assert.equal(stagingConfig.compatibility_date, productionConfig.compatibility_date);
  assert.deepEqual(stagingConfig.compatibility_flags, productionConfig.compatibility_flags);
  assert.deepEqual(stagingConfig.triggers, productionConfig.triggers);
  assert.deepEqual(stagingConfig.d1_databases.map(database => database.binding), productionConfig.d1_databases.map(database => database.binding));
  assert.deepEqual(stagingConfig.queues.producers.map(queue => queue.binding), productionConfig.queues.producers.map(queue => queue.binding));
  const consumerSettings = ({ queue, dead_letter_queue, ...settings }) => settings;
  assert.deepEqual(stagingConfig.queues.consumers.map(consumerSettings), productionConfig.queues.consumers.map(consumerSettings));
  assert.ok(stagingConfig.vars.GITHUB_APP_BOT_LOGIN);
  assert.notEqual(stagingConfig.vars.GITHUB_APP_BOT_LOGIN, productionConfig.vars.GITHUB_APP_BOT_LOGIN ?? 'diffdevil[bot]');
  assert.equal(stagingConfig.workers_dev, false);
  assert.equal(stagingConfig.preview_urls, false);
  assert.deepEqual([...stagingInstallationAccounts(stagingConfig.vars)], []);
  assert.equal(stagingInstallationAccounts(productionConfig.vars), null);
  for (const value of ['', 'null', '[0]', '["123"]']) assert.throws(() => stagingInstallationAccounts({ APP_STAGING_INSTALLATION_ACCOUNT_IDS: value }), /positive numeric/u);
  assert.equal(stagingConfig.vars.WIRT_LINK_CALLBACK_URL, `${staging.origin}${COMMERCIAL_ROUTES.callback}`);
  assert.equal(stagingConfig.vars.WIRT_LINK_CONTINUATION_URL, `${staging.origin}/manage/plan`);
  assert.equal(staging.configPath, 'staging/wrangler.json');
  assert.throws(() => appBuildTarget({ DIFFDEVIL_APP_TARGET: 'staging', DIFFDEVIL_APP_ORIGIN: production.origin }), /must match/u);
  assert.throws(() => appBuildTarget({ DIFFDEVIL_APP_TARGET: 'typo' }), /production or staging/u);
});

test('staging admits installation accounts and collaborators but refuses outside execution and history before acquisition', async () => {
  const local = new Miniflare({ workers: [{ config: { name: 'stage-estate', type: 'worker', compatibilityDate: '2026-09-17',
    env: { APP_DB: { type: 'd1', id: `stage-estate-${randomUUID()}` } },
    manifest: { mainModule: 'worker.mjs', modulesRoot: resolve('.'), modules: { 'worker.mjs': { type: 'esm', contents: 'export default { fetch() { return new Response("ok"); } };' } } }
  } }] });
  try {
    const database = await local.getD1Database('APP_DB'), unrestricted = new D1AppStore(database);
    for (const migration of await migrationNames()) await unrestricted.migrate(await readFile(resolve('apps/github-app/migrations', migration), 'utf8'));
    // All IDs are the existing synthetic fixture identities. Outside repositories were enabled before this guard.
    for (const [installationId, accountId, accountKind, repositoryId] of [[9, 123, 'user', 1004], [10, 7001, 'organization', 1001], [11, 7002, 'organization', 1006]]) {
      await unrestricted.recordLifecycle({ installationId, action: 'created', addedRepositories: [repositoryId], removedRepositories: [] });
      await unrestricted.recordInstallationAccount(installationId, accountId, accountKind);
      await database.prepare("UPDATE repositories SET state='active', history_enabled=1, execution_consent_reason=NULL, history_consent_reason=NULL WHERE repository_id=?").bind(repositoryId).run();
    }
    const env = { ...stagingConfig.vars, APP_DB: database, APP_STAGING_INSTALLATION_ACCOUNT_IDS: '[123,7001]',
      APP_SEAL_KEY: 'fixture-stage-seal-material', GITHUB_OAUTH_CLIENT_ID: 'fixture-stage-client', GITHUB_OAUTH_CLIENT_SECRET: 'fixture-stage-secret',
      GITHUB_API_BASE: 'http://github.invalid', GITHUB_OAUTH_BASE: 'http://github.invalid', APP_QUEUE: { async send() {} } };
    const github = createFakeGitHub({ clientId: env.GITHUB_OAUTH_CLIENT_ID }), requests = [];
    const app = createAppRuntime(env, { now: () => NOW, fetch: (input, init) => { requests.push(new URL(input).pathname); return github.fetch(input, init); } });
    const cookie = await signIn(app);
    const session = await openSession(new Request(`${env.APP_ORIGIN}/`, { headers: { cookie } }), app);
    await app.auth.read({ session: session.session }, async reads => {
      assert.deepEqual((await reads.installations()).map(value => value.id), [9, 10]);
      assert.ok((await reads.installationRepositories(9)).some(value => value.repositoryId === 1004));
      assert.ok((await reads.installationRepositories(10)).some(value => value.repositoryId === 1001));
      const before = requests.length;
      assert.deepEqual(await reads.installationRepositories(11), []);
      assert.equal(requests.length, before, 'outside repository discovery never reaches GitHub');
    });
    // GitHub keeps collaborator reach: this person need not be the admitted account's owner.
    const access = await app.provider.checkRepositoryAccess({ material: { accessToken: 'fixture-user-token-private' }, installationId: 10, repositoryId: 1001 });
    assert.equal(access.repository, 'available');
    const before = requests.length;
    assert.equal((await app.provider.checkRepositoryAccess({ material: { accessToken: 'fixture-user-token-private' }, installationId: 11, repositoryId: 1006 })).repository, 'unavailable');
    assert.equal(requests.length, before);
    assert.equal(await app.appStore.executionAllowed(1004), true);
    assert.equal(await app.appStore.executionAllowed(1006), false);
    assert.equal((await app.appStore.historySettings(1006, { independentExecution: true })).enabled, false);
    const record = analyticalRecords().records.find(value => value.repositoryId === 1006);
    assert.equal((await unrestricted.recordAnalytical(record)).status, 'published');
    assert.deepEqual(await app.appStore.recordAnalytical(record), { status: 'disabled' });
    assert.deepEqual(await app.appStore.analyticalRecords(1006), []);
    assert.equal((await unrestricted.analyticalRecords(1006)).length, 1, 'the guard preserves existing retained data');
    assert.equal((await app.appStore.repositoryAdmission(1006)).reach.repository, 'unavailable');
    assert.equal(await unrestricted.executionAllowed(1006), true, 'production reach and stored consent are unchanged');
    await database.prepare("UPDATE repositories SET state='pending-enable' WHERE repository_id IN (1001,1006)").run();
    assert.equal((await app.appStore.historySettings(1001, { independentExecution: true })).enabled, true, 'admitted history-only operation remains useful');
    assert.equal((await app.appStore.historySettings(1006, { independentExecution: true })).enabled, false);
    const outside = normalizeWebhookEvent('pull_request', { action: 'opened', installation: { id: 11 }, repository: { id: 1006, owner: { id: 7002, login: 'northwind-tools', type: 'Organization' }, name: 'ci-recipes', private: true }, pull_request: { number: 1 } }, NOW, 'outside-pull');
    const noClient = async () => { assert.fail('outside acquisition reached a credential or GitHub client'); };
    assert.deepEqual(await collectDeliveryAnalytics(outside, { env, store: app.appStore, analyticalClientFactory: noClient }), { status: 'disabled' });
    assert.deepEqual(await app.appStore.recordHistory({ repositoryId: 1006 }, {}), { status: 'disabled' });
    await assert.rejects(createInstallationClient(env, 11, 1006, { createJwt: noClient }), { code: 'E_ACCESS_DISABLED' });
    const jobs = new D1HistoryJobStore(database, { now: () => NOW });
    const { job } = await jobs.request({ installationId: 11, repositoryId: 1006, kind: 'import' });
    const bodies = [outside, briefRefreshEnvelope({ installationId: 11, repositoryId: 1006, causeId: 'outside-refresh', cause: 'policy', targets: 'open', receivedAt: NOW }),
      historyCaptureEnvelope({ installationId: 11, repositoryId: 1006, pullRequest: 1, causeId: 'outside-capture', receivedAt: NOW }),
      historyJobEnvelope({ installationId: 11, repositoryId: 1006, jobId: job.jobId, kind: 'import', sequence: 0, receivedAt: NOW })];
    let ack = 0;
    const worker = createGitHubAppWorker({ store: app.appStore, jobs, now: () => NOW, execute: noClient, collectAnalytics: noClient,
      clientFactory: noClient, analyticalClientFactory: noClient, listInstallationRepositories: noClient, verifySignature: async () => true });
    await worker.queue({ messages: bodies.map(body => ({ body, ack() { ack++; }, retry() { assert.fail('outside messages should settle'); } })) }, env);
    assert.equal(ack, bodies.length);
    assert.equal((await jobs.job(job.jobId)).state, 'stopped');
    assert.equal((await jobs.job(job.jobId)).reason, 'history-off');
    const payload = { action: 'created', installation: { id: 11, account: { id: 7002, type: 'Organization' } }, repositories: [{ id: 1999 }] };
    const receipt = await worker.fetch(new Request(`${env.APP_ORIGIN}/webhooks/github`, { method: 'POST', headers: { 'x-github-event': 'installation', 'x-github-delivery': 'outside-new' }, body: JSON.stringify(payload) }), env);
    assert.equal((await receipt.json()).status, 'disabled');
    const removal = normalizeWebhookEvent('installation', { ...payload, action: 'deleted' }, NOW, 'outside-remove');
    await worker.queue({ messages: [{ body: removal, ack() {}, retry() { assert.fail('offboarding remains usable'); } }] }, env);
    assert.equal((await unrestricted.repositoryAdmission(1006)).reach.installation, 'removed');
    assert.equal(await database.prepare('SELECT repository_id FROM repositories WHERE repository_id=1999').first(), null);
  } finally { await local.dispose(); }
});

test('the production check refuses an inherited staging target before building or dry-running stale production output', async () => {
  const { scripts } = JSON.parse(await readFile(resolve('package.json'), 'utf8'));
  const buildCommand = scripts['check:app'].split(' && ').find(command => command.startsWith('node tools/app-command.mjs '));
  assert.ok(buildCommand, 'check:app uses the existing target-aware build command');
  const result = spawnSync(process.execPath, buildCommand.slice('node '.length).split(' '), {
    cwd: resolve('.'), windowsHide: true, encoding: 'utf8',
    env: { ...process.env, DIFFDEVIL_APP_TARGET: 'staging', DIFFDEVIL_APP_ORIGIN: '' }
  });
  assert.ifError(result.error);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /expected target production, but selected staging/u);
});

test('the configured staging bot recognises its own brief without adopting the production brief', async () => {
  const plan = { target: { repository: 'fixture/repo', pullRequest: 1 }, policyId: 'fixture-policy', rules: { brief: {} } };
  const marker = Buffer.from(JSON.stringify({ v: 1, ...plan.target, policyId: plan.policyId, rule: 'brief', sequence: 1, transition: 0 })).toString('base64url');
  const body = `Brief\n<!-- diffdevil:state=${marker} -->`;
  const client = { list: async () => ({ items: [
    { id: 1, body, user: { login: productionConfig.vars.GITHUB_APP_BOT_LOGIN ?? 'diffdevil[bot]' } },
    { id: 2, body, user: { login: stagingConfig.vars.GITHUB_APP_BOT_LOGIN } }
  ] }) };
  assert.deepEqual((await readOwnedComments(client, plan, { login: stagingConfig.vars.GITHUB_APP_BOT_LOGIN })).map(comment => comment.id), [2]);
});

function projection(link, version = 1) {
  return { schema: 'wirt.benefit-projection/v1', client: 'diffdevil',
    stream: { works_account: '77', link: { id: link, product_account: { github_user_id: 123 } } },
    account_lineage: [], order: { epoch: 1, version }, generated_at: NOW, source_operation: null,
    commercial: { standing: 'funded', tier: 'pro', cadence: 'monthly', period: { started_on: '2026-09-01', ends_on: '2026-11-01' },
      renewal_preference: 'automatic', cancellation_intent: 'none', grace: null, ended: null,
      next_renewal: { on: '2026-11-01', total_cents: 900, currency: 'EUR', tax_inclusive: true } },
    benefits: { organisation_capacity: [], grants: [], protection: null }, pending: [], bindings_seen: [] };
}

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function signed(key, body, path = COMMERCIAL_ROUTES.projection) {
  const time = String(Math.floor(Date.parse(NOW) / 1000)), nonce = randomUUID();
  const signature = createHmac('sha256', key).update(['wirt-http/v1', 'diffdevil', 'POST', path, '123', time, nonce, hash(body)].join('\n')).digest('hex');
  return { 'content-type': 'application/json', 'x-wirt-key': 'current', 'x-wirt-time': time, 'x-wirt-nonce': nonce, 'x-wirt-product-account': '123', 'x-wirt-signature': signature };
}

/** The double checks this consumer's origin, public client, callback and PKCE; it retains only its own test link. */
function wirtDouble(env) {
  const requests = [], link = randomUUID(), intent = randomUUID();
  let attempt;
  const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
  return { requests, link, approval: () => ({ state: attempt.state, code: 'approved' }),
    async fetch(input, init) {
      const url = new URL(input);
      assert.equal(url.origin, env.WIRT_ORIGIN);
      assert.equal(init.redirect, 'manual');
      requests.push(url.pathname);
      const text = new TextDecoder().decode(init.body ?? new Uint8Array());
      if (url.pathname === '/api/wirt/diffdevil/link-intents') {
        attempt = JSON.parse(text);
        return json({ intent, authorization_url: `${env.WIRT_ORIGIN}/wirt/products/diffdevil/link/${intent}` }, 201);
      }
      if (url.pathname === '/api/oauth/token') {
        const form = new URLSearchParams(text);
        assert.equal(form.get('client_id'), env.WIRT_OAUTH_CLIENT_ID);
        assert.equal(form.get('redirect_uri'), env.WIRT_LINK_CALLBACK_URL);
        assert.equal(createHash('sha256').update(form.get('code_verifier')).digest('base64url'), attempt.challenge);
        return json({ access_token: 'fixture-access', refresh_token: 'fixture-refresh', expires_in: 3600 });
      }
      if (url.pathname === '/api/wirt/diffdevil/links') return json({ stream: projection(link).stream }, 201);
      if (url.pathname.endsWith('/projection')) return json(projection(link));
      if (url.pathname.endsWith('/reports')) return json({ result: 'recorded' });
      throw new Error(`Unexpected Wirt fixture request: ${url.pathname}`);
    }
  };
}

async function signIn(app) {
  const origin = app.config.origin;
  const begun = await authStart(new Request(`${origin}/auth/start`), app);
  const destination = new URL(begun.headers.get('location'));
  assert.equal(destination.searchParams.get('redirect_uri'), `${origin}/auth/callback`);
  const browser = begun.headers.get('set-cookie').split(';')[0];
  const callback = await authCallback(new Request(`${origin}/auth/callback?state=${destination.searchParams.get('state')}&code=${CODE}`, { headers: { cookie: browser } }), app);
  assert.equal(callback.status, 200);
  const artifact = /name="artifact" value="([^"]+)"/u.exec(await callback.text())[1];
  const exchanged = await authSession(new Request(`${origin}/auth/session`, { method: 'POST', headers: { origin }, body: new URLSearchParams({ artifact, return: 'app' }) }), app);
  assert.equal(exchanged.status, 303);
  assert.match(exchanged.headers.get('set-cookie'), /HttpOnly; Secure; SameSite=Lax/u);
  return exchanged.headers.get('set-cookie').split(';')[0];
}

test('staging sessions, callbacks, projections and product state cannot enter the production consumer', async () => {
  const local = new Miniflare({ workers: ['production', 'staging'].map(name => ({ config: {
    name, type: 'worker', compatibilityDate: '2026-09-17', env: { APP_DB: { type: 'd1', id: `staging-boundary-${name}-${randomUUID()}` } },
    manifest: { mainModule: 'worker.mjs', modulesRoot: resolve('.'), modules: { 'worker.mjs': { type: 'esm', contents: 'export default { fetch() { return new Response("ok"); } };' } } }
  } })) });
  try {
    const consumers = {};
    for (const [name, config] of [['production', productionConfig], ['staging', stagingConfig]]) {
      const database = await local.getD1Database('APP_DB', name);
      const store = new D1AppStore(database);
      for (const migration of await migrationNames()) await store.migrate(await readFile(resolve('apps/github-app/migrations', migration), 'utf8'));
      const origin = config.vars.APP_ORIGIN;
      const env = { ...config.vars, APP_DB: database, APP_SEAL_KEY: `fixture-${name}-seal-key-material`,
        GITHUB_OAUTH_CLIENT_ID: `fixture-${name}-github-client`, GITHUB_OAUTH_CLIENT_SECRET: `fixture-${name}-github-secret`,
        GITHUB_API_BASE: 'http://github.invalid', GITHUB_OAUTH_BASE: 'http://github.invalid',
        WIRT_ORIGIN: name === 'staging' ? config.vars.WIRT_ORIGIN : 'https://wirt-production.example.test',
        WIRT_OAUTH_CLIENT_ID: config.vars.WIRT_OAUTH_CLIENT_ID ?? 'fixture-production-wirt-client', WIRT_LINK_CALLBACK_URL: config.vars.WIRT_LINK_CALLBACK_URL ?? `${origin}${COMMERCIAL_ROUTES.callback}`,
        WIRT_SIGNING_KEY_CURRENT: `fixture-${name}-signing-key-material-at-least-32-bytes` };
      const github = createFakeGitHub({ clientId: env.GITHUB_OAUTH_CLIENT_ID }), wirt = wirtDouble(env);
      const app = createAppRuntime(env, { now: () => NOW, fetch: (input, init) => new URL(input).origin === env.WIRT_ORIGIN ? wirt.fetch(input, init) : github.fetch(input, init) });
      const worker = createGitHubAppWorker({ store, authorization: app.auth, commercial: app.commercial });
      consumers[name] = { database, env, app, wirt, call: (path, init = {}) => worker.fetch(new Request(`${origin}${path}`, init), env) };
    }
    const { production, staging } = consumers;
    const productionCookie = await signIn(production.app), stagingCookie = await signIn(staging.app);
    assert.equal((await openSession(new Request(`${staging.env.APP_ORIGIN}/`, { headers: { cookie: productionCookie } }), staging.app)).refusal, 'E_SESSION_UNAVAILABLE');
    assert.equal((await openSession(new Request(`${production.env.APP_ORIGIN}/`, { headers: { cookie: stagingCookie } }), production.app)).refusal, 'E_SESSION_UNAVAILABLE');
    assert.equal((await openSession(new Request(`${staging.env.APP_ORIGIN}/`, { headers: { cookie: stagingCookie } }), staging.app)).actor.userId, 123);
    const headers = { origin: staging.env.APP_ORIGIN, cookie: stagingCookie };
    assert.equal((await staging.call(COMMERCIAL_ROUTES.link, { method: 'POST', headers: { ...headers, origin: production.env.APP_ORIGIN } })).status, 403);
    const begun = await staging.call(COMMERCIAL_ROUTES.link, { method: 'POST', headers });
    assert.equal(begun.status, 200);
    assert.equal(new URL((await begun.json()).authorizationUrl).origin, staging.env.WIRT_ORIGIN);
    const binding = begun.headers.get('set-cookie').split(';')[0], approval = staging.wirt.approval();
    const callbackPath = `${COMMERCIAL_ROUTES.callback}?state=${approval.state}&code=${approval.code}`;
    const foreign = await production.call(callbackPath, { headers: { cookie: `${productionCookie}; ${binding}` } });
    assert.equal(new URL(foreign.headers.get('location')).searchParams.get('works-link'), 'invalid');
    assert.equal(production.wirt.requests.length, 0);
    const callback = await staging.call(callbackPath, { headers: { cookie: `${stagingCookie}; ${binding}` } });
    assert.equal(new URL(callback.headers.get('location')).origin, staging.env.APP_ORIGIN);
    assert.equal(new URL(callback.headers.get('location')).searchParams.get('works-link'), 'linked');
    const body = JSON.stringify(projection(staging.wirt.link, 2));
    const pushHeaders = signed(staging.env.WIRT_SIGNING_KEY_CURRENT, body);
    assert.equal((await production.call(COMMERCIAL_ROUTES.projection, { method: 'POST', headers: pushHeaders, body })).status, 401);
    assert.equal((await staging.call(COMMERCIAL_ROUTES.projection, { method: 'POST', headers: signed(production.env.WIRT_SIGNING_KEY_CURRENT, body), body })).status, 401);
    assert.equal((await staging.call(COMMERCIAL_ROUTES.projection, { method: 'POST', headers: pushHeaders, body })).status, 200);
    assert.equal((await staging.app.commercialStore.link(staging.wirt.link)).applied_version, 2);
    assert.equal(await production.app.commercialStore.link(staging.wirt.link), null);
    assert.equal(await staging.app.entitlement.planOfViewer({ userId: 123 }), 'pro');
    assert.equal(await production.app.entitlement.planOfViewer({ userId: 123 }), 'free');
    const campaign = { key: 'staging-only', version: 1, survey: 'beta-v1' };
    const stageParticipation = new D1ParticipationStore(staging.database, { now: () => NOW });
    await stageParticipation.saveDraft(123, campaign, { fixture: 'staging survey' });
    assert.equal((await stageParticipation.response(123, campaign)).state, 'draft');
    assert.equal(await new D1ParticipationStore(production.database).response(123, campaign), null);
  } finally { await local.dispose(); }
});
