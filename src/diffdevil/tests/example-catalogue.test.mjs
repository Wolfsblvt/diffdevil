import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  auditFindings,
  generatedObservations,
  validateCaptureTarget,
  verifyCatalogue,
} from '../../../tools/examples.mjs';

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const sources = readJson('docs/examples/catalogue/sources.json').sources;
const snapshot = (id) => readJson(`docs/examples/catalogue/snapshots/${id}.json`);
const file = (id, path) => snapshot(id).report.files.find((entry) => entry.path === path);

test('real-PR catalogue snapshots and policy observations replay offline through the shared engine', () => {
  assert.deepEqual(verifyCatalogue(), { examples: 7, variants: 16, sources: 9 });
  assert.equal(
    JSON.stringify(readJson('docs/examples/catalogue/observations.json')),
    JSON.stringify(generatedObservations()),
  );
  assert.equal(Object.values(sources).every((source) => source.kind === 'curated-pr'), true);

  const uv = snapshot('uv-8637');
  assert.equal(uv.provenance.mergeBase, '7948441121b1d54655caa927b3eaadaf90717327');
  assert.equal(uv.rights.retainedMaterial, 'normalized-report-only');
  assert.equal(uv.material.filter((entry) => entry.kind === 'binary').length, 6);
});

test('real PR editions replace the former spread, bounded, and incomplete catalogue fixtures', () => {
  const rustMany = snapshot('rust-66820');
  const rustFew = snapshot('rust-136978');
  assert.equal(rustMany.report.totals.files.total.value, 51);
  assert.equal(rustFew.report.totals.files.total.value, 6);
  assert.equal(rustMany.report.totals.raw.churn.value, 5561);
  assert.equal(rustFew.report.totals.raw.churn.value, 5524);

  const focusPath = 'tests/format/js/ternaries/__snapshots__/jsfmt.spec.js.snap';
  assert.deepEqual(file('prettier-13183-rest', focusPath).lines.changed, {
    status: 'bounded',
    lower: 8679,
    upper: 11330,
  });
  assert.deepEqual(file('prettier-13183', focusPath).lines.changed, {
    status: 'exact',
    value: 9603,
  });

  const incomplete = snapshot('cmake-docs-2-compare');
  const complete = snapshot('cmake-docs-2-files');
  assert.equal(incomplete.provider.complete, false);
  assert.equal(incomplete.provider.observedCount, 300);
  assert.equal(incomplete.report.fileSet.total.value, 2171);
  assert.equal(complete.provider.complete, true);
  assert.equal(complete.provider.observedCount, 2171);
  assert.equal(complete.report.files.length, 2171);
});

test('capture refuses a selected merge-base or pull identity mismatch before retaining a snapshot', () => {
  const source = sources['uv-8637'];
  const pull = {
    base: { sha: source.baseTip },
    head: { sha: source.head },
    changed_files: source.expectedChangedFiles,
  };
  assert.throws(
    () => validateCaptureTarget(
      'uv-8637',
      source,
      { merge_base_commit: { sha: sources['vite-18968'].mergeBase } },
      pull,
    ),
    /resolved merge base/u,
  );
  assert.throws(
    () => validateCaptureTarget(
      'uv-8637',
      source,
      { merge_base_commit: { sha: source.mergeBase } },
      { ...pull, head: { sha: '0'.repeat(40) } },
    ),
    /selected base tip and head/u,
  );
});

test('audit reports engine, provider and merge-base drift without treating a snapshot as current', () => {
  const source = sources['vite-18968'];
  const retained = snapshot('vite-18968');
  const findings = auditFindings(source, retained, {
    baseTip: source.baseTip,
    head: source.head,
    mergeBase: sources['uv-8637'].mergeBase,
  }, '999.0.0');
  assert.deepEqual(findings, ['engine 1.0.0 -> 999.0.0', 'provider merge base moved']);
});
