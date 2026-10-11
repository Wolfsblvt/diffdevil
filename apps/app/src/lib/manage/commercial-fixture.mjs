// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * A local stand-in for the Wirt commercial consumer, honoured only on a loopback origin (like the entitlement
 * fixture): the Pro and Business presentation of Manage, the slot bindings, the first link and the return from Works
 * can be exercised without a Works account, signing keys or a Wirt host. It answers the same method shapes as
 * `apps/github-app/commercial.mjs` (status, bind, unbind, beginLink, unlink, entitlement, disconnect and reconnect),
 * keeps its state per isolate so a browser journey sees its own mutations, and reaches the real authorization
 * service for the funding connection, which is the real D1 fact. `APP_COMMERCIAL_FIXTURE` carries the JSON spec.
 * Its `participation` part stands in for Wirt's participation-reward routes: a completion earns the campaign's reward
 * once, and the stand-in page reserves, confirms, renews, releases, expires or corrects it as Works would. Its quote
 * figures are the stand-in's own Wirt-side arithmetic, which diffdevil only displays. Nothing here is a Works link, a
 * payment or a plan.
 */
import { protectedHeaders, validOrigin } from '../../../../github-app/authorization.mjs';
import { readRewardFacts } from '../../../../github-app/commercial-wirt.mjs';

const states = new Map();
const PREMIUM = new Set(['funded', 'renewal-in-grace']);
function refusal(code, status = 403) { return Object.assign(new Error(code), { code, status, headers: protectedHeaders() }); }

export function readCommercialFixture(value) {
  if (!value) return undefined;
  const spec = typeof value === 'string' ? JSON.parse(value) : value;
  if (!spec || typeof spec !== 'object' || !Number.isSafeInteger(spec.account)) throw new TypeError('APP_COMMERCIAL_FIXTURE needs the numeric account it describes.');
  return spec;
}

export function createCommercialFixture(spec, { authorization, namespaceOf, allowedOrigins = [], origin, now = () => new Date().toISOString() }) {
  const key = JSON.stringify(spec);
  if (!states.has(key)) {
    states.set(key, { linked: spec.linked === true, since: spec.since ?? now().slice(0, 10), commercial: spec.commercial ? structuredClone(spec.commercial) : null, pending: structuredClone(spec.pending ?? []), grants: structuredClone(spec.grants ?? []), betaGrants: spec.betaGrants ? structuredClone(spec.betaGrants) : null,
      protection: spec.protection ? structuredClone(spec.protection) : null, capacity: structuredClone(spec.capacity ?? []).map(slot => ({ slot: slot.slot, funding: slot.funding ?? 'paid', pendingEndOn: slot.pending_end_on ?? slot.pendingEndOn ?? null, binding: slot.binding ? { organisationId: slot.binding.organisationId, authority: slot.binding.authority ?? 'present', authorityCheckedAt: now(), display: slot.binding.display ?? null } : null })),
      others: { ...(spec.others ?? {}) }, order: 1,
      participation: spec.participation ? { campaign: structuredClone(spec.participation.campaign), answer: spec.participation.answer ?? 'recorded', paid: spec.participation.paid === true, earned: null, completions: [] } : null });
  }
  const state = states.get(key);
  const origins = new Set(allowedOrigins);
  const actor = async session => { try { return await authorization.authenticate(session); } catch { throw refusal('E_SESSION_UNAVAILABLE', 401); } };
  const ownPlan = () => (state.linked && state.commercial && PREMIUM.has(state.commercial.standing) ? state.commercial.tier : 'free');
  // Wirt's participation side, in its own visible-fact shape (RewardFacts::visible), read back through the real reader.
  const PRICES = { monthly: 900, annual: 9000 };
  const rewardRaw = () => {
    const earned = state.participation?.earned;
    if (!earned) return null;
    const campaign = state.participation.campaign;
    const consumed = earned.applications.length;
    const selected = earned.selected;
    const standing = earned.corrected ? 'corrected' : earned.reserved ? 'reserved' : earned.expired ? 'expired'
      : selected && consumed >= campaign.rewards.find(reward => reward.key === selected).uses ? 'consumed' : consumed > 0 ? 'partially-consumed' : earned.attached ? 'accepted' : 'available';
    const paidCadence = state.participation.paid && earned.attached ? state.commercial.cadence : null;
    return { id: earned.id, state: standing, selected_reward: selected,
      basis: { kind: 'discount', campaign: { id: 1, key: campaign.key, version: campaign.version, name: campaign.name, reason: campaign.reason }, claim_closes_at: campaign.claim_closes_at, valid_until: campaign.valid_until, alternatives: campaign.rewards },
      applications: earned.applications.map(entry => ({ operation_id: entry.operation, at: entry.at, discount: entry.line })),
      alternatives: campaign.rewards.map(reward => ({ ...reward, remaining_uses: Math.max(0, reward.uses - (selected === reward.key ? consumed : 0)),
        first_eligible_on: !earned.reserved && !['consumed', 'expired', 'corrected'].includes(standing) && paidCadence === reward.cadence && (selected === null || selected === reward.key) ? state.commercial.period.ends_on : null,
        standing: selected !== null && selected !== reward.key ? 'retired' : standing })) };
  };
  const rewardFacts = () => { const raw = rewardRaw(); return raw ? [readRewardFacts(raw)] : []; };
  const discountLine = cadence => {
    const earned = state.participation?.earned, campaign = state.participation?.campaign;
    if (!earned || earned.corrected || earned.expired || (earned.selected && campaign.rewards.find(reward => reward.key === earned.selected).cadence !== cadence)) return null;
    const reward = campaign.rewards.find(candidate => candidate.cadence === cadence);
    const remaining = reward.uses - (earned.selected === reward.key ? earned.applications.length : 0);
    if (remaining < 1) return null;
    return { benefit_id: earned.id, amount_cents: Math.round(PRICES[cadence] * reward.value / 100), component_id: 'discount', remaining_uses_after: remaining - 1, post_reward_base_cents: PRICES[cadence],
      promise: { ...reward, campaign: { key: campaign.key, version: campaign.version, name: campaign.name, reason: campaign.reason }, remaining_uses: remaining } };
  };
  const readLine = line => ({ amountCents: line.amount_cents, reason: line.promise.campaign.reason, campaignKey: line.promise.campaign.key, campaignVersion: line.promise.campaign.version, rewardKey: line.promise.key,
    cadence: line.promise.cadence, unit: line.promise.unit, value: line.promise.value, remainingUsesAfter: line.remaining_uses_after, postRewardBaseCents: line.post_reward_base_cents });
  const body = () => ({ linked: state.linked, plan: ownPlan(), reconciling: false, commercial: state.commercial ? { standing: state.commercial.standing, tier: state.commercial.tier, cadence: state.commercial.cadence, period: state.commercial.period, renewalPreference: state.commercial.renewal_preference, cancellationIntent: state.commercial.cancellation_intent, grace: state.commercial.grace ?? null, ended: state.commercial.ended ?? null, nextRenewal: state.commercial.next_renewal ?? null } : null,
    pending: state.pending, grants: state.grants, betaGrants: state.betaGrants, protection: state.protection, capacity: state.capacity.map(slot => ({ ...slot, binding: slot.binding ? { ...slot.binding, display: slot.binding.authority === 'present' ? slot.binding.display : null } : null })), order: state.order, linkedSince: state.since, participationRewards: state.participation ? rewardFacts() : null, fixture: true });

  return {
    source: 'fixture',
    betaTimeZone: spec.betaTimeZone ?? null,
    async status({ session }) { await actor(session); return { body: body(), headers: protectedHeaders() }; },
    async entitlement({ repositoryId, actor: viewer }) {
      const account = repositoryId === null ? viewer?.userId : await namespaceOf({ repositoryId });
      if (!Number.isSafeInteger(account)) return 'unknown';
      if (account === spec.account) return ownPlan();
      const bound = state.capacity.find(slot => slot.binding?.organisationId === account);
      if (bound && state.linked) return bound.binding.authority === 'present' ? ownPlan() : bound.binding.authority === 'absent' ? 'free' : 'unknown';
      return state.others[String(account)] ?? 'free';
    },
    async fundingScope({ accountId }) {
      if (!Number.isSafeInteger(accountId)) return { kind: 'unknown' };
      if (accountId === spec.account) return state.linked ? { kind: 'personal', subscriber: accountId } : { kind: 'none' };
      return state.linked && state.capacity.some(slot => slot.binding?.organisationId === accountId) ? { kind: 'organisation', subscriber: spec.account } : { kind: 'none' };
    },
    /** Moves the stand-in's plan the way an applied Works order would (a reduction at its effective date), for local journeys. */
    applyPlan(tier) {
      if (!state.commercial) return 'nothing';
      if (tier === 'free') { state.commercial = { ...state.commercial, standing: 'ended', ended: { on: now().slice(0, 10), reason: 'cancelled' } }; state.pending = []; }
      else { state.commercial = { ...state.commercial, tier, standing: 'funded' }; state.pending = []; }
      state.order++;
      return 'applied';
    },
    async beginLink({ session, method, origin: requestOrigin }) {
      validOrigin(requestOrigin, origins, method);
      await actor(session);
      if (state.linked) throw refusal('E_COMMERCIAL_ALREADY_LINKED', 409);
      return { outcome: 'authorize', authorizationUrl: `${origin}/manage/works-stand-in?dest=link`, headers: protectedHeaders() };
    },
    async unlink({ session, method, origin: requestOrigin }) {
      validOrigin(requestOrigin, origins, method);
      await actor(session);
      if (!state.linked) throw refusal('E_COMMERCIAL_NOT_LINKED', 404);
      state.linked = false; state.commercial = null; state.pending = []; state.grants = []; for (const slot of state.capacity) slot.binding = null; state.capacity = [];
      return { body: { ok: true, result: 'unlinked' }, headers: protectedHeaders() };
    },
    async bind({ session, method, origin: requestOrigin, slot: slotId, organisationId }) {
      validOrigin(requestOrigin, origins, method);
      const viewer = await actor(session);
      if (!state.linked || !state.commercial) throw refusal('E_COMMERCIAL_NOT_LINKED', 404);
      if (!PREMIUM.has(state.commercial.standing)) throw refusal('E_COMMERCIAL_NOT_FUNDED', 409);
      const slot = state.capacity.find(candidate => candidate.slot === slotId);
      if (!slot) throw refusal('E_COMMERCIAL_SLOT_UNAVAILABLE', 409);
      const authority = await authorization.observeOrganisationAuthority({ userId: viewer.userId, organisationId });
      if (authority.authority !== 'present') return { body: { ok: false, result: 'refused', code: 'organisation-authority-not-present' }, headers: protectedHeaders() };
      if (state.capacity.some(candidate => candidate !== slot && candidate.binding?.organisationId === organisationId)) return { body: { ok: false, result: 'refused', code: 'organisation-already-bound' }, headers: protectedHeaders() };
      slot.binding = { organisationId, authority: 'present', authorityCheckedAt: now(), display: authority.display ?? null };
      state.order++;
      return { body: { ok: true, result: 'bound' }, headers: protectedHeaders() };
    },
    async unbind({ session, method, origin: requestOrigin, organisationId }) {
      validOrigin(requestOrigin, origins, method);
      await actor(session);
      for (const slot of state.capacity) if (slot.binding?.organisationId === organisationId) slot.binding = null;
      state.order++;
      return { body: { ok: true, result: 'unbound' }, headers: protectedHeaders() };
    },
    async revokeFundingAuthorization({ session, method, origin: requestOrigin }) {
      const revoked = await authorization.revokeAuthorization({ session, method, origin: requestOrigin });
      for (const slot of state.capacity) if (slot.binding) slot.binding = { ...slot.binding, authority: 'unknown', authorityCheckedAt: now(), display: null };
      return { headers: revoked.headers, body: { ok: true, result: 'authorization-revoked', authorityReconciliation: 'recorded' } };
    },
    async reconnectFundingAuthorization({ session, method, origin: requestOrigin }) {
      const connected = await authorization.reconnectService({ session, method, origin: requestOrigin });
      for (const slot of state.capacity) if (slot.binding) { const seen = await authorization.observeOrganisationAuthority({ userId: connected.userId, organisationId: slot.binding.organisationId }); slot.binding = { ...slot.binding, authority: seen.authority, authorityCheckedAt: now(), display: seen.display ?? null }; }
      return { headers: connected.headers, body: { ok: true, result: 'service-reconnected', authorityReconciliation: 'recorded' } };
    },
    async deliverParticipation({ userId, completion }) {
      const participation = state.participation;
      if (!participation) return { kind: 'unavailable', code: 'E_COMMERCIAL_UNAVAILABLE' };
      if (userId !== spec.account || !state.linked) return { kind: 'link-required' };
      participation.completions.push({ ...completion });
      if (participation.answer === 'unavailable') return { kind: 'unavailable', status: 503, linkId: 'fixture-link' };
      if (participation.answer === 'unknown') return { kind: 'unknown', linkId: 'fixture-link' };
      const campaign = participation.campaign;
      if (participation.answer === 'refused' || completion.campaign !== campaign.key || completion.version !== campaign.version) return { kind: 'refused', status: 409, linkId: 'fixture-link' };
      if (participation.earned) {
        // Wirt's idempotency: the same event replays its reward; a different event for an earned campaign is refused, and its own facts reconcile it.
        if (participation.earned.eventId !== completion.eventId) return { kind: 'reconciled', status: 409, linkId: 'fixture-link', reward: rewardFacts()[0] };
        return { kind: 'replayed', status: 200, linkId: 'fixture-link', reward: rewardFacts()[0] };
      }
      participation.earned = { id: 'fixture-reward-1', eventId: completion.eventId, completionId: completion.completionId, selected: null, reserved: null, attached: participation.paid, applications: [], expired: false, corrected: false };
      state.order++;
      return { kind: 'accepted', status: 200, linkId: 'fixture-link', reward: rewardFacts()[0] };
    },
    async rewardStanding({ session }) {
      await actor(session);
      if (!state.linked || !state.participation) return { available: false, reason: state.linked ? 'unavailable' : 'not-linked' };
      if (state.participation.answer === 'unavailable') return { available: false, reason: 'unavailable' };
      const cadence = state.participation.paid ? state.commercial.cadence : null;
      const line = cadence ? discountLine(cadence) : null;
      const nextCharge = cadence ? { on: state.commercial.period.ends_on, amountCents: PRICES[cadence] - (line?.amount_cents ?? 0), baseTotalCents: PRICES[cadence], discounts: line ? [readLine(line)] : [] } : null;
      return { available: true, nextCharge, rewards: rewardFacts() };
    },
    async rewardQuote({ session, cadence }) {
      await actor(session);
      if (!['monthly', 'annual'].includes(cadence)) throw refusal('E_COMMERCIAL_INPUT', 400);
      if (!state.linked || !state.participation || state.participation.answer === 'unavailable') return { available: false, reason: state.linked ? 'unavailable' : 'not-linked' };
      const line = discountLine(cadence);
      return { available: true, quote: { quoteId: `fixture-quote-${cadence}`, cadence, tier: 'Pro', currency: 'EUR', reviewUrl: `${origin}/manage/works-stand-in?dest=experience`, expiresOn: null,
        charges: [{ component: 'base', amountCents: PRICES[cadence] }], discounts: line ? [readLine(line)] : [], dueNowCents: PRICES[cadence] - (line?.amount_cents ?? 0), postRewardTotalCents: PRICES[cadence] } };
    },
    /** The Works stand-in page drives these: what Works would have done before the person returned. */
    simulate(kind) {
      const earned = state.participation?.earned;
      const [verb, argument] = kind.split(':');
      if (verb === 'wirt' && state.participation && ['recorded', 'unavailable', 'unknown', 'refused'].includes(argument)) { state.participation.answer = argument; return 'set'; }
      if (verb === 'reward-reserve' && earned && !earned.reserved && ['monthly', 'annual'].includes(argument) && discountLine(argument)) {
        // Accepting an eligible quote selects and reserves its branch; the payment is now being confirmed.
        earned.reserved = argument; earned.selected = state.participation.campaign.rewards.find(reward => reward.cadence === argument).key; earned.attached = true;
        const paid = state.participation.paid;
        state.commercial = { ...(state.commercial ?? {}), standing: paid ? 'funded' : 'first-payment-pending', tier: 'pro', cadence: argument, period: state.commercial?.period ?? { started_on: now().slice(0, 10), ends_on: now().slice(0, 10) },
          renewal_preference: 'automatic', cancellation_intent: 'none', grace: null, ended: null, next_renewal: state.commercial?.next_renewal ?? null };
        state.order++; return 'reserved';
      }
      if ((verb === 'reward-confirm' && earned?.reserved) || (verb === 'reward-renew' && earned?.selected && !earned.reserved)) {
        const paying = earned.reserved ?? state.commercial.cadence;
        const line = discountLine(paying);
        if (!line) return 'nothing';
        earned.applications.push({ operation: `fixture-operation-${earned.applications.length + 1}`, at: now(), line });
        earned.reserved = null; state.participation.paid = true; state.grants = [];
        const start = state.commercial.period?.ends_on ?? now().slice(0, 10);
        const end = new Date(Date.parse(`${start}T00:00:00Z`) + (paying === 'annual' ? 365 : 30) * 86_400_000).toISOString().slice(0, 10);
        state.commercial = { ...state.commercial, standing: 'funded', cadence: paying, period: { started_on: start, ends_on: end }, next_renewal: { on: end, total_cents: PRICES[paying], currency: 'EUR', tax_inclusive: true } };
        state.order++; return 'applied';
      }
      if (verb === 'reward-release' && earned?.reserved) { earned.reserved = null; if (earned.applications.length === 0) earned.selected = null; state.order++; return 'released'; }
      if (verb === 'reward-expire' && earned) { earned.expired = true; state.order++; return 'expired'; }
      if (verb === 'reward-correct' && earned) { earned.corrected = true; state.order++; return 'corrected'; }
      if (kind === 'link-complete') {
        state.linked = true; state.since = now().slice(0, 10);
        state.commercial ??= { standing: 'first-payment-pending', tier: 'pro', cadence: 'monthly', period: { started_on: now().slice(0, 10), ends_on: now().slice(0, 10) }, renewal_preference: 'automatic', cancellation_intent: 'none', grace: null, ended: null, next_renewal: null };
        state.order++;
        return 'linked';
      }
      if (kind === 'add-slot') { state.capacity.push({ slot: `slot-${state.capacity.length + 1}`, funding: 'paid', pendingEndOn: null, binding: null }); state.order++; return 'added'; }
      if (kind === 'confirm-first-payment' && state.commercial?.standing === 'first-payment-pending') { state.commercial.standing = 'funded'; state.order++; return 'funded'; }
      if (kind === 'reduce-to-free' || kind === 'reduce-to-pro') return this.applyPlan(kind === 'reduce-to-free' ? 'free' : 'pro');
      if (kind === 'pay' && state.commercial?.grace) { state.commercial.standing = 'funded'; state.commercial.grace = null; state.order++; return 'paid'; }
      return 'nothing';
    },
    async flushReports() { return []; },
    async maintain() { return {}; }
  };
}
