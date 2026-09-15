import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { readReport, unwrap, environmentFromReport } from '@wolfsblvt/diffdevil';
import { compileExpression, evaluateExpression } from '@wolfsblvt/diffdevil/language';
import { compileActionShortcut, compilePolicy, evaluatePolicy, createPlan } from '@wolfsblvt/diffdevil/policy';

const root = fileURLToPath(new URL('../', import.meta.url));
const destination = resolve(root, 'artifacts/shortcut-demo');
await mkdir(destination, { recursive: true });
const fixture = resolve(root, 'docs/examples/reports/exact.json');
const report = unwrap(readReport(await readFile(fixture, 'utf8')));
const invoke = args => {
  const result = spawnSync(process.execPath, [resolve(root, 'dist/lib/cli/main.js'), ...args], { encoding: 'utf8', cwd: root, windowsHide: true });
  if (result.error) throw result.error;
  return { argv: args, exit: result.status, stdout: result.stdout, stderr: result.stderr };
};
const tasks = [
  { task: 'total changed', command: 'query', args: ['--metric', 'changed', '--format', 'value'], expression: 'totals.lines.changed', expected: '178\n' },
  { task: 'total threshold', command: 'check', args: ['--metric', 'changed', '--gt', '100'], expression: 'totals.lines.changed > 100', expected: '' },
  { task: 'any included file', command: 'check', args: ['--files', 'any', '--metric', 'changed', '--gt', '100'], expression: 'any(filter(files, f => f.included), f => f.lines.changed > 100)', expected: '' },
  { task: 'matching paths', command: 'query', args: ['--files', '--metric', 'modified', '--gt', '20', '--select', 'path', '--format', 'lines'], expression: 'map(filter(files, f => f.included && f.lines.modified > 20), f => f.path)', expected: 'src/Foo.cs\n' }
];
const observations = tasks.map(task => {
  const shortcut = invoke([task.command, '--report', fixture, ...task.args]);
  assert.equal(shortcut.exit, 0, shortcut.stderr); assert.equal(shortcut.stdout, task.expected);
  const detail = invoke([task.command, '--report', fixture, '--expr', task.expression, ...(task.command === 'query' ? ['--format', task.task === 'matching paths' ? 'lines' : 'value'] : [])]);
  assert.equal(detail.exit, shortcut.exit, detail.stderr); assert.equal(detail.stdout, shortcut.stdout);
  return { task: task.task, shortcut, detail, standing: 'shortcut and authored detail text execute with identical stdout and exit status' };
});
// Custom arithmetic uses detail directly rather than another family of CLI flags.
const environment = unwrap(environmentFromReport(report));
const formula = 'totals.lines.deleted + 2 * totals.lines.modified';
const program = unwrap(compileExpression(formula, { environment: environment.schema, context: 'metric' }));
const metric = unwrap(evaluateExpression(program, environment)).value;
assert.equal(metric.kind, 'number');
const { metrics, metricTypes, bands, rules, reportId, policyId, ...facts } = report;
const named = unwrap(readReport({ ...facts, metrics: { weighted: metric.measurement }, metricTypes: { weighted: metric.numericType } }));
const path = resolve(destination, 'named-metric-report.json');
await writeFile(path, JSON.stringify(named, null, 2) + '\n');
const used = invoke(['query', '--report', path, '--metric', 'metrics.weighted', '--format', 'value']);
assert.equal(used.exit, 0, used.stderr);
assert.equal(used.stdout, String(metric.measurement.value) + '\n');
const authoredConfig = resolve(root, 'docs/examples/policies/weighted.json');
const configShortcut = invoke(['query', '--report', fixture, '--config', authoredConfig, '--metric', 'metrics.weighted', '--format', 'value']);
const configDetail = invoke(['query', '--report', fixture, '--config', authoredConfig, '--expr', 'metrics.weighted', '--format', 'value']);
assert.equal(configShortcut.exit, 0, configShortcut.stderr); assert.equal(configShortcut.stdout, '248\n');
assert.deepEqual([configDetail.exit, configDetail.stdout], [configShortcut.exit, configShortcut.stdout]);
observations.push({ task: 'define and use custom formula', formula, definition: 'JSON policy file and public detail API', savedUse: used, shortcut: configShortcut, detail: configDetail, standing: 'configuration authoring, shared compilation, named retrieval and saved-report replay passed; YAML remains separate' });
const input = { metric: 'changed', threshold: '100', comparison: 'gt', label: 'review/large-change', exclude: 'package-lock.json' };
const authored = { version:1, presets:[], defaults:{paths:{exclude:['package-lock.json']}}, metrics:{inline:{measure:'lines.changed'}}, labelDefinitions:{'review/large-change':{color:'D1D5DB',description:'Managed by the diffdevil inline rule'}}, rules:{inline:{when:'metrics.inline > 100',effects:{labels:{add:['review/large-change'],removeWhenFalse:true}}}} };
const target = {repository:'example/repository',pullRequest:42};
const shortcutPlan = unwrap(createPlan(unwrap(evaluatePolicy(unwrap(compileActionShortcut(input)), report)), target, {definitions:'ensure'}));
const detailPlan = unwrap(createPlan(unwrap(evaluatePolicy(unwrap(compilePolicy(authored)), report)), target, {definitions:'ensure'}));
assert.deepEqual(shortcutPlan.rules, detailPlan.rules); assert.deepEqual(shortcutPlan.operations, detailPlan.operations);
observations.push({ task:'define one Action rule', input, authoredPolicy:authored, rule:shortcutPlan.rules.inline, operations:shortcutPlan.operations, standing:'pure single-rule Action input lowering versus detail policy executes identically; no Action runner, bundle or provider effect is claimed' });
await writeFile(resolve(destination, 'comparison.json'), JSON.stringify(observations, null, 2) + '\n');
console.log(JSON.stringify(observations, null, 2));
