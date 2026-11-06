// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/** The existing product facts a later contribution can rely on. Missing facts never become activity. */
export async function activityReadiness({ campaign, store, userId, status }) {
  const ready = context => ({ state: 'ready', reason: null, ...context });
  const waiting = reason => ({ state: 'waiting', reason });
  if (campaign.survey === 'beta-v1') return ready();
  // Campaign admission carries Wirt's canonical journey proof. This response attests the separate contribution,
  // not machine verification of commercial history; no new journey-attestation API or local ledger is selected.
  if (campaign.survey === 'return-v1') return ready();
  if (campaign.survey === 'quote-review-v1') {
    const previews = await Promise.all(['monthly', 'annual'].map(cadence => store.preview(userId, cadence)));
    const preview = previews.find(value => value?.quote?.quoteId);
    return preview ? ready({ preview }) : waiting('Review a real continuation quote first. Request a quote below or open the canonical quote journey at Works. A price description alone is not a recorded quote.');
  }
  if (campaign.survey === 'organisation-v1') {
    const components = status?.fundedComponents;
    const component = components?.find(value => value.state === 'active' && (status.capacity ?? []).some(slot => slot.slot === value.id && slot.funding !== 'included'));
    const slot = component ? status.capacity.find(value => value.slot === component.id) : null;
    let context = 'Genuine additional capacity for this contribution has not been established.';
    if (slot && !slot.binding) context = 'Projected additional capacity is Active unbound. Its funded calendar continues; bind or rebind it from Plan & funding.';
    else if (slot?.binding) {
      if (slot.binding.authority === 'absent') context = 'GitHub does not confirm that you currently administer the bound organisation.';
      else if (slot.binding.authority !== 'present') context = 'Current organisation authority is unavailable. Reconnect from Account, then retry.';
      else context = 'The projected additional slot is bound with present organisation authority. This alone does not establish this contribution\'s unit provenance.';
    }
    // The programme-unit sequencing/provenance premise is unresolved. Existing unrelated capacity is context, never
    // eligibility, and requiring the very reward issued after completion would be circular.
    return waiting(`${context} This contribution is not open to complete yet. You can save your separate setup account. Included, already-paid or unrelated capacity cannot qualify it.`);
  }
  const use = await store.activityUse(userId);
  if (!use) return waiting('No completed managed operation in your funded scopes is recorded here yet. Follow an actual analysis before completing this contribution.');
  return ready({ use });
}

/** Account identity is checked on every read and write; fixture names and posted fields have no authority. */
export function audienceAllows(campaign, userId) {
  return campaign.survey === 'beta-v1' || (Number.isSafeInteger(userId) && userId === campaign.participantUserId);
}
