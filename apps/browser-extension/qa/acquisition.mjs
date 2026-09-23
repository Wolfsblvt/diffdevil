// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { build } from 'esbuild';
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { githubHtml, githubChangesHtml, comparison, diff } from './fixtures.mjs';
const out = resolve('artifacts/browser-extension/qa'); await mkdir(out, { recursive: true });
await build({ entryPoints: ['apps/browser-extension/qa/dom-entry.ts'], outfile: join(out, 'acquisition-test-entry.js'), bundle: true, platform: 'browser', format: 'iife', globalName: 'ExtensionQA', target: 'chrome120', alias: { '@wolfsblvt/diffdevil/browser/text': resolve('dist/lib/browser/text.js'), '@wolfsblvt/diffdevil/browser': resolve('dist/browser/index.js') } });
let executablePath = process.env.CHROMIUM_EXECUTABLE; if (!executablePath) try { await access('/usr/bin/chromium'); executablePath = '/usr/bin/chromium'; } catch {}
const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true, args: ['--no-sandbox', '--disable-gpu'] });
const receipt = { kind: 'diffdevil.acquisition-qa/1', browser: browser.version(), qualification: 'Production signed-in acquisition adapter executed in a browser with authored provider responses and explicit worker transport. Not live GitHub, account access, network/CORS or installed-extension evidence.', checks: [] };
async function run(options = {}) {
  const page = await browser.newPage();
  try {
    await page.setContent(options.changes ? githubChangesHtml(options.stale ? { ...comparison, base: 'd'.repeat(40) } : comparison) : githubHtml({ data: options.empty ? { ...comparison, changedFiles: 0, additions: 0, deletions: 0 } : comparison }));
    await page.evaluate(({ options, comparison, diff, afterHtml, lateHtml }) => {
      window.transport = []; window.analysisInputs = []; window.fetches = [];
      const source = options.empty ? { ...comparison, changedFiles: 0, additions: 0, deletions: 0 } : comparison;
      window.chrome = { runtime: { sendMessage: async message => {
        window.transport.push(message.type);
        if (message.type === 'cache.lookup') return { ok: true, value: { settings: {}, reportCached: Boolean(options.cached), selected: { mode: options.personalOnly ? 'personal-only' : 'composed', personal: 'version: 1\n' }, ...(options.cachedPolicy ? { policy: { status: 'absent', at: 1 } } : {}) } };
        if (message.type === 'policy.templates') return { ok: true, value: options.template ? [options.template] : [] };
        if (message.type === 'source.public') return { ok: false, code: 'PUBLIC_UNAVAILABLE', message: 'Synthetic private comparison has no public API route.' };
        if (message.type === 'analysis.run') { window.analysisInputs.push(message.input); return { ok: true, value: { key: 'acquisition-test', comparison: source, view: null, files: [], refreshedAt: 1, cached: Boolean(options.cached) } }; }
        return { ok: false, code: 'UNEXPECTED_MESSAGE', message: message.type };
      } } };
      window.fetch = async (path, init) => {
        window.fetches.push({ path, credentials: init.credentials, method: init.method ?? 'GET' });
        if (init.signal.aborted) throw init.signal.reason;
        let body = ''; let status = 200; let type = 'text/html'; let url = `https://github.com${path}`;
        if (path.endsWith('.diff')) {
          body = options.empty ? '' : diff; type = 'text/plain';
          if (options.htmlDiff) { body = '<html>Sign in</html>'; type = 'text/html'; url = 'https://github.com/login'; }
          if (options.oversize) body = 'x'.repeat(8 * 1024 * 1024 + 1);
        } else if (path.includes('/blob/')) {
          if (options.missingPolicy && path.endsWith('.diffdevil.yml')) status = 404;
          else body = `<script type="application/json">${JSON.stringify({ payload: { blob: { rawLines: path.endsWith('.diffdevil.yml') ? ['version: 1'] : ['Changed: {{ totals.lines.changed }}'], isTruncated: Boolean(options.truncatedPolicy) } } })}</script>`;
        } else if (path.includes('/commit/')) status = options.inaccessibleBase ? 404 : 200;
        else if (options.changes && path.endsWith('/pull/42')) body = '<script type="application/json" data-target="react-app.embeddedData">{"payload":{"pullRequestsConversationsRoute":{"pullRequest":{"headSha":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"}}}}</script>';
        else body = options.lateMoved && window.fetches.filter(request => request.path.endsWith('/changes')).length > 1 ? lateHtml : afterHtml;
        const response = new Response(body, { status, headers: { 'content-type': type } }); Object.defineProperty(response, 'url', { value: url }); return response;
      };
      window.controller = new AbortController(); if (options.aborted) window.controller.abort(new Error('Cancelled fixture'));
    }, { options, comparison, diff, afterHtml: options.changes ? githubChangesHtml(options.moved ? { ...comparison, head: 'c'.repeat(40) } : comparison) : githubHtml({ data: options.moved ? { ...comparison, head: 'c'.repeat(40) } : options.empty ? { ...comparison, changedFiles: 0, additions: 0, deletions: 0 } : comparison }), lateHtml: githubChangesHtml({ ...comparison, head: 'c'.repeat(40) }) });
    await page.addScriptTag({ path: join(out, 'acquisition-test-entry.js') });
    return await page.evaluate(async changes => {
      let result; let error;
      try { result = await ExtensionQA.acquire(ExtensionQA.route(`https://github.com/example/cinder/pull/42/${changes ? 'changes' : 'files'}`), document, window.controller.signal); } catch (exception) { error = { code: exception.code, message: exception.message }; }
      return { ok: Boolean(result), error, inputs: window.analysisInputs, requests: window.fetches, messages: window.transport };
    }, Boolean(options.changes));
  } finally { await page.close(); }
}
async function check(name, action) { try { await action(); receipt.checks.push({ name, passed: true }); } catch (error) { receipt.checks.push({ name, passed: false, error: String(error.stack ?? error) }); throw error; } }
try {
  await check('Signed-in diff, trusted-base policy and after-acquisition identity reach the real boundary', async () => {
    const result = await run(); assert.equal(result.ok, true); assert.equal(result.inputs[0].acquisition.text, diff); assert.equal(result.inputs[0].policy.text, 'version: 1'); assert.equal(result.requests.length, 3); assert.ok(result.requests.every(request => request.method === 'GET' && request.credentials === 'same-origin')); assert.ok(result.requests.some(request => request.path.includes(`/blob/${comparison.base}/.diffdevil.yml`))); assert.ok(!result.requests.some(request => request.path.includes(`/blob/${comparison.head}/`)));
  });
  await check('Force-push during acquisition prevents analysis from being submitted', async () => { const result = await run({ moved: true }); assert.equal(result.error.code, 'COMPARISON_MOVED'); assert.equal(result.inputs.length, 0); });
  await check('React /changes binds before trusted-base policy and confirms on the same page form', async () => { const result = await run({ changes: true }); assert.equal(result.ok, true); assert.equal(result.inputs[0].comparison.base, comparison.base); assert.equal(result.requests.filter(request => request.path.endsWith('/changes')).length, 2); assert.ok(!result.requests.some(request => request.path.endsWith('/pull/42'))); });
  await check('Stale embedded /changes base cannot select policy or submit analysis', async () => { const result = await run({ changes: true, stale: true }); assert.equal(result.error.code, 'COMPARISON_MOVED'); assert.equal(result.inputs.length, 0); assert.ok(!result.requests.some(request => request.path.includes('/blob/'))); });
  await check('Moved React /changes comparison cannot submit analysis', async () => { const result = await run({ changes: true, moved: true }); assert.equal(result.error.code, 'COMPARISON_MOVED'); assert.equal(result.inputs.length, 0); });
  await check('React /changes moving after policy lookup cannot submit analysis', async () => { const result = await run({ changes: true, lateMoved: true }); assert.equal(result.error.code, 'COMPARISON_MOVED'); assert.equal(result.inputs.length, 0); assert.ok(result.requests.some(request => request.path.includes('/blob/'))); });
  await check('Cache hit still rechecks the comparison but does not reacquire raw source', async () => { const result = await run({ cached: true, cachedPolicy: true }); assert.equal(result.ok, true); assert.equal(result.requests.length, 1); assert.equal(result.inputs[0].acquisition, undefined); });
  await check('A missing policy is absent only after independent exact-base access proof', async () => { const result = await run({ missingPolicy: true }); assert.equal(result.inputs[0].policy.status, 'absent'); assert.ok(result.requests.some(request => request.path.endsWith(`/commit/${comparison.base}`))); });
  await check('A private/inaccessible-base 404 is unavailable, not an absent policy', async () => { const result = await run({ missingPolicy: true, inaccessibleBase: true }); assert.equal(result.inputs[0].policy.status, 'unavailable'); });
  await check('Truncated blob payload is never accepted as a complete policy', async () => { const result = await run({ truncatedPolicy: true }); assert.equal(result.inputs[0].policy.status, 'unavailable'); });
  await check('Personal-only explicitly skips repository-policy acquisition', async () => { const result = await run({ personalOnly: true }); assert.equal(result.ok, true); assert.ok(!result.requests.some(request => request.path.includes('/blob/'))); });
  await check('Explicit templates are read at the same immutable trusted base', async () => { const result = await run({ template: '.github/report.md' }); assert.equal(result.inputs[0].templates['.github/report.md'], 'Changed: {{ totals.lines.changed }}'); assert.ok(result.requests.some(request => request.path.includes(`/blob/${comparison.base}/.github/report.md`))); });
  await check('Template traversal never becomes a provider request', async () => { const result = await run({ template: '../credentials' }); assert.equal(Object.keys(result.inputs[0].templates).length, 0); assert.ok(!result.requests.some(request => request.path.includes('credentials'))); });
  await check('HTML authentication response cannot be parsed as a zero-line diff', async () => { const result = await run({ htmlDiff: true }); assert.equal(result.error.code, 'PUBLIC_UNAVAILABLE'); assert.equal(result.inputs.length, 0); });
  await check('Oversized diff is stopped at the acquisition limit rather than persisted', async () => { const result = await run({ oversize: true }); assert.equal(result.inputs.length, 0); assert.equal(result.error.code, 'PUBLIC_UNAVAILABLE'); });
  await check('Cancellation prevents a report submission', async () => { const result = await run({ aborted: true }); assert.equal(result.inputs.length, 0); assert.equal(result.ok, false); });
  await check('Independently observed empty comparison forwards an empty diff, not an error page', async () => { const result = await run({ empty: true }); assert.equal(result.ok, true); assert.equal(result.inputs[0].comparison.changedFiles, 0); assert.equal(result.inputs[0].acquisition.text, ''); });
} catch { process.exitCode = 1; }
finally { await browser.close(); receipt.passed = receipt.checks.filter(check => check.passed).length; receipt.failed = receipt.checks.length - receipt.passed; await writeFile(join(out, 'acquisition-receipt.json'), JSON.stringify(receipt, null, 2) + '\n'); console.log(JSON.stringify(receipt, null, 2)); }
