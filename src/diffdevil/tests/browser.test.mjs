import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { analyzeBrowserInput, compileBrowserPolicy, humanReport, comparisonKey, appStanding, measurementText, requiredTemplates } from '../../../dist/lib/browser/index.js';
import { createHash as portableHash } from '../../../dist/lib/browser/runtime/crypto.js';
const identity = { host: 'github.com', repository: 'test/project', pullRequest: 7, base: 'a'.repeat(40), head: 'b'.repeat(40), changedFiles: 1 };
const patch = 'diff --git a/src/a.ts b/src/a.ts\n--- a/src/a.ts\n+++ b/src/a.ts\n@@ -1,2 +1,3 @@\n-old\n+new\n+extra\n same\n';
const unwrap = result => { assert.equal(result.ok, true, JSON.stringify(result.diagnostics)); return result.value; };
const report = (text = patch, comparison = identity, complete = true) => unwrap(analyzeBrowserInput(JSON.stringify({ comparison, format: 'diff', text, complete })));
const policy = input => unwrap(compileBrowserPolicy(JSON.stringify({ mode: 'composed', personal: 'version: 1\n', ...input })));
const view = (input = report(), config = policy(), path) => unwrap(humanReport(input, config, path));
test('browser facts use the existing replacement-lines engine', () => {
  const result = view(); assert.equal(result.changed.value, 2); assert.equal(result.added.value, 1); assert.equal(result.modified.value, 1); assert.equal(result.deleted.value, 0); assert.equal(result.raw.churn.value, 3);
  assert.equal(result.rails[0].selected, 'xs'); assert.equal(result.rails[0].label, 'size/XS');
});
test('file-count evidence is required before an aggregate becomes exact', () => {
  const { changedFiles, ...unknown } = identity; const result = report(patch, unknown);
  assert.equal(result.fileSet.complete, false); assert.equal(result.totals.lines.changed.status, 'unknown'); assert.equal(result.totals.lines.changed.lower, 2);
});
test('cutting cleanly at a file boundary preserves missing-file uncertainty', () => {
  const result = report(patch, { ...identity, changedFiles: 2 }); assert.equal(result.fileSet.complete, false); assert.equal(result.totals.lines.changed.status, 'unknown');
});
test('mismatching independent raw counters do not bless partial hunks', () => {
  const result = report(patch, { ...identity, additions: 200, deletions: 1 }); assert.notEqual(result.files[0].lines.changed.status, 'exact'); assert.equal(result.files[0].measurement.reasons[0].code, 'BROWSER_COUNTER_MISMATCH');
});
test('independently confirmed empty comparison is exactly zero', () => {
  const result = report('', { ...identity, changedFiles: 0 }); assert.deepEqual(result.totals.lines.changed, { status: 'exact', value: 0 });
});
test('truncation never manufactures exact zero', () => {
  const result = report(patch.replace('+extra\n same\n', ''), identity); assert.equal(result.totals.lines.changed.status, 'unknown'); assert.equal(result.fileSet.complete, false);
});
test('a known transport cut downgrades the final observed file', () => { assert.notEqual(report(patch, identity, false).files[0].lines.changed.status, 'exact'); });
test('invalid repository, SHA, duplicate file, and HTML source fail closed', () => {
  assert.throws(() => comparisonKey({ ...identity, repository: '../x' })); assert.throws(() => comparisonKey({ ...identity, head: 'main' }));
  for (const text of [patch + patch, '<html>sign in</html>']) assert.equal(analyzeBrowserInput(JSON.stringify({ comparison: identity, format: 'diff', complete: true, text })).ok, false);
});
test('provider omitted patches use shared bounds rather than guessed modified counts', () => {
  const result = unwrap(analyzeBrowserInput(JSON.stringify({ comparison: identity, complete: true, format: 'github-files', files: [{ filename: 'a.ts', status: 'modified', additions: 7, deletions: 5, changes: 12 }] })));
  assert.equal(result.files[0].lines.changed.status, 'bounded'); assert.equal(result.files[0].lines.changed.lower, 7); assert.equal(result.files[0].lines.changed.upper, 12);
});
test('binary material stays unmeasurable and selects no band', () => {
  const result = view(report('diff --git a/a.png b/a.png\nindex 1111111..2222222 100644\nBinary files a/a.png and b/a.png differ\n'));
  assert.equal(result.changed.status, 'unmeasurable'); assert.equal(measurementText(result.changed), '∅'); assert.equal(result.rails[0].selected, undefined);
});
test('file projection classifies its own facts, not the aggregate tier', () => {
  const input = report(patch + patch.replaceAll('src/a.ts', 'src/b.ts'), { ...identity, changedFiles: 2 });
  const config = policy({ personal: 'version: 1\nsize:\n  thresholds: {xs: 2, s: 4, m: 10, l: 20}\n' });
  assert.equal(view(input, config).rails[0].selected, 'm'); assert.equal(view(input, config, 'src/a.ts').rails[0].selected, 's');
});
test('excluded file keeps real measurements but no classification', () => {
  const result = view(report(), policy({ personal: 'version: 1\ndefaults:\n  paths:\n    exclude: ["src/**"]\n' }), 'src/a.ts');
  assert.equal(result.focus.included, false); assert.equal(result.changed.value, 2); assert.deepEqual(result.rails, []);
});
test('custom band count is not fixed to five cells', () => {
  const config = policy({ personal: 'version: 1\npresets: []\nmetrics:\n  review: {measure: lines.changed}\nbands:\n  effort:\n    value: metrics.review\n    ranges: [{id: tiny, lt: 2}, {id: other, otherwise: true}]\n' });
  assert.equal(view(report(), config).rails[0].cells.length, 2); assert.equal(view(report(), config).rails[0].selected, 'other');
});
test('higher convenience metric replaces lower explicit declaration without dialect conflict', () => {
  const config = policy({ personal: 'version: 1\nmetrics:\n  review: {measure: lines.changed}\n', repository: 'version: 1\nsize:\n  metric: raw.churn\n' });
  assert.equal(view(report(), config).report.metrics.review.value, 3); assert.equal(config.origins.find(item => item.path === '/metrics/review').layer, 'repository');
});
test('implicit repository preset does not reset personal thresholds', () => {
  const config = policy({ personal: 'version: 1\nsize:\n  thresholds: {xs: 2, s: 4, m: 10, l: 20}\n', repository: 'version: 1\nqueries:\n  review: {expression: "totals.lines.changed"}\n' });
  assert.equal(view(report(), config).rails[0].selected, 's');
});
test('explicit no-preset removes inherited preset declarations', () => {
  assert.deepEqual(view(report(), policy({ repository: 'version: 1\npresets: []\n' })).rails, []);
});
test('an override cannot conceal malformed lower repository policy', () => {
  const result = compileBrowserPolicy(JSON.stringify({ mode: 'composed', personal: 'version: 1\n', repository: 'version: 1\nmetrics:\n  review: {measure: wrong}\n', override: 'version: 1\nmetrics:\n  review: {measure: lines.changed}\n' })); assert.equal(result.ok, false);
});
test('personal-only deliberately bypasses invalid repository policy and permits a local override', () => {
  const result = policy({ mode: 'personal-only', repository: 'broken: [', override: 'version: 1\nsize:\n  metric: raw.churn\n' }); assert.equal(view(report(), result).report.metrics.review.value, 3);
});
test('repository mode ignores personal and per-repository overrides when repository policy exists', () => {
  const result = policy({ mode: 'repository', personal: 'broken: [', repository: 'version: 1\n', override: 'broken: [' }); assert.deepEqual(result.layers, ['repository']);
});
test('named declarations replace rather than merging measure with formula', () => {
  const result = policy({ personal: 'version: 1\nmetrics:\n  review: {formula: "totals.raw.churn"}\n', repository: 'version: 1\nmetrics:\n  review: {measure: lines.changed}\n' }); assert.deepEqual({ ...result.document.metrics.review }, { measure: 'lines.changed' });
});
test('invalid policy leaves an inspectable factual report without rails', () => {
  const result = unwrap(humanReport(report(), undefined, undefined, [{ code: 'E_CONFIG', severity: 'error', phase: 'config', message: 'Invalid policy' }])); assert.equal(result.changed.value, 2); assert.deepEqual(result.rails, []); assert.equal(result.errors.length, 1);
});
test('trusted templates are explicit inputs and discovered without network calls', () => {
  const input = { mode: 'personal-only', personal: 'version: 1\nrules:\n  note:\n    when: "true"\n    effects:\n      comment: {mode: upsert, templateFile: .github/note.md}\n' };
  assert.deepEqual(unwrap(requiredTemplates(JSON.stringify(input))), ['.github/note.md']); assert.equal(compileBrowserPolicy(JSON.stringify(input)).ok, false);
  assert.equal(compileBrowserPolicy(JSON.stringify({ ...input, templateFiles: { '.github/note.md': 'Changed: {{ totals.lines.changed }}' } })).ok, true);
});
test('portable SHA-256 identities agree with Node across block boundaries and Unicode', () => {
  for (const text of ['', 'abc', '🐺 tree house', 'a'.repeat(55), 'a'.repeat(56), 'a'.repeat(64), 'z'.repeat(10000)]) assert.equal(portableHash('sha256').update(text).digest('hex'), createHash('sha256').update(text).digest('hex'));
  assert.equal(portableHash('sha256').update('ab').update('c').digest('hex'), createHash('sha256').update('abc').digest('hex')); assert.throws(() => portableHash('md5'));
});
test('App matching requires exact report, policy and version identities', () => {
  const local = { kind: 'diffdevil.browser-report', version: 1, comparison: identity, reportId: 'r', policyDigest: 'p', engine: '1', schema: '1', measurement: '1', presenter: '1' };
  assert.equal(appStanding(local), 'local'); assert.equal(appStanding(local, local), 'matching');
  assert.equal(appStanding(local, { ...local, policyDigest: 'other' }), 'policy-mismatch'); assert.equal(appStanding(local, { ...local, comparison: { ...identity, head: 'c'.repeat(40) } }), 'stale');
  for (const key of ['engine', 'schema', 'measurement', 'presenter', 'reportId']) assert.equal(appStanding(local, { ...local, [key]: 'other' }), 'incompatible');
});
