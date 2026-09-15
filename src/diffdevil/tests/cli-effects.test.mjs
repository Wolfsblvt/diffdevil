import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { runCli } from '../../../dist/lib/cli/run.js';
import { GitHubClient } from '../../../dist/lib/github/client.js';
import { compilePolicy } from '../../../dist/lib/policy/compile.js';
import { evaluatePolicy } from '../../../dist/lib/policy/evaluate.js';
import { createPlan } from '../../../dist/lib/policy/plan.js';
import { analyzeGitHub } from '../../../dist/lib/github/source.js';
import { unwrap } from '../../../dist/lib/errors.js';
import { FakeGitHub, TARGET, BASE, HEAD, json } from './helpers/github.mjs';
const policy = 'version: 1\npresets: []\nrules:\n  match:\n    when: totals.lines.changed > 2\n    effects:\n      labels:\n        add: [review/example]\n        removeWhenFalse: true\nlabelDefinitions:\n  review/example:\n    color: abcdef\n    description: Example\n';
const setup = () => { const fake = new FakeGitHub(); return { fake, host: { githubClient: new GitHubClient({ fetch: fake.fetch, readRetries: 0 }) } }; };
const target = ['--repo', TARGET.repository, '--pr', '42'];
const effect = async (host, args, cwd) => unwrap(await runCli([...args, '--format', 'json'], cwd, host));

test('CLI apply loads base policy and never discovers workspace policy implicitly', async t => {
  const { fake, host } = setup();
  const cwd = await mkdtemp(join(tmpdir(), 'diffdevil-cli-apply-')); t.after(() => rm(cwd, { recursive: true, force: true }));
  await writeFile(join(cwd, '.diffdevil.yml'), 'not: valid policy');
  fake.contents.set(`${BASE}:policy.yml`, policy);
  fake.contents.set(`${HEAD}:policy.yml`, policy.replace('review/example','head/injected'));
  const result = await effect(host, ['apply', ...target, '--config', 'policy.yml'], cwd);
  assert.equal(result.exitCode, 0); assert.equal(JSON.parse(result.stdout).status, 'verified');
  assert.deepEqual([...fake.labels], ['review/example']);
  assert.equal(fake.calls.filter(c => c.path.includes('/contents/')).every(c => c.query === `?ref=${BASE}`), true);
  const noConfig = setup();
  assert.equal((await effect(noConfig.host, ['apply', ...target], cwd)).exitCode, 0);
  assert.deepEqual([...noConfig.fake.labels], ['size/XS']);
});

test('explicit workspace policy and typed parameters share CLI compiler and effects semantics', async t => {
  const { fake, host } = setup();
  const cwd = await mkdtemp(join(tmpdir(), 'diffdevil-cli-policy-')); t.after(() => rm(cwd, { recursive: true, force: true }));
  const configured = policy.replace('rules:', 'parameters:\n  limit:\n    type: integer\n    required: true\nrules:').replace('> 2', '> params.limit');
  await writeFile(join(cwd, 'policy.yml'), configured);
  const args = ['apply', ...target, '--config', 'policy.yml', '--policy-source', 'workspace'];
  const no = await effect(host, [...args, '--param', 'limit=10'], cwd);
  assert.equal(no.exitCode, 0); assert.equal(fake.labels.size, 0);
  const yes = await effect(host, [...args, '--param', 'limit=1'], cwd);
  assert.equal(yes.exitCode, 0); assert.deepEqual([...fake.labels], ['review/example']);
  assert.equal(fake.calls.some(c => c.path.includes('/contents/')), false);
});

test('labels verify is read-only and drift exits 1; labels apply uses the same definition reconciler', async () => {
  const { fake, host } = setup();
  fake.before = call => {
    if (call.path === '/repos/example/repository') return json({ default_branch: 'main' });
    if (call.path === '/repos/example/repository/commits/main') return json({ sha: BASE });
  };
  fake.contents.set(`${BASE}:policy.yml`, policy);
  const args = ['--repo', TARGET.repository, '--config', 'policy.yml'];
  const drift = await effect(host, ['labels', 'verify', ...args]);
  assert.equal(drift.exitCode, 1); assert.equal(fake.writes().length, 0);
  const changed = await effect(host, ['labels', 'apply', ...args]);
  assert.equal(changed.exitCode, 0); assert.equal(JSON.parse(changed.stdout).changed, 1);
  const verified = await effect(host, ['labels', 'verify', ...args]);
  assert.equal(verified.exitCode, 0); assert.equal(fake.labels.size, 0); assert.equal(fake.calls.some(c => c.path.includes('/pulls/')), false);
});

test('saved CLI plan derives its target but revalidates policy and current evidence', async t => {
  const { fake, host } = setup();
  const cwd = await mkdtemp(join(tmpdir(), 'diffdevil-cli-plan-')); t.after(() => rm(cwd, { recursive: true, force: true }));
  const compiled = unwrap(compilePolicy({ version: 1 }));
  const report = unwrap(await analyzeGitHub(host.githubClient, TARGET));
  const plan = unwrap(createPlan(unwrap(evaluatePolicy(compiled, report)), TARGET, { definitions: 'ensure' }));
  await writeFile(join(cwd, 'plan.json'), JSON.stringify(plan));
  const applied = await effect(host, ['apply', '--plan', 'plan.json'], cwd);
  assert.equal(applied.exitCode, 0); assert.deepEqual([...fake.labels], ['size/XS']);
  const count = fake.writes().length;
  fake.head = 'd'.repeat(40);
  const stale = await runCli(['apply', '--plan', 'plan.json'], cwd, host);
  assert.equal(stale.ok, false); assert.equal(stale.diagnostics[0].code, 'E_PLAN_STALE');
  assert.equal(fake.writes().length, count);
});

test('all invalid write flags and formats fail before any provider request', async () => {
  for (const args of [
    ['apply', ...target, '--format', 'lines'], ['apply', ...target, '--stdin'],
    ['apply', ...target, '--trust-report'], ['apply', ...target, '--comment-author-id', '22'],
    ['apply', ...target, '--expr', 'true'], ['apply', ...target, '--definitions', 'banana'],
    ['labels','verify','--repo',TARGET.repository,'--definitions','sync'],
    ['labels','apply','--repo',TARGET.repository,'--pr','42'], ['apply'],
  ]) {
    const { fake, host } = setup(); const result = await runCli(args, undefined, host);
    assert.equal(result.ok, false, args.join(' ')); assert.equal(fake.calls.length, 0, args.join(' '));
  }
});

test('CLI incomplete application preserves the observed operation journal and exits 2', async () => {
  const { fake, host } = setup();
  fake.before = call => call.method === 'POST' && call.path.endsWith('/issues/42/labels') ? json({ message: 'denied' }, 403) : undefined;
  const result = await effect(host, ['apply', ...target]);
  const data = JSON.parse(result.stdout);
  assert.equal(result.exitCode, 2); assert.equal(data.status, 'incomplete');
  assert.equal(data.observations.some(o => o.outcome === 'changed'), true);
  assert.equal(data.observations.some(o => o.readback === 'failed'), true);
});

test('CLI expanded YAML is ordinary reusable policy and metric catalog remains discoverable', async () => {
  const explained = unwrap(await runCli(['explain', '--policy', '--no-config', '--format', 'yaml']));
  const value = parseYaml(explained.stdout);
  assert.equal(compilePolicy(value).ok, true);
  const catalog = unwrap(await runCli(['schema', '--kind', 'metrics']));
  assert.equal(JSON.parse(catalog.stdout).aliases.changed, 'lines.changed');
});

test('require-resolved emits a held plan with exit 3 and preserves unknown evidence', async t => {
  const cwd = await mkdtemp(join(tmpdir(), 'diffdevil-cli-held-')); t.after(() => rm(cwd, { recursive: true, force: true }));
  await writeFile(join(cwd, 'policy.yml'), policy.replace('> 2','> 65'));
  const args = ['plan', '--report', join(process.cwd(), 'docs/examples/reports/bounded.json'), '--config', 'policy.yml', '--target-repo', TARGET.repository, '--target-pr', '42', '--require-resolved', '--format', 'json'];
  const result = unwrap(await runCli(args, cwd));
  assert.equal(result.exitCode, 3); assert.equal(JSON.parse(result.stdout).held.length, 1);
});


test('CLI label synchronization rejects a base-policy revision that moves before writes', async () => {
  const { fake, host } = setup();
  fake.contents.set(`${BASE}:policy.yml`, policy);
  fake.before = (call, state) => {
    if (call.method === 'GET' && call.path.endsWith('/labels')) state.defaultBranch = 'e'.repeat(40);
  };
  const result = await effect(host, ['labels', 'apply', '--repo', TARGET.repository, '--config', 'policy.yml']);
  assert.equal(result.exitCode, 2);
  assert.equal(JSON.parse(result.stdout).diagnostics[0].code, 'E_POLICY_STALE');
  assert.equal(fake.writes().length, 0);
});
