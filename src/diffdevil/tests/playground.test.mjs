import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { GitHubClient } from '../../../dist/lib/github/client.js';
import { FakeGitHub } from './helpers/github.mjs';
import { analyzePublicPullRequest, createPlaygroundServer, parsePublicPullRequestUrl, projectPlaygroundReport } from '../../../apps/playground/server.mjs';

const PUBLIC_URL = 'https://github.com/example/repository/pull/42';
const client = fake => new GitHubClient({ fetch: fake.fetch, readRetries: 0 });

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
    ok: false,
    status: 500,
    error: { code: 'E_INTERNAL', message: 'Analysis failed unexpectedly.' }
  });
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
  assert.deepEqual(await response.json(), {
    ok: false,
    error: { code: 'E_INTERNAL', message: 'Unexpected server failure.' }
  });
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
  assert.equal(fake.writes().length, 0);
});
