import assert from 'node:assert/strict';
import test from 'node:test';
import { findProhibitedProductNames } from '../../tools/product-name-check.mjs';

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
