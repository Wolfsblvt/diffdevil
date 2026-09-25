// SPDX-License-Identifier: AGPL-3.0-only

import assert from 'node:assert/strict';
import { createHmac, createVerify, generateKeyPairSync } from 'node:crypto';
import { test } from 'node:test';
import { GitHubClient, GitHubRequestError } from '@wolfsblvt/diffdevil/github';
import { createGitHubAppWorker, createInstallationClient, listInstallationRepositories } from './app.mjs';
import { APP_QUEUE_KIND, WEBHOOK_BODY_LIMIT, WORKER_RESULT_LIMIT, historyProjection, normalizeWebhookEvent } from './contracts.mjs';
import { constantTimeEqual, createAppJwt } from './crypto.mjs';
import { resolveEffectivePolicy } from './configuration.mjs';
import { FakeGitHub } from '../../src/diffdevil/tests/helpers/github.mjs';

const secret = 'fixture-webhook-secret';
const payload = { action: 'opened', installation: { id: 9 }, repository: { id: 17 }, pull_request: { number: 42 } };
const envelope = () => normalizeWebhookEvent('pull_request', payload, new Date().toISOString(), 'delivery-1');
const signedRequest = (body = JSON.stringify(payload), extra = {}) => new Request('https://app.example/webhooks/github', {
  method: 'POST', body, headers: { 'x-github-event': 'pull_request', 'x-github-delivery': 'delivery-1', 'x-hub-signature-256': `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`, ...extra }
});

function queueMessage(body = envelope()) {
  const calls = [];
  return { calls, message: { id: 'transport', body, ack() { calls.push('ack'); }, retry() { calls.push('retry'); } } };
}
function activeStore(calls) {
  const delivery = { kind: 'claimed', attemptId: 'attempt-a', fence: 3 };
  const lease = { kind: 'claimed', ...delivery, executionFence: 4, leaseUntil: '2030-01-01T00:01:00.000Z' };
  return {
    async claimDelivery() { calls.push('delivery'); return delivery; },
    async claimExecution(_envelope, candidate) { calls.push(['execution', candidate]); return lease; },
    async executionAllowed() { return true; },
    async renewLease() { return lease; },
    async assertLease() {},
    async finish(_envelope, candidate, state, result) { calls.push(['finish', candidate, state, result]); },
    async retry(_envelope, candidate, code) { calls.push(['retry-state', candidate, code]); },
    async recordLifecycle() { calls.push('lifecycle'); },
    async finishLifecycle() { calls.push('lifecycle-finish'); }
  };
}
function policyStore(calls, configuration = { repository: { presets: [] } }) {
  return {
    ...activeStore(calls),
    async repositoryConfiguration() { return { value: configuration }; },
    async check() { return undefined; },
    async recordCheck() {},
    async recordHistory() { return { status: 'disabled' }; }
  };
}
async function runPolicyDelivery(fake, configuration) {
  const run = queueMessage();
  const fetch = async (input, init) => new URL(String(input)).pathname === '/repositories/17'
    ? new Response(JSON.stringify({ id: 17, full_name: 'example/repository' }), { headers: { 'content-type': 'application/json' } })
    : fake.fetch(input, init);
  await createGitHubAppWorker({ store: policyStore(run.calls, configuration), clientFactory: async () => new GitHubClient({ fetch, readRetries: 0 }) }).queue({ messages: [run.message] }, {});
  return run;
}

test('webhook verifies streamed raw bytes and queues only a minimized selected envelope', async () => {
  const queued = [];
  const response = await createGitHubAppWorker().fetch(signedRequest(), { GITHUB_WEBHOOK_SECRET: secret, APP_QUEUE: { async send(value) { queued.push(value); } } });
  assert.equal(response.status, 202);
  assert.deepEqual(queued, [{ kind: APP_QUEUE_KIND, version: 1, type: 'pull-request', event: 'pull_request', action: 'opened', installationId: 9, repositoryId: 17, pullRequest: 42, deliveryId: 'delivery-1', receivedAt: queued[0].receivedAt }]);
  assert.equal(JSON.stringify(queued[0]).includes('full_name'), false);
});

test('streaming ingress enforces the byte ceiling even when content length is absent', async () => {
  const body = 'x'.repeat(WEBHOOK_BODY_LIMIT + 1);
  const request = new Request('https://app.example/webhooks/github', { method: 'POST', body, headers: { 'x-github-event': 'pull_request', 'x-github-delivery': 'delivery-large' } });
  const response = await createGitHubAppWorker().fetch(request, { GITHUB_WEBHOOK_SECRET: secret, APP_QUEUE: { async send() { throw new Error('must not enqueue'); } } });
  assert.equal(response.status, 413);
});

test('ordinary GitHub PKCS#1 App keys mint a verifiable RS256 JWT and reject other key shapes', async () => {
  const pair = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const privateKey = pair.privateKey.export({ type: 'pkcs1', format: 'pem' });
  const jwt = await createAppJwt({ appId: '123', privateKey, now: () => 1_700_000_000_000 });
  const [header, claims, signature] = jwt.split('.');
  const verifier = createVerify('RSA-SHA256'); verifier.update(`${header}.${claims}`); verifier.end();
  assert.equal(verifier.verify(pair.publicKey, Buffer.from(signature, 'base64url')), true);
  await assert.rejects(createAppJwt({ appId: '123', privateKey: pair.privateKey.export({ type: 'pkcs8', format: 'pem' }) }), { code: 'E_APP_PRIVATE_KEY' });
  assert.equal(constantTimeEqual(new Uint8Array([1]), new Uint8Array([1, 0])), false);
});

test('a fenced execution finishes only after verified work, while incomplete effects become repair work', async () => {
  const first = queueMessage(), firstStore = activeStore(first.calls);
  await createGitHubAppWorker({ store: firstStore, async execute(_envelope, _delivery, dependencies) { assert.equal(dependencies.lease.fence, 3); return { status: 'verified', policyId: 'policy', comparisonId: 'comparison', effectCount: 2 }; } }).queue({ messages: [first.message] }, {});
  assert.equal(first.calls.at(-1), 'ack');
  assert.equal(first.calls.find(call => Array.isArray(call) && call[0] === 'finish')[2], 'complete');

  const second = queueMessage(), secondStore = activeStore(second.calls);
  await createGitHubAppWorker({ store: secondStore, async execute() { throw Object.assign(new Error('effect ambiguous'), { code: 'E_EFFECT_INCOMPLETE', observations: [{ kind: 'label.add', outcome: 'acknowledged', request: 'accepted', readback: 'unknown' }] }); } }).queue({ messages: [second.message] }, {});
  assert.equal(second.calls.at(-1), 'ack');
  const repair = second.calls.find(call => Array.isArray(call) && call[0] === 'finish');
  assert.equal(repair[2], 'repair');
  assert.deepEqual(repair[3].repair.projection.observations, [{ kind: 'label.add', outcome: 'acknowledged', request: 'accepted', readback: 'unknown' }]);

  const third = queueMessage(), thirdStore = activeStore(third.calls);
  await createGitHubAppWorker({ store: thirdStore, async execute() { throw Object.assign(new Error('check ambiguous'), { code: 'E_CHECK_PUBLICATION', repairIdentity: { repositoryId: 17, pullRequest: 42, base: 'base', head: 'head', policyId: 'policy', comparisonId: 'comparison' } }); } }).queue({ messages: [third.message] }, {});
  const checkRepair = third.calls.find(call => Array.isArray(call) && call[0] === 'finish');
  assert.equal(checkRepair[3].repair.kind, 'check-publication');
  assert.deepEqual(checkRepair[3].repair.identity, { repositoryId: 17, pullRequest: 42, base: 'base', head: 'head', policyId: 'policy', comparisonId: 'comparison' });
});

test('rate limiting releases a fenced attempt for retry instead of calling it revoked', async () => {
  const run = queueMessage(), store = activeStore(run.calls);
  await createGitHubAppWorker({ store, async execute() { throw Object.assign(new Error('rate'), { code: 'E_GITHUB_RATE_LIMIT' }); } }).queue({ messages: [run.message] }, {});
  assert.equal(run.calls.at(-1), 'retry');
  assert.equal(run.calls.find(call => Array.isArray(call) && call[0] === 'retry-state')[2], 'E_GITHUB_RATE_LIMIT');
});

test('pre-effect App failures retain a safe stable stage in their repair projection', async () => {
  const run = queueMessage(), store = activeStore(run.calls);
  await createGitHubAppWorker({ store, clientFactory: async () => { throw new TypeError('provider response details must not be retained'); } }).queue({ messages: [run.message] }, {});
  const repair = run.calls.find(call => Array.isArray(call) && call[0] === 'finish');
  assert.equal(repair[3].code, 'E_APP_INSTALLATION_CREDENTIAL');
  assert.deepEqual(repair[3].repair.projection.diagnostics, [{ code: 'E_APP_INSTALLATION_CREDENTIAL', phase: 'installation-credential' }]);
  assert.equal(JSON.stringify(repair[3]).includes('provider response details'), false);
});

test('provider failures retain their stable code and execution phase in repair state', async () => {
  const run = queueMessage(), store = activeStore(run.calls);
  await createGitHubAppWorker({ store, clientFactory: async () => { throw new GitHubRequestError(403, false, 'provider detail must not be retained', 'apply'); } }).queue({ messages: [run.message] }, {});
  const repair = run.calls.find(call => Array.isArray(call) && call[0] === 'finish');
  assert.equal(repair[3].code, 'E_GITHUB_PERMISSION');
  assert.deepEqual(repair[3].repair.projection.diagnostics, [{ code: 'E_GITHUB_PERMISSION', phase: 'installation-credential' }]);
  assert.equal(JSON.stringify(repair[3]).includes('provider detail'), false);
});

test('real GitHub rate-limit errors release the execution lease for retry', async () => {
  const run = queueMessage(), store = activeStore(run.calls);
  await createGitHubAppWorker({ store, clientFactory: async () => { throw new GitHubRequestError(429, false, 'rate limit detail must not be retained', 'apply', true); } }).queue({ messages: [run.message] }, {});
  assert.equal(run.calls.at(-1), 'retry');
  assert.equal(run.calls.find(call => Array.isArray(call) && call[0] === 'retry-state')[2], 'E_GITHUB_RATE_LIMIT');
  assert.equal(JSON.stringify(run.calls).includes('rate limit detail'), false);
});

test('an absent trusted-base configuration uses the default policy only after repository and pull-base reads', async () => {
  const fake = new FakeGitHub();
  fake.before = async call => call.method === 'POST' && call.path === '/repos/example/repository/check-runs'
    ? new Response(JSON.stringify({ id: 7 }), { status: 201, headers: { 'content-type': 'application/json' } })
    : undefined;
  const run = await runPolicyDelivery(fake);
  const finish = run.calls.find(call => Array.isArray(call) && call[0] === 'finish');
  const paths = fake.calls.map(call => call.path);
  const policyRead = paths.indexOf('/repos/example/repository/contents/.diffdevil.yml');
  assert.equal(finish[2], 'complete');
  assert.equal(paths.indexOf('/repos/example/repository') < policyRead, true);
  assert.equal(paths.indexOf('/repos/example/repository/pulls/42') < policyRead, true);
  assert.deepEqual(fake.writes().map(call => call.path), ['/repos/example/repository/check-runs']);
});

test('a non-404 trusted-policy failure preserves its provider diagnostic in a neutral check', async () => {
  const fake = new FakeGitHub();
  fake.before = async call => {
    if (call.path === '/repos/example/repository/contents/.diffdevil.yml') return new Response(JSON.stringify({ message: 'private provider detail' }), { status: 403, headers: { 'content-type': 'application/json' } });
    if (call.method === 'POST' && call.path === '/repos/example/repository/check-runs') return new Response(JSON.stringify({ id: 8 }), { status: 201, headers: { 'content-type': 'application/json' } });
    return undefined;
  };
  const run = await runPolicyDelivery(fake);
  const repair = run.calls.find(call => Array.isArray(call) && call[0] === 'finish');
  assert.equal(repair[3].code, 'E_GITHUB_PERMISSION');
  assert.deepEqual(repair[3].repair.projection.diagnostics, [{ code: 'E_GITHUB_PERMISSION', phase: 'trusted-policy' }]);
  assert.equal(JSON.stringify(repair[3]).includes('private provider detail'), false);
  assert.deepEqual(fake.writes().map(call => call.path), ['/repos/example/repository/check-runs']);
});

test('a transient trusted-policy provider failure never defaults into policy effects', async () => {
  const fake = new FakeGitHub();
  fake.before = async call => {
    if (call.path === '/repos/example/repository/contents/.diffdevil.yml') return new Response(JSON.stringify({ message: 'private provider detail' }), { status: 502, headers: { 'content-type': 'application/json' } });
    if (call.method === 'POST' && call.path === '/repos/example/repository/check-runs') return new Response(JSON.stringify({ id: 8 }), { status: 201, headers: { 'content-type': 'application/json' } });
    return undefined;
  };
  const run = await runPolicyDelivery(fake);
  const repair = run.calls.find(call => Array.isArray(call) && call[0] === 'finish');
  assert.equal(repair[3].code, 'E_GITHUB_REQUEST');
  assert.deepEqual(repair[3].repair.projection.diagnostics, [{ code: 'E_GITHUB_REQUEST', phase: 'trusted-policy' }]);
  assert.equal(JSON.stringify(repair[3]).includes('private provider detail'), false);
  assert.deepEqual(fake.writes().map(call => call.path), ['/repos/example/repository/check-runs']);
});

test('an unexpected trusted-policy failure creates a neutral diagnostic check without provider detail', async () => {
  const fake = new FakeGitHub();
  fake.before = async call => call.method === 'POST' && call.path === '/repos/example/repository/check-runs'
    ? new Response(JSON.stringify({ id: 8 }), { status: 201, headers: { 'content-type': 'application/json' } })
    : undefined;
  const run = await runPolicyDelivery(fake, { repository: { presets: 'not-an-array' } });
  const repair = run.calls.find(call => Array.isArray(call) && call[0] === 'finish');
  assert.equal(repair[3].code, 'E_APP_REPOSITORY_CONFIGURATION');
  assert.deepEqual(repair[3].repair.projection.diagnostics, [{ code: 'E_APP_REPOSITORY_CONFIGURATION', phase: 'repository-configuration' }]);
  assert.equal(JSON.stringify(repair[3]).includes('not-an-array'), false);
  assert.deepEqual(fake.writes().map(call => call.path), ['/repos/example/repository/check-runs']);
  assert.match(fake.writes()[0].body.output.summary, /E_APP_REPOSITORY_CONFIGURATION/);
  assert.match(fake.writes()[0].body.output.summary, /stored repository configuration/);
});

test('lifecycle deltas reconcile the current provider-selected repository identities before completion', async () => {
  const lifecycle = normalizeWebhookEvent('installation_repositories', { action: 'added', installation: { id: 9 }, repositories_added: [{ id: 17 }, { id: 18 }] }, new Date().toISOString(), 'lifecycle-1');
  const run = queueMessage(lifecycle), store = activeStore(run.calls);
  store.reconcileRepositories = async (installationId, repositoryIds) => run.calls.push(['reconcile', installationId, repositoryIds]);
  await createGitHubAppWorker({ store, async listInstallationRepositories() { return [17, 19]; } }).queue({ messages: [run.message] }, {});
  assert.deepEqual(lifecycle.addedRepositories, [17, 18]);
  assert.deepEqual(lifecycle.removedRepositories, []);
  assert.deepEqual(run.calls.slice(-4), ['lifecycle', ['reconcile', 9, [17, 19]], 'lifecycle-finish', 'ack']);
});

test('installation creation retains its selected numeric repository identities in the minimized lifecycle envelope', () => {
  const lifecycle = normalizeWebhookEvent('installation', { action: 'created', installation: { id: 9 }, repositories: [{ id: 17 }, { id: 18, full_name: 'not-retained' }] }, new Date().toISOString(), 'installation-1');
  assert.deepEqual(lifecycle.addedRepositories, [17, 18]);
  assert.deepEqual(lifecycle.removedRepositories, []);
  assert.equal(JSON.stringify(lifecycle).includes('full_name'), false);
});

test('history projection is versioned, quantitative, pathless, and keeps provider request/readback standing', () => {
  const report = { source: { base: 'abc', head: 'def', comparisonId: 'comparison-1', repository: 'secret/repo' },
    author: { login: 'secret-person' }, title: 'secret PR prose', patch: 'secret patch',
    measurement: { status: 'exact' }, fileSet: { complete: false, total: { status: 'exact', value: 2 } },
    totals: { raw: { added: { status: 'exact', value: 3 }, deleted: { status: 'exact', value: 2 }, churn: { status: 'exact', value: 5 } },
      lines: { added: { status: 'exact', value: 1 }, deleted: { status: 'exact', value: 0 }, modified: { status: 'exact', value: 2 }, changed: { status: 'exact', value: 3 } } },
    metrics: { review: { status: 'exact', value: 3.5 }, 'secret/path': { status: 'exact', value: 9 } },
    scopes: { production: { fileSet: { complete: false, total: { status: 'bounded', minimum: 1, maximum: 2 } }, totals: { lines: { changed: { status: 'exact', value: 3 } }, fileIds: ['private/file.ts'] } } },
    bands: { size: { status: 'resolved', id: 'small', name: 'secret-label' } },
    rules: { size: { disposition: 'matched', band: { id: 'small' }, template: 'secret-template' } },
    files: [{ path: 'private/file.ts', oldPath: 'private/old.ts', included: true, lines: { changed: { status: 'exact', value: 3 } } }] };
  const projection = historyProjection(report, [{ kind: 'label.add', subject: 'private label', outcome: 'changed', request: 'acknowledged', readback: 'verified', error: 'secret error' }]);
  assert.equal(projection.schemaVersion, 4);
  assert.equal(JSON.stringify(projection).includes('private/file.ts'), false);
  assert.equal(JSON.stringify(projection).includes('private label'), false);
  for (const forbidden of ['secret-person', 'secret PR prose', 'secret patch', 'private/old.ts', 'secret/path', 'secret-label', 'secret-template', 'secret error', 'secret/repo'])
    assert.equal(JSON.stringify(projection).includes(forbidden), false, forbidden);
  assert.equal(projection.files[0].ordinal, 0);
  assert.equal(projection.publication.state, 'complete');
  assert.deepEqual(projection.configuredResults, [{ metric: 'review', result: { status: 'exact', value: 3.5 } }]);
  assert.equal(projection.files[0].inclusion, 'included');
  assert.equal(projection.scopes[0].ref, 'production');
  assert.equal(projection.rules[0].disposition, 'matched');
  assert.deepEqual(projection.effects[0], { kind: 'label.add', rule: undefined, band: undefined, desired: undefined, outcome: 'changed', request: 'acknowledged', readback: 'verified' });
});

test('installation credentials remain repository-confined and response bounded', async () => {
  const requests = [];
  const client = await createInstallationClient({ GITHUB_APP_ID: '123', GITHUB_APP_PRIVATE_KEY: 'not-used-by-fixture' }, 9, 17, { createJwt: async () => 'app-jwt', fetch: async (url, init) => {
    requests.push({ url: String(url), body: init.body });
    return new Response(JSON.stringify({ token: 'installation-token', expires_at: new Date(Date.now() + 60_000).toISOString() }), { status: 201 });
  } });
  assert.equal(client.responseBytes, WORKER_RESULT_LIMIT);
  assert.equal(requests[0].url.endsWith('/app/installations/9/access_tokens'), true);
  assert.deepEqual(JSON.parse(requests[0].body), { repository_ids: [17], permissions: { contents: 'read', pull_requests: 'write', checks: 'write' } });
});

test('installation reconciliation reads every selected repository without carrying repository details into the queue', async () => {
  const requests = [];
  const repositories = await listInstallationRepositories({ GITHUB_APP_ID: '123', GITHUB_APP_PRIVATE_KEY: 'not-used-by-fixture' }, 9, { createJwt: async () => 'app-jwt', fetch: async (url, init) => {
    requests.push({ url: String(url), body: init.body });
    if (init.method === 'POST') return new Response(JSON.stringify({ token: 'installation-token', expires_at: new Date(Date.now() + 60_000).toISOString() }), { status: 201 });
    return new Response(JSON.stringify({ total_count: 2, repositories: [{ id: 17, full_name: 'not-retained' }, { id: 18 }] }), { status: 200 });
  } });
  assert.deepEqual(repositories, [17, 18]);
  assert.deepEqual(JSON.parse(requests[0].body), { permissions: { metadata: 'read' } });
  assert.equal(requests[1].url.endsWith('/installation/repositories?per_page=100&page=1'), true);
});

test('effective App policy preserves selected layer provenance for export and explanation', () => {
  const effective = resolveEffectivePolicy({ preset: { metrics: { review: { measure: 'lines.changed' } } }, account: { bands: { size: { value: 'metrics.review', ranges: [{ id: 'all', otherwise: true }] } } }, repository: { rules: { size: { band: 'size' } } } });
  assert.equal(effective.provenance['/metrics/review'], 'preset');
  assert.equal(effective.provenance['/bands/size'], 'account');
  assert.equal(effective.provenance['/rules/size'], 'repository');
  assert.equal(effective.document.version, 1);
});

test('an explicit repository preset selection can remove inherited size behavior', () => {
  const defaulted = resolveEffectivePolicy({ preset: { presets: ['size@1'] } });
  const optedOut = resolveEffectivePolicy({ preset: { presets: ['size@1'] }, repository: { presets: [] } });
  assert.equal(defaulted.document.rules.size !== undefined, true);
  assert.equal(optedOut.document.rules?.size, undefined);
  assert.equal(optedOut.provenance['/presets'], 'repository');
});
