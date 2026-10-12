// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0

/**
 * Wirt projection protocol: exact-byte request signing, the bounded server-to-server client,
 * and the payload shapes diffdevil consumes. Wirt's adopted producer contract owns the grammar:
 * docs/commercial-projection-runtime.md and docs/commercial-projection.md at Wirt 04e253a8;
 * native beta_grants and commercial_timezone are candidate c33d5d9, pending producer/consumer acceptance.
 * The paired reward-only nullable commercial branch and component display facts follow Wirt c3e0671fa6e98e8835bfdbbaff7244ab27c7f892.
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
  const betaGrants = readProjectionBetaGrants(value);
  return { ...value, ...(betaGrants === null ? {} : { beta_grants: betaGrants }),
    ...(value.commercial_timezone === undefined ? {} : { commercial_timezone: readProjectionCommercialTimeZone(value) }) };
}

/** Native installation calendar; legacy, invalid and numeric-offset values establish no date basis. */
export function readProjectionCommercialTimeZone(benefits) {
  const timeZone = benefits?.commercial_timezone;
  if (typeof timeZone !== 'string' || !timeZone || /^[+-]/u.test(timeZone)) return null;
  try { new Intl.DateTimeFormat('en-CA', { timeZone }).format(0); return timeZone; }
  catch { return null; }
}

/** Native beta facts: null is a legacy unknown; an empty array is an explicit absence. Private basis stays in Wirt. */
export function readProjectionBetaGrants(benefits) {
  if (benefits?.beta_grants === undefined) return null;
  shape(Array.isArray(benefits.beta_grants));
  const ids = new Set();
  const window = value => {
    shape(object(value) && date(value.started_on) && date(value.until) && value.started_on < value.until);
    return { started_on: value.started_on, until: value.until };
  };
  return benefits.beta_grants.map(value => {
    shape(object(value) && positive(value.id) && !ids.has(value.id) && value.kind === 'beta' && value.product === 'diffdevil'
      && value.tier === 'pro' && value.promised_units === 30 && Number.isSafeInteger(value.remaining_units)
      && value.remaining_units >= 0 && value.remaining_units <= 30 && Array.isArray(value.access_windows)
      && (value.original_window === null || object(value.original_window)) && (value.current_access === null || object(value.current_access)));
    ids.add(value.id);
    return { id: value.id, kind: value.kind, product: value.product, tier: value.tier, promised_units: value.promised_units,
      original_window: value.original_window === null ? null : window(value.original_window), access_windows: value.access_windows.map(window),
      current_access: value.current_access === null ? null : window(value.current_access), remaining_units: value.remaining_units };
  });
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
  if (value.commercial !== null) readCommercial(value.commercial);
  const benefits = readBenefits(value.benefits);
  // Wirt's explicit reward-only branch carries no base coverage, even when an additive reward is queued.
  if (value.commercial === null) {
    const components = readProjectionFundedComponents(benefits);
    shape(benefits.organisation_capacity.length === 0 && benefits.grants.length === 0 && benefits.protection === null
      && value.pending.length === 0 && components !== null && components.length > 0
      && components.every(component => oneOf(component.state, ['queued', 'expired'])));
  }
  return { kind: 'projection', stream: readStream(value.stream), order: readOrder(value.order), lineage: value.account_lineage, projection: { ...value, benefits } };
}

// Participation reward facts (Wirt `RewardFacts::visible`, its rewards route and its reward-quote route). The reader keeps
// only what the customer may see or what reconciliation needs: the public campaign name and reason, the typed standing,
// the alternatives with Wirt's remaining-use and first-eligible facts, and confirmed applications with Wirt's amounts.
// Operation identities, actor records and correction evidence stay in Wirt.
export const REWARD_STATES = Object.freeze(['available', 'accepted', 'reserved', 'partially-consumed', 'consumed', 'expired', 'corrected']);
const ALTERNATIVE_STANDINGS = Object.freeze([...REWARD_STATES, 'retired']);
const cents = value => Number.isSafeInteger(value) && value >= 0;
const nullableCents = value => value === null || value === undefined || cents(value);
const shortText = (value, limit = 240) => typeof value === 'string' && value.length > 0 && value.length <= limit;
const nullableTimestamp = value => value === null || value === undefined || timestamp(value);
const day = value => (typeof value === 'string' && value.length >= 10 && datePattern.test(value.slice(0, 10)) ? value.slice(0, 10) : null);

function readDiscountLine(value) {
  shape(object(value) && cents(value.amount_cents) && object(value.promise));
  const promise = value.promise;
  return { amountCents: value.amount_cents, reason: shortText(promise.campaign?.reason) ? promise.campaign.reason : null,
    campaignKey: typeof promise.campaign?.key === 'string' ? promise.campaign.key : null, campaignVersion: Number.isSafeInteger(promise.campaign?.version) ? promise.campaign.version : null,
    rewardKey: typeof promise.key === 'string' ? promise.key : null, cadence: oneOf(promise.cadence, ['monthly', 'annual']) ? promise.cadence : null,
    unit: oneOf(promise.unit, ['percent', 'fixed']) ? promise.unit : null, value: Number.isSafeInteger(promise.value) ? promise.value : null,
    remainingUsesAfter: Number.isSafeInteger(value.remaining_uses_after) ? value.remaining_uses_after : null,
    postRewardBaseCents: cents(value.post_reward_base_cents) ? value.post_reward_base_cents : null };
}

/** One participation reward as Wirt's customer-visible facts describe it. */
export function readRewardFacts(value) {
  shape(object(value) && object(value.basis) && object(value.basis.campaign) && typeof value.basis.campaign.key === 'string'
    && Number.isSafeInteger(value.basis.campaign.version) && shortText(value.basis.campaign.reason) && typeof value.state === 'string'
    && Array.isArray(value.alternatives) && value.alternatives.length >= 1 && value.alternatives.length <= 8
    && (value.applications === undefined || (Array.isArray(value.applications) && value.applications.length <= 64)));
  const basis = value.basis;
  const alternatives = value.alternatives.map(alternative => {
    shape(object(alternative) && typeof alternative.key === 'string' && oneOf(alternative.kind, ['discount', 'time'])
      && oneOf(alternative.cadence, ['monthly', 'annual']) && typeof alternative.tier === 'string');
    return { key: alternative.key, kind: alternative.kind, tier: alternative.tier, cadence: alternative.cadence,
      unit: oneOf(alternative.unit, ['percent', 'fixed']) ? alternative.unit : null, value: Number.isSafeInteger(alternative.value) ? alternative.value : null,
      uses: Number.isSafeInteger(alternative.uses) ? alternative.uses : null,
      remainingUses: Number.isSafeInteger(alternative.remaining_uses) ? alternative.remaining_uses : null,
      firstEligibleOn: day(alternative.first_eligible_on), standing: oneOf(alternative.standing, ALTERNATIVE_STANDINGS) ? alternative.standing : 'unknown' };
  });
  const applications = (value.applications ?? []).map(application => {
    shape(object(application) && nullableTimestamp(application.at) && object(application.discount));
    return { at: application.at ?? null, ...readDiscountLine(application.discount) };
  });
  return { id: String(value.id ?? ''), campaign: { key: basis.campaign.key, version: basis.campaign.version, name: shortText(basis.campaign.name, 160) ? basis.campaign.name : null, reason: basis.campaign.reason },
    kind: oneOf(basis.kind, ['discount', 'time']) ? basis.kind : 'discount', state: oneOf(value.state, REWARD_STATES) ? value.state : 'unknown',
    selected: typeof value.selected_reward === 'string' ? value.selected_reward : null,
    claimClosesAt: timestamp(basis.claim_closes_at) ? basis.claim_closes_at : null, validUntil: timestamp(basis.valid_until) ? basis.valid_until : null,
    alternatives, applications };
}

/** A projection's optional participation rewards: `null` when Wirt did not send the field, never an invented empty list. */
export function readProjectionRewards(benefits) {
  if (!object(benefits) || benefits.participation_rewards === undefined) return null;
  if (!Array.isArray(benefits.participation_rewards) || benefits.participation_rewards.length > 64) return null;
  try { return benefits.participation_rewards.map(readRewardFacts); } catch { return null; }
}

/** Display-only component rewards; absent or unreadable facts stay unknown and never select access or capacity. */
export function readProjectionFundedComponents(benefits) {
  if (!object(benefits) || !Array.isArray(benefits.funded_components)) return null;
  try {
    return benefits.funded_components.map(value => {
      shape(object(value) && typeof value.component_id === 'string' && identifierPattern.test(value.component_id) && value.funding === 'participation-reward'
        && value.component_kind === 'paid-subject' && value.capacity_type === 'organisation'
        && shortText(value.name, 160) && shortText(value.reason) && typeof value.state === 'string'
        && nullableDate(value.starts_on) && nullableDate(value.ends_on) && nullableTimestamp(value.application_deadline));
      return { id: value.component_id, name: value.name, reason: value.reason,
        state: oneOf(value.state, ['available', 'queued', 'active', 'expired', 'ended', 'corrected', 'withdrawn']) ? value.state : 'unknown',
        startsOn: value.starts_on, endsOn: value.ends_on, applicationDeadline: value.application_deadline ?? null };
    });
  } catch { return null; }
}

function readNextCharge(value) {
  if (value === null || value === undefined) return null;
  shape(object(value) && date(day(value.on)) && cents(value.amount_cents) && nullableCents(value.base_total_cents) && Array.isArray(value.discounts));
  return { on: day(value.on), amountCents: value.amount_cents, baseTotalCents: value.base_total_cents ?? null, discounts: value.discounts.map(readDiscountLine) };
}

function readQuote(value, cadence) {
  shape(object(value) && value.schema === 'wirt.participation-quote/v1' && typeof value.quote_id === 'string' && value.cadence === cadence
    && Array.isArray(value.charges) && value.charges.length <= 32 && Array.isArray(value.discounts) && cents(value.due_now_cents) && nullableCents(value.post_reward_total_cents));
  return { quoteId: value.quote_id, cadence, tier: typeof value.tier === 'string' ? value.tier : null, currency: typeof value.currency === 'string' ? value.currency : 'EUR',
    reviewUrl: typeof value.review_url === 'string' ? value.review_url : null, expiresOn: day(value.expires_on),
    charges: value.charges.map(charge => { shape(object(charge) && cents(charge.amount_cents)); return { component: typeof charge.component_id === 'string' ? charge.component_id : null, amountCents: charge.amount_cents }; }),
    discounts: value.discounts.map(readDiscountLine), dueNowCents: value.due_now_cents, postRewardTotalCents: value.post_reward_total_cents ?? null };
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
    },
    /**
     * Deliver one participation completion: only the campaign, its version, the durable business event identity, the
     * opaque product completion identity and the completion time. The fresh transport nonce is the signature's own. The
     * link and the signed product account select the Works account; survey answers never leave. Wirt states `accepted`
     * or `replayed` for this exact event with its reward facts; an answer that does not state one of them for this event
     * is `unreadable`, never inferred. A thrown transport failure means the outcome is unknown.
     */
    async completeParticipation({ linkId, productAccount, completion }) {
      const path = `/api/wirt/diffdevil/links/${encodeURIComponent(linkId)}/participation-completions`;
      const result = await call(path, { method: 'POST', json: { campaign: completion.campaign, version: completion.version, event_id: completion.eventId, completion_id: completion.completionId, completed_at: completion.completedAt }, account: String(productAccount) });
      if (result.status === 410) return terminal(result, path, productAccount);
      if (result.status === 200 || result.status === 201) {
        let value, reward;
        try { value = parseJsonBytes(result.bytes); reward = readRewardFacts(value?.reward); }
        catch { return { kind: 'unreadable', status: result.status }; }
        if (value.schema !== 'wirt.participation-result/v1' || !oneOf(value.result, ['accepted', 'replayed']) || value.event_id !== completion.eventId) return { kind: 'unreadable', status: result.status };
        return { kind: value.result, status: result.status, reward };
      }
      if (result.status === 429 || result.status === 503) return { kind: 'unavailable', status: result.status };
      if (result.status >= 500) return { kind: 'unknown', status: result.status };
      if (result.status === 401) return { kind: 'unavailable', status: 401, code: 'E_COMMERCIAL_COMPLETION_UNAUTHENTICATED' };
      return { kind: 'refused', status: result.status };
    },
    /** The customer's participation rewards and the next charge's authoritative discount lines. */
    async rewards({ linkId, productAccount }) {
      const path = `/api/wirt/diffdevil/links/${encodeURIComponent(linkId)}/rewards`;
      const result = await call(path, { account: String(productAccount) });
      if (result.status === 410) return terminal(result, path, productAccount);
      if (result.status !== 200) return { kind: 'unavailable', status: result.status };
      const value = parseJsonBytes(result.bytes);
      shape(object(value) && value.schema === 'wirt.participation-result/v1' && Array.isArray(value.rewards) && value.rewards.length <= 64);
      return { kind: 'rewards', nextCharge: readNextCharge(value.next_charge), rewards: value.rewards.map(readRewardFacts) };
    },
    /** A Pro continuation preview through Wirt's own quote. A preview reserves nothing; acceptance stays at Works. */
    async rewardQuote({ linkId, productAccount, cadence }) {
      const path = `/api/wirt/diffdevil/links/${encodeURIComponent(linkId)}/reward-quotes`;
      const result = await call(path, { method: 'POST', json: { tier: 'Pro', cadence }, account: String(productAccount) });
      if (result.status === 410) return terminal(result, path, productAccount);
      if (result.status === 409) return { kind: 'not-quotable', status: 409 };
      if (result.status !== 200) return { kind: 'unavailable', status: result.status };
      const quote = readQuote(parseJsonBytes(result.bytes), cadence);
      // The customer reviews the quote only on Wirt's own origin.
      if (quote.reviewUrl) { try { if (new URL(quote.reviewUrl).origin !== base) quote.reviewUrl = null; } catch { quote.reviewUrl = null; } }
      return { kind: 'quote', quote };
    }
  };
}
