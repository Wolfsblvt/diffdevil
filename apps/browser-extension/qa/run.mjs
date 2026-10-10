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
  const result = { key, comparison: data, view, files: report.files.map(file => ({ path: file.path, ...(file.oldPath ? { oldPath: file.oldPath } : {}), standing: 'measured' })), coverage: { measured: report.files.length, bounded: 0, declined: 0, total: report.files.length, totalExact: true, limit: 150, automatic: report.files.length, topUp: 0, explicit: 0, onDemand: 0, declinedReasons: {} }, refreshedAt: Date.UTC(2026, 8, 19, 12), cached: false };
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
      case 'report.text': {
        const context = contexts.get(message.key); if (!context) throw Object.assign(new Error('Context expired'), { code: 'CONTEXT_EXPIRED' });
        const view = message.path === undefined ? context.packet.view : m.decorateView(unwrap(m.humanReport(context.report, context.policy, message.path)), settings);
        value = unwrap(m.formatReport(view.report, 'human', { color: false })).stdout; break;
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
const bundled = async (file, globalName) => (await build({ entryPoints: [file], write: false, bundle: true, platform: 'browser', format: 'iife', target: 'chrome120', globalName, loader: { '.css': 'text' }, alias: { '@wolfsblvt/diffdevil/browser/text': resolve('dist/lib/browser/text.js'), '@wolfsblvt/diffdevil/browser': resolve('dist/browser/index.js') } })).outputFiles[0].text;
const optionsCode = await bundled('apps/browser-extension/src/options/main.ts', 'OptionsUnderTest');
const domCode = await bundled('apps/browser-extension/qa/dom-entry.ts', 'DiffdevilUnderTest');
const optionsCss = await readFile('artifacts/browser-extension/unpacked/options.css', 'utf8');
const contentCss = await readFile('apps/browser-extension/src/content/content.css', 'utf8');
const assets = {};
for (const file of await readdir('artifacts/browser-extension/unpacked/assets')) if (/\.(svg|png)$/u.test(file)) assets[`assets/${file}`] = `data:image/${file.endsWith('.svg') ? 'svg+xml' : 'png'};base64,${(await readFile(`artifacts/browser-extension/unpacked/assets/${file}`)).toString('base64')}`;
const executablePath = process.env.CHROMIUM_PATH ?? (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true, args: ['--no-sandbox', '--disable-gpu'] });
async function environment({ dark = true, mobile = false, backend = rpc } = {}) {
  const context = await browser.newContext({ viewport: mobile ? { width: 375, height: 740 } : { width: 1280, height: 800 }, colorScheme: dark ? 'dark' : 'light', reducedMotion: 'reduce' });
  const page = await context.newPage(); page.setDefaultTimeout(4000);
  page.on('pageerror', error => errors.push({ page: page.url(), message: error.message }));
  page.on('request', request => { if (!request.url().startsWith('data:') && !request.url().startsWith('about:')) network.push(request.url()); });
  await page.exposeFunction('__rpc', backend);
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
async function contentPage({ dark = true, modern = false, files = true, mobile = false, data = comparison, value = currentPacket, href, failures = 0, ready = '.ddx-root[data-ddx="aggregate"]', backend, measure, headers = [], headerHeight = 30, verifyResult, settings: pageSettings } = {}) {
  const env = await environment({ dark, mobile, ...(backend ? { backend } : {}) });
  if (measure) await env.page.exposeFunction('__measure', measure); await env.page.setContent(githubHtml({ dark, modern, files, data })); await env.page.addStyleTag({ content: githubCss + contentCss }); if (headers.length) await env.page.evaluate(({ paths, height }) => { for (const path of paths) document.querySelector('main').insertAdjacentHTML('beforeend', '<section data-path="' + path + '" style="min-height:' + height + 'px"><div class="file-header" data-path="' + path + '" style="height:30px"><span>' + path + '</span><span class="diffstat"><span>+2</span> <span>−1</span></span></div></section>'); }, { paths: headers, height: headerHeight }); await env.page.addScriptTag({ content: domCode });
  await env.page.evaluate(({ packet, settings, href, failures, verifyResult }) => {
    globalThis.fixture = { href: href ?? 'https://github.com/example/cinder/pull/42/files', packet, settings, calls: 0, delay: 0, failures, verifyResult };
    globalThis.controller = DiffdevilUnderTest.startContent({ href: () => fixture.href, acquire: async () => {
      fixture.calls++; const packet = fixture.packet; const settings = fixture.settings; const delay = fixture.delay;
      if (delay) await new Promise(resolve => setTimeout(resolve, delay));
      if (fixture.hold) await new Promise(resolve => { fixture.release = resolve; });
      if (fixture.failures > 0) { fixture.failures--; throw Object.assign(new Error('Signed-in page source unavailable.'), { code: 'SIGNED_IN_UNAVAILABLE' }); }
      return { packet, settings, ...(fixture.verifyResult ? { verify: async () => { if (fixture.verifyHold) await new Promise(resolve => { fixture.verifyRelease = resolve; }); return fixture.verifyResult; } } : {}) };
    }, ...(globalThis.__measure ? { measure: (scope, base, paths, via) => globalThis.__measure(paths, via) } : {}) });
  }, { packet: value, settings: pageSettings ?? settings, href, failures, verifyResult });
  await env.page.locator(ready).waitFor(); return env;
}
let failure;
try {
  const { page, context } = await optionsPage();
  await check('Basic settings render real defaults and literal anchors', async () => { assert.equal(await page.locator('[id="display.enabled"] .setting-anchor>a').textContent(), '#display.enabled'); assert.equal(await page.locator('[id="display.enabled"] input').isChecked(), true); assert.equal(await page.locator('[id="policy.advancedYaml"]').count(), 0); });
  await capture(page, 'settings-dark');
  await check('Searching an advanced stable ID reveals it without changing the selected view', async () => { await page.locator('#settings-search').fill('#labels.nativeHandoff'); assert.equal(await page.locator('.setting').count(), 1); assert.equal(await page.locator('[data-view="basic"]').getAttribute('aria-pressed'), 'true'); assert.equal(await page.locator('.advanced-tag').textContent(), 'Advanced'); });
  await check('Advanced value writes persist and Basic shows the active count', async () => { await page.locator('[id="control-labels.nativeHandoff"]').uncheck(); await page.waitForFunction(() => document.querySelector('#advanced-badge').textContent === '1'); await page.locator('#settings-search').fill(''); assert.equal(await page.locator('#show-changed').textContent(), '1 advanced setting active'); });
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
  await check('Confirming override deletion changes only that local setting', async () => { page.once('dialog', dialog => dialog.accept()); await page.getByRole('button', { name: 'Clear repository overrides', exact: true }).click(); await page.waitForTimeout(100); assert.deepEqual(Object.keys(m.overrides(settings['policy.repositoryOverrides'])), []); assert.equal(settings['labels.nativeHandoff'], false); });
  await check('Keyboard navigation reaches visible form controls with focus indication', async () => { await page.locator('#settings-search').fill('raw churn'); await page.locator('[id="display.nativeChurn"] .setting-anchor>a').focus(); await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Copy link'); });
  await check('Narrow settings viewport does not produce page-level horizontal overflow', async () => { await page.setViewportSize({ width: 375, height: 740 }); await page.locator('#settings-search').fill('bands'); const dimensions = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth })); assert.ok(dimensions.scroll <= dimensions.width + 1, JSON.stringify(dimensions)); });
  await capture(page, 'settings-mobile'); await context.close();

  settings = await preferences.save(m.DEFAULTS, true); currentPacket = packet();
  const scene = await contentPage({ files: false }); const github = scene.page;
  await check('Aggregate seat arrives before lazy-rendered files: Changed, the indivisible triplet, the proposed size chip, the rail and local provenance', async () => { assert.equal(await github.locator('[data-ddx="aggregate"] .ddx-value').textContent(), '178'); assert.equal((await github.locator('[data-ddx="aggregate"] .ddx-parts').innerText()).replace(/\s+/gu, ' '), '+60 −18 ~100'); assert.equal(await github.locator('[data-ddx="aggregate"] .ddx-chip').innerText(), 'size/M'); assert.equal(await github.locator('[data-ddx="aggregate"] .ddx-chip').getAttribute('data-standing'), 'proposed'); assert.equal(await github.locator('[data-ddx="aggregate"] .ddx-cell').count(), 5); assert.equal(await github.locator('[data-ddx="aggregate"] .ddx-selected').count(), 1); assert.equal(await github.locator('[data-ddx="aggregate"] .ddx-provenance').textContent(), 'local'); assert.equal(await github.locator('[data-ddx="aggregate"] .ddx-trigger').getAttribute('aria-haspopup'), 'dialog'); });
  await check('The Files toolbar sentence keeps its subject; its numbers become the concise seat before the native predicate', async () => { assert.equal(await github.locator('[data-ddx="toolbar"]').count(), 1); assert.equal(await github.locator('[data-ddx="toolbar"] + .diffbar-item.diffstat').count(), 1); assert.equal(await github.locator('[data-ddx="toolbar"] .ddx-chip, [data-ddx="toolbar"] .ddx-rail, [data-ddx="toolbar"] .ddx-provenance').count(), 0); await github.locator('[data-ddx="toolbar"] .ddx-trigger').click(); const concise = (await github.locator('.ddx-popover').innerText()).toLowerCase(); assert.ok(concise.includes('2 files') && concise.includes('churn') && !concise.includes('policy') && !concise.includes('effect plan'), concise); await github.keyboard.press('Escape'); });
  await check('Legacy and React file headers receive their own Changed and decomposition lazily; a file carries no band, chip or provenance', async () => { await github.locator('#fixture-files').evaluate((host, html) => { host.innerHTML = html; }, fileHeader('src/cache.ts') + fileHeader('src/renderer.ts', true)); await github.locator('[data-ddx="file"]').nth(1).waitFor(); assert.deepEqual(await github.locator('[data-ddx="file"] .ddx-value').allTextContents(), ['32', '146']); assert.equal(await github.locator('[data-ddx="file"] .ddx-parts').count(), 2); assert.equal(await github.locator('[data-ddx="file"] .ddx-chip, [data-ddx="file"] .ddx-rail, [data-ddx="file"] .ddx-provenance, [data-ddx="file"] .ddx-word').count(), 0); assert.equal(await github.locator('[data-ddx="file"] + .diffstat').count(), 2); });
  await check('Repeated soft navigation and unrelated mutations do not duplicate or reacquire', async () => { await github.evaluate(() => { for (let i = 0; i < 20; i++) { document.dispatchEvent(new Event('soft-nav:payload')); const div = document.createElement('div'); div.textContent = 'unrelated'; document.body.append(div); div.remove(); } }); await github.waitForTimeout(100); assert.equal(await github.locator('.ddx-root').count(), 4); assert.equal(await github.evaluate(() => fixture.calls), 1); });
  await check('Once Changed is known, GitHub’s native diffstat is hidden in place, never removed', async () => { const result = await github.locator('.gh-header-meta .diffstat').evaluate(element => ({ display: getComputedStyle(element).display, present: element.isConnected, hidden: element.classList.contains('ddx-native-hidden') })); assert.deepEqual(result, { display: 'none', present: true, hidden: true }); });
  await capture(github, 'github-dark');
  const aggregate = github.locator('[data-ddx="aggregate"] .ddx-trigger');
  await check('Report popover is one persistent, non-modal anchored surface', async () => { await aggregate.click(); const panel = github.locator('.ddx-popover'); await panel.waitFor(); const headingId = await panel.locator('h2').getAttribute('id'); assert.ok(headingId); assert.equal(await panel.getAttribute('role'), 'dialog'); assert.equal(await panel.getAttribute('aria-labelledby'), headingId); assert.equal(await panel.getAttribute('aria-label'), null); assert.equal(await panel.getAttribute('aria-modal'), null); const text = (await panel.innerText()).toLowerCase(); assert.ok(text.includes('178') && text.includes('changed') && text.includes('= exact') && text.includes('raw') && text.includes('effect plan') && text.includes('copy facts'), text); assert.equal(await github.locator('.ddx-popover-host').evaluate(host => Boolean(host.shadowRoot)), true); assert.equal(await panel.locator('.ddx-close').evaluate(close => close.getRootNode().activeElement === close), true); assert.equal(await github.evaluate(() => document.body.style.overflow), ''); assert.equal(await github.locator('.ddx-popover').count(), 1); });
  await check('Constrained report keeps its full comparison subtitle visible', async () => {
    await github.setViewportSize({ width: 1228, height: 500 });
    const geometry = await github.locator('.ddx-popover').evaluate(panel => {
      const meta = panel.querySelector('.ddx-meta');
      const machine = panel.querySelector('.ddx-machine');
      return { text: meta?.textContent, metaBottom: meta?.getBoundingClientRect().bottom, machineTop: machine?.getBoundingClientRect().top, visibleHeight: meta?.clientHeight, contentHeight: meta?.scrollHeight };
    });
    assert.ok(geometry.text?.endsWith('three-dot · local'), JSON.stringify(geometry));
    assert.ok(geometry.visibleHeight + 1 >= geometry.contentHeight && geometry.metaBottom <= geometry.machineTop, JSON.stringify(geometry));
    await capture(github, 'report-constrained');
    await github.setViewportSize({ width: 1280, height: 800 });
  });
  await check('Escape dismisses and returns focus to the exact trigger', async () => { await github.keyboard.press('Escape'); assert.equal(await github.locator('.ddx-popover').count(), 0); assert.equal(await aggregate.evaluate(node => document.activeElement === node), true); });
  await check('Same-trigger toggle and outside click both dismiss without a backdrop', async () => { await aggregate.click(); await aggregate.click(); assert.equal(await github.locator('.ddx-popover').count(), 0); await aggregate.click(); await github.locator('.fixture-top>strong').click(); assert.equal(await github.locator('.ddx-popover').count(), 0); });
  await check('Space opens the same detailed report from the native button', async () => { await aggregate.focus(); await github.keyboard.press('Space'); await github.locator('.ddx-popover').waitFor(); assert.equal(await aggregate.getAttribute('aria-expanded'), 'true'); });
  await capture(github, 'report-dark'); await github.keyboard.press('Escape');
  await check('Copy facts writes the canonical CLI human report for the comparison', async () => { await aggregate.click(); await github.locator('.ddx-popover').waitFor(); await github.getByRole('button', { name: 'Copy facts', exact: true }).click(); await github.waitForFunction(() => typeof globalThis.__clipboard === 'string' && globalThis.__clipboard.startsWith('diffdevil analysis')); const text = await github.evaluate(() => globalThis.__clipboard); assert.ok(/Changed\s+178 lines/u.test(text) && text.includes('+60 added only') && text.includes('Raw'), text); assert.equal(await github.getByRole('button', { name: 'Copied ✓', exact: true }).count(), 1); });
  await check('Native label handoff searches exactly but never selects or mutates labels', async () => { await github.getByRole('button', { name: 'Find in labels ↗', exact: true }).click(); await github.waitForFunction(() => document.querySelector('#labels-select-menu input').value === 'size/M'); assert.deepEqual(await github.locator('.IssueLabel').allTextContents(), ['documentation']); assert.equal(await github.locator('#labels-select-menu').evaluate(node => node.open), true); });
  await check('Provider label observation is distinct from optimistic application', async () => { await github.locator('.sidebar-labels').evaluate(host => { const label = document.createElement('span'); label.className = 'IssueLabel'; label.textContent = 'size/M'; host.append(label); }); await github.locator('.ddx-label-status').filter({ hasText: 'Observed on GitHub' }).waitFor(); await github.keyboard.press('Escape'); });
  await check('Replacing GitHub’s main root removes stale anchors and rebinds once', async () => { await aggregate.click(); await github.locator('#repo-content-pjax-container').evaluate(element => { const copy = element.cloneNode(true); for (const node of copy.querySelectorAll('.ddx-root,.ddx-status')) node.remove(); element.replaceWith(copy); }); await github.waitForTimeout(150); assert.equal(await github.locator('.ddx-popover').count(), 0); assert.equal(await github.locator('.ddx-root').count(), 4); assert.equal(await github.evaluate(() => fixture.calls), 1); });
  await check('Commit-only views do not inherit whole-PR file measurements', async () => { await github.evaluate(() => { fixture.href = 'https://github.com/example/cinder/pull/42/commits/' + 'd'.repeat(40); window.dispatchEvent(new Event('popstate')); }); await github.waitForTimeout(50); assert.equal(await github.locator('[data-ddx="file"]').count(), 0); assert.equal(await github.locator('[data-ddx="aggregate"]').count(), 1); await github.evaluate(() => { fixture.href = 'https://github.com/example/cinder/pull/42/files'; window.dispatchEvent(new Event('popstate')); }); await github.locator('[data-ddx="file"]').nth(1).waitFor(); });
  await check('Errors written to diagnostics do not create a storage-refresh feedback loop', async () => { const before = await github.evaluate(() => fixture.calls); await github.evaluate(() => __emitError()); await github.waitForTimeout(40); assert.equal(await github.evaluate(() => fixture.calls), before); });
  settings = await preferences.save({ 'display.brandIcon': 'none' });
  await github.evaluate(settings => { fixture.settings = settings; __emitSettings(); }, settings); await github.waitForTimeout(120);
  await check('No-icon setting removes the mark and its layout slot everywhere', async () => { assert.equal(await github.locator('.ddx-root .ddx-brand').count(), 0); assert.equal(await github.locator('[data-ddx="aggregate"] .ddx-trigger').evaluate(node => node.firstElementChild.className), 'ddx-word'); });
  settings = await preferences.save({ 'display.brandIcon': 'full-color' });
  await github.evaluate(settings => { fixture.settings = settings; __emitSettings(); }, settings); await github.waitForTimeout(100);
  await check('Full-colour icons use the dark micro asset, not master logo art', async () => { assert.equal(await github.locator('.ddx-root .ddx-brand img').count(), 4); assert.equal(await github.locator('[data-ddx="aggregate"] .ddx-brand img').getAttribute('src'), assets['assets/diffdevil-symbol-micro-dark.svg']); });
  await github.evaluate(() => { document.documentElement.dataset.colorMode = 'light'; }); await github.waitForTimeout(100);
  await check('GitHub theme change swaps only the micro variant and preserves report facts', async () => { assert.equal(await github.locator('[data-ddx="aggregate"] .ddx-brand img').getAttribute('src'), assets['assets/diffdevil-symbol-micro-light.svg']); assert.equal(await github.locator('[data-ddx="aggregate"] .ddx-value').textContent(), '178'); });
  await capture(github, 'github-light'); await github.locator('[data-ddx="aggregate"] .ddx-trigger').click(); await capture(github, 'report-light');
  await check('Popover fits a narrow viewport and survives resize', async () => { await github.setViewportSize({ width: 375, height: 600 }); await github.waitForTimeout(100); const box = await github.locator('.ddx-popover').boundingBox(); assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= 375.5 && box.y + box.height <= 600.5, JSON.stringify(box)); });
  await capture(github, 'report-mobile'); await github.keyboard.press('Escape'); await github.setViewportSize({ width: 1280, height: 800 });
  settings = await preferences.save({ 'display.nativeChurn': 'faint' });
  await github.evaluate(settings => { fixture.settings = settings; __emitSettings(); }, settings); await github.waitForTimeout(160);
  await check('Faint keeps GitHub’s counters after ours in every seat: muted, desaturated, at .7, still in place', async () => { assert.equal(await github.locator('[data-ddx="file"]').count(), 2); const result = await github.locator('.gh-header-meta .diffstat').evaluate(element => ({ display: getComputedStyle(element).display, opacity: getComputedStyle(element).opacity, filter: getComputedStyle(element).filter, color: getComputedStyle(element).color, muted: getComputedStyle(element.querySelector('.color-fg-success')).color })); assert.notEqual(result.display, 'none'); assert.equal(result.opacity, '0.7'); assert.match(result.filter, /saturate\(0\.3\)/u); assert.equal(result.color, result.muted); assert.equal(await github.locator('.ddx-native-faint').count(), 4); });
  await capture(github, 'github-faint');
  settings = await preferences.save({ 'display.enabled': false });
  await github.evaluate(settings => { fixture.settings = settings; __emitSettings(); }, settings); await github.waitForTimeout(100);
  await check('Disabling augmentation restores native UI and removes all injected surfaces', async () => { assert.equal(await github.locator('.ddx-root,.ddx-popover,.ddx-native-faint,.ddx-native-hidden').count(), 0); });
  await github.evaluate(() => controller.stop()); await scene.context.close();

  settings = await preferences.save(m.DEFAULTS, true); currentPacket = packet();
  const privateNavigation = await contentPage({ files: false, href: 'https://github.com/example/cinder/pull/42', failures: 1, ready: '[data-ddx="failure"] .ddx-retry' });
  await check('A Conversation failure is read again on the Files surface after soft navigation, with GitHub counts at full strength while reading', async () => {
    const page = privateNavigation.page;
    await page.evaluate(() => { fixture.href = 'https://github.com/example/cinder/pull/42/changes'; fixture.hold = true; window.dispatchEvent(new Event('soft-nav:payload')); });
    await page.locator('[data-ddx="reading"]').waitFor().catch(async error => { throw new Error(`${error.message}
${await page.evaluate(() => JSON.stringify({ calls: fixture.calls, href: fixture.href, roots: [...document.querySelectorAll('.ddx-root,.ddx-status')].map(element => element.outerHTML.slice(0, 160)) }))}`); });
    assert.equal(await page.locator('[data-ddx="failure"]').count(), 0);
    const native = await page.locator('.gh-header-meta .diffstat').evaluate(element => ({ display: getComputedStyle(element).display, hidden: element.classList.contains('ddx-native-hidden'), faint: element.classList.contains('ddx-native-faint') }));
    assert.notEqual(native.display, 'none'); assert.equal(native.hidden, false); assert.equal(native.faint, false);
    await page.evaluate(() => { fixture.hold = false; fixture.release(); });
    await page.locator('[data-ddx="aggregate"] .ddx-value').waitFor();
    assert.equal(await page.locator('[data-ddx="reading"],[data-ddx="failure"],.ddx-status').count(), 0);
    assert.equal(await page.evaluate(() => fixture.calls), 2);
  });
  await check('Retry on the Files surface reads again, and an acquired result survives a route that cannot name its comparison', async () => {
    const page = privateNavigation.page;
    await page.evaluate(() => { fixture.failures = 1; fixture.href = 'https://github.com/example/cinder/pull/42'; controller.refresh(); });
    await page.locator('[data-ddx="failure"] .ddx-retry').waitFor();
    await page.evaluate(() => { fixture.href = 'https://github.com/example/cinder/pull/42/changes'; window.dispatchEvent(new Event('soft-nav:payload')); });
    await page.locator('[data-ddx="aggregate"] .ddx-value').waitFor();
    const calls = await page.evaluate(() => { document.querySelectorAll('script[type="application/json"]').forEach(script => script.remove()); fixture.href = 'https://github.com/example/cinder/pull/42'; window.dispatchEvent(new Event('soft-nav:payload')); return fixture.calls; });
    await page.waitForTimeout(80);
    assert.equal(await page.evaluate(() => fixture.calls), calls); assert.equal(await page.locator('[data-ddx="aggregate"] .ddx-value').count(), 1);
    assert.equal(await page.locator('[data-ddx="failure"],[data-ddx="reading"]').count(), 0);
  });
  await privateNavigation.page.evaluate(() => controller.stop()); await privateNavigation.context.close();
  const quick = await contentPage({ files: false });
  await check('A read that answers at once never flashes the reading marker', async () => { assert.equal(await quick.page.locator('[data-ddx="reading"]').count(), 0); });
  await quick.page.evaluate(() => controller.stop()); await quick.context.close();

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
  await check('File acquisition failure exposes its code and remains bounded', async () => { failFiles = true; const before = fileCalls; await stale.page.evaluate(() => { void controller.refresh(); }); await stale.page.waitForTimeout(150); assert.equal(fileCalls - before, 1); await stale.page.waitForTimeout(150); assert.equal(fileCalls - before, 1); assert.match(await stale.page.locator('.ddx-status').textContent(), /Fixture file transport unavailable\. \(FILE_FIXTURE_FAILURE\)/u); assert.equal(await stale.page.locator('[data-ddx="aggregate"] .ddx-value').textContent(), '21'); failFiles = false; });
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
  await check('Hostile path text is rendered as text rather than executable HTML', async () => { await injection.page.evaluate(view => { const popover = new DiffdevilUnderTest.Popover(); const anchor = document.createElement('button'); document.querySelector('#target').append(anchor); const actions = { copyText: async () => '', retry: () => {}, settingsUrl: 'about:blank', dataUrl: 'about:blank', provenance: () => 'live', coverage: { summary: () => undefined, progress: () => undefined, note: () => undefined, start() {}, cancel() {} }, fileStanding: () => undefined, measureFile() {}, pause() {}, diagnostics: () => '', errorPanel: () => document.createElement('div') }; popover.toggle(anchor, DiffdevilUnderTest.filePanel(view, popover, actions), { width: 360, align: 'end' }); }, hostileView); const text = await injection.page.locator('.ddx-popover').innerText(); assert.ok(text.includes('<img src=x onerror=globalThis.injected=true>.ts'), text); assert.equal(await injection.page.locator('.ddx-popover img').count(), 0); assert.equal(await injection.page.evaluate(() => globalThis.injected), undefined); });
  await injection.context.close();

  // Continuity: the production worker logic (persisted report, coverage, extension) behind the same DOM controller.
  const world = new m.Analysis({ cache: new m.AnalysisCache(new m.MemoryStore()), engine: 'qa' });
  let worldSettings = m.validateSettings({ 'analysis.maximumFiles': 6 }); const pauseWrites = []; const measureCalls = [];
  const fileName = index => 'src/f' + String(index).padStart(2, '0') + '.ts'; const fragment = '@@ -1,2 +1,3 @@\n-old\n+new\n+extra\n same\n';
  const worldComparison = { ...comparison, changedFiles: 12, additions: 24, deletions: 12 };
  const worldPacket = await world.run({ comparison: worldComparison, acquisition: { comparison: worldComparison, format: 'github-files', complete: true, files: Array.from({ length: 12 }, (_, index) => ({ filename: fileName(index), status: 'modified', additions: 2, deletions: 1, ...(index < 4 ? { patch: fragment } : {}) })) }, policy: { status: 'absent', at: 1 }, coverage: { limit: 6, declined: { [fileName(11)]: 'binary' } } }, worldSettings);
  const worldBackend = async message => {
    try {
      let value;
      switch (message.type) {
        case 'settings.get': value = worldSettings; break;
        case 'analysis.files': value = await world.files(message.key, message.comparison, message.paths, worldSettings); break;
        case 'analysis.extend': value = await world.extend(message, worldSettings); break;
        case 'report.text': value = await world.text(message.key, message.comparison, message.path, worldSettings); break;
        case 'repository.pause': pauseWrites.push(message); worldSettings = { ...worldSettings, 'repositories.paused': m.pausedWith(String(worldSettings['repositories.paused']), message.repository, message.paused, 1) }; value = { paused: message.paused }; break;
        default: throw new Error('Unexpected fixture message: ' + message.type);
      }
      return { ok: true, value };
    } catch (error) { return { ok: false, code: error.code ?? 'TEST_OPERATION_FAILED', message: error.message }; }
  };
  const worldMeasure = async (paths, via) => { measureCalls.push({ paths, via }); if (via === 'explicit') await new Promise(resolve => setTimeout(resolve, 300)); const declined = paths.includes(fileName(11)); return world.extend({ comparison: worldComparison, patches: paths.filter(path => path !== fileName(11)).map(path => ({ path, patch: fragment })), ...(declined ? { declined: { [fileName(11)]: 'binary' } } : {}), via }, worldSettings); };
  const headers = Array.from({ length: 12 }, (_, index) => fileName(index));
  const continuity = await contentPage({ value: worldPacket, data: worldComparison, settings: worldSettings, backend: worldBackend, measure: worldMeasure, headers });
  const reportText = () => continuity.page.locator('.ddx-popover').innerText();
  await check('The aggregate seat is bounded and the report says exactly how much was measured, declined and left bounded', async () => {
    assert.match(await continuity.page.locator('[data-ddx="aggregate"] .ddx-evidence').textContent(), /bounded/u);
    await continuity.page.locator('[data-ddx="aggregate"] .ddx-trigger').click(); const text = await reportText();
    assert.match(text, /measured\s+4/u); assert.match(text, /bounded\s+7/u); assert.match(text, /provider-declined\s+1/u); assert.match(text, /total\s+12/u); assert.match(text, /automatic limit 6 · 4 measured automatically/u); assert.ok(await continuity.page.getByRole('button', { name: 'Analyze remaining files' }).count() === 1);
    await capture(continuity.page, 'continuity-report-partial');
  });
  const shadowFocus = () => continuity.page.evaluate(() => { const active = document.querySelector('.ddx-popover-host')?.shadowRoot?.activeElement; return active ? { key: active.dataset.key ?? null, role: active.getAttribute('role'), text: active.textContent } : null; });
  await check('Files rendered below the viewport are not the reader’s demand: nothing is measured until they are scrolled onto', async () => {
    await continuity.page.waitForTimeout(900); assert.deepEqual(measureCalls, [], 'the second allowance is not spent at opening');
  });
  await check('Files the reader scrolled onto are measured within what the opening pass left of the budget, in place, while the report stays open and keeps keyboard focus', async () => {
    assert.equal((await shadowFocus())?.key, 'close', 'opening the report focuses Close');
    await continuity.page.evaluate(() => scrollBy(0, 120));
    await continuity.page.waitForFunction(() => /[56] measured automatically/u.test(document.querySelector('.ddx-popover-host')?.shadowRoot?.querySelector('.ddx-popover')?.innerText ?? ''), null, { timeout: 4000 }).catch(async error => { throw new Error(error.message + ' · report: ' + (await continuity.page.locator('.ddx-popover').innerText().catch(() => 'closed')) + ' · calls: ' + JSON.stringify(measureCalls)); });
    assert.equal(measureCalls.length, 1); assert.equal(measureCalls[0].via, 'visible'); const onScreen = await continuity.page.evaluate(() => [...document.querySelectorAll('.file-header')].filter(header => { const box = header.getBoundingClientRect(); return box.top >= 0 && box.top < innerHeight; }).map(header => header.dataset.path));
    const expected = [4, 5, 6, 7, 8, 9, 10].map(fileName).filter(path => onScreen.includes(path)).slice(0, 2); assert.ok(expected.length > 0, `the scroll brought bounded files on screen: ${JSON.stringify(onScreen)}`);
    assert.deepEqual(measureCalls[0].paths, expected, 'the bounded files now on screen, within the two files the opening pass left of the budget of six');
    assert.equal(await continuity.page.locator('.ddx-popover').count(), 1, 'the open report was updated, not replaced by a closed one'); assert.match(await reportText(), new RegExp(`measured\\s+${4 + expected.length}`, 'u'));
    assert.equal((await shadowFocus())?.key, 'close', 'the rebuilt report gave focus back to the same control');
    assert.match(await continuity.page.locator('[data-ddx="file"]').nth(5).innerText(), /\d/u);
  });
  await check('Analyze remaining files is one explicit pass, operable from the keyboard, and ends with every file measured or declined', async () => {
    await continuity.page.getByRole('button', { name: 'Analyze remaining files' }).focus(); await continuity.page.keyboard.press('Enter');
    await continuity.page.waitForFunction(() => document.querySelector('.ddx-popover-host')?.shadowRoot?.activeElement?.textContent === 'Cancel', null, { timeout: 2000 }).catch(() => { throw new Error('focus did not move from Analyze remaining files to Cancel'); });
    await continuity.page.waitForFunction(() => /bounded\s+0/u.test(document.querySelector('.ddx-popover-host')?.shadowRoot?.querySelector('.ddx-popover')?.innerText ?? ''), null, { timeout: 4000 }).catch(async error => { throw new Error(error.message + ' · report: ' + (await continuity.page.locator('.ddx-popover').innerText().catch(() => 'closed')) + ' · calls: ' + JSON.stringify(measureCalls)); });
    const text = await reportText(); assert.match(text, /measured\s+11/u); assert.match(text, /provider-declined\s+1/u); assert.equal(await continuity.page.getByRole('button', { name: 'Analyze remaining files' }).count(), 0);
    const explicit = measureCalls.filter(call => call.via === 'explicit'); assert.equal(explicit.length, 1); assert.deepEqual(explicit[0].paths, [4, 5, 6, 7, 8, 9, 10].map(fileName).filter(path => !measureCalls[0].paths.includes(path))); assert.match(text, /measured automatically · \d+ on request/u); assert.match(text, new RegExp(`${4 + measureCalls[0].paths.length} measured automatically · ${7 - measureCalls[0].paths.length} on request`, 'u'));
    assert.match(text, /every file GitHub supplied is measured/u, 'a declined file is not called measured');
    const focus = await shadowFocus(); assert.equal(focus?.role, 'dialog', `when the continuation control is gone, focus stays on the report: ${JSON.stringify(focus)}`);
  });
  await check('Pausing from the report removes the seats, restores GitHub’s counters and leaves a way back on the page', async () => {
    await continuity.page.getByRole('button', { name: 'Pause this repository' }).click(); await continuity.page.waitForFunction(() => globalThis.__paused === undefined, null, { timeout: 100 }).catch(() => undefined);
    await continuity.page.evaluate(() => globalThis.__emitSettings()); await continuity.page.locator('[data-ddx="paused"]').waitFor();
    assert.equal(pauseWrites.at(-1).paused, true); assert.equal(await continuity.page.locator('[data-ddx="aggregate"], [data-ddx="file"], .ddx-popover').count(), 0); assert.equal(await continuity.page.locator('.ddx-native-hidden, .ddx-native-faint').count(), 0);
    assert.match(await continuity.page.locator('[data-ddx="paused"]').innerText(), /paused/u);
  });
  await check('Resuming brings the seats back without touching the stored data', async () => {
    await continuity.page.getByRole('button', { name: 'Resume' }).click(); await continuity.page.evaluate(() => globalThis.__emitSettings()); await continuity.page.locator('[data-ddx="aggregate"]').waitFor();
    assert.equal(pauseWrites.at(-1).paused, false); assert.equal(await continuity.page.locator('[data-ddx="paused"]').count(), 0);
  });
  await continuity.page.evaluate(() => controller.stop()); await continuity.context.close();

  // Visible demand on a long page: eight files a screen apart, three measured on opening, a budget of six.
  const far = new m.Analysis({ cache: new m.AnalysisCache(new m.MemoryStore()), engine: 'qa' }); const farSettings = m.validateSettings({ 'analysis.maximumFiles': 6 }); const farCalls = [];
  const farComparison = { ...comparison, changedFiles: 8, additions: 16, deletions: 8 };
  const farPacket = await far.run({ comparison: farComparison, acquisition: { comparison: farComparison, format: 'github-files', complete: true, files: Array.from({ length: 8 }, (_, index) => ({ filename: fileName(index), status: 'modified', additions: 2, deletions: 1, ...(index < 3 ? { patch: fragment } : {}) })) }, policy: { status: 'absent', at: 1 }, coverage: { limit: 6, declined: {} } }, farSettings);
  const farBackend = async message => {
    try {
      if (message.type === 'settings.get') return { ok: true, value: farSettings };
      if (message.type === 'analysis.files') return { ok: true, value: await far.files(message.key, message.comparison, message.paths, farSettings) };
      throw new Error('Unexpected fixture message: ' + message.type);
    } catch (error) { return { ok: false, code: error.code ?? 'TEST_OPERATION_FAILED', message: error.message }; }
  };
  let farPage;
  const farMeasure = async (paths, via) => {
    const seen = await farPage.evaluate(paths => ({ height: innerHeight, boxes: paths.map(path => { const box = document.querySelector(`section[data-path="${path}"]`).getBoundingClientRect(); return { path, top: Math.round(box.top), bottom: Math.round(box.bottom) }; }) }), paths);
    farCalls.push({ paths, via, ...seen }); return far.extend({ comparison: farComparison, patches: paths.map(path => ({ path, patch: fragment })), via }, farSettings);
  };
  const longPage = await contentPage({ value: farPacket, data: farComparison, settings: farSettings, backend: farBackend, measure: farMeasure, headers: Array.from({ length: 8 }, (_, index) => fileName(index)), headerHeight: 1000 }); farPage = longPage.page;
  const scrollTo = index => farPage.evaluate(path => { document.querySelector(`.file-header[data-path="${path}"]`).scrollIntoView(); scrollBy(0, -100); }, fileName(index));
  await check('Opening a long pull request spends nothing of the remaining budget on files rendered further down', async () => {
    await farPage.waitForTimeout(900); assert.deepEqual(farCalls, [], JSON.stringify(farCalls));
  });
  await check('Scrolling measures only the files whose diff is on screen, and stops when the shared budget is spent', async () => {
    await scrollTo(5); await farPage.waitForFunction(() => true); await farPage.waitForTimeout(700);
    assert.equal(farCalls.length, 1, JSON.stringify(farCalls)); assert.deepEqual(farCalls[0].paths, [4, 5].map(fileName), 'the file still filling the top of the screen, then the one below it');
    assert.ok(farCalls[0].boxes.every(box => box.top < farCalls[0].height && box.bottom > 0), `every measured file was on screen: ${JSON.stringify(farCalls[0])}`);
    await scrollTo(7); await farPage.waitForTimeout(700);
    assert.equal(farCalls.length, 2, JSON.stringify(farCalls)); assert.deepEqual(farCalls[1].paths, [fileName(6)], 'one file of the budget remained');
    await farPage.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await farPage.waitForTimeout(700); assert.equal(farCalls.length, 2, 'the budget is spent'); assert.equal(farCalls.flatMap(call => call.paths).length + 3, 6, 'automatic work stopped at the limit');
  });
  await farPage.evaluate(() => controller.stop()); await longPage.context.close();

  // The production worker against the browser's own IndexedDB: purge fences and independent writes.
  const workerCode = (await build({ stdin: { contents: "export { Analysis } from './apps/browser-extension/src/background/analysis.ts'; export { AnalysisCache } from './apps/browser-extension/src/background/cache.ts'; export { validateSettings } from './apps/browser-extension/src/shared/settings.ts';", resolveDir: resolve('.') }, write: false, bundle: true, platform: 'browser', format: 'iife', target: 'chrome120', globalName: 'WorkerUnderTest', alias: { '@wolfsblvt/diffdevil/browser': resolve('dist/browser/index.js') } })).outputFiles[0].text;
  const native = await browser.newContext(); await native.route('https://indexeddb.qa.invalid/**', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>IndexedDB qualification</title>' }));
  const nativePage = await native.newPage(); await nativePage.goto('https://indexeddb.qa.invalid/'); await nativePage.addScriptTag({ content: workerCode });
  for (const [name, clear] of [['clear all', 'all'], ['clear this pull request', 'pull'], ['clear this repository', 'repository'], ['clear reports', 'reports']]) {
    await check(`Native IndexedDB: a rehydration straddling “${name}” is neither served nor retained`, async () => {
      const result = await nativePage.evaluate(async clear => {
        const cache = new WorkerUnderTest.AnalysisCache(indexedDB); const analysis = new WorkerUnderTest.Analysis({ cache, engine: 'qa-native' }); await cache.clear();
        const settings = WorkerUnderTest.validateSettings({ 'analysis.maximumFiles': 3, 'policy.mode': 'personal-only' });
        const comparison = { host: 'github.com', repository: 'example/cinder', pullRequest: 42, base: 'a'.repeat(40), head: 'b'.repeat(40), changedFiles: 1, additions: 1, deletions: 1 };
        const packet = await analysis.run({ comparison, acquisition: { comparison, format: 'github-files', complete: true, files: [{ filename: 'f0.ts', status: 'modified', additions: 1, deletions: 1, patch: '@@ -1,2 +1,2 @@\n-old\n+new\n same\n' }] }, policy: { status: 'unavailable', at: 1 } }, settings);
        analysis.forget(); const gate = Promise.withResolvers(); const entered = Promise.withResolvers(); const get = cache.get.bind(cache); let held = false;
        cache.get = async (key, compat) => { const value = await get(key, compat); if (!held && key.startsWith('report:')) { held = true; entered.resolve(); await gate.promise; } return value; };
        const pending = analysis.files(packet.key, comparison, ['f0.ts'], settings).then(() => 'served', error => error.code); await entered.promise;
        await (clear === 'all' ? analysis.clearAll() : clear === 'reports' ? analysis.clearReports() : clear === 'pull' ? analysis.clearScope('example/cinder', 42) : analysis.clearScope('Example/Cinder'));
        gate.resolve(); const inFlight = await pending; cache.get = get;
        const later = await analysis.files(packet.key, comparison, ['f0.ts'], settings).then(() => 'served', error => error.code);
        return { inFlight, later, reports: (await cache.summary()).reportEntries };
      }, clear);
      assert.deepEqual(result, { inFlight: 'CONTEXT_EXPIRED', later: 'CONTEXT_EXPIRED', reports: 0 });
    });
  }
  await check('Native IndexedDB: concurrent writes of independent keys are all kept', async () => {
    const keys = await nativePage.evaluate(async () => { const cache = new WorkerUnderTest.AnalysisCache(indexedDB); await cache.clear(); await Promise.all(['first', 'second', 'third'].map(key => cache.put(key, 'report', { repository: 'github.com/a/b', pullRequest: 1 }, 'c', { key }))); return (await cache.inventory()).repositories.flatMap(item => item.pullRequests).length; });
    assert.equal(keys, 3);
  });
  await native.close();
  for (const [name, result, pattern] of [['cached facts are labelled while GitHub confirms them', undefined, /local · cached/u], ['facts GitHub confirmed are plain local', { standing: 'current' }, /^local$/u], ['facts GitHub could not confirm say so and stay exact', { standing: 'unconfirmed', code: 'UNREACHABLE' }, /not confirmed/u]]) {
    const shown = await contentPage({ value: worldPacket, data: worldComparison, settings: worldSettings, backend: worldBackend, verifyResult: result ?? { standing: 'current' } });
    await check('Provenance: ' + name, async () => { if (!result) { await shown.page.evaluate(() => { fixture.verifyHold = true; void controller.refresh(); }); await shown.page.waitForTimeout(120); } await shown.page.waitForFunction(pattern => new RegExp(pattern).test(document.querySelector('.ddx-provenance')?.textContent ?? ''), pattern.source, { timeout: 4000 }); });
    await shown.page.evaluate(() => controller.stop()); await shown.context.close();
  }
  const panels = await environment(); await panels.page.setContent('<main id="target"></main>'); await panels.page.addStyleTag({ content: githubCss + contentCss }); await panels.page.addScriptTag({ content: domCode });
  const worldView = unwrap(m.humanReport(world.contexts?.values?.().next().value?.report ?? unwrap(m.analyzeBrowserInput(JSON.stringify({ comparison: worldComparison, format: 'github-files', complete: true, files: [{ filename: fileName(0), status: 'modified', additions: 2, deletions: 1 }] }))), undefined, fileName(0)));
  await check('A bounded file’s report offers to measure it, and a declined file says why it cannot be', async () => {
    const answers = await panels.page.evaluate(view => {
      const calls = []; const popover = new DiffdevilUnderTest.Popover(); const anchor = document.createElement('button'); document.querySelector('#target').append(anchor);
      const make = standing => ({ copyText: async () => '', retry: () => {}, settingsUrl: 'about:blank', dataUrl: 'about:blank', provenance: () => 'live', coverage: { summary: () => ({ limit: 150 }), progress: () => undefined, note: () => undefined, start() {}, cancel() {} }, fileStanding: () => standing, measureFile: path => calls.push(path), pause() {}, diagnostics: () => '', errorPanel: () => document.createElement('div') });
      popover.toggle(anchor, DiffdevilUnderTest.filePanel(view, popover, make({ standing: 'bounded' })), { width: 360, align: 'end' }); const bounded = document.querySelector('.ddx-popover-host').shadowRoot.querySelector('.ddx-file-coverage')?.textContent ?? '';
      document.querySelector('.ddx-popover-host').shadowRoot.querySelector('[data-key="measure-file"]').click(); popover.close(false);
      popover.toggle(anchor, DiffdevilUnderTest.filePanel(view, popover, make({ standing: 'declined', reason: 'binary' })), { width: 360, align: 'end' }); const declined = document.querySelector('.ddx-popover-host').shadowRoot.querySelector('.ddx-file-coverage')?.textContent ?? ''; popover.close(false);
      return { bounded, declined, calls };
    }, worldView);
    assert.match(answers.bounded, /Not measured yet.*automatic limit of 150/u); assert.match(answers.bounded, /Measure this file/u); assert.equal(answers.calls.length, 1); assert.match(answers.declined, /declined to supply.*binary/u);
  });
  await panels.context.close();
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
