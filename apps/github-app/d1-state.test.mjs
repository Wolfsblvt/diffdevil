// SPDX-License-Identifier: AGPL-3.0-only

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { Miniflare } from 'miniflare';
import { D1AppStore } from './storage.mjs';

const migrations = ['0001_initial.sql'];
const projection = {
  schemaVersion: 3, engineVersion: 'engine-v1', reportVersion: 'report-v1', metricVersion: 'metrics-v1', source: { base: 'base', head: 'head' }, evidence: 'exact', fileSet: { complete: true, total: { status: 'exact', value: 1 } }, totals: {}, configuredResults: [], gaps: [], files: [{ ordinal: 0, raw: {}, lines: {} }], effects: [{ kind: 'label.add', outcome: 'changed', request: 'accepted', readback: 'verified' }]
};

async function localStore(clock, attemptIds = []) {
  const databaseId = `diffdevil-test-${crypto.randomUUID()}`;
  const runtime = new Miniflare({ workers: [{
    config: { name: 'diffdevil-test', type: 'worker', compatibilityDate: '2026-09-17', env: { APP_DB: { type: 'd1', id: databaseId } }, manifest: { mainModule: 'worker.mjs', modulesRoot: resolve('.'), modules: { 'worker.mjs': { type: 'esm', contents: 'export default { fetch() { return new Response("ok"); } };' } } } }
  }] });
  const database = await runtime.getD1Database('APP_DB');
  const store = new D1AppStore(database, { now: () => clock.value, leaseMs: 60_000, attemptId: () => attemptIds.shift() ?? 'attempt-default' });
  for (const migration of migrations) await store.migrate(await readFile(resolve('apps/github-app/migrations', migration), 'utf8'));
  return { runtime, database, store };
}

async function repositoryRow(database, repositoryId) {
  return database.prepare('SELECT repository_id, state, access_state, history_enabled FROM repositories WHERE repository_id=?').bind(repositoryId).first();
}

test('local D1 keeps execution fences, repair claims, expiry, offboarding, and portable state separate', async () => {
  const clock = { value: '2026-09-17T00:00:00.000Z' };
  const source = await localStore(clock, ['attempt-a', 'attempt-b', 'attempt-c']);
  try {
    await source.store.recordLifecycle({ installationId: 9, action: 'created', addedRepositories: [17, 18], removedRepositories: [] });
    await source.store.setRepositoryConsent(17, { enabled: true, retentionDays: 1, policyId: 'policy', origin: 'fixture' });
    assert.equal((await source.store.historySettings(17)).enabled, false, 'history consent cannot activate execution');
    await source.store.setRepositoryExecution(17, { enabled: true, origin: 'fixture' });
    assert.equal(await source.store.executionAllowed(17), true);

    const identity = { repositoryId: 17, pullRequest: 42, comparisonId: 'comparison-1', policyId: 'policy' };
    assert.equal((await source.store.recordHistory(identity, projection)).status, 'published');
    clock.value = '2026-09-18T00:00:00.000Z';
    await source.store.maintain();
    assert.equal(await source.database.prepare('SELECT 1 FROM history_records WHERE repository_id=17').first(), null, 'rolling expiry removes only the history record');
    assert.equal(await source.database.prepare("SELECT 1 FROM deletion_tombstones WHERE scope='repository:17'").first(), null, 'rolling expiry does not create a repository tombstone');

    const envelopeA = { installationId: 9, repositoryId: 17, pullRequest: 42, deliveryId: 'delivery-a' };
    const deliveryA = await source.store.claimDelivery(envelopeA);
    const executionA = await source.store.claimExecution(envelopeA, deliveryA);
    clock.value = '2026-09-18T00:02:00.000Z';
    const envelopeB = { installationId: 9, repositoryId: 17, pullRequest: 42, deliveryId: 'delivery-b' };
    const deliveryB = await source.store.claimDelivery(envelopeB);
    const executionB = await source.store.claimExecution(envelopeB, deliveryB);
    assert.equal(executionB.executionFence, executionA.executionFence + 1);
    await assert.rejects(source.store.finish(envelopeA, executionA, 'complete'), { code: 'E_LEASE_LOST' });
    await source.store.finish(envelopeB, executionB, 'complete', { status: 'verified' });

    const envelopeC = { installationId: 9, repositoryId: 17, pullRequest: 43, deliveryId: 'delivery-c' };
    const deliveryC = await source.store.claimDelivery(envelopeC);
    const executionC = await source.store.claimExecution(envelopeC, deliveryC);
    await source.store.finish(envelopeC, executionC, 'repair', { code: 'E_EFFECT_INCOMPLETE', repair: { kind: 'effect-reconciliation', identity: { ...identity, base: 'base', head: 'head' }, projection: { code: 'E_EFFECT_INCOMPLETE' } } });
    assert.deepEqual(await source.store.claimRepair('delivery:delivery-c'), { repairId: 'delivery:delivery-c', kind: 'effect-reconciliation', identity: { repositoryId: 17, pullRequest: 42, base: 'base', head: 'head', policyId: 'policy', comparisonId: 'comparison-1' }, projection: { code: 'E_EFFECT_INCOMPLETE' }, code: 'E_EFFECT_INCOMPLETE' });
    await source.store.completeRepair('delivery:delivery-c');
    assert.equal((await source.database.prepare("SELECT state FROM repairs WHERE repair_id='delivery:delivery-c'").first()).state, 'complete');

    await source.store.deleteHistory(17);
    const exported = await source.store.exportState();
    const restored = await localStore(clock);
    try {
      await restored.store.importState(exported);
      assert.deepEqual(await repositoryRow(restored.database, 17), { repository_id: 17, state: 'offboarding', access_state: 'removed', history_enabled: 0 }, 'a restored tombstone applies before the repository can be used');
      assert.equal(await restored.store.executionAllowed(17), false);
    } finally { await restored.runtime.dispose(); }

    await source.store.recordLifecycle({ installationId: 9, action: 'removed', addedRepositories: [], removedRepositories: [18] });
    clock.value = '2026-10-19T00:02:00.000Z';
    await source.store.maintain();
    assert.equal(await repositoryRow(source.database, 18), null, 'offboarding grace removes the repository projection');
    assert.ok(await source.database.prepare("SELECT 1 FROM deletion_tombstones WHERE scope='repository:18'").first(), 'offboarding creates the repository tombstone after deletion');
  } finally {
    await source.runtime.dispose();
  }
});

test('local D1 keeps preset-history identities, repair contracts, and portable numeric history distinct', async () => {
  const clock = { value: '2026-09-18T00:00:00.000Z' };
  const source = await localStore(clock);
  try {
    await source.store.recordLifecycle({ installationId: 9, action: 'created', addedRepositories: [17], removedRepositories: [] });
    await source.store.setRepositoryExecution(17, { enabled: true, origin: 'fixture' });
    await source.store.setRepositoryConsent(17, { enabled: true, retentionDays: 30, policyId: 'policy', origin: 'fixture' });
    const first = { repositoryId: 17, pullRequest: 42, comparisonId: 'comparison', policyId: 'policy' };
    assert.equal((await source.store.recordHistory(first, projection)).status, 'published');
    assert.equal((await source.store.recordHistory(first, { ...projection, engineVersion: 'engine-v2', reportVersion: 'report-v2' })).status, 'published', 'engine/report versions remain part of the numeric history identity');
    await source.store.recordHistoryRepair(first, projection, 'E_HISTORY_PUBLICATION');
    const historyRepair = await source.store.claimRepair('history:17:comparison:policy:engine-v1:report-v1');
    assert.equal(historyRepair.kind, 'history-publication');
    assert.deepEqual(historyRepair.identity, { repositoryId: 17, pullRequest: 42, base: 'base', head: 'head', policyId: 'policy', comparisonId: 'comparison' });
    await source.store.failRepair(historyRepair.repairId, 'E_REPAIR_STILL_UNCERTAIN');
    assert.equal((await source.database.prepare("SELECT state FROM repairs WHERE repair_id='history:17:comparison:policy:engine-v1:report-v1'").first()).state, 'open');

    const history = await source.store.exportHistory();
    assert.equal(history.kind, 'diffdevil.github-app-history-export');
    assert.equal(history.records.length, 2);
    assert.equal(typeof history.records[0].state, 'string', JSON.stringify(history.records[0]));
    const restored = await localStore(clock);
    try {
      await restored.store.importHistory(history);
      assert.equal((await restored.database.prepare("SELECT count(*) AS count FROM history_records WHERE state='published'").first()).count, 2);
      await restored.store.importHistory({ ...history, tombstones: [...history.tombstones, { scope: 'repository:17', deleted_at: clock.value, reapply_until: '2026-10-25T00:00:00.000Z' }] });
      assert.equal((await restored.database.prepare("SELECT count(*) AS count FROM history_records").first()).count, 2, 'a tombstoned restore cannot add back deleted numeric history');
    } finally { await restored.runtime.dispose(); }

    await source.store.recordLifecycle({ installationId: 9, action: 'suspend', addedRepositories: [], removedRepositories: [] });
    await source.store.recordLifecycle({ installationId: 9, action: 'unsuspend', addedRepositories: [], removedRepositories: [] });
    assert.equal(await source.store.executionAllowed(17), false, 'resume never silently restores execution consent');
  } finally { await source.runtime.dispose(); }
});
