import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm, cp } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { parse } from 'yaml';
import { analyzeDiff, unwrap } from '../../../dist/lib/index.js';
import { compilePolicy, readPolicyYaml, evaluatePolicy, createPlan } from '../../../dist/lib/policy/index.js';
import { runAction } from '../../../dist/lib/actions/run.js';
import { GitHubClient } from '../../../dist/lib/github/client.js';
import { FakeGitHub, TARGET, BASE } from './helpers/github.mjs';

const root = resolve('.');
const cli = join(root, 'dist/lib/cli/main.js');
const read = path => readFile(join(root, path), 'utf8');
const patch = await read('docs/examples/diffs/review.diff');
const report = unwrap(analyzeDiff(patch));
const policy = async name => unwrap(compilePolicy(unwrap(readPolicyYaml(await read(`docs/examples/policies/${name}.yml`)))));

// Use the actual documented command lines. This lexer accepts only their small
// shell-neutral argument subset; it neither invokes a shell nor evaluates text.
function commandArgs(line) {
  const tokens = [...line.matchAll(/'([^']*)'|"([^"]*)"|(\S+)/gu)].map(match => match[1] ?? match[2] ?? match[3]);
  if (tokens[0] === 'npm') {
    assert.deepEqual(tokens.slice(0, 4), ['npm', 'exec', '--', 'diffdevil']);
    return tokens.slice(4).map(value => value.startsWith('node_modules/@wolfsblvt/diffdevil/') ? join(root, value.slice('node_modules/@wolfsblvt/diffdevil/'.length)) : value);
  }
  if (tokens[0] === 'npx') {
    assert.deepEqual(tokens.slice(0, 2), ['npx', 'diffdevil']);
    return tokens.slice(2);
  }
  assert.deepEqual(tokens.slice(0, 2), ['node', 'dist/lib/cli/main.js']);
  return tokens.slice(2);
}
async function workspace(t) {
  const dir = await mkdtemp(join(tmpdir(), 'diffdevil examples '));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await cp(join(root, 'docs/examples'), join(dir, 'docs/examples'), { recursive: true });
  return dir;
}

test('teaching patch preserves transparent replacement, churn, file and exclusion accounting', async () => {
  assert.equal(report.totals.lines.changed.value, 10);
  assert.equal(report.totals.raw.churn.value, 16);
  assert.equal(report.totals.lines.modified.value, 6);
  assert.equal(report.totals.lines.added.value, 4);
  assert.equal(report.totals.files.included.value, 4);
  const result = unwrap(evaluatePolicy(await policy('review-signals'), report));
  assert.equal(result.report.totals.lines.changed.value, 6);
  assert.equal(result.report.metrics.sourceReview.value, 3);
  assert.equal(result.report.metrics.testsReview.value, 2);
  assert.equal(result.rules.sourceWithoutTests.decision.value, false);
  const plan = unwrap(createPlan(result, TARGET));
  assert.ok(plan.operations.some(op => op.kind === 'label.remove' && op.name === 'review/source-without-tests'));
});

test('copyable local recipe commands execute the CLI, not an approximation of their syntax', async t => {
  const dir = await workspace(t);
  const commands = (await read('docs/manual/use/cli.md')).split('\n')
    .filter(line => line.startsWith('npm exec -- diffdevil ') && /--(?:diff-file|report)\b/u.test(line));
  assert.ok(commands.length > 0, 'The guide must expose executable specimens.');
  for (const line of commands) {
    const args = commandArgs(line);
    const result = spawnSync(process.execPath, [cli, ...args], { cwd: dir, encoding: 'utf8' });
    assert.ifError(result.error);
    assert.equal(result.status, 0, `${line}\n${result.stderr}`);
    assert.equal(result.stderr, '');
    if (args.includes('--output')) assert.equal(result.stdout, '');
    else if (args.includes('value')) assert.equal(result.stdout, args.includes('totals.raw.churn') ? '16\n' : args.includes('totals.lines.changed') || args.includes('changed') ? '10\n' : '12\n');
    else if (args.includes('lines')) assert.equal(result.stdout, 'package-lock.json\nsrc/payments.ts\n');
    else if (args.includes('json')) assert.doesNotThrow(() => JSON.parse(result.stdout));
  }
});

test('copyable named policy query and local desired-plan commands are valid', async t => {
  const dir = await workspace(t);
  const commands = (await read('docs/manual/policy/recipes.md')).split('\n').filter(line => line.startsWith('npx diffdevil '));
  assert.ok(commands.length > 0);
  for (const line of commands) {
    const args = commandArgs(line);
    const result = spawnSync(process.execPath, [cli, ...args], { cwd: dir, encoding: 'utf8' });
    assert.ifError(result.error); assert.equal(result.status, 0, `${line}\n${result.stderr}`);
    if (args[0] === 'query') assert.equal(result.stdout, '2\n');
    if (args[0] === 'plan') assert.equal(JSON.parse(result.stdout).stage, 'desired');
  }
});

async function actionFixture(t, name) {
  const dir = await workspace(t);
  const workflow = parse(await read(`docs/examples/workflows/${name}.yml`));
  const step = Object.values(workflow.jobs)[0].steps[0];
  const entry = step.uses.includes('/analyze@') ? 'analyze' : 'root';
  const metadata = parse(await read(entry === 'root' ? 'action.yml' : 'actions/analyze/action.yml'));
  const environment = { GITHUB_WORKSPACE: dir, RUNNER_TEMP: dir, GITHUB_REPOSITORY: TARGET.repository,
    GITHUB_EVENT_PATH: join(dir, 'event.json'), GITHUB_EVENT_NAME: 'pull_request_target',
    GITHUB_OUTPUT: join(dir, 'output'), GITHUB_STEP_SUMMARY: join(dir, 'summary') };
  await writeFile(environment.GITHUB_EVENT_PATH, JSON.stringify({ repository: { full_name: TARGET.repository }, pull_request: { number: 42 } }));
  await writeFile(environment.GITHUB_OUTPUT, ''); await writeFile(environment.GITHUB_STEP_SUMMARY, '');
  for (const [key, value] of Object.entries(step.with ?? {})) {
    assert.ok(Object.hasOwn(metadata.inputs, key), `Undeclared recipe input ${key}`);
    assert.equal(typeof value, 'string', `Recipe input ${key} must be a string`);
    environment[`INPUT_${key.toUpperCase()}`] = value;
  }
  const fake = new FakeGitHub();
  fake.author = { login: 'github-actions[bot]', id: 101, type: 'Bot' };
  fake.files = patch.split(/(?=^diff --git )/mu).filter(Boolean).map(fragment => {
    const path = /^diff --git a\/(.+) b\/(.+)$/mu.exec(fragment)[2];
    const fragmentPatch = fragment.slice(fragment.indexOf('@@'));
    const additions = fragmentPatch.split('\n').filter(line => line.startsWith('+')).length;
    const deletions = fragmentPatch.split('\n').filter(line => line.startsWith('-')).length;
    return { filename: path, status: fragment.includes('new file mode') ? 'added' : 'modified', additions, deletions, changes: additions + deletions, patch: fragmentPatch };
  });
  if (step.with?.config) fake.contents.set(`${BASE}:${step.with.config}`, await read(`docs/examples/policies/${name}.yml`));
  const client = new GitHubClient({ fetch: fake.fetch, readRetries: 0 });
  return { fake, workflow, environment, run: () => runAction(entry, { environment, client }) };
}

test('the exact quickstart workflow is self-contained and reconciles only its size group', async t => {
  const f = await actionFixture(t, 'size');
  const snippet = /```yaml\n([\s\S]+?)\n```/u.exec(await read('docs/manual/start/label-pull-requests.md'))[1];
  assert.deepEqual(parse(snippet), f.workflow, 'Copied executable YAML must match its tested asset.');
  assert.deepEqual(f.workflow.permissions, { 'pull-requests': 'write' });
  assert.ok(f.workflow.on.pull_request_target.types.includes('edited'));
  assert.equal(f.workflow.concurrency['cancel-in-progress'], false);
  f.fake.labels = new Set(['size/L', 'human/keep']);
  const result = unwrap(await f.run());
  assert.equal(result.exitCode, 0); assert.deepEqual([...f.fake.labels].sort(), ['human/keep', 'size/XS']);
  assert.equal(f.fake.definitions.size, 6); assert.equal(f.fake.comments.length, 0);
  const writes = f.fake.writes().length;
  assert.equal(unwrap(await f.run()).exitCode, 0); assert.equal(f.fake.writes().length, writes);
  assert.equal(f.fake.calls.some(call => call.path.includes('/contents/')), false);
  const summary = await readFile(f.environment.GITHUB_STEP_SUMMARY, 'utf8');
  assert.match(summary, new RegExp(BASE));
  assert.match(summary, /\| Files included \| 4 \|/u);
  assert.match(summary, /\| Raw churn \| 16 \|/u);
});

test('review-signal workflow evaluates real base policy and reconciles the source/test transition', async t => {
  const f = await actionFixture(t, 'review-signals');
  assert.equal(unwrap(await f.run()).exitCode, 0);
  assert.equal(f.fake.labels.has('review/source-without-tests'), false);
  f.fake.files = f.fake.files.filter(file => !file.filename.startsWith('tests/'));
  assert.equal(unwrap(await f.run()).exitCode, 0);
  assert.equal(f.fake.labels.has('review/source-without-tests'), true);
  f.fake.files.push({ filename: 'tests/new.test.ts', status: 'added', additions: 1, deletions: 0, changes: 1, patch: '@@ -0,0 +1 @@\n+test();' });
  assert.equal(unwrap(await f.run()).exitCode, 0);
  assert.equal(f.fake.labels.has('review/source-without-tests'), false);
});

test('comment recipe creates one owned comment with actual numbers and does not churn on rerun', async t => {
  const f = await actionFixture(t, 'review-comment');
  assert.equal(unwrap(await f.run()).exitCode, 0);
  assert.equal(f.fake.labels.size, 0); assert.equal(f.fake.comments.length, 1);
  assert.match(f.fake.comments[0].body, /changed lines: 10\nRaw churn: 16\nDeleted-only or modified lines: 6\nIncluded files: 4/u);
  const writes = f.fake.writes().length;
  assert.equal(unwrap(await f.run()).exitCode, 0);
  assert.equal(f.fake.comments.length, 1); assert.equal(f.fake.writes().length, writes);
});

test('all maintained workflow step inputs are declared, and applying examples avoid checkout/run', async () => {
  const { readdir } = await import('node:fs/promises');
  const files = (await readdir(join(root, 'docs/examples/workflows'))).filter(name => name.endsWith('.yml'));
  assert.ok(files.length > 0);
  for (const file of files) {
    const workflow = parse(await read(`docs/examples/workflows/${file}`));
    for (const job of Object.values(workflow.jobs)) for (const step of job.steps) {
      if (workflow.on.pull_request_target) { assert.equal(step.run, undefined); assert.ok(step.uses?.startsWith('Wolfsblvt/diffdevil')); }
      if (!step.uses?.startsWith('Wolfsblvt/diffdevil')) continue;
      const entry = step.uses.split('@')[0].split('/').slice(2).join('/');
      const metadata = parse(await read(entry ? `${entry}/action.yml` : 'action.yml'));
      for (const [key, value] of Object.entries(step.with ?? {})) { assert.ok(Object.hasOwn(metadata.inputs, key)); assert.equal(typeof value, 'string'); }
    }
  }
});


test('repository CI calls the real verification surfaces without publishing or privileged PR execution', async () => {
  const workflow = parse(await read('.github/workflows/verify.yml'));
  assert.deepEqual(workflow.permissions, { contents: 'read' });
  assert.equal(workflow.on.pull_request_target, undefined);
  assert.ok(Object.hasOwn(workflow.on, 'pull_request'));
  // The continuing manual draft has the same read-only checks even when base
  // movement prevents GitHub from creating a synthetic PR merge for its event.
  assert.deepEqual(workflow.on.push.branches, ['main', 'docs/public-manual']);
  const job = workflow.jobs.verify;
  const commands = job.steps.filter(step => step.run).map(step => step.run);
  for (const command of ['npm run verify', 'npm run test:conformance', 'npm run test:package', 'npm run test:actions']) assert.ok(commands.includes(command));
  assert.equal(commands.some(command => /npm publish|git push|--token/u.test(command)), false);
  for (const step of job.steps.filter(step => step.uses)) assert.match(step.uses, /^actions\/(?:checkout|setup-node)@[a-f0-9]{40}$/u);
  assert.equal(job.steps[0].with['ref'], '${{ github.event.pull_request.head.sha || github.sha }}');
  assert.equal(job.steps[0].with['persist-credentials'], false);
  assert.equal(job.steps[1].with['package-manager-cache'], false);
  assert.ok(job.strategy.matrix.include.some(row => row.os === 'windows-latest' && row.node === '24'));
});
