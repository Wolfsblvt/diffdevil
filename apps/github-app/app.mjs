// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0

import { DiffdevilError, explainPolicy, unwrap } from '@wolfsblvt/diffdevil';
import { GitHubClient, applyGitHubPolicy, readGitHubPolicy, readHostCommentContext, readPullSnapshot } from '@wolfsblvt/diffdevil/github';
import { APP_QUEUE_KIND, BRIEF_REFRESH_TARGETS, POLICY_PATH, WEBHOOK_BODY_LIMIT, WORKER_RESULT_LIMIT, briefRefreshEnvelope, briefRefreshTarget, historyCaptureEnvelope, historyProjection, normalizeWebhookEvent,
  readQueueEnvelope } from './contracts.mjs';
import { createAppJwt, verifyWebhookSignature } from './crypto.mjs';
import { D1AppStore } from './storage.mjs';
import { stagingInstallationAccounts } from './staging-admission.mjs';
import { DEFAULT_SIZE_POLICY, resolveEffectivePolicy, validateRepositoryConfiguration } from './configuration.mjs';
import { checkSummary } from '../shared/check-summary.mjs';
import { analyticalHttp } from './analytical-http.mjs';
import { collectAnalyticalPullRequest, captureDefaultBranchSizes, defaultBranch, mergedCommit, observeFileSize } from './analytical-collection.mjs';
import { analyticalKit } from './analytical-data.mjs';
import { D1HistoryJobStore, resumeHistoryJobs, runHistoryJob } from './history-jobs.mjs';
import { COMMERCIAL_LINK_COOKIE, commercialFromEnv } from './commercial.mjs';
import { bindPlatformFetch } from './platform-fetch.mjs';
import { BRIEF_LIFECYCLE, BRIEF_RULE, HISTORY_WITHDRAWN, briefComposer, briefLinks, briefPolicyLayer, gatherBriefInputs, historyPublicationGuard, openPullRequests, openPullRequestsAfter, policyNameOf,
  postFinalSummary, rateReserveReached, readNeighbourContext, readOpenFileIndex, resolveBriefRoute, storedBriefSettings } from './brief.mjs';

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' };

function response(status, body) { return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS }); }
function deliveryId(request) { return request.headers.get('x-github-delivery') ?? ''; }
function publicFailure(status, code) { return response(status, { ok: false, code }); }
function bodyLimit(request) {
  const declared = request.headers.get('content-length');
  if (declared !== null && (!/^\d+$/u.test(declared) || Number(declared) > WEBHOOK_BODY_LIMIT)) return false;
  return true;
}
async function readBodyWithinLimit(request) {
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks = []; let bytes = 0;
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > WEBHOOK_BODY_LIMIT) { await reader.cancel(); throw appError('E_BODY_LIMIT'); }
      chunks.push(part.value);
    }
  } finally { reader.releaseLock(); }
  const body = new Uint8Array(bytes); let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return body;
}
function errorCode(error) { return error instanceof DiffdevilError ? error.diagnostic.code : typeof error?.code === 'string' ? error.code : 'E_APP_EXECUTION'; }
function executionDiagnostic(error, fallbackCode, phase) {
  const code = errorCode(error) === 'E_APP_EXECUTION' ? fallbackCode : errorCode(error);
  const diagnostics = Array.isArray(error?.diagnostics) ? error.diagnostics : [];
  // Partial provider observations and the repair identity belong to the failure; a stage label must not discard them.
  return Object.assign(new Error(code), { code, diagnostics: [...diagnostics, { code, phase }],
    ...(Array.isArray(error?.observations) ? { observations: error.observations } : {}), ...(error?.repairIdentity ? { repairIdentity: error.repairIdentity } : {}) });
}
async function atExecutionStage(fallbackCode, phase, operation) {
  try { return await operation(); }
  catch (error) { throw executionDiagnostic(error, fallbackCode, phase); }
}
function failureDisposition(error) {
  const code = errorCode(error);
  if (code === 'E_GITHUB_RATE_LIMIT' || code === 'E_LEASE_LOST' || code === HISTORY_WITHDRAWN) return 'retry';
  if (['E_PULL_REQUEST_CLOSED', 'E_CHECK_STALE', 'E_ACCESS_DISABLED', 'E_APP_ALLOWANCE'].includes(code)) return 'rejected';
  return 'repair';
}
function appError(code) { return Object.assign(new Error(code), { code }); }
function stable(value, fallback = 'unknown') { return typeof value === 'string' && /^[A-Za-z0-9._-]{1,200}$/u.test(value) ? value : fallback; }
const commitSha = value => typeof value === 'string' && /^[0-9a-f]{40,64}$/u.test(value);
const timestamp = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? Date.parse(value) : null;
function repairProjection(error) {
  const diagnostics = Array.isArray(error?.diagnostics) ? error.diagnostics.map(value => ({ code: stable(value?.code, 'E_DIAGNOSTIC'), phase: stable(value?.phase) })) : [];
  const observations = Array.isArray(error?.observations) ? error.observations.map(value => ({ kind: stable(value?.kind), outcome: stable(value?.outcome), request: stable(value?.request), readback: stable(value?.readback) })) : [];
  const candidate = error?.repairIdentity;
  const identity = Number.isSafeInteger(candidate?.repositoryId) && candidate.repositoryId > 0 && Number.isSafeInteger(candidate?.pullRequest) && candidate.pullRequest > 0
    ? { repositoryId: candidate.repositoryId, pullRequest: candidate.pullRequest, base: stable(candidate.base, undefined), head: stable(candidate.head, undefined), policyId: stable(candidate.policyId, undefined), comparisonId: stable(candidate.comparisonId, undefined) }
    : undefined;
  // Any attempted provider write makes this an effect reconciliation: its acknowledgement and readback must be re-read.
  const attempted = observations.some(value => value.request !== 'not-needed');
  return { kind: errorCode(error) === 'E_CHECK_PUBLICATION' ? 'check-publication' : errorCode(error) === 'E_EFFECT_INCOMPLETE' || attempted ? 'effect-reconciliation' : 'execution', identity, projection: { code: stable(errorCode(error), 'E_APP_EXECUTION'), diagnostics, observations } };
}

function installationToken(value) {
  if (!value || typeof value !== 'object' || typeof value.token !== 'string' || value.token.length === 0 || typeof value.expires_at !== 'string' || !Number.isFinite(Date.parse(value.expires_at)) || Date.parse(value.expires_at) <= Date.now()) throw new TypeError('GitHub returned an invalid installation token response.');
  return value.token;
}

function headerInteger(headers, name) {
  const value = headers.get(name);
  return value !== null && /^\d{1,15}$/u.test(value) ? Number(value) : undefined;
}
/**
 * An installation client that keeps the last hourly budget GitHub reported (`rateBudget`), so optional reads can yield
 * before the basic size report and its effects run out. Only the three rate headers are kept.
 */
export function budgetedClient(options = {}) {
  const rateBudget = {};
  const fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  const observed = async (input, init) => {
    const response = await fetch(input, init);
    const remaining = headerInteger(response.headers, 'x-ratelimit-remaining'), limit = headerInteger(response.headers, 'x-ratelimit-limit');
    if (remaining !== undefined && limit !== undefined && limit > 0) Object.assign(rateBudget, { remaining, limit, reset: headerInteger(response.headers, 'x-ratelimit-reset') });
    return response;
  };
  return Object.assign(new GitHubClient({ ...options, fetch: observed }), { rateBudget });
}

async function mintInstallationClient(env, installationId, body, options = {}) {
  const store = new D1AppStore(env.APP_DB, { installationAccounts: stagingInstallationAccounts(env) });
  if (!await store.installationAdmitted(installationId)) throw appError('E_ACCESS_DISABLED');
  const jwt = await (options.createJwt ?? createAppJwt)({ appId: env.GITHUB_APP_ID, privateKey: env.GITHUB_APP_PRIVATE_KEY, ...(options.now === undefined ? {} : { now: options.now }) });
  const fetch = bindPlatformFetch(options.fetch);
  const app = new GitHubClient({ token: jwt, ...(fetch === undefined ? {} : { fetch }), responseBytes: WORKER_RESULT_LIMIT, readRetries: 0 });
  const token = installationToken(await app.json(`/app/installations/${installationId}/access_tokens`, { method: 'POST', phase: 'apply', body }));
  return budgetedClient({ token, ...(fetch === undefined ? {} : { fetch }), responseBytes: WORKER_RESULT_LIMIT, readRetries: 0 });
}

/** A repository-scoped credential is minted only after a delivery and execution lease are claimed. */
export async function createInstallationClient(env, installationId, repositoryId, options = {}) {
  return mintInstallationClient(env, installationId, { repository_ids: [repositoryId], permissions: { contents: 'read', pull_requests: 'write', checks: 'write' } }, options);
}

/**
 * What a premium analytical extension is composed from: the public kit (interval arithmetic, the turnover-v1
 * definition and evidence rules), the provider reads it needs, and `clientFor`, a contents-read credential scoped to the
 * one repository, minted only when a returned Turnover has an open tail. `installationOf` is server-owned metadata.
 */
export function createAnalyticalPremiumHost(env, { store, installationOf, ...options }) {
  const clientFor = async repositoryId => {
    const installationId = await installationOf(repositoryId);
    if (!Number.isSafeInteger(installationId) || installationId < 1) throw appError('E_APP_DATA_INSTALLATION');
    return mintInstallationClient(env, installationId, { repository_ids: [repositoryId], permissions: { contents: 'read' } }, options);
  };
  return { kit: analyticalKit, github: { defaultBranch, observeFileSize }, store, clientFor };
}

/**
 * History remains a read-only operation even when repository label/check execution is disabled. A published record
 * enqueues the capture of the default branch's known file sizes, which runs in its own parts after basic operation.
 */
export async function collectDeliveryAnalytics(envelope, dependencies, recordedResult) {
  const { env, store, analyticalClientFactory, resolveFinalComparison, operating } = dependencies;
  if (!store.historySettings || !(await store.historySettings(envelope.repositoryId, { independentExecution: true })).enabled) return { status: 'disabled' };
  if (operating && (await operating(envelope.repositoryId)).history !== 'allowed') return { status: 'held' };
  const client = analyticalClientFactory ? await analyticalClientFactory(env, envelope.installationId, envelope.repositoryId)
    : await mintInstallationClient(env, envelope.installationId, { repository_ids: [envelope.repositoryId], permissions: { contents: 'read', pull_requests: 'read' } });
  const result = await collectAnalyticalPullRequest({ client, store, repositoryId: envelope.repositoryId, pullRequest: envelope.pullRequest, resolveFinalComparison, recordedResult });
  if (result.status === 'published' && (await enqueueHistoryCapture(dependencies, { ...envelope, causeId: envelope.deliveryId })).status !== 'enqueued') throw appError('E_APP_DATA_CAPTURE_ENQUEUE');
  return result;
}

/** Send one part of a history capture; `part` 0 starts it, later parts carry the revision and start it pinned. */
async function enqueueHistoryCapture(dependencies, { installationId, accountId, repositoryId, pullRequest, causeId }, { part = 0, revision, since, delaySeconds = 0 } = {}) {
  const queue = dependencies.env?.APP_QUEUE;
  if (!queue) return { status: 'unavailable' };
  try {
    const body = historyCaptureEnvelope({ installationId, accountId, repositoryId, pullRequest, causeId, part, revision, since, receivedAt: clock(dependencies)() });
    if (delaySeconds > 0) await queue.send(body, { delaySeconds }); else await queue.send(body);
    return { status: 'enqueued', ...(delaySeconds > 0 ? { delaySeconds } : {}) };
  } catch { return { status: 'failed' }; }
}

async function collectAfterExecution(envelope, dependencies, recordedResult) {
  try {
    const result = await dependencies.collectAnalytics(envelope, dependencies, recordedResult);
    if (result.recovery) await dependencies.store.recordAnalyticalRepair(envelope, result.code ?? 'E_APP_DATA_FINAL_UNRECOVERED');
    return result.status;
  } catch (error) {
    // Preserve a separate read-side recovery consequence; successful provider effects are not replayed for enrichment.
    await dependencies.store.recordAnalyticalRepair(envelope, stable(errorCode(error), 'E_APP_DATA_COLLECTION'));
    return 'repair';
  }
}

/**
 * How a brief refresh paces itself. One part evaluates at most `perPart` PRs and shares one in-memory read of the open
 * PRs' files; the rest continue in the next part. With a healthy observed budget the next part follows at once; an
 * unobserved budget spaces parts, a deferred PR waits out the execution lease it met, and inside the rate reserve the
 * refresh waits for GitHub's reset.
 */
export const REFRESH_PACING = Object.freeze({ perPart: 20, unobservedDelaySeconds: 60, deferredDelaySeconds: 90, maximumDelaySeconds: 3600 });
const clock = dependencies => dependencies.now ?? (() => new Date().toISOString());

/**
 * What one queue invocation may spend on D1. Workers Paid allows 1,000 D1 queries per invocation (Free allows 50, too
 * few for a single delivery, so the App needs Workers Paid). Past it D1 refuses every further query, so a delivery
 * would stop between its provider effects and its records, and every later message of the batch would fail with it.
 * Each statement of a batch is counted, the conservative reading of the limit. A refresh evaluation starts only while
 * `perEvaluation` queries remain (above the most one measured evaluation issues), and a refresh part starts only while
 * it can also claim, check and finish itself (`perPart`). A history capture part starts only while it can claim, read
 * its known paths and write at least one size (`perCapturePart`), and reads another path only while that path's write,
 * its chunk's consent read and claim renewal, and the part's finish still fit (`perCaptureChunk` beside the paths).
 * What does not fit continues in the next invocation.
 */
export const INVOCATION_BUDGET = Object.freeze({ d1Queries: 1000, perEvaluation: 80, perPart: 12, perCapturePart: 20, perCaptureChunk: 7 });

const SPENT = Symbol('diffdevil.d1-spent');
/** Count every D1 statement this invocation issues, batches statement by statement, without changing what runs. */
function countedDatabase(database, spent) {
  if (!database || typeof database.prepare !== 'function') return database;
  const raw = new WeakMap();
  const counted = statement => {
    const proxy = new Proxy(statement, { get(target, key) {
      if (key === 'bind') return (...values) => counted(target.bind(...values));
      if (key === 'run' || key === 'first' || key === 'all' || key === 'raw') return (...values) => { spent.d1++; return target[key](...values); };
      const value = target[key];
      return typeof value === 'function' ? value.bind(target) : value;
    } });
    raw.set(proxy, statement);
    return proxy;
  };
  return new Proxy(database, { get(target, key) {
    if (key === SPENT) return spent;
    if (key === 'prepare') return sql => counted(target.prepare(sql));
    if (key === 'batch') return statements => { spent.d1 += statements.length; return target.batch(statements.map(statement => raw.get(statement) ?? statement)); };
    if (key === 'exec') return sql => { spent.d1++; return target.exec(sql); };
    const value = target[key];
    return typeof value === 'function' ? value.bind(target) : value;
  } });
}
/**
 * The invocation's environment with its D1 binding counted. A host that composes other D1 users from the environment
 * (the signed-in App's commercial store) counts first and hands the same environment to `queue`, which reuses it.
 */
export function countedInvocationEnv(env) {
  if (!env?.APP_DB || env.APP_DB[SPENT]) return env;
  return { ...env, APP_DB: countedDatabase(env.APP_DB, { d1: 0 }) };
}
/** Whether this invocation can still spend `queries` on D1; an uncounted store (an injected test double) is unbounded. */
function invocationRoom(dependencies, queries) {
  const spent = dependencies.invocation?.d1;
  return !Number.isSafeInteger(spent) || spent + queries <= INVOCATION_BUDGET.d1Queries;
}

// Shared storage no longer spends one D1 statement per path. Keep that existing processing allowance so the
// cheaper writes do not silently enlarge one invocation's provider/CPU work, or an invocation with many captures.
function captureRoom(dependencies, paths, reserve = 0) {
  return invocationRoom(dependencies, paths + (dependencies.invocation?.capturePaths ?? 0) + INVOCATION_BUDGET.perCaptureChunk + reserve);
}
function capturedPaths(dependencies, paths) {
  if (dependencies.invocation) dependencies.invocation.capturePaths = (dependencies.invocation.capturePaths ?? 0) + paths;
}

/**
 * Enqueue a fresh evaluation of other open PRs' briefs (`targets` names them, or `'open'` for every open PR) through the
 * ordinary delivery path. Refreshes carry identifiers only, are idempotent per cause, never fan out again, and an
 * enqueue failure never fails the delivery that caused them. A continuation of an `open` refresh carries its `cursor`.
 */
async function enqueueBriefRefresh(dependencies, origin, targets, cause, causeId, { part = 0, delaySeconds = 0, cursor = {} } = {}) {
  const named = targets === 'open' ? 'open' : [...new Set(targets)].filter(number => Number.isSafeInteger(number) && number > 0 && number !== origin.pullRequest);
  if (named !== 'open' && !named.length) return { status: 'none', count: 0 };
  const queue = dependencies.env?.APP_QUEUE;
  const identity = stable(causeId, undefined);
  if (!queue || identity === undefined) return { status: 'unavailable', count: 0 };
  const selected = named === 'open' ? 'open' : named.slice(0, BRIEF_REFRESH_TARGETS);
  try {
    const body = briefRefreshEnvelope({ installationId: origin.installationId, accountId: origin.accountId, repositoryId: origin.repositoryId, targets: selected, cause, causeId: identity, part,
      ...(named === 'open' ? cursor : {}), receivedAt: clock(dependencies)() });
    if (delaySeconds > 0) await queue.send(body, { delaySeconds }); else await queue.send(body);
    return { status: 'enqueued', ...(selected === 'open' ? { scope: 'open' } : { count: selected.length }), ...(named !== 'open' && named.length > selected.length ? { omitted: named.length - selected.length } : {}),
      ...(delaySeconds > 0 ? { delaySeconds } : {}) };
  } catch { return { status: 'failed', count: 0 }; }
}

/**
 * After a PR closes: the open PRs its last brief described as sharing files no longer have it as a neighbour, and a
 * merged trusted-policy change can change every open brief. Only reads and queue messages; never a write to this PR.
 */
async function refreshAfterClose(dependencies, envelope, client, target, author) {
  try {
    const previous = await readHostCommentContext(client, target, { rule: BRIEF_RULE, host: BRIEF_LIFECYCLE }, author);
    const neighbour = await enqueueBriefRefresh(dependencies, envelope, readNeighbourContext(previous.context), 'neighbour', envelope.deliveryId);
    const pull = await client.json(`/repos/${target.repository}/pulls/${target.pullRequest}`);
    if (pull?.merged !== true) return { neighbour };
    const files = await client.list(`/repos/${target.repository}/pulls/${target.pullRequest}/files?per_page=100`, { maximumItems: 3000 });
    // A truncated file list cannot show that the policy was left alone.
    if (files.truncated !== true && !files.items.some(file => file?.filename === POLICY_PATH || file?.previous_filename === POLICY_PATH)) return { neighbour };
    // Keyed by the merge commit, like the default-branch push that delivers the same change, so both are one refresh.
    const canResolveTimeline = timestamp(pull.merged_at) !== null && Number.isSafeInteger(pull.number) && pull.number > 0;
    const canResolveIdentity = commitSha(pull.merge_commit_sha) || canResolveTimeline;
    let mergeCommit = null;
    if (canResolveIdentity) {
      try {
        mergeCommit = await mergedCommit(client, target.repository, pull);
      } catch {
        // Without a reliable timeline identity, the unique delivery ID still preserves this refresh.
      }
    }
    const causeId = mergeCommit ? `policy-${mergeCommit}` : envelope.deliveryId;
    return { neighbour, policy: await enqueueBriefRefresh(dependencies, envelope, 'open', 'policy', causeId) };
  } catch { return { status: 'failed' }; }
}

/**
 * The admission service's brief refresher: after an accepted settings, policy-layer or history-consent change, every
 * open PR of the repository is evaluated again through the ordinary delivery path. Admission only enqueues the cause;
 * the queue lists the open PRs, so the accepted change makes no provider request of its own.
 */
export function createBriefRefresher(env, options = {}) {
  return async ({ repositoryId, installationId, cause, causeId }) => enqueueBriefRefresh({ env, now: options.now }, { installationId, repositoryId, pullRequest: 0 }, 'open', cause, causeId);
}

/**
 * The brief preview's production policy resolver: the trusted policy a PR targeting the default branch would be
 * evaluated under now (stored configuration, then `.diffdevil.yml` at the default branch head), read with a
 * repository-scoped Contents-read credential. Nothing is written.
 */
export function createPolicyResolver(env, options = {}) {
  return async ({ repositoryId, installationId, configuration }) => {
    const account = options.accountLayer ? await options.accountLayer(repositoryId) : {};
    const client = await mintInstallationClient(env, installationId, { repository_ids: [repositoryId], permissions: { metadata: 'read', contents: 'read' } }, options);
    const repository = await client.json(`/repositories/${repositoryId}`);
    if (!repository || repository.id !== repositoryId || typeof repository.full_name !== 'string' || typeof repository.default_branch !== 'string') throw appError('E_EFFECTIVE_POLICY_UNAVAILABLE');
    const head = await client.json(`/repos/${repository.full_name}/commits/${encodeURIComponent(repository.default_branch)}`);
    if (typeof head?.sha !== 'string' || !/^[0-9a-f]{40,64}$/u.test(head.sha)) throw appError('E_EFFECTIVE_POLICY_UNAVAILABLE');
    const validated = configuration === undefined ? undefined : validateRepositoryConfiguration(configuration).value;
    return trustedPolicy(client, { repository: repository.full_name, pullRequest: 1 }, head.sha, validated, account);
  };
}

/**
 * GitHub's calculated permission for one account on one repository (repository, team and organisation grants together),
 * read through the App's own installation with a credential scoped to that repository and Metadata read only. No
 * personal user token is involved. The account is named by its stable numeric id: its current login is read first
 * (`GET /user/{account_id}`), so a rename follows the person and a recycled login cannot stand in for them. Answers
 * `{ answer: 'present', permission, user: { id, login } }` (GitHub may report `permission: 'none'`), `{ answer:
 * 'no-user' }` when GitHub knows no account with that id, `{ answer: 'absent' }` when the repository or the account's
 * access is reported as not found, and `{ answer: 'unknown', code }` when GitHub could not be asked. Never throws.
 */
export function createRepositoryPermissionReader(env, options = {}) {
  return async ({ installationId, repositoryId, userId }) => {
    if (![installationId, repositoryId, userId].every(value => Number.isSafeInteger(value) && value > 0)) return { answer: 'unknown', code: 'E_APP_PERMISSION_INPUT' };
    let client;
    try { client = await mintInstallationClient(env, installationId, { repository_ids: [repositoryId], permissions: { metadata: 'read' } }, options); }
    catch (error) { return { answer: 'unknown', code: stable(errorCode(error), 'E_APP_PERMISSION') }; }
    let login;
    try {
      const account = await client.json(`/user/${userId}`);
      if (account?.id !== userId || typeof account.login !== 'string' || !/^[A-Za-z0-9-]{1,39}$/u.test(account.login)) return { answer: 'unknown', code: 'E_APP_PERMISSION_ACCOUNT' };
      login = account.login;
    } catch (error) { return error?.status === 404 ? { answer: 'no-user' } : { answer: 'unknown', code: stable(errorCode(error), 'E_APP_PERMISSION') }; }
    try {
      const listed = await client.json('/installation/repositories?per_page=100');
      const repository = Array.isArray(listed?.repositories) ? listed.repositories.find(value => value?.id === repositoryId) : undefined;
      const [owner, name] = typeof repository?.full_name === 'string' ? repository.full_name.split('/') : [];
      if (!owner || !name) return { answer: 'absent' };
      const result = await client.json(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/collaborators/${encodeURIComponent(login)}/permission`);
      const user = Number.isSafeInteger(result?.user?.id) && typeof result.user.login === 'string' ? { id: result.user.id, login: result.user.login } : null;
      return { answer: 'present', permission: typeof result?.permission === 'string' ? result.permission : null, user };
    } catch (error) {
      return error?.status === 404 ? { answer: 'absent' } : { answer: 'unknown', code: stable(errorCode(error), 'E_APP_PERMISSION') };
    }
  };
}

/** Read the provider's entire selected set before reconciling a partial installation delta. */
export async function listInstallationRepositories(env, installationId, options = {}) {
  const client = await mintInstallationClient(env, installationId, { permissions: { metadata: 'read' } }, options);
  const repositoryIds = new Set();
  let expected, page = 1;
  for (;;) {
    const value = await client.json(`/installation/repositories?per_page=100&page=${page}`);
    if (!value || typeof value !== 'object' || !Number.isSafeInteger(value.total_count) || value.total_count < 0 || !Array.isArray(value.repositories)) throw new TypeError('GitHub returned an invalid installation repository listing.');
    if (expected === undefined) expected = value.total_count;
    else if (expected !== value.total_count) throw new TypeError('GitHub changed the installation repository count during reconciliation.');
    for (const repository of value.repositories) {
      if (!repository || typeof repository !== 'object' || !Number.isSafeInteger(repository.id) || repository.id < 1) throw new TypeError('GitHub returned an invalid installation repository identity.');
      repositoryIds.add(repository.id);
    }
    if (repositoryIds.size === expected) return [...repositoryIds];
    if (repositoryIds.size > expected || value.repositories.length === 0) throw new TypeError('GitHub returned an incomplete installation repository listing.');
    page++;
  }
}

async function repositoryTarget(client, envelope) {
  const repository = await client.json(`/repositories/${envelope.repositoryId}`);
  if (!repository || typeof repository !== 'object' || repository.id !== envelope.repositoryId || typeof repository.full_name !== 'string') throw new TypeError('GitHub repository identity did not match the admitted delivery.');
  return { repository: repository.full_name, pullRequest: envelope.pullRequest };
}

/** `account` is the namespace default (Pro) the App supplies as the effective policy's account layer; the repository file still wins. */
async function trustedPolicy(client, target, base, configuration, account = {}) {
  let supplied = {}, source = configuration ? 'stored' : 'default', sourceIdentity = configuration ? 'stored repository configuration' : 'bundled default policy';
  try {
    const ordinary = await readGitHubPolicy(client, { repository: target.repository, ref: base, path: POLICY_PATH });
    supplied = { ...explainPolicy(ordinary).document, presets: ordinary.semantics.presets };
    source = 'trusted-base'; sourceIdentity = `.diffdevil.yml@${base}`;
  }
  catch (error) {
    if (error?.diagnostic?.details?.status !== 404) throw error;
  }
  const layers = { preset: DEFAULT_SIZE_POLICY, account: account ?? {}, ...(configuration?.repository === undefined ? {} : { repository: configuration.repository }), supplied };
  const effective = resolveEffectivePolicy(layers);
  // The standard brief joins as an App-owned rule only when no repository-authored comment wording is selected.
  const settings = storedBriefSettings(configuration);
  const route = resolveBriefRoute(settings, effective.document);
  const selected = route.effective === 'standard' ? resolveEffectivePolicy({ ...layers, app: briefPolicyLayer() }) : effective;
  return { ...selected, source, sourceIdentity, expectedPolicyBase: base, brief: { settings, route, policyName: policyNameOf(effective.document, effective.provenance) } };
}

/** How long one in-memory read of a repository's open PRs and their files answers later evaluations in the same invocation. */
export const INDEX_REUSE_MS = 120_000;
/**
 * Within one queue invocation, a repository's open-PR file read is made once and shared by every evaluation that needs
 * it shortly afterwards: each derives its own neighbours from the same read. It lives only in memory for the
 * invocation; no other PR's paths are stored, queued or retained.
 */
function openFileIndexReader(dependencies, repositoryId, read) {
  const indexes = dependencies.openFileIndexes;
  if (!indexes) return read;
  return () => {
    const now = Date.parse(clock(dependencies)());
    let held = indexes.get(repositoryId);
    if (!held || !(now - held.at <= INDEX_REUSE_MS)) { held = { at: now, value: read() }; indexes.set(repositoryId, held); }
    return held.value;
  };
}

/** Context failures degrade the brief to its complete basic form; they never block the size report or its effects. */
async function briefInputs(dependencies, envelope, target, client, policy) {
  try {
    const plan = dependencies.briefPlan ? await dependencies.briefPlan(envelope.repositoryId) : 'unknown';
    return await gatherBriefInputs({ store: dependencies.store, client, repositoryId: envelope.repositoryId, repository: target.repository, pullRequest: target.pullRequest,
      settings: policy.brief.settings, compiledPolicy: policy.policy, plan, now: clock(dependencies)(), provider: dependencies.briefProvider ?? null,
      readIndex: openFileIndexReader(dependencies, envelope.repositoryId, () => readOpenFileIndex({ client, repository: target.repository })) });
  } catch (error) {
    const reason = stable(errorCode(error), 'E_BRIEF_CONTEXT');
    return { history: { standing: 'unavailable', reason }, premium: { eligible: false, reason }, historyBacked: false, neighbours: null, neighbourRead: 'unavailable' };
  }
}

async function upsertCheck(client, store, identity, report, result, assertLease) {
  const previous = await store.check(identity);
  const output = { title: 'diffdevil analysis', summary: checkSummary(report, result) };
  const body = { name: 'diffdevil', head_sha: identity.head, status: 'completed', conclusion: result.status === 'verified' ? 'success' : 'neutral', output };
  const route = previous?.check_run_id ? `/repos/${identity.repository}/check-runs/${previous.check_run_id}` : `/repos/${identity.repository}/check-runs`;
  await assertLease();
  const value = await client.json(route, { method: previous?.check_run_id ? 'PATCH' : 'POST', phase: 'apply', body });
  if (!value || typeof value !== 'object' || !Number.isSafeInteger(value.id)) throw new TypeError('GitHub did not return a usable App-owned check run.');
  await store.recordCheck(identity, value.id);
}

/** Policy failures still belong on the PR once its identity and head are known. */
async function upsertDiagnosticCheck(client, store, identity, error, assertLease) {
  const previous = await store.check(identity);
  const code = errorCode(error);
  const configurationFailure = error?.diagnostics?.some(diagnostic => diagnostic?.phase === 'repository-configuration');
  const source = configurationFailure ? 'stored repository configuration' : `.diffdevil.yml@${identity.base}`;
  const output = { title: 'diffdevil could not evaluate policy', summary: `diffdevil could not evaluate policy from ${source} (${code}).` };
  const body = { name: 'diffdevil', head_sha: identity.head, status: 'completed', conclusion: 'neutral', output };
  const route = previous?.check_run_id ? `/repos/${identity.repository}/check-runs/${previous.check_run_id}` : `/repos/${identity.repository}/check-runs`;
  await assertLease();
  const value = await client.json(route, { method: previous?.check_run_id ? 'PATCH' : 'POST', phase: 'apply', body });
  if (!value || typeof value !== 'object' || !Number.isSafeInteger(value.id)) throw new TypeError('GitHub did not return a usable App-owned check run.');
  await store.recordCheck(identity, value.id);
}

async function assertRerequest(client, store, envelope, identity, appId) {
  if (envelope.type !== 'check-rerequest') return;
  const expected = await store.check(identity);
  if (!expected || expected.check_run_id !== envelope.checkRun) throw appError('E_CHECK_STALE');
  const check = await client.json(`/repos/${identity.repository}/check-runs/${envelope.checkRun}`);
  if (!check || typeof check !== 'object' || check.id !== envelope.checkRun || check.head_sha !== identity.head || check.app?.id !== appId) throw appError('E_CHECK_STALE');
}

/** Execute the reusable engine against fresh provider facts; queue payloads never become trusted policy or source data. */
export async function executeDelivery(envelope, deliveryId, dependencies) {
  const { env, store, lease, clientFactory = createInstallationClient } = dependencies;
  if (!await store.executionAllowed(envelope.repositoryId)) throw appError('E_ACCESS_DISABLED');
  // The selected allowance governs execution itself, not only the page where a repository is selected (D079).
  if (dependencies.operating) {
    const standing = await dependencies.operating(envelope.repositoryId);
    if (standing.execution !== 'allowed') throw Object.assign(appError('E_APP_ALLOWANCE'), { diagnostics: [{ code: 'E_APP_ALLOWANCE', phase: stable(standing.reason, 'allowance') }] });
  }
  let activeLease = lease;
  const renewLease = async () => {
    activeLease = await store.renewLease(envelope, activeLease);
    if (!activeLease) throw appError('E_LEASE_LOST');
    await store.assertLease(envelope, activeLease);
  };
  await renewLease();
  const client = await atExecutionStage('E_APP_INSTALLATION_CREDENTIAL', 'installation-credential', () => clientFactory(env, envelope.installationId, envelope.repositoryId));
  const target = await atExecutionStage('E_APP_REPOSITORY_TARGET', 'repository-target', () => repositoryTarget(client, envelope));
  const snapshot = await atExecutionStage('E_APP_PULL_SNAPSHOT', 'pull-snapshot', () => readPullSnapshot(client, target));
  if (snapshot.state !== 'open' && !(envelope.type === 'pull-request' && envelope.action === 'closed')) throw appError('E_PULL_REQUEST_CLOSED');
  let policy;
  try {
    const configuration = await atExecutionStage('E_APP_REPOSITORY_CONFIGURATION', 'repository-configuration', async () => {
      const stored = await store.repositoryConfiguration(envelope.repositoryId);
      return stored === undefined ? undefined : validateRepositoryConfiguration(stored.value);
    });
    // A linked namespace policy (Business) joins as the account layer when the App supplies one. A layer that cannot be
    // read holds the pull request like any unreadable policy: nothing is written under another policy than the effective one.
    const account = dependencies.accountLayer ? await atExecutionStage('E_APP_ACCOUNT_POLICY', 'account-policy', () => dependencies.accountLayer(envelope.repositoryId)) : {};
    policy = await atExecutionStage('E_APP_POLICY', 'trusted-policy', () => trustedPolicy(client, target, snapshot.base, configuration?.value, account));
  }
  catch (error) {
    // A closed PR gets no diagnostic check either: closing stops every report write.
    if (snapshot.state !== 'open') throw appError('E_PULL_REQUEST_CLOSED');
    const diagnosticIdentity = { repositoryId: envelope.repositoryId, pullRequest: envelope.pullRequest, repository: target.repository, base: snapshot.base, head: snapshot.head, policyId: 'diagnostic', appId: Number(env.GITHUB_APP_ID) };
    try { await atExecutionStage('E_CHECK_PUBLICATION', 'check-publication', () => upsertDiagnosticCheck(client, store, diagnosticIdentity, error, renewLease)); }
    catch (checkError) { error.diagnostics = [...(error.diagnostics ?? []), ...(checkError.diagnostics ?? [])]; }
    throw Object.assign(error, { repairIdentity: diagnosticIdentity });
  }
  const author = { login: env.GITHUB_APP_BOT_LOGIN ?? 'diffdevil[bot]' };
  const links = briefLinks({ repository: target.repository, pullRequest: target.pullRequest, appOrigin: env.APP_ORIGIN });
  const standard = policy.brief.route.effective === 'standard';
  if (snapshot.state !== 'open') {
    // A closed PR receives no further report edits; briefs that described it as a neighbour are refreshed instead.
    const refresh = standard && envelope.type === 'pull-request' ? await refreshAfterClose(dependencies, envelope, client, target, author) : undefined;
    // Only an explicitly enabled final summary may follow a merge.
    if (!standard || !policy.brief.settings.finalSummary) throw Object.assign(appError('E_PULL_REQUEST_CLOSED'), refresh ? { refresh } : {});
    const terminal = { repositoryId: envelope.repositoryId, pullRequest: envelope.pullRequest, base: snapshot.base, head: snapshot.head };
    const summary = await atExecutionStage('E_APP_FINAL_SUMMARY', 'final-summary', () => postFinalSummary({ client, target, policy, author, beforeWrite: renewLease, links, identity: terminal }));
    if (summary.status === 'not-merged') throw Object.assign(appError('E_PULL_REQUEST_CLOSED'), refresh ? { refresh } : {});
    return { status: 'verified', policyId: policy.policy.id, finalSummary: summary.status, effectCount: summary.status === 'created' ? 1 : 0, ...(refresh ? { refresh } : {}) };
  }
  const provisionalIdentity = { repositoryId: envelope.repositoryId, pullRequest: envelope.pullRequest, repository: target.repository, base: snapshot.base, head: snapshot.head, policyId: policy.policy.id };
  await atExecutionStage('E_APP_CHECK_REREQUEST', 'check-rerequest', () => assertRerequest(client, store, envelope, provisionalIdentity, Number(env.GITHUB_APP_ID)));
  let inputs = standard ? await briefInputs(dependencies, envelope, target, client, policy) : undefined;
  const observed = {};
  const apply = () => atExecutionStage('E_APP_POLICY_EXECUTION', 'policy-execution', async () => unwrap(await applyGitHubPolicy(client, target, policy.policy, { definitions: 'ensure', commentAuthor: author, occasionId: deliveryId, expectedPolicyBase: policy.expectedPolicyBase,
    // The lease is renewed before every write; the brief's write also re-asserts the history consent its body relied on.
    beforeWrite: async write => { await renewLease(); await historyPublicationGuard({ store, repositoryId: envelope.repositoryId, inputs })(write); },
    ...(standard ? { composeComments: briefComposer({ settings: policy.brief.settings, policyDocument: policy.document, policyName: policy.brief.policyName,
      inputs, provider: dependencies.briefProvider ?? null, links, observed }) } : {}) })));
  const withdrawn = result => result.status !== 'verified' && result.diagnostics.some(diagnostic => diagnostic?.code === HISTORY_WITHDRAWN);
  let outcome = await apply();
  if (withdrawn(outcome)) {
    // History consent was withdrawn after the inputs were read and before the brief was written. Recompose from fresh
    // inputs, which no longer read history: the basic report and current context still publish.
    inputs = await briefInputs(dependencies, envelope, target, client, policy);
    outcome = await apply();
    if (withdrawn(outcome)) throw Object.assign(appError(HISTORY_WITHDRAWN), { diagnostics: outcome.diagnostics, observations: outcome.observations });
  }
  const identity = { ...provisionalIdentity, comparisonId: outcome.report.source.comparisonId, appId: Number(env.GITHUB_APP_ID) };
  if (outcome.status !== 'verified') throw Object.assign(appError('E_EFFECT_INCOMPLETE'), { diagnostics: outcome.diagnostics, observations: outcome.observations, repairIdentity: identity });
  try { await atExecutionStage('E_CHECK_PUBLICATION', 'check-publication', () => upsertCheck(client, store, identity, outcome.report, outcome, renewLease)); }
  catch (error) { throw Object.assign(appError('E_CHECK_PUBLICATION'), { diagnostics: error.diagnostics, repairIdentity: identity }); }
  const history = await store.recordHistory(identity, historyProjection(outcome.report, outcome.observations));
  const selection = outcome.plan.operations.find(operation => operation.kind === 'label.select');
  // The PR's own event refreshes the briefs that described it before and the briefs that share its files now.
  const refresh = standard && envelope.type === 'pull-request' && observed.previous !== undefined
    ? await enqueueBriefRefresh(dependencies, envelope, [...observed.previous, ...(observed.current ?? [])], 'neighbour', envelope.deliveryId) : undefined;
  return { status: 'verified', policyId: outcome.plan.policyId, comparisonId: outcome.report.source.comparisonId, effectCount: outcome.changed, history: history.status, ...(refresh ? { refresh } : {}),
    analysis: { head: identity.head, policyId: outcome.plan.policyId, band: outcome.report.bands?.size?.id ?? null,
      desiredLabel: selection?.selected ?? null, managedLabels: selection?.members ?? [] } };
}

/** One PR's delivery under its own delivery claim and execution lease. `settled` is false when it must run again later. */
async function runPullRequestDelivery(envelope, dependencies) {
  const { store } = dependencies;
  const accepted = await store.claimDelivery(envelope);
  if (accepted.kind === 'duplicate') return { settled: true, state: 'duplicate' };
  if (accepted.kind === 'active') return { settled: false, code: 'E_DELIVERY_ACTIVE' };
  if (envelope.accountId !== undefined) await store.recordInstallationAccount(envelope.installationId, envelope.accountId, envelope.accountKind);
  if (envelope.repositoryPrivate !== undefined && store.recordRepositoryVisibility) await store.recordRepositoryVisibility(envelope.repositoryId, envelope.repositoryPrivate);
  const execution = await store.claimExecution(envelope, accepted);
  if (execution.kind === 'active') return { settled: false, code: 'E_EXECUTION_ACTIVE' };
  try {
    const result = await dependencies.execute(envelope, envelope.deliveryId, { ...dependencies, lease: execution });
    // A brief refresh re-reads facts another delivery already collected; it collects no analytics of its own.
    result.analytics = envelope.type === 'brief-refresh' ? 'not-needed' : await collectAfterExecution(envelope, dependencies, result.analysis);
    await store.finish(envelope, execution, 'complete', result);
    return { settled: true, state: 'complete' };
  } catch (error) {
    const disposition = failureDisposition(error), code = errorCode(error);
    if (disposition === 'retry') { await store.retry(envelope, execution, code); return { settled: false, code }; }
    if (envelope.type !== 'brief-refresh') await collectAfterExecution(envelope, dependencies);
    const state = disposition === 'rejected' ? 'rejected' : 'repair';
    await store.finish(envelope, execution, state, { status: disposition, code, ...(disposition === 'repair' ? { repair: repairProjection(error) } : {}) });
    return { settled: true, state };
  }
}

/** Seconds until the observed budget resets, within the pacing bounds; an unknown reset waits the maximum. */
function untilReset(budget, now) {
  const seconds = Number.isSafeInteger(budget?.reset) ? budget.reset - Math.floor(Date.parse(now) / 1000) + 5 : REFRESH_PACING.maximumDelaySeconds;
  return Math.min(REFRESH_PACING.maximumDelaySeconds, Math.max(REFRESH_PACING.unobservedDelaySeconds, seconds));
}

/** The next part of a refresh: the same cause and repository with what is still due. */
function continueRefresh(dependencies, envelope, due, { delaySeconds, cursor }) {
  return enqueueBriefRefresh(dependencies, { installationId: envelope.installationId, accountId: envelope.accountId, repositoryId: envelope.repositoryId, pullRequest: 0 },
    due, envelope.action, envelope.causeId, { part: envelope.part + 1, delaySeconds, cursor });
}
/** The cursor an `open` refresh carries unchanged, for a part that has to run again as it is. */
const cursorOf = envelope => ({ after: envelope.after, page: envelope.page, carried: envelope.carried });

/**
 * The PRs one part of a refresh will try, in order. A named refresh tries its PRs that are still open. An `open`
 * refresh first tries the PRs it carried, then walks on through every open PR in number order, beyond any listing
 * bound; `reached` says where that walk stands.
 */
async function refreshTargets(envelope, client, repository) {
  if (envelope.targets !== 'open') {
    const open = await openPullRequests(client, repository);
    const listed = new Set(open.map(pull => pull.number));
    // A named PR absent from a complete open listing has closed: it receives no write, so it needs no evaluation.
    return { targets: envelope.targets.filter(number => !open.complete || listed.has(number)) };
  }
  const carried = envelope.carried ?? [], after = envelope.after ?? 0, page = envelope.page ?? 1;
  const needed = REFRESH_PACING.perPart - carried.length;
  const reached = needed > 0 ? await openPullRequestsAfter(client, repository, { after, page, needed }) : { numbers: [], page, exhausted: false };
  return { targets: [...carried, ...reached.numbers], carried, after, reached };
}

/**
 * One part of a brief refresh. Each due PR is evaluated through the ordinary delivery path under its own delivery
 * identity and execution lease, sharing one installation credential and one in-memory read of the open PRs' files. A
 * PR whose lease another delivery holds is deferred; inside the rate reserve, on a rate limit, or when this invocation
 * has spent its D1 allowance, the part stops. Everything not settled continues in the next part, and the chain ends
 * only when every due PR has settled: pacing may delay a brief, never drop it.
 */
async function refreshPart(envelope, delivery, dependencies) {
  const { env, store, clientFactory = createInstallationClient } = dependencies;
  if (!await store.executionAllowed(envelope.repositoryId)) return { state: 'rejected' };
  // Only a repository that selected the standard brief has standard briefs to refresh.
  if (storedBriefSettings((await store.repositoryConfiguration(envelope.repositoryId))?.value).mode !== 'standard') return { state: 'complete', reason: 'brief-not-selected' };
  const client = await clientFactory(env, envelope.installationId, envelope.repositoryId);
  const target = await repositoryTarget(client, { repositoryId: envelope.repositoryId, pullRequest: 1 });
  const { targets, carried, after, reached } = await refreshTargets(envelope, client, target.repository);
  const shared = { ...dependencies, clientFactory: async () => client, openFileIndexes: dependencies.openFileIndexes ?? new Map() };
  const outcome = { refreshed: 0, rejected: 0, deferred: [] };
  let next = 0, delaySeconds = 0, spent = false;
  for (; next < targets.length && next < REFRESH_PACING.perPart; next++) {
    if (rateReserveReached(client.rateBudget)) { delaySeconds = untilReset(client.rateBudget, clock(dependencies)()); break; }
    if (!invocationRoom(dependencies, INVOCATION_BUDGET.perEvaluation)) { spent = true; break; }
    await store.renewDelivery?.(envelope, delivery);
    const result = await runPullRequestDelivery(briefRefreshTarget(envelope, targets[next]), shared);
    if (result.settled) { if (result.state === 'rejected') outcome.rejected++; else outcome.refreshed++; continue; }
    if (result.code === 'E_GITHUB_RATE_LIMIT') { delaySeconds = untilReset(client.rateBudget, clock(dependencies)()); break; }
    outcome.deferred.push(targets[next]);
  }
  // The next invocation has a fresh D1 allowance, so a part stopped by this one's continues at once.
  if (!delaySeconds && !spent) delaySeconds = outcome.deferred.length ? REFRESH_PACING.deferredDelaySeconds : client.rateBudget?.limit ? 0 : REFRESH_PACING.unobservedDelaySeconds;
  const unvisited = targets.slice(next);
  if (!reached) {
    const remaining = [...unvisited, ...outcome.deferred];
    if (!remaining.length) return { state: 'complete', outcome };
    const continuation = await continueRefresh(dependencies, envelope, remaining, { delaySeconds });
    if (continuation.status !== 'enqueued') throw appError('E_BRIEF_REFRESH_CONTINUATION');
    return { state: 'complete', outcome, continuation };
  }
  // The walk moves past the reached PRs it visited; unvisited ones stay above the cursor and are listed again.
  const visited = reached.numbers.filter(number => !unvisited.includes(number));
  const cursor = { after: Math.max(after, ...visited), page: reached.page, carried: [...outcome.deferred, ...unvisited.filter(number => carried.includes(number))] };
  if (!cursor.carried.length && reached.exhausted && visited.length === reached.numbers.length) return { state: 'complete', outcome };
  const continuation = await continueRefresh(dependencies, envelope, 'open', { delaySeconds, cursor });
  if (continuation.status !== 'enqueued') throw appError('E_BRIEF_REFRESH_CONTINUATION');
  return { state: 'complete', outcome, continuation };
}

async function consumeRefresh(message, envelope, dependencies) {
  // A part that cannot fit what this invocation has left goes back to the queue unchanged and unclaimed.
  if (!invocationRoom(dependencies, INVOCATION_BUDGET.perPart + INVOCATION_BUDGET.perEvaluation)) {
    try { await dependencies.env.APP_QUEUE.send(message.body); return message.ack(); } catch { return message.retry(); }
  }
  const accepted = await dependencies.store.claimDelivery(envelope);
  if (accepted.kind === 'duplicate') return message.ack();
  if (accepted.kind === 'active') return message.retry();
  try {
    const result = await refreshPart(envelope, accepted, dependencies);
    await dependencies.store.finishLifecycle(envelope, accepted, result.state);
    return message.ack();
  } catch (error) {
    // Settled PRs are duplicates on the next attempt; only what remains is evaluated again.
    const code = stable(errorCode(error), 'E_BRIEF_REFRESH');
    if (code === 'E_GITHUB_RATE_LIMIT') {
      // A rate limit on the part's own reads is pacing, not failure: the same part runs again after the reset window as
      // its continuation, so it never spends the queue's retries towards the dead-letter queue.
      const resumed = await continueRefresh(dependencies, envelope, envelope.targets, { delaySeconds: REFRESH_PACING.maximumDelaySeconds, cursor: cursorOf(envelope) });
      if (resumed.status === 'enqueued') {
        try { await dependencies.store.finishLifecycle(envelope, accepted, 'complete'); } catch { /* the continuation already holds the remainder */ }
        return message.ack();
      }
    }
    await dependencies.store.releaseDelivery?.(envelope, accepted, code);
    return message.retry();
  }
}

/**
 * One part of a history capture under its own delivery identity. It spends only what this invocation's D1 allowance
 * and the installation's rate reserve leave, and continues what remains as the next part: at once when the allowance
 * stopped it, after GitHub's reset when the reserve did. A moved branch or an unavailable read ends the chain with
 * the PR's analytical repair, as one whole capture did; sizes already published stay, each a true observation.
 */
async function capturePart(envelope, delivery, dependencies) {
  const { env, store, analyticalClientFactory } = dependencies;
  const client = analyticalClientFactory ? await analyticalClientFactory(env, envelope.installationId, envelope.repositoryId)
    : await mintInstallationClient(env, envelope.installationId, { repository_ids: [envelope.repositoryId], permissions: { contents: 'read' } });
  let rated = false;
  // A reused size spends no provider budget, so only a path that must be read waits for the rate reserve.
  const proceed = (paths, reading) => {
    if (reading && rateReserveReached(client.rateBudget)) { rated = true; return false; }
    return captureRoom(dependencies, paths);
  };
  let result;
  try {
    result = await captureDefaultBranchSizes({ client, store, repositoryId: envelope.repositoryId, revision: envelope.revision, since: envelope.since, now: clock(dependencies), proceed,
      afterChunk: paths => { capturedPaths(dependencies, paths); return store.renewDelivery?.(envelope, delivery); } });
  } catch (error) {
    const code = errorCode(error);
    if (code === 'E_GITHUB_RATE_LIMIT' || code === 'E_LEASE_LOST') throw error;
    await store.recordAnalyticalRepair(envelope, stable(code, 'E_APP_DATA_COLLECTION'));
    return { state: 'repair' };
  }
  if (result.status !== 'continued') return { state: 'complete' };
  const continuation = await enqueueHistoryCapture(dependencies, envelope, { part: envelope.part + 1, revision: result.revision, since: result.since,
    delaySeconds: rated ? untilReset(client.rateBudget, clock(dependencies)()) : 0 });
  if (continuation.status !== 'enqueued') throw appError('E_HISTORY_CAPTURE_CONTINUATION');
  return { state: 'complete' };
}

async function consumeCapture(message, envelope, dependencies) {
  // A part that cannot fit what this invocation has left goes back to the queue unchanged and unclaimed.
  if (!invocationRoom(dependencies, INVOCATION_BUDGET.perCapturePart)) {
    try { await dependencies.env.APP_QUEUE.send(message.body); return message.ack(); } catch { return message.retry(); }
  }
  const accepted = await dependencies.store.claimDelivery(envelope);
  if (accepted.kind === 'duplicate') return message.ack();
  if (accepted.kind === 'active') return message.retry();
  try {
    const result = await capturePart(envelope, accepted, dependencies);
    await dependencies.store.finishLifecycle(envelope, accepted, result.state);
    return message.ack();
  } catch (error) {
    // What this part published stays; the part that runs again captures only what is still due.
    const code = stable(errorCode(error), 'E_HISTORY_CAPTURE');
    await dependencies.store.releaseDelivery?.(envelope, accepted, code);
    if (code === 'E_GITHUB_RATE_LIMIT') {
      // A rate limit is pacing, not failure: the same part runs again after the reset window instead of spending the
      // queue's retries towards the dead-letter queue.
      try { await dependencies.env.APP_QUEUE.send(message.body, { delaySeconds: REFRESH_PACING.maximumDelaySeconds }); return message.ack(); } catch { /* the queue retries it instead */ }
    }
    return message.retry();
  }
}

async function consumeMessage(message, dependencies) {
  let envelope = readQueueEnvelope(typeof message.body === 'string' ? JSON.parse(message.body) : message.body);
  const admitted = !dependencies.store.installationAdmitted || await dependencies.store.installationAdmitted(envelope.installationId, envelope.accountId);
  if (!admitted && envelope.type !== 'history-job') {
    // Offboarding and suspension still withdraw existing reach. Outside accounts cannot add reach or acquire data.
    if (envelope.type !== 'lifecycle' || !['deleted', 'suspend', 'removed'].includes(envelope.action)) return message.ack();
    envelope = { ...envelope, addedRepositories: [] };
  }
  if (envelope.type === 'brief-refresh') return consumeRefresh(message, envelope, dependencies);
  if (envelope.type === 'history-job') {
    if (!dependencies.jobs) return message.retry();
    if (!invocationRoom(dependencies, INVOCATION_BUDGET.perCapturePart + INVOCATION_BUDGET.perEvaluation)) {
      try { await dependencies.env.APP_QUEUE.send(message.body); return message.ack(); } catch { return message.retry(); }
    }
    await runHistoryJob(envelope, { ...dependencies, budget: {
      collect: () => invocationRoom(dependencies, INVOCATION_BUDGET.perEvaluation + INVOCATION_BUDGET.perPart),
      capture: paths => captureRoom(dependencies, paths, INVOCATION_BUDGET.perPart),
      captured: paths => capturedPaths(dependencies, paths)
    } });
    return message.ack();
  }
  if (envelope.type === 'history-capture') return consumeCapture(message, envelope, dependencies);
  if (envelope.type === 'lifecycle') {
    const accepted = await dependencies.store.claimDelivery(envelope);
    if (accepted.kind === 'duplicate') return message.ack();
    if (accepted.kind === 'active') return message.retry();
    await dependencies.store.recordLifecycle(envelope);
    if (envelope.accountId !== undefined) await dependencies.store.recordInstallationAccount(envelope.installationId, envelope.accountId, envelope.accountKind);
    if (admitted && envelope.event === 'installation_repositories') await dependencies.store.reconcileRepositories(envelope.installationId, await dependencies.listInstallationRepositories(dependencies.env, envelope.installationId));
    // Automatic setup (Business), when the App composed it: what a newly granted repository gets, as its administrator chose. It records its own outcome and never fails the delivery.
    if (typeof dependencies.automaticSetup === 'function' && envelope.action !== 'deleted' && envelope.addedRepositories?.length) { try { await dependencies.automaticSetup({ installationId: envelope.installationId, repositoryIds: envelope.addedRepositories }); } catch { /* recorded by the setup itself where it could */ } }
    await dependencies.store.finishLifecycle(envelope, accepted);
    return message.ack();
  }
  const outcome = await runPullRequestDelivery(envelope, dependencies);
  return outcome.settled ? message.ack() : message.retry();
}

function cookieValue(request, name) {
  for (const part of (request.headers.get('cookie') ?? '').split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return value.join('=');
  }
  return undefined;
}
/** Protected results keep their private cache and cookie headers instead of the public JSON defaults. */
function protectedResponse(status, body, headers = {}) {
  const merged = new Headers(JSON_HEADERS);
  for (const [name, value] of Object.entries(headers)) merged.set(name, value);
  return new Response(body === null ? null : JSON.stringify(body), { status, headers: merged });
}
function protectedFailure(error) {
  const status = Number.isSafeInteger(error?.status) ? error.status : typeof error?.code === 'string' ? 403 : 503;
  return protectedResponse(status, { ok: false, code: typeof error?.code === 'string' ? error.code : 'E_COMMERCIAL_UNAVAILABLE' }, error?.headers);
}
async function jsonInput(request) {
  if (!(request.headers.get('content-type') ?? '').startsWith('application/json')) throw Object.assign(appError('E_COMMERCIAL_INPUT'), { status: 400 });
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(await readBodyWithinLimit(request))); }
  catch { throw Object.assign(appError('E_COMMERCIAL_INPUT'), { status: 400 }); }
}

/** Wirt commercial routes. The receiver needs only signing keys and D1; browser routes need the installed authorization adapter. */
export const COMMERCIAL_ROUTES = Object.freeze({
  projection: '/integrations/wirt/projection', link: '/integrations/wirt/link', callback: '/integrations/wirt/link/callback',
  unlink: '/integrations/wirt/unlink', bindings: '/integrations/wirt/bindings', status: '/integrations/wirt/status'
});

async function commercialRoute(request, url, commercial, context) {
  if (!commercial) return publicFailure(503, 'E_COMMERCIAL_UNAVAILABLE');
  if (url.pathname === COMMERCIAL_ROUTES.projection) {
    const { response: result, followUp } = await commercial.receive(request);
    // Reports leave after the push answer: Wirt holds the stream lock until this response returns.
    if (followUp) {
      const pending = followUp().catch(() => undefined);
      if (context?.waitUntil) context.waitUntil(pending); else await pending;
    }
    return result;
  }
  const session = cookieValue(request, '__Host-diffdevil-session');
  const mutation = { session, method: request.method, origin: request.headers.get('origin') };
  try {
    if (url.pathname === COMMERCIAL_ROUTES.callback && request.method === 'GET') {
      const result = await commercial.completeLink({ session, state: url.searchParams.get('state'), code: url.searchParams.get('code') ?? undefined,
        error: url.searchParams.get('error') ?? undefined, browserBinding: cookieValue(request, COMMERCIAL_LINK_COOKIE) });
      return protectedResponse(303, null, { ...result.headers, location: result.location, 'referrer-policy': 'no-referrer' });
    }
    if (url.pathname === COMMERCIAL_ROUTES.status && request.method === 'GET') {
      const result = await commercial.status({ session });
      return protectedResponse(200, result.body, result.headers);
    }
    if (request.method !== 'POST') return publicFailure(404, 'E_NOT_FOUND');
    let result;
    if (url.pathname === COMMERCIAL_ROUTES.link) {
      const begun = await commercial.beginLink(mutation);
      result = { body: begun.outcome === 'authorize' ? { ok: true, result: 'authorize', authorizationUrl: begun.authorizationUrl } : { ok: true, result: begun.outcome }, headers: begun.headers };
    }
    else if (url.pathname === COMMERCIAL_ROUTES.unlink) result = await commercial.unlink(mutation);
    else if (url.pathname === COMMERCIAL_ROUTES.bindings) {
      const input = await jsonInput(request);
      if (!Number.isSafeInteger(input?.organisationId) || !['bind', 'unbind'].includes(input?.action) || (input.action === 'bind' && typeof input.slot !== 'string')) {
        throw Object.assign(appError('E_COMMERCIAL_INPUT'), { status: 400 });
      }
      result = input.action === 'bind' ? await commercial.bind({ ...mutation, slot: input.slot, organisationId: input.organisationId })
        : await commercial.unbind({ ...mutation, organisationId: input.organisationId });
    }
    else return publicFailure(404, 'E_NOT_FOUND');
    const reports = commercial.flushReports().catch(() => undefined);
    if (context?.waitUntil) context.waitUntil(reports); else await reports;
    return protectedResponse(200, result.body, result.headers);
  } catch (error) { return protectedFailure(error); }
}

/** Cloudflare Worker adapter: ingress only acknowledges a verified, durable enqueue. */
export function createGitHubAppWorker(options = {}) {
  const commercialFor = env => {
    // Invalid commercial configuration leaves the commercial routes unavailable; it never blocks webhooks.
    try { return options.commercial ?? commercialFromEnv(env); } catch { return undefined; }
  };
  return {
    async fetch(request, env, context) {
      const url = new URL(request.url);
      if (url.pathname === '/api/analytics') {
        if (!options.authorization) return new Response(JSON.stringify({ code: 'E_APP_DATA_UNAVAILABLE' }), { status: 503,
          headers: { ...JSON_HEADERS, 'cache-control': 'private, no-store', vary: 'Cookie' } });
        return analyticalHttp(request, options.authorization);
      }
      if (request.method === 'GET' && url.pathname === '/health/ping') return response(200, { status: 'ok', service: 'diffdevil-github-app' });
      if (request.method === 'GET' && url.pathname === '/health/ready') {
        try { await (options.store ?? new D1AppStore(env.APP_DB)).readiness(); return response(200, { status: 'ready', service: 'diffdevil-github-app' }); }
        catch { return publicFailure(503, 'E_NOT_READY'); }
      }
      if (Object.values(COMMERCIAL_ROUTES).includes(url.pathname)) return commercialRoute(request, url, commercialFor(env), context);
      if (request.method !== 'POST' || url.pathname !== '/webhooks/github') return publicFailure(404, 'E_NOT_FOUND');
      if (!bodyLimit(request)) return publicFailure(413, 'E_BODY_LIMIT');
      const id = deliveryId(request), event = request.headers.get('x-github-event');
      if (!id || !event) return publicFailure(400, 'E_WEBHOOK_IDENTITY');
      let body;
      try { body = await readBodyWithinLimit(request); } catch (error) { return publicFailure(errorCode(error) === 'E_BODY_LIMIT' ? 413 : 400, errorCode(error)); }
      if (!await (options.verifySignature ?? verifyWebhookSignature)(body, request.headers.get('x-hub-signature-256'), env.GITHUB_WEBHOOK_SECRET)) return publicFailure(401, 'E_WEBHOOK_SIGNATURE');
      let payload;
      try { payload = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body)); } catch { return publicFailure(400, 'E_WEBHOOK_JSON'); }
      let envelope;
      try { envelope = normalizeWebhookEvent(event, payload, new Date().toISOString(), id); } catch { return publicFailure(400, 'E_WEBHOOK_IDENTITY'); }
      if (!envelope) return response(202, { ok: true, status: 'ignored' });
      try {
        const store = options.store ?? new D1AppStore(env.APP_DB, { installationAccounts: stagingInstallationAccounts(env) });
        if (store.installationAdmitted && !await store.installationAdmitted(envelope.installationId, envelope.accountId)) {
          if (envelope.type !== 'lifecycle' || !['deleted', 'suspend', 'removed'].includes(envelope.action)) return response(202, { ok: true, status: 'disabled' });
          envelope = { ...envelope, addedRepositories: [] };
        }
      } catch { return publicFailure(503, 'E_NOT_READY'); }
      try { await env.APP_QUEUE.send(envelope); return response(202, { ok: true, status: 'enqueued' }); }
      catch { return publicFailure(503, 'E_ENQUEUE'); }
    },
    async queue(batch, sourceEnv) {
      // Every D1 statement of this invocation is counted against its D1 allowance.
      const env = countedInvocationEnv(sourceEnv);
      const invocation = env?.APP_DB?.[SPENT];
      const commercial = commercialFor(env);
      // The plan funding this repository's namespace; without a commercial consumer every namespace reads as Free.
      const briefPlan = options.briefPlan ?? (async repositoryId => { try { return commercial ? await commercial.entitlement({ repositoryId, actor: null }) : 'free'; } catch { return 'unknown'; } });
      // One open-PR file read per repository is shared across this invocation's evaluations (in memory only).
      const dependencies = { env, store: options.store ?? new D1AppStore(env.APP_DB, { installationAccounts: stagingInstallationAccounts(env) }), execute: options.execute ?? executeDelivery, briefPlan, briefProvider: options.briefProvider ?? null, ...(options.accountLayer ? { accountLayer: options.accountLayer } : {}), ...(options.automaticSetup ? { automaticSetup: options.automaticSetup } : {}), ...(options.now ? { now: options.now } : {}),
        ...(options.operating ? { operating: options.operating } : {}), ...(options.importScope ? { importScope: options.importScope } : {}), ...(options.currentPolicy ? { currentPolicy: options.currentPolicy } : {}),
        jobs: options.jobs ?? (env.APP_DB ? new D1HistoryJobStore(env.APP_DB, options.now ? { now: options.now } : {}) : undefined),
        // History jobs read with the same repository-scoped Contents/Pull-requests read credential as live collection.
        clientFor: job => options.analyticalClientFactory ? options.analyticalClientFactory(env, job.installationId, job.repositoryId)
          : mintInstallationClient(env, job.installationId, { repository_ids: [job.repositoryId], permissions: { contents: 'read', pull_requests: 'read' } }),
        openFileIndexes: new Map(), ...(options.store || !invocation ? {} : { invocation }),
        collectAnalytics: options.collectAnalytics ?? collectDeliveryAnalytics, analyticalClientFactory: options.analyticalClientFactory,
        resolveFinalComparison: options.resolveFinalComparison,
        listInstallationRepositories: options.listInstallationRepositories ?? listInstallationRepositories, ...(options.clientFactory === undefined ? {} : { clientFactory: options.clientFactory }) };
      // Basic operation first: a PR's own event and lifecycle changes run before refresh and history capture parts,
      // which take what is left.
      const deferred = message => { try { return ['brief-refresh', 'history-capture', 'history-job'].includes((typeof message.body === 'string' ? JSON.parse(message.body) : message.body)?.type); } catch { return false; } };
      for (const message of [...batch.messages.filter(item => !deferred(item)), ...batch.messages.filter(deferred)]) {
        try { await consumeMessage(message, dependencies); }
        catch { message.retry(); }
      }
    },
    async scheduled(_controller, env, context) {
      const store = options.store ?? new D1AppStore(env.APP_DB);
      // A host's minimal qualifying-use observation must commit before the recovery ledger is pruned.
      context.waitUntil(Promise.resolve().then(async () => { await options.beforePrune?.(); await store.maintain(); }));
      // History jobs whose step lost its message, or whose service pause is over, continue from their saved progress.
      const jobs = options.jobs ?? (env.APP_DB ? new D1HistoryJobStore(env.APP_DB, options.now ? { now: options.now } : {}) : undefined);
      if (jobs) context.waitUntil(resumeHistoryJobs({ jobs, env, now: options.now }).catch(() => undefined));
      // The App's own operating maintenance (applying a due choice of what stays) runs beside the store's.
      if (options.maintain) context.waitUntil(Promise.resolve().then(options.maintain).catch(() => undefined));
      const commercial = commercialFor(env);
      if (commercial) context.waitUntil(commercial.maintain());
      // A host may add its own idempotent maintenance (the App's participation outbox); one failure never stops another.
      for (const task of options.maintenance ?? []) context.waitUntil(Promise.resolve().then(task).catch(() => undefined));
    }
  };
}

export { APP_QUEUE_KIND };
