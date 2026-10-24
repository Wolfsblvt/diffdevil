import test from 'node:test';
import assert from 'node:assert/strict';
import { stringify } from 'yaml';
import { compilePolicyText } from '../../../dist/lib/hosts/policy.js';
import { compilePolicy, explainPolicy } from '../../../dist/lib/policy/compile.js';
import { readPolicyJson } from '../../../dist/lib/policy/source.js';
import { readPolicyYaml } from '../../../dist/lib/policy/yaml.js';
import { evaluatePolicy } from '../../../dist/lib/policy/evaluate.js';
import { createPlan } from '../../../dist/lib/policy/plan.js';
import { analyzeDiff } from '../../../dist/lib/report.js';
import { DEFAULT_LIMITS } from '../../../dist/lib/limits.js';
import { unwrap } from '../../../dist/lib/errors.js';

const comment = { mode: 'upsert', templateFile: 'note.md' };
const document = {
  version: 1,
  defaults: { paths: { exclude: ['vendor/**'] } },
  size: { metric: 'raw-churn' },
  rules: {
    first: { when: 'true', effects: { comment } },
    second: { when: 'true', effects: { comment } },
  },
};
const template = 'Raw churn: {{ metrics.review }}';
const report = unwrap(analyzeDiff('diff --git a/a b/a\n--- a/a\n+++ b/a\n@@ -1 +1,2 @@\n-old\n+new\n+added\n'));

test('host and library compilation preserve policy identity, origins and template effects', async () => {
  const options = { paths: { exclude: ['generated/**'], forceInclude: ['vendor/kept.ts'] } };
  for (const [name, text, reader] of [
    ['policy.json', JSON.stringify(document), readPolicyJson],
    ['policy.yml', stringify(document), readPolicyYaml],
  ]) {
    const reads = [];
    const hosted = await compilePolicyText(text, name, options, async path => { reads.push(path); return template; });
    const direct = unwrap(compilePolicy(unwrap(reader(text, { name })), { ...options, templateFiles: { 'note.md': template } }));
    assert.deepEqual(reads, ['note.md']);
    assert.deepEqual(hosted, direct);
    assert.deepEqual(explainPolicy(hosted), explainPolicy(direct));
    assert.deepEqual(explainPolicy(hosted).document.defaults.paths.exclude, ['vendor/**', 'generated/**']);
    assert.deepEqual(hosted.semantics.presets, ['size@1']);
    const result = unwrap(evaluatePolicy(hosted, report));
    assert.deepEqual(result, unwrap(evaluatePolicy(direct, report)));
    const plan = unwrap(createPlan(result, { repository: 'example/repository', pullRequest: 42 }));
    assert.deepEqual(plan.operations.filter(operation => operation.kind === 'comment.reconcile').map(operation => operation.body), ['Raw churn: 3', 'Raw churn: 3']);
  }
});

test('host acquisition counts the policy and each distinct template against the byte limit', async () => {
  const text = JSON.stringify(document);
  const configBytes = new TextEncoder().encode(text + template).byteLength;
  await compilePolicyText(text, 'policy.json', { limits: { ...DEFAULT_LIMITS, configBytes } }, async () => template);
  await assert.rejects(
    compilePolicyText(text, 'policy.json', { limits: { ...DEFAULT_LIMITS, configBytes: configBytes - 1 } }, async () => template),
    error => error.diagnostic?.code === 'E_LIMIT',
  );
});
