// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * Composes the App's services from the Worker environment: the managed App's D1 stores, the
 * route-neutral authorization service with the analytical read service installed behind it,
 * the GitHub user provider, the seal, the Wirt commercial consumer when configured, the
 * entitlement and current-policy readers, the opaque file locator, the participation campaign when one is configured,
 * and the premium extension when the build joined one. One composition per request; provider context is cached per isolate for a minute.
 */
import { D1AppStore } from '../../../github-app/storage.mjs';
import { stagingInstallationAccounts } from '../../../github-app/staging-admission.mjs';
import { D1AuthorizationStore } from '../../../github-app/authorization-storage.mjs';
import { D1CommercialStore } from '../../../github-app/commercial-storage.mjs';
import { createAuthorizationService } from '../../../github-app/authorization.mjs';
import { createAdmissionService, admissionServiceIdentity } from '../../../github-app/admission.mjs';
import { commercialFromEnv } from '../../../github-app/commercial.mjs';
import { createAnalyticalPremiumHost, createBriefRefresher, createPolicyResolver, createRepositoryPermissionReader } from '../../../github-app/app.mjs';
import { COMMUNITY } from '../premium/registry.mjs';
import { D1AppReadStore } from './app-store.mjs';
import { createProtector } from './protector.mjs';
import { createGitHubUserProvider } from './github-user-provider.mjs';
import { createEntitlement } from './entitlement.mjs';
import { createPolicyReader } from './policies.mjs';
import { createAnalytics } from './analytics.mjs';
import { createLocator } from './locator.mjs';
import { createContextCache } from './viewer.mjs';
import { createAnalyticalCache } from '../../../github-app/analytical-cache.mjs';
import { D1ManageStore } from './manage/store.mjs';
import { closeLocalAccount } from './manage/account-closure.mjs';
import { readAllowances } from './manage/allowances.mjs';
import { createCommercialFixture, readCommercialFixture } from './manage/commercial-fixture.mjs';
import { delegationReaches } from './manage/people.mjs';
import { createAutomaticSetup } from './manage/setup.mjs';
import { createOperating } from './manage/operating.mjs';
import { D1HistoryJobStore } from '../../../github-app/history-jobs.mjs';
import { readCampaign } from './participation/campaign.mjs';
import { D1ParticipationStore } from './participation/store.mjs';
import { createParticipation } from './participation/service.mjs';

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

/**
 * `premium` is the build's composed extension (src/premium/registry.mjs); absent, this is the Community runtime. Its
 * `brief` part is the premium PR-brief provider the admission preview joins, or null.
 */
export function createAppRuntime(env, { fetch = globalThis.fetch, now, premium = COMMUNITY } = {}) {
  if (!env?.APP_DB) throw new TypeError('The App needs the APP_DB D1 binding.');
  const { origin, loopback } = readOrigin(required(env, 'APP_ORIGIN'));
  const sessionDays = Number(env.APP_SESSION_DAYS ?? DEFAULT_SESSION_DAYS);
  if (!Number.isSafeInteger(sessionDays) || sessionDays < 1 || sessionDays > 365) throw new TypeError('APP_SESSION_DAYS must be a whole number of days between 1 and 365.');
  const callbackUrl = `${origin}/auth/callback`;
  const clock = now ?? (() => new Date().toISOString());
  const installationAccounts = stagingInstallationAccounts(env);
  // A local qualification deployment already routes user reads to its loopback GitHub double. Keep installation
  // policy reads on that same double; never redirect an installation credential on a deployed HTTPS App.
  let installationFetch = fetch;
  if (loopback && env.GITHUB_API_BASE) {
    const testApi = new URL(env.GITHUB_API_BASE);
    if (testApi.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(testApi.hostname)) {
      installationFetch = (input, init) => {
        const url = new URL(String(input));
        return fetch(url.origin === 'https://api.github.com' ? `${testApi.origin}${url.pathname}${url.search}` : input, init);
      };
    }
  }
  const appStore = new D1AppStore(env.APP_DB, { now: clock, installationAccounts });
  const authStore = new D1AuthorizationStore(env.APP_DB, { now: clock });
  const commercialStore = new D1CommercialStore(env.APP_DB, { now: clock });
  const store = new D1AppReadStore(env.APP_DB, { now: clock });
  const sealKey = required(env, 'APP_SEAL_KEY');
  const protector = createProtector({ secret: sealKey });
  const locator = createLocator({ secret: sealKey });
  const provider = createGitHubUserProvider({
    clientId: required(env, 'GITHUB_OAUTH_CLIENT_ID'), clientSecret: required(env, 'GITHUB_OAUTH_CLIENT_SECRET'), callbackUrl,
    ...(env.GITHUB_API_BASE ? { apiBase: env.GITHUB_API_BASE } : {}), ...(env.GITHUB_OAUTH_BASE ? { oauthBase: env.GITHUB_OAUTH_BASE } : {}),
    fetch, now: () => Date.parse(clock()), installationAccounts, installationAdmitted: id => appStore.installationAdmitted(id),
    repositoryIdentity: id => authStore.repositoryIdentity(id)
  });
  // Entitlement is read lazily: the brief preview needs the plan funding the repository, composed further below.
  let entitlement;
  // The preview's effective policy needs the GitHub App's installation credential; without it the preview stays a
  // labelled design specimen. The open-brief refresh only enqueues its cause, so it needs the queue binding alone and
  // reports itself unavailable without one.
  const appCredential = typeof env.GITHUB_APP_ID === 'string' && env.GITHUB_APP_ID && typeof env.GITHUB_APP_PRIVATE_KEY === 'string' && env.GITHUB_APP_PRIVATE_KEY;
  const admission = createAdmissionService({ store: appStore, authorize: async request => ['repository-admin', 'delegated-admin'].includes(request.actor?.role),
    entitlement: ({ repositoryId, actor }) => entitlement.planOfRepository(repositoryId, actor), briefProvider: premium.brief, appAuthor: env.GITHUB_APP_BOT_LOGIN ?? 'diffdevil[bot]',
    refreshBriefs: createBriefRefresher(env, { now: clock }), ...(appCredential ? { previewPolicy: createPolicyResolver(env, { fetch: installationFetch }) } : {}) });
  // A loopback origin is reached as localhost or 127.0.0.1 through local proxies; a deployed https origin is exact.
  const port = new URL(origin).port;
  const allowedOrigins = loopback ? [...new Set([origin, `http://localhost:${port}`, `http://127.0.0.1:${port}`])] : [origin];
  // The namespace a subscription may fund is the installation's numeric GitHub account, recorded from webhook identities.
  const namespaceOf = async ({ repositoryId }) => { try { return await commercialStore.repositoryNamespace(repositoryId); } catch { return undefined; } };
  // Defaults are adopted and Business revisions are published into repository settings.
  const policies = createPolicyReader(appStore, { repositoryIdentity: id => authStore.repositoryIdentity(id),
    resolvePolicy: createPolicyResolver(env, { fetch: installationFetch }) });
  // The authorization service is composed first so the commercial consumer and the analytics route can share it.
  let auth;
  // The consumer also observes a funder's authority without a session and carries the Account page's disconnect and reconnect.
  const authorizationRef = { analyticalQuery: (...args) => auth.analyticalQuery(...args), authenticate: (...args) => auth.authenticate(...args), read: (...args) => auth.read(...args), organisationAuthority: (...args) => auth.organisationAuthority(...args),
    observeOrganisationAuthority: (...args) => auth.observeOrganisationAuthority(...args), revokeAuthorization: (...args) => auth.revokeAuthorization(...args), reconnectService: (...args) => auth.reconnectService(...args) };
  let commercial, commercialSource = 'none';
  // Invalid or absent commercial configuration leaves entitlement at Free and the commercial routes unavailable; it never blocks pages.
  // Wirt returns the customer to the one admitted manage-plan destination (D078); a deployment may still name another continuation.
  try { commercial = commercialFromEnv(env, { store: commercialStore, authorization: authorizationRef, protector, allowedOrigins, linkContinuationUrl: env.WIRT_LINK_CONTINUATION_URL ?? `${origin}/manage/plan`, fetch, now: clock }); if (commercial) commercialSource = 'commercial'; }
  catch { commercial = undefined; }
  // A loopback deployment may stand a commercial fixture in for Wirt, so the paid presentation of Manage can be exercised locally.
  if (!commercial && loopback && env.APP_COMMERCIAL_FIXTURE) {
    try { commercial = createCommercialFixture(readCommercialFixture(env.APP_COMMERCIAL_FIXTURE), { authorization: authorizationRef, namespaceOf, allowedOrigins, origin, now: clock }); commercialSource = 'fixture'; }
    catch { commercial = undefined; }
  }
  entitlement = createEntitlement({ commercial, namespaceOf, fixture: env.APP_ENTITLEMENT_FIXTURE, loopback });
  // Allowances follow the hosted offer when a subscription source exists, and are operator configuration otherwise.
  const allowances = readAllowances(env.APP_PLAN_ALLOWANCES, { hosted: commercial !== undefined });
  const manage = new D1ManageStore(env.APP_DB, { now: clock });
  // The selected allowances as the runtime applies them, and a saved choice of what stays applied at the reduction.
  const operating = createOperating({ database: env.APP_DB, store, appStore, manage, entitlement, commercial, namespaceOf, allowances, now: clock });
  // Imports and recalculation: durable jobs whose steps run on the same queue behind live deliveries.
  const jobs = new D1HistoryJobStore(env.APP_DB, { now: clock });
  // How far one import reaches: the hosted Free offer imports recent pull requests up to its allowance; paid plans and a
  // Community deployment import all recoverable history; an unestablished plan pauses the import rather than guessing.
  const importScope = async repositoryId => {
    if (!commercial) return { limit: null };
    const plan = await entitlement.planOfRepository(repositoryId, null);
    if (!['free', 'pro', 'business'].includes(plan)) return { unknown: true };
    return { limit: plan === 'free' ? allowances.free.importPullRequests ?? null : null };
  };
  // A participation reward campaign runs only where Works can issue its reward. Invalid configuration leaves it off; it never blocks pages.
  // The store is composed regardless, so export and closure reach responses kept from an earlier campaign.
  const participationStore = new D1ParticipationStore(env.APP_DB, { now: clock });
  let participation;
  if (commercial) {
    try { const campaign = readCampaign(env.APP_PARTICIPATION_CAMPAIGN); if (campaign) participation = createParticipation({ store: participationStore, commercial, campaign, now: clock }); }
    catch { participation = undefined; }
  }
  // History retention is service configuration: the admission contract needs a bounded number of days and the terms are not published yet.
  const retentionDays = Number(env.APP_HISTORY_RETENTION_DAYS ?? 3660);
  if (!Number.isSafeInteger(retentionDays) || retentionDays < 1 || retentionDays > 3660) throw new TypeError('APP_HISTORY_RETENTION_DAYS must be a whole number of days between 1 and 3660.');
  // A real consumer has already validated WIRT_ORIGIN as one exact HTTPS origin. Do not expose an unconfigured or
  // refused destination to either the Works exits or the browser's form policy; the loopback stand-in stays local.
  const worksOrigin = commercialSource === 'commercial' && env.WIRT_ORIGIN ? env.WIRT_ORIGIN : commercialSource === 'fixture' ? `${origin}/manage/works-stand-in?dest=` : null;
  // The premium analytical extension, when the build joined one, is composed from the public host: the interval kit, the
  // turnover-v1 rules and a Contents-read installation credential minted only when a returned Turnover has an open tail.
  // Without the GitHub App credentials the extension reports the observation unavailable and the read still answers.
  const premiumService = premium.service?.(createAnalyticalPremiumHost(env, { store: appStore, installationOf: async repositoryId => (await authStore.repositoryIdentity(repositoryId))?.installation_id, fetch }));
  if (!caches.has(env.APP_DB)) caches.set(env.APP_DB, { context: createContextCache(), interpretations: createAnalyticalCache() });
  const { context: cache, interpretations: interpretationCache } = caches.get(env.APP_DB);
  const analytics = createAnalytics({ appStore, entitlement, policies, namespaceOf, interpretationCache, premium: premiumService, now: clock });
  const baseAnalytics = premiumService ? createAnalytics({ appStore, entitlement, policies, namespaceOf, interpretationCache, now: clock }) : analytics;
  // Delegated administration (Business): a named delegate administers what the namespace's GitHub administrators named
  // for them and only while the namespace is funded by Business; the authorization service separately requires the
  // delegate's own current GitHub write access to the repository at every action.
  const delegatedAdministration = async ({ userId, repositoryId }) => {
    const accountId = await namespaceOf({ repositoryId });
    if (!Number.isSafeInteger(accountId) || accountId <= 0) return false;
    const delegation = await manage.delegation(accountId, userId);
    if (!delegationReaches(delegation, repositoryId)) return false;
    return (await entitlement.planOfRepository(repositoryId, null)) === 'business';
  };
  auth = createAuthorizationService({ store: authStore, admission, analytics: analytics.service, provider, protector, returnContexts: [RETURN_CONTEXT], allowedOrigins, allowedCallbackUrls: [callbackUrl], sessionLifetimeMs: sessionDays * DAY, delegatedAdministration,
    closureRepositories: userId => appStore.personalClosureRepositories(userId),
    closeAccount: ({ userId, repositories, sessionHash }) => closeLocalAccount({ database: env.APP_DB, userId, repositories, sessionHash, now: clock }), now: clock });
  // Automatic setup (Business) for repositories a lifecycle delivery newly grants; the managed runtime calls it. It reads
  // the chooser's current permission on each repository through the App installation; without App credentials it holds.
  const permissionOf = env.GITHUB_APP_ID && env.GITHUB_APP_PRIVATE_KEY ? createRepositoryPermissionReader(env, { fetch }) : undefined;
  const automaticSetup = createAutomaticSetup({ appStore, manage, namespaceOf, entitlement, permissionOf });
  return {
    config: { origin, loopback, sessionDays, callbackUrl, siteOrigin: env.SITE_ORIGIN ?? 'https://diffdevil.dev', worksOrigin, retentionDays, allowedOrigins,
      admissionService: admissionServiceIdentity(origin, env.CF_VERSION_METADATA) },
    now: clock, store, appStore, commercialStore, auth, provider, entitlement, policies, analytics, baseAnalytics, locator, commercial, commercialSource, namespaceOf, premium, manage, participation, participationStore, allowances, automaticSetup,
    operating, jobs, importScope, queue: env.APP_QUEUE, cache
  };
}
