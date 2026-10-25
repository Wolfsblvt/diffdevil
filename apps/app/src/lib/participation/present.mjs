// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * How a participation reward reads in diffdevil: one standing the customer can tell apart from every other, the
 * alternatives in Wirt's own terms, and receipts built only from Wirt's lines. Every amount, remaining-use count, date
 * and post-reward price shown here is a Wirt fact; nothing is calculated from a percentage or a price list. The public
 * source is Wirt's curated reason, never a campaign key, an event identity or the person's answers.
 */
import { fmtDay } from '../manage/works.mjs';

export function money(cents, currency = 'EUR') {
  if (!Number.isSafeInteger(cents)) return null;
  try { return new Intl.NumberFormat('en', { style: 'currency', currency, minimumFractionDigits: 2 }).format(cents / 100); }
  catch { return `${(cents / 100).toFixed(2)} ${currency}`; }
}
const shortMoney = (cents, currency = 'EUR') => {
  if (!Number.isSafeInteger(cents)) return null;
  try { return new Intl.NumberFormat('en', { style: 'currency', currency, minimumFractionDigits: cents % 100 === 0 ? 0 : 2 }).format(cents / 100); }
  catch { return money(cents, currency); }
};
const per = cadence => (cadence === 'annual' ? 'year' : 'month');
const charges = (count, cadence) => `${count} ${cadence === 'annual' ? (count === 1 ? 'annual charge' : 'annual charges') : (count === 1 ? 'monthly charge' : 'monthly charges')}`;
const off = alternative => (alternative.unit === 'percent' ? `${alternative.value}% off` : alternative.unit === 'fixed' ? `${shortMoney(alternative.value)} off` : 'A discount');

/**
 * The terms of one alternative, as Wirt defines them: what it takes off and how many charges it covers. Once a use is
 * spent the definition no longer reads as "the next" charges; the remaining count is Wirt's and is shown beside it.
 */
export function termsOf(alternative) {
  if (alternative.kind === 'time') return `${alternative.tier} access, no payment and no automatic renewal`;
  if (alternative.kind === 'funded-component') return `${alternative.name}, one ${per(alternative.cadence)} funded`;
  if (alternative.kind === 'protected-price') return `${alternative.tier} ${alternative.cadence} ${alternative.componentKind === 'base' ? 'base plan' : 'additional organisation'} price option, up to ${shortMoney(alternative.capCents, alternative.currency)}/${per(alternative.cadence)} before temporary discounts`;
  if (alternative.frequency === 'continuous') return `${off(alternative)} each eligible ${alternative.cadence} ${alternative.tier} charge, base plan only`;
  const started = ['partially-consumed', 'consumed'].includes(alternative.standing);
  const word = alternative.cadence === 'annual' ? 'annual' : 'monthly';
  if (started) return `${off(alternative)} ${charges(alternative.uses ?? 0, alternative.cadence)} in all, base plan only`;
  return `${off(alternative)} ${alternative.uses === 1 ? `the next eligible ${word} charge` : `the next ${charges(alternative.uses ?? 0, alternative.cadence)}`}, base plan only`;
}

/** Mirror Wirt's own visible-expiry rule on facts that may be a few minutes old: past the deadline, unspent is expired. */
export function currentState(reward, now) {
  if (reward.kind && reward.kind !== 'discount') return reward.state;
  if (!['available', 'accepted', 'partially-consumed'].includes(reward.state)) return reward.state;
  const deadline = reward.selected ? reward.validUntil : reward.claimClosesAt;
  return deadline && Date.parse(now) >= Date.parse(deadline) ? 'expired' : reward.state;
}

/**
 * One customer-facing standing: `invite`, `draft`, `closed`, `saved`, `pending`, `link-required`, `refused`, then
 * Wirt's `available`, `scheduled` (accepted after an early paid conversion), `reserved`, `partially-consumed`,
 * `exhausted`, `expired`, `corrected`, or `unknown` when Wirt's standing cannot be read.
 */
export function standingOf(view, { now } = {}) {
  if (!view.completed && !view.reward) {
    if (view.window === 'closed') return view.response?.state === 'draft' ? 'closed' : null;
    if (view.window !== 'open' || view.eligibility !== 'participant') return null;
    return view.response?.state === 'draft' ? 'draft' : 'invite';
  }
  if (view.reward) {
    if (view.reward.available === false) return 'unavailable';
    const state = currentState(view.reward, now);
    if (state === 'consumed') return 'exhausted';
    if (state === 'accepted') return 'scheduled';
    return ['available', 'queued', 'active', 'reserved', 'partially-consumed', 'exercised', 'expired', 'ended', 'withdrawn', 'corrected'].includes(state) ? state : 'unknown';
  }
  const delivery = view.delivery;
  if (!delivery) return 'unknown';
  if (delivery.state === 'refused') return 'refused';
  // Accepted, but no Wirt fact for it can be read yet: the standing is unknown, not invented.
  if (delivery.state === 'accepted') return 'unknown';
  if (delivery.outcome === 'link-required') return 'link-required';
  return delivery.attempts === 0 ? 'saved' : 'pending';
}

/** The selected alternative, else the one Wirt says applies first after an early conversion, else none. */
function chosen(reward) {
  return reward.alternatives.find(alternative => alternative.key === reward.selected)
    ?? reward.alternatives.find(alternative => alternative.firstEligibleOn && alternative.standing !== 'retired')
    ?? (reward.alternatives.length === 1 ? reward.alternatives[0] : null);
}

/** Typed context only. Exercise, payment, binding and correction remain in Works' existing journey. */
function presentTypedReward(card, reward, selected) {
  const date = value => fmtDay(value);
  if (reward.kind === 'time') {
    card.title = ({ queued: 'Your earned time is queued', active: 'Your earned time is active', scheduled: 'Your earned time is accepted', available: 'Your earned time is ready', exhausted: 'Your earned time was used', corrected: 'Works corrected this time reward', expired: 'Your time reward expired' })[card.key] ?? 'Your earned time';
    card.lines.push(`${selected.tier} access for ${reward.units ? `${reward.units} date units` : `one ${per(selected.cadence)}`}. No payment and no automatic renewal.`);
    if (reward.expectedStartOn && !reward.startsOn) card.lines.push(`Expected start: ${date(reward.expectedStartOn)}. This is a forecast, not an access start.`);
    if (reward.startsOn) card.lines.push(`Access started: ${date(reward.startsOn)}${reward.endsOn ? ` · Ends: ${date(reward.endsOn)}` : ''}.`);
    return card;
  }
  if (reward.kind === 'protected-price') {
    card.title = card.key === 'exercised' ? 'Protected price acquired' : card.key === 'reserved' ? 'Price option reserved · acquisition pending' : 'Your protected-price options';
    card.lines.push('Earning or reviewing an option does not acquire a protected price. Only Works confirms acquisition after an eligible customer-funded payment.');
    for (const option of reward.alternatives) {
      card.lines.push(`${option.tier} ${option.cadence}: ${option.standing === 'exercised' ? 'Acquired' : option.standing === 'reserved' ? 'Reserved, not yet acquired' : option.standing === 'available' ? 'Earned, available to review at Works' : option.standing}. Exercise opens ${date(option.exerciseOpensAt)}; closes ${date(option.exerciseClosesAt)}.`);
      if (option.exercisePaused) card.lines.push('Exercise clock paused while Works reconciles an unresolved payment.');
      if (option.acquisition?.state === 'exercised' && option.acquisition.capCents !== null) card.lines.push(`Acquired protection: ${money(option.acquisition.capCents, option.currency)}/${per(option.cadence)}.`);
    }
    return card;
  }
  if (reward.kind === 'funded-component') {
    const component = reward.component;
    card.title = 'Your participation-funded component';
    card.lines.push(`${selected.name}. ${selected.reason}. Reward standing: ${reward.state}.`);
    card.lines.push(`Promised term: ${reward.units ? `${reward.units} date units` : `one ${per(selected.cadence)}`}${reward.startsOn ? ` · Starts: ${date(reward.startsOn)}` : ''}${reward.endsOn ? ` · Ends: ${date(reward.endsOn)}` : ''}.`);
    card.lines.push(`Component standing: ${component.state}. ${component.bindingState ?? 'Binding unavailable'}. ${component.usable === true ? 'Currently usable.' : component.usable === false ? 'Not currently usable; the earned reward and its term remain recorded.' : 'Current usability unavailable.'}`);
    return card;
  }
  if (selected?.frequency === 'continuous') {
    card.title = ({ available: 'Your continuing discount is ready', scheduled: 'Your continuing discount is accepted', reserved: 'Continuing discount reserved', expired: 'Your continuing discount expired', corrected: 'Works corrected this continuing discount' })[card.key] ?? 'Your continuing discount';
    card.lines.push(`${termsOf(selected)}. ${reward.validUntil === null ? 'No scheduled application end.' : `Application ends: ${date(reward.validUntil)}.`}`);
    if (selected.firstEligibleOn) card.lines.push(`First eligible charge: ${date(selected.firstEligibleOn)}.`);
    card.lines.push('This continuing discount is separate from protected-price acquisition.');
    return card;
  }
  return null;
}

/**
 * The reward card: a title, plain sentences, the alternatives with their standing and the confirmed applications.
 * `protectedPrice` adds the beta-price sentence only when the projection says that price is protected.
 */
export function presentReward(view, { now, protectedPrice = false } = {}) {
  const key = standingOf(view, { now });
  if (!key) return null;
  const reward = view.reward;
  const reason = reward?.campaign?.reason ?? 'Participation reward';
  const until = value => fmtDay(value) ?? 'the deadline';
  const card = { key, reason, title: '', lines: [], alternatives: [], applications: [], previewCadences: [], tone: 'info' };
  const after = protectedPrice ? ' at your protected beta price' : '';
  switch (key) {
    case 'invite': card.title = `Take the ${view.campaign.name.toLowerCase()}`; card.lines.push(`About ${view.survey.minutes} minutes. Completing it earns a discount on continuing with Pro, whatever you answer.`); break;
    case 'draft': card.title = `Finish the ${view.campaign.name.toLowerCase()}`; card.lines.push('Your answers so far are saved. Completing the survey is what earns the reward.'); break;
    case 'closed': card.title = 'The survey has closed'; card.lines.push('It closed before it was completed, so it earned no reward. Your saved answers can still be deleted.'); card.tone = 'muted'; break;
    case 'saved': card.title = 'Completion saved · reward on its way'; card.lines.push('Your survey is complete. diffdevil is passing the completion to Wolfsblvt Works, which issues the reward. You don\'t need to do anything.'); break;
    case 'pending': card.title = 'Completion saved · reward delivery pending'; card.lines.push('Works hasn\'t confirmed the reward yet. diffdevil keeps trying with the same completion, so it can never be issued twice. You don\'t need to send the survey again.'); break;
    case 'link-required': card.title = 'Completion saved · link Works to receive it'; card.lines.push('Your account isn\'t linked to a Wolfsblvt Works account right now, so the reward has nowhere to go. Link it again and the same completion is delivered.'); card.tone = 'warn'; break;
    case 'refused': card.title = 'Works didn\'t accept this completion'; card.lines.push('Works answered that this completion can\'t earn the reward, for example because the campaign had closed or the reward already belongs to another Works account. Your answers are still yours; nothing was charged.'); card.tone = 'warn'; break;
    case 'unknown': card.title = 'Completion saved · reward standing unavailable'; card.lines.push('Works confirmed the completion, but the reward\'s current standing can\'t be read right now. Nothing changes because of that; it appears here when Works answers.'); break;
    case 'unavailable': card.title = 'Reward details unavailable'; card.lines.push('Works sent a reward this App cannot read. Other readable rewards remain available. Review this reward at Works; no choice, price or entitlement is inferred here.'); card.tone = 'warn'; break;
    default: break;
  }
  if (!reward || ['invite', 'draft', 'closed', 'saved', 'pending', 'link-required', 'refused', 'unknown', 'unavailable'].includes(key)) return card;

  card.alternatives = reward.alternatives.map(alternative => ({ key: alternative.key, cadence: alternative.cadence, label: alternative.name ?? `${alternative.cadence === 'annual' ? 'Annual' : 'Monthly'} ${alternative.tier}`, terms: termsOf(alternative),
    remaining: alternative.remainingUses, firstEligibleOn: alternative.firstEligibleOn, standing: alternative.standing }));
  card.applications = reward.applications.filter(application => application.kind !== 'option-exercised').map(application => ({ on: fmtDay(application.at), amount: money(application.amountCents), remainingAfter: application.remainingUsesAfter,
    after: application.postRewardBaseCents === null ? null : `${shortMoney(application.postRewardBaseCents)}/${per(application.cadence)}` }));
  const selected = chosen(reward);
  const typed = presentTypedReward(card, reward, selected);
  if (typed) return typed;
  if (key === 'available' && !reward.alternatives.some(alternative => alternative.firstEligibleOn)) card.previewCadences = reward.alternatives.filter(alternative => alternative.kind === 'discount' && alternative.tier === 'Pro' && alternative.standing === 'available').map(alternative => alternative.cadence);
  switch (key) {
    case 'available':
      card.title = 'Your reward is ready';
      if (selected?.firstEligibleOn) card.lines.push(`${termsOf(selected).replace(/, base plan only$/u, '')}, from your ${selected.cadence} renewal on ${until(selected.firstEligibleOn)}. Charges already confirmed stay as they are.`);
      else if (selected) card.lines.push(`${termsOf(selected)}. Review the matching ${selected.cadence} continuation at Works.`);
      else card.lines.push('It applies to the Pro cadence you continue with: choose monthly or annual at Works and the matching discount is reserved for that payment.');
      card.lines.push(`Use it by ${until(reward.claimClosesAt)}. A price preview reserves nothing.`);
      card.tone = 'ok';
      break;
    case 'scheduled':
      card.title = 'Your reward applies to your next renewal';
      card.lines.push(selected?.firstEligibleOn ? `${termsOf(selected).replace(/, base plan only$/u, '')}, from your ${selected.cadence} renewal on ${until(selected.firstEligibleOn)}.` : 'It applies to the next eligible Pro charge.');
      card.lines.push('Charges already confirmed stay as they are; nothing is refunded or rewritten.');
      card.tone = 'ok';
      break;
    case 'reserved':
      card.title = `Reserved for your ${selected?.cadence ?? 'Pro'} payment`;
      card.lines.push(`Works is confirming the payment you accepted. The discount applies when it's confirmed; ${reward.alternatives.length > 1 ? 'the other cadence is set aside meanwhile, and ' : ''}a second reservation isn't possible.`);
      break;
    case 'partially-consumed':
      card.title = selected?.remainingUses === 1 ? 'One discounted charge remains' : `${selected?.remainingUses ?? 'Some'} discounted charges remain`;
      card.lines.push(selected ? `${off(selected)} each remaining ${selected.cadence} charge, base plan only.` : 'On the remaining eligible charges, base plan only.');
      card.tone = 'ok';
      break;
    case 'exhausted': {
      const last = reward.applications.at(-1);
      card.title = 'Reward used';
      card.lines.push(`Every discounted charge has been applied.${last?.postRewardBaseCents !== null && last?.postRewardBaseCents !== undefined ? ` Pro continues at ${shortMoney(last.postRewardBaseCents)}/${per(last.cadence)}${after}.` : ''}`);
      card.tone = 'muted';
      break;
    }
    case 'expired':
      card.title = 'The reward expired';
      card.lines.push(`It wasn't used before ${until(reward.selected ? reward.validUntil : reward.claimClosesAt)}. Charges already made are unchanged.`);
      card.tone = 'muted';
      break;
    case 'corrected':
      card.title = 'Works corrected this reward';
      card.lines.push('Its unused discount no longer applies. Charges already made are unchanged. Works explains the correction on its benefits page.');
      card.tone = 'warn';
      break;
    default: break;
  }
  return card;
}

const lineLabel = (charge, cadence, index) => (index === 0 ? `diffdevil Pro ${cadence === 'annual' ? 'annual' : 'monthly'}` : 'Additional organisation');

/**
 * A receipt from one Wirt quote or next-charge answer: the underlying price, each reward line under its public reason,
 * the amount due, and the sentence about what follows. `protectedPrice` names the beta-price protection when it exists.
 */
export function receiptOf(source, { cadence, protectedPrice = false, label = 'Due now' } = {}) {
  if (!source) return null;
  const currency = source.currency ?? 'EUR';
  const lines = source.charges ? source.charges.map((charge, index) => ({ label: lineLabel(charge, cadence, index), amount: money(charge.amountCents, currency) }))
    : Number.isSafeInteger(source.baseTotalCents) ? [{ label: lineLabel(null, cadence, 0), amount: money(source.baseTotalCents, currency) }] : [];
  for (const discount of source.discounts) lines.push({ label: discount.reason ?? 'Discount', amount: `−${money(discount.amountCents, currency)}`, reward: true });
  const due = source.dueNowCents ?? source.amountCents;
  const notes = [];
  const reward = source.discounts.find(discount => discount.reason);
  if (reward) {
    const rate = reward.unit === 'percent' && reward.value !== null ? `${reward.value}% off` : 'Discounted';
    const term = cadence === 'annual' ? 'this annual term' : 'this monthly charge';
    if (reward.frequency === 'continuous') notes.push(`${rate} each eligible ${cadence} charge. ${reward.validUntil ? `Application ends: ${fmtDay(reward.validUntil)}.` : 'No scheduled application end.'}`);
    else if (reward.remainingUsesAfter > 0) notes.push(`${rate} this and your next ${reward.remainingUsesAfter === 1 ? `${cadence === 'annual' ? 'annual' : 'monthly'} charge` : `${reward.remainingUsesAfter} ${cadence === 'annual' ? 'annual' : 'monthly'} charges`}.`);
    else notes.push(`${rate} ${term}.`);
    const base = reward.postRewardBaseCents ?? null;
    if (base !== null && reward.frequency !== 'continuous') notes.push(cadence === 'annual' || reward.remainingUsesAfter === 0
      ? `${cadence === 'annual' ? 'Next annual renewal' : 'Next monthly charge'}: ${shortMoney(base, currency)}${protectedPrice ? ' at your protected beta price' : ''}.`
      : `After the reward: ${shortMoney(base, currency)}/${per(cadence)}${protectedPrice ? ' at your protected beta price' : ''}.`);
  }
  return { lines, total: { label, amount: money(due, currency) }, notes, on: source.on ? fmtDay(source.on) : null, reviewUrl: source.reviewUrl ?? null, expiresOn: source.expiresOn ? fmtDay(source.expiresOn) : null };
}
