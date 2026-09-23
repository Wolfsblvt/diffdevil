// SPDX-License-Identifier: AGPL-3.0-only
/** Real production DOM/controllers + a declared deterministic transport/storage harness.
 * Does NOT claim installed MV3, private GitHub, native permissions or live selectors.
 */
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { build } from 'esbuild';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { createHash } from 'node:crypto';
import { productionModules, memoryAreas, unwrap } from '../tests/support.mjs';
import { comparison, diff, filePatch, fileHeader, githubHtml, githubCss } from './fixtures.mjs';
const out = resolve('artifacts/browser-extension/qa'); await mkdir(out, { recursive: true });
const loaded = await productionModules(); const m = loaded.module;
const areas = memoryAreas(); const preferences = new m.Preferences(areas); let settings = await preferences.load();
const contexts = new Map(); let fileCalls = 0; let failFiles = false; let settingsWrites = 0;
const measurements = [];
const checks = []; const errors = []; const network = []; const screenshots = [];
const timed = (name, action) => { const start = performance.now(); const value = action(); measurements.push({ name, milliseconds: performance.now() - start }); return value; };
function packet(data = comparison, text = diff, input) {
  const report = timed('parse-and-analyze', () => unwrap(m.analyzeBrowserInput(JSON.stringify(input ?? { comparison: data, format: 'diff', text, complete: true }))));
  const policy = timed('compile-personal-policy', () => unwrap(m.compileBrowserPolicy(JSON.stringify({ mode: 'composed', personal: m.personalYaml(settings) }))));
  const view = timed('project-aggregate', () => m.decorateView(unwrap(m.humanReport(report, policy)), settings));
  const key = `${m.comparisonKey(data)}:${policy.digest}`;
  const result = { key, comparison: data, view, files: report.files.map(file => ({ id: file.id, path: file.path, ...(file.oldPath ? { oldPath: file.oldPath } : {}) })), refreshedAt: Date.UTC(2026, 8, 19, 12), cached: false };
  contexts.set(key, { report, policy, packet: result }); return result;
}
let currentPacket = packet();
const totals = () => { const bytes = [...contexts.values()].reduce((sum, item) => sum + Buffer.byteLength(JSON.stringify(item.report)), 0); return { entries: contexts.size, bytes, reportEntries: contexts.size, reportBytes: bytes, policyEntries: 0, policyBytes: 0, maximumBytes: Number(settings['cache.maximumSize']) * 1024 * 1024 }; };
async function diagnostics() { return { version: '1.0.0 fixture', engine: '1.0.0', schema: '1.0', presenter: m.HUMAN_VIEW_VERSION, measurement: m.SEMANTICS.replacementLines, cache: totals(), syncBytes: await areas.sync.getBytesInUse(), localBytes: await areas.local.getBytesInUse(), errors: [], last: { ...currentPacket.comparison, at: currentPacket.refreshedAt } }; }
async function rpc(message) {
  try {
    let value;
    switch (message.type) {
      case 'settings.get': value = await preferences.load(); break;
      case 'settings.save': settings = value = await preferences.save(message.patch, Boolean(message.replace)); settingsWrites++; break;
      case 'analysis.files': {
        fileCalls++; if (failFiles) throw Object.assign(new Error('Fixture file transport unavailable.'), { code: 'FILE_FIXTURE_FAILURE' });
        const context = contexts.get(message.key); if (!context) throw Object.assign(new Error('Context expired'), { code: 'CONTEXT_EXPIRED' });
        value = Object.fromEntries(message.paths.filter(path => context.report.files.some(file => file.path === path || file.oldPath === path)).map(path => [path, m.decorateView(unwrap(m.humanReport(context.report, context.policy, path)), settings)])); break;
      }
      case 'diagnostics.get': value = await diagnostics(); break;
      case 'data.action':
        if (message.action === 'diagnostics.copySupportSnapshot') value = { version: '1.0.0', cache: totals(), sourcePresent: true, policy: { redacted: true } };
        else { if (message.action === 'data.resetAll') await preferences.reset(); if (message.action === 'data.clearRepositoryOverrides') await preferences.save({ 'policy.repositoryOverrides': '{}' }); settings = await preferences.load(); value = await diagnostics(); }
        break;
      default: throw new Error(`Unexpected fixture message: ${message.type}`);
    }
    return { ok: true, value };
  } catch (error) { return { ok: false, code: error.code ?? 'TEST_OPERATION_FAILED', message: error.message }; }
}
const bundled = async (file, globalName) => (await build({ entryPoints: [file], write: false, bundle: true, platform: 'browser', format: 'iife', target: 'chrome120', globalName, alias: { '@wolfsblvt/diffdevil/browser/text': resolve('dist/lib/browser/text.js'), '@wolfsblvt/diffdevil/browser': resolve('dist/browser/index.js') } })).outputFiles[0].text;
const optionsCode = await bundled('apps/browser-extension/src/options/main.ts', 'OptionsUnderTest');
const domCode = await bundled('apps/browser-extension/qa/dom-entry.ts', 'DiffdevilUnderTest');
const optionsCss = await readFile('artifacts/browser-extension/unpacked/options.css', 'utf8');
const contentCss = await readFile('apps/browser-extension/src/content/content.css', 'utf8');
const assets = {};
for (const file of await readdir('artifacts/browser-extension/unpacked/assets')) if (/\.(svg|png)$/u.test(file)) assets[`assets/${file}`] = `data:image/${file.endsWith('.svg') ? 'svg+xml' : 'png'};base64,${(await readFile(`artifacts/browser-extension/unpacked/assets/${file}`)).toString('base64')}`;
const executablePath = process.env.CHROMIUM_PATH ?? (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true, args: ['--no-sandbox', '--disable-gpu'] });
async function environment({ dark = true, mobile = false } = {}) {
  const context = await browser.newContext({ viewport: mobile ? { width: 375, height: 740 } : { width: 1280, height: 800 }, colorScheme: dark ? 'dark' : 'light', reducedMotion: 'reduce' });
  const page = await context.newPage(); page.setDefaultTimeout(4000);
  page.on('pageerror', error => errors.push({ page: page.url(), message: error.message }));
  page.on('request', request => { if (!request.url().startsWith('data:') && !request.url().startsWith('about:')) network.push(request.url()); });
  await page.exposeFunction('__rpc', rpc);
  await page.evaluate(({ assets }) => {
    const listeners = new Set(); globalThis.__emitSettings = () => { for (const listener of listeners) listener({ 'diffdevil.settings.v1': { newValue: true } }, 'local'); };
    globalThis.__emitError = () => { for (const listener of listeners) listener({ errors: { newValue: [] } }, 'local'); };
    globalThis.chrome = { runtime: { id: 'test-extension', getURL: path => assets[path] ?? `chrome-extension://test-extension/${path}`, getManifest: () => ({ version: '1.0.0' }), sendMessage: message => globalThis.__rpc(message), openOptionsPage: async () => {} }, storage: { onChanged: { addListener: callback => listeners.add(callback), removeListener: callback => listeners.delete(callback) } } };
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { globalThis.__clipboard = text; } } });
  }, { assets });
  return { page, context };
}
async function check(name, run) { const start = performance.now(); try { await run(); checks.push({ name, status: 'passed', milliseconds: Math.round((performance.now() - start) * 100) / 100 }); } catch (error) { checks.push({ name, status: 'failed', message: error.message }); throw error; } }
async function capture(page, name) { const path = join(out, `${name}.png`); await page.screenshot({ path, animations: 'disabled' }); screenshots.push({ file: `${name}.png`, sha256: createHash('sha256').update(await readFile(path)).digest('hex'), width: page.viewportSize().width, height: page.viewportSize().height }); }
async function optionsPage(dark = true, mobile = false) {
  const env = await environment({ dark, mobile });
  const html = (await readFile('apps/browser-extension/options.html', 'utf8')).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gu, '').replace(/<link\b[^>]*>/gu, '').replace('src="assets/diffdevil-wordmark-dark.svg"', `src="${assets['assets/diffdevil-wordmark-dark.svg']}"`);
  await env.page.setContent(html); await env.page.addStyleTag({ content: optionsCss });
  await env.page.addScriptTag({ content: optionsCode }); await env.page.locator('[id="display.enabled"]').waitFor();
  await env.page.evaluate(() => { const notice = document.createElement('div'); notice.id = 'qa-note'; notice.textContent = 'Rendered source candidate · Test storage · Not an installed-extension capture'; notice.style.cssText = 'position:fixed;bottom:0;left:0;right:0;text-align:center;padding:4px;z-index:9999;background:var(--bg);color:var(--fg-3);font:10px sans-serif;border-top:1px solid var(--hair)'; document.body.append(notice); });
  return env;
}
async function contentPage({ dark = true, modern = false, files = true, mobile = false, data = comparison, value = currentPacket } = {}) {
  const env = await environment({ dark, mobile }); await env.page.setContent(githubHtml({ dark, modern, files, data })); await env.page.addStyleTag({ content: githubCss + contentCss }); await env.page.addScriptTag({ content: domCode });
  await env.page.evaluate(({ packet, settings }) => {
    globalThis.fixture = { href: 'https://github.com/example/cinder/pull/42/files', packet, settings, calls: 0, delay: 0 };
    globalThis.controller = DiffdevilUnderTest.startContent({ href: () => fixture.href, acquire: async () => { fixture.calls++; const packet = fixture.packet; const settings = fixture.settings; const delay = fixture.delay; if (delay) await new Promise(resolve => setTimeout(resolve, delay)); return { packet, settings }; } });
  }, { packet: value, settings });
  await env.page.locator('.ddx-root[data-ddx="aggregate"]').waitFor(); return env;
}
let failure;
try {
  const { page, context } = await optionsPage();
  await check('Basic settings render real defaults and literal anchors', async () => { assert.equal(await page.locator('[id="display.enabled"] .setting-anchor>a').textContent(), '#display.enabled'); assert.equal(await page.locator('[id="display.enabled"] input').isChecked(), true); assert.equal(await page.locator('[id="policy.advancedYaml"]').count(), 0); });
  await capture(page, 'settings-dark');
  await check('Searching an advanced stable ID reveals it without changing the selected view', async () => { await page.locator('#settings-search').fill('#display.hideNativeDiffstat'); assert.equal(await page.locator('.setting').count(), 1); assert.equal(await page.locator('[data-view="basic"]').getAttribute('aria-pressed'), 'true'); assert.equal(await page.locator('.advanced-tag').textContent(), 'Advanced'); });
  await check('Advanced value writes persist and Basic shows the active count', async () => { await page.locator('[id="control-display.hideNativeDiffstat"]').check(); await page.waitForFunction(() => document.querySelector('#advanced-badge').textContent === '1'); await page.locator('#settings-search').fill(''); assert.equal(await page.locator('#show-changed').textContent(), '1 advanced setting active'); });
  await check('Literal fragment reveals and focuses a single advanced setting', async () => { await page.evaluate(() => { location.hash = '#policy.advancedYaml'; }); await page.locator('[id="control-policy.advancedYaml"]').waitFor(); assert.equal(await page.locator('[data-view="basic"]').getAttribute('aria-pressed'), 'true'); assert.equal(await page.locator('[id="display.density"]').count(), 0); await page.waitForFunction(() => document.activeElement?.id === 'control-policy.advancedYaml'); });
  await check('Unsaved YAML survives a search and returning to the same fragment', async () => { await page.locator('[id="control-policy.advancedYaml"]').fill('version: 1\n# retained draft\n'); await page.locator('#settings-search').fill('brand icon'); await page.locator('#settings-search').fill(''); assert.equal(await page.locator('[id="control-policy.advancedYaml"]').inputValue(), 'version: 1\n# retained draft\n'); });
  await check('Invalid YAML is rejected by the production compiler without changing saved data', async () => { const before = settingsWrites; await page.locator('[id="control-policy.advancedYaml"]').fill('version: 1\nunknownThing: true\n'); await page.getByRole('button', { name: 'Validate and save', exact: true }).click(); await page.locator('[id="policy.advancedYaml"] .validation-message').filter({ hasText: /./ }).waitFor(); assert.equal(settingsWrites, before); assert.equal(settings['policy.advancedYaml'], ''); });
  await check('Copy link retains the public fragment instead of a generated alias', async () => { await page.locator('[id="policy.advancedYaml"] .copy-link').click(); assert.ok((await page.evaluate(() => globalThis.__clipboard)).endsWith('#policy.advancedYaml')); });
  await page.locator('#settings-search').fill('diffdevil icon'); await capture(page, 'settings-icon-dark');
  await check('All three icon choices are real saved values, including no-icon layout', async () => { await page.locator('input[name="display.brandIcon"][value="none"]').check(); await page.waitForFunction(() => document.querySelector('#save-status')?.textContent.startsWith('Saved')); await page.waitForTimeout(30); assert.equal(settings['display.brandIcon'], 'none'); assert.equal(await page.locator('[data-icon-preview="none"] .ddx-brand').count(), 0); await page.locator('input[name="display.brandIcon"][value="full-color"]').check(); await page.waitForTimeout(30); assert.equal(settings['display.brandIcon'], 'full-color'); assert.equal(await page.locator('[data-icon-preview="full-color"] img').count(), 1); });
  await check('Theme changes preserve unsaved policy drafts and use the light identity asset', async () => { await page.locator('#theme-control [data-theme="light"]').click(); await page.waitForFunction(() => document.documentElement.dataset.theme === 'light'); await page.locator('#settings-search').fill(''); assert.equal(await page.locator('[id="control-policy.advancedYaml"]').inputValue(), 'version: 1\nunknownThing: true\n'); assert.ok((await page.locator('#wordmark').getAttribute('src')).startsWith('data:image/svg+xml')); });
  await page.locator('#settings-search').fill('bands and label mappings'); await capture(page, 'settings-bands-light');
  await check('Guided bands validate ascending thresholds and retain invalid edits for correction', async () => { await page.locator('.band-editor input[aria-label="S lt"]').fill('10'); const before = settingsWrites; await page.getByRole('button', { name: 'Save bands', exact: true }).click(); await page.locator('[id="policy.bands"] .validation-message').filter({ hasText: /./ }).waitFor(); assert.equal(settingsWrites, before); await page.getByRole('button', { name: 'Discard edits', exact: true }).click(); assert.equal(await page.locator('.band-editor input[aria-label="S lt"]').inputValue(), '100'); });
  await page.locator('#settings-search').fill(''); await page.evaluate(() => { location.hash = '#policy.repositoryOverrides'; });
  await check('Repository mode and explicit YAML save through the real settings validator', async () => { await page.locator('input[aria-label="Repository identifier"]').fill('Private/Example'); await page.locator('select[aria-label="Repository policy mode"]').selectOption('personal-only'); await page.locator('textarea[aria-label="Repository override YAML"]').fill('version: 1\nsize:\n  metric: raw.churn\n'); await page.getByRole('button', { name: 'Save repository override' }).click(); await page.locator('.repository-chip').filter({ hasText: 'private/example' }).waitFor(); assert.equal(m.overrides(settings['policy.repositoryOverrides'])['private/example'].mode, 'personal-only'); });
  await check('Declining destructive confirmation preserves repository overrides', async () => { await page.locator('#settings-search').fill('clear repository overrides'); page.once('dialog', dialog => dialog.dismiss()); await page.getByRole('button', { name: 'Clear repository overrides', exact: true }).click(); assert.ok(m.overrides(settings['policy.repositoryOverrides'])['private/example']); });
  await check('Confirming override deletion changes only that local setting', async () => { page.once('dialog', dialog => dialog.accept()); await page.getByRole('button', { name: 'Clear repository overrides', exact: true }).click(); await page.waitForTimeout(100); assert.deepEqual(Object.keys(m.overrides(settings['policy.repositoryOverrides'])), []); assert.equal(settings['display.hideNativeDiffstat'], true); });
  await check('Keyboard navigation reaches visible form controls with focus indication', async () => { await page.locator('#settings-search').fill('raw churn'); await page.locator('[id="display.rawChurn"] .setting-anchor>a').focus(); await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Copy link'); });
  await check('Narrow settings viewport does not produce page-level horizontal overflow', async () => { await page.setViewportSize({ width: 375, height: 740 }); await page.locator('#settings-search').fill('bands'); const dimensions = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth })); assert.ok(dimensions.scroll <= dimensions.width + 1, JSON.stringify(dimensions)); });
  await capture(page, 'settings-mobile'); await context.close();

  settings = await preferences.save(m.DEFAULTS, true); currentPacket = packet();
  const scene = await contentPage({ files: false }); const github = scene.page;
  await check('Aggregate arrives before lazy-rendered files with canonical Changed and raw churn', async () => { assert.equal(await github.locator('[data-ddx="aggregate"] .ddx-value').textContent(), '178'); assert.equal(await github.locator('[data-ddx="aggregate"] .ddx-raw').textContent(), 'Raw +160 −118'); assert.equal(await github.locator('[data-ddx="aggregate"] .ddx-local').textContent(), 'local'); });
  await check('Legacy and React file headers receive their own classifications lazily', async () => { await github.locator('#fixture-files').evaluate((host, html) => { host.innerHTML = html; }, fileHeader('src/cache.ts') + fileHeader('src/renderer.ts', true)); await github.locator('[data-ddx="file"]').nth(1).waitFor(); assert.deepEqual(await github.locator('[data-ddx="file"] .ddx-value').allTextContents(), ['32', '146']); assert.deepEqual(await github.locator('[data-ddx="file"] .ddx-pill').allTextContents(), ['size/S', 'size/M']); });
  await check('Repeated soft navigation and unrelated mutations do not duplicate or reacquire', async () => { await github.evaluate(() => { for (let i = 0; i < 20; i++) { document.dispatchEvent(new Event('soft-nav:payload')); const div = document.createElement('div'); div.textContent = 'unrelated'; document.body.append(div); div.remove(); } }); await github.waitForTimeout(100); assert.equal(await github.locator('.ddx-root').count(), 3); assert.equal(await github.evaluate(() => fixture.calls), 1); });
  await check('Native diffstat is muted without container opacity or lost keyboard focus', async () => { const result = await github.locator('.gh-header-meta .diffstat').evaluate(element => ({ opacity: getComputedStyle(element).opacity, color: getComputedStyle(element).color, child: getComputedStyle(element.querySelector('.color-fg-success')).color, muted: getComputedStyle(document.documentElement).getPropertyValue('--fgColor-muted').trim() })); assert.equal(result.opacity, '1'); assert.equal(result.color, result.child); });
  await capture(github, 'github-dark');
  const aggregate = github.locator('[data-ddx="aggregate"] .ddx-trigger');
  await check('Report popover is one persistent, non-modal anchored surface', async () => { await aggregate.click(); const panel = github.locator('.ddx-popover'); await panel.waitFor(); const headingId = await panel.locator('h2').getAttribute('id'); assert.ok(headingId); assert.equal(await panel.getAttribute('role'), 'dialog'); assert.equal(await panel.getAttribute('aria-labelledby'), headingId); assert.equal(await panel.getAttribute('aria-label'), null); assert.equal(await panel.getAttribute('aria-modal'), null); assert.ok((await panel.innerText()).includes('Changed')); assert.equal(await github.evaluate(() => document.body.style.overflow), ''); assert.equal(await github.locator('.ddx-popover').count(), 1); });
  await check('Escape dismisses and returns focus to the exact trigger', async () => { await github.keyboard.press('Escape'); assert.equal(await github.locator('.ddx-popover').count(), 0); assert.equal(await aggregate.evaluate(node => document.activeElement === node), true); });
  await check('Same-trigger toggle and outside click both dismiss without a backdrop', async () => { await aggregate.click(); await aggregate.click(); assert.equal(await github.locator('.ddx-popover').count(), 0); await aggregate.click(); await github.locator('.fixture-top>strong').click(); assert.equal(await github.locator('.ddx-popover').count(), 0); });
  await check('Space opens the same detailed report from the native button', async () => { await aggregate.focus(); await github.keyboard.press('Space'); await github.locator('.ddx-popover').waitFor(); assert.equal(await aggregate.getAttribute('aria-expanded'), 'true'); });
  await capture(github, 'report-dark'); await github.keyboard.press('Escape');
  await check('Native label handoff searches exactly but never selects or mutates labels', async () => { await github.getByRole('button', { name: 'Find size/M', exact: true }).click(); await github.waitForFunction(() => document.querySelector('#labels-select-menu input').value === 'size/M'); assert.deepEqual(await github.locator('.IssueLabel').allTextContents(), ['documentation']); assert.equal(await github.locator('#labels-select-menu').evaluate(node => node.open), true); });
  await check('Provider label observation is distinct from optimistic application', async () => { await github.locator('.sidebar-labels').evaluate(host => { const label = document.createElement('span'); label.className = 'IssueLabel'; label.textContent = 'size/M'; host.append(label); }); await github.waitForFunction(() => [...document.querySelectorAll('.ddx-label-status')].some(node => node.textContent.includes('Observed on GitHub'))); });
  await check('Replacing GitHub’s main root removes stale anchors and rebinds once', async () => { await aggregate.click(); await github.locator('#repo-content-pjax-container').evaluate(element => { const copy = element.cloneNode(true); for (const node of copy.querySelectorAll('.ddx-root,.ddx-status')) node.remove(); element.replaceWith(copy); }); await github.waitForTimeout(150); assert.equal(await github.locator('.ddx-popover').count(), 0); assert.equal(await github.locator('.ddx-root').count(), 3); assert.equal(await github.evaluate(() => fixture.calls), 1); });
  await check('Commit-only views do not inherit whole-PR file measurements', async () => { await github.evaluate(() => { fixture.href = 'https://github.com/example/cinder/pull/42/commits/' + 'd'.repeat(40); window.dispatchEvent(new Event('popstate')); }); await github.waitForTimeout(50); assert.equal(await github.locator('[data-ddx="file"]').count(), 0); assert.equal(await github.locator('[data-ddx="aggregate"]').count(), 1); await github.evaluate(() => { fixture.href = 'https://github.com/example/cinder/pull/42/files'; window.dispatchEvent(new Event('popstate')); }); await github.locator('[data-ddx="file"]').nth(1).waitFor(); });
  await check('Errors written to diagnostics do not create a storage-refresh feedback loop', async () => { const before = await github.evaluate(() => fixture.calls); await github.evaluate(() => __emitError()); await github.waitForTimeout(40); assert.equal(await github.evaluate(() => fixture.calls), before); });
  settings = await preferences.save({ 'display.brandIcon': 'none' });
  await github.evaluate(settings => { fixture.settings = settings; __emitSettings(); }, settings); await github.waitForTimeout(120);
  await check('No-icon setting removes the mark and its layout slot everywhere', async () => { assert.equal(await github.locator('.ddx-root .ddx-brand').count(), 0); assert.equal(await github.locator('[data-ddx="aggregate"] .ddx-trigger').evaluate(node => node.firstElementChild.className), 'ddx-primary-label'); });
  settings = await preferences.save({ 'display.brandIcon': 'full-color' });
  await github.evaluate(settings => { fixture.settings = settings; __emitSettings(); }, settings); await github.waitForTimeout(100);
  await check('Full-colour icons use the dark micro asset, not master logo art', async () => { assert.equal(await github.locator('.ddx-root .ddx-brand img').count(), 3); assert.equal(await github.locator('[data-ddx="aggregate"] .ddx-brand img').getAttribute('src'), assets['assets/diffdevil-symbol-micro-dark.svg']); });
  await github.evaluate(() => { document.documentElement.dataset.colorMode = 'light'; }); await github.waitForTimeout(100);
  await check('GitHub theme change swaps only the micro variant and preserves report facts', async () => { assert.equal(await github.locator('[data-ddx="aggregate"] .ddx-brand img').getAttribute('src'), assets['assets/diffdevil-symbol-micro-light.svg']); assert.equal(await github.locator('[data-ddx="aggregate"] .ddx-value').textContent(), '178'); });
  await capture(github, 'github-light'); await github.locator('[data-ddx="aggregate"] .ddx-trigger').click(); await capture(github, 'report-light');
  await check('Popover fits a narrow viewport and survives resize', async () => { await github.setViewportSize({ width: 375, height: 600 }); await github.waitForTimeout(100); const box = await github.locator('.ddx-popover').boundingBox(); assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= 375.5 && box.y + box.height <= 600.5, JSON.stringify(box)); });
  await capture(github, 'report-mobile'); await github.keyboard.press('Escape'); await github.setViewportSize({ width: 1280, height: 800 });
  settings = await preferences.save({ 'display.hideNativeDiffstat': true, 'display.fileChanged': false });
  await github.evaluate(settings => { fixture.settings = settings; __emitSettings(); }, settings); await github.waitForTimeout(100);
  await check('Native hide is independent of the extension’s file-Changed toggle', async () => { assert.equal(await github.locator('[data-ddx="file"]').count(), 0); for (const value of await github.locator('.diffstat').evaluateAll(nodes => nodes.map(node => getComputedStyle(node).display))) assert.equal(value, 'none'); });
  settings = await preferences.save({ 'display.enabled': false });
  await github.evaluate(settings => { fixture.settings = settings; __emitSettings(); }, settings); await github.waitForTimeout(100);
  await check('Disabling augmentation restores native UI and removes all injected surfaces', async () => { assert.equal(await github.locator('.ddx-root,.ddx-popover,.ddx-native-dim,.ddx-native-hidden').count(), 0); });
  await github.evaluate(() => controller.stop()); await scene.context.close();

  settings = await preferences.save(m.DEFAULTS, true); currentPacket = packet();
  const stale = await contentPage();
  const nextComparison = { ...comparison, head: 'c'.repeat(40), additions: 18, deletions: 11 };
  const next = packet(nextComparison, filePatch('src/cache.ts', 3, 4, 1) + filePatch('src/renderer.ts', 5, 6, 2));
  await check('A late old-head completion cannot overwrite a newer comparison', async () => {
    await stale.page.evaluate(() => { fixture.delay = 180; void controller.refresh(); });
    await stale.page.waitForTimeout(30);
    await stale.page.evaluate(({ next, data }) => { fixture.packet = next; fixture.delay = 0; document.querySelector('script[type="application/json"]').textContent = JSON.stringify({ payload: { pullRequest: { number: 42, baseRefOid: data.base, headRefOid: data.head, changedFiles: 2, additions: 18, deletions: 11 } } }); document.dispatchEvent(new Event('soft-nav:payload')); }, { next, data: nextComparison });
    await stale.page.waitForFunction(() => document.querySelector('[data-ddx="aggregate"] .ddx-value')?.textContent === '21'); await stale.page.waitForTimeout(220);
    assert.equal(await stale.page.locator('[data-ddx="aggregate"] .ddx-value').textContent(), '21');
  });
  await check('File acquisition failure exposes its code and remains bounded', async () => { failFiles = true; const before = fileCalls; await stale.page.evaluate(() => { void controller.refresh(); }); await stale.page.waitForTimeout(150); assert.equal(fileCalls - before, 1); await stale.page.waitForTimeout(150); assert.equal(fileCalls - before, 1); assert.match(await stale.page.locator('.ddx-status').textContent(), /FILE_FIXTURE_FAILURE: Fixture file transport/u); failFiles = false; });
  await check('An explicit retry recovers file evidence after a transient failure', async () => { await stale.page.getByRole('button', { name: 'Retry', exact: true }).click(); await stale.page.locator('[data-ddx="file"]').nth(1).waitFor(); assert.equal(await stale.page.locator('.ddx-status').count(), 0); });
  await check('Navigation away from pull requests leaves no augmentation or stale popover', async () => { await stale.page.evaluate(() => { fixture.href = 'https://github.com/example/cinder/issues/99'; window.dispatchEvent(new Event('popstate')); }); await stale.page.waitForTimeout(60); assert.equal(await stale.page.locator('.ddx-root,.ddx-popover').count(), 0); });
  await stale.page.evaluate(() => controller.stop()); await stale.context.close();

  const unknownComparison = { ...comparison, changedFiles: 3, additions: undefined, deletions: undefined };
  const unknown = packet(unknownComparison);
  const uncertain = await contentPage({ value: unknown, data: unknownComparison });
  await check('Incomplete file-set evidence is visibly unknown and selects no unjustified band', async () => { assert.match(await uncertain.page.locator('[data-ddx="aggregate"] .ddx-evidence').textContent(), /unknown/u); assert.equal(await uncertain.page.locator('[data-ddx="aggregate"] .ddx-selected').count(), 0); assert.match(await uncertain.page.locator('[data-ddx="aggregate"] .ddx-value').textContent(), /≥178/u); });
  await capture(uncertain.page, 'evidence-unknown'); await uncertain.page.evaluate(() => controller.stop()); await uncertain.context.close();

  const injection = await environment(); await injection.page.setContent('<main id="target"></main>'); await injection.page.addStyleTag({ content: githubCss + contentCss }); await injection.page.addScriptTag({ content: domCode });
  const dangerousPath = 'src/<img src=x onerror=globalThis.injected=true>.ts';
  const hostileComp = { ...comparison, changedFiles: 1, additions: 1, deletions: 0 };
  const hostile = packet(hostileComp, '', { comparison: hostileComp, format: 'github-files', complete: true, files: [{ filename: dangerousPath, status: 'added', additions: 1, deletions: 0, patch: '@@ -0,0 +1 @@\n+x' }] });
  const hostileContext = contexts.get(hostile.key); const hostileView = unwrap(m.humanReport(hostileContext.report, hostileContext.policy, dangerousPath));
  await check('Hostile path text is rendered as text rather than executable HTML', async () => { await injection.page.evaluate(view => { const popover = new DiffdevilUnderTest.Popover(); const panel = DiffdevilUnderTest.reportPanel(view, popover); document.querySelector('#target').append(panel); }, hostileView); assert.ok((await injection.page.locator('#target').innerText()).includes(dangerousPath)); assert.equal(await injection.page.locator('#target img').count(), 0); assert.equal(await injection.page.evaluate(() => globalThis.injected), undefined); });
  await injection.context.close();
  await check('UI tests generated no external network requests', async () => { assert.deepEqual(network, []); });
  await check('Rendered source generated no uncaught page errors', async () => { assert.deepEqual(errors, []); });
} catch (error) { failure = error; }
finally {
  await browser.close(); await loaded.cleanup();
  const result = { kind: 'diffdevil.extension.dom-qa/1', mode: 'production DOM/controllers with deterministic test transport and storage', browser: 'Chromium via Playwright', installedExtensionVerified: false, liveGitHubVerified: false, checks, passed: checks.filter(check => check.status === 'passed').length, failed: checks.filter(check => check.status === 'failed').length, pageErrors: errors, networkRequests: network, screenshots, timings: measurements, timingQualification: 'Single sandbox samples, including JIT effects; not a performance benchmark or live latency measurement.' };
  await writeFile(join(out, 'receipt.json'), `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify({ passed: result.passed, failed: result.failed, screenshots: screenshots.length, qualification: result.mode }, null, 2));
}
if (failure) throw failure;
