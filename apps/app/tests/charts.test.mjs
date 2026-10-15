// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * Chart Grammar v1.1 models and readouts: the same functions the server renders from and the
 * browser explains with. These cases pin the evidence rules (unknown is not zero, partial reads
 * `≥`, an open interval is never printed as a point, bounded reads a range, medians are
 * interval-aware, Unknown stays out of the size shares, small samples say so), the log-axis fit of
 * time to merge and the table equivalence of every model. The premium file charts and the cloud are
 * tested with the extension (premium/tests/charts.premium.test.mjs).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mosaicModel, flowModel, ttmModel, mixModel, lifecycleModel, lanesModel, developmentModel, heroModel, coverageOf } from '../src/lib/charts/models.mjs';
import { readoutOf, readoutHtml, readoutText, tableOf, tableHtml, teachOf, skeletonHtml } from '../src/lib/charts/readout.mjs';
import { fmtDur, tickDur, signed, turnoverText, rangeText, uniqueSuffix, niceMax } from '../src/lib/charts/format.mjs';

const NOW = '2026-10-09T14:00:00.000Z';
const DAY = 86_400_000;
const at = daysAgo => new Date(Date.parse(NOW) - daysAgo * DAY).toISOString();
const exact = value => ({ status: 'exact', lower: value, upper: value });
const bounded = (lower, upper) => ({ status: 'bounded', lower, upper });
const pr = ({ number, opened, merged, ready = null, changed = exact(40), band = 's', unrecovered = false }) => ({ number, repositoryId: 1, state: 'merged', unrecovered, title: `PR ${number}`,
  lifecycle: { openedAt: at(opened), readyAt: ready === null ? null : at(ready), mergedAt: at(merged), closedAt: at(merged) }, latest: { changed, band: { id: band, standing: 'current' } } });

test('formatting reads durations, signs and turnover the way the grammar does', () => {
  assert.equal(fmtDur(0.02), '<1 h');
  assert.equal(fmtDur(0.75), '18 h');
  assert.equal(fmtDur(2.66), '2.7 d');
  assert.equal(fmtDur(21), '3.0 w');
  assert.equal(tickDur(0.5), '12 h');
  assert.equal(tickDur(14), '2 w');
  assert.equal(signed(0), '±0');
  assert.equal(signed(-3), '−3');
  assert.equal(turnoverText(0.05, 0.05), '0.05×');
  assert.equal(turnoverText(1.2, 1.8), '1.2×–1.8×');
  // An unknown upper end is open, never a point.
  assert.equal(rangeText(120, null), '≥ 120');
  assert.equal(rangeText(120, 120), '120');
  assert.equal(rangeText(120, 180), '120–180');
  assert.equal(turnoverText(0.4, null), '≥ 0.4×');
  assert.equal(turnoverText(0.04, null), '≥ 0.04×');
  assert.equal(uniqueSuffix('src/parser.ts', ['src/parser.ts', 'tests/parser.ts']), 'src/parser.ts');
  assert.equal(uniqueSuffix('src/ast.ts', ['src/ast.ts', 'tests/parser.ts']), 'ast.ts');
  assert.equal(niceMax(730), 800);
});

test('the mosaic keeps unknown and partial buckets honest in readout and table', () => {
  const buckets = [
    { count: 3, recovered: 3, added: 10, deleted: 5, modified: 20, boundedLow: 0, boundedHigh: 0, boundedCount: 0, rawChurn: 60 },
    { count: 2, recovered: 1, added: 4, deleted: 0, modified: 6, boundedLow: 0, boundedHigh: 0, boundedCount: 0, rawChurn: 16 },
    { count: 1, recovered: 0, added: 0, deleted: 0, modified: 0, boundedLow: 0, boundedHigh: 0, boundedCount: 0, rawChurn: 0 },
    { count: 2, recovered: 2, added: 2, deleted: 2, modified: 2, boundedLow: 30, boundedHigh: 70, boundedCount: 1, rawChurn: 90 }
  ];
  const model = mosaicModel({ buckets, unit: 'week', period: '30 days', labelOf: (_, index) => `w${index}`, nameOf: (_, index) => `Week ${index}`, hrefOf: (_, index) => `/history?w=${index}` });
  assert.equal(model.rows[1].coverage, 'partial');
  assert.equal(model.rows[2].coverage, 'none');
  const partial = readoutOf(model, 1);
  assert.equal(partial.vals.find(value => value.cls === 'sum').value, '≥ 10');
  assert.ok(partial.tags.some(tag => tag.text === 'partial · 1/2 recovered'));
  const none = readoutOf(model, 2);
  assert.equal(none.vals.find(value => value.cls === 'sum').value, 'unknown');
  assert.equal(none.vals.find(value => value.label === 'raw churn').value, 'unknown');
  const boundedRow = readoutOf(model, 3);
  assert.equal(boundedRow.vals.find(value => value.cls === 'sum').value, '36–76');
  assert.equal(boundedRow.vals.find(value => value.key === 'unres').value, '30–70');
  const summary = readoutOf(model, null);
  assert.ok(summary.tags.some(tag => tag.text === '6 of 8 merged PRs recovered'));
  const html = readoutHtml(summary, { hint: true });
  assert.match(html, /hover or ← → to inspect/u);
  const table = tableOf(model);
  assert.equal(table.rows.length, 4);
  assert.equal(table.rows[2][5].text, 'unknown');
  assert.deepEqual(table.rows[2].slice(2, 7).map(cell => cell.text), ['unknown', 'unknown', 'unknown', 'unknown', 'unknown']);
  assert.deepEqual(table.rows[1].slice(2, 7).map(cell => cell.text), ['≥ 6', '≥ 4', '≥ 0', '≥ 10', '≥ 16']);
  assert.equal(table.rows[1][7].text, 'partial 1/2');
  assert.match(tableHtml(table), /<caption class="visually-hidden">Change volume<\/caption>/u);
  assert.match(teachOf(model), /hatch = bounded/u);
});

test('uncovered empty buckets stay unknown while complete measured zero stays zero', () => {
  const zero = { count: 0, recovered: 0, modified: 0, added: 0, deleted: 0, rawChurn: 0 };
  const model = mosaicModel({ buckets: [{ ...zero, covered: false }, zero], unit: 'day', period: '7 days', labelOf: (_, i) => String(i), nameOf: (_, i) => String(i) });
  assert.deepEqual(tableOf(model).rows[0].slice(2, 7).map(cell => cell.text), Array(5).fill('unknown'));
  assert.match(tableOf(model).rows[0][7].text, /partial window/u);
  assert.equal(tableOf(model).rows[0][1].text, '≥ 0');
  assert.deepEqual(tableOf(model).rows[1].slice(2, 7).map(cell => cell.text), Array(5).fill('0'));
  assert.ok(readoutOf(model, 0).vals.every(value => value.value === 'unknown'));
  assert.equal(readoutOf(model, null).vals.find(value => value.cls === 'sum').value, 'unknown');
});

test('the flow readout names net and the backlog; the table carries the same columns', () => {
  const weeks = Array.from({ length: 3 }, (_, index) => ({ opened: 4 + index, merged: 3, closed: 1, openAtEnd: 6 + index, analysed: 5, covered: index > 0 }));
  const model = flowModel({ weeks, period: '90 days', labelOf: (_, index) => `wk${index}`, hrefOf: () => null });
  const summary = readoutOf(model, null);
  assert.equal(summary.vals.find(value => value.cls === 'sum').value, '+3');
  assert.equal(summary.vals.find(value => value.key === 'openline').value, '8');
  assert.ok(readoutOf(model, 0).tags.some(tag => /lower bounds/u.test(tag.text)));
  assert.deepEqual(tableOf(model).columns.map(column => column.label), ['week of', 'opened', 'merged', 'closed unmerged', 'net', 'open at end', 'analysed']);
});

test('time to merge by size fits a log axis, names the slowest size by its ≥3 rule and flags a slower small sample', () => {
  const prs = [
    ...Array.from({ length: 6 }, (_, index) => pr({ number: index, opened: 10 + index, merged: 9 + index - index * 0.1, band: 'xs' })),
    ...Array.from({ length: 4 }, (_, index) => pr({ number: 10 + index, opened: 20 + index, merged: 17 + index, band: 'm' })),
    pr({ number: 20, opened: 40, merged: 30, band: 'xl' })
  ];
  const model = ttmModel({ prs, period: '30 days', hrefOf: band => (band ? `/prs?band=${band}` : '/prs') });
  assert.equal(model.rows[0].key, 'all');
  assert.deepEqual(model.rows.slice(1).map(row => row.key), ['xs', 'm', 'xl']);
  assert.equal(model.slowest.label, 'M');
  assert.equal(model.slowerSmall.label, 'XL');
  assert.ok(model.lo < model.rows[0].min && model.hi > model.rows[0].max, 'the axis fits the data with air');
  const summary = readoutOf(model, null);
  assert.ok(summary.tags.some(tag => /XL .* only 1 PR/u.test(tag.text)));
  assert.equal(summary.vals.find(value => value.label === 'slowest size · ≥3 PRs').value, 'M · 3.0 d');
  const xl = readoutOf(model, 3);
  assert.ok(xl.tags.some(tag => tag.text === 'few PRs · read loosely'));
  assert.match(teachOf(model), /logarithmic/u);
  assert.equal(readoutOf(ttmModel({ prs: [], period: '7 days' }), null).vals[0].value, 'n/a');
});

test('the size mix keeps Unknown out of the shares and counts unrecovered PRs aside', () => {
  const prs = [pr({ number: 1, opened: 3, merged: 2, band: 'xs', changed: exact(10) }), pr({ number: 2, opened: 3, merged: 2, band: 'xs', changed: exact(14) }), pr({ number: 3, opened: 4, merged: 2, band: 'm', changed: exact(200) }), pr({ number: 4, opened: 4, merged: 2, band: 'unknown', changed: bounded(90, 130) })];
  const model = mixModel({ prs, period: '30 days', lost: 2, hrefOf: band => `/prs?band=${band ?? ''}` });
  assert.equal(model.known, 3);
  const unknownRow = model.rows.find(row => row.key === 'unknown');
  assert.equal(unknownRow.share, null);
  assert.equal(readoutOf(model, model.rows.indexOf(unknownRow)).vals.find(value => value.label === 'median Changed').value, '90–130', 'a bounded-only row reads its interval, not "bounded"');
  const summary = readoutOf(model, null);
  assert.equal(summary.vals.find(value => value.cls === 'sum').value, 'XS · 67%');
  assert.ok(summary.tags.some(tag => tag.text === '2 not recovered · not counted'));
  assert.equal(readoutOf(model, model.rows.indexOf(unknownRow)).vals.find(value => value.label === 'share').value, 'not in share');
  assert.equal(tableOf(model).rows.length, 3);
});

test('the size mix median includes bounded PRs, through the same median as the period tiles', () => {
  // The bounded PRs are the largest; an exact-only median read 20 here.
  const changes = [exact(10), exact(20), exact(30), bounded(400, 900), { status: 'unknown', lower: 600, upper: null }];
  const prs = changes.map((changed, index) => pr({ number: index + 1, opened: 3, merged: 1, band: index < 2 ? 'xs' : index === 2 ? 's' : 'l', changed }));
  const pathless = mixModel({ prs, period: '30 days', basis: 'pathless' });
  assert.equal(readoutOf(pathless, null).vals.find(value => value.label === 'median Changed').value, '≥ 30', 'nearest-rank intervals are open above when a member is');
  const retained = mixModel({ prs, period: '30 days', basis: 'retained' });
  assert.equal(readoutOf(retained, null).vals.find(value => value.label === 'median Changed').value, '30', 'the service envelope proves the median is exactly the third value');
  const large = mixModel({ prs: prs.slice(3), period: '30 days', basis: 'pathless' });
  assert.equal(readoutOf(large, large.rows.findIndex(row => row.key === 'l')).vals.find(value => value.label === 'median Changed').value, '≥ 400', 'a row of bounded PRs reads ≥ a, not "bounded"');
  assert.equal(readoutOf(large, large.rows.findIndex(row => row.key === 'l')).vals.find(value => value.label === 'smallest · largest').value, '400 · ≥ 600');
});

test('lifecycle by size reports stage medians and the median total separately', () => {
  const prs = [pr({ number: 1, opened: 6, ready: 4, merged: 1, band: 's' }), pr({ number: 2, opened: 5, ready: null, merged: 2, band: 's' }), pr({ number: 3, opened: 9, ready: 8, merged: 3, band: 'l' })];
  const model = lifecycleModel({ prs, period: '30 days', hrefOf: () => null });
  const all = readoutOf(model, 0);
  assert.equal(all.vals.find(value => value.label === 'started as draft').value, '67%');
  assert.equal(all.vals.find(value => value.cls === 'sum').value, '5.0 d');
  assert.ok(readoutOf(model, 1).tags.some(tag => tag.text === 'few PRs · read loosely'));
  assert.match(teachOf(model), /stage medians do not add up/u);
});

test('lanes keep unrecovered PRs hollow and development names a label transition', () => {
  const lanes = lanesModel({ prs: [pr({ number: 7, opened: 5, merged: 2, band: 'm' }), pr({ number: 8, opened: 5, merged: 1, band: 'm', unrecovered: true, changed: { status: 'unknown', lower: 0, upper: null } })], period: '30 days', from: at(30), to: NOW, range: null, hrefOf: entry => `/pr/x/y/${entry.number}`, repoOf: () => 'y' });
  assert.equal(lanes.bands.length, 1);
  assert.equal(lanes.rows[1].hollow, true);
  assert.equal(readoutOf(lanes, 1).vals[0].value, 'not recovered');
  assert.equal(readoutOf(lanes, null).vals[0].value, '2');
  const development = developmentModel({ heads: [{ head: 'abc1234567', observedAt: at(3), changed: exact(80), band: { id: 's' } }, { head: 'def1234567', observedAt: at(1), changed: exact(140), band: { id: 'm' } }], now: NOW });
  assert.equal(development.rows[1].transition, 'S → M');
  const latest = readoutOf(development, null);
  assert.ok(latest.tags.some(tag => tag.text === 'current'));
  assert.equal(latest.vals.find(value => value.label === 'vs previous').value, '+60');
});

test('development deltas preserve bounded and unknown evidence instead of subtracting lower bounds', () => {
  const development = developmentModel({ heads: [
    { head: 'abc1234567', observedAt: at(3), changed: bounded(2240, 4335) },
    { head: 'def1234567', observedAt: at(1), changed: bounded(2240, 4335) },
    { head: 'ghi1234567', observedAt: at(0), changed: { status: 'unknown', lower: null, upper: null } },
  ], now: NOW });

  assert.deepEqual(development.rows[1].changedFrom, { status: 'bounded', lower: -2095, upper: 2095 });
  const boundedReadout = readoutOf(development, 1);
  assert.equal(boundedReadout.vals.find(value => value.label === 'Changed').value, '2240–4335');
  assert.equal(boundedReadout.vals.find(value => value.label === 'vs previous').value, '−2095–+2095');
  assert.equal(boundedReadout.vals.find(value => value.label === 'since opened').value, '−2095–+2095');
  assert.equal(boundedReadout.vals.find(value => value.label === 'Changed').cls, 'sum range');
  assert.ok(boundedReadout.vals.filter(value => value.label === 'vs previous' || value.label === 'since opened').every(value => value.cls === 'range'));
  assert.equal(readoutOf(development, 0).vals.find(value => value.label === 'since opened').value, '±0', 'the first observed head is compared with the same measurement as its baseline');

  const asymmetric = { ...development, rows: development.rows.map((row, index) => index === 1 ? { ...row, changedFrom: { status: 'bounded', lower: -2095, upper: 1234 } } : row) };
  assert.equal(readoutOf(asymmetric, 1).vals.find(value => value.label === 'vs previous').value, '−2095–+1234');

  const unknownReadout = readoutOf(development, 2);
  assert.equal(unknownReadout.vals.find(value => value.label === 'vs previous').value, 'unknown');
  assert.equal(unknownReadout.vals.find(value => value.label === 'since opened').value, 'unknown');
});

test('the hero model accumulates both periods and the skeletons come in the chart\'s shape', () => {
  const hero = heroModel({ current: [1, 0, 2], previous: [0, 1, 1], from: at(3), days: 3, comparable: true, kindWord: 'merged' });
  assert.deepEqual(hero.rows.map(row => [row.cur, row.prev]), [[1, 0], [1, 1], [3, 2]]);
  assert.match(skeletonHtml('mosaic'), /sk-bars/u);
  assert.match(skeletonHtml('ttm'), /sk-rows/u);
  assert.equal(coverageOf(2, 0), 'none');
  assert.equal(readoutText({ when: 'Week 1', tags: [{ text: 'partial' }], vals: [{ label: 'Changed', value: '≥ 10' }] }), 'Week 1 · partial · Changed ≥ 10');
});
