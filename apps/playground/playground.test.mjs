// SPDX-License-Identifier: AGPL-3.0-only

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import { DiffdevilError, GitHubClient } from '../../dist/lib/index.js';
import { FakeGitHub } from '../../src/diffdevil/tests/helpers/github.mjs';
import { analyzePublicPullRequest, parsePublicPullRequestUrl, projectPlaygroundReport } from './app.mjs';
import { createPlaygroundServer } from './server.mjs';
import { createPlaygroundWorker } from './worker.mjs';

const PUBLIC_URL = 'https://github.com/example/repository/pull/42';
const client = fake => new GitHubClient({ fetch: fake.fetch, readRetries: 0 });
const responseSchema = JSON.parse(readFileSync('apps/playground/contracts/response-v1.schema.json', 'utf8'));
const reportSchema = JSON.parse(readFileSync('src/diffdevil/contracts/schemas/report-v1.schema.json', 'utf8'));
const valuesSchema = JSON.parse(readFileSync('src/diffdevil/contracts/detail/v1/values.schema.json', 'utf8'));
const ajv = new Ajv2020({ strict: true, strictTypes: false, strictRequired: false, allErrors: true });
ajv.addSchema(valuesSchema);
ajv.addSchema(reportSchema);
const validateResponse = ajv.compile(responseSchema);
const assertResponse = value => assert.equal(validateResponse(value), true, ajv.errorsText(validateResponse.errors));
const envelope = { kind: 'diffdevil.playground-response', schemaVersion: '1.0' };

test('playground accepts one canonical public GitHub pull-request URL', () => {
  assert.deepEqual(parsePublicPullRequestUrl(`${PUBLIC_URL}?diff=split#discussion_r1`), {
    ok: true,
    target: { repository: 'example/repository', pullRequest: 42 },
    canonicalUrl: PUBLIC_URL
  });
  for (const value of [
    'http://github.com/example/repository/pull/42',
    'https://api.github.com/example/repository/pull/42',
    'https://github.com/example/repository/issues/42',
    'https://github.com/example/repository/pull/0',
    'https://github.com/example/repository/pull/42/files/extra'
  ]) assert.equal(parsePublicPullRequestUrl(value).ok, false, value);
});

test('playground projection is the real GitHub analysis with a bounded file payload', async () => {
  const fake = new FakeGitHub();
  const result = await analyzePublicPullRequest(PUBLIC_URL, { client: client(fake), maximumFiles: 1 });
  assert.equal(result.ok, true);
  assert.equal(result.analysis.totals.lines.changed.value, 3);
  assert.equal(result.analysis.totals.raw.churn.value, 6);
  assert.equal(result.analysis.source.repository, 'example/repository');
  assert.equal(result.analysis.files.length, 1);
  assert.equal(result.analysis.filesOmitted, 0);
  assert.equal(fake.writes().length, 0);
});

test('playground projection reports omitted file records without changing file-set truth', () => {
  const file = index => ({
    id: String(index), path: `src/${index}.ts`, changeType: 'modified', kind: 'text', included: true,
    raw: { added: { status: 'exact', value: 1 }, deleted: { status: 'exact', value: 1 }, churn: { status: 'exact', value: 2 } },
    lines: { added: { status: 'exact', value: 0 }, deleted: { status: 'exact', value: 0 }, modified: { status: 'exact', value: 1 }, changed: { status: 'exact', value: 1 } },
    measurement: { status: 'exact', reasons: [] }
  });
  const report = {
    kind: 'diffdevil.report', schemaVersion: '1.0', semantics: { language: 'diffdevil-expr/1', numbers: 'diffdevil-number/1', replacementLines: 'replacement-lines-v1', paths: 'diffdevil-glob/1' },
    source: { kind: 'github-api', comparisonId: 'comparison', repository: 'example/repository', pullRequest: 42 },
    measurement: { status: 'exact', reasons: [] },
    fileSet: { complete: true, total: { status: 'exact', value: 3 } },
    totals: { raw: file(0).raw, lines: file(0).lines, files: { changed: { status: 'exact', value: 3 } } },
    files: [file(1), file(2), file(3)]
  };
  const projected = projectPlaygroundReport(report, { maximumFiles: 2 });
  assert.equal(projected.files.length, 2);
  assert.equal(projected.filesOmitted, 1);
  assert.equal(projected.fileSet.total.value, 3);
});

test('playground hides unexpected engine diagnostics from the public response', async () => {
  const result = await analyzePublicPullRequest(PUBLIC_URL, {
    client: {
      async json() { throw new Error('sensitive internal detail'); }
    }
  });
  assert.deepEqual(result, {
    ...envelope,
    ok: false,
    status: 500,
    error: { code: 'E_INTERNAL', message: 'Analysis failed unexpectedly.' }
  });
  assertResponse(result);
});

test('playground reports unexpected request failures to the operator without exposing them', async t => {
  let observed;
  const server = createPlaygroundServer({
    analyze: async () => { throw new Error('sensitive server detail'); },
    onError: error => { observed = error; }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const address = server.address();
  assert.equal(typeof address, 'object');

  const response = await fetch(`http://127.0.0.1:${address.port}/api/analyze?url=${encodeURIComponent(PUBLIC_URL)}`);
  assert.equal(response.status, 500);
  const payload = await response.json();
  assert.deepEqual(payload, {
    ...envelope,
    ok: false,
    status: 500,
    error: { code: 'E_INTERNAL', message: 'Unexpected server failure.' }
  });
  assertResponse(payload);
  assert.ok(observed instanceof Error);
  assert.equal(observed.message, 'sensitive server detail');
});

test('playground serves the front door, health readback and read-only API', async t => {
  const fake = new FakeGitHub();
  const server = createPlaygroundServer({ clientFactory: () => client(fake) });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const address = server.address();
  assert.equal(typeof address, 'object');
  const base = `http://127.0.0.1:${address.port}`;

  const page = await fetch(base);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /The devil is in the diff\./u);
  assert.match(page.headers.get('content-security-policy'), /default-src 'none'/u);

  const health = await fetch(`${base}/health/ping`);
  assert.deepEqual(await health.json(), { status: 'ok', service: 'diffdevil-playground' });

  const analysis = await fetch(`${base}/api/analyze?url=${encodeURIComponent(PUBLIC_URL)}`);
  const payload = await analysis.json();
  assert.equal(analysis.status, 200);
  assert.equal(payload.analysis.totals.lines.changed.value, 3);
  assertResponse(payload);

  const wrongMethod = await fetch(`${base}/api/analyze`, { method: 'POST' });
  const wrongMethodPayload = await wrongMethod.json();
  assert.equal(wrongMethod.status, 405);
  assert.equal(wrongMethodPayload.status, 405);
  assertResponse(wrongMethodPayload);

  const missing = await fetch(`${base}/missing`);
  const missingPayload = await missing.json();
  assert.equal(missing.status, 404);
  assert.equal(missingPayload.status, 404);
  assertResponse(missingPayload);
  assert.equal(fake.writes().length, 0);
});

test('playground response schema rejects a broken projection and accepts public failures', async () => {
  const fake = new FakeGitHub();
  const success = await analyzePublicPullRequest(PUBLIC_URL, { client: client(fake) });
  assertResponse(success);
  const broken = structuredClone(success);
  delete broken.analysis.filesOmitted;
  assert.equal(validateResponse(broken), false);

  const failure = await analyzePublicPullRequest('not a pull-request URL');
  assertResponse(failure);
  assert.equal(failure.status, 400);
});

test('playground reports provider throttling as HTTP 429', async () => {
  const result = await analyzePublicPullRequest(PUBLIC_URL, {
    client: {
      async json() {
        throw new DiffdevilError({ code: 'E_GITHUB_RATE_LIMIT', phase: 'source', severity: 'error', message: 'GitHub rate limited the request.' });
      }
    }
  });
  assert.equal(result.status, 429);
  assert.equal(result.error.code, 'E_GITHUB_RATE_LIMIT');
  assertResponse(result);
});

test('playground evicts a failed static asset read so the next request can recover', async t => {
  let attempts = 0;
  const observed = [];
  const server = createPlaygroundServer({
    readAsset: async () => {
      attempts++;
      if (attempts === 1) throw new Error('transient asset read');
      return Buffer.from('recovered asset');
    },
    onError: error => observed.push(error)
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const address = server.address();
  assert.equal(typeof address, 'object');
  const base = `http://127.0.0.1:${address.port}`;

  const failed = await fetch(base);
  assert.equal(failed.status, 500);
  assertResponse(await failed.json());

  const recovered = await fetch(base);
  assert.equal(recovered.status, 200);
  assert.equal(await recovered.text(), 'recovered asset');
  assert.equal(attempts, 2);
  assert.equal(observed.length, 1);
});

test('Worker adapter serves the shared health/API contract and defers static content to assets', async () => {
  const fake = new FakeGitHub();
  const requestedAssets = [];
  const assets = {
    async fetch(request) {
      requestedAssets.push(new URL(request.url).pathname);
      return new Response('<!doctype html><title>diffdevil</title>', {
        headers: { 'content-type': 'text/html; charset=utf-8' }
      });
    }
  };
  const worker = createPlaygroundWorker({ clientFactory: () => client(fake) });

  const staticAsset = await worker.fetch(new Request('https://diffdevil-playground.wolfsblvt.workers.dev/'), { ASSETS: assets });
  assert.equal(staticAsset.status, 200);
  assert.deepEqual(requestedAssets, ['/']);

  const health = await worker.fetch(new Request('https://diffdevil-playground.wolfsblvt.workers.dev/health/ping'), { ASSETS: assets });
  assert.deepEqual(await health.json(), { status: 'ok', service: 'diffdevil-playground' });
  assert.match(health.headers.get('content-security-policy'), /default-src 'none'/u);

  const analysis = await worker.fetch(new Request(`https://diffdevil-playground.wolfsblvt.workers.dev/api/analyze?url=${encodeURIComponent(PUBLIC_URL)}`), { ASSETS: assets });
  assert.equal(analysis.status, 200);
  assertResponse(await analysis.json());

  const refusal = await worker.fetch(new Request('https://diffdevil-playground.wolfsblvt.workers.dev/api/analyze?url=https%3A%2F%2Fexample.com%2Fprivate'), { ASSETS: assets });
  assert.equal(refusal.status, 400);
  assertResponse(await refusal.json());
  assert.equal(fake.writes().length, 0);
});

test('Worker adapter returns the canonical internal failure envelope', async () => {
  const worker = createPlaygroundWorker({ analyze: async () => { throw new Error('sensitive worker detail'); } });
  const response = await worker.fetch(new Request('https://diffdevil-playground.wolfsblvt.workers.dev/api/analyze?url=https%3A%2F%2Fgithub.com%2Fexample%2Frepository%2Fpull%2F42'), {
    ASSETS: { fetch: async () => new Response('unused') }
  });
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), {
    ...envelope,
    ok: false,
    status: 500,
    error: { code: 'E_INTERNAL', message: 'Unexpected server failure.' }
  });
});
