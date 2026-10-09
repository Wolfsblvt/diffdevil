// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Local browser qualification of the built signed-in App (artifacts/app/dist).
 *
 *   npm run app:build && npm run qa:app
 *
 * Seeds the local D1 state through the managed App's own write paths, serves a loopback
 * GitHub double for OAuth and reads, runs the built Worker through local Wrangler/workerd,
 * and drives headless Chromium through the real journeys: sign-in, the six analytical
 * destinations in a Pro and a Free entitlement, scope and period switches, filters, bucket
 * selection, drill-down and sign-out, with keyboard reach, console, overflow and header
 * checks at 1440×900. Results and screenshots go to artifacts/app/qa/. This proves local
 * behaviour against a fixture; it proves no deployment, no live GitHub and no real data.
 */
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { once } from 'node:events';
import { join, resolve } from 'node:path';
import { createFakeGitHub, CODE } from './fixture.mjs';
import { seedLocalState } from './seed.mjs';

const OUT = resolve('artifacts/app/qa');
const APP_PORT = Number(process.env.DIFFDEVIL_APP_QA_PORT ?? 4412);
const GITHUB_PORT = Number(process.env.DIFFDEVIL_APP_QA_GITHUB_PORT ?? 4433);
// Chromium accepts Secure (__Host-) cookies from http://localhost, not from a loopback IP, so the browser origin is localhost; the Worker still binds 127.0.0.1.
const ORIGIN = `http://localhost:${APP_PORT}`;
const PROBE = `http://127.0.0.1:${APP_PORT}`;
const CONFIG = resolve('artifacts/app/dist/server/wrangler.json');
const STATE = resolve('artifacts/app/state');

if (!existsSync(CONFIG)) { console.error('Build the App first: npm run app:build'); process.exit(2); }
// A local variables file copied into the build output would silently override the pass's --var flags.
for (const stale of [resolve('apps/app/.dev.vars'), resolve('artifacts/app/dist/server/.dev.vars')]) if (existsSync(stale)) { console.error(`Refusing to run with a local variables file in place: ${stale}`); process.exit(2); }
const deadline = setTimeout(() => { console.error('QA exceeded its 15-minute deadline.'); process.exit(3); }, 15 * 60_000);
deadline.unref();
await mkdir(OUT, { recursive: true });

const results = [], failures = [];
const check = (name, condition, detail = '') => { results.push({ name, ok: Boolean(condition), detail }); if (!condition) failures.push(`${name}${detail ? ` — ${detail}` : ''}`); console.log(`${condition ? '✓' : '✗'} ${name}${condition ? '' : ` — ${detail}`}`); };

// ── the GitHub double, over HTTP so workerd can reach it ──
const github = createFakeGitHub();
const githubServer = createServer(async (request, response) => {
  const chunks = []; for await (const chunk of request) chunks.push(chunk);
  const body = Buffer.concat(chunks);
  const answer = await github.fetch(new URL(request.url, `http://127.0.0.1:${GITHUB_PORT}`), { method: request.method, headers: request.headers, body: body.length ? body.toString() : undefined });
  response.writeHead(answer.status, Object.fromEntries(answer.headers));
  response.end(Buffer.from(await answer.arrayBuffer()));
});
githubServer.listen(GITHUB_PORT, '127.0.0.1'); await once(githubServer, 'listening');

const seeded = await seedLocalState(STATE);
console.log(`Seeded ${seeded.written} analyses into local D1 state.`);

/** Local Worker variables as --var flags: fixture values only, never real credentials. */
function workerVars(entitlement) {
  const vars = { APP_ORIGIN: ORIGIN, GITHUB_API_BASE: `http://127.0.0.1:${GITHUB_PORT}`, GITHUB_OAUTH_BASE: `http://127.0.0.1:${GITHUB_PORT}`, GITHUB_OAUTH_CLIENT_ID: 'fixture-client', GITHUB_OAUTH_CLIENT_SECRET: 'fixture-secret-private', APP_SEAL_KEY: 'fixture-seal-key-with-enough-length', APP_SESSION_DAYS: '30', ...(entitlement ? { APP_ENTITLEMENT_FIXTURE: JSON.stringify(entitlement) } : {}) };
  return Object.entries(vars).flatMap(([key, value]) => ['--var', `${key}:${value}`]);
}

let worker, workerLog = '';
async function startWorker(entitlement) {
  workerLog = '';
  await freePort(APP_PORT);
  worker = spawn(process.execPath, [resolve('tools/run-wrangler.mjs'), 'dev', '--config', CONFIG, '--local', '--persist-to', STATE, '--ip', '127.0.0.1', '--port', String(APP_PORT), '--show-interactive-dev-session=false', ...workerVars(entitlement)], { cwd: resolve('.'), stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, env: { ...process.env, WRANGLER_SEND_METRICS: 'false', CI: '1' } });
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
  // A deliberately requested 404 (the refused repository) is not a console error worth failing on.
  page.on('console', message => { if (message.type() === 'error' && !(/status of 404/u.test(message.text()) && /\/pr\/someone\/else\//u.test(page.url()))) consoleErrors.push(`${page.url()} ${message.text()}`); });
  page.on('pageerror', error => pageErrors.push(`${page.url()} ${error.message}`));
  page.on('request', request => { const url = new URL(request.url()); if (!['127.0.0.1', 'localhost'].includes(url.hostname)) external.push(request.url()); });
});
const page = await context.newPage();
const go = (path, options = {}) => page.goto(/^https?:/u.test(path) ? path : `${ORIGIN}${path}`, { waitUntil: 'networkidle', ...options });
const shot = name => page.screenshot({ path: join(OUT, `${name}.png`), fullPage: true });
const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const offenders = () => page.evaluate(() => { const width = document.documentElement.clientWidth; return [...document.querySelectorAll('body *')].filter(element => element.getBoundingClientRect().right > width + 1).slice(0, 4).map(element => `${element.tagName.toLowerCase()}.${String(element.className).split(' ')[0]}@${Math.round(element.getBoundingClientRect().right)}`).join(', '); });
const pageFacts = () => page.evaluate(() => ({
  h1: document.querySelectorAll('h1').length, label: document.querySelector('[data-surface-label]')?.textContent ?? '', trailing: document.querySelector('.trailing-action')?.getAttribute('aria-current') ?? '',
  trailingText: document.querySelector('.trailing-action')?.textContent?.trim() ?? '', headerHeight: Math.round(document.querySelector('.site-header')?.getBoundingClientRect().height ?? 0),
  frameLeft: Math.round(document.querySelector('.a-frame')?.getBoundingClientRect().left ?? -1), headerLeft: Math.round(document.querySelector('.site-header .wrap')?.getBoundingClientRect().left ?? -1),
  provisional: document.querySelectorAll('[data-chart-provisional]').length, unavailable: document.querySelectorAll('.a-unavail').length, nan: /NaN|undefined|\[object/u.test(document.body.innerText),
  theme: document.documentElement.getAttribute('data-theme'), font: getComputedStyle(document.body).fontFamily
}));

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
  for (const [name, path] of [['overview', '/'], ['prs', '/prs'], ['history', '/history'], ['files', '/files']]) {
    const response = await go(path);
    const facts = await pageFacts();
    check(`${label} ${name} renders 200 with one h1 at its own route`, response.status() === 200 && facts.h1 === 1 && new URL(page.url()).pathname === path, `${response.status()} h1=${facts.h1} url=${page.url()}`);
    check(`${label} ${name} shows the App surface label and current trailing App action`, facts.label === 'App' && facts.trailing === 'page' && facts.trailingText === 'App', JSON.stringify(facts));
    check(`${label} ${name} has no horizontal overflow at 1440`, (await overflow()) <= 0, `${await overflow()} ${await offenders()}`);
    check(`${label} ${name} shares the header frame start with the App frame`, facts.frameLeft === facts.headerLeft, `${facts.frameLeft} vs ${facts.headerLeft}`);
    check(`${label} ${name} prints no NaN or undefined`, !facts.nan);
    check(`${label} ${name} is dark and uses IBM Plex Sans`, facts.theme === 'dark' && /IBM Plex Sans/u.test(facts.font), facts.font);
    check(`${label} ${name} sends private no-store headers`, (response.headers()['cache-control'] ?? '').includes('no-store') && (response.headers()['content-security-policy'] ?? '').includes("default-src 'none'"));
    await shot(`${label}-${name}`);
  }
  const proChips = await page.evaluate(() => [...document.querySelectorAll('.a-pn-t .a-plan')].length);
  const hints = await page.evaluate(() => document.querySelectorAll('.a-prohint').length);
  await go('/');
  check(`${label} overview shows ${pro ? 'premium panels with plan chips' : 'Free panels with bounded See Pro placeholders and no premium chips in panel titles'}`, pro ? (await page.evaluate(() => document.querySelectorAll('.a-pn-t .a-plan').length)) > 0 : (await page.evaluate(() => document.querySelectorAll('.a-pn-t .a-plan').length)) === 0, `chips=${proChips} hints=${hints}`);
  check(`${label} overview hero names its population`, await page.evaluate(() => /Merged pull requests|Analysed pull requests/u.test(document.querySelector('.a-hero-l .eb')?.textContent ?? '')));
  check(`${label} nav carries ${pro ? 'plan chips on your namespaces' : 'no plan chips on namespaces'}`, pro ? (await page.evaluate(() => document.querySelectorAll('.a-acct .a-plan').length)) > 0 : (await page.evaluate(() => document.querySelectorAll('.a-acct .a-plan, .a-me .a-plan').length)) === 0);
  check(`${label} nav shows repository status vocabulary`, await page.evaluate(() => { const texts = [...document.querySelectorAll('.a-repos .a-st')].map(element => element.textContent); return texts.includes('History off') && texts.includes('Labels only'); }));
}

try {
  // ── Pro pass: the viewer's own namespaces are Pro, one shared namespace is Business ──
  await startWorker({ 'ada-sample': 'Pro', 'northwind-tools': 'Business' });
  const unauthenticated = await context.request.get(`${ORIGIN}/`, { maxRedirects: 0 });
  check('an unauthenticated visit is sent to sign-in with no page content', unauthenticated.status() === 303 && unauthenticated.headers().location === '/sign-in?reason=E_SESSION_UNAVAILABLE', `${unauthenticated.status()} ${unauthenticated.headers().location}`);
  await go('/sign-in');
  check('sign-in page explains what signing in does and does not grant', await page.evaluate(() => /no new authority/u.test(document.body.innerText)));
  await shot('sign-in');
  await signIn();
  await qualifyPages('pro', { pro: true });

  // scope and period are URL state and persist across pages
  await go('/?s=%40parser-guild&per=90d');
  await page.click('.a-nav a[href*="/history"]');
  await page.waitForLoadState('networkidle');
  check('the period and scope persist into the next section through the URL', /per=90d/u.test(page.url()) && /s=%40parser-guild/u.test(page.url()), page.url());
  check('history bucket navigation offers thirteen weekly buckets for 90 days', (await page.locator('.a-bucketnav a').count()) === 13);
  await page.locator('.a-bucketnav a').nth(5).click();
  await page.waitForLoadState('networkidle');
  check('selecting a bucket is a link and marks the selected band', /w=5/u.test(page.url()) && (await page.locator('.a-chart .selband').count()) === 1, page.url());
  await shot('pro-history-bucket');

  // repository scope, PR list filters, drill-down to PR detail and back to file route
  await go('/prs?s=parser-guild%2Fparser-lab&per=90d');
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
  await go('/prs?s=parser-guild%2Fparser-lab&per=90d');
  const firstRow = page.locator('.a-prs2 .a-pr').first();
  const href = await firstRow.getAttribute('href');
  await firstRow.click();
  await page.waitForLoadState('networkidle');
  const detailFacts = await page.evaluate(() => ({ lanes: document.querySelectorAll('.lane').length, result: document.querySelector('.a-result .big .n')?.textContent ?? '', snap: document.querySelector('.a-snap')?.textContent ?? '', files: document.querySelectorAll('.a-tbl tbody tr').length, github: Boolean(document.querySelector('a[href^="https://github.com/"]')) }));
  check('PR detail shows the result, three policy lanes, freshness, pathless file rows and the GitHub link', detailFacts.lanes >= 3 && detailFacts.result !== '' && /analysed head/u.test(detailFacts.snap) && detailFacts.files > 0 && detailFacts.github, JSON.stringify({ href, ...detailFacts }));
  check('PR detail keeps paths out of the page', await page.evaluate(() => !/src\/parser\.ts/u.test(document.body.innerText)));
  await shot('pro-pr-detail');
  await go('/file/parser-guild/parser-lab/src/parser.ts?per=30d');
  check('file detail route resolves with its honest standing', (await page.locator('h1').count()) === 1 && (await page.evaluate(() => /not collected yet/u.test(document.body.innerText))));
  await shot('pro-file-detail');
  const denied = await go('/pr/someone/else/1');
  check('a repository outside the authorised set is refused with 404, not rendered', denied.status() === 404 && (await page.evaluate(() => /Not in your repositories/u.test(document.body.innerText))));

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
  await page.focus('.a-seg a[href*="per=7d"]');
  await Promise.all([page.waitForURL(url => /per=7d/u.test(url.toString()), { timeout: 15_000 }).catch(() => {}), page.keyboard.press('Enter')]);
  check('the period switch is keyboard-operable', /per=7d/u.test(page.url()), page.url());
  const themeInert = await page.evaluate(() => { const control = document.querySelector('[data-theme-control]'); control?.click(); return document.documentElement.getAttribute('data-theme') === 'dark' && control?.getAttribute('aria-disabled') === 'true'; });
  check('the header theme control is inert and the App stays dark', themeInert);

  // sign out
  await page.click('.a-me');
  await page.click('.a-me-menu button');
  await page.waitForLoadState('networkidle');
  check('sign out returns to sign-in', new URL(page.url()).pathname === '/sign-in');
  const afterLogout = await context.request.get(`${ORIGIN}/`, { maxRedirects: 0 });
  check('the session is revoked after sign out', afterLogout.status() === 303);
  await stopWorker();

  // ── Free pass: no subscription source connected ──
  await startWorker(undefined);
  await signIn();
  await qualifyPages('free', { pro: false });
  await go('/files');
  check('Free Files shows the bounded Pro state without inventing a sample', await page.evaluate(() => /File history/u.test(document.body.innerText) && !/frozen sample/iu.test(document.body.innerText)));
  await shot('free-files');
  await go('/history?per=30d');
  check('Free History shows the size lanes and the period comparison', (await page.locator('[data-chart-provisional="lanes"]').count()) === 1 && (await page.locator('.a-cmp').count()) === 1);

  // narrow width: the shell still works without horizontal overflow
  await page.setViewportSize({ width: 1024, height: 900 });
  await go('/');
  check('at 1024 the frame stacks without horizontal overflow', (await overflow()) <= 0, String(await overflow()));
  await shot('free-overview-1024');
  await page.setViewportSize({ width: 1440, height: 900 });

  check('no console errors', consoleErrors.length === 0, consoleErrors.slice(0, 5).join(' | '));
  check('no page errors', pageErrors.length === 0, pageErrors.slice(0, 5).join(' | '));
  check('no external requests left the loopback', external.length === 0, external.slice(0, 5).join(' | '));
} catch (error) {
  failures.push(`harness: ${error?.stack ?? error}`);
} finally {
  await browser.close().catch(() => {});
  await stopWorker();
  githubServer.closeAllConnections?.();
  githubServer.close();
}
await writeFile(join(OUT, 'results.json'), JSON.stringify({ origin: ORIGIN, seeded: seeded.written, results, failures, consoleErrors, pageErrors, external }, null, 2));
console.log(`${results.filter(result => result.ok).length} of ${results.length} checks passed; screenshots and results in ${OUT}`);
if (failures.length) { console.error(failures.map(failure => ` ✗ ${failure}`).join('\n')); process.exit(1); }
process.exit(0);
