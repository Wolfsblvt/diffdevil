// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * The participation campaign's browser journey for apps/app/qa/run.mjs, against the local Works stand-in: the
 * invitation and its dismissal, the survey's keyboard-reachable form with an incomplete attempt and a saved draft,
 * completion while Works doesn't answer and its later delivery, the reward in Plan & funding with Works' own preview
 * receipts, a reservation, confirmed charges down to exhaustion, deleting the answers without losing the reward, the
 * export, and narrower widths without overflow. Every figure is the stand-in's; none is a real quote or payment.
 */
import { readSigningKeys, signedHeaders } from '../../github-app/commercial-wirt.mjs';

const addUtcDays = (day, days) => {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};
const utcDaysBetween = (start, end) => (Date.parse(`${end}T00:00:00.000Z`) - Date.parse(`${start}T00:00:00.000Z`)) / 86_400_000;
const today = new Date().toISOString().slice(0, 10);
const betaStartsOn = addUtcDays(today, -15);
const betaEndsOn = addUtcDays(today, 15);
const campaignOpensAt = `${addUtcDays(today, -15)}T00:00:00Z`;
const campaignClosesAt = `${addUtcDays(today, 15)}T00:00:00Z`;

/** A beta participant: a thirty-day Pro grant spanning the real QA run, no card or automatic renewal. */
export const COMMERCIAL_BETA = Object.freeze({ account: 123, linked: true, since: betaStartsOn, commercial: { standing: 'funded', tier: 'pro', cadence: 'monthly', period: { started_on: betaStartsOn, ends_on: betaEndsOn }, renewal_preference: 'manual', cancellation_intent: 'none', grace: null, ended: null, next_renewal: null },
  // Native beta-grant contract of producer candidate 271c33f; actual delivery/application remains separate.
  betaTimeZone: 'UTC', // Explicit local stand-in for c33d5d9's native commercial_timezone.
  betaGrants: [{ id: 265, kind: 'beta', product: 'diffdevil', tier: 'pro', promised_units: 30,
    original_window: { started_on: betaStartsOn, until: betaEndsOn }, access_windows: [{ started_on: betaStartsOn, until: betaEndsOn }],
    current_access: { started_on: betaStartsOn, until: betaEndsOn }, remaining_units: utcDaysBetween(today, betaEndsOn) }],
  grants: [{ kind: 'beta', until: betaEndsOn }], protection: { kind: 'beta' }, capacity: [{ slot: 'slot-included', funding: 'included', binding: null }],
  participation: { campaign: { key: 'qa-beta-survey', version: 1, name: 'DiffDevil beta survey', reason: 'Participation reward · DiffDevil beta survey', claim_closes_at: campaignClosesAt, valid_until: `${addUtcDays(today, 44)}T00:00:00Z`,
    rewards: [{ key: 'monthly', kind: 'discount', tier: 'Pro', cadence: 'monthly', unit: 'percent', value: 50, uses: 3, charge_classes: ['first-purchase', 'renewal'], combinable: false }, { key: 'annual', kind: 'discount', tier: 'Pro', cadence: 'annual', unit: 'percent', value: 20, uses: 1, charge_classes: ['first-purchase', 'renewal'], combinable: false }] } } });
/** QA's campaign window surrounds the real run date; it does not change the App clock or launch defaults. */
export const QA_CAMPAIGN = Object.freeze({ key: 'qa-beta-survey', version: 1, survey: 'beta-v1', name: 'Beta survey', opensAt: campaignOpensAt, closesAt: campaignClosesAt, inviteAfterDays: 0, reminderAfterDays: 1 });

/** A separate synthetic component reward, outside the beta survey; it grants no subscription or capacity. */
export const COMMERCIAL_REWARD_ONLY = Object.freeze({ account: 123, linked: true, since: '2026-10-02', commercial: null, capacity: [], grants: [], protection: null,
  fundedComponents: [{ component_id: 'reward-component:1', funding: 'participation-reward', component_kind: 'paid-subject', capacity_type: 'organisation',
    name: 'Additional organisation slot', reason: 'Community contribution', state: 'queued', starts_on: null, ends_on: null, application_deadline: '2030-06-01T00:00:00Z' }] });

// Receiver-only local inputs: no Wirt origin, owner token or outbound commercial call is configured.
export const NULLABLE_SIGNING_KEY = 'fixture-nullable-projection-key-at-least-32-bytes';
export const NULLABLE_LINK = 'qa-nullable-contract';

/** Prove rejection and retained Manage truth through the built signed receiver and native D1, not the stand-in. */
export async function nullableReceiverJourney({ page, go, check, shot, ORIGIN }) {
  const component = COMMERCIAL_REWARD_ONLY.fundedComponents[0];
  const projection = (version, components) => ({ schema: 'wirt.benefit-projection/v1', client: 'diffdevil',
    stream: { works_account: '77', link: { id: NULLABLE_LINK, product_account: { github_user_id: 123 } } },
    account_lineage: [], order: { epoch: 1, version }, generated_at: new Date().toISOString(), source_operation: null,
    commercial: null, benefits: { organisation_capacity: [], grants: [], protection: null, funded_components: components }, pending: [], bindings_seen: [] });
  const push = async value => {
    const path = '/integrations/wirt/projection', body = JSON.stringify(value);
    const headers = await signedHeaders(readSigningKeys({ current: NULLABLE_SIGNING_KEY }), { method: 'POST', path, body, account: '123' });
    return fetch(`${ORIGIN}${path}`, { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body });
  };
  for (const [name, components] of [['empty', []], ['active', [{ ...component, state: 'active' }]]]) {
    const response = await push(projection(1, components));
    check(`native receiver rejects ${name} null input`, response.status === 422 && (await response.json()).code === 'E_COMMERCIAL_SHAPE');
    await go('/manage/plan');
    check(`${name} null input renders no confirmed benefit or active reward`, await page.locator('[data-standing="linking"]').count() === 1
      && await page.locator('[data-standing="reward-only"]').count() === 0 && !/Active reward/u.test(await page.locator('.m-stack').innerText()));
    await shot(`reward-only-rejected-${name}`);
  }
  check('native receiver applies a claimed queued component', (await push(projection(1, [component]))).status === 200);
  await go('/manage/plan');
  check('native queued component renders as confirmed Free', await page.locator('[data-standing="reward-only"] .plan b').textContent() === 'Free'
    && /Queued/u.test(await page.locator('[data-standing="reward-only"]').innerText()));
  const mixed = await push(projection(2, [component, { ...component, state: 'active' }]));
  check('native receiver rejects an active component beside a queued one', mixed.status === 422);
  await go('/manage/plan');
  check('invalid later null input preserves the applied queued display', /Queued/u.test(await page.locator('[data-standing="reward-only"]').innerText())
    && !/Active reward/u.test(await page.locator('.m-stack').innerText()));
  check('native receiver applies claimed expired facts', (await push(projection(2, [{ ...component, state: 'expired' }]))).status === 200);
  await go('/manage/plan');
  check('native expired component remains visible as Free', await page.locator('[data-standing="reward-only"] .plan b').textContent() === 'Free'
    && /Expired/u.test(await page.locator('[data-standing="reward-only"]').innerText()));
  const active = { ...component, state: 'active', starts_on: betaStartsOn, ends_on: betaEndsOn, application_deadline: null };
  const full = projection(3, [active]);
  full.commercial = { standing: 'funded', tier: 'pro', cadence: 'monthly', period: { started_on: betaStartsOn, ends_on: betaEndsOn },
    renewal_preference: 'manual', cancellation_intent: 'none', grace: null, ended: null, next_renewal: null };
  full.benefits.organisation_capacity = [{ slot: component.component_id, funding: 'grant', pending_end_on: active.ends_on }];
  check('native receiver admits active component facts with a compatible full base', (await push(full)).status === 200);
  await go('/manage/plan');
  check('the same stable component can render active beside the funded Pro base', await page.locator('[data-standing="funded"] .plan b').textContent() === 'Pro'
    && /Active reward/u.test(await page.locator('[data-standing="funded"]').innerText()));
  check('a funded Pro base retains its included personal capacity card', /Personal · included/iu.test(await page.locator('[data-funds]').innerText())
    && !/Pooled Free allowance/u.test(await page.locator('[data-funds]').innerText()));
  check('a reward term end does not claim removal or funding an unbound organisation', !/You removed it at Works/u.test(await page.locator('.m-stack').innerText())
    && /currently funds no organisation/u.test(await page.locator('.m-stack').innerText()));
  await shot('reward-component-full-base-active');
}

export async function rewardOnlyJourney({ page, go, check, shot }, state, { unlimited = false } = {}) {
  const capture = `${state}${unlimited ? '-unlimited' : ''}`;
  await go('/manage');
  const band = page.locator('[data-plan-band]');
  check(`${state} Manage overview shows Free with readable linked-benefits standing`, await band.locator('.m-planname b').textContent() === 'Free'
    && await band.locator('.m-st.info').filter({ hasText: 'Works benefits linked' }).count() === 1
    && !/reward-only/u.test(await band.innerText()));
  check(`${state} linked-benefits overview does not present a warning`, await band.locator('.m-planname .m-st.warn, .m-planname .m-st.err').count() === 0);
  const personal = band.locator('.m-org').first();
  check(`${capture} personal capacity follows the actual Free allowance`, (await personal.innerText()).includes(unlimited ? 'No repository limit on this deployment' : 'Pooled Free allowance')
    && !/Personal · included/iu.test(await personal.innerText()) && (unlimited || !/No repository limit/u.test(await personal.innerText())));
  await shot(`reward-only-${capture}-overview`);
  await Promise.all([page.waitForURL('**/manage/plan'), band.getByRole('link', { name: 'Plan & funding', exact: true }).click()]);
  await page.waitForLoadState('networkidle');
  const card = page.locator('[data-standing="reward-only"]');
  check(`${state} reward-only state shows Free and confirmed benefits`, await card.count() === 1 && await card.locator('.plan b').textContent() === 'Free'
    && /No funded subscription/u.test(await card.innerText()));
  check(`${state} component facts stay visible without pretending to be a funded slot`, (await card.innerText()).includes('Community contribution')
    && (await card.innerText()).includes(state === 'queued' ? 'Queued' : 'Expired') && await page.locator('[data-funds], [data-compare]').count() === 0);
  check(`${state} reward-only plan keeps Works management and unlink available`, await card.getByRole('link', { name: 'Gifts and benefits' }).count() === 1
    && await page.getByRole('button', { name: 'Unlink…' }).count() === 1);
  check(`${state} component does not invent a renewal or protection`, !/Funded through|Next renewal|Price protected|Waiting for Works/u.test(await card.innerText()));
  if (state === 'queued') check(`${capture} queued benefit explains automatic compatible-coverage start without an Apply action`, /Starts automatically with compatible Pro or Business coverage/u.test(await card.innerText())
    && (unlimited ? !/before/u.test(await card.innerText()) : /before 1 Jun 2030/u.test(await card.innerText()))
    && !/Apply before/u.test(await card.innerText()) && await card.getByRole('button', { name: /Apply/u }).count() === 0);
  check(`${capture} Plan displays the actual private and public-history allowances`, unlimited
    ? await card.locator('.m-allowg .num').filter({ hasText: 'no limit' }).count() === 2
    : await card.locator('.m-allowg [aria-label*="private slots"], .m-allowg [aria-label*="public history places"]').count() === 2);
  await shot(`reward-only-${capture}`);
  if (state === 'queued') {
    await page.setViewportSize({ width: 390, height: 844 });
    check('reward-only standing fits a narrow viewport', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await shot(`reward-only-${capture}-mobile`);
    await page.setViewportSize({ width: 1440, height: 900 });
  }
}

export async function participationJourney(ctx) {
  const { check, go, page, shot, ORIGIN } = ctx;
  const text = () => page.evaluate(() => document.body.innerText);
  const message = () => page.evaluate(() => ({ text: document.querySelector('.m-msg')?.textContent?.trim() ?? '', role: document.querySelector('.m-msg')?.getAttribute('role') ?? '' }));
  const reward = () => page.evaluate(() => ({ key: document.querySelector('[data-reward]')?.getAttribute('data-reward') ?? null, title: document.querySelector('#p-reward-title')?.textContent?.trim() ?? '',
    alternatives: [...document.querySelectorAll('[data-alternative]')].map(node => `${node.getAttribute('data-alternative')}:${node.getAttribute('data-standing')}`),
    receipts: [...document.querySelectorAll('[data-receipt]')].map(node => ({ label: node.getAttribute('aria-label'), rows: [...node.querySelectorAll('dt')].map((dt, index) => `${dt.textContent.trim()}=${node.querySelectorAll('dd')[index].textContent.trim()}`), notes: [...node.querySelectorAll('.p-rnote')].map(note => note.textContent.trim()) })),
    applied: document.querySelectorAll('.p-applied li').length, nan: /NaN|undefined|\[object|qa-beta-survey|fixture-reward|fixture-operation/u.test(document.body.innerText) }));
  const simulate = async kind => { const answer = await page.request.post(`${ORIGIN}/manage/do`, { form: { action: 'fixture-simulate', kind, back: '/manage/plan' }, headers: { origin: ORIGIN }, maxRedirects: 0 }); return answer.status(); };
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

  // ── the invitation: once used enough, at the top of signed-in pages; Not now closes it ──
  await go('/');
  const invite = await page.evaluate(() => ({ stage: document.querySelector('[data-invitation]')?.getAttribute('data-invitation') ?? null, text: document.querySelector('[data-invitation]')?.textContent ?? '', link: document.querySelector('[data-invitation] a')?.getAttribute('href') ?? '' }));
  check('after a failed managed operation during beta access the participant sees one survey invitation above the page, pointing at the survey', invite.stage === 'invite' && /Honest answers count, critical ones included/u.test(invite.text) && invite.link === '/manage/plan/survey', JSON.stringify(invite));
  await shot('participation-invitation');
  await Promise.all([page.waitForURL(url => new URL(url).searchParams.get('m') === 'survey-dismissed'), page.click('[data-invitation] form button')]);
  await page.waitForLoadState('networkidle');
  check('Not now closes the invitation, returns to the same page and says where the survey stays', new URL(page.url()).pathname === '/' && (await page.locator('[data-invitation]').count()) === 0 && /Plan & funding/u.test((await message()).text), JSON.stringify(await message()));
  await go('/history');
  check('a dismissed invitation stays closed on other pages until its one reminder', (await page.locator('[data-invitation]').count()) === 0);

  // ── Plan & funding names the beta month and offers the survey ──
  await go('/manage/plan');
  const plan = await page.evaluate(() => ({ funded: [...document.querySelectorAll('.m-dl dt')].map(dt => `${dt.textContent}:${dt.nextElementSibling?.textContent ?? ''}`).join(' | '), reward: document.querySelector('[data-reward]')?.getAttribute('data-reward') ?? null }));
  const betaThrough = new Date(`${COMMERCIAL_BETA.betaGrants[0].access_windows[0].until}T00:00:00.000Z`);
  betaThrough.setUTCDate(betaThrough.getUTCDate() - 1);
  const betaThroughLabel = betaThrough.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  check('Plan & funding names the current beta fixture window with no card or automatic renewal, and offers the open survey', plan.funded.includes(`Funded by:Beta access, through ${betaThroughLabel}`) && /Nothing renews automatically/u.test(plan.funded) && plan.reward === 'invite', JSON.stringify(plan));

  // ── the survey: fieldsets, labelled controls, keyboard, an incomplete attempt, a saved draft ──
  await go('/manage/plan/survey');
  const form = await page.evaluate(() => ({ state: document.querySelector('[data-survey]')?.getAttribute('data-survey'), fieldsets: [...document.querySelectorAll('.p-q')].map(node => Boolean(node.querySelector('legend')?.textContent?.trim())),
    unlabeled: [...document.querySelectorAll('.p-survey input[type="checkbox"], .p-survey textarea')].filter(control => !control.closest('label') && !control.getAttribute('aria-label')).length, buttons: [...document.querySelectorAll('.p-submit button')].map(button => button.textContent.trim()), privacy: document.querySelector('[data-survey-form] footer')?.textContent ?? '' }));
  check('the survey is five fieldsets with legends and every control has an accessible name', form.state === 'open' && form.fieldsets.length === 5 && form.fieldsets.every(Boolean) && form.unlabeled === 0, JSON.stringify(form));
  check('the survey says Works learns only that it was completed, and offers complete and save-for-later', /never receives what you wrote/u.test(form.privacy) && form.buttons.join('|') === 'Complete the survey|Save and finish later', JSON.stringify(form.buttons));
  await page.getByRole('checkbox', { name: 'Results that looked wrong' }).focus();
  await page.keyboard.press('Space');
  await page.getByRole('button', { name: 'Complete the survey' }).focus();
  // Enter on the focused button submits it; the navigation is awaited, not raced.
  await Promise.all([page.waitForURL(url => new URL(url).searchParams.get('m') === 'survey-incomplete'), page.keyboard.press('Enter')]);
  await page.waitForLoadState('networkidle');
  const incomplete = await message();
  check('completing without the first answer is refused as an alert and keeps the other answers', incomplete.role === 'alert' && /What did you actually use/u.test(incomplete.text) && await page.getByRole('checkbox', { name: 'Results that looked wrong' }).isChecked(), JSON.stringify(incomplete));
  await page.getByRole('checkbox', { name: 'I hardly used it' }).check();
  await page.fill('textarea[name="keep"]', 'Honestly, nothing yet. The labels were wrong twice.');
  await page.getByRole('button', { name: 'Save and finish later' }).click();
  await page.waitForLoadState('networkidle');
  check('Save and finish later keeps a draft with what was written', /Saved/u.test((await message()).text) && (await page.inputValue('textarea[name="keep"]')) === 'Honestly, nothing yet. The labels were wrong twice.' && (await page.evaluate(() => document.querySelector('[data-survey]')?.getAttribute('data-survey'))) === 'draft');
  await shot('participation-survey-draft');

  // ── completion while Works doesn't answer: saved, pending; delivered after the backoff ──
  check('the stand-in stops answering', (await simulate('wirt:unavailable')) === 303);
  await page.getByRole('button', { name: 'Complete the survey' }).click();
  await page.waitForLoadState('networkidle');
  const completed = await page.evaluate(() => ({ state: document.querySelector('[data-survey]')?.getAttribute('data-survey'), reward: document.querySelector('[data-reward]')?.getAttribute('data-reward'), answers: document.querySelector('[data-survey-answers]')?.textContent ?? '' }));
  check('a negative completion is accepted as complete; while Works doesn\'t answer the reward reads as delivery pending', completed.state === 'completed' && completed.reward === 'pending' && /I hardly used it/u.test(completed.answers) && /The labels were wrong twice/u.test(completed.answers), JSON.stringify({ ...completed, answers: completed.answers.slice(0, 120) }));
  await shot('participation-pending');
  await simulate('wirt:recorded');
  await go('/manage/plan');
  check('inside the backoff Plan & funding still says pending and sends nothing new', (await reward()).key === 'pending');
  await page.waitForTimeout(61_000);
  await go('/manage/plan');
  const ready = await reward();
  check('after the backoff the same completion is delivered and Works\' reward is shown with both alternatives open', ready.key === 'available' && ready.title === 'Your reward is ready' && ready.alternatives.join(',') === 'monthly:available,annual:available' && !ready.nan, JSON.stringify(ready));
  await shot('participation-available');

  // ── previews are Works quotes created only by the person's POST; a GET (even a cross-site link) shows none ──
  await go('/manage/plan?preview=monthly');
  check('opening Plan & funding with ?preview= by GET shows no receipt: nothing was quoted', (await reward()).receipts.length === 0 && (await page.locator('[data-preview-form] button').count()) === 2);
  const foreign = await page.request.post(`${ORIGIN}/manage/do`, { form: { action: 'reward-preview', cadence: 'monthly' }, headers: { origin: 'https://evil.example' }, maxRedirects: 0 });
  await go('/manage/plan?preview=monthly');
  check('a foreign-Origin preview POST is refused and creates no preview', foreign.status() === 403 && (await reward()).receipts.length === 0, String(foreign.status()));
  await Promise.all([page.waitForURL(url => new URL(url).searchParams.get('preview') === 'monthly' && new URL(url).searchParams.get('m') === 'preview-ready'), page.getByRole('button', { name: 'Monthly' }).click()]);
  await page.waitForLoadState('networkidle');
  const monthly = (await reward()).receipts[0];
  check('the monthly preview is Works\' receipt: €9.00, the reward under its public reason, €4.50 due, then the protected price', monthly?.rows.join('|') === 'DiffDevil Pro monthly=€9.00|Participation reward · DiffDevil beta survey=−€4.50|Due now=€4.50'
    && monthly.notes.join(' ') === '50% off this and your next 2 monthly charges. After the reward: €9/month at your protected beta price.', JSON.stringify(monthly));
  await Promise.all([page.waitForURL(url => new URL(url).searchParams.get('preview') === 'annual'), page.getByRole('button', { name: 'Annual' }).click()]);
  await page.waitForLoadState('networkidle');
  const annual = (await reward()).receipts[0];
  check('the annual preview reads €90.00, −€18.00, €72.00 due, then €90 at the protected price', annual?.rows.join('|') === 'DiffDevil Pro annual=€90.00|Participation reward · DiffDevil beta survey=−€18.00|Due now=€72.00'
    && annual.notes.join(' ') === '20% off this annual term. Next annual renewal: €90 at your protected beta price.', JSON.stringify(annual));
  check('the preview offers the way to continue at Works and says a preview reserves nothing', /reserves nothing/u.test(await text()) && (await page.locator('[data-preview] a.m-btn').count()) === 1);
  await shot('participation-preview-annual');

  // ── accepting reserves one branch; confirmation consumes a use; renewals exhaust it ──
  await simulate('reward-reserve:monthly');
  await go('/manage/plan');
  const reserved = await reward();
  check('an accepted monthly quote reads as reserved, with the annual alternative set aside', reserved.key === 'reserved' && reserved.alternatives.join(',') === 'monthly:reserved,annual:retired' && /first payment is being confirmed/u.test(await text()), JSON.stringify(reserved));
  await simulate('reward-confirm');
  await go('/manage/plan');
  const partial = await reward();
  const nextRow = await page.evaluate(() => [...document.querySelectorAll('.m-dl dt')].find(dt => dt.textContent === 'Next renewal')?.nextElementSibling?.textContent ?? '');
  check('the confirmed payment applies one use: two remain, one application is listed and the next charge is Works\' discounted receipt', partial.key === 'partially-consumed' && partial.title === '2 discounted charges remain' && partial.applied === 1
    && partial.receipts[0]?.rows.join('|').startsWith('DiffDevil Pro monthly=€9.00|Participation reward · DiffDevil beta survey=−€4.50|Due on') && /50% off this and your next monthly charge\./u.test(partial.receipts[0].notes.join(' ')), JSON.stringify(partial));
  check('the standing card names the discounted next renewal from the same Works answer', /€4\.50 on/u.test(nextRow) && /with your participation reward/u.test(nextRow), nextRow);
  await shot('participation-partially-consumed');
  await simulate('reward-renew'); await simulate('reward-renew');
  await go('/manage/plan');
  const used = await reward();
  check('after the third discounted charge the reward reads as used and Pro continues at the protected price', used.key === 'exhausted' && used.applied === 3 && /Pro continues at €9\/month at your protected beta price/u.test(await text()) && used.receipts.length === 0, JSON.stringify(used));
  await shot('participation-exhausted');

  // ── privacy: deleting the answers keeps the reward; the export carries the response ──
  const exported = await page.request.get(`${ORIGIN}/manage/export`);
  const body = JSON.parse(await exported.text());
  check('the account export carries the survey answers and the completion facts sent', body.participation?.length === 1 && body.participation[0].state === 'completed' && JSON.stringify(body.participation[0].answers).includes('The labels were wrong twice') && body.participation[0].delivery.state === 'accepted', JSON.stringify(body.participation?.[0]?.delivery ?? null));
  await go('/manage/plan/survey');
  await page.getByRole('button', { name: /Delete my answers/u }).click();
  await page.waitForLoadState('networkidle');
  const deleted = await page.evaluate(() => ({ note: document.querySelector('[data-answers-deleted]')?.textContent ?? '', reward: document.querySelector('[data-reward]')?.getAttribute('data-reward') }));
  check('deleting the answers removes them and leaves the completion and the used reward as they were', /You deleted your answers/u.test(deleted.note) && deleted.reward === 'exhausted' && /The completion and any reward it earned stay/u.test((await message()).text), JSON.stringify(deleted));
  const after = JSON.parse(await (await page.request.get(`${ORIGIN}/manage/export`)).text());
  check('after deletion the export holds the completion without any answer', after.participation?.[0]?.answers === null && Boolean(after.participation[0].answersDeletedAt));

  // ── narrower widths: the survey and the reward card fit ──
  for (const width of [1024, 760]) {
    await page.setViewportSize({ width, height: 900 });
    await go('/manage/plan');
    const planOverflow = await overflow();
    await go('/manage/plan/survey');
    check(`at ${width} Plan & funding and the survey have no horizontal overflow`, planOverflow <= 0 && (await overflow()) <= 0, JSON.stringify({ planOverflow, survey: await overflow() }));
  }
  await shot('participation-survey-760');
  await page.setViewportSize({ width: 1440, height: 900 });
}
