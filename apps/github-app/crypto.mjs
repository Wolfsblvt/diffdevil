// SPDX-License-Identifier: AGPL-3.0-only

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

function pemBytes(pem) {
  if (typeof pem !== 'string') throw new TypeError('GitHub App private key is unavailable.');
  const body = pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/gu, '');
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(body)) throw new TypeError('GitHub App private key is not PKCS#8 PEM.');
  const binary = atob(body);
  return Uint8Array.from(binary, character => character.codePointAt(0));
}

/** Mint a short App JWT only at execution time; neither its key nor result is persisted. */
export async function createAppJwt({ appId, privateKey, now = Date.now }) {
  if (!/^\d+$/u.test(String(appId))) throw new TypeError('GitHub App ID must be numeric.');
  const issuedAt = Math.floor(now() / 1000) - 30;
  const payload = { iat: issuedAt, exp: issuedAt + 9 * 60, iss: String(appId) };
  const unsigned = `${base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${base64Url(JSON.stringify(payload))}`;
  const key = await crypto.subtle.importKey('pkcs8', pemBytes(privateKey), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  return `${unsigned}.${base64Url(new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, encoder.encode(unsigned))))}`;
}
