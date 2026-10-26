// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createParticipation } from '../src/lib/participation/service.mjs';
import { loadParticipation } from '../src/lib/participation/page.mjs';
import { presentCommercialClock } from '../src/lib/manage/works.mjs';

const now = () => '2027-03-01T09:00:00.000Z';
const clock = { offset_seconds: 31 * 86_400, effective_at: now() };
const campaign = { key: 'survey', survey: 'beta-v1' };
const quote = { expiresOn: '2027-04-02', dueNowCents: 450, discounts: [] };

test('a commercial quote expiry becomes a real cache deadline, without changing the quoted date or record time', async () => {
  const saved = [];
  const participation = createParticipation({ campaign, now,
    store: { savePreview: async (...args) => saved.push(args) },
    commercial: { rewardQuote: async () => ({ available: true, quote, commercialClock: clock }) } });
  assert.equal(await participation.requestPreview({ userId: 123, session: 'fixture-session', cadence: 'monthly' }), 'ready');
  assert.equal(saved[0][2], quote);
  assert.equal(saved[0][3], '2027-03-03T00:00:00.000Z');
  assert.equal(saved[0][2].expiresOn, '2027-04-02');
  const expired = createParticipation({ campaign, now, store: { savePreview: async () => assert.fail('an expired quote cannot enter the cache') },
    commercial: { rewardQuote: async () => ({ available: true, quote, commercialClock: { ...clock, offset_seconds: 40 * 86_400 } }) } });
  assert.equal(await expired.requestPreview({ userId: 123, session: 'fixture-session', cadence: 'monthly' }), 'not-quotable');
});

test('a later applied step lapses a previously cached preview even before its real cache expiry', async () => {
  const reward = { available: true, kind: 'discount', state: 'available', selected: null, claimClosesAt: '2027-05-01T00:00:00Z',
    campaign: { key: 'survey', reason: 'Participation reward' }, alternatives: [{ key: 'monthly', kind: 'discount', cadence: 'monthly', tier: 'Pro',
      standing: 'available', chargeClasses: ['first-purchase'], frequency: 'finite', uses: 3, unit: 'percent', value: 50 }], applications: [] };
  const status = { linked: true, commercialClock: clock, participationRewards: [reward] };
  const runtime = { now, commercial: {}, participation: { view: async () => ({ campaign, reward, completed: false }), preview: async () => ({ quote, createdAt: now() }) } };
  const load = () => loadParticipation({ runtime, viewer: { userId: 123 }, session: {}, model: { commercial: { status } }, preview: 'monthly' });
  assert.ok((await load()).quote);
  status.commercialClock = { ...clock, offset_seconds: 40 * 86_400 };
  assert.equal((await load()).quote, null);
  assert.ok((await load()).card, 'a lapsed preview leaves the reward and page intact');
});

test('the full safe-integer wire range does not turn presentation into an exception or a guessed real date', () => {
  const context = presentCommercialClock({ linked: true, commercialClock: { ...clock, offset_seconds: Number.MAX_SAFE_INTEGER } }, now());
  assert.match(context.text, /outside the displayable date range/u);
  assert.match(context.text, /Real: 2027-03-01/u);
});
