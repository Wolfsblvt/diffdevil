import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { findProductNameViolations, findProhibitedProductNames } from '../../tools/product-name-check.mjs';

test('accepts the canonical lowercase product name', () => {
  assert.deepEqual(findProhibitedProductNames('diffdevil for GitHub · diffdevil App'), []);
});

test('rejects every prohibited display spelling', () => {
  const text = 'DiffDevil\nDiffdevil\ndiffDevil\nDiff Devil\nDiff-Devil';
  assert.deepEqual(
    findProhibitedProductNames(text).map((finding) => finding.value),
    ['DiffDevil', 'Diffdevil', 'diffDevil', 'Diff Devil', 'Diff-Devil'],
  );
});

test('allows genuine PascalCase implementation identifiers', () => {
  const source = 'class DiffDevilReport {}\ninterface DiffDevilOptions {}\ncreateDiffDevilReport()';
  assert.deepEqual(findProhibitedProductNames(source), []);
});

test('reports punctuation-bound display names with line and column', () => {
  assert.deepEqual(findProhibitedProductNames('prefix\n  "DiffDevil"'), [{
    value: 'DiffDevil',
    index: 10,
    line: 2,
    column: 4,
  }]);
});

test('scans current copy and preserves historical decisions', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'diffdevil-name-check-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'docs'));
  await writeFile(join(root, 'docs', 'DECISIONS.md'), 'DiffDevil remains in the earlier rationale.\n');
  await writeFile(join(root, 'README.md'), 'DiffDevil is current copy.\n');

  const violations = await findProductNameViolations(root);
  assert.deepEqual(violations.map(({ path, value }) => ({ path, value })), [
    { path: 'README.md', value: 'DiffDevil' },
  ]);
});
