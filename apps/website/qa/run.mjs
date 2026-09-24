// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Local browser qualification of the built website (artifacts/website/dist).
 *
 *   npm run website:build && npm run qa:website
 *
 * Serves the static output, runs the real playground application server against the
 * in-memory fake GitHub fixture on the API port the site was built for, and drives
 * headless Chromium through the accepted interactions: the shared shell (one header
 * geometry and one page grid on every route, the manual included), the three-state theme
 * switch, global search with result kinds, anchors, clipboard, Agents cards, homepage
 * composition, PR hand-off, playground views/controls/editor/export/deep links/error
 * states, docs shell, narrow layout, and page-level invariants (no page-level horizontal
 * overflow at any qualified width, Impressum link, no external requests, no console errors). Results and screenshots go to artifacts/website/qa/.
 * This proves local behaviour; it does not prove a deployment.
 */
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { once } from 'node:events';
import { join, extname, resolve, sep } from 'node:path';
import {pathToFileURL} from 'node:url';
import {origins, pageUrl} from '../../manual/manifest.mjs';
import { GitHubClient } from '../../../dist/lib/index.js';
import { FakeGitHub } from '../../../src/diffdevil/tests/helpers/github.mjs';
import { createPlaygroundServer } from '../../playground/server.mjs';
import { replayPublicPullRequest } from '../../playground/app.mjs';

const DIST = 'artifacts/website/dist';
const OUT = 'artifacts/website/qa';
// Parallel local work may already own the default playground ports. The built site's
// PUBLIC_PLAYGROUND_API and this harness can move together without changing the
// product's default local route.
const SITE_PORT = Number(process.env.DIFFDEVIL_WEBSITE_QA_SITE_PORT ?? 4399);
const API_PORT = Number(process.env.DIFFDEVIL_WEBSITE_QA_API_PORT ?? 4173);
const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon', '.json': 'application/json', '.md': 'text/markdown', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain', '.wasm':'application/wasm' };
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

const browser = await chromium.launch({executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH});
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'dark', permissions: ['clipboard-read', 'clipboard-write'] });
const consoleErrors = [], external = [], pageErrors = [];
context.on('page', page => {
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(`${page.url()} ${m.text()}`); });
  page.on('pageerror', e => pageErrors.push(`${page.url()} ${e.message}`));
  page.on('request', r => { const u = new URL(r.url()); if (!['127.0.0.1', 'localhost', new URL(origins.site).hostname, new URL(origins.docs).hostname].includes(u.hostname)) external.push(r.url()); });
});
// Cross-host links use the actual static output and emitted handlers. The local
// Playground API remains a separate loopback fake; no remote provider is contacted.
const builtHosts=new Map(await Promise.all([['site','website'],['docs','manual']].map(async([host,name])=>{
 const directory=resolve(`artifacts/${name}/dist`);
 return [origins[host],{directory,handler:(await import(pathToFileURL(join(directory,'_worker.js')).href)).default}];
})));
await context.route(/^https:\/\/(?:docs\.)?diffdevil\.dev\//u,async route=>{
 const request=new Request(route.request().url());
 const host=builtHosts.get(new URL(request.url).origin);
 const response=await host.handler.fetch(request,{ASSETS:{fetch:async request=>{
  let pathname;try{pathname=decodeURIComponent(new URL(request.url).pathname);}catch{return new Response('Bad path',{status:400});}
  if(pathname.endsWith('/'))pathname+='index.html';
  const file=resolve(host.directory,'.'+pathname);
  if(!file.startsWith(host.directory+sep))return new Response('Outside site',{status:400});
  try{return new Response(await readFile(file),{headers:{'Content-Type':types[extname(file)]??'application/octet-stream'}});}
  catch{return new Response('Not found',{status:404});}
 }}});
 await route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:Buffer.from(await response.arrayBuffer())});
});
const page = await context.newPage();
try {
const go = (path, opts = {}) => page.goto(/^https?:/u.test(path)?path:`http://127.0.0.1:${SITE_PORT}${path}`, { waitUntil: 'networkidle', ...opts });
const shot = name => page.screenshot({ path: join(OUT, `${name}.png`), fullPage: true });

// ── every page: Impressum in the footer, one h1, theme script before paint ──
const pages = ['/', '/playground/', '/examples/', '/extension/', '/app/', '/privacy/', '/impressum/', '/faq/', pageUrl('what-is-diffdevil'), pageUrl('cli'), pageUrl('label-pull-requests'), pageUrl('security-and-data'), '/source/?f=LICENSES%2FREADME.md', '/nothing-here/'];
const overflowOf = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
// One header geometry and one page grid: measured on every route and compared with the homepage.
const shellOf = () => page.evaluate(() => {
  const box = selector => { const el = document.querySelector(selector); if (!el) return undefined; const r = el.getBoundingClientRect(); return { left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), height: Math.round(r.height) }; };
  const cluster = [...document.querySelectorAll('.header-main > *')].filter(el => getComputedStyle(el).display !== 'none').map(el => el.className.split(' ')[0] || el.tagName.toLowerCase());
  const label = document.querySelector('[data-surface-label]');
  return { brand: box('.brand-link'), cluster: box('.header-main'), header: box('.page > .header') ?? box('.site-header'), order: cluster.join(' '), labelIsLink: !!label?.closest('a'), label: label?.textContent ?? '' };
});
let homeShell;
for (const path of pages) {
  const response = await go(path);
  const impressum = await page.locator('footer a', { hasText: 'Impressum' }).first();
  check(`${path} has an Impressum link to the site's own route`, await impressum.count() === 1 && new URL(await impressum.getAttribute('href'),page.url()).pathname === '/impressum/');
  check(`${path} has no Company-privacy footer link`, (await page.locator('footer a', { hasText: 'Company privacy' }).count()) === 0);
  check(`${path} has no page-level horizontal overflow at 1280`, (await overflowOf()) <= 0, String(await overflowOf()));
  const shell = await shellOf();
  homeShell ??= shell;
  check(`${path} header: same lockup coordinate, cluster edge, height and tool order as the homepage`, shell.brand.left === homeShell.brand.left && shell.brand.top === homeShell.brand.top && shell.cluster.right === homeShell.cluster.right && shell.cluster.left === homeShell.cluster.left && shell.header.height === homeShell.header.height && shell.order === homeShell.order, JSON.stringify(shell));
  check(`${path} surface label is plain text, never a link`, !shell.labelIsLink);
  check(`${path} has exactly one h1`, await page.locator('h1').count() === 1);
  if (path === '/nothing-here/') check('unknown route serves the 404 page', response.status() === 404 && (await page.locator('h1').textContent()).includes('Nothing at this address'));
  const fontFamily = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  check(`${path} uses IBM Plex Sans`, fontFamily.startsWith('"IBM Plex Sans"') || fontFamily.startsWith('IBM Plex Sans'), fontFamily);
}

// ── legal routes: public, but out of search engines and the site search ──
for (const path of ['/privacy/', '/impressum/']) {
  await go(path);
  check(`${path} is noindex, nosnippet and outside the search index`, (await page.locator('meta[name="robots"]').getAttribute('content')) === 'noindex, nosnippet' && (await page.locator('main[data-pagefind-ignore]').count()) === 1);
}

// ── homepage: composition, engine numbers, anchors, theme switch, search, copy, Agents cards ──
await go('/');
await shot('home');
check('header grammar: search, navigation, one divider, utilities, one trailing action', homeShell.order === 'search-trigger primary-nav header-sep utilities trailing-action', homeShell.order);
const geometry = await page.evaluate(() => { const b = s => { const r = document.querySelector(s).getBoundingClientRect(); return `${Math.round(r.width)}x${Math.round(r.height)}`; }; return { header: b('.site-header'), search: b('.search-trigger'), source: b('[data-direct-source]'), social: b('.utility-social'), theme: b('.theme-control'), action: Math.round(document.querySelector('.trailing-action').getBoundingClientRect().height), sep: b('.header-sep'), navSize: getComputedStyle(document.querySelector('.site-nav > li > a')).fontSize, navGap: getComputedStyle(document.querySelector('.site-nav')).columnGap }; });
check('header geometry follows the shared standard', JSON.stringify(geometry) === JSON.stringify({ header: '1265x62', search: '190x30', source: '28x28', social: '42x28', theme: '64x28', action: 30, sep: '1x18', navSize: '13px', navGap: '18px' }), JSON.stringify(geometry));
check('nav has Docs, Playground, Examples and Install; there is no top-level App item', (await page.locator('.site-nav > li').allInnerTexts()).map(t => t.trim()).join('|') === 'Docs|Playground|Examples|Install|FAQ');
check('hero shows 3 changed = exact from the engine', /3\s*changed/u.test(await page.locator('.specimen-cell').first().innerText()));
const hero = await page.evaluate(() => {
  const lines = el => Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight));
  const r = selector => document.querySelector(selector).getBoundingClientRect();
  const chip = r('.specimen-cell .chip-ev'), cell = r('.specimen-cell');
  return { h1: lines(document.querySelector('.hero h1')), lead: lines(document.querySelector('.hero .why')), specimenRight: Math.round(r('.specimen').right), measureRight: Math.round(r('.measure-panel').right), specimenWidth: r('.specimen').width, routeWidth: r('.route-2').width, measureWidth: r('.measure-panel').width,
    chipGap: Math.round(cell.right - chip.right), rawSize: parseFloat(getComputedStyle(document.querySelector('.specimen-value.raw')).fontSize), bigSize: parseFloat(getComputedStyle(document.querySelector('.specimen-value .metric-m')).fontSize) };
});
check('hero headline is one line and the lead is at most three', hero.h1 === 1 && hero.lead <= 3, JSON.stringify(hero));
check('hero specimen shares the right edge of the blocks below and is the wider column', hero.specimenRight === hero.measureRight && hero.specimenWidth > hero.routeWidth, JSON.stringify(hero));
check('hero evidence chip is right-aligned and raw counters are subordinate', hero.chipGap <= 22 && hero.rawSize < hero.bigSize, JSON.stringify(hero));
const bottoms = await page.evaluate(() => ['.route-1 .route-actions', '.route-3 .route-actions'].map(s => Math.round(document.querySelector(s).getBoundingClientRect().bottom)));
check('entrance 01 and 03 action rows share one bottom edge', bottoms[0] === bottoms[1], bottoms.join(' '));
check('measure section shows 178 changed', (await page.locator('[data-section="measure"]').innerText()).includes('178'));
const measure = await page.evaluate(() => ({ columns: getComputedStyle(document.querySelector('.measure-panel')).gridTemplateColumns.split(' ').length, headLines: Math.round(document.querySelector('.measure-head').getBoundingClientRect().height), word: getComputedStyle(document.querySelector('.facts-strong li span')).color, number: getComputedStyle(document.querySelector('.facts-strong .v')).color }));
check('measure specimen is three columns with a one-line header; words grey, decomposition numbers white', measure.columns === 3 && measure.headLines < 44 && measure.word === 'rgb(180, 183, 190)' && measure.number === 'rgb(240, 242, 245)', JSON.stringify(measure));
const terminals = await page.evaluate(() => [...document.querySelectorAll('.query-terminal')].map(el => ({ overflow: el.scrollWidth - el.clientWidth, left: Math.round(el.getBoundingClientRect().left), blank: /\n\s*\n/u.test(el.textContent.trimEnd()) })));
check('query terminal: two columns on the grid, no inner scrollbar, no blank lines between commands', terminals.length === 2 && terminals.every(t => t.overflow <= 0 && !t.blank) && terminals[0].left === homeShell.brand.left + 1, JSON.stringify(terminals));
check('query terminal keeps the false-not-error comment on the result line', /^1\s+# false, not an error$/mu.test(await page.locator('.query-terminal').first().innerText()));
const policy = await page.evaluate(() => [...document.querySelectorAll('.policy-col')].map(el => ({ width: Math.round(el.getBoundingClientRect().width), overflow: el.scrollWidth - el.clientWidth, text: el.innerText })));
check('policy shows YAML, then the plan as JSON, then apply as text, in three equal non-overflowing panels', policy.length === 3 && new Set(policy.map(c => c.width)).size === 1 && policy.every(c => c.overflow <= 0) && policy[0].text.includes('byBand:') && policy[1].text.includes('"kind": "diffdevil.plan"') && policy[2].text.includes('Readback confirms'), JSON.stringify(policy.map(c => c.width)));
const sectionLinks = await page.evaluate(() => [...document.querySelectorAll('main section[data-section]')].filter(s => s.querySelector('.section-links')).map(s => { const links = s.querySelector(':scope > .wrap > .section-links'); return { id: s.dataset.section, last: links === s.querySelector(':scope > .wrap').lastElementChild }; }));
check('every section closes with its cross-links row', sectionLinks.length >= 5 && sectionLinks.every(item => item.last), JSON.stringify(sectionLinks));
const evidence = await page.evaluate(() => [...document.querySelectorAll('[data-section="evidence"] .cell')].map(cell => ({ glyph: parseFloat(getComputedStyle(cell.querySelector('.cell-glyph')).fontSize), chip: !!cell.querySelector('.chip-ev'), source: /\.json/u.test(cell.innerText) })));
check('evidence cells lead with the large glyph, keep chip and value, and carry no source footnotes', evidence.length === 4 && evidence.every(cell => cell.glyph === 64 && cell.chip && !cell.source), JSON.stringify(evidence));
const app = await page.evaluate(() => { const panel = document.querySelector('.app-panel'); const icon = panel.querySelector('.app-eyebrow svg'); return { benefits: getComputedStyle(panel.querySelector('.benefits')).gridTemplateColumns.split(' ').length, count: panel.querySelectorAll('.benefits li').length, bg: getComputedStyle(panel).backgroundColor, iconInLink: !!icon.closest('a'), iconFirst: panel.querySelector('.app-eyebrow').firstElementChild === icon }; });
check('app panel: GitHub mark before the anchor and outside it, six benefits in two columns, midnight ground', app.benefits === 2 && app.count === 6 && app.bg === 'rgb(12, 15, 23)' && !app.iconInLink && app.iconFirst, JSON.stringify(app));
const support = page.locator('[data-section="support"]');
check('support section: anchor, two actions with icon slots, sponsor honestly unavailable, empty art slot', (await support.locator('#support').count()) === 1 && (await support.locator('[data-support-action] svg[data-icon]').count()) === 2 && (await support.locator('[data-support-action="sponsor"]').getAttribute('aria-disabled')) === 'true' && (await support.locator('[data-support-art]').count()) === 1);
check('footer keeps CLI, Actions and Library API on one row', await page.evaluate(() => { const row = [...document.querySelectorAll('.site-footer .footer-row')].find(li => li.textContent.includes('Library API')); return row.querySelectorAll('a').length === 3 && row.getBoundingClientRect().height < 30; }));
const social = await page.evaluate(() => ({ direct: document.querySelector('[data-direct-source]').getAttribute('href'), directName: document.querySelector('[data-direct-source]').getAttribute('aria-label'), footer: [...document.querySelectorAll('.footer-socials [data-social]')].map(el => el.dataset.social).join(' '), seps: document.querySelectorAll('.header-sep').length, githubInPanel: !!document.querySelector('#panel-community [data-dest="community:github"]') }));
check('one direct GitHub source icon, one divider, and a complete icons-only footer in the order Works, Discord, Bluesky, GitHub', social.direct === 'https://github.com/Wolfsblvt/diffdevil' && social.directName === 'Source on GitHub' && social.footer === 'works discord bluesky github' && social.seps === 1 && !social.githubInPanel, JSON.stringify(social));
check('icons are real local geometry: Simple Icons brands and Lucide UI, no runtime icon request', await page.evaluate(() => ['github', 'social-links', 'chevron', 'search', 'theme-dark', 'theme-light'].every(name => document.querySelector(`.site-header svg[data-icon="${name}"]`)?.innerHTML.includes('path'))));

// header destination panels: disclosures of ordinary links, one open at a time
const install = page.locator('[aria-controls="panel-install"]'), communityTrigger = page.locator('[aria-controls="panel-community"]');
await install.focus(); await page.keyboard.press('Enter');
check('Install opens by keyboard and exposes its expanded state', (await install.getAttribute('aria-expanded')) === 'true' && await page.locator('#panel-install').isVisible());
const installLinks = await page.locator('#panel-install a').evaluateAll(links => links.map(a => `${a.dataset.dest}=${a.getAttribute('href') ?? 'unconfigured'}`));
check('Install is a menu of site pages only: browser extension, GitHub App, CLI and Actions; no install or store action lives in it', installLinks.join(' ') === `install:extension=/extension/ install:app=/app/ install:open=${pageUrl('label-pull-requests')}` && !/Add to Chrome|Install on GitHub/u.test(await page.locator('#panel-install').innerText()), installLinks.join(' '));
const rowsShape = await page.evaluate(() => [...document.querySelectorAll('#panel-install .dest-row')].map(row => { const li = row.parentElement.getBoundingClientRect(), a = row.getBoundingClientRect(); return { described: !!row.querySelector('.dest-label') && !!row.querySelector('.dest-note')?.textContent.trim(), whole: Math.round(a.width) === Math.round(li.width) && Math.round(a.height) === Math.round(li.height), gap: getComputedStyle(row).columnGap }; }));
check('every Install entry has a title and a description, and the whole row is the link', rowsShape.length === 3 && rowsShape.every(r => r.described && r.whole && r.gap === '12px'), JSON.stringify(rowsShape));
await page.locator('#panel-install .dest-row').first().hover(); await page.waitForTimeout(80);
check('hovering an entry highlights the whole row, exactly as in the Community panel', (await page.evaluate(() => getComputedStyle(document.querySelector('#panel-install .dest-row')).backgroundColor)) === (await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--bg-raised-2').trim().replace(/^#(..)(..)(..)$/u, (_, r, g, b) => `rgb(${parseInt(r, 16)}, ${parseInt(g, 16)}, ${parseInt(b, 16)})`))));
await page.keyboard.press('Tab');
check('Tab moves into the panel rows', await page.evaluate(() => document.activeElement?.closest('#panel-install') !== null));
await page.keyboard.press('Escape');
check('Escape closes the panel and returns focus to its trigger', (await install.getAttribute('aria-expanded')) === 'false' && await page.evaluate(() => document.activeElement?.getAttribute('aria-controls') === 'panel-install'));
await install.click(); await communityTrigger.click();
check('only one destination panel is open at a time', (await install.getAttribute('aria-expanded')) === 'false' && await page.locator('#panel-community').isVisible() && await page.locator('#panel-install').isHidden());
const community = await page.locator('#panel-community [data-dest]').evaluateAll(rows => rows.map(a => `${a.dataset.dest.split(':')[1]}:${a.getAttribute('href') ? 'link' : a.getAttribute('aria-disabled')}`));
check('Community lists Discord, Bluesky and Wolfsblvt Works; destinations without a real URL are disabled links, never invented ones', community.join(' ') === 'discord:true bluesky:true works:link' && !(await page.locator('#panel-community').innerText()).toLowerCase().includes('soon'), community.join(' '));
check('the Community trigger is named for assistive technology', (await communityTrigger.getAttribute('aria-label')) === 'Community and social links');
await page.locator('h1').click();
check('an outside click closes the panel', await page.locator('#panel-community').isHidden());
check('hidden panel rows are not focusable', await page.evaluate(() => [...document.querySelectorAll('.dest-panel[hidden] a')].every(a => a.offsetParent === null)));

// anchors: the eyebrow is the target and a link; hovering either lights both
await page.locator('#measure').click();
await page.waitForTimeout(900); // smooth scroll settles before anything is measured or hovered
check('the #measure eyebrow is the scroll target and sets the hash', page.url().endsWith('#measure') && await page.evaluate(() => { const top = document.getElementById('measure').getBoundingClientRect().top; return top >= 60 && top < 140; }));
await page.locator('#measure').hover();
await page.waitForTimeout(350); // the colour and opacity transitions finish
const lit = await page.evaluate(() => { const group = document.getElementById('measure').closest('.anchor-group'); return { glyph: getComputedStyle(group.querySelector('.permalink')).opacity, eyebrow: getComputedStyle(group.querySelector('.eyebrow-link')).color }; });
check('hovering the eyebrow lights the eyebrow and the title glyph together', lit.glyph === '1' && lit.eyebrow === 'rgb(240, 97, 186)', JSON.stringify(lit));
await page.locator('[data-section="measure"] .permalink').hover();
await page.waitForTimeout(350);
check('hovering the title glyph lights the eyebrow too', (await page.evaluate(() => getComputedStyle(document.getElementById('measure')).color)) === 'rgb(240, 97, 186)');

// the bouncing theme control: Dark → Auto → Light → Auto → Dark, one whole-control button
// the capsule animates for 160 ms and a system change arrives asynchronously: measure the settled state
const themeState = async () => { await page.waitForTimeout(260); return page.evaluate(() => { const d = document.documentElement, b = document.querySelector('[data-theme-control]'), r = s => document.querySelector(s).getBoundingClientRect(), cap = r('.theme-capsule'), dot = r('.theme-dot'); return { pref: d.dataset.themePref, shown: d.dataset.theme, stored: localStorage.getItem('diffdevil.theme'), next: localStorage.getItem('diffdevil.theme.next'), title: b.title, dotInside: dot.left >= cap.left && dot.right <= cap.right, capsule: getComputedStyle(document.querySelector('.theme-capsule')).backgroundColor }; }); };
const first = await themeState();
check('with nothing stored the theme is explicit Dark, and the capsule is dark and excludes the dot', first.pref === 'dark' && first.shown === 'dark' && first.stored === null && !first.dotInside && first.capsule === 'rgb(17, 19, 24)' && first.title === 'Dark. Next click: Automatic.', JSON.stringify(first));
check('the control is one native button, not a radiogroup, switch or menu', await page.evaluate(() => { const b = document.querySelector('[data-theme-control]'); return b.tagName === 'BUTTON' && !b.getAttribute('role') && !b.hasAttribute('aria-pressed') && !b.hasAttribute('aria-haspopup') && b.querySelectorAll('button, [tabindex]').length === 0 && document.querySelectorAll('[role="radiogroup"][aria-label="Theme"], [data-theme-option]').length === 0; }));
const sequence = [];
for (let i = 0; i < 8; i++) { await page.locator('[data-theme-control]').click(); const t = await themeState(); sequence.push(`${t.pref}>${t.next}`); }
check('eight clicks bounce Dark → Auto → Light → Auto → Dark twice, never wrapping Light → Dark', sequence.join(' ') === 'auto>light light>dark auto>dark dark>light auto>light light>dark auto>dark dark>light', sequence.join(' '));
await page.locator('[data-theme-control]').click();
const autoDark = await themeState();
check('Automatic on a dark system: dark capsule stretched over the dot, and the state says so', autoDark.pref === 'auto' && autoDark.shown === 'dark' && autoDark.dotInside && autoDark.title === 'Automatic, using dark. Next click: Light.', JSON.stringify(autoDark));
await page.emulateMedia({ colorScheme: 'light' });
const autoLight = await themeState();
check('a system change while Automatic changes the appearance and capsule, not the next manual side', autoLight.pref === 'auto' && autoLight.shown === 'light' && autoLight.dotInside && autoLight.capsule === 'rgb(245, 246, 248)' && autoLight.next === 'light', JSON.stringify(autoLight));
await page.reload({ waitUntil: 'networkidle' });
check('Automatic and its bounce side survive a reload and are applied before first paint', JSON.stringify(await themeState()) === JSON.stringify(autoLight), JSON.stringify(await themeState()));
await page.emulateMedia({ colorScheme: 'dark' });
await page.locator('[data-theme-control]').focus();
await page.keyboard.press('Enter');
check('Enter advances exactly one step and keeps focus on the control', (await themeState()).pref === 'light' && await page.evaluate(() => document.activeElement?.matches('[data-theme-control]')));
await page.keyboard.press('ArrowLeft');
check('ArrowLeft steps backwards through the same traversal', (await themeState()).pref === 'auto' && (await themeState()).next === 'light');
await page.keyboard.press('ArrowRight');
check('choosing Light sets data-theme and persists', (await page.evaluate(() => document.documentElement.getAttribute('data-theme'))) === 'light' && (await page.evaluate(() => localStorage.getItem('diffdevil.theme'))) === 'light');
check('explicit Light ignores the dark system and shows the bright capsule without the dot', await (async () => { const t = await themeState(); return t.shown === 'light' && !t.dotInside && t.capsule === 'rgb(245, 246, 248)'; })());
const accentText = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent-text').trim());
check('explicit light theme keeps --accent-text at #aa167d (cascade correction)', accentText === '#aa167d', accentText);
const machineBg = await page.evaluate(() => getComputedStyle(document.querySelector('.machine')).backgroundColor);
check('machine surfaces stay midnight in light theme', machineBg === 'rgb(12, 15, 23)', machineBg);
await shot('home-light');
await page.reload({ waitUntil: 'networkidle' });
check('theme survives reload before first paint', (await page.evaluate(() => document.documentElement.getAttribute('data-theme'))) === 'light');
await go(origins.site + '/?dd-theme=light.dark');
await page.locator('.primary-nav a').filter({ hasText: /^Docs$/u }).click();
check('the manual resolves the explicitly handed-off theme by the same rule', (await page.evaluate(() => `${document.documentElement.dataset.themePref}/${document.documentElement.dataset.theme}`)) === 'light/light');
await go('/');
await page.evaluate(() => { localStorage.setItem('diffdevil.theme', 'system'); localStorage.removeItem('diffdevil.theme.next'); });
await go('/');
check('a legacy Automatic value migrates to Auto, with the opposite of its appearance as the next manual side', await (async () => { const t = await themeState(); return t.pref === 'auto' && t.shown === 'dark' && t.stored === 'auto' && t.next === 'light'; })());
await page.evaluate(() => { localStorage.setItem('diffdevil.theme', 'sepia'); });
await go('/');
check('an invalid stored value falls back to explicit Dark', (await themeState()).pref === 'dark');
await page.evaluate(() => { localStorage.removeItem('diffdevil.theme'); localStorage.removeItem('diffdevil.theme.next'); });
await go('/');

// global search: one modal everywhere, results say whether they are manual or site pages
await page.keyboard.press('Control+k');
await page.waitForSelector('dialog.search-dialog[open]');
check('Ctrl+K opens the search modal with focus in the field', await page.evaluate(() => document.activeElement?.matches('[data-search-input]')));
await page.locator('[data-search-input]').fill('playground');
await page.waitForSelector('.search-hit');
const kinds = await page.locator('.search-hit').evaluateAll(hits => hits.map(hit => `${hit.dataset.kind}:${hit.querySelector('.search-kind').textContent}`));
check('search finds manual pages and site pages and marks each kind', kinds.some(k => k === 'docs:Docs') && kinds.some(k => k === 'site:Site'), kinds.join(' '));
check('legal routes are not search results', !(await page.locator('.search-hit').evaluateAll(hits => hits.map(hit => hit.getAttribute('href')))).some(href => /^\/(privacy|impressum)\//u.test(href)));
await page.keyboard.press('ArrowDown');
check('ArrowDown moves from the field to the first result', await page.evaluate(() => document.activeElement?.classList.contains('search-hit')));
await page.keyboard.press('Escape');
check('Escape closes the search modal', (await page.locator('dialog.search-dialog[open]').count()) === 0);

const widthOf = selector => page.evaluate(sel => { const r = document.querySelector(sel).getBoundingClientRect(); return `${r.left.toFixed(1)}/${r.width.toFixed(1)}`; }, selector);
const before = [await widthOf('[data-trailing="npm"]'), await widthOf('.search-trigger'), await widthOf('.theme-control')];
await page.locator('[data-trailing="npm"]').click();
await page.waitForTimeout(100);
check('header npm command copies the install command', (await page.evaluate(() => navigator.clipboard.readText())) === 'npm i -D @wolfsblvt/diffdevil');
check('the copy confirmation appears in place and nothing in the header moves', (await page.evaluate(() => getComputedStyle(document.querySelector('.copy-swap-done')).visibility)) === 'visible' && JSON.stringify([await widthOf('[data-trailing="npm"]'), await widthOf('.search-trigger'), await widthOf('.theme-control')]) === JSON.stringify(before), before.join(' '));
check('live region announced the copy', (await page.locator('[data-live-region]').textContent()).includes('Copied'));
const skill = page.locator('#agents-skill');
check('skill card starts closed', await skill.locator('.agent-details').isHidden());
await skill.locator('.btn-primary').click();
check('Add the skill copies the instruction with the configured origin', /https?:\/\/[^ ]+\/setup\/skill\.md/u.test(await page.evaluate(() => navigator.clipboard.readText())));
check('Add the skill opened the skill card (proactive expansion)', await skill.locator('.agent-details').isVisible() && (await skill.locator('[data-disclosure]').getAttribute('aria-expanded')) === 'true');
const setup = page.locator('#agents-setup');
await setup.locator('[data-intent="cli"]').click();
check('setup selector keeps its lead and first three chips on one row', await page.evaluate(() => { const tops = [...document.querySelectorAll('.selector-row > *')].map(el => Math.round(el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2)); return tops.length === 4 && Math.max(...tops) - Math.min(...tops) <= 2; }));
check('agent card titles sit left with their sub-label right on the same line', await page.evaluate(() => [...document.querySelectorAll('.agent-head')].every(head => { const t = head.querySelector('.agent-title').getBoundingClientRect(), s = head.querySelector('.agent-sub').getBoundingClientRect(); return s.left > t.right && Math.abs(s.bottom - t.bottom) < 8 && Math.round(head.getBoundingClientRect().right - s.right) <= 1; })));
check('source and path strips are midnight machine strips', (await page.evaluate(() => [...document.querySelectorAll('[data-section="agents"] .strip')].map(el => getComputedStyle(el).backgroundColor).join('|'))) === 'rgb(12, 15, 23)|rgb(12, 15, 23)');
check('selecting a setup chip opens the setup card and swaps the prompt', await setup.locator('.agent-details').isVisible() && (await setup.locator('[data-intent-prompt]').textContent()).includes('/setup/cli.md'));
await setup.locator('[data-intent="cli"]').press('ArrowRight');
check('arrow keys move the intent selection', (await setup.locator('[data-intent="actions"]').getAttribute('aria-checked')) === 'true');
check('open cards never widen the page and the prompt wraps', (await overflowOf()) <= 0 && await page.evaluate(() => { const pre = document.querySelector('#agents-setup-details pre'); return pre.scrollWidth <= pre.clientWidth; }));
check('the copied setup prompt is one sentence', await page.evaluate(() => { const text = document.querySelector('[data-intent-prompt]').textContent.trim(); return /\/setup\/actions\.md/u.test(text) && (text.match(/\. /gu) ?? []).length === 0; }));
check('both cards may be open at once', await skill.locator('.agent-details').isVisible() && await setup.locator('.agent-details').isVisible());
await skill.locator('[data-disclosure]').click();
check('explicit disclosure closes the card', await skill.locator('.agent-details').isHidden());
await go('/#agents-setup');
check('deep link #agents-setup opens the setup card', await page.locator('#agents-setup .agent-details').isVisible());
await go('/');
// route cards, hero and the homepage extension section
const routes = await page.evaluate(() => ({ titles: [...document.querySelectorAll('.entrances .route-title')].map(h => h.textContent.trim().replace(/^\d+/u, '')), prInput: document.querySelectorAll('#home-pr-url, [data-pr-entry]').length, glyph: document.querySelector('[data-route-projection] svg')?.dataset.icon, projection: document.querySelector('[data-route-projection]').innerText.replace(/\s+/gu, ' '), heights: ['.route-2', '.route-3'].map(s => Math.round(document.querySelector(s).getBoundingClientRect().height)) }));
check('route cards: 01 run it yourself, 02 browser extension, 03 GitHub App; the Playground card and its PR input are gone', routes.titles.join('|') === 'Run diffdevil yourself|Bring Changed into GitHub|Let it run for you' && routes.prInput === 0, JSON.stringify(routes));
check('the extension card shows the real seat with the diffdevil/brand glyph, no inline raw churn, and carries more height than the App card', routes.glyph === 'brand' && /Changed 178 \+45 −18 ~115 size\/M/u.test(routes.projection) && !routes.projection.includes('Raw') && routes.heights[0] > routes.heights[1], JSON.stringify(routes));
const heroCtas = await page.locator('.hero-ctas a').evaluateAll(links => links.map(a => `${a.textContent.trim()}=${a.getAttribute('href') ?? 'unconfigured'}`));
check('hero: Add to Chrome first and direct, then CLI / Actions, then the Playground; card 02 says Install the extension; no install button carries a link glyph', (await page.locator('.btn svg[data-icon="external"]').count()) === 0 && (await page.locator('.route-2 .btn').innerText()).trim() === 'Install the extension' && heroCtas.join('|') === `Add to Chrome=unconfigured|Use the CLI / Actions=${pageUrl('label-pull-requests')}|Try a public PR →=/playground/` && (await page.locator('.hero .eyebrow').innerText()).toUpperCase() === 'COMPOSABLE DIFF ANALYSIS AND AUTOMATION FOR GITHUB AND THE CLI', heroCtas.join('|'));
check('no Add to Chrome or install action is ever routed through a product page', await page.evaluate(() => [...document.querySelectorAll('a')].filter(a => /^(Add to Chrome|Install the App|Install on GitHub|Chrome Web Store)/u.test(a.textContent.trim())).every(a => !['/extension/', '/app/'].includes(a.getAttribute('href') ?? ''))));
const order = await page.evaluate(() => [...document.querySelectorAll('main section[data-section]')].map(s => s.dataset.section).join(' '));
check('homepage order puts #extension directly after #measure', order === 'measure extension query policy agents evidence app support', order);
const scene = await page.evaluate(() => { const el = document.querySelector('[data-section="extension"] [data-extension-scene]'); const native = el.querySelector('.gh-native'); return { text: el.innerText.replace(/\s+/gu, ' '), glyphBeforeChanged: el.querySelector('.ddx-main').firstElementChild.dataset.icon === 'brand' && el.querySelector('.ddx-main').children[1].textContent === 'Changed', railCells: el.querySelectorAll('[data-scene-anchor] .ddx-cell').length, selected: [...el.querySelectorAll('[data-scene-anchor] .ddx-cell')].findIndex(c => c.classList.contains('is-selected')), headerNative: el.querySelectorAll('.gh-stat-row .gh-native').length, nativeOpacity: native ? getComputedStyle(native).opacity : 'none', popover: !!el.querySelector('.gh-popover'), files: el.querySelectorAll('.gh-file').length, images: el.querySelectorAll('img, iframe, canvas').length, magenta: [...el.querySelectorAll('.gh-body > *:not(.gh-popover), .gh-body > *:not(.gh-popover) *')].some(n => /240, 97, 186|229, 78, 175/u.test(getComputedStyle(n).color + getComputedStyle(n).backgroundColor + getComputedStyle(n).borderColor)), heroEdge: getComputedStyle(el.querySelector('.gh-machine')).borderLeftColor }; });
check('the extension scene is one semantic GitHub composition: glyph then Changed 178 +45 −18 ~115, the size/M chip, a five-cell rail with the third cell selected, no native diffstat beside the seat, faint native counters only on the excluded file, per-file Changed, and the open report whose machine block carries the only magenta', scene.glyphBeforeChanged && /Changed 178 \+45 −18 ~115 size\/M/u.test(scene.text) && scene.railCells === 5 && scene.selected === 2 && scene.headerNative === 0 && Number(scene.nativeOpacity) < 0.8 && scene.text.includes('— excluded') && scene.files === 3 && /src\/Foo\.cs .*173 \+/u.test(scene.text) && scene.popover && scene.text.includes('= exact') && scene.text.includes('effect plan') && scene.text.includes('churn 293') && scene.images === 0 && !scene.magenta && /240, 97, 186|229, 78, 175/u.test(scene.heroEdge), JSON.stringify({ ...scene, text: undefined }));
await page.goto(`http://127.0.0.1:${SITE_PORT}/playground/?pr=example/repository/42`, { waitUntil: 'networkidle' });

// ── playground: PR mode through the real API server ──
await page.waitForSelector('.pg-primary', { timeout: 20000 });
check('PR mode analyzed through the API and shows the compact PR display', (await page.locator('.pg-analyzed').innerText()).includes('example/repository'));
check('PR mode primary result is exact 3 changed', /3\s*changed/u.test(await page.locator('.pg-primary').innerText()));
check('playground has no title block: the workbench starts flush under the header, on the page grid, with hard corners', await page.evaluate(() => { const pg = document.querySelector('.pg').getBoundingClientRect(), header = document.querySelector('.site-header').getBoundingClientRect(), brand = document.querySelector('.brand-link').getBoundingClientRect(); const radius = ['.pg', '.pg-rail', '.pg-strip', '.pg-primary'].map(s => getComputedStyle(document.querySelector(s)).borderTopLeftRadius); return Math.round(pg.top) === Math.round(header.bottom) && Math.round(pg.left) === Math.round(brand.left) && document.querySelectorAll('main h1:not(.visually-hidden), main .pg-head').length === 0 && radius.every(r => r === '0px'); }));
check('playground panes are contiguous: no gap between strip, primary result and the views', await page.evaluate(() => { const b = s => document.querySelector(s).getBoundingClientRect(); return Math.round(b('.pg-strip').bottom) === Math.round(b('.pg-primary').top) && Math.round(b('.pg-primary').bottom) === Math.round(b('.pg-views-head').top) && Math.round(b('.pg-rail').right) === Math.round(b('.pg-main').left); }));
await shot('playground-pr');

// ── playground: cancel, then a late successful response must not commit ──
await go('/playground/?example=lockfile-scope&variant=without-lockfile');
await page.waitForSelector('.pg-primary');
holdNextReplayMs = 2500;
await page.locator('#tab-pr').click();
await page.locator('#pg-url').fill('https://github.com/example/repository/pull/42');
await page.locator('.pg-input form button[type="submit"]').click();
await page.waitForSelector('.pg-input [role="status"]');
await page.locator('#pg-url').press('Escape');
check('Escape cancels: the spinner clears and the input is kept', (await page.locator('.pg-input [role="status"]').count()) === 0 && (await page.locator('#pg-url').inputValue()).includes('pull/42'));
await page.waitForTimeout(3200);
check('a late successful response after cancel does not commit a result', (await page.locator('.pg-analyzed').count()) === 0 && /changed/u.test(await page.locator('.pg-primary').innerText()));
await page.locator('.pg-input form button[type="submit"]').click();
await page.waitForSelector('.pg-analyzed', { timeout: 15000 });
check('re-submitting after cancel analyzes normally', /3\s*changed/u.test(await page.locator('.pg-primary').innerText()));

// ── playground: shared real-PR catalogue, tiles, controls, editor, export ──
await go('/playground/');
await page.waitForSelector('.pg-primary');
check('playground opens on the catalogue default with a result (never blank)', (await page.locator('.pg-strip').innerText()).includes('teaching snapshot') && /changed/u.test(await page.locator('.pg-primary').innerText()));
check('url stays clean for the default state', page.url().endsWith('/playground/'));
await page.locator('#tab-examples').click();
check('the rail lists only the shared lesson cards and their declared variants', (await page.locator('.pg-examples .pg-card').count()) === 7 && (await page.locator('.pg-examples .pg-card-variants button').count()) === 16 && !(await page.locator('.pg-rail-desktop').innerText()).includes('Frozen'));
await go('/playground/?example=lockfile-scope&variant=all');
await page.waitForSelector('.pg-primary');
check('a declared real-PR variant opens by its example and variant id', (await page.locator('.pg-strip-title').innerText()).includes('vitejs/vite') && /changed/u.test(await page.locator('.pg-primary').innerText()));
const tiles = page.locator('.pg-tile');
await tiles.nth(0).focus(); await page.keyboard.press('ArrowRight');
check('tile arrow keys select the next view', (await tiles.nth(1).getAttribute('aria-selected')) === 'true' && page.url().includes('view=agent'));
check('agent view shows the agent presenter', (await page.locator('#pg-view-panel').innerText()).includes('diffdevil.agent-report/1'));
check('agent data and report.json are syntax-coloured', (await page.locator('.pg-data').first().locator('.tok-key').count()) > 3 && (await page.locator('.pg-data[data-lang="json"] .tok-key').count()) > 10 && (await page.locator('.pg-data[data-lang="json"] .tok-str').count()) > 5);
await page.locator('.pg-agent [role="tab"]', { hasText: 'plan.json' }).click();
check('plan.json gets the same JSON colouring', (await page.locator('.pg-data[data-lang="json"]').innerText()).includes('"diffdevil.plan"') && (await page.locator('.pg-data[data-lang="json"] .tok-key').count()) > 5);
check('result tiles put the title left and the glyph right on one row', await page.evaluate(() => [...document.querySelectorAll('.pg-tile-head')].every(head => { const t = head.querySelector('.t').getBoundingClientRect(), g = head.querySelector('.g').getBoundingClientRect(); return g.left > t.right && Math.abs((g.top + g.bottom) / 2 - (t.top + t.bottom) / 2) < 4; })));
await tiles.nth(1).focus();
await page.keyboard.press('End');
check('End selects the explanation view', (await tiles.nth(3).getAttribute('aria-selected')) === 'true');
check('explanation lists rules and the readback lane as not observed', /Not observed/u.test(await page.locator('#pg-view-panel').innerText()));
await tiles.nth(2).click();
check('github preview says proposed, not applied, and shows the selected policy result', (await page.locator('#pg-view-panel').innerText()).includes('Proposed, not applied') && (await page.locator('#pg-view-panel').innerText()).includes('size/'));
check('github preview renders the owned comment as a comment: avatar, author, bot standing, marker', (await page.locator('.pg-comment .pg-avatar').count()) === 1 && /diffdevil\s*bot · would comment/u.test(await page.locator('.pg-comment-head').innerText()) && (await page.locator('.pg-comment-marker').innerText()).includes('diffdevil:rule='));
check('github preview is two columns: labels and check summary left, comment right', await page.evaluate(() => { const cols = [...document.querySelector('.pg-github').children].map(el => el.getBoundingClientRect()); return cols.length === 2 && cols[1].left > cols[0].right; }));
await shot('playground-github');
await tiles.nth(0).click();
const term = await page.evaluate(() => { const blocks = document.querySelectorAll('#pg-view-panel pre.terminal'); const pre = blocks[0]; return { blocks: blocks.length, text: pre.innerText, overflow: pre.scrollWidth - pre.clientWidth, cmd: getComputedStyle(pre.querySelector('.c')).color, prompt: getComputedStyle(pre.querySelector('.p')).color }; });
check('terminal view is one session: $ analyze, its output, a blank line, $ plan, its output; wrapped, never scrolled', term.blocks === 1 && /^\$ diffdevil analyze[^\n]*\ndiffdevil analysis/u.test(term.text) && /\n\n\$ diffdevil plan[^\n]*\ndiffdevil effect plan/u.test(term.text) && term.overflow <= 0 && term.cmd === 'rgb(240, 242, 245)' && term.prompt === 'rgb(130, 134, 144)', JSON.stringify({ ...term, text: undefined }));
await tiles.nth(2).click();
// controls: threshold edit re-evaluates locally
const xs = page.locator('.pg-bands li').first().locator('input[type="number"]');
await xs.fill('5');
await page.waitForTimeout(150);
check('editing an active threshold changes the local policy', (await page.locator('.pg-result-line').innerText()).includes('band') && page.url().includes('policy='));
check('the GitHub preview follows the edited policy', (await page.locator('#pg-view-panel').innerText()).includes('size/'));
check('a focused control has one magenta outline and no second ring', await page.evaluate(() => { const input = document.querySelector('.pg-bands input[type="number"]'); input.focus(); const style = getComputedStyle(input); return style.borderTopColor === 'rgb(240, 97, 186)' && style.outlineStyle === 'none' && !/240, 242, 245|255, 255, 255/u.test(style.boxShadow); }));
check('configuration is one label column and one control column; rest is a read-only box like the others', await page.evaluate(() => { const lefts = [...document.querySelectorAll('.pg-controls > .pg-ctl-label')].map(el => Math.round(el.getBoundingClientRect().left)); const controls = [...document.querySelectorAll('.pg-controls > .pg-ctl')].map(el => Math.round(el.getBoundingClientRect().left)); const rest = document.querySelector('.pg-bands li:last-child input'); return new Set(lefts).size === 1 && new Set(controls).size === 1 && lefts.length >= 4 && rest?.readOnly === true && rest.value === 'rest'; }));
await page.locator('.pg-add').fill('**/pnpm-lock.yaml');
await page.locator('.pg-add').press('Enter');
await page.waitForTimeout(150);
check('adding an exclude pattern annotates matches and excludes the file', (await page.locator('.pg-patterns').innerText()).includes('matches 1 file') && (await page.locator('.pg-files .pg-row.is-excluded').count()) === 1);
check('files table keeps the excluded row with strikethrough path', (await page.locator('.pg-files .pg-row.is-excluded .pg-path-name').innerText()).includes('pnpm-lock.yaml') && (await page.evaluate(() => getComputedStyle(document.querySelector('.pg-row.is-excluded .pg-path-name')).textDecorationLine)) === 'line-through');
check('files table is a plain table on the page ground with figures aligned in columns', await page.evaluate(() => { const rows = [...document.querySelectorAll('.pg-table .pg-row:not(.pg-row-head)')]; const rights = index => new Set(rows.map(row => Math.round(row.querySelectorAll('.pg-figures')[1].children[index].getBoundingClientRect().right))).size; return getComputedStyle(document.querySelector('.pg-table')).backgroundColor === 'rgba(0, 0, 0, 0)' && rows.length > 1 && [0, 1, 2, 3].every(i => rights(i) === 1); }));
check('the comment preview says it is off in this policy', (await page.locator('.pg-box-head-split').innerText()).toLowerCase().includes('off in this policy'));
await page.locator('.pg-switch').click();
await page.waitForTimeout(150);
check('turning the comment on makes the GitHub preview render the comment of this policy', (await page.locator('.pg-box-head-split').innerText()).toLowerCase().includes('on in this policy') && (await page.locator('.pg-comment').innerText()).includes('Change summary'));
// policy editor
await page.locator('.segmented button', { hasText: 'Policy' }).first().click();
await page.waitForSelector('.cm-editor', { timeout: 15000 });
check('policy editor is a real CodeMirror instance with the edited document', (await page.locator('.cm-content').innerText()).includes('pnpm-lock.yaml'));
check('policy editor reports the document valid', (await page.locator('.pg-editor-status').innerText()).includes('valid'));
await page.locator('.cm-content').click();
await page.keyboard.press('Control+End');
await page.keyboard.type('\nbands: 7\n');
await page.waitForTimeout(400);
check('an invalid policy keeps the previous valid result visible and says so', (await page.locator('.pg-editor-status').innerText()).startsWith('×') && (await page.locator('.pg-primary').innerText()).includes('changed') && (await page.locator('.pg-strip').innerText()).includes('previous valid policy'));
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
// deep links and a real-PR snapshot
await go('/playground/?example=runtime-null-guards&variant=implementation&view=explain');
await page.waitForSelector('.pg-primary');
check('deep link opens the named real-PR variant in the named view', /changed/u.test(await page.locator('.pg-primary').innerText()) && (await tiles.nth(3).getAttribute('aria-selected')) === 'true');
check('real-PR policy keeps scopes that the controls cannot represent', (await page.locator('.notice-kept').innerText()).includes('scopes implementation, tests'));
await go('/playground/?example=lockfile-scope&variant=all');
await page.waitForSelector('.pg-primary');
check('real-PR snapshot loads from the static catalogue with its provenance strip', (await page.locator('.pg-strip').innerText()).includes('teaching snapshot') && (await page.locator('.pg-strip').innerText()).includes('vitejs/vite'));
check('real-PR snapshot names its exact catalogue source', (await page.locator('.pg-why').innerText()).includes('source vite-18968'));
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

// ── canonical manual shell and catalogue joins ──
await go(pageUrl('label-pull-requests'));
check('manual first-success route renders the complete size workflow', (await page.locator('main').innerText()).includes('pull_request_target'));
check('manual provenance names canonical source rather than a retired guide', (await page.locator('.docs-provenance').innerText()).includes('docs/manual/start/label-pull-requests.md'));
check('manual uses the global search before navigation', (await page.locator('[data-search-open]').count())===1 && (await page.locator('site-search').count())===0 && (await shellOf()).order.startsWith('search-trigger primary-nav'));
const manualGroups=await page.locator('[data-slw-group]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-slw-group')));
check('manual sidebar has the accepted six groups and a named navigation landmark', await page.locator('nav[aria-label="Manual navigation"]').count()===1 && ['START','USE DIFFDEVIL','WRITE POLICY','UNDERSTAND','REFERENCE','HELP'].every(label=>manualGroups.includes(label)),manualGroups.join(' | '));
await shot('docs');
await go(pageUrl('changed-lines-and-raw-churn'));
const examples=await page.locator('.sl-markdown-content a[href*="/playground/?example="]').evaluateAll(links=>links.map(link=>link.href));
check('manual example links name exact catalogue entries and variants',examples.length>0&&examples.every(href=>{const url=new URL(href);return url.searchParams.has('example')&&url.searchParams.has('variant');}),examples.join(' '));

// ── wide layout: the grid stays centred and every route keeps the same edges ──
await page.setViewportSize({ width: 1720, height: 900 });
let wideShell;
for (const path of ['/', '/playground/', '/examples/', '/extension/', '/app/', pageUrl('cli')]) {
  await go(path);
  const shell = await shellOf();
  wideShell ??= shell;
  check(`${path} at 1720: same lockup coordinate and cluster edge as the homepage`, shell.brand.left === wideShell.brand.left && shell.cluster.right === wideShell.cluster.right && shell.brand.left > 200, JSON.stringify(shell));
}
await go(pageUrl('cli'));
await shot('docs-wide');
const wideRailVisible = await page.locator('[data-slw-group="START"]').isVisible();
const wideOverflow = await overflowOf();
check('manual at 1720 keeps a visible navigation rail without page overflow', wideRailVisible && wideOverflow<=0, `rail visible: ${wideRailVisible}; overflow: ${wideOverflow}`);

// ── no page-level horizontal overflow: every route, every qualified width ──
// 640 × 2 device pixels is the layout a 1280 window has at 200 % zoom.
for (const width of [1440, 1024, 768, 640, 375, 320]) {
  await page.setViewportSize({ width, height: 900 });
  for (const path of ['/', '/playground/', '/playground/?example=lockfile-scope&variant=all&view=agent', '/playground/?example=lockfile-scope&variant=all&view=github', '/examples/', '/extension/', '/app/', '/privacy/', '/impressum/', pageUrl('cli'), '/#agents-setup']) {
    await go(path);
    if (path.startsWith('/playground/')) await page.waitForSelector('.pg-primary');
    check(`${path} has no page-level horizontal overflow at ${width}`, (await overflowOf()) <= 0, String(await overflowOf()));
  }
}

// ── narrow layout ──
await page.setViewportSize({ width: 390, height: 800 });
await go('/playground/');
await page.waitForSelector('.pg-primary');
check('narrow playground shows the sticky configuration bar instead of the rail', await page.locator('.pg-rail-narrow').isVisible() && await page.locator('.pg-rail-desktop').isHidden());
await page.locator('.pg-sheet-toggle').click();
check('the bottom sheet opens with the same controls', await page.locator('#pg-sheet .pg-controls').isVisible());
await shot('playground-narrow');
await go('/');
const compact = await page.evaluate(() => { const vis = s => { const el = document.querySelector(s); return !!el && el.getBoundingClientRect().width > 0 && getComputedStyle(el).visibility !== 'hidden'; }; const b = s => { const r = document.querySelector(s).getBoundingClientRect(); return `${Math.round(r.width)}x${Math.round(r.height)}`; }; const left = s => document.querySelector(s).getBoundingClientRect().left; return { search: b('.search-trigger'), menu: vis('.menu-trigger'), nav: vis('.primary-nav'), github: vis('[data-direct-source]'), community: vis('.utility-social'), theme: b('.theme-control'), npm: vis('[data-trailing="npm"]'), order: left('.search-trigger') < left('.menu-trigger') && left('.menu-trigger') < left('[data-direct-source]') }; });
check('compact header: icon search, Menu in the navigation position, GitHub + Community + Theme still visible, npm convenience gone', JSON.stringify(compact) === JSON.stringify({ search: '30x30', menu: true, nav: false, github: true, community: true, theme: '64x28', npm: false, order: true }), JSON.stringify(compact));
await page.locator('[aria-controls="panel-menu"]').click();
const menu = await page.locator('#panel-menu a').evaluateAll(links => links.map(a => a.textContent.trim().split('\n')[0].trim()));
check('the compact Menu exposes every primary destination and the same Install pages, without install actions', ['Docs', 'Playground', 'Examples'].every(t => menu.includes(t)) && menu.some(t => t.startsWith('Browser extension')) && menu.some(t => t.startsWith('GitHub App')) && menu.some(t => t.startsWith('CLI and GitHub Actions')) && !menu.includes('Add to Chrome') && !menu.includes('Install on GitHub') && await page.evaluate(() => { const r = document.getElementById('panel-menu').getBoundingClientRect(); return r.left >= 0 && r.right <= document.documentElement.clientWidth; }), menu.join('|'));
await page.keyboard.press('Escape');
await shot('home-narrow');
await page.setViewportSize({ width: 1280, height: 900 });

// ── extension page, footer discovery ──
await go('/extension/');
for (const shot of await page.locator('.ext-shot img').all()) { await shot.scrollIntoViewIfNeeded(); await shot.evaluate(img => img.complete || new Promise(done => { img.onload = done; img.onerror = done; })); }
const ext = await page.evaluate(() => ({ h1: document.querySelector('h1').textContent, sections: [...document.querySelectorAll('main section[data-section]')].map(s => s.dataset.section).join(' '), label: document.querySelector('[data-surface-label]').textContent, add: [...document.querySelectorAll('[data-cta="add-to-chrome"]')].map(a => a.getAttribute('href') ?? 'unconfigured'), scenes: document.querySelectorAll('[data-extension-scene]').length, shots: [...document.querySelectorAll('.ext-shot img')].every(img => img.complete && img.naturalWidth > 400 && img.alt.length > 40), text: document.querySelector('main').innerText }));
check('/extension/ is a full page: hero, Changed, policy, report, settings, data, routes and a closing action', ext.h1 === 'Changed, directly in GitHub' && ext.sections === 'extension changed policy report settings data routes add' && ext.label === 'Extension' && ext.scenes === 3 && ext.shots, JSON.stringify({ ...ext, text: undefined }));
check('/extension/ states its real permissions and boundaries and never requires the App', ['api.github.com', 'Incognito', 'not persisted', 'GitHub Enterprise', 'The extension changes your view. The App runs for the repository.'].every(t => ext.text.includes(t)) && !/coming soon|not open yet/iu.test(ext.text));
check('every Add to Chrome on the page is a direct store action, never a link to a product page', ext.add.length >= 2 && ext.add.every(href => href === 'unconfigured' || /^https:\/\/chromewebstore\.google\.com\//u.test(href)), ext.add.join(' '));
const footer = await page.evaluate(() => { const rows = [...document.querySelectorAll('.site-footer nav[aria-label="Learn"] li')].map(li => li.textContent.replace(/\s+/gu, ' ').trim()); const get = [...document.querySelectorAll('.site-footer nav[aria-label="Get"] a')].map(a => `${a.textContent.trim()}=${a.getAttribute('href') ?? 'unconfigured'}`); return { rows, releases: [...document.querySelectorAll('.site-footer a')].find(a => a.textContent === 'Releases').getAttribute('href'), get, appDocs: [...document.querySelectorAll('.site-footer nav[aria-label="Learn"] a')].find(a => a.textContent === 'GitHub App').getAttribute('href') }; });
check('footer: Releases goes to the manual; Learn carries "Extension · GitHub App" directly above "CLI · Actions · Library API", pointing into the docs', footer.releases === pageUrl('releases') && footer.rows.indexOf('Extension · GitHub App') === footer.rows.indexOf('CLI · Actions · Library API') - 1 && footer.rows.indexOf('Extension · GitHub App') >= 0 && footer.appDocs === pageUrl('managed-app'), JSON.stringify(footer));
check('footer Get keeps the package and Action first and adds the extension and App with their direct actions', footer.get[0].startsWith('@wolfsblvt/diffdevil=') && footer.get.some(g => g === 'Browser extension=/extension/') && footer.get.some(g => g.startsWith('Chrome Web Store=')) && footer.get.some(g => g === 'GitHub App=/app/') && footer.get.some(g => g.startsWith('Install on GitHub=')), footer.get.join(' | '));
await go('/');
await page.keyboard.press('Control+k');
await page.locator('[data-search-input]').fill('browser extension');
await page.waitForSelector('.search-hit');
check('search finds the extension page', (await page.locator('.search-hit').evaluateAll(hits => hits.map(h => new URL(h.href).pathname))).includes('/extension/'));
await page.keyboard.press('Escape');
await page.waitForTimeout(100);
check('closing search after the keyboard shortcut returns focus to the visible launcher', await page.evaluate(() => document.activeElement?.matches('[data-search-open]')), await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 120)));

// ── examples and app pages ──
await go('/examples/');
check('examples lead with real pull requests, carry no fixture gallery and no seed disclaimer', (await page.locator('#pull-requests').count()) === 1 && (await page.locator('#fixtures').count()) === 0 && !(await page.locator('main').innerText()).includes('Initial seed'));
check('example cards: mark and identity on one row, owner greyed, evidence chip right-aligned', await page.evaluate(() => [...document.querySelectorAll('.ex-card')].every(card => { const head = card.querySelector('.ex-head').getBoundingClientRect(), title = card.querySelector('.ex-title').getBoundingClientRect(), icon = card.querySelector('.ex-title svg').getBoundingClientRect(), chip = card.querySelector('.ex-head .chip-ev').getBoundingClientRect(); const owner = getComputedStyle(card.querySelector('.ex-owner')).color, name = getComputedStyle(card.querySelector('.ex-title a')).color; return icon.bottom <= title.bottom + 1 && icon.top >= title.top - 1 && Math.round(head.right - chip.right) <= 1 && owner !== name; })));
await go('/app/');
check('app page head is the same panel as the homepage', (await page.locator('.app-panel .benefits li').count()) === 6 && (await page.evaluate(() => getComputedStyle(document.querySelector('.app-panel')).backgroundColor)) === 'rgb(12, 15, 23)' && (await page.locator('.app-panel h1').count()) === 1);
check('app page has an honest #history chapter before #permissions with no dashboard imagery', await page.evaluate(() => { const ids = [...document.querySelectorAll('main .eyebrow-link')].map(a => a.id); const section = document.querySelector('[data-section="history"]'); return ids.indexOf('history') > 0 && ids.indexOf('history') < ids.indexOf('permissions') && /co-design/u.test(section.innerText) && section.querySelectorAll('img, svg, canvas').length === 0; }));
check('app page: comparison blocks sit side by side below the lead; internal strategy prose is gone', await page.evaluate(() => { const [a, b] = [...document.querySelectorAll('[data-section="why"] .choice')].map(el => el.getBoundingClientRect()); return Math.round(a.top) === Math.round(b.top) && Math.round(a.width) === Math.round(b.width) && !document.querySelector('main').innerText.includes('primary pitch'); }));

// ── repository links ──
for (const path of ['/app/']) {
  await go(path);
  const hrefs = await page.locator('a[href*="/blob/"]').evaluateAll(links => links.map(a => a.getAttribute('href')));
  check(`${path} repository links carry the separator once`, hrefs.length > 0 && hrefs.every(h => /\/blob\/[a-f0-9]{40}\//u.test(h) && !/\/blob\/[a-f0-9]{40}\/\//u.test(h)), hrefs.slice(0, 3).join(' '));
}
const badge = await page.goto(`http://127.0.0.1:${SITE_PORT}/github-app-logo-512.png`);
check('generated GitHub App badge is served by the built site', badge.status() === 200 && (badge.headers()['content-type'] ?? '').includes('image/png'));

// ── invariants ──
check('requests stayed on the two static hosts and local fake API (fonts self-hosted)', external.length === 0, external.slice(0, 5).join(', '));
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
