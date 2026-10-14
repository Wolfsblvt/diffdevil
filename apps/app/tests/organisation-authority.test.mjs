// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createContextCache, resolveViewer } from '../src/lib/viewer.mjs';
import { readerAuthority } from '../src/lib/manage/states.mjs';

function fixture() {
  const state = { answer: { role: 'admin', membership: { organizationId: 7001, role: 'admin', state: 'active' } }, error: null, calls: 0 };
  const input = {
    actor: { userId: 123 }, cache: createContextCache(),
    reads: {
      profile: async () => ({ id: 123, login: 'viewer' }),
      installations: async () => [{ id: 1, account: { type: 'Organization' } }],
      installationRepositories: async () => [{ repositoryId: 11, owner: 'org', fullName: 'org/repo', canWrite: false }],
      organizationAuthority: async () => { state.calls++; if (state.error) throw state.error; return state.answer; }
    },
    store: { repositoryStandings: async () => new Map() },
    entitlement: { planOfViewer: async () => 'free', planOfRepository: async () => 'free', describe: () => 'fixture', source: 'fixture' }
  };
  return { state, view: () => resolveViewer(input) };
}

test('failed authority keeps the namespace readable, grants no administration and retries on an ordinary refresh', async () => {
  const { state, view } = fixture();
  state.error = Object.assign(new Error('fixture-secret-provider-body'), { code: 'E_PROVIDER_REQUEST', status: 403 });
  const unknown = await view();
  assert.equal(unknown.repositories.length, 1);
  assert.equal(unknown.repositories[0].canWrite, false);
  assert.equal(unknown.namespaces[0].role, 'unknown');
  assert.equal(unknown.namespaces[0].yours, false);
  assert.deepEqual(unknown.namespaces[0].authorityIssue, { code: 'E_PROVIDER_REQUEST', status: 403 });
  assert.equal(JSON.stringify(unknown).includes('fixture-secret'), false);
  assert.match(readerAuthority(unknown.namespaces[0]), /HTTP 403.*Administration is unconfirmed/u);

  state.error = null;
  const restored = await view();
  assert.equal(state.calls, 2);
  assert.equal(restored.namespaces[0].role, 'admin');
  assert.equal(restored.namespaces[0].yours, true);
  assert.equal(restored.namespaces[0].authorityIssue, undefined);
  assert.equal(restored.repositories[0].canWrite, false, 'organisation authority does not invent a repository write permission');
});

test('transport exception text and unknown codes cannot become native diagnostic text', async () => {
  const { state, view } = fixture();
  state.error = Object.assign(new Error('fixture-secret-transport'), { code: 'fixture-secret-code', status: 'fixture-secret-status' });
  const namespace = (await view()).namespaces[0];
  assert.deepEqual(namespace.authorityIssue, { code: 'E_PROVIDER_UNAVAILABLE', status: null });
  assert.equal(JSON.stringify(namespace).includes('fixture-secret'), false);
  assert.match(readerAuthority(namespace), /did not answer.*Administration is unconfirmed/u);
});

test('native explanation distinguishes rate limits, malformed responses, pending membership and a missing target', () => {
  const namespace = { login: 'org', kind: 'org', plan: 'Free', role: 'unknown' };
  assert.match(readerAuthority({ ...namespace, authorityIssue: { code: 'E_GITHUB_RATE_LIMIT', status: 429 } }), /rate-limited/u);
  assert.match(readerAuthority({ ...namespace, authorityIssue: { code: 'E_PROVIDER_RESPONSE', status: null } }), /usable organisation membership response/u);
  assert.match(readerAuthority({ ...namespace, authorityIssue: { code: 'E_GITHUB_MEMBERSHIP_UNCONFIRMED', status: null } }), /list did not include.*Administration is unconfirmed/u);
  assert.match(readerAuthority({ ...namespace, role: 'none', membership: { state: 'pending', role: 'admin' } }), /membership is pending/u);
  assert.match(readerAuthority({ ...namespace, role: 'none', membership: null }), /list did not include/u);
  assert.match(readerAuthority({ ...namespace, role: 'member', membership: { state: 'active', role: 'billing_manager' } }), /active billing manager role/u);
});
