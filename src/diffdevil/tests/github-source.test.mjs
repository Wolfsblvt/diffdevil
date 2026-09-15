import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GitHubClient } from '../../../dist/lib/github/client.js';
import { analyzeGitHub } from '../../../dist/lib/github/source.js';
import { unwrap } from '../../../dist/lib/errors.js';
import { FakeGitHub, TARGET, PATCH, HEAD, json } from './helpers/github.mjs';
const client = fake => new GitHubClient({ fetch: fake.fetch, readRetries: 0 });

test('GitHub source parses real patch fragments and verifies both revisions', async () => {
  const fake = new FakeGitHub(), report = unwrap(await analyzeGitHub(client(fake), TARGET));
  assert.equal(report.totals.lines.changed.value, 3);
  assert.equal(report.totals.raw.churn.value, 6);
  assert.equal(report.source.head, HEAD); assert.equal(report.source.kind, 'github-api');
  assert.equal(report.fileSet.complete, true); assert.equal(fake.writes().length, 0);
  assert.equal(fake.calls.filter(call => call.path.endsWith('/pulls/42')).length, 2);
});
test('GitHub source paginates over one hundred files and preserves rename path policy', async () => {
  const fake = new FakeGitHub();
  fake.files = Array.from({ length: 102 }, (_, i) => ({ ...fake.files[0], filename: `src/${i}.ts` }));
  fake.files.push({ ...fake.files[0], filename: 'generated/moved.ts', previous_filename: 'src/old.ts', status: 'renamed' });
  const report = unwrap(await analyzeGitHub(client(fake), TARGET, { paths: { exclude: ['generated/**'] } }));
  assert.equal(report.files.length, 103); assert.equal(report.files.find(f => f.path === 'generated/moved.ts').included, true);
  assert.equal(report.totals.lines.changed.value, 309);
});
test('GitHub source marks the 3000-file ceiling as incomplete without inventing missing identities', async () => {
  const fake = new FakeGitHub();
  fake.files = Array.from({ length: 3001 }, (_, i) => ({ ...fake.files[0], filename: `src/${i}.ts` }));
  const report = unwrap(await analyzeGitHub(client(fake), TARGET));
  assert.equal(report.files.length, 3000); assert.equal(report.fileSet.complete, false);
  assert.equal(report.fileSet.total.value, 3001); assert.equal(report.totals.lines.changed.status, 'unknown');
  assert.equal(report.totals.lines.changed.lower, 9000);
});
test('GitHub source bounds omitted, malformed, and inconsistent text patches from raw statistics', async () => {
  const fake = new FakeGitHub();
  fake.files = [undefined, '@@ broken', PATCH].map((patch, i) => ({ filename: `src/${i}.ts`, status: 'modified', additions: 60, deletions: 10, changes: 70, ...(patch === undefined ? {} : { patch }) }));
  const report = unwrap(await analyzeGitHub(client(fake), TARGET));
  assert.deepEqual([report.totals.lines.changed.status, report.totals.lines.changed.lower, report.totals.lines.changed.upper], ['bounded', 180, 210]);
});
test('GitHub source refines pure renames, binary files and submodules with controlled raw-diff evidence', async () => {
  const fake = new FakeGitHub();
  fake.files = [
    { filename: 'new.txt', previous_filename: 'old.txt', status: 'renamed', additions: 0, deletions: 0 },
    { filename: 'image.png', status: 'modified', additions: 0, deletions: 0 },
    { filename: 'vendor', status: 'modified', additions: 1, deletions: 1, patch: `@@ -1 +1 @@\n-Subproject commit ${'c'.repeat(40)}\n+Subproject commit ${'d'.repeat(40)}` }
  ];
  fake.rawDiff = `diff --git a/old.txt b/new.txt\nsimilarity index 100%\nrename from old.txt\nrename to new.txt\ndiff --git a/image.png b/image.png\nindex cccccc1..dddddd2 100644\nBinary files a/image.png and b/image.png differ\ndiff --git a/vendor b/vendor\nindex cccccc1..dddddd2 160000\n--- a/vendor\n+++ b/vendor\n${fake.files[2].patch}\n`;
  const report = unwrap(await analyzeGitHub(client(fake), TARGET));
  assert.equal(report.files.find(f => f.path === 'new.txt').lines.changed.value, 0);
  assert.equal(report.files.find(f => f.path === 'image.png').kind, 'binary');
  assert.equal(report.files.find(f => f.path === 'vendor').kind, 'submodule');
  assert.equal(report.totals.lines.changed.status, 'unmeasurable');
});
test('GitHub source retains unknown material when optional refinement is denied', async () => {
  const fake = new FakeGitHub(); fake.files = [{ filename: 'file', status: 'modified', additions: 0, deletions: 0 }];
  fake.before = call => call.accept === 'application/vnd.github.diff' ? json({}, 403) : undefined;
  const report = unwrap(await analyzeGitHub(client(fake), TARGET));
  assert.equal(report.files[0].kind, 'unknown'); assert.equal(report.totals.lines.changed.status, 'unknown');
});
test('GitHub source rejects changing heads and bases rather than combining snapshots', async () => {
  for (const field of ['head', 'base']) {
    const fake = new FakeGitHub();
    fake.before = (call, state) => { if (call.path.endsWith('/files')) state[field] = 'd'.repeat(40); };
    const result = await analyzeGitHub(client(fake), TARGET);
    assert.equal(result.ok, false); assert.equal(result.diagnostics[0].code, 'E_SOURCE_STALE');
  }
});
test('GitHub source rejects duplicate paths and invalid provider counters', async () => {
  for (const mutate of [f => { f.files.push(f.files[0]); }, f => { f.files[0].changes = 7; }, f => { f.files[0].additions = 0.5; }]) {
    const fake = new FakeGitHub(); mutate(fake);
    assert.equal((await analyzeGitHub(client(fake), TARGET)).ok, false);
  }
});
