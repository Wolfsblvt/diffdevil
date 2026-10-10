// SPDX-License-Identifier: AGPL-3.0-only
/**
 * GitHub request behavior of the automatic file limit, measured with the built extension in an
 * anonymous disposable profile on real public pull requests. Read-only, a few dozen requests per run.
 * Usage: node benchmark-live.mjs <limit> <pull-request-url>...
 */
import { chromium } from 'playwright-core';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
const route = process.env.ROUTE ?? 'files'; const [limitText, ...targets] = process.argv.slice(2); const limit = Number(limitText);
if (!Number.isInteger(limit) || !targets.length) throw new Error('Usage: benchmark-live.mjs <limit> <pull-request-url>...');
const output = resolve('artifacts/browser-extension/qa'); await mkdir(output, { recursive: true });
const extension = resolve('artifacts/browser-extension/unpacked'); const results = [];
const percentile = (values, fraction) => values.length ? [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.floor(values.length * fraction))] : undefined;
for (const target of targets) {
  const profile = await mkdtemp(join(tmpdir(), 'diffdevil-live-benchmark-'));
  const context = await chromium.launchPersistentContext(profile, { channel: 'chromium', headless: true, viewport: { width: 1228, height: 778 }, ignoreDefaultArgs: ['--disable-extensions'], args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
  try {
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker', { timeout: 20_000 }); const base = worker.url().replace(/\/background\.js(?:[?#].*)?$/u, '');
    const settings = await context.newPage(); await settings.goto(`${base}/options.html`);
    await settings.evaluate(limit => chrome.runtime.sendMessage({ type: 'settings.save', patch: { 'analysis.maximumFiles': limit, 'cache.maximumSize': 128 } }), limit);
    const page = await context.newPage(); const entries = []; const documents = []; let lastEntry = 0;
    const api = [];
    context.on('requestfinished', async request => {
      const url = request.url(); if (url.startsWith('https://api.github.com/')) { const sizes = await request.sizes().catch(() => undefined); api.push({ ms: Math.round(request.timing().responseEnd), bytes: sizes?.responseBodySize ?? 0, status: (await request.response())?.status(), path: new URL(url).pathname.replace(/\/repos\/[^/]+\/[^/]+/u, '/repos/o/r').slice(0, 50) }); lastEntry = performance.now(); return; }
      if (!url.startsWith('https://github.com/')) return; const timing = request.timing(); const sizes = await request.sizes().catch(() => undefined);
      const record = { ms: Math.round(timing.responseEnd), bytes: sizes?.responseBodySize ?? 0, status: (await request.response())?.status() };
      if (url.includes('/page_data/diff_entries')) { entries.push(record); lastEntry = performance.now(); } else if (request.resourceType() === 'document' || request.resourceType() === 'fetch') documents.push({ ...record, path: new URL(url).pathname.replace(/\/pull\/\d+/u, '/pull/N').slice(0, 60) });
    });
    const started = performance.now(); await page.goto(`${target.replace(/\/$/u, '')}/${route}`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-ddx="aggregate"] .ddx-value').waitFor({ timeout: 180_000 }); const firstSeatMs = Math.round(performance.now() - started);
    while (performance.now() - lastEntry < 2500 && performance.now() - started < 240_000) await new Promise(resolve => setTimeout(resolve, 250));
    const settledMs = Math.round(performance.now() - started);
    await page.locator('[data-ddx="aggregate"] .ddx-trigger').click(); const report = await page.locator('.ddx-popover').innerText();
    const coverage = /measured\s+(\d+)\s+bounded\s+(\d+)\s+provider-declined\s+(\d+)\s+total\s+(?:≥\s*)?(\d+)/u.exec(report.replace(/\n/gu, ' '));
    const inventory = await settings.evaluate(() => chrome.runtime.sendMessage({ type: 'data.inventory' }));
    const latencies = entries.map(item => item.ms); const errors = entries.filter(item => item.status !== 200).length;
    results.push({ target, route, limit, apiRequests: api.length, apiBytes: api.reduce((sum, item) => sum + item.bytes, 0), apiMsP95: percentile(api.map(item => item.ms), .95), firstSeatMs, settledMs, entryRequests: entries.length, entryBytes: entries.reduce((sum, item) => sum + item.bytes, 0), entryMsP50: percentile(latencies, .5), entryMsP95: percentile(latencies, .95), entryErrors: errors,
      coverage: coverage ? { measured: Number(coverage[1]), bounded: Number(coverage[2]), declined: Number(coverage[3]), total: Number(coverage[4]) } : report.slice(0, 400), storedBytes: inventory.value?.info?.bytes, documents: documents.slice(0, 6) });
    console.log(JSON.stringify(results.at(-1)));
  } finally { await context.close(); await rm(profile, { recursive: true, force: true }); }
}
await writeFile(join(output, `benchmark-live-${route}-${limit}.json`), `${JSON.stringify({ kind: 'diffdevil.extension.live-benchmark/1', note: 'Anonymous, read-only, built extension on real public pull requests.', results }, null, 2)}\n`);
