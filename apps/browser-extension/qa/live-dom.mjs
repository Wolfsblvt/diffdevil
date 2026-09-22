// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Focused qualification for GitHub's current tokenized diffstat summary and
 * the provider-independent missing-anchor fallback. Authored fixtures only;
 * this is not a live github.com or Store-publication claim.
 */
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { productionModules, unwrap } from '../tests/support.mjs';
import { comparison, diff, githubCss, githubHtml } from './fixtures.mjs';

const loaded = await productionModules();
const m = loaded.module;
const settings = { ...m.DEFAULTS };
const report = unwrap(m.analyzeBrowserInput(JSON.stringify({ comparison, format: 'diff', text: diff, complete: true })));
const policy = unwrap(m.compileBrowserPolicy(JSON.stringify({ mode: 'composed', personal: m.personalYaml(settings) })));
const view = m.decorateView(unwrap(m.humanReport(report, policy)), settings);
const packet = {
  key: `${m.comparisonKey(comparison)}:${policy.digest}`,
  comparison,
  view,
  files: report.files.map(file => ({ id: file.id, path: file.path, ...(file.oldPath ? { oldPath: file.oldPath } : {}) })),
  refreshedAt: Date.UTC(2026, 8, 22, 2),
  cached: false,
};
const domCode = (await build({
  entryPoints: ['apps/browser-extension/qa/dom-entry.ts'],
  write: false,
  bundle: true,
  platform: 'browser',
  format: 'iife',
  target: 'chrome120',
  globalName: 'DiffdevilUnderTest',
  alias: {
    '@wolfsblvt/diffdevil/browser/text': resolve('dist/lib/browser/text.js'),
    '@wolfsblvt/diffdevil/browser': resolve('dist/browser/index.js'),
  },
})).outputFiles[0].text;
const contentCss = await readFile('apps/browser-extension/src/content/content.css', 'utf8');
const executablePath = process.env.CHROMIUM_PATH ?? (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true, args: ['--no-sandbox', '--disable-gpu'] });
const results = [];
async function scene(summary) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'dark', reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.setDefaultTimeout(4000);
  await page.setContent(githubHtml({ dark: true, files: false, summary }));
  await page.addStyleTag({ content: githubCss + contentCss });
  await page.addScriptTag({ content: domCode });
  await page.evaluate(({ packet, settings }) => {
    const listeners = new Set();
    globalThis.chrome = {
      runtime: { id: 'test-extension', getURL: path => `chrome-extension://test-extension/${path}`, sendMessage: async message => message.type === 'settings.get' ? { ok: true, value: settings } : { ok: false, code: 'UNEXPECTED', message: message.type } },
      storage: { onChanged: { addListener: callback => listeners.add(callback), removeListener: callback => listeners.delete(callback) } },
    };
    globalThis.controller = DiffdevilUnderTest.startContent({
      href: () => 'https://github.com/example/cinder/pull/42/files',
      acquire: async () => ({ packet, settings }),
      request: async message => {
        if (message.type === 'settings.get') return settings;
        if (message.type === 'analysis.files') return {};
        throw new Error(`Unexpected focused fixture request: ${message.type}`);
      },
    });
  }, { packet, settings });
  return { context, page };
}
try {
  const current = await scene('current');
  await current.page.locator('[data-ddx="aggregate"]').waitFor();
  assert.equal(await current.page.locator('[data-ddx="aggregate"] .ddx-value').textContent(), '178');
  assert.equal(await current.page.locator('.fixture-current-summary + [data-ddx="aggregate"]').count(), 1);
  assert.equal(await current.page.locator('.ddx-status-fallback').count(), 0);
  results.push({ name: 'current-tokenized-diffstat', status: 'passed' });
  await current.page.evaluate(() => controller.stop());
  await current.context.close();

  const missing = await scene('missing');
  await missing.page.locator('.ddx-status-fallback').waitFor();
  assert.match(await missing.page.locator('.ddx-status-fallback').textContent(), /could not find GitHub’s pull-request summary/u);
  assert.equal(await missing.page.getByRole('button', { name: 'Retry', exact: true }).count(), 1);
  results.push({ name: 'missing-anchor-self-reports', status: 'passed' });
  await missing.page.evaluate(() => {
    const host = document.querySelector('.fixture-summary-slot');
    for (const [testId, text] of [['addition diffstat', '+160'], ['deletion diffstat', '−118'], ['neutral diffstat', '2 files']]) {
      const item = document.createElement('span');
      item.setAttribute('data-testid', testId);
      item.textContent = text;
      host.append(item);
    }
  });
  await missing.page.locator('[data-ddx="aggregate"]').waitFor();
  assert.equal(await missing.page.locator('[data-ddx="aggregate"]').count(), 1);
  assert.equal(await missing.page.locator('.ddx-status-fallback').count(), 0);
  results.push({ name: 'late-provider-summary-rebinds-once', status: 'passed' });
  await missing.page.evaluate(() => controller.stop());
  await missing.context.close();
} finally {
  await browser.close();
  await loaded.cleanup();
}
await mkdir('artifacts/browser-extension/qa', { recursive: true });
await writeFile('artifacts/browser-extension/qa/live-dom-receipt.json', `${JSON.stringify({ kind: 'diffdevil.extension.live-dom-qa/1', liveGitHubVerified: false, results }, null, 2)}\n`);
console.log(JSON.stringify({ passed: results.length, failed: 0, qualification: 'current-shaped GitHub summary and missing-anchor fallback' }, null, 2));
