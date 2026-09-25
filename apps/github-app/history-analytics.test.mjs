// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import Ajv2020 from 'ajv/dist/2020.js';
import { BASELINE_ORDINAL_BELOW, createHistoryAnalyticsService } from './history-analytics.mjs';

const exact = value => ({ status: 'exact', value });
const bounded = (minimum, maximum) => ({ status: 'bounded', minimum, maximum });
const admin = { userId: 'admin', authorizedRepositoryIds: [17] };
const guest = { userId: 'guest', authorizedRepositoryIds: [] };
const request = (family, overrides = {}) => ({ version: 1, repositoryId: 17, from: '2026-09-01T00:00:00.000Z', to: '2026-10-01T00:00:00.000Z',
  family, metric: { kind: 'total', name: 'changed', scope: 'policy-included' }, ...overrides });
function record(pullRequest, comparisonId, observedAt, value, policyId = 'policy-a', rule = 'unmatched') {
  return { repositoryId: 17, pullRequest, comparisonId, policyId, schemaVersion: 4, engineVersion: 'engine-build',
    reportVersion: 'report-v1', metricVersion: 'metrics-v1', base: 'abc', head: 'def', observedAt,
    projection: { evidence: value.status, totals: { lines: { changed: value }, raw: { churn: value } } },
    fileSet: { complete: true, total: exact(1), included: exact(1) },
    results: { metrics: [{ metric: 'custom', result: value }], scopes: [{ ref: 'scope', fileSet: { total: exact(1) }, totals: { lines: { changed: value } } }],
      bands: [{ ref: 'size', status: 'resolved', id: 'small' }], rules: [{ ref: 'rule', disposition: rule }] },
    gaps: [], files: [{ lines: { changed: value }, raw: { churn: value }, inclusion: 'included' }],
    effects: [{ kind: 'label.add', rule: 'rule', band: 'small', outcome: 'changed', readback: 'verified' }] };
}
function fixture() {
  const rows = [record(1, 'old', '2026-09-03T00:00:00.000Z', exact(3)),
    record(1, 'new', '2026-09-06T00:00:00.000Z', exact(12)),
    record(2, 'bounded', '2026-09-07T00:00:00.000Z', bounded(30, 50), 'policy-a', 'matched'),
    record(3, 'unknown', '2026-09-08T00:00:00.000Z', { status: 'unknown' }, 'policy-a', 'matched')];
  const permissions = [];
  const store = { historySettings: async () => ({ enabled: true }),
    historyWindow: async (id, from, to, policy) => rows.filter(row => row.repositoryId === id && row.observedAt >= from && row.observedAt < to && (!policy || row.policyId === policy)),
    historyOperations: async () => ({ attempts: [{ started_at: '2026-09-07T00:00:00.000Z', completed_at: '2026-09-07T00:00:02.000Z', state: 'complete' }],
      deliveries: [{ received_at: '2026-09-07T00:00:00.000Z', duplicate_count: 1, state: 'complete' }], repairs: [] }),
    saveHistoryLens: async (_id, lens) => { store.saved = lens; }, historyLenses: async () => [store.saved], removeHistoryLens: async () => {},
    exportHistory: async id => ({ kind: 'diffdevil.github-app-history-export', version: 2, exportedAt: '2026-09-20T00:00:00.000Z', repositoryId: id,
      records: [], fileRows: [], effectRows: [], tombstones: [] }) };
  const service = createHistoryAnalyticsService({ store, authorize: async value => { permissions.push(value); return value.actor?.userId === 'admin'; } });
  return { service, rows, permissions };
}

test('representative distribution keeps bounded and unknown PRs in nearest-rank populations', async () => {
  const { service } = fixture();
  const result = await service.query(request('distribution'), admin);
  assert.equal(result.overview.uniquePullRequests, 3);
  assert.equal(result.overview.analyzedRevisions, 4);
  assert.equal(result.overview.representative, 'latest-observed-in-window');
  assert.deepEqual(result.result.population, { total: 3, exact: 1, finiteBounded: 1, unknownUnbounded: 1 });
  assert.deepEqual(result.result.quantiles[0], { p: 0.5, lower: null, upper: null });
  assert.equal(result.result.exactOnlyPartial.length, 1);
  assert.equal(result.overview.coverage.completeWindow, false);
});

test('finite interval quantiles enclose the whole representative population', async () => {
  const { service, rows } = fixture();
  rows[3].projection.totals.lines.changed = bounded(60, 90);
  const result = await service.query(request('distribution'), admin);
  assert.deepEqual(result.result.population, { total: 3, exact: 1, finiteBounded: 2, unknownUnbounded: 0 });
  assert.deepEqual(result.result.quantiles[0], { p: 0.5, lower: 30, upper: 50 });
});

test('all-observed change on an incomplete file set is a lower bound', async () => {
  const { service, rows } = fixture();
  rows[1].fileSet.complete = false;
  const result = await service.query(request('distribution', { metric: { kind: 'total', name: 'changed', scope: 'all-observed' } }), admin);
  assert.equal(result.result.population.exact, 0);
  assert.equal(result.result.quantiles[0].upper, null);
});

test('all chart families, small-sample baseline and compatibility preserve their claim boundaries', async () => {
  const { service, rows } = fixture();
  assert.equal((await service.query(request('concentration'), admin)).result.length, 3);
  assert.equal((await service.query(request('trajectories'), admin)).result[0].revisions.length, 2);
  assert.ok((await service.query(request('occurrence'), admin)).result.some(row => row.kind === 'effect-readback'));
  assert.equal((await service.query(request('operations'), admin)).result.executionAttempts, 1);
  assert.equal((await service.query(request('operations'), admin)).result.duplicateReceipts, 1);
  const baseline = await service.baseline(request('distribution', { current: exact(20), currentIdentity: { reportVersion: 'report-v1', metricVersion: 'metrics-v1', policyId: 'policy-a' } }), admin);
  assert.equal(baseline.n, 3);
  assert.equal(baseline.presentation, 'ordinal');
  assert.equal(baseline.percentileInterval, null);
  assert.equal(BASELINE_ORDINAL_BELOW, 20);
  rows[2].policyId = 'policy-b';
  assert.equal((await service.compare(request('distribution'), request('distribution'), admin)).comparable, false);
  const filteredBaseline = await service.baseline(request('distribution', { current: exact(20), currentIdentity: { reportVersion: 'report-v1', metricVersion: 'metrics-v1', policyId: 'policy-a' } }), admin);
  assert.equal(filteredBaseline.n, 2);
  assert.equal(filteredBaseline.incompatible, 1);
  const allObserved = request('distribution', { metric: { kind: 'total', name: 'changed', scope: 'all-observed' } });
  assert.equal((await service.compare(allObserved, allObserved, admin)).comparable, true);
  const partialAccess = await service.compare(request('distribution'), request('distribution', { repositoryId: 18 }), admin);
  assert.deepEqual(partialAccess.authorizationCoverage, { requested: 2, authorized: 1, represented: 1 });
  assert.equal(partialAccess.right, null);
  assert.equal(partialAccess.comparable, false);
});

test('Policy Lab changes only compatible exact numeric results and refuses path-sensitive replay', async () => {
  const { service } = fixture();
  const proposal = { version: 1, metric: { kind: 'total', name: 'changed', scope: 'policy-included' },
    operator: 'gte', threshold: 10, ruleRef: 'rule', reportVersion: 'report-v1', metricVersion: 'metrics-v1', policyId: 'policy-a' };
  const result = await service.policyLab(request('distribution'), proposal, admin);
  assert.equal(result.population, 3);
  assert.equal(result.changed, 1);
  assert.equal(result.insufficientEvidence, 2);
  assert.equal(result.providerMutationsReplayed, false);
  const bands = await service.policyLab(request('distribution'), { version: 1, kind: 'band', metric: proposal.metric,
    bandRef: 'size', ranges: [{ id: 'small', minimum: 0, maximum: 10 }, { id: 'large', minimum: 10, maximum: 100 }],
    otherwise: 'unknown', reportVersion: 'report-v1', metricVersion: 'metrics-v1', policyId: 'policy-a' }, admin);
  assert.equal(bands.resultKind, 'band');
  assert.equal(bands.changed, 1);
  await assert.rejects(service.policyLab(request('distribution'), { ...proposal, pathSensitive: true }, admin), { code: 'E_POLICY_LAB_UNSUPPORTED' });
});

test('shared saved query lenses and numeric export stay behind repository authorization', async () => {
  const { service, permissions } = fixture();
  await assert.rejects(service.query(request('overview'), guest), { code: 'E_HISTORY_UNAUTHORIZED' });
  await assert.rejects(service.query(request('overview', { repositoryId: 18 }), admin), { code: 'E_HISTORY_UNAUTHORIZED' });
  await service.saveLens(17, { version: 1, id: 'large', name: 'Configured change', query: request('distribution', { metric: { kind: 'configured', ref: 'custom' } }) }, admin);
  assert.equal((await service.lenses(17, admin))[0].query.metric.ref, 'custom');
  const chart = await service.lens({ repositoryId: 17, lensId: 'large' }, admin);
  assert.deepEqual(chart.historicalCoverage, { representativeCount: 3, evaluated: 3, missing: 0 });
  assert.equal(chart.result.family, 'distribution');
  await service.saveLens(17, { version: 1, id: 'rule-occurrence', query: request('occurrence', { metric: undefined }),
    focus: { kind: 'rule', ref: 'rule' } }, admin);
  const occurrences = await service.lens({ repositoryId: 17, lensId: 'rule-occurrence' }, admin);
  assert.equal(occurrences.result.result.every(value => value.kind === 'rule' && value.ref === 'rule'), true);
  await assert.rejects(service.saveLens(17, { version: 1, id: 'bad/path', query: request('distribution') }, admin), { code: 'E_HISTORY_REFERENCE' });
  await assert.rejects(service.saveLens(17, { version: 1, id: 'code', query: request('distribution'), expression: 'process.exit()' }, admin), { code: 'E_HISTORY_LENS' });
  assert.equal((await service.exportNumeric(17, admin)).version, 2);
  assert.ok(permissions.some(value => value.kind === 'export' && value.repositoryId === 17));
});

test('versioned result schema accepts executable specimens for every query family and decision result', async () => {
  const schema = JSON.parse(await readFile(new URL('./contracts/history-result-v1.schema.json', import.meta.url), 'utf8'));
  const querySchema = JSON.parse(await readFile(new URL('./contracts/history-query-v1.schema.json', import.meta.url), 'utf8'));
  const lensSchema = JSON.parse(await readFile(new URL('./contracts/history-lens-v1.schema.json', import.meta.url), 'utf8'));
  const ajv = new Ajv2020({ strict: false });
  const queryValid = ajv.compile(querySchema), lensValid = ajv.compile(lensSchema), resultValid = ajv.compile(schema);
  const { service } = fixture();
  for (const family of ['overview', 'distribution', 'concentration', 'trajectories', 'occurrence', 'operations']) {
    assert.equal(queryValid(request(family)), true, JSON.stringify(queryValid.errors));
    const result = await service.query(request(family), admin);
    assert.equal(resultValid(result), true, `${family}: ${JSON.stringify(resultValid.errors)}`);
  }
  const baseline = await service.baseline(request('distribution', { current: exact(20), currentIdentity: { reportVersion: 'report-v1', metricVersion: 'metrics-v1', policyId: 'policy-a' } }), admin);
  const proposal = { version: 1, metric: { kind: 'total', name: 'changed', scope: 'policy-included' },
    operator: 'gte', threshold: 10, ruleRef: 'rule', reportVersion: 'report-v1', metricVersion: 'metrics-v1', policyId: 'policy-a' };
  await service.saveLens(17, { version: 1, id: 'large', query: request('distribution', { metric: { kind: 'configured', ref: 'custom' } }) }, admin);
  assert.equal(lensValid((await service.lenses(17, admin))[0]), true, JSON.stringify(lensValid.errors));
  for (const result of [baseline, await service.compare(request('distribution'), request('distribution'), admin),
    await service.policyLab(request('distribution'), proposal, admin),
    await service.lens({ repositoryId: 17, lensId: 'large' }, admin), await service.exportNumeric(17, admin)])
    assert.equal(resultValid(result), true, `${result.kind}: ${JSON.stringify(resultValid.errors)}`);
});
