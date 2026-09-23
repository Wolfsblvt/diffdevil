// SPDX-License-Identifier: AGPL-3.0-only
// Anonymous, read-only qualification of the built extension on a current public PR.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';

const target = process.env.DIFFDEVIL_PUBLIC_PR ?? 'https://github.com/Wolfsblvt/diffdevil/pull/48';
const output = resolve('artifacts/browser-extension/qa/public-installed');
const extension = resolve(process.argv.find(arg => arg.startsWith('--extension='))?.slice('--extension='.length) ?? 'artifacts/browser-extension/unpacked');
await mkdir(output, { recursive: true });
const profile = await mkdtemp(join(tmpdir(), 'diffdevil-public-installed-'));
const receipt = { kind: 'diffdevil.public-installed-qa/1', target, checks: [], errors: [], console: [], status: 'incomplete' };
let context;
try {
  context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium', headless: true, viewport: { width: 1280, height: 800 },
    ignoreDefaultArgs: ['--disable-extensions'],
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });
  await context.tracing.start({ screenshots: true, snapshots: true });
  const watchedWorkers = new WeakSet();
  const watchWorker = worker => {
    if (watchedWorkers.has(worker)) return;
    watchedWorkers.add(worker);
    worker.on('console', message => { if (message.type() === 'error') { const item = { surface: 'worker-console', text: message.text() }; receipt.console.push(item); receipt.errors.push(item); } });
  };
  context.on('serviceworker', watchWorker);
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker', { timeout: 20_000 });
  watchWorker(worker);
  const page = await context.newPage();
  page.on('pageerror', error => receipt.errors.push({ surface: 'page', text: error.message }));
  page.on('console', message => { if (message.type() === 'error') { const item = { surface: 'page-console', text: message.text() }; receipt.console.push(item); if (item.text.includes('diffdevil')) receipt.errors.push(item); } });
  const files = `${target.replace(/\/$/u, '')}/files`;
  await page.goto(files, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-ddx="aggregate"] .ddx-value').waitFor({ timeout: 45_000 });
  receipt.checks.push('direct aggregate Changed');
  await page.locator('[data-ddx="file"] .ddx-value').first().waitFor({ timeout: 20_000 });
  receipt.checks.push('direct per-file Changed');
  await page.locator('[data-ddx="aggregate"] .ddx-trigger').click();
  await page.getByRole('heading', { name: 'diffdevil analysis' }).waitFor();
  receipt.checks.push('aggregate report opens');
  await page.keyboard.press('Escape');
  await page.goto(target, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { window.__diffdevilDocumentMarker = 'before-files-click'; });
  await page.locator('a[href$="/files"]').first().click();
  await page.waitForURL(url => url.pathname.endsWith('/files'), { timeout: 30_000 });
  receipt.softNavigation = await page.evaluate(() => window.__diffdevilDocumentMarker === 'before-files-click');
  await page.locator('[data-ddx="aggregate"] .ddx-value').waitFor({ timeout: 45_000 });
  await page.locator('[data-ddx="file"] .ddx-value').first().waitFor({ timeout: 20_000 });
  receipt.checks.push(`${receipt.softNavigation ? 'soft' : 'full'} navigation aggregate and per-file Changed`);
  // A provider click may fully reload the anonymous page. Keep another GitHub
  // document alive while moving its tab route to exercise Chrome's split
  // between sender.url (document URL) and sender.tab.url (current tab URL).
  await worker.evaluate(() => {
    globalThis.__diffdevilRouteProbe = undefined;
    chrome.runtime.onMessage.addListener((message, sender) => {
      if (message?.type !== 'cache.lookup') return;
      const frame = sender.url && new URL(sender.url);
      const tab = sender.tab?.url && new URL(sender.tab.url);
      globalThis.__diffdevilRouteProbe = {
        frame: frame?.pathname.endsWith('/files') ? 'pr-files' : frame?.pathname.includes('/pull/') ? 'pr-other' : 'other',
        tab: tab?.pathname.endsWith('/files') ? 'pr-files' : tab?.pathname.includes('/pull/') ? 'pr-other' : 'other',
        routeAgreement: frame && tab ? frame.origin === tab.origin && frame.pathname === tab.pathname ? 'same' : 'different' : 'unavailable',
      };
    });
  });
  const historyPage = await context.newPage();
  historyPage.on('pageerror', error => receipt.errors.push({ surface: 'history-page', text: error.message }));
  historyPage.on('console', message => { if (message.type() === 'error') { const item = { surface: 'history-console', text: message.text() }; receipt.console.push(item); if (item.text.includes('diffdevil')) receipt.errors.push(item); } });
  await historyPage.goto('https://github.com/Wolfsblvt/diffdevil', { waitUntil: 'domcontentloaded' });
  await historyPage.evaluate(url => {
    history.pushState({}, '', url);
    const summary = document.createElement('div');
    summary.dataset.testid = 'pull-request-diff-stats';
    document.body.append(summary);
    document.dispatchEvent(new Event('soft-nav:payload'));
  }, files);
  await historyPage.locator('[data-ddx="aggregate"] .ddx-value').waitFor({ timeout: 45_000 });
  receipt.routeAgreement = await worker.evaluate(() => globalThis.__diffdevilRouteProbe);
  assert.ok(receipt.routeAgreement, 'The passing route step must record Chrome sender agreement.');
  receipt.checks.push('same-document route change reaches the installed worker');
  assert.deepEqual(receipt.errors, []);
  receipt.status = 'passed';
} catch (error) {
  receipt.status = 'failed';
  receipt.errors.push({ surface: 'journey', text: String(error.stack ?? error) });
  if (context) {
    const page = context.pages().at(-1);
    receipt.pageState = await page?.evaluate(() => ({ url: location.href, status: [...document.querySelectorAll('.ddx-status')].map(node => node.textContent), projections: document.querySelectorAll('[data-ddx]').length })).catch(() => undefined);
    await page?.screenshot({ path: join(output, 'failure.png'), fullPage: true }).catch(() => undefined);
    await context.tracing.stop({ path: join(output, 'failure-trace.zip') }).catch(() => undefined);
  }
  process.exitCode = 1;
} finally {
  if (context) {
    if (receipt.status === 'passed') await context.tracing.stop().catch(() => undefined);
    await context.close();
  }
  await rm(profile, { recursive: true, force: true });
  await writeFile(join(output, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`);
  await writeFile(join(output, 'console.json'), `${JSON.stringify(receipt.console, null, 2)}\n`);
  console.log(JSON.stringify(receipt, null, 2));
}
