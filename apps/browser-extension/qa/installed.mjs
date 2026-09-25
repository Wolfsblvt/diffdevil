// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { readFile, writeFile, mkdir, mkdtemp, rm, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { diff as patch, comparison } from './fixtures.mjs';
const output = resolve('artifacts/browser-extension/qa'); await mkdir(output, { recursive: true });
const receipt = { kind: 'diffdevil.installed-qa/1', status: 'not-run', checks: [], policyEvidence: [], errors: [], qualification: 'Installed MV3 worker, native Chrome storage and IndexedDB, using an explicitly synthetic report. No live/private GitHub or provider mutation claim.' };
const requireInstalled = process.argv.includes('--require');
let context; let profile;
async function persist() { await writeFile(join(output, 'installed-receipt.json'), JSON.stringify(receipt, null, 2) + '\n'); }
async function check(name, operation) { try { await operation(); receipt.checks.push({ name, passed: true }); } catch (error) { receipt.checks.push({ name, passed: false, error: String(error.stack ?? error) }); throw error; } }
// Inspect only known policy directories. Never change policy, hide it from Chrome,
// switch to another unmanaged installation to evade it, or invent an allowlist.
for (const directory of ['/etc/chromium/policies/managed', '/etc/opt/chrome/policies/managed']) {
  let names; try { names = await readdir(directory); } catch { continue; }
  for (const name of names.filter(name => name.endsWith('.json'))) {
    const content = await readFile(join(directory, name), 'utf8'); let policy; try { policy = JSON.parse(content); } catch { continue; }
    if (policy.ExtensionInstallBlocklist?.includes('*') || policy.ExtensionInstallBlacklist?.includes('*') || policy.ExtensionSettings?.['*']?.installation_mode === 'blocked') receipt.policyEvidence.push({ file: join(directory, name), sha256: createHash('sha256').update(content).digest('hex'), extensionInstallationBlocked: true });
  }
}
if (receipt.policyEvidence.length) {
  receipt.status = 'blocked-by-managed-policy'; await persist(); console.log(JSON.stringify(receipt, null, 2));
  process.exitCode = requireInstalled ? 2 : 0;
} else {
  const extension = resolve('artifacts/browser-extension/unpacked');
  const launch = () => chromium.launchPersistentContext(profile, { ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : { channel: 'chromium' }), headless: process.env.HEADED !== '1', viewport: { width: 1280, height: 800 }, ignoreDefaultArgs: ['--disable-extensions'], args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`, ...(process.platform === 'linux' ? ['--no-sandbox'] : [])] });
  try {
    profile = await mkdtemp(join(tmpdir(), 'diffdevil-installed-'));
    context = await launch();
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker', { timeout: 20_000 });
    const base = worker.url().replace(/\/background\.js(?:[?#].*)?$/u, ''); const page = await context.newPage();
    page.on('pageerror', error => receipt.errors.push(error.message));
    await page.goto(`${base}/options.html`); await page.locator('.setting').first().waitFor();
    const call = async message => {
      const response = await page.evaluate(message => chrome.runtime.sendMessage(message), message);
      assert.equal(response?.ok, true, response?.message ?? 'Missing worker response'); return response.value;
    };
    await check('Actual MV3 service worker and options page initialize under manifest CSP', async () => {
      assert.ok(worker.url().endsWith('/background.js')); assert.equal(await page.title(), 'Settings · diffdevil for GitHub');
      const manifest = await page.evaluate(() => chrome.runtime.getManifest()); assert.equal(manifest.manifest_version, 3); assert.deepEqual(manifest.permissions, ['storage']);
      assert.ok(!manifest.content_security_policy.extension_pages.includes('unsafe-eval'));
    });
    await check('Native storage separates local policy from synchronized preferences', async () => {
      await call({ type: 'settings.save', patch: { 'display.nativeChurn': 'faint', 'policy.advancedYaml': 'version: 1\n', 'policy.repositoryOverrides': '{"example/cinder":{"mode":"personal-only"}}' } });
      const data = await page.evaluate(async () => ({ sync: await chrome.storage.sync.get(null), local: await chrome.storage.local.get(null) }));
      assert.ok(!JSON.stringify(data.sync).includes('example/cinder')); assert.ok(!JSON.stringify(data.sync).includes('policy.advancedYaml'));
      assert.ok(JSON.stringify(data.local).includes('example/cinder'));
    });
    let packet;
    await check('Real worker executes the portable engine and writes normalized IndexedDB cache', async () => {
      packet = await call({ type: 'analysis.run', input: { comparison, acquisition: { comparison, format: 'diff', text: patch, complete: true }, policy: { status: 'absent', at: Date.now() } } });
      assert.equal(packet.view.changed.value, 178); assert.equal(packet.view.raw.churn.value, 278);
      const info = await call({ type: 'diagnostics.get' }); assert.equal(info.cache.reportEntries, 1);
      const files = await call({ type: 'analysis.files', key: packet.key, paths: ['src/cache.ts', 'src/renderer.ts'] }); assert.equal(files['src/cache.ts'].changed.value, 32);
      const entries = await page.evaluate(() => new Promise((resolve, reject) => {
        const opening = indexedDB.open('diffdevil-rebuildable-v1', 1);
        opening.onerror = () => reject(opening.error?.message);
        opening.onsuccess = () => { const db = opening.result; const tx = db.transaction('entries'); const read = tx.objectStore('entries').getAll(); read.onsuccess = () => { resolve(read.result); db.close(); }; read.onerror = () => reject(read.error?.message); };
      }));
      assert.ok(entries.length); assert.ok(!JSON.stringify(entries).includes('diff --git')); assert.ok(!JSON.stringify(entries).includes('old_0'));
    });
    await check('User settings and numeric cache survive actual browser/worker restart', async () => {
      await context.close(); context = await launch(); const restarted = await context.newPage(); restarted.on('pageerror', error => receipt.errors.push(error.message)); await restarted.goto(`${base}/options.html`); await restarted.locator('.setting').first().waitFor();
      const settings = await restarted.evaluate(() => chrome.runtime.sendMessage({ type: 'settings.get' })); assert.equal(settings.value['display.nativeChurn'], 'faint');
      const cache = await restarted.evaluate(comparison => chrome.runtime.sendMessage({ type: 'cache.lookup', comparison }), comparison); assert.equal(cache.value.reportCached, true);
      const files = await restarted.evaluate(key => chrome.runtime.sendMessage({ type: 'analysis.files', key, paths: ['src/cache.ts'] }), packet.key); assert.equal(files.ok, false); assert.equal(files.code, 'CONTEXT_EXPIRED');
      const again = await restarted.evaluate(comparison => chrome.runtime.sendMessage({ type: 'analysis.run', input: { comparison, policy: { status: 'absent', at: Date.now() } } }), comparison); assert.equal(again.ok, true); assert.equal(again.value.cached, true); assert.equal(again.value.view.changed.value, 178);
      const refused = await restarted.evaluate(() => chrome.runtime.sendMessage({ type: 'data.action', action: 'data.resetAll' })); assert.equal(refused.code, 'CONFIRMATION_REQUIRED');
      const cleared = await restarted.evaluate(() => chrome.runtime.sendMessage({ type: 'data.action', action: 'data.clearAnalysisCache' })); assert.equal(cleared.ok, true); assert.equal(cleared.value.cache.reportEntries, 0);
      const retained = await restarted.evaluate(() => chrome.runtime.sendMessage({ type: 'settings.get' })); assert.equal(retained.value['display.nativeChurn'], 'faint');
      const reset = await restarted.evaluate(() => chrome.runtime.sendMessage({ type: 'data.action', action: 'data.resetAll', confirmed: true })); assert.equal(reset.ok, true); assert.equal(reset.value.cache.entries, 0);
      const defaults = await restarted.evaluate(() => chrome.runtime.sendMessage({ type: 'settings.get' })); assert.equal(defaults.value['display.nativeChurn'], 'hidden');
    });
    await check('No uncaught extension page error was observed', async () => assert.deepEqual(receipt.errors, []));
    receipt.status = 'passed';
  } catch (error) { receipt.status = 'failed'; receipt.errors.push(String(error.stack ?? error)); process.exitCode = 1; }
  finally { await context?.close(); if (profile) await rm(profile, { recursive: true, force: true }); await persist(); console.log(JSON.stringify(receipt, null, 2)); }
}
