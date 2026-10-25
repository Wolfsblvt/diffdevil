// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Bounded rendered qualification of the joined search and the cross-host theme handoff, in a real
 * Chromium at the canonical origins. HTTP bytes cannot show either behavior.
 *
 *   --mode built  the emitted site/manual handlers serve the built pair at the canonical origins;
 *                 any other origin is refused. Pull-request qualification of the real build.
 *   --mode live   the published hosts themselves, after a publication's HTTP readback.
 *
 * Queries come from the same build's joined search records, so the journey follows the content
 * actually published. It never visits legal routes and keeps no screenshots or page bodies:
 * the retained result is check names, outcomes, URLs and errors.
 * Usage: node tools/publication/rendered.mjs --mode built|live
 */
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium, expect } from '@playwright/test';
import { origins } from '../../apps/manual/manifest.mjs';
import { faqRecords } from '../../apps/website/faq-content.mjs';

const OUTPUT = 'artifacts/publication/website';
const HOSTS = { [origins.site]: 'artifacts/website/dist', [origins.docs]: 'artifacts/manual/dist' };
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.wasm': 'application/wasm', '.woff2': 'font/woff2', '.png': 'image/png', '.ico': 'image/x-icon', '.webp': 'image/webp',
  '.pf_meta': 'application/octet-stream', '.pf_index': 'application/octet-stream', '.pf_fragment': 'application/octet-stream', '.pagefind': 'application/octet-stream' };

const text = html => html.replace(/<[^>]+>/gu, ' ').replace(/&amp;/gu, '&').replace(/&#39;|&apos;/gu, "'").replace(/&quot;/gu, '"').replace(/\s+/gu, ' ').trim();

/** One manual page and one FAQ question to search for, chosen deterministically from this build. */
export function selectQueries(records, read) {
  const docs = records.filter(record => record.kind === 'DOCS').sort((a, b) => a.url.localeCompare(b.url)).map(record => {
    const path = new URL(record.url).pathname;
    const html = read(join(HOSTS[origins.docs], path, 'index.html'));
    return { url: record.url, query: text(/<h1\b[^>]*>([\s\S]*?)<\/h1>/u.exec(html)?.[1] ?? '') };
  }).find(candidate => candidate.query.split(' ').length >= 3);
  const questions = faqRecords(read(join(HOSTS[origins.site], 'faq', 'index.html')));
  const faqId = records.filter(record => record.kind === 'FAQ').map(record => record.id).sort()[0];
  const faq = questions.find(question => question.id === faqId);
  if (!docs || !faq) throw new Error('The joined search records name no qualifiable manual page or FAQ question.');
  return { docs, faq: { id: faq.id, query: faq.title } };
}

/** The emitted handler for an owned origin, over its local built directory. */
async function builtHosts() {
  const handlers = new Map();
  for (const [origin, directory] of Object.entries(HOSTS)) {
    handlers.set(origin, { directory: resolve(directory), handler: (await import(pathToFileURL(resolve(directory, '_worker.js')).href)).default });
  }
  handlers.set(origins.compatibility, handlers.get(origins.site));
  return handlers;
}

async function serveBuilt(route, handlers, refused) {
  const url = new URL(route.request().url());
  const host = handlers.get(url.origin);
  if (!host) { refused.push(url.href); return route.abort(); }
  const response = await host.handler.fetch(new Request(url, { method: route.request().method() }), { ASSETS: { fetch: async request => {
    let pathname = decodeURIComponent(new URL(request.url).pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';
    const file = resolve(host.directory, `.${pathname}`);
    if (!file.startsWith(host.directory + sep)) return new Response('Outside site', { status: 400 });
    try { return new Response(readFileSync(file), { headers: { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' } }); }
    catch { return new Response('Not found', { status: 404 }); }
  } } });
  return route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers), body: Buffer.from(await response.arrayBuffer()) });
}

export async function qualify({ mode }) {
  if (mode !== 'built' && mode !== 'live') throw new Error('Expected --mode built or --mode live.');
  const records = JSON.parse(readFileSync('artifacts/public-search/records.json', 'utf8')).records;
  const queries = selectQueries(records, path => readFileSync(path, 'utf8'));
  const result = { kind: 'diffdevil.rendered-qualification', schemaVersion: 1, mode, queries, checks: [], pageErrors: [], refusedRequests: [] };
  const browser = await chromium.launch(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {});
  result.browser = browser.version();
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'dark', reducedMotion: 'reduce' });
    if (mode === 'built') {
      const handlers = await builtHosts();
      await context.route('**/*', route => serveBuilt(route, handlers, result.refusedRequests));
    }
    const page = await context.newPage();
    page.on('pageerror', error => result.pageErrors.push(error.message));
    const pref = () => page.locator('html').getAttribute('data-theme-pref');
    const check = async (name, body) => {
      try { await body(); result.checks.push({ name, ok: true, url: page.url() }); }
      catch (error) { result.checks.push({ name, ok: false, url: page.url(), error: String(error.message).split('\n')[0] }); }
    };
    const search = async query => {
      await page.keyboard.press('Control+k');
      await expect(page.locator('[data-search-dialog]')).toBeVisible();
      await expect(page.locator('[data-search-input]')).toBeFocused();
      await page.locator('[data-search-input]').fill(query);
    };

    await check('site theme control selects light', async () => {
      await page.goto(`${origins.site}/`);
      for (let click = 0; click < 3 && await pref() !== 'light'; click += 1) await page.locator('[data-theme-control]').first().click();
      await expect(page.locator('html')).toHaveAttribute('data-theme-pref', 'light');
    });
    await check('site search finds a manual page and carries light to the docs host', async () => {
      await search(queries.docs.query);
      const target = new URL(queries.docs.url);
      const hit = page.locator('[data-search-results] a.search-hit[data-kind="docs"]').filter({ has: page.locator('.search-hit-title') });
      await expect(hit.first()).toBeVisible({ timeout: 15_000 });
      const index = await hit.evaluateAll((links, wanted) => links.findIndex(link => { const url = new URL(link.href); return url.origin + url.pathname === wanted; }), target.origin + target.pathname);
      if (index < 0) throw new Error(`no DOCS hit for ${target.href}`);
      await hit.nth(index).click();
      await expect(page).toHaveURL(url => url.origin === target.origin && url.pathname === target.pathname, { timeout: 15_000 });
      await expect(page.locator('html')).toHaveAttribute('data-theme-pref', 'light');
      if (new URL(page.url()).searchParams.has('dd-theme')) throw new Error('the theme handoff parameter remained in the docs URL');
    });
    await check('docs search finds an FAQ answer on the site', async () => {
      await search(queries.faq.query);
      const hit = page.locator(`[data-search-results] a.search-hit[data-kind="faq"][href*="#${queries.faq.id}"]`);
      await expect(hit.first()).toBeVisible({ timeout: 15_000 });
      await hit.first().click();
      await expect(page).toHaveURL(url => url.origin === origins.site && url.pathname === '/faq/', { timeout: 15_000 });
      await expect(page.locator(`#${queries.faq.id}`)).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('data-theme-pref', 'light');
    });
    await check('docs navigation carries a dark choice back to the site', async () => {
      await page.goto(`${origins.docs}/`);
      for (let click = 0; click < 3 && await pref() !== 'dark'; click += 1) await page.locator('[data-theme-control]').first().click();
      await expect(page.locator('html')).toHaveAttribute('data-theme-pref', 'dark');
      await page.locator('.primary-nav a').filter({ hasText: /^FAQ$/u }).click();
      await expect(page).toHaveURL(url => url.origin === origins.site, { timeout: 15_000 });
      await expect(page.locator('html')).toHaveAttribute('data-theme-pref', 'dark');
    });
  } finally {
    await browser.close();
  }
  result.ok = result.checks.every(item => item.ok) && result.pageErrors.length === 0 && result.refusedRequests.length === 0;
  mkdirSync(OUTPUT, { recursive: true });
  writeFileSync(join(OUTPUT, `rendered-${mode}.json`), JSON.stringify(result, null, 2) + '\n');
  const lines = result.checks.map(item => `${item.ok ? 'ok  ' : 'FAIL'} ${item.name}${item.ok ? '' : ` (${item.error})`}`)
    .concat(result.pageErrors.map(error => `FAIL page error: ${error}`), result.refusedRequests.map(url => `FAIL refused request: ${url}`));
  const report = `Rendered search and theme (${mode}):\n\n\`\`\`\n${lines.join('\n')}\n\`\`\``;
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, report + '\n');
  console.log(report);
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const index = process.argv.indexOf('--mode');
  const result = await qualify({ mode: index > 0 ? process.argv[index + 1] : undefined });
  if (!result.ok) { console.error('::error::Rendered search or theme qualification failed.'); process.exitCode = 1; }
}
