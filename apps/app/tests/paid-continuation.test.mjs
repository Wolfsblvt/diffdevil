// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readPaidContinuation, readWirtMessage } from '../../github-app/commercial-wirt.mjs';
import { presentProjection, projectionKey } from '../src/lib/manage/works.mjs';

const continuation = { state: 'paid-awaiting-start', confirmed_on: '2027-03-05', funding: 'paid', tier: 'pro', cadence: 'annual',
  period: { started_on: '2027-05-01', ends_on: '2028-05-01' } };
const commercial = { standing: 'funded', tier: 'pro', cadence: 'monthly',
  period: { started_on: '2027-03-01', ends_on: '2027-05-01' }, renewalPreference: 'automatic', cancellationIntent: 'none',
  nextRenewal: { on: '2028-05-01', total_cents: 9000, currency: 'EUR', tax_inclusive: true } };
const status = { linked: true, plan: 'pro', commercial, pending: [], grants: [{ kind: 'beta', until: '2027-03-31' }, { kind: 'gift', until: '2027-05-01' }], capacity: [] };

test('queued terms copy only the producer-declared public fields; legacy absence stays unknown', () => {
  assert.equal(readPaidContinuation(undefined), null);
  assert.equal(readPaidContinuation(null), null);
  const read = readPaidContinuation({ ...continuation, invoice_id: 'private', period: { ...continuation.period, internal: 'private' } });
  assert.deepEqual(read, { state: continuation.state, confirmedOn: continuation.confirmed_on, funding: 'paid', tier: 'pro', cadence: 'annual', period: continuation.period });
  for (const state of ['paid-awaiting-start', 'benefit-awaiting-start', 'needs-reconciliation']) {
    assert.equal(readPaidContinuation({ ...continuation, state }).state, state);
  }
});

test('unreadable queued commercial facts are refused rather than inferred', () => {
  for (const invalid of [false, {}, { ...continuation, state: 'active' }, { ...continuation, funding: null },
    { ...continuation, tier: null }, { ...continuation, cadence: null }, { ...continuation, confirmed_on: '2027-02-30' },
    { ...continuation, period: { started_on: '2027-05-01', ends_on: '2027-05-01' } },
    { ...continuation, period: { started_on: '2027-05-01' } }]) {
    assert.throws(() => readPaidContinuation(invalid), { code: 'E_COMMERCIAL_SHAPE' });
  }
  const wire = { schema: 'wirt.benefit-projection/v1', client: 'diffdevil', stream: { works_account: 'example', link: { id: 'link', product_account: { github_user_id: 123 } } },
    account_lineage: [], order: { epoch: 1, version: 1 }, generated_at: '2027-03-05T00:00:00Z', source_operation: null,
    commercial: { ...commercial, renewal_preference: 'automatic', cancellation_intent: 'none', grace: null, ended: null, next_renewal: null, paid_continuation: {} },
    benefits: { organisation_capacity: [], grants: [], protection: null }, pending: [], bindings_seen: [] };
  assert.throws(() => readWirtMessage(wire), { code: 'E_COMMERCIAL_SHAPE' });
  wire.commercial.paid_continuation = continuation;
  assert.equal(readWirtMessage(wire).kind, 'projection');
});

test('current beta and gift, queued full year and supplied renewal appear as distinct facts', () => {
  const view = presentProjection({ ...status, commercial: { ...commercial, paidContinuation: readPaidContinuation(continuation) } });
  assert.equal(view.key, projectionKey(status));
  assert.equal(view.planName, 'Pro');
  assert.equal(view.planSub, 'Current coverage');
  assert.deepEqual(view.rows.slice(0, 3).map(row => [row.term, row.value]), [
    ['Funded through', '30 Apr 2027'], ['Paid period queued', 'Pro · Annual'], ['Next renewal', '€90 on 1 May 2028']
  ]);
  assert.match(view.rows[1].sub, /1 May 2027 through 30 Apr 2028.*5 Mar 2027/u);
  assert.match(view.rows[2].sub, /after the queued annual period/u);
  assert.ok(view.rows.some(row => /Beta access, through 30 Mar 2027/u.test(row.value)));
  assert.ok(view.rows.some(row => /A gift, through 30 Apr 2027/u.test(row.value)));
  assert.ok(!JSON.stringify(view).includes('No charge until then'));
});

test('benefit, held, missing renewal and pending-payment states remain distinct', () => {
  const show = value => presentProjection({ ...status, commercial: { ...commercial, paidContinuation: readPaidContinuation(value), nextRenewal: null } });
  assert.ok(show({ ...continuation, state: 'benefit-awaiting-start', funding: 'benefit' }).rows.some(row => row.term === 'Funded period queued'));
  const held = show({ ...continuation, state: 'needs-reconciliation' });
  assert.match(held.rows.find(row => row.term === 'Continuation').sub, /Needs reconciliation.*no new active period confirmed/u);
  assert.equal(held.rows.find(row => row.term === 'Next renewal').value, 'Not supplied by Works');
  assert.ok(!held.planSub.includes('€'));
  const first = presentProjection({ ...status, commercial: { ...commercial, standing: 'first-payment-pending', paidContinuation: readPaidContinuation(continuation) } });
  assert.equal(first.key, 'first-payment');
  assert.equal(first.planSub, 'Awaiting current payment confirmation');
  assert.match(first.banner.title, /first payment is being confirmed/u);
  const legacy = show(undefined);
  assert.ok(!legacy.rows.some(row => /queued|Continuation/u.test(row.term)));
});
