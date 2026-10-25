// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readRewardFacts, readProjectionRewards, createWirtClient, readSigningKeys } from '../../github-app/commercial-wirt.mjs';
import { rewardFor } from '../src/lib/participation/service.mjs';
import { presentReward, receiptOf } from '../src/lib/participation/present.mjs';
import { loadParticipation } from '../src/lib/participation/page.mjs';
import { rewardForms } from './fixtures/reward-forms.mjs';
import { createCommercialService } from '../../github-app/commercial.mjs';

const forms = rewardForms();
const campaign = { key: 'typed-reward' };
const view = reward => ({ completed: true, campaign, reward });
const cardFor = raw => presentReward(view(readRewardFacts(raw)), { now: '2026-10-25T00:00:00Z' });
const text = card => [card.title, ...card.lines, ...card.alternatives.map(item => item.terms)].join(' ');

test('queued earned time preserves the promised term and labels a forecast without inventing an access start', () => {
  const reward = readRewardFacts(forms.time);
  assert.equal(reward.state, 'queued');
  assert.equal(reward.units, 30);
  assert.equal(reward.startsOn, null);
  assert.equal(reward.expectedStartOn, '2030-01-01');
  assert.match(text(cardFor(forms.time)), /queued.*30 days.*Expected start/isu);
});

test('renewal-only finite and continuous discounts retain distinct promises and null application ends', () => {
  const finite = readRewardFacts(forms.finite);
  assert.equal(finite.validUntil, null);
  assert.equal(finite.alternatives[0].frequency, 'finite');
  assert.deepEqual(finite.alternatives[0].chargeClasses, ['renewal']);
  assert.equal(finite.alternatives[0].remainingUses, 4);
  assert.match(text(cardFor(forms.finite)), /next 6 monthly renewals/u);
  assert.doesNotMatch(text(cardFor(forms.finite)), /choose monthly or annual/u);
  assert.deepEqual(cardFor(forms.finite).previewCadences, []);
  const partiallyConsumed = structuredClone(forms.finite);
  partiallyConsumed.state = 'partially-consumed';
  partiallyConsumed.alternatives[0].standing = 'partially-consumed';
  const partialText = text(cardFor(partiallyConsumed));
  assert.match(partialText, /6 monthly renewals in all/u);
  assert.match(partialText, /4 discounted charges remain 50% off each remaining monthly renewal/u);
  const continuous = readRewardFacts(forms.continuous);
  assert.equal(continuous.alternatives[0].frequency, 'continuous');
  assert.equal(continuous.alternatives[0].uses, null);
  assert.match(text(cardFor(forms.continuous)), /each eligible monthly Pro charge.*No scheduled application end/u);
  assert.doesNotMatch(text(cardFor(forms.continuous)), /0 monthly|zero|next eligible Pro charge/u);
  assert.deepEqual(cardFor(forms.continuous).previewCadences, []);
  assert.match(text(cardFor({ ...forms.continuous, basis: { ...forms.continuous.basis, valid_until: '2030-12-01T00:00:00Z' } })), /Application ends/u);
});

test('protected-price options preserve exercise clocks, reserved standing and acquired public facts separately', () => {
  assert.match(text(cardFor(forms.protectedPrice)), /Earned, available to review.*Exercise opens/u);
  assert.deepEqual(cardFor(forms.protectedPrice).previewCadences, []);
  for (const state of ['reserved', 'exercised']) {
    const raw = structuredClone(forms.protectedPrice);
    raw.state = state;
    raw.alternatives[0].standing = state;
    raw.alternatives[0].acquisition = { state, component_id: 'base', cap_cents: 900, operation_id: 'not-for-product' };
    const reward = readRewardFacts(raw);
    assert.equal(reward.alternatives[0].exerciseClockAsOf, '2026-10-25T00:00:00Z');
    assert.equal(reward.alternatives[0].acquisition.capCents, 900);
    assert.equal('operation_id' in reward.alternatives[0].acquisition, false);
    assert.match(text(cardFor(raw)), state === 'reserved' ? /Reserved, not yet acquired/u : /Acquired protection: €9.00/u);
  }
});

test('funded component reward provenance and term survive an unbound unusable component projection', () => {
  const reward = readRewardFacts(forms.component);
  assert.equal(reward.id, 'specimen-funded-component');
  assert.equal(reward.component.bindingState, 'Unbound');
  assert.equal(reward.component.usable, false);
  assert.match(text(cardFor(forms.component)), /Community contribution.*30 days.*Unbound.*Not currently usable/u);
});

test('first-purchase monthly/annual choice retains both previews; heterogeneous choices remain unavailable', () => {
  assert.deepEqual(cardFor(forms.choice).previewCadences, ['monthly', 'annual']);
  const heterogeneous = { ...forms.choice, alternatives: [forms.choice.alternatives[0], forms.time.alternatives[0]] };
  assert.equal(readProjectionRewards({ participation_rewards: [heterogeneous] })[0].available, false);
});

test('mixed lists preserve valid rewards and safe visible refusals; unsafe envelopes cannot match a campaign', async () => {
  const list = readProjectionRewards({ participation_rewards: [forms.finite, forms.unsupported, null, { basis: { campaign: { key: 'unsafe' } } }] });
  assert.equal(list.length, 4);
  assert.equal(list[0].available, true);
  assert.equal(list[1].available, false);
  assert.equal(rewardFor(campaign, list).id, forms.finite.id);
  assert.equal(rewardFor(campaign, [...list].reverse()).id, forms.finite.id);
  assert.equal(rewardFor({ key: 'unsafe' }, list), null);
  assert.equal(cardFor(forms.finite).key, 'available');
  const refused = presentReward(view(list[1]));
  assert.equal(refused.key, 'unavailable');
  assert.deepEqual(refused.previewCadences, []);
  const runtime = { now: () => '2026-10-25T00:00:00Z', participation: { view: async () => view(list[0]), preview: () => { throw Error('not requested'); } },
    commercial: { rewardStanding: async () => ({ available: true, rewards: list }) } };
  const page = await loadParticipation({ runtime, viewer: { userId: 1 }, session: { session: 'fixture' }, model: { commercial: { status: { linked: true } } } });
  assert.match(text(page.card), /3 unreadable rewards/u);
});

test('the actual GET-rewards client isolates unsupported members without hiding a readable reward', async () => {
  const wirt = createWirtClient({ origin: 'https://works.example.test', callbackUrl: 'https://app.example.test/callback', oauthClientId: 'fixture',
    signing: readSigningKeys({ current: 'fixture-signing-key-at-least-32-bytes' }),
    fetch: async () => Response.json({ schema: 'wirt.participation-result/v1', next_charge: null, rewards: [forms.finite, forms.unsupported] }) });
  const result = await wirt.rewards({ linkId: 'fixture', productAccount: 1 });
  assert.equal(result.kind, 'rewards');
  assert.equal(result.rewards.length, 2);
  assert.equal(result.rewards[0].available, true);
  assert.equal(result.rewards[1].available, false);
});

test('continuous next-charge receipts never invent exhaustion or a post-reward price', () => {
  const receipt = receiptOf({ amountCents: 450, discounts: [{ reason: 'Participation', amountCents: 450, frequency: 'continuous', validUntil: null,
    unit: 'percent', value: 50, remainingUsesAfter: null, postRewardBaseCents: 900 }] }, { cadence: 'monthly' });
  assert.match(receipt.notes.join(' '), /each eligible monthly charge.*No scheduled application end/u);
  assert.doesNotMatch(receipt.notes.join(' '), /After the reward|Next monthly charge|0 charges/u);
});

test('completion-refusal reconciliation skips unsafe and unavailable reward members', async () => {
  let rewards = readProjectionRewards({ participation_rewards: [null, forms.unsupported, forms.finite] });
  const service = createCommercialService({ signing: {}, store: { activeLink: async () => ({ link_id: 'fixture', product_account: 1 }) },
    wirt: { completeParticipation: async () => ({ kind: 'refused', status: 409 }), rewards: async () => ({ kind: 'rewards', rewards }) } });
  const completion = { campaign: campaign.key };
  const result = await service.deliverParticipation({ userId: 1, completion });
  assert.equal(result.kind, 'reconciled');
  assert.equal(result.reward.id, forms.finite.id);
  rewards = readProjectionRewards({ participation_rewards: [null, forms.unsupported] });
  assert.equal((await service.deliverParticipation({ userId: 1, completion })).kind, 'refused');
});
