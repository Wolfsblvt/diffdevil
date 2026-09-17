// SPDX-License-Identifier: AGPL-3.0-only

import { GitHubClient, GitHubRequestError, applyGitHubPolicy, compilePolicy, loadGitHubPolicy, unwrap } from '../../dist/lib/index.js';
import { readPullSnapshot } from '../../dist/lib/github/source.js';
import { APP_QUEUE_KIND, WEBHOOK_BODY_LIMIT, WORKER_RESULT_LIMIT, historyProjection, normalizeWebhookEvent, readQueueEnvelope } from './contracts.mjs';
import { createAppJwt, verifyWebhookSignature } from './crypto.mjs';
import { D1AppStore } from './storage.mjs';

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
function errorCode(error) { return error instanceof GitHubRequestError ? error.status === 401 || error.status === 403 ? 'E_ACCESS_REVOKED' : error.code : typeof error?.code === 'string' ? error.code : 'E_APP_EXECUTION'; }
function isTerminal(error) { return ['E_ACCESS_REVOKED', 'E_PULL_REQUEST_CLOSED'].includes(errorCode(error)); }
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

async function trustedPolicy(client, target, base) {
  try { return { policy: unwrap(await loadGitHubPolicy(client, { repository: target.repository, ref: base, path: '.diffdevil.yml' })), expectedPolicyBase: base }; }
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

async function upsertCheck(client, store, identity, report, result) {
  const previous = await store.check(identity);
  const output = { title: 'diffdevil analysis', summary: checkSummary(report, result) };
  const body = { name: 'diffdevil', head_sha: identity.head, status: 'completed', conclusion: result.status === 'verified' ? 'success' : 'neutral', output };
  const route = previous?.check_run_id ? `/repos/${identity.repository}/check-runs/${previous.check_run_id}` : `/repos/${identity.repository}/check-runs`;
  const value = await client.json(route, { method: previous?.check_run_id ? 'PATCH' : 'POST', phase: 'apply', body });
  if (!value || typeof value !== 'object' || !Number.isSafeInteger(value.id)) throw new TypeError('GitHub did not return a usable App-owned check run.');
  await store.recordCheck(identity, value.id);
}

/** Execute the reusable engine against fresh provider facts; queue payloads never become trusted policy or source data. */
export async function executeDelivery(envelope, deliveryId, { env, store, clientFactory = createInstallationClient }) {
  const client = await clientFactory(env, envelope.installationId, envelope.repositoryId);
  const target = await repositoryTarget(client, envelope);
  const snapshot = await readPullSnapshot(client, target);
  if (snapshot.state !== 'open') throw appError('E_PULL_REQUEST_CLOSED');
  const policy = await trustedPolicy(client, target, snapshot.base);
  const outcome = unwrap(await applyGitHubPolicy(client, target, policy.policy, { definitions: 'ensure', commentAuthor: { login: env.GITHUB_APP_BOT_LOGIN ?? 'diffdevil[bot]' }, occasionId: deliveryId, expectedPolicyBase: policy.expectedPolicyBase }));
  const identity = { repositoryId: envelope.repositoryId, pullRequest: envelope.pullRequest, repository: target.repository, head: snapshot.head, policyId: outcome.plan.policyId, comparisonId: outcome.report.source.comparisonId };
  await upsertCheck(client, store, identity, outcome.report, outcome);
  // History is opt-in. This source keeps an allowlisted projection only when a future dashboard turns it on.
  const settings = await store.statement('SELECT history_enabled, retention_days FROM repositories WHERE repository_id=?', envelope.repositoryId).first();
  if (settings?.history_enabled === 1) await store.recordHistory(identity, historyProjection(outcome.report, outcome.observations), settings.retention_days === null ? null : Number(settings.retention_days));
  return { status: outcome.status, policyId: outcome.plan.policyId, comparisonId: outcome.report.source.comparisonId, effectCount: outcome.changed };
}

async function consumeMessage(message, dependencies) {
  const envelope = readQueueEnvelope(typeof message.body === 'string' ? JSON.parse(message.body) : message.body);
  const accepted = await dependencies.store.claimDelivery(envelope, envelope.deliveryId);
  if (accepted === 'duplicate') return message.ack();
  if (accepted === 'active') return message.retry();
  if (envelope.type === 'lifecycle') { await dependencies.store.recordLifecycle(envelope); return message.ack(); }
  const execution = await dependencies.store.claimExecution(envelope, envelope.deliveryId);
  if (execution === 'active') return message.retry();
  try {
    const result = await dependencies.execute(envelope, envelope.deliveryId, dependencies);
    await dependencies.store.complete(envelope, envelope.deliveryId, result);
    return message.ack();
  } catch (error) {
    if (isTerminal(error)) { await dependencies.store.terminal(envelope, envelope.deliveryId, errorCode(error)); return message.ack(); }
    throw error;
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
      const body = await request.arrayBuffer();
      if (body.byteLength > WEBHOOK_BODY_LIMIT) return publicFailure(413, 'E_BODY_LIMIT');
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
    }
  };
}

export { APP_QUEUE_KIND };
