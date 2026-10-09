// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Composes the App's services from the Worker environment: the managed App's D1 stores, the
 * route-neutral authorization service, the GitHub user provider, the seal and entitlement.
 * One composition per request; provider context is cached per isolate for a minute.
 */
import { D1AppStore } from '../../../github-app/storage.mjs';
import { D1AuthorizationStore } from '../../../github-app/authorization-storage.mjs';
import { createAuthorizationService } from '../../../github-app/authorization.mjs';
import { createAdmissionService } from '../../../github-app/admission.mjs';
import { D1AppReadStore } from './app-store.mjs';
import { createProtector } from './protector.mjs';
import { createGitHubUserProvider } from './github-user-provider.mjs';
import { createEntitlement } from './entitlement.mjs';
import { createContextCache } from './viewer.mjs';

const DAY = 86_400_000;
const DEFAULT_SESSION_DAYS = 30;
export const RETURN_CONTEXT = 'app';
const caches = new WeakMap();

function required(env, name) {
  const value = env[name];
  if (typeof value !== 'string' || value.length === 0) throw new TypeError(`The App needs ${name}.`);
  return value;
}

/** Read the selected origin; https, or http on a loopback host for local qualification. */
export function readOrigin(value) {
  const url = new URL(value);
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.origin !== value.replace(/\/$/u, '') || (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback))) throw new TypeError('APP_ORIGIN must be an https origin, or an http loopback origin.');
  return { origin: url.origin, loopback };
}

export function createAppRuntime(env, { fetch = globalThis.fetch, now } = {}) {
  if (!env?.APP_DB) throw new TypeError('The App needs the APP_DB D1 binding.');
  const { origin, loopback } = readOrigin(required(env, 'APP_ORIGIN'));
  const sessionDays = Number(env.APP_SESSION_DAYS ?? DEFAULT_SESSION_DAYS);
  if (!Number.isSafeInteger(sessionDays) || sessionDays < 1 || sessionDays > 365) throw new TypeError('APP_SESSION_DAYS must be a whole number of days between 1 and 365.');
  const callbackUrl = `${origin}/auth/callback`;
  const clock = now ?? (() => new Date().toISOString());
  const appStore = new D1AppStore(env.APP_DB, { now: clock });
  const authStore = new D1AuthorizationStore(env.APP_DB, { now: clock });
  const store = new D1AppReadStore(env.APP_DB, { now: clock });
  const protector = createProtector({ secret: required(env, 'APP_SEAL_KEY') });
  const provider = createGitHubUserProvider({
    clientId: required(env, 'GITHUB_OAUTH_CLIENT_ID'), clientSecret: required(env, 'GITHUB_OAUTH_CLIENT_SECRET'), callbackUrl,
    ...(env.GITHUB_API_BASE ? { apiBase: env.GITHUB_API_BASE } : {}), ...(env.GITHUB_OAUTH_BASE ? { oauthBase: env.GITHUB_OAUTH_BASE } : {}),
    fetch, now: () => Date.parse(clock())
  });
  const admission = createAdmissionService({ store: appStore, authorize: async request => request.actor?.role === 'repository-admin' });
  // A loopback origin is reached as localhost or 127.0.0.1 through local proxies; a deployed https origin is exact.
  const port = new URL(origin).port;
  const allowedOrigins = loopback ? [...new Set([origin, `http://localhost:${port}`, `http://127.0.0.1:${port}`])] : [origin];
  const auth = createAuthorizationService({ store: authStore, admission, provider, protector, returnContexts: [RETURN_CONTEXT], allowedOrigins, allowedCallbackUrls: [callbackUrl], sessionLifetimeMs: sessionDays * DAY, now: clock });
  const entitlement = createEntitlement({ fixture: env.APP_ENTITLEMENT_FIXTURE, loopback });
  if (!caches.has(env.APP_DB)) caches.set(env.APP_DB, createContextCache());
  return { config: { origin, loopback, sessionDays, callbackUrl, siteOrigin: env.SITE_ORIGIN ?? 'https://diffdevil.dev' }, now: clock, store, appStore, auth, provider, entitlement, cache: caches.get(env.APP_DB) };
}
