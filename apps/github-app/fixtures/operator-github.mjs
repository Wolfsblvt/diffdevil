// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/** Synthetic GitHub reads for the real hidden operator child. Never handles real credentials. */
import assert from 'node:assert/strict';
import { verify } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

globalThis.fetch = async (url, request) => {
  const directory = process.env.DIFFDEVIL_OPERATOR_FIXTURE_DIRECTORY;
  const options = JSON.parse(await readFile(join(directory, 'fixture-options.json'), 'utf8'));
  const receipt = JSON.parse(await readFile(join(directory, process.env.DIFFDEVIL_OPERATOR_FIXTURE_RECEIPT ?? 'receipt.json'), 'utf8'));
  assert.equal(receipt.command, 'not-attempted');
  assert.equal(request.redirect, 'error');
  if (url === 'https://api.github.com/app') {
    const jwt = request.headers.Authorization.slice('Bearer '.length);
    const [header, body, signature] = jwt.split('.');
    const publicKey = await readFile(join(directory, 'fixture-public-key.pem'), 'utf8');
    const valid = verify('RSA-SHA256', Buffer.from(`${header}.${body}`), publicKey, Buffer.from(signature, 'base64url'));
    if (!valid || options.githubRefused) return { ok: false, json: async () => { throw new Error('Do not consume refused provider bodies.'); } };
    await writeFile(join(directory, 'fixture-identity.json'), JSON.stringify({ authenticated: true, appId: JSON.parse(Buffer.from(body, 'base64url').toString()).iss }));
    return { ok: true, json: async () => ({ id: 123, client_id: 'fixture-oauth-client', slug: 'diffdevil', ...options.githubIdentity }) };
  }
  const slug = options.githubIdentity?.slug ?? 'diffdevil';
  assert.equal(url, `https://api.github.com/users/${encodeURIComponent(`${slug}[bot]`)}`);
  assert.equal(request.headers.Authorization, undefined);
  return { ok: true, json: async () => ({ id: 456, login: `${slug}[bot]`, type: 'Bot', ...options.githubBot }) };
};
