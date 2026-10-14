// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGitHubUserProvider } from '../src/lib/github-user-provider.mjs';

const material = { accessToken: 'fixture-user-token' };
const membership = (id, login, role = 'admin', state = 'active') => ({ organization: { id, login }, role, state });

function fixture(answer) {
  const requests = [];
  const provider = createGitHubUserProvider({
    clientId: 'fixture-client', clientSecret: 'fixture-secret', callbackUrl: 'https://app.example/auth/callback',
    fetch: async (input, options) => {
      const url = new URL(input);
      requests.push(url);
      assert.equal(options.headers.authorization, `Bearer ${material.accessToken}`);
      // The registration has no Members-read permission. The per-organisation route must fail.
      if (url.pathname !== '/user/memberships/orgs') return Response.json({ message: 'Resource not accessible by integration' }, { status: 403 });
      assert.equal(url.searchParams.get('per_page'), '100');
      return answer(Number(url.searchParams.get('page')));
    }
  });
  return { provider, requests };
}

test('organisation administration uses numeric identity from the current-user membership route without Members-read', async () => {
  const { provider, requests } = fixture(() => Response.json([membership(7001, 'renamed-org'), membership(7002, 'old-name', 'member')]));
  assert.deepEqual(await provider.checkOrganisationAdministration({ material, organisationId: 7001 }), { administer: true, login: 'renamed-org' });
  assert.deepEqual(await provider.checkOrganisationAdministration({ material, organisationId: 7002 }), { administer: false, login: 'old-name' });
  await assert.rejects(provider.checkOrganisationAdministration({ material, organisationId: 7003 }), { code: 'E_GITHUB_MEMBERSHIP_UNCONFIRMED' });
  assert.equal(requests.every(url => url.pathname === '/user/memberships/orgs'), true);
});

test('only active membership grants an organisation role or administration', async () => {
  const rows = [membership(1, 'owners'), membership(2, 'members', 'member'), membership(3, 'invited-owner', 'admin', 'pending'), membership(4, 'invited-member', 'member', 'pending')];
  const { provider } = fixture(() => Response.json(rows));
  for (const [row, role] of rows.map(row => [row, row.state === 'active' ? row.role : 'none'])) {
    assert.equal(await provider.organizationRole({ material, organization: row.organization.login.toUpperCase() }), role);
    assert.deepEqual(await provider.checkOrganisationAdministration({ material, organisationId: row.organization.id }), { administer: role === 'admin', login: row.organization.login });
  }
  await assert.rejects(provider.organizationRole({ material, organization: 'not-listed' }), { code: 'E_GITHUB_MEMBERSHIP_UNCONFIRMED' });
});

test('the authority observation exposes only the target membership and distinguishes pending from a complete missing result', async () => {
  const { provider } = fixture(() => Response.json([
    { ...membership(7001, 'target-org', 'admin', 'pending'), user: { private: 'fixture-private-user' }, description: 'fixture-provider-prose' },
    membership(7002, 'fixture-private-sibling')
  ]));
  assert.deepEqual(await provider.organizationAuthority({ material, organization: 'TARGET-ORG' }), {
    role: 'none', membership: { organizationId: 7001, role: 'admin', state: 'pending' }
  });
  await assert.rejects(provider.organizationAuthority({ material, organization: 'not-listed' }), { code: 'E_GITHUB_MEMBERSHIP_UNCONFIRMED' });
});

test('an absent or unrecognised target role is unavailable evidence, not a known member or negative authority', async () => {
  for (const target of [{ organization: { id: 7001, login: 'org' }, state: 'active' }, membership(7001, 'org', null), membership(7001, 'org', '')]) {
    const { provider } = fixture(() => Response.json([target]));
    await assert.rejects(provider.organizationAuthority({ material, organization: 'org' }), { code: 'E_PROVIDER_RESPONSE' });
    await assert.rejects(provider.organizationRole({ material, organization: 'org' }), { code: 'E_PROVIDER_RESPONSE' });
    await assert.rejects(provider.checkOrganisationAdministration({ material, organisationId: 7001 }), { code: 'E_PROVIDER_RESPONSE' });
  }
});

test('a billing-manager membership does not poison administration of an unrelated organisation', async () => {
  const { provider } = fixture(() => Response.json([membership(7002, 'billing-org', 'billing_manager'), membership(7001, 'owned-org')]));
  assert.deepEqual(await provider.checkOrganisationAdministration({ material, organisationId: 7001 }), { administer: true, login: 'owned-org' });
  assert.equal(await provider.organizationRole({ material, organization: 'OWNED-ORG' }), 'admin');
});

test('billing managers have a non-admin role and pending membership still grants no role', async () => {
  const rows = [membership(7001, 'billing-org', 'billing_manager'), membership(7002, 'pending-billing', 'billing_manager', 'pending')];
  const { provider } = fixture(() => Response.json(rows));
  for (const row of rows) {
    assert.deepEqual(await provider.checkOrganisationAdministration({ material, organisationId: row.organization.id }), { administer: false, login: row.organization.login });
    assert.equal(await provider.organizationRole({ material, organization: row.organization.login }), row.state === 'active' ? 'member' : 'none');
  }
});

test('both authority observations reach memberships on later pages', async () => {
  const first = Array.from({ length: 100 }, (_, index) => membership(index + 1, `org-${index + 1}`, 'member'));
  const { provider, requests } = fixture(page => Response.json(page === 1 ? first : [membership(7001, 'later-org')]));
  assert.deepEqual(await provider.checkOrganisationAdministration({ material, organisationId: 7001 }), { administer: true, login: 'later-org' });
  assert.equal(await provider.organizationRole({ material, organization: 'later-org' }), 'admin');
  assert.deepEqual(requests.map(url => Number(url.searchParams.get('page'))), [1, 2, 1, 2]);
});

test('membership lookup does not silently truncate authority at the general listing page limit', async () => {
  const { provider, requests } = fixture(page => Response.json(page <= 20
    ? Array.from({ length: 100 }, (_, index) => membership((page - 1) * 100 + index + 1, `org-${page}-${index}`, 'member'))
    : [membership(7001, 'last-org')]));
  assert.equal(await provider.organizationRole({ material, organization: 'last-org' }), 'admin');
  assert.equal(requests.length, 21);
});

test('failure on a later membership page is unknown rather than absent authority', async () => {
  const { provider } = fixture(page => page === 1
    ? Response.json(Array.from({ length: 100 }, (_, index) => membership(index + 1, `org-${index + 1}`)))
    : Response.json({ message: 'unavailable' }, { status: 503 }));
  await assert.rejects(provider.checkOrganisationAdministration({ material, organisationId: 7001 }), { code: 'E_PROVIDER_REQUEST', status: 503 });
  await assert.rejects(provider.organizationRole({ material, organization: 'later-org' }), { code: 'E_PROVIDER_REQUEST', status: 503 });
});

test('provider refusals and rate limits never claim absent membership', async () => {
  for (const [status, code, headers] of [[401, 'E_PROVIDER_UNAUTHORIZED'], [403, 'E_PROVIDER_REQUEST'], [404, 'E_PROVIDER_NOT_FOUND'], [429, 'E_GITHUB_RATE_LIMIT'], [403, 'E_GITHUB_RATE_LIMIT', { 'x-ratelimit-remaining': '0' }]]) {
    const { provider } = fixture(() => Response.json({ message: 'unavailable' }, { status, headers }));
    await assert.rejects(provider.checkOrganisationAdministration({ material, organisationId: 7001 }), { code, status });
    await assert.rejects(provider.organizationRole({ material, organization: 'org' }), { code, status });
  }
});

test('malformed membership evidence does not become negative authority', async () => {
  for (const payload of [{}, [null], [membership('7001', 'org')], [membership(7001, '')], [membership(7001, 'org', 'admin', 'unexpected')]]) {
    const { provider } = fixture(() => Response.json(payload));
    await assert.rejects(provider.checkOrganisationAdministration({ material, organisationId: 7001 }), { code: 'E_PROVIDER_RESPONSE' });
    await assert.rejects(provider.organizationRole({ material, organization: 'org' }), { code: 'E_PROVIDER_RESPONSE' });
  }
  const { provider } = fixture(() => new Response('fixture-private-invalid-json', { status: 200 }));
  await assert.rejects(provider.organizationAuthority({ material, organization: 'org' }), error =>
    error.code === 'E_PROVIDER_RESPONSE' && error.status === 200 && !error.message.includes('fixture-private'));
});

test('a subsequent authority encounter observes demotion and removal rather than retaining an admin result', async () => {
  let rows = [membership(7001, 'org')];
  const { provider } = fixture(() => Response.json(rows));
  assert.equal(await provider.organizationRole({ material, organization: 'org' }), 'admin');
  rows = [membership(7001, 'org', 'member')];
  assert.deepEqual(await provider.checkOrganisationAdministration({ material, organisationId: 7001 }), { administer: false, login: 'org' });
  rows = [];
  await assert.rejects(provider.organizationRole({ material, organization: 'org' }), { code: 'E_GITHUB_MEMBERSHIP_UNCONFIRMED' });
});
