// SPDX-License-Identifier: AGPL-3.0-only
/** Actual built-site FAQ, shared navigation, Pagefind and browser interaction qualification. */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { chromium, expect } from '@playwright/test';
import { faqRecords, FAQ_CANONICAL } from '../faq-content.mjs';

const directory = resolve('artifacts/website/dist');
const output = resolve('artifacts/website/faq-qa');
const records = faqRecords(await readFile(resolve(directory, 'faq/index.html'), 'utf8'));
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.wasm': 'application/wasm', '.woff2': 'font/woff2', '.png': 'image/png', '.ico': 'image/x-icon' };
const server = createServer(async (request, response) => {
  try {
    let pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';
    const file = resolve(directory, `.${pathname}`);
    if (!file.startsWith(directory + sep)) throw new Error('Outside site');
    const content = await readFile(file);
    response.writeHead(200, { 'Content-Type': mime[extname(file)] ?? 'application/octet-stream' });
    response.end(content);
  } catch { response.writeHead(404); response.end('Not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const failures = [], evidence = [];
let browser, page;
try {
  await mkdir(output, { recursive: true });
  browser = await chromium.launch(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {});
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'dark', reducedMotion: 'reduce' });
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  page = await context.newPage();
  page.on('pageerror', error => failures.push(error.message));
  await context.route('**/*', route => {
    if (new URL(route.request().url()).origin === origin) return route.continue();
    failures.push(`Unexpected external request: ${route.request().url()}`);
    return route.abort();
  });
  await page.goto(`${origin}/faq/`);
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('.faq-question')).toHaveCount(38);
  await expect(page.locator('.faq-categories a')).toHaveCount(6);
  await expect(page.locator('.faq-question details[open]')).toHaveCount(2);
  await expect(page.locator('.sidebar-pane')).toHaveCount(0);
  await expect(page.locator('.primary-nav .site-nav > li').last().locator('a')).toHaveAttribute('href', '/faq/');
  await expect(page.locator('footer a[href="/faq/"]')).toBeVisible();
  assert.equal(await page.locator('meta[name="robots"]').count(), 0);
  for (const question of records) {
    assert.ok(await page.locator(`[data-faq-id="${question.id}"] .faq-answer a`).count() <= 1, question.id);
  }
  await page.screenshot({ path: resolve(output, 'faq-dark-desktop.png') });
  evidence.push('Standalone page, all 38 disclosures, category navigation, shared header/footer and one-link limit.');

  const custom = page.locator('[data-faq-id="custom-policy"]');
  await page.goto(`${origin}/faq/#changed-vs-churn`);
  await custom.locator('.faq-id').click();
  await expect(custom.locator('details')).toHaveAttribute('open', '');
  await expect(custom.locator('summary')).toBeFocused();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(`${FAQ_CANONICAL}#custom-policy`);
  await custom.locator('summary').press('Enter');
  await expect(custom.locator('details')).not.toHaveAttribute('open', '');
  await custom.locator('.faq-id').click();
  await expect(custom.locator('details')).toHaveAttribute('open', '');
  await page.goBack();
  await expect(page).toHaveURL(/#changed-vs-churn$/u);
  await expect(page.locator('#changed-vs-churn')).toBeVisible();
  await page.goForward();
  await expect(page).toHaveURL(/#custom-policy$/u);
  await expect(custom.locator('summary')).toBeFocused();
  await custom.locator('summary').press('Space');
  await expect(custom.locator('details')).not.toHaveAttribute('open', '');
  evidence.push('Keyboard toggles, canonical clipboard links, same-fragment reopening and browser Back/Forward.');

  // Query the actual emitted index for every stable identifier. No fixture search response.
  const indexed = await page.evaluate(async expected => {
    const engine = await import('/pagefind/pagefind.js');
    await engine.init();
    const observed = [];
    for (const id of expected) {
      const result = await engine.search(id);
      const data = await Promise.all(result.results.map(hit => hit.data()));
      const matches = data.filter(hit => hit.meta.kind === 'FAQ' && hit.meta.identifier === `#${id}`);
      if (matches.length !== 1) throw new Error(`Expected one indexed FAQ answer for ${id}; got ${matches.length}`);
      if (data.some(hit => new URL(hit.url, location.origin).pathname === '/faq/' && !new URL(hit.url, location.origin).hash)) throw new Error('Whole-page FAQ duplicate in search');
      observed.push({ id, url: matches[0].url, category: matches[0].meta.category, standing: matches[0].meta.standing });
    }
    return observed;
  }, records.map(record => record.id));
  assert.equal(indexed.length, 38);
  assert.equal(indexed.find(record => record.id === 'extension-data').standing, 'In development');
  assert.ok(indexed.every(record => record.category && new URL(record.url, origin).hash === `#${record.id}`));
  await page.keyboard.press('Control+k');
  const input = page.locator('[data-search-input]');
  await input.fill('browser sync stops');
  const result = page.locator('.search-hit[data-kind="faq"][href$="#extension-data"]');
  await expect(result).toBeVisible();
  await expect(result.locator('.search-faq-context')).toContainText('In development');
  await result.click();
  await expect(page.locator('[data-search-dialog]')).not.toBeVisible();
  await expect(page.locator('#extension-data')).toBeVisible();
  await expect(page.locator('[data-faq-id="extension-data"] summary')).toBeFocused();
  evidence.push('All 38 actual Pagefind records; visible FAQ kind/category/standing; search opens and focuses the answer outside the modal.');

  // Resolve the real built destinations and fragments selected by the FAQ's Markdown links.
  const links = await page.locator('.faq-answer a').evaluateAll(anchors => anchors.map(anchor => anchor.getAttribute('href')));
  for (const href of links) {
    if (!href.startsWith('/')) continue;
    const target = new URL(href, origin);
    const response = await context.request.get(target.href);
    assert.equal(response.status(), 200, href);
    if (target.hash) {
      const html = await response.text();
      assert.ok(html.includes(`id="${decodeURIComponent(target.hash.slice(1))}"`), href);
    }
  }
  await page.goto(`${origin}/docs/actions/github-actions/`);
  await expect(page.locator('a[href="/faq/#action-permissions"]').first()).toBeVisible();
  await page.locator('a[href="/faq/#action-permissions"]').first().click();
  await expect(page.locator('#action-permissions')).toBeVisible();
  evidence.push('Rendered deeper links and fragments resolve; a contextual manual link opens the matching FAQ answer.');

  for (const width of [320, 375, 640, 1080, 1180, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${origin}/faq/`);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Horizontal overflow at ${width}`);
    if (width <= 1080) {
      await page.locator('[aria-controls="panel-menu"]').click();
      await expect(page.locator('#panel-menu a[href="/faq/"]')).toBeVisible();
      await page.keyboard.press('Escape');
    }
  }
  await page.setViewportSize({ width: 375, height: 850 });
  // Use the shared theme preference, not FAQ-specific theme state.
  await page.evaluate(() => localStorage.setItem('diffdevil.theme', 'light'));
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto(`${origin}/faq/#extension-data`);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.screenshot({ path: resolve(output, 'faq-light-mobile-answer.png') });
  await page.goto(`${origin}/faq/#%E0%A4%A`);
  await expect(page.locator('h1')).toBeVisible();
  evidence.push('Responsive layout at 320–1440px, compact FAQ navigation, light/mobile deep link and malformed-fragment recovery.');

  const plain = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 900 } });
  const noScript = await plain.newPage();
  await noScript.goto(`${origin}/faq/`);
  const native = noScript.locator('[data-faq-id="beyond-size-labels"]');
  await native.locator('summary').click();
  await expect(native.locator('.faq-answer')).toBeVisible();
  await plain.close();
  evidence.push('Server-rendered answer content and native disclosures work without JavaScript.');
  assert.deepEqual(failures, []);
  await writeFile(resolve(output, 'result.json'), JSON.stringify({ passed: true, origin, browser: browser.version(), questions: records.length, evidence, indexed }, null, 2));
  console.log(`FAQ browser qualification passed: ${records.length} questions; ${evidence.length} exercised journeys.`);
} catch (error) {
  await page?.screenshot({ path: resolve(output, 'faq-failure.png') }).catch(() => {});
  await writeFile(resolve(output, 'result.json'), JSON.stringify({ passed: false, evidence, failures, error: String(error?.stack ?? error) }, null, 2));
  throw error;
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
