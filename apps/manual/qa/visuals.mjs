// SPDX-License-Identifier: AGPL-3.0-only
/** Focused browser qualification for the four selected static manual visuals. */
import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { origins, pageUrl } from '../manifest.mjs';

const root = resolve('.');
const out = join(root, 'artifacts/manual/qa-visuals');
mkdirSync(out, { recursive: true });
const result = {
  checks: [], failures: [], unexpectedRequests: [], pageErrors: [], screenshots: [],
  limitations: [
    'Intercepted canonical docs origin over the built static output, not live hosting or DNS.',
    'Browser, DOM, keyboard and no-JavaScript evidence, not an actual screen-reader user journey.',
    'Chromium page-scale and narrow reflow evidence, not every browser zoom implementation.',
  ],
};
const mime = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.webp': 'image/webp', '.wasm': 'application/wasm',
  '.pf_fragment': 'application/octet-stream', '.pf_index': 'application/octet-stream', '.pf_meta': 'application/octet-stream',
};
const cases = [
  { key: 'evidence-and-uncertainty', id: 'evidence-thresholds', source: 'evidence-thresholds.vl.json', data: true },
  { key: 'source-identity-trust-and-mutation', id: 'trust-boundary', source: 'trust-boundary.mmd' },
  { key: 'paths-and-scopes', id: 'selection-boundaries', source: 'selection-boundaries.mmd' },
  { key: 'from-facts-to-provider-state', id: 'provider-readback', source: 'provider-readback.mmd' },
];

const handler = (await import(pathToFileURL(join(root, 'artifacts/manual/dist/_worker.js')).href)).default;
async function asset(request) {
  const url = new URL(request.url);
  let path;
  try { path = decodeURIComponent(url.pathname); } catch { return new Response('Bad path', { status: 400 }); }
  if (path.split('/').includes('..') || path.includes('\\')) return new Response('Bad path', { status: 400 });
  let file = join(root, 'artifacts/manual/dist', path);
  if (path.endsWith('/')) file = join(file, 'index.html');
  if (!existsSync(file) || !statSync(file).isFile()) return new Response('Not found', { status: 404 });
  return new Response(readFileSync(file), { headers: { 'Content-Type': mime[extname(file)] ?? 'application/octet-stream' } });
}
async function serve(route) {
  const url = new URL(route.request().url());
  if (url.origin !== origins.docs) {
    result.unexpectedRequests.push(url.href);
    await route.abort();
    return;
  }
  const request = new Request(url.href, { method: route.request().method() });
  const response = await handler.fetch(request, { ASSETS: { fetch: asset } });
  await route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers), body: Buffer.from(await response.arrayBuffer()) });
}
async function check(name, fn, page) {
  try {
    await fn();
    result.checks.push(name);
    console.log(`PASS ${name}`);
  } catch (error) {
    result.failures.push({ name, error: error.stack ?? String(error) });
    console.error(`FAIL ${name}: ${error.message}`);
    await page.screenshot({ path: join(out, `failure-${result.failures.length}.png`), fullPage: true }).catch(() => {});
  }
}
async function screenshot(page, name) {
  await page.screenshot({ path: join(out, name), fullPage: true });
  result.screenshots.push(name);
}
async function selectTheme(page, target) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (await page.locator('html').getAttribute('data-theme-pref') === target) return;
    await page.locator('[data-theme-control]').first().click();
  }
  throw new Error(`Could not select ${target} theme.`);
}
async function visibleImage(page, id) {
  const figure = page.locator(`[data-manual-visual="${id}"]`);
  await expect(figure).toBeVisible();
  const image = figure.locator('img:visible');
  await expect(image).toHaveCount(1);
  assert.equal(await image.evaluate(node => node.complete && node.naturalWidth > 0 && node.naturalHeight > 0), true, `${id}: image failed to load`);
  await expect(figure.locator('figcaption')).not.toBeEmpty();
  return { figure, image };
}

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'dark', reducedMotion: 'reduce' });
await context.route('**/*', serve);
const page = await context.newPage();
page.on('pageerror', error => result.pageErrors.push(error.message));
try {
  await check('Selected visual assets follow the explicit site theme and retain keyboard-reachable editable source', async () => {
    for (const visual of cases) {
      const response = await page.goto(pageUrl(visual.key));
      assert.equal(response.status(), 200, visual.key);
      await selectTheme(page, 'dark');
      let current = await visibleImage(page, visual.id);
      assert.match(await current.image.evaluate(node => node.currentSrc), new RegExp(`${visual.id}-dark\\.svg$`, 'u'));
      const source = page.locator(`.sl-markdown-content a[href*="${visual.source}"]`).first();
      await expect(source).toBeVisible();
      await source.focus();
      assert.equal(await source.evaluate(node => node === document.activeElement), true, `${visual.id}: source link not keyboard focusable`);

      await selectTheme(page, 'light');
      current = await visibleImage(page, visual.id);
      assert.match(await current.image.evaluate(node => node.currentSrc), new RegExp(`${visual.id}-light\\.svg$`, 'u'));
      await screenshot(page, `visual-${visual.id}-light.png`);
    }
  }, page);

  await check('Visual explanations remain loaded and contained from ordinary reading width through 320 pixels', async () => {
    for (const width of [1280, 640, 390, 320]) {
      for (const visual of cases) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(pageUrl(visual.key));
        await selectTheme(page, 'light');
        const { image } = await visibleImage(page, visual.id);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), true, `${visual.id}: page overflow at ${width}px`);
        assert.equal(await image.evaluate(node => node.getBoundingClientRect().width <= node.closest('.sl-markdown-content').getBoundingClientRect().width + 1), true, `${visual.id}: image overflow at ${width}px`);
        if (visual.data && width <= 390) assert.match(await image.evaluate(node => node.currentSrc), /evidence-thresholds-narrow-light\.svg$/u);
      }
    }
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto(pageUrl('evidence-and-uncertainty'));
    await selectTheme(page, 'light');
    await screenshot(page, 'visual-evidence-thresholds-320.png');
  }, page);

  await check('Two-times Chromium page scale preserves the visual, caption, and surrounding reading controls', async () => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(pageUrl('from-facts-to-provider-state'));
    const session = await context.newCDPSession(page);
    await session.send('Emulation.setPageScaleFactor', { pageScaleFactor: 2 });
    const { figure, image } = await visibleImage(page, 'provider-readback');
    await expect(figure.locator('figcaption')).toBeVisible();
    assert.equal(await image.evaluate(node => node.complete && node.naturalWidth > 0), true);
    await page.locator('[data-theme-control]').first().focus();
    assert.equal(await page.locator('[data-theme-control]').first().evaluate(node => node === document.activeElement), true);
    await screenshot(page, 'visual-provider-readback-2x-scale.png');
    await session.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 });
    await session.detach();
  }, page);

  await check('No-JavaScript readers retain one theme-appropriate image and the complete textual explanation', async () => {
    for (const colorScheme of ['dark', 'light']) {
      const plain = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 320, height: 900 }, colorScheme });
      await plain.route('**/*', serve);
      try {
        const reader = await plain.newPage();
        for (const visual of cases) {
          await reader.goto(pageUrl(visual.key));
          const figure = reader.locator(`[data-manual-visual="${visual.id}"]`);
          await expect(figure.locator('img:visible')).toHaveCount(1);
          assert.equal(await figure.locator('img:visible').evaluate(node => node.complete && node.naturalWidth > 0), true, `${visual.id}: no-JS image failed`);
          await expect(figure.locator('figcaption')).not.toBeEmpty();
          if (visual.data) await expect(reader.locator('.sl-markdown-content table').filter({ hasText: 'Evidence edition' })).toBeVisible();
          assert.equal(await reader.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), true, `${visual.id}: no-JS overflow`);
        }
      } finally {
        await plain.close();
      }
    }
  }, page);

  await check('Visual pages have no page-script errors or unexpected external requests', async () => {
    assert.deepEqual(result.pageErrors, []);
    assert.deepEqual(result.unexpectedRequests, []);
  }, page);
} finally {
  result.ok = result.failures.length === 0;
  writeFileSync(join(out, 'result.json'), JSON.stringify(result, null, 2) + '\n');
  await page.close();
  await context.close();
  await browser.close();
}
if (!result.ok) process.exitCode = 1;
