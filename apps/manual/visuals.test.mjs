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

test('The quantitative source preserves the retained editions, thresholds, and immutable provenance', () => {
  const chart = JSON.parse(read(chartPath));
  assert.equal(chart.$schema, 'https://vega.github.io/schema/vega-lite/v6.json');
  assert.equal(chart.data.url, undefined);
  assert.deepEqual(chart.data.values.map(row => ({ sourceId: row.sourceId, kind: row.kind, lower: row.lower, upper: row.upper, value: row.value })), [
    { sourceId: 'prettier-13183-rest', kind: 'bounded', lower: 8679, upper: 11330, value: undefined },
    { sourceId: 'prettier-13183', kind: 'exact', lower: undefined, upper: undefined, value: 9603 },
  ]);
  assert.deepEqual(chart.usermeta.policyThresholds, [9500, 12000]);
  assert.equal(chart.usermeta.repository, 'prettier/prettier');
  assert.equal(chart.usermeta.pullRequest, 13183);
  assert.equal(chart.usermeta.baseAndMergeBase, 'f25a592f571257cef4847e27820e86945c7fcb68');
  assert.equal(chart.usermeta.head, 'c7d5925715a31d3c83073e03de1b90673776b691');
  assert.equal(chart.usermeta.focusPath, 'tests/format/js/ternaries/__snapshots__/jsfmt.spec.js.snap');
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
