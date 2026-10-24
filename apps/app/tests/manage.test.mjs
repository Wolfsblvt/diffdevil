// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * The Manage console: the pure product model (allowances, capacity, explanatory states, the attention list, the Works
 * projection presentation and the return decision) and the console's journeys against the real local D1 and the
 * authorization service: selecting, enabling (with the one-writer declaration), stopping, swapping within a full
 * allowance, the Free connected organisation, history and the brief controls, the loopback commercial stand-in's
 * slots, the funding connection's disconnect and reconnect, and account closure. Nothing here reaches GitHub or Works.
 */
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { readAllowances, HOSTED_ALLOWANCES } from '../src/lib/manage/allowances.mjs';
import { attentionItems, capacityOf, describeRepository, heldBy } from '../src/lib/manage/states.mjs';
import { presentProjection, projectionKey, returnOutcome, formatMoney } from '../src/lib/manage/works.mjs';
import { loadManage, manageBadge } from '../src/lib/manage/model.mjs';
import { handleManageAction, handleDeparture, MESSAGES, briefSettingsFromForm } from '../src/lib/manage/actions.mjs';
import { effectiveConfiguration, defaultComparison } from '../src/lib/manage/configuration.mjs';
import { readNamespaceDefault } from '../src/lib/manage/defaults.mjs';
import { SESSION_COOKIE, openSession } from '../src/lib/routes.mjs';
import { resolveViewer } from '../src/lib/viewer.mjs';
import { ACCOUNTS } from '../qa/fixture.mjs';
import { presentEvent } from '../src/lib/manage/audit.mjs';
import { fixture, disposeFixture, signIn, viewerFor, ORIGIN } from './support.mjs';

after(disposeFixture);

const standing = (over = {}) => ({ state: 'active', accessState: 'available', installationState: 'active', executionActive: true, executionReason: null, historyEnabled: false, historyReason: 'explicitly-disabled', selected: true, selectedAt: '2026-10-01T00:00:00.000Z', lastDelivery: null, retainedUntil: null, writerStanding: 'administrator-declared', revision: 1, ...over });
// Distinct, stable identities per name: the capacity, choice and state functions compare repositories by ID.
const idOf = fullName => [...fullName].reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) % 1_000_000_007, 7);
const repo = (fullName, over = {}, standingOver = {}) => { const [owner, name] = fullName.split('/'); return { repositoryId: idOf(fullName), fullName, owner, name, private: true, standing: standing(standingOver), ...over }; };
const namespace = (login, over = {}) => ({ login, kind: login.includes('-labs') || login.includes('guild') ? 'org' : 'user', plan: 'Free', funding: { kind: 'personal' }, installation: { state: 'active' }, repositories: [], ...over });

test('allowances follow the hosted offer when a subscription source exists and are unlimited otherwise, with operator configuration on top', () => {
  assert.deepEqual(readAllowances(undefined, { hosted: true }).free, HOSTED_ALLOWANCES.free);
  assert.equal(readAllowances(undefined, { hosted: false }).free.private, null);
  assert.equal(readAllowances('{"free":{"private":5,"publicHistory":20},"proOrganisation":{"private":null}}').free.private, 5);
  assert.equal(readAllowances('{"free":{"private":5,"publicHistory":20},"proOrganisation":{"private":null}}').proOrganisation.private, null);
  assert.equal(readAllowances('not json', { hosted: true }).invalid, true);
  assert.equal(readAllowances('{"free":{"private":-1}}', { hosted: true }).free.private, 3, 'an invalid value falls back whole');
});

test('capacity names the repositories holding each slot and, over the limit, never picks: only a saved choice decides what stays', () => {
  const allowances = readAllowances(undefined, { hosted: true });
  const pool = [repo('ada/one', {}, { selectedAt: '2026-10-01T00:00:00.000Z' }), repo('ada/two', {}, { selectedAt: '2026-10-02T00:00:00.000Z', executionActive: false, executionReason: 'unknown' }), repo('guild/three', {}, { selectedAt: '2026-10-03T00:00:00.000Z' }), repo('guild/four', {}, { selectedAt: '2026-10-04T00:00:00.000Z', executionActive: false, executionReason: 'unknown' }), repo('ada/pub', { private: false }, { historyEnabled: true, historyReason: null }), repo('ada/gone', {}, { state: 'offboarding', accessState: 'removed' })];
  const capacity = capacityOf({ plan: 'Free', kind: 'user', pooled: true, repositories: pool }, { allowances });
  assert.equal(capacity.kind, 'slots');
  // Four private repositories hold places in a pool of three (a reduction made it so): without a choice none holds a slot.
  assert.equal(capacity.over, true); assert.equal(capacity.chosen, false);
  assert.deepEqual(capacity.inSlot, []);
  assert.deepEqual(capacity.waiting.map(repository => repository.fullName), ['ada/one', 'ada/two', 'guild/three', 'guild/four']);
  const chosen = capacityOf({ plan: 'Free', kind: 'user', pooled: true, repositories: pool }, { allowances, keep: [pool[0].repositoryId, pool[3].repositoryId] });
  assert.deepEqual(chosen.inSlot.map(repository => repository.fullName), ['ada/one', 'guild/four'], 'the saved choice holds the slots');
  assert.deepEqual(chosen.waiting.map(repository => repository.fullName), ['ada/two', 'guild/three']);
  const within = capacityOf({ plan: 'Free', kind: 'user', pooled: true, repositories: pool.slice(0, 3) }, { allowances });
  assert.equal(within.over, false); assert.equal(within.inSlot.length, 3);
  assert.equal(capacity.publicHistory.used, 1); assert.equal(capacity.publicHistory.of, 10);
  const unlimited = capacityOf({ plan: 'Pro', kind: 'user', repositories: pool }, { allowances });
  assert.equal(unlimited.kind, 'unlimited');
  assert.equal(capacityOf({ plan: 'Pro', kind: 'org', repositories: pool }, { allowances }).of, 3, 'a Pro organisation has three private slots');
  assert.equal(capacityOf({ plan: 'Business', kind: 'org', repositories: pool }, { allowances }).kind, 'unlimited');
  assert.equal(capacityOf({ plan: 'Unconnected', kind: 'org', repositories: pool }, { allowances }).kind, 'none');
});

test('explanatory states keep reach, selection, consent, the latest delivery and the plan apart', () => {
  const allowances = readAllowances(undefined, { hosted: true });
  const org = namespace('parser-guild', { plan: 'Pro', funding: { kind: 'own-slot' } });
  const scope = { plan: 'Pro', kind: 'org', repositories: [] };
  const describe = (over, standingOver, ns = org, capacity = capacityOf(scope, { allowances })) => describeRepository(repo('parser-guild/x', over, standingOver), ns, capacity);
  assert.equal(describe({}, {}).kind, 'active');
  assert.equal(describe({ private: false }, {}).kind, 'labels');
  assert.equal(describe({}, { historyEnabled: true }).why, 'Size labels, the check and history.');
  assert.equal(describe({}, { executionActive: false, executionReason: 'unknown', selected: true }).kind, 'pending');
  assert.equal(describe({}, { executionActive: false, executionReason: 'explicitly-disabled', selected: false }).kind, 'stoppedByYou');
  assert.equal(describe({}, { executionActive: false, executionReason: 'unknown', selected: false }).kind, 'available');
  assert.equal(describe({}, { executionActive: false, executionReason: 're-consent-required', selected: true }).kind, 'reconsent');
  assert.equal(describe({}, { state: 'offboarding', accessState: 'removed' }).kind, 'removed');
  assert.equal(describe({}, { installationState: 'suspended', accessState: 'suspended' }).kind, 'stopped');
  assert.equal(describe({}, { lastDelivery: { code: 'E_APP_POLICY', state: 'repair' } }).kind, 'held');
  assert.equal(heldBy(standing({ lastDelivery: { code: 'E_EFFECT_INCOMPLETE', state: 'repair' } })), null, 'an effect failure is not a held policy');
  assert.equal(describe({}, {}, namespace('quarry-labs', { plan: 'Unfunded', funding: { kind: 'unfunded' } })).kind, 'unfunded');
  assert.equal(describe({}, {}, namespace('quarry-labs', { plan: 'Unconnected', funding: { kind: 'unconnected' } })).kind, 'unconnected');
  assert.equal(describeRepository({ fullName: 'a/b', name: 'b', owner: 'a', private: true, standing: undefined }, org, null).kind, 'unrecorded');
  // The fourth private repository of a Pro organisation is over the limit when it is not running, and running-over-the-allowance when it is.
  const four = [1, 2, 3, 4].map(index => repo(`parser-guild/r${index}`, {}, { selectedAt: `2026-10-0${index}T00:00:00.000Z`, executionActive: index !== 4, executionReason: index === 4 ? 'unknown' : null }));
  const capacity = capacityOf({ plan: 'Pro', kind: 'org', repositories: four }, { allowances });
  // Over the allowance after a reduction: every one of them is held until the administrator chooses, running or not.
  assert.equal(describeRepository(four[3], org, capacity).kind, 'overAllowance');
  assert.equal(describeRepository(four[0], org, capacity).kind, 'overAllowance');
  assert.match(describeRepository(four[0], org, capacity).why, /doesn't pick/u);
  const kept = capacityOf({ plan: 'Pro', kind: 'org', repositories: four }, { allowances, keep: four.slice(0, 3).map(repository => repository.repositoryId) });
  assert.equal(describeRepository(four[0], org, kept).kind, 'active');
  assert.match(describeRepository(four[3], org, kept).why, /chose to keep/u);
  // Public history over its places pauses collection for all of them; labels keep running.
  const publics = Array.from({ length: 11 }, (_, index) => repo(`ada/p${index}`, { private: false, repositoryId: 500 + index }, { historyEnabled: true, historyReason: null }));
  const free = namespace('ada', { plan: 'Free', kind: 'user' });
  const pooled = capacityOf({ plan: 'Free', kind: 'user', pooled: true, repositories: publics }, { allowances });
  assert.equal(pooled.publicHistory.over, true);
  const paused = describeRepository(publics[0], free, pooled);
  assert.equal(paused.label, 'History paused'); assert.equal(paused.historyHeld, true);
});

test('Needs you lists only decisions, in the console\'s words, and points at where each is made', () => {
  const allowances = readAllowances(undefined, { hosted: true });
  const held = repo('parser-guild/held', {}, { lastDelivery: { code: 'E_APP_POLICY', state: 'repair' } });
  const pending = repo('parser-guild/pending', {}, { executionActive: false, executionReason: 'unknown', selected: true, selectedAt: '2026-10-05T00:00:00.000Z' });
  const gone = repo('parser-guild/gone', {}, { state: 'offboarding', accessState: 'removed', retainedUntil: '2026-11-09T00:00:00.000Z' });
  const org = namespace('parser-guild', { plan: 'Pro', funding: { kind: 'paused' }, installation: { state: 'suspended' }, repositories: [held, pending, gone] });
  org.capacity = capacityOf({ plan: 'Pro', kind: 'org', repositories: org.repositories }, { allowances });
  for (const repository of org.repositories) repository.state = describeRepository(repository, org, org.capacity);
  const model = { viewerPlan: 'Pro', serviceConnection: 'disconnected', namespaces: [org], commercial: { status: { linked: true, commercial: { grace: { renewal: 'payment-due' } }, capacity: [{ slot: 'slot-2', funding: 'paid', binding: null }] } } };
  const items = attentionItems(model);
  assert.deepEqual(items.map(item => item.title), ['Your Pro renewal is overdue', 'GitHub App installation suspended on parser-guild', 'Pro is paused in parser-guild', 'parser-guild/held is held: invalid configuration', 'parser-guild/pending is waiting to be enabled', 'parser-guild/gone left the installation', 'Slot 2 is open: you pay for it, it funds nothing']);
  assert.equal(items[2].go, 'Reconnect');
  assert.equal(items[4].href, '/manage/repositories/parser-guild/pending');
  assert.ok(items[5].detail.includes('9 Nov 2026'));
});

test('a Wirt projection presents as one of the designed states, without a grace length, end date or countdown', () => {
  const base = { linked: true, plan: 'pro', reconciling: false, order: { epoch: 1, version: 3 }, pending: [], grants: [], protection: { kind: 'beta' }, capacity: [{ slot: 'slot-included', funding: 'included', pendingEndOn: null, binding: { organisationId: 7001, authority: 'present', display: 'parser-guild' } }, { slot: 'slot-2', funding: 'paid', pendingEndOn: null, binding: null }],
    commercial: { standing: 'funded', tier: 'pro', cadence: 'annual', period: { started_on: '2026-03-14', ends_on: '2027-03-14' }, renewalPreference: 'automatic', cancellationIntent: 'none', grace: null, ended: null, nextRenewal: { on: '2027-03-14', total_cents: 18000, currency: 'EUR', tax_inclusive: true } } };
  const with_ = over => ({ ...base, ...over, commercial: { ...base.commercial, ...(over.commercial ?? {}) } });
  assert.equal(projectionKey({ linked: false }), 'free');
  assert.equal(projectionKey(base), 'funded');
  assert.equal(projectionKey(with_({ commercial: { standing: 'first-payment-pending' } })), 'first-payment');
  assert.equal(projectionKey(with_({ commercial: { standing: 'renewal-in-grace', grace: { renewal: 'payment-due' } } })), 'overdue');
  assert.equal(projectionKey(with_({ commercial: { standing: 'renewal-in-grace', grace: { renewal: 'not-yet-invoiced' } } })), 'preparing');
  assert.equal(projectionKey(with_({ commercial: { cancellationIntent: 'at-period-end' } })), 'cancelling');
  assert.equal(projectionKey(with_({ pending: [{ kind: 'plan-change', target: 'free', effective_on: '2027-03-14' }] })), 'downgrade');
  assert.equal(projectionKey(with_({ commercial: { standing: 'ended', ended: { on: '2027-03-14', reason: 'cancelled', earlier_attempt: 'none' } } })), 'ended');
  assert.equal(projectionKey(with_({ commercial: { standing: 'ended', ended: { on: '2026-10-08', reason: 'unpaid-after-grace', earlier_attempt: 'unresolved' } } })), 'ended-unresolved');
  assert.equal(projectionKey(with_({ reconciling: true })), 'reconciling');
  assert.equal(projectionKey({ linked: true, commercial: null }), 'linking');
  const funded = presentProjection(base, { works: { experience: 'https://works.example/x' } });
  assert.equal(funded.planName, 'Pro');
  assert.match(funded.planSub, /Annual · with 1 additional organisation · €180 a year, tax included/u);
  assert.deepEqual(funded.rows.map(row => row.term), ['Funded through', 'Next renewal', 'Organisations', 'Price']);
  assert.equal(funded.rows[0].value, '13 Mar 2027');
  assert.equal(funded.compareable, true); assert.equal(funded.choosing, null);
  const overdue = presentProjection(with_({ commercial: { standing: 'renewal-in-grace', grace: { renewal: 'payment-due' } } }), { works: { experience: 'https://works.example/x' } });
  assert.equal(overdue.banner.tone, 'err'); assert.equal(overdue.banner.action.purpose, 'pay');
  assert.ok(!/grace|days left|countdown/iu.test(JSON.stringify(overdue)), 'no grace length or countdown anywhere');
  const cancelling = presentProjection(with_({ commercial: { cancellationIntent: 'at-period-end' } }), {});
  assert.equal(cancelling.choosing.target, 'free'); assert.equal(cancelling.banner.action, null, 'no Works action without a configured origin');
  const ending = presentProjection(with_({ capacity: [{ ...base.capacity[0], pendingEndOn: '2027-03-14' }] }), {});
  assert.equal(ending.slotBanners.length, 1); assert.match(ending.slotBanners[0].title, /Slot included ends on 14 Mar 2027/u);
  const business = presentProjection(with_({ commercial: { tier: 'business' } }), {});
  assert.equal(business.tier, 'Business');
  const gift = presentProjection(with_({ grants: [{ kind: 'gift', until: '2027-03-14' }] }), {});
  assert.ok(gift.rows.some(row => row.term === 'Funded by' && /gift/u.test(row.value)));
  assert.equal(formatMoney({ total_cents: 4200, currency: 'EUR' }), '€42');
  assert.equal(formatMoney({ total_cents: 4250, currency: 'EUR' }), '€42.50');
});

test('confirmed empty coverage is Free and distinct from reward-only, waiting and restore holds', () => {
  const status = { linked: true, commercial: null, plan: 'free', order: { epoch: 1, version: 1 }, capacity: [], grants: [],
    protection: null, betaGrants: [], participationRewards: [], fundedComponents: [], pending: [] };
  const presented = presentProjection(status);
  assert.equal(presented.key, 'no-coverage');
  assert.equal(presented.planName, 'Free');
  assert.equal(presented.banner.tone, 'info');
  assert.deepEqual(presented.rows, [{ term: 'Works benefits', value: 'None' }]);
  assert.equal(presented.compareable, false);
  assert.equal(presented.choosing, null);
  assert.equal(presented.ended, false);
  assert.deepEqual(presented.slotBanners, []);
  assert.equal(projectionKey({ ...status, order: null }), 'linking');
  assert.equal(projectionKey({ ...status, reconciling: true }), 'reconciling');
  assert.equal(projectionKey({ ...status, fundedComponents: null }), 'reward-only', 'unknown component facts cannot assert empty coverage');
  assert.equal(projectionKey({ ...status, participationRewards: null }), 'reward-only');
});

test('an applied reward-only answer is Free with visible benefits, distinct from waiting for the first Works answer', () => {
  const status = { linked: true, commercial: null, plan: 'free', order: { epoch: 1, version: 1 }, capacity: [], grants: [], protection: null,
    fundedComponents: [{ id: 'reward-component:1', name: 'Additional organisation slot', reason: 'Community contribution', state: 'queued', startsOn: null, endsOn: null, applicationDeadline: '2027-04-08T00:00:00Z' }] };
  const queued = presentProjection(status);
  assert.equal(queued.key, 'reward-only');
  assert.equal(queued.planName, 'Free');
  assert.equal(queued.planSub, 'No funded subscription');
  assert.deepEqual(queued.rows.map(row => row.term), ['Subscription', 'Additional organisation slot']);
  assert.equal(queued.rows[1].value, 'Queued');
  assert.match(queued.rows[1].sub, /Community contribution · Starts automatically with compatible Pro or Business coverage before 8 Apr 2027/u);
  const withoutDeadline = presentProjection({ ...status, fundedComponents: [{ ...status.fundedComponents[0], applicationDeadline: null }] });
  assert.match(withoutDeadline.rows[1].sub, /Starts automatically with compatible Pro or Business coverage/u);
  assert.ok(!/before|Apply/u.test(withoutDeadline.rows[1].sub));
  assert.equal(queued.compareable, false);
  assert.equal(queued.choosing, null);
  assert.deepEqual(queued.slotBanners, []);
  const expired = presentProjection({ ...status, fundedComponents: [{ ...status.fundedComponents[0], state: 'expired' }] });
  assert.equal(expired.rows[1].value, 'Expired');
  assert.equal(expired.rows[1].sub, 'Community contribution', 'an expired reward does not invite application');
  assert.equal(projectionKey({ ...status, order: null }), 'linking');
  assert.equal(projectionKey({ ...status, reconciling: true }), 'reconciling');
});

test('a component-funded slot ends with its reward term without claiming a customer removed or renewed it', () => {
  const status = { linked: true, plan: 'pro', pending: [], commercial: { standing: 'funded', tier: 'pro', cadence: 'monthly', period: { started_on: '2026-10-01', ends_on: '2026-11-01' }, renewalPreference: 'manual' },
    capacity: [{ slot: 'reward-component:1', funding: 'grant', pendingEndOn: '2026-11-01', binding: null }],
    fundedComponents: [{ id: 'reward-component:1', name: 'Additional organisation slot', state: 'active', endsOn: '2026-11-01' }] };
  const works = { experience: 'https://works.example/plan', relationship: 'https://works.example/benefits' };
  const open = presentProjection(status, { works }).slotBanners[0];
  assert.ok(open.title.startsWith('Additional organisation slot'));
  assert.ok(!/removed|keeps Pro/u.test(open.text));
  assert.match(open.text, /currently funds no organisation/u);
  assert.equal(open.action.destination, 'relationship');
  assert.equal(open.action.purpose, 'browse');
  const bound = presentProjection({ ...status, capacity: [{ ...status.capacity[0], binding: { organisationId: 7001, authority: 'unknown' } }] }, { works }).slotBanners[0];
  assert.ok(!/removed|keeps Pro/u.test(bound.text));
  const paid = presentProjection({ ...status, capacity: [{ ...status.capacity[0], funding: 'paid' }] }, { works }).slotBanners[0];
  assert.match(paid.text, /You removed it at Works/u);
  assert.equal(paid.action.purpose, 'renewal');
});

test('the return from Works is decided by what Works sent since the departure, never by the return itself', () => {
  const status = order => ({ linked: true, order, capacity: [{ slot: 'slot-included', binding: null }] });
  const departure = { purpose: 'change-plan', snapshot: { order: { epoch: 1, version: 3 }, capacity: 1 } };
  assert.equal(returnOutcome({ departure, status: status({ epoch: 1, version: 3 }) }), 'wait');
  assert.equal(returnOutcome({ departure, status: status({ epoch: 1, version: 4 }) }), 'done');
  assert.equal(returnOutcome({ departure: { ...departure, snapshot: { order: { epoch: 1, version: 3 }, capacity: 0 } }, status: status({ epoch: 1, version: 3 }) }), 'done', 'a new slot counts as confirmed');
  assert.equal(returnOutcome({ departure: { ...departure, purpose: 'browse' }, status: status({ epoch: 1, version: 3 }) }), 'none');
  assert.equal(returnOutcome({ departure: { purpose: 'link', snapshot: null }, status: { linked: true } }), 'done');
  assert.equal(returnOutcome({ departure: null, status: null, outcome: 'pending' }), 'link-failed');
  assert.equal(returnOutcome({ departure: null, status: null }), null);
});

test('the brief controls read as the shared settings contract and refuse what it refuses', () => {
  const form = new URLSearchParams({ mode: 'standard', historyWindowDays: '180', finalSummary: 'on', priority: 'companion,neighbours,activity' });
  form.append('modules', 'neighbours'); form.append('modules', 'companion');
  const settings = briefSettingsFromForm(form);
  assert.deepEqual([...settings.modules], ['neighbours', 'companion']);
  assert.deepEqual([...settings.priority], ['companion', 'neighbours', 'activity']);
  assert.equal(settings.historyWindowDays, 180); assert.equal(settings.finalSummary, true);
  assert.throws(() => briefSettingsFromForm(new URLSearchParams({ mode: 'llm' })));
  assert.throws(() => briefSettingsFromForm(new URLSearchParams({ mode: 'standard', priority: 'neighbours' })), /priority/u);
});

test('a namespace default is read with the engine, keeps only the policy subset, and joins as the account layer', () => {
  const parsed = readNamespaceDefault('version: 1\npresets: [size@1]\nscopes:\n  tests: { exclude: ["**/*.snap"] }\n');
  assert.deepEqual(Object.keys(parsed.configuration).sort(), ['presets', 'scopes']);
  assert.match(parsed.policyId, /^policy-/u);
  assert.throws(() => readNamespaceDefault('version: 1\nbrief: { mode: standard }\n'), /does not allow brief/u);
  assert.throws(() => readNamespaceDefault('{"version":1,"bands":{"size":{"S":40}}}'));
});

/** Post one console action as the signed-in browser would. */
async function act(app, cookie, fields) {
  const body = new URLSearchParams(fields);
  const response = await handleManageAction(new Request(`${ORIGIN}/manage/do`, { method: 'POST', headers: { cookie: `${SESSION_COOKIE}=${cookie}`, origin: ORIGIN, 'content-type': 'application/x-www-form-urlencoded' }, body }), await locals(app, cookie));
  assert.equal(response.status, 303, `${fields.action}: ${response.status}`);
  const location = new URL(response.headers.get('location'), ORIGIN);
  return { location, message: location.searchParams.get('m'), reason: location.searchParams.get('reason'), headers: response.headers };
}
async function locals(app, cookie) {
  const opened = await openSession(new Request(`${ORIGIN}/manage`, { headers: { cookie: `${SESSION_COOKIE}=${cookie}` } }), app);
  assert.ok(!('refusal' in opened), `session refused: ${opened.refusal}`);
  const viewer = await resolveViewer({ reads: opened.reads, actor: opened.actor, store: app.store, entitlement: app.entitlement, cache: app.cache });
  return { runtime: app, session: opened, viewer };
}
async function model(app, cookie) { const context = await locals(app, cookie); return { ...context, model: await loadManage({ viewer: context.viewer, session: context.session, runtime: app }) }; }
const COMMERCIAL_PRO = JSON.stringify({ account: 123, linked: true, since: '2026-10-02', commercial: { standing: 'funded', tier: 'pro', cadence: 'annual', period: { started_on: '2026-03-14', ends_on: '2027-03-14' }, renewal_preference: 'automatic', cancellation_intent: 'none', grace: null, ended: null, next_renewal: { on: '2027-03-14', total_cents: 18000, currency: 'EUR', tax_inclusive: true } }, protection: { kind: 'beta' }, capacity: [{ slot: 'slot-included', funding: 'included', binding: { organisationId: 7001, authority: 'present', display: 'parser-guild' } }, { slot: 'slot-2', funding: 'paid', binding: null }], others: { 7002: 'business' } });
// The actual commercial service, with the existing GitHub wire double and disposable D1. Report delivery also goes
// through the fixture's fetch boundary; no funding operation reaches a live provider.
const WORKS_ENV = { WIRT_ORIGIN: 'https://works.example.test', WIRT_OAUTH_CLIENT_ID: 'fixture-works-client',
  WIRT_LINK_CALLBACK_URL: 'https://app.example.test/integrations/wirt/link/callback',
  WIRT_LINK_CONTINUATION_URL: 'https://app.example.test/manage/plan', WIRT_SIGNING_KEY_CURRENT: 'fixture-works-signing-material-at-least-32-bytes' };
const COMMERCIAL_FREE = JSON.stringify({ account: 123, linked: false, others: { 7002: 'business' } });

test('without a subscription source the console is Free and unlimited, with the same count in the badge and in Needs you', async () => {
  const { app: compose } = await fixture();
  const app = compose();
  const { cookie } = await signIn(app);
  const { model: loaded, viewer, session } = await model(app, cookie);
  assert.equal(loaded.viewerPlan, 'Free'); assert.equal(loaded.hosted, false);
  assert.deepEqual(loaded.namespaces.map(namespace => namespace.login), ['ada-sample', 'parser-guild']);
  assert.deepEqual(loaded.readers.map(namespace => namespace.login).sort(), ['kai-sample', 'northwind-tools']);
  assert.equal(loaded.namespaces[0].capacity.kind, 'unlimited', 'no allowance without a subscription source');
  assert.equal(loaded.namespaces[1].plan, 'Unconnected', 'an organisation on a Free account is not connected until chosen');
  const states = Object.fromEntries(loaded.namespaces.flatMap(namespace => namespace.repositories.map(repository => [repository.fullName, repository.state.kind])));
  assert.equal(states['ada-sample/dotfiles'], 'active'); assert.equal(states['ada-sample/notes-site'], 'labels'); assert.equal(states['parser-guild/parser-lab'], 'unconnected');
  assert.equal(loaded.firstRun, false, 'running repositories mean the setup is past its first run');
  const badge = await manageBadge({ viewer, session, runtime: app });
  assert.equal(badge.count, loaded.attention.length);
});

test('an unavailable organisation role stays unconfirmed in Manage and a later successful read restores administration', async () => {
  const { app: compose, github } = await fixture();
  const app = compose();
  const { cookie } = await signIn(app);
  try {
    github.state.membershipStatus = 403;
    const { model: unavailable } = await model(app, cookie);
    const reader = unavailable.readers.find(namespace => namespace.login === 'parser-guild');
    assert.equal(reader.role, 'unknown');
    assert.deepEqual(reader.authorityIssue, { code: 'E_PROVIDER_REQUEST', status: 403 });
    assert.equal(unavailable.namespaces.some(namespace => namespace.login === 'parser-guild'), false);
    assert.equal((await act(app, cookie, { action: 'free-connect', organisation: '7001' })).message, 'invalid');

    github.state.membershipStatus = 200;
    const { model: recovered } = await model(app, cookie);
    assert.equal(recovered.namespaces.find(namespace => namespace.login === 'parser-guild').administration.kind, 'owner');
    assert.equal(recovered.readers.some(namespace => namespace.login === 'parser-guild'), false);
  } finally { github.state.membershipStatus = 200; app.cache.clear(); }
});

test('on the hosted Free offer, selecting is bounded by the pooled allowance, an organisation must be connected first, and a swap lands the incoming repository as pending', async () => {
  const { app: compose } = await fixture();
  const app = compose(undefined, { env: { APP_COMMERCIAL_FIXTURE: COMMERCIAL_FREE, APP_PLAN_ALLOWANCES: JSON.stringify({ free: { private: 2, publicHistory: 10 }, proOrganisation: { private: 3 } }) } });
  const { cookie } = await signIn(app);
  let { model: loaded } = await model(app, cookie);
  assert.equal(loaded.hosted, true); assert.equal(loaded.allowances.free.private, 2);
  assert.equal(loaded.namespaces[0].capacity.kind, 'slots');
  // parser-guild is not connected: nothing can be selected there yet.
  assert.equal((await act(app, cookie, { action: 'select', repository: 'parser-guild/grammar-fuzz', back: '/manage/repositories' })).message, 'not-connected');
  assert.equal((await act(app, cookie, { action: 'free-connect', organisation: String(ACCOUNTS['parser-guild']), back: '/manage/repositories' })).message, 'free-connected');
  ({ model: loaded } = await model(app, cookie));
  assert.equal(loaded.freeConnected?.login, 'parser-guild');
  const guild = loaded.namespaces.find(namespace => namespace.login === 'parser-guild');
  assert.equal(guild.plan, 'Free'); assert.equal(guild.capacity.pooled, true);
  // dotfiles and parser-lab already run: the two pooled private slots are full, so grammar-fuzz must be swapped in.
  assert.deepEqual(guild.capacity.inSlot.map(repository => repository.fullName).sort(), ['ada-sample/dotfiles', 'parser-guild/parser-lab']);
  assert.equal((await act(app, cookie, { action: 'select', repository: 'parser-guild/grammar-fuzz', back: '/manage/repositories' })).message, 'allowance-full');
  const retainedBeforeSwap = await app.appStore.statement('SELECT COUNT(*) AS n FROM analytical_pull_requests WHERE repository_id=?', 1001).first();
  assert.equal((await act(app, cookie, { action: 'swap', repository: 'parser-guild/grammar-fuzz', outgoing: 'parser-guild/parser-lab', back: '/manage/repositories' })).message, 'swapped');
  assert.deepEqual(await app.appStore.statement('SELECT COUNT(*) AS n FROM analytical_pull_requests WHERE repository_id=?', 1001).first(), retainedBeforeSwap, 'the capacity swap keeps every retained record');
  ({ model: loaded } = await model(app, cookie));
  const states = Object.fromEntries(loaded.namespaces.flatMap(namespace => namespace.repositories.map(repository => [repository.fullName, repository.state.kind])));
  assert.equal(states['parser-guild/parser-lab'], 'stoppedByYou', 'the outgoing repository stopped and keeps its history');
  assert.equal(states['parser-guild/grammar-fuzz'], 'pending', 'the incoming repository holds the slot as Pending enable');
  assert.equal((await app.appStore.repositoryAdmission(1001)).execution.reason, 'explicitly-disabled');
  assert.equal((await app.store.repositoryStandings([1001])).get(1001).historyEnabled, false, 'the explicit private-capacity swap stops collection; retained data stays');
  // Enabling needs the one-writer declaration; with it the repository runs.
  assert.equal((await act(app, cookie, { action: 'enable', repository: 'parser-guild/grammar-fuzz', back: '/manage/repositories' })).message, 'writer-undeclared');
  assert.equal((await act(app, cookie, { action: 'enable', repository: 'parser-guild/grammar-fuzz', writer: 'declared', back: '/manage/repositories' })).message, 'enabled');
  const enabled = await app.appStore.repositoryAdmission(1003);
  assert.equal(enabled.state, 'active'); assert.equal(enabled.writer.confidence, 'administrator-declared'); assert.equal(enabled.execution.actorId, 123);
  // Release the pending slot of a selected-but-stopped repository, then stop the running one: both free their slots.
  assert.equal((await act(app, cookie, { action: 'stop', repository: 'parser-guild/grammar-fuzz', back: '/manage/repositories' })).message, 'stopped');
  ({ model: loaded } = await model(app, cookie));
  assert.equal(loaded.namespaces[0].capacity.inSlot.length, 1, 'only dotfiles holds a slot now');
  // Disconnecting the organisation stops what runs there and keeps the selections waiting for a connection.
  assert.equal((await act(app, cookie, { action: 'free-disconnect', back: '/manage/repositories' })).message, 'free-disconnected');
  ({ model: loaded } = await model(app, cookie));
  assert.equal(loaded.freeConnected, null);
  assert.equal(loaded.namespaces.find(namespace => namespace.login === 'parser-guild').plan, 'Unconnected');
  // Restore the fixture's running state for the other cases: parser-guild connected, parser-lab running with history on.
  await act(app, cookie, { action: 'free-connect', organisation: String(ACCOUNTS['parser-guild']), back: '/manage/repositories' });
  assert.equal((await act(app, cookie, { action: 'enable', repository: 'parser-guild/parser-lab', writer: 'declared', back: '/manage/repositories' })).message, 'enabled');
  assert.equal((await act(app, cookie, { action: 'history', repository: 'parser-guild/parser-lab', enabled: 'on', back: '/manage/repositories' })).message, 'history-on');
  assert.equal((await app.store.repositoryStandings([1001])).get(1001).historyEnabled, true);
});

test('the pull-request message controls save beside the stored policy layer and the effective configuration names every layer', async () => {
  const { app: compose } = await fixture();
  const app = compose();
  const { cookie } = await signIn(app);
  const form = new URLSearchParams({ action: 'brief', repository: 'ada-sample/dotfiles', mode: 'standard', historyWindowDays: '30', priority: 'activity,neighbours,companion', back: '/manage/repositories/ada-sample/dotfiles' });
  form.append('modules', 'activity');
  const saved = await act(app, cookie, Object.fromEntries(form)); // modules collapse to one; the shape is what matters here
  assert.equal(saved.message, 'brief-saved');
  const admission = await app.appStore.repositoryAdmission(1004);
  assert.equal(admission.configuration.value.brief.mode, 'standard');
  assert.equal(admission.configuration.value.brief.historyWindowDays, 30);
  assert.deepEqual(admission.configuration.value.repository, {}, 'an empty repository layer is stored beside the brief settings');
  const projected = (await app.auth.readAdmission({ session: cookie, repositoryId: 1004 })).body;
  assert.equal(projected.brief.route.effective, 'standard');
  const configuration = effectiveConfiguration({ admission: projected, namespace: { plan: 'Free', login: 'ada-sample' } });
  assert.equal(configuration.compiles, true);
  assert.deepEqual(configuration.chain.map(layer => layer.key), ['preset', 'supplied'], 'an empty App layer does not appear in the chain');
  assert.ok(configuration.rows.some(row => row.key === 'bands.size' && /XS < 20 · S < 100 · M < 500 · L < 1000 · XL/u.test(row.value)));
  assert.ok(configuration.rows.every(row => row.from === 'preset'));
  assert.equal((await act(app, cookie, { action: 'brief', repository: 'ada-sample/dotfiles', mode: 'llm', back: '/manage' })).message, 'invalid');
  assert.equal(await (await act(app, cookie, { action: 'brief', repository: 'northwind-tools/ci-recipes', mode: 'off', back: '/manage' })).message, 'unauthorized', 'a repository the person only reads cannot be configured');
});

test('a Pro default is saved by revision and adopted explicitly from a repository\'s settings; it is never a live layer', async () => {
  const { app: compose } = await fixture();
  const app = compose(undefined, { env: { APP_COMMERCIAL_FIXTURE: COMMERCIAL_PRO } });
  const { cookie } = await signIn(app);
  const { model: loaded } = await model(app, cookie);
  assert.equal(loaded.viewerPlan, 'Pro');
  const guild = loaded.namespaces.find(namespace => namespace.login === 'parser-guild');
  assert.equal(guild.plan, 'Pro'); assert.equal(guild.funding.kind, 'own-slot'); assert.equal(guild.funding.slot, 'slot-included');
  assert.equal(guild.capacity.of, 3, 'a Pro organisation has three private slots');
  assert.equal(loaded.namespaces[0].capacity.kind, 'unlimited', 'Pro personal has no limit');
  const saved = await act(app, cookie, { action: 'default-save', namespace: String(ACCOUNTS['parser-guild']), revision: '0', document: 'version: 1\npresets: [size@1]\nscopes:\n  generated: { exclude: ["**/*.snap"] }\n', back: '/manage/defaults' });
  assert.equal(saved.message, 'default-saved');
  const stored = await app.manage.namespaceDefault(7001);
  assert.equal(stored.revision, 1);
  assert.equal((await act(app, cookie, { action: 'default-save', namespace: String(ACCOUNTS['parser-guild']), revision: '0', document: 'version: 1\n', back: '/manage/defaults' })).message, 'stale', 'a stale revision writes nothing');
  // Saving a default changes nothing that runs: Pro has no live layer, and no repository differs silently.
  assert.equal((await app.policies.current({ repositoryId: 1001 })).basis, 'bundled-default');
  let projected = (await app.auth.readAdmission({ session: cookie, repositoryId: 1001 })).body;
  const comparison = defaultComparison({ admission: projected, namespaceDefault: stored });
  assert.equal(comparison.compiles, true);
  assert.ok(comparison.differences.some(row => row.key === 'scopes.generated' && row.before === '—' && /exclude \*\*\/\*\.snap/u.test(row.after)), 'the preview names what applying would change');
  assert.equal((await act(app, cookie, { action: 'default-apply', repository: 'parser-guild/parser-lab', defaultRevision: '0', back: '/manage' })).message, 'default-unchanged', 'an outdated preview applies nothing');
  assert.equal((await act(app, cookie, { action: 'default-apply', repository: 'ada-sample/dotfiles', defaultRevision: '1', back: '/manage' })).message, 'no-default', 'the personal namespace has no default to adopt');
  assert.equal((await act(app, cookie, { action: 'default-apply', repository: 'parser-guild/parser-lab', defaultRevision: '1', back: '/manage' })).message, 'default-applied');
  const adoption = await app.manage.adoption(1001);
  assert.equal(adoption.revision, 1); assert.equal(adoption.accountId, 7001);
  projected = (await app.auth.readAdmission({ session: cookie, repositoryId: 1001 })).body;
  assert.deepEqual(projected.configuration.value.repository.scopes, { generated: { exclude: ['**/*.snap'] } });
  assert.equal((await compose(undefined, { env: { APP_COMMERCIAL_FIXTURE: COMMERCIAL_PRO } }).policies.current({ repositoryId: 1001 })).basis, 'stored-app-configuration');
  const configuration = effectiveConfiguration({ admission: projected, namespace: guild, namespaceDefault: stored, adoption, login: 'parser-guild' });
  assert.deepEqual(configuration.chain.map(layer => layer.key), ['preset', 'repository', 'supplied']);
  assert.match(configuration.chain[1].label, /from parser-guild default rev 1/u, 'the effective origin names the adopted revision');
  assert.ok(configuration.rows.some(row => row.key === 'scopes.generated' && row.from === 'repository'));
  assert.equal(defaultComparison({ admission: projected, namespaceDefault: stored }).differences.length, 0, 'after applying, the repository matches the default');
  // Removing the default (or leaving Pro) leaves the adopted settings as the repository's own.
  assert.equal((await act(app, cookie, { action: 'default-remove', namespace: String(ACCOUNTS['parser-guild']), back: '/manage/defaults' })).message, 'default-removed');
  assert.equal(await app.manage.namespaceDefault(7001), null);
  assert.deepEqual((await app.auth.readAdmission({ session: cookie, repositoryId: 1001 })).body.configuration.value.repository.scopes, { generated: { exclude: ['**/*.snap'] } });
  // A saved default is not consulted by interpretation; only the applied settings are.
  const independent = compose(undefined, { env: { APP_COMMERCIAL_FIXTURE: COMMERCIAL_PRO } });
  independent.manage.namespaceDefault = async () => { throw new Error('D1 unavailable'); };
  assert.equal((await independent.policies.current({ repositoryId: 1001 })).basis, 'stored-app-configuration');
});

test('the loopback Works stand-in carries the slots, the first link, the return and unlinking the way the consumer does', async () => {
  const { app: compose } = await fixture();
  const app = compose(undefined, { env: { APP_COMMERCIAL_FIXTURE: COMMERCIAL_PRO } });
  const { cookie } = await signIn(app);
  let { model: loaded } = await model(app, cookie);
  assert.equal(loaded.commercialSource, 'fixture');
  assert.equal(loaded.commercial.status.capacity[1].binding, null);
  assert.equal(loaded.attention.some(item => /Slot 2 is open/u.test(item.title)), true);
  // The open slot funds no organisation the person administers that is recorded: parser-guild is already bound; northwind-tools is read-only.
  assert.equal((await act(app, cookie, { action: 'fund', slot: 'slot-2', organisation: String(ACCOUNTS['northwind-tools']), back: '/manage/plan' })).message, 'bind-refused', 'GitHub does not confirm administration of an organisation the person only reads');
  assert.equal((await act(app, cookie, { action: 'release-slot', organisation: String(ACCOUNTS['parser-guild']), back: '/manage/plan' })).message, 'unbound');
  assert.equal((await act(app, cookie, { action: 'fund', slot: 'slot-2', organisation: String(ACCOUNTS['parser-guild']), back: '/manage/plan' })).message, 'bound', 'the organisation the person administers binds through the real authorization check');
  ({ model: loaded } = await model(app, cookie));
  assert.equal(loaded.namespaces.find(namespace => namespace.login === 'parser-guild').funding.slot, 'slot-2');
  // Departure and return: leaving records what the person was doing; a return before Works confirms waits, a confirmed slot shows as done.
  const context = await locals(app, cookie);
  const departed = await handleDeparture(new Request(`${ORIGIN}/manage/depart?to=experience&purpose=add-slot&from=%2Fmanage%2Fplan`), context);
  assert.equal(departed.status, 303); assert.match(departed.headers.get('location'), /works-stand-in\?dest=experience$/u);
  ({ model: loaded } = await model(app, cookie));
  assert.equal(loaded.departure.purpose, 'add-slot');
  assert.equal(returnOutcome({ departure: loaded.departure, status: loaded.commercial.status }), 'wait');
  app.commercial.simulate('add-slot');
  ({ model: loaded } = await model(app, cookie));
  assert.equal(returnOutcome({ departure: loaded.departure, status: loaded.commercial.status }), 'done');
  assert.equal((await act(app, cookie, { action: 'dismiss-return', back: '/manage/plan' })).message, 'return-dismissed');
  assert.equal((await model(app, cookie)).model.departure, null);
  assert.equal((await act(app, cookie, { action: 'unlink', back: '/manage/plan' })).message, 'unlinked');
  ({ model: loaded } = await model(app, cookie));
  assert.equal(loaded.commercial.status.linked, false); assert.equal(loaded.viewerPlan, 'Free');
  const begun = await handleManageAction(new Request(`${ORIGIN}/manage/do`, { method: 'POST',
    headers: { origin: ORIGIN, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ action: 'link', back: '/manage/plan' }) }), await locals(app, cookie));
  assert.equal(begun.status, 200, 'commit a document before the external navigation');
  assert.equal(begun.headers.get('location'), null);
  assert.equal(begun.headers.get('cache-control'), 'private, no-store');
  assert.match(begun.headers.get('content-type'), /^text\/html/u);
  const continuation = await begun.text();
  assert.match(continuation, /http-equiv="refresh" content="0;url=[^"]*works-stand-in/u);
  const fallback = continuation.match(/<a\b[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/u);
  assert.ok(fallback, 'the continuation keeps an ordinary link');
  assert.match(fallback[1], /works-stand-in/u);
  assert.match(fallback[2].trim(), /\S/u, 'the fallback link has a non-empty name');
  assert.doesNotMatch(continuation, /<script|<form/u, 'automatic navigation needs no script or second form submission');
  assert.equal((await model(app, cookie)).model.departure.purpose, 'link');
  assert.equal(app.commercial.simulate('link-complete'), 'linked');
  ({ model: loaded } = await model(app, cookie));
  assert.equal(returnOutcome({ departure: loaded.departure, status: loaded.commercial.status, outcome: 'linked' }), 'done');
  assert.equal(projectionKey(loaded.commercial.status), 'first-payment');
});

test('commercial refusals keep a safe failed-request Audit event before returning to Plan', async () => {
  const { app: compose } = await fixture();
  const app = compose();
  const { cookie } = await signIn(app);
  const { viewer } = await locals(app, cookie);
  const cases = [
    ['E_COMMERCIAL_LINK_PENDING', 'link-pending'],
    ['E_COMMERCIAL_UNAVAILABLE', 'commercial-unavailable'],
    ['E_COMMERCIAL_ALREADY_LINKED', 'already-linked'],
    ['E_COMMERCIAL_NOT_FUNDED', 'not-funded'],
    ['E_SERVICE_RECONNECT_UNCONFIRMED', 'reconnect-unconfirmed'],
    ['E_COMMERCIAL_provider-payload-must-not-be-retained', 'commercial-unavailable']
  ];
  for (const [code, message] of cases) {
    const before = await app.manage.events({ accountIds: [viewer.userId] });
    const fail = async () => { throw Object.assign(new Error('https://works.example.test/authorize?code=fixture-private'), { code }); };
    app.commercial = { beginLink: fail, reconnectFundingAuthorization: fail };
    const action = code === 'E_SERVICE_RECONNECT_UNCONFIRMED' ? 'reconnect' : 'link';
    const answer = await act(app, cookie, { action, back: '/manage/plan', namespace: String(ACCOUNTS['parser-guild']),
      organisation: String(ACCOUNTS['parser-guild']), repository: 'parser-guild/grammar-fuzz' });
    assert.equal(answer.message, message);
    const events = await app.manage.events({ accountIds: [viewer.userId] });
    assert.equal(events.length, before.length + 1, `${code}: the refused request is recorded`);
    const event = events[0];
    assert.deepEqual(event.actor, { kind: 'person', id: viewer.userId, login: viewer.login });
    assert.equal(event.what, action === 'link' ? 'Started the Wolfsblvt Works link' : 'Reconnected the funding connection');
    assert.equal(event.result, 'failed');
    assert.equal(event.reason, MESSAGES[message].text, 'only fixed product copy is retained, never exception text or an arbitrary code');
    assert.equal(event.detail, null);
    assert.equal(event.repositoryId, null);
    assert.equal(event.where, viewer.login, 'account operations cannot be filed against a submitted repository or namespace');
  }
});

test('a pre-authority commercial funding refusal stays in the signed-in account Audit', async () => {
  const { app: compose } = await fixture();
  const app = compose(undefined, { env: WORKS_ENV });
  assert.equal(app.commercialSource, 'commercial');
  const { cookie } = await signIn(app);
  const { viewer } = await locals(app, cookie);
  const foreign = ACCOUNTS['northwind-tools'];
  const before = await app.manage.events({ accountIds: [foreign] });
  const personalBefore = await app.manage.events({ accountIds: [viewer.userId] });
  const answer = await act(app, cookie, { action: 'fund', slot: 'review-slot', organisation: String(foreign),
    namespace: String(foreign), namespaceLogin: 'submitted-false-name', repository: 'submitted/repository', back: '/manage/plan' });
  assert.equal(answer.message, 'commercial-unavailable', 'the real unlinked consumer throws before organisation authority');
  assert.deepEqual(await app.manage.events({ accountIds: [foreign] }), before, 'the foreign tenant gets no event');
  const personal = await app.manage.events({ accountIds: [viewer.userId] });
  assert.equal(personal.length, personalBefore.length + 1);
  assert.equal(personal[0].where, viewer.login);
  assert.equal(personal[0].repositoryId, null);
  assert.deepEqual(personal[0].actor, { kind: 'person', id: viewer.userId, login: viewer.login });
  assert.equal(personal[0].result, 'failed');
  assert.equal(personal[0].reason, MESSAGES['commercial-unavailable'].text);
  assert.equal(personal[0].detail, null);
});

test('a release without a binding keeps its existing response and appends no invented applied Audit event', async () => {
  const { app: compose } = await fixture();
  const app = compose(undefined, { env: WORKS_ENV });
  const { cookie } = await signIn(app);
  const { viewer } = await locals(app, cookie);
  const foreign = ACCOUNTS['northwind-tools'];
  const before = await app.manage.events({ accountIds: [foreign, viewer.userId] });
  assert.equal((await act(app, cookie, { action: 'release-slot', organisation: String(foreign), namespace: String(foreign),
    namespaceLogin: 'submitted-false-name', back: '/manage/plan' })).message, 'unbound');
  assert.deepEqual(await app.manage.events({ accountIds: [foreign, viewer.userId] }), before);
});

test('real funding and release record server-owned targets and preserve a former administrator funder\'s withdrawal', async () => {
  const { app: compose, github } = await fixture();
  const app = compose(undefined, { env: WORKS_ENV });
  const { cookie } = await signIn(app);
  const { viewer } = await locals(app, cookie);
  const store = app.commercialStore, organisationId = ACCOUNTS['parser-guild'], foreign = ACCOUNTS['northwind-tools'];
  const linkId = crypto.randomUUID();
  try {
    const link = await store.saveEstablishedLink({ linkId, productAccount: viewer.userId, worksAccount: '77',
      intentId: crypto.randomUUID(), protectedGrant: 'unused-fixture-grant' });
    assert.equal(await store.transition(link, { applied: { epoch: 1, version: 1, result: 'applied', at: app.now(),
      projectionJson: JSON.stringify({ commercial: JSON.parse(COMMERCIAL_PRO).commercial,
        benefits: { organisation_capacity: [{ slot: 'review-slot', funding: 'paid', pending_end_on: null }] } }) } }), true);
    const fields = { slot: 'review-slot', organisation: String(organisationId), namespace: String(foreign),
      namespaceLogin: 'submitted-false-name', back: '/manage/plan' };
    const foreignBefore = await app.manage.events({ accountIds: [foreign] });
    assert.equal((await act(app, cookie, { ...fields, action: 'fund', organisation: String(foreign) })).message, 'bind-refused');
    assert.deepEqual(await app.manage.events({ accountIds: [foreign] }), foreignBefore);
    const refused = (await app.manage.events({ accountIds: [viewer.userId] }))[0];
    assert.equal(refused.where, viewer.login);
    assert.equal(refused.result, 'failed');
    assert.equal(refused.reason, MESSAGES['bind-refused'].text);
    for (const action of ['fund', 'release-slot', 'fund']) {
      assert.equal((await act(app, cookie, { ...fields, action })).message, action === 'fund' ? 'bound' : 'unbound');
      const event = (await app.manage.events({ accountIds: [organisationId] }))[0];
      assert.equal(event.where, 'parser-guild');
      assert.equal(event.result, 'applied');
      assert.equal(event.what, action === 'fund' ? 'Funded with a slot' : 'Released the funding slot');
      assert.equal(event.repositoryId, null);
      assert.deepEqual(event.actor, { kind: 'person', id: viewer.userId, login: viewer.login });
      assert.equal(event.detail, null);
    }
    github.state.roles.set('parser-guild', 'member');
    app.cache.clear();
    await app.commercial.status({ session: cookie });
    assert.equal((await store.binding(organisationId)).authority_observed, 'absent');
    assert.equal((await store.binding(organisationId)).display, null);
    const orgBefore = await app.manage.events({ accountIds: [organisationId] });
    const personalBefore = await app.manage.events({ accountIds: [viewer.userId] });
    const withdrawalContext = await locals(app, cookie);
    const githubCallsBefore = github.calls.length;
    const withdrawn = await handleManageAction(new Request(`${ORIGIN}/manage/do`, { method: 'POST', headers: { origin: ORIGIN,
      'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ ...fields, action: 'release-slot' }) }), withdrawalContext);
    assert.equal(withdrawn.status, 303);
    assert.equal(new URL(withdrawn.headers.get('location'), ORIGIN).searchParams.get('m'), 'unbound');
    assert.equal(await store.binding(organisationId), null, 'the funder can withdraw without current GitHub administration');
    const orgAfter = await app.manage.events({ accountIds: [organisationId] });
    assert.equal(orgAfter.length, orgBefore.length + 1, 'the verified withdrawal remains in the organisation Audit');
    assert.ok(github.calls.slice(githubCallsBefore).every(call => call.method === 'POST'
      && (/^\/applications\/[^/]+\/token$/u.test(call.path) || /^\/api\/wirt\/diffdevil\/links\/[^/]+\/reports$/u.test(call.path))),
    'the withdrawal permits session authentication and its scoped report delivery, without a protected organisation lookup');
    const released = orgAfter[0];
    assert.equal(released.accountId, organisationId);
    assert.equal(released.where, `organisation ${organisationId}`, 'unknown names use the server-established identity');
    assert.equal(released.what, 'Released the funding slot');
    assert.equal(released.result, 'applied');
    assert.equal(released.reason, null);
    assert.equal(released.detail, null);
    assert.equal(released.repositoryId, null);
    assert.deepEqual(released.actor, { kind: 'person', id: viewer.userId, login: viewer.login });
    assert.equal(presentEvent(released).where, `organisation ${organisationId}`, 'the existing Audit presenter retains the identity label');
    assert.deepEqual(await app.manage.events({ accountIds: [viewer.userId] }), personalBefore, 'the event is not moved to or duplicated on the personal account');
    assert.deepEqual(await app.manage.events({ accountIds: [foreign] }), foreignBefore);
  } finally {
    github.state.roles.delete('parser-guild');
    app.cache.clear();
    await app.appStore.database.prepare('DELETE FROM commercial_links WHERE link_id=?').bind(linkId).run();
  }
});

test('Manage answers committed funding and connection actions while their scoped report delivery is held or fails', { timeout: 10_000 }, async t => {
  const { app: compose } = await fixture();
  const app = compose(undefined, { env: WORKS_ENV });
  let { cookie } = await signIn(app);
  let context = await locals(app, cookie);
  const store = app.commercialStore, linkId = crypto.randomUUID();
  const originalFlush = app.commercial.flushReports;
  try {
    const link = await store.saveEstablishedLink({ linkId, productAccount: context.viewer.userId, worksAccount: '77',
      intentId: crypto.randomUUID(), protectedGrant: 'unused-fixture-grant' });
    assert.equal(await store.transition(link, { applied: { epoch: 1, version: 1, result: 'applied', at: app.now(),
      projectionJson: JSON.stringify({ commercial: JSON.parse(COMMERCIAL_PRO).commercial,
        benefits: { organisation_capacity: [{ slot: 'report-slot', funding: 'paid', pending_end_on: null }] } }) } }), true);

    for (const [action, organisation, message] of [
      ['fund', ACCOUNTS['parser-guild'], 'bound'],
      ['fund', ACCOUNTS['northwind-tools'], 'bind-refused'],
      ['disconnect', ACCOUNTS['parser-guild'], 'E_FUNDING_DISCONNECTED'],
      ['reconnect', ACCOUNTS['parser-guild'], 'reconnected'],
      ['release-slot', ACCOUNTS['parser-guild'], 'unbound']
    ]) {
      if (action === 'reconnect') { ({ cookie } = await signIn(app)); context = await locals(app, cookie); }
      let release;
      const held = new Promise(resolve => { release = resolve; });
      t.after(() => release());
      const sentLinks = [], pending = [];
      app.commercial.flushReports = async reportLinkId => {
        sentLinks.push(reportLinkId);
        await held;
        throw new Error('fixture delivery failure');
      };
      const response = await handleManageAction(new Request(`${ORIGIN}/manage/do`, { method: 'POST', headers: { origin: ORIGIN,
        'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ action, organisation: String(organisation),
        slot: 'report-slot', back: '/manage/plan' }) }), { ...context, executionContext: { waitUntil: promise => pending.push(promise) } });
      assert.equal(response.status, 303, 'the action answers before the held dispatcher finishes');
      assert.equal(new URL(response.headers.get('location'), ORIGIN).searchParams.get(action === 'disconnect' ? 'reason' : 'm'), message);
      assert.deepEqual(sentLinks, [linkId], 'only this mutation\'s server-owned link is dispatched');
      assert.equal(pending.length, 1);
      assert.equal(Boolean(await store.binding(ACCOUNTS['parser-guild'])), action !== 'release-slot');
      const report = await store.latestReport(linkId);
      assert.equal(report.state, 'pending');
      if (action === 'disconnect' || action === 'reconnect') assert.equal(JSON.parse(report.body).bindings[0].authority, action === 'disconnect' ? 'unknown' : 'present');
      release();
      await pending[0];
      assert.equal((await store.latestReport(linkId)).state, 'pending', 'an unexpected delivery failure cannot acknowledge the report');
      assert.equal(Boolean(await store.binding(ACCOUNTS['parser-guild'])), action !== 'release-slot', 'delivery failure cannot undo the committed action');
    }
  } finally {
    app.commercial.flushReports = originalFlush;
    await app.appStore.database.prepare('DELETE FROM commercial_links WHERE link_id=?').bind(linkId).run();
  }
});

test('disconnecting the funding connection ends the sessions and stays off until the explicit reconnect; closure refuses a linked plan and otherwise removes the account', async () => {
  const { app: compose } = await fixture();
  const app = compose(undefined, { env: { APP_COMMERCIAL_FIXTURE: COMMERCIAL_PRO } });
  const { cookie } = await signIn(app);
  assert.equal((await model(app, cookie)).model.serviceConnection, 'not-retained', 'the stand-in writes no commercial binding rows, so no funded purpose retains the grant');
  const disconnected = await act(app, cookie, { action: 'disconnect', back: '/manage/account' });
  assert.equal(disconnected.reason, 'E_FUNDING_DISCONNECTED');
  assert.match(disconnected.headers.get('set-cookie'), /__Host-diffdevil-session=;/u);
  assert.equal((await openSession(new Request(`${ORIGIN}/manage`, { headers: { cookie: `${SESSION_COOKIE}=${cookie}` } }), app)).refusal, 'E_SESSION_UNAVAILABLE', 'the browser session ended with the grant');
  const { cookie: again } = await signIn(app);
  assert.equal((await model(app, again)).model.serviceConnection, 'disconnected', 'ordinary sign-in does not reconnect');
  assert.equal((await act(app, again, { action: 'reconnect', back: '/manage/account' })).message, 'reconnected');
  assert.notEqual((await model(app, again)).model.serviceConnection, 'disconnected');
  assert.equal((await act(app, again, { action: 'close-account', confirm: 'ada-sample', back: '/manage/account' })).message, 'close-linked', 'closure while a Works plan is linked is an unsettled seam');
  assert.equal((await act(app, again, { action: 'close-account', confirm: 'wrong', back: '/manage/account' })).message, 'confirm-mismatch');
  await act(app, again, { action: 'unlink', back: '/manage/plan' });
  const closed = await act(app, again, { action: 'close-account', confirm: 'ada-sample', back: '/manage/account' });
  assert.equal(closed.reason, 'E_ACCOUNT_CLOSED');
  assert.equal((await openSession(new Request(`${ORIGIN}/manage`, { headers: { cookie: `${SESSION_COOKIE}=${again}` } }), app)).refusal, 'E_SESSION_UNAVAILABLE');
  assert.equal((await app.store.repositoryStandings([1004])).get(1004).historyEnabled, false, 'the personal repository\'s history is gone');
  assert.equal((await app.appStore.repositoryAdmission(1004)).state, 'pending-enable', 'and it stopped');
  assert.equal((await app.store.repositoryStandings([1001])).get(1001).historyEnabled, true, 'an organisation keeps its data');
  assert.equal(await app.manage.freeConnection(123), null);
  // A fresh sign-in is a fresh account.
  const { cookie: fresh } = await signIn(app);
  assert.equal((await model(app, fresh)).model.serviceConnection, 'not-retained');
  assert.ok(Object.values(MESSAGES).every(message => typeof message.text === 'string' && message.text.length > 0));
});

test('history deletion completes a repeated submitted form and refuses it after later settings or reconsent', async () => {
  const { app: compose, clock } = await fixture();
  const app = compose();
  const { cookie } = await signIn(app);
  const repository = 'ada-sample/dotfiles', repositoryId = 1004;
  const read = async () => (await app.auth.readAdmission({ session: cookie, repositoryId })).body;
  assert.equal((await act(app, cookie, { action: 'history', repository, enabled: 'on' })).message, 'history-on');
  const before = await read();
  const ordinary = await app.appStore.database.prepare('SELECT history_consent_origin FROM repositories WHERE repository_id=?').bind(repositoryId).first();
  assert.equal(before.history.origin, ordinary.history_consent_origin, 'ordinary consent origins retain their stored category');
  assert.equal((await act(app, cookie, { action: 'delete-history', repository, confirm: 'dotfiles' })).message, 'stale');
  assert.deepEqual((await read()).history, before.history, 'a missing revision deletes nothing');
  const fields = { action: 'delete-history', repository, confirm: 'dotfiles', revision: String(before.revision) };
  assert.equal((await act(app, cookie, fields)).message, 'history-deleted');
  const deletedAdmission = await read();
  assert.equal(deletedAdmission.history.enabled, false);
  assert.equal(deletedAdmission.history.origin, 'history-deletion', 'admission exposes the consent category, not the request identity');
  assert.equal((await app.appStore.repositoryConsentState(repositoryId)).history.origin, 'history-deletion');
  assert.equal((await app.store.repositoryStandings([repositoryId])).get(repositoryId).historyOrigin, 'history-deletion', 'the App readback exposes the same category');
  const database = app.appStore.database;
  const deletionState = async () => ({
    repository: await database.prepare('SELECT * FROM repositories WHERE repository_id=?').bind(repositoryId).first(),
    tombstone: await database.prepare('SELECT * FROM deletion_tombstones WHERE scope=?').bind(`history:${repositoryId}`).first(),
    checks: (await database.prepare('SELECT * FROM app_checks WHERE repository_id=?').bind(repositoryId).all()).results
  });
  await database.prepare("INSERT INTO app_checks(repository_id,pull_request,head_sha,policy_id,check_run_id) VALUES (?,2,'later-head','policy',2)").bind(repositoryId).run();
  const committed = await deletionState();
  assert.equal(committed.repository.settings_revision, before.revision + 1);
  assert.equal(committed.repository.history_consent_origin, `history-deletion-revision-${before.revision}`, 'the stored request identity remains exact');
  assert.ok(committed.tombstone);
  const originalClock = clock.value;
  try {
    clock.value = new Date(Date.parse(originalClock) + 60_000).toISOString();
    assert.equal((await act(app, cookie, fields)).message, 'history-deleted', 'the same captured form completes after a lost first response');
    assert.deepEqual(await deletionState(), committed, 'retry changes no deletion time, lifetime, revision or later check');
    const events = (await database.prepare("SELECT result, reason FROM administrative_events WHERE repository_id=? AND what='Deleted history' ORDER BY event_id DESC LIMIT 2").bind(repositoryId).all()).results;
    assert.deepEqual(events, [{ result: 'applied', reason: null }, { result: 'applied', reason: null }], 'both submissions record successful completion');
  } finally { clock.value = originalClock; }
  assert.equal((await act(app, cookie, { action: 'history', repository })).message, 'history-off');
  const laterSettings = await deletionState();
  assert.equal((await act(app, cookie, fields)).message, 'stale');
  assert.deepEqual(await deletionState(), laterSettings, 'even a later settings commit without reconsent keeps the old request stale');
  assert.equal((await act(app, cookie, { ...fields, revision: String(committed.repository.settings_revision) })).message, 'stale', 'a form rendered after the deletion cannot claim success from that earlier deletion when a same-time settings commit intervenes');
  assert.deepEqual(await deletionState(), laterSettings);
  assert.equal((await act(app, cookie, { action: 'history', repository, enabled: 'on' })).message, 'history-on');
  const reconsented = await read();
  const afterReconsent = await deletionState();
  assert.equal((await act(app, cookie, fields)).message, 'stale');
  assert.deepEqual(await deletionState(), afterReconsent, 'the stale request changes neither consent nor retained rows');
  assert.deepEqual((await read()).history, reconsented.history, 'the old request cannot revoke current consent');
  assert.equal((await act(app, cookie, { ...fields, revision: String(reconsented.revision) })).message, 'history-deleted');
  assert.equal((await read()).history.enabled, false);
});
