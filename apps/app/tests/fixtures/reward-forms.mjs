// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/** Synthetic public facts derived from RewardFacts::visible, visibleOption and FundedComponents::facts.
 * These are wire specimens, not customer records, PHP execution, payments or campaign configuration.
 */
export function rewardForms(campaignKey = 'typed-reward') {
  const campaign = { key: campaignKey, version: 1, name: 'Participation', reason: 'Community contribution' };
  const monthly = { key: 'monthly', kind: 'discount', tier: 'Pro', cadence: 'monthly', unit: 'percent', value: 50,
    frequency: 'finite', uses: 6, charge_classes: ['renewal'], combinable: false, remaining_uses: 4, first_eligible_on: null, standing: 'available' };
  const raw = (kind, alternatives, extra = {}, basis = {}) => ({ id: `specimen-${kind}`, state: 'available', selected_reward: null, claimed_at: null,
    starts_on: null, ends_on: null, basis: { kind, product: 'diffdevil', tier: 'Pro', campaign, scope: ['base'],
      claim_closes_at: '2030-12-01T00:00:00Z', valid_until: null, alternatives, ...basis }, alternatives, applications: [], ...extra });
  const time = raw('time', [{ key: 'month', kind: 'time', tier: 'Pro', cadence: 'monthly', standing: 'queued', remaining_uses: null, first_eligible_on: null }],
    { state: 'queued', selected_reward: 'month', claimed_at: '2026-10-20T00:00:00Z', queued_starts_on: '2030-01-01' }, { units: 30, duration: 'monthly', valid_until: '2030-12-01T00:00:00Z' });
  const finite = raw('discount', [monthly], { selected_reward: 'monthly' });
  const continuousAlternative = { ...monthly, key: 'continuing', frequency: 'continuous', remaining_uses: null };
  delete continuousAlternative.uses;
  const continuous = raw('discount', [continuousAlternative], { selected_reward: 'continuing', state: 'accepted' });
  const option = { key: 'base-option', kind: 'protected-price', tier: 'Pro', cadence: 'monthly', component_kind: 'base', line_id: 'base', currency: 'EUR',
    cap_cents: 900, exercise_opens_at: '2026-10-01T00:00:00Z', exercise_closes_at: '2030-12-01T00:00:00Z', promised_exercise_closes_at: '2030-12-01T00:00:00Z',
    expiry_reminder_at: '2030-11-25T00:00:00Z', exercise_paused: false, exercise_pause_seconds: 0, exercise_clock_as_of: '2026-10-25T00:00:00Z',
    operation_classes: ['first-purchase', 'renewal'], mutually_exclusive: true, requires_product_link: true, standing: 'available', acquisition: null, first_eligible_on: null, remaining_uses: null };
  const protectedPrice = raw('protected-price', [option]);
  const componentAlternative = { key: 'organisation', kind: 'funded-component', tier: null, cadence: 'monthly', component_kind: 'paid-subject', capacity_type: 'organisation',
    name: 'Additional organisation slot', reason: 'Community contribution', standing: 'active', first_eligible_on: null, remaining_uses: null };
  const component = raw('funded-component', [componentAlternative], { state: 'active', starts_on: '2026-10-20', ends_on: '2026-11-19',
    selected_reward: 'organisation', component: { component_id: 'reward-component:1', state: 'active', funded: true, base_funded: false, usable: false,
      starts_on: '2026-10-20', ends_on: '2026-11-19', original_ends_on: '2026-11-19', binding_state: 'Unbound', binding: null,
      binding_observation_current: false, product_application: null } }, { tier: null, units: 30, valid_until: '2030-12-01T00:00:00Z' });
  const choice = raw('discount', [{ ...monthly, uses: 3, charge_classes: ['first-purchase', 'renewal'], remaining_uses: 3 },
    { ...monthly, key: 'annual', cadence: 'annual', value: 20, uses: 1, charge_classes: ['first-purchase', 'renewal'], remaining_uses: 1 }]);
  const unsupported = raw('future-kind', [{ key: 'future', kind: 'future-kind' }]);
  return { time, finite, continuous, protectedPrice, component, choice, unsupported };
}
