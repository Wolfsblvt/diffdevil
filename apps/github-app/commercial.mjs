// SPDX-License-Identifier: AGPL-3.0-only

import { protectedHeaders, validOrigin } from './authorization.mjs';
import { D1CommercialStore } from './commercial-storage.mjs';
import { WIRT_CLIENT, WIRT_NONCE_MS, createWirtClient, parseJsonBytes, readBoundedBody, readExactHttpsUrl, readSigningKeys, readWirtMessage, sha256Hex, verifySignedMessage } from './commercial-wirt.mjs';

export const COMMERCIAL_LINK_COOKIE = '__Host-diffdevil-works-link';
const ATTEMPT_MS = 10 * 60_000;
const ESTABLISHMENT_RETRY_MS = 24 * 60 * 60_000;
const GRANT_REFRESH_MARGIN_MS = 60_000;
const AUTHORITY_RECHECK_MS = 24 * 60 * 60_000;
const AUTHORITY_RECHECK_LIMIT = 200;
const REPORT_BACKOFF_SECONDS = [60, 300, 900, 3600, 14400];
const PREMIUM_STANDINGS = new Set(['funded', 'renewal-in-grace']);
const opaquePattern = /^[A-Za-z0-9_-]{43}$/u;
const encoder = new TextEncoder();

function refusal(code, status = 403) { return Object.assign(new Error(code), { code, status, headers: protectedHeaders() }); }
function base64Url(bytes) { return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, ''); }
function opaqueValue() { return base64Url(crypto.getRandomValues(new Uint8Array(32))); }
async function s256(verifier) { return base64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(verifier)))); }
async function opaqueDigest(value) {
  if (typeof value !== 'string' || !opaquePattern.test(value)) return undefined;
  return sha256Hex(value);
}
function cookie(value, maxAge) { return `${COMMERCIAL_LINK_COOKIE}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`; }
function json(status, body, headers = {}) { return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } }); }
const orderOf = link => link.applied_epoch === null || link.applied_epoch === undefined ? undefined : { epoch: link.applied_epoch, version: link.applied_version };
function compareOrder(left, right) { return left.epoch !== right.epoch ? Math.sign(left.epoch - right.epoch) : Math.sign(left.version - right.version); }
const observedAuthority = result => result?.authority === 'present' || result?.authority === 'absent' ? result.authority : 'unknown';
function plannedProjection(link) {
  if (!link?.projection_json) return undefined;
  try { return JSON.parse(link.projection_json); } catch { return undefined; }
}

/**
 * Decide one projection against the product's link record, before any state changes.
 * Wirt's ordering, lineage and link rules are in docs/commercial-projection.md#consumption-rules.
 */
export function decideProjection(link, message) {
  const last = orderOf(link);
  const comparison = last ? compareOrder(message.order, last) : 1;
  if (comparison === 0) return { kind: 'no-op' };
  if (comparison < 0) return { kind: 'not-applied' };
  if (message.stream.worksAccount === link.works_account) return { kind: 'apply' };
  // A later order may re-key the same link only when its lineage names the account the product recorded.
  return message.lineage.includes(link.works_account) ? { kind: 'apply-and-rekey' } : { kind: 'reject', reason: 'works-account-outside-lineage' };
}

/**
 * The server-selected plan for one funded namespace. Commercial standing never grants repository access.
 * A link held after a store restore is `unknown` until Wirt's current answer reconciles it.
 */
export function planForLink(link) {
  if (link?.state === 'active' && link.restored_at) return 'unknown';
  const projection = plannedProjection(link);
  if (!link || link.state !== 'active' || !projection) return 'free';
  return PREMIUM_STANDINGS.has(projection.commercial?.standing) ? projection.commercial.tier : 'free';
}

/**
 * Funding and current GitHub authority are separate facts. An organisation funded through a binding is
 * usable only after the encounter observes its funder's administration present; observed absence, or a check
 * that could not observe it, withholds use without ending the binding or the subscription.
 */
export function planForFunding({ link, binding } = {}) {
  const plan = planForLink(link);
  if (!binding || plan === 'free' || binding.authority_observed === 'present') return plan;
  return binding.authority_observed === 'absent' ? 'free' : 'unknown';
}

export function createCommercialService({ store, wirt, signing, authorization, protector, allowedOrigins = [], linkContinuationUrl, now = () => new Date().toISOString() }) {
  if (!store || !signing) throw new TypeError('Commercial storage and signing keys are required.');
  const origins = new Set(allowedOrigins);
  const continuation = linkContinuationUrl === undefined ? undefined : readExactHttpsUrl(linkContinuationUrl);
  const clock = () => Date.parse(now());
  const later = milliseconds => new Date(clock() + milliseconds).toISOString();

  function requireLinkRoute() {
    if (!wirt || !authorization || !protector || !continuation || origins.size === 0) throw refusal('E_COMMERCIAL_UNAVAILABLE', 503);
  }
  async function actor(session) {
    try { return await authorization.authenticate(session); }
    catch { throw refusal('E_SESSION_UNAVAILABLE', 401); }
  }

  function reportBody(link, stream, version, applied, bindings, refusals) {
    return { schema: 'wirt.product-report/v1', client: WIRT_CLIENT,
      stream: { works_account: stream.worksAccount, link: { id: link.link_id, product_account: { github_user_id: link.product_account } } },
      report_version: version, applied,
      // The stored body never holds a label; `disclosure` supplies it only while the report is pending.
      bindings: bindings.map(binding => ({ slot: binding.slot, github_org_id: binding.organisation_id, display: null, authority: binding.authority_observed, since: binding.since })),
      refused_bindings: refusals.map(value => ({ slot: value.slot, github_org_id: value.organisation_id, reason: value.reason })) };
  }
  /**
   * The version is clock-derived, so a report after a store restore still exceeds every version Wirt
   * already holds. A display label is disclosed only while authority was last observed present.
   */
  function report(link, stream, applied, bindings, refusals) {
    const version = Math.max(link.report_version + 1, clock());
    const labels = Object.fromEntries(bindings.filter(binding => binding.authority_observed === 'present' && binding.display).map(binding => [binding.slot, binding.display]));
    return { version, body: JSON.stringify(reportBody(link, stream, version, applied, bindings, refusals)),
      disclosure: Object.keys(labels).length > 0 ? JSON.stringify(labels) : null };
  }
  function outbound(row) {
    const body = JSON.parse(row.body), labels = row.disclosure ? JSON.parse(row.disclosure) : {};
    body.bindings = body.bindings.map(binding => ({ ...binding, display: binding.authority === 'present' ? labels[binding.slot] ?? null : null }));
    return body;
  }
  const lastApplied = link => ({ epoch: link.applied_epoch, version: link.applied_version, result: link.applied_result, reason: null, at: link.applied_at });

  /** Apply one authenticated Wirt message for a known link. Returns the typed outcome only. */
  async function applyMessage(message) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const link = await store.link(message.stream.linkId);
      if (!link || link.product_account !== message.stream.productAccount) throw refusal('E_COMMERCIAL_UNKNOWN_LINK', 404);
      if (message.kind === 'link-ended') {
        // Ending only removes benefits, so an authenticated notice for this exact link is final in any order.
        await store.endLink(link.link_id, { source: 'wirt-notice', endedAt: message.endedAt });
        return 'ended';
      }
      if (link.state !== 'active') throw refusal('E_COMMERCIAL_LINK_ENDED', 409);
      const decision = decideProjection(link, message);
      const [bindings, refusals] = await Promise.all([store.bindings(link.link_id), store.refusals(link.link_id)]);
      let change;
      if (decision.kind === 'apply' || decision.kind === 'apply-and-rekey') {
        const slots = new Set(message.projection.benefits.organisation_capacity.map(value => value.slot));
        // DiffDevil's documented unbinding rule: a slot absent from the applied capacity no longer funds its organisation.
        const removedSlots = bindings.filter(binding => !slots.has(binding.slot)).map(binding => binding.slot);
        const remaining = bindings.filter(binding => slots.has(binding.slot));
        // The whole order is applied. Organisation authority is a separate product fact carried on
        // `bindings[].authority`; Wirt treats `partially-applied` as a disagreement and opens a case.
        const applied = { epoch: message.order.epoch, version: message.order.version, result: 'applied', reason: null, at: now() };
        change = { applied: { ...applied, projectionJson: JSON.stringify(message.projection) }, worksAccount: message.stream.worksAccount, removedSlots,
          report: report(link, message.stream, applied, remaining, refusals) };
      } else if (decision.kind === 'reject') {
        change = { report: report(link, message.stream, { ...message.order, result: 'rejected', reason: decision.reason, at: now() }, bindings, refusals) };
      } else {
        // Equal is idempotent and lower is evidence: both report the order actually applied.
        const latest = await store.latestReport(link.link_id);
        if (latest?.state === 'pending' || !orderOf(link)) return decision.kind;
        change = { report: report(link, message.stream, lastApplied(link), bindings, refusals) };
      }
      if (await store.transition(link, change)) return decision.kind;
    }
    throw refusal('E_COMMERCIAL_CONFLICT', 409);
  }

  async function flushReport(row) {
    const link = await store.link(row.link_id);
    if (!link || link.state !== 'active') return 'skipped';
    // A queued report's label is not current authority. Re-observe before disclosure and use the
    // replacement report if that observation superseded the queued one.
    await observeBindings(link);
    row = await store.latestReport(link.link_id);
    if (!row || row.state !== 'pending' || row.next_attempt_at > now()) return 'skipped';
    let result;
    try { result = await wirt.report({ linkId: link.link_id, productAccount: link.product_account, body: outbound(row) }); }
    catch (error) { result = { kind: 'retry', code: error?.code ?? 'E_COMMERCIAL_TRANSPORT' }; }
    const attempts = row.attempts + 1;
    if (['recorded', 'duplicate', 'out-of-order'].includes(result.kind)) {
      await store.markReport(link.link_id, row.report_version, { state: 'sent', attempts, status: result.status });
      return 'sent';
    }
    if (result.kind === 'ended') {
      await store.endLink(link.link_id, { source: 'wirt-answer', endedAt: result.notice.endedAt });
      return 'ended';
    }
    if (result.kind === 'retry') {
      const delay = REPORT_BACKOFF_SECONDS[attempts - 1];
      await store.markReport(link.link_id, row.report_version, delay === undefined
        ? { state: 'failed', attempts, status: result.status ?? null, code: 'E_COMMERCIAL_REPORT_UNDELIVERED' }
        : { state: 'pending', attempts, nextAttemptAt: later(delay * 1000), status: result.status ?? null, code: result.code ?? 'E_COMMERCIAL_REPORT_RETRY' });
      return delay === undefined ? 'failed' : 'retrying';
    }
    // Divergence or refusal is reconciliation evidence for an operator, not something to resend blindly.
    await store.markReport(link.link_id, row.report_version, { state: 'failed', attempts, status: result.status ?? null,
      code: result.kind === 'conflict' ? 'E_COMMERCIAL_REPORT_CONFLICT' : 'E_COMMERCIAL_REPORT_REFUSED' });
    return 'failed';
  }

  async function flushReports(linkId) {
    if (!wirt) return [];
    const rows = linkId ? [await store.latestReport(linkId)].filter(row => row?.state === 'pending' && row.next_attempt_at <= now()) : await store.dueReports();
    const results = [];
    for (const row of rows) results.push(await flushReport(row));
    return results;
  }

  /** Persist a newly rotated owner grant before any further owner-token call. */
  async function ownerGrant(link, { force = false } = {}) {
    const grant = link.protected_grant ? await protector.open(link.protected_grant) : undefined;
    if (!grant?.accessToken || !grant?.refreshToken) throw refusal('E_COMMERCIAL_GRANT_UNAVAILABLE', 409);
    if (!force && Date.parse(grant.accessExpiresAt) > clock() + GRANT_REFRESH_MARGIN_MS) return grant;
    let next;
    try { next = await wirt.refresh({ refreshToken: grant.refreshToken }); }
    catch { throw refusal('E_COMMERCIAL_GRANT_UNAVAILABLE', 409); }
    if (!await store.replaceGrant(link.link_id, link.protected_grant, await protector.seal(next))) {
      const current = await store.link(link.link_id);
      if (!current || current.state !== 'active' || current.protected_grant === link.protected_grant) throw refusal('E_COMMERCIAL_GRANT_UNAVAILABLE', 409);
      return ownerGrant(current);
    }
    return next;
  }

  /** Pull Wirt's current answer for one link and apply it under the ordinary consumption rules. */
  async function pullCurrent(link) {
    let pulled;
    try { pulled = await wirt.pull({ linkId: link.link_id, productAccount: link.product_account }); }
    catch { return 'unavailable'; }
    if (pulled.kind === 'ended') {
      await store.endLink(link.link_id, { source: 'wirt-answer', endedAt: pulled.notice.endedAt });
      return 'ended';
    }
    if (pulled.kind !== 'message' || pulled.message.stream.linkId !== link.link_id) return 'unavailable';
    try { await applyMessage(pulled.message); } catch { return 'unavailable'; }
    return 'current';
  }

  /** A held link is released only by an authenticated current answer; anything else keeps it held for the next pass. */
  async function reconcileRestored() {
    const outcomes = { current: 0, ended: 0, unavailable: 0 };
    if (!wirt) return outcomes;
    for (let after = '', rows; (rows = await store.restoredLinks(after)).length > 0;) {
      for (const link of rows) {
        after = link.link_id;
        const outcome = await pullCurrent(link);
        if (outcome === 'current') await store.releaseRestoreHold(link.link_id, link.restored_at);
        outcomes[outcome]++;
      }
    }
    return outcomes;
  }

  /**
   * Record authority checks for one link: `present`, `absent`, or `unknown` when the check could not
   * observe it. A change re-reports the bindings so Wirt drops a label it may no longer show; a
   * confirmation only moves the check time.
   */
  async function recordObservations(linkId, observed) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const link = await store.link(linkId);
      if (!link || link.state !== 'active') return;
      const [bindings, refusals] = await Promise.all([store.bindings(linkId), store.refusals(linkId)]);
      const recorded = value => bindings.find(binding => binding.slot === value.slot && binding.organisation_id === value.organisationId);
      const current = observed.filter(value => recorded(value));
      const changes = current.filter(value => recorded(value).authority_observed !== value.authority
        || (value.authority === 'present' && recorded(value).display !== value.display));
      const confirm = () => Promise.all(current.filter(value => !changes.includes(value)).map(value => store.confirmObservation(linkId, value)));
      if (changes.length === 0) { await confirm(); return; }
      const next = bindings.map(binding => {
        const value = changes.find(candidate => candidate.slot === binding.slot && candidate.organisationId === binding.organisation_id);
        return value ? { ...binding, authority_observed: value.authority, display: value.authority === 'present' ? value.display : null } : binding;
      });
      const change = { observations: changes, ...(orderOf(link) ? { report: report(link, { worksAccount: link.works_account }, lastApplied(link), next, refusals) } : {}) };
      if (await store.transition(link, change)) { await confirm(); return; }
    }
    throw refusal('E_COMMERCIAL_CONFLICT', 409);
  }

  /** Observe the funder through their retained service grant, independently of browser presence. */
  async function observeBinding(link, binding) {
    let result;
    try { result = await authorization?.observeOrganisationAuthority({ userId: link.product_account, organisationId: binding.organisation_id }); }
    catch { result = undefined; }
    return { slot: binding.slot, organisationId: binding.organisation_id, authority: observedAuthority(result), display: result?.display ?? null };
  }

  async function observeBindings(link) {
    const observed = [];
    for (const binding of await store.bindings(link.link_id)) observed.push(await observeBinding(link, binding));
    if (observed.length > 0) await recordObservations(link.link_id, observed);
  }

  /**
   * Maintenance rechecks stale and unknown funder authority through the funder's retained authorization.
   * A check that cannot observe it records `unknown`, so an earlier `present` never stands in for current authority.
   */
  async function recheckAuthority() {
    if (!authorization?.observeOrganisationAuthority) return { observed: 0, unknown: 0 };
    const stale = await store.staleObservations(new Date(clock() - AUTHORITY_RECHECK_MS).toISOString(), AUTHORITY_RECHECK_LIMIT);
    const byLink = new Map();
    let unknown = 0;
    for (const binding of stale) {
      let result;
      try { result = await authorization.observeOrganisationAuthority({ userId: binding.product_account, organisationId: binding.organisation_id }); }
      catch { result = { authority: 'unknown' }; }
      const authority = observedAuthority(result);
      if (authority === 'unknown') unknown++;
      const values = byLink.get(binding.link_id) ?? [];
      values.push({ slot: binding.slot, organisationId: binding.organisation_id, authority, display: result.display ?? null });
      byLink.set(binding.link_id, values);
    }
    for (const [linkId, values] of byLink) await recordObservations(linkId, values);
    return { observed: stale.length - unknown, unknown };
  }

  /**
   * Use the attempt's retained owner grant, refreshing it first when its access token has expired. The
   * refreshed grant is persisted before its first use, because Wirt revokes the grant it replaces.
   */
  async function attemptGrant(stateHash, sealed, { force = false } = {}) {
    const grant = sealed ? await protector.open(sealed) : undefined;
    if (!grant?.accessToken || !grant?.refreshToken) return { kind: 'unavailable' };
    if (!force && Date.parse(grant.accessExpiresAt) > clock() + GRANT_REFRESH_MARGIN_MS) return { kind: 'grant', grant, sealed };
    let next;
    try { next = await wirt.refresh({ refreshToken: grant.refreshToken }); }
    catch (error) {
      // A refused refresh grant cannot recover this attempt; a transport or server failure still may.
      return { kind: error?.code === 'E_COMMERCIAL_GRANT' && error.status >= 400 && error.status < 500 ? 'refused' : 'unavailable' };
    }
    const nextSealed = await protector.seal(next);
    if (!await store.replaceAttemptGrant(stateHash, sealed, nextSealed)) {
      const current = await store.attempt(stateHash);
      if (!current || current.finished_at || !current.protected_grant || current.protected_grant === sealed) return { kind: 'unavailable' };
      return attemptGrant(stateHash, current.protected_grant);
    }
    await store.recordEstablishment(stateHash, 'grant-refreshed');
    return { kind: 'grant', grant: next, sealed: nextSealed };
  }

  /**
   * Establish the accepted intent with its retained owner grant. `pending` keeps the attempt for the same
   * intent: Wirt may already have committed the association, so a second consent is no substitute.
   */
  async function establish(userId, { stateHash, intentId, sealedGrant }) {
    let held = await attemptGrant(stateHash, sealedGrant);
    for (let attempt = 0; ; attempt++) {
      if (held.kind === 'refused') { await store.recordEstablishment(stateHash, 'grant-refused'); await store.finishAttempt(stateHash); return 'failed'; }
      if (held.kind !== 'grant') { await store.recordEstablishment(stateHash, 'grant-unavailable'); return 'pending'; }
      let result;
      try { result = await wirt.establish({ intent: intentId, accessToken: held.grant.accessToken, productAccount: userId }); }
      catch { await store.recordEstablishment(stateHash, 'outcome-unknown'); return 'pending'; }
      if (result.kind === 'refused' && result.status === 401 && attempt === 0) { held = await attemptGrant(stateHash, held.sealed, { force: true }); continue; }
      if (result.kind === 'ended') { await store.finishAttempt(stateHash); return 'ended'; }
      if (result.kind !== 'established') {
        await store.recordEstablishment(stateHash, `status-${result.status}`);
        // 403 means the intent was never committed and can no longer be; 409 means another active link exists.
        if (result.status === 403 || result.status === 409) { await store.finishAttempt(stateHash); return result.status === 409 ? 'conflict' : 'failed'; }
        return 'pending';
      }
      if (result.stream.productAccount !== userId) { await store.finishAttempt(stateHash); return 'failed'; }
      let link;
      try {
        link = await store.saveEstablishedLink({ linkId: result.stream.linkId, productAccount: userId, worksAccount: result.stream.worksAccount,
          intentId, protectedGrant: await protector.seal(held.grant) });
      } catch { await store.finishAttempt(stateHash); return 'conflict'; }
      await store.finishAttempt(stateHash);
      // The pull fallback gives a fresh link its current state without waiting for the next push.
      await pullCurrent(link);
      return 'linked';
    }
  }

  return {
    /** Signed Wirt push receiver: exact bytes, fresh single-use nonce, matching account and link before any state change. */
    async receive(request) {
      const url = new URL(request.url);
      if (request.method !== 'POST') return { response: json(405, { ok: false, code: 'E_METHOD' }) };
      if (url.search) return { response: json(400, { ok: false, code: 'E_COMMERCIAL_QUERY' }) };
      let body;
      try { body = await readBoundedBody(request); }
      catch { return { response: json(413, { ok: false, code: 'E_COMMERCIAL_BODY_LIMIT' }) }; }
      let verified;
      try { verified = await verifySignedMessage(signing, { method: 'POST', path: url.pathname, body, headers: request.headers, now: clock }); }
      catch { return { response: json(401, { ok: false, code: 'E_COMMERCIAL_SIGNATURE' }) }; }
      if (!await store.consumeNonce(await sha256Hex(`${WIRT_CLIENT}:${verified.nonce}`), later(WIRT_NONCE_MS))) return { response: json(409, { ok: false, code: 'E_COMMERCIAL_REPLAY' }) };
      let message;
      try { message = readWirtMessage(parseJsonBytes(body)); }
      catch { return { response: json(422, { ok: false, code: 'E_COMMERCIAL_SHAPE' }) }; }
      if (verified.account !== String(message.stream.productAccount)) return { response: json(404, { ok: false, code: 'E_COMMERCIAL_UNKNOWN_LINK' }) };
      try {
        const result = await applyMessage(message);
        return { response: json(200, { ok: true, result }), followUp: () => flushReports(message.stream.linkId) };
      } catch (error) {
        return { response: json(error?.status ?? 500, { ok: false, code: error?.code ?? 'E_COMMERCIAL_APPLY' }) };
      }
    },

    /** Begin a customer-approved Works link for the signed-in GitHub account; the browser is bound by cookie. */
    async beginLink({ session, method, origin }) {
      requireLinkRoute();
      validOrigin(origin, origins, method);
      const { userId } = await actor(session);
      if (await store.activeLink(userId)) throw refusal('E_COMMERCIAL_ALREADY_LINKED', 409);
      const unfinished = await store.unfinishedEstablishment(userId);
      if (unfinished) {
        // A lost establishment response is resumed with the same intent and owner grant rather than a second consent.
        const outcome = await establish(userId, { stateHash: unfinished.state_hash, intentId: unfinished.intent_id, sealedGrant: unfinished.protected_grant });
        if (outcome === 'linked') return { outcome, headers: protectedHeaders() };
        if (outcome === 'pending') throw refusal('E_COMMERCIAL_LINK_PENDING', 503);
      }
      const verifier = opaqueValue(), state = opaqueValue(), browserBinding = opaqueValue();
      let intent;
      try { intent = await wirt.intent({ productAccount: userId, challenge: await s256(verifier), state }); }
      catch { throw refusal('E_COMMERCIAL_UNAVAILABLE', 503); }
      await store.createLinkAttempt({ stateHash: await sha256Hex(state), browserHash: await sha256Hex(browserBinding), userId, intentId: intent.intent,
        protectedVerifier: await protector.seal({ verifier }), expiresAt: later(ATTEMPT_MS) });
      return { outcome: 'authorize', authorizationUrl: intent.authorizationUrl, headers: { ...protectedHeaders(), 'Set-Cookie': cookie(browserBinding, ATTEMPT_MS / 1000) } };
    },

    /** Wirt's redirect continues only in the initiating browser and the same signed-in product account. */
    async completeLink({ session, state, code, error, browserBinding }) {
      requireLinkRoute();
      const finish = outcome => {
        const location = new URL(continuation);
        location.searchParams.set('works-link', outcome);
        return { outcome, location: location.toString(), headers: { ...protectedHeaders(), 'Set-Cookie': cookie('', 0) } };
      };
      let userId;
      try { ({ userId } = await actor(session)); } catch { return finish('session-required'); }
      const [stateHash, browserHash] = await Promise.all([opaqueDigest(state), opaqueDigest(browserBinding)]);
      const attempt = stateHash && browserHash ? await store.consumeLinkAttempt(stateHash, browserHash, userId) : undefined;
      if (!attempt) return finish('invalid');
      if (error !== undefined && error !== null) return finish(error === 'access_denied' ? 'denied' : 'expired');
      if (typeof code !== 'string' || code.length === 0 || code.length > 2048) return finish('invalid');
      let grant;
      try { grant = await wirt.exchangeCode({ code, verifier: (await protector.open(attempt.protectedVerifier)).verifier }); }
      catch { return finish('failed'); }
      const sealedGrant = await protector.seal(grant);
      await store.holdExchangedGrant(stateHash, sealedGrant, later(ESTABLISHMENT_RETRY_MS));
      return finish(await establish(userId, { stateHash, intentId: attempt.intentId, sealedGrant }));
    },

    /** Unlink on the customer's behalf. Wirt durably ends the link before 204, so benefits stop here at once. */
    async unlink({ session, method, origin }) {
      requireLinkRoute();
      validOrigin(origin, origins, method);
      const { userId } = await actor(session);
      const link = await store.activeLink(userId);
      if (!link) throw refusal('E_COMMERCIAL_NOT_LINKED', 404);
      let result = await wirt.revoke({ linkId: link.link_id, accessToken: (await ownerGrant(link)).accessToken }).catch(() => ({ kind: 'refused' }));
      if (result.kind === 'unauthorized') {
        const current = await store.link(link.link_id);
        result = await wirt.revoke({ linkId: link.link_id, accessToken: (await ownerGrant(current, { force: true })).accessToken }).catch(() => ({ kind: 'refused' }));
      }
      if (result.kind !== 'revoked') throw refusal('E_COMMERCIAL_UNLINK_UNAVAILABLE', 409);
      await store.endLink(link.link_id, { source: 'product-unlink', endedAt: now() });
      return { body: { ok: true, result: 'unlinked' }, headers: protectedHeaders() };
    },

    /** Bind one purchased slot to an organisation the funder currently administers. Refusals are reported to Wirt. */
    async bind({ session, method, origin, slot, organisationId }) {
      requireLinkRoute();
      validOrigin(origin, origins, method);
      const authority = await authorization.organisationAuthority({ session, organisationId });
      for (let attempt = 0; attempt < 3; attempt++) {
        const link = await store.activeLink(authority.userId);
        const projection = plannedProjection(link);
        if (!link || !projection || !orderOf(link)) throw refusal('E_COMMERCIAL_NOT_LINKED', 404);
        if (!projection.benefits.organisation_capacity.some(value => value.slot === slot)) throw refusal('E_COMMERCIAL_SLOT_UNAVAILABLE', 409);
        const [bindings, refusals, existing] = await Promise.all([store.bindings(link.link_id), store.refusals(link.link_id), store.binding(organisationId)]);
        const stream = { worksAccount: link.works_account };
        let change, outcome;
        const reason = authority.authority !== 'present' ? 'organisation-authority-not-present'
          : existing && existing.link_id !== link.link_id ? 'organisation-has-funder'
            : existing && existing.slot !== slot ? 'organisation-already-bound' : undefined;
        if (reason) {
          const refused = { slot, organisationId, reason };
          change = { refusal: refused, report: report(link, stream, lastApplied(link), bindings,
            [...refusals.filter(value => value.slot !== slot || value.organisation_id !== organisationId), { slot, organisation_id: organisationId, reason }]) };
          outcome = 'refused';
        } else {
          const replaced = bindings.find(value => value.slot === slot && value.organisation_id !== organisationId);
          const current = bindings.find(value => value.slot === slot && value.organisation_id === organisationId);
          const binding = { slot, organisationId, authority: 'present', display: authority.display, since: current?.since ?? now().slice(0, 10) };
          const next = [...bindings.filter(value => value.slot !== slot), { slot, organisation_id: organisationId, authority_observed: 'present', display: authority.display, since: binding.since }]
            .sort((left, right) => left.slot.localeCompare(right.slot));
          change = { unbindSlot: replaced?.slot, binding, report: report(link, stream, lastApplied(link), next, refusals) };
          outcome = 'bound';
        }
        if (await store.transition(link, change)) return { body: { ok: outcome === 'bound', result: outcome, ...(reason ? { code: reason } : {}) }, headers: protectedHeaders() };
      }
      throw refusal('E_COMMERCIAL_CONFLICT', 409);
    },

    /** The funder may withdraw a binding, and a current organisation administrator may disconnect it. */
    async unbind({ session, method, origin, organisationId }) {
      requireLinkRoute();
      validOrigin(origin, origins, method);
      const viewer = await actor(session);
      for (let attempt = 0; attempt < 3; attempt++) {
        const existing = await store.binding(organisationId);
        if (!existing) return { body: { ok: true, result: 'unbound' }, headers: protectedHeaders() };
        const link = await store.link(existing.link_id);
        if (link.product_account !== viewer.userId && (await authorization.organisationAuthority({ session, organisationId })).authority !== 'present') throw refusal('E_COMMERCIAL_BINDING_UNAUTHORIZED');
        const [bindings, refusals] = await Promise.all([store.bindings(link.link_id), store.refusals(link.link_id)]);
        const remaining = bindings.filter(value => value.organisation_id !== organisationId);
        const change = { unbindSlot: existing.slot, ...(orderOf(link) ? { report: report(link, { worksAccount: link.works_account }, lastApplied(link), remaining, refusals) } : {}) };
        if (await store.transition(link, change)) return { body: { ok: true, result: 'unbound' }, headers: protectedHeaders() };
      }
      throw refusal('E_COMMERCIAL_CONFLICT', 409);
    },

    /**
     * Disconnect the session owner's GitHub grant without unbinding or changing commercial standing.
     * Grant revocation commits first. A later observation/outbox failure returns that performed effect
     * explicitly, so the caller cannot present it as an unperformed disconnect and ask for a retry.
     * A future designed Account router owns the URL and disclosures; this method selects no screen.
     */
    async revokeFundingAuthorization({ session, method, origin }) {
      if (!authorization?.revokeAuthorization) throw refusal('E_COMMERCIAL_UNAVAILABLE', 503);
      const revoked = await authorization.revokeAuthorization({ session, method, origin });
      try {
        const link = await store.activeLink(revoked.userId);
        if (link) {
          const observed = (await store.bindings(link.link_id)).map(binding => ({ slot: binding.slot,
            organisationId: binding.organisation_id, authority: 'unknown', display: null }));
          if (observed.length > 0) await recordObservations(link.link_id, observed);
        }
      } catch (error) {
        return { headers: revoked.headers, body: { ok: false, result: 'authorization-revoked', authorityReconciliation: 'required',
          code: error?.code === 'E_COMMERCIAL_CONFLICT' ? error.code : 'E_COMMERCIAL_AUTHORITY_RECONCILIATION' } };
      }
      return { headers: revoked.headers, body: { ok: true, result: 'authorization-revoked', authorityReconciliation: 'recorded' } };
    },

    /**
     * The signed-in account's own commercial standing, without payment instruments or other accounts.
     * Reading it re-observes the funder's authority for each bound organisation.
     */
    async status({ session }) {
      if (!authorization) throw refusal('E_COMMERCIAL_UNAVAILABLE', 503);
      const { userId } = await actor(session);
      let link = await store.activeLink(userId);
      if (!link) return { body: { linked: false }, headers: protectedHeaders() };
      const observed = [];
      for (const binding of await store.bindings(link.link_id)) {
        let result;
        try { result = await authorization.organisationAuthority({ session, organisationId: binding.organisation_id }); }
        catch { result = { authority: 'unknown' }; }
        observed.push({ slot: binding.slot, organisationId: binding.organisation_id, authority: observedAuthority(result), display: result.display ?? null });
      }
      if (observed.length > 0) {
        await recordObservations(link.link_id, observed);
        link = await store.activeLink(userId);
        if (!link) return { body: { linked: false }, headers: protectedHeaders() };
      }
      const projection = plannedProjection(link);
      const bindings = await store.bindings(link.link_id);
      const commercial = projection?.commercial;
      return { headers: protectedHeaders(), body: { linked: true, plan: planForLink(link), reconciling: Boolean(link.restored_at),
        commercial: commercial ? { standing: commercial.standing, tier: commercial.tier, cadence: commercial.cadence, period: commercial.period,
          renewalPreference: commercial.renewal_preference, cancellationIntent: commercial.cancellation_intent, grace: commercial.grace,
          ended: commercial.ended, nextRenewal: commercial.next_renewal } : null,
        pending: projection?.pending ?? [],
        capacity: (projection?.benefits.organisation_capacity ?? []).map(value => {
          const binding = bindings.find(candidate => candidate.slot === value.slot);
          return { slot: value.slot, funding: value.funding, pendingEndOn: value.pending_end_on,
            binding: binding ? { organisationId: binding.organisation_id, authority: binding.authority_observed, authorityCheckedAt: binding.authority_checked_at,
              display: binding.authority_observed === 'present' ? binding.display : null } : null };
        }) } };
    },

    /**
     * Entitlement adapter for analytical reads: 'free' | 'pro' | 'business', or 'unknown' when the namespace is
     * unestablished, its link awaits restore reconciliation, or its funder's authority is unobserved.
     */
    async entitlement({ repositoryId, actor: viewer }) {
      const account = repositoryId === null ? viewer?.userId : await store.repositoryNamespace(repositoryId);
      if (!Number.isSafeInteger(account) || account <= 0) return 'unknown';
      for (let attempt = 0; attempt < 3; attempt++) {
        const funding = await store.funding(account);
        if (!funding.binding) return planForFunding(funding);
        await recordObservations(funding.link.link_id, [await observeBinding(funding.link, funding.binding)]);
        const current = await store.funding(account);
        // A concurrent rebind belongs to its new funder; never carry the old observation across it.
        if (current.link?.link_id === funding.link.link_id && current.binding?.slot === funding.binding.slot) return planForFunding(current);
      }
      throw refusal('E_COMMERCIAL_CONFLICT', 409);
    },

    /**
     * Operator seam for the restore occasion: run once after the App database is restored or imported to an
     * earlier point, before Works-funded benefits are served again. Every active link is held, then reconciled
     * against Wirt's current answer; a link Wirt cannot answer for stays held for scheduled maintenance.
     */
    async reconcileAfterRestore() {
      if (!wirt) throw refusal('E_COMMERCIAL_UNAVAILABLE', 503);
      const held = await store.holdRestoredLinks(now());
      const outcomes = await reconcileRestored();
      await flushReports();
      return { held, ...outcomes };
    },

    flushReports,
    applyMessage,
    async maintain() {
      await store.maintain();
      const restored = await reconcileRestored();
      const authority = await recheckAuthority();
      return { restored, authority, reports: await flushReports() };
    }
  };
}

/**
 * Build the consumer from Worker bindings. Without signing keys every commercial route stays unavailable;
 * the browser link routes additionally need the installed authorization, protector and dashboard origins.
 */
export function commercialFromEnv(env, { store, authorization, protector, allowedOrigins, linkContinuationUrl, fetch, now } = {}) {
  if (!env?.WIRT_SIGNING_KEY_CURRENT) return undefined;
  const signing = readSigningKeys({ activeKeyId: env.WIRT_ACTIVE_KEY_ID ?? 'current', current: env.WIRT_SIGNING_KEY_CURRENT, previous: env.WIRT_SIGNING_KEY_PREVIOUS });
  const wirt = env.WIRT_ORIGIN
    ? createWirtClient({ origin: env.WIRT_ORIGIN, oauthClientId: env.WIRT_OAUTH_CLIENT_ID, callbackUrl: env.WIRT_LINK_CALLBACK_URL, signing,
      ...(fetch ? { fetch } : {}), ...(now ? { now: () => Date.parse(now()) } : {}) })
    : undefined;
  return createCommercialService({ store: store ?? new D1CommercialStore(env.APP_DB), wirt, signing, authorization, protector, allowedOrigins,
    linkContinuationUrl: linkContinuationUrl ?? env.WIRT_LINK_CONTINUATION_URL, ...(now ? { now } : {}) });
}
