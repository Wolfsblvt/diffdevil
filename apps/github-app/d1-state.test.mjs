// SPDX-License-Identifier: AGPL-3.0-only

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { Miniflare } from 'miniflare';
import { D1AppStore } from './storage.mjs';
import { createAdmissionService } from './admission.mjs';
import { DEFAULT_SIZE_POLICY, readConfigurationExport, resolveEffectivePolicy } from './configuration.mjs';

const migrations = ['0001_initial.sql', '0002_consent-provenance.sql', '0003_preserve-active-consent.sql', '0004_admission-settings.sql', '0005_offboarding-consent-tombstones.sql', '0006_user-authorization.sql', '0007_consent-actors.sql', '0008_history_analytics.sql'];
const projection = {
  schemaVersion: 3, engineVersion: 'engine-v1', reportVersion: 'report-v1', metricVersion: 'metrics-v1', source: { base: 'base', head: 'head' }, evidence: 'exact', fileSet: { complete: true, total: { status: 'exact', value: 1 } }, totals: {}, configuredResults: [], gaps: [], files: [{ ordinal: 0, raw: {}, lines: {} }], effects: [{ kind: 'label.add', outcome: 'changed', request: 'accepted', readback: 'verified' }]
};

async function localStore(clock, attemptIds = [], schema = migrations) {
  const databaseId = `diffdevil-test-${crypto.randomUUID()}`;
  const runtime = new Miniflare({ workers: [{
    config: { name: 'diffdevil-test', type: 'worker', compatibilityDate: '2026-09-17', env: { APP_DB: { type: 'd1', id: databaseId } }, manifest: { mainModule: 'worker.mjs', modulesRoot: resolve('.'), modules: { 'worker.mjs': { type: 'esm', contents: 'export default { fetch() { return new Response("ok"); } };' } } } }
  }] });
  const database = await runtime.getD1Database('APP_DB');
  const store = new D1AppStore(database, { now: () => clock.value, leaseMs: 60_000, attemptId: () => attemptIds.shift() ?? 'attempt-default' });
  for (const migration of schema) await store.migrate(await readFile(resolve('apps/github-app/migrations', migration), 'utf8'));
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
    assert.deepEqual(await source.store.claimDelivery(envelopeB), { kind: 'duplicate' });
    const operations = await source.store.historyOperations(17, '2026-09-17T00:00:00.000Z', '2026-09-19T00:00:00.000Z');
    assert.equal(operations.attempts.length, 2, 'lease takeover creates a second execution attempt');
    assert.equal(operations.deliveries.find(row => row.duplicate_count === 1)?.state, 'complete');

    const envelopeC = { installationId: 9, repositoryId: 17, pullRequest: 43, deliveryId: 'delivery-c' };
    const deliveryC = await source.store.claimDelivery(envelopeC);
    const executionC = await source.store.claimExecution(envelopeC, deliveryC);
    await source.store.finish(envelopeC, executionC, 'repair', { code: 'E_EFFECT_INCOMPLETE', repair: { kind: 'effect-reconciliation', identity: { ...identity, base: 'base', head: 'head' }, projection: { code: 'E_EFFECT_INCOMPLETE' } } });
    assert.deepEqual(await source.store.claimRepair('delivery:delivery-c'), { repairId: 'delivery:delivery-c', kind: 'effect-reconciliation', identity: { repositoryId: 17, pullRequest: 42, base: 'base', head: 'head', policyId: 'policy', comparisonId: 'comparison-1' }, projection: { code: 'E_EFFECT_INCOMPLETE' }, code: 'E_EFFECT_INCOMPLETE' });
    await source.store.completeRepair('delivery:delivery-c');
    assert.equal((await source.database.prepare("SELECT state FROM repairs WHERE repair_id='delivery:delivery-c'").first()).state, 'complete');

    await source.store.deleteHistory(17);
    const exported = await source.store.exportState();
    assert.equal(readConfigurationExport(exported).version, 7, 'the portable configuration reader accepts the current export version');
    const restored = await localStore(clock);
    try {
      await restored.store.importState(exported);
      assert.deepEqual(await repositoryRow(restored.database, 17), { repository_id: 17, state: 'pending-enable', access_state: 'unknown', history_enabled: 0 }, 'a history tombstone preserves restore resistance without offboarding execution');
      assert.equal(await restored.store.executionAllowed(17), false);
    } finally { await restored.runtime.dispose(); }

    await source.store.recordLifecycle({ installationId: 9, action: 'removed', addedRepositories: [], removedRepositories: [18] });
    clock.value = '2026-10-19T00:02:00.000Z';
    await source.store.maintain();
    assert.equal(await repositoryRow(source.database, 18), null, 'offboarding grace removes the repository projection');
    assert.ok(await source.database.prepare("SELECT 1 FROM deletion_tombstones WHERE scope='repository:18'").first(), 'offboarding creates the repository tombstone after deletion');
    await source.store.recordLifecycle({ installationId: 10, action: 'created', addedRepositories: [18], removedRepositories: [] });
    assert.deepEqual(await source.store.repositoryConsentState(18), {
      execution: { origin: 'unknown', reason: 'never-enabled' },
      history: { origin: 'unknown', reason: 'never-enabled' },
      configuration: { origin: 'unknown' }
    }, 'a post-grace re-add preserves the never-enabled standing');
  } finally {
    await source.runtime.dispose();
  }
});

test('history queries use retained published rows while reusable lens configuration survives source deletion', async () => {
  const clock = { value: '2026-09-17T00:00:00.000Z' };
  const { runtime, database, store } = await localStore(clock);
  try {
    await store.recordLifecycle({ installationId: 9, action: 'created', addedRepositories: [17, 18], removedRepositories: [] });
    await store.setRepositoryExecution(17, { enabled: true, origin: 'fixture' });
    await store.setRepositoryConsent(17, { enabled: true, retentionDays: 1, policyId: 'policy', origin: 'fixture' });
    const selected = { ...projection, schemaVersion: 4, totals: { lines: { changed: { status: 'exact', value: 12 } } },
      configuredResults: [{ metric: 'custom', result: { status: 'exact', value: 12 } }],
      scopes: [], bands: [], rules: [{ ref: 'rule', disposition: 'matched' }],
      files: [{ ordinal: 0, inclusion: 'included', lines: { changed: { status: 'exact', value: 12 } }, raw: {} }] };
    const identity = { repositoryId: 17, pullRequest: 42, comparisonId: 'comparison-a', policyId: 'policy' };
    assert.equal((await store.recordHistory(identity, selected)).status, 'published');
    assert.equal((await store.recordHistory(identity, selected)).status, 'disabled', 'duplicate analysis does not become another history row');
    await store.saveHistoryLens(17, { version: 1, id: 'custom', name: 'Custom metric', query: { version: 1, repositoryId: 17,
      from: '2026-09-01T00:00:00.000Z', to: '2026-10-01T00:00:00.000Z', family: 'distribution',
      metric: { kind: 'configured', ref: 'custom' } } });
    const plan = await database.prepare("EXPLAIN QUERY PLAN SELECT id FROM history_records WHERE repository_id=17 AND state='published' AND observed_at>='2026-09-01' AND observed_at<'2026-10-01'").all();
    assert.ok(plan.results.some(row => String(row.detail).includes('history_repository_window')), JSON.stringify(plan.results));
    const rows = await store.historyWindow(17, '2026-09-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].results.metrics[0].result.value, 12);
    assert.equal((await store.historyWindow(18, '2026-09-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z')).length, 0);
    assert.equal((await store.exportHistory(17)).records.length, 1);
    await store.setRepositoryConsent(17, { enabled: false, origin: 'fixture' });
    assert.equal((await store.historyWindow(17, '2026-09-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z')).length, 0, 'current consent gates retained rows');
    await store.setRepositoryConsent(17, { enabled: true, retentionDays: 1, policyId: 'policy', origin: 'fixture' });
    const configurationExport = await store.exportState();
    assert.equal(JSON.parse(configurationExport.lenses[0].lens_json).name, 'Custom metric');
    assert.equal(JSON.stringify(await store.exportHistory(17)).includes('Custom metric'), false, 'numeric export excludes lens display copy');
    await store.deleteHistory(17);
    assert.equal((await store.historyWindow(17, '2026-09-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z')).length, 0);
    assert.equal((await store.historyLenses(17)).length, 1, 'a reusable configuration question survives source history deletion');
    assert.equal((await store.exportHistory(17)).records.length, 0);
    const restored = await localStore(clock);
    try {
      await restored.store.importState(await store.exportState());
      assert.equal((await restored.store.historyLenses(17))[0].name, 'Custom metric');
    } finally { await restored.runtime.dispose(); }
    await store.setRepositoryExecution(18, { enabled: true, origin: 'fixture' });
    await store.setRepositoryConsent(18, { enabled: true, retentionDays: 1, policyId: 'policy', origin: 'fixture' });
    assert.equal((await store.recordHistory({ ...identity, repositoryId: 18 }, selected)).status, 'published');
    clock.value = '2026-09-19T00:00:00.000Z';
    assert.equal((await store.historyWindow(18, '2026-09-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z')).length, 0, 'expiry is enforced before cleanup');
    assert.equal((await store.exportHistory(18)).records.length, 0, 'export cannot recover expired source');
  } finally { await runtime.dispose(); }
});

test('offboarding preserves every consent standing before and after the grace period', async () => {
  for (const { label, readdedAt, expiresGrace } of [
    { label: 'day 29', readdedAt: '2026-10-21T00:00:00.000Z', expiresGrace: false },
    { label: 'day 31', readdedAt: '2026-10-23T00:00:00.000Z', expiresGrace: true }
  ]) {
    const clock = { value: '2026-09-22T00:00:00.000Z' };
    const source = await localStore(clock);
    try {
      await source.store.recordLifecycle({ installationId: 9, action: 'created', addedRepositories: [31, 32, 33], removedRepositories: [] });
      await source.store.setRepositoryExecution(32, { enabled: false, origin: 'fixture' });
      await source.store.setRepositoryExecution(33, { enabled: true, origin: 'fixture' });
      await source.store.setRepositoryConsent(33, { enabled: true, retentionDays: 30, policyId: 'fixture', origin: 'fixture' });
      await source.store.recordLifecycle({ installationId: 9, action: 'removed', addedRepositories: [], removedRepositories: [31, 32, 33] });

      clock.value = readdedAt;
      if (expiresGrace) await source.store.maintain();
      await source.store.recordLifecycle({ installationId: 10, action: 'created', addedRepositories: [31, 32, 33], removedRepositories: [] });

      const consentReasons = async repositoryId => {
        const consent = await source.store.repositoryConsentState(repositoryId);
        return { execution: consent.execution.reason, history: consent.history.reason };
      };
      assert.deepEqual(await consentReasons(31), { execution: 'never-enabled', history: 'never-enabled' }, `${label} preserves a never-enabled repository`);
      assert.deepEqual(await consentReasons(32), { execution: 'explicitly-disabled', history: 'never-enabled' }, `${label} preserves a deliberately disabled repository`);
      assert.deepEqual(await consentReasons(33), { execution: 're-consent-required', history: 're-consent-required' }, `${label} requires new consent only for previously enabled capability`);
    } finally {
      await source.runtime.dispose();
    }
  }
});

test('consent provenance preserves a deliberate off state through interrupted access', async () => {
  const clock = { value: '2026-09-22T00:00:00.000Z' };
  const source = await localStore(clock);
  try {
    await source.store.recordLifecycle({ installationId: 9, action: 'created', addedRepositories: [17], removedRepositories: [] });
    assert.deepEqual(await source.store.repositoryConsentState(17), {
      execution: { origin: 'unknown', reason: 'never-enabled' },
      history: { origin: 'unknown', reason: 'never-enabled' },
      configuration: { origin: 'unknown' }
    });

    await source.store.setRepositoryConfiguration(17, { repository: { presets: [] } }, 'dashboard');
    await source.store.setRepositoryConsent(17, { enabled: true, retentionDays: 30, policyId: 'history', origin: 'history-control' });
    await source.store.setRepositoryExecution(17, { enabled: false, origin: 'execution-control' });
    assert.deepEqual(await source.store.repositoryConsentState(17), {
      execution: { origin: 'execution-control', reason: 'explicitly-disabled' },
      history: { origin: 'history-control', reason: null },
      configuration: { origin: 'dashboard' }
    });

    await source.store.recordLifecycle({ installationId: 9, action: 'suspend', addedRepositories: [], removedRepositories: [] });
    await source.store.recordLifecycle({ installationId: 9, action: 'unsuspend', addedRepositories: [], removedRepositories: [] });
    assert.deepEqual(await source.store.repositoryConsentState(17), {
      execution: { origin: 'execution-control', reason: 'explicitly-disabled' },
      history: { origin: 'history-control', reason: 're-consent-required' },
      configuration: { origin: 'dashboard' }
    });
    await source.store.setRepositoryExecution(17, { enabled: true, origin: 'execution-renewal' });
    assert.equal(await source.store.executionAllowed(17), true);
    assert.equal((await source.store.historySettings(17)).enabled, false, 'renewing execution cannot silently renew history');
    await source.store.setRepositoryConsent(17, { enabled: true, retentionDays: 30, policyId: 'history', origin: 'history-renewal' });
    assert.equal((await source.store.historySettings(17)).enabled, true);
    await source.store.reconcileRepositories(9, []);
    await source.store.reconcileRepositories(9, [17]);
    assert.deepEqual(await source.store.repositoryConsentState(17), {
      execution: { origin: 'execution-renewal', reason: 're-consent-required' },
      history: { origin: 'history-renewal', reason: 're-consent-required' },
      configuration: { origin: 'dashboard' }
    });
  } finally {
    await source.runtime.dispose();
  }
});

test('the admission service validates settings, keeps history independent, and refuses stale or unavailable transitions', async () => {
  const clock = { value: '2026-09-22T00:00:00.000Z' };
  const source = await localStore(clock);
  try {
    await source.store.recordLifecycle({ installationId: 9, action: 'created', addedRepositories: [17], removedRepositories: [] });
    const service = createAdmissionService({
      store: source.store,
      authorize: async request => request.actor?.role === 'repository-admin',
      resolvePolicy: async ({ configuration }) => ({
        ...resolveEffectivePolicy({ preset: DEFAULT_SIZE_POLICY, ...(configuration ?? {}), supplied: { presets: ['size@1'], rules: { xlTransition: { when: 'true', effects: { comment: { mode: 'once-per-transition', template: 'XL: {{ totals.lines.changed }}' } } } } } }),
        source: 'trusted-base', sourceIdentity: '.diffdevil.yml@fixture'
      })
    });
    const actor = { role: 'repository-admin', userId: 123 };
    const initial = await service.read(17, actor);
    assert.deepEqual(initial.execution, { origin: 'unknown', reason: 'never-enabled', actorId: null });
    assert.deepEqual(initial.next, { actor: 'repository-admin', action: 'declare-exclusive-writer' });
    await assert.rejects(service.update(17, { actor, origin: 'dashboard', revision: initial.revision, execution: true }), { code: 'E_ADMISSION_WRITER_UNRESOLVED' });
    const admitted = await service.update(17, { actor, origin: 'dashboard', revision: initial.revision, writer: { confidence: 'administrator-declared' }, execution: true });
    assert.equal(admitted.execution.reason, null);
    assert.equal(await source.store.executionAllowed(17), true);
    assert.equal((await source.store.historySettings(17)).enabled, false, 'execution admission never enables history');
    assert.equal(admitted.policy.source, 'trusted-base', 'repository-owned policy is the effective policy before admission');
    assert.equal(admitted.writer.confidence, 'administrator-declared');
    await source.store.deleteHistory(17);
    assert.equal(await source.store.executionAllowed(17), true, 'history deletion does not stop enabled execution');
    assert.equal((await service.read(17, actor)).reach.tombstoned, false, 'a history tombstone does not block the admission control plane');
    const configured = await service.update(17, { actor, origin: 'dashboard', revision: admitted.revision, configuration: { repository: { presets: ['size@1'] } } });
    assert.equal(configured.policy.source, 'trusted-base');
    assert.equal(configured.policy.provenance['/presets'], 'supplied', 'the trusted base overrides stored configuration in effective readback');
    assert.deepEqual(configured.policy.configuredEffects.rules, ['size', 'xlTransition']);
    assert.equal((await source.store.repositoryConfiguration(17)).value.repository.presets[0], 'size@1');
    await assert.rejects(service.update(17, { actor, origin: 'dashboard', revision: initial.revision, execution: false }), { code: 'E_ADMISSION_STALE' });
    const disabled = await service.update(17, { actor, origin: 'dashboard', revision: configured.revision, execution: false });
    assert.equal(disabled.execution.reason, 'explicitly-disabled');
    const envelope = { installationId: 9, repositoryId: 17, pullRequest: 42, deliveryId: 'disabled-delivery' };
    const delivery = await source.store.claimDelivery(envelope);
    const lease = await source.store.claimExecution(envelope, delivery);
    await source.store.finish(envelope, lease, 'rejected', { code: 'E_ACCESS_DISABLED' });
    assert.equal((await service.read(17, actor)).lastDelivery.effect, 'not-attempted-execution-disabled');
    await source.store.recordLifecycle({ installationId: 9, action: 'suspend', addedRepositories: [], removedRepositories: [] });
    await assert.rejects(service.update(17, { actor, origin: 'dashboard', revision: disabled.revision, execution: true }), { code: 'E_ADMISSION_UNAVAILABLE' });
    await assert.rejects(service.update(17, { actor: { role: 'reader' }, origin: 'dashboard', revision: disabled.revision, execution: true }), { code: 'E_ADMISSION_UNAUTHORIZED' });
  } finally { await source.runtime.dispose(); }
});

test('the provenance migration keeps existing rows unknown instead of splitting one historical origin three ways', async () => {
  const clock = { value: '2026-09-22T00:00:00.000Z' };
  const source = await localStore(clock, [], ['0001_initial.sql']);
  try {
    await source.database.prepare("INSERT INTO installations (installation_id, state, updated_at) VALUES (9, 'active', ?)").bind(clock.value).run();
    await source.database.prepare("INSERT INTO repositories (repository_id, installation_id, history_enabled, state, access_state, updated_at) VALUES (17, 9, 0, 'pending-enable', 'available', ?)").bind(clock.value).run();
    await source.database.prepare("UPDATE repositories SET consent_origin='legacy-last-write' WHERE repository_id=17").run();
    await source.store.migrate(await readFile(resolve('apps/github-app/migrations/0002_consent-provenance.sql'), 'utf8'));
    assert.deepEqual(await source.store.repositoryConsentState(17), {
      execution: { origin: 'unknown', reason: 'unknown' },
      history: { origin: 'unknown', reason: 'unknown' },
      configuration: { origin: 'unknown' }
    });
  } finally {
    await source.runtime.dispose();
  }
});

test('the forward consent migration preserves active legacy execution and history consent without inventing origins', async () => {
  const clock = { value: '2026-09-22T00:00:00.000Z' };
  const source = await localStore(clock, [], ['0001_initial.sql']);
  try {
    await source.database.prepare("INSERT INTO installations (installation_id, state, updated_at) VALUES (9, 'active', ?)").bind(clock.value).run();
    await source.database.prepare("INSERT INTO repositories (repository_id, installation_id, history_enabled, retention_days, state, access_state, updated_at) VALUES (17, 9, 1, 30, 'active', 'available', ?)").bind(clock.value).run();
    await source.store.migrate(await readFile(resolve('apps/github-app/migrations/0002_consent-provenance.sql'), 'utf8'));
    await source.store.migrate(await readFile(resolve('apps/github-app/migrations/0003_preserve-active-consent.sql'), 'utf8'));
    assert.deepEqual(await source.store.repositoryConsentState(17), {
      execution: { origin: 'unknown', reason: null },
      history: { origin: 'unknown', reason: null },
      configuration: { origin: 'unknown' }
    });
    assert.equal(await source.store.executionAllowed(17), true);
    assert.equal((await source.store.historySettings(17)).enabled, true);
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
      assert.equal((await restored.database.prepare("SELECT count(*) AS count FROM history_records").first()).count, 0, 'a tombstone removes rows already restored before it arrived');
    } finally { await restored.runtime.dispose(); }

    await source.store.recordLifecycle({ installationId: 9, action: 'suspend', addedRepositories: [], removedRepositories: [] });
    await source.store.recordLifecycle({ installationId: 9, action: 'unsuspend', addedRepositories: [], removedRepositories: [] });
    assert.equal(await source.store.executionAllowed(17), false, 'resume never silently restores execution consent');
  } finally { await source.runtime.dispose(); }
});
