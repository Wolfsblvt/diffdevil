// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * The participation campaign's browser journey for apps/app/qa/run.mjs, against the local Works stand-in: the
 * invitation and its dismissal, the survey's keyboard-reachable form with an incomplete attempt and a saved draft,
 * completion while Works doesn't answer and its later delivery, the reward in Plan & funding with Works' own preview
 * receipts, a reservation, confirmed charges down to exhaustion, deleting the answers without losing the reward, the
 * export, and narrower widths without overflow. Every figure is the stand-in's; none is a real quote or payment.
 */

/** A beta participant: thirty days of Pro by grant, no card, nothing renewing automatically. */
export const COMMERCIAL_BETA = Object.freeze({ account: 123, linked: true, since: '2026-09-20', commercial: { standing: 'funded', tier: 'pro', cadence: 'monthly', period: { started_on: '2026-09-20', ends_on: '2026-10-20' }, renewal_preference: 'manual', cancellation_intent: 'none', grace: null, ended: null, next_renewal: null },
  // Explicit consumer-window fixture. Accepted Wirt does not yet emit the beta grant's effective start.
  grants: [{ kind: 'beta', started_on: '2026-09-20', until: '2026-10-20' }], protection: { kind: 'beta' }, capacity: [{ slot: 'slot-included', funding: 'included', binding: null }],
  participation: { campaign: { key: 'qa-beta-survey', version: 1, name: 'DiffDevil beta survey', reason: 'Participation reward · DiffDevil beta survey', claim_closes_at: '2030-01-01T00:00:00Z', valid_until: '2030-06-01T00:00:00Z',
    rewards: [{ key: 'monthly', kind: 'discount', tier: 'Pro', cadence: 'monthly', unit: 'percent', value: 50, uses: 3, charge_classes: ['first-purchase', 'renewal'], combinable: false }, { key: 'annual', kind: 'discount', tier: 'Pro', cadence: 'annual', unit: 'percent', value: 20, uses: 1, charge_classes: ['first-purchase', 'renewal'], combinable: false }] } } });
/** QA's campaign configuration: an open window around the run, no invitation delay, a one-day reminder. Not a launch default. */
export const QA_CAMPAIGN = Object.freeze({ key: 'qa-beta-survey', version: 1, survey: 'beta-v1', name: 'Beta survey', opensAt: '2026-01-01T00:00:00Z', closesAt: '2029-12-01T00:00:00Z', inviteAfterDays: 0, reminderAfterDays: 1 });

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
  check('Plan & funding names beta access with no card and nothing renewing automatically, and offers the survey', /Funded by:Beta access, through 19 Oct 2026/u.test(plan.funded) && /Nothing renews automatically/u.test(plan.funded) && plan.reward === 'invite', JSON.stringify(plan));

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
