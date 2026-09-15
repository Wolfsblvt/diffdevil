import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analyzeDiff, analyzeChanges, readReport } from '../../../dist/lib/report.js';
import { parsePatch, parseUnifiedDiff } from '../../../dist/lib/sources/patch.js';
import { arithmetic, integer, numberValue, interval, replacementFamily, numericComparison } from '../../../dist/lib/numeric.js';
import { glob, pathMatches, compilePathPolicy, selectPath } from '../../../dist/lib/paths.js';
import { inertCopy } from '../../../dist/lib/inert.js';
import { unwrap } from '../../../dist/lib/errors.js';

const fixture = name => JSON.parse(readFileSync(new URL(`../../../docs/examples/reports/${name}.json`, import.meta.url), 'utf8'));
const changed = patch => unwrap(analyzeDiff(`diff --git a/x b/x\n--- a/x\n+++ b/x\n${patch}`)).totals.lines.changed;
const errorCode = code => error => error?.diagnostic?.code === code;

for (const row of JSON.parse(readFileSync(new URL('../../../src/diffdevil/contracts/detail/v1/conformance/paths.json', import.meta.url))).cases) {
  test(`conformance paths / ${row.id}`, () => {
    const run = () => row.function === 'pathMatches' ? pathMatches(row.file, row.pattern) : glob(row.path, row.pattern);
    if (row.error) assert.throws(run, errorCode(row.error)); else assert.equal(run(), row.expect);
  });
}
test('replacement pairing stops at context, hunks, and files', () => {
  assert.deepEqual(changed('@@ -1,3 +1,3 @@\n-a\n-b\n-c\n+A\n+B\n+C\n'), { status: 'exact', value: 3 });
  assert.deepEqual(changed('@@ -1,2 +1,2 @@\n-a\n context\n+b\n'), { status: 'exact', value: 2 });
  assert.deepEqual(changed('@@ -1 +1,0 @@\n-a\n@@ -5,0 +5 @@\n+b\n'), { status: 'exact', value: 2 });
});
test('unequal replacements preserve raw and mutually exclusive measurements', () => {
  const report = unwrap(analyzeDiff('diff --git a/x b/x\n--- a/x\n+++ b/x\n@@ -1,2 +1,5 @@\n-a\n-b\n+a\n+b\n+c\n+d\n+e\n'));
  assert.deepEqual(Object.fromEntries(Object.entries(report.totals.raw).map(([k, m]) => [k, m.value])), { added: 5, deleted: 2, churn: 7 });
  assert.deepEqual(Object.fromEntries(Object.entries(report.totals.lines).map(([k, m]) => [k, m.value])), { added: 3, deleted: 0, modified: 2, changed: 5 });
});
test('no-newline markers do not split a replacement and --- content is not metadata', () => {
  assert.deepEqual(changed('@@ -1 +1 @@\n---- text\n\\ No newline at end of file\n++++ text\n\\ No newline at end of file\n'), { status: 'exact', value: 1 });
});
for (const [name, text] of Object.entries({ truncated: '@@ -1,2 +1 @@\n-a\n+b\n', excess: '@@ -1 +1 @@\n-a\n+b\n+c\n', malformed: '@@ broken\n-a\n+b\n', combined: '@@@ -1 -1 +1 @@@\n-a\n+b\n', misplacedMarker: '@@ -1 +1 @@\n\\ No newline at end of file\n-a\n+b\n' })) {
  test(`invalid patch refuses ${name}`, () => assert.throws(() => parsePatch(text), errorCode('E_SOURCE')));
}
test('an added file with missing hunks is not silently zero', () => {
  assert.throws(() => parseUnifiedDiff('diff --git a/x b/x\nnew file mode 100644\nindex 0000000..abcdef0\n'), errorCode('E_SOURCE'));
  const files = parseUnifiedDiff('diff --git a/x b/x\nnew file mode 100644\nindex 0000000..e69de29\n');
  assert.equal(files[0].patch.additions, 0);
});
test('pure rename, mode-only changes, binary, and separate type-change patches', () => {
  const report = unwrap(analyzeDiff('diff --git a/a b/b\nsimilarity index 100%\nrename from a\nrename to b\ndiff --git a/m b/m\nold mode 100644\nnew mode 100755\ndiff --git a/img b/img\nindex abcdef0..bcdef01 100644\nBinary files a/img and b/img differ\n'));
  assert.equal(report.files.find(f => f.path === 'b').oldPath, 'a');
  assert.equal(report.files.find(f => f.path === 'm').lines.changed.value, 0);
  assert.equal(report.measurement.status, 'unmeasurable');
  const changedType = unwrap(analyzeDiff('diff --git a/x b/x\ndeleted file mode 100644\n--- a/x\n+++ /dev/null\n@@ -1 +0,0 @@\n-old\ndiff --git a/x b/x\nnew file mode 120000\n--- /dev/null\n+++ b/x\n@@ -0,0 +1 @@\n+target\n'));
  assert.equal(changedType.files[0].changeType, 'type-changed');
  assert.equal(changedType.totals.lines.changed.value, 2);
});
test('quoted Git paths decode octal UTF-8, tabs, and newlines without losing identity', () => {
  const files = parseUnifiedDiff('diff --git "a/\\303\\244\\t\\n.txt" "b/\\303\\244\\t\\n.txt"\nold mode 100644\nnew mode 100755\n');
  assert.equal(files[0].path, 'ä\t\n.txt');
  assert.throws(() => parseUnifiedDiff('diff --git "a/x" "b/x"junk\nold mode 100644\nnew mode 100755\n'), errorCode('E_SOURCE'));
});
test('exact and bounded affine identities share primitive provenance', () => {
  const { lines } = replacementFamily('f', 60, 10);
  assert.deepEqual(arithmetic('+', lines.deleted, lines.modified).measurement, { status: 'exact', value: 10 });
  assert.deepEqual(arithmetic('+', arithmetic('+', lines.added, lines.deleted), lines.modified).measurement, { status: 'bounded', lower: 60, upper: 70 });
  assert.deepEqual(numericComparison('>=', lines.changed, integer(50)), { status: 'resolved', value: true });
  assert.equal(numericComparison('>=', lines.changed, integer(65)).status, 'unknown');
});
test('numeric domain refuses overflow and possible division by zero', () => {
  assert.throws(() => arithmetic('+', integer(Number.MAX_SAFE_INTEGER), integer(1)), errorCode('E_NUMERIC_OVERFLOW'));
  assert.throws(() => arithmetic('/', integer(1), integer(0)), errorCode('E_DIVIDE_ZERO'));
  assert.throws(() => arithmetic('/', integer(1), numberValue(interval(-1, 1))), errorCode('E_POSSIBLE_DOMAIN'));
  assert.deepEqual(arithmetic('%', integer(-5), integer(3)).measurement, { status: 'exact', value: -2 });
  assert.equal(arithmetic('/', integer(5), integer(2)).numericType, 'float');
  assert.equal(numericComparison('==', arithmetic('+', numberValue({ status: 'exact', value: .1 }, 'float'), numberValue({ status: 'exact', value: .2 }, 'float')), numberValue({ status: 'exact', value: .3 }, 'float')).value, false);
});
test('unknown and unmeasurable are not erased by arithmetic', () => {
  const unknown = numberValue({ status: 'unknown', lower: 5, reasons: [{ code: 'FILE_SET_INCOMPLETE' }] });
  assert.deepEqual(arithmetic('+', unknown, integer(2)).measurement, { status: 'unknown', lower: 7, reasons: [{ code: 'FILE_SET_INCOMPLETE' }] });
  assert.equal(arithmetic('-', unknown, unknown).measurement.status, 'unknown');
  const missing = numberValue({ status: 'unmeasurable', reasons: [{ code: 'BINARY_LINES_UNDEFINED' }] });
  assert.equal(arithmetic('*', missing, integer(0)).measurement.status, 'unmeasurable');
});
test('rename selection considers both endpoints; scope boundaries remain hard', () => {
  const file = { path: 'generated/a.cs', oldPath: 'src/a.cs' };
  assert.equal(selectPath(file, compilePathPolicy({ exclude: ['generated/**'] })).included, true);
  assert.equal(selectPath({ path: 'outside/a' }, compilePathPolicy({ includeOnly: ['src/**'], forceInclude: ['outside/**'] })).included, true);
  assert.equal(selectPath({ path: 'outside/a' }, compilePathPolicy({ includeOnly: ['src/**'], forceInclude: ['outside/**'] }), true).included, false);
});
for (const name of ['exact', 'bounded', 'incomplete', 'unmeasurable']) test(`read and freeze supplied ${name} report`, () => {
  const report = unwrap(readReport(fixture(name)));
  assert.equal(report.measurement.status, name === 'incomplete' ? 'unknown' : name);
  assert.ok(Object.isFrozen(report)); assert.ok(Object.isFrozen(report.files[0]));
});
test('report rejects contradicted totals, families, cardinality, and malformed JSON', () => {
  for (const mutate of [r => r.totals.lines.changed.value++, r => r.files[1].lines.modified.value++, r => r.fileSet.total.value++, r => r.files.push(r.files[0]), r => r.source.pullRequest = -1]) {
    const report = fixture('exact'); mutate(report); assert.equal(readReport(report).diagnostics[0].code, 'E_REPORT_INVALID');
  }
  assert.equal(readReport('{').diagnostics[0].code, 'E_REPORT_INVALID');
});
test('report cannot acquire fake exact primitive facts by omitting provenance', () => {
  const report = fixture('exact'); delete report.files[1].family; report.files[1].lines.modified.value++;
  assert.equal(readReport(report).diagnostics[0].code, 'E_REPORT_INVALID');
});
test('normalized source cannot claim complete blocks that omit additions', () => {
  assert.equal(analyzeChanges([{ path: 'x', changeType: 'modified', kind: 'text', additions: 3, deletions: 3, patch: { additions: 3, deletions: 3, blocks: [] } }]).diagnostics[0].code, 'E_SOURCE');
});
test('inert copying refuses getters and proxies without invoking them', () => {
  let calls = 0;
  assert.throws(() => inertCopy({ get x() { calls++; return 3; } }), errorCode('E_REPORT_INVALID'));
  assert.throws(() => inertCopy(new Proxy({}, { ownKeys() { calls++; return []; } })), errorCode('E_REPORT_INVALID'));
  assert.equal(calls, 0);
  assert.throws(() => inertCopy(JSON.parse('{"__proto__":{}}')), errorCode('E_REPORT_INVALID'));
});
