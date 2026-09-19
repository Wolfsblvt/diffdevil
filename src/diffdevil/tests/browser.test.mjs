import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeUnifiedDiff, unavailableBrowserReport, compileBrowserPolicy, buildHumanReportView, buildUnclassifiedView,
  browserTemplatePaths, assessAppReport, measurementText, comparisonKey } from '../../../dist/lib/browser/index.js';

const identity = { host: 'github.com', repository: 'example/project', pullRequest: 42, base: 'a'.repeat(40), head: 'b'.repeat(40) };
const patch = 'diff --git a/src/a.ts b/src/a.ts\nindex 1111111..2222222 100644\n--- a/src/a.ts\n+++ b/src/a.ts\n@@ -1,3 +1,4 @@\n-old\n+new\n keep\n tail\n+added\n';
const read = result => { assert.equal(result.ok, true, JSON.stringify(result.diagnostics)); return result.value; };
const defaults = { name: 'personal defaults', yaml: 'version: 1\n' };
const policy = extra => read(compileBrowserPolicy({ mode: 'composed', personal: defaults, ...extra }));
const report = () => read(analyzeUnifiedDiff(patch, identity, { files: 1, additions: 2, deletions: 1 }));

test('browser uses replacement-aware facts and keeps raw churn separate', () => {
  const view = read(buildHumanReportView(report(), policy()));
  assert.deepEqual(view.changed, { status: 'exact', value: 2 });
  assert.deepEqual(view.modified, { status: 'exact', value: 1 });
  assert.deepEqual(view.addedOnly, { status: 'exact', value: 1 });
  assert.deepEqual(view.raw.churn, { status: 'exact', value: 3 });
  assert.equal(view.report.source.base, identity.base);
  assert.equal(view.bands[0].selected, 'xs');
  assert.equal(view.bands[0].mappedLabel, 'size/XS');
});

test('a syntactically complete diff without file-set evidence is not exact aggregate proof', () => {
  const result = read(analyzeUnifiedDiff(patch, identity));
  assert.equal(result.fileSet.complete, false);
  assert.equal(result.totals.lines.changed.status, 'unknown');
  assert.equal(result.totals.lines.changed.lower, 2);
});

test('a response cut cleanly at a file boundary retains unseen-file uncertainty', () => {
  const result = read(analyzeUnifiedDiff(patch, identity, { files: 2 }));
  assert.equal(result.fileSet.complete, false);
  assert.deepEqual(result.fileSet.total, { status: 'exact', value: 2 });
  assert.equal(result.totals.lines.changed.status, 'unknown');
});

test('counter disagreement does not bless apparently complete file hunks', () => {
  const result = read(analyzeUnifiedDiff(patch, identity, { files: 1, additions: 400, deletions: 1 }));
  assert.equal(result.files[0].lines.changed.status, 'unknown');
  assert.equal(result.files[0].measurement.reasons[0].code, 'GITHUB_DIFF_COUNTER_MISMATCH');
});

test('truncated hunks and invalid identities fail rather than guessing', () => {
  assert.equal(analyzeUnifiedDiff(patch.replace('+added\n', ''), identity, { files: 1 }).ok, false);
  assert.throws(() => comparisonKey({ ...identity, base: 'main' }));
  assert.throws(() => comparisonKey({ ...identity, repository: '../x' }));
  assert.equal(analyzeUnifiedDiff(patch, identity, { files: 0 }).ok, false);
});

test('unavailable source has unknown Changed, never a fabricated zero', () => {
  const result = read(unavailableBrowserReport(identity, 'FETCH_UNAVAILABLE', 9));
  assert.equal(result.fileSet.complete, false);
  assert.equal(result.totals.lines.changed.status, 'unknown');
});

test('empty but independently confirmed diff is exactly zero', () => {
  const result = read(analyzeUnifiedDiff('', identity, { files: 0, additions: 0, deletions: 0 }));
  assert.deepEqual(result.totals.lines.changed, { status: 'exact', value: 0 });
});

test('composed policy replaces named declarations, retains unrelated entries and records leaf provenance', () => {
  const personal = { name: 'personal', yaml: 'version: 1\nmetrics:\n  review:\n    formula: "totals.raw.churn"\n  spare:\n    measure: lines.added\n' };
  const repository = { name: '.diffdevil.yml@base', yaml: 'version: 1\nmetrics:\n  review:\n    measure: lines.changed\n' };
  const result = policy({ personal, repository });
  assert.deepEqual({ ...result.effective.metrics.review }, { measure: 'lines.changed' });
  assert.ok(result.effective.metrics.spare);
  assert.deepEqual(result.origins.find(origin => origin.path === '/metrics/review/measure'), {
    path: '/metrics/review/measure', layer: '.diffdevil.yml@base', replaces: 'personal',
  });
});

test('repository mode ignores personal overrides when repository policy exists', () => {
  const result = policy({ mode: 'repository', repository: { name: 'repository', yaml: 'version: 1\nsize:\n  metric: raw.churn\n' }, override: { name: 'override', yaml: 'version: 1\nsize:\n  metric: lines.deleted\n' } });
  assert.deepEqual(result.layers, ['repository']);
  assert.equal(read(buildHumanReportView(report(), result)).report.metrics.review.value, 3);
});

test('personal-only deliberately bypasses invalid repository policy; composed does not', () => {
  const input = { personal: defaults, repository: { name: 'repository', yaml: 'version: 1\nnoSuchKey: true\n' } };
  assert.equal(compileBrowserPolicy({ mode: 'composed', ...input }).ok, false);
  assert.equal(compileBrowserPolicy({ mode: 'personal-only', ...input }).ok, true);
});

test('a valid override cannot conceal a malformed repository declaration', () => {
  assert.equal(compileBrowserPolicy({ mode: 'composed', personal: defaults,
    repository: { name: 'repository', yaml: 'version: 1\nmetrics:\n  review:\n    measure: "not-a-measure"\n' },
    override: { name: 'override', yaml: 'version: 1\nmetrics:\n  review:\n    measure: lines.changed\n' },
  }).ok, false);
});

test('per-file policy is evaluated over file facts, not copied from the PR band', () => {
  const custom = policy({ personal: { name: 'personal', yaml: 'version: 1\nsize:\n  thresholds: {xs: 2, s: 4, m: 10, l: 20}\n' } });
  const second = patch.replaceAll('src/a.ts', 'src/b.ts');
  const aggregate = read(analyzeUnifiedDiff(patch + second, identity, { files: 2 }));
  assert.equal(read(buildHumanReportView(aggregate, custom)).bands[0].selected, 'm');
  assert.equal(read(buildHumanReportView(aggregate, custom, 'src/a.ts')).bands[0].selected, 's');
});

test('excluded file keeps its actual measurements without pretending zero-policy size', () => {
  const custom = policy({ personal: { name: 'personal', yaml: 'version: 1\ndefaults:\n  paths:\n    exclude: ["src/**"]\n' } });
  const view = read(buildHumanReportView(report(), custom, 'src/a.ts'));
  assert.equal(view.included, false);
  assert.equal(view.changed.value, 2);
  assert.deepEqual(view.bands, []);
});

test('custom band count and labels come from the policy, not five hard-coded squares', () => {
  const custom = policy({ personal: { name: 'personal', yaml: 'version: 1\npresets: []\nmetrics:\n  review: {measure: lines.changed}\nbands:\n  effort:\n    value: metrics.review\n    ranges: [{id: tiny, lt: 2}, {id: bigger, otherwise: true}]\n' } });
  const view = read(buildHumanReportView(report(), custom));
  assert.equal(view.bands[0].cells.length, 2);
  assert.equal(view.bands[0].selected, 'bigger');
  assert.equal(view.bands[0].mappedLabel, undefined);
});

test('binary facts are unmeasurable, including the visible value and unresolved rail', () => {
  const binary = 'diff --git a/logo.png b/logo.png\nindex 1111111..2222222 100644\nBinary files a/logo.png and b/logo.png differ\n';
  const result = read(analyzeUnifiedDiff(binary, identity, { files: 1 }));
  const view = read(buildHumanReportView(result, policy()));
  assert.equal(view.changed.status, 'unmeasurable');
  assert.equal(measurementText(view.changed), '∅');
  assert.equal(view.bands[0].selected, undefined);
});

test('invalid policy leaves a readable factual report with no virtual band', () => {
  const view = read(buildUnclassifiedView(report(), [{ code: 'E_CONFIG', phase: 'config', severity: 'error', message: 'Invalid policy.' }]));
  assert.equal(view.changed.value, 2);
  assert.equal(view.policy.mode, 'invalid');
  assert.deepEqual(view.bands, []);
  assert.equal(view.diagnostics.length, 1);
});

test('template declarations are discovered as inert paths and compiled only with trusted content', () => {
  const input = { mode: 'composed', personal: { name: 'personal', yaml: 'version: 1\nrules:\n  note:\n    when: "true"\n    effects:\n      comment:\n        mode: upsert\n        templateFile: .github/note.md\n' } };
  assert.deepEqual(read(browserTemplatePaths(input)), ['.github/note.md']);
  assert.equal(compileBrowserPolicy(input).ok, false);
  assert.equal(compileBrowserPolicy({ ...input, templateFiles: { '.github/note.md': 'Changed: {{ totals.lines.changed }}' } }).ok, true);
});

test('App checkmark means exact matching identities, never guessed from a comment', () => {
  const localPolicy = policy();
  const view = read(buildHumanReportView(report(), localPolicy));
  const envelope = { kind: 'diffdevil.browser-app-report', version: 1, comparison: identity, engineVersion: '1.0.0', policyId: view.policy.id, report: view.report };
  assert.equal(assessAppReport(identity, view.policy.id, '1.0.0', envelope).kind, 'exact');
  assert.equal(assessAppReport(identity, 'other', '1.0.0', envelope).kind, 'policy-mismatch');
  assert.equal(assessAppReport({ ...identity, head: 'c'.repeat(40) }, view.policy.id, '1.0.0', envelope).kind, 'stale');
  assert.equal(assessAppReport(identity, view.policy.id, '2.0.0', envelope).kind, 'incompatible');
  assert.equal(assessAppReport(identity, view.policy.id, '1.0.0', { ...envelope, policyId: 'forged' }).kind, 'incompatible');
  assert.equal(assessAppReport(identity, view.policy.id, '1.0.0', null).kind, 'local');
});
