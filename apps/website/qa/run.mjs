// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Local browser qualification of the built website (artifacts/website/dist).
 *
 *   npm run website:build && npm run qa:website
 *
 * Serves the static output, runs the real playground application server against the
 * in-memory fake GitHub fixture on the API port the site was built for, and drives
 * headless Chromium through the accepted interactions: theme, clipboard, Agents cards,
 * homepage PR hand-off, playground views/controls/editor/export/deep links/error states,
 * docs shell, narrow layout, and page-level invariants (Impressum link, no external
 * requests, no console errors). Results and screenshots go to artifacts/website/qa/.
 * This proves local behaviour; it does not prove a deployment.
 */
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { once } from 'node:events';
import { join, extname } from 'node:path';
import { GitHubClient } from '../../../dist/lib/index.js';
import { FakeGitHub } from '../../../src/diffdevil/tests/helpers/github.mjs';
import { createPlaygroundServer } from '../../playground/server.mjs';
import { replayPublicPullRequest } from '../../playground/app.mjs';

const DIST = 'artifacts/website/dist';
const OUT = 'artifacts/website/qa';
const SITE_PORT = 4399, API_PORT = 4173;
const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json', '.md': 'text/markdown', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain' };
await mkdir(OUT, { recursive: true });

const site = createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  try { const body = await readFile(join(DIST, p)); res.writeHead(200, { 'content-type': types[extname(p)] ?? 'application/octet-stream' }); res.end(body); }
  catch { const body = await readFile(join(DIST, '404.html')).catch(() => ''); res.writeHead(404, { 'content-type': 'text/html' }); res.end(body); }
});
site.listen(SITE_PORT, '127.0.0.1'); await once(site, 'listening');
const fake = new FakeGitHub();
const apiClient = () => new GitHubClient({ fetch: fake.fetch, readRetries: 0 });
// The next replay request can be held back on demand so a cancel-then-late-success can be exercised.
let holdNextReplayMs = 0;
const api = createPlaygroundServer({ clientFactory: apiClient, replay: async input => { const result = await replayPublicPullRequest(input, { client: apiClient() }); if (holdNextReplayMs) { const ms = holdNextReplayMs; holdNextReplayMs = 0; await new Promise(r => setTimeout(r, ms)); } return result; } });
api.listen(API_PORT, '127.0.0.1'); await once(api, 'listening');

const results = [];
const failures = [];
function check(name, condition, detail = '') { results.push({ name, ok: !!condition, detail }); if (!condition) failures.push(`${name}${detail ? ` — ${detail}` : ''}`); }

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'dark', permissions: ['clipboard-read', 'clipboard-write'] });
const consoleErrors = [], external = [], pageErrors = [];
context.on('page', page => {
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(`${page.url()} ${m.text()}`); });
  page.on('pageerror', e => pageErrors.push(`${page.url()} ${e.message}`));
  page.on('request', r => { const u = new URL(r.url()); if (!['127.0.0.1', 'localhost'].includes(u.hostname)) external.push(r.url()); });
});
const page = await context.newPage();
try {
const go = (path, opts = {}) => page.goto(`http://127.0.0.1:${SITE_PORT}${path}`, { waitUntil: 'networkidle', ...opts });
const shot = name => page.screenshot({ path: join(OUT, `${name}.png`), fullPage: true });

// ── every page: Impressum in the footer, one h1, theme script before paint ──
const pages = ['/', '/playground/', '/examples/', '/app/', '/privacy/', '/docs/', '/docs/cli/', '/docs/get-started/auto-label-pull-requests/', '/docs/security/', '/docs/licences/', '/nothing-here/'];
for (const path of pages) {
  const response = await go(path);
  const impressum = await page.locator('footer a', { hasText: 'Impressum' }).first();
  check(`${path} has an Impressum link`, await impressum.count() === 1 && (await impressum.getAttribute('href')) === 'https://wolfsblvt.com/legal-notice.html');
  check(`${path} has exactly one h1`, await page.locator('h1').count() === 1);
  if (path === '/nothing-here/') check('unknown route serves the 404 page', response.status() === 404 && (await page.locator('h1').textContent()).includes('Nothing at this address'));
  const fontFamily = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  check(`${path} uses IBM Plex Sans`, fontFamily.startsWith('"IBM Plex Sans"') || fontFamily.startsWith('IBM Plex Sans'), fontFamily);
}

// ── homepage: hero numbers are the engine's, theme menu keyboard, copy, Agents cards ──
await go('/');
await shot('home');
check('hero shows 3 changed = exact from the engine', /3\s*changed/u.test(await page.locator('.specimen-cell').first().innerText()));
check('measure section shows 178 changed', (await page.locator('#measure').innerText()).includes('178'));
await page.locator('[data-theme-button]').click();
check('theme menu opens with focus on the checked item', await page.evaluate(() => document.activeElement?.getAttribute('role') === 'menuitemradio'));
await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
check('choosing Light sets data-theme and persists', (await page.evaluate(() => document.documentElement.getAttribute('data-theme'))) === 'light' && (await page.evaluate(() => localStorage.getItem('diffdevil.theme'))) === 'light');
const accentText = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent-text').trim());
check('explicit light theme keeps --accent-text at #aa167d (cascade correction)', accentText === '#aa167d', accentText);
const machineBg = await page.evaluate(() => getComputedStyle(document.querySelector('.machine')).backgroundColor);
check('machine surfaces stay midnight in light theme', machineBg === 'rgb(12, 15, 23)', machineBg);
await shot('home-light');
await page.reload({ waitUntil: 'networkidle' });
check('theme survives reload before first paint', (await page.evaluate(() => document.documentElement.getAttribute('data-theme'))) === 'light');
await page.evaluate(() => localStorage.removeItem('diffdevil.theme'));
await page.reload({ waitUntil: 'networkidle' });
await page.locator('.install-chip').click();
check('header install chip copies the npm command', (await page.evaluate(() => navigator.clipboard.readText())) === 'npm i -D @wolfsblvt/diffdevil');
check('live region announced the copy', (await page.locator('[data-live-region]').textContent()).includes('Copied'));
const skill = page.locator('#agents-skill');
check('skill card starts closed', await skill.locator('.details-region').isHidden());
await skill.locator('.btn-primary').click();
check('Add the skill copies the instruction with the configured origin', /Install the diffdevil Agent Skill from https?:\/\/[^ ]+\/skill\/SKILL\.md/u.test(await page.evaluate(() => navigator.clipboard.readText())));
check('Add the skill opened the skill card (proactive expansion)', await skill.locator('.details-region').isVisible() && (await skill.locator('[data-disclosure]').getAttribute('aria-expanded')) === 'true');
const setup = page.locator('#agents-setup');
await setup.locator('[data-intent="cli"]').click();
check('selecting a setup chip opens the setup card and swaps the prompt', await setup.locator('.details-region').isVisible() && (await setup.locator('[data-intent-prompt]').textContent()).includes('/setup/cli.md'));
await setup.locator('[data-intent="cli"]').press('ArrowRight');
check('arrow keys move the intent selection', (await setup.locator('[data-intent="actions"]').getAttribute('aria-checked')) === 'true');
check('both cards may be open at once', await skill.locator('.details-region').isVisible() && await setup.locator('.details-region').isVisible());
await skill.locator('[data-disclosure]').click();
check('explicit disclosure closes the card', await skill.locator('.details-region').isHidden());
await go('/#agents-setup');
check('deep link #agents-setup opens the setup card', await page.locator('#agents-setup .details-region').isVisible());
await go('/');
await page.locator('#home-pr-url').fill('https://example.com/not/a/pr');
await page.locator('[data-pr-entry] button').click();
check('invalid PR URL is refused inline with role=alert, no navigation', page.url().endsWith('/') && await page.locator('[data-pr-error]').isVisible());
await page.locator('#home-pr-url').fill('https://github.com/example/repository/pull/42?diff=split');
await Promise.all([page.waitForURL(/\/playground\/\?pr=example\/repository\/42/u), page.locator('[data-pr-entry] button').click()]);
check('valid PR URL hands off to the one playground journey', page.url().includes('/playground/?pr=example/repository/42'));

// ── playground: PR mode through the real API server ──
await page.waitForSelector('.pg-primary', { timeout: 20000 });
check('PR mode analyzed through the API and shows the compact PR display', (await page.locator('.pg-analyzed').innerText()).includes('example/repository'));
check('PR mode primary result is exact 3 changed', /3\s*changed/u.test(await page.locator('.pg-primary').innerText()));
await shot('playground-pr');

// ── playground: cancel, then a late successful response must not commit ──
await go('/playground/?example=lockfile-excluded');
await page.waitForSelector('.pg-primary');
holdNextReplayMs = 2500;
await page.locator('#tab-pr').click();
await page.locator('#pg-url').fill('https://github.com/example/repository/pull/42');
await page.locator('.pg-input form button[type="submit"]').click();
await page.waitForSelector('.pg-input [role="status"]');
await page.locator('#pg-url').press('Escape');
check('Escape cancels: the spinner clears and the input is kept', (await page.locator('.pg-input [role="status"]').count()) === 0 && (await page.locator('#pg-url').inputValue()).includes('pull/42'));
await page.waitForTimeout(3200);
check('a late successful response after cancel does not commit a result', (await page.locator('.pg-analyzed').count()) === 0 && /178\s*changed/u.test(await page.locator('.pg-primary').innerText()));
await page.locator('.pg-input form button[type="submit"]').click();
await page.waitForSelector('.pg-analyzed', { timeout: 15000 });
check('re-submitting after cancel analyzes normally', /3\s*changed/u.test(await page.locator('.pg-primary').innerText()));

// ── playground: default fixture, tiles, controls, editor, export ──
await go('/playground/');
await page.waitForSelector('.pg-primary');
check('playground opens on the first fixture with a result (never blank)', (await page.locator('.pg-strip-title').innerText()).includes('Replacement counted once') && /10\s*changed/u.test(await page.locator('.pg-primary').innerText()));
check('url stays clean for the default state', page.url().endsWith('/playground/'));
const tiles = page.locator('.tile');
await tiles.nth(0).focus(); await page.keyboard.press('ArrowRight');
check('tile arrow keys select the next view', (await tiles.nth(1).getAttribute('aria-selected')) === 'true' && page.url().includes('view=agent'));
check('agent view shows the agent presenter', (await page.locator('#pg-view-panel').innerText()).includes('DIFFDEVIL REPORT'));
await page.keyboard.press('End');
check('End selects the explanation view', (await tiles.nth(3).getAttribute('aria-selected')) === 'true');
check('explanation lists rules and the readback lane as not observed', /Not observed/u.test(await page.locator('#pg-view-panel').innerText()));
await tiles.nth(2).click();
check('github preview says proposed, not applied, and shows the desired label', (await page.locator('#pg-view-panel').innerText()).includes('Proposed, not applied') && (await page.locator('#pg-view-panel').innerText()).includes('size/XS'));
await shot('playground-github');
// controls: threshold edit re-evaluates locally
const xs = page.locator('.pg-bands li').first().locator('input[type="number"]');
await xs.fill('5');
await page.waitForTimeout(150);
check('lowering the xs threshold moves the result to band s', /band s/u.test(await page.locator('.pg-result-line').innerText()) && page.url().includes('policy='));
check('the proposed label follows the edited band', (await page.locator('#pg-view-panel').innerText()).includes('size/S'));
await page.locator('.pg-patterns input').fill('**/package-lock.json');
await page.locator('.pg-patterns input').press('Enter');
await page.waitForTimeout(150);
check('adding an exclude pattern annotates matches and excludes the file', (await page.locator('.pg-patterns').innerText()).includes('matches 1 file') && (await page.locator('.pg-files tr.excluded').count()) === 1);
check('files table keeps the excluded row with strikethrough path', (await page.locator('.pg-files tr.excluded td.path').innerText()).includes('package-lock.json'));
await page.locator('.pg-controls input[type="checkbox"]').check();
await page.waitForTimeout(150);
check('turning the comment on adds a rendered owned comment to the GitHub preview', (await page.locator('#pg-view-panel').innerText()).includes('Change summary'));
// policy editor
await page.locator('.segmented button', { hasText: 'Policy' }).first().click();
await page.waitForSelector('.cm-editor', { timeout: 15000 });
check('policy editor is a real CodeMirror instance with the edited document', (await page.locator('.cm-content').innerText()).includes('package-lock.json'));
check('policy editor reports the document valid', (await page.locator('.pg-editor-status').innerText()).includes('valid'));
await page.locator('.cm-content').click();
await page.keyboard.press('Control+End');
await page.keyboard.type('\nbands: 7\n');
await page.waitForTimeout(400);
check('an invalid policy keeps the previous valid result visible and says so', (await page.locator('.pg-editor-status').innerText()).startsWith('×') && (await page.locator('.pg-primary').innerText()).match(/6\s*changed/u) && (await page.locator('.pg-strip').innerText()).includes('previous valid policy'));
await shot('playground-invalid-policy');
await page.keyboard.press('Control+Z'); await page.keyboard.press('Control+Z');
// export dialog
await page.keyboard.press('Escape');
await page.locator('.pg-views-head button').click();
await page.waitForSelector('dialog[open]');
check('export dialog opens, states read/write meaning and traps focus', (await page.locator('dialog[open]').innerText()).includes('Reads only') && await page.evaluate(() => document.querySelector('dialog[open]').contains(document.activeElement)));
await page.locator('dialog[open] [role="tab"]', { hasText: 'Complete workflow' }).click();
check('workflow export states that it writes labels', (await page.locator('dialog[open]').innerText()).includes('This workflow writes labels'));
await page.keyboard.press('Escape');
check('Escape closes the export dialog', (await page.locator('dialog[open]').count()) === 0);
// deep links and curated snapshot
await go('/playground/?example=lockfile-excluded&view=explain');
await page.waitForSelector('.pg-primary');
check('deep link opens the named fixture in the named view', /178\s*changed/u.test(await page.locator('.pg-primary').innerText()) && (await tiles.nth(3).getAttribute('aria-selected')) === 'true');
check('kept-policy block lists keys the controls cannot represent', (await page.locator('.notice-kept').innerText()).includes('scopes'));
await go('/playground/?example=diffdevil-9');
await page.waitForSelector('.pg-primary');
check('curated snapshot loads from the static catalogue with its provenance strip', (await page.locator('.pg-strip').innerText()).includes('curated snapshot') && (await page.locator('.pg-strip').innerText()).includes('Wolfsblvt/diffdevil'));
check('curated snapshot shows why this PR', (await page.locator('.pg-why').innerText()).includes('Why this PR'));
await shot('playground-snapshot');
// error state: API unreachable keeps input and previous result
api.close(); await once(api, 'close');
await page.locator('#tab-pr').click();
await page.locator('#pg-url').fill('https://github.com/example/repository/pull/42');
await page.locator('.pg-input form button[type="submit"]').click();
await page.waitForSelector('.pg-input [role="alert"]', { timeout: 15000 });
check('unreachable API yields an honest alert and keeps the input', (await page.locator('.pg-input [role="alert"]').innerText()).includes('could not be reached') && (await page.locator('#pg-url').inputValue()).includes('pull/42'));
await page.locator('#pg-url').fill('https://github.com/example/repository/issues/42');
await page.locator('.pg-input form button[type="submit"]').click();
check('non-PR URL is refused client-side without a request', (await page.locator('.pg-input [role="alert"]').innerText()).includes('Not a public github.com pull-request URL'));

// ── docs shell ──
await go('/docs/get-started/auto-label-pull-requests/');
check('docs page renders the source body with the size workflow', (await page.locator('main').innerText()).includes('pull_request_target'));
check('docs provenance row names the source and tested standing', (await page.locator('.docs-provenance').innerText()).includes('docs/guides/auto-label-pull-requests.md') && (await page.locator('.docs-provenance').innerText()).includes('Example tested'));
check('docs search is present', (await page.locator('site-search').count()) === 1);
check('docs sidebar has the manual groups', (await page.locator('.sidebar-content').textContent()).includes('Policies and detail'));
await shot('docs');
await go('/docs/recipes/policy-recipes/');
const tryIt = page.locator('a[href^="/playground/?example="]');
check('docs example links carry a Try it companion', (await tryIt.count()) > 0 && (await tryIt.first().innerText()).includes('Try it in the playground'), String(await tryIt.count()));

// ── narrow layout ──
await page.setViewportSize({ width: 390, height: 800 });
await go('/playground/');
await page.waitForSelector('.pg-primary');
check('narrow playground shows the sticky configuration bar instead of the rail', await page.locator('.pg-rail-narrow').isVisible() && await page.locator('.pg-rail-desktop').isHidden());
await page.locator('.pg-sheet-toggle').click();
check('the bottom sheet opens with the same controls', await page.locator('#pg-sheet .pg-controls').isVisible());
await shot('playground-narrow');
await go('/');
await page.locator('[data-menu-toggle]').click();
check('narrow header menu opens the navigation', await page.locator('#site-nav').isVisible());
await shot('home-narrow');
await page.setViewportSize({ width: 1280, height: 900 });

// ── repository links ──
for (const path of ['/examples/', '/app/']) {
  await go(path);
  const hrefs = await page.locator('a[href*="/blob/main"]').evaluateAll(links => links.map(a => a.getAttribute('href')));
  check(`${path} repository links carry the separator once`, hrefs.length > 0 && hrefs.every(h => h.includes('/blob/main/') && !h.includes('/blob/main//') && !/\/blob\/main[^/]/u.test(h)), hrefs.slice(0, 3).join(' '));
}
const badge = await page.goto(`http://127.0.0.1:${SITE_PORT}/github-app-logo-512.png`);
check('generated GitHub App badge is served by the built site', badge.status() === 200 && (badge.headers()['content-type'] ?? '').includes('image/png'));

// ── invariants ──
check('no external requests left the site origin (fonts self-hosted)', external.length === 0, external.slice(0, 5).join(', '));
check('no page errors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
const unexpectedConsole = consoleErrors.filter(e => !/net::ERR_CONNECTION_REFUSED|Failed to load resource/u.test(e));
check('no unexpected console errors', unexpectedConsole.length === 0, unexpectedConsole.slice(0, 3).join(' | '));

} catch (error) {
  failures.push(`aborted: ${error instanceof Error ? String(error.message).split(String.fromCharCode(10))[0] : String(error)}`);
  await page.screenshot({ path: join(OUT, 'aborted.png'), fullPage: true }).catch(() => {});
}
await browser.close(); site.close(); api.close();
await writeFile(join(OUT, 'results.json'), JSON.stringify({ at: new Date().toISOString(), passed: results.filter(r => r.ok).length, failed: failures.length, results }, null, 2) + '\n');
console.log(`website qa: ${results.filter(r => r.ok).length} passed, ${failures.length} failed → ${OUT}/results.json`);
for (const failure of failures) console.log(`  ✖ ${failure}`);
process.exitCode = failures.length ? 1 : 0;
