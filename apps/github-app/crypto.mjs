// SPDX-License-Identifier: AGPL-3.0-only

import { createPrivateKey, createSign } from 'node:crypto';

const encoder = new TextEncoder();

function hex(bytes) { return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join(''); }

/** Compare all available bytes; a signature mismatch never grants parsing or queue access. */
export function constantTimeEqual(left, right) {
  const size = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < size; index++) difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  return difference === 0;
}

export async function verifyWebhookSignature(body, header, secret) {
  if (typeof header !== 'string' || !header.startsWith('sha256=') || typeof secret !== 'string' || secret.length === 0) return false;
  const supplied = header.slice('sha256='.length);
  if (!/^[0-9a-f]{64}$/iu.test(supplied)) return false;
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, body));
  const expected = encoder.encode(hex(signature));
  return constantTimeEqual(expected, encoder.encode(supplied.toLowerCase()));
}

function base64Url(value) {
  const bytes = value instanceof Uint8Array ? value : encoder.encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

/** Validate the exact ordinary GitHub App key shape without retaining or logging it. */
export function validateGitHubAppPrivateKey(pem) {
  if (typeof pem !== 'string' || !pem.includes('-----BEGIN RSA PRIVATE KEY-----')) throw Object.assign(new TypeError('GitHub App private key must be an unencrypted RSA PKCS#1 PEM.'), { code: 'E_APP_PRIVATE_KEY' });
  try {
    const key = createPrivateKey({ key: pem, format: 'pem', type: 'pkcs1' });
    if (key.type !== 'private' || key.asymmetricKeyType !== 'rsa') throw new TypeError('not RSA');
    return key;
  } catch {
    throw Object.assign(new TypeError('GitHub App private key must be an unencrypted RSA PKCS#1 PEM.'), { code: 'E_APP_PRIVATE_KEY' });
  }
}

/** Mint a short App JWT only at execution time; neither its key nor result is persisted. */
export async function createAppJwt({ appId, privateKey, now = Date.now }) {
  if (!/^\d+$/u.test(String(appId))) throw new TypeError('GitHub App ID must be numeric.');
  const issuedAt = Math.floor(now() / 1000) - 30;
  const payload = { iat: issuedAt, exp: issuedAt + 9 * 60, iss: String(appId) };
  const unsigned = `${base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${base64Url(JSON.stringify(payload))}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  return `${unsigned}.${base64Url(signer.sign(validateGitHubAppPrivateKey(privateKey)))}`;
}
