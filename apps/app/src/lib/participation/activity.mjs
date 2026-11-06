// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/** The existing product facts a later contribution can rely on. Missing facts never become activity. */
export async function activityReadiness({ campaign, store, userId, status }) {
  const ready = context => ({ state: 'ready', reason: null, ...context });
  const waiting = reason => ({ state: 'waiting', reason });
  if (campaign.survey === 'beta-v1') return ready();
  if (campaign.survey === 'return-v1') return waiting('The full cancellation, funded end and explicit return sequence cannot be confirmed here yet. You can save your separate account of that journey; it has not earned a reward.');
  if (campaign.survey === 'quote-review-v1') {
    const previews = await Promise.all(['monthly', 'annual'].map(cadence => store.preview(userId, cadence)));
    const preview = previews.find(value => value?.quote?.quoteId);
    return preview ? ready({ preview }) : waiting('Review a real continuation quote first. Request a quote below or open the canonical quote journey at Works. A price description alone is not a recorded quote.');
  }
  if (campaign.survey === 'organisation-v1') {
    const components = status?.fundedComponents;
    if (!Array.isArray(components)) return waiting('Works has not supplied the additional participation-funded capacity standing. Included or already-paid slots do not establish this reward.');
    const component = components.find(value => value.state === 'active' && (status.capacity ?? []).some(slot => slot.slot === value.id && slot.funding !== 'included'));
    if (!component) return waiting('No active additional participation-funded organisation unit is available to this account. Included or already-paid capacity cannot stand in for this reward.');
    const slot = status.capacity.find(value => value.slot === component.id);
    if (!slot.binding) return waiting('The additional funded unit is Active unbound. Its calendar continues. Bind or rebind it from Plan & funding before describing the actual setup.');
    if (slot.binding.authority !== 'present') return waiting(slot.binding.authority === 'absent'
      ? 'GitHub does not confirm that you currently administer the bound organisation. Re-establish lawful authority before completing this contribution.'
      : 'Your current organisation authority is unavailable. Reconnect from Account, then retry; the funded calendar continues.');
    return ready({ component, organisationId: slot.binding.organisationId });
  }
  const use = await store.activityUse(userId);
  if (!use) return waiting('No completed managed operation in your funded scopes is recorded here yet. Follow an actual analysis before completing this contribution.');
  return ready({ use });
}

/** Account identity is checked on every read and write; fixture names and posted fields have no authority. */
export function audienceAllows(campaign, userId) {
  return campaign.survey === 'beta-v1' || (Number.isSafeInteger(userId) && userId === campaign.participantUserId);
}
