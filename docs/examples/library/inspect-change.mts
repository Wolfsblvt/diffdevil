// SPDX-License-Identifier: MIT
// Run with: node out/inspect-change.mjs diff change.diff
// Or:       node out/inspect-change.mjs report report.json
// The example target is inert: this program never acquires or mutates GitHub.
import { readFileSync } from 'node:fs';
import { analyzeDiff, readReport, type Result } from '@wolfsblvt/diffdevil';
import {
  readPolicyYaml, compilePolicy, evaluatePolicy, evaluatePolicyQuery,
  createPlan, readPlan,
} from '@wolfsblvt/diffdevil/policy';

function requireResult<T>(result: Result<T>): T {
  if (!result.ok) {
    throw new Error(result.diagnostics.map(item => `${item.code}: ${item.message}`).join('\n'));
  }
  return result.value;
}

try {
  const [kind, path] = process.argv.slice(2);
  if ((kind !== 'diff' && kind !== 'report') || !path) {
    throw new Error('Usage: inspect-change.mjs diff|report PATH');
  }
  const input = readFileSync(path, 'utf8');
  const report = requireResult(kind === 'diff' ? analyzeDiff(input) : readReport(input));
  const source = requireResult(readPolicyYaml('version: 1\npresets: [size@1]\n', { name: 'example-policy.yml' }));
  const policy = requireResult(compilePolicy(source));
  const evaluated = requireResult(evaluatePolicy(policy, report));
  const query = requireResult(evaluatePolicyQuery(policy, report, 'totals.lines.changed < 100', { context: 'condition' }));
  const target = {
    repository: report.source.repository ?? 'example/repository',
    pullRequest: report.source.pullRequest ?? 42,
  };
  const plan = requireResult(createPlan(evaluated, target, { definitions: 'ensure' }));
  const transported = requireResult(readPlan(JSON.stringify(plan)));
  // Successful evaluation may contain an unknown value. Preserve its typed shape.
  console.log(JSON.stringify({
    changed: evaluated.report.totals.lines.changed,
    rawChurn: evaluated.report.totals.raw.churn,
    decision: query.result.value,
    desired: { stage: transported.stage, operations: transported.operations, held: transported.held },
  }, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 2;
}
