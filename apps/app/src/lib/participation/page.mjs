// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * What a page needs about the participation campaign for the signed-in account: the product view, a delivery attempt
 * when one is due, Wirt's live reward standing once the survey is complete, the reward card, and a Pro continuation
 * preview the person already requested. A page view creates no Wirt quote: a preview is created only by the person's
 * Origin-checked POST (`reward-preview`), and this read shows the stored answer for the cadence in `?preview=`.
 */
import { rewardFor } from './service.mjs';
import { presentReward, receiptOf } from './present.mjs';
import { commercialNow } from '../../../../github-app/commercial-wirt.mjs';

const CADENCES = ['monthly', 'annual'];

export async function loadParticipation({ runtime, viewer, session, model, preview = null }) {
  const participation = runtime.participation;
  if (!participation || !runtime.commercial) return null;
  const read = () => participation.view({ userId: viewer.userId, commercial: model.commercial, repositories: viewer.repositories });
  let view = await read();
  // A completion still waiting for Works is tried again when its owner looks, inside the same backoff as maintenance.
  if (view.delivery?.state === 'pending') { await participation.flush({ userId: viewer.userId }).catch(() => undefined); view = await read(); }
  const status = model.commercial?.status ?? null;
  const protectedPrice = Boolean(status?.protection);
  let live = null;
  if (view.completed && status?.linked) {
    live = await runtime.commercial.rewardStanding({ session: session.session }).catch(() => ({ available: false, reason: 'unavailable' }));
    const current = live.available ? rewardFor(view.campaign, live.rewards) : null;
    if (current) view = { ...view, reward: current, rewardSource: 'live' };
  }
  const commercialClock = status?.commercialClock ?? null;
  let card = presentReward(view, { now: runtime.now(), protectedPrice, commercialClock });
  const rewards = live?.available ? live.rewards : status?.participationRewards;
  const unavailable = (rewards ?? []).filter(reward => reward?.available === false && reward !== view.reward).length;
  if (!card && unavailable) card = presentReward({ ...view, reward: rewards.find(reward => reward?.available === false) }, { now: runtime.now(), commercialClock });
  if (card && unavailable) card.lines.push(`Works also sent ${unavailable} unreadable reward${unavailable === 1 ? '' : 's'}. Those details are unavailable here; review them at Works. Readable rewards remain shown.`);
  if (card && live && !live.available && view.reward) card.stale = true;
  const nextCharge = live?.available && live.nextCharge?.discounts.some(line => line.campaignKey === view.campaign.key) ? live.nextCharge : null;
  const cadence = CADENCES.includes(preview) ? preview : null;
  let quote = null;
  if (card?.previewCadences.includes(cadence)) {
    const stored = await participation.preview(viewer.userId, cadence);
    // A later ordered clock step can lapse a preview before its real cache deadline.
    const deadline = stored?.quote.expiresOn ? Date.parse(`${stored.quote.expiresOn}T00:00:00Z`) + 86_400_000 : null;
    if (stored && (deadline === null || commercialNow(runtime.now(), commercialClock) < deadline)) quote = { cadence, receipt: receiptOf(stored.quote, { cadence, protectedPrice }) };
  }
  const nextCadence = status?.commercial?.cadence ?? 'monthly';
  return { view, card, live, quote, next: nextCharge ? receiptOf(nextCharge, { cadence: nextCadence, protectedPrice, label: `Due on ${receiptOf(nextCharge, { cadence: nextCadence }).on ?? 'the renewal date'}` }) : null, nextCharge };
}
