import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { formatReport } from '../../../dist/lib/format.js';
import { formatPlan } from '../../../dist/lib/policy/format.js';
import { readPlan } from '../../../dist/lib/policy/plan.js';
import { parseInvocation } from '../../../dist/lib/cli/arguments.js';
import { runCli } from '../../../dist/lib/cli/run.js';
import { unwrap } from '../../../dist/lib/errors.js';
import { readReport } from '../../../dist/lib/report.js';

const fixture = name => JSON.parse(readFileSync(new URL(`../../../docs/examples/reports/${name}.json`, import.meta.url)));
const report = name => unwrap(readReport(fixture(name)));
const stripAnsi = text => text.replaceAll(/\u001b\[[0-9;]*m/gu, '');

test('human summary gives Changed one primary two-line block and compresses ordinary policy facts', () => {
  const rendered = unwrap(formatReport(report('exact'), 'human')).stdout;
  assert.equal(rendered, `diffdevil analysis
git · fixture-base..fixture-head · direct · = exact

Changed    178 lines
  +45 added only · -18 deleted only · ~115 modified

Raw        +160 additions · -133 deletions · 293 churn
Files      3 total · 2 included · 1 excluded

Policy
  Band       size → m
  Metrics    review 178 · churn 293 · destructive 133 · … 2 more
`);
  assert.doesNotMatch(rendered, /0 unmeasurable/u);
});

test('human non-exact summaries retain glyph plus word and the concrete evidence reason', () => {
  const bounded = unwrap(formatReport(report('bounded'), 'human')).stdout;
  assert.match(bounded, /≈ bounded/u);
  assert.match(bounded, /PATCH_INCOMPLETE/u);
  assert.match(bounded, /Changed\s+60–70 lines/u);

  const unmeasurable = unwrap(formatReport(report('unmeasurable'), 'human')).stdout;
  assert.match(unmeasurable, /∅ unmeasurable/u);
  assert.match(unmeasurable, /^Raw\s+∅ unmeasurable additions · ∅ unmeasurable deletions · ∅ unmeasurable churn$/mu);
  assert.doesNotMatch(unmeasurable, /[+-]∅/u);
});

test('full human detail expands aggregate identity, categories and scopes without file records', () => {
  const rendered = unwrap(formatReport(report('exact'), 'human', { detail: 'full' })).stdout;
  assert.match(rendered, /Details/u);
  assert.match(rendered, /File categories/u);
  assert.match(rendered, /Scopes/u);
  assert.match(rendered, /production/u);
  assert.doesNotMatch(rendered, /src\/Foo\.cs/u);
  assert.doesNotMatch(rendered, /… 2 more/u);
});

test('human ANSI color preserves identical plain meaning and uses the selected palette', () => {
  const exact = report('exact');
  const plain = unwrap(formatReport(exact, 'human', { color: false })).stdout;
  const colored = unwrap(formatReport(exact, 'human', { color: true })).stdout;
  assert.equal(stripAnsi(colored), plain);
  assert.match(colored, /\u001b\[38;2;240;97;186;1m(?:diffdevil)/u);
  assert.match(colored, /\u001b\[38;2;143;214;170;1m\+45/u);
  assert.match(colored, /\u001b\[38;2;255;159;176;1m-18/u);
});

test('CLI auto color follows terminal capability and environment controls', async () => {
  const argv = ['analyze', '--report', 'docs/examples/reports/exact.json', '--no-config', '--format', 'human'];
  const capable = { isTTY: true, hasColors: () => true };
  const incapable = { isTTY: false, hasColors: () => false };

  const automatic = unwrap(await runCli(argv, process.cwd(), { stdout: capable, env: {} })).stdout;
  assert.match(automatic, /\u001b\[/u);

  const optedOut = unwrap(await runCli(argv, process.cwd(), { stdout: capable, env: { NO_COLOR: '1' } })).stdout;
  assert.doesNotMatch(optedOut, /\u001b\[/u);

  const forced = unwrap(await runCli(argv, process.cwd(), { stdout: incapable, env: { FORCE_COLOR: '1' } })).stdout;
  assert.match(forced, /\u001b\[/u);

  const forcedOff = unwrap(await runCli(argv, process.cwd(), { stdout: capable, env: { FORCE_COLOR: '0' } })).stdout;
  assert.doesNotMatch(forcedOff, /\u001b\[/u);
});

test('agent report is a compact deterministic record projection, never colored human prose', () => {
  const rendered = unwrap(formatReport(report('exact'), 'agent', { color: true, detail: 'full' })).stdout;
  assert.match(rendered, /^diffdevil\.agent-report\/1 schema=1\.0$/mu);
  assert.match(rendered, /^lines changed=178 modified=115 added_only=45 deleted_only=18$/mu);
  assert.match(rendered, /^raw churn=293 added=160 deleted=133$/mu);
  assert.match(rendered, /^metrics "review"=178 .*"weighted"=524$/mu);
  assert.match(rendered, /^bands "size"=resolved\("m",lower=100,upper=500\)$/mu);
  assert.doesNotMatch(rendered, /\u001b\[/u);
  assert.doesNotMatch(rendered, /DIFFDEVIL REPORT/u);
});

test('agent report types bounded and unmeasurable measurements instead of inventing exact values', () => {
  const bounded = unwrap(formatReport(report('bounded'), 'agent')).stdout;
  assert.match(bounded, /changed=bounded\(60,70\)/u);
  assert.match(bounded, /reasons=\[\{"code":"PATCH_INCOMPLETE"\}\]/u);
  const unmeasurable = unwrap(formatReport(report('unmeasurable'), 'agent')).stdout;
  assert.match(unmeasurable, /unmeasurable\(reasons=/u);
});

test('human plan promotes the selected provider label while preserving absent readback', () => {
  const plan = unwrap(readPlan(fixture('plan')));
  const rendered = unwrap(formatPlan(plan, 'human')).stdout;
  assert.match(rendered, /^diffdevil effect plan$/mu);
  assert.match(rendered, /^Select\s+size\/S$/mu);
  assert.match(rendered, /^  managed group size · rule size$/mu);
  assert.match(rendered, /^Ensure\s+6 label definitions$/mu);
  assert.match(rendered, /^Readback\s+not observed$/mu);
  assert.doesNotMatch(rendered, /^Held/mu);
  assert.doesNotMatch(rendered, /applied successfully/u);
});

test('agent plan emits every desired operation and still says applied=false', () => {
  const plan = unwrap(readPlan(fixture('plan')));
  const rendered = unwrap(formatPlan(plan, 'agent')).stdout;
  assert.match(rendered, /^diffdevil\.agent-plan\/1 schema=1\.0 stage=desired applied=false$/mu);
  assert.equal(rendered.match(/^effect /gmu)?.length, plan.operations.length);
  assert.match(rendered, /kind=label\.select .*selected="size\/S"/u);
  assert.match(rendered, /^preconditions head="fixture-head" base="fixture-base"$/mu);
  assert.match(rendered, /^held count=0$/mu);
  assert.match(rendered, /^readback observed=false$/mu);
});

test('Markdown plan keeps dynamic subjects literal when they contain backticks', () => {
  const raw = fixture('plan');
  raw.operations[0].definition.description = 'Use `review` before apply';
  const rendered = unwrap(formatPlan(unwrap(readPlan(raw)), 'markdown')).stdout;
  assert.match(rendered, /`` "size\/XS" · #C2E0C6 · "Use `review` before apply" ``/u);
});

test('detail and color flags are confined to human analyze and plan presentation', () => {
  assert.equal(parseInvocation(['analyze', '--detail', 'full', '--color', 'never']).values.detail, 'full');
  assert.equal(parseInvocation(['plan', '--detail', 'summary', '--color', 'always']).values.color, 'always');
  assert.throws(() => parseInvocation(['query', '--detail', 'full']), error => error.diagnostic?.code === 'E_CONFIG_CONFLICT');
  assert.throws(() => parseInvocation(['analyze', '--format', 'agent', '--color', 'always']), error => error.diagnostic?.code === 'E_CONFIG_CONFLICT');
  assert.throws(() => parseInvocation(['analyze', '--detail', 'everything']), error => error.diagnostic?.code === 'E_USAGE');
});
