// SPDX-License-Identifier: AGPL-3.0-only

import { compilePolicy, explainPolicy, unwrap } from '@wolfsblvt/diffdevil';
import { GitHubClient, GitHubRequestError, applyGitHubPolicy, loadGitHubPolicy, readPullSnapshot } from '@wolfsblvt/diffdevil/github';
import { APP_QUEUE_KIND, WEBHOOK_BODY_LIMIT, WORKER_RESULT_LIMIT, historyProjection, normalizeWebhookEvent, readQueueEnvelope } from './contracts.mjs';
import { createAppJwt, verifyWebhookSignature } from './crypto.mjs';
import { D1AppStore } from './storage.mjs';
import { resolveEffectivePolicy } from './configuration.mjs';

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
const DEFAULT_SIZE_POLICY = {
  version: 1, presets: [], metrics: { review: { measure: 'lines.changed' } }, bands: { size: { value: 'metrics.review', minimum: 0, ranges: [{ id: 'xs', lt: 20 }, { id: 's', lt: 100 }, { id: 'm', lt: 500 }, { id: 'l', lt: 1000 }, { id: 'xl', otherwise: true }] } },
  labelGroups: { size: ['size/XS', 'size/S', 'size/M', 'size/L', 'size/XL', 'size/Unknown'] }, labelDefinitions: {
    'size/XS': { color: 'C2E0C6', description: '0–19 replacement-aware changed lines' }, 'size/S': { color: 'BFDADC', description: '20–99 replacement-aware changed lines' }, 'size/M': { color: 'C5DEF5', description: '100–499 replacement-aware changed lines' }, 'size/L': { color: 'D4C5F9', description: '500–999 replacement-aware changed lines' }, 'size/XL': { color: 'DCC6E0', description: '1,000 or more replacement-aware changed lines' }, 'size/Unknown': { color: 'D1D5DB', description: 'Available evidence cannot establish one size band' }
  }, rules: { size: { band: 'size', onUnknown: 'hold', effects: { labels: { group: 'size', byBand: { xs: 'size/XS', s: 'size/S', m: 'size/M', l: 'size/L', xl: 'size/XL' }, unknown: 'size/Unknown' } } } }
};

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
function errorCode(error) { return error instanceof GitHubRequestError ? error.code : typeof error?.code === 'string' ? error.code : 'E_APP_EXECUTION'; }
function failureDisposition(error) {
  const code = errorCode(error);
  if (code === 'E_GITHUB_RATE_LIMIT' || code === 'E_LEASE_LOST') return 'retry';
  if (['E_PULL_REQUEST_CLOSED', 'E_CHECK_STALE', 'E_ACCESS_DISABLED'].includes(code)) return 'rejected';
  return 'repair';
}
function appError(code) { return Object.assign(new Error(code), { code }); }

/** A repository-scoped credential is minted only after a delivery and execution lease are claimed. */
export async function createInstallationClient(env, installationId, repositoryId, options = {}) {
  const jwt = await (options.createJwt ?? createAppJwt)({ appId: env.GITHUB_APP_ID, privateKey: env.GITHUB_APP_PRIVATE_KEY, ...(options.now === undefined ? {} : { now: options.now }) });
  const app = new GitHubClient({ token: jwt, ...(options.fetch === undefined ? {} : { fetch: options.fetch }), responseBytes: WORKER_RESULT_LIMIT, readRetries: 0 });
  const token = await app.json(`/app/installations/${installationId}/access_tokens`, { method: 'POST', phase: 'apply', body: { repository_ids: [repositoryId], permissions: { contents: 'read', pull_requests: 'write', checks: 'write' } } });
  if (!token || typeof token !== 'object' || typeof token.token !== 'string' || token.token.length === 0 || typeof token.expires_at !== 'string' || !Number.isFinite(Date.parse(token.expires_at)) || Date.parse(token.expires_at) <= Date.now()) throw new TypeError('GitHub returned an invalid installation token response.');
  return new GitHubClient({ token: token.token, ...(options.fetch === undefined ? {} : { fetch: options.fetch }), responseBytes: WORKER_RESULT_LIMIT, readRetries: 0 });
}

async function repositoryTarget(client, envelope) {
  const repository = await client.json(`/repositories/${envelope.repositoryId}`);
  if (!repository || typeof repository !== 'object' || repository.id !== envelope.repositoryId || typeof repository.full_name !== 'string') throw new TypeError('GitHub repository identity did not match the admitted delivery.');
  return { repository: repository.full_name, pullRequest: envelope.pullRequest };
}

async function trustedPolicy(client, target, base, configuration) {
  try {
    const ordinary = unwrap(await loadGitHubPolicy(client, { repository: target.repository, ref: base, path: '.diffdevil.yml' }));
    const policy = configuration ? resolveEffectivePolicy({ ...configuration, supplied: explainPolicy(ordinary).document }).policy : ordinary;
    return { policy, expectedPolicyBase: base };
  }
  catch (error) {
    if (error instanceof GitHubRequestError && error.status === 404) return { policy: unwrap(compilePolicy(DEFAULT_SIZE_POLICY)), expectedPolicyBase: base };
    throw error;
  }
}

function checkSummary(report, result) {
  const changed = report.totals?.lines?.changed?.value;
  const raw = report.totals?.raw?.churn?.value;
  return `Replacement-aware changed lines: ${Number.isSafeInteger(changed) ? changed : 'unavailable'}\nRaw churn: ${Number.isSafeInteger(raw) ? raw : 'unavailable'}\nPolicy effects observed: ${result.changed}`;
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
  await store.assertLease(envelope, lease);
  const client = await clientFactory(env, envelope.installationId, envelope.repositoryId);
  const target = await repositoryTarget(client, envelope);
  const snapshot = await readPullSnapshot(client, target);
  if (snapshot.state !== 'open') throw appError('E_PULL_REQUEST_CLOSED');
  const configuration = await store.repositoryConfiguration(envelope.repositoryId);
  const policy = await trustedPolicy(client, target, snapshot.base, configuration?.value);
  const provisionalIdentity = { repositoryId: envelope.repositoryId, pullRequest: envelope.pullRequest, repository: target.repository, head: snapshot.head, policyId: policy.policy.id };
  await assertRerequest(client, store, envelope, provisionalIdentity, Number(env.GITHUB_APP_ID));
  const outcome = unwrap(await applyGitHubPolicy(client, target, policy.policy, { definitions: 'ensure', commentAuthor: { login: env.GITHUB_APP_BOT_LOGIN ?? 'diffdevil[bot]' }, occasionId: deliveryId, expectedPolicyBase: policy.expectedPolicyBase,
    beforeWrite: () => store.assertLease(envelope, lease) }));
  const identity = { ...provisionalIdentity, comparisonId: outcome.report.source.comparisonId, appId: Number(env.GITHUB_APP_ID) };
  if (outcome.status !== 'verified') throw Object.assign(appError('E_EFFECT_INCOMPLETE'), { diagnostics: outcome.diagnostics });
  try { await upsertCheck(client, store, identity, outcome.report, outcome, () => store.assertLease(envelope, lease)); }
  catch (error) { throw Object.assign(appError('E_CHECK_PUBLICATION'), { cause: error }); }
  const settings = await store.historySettings(envelope.repositoryId);
  const history = await store.recordHistory(identity, historyProjection(outcome.report, outcome.observations), settings);
  return { status: 'verified', policyId: outcome.plan.policyId, comparisonId: outcome.report.source.comparisonId, effectCount: outcome.changed, history: history.status };
}

async function consumeMessage(message, dependencies) {
  const envelope = readQueueEnvelope(typeof message.body === 'string' ? JSON.parse(message.body) : message.body);
  const accepted = await dependencies.store.claimDelivery(envelope);
  if (accepted.kind === 'duplicate') return message.ack();
  if (accepted.kind === 'active') return message.retry();
  if (envelope.type === 'lifecycle') { await dependencies.store.recordLifecycle(envelope); await dependencies.store.finishLifecycle(envelope, accepted); return message.ack(); }
  const execution = await dependencies.store.claimExecution(envelope, accepted);
  if (execution.kind === 'active') return message.retry();
  try {
    const result = await dependencies.execute(envelope, envelope.deliveryId, { ...dependencies, lease: execution });
    await dependencies.store.finish(envelope, execution, 'complete', result);
    return message.ack();
  } catch (error) {
    const disposition = failureDisposition(error), code = errorCode(error);
    if (disposition === 'retry') { await dependencies.store.retry(envelope, execution, code); return message.retry(); }
    await dependencies.store.finish(envelope, execution, disposition === 'rejected' ? 'rejected' : 'repair', { status: disposition, code });
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
      const dependencies = { env, store: options.store ?? new D1AppStore(env.APP_DB), execute: options.execute ?? executeDelivery, ...(options.clientFactory === undefined ? {} : { clientFactory: options.clientFactory }) };
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
