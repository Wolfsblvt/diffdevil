// SPDX-License-Identifier: AGPL-3.0-only
/** Data-level evidence for the docs-owned website and Playground catalogue. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { analyzeDiff, readReport, unwrap } from '../../dist/lib/index.js';
import { compilePolicy, evaluatePolicy } from '../../dist/lib/policy/index.js';
import { entries, groups } from './docs-manifest.mjs';
import { createHash as shimHash } from './src/shims/node-crypto.mjs';

const read = path => readFileSync(path, 'utf8');
const catalogue = JSON.parse(read('docs/examples/catalogue/catalogue.json'));
const sources = JSON.parse(read('docs/examples/catalogue/sources.json')).sources;
const policies = JSON.parse(read('docs/examples/catalogue/policies.json')).policies;
const reportFor = source => {
  if (source.kind === 'unified-diff') return unwrap(analyzeDiff(read(source.path)));
  if (source.kind === 'report') return unwrap(readReport(JSON.parse(read(source.path))));
  return unwrap(readReport(JSON.parse(read(`docs/examples/catalogue/snapshots/${source.id}.json`)).report));
};

test('the seven selected examples are one complete, unique catalogue with usable direct variants', () => {
  assert.equal(catalogue.entries.length, 7);
  assert.equal(new Set(catalogue.entries.map(entry => entry.id)).size, 7);
  assert.ok(catalogue.entries.some(entry => entry.id === catalogue.defaultExample));
  for (const entry of catalogue.entries) {
    assert.equal(entry.guide.length, 3, entry.id);
    assert.ok(entry.guide.every(paragraph => paragraph.length > 40), entry.id);
    assert.ok(entry.variants.length > 0, entry.id);
    assert.equal(new Set(entry.variants.map(variant => variant.id)).size, entry.variants.length, entry.id);
    for (const variant of entry.variants) {
      assert.ok(sources[variant.source], `${entry.id}/${variant.id} source`);
      assert.ok(policies[variant.policy], `${entry.id}/${variant.id} policy`);
    }
  }
});

test('every selected source replays through the shared engine and its named policy without GitHub', () => {
  for (const entry of catalogue.entries) for (const variant of entry.variants) {
    const source = { ...sources[variant.source], id: variant.source };
    const report = reportFor(source);
    const policy = unwrap(compilePolicy(policies[variant.policy]));
    const result = unwrap(evaluatePolicy(policy, report));
    assert.ok(result.report.measurement.status, `${entry.id}/${variant.id}`);
  }
});

test('the two equal-total controlled patches preserve their different file distributions', () => {
  const concentrated = reportFor(sources['spread-concentrated']);
  const distributed = reportFor(sources['spread-distributed']);
  assert.equal(concentrated.totals.lines.changed.value, 24);
  assert.equal(distributed.totals.lines.changed.value, 24);
  assert.equal(concentrated.files.length, 2);
  assert.equal(distributed.files.length, 12);
});

test('all four real snapshots retain exact comparison identity, a merge-base and normalized-report-only rights record', () => {
  const expected = ['vite-18968', 'runtime-105380', 'prettier-13183', 'uv-8637'];
  const files = readdirSync('docs/examples/catalogue/snapshots').filter(name => name.endsWith('.json')).map(name => name.replace(/\.json$/u, '')).sort();
  assert.deepEqual(files, [...expected].sort());
  for (const id of expected) {
    const snapshot = JSON.parse(read(`docs/examples/catalogue/snapshots/${id}.json`));
    assert.equal(snapshot.kind, 'diffdevil.example-snapshot');
    assert.equal(snapshot.provenance.baseTip, sources[id].baseTip);
    assert.equal(snapshot.provenance.head, sources[id].head);
    assert.match(snapshot.provenance.mergeBase, /^[0-9a-f]{40}$/u);
    assert.equal(snapshot.provenance.rights.retainedMaterial, 'normalized-report-only');
    assert.equal(snapshot.provenance.rights.headNoticeSha, sources[id].noticeSha);
    assert.equal(unwrap(readReport(snapshot.report)).source.head, sources[id].head);
  }
});

test('the docs manifest names existing sources, unique slugs, and no internal record', () => {
  const slugs = new Set();
  for (const entry of entries) {
    if (!entry.optional) assert.ok(existsSync(entry.source), entry.source);
    assert.ok(!slugs.has(entry.slug), `duplicate slug ${entry.slug}`);
    slugs.add(entry.slug);
    assert.doesNotMatch(entry.source, /VISION|DIRECTION|DECISIONS|QUALIFICATION|PUBLICATION-BOUNDARY|reference\//u, entry.source);
  }
  assert.ok(groups.some(group => group.label === 'Get started'));
});

test('the browser SHA-256 shim matches Node for the identities the engine derives', () => {
  for (const input of ['', 'abc', JSON.stringify({ a: 1, b: [1, 2, 3] }), 'ü'.repeat(1000)]) {
    assert.equal(shimHash('sha256').update(input).digest('hex'), createHash('sha256').update(input).digest('hex'));
  }
});
