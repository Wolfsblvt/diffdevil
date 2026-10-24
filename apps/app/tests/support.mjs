// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * Shared support for the App's local-D1 tests: one seeded Miniflare database per test file, the GitHub wire double, and
 * the sign-in journey. The Community tests (apps/app/tests) and the premium tests (premium/tests) both build on it;
 * `app(entitlement, { premium })` composes the runtime with or without a premium extension.
 */
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Miniflare } from 'miniflare';
import { D1AppStore } from '../../github-app/storage.mjs';
import { createAppRuntime } from '../src/lib/runtime.mjs';
import { authStart, authCallback, authSession, openSession, SESSION_COOKIE, OAUTH_COOKIE } from '../src/lib/routes.mjs';
import { resolveViewer } from '../src/lib/viewer.mjs';
import { createFakeGitHub, seedStore, NOW, CODE } from '../qa/fixture.mjs';
import { migrationNames } from '../qa/seed.mjs';

export { NOW };

export const ORIGIN = 'http://127.0.0.1:4412';

let shared;
// Disposable material for the loopback installation-policy wire double, never a provider credential.
const policyKey = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({ type: 'pkcs1', format: 'pem' });
export async function fixture({ seed = seedStore } = {}) {
  shared ??= (async () => {
    const clock = { value: NOW };
    const runtime = new Miniflare({ workers: [{
      config: { name: 'app-test', compatibilityDate: '2026-09-17', env: { APP_DB: { type: 'd1', id: `app-${crypto.randomUUID()}` } }, manifest: { mainModule: 'worker.mjs', modulesRoot: resolve('.'), modules: { 'worker.mjs': { type: 'esm', contents: 'export default { fetch() { return new Response("ok"); } };' } } } }
    }] });
    try {
      const database = await runtime.getD1Database('APP_DB');
      const appStore = new D1AppStore(database, { now: () => clock.value });
      for (const name of await migrationNames()) await appStore.migrate(await readFile(resolve('apps/github-app/migrations', name), 'utf8'));
      const written = await seed(appStore, clock);
      const github = createFakeGitHub();
      const env = { APP_DB: database, APP_ORIGIN: ORIGIN, APP_SEAL_KEY: 'fixture-seal-key-with-enough-length', GITHUB_OAUTH_CLIENT_ID: 'fixture-client', GITHUB_OAUTH_CLIENT_SECRET: 'fixture-secret-private', GITHUB_API_BASE: 'http://github.invalid', GITHUB_OAUTH_BASE: 'http://github.invalid', GITHUB_APP_ID: '1', GITHUB_APP_PRIVATE_KEY: policyKey };
      const app = (entitlement, { premium, env: extra = {} } = {}) => { const composed = createAppRuntime({ ...env, ...(entitlement ? { APP_ENTITLEMENT_FIXTURE: JSON.stringify(entitlement) } : {}), ...extra }, { fetch: github.fetch, now: () => clock.value, ...(premium ? { premium } : {}) }); composed.cache.clear(); return composed; };
      return { runtime, app, github, clock, written, env };
    } catch (error) { await runtime.dispose(); throw error; }
  })();
  return shared;
}
export async function disposeFixture() { if (shared) await (await shared).runtime.dispose(); }

export async function signIn(app) {
  const started = await authStart(new Request(`${ORIGIN}/auth/start`), app);
  assert.equal(started.status, 303);
  const destination = new URL(started.headers.get('location'));
  assert.equal(destination.origin, 'https://github.com');
  const state = destination.searchParams.get('state');
  const oauthCookie = started.headers.get('set-cookie').match(/^__Host-diffdevil-oauth=([^;]+)/u)[1];
  const callback = await authCallback(new Request(`${ORIGIN}/auth/callback?state=${state}&code=${CODE}`, { headers: { cookie: `${OAUTH_COOKIE}=${oauthCookie}` } }), app);
  assert.equal(callback.status, 200);
  assert.equal(callback.headers.get('referrer-policy'), 'same-origin', 'the continuation document keeps the document policy so its same-origin form post carries its Origin');
  assert.equal(callback.headers.get('cache-control'), 'private, no-store');
  const html = await callback.text();
  const artifact = /name="artifact" value="([^"]+)"/u.exec(html)[1];
  const form = new URLSearchParams({ artifact, return: 'app' });
  const session = await authSession(new Request(`${ORIGIN}/auth/session`, { method: 'POST', body: form, headers: { origin: ORIGIN, 'content-type': 'application/x-www-form-urlencoded' } }), app);
  assert.equal(session.status, 303);
  assert.equal(session.headers.get('location'), '/');
  const cookie = session.headers.get('set-cookie').match(/^__Host-diffdevil-session=([^;]+)/u)[1];
  return { cookie, html };
}

export async function viewerFor(app) {
  const { cookie } = await signIn(app);
  const opened = await openSession(new Request(`${ORIGIN}/`, { headers: { cookie: `${SESSION_COOKIE}=${cookie}` } }), app);
  const viewer = await resolveViewer({ reads: opened.reads, actor: opened.actor, store: app.store, entitlement: app.entitlement, cache: app.cache });
  return { cookie, opened, viewer };
}
