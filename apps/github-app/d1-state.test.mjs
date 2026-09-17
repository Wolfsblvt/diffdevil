// SPDX-License-Identifier: AGPL-3.0-only

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { Miniflare } from 'miniflare';
import { D1AppStore } from './storage.mjs';

const migrations = ['0001_initial.sql', '0002_execution_lifecycle.sql', '0003_durable_lifecycle_history.sql'];
const projection = {
  schemaVersion: 3, engineVersion: 'engine-v1', reportVersion: 'report-v1', metricVersion: 'metrics-v1', source: { base: 'base', head: 'head' }, evidence: 'exact', fileSet: { complete: true, total: { status: 'exact', value: 1 } }, totals: {}, configuredResults: [], gaps: [], files: [{ ordinal: 0, raw: {}, lines: {} }], effects: [{ kind: 'label.add', outcome: 'changed', request: 'accepted', readback: 'verified' }]
};

async function localStore(clock, attemptIds = []) {
  const runtime = new Miniflare({ workers: [{
    config: { name: 'diffdevil-test', type: 'worker', compatibilityDate: '2026-09-17', env: { APP_DB: { type: 'd1', id: 'diffdevil-test' } }, manifest: { mainModule: 'worker.mjs', modulesRoot: resolve('.'), modules: { 'worker.mjs': { type: 'esm', contents: 'export default { fetch() { return new Response("ok"); } };' } } } }
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
    await source.store.finish(envelopeC, executionC, 'repair', { code: 'E_EFFECT_INCOMPLETE', repair: { kind: 'effect-reconciliation', projection: { code: 'E_EFFECT_INCOMPLETE' } } });
    assert.deepEqual(await source.store.claimRepair('delivery-c'), { deliveryId: 'delivery-c', kind: 'effect-reconciliation', projection: { code: 'E_EFFECT_INCOMPLETE' }, code: 'E_EFFECT_INCOMPLETE' });
    await source.store.completeRepair('delivery-c');
    assert.equal((await source.database.prepare("SELECT state FROM delivery_repairs WHERE delivery_id='delivery-c'").first()).state, 'complete');

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
