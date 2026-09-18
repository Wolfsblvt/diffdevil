// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Website data-level tests: the example catalogue evaluates through the shared engine
 * to the semantic outcomes each example claims to teach; curated snapshots are valid
 * engine reports with provenance; the docs manifest names real sources; the browser
 * shims match Node; the site copy resolves its placeholders. Built HTML and browser
 * behaviour are qualified separately by apps/website/qa/run.mjs after a build.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { analyzeDiff, readReport, unwrap } from '../../dist/lib/index.js';
import { compilePolicy, createPlan, evaluatePolicy, readPolicyYaml } from '../../dist/lib/policy/index.js';
import { fixtures, DEFAULT_FIXTURE } from './catalogue/fixtures.mjs';
import { entries, groups } from './docs-manifest.mjs';
import { createHash as shimHash } from './src/shims/node-crypto.mjs';
import { checkSummary } from '../shared/check-summary.mjs';

const read = path => readFileSync(join('.', path), 'utf8');
const preset = unwrap(compilePolicy({ version: 1, presets: ['size@1'] }));
const evaluateFixture = fixture => {
  const text = read(fixture.source.path);
  const report = fixture.source.kind === 'diff' ? unwrap(analyzeDiff(text)) : unwrap(readReport(JSON.parse(text)));
  const policy = fixture.policy.kind === 'file' ? unwrap(compilePolicy(unwrap(readPolicyYaml(read(fixture.policy.path))).document)) : preset;
  const result = unwrap(evaluatePolicy(policy, report));
  const target = report.source.repository && report.source.pullRequest ? { repository: report.source.repository, pullRequest: report.source.pullRequest } : { repository: 'owner/repo', pullRequest: 1 };
  const plan = createPlan(result, target);
  return { report: result.report, result, plan: plan.ok ? plan.value : undefined, planDiagnostics: plan.ok ? [] : plan.diagnostics };
};
const byId = Object.fromEntries(fixtures.map(f => [f.id, f]));

test('every fixture names an existing asset and the default fixture exists', () => {
  for (const fixture of fixtures) {
    assert.ok(existsSync(fixture.source.path), fixture.source.path);
    if (fixture.policy.kind === 'file') assert.ok(existsSync(fixture.policy.path), fixture.policy.path);
    if (fixture.commentPolicy) assert.ok(existsSync(fixture.commentPolicy.path));
    assert.match(fixture.id, /^[a-z0-9-]+$/u);
  }
  assert.ok(byId[DEFAULT_FIXTURE]);
  assert.equal(new Set(fixtures.map(f => f.id)).size, fixtures.length);
});

test('replacement-once: a replaced line counts once while raw churn stays visible', () => {
  const { report } = evaluateFixture(byId['replacement-once']);
  assert.equal(report.totals.lines.changed.value, 10);
  assert.equal(report.totals.lines.modified.value, 6);
  assert.equal(report.totals.raw.churn.value, 16);
  assert.equal(report.bands.size.id, 'xs');
});

test('lockfile-excluded: observed and included totals differ by the excluded lockfile', () => {
  const { report, plan } = evaluateFixture(byId['lockfile-excluded']);
  assert.equal(report.metrics.review.value, 178);
  assert.equal(report.totals.files.excluded.value, 1);
  assert.equal(report.files.find(f => !f.included).path, 'package-lock.json');
  const observedChurn = report.files.reduce((sum, f) => sum + f.raw.churn.value, 0);
  assert.equal(observedChurn, 1193);
  assert.equal(report.totals.raw.churn.value, 293);
  assert.ok(plan.operations.some(op => op.kind === 'label.select' && op.selected === 'size/M'));
});

test('few-vs-many: two files above one hundred changed lines beside fourteen small ones', () => {
  const { report } = evaluateFixture(byId['few-vs-many']);
  assert.equal(report.totals.files.included.value, 16);
  assert.equal(report.files.filter(f => f.lines.changed.value > 100).length, 2);
  assert.equal(report.bands.size.id, 'm');
});

test('custom-metric-comment: source/test signal evaluates and the comment policy renders one owned comment', () => {
  const fixture = byId['custom-metric-comment'];
  const { report, result, plan } = evaluateFixture(fixture);
  assert.equal(report.metrics.sourceReview.value, 3);
  assert.equal(result.rules.sourceWithoutTests.decision.value, false);
  assert.ok(plan.operations.every(op => op.kind !== 'comment.reconcile'));
  const commentPolicy = unwrap(compilePolicy(unwrap(readPolicyYaml(read(fixture.commentPolicy.path))).document));
  const base = unwrap(analyzeDiff(read(fixture.source.path)));
  const commentPlan = unwrap(createPlan(unwrap(evaluatePolicy(commentPolicy, base)), { repository: 'owner/repo', pullRequest: 1 }));
  const comment = commentPlan.operations.find(op => op.kind === 'comment.reconcile');
  assert.equal(comment.mode, 'upsert');
  assert.match(comment.body, /Replacement-aware changed lines: 10/u);
});

test('bounded-band-proven: an interval inside one band still proves the label', () => {
  const { report, plan } = evaluateFixture(byId['bounded-band-proven']);
  assert.equal(report.totals.lines.changed.status, 'bounded');
  assert.equal(report.bands.size.id, 's');
  assert.ok(plan.operations.some(op => op.kind === 'label.select' && op.selected === 'size/S'));
});

test('incomplete-unknown and binary-unmeasurable: no band is invented; only the declared unknown label may be selected', () => {
  for (const id of ['incomplete-unknown', 'binary-unmeasurable']) {
    const { report, result, plan } = evaluateFixture(byId[id]);
    assert.notEqual(report.totals.lines.changed.status, 'exact', id);
    assert.equal(report.bands.size.status, 'unknown', id);
    assert.deepEqual(report.bands.size.candidates, ['xs', 's', 'm', 'l', 'xl'], id);
    assert.equal(result.rules.size.disposition, 'fallback', id);
    const selected = plan.operations.filter(op => op.kind === 'label.select');
    assert.equal(selected.length, 1, id);
    assert.equal(selected[0].selected, 'size/Unknown', id);
  }
});

test('curated snapshots are engine reports with real provenance and re-evaluate under the preset', () => {
  const dir = 'apps/website/catalogue/curated';
  const files = readdirSync(dir).filter(name => name.endsWith('.json'));
  assert.ok(files.length > 0);
  for (const name of files) {
    const snapshot = JSON.parse(read(join(dir, name)));
    assert.equal(snapshot.kind, 'diffdevil.curated-snapshot');
    assert.equal(snapshot.id, name.replace(/\.json$/u, ''));
    assert.match(snapshot.url, /^https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+$/u);
    assert.match(snapshot.head, /^[0-9a-f]{40}$/u);
    assert.ok(snapshot.reason.length > 20 && snapshot.teaches.length > 20);
    const report = unwrap(readReport(snapshot.report));
    assert.equal(report.source.head, snapshot.head);
    assert.equal(report.source.repository, snapshot.repository);
    assert.equal(snapshot.evidence, report.measurement.status);
    const evaluated = unwrap(evaluatePolicy(preset, report)).report;
    assert.ok(evaluated.bands.size);
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

test('the shared App check summary is the composer both runtimes use', () => {
  const { report } = evaluateFixture(byId['replacement-once']);
  assert.equal(checkSummary(report, { changed: 1 }), 'Replacement-aware changed lines: 10\nRaw churn: 16\nPolicy effects observed: 1');
});

test('site copy keeps design placeholders only where the build resolves them', () => {
  const copy = read('apps/website/src/data/copy.ts');
  const placeholders = [...copy.matchAll(/\{origin\}/gu)].length;
  assert.ok(placeholders >= 5, 'the skill instruction and four setup prompts carry {origin}');
  assert.doesNotMatch(copy, /v1\.2\.0|vitejs\/vite #|prettier\/prettier #|astral-sh\/uv #/u, 'illustrative design data must not ship');
  assert.doesNotMatch(copy, /Managed App/u);
});
