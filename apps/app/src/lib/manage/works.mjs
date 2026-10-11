// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * The product-facing Wirt seam of Plan & funding: the six Works destinations the standing card opens in the DiffDevil
 * frame, and the presentation of a benefit projection (wirt.benefit-projection/v1, restricted renewal presentation) as
 * the commercial consumer's status route reports it. diffdevil never calculates an amount; the renewal total is the
 * display-only figure Works supplies. No grace length, end date or countdown is shown anywhere.
 */

/** Works-hosted pages. `null` origin (no Works configured) leaves every exit unavailable rather than guessed. */
export function worksDestinations(origin) {
  const at = path => (origin ? `${origin}${path}` : null);
  return {
    experience: at('/diffdevil/manage-plan/wirt/experience'),
    relationship: at('/diffdevil/manage-plan/wirt/relationship'),
    invoices: at('/diffdevil/manage-plan/invoices'),
    paymentMethods: at('/account/payment-methods'),
    account: at('/account')
  };
}
export const WORKS_EXITS = Object.freeze([
  { key: 'experience', label: 'Change plan or billing period', icon: 'credit-card', purpose: 'change-plan' },
  { key: 'experience', label: 'Renewal and cancellation', icon: 'refresh', purpose: 'renewal' },
  { key: 'relationship', label: 'Gifts and benefits', icon: 'gift', purpose: 'browse' },
  { key: 'invoices', label: 'Invoices and payments', icon: 'receipt', purpose: 'browse' },
  { key: 'paymentMethods', label: 'Payment methods', icon: 'key', purpose: 'browse' },
  { key: 'account', label: 'Works account and sign-in', icon: 'shield', purpose: 'browse' }
]);

export function formatMoney(amount) {
  if (!amount || !Number.isSafeInteger(amount.total_cents)) return null;
  try { return new Intl.NumberFormat('en', { style: 'currency', currency: amount.currency || 'EUR', minimumFractionDigits: amount.total_cents % 100 === 0 ? 0 : 2 }).format(amount.total_cents / 100); }
  catch { return `${(amount.total_cents / 100).toFixed(2)} ${amount.currency ?? ''}`.trim(); }
}
export function fmtDay(value) {
  if (!value) return null;
  const date = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : null;
}
const dayBefore = value => (value ? fmtDay(new Date(Date.parse(`${value}T00:00:00Z`) - 86_400_000).toISOString()) : null);
export const tierLabel = tier => (tier === 'business' ? 'Business' : tier === 'pro' ? 'Pro' : 'Free');
const cadenceWord = cadence => (cadence === 'annual' ? 'Annual' : cadence === 'monthly' ? 'Monthly' : null);
const perWord = cadence => (cadence === 'annual' ? 'a year' : 'a month');

/**
 * What the return from Works shows: a link that didn't finish, Works confirmed (a newer applied order, a new slot or
 * the link itself), nothing changed (a browse departure), or waiting (a return is not proof of payment).
 */
export function returnOutcome({ departure, status, outcome = null }) {
  if (outcome && outcome !== 'linked') return 'link-failed';
  if (!departure) return outcome === 'linked' ? 'done' : null;
  const snapshot = departure.snapshot ?? null;
  const orderChanged = snapshot && status ? JSON.stringify(status.order ?? null) !== JSON.stringify(snapshot.order ?? null) : false;
  const slotAdded = snapshot && status ? (status.capacity ?? []).length > (snapshot.capacity ?? 0) : false;
  const nowLinked = departure.purpose === 'link' && status?.linked === true;
  if (orderChanged || slotAdded || nowLinked) return 'done';
  return departure.purpose === 'browse' ? 'none' : 'wait';
}

/** Which presentation state a status selects. One key; slot endings and grants are reported beside it. */
export function projectionKey(status) {
  if (!status?.linked) return 'free';
  if (status.reconciling) return 'reconciling';
  const commercial = status.commercial;
  if (!commercial) return 'linking';
  if (commercial.standing === 'first-payment-pending') return 'first-payment';
  if (commercial.standing === 'ended') return commercial.ended?.earlier_attempt === 'unresolved' ? 'ended-unresolved' : 'ended';
  if (commercial.standing === 'renewal-in-grace') return { 'payment-due': 'overdue', renewing: 'renewing', 'not-yet-invoiced': 'preparing', unresolved: 'checking' }[commercial.grace?.renewal] ?? 'checking';
  const change = (status.pending ?? []).find(entry => entry?.kind === 'plan-change' && typeof entry.target === 'string');
  if (change) return 'downgrade';
  if (commercial.cancellationIntent === 'at-period-end') return 'cancelling';
  return 'funded';
}

/** The standing card's banner and definition rows for one status. Copy names the subscriber's tier. */
export function presentProjection(status, { works, ended = false } = {}) {
  const key = projectionKey(status);
  const commercial = status?.commercial ?? null;
  const tier = tierLabel(commercial?.tier ?? status?.plan);
  const total = formatMoney(commercial?.nextRenewal);
  const renewsOn = fmtDay(commercial?.nextRenewal?.on);
  const endsOn = commercial?.period?.ends_on ?? null;
  const fundedThrough = dayBefore(endsOn);
  const slotEnding = (status?.capacity ?? []).filter(slot => slot.pendingEndOn);
  const grants = status?.grants ?? [];
  const change = (status?.pending ?? []).find(entry => entry?.kind === 'plan-change' && typeof entry.target === 'string');
  const protection = status?.protection ? { term: 'Price', value: status.protection.kind === 'beta' ? 'Beta price protected' : 'Price protected', sub: status.protection.kind === 'beta' ? 'Through beta and at least twelve months after it ends' : null } : null;
  const organisations = { term: 'Organisations', value: `${(status?.capacity ?? []).length} ${(status?.capacity ?? []).length === 1 ? 'slot' : 'slots'} · ${(status?.capacity ?? []).filter(slot => slot.funding === 'included').length} included, ${(status?.capacity ?? []).filter(slot => slot.funding === 'paid').length} additional${(status?.capacity ?? []).some(slot => slot.funding === 'grant') ? ', some by grant' : ''}` };
  const banner = (tone, icon, title, text, action = null) => ({ tone, icon, title, text, action });
  const rows = [];
  let head = null;
  const planName = ['ended', 'ended-unresolved', 'free'].includes(key) ? 'Free' : tier;
  let planSub = commercial ? `${cadenceWord(commercial.cadence) ?? 'Subscription'}${(status.capacity ?? []).filter(slot => slot.funding === 'paid').length ? ` · with ${(status.capacity ?? []).filter(slot => slot.funding === 'paid').length} additional ${(status.capacity ?? []).filter(slot => slot.funding === 'paid').length === 1 ? 'organisation' : 'organisations'}` : ''}${total ? ` · ${total} ${perWord(commercial.cadence)}${commercial.nextRenewal?.tax_inclusive ? ', tax included' : ''}` : ''}` : '';
  switch (key) {
    case 'linking': head = banner('info', 'clock', 'Linked to Wolfsblvt Works', 'Works has not sent this account\'s plan yet. It appears here as soon as Works confirms it; you don\'t need to refresh.'); planSub = 'Waiting for Works'; rows.push({ term: 'Status', value: 'Waiting for Works\' first answer' }); break;
    case 'reconciling': head = banner('info', 'clock', 'Your plan is being checked with Works', 'The App was restored from a backup, so Works-funded benefits are held until Works confirms the current plan. Nothing is charged by this.'); rows.push({ term: 'Status', value: 'Reconciling', sub: 'Premium features pause until Works answers' }); break;
    case 'first-payment': head = banner('info', 'clock', 'Your first payment is being confirmed', `${tier} starts here once Wolfsblvt Works confirms it. Coming back from the payment page doesn't confirm it. You don't need to pay again or refresh.`); rows.push({ term: 'Status', value: 'Waiting for confirmation', sub: `${tier} features aren't on yet` }, organisations); break;
    case 'renewing': rows.push({ term: 'Renewal', value: 'Renewing', sub: `Works is collecting the renewal${renewsOn ? ` from ${renewsOn}` : ''}${total ? ` · ${total}` : ''}` }, organisations, ...(protection ? [protection] : [])); break;
    case 'preparing': rows.push({ term: 'Renewal', value: 'Being prepared', sub: `The renewal${renewsOn ? ` from ${renewsOn}` : ''} is being prepared${total ? ` · ${total}` : ''}` }, organisations, ...(protection ? [protection] : [])); break;
    case 'checking': head = banner('info', 'clock', 'Your renewal is being checked', `Works is confirming the payment for your renewal. It isn't paid or failed yet. ${tier} stays on meanwhile.`); rows.push({ term: 'Renewal', value: 'Being checked', sub: `Renewal${renewsOn ? ` from ${renewsOn}` : ''}${total ? ` · ${total}` : ''}` }, organisations, ...(protection ? [protection] : [])); break;
    case 'overdue': head = banner('err', 'circle-alert', `Your ${tier} renewal is overdue`, `Pay at Wolfsblvt Works to keep ${tier}. If payment isn't confirmed, the subscription will end. Your repositories, settings and history aren't affected by the payment itself.`, works?.experience ? { label: 'Pay at Wolfsblvt Works', href: works.experience, purpose: 'pay', primary: true } : null); rows.push({ term: 'Renewal', value: 'Overdue', tone: 'err', sub: `Renewal${renewsOn ? ` from ${renewsOn}` : ''}${total ? ` · ${total}` : ''}` }, organisations, ...(protection ? [protection] : [])); break;
    case 'cancelling': head = banner('warn', 'info', `${tier} ends after ${fundedThrough ?? 'the paid term'}`, 'You cancelled renewal. Everything stays on until the end of the term. Choose below what stays on Free, or turn renewal back on at Works.', works?.experience ? { label: 'Renewal at Works', href: works.experience, purpose: 'renewal' } : null); rows.push({ term: 'Funded through', value: fundedThrough ?? '—' }, { term: 'Renewal', value: 'Off', sub: 'No further charge' }, organisations, ...(protection ? [protection] : [])); break;
    case 'downgrade': head = banner('warn', 'info', `Moving to ${tierLabel(change.target)} on ${fmtDay(change.effective_on) ?? 'the effective date'}`, `Scheduled at Works. ${tier} stays on until then. Choose below what stays on ${tierLabel(change.target)}; diffdevil doesn't pick for you.`, works?.experience ? { label: 'Change at Works', href: works.experience, purpose: 'change-plan' } : null); rows.push({ term: 'Funded through', value: fundedThrough ?? '—' }, { term: 'Scheduled', value: `${tierLabel(change.target)} from ${fmtDay(change.effective_on) ?? '—'}`, sub: 'No renewal charge' }, organisations); break;
    case 'ended': head = banner('info', 'info', `${tier} ended on ${fmtDay(commercial.ended?.on) ?? '—'}`, `File history views and premium processing have stopped. Basic history keeps running on Free. The premium file history is kept as a frozen archive until the shared archive date, exportable and deletable until then. Starting again at Works brings it back.`, works?.experience ? { label: 'Start again at Works', href: works.experience, purpose: 'change-plan' } : null); rows.push({ term: 'Ended', value: fmtDay(commercial.ended?.on) ?? '—', sub: commercial.ended?.reason === 'cancelled' ? 'Renewal was cancelled' : commercial.ended?.reason === 'unpaid-after-grace' ? 'The renewal was not paid' : commercial.ended?.reason ?? null }, { term: 'Now', value: 'Free' }, { term: 'Archive', value: 'Shared archive date not yet published', sub: 'The deadline appears here once the shared recovery policy names it' }); break;
    case 'ended-unresolved': head = banner('info', 'clock', `${tier} ended while an earlier payment is being confirmed`, `If that payment went through in time, ${tier} comes back automatically. You don't need to pay again now.`); rows.push({ term: 'Ended', value: fmtDay(commercial.ended?.on) ?? '—', sub: 'An earlier payment is still being confirmed' }, { term: 'Now', value: 'Free' }); break;
    default:
      rows.push({ term: 'Funded through', value: fundedThrough ?? '—' });
      if (commercial?.renewalPreference === 'manual') rows.push({ term: 'Next renewal', value: renewsOn ? `${total ? `${total} ` : ''}on ${renewsOn}` : '—', sub: 'Renewed manually at Works' });
      else rows.push({ term: 'Next renewal', value: renewsOn ? `${total ? `${total} ` : ''}on ${renewsOn}` : '—', sub: `Renews automatically · ${tier}${(status.capacity ?? []).filter(slot => slot.funding === 'paid').length ? ` + ${(status.capacity ?? []).filter(slot => slot.funding === 'paid').length} additional ${(status.capacity ?? []).filter(slot => slot.funding === 'paid').length === 1 ? 'organisation' : 'organisations'}` : ''}` });
      rows.push(organisations);
      if (protection) rows.push(protection);
  }
  // A grant names what funds the period (the beta month is one); whether anything follows it is Works' renewal preference.
  // Its `until` is the end date Works sends, like the period's `ends_on`, so both read as the last funded day.
  const grantWord = kind => ({ gift: 'A gift', beta: 'Beta access' })[kind] ?? 'Funded access';
  for (const grant of grants) rows.push({ term: 'Funded by', value: `${grantWord(grant.kind)}, through ${dayBefore(grant.until) ?? '—'}`,
    sub: commercial?.renewalPreference === 'manual' ? 'No charge and no card. Nothing renews automatically; continuing with Pro is your choice at Works.' : 'No charge until then. Renewal after it is set at Works.' });
  const slotBanners = slotEnding.map(slot => ({ tone: 'warn', icon: 'info', title: `Slot ${slot.slot.replace(/^slot-/u, '')} ends on ${fmtDay(slot.pendingEndOn)}`, text: `You removed it at Works. ${slot.binding?.display ?? 'Its organisation'} keeps ${tier} until then, then has no plan: its repositories stop, history and settings stay. Fund it another way, or move it to a slot you keep.`, action: works?.experience ? { label: 'Keep the slot at Works', href: works.experience, purpose: 'renewal' } : null }));
  return { key, tier, planName, planSub, banner: head, slotBanners, rows, change, ended: ended || ['ended', 'ended-unresolved'].includes(key), compareable: ['funded', 'overdue', 'renewing', 'preparing', 'checking'].includes(key), choosing: ['cancelling', 'downgrade', 'ended'].includes(key) ? (key === 'downgrade' ? { target: change.target, on: change.effective_on } : key === 'cancelling' ? { target: 'free', on: endsOn } : { target: 'free', on: commercial?.ended?.on ?? null, applied: true }) : null };
}
