// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Controller logic against fake Wrangler output, a fake Cloudflare API and, for the Worker
 * journey, the real Playground handler over the GitHub double. No credential, provider or
 * network effect is involved.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GitHubClient } from '../../dist/lib/index.js';
import { FakeGitHub } from '../../src/diffdevil/tests/helpers/github.mjs';
import { createPlaygroundWorker } from '../../apps/playground/worker.mjs';
import { admitSource } from './source.mjs';
import { compareTree, listTree } from './tree.mjs';
import { readback } from './readback.mjs';
import { activeVersion, qualificationChecks, replaySchema } from './playground.mjs';
import * as playground from './playground.mjs';
import * as family from './static-family.mjs';

const repository = fileURLToPath(new URL('../../', import.meta.url));
const SHA = 'a'.repeat(40);
const OLD = 'b'.repeat(40);
const id = digit => `${digit.repeat(8)}-${digit.repeat(4)}-${digit.repeat(4)}-${digit.repeat(4)}-${digit.repeat(12)}`;
const env = { CLOUDFLARE_API_TOKEN: 'test-token', CLOUDFLARE_ACCOUNT_ID: 'f'.repeat(32) };
const noSleep = async () => {};

/** Run `body` inside a scratch working directory; the controllers keep state relative to it. */
async function inScratch(body) {
  const directory = mkdtempSync(join(tmpdir(), 'diffdevil-controller-'));
  const previous = process.cwd();
  process.chdir(directory);
  try { return await body(directory); } finally { process.chdir(previous); rmSync(directory, { recursive: true, force: true }); }
}

const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });

test('source admission accepts only clean accepted main history and the exact requested commit', () => {
  const git = ({ head = SHA, main = SHA, ancestor = true, dirty = '' } = {}) => args => {
    if (args[0] === 'rev-parse') return args[1] === 'HEAD' ? head : main;
    if (args[0] === 'merge-base') { if (!ancestor) throw new Error('exit 1'); return ''; }
    if (args[0] === 'status') return dirty;
    throw new Error(`unexpected git ${args.join(' ')}`);
  };
  assert.deepEqual(admitSource({ git: git() }), { source: SHA, main: SHA, requested: null, current: true });
  assert.equal(admitSource({ git: git({ main: OLD }), requested: SHA }).current, false);
  assert.throws(() => admitSource({ git: git(), requested: 'main' }), /full 40-character/u);
  assert.throws(() => admitSource({ git: git(), requested: OLD }), /not the requested/u);
  assert.throws(() => admitSource({ git: git({ ancestor: false }) }), /not contained in accepted main/u);
  assert.throws(() => admitSource({ git: git({ dirty: ' M package.json' }) }), /not clean/u);
});

test('the receipt inventory detects missing, changed and unexpected upload bytes', () => inScratch(() => {
  mkdirSync('out/nested', { recursive: true });
  writeFileSync('out/a.txt', 'a');
  writeFileSync('out/nested/b.txt', 'b');
  const frozen = listTree('out');
  assert.deepEqual(frozen.map(file => file.path), ['a.txt', 'nested/b.txt']);
  assert.deepEqual(compareTree(frozen, listTree('out')), []);
  writeFileSync('out/a.txt', 'changed');
  writeFileSync('out/extra.txt', 'x');
  rmSync('out/nested/b.txt');
  assert.deepEqual(compareTree(frozen, listTree('out')).sort(), ['changed a.txt', 'missing nested/b.txt', 'unexpected extra.txt']);
}));

test('readback retries only settling checks and never keeps response bodies', async () => {
  let calls = 0;
  const fetch = async url => {
    calls += 1;
    if (url.endsWith('/settling')) return new Response(calls < 3 ? 'old cut' : `new cut ${SHA}`, { status: 200 });
    return new Response('secret legal body', { status: 404 });
  };
  const results = await readback([
    { name: 'settles', url: 'https://example.test/settling', settle: true, expect: { status: 200, contains: [SHA] } },
    { name: 'once', url: 'https://example.test/once', expect: { status: 200 } },
  ], { fetch, sleep: noSleep });
  assert.equal(results[0].ok, true);
  assert.equal(results[0].attempts, 3);
  assert.equal(results[1].ok, false);
  assert.equal(results[1].attempts, 1);
  assert.doesNotMatch(JSON.stringify(results), /secret legal body/u);
});

test('the active Worker version is one 100% version; a split deployment is refused', () => {
  assert.deepEqual(activeVersion([
    { id: 'older', created_on: '2026-10-01T00:00:00Z', versions: [{ version_id: id('1'), percentage: 100 }] },
    { id: 'newer', created_on: '2026-10-24T00:00:00Z', versions: [{ version_id: id('2'), percentage: 100 }] },
  ]), { deploymentId: 'newer', versionId: id('2'), createdOn: '2026-10-24T00:00:00Z' });
  assert.throws(() => activeVersion([{ id: 'split', created_on: 'x', versions: [{ version_id: id('1'), percentage: 50 }, { version_id: id('2'), percentage: 50 }] }]), /split deployment/u);
  assert.throws(() => activeVersion([]), /no deployment/u);
});

test('the Worker qualification journey passes against the real Playground handler', async () => {
  const PR = 'https://github.com/example/repository/pull/42';
  const fake = new FakeGitHub();
  const worker = createPlaygroundWorker({ clientFactory: () => new GitHubClient({ fetch: fake.fetch, readRetries: 0 }), onError: () => {} });
  const assets = { fetch: async () => new Response('<!doctype html><title>diffdevil playground</title>', { headers: { 'content-type': 'text/html; charset=utf-8' } }) };
  const fetch = (url, init) => worker.fetch(new Request(url, init), { ASSETS: assets });
  const results = await readback(qualificationChecks('https://candidate.example.workers.dev', replaySchema(repository), PR), { fetch, sleep: noSleep });
  assert.deepEqual(results.filter(result => !result.ok).map(result => `${result.name}: ${result.failures.join('; ')}`), []);
  assert.equal(fake.writes().length, 0);
});

test('the Worker qualification refuses a rate-limited or contract-breaking answer', async () => {
  const fetch = async url => url.includes('/api/') && url.includes('pull%2F')
    ? json({ kind: 'diffdevil.playground-response', schemaVersion: '1.0', ok: false, status: 429, error: { code: 'E_GITHUB_RATE_LIMIT', message: 'later' } }, 429)
    : url.endsWith('/health/ping') ? json({ status: 'ok' }) : new Response('<html>', { headers: { 'content-type': 'text/html' } });
  const results = await readback(qualificationChecks('https://candidate.example', replaySchema(repository)), { fetch, sleep: noSleep });
  const failed = results.filter(result => !result.ok).map(result => result.name);
  assert.deepEqual(failed, ['public-URL refusal', 'pull-request head', 'pull-request report']);
});

test('a Worker upload must return a version and a preview before anything is promoted', () => inScratch(async () => {
  const uploaded = preview => () => [{ type: 'version-upload', version_id: id('3'), preview_url: preview }];
  assert.throws(() => playground.upload({ source: SHA, run: uploaded(null) }), /no preview URL/u);
  assert.throws(() => playground.upload({ source: 'main', run: uploaded('https://x') }), /40-character/u);
  let args;
  const candidate = playground.upload({ source: SHA, run: given => { args = given; return uploaded('https://3333-diffdevil-playground.example.workers.dev/')(); } });
  assert.deepEqual(candidate, { source: SHA, versionId: id('3'), previewUrl: 'https://3333-diffdevil-playground.example.workers.dev' });
  assert.deepEqual(args.slice(0, 6), ['versions', 'upload', '--config', 'apps/playground/wrangler.jsonc', '--tag', `source-${SHA.slice(0, 8)}`]);
}));

test('promotion is confirmed by the provider, not by the CLI acknowledgement', () => inScratch(async () => {
  playground.upload({ source: SHA, run: () => [{ type: 'version-upload', version_id: id('3'), preview_url: 'https://p' }] });
  const deployments = active => async () => json({ success: true, result: { deployments: [{ id: 'd', created_on: 'now', versions: [{ version_id: active, percentage: 100 }] }] } });
  const run = () => [{ type: 'version-deploy', deployment_id: 'd' }];
  await assert.rejects(playground.promote({ run, env, fetch: deployments(id('1')) }), /is active instead of/u);
  assert.equal((await playground.promote({ run, env, fetch: deployments(id('3')) })).versionId, id('3'));
  await assert.rejects(playground.rollback({ version: 'latest', run, env, fetch: deployments(id('1')) }), /recorded Worker version ID/u);
}));

/** A fake Pages API holding canonical deployments; rollback moves the canonical pointer. */
function pages({ stage = 'success', commit = SHA } = {}) {
  const canonical = { 'diffdevil-docs': { id: id('1'), commit: OLD }, 'diffdevil-site': { id: id('2'), commit: OLD } };
  const deployments = {};
  const calls = [];
  const deployment = (project, depId) => ({ id: depId, url: `https://${depId.slice(0, 8)}.${project}.pages.dev`, environment: 'production',
    latest_stage: { name: 'deploy', status: stage }, deployment_trigger: { metadata: { commit_hash: deployments[depId]?.commit ?? commit } } });
  const fetch = async (url, init) => {
    const path = new URL(url).pathname.replace(/^.*\/pages\/projects\//u, '');
    calls.push(`${init.method} ${path}`);
    const [project, , depId, action] = path.split('/');
    if (action === 'rollback') {
      // Model the provider answering with a production copy of the recorded deployment.
      const copy = `9${depId.slice(1)}`;
      deployments[copy] = { commit: deployments[depId]?.commit ?? commit };
      canonical[project] = { id: copy, commit: deployments[copy].commit };
      return json({ success: true, result: deployment(project, copy) });
    }
    if (depId) return json({ success: true, result: deployment(project, depId) });
    const current = canonical[project];
    return json({ success: true, result: { canonical_deployment: { ...deployment(project, current.id), deployment_trigger: { metadata: { commit_hash: current.commit } } } } });
  };
  const upload = (project, depId) => {
    deployments[depId] = { commit };
    if (stage === 'success') canonical[project] = { id: depId, commit };
    return [{ type: 'pages-deploy-detailed', deployment_id: depId, environment: 'production', pages_project: project }];
  };
  return { fetch, upload, calls, canonical, deployments };
}

function freezePair(source = SHA) {
  for (const host of ['docs', 'site']) {
    mkdirSync(family.HOSTS[host].directory, { recursive: true });
    writeFileSync(join(family.HOSTS[host].directory, 'index.html'), `${host} ${source}`);
    writeFileSync(join(family.HOSTS[host].directory, 'robots.txt'), `robots ${host}`);
    mkdirSync(join(family.HOSTS[host].directory, 'pagefind'), { recursive: true });
    writeFileSync(join(family.HOSTS[host].directory, family.SEARCH_ENTRY), `{"index":"${source}"}`);
  }
  writeFileSync(join(family.HOSTS.site.directory, '_redirects'), '/docs/cli/ https://docs.diffdevil.dev/use/cli/ 308\n');
  writeFileSync(family.RECEIPT, JSON.stringify({ source, availability: { extension: 'coming', app: 'coming' },
    site: listTree(family.HOSTS.site.directory), docs: listTree(family.HOSTS.docs.directory) }));
}

test('the static family records the prior pair, then publishes manual first and site second', () => inScratch(async () => {
  freezePair();
  const api = pages();
  const options = { env, fetch: api.fetch, sleep: noSleep };
  const prior = await family.prior(options);
  assert.deepEqual([prior.docs.id, prior.site.id, prior.docs.commit], [id('1'), id('2'), OLD]);
  await assert.rejects(family.deploy({ host: 'site', source: SHA, run: () => api.upload('diffdevil-site', id('4')), ...options }), /only after the manual/u);
  let uploadArgs;
  const docs = await family.deploy({ host: 'docs', source: SHA, run: args => { uploadArgs = args; return api.upload('diffdevil-docs', id('3')); }, ...options });
  assert.deepEqual(uploadArgs.slice(0, 8), ['pages', 'deploy', 'artifacts/manual/dist', '--project-name', 'diffdevil-docs', '--branch', 'main', '--commit-hash']);
  assert.equal(docs.id, id('3'));
  const site = await family.deploy({ host: 'site', source: SHA, run: () => api.upload('diffdevil-site', id('4')), ...options });
  assert.equal(site.commit, SHA);
  const receipt = family.receipt({ run: 'https://github.com/Wolfsblvt/diffdevil/actions/runs/1' });
  assert.equal(receipt.source, SHA);
  assert.deepEqual([receipt.previous.docs.id, receipt.previous.site.id], [id('1'), id('2')]);
  assert.deepEqual([receipt.deployed.docs.id, receipt.deployed.site.id], [id('3'), id('4')]);
  assert.match(receipt.publication.sha256, /^[0-9a-f]{64}$/u);
  assert.doesNotMatch(JSON.stringify(receipt), /test-token/u);
}));

test('an upload is refused when its bytes or source drift from the frozen receipt', () => inScratch(async () => {
  freezePair();
  const api = pages();
  const options = { env, fetch: api.fetch, sleep: noSleep };
  writeFileSync(join(family.HOSTS.docs.directory, 'index.html'), 'rebuilt after freezing');
  await assert.rejects(family.deploy({ host: 'docs', source: SHA, run: () => assert.fail('must not upload'), ...options }), /no longer matches the frozen receipt: changed index.html/u);
  await assert.rejects(family.deploy({ host: 'docs', source: OLD, run: () => assert.fail('must not upload'), ...options }), /receipt is for/u);
}));

test('a deployment that never becomes production is reported, not assumed', () => inScratch(async () => {
  freezePair();
  const api = pages({ stage: 'failure' });
  await assert.rejects(family.deploy({ host: 'docs', source: SHA, run: () => api.upload('diffdevil-docs', id('3')), env, fetch: api.fetch, sleep: noSleep }), /ended at deploy:failure/u);
}));

test('rollback restores a recorded pair manual first and checks each target first', () => inScratch(async () => {
  const api = pages();
  const options = { env, fetch: api.fetch, sleep: noSleep };
  await assert.rejects(family.rollback({ targets: { docs: id('5') }, ...options }), /both --docs and --site/u);
  await family.rollback({ targets: { docs: id('5'), site: id('6') }, ...options });
  const posts = api.calls.filter(call => call.startsWith('POST'));
  assert.deepEqual(posts, [`POST diffdevil-docs/deployments/${id('5')}/rollback`, `POST diffdevil-site/deployments/${id('6')}/rollback`]);
  const restored = ['docs', 'site'].map(host => JSON.parse(readFileSync(`artifacts/publication/website/deploy-${host}.json`, 'utf8')));
  assert.deepEqual(restored.map(item => [item.restoredFrom, item.id, item.rollback]), [[id('5'), api.canonical['diffdevil-docs'].id, true], [id('6'), api.canonical['diffdevil-site'].id, true]]);
  assert.equal(family.receipt().deployed.site.restoredFrom, id('6'));
}));

test('public readback proves the new cut through the custom domains and compares served bytes', () => inScratch(async () => {
  freezePair();
  const api = pages();
  const options = { env, fetch: api.fetch, sleep: noSleep };
  await family.deploy({ host: 'docs', source: SHA, run: () => api.upload('diffdevil-docs', id('3')), ...options });
  await family.deploy({ host: 'site', source: SHA, run: () => api.upload('diffdevil-site', id('4')), ...options });
  let searchEntry = `{"index":"${SHA}"}`;
  const served = async (url, init) => {
    const { origin, pathname, search } = new URL(url);
    if (origin === family.COMPATIBILITY) return new Response(null, { status: 308, headers: { location: `${family.HOSTS.site.origin}${pathname}${search}` } });
    if (pathname === '/robots.txt') return new Response('User-agent: *');
    if (pathname === `/${family.SEARCH_ENTRY}`) return new Response(searchEntry, { headers: { 'content-type': 'application/json' } });
    if (pathname === '/docs/cli/') return new Response(null, { status: 308, headers: { location: 'https://docs.diffdevil.dev/use/cli/' } });
    if (origin === family.PLAYGROUND_API) return json({ status: 'ok' }, 200);
    const legal = ['/impressum/', '/privacy/', '/terms/'].includes(pathname);
    const headers = { 'content-type': 'text/html; charset=utf-8', ...(legal ? { 'x-robots-tag': 'noindex, nosnippet' } : {}) };
    return new Response(`<html>${SHA}</html>`, { headers });
  };
  const withCors = async (url, init) => {
    const response = await served(url, init);
    if (url.startsWith(family.PLAYGROUND_API)) response.headers.set('access-control-allow-origin', '*');
    return response;
  };
  const results = await family.readPublic({ fetch: withCors, sleep: noSleep });
  assert.deepEqual(results.filter(result => !result.ok).map(result => `${result.name}: ${result.failures.join('; ')}`), []);
  assert.ok(results.some(result => result.name === 'moved legacy apex URL'));
  searchEntry = '{"index":"previous cut"}';
  const drifted = await family.readPublic({ fetch: withCors, sleep: noSleep }).catch(error => error);
  assert.match(drifted.message, /Public readback failed/u);
  assert.deepEqual(JSON.parse(readFileSync('artifacts/publication/website/readback.json', 'utf8')).results.filter(result => !result.ok).map(result => result.name), ['docs search index', 'site search index']);
  searchEntry = `{"index":"${SHA}"}`;
  const stale = await family.readPublic({ fetch: async (url, init) => url.endsWith('/source/') ? new Response('<html>old cut</html>', { headers: { 'content-type': 'text/html' } }) : withCors(url, init), sleep: noSleep }).catch(error => error);
  assert.match(stale.message, /Public readback failed/u);
  assert.equal(JSON.parse(readFileSync('artifacts/publication/website/readback.json', 'utf8')).results[0].attempts, 10);
}));
