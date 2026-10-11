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
import { comparison, diff, githubCss, githubHtml, githubChangesHtml, endSeatHosts } from './fixtures.mjs';

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
  loader: { '.css': 'text' },
  alias: {
    '@wolfsblvt/diffdevil/browser/text': resolve('dist/lib/browser/text.js'),
    '@wolfsblvt/diffdevil/browser': resolve('dist/browser/index.js'),
  },
})).outputFiles[0].text;
const contentCss = await readFile('apps/browser-extension/src/content/content.css', 'utf8');
const executablePath = process.env.CHROMIUM_PATH ?? (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true, args: ['--no-sandbox', '--disable-gpu'] });
const results = [];
async function scene(summary, options = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'dark', reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.setDefaultTimeout(4000);
  const host = options.host ? endSeatHosts[options.host] : undefined;
  await page.setContent(summary === 'changes' ? githubChangesHtml() : githubHtml({ dark: true, files: Boolean(host) && options.host === 'classic', summary }));
  await page.addStyleTag({ content: githubCss + contentCss });
  if (summary === 'changes') await page.addStyleTag({ content: '.d-flex{display:flex!important}' });
  if (host) { await page.addStyleTag({ content: host.css }); await page.evaluate(host.prepare); }
  // What GitHub drew, before diffdevil touches the row.
  const before = host ? await page.evaluate(measureSeats, host.seats) : undefined;
  await page.addScriptTag({ content: domCode });
  const fileViews = Object.fromEntries(report.files.map(file => [file.path, m.decorateView(unwrap(m.humanReport(report, policy, file.path)), settings)]));
  await page.evaluate(({ packet, settings, fileViews, summary, options }) => {
    const listeners = new Set();
    globalThis.acquireCalls = 0;
    globalThis.failNextAcquisition = false;
    globalThis.chrome = {
      runtime: { id: 'test-extension', getURL: path => `chrome-extension://test-extension/${path}`, sendMessage: async message => message.type === 'settings.get' ? { ok: true, value: settings } : { ok: false, code: 'UNEXPECTED', message: message.type } },
      storage: { onChanged: { addListener: callback => listeners.add(callback), removeListener: callback => listeners.delete(callback) } },
    };
    globalThis.controller = DiffdevilUnderTest.startContent({
      href: () => `https://github.com/example/cinder/pull/42/${summary === 'changes' ? 'changes' : 'files'}`,
      acquire: async () => { globalThis.acquireCalls++; if (options.slow) await new Promise(resolve => setTimeout(resolve, options.slow)); if (options.paused) throw Object.assign(new Error('Paused.'), { code: 'REPOSITORY_PAUSED' }); if (options.failure || globalThis.failNextAcquisition) { globalThis.failNextAcquisition = false; throw Object.assign(new Error('Synthetic private comparison has no public API route.'), { code: 'PUBLIC_UNAVAILABLE' }); } return { packet, settings }; },
      request: async message => {
        if (message.type === 'settings.get') return settings;
        if (message.type === 'analysis.files') return Object.fromEntries(message.paths.filter(path => fileViews[path]).map(path => [path, fileViews[path]]));
        throw new Error(`Unexpected focused fixture request: ${message.type}`);
      },
    });
  }, { packet, settings: { ...settings, ...options.settings }, fileViews, summary, options });
  return { context, page, before, seats: host?.seats };
}
/** In page: each seat's native edges and, afterwards, the edges of the group that took its place (our nodes plus any native node still shown). */
function measureSeats(seats) {
  const box = nodes => { const boxes = nodes.filter(node => node.getClientRects().length).map(node => node.getBoundingClientRect()); return boxes.length ? { left: Math.min(...boxes.map(rect => rect.left)), right: Math.max(...boxes.map(rect => rect.right)) } : undefined; };
  return seats.flatMap(seat => [...document.querySelectorAll(seat.scope)].map((scope, index) => {
    const natives = [...scope.querySelectorAll(seat.native)].filter(node => !node.closest('[data-diffdevil]'));
    const roots = [...scope.querySelectorAll(seat.root)].concat(scope.matches(seat.root) ? [scope] : []);
    // A seat is a sibling in front of the native node, so it can sit in the native's parent rather than inside the scope.
    const siblings = natives.flatMap(node => [node.previousElementSibling].filter(sibling => sibling?.matches(seat.root)));
    return { id: seat.id, index, native: box(natives.filter(node => getComputedStyle(node).display !== 'none')), group: box([...new Set([...roots, ...siblings]), ...natives.filter(node => getComputedStyle(node).display !== 'none')]) };
  }));
}
async function addAccessibleChurnLabels(page) {
  await page.locator('.Diffstat-module__container__fixture').evaluateAll(nodes => nodes.forEach((node, index) => {
    const label = document.createElement('span');
    label.hidden = true;
    label.textContent = index === 0 ? 'Lines changed: 160 additions & 118 deletions' : 'Lines changed: 30 additions & 22 deletions';
    node.prepend(label);
  }));
  await page.evaluate(() => controller.refresh());
}
try {
  const changes = await scene('changes');
  await addAccessibleChurnLabels(changes.page);
  await changes.page.locator('[data-ddx="file"]').nth(1).waitFor();
  assert.equal(await changes.page.locator('[data-ddx="aggregate"]').count(), 1);
  assert.equal(await changes.page.locator('[data-testid="progressive-diffs-list"] [data-ddx="aggregate"]').count(), 0);
  // File-tree counters: bound by the diff anchor hash, one seat per known file, native hidden in place;
  // the directory row, the decoys and an unknown file receive nothing.
  await changes.page.locator('[data-ddx="tree"]').nth(1).waitFor();
  assert.equal(await changes.page.locator('[data-ddx="tree"]').count(), 2);
  assert.deepEqual(await changes.page.locator('[role="tree"] [data-ddx="tree"] .ddx-value').allTextContents(), ['32', '146']);
  assert.equal(await changes.page.locator('[data-ddx="tree"] .ddx-chip, [data-ddx="tree"] .ddx-rail, [data-ddx="tree"] .ddx-word').count(), 0);
  assert.equal(await changes.page.locator('[data-ddx="tree"] + .PRIVATE_TreeView-item-trailing-visual.ddx-native-hidden').count(), 2);
  assert.equal(await changes.page.locator('[data-tree-entry-type="directory"] > div > [data-ddx], .fixture-tree-summary [data-ddx]').count(), 0);
  assert.equal(await changes.page.locator('[data-testid="file-tree"] [data-ddx="aggregate"]').count(), 0);
  await changes.page.locator('[role="tree"] [data-ddx="tree"] .ddx-trigger').first().click();
  assert.equal(await changes.page.locator('.ddx-popover .ddx-title').innerText(), 'cache.ts');
  await mkdir('artifacts/browser-extension/qa', { recursive: true });
  await changes.page.screenshot({ path: 'artifacts/browser-extension/qa/live-dom-changes.png', animations: 'disabled' });
  await changes.page.keyboard.press('Escape');
  // The seat leads the complete native churn group (counts and squares), which is hidden as one node.
  assert.equal(await changes.page.locator('[data-ddx="aggregate"] + .Diffstat-module__container__fixture').count(), 1);
  assert.equal(await changes.page.locator('.fixture-header-meta .Diffstat-module__container__fixture').evaluate(node => getComputedStyle(node).display), 'none');
  assert.equal(await changes.page.locator('.fixture-header-meta .Diffstat-module__squares__fixture [data-ddx], .fixture-header-meta .Diffstat-module__container__fixture [data-ddx]').count(), 0);
  assert.equal(await changes.page.locator('[data-diff-header-wrapper] [data-ddx="file"]').count(), 2);
  assert.deepEqual(await changes.page.locator('[data-diff-header-wrapper] .ddx-root[data-ddx="file"]').evaluateAll(seats => seats.map(seat => {
    const header = seat.parentElement;
    const counts = header?.querySelectorAll('.Diffstat-module__count__fixture') ?? [];
    const squares = header?.querySelector('.Diffstat-module__squares__fixture');
    const native = [...counts, ...(squares ? [squares] : [])];
    return { leads: Boolean(counts.length && seat.nextElementSibling === counts[0]), hidden: native.length === 3 && native.every(node => node.classList.contains('ddx-native-hidden') && getComputedStyle(node).display === 'none') };
  })), [{ leads: true, hidden: true }, { leads: true, hidden: true }]);
  assert.equal(await changes.page.locator('[data-testid="file-tree"] [data-ddx="aggregate"]').count(), 0);
  assert.equal(await changes.page.locator('[data-ddx="file"]').count(), 2);
  assert.deepEqual(await changes.page.evaluate(() => {
    const current = DiffdevilUnderTest.route('https://github.com/example/cinder/pull/42/changes');
    const value = DiffdevilUnderTest.pageComparison(document, current);
    return { base: value?.base, head: value?.head, secondPath: DiffdevilUnderTest.filePath(document.querySelectorAll('[data-diff-header-wrapper]')[1]), full: DiffdevilUnderTest.fullFilesView('https://github.com/example/cinder/pull/42/changes') };
  }), { base: comparison.base, head: comparison.head, secondPath: 'src/renderer.ts', full: true });
  results.push({ name: 'signed-in-changes-structure', status: 'passed' });
  await changes.page.evaluate(async () => { globalThis.failNextAcquisition = true; await controller.refresh(); });
  await changes.page.locator('[data-ddx="failure"]').waitFor();
  assert.deepEqual(await changes.page.locator('[data-diff-header-wrapper] .Diffstat-module__count__fixture, [data-diff-header-wrapper] .Diffstat-module__squares__fixture').evaluateAll(nodes => nodes.map(node => ({ text: node.textContent, display: getComputedStyle(node).display, hidden: node.classList.contains('ddx-native-hidden'), faint: node.classList.contains('ddx-native-faint') }))), [
    { text: '+30', display: 'inline', hidden: false, faint: false }, { text: '−22', display: 'inline', hidden: false, faint: false }, { text: '', display: 'flex', hidden: false, faint: false },
    { text: '+130', display: 'inline', hidden: false, faint: false }, { text: '−96', display: 'inline', hidden: false, faint: false }, { text: '', display: 'flex', hidden: false, faint: false },
  ]);
  results.push({ name: 'failed-refresh-restores-react-file-native-group', status: 'passed' });
  await changes.page.evaluate(() => controller.stop());
  await changes.context.close();
  // Failure: the marker takes the leading edge of the whole native seat and every native count stays at full strength.
  const failing = await scene('changes', { failure: true });
  await addAccessibleChurnLabels(failing.page);
  await failing.page.locator('[data-ddx="failure"]').waitFor();
  assert.equal(await failing.page.locator('[data-ddx="failure"] + .Diffstat-module__container__fixture').count(), 1);
  assert.equal(await failing.page.locator('.Diffstat-module__container__fixture [data-ddx]').count(), 0);
  assert.deepEqual(await failing.page.locator('.fixture-header-meta .Diffstat-module__container__fixture').evaluate(node => ({ display: getComputedStyle(node).display, opacity: getComputedStyle(node).opacity, text: node.innerText, hidden: node.classList.contains('ddx-native-hidden'), faint: node.classList.contains('ddx-native-faint') })), { display: 'block', opacity: '1', text: '+160−118', hidden: false, faint: false });
  assert.deepEqual(await failing.page.locator('[data-diff-header-wrapper] .Diffstat-module__count__fixture, [data-diff-header-wrapper] .Diffstat-module__squares__fixture').evaluateAll(nodes => nodes.map(node => ({ text: node.textContent, display: getComputedStyle(node).display, hidden: node.classList.contains('ddx-native-hidden') }))), [
    { text: '+30', display: 'inline', hidden: false }, { text: '−22', display: 'inline', hidden: false }, { text: '', display: 'flex', hidden: false },
    { text: '+130', display: 'inline', hidden: false }, { text: '−96', display: 'inline', hidden: false }, { text: '', display: 'flex', hidden: false },
  ]);
  assert.equal(await failing.page.locator('[data-ddx="failure"] .ddx-marker').innerText(), '× diffdevil');
  assert.equal(await failing.page.getByRole('button', { name: 'Retry', exact: true }).count(), 1);
  assert.equal(await failing.page.locator('[data-ddx="file"], [data-ddx="tree"], .ddx-native-hidden, .ddx-native-faint').count(), 0);
  results.push({ name: 'failure-marker-leads-whole-native-seat', status: 'passed' });
  await failing.page.evaluate(() => controller.stop());
  await failing.context.close();
  const current = await scene('current');
  await current.page.locator('[data-ddx="aggregate"]').waitFor();
  assert.equal(await current.page.locator('[data-ddx="aggregate"] .ddx-value').textContent(), '178');
  assert.equal(await current.page.locator('[data-ddx="aggregate"] + .fixture-current-summary').count(), 1);
  assert.equal(await current.page.locator('.ddx-status-fallback').count(), 0);
  results.push({ name: 'current-tokenized-diffstat', status: 'passed' });
  await current.page.evaluate(() => controller.stop());
  await current.context.close();

  const missing = await scene('missing');
  await missing.page.locator('.ddx-status-fallback').waitFor();
  assert.match(await missing.page.locator('.ddx-status-fallback').textContent(), /could not find GitHub’s pull-request summary/u);
  assert.equal(await missing.page.getByRole('button', { name: 'Retry', exact: true }).count(), 1);
  await missing.page.getByRole('button', { name: 'Retry', exact: true }).focus();
  await missing.page.evaluate(() => { const item = document.createElement('span'); item.className = 'diffstat'; document.querySelector('main').append(item); });
  assert.equal(await missing.page.evaluate(() => document.activeElement?.textContent), 'Retry');
  await missing.page.getByRole('button', { name: 'Retry', exact: true }).click();
  assert.equal(await missing.page.evaluate(() => acquireCalls), 1);
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

  // Alignment (grammar §4): the group that takes a seat keeps the edge GitHub's seat had. Where GitHub right-aligns its
  // diffstat the right edge must not move; where GitHub starts it, the start edge must not move. Measured, not inferred.
  const near = (actual, expected, label) => assert.ok(Math.abs(actual - expected) <= 1, `${label}: ${actual} is not ${expected}`);
  const compare = (name, seats, before, after, { markers = false } = {}) => {
    const wanted = new Map(seats.map(seat => [seat.id, seat]));
    const checked = [];
    for (const item of before) {
      if (markers && item.id !== 'aggregate') continue;
      const seat = wanted.get(item.id); const found = after.find(other => other.id === item.id && other.index === item.index);
      assert.ok(item.native && found?.group, `${name}: ${item.id}#${item.index} was not measured (${JSON.stringify({ item, found })})`);
      if (seat.end) near(found.group.right, item.native.right, `${name} ${item.id}#${item.index} right edge`); else near(found.group.left, item.native.left, `${name} ${item.id}#${item.index} left edge`);
      // Counts GitHub keeps (faint, reading, paused, failure) must stay the outer edge: the group extends inward from them, not the other way round.
      if (seat.end && found.native) near(found.native.right, item.native.right, `${name} ${item.id}#${item.index} retained native right edge`);
      if (markers) assert.ok(found.group.right - found.group.left < 400, `${name}: ${item.id} marker must sit beside GitHub's counts, not across the row (${JSON.stringify(found.group)})`);
      checked.push(`${item.id}#${item.index}:${seat.end ? 'end' : 'start'}`);
    }
    return checked;
  };
  const settled = async (page, host) => {
    await page.locator('[data-ddx="aggregate"]').waitFor();
    await page.locator('[data-ddx="file"]').nth(1).waitFor();
    if (host === 'react') await page.locator('[data-ddx="toolbar"]').waitFor();
  };
  for (const host of ['react', 'float', 'classic']) {
    const summary = host === 'classic' ? 'legacy' : 'changes';
    for (const mode of ['hidden', 'faint']) {
      const run = await scene(summary, { host, settings: mode === 'faint' ? { 'display.nativeChurn': 'faint' } : {} });
      await settled(run.page, host);
      if (mode === 'hidden') assert.equal(await run.page.locator('.ddx-native-leaving').count(), 0);
      const checked = compare(`${host}/${mode}`, run.seats, run.before, await run.page.evaluate(measureSeats, run.seats));
      assert.ok(checked.length >= { react: 4, float: 1, classic: 3 }[host], `${host}/${mode} measured ${checked.length} seats`);
      if (mode === 'faint') assert.ok(await run.page.locator('.ddx-native-faint').count() > 0);
      if (host === 'react') {
        // The retained native node no longer carries its own auto margin, so no gap opens between our group and it.
        assert.equal(await run.page.locator('.ddx-native-end').first().evaluate(node => getComputedStyle(node).marginLeft), '0px');
      }
      results.push({ name: `alignment-${host}-${mode}`, status: 'passed', seats: checked });
      await run.page.screenshot({ path: `artifacts/browser-extension/qa/alignment-${host}-${mode}.png`, animations: 'disabled' });
      await run.page.evaluate(() => controller.stop()); await run.context.close();
    }
    for (const [state, options, marker] of [['failure', { failure: true }, 'failure'], ['paused', { paused: true }, 'paused'], ['reading', { slow: 1800 }, 'reading']]) {
      const run = await scene(summary, { host, ...options });
      // GitHub mutates its DOM constantly, which re-renders once settings have arrived and arms the marker's delay; a static fixture needs one hidden mutation.
      if (state === 'reading') await run.page.evaluate(() => { const nudge = document.createElement('span'); nudge.className = 'diffstat'; nudge.hidden = true; document.querySelector('main').append(nudge); });
      await run.page.locator(`[data-ddx="${marker}"]`).waitFor({ timeout: 4000 });
      const checked = compare(`${host}/${state}`, run.seats, run.before, await run.page.evaluate(measureSeats, run.seats), { markers: true });
      assert.ok(checked.length >= 1);
      results.push({ name: `alignment-${host}-${state}-marker`, status: 'passed', seats: checked });
      await run.page.screenshot({ path: `artifacts/browser-extension/qa/alignment-${host}-${state}.png`, animations: 'disabled' });
      await run.page.evaluate(() => controller.stop()); await run.context.close();
    }
  }
} finally {
  await browser.close();
  await loaded.cleanup();
}
await mkdir('artifacts/browser-extension/qa', { recursive: true });
await writeFile('artifacts/browser-extension/qa/live-dom-receipt.json', `${JSON.stringify({ kind: 'diffdevil.extension.live-dom-qa/1', liveGitHubVerified: false, results }, null, 2)}\n`);
console.log(JSON.stringify({ passed: results.length, failed: 0, qualification: 'current-shaped GitHub summary and missing-anchor fallback' }, null, 2));
