// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * Local browser qualification of the built signed-in App (artifacts/app/dist, or app-staging with DIFFDEVIL_APP_TARGET=staging).
 *
 *   npm run app:build && npm run qa:app
 *
 * Seeds the local D1 state through the managed App's own write paths (every migration,
 * pathless history, named analytical records, size observations, installation accounts),
 * serves a loopback GitHub double for OAuth and reads, runs the built joined Worker through
 * local Wrangler/workerd, and drives headless Chromium through the real journeys: sign-in,
 * the six analytical destinations in a Pro and a Free entitlement, scope and period switches,
 * filters, bucket selection, drill-down into a named file through its opaque locator, the
 * protected analytics route, and sign-out, with keyboard reach, console, overflow and header
 * checks at 1440×900. The chart system of Chart Grammar v1.1 is qualified on every page: every
 * frame mounts, the readout never moves the plot under hover, keyboard and pin, the table view
 * carries the same rows, the cloud packs (in its Worker), arranges, opens its Top column and
 * walks the rank order, the period switch morphs the live charts in place, and reduced motion
 * still draws. `DIFFDEVIL_APP_QA_DENSE=1` adds a pass over a denser fixture and records the
 * cloud's layout timings. Pass --pr-search-detail to qualify the Free search → PR detail return,
 * --business-manage to run the Business Manage browser qualification alone, or --participation to
 * qualify the beta survey journey. Focused modes write a separate results.json under qa/.
 * Results and screenshots go to the selected target's qa/ directory. This proves local
 * behaviour against a fixture; it proves no deployment, no live GitHub and no real data.
 */
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { once } from 'node:events';
import { generateKeyPairSync } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { createFakeGitHub, CODE, ENTITLEMENT_FIXTURE, INSTALLATIONS, LONG_RETAINED_PATHS, pullRequests, setScale } from './fixture.mjs';
import { seedLocalState, executeLocal, recordLocalDelivery } from './seed.mjs';
import { proManage, historyOnlyManage, planChoiceReturn, freeManage, businessManage, delegateManage, setupRecovery, manageAccess, COMMERCIAL_PRO, COMMERCIAL_FREE, COMMERCIAL_BUSINESS } from './manage.mjs';
import { participationJourney, rewardOnlyJourney, nullableReceiverJourney, COMMERCIAL_BETA, COMMERCIAL_REWARD_ONLY, NULLABLE_LINK, NULLABLE_SIGNING_KEY, QA_CAMPAIGN } from './participation.mjs';
import { appBuildTarget } from '../build-target.mjs';
import { admissionJourney, seedAdmissionStore } from './admission.mjs';
import { loadingJourney } from './loading.mjs';
import { scopeUnavailableJourney } from './scope-unavailable.mjs';
import { fileReadJourney } from './file-read.mjs';
import { filesQueryJourney } from './files-query.mjs';
import { seedLoadingScale } from './loading-scale.mjs';

const target = appBuildTarget();
const IDENTITY_ONLY = process.argv.includes('--identity');
const EXPLICIT_READER_ONLY = process.argv.includes('--explicit-reader');
const AUTHORITY_ONLY = process.argv.includes('--authority');
const ADMISSION_ONLY = process.argv.includes('--admission');
const LOADING_ONLY = process.argv.includes('--loading');
const FILES_QUERY_ONLY = process.argv.includes('--files-query');
const LOADING_SCALE = process.env.DIFFDEVIL_APP_QA_LOADING_SCALE === '1';
// Generated specimen material for the local double, never an external App credential.
const admissionKey = ADMISSION_ONLY ? generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({ type: 'pkcs1', format: 'pem' }) : null;
const HISTORY_ONLY = process.argv.includes('--history');
const THUMB_ONLY = process.argv.includes('--thumb');
const PR_SEARCH_DETAIL_ONLY = process.argv.includes('--pr-search-detail');
const PR_CONFIDENCE_ONLY = process.argv.includes('--pr-confidence-state');
const PR_FILES_ONLY = process.argv.includes('--pr-files-table');
const BUSINESS_MANAGE_ONLY = process.argv.includes('--business-manage');
const PARTICIPATION_ONLY = process.argv.includes('--participation');
const OUT = join(target.artifacts, 'qa', ...(EXPLICIT_READER_ONLY ? ['explicit-reader'] : FILES_QUERY_ONLY ? ['files-query'] : LOADING_ONLY ? ['loading'] : ADMISSION_ONLY ? ['admission'] : BUSINESS_MANAGE_ONLY ? ['business-manage'] : PARTICIPATION_ONLY ? ['participation'] : PR_FILES_ONLY ? ['pr-files-table'] : PR_CONFIDENCE_ONLY ? ['pr-confidence-state'] : PR_SEARCH_DETAIL_ONLY ? ['pr-search-detail'] : IDENTITY_ONLY ? ['identity'] : AUTHORITY_ONLY ? ['authority'] : HISTORY_ONLY ? ['history'] : THUMB_ONLY ? ['thumb'] : []));
const APP_PORT = Number(process.env.DIFFDEVIL_APP_QA_PORT ?? (target.name === 'staging' ? 4512 : 4412));
const GITHUB_PORT = Number(process.env.DIFFDEVIL_APP_QA_GITHUB_PORT ?? (target.name === 'staging' ? 4533 : 4433));
// Chromium accepts Secure (__Host-) cookies from http://localhost, not from a loopback IP, so the browser origin is localhost; the Worker still binds 127.0.0.1.
const ORIGIN = `http://localhost:${APP_PORT}`;
const PROBE = `http://127.0.0.1:${APP_PORT}`;
const CONFIG = join(target.artifacts, 'dist/server/wrangler.json');
const DENSE = process.env.DIFFDEVIL_APP_QA_DENSE === '1';
const STATE = join(target.artifacts, EXPLICIT_READER_ONLY ? 'state-explicit-reader' : BUSINESS_MANAGE_ONLY ? 'state-business-manage' : 'state');
const DENSE_STATE = join(target.artifacts, 'state-dense');
const chartTelemetry = [];

if (!existsSync(CONFIG)) { console.error('Build the App first: npm run app:build'); process.exit(2); }
// The build records which edition it is (tools/app-command.mjs). The Community journeys always run; the premium journeys run only
// against a build that joined the premium extension, and a Community build asserts the truthful absent states instead.
const EDITION = join(target.artifacts, 'edition.json');
if (!existsSync(EDITION)) { console.error('The build carries no edition record; rebuild with npm run app:build.'); process.exit(2); }
const edition = JSON.parse(readFileSync(EDITION, 'utf8'));
const premium = edition.premium && edition.qa ? (await import(pathToFileURL(resolve(edition.qa)).href)).default : null;
console.log(`Qualifying the ${premium ? 'premium-joined' : edition.premium ? 'extension-boundary fixture' : 'Community'} build (${edition.reason}).`);
// A local variables file copied into the build output would silently override the pass's --var flags.
for (const stale of [join(dirname(resolve('apps/app', target.configPath)), '.dev.vars'), join(target.artifacts, 'dist/server/.dev.vars')]) if (existsSync(stale)) { console.error(`Refusing to run with a local variables file in place: ${stale}`); process.exit(2); }
// The dense pass seeds a four-times larger fixture through the real engine, which takes its own minutes.
// The complete Community journey includes repeated Worker restarts and a final clean-seed return.
// A 15-minute run reached that final seed but expired before its last consumer could run.
const MINUTES = DENSE ? 40 : 30;
const deadline = setTimeout(() => { console.error(`QA exceeded its ${MINUTES}-minute deadline.`); process.exit(3); }, MINUTES * 60_000);
deadline.unref();
await mkdir(OUT, { recursive: true });

const results = [], failures = [];
const check = (name, condition, detail = '') => { results.push({ name, ok: Boolean(condition), detail }); if (!condition) failures.push(`${name}${detail ? ` — ${detail}` : ''}`); console.log(`${condition ? '✓' : '✗'} ${name}${condition ? '' : ` — ${detail}`}`); };

// Refuse another actor's listener before seeding D1 or starting any owned server/browser.
await freePort(APP_PORT);

// ── the GitHub double, over HTTP so workerd can reach it ──
let github = createFakeGitHub();
const githubServer = createServer(async (request, response) => {
  const chunks = []; for await (const chunk of request) chunks.push(chunk);
  const body = Buffer.concat(chunks);
  const answer = await github.fetch(new URL(request.url, `http://127.0.0.1:${GITHUB_PORT}`), { method: request.method, headers: request.headers, body: body.length ? body.toString() : undefined });
  response.writeHead(answer.status, Object.fromEntries(answer.headers));
  response.end(Buffer.from(await answer.arrayBuffer()));
});
githubServer.listen(GITHUB_PORT, '127.0.0.1'); await once(githubServer, 'listening');

const seeded = await seedLocalState(STATE, ADMISSION_ONLY ? { seed: seedAdmissionStore } : LOADING_SCALE ? { seed: (store, clock) => seedLoadingScale(store, clock, { now: new Date().toISOString() }) } : undefined);
console.log(`Seeded ${seeded.written.written} analyses, ${seeded.written.retained} analytical records and ${seeded.written.observations} size observations into local D1 state.`);
if (LOADING_SCALE) console.log(`Anonymous measured-scale cohort: ${JSON.stringify(seeded.written.loadingScale)}`);

/** Local Worker variables as --var flags: fixture values only, never real credentials. `commercial` is the loopback Works stand-in's spec. */
function workerVars(entitlement, { commercial, allowances, participation, signingKey } = {}) {
  const vars = { APP_ORIGIN: ORIGIN, GITHUB_API_BASE: `http://127.0.0.1:${GITHUB_PORT}`, GITHUB_OAUTH_BASE: `http://127.0.0.1:${GITHUB_PORT}`, GITHUB_OAUTH_CLIENT_ID: 'fixture-client', GITHUB_OAUTH_CLIENT_SECRET: 'fixture-secret-private', APP_SEAL_KEY: 'fixture-seal-key-with-enough-length', APP_SESSION_DAYS: '30', GITHUB_WEBHOOK_SECRET: 'fixture-webhook-secret',
    ...(admissionKey ? { GITHUB_APP_ID: '1', GITHUB_APP_PRIVATE_KEY: admissionKey } : {}),
    ...(target.name === 'staging' ? { APP_STAGING_INSTALLATION_ACCOUNT_IDS: JSON.stringify(INSTALLATIONS.map(value => value.account.id)) } : {}),
    ...(entitlement ? { APP_ENTITLEMENT_FIXTURE: JSON.stringify(entitlement) } : {}), ...(commercial ? { APP_COMMERCIAL_FIXTURE: JSON.stringify(commercial) } : {}), ...(allowances ? { APP_PLAN_ALLOWANCES: JSON.stringify(allowances) } : {}), ...(participation ? { APP_PARTICIPATION_CAMPAIGN: JSON.stringify(participation) } : {}), ...(signingKey ? { WIRT_SIGNING_KEY_CURRENT: signingKey, WIRT_LINK_CONTINUATION_URL: 'https://app.example.test/manage/plan' } : {}) };
  return Object.entries(vars).flatMap(([key, value]) => ['--var', `${key}:${value}`]);
}

let worker, workerLog = '';
async function startWorker(entitlement, state = STATE, extra = {}) {
  workerLog += `
──── pass ${entitlement ? 'with entitlement fixture' : 'without entitlement'} ────
`;
  await freePort(APP_PORT);
  worker = spawn(process.execPath, [resolve('tools/run-wrangler.mjs'), 'dev', '--config', CONFIG, '--local', '--persist-to', state, '--ip', '127.0.0.1', '--port', String(APP_PORT), '--show-interactive-dev-session=false', ...workerVars(entitlement, extra)], { cwd: resolve('.'), stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, env: { ...process.env, WRANGLER_SEND_METRICS: 'false', CI: '1' } });
  worker.stdout.on('data', chunk => { workerLog += chunk; });
  worker.stderr.on('data', chunk => { workerLog += chunk; });
  let last = '';
  for (let attempt = 0; attempt < 180; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 500));
    try { const response = await fetch(`${PROBE}/health/ready`); last = `${response.status} ${await response.text()}`; if (response.ok) { console.log(`Worker ready on ${ORIGIN}.`); return; } } catch (error) { last = String(error?.cause ?? error); }
    if (worker.exitCode !== null) break;
  }
  throw new Error(`The local Worker did not become ready: ${last}
${workerLog.slice(-4000)}`);
}
/** Observe the App port; an existing listener is never evidence that this pass owns it. */
function listenersOn(port) {
  if (process.platform !== 'win32') { const out = spawnSync('lsof', ['-ti', `tcp:${port}`, '-sTCP:LISTEN'], { encoding: 'utf8' }).stdout ?? ''; return [...new Set(out.split(/\s+/u).filter(Boolean))]; }
  const out = spawnSync('netstat', ['-ano'], { encoding: 'utf8', windowsHide: true }).stdout ?? '';
  return [...new Set(out.split(/\r?\n/u).filter(line => line.includes(`:${port} `) && /LISTENING/u.test(line)).map(line => line.trim().split(/\s+/u).at(-1)))];
}
function killTree(pid) {
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
  else { try { process.kill(Number(pid), 'SIGKILL'); } catch { /* already gone */ } }
}
async function freePort(port) {
  let pids = [];
  for (let attempt = 0; attempt < 30; attempt++) {
    pids = listenersOn(port);
    if (pids.length === 0) return;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error(`Port ${port} is still held by PID(s) ${pids.join(', ')}; choose a different DIFFDEVIL_APP_QA_PORT or stop the listener only if you own it.`);
}
async function stopWorker() {
  if (worker && worker.exitCode === null) {
    const exited = once(worker, 'exit');
    killTree(worker.pid);
    await Promise.race([exited, new Promise(resolve => setTimeout(resolve, 8000))]);
  }
  // The next pass must not be answered by a survivor.
  await freePort(APP_PORT);
}
/** Reset only this pass's disposable D1 fixture after its Worker has stopped. */
function reseedState(label) {
  // A fresh process avoids reusing the disposed Miniflare seed runtime.
  const seeded = spawnSync(process.execPath, [resolve('apps/app/qa/seed.mjs'), STATE], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  if (seeded.status !== 0) throw new Error(`${label} seeding failed:\n${seeded.stdout}\n${seeded.stderr}`);
  console.log(`Re-seeded ${label} fixture: ${seeded.stdout.trim().split(/\r?\n/u).at(-1)}`);
}
async function releaseBusinessHistoryJob() {
  await stopWorker();
  const releasedAt = new Date().toISOString();
  executeLocal(`UPDATE history_jobs SET state='complete', lease_until=NULL, updated_at='${releasedAt}', finished_at='${releasedAt}' WHERE job_id='qa-business-publication-history' AND state='running'`, STATE);
  const state = executeLocal("SELECT state FROM history_jobs WHERE job_id='qa-business-publication-history'", STATE);
  if (!state.includes('complete')) throw new Error('The seeded Business history job did not reach complete.');
  await startWorker(undefined, STATE, { commercial: COMMERCIAL_BUSINESS });
  await signIn();
}

async function holdBusinessHistoryJob() {
  await stopWorker();
  const requestedAt = new Date().toISOString();
  // Create the active owner only after revision 1 has applied; it holds revision 2's publication below.
  executeLocal(`INSERT INTO history_jobs (job_id, repository_id, installation_id, kind, state, sequence, requested_by, requested_at, updated_at, lease_until) VALUES ('qa-business-publication-history', 1001, 10, 'import', 'running', 0, 123, '${requestedAt}', '${requestedAt}', '2099-01-01T00:00:00.000Z')`, STATE);
  const state = executeLocal("SELECT state FROM history_jobs WHERE job_id='qa-business-publication-history'", STATE);
  if (!state.includes('running')) throw new Error('The seeded Business history job did not reach running.');
  await startWorker(undefined, STATE, { commercial: COMMERCIAL_BUSINESS });
  await signIn();
}

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
const consoleErrors = [], pageErrors = [], external = [];
let expectPrEnrichmentFailure = false;
context.on('page', page => {
  // A deliberately requested 404 (the refused repository or handle) is not a console error worth failing on.
  page.on('console', message => {
    const expectedPrFailure = expectPrEnrichmentFailure && /status of 503/u.test(message.text())
      && new URL(message.location().url || page.url(), ORIGIN).pathname === '/pr/parser-guild/parser-lab/452';
    if (message.type() === 'error' && !expectedPrFailure && !((LOADING_ONLY || FILES_QUERY_ONLY) && /status of 503/u.test(message.text())) && !(/status of 404/u.test(message.text()) && /\/pr\/someone\/else\/|\/file\/.*\/(?:not-a-locator|a{22})(?:\?|$)/u.test(page.url()))) consoleErrors.push(`${page.url()} ${message.text()}`);
  });
  page.on('pageerror', error => pageErrors.push(`${page.url()} ${error.message}`));
  page.on('request', request => { const url = new URL(request.url()); if (!['127.0.0.1', 'localhost'].includes(url.hostname)) external.push(request.url()); });
});
const page = await context.newPage();
const go = async (path, options = {}) => {
  const response = await page.goto(/^https?:/u.test(path) ? path : `${ORIGIN}${path}`, { waitUntil: 'networkidle', ...options });
  // These existing journeys inspect the populated document. The loading journey uses page.goto
  // directly when it deliberately needs the earlier shell or an unresolved acquisition.
  await page.waitForFunction(() => !document.querySelector('[data-analytical-loading], [data-notifications-pending]'), null, { timeout: 25_000 });
  return response;
};
const shot = name => page.screenshot({ path: join(OUT, `${name}.png`), fullPage: true });
const ctx = { check, go, page, shot, ORIGIN, OUT, settled, qualifyFrame, qualifyCloud, premium: Boolean(premium), joined: edition.premium, signIn: () => signIn(), holdBusinessHistoryJob, releaseBusinessHistoryJob };
const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const offenders = () => page.evaluate(() => { const width = document.documentElement.clientWidth; return [...document.querySelectorAll('body *')].filter(element => element.getBoundingClientRect().right > width + 1).slice(0, 4).map(element => `${element.tagName.toLowerCase()}.${String(element.className).split(' ')[0]}@${Math.round(element.getBoundingClientRect().right)}`).join(', '); });
const pageFacts = () => page.evaluate(() => ({
  h1: document.querySelectorAll('h1').length, label: document.querySelector('[data-surface-label]')?.textContent ?? '', trailing: document.querySelector('.trailing-action')?.getAttribute('aria-current') ?? '',
  trailingText: document.querySelector('.trailing-action')?.textContent?.trim() ?? '', headerHeight: Math.round(document.querySelector('.site-header')?.getBoundingClientRect().height ?? 0),
  frameLeft: Math.round(document.querySelector('.a-frame')?.getBoundingClientRect().left ?? -1), headerLeft: Math.round(document.querySelector('.site-header .wrap')?.getBoundingClientRect().left ?? -1),
  charts: document.querySelectorAll('[data-chart]').length, mounted: document.querySelectorAll('[data-chart].is-mounted').length, failed: document.querySelectorAll('[data-chart].is-failed').length, drawing: document.body.classList.contains('is-drawing'), unavailable: document.querySelectorAll('.a-unavail').length, nan: /NaN|undefined|\[object/u.test(document.body.innerText),
  theme: document.documentElement.getAttribute('data-theme'), font: getComputedStyle(document.body).fontFamily
}));

/** Wait until every chart frame on the page has mounted (or failed) and the page line has gone. */
async function settled(timeout = 25_000) {
  await page.waitForFunction(() => !document.querySelector('[data-analytical-loading], [data-notifications-pending], [data-premium-region][data-pending]') && [...document.querySelectorAll('[data-chart]')].every(host => host.classList.contains('is-mounted') || host.classList.contains('is-failed')) && !document.body.classList.contains('is-drawing') && !document.querySelector('.cl.is-busy'), null, { timeout });
  await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 150)));
}

async function qualifyAllRepositoriesSearchDetail(returnUrl, originalFacts) {
  await go('/prs?per=90d');
  await settled();
  await page.fill('.a-search input', '452');
  await page.press('.a-search input', 'Enter');
  await page.waitForLoadState('networkidle');
  const searchedHref = await page.locator('.a-prs2 .a-pr').first().getAttribute('href');
  const searchedLink = searchedHref ? new URL(searchedHref, ORIGIN) : null;
  check('all-repositories search keeps its query on the matching PR detail link without inventing a scope parameter', searchedLink?.pathname === '/pr/parser-guild/parser-lab/452' && searchedLink.searchParams.get('q') === '452' && searchedLink.searchParams.get('s') === null, String(searchedHref));
  if (!searchedHref) return;

  const searchedDetailResponse = await go(searchedHref);
  const searchedDetail = await page.evaluate(() => ({ params: Object.fromEntries(new URLSearchParams(location.search)), result: document.querySelector('.a-result .big .n')?.textContent ?? '', unavailable: document.body.innerText.includes('The analytical read did not answer.') }));
  check('opening a searched retained PR reads detail from the repository in its route and keeps the search for return', searchedDetailResponse.status() === 200 && searchedDetail.result !== '' && !searchedDetail.unavailable && searchedDetail.params.q === '452' && searchedDetail.params.s === undefined, JSON.stringify(searchedDetail));
  const restoreUrl = returnUrl ?? searchedHref;
  const restoreFacts = originalFacts ?? await page.evaluate(() => ({ result: document.querySelector('.a-result .big .n')?.textContent ?? '', lanes: document.querySelectorAll('.lane').length, files: document.querySelectorAll('#h-pf ~ * table tbody tr, .a-tbl tbody tr').length }));

  await page.locator('.a-head nav.crumb').getByRole('link', { name: 'Pull requests', exact: true }).click();
  await page.waitForLoadState('networkidle');
  const returnedSearch = new URL(page.url());
  check('returning from PR detail restores the all-repositories search and its query', returnedSearch.pathname === '/prs' && returnedSearch.searchParams.get('q') === '452' && returnedSearch.searchParams.get('per') === '90d' && returnedSearch.searchParams.get('s') === null && await page.locator('.a-search input').inputValue() === '452');

  const directResponse = await go('/pr/parser-guild/parser-lab/452?per=90d');
  const directDetail = await page.evaluate(() => ({ result: document.querySelector('.a-result .big .n')?.textContent ?? '', unavailable: document.body.innerText.includes('The analytical read did not answer.') }));
  check('the ordinary direct PR detail route returns the same retained result as search-to-detail', directResponse.status() === 200 && directDetail.result === searchedDetail.result && !directDetail.unavailable, JSON.stringify(directDetail));
  const hasPremiumRegions = await page.locator('[data-premium-region="pr-context"]').count() > 0;

  const noHistoryResponse = await go('/pr/parser-guild/parser-lab/999999?per=90d');
  const noHistoryText = await page.locator('.a-pn-b').innerText();
  check('a completed empty analytical read says no retained analysis', noHistoryResponse.status() === 200 && /No retained analysis/u.test(noHistoryText) && !/cannot confirm/u.test(noHistoryText), noHistoryText);
  await settled();

  // This malformed row makes the repository's analytical service read fail; pathless PR452 history remains readable.
  executeLocal("INSERT INTO analytical_pull_requests(repository_id, pull_request, updated_at, expires_at, record_json) VALUES (1001, 999999, '2026-10-15T00:00:00.000Z', NULL, 'not-json')", STATE);
  expectPrEnrichmentFailure = hasPremiumRegions;
  try {
    const failedEnrichment = hasPremiumRegions ? page.waitForResponse(response => new URL(response.url()).pathname === '/pr/parser-guild/parser-lab/452'
      && response.request().headers()['x-diffdevil-render'] === 'enrichment' && response.status() === 503) : null;
    // Failed enrichment is local state, not a requirement for network silence before the common view is useful.
    const [unavailableResponse] = await Promise.all([
      go('/pr/parser-guild/parser-lab/452?per=90d', { waitUntil: 'domcontentloaded' }), failedEnrichment
    ]);
    const unavailableFacts = await page.evaluate(() => ({ text: document.body.innerText, changed: document.querySelector('.a-result .big .n')?.textContent ?? '' }));
    check('an unanswered retained read is explicit while the older pathless PR detail remains available', unavailableResponse.status() === 200 && unavailableFacts.changed !== '' && /retained read unanswered · showing pathless history/u.test(unavailableFacts.text) && /The retained analytical read did not answer/u.test(unavailableFacts.text) && /cannot confirm this pull request’s lifecycle or final merged comparison/u.test(unavailableFacts.text) && !/lifecycle not retained for this repository/u.test(unavailableFacts.text), JSON.stringify({ changed: unavailableFacts.changed, text: unavailableFacts.text.replace(/\s+/gu, ' ').slice(0, 500) }));
    if (hasPremiumRegions) {
      const retry = page.locator('[data-premium-retry]:visible').first();
      await retry.waitFor();
      check('a failed PR enrichment leaves the pathless result, files and navigation usable with local retry',
        await page.locator('[data-premium-region][data-pending="failed"]').count() === 3
        && await page.locator('.pr-files tbody tr').count() > 0 && await page.locator('[data-nav]').count() === 1
        && /unavailable, not zero/u.test(await page.locator('[data-region-status]').first().innerText()));
      await shot('pr-retained-read-unavailable');
      await page.locator('.a-frame').evaluate(node => { window.__prFallbackFrame = node; });
      executeLocal('DELETE FROM analytical_pull_requests WHERE repository_id=1001 AND pull_request=999999', STATE);
      await retry.focus(); await page.keyboard.press('Enter');
      await settled();
      check('keyboard Retry recovers PR enrichment without replacing the common fallback or navigation',
        await page.locator('.a-frame').evaluate(node => node === window.__prFallbackFrame)
        && await page.locator('.a-result .big .n').innerText() === unavailableFacts.changed
        && await page.locator('.pr-files a[href^="/file/"]').count() > 0 && await page.locator('[data-nav]').count() === 1);
    }
  } finally {
    expectPrEnrichmentFailure = false;
    executeLocal('DELETE FROM analytical_pull_requests WHERE repository_id=1001 AND pull_request=999999', STATE);
  }

  const restoredResponse = await go(restoreUrl);
  const restoredFacts = await page.evaluate(() => ({ result: document.querySelector('.a-result .big .n')?.textContent ?? '', lanes: document.querySelectorAll('.lane').length, files: document.querySelectorAll('#h-pf ~ * table tbody tr, .a-tbl tbody tr').length }));
  const restoredUrl = new URL(page.url());
  const expectedUrl = new URL(restoreUrl, ORIGIN);
  check('the all-repositories journey restores the original PR page before its existing consumer runs', restoredResponse.status() === 200 && restoredUrl.pathname + restoredUrl.search === expectedUrl.pathname + expectedUrl.search && restoredFacts.result === restoreFacts.result && restoredFacts.lanes === restoreFacts.lanes && restoredFacts.files === restoreFacts.files, JSON.stringify({ restoredUrl: page.url(), restoredFacts, restoreFacts }));
}
const geometry = selector => page.evaluate(selector => { const host = document.querySelector(selector); if (!host) return null; const readout = host.querySelector('[data-readout]'), plot = host.querySelector('[data-plot]'); return { readout: Math.round(readout.getBoundingClientRect().height), plotTop: Math.round(plot.getBoundingClientRect().top + window.scrollY), plotHeight: Math.round(plot.getBoundingClientRect().height), when: readout.querySelector('.fr-when b')?.textContent ?? '', vals: readout.querySelectorAll('.fr-vals dd').length, overflowing: readout.scrollWidth > readout.clientWidth + 1 }; }, selector);
async function thumbPosition(selector, view) {
  await page.waitForFunction(({ selector, view }) => {
    const segment = document.querySelector(`${selector} .fr-view`), thumb = segment?.querySelector('.seg-thumb'), selected = segment?.querySelector('[aria-pressed="true"]');
    if (!thumb || !selected || selected.dataset.view !== view) return false;
    const thumbRect = thumb.getBoundingClientRect(), selectedRect = selected.getBoundingClientRect();
    return Math.abs(thumbRect.left - selectedRect.left) < 1 && Math.abs(thumbRect.width - selectedRect.width) < 1;
  }, { selector, view }, { timeout: 1500 }).catch(() => {});
  return page.evaluate(({ selector, view }) => {
    const segment = document.querySelector(`${selector} .fr-view`), thumb = segment?.querySelector('.seg-thumb'), selected = segment?.querySelector('[aria-pressed="true"]');
    if (!thumb || !selected) return null;
    const thumbRect = thumb.getBoundingClientRect(), selectedRect = selected.getBoundingClientRect();
    return { aligned: selected.dataset.view === view && Math.abs(thumbRect.left - selectedRect.left) < 1 && Math.abs(thumbRect.width - selectedRect.width) < 1,
      selected: selected.dataset.view, leftDelta: Math.round((thumbRect.left - selectedRect.left) * 100) / 100, widthDelta: Math.round((thumbRect.width - selectedRect.width) * 100) / 100 };
  }, { selector, view });
}

/** The F1 contract on one frame: the readout stays 66 px and the plot never moves under keyboard focus, pin and clear; the table view carries rows; the live region speaks on keyboard moves. */
async function qualifyDetailRefusals() {
  const badHandle = await go('/file/parser-guild/parser-lab/not-a-locator');
  const badHandleFacts = { status: badHandle.status(), responseUrl: badHandle.url(), pageUrl: page.url(), headings: await page.locator('h1').allTextContents() };
  check('a malformed file handle is refused with 404', badHandleFacts.status === 404, JSON.stringify(badHandleFacts));
  const deniedRead = page.waitForResponse(response => new URL(response.url()).pathname === '/pr/someone/else/1' && response.request().headers()['x-diffdevil-render'] === 'page');
  const denied = await go('/pr/someone/else/1');
  check('a generic shell carries no foreign data and the authorised detail read refuses an inaccessible repository with 404', denied.status() === 200 && (await deniedRead).status() === 404 && await page.locator('.a-result').count() === 0 && (await page.evaluate(() => /Not in your repositories/u.test(document.body.innerText))));
}

async function qualifyFrame(label, selector) {
  const before = await geometry(selector);
  if (!before) { check(`${label}: frame ${selector} exists`, false); return; }
  await page.focus(`${selector} [data-plot]`);
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowLeft');
  const hovered = await geometry(selector);
  const announced = await page.evaluate(selector => document.querySelector(`${selector} [data-announce]`)?.textContent ?? '', selector);
  await page.keyboard.press('Enter');
  const pinned = await geometry(selector);
  const pin = await page.evaluate(selector => ({ icon: Boolean(document.querySelector(`${selector} .fr-pin`)), drill: document.querySelector(`${selector} .fr-drill`)?.getAttribute('href') ?? null }), selector);
  await page.keyboard.press('Escape');
  const cleared = await geometry(selector);
  const kind = await page.evaluate(selector => document.querySelector(selector)?.dataset.chart, selector);
  const kept = await page.evaluate(selector => document.querySelector(selector)?.dataset.keepSel === 'true', selector);
  check(`${label}: ${kind} readout is 66 px and never wraps under focus and pin`, [before, hovered, pinned, cleared].every(state => state.readout === 66 && !state.overflowing), JSON.stringify({ before, hovered, pinned, cleared }));
  check(`${label}: ${kind} plot never moves under hover, keyboard focus, pin or clear`, new Set([before, hovered, pinned, cleared].map(state => `${state.plotTop}/${state.plotHeight}`)).size === 1, JSON.stringify({ before, hovered, pinned, cleared }));
  check(`${label}: ${kind} keyboard focus changes the readout and is announced`, hovered.when !== before.when && announced.length > 0 && hovered.vals > 0, JSON.stringify({ before: before.when, hovered: hovered.when, announced: announced.slice(0, 80) }));
  check(`${label}: ${kind} Enter pins (pin icon${kept ? '' : ', clear'}) and Escape ${kept ? 'keeps the kept selection' : 'clears it'}`, pin.icon && (kept ? cleared.when === pinned.when : cleared.when === before.when), JSON.stringify({ pin, pinned: pinned.when, cleared: cleared.when, kept }));
  await page.click(`${selector} [data-view="table"]`);
  const table = await page.evaluate(selector => { const host = document.querySelector(selector); const table = host.querySelector('[data-table]'); return { hidden: table.hidden, rows: table.querySelectorAll('tbody tr').length, caption: table.querySelector('caption')?.textContent ?? '', plotHidden: getComputedStyle(host.querySelector('[data-plot]')).display === 'none' }; }, selector);
  check(`${label}: ${kind} table view shows the equivalent rows (${table.rows}) with a caption`, !table.hidden && table.rows > 0 && table.caption.length > 0 && table.plotHidden, JSON.stringify(table));
  const tableThumb = await thumbPosition(selector, 'table');
  check(`${label}: ${kind} selection thumb follows the chosen table view`, tableThumb?.aligned && tableThumb.selected === 'table', JSON.stringify(tableThumb));
  await page.click(`${selector} [data-view="chart"]`);
  const chartThumb = await thumbPosition(selector, 'chart');
  check(`${label}: ${kind} selection thumb follows the chosen chart view`, chartThumb?.aligned && chartThumb.selected === 'chart', JSON.stringify(chartThumb));
  return { pin };
}

/** The cloud: words packed (in the Worker where available), partners on focus, Top column, arrangement, metric switch, keyboard walk and list view. */
async function qualifyCloud(label, selector) {
  const words = () => page.evaluate(selector => document.querySelectorAll(`${selector} .cl-words .cl-w`).length, selector);
  const placed = await words();
  const timings = await page.evaluate(() => window.__diffdevilCharts?.cloud() ?? []);
  check(`${label}: the cloud draws its words (${placed}) and records a layout route`, placed > 0 && timings.length > 0, JSON.stringify({ placed, timings }));
  // The Worker measured each label with its own copy of the fonts; the page draws it with the document's. Their widths must agree, or the collision boxes would lie.
  const parity = await page.evaluate(selector => { const host = document.querySelector(selector); const placed = host.__live?.lastPlaced ?? []; const drift = []; for (const word of placed) { const node = host.querySelector(`.cl-w[data-key="${CSS.escape(word.key)}"]`); if (!node) continue; const name = node.querySelector('.nmb').getComputedTextLength(), dir = word.dir ? node.querySelector('.dir').getComputedTextLength() : 0; const delta = Math.abs(name - word.nw) + (word.dir ? Math.abs(dir + word.size * 0.14 - word.dw) : 0); if (delta > Math.max(1.5, word.size * 0.04)) drift.push(`${word.key}: page ${Math.round(name + dir)} vs worker ${Math.round(word.w)}`); } return { placed: placed.length, drift }; }, selector);
  check(`${label}: the Worker's label measurements match the drawn words (${parity.placed} compared)`, parity.placed > 0 && parity.drift.length === 0, JSON.stringify(parity).slice(0, 400));
  // Glyph bodies (the x-height band of each name) never overlap; d3-cloud packs pixel-tight, so font boxes may touch.
  const overlap = await page.evaluate(selector => { const boxes = [...document.querySelectorAll(`${selector} .cl-words .cl-w`)].filter(node => node.style.opacity !== '0').flatMap(node => [...node.querySelectorAll('.nmb, .dir')].filter(span => span.textContent).map(span => { const rect = span.getBoundingClientRect(); return { key: node.dataset.key, left: rect.left + 1, right: rect.right - 1, top: rect.top + rect.height * 0.42, bottom: rect.bottom - rect.height * 0.22 }; })); const pairs = new Set(); for (let a = 0; a < boxes.length; a++) for (let b = a + 1; b < boxes.length; b++) { const x = boxes[a], y = boxes[b]; if (x.key !== y.key && x.left < y.right && y.left < x.right && x.top < y.bottom && y.top < x.bottom) pairs.add(`${x.key} × ${y.key}`); } return { words: boxes.length, pairs: [...pairs] }; }, selector);
  check(`${label}: no two words' glyph bodies overlap`, overlap.pairs.length === 0, JSON.stringify(overlap).slice(0, 400));
  chartTelemetry.push({ label, page: page.url(), cloud: timings, words: placed });

  // Rank is not a relationship guarantee: a valid single-file spine may be
  // first in the cloud. Walk the displayed words and choose by the served
  // interaction result instead of assuming ArrowRight reaches a partner.
  await page.focus(`${selector} .cl-stage`);
  await page.keyboard.press('Escape');
  const candidates = await page.evaluate(selector => [...document.querySelectorAll(`${selector} .cl-words .cl-w`)].map(word => word.dataset.key).filter(Boolean), selector);
  const observations = [];
  for (let index = 0; index < candidates.length; index++) {
    await page.keyboard.press('ArrowRight');
    const current = await page.evaluate(selector => {
      const host = document.querySelector(selector);
      const focus = host?.querySelector('.cl-w.is-focus');
      const partners = [...(host?.querySelectorAll('.cl-w.is-partner') ?? [])];
      const model = JSON.parse(host?.querySelector('[data-chart-model]')?.textContent ?? 'null');
      const renderedKeys = new Set([...host?.querySelectorAll('.cl-words .cl-w') ?? []].map(word => word.dataset.key).filter(Boolean));
      const expected = model?.rows?.find(row => row.key === focus?.dataset.key)?.partners ?? [];
      return {
        focusKey: focus?.dataset.key ?? null,
        partnerKeys: partners.map(word => word.dataset.key).filter(Boolean).sort(),
        expectedMeters: expected.filter(partner => renderedKeys.has(partner.key)).map(partner => ({
          key: partner.key,
          ratio: `${partner.together}/${partner.subjectPullRequests}`,
          share: Math.max(0.04, partner.together / partner.subjectPullRequests)
        })).sort((a, b) => a.key.localeCompare(b.key)),
        meters: partners.map(word => {
          const group = word.querySelector('.co');
          const transform = group?.querySelector('.mt')?.style.transform.match(/^scaleX\((\d+(?:\.\d+)?)\)$/u);
          return {
            key: word.dataset.key,
            ratio: group?.textContent?.trim() ?? '',
            share: transform ? Number(transform[1]) : null
          };
        }).sort((a, b) => a.key.localeCompare(b.key)),
        chips: partners.filter(word => word.querySelector('.co')?.style.display === 'inline').length
      };
    }, selector);
    observations.push(current);
    if (observations.some(observation => observation.partnerKeys.length > 0)
      && observations.some(observation => observation.focusKey && observation.partnerKeys.length === 0)) break;
  }
  const positive = observations.find(observation => observation.partnerKeys.length > 0);
  const empty = observations.find(observation => observation.focusKey && observation.partnerKeys.length === 0);
  const expectedMetersMatch = Boolean(positive && positive.expectedMeters.length > 0
    && positive.expectedMeters.length === positive.partnerKeys.length
    && positive.meters.length === positive.expectedMeters.length
    && positive.meters.every((meter, index) => {
      const expected = positive.expectedMeters[index];
      return meter.key === expected.key
        && meter.ratio.replace(/\s+/gu, '') === expected.ratio
        && typeof meter.share === 'number'
        && Math.abs(meter.share - expected.share) < 0.0005;
    }));
  check(`${label}: fixture exposes a displayed file with co-change partners`, Boolean(positive), `displayed=${candidates.length} focus=${observations.map(item => item.focusKey ?? 'none').join(', ')}`);
  check(`${label}: partner selection matches the served companion keys and meter ratios`, Boolean(positive && positive.partnerKeys.length > 0 && positive.chips === positive.partnerKeys.length && expectedMetersMatch), JSON.stringify(positive ?? { displayed: candidates.length, observations }));
  check(`${label}: a single-file selection shows no fabricated companions or meter chips`, Boolean(empty && empty.partnerKeys.length === 0 && empty.meters.length === 0 && empty.chips === 0), JSON.stringify(empty ?? { displayed: candidates.length, observations }));

  await page.keyboard.press('Escape');
  const summaryBefore = await page.evaluate(selector => document.querySelector(`${selector} [data-readout]`)?.textContent ?? '', selector);
  await page.focus(`${selector} .cl-stage`);
  const positiveIndex = observations.findIndex(observation => observation.focusKey === positive?.focusKey);
  await page.keyboard.press('Home');
  for (let index = 0; index < positiveIndex; index++) await page.keyboard.press('ArrowRight');
  const keyed = await page.evaluate(selector => { const host = document.querySelector(selector); return { focusKey: host.querySelector('.cl-w.is-focus')?.dataset.key ?? null, ring: Boolean(host.querySelector('.cl-ring.on')), focus: host.querySelectorAll('.cl-w.is-focus').length, partners: host.querySelectorAll('.cl-w.is-partner').length, chips: [...host.querySelectorAll('.cl-w.is-partner .co')].filter(chip => chip.style.display === 'inline').length, readout: host.querySelector('[data-readout]')?.textContent ?? '', height: Math.round(host.querySelector('[data-readout]').getBoundingClientRect().height), announced: host.querySelector('[data-announce]')?.textContent ?? '' }; }, selector);
  check(`${label}: the keyboard walks the cloud with a focus ring, a docked readout at 66 px and an announcement`, keyed.ring && keyed.focus === 1 && keyed.height === 66 && keyed.readout !== summaryBefore && keyed.announced.length > 0, JSON.stringify({ ...keyed, readout: keyed.readout.slice(0, 80), announced: keyed.announced.slice(0, 60) }));
  check(`${label}: keyboard focuses the selected positive specimen and lights its exact companions`, keyed.focusKey === positive?.focusKey && keyed.partners === positive?.partnerKeys.length && keyed.chips === keyed.partners, JSON.stringify({ expectedFocus: positive?.focusKey, ...keyed, readout: keyed.readout.slice(0, 100), announced: keyed.announced.slice(0, 80) }));
  await page.keyboard.press('Escape');
  await page.click(`${selector} [data-top]`);
  // Cloud packing can finish before the drawer's 360 ms CSS transition. Sample
  // the settled visible column rather than racing that independent animation.
  await page.waitForFunction(selector => {
    const host = document.querySelector(selector), cloud = host?.querySelector('.cl');
    return cloud?.classList.contains('drawer-on') && !cloud.classList.contains('is-busy')
      && host.querySelector('.cl-drawer').getBoundingClientRect().width >= 299;
  }, selector, { timeout: 10_000 });
  const top = await page.evaluate(selector => { const host = document.querySelector(selector); const drawer = host.querySelector('.cl-drawer'); return { on: host.querySelector('.cl').classList.contains('drawer-on'), width: Math.round(drawer.getBoundingClientRect().width), rows: drawer.querySelectorAll('a[data-key]').length, stageWidth: Math.round(host.querySelector('.cl-stage').getBoundingClientRect().width), wrapWidth: Math.round(host.querySelector('.cl-wrap').getBoundingClientRect().width) }; }, selector);
  check(`${label}: Top opens as a real 300 px column and the cloud re-packs beside it`, top.on && top.width >= 299 && top.rows > 0 && top.stageWidth < top.wrapWidth - 250, JSON.stringify(top));
  await page.click(`${selector} [data-top]`);
  await page.click(`${selector} [data-concept="groups"]`);
  await page.waitForFunction(selector => document.querySelectorAll(`${selector} .cl-island`).length > 0 && !document.querySelector(`${selector} .cl`)?.classList.contains('is-busy'), selector, { timeout: 10_000 }).catch(() => {});
  const grouped = await page.evaluate(selector => ({ cells: document.querySelectorAll(`${selector} .cl-island`).length, words: document.querySelectorAll(`${selector} .cl-words .cl-w`).length }), selector);
  check(`${label}: the by-folder arrangement draws treemap cells with their words`, grouped.cells > 0 && grouped.words > 0, JSON.stringify(grouped));
  await page.click(`${selector} [data-concept="cloud"]`);
  // On Files the metric also travels in the URL and swaps the page around the live cloud; the next frame's checks must not start while that swap is in flight.
  const swapped = pattern => page.waitForFunction(pattern => new RegExp(pattern, 'u').test(location.search) && !document.body.classList.contains('is-drawing'), pattern, { timeout: 15_000 }).catch(() => {});
  await page.click(`${selector} [data-metric="turnover"]`);
  await page.waitForFunction(selector => !document.querySelector(`${selector} .cl`)?.classList.contains('is-busy'), selector, { timeout: 10_000 }).catch(() => {});
  await swapped('m=turnover');
  const switched = await page.evaluate(selector => ({ pressed: document.querySelector(`${selector} [data-metric="turnover"]`)?.getAttribute('aria-pressed'), words: document.querySelectorAll(`${selector} .cl-words .cl-w:not([style*="opacity: 0"])`).length, sum: document.querySelector(`${selector} [data-readout] .fr-vals .sum dt`)?.textContent ?? '', url: location.search }), selector);
  check(`${label}: the metric switch re-sizes the cloud, emphasises Turnover in the readout and travels in the URL`, switched.pressed === 'true' && switched.words > 0 && /Turnover/u.test(switched.sum) && /m=turnover/u.test(switched.url), JSON.stringify(switched));
  await page.click(`${selector} [data-metric="freq"]`);
  await swapped('^(?!.*m=turnover)');
  await page.click(`${selector} [data-cloud-view="list"]`);
  const list = await page.evaluate(selector => ({ rows: document.querySelectorAll(`${selector} .cl-list tbody tr`).length, stageHidden: getComputedStyle(document.querySelector(`${selector} .cl-wrap`)).display === 'none' }), selector);
  check(`${label}: the list view is the equivalent ranked table`, list.rows > 0 && list.stageHidden, JSON.stringify(list));
  await page.click(`${selector} [data-cloud-view="cloud"]`);
  await page.waitForFunction(selector => !document.querySelector(`${selector} .cl`)?.classList.contains('is-busy') && document.querySelectorAll(`${selector} .cl-words .cl-w`).length > 0, selector, { timeout: 10_000 }).catch(() => {});
}

async function signIn() {
  // The App redirects to GitHub; the fixture answers GitHub's part, so the callback is reached directly with the state and cookie the App issued.
  const started = await context.request.get(`${ORIGIN}/auth/start`, { maxRedirects: 0 });
  check('auth/start redirects to github.com with a bound state', started.status() === 303 && started.headers().location.startsWith('https://github.com/login/oauth/authorize'), `${started.status()} ${started.headers().location}`);
  const state = new URL(started.headers().location).searchParams.get('state');
  await go(`/auth/callback?state=${state}&code=${CODE}`);
  try { await page.waitForURL(url => new URL(url).pathname === '/', { timeout: 15_000 }); } catch { /* reported by the check below */ }
  check('callback continues into a session and lands on the overview', new URL(page.url()).pathname === '/', `${page.url()} :: ${(await page.evaluate(() => document.body.innerText)).replace(/\s+/gu, ' ').slice(0, 300)}`);
}

async function qualifyPages(label, { pro }) {
  // Plan chips in panel titles belong to the premium panels, which exist only in a build that joined the extension.
  const premiumPanels = pro && Boolean(premium);
  for (const [name, path] of [['overview', '/'], ['prs', '/prs'], ['history', '/history'], ['files', '/files']]) {
    const response = await go(path);
    await settled();
    const facts = await pageFacts();
    chartTelemetry.push({ label, page: path, timings: await page.evaluate(() => window.__diffdevilCharts?.timings ?? []) });
    check(`${label} ${name} mounts every chart frame (${facts.mounted} of ${facts.charts}) and the page line ends`, (facts.charts > 0 || (name === 'files' && !premiumPanels)) && facts.mounted === facts.charts && facts.failed === 0 && !facts.drawing, JSON.stringify({ charts: facts.charts, mounted: facts.mounted, failed: facts.failed, drawing: facts.drawing }));
    check(`${label} ${name} renders 200 with one h1 at its own route`, response.status() === 200 && facts.h1 === 1 && new URL(page.url()).pathname === path, `${response.status()} h1=${facts.h1} url=${page.url()}`);
    check(`${label} ${name} shows the App surface label and current trailing App action`, facts.label === 'App' && facts.trailing === 'page' && facts.trailingText === 'App', JSON.stringify(facts));
    check(`${label} ${name} has no horizontal overflow at 1440`, (await overflow()) <= 0, `${await overflow()} ${await offenders()}`);
    check(`${label} ${name} shares the header frame start with the App frame`, facts.frameLeft === facts.headerLeft, `${facts.frameLeft} vs ${facts.headerLeft}`);
    check(`${label} ${name} prints no NaN or undefined`, !facts.nan);
    check(`${label} ${name} is dark and uses IBM Plex Sans`, facts.theme === 'dark' && /IBM Plex Sans/u.test(facts.font), facts.font);
    check(`${label} ${name} sends private no-store headers and the document referrer policy`, (response.headers()['cache-control'] ?? '').includes('no-store') && (response.headers()['content-security-policy'] ?? '').includes("default-src 'none'") && response.headers()['referrer-policy'] === 'same-origin', JSON.stringify({ cache: response.headers()['cache-control'], referrer: response.headers()['referrer-policy'] }));
    if (label === 'pro' && name === 'history') {
      const finalBucket = await page.locator('.a-bucketnav a').last().getAttribute('title');
      const expectedRange = await page.evaluate(() => {
        const format = value => new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
        const now = Date.now();
        return `${format(now - 2 * 86_400_000)} – ${format(now)}`;
      });
      check('retained History names the final bucket through its actual end date', finalBucket === expectedRange, `${finalBucket ?? 'no final bucket'} (expected ${expectedRange})`);
    }
    await shot(`${label}-${name}`);
  }
  const proChips = await page.evaluate(() => [...document.querySelectorAll('.a-pn-t .a-plan')].length);
  const hints = await page.evaluate(() => document.querySelectorAll('.a-prohint').length);
  await go('/');
  check(`${label} overview shows ${premiumPanels ? 'premium panels with plan chips' : 'Free panels with bounded See Pro placeholders and no premium chips in panel titles'}`, premiumPanels ? (await page.evaluate(() => document.querySelectorAll('.a-pn-t .a-plan').length)) > 0 : (await page.evaluate(() => document.querySelectorAll('.a-pn-t .a-plan').length)) === 0, `chips=${proChips} hints=${hints}`);
  check(`${label} overview hero names its merged population from retained lifecycle`, await page.evaluate(() => /Merged pull requests/u.test(document.querySelector('.a-hero-l .eb')?.textContent ?? '')));
  await settled();
  check(`${label} overview composes the accepted rows (${premiumPanels ? 'cloud, ' : ''}Change volume, flow, time to merge by size, size mix${premiumPanels ? ', Turnover map' : ''})`, await page.evaluate(pro => { const kinds = [...document.querySelectorAll('.a-grid > [data-chart], .a-grid > [data-premium-region] [data-chart]')].map(host => host.dataset.chart); const want = pro ? ['cloud', 'mosaic', 'flow', 'ttm', 'mix', 'turnover'] : ['mosaic', 'flow', 'ttm', 'mix']; return want.every(kind => kinds.includes(kind)) && (pro || !kinds.includes('cloud')) && !document.querySelector('[data-chart-provisional]'); }, premiumPanels), await page.evaluate(() => [...document.querySelectorAll('[data-chart]')].map(host => host.dataset.chart).join(',')));
  const hero = await page.evaluate(() => ({ svg: Boolean(document.querySelector('[data-hero-plot] svg')), dl: document.querySelector('[data-hero-dl]')?.textContent ?? '' }));
  await page.focus('[data-hero-plot]'); await page.keyboard.press('ArrowLeft');
  const heroKeyed = await page.evaluate(() => document.querySelector('[data-hero-dl]')?.textContent ?? '');
  check(`${label} overview hero line draws and rewrites its delta line from the keyboard`, hero.svg && heroKeyed !== hero.dl && /by /u.test(heroKeyed), JSON.stringify({ hero, heroKeyed }));
  if (label === 'pro') {
    const originalViewport = page.viewportSize();
    await page.setViewportSize({ width: 1280, height: 720 });
    const desktopPlot = await page.locator('[data-hero-plot]').boundingBox();
    check('overview cumulative plot remains perceptible at ordinary 1280×720 desktop', Boolean(desktopPlot && desktopPlot.height >= 96), JSON.stringify(desktopPlot));
    await shot('pro-overview-1280x720-hero');
    if (originalViewport) await page.setViewportSize(originalViewport);
  }
  await page.keyboard.press('Escape');
  const volume = await qualifyFrame(`${label} overview`, '[data-chart-id="volume"]');
  check(`${label} overview Change volume drills from a pinned bucket into History`, Boolean(volume?.pin.drill && /\/history\?/u.test(volume.pin.drill) && /w=\d/u.test(volume.pin.drill)), JSON.stringify(volume?.pin));
  await qualifyFrame(`${label} overview`, '[data-chart-id="flow"]');
  await qualifyFrame(`${label} overview`, '[data-chart-id="ttm"]');
  await qualifyFrame(`${label} overview`, '[data-chart-id="mix"]');
  if (premiumPanels) { await qualifyFrame(`${label} overview`, '[data-chart-id="turn"]'); await qualifyCloud(`${label} overview`, '[data-chart-id="cloud"]'); }
  // the period switch morphs the live charts in place: the frame node survives and its model changes
  await page.evaluate(() => { for (const host of document.querySelectorAll('[data-chart]')) host.dataset.qaMark = '1'; });
  const periodBefore = await page.evaluate(() => document.querySelector('[data-chart-id="volume"] [data-readout]')?.textContent ?? '');
  await page.click('[data-period] a[href*="per=7d"]');
  await page.waitForFunction(() => /per=7d/u.test(location.search), null, { timeout: 15_000 }).catch(() => {});
  await settled();
  const morph = await page.evaluate(() => ({ url: location.search, kept: Boolean(document.querySelector('[data-chart-id="volume"]')?.dataset.qaMark), readout: document.querySelector('[data-chart-id="volume"] [data-readout]')?.textContent ?? '', period: document.querySelector('[data-period] [aria-current="true"]')?.textContent ?? '', title: document.title, thumb: Boolean(document.querySelector('[data-period] .seg-thumb')), heroKept: Boolean(document.querySelector('[data-chart-id="hero"]')?.dataset.qaMark), heroLead: document.querySelector('[data-chart-id="hero"] .eb')?.textContent ?? '', heroSvg: Boolean(document.querySelector('[data-hero-plot] svg')) }));
  check(`${label} overview period switch updates the page in place and the live Change volume frame survives with the new window`, /per=7d/u.test(morph.url) && morph.kept && morph.readout !== periodBefore && /7 days/u.test(morph.readout) && morph.period === '7 days' && morph.thumb, JSON.stringify({ ...morph, readout: morph.readout.slice(0, 60) }));
  check(`${label} overview hero keeps its live line through the period switch while its lead figure follows the new window`, morph.heroKept && morph.heroSvg && /7 days/u.test(morph.heroLead), JSON.stringify({ heroKept: morph.heroKept, heroLead: morph.heroLead, heroSvg: morph.heroSvg }));
  await shot(`${label}-overview-7d-morph`);
  await go('/');
  // Plan chips sit on paid namespaces for everyone; a Free viewer's own namespaces and account switcher carry none, while a namespace funded by its owner keeps its chip.
  check(`${label} nav carries ${pro ? 'plan chips on your namespaces' : 'no plan chip on your own namespaces or account, and the owner-funded shared namespace keeps its chip'}`, pro ? (await page.evaluate(() => document.querySelectorAll('.a-acct .a-plan').length)) > 0 : (await page.evaluate(() => document.querySelectorAll('[data-namespace="ada-sample"] .a-acct .a-plan, [data-namespace="parser-guild"] .a-acct .a-plan, .a-me .a-plan').length === 0 && /Business/u.test(document.querySelector('[data-namespace="northwind-tools"] .a-acct .a-plan')?.textContent ?? ''))));
  check(`${label} nav shows repository status vocabulary`, await page.evaluate(() => { const texts = [...document.querySelectorAll('.a-repos .a-st')].map(element => element.textContent); return texts.includes('History off') && texts.includes('Labels only'); }));
}

async function readPrDetailFacts() {
  return page.evaluate(() => ({ lanes: document.querySelectorAll('.lane').length, result: document.querySelector('.a-result .big .n')?.textContent ?? '', snap: document.querySelector('.a-snap')?.textContent ?? '', files: document.querySelectorAll('#h-pf ~ * table tbody tr, .a-tbl tbody tr').length, github: Boolean(document.querySelector('a[href^="https://github.com/"]')), named: document.querySelector('.a-tbl.named td[aria-label="src/index.ts"] .a-path')?.textContent === 'src/index.ts', fileLinks: document.querySelectorAll('a[href^="/file/"]').length }));
}

async function qualifyPrFilesMinimum() {
  const inspectAt = async width => {
    await page.setViewportSize({ width, height: 900 });
    return page.locator('.pr-files-scroll').evaluate(scroller => {
      const table = scroller.querySelector('.a-tbl.named');
      const paths = [...(table?.querySelectorAll('tbody tr td:first-child .a-path') ?? [])];
      const clippedNames = paths.flatMap(path => {
        const name = path.querySelector('.name');
        if (!name) return ['<missing filename>'];
        const pathBox = path.getBoundingClientRect();
        const nameBox = name.getBoundingClientRect();
        return nameBox.left < pathBox.left - 1 || nameBox.right > pathBox.right + 1 ? [name.textContent] : [];
      });
      return { viewport: innerWidth, scrollWidth: scroller.scrollWidth, clientWidth: scroller.clientWidth,
        pageWidth: document.documentElement.scrollWidth, pathCount: paths.length,
        filenameCount: table?.querySelectorAll('tbody tr td:first-child .a-path .name').length ?? 0,
        columnWidths: [...(table?.querySelectorAll('tbody tr:first-child td') ?? [])].map(cell => Math.round(cell.getBoundingClientRect().width)), clippedNames };
    });
  };
  let narrow = 320, wide = 1180;
  while (narrow < wide) {
    const middle = Math.floor((narrow + wide) / 2);
    const layout = await inspectAt(middle);
    if (layout.scrollWidth > layout.clientWidth + 1 || layout.pageWidth > layout.viewport + 1 || layout.clippedNames.length > 0) narrow = middle + 1;
    else wide = middle;
  }
  const fitWidth = narrow;
  const fitLayout = await inspectAt(fitWidth);
  check(`PR detail Files keeps every complete filename visible at its measured minimum width ${fitWidth}px`,
    fitLayout.pathCount === LONG_RETAINED_PATHS.length + 1 && fitLayout.filenameCount === fitLayout.pathCount && fitLayout.clippedNames.length === 0
      && fitLayout.scrollWidth <= fitLayout.clientWidth + 1 && fitLayout.pageWidth <= fitLayout.viewport + 1, JSON.stringify(fitLayout));
  await page.screenshot({ path: join(OUT, `pr-files-minimum-fit-${fitWidth}px.png`), fullPage: true });

  const scrollWidth = Math.max(320, fitWidth - 1);
  const scrollLayout = await inspectAt(scrollWidth);
  const scroller = page.locator('.pr-files-scroll');
  await scroller.focus();
  await scroller.press('End');
  const rightState = await scroller.evaluate(element => ({ focused: document.activeElement === element, scrollLeft: element.scrollLeft, maximum: element.scrollWidth - element.clientWidth }));
  check(`PR detail Files keeps the complete table horizontally accessible just below ${fitWidth}px`,
    scrollLayout.scrollWidth > scrollLayout.clientWidth + 1 && scrollLayout.pageWidth <= scrollLayout.viewport + 1
      && rightState.focused && rightState.scrollLeft >= rightState.maximum - 1, JSON.stringify({ width: scrollWidth, ...scrollLayout, ...rightState }));
  await page.screenshot({ path: join(OUT, `pr-files-minimum-scroll-${scrollWidth}px.png`), fullPage: true });
  await scroller.press('Home');
  const leftState = await scroller.evaluate(element => ({ focused: document.activeElement === element, scrollLeft: element.scrollLeft }));
  check('PR detail Files returns to the full path column with the keyboard', leftState.focused && leftState.scrollLeft <= 1, JSON.stringify(leftState));

  for (const width of [1180, 1181, 1280, 1360, 1361, 1440]) {
    const layout = await inspectAt(width);
    check(`PR detail Files keeps all filenames visible without a table or page scrollbar at ${width}px`,
      layout.pathCount === LONG_RETAINED_PATHS.length + 1 && layout.filenameCount === layout.pathCount
        && layout.clippedNames.length === 0 && layout.scrollWidth <= layout.clientWidth + 1
        && layout.pageWidth <= layout.viewport + 1, JSON.stringify(layout));
  }
}

async function qualifyPrConfidenceState(consumerReturn = null) {
  const pathlessPull = pullRequests().find(pull => pull.analysed && !pull.repository.named);
  if (!pathlessPull) throw new Error('The PR layout qualification requires its seeded pathless reader.');
  const detail = await go('/pr/parser-guild/parser-lab/452');
  await settled();
  check('PR detail renders the Development chart for a retained merged pull request', detail.status() === 200 && await page.locator('[data-chart-id="dev"].is-mounted').count() === 1, `${detail.status()}`);
  const inspectBoundedReadout = async width => {
    await page.setViewportSize({ width, height: 900 });
    return page.evaluate(() => {
    const host = document.querySelector('[data-chart-id="dev"]');
    const frame = host?.__frame;
    if (!host || !frame) return null;
    frame.setFocus(1, { announce: true });
    const readout = host.querySelector('[data-readout]');
    const strip = readout.querySelector('.fr-vals');
    const stripBox = strip.getBoundingClientRect();
    const values = [...strip.querySelectorAll('dd')].map(value => {
      const range = document.createRange();
      range.selectNodeContents(value);
      const textBox = range.getBoundingClientRect();
      return { label: value.previousElementSibling.textContent, value: value.textContent, fontSize: getComputedStyle(value).fontSize, left: textBox.left, right: textBox.right, clipped: value.scrollWidth > value.clientWidth + 1 };
    });
    const boxes = [...strip.children].map(value => { const box = value.getBoundingClientRect(); return { left: box.left, right: box.right }; });
    const overlapping = boxes.some((box, index) => index > 0 && boxes[index - 1].right > box.left + 1);
    return { viewport: innerWidth, readoutWidth: readout.clientWidth, readoutHeight: readout.getBoundingClientRect().height,
      valuesHeight: strip.getBoundingClientRect().height, plotHeight: host.querySelector('[data-plot]').getBoundingClientRect().height,
      rowSpans: ['.pr-files', '.pr-development'].map(selector => getComputedStyle(document.querySelector(selector)).gridColumn),
      stripWidth: strip.clientWidth, stripScrollWidth: strip.scrollWidth,
      overflowing: strip.scrollWidth > strip.clientWidth + 1, overlapping, valuesOutside: values.some(value => value.left < stripBox.left - 1 || value.right > stripBox.right + 1), values };
    });
  };
  const now = await page.evaluate(() => document.querySelector('[data-chart-id="dev"]')?.__frame?.model.now);
  await page.evaluate(now => {
    const host = document.querySelector('[data-chart-id="dev"]');
    const frame = host?.__frame;
    if (!host || !frame) return;
    const interval = { status: 'bounded', lower: 2240, upper: 4335 };
    const delta = { status: 'bounded', lower: -2095, upper: 2095 };
    frame.model = { ...frame.model, rows: [
      { index: 0, sha: 'before1', at: now - 1, changed: interval.lower, upper: interval.upper, status: interval.status, bandShort: null, color: null, changedFrom: null, sinceOpened: { status: 'exact', lower: 0, upper: 0 }, transition: null },
      { index: 1, sha: 'after01', at: now, changed: interval.lower, upper: interval.upper, status: interval.status, bandShort: null, color: null, changedFrom: delta, sinceOpened: delta, transition: null },
    ] };
    frame.setFocus(1, { announce: true });
  }, now);
  const boundedReadout = await inspectBoundedReadout(1280);
  check('PR Development at 1280px preserves the adjacent 7/5 composition, compact type, complete grouped bounds and fixed F1 geometry', boundedReadout?.viewport === 1280
    && boundedReadout.rowSpans[0] === 'span 7' && boundedReadout.rowSpans[1] === 'span 5'
    && boundedReadout.values.some(value => value.label === 'Changed' && value.value === '2,240–4,335')
    && boundedReadout.values.filter(value => value.label === 'vs previous' || value.label === 'since opened').every(value => value.value === '−2,095–+2,095')
    && boundedReadout.values.every(value => value.fontSize === (value.label === 'Changed' ? '15px' : '13px'))
    && boundedReadout.readoutHeight === 66 && boundedReadout.valuesHeight === 40 && boundedReadout.plotHeight === 230
    && !boundedReadout.overflowing && !boundedReadout.overlapping && !boundedReadout.valuesOutside && boundedReadout.values.every(value => !value.clipped), JSON.stringify(boundedReadout));
  await page.locator('[data-chart-id="dev"] [data-readout]').screenshot({ path: join(OUT, 'pr-development-bounded-1280x900.png') });
  for (const width of [1360, 1361, 1440]) {
    const readout = await inspectBoundedReadout(width);
    const compact = width === 1360;
    const rowSpans = compact ? ['span 7', 'span 5'] : ['span 6', 'span 6'];
    check(`PR Development at ${width}px keeps the ${compact ? '7/5 compact' : '6/6 canonical'} composition, full grouped bounds and fixed F1 geometry`, readout?.viewport === width
      && JSON.stringify(readout.rowSpans) === JSON.stringify(rowSpans)
      && readout.values.some(value => value.label === 'Changed' && value.value === '2,240–4,335')
      && readout.values.filter(value => value.label === 'vs previous' || value.label === 'since opened').every(value => value.value === '−2,095–+2,095')
      && readout.values.every(value => value.fontSize === (value.label === 'Changed' ? (compact ? '15px' : '21px') : (compact ? '13px' : '17px')))
      && readout.readoutHeight === 66 && readout.valuesHeight === 40 && readout.plotHeight === 230
      && !readout.overflowing && !readout.overlapping && !readout.valuesOutside && readout.values.every(value => !value.clipped), JSON.stringify(readout));
    if (width !== 1360) await page.locator('[data-chart-id="dev"] [data-readout]').screenshot({ path: join(OUT, `pr-development-bounded-${width}x900.png`) });
  }
  await page.evaluate(() => {
    const host = document.querySelector('[data-chart-id="dev"]');
    const frame = host?.__frame;
    if (!frame) return;
    frame.model = { ...frame.model, rows: frame.model.rows.map((row, index) => index === 1
      ? { ...row, changedFrom: { status: 'bounded', lower: -2095, upper: 1234 } }
      : row) };
    frame.setFocus(null, { quiet: true });
    frame.setFocus(1, { announce: true });
  });
  for (const width of [1361, 1440]) {
    const readout = await inspectBoundedReadout(width);
    check(`PR Development F1 readout preserves grouped asymmetric full bounds at ${width}px without clipping or overlap`, readout?.viewport === width
      && readout.values.some(value => value.label === 'vs previous' && value.value === '−2,095–+1,234')
      && readout.values.every(value => value.fontSize === (value.label === 'Changed' ? '21px' : '17px'))
      && readout.readoutHeight === 66 && readout.valuesHeight === 40 && readout.plotHeight === 230
      && !readout.overflowing && !readout.overlapping && !readout.valuesOutside && readout.values.every(value => !value.clipped), JSON.stringify(readout));
  }
  await page.locator('[data-chart-id="dev"] [data-readout]').screenshot({ path: join(OUT, 'pr-development-asymmetric-1440x900.png') });

  for (const width of [1180, 1181, 1280, 1360, 1361, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const inspectFilesLayout = async (label, pathless) => {
      const response = await go(pathless ? `/pr/${pathlessPull.repository.fullName}/${pathlessPull.number}?per=90d` : '/pr/parser-guild/parser-lab/452?per=90d');
      await settled();
      const layout = await page.evaluate(expectedPaths => {
        const panel = document.querySelector('.pr-files');
        const scroller = panel?.querySelector('.pr-files-scroll');
        const table = panel?.querySelector('.a-tbl');
        const panelBox = panel?.getBoundingClientRect();
        const scrollBox = scroller?.getBoundingClientRect();
        const tableBox = table?.getBoundingClientRect();
        const text = panel?.innerText ?? '';
        const rowSpans = ['.pr-files', '.pr-development'].map(selector => { const node = document.querySelector(selector); return node && getComputedStyle(node).gridColumn; });
        const named = table?.classList.contains('named') ?? false;
        const headers = [...(table?.querySelectorAll('thead th') ?? [])].map(header => header.textContent.trim()).join('|');
        const pathCells = [...(table?.querySelectorAll('tbody tr td:first-child') ?? [])];
        const longestPath = expectedPaths.reduce((longest, candidate) => candidate.length > longest.length ? candidate : longest, '');
        const pathCell = pathCells.find(cell => cell.getAttribute('aria-label') === longestPath);
        const path = pathCell?.querySelector('.a-path');
        const directory = path?.querySelector('.dir');
        const fileName = path?.querySelector('.name');
        const includedIcon = table?.querySelector('[aria-label="Included in policy scope"]');
        return { width: innerWidth, rowSpans, rows: table?.querySelectorAll('tbody tr').length ?? 0,
          scroller: Boolean(scroller), scrollerTabIndex: scroller?.tabIndex ?? -1,
          scrollWidth: scroller?.scrollWidth ?? 0, clientWidth: scroller?.clientWidth ?? 0,
          hasScrollbar: Boolean(scroller && scroller.scrollWidth > scroller.clientWidth + 1), named, headers,
          pathText: path?.textContent ?? '', pathCellLabel: pathCell?.getAttribute('aria-label') ?? '',
          pathTitle: path?.getAttribute('title') ?? '', directoryClipped: Boolean(directory && directory.scrollWidth > directory.clientWidth + 1),
          fileNameVisible: Boolean(fileName && fileName.getBoundingClientRect().right <= path.getBoundingClientRect().right + 1),
          includedLabel: includedIcon?.getAttribute('aria-label') ?? '',
          panelContainsScroller: Boolean(panelBox && scrollBox) && scrollBox.left >= panelBox.left - 1 && scrollBox.right <= panelBox.right + 1,
          tableFitsScrollableContent: Boolean(scrollBox && tableBox) && tableBox.left >= scrollBox.left - 1 && tableBox.right <= scrollBox.left + (scroller?.scrollWidth ?? 0) + 1,
          pageOverflow: document.documentElement.scrollWidth > innerWidth + 1, text,
          missingPaths: expectedPaths.filter(expectedPath => !pathCells.some(cell => cell.getAttribute('aria-label') === expectedPath
            && cell.querySelector('.a-path')?.getAttribute('title') === expectedPath)) };
      }, pathless ? [] : LONG_RETAINED_PATHS);
      const compact = width >= 1181 && width <= 1360;
      const stacked = width <= 1180;
      const expectedSpans = stacked ? ['span 12', 'span 12'] : compact ? ['span 7', 'span 5'] : ['span 6', 'span 6'];
      const pathsPresent = pathless ? /path not retained/u.test(layout.text) : layout.rows === LONG_RETAINED_PATHS.length + 1 && layout.missingPaths.length === 0;
      const namedContract = pathless || (layout.named && layout.headers === 'Path|Policy|Changed|Raw'
        && layout.pathCellLabel === layout.pathTitle && layout.pathText === layout.pathTitle
          && (width <= 1180 || layout.directoryClipped) && layout.fileNameVisible && layout.includedLabel === 'Included in policy scope'
        && !layout.hasScrollbar);
      check(`PR detail ${label} Files table stays in its panel at ${width}px with the accepted ${stacked ? '12/12' : compact ? '7/5' : '6/6'} composition`, response.status() === 200 && layout.width === width
        && JSON.stringify(layout.rowSpans) === JSON.stringify(expectedSpans) && layout.rows > 0 && layout.scroller && layout.scrollerTabIndex === 0
        && layout.panelContainsScroller && layout.tableFitsScrollableContent && layout.scrollWidth >= layout.clientWidth && !layout.pageOverflow && pathsPresent && namedContract, JSON.stringify(layout));
      return layout;
    };

    await inspectFilesLayout('retained long-path', false);
    if (width === 1280) {
      await page.screenshot({ path: join(OUT, 'pr-files-long-paths-1280x900.png'), fullPage: true });
    }
    if (width === 1361) await page.screenshot({ path: join(OUT, 'pr-files-long-paths-1361x900.png'), fullPage: true });
    // Use the existing supported pathless reader. A layout check does not need a second
    // Wrangler writer corrupting the running Worker's database to manufacture that state.
    await inspectFilesLayout('pathless', true);
  }
  await go('/pr/parser-guild/parser-lab/452?per=90d');
  await settled();
  await qualifyPrFilesMinimum();
  await go('/pr/parser-guild/parser-lab/452');
  await settled();
  await page.evaluate(() => {
    const host = document.querySelector('[data-chart-id="dev"]');
    const frame = host?.__frame;
    if (host && frame) { frame.model = JSON.parse(host.querySelector('[data-chart-model]').textContent); frame.setFocus(null, { quiet: true }); }
  });
  await page.setViewportSize({ width: 1440, height: 900 });

  const closedWithoutRevision = await go('/pr/parser-guild/parser-lab/74');
  const closedWithoutRevisionText = await page.evaluate(() => document.body.innerText);
  check('closed-unmerged PR with zero analysed revisions states that no revision or final comparison was retained', closedWithoutRevision.status() === 200
    && /Closed unmerged; no analysed revision was retained, and no final merged comparison exists\./u.test(closedWithoutRevisionText)
    && /No analysed revision retained/u.test(closedWithoutRevisionText), closedWithoutRevisionText.replace(/\s+/gu, ' ').slice(0, 500));
  await shot('closed-unmerged-no-analysed-revision-pr74');

  if (consumerReturn) {
    const restored = await go(consumerReturn.href);
    await settled();
    const restoredFacts = await readPrDetailFacts();
    const restoredUrl = new URL(page.url());
    const expectedUrl = new URL(consumerReturn.href, page.url());
    check('PR confidence qualification returns to the same PR detail and facts before its premium consumer runs', restored.status() === 200
      && restoredUrl.pathname === expectedUrl.pathname && restoredUrl.search === expectedUrl.search
      && JSON.stringify(restoredFacts) === JSON.stringify(consumerReturn.expectedFacts), JSON.stringify({ href: consumerReturn.href, restoredUrl: page.url(), restoredFacts, expectedFacts: consumerReturn.expectedFacts }));
    return restoredFacts;
  }
}

try {
  if (EXPLICIT_READER_ONLY) {
    github.state.installations = [];
    github.state.roles.set('parser-guild', 'member');
    github.state.push.set(1002, false); github.state.admin.set(1002, false);
    github.state.inaccessibleRepositoryIds.add(1001);
    await startWorker({ 123: 'Free', 7001: 'Pro' });
    await signIn();
    const fullName = 'parser-guild/lexer-kit';
    const pull = pullRequests().find(value => value.repository.repositoryId === 1002 && value.analysed && value.finalRecovered);
    if (!pull) throw new Error('The explicit reader needs a retained fixture PR.');
    for (const [name, path] of [['overview', `/?s=${fullName}&per=1y`], ['files', `/files?s=${fullName}&per=1y`],
      ['pr', `/pr/${fullName}/${pull.number}?per=1y`], ['file', `/file/${fullName}/${'a'.repeat(22)}?per=1y`]]) {
      const response = await go(path);
      const text = await page.locator('body').innerText();
      check(`explicit ${name}: a pull-only reader resolves the connected target despite empty installation enumeration`, response.status() === 200
        && fullName.split('/').every(part => text.includes(part)) && !text.includes('Not in your repositories'),
      JSON.stringify({ status: response.status(), heading: await page.locator('h1').first().textContent() }));
      await shot(`explicit-${name}`);
    }
    const query = { version: 1, surface: 'overview', repositoryIds: [1002], scope: { kind: 'repository', repositoryId: 1002 },
      repositoryIdentities: [{ repositoryId: 1002, fullName }], from: '2026-01-01T00:00:00.000Z', to: new Date().toISOString() };
    const apiUrl = `${ORIGIN}/api/analytics?query=${encodeURIComponent(JSON.stringify(query))}`;
    const result = await page.request.get(apiUrl), body = await result.json();
    check('explicit HTTP analytics carries actual retained population and the namespace-funded plan', result.status() === 200
      && body.coverage?.merged > 0 && body.entitlements?.aggregatePlan === 'pro'
      && JSON.stringify(body.repositoryIdentities) === JSON.stringify([{ repositoryId: 1002, fullName }]));
    const sibling = await page.request.get(`${ORIGIN}/pr/parser-guild/parser-lab/452?render=document`);
    check('an inaccessible private sibling remains unavailable without its history or repository context', sibling.status() === 404
      && !(await sibling.text()).includes('parser-lab'));
    github.state.repositoryStatus.set(1002, 404);
    for (const path of ['/', '/prs', '/history', '/files']) {
      const unavailable = await page.request.get(`${ORIGIN}${path}?s=${fullName}&render=document`), text = await unavailable.text();
      check(`explicit ${path}: confirmed access loss retains the analytical frame without false data or an upgrade offer`, unavailable.status() === 200
        && text.includes('data-scope-unavailable') && !text.includes('data-chart') && !text.includes('See Pro'));
    }
    github.state.repositoryStatus.clear();
    check('an ordinary request restores the explicit funded population after current access returns', (await page.request.get(apiUrl)).status() === 200);
    github.state.repositoryStatus.set(1002, 503);
    const unknown = await page.request.get(`${ORIGIN}/?s=${fullName}&render=document`);
    check('a warm explicit viewer refuses an unknown current read instead of presenting zero data', unknown.status() === 503
      && (await unknown.text()).includes('Current repository access could not be read'));
    github.state.repositoryStatus.clear();
    github.state.tokenValid = false;
    check('the actual HTTP caller refuses a revoked user grant', (await page.request.get(apiUrl)).status() === 401);
  } else if (FILES_QUERY_ONLY) {
    if (!edition.entry?.replaceAll('\\', '/').endsWith('/qa/loading-premium/index.mjs')) throw new Error('Files-query qualification requires the public loading extension fixture.');
    await startWorker(ENTITLEMENT_FIXTURE); await signIn(); await filesQueryJourney(ctx);
  } else if (LOADING_ONLY) {
    await startWorker(ENTITLEMENT_FIXTURE);
    await signIn();
    await loadingJourney(ctx);
    await scopeUnavailableJourney({ ...ctx, github, restart: async () => { await stopWorker(); await startWorker(ENTITLEMENT_FIXTURE); } });
    if (edition.entry?.replaceAll('\\', '/').endsWith('/qa/loading-premium/index.mjs')) await fileReadJourney({ ...ctx, scale: LOADING_SCALE });
  } else if (ADMISSION_ONLY) {
    await startWorker(ENTITLEMENT_FIXTURE);
    await signIn();
    await admissionJourney(ctx, github);
  } else if (THUMB_ONLY) {
    await startWorker(undefined, STATE, { commercial: COMMERCIAL_PRO });
    await signIn();
    await go('/');
    await settled();
    await qualifyFrame('pro overview', '[data-chart-id="volume"]');
    await qualifyFrame('pro overview', '[data-chart-id="ttm"]');
  } else if (PR_SEARCH_DETAIL_ONLY) {
    await startWorker(undefined, STATE, { commercial: COMMERCIAL_FREE, allowances: { free: { private: 3, publicHistory: 10 }, proOrganisation: { private: 3 } } });
    await signIn();
    await qualifyAllRepositoriesSearchDetail();
    if (edition.premium) {
      await stopWorker();
      await startWorker(ENTITLEMENT_FIXTURE);
      await signIn();
      await qualifyAllRepositoriesSearchDetail();
    }
    await qualifyDetailRefusals();
  } else if (PR_FILES_ONLY) {
    await startWorker(undefined, STATE, { commercial: COMMERCIAL_PRO });
    await signIn();
    const detail = await go('/pr/parser-guild/parser-lab/452?per=90d');
    await settled();
    check('focused PR Files route reaches a retained analysis with named files', detail.status() === 200
      && await page.locator('.pr-files-scroll > .a-tbl.named tbody tr .a-path .name').count() === LONG_RETAINED_PATHS.length + 1, `${detail.status()}`);
    await qualifyPrFilesMinimum();
  } else if (PR_CONFIDENCE_ONLY) {
    await startWorker(undefined, STATE, { commercial: COMMERCIAL_PRO });
    await signIn();
    await go('/prs?s=parser-guild%2Fparser-lab&per=90d&f=merged');
    const href = await page.locator('.a-prs2 .a-pr').first().getAttribute('href');
    const detailResponse = await go(href);
    const detailFacts = await readPrDetailFacts();
    check('focused PR detail reaches its retained analysis before confidence qualification', detailResponse.status() === 200 && detailFacts.lanes >= 3 && detailFacts.result !== '', JSON.stringify({ href, ...detailFacts }));
    const consumerDetailFacts = await qualifyPrConfidenceState({ href, expectedFacts: detailFacts });
    await premium?.prDetail?.(ctx, { detailFacts: consumerDetailFacts });
  } else if (AUTHORITY_ONLY) {
    for (const [name, status, role, state] of [
      ['unavailable', 403, 'admin', 'active'], ['pending', 200, 'admin', 'pending'],
      ['omitted-unconfirmed', 200, '', 'active'], ['member', 200, 'member', 'active'],
      ['billing-manager', 200, 'billing_manager', 'active'], ['administrator', 200, 'admin', 'active']
    ]) {
      github.state.membershipStatus = status;
      github.state.roles.set('parser-guild', role);
      github.state.membershipStates.set('parser-guild', state);
      await startWorker(undefined, STATE, { commercial: COMMERCIAL_PRO });
      await signIn();
      await go('/manage');
      const reader = page.locator('[data-readers] .m-nsrow, [data-unconfirmed-readers] .m-nsrow').filter({ hasText: 'parser-guild' });
      const text = name === 'administrator' ? '' : await reader.innerText();
      check(`${name}: Manage reflects the observed organisation authority`, name === 'administrator'
        ? await reader.count() === 0 && await page.locator('[data-namespace-row="parser-guild"]').count() === 1
        : name === 'unavailable' ? /HTTP 403/u.test(text) && /Administration is unconfirmed/u.test(text)
        : name === 'pending' ? /membership is pending/u.test(text)
        : name === 'omitted-unconfirmed' ? /HTTP 403/u.test(text) && /Administration is unconfirmed/u.test(text)
        : name === 'billing-manager' ? /active billing manager role/u.test(text)
        : /active member role/u.test(text), text);
      const groups = await page.evaluate(() => ({
        knownHeading: document.querySelector('[data-readers] h2')?.textContent,
        knownOrientation: document.querySelector('[data-readers] header .d')?.textContent,
        knownRoles: [...document.querySelectorAll('[data-readers] [data-namespace-authority]')].map(row => row.getAttribute('data-namespace-authority')),
        unknownHeading: document.querySelector('[data-unconfirmed-readers] h2')?.textContent,
        unknownRoles: [...document.querySelectorAll('[data-unconfirmed-readers] [data-namespace-authority]')].map(row => row.getAttribute('data-namespace-authority'))
      }));
      check(`${name}: known readers retain their orientation and only failed role reads enter the unconfirmed group`,
        groups.knownHeading === 'Read-only for you' && /Someone else manages them/u.test(groups.knownOrientation ?? '')
        && groups.knownRoles.length > 0 && !groups.knownRoles.includes('unknown')
        && (name === 'unavailable' || name === 'omitted-unconfirmed' ? groups.unknownHeading === 'Read access · administration unconfirmed'
          && groups.unknownRoles.length > 0 && groups.unknownRoles.every(role => role === 'unknown') : groups.unknownRoles.length === 0), JSON.stringify(groups));
      check(`${name}: authority explanation fits the existing desktop layout`, await overflow() <= 0, await offenders());
      await shot(`authority-${name}`);
      await stopWorker();
    }
  } else if (HISTORY_ONLY) {
    await startWorker(undefined, STATE, { commercial: COMMERCIAL_PRO });
    await signIn();
    await historyOnlyManage(ctx);
    await go('/history?s=%40parser-guild&per=90d');
    await settled();
    await page.locator('[data-chart-id="volume"] button[data-view="table"]').click();
    check('history table keeps an uncovered empty bucket unknown in every numerical quantity', await page.evaluate(() => [...document.querySelectorAll('[data-chart-id="volume"] [data-table] tbody tr')].some(row => [...row.children].slice(2, 7).every(cell => cell.textContent.trim() === 'unknown') && row.lastElementChild.textContent.includes('partial window'))));
    await shot('history-evidence-table');
    await stopWorker();
    await startWorker(undefined, STATE, { commercial: COMMERCIAL_FREE, allowances: { free: { private: 2, publicHistory: 10 }, proOrganisation: { private: 3 } } });
    await signIn();
    await go('/manage/repositories');
    await page.locator('[data-namespace-block="parser-guild"] header form button').click();
    await page.waitForLoadState('networkidle');
    check('private swap fixture actually has two finite occupied places', await page.locator('[data-free-allowance] .m-segs.priv i').count() === 2 && await page.locator('[data-free-allowance] .m-segs.priv i.on').count() === 2);
    await page.locator('[data-repository-row="parser-guild/grammar-fuzz"]').getByRole('link', { name: 'Swap in…' }).click();
    await page.waitForLoadState('networkidle');
    check('private swap names lost collection and retained history before confirmation', await page.locator('[data-swap-panel]').getByText('collection will stop; retained history stays', { exact: false }).count() > 0);
    await page.locator('[data-swap-panel] input[name="outgoing"][value="parser-guild/parser-lab"]').check();
    await shot('history-private-swap-before-confirmation');
    await page.locator('[data-swap-panel] button[type="submit"]').click();
    await page.waitForLoadState('networkidle');
    await go('/manage/repositories/parser-guild/parser-lab');
    check('confirmed private swap pauses history, preserves consent and frees its place', await page.evaluate(() => /Paused by Stop/u.test(document.querySelector('[data-history] dl')?.textContent ?? '') && /its place is free/u.test(document.querySelector('[data-history] dl')?.textContent ?? '') && Boolean(document.querySelector('[data-history] input[name="enabled"][value="on"]'))));
    await shot('history-private-swap-after-confirmation');
    await page.locator('[data-history]').getByRole('button', { name: 'Resume history', exact: true }).click();
    await page.waitForLoadState('networkidle');
    check('displaced history cannot resume outside the real private allowance', /Every private slot/u.test(await page.locator('.m-msg').innerText()) && /Paused/u.test(await page.locator('[data-history] dl').innerText()));
    await go('/manage/repositories/parser-guild/grammar-fuzz');
    await page.locator('[data-leave]').getByRole('button', { name: 'Stop', exact: true }).click();
    await page.waitForLoadState('networkidle');
    await go('/manage/repositories/parser-guild/parser-lab');
    await page.locator('[data-history]').getByRole('button', { name: 'Resume history', exact: true }).click();
    await page.waitForLoadState('networkidle');
    check('the place released by Stop permits private history-only readmission', await page.evaluate(() => /History only/u.test(document.querySelector('[data-history]')?.textContent ?? '') && [...document.querySelectorAll('[data-operation] .m-eff .m-st')].every(node => node.textContent.trim() === 'Off')));
    await shot('history-private-readmission');
    await page.locator('[data-history]').getByRole('button', { name: 'Stop collecting', exact: true }).click();
    await page.waitForLoadState('networkidle');
    await go('/manage/repositories');
    check('Stop collecting releases a private history-only place while leaving repository effects off', await page.locator('[data-free-allowance] .m-segs.priv i.on').count() === 1 && /Stopped/u.test(await page.locator('[data-repository-row="parser-guild/parser-lab"]').innerText()));
  } else if (IDENTITY_ONLY) {
    await startWorker(undefined, STATE, { commercial: COMMERCIAL_PRO });
    await signIn();
    for (const [name, path] of [['overview', '/'], ['manage', '/manage']]) {
      await go(path);
      await settled();
      const facts = await pageFacts();
      const staging = target.name === 'staging';
      const title = name === 'overview' ? 'Overview' : 'Manage';
      const headingName = staging ? `${title} Staging` : title;
      check(`${name}: the browser title identifies only the staging build`, (await page.title()).startsWith('Staging · ') === staging, await page.title());
      const marks = page.locator('[data-staging-mark]');
      check(`${name}: the heading carries only the staging build's mark`, await marks.count() === (staging ? 1 : 0));
      check(`${name}: the accessible heading keeps the page title separate from its environment mark`, await page.getByRole('heading', { level: 1, name: headingName, exact: true }).count() === 1, await page.locator('h1').innerText());
      if (staging) {
        check(`${name}: the neutral mark is readable beside the existing heading`, await marks.isVisible() && await marks.textContent() === 'Staging' && await marks.evaluate(mark => mark.closest('h1') !== null && mark.tabIndex === -1));
        check(`${name}: the mark fits inside its heading without clipping`, await marks.evaluate(mark => { const box = mark.getBoundingClientRect(), head = mark.closest('h1').getBoundingClientRect(); return box.left >= head.left && box.right <= head.right && box.top >= head.top && box.bottom <= head.bottom && mark.scrollWidth <= mark.clientWidth + 1; }));
      }
      check(`${name}: the Works header retains both App labels`, facts.label === 'App' && facts.trailingText === 'App' && facts.trailing === 'page');
      check(`${name}: the selected desktop composition has no horizontal overflow`, await overflow() <= 0, await offenders());
      await page.focus('.app-route > a[href="#main"]');
      await page.keyboard.press('Tab');
      check(`${name}: keyboard navigation reaches the unchanged Works header`, await page.locator('.site-header :focus').count() === 1);
      await shot(`identity-${name}`);
    }
  } else if (BUSINESS_MANAGE_ONLY) {
    await startWorker(undefined, STATE, { commercial: COMMERCIAL_BUSINESS });
    await signIn();
    await businessManage(ctx);
    await manageAccess(ctx, { browser, label: 'business' });
  } else {
  if (!PARTICIPATION_ONLY) {
  // ── Pro pass: the viewer and their organisation are Pro through the Works stand-in, one shared namespace is Business ──
  await startWorker(undefined, STATE, { commercial: COMMERCIAL_PRO });
  const unauthenticated = await context.request.get(`${ORIGIN}/`, { maxRedirects: 0 });
  check('an unauthenticated visit is sent to sign-in with no page content', unauthenticated.status() === 303 && unauthenticated.headers().location === '/sign-in?reason=E_SESSION_UNAVAILABLE', `${unauthenticated.status()} ${unauthenticated.headers().location}`);
  const ping = await context.request.get(`${PROBE}/health/ping`);
  check('the joined Worker answers the managed runtime health route', ping.status() === 200 && /diffdevil-github-app/u.test(await ping.text()));
  const notices = await context.request.get(`${ORIGIN}/third-party-notices.txt`);
  const noticeText = await notices.text();
  check('the built application serves retained third-party licence notices', notices.status() === 200 && /echarts 6\.1\.0/u.test(noticeText) && /Apache License/u.test(noticeText), String(notices.status()));
  // The header's glyphs are prerendered into the page HTML from @wolfsblvt/icons, so its notice, the Lucide ISC and the Simple Icons CC0 text travel with the build; a non-UTF-8 reading would corrupt their © and quotation marks.
  check('the served notices carry the shared icon package, Lucide ISC and Simple Icons CC0 notices as UTF-8', /charset=utf-8/iu.test(notices.headers()['content-type'] ?? '') && /^@wolfsblvt\/icons 0\.1\.0$/mu.test(noticeText) && /Copyright © 2026 Wolfsblvt Works/u.test(noticeText) && /^ISC License$/mu.test(noticeText) && /^# CC0 1\.0 Universal$/mu.test(noticeText), notices.headers()['content-type']);
  const webhook = await context.request.post(`${PROBE}/webhooks/github`, { data: '{}', headers: { 'content-type': 'application/json' } });
  check('the joined Worker keeps the webhook ingress and refuses an unsigned delivery', webhook.status() === 400 || webhook.status() === 401, String(webhook.status()));
  await go('/sign-in');
  check('sign-in page explains what signing in does and does not grant', await page.evaluate(() => /no new authority/u.test(document.body.innerText)));
  await shot('sign-in');
  await signIn();
  await qualifyPages('pro', { pro: true });

  // the protected analytics route answers the signed-in browser through the installed adapter
  const analytics = await context.request.post(`${ORIGIN}/api/analytics`, { headers: { origin: ORIGIN, 'content-type': 'application/json' }, data: JSON.stringify({ version: 1, surface: 'overview', repositoryIds: [1001, 1002], from: '2026-07-11T14:00:00.000Z', to: '2026-10-09T14:00:00.000Z' }) });
  check('the protected analytics route answers the signed-in session with the contract', analytics.status() === 200 && (await analytics.json()).kind === 'diffdevil.app-analytics', String(analytics.status()));
  const analyticsAnonymous = await context.request.post(`${ORIGIN}/api/analytics`, { headers: { origin: ORIGIN, 'content-type': 'application/json', cookie: '' }, data: '{}' });
  check('the analytics route refuses a malformed query', analyticsAnonymous.status() === 400 || analyticsAnonymous.status() === 401, String(analyticsAnonymous.status()));

  // scope and period are URL state and persist across pages
  await go('/?s=%40parser-guild&per=90d');
  await page.click('.a-nav a[href*="/history"]');
  await page.waitForLoadState('networkidle');
  check('the period and scope persist into the next section through the URL', /per=90d/u.test(page.url()) && /s=%40parser-guild/u.test(page.url()), page.url());
  await settled();
  check('history bucket navigation offers weekly buckets for 90 days', (await page.locator('.a-bucketnav a').count()) >= 12, String(await page.locator('.a-bucketnav a').count()));
  await page.locator('[data-chart-id="volume"] button[data-view="table"]').click();
  const historyTable = await page.evaluate(() => {
    const host = document.querySelector('[data-chart-id="volume"]'), model = JSON.parse(host.querySelector('[data-chart-model]').textContent);
    return [...host.querySelectorAll('[data-table] tbody tr')].map((row, i) => ({ covered: model.rows[i].covered, coverage: model.rows[i].coverage, cells: [...row.children].map(cell => cell.textContent.trim()) }));
  });
  check('History table preserves unknown quantities and marks every uncovered retained window', historyTable.some(row => row.coverage === 'none') && historyTable.every(row => (row.coverage !== 'none' || row.cells.slice(2, 7).every(value => value === 'unknown')) && (row.covered !== false || row.cells[7].includes('partial window'))), JSON.stringify(historyTable));
  await shot('pro-history-evidence-table');
  await page.locator('[data-chart-id="volume"] button[data-view="chart"]').click();
  check(`Pro history composes Change volume, Merged PRs by size${premium ? ', growth and concentration' : ''} as chart frames`, await page.evaluate(kinds => kinds.every(kind => document.querySelector(`[data-chart="${kind}"].is-mounted`)), premium ? ['mosaic', 'lanes', 'growth', 'concentration'] : ['mosaic', 'lanes']), await page.evaluate(() => [...document.querySelectorAll('[data-chart]')].map(host => `${host.dataset.chart}:${host.classList.contains('is-mounted')}`).join(',')));
  const bucketBefore = await page.evaluate(() => document.querySelector('#h-bucket')?.textContent ?? '');
  await page.evaluate(() => { document.querySelector('[data-chart-id="volume"]').dataset.qaMark = '1'; });
  await page.locator('.a-bucketnav a').nth(5).click();
  await page.waitForFunction(() => /w=5/u.test(location.search), null, { timeout: 15_000 }).catch(() => {});
  await settled();
  const picked = await page.evaluate(() => ({ url: location.search, title: document.querySelector('#h-bucket')?.textContent ?? '', pinned: Boolean(document.querySelector('[data-chart-id="volume"] .fr-pin')), sel: document.querySelector('[data-chart-id="volume"]')?.dataset.sel, kept: Boolean(document.querySelector('[data-chart-id="volume"]')?.dataset.qaMark), current: document.querySelector('.a-bucketnav [aria-current="true"]')?.textContent ?? '', growthSel: document.querySelector('[data-chart-id="growth"]')?.dataset.sel, lanesBand: /selected bucket/u.test(document.querySelector('[data-chart-id="lanes"] [data-readout]')?.textContent ?? '') }));
  check('picking a bucket swaps the bucket panel in place, keeps the live Change volume pinned on it and bands the lanes', /w=5/u.test(picked.url) && picked.title !== bucketBefore && picked.pinned && picked.sel === '5' && picked.kept && picked.lanesBand, JSON.stringify(picked));
  check('the selected bucket reads its PRs as ranked rows with size chips and composition bars', await page.evaluate(() => document.querySelectorAll('.hb-panel .hb-row').length > 0 && document.querySelectorAll('.hb-panel .fr-chip').length > 0 && document.querySelectorAll('.hb-panel .cl-comp').length > 0));
  await qualifyFrame('pro history', '[data-chart-id="lanes"]');
  await premium?.history?.(ctx);
  if (!premium) check('without the premium extension History keeps the period comparison and names the missing growth and concentration panels', (await page.locator('[data-chart="growth"], [data-chart="concentration"]').count()) === 0 && (await page.locator('.a-cmp').count()) === 1 && (await page.evaluate(() => /not part of this build/u.test(document.body.innerText))));
  await shot('pro-history-bucket');

  // repository scope, PR list filters, drill-down to PR detail with named files, then into a file through its handle
  await go('/prs?s=parser-guild%2Fparser-lab&per=90d');
  await settled();
  check('Pull requests composes flow, PR lifecycle by size and the size mix as chart frames', await page.evaluate(() => ['flow', 'lifecycle', 'mix'].every(kind => document.querySelector(`[data-chart="${kind}"].is-mounted`))));
  await qualifyFrame('pro prs', '[data-chart-id="life"]');
  const total = await page.locator('.a-prs2 .a-pr').count();
  check('the pull-request list renders rows for a repository scope', total > 0, String(total));
  await page.locator('.a-fchip', { hasText: 'Merged' }).first().click();
  await page.waitForLoadState('networkidle');
  check('status chips filter through the URL', /f=merged/u.test(page.url()) && (await page.locator('.a-prs2 .a-pr .st-merged').count()) === (await page.locator('.a-prs2 .a-pr').count()));
  await page.fill('.a-search input', '#452');
  await page.press('.a-search input', 'Enter');
  await page.waitForLoadState('networkidle');
  check('search narrows the list by number', /q=%23452/u.test(page.url()));
  await shot('pro-prs-filtered');
  await go('/prs?s=parser-guild%2Fparser-lab&per=90d&f=merged');
  const firstRow = page.locator('.a-prs2 .a-pr').first();
  const href = await firstRow.getAttribute('href');
  const detailResponse = await go(href);
  check('PR detail answers 200', detailResponse.status() === 200, `${detailResponse.status()} :: ${(await page.evaluate(() => document.body.innerText)).replace(/\s+/gu, ' ').slice(0, 400)}`);
  const detailFacts = await readPrDetailFacts();
  check('PR detail shows the result, policy lanes, freshness, named file rows and the GitHub link', detailFacts.lanes >= 3 && detailFacts.result !== '' && /analysed head/u.test(detailFacts.snap) && detailFacts.files > 0 && detailFacts.github && detailFacts.named, JSON.stringify({ href, ...detailFacts }));
  await settled();
  check('PR detail draws development over the size zones', (await page.locator('[data-chart="development"].is-mounted').count()) === 1);
  await qualifyFrame('pro pr detail', '[data-chart-id="dev"]');
  const consumerDetailFacts = await qualifyPrConfidenceState({ href, expectedFacts: detailFacts });
  await qualifyAllRepositoriesSearchDetail(href, consumerDetailFacts);
  await premium?.prDetail?.(ctx, { detailFacts: consumerDetailFacts });
  if (!premium) {
    check('without the premium extension PR detail keeps its named files as plain text and says file context is not part of this build', detailFacts.fileLinks === 0 && (await page.locator('#h-ctx1, #h-recent, #h-ow').count()) === 0 && (await page.evaluate(() => /File context is not part of this build/u.test(document.body.innerText))));
    await shot('community-pr-detail');
  }
  await qualifyDetailRefusals();

  await premium?.files?.(ctx);
  if (!premium) {
    await go('/files?s=%40parser-guild&per=90d');
    check('without the premium extension Files tells an entitled reader that file history is not part of this build, with no cloud, table or card', await page.evaluate(() => /not part of this build/u.test(document.body.innerText) && document.querySelectorAll('[data-chart="cloud"], [data-chart="turnover"], .a-ftbl, .a-filecard').length === 0));
    await shot('community-files');
  }

  // keyboard: skip link, navigation and period switch are reachable and act
  await go('/');
  await page.keyboard.press('Tab');
  check('the first Tab reaches the skip link', await page.evaluate(() => document.activeElement?.textContent === 'Skip to content'));
  let reachedNav = false;
  for (let index = 0; index < 60 && !reachedNav; index++) { await page.keyboard.press('Tab'); reachedNav = await page.evaluate(() => Boolean(document.activeElement?.closest('.a-nav'))); }
  check('Tab reaches the side navigation', reachedNav);
  await page.focus('.a-nav a[href*="/prs"]');
  await Promise.all([page.waitForURL(url => new URL(url).pathname === '/prs', { timeout: 15_000 }).catch(() => {}), page.keyboard.press('Enter')]);
  check('Enter on a navigation link navigates', new URL(page.url()).pathname === '/prs', page.url());
  await page.focus('[data-period] a[href*="per=7d"]');
  await Promise.all([page.waitForURL(url => /per=7d/u.test(url.toString()), { timeout: 15_000 }).catch(() => {}), page.keyboard.press('Enter')]);
  check('the period switch is keyboard-operable', /per=7d/u.test(page.url()), page.url());
  const themeInert = await page.evaluate(() => { const control = document.querySelector('[data-theme-control]'); control?.click(); return document.documentElement.getAttribute('data-theme') === 'dark' && control?.getAttribute('aria-disabled') === 'true'; });
  check('the header theme control is inert and the App stays dark', themeInert);

  // the pathless-only repository keeps its older analyses and says what is not retained
  await go('/?s=kai-sample%2Ftree-sitter-dd&per=90d');
  check('a repository without retained named history shows analysed populations and names what is missing', await page.evaluate(() => /Analysed pull requests/u.test(document.querySelector('.a-hero-l .eb')?.textContent ?? '') && /not retained/u.test(document.body.innerText)));
  await go('/history?s=kai-sample%2Ftree-sitter-dd&per=30d');
  await settled();
  const pathlessFinalBucket = await page.locator('.a-bucketnav a').last().getAttribute('title');
  const expectedPathlessRange = await page.evaluate(() => {
    const format = value => new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
    const now = Date.now();
    return `${format(now - 86_400_000)} – ${format(now)}`;
  });
  check('pathless History keeps its calendar bucket span through the final covered date', pathlessFinalBucket === expectedPathlessRange, `${pathlessFinalBucket ?? 'no final bucket'} (expected ${expectedPathlessRange})`);
  await go('/?s=kai-sample%2Ftree-sitter-dd&per=90d');

  // ── the Manage console on Pro: capacity, repositories, settings, the message preview, Plan & funding, the return from Works, Account ──
  await proManage(ctx);
  // the accessible Manage journeys: keyboard, focus, labelled controls, live regions, 1024 and 900, the dark lock under a light preference, reduced motion
  await manageAccess(ctx, { browser, label: 'pro' });

  // sign out
  await page.click('.a-me');
  await page.click('.a-me-menu button');
  await page.waitForLoadState('networkidle');
  check('sign out returns to sign-in', new URL(page.url()).pathname === '/sign-in');
  const afterLogout = await context.request.get(`${ORIGIN}/`, { maxRedirects: 0 });
  check('the session is revoked after sign out', afterLogout.status() === 303);
  await stopWorker();

  // ── Free pass: the viewer is unfunded on the hosted offer; one shared namespace is funded by its owner ──
  await startWorker(undefined, STATE, { commercial: COMMERCIAL_FREE, allowances: { free: { private: 3, publicHistory: 10 }, proOrganisation: { private: 3 } } });
  await signIn();
  await qualifyPages('free', { pro: false });
  await freeManage(ctx);
  await go('/files');
  check('Free Files shows the bounded Pro state with a pointer to the funded namespace, not a sample', await page.evaluate(() => /File history/u.test(document.body.innerText) && !/frozen sample/iu.test(document.body.innerText) && Boolean(document.querySelector('.a-pointers a[href*="northwind-tools"]'))));
  await shot('free-files');
  await go('/files?s=%40northwind-tools&per=90d');
  await premium?.freeCollaborator?.(ctx);
  if (!premium) {
    await go('/files?s=%40northwind-tools&per=90d');
    check('without the premium extension an entitled reader is told file history is not part of this build, and nothing is shown as zero', await page.evaluate(() => /not part of this build/u.test(document.body.innerText) && document.querySelectorAll('.a-ftbl, [data-chart-provisional="cloud"]').length === 0));
    await shot('community-shared-files');
  }
  await go('/history?per=30d');
  await settled();
  check('Free History shows Merged PRs by size as a chart frame and the period comparison', (await page.locator('[data-chart="lanes"].is-mounted').count()) === 1 && (await page.locator('.a-cmp').count()) === 1 && (await page.locator('[data-chart="growth"]').count()) === 0);
  await qualifyFrame('free history', '[data-chart-id="lanes"]');

  // reduced motion: the charts still draw, without entrances or the page line
  const calm = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark', reducedMotion: 'reduce' });
  const calmPage = await calm.newPage();
  const calmStart = await calm.request.get(`${ORIGIN}/auth/start`, { maxRedirects: 0 });
  await calmPage.goto(`${ORIGIN}/auth/callback?state=${new URL(calmStart.headers().location).searchParams.get('state')}&code=${CODE}`);
  await calmPage.waitForURL(url => new URL(url).pathname === '/', { timeout: 15_000 }).catch(() => {});
  await calmPage.waitForFunction(() => !document.querySelector('[data-analytical-loading]') && [...document.querySelectorAll('[data-chart]')].every(host => host.classList.contains('is-mounted') || host.classList.contains('is-failed')) && !document.body.classList.contains('is-drawing'), null, { timeout: 25_000 }).catch(() => {});
  const calmFacts = await calmPage.evaluate(() => ({ reduced: matchMedia('(prefers-reduced-motion: reduce)').matches, charts: document.querySelectorAll('[data-chart]').length, mounted: document.querySelectorAll('[data-chart].is-mounted').length, svg: document.querySelectorAll('[data-plot] svg').length }));
  check('under reduced motion every chart still draws', calmFacts.reduced && calmFacts.charts > 0 && calmFacts.mounted === calmFacts.charts && calmFacts.svg > 0, JSON.stringify(calmFacts));
  await calmPage.screenshot({ path: join(OUT, 'free-overview-reduced-motion.png'), fullPage: true });
  await calm.close();

  // narrow width: the shell still works without horizontal overflow
  await page.setViewportSize({ width: 1024, height: 900 });
  await go('/');
  await settled();
  check('at 1024 the frame stacks without horizontal overflow and the charts resize into it', (await overflow()) <= 0 && (await page.evaluate(() => [...document.querySelectorAll('[data-plot] svg')].every(svg => svg.getBoundingClientRect().right <= document.documentElement.clientWidth + 1))), String(await overflow()));
  await shot('free-overview-1024');
  await page.setViewportSize({ width: 1440, height: 900 });

  // ── Business pass: the console's Business tabs ──
  await stopWorker();
  await startWorker(undefined, STATE, { commercial: COMMERCIAL_BUSINESS });
  await signIn();
  await qualifyPages('business', { pro: true });
  // The Free Manage pass disconnected parser-guild; the owner-funded namespace
  // retains reachable history for this subsequent analytical drill-down.
  await go('/prs?s=northwind-tools%2Fci-recipes&per=90d');
  const businessPr = await page.locator('.a-prs2 .a-pr').first().getAttribute('href');
  const businessPrResponse = await go(businessPr);
  await settled();
  check('Business PR detail opens its actual authorised route with every chart mounted', businessPrResponse.status() === 200 && await page.evaluate(() => document.querySelectorAll('h1').length === 1 && [...document.querySelectorAll('[data-chart]')].every(host => host.classList.contains('is-mounted'))));
  await shot('business-pr-detail');
  if (premium) {
    const businessFile = await page.locator('a[href^="/file/"]').first().getAttribute('href');
    const businessFileResponse = await go(businessFile);
    await settled();
    check('Business File detail resolves its opaque handle and mounts its comparison chart', businessFileResponse.status() === 200 && await page.locator('[data-chart-id="fvol"].is-mounted').count() === 1);
    await shot('business-file-detail');
  }
  // Policy publication starts idle, then its own journey deliberately holds and releases one history job.
  // Earlier Pro/Free journeys leave real queued work; keeping it would test a busy repository instead.
  await stopWorker();
  reseedState('Business policy');
  await startWorker(undefined, STATE, { commercial: COMMERCIAL_BUSINESS });
  await signIn();
  await businessManage(ctx);
  await manageAccess(ctx, { browser, label: 'business' });

  // ── Delegate pass: northwind-tools' GitHub administrators named ada-sample Account administrator; GitHub gives her read on ci-recipes ──
  await stopWorker();
  executeLocal("INSERT INTO delegations (account_id, user_id, login, role, repositories_json, granted_at, granted_by) VALUES (7002, 123, 'ada-sample', 'account-admin', NULL, '2026-10-10T09:00:00.000Z', 999)", STATE);
  // parser-guild's automatic setup was chosen by kai-sample as Account administrator, who no longer is one; it held a new repository.
  executeLocal("INSERT INTO automatic_setup (account_id, policy_id, enable_execution, writer_declared, saved_at, actor_id, actor_login, actor_role) VALUES (7001, NULL, 1, 1, '2026-10-09T09:00:00.000Z', 456, 'kai-sample', 'account-admin')", STATE);
  // northwind-tools keeps the setting old-owner chose as its administrator on GitHub before leaving: the namespace's, not theirs.
  executeLocal("INSERT INTO automatic_setup (account_id, policy_id, enable_execution, writer_declared, saved_at, actor_id, actor_login, actor_role) VALUES (7002, NULL, 1, 1, '2026-10-01T09:00:00.000Z', 999, 'old-owner', 'owner')", STATE);
  executeLocal(`INSERT INTO administrative_events (at, account_id, repository_id, where_text, actor_kind, actor_id, actor_login, what, result, reason, detail_json) VALUES ('2026-10-09T10:00:00.000Z', 7001, 1003, 'repository 1003', 'automation', 456, 'kai-sample', 'Automatic setup of a newly granted repository', 'failed', 'kai-sample chose automatic setup as Account administrator and is no longer one here. Choose it again. The repository waits for a person; nothing was set up.', '{"installationId":10,"held":"chooser-authority"}')`, STATE);
  github.state.push.set(1006, false);
  await startWorker(undefined, STATE, { commercial: COMMERCIAL_BUSINESS });
  await signIn();
  await delegateManage({ ...ctx, github });
  github.state.push.clear();
  if (premium) await setupRecovery(ctx);
  }

  // ── Participation pass: a beta participant, the survey and the reward against the stand-in ──
  await stopWorker();
  await startWorker(undefined, STATE, { commercial: COMMERCIAL_BETA, participation: QA_CAMPAIGN });
  await signIn();
  await go('/');
  check('running repositories alone are setup, not use: no invitation before a managed operation finished', (await page.locator('[data-invitation]').count()) === 0);
  // A pull-request operation on ada-sample/dotfiles that failed during beta access: meaningful use, failure included.
  await stopWorker();
  await recordLocalDelivery(STATE, { repositoryId: 1004, installationId: 9, state: 'terminal', code: 'E_GITHUB_FORBIDDEN' });
  // The loopback Works stand-in has no signed commercial-link rows. Seed the minimal fact maintenance preserves;
  // the actual before-prune path, funding window and any-prior-outcome query are exercised against native D1 tests.
  executeLocal(`INSERT INTO participation_prompts (user_id, campaign_key, campaign_version, use_observed_at) VALUES (123, '${QA_CAMPAIGN.key}', ${QA_CAMPAIGN.version}, '${new Date().toISOString()}')`, STATE);
  await startWorker(undefined, STATE, { commercial: COMMERCIAL_BETA, participation: QA_CAMPAIGN });
  await signIn();
  await participationJourney(ctx);

  for (const [state, unlimited] of [['queued', false], ['expired', false], ['queued', true]]) {
    await stopWorker();
    await startWorker(undefined, STATE, { commercial: { ...COMMERCIAL_REWARD_ONLY,
      fundedComponents: COMMERCIAL_REWARD_ONLY.fundedComponents.map(component => ({ ...component, state, application_deadline: unlimited ? null : component.application_deadline })) },
      allowances: { free: { private: unlimited ? null : 3, publicHistory: unlimited ? null : 10 }, proOrganisation: { private: 3 } } });
    await signIn();
    await rewardOnlyJourney(ctx, state, { unlimited });
  }

  await stopWorker();
  executeLocal(`INSERT INTO commercial_links (link_id, product_account, works_account, state, established_at, updated_at) VALUES ('${NULLABLE_LINK}', 123, '77', 'active', '2026-10-02T00:00:00Z', '2026-10-02T00:00:00Z')`, STATE);
  // The native page consumer requires an HTTPS continuation even on loopback. This fixture is never opened: no client/callback is configured.
  await startWorker(undefined, STATE, { signingKey: NULLABLE_SIGNING_KEY });
  await signIn();
  await nullableReceiverJourney(ctx);

  if (DENSE && !PARTICIPATION_ONLY) {
    // ── dense pass: a scaled fixture, for the cloud's packing time and the dense charts ──
    await stopWorker();
    setScale(4);
    github = createFakeGitHub();
    // Seeded in a fresh process: a second in-process Miniflare after the first one's disposal failed its proxy fetch intermittently.
    const seedRun = spawnSync(process.execPath, [resolve('apps/app/qa/seed.mjs'), DENSE_STATE, '--scale', '4'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    if (seedRun.status !== 0) throw new Error(`dense seeding failed:\n${seedRun.stdout}\n${seedRun.stderr}`);
    const dense = { written: JSON.parse(seedRun.stdout.trim().split(/\r?\n/u).at(-1)) };
    console.log(`Dense pass: seeded ${dense.written.written} analyses, ${dense.written.retained} analytical records.`);
    await startWorker(ENTITLEMENT_FIXTURE, DENSE_STATE);
    await signIn();
    for (const [name, path] of [['overview', '/?s=%40parser-guild&per=90d'], ['files', '/files?s=%40parser-guild&per=90d'], ['history', '/history?s=%40parser-guild&per=90d']]) {
      const started = Date.now();
      await go(path);
      await settled(60_000);
      const facts = await pageFacts();
      const timings = await page.evaluate(() => ({ charts: window.__diffdevilCharts?.timings ?? [], cloud: window.__diffdevilCharts?.cloud() ?? [], words: document.querySelectorAll('.cl-words .cl-w').length, files: document.querySelectorAll('.a-ftbl tbody tr').length }));
      chartTelemetry.push({ label: 'dense', page: path, wall: Date.now() - started, ...timings });
      check(`dense ${name} mounts every chart (${facts.mounted} of ${facts.charts}) within the wait`, facts.charts > 0 && facts.mounted === facts.charts && facts.failed === 0 && !facts.drawing, JSON.stringify({ charts: facts.charts, mounted: facts.mounted, failed: facts.failed, wall: Date.now() - started }));
      if (name === 'files') check(`dense files packs ${timings.words} words in its layout route`, timings.words >= 40 && timings.cloud.length > 0, JSON.stringify(timings.cloud));
      await shot(`dense-${name}`);
    }
    setScale(1);
  }

  // Run the plan-choice return journey from a clean seed after the other Manage journeys, so its intentional saved
  // choice and repository effects cannot change their starting fixture.
  await stopWorker();
  reseedState('Manage return');
  await startWorker(undefined, STATE, { commercial: COMMERCIAL_PRO });
  await signIn();
  await planChoiceReturn(ctx);

  }
  check('no console errors', consoleErrors.length === 0, consoleErrors.slice(0, 5).join(' | '));
  check('no page errors', pageErrors.length === 0, pageErrors.slice(0, 5).join(' | '));
  check('no external requests left the loopback', external.length === 0, external.slice(0, 5).join(' | '));
} catch (error) {
  failures.push(`harness: ${error?.stack ?? error}${error?.cause ? `\n  cause: ${error.cause?.code ?? ''} ${error.cause?.message ?? error.cause}` : ''}`);
} finally {
  await browser.close().catch(() => {});
  await stopWorker();
  githubServer.closeAllConnections?.();
  githubServer.close();
}
await writeFile(join(OUT, 'results.json'), JSON.stringify({ origin: ORIGIN, scope: EXPLICIT_READER_ONLY ? 'explicit-reader' : FILES_QUERY_ONLY ? 'files-query' : LOADING_ONLY ? 'loading' : ADMISSION_ONLY ? 'admission' : BUSINESS_MANAGE_ONLY ? 'business-manage' : PR_FILES_ONLY ? 'pr-files-table' : THUMB_ONLY ? 'thumb' : PR_CONFIDENCE_ONLY ? 'pr-confidence-state' : PR_SEARCH_DETAIL_ONLY ? 'pr-search-detail' : AUTHORITY_ONLY ? 'authority' : HISTORY_ONLY ? 'history' : IDENTITY_ONLY ? 'identity' : PARTICIPATION_ONLY ? 'participation' : 'full', target: target.name, seeded: seeded.written, dense: DENSE && !EXPLICIT_READER_ONLY && !FILES_QUERY_ONLY && !LOADING_ONLY && !ADMISSION_ONLY && !BUSINESS_MANAGE_ONLY && !PR_FILES_ONLY && !THUMB_ONLY && !PR_CONFIDENCE_ONLY && !PR_SEARCH_DETAIL_ONLY && !PARTICIPATION_ONLY && !IDENTITY_ONLY && !AUTHORITY_ONLY && !HISTORY_ONLY, charts: chartTelemetry, results, failures, consoleErrors, pageErrors, external }, null, 2));
await writeFile(join(OUT, 'worker.log'), workerLog);
console.log(`${PARTICIPATION_ONLY ? 'Participation: ' : ''}${results.filter(result => result.ok).length} of ${results.length} checks passed; screenshots and results in ${OUT}`);
if (failures.length) { console.error(failures.map(failure => ` ✗ ${failure}`).join('\n')); process.exit(1); }
process.exit(0);
