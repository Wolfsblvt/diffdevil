// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * The Manage console's browser journeys for apps/app/qa/run.mjs, against the local Works stand-in: the capacity-first
 * Overview and its decisions, selecting / enabling (with the one-writer declaration) / stopping and swapping in
 * Repositories, the repository settings page with the pull-request message preview, Plan & funding with its slots,
 * the departure to Works and the three return states, the Account page's four relationships, disconnect and
 * reconnect, the sign-out disclosure, and on Free the pooled allowances, the connected organisation and the first link.
 * `ctx` carries the runner's `check`, `go`, `page`, `shot`, `ORIGIN`, `OUT` and `settled`. The accessible journeys (keyboard, focus,
 * labelled controls, live regions, narrow widths, the dark lock under a light preference, reduced motion) are `manageAccess`.
 */

import { join } from 'node:path';
import { CODE } from './fixture.mjs';

/** The stand-in specs the passes start their Workers with. */
export const COMMERCIAL_PRO = Object.freeze({ account: 123, linked: true, since: '2026-10-02', commercial: { standing: 'funded', tier: 'pro', cadence: 'annual', period: { started_on: '2026-03-14', ends_on: '2027-03-14' }, renewal_preference: 'automatic', cancellation_intent: 'none', grace: null, ended: null, next_renewal: { on: '2027-03-14', total_cents: 18000, currency: 'EUR', tax_inclusive: true } }, protection: { kind: 'beta' },
  capacity: [{ slot: 'slot-included', funding: 'included', binding: { organisationId: 7001, authority: 'present', display: 'parser-guild' } }, { slot: 'slot-2', funding: 'paid', binding: null }], others: { 7002: 'business' } });
export const COMMERCIAL_FREE = Object.freeze({ account: 123, linked: false, others: { 7002: 'business' } });
export const COMMERCIAL_BUSINESS = Object.freeze({ ...COMMERCIAL_PRO, commercial: { ...COMMERCIAL_PRO.commercial, tier: 'business', next_renewal: { on: '2027-03-14', total_cents: 49000, currency: 'EUR', tax_inclusive: true } } });

const text = page => page.evaluate(() => document.body.innerText);
const facts = page => page.evaluate(() => ({ h1: document.querySelectorAll('h1').length, h1Text: document.querySelector('h1')?.textContent?.trim() ?? '', tabs: document.querySelectorAll('.m-tabs a').length, current: document.querySelector('.m-tabs a[aria-current="page"]')?.textContent?.trim() ?? '',
  navManage: document.querySelector('[data-nav-manage]')?.getAttribute('aria-current') ?? '', badge: document.querySelector('[data-nav-manage] .m-dotn')?.textContent ?? '', tabBadge: document.querySelector('.m-tabs .m-dotn')?.textContent ?? '', attention: document.querySelectorAll('[data-attention] .m-att a').length,
  overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, nan: /NaN|undefined|\[object/u.test(document.body.innerText), message: document.querySelector('.m-msg')?.textContent?.trim() ?? '', title: document.title,
  buttons: [...document.querySelectorAll('.m-btn')].every(element => ['BUTTON', 'A', 'SPAN'].includes(element.tagName) && (element.tagName !== 'SPAN' || element.getAttribute('aria-disabled') === 'true')) }));

/** Every console page: one h1, the sub-tabs with the right one current, Manage current in the navigation, no overflow, no NaN, private headers. */
async function qualifyPage({ check, go, page, shot }, label, path, { tab, tabs }) {
  const response = await go(path);
  const seen = await facts(page);
  check(`${label} ${tab} renders 200 at ${path} with one h1 and the ${tab} tab current`, response.status() === 200 && seen.h1 === 1 && seen.current.toLowerCase().startsWith(tab.toLowerCase().slice(0, 4)), `${response.status()} ${JSON.stringify(seen)}`);
  check(`${label} ${tab} shows ${tabs} sub-tabs and Manage current in the navigation`, seen.tabs === tabs && seen.navManage === 'page', JSON.stringify({ tabs: seen.tabs, nav: seen.navManage }));
  check(`${label} ${tab} has no horizontal overflow and prints no NaN or undefined`, seen.overflow <= 0 && !seen.nan, JSON.stringify({ overflow: seen.overflow, nan: seen.nan }));
  check(`${label} ${tab} uses real buttons and links for every action`, seen.buttons);
  check(`${label} ${tab} sends private no-store headers`, (response.headers()['cache-control'] ?? '').includes('no-store') && (response.headers()['content-security-policy'] ?? '').includes("default-src 'none'"));
  await shot(`${label}-manage-${tab.toLowerCase().replace(/[^a-z]+/gu, '-')}`);
  return seen;
}

export async function proManage(ctx) {
  const { check, go, page, shot, ORIGIN } = ctx;
  const overview = await qualifyPage(ctx, 'pro', '/manage', { tab: 'Overview', tabs: 5 });
  check('pro Overview leads with the plan band, the organisation slots and the private slot cells', await page.evaluate(() => /Your plan/u.test(document.querySelector('[data-plan-band]')?.textContent ?? '') && /Pro/u.test(document.querySelector('[data-plan-band] .m-planname b')?.textContent ?? '') && document.querySelectorAll('[data-plan-band] .m-org').length >= 3 && document.querySelectorAll('[data-slots] .m-nsrow').length >= 2 && document.querySelectorAll('[data-slots] .m-cap.md .m-cell').length === 3), await page.evaluate(() => document.querySelector('[data-plan-band]')?.textContent?.slice(0, 200)));
  check('pro Overview lists the open paid slot under Needs you and the badge agrees with the list everywhere', overview.attention > 0 && /Slot 2 is open/u.test(await text(page)) && overview.badge === String(overview.attention) && overview.tabBadge === String(overview.attention), JSON.stringify({ attention: overview.attention, badge: overview.badge, tabBadge: overview.tabBadge }));
  check('pro Overview names the read-only namespaces with their own plan', await page.evaluate(() => /northwind-tools/u.test(document.querySelector('[data-readers]')?.textContent ?? '') && /Business/u.test(document.querySelector('[data-readers]')?.textContent ?? '')));
  await go('/');
  check('the analytical pages carry the same Manage badge', (await page.evaluate(() => document.querySelector('[data-nav-manage] .m-dotn')?.textContent ?? '')) === overview.badge);

  // Repositories: enabled above, not enabled below; select → pending → enable with the writer declaration → stop.
  await qualifyPage(ctx, 'pro', '/manage/repositories?ns=parser-guild', { tab: 'Repositories', tabs: 5 });
  const before = await page.evaluate(() => ({ groups: [...document.querySelectorAll('[data-namespace-block="parser-guild"] .m-group .m-k')].map(node => node.textContent), cells: document.querySelectorAll('[data-namespace-block="parser-guild"] .m-cap.lg .m-cell').length, open: document.querySelectorAll('[data-namespace-block="parser-guild"] .m-cap.lg .m-cell.open').length, fuzz: document.querySelector('[data-repository-row="parser-guild/grammar-fuzz"] .m-st')?.textContent ?? '' }));
  check('pro Repositories groups parser-guild into Enabled with Pro features above Not enabled, with three slot cells of which two are open', before.groups[0] === 'Enabled with Pro features' && before.groups[1] === 'Not enabled' && before.cells === 3 && before.open === 2 && before.fuzz === 'Not selected', JSON.stringify(before));
  await page.click('[data-repository-row="parser-guild/grammar-fuzz"] form button');
  await page.waitForLoadState('networkidle');
  const selected = await page.evaluate(() => ({ url: location.pathname + location.search, message: document.querySelector('.m-msg')?.textContent ?? '', state: document.querySelector('[data-repository-row="parser-guild/grammar-fuzz"] .m-st')?.textContent ?? '', open: document.querySelectorAll('[data-namespace-block="parser-guild"] .m-cap.lg .m-cell.open').length, pending: document.querySelectorAll('[data-namespace-block="parser-guild"] .m-cap.lg .m-cell.pend').length, group: document.querySelector('[data-repository-row="parser-guild/grammar-fuzz"]')?.closest('table')?.previousElementSibling?.textContent ?? '' }));
  check('selecting a repository lands it as Pending enable in the enabled group, holding a slot as a hatched cell', /Selected/u.test(selected.message) && selected.state === 'Pending enable' && selected.open === 1 && selected.pending === 1 && /Enabled with Pro/u.test(selected.group), JSON.stringify(selected));
  await shot('pro-manage-repositories-pending');
  await go('/manage/repositories/parser-guild/grammar-fuzz');
  const panel = await page.evaluate(() => {
    const heading = document.querySelector('h1')?.cloneNode(true);
    heading?.querySelector('[data-staging-mark]')?.remove();
    return { h1: heading?.textContent?.trim(), crumb: document.querySelector('.a-head .crumb')?.textContent?.replace(/\s+/gu, ' ').trim(), enable: Boolean(document.querySelector('[data-enable-panel]')), writer: Boolean(document.querySelector('[data-enable-panel] input[name="writer"]')), chain: [...document.querySelectorAll('[data-configuration] .m-chain .m-from')].map(node => node.textContent), rows: document.querySelectorAll('[data-configuration] .m-cfg tbody tr').length, ops: document.querySelectorAll('[data-operation] .m-eff > div').length };
  });
  check('the pending repository page shows the breadcrumb, the enable panel with the one-writer declaration, the policy chain and the effective rows', panel.h1 === 'grammar-fuzz' && /Manage\s*\/\s*parser-guild/u.test(panel.crumb) && panel.enable && panel.writer && panel.chain.length >= 2 && panel.rows >= 4 && panel.ops === 3, JSON.stringify(panel));
  await page.click('[data-enable-panel] form button');
  await page.waitForLoadState('networkidle');
  check('enabling without the writer declaration is refused and says why', /Confirm that no other writer/u.test(await page.evaluate(() => document.querySelector('.m-msg')?.textContent ?? '')));
  await page.check('[data-enable-panel] input[name="writer"]');
  await page.click('[data-enable-panel] form button');
  await page.waitForLoadState('networkidle');
  const enabled = await page.evaluate(() => ({ message: document.querySelector('.m-msg')?.textContent ?? '', pill: document.querySelector('.a-head .a-scope .m-st')?.textContent ?? '', seg: document.querySelectorAll('[data-operation] .a-seg [aria-current="true"]').length, panel: Boolean(document.querySelector('[data-enable-panel]')) }));
  check('with the declaration the repository runs: the state pill says Running and the Operation switch appears', /Enabled/u.test(enabled.message) && enabled.pill === 'Running' && enabled.seg === 1 && !enabled.panel, JSON.stringify(enabled));
  await shot('pro-manage-repository-running');
  await page.click('[data-leave] form button');
  await page.waitForLoadState('networkidle');
  check('stopping from Stop or leave frees the slot and keeps the page honest', /Stopped/u.test(await page.evaluate(() => document.querySelector('.m-msg')?.textContent ?? '')) && (await page.evaluate(() => document.querySelector('.a-head .a-scope .m-st')?.textContent ?? '')) === 'Stopped');

  // Repository settings of a running repository with history: the message controls and their synthetic preview.
  await go('/manage/repositories/parser-guild/parser-lab');
  const lab = await page.evaluate(() => ({ history: document.querySelector('[data-history] dl')?.textContent ?? '', brief: Boolean(document.querySelector('[data-brief-form]')), previewEnabled: !document.querySelector('[data-brief-preview-button]')?.disabled, mode: document.querySelector('[data-brief-form] input[name="mode"]:checked')?.value, seg: [...document.querySelectorAll('[data-operation] .a-seg > *')].map(node => node.textContent?.trim()) }));
  check('parser-lab shows collection with its provenance, coverage and retention, the Operation switch and the message controls off by default', /Collection/u.test(lab.history) && /Coverage/u.test(lab.history) && /Kept/u.test(lab.history) && lab.brief && lab.previewEnabled && lab.mode === 'off' && lab.seg.includes('Running') && lab.seg.includes('Stopped'), JSON.stringify(lab));
  await page.check('[data-brief-form] input[name="mode"][value="standard"]');
  await page.click('[data-brief-preview-button]');
  await page.waitForFunction(() => document.querySelectorAll('[data-brief-preview] [data-preview-state]').length === 6, null, { timeout: 15_000 }).catch(() => {});
  const preview = await page.evaluate(() => ({ states: document.querySelectorAll('[data-brief-preview] [data-preview-state]').length, notice: document.querySelector('[data-preview-notice]')?.textContent ?? '', markdown: document.querySelector('[data-preview-markdown]')?.textContent ?? '', facts: document.querySelector('[data-preview-facts]')?.textContent ?? '' }));
  check('the message preview renders the synthetic specimen in six states, names its route and writer, and posts nothing', preview.states === 6 && /Synthetic|Design specimen/u.test(preview.notice) && /Effects: none/u.test(preview.notice) && /Changed/u.test(preview.markdown) && /route: standard/u.test(preview.facts), JSON.stringify({ ...preview, markdown: preview.markdown.slice(0, 80) }));
  await page.click('[data-brief-preview] [data-preview-state="bounded"]');
  check('switching the preview state swaps the Markdown in place', /–|-/u.test(await page.evaluate(() => document.querySelector('[data-preview-markdown]')?.textContent ?? '')) && (await page.evaluate(() => document.querySelector('[data-preview-state="bounded"]')?.getAttribute('aria-current'))) === 'true');
  await shot('pro-manage-repository-preview');
  await page.click('[data-brief-form] button[type="submit"]');
  await page.waitForLoadState('networkidle');
  check('saving the message settings stores them beside the policy layer and the page says so', /settings saved/u.test(await page.evaluate(() => document.querySelector('.m-msg')?.textContent ?? '')) && (await page.evaluate(() => document.querySelector('[data-brief-form] input[name="mode"]:checked')?.value)) === 'standard');

  // Plan & funding: the standing card, six exits, the slots, a departure and the three returns.
  await qualifyPage(ctx, 'pro', '/manage/plan', { tab: 'Plan & funding', tabs: 5 });
  const plan = await page.evaluate(() => ({ plan: document.querySelector('[data-standing] .plan b')?.textContent, rows: document.querySelectorAll('[data-standing] .m-dl dt').length, exits: document.querySelectorAll('[data-standing] .m-exits a[href^="/manage/depart"]').length, cap: document.querySelector('[data-standing] .m-exits .cap')?.textContent ?? '', fund: Boolean(document.querySelector('[data-funds] select[name="organisation"]')) || /No unfunded organisation you administer/u.test(document.querySelector('[data-funds] .m-org.open')?.textContent ?? ''), release: document.querySelectorAll('[data-funds] form input[value="release-slot"]').length, compare: [...document.querySelectorAll('[data-compare] .a-seg a')].map(node => node.textContent), grace: /grace|countdown|days left/iu.test(document.body.innerText) }));
  check('pro Plan & funding shows the Pro standing card with its rows and six Works exits, the slots with Fund and Release, and compares with Business first', plan.plan === 'Pro' && plan.rows >= 3 && plan.exits === 6 && /Return to DiffDevil/u.test(plan.cap) && plan.fund && plan.release === 1 && plan.compare[0] === 'Business' && !plan.grace, JSON.stringify(plan));
  await page.click('[data-funds] .m-org.add');
  await page.waitForLoadState('networkidle');
  check('Add an organisation slot departs to the Works stand-in', (await page.evaluate(() => document.querySelector('[data-works-stand-in]')?.dataset.worksStandIn)) === 'experience', page.url());
  await page.click('[data-works-stand-in] form:nth-of-type(2) button');
  await page.waitForLoadState('networkidle');
  const confirmed = await page.evaluate(() => ({ path: location.pathname, kind: document.querySelector('.m-return')?.className ?? '', title: document.querySelector('.m-return b')?.textContent ?? '', slots: document.querySelectorAll('[data-funds] .m-org.open').length, live: document.querySelector('.m-return')?.getAttribute('role') }));
  check('returning after Works confirmed a new slot shows the confirmed strip with the next action', confirmed.path === '/manage/plan' && /done/u.test(confirmed.kind) && /slot is ready/u.test(confirmed.title) && confirmed.slots === 2 && confirmed.live === 'status', JSON.stringify(confirmed));
  await shot('pro-manage-plan-return-done');
  await page.click('.m-return .m-acts form:last-of-type button');
  await page.waitForLoadState('networkidle');
  await go(`/manage/depart?to=experience&purpose=change-plan&from=${encodeURIComponent('/manage/repositories?ns=parser-guild')}`);
  await page.click('[data-works-stand-in] form:nth-of-type(1) button');
  await page.waitForLoadState('networkidle');
  const waiting = await page.evaluate(() => ({ kind: document.querySelector('.m-return')?.className ?? '', title: document.querySelector('.m-return b')?.textContent ?? '', steps: [...document.querySelectorAll('.m-return .m-steps3 span')].map(node => node.className), spinner: Boolean(document.querySelector('.m-return .m-spin')), live: document.querySelector('.m-return')?.getAttribute('aria-live'), back: document.querySelector('.m-return a.m-btn')?.textContent ?? '', edge: getComputedStyle(document.querySelector('.m-return')).boxShadow }));
  check('returning before Works confirms shows the highlighted waiting strip: info edge, three steps with the current one spinning, polite live region, a way back', /wait/u.test(waiting.kind) && /Waiting for Works/u.test(waiting.title) && waiting.steps[0] === 'done' && waiting.steps[1] === 'now' && waiting.spinner && waiting.live === 'polite' && /Back to Repositories/u.test(waiting.back) && waiting.edge !== 'none', JSON.stringify(waiting));
  await shot('pro-manage-plan-return-wait');
  await page.click('.m-return .m-acts form:last-of-type button');
  await page.waitForLoadState('networkidle');

  // Account: four relationships, the funding connection, sessions, email, export and the closure flow.
  await qualifyPage(ctx, 'pro', '/manage/account', { tab: 'Account', tabs: 5 });
  const account = await page.evaluate(() => ({ relationships: document.querySelectorAll('[data-relationships] .m-rel > div').length, pills: [...document.querySelectorAll('[data-relationships] .m-rel .st .m-st')].map(node => node.textContent), sessions: document.querySelector('[data-sessions]')?.textContent ?? '', closeDisabled: false, export: Boolean(document.querySelector('[data-leaving] a[href="/manage/export"]')) }));
  check('pro Account shows the four relationships with their standing, the sessions with the sign-out disclosure, and the export', account.relationships === 4 && account.pills[0] === 'Signed in' && /active/u.test(account.pills[1]) && /Linked/u.test(account.pills[3]) && /keeps your funding connection/u.test(account.sessions) && account.export, JSON.stringify(account));
  await go('/manage/account?confirm=close');
  check('the closure flow offers the export first and refuses closure while a Works plan is linked', await page.evaluate(() => Boolean(document.querySelector('[data-confirm="close"]')) && /Export first/u.test(document.querySelector('[data-confirm="close"]')?.textContent ?? '') && document.querySelector('[data-confirm="close"] button[type="submit"]')?.disabled === true));
  const exported = await ctx.page.context().request.get(`${ORIGIN}/manage/export?repository=parser-guild%2Fparser-lab`);
  const exportBody = await exported.json();
  check('the export answers the administrator with the repository\'s settings, effective policy and retained history as JSON', exported.status() === 200 && exportBody.kind === 'diffdevil.manage-export' && exportBody.repositories.length === 1 && exportBody.repositories[0].effectivePolicy?.bands?.size && Array.isArray(exportBody.repositories[0].retainedHistory?.records ?? exportBody.repositories[0].retainedHistory), `${exported.status()} ${JSON.stringify(Object.keys(exportBody))}`);
  // Disconnect ends the sessions; the sign-in page says why; sign-in does not reconnect; Reconnect does.
  await go('/manage/account?confirm=disconnect');
  await page.click('[data-confirm="disconnect"] form button');
  await page.waitForLoadState('networkidle');
  check('disconnecting the funding connection ends this session and the sign-in page explains that only Reconnect brings it back', new URL(page.url()).pathname === '/sign-in' && /disconnected/u.test(await text(page)) && /reconnect/u.test(await text(page)), page.url());
  await ctx.signIn();
  await go('/manage/account');
  check('after signing in again the connection is still disconnected, Pro reads as paused in the funded organisation, and Reconnect is offered', await page.evaluate(() => Boolean(document.querySelector('[data-connection-banner]')) && /Disconnected/u.test([...document.querySelectorAll('[data-relationships] .m-rel .st .m-st')][2]?.textContent ?? '') && Boolean(document.querySelector('[data-connection-banner] form input[value="reconnect"]'))));
  await shot('pro-manage-account-disconnected');
  await page.click('[data-connection-banner] form button');
  await page.waitForLoadState('networkidle');
  check('Reconnect restores the connection standing', /Reconnected/u.test(await page.evaluate(() => document.querySelector('.m-msg')?.textContent ?? '')) && !(await page.evaluate(() => Boolean(document.querySelector('[data-connection-banner]')))));
  // Defaults on Pro: the editor when the extension is present, otherwise the honest Community state.
  await qualifyPage(ctx, 'pro', '/manage/defaults?ns=parser-guild', { tab: 'Defaults', tabs: 5 });
  const defaults = await page.evaluate(() => ({ editor: Boolean(document.querySelector('[data-defaults="editor"]')), absent: Boolean(document.querySelector('[data-defaults="not-provided"]')), free: Boolean(document.querySelector('[data-defaults="free"]')) }));
  check(`pro Defaults shows ${ctx.premium ? 'the editor' : 'that the editor is not part of this build'}`, ctx.premium ? defaults.editor : defaults.absent, JSON.stringify(defaults));
  if (ctx.premium) {
    await page.fill('[data-default-form] textarea', 'version: 1\npresets: [size@1]\nscopes:\n  generated: { exclude: ["**/*.snap"] }\n');
    await page.click('[data-default-form] button[type="submit"]');
    await page.waitForLoadState('networkidle');
    check('saving the default records revision 1', /Default saved/u.test(await page.evaluate(() => document.querySelector('.m-msg')?.textContent ?? '')) && (await page.evaluate(() => document.querySelector('[data-defaults="editor"]')?.dataset.revision)) === '1');
    await go('/manage/repositories/parser-guild/parser-lab');
    const unadopted = await page.evaluate(() => ({ chain: [...document.querySelectorAll('[data-configuration] .m-chain .m-from')].map(node => node.textContent ?? ''), summary: document.querySelector('[data-adopt-summary]')?.textContent ?? '' }));
    check('a saved Pro default changes nothing that runs: the repository compares with it and offers Review and apply', !unadopted.chain.some(label => /parser-guild default/u.test(label)) && /Compared with the parser-guild default \(rev 1\): 1 difference/u.test(unadopted.summary), JSON.stringify(unadopted));
    await page.click('[data-adopt-summary] a');
    await page.waitForLoadState('networkidle');
    const review = await page.evaluate(() => ({ rows: [...document.querySelectorAll('[data-adopt-differences] tbody tr')].map(row => row.textContent ?? ''), apply: Boolean(document.querySelector('[data-adopt-review] form button')) }));
    check('reviewing the default previews exactly what applying changes before anything is written', review.rows.length === 1 && /scopes\.generated/u.test(review.rows[0]) && review.apply, JSON.stringify(review));
    await shot('pro-manage-repository-adopt-review');
    await page.click('[data-adopt-review] form button');
    await page.waitForLoadState('networkidle');
    const adopted = await page.evaluate(() => ({ message: document.querySelector('.m-msg')?.textContent ?? '', chain: [...document.querySelectorAll('[data-configuration] .m-chain .m-from')].map(node => node.textContent ?? ''), summary: document.querySelector('[data-adopt-summary]')?.textContent ?? '' }));
    check('applying writes the default into the repository\'s own settings and names the adopted revision as the origin', /Default applied/u.test(adopted.message) && adopted.chain.some(label => /App settings · rev \d+ · from parser-guild default rev 1/u.test(label)) && /Adopted the parser-guild default rev 1/u.test(adopted.summary) && /Matches/u.test(adopted.summary), JSON.stringify(adopted));
  }
  // History jobs: an import is requested from the repository page and shows its standing there. This local Worker has no
  // GitHub App credential, so the queued step cannot read GitHub; its failure must be named with Retry, never hidden.
  await go('/manage/repositories/parser-guild/parser-lab');
  await page.click('[data-history] footer form:has(input[value="import"]) button');
  await page.waitForLoadState('networkidle');
  const imported = await page.evaluate(() => ({ message: document.querySelector('.m-msg')?.textContent ?? '', job: document.querySelector('[data-job="import"]')?.dataset.jobState ?? '', title: document.querySelector('[data-job="import"] b')?.textContent ?? '', disabled: document.querySelector('[data-history] footer form:has(input[value="import"]) button')?.hasAttribute('disabled') ?? false }));
  check('Import past PRs queues a durable job that the History panel shows with its scope and standing', /Import queued|no work queue/u.test(imported.message) && ['queued', 'running', 'failed', 'complete'].includes(imported.job) && /Import/u.test(imported.title), JSON.stringify(imported));
  await page.waitForTimeout(1500);
  await go('/manage/repositories/parser-guild/parser-lab');
  const later = await page.evaluate(() => ({ job: document.querySelector('[data-job="import"]')?.dataset.jobState ?? '', detail: document.querySelector('[data-job="import"] .sub')?.textContent ?? '', retry: [...document.querySelectorAll('[data-job="import"] button')].map(button => button.textContent?.trim()) }));
  check('the import step ran through the local queue consumer; without a GitHub App credential it is reported as failed with Retry, not as progress', (later.job === 'failed' && later.retry.includes('Retry')) || ['queued', 'running'].includes(later.job), JSON.stringify(later));
  await shot('pro-manage-repository-import');
  await page.setViewportSize({ width: 1024, height: 900 });
  await go('/manage');
  check('at 1024 the console stacks without horizontal overflow', (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 0);
  await go('/manage/repositories/parser-guild/parser-lab');
  check('at 1024 the repository settings stack without horizontal overflow', (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 0);
  await shot('pro-manage-repository-1024');
  await page.setViewportSize({ width: 1440, height: 900 });

}

/** The applied lower-plan choice remains visible after the subscription is funded again. */
export async function planChoiceReturn(ctx) {
  const { check, go, page, ORIGIN } = ctx;
  await go('/manage/works-stand-in?dest=experience');
  await page.click('form:has(input[value="reduce-to-free"]) button');
  await page.waitForLoadState('networkidle');
  await go('/manage/plan');
  const currentFreeBeforeChoice = await page.evaluate(() => ({ standingPlan: document.querySelector('[data-standing] .plan b')?.textContent?.trim() ?? '', choiceState: document.querySelector('[data-choose-stays]')?.dataset.chooseStays ?? '', heading: document.querySelector('[data-choose-stays] h2')?.textContent?.trim() ?? '', status: document.querySelector('[data-choose-stays] header .d')?.textContent?.trim() ?? '' }));
  check('after Pro ends, Manage shows the current Free plan and the choice due on Free', currentFreeBeforeChoice.standingPlan === 'Free' && currentFreeBeforeChoice.choiceState === 'due' && /Choose what stays on Free/u.test(currentFreeBeforeChoice.heading) && /Free is in effect/u.test(currentFreeBeforeChoice.status), JSON.stringify(currentFreeBeforeChoice));
  await page.locator('[data-choose-stays] input[name="keep"]').first().check();
  await page.click('[data-choose-stays] button[type="submit"]');
  await page.waitForLoadState('networkidle');
  const freeChoice = await page.evaluate(() => ({ standingPlan: document.querySelector('[data-standing] .plan b')?.textContent?.trim() ?? '', state: document.querySelector('[data-choose-stays]')?.dataset.chooseStays, heading: document.querySelector('[data-choose-stays] h2')?.textContent?.trim() ?? '', status: document.querySelector('[data-choose-stays] header .d')?.textContent?.trim() ?? '', outcome: document.querySelector('[data-choice-outcome]')?.textContent ?? '', savedForNextChange: /next change of plan/u.test(document.querySelector('[data-choice-outcome] .m-note')?.textContent ?? '') }));
  check('while the applied choice is current, Manage names Free and preserves the historical outcome for future use', freeChoice.standingPlan === 'Free' && freeChoice.state === 'applied' && /Free choice applied/u.test(freeChoice.heading) && /current plan is Free/u.test(freeChoice.status) && /under this Free choice|when this choice applied/u.test(freeChoice.outcome) && freeChoice.savedForNextChange, JSON.stringify(freeChoice));
  const fundedAgain = await page.request.post(`${ORIGIN}/manage/do`, { form: { action: 'fixture-simulate', kind: 'reduce-to-pro', back: '/manage/plan' }, headers: { origin: ORIGIN }, maxRedirects: 0 });
  check('the local Works stand-in confirms the returning Pro plan before the Manage read', fundedAgain.status() === 303, String(fundedAgain.status()));
  await go('/manage/plan');
  const returnedToPro = await page.evaluate(() => ({ standingPlan: document.querySelector('[data-standing] .plan b')?.textContent?.trim() ?? '', choiceState: document.querySelector('[data-choose-stays]')?.dataset.chooseStays ?? '', heading: document.querySelector('[data-choose-stays] h2')?.textContent?.trim() ?? '', status: document.querySelector('[data-choose-stays] header .d')?.textContent?.trim() ?? '', outcome: document.querySelector('[data-choice-outcome]')?.textContent ?? '', savedForNextChange: /next change of plan/u.test(document.querySelector('[data-choice-outcome] .m-note')?.textContent ?? '') }));
  const outcomeIsHistorical = /under this Free choice|when this choice applied/u.test(returnedToPro.outcome) && !/stays connected|shares your Free allowance|keeps running|Nothing needed to stop\./u.test(returnedToPro.outcome);
  check('after funded Pro returns, Manage names Pro as current while retaining the historical Free choice and its future use', returnedToPro.standingPlan === 'Pro' && returnedToPro.choiceState === 'applied' && /Free choice applied/u.test(returnedToPro.heading) && /current plan is Pro/u.test(returnedToPro.status) && outcomeIsHistorical && returnedToPro.savedForNextChange, JSON.stringify(returnedToPro));
}

export async function freeManage(ctx) {
  const { check, go, page, shot } = ctx;
  const overview = await qualifyPage(ctx, 'free', '/manage', { tab: 'Overview', tabs: 5 });
  check('free Overview shows the two pooled allowances as named cells and segments, and no plan chip on the account', await page.evaluate(() => document.querySelectorAll('[data-slots] .m-allowg .g').length === 2 && document.querySelectorAll('[data-slots] .m-segs.priv i').length === 3 && document.querySelectorAll('[data-slots] .m-segs.pub i').length === 10 && !document.querySelector('[data-plan-band] .a-plan')), String(overview.h1Text));
  check('free Overview says parser-guild is not connected and offers Pro and Business', await page.evaluate(() => /not connected/u.test(document.querySelector('[data-namespace-row="parser-guild"]')?.textContent ?? '') && /See Pro and Business/u.test(document.querySelector('[data-plan-band]')?.textContent ?? '')));
  await qualifyPage(ctx, 'free', '/manage/repositories', { tab: 'Repositories', tabs: 5 });
  check('free Repositories shows the allowance panel above every namespace and the connect action on the unconnected organisation', await page.evaluate(() => Boolean(document.querySelector('[data-free-allowance]')) && /Connect as your Free organisation/u.test(document.querySelector('[data-namespace-block="parser-guild"] header')?.textContent ?? '') && /Not connected/u.test(document.querySelector('[data-repository-row="parser-guild/parser-lab"] .m-st')?.textContent ?? '')));
  await page.click('[data-namespace-block="parser-guild"] header form button');
  await page.waitForLoadState('networkidle');
  const connected = await page.evaluate(() => ({ message: document.querySelector('.m-msg')?.textContent ?? '', pooled: /Counts toward the Free allowance/u.test(document.querySelector('[data-namespace-block="parser-guild"]')?.textContent ?? ''), header: document.querySelector('[data-namespace-block="parser-guild"] header .d')?.textContent ?? '', priv: document.querySelectorAll('[data-free-allowance] .m-segs.priv i.on').length, choice: document.querySelectorAll('[data-repository-row="parser-guild/lexer-kit"] .a-seg').length }));
  check('connecting the organisation pools it into the Free allowance, counts its private repositories, and gives its public repository the History | Labels only switch', /Connected/u.test(connected.message) && connected.pooled && /your connected organisation/u.test(connected.header) && connected.priv === 2 && connected.choice === 1, JSON.stringify(connected));
  await shot('free-manage-repositories-connected');
  await page.click('[data-repository-row="parser-guild/lexer-kit"] .a-seg form button');
  await page.waitForLoadState('networkidle');
  check('switching a public repository to Labels only frees its history place', /Collection stopped/u.test(await page.evaluate(() => document.querySelector('.m-msg')?.textContent ?? '')) && (await page.evaluate(() => document.querySelectorAll('[data-free-allowance] .m-segs.pub i.on').length)) === 0);
  await go('/manage/repositories?ns=parser-guild&panel=disconnect%3Aparser-guild');
  check('the disconnect panel says what stops and what stays', await page.evaluate(() => /stop running/u.test(document.querySelector('[data-panel="disconnect"]')?.textContent ?? '') && /History and settings stay/u.test(document.querySelector('[data-panel="disconnect"]')?.textContent ?? '')));
  await page.click('[data-panel="disconnect"] form button');
  await page.waitForLoadState('networkidle');
  check('disconnecting the organisation returns it to Not connected', /Disconnected/u.test(await page.evaluate(() => document.querySelector('.m-msg')?.textContent ?? '')) && /Not connected/u.test(await page.evaluate(() => document.querySelector('[data-repository-row="parser-guild/parser-lab"] .m-st')?.textContent ?? '')));
  await qualifyPage(ctx, 'free', '/manage/defaults', { tab: 'Defaults', tabs: 5 });
  check('free Defaults shows the bounded See Pro placeholder', await page.evaluate(() => Boolean(document.querySelector('[data-defaults="free"] .a-prohint'))));
  await qualifyPage(ctx, 'free', '/manage/plan', { tab: 'Plan & funding', tabs: 5 });
  check('free Plan & funding shows the allowances, the two upgrade exits that link Works first, and what Pro would change here', await page.evaluate(() => Boolean(document.querySelector('[data-standing="free"] .m-allowg')) && document.querySelectorAll('[data-standing="free"] .m-exits form input[value="link"]').length === 2 && /What Pro would change here/u.test(document.querySelector('[data-what-pro]')?.textContent ?? '')));
  await page.click('[data-standing="free"] .m-exits form button');
  await page.waitForLoadState('networkidle');
  check('the first upgrade starts the Works link and lands on the stand-in for the plan page', (await page.evaluate(() => document.querySelector('[data-works-stand-in]')?.dataset.worksStandIn)) === 'link', page.url());
  await page.click('[data-works-stand-in] form button');
  await page.waitForLoadState('networkidle');
  const linked = await page.evaluate(() => ({ path: location.pathname + location.search, strip: document.querySelector('.m-return b')?.textContent ?? '', banner: document.querySelector('[data-standing-banner]')?.dataset.standingBanner ?? '', plan: document.querySelector('[data-standing] .plan b')?.textContent ?? '' }));
  check('after linking, the return lands on Plan & funding as linked, with the first payment pending until Works confirms', /^\/manage\/plan\?works-link=linked/u.test(linked.path) && /Linked to Wolfsblvt Works/u.test(linked.strip) && linked.banner === 'first-payment' && linked.plan === 'Pro', JSON.stringify(linked));
  await shot('free-manage-plan-linked');
  await go('/manage/plan?works-link=pending');
  check('a link that did not finish is reported neutrally with a way to try again and nothing charged', await page.evaluate(() => /didn't finish/u.test(document.querySelector('.m-return b')?.textContent ?? '') && /Nothing was charged/u.test(document.querySelector('.m-return p')?.textContent ?? '') && !document.querySelector('.m-return.wait')));
  await qualifyPage(ctx, 'free', '/manage/account', { tab: 'Account', tabs: 5 });
  // Sign out from Account: the sign-in page discloses the connection standing.
  await page.click('[data-sessions] form[action="/auth/logout"] button');
  await page.waitForLoadState('networkidle');
  check('signing out from Account lands on sign-in with the funding-connection disclosure', new URL(page.url()).pathname === '/sign-in' && Boolean(await page.evaluate(() => document.querySelector('[data-signed-out]'))), page.url());
  await ctx.signIn();
}

export async function businessManage(ctx) {
  const { check, go, page, shot } = ctx;
  const message = () => page.evaluate(() => document.querySelector('.m-msg')?.textContent ?? '');
  const posted = async () => { await page.waitForLoadState('networkidle'); return message(); };
  await qualifyPage(ctx, 'business', '/manage', { tab: 'Overview', tabs: 7 });
  check('business Overview shows Business in the plan band and no private limit on its organisations', await page.evaluate(() => /Business/u.test(document.querySelector('[data-plan-band] .m-planname b')?.textContent ?? '') && [...document.querySelectorAll('[data-slots] .m-capw')].every(node => /no private limit/u.test(node.textContent ?? ''))));
  for (const [tab, path, marker] of [['Policies', '/manage/policies', 'policies'], ['People', '/manage/people', 'people'], ['Audit', '/manage/audit', 'audit']]) {
    await qualifyPage(ctx, 'business', path, { tab, tabs: 7 });
    const seen = await page.evaluate(marker => ({ provided: document.querySelectorAll(`[data-${marker}]:not([data-${marker}="not-provided"]), [data-policy], [data-automatic-setup], [data-people], [data-audit]`).length, absent: Boolean(document.querySelector(`[data-${marker}="not-provided"]`)) }), marker);
    check(`business ${tab} shows ${ctx.premium ? 'the premium body' : 'that the coordination surface is not part of this build'}`, ctx.premium ? seen.provided > 0 && !seen.absent : seen.absent, JSON.stringify(seen));
  }
  await go('/manage/plan');
  check('business Plan & funding compares with Pro first', (await page.evaluate(() => document.querySelector('[data-compare] .a-seg a')?.textContent ?? '')) === 'Pro');
  if (!ctx.premium) return;

  // ── Policies: empty state, an invalid document, a named policy by revision, linking, publishing with its result, the repository's chain, automatic setup ──
  await go('/manage/policies?ns=parser-guild');
  check('business Policies starts empty for parser-guild, with the way to create one', await page.evaluate(() => Boolean(document.querySelector('[data-policies="empty"]')) && document.querySelectorAll('[data-policy]').length === 0));
  await page.click('a[href*="new=1"]');
  await page.waitForLoadState('networkidle');
  await page.fill('[data-policy-form] input[name="name"]', 'Default');
  await page.fill('[data-policy-form] textarea', 'version: 1\nbrief: { mode: standard }\n');
  await page.click('[data-policy-form] button[type="submit"]');
  check('an invalid policy document is refused with the reason, as an alert, and nothing is created', /did not read as a valid policy/u.test(await posted()) && (await page.evaluate(() => document.querySelector('.m-msg')?.getAttribute('role'))) === 'alert' && (await page.evaluate(() => document.querySelectorAll('[data-policy]').length)) === 0);
  await go('/manage/policies?ns=parser-guild&new=1');
  await page.fill('[data-policy-form] input[name="name"]', 'Default');
  await page.fill('[data-policy-form] textarea', 'version: 1\npresets: [size@1]\nscopes:\n  generated: { exclude: ["**/*.snap"] }\n');
  await page.click('[data-policy-form] button[type="submit"]');
  await page.waitForLoadState('networkidle');
  const created = await page.evaluate(() => ({ message: document.querySelector('.m-msg')?.textContent ?? '', card: document.querySelector('[data-policy="Default"] header .d')?.textContent ?? '', editor: Boolean(document.querySelector('[data-policy-editor]')), publishDisabled: document.querySelector('[data-policy="Default"] form input[value="policy-publish"]')?.closest('form')?.querySelector('button')?.disabled }));
  check('creating a policy lands on its card as revision 1 with nothing linked and Publish held until a repository is linked', /Policy created/u.test(created.message) && /revision 1 · linked to 0 repositories/u.test(created.card) && created.editor && created.publishDisabled === true, JSON.stringify(created));
  await page.selectOption('[data-policy="Default"] [data-link-form] select[name="repository"]', 'parser-guild/parser-lab');
  await page.click('[data-policy="Default"] [data-link-form] button[type="submit"]');
  await page.waitForLoadState('networkidle');
  const linked = await page.evaluate(() => ({ message: document.querySelector('.m-msg')?.textContent ?? '', linked: [...document.querySelectorAll('[data-policy="Default"] [data-linked]')].map(node => `${node.dataset.linked}:${node.querySelector('.m-st')?.textContent}`) }));
  check('linking applies the current revision at once and the card names the repository at rev 1', /^Linked\./u.test(linked.message.trim()) && linked.linked.includes('parser-guild/parser-lab:rev 1'), JSON.stringify(linked));
  await go('/manage/repositories/parser-guild/parser-lab');
  const chain = await page.evaluate(() => ({ chain: [...document.querySelectorAll('[data-configuration] .m-chain .m-from')].map(node => node.textContent), footer: document.querySelector('[data-policy-footer]')?.textContent ?? '', unlink: Boolean(document.querySelector('[data-policy-footer] input[value="policy-unlink"]')), from: [...document.querySelectorAll('[data-configuration] .m-cfg tbody tr')].find(row => /scopes\.generated/u.test(row.textContent ?? ''))?.querySelector('.m-from')?.textContent ?? '' }));
  check('the linked repository\'s Configuration names the policy revision in the chain and the footer, with Open policy and Unlink', chain.chain.includes('linked policy Default · rev 1') && /Linked to the policy Default \(rev 1\)/u.test(chain.footer) && chain.unlink && chain.from === 'linked policy', JSON.stringify(chain));
  await go('/manage/policies?ns=parser-guild');
  await page.click('[data-policy="Default"] a[href*="policy="]');
  await page.waitForLoadState('networkidle');
  await page.fill('[data-policy-form] textarea', 'version: 1\npresets: [size@1]\nscopes:\n  generated: { exclude: ["**/*.snap", "**/*.lock"] }\n');
  await page.click('[data-policy-form] button[type="submit"]');
  await page.waitForLoadState('networkidle');
  const saved = await page.evaluate(() => ({ message: document.querySelector('.m-msg')?.textContent ?? '', card: document.querySelector('[data-policy="Default"] header .d')?.textContent ?? '', behind: document.querySelector('[data-policy="Default"] [data-linked="parser-guild/parser-lab"] .m-st')?.textContent ?? '' }));
  check('saving a new revision keeps the linked repository at rev 1 and says rev 2 is not published there yet', /Saved as a new revision/u.test(saved.message) && /revision 2/u.test(saved.card) && /rev 1 · rev 2 not published here yet/u.test(saved.behind), JSON.stringify(saved));
  await page.click('[data-policy="Default"] form input[value="policy-publish"] ~ button, [data-policy="Default"] header form button');
  await page.waitForLoadState('networkidle');
  const published = await page.evaluate(() => ({ message: document.querySelector('.m-msg')?.textContent ?? '', rows: [...document.querySelectorAll('[data-publication] tbody tr')].map(row => `${row.querySelector('.rn span')?.textContent}:${row.dataset.publicationResult}`), summary: document.querySelector('[data-publication] .m-gd')?.textContent ?? '', retry: Boolean(document.querySelector('[data-publication] input[value="policy-retry"]')), at: document.querySelector('[data-policy="Default"] [data-linked="parser-guild/parser-lab"] .m-st')?.textContent ?? '', reason: document.querySelector('[data-publication] tbody tr .why')?.textContent ?? '' }));
  check('publishing revision 2 applies it to the linked repository, shows the result per repository with what happened, and offers no Retry when nothing waits', /Published to every linked repository/u.test(published.message) && published.rows.includes('parser-lab:applied') && /Applied to its one repository/u.test(published.summary) && !published.retry && published.at === 'rev 2' && /Effective policy updated/u.test(published.reason), JSON.stringify(published));
  await shot('business-manage-policies');
  await page.click('[data-setup="parser-guild"] a[href*="setup="]');
  await page.waitForLoadState('networkidle');
  await page.selectOption('[data-setup-form="parser-guild"] select[name="policy"]', { label: 'Default (revision 2)' });
  await page.check('[data-setup-form="parser-guild"] input[name="enable"]');
  await page.click('[data-setup-form="parser-guild"] button[type="submit"]');
  check('automatic setup with enabling but no one-writer declaration is refused and says why', /Confirm that no other writer/u.test(await posted()));
  await go('/manage/policies?ns=parser-guild&setup=parser-guild');
  await page.selectOption('[data-setup-form="parser-guild"] select[name="policy"]', { label: 'Default (revision 2)' });
  await page.check('[data-setup-form="parser-guild"] input[name="enable"]');
  await page.check('[data-setup-form="parser-guild"] input[name="writer"]');
  await page.click('[data-setup-form="parser-guild"] button[type="submit"]');
  await page.waitForLoadState('networkidle');
  const setup = await page.evaluate(() => ({ message: document.querySelector('.m-msg')?.textContent ?? '', row: document.querySelector('[data-setup="parser-guild"] .d')?.textContent ?? '', pill: document.querySelector('[data-policy="Default"] header .m-st')?.textContent ?? '' }));
  check('automatic setup saves and reads back what new repositories get, with history and publication named as separate choices, as the namespace\'s setting chosen by you, and the policy card says new repositories get it', /Automatic setup saved as the namespace's setting/u.test(setup.message) && /Link to Default and enable labels and the check\. History: off, chosen separately\. Publication: off\. Chosen by you as administrator on GitHub on .+\. It is the namespace's setting: it stays until a current administrator or Account administrator changes it\./u.test(setup.row) && setup.pill === 'New repositories get it', JSON.stringify(setup));
  await shot('business-manage-automatic-setup');
  // Long content: a sixty-character name and a long document still lay out without overflow.
  await go('/manage/policies?ns=parser-guild&new=1');
  await page.fill('[data-policy-form] input[name="name"]', 'A deliberately long policy name for the layout to carry 60');
  await page.fill('[data-policy-form] textarea', `version: 1\npresets: [size@1]\nscopes:\n${Array.from({ length: 12 }, (_, index) => `  scope${index}: { exclude: ["**/generated-${index}/**/*.snap", "**/vendor-${index}/**"] }`).join('\n')}\n`);
  await page.click('[data-policy-form] button[type="submit"]');
  await page.waitForLoadState('networkidle');
  const long = await page.evaluate(() => ({ message: document.querySelector('.m-msg')?.textContent ?? '', overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, card: Boolean(document.querySelector('[data-policy="A deliberately long policy name for the layout to carry 60"]')) }));
  check('a sixty-character policy name and a long document create a card without horizontal overflow', /Policy created/u.test(long.message) && long.overflow <= 0 && long.card, JSON.stringify(long));

  // ── People: the owner, naming by login with its refusals, a Repository administrator's reach, removal back to the empty state ──
  await go('/manage/people?ns=parser-guild');
  const people = await page.evaluate(() => ({ owner: document.querySelector('[data-person="owner"]')?.textContent ?? '', empty: Boolean(document.querySelector('[data-people-empty]')), ceiling: /Write access on GitHub is the ceiling/u.test(document.body.innerText) && /only while they can write to it on GitHub/u.test(document.body.innerText) }));
  check('business People shows the GitHub administrators (not the subscriber) as the owners, nobody named yet, and write access on GitHub as the ceiling', /GitHub administrators of parser-guild, including you/u.test(people.owner) && /administer parser-guild on GitHub/u.test(people.owner) && /GitHub administrator/u.test(people.owner) && !/fund the plan/u.test(people.owner) && people.empty && people.ceiling, JSON.stringify(people));
  await page.click('[data-people="administrators"] a[href*="add=1"]');
  await page.waitForLoadState('networkidle');
  await page.fill('[data-people-form] input[name="login"]', 'nobody-here');
  await page.check('[data-people-form] input[name="role"][value="account-admin"]');
  await page.click('[data-people-form] button[type="submit"]');
  check('naming a login GitHub does not know is refused and nothing changes', /GitHub knows no user/u.test(await posted()));
  await go('/manage/people?ns=parser-guild&add=1');
  await page.fill('[data-people-form] input[name="login"]', 'kai-sample');
  await page.check('[data-people-form] input[name="role"][value="repository-admin"]');
  await page.click('[data-people-form] button[type="submit"]');
  check('a Repository administrator without a repository named is refused', /needs at least one repository/u.test(await posted()));
  await go('/manage/people?ns=parser-guild&add=1');
  await page.fill('[data-people-form] input[name="login"]', 'kai-sample');
  await page.check('[data-people-form] input[name="role"][value="repository-admin"]');
  await page.check('[data-people-form] input[name="repositories"][value="1001"]');
  await page.click('[data-people-form] button[type="submit"]');
  await page.waitForLoadState('networkidle');
  const named = await page.evaluate(() => ({ message: document.querySelector('.m-msg')?.textContent ?? '', row: document.querySelector('[data-person="kai-sample"]')?.textContent ?? '', remove: Boolean(document.querySelector('[data-person="kai-sample"] input[value="delegate-remove"]')) }));
  check('naming kai-sample Repository administrator of parser-lab lists them with their reach, who named them, Can and Can\'t, and Remove', /^Named\./u.test(named.message.trim()) && /Repository administrator/u.test(named.row) && /parser-lab/u.test(named.row) && /named by you/u.test(named.row) && /Can't/u.test(named.row) && named.remove, JSON.stringify(named));
  await shot('business-manage-people');
  await page.click('[data-person="kai-sample"] form button');
  check('removing them returns People to the empty state', /^Removed\./u.test((await posted()).trim()) && (await page.evaluate(() => Boolean(document.querySelector('[data-people-empty]')))));

  // ── Audit: the record of what just happened, a refused request kept as failed, the filters, the empty filter state ──
  await go('/manage/repositories?ns=parser-guild');
  await page.click('[data-repository-row="parser-guild/grammar-fuzz"] form button');
  await page.waitForLoadState('networkidle');
  await go('/manage/repositories/parser-guild/grammar-fuzz?confirm=delete');
  await page.fill('[data-confirm="delete"] input[name="confirm"]', 'wrong-name');
  await page.click('[data-confirm="delete"] form button[type="submit"]');
  await page.waitForLoadState('networkidle');
  await go('/manage/audit?ns=parser-guild');
  const audit = await page.evaluate(() => { const rows = [...document.querySelectorAll('[data-audit="record"] tbody tr')].map(row => ({ who: row.children[1]?.textContent?.trim(), where: row.children[2]?.textContent?.trim(), what: row.children[3]?.textContent?.trim() ?? '', result: row.querySelector('.m-st')?.textContent ?? '' })); return { count: rows.length, published: rows.find(row => /^Published Default revision 2/u.test(row.what)), named: rows.find(row => /^Named kai-sample/u.test(row.what)), refused: rows.find(row => /^Deleted history/u.test(row.what) && row.result === 'Failed'), setup: rows.find(row => /^Chose automatic setup/u.test(row.what)), you: rows.every(row => /ada-sample/u.test(row.who ?? '') || /unknown|GitHub/u.test(row.who ?? '')), heads: [...document.querySelectorAll('[data-audit="record"] thead th')].map(node => node.textContent) }; });
  check('business Audit lists what happened as it happened: the publication, the naming, the automatic setup, and the refused deletion kept as Failed with its reason, each with its actor', audit.count >= 6 && audit.published?.result === 'Applied' && audit.named && audit.setup && /Type the repository name exactly/u.test(audit.refused?.what ?? '') && audit.you && audit.heads.join(',') === 'When,Who,Where,What,Result', JSON.stringify({ ...audit, heads: undefined }));
  await shot('business-manage-audit');
  await go('/manage/audit?ns=parser-guild&show=failed');
  check('the Queued and failed filter keeps only those rows', await page.evaluate(() => { const rows = [...document.querySelectorAll('[data-audit="record"] tbody tr')]; return rows.length > 0 && rows.every(row => ['Failed', 'Queued'].includes(row.querySelector('.m-st')?.textContent ?? '')); }));
  await go('/manage/audit?ns=ada-sample&show=people');
  check('an empty filter state says nothing matches rather than showing nothing', await page.evaluate(() => /Nothing matches this filter|Nothing is recorded yet/u.test(document.querySelector('[data-audit-empty]')?.textContent ?? '')));
  const exported = await page.context().request.get(`${ctx.ORIGIN}/manage/export`);
  const body = await exported.json();
  check('the export carries the Business policies, the setup with its linked policy and who chose it as what, people and record per coordinated namespace', exported.status() === 200 && Array.isArray(body.business) && body.business.some(scope => scope.namespace === 'parser-guild' && scope.policies.some(policy => policy.name === 'Default' && policy.revision === 2) && scope.automaticSetup?.enableExecution === true && scope.automaticSetup.policy === 'Default' && scope.automaticSetup.chosenBy?.login === 'ada-sample' && scope.automaticSetup.chosenBy?.as === 'owner' && scope.automaticSetup.belongsTo === 'namespace' && Array.isArray(scope.record) && scope.record.length > 0), JSON.stringify(Object.keys(body)));
  // Leave the fixture as the next pass expects: setup off, grammar-fuzz released.
  await go('/manage/policies?ns=parser-guild&setup=parser-guild');
  await page.click('[data-setup-form="parser-guild"] input[value="setup-off"] ~ button');
  await page.waitForLoadState('networkidle').catch(() => {});
  await settleFuzz(ctx);
  // Last in the last pass on the shared state, because it ends the stand-in's plan: Business ends with no choice saved. diffdevil picks nothing;
  // the choice form stays until a choice is applied, and applying it connects the organisation and keeps what was chosen.
  await go('/manage/works-stand-in?dest=experience');
  await page.click('form:has(input[value="reduce-to-free"]) button');
  await page.waitForLoadState('networkidle');
  await go('/manage/plan');
  const due = await page.evaluate(() => ({ state: document.querySelector('[data-choose-stays]')?.getAttribute('data-choose-stays') ?? '', organisations: [...document.querySelectorAll('[data-choose-stays] input[name="organisation"]')].map(input => input.closest('label')?.textContent ?? ''), keep: [...document.querySelectorAll('[data-choose-stays] input[name="keep"]')].length }));
  check('after the plan ends without a choice, Plan & funding asks what stays and picks nothing', due.state === 'due' && due.organisations.some(label => /parser-guild/u.test(label)) && due.keep >= 1, JSON.stringify(due));
  await go('/manage/repositories/parser-guild/parser-lab');
  check('meanwhile the organisation reads as not connected rather than silently running', /Not connected/u.test(await page.evaluate(() => document.querySelector('.a-head')?.textContent ?? '')) || /Not connected/u.test(await text(page)));
  await go('/manage/plan');
  await page.check('[data-choose-stays] input[name="organisation"]');
  for (const box of await page.$$('[data-choose-stays] input[name="keep"]')) await box.check();
  await page.click('[data-choose-stays] button[type="submit"]');
  await page.waitForLoadState('networkidle');
  const applied = await page.evaluate(() => ({ message: document.querySelector('.m-msg')?.textContent ?? '', state: document.querySelector('[data-choose-stays]')?.getAttribute('data-choose-stays') ?? '', outcome: document.querySelector('[data-choice-outcome]')?.textContent ?? '' }));
  check('applying the choice records its connected organisation and what was kept or stopped', /Applied/u.test(applied.message) && applied.state === 'applied' && /was selected to stay connected under this Free choice/u.test(applied.outcome) && /(Kept under this Free choice:|fit the Free plan when this choice applied)/u.test(applied.outcome), JSON.stringify(applied));
  await shot('business-manage-plan-choice-applied');
}

/**
 * The delegate's view: ada-sample named Account administrator of northwind-tools by its GitHub administrators, first
 * with read access only to ci-recipes on GitHub, then with write. `github` is the runner's GitHub double; the runner
 * seeds the delegation and starts the pass with ci-recipes narrowed to read.
 */
export async function delegateManage(ctx) {
  const { check, go, page, shot, github } = ctx;
  const post = fields => Promise.all([page.waitForNavigation({ waitUntil: 'networkidle' }), page.evaluate(values => { const form = document.createElement('form'); form.method = 'post'; form.action = '/manage/do'; for (const [name, value] of Object.entries(values)) { const input = document.createElement('input'); input.type = 'hidden'; input.name = name; input.value = value; form.append(input); } document.body.append(form); form.submit(); }, fields)]);
  await go('/manage');
  const overview = await page.evaluate(() => [...document.querySelectorAll('[data-attention] .m-att')].map(node => node.textContent ?? '').join(' | '));
  check('a read-only delegate\'s Overview names the repository they can\'t manage and why', /You can't manage diffdevil on northwind-tools\/ci-recipes/u.test(overview) && /read access there, not write/u.test(overview), overview);
  await go('/manage/repositories?ns=northwind-tools');
  const row = await page.evaluate(() => ({ why: [...document.querySelectorAll('[data-repository-row="northwind-tools/ci-recipes"] .why')].map(node => node.textContent).join(' '), actions: document.querySelectorAll('[data-repository-row="northwind-tools/ci-recipes"] form').length, readOnly: Boolean(document.querySelector('[data-repository-row="northwind-tools/ci-recipes"] [data-read-only-for-you]')), sub: document.body.innerText, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth }));
  check('Repositories keeps ci-recipes\' own state, adds why this person can\'t change it, and offers them no action GitHub would refuse', /GitHub gives you read access here, not write/u.test(row.why) && /Running/u.test(row.sub) && row.actions === 0 && row.readOnly && /you manage diffdevil here as Account administrator, where you can write on GitHub/u.test(row.sub) && row.overflow <= 0, JSON.stringify({ why: row.why, actions: row.actions, readOnly: row.readOnly, overflow: row.overflow }));
  await shot('delegate-read-only-repositories');
  const settings = await page.context().request.get(`${ctx.ORIGIN}/manage/repositories/northwind-tools/ci-recipes`);
  check('the read-only delegate\'s repository settings are refused with the write reason', settings.status() === 403 && /read access to this repository, not write/u.test(await settings.text()), String(settings.status()));
  await post({ action: 'brief', repository: 'northwind-tools/ci-recipes', mode: 'off', back: '/manage/repositories?ns=northwind-tools' });
  check('a read-only delegate\'s change is refused with the write reason', /read access to this repository, not write/u.test(await page.evaluate(() => document.querySelector('.m-msg')?.textContent ?? '')));
  await go('/manage/people?ns=northwind-tools');
  const people = await page.evaluate(() => ({ you: document.querySelector('[data-people-you]')?.textContent ?? '', add: Boolean(document.querySelector('[data-people="administrators"] a[href*="add=1"]')), remove: Boolean(document.querySelector('input[value="delegate-remove"]')), owner: document.querySelector('[data-person="owner"]')?.textContent ?? '', ceiling: /Write access on GitHub is the ceiling/u.test(document.body.innerText), rule: /only while they can write to it on GitHub/u.test(document.body.innerText), ada: document.querySelector('[data-person="ada-sample"]')?.textContent ?? '' }));
  if (ctx.premium) check('People tells a read-only delegate they can manage nothing here and why, with no naming or removing', /GitHub gives you read access only here/u.test(people.you) && /stays with the GitHub administrators of northwind-tools/u.test(people.you) && !people.add && !people.remove && /GitHub administrator/u.test(people.owner) && people.ceiling && people.rule && /Account administrator/u.test(people.ada) && /GitHub gave them read access only to northwind-tools\/ci-recipes/u.test(people.ada), JSON.stringify(people));
  else check('Community names the absent People body and offers no delegation actions', !people.add && !people.remove && /not part of this build/u.test(await page.locator('body').innerText()));
  await shot('delegate-read-only-people');
  // northwind-tools keeps the setting a former administrator chose on GitHub. An Account administrator sees whose it is,
  // changes it, and it then acts for her, only where GitHub still gives her write.
  await go('/manage/policies?ns=northwind-tools');
  if (ctx.premium) {
  const kept = await page.evaluate(() => ({ row: document.querySelector('[data-setup="northwind-tools"] .d')?.textContent ?? '', button: document.querySelector('[data-setup="northwind-tools"] a[href*="setup="]')?.textContent ?? '', held: Boolean(document.querySelector('[data-setup="northwind-tools"] [data-setup-held]')) }));
  check('a former administrator\'s setting stays the namespace\'s, names who chose it as what and when, waits on nobody, and changing it is offered as acting for the Account administrator', /Chosen by old-owner as administrator on GitHub on 1 Oct 2026\. It is the namespace's setting/u.test(kept.row) && kept.button === 'Change (acts for you)' && !kept.held, JSON.stringify(kept));
  await shot('delegate-namespace-setting-kept');
  await page.click('[data-setup="northwind-tools"] a[href*="setup="]');
  await page.waitForLoadState('networkidle');
  check('before saving, the Account administrator is told the choice becomes hers and person-bound', /Saving makes this choice yours as Account administrator/u.test(await page.evaluate(() => document.querySelector('[data-setup-form="northwind-tools"] [data-setup-yours]')?.textContent ?? '')));
  await page.check('[data-setup-form="northwind-tools"] input[name="enable"]');
  await page.check('[data-setup-form="northwind-tools"] input[name="writer"]');
  await page.click('[data-setup-form="northwind-tools"] button[type="submit"]');
  await page.waitForLoadState('networkidle');
  const delegateSetup = await page.evaluate(() => ({ message: document.querySelector('.m-msg')?.textContent ?? '', row: document.querySelector('[data-setup="northwind-tools"] .d')?.textContent ?? '', rule: /namespace's setting: it keeps applying after they leave.*A choice made by an Account administrator acts for them, only while they are one and only where GitHub gives them write/u.test(document.querySelector('[data-setup-rule]')?.textContent ?? ''), overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth }));
  check('an Account administrator chooses automatic setup through Policies, is told it acts for them only where they can still write, and it reads back as theirs', /Automatic setup saved\. It acts for you as Account administrator/u.test(delegateSetup.message) && /enable labels and the check/u.test(delegateSetup.row) && /Chosen by you as Account administrator on .+\. It acts for you, only while you are Account administrator/u.test(delegateSetup.row) && delegateSetup.rule && delegateSetup.overflow <= 0, JSON.stringify(delegateSetup));
  await shot('delegate-automatic-setup');
  await go('/manage/audit?ns=northwind-tools&show=policies');
  const replaced = await page.evaluate(() => [...document.querySelectorAll('[data-audit="record"] tbody tr')].map(row => row.textContent ?? '').find(text => /Chose automatic setup as Account administrator/u.test(text)) ?? '');
  check('Audit records the change with what it replaced', /It replaces the setting chosen by old-owner as administrator on GitHub on 1 Oct 2026/u.test(replaced), replaced);
  await shot('delegate-setup-audit');
  await go('/manage/policies?ns=northwind-tools&setup=northwind-tools');
  await page.click('[data-setup-form="northwind-tools"] input[value="setup-off"] ~ button');
  await page.waitForLoadState('networkidle');
  check('the Account administrator turns automatic setup off again', /Automatic setup is off/u.test(await page.evaluate(() => document.querySelector('.m-msg')?.textContent ?? '')));
  } else check('Community names the absent Policies body and offers no setup form', /not part of this build/u.test(await page.locator('body').innerText()) && await page.locator('[data-setup-form]').count() === 0);
  // GitHub grants write: the same delegation manages ci-recipes, and People says why.
  github.state.push.delete(1006);
  await post({ action: 'dismiss-return', back: '/manage' });
  await go('/manage/people?ns=northwind-tools');
  const writable = await page.evaluate(() => document.querySelector('[data-people-you]')?.textContent ?? '');
  if (ctx.premium) check('with write on GitHub, People says the delegate can manage ci-recipes because they can write to it', /You can manage diffdevil on ci-recipes because you can write to that repository on GitHub/u.test(writable), writable);
  else check('Community keeps the absent People standing when GitHub grants write', /not part of this build/u.test(await page.locator('body').innerText()));
  await shot('delegate-write-people');
  const opened = await go('/manage/repositories/northwind-tools/ci-recipes');
  check('with write on GitHub, the delegate opens ci-recipes\' settings', opened.status() === 200);
}

/**
 * Recovering automatic setup that stopped acting: the runner seeds parser-guild's setup as chosen by kai-sample as
 * Account administrator (no longer one) and one new repository it held. ada-sample, parser-guild's GitHub
 * administrator, finds it in Needs you, sees who it acts for and why in Policies, and chooses it again for herself.
 */
export async function setupRecovery(ctx) {
  const { check, go, page, shot } = ctx;
  const attention = () => page.evaluate(() => [...document.querySelectorAll('[data-attention] .m-att')].map(node => node.textContent ?? '').join(' | '));
  await go('/manage');
  const needs = await attention();
  check('Needs you names automatic setup that left a new repository waiting, who it acts for, why, and the way out', /Automatic setup in parser-guild left a new repository waiting/u.test(needs) && /It acts for kai-sample/u.test(needs) && /no longer one here/u.test(needs) && /Choose it again to make it the namespace's setting/u.test(needs), needs);
  await go('/manage/policies?ns=parser-guild');
  const row = () => page.evaluate(() => ({ text: document.querySelector('[data-setup="parser-guild"]')?.textContent ?? '', held: document.querySelector('[data-setup="parser-guild"] [data-setup-held]')?.textContent ?? '', button: document.querySelector('[data-setup="parser-guild"] a[href*="setup="]')?.textContent ?? '', overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth }));
  const before = await row();
  check('the setup row names who it acts for and as what, what waited and why, and offers to choose it again for the namespace', /Chosen by kai-sample as Account administrator on .+\. It acts for them, only while they are Account administrator/u.test(before.text) && /1 new repository waited since/u.test(before.held) && /no longer one here/u.test(before.held) && before.button === 'Choose it again for the namespace' && before.overflow <= 0, JSON.stringify(before));
  await shot('setup-recovery-held');
  await page.click('[data-setup="parser-guild"] a[href*="setup="]');
  await page.waitForLoadState('networkidle');
  check('choosing it again says it becomes the namespace\'s setting and outlasts its chooser', /Saving makes this the namespace's setting, shown as chosen by you\. It keeps applying if you later leave or stop administering/u.test(await page.evaluate(() => document.querySelector('[data-setup-form="parser-guild"] [data-setup-yours]')?.textContent ?? '')));
  await page.check('[data-setup-form="parser-guild"] input[name="enable"]');
  await page.check('[data-setup-form="parser-guild"] input[name="writer"]');
  await page.click('[data-setup-form="parser-guild"] button[type="submit"]');
  await page.waitForLoadState('networkidle');
  const after = await row();
  check('after choosing it again the row says it is the namespace\'s setting chosen by you, and nothing is shown as waiting', /Chosen by you as administrator on GitHub on .+\. It is the namespace's setting/u.test(after.text) && after.held === '' && after.button === 'Change', JSON.stringify(after));
  await shot('setup-recovery-chosen');
  await go('/manage/audit?ns=parser-guild&show=policies');
  const chose = await page.evaluate(() => [...document.querySelectorAll('[data-audit="record"] tbody tr')].map(row => row.textContent ?? '').find(text => /Chose automatic setup as administrator on GitHub/u.test(text)) ?? '');
  check('Audit keeps the choice as the namespace\'s setting with the person-bound choice it replaced', /It is parser-guild's setting: it keeps applying after ada-sample leaves or stops administering/u.test(chose) && /It replaces the setting chosen by kai-sample as Account administrator on 9 Oct 2026/u.test(chose), chose);
  await go('/manage');
  check('Needs you no longer lists the held setup', !/Automatic setup in parser-guild/u.test(await attention()));
  await go('/manage/policies?ns=parser-guild&setup=parser-guild');
  await page.click('[data-setup-form="parser-guild"] input[value="setup-off"] ~ button');
  await page.waitForLoadState('networkidle');
}

/** Leave parser-guild/grammar-fuzz not enabled (stopped or released), whatever an earlier journey left it as. */
async function settleFuzz({ go, page }) {
  for (let round = 0; round < 3; round++) {
    await go('/manage/repositories?ns=parser-guild');
    const button = await page.$('[data-repository-row="parser-guild/grammar-fuzz"] input[value="stop"] ~ button, [data-repository-row="parser-guild/grammar-fuzz"] input[value="release"] ~ button');
    if (!button) return;
    await button.click();
    await page.waitForLoadState('networkidle');
  }
}

/**
 * The accessible Manage journeys against the implemented routes: keyboard-only operation of the console (tabs,
 * selecting, the enable panel with its declaration, the confirmation dialog), visible focus, labelled controls and
 * decorative icons, the message and return live regions, the tables' headers or captions, 1024 and 900 without
 * horizontal overflow, the dark lock under a light colour-scheme preference, and reduced motion on the waiting
 * return strip. Screen readers themselves are not exercised; these are DOM and rendering facts.
 */
export async function manageAccess(ctx, { browser, label = 'pro' }) {
  const { check, go, page, shot, ORIGIN } = ctx;
  const routes = ['/manage', '/manage/repositories', '/manage/repositories/parser-guild/parser-lab', '/manage/defaults', '/manage/plan', '/manage/account', ...(label === 'business' ? ['/manage/policies', '/manage/people', '/manage/audit'] : [])];
  const a11y = () => page.evaluate(() => {
    const visible = element => { const rect = element.getBoundingClientRect(); return rect.width > 0 && rect.height > 0 && getComputedStyle(element).visibility !== 'hidden'; };
    const name = element => { if (element.getAttribute('aria-label') || element.getAttribute('aria-labelledby') || element.getAttribute('title')) return true; const id = element.id; if (id && document.querySelector(`label[for="${CSS.escape(id)}"]`)) return true; const label = element.closest('label'); return Boolean(label && label.textContent?.trim()); };
    const unlabelled = [...document.querySelectorAll('input:not([type="hidden"]), select, textarea')].filter(element => visible(element) && !name(element)).map(element => `${element.tagName.toLowerCase()}[name=${element.getAttribute('name')}]`);
    const mute = [...document.querySelectorAll('button, a[href]')].filter(element => visible(element) && !(element.textContent?.trim() || element.getAttribute('aria-label') || element.getAttribute('title'))).map(element => element.outerHTML.slice(0, 60));
    const icons = [...document.querySelectorAll('svg.icon')].filter(icon => icon.getAttribute('aria-hidden') !== 'true' && !icon.getAttribute('aria-label')).length;
    const tables = [...document.querySelectorAll('table')].filter(table => !table.querySelector('thead th') && !table.querySelector('caption')).length;
    const spans = [...document.querySelectorAll('.m-btn')].filter(element => element.tagName === 'SPAN' && element.getAttribute('aria-disabled') !== 'true').length;
    return { main: document.querySelectorAll('main').length, h1: document.querySelectorAll('h1').length, nav: Boolean(document.querySelector('nav[aria-label="Manage"]')), skip: document.querySelector('a.visually-hidden[href="#main"]')?.textContent ?? '', lang: document.documentElement.lang, unlabelled, mute, icons, tables, spans, headingJumps: (() => { const levels = [...document.querySelectorAll('h1, h2, h3')].map(node => Number(node.tagName[1])); return levels.some((level, index) => index > 0 && level > levels[index - 1] + 1); })() };
  });
  for (const route of routes) {
    await go(route);
    const facts = await a11y();
    check(`${label} ${route} has one main and h1, the Manage navigation, a skip link, labelled controls, named buttons and links, decorative icons hidden, headed or captioned tables and no heading jumps`, facts.main === 1 && facts.h1 === 1 && facts.nav && facts.skip === 'Skip to content' && facts.lang === 'en' && facts.unlabelled.length === 0 && facts.mute.length === 0 && facts.icons === 0 && facts.tables === 0 && facts.spans === 0 && !facts.headingJumps, JSON.stringify(facts));
  }

  // Keyboard only: the sub-tabs, selecting a repository, the enable panel with its declaration, the confirmation dialog and its way out.
  await settleFuzz(ctx);
  await go('/manage');
  const focusRing = () => page.evaluate(() => { const element = document.activeElement; if (!element || element === document.body) return { el: 'body', ring: false }; const style = getComputedStyle(element); return { el: `${element.tagName.toLowerCase()}:${element.textContent?.trim().slice(0, 24)}`, ring: (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0) || style.boxShadow !== 'none' }; });
  let reachedTabs = false;
  for (let index = 0; index < 80 && !reachedTabs; index++) { await page.keyboard.press('Tab'); reachedTabs = await page.evaluate(() => Boolean(document.activeElement?.closest('.m-tabs'))); }
  const tabFocus = await focusRing();
  check(`${label} Tab reaches the Manage sub-tabs with a visible focus ring`, reachedTabs && tabFocus.ring, JSON.stringify(tabFocus));
  await page.focus('.m-tabs a[href="/manage/repositories"]');
  await Promise.all([page.waitForURL(url => new URL(url).pathname === '/manage/repositories', { timeout: 15_000 }).catch(() => {}), page.keyboard.press('Enter')]);
  check(`${label} Enter on a sub-tab opens it`, new URL(page.url()).pathname === '/manage/repositories', page.url());
  await page.focus('[data-repository-row="parser-guild/grammar-fuzz"] form button');
  const selectFocus = await focusRing();
  await Promise.all([page.waitForLoadState('networkidle'), page.keyboard.press('Enter')]);
  const selected = await page.evaluate(() => ({ role: document.querySelector('.m-msg')?.getAttribute('role'), message: document.querySelector('.m-msg')?.textContent ?? '', state: document.querySelector('[data-repository-row="parser-guild/grammar-fuzz"] .m-st')?.textContent ?? '' }));
  check(`${label} Enter on the focused Select button selects the repository and the confirmation is a status live region`, selectFocus.ring && /Selected/u.test(selected.message) && selected.role === 'status' && selected.state === 'Pending enable', JSON.stringify({ selectFocus, selected }));
  await page.focus('[data-repository-row="parser-guild/grammar-fuzz"] a.m-btn');
  await Promise.all([page.waitForURL(url => /grammar-fuzz$/u.test(new URL(url).pathname), { timeout: 15_000 }).catch(() => {}), page.keyboard.press('Enter')]);
  // The one-writer declaration is asked once per repository; after an earlier declaration the panel offers Enable alone.
  const declaration = await page.$('[data-enable-panel] input[name="writer"]');
  if (declaration) { await declaration.focus(); await page.keyboard.press('Space'); await page.keyboard.press('Tab'); } else await page.focus('[data-enable-panel] form button');
  const enableFocus = await focusRing();
  await Promise.all([page.waitForLoadState('networkidle'), page.keyboard.press('Enter')]);
  const enabled = await page.evaluate(() => ({ message: document.querySelector('.m-msg')?.textContent ?? '', pill: document.querySelector('.a-head .a-scope .m-st')?.textContent ?? '' }));
  check(`${label} the enable panel works from the keyboard: ${declaration ? 'Space declares the writer, Tab reaches Enable' : 'Enable takes focus'} with a ring, Enter enables`, /Enable$/u.test(enableFocus.el) && enableFocus.ring && /Enabled/u.test(enabled.message) && enabled.pill === 'Running', JSON.stringify({ enableFocus, enabled, declaration: Boolean(declaration) }));
  await go('/manage/repositories/parser-guild/grammar-fuzz?confirm=delete');
  const dialog = await page.evaluate(() => { const dialog = document.querySelector('[data-confirm="delete"]'); return { role: dialog?.getAttribute('role'), labelled: Boolean(dialog?.getAttribute('aria-labelledby') && document.getElementById(dialog.getAttribute('aria-labelledby'))), cancel: Boolean(dialog?.querySelector('a.m-btn.ghost')), input: dialog?.querySelector('input[name="confirm"]')?.getAttribute('aria-label') ?? '' }; });
  check(`${label} the typed confirmation is an alertdialog labelled by its heading, with a labelled input and a Cancel link`, dialog.role === 'alertdialog' && dialog.labelled && dialog.cancel && dialog.input.length > 0, JSON.stringify(dialog));
  await page.focus('[data-confirm="delete"] a.m-btn.ghost');
  await Promise.all([page.waitForURL(url => !/confirm=delete/u.test(url.toString()), { timeout: 15_000 }).catch(() => {}), page.keyboard.press('Enter')]);
  check(`${label} Enter on Cancel leaves the dialog without deleting`, !/confirm=delete/u.test(page.url()) && (await page.evaluate(() => document.querySelector('.a-head .a-scope .m-st')?.textContent ?? '')) === 'Running');
  await page.focus('[data-leave] form button');
  await Promise.all([page.waitForLoadState('networkidle'), page.keyboard.press('Enter')]);
  check(`${label} Stop works from the keyboard and leaves the repository stopped`, /Stopped/u.test(await page.evaluate(() => document.querySelector('.m-msg')?.textContent ?? '')));

  // Narrow: the selected 1024 width and the console's own 900 breakpoint, every route, without horizontal overflow.
  for (const width of [1024, 900]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      await go(route);
      const overflow = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, offenders: [...document.querySelectorAll('body *')].filter(element => element.getBoundingClientRect().right > document.documentElement.clientWidth + 1).slice(0, 3).map(element => `${element.tagName.toLowerCase()}.${String(element.className).split(' ')[0]}`) }));
      check(`${label} ${route} at ${width} has no horizontal overflow`, overflow.overflow <= 0, JSON.stringify(overflow));
    }
    await shot(`${label}-manage-${width}`);
  }
  await page.setViewportSize({ width: 1440, height: 900 });

  // A light colour-scheme preference: the App stays dark by decision, with no light token leaking into the console.
  const light = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
  const lightPage = await light.newPage();
  const started = await light.request.get(`${ORIGIN}/auth/start`, { maxRedirects: 0 });
  await lightPage.goto(`${ORIGIN}/auth/callback?state=${new URL(started.headers().location).searchParams.get('state')}&code=${CODE}`);
  await lightPage.waitForURL(url => new URL(url).pathname === '/', { timeout: 15_000 }).catch(() => {});
  const luminance = color => { const match = /rgba?\((\d+),\s*(\d+),\s*(\d+)/u.exec(color); if (!match) return null; const [r, g, b] = match.slice(1).map(Number); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };
  for (const route of ['/manage', '/manage/repositories', '/manage/plan', '/manage/account']) {
    await lightPage.goto(`${ORIGIN}${route}`);
    const seen = await lightPage.evaluate(() => ({ prefers: matchMedia('(prefers-color-scheme: light)').matches, theme: document.documentElement.getAttribute('data-theme'), locked: document.documentElement.hasAttribute('data-theme-locked'), scheme: document.querySelector('meta[name="color-scheme"]')?.getAttribute('content'), bg: getComputedStyle(document.body).backgroundColor, fg: getComputedStyle(document.body).color, card: getComputedStyle(document.querySelector('.m-sec') ?? document.body).backgroundColor, control: document.querySelector('[data-theme-control]')?.getAttribute('aria-disabled') }));
    check(`${label} ${route} stays dark under a light colour-scheme preference: dark theme locked, dark surfaces, light text, inert control`, seen.prefers && seen.theme === 'dark' && seen.locked && seen.scheme === 'dark' && luminance(seen.bg) !== null && luminance(seen.bg) < 0.2 && luminance(seen.fg) > 0.6 && luminance(seen.card) < 0.25 && seen.control === 'true', JSON.stringify(seen));
  }
  await lightPage.screenshot({ path: join(OUT(ctx), `${label}-manage-light-preference.png`), fullPage: true });
  await light.close();

  // Reduced motion: the waiting return strip is still highlighted as live work, but nothing spins or sweeps.
  const calm = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark', reducedMotion: 'reduce' });
  const calmPage = await calm.newPage();
  const calmStart = await calm.request.get(`${ORIGIN}/auth/start`, { maxRedirects: 0 });
  await calmPage.goto(`${ORIGIN}/auth/callback?state=${new URL(calmStart.headers().location).searchParams.get('state')}&code=${CODE}`);
  await calmPage.waitForURL(url => new URL(url).pathname === '/', { timeout: 15_000 }).catch(() => {});
  await calmPage.goto(`${ORIGIN}/manage/depart?to=experience&purpose=change-plan&from=${encodeURIComponent('/manage')}`);
  await calmPage.click('[data-works-stand-in] form:nth-of-type(1) button');
  await calmPage.waitForLoadState('networkidle');
  const calmStrip = await calmPage.evaluate(() => { const strip = document.querySelector('.m-return.wait'); const spinner = strip?.querySelector('.m-spin'); return { strip: Boolean(strip), live: strip?.getAttribute('aria-live'), spin: spinner ? getComputedStyle(spinner).animationName : 'absent', line: strip ? getComputedStyle(strip, '::before').animationName : 'absent', edge: strip ? getComputedStyle(strip).boxShadow !== 'none' : false }; });
  check(`${label} under reduced motion the waiting return strip keeps its edge and live region but nothing animates`, calmStrip.strip && calmStrip.live === 'polite' && calmStrip.spin === 'none' && calmStrip.line === 'none' && calmStrip.edge, JSON.stringify(calmStrip));
  await calmPage.click('.m-return .m-acts form:last-of-type button').catch(() => {});
  await calm.close();
}
const OUT = ctx => ctx.OUT;
