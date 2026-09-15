import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { runAction } from '../dist/lib/actions/run.js';
import { actionContext, readInputs } from '../dist/lib/actions/inputs.js';
import { actionOutputs, outputCommands, escapeCommand, actionSummary } from '../dist/lib/actions/outputs.js';
import { outputNames } from '../dist/lib/actions/surface.js';
import { GitHubClient } from '../dist/lib/github/client.js';
import { readReport } from '../dist/lib/report.js';
import { readPlan } from '../dist/lib/policy/plan.js';
import { unwrap } from '../dist/lib/errors.js';
import { FakeGitHub, TARGET, HEAD, BASE, json } from './helpers/github.mjs';

function parseOutputs(text) {
  const result = {}, lines = text.split('\n');
  for (let i = 0; i < lines.length - 1; i++) {
    const header = /^([a-z][a-z0-9-]*)<<(.+)$/.exec(lines[i]);
    assert.ok(header, `invalid header: ${lines[i]}`);
    const value = [];
    while (++i < lines.length && lines[i] !== header[2]) value.push(lines[i]);
    assert.ok(i < lines.length, 'delimiter must terminate the output');
    assert.equal(Object.hasOwn(result, header[1]), false, 'no duplicate output names');
    result[header[1]] = value.join('\n');
  }
  return result;
}
async function fixture(t, inputs = {}, eventName = 'pull_request_target') {
  const cwd = await mkdtemp(join(tmpdir(), 'diffdevil action '));
  t.after(() => rm(cwd, { recursive: true, force: true }));
  const fake = new FakeGitHub();
  const environment = { GITHUB_WORKSPACE: cwd, RUNNER_TEMP: cwd, GITHUB_REPOSITORY: TARGET.repository,
    GITHUB_EVENT_NAME: eventName, GITHUB_EVENT_PATH: join(cwd, 'event.json'),
    GITHUB_OUTPUT: join(cwd, 'output.txt'), GITHUB_STEP_SUMMARY: join(cwd, 'summary.md'),
    GITHUB_RUN_ID: '123', GITHUB_ACTION: 'diffdevil' };
  await writeFile(environment.GITHUB_EVENT_PATH, JSON.stringify({ repository: { full_name: TARGET.repository }, pull_request: { number: 42 }, issue: { number: 42, pull_request: {} } }));
  await writeFile(environment.GITHUB_OUTPUT, ''); await writeFile(environment.GITHUB_STEP_SUMMARY, '');
  function set(values) {
    for (const key of Object.keys(environment)) if (key.startsWith('INPUT_')) delete environment[key];
    for (const [name, value] of Object.entries(values)) environment[`INPUT_${name.toUpperCase()}`] = value;
  }
  set(inputs);
  const client = new GitHubClient({ fetch: fake.fetch, readRetries: 0 });
  return { cwd, fake, environment, set, run: entry => runAction(entry, { environment, client }),
    outputs: async () => parseOutputs(await readFile(environment.GITHUB_OUTPUT, 'utf8')) };
}
const definition = (color = 'aabbcc', description = 'Managed definition') => ({ color, description });
function customPolicy(extra = {}) {
  return JSON.stringify({ version: 1, presets: [], metrics: { weighted: { formula: 'totals.lines.deleted + 2 * totals.lines.modified' } },
    labelDefinitions: { 'review/weighted': definition() }, rules: { weighted: { when: 'metrics.weighted > 1', effects: { labels: { add: ['review/weighted'], removeWhenFalse: true } } } }, ...extra });
}
function noWrites(f) { assert.equal(f.fake.writes().length, 0); }
function rejected(result, code) { assert.equal(result.ok, false); if (code) assert.equal(result.diagnostics[0].code, code); }

test('root Action no-config follows event target, ignores hostile workspace policy, and publishes observations', async t => {
  const f = await fixture(t);
  await writeFile(join(f.cwd, '.diffdevil.yml'), 'This must not be discovered or parsed');
  f.fake.labels = new Set(['size/L', 'human/keep']);
  f.fake.definitions.set('size/l', { name: 'size/L', color: '123456', description: 'Keep', archived: false });
  const result = unwrap(await f.run('root')), outputs = await f.outputs();
  assert.equal(result.exitCode, 0);
  assert.deepEqual([...f.fake.labels].sort(), ['human/keep', 'size/XS']);
  assert.equal(f.fake.comments.length, 0); assert.equal(f.fake.definitions.get('size/l').color, '123456');
  assert.equal(f.fake.calls.some(c => c.path.includes('/contents/') || c.path.includes('/comments')), false);
  assert.deepEqual(outputs, result.outputs); assert.deepEqual(Object.keys(outputs).sort(), [...outputNames('root')].sort());
  assert.equal(outputs['lines-changed'], '3'); assert.equal(outputs['raw-churn'], '6');
  assert.equal(outputs.band, 'xs'); assert.equal(outputs['metric-value'], '3'); assert.equal(outputs.decision, '');
  assert.equal(JSON.parse(outputs['report-json']).kind, 'diffdevil.action-report-summary');
  assert.equal(JSON.parse(outputs['plan-json']).kind, 'diffdevil.action-plan-summary');
  assert.ok(unwrap(readReport(await readFile(outputs['report-path'], 'utf8'))));
  assert.ok(unwrap(readPlan(await readFile(outputs['plan-path'], 'utf8'))));
  assert.equal(JSON.parse(await readFile(outputs['effects-path'], 'utf8')).status, 'verified');
  const summary = await readFile(f.environment.GITHUB_STEP_SUMMARY, 'utf8');
  assert.match(summary, /Verified changed operations/); assert.match(summary, /readback verified/);
});

test('analyze is read-only even with a token; file threshold outputs use the shared policy engine', async t => {
  const f = await fixture(t, { 'github-token': 'fixture-token', metric: 'changed', threshold: '2', comparison: 'gt', files: 'any' }, 'issue_comment');
  const r = unwrap(await f.run('analyze'));
  assert.equal(r.outputs.decision, 'true'); assert.equal(r.outputs['metric-value'], '3'); noWrites(f);
  assert.equal(r.outputs['effects-changed'], undefined); assert.equal(r.plan, undefined);
  assert.match(await readFile(f.environment.GITHUB_STEP_SUMMARY, 'utf8'), /Not applied/);
});

test('root plan renders desired effects only and source GitHub API remains explicit', async t => {
  const f = await fixture(t, { mode: 'plan', source: 'github-api', 'plan-path': 'desired.json', 'report-path': 'facts.json', summary: 'false' });
  delete f.environment.GITHUB_STEP_SUMMARY;
  const r = unwrap(await f.run('root')); noWrites(f);
  assert.equal(r.outputs['plan-path'], join(f.cwd, 'desired.json')); assert.equal(r.outputs['report-path'], join(f.cwd, 'facts.json'));
  assert.equal(r.outputs['effects-changed'], ''); assert.equal(r.plan.operations.length, 7);
});

test('full base policy controls application; a head policy file is inert diff data', async t => {
  const f = await fixture(t, { config: '.diffdevil.yml', 'policy-source': 'base', rule: 'weighted', definitions: 'ensure' });
  f.fake.contents.set(`${BASE}:.diffdevil.yml`, customPolicy());
  f.fake.contents.set(`${HEAD}:.diffdevil.yml`, 'not trusted and not valid');
  const r = unwrap(await f.run('root'));
  assert.equal(r.exitCode, 0); assert.deepEqual([...f.fake.labels], ['review/weighted']);
  assert.ok(f.fake.calls.filter(c => c.path.includes('/contents/')).every(c => c.query.includes(BASE)));
});

test('pinned policy and relative template acquisition use the declared immutable ref', async t => {
  const pin = 'c'.repeat(40);
  const f = await fixture(t, { config: 'policy/main.yml', 'policy-source': 'pinned', 'policy-ref': pin, 'policy-repository': TARGET.repository, 'comment-author': 'fixture-app[bot]', 'comment-author-id': '101' });
  f.fake.contents.set(`${pin}:policy/main.yml`, customPolicy({ rules: { weighted: { when: 'true', effects: { comment: { mode: 'upsert', templateFile: 'note.md' } } } } }));
  f.fake.contents.set(`${pin}:policy/note.md`, 'Changed: {{ totals.lines.changed }}');
  const r = unwrap(await f.run('apply'));
  assert.equal(r.exitCode, 0); assert.equal(f.fake.comments.length, 1); assert.match(f.fake.comments[0].body, /^Changed: 3/);
  assert.ok(f.fake.calls.filter(c => c.path.includes('/contents/')).every(c => c.query.includes(pin)));
});

test('workspace policy is available for read-only analysis, but cannot become Action write authority', async t => {
  const f = await fixture(t, { config: 'local.yml', 'policy-source': 'workspace' }, 'pull_request');
  await writeFile(join(f.cwd, 'local.yml'), customPolicy());
  const r = unwrap(await f.run('analyze')); assert.equal(r.report.metrics.weighted.value, 6); noWrites(f);
  f.fake.calls.length = 0; rejected(await f.run('apply'), 'E_POLICY_SOURCE'); assert.equal(f.fake.calls.length, 0);
});

test('inline policy and typed parameters remain data; a selected rule drives a decision without mutating', async t => {
  const f = await fixture(t, { policy: customPolicy({ parameters: { threshold: { type: 'integer', required: true }, text: { type: 'string', required: true } },
    rules: { weighted: { when: 'metrics.weighted > params.threshold && params.text == "::warning::not code"' } } }),
    parameters: JSON.stringify({ threshold: 2, text: '::warning::not code' }), rule: 'weighted' });
  const r = unwrap(await f.run('analyze')); assert.equal(r.outputs.decision, 'true'); noWrites(f);
  f.set({ policy: customPolicy(), parameters: '{"value":9007199254740993}' }); rejected(await f.run('analyze')); noWrites(f);
});

test('all path list overrides retain append/replace semantics and literal patterns', async t => {
  const f = await fixture(t, { policy: customPolicy({ defaults: { paths: { exclude: ['src/**'] } } }),
    exclude: 'other/**\n\n', 'exclude-mode': 'replace', 'include-only': 'src/**', 'include-only-mode': 'append',
    'force-include': 'src/main.ts', 'force-include-mode': 'replace' });
  const r = unwrap(await f.run('analyze')); assert.equal(r.outputs['files-included'], '1'); noWrites(f);
  f.set({ exclude: 'src/**', 'include-only': 'src/**', 'force-include': 'other/**' });
  const excluded = unwrap(await f.run('analyze')); assert.equal(excluded.outputs['files-excluded'], '1'); assert.equal(excluded.outputs['lines-changed'], '0');
});

test('detail formula, threshold label, false-removal control and explicit comment share one generated rule', async t => {
  const f = await fixture(t, { formula: 'totals.lines.modified * 2', threshold: '5', comparison: 'gte', label: 'review/custom',
    'remove-label-when-false': 'false', 'comment-template': 'Weighted: {{ metrics.inline }}', 'comment-mode': 'create',
    'comment-author': 'fixture-app[bot]', 'comment-author-id': '101', 'occasion-id': 'chosen-occurrence', 'effects-path': 'journal.json' });
  const r = unwrap(await f.run('root'));
  assert.equal(r.outputs['metric-value'], '6'); assert.equal(r.outputs.decision, 'true'); assert.deepEqual([...f.fake.labels], ['review/custom']);
  assert.equal(f.fake.definitions.has('size/xs'), false); assert.equal(f.fake.comments.length, 1); assert.match(f.fake.comments[0].body, /^Weighted: 6/);
  assert.equal(r.outputs['effects-path'], join(f.cwd, 'journal.json'));
  const again = unwrap(await f.run('root')); assert.equal(again.effects.changed, 0); assert.equal(f.fake.comments.length, 1);
});

test('preset none retains numeric analysis without size effects; path-only and scoped shortcuts stay supported', async t => {
  const f = await fixture(t, { preset: 'none', metric: 'raw-churn', path: 'src/**' });
  const r = unwrap(await f.run('root')); assert.equal(r.outputs['metric-value'], '6'); assert.equal(r.plan.operations.length, 0); noWrites(f);
  f.set({ policy: customPolicy({ scopes: { code: { includeOnly: ['src/**'] } } }), scope: 'code', metric: 'changed' });
  assert.equal(unwrap(await f.run('analyze')).outputs['metric-value'], '3');
  f.set({ metric: 'changed', scope: 'missing' }); rejected(await f.run('analyze'), 'E_UNKNOWN_FIELD'); noWrites(f);
});

test('bounded and incomplete acquisition emits bounds and unknown decisions, never false zero', async t => {
  const f = await fixture(t, { threshold: '4', comparison: 'gt' });
  delete f.fake.files[0].patch;
  const r = unwrap(await f.run('analyze'));
  assert.equal(r.outputs.decision, 'unknown'); assert.equal(r.outputs['lines-changed'], '');
  assert.equal(r.outputs['lines-changed-min'], '3'); assert.equal(r.outputs['lines-changed-max'], '6');
  assert.equal(r.outputs['lines-changed-status'], 'bounded'); noWrites(f);
  f.fake.count = 2;
  const incomplete = unwrap(await f.run('analyze'));
  assert.equal(incomplete.report.fileSet.complete, false); assert.equal(incomplete.outputs['files-total'], '2'); assert.equal(incomplete.outputs['lines-changed'], '');
});

test('apply validates saved report and plan against fresh facts and selected policy', async t => {
  const f = await fixture(t, { mode: 'plan' });
  const prior = unwrap(await f.run('root')); noWrites(f);
  f.set({ 'input-report': prior.outputs['report-path'], 'input-plan': prior.outputs['plan-path'] });
  const applied = unwrap(await f.run('apply')); assert.equal(applied.exitCode, 0);
  f.fake.calls.length = 0; f.fake.head = 'd'.repeat(40);
  rejected(await f.run('apply'), 'E_REPORT_STALE'); noWrites(f);
  f.fake.head = HEAD; f.set({ 'input-report': prior.outputs['report-path'], preset: 'none' });
  rejected(await f.run('apply'), 'E_POLICY_STALE'); noWrites(f);
});

test('a tampered desired plan cannot smuggle an assignment into apply', async t => {
  const f = await fixture(t, { mode: 'plan' });
  const prior = unwrap(await f.run('root'));
  const plan = JSON.parse(await readFile(prior.outputs['plan-path'], 'utf8'));
  plan.operations.find(operation => operation.kind === 'label.select').selected = 'size/XL';
  await writeFile(prior.outputs['plan-path'], JSON.stringify(plan));
  f.set({ 'input-plan': prior.outputs['plan-path'] }); rejected(await f.run('apply'), 'E_PLAN_STALE'); noWrites(f);
});

test('a changed PR base after policy loading blocks effects even when acquisition itself is stable', async t => {
  const f = await fixture(t, { config: '.diffdevil.yml' });
  f.fake.contents.set(`${BASE}:.diffdevil.yml`, customPolicy());
  f.fake.before = (call, state) => { if (call.path.includes('/contents/')) state.base = 'd'.repeat(40); };
  rejected(await f.run('root'), 'E_POLICY_STALE'); noWrites(f);
});

test('stale head immediately before writes is recorded without applying obsolete results', async t => {
  const f = await fixture(t);
  f.fake.before = (call, state) => { if (call.method === 'GET' && call.path.endsWith('/issues/42/labels')) state.head = 'e'.repeat(40); };
  const r = unwrap(await f.run('root')); assert.equal(r.exitCode, 2); assert.equal(r.effects.diagnostics[0].code, 'E_PLAN_STALE'); noWrites(f);
  assert.equal(r.outputs['effects-status'], 'incomplete'); assert.equal(r.outputs['effects-changed'], '0');
});

test('acknowledged writes without verified readback remain partial in outputs and full journal', async t => {
  const f = await fixture(t);
  f.fake.before = call => call.method === 'POST' && call.body?.name === 'size/L' ? json({ name: 'size/L' }, 201) : undefined;
  const r = unwrap(await f.run('root')); assert.equal(r.exitCode, 2); assert.equal(r.outputs['effects-status'], 'incomplete');
  const journal = JSON.parse(await readFile(r.outputs['effects-path'], 'utf8'));
  assert.ok(journal.changed > 0); assert.equal(journal.observations.at(-1).outcome, 'unresolved');
  assert.equal(journal.observations.at(-1).request, 'acknowledged'); assert.notEqual(journal.observations.at(-1).readback, 'verified');
  assert.equal(f.fake.labels.size, 0);
});

test('an ambiguous provider write is read back and not blindly retried', async t => {
  const f = await fixture(t, { threshold: '1', label: 'review/test' });
  f.fake.before = (call, state) => {
    if (call.method === 'POST' && call.path.endsWith('/issues/42/labels')) {
      state.labels.add('review/test'); return json({}, 502);
    }
  };
  const r = unwrap(await f.run('apply')); assert.equal(r.exitCode, 0);
  const ambiguous = r.effects.observations.find(row => row.request === 'ambiguous');
  assert.ok(ambiguous); assert.equal(ambiguous.readback, 'verified');
  assert.equal(f.fake.writes().filter(call => call.path.endsWith('/issues/42/labels')).length, 1);
});

test('sync-labels defaults to read-only verification and explicit ensure/sync preserve unrelated definitions', async t => {
  const f = await fixture(t, { policy: customPolicy(), rule: 'weighted' }, 'workflow_dispatch');
  const verified = unwrap(await f.run('sync-labels')); assert.equal(verified.exitCode, 1); noWrites(f);
  assert.equal(verified.outputs['effects-changed'], '0');
  f.fake.definitions.set('other', { name: 'other', ...definition('111111', 'Do not touch') });
  f.set({ policy: customPolicy(), operation: 'apply', definitions: 'ensure', 'effects-path': 'definitions.json' });
  const ensured = unwrap(await f.run('sync-labels')); assert.equal(ensured.exitCode, 0);
  f.fake.definitions.get('review/weighted').color = '000000';
  f.set({ policy: customPolicy(), operation: 'apply', definitions: 'sync' });
  const synced = unwrap(await f.run('sync-labels')); assert.equal(synced.exitCode, 0); assert.equal(synced.effects.changed, 1);
  assert.equal(f.fake.definitions.get('review/weighted').color, 'aabbcc'); assert.equal(f.fake.definitions.get('other').color, '111111');
  assert.equal(f.fake.calls.some(call => call.path.includes('/pulls/') || call.path.includes('/issues/')), false);
});

test('definition synchronization checks the repository-base policy revision before writes', async t => {
  const f = await fixture(t, { policy: customPolicy(), operation: 'apply' }, 'workflow_dispatch');
  f.fake.before = (call, state) => { if (call.method === 'GET' && call.path.endsWith('/labels')) state.defaultBranch = 'e'.repeat(40); };
  const r = unwrap(await f.run('sync-labels')); assert.equal(r.exitCode, 2); assert.equal(r.effects.diagnostics[0].code, 'E_POLICY_STALE'); noWrites(f);
});

test('explicit local Git route compares current PR revisions instead of GitHub file patches', async t => {
  const f = await fixture(t, { source: 'git', 'git-cwd': 'checkout', 'github-token': 'fixture-do-not-forward' });
  const repo = join(f.cwd, 'checkout'); await mkdir(repo);
  const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8', windowsHide: true });
  git('init', '--quiet'); git('config', 'user.name', 'Fixture'); git('config', 'user.email', 'fixture@example.invalid');
  await writeFile(join(repo, 'text.txt'), 'old\n'); git('add', '.'); git('commit', '--quiet', '-m', 'base'); f.fake.base = git('rev-parse', 'HEAD').trim();
  await writeFile(join(repo, 'text.txt'), 'new\nextra\n'); git('add', '.'); git('commit', '--quiet', '-m', 'head'); f.fake.head = git('rev-parse', 'HEAD').trim();
  const r = unwrap(await f.run('apply')); assert.equal(r.report.source.kind, 'git'); assert.equal(r.outputs['lines-changed'], '2');
  assert.equal(r.exitCode, 0); assert.ok(f.fake.labels.has('size/XS'));
  assert.equal(f.fake.calls.some(call => call.path.endsWith('/files')), false);
});

for (const [entry, inputs] of [
  ['analyze', { label: 'surprise' }], ['analyze', { mode: 'apply' }], ['apply', { mode: 'analyze' }],
  ['root', { mode: 'analyze', label: 'surprise' }], ['root', { source: 'shell' }], ['root', { 'git-cwd': '.' }],
  ['root', { summary: 'yes' }], ['root', { preset: 'invalid' }], ['root', { config: 'policy.yml', threshold: '1' }],
  ['root', { 'policy-source': 'pinned', 'policy-ref': BASE }], ['root', { config: 'policy.yml', 'policy-source': 'pinned', 'policy-ref': 'main' }],
  ['root', { threshold: '1', label: 'x', 'remove-label-when-false': 'yes' }],
  ['root', { 'comment-author-id': '101' }], ['root', { mode: 'plan', definitions: 'verify' }], ['root', { definitions: 'all' }],
  ['sync-labels', { definitions: 'sync' }], ['sync-labels', { operation: 'apply', definitions: 'none' }],
  ['root', { 'pull-request': '9007199254740993' }], ['root', { 'pull-request': '0' }],
  ['root', { repository: '../bad' }], ['root', { preset: 'size@1', threshold: '1', label: 'x' }],
]) test(`${entry} rejects contradictory or malformed host input ${JSON.stringify(inputs)}`, async t => {
  const f = await fixture(t, inputs); rejected(await f.run(entry)); noWrites(f);
});

test('INPUT_* uses documented hyphen spelling and unknown input is not silently ignored', () => {
  assert.equal(readInputs('root', { 'INPUT_GITHUB-TOKEN': ' x ', INPUT_POLICY: 'version: 1\n' })['github-token'], 'x');
  assert.throws(() => readInputs('root', { INPUT_GITHUB_TOKEN: 'x' }), /not supported/);
});

test('non-PR events require an explicit target and malformed event JSON fails without provider calls', async t => {
  const f = await fixture(t, {}, 'workflow_run'); rejected(await f.run('root')); assert.equal(f.fake.calls.length, 0);
  f.set({ repository: TARGET.repository, 'pull-request': '42' }); assert.equal(unwrap(await f.run('analyze')).exitCode, 0);
  await writeFile(f.environment.GITHUB_EVENT_PATH, '{broken'); f.fake.calls.length = 0;
  rejected(await f.run('root'), 'E_ACTION_EVENT'); assert.equal(f.fake.calls.length, 0);
});

test('artifact collisions and missing output transports fail before effects', async t => {
  const f = await fixture(t, { 'report-path': 'same.json', 'plan-path': 'same.json' });
  rejected(await f.run('root'), 'E_ACTION_PATH'); noWrites(f);
  f.set({ 'report-path': f.environment.GITHUB_OUTPUT }); rejected(await f.run('root'), 'E_ACTION_PATH'); noWrites(f);
  f.set({}); delete f.environment.GITHUB_OUTPUT; rejected(await f.run('root'), 'E_ACTION_ENV'); noWrites(f);
});

test('multiline protocol preserves line breaks, percent signs and command-looking data exactly', () => {
  const values = { text: 'first\nEOF\n::error::not a command\r\nlast%\n', empty: '', unicode: 'Baumhaus 🌲' };
  assert.deepEqual(parseOutputs(outputCommands(values)), values);
  assert.equal(escapeCommand('a%\r\n::error::x'), 'a%25%0D%0A::error::x');
  assert.throws(() => outputCommands({ 'bad\nname': 'x' }));
  assert.throws(() => outputCommands({ value: 'x\0y' }));
});

test('workflow summary escapes provider markup and distinguishes acknowledgment from readback', async () => {
  const report = JSON.parse(await readFile(new URL('../examples/reports/bounded.json', import.meta.url), 'utf8'));
  report.source.repository = '<script>![image](evil)|repo';
  report.metrics = Object.fromEntries(Array.from({ length: 31 }, (_, index) => [`metric${index}`, report.totals.lines.changed]));
  const text = actionSummary({ exitCode: 2, report, effects: { status: 'incomplete', changed: 0,
    observations: [{ kind: 'label.add', subject: '<script>\n![image](evil)|x', outcome: 'unresolved', request: 'acknowledged', readback: 'failed' }], diagnostics: [] } });
  assert.doesNotMatch(text, /<script>|!\[image\]/); assert.match(text, /acknowledged, readback failed/);
  assert.match(text, /An unavailable exact value is not zero/);
  assert.match(text, /Files included/); assert.match(text, /File list/);
  assert.match(text, /\| metric29 \|/u); assert.doesNotMatch(text, /\| metric30 \|/u);
  assert.match(text, /Additional metrics are in the full report/);
});


test('workspace policy/template reads are confined to the checkout, including symlinks', async t => {
  const f = await fixture(t, { mode: 'plan', 'policy-source': 'workspace' });
  const outside = await mkdtemp(join(tmpdir(), 'diffdevil-outside-'));
  t.after(() => rm(outside, { recursive: true, force: true }));
  const template = join(outside, 'external.md');
  await writeFile(template, 'EXTERNAL FIXTURE: this text must not enter an Action artifact');
  const withTemplate = file => JSON.stringify({ version: 1, presets: [], rules: { review: { when: 'true', effects: { comment: { templateFile: file, mode: 'create' } } } } });
  f.set({ mode: 'plan', 'policy-source': 'workspace', policy: withTemplate(template) });
  rejected(await f.run('root'), 'E_POLICY_SOURCE'); noWrites(f);
  const externalConfig = join(outside, 'policy.json'); await writeFile(externalConfig, withTemplate('external.md'));
  f.set({ mode: 'plan', 'policy-source': 'workspace', config: externalConfig });
  rejected(await f.run('root'), 'E_POLICY_SOURCE'); noWrites(f);
  await symlink(template, join(f.cwd, 'escape.md'), 'file');
  f.set({ mode: 'plan', 'policy-source': 'workspace', policy: withTemplate('escape.md') });
  rejected(await f.run('root'), 'E_POLICY_SOURCE'); noWrites(f);
  await mkdir(join(f.cwd, 'policies')); await writeFile(join(f.cwd, 'local.md'), 'Inside workspace.');
  await writeFile(join(f.cwd, 'policies/review.json'), withTemplate('../local.md'));
  f.set({ mode: 'plan', 'policy-source': 'workspace', config: 'policies/review.json' });
  const result = unwrap(await f.run('root')); noWrites(f);
  assert.equal(result.exitCode, 0);
  assert.match(await readFile(result.outputs['plan-path'], 'utf8'), /Inside workspace/);
  assert.doesNotMatch(await readFile(result.outputs['plan-path'], 'utf8'), /EXTERNAL FIXTURE/);
});

test('workflow output and summary cannot share a command file', async t => {
  const f = await fixture(t);
  f.environment.GITHUB_STEP_SUMMARY = f.environment.GITHUB_OUTPUT;
  rejected(await f.run('root'), 'E_ACTION_PATH'); noWrites(f);
});


test('compact Action summaries preserve uncertainty and bounds without repeating large evidence lists', async t => {
  const f = await fixture(t);
  const analysis = unwrap(await f.run('analyze'));
  const reasons = Array.from({ length: 5000 }, (_, i) => ({ code: 'PATCH_MISSING', subject: `file-${i}` }));
  const metric = { status: 'unknown', lower: 3, upper: 6, reasons };
  const result = { ...analysis, metric, decision: { status: 'unknown', reasons }, band: { status: 'unknown', reasons, candidates: ['small', 'large'] },
    report: { ...analysis.report, totals: { ...analysis.report.totals, lines: { ...analysis.report.totals.lines, changed: metric } } } };
  const outputs = actionOutputs('root', result, { report: '/fixture/full-report.json' });
  const compact = JSON.parse(outputs['report-json']);
  assert.deepEqual(compact.metric, { status: 'unknown', reasonCount: 5000, lower: 3, upper: 6 });
  assert.equal(compact.band.candidateCount, 2); assert.equal(compact.decision.reasonCount, 5000);
  assert.equal(outputs['lines-changed'], ''); assert.equal(outputs['lines-changed-min'], '3'); assert.equal(outputs['lines-changed-max'], '6');
  assert.equal(compact.reportPath, '/fixture/full-report.json'); assert.ok(outputs['report-json'].length < 8000);
  assert.doesNotThrow(() => outputCommands(outputs));
  assert.equal(result.report.totals.lines.changed.reasons.length, 5000);
});
