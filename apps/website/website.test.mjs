// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Website data-level tests: the example catalogue evaluates through the shared engine
 * to the semantic outcomes each example claims to teach; shared snapshots are valid
 * engine reports with provenance; the docs manifest names real sources; the browser
 * shims match Node; the site copy resolves its placeholders. Built HTML and browser
 * behaviour are qualified separately by apps/website/qa/run.mjs after a build.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { readReport, unwrap } from '../../dist/lib/index.js';
import { compilePolicy, evaluatePolicy } from '../../dist/lib/policy/index.js';
import { entries, groups } from './docs-manifest.mjs';
import { createHash as shimHash } from './src/shims/node-crypto.mjs';
import { checkSummary } from '../shared/check-summary.mjs';

const read = path => readFileSync(join('.', path), 'utf8');
const catalogue = JSON.parse(read('docs/examples/catalogue/catalogue.json'));
const policies = JSON.parse(read('docs/examples/catalogue/policies.json')).policies;
const sources = JSON.parse(read('docs/examples/catalogue/sources.json')).sources;

test('the website consumes the shared real-PR catalogue, with its complete declared membership and variants', () => {
  assert.equal(catalogue.defaultExample, 'lockfile-scope');
  assert.equal(catalogue.entries.length, 7);
  assert.equal(catalogue.entries.flatMap(entry => entry.variants).length, 16);
  assert.equal(Object.keys(sources).length, 9);
  for (const entry of catalogue.entries) {
    assert.equal(entry.sourceKind, 'real-pr');
    assert.ok(entry.lessons.length > 0);
    for (const variant of entry.variants) {
      const source = sources[variant.source];
      assert.ok(source, `${entry.id}/${variant.id} source`);
      assert.ok(policies[variant.policy], `${entry.id}/${variant.id} policy`);
      const snapshotPath = `docs/examples/catalogue/snapshots/${variant.source}.json`;
      assert.ok(existsSync(snapshotPath), snapshotPath);
      const snapshot = JSON.parse(read(snapshotPath));
      assert.equal(snapshot.kind, 'diffdevil.example-snapshot');
      assert.equal(snapshot.repository, source.repository);
      assert.equal(snapshot.pullRequest, source.pullRequest);
      assert.equal(snapshot.report.source.head, snapshot.provenance.head);
      const result = unwrap(evaluatePolicy(unwrap(compilePolicy(policies[variant.policy])), unwrap(readReport(snapshot.report))));
      assert.equal(result.report.source.repository, source.repository);
    }
  }
  const endpoint = read('apps/website/src/pages/playground/examples/[id].json.ts');
  assert.doesNotMatch(endpoint, /fixtures\.mjs|group: 'fixture'/u);
  assert.match(endpoint, /catalogue\(\)\.variants/u);
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

test('the shared App check summary is the composer both runtimes use', () => {
  const report = unwrap(readReport(JSON.parse(read('docs/examples/reports/exact.json'))));
  assert.match(checkSummary(report, { changed: 1 }), /^Replacement-aware changed lines: \d+/u);
});

test('site copy keeps design placeholders only where the build resolves them', () => {
  const copy = read('apps/website/src/data/copy.ts');
  const placeholders = [...copy.matchAll(/\{origin\}/gu)].length;
  assert.ok(placeholders >= 5, 'the skill instruction and four setup prompts carry {origin}');
  assert.doesNotMatch(copy, /v1\.2\.0|vitejs\/vite #|prettier\/prettier #|astral-sh\/uv #/u, 'illustrative design data must not ship');
  assert.doesNotMatch(copy, /Managed App/u);
});

test('each copied setup prompt is one sentence that names its instructions; the linked Markdown owns the detail', () => {
  const prompts = [...read('apps/website/src/data/copy.ts').matchAll(/^\s+prompt: '([^']+)',$/gmu)].map(match => match[1]);
  assert.equal(prompts.length, 4);
  for (const prompt of prompts) {
    assert.match(prompt, /\{origin\}\/setup\/(cli|actions|app|everything)\.md/u);
    assert.equal(prompt.split(/(?<=[.!?])\s+/u).length, 1, prompt);
  }
});

test('the icon registry maps every semantic name to a glyph that exists in its installed local collection', () => {
  const registry = read('apps/website/src/data/icons.ts');
  const lucide = JSON.parse(read('node_modules/@iconify-json/lucide/icons.json')).icons;
  const brands = JSON.parse(read('node_modules/@iconify-json/simple-icons/icons.json')).icons;
  const map = [...registry.matchAll(/^\s+'?([a-z-]+)'?: '(ui|brand|product):([^']+)',$/gmu)].map(match => ({ name: match[1], route: match[2], id: match[3] }));
  for (const slot of ['search', 'chevron', 'social-links', 'github', 'discord', 'bluesky', 'chrome', 'theme-light', 'theme-dark', 'brand', 'changed', 'raw-churn', 'bands']) assert.ok(map.some(entry => entry.name === slot), slot);
  assert.equal(map.find(entry => entry.name === 'social-links').id, 'waypoints', 'the shared header standard names this glyph');
  for (const entry of map) {
    if (entry.route === 'ui') assert.ok(lucide[entry.id], `lucide:${entry.id}`);
    else if (entry.route === 'brand') assert.ok(brands[entry.id], `simple-icons:${entry.id}`);
    else assert.match(registry, new RegExp(`'${entry.id}': stroked\\(`, 'u'), entry.id);
  }
});

test('install and store actions are configured destinations, never hard-coded in components', () => {
  const site = read('apps/website/src/data/site.ts');
  assert.match(site, /CHROME_WEB_STORE_URL[^\n]+PUBLIC_CHROME_WEB_STORE_URL/u);
  assert.match(site, /APP_INSTALL_URL[^\n]+PUBLIC_APP_INSTALL_URL/u);
  for (const file of ['components/Header.astro', 'components/InstallEntries.astro', 'components/Footer.astro', 'components/home/Hero.astro', 'components/home/Entrances.astro', 'pages/extension.astro']) {
    assert.doesNotMatch(read(`apps/website/src/${file}`), /chromewebstore\.google\.com|github\.com\/apps\//u, file);
  }
});

import { spawnSync } from 'node:child_process';
import { skillVersionOf } from './src/lib/skill-version.mjs';

test('the skill version reader parses Agent Skills front matter (metadata.version) and rejects non-semver', () => {
  assert.equal(skillVersionOf('---\nname: diffdevil\nmetadata:\n  version: "1.0.0"\n---\n# diffdevil\n'), '1.0.0');
  assert.equal(skillVersionOf('---\nversion: 2.3.4-beta.1\n---\nbody'), '2.3.4-beta.1');
  assert.equal(skillVersionOf('---\nmetadata:\n  version: "1.0"\n---\n'), undefined);
  assert.equal(skillVersionOf('# no front matter\nversion: 1.0.0\n'), undefined);
  assert.equal(skillVersionOf('---\nmetadata: [\n---\n'), undefined);
});

test('repository blob links carry the path separator once', () => {
  const site = read('apps/website/src/data/site.ts');
  assert.match(site, /GITHUB_BLOB = `\$\{GITHUB\}\/blob\/main\/`/u);
  assert.match(site, /export function blobUrl\(/u);
  for (const page of ['apps/website/src/pages/examples.astro', 'apps/website/src/pages/app.astro']) {
    assert.doesNotMatch(read(page), /\$\{GITHUB_BLOB\}/u, `${page} must build blob links through blobUrl()`);
  }
});

test('derived website assets are generated from the identity SVGs within their declared framing, and are not tracked', () => {
  const run = spawnSync(process.execPath, ['tools/website-assets.mjs', '--report'], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  const report = JSON.parse(run.stdout);
  for (const [name, frame] of Object.entries(report)) {
    assert.ok(frame.occupancy >= frame.declared[0] && frame.occupancy <= frame.declared[1], `${name} occupancy ${frame.occupancy} within ${frame.declared}`);
    assert.ok(existsSync(join('apps/website/public', frame.file)), frame.file);
  }
  assert.ok(report.githubApp.occupancy > report.webApp.occupancy, 'the GitHub badge frame occupies more of its canvas than the web-manifest frame');
  const tracked = spawnSync('git', ['ls-files', 'apps/website/public'], { encoding: 'utf8' }).stdout.split(/\r?\n/u).filter(Boolean);
  assert.deepEqual(tracked.filter(path => /\.(png|ico)$/u.test(path)), [], 'no raster derivative is committed');
});
