// SPDX-License-Identifier: AGPL-3.0-only

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHmac } from 'node:crypto';
import { createGitHubAppWorker, createInstallationClient } from './app.mjs';
import { APP_QUEUE_KIND, WEBHOOK_BODY_LIMIT, WORKER_RESULT_LIMIT, historyProjection, normalizeWebhookEvent } from './contracts.mjs';
import { constantTimeEqual } from './crypto.mjs';

const secret = 'fixture-webhook-secret';
const payload = { action: 'opened', installation: { id: 9 }, repository: { id: 17, full_name: 'example/repository' }, pull_request: { number: 42 } };
const signedRequest = (body = JSON.stringify(payload), extra = {}) => new Request('https://app.example/webhooks/github', {
  method: 'POST', body, headers: { 'x-github-event': 'pull_request', 'x-github-delivery': 'delivery-1', 'x-hub-signature-256': `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`, ...extra }
});

test('webhook verifies raw bytes before parsing and queues only the minimized selected envelope', async () => {
  const queued = [];
  const worker = createGitHubAppWorker();
  const response = await worker.fetch(signedRequest(), { GITHUB_WEBHOOK_SECRET: secret, APP_QUEUE: { async send(value) { queued.push(value); } } });
  assert.equal(response.status, 202);
  assert.deepEqual(queued, [{ kind: APP_QUEUE_KIND, version: 1, type: 'pull-request', event: 'pull_request', action: 'opened', installationId: 9, repositoryId: 17, pullRequest: 42, deliveryId: 'delivery-1', receivedAt: queued[0].receivedAt }]);
  assert.equal(JSON.stringify(queued[0]).includes('full_name'), false);
});

test('webhook rejects invalid signatures, invalid JSON and oversized bodies without queueing', async () => {
  const queued = [], env = { GITHUB_WEBHOOK_SECRET: secret, APP_QUEUE: { async send(value) { queued.push(value); } } }, worker = createGitHubAppWorker();
  const invalid = await worker.fetch(signedRequest(JSON.stringify(payload), { 'x-hub-signature-256': 'sha256=00' }), env);
  assert.equal(invalid.status, 401);
  const malformedBody = '{';
  const malformed = await worker.fetch(new Request('https://app.example/webhooks/github', { method: 'POST', body: malformedBody, headers: { 'x-github-event': 'pull_request', 'x-github-delivery': 'delivery-malformed', 'x-hub-signature-256': `sha256=${createHmac('sha256', secret).update(malformedBody).digest('hex')}` } }), env);
  assert.equal(malformed.status, 400);
  const oversized = new Request('https://app.example/webhooks/github', { method: 'POST', body: 'x'.repeat(WEBHOOK_BODY_LIMIT + 1), headers: { 'content-length': String(WEBHOOK_BODY_LIMIT + 1), 'x-github-event': 'pull_request', 'x-github-delivery': 'delivery-2' } });
  assert.equal((await worker.fetch(oversized, env)).status, 413);
  assert.equal(queued.length, 0);
});

test('valid but unselected events are deliberately ignored after authentication', async () => {
  const body = JSON.stringify({ action: 'created', installation: { id: 9 }, repository: { id: 17 } });
  const request = new Request('https://app.example/webhooks/github', { method: 'POST', body, headers: { 'x-github-event': 'issues', 'x-github-delivery': 'delivery-3', 'x-hub-signature-256': `sha256=${createHmac('sha256', secret).update(body).digest('hex')}` } });
  const response = await createGitHubAppWorker().fetch(request, { GITHUB_WEBHOOK_SECRET: secret, APP_QUEUE: { async send() { throw new Error('must not enqueue'); } } });
  assert.deepEqual(await response.json(), { ok: true, status: 'ignored' });
});

test('queue execution holds a same-PR active lease and records a completed execution once', async () => {
  const calls = [], store = {
    async claimDelivery() { return 'claimed'; }, async claimExecution() { return 'claimed'; },
    async complete(envelope, deliveryId, result) { calls.push({ envelope, deliveryId, result }); }, async terminal() { throw new Error('unexpected terminal'); }
  };
  const message = { id: 'queue-transport-id', body: normalizeWebhookEvent('pull_request', payload, new Date().toISOString(), 'delivery-1'), ack() { calls.push('ack'); }, retry() { calls.push('retry'); } };
  await createGitHubAppWorker({ store, async execute() { return { status: 'verified', policyId: 'policy', comparisonId: 'comparison', effectCount: 2 }; } }).queue({ messages: [message] }, {});
  assert.equal(calls.at(-1), 'ack');
  assert.equal(calls[0].deliveryId, 'delivery-1');
  assert.equal(calls[0].result.effectCount, 2);
  const active = { ...store, async claimExecution() { return 'active'; } }, retries = [];
  await createGitHubAppWorker({ store: active, async execute() { throw new Error('must not execute'); } }).queue({ messages: [{ ...message, retry() { retries.push(true); } }] }, {});
  assert.equal(retries.length, 1);
});

test('history projection preserves numeric evidence and rejects contextual source fields by construction', () => {
  const projection = historyProjection({ measurement: { status: 'exact' }, fileSet: { complete: false, total: { status: 'exact', value: 2 } }, totals: { raw: { added: { status: 'exact', value: 3 }, deleted: { status: 'exact', value: 2 }, churn: { status: 'exact', value: 5 } }, lines: { added: { status: 'exact', value: 1 }, deleted: { status: 'exact', value: 0 }, modified: { status: 'exact', value: 2 }, changed: { status: 'exact', value: 3 } } }, files: [{ path: 'private/file.ts', author: 'not-retained' }] }, [{ outcome: 'changed', target: 'label' }]);
  assert.equal(JSON.stringify(projection).includes('private/file.ts'), false);
  assert.equal(JSON.stringify(projection).includes('not-retained'), false);
  assert.equal(projection.totals.lines.changed.value, 3);
  assert.equal(constantTimeEqual(new Uint8Array([1]), new Uint8Array([1])), true);
  assert.equal(constantTimeEqual(new Uint8Array([1]), new Uint8Array([1, 0])), false);
});

test('queue envelopes reject payload fields that could smuggle contextual data across the durable boundary', async () => {
  const retries = [];
  const message = { id: 'queue-id', body: { ...normalizeWebhookEvent('pull_request', payload, new Date().toISOString(), 'delivery-4'), repository: 'example/private' }, ack() { throw new Error('unexpected acknowledgement'); }, retry() { retries.push(true); } };
  await createGitHubAppWorker({ store: {} }).queue({ messages: [message] }, {});
  assert.equal(retries.length, 1);
});

test('installation execution mints one repository-confined token and keeps the Worker response budget bounded', async () => {
  const requests = [];
  const fetch = async (url, init) => {
    requests.push({ url: String(url), headers: new Headers(init.headers), body: init.body });
    return new Response(JSON.stringify({ token: 'installation-token', expires_at: new Date(Date.now() + 60_000).toISOString() }), { status: 201 });
  };
  const client = await createInstallationClient({ GITHUB_APP_ID: '123', GITHUB_APP_PRIVATE_KEY: 'not-used-by-fixture' }, 9, 17, { createJwt: async () => 'app-jwt', fetch });
  assert.equal(client.responseBytes, WORKER_RESULT_LIMIT);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url.endsWith('/app/installations/9/access_tokens'), true);
  assert.equal(requests[0].headers.get('authorization'), 'Bearer app-jwt');
  assert.deepEqual(JSON.parse(requests[0].body), { repository_ids: [17], permissions: { contents: 'read', pull_requests: 'write', checks: 'write' } });
});
