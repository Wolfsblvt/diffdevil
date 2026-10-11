// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * Local browser qualification of the built signed-in App (artifacts/app/dist).
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
 * cloud's layout timings. Results and screenshots go to artifacts/app/qa/. This proves local
 * behaviour against a fixture; it proves no deployment, no live GitHub and no real data.
 */
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { once } from 'node:events';
import { join, resolve } from 'node:path';
import { createFakeGitHub, CODE, ENTITLEMENT_FIXTURE, setScale } from './fixture.mjs';
import { seedLocalState, executeLocal, recordLocalDelivery } from './seed.mjs';
import { proManage, freeManage, businessManage, delegateManage, setupRecovery, manageAccess, COMMERCIAL_PRO, COMMERCIAL_FREE, COMMERCIAL_BUSINESS } from './manage.mjs';
import { participationJourney, COMMERCIAL_BETA, QA_CAMPAIGN } from './participation.mjs';

const OUT = resolve('artifacts/app/qa');
const APP_PORT = Number(process.env.DIFFDEVIL_APP_QA_PORT ?? 4412);
const GITHUB_PORT = Number(process.env.DIFFDEVIL_APP_QA_GITHUB_PORT ?? 4433);
// Chromium accepts Secure (__Host-) cookies from http://localhost, not from a loopback IP, so the browser origin is localhost; the Worker still binds 127.0.0.1.
const ORIGIN = `http://localhost:${APP_PORT}`;
const PROBE = `http://127.0.0.1:${APP_PORT}`;
const CONFIG = resolve('artifacts/app/dist/server/wrangler.json');
const DENSE = process.env.DIFFDEVIL_APP_QA_DENSE === '1';
const PARTICIPATION_ONLY = process.argv.includes('--participation');
const STATE = resolve('artifacts/app/state');
const DENSE_STATE = resolve('artifacts/app/state-dense');
const chartTelemetry = [];

if (!existsSync(CONFIG)) { console.error('Build the App first: npm run app:build'); process.exit(2); }
// The build records which edition it is (tools/app-command.mjs). The Community journeys always run; the premium journeys run only
// against a build that joined the premium extension, and a Community build asserts the truthful absent states instead.
const EDITION = resolve('artifacts/app/edition.json');
if (!existsSync(EDITION)) { console.error('The build carries no edition record; rebuild with npm run app:build.'); process.exit(2); }
const edition = JSON.parse(readFileSync(EDITION, 'utf8'));
const premium = edition.premium && edition.qa ? (await import(pathToFileURL(resolve(edition.qa)).href)).default : null;
console.log(`Qualifying the ${premium ? 'premium-joined' : 'Community'} build (${edition.reason}).`);
// A local variables file copied into the build output would silently override the pass's --var flags.
for (const stale of [resolve('apps/app/.dev.vars'), resolve('artifacts/app/dist/server/.dev.vars')]) if (existsSync(stale)) { console.error(`Refusing to run with a local variables file in place: ${stale}`); process.exit(2); }
// The dense pass seeds a four-times larger fixture through the real engine, which takes its own minutes.
const MINUTES = DENSE ? 40 : 15;
const deadline = setTimeout(() => { console.error(`QA exceeded its ${MINUTES}-minute deadline.`); process.exit(3); }, MINUTES * 60_000);
deadline.unref();
await mkdir(OUT, { recursive: true });

const results = [], failures = [];
const check = (name, condition, detail = '') => { results.push({ name, ok: Boolean(condition), detail }); if (!condition) failures.push(`${name}${detail ? ` — ${detail}` : ''}`); console.log(`${condition ? '✓' : '✗'} ${name}${condition ? '' : ` — ${detail}`}`); };

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

const seeded = await seedLocalState(STATE);
console.log(`Seeded ${seeded.written.written} analyses, ${seeded.written.retained} analytical records and ${seeded.written.observations} size observations into local D1 state.`);

/** Local Worker variables as --var flags: fixture values only, never real credentials. `commercial` is the loopback Works stand-in's spec. */
function workerVars(entitlement, { commercial, allowances, participation } = {}) {
  const vars = { APP_ORIGIN: ORIGIN, GITHUB_API_BASE: `http://127.0.0.1:${GITHUB_PORT}`, GITHUB_OAUTH_BASE: `http://127.0.0.1:${GITHUB_PORT}`, GITHUB_OAUTH_CLIENT_ID: 'fixture-client', GITHUB_OAUTH_CLIENT_SECRET: 'fixture-secret-private', APP_SEAL_KEY: 'fixture-seal-key-with-enough-length', APP_SESSION_DAYS: '30', GITHUB_WEBHOOK_SECRET: 'fixture-webhook-secret',
    ...(entitlement ? { APP_ENTITLEMENT_FIXTURE: JSON.stringify(entitlement) } : {}), ...(commercial ? { APP_COMMERCIAL_FIXTURE: JSON.stringify(commercial) } : {}), ...(allowances ? { APP_PLAN_ALLOWANCES: JSON.stringify(allowances) } : {}), ...(participation ? { APP_PARTICIPATION_CAMPAIGN: JSON.stringify(participation) } : {}) };
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
/** Whoever listens on the App port: the spawned tree, or a survivor of an earlier run. */
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
  for (let attempt = 0; attempt < 30; attempt++) {
    const pids = listenersOn(port);
    if (pids.length === 0) return;
    for (const pid of pids) killTree(pid);
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error(`Port ${port} is still held by another process.`);
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

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
const consoleErrors = [], pageErrors = [], external = [];
context.on('page', page => {
  // A deliberately requested 404 (the refused repository or handle) is not a console error worth failing on.
  page.on('console', message => { if (message.type() === 'error' && !(/status of 404/u.test(message.text()) && /\/pr\/someone\/else\/|\/file\/.*\/not-a-locator/u.test(page.url()))) consoleErrors.push(`${page.url()} ${message.text()}`); });
  page.on('pageerror', error => pageErrors.push(`${page.url()} ${error.message}`));
  page.on('request', request => { const url = new URL(request.url()); if (!['127.0.0.1', 'localhost'].includes(url.hostname)) external.push(request.url()); });
});
const page = await context.newPage();
const go = (path, options = {}) => page.goto(/^https?:/u.test(path) ? path : `${ORIGIN}${path}`, { waitUntil: 'networkidle', ...options });
const shot = name => page.screenshot({ path: join(OUT, `${name}.png`), fullPage: true });
const ctx = { check, go, page, shot, ORIGIN, OUT, settled, qualifyFrame, qualifyCloud, premium: Boolean(premium), signIn: () => signIn() };
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
  try { await page.waitForFunction(() => [...document.querySelectorAll('[data-chart]')].every(host => host.classList.contains('is-mounted') || host.classList.contains('is-failed')) && !document.body.classList.contains('is-drawing') && !document.querySelector('.cl.is-busy'), null, { timeout }); } catch { /* reported by the facts */ }
  await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 150)));
}
const geometry = selector => page.evaluate(selector => { const host = document.querySelector(selector); if (!host) return null; const readout = host.querySelector('[data-readout]'), plot = host.querySelector('[data-plot]'); return { readout: Math.round(readout.getBoundingClientRect().height), plotTop: Math.round(plot.getBoundingClientRect().top + window.scrollY), plotHeight: Math.round(plot.getBoundingClientRect().height), when: readout.querySelector('.fr-when b')?.textContent ?? '', vals: readout.querySelectorAll('.fr-vals dd').length, overflowing: readout.scrollWidth > readout.clientWidth + 1 }; }, selector);

/** The F1 contract on one frame: the readout stays 66 px and the plot never moves under keyboard focus, pin and clear; the table view carries rows; the live region speaks on keyboard moves. */
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
  await page.click(`${selector} [data-view="chart"]`);
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
  const summaryBefore = await page.evaluate(selector => document.querySelector(`${selector} [data-readout]`)?.textContent ?? '', selector);
  await page.focus(`${selector} .cl-stage`);
  await page.keyboard.press('ArrowRight');
  const keyed = await page.evaluate(selector => { const host = document.querySelector(selector); return { ring: Boolean(host.querySelector('.cl-ring.on')), focus: host.querySelectorAll('.cl-w.is-focus').length, partners: host.querySelectorAll('.cl-w.is-partner').length, chips: [...host.querySelectorAll('.cl-w.is-partner .co')].filter(chip => chip.style.display === 'inline').length, readout: host.querySelector('[data-readout]')?.textContent ?? '', height: Math.round(host.querySelector('[data-readout]').getBoundingClientRect().height), announced: host.querySelector('[data-announce]')?.textContent ?? '' }; }, selector);
  check(`${label}: the keyboard walks the cloud with a focus ring, a docked readout at 66 px and an announcement`, keyed.ring && keyed.focus === 1 && keyed.height === 66 && keyed.readout !== summaryBefore && keyed.announced.length > 0, JSON.stringify({ ...keyed, readout: keyed.readout.slice(0, 80), announced: keyed.announced.slice(0, 60) }));
  check(`${label}: focusing a file lights its co-change partners with meter chips`, keyed.partners > 0 && keyed.chips === keyed.partners, JSON.stringify({ partners: keyed.partners, chips: keyed.chips }));
  await page.keyboard.press('Escape');
  await page.click(`${selector} [data-top]`);
  await page.waitForFunction(selector => document.querySelector(`${selector} .cl`)?.classList.contains('drawer-on') && !document.querySelector(`${selector} .cl`)?.classList.contains('is-busy'), selector, { timeout: 10_000 }).catch(() => {});
  const top = await page.evaluate(selector => { const host = document.querySelector(selector); const drawer = host.querySelector('.cl-drawer'); return { on: host.querySelector('.cl').classList.contains('drawer-on'), width: Math.round(drawer.getBoundingClientRect().width), rows: drawer.querySelectorAll('a[data-key]').length, stageWidth: Math.round(host.querySelector('.cl-stage').getBoundingClientRect().width), wrapWidth: Math.round(host.querySelector('.cl-wrap').getBoundingClientRect().width) }; }, selector);
  check(`${label}: Top opens as a real 300 px column and the cloud re-packs beside it`, top.on && top.width >= 290 && top.rows > 0 && top.stageWidth < top.wrapWidth - 250, JSON.stringify(top));
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
    await shot(`${label}-${name}`);
  }
  const proChips = await page.evaluate(() => [...document.querySelectorAll('.a-pn-t .a-plan')].length);
  const hints = await page.evaluate(() => document.querySelectorAll('.a-prohint').length);
  await go('/');
  check(`${label} overview shows ${premiumPanels ? 'premium panels with plan chips' : 'Free panels with bounded See Pro placeholders and no premium chips in panel titles'}`, premiumPanels ? (await page.evaluate(() => document.querySelectorAll('.a-pn-t .a-plan').length)) > 0 : (await page.evaluate(() => document.querySelectorAll('.a-pn-t .a-plan').length)) === 0, `chips=${proChips} hints=${hints}`);
  check(`${label} overview hero names its merged population from retained lifecycle`, await page.evaluate(() => /Merged pull requests/u.test(document.querySelector('.a-hero-l .eb')?.textContent ?? '')));
  await settled();
  check(`${label} overview composes the accepted rows (${premiumPanels ? 'cloud, ' : ''}Change volume, flow, time to merge by size, size mix${premiumPanels ? ', Turnover map' : ''})`, await page.evaluate(pro => { const kinds = [...document.querySelectorAll('.a-grid > [data-chart]')].map(host => host.dataset.chart); const want = pro ? ['cloud', 'mosaic', 'flow', 'ttm', 'mix', 'turnover'] : ['mosaic', 'flow', 'ttm', 'mix']; return want.every(kind => kinds.includes(kind)) && (pro || !kinds.includes('cloud')) && !document.querySelector('[data-chart-provisional]'); }, premiumPanels), await page.evaluate(() => [...document.querySelectorAll('[data-chart]')].map(host => host.dataset.chart).join(',')));
  const hero = await page.evaluate(() => ({ svg: Boolean(document.querySelector('[data-hero-plot] svg')), dl: document.querySelector('[data-hero-dl]')?.textContent ?? '' }));
  await page.focus('[data-hero-plot]'); await page.keyboard.press('ArrowLeft');
  const heroKeyed = await page.evaluate(() => document.querySelector('[data-hero-dl]')?.textContent ?? '');
  check(`${label} overview hero line draws and rewrites its delta line from the keyboard`, hero.svg && heroKeyed !== hero.dl && /by /u.test(heroKeyed), JSON.stringify({ hero, heroKeyed }));
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

try {
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
  const detailFacts = await page.evaluate(() => ({ lanes: document.querySelectorAll('.lane').length, result: document.querySelector('.a-result .big .n')?.textContent ?? '', snap: document.querySelector('.a-snap')?.textContent ?? '', files: document.querySelectorAll('#h-pf ~ * table tbody tr, .a-tbl tbody tr').length, github: Boolean(document.querySelector('a[href^="https://github.com/"]')), named: /src\/index\.ts/u.test(document.body.innerText), fileLinks: document.querySelectorAll('a[href^="/file/"]').length }));
  check('PR detail shows the result, policy lanes, freshness, named file rows and the GitHub link', detailFacts.lanes >= 3 && detailFacts.result !== '' && /analysed head/u.test(detailFacts.snap) && detailFacts.files > 0 && detailFacts.github && detailFacts.named, JSON.stringify({ href, ...detailFacts }));
  await settled();
  check('PR detail draws development over the size zones', (await page.locator('[data-chart="development"].is-mounted').count()) === 1);
  await qualifyFrame('pro pr detail', '[data-chart-id="dev"]');
  await premium?.prDetail?.(ctx, { detailFacts });
  if (!premium) {
    check('without the premium extension PR detail keeps its named files as plain text and says file context is not part of this build', detailFacts.fileLinks === 0 && (await page.locator('#h-ctx1, #h-recent, #h-ow').count()) === 0 && (await page.evaluate(() => /File context is not part of this build/u.test(document.body.innerText))));
    await shot('community-pr-detail');
  }
  const badHandle = await go('/file/parser-guild/parser-lab/not-a-locator');
  check('a malformed file handle is refused with 404', badHandle.status() === 404);
  const denied = await go('/pr/someone/else/1');
  check('a repository outside the authorised set is refused with 404, not rendered', denied.status() === 404 && (await page.evaluate(() => /Not in your repositories/u.test(document.body.innerText))));

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
  await calmPage.waitForFunction(() => [...document.querySelectorAll('[data-chart]')].every(host => host.classList.contains('is-mounted') || host.classList.contains('is-failed')) && !document.body.classList.contains('is-drawing'), null, { timeout: 25_000 }).catch(() => {});
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
  await businessManage(ctx);
  await manageAccess(ctx, { browser, label: 'business' });

  // ── Delegate pass: northwind-tools' GitHub administrators named ada-sample Account administrator; GitHub gives her read on ci-recipes ──
  await stopWorker();
  executeLocal("INSERT INTO delegations (account_id, user_id, login, role, repositories_json, granted_at, granted_by) VALUES (7002, 123, 'ada-sample', 'account-admin', NULL, '2026-10-10T09:00:00.000Z', 999)", STATE);
  // parser-guild's automatic setup was chosen by kai-sample as Account administrator, who no longer is one; it held a new repository.
  executeLocal("INSERT INTO automatic_setup (account_id, policy_id, enable_execution, writer_declared, saved_at, actor_id, actor_login, actor_role) VALUES (7001, NULL, 1, 1, '2026-10-09T09:00:00.000Z', 456, 'kai-sample', 'account-admin')", STATE);
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
await writeFile(join(OUT, 'results.json'), JSON.stringify({ origin: ORIGIN, scope: PARTICIPATION_ONLY ? 'participation' : 'full', seeded: seeded.written, dense: DENSE && !PARTICIPATION_ONLY, charts: chartTelemetry, results, failures, consoleErrors, pageErrors, external }, null, 2));
await writeFile(join(OUT, 'worker.log'), workerLog);
console.log(`${PARTICIPATION_ONLY ? 'Participation: ' : ''}${results.filter(result => result.ok).length} of ${results.length} checks passed; screenshots and results in ${OUT}`);
if (failures.length) { console.error(failures.map(failure => ` ✗ ${failure}`).join('\n')); process.exit(1); }
process.exit(0);
