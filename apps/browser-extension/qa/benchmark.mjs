// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Costs of the automatic file limit, measured in the real installed MV3 worker with synthetic provider
 * files: elapsed time, serialized sizes, worker heap and what a cold rehydration after worker death costs.
 * Provider request behavior is measured separately against a real public pull request with --live.
 * Synthetic specimens say nothing about GitHub's latency; they bound the extension's own work.
 */
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { comparison } from './fixtures.mjs';
import { analyzeBrowserInput, compileBrowserPolicy, humanReport } from '../../../dist/browser/index.js';
const output = resolve('artifacts/browser-extension/qa'); await mkdir(output, { recursive: true });
const SPECIMENS = [['small', 12], ['100+', 150], ['500+', 600], ['provider ceiling', 3000]];
const LIMITS = [25, 50, 100, 150, 250, 500];
const bytes = value => new TextEncoder().encode(JSON.stringify(value)).byteLength;
// Deterministic, realistic-enough patches: one to several hunks per file, a few dozen changed lines each.
function patchFor(index) {
  let seed = (index + 1) * 2654435761 >>> 0; const next = limit => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed % limit; };
  const hunks = 1 + next(4); let additions = 0; let deletions = 0; let text = ''; let oldLine = 1; let newLine = 1;
  for (let hunk = 0; hunk < hunks; hunk++) {
    const added = 1 + next(30); const deleted = next(20); const context = 3;
    text += `@@ -${oldLine},${deleted + context * 2} +${newLine},${added + context * 2} @@ function symbol${hunk}() {\n`;
    for (let line = 0; line < context; line++) text += ` const context_${index}_${hunk}_${line} = unchanged(${line});\n`;
    for (let line = 0; line < deleted; line++) text += `-  const removed_${index}_${hunk}_${line} = computeSomethingFairlyLong(${line}, 'value-${next(1000)}');\n`;
    for (let line = 0; line < added; line++) text += `+  const added_${index}_${hunk}_${line} = computeSomethingFairlyLong(${line}, 'value-${next(1000)}');\n`;
    for (let line = 0; line < context; line++) text += ` const trailing_${index}_${hunk}_${line} = unchanged(${line});\n`;
    additions += added; deletions += deleted; oldLine += deleted + context * 2 + 40; newLine += added + context * 2 + 40;
  }
  return { patch: text, additions, deletions };
}
const specimen = (count, patched, pullRequest) => {
  const files = Array.from({ length: count }, (_, index) => { const { patch, additions, deletions } = patchFor(index); return { filename: `src/module${String(Math.floor(index / 20)).padStart(3, '0')}/file${String(index).padStart(4, '0')}.ts`, status: 'modified', additions, deletions, ...(index < patched ? { patch } : {}) }; });
  const additions = files.reduce((sum, file) => sum + file.additions, 0); const deletions = files.reduce((sum, file) => sum + file.deletions, 0);
  const identity = { ...comparison, pullRequest, changedFiles: count, additions, deletions };
  return { comparison: identity, format: 'github-files', complete: true, files };
};
/** The same engine the worker runs, timed and weighed in-process: its retained heap after a collection, not a guess at the worker's. */
function engineCost(input) {
  globalThis.gc?.(); const before = process.memoryUsage().heapUsed; const start = performance.now();
  const analysed = analyzeBrowserInput(JSON.stringify(input)); assert.equal(analysed.ok, true); const analyzeMs = performance.now() - start;
  const policy = compileBrowserPolicy(JSON.stringify({ mode: 'personal-only', personal: 'version: 1\npresets: [size@1]\n' })); const projectStart = performance.now(); const view = humanReport(analysed.value, policy.ok ? policy.value : undefined); assert.equal(view.ok, true);
  const projectMs = performance.now() - projectStart; globalThis.gc?.(); const heapBytes = process.memoryUsage().heapUsed - before; void view;
  return { analyzeMs: Math.round(analyzeMs), projectMs: Math.round(projectMs), heapBytes };
}
const extension = resolve('artifacts/browser-extension/unpacked'); const profile = await mkdtemp(join(tmpdir(), 'diffdevil-benchmark-'));
const context = await chromium.launchPersistentContext(profile, { ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : { channel: 'chromium' }), headless: process.env.HEADED !== '1', ignoreDefaultArgs: ['--disable-extensions'], args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`, ...(process.platform === 'linux' ? ['--no-sandbox'] : [])] });
const rows = []; let pullRequest = 1000;
try {
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker', { timeout: 20_000 }); const base = worker.url().replace(/\/background\.js(?:[?#].*)?$/u, '');
  const page = await context.newPage(); await page.goto(`${base}/options.html`); await page.locator('.setting').first().waitFor();
  const send = async message => { const start = performance.now(); const response = await page.evaluate(message => chrome.runtime.sendMessage(message), message); const elapsed = performance.now() - start; assert.equal(response?.ok, true, response?.message ?? 'no response'); return { value: response.value, elapsed }; };
  const cdp = await context.newCDPSession(page); await cdp.send('ServiceWorker.enable');
  const settle = () => new Promise(resolve => setTimeout(resolve, 300));
  // Large automatic limits need a cache that can hold them; the default budget is exercised and reported separately.
  await send({ type: 'settings.save', patch: { 'cache.maximumSize': 128, 'analysis.maximumFiles': 3000 } });
  for (const [label, count] of SPECIMENS) {
    for (const limit of [...LIMITS.filter(value => value < count), count]) {
      await send({ type: 'data.action', action: 'data.clearAnalysisCache' }); await settle(); const identity = ++pullRequest; const input = specimen(count, limit, identity);
      const acquisition = bytes(input); const local = engineCost(input);
      const run = await send({ type: 'analysis.run', input: { comparison: input.comparison, acquisition: input, policy: { status: 'absent', at: Date.now() }, coverage: { limit, declined: {} } } });
      const diagnostics = (await send({ type: 'diagnostics.get' })).value;
      const warm = await send({ type: 'analysis.run', input: { comparison: input.comparison, policy: { status: 'absent', at: Date.now() } } });
      await cdp.send('ServiceWorker.stopAllWorkers'); await settle();
      const cold = await send({ type: 'analysis.files', key: run.value.key, comparison: input.comparison, paths: input.files.slice(0, 24).map(file => file.filename) });
      rows.push({ specimen: label, files: count, limit: Math.min(limit, count), acquisitionBytes: acquisition, packetBytes: bytes(run.value), storedReportBytes: diagnostics.cache.reportBytes, coldRunMs: Math.round(run.elapsed), warmRunMs: Math.round(warm.elapsed), coldRehydrateMs: Math.round(cold.elapsed), engineAnalyzeMs: local.analyzeMs, engineProjectMs: local.projectMs, engineHeapBytes: local.heapBytes, measuredFiles: run.value.coverage.measured, boundedFiles: run.value.coverage.bounded });
      console.log(JSON.stringify(rows.at(-1)));
    }
  }
} finally { await context.close(); await rm(profile, { recursive: true, force: true }); }
const receipt = { kind: 'diffdevil.extension.benchmark/1', note: 'Synthetic provider files in the real installed MV3 worker. Provider latency is not represented.', platform: process.platform, node: process.version, rows };
await writeFile(join(output, 'benchmark-receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`);
