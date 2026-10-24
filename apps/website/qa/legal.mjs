// SPDX-License-Identifier: AGPL-3.0-only
/** Fixture-only readback of emitted legal pages. No live requests or production input.
 * Run after npm run website:build: node apps/website/qa/legal.mjs
 */
import assert from 'node:assert/strict';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join, extname, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { chromium } from '@playwright/test';
import { fixtureOperator } from '../legal-operator.mjs';
import { origins } from '../../manual/manifest.mjs';

const out = resolve('artifacts/website/qa/legal');
const legalPaths = ['/impressum/', '/privacy/', '/terms/'];
const directories = { site: resolve('artifacts/website/dist'), docs: resolve('artifacts/manual/dist') };
const identity = [fixtureOperator.legalName, fixtureOperator.postalAddress.streetAddress, ...Object.values(fixtureOperator.contacts)];
const projectLabels = ['Source on GitHub', 'Releases', 'Security', 'Licences', 'Terms', 'Privacy and data', 'Impressum'];
const results = [];
function check(name, value) { assert.ok(value, name); results.push(name); }

// Assert the build's identity before taking any screenshot or reporting page content.
for (const path of legalPaths) {
  const html = await readFile(join(directories.site, path, 'index.html'), 'utf8');
  check(`${path} is a fixture build`, html.includes(fixtureOperator.legalName) && html.includes(fixtureOperator.postalAddress.streetAddress));
}

async function files(directory) {
  return (await Promise.all((await readdir(directory, { withFileTypes: true })).map(async entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  }))).flat();
}
let scanned = 0;
for (const [host, directory] of Object.entries(directories)) {
  for (const file of await files(directory)) {
    check(`${host} has no build-only prerender output`, !file.startsWith(join(directory, '.prerender') + sep));
    if (!/\.(?:html|js|mjs|css|json|xml|txt|map|md)$/u.test(file)) continue;
    const text = await readFile(file, 'utf8');
    const isLegal = host === 'site' && legalPaths.some(path => file === join(directory, path, 'index.html'));
    const outsideAddress = isLegal ? text.replace(/<address\b[^>]*>[\s\S]*?<\/address>/gu, '') : text;
    check(`operator isolation: ${host}/${file.slice(directory.length + 1)}`, identity.every(value => !outsideAddress.includes(value)));
    scanned++;
  }
  const sitemap = await readFile(join(directory, 'sitemap.xml'), 'utf8');
  check(`${host} sitemap excludes legal routes`, legalPaths.every(path => !sitemap.includes(path)));
  const robots = await readFile(join(directory, 'robots.txt'), 'utf8');
  check(`${host} permits fetching legal directives`, /Allow: \/(?:\r?\n|$)/u.test(robots) && !/Disallow:\s*\/(?:privacy|impressum|terms)/u.test(robots));
}
const search = JSON.parse(await readFile('artifacts/public-search/records.json', 'utf8'));
check('joined search excludes every legal route', search.records.every(record => !legalPaths.includes(new URL(record.url).pathname)));

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.ico': 'image/x-icon' };
const hosts = new Map(await Promise.all(Object.entries(directories).map(async ([host, directory]) => [origins[host], {
  directory, handler: (await import(pathToFileURL(join(directory, '_worker.js')).href)).default,
}])));
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
const errors = [], external = [];
try {
  for (const [width, colorScheme] of [[1280, 'dark'], [390, 'light']]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme });
    await context.addInitScript(theme => localStorage.setItem('diffdevil.theme', theme), colorScheme);
    await context.route('**/*', async route => {
      const request = new Request(route.request().url());
      const host = hosts.get(new URL(request.url).origin);
      if (!host) { external.push(new URL(request.url).origin); await route.abort(); return; }
      const response = await host.handler.fetch(request, { ASSETS: { fetch: async request => {
        let path = decodeURIComponent(new URL(request.url).pathname);
        if (path.endsWith('/')) path += 'index.html';
        const file = resolve(host.directory, '.' + path);
        if (!file.startsWith(host.directory + sep)) return new Response('Bad path', { status: 400 });
        try { return new Response(await readFile(file), { headers: { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' } }); }
        catch { return new Response('Not found', { status: 404 }); }
      } } });
      await route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers), body: Buffer.from(await response.arrayBuffer()) });
    });
    const page = await context.newPage();
    page.on('pageerror', () => errors.push('pageerror'));
    page.on('console', message => { if (message.type() === 'error') errors.push('console error'); });
    for (const path of legalPaths) {
      const response = await page.goto(origins.site + path, { waitUntil: 'networkidle' });
      check(`${path} ${width}: publicly fetchable`, response.status() === 200);
      check(`${path} ${width}: header exclusion`, response.headers()['x-robots-tag'] === 'noindex, nosnippet');
      check(`${path} ${width}: metadata exclusion`, await page.locator('meta[name="robots"]').getAttribute('content') === 'noindex, nosnippet');
      check(`${path} ${width}: search exclusion`, await page.locator('main[data-pagefind-ignore]').count() === 1);
      check(`${path} ${width}: no social/structured/feed output`, await page.locator('meta[property^="og:"], meta[name^="twitter:"], script[type="application/ld+json"], link[type="application/rss+xml"], link[type="application/atom+xml"]').count() === 0);
      check(`${path} ${width}: canonical identity`, await page.locator('link[rel="canonical"]').getAttribute('href') === origins.site + path);
      check(`${path} ${width}: one heading`, await page.locator('h1').count() === 1);
      check(`${path} ${width}: requested theme`, await page.locator('html').getAttribute('data-theme') === colorScheme);
      check(`${path} ${width}: complete fixture operator`, await page.locator('main address').count() === 1 && (await page.locator('main address').innerText()).includes(fixtureOperator.legalName));
      const contact = path === '/impressum/' ? 'impressum' : path === '/privacy/' ? 'privacy' : 'legal';
      check(`${path} ${width}: correct contact`, await page.locator('main address a[href^="mailto:"]').getAttribute('href') === 'mailto:' + fixtureOperator.contacts[contact]);
      check(`${path} ${width}: project footer order`, JSON.stringify(await page.locator('footer nav[aria-label="Project"] a').allTextContents()) === JSON.stringify(projectLabels));
      check(`${path} ${width}: no horizontal overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
      await page.screenshot({ path: join(out, `${path.slice(1, -1)}-${width}-${colorScheme}.png`), fullPage: true });
    }
    // The joined manual keeps the same reader route into the product's legal pages.
    await page.goto(origins.docs + '/', { waitUntil: 'networkidle' });
    for (const path of legalPaths) {
      check(`manual ${width}: legal footer ${path}`, await page.locator(`footer a[href="${origins.site + path}"]`).count() === 1);
    }
    await context.close();
  }
  check('no external requests', external.length === 0);
  check('no browser errors', errors.length === 0);
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const dirty = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim().length > 0;
  await writeFile(join(out, 'results.json'), JSON.stringify({ head, dirty, fixtureOnly: true, scannedFiles: scanned, checks: results.length, viewports: [1280, 390], results }, null, 2) + '\n');
  console.log(`Legal fixture QA: ${results.length} checks; ${scanned} output files; desktop/dark and narrow/light readback passed.`);
} finally { await browser.close(); }
