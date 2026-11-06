// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
import { readSigningKeys, signedHeaders } from '../../github-app/commercial-wirt.mjs';

export const QUEUED_LINK = 'qa-queued-coverage';
export const QUEUED_KEY = 'fixture-queued-coverage-signing-key-at-least-32-bytes';

/** Check that a configured local Works stand-in exposes the six existing Plan & funding destinations. */
export async function queuedCoverageWorksAvailabilityJourney({ page, go, check, shot, ORIGIN }) {
  await go('/manage/plan');
  const exits = page.locator('section[data-standing] .m-exits');
  const links = await exits.locator('a').evaluateAll(elements => elements.map(element => ({
    label: element.innerText.trim(), href: element.getAttribute('href')
  })));
  const expected = [
    ['Change plan or billing period', 'experience', 'change-plan'],
    ['Renewal and cancellation', 'experience', 'renewal'],
    ['Gifts and benefits', 'relationship', 'browse'],
    ['Invoices and payments', 'invoices', 'browse'],
    ['Payment methods', 'paymentMethods', 'browse'],
    ['Works account and sign-in', 'account', 'browse']
  ];
  const destinationsMatch = links.length === expected.length && links.every((link, index) => {
    const url = new URL(link.href, ORIGIN);
    const [label, destination, purpose] = expected[index];
    return link.label === label && url.origin === new URL(ORIGIN).origin && url.pathname === '/manage/depart'
      && url.searchParams.get('to') === destination && url.searchParams.get('purpose') === purpose;
  });
  const unavailable = await exits.locator('.off').count();
  const note = (await exits.innerText()).split('\n').at(-1);
  check('queued coverage: configured Works keeps all six usable destinations', destinationsMatch
    && unavailable === 0
    && /local stand-in for/u.test(await exits.innerText()), JSON.stringify({ links, unavailable, note }));
  await shot('queued-coverage-configured-works');
}

/** Synthetic signed producer messages through the real receiver, D1, session-owned status and built Manage page. */
export async function queuedCoverageJourney({ page, go, check, shot, ORIGIN }) {
  const queued = { state: 'paid-awaiting-start', confirmed_on: '2027-03-05', funding: 'paid', tier: 'pro', cadence: 'annual',
    period: { started_on: '2027-05-01', ends_on: '2028-05-01' } };
  const projection = (version, continuation = queued) => ({ schema: 'wirt.benefit-projection/v1', client: 'diffdevil',
    stream: { works_account: '77', link: { id: QUEUED_LINK, product_account: { github_user_id: 123 } } },
    account_lineage: [], order: { epoch: 1, version }, generated_at: new Date().toISOString(), source_operation: null,
    commercial: { standing: 'funded', tier: 'pro', cadence: 'monthly', period: { started_on: '2027-03-01', ends_on: '2027-05-01' },
      renewal_preference: 'automatic', cancellation_intent: 'none', grace: null, ended: null,
      next_renewal: { on: '2028-05-01', total_cents: 9000, currency: 'EUR', tax_inclusive: true }, paid_continuation: continuation },
    benefits: { organisation_capacity: [], grants: [{ kind: 'beta', until: '2027-03-31' }, { kind: 'gift', until: '2027-05-01' }], protection: null },
    pending: [], bindings_seen: [] });
  const push = async (value, account = '123') => {
    const path = '/integrations/wirt/projection', body = JSON.stringify(value);
    const headers = await signedHeaders(readSigningKeys({ current: QUEUED_KEY }), { method: 'POST', path, body, account });
    return fetch(`${ORIGIN}${path}`, { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body });
  };
  const standing = () => page.locator('section[data-standing]');
  const facts = () => standing().innerText();
  check('queued coverage: signed full projection applied', (await push(projection(1))).status === 200);
  const response = await go('/manage/plan');
  const paid = await facts();
  check('queued coverage: current grants, full queued year and later renewal render together',
    /Funded through\s+30 Apr 2027/u.test(paid) && /Paid period queued\s+Pro · Annual/u.test(paid)
    && /1 May 2027 through 30 Apr 2028/u.test(paid) && /Confirmed at Works on 5 Mar 2027/u.test(paid)
    && /Next renewal\s+€90 on 1 May 2028/u.test(paid) && /Beta access, through 30 Mar 2027/u.test(paid) && /A gift, through 30 Apr 2027/u.test(paid));
  check('queued coverage: the card stays current Pro with private response headers',
    await standing().getAttribute('data-standing') === 'funded' && await standing().locator('.plan b').textContent() === 'Pro'
    && /no-store/u.test(response.headers()['cache-control'] ?? '') && !/€90 a month|No charge until then/u.test(paid));
  const exits = standing().locator('.m-exits');
  check('queued coverage: unconfigured Works exits stay unavailable', await exits.locator('.off').count() === 6
    && await exits.locator('a').count() === 0
    && /Works is not configured on this deployment/u.test(await exits.innerText()));
  await shot('queued-coverage-paid');

  for (const [version, name, continuation, expected] of [
    [2, 'benefit', { ...queued, state: 'benefit-awaiting-start', funding: 'benefit' }, /Funded period queued/u],
    [3, 'held', { ...queued, state: 'needs-reconciliation' }, /Needs reconciliation at Works; no new active period confirmed/u],
    [4, 'renewal-unavailable', queued, /Next renewal\s+Not supplied by Works/u],
    [5, 'legacy', undefined, /Funded through\s+30 Apr 2027/u]
  ]) {
    const value = projection(version, continuation);
    if (name === 'legacy') delete value.commercial.paid_continuation;
    if (name === 'renewal-unavailable') value.commercial.next_renewal = null;
    check(`queued coverage: ${name} signed projection applied`, (await push(value)).status === 200);
    await go('/manage/plan');
    const text = await facts();
    check(`queued coverage: ${name} renders its supplied standing`, expected.test(text)
      && (name !== 'legacy' || !/period queued|Continuation/u.test(text))
      && (name !== 'held' || !/Paid period queued|starts after current coverage/u.test(text)));
    await shot(`queued-coverage-${name}`);
  }
  const malformed = projection(6, { ...queued, period: { started_on: '2027-05-01' } });
  check('queued coverage: malformed future dates are refused', (await push(malformed)).status === 422);
  check('queued coverage: mismatched signed account cannot update the link', (await push(projection(6), '999')).status === 404);
  await go('/manage/plan');
  check('queued coverage: refused updates preserve the previous applied view', !/period queued|Continuation/u.test(await facts()));

  const pending = projection(6);
  pending.commercial.standing = 'first-payment-pending';
  pending.benefits.grants = [];
  check('queued coverage: pending payment projection applied', (await push(pending)).status === 200);
  await go('/manage/plan');
  check('queued coverage: a future paid period never confirms current payment',
    await standing().getAttribute('data-standing') === 'first-payment'
    && /Awaiting current payment confirmation/u.test(await facts())
    && /first payment is being confirmed/u.test(await page.locator('.m-stack').innerText()));
  await page.setViewportSize({ width: 1024, height: 900 });
  check('queued coverage: definition rows remain readable at compact desktop width',
    await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
  await shot('queued-coverage-pending-payment');
}
