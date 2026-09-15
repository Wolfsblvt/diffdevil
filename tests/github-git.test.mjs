import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, access } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { analyzeGit } from '../dist/lib/sources/git.js';
import { analyzeGitHubGit } from '../dist/lib/github/source.js';
import { GitHubClient } from '../dist/lib/github/client.js';
import { applyGitHubPolicy } from '../dist/lib/github/apply.js';
import { compilePolicy } from '../dist/lib/policy/compile.js';
import { evaluatePolicy } from '../dist/lib/policy/evaluate.js';
import { createPlan, readPlan } from '../dist/lib/policy/plan.js';
import { unwrap } from '../dist/lib/errors.js';
import { FakeGitHub, TARGET, BASE } from './helpers/github.mjs';

async function repository(t) {
  const cwd = await mkdtemp(join(tmpdir(), 'diffdevil Git source '));
  t.after(() => rm(cwd, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git('init', '-b', 'main'); git('config', 'user.name', 'Fixture'); git('config', 'user.email', 'fixture@example.invalid');
  await writeFile(join(cwd, 'file.txt'), 'one\ntwo\nthree\n'); git('add', '.'); git('commit', '-m', 'base');
  return { cwd, git, base: git('rev-parse', 'HEAD') };
}

test('Git data acquisition disables executable clean filters and filesystem monitors', async t => {
  const { cwd, git } = await repository(t), marker = join(cwd, 'filter-ran');
  const script = join(cwd, 'filter.mjs');
  await writeFile(script, `import {writeFileSync,readFileSync} from 'node:fs';writeFileSync(${JSON.stringify(marker)},'ran');process.stdout.write(readFileSync(0));`);
  const command = `${JSON.stringify(process.execPath.replaceAll('\\', '/'))} ${JSON.stringify(script.replaceAll('\\', '/'))}`;
  git('config', 'filter.probe.clean', command); git('config', 'filter.probe.required', 'true');
  await writeFile(join(cwd, '.gitattributes'), '*.txt filter=probe\n');
  await writeFile(join(cwd, 'file.txt'), 'ONE\ntwo\nthree\n');
  git('diff', '--no-ext-diff', '--no-textconv', 'HEAD', '--');
  await access(marker); // Native Git demonstrates the otherwise hidden executable path.
  await rm(marker);
  git('config', 'core.fsmonitor', 'THIS_MONITOR_MUST_NOT_EXECUTE');
  const report = unwrap(await analyzeGit({ cwd }));
  assert.equal(report.totals.lines.changed.value, 1);
  await assert.rejects(access(marker), { code: 'ENOENT' });
});

test('PR-bound local Git uses the merge base while retaining the current provider base tip', async t => {
  const { cwd, git, base: mergeBase } = await repository(t);
  git('checkout', '-b', 'feature');
  await writeFile(join(cwd, 'file.txt'), 'ONE\ntwo\nthree\n'); git('commit', '-am', 'feature change');
  const head = git('rev-parse', 'HEAD');
  git('checkout', 'main'); await writeFile(join(cwd, 'base-only.txt'), 'base branch content\n'); git('add', '.'); git('commit', '-m', 'base advanced');
  const fake = new FakeGitHub(); fake.base = git('rev-parse', 'HEAD'); fake.head = head;
  const client = new GitHubClient({ fetch: fake.fetch, readRetries: 0 });
  const report = unwrap(await analyzeGitHubGit(client, TARGET, { cwd }));
  assert.equal(report.source.kind, 'git'); assert.equal(report.source.base, mergeBase); assert.equal(report.source.baseTip, fake.base);
  assert.equal(report.totals.lines.changed.value, 1); assert.equal(report.files.some(f => f.path === 'base-only.txt'), false);
  const applied = unwrap(await applyGitHubPolicy(client, TARGET, unwrap(compilePolicy()), { localGit: { cwd } }));
  assert.equal(applied.status, 'verified'); assert.ok(fake.labels.has('size/XS'));
  assert.equal(fake.calls.some(call => call.path.endsWith('/files')), false);
  const plan = unwrap(readPlan(applied.plan)); assert.equal(plan.source.baseTip, fake.base);
});

test('a base-loaded policy cannot be applied after the provider base moved', async () => {
  const fake = new FakeGitHub(); fake.base = 'c'.repeat(40);
  const result = await applyGitHubPolicy(new GitHubClient({ fetch: fake.fetch }), TARGET, unwrap(compilePolicy()), { expectedPolicyBase: BASE });
  assert.equal(result.ok, false); assert.equal(result.diagnostics[0].code, 'E_POLICY_STALE'); assert.equal(fake.writes().length, 0);
});

test('rule selection narrows effects and definitions without changing policy identity', async () => {
  const policy = unwrap(compilePolicy({ version: 1, presets: [], labelDefinitions: {
    one: { color: 'aabbcc', description: 'one' }, two: { color: 'ddeeff', description: 'two' }
  }, rules: {
    first: { when: 'true', effects: { labels: { add: ['one'] } } },
    second: { when: 'true', effects: { labels: { add: ['two'] }, comment: { mode: 'once', template: 'Not selected' } } }
  } }));
  const fake = new FakeGitHub(), client = new GitHubClient({ fetch: fake.fetch });
  const applied = unwrap(await applyGitHubPolicy(client, TARGET, policy, { rules: ['first'] }));
  assert.deepEqual(Object.keys(applied.plan.rules), ['first']); assert.deepEqual([...fake.labels], ['one']);
  assert.equal(fake.definitions.has('two'), false); assert.equal(fake.comments.length, 0);
  const all = unwrap(createPlan(unwrap(evaluatePolicy(policy, applied.report)), TARGET));
  assert.equal(all.policyId, applied.plan.policyId);
  assert.equal(unwrap(readPlan(applied.plan)).rules.first.disposition, 'matched');
  const bad = await applyGitHubPolicy(client, TARGET, policy, { rules: ['absent'] });
  assert.equal(bad.ok, false); assert.equal(bad.diagnostics[0].code, 'E_UNKNOWN_NAME');
});
