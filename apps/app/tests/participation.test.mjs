// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * The participation reward campaign against local D1 and an independent Wirt double: the product survey and its
 * privacy, the durable signed completion outbox, Wirt's typed answers, restore and replay, and the reward standing and
 * receipts drawn only from Wirt's facts. The double verifies the exact signed bytes with node:crypto and keeps Wirt's
 * own idempotency, window, reservation and use rules; none of this is Wirt, a payment or a live campaign.
 */
import assert from 'node:assert/strict';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { after, before, test } from 'node:test';
import { Miniflare } from 'miniflare';
import { D1AppStore } from '../../github-app/storage.mjs';
import { createGitHubAppWorker } from '../../github-app/app.mjs';
import { D1CommercialStore } from '../../github-app/commercial-storage.mjs';
import { createCommercialService } from '../../github-app/commercial.mjs';
import { createWirtClient, readSigningKeys, readWirtMessage, readProjectionBetaGrants, readProjectionCommercialTimeZone } from '../../github-app/commercial-wirt.mjs';
import { migrationNames } from '../qa/seed.mjs';
import { readCampaign } from '../src/lib/participation/campaign.mjs';
import { D1ParticipationStore } from '../src/lib/participation/store.mjs';
import { createParticipation, eligibilityOf, rewardFor, betaAccessWindows } from '../src/lib/participation/service.mjs';
import { operationDate } from '../src/lib/participation/calendar.mjs';
import { loadParticipation } from '../src/lib/participation/page.mjs';
import { handleManageAction } from '../src/lib/manage/actions.mjs';
import { presentReward, receiptOf, standingOf } from '../src/lib/participation/present.mjs';
import { SURVEYS, readAnswers } from '../src/lib/participation/survey.mjs';

const APP = 'https://app.example.test';
const WIRT = 'https://works.example.test';
const KEY = 'fixture-signing-key-material-of-at-least-32-bytes';
const USER = 123, OTHER = 456, BUSINESS = 789;
const CAMPAIGN = readCampaign({ key: 'diffdevil-beta-survey', version: 1, survey: 'beta-v1', name: 'Beta survey', opensAt: '2027-03-01T00:00:00Z', closesAt: '2027-04-01T00:00:00Z', inviteAfterDays: 10, reminderAfterDays: 7 });
const REASON = 'Participation reward · DiffDevil beta survey';
const REWARDS = [
  { key: 'monthly', kind: 'discount', tier: 'Pro', cadence: 'monthly', unit: 'percent', value: 50, uses: 3, charge_classes: ['first-purchase', 'renewal'], combinable: false },
  { key: 'annual', kind: 'discount', tier: 'Pro', cadence: 'annual', unit: 'percent', value: 20, uses: 1, charge_classes: ['first-purchase', 'renewal'], combinable: false }
];
const PRICES = { monthly: 900, annual: 9000 };

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const sign = (key, parts) => createHmac('sha256', key).update(['wirt-http/v1', 'diffdevil', ...parts].join('\n')).digest('hex');

/**
 * An independent Wirt: signed admission per link and account, one earned reward per Works account and campaign, the
 * same completion fact replaying it, a different one conflicting, a completion identity never reassigned to another
 * account, explicit windows, and the reservation/confirmation/release/expiry/correction rules of the settled promise.
 */
function wirtDouble(clock) {
  const state = { links: new Map(), rewards: new Map(), requests: [], down: false, answer: null, loseAfterCommit: false, campaignOpen: true, ended: new Set() };
  const json = (status, value, headers = {}) => new Response(value === undefined ? null : JSON.stringify(value), { status, headers: { 'content-type': 'application/json', ...headers } });
  const facts = (reward, works) => {
    const consumed = reward.applications.length;
    const subscription = state.links.get(reward.link).subscription;
    const standing = reward.corrected ? 'corrected' : reward.reserved ? 'reserved' : reward.expired ? 'expired'
      : reward.selected && consumed >= REWARDS.find(value => value.key === reward.selected).uses ? 'consumed' : consumed > 0 ? 'partially-consumed' : subscription.paid ? 'accepted' : 'available';
    return { id: reward.id, state: standing, selected_reward: reward.selected, provenance: 'participation',
      basis: { kind: 'discount', product: 'diffdevil', campaign: { id: 4, key: CAMPAIGN.key, version: CAMPAIGN.version, name: 'DiffDevil beta survey', reason: REASON }, claim_closes_at: '2027-05-01T00:00:00Z', valid_until: '2027-08-01T00:00:00Z', alternatives: REWARDS },
      applications: reward.applications.map(entry => ({ operation_id: entry.operation, discount: entry.line, at: entry.at })),
      alternatives: REWARDS.map(value => ({ ...value, remaining_uses: value.uses - (reward.selected === value.key ? consumed : 0),
        first_eligible_on: subscription.paid && !reward.reserved && !['consumed', 'expired', 'corrected'].includes(standing) && subscription.cadence === value.cadence ? subscription.renewsOn : null,
        standing: reward.selected && reward.selected !== value.key ? 'retired' : standing })), works };
  };
  const line = (reward, cadence) => {
    if (!reward || reward.corrected || reward.expired) return null;
    const definition = REWARDS.find(value => value.cadence === cadence);
    if (reward.selected && reward.selected !== definition.key) return null;
    const remaining = definition.uses - (reward.selected === definition.key ? reward.applications.length : 0);
    if (remaining < 1) return null;
    return { benefit_id: reward.id, amount_cents: PRICES[cadence] * definition.value / 100, component_id: 'discount', remaining_uses_after: remaining - 1, post_reward_base_cents: PRICES[cadence],
      promise: { ...definition, product: 'diffdevil', currency: 'EUR', frequency: 'finite', campaign: { id: 4, key: CAMPAIGN.key, version: CAMPAIGN.version, name: 'DiffDevil beta survey', reason: REASON }, remaining_uses: remaining } };
  };
  const rewardOf = works => [...state.rewards.values()].find(reward => reward.works === works);
  async function fetch(input, init) {
    const url = new URL(input), method = init.method, headers = new Headers(init.headers);
    const body = init.body === undefined ? new Uint8Array() : new Uint8Array(init.body);
    const text = new TextDecoder().decode(body);
    state.requests.push({ method, path: url.pathname, account: headers.get('x-wirt-product-account'), nonce: headers.get('x-wirt-nonce'), text });
    assert.equal(init.redirect, 'manual');
    if (state.down) throw new TypeError('connection refused');
    const expected = sign(KEY, [method, url.pathname, headers.get('x-wirt-product-account'), headers.get('x-wirt-time'), headers.get('x-wirt-nonce'), sha(body)]);
    if (headers.get('x-wirt-signature') !== expected) return json(401, { message: 'unauthenticated' });
    const match = /^\/api\/wirt\/diffdevil\/links\/([^/]+)\/(participation-completions|rewards|reward-quotes)$/u.exec(url.pathname);
    if (!match) return json(404, { message: 'not found' });
    const linkId = decodeURIComponent(match[1]), link = state.links.get(linkId);
    if (state.ended.has(linkId)) {
      const notice = { schema: 'wirt.link-ended/v1', client: 'diffdevil', stream: { works_account: link.works, link: { id: linkId, product_account: { github_user_id: link.account } } }, order: { epoch: 1, version: 99 }, ended_at: '2027-03-20T00:00:00Z' };
      const bytes = JSON.stringify(notice), time = String(Math.floor(Date.parse(clock.value) / 1000)), nonce = randomUUID();
      return json(410, notice, { 'x-wirt-key': 'current', 'x-wirt-time': time, 'x-wirt-nonce': nonce, 'x-wirt-product-account': String(link.account), 'x-wirt-signature': sign(KEY, ['RESPONSE', url.pathname, String(link.account), time, nonce, sha(new TextEncoder().encode(bytes))]) });
    }
    if (!link || String(link.account) !== headers.get('x-wirt-product-account')) return json(404, { message: 'not found' });
    if (state.answer) return json(state.answer, { message: 'answer' });
    if (match[2] === 'participation-completions') {
      const input = JSON.parse(text);
      assert.deepEqual(Object.keys(input).sort(), ['campaign', 'completed_at', 'completion_id', 'event_id', 'version'], 'only the bounded completion fact reaches Wirt');
      assert.match(input.completed_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u);
      assert.notEqual(input.event_id, input.completion_id, 'the event and the completion are distinct identities');
      const refused = (status, message) => json(status, { schema: 'wirt.participation-result/v1', result: 'refused', message });
      // The source event decides replay: the identical fact replays; the same event with another fact is refused.
      const sameEvent = [...state.rewards.values()].find(reward => reward.completion.event_id === input.event_id);
      if (sameEvent) {
        if (sameEvent.works !== link.works || JSON.stringify(sameEvent.completion) !== JSON.stringify(input)) return refused(409, 'This source event already belongs to another immutable completion fact.');
        if (state.unstated) { state.unstated = false; return json(200, { schema: 'wirt.participation-result/v1', reward: facts(sameEvent, link.works) }); }
        return json(200, { schema: 'wirt.participation-result/v1', result: 'replayed', event_id: input.event_id, reward: facts(sameEvent, link.works) });
      }
      if ([...state.rewards.values()].some(reward => reward.completion.completion_id === input.completion_id)) return refused(409, 'This completion already belongs to an earned result.');
      if (rewardOf(link.works)) return refused(409, 'This account already earned this product campaign.');
      if (!state.campaignOpen || input.campaign !== CAMPAIGN.key || input.version !== CAMPAIGN.version) return refused(409, 'Campaign completion or claim window is closed.');
      const reward = { id: `reward-${state.rewards.size + 1}`, works: link.works, link: linkId, completion: input, selected: null, reserved: null, applications: [], expired: false, corrected: false };
      state.rewards.set(reward.id, reward);
      if (state.loseAfterCommit) { state.loseAfterCommit = false; return json(500, { message: 'lost' }); }
      if (state.unstated) { state.unstated = false; return json(200, { schema: 'wirt.participation-result/v1', reward: facts(reward, link.works) }); }
      return json(200, { schema: 'wirt.participation-result/v1', result: 'accepted', event_id: input.event_id, reward: facts(reward, link.works) });
    }
    const reward = rewardOf(link.works);
    if (match[2] === 'rewards') {
      const subscription = link.subscription;
      const next = subscription.paid ? line(reward, subscription.cadence) : null;
      return json(200, { schema: 'wirt.participation-result/v1', rewards: reward ? [facts(reward, link.works)] : [],
        next_charge: subscription.paid ? { on: subscription.renewsOn, amount_cents: PRICES[subscription.cadence] - (next?.amount_cents ?? 0), base_total_cents: PRICES[subscription.cadence], discounts: next ? [next] : [] } : null });
    }
    const { tier, cadence } = JSON.parse(text);
    assert.equal(tier, 'Pro');
    if (reward?.reserved) return json(409, { error: 'commercial-quote-unavailable' });
    const discount = line(reward, cadence);
    return json(200, { schema: 'wirt.participation-quote/v1', quote_id: randomUUID(), review_url: `${WIRT}/wirt/experience/quotes/1`, expires_on: new Date(Date.parse(clock.value) + 13 * 86_400_000).toISOString().slice(0, 10), tier: 'Pro', cadence, currency: 'EUR',
      charges: [{ component_id: 'base', amount_cents: PRICES[cadence] }], discounts: discount ? [discount] : [], due_now_cents: PRICES[cadence] - (discount?.amount_cents ?? 0), post_reward_total_cents: PRICES[cadence] });
  }
  // What Works does between product visits: accept an eligible quote (reserve), confirm or fail its payment, renew, expire, correct.
  const ops = {
    reserve(works, cadence) { const reward = rewardOf(works); assert.ok(line(reward, cadence)); reward.reserved = cadence; reward.selected = REWARDS.find(value => value.cadence === cadence).key; },
    confirm(works) {
      const reward = rewardOf(works), link = state.links.get(reward.link);
      const cadence = reward.reserved ?? link.subscription.cadence, discount = line(reward, cadence);
      reward.applications.push({ operation: `operation-${reward.applications.length + 1}`, line: discount, at: clock.value });
      reward.selected ??= REWARDS.find(value => value.cadence === cadence).key; reward.reserved = null;
      link.subscription = { paid: true, cadence, renewsOn: cadence === 'annual' ? '2028-03-20' : '2027-04-20' };
    },
    release(works) { const reward = rewardOf(works); reward.reserved = null; if (reward.applications.length === 0) reward.selected = null; },
    expire(works) { rewardOf(works).expired = true; },
    correct(works) { rewardOf(works).corrected = true; },
    rewardOf
  };
  return { state, fetch, ops, facts: works => (rewardOf(works) ? facts(rewardOf(works), works) : null) };
}

let mf, db, clock, double, commercialStore, commercial, store, participation;
const session = id => `session-${id}`;
const authorization = { authenticate: async value => ({ userId: Number(String(value).replace('session-', '')) }), observeOrganisationAuthority: async () => ({ authority: 'present', display: null }) };
const protector = { seal: async value => JSON.stringify(value), open: async value => JSON.parse(value) };

// Wire-shaped fixture of native producer c33d5d9; no PHP or installed delivery is executed here.
function nativeBeta(started_on = '2027-02-20', until = '2027-03-20') {
  return { id: 265, kind: 'beta', product: 'diffdevil', tier: 'pro', promised_units: 30,
    original_window: { started_on, until }, access_windows: [{ started_on, until }], current_access: { started_on, until }, remaining_units: 9 };
}
function projection({ linkId, works, account, version, tier = 'pro', standing = 'funded', rewards }) {
  return readWirtMessage({ schema: 'wirt.benefit-projection/v1', client: 'diffdevil', stream: { works_account: works, link: { id: linkId, product_account: { github_user_id: account } } },
    account_lineage: [], order: { epoch: 1, version }, generated_at: clock.value, source_operation: null,
    commercial: { standing, tier, cadence: 'monthly', period: { started_on: '2027-02-20', ends_on: '2027-03-20' }, renewal_preference: 'manual', cancellation_intent: 'none', grace: null, ended: null, next_renewal: null },
    benefits: { organisation_capacity: [], grants: [{ kind: 'beta', until: '2027-03-20' }], commercial_timezone: 'UTC', beta_grants: [nativeBeta()], protection: { kind: 'beta' }, ...(rewards === undefined ? {} : { participation_rewards: rewards }) }, pending: [], bindings_seen: [] });
}
async function link(account, works, { tier = 'pro' } = {}) {
  const linkId = `link-${account}`;
  await commercialStore.saveEstablishedLink({ linkId, productAccount: account, worksAccount: works, intentId: randomUUID(), protectedGrant: 'sealed' });
  double.state.links.set(linkId, { account, works, subscription: { paid: false } });
  await commercial.applyMessage(projection({ linkId, works, account, version: 1, tier }));
  return linkId;
}
const standing = async account => ({ standing: 'available', status: (await commercial.status({ session: session(account) })).body });
const form = entries => { const value = new FormData(); for (const [name, item] of entries) value.append(name, item); return value; };
const rows = async (table, where = '1=1', ...values) => (await db.prepare(`SELECT * FROM ${table} WHERE ${where}`).bind(...values).all()).results;
const completions = () => double.state.requests.filter(request => request.path.endsWith('/participation-completions'));

before(async () => {
  mf = new Miniflare({ workers: [{ config: { name: 'participation-test', type: 'worker', compatibilityDate: '2026-09-17', env: { APP_DB: { type: 'd1', id: `participation-${randomUUID()}` } },
    manifest: { mainModule: 'worker.mjs', modulesRoot: resolve('.'), modules: { 'worker.mjs': { type: 'esm', contents: 'export default { fetch() { return new Response("ok"); } };' } } } } }] });
  db = await mf.getD1Database('APP_DB');
  clock = { value: '2027-03-12T09:30:15.250Z' };
  const migrator = new D1AppStore(db);
  for (const name of await migrationNames()) await migrator.migrate(await readFile(resolve('apps/github-app/migrations', name), 'utf8'));
  double = wirtDouble(clock);
  const signing = readSigningKeys({ current: KEY });
  const now = () => clock.value;
  commercialStore = new D1CommercialStore(db, { now });
  commercial = createCommercialService({ store: commercialStore, signing, authorization, protector, allowedOrigins: [APP], linkContinuationUrl: `${APP}/manage/plan`, now,
    wirt: createWirtClient({ origin: WIRT, oauthClientId: 'diffdevil-public-client', callbackUrl: `${APP}/integrations/wirt/link/callback`, signing, fetch: double.fetch, now: () => Date.parse(clock.value) }) });
  store = new D1ParticipationStore(db, { now });
  participation = createParticipation({ store, commercial, campaign: CAMPAIGN, now });
});
after(async () => { await mf?.dispose(); });

test('scheduled pruning waits for preservation, and a failed preservation leaves the ledger available for retry', async () => {
  const effects = [], work = [];
  let release;
  const preserved = new Promise(resolve => { release = resolve; });
  const worker = createGitHubAppWorker({ store: { maintain: async () => { effects.push('pruned'); } }, beforePrune: () => preserved });
  await worker.scheduled({}, {}, { waitUntil: promise => work.push(promise) });
  assert.deepEqual(effects, []);
  release(); await Promise.all(work); assert.deepEqual(effects, ['pruned']);
  const failed = [];
  await createGitHubAppWorker({ store: { maintain: async () => { effects.push('unexpected prune'); } }, beforePrune: async () => { throw new Error('preservation unavailable'); } })
    .scheduled({}, {}, { waitUntil: promise => failed.push(promise) });
  await assert.rejects(Promise.all(failed), /preservation unavailable/u);
  assert.deepEqual(effects, ['pruned']);
});

test('campaign configuration carries its key, window and timing explicitly and refuses guesses', () => {
  assert.equal(CAMPAIGN.inviteAfterDays, 10);
  assert.equal(readCampaign(undefined), undefined);
  assert.throws(() => readCampaign({ ...CAMPAIGN, closesAt: CAMPAIGN.opensAt }), /closesAt after opensAt/u);
  assert.throws(() => readCampaign({ ...CAMPAIGN, survey: 'nps' }), /survey must be/u);
  assert.throws(() => readCampaign({ ...CAMPAIGN, reminderAfterDays: undefined }), /whole days/u);
});

test('participants, nonparticipants and an unreadable plan are told apart, and only a participant can answer', async () => {
  await link(USER, 'works-77');
  await link(BUSINESS, 'works-79', { tier: 'business' });
  assert.equal(eligibilityOf(await standing(USER)), 'participant');
  assert.equal(eligibilityOf(await standing(BUSINESS)), 'not-pro');
  assert.equal(eligibilityOf(await standing(OTHER)), 'not-linked');
  assert.equal(eligibilityOf({ standing: 'unavailable', status: null }), 'unknown', 'an unreadable Works answer is unknown, never "not eligible"');
  assert.equal(eligibilityOf({ standing: 'available', status: { linked: true, reconciling: true, commercial: { tier: 'pro' } } }), 'unknown');
  const answers = readAnswers(SURVEYS['beta-v1'], form([['used', 'size-labels']]));
  assert.equal(await participation.complete({ userId: OTHER, commercial: await standing(OTHER), answers }), 'not-eligible');
  assert.equal(await participation.complete({ userId: BUSINESS, commercial: await standing(BUSINESS), answers }), 'not-eligible');
  assert.equal((await rows('participation_responses')).length, 0, 'a refused completion stores nothing');
});

test('the survey reader keeps only known options and bounded text; a draft without the first answer stays incomplete', async () => {
  const survey = SURVEYS['beta-v1'];
  const answers = readAnswers(survey, form([['used', 'size-labels'], ['used', 'size-labels'], ['used', 'not-an-option'], ['keep', `  ${'x'.repeat(5000)}  `], ['ideas', 'line one\r\nline two'], ['extra', 'ignored']]));
  assert.deepEqual(answers.used, ['size-labels']);
  assert.equal(answers.keep.length, 4000);
  assert.equal(answers.ideas, 'line one\nline two');
  assert.equal('extra' in answers, false);
  const draft = readAnswers(survey, form([['friction', 'setup'], ['frictionDetail', 'The YAML took a while.']]));
  assert.equal(await participation.complete({ userId: USER, commercial: await standing(USER), answers: draft }), 'incomplete');
  const saved = await store.response(USER, CAMPAIGN);
  assert.equal(saved.state, 'draft');
  assert.equal(saved.answers.frictionDetail, 'The YAML took a while.', 'an incomplete completion keeps what was written');
  assert.equal((await rows('participation_deliveries')).length, 0, 'a draft has no outbound fact');
  assert.equal(completions().length, 0);
  assert.equal(standingOf(await participation.view({ userId: USER, commercial: await standing(USER) }), { now: clock.value }), 'draft');
});

test('a negative, mostly free-text completion qualifies like any other; Wirt receives only the bounded fact, signed for this account', async () => {
  const answers = readAnswers(SURVEYS['beta-v1'], form([['used', 'barely'], ['friction', 'wrong'], ['frictionDetail', 'Labels were wrong twice and I stopped trusting them.'], ['keep', 'Nothing yet, honestly.']]));
  // Wirt answers 503 first: the completion and its outbound fact are committed together, and delivery waits.
  double.state.answer = 503;
  assert.equal(await participation.complete({ userId: USER, commercial: await standing(USER), answers }), 'completed');
  const [response] = await rows('participation_responses', 'user_id=?', USER);
  const [delivery] = await rows('participation_deliveries', 'user_id=?', USER);
  assert.equal(response.state, 'completed');
  assert.equal(delivery.response_id, response.response_id);
  assert.equal(delivery.completed_at, '2027-03-12T09:30:15Z', 'whole seconds, as Wirt admits them');
  assert.equal(standingOf(await participation.view({ userId: USER, commercial: await standing(USER) }), { now: clock.value }), 'saved', 'completion saved, delivery not yet attempted');
  assert.deepEqual(await participation.flush({ userId: USER }), ['unavailable']);
  const pending = await store.delivery(response.response_id);
  assert.equal(pending.state, 'pending');
  assert.equal(pending.outcome, 'unavailable');
  assert.equal(pending.nextAttemptAt, '2027-03-12T09:31:15.250Z', 'the first retry waits a minute');
  assert.equal(standingOf(await participation.view({ userId: USER, commercial: await standing(USER) }), { now: clock.value }), 'pending');
  assert.deepEqual(await participation.flush({ userId: USER }), [], 'not due yet: no second request inside the backoff');
  // A transport failure is an unknown outcome, retried after the next step of the backoff.
  double.state.answer = null; double.state.down = true;
  clock.value = '2027-03-12T09:32:00.000Z';
  assert.deepEqual(await participation.flush(), ['unknown']);
  assert.equal((await store.delivery(response.response_id)).nextAttemptAt, '2027-03-12T09:37:00.000Z');
  // Wirt commits but its answer is lost: still unknown. The same event is replayed and Wirt states it.
  double.state.down = false; double.state.loseAfterCommit = true;
  clock.value = '2027-03-12T09:38:00.000Z';
  assert.deepEqual(await participation.flush(), ['unknown']);
  assert.equal(double.state.rewards.size, 1, 'Wirt holds one reward');
  // An answer that states no result for this event is not taken as an acceptance or a replay.
  double.state.unstated = true;
  clock.value = '2027-03-12T09:55:00.000Z';
  assert.deepEqual(await participation.flush(), ['unreadable']);
  assert.equal((await store.delivery(response.response_id)).state, 'pending', 'an unstated answer leaves the fact pending');
  clock.value = '2027-03-12T11:00:00.000Z';
  assert.deepEqual(await participation.flush(), ['replayed']);
  const accepted = await store.delivery(response.response_id);
  assert.equal(accepted.state, 'accepted');
  assert.equal(accepted.outcome, 'replayed');
  assert.equal(accepted.receipt.campaign.reason, REASON);
  assert.equal(double.state.rewards.size, 1, 'replay never issues another reward');
  for (const request of completions()) {
    assert.equal(request.account, String(USER));
    assert.equal(request.path, `/api/wirt/diffdevil/links/link-${USER}/participation-completions`);
    assert.doesNotMatch(request.text, /trusting|honestly|barely|wrong/u, 'no answer or free text ever reaches Wirt');
    assert.deepEqual(JSON.parse(request.text), { campaign: CAMPAIGN.key, version: 1, event_id: accepted.eventId, completion_id: response.response_id, completed_at: '2027-03-12T09:30:15Z' });
  }
  assert.equal(await participation.complete({ userId: USER, commercial: await standing(USER), answers }), 'already-completed');
  assert.equal((await rows('participation_deliveries', 'user_id=?', USER)).length, 1, 'a duplicate completion writes no second fact');
  assert.equal(new Set(completions().map(request => JSON.parse(request.text).event_id)).size, 1, 'every retry carried the one durable event');
  assert.equal(new Set(completions().map(request => request.nonce)).size, completions().length, 'each retry had its own fresh transport nonce');
});

test('until a projection carries it, Wirt\'s own answer drives the reward; once it does, the projected facts win', async () => {
  let view = await participation.view({ userId: USER, commercial: await standing(USER) });
  assert.equal(view.rewardSource, 'receipt');
  assert.equal(standingOf(view, { now: clock.value }), 'available');
  await commercial.applyMessage(projection({ linkId: `link-${USER}`, works: 'works-77', account: USER, version: 2, rewards: [double.facts('works-77')] }));
  view = await participation.view({ userId: USER, commercial: await standing(USER) });
  assert.equal(view.rewardSource, 'projection');
  assert.equal(view.reward.alternatives.length, 2);
  assert.equal(view.reward.id, 'reward-1');
});

test('pre-conversion previews are Wirt quotes rendered as receipts, monthly and annual, with no local arithmetic', async () => {
  const monthly = await commercial.rewardQuote({ session: session(USER), cadence: 'monthly' });
  const annual = await commercial.rewardQuote({ session: session(USER), cadence: 'annual' });
  assert.equal(monthly.available && annual.available, true);
  assert.deepEqual(receiptOf(monthly.quote, { cadence: 'monthly', protectedPrice: true }), { lines: [{ label: 'DiffDevil Pro monthly', amount: '€9.00' }, { label: REASON, amount: '−€4.50', reward: true }],
    total: { label: 'Due now', amount: '€4.50' }, notes: ['50% off this and your next 2 monthly charges.', 'After the reward: €9/month at your protected beta price.'], on: null, reviewUrl: `${WIRT}/wirt/experience/quotes/1`, expiresOn: '25 Mar 2027' });
  assert.deepEqual(receiptOf(annual.quote, { cadence: 'annual', protectedPrice: true }).lines, [{ label: 'DiffDevil Pro annual', amount: '€90.00' }, { label: REASON, amount: '−€18.00', reward: true }]);
  assert.deepEqual(receiptOf(annual.quote, { cadence: 'annual', protectedPrice: true }).total, { label: 'Due now', amount: '€72.00' });
  assert.deepEqual(receiptOf(annual.quote, { cadence: 'annual', protectedPrice: true }).notes, ['20% off this annual term.', 'Next annual renewal: €90 at your protected beta price.']);
  // Changing what Wirt says changes the receipt: nothing is derived from the percentage.
  const odd = { ...monthly.quote, discounts: [{ ...monthly.quote.discounts[0], amountCents: 437 }], dueNowCents: 463 };
  assert.deepEqual(receiptOf(odd, { cadence: 'monthly' }).total.amount, '€4.63');
  assert.equal(receiptOf(odd, { cadence: 'monthly' }).lines[1].amount, '−€4.37');
  const card = presentReward(await participation.view({ userId: USER, commercial: await standing(USER) }), { now: clock.value, protectedPrice: true });
  assert.equal(card.key, 'available');
  assert.match(card.lines.join(' '), /choose monthly or annual at Works/u);
  assert.match(card.lines.join(' '), /Use it by 1 May 2027\. A price preview reserves nothing\./u);
  assert.deepEqual(card.alternatives.map(value => value.terms), ['50% off the next 3 monthly charges, base plan only', '20% off the next eligible annual charge, base plan only']);
  assert.doesNotMatch(JSON.stringify(card), /diffdevil-beta-survey|reward-1|operation-|completion/u, 'customer copy carries no internal key or identity');
});

test('accepting a quote reserves one branch through an unresolved payment; confirmation consumes one use; release frees it', async () => {
  double.ops.reserve('works-77', 'monthly');
  let view = { ...(await participation.view({ userId: USER, commercial: await standing(USER) })) };
  const live = await commercial.rewardStanding({ session: session(USER) });
  view = { ...view, reward: rewardFor(CAMPAIGN, live.rewards) };
  let card = presentReward(view, { now: clock.value });
  assert.equal(card.key, 'reserved');
  assert.equal(card.title, 'Reserved for your monthly payment');
  assert.deepEqual(card.alternatives.map(value => value.standing), ['reserved', 'retired'], 'the other branch is set aside');
  const blocked = await commercial.rewardQuote({ session: session(USER), cadence: 'annual' });
  assert.deepEqual(blocked, { available: false, reason: 'not-quotable' }, 'an unresolved reservation forbids a second branch or operation');
  // A definite payment failure releases the reservation while the claim window is open.
  double.ops.release('works-77');
  view = { ...view, reward: rewardFor(CAMPAIGN, (await commercial.rewardStanding({ session: session(USER) })).rewards) };
  assert.equal(presentReward(view, { now: clock.value }).key, 'available');
  // Reserve again and confirm: the first discounted charge is applied, two remain.
  double.ops.reserve('works-77', 'monthly');
  double.ops.confirm('works-77');
  const after = await commercial.rewardStanding({ session: session(USER) });
  view = { ...view, reward: rewardFor(CAMPAIGN, after.rewards) };
  card = presentReward(view, { now: clock.value, protectedPrice: true });
  assert.equal(card.key, 'partially-consumed');
  assert.equal(card.title, '2 discounted charges remain');
  assert.deepEqual(card.applications, [{ on: '12 Mar 2027', amount: '€4.50', remainingAfter: 2, after: '€9/month' }]);
  assert.match(card.alternatives[0].terms, /50% off/u);
  assert.equal(card.alternatives[0].remaining, 2);
  const next = receiptOf(after.nextCharge, { cadence: 'monthly', protectedPrice: true, label: 'Due on 20 Apr 2027' });
  assert.deepEqual(next.total, { label: 'Due on 20 Apr 2027', amount: '€4.50' });
  assert.deepEqual(next.notes, ['50% off this and your next monthly charge.', 'After the reward: €9/month at your protected beta price.']);
});

test('the last discounted charge exhausts the reward and returns the customer to the protected price', async () => {
  double.ops.confirm('works-77');
  const last = await commercial.rewardStanding({ session: session(USER) });
  assert.deepEqual(receiptOf(last.nextCharge, { cadence: 'monthly', protectedPrice: true }).notes, ['50% off this monthly charge.', 'Next monthly charge: €9 at your protected beta price.']);
  double.ops.confirm('works-77');
  const done = await commercial.rewardStanding({ session: session(USER) });
  assert.deepEqual(done.nextCharge.discounts, [], 'no discount line after the last use');
  const view = { ...(await participation.view({ userId: USER, commercial: await standing(USER) })), reward: rewardFor(CAMPAIGN, done.rewards) };
  const card = presentReward(view, { now: clock.value, protectedPrice: true });
  assert.equal(card.key, 'exhausted');
  assert.match(card.lines[0], /Pro continues at €9\/month at your protected beta price\./u);
  assert.equal(card.applications.length, 3);
  assert.equal(card.applications.at(-1).remainingAfter, 0);
});

test('an early annual converter is promised the next eligible renewal, not an immediate reduction', async () => {
  const linkId = await link(OTHER, 'works-88');
  double.state.links.get(linkId).subscription = { paid: true, cadence: 'annual', renewsOn: '2027-09-14' };
  const answers = readAnswers(SURVEYS['beta-v1'], form([['used', 'checks'], ['useful', 'checks']]));
  assert.equal(await participation.complete({ userId: OTHER, commercial: await standing(OTHER), answers }), 'completed');
  assert.deepEqual(await participation.flush({ userId: OTHER }), ['accepted']);
  const live = await commercial.rewardStanding({ session: session(OTHER) });
  const view = { ...(await participation.view({ userId: OTHER, commercial: await standing(OTHER) })), reward: rewardFor(CAMPAIGN, live.rewards) };
  const card = presentReward(view, { now: clock.value });
  assert.equal(card.key, 'scheduled');
  assert.equal(card.lines[0], '20% off the next eligible annual charge, from your annual renewal on 14 Sept 2027.');
  assert.match(card.lines[1], /nothing is refunded or rewritten/u);
  assert.equal(receiptOf(live.nextCharge, { cadence: 'annual' }).total.amount, '€72.00');
});

test('accounts are isolated: each sees only its own response, and Wirt refuses a completion identity reused by another account', async () => {
  const mine = await store.response(USER, CAMPAIGN), theirs = await store.response(OTHER, CAMPAIGN);
  assert.notEqual(mine.responseId, theirs.responseId);
  assert.equal(mine.answers.used[0], 'barely');
  assert.equal(theirs.answers.used[0], 'checks');
  await participation.deleteAnswers(OTHER);
  assert.equal((await store.response(USER, CAMPAIGN)).answers.used[0], 'barely', 'another account\'s deletion touches nothing here');
  // A forged reuse of USER's completion identity through another account's link is refused by Wirt and stays refused.
  const thirdLink = await link(555, 'works-99');
  const outcome = await commercial.deliverParticipation({ userId: 555, completion: { campaign: CAMPAIGN.key, version: 1, eventId: randomUUID(), completionId: mine.responseId, completedAt: mine.completedAt } });
  assert.equal(outcome.kind, 'refused');
  assert.equal(outcome.linkId, thirdLink);
  assert.equal(double.ops.rewardOf('works-99'), undefined);
});

test('deleting the answers keeps the completion and the earned reward; nothing is sent to Wirt', async () => {
  const before = double.state.requests.length;
  await participation.deleteAnswers(USER);
  const response = await store.response(USER, CAMPAIGN);
  assert.equal(response.state, 'completed');
  assert.equal(response.answers, null);
  assert.ok(response.answersDeletedAt);
  assert.equal(response.completedAt, '2027-03-12T09:30:15Z');
  assert.equal((await store.delivery(response.responseId)).state, 'accepted');
  assert.equal(double.state.requests.length, before, 'a product privacy action is not a commercial correction');
  assert.equal(double.ops.rewardOf('works-77').corrected, false);
  const exported = await store.exportAccount(USER);
  assert.equal(exported.length, 1);
  assert.equal(exported[0].answers, null);
  assert.equal(exported[0].delivery.outcome, 'replayed');
  assert.ok(exported[0].delivery.eventId && exported[0].delivery.rewardId, 'event and Wirt reward identities explain which product event earned which reward');
});

test('restore and replay: a restored pending fact replays without a second reward; a lost completion reconciles to the earned one', async () => {
  const response = await store.response(USER, CAMPAIGN);
  // An older database snapshot where the delivery was still pending.
  await db.prepare("UPDATE participation_deliveries SET state='pending', outcome=NULL, attempts=0, next_attempt_at=NULL, receipt_json=NULL, reward_id=NULL WHERE response_id=?").bind(response.responseId).run();
  assert.deepEqual(await participation.flush(), ['replayed'], 'the restored row kept its event, so Wirt replays it');
  assert.equal(double.state.rewards.size, 2, 'USER and OTHER each hold one reward; the replay added none');
  // An older snapshot from before the completion: the person completes again with a new identity.
  await db.prepare('DELETE FROM participation_deliveries WHERE user_id=?').bind(USER).run();
  await db.prepare('DELETE FROM participation_responses WHERE user_id=?').bind(USER).run();
  assert.equal(await participation.complete({ userId: USER, commercial: await standing(USER), answers: readAnswers(SURVEYS['beta-v1'], form([['used', 'pr-history']])) }), 'completed');
  assert.deepEqual(await participation.flush({ userId: USER }), ['reconciled']);
  const reconciled = (await rows('participation_deliveries', 'user_id=?', USER))[0];
  assert.equal(reconciled.state, 'accepted');
  assert.equal(reconciled.reward_id, 'reward-1', 'the earlier reward, not a new one');
  assert.equal(double.state.rewards.size, 2);
});

test('a closed campaign is refused by Wirt and shown as refused; an ended link holds delivery until the account is linked again', async () => {
  const late = 600;
  await link(late, 'works-60');
  double.state.campaignOpen = false;
  assert.equal(await participation.complete({ userId: late, commercial: await standing(late), answers: readAnswers(SURVEYS['beta-v1'], form([['used', 'other']])) }), 'completed');
  assert.deepEqual(await participation.flush({ userId: late }), ['refused']);
  const view = await participation.view({ userId: late, commercial: await standing(late) });
  assert.equal(standingOf(view, { now: clock.value }), 'refused');
  assert.equal(presentReward(view, { now: clock.value }).title, 'Works didn\'t accept this completion');
  assert.deepEqual(await participation.flush({ userId: late }), [], 'a refusal is final evidence, not resent');
  double.state.campaignOpen = true;
  // A signed 410 ends the link; the completion waits for a link instead of failing.
  const ended = 610;
  const endedLink = await link(ended, 'works-61');
  assert.equal(await participation.complete({ userId: ended, commercial: await standing(ended), answers: readAnswers(SURVEYS['beta-v1'], form([['used', 'checks']])) }), 'completed');
  double.state.ended.add(endedLink);
  assert.deepEqual(await participation.flush({ userId: ended }), ['link-required']);
  assert.equal((await commercialStore.link(endedLink)).state, 'ended');
  const waiting = await participation.view({ userId: ended, commercial: await standing(ended) });
  assert.equal(standingOf(waiting, { now: clock.value }), 'link-required');
  // Linked again (a new link), the same completion is delivered.
  const relinked = `link-${ended}-b`;
  await commercialStore.saveEstablishedLink({ linkId: relinked, productAccount: ended, worksAccount: 'works-61', intentId: randomUUID(), protectedGrant: 'sealed' });
  double.state.links.set(relinked, { account: ended, works: 'works-61', subscription: { paid: false } });
  assert.deepEqual(await participation.flush({ userId: ended }), ['accepted']);
  assert.equal((await rows('participation_deliveries', 'user_id=?', ended))[0].link_id, relinked);
});

test('expiry and correction read as their own standings; a stale available reward past its deadline reads as expired', async () => {
  const view = await participation.view({ userId: OTHER, commercial: await standing(OTHER) });
  double.ops.expire('works-88');
  let reward = rewardFor(CAMPAIGN, (await commercial.rewardStanding({ session: session(OTHER) })).rewards);
  assert.equal(presentReward({ ...view, reward }, { now: clock.value }).key, 'expired');
  double.ops.correct('works-88');
  reward = rewardFor(CAMPAIGN, (await commercial.rewardStanding({ session: session(OTHER) })).rewards);
  const corrected = presentReward({ ...view, reward }, { now: clock.value });
  assert.equal(corrected.key, 'corrected');
  assert.match(corrected.lines[0], /Charges already made are unchanged/u);
  const stale = { ...reward, state: 'available', selected: null };
  assert.equal(presentReward({ ...view, reward: stale }, { now: '2027-05-02T00:00:00Z' }).key, 'expired', 'the claim deadline Wirt sent has passed');
});

test('an accepted delivery whose standing Works cannot answer is unknown, not invented', async () => {
  const view = await participation.view({ userId: USER, commercial: { standing: 'unavailable', status: null } });
  const blind = { ...view, reward: null, delivery: { ...view.delivery, receipt: null } };
  assert.equal(standingOf(blind, { now: clock.value }), 'unknown');
  assert.equal(presentReward(blind, { now: clock.value }).title, 'Completion saved · reward standing unavailable');
  double.state.down = true;
  assert.deepEqual(await commercial.rewardStanding({ session: session(USER) }), { available: false, reason: 'unavailable' });
  double.state.down = false;
});

test('native beta facts preserve actual disjoint access and ignore promise, queued, paid/grace and link clocks', () => {
  const fact = { ...nativeBeta('2027-03-01', '2027-03-31'), access_windows: [{ started_on: '2027-03-01', until: '2027-03-03' }, { started_on: '2027-03-10', until: '2027-03-12' }], current_access: null, remaining_units: 0, private_basis: { actor: 999 } };
  const grants = readProjectionBetaGrants({ beta_grants: [fact] });
  assert.equal('private_basis' in grants[0], false);
  const status = { linked: true, commercial: { tier: 'pro', standing: 'funded', period: { started_on: '2027-01-01', ends_on: '2027-12-31' } }, betaGrants: grants, betaTimeZone: readProjectionCommercialTimeZone({ commercial_timezone: 'UTC' }) };
  assert.deepEqual(betaAccessWindows(status), [{ from: '2027-03-01', until: '2027-03-03' }, { from: '2027-03-10', until: '2027-03-12' }]);
  assert.deepEqual(betaAccessWindows({ ...status, betaGrants: [{ ...grants[0], access_windows: [] }] }), [], 'queued/unbegun time is not access');
  assert.equal(betaAccessWindows({ ...status, betaGrants: null, grants: [{ kind: 'beta', started_on: '2027-01-01', until: '2027-12-31' }], linkedSince: '2020-01-01' }), null, 'legacy/generic data remain unknown');
  assert.equal(betaAccessWindows({ ...status, reconciling: true }), null);
  assert.equal(betaAccessWindows({ ...status, betaTimeZone: null }), null, 'native windows without an authoritative timezone remain unknown');
  assert.equal(readProjectionCommercialTimeZone({ commercial_timezone: 'Europe/Berlin' }), 'Europe/Berlin');
  assert.equal(readProjectionCommercialTimeZone({ commercial_timezone: 'America/Los_Angeles' }), 'America/Los_Angeles');
  assert.equal(readProjectionCommercialTimeZone({ commercial_timezone: 'invalid-fixture-zone' }), null);
  assert.equal(readProjectionCommercialTimeZone({ commercial_timezone: '+02:00' }), null);
  assert.equal(readProjectionCommercialTimeZone({}), null);
  assert.equal(operationDate('2027-03-03T00:30:00+02:00', 'UTC'), '2027-03-02');
  assert.equal(operationDate('2027-03-02T23:30:00Z', 'Europe/Berlin'), '2027-03-03');
  assert.equal(operationDate('2027-03-28T22:30:00Z', 'Europe/Berlin'), '2027-03-29', 'the DST offset comes from the named timezone');
  assert.equal(operationDate('2027-03-01T07:59:59Z', 'America/Los_Angeles'), '2027-02-28');
  assert.equal(operationDate('2027-03-01T08:00:00Z', 'America/Los_Angeles'), '2027-03-01');
  assert.equal(operationDate('2027-03-31T06:59:59Z', 'America/Los_Angeles'), '2027-03-30');
  assert.equal(operationDate('2027-03-31T07:00:00Z', 'America/Los_Angeles'), '2027-03-31');
  assert.equal(operationDate('2027-03-03T00:30:00Z'), null);
  assert.equal(operationDate('2027-03-03T00:30:00Z', 'invalid-fixture-zone'), null);
  assert.throws(() => readProjectionBetaGrants({ beta_grants: [{ ...fact, remaining_units: -1 }] }));
  assert.throws(() => readProjectionBetaGrants({ beta_grants: [{ ...fact, access_windows: [{ started_on: '2027-03-12', until: '2027-03-10' }] }] }));
  assert.throws(() => readProjectionBetaGrants({ beta_grants: [fact, fact] }));
});

test('maintenance preserves any qualifying finished operation before pruning without a product visit', async () => {
  const account = 702;
  await link(account, 'works-72');
  await db.prepare("INSERT INTO installations (installation_id, state, updated_at, account_id) VALUES (702, 'active', ?, ?)").bind(clock.value, account).run();
  await db.prepare("INSERT INTO repositories (repository_id, installation_id, full_name, state, updated_at) VALUES (702, 702, 'fixture/use', 'enabled', ?)").bind(clock.value).run();
  for (const [id, state, at] of [['before', 'complete', '2027-02-19T00:00:00Z'], ['use', 'repair', '2027-03-01T00:00:00Z'], ['newer', 'retryable', '2027-03-12T00:00:00Z']]) {
    await db.prepare('INSERT INTO deliveries (delivery_id, installation_id, repository_id, state, received_at, completed_at) VALUES (?, 702, 702, ?, ?, ?)').bind(id, state, at, at).run();
  }
  await participation.preserveUse();
  assert.equal((await store.prompt(account, CAMPAIGN)).useObservedAt, '2027-03-01T00:00:00Z');
  await new D1AppStore(db, { now: () => clock.value }).maintain();
  assert.equal((await rows('deliveries', 'delivery_id=?', 'use')).length, 0, 'the seven-day recovery ledger was pruned');
  assert.equal((await participation.view({ userId: account, commercial: await standing(account) })).invitation, 'invite', 'a later first visit still qualifies');
  const unknown = await standing(account); unknown.status.betaGrants = null; unknown.status.linkedSince = '2020-01-01';
  const view = await participation.view({ userId: account, commercial: unknown });
  assert.equal(view.proactiveEligibility, 'unknown'); assert.equal(view.invitation, null); assert.equal(view.canAnswer, true);
  const withoutCalendar = createParticipation({ store, commercial, campaign: CAMPAIGN, now: () => clock.value });
  const legacyCalendar = await standing(account); legacyCalendar.status.betaTimeZone = null;
  const nativePending = await withoutCalendar.view({ userId: account, commercial: legacyCalendar });
  assert.equal(nativePending.proactiveEligibility, 'unknown'); assert.equal(nativePending.invitation, null); assert.equal(nativePending.canAnswer, true);
});

test('qualifying operation dates use any actual segment, with exclusive end and no original-promise or paid/grace shortcut', async () => {
  const user = 703;
  await link(user, 'works-73');
  const linkId = 'link-' + user;
  const message = projection({ linkId, works: 'works-73', account: user, version: 2 });
  message.projection.benefits.beta_grants = [{ ...nativeBeta('2027-03-01', '2027-03-31'), access_windows: [{ started_on: '2027-03-01', until: '2027-03-03' }, { started_on: '2027-03-10', until: '2027-03-12' }], current_access: null, remaining_units: 0 }];
  await commercial.applyMessage(message);
  await db.prepare("INSERT INTO installations (installation_id,state,updated_at,account_id) VALUES (703,'active',?,?)").bind(clock.value,user).run();
  await db.prepare("INSERT INTO repositories (repository_id,installation_id,state,updated_at) VALUES (703,703,'enabled',?)").bind(clock.value).run();
  for (const [id,at] of [['beta-gap','2027-03-05T10:00:00Z'],['beta-end','2027-03-12T00:00:00Z'],['beta-paid','2027-03-20T10:00:00Z']]) {
    await db.prepare("INSERT INTO deliveries(delivery_id,installation_id,repository_id,state,received_at,completed_at) VALUES (?,703,703,'complete',?,?)").bind(id,at,at).run();
  }
  await participation.preserveUse(); assert.equal(await store.prompt(user,CAMPAIGN), null);
  const at='2027-03-10T23:59:59Z';
  await db.prepare("INSERT INTO deliveries(delivery_id,installation_id,repository_id,state,received_at,completed_at) VALUES ('beta-resumed',703,703,'rejected',?,?)").bind(at,at).run();
  await participation.preserveUse(); assert.equal((await store.prompt(user,CAMPAIGN)).useObservedAt,at);
  const dstWindow = [{ from: '2027-03-28', until: '2027-03-29' }];
  const end = '2027-03-28T22:30:00Z';
  await db.prepare("INSERT INTO deliveries(delivery_id,installation_id,repository_id,state,received_at,completed_at) VALUES ('beta-local-end',703,703,'complete',?,?)").bind(end,end).run();
  assert.equal(await store.qualifyingUse(user, dstWindow, 'Europe/Berlin'), null, 'the local exclusive end is already the next date after DST');
  const start = '2027-03-27T23:30:00Z';
  await db.prepare("INSERT INTO deliveries(delivery_id,installation_id,repository_id,state,received_at,completed_at) VALUES ('beta-local-start',703,703,'complete',?,?)").bind(start,start).run();
  assert.equal(await store.qualifyingUse(user, dstWindow, 'Europe/Berlin'), start, 'a UTC timestamp on the preceding date can be inside the actual commercial window');
});

test('the applied native calendar drives maintenance and invitations; legacy or invalid companions stay unknown with manual access', async () => {
  const user = 704;
  clock.value = '2027-03-12T00:00:00Z';
  await link(user, 'works-74');
  const message = projection({ linkId: 'link-704', works: 'works-74', account: user, version: 2 });
  message.projection.benefits.commercial_timezone = 'Europe/Berlin';
  message.projection.benefits.beta_grants = [nativeBeta('2027-03-01', '2027-03-31')];
  await commercial.applyMessage(message);
  assert.equal((await standing(user)).status.betaTimeZone, 'Europe/Berlin');
  await db.prepare("INSERT INTO installations (installation_id,state,updated_at,account_id) VALUES (704,'active',?,?)").bind(clock.value,user).run();
  await db.prepare("INSERT INTO repositories (repository_id,installation_id,state,updated_at) VALUES (704,704,'enabled',?)").bind(clock.value).run();
  const before = '2027-02-28T22:59:59Z', start = '2027-02-28T23:00:00Z';
  await db.prepare("INSERT INTO deliveries(delivery_id,installation_id,repository_id,state,received_at,completed_at) VALUES ('calendar-before',704,704,'complete',?,?)").bind(before,before).run();
  await participation.preserveUse(); assert.equal(await store.prompt(user,CAMPAIGN), null);
  await db.prepare("INSERT INTO deliveries(delivery_id,installation_id,repository_id,state,received_at,completed_at) VALUES ('calendar-start',704,704,'repair',?,?)").bind(start,start).run();
  await participation.preserveUse(); assert.equal((await store.prompt(user,CAMPAIGN)).useObservedAt,start);
  assert.equal((await participation.view({ userId: user, commercial: await standing(user) })).invitation, 'invite');
  for (const timeZone of [undefined, 'invalid-fixture-zone']) {
    message.order.version++;
    message.projection.order.version = message.order.version;
    if (timeZone === undefined) delete message.projection.benefits.commercial_timezone;
    else message.projection.benefits.commercial_timezone = timeZone;
    await commercial.applyMessage(readWirtMessage(message.projection));
    const view = await participation.view({ userId: user, commercial: await standing(user) });
    assert.equal(view.proactiveEligibility, 'unknown'); assert.equal(view.invitation, null); assert.equal(view.canAnswer, true);
  }
});

test('the invitation waits for observed use (failed included), keeps that observation past ledger pruning, appears once, reminds once, then never', async () => {
  const fresh = 700;
  await link(fresh, 'works-70');
  const status = await standing(fresh);
  status.status.betaGrants = [nativeBeta('2027-03-08', '2027-03-20')];
  const failed = [{ standing: { executionActive: true, selected: true, lastDelivery: { state: 'terminal', code: 'E_GITHUB_FORBIDDEN', at: '2027-03-09T00:00:00Z' } } }];
  const enabledOnly = [{ standing: { executionActive: true, selected: true, lastDelivery: null } }];
  const view = repositories => participation.view({ userId: fresh, commercial: status, repositories });
  assert.equal((await view(failed)).invitation, null, 'four days of Pro is not yet the configured delay');
  clock.value = '2027-03-19T00:00:00.000Z';
  assert.equal((await view(enabledOnly)).invitation, null, 'an enabled repository alone is setup, not use');
  const seen = await view(failed);
  assert.equal(seen.invitation, null, 'page rendering does not manufacture qualifying use');
  await store.recordUse(fresh, CAMPAIGN, '2027-03-09T00:00:00Z');
  // The delivery ledger is pruned after its recovery window; the recorded observation still qualifies.
  assert.equal((await view(enabledOnly)).invitation, 'invite', 'the observation outlives the pruned delivery');
  await participation.noteShown(fresh, 'invite');
  assert.equal((await view([])).invitation, 'invite', 'shown until dismissed');
  await participation.dismiss(fresh);
  assert.equal((await view([])).invitation, null);
  clock.value = '2027-03-26T00:00:00.000Z';
  assert.equal((await view([])).invitation, 'remind');
  await participation.noteShown(fresh, 'remind');
  await participation.dismiss(fresh);
  clock.value = '2027-03-31T00:00:00.000Z';
  assert.equal((await view([])).invitation, null, 'one reminder only');
  const never = 701;
  await link(never, 'works-71');
  assert.equal((await participation.view({ userId: never, commercial: await standing(never), repositories: enabledOnly })).canAnswer, true, 'without any invitation the survey stays answerable for an eligible participant');
  clock.value = '2027-04-02T00:00:00.000Z';
  assert.equal((await view([])).window, 'closed');
});

test('a preview is created only by the Origin-checked POST; any GET, including a cross-site one, renders without creating a quote', async () => {
  const owner = 610;
  // This specimen uses a fake authentication adapter; its browser-owned persistence still needs a real local lease.
  await db.prepare('INSERT INTO browser_sessions(session_hash,user_id,return_context,expires_at) VALUES (?,?,?,?)')
    .bind(createHash('sha256').update(session(owner)).digest('hex'), owner, 'app', '2027-05-01T00:00:00.000Z').run();
  const quotes = () => double.state.requests.filter(request => request.path.endsWith('/reward-quotes')).length;
  const runtime = { participation, commercial, now: () => clock.value, config: { allowedOrigins: [APP] }, cache: { clear() {} } };
  const viewer = { userId: owner, repositories: [] };
  const sessionValue = { session: session(owner) };
  const model = async () => ({ commercial: await standing(owner) });
  const before = quotes();
  // Rendering Plan & funding with ?preview=annual (what a cross-site top-level link could open) only reads.
  const viewed = await loadParticipation({ runtime, viewer, session: sessionValue, model: await model(), preview: 'annual' });
  assert.equal(viewed.card.key, 'available');
  assert.equal(viewed.quote, null, 'no preview exists until the person asks for one');
  assert.equal(quotes(), before, 'a GET creates no Wirt quote');
  // The action route refuses GET, a foreign Origin and a missing Origin without calling Wirt.
  const form = cadence => new URLSearchParams({ action: 'reward-preview', cadence });
  const post = (cadence, headers) => handleManageAction(new Request(`${APP}/manage/do`, { method: 'POST', body: form(cadence), headers: { 'content-type': 'application/x-www-form-urlencoded', ...headers } }), { runtime, session: sessionValue, viewer });
  const get = await handleManageAction(new Request(`${APP}/manage/do?action=reward-preview&cadence=annual`), { runtime, session: sessionValue, viewer });
  assert.equal(get.status, 303);
  assert.equal((await post('annual', { origin: 'https://evil.example' })).status, 403);
  assert.equal((await post('annual', {})).status, 403, 'no Origin is not same-origin');
  assert.equal(quotes(), before, 'refused requests create no quote');
  // The person's same-origin POST creates exactly one quote and returns to the page that shows it.
  const posted = await post('annual', { origin: APP });
  assert.equal(posted.status, 303);
  assert.equal(posted.headers.get('location'), '/manage/plan?preview=annual&m=preview-ready');
  assert.equal(quotes(), before + 1);
  const shown = await loadParticipation({ runtime, viewer, session: sessionValue, model: await model(), preview: 'annual' });
  assert.deepEqual(shown.quote.receipt.lines.map(line => `${line.label}=${line.amount}`), ['DiffDevil Pro annual=€90.00', `${REASON}=−€18.00`]);
  assert.equal(shown.quote.receipt.total.amount, '€72.00');
  assert.equal(quotes(), before + 1, 'showing the requested preview again creates no further quote');
  assert.match((await post('weekly', { origin: APP })).headers.get('location'), /m=invalid/u);
  assert.equal(quotes(), before + 1);
  // A preview lapses with Wirt's own quote; after that the page shows none and still creates none.
  const lapsedAt = clock.value;
  clock.value = '2027-04-17T00:00:00.000Z';
  assert.equal((await loadParticipation({ runtime, viewer, session: sessionValue, model: await model(), preview: 'annual' })).quote, null);
  assert.equal(quotes(), before + 1);
  clock.value = lapsedAt;
  // Closure forgets the stored preview with every other participation fact.
  await store.forgetAccount(owner);
  assert.equal(await store.preview(owner, 'annual'), null);
});

test('closing the account forgets every participation fact; the export carries them before that', async () => {
  const exported = await store.exportAccount(OTHER);
  assert.equal(exported.length, 1);
  assert.equal(exported[0].state, 'completed');
  await store.forgetAccount(OTHER);
  for (const table of ['participation_responses', 'participation_deliveries', 'participation_prompts']) assert.equal((await rows(table, 'user_id=?', OTHER)).length, 0, table);
  assert.equal((await rows('participation_responses', 'user_id=?', USER)).length, 1, 'another account keeps its own');
});
