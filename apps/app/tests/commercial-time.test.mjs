// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createParticipation } from '../src/lib/participation/service.mjs';
import { loadParticipation } from '../src/lib/participation/page.mjs';
import { presentCommercialClock } from '../src/lib/manage/works.mjs';
import { readProjectionBetaGrants } from '../../github-app/commercial-wirt.mjs';
import { accessContains } from '../src/lib/participation/calendar.mjs';

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

test('advanced actual beta windows require valid half-open real bounds while the original promise and v1 stay ordinary', () => {
  const ordinary = { started_on: '2028-04-01', until: '2028-05-01' };
  const access = { ...ordinary, real_started_at: '2027-03-01T12:00:00Z', real_until: '2027-03-02T12:00:00Z' };
  const grant = { id: 1, kind: 'beta', product: 'diffdevil', tier: 'pro', promised_units: 30, remaining_units: 29,
    original_window: ordinary, access_windows: [access], current_access: access };
  const read = value => readProjectionBetaGrants({ beta_grants: [value] }, 'wirt.benefit-projection/v2');
  assert.deepEqual(read(grant)[0].access_windows, [access]);
  assert.deepEqual(read(grant)[0].original_window, ordinary);
  for (const bad of [{ ...ordinary }, { ...access, real_started_at: undefined }, { ...access, real_until: undefined },
    { ...access, real_until: '2027-02-30T12:00:00Z' }, { ...access, real_until: '2027-03-02T12:00:00+01:00' },
    { ...access, real_until: '2027-02-28T12:00:00Z' }]) {
    assert.throws(() => read({ ...grant, access_windows: [bad] }), { code: 'E_COMMERCIAL_SHAPE' });
    assert.throws(() => read({ ...grant, current_access: bad }), { code: 'E_COMMERCIAL_SHAPE' });
  }
  for (const field of ['real_started_at', 'real_until']) {
    const bad = { ...ordinary, [field]: access[field] };
    assert.throws(() => readProjectionBetaGrants({ beta_grants: [{ ...grant, access_windows: [bad], current_access: null }] }), { code: 'E_COMMERCIAL_SHAPE' });
    assert.throws(() => readProjectionBetaGrants({ beta_grants: [{ ...grant, access_windows: [ordinary], current_access: bad }] }), { code: 'E_COMMERCIAL_SHAPE' });
  }
  const empty = { ...access, real_until: access.real_started_at };
  assert.deepEqual(read({ ...grant, access_windows: [empty], current_access: null })[0].access_windows, [empty]);
  const window = { realFrom: access.real_started_at, realUntil: access.real_until };
  assert.equal(accessContains('2027-03-01T11:59:59.999Z', window), false);
  assert.equal(accessContains('2027-03-01T12:00:00.000Z', window), true);
  assert.equal(accessContains('2027-03-02T12:00:00Z', window), false);
  assert.equal(accessContains(access.real_started_at, { realFrom: empty.real_started_at, realUntil: empty.real_until }), false);
});
