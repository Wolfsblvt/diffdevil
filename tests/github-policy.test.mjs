import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GitHubClient } from '../dist/lib/github/client.js';
import { loadGitHubPolicy } from '../dist/lib/github/policy.js';
import { analyzeGitHub } from '../dist/lib/github/source.js';
import { evaluatePolicy } from '../dist/lib/policy/evaluate.js';
import { createPlan } from '../dist/lib/policy/plan.js';
import { unwrap } from '../dist/lib/errors.js';
import { runCli } from '../dist/lib/cli/run.js';
import { FakeGitHub, TARGET, BASE } from './helpers/github.mjs';
const config = 'version: 1\npresets: []\nmetrics:\n  score:\n    formula: totals.lines.deleted + 2 * totals.lines.modified\nrules:\n  large:\n    when: metrics.score > 3\n    effects:\n      comment:\n        mode: upsert\n        templateFile: comments/result.md\n';

test('trusted GitHub policy and templates are loaded at the same immutable base ref', async () => {
  const fake = new FakeGitHub();
  fake.contents.set(`${BASE}:.github/policy.yml`, config);
  fake.contents.set(`${BASE}:.github/comments/result.md`, 'Score: {{ metrics.score }}');
  const client = new GitHubClient({ fetch: fake.fetch, readRetries: 0 });
  const policy = unwrap(await loadGitHubPolicy(client, { repository: TARGET.repository, ref: BASE, path: '.github/policy.yml' }));
  const report = unwrap(await analyzeGitHub(client, TARGET));
  const plan = unwrap(createPlan(unwrap(evaluatePolicy(policy, report)), TARGET));
  assert.equal(plan.operations[0].body, 'Score: 6');
  assert.equal(fake.calls.filter(c => c.path.includes('/contents/')).every(c => c.query === `?ref=${BASE}`), true);
  assert.equal(fake.writes().length, 0);
});
test('trusted GitHub policy refuses floating refs, symlinks and escaping template paths', async () => {
  const fake = new FakeGitHub(), client = new GitHubClient({ fetch: fake.fetch, readRetries: 0 });
  assert.equal((await loadGitHubPolicy(client, { repository: TARGET.repository, ref: 'main', path: 'policy.yml' })).ok, false);
  assert.equal(fake.calls.length, 0);
  fake.contents.set(`${BASE}:policy.yml`, { type: 'symlink', target: 'elsewhere', encoding: 'base64', content: '', size: 0 });
  assert.equal((await loadGitHubPolicy(client, { repository: TARGET.repository, ref: BASE, path: 'policy.yml' })).ok, false);
  fake.contents.set(`${BASE}:policy.yml`, config.replace('comments/result.md', '../outside.md'));
  const result = await loadGitHubPolicy(client, { repository: TARGET.repository, ref: BASE, path: 'policy.yml' });
  assert.equal(result.ok, false); assert.equal(fake.calls.some(c => c.path.includes('outside')), false);
});
test('GitHub API-backed CLI queries and checks use ordinary detail and machine-clean output', async () => {
  const fake = new FakeGitHub(), host = { githubClient: new GitHubClient({ fetch: fake.fetch }) };
  const query = unwrap(await runCli(['query', '--repo', TARGET.repository, '--pr', '42', '--no-config', '--expr', 'totals.lines.changed', '--format', 'value'], process.cwd(), host));
  assert.deepEqual(query, { stdout: '3\n', exitCode: 0 });
  const check = unwrap(await runCli(['check', '--repo', TARGET.repository, '--pr', '42', '--no-config', '--expr', 'totals.lines.changed > 3'], process.cwd(), host));
  assert.equal(check.exitCode, 1); assert.equal(check.stdout, '');
  assert.equal(fake.writes().length, 0);
});
