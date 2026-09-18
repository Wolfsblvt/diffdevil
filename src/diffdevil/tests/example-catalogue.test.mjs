import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { auditFindings, generatedObservations, validateCaptureTarget, verifyCatalogue } from '../../../tools/examples.mjs';

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const sources = readJson('docs/examples/catalogue/sources.json').sources;

test('catalogue snapshots and generated policy observations replay offline through the shared engine', () => {
  assert.deepEqual(verifyCatalogue(), { examples: 7, variants: 14 });
  assert.equal(
    JSON.stringify(readJson('docs/examples/catalogue/observations.json')),
    JSON.stringify(generatedObservations()),
  );
  const uv = readJson('docs/examples/catalogue/snapshots/uv-8637.json');
  assert.equal(uv.provenance.mergeBase, '7948441121b1d54655caa927b3eaadaf90717327');
  assert.equal(uv.rights.retainedMaterial, 'normalized-report-only');
  assert.equal(uv.material.filter((file) => file.kind === 'binary').length, 6);
});

test('capture refuses a selected merge-base or pull identity mismatch before retaining a snapshot', () => {
  const source = sources['uv-8637'];
  const pull = { base: { sha: source.baseTip }, head: { sha: source.head } };
  assert.throws(
    () => validateCaptureTarget('uv-8637', source, { merge_base_commit: { sha: sources['vite-18968'].mergeBase } }, pull),
    /resolved merge base/u,
  );
  assert.throws(
    () => validateCaptureTarget('uv-8637', source, { merge_base_commit: { sha: source.mergeBase } }, { ...pull, head: { sha: '0'.repeat(40) } }),
    /selected base tip and head/u,
  );
});

test('audit reports engine, provider and merge-base drift without treating a snapshot as current', () => {
  const source = sources['vite-18968'];
  const snapshot = readJson('docs/examples/catalogue/snapshots/vite-18968.json');
  const findings = auditFindings(source, snapshot, {
    baseTip: source.baseTip,
    head: source.head,
    mergeBase: sources['uv-8637'].mergeBase,
  }, '999.0.0');
  assert.deepEqual(findings, ['engine 1.0.0 -> 999.0.0', 'provider merge base moved']);
});
