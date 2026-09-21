// SPDX-License-Identifier: AGPL-3.0-only

import { DiffdevilError, explainPolicy, unwrap } from '@wolfsblvt/diffdevil';
import { GitHubClient, applyGitHubPolicy, readGitHubPolicy, readPullSnapshot } from '@wolfsblvt/diffdevil/github';
import { APP_QUEUE_KIND, WEBHOOK_BODY_LIMIT, WORKER_RESULT_LIMIT, historyProjection, normalizeWebhookEvent, readQueueEnvelope } from './contracts.mjs';
import { createAppJwt, verifyWebhookSignature } from './crypto.mjs';
import { D1AppStore } from './storage.mjs';
import { resolveEffectivePolicy } from './configuration.mjs';
import { checkSummary } from '../shared/check-summary.mjs';

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
const DEFAULT_SIZE_POLICY = { version: 1, presets: ['size@1'] };

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
  return Object.assign(new Error(code), { code, diagnostics: [...diagnostics, { code, phase }] });
}
async function atExecutionStage(fallbackCode, phase, operation) {
  try { return await operation(); }
  catch (error) { throw executionDiagnostic(error, fallbackCode, phase); }
}
function failureDisposition(error) {
  const code = errorCode(error);
  if (code === 'E_GITHUB_RATE_LIMIT' || code === 'E_LEASE_LOST') return 'retry';
  if (['E_PULL_REQUEST_CLOSED', 'E_CHECK_STALE', 'E_ACCESS_DISABLED'].includes(code)) return 'rejected';
  return 'repair';
}
function appError(code) { return Object.assign(new Error(code), { code }); }
function stable(value, fallback = 'unknown') { return typeof value === 'string' && /^[A-Za-z0-9._-]{1,200}$/u.test(value) ? value : fallback; }
function repairProjection(error) {
  const diagnostics = Array.isArray(error?.diagnostics) ? error.diagnostics.map(value => ({ code: stable(value?.code, 'E_DIAGNOSTIC'), phase: stable(value?.phase) })) : [];
  const observations = Array.isArray(error?.observations) ? error.observations.map(value => ({ kind: stable(value?.kind), outcome: stable(value?.outcome), request: stable(value?.request), readback: stable(value?.readback) })) : [];
  const candidate = error?.repairIdentity;
  const identity = Number.isSafeInteger(candidate?.repositoryId) && candidate.repositoryId > 0 && Number.isSafeInteger(candidate?.pullRequest) && candidate.pullRequest > 0
    ? { repositoryId: candidate.repositoryId, pullRequest: candidate.pullRequest, base: stable(candidate.base, undefined), head: stable(candidate.head, undefined), policyId: stable(candidate.policyId, undefined), comparisonId: stable(candidate.comparisonId, undefined) }
    : undefined;
  return { kind: errorCode(error) === 'E_CHECK_PUBLICATION' ? 'check-publication' : errorCode(error) === 'E_EFFECT_INCOMPLETE' ? 'effect-reconciliation' : 'execution', identity, projection: { code: stable(errorCode(error), 'E_APP_EXECUTION'), diagnostics, observations } };
}

function installationToken(value) {
  if (!value || typeof value !== 'object' || typeof value.token !== 'string' || value.token.length === 0 || typeof value.expires_at !== 'string' || !Number.isFinite(Date.parse(value.expires_at)) || Date.parse(value.expires_at) <= Date.now()) throw new TypeError('GitHub returned an invalid installation token response.');
  return value.token;
}

async function mintInstallationClient(env, installationId, body, options = {}) {
  const jwt = await (options.createJwt ?? createAppJwt)({ appId: env.GITHUB_APP_ID, privateKey: env.GITHUB_APP_PRIVATE_KEY, ...(options.now === undefined ? {} : { now: options.now }) });
  const app = new GitHubClient({ token: jwt, ...(options.fetch === undefined ? {} : { fetch: options.fetch }), responseBytes: WORKER_RESULT_LIMIT, readRetries: 0 });
  const token = installationToken(await app.json(`/app/installations/${installationId}/access_tokens`, { method: 'POST', phase: 'apply', body }));
  return new GitHubClient({ token, ...(options.fetch === undefined ? {} : { fetch: options.fetch }), responseBytes: WORKER_RESULT_LIMIT, readRetries: 0 });
}

/** A repository-scoped credential is minted only after a delivery and execution lease are claimed. */
export async function createInstallationClient(env, installationId, repositoryId, options = {}) {
  return mintInstallationClient(env, installationId, { repository_ids: [repositoryId], permissions: { contents: 'read', pull_requests: 'write', checks: 'write' } }, options);
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

async function trustedPolicy(client, target, base, configuration) {
  let supplied = {};
  try {
    const ordinary = await readGitHubPolicy(client, { repository: target.repository, ref: base, path: '.diffdevil.yml' });
    supplied = { ...explainPolicy(ordinary).document, presets: ordinary.semantics.presets };
  }
  catch (error) {
    if (error?.diagnostic?.details?.status !== 404) throw error;
  }
  return { policy: resolveEffectivePolicy({ preset: DEFAULT_SIZE_POLICY, ...(configuration ?? {}), supplied }).policy, expectedPolicyBase: base };
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

async function assertRerequest(client, store, envelope, identity, appId) {
  if (envelope.type !== 'check-rerequest') return;
  const expected = await store.check(identity);
  if (!expected || expected.check_run_id !== envelope.checkRun) throw appError('E_CHECK_STALE');
  const check = await client.json(`/repos/${identity.repository}/check-runs/${envelope.checkRun}`);
  if (!check || typeof check !== 'object' || check.id !== envelope.checkRun || check.head_sha !== identity.head || check.app?.id !== appId) throw appError('E_CHECK_STALE');
}

/** Execute the reusable engine against fresh provider facts; queue payloads never become trusted policy or source data. */
export async function executeDelivery(envelope, deliveryId, { env, store, lease, clientFactory = createInstallationClient }) {
  if (!await store.executionAllowed(envelope.repositoryId)) throw appError('E_ACCESS_DISABLED');
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
  if (snapshot.state !== 'open') throw appError('E_PULL_REQUEST_CLOSED');
  const configuration = await atExecutionStage('E_APP_REPOSITORY_CONFIGURATION', 'repository-configuration', () => store.repositoryConfiguration(envelope.repositoryId));
  const policy = await atExecutionStage('E_APP_POLICY', 'trusted-policy', () => trustedPolicy(client, target, snapshot.base, configuration?.value));
  const provisionalIdentity = { repositoryId: envelope.repositoryId, pullRequest: envelope.pullRequest, repository: target.repository, base: snapshot.base, head: snapshot.head, policyId: policy.policy.id };
  await atExecutionStage('E_APP_CHECK_REREQUEST', 'check-rerequest', () => assertRerequest(client, store, envelope, provisionalIdentity, Number(env.GITHUB_APP_ID)));
  const outcome = await atExecutionStage('E_APP_POLICY_EXECUTION', 'policy-execution', async () => unwrap(await applyGitHubPolicy(client, target, policy.policy, { definitions: 'ensure', commentAuthor: { login: env.GITHUB_APP_BOT_LOGIN ?? 'diffdevil[bot]' }, occasionId: deliveryId, expectedPolicyBase: policy.expectedPolicyBase,
    beforeWrite: renewLease })));
  const identity = { ...provisionalIdentity, comparisonId: outcome.report.source.comparisonId, appId: Number(env.GITHUB_APP_ID) };
  if (outcome.status !== 'verified') throw Object.assign(appError('E_EFFECT_INCOMPLETE'), { diagnostics: outcome.diagnostics, observations: outcome.observations, repairIdentity: identity });
  try { await atExecutionStage('E_CHECK_PUBLICATION', 'check-publication', () => upsertCheck(client, store, identity, outcome.report, outcome, renewLease)); }
  catch (error) { throw Object.assign(appError('E_CHECK_PUBLICATION'), { diagnostics: error.diagnostics, repairIdentity: identity }); }
  const history = await store.recordHistory(identity, historyProjection(outcome.report, outcome.observations));
  return { status: 'verified', policyId: outcome.plan.policyId, comparisonId: outcome.report.source.comparisonId, effectCount: outcome.changed, history: history.status };
}

async function consumeMessage(message, dependencies) {
  const envelope = readQueueEnvelope(typeof message.body === 'string' ? JSON.parse(message.body) : message.body);
  const accepted = await dependencies.store.claimDelivery(envelope);
  if (accepted.kind === 'duplicate') return message.ack();
  if (accepted.kind === 'active') return message.retry();
  if (envelope.type === 'lifecycle') {
    await dependencies.store.recordLifecycle(envelope);
    if (envelope.event === 'installation_repositories') await dependencies.store.reconcileRepositories(envelope.installationId, await dependencies.listInstallationRepositories(dependencies.env, envelope.installationId));
    await dependencies.store.finishLifecycle(envelope, accepted);
    return message.ack();
  }
  const execution = await dependencies.store.claimExecution(envelope, accepted);
  if (execution.kind === 'active') return message.retry();
  try {
    const result = await dependencies.execute(envelope, envelope.deliveryId, { ...dependencies, lease: execution });
    await dependencies.store.finish(envelope, execution, 'complete', result);
    return message.ack();
  } catch (error) {
    const disposition = failureDisposition(error), code = errorCode(error);
    if (disposition === 'retry') { await dependencies.store.retry(envelope, execution, code); return message.retry(); }
    await dependencies.store.finish(envelope, execution, disposition === 'rejected' ? 'rejected' : 'repair', { status: disposition, code, ...(disposition === 'repair' ? { repair: repairProjection(error) } : {}) });
    return message.ack();
  }
}

/** Cloudflare Worker adapter: ingress only acknowledges a verified, durable enqueue. */
export function createGitHubAppWorker(options = {}) {
  return {
    async fetch(request, env) {
      const url = new URL(request.url);
      if (request.method === 'GET' && url.pathname === '/health/ping') return response(200, { status: 'ok', service: 'diffdevil-github-app' });
      if (request.method === 'GET' && url.pathname === '/health/ready') {
        try { await (options.store ?? new D1AppStore(env.APP_DB)).readiness(); return response(200, { status: 'ready', service: 'diffdevil-github-app' }); }
        catch { return publicFailure(503, 'E_NOT_READY'); }
      }
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
      try { await env.APP_QUEUE.send(envelope); return response(202, { ok: true, status: 'enqueued' }); }
      catch { return publicFailure(503, 'E_ENQUEUE'); }
    },
    async queue(batch, env) {
      const dependencies = { env, store: options.store ?? new D1AppStore(env.APP_DB), execute: options.execute ?? executeDelivery, listInstallationRepositories: options.listInstallationRepositories ?? listInstallationRepositories, ...(options.clientFactory === undefined ? {} : { clientFactory: options.clientFactory }) };
      for (const message of batch.messages) {
        try { await consumeMessage(message, dependencies); }
        catch { message.retry(); }
      }
    },
    async scheduled(_controller, env, context) {
      const store = options.store ?? new D1AppStore(env.APP_DB);
      context.waitUntil(store.maintain());
    }
  };
}

export { APP_QUEUE_KIND };
