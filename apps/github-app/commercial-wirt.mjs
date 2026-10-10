// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Wirt projection protocol: exact-byte request signing, the bounded server-to-server client,
 * and the payload shapes diffdevil consumes. Wirt's adopted producer contract owns the grammar:
 * docs/commercial-projection-runtime.md and docs/commercial-projection.md at Wirt 04e253a8.
 */

export const WIRT_CLIENT = 'diffdevil';
export const WIRT_SCOPE = 'wirt.link';
export const WIRT_BODY_LIMIT = 65_536;
export const WIRT_SKEW_SECONDS = 300;
export const WIRT_NONCE_MS = 10 * 60_000;
const REQUEST_TIMEOUT_MS = 5_000;
const KEY_IDS = new Set(['current', 'previous']);
const encoder = new TextEncoder();
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const datePattern = /^\d{4}-\d{2}-\d{2}$/u;
const identifierPattern = /^[A-Za-z0-9._:-]{1,128}$/u;

export function wirtError(code, details = {}) { return Object.assign(new Error(code), { code, ...details }); }

function hex(bytes) { return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join(''); }
export async function sha256Hex(bytes) { return hex(await crypto.subtle.digest('SHA-256', typeof bytes === 'string' ? encoder.encode(bytes) : bytes)); }
async function hmacHex(secret, text) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, encoder.encode(text)));
}
function constantTimeEqualText(left, right) {
  let difference = left.length ^ right.length;
  for (let index = 0; index < Math.max(left.length, right.length); index++) difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  return difference === 0;
}

/** The runtime keys are raw UTF-8 secrets of at least 32 bytes, mediated by Ops; this never logs them. */
export function readSigningKeys({ activeKeyId = 'current', current, previous } = {}) {
  const keys = {};
  for (const [id, value] of [['current', current], ['previous', previous]]) {
    if (value === undefined || value === null || value === '') continue;
    if (typeof value !== 'string' || encoder.encode(value).byteLength < 32) throw wirtError('E_COMMERCIAL_CONFIGURATION');
    keys[id] = value;
  }
  if (!KEY_IDS.has(activeKeyId) || !keys[activeKeyId]) throw wirtError('E_COMMERCIAL_CONFIGURATION');
  return { activeKeyId, keys };
}

/** UTF-8 lines joined with LF and no trailing LF, exactly as Wirt's SignedRequests::message. */
export function canonicalMessage({ method, path, account, timestamp, nonce, bodyHash }) {
  return ['wirt-http/v1', WIRT_CLIENT, method.toUpperCase(), path, account, timestamp, nonce, bodyHash].join('\n');
}

export async function signedHeaders(signing, { method, path, body = new Uint8Array(), account = '', now = Date.now }) {
  const timestamp = String(Math.floor(now() / 1000));
  const nonce = crypto.randomUUID();
  const bodyHash = await sha256Hex(typeof body === 'string' ? encoder.encode(body) : body);
  return {
    'X-Wirt-Key': signing.activeKeyId, 'X-Wirt-Time': timestamp, 'X-Wirt-Nonce': nonce, 'X-Wirt-Product-Account': account,
    'X-Wirt-Signature': await hmacHex(signing.keys[signing.activeKeyId], canonicalMessage({ method, path, account, timestamp, nonce, bodyHash }))
  };
}

/** Verify exact bytes before any payload use; the caller still owns single-use nonce persistence. */
export async function verifySignedMessage(signing, { method, path, body, headers, now = Date.now }) {
  const keyId = headers.get('x-wirt-key') ?? '', timestamp = headers.get('x-wirt-time') ?? '', nonce = headers.get('x-wirt-nonce') ?? '';
  const signature = headers.get('x-wirt-signature') ?? '', account = headers.get('x-wirt-product-account') ?? '';
  if (!/^\d{1,12}$/u.test(timestamp) || Math.abs(Math.floor(now() / 1000) - Number(timestamp)) > WIRT_SKEW_SECONDS
    || !uuidPattern.test(nonce) || !/^[a-f0-9]{64}$/u.test(signature) || !/^\d{0,20}$/u.test(account)) throw wirtError('E_COMMERCIAL_SIGNATURE');
  const secret = KEY_IDS.has(keyId) ? signing.keys[keyId] : undefined;
  if (!secret) throw wirtError('E_COMMERCIAL_SIGNATURE');
  const expected = await hmacHex(secret, canonicalMessage({ method, path, account, timestamp, nonce, bodyHash: await sha256Hex(body) }));
  if (!constantTimeEqualText(expected, signature)) throw wirtError('E_COMMERCIAL_SIGNATURE');
  return { keyId, nonce, account };
}

export async function readBoundedBody(source, limit = WIRT_BODY_LIMIT) {
  const declared = source.headers.get('content-length');
  if (declared !== null && (!/^\d+$/u.test(declared) || Number(declared) > limit)) throw wirtError('E_COMMERCIAL_BODY_LIMIT');
  const reader = source.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks = []; let bytes = 0;
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > limit) { await reader.cancel(); throw wirtError('E_COMMERCIAL_BODY_LIMIT'); }
      chunks.push(part.value);
    }
  } finally { reader.releaseLock(); }
  const body = new Uint8Array(bytes); let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return body;
}

export function parseJsonBytes(bytes) {
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { throw wirtError('E_COMMERCIAL_SHAPE'); }
}

// Shapes. Only fields diffdevil consumes are required; Wirt validates its own complete payload.
function shape(condition) { if (!condition) throw wirtError('E_COMMERCIAL_SHAPE'); }
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const positive = value => Number.isSafeInteger(value) && value > 0;
const date = value => typeof value === 'string' && datePattern.test(value);
const nullableDate = value => value === null || date(value);
const timestamp = value => typeof value === 'string' && value.length <= 40 && Number.isFinite(Date.parse(value));
const oneOf = (value, values) => values.includes(value);

function readStream(value) {
  shape(object(value) && typeof value.works_account === 'string' && identifierPattern.test(value.works_account)
    && object(value.link) && typeof value.link.id === 'string' && identifierPattern.test(value.link.id)
    && object(value.link.product_account) && positive(value.link.product_account.github_user_id));
  return { worksAccount: value.works_account, linkId: value.link.id, productAccount: value.link.product_account.github_user_id };
}
function readOrder(value) {
  shape(object(value) && positive(value.epoch) && positive(value.version));
  return { epoch: value.epoch, version: value.version };
}

function readCommercial(value) {
  shape(object(value) && oneOf(value.standing, ['first-payment-pending', 'funded', 'renewal-in-grace', 'ended'])
    && oneOf(value.tier, ['pro', 'business']) && oneOf(value.cadence, ['monthly', 'annual'])
    && object(value.period) && date(value.period.started_on) && date(value.period.ends_on)
    && oneOf(value.renewal_preference, ['automatic', 'manual']) && oneOf(value.cancellation_intent, ['none', 'at-period-end'])
    && (value.grace === null || (object(value.grace) && oneOf(value.grace.renewal, ['not-yet-invoiced', 'renewing', 'unresolved', 'payment-due'])))
    && (value.ended === null || (object(value.ended) && date(value.ended.on) && typeof value.ended.reason === 'string' && oneOf(value.ended.earlier_attempt, ['none', 'unresolved'])))
    && (value.next_renewal === null || (object(value.next_renewal) && date(value.next_renewal.on) && Number.isSafeInteger(value.next_renewal.total_cents)
      && value.next_renewal.total_cents >= 0 && typeof value.next_renewal.currency === 'string' && typeof value.next_renewal.tax_inclusive === 'boolean')));
}

function readBenefits(value) {
  shape(object(value) && Array.isArray(value.organisation_capacity) && value.organisation_capacity.length <= 256
    && Array.isArray(value.grants) && (value.protection === null || object(value.protection)));
  const slots = new Set();
  for (const slot of value.organisation_capacity) {
    shape(object(slot) && typeof slot.slot === 'string' && identifierPattern.test(slot.slot) && !slots.has(slot.slot)
      && oneOf(slot.funding, ['included', 'paid', 'grant']) && nullableDate(slot.pending_end_on));
    slots.add(slot.slot);
  }
  for (const grant of value.grants) shape(object(grant) && typeof grant.kind === 'string' && date(grant.until));
}

/** Read a pushed or pulled body into one of the two accepted message kinds. */
export function readWirtMessage(value) {
  shape(object(value) && value.client === WIRT_CLIENT);
  if (value.schema === 'wirt.link-ended/v1') {
    shape(timestamp(value.ended_at));
    return { kind: 'link-ended', stream: readStream(value.stream), order: readOrder(value.order), endedAt: value.ended_at };
  }
  shape(value.schema === 'wirt.benefit-projection/v1');
  shape(Array.isArray(value.account_lineage) && value.account_lineage.length <= 64
    && value.account_lineage.every(account => typeof account === 'string' && identifierPattern.test(account))
    && timestamp(value.generated_at) && (value.source_operation === null || (typeof value.source_operation === 'string' && value.source_operation.length <= 128))
    && Array.isArray(value.pending) && Array.isArray(value.bindings_seen));
  readCommercial(value.commercial);
  readBenefits(value.benefits);
  return { kind: 'projection', stream: readStream(value.stream), order: readOrder(value.order), lineage: value.account_lineage, projection: value };
}

function readOrigin(value) {
  let url;
  try { url = new URL(value); } catch { throw wirtError('E_COMMERCIAL_CONFIGURATION'); }
  if (url.protocol !== 'https:' || url.origin !== value) throw wirtError('E_COMMERCIAL_CONFIGURATION');
  return url.origin;
}
export function readExactHttpsUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw wirtError('E_COMMERCIAL_CONFIGURATION'); }
  if (url.protocol !== 'https:' || url.toString() !== value || url.search || url.hash || url.username || url.password) throw wirtError('E_COMMERCIAL_CONFIGURATION');
  return value;
}

/**
 * Server-to-server Wirt client. Every call uses the configured origin, refuses redirects,
 * bounds response bytes and never returns token or key material in errors.
 */
export function createWirtClient({ origin, oauthClientId, callbackUrl, signing, fetch = globalThis.fetch, now = Date.now }) {
  const base = readOrigin(origin);
  readExactHttpsUrl(callbackUrl);
  if (typeof oauthClientId !== 'string' || oauthClientId.length === 0 || oauthClientId.length > 200) throw wirtError('E_COMMERCIAL_CONFIGURATION');

  async function call(path, { method = 'GET', json, form, account, bearer, sign = true } = {}) {
    const body = json !== undefined ? encoder.encode(JSON.stringify(json)) : form !== undefined ? encoder.encode(new URLSearchParams(form).toString()) : new Uint8Array();
    const headers = { accept: 'application/json' };
    if (json !== undefined) headers['content-type'] = 'application/json';
    if (form !== undefined) headers['content-type'] = 'application/x-www-form-urlencoded';
    if (bearer) headers.authorization = `Bearer ${bearer}`;
    if (sign) Object.assign(headers, await signedHeaders(signing, { method, path, body, account: account ?? '', now }));
    let response;
    try {
      response = await fetch(`${base}${path}`, { method, headers, body: method === 'GET' ? undefined : body, redirect: 'manual', signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    } catch { throw wirtError('E_COMMERCIAL_TRANSPORT'); }
    const bytes = await readBoundedBody(response).catch(() => { throw wirtError('E_COMMERCIAL_TRANSPORT'); });
    return { status: response.status, headers: response.headers, bytes };
  }

  /** A 410 answer is authoritative only when its RESPONSE signature binds the path, account and bytes. */
  async function terminal(result, path, productAccount) {
    await verifySignedMessage(signing, { method: 'RESPONSE', path, body: result.bytes, headers: result.headers, now }).then(({ account }) => {
      if (account !== String(productAccount)) throw wirtError('E_COMMERCIAL_SIGNATURE');
    });
    const message = readWirtMessage(parseJsonBytes(result.bytes));
    if (message.kind !== 'link-ended' || message.stream.productAccount !== productAccount) throw wirtError('E_COMMERCIAL_SHAPE');
    return { kind: 'ended', notice: message };
  }

  function grant(result) {
    if (result.status !== 200) throw wirtError('E_COMMERCIAL_GRANT', { status: result.status });
    const value = parseJsonBytes(result.bytes);
    if (!object(value) || typeof value.access_token !== 'string' || !value.access_token || typeof value.refresh_token !== 'string' || !value.refresh_token
      || !Number.isSafeInteger(value.expires_in) || value.expires_in <= 0) throw wirtError('E_COMMERCIAL_GRANT');
    return { accessToken: value.access_token, refreshToken: value.refresh_token, accessExpiresAt: new Date(now() + value.expires_in * 1000).toISOString() };
  }

  return {
    origin: base,
    async intent({ productAccount, challenge, state }) {
      const result = await call('/api/wirt/diffdevil/link-intents', { method: 'POST', json: { product_account: productAccount, challenge, state } });
      if (result.status !== 201) throw wirtError('E_COMMERCIAL_INTENT', { status: result.status });
      const value = parseJsonBytes(result.bytes);
      if (!object(value) || typeof value.intent !== 'string' || !uuidPattern.test(value.intent) || typeof value.authorization_url !== 'string') throw wirtError('E_COMMERCIAL_INTENT');
      let url;
      try { url = new URL(value.authorization_url); } catch { throw wirtError('E_COMMERCIAL_INTENT'); }
      // The customer is sent only to Wirt's own consent route for this exact intent.
      if (url.origin !== base || url.pathname !== `/wirt/products/diffdevil/link/${value.intent}` || url.search || url.hash) throw wirtError('E_COMMERCIAL_INTENT');
      return { intent: value.intent, authorizationUrl: url.toString() };
    },
    async exchangeCode({ code, verifier }) {
      return grant(await call('/api/oauth/token', { method: 'POST', sign: false,
        form: { grant_type: 'authorization_code', client_id: oauthClientId, redirect_uri: callbackUrl, code, code_verifier: verifier } }));
    },
    async refresh({ refreshToken }) {
      return grant(await call('/api/oauth/token', { method: 'POST', sign: false,
        form: { grant_type: 'refresh_token', client_id: oauthClientId, refresh_token: refreshToken, scope: WIRT_SCOPE } }));
    },
    async establish({ intent, accessToken, productAccount }) {
      const path = '/api/wirt/diffdevil/links';
      const result = await call(path, { method: 'POST', json: { intent }, bearer: accessToken });
      if (result.status === 410) return terminal(result, path, productAccount);
      if (result.status !== 201) return { kind: 'refused', status: result.status };
      const value = parseJsonBytes(result.bytes);
      shape(object(value));
      return { kind: 'established', stream: readStream(value.stream) };
    },
    async revoke({ linkId, accessToken }) {
      const result = await call(`/api/wirt/diffdevil/links/${encodeURIComponent(linkId)}`, { method: 'DELETE', bearer: accessToken });
      if (result.status === 204) return { kind: 'revoked' };
      return { kind: result.status === 401 ? 'unauthorized' : 'refused', status: result.status };
    },
    async pull({ linkId, productAccount }) {
      const path = `/api/wirt/diffdevil/links/${encodeURIComponent(linkId)}/projection`;
      const result = await call(path, { account: String(productAccount) });
      if (result.status === 410) return terminal(result, path, productAccount);
      if (result.status !== 200) return { kind: 'unavailable', status: result.status };
      return { kind: 'message', message: readWirtMessage(parseJsonBytes(result.bytes)) };
    },
    async report({ linkId, productAccount, body }) {
      const path = `/api/wirt/diffdevil/links/${encodeURIComponent(linkId)}/reports`;
      const result = await call(path, { method: 'POST', json: body, account: String(productAccount) });
      if (result.status === 410) return terminal(result, path, productAccount);
      if (result.status === 200) {
        const value = parseJsonBytes(result.bytes);
        return { kind: oneOf(value?.result, ['recorded', 'duplicate', 'out-of-order']) ? value.result : 'recorded', status: 200 };
      }
      if (result.status === 409) return { kind: 'conflict', status: 409 };
      if (result.status >= 500 || result.status === 429) return { kind: 'retry', status: result.status };
      // A signed report's 401 is a signature or clock-skew refusal, not an established permanent one: retry within the bounded backoff.
      if (result.status === 401) return { kind: 'retry', status: 401, code: 'E_COMMERCIAL_REPORT_UNAUTHENTICATED' };
      return { kind: 'refused', status: result.status };
    }
  };
}
