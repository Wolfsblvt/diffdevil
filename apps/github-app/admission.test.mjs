// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { convertV4MiniflareOptions, Miniflare } from 'miniflare';
import { createAdmissionService, admissionServiceIdentity, assertAdmissionService } from './admission.mjs';
import { createPolicyResolver } from './app.mjs';
import { resolveEffectivePolicy, DEFAULT_SIZE_POLICY } from './configuration.mjs';
import { bindPlatformFetch } from './platform-fetch.mjs';
import { FakeGitHub } from '../../src/diffdevil/tests/helpers/github.mjs';

const actor = { role: 'repository-admin', userId: 123 };
const base = 'a'.repeat(40);
const selected = () => ({ ...resolveEffectivePolicy({ preset: DEFAULT_SIZE_POLICY }), source: 'default', sourceIdentity: 'bundled default policy', expectedPolicyBase: base });

function fixture({ resolve = async () => selected(), afterWrite } = {}) {
  let row = { repositoryId: 17, installationId: 9, revision: 0, state: 'pending-enable',
    reach: { repository: 'available', installation: 'active', tombstoned: false }, execution: { reason: 'never-enabled' },
    history: { enabled: false, reason: 'never-enabled' }, configuration: { value: { repository: {} } }, writer: { confidence: 'unverified' } };
  const writes = [];
  const store = {
    async repositoryAdmission(id) { return id === row.repositoryId ? structuredClone(row) : undefined; },
    async updateRepositoryAdmission(id, change) {
      if (id !== row.repositoryId || change.revision !== row.revision) return undefined;
      writes.push(change);
      row = { ...row, revision: row.revision + 1, state: 'active', execution: { reason: null, actorId: change.actorId }, writer: change.writer ?? row.writer };
      afterWrite?.();
      return structuredClone(row);
    }
  };
  return { service: createAdmissionService({ store, previewPolicy: resolve, authorize: async request => request.actor?.role === 'repository-admin' }),
    writes, row: () => row, drift: patch => { Object.assign(row, patch); } };
}

test('inspection uses the production trusted resolver, returns policy and effects, and makes no repository change', async () => {
  const fake = new FakeGitHub();
  fake.contents.set(`${fake.defaultBranch}:.diffdevil.yml`, 'version: 1\npresets: []\n');
  const json = (body, status = 200) => Response.json(body, { status });
  const resolver = createPolicyResolver({ GITHUB_APP_ID: '1', GITHUB_APP_PRIVATE_KEY: 'unused' }, {
    createJwt: async () => 'fixture-jwt', fetch: async (input, init) => {
      const path = new URL(String(input)).pathname;
      if (path === '/app/installations/9/access_tokens') {
        assert.deepEqual(JSON.parse(init.body), { repository_ids: [17], permissions: { metadata: 'read', contents: 'read' } });
        return json({ token: 'fixture-installation', expires_at: '2999-01-01T00:00:00Z' }, 201);
      }
      if (path === '/repositories/17') return json({ id: 17, full_name: 'example/repository', default_branch: 'main' });
      return fake.fetch(input, init);
    }
  });
  const f = fixture({ resolve: resolver });
  const seen = await f.service.inspect(17, actor);
  assert.equal(seen.policy.source, 'trusted-base');
  assert.equal(seen.basis.policyBase, fake.defaultBranch);
  assert.deepEqual(seen.policy.document.presets, []);
  assert.deepEqual(seen.requestedEffects.rules, {});
  assert.equal(seen.requestedEffects.providerEffects, 'not-attempted');
  assert.deepEqual(f.writes, []);
  assert.equal(fake.writes().length, 0);
});

test('the production trusted resolver keeps the Worker platform fetch receiver when it is injected explicitly', async () => {
  const fake = new FakeGitHub();
  fake.contents.set(`${fake.defaultBranch}:.diffdevil.yml`, 'version: 1\npresets: []\n');
  const originalFetch = globalThis.fetch;
  let receiver;
  Object.defineProperty(globalThis, 'fetch', {
    configurable: true,
    writable: true,
    value: async function (input, init) {
      receiver = this;
      assert.equal(this, globalThis, 'Worker platform fetch must be called with its global receiver');
      const path = new URL(String(input)).pathname;
      if (path === '/app/installations/9/access_tokens') return Response.json({ token: 'fixture-installation', expires_at: '2999-01-01T00:00:00Z' }, { status: 201 });
      if (path === '/repositories/17') return Response.json({ id: 17, full_name: 'example/repository', default_branch: 'main' });
      return fake.fetch(input, init);
    }
  });
  try {
    const resolver = createPolicyResolver({ GITHUB_APP_ID: '1', GITHUB_APP_PRIVATE_KEY: 'unused' }, {
      createJwt: async () => 'fixture-jwt', fetch: globalThis.fetch
    });
    const result = await resolver({ repositoryId: 17, installationId: 9 });
    assert.equal(result.source, 'trusted-base');
    assert.equal(result.expectedPolicyBase, fake.defaultBranch);
    assert.equal(receiver, globalThis);
  } finally {
    Object.defineProperty(globalThis, 'fetch', { configurable: true, writable: true, value: originalFetch });
  }
});

test('the Worker platform fetch remains callable when passed through a client method', async () => {
  const fetchModule = await readFile(resolve('apps/github-app/platform-fetch.mjs'), 'utf8');
  const runtime = new Miniflare(convertV4MiniflareOptions({
    name: 'platform-fetch-receiver', compatibilityDate: '2026-09-17', modulesRoot: resolve('.'),
    modules: [
      { type: 'ESModule', path: 'apps/github-app/worker.mjs', contents: `import { bindPlatformFetch } from './platform-fetch.mjs';
export default { async fetch() {
  const unboundClient = { fetch: globalThis.fetch, async read(url) { return this.fetch(url); } };
  let unboundFailure;
  try { await unboundClient.read('https://api.github.com/'); } catch (error) { unboundFailure = error.message; }
  const client = { fetch: bindPlatformFetch(globalThis.fetch), async read(url) { return this.fetch(url); } };
  const response = await client.read('https://api.github.com/');
  return Response.json({ unboundFailure, status: response.status, body: await response.json() });
} };` },
      { type: 'ESModule', path: 'apps/github-app/platform-fetch.mjs', contents: fetchModule }
    ],
    outboundService: async request => Response.json({ url: request.url })
  }));
  try {
    const worker = await runtime.getWorker('platform-fetch-receiver');
    const response = await worker.fetch(new Request('http://worker.test/'));
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.match(result.unboundFailure, /^Illegal invocation:/u);
    assert.equal(result.status, 200);
    assert.deepEqual(result.body, { url: 'https://api.github.com/' });
  } finally { await runtime.dispose(); }
});

test('admission records the acting administrator and inspected basis, changing execution alone', async () => {
  const f = fixture();
  const before = structuredClone(f.row());
  const { basis } = await f.service.inspect(17, actor);
  await assert.rejects(f.service.admit(17, { basis, actor, origin: 'dashboard' }), { code: 'E_ADMISSION_WRITER_UNRESOLVED' });
  assert.equal(f.writes.length, 0);
  const result = await f.service.admit(17, { basis, actor, origin: 'dashboard', writerDeclared: true });
  assert.deepEqual(result.operation, { kind: 'enable-execution', actorId: 123, basis, revision: 1, outcome: 'recorded', providerEffects: 'not-attempted', history: 'unchanged' });
  assert.deepEqual(f.row().history, before.history);
  assert.deepEqual(f.row().configuration, before.configuration);
  assert.equal(f.writes[0].history, undefined);
  assert.equal(f.writes[0].configuration, undefined);
  assert.equal(f.writes[0].actorId, 123);
  await assert.rejects(f.service.admit(17, { basis, actor, origin: 'dashboard', writerDeclared: true }), { code: 'E_ADMISSION_STALE' });
  assert.equal(f.writes.length, 1, 'a lost response cannot replay the spent settings revision');
});

test('repository, installation, settings and policy drift refuse before any admission write', async () => {
  for (const patch of [{ repositoryId: 18 }, { installationId: 10 }, { revision: 1 }, { policyId: 'changed' }, { policyBase: 'b'.repeat(40) }]) {
    const f = fixture();
    const { basis } = await f.service.inspect(17, actor);
    await assert.rejects(f.service.admit(17, { basis: { ...basis, ...patch }, actor, origin: 'dashboard', writerDeclared: true }), { code: 'E_ADMISSION_STALE' });
    assert.equal(f.writes.length, 0);
  }
  let head = base;
  const f = fixture({ resolve: async () => ({ ...selected(), expectedPolicyBase: head }) });
  const { basis } = await f.service.inspect(17, actor);
  head = 'c'.repeat(40);
  await assert.rejects(f.service.admit(17, { basis, actor, origin: 'dashboard', writerDeclared: true }), { code: 'E_ADMISSION_STALE' });
  assert.equal(f.writes.length, 0, 'the default branch is read again, rather than trusting submitted policy identity');
});

test('a lost acknowledgement preserves unknown completion and a fresh read exposes the recorded transition', async () => {
  const f = fixture({ afterWrite: () => { throw new Error('lost-response'); } });
  const { basis } = await f.service.inspect(17, actor);
  const request = { basis, actor, origin: 'dashboard', writerDeclared: true };
  await assert.rejects(f.service.admit(17, request), { code: 'E_ADMISSION_UNCONFIRMED' });
  const current = await f.service.inspect(17, actor);
  assert.equal(current.revision, 1);
  assert.equal(current.execution.actorId, 123);
  await assert.rejects(f.service.admit(17, request), { code: 'E_ADMISSION_STALE' });
  assert.equal(f.writes.length, 1);
});

test('unreadable policy, current reach loss and absent authorization never become a default or consent', async () => {
  const f = fixture({ resolve: async () => { throw Object.assign(new Error('provider-private-response'), { code: 'E_GITHUB_UNAVAILABLE' }); } });
  await assert.rejects(f.service.inspect(17, actor), { code: 'E_GITHUB_UNAVAILABLE' });
  assert.equal(f.writes.length, 0);
  const absent = fixture({ resolve: undefined });
  await assert.rejects(absent.service.inspect(17), { code: 'E_ADMISSION_UNAUTHORIZED' });
  const { basis } = await absent.service.inspect(17, actor);
  absent.drift({ reach: { repository: 'unavailable', installation: 'suspended', tombstoned: false } });
  await assert.rejects(absent.service.admit(17, { basis, actor, origin: 'dashboard', writerDeclared: true }), { code: 'E_ADMISSION_UNAVAILABLE' });
  assert.equal(absent.writes.length, 0);
});

test('the review binds the exact origin and running provider version; missing version remains unavailable', () => {
  const service = admissionServiceIdentity('https://app.example.test', { id: 'fixture-version' });
  assert.doesNotThrow(() => assertAdmissionService(service, service));
  assert.throws(() => assertAdmissionService({ ...service, versionId: 'other' }, service), { code: 'E_ADMISSION_STALE' });
  assert.throws(() => assertAdmissionService({ ...service, origin: 'https://staging.example.test' }, service), { code: 'E_ADMISSION_STALE' });
  assert.throws(() => assertAdmissionService(service, admissionServiceIdentity(service.origin)), { code: 'E_ADMISSION_VERSION_UNAVAILABLE' });
});
