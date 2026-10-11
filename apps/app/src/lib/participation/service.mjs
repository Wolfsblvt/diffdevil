// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * The product half of a participation reward campaign: who is invited and when, the survey response and its privacy,
 * and the durable outbound completion fact. Wirt owns the reward; this service never decides one. A completion is
 * delivered through the commercial consumer's signed route and retried until Wirt answers definitely; an answer is
 * recorded as Wirt gave it, and the reward the customer sees always comes from Wirt's facts.
 */
import { windowOf } from './campaign.mjs';
import { missingForCompletion, surveyOf } from './survey.mjs';

const DAY = 86_400_000;
// The same bounded backoff as Wirt reports, but a completion is never abandoned: after the last step it keeps that pace.
const BACKOFF_SECONDS = [60, 300, 900, 3600, 14400];
// Wirt's stated answers for this event, plus `reconciled`: its current facts already hold the campaign's reward.
const ACCEPTED = new Set(['accepted', 'replayed', 'reconciled']);
const RETRY = new Set(['unavailable', 'unknown', 'unreadable', 'link-required']);

/** Explicit beta-grant dates. A commercial period, link age and price protection are not the grant's start. */
export function betaAccessWindow(status) {
  if (!status?.linked || status.reconciling || status.commercial?.tier !== 'pro') return null;
  const beta = status.grants?.find(grant => grant.kind === 'beta');
  const start = Date.parse(beta?.started_on ?? ''), end = Date.parse(beta?.until ?? '');
  return Number.isFinite(start) && Number.isFinite(end) && start < end ? { from: new Date(start).toISOString(), until: new Date(end).toISOString() } : null;
}

/**
 * Whether this account takes part: linked to Works with a Pro relationship (the beta grant, a paid Pro subscription or
 * one that has ended). Business is not part of this reward. A held or unreadable status is `unknown`, never `no`.
 */
export function eligibilityOf(commercial) {
  if (!commercial || commercial.standing !== 'available' || !commercial.status) return 'unknown';
  const status = commercial.status;
  if (!status.linked) return 'not-linked';
  if (status.reconciling || !status.commercial) return 'unknown';
  return status.commercial.tier === 'pro' ? 'participant' : 'not-pro';
}

/** Wirt's reward for this campaign from the facts it sent, or null. Wirt issues once per campaign key, across versions. */
export function rewardFor(campaign, rewards) {
  return (rewards ?? []).find(reward => reward.campaign.key === campaign.key) ?? null;
}

export function createParticipation({ store, commercial, campaign, now = () => new Date().toISOString() }) {
  const survey = surveyOf(campaign.survey);
  const later = seconds => new Date(Date.parse(now()) + seconds * 1000).toISOString();

  /** Meaningful use: Pro for at least the configured delay, and a managed-operation outcome observed during beta access. */
  function usedEnough({ access, observed }) {
    const since = Date.parse(access?.from ?? '');
    return Number.isFinite(since) && Date.parse(now()) - since >= campaign.inviteAfterDays * DAY && observed;
  }

  /** The invitation's restraint: shown once until dismissed, then once more after the reminder delay, then never. */
  function promptStage(prompt) {
    if (!prompt) return 'invite';
    if (!prompt.dismissedAt) return 'invite';
    if (!prompt.remindedAt) return Date.parse(now()) - Date.parse(prompt.dismissedAt) >= campaign.reminderAfterDays * DAY ? 'remind' : null;
    return prompt.reminderDismissedAt ? null : 'remind';
  }

  async function deliver(row) {
    const outcome = await commercial.deliverParticipation({ userId: row.userId, completion: { campaign: row.campaign, version: row.version, eventId: row.eventId, completionId: row.responseId, completedAt: row.completedAt } })
      .catch(() => ({ kind: 'unknown' }));
    const attempts = row.attempts + 1;
    if (ACCEPTED.has(outcome.kind)) {
      const recorded = await store.recordAttempt(row.responseId, { state: 'accepted', outcome: outcome.kind, attempts, status: outcome.status ?? null, linkId: outcome.linkId ?? null, rewardId: outcome.reward?.id || null, receipt: outcome.reward ?? null });
      return recorded ? outcome.kind : 'skipped';
    }
    if (outcome.kind === 'refused') {
      const recorded = await store.recordAttempt(row.responseId, { state: 'refused', outcome: 'refused', attempts, status: outcome.status ?? null, linkId: outcome.linkId ?? null });
      return recorded ? 'refused' : 'skipped';
    }
    const kind = RETRY.has(outcome.kind) ? outcome.kind : 'unknown';
    const delay = BACKOFF_SECONDS[Math.min(attempts, BACKOFF_SECONDS.length) - 1];
    const recorded = await store.recordAttempt(row.responseId, { state: 'pending', outcome: kind, attempts, nextAttemptAt: later(delay), status: outcome.status ?? null, linkId: outcome.linkId ?? null });
    return recorded ? kind : 'skipped';
  }

  return {
    campaign,
    survey,

    /** Everything the survey page, the invitation and Plan & funding need for one account. */
    async view({ userId, commercial: commercialStanding }) {
      const [response, prompt] = await Promise.all([store.response(userId, campaign), store.prompt(userId, campaign)]);
      const delivery = response?.state === 'completed' ? await store.delivery(response.responseId) : null;
      const eligibility = eligibilityOf(commercialStanding);
      const status = commercialStanding?.status ?? null;
      const projected = status?.linked ? rewardFor(campaign, status.participationRewards) : null;
      const receipt = delivery?.state === 'accepted' && delivery.receipt ? delivery.receipt : null;
      const window = windowOf(campaign, now());
      const completed = response?.state === 'completed';
      // Maintenance records any qualifying outcome before pruning; a page visit does not establish use.
      const access = betaAccessWindow(status);
      const observed = access && prompt?.useObservedAt >= access.from && prompt.useObservedAt < access.until;
      const stage = eligibility === 'participant' && window === 'open' && !completed && usedEnough({ access, observed }) ? promptStage(prompt) : null;
      return { campaign, survey, window, eligibility, proactiveEligibility: access ? 'known' : 'unknown', response, delivery, completed, invitation: stage, prompt,
        // Wirt's projected facts are the reward; its answer to our own delivery stands in only until a projection carries it.
        reward: projected ?? receipt, rewardSource: projected ? 'projection' : receipt ? 'receipt' : null,
        canAnswer: eligibility === 'participant' && window === 'open' && !completed };
    },

    /** Preserve use before the operational ledger is pruned, without a visit or a provider request. */
    async preserveUse() {
      for await (const link of store.fundedLinks()) {
        const projection = JSON.parse(link.projection_json);
        const access = betaAccessWindow({ linked: true, reconciling: false, commercial: projection.commercial, grants: projection.benefits?.grants });
        if (!access) continue;
        const at = await store.qualifyingUse(link.product_account, access);
        if (at) await store.recordUse(link.product_account, campaign, at);
      }
    },
    /** Record that the invitation or its reminder was shown. */
    async noteShown(userId, stage) {
      if (stage === 'invite') await store.recordInvitation(userId, campaign);
      if (stage === 'remind') await store.recordReminder(userId, campaign);
    },
    dismiss(userId) { return store.dismiss(userId, campaign); },

    async saveDraft({ userId, commercial: commercialStanding, answers }) {
      if (eligibilityOf(commercialStanding) !== 'participant') return 'not-eligible';
      if (windowOf(campaign, now()) !== 'open') return 'closed';
      return await store.saveDraft(userId, campaign, answers) ? 'saved' : 'already-completed';
    },

    /** Complete the survey: the response and its outbound completion fact commit together. The caller then tries delivery. */
    async complete({ userId, commercial: commercialStanding, answers }) {
      if (eligibilityOf(commercialStanding) !== 'participant') return 'not-eligible';
      if (windowOf(campaign, now()) !== 'open') return 'closed';
      if ((await store.response(userId, campaign))?.state === 'completed') return 'already-completed';
      if (missingForCompletion(survey, answers).length > 0) { await store.saveDraft(userId, campaign, answers); return 'incomplete'; }
      const { result } = await store.complete(userId, campaign, answers);
      return result;
    },

    deleteAnswers(userId) { return store.deleteAnswers(userId, campaign); },

    /**
     * The person's explicit preview request, from the Origin-checked POST only: Wirt quotes the continuation and the
     * answer is kept until Wirt's own quote lapses. A preview reserves nothing. Rendering a page never calls this.
     */
    async requestPreview({ userId, session, cadence }) {
      const answer = await commercial.rewardQuote({ session, cadence }).catch(() => ({ available: false, reason: 'unavailable' }));
      if (!answer.available) return answer.reason === 'not-quotable' ? 'not-quotable' : 'unavailable';
      const lapses = answer.quote.expiresOn ? new Date(Date.parse(`${answer.quote.expiresOn}T00:00:00Z`) + DAY).toISOString() : later(3600);
      await store.savePreview(userId, cadence, answer.quote, lapses);
      return 'ready';
    },
    /** A preview already requested, read without any Wirt call. */
    preview: (userId, cadence) => store.preview(userId, cadence),

    /** Deliver due completions, for one account right after its completion or for every account from maintenance. */
    async flush({ userId } = {}) {
      if (userId !== undefined) await store.wakeLinkWaits(userId).catch(() => undefined);
      const results = [];
      for (const row of await store.dueDeliveries(userId === undefined ? {} : { userId })) results.push(await deliver(row));
      return results;
    },

    exportAccount: userId => store.exportAccount(userId),
    forgetAccount: userId => store.forgetAccount(userId)
  };
}
