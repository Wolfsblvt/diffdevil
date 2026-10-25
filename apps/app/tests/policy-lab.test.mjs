// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyzeChanges, compilePolicy, explainPolicy, unwrap } from '@wolfsblvt/diffdevil';
import { policyLab, policyDecisions } from '../src/lib/policy-lab.mjs';
import { record, from, to } from '../../github-app/analytical-data.fixtures.mjs';

function fixture(document = { version: 1, presets: ['size@1'] }, records = [record(), record(2, null)]) {
  const compiled = unwrap(compilePolicy(document));
  const policy = { id: compiled.id, compiled, document: explainPolicy(compiled).document,
    origin: 'trusted-base', trustedHead: 'a'.repeat(40), sourceIdentity: '.diffdevil.yml@aaa', provenance: {} };
  const args = { repository: { repositoryId: 17, fullName: 'owner/repo' }, from, to,
    policies: { current: async () => policy }, store: { analyticalRecords: async () => records }, canRead: async () => true };
  return { args, policy, records };
}

test('Community band experiment compares the same retained final merges and accounts for every row', async () => {
  const f = fixture();
  const original = structuredClone(f.records);
  const first = await policyLab(f.args);
  assert.equal(first.same, 1); assert.equal(first.unavailable, 1);
  const result = await policyLab({ ...f.args, input: { basis: first.basis, decision: first.decision.key, metric: first.decision.metric, limits: [0.5, 2, 3, 4] } });
  assert.equal(result.changed, 1);
  assert.equal(result.results.find(row => row.pullRequest === 1).proposed, 's');
  assert.equal(result.results.find(row => row.pullRequest === 2).reason, 'missing-retained-comparison');
  assert.equal(result.changed + result.same + result.unavailable, result.basis.population);
  assert.equal(result.transitions.reduce((sum, cell) => sum + cell.count, 0), result.changed + result.same);
  assert.match(result.adoption.patch, /bands:/u);
  assert.equal(result.providerMutationsReplayed, false);
  assert.deepEqual(f.records, original);
});

test('one existing threshold changes matched disposition without adopting its effects', async () => {
  const f = fixture({ version: 1, metrics: { changed: { measure: 'lines.changed' } }, rules: {
    review: { when: 'metrics.changed >= 2', effects: { labels: { add: ['review'] } } }, complex: { when: 'metrics.changed > 0 && metrics.changed < 5' }
  } });
  assert.ok(policyDecisions(f.policy.document).some(decision => decision.key === 'rule:review'));
  assert.ok(!policyDecisions(f.policy.document).some(decision => decision.key === 'rule:complex'));
  const result = await policyLab({ ...f.args, input: { decision: 'rule:review', metric: 'metrics.changed', threshold: 1 } });
  assert.equal(result.changed, 1);
  assert.equal(result.results[0].previous, 'unmatched'); assert.equal(result.results[0].proposed, 'matched');
  assert.deepEqual(result.classes, ['unmatched', 'matched']);
  assert.match(result.adoption.after, /metrics.changed >= 1/u);
});

test('incompatible, missing and crossing evidence cannot become zero or a precise cell', async () => {
  const f = fixture();
  const incompatible = structuredClone(record(3)); incompatible.final.report.schemaVersion = '999.0';
  f.records.push(incompatible);
  const bounded = structuredClone(record(4));
  bounded.final.report.totals.lines.changed = { status: 'bounded', lower: 0, upper: 100, reasons: [{ code: 'PARTIAL' }] };
  // A malformed retained report is incompatible, never a fabricated classification.
  f.records.push(bounded);
  const result = await policyLab(f.args);
  assert.equal(result.basis.population, 4);
  assert.ok(result.unavailable >= 2);
  assert.ok(result.reasons.some(row => row.reason === 'incompatible-report-or-policy-version'));
  assert.equal(result.changed + result.same + result.unavailable, 4);
});

test('real bounded replacement evidence resolves only when both classifications are proven', async () => {
  const report = unwrap(analyzeChanges([{ path: 'a.txt', changeType: 'modified', kind: 'text', additions: 60, deletions: 10 }],
    { source: { kind: 'github-api', comparison: 'direct', comparisonId: 'bounded', base: 'a'.repeat(40), head: 'b'.repeat(40) } }));
  const f = fixture({ version: 1, metrics: { changed: { measure: 'lines.changed' } }, rules: { review: { when: 'metrics.changed >= 50' } } }, [record(1, report)]);
  const crossing = await policyLab({ ...f.args, input: { decision: 'rule:review', metric: 'metrics.changed', threshold: 65 } });
  assert.equal(crossing.unavailable, 1); assert.equal(crossing.reasons[0].reason, 'insufficient-or-crossing-bounded-evidence');
  const proven = await policyLab({ ...f.args, input: { decision: 'rule:review', metric: 'metrics.changed', threshold: 80 } });
  assert.equal(proven.changed, 1); assert.equal(proven.results[0].metric.status, 'bounded');
  assert.equal(proven.results[0].previous, 'matched'); assert.equal(proven.results[0].proposed, 'unmatched');
});

test('failed policy and changed head have distinct unavailable/superseded results', async () => {
  const f = fixture(), initial = await policyLab(fixture().args);
  f.policy.trustedHead = 'b'.repeat(40);
  const superseded = await policyLab({ ...f.args, input: { basis: initial.basis } });
  assert.equal(superseded.standing, 'superseded'); assert.equal(superseded.results, undefined);
  f.policy.compiled = null; f.policy.reason = 'trusted-policy-unavailable';
  const failed = await policyLab(f.args);
  assert.equal(failed.standing, 'unavailable'); assert.equal(failed.basis.population, 2);
  assert.equal(failed.results, undefined);
});

test('access lost after the asynchronous reads refuses the whole experiment', async () => {
  const f = fixture(); let reads = 0;
  await assert.rejects(policyLab({ ...f.args, canRead: async () => ++reads === 1 }), { code: 'E_POLICY_LAB_ACCESS' });
});

test('a newly imported comparison supersedes the pinned population instead of silently changing its denominator', async () => {
  const f = fixture(), initial = await policyLab(f.args);
  f.records.push(record(3));
  const result = await policyLab({ ...f.args, input: { basis: initial.basis } });
  assert.equal(result.standing, 'superseded');
  assert.notEqual(result.basis.populationId, initial.basis.populationId);
});

test('invalid complete band sets and unretained metric input are rejected by the real contract', async () => {
  const f = fixture();
  await assert.rejects(policyLab({ ...f.args, input: { decision: 'band:size', limits: [5, 2, 3, 4] } }));
  await assert.rejects(policyLab({ ...f.args, input: { decision: 'band:size', metric: 'files.secret', limits: [1, 2, 3, 4] } }), { code: 'E_POLICY_LAB_METRIC' });
});
