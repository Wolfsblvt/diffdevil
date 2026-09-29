// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = path => readFileSync(join(root, path), 'utf8');
const chartPath = 'docs/manual/assets/visuals/evidence-thresholds.vl.json';
const diagramPaths = [
  'docs/manual/assets/visuals/trust-boundary.mmd',
  'docs/manual/assets/visuals/selection-boundaries.mmd',
  'docs/manual/assets/visuals/provider-readback.mmd',
];
const renderedNames = [
  'evidence-thresholds-light.svg', 'evidence-thresholds-dark.svg',
  'evidence-thresholds-narrow-light.svg', 'evidence-thresholds-narrow-dark.svg',
  'trust-boundary-light.svg', 'trust-boundary-dark.svg',
  'selection-boundaries-light.svg', 'selection-boundaries-dark.svg',
  'provider-readback-light.svg', 'provider-readback-dark.svg',
];

test('The quantitative source is derived from the retained catalogue editions and configured thresholds', () => {
  const chart = JSON.parse(read(chartPath));
  const sources = JSON.parse(read('docs/examples/catalogue/sources.json')).sources;
  const policies = JSON.parse(read('docs/examples/catalogue/policies.json')).policies;
  const observations = JSON.parse(read('docs/examples/catalogue/observations.json')).observations;
  const observation = variant => observations.find(row => row.entry === 'bounded-decisions' && row.variant === variant);
  const proven = observation('proven');
  const held = observation('held');
  const resolved = observation('resolved');
  assert.ok(proven && held && resolved, 'The three retained bounded-decisions editions must exist.');

  const bounded = chart.data.values.find(row => row.kind === 'bounded');
  const exact = chart.data.values.find(row => row.kind === 'exact');
  assert.deepEqual(
    { sourceId: bounded.sourceId, lower: bounded.lower, upper: bounded.upper },
    { sourceId: proven.source, lower: proven.metrics.focusChanged.lower, upper: proven.metrics.focusChanged.upper },
  );
  assert.deepEqual(
    { sourceId: exact.sourceId, value: exact.value },
    { sourceId: resolved.source, value: resolved.metrics.focusChanged.value },
  );
  assert.deepEqual(held.metrics.focusChanged, proven.metrics.focusChanged);
  assert.equal(proven.bands.focus.id, 'below-12000');
  assert.equal(held.rules.focusBand.disposition, 'held');
  assert.equal(resolved.bands.focus.id, 'at-least-9500');

  const thresholds = [
    policies['prettier-bounded-held'].bands.focus.ranges[0].lt,
    policies['prettier-bounded-proven'].bands.focus.ranges[0].lt,
  ].sort((left, right) => left - right);
  assert.deepEqual(chart.usermeta.policyThresholds, thresholds);
  assert.equal(chart.usermeta.focusPath, policies['prettier-bounded-held'].scopes.focus.includeOnly[0]);

  const boundedSource = sources[bounded.sourceId];
  const exactSource = sources[exact.sourceId];
  assert.equal(boundedSource.repository, exactSource.repository);
  assert.equal(boundedSource.pullRequest, exactSource.pullRequest);
  assert.equal(boundedSource.mergeBase, exactSource.mergeBase);
  assert.equal(boundedSource.head, exactSource.head);
  assert.equal(chart.usermeta.repository, boundedSource.repository);
  assert.equal(chart.usermeta.pullRequest, boundedSource.pullRequest);
  assert.equal(chart.usermeta.baseAndMergeBase, boundedSource.mergeBase);
  assert.equal(chart.usermeta.head, boundedSource.head);

  assert.equal(chart.$schema, 'https://vega.github.io/schema/vega-lite/v6.json');
  assert.equal(chart.data.url, undefined);
  assert.equal(chart.layer.some(layer => layer.data?.url), false);
});

test('Every Mermaid source carries its question and non-visual explanation without executable links', () => {
  for (const path of diagramPaths) {
    const source = read(path);
    assert.match(source, /^\s*(?:flowchart|sequenceDiagram)\b/mu, path);
    assert.match(source, /^\s*accTitle:\s*\S.+$/mu, path);
    assert.match(source, /^\s*accDescr:\s*\S.+$/mu, path);
    assert.doesNotMatch(source, /\bclick\s+|https?:\/\//iu, path);
  }
});

test('The finite asset allow-list and manual homes cover every selected visual variant', () => {
  const assets = JSON.parse(read('apps/manual/assets.json'));
  for (const name of renderedNames) {
    assert.equal(assets[`docs/manual/assets/visuals/rendered/${name}`], `/assets/manual/visuals/${name}`, name);
  }
  const pages = {
    'docs/manual/understand/evidence-and-uncertainty.md': ['evidence-thresholds-light.svg', 'evidence-thresholds-dark.svg', 'evidence-thresholds-narrow-light.svg', 'evidence-thresholds-narrow-dark.svg', 'evidence-thresholds.vl.json'],
    'docs/manual/understand/trust-and-mutation.md': ['trust-boundary-light.svg', 'trust-boundary-dark.svg', 'trust-boundary.mmd'],
    'docs/manual/policy/paths-and-scopes.md': ['selection-boundaries-light.svg', 'selection-boundaries-dark.svg', 'selection-boundaries.mmd'],
    'docs/manual/understand/facts-to-provider-state.md': ['provider-readback-light.svg', 'provider-readback-dark.svg', 'provider-readback.mmd'],
  };
  for (const [path, expected] of Object.entries(pages)) {
    const source = read(path);
    assert.equal((source.match(/<figure class="manual-visual"/gu) ?? []).length, 1, path);
    for (const item of expected) assert.ok(source.includes(item), `${path}: ${item}`);
    assert.match(source, /<figcaption>[^<]+<\/figcaption>/u, path);
  }
});

test('Committed outputs remain safe, complete, and bound to source by their reproducible receipt', () => {
  execFileSync(process.execPath, ['apps/manual/visuals/render.mjs', '--validate'], { cwd: root, stdio: 'pipe' });
  const receipt = JSON.parse(read('docs/manual/assets/visuals/rendered/receipt.json'));
  assert.equal(receipt.outputs.length, renderedNames.length);
  assert.deepEqual(receipt.outputs.map(output => output.path.split('/').at(-1)).sort(), [...renderedNames].sort());
  for (const output of receipt.outputs) {
    const svg = read(output.path);
    assert.match(svg, /<svg\b[^>]*\brole="img"/u, output.path);
    assert.match(svg, /<title\b/u, output.path);
    assert.match(svg, /<desc\b/u, output.path);
    assert.doesNotMatch(svg, /<(?:script|foreignObject)\b|\b(?:href|xlink:href)="(?!#|data:)|url\(\s*["']?https?:|@import/iu, output.path);
  }
});
