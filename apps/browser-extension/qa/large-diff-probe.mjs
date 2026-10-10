// SPDX-License-Identifier: AGPL-3.0-only
/**
 * What the content script costs the page when GitHub renders one very large file in place, as its
 * Load diff does for a collapsed generated file. The same authored page renders a synthetic diff of
 * `--lines` rows (default 9,700) in chunks, once without diffdevil and once with the production
 * content controller running and settled, then scrolls through it. The difference is the content
 * script's main-thread work. Authored fixtures only: GitHub's own React rendering cost is not
 * modelled, so this cannot say how long GitHub itself takes; it can say whether diffdevil adds work
 * proportional to the file.
 */
import { chromium } from 'playwright-core';
import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { productionModules, unwrap } from '../tests/support.mjs';
import { comparison, diff, githubCss, githubHtml } from './fixtures.mjs';

const lines = Number(process.argv.find(argument => argument.startsWith('--lines='))?.slice(8) ?? 9700);
const chunks = Number(process.argv.find(argument => argument.startsWith('--chunks='))?.slice(9) ?? 40);
const rounds = Number(process.argv.find(argument => argument.startsWith('--rounds='))?.slice(9) ?? 3);
const out = resolve('artifacts/browser-extension/qa'); await mkdir(out, { recursive: true });
const loaded = await productionModules(); const m = loaded.module;
const settings = { ...m.DEFAULTS };
const report = unwrap(m.analyzeBrowserInput(JSON.stringify({ comparison, format: 'diff', text: diff, complete: true })));
const policy = unwrap(m.compileBrowserPolicy(JSON.stringify({ mode: 'composed', personal: m.personalYaml(settings) })));
const view = m.decorateView(unwrap(m.humanReport(report, policy)), settings);
const packet = { key: `${m.comparisonKey(comparison)}:${policy.digest}`, comparison, view, files: report.files.map(file => ({ path: file.path, standing: 'measured' })), refreshedAt: 1, cached: false, coverage: { measured: 2, bounded: 0, declined: 0, total: 2, totalExact: true, limit: 150, automatic: 2, topUp: 0, explicit: 0, onDemand: 0, declinedReasons: {}, unresolved: 0, unresolvedReasons: {} } };
const fileViews = Object.fromEntries(report.files.map(file => [file.path, m.decorateView(unwrap(m.humanReport(report, policy, file.path)), settings)]));
const domCode = (await build({ entryPoints: ['apps/browser-extension/qa/dom-entry.ts'], write: false, bundle: true, platform: 'browser', format: 'iife', target: 'chrome120', globalName: 'DiffdevilUnderTest', loader: { '.css': 'text' },
  alias: { '@wolfsblvt/diffdevil/browser/text': resolve('dist/lib/browser/text.js'), '@wolfsblvt/diffdevil/browser': resolve('dist/browser/index.js') } })).outputFiles[0].text;
const contentCss = await readFile('apps/browser-extension/src/content/content.css', 'utf8');
const executablePath = process.env.CHROMIUM_PATH ?? (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true, args: ['--no-sandbox', '--disable-gpu'] });

async function sample(withExtension) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'dark', reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.setContent(githubHtml({ dark: true, files: true })); await page.addStyleTag({ content: githubCss + contentCss });
  // A collapsed generated file, as GitHub's Load diff will expand it.
  await page.evaluate(() => document.querySelector('main').insertAdjacentHTML('beforeend', '<section class="fixture-file" data-path="generated/vendor.lock"><div class="file-header" data-path="generated/vendor.lock"><span>generated/vendor.lock</span><span class="diffstat"><span>+8083</span> <span>−1614</span></span></div><table class="diff-table"><tbody id="huge"></tbody></table></section>'));
  if (withExtension) {
    await page.addScriptTag({ content: domCode });
    await page.evaluate(({ packet, settings, fileViews }) => {
      globalThis.chrome = { runtime: { id: 'probe', getURL: path => `chrome-extension://probe/${path}`, getManifest: () => ({ version: '0' }), sendMessage: async () => ({ ok: false, code: 'UNEXPECTED', message: 'probe' }) }, storage: { onChanged: { addListener() {}, removeListener() {} } } };
      globalThis.controller = DiffdevilUnderTest.startContent({ href: () => 'https://github.com/example/cinder/pull/42/files', acquire: async () => ({ packet, settings }),
        request: async message => { if (message.type === 'settings.get') return settings; if (message.type === 'analysis.files') return Object.fromEntries(message.paths.filter(path => fileViews[path]).map(path => [path, fileViews[path]])); return {}; },
        measure: async (scope, base) => base });
    }, { packet, settings, fileViews });
    await page.locator('.ddx-root[data-ddx="aggregate"]').waitFor(); await page.waitForTimeout(500);
  }
  const result = await page.evaluate(async ({ lines, chunks }) => {
    const longTasks = []; const observer = new PerformanceObserver(list => { for (const entry of list.getEntries()) longTasks.push(entry.duration); }); observer.observe({ type: 'longtask', buffered: false });
    const frame = () => new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
    const body = document.getElementById('huge'); const per = Math.ceil(lines / chunks); let blocked = 0;
    const row = index => `<tr class="diff-line-row"><td class="blob-num">${index}</td><td class="blob-num">${index}</td><td class="blob-code ${index % 5 ? 'blob-code-addition' : 'blob-code-deletion'}"><span class="blob-code-inner"><span class="pl-s">"node_modules/pkg-${index}"</span>: <span class="pl-c1">{</span> <span class="pl-s">"version"</span>: <span class="pl-s">"1.${index}.0"</span> <span class="pl-c1">}</span></span></td></tr>`;
    const started = performance.now();
    for (let chunk = 0; chunk < chunks; chunk++) {
      const html = Array.from({ length: Math.min(per, lines - chunk * per) }, (_, offset) => row(chunk * per + offset)).join('');
      const before = performance.now(); body.insertAdjacentHTML('beforeend', html); document.body.offsetHeight; await frame(); blocked += performance.now() - before;
    }
    const rendered = performance.now() - started;
    const scrollStart = performance.now(); for (let step = 0; step < 20; step++) { scrollBy(0, 4000); await frame(); } await new Promise(resolve => setTimeout(resolve, 700)); await frame();
    const scrolled = performance.now() - scrollStart; observer.disconnect();
    return { rendered: Math.round(rendered), blocked: Math.round(blocked), scrolled: Math.round(scrolled), longTasks: longTasks.length, longestTask: Math.round(Math.max(0, ...longTasks)), longTaskTotal: Math.round(longTasks.reduce((sum, value) => sum + value, 0)), nodes: document.getElementsByTagName('*').length };
  }, { lines, chunks });
  await context.close(); return result;
}
const samples = [];
for (let round = 0; round < rounds; round++) for (const withExtension of [false, true]) samples.push({ round, withExtension, ...(await sample(withExtension)) });
await browser.close(); await loaded.cleanup();
const median = (values) => { const sorted = [...values].sort((a, b) => a - b); return sorted[Math.floor(sorted.length / 2)]; };
const summary = Object.fromEntries([false, true].map(flag => [flag ? 'withExtension' : 'withoutExtension', Object.fromEntries(['rendered', 'blocked', 'scrolled', 'longTasks', 'longestTask', 'longTaskTotal', 'nodes'].map(key => [key, median(samples.filter(item => item.withExtension === flag).map(item => item[key]))]))]));
const receipt = { kind: 'diffdevil.extension.large-diff-probe/1', lines, chunks, rounds, qualification: 'Authored page, headless Chromium, synthetic rows. Medians of single sandbox samples; not GitHub’s own rendering cost and not a performance guarantee.', summary, samples };
await writeFile(join(out, 'large-diff-probe.json'), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ lines, chunks, rounds, summary }, null, 2));
