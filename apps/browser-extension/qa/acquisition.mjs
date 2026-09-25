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
    const embeddedData = { ...comparison, ...(options.embeddedSummaries ? { embeddedSummaries: options.embeddedSummaries } : {}), ...(options.embeddedContents ? { embeddedContents: options.embeddedContents } : {}) };
    await page.setContent(options.changes ? githubChangesHtml(options.stale ? { ...embeddedData, base: 'd'.repeat(40) } : embeddedData) : githubHtml({ data: options.empty ? { ...comparison, changedFiles: 0, additions: 0, deletions: 0 } : comparison }));
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
      // GitHub's page_data/diff_entries route, in the shape observed on public #48: an array of
      // entries whose diffLines carry their prefix in `text`. Every line of the fixture patch is
      // returned so the engine can verify the entry against the summary counters.
      const entries = paths => paths.filter(path => diff.includes(`diff --git a/${path} `)).map(path => {
        const section = diff.split('diff --git ').find(part => part.startsWith(`a/${path} `)); const lines = section.split('\n').slice(4).filter(line => line !== '');
        const tooBig = (options.tooBig ?? []).includes(path);
        return { isBinary: false, isSubmodule: false, isTooBig: tooBig, diffLines: tooBig ? [] : lines.map((text, position) => ({ type: text.startsWith('@@') ? 'HUNK' : text.startsWith('+') ? 'ADDITION' : text.startsWith('-') ? 'DELETION' : 'CONTEXT', blobLineNumber: position, position, text, left: position, right: position, problems: [] })),
          linesAdded: lines.filter(line => line.startsWith('+')).length, linesDeleted: lines.filter(line => line.startsWith('-')).length, path, pathDigest: null, status: 'MODIFIED', truncatedReason: null, diffSize: '', reviewed: false };
      });
      window.fetch = async (path, init) => {
        window.fetches.push({ path, credentials: init.credentials, method: init.method ?? 'GET', headers: init.headers });
        if (init.signal.aborted) throw init.signal.reason;
        let body = ''; let status = 200; let type = 'text/html'; let url = `https://github.com${path}`;
        if (path.includes('/page_data/diff_entries?')) {
          const verified = init.headers?.['GitHub-Verified-Fetch'] === 'true' && init.headers?.Accept === 'application/json' && init.headers?.['X-Requested-With'] === 'XMLHttpRequest';
          if (!verified || options.routeRefused) { status = 406; body = ''; }
          else { type = 'application/json; charset=utf-8'; body = JSON.stringify(entries(new URL(url).searchParams.get('paths').split(',').map(decodeURIComponent))); }
        } else if (path.endsWith('.diff')) {
          // From a page context the diff route is a cross-origin redirect without CORS: the fetch itself fails.
          if (options.corsFail) throw new TypeError('Failed to fetch');
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
      const requestsBeforeVerify = window.fetches.length; let verified;
      if (result?.verify) { try { verified = await result.verify(); } catch (exception) { verified = { error: exception.code }; } }
      return { ok: Boolean(result), error, inputs: window.analysisInputs, requests: window.fetches, requestsBeforeVerify, verified, messages: window.transport };
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
  await check('Cache hit reattaches before any request, then confirms the same comparison with one fresh read', async () => { const result = await run({ cached: true, cachedPolicy: true }); assert.equal(result.ok, true); assert.equal(result.requestsBeforeVerify, 0); assert.equal(result.requests.length, 1); assert.equal(result.inputs[0].acquisition, undefined); assert.deepEqual(result.verified, { moved: false }); });
  await check('Cache hit on a moved React /changes head reports the confirmed comparison instead of a stale result', async () => { const result = await run({ changes: true, cached: true, cachedPolicy: true, moved: true }); assert.equal(result.ok, true); assert.equal(result.requestsBeforeVerify, 0); assert.equal(result.verified.moved, true); assert.equal(result.verified.observed.head, 'c'.repeat(40)); });
  await check('Signed-in /changes loads the files GitHub did not embed through its own page_data route and measures them exactly, without the anonymous API', async () => { const result = await run({ changes: true, corsFail: true }); assert.equal(result.ok, true); const acquisition = result.inputs[0].acquisition; assert.equal(acquisition.format, 'github-files'); assert.deepEqual(acquisition.files.map(file => file.filename), ['src/cache.ts', 'src/renderer.ts']); assert.equal(acquisition.files[0].status, 'modified'); assert.equal(acquisition.files[0].additions, 30); assert.ok(acquisition.files.every(file => typeof file.patch === 'string' && file.patch.startsWith('@@ ')), JSON.stringify(acquisition.files.map(file => file.patch?.slice(0, 20)))); assert.equal(acquisition.complete, true); assert.ok(!result.messages.includes('source.public')); const route = result.requests.filter(request => request.path.includes('/page_data/diff_entries?')); assert.equal(route.length, 1); assert.ok(route[0].path.includes(`&range=${comparison.head}`) && route[0].path.includes('paths=src%2Fcache.ts,src%2Frenderer.ts') && route[0].credentials === 'same-origin' && route[0].headers['GitHub-Verified-Fetch'] === 'true', JSON.stringify(route[0])); assert.ok(!result.requests.some(request => request.path.endsWith('/pull/42'))); });
  await check('A file GitHub reports too big stays honestly bounded while the rest measure exactly', async () => { const result = await run({ changes: true, corsFail: true, tooBig: ['src/renderer.ts'] }); assert.equal(result.ok, true); const files = result.inputs[0].acquisition.files; assert.ok(typeof files[0].patch === 'string'); assert.equal(files[1].patch, undefined); assert.equal(files[1].additions, 130); });
  await check('When the page_data route refuses, the embedded evidence stays and only then is the anonymous API asked', async () => { const result = await run({ changes: true, corsFail: true, routeRefused: true }); assert.equal(result.ok, true); const files = result.inputs[0].acquisition.files; assert.ok(files.every(file => file.patch === undefined)); assert.equal(files.length, 2); assert.ok(result.messages.includes('source.public')); });
  await check('Embedded content is never re-requested; only the missing files go through the route, in batches of at most eight', async () => { const contents = [{ pathDigest: null, path: 'src/cache.ts', diffLines: [{ type: 'HUNK', text: '@@ -1,3 +1,4 @@' }, { type: 'DELETION', text: '-old' }, { type: 'ADDITION', text: '+new' }, { type: 'CONTEXT', text: ' keep' }, { type: 'ADDITION', text: '+extra' }, { type: 'CONTEXT', text: ' tail' }] }]; const many = Array.from({ length: 11 }, (_, index) => [`src/extra-${index}.ts`, 1, 0, 'ADDED']); const result = await run({ changes: true, corsFail: true, embeddedSummaries: [['src/cache.ts', 2, 1, 'MODIFIED'], ['src/renderer.ts', 130, 96, 'MODIFIED'], ...many], embeddedContents: contents }); assert.equal(result.ok, true); const route = result.requests.filter(request => request.path.includes('/page_data/diff_entries?')); assert.equal(route.length, 2); assert.ok(route.every(request => !request.path.includes('src%2Fcache.ts'))); assert.ok(route.every(request => new URL(`https://github.com${request.path}`).searchParams.get('paths').split(',').length <= 8)); const files = result.inputs[0].acquisition.files; assert.ok(typeof files[0].patch === 'string' && typeof files[1].patch === 'string'); assert.ok(files.slice(2).every(file => file.patch === undefined)); });
  await check('Embedded diff lines become a patch, and a renamed file without embedded content still comes through the route', async () => { const contents = [{ pathDigest: null, path: 'src/cache.ts', diffLines: [{ type: 'HUNK', text: '@@ -1,3 +1,4 @@' }, { type: 'DELETION', text: 'old' }, { type: 'ADDITION', text: 'new' }, { type: 'CONTEXT', text: 'keep' }, { type: 'ADDITION', text: 'extra' }, { type: 'CONTEXT', text: 'tail' }] }]; const result = await run({ changes: true, corsFail: true, embeddedSummaries: [['src/cache.ts', 2, 1, 'MODIFIED'], ['src/renderer.ts', 130, 96, 'RENAMED', 'src/old.ts']], embeddedContents: contents }); assert.equal(result.ok, true); const files = result.inputs[0].acquisition.files; assert.equal(files[0].patch, '@@ -1,3 +1,4 @@\n-old\n+new\n keep\n+extra\n tail\n'); assert.ok(typeof files[1].patch === 'string', 'the renamed file without embedded content is loaded through the route'); assert.equal(files[1].status, 'renamed'); assert.equal(files[1].previous_filename, 'src/old.ts'); });
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
