// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGitHubUserProvider } from '../src/lib/github-user-provider.mjs';

const NOW = Date.parse('2026-10-09T14:00:00Z');
const material = { accessToken: 'fixture-access' };
const expiring = { ...material, refreshToken: 'fixture-refresh', accessExpiresAt: new Date(NOW + 30_000).toISOString() };
const rotated = { access_token: 'fixture-next-access', refresh_token: 'fixture-next-refresh', expires_in: 28800, refresh_token_expires_in: 15897600 };

function providerFor(answer) {
  return createGitHubUserProvider({ clientId: 'fixture-client', clientSecret: 'fixture-secret', callbackUrl: 'https://fixture.invalid/callback', now: () => NOW, fetch: answer });
}
const verify = (provider, grant = material) => provider.verifyUserAuthorization({ userId: 123, material: grant, claimRefresh: async () => {} });

test('refresh refuses to spend a token without the durable claim callback', async () => {
  let calls = 0;
  const provider = providerFor(async () => { calls++; return Response.json(rotated); });
  await assert.rejects(provider.verifyUserAuthorization({ userId: 123, material: expiring }), { code: 'E_PROVIDER_REFRESH_UNCLAIMED' });
  await assert.rejects(provider.verifyUserAuthorization({ userId: 123, material: expiring, claimRefresh: async () => { throw new Error('held by another runtime'); } }), /held by another runtime/u);
  assert.equal(calls, 0);
});

test('token-check HTTP failures are unavailable evidence, except GitHub\'s definite invalid-token 404', async () => {
  for (const status of [401, 403, 422, 500, 503]) {
    const provider = providerFor(async () => Response.json({ message: 'fixture unavailable' }, { status }));
    await assert.rejects(verify(provider), { code: 'E_PROVIDER_REQUEST', status }, `HTTP ${status} must not invalidate a grant`);
  }
  const invalid = providerFor(async () => Response.json({ message: 'invalid' }, { status: 404 }));
  assert.deepEqual(await verify(invalid), { valid: false });
});

test('a token check needs a valid numeric identity; a confirmed different user is invalid for this grant', async () => {
  for (const payload of [null, {}, { user: {} }, { user: { id: '123' } }, { user: { id: 0 } }]) {
    await assert.rejects(verify(providerFor(async () => Response.json(payload))), { code: 'E_PROVIDER_RESPONSE' });
  }
  assert.deepEqual(await verify(providerFor(async () => Response.json({ user: { id: 123 } }))), { valid: true });
  assert.deepEqual(await verify(providerFor(async () => Response.json({ user: { id: 456 } }))), { valid: false });
});

test('refresh HTTP, client-configuration and unknown OAuth errors do not invalidate a grant', async () => {
  for (const status of [401, 403, 404, 422, 500, 503]) {
    await assert.rejects(verify(providerFor(async () => Response.json({ error: 'bad_refresh_token' }, { status })), expiring), { code: 'E_PROVIDER_TOKEN', status });
  }
  for (const error of ['incorrect_client_credentials', 'unsupported_grant_type', 'unknown_error']) {
    await assert.rejects(verify(providerFor(async () => Response.json({ error })), expiring), { code: 'E_PROVIDER_TOKEN' });
  }
});

test('a documented bad-refresh-token answer invalidates only the refresh grant, not an authorization-code exchange', async () => {
  for (const status of [200, 400]) {
    const provider = providerFor(async () => Response.json({ error: 'bad_refresh_token' }, { status }));
    assert.deepEqual(await verify(provider, expiring), { valid: false });
    await assert.rejects(provider.exchangeCode({ code: 'fixture-code' }), { code: 'E_PROVIDER_TOKEN' });
  }
});

test('malformed token-check and refresh bodies remain unavailable and do not expose their body through errors', async () => {
  const marker = 'fixture-secret-in-malformed-body';
  for (const grant of [material, expiring]) {
    const provider = providerFor(async () => new Response(marker));
    await assert.rejects(verify(provider, grant), error => error.code === 'E_PROVIDER_RESPONSE' && !error.message.includes(marker));
  }
  for (const payload of [null, {}, { ...rotated, refresh_token: '' }, { ...rotated, expires_in: 0 }, { ...rotated, refresh_token_expires_in: -1 }, { access_token: 'fixture-next-access' }]) {
    await assert.rejects(verify(providerFor(async () => Response.json(payload)), expiring), { code: 'E_PROVIDER_TOKEN' });
  }
});

test('rate limits, transport failure and cancellation remain unknown on both verification routes', async () => {
  for (const grant of [material, expiring]) {
    for (const [status, headers] of [[429, {}], [403, { 'x-ratelimit-remaining': '0' }]]) {
      await assert.rejects(verify(providerFor(async () => Response.json({}, { status, headers })), grant), { code: 'E_GITHUB_RATE_LIMIT' });
    }
    for (const failure of [new Error('fixture network failure'), new DOMException('fixture cancelled', 'AbortError')]) {
      await assert.rejects(verify(providerFor(async () => { throw failure; }), grant), error => error === failure);
    }
  }
});

test('successful refresh rotates the complete material and uses the provider expiry', async () => {
  const provider = providerFor(async (input, options) => {
    assert.equal(new URL(input).pathname, '/login/oauth/access_token');
    assert.equal(options.method, 'POST');
    const body = JSON.parse(options.body);
    assert.equal(body.grant_type, 'refresh_token');
    assert.equal(body.refresh_token, expiring.refreshToken);
    return Response.json(rotated);
  });
  assert.deepEqual(await verify(provider, expiring), {
    valid: true,
    material: { accessToken: rotated.access_token, refreshToken: rotated.refresh_token, accessExpiresAt: new Date(NOW + 28800_000).toISOString() },
    expiresAt: new Date(NOW + 15897600_000).toISOString()
  });
});

test('unknown failure makes one request and a later ordinary encounter can verify successfully', async () => {
  let calls = 0;
  const provider = providerFor(async () => ++calls === 1 ? Response.json({}, { status: 503 }) : Response.json({ user: { id: 123 } }));
  await assert.rejects(verify(provider), { code: 'E_PROVIDER_REQUEST' });
  assert.equal(calls, 1);
  assert.deepEqual(await verify(provider), { valid: true });
  assert.equal(calls, 2);
});
