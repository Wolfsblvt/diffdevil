// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { Miniflare } from 'miniflare';
import { D1AppStore } from './storage.mjs';
import { D1AuthorizationStore } from './authorization-storage.mjs';
import { D1CommercialStore } from './commercial-storage.mjs';
import { D1ManageStore } from '../app/src/lib/manage/store.mjs';
import { D1ParticipationStore } from '../app/src/lib/participation/store.mjs';
import { readRecoveryInput, replayRecoveryObligations } from './recovery.mjs';
import { exportHealthyRecoveryInput } from './recovery-input.mjs';
import { createAdmissionService } from './admission.mjs';
import { RECOVERY_DUTIES } from './recovery-contract.mjs';

const point = { id: 'sanitized-point', capturedAt: '2026-10-01T00:00:00.000Z', supportedUntil: '2026-10-31T00:00:00.000Z' };
const through = '2026-10-05T00:00:00.000Z';
const at = '2026-10-02T00:00:00.000Z';
const until = '2026-11-08T00:00:00.000Z';
function input(events = []) {
  return { kind: 'diffdevil.app-recovery-input', version: 1, point,
    coverage: { from: point.capturedAt, through, tombstoneRetentionDays: 37,
      sources: RECOVERY_DUTIES.map(duty =>
        ({ duty, authority: `fixture:${duty}`, checkpoint: 'fixture-sequence-6', recoveryEvidence: 'sanitized-independent-fixture', through })) },
    events: events.map((event, index) => ({ id: `duty-${index}`, at, ...event })) };
}

async function fixture() {
  const runtime = new Miniflare({ workers: [{ config: { name: 'recovery-test', type: 'worker', compatibilityDate: '2026-09-17',
    env: { APP_DB: { type: 'd1', id: crypto.randomUUID() } }, manifest: { mainModule: 'worker.mjs', modulesRoot: resolve('.'),
      modules: { 'worker.mjs': { type: 'esm', contents: 'export default { fetch() { return new Response("ok"); } };' } } } } }] });
  try {
    const database = await runtime.getD1Database('APP_DB');
    const app = new D1AppStore(database, { now: () => point.capturedAt });
    for (const file of (await readdir('apps/github-app/migrations')).filter(name => name.endsWith('.sql')).sort()) {
      await app.migrate(await readFile(resolve('apps/github-app/migrations', file), 'utf8'));
    }
    await app.recordLifecycle({ installationId: 9, action: 'created', addedRepositories: [17, 18, 19, 20], removedRepositories: [] });
    for (const repositoryId of [17, 18, 19, 20]) {
      await app.setRepositoryExecution(repositoryId, { enabled: true, origin: 'fixture' });
      await app.setRepositoryConsent(repositoryId, { enabled: true, retentionDays: 30, origin: 'fixture' });
      await app.recordAnalyticalSizes([{ repositoryId, path: 'a.ts', observedAt: point.capturedAt, revision: 'a'.repeat(40), size: 12 }]);
    }
    const auth = new D1AuthorizationStore(database, { now: () => point.capturedAt });
    await auth.saveAuthorizationWithArtifact(77, 'synthetic-protected-grant', point.supportedUntil, 'artifact', 'app', point.supportedUntil);
    await auth.exchangeArtifact('artifact', 'app', 'session', point.supportedUntil);
    await database.prepare(`INSERT INTO commercial_links(link_id,product_account,works_account,state,established_at,protected_grant,updated_at)
      VALUES ('link-1',77,'works-77','active',?,'synthetic-works-grant',?)`).bind(point.capturedAt, point.capturedAt).run();
    await database.prepare(`INSERT INTO commercial_link_attempts(state_hash,browser_hash,user_id,intent_id,protected_verifier,expires_at,last_establish)
      VALUES ('attempt-1','browser',77,'original-intent','synthetic-verifier',?,'expired')`).bind(point.capturedAt).run();
    const receipts = [];
    const replay = (value, extra = {}) => replayRecoveryObligations({ database, input: value, point, through,
      checkpoint: async receipt => { receipts.push(receipt); }, ...extra });
    return { runtime, database, app, auth, replay, receipts };
  } catch (error) { await runtime.dispose(); throw error; }
}

test('input refuses missing, partial, stale, wrong-point and unordered duties before target writes', async () => {
  for (const mutate of [() => undefined, value => ({ ...value, version: 2 }),
    value => ({ ...value, point: { ...point, id: 'another-point' } }),
    value => ({ ...value, coverage: { ...value.coverage, through: at } }),
    value => ({ ...value, coverage: { ...value.coverage, sources: [] } }),
    value => ({ ...value, events: [{ id: 'x', type: 'history-deleted', repositoryId: 17, at, reapplyUntil: through }] }),
    value => ({ ...value, events: [{ id: 'x', type: 'service-disconnected', userId: 77, at: through }, { id: 'y', type: 'service-disconnected', userId: 77, at }] })]) {
    let touched = false;
    await assert.rejects(replayRecoveryObligations({ database: { prepare() { touched = true; } }, input: mutate(input()), point, through,
      checkpoint: async () => { touched = true; } }), { code: 'E_RECOVERY_INPUT' });
    assert.equal(touched, false);
  }
  assert.throws(() => readRecoveryInput(input(), point, '2026-11-01T00:00:00.000Z'), { code: 'E_RECOVERY_INPUT' });
});

test('real D1 replay removes later-deleted data, opt-out, expiry and grants while preserving point attempts', async () => {
  const f = await fixture();
  try {
    await f.app.recordAnalyticalSizes([{ repositoryId: 20, path: 'expired.ts', observedAt: point.capturedAt,
      revision: 'b'.repeat(40), size: 3, expiresAt: '2026-10-03T00:00:00.000Z' }]);
    const duties = input([
      { type: 'history-deleted', repositoryId: 17, reapplyUntil: until },
      { type: 'repository-deleted', repositoryId: 18, reapplyUntil: until },
      { type: 'history-disabled', repositoryId: 19, deselect: false },
      { type: 'history-retention', repositoryId: 20, retentionDays: 1 },
      { type: 'service-disconnected', userId: 77 },
      { type: 'works-disconnected', linkId: 'link-1' }
    ]);
    const result = await f.replay(duties);
    assert.equal(result.phase, 'replayed');
    assert.equal(result.applied.length, 6);
    assert.match(result.inputSha256, /^[a-f0-9]{64}$/u);
    assert.equal((await f.app.historySettings(17)).enabled, false);
    assert.equal(await f.app.repositoryAdmission(18), undefined);
    assert.equal((await f.app.historySettings(19)).enabled, false);
    assert.equal((await f.database.prepare('SELECT count(*) AS n FROM analytical_file_sizes WHERE repository_id IN (17,18)').first()).n, 0);
    assert.equal((await f.database.prepare('SELECT count(*) AS n FROM analytical_file_sizes WHERE repository_id=20').first()).n, 1, 'only originally expired observations are removed; a future retention setting does not clamp existing rows');
    assert.equal((await f.database.prepare('SELECT count(*) AS n FROM analytical_file_sizes WHERE repository_id=19').first()).n, 1, 'opt-out stops collection without selecting deletion');
    assert.equal(await f.auth.serviceDisconnected(77), true);
    assert.ok((await f.auth.session('session')).revoked_at);
    assert.equal(await f.auth.authorization(77), null);
    assert.equal((await f.database.prepare("SELECT state FROM commercial_links WHERE link_id='link-1'").first()).state, 'ended');
    assert.equal((await f.database.prepare('SELECT last_establish FROM commercial_link_attempts').first()).last_establish, 'expired');
    const tombstones = (await f.database.prepare('SELECT deleted_at,reapply_until FROM deletion_tombstones').all()).results;
    assert.deepEqual(tombstones, [{ deleted_at: at, reapply_until: until }, { deleted_at: at, reapply_until: until }]);
    assert.equal((await f.replay(duties)).phase, 'replayed', 'the same point/input can safely replay after interruption');
    assert.deepEqual((await f.database.prepare('SELECT deleted_at,reapply_until FROM deletion_tombstones').all()).results, tombstones);
    await f.database.prepare("UPDATE deletion_tombstones SET reapply_until='2026-11-20T00:00:00.000Z'").run();
    await f.replay(duties);
    assert.deepEqual((await f.database.prepare('SELECT DISTINCT reapply_until FROM deletion_tombstones').all()).results,
      [{ reapply_until: '2026-11-20T00:00:00.000Z' }], 'replaying an older duty cannot shorten a longer live tombstone');
  } finally { await f.runtime.dispose(); }
});

test('checkpoint refusal precedes any mutation; interrupted replay has a durable incomplete prefix and resumes', async () => {
  const f = await fixture();
  try {
    await assert.rejects(f.replay(input(), { checkpoint: async () => { throw new Error('output unavailable'); } }), /output unavailable/u);
    assert.equal((await f.database.prepare("SELECT restored_at FROM commercial_links WHERE link_id='link-1'").first()).restored_at, null);
    const duties = input([{ type: 'history-deleted', repositoryId: 17, reapplyUntil: until }, { type: 'works-disconnected', linkId: 'link-1' }]);
    const committed = [];
    let failed = false;
    await assert.rejects(f.replay(duties, { checkpoint: async value => {
      if (value.applied.length === 1 && !failed) { failed = true; throw new Error('interrupted output'); }
      committed.push(value);
    } }), { code: 'E_RECOVERY_REPLAY' });
    assert.equal(committed.at(-1).phase, 'incomplete');
    assert.deepEqual(committed.at(-1).applied, ['duty-0']);
    assert.equal((await f.replay(duties)).phase, 'replayed');
  } finally { await f.runtime.dispose(); }
});

test('commercial unavailability and mere acknowledgements keep replay incomplete until holds actually resolve', async () => {
  const f = await fixture();
  try {
    assert.equal((await f.replay(input())).code, 'E_RECOVERY_COMMERCIAL_UNAVAILABLE');
    const acknowledgement = { reconcileAfterRestore: async () => ({ current: 1, ended: 0, unavailable: 0 }) };
    assert.equal((await f.replay(input(), { commercial: acknowledgement })).phase, 'incomplete');
    await assert.rejects(f.replay(input(), { commercial: { reconcileAfterRestore: async () => {
      throw Object.assign(new Error('fixture commercial unavailable'), { code: 'E_COMMERCIAL_UNAVAILABLE' });
    } } }), { code: 'E_RECOVERY_COMMERCIAL_UNAVAILABLE' });
    assert.equal(f.receipts.at(-1).code, 'E_RECOVERY_COMMERCIAL_UNAVAILABLE');
    const current = { reconcileAfterRestore: async () => {
      const store = new D1CommercialStore(f.database, { now: () => through });
      await store.endLink('link-1', { source: 'fixture-current-answer', endedAt: through });
      return { current: 0, ended: 1, unavailable: 0 };
    } };
    assert.equal((await f.replay(input(), { commercial: current })).phase, 'replayed');
    assert.equal(f.receipts.at(-1).phase, 'replayed');
  } finally { await f.runtime.dispose(); }
});

test('later answer deletion preserves completion, while account closure removes personal facts and leaves organisation history', async () => {
  const f = await fixture();
  try {
    const participation = new D1ParticipationStore(f.database, { now: () => at });
    const manage = new D1ManageStore(f.database, { now: () => at });
    const campaign = { key: 'fixture-campaign', version: 1, survey: 'fixture-survey' };
    await participation.complete(77, campaign, { feedback: 'synthetic answer' });
    await manage.select(17, 77);
    await manage.connectFree(77, 9001);
    await f.replay(input([{ type: 'participation-answers-deleted', userId: 77, campaign }]));
    const response = await participation.response(77, campaign);
    assert.equal(response.answers, null);
    assert.equal(response.state, 'completed');
    assert.ok(await participation.delivery(response.responseId), 'answer deletion keeps the earned completion event');
    await f.replay(input([{ type: 'account-closed', userId: 77, repositoryIds: [17], reapplyUntil: until }]));
    assert.equal(await participation.response(77, campaign), null);
    assert.equal(await participation.delivery(response.responseId), null);
    assert.equal(await manage.selection(17), null);
    assert.equal(await manage.freeConnection(77), null);
    assert.equal(await f.app.executionAllowed(17), false);
    assert.equal((await f.database.prepare('SELECT count(*) AS n FROM analytical_file_sizes WHERE repository_id=17').first()).n, 0);
    assert.equal((await f.database.prepare('SELECT count(*) AS n FROM analytical_file_sizes WHERE repository_id=18').first()).n, 1);
    assert.equal((await f.database.prepare("SELECT state FROM commercial_links WHERE link_id='link-1'").first()).state, 'ended');
    assert.equal((await f.database.prepare('SELECT last_establish FROM commercial_link_attempts').first()).last_establish, 'expired');
  } finally { await f.runtime.dispose(); }
});

test('Free disconnect and session revocation replay without deleting retained organisation history or selection', async () => {
  const f = await fixture();
  try {
    const manage = new D1ManageStore(f.database, { now: () => at });
    await manage.select(18, 77);
    await manage.connectFree(77, 9001);
    await f.replay(input([{ type: 'free-organisation-disconnected', userId: 77, repositoryIds: [18] }, { type: 'sessions-revoked', userId: 77 }]));
    assert.equal(await manage.freeConnection(77), null);
    assert.ok(await manage.selection(18));
    assert.equal(await f.app.executionAllowed(18), false);
    assert.ok((await f.auth.session('session')).revoked_at);
    assert.equal((await f.database.prepare('SELECT count(*) AS n FROM analytical_file_sizes WHERE repository_id=18').first()).n, 1);
  } finally { await f.runtime.dispose(); }
});

test('the one-time healthy-source export supplies and checkpoints actual current state for interrupted rollback replay', async () => {
  // Two copies of the same deterministic sanitized point, before later source-only changes.
  const current = await fixture();
  let target;
  try {
    target = await fixture();
    const selectedPoint = { ...point, databaseId: 'sanitized-original-database' };
    const source = { mode: 'immutable-current-copy', databaseId: selectedPoint.databaseId, capturedAt: through,
      snapshotId: 'fixture-current-snapshot', healthEvidence: 'fixture-live-read-before-isolation',
      consistencyEvidence: 'fixture-owned-stopped-writers', interpretation: 'fixture-schema-0016-original-seal' };
    await current.app.deleteHistory(17);
    await current.app.reapplyRepositoryDeletion(18, { deletedAt: at, reapplyUntil: until });
    await current.app.setRepositoryConsent(19, { enabled: false, origin: 'fixture-withdrawal' });
    await current.auth.revokeAuthorization(77, { disconnectService: true });
    await new D1CommercialStore(current.database, { now: () => through }).endLink('link-1', { source: 'fixture-current-end', endedAt: at });
    const campaign = { key: 'fixture-campaign', version: 1, survey: 'fixture-survey' };
    for (const f of [current, target]) await new D1ParticipationStore(f.database, { now: () => at }).complete(77, campaign, { feedback: 'synthetic answer' });
    await new D1ParticipationStore(current.database, { now: () => through }).deleteAnswers(77, campaign);
    let committed;
    const exported = await exportHealthyRecoveryInput({ database: current.database, point: selectedPoint, source,
      checkpoint: async value => { committed = value; } });
    assert.deepEqual(exported, committed);
    assert.equal(exported.coverage.mode, 'healthy-source-rollback');
    assert.equal(exported.events.length, 0, 'current state supplies obligations without inventing historical events or their times');
    const partial = structuredClone(exported);
    partial.currentState.tables.pop();
    let touched = false;
    await assert.rejects(target.replay(partial, { point: selectedPoint, checkpoint: async () => { touched = true; } }), { code: 'E_RECOVERY_SOURCE' });
    assert.equal(touched, false);
    assert.equal((await target.app.historySettings(17)).enabled, true);
    let repositoryInsert = false, interrupted = false;
    const failing = {
      prepare(sql) { if (sql.startsWith('INSERT INTO "repositories"')) repositoryInsert = true; return target.database.prepare(sql); },
      batch(statements) {
        if (repositoryInsert && !interrupted) { interrupted = true; throw new Error('fixture interrupted metadata publication'); }
        return target.database.batch(statements);
      }
    };
    await assert.rejects(target.replay(exported, { database: failing, point: selectedPoint }), { code: 'E_RECOVERY_REPLAY' });
    assert.equal(target.receipts.at(-1).phase, 'incomplete');
    const result = await target.replay(exported, { point: selectedPoint });
    assert.equal(result.phase, 'replayed');
    assert.ok(result.applied.includes('healthy-current-state'));
    assert.equal((await target.app.historySettings(17)).enabled, false);
    assert.equal(await target.app.repositoryAdmission(18), undefined);
    assert.equal((await target.app.historySettings(19)).enabled, false);
    assert.equal(await target.auth.serviceDisconnected(77), true);
    assert.equal(await target.auth.authorization(77), null);
    assert.equal((await new D1ParticipationStore(target.database).response(77, campaign)).answers, null);
    assert.equal((await target.database.prepare('SELECT count(*) AS n FROM analytical_file_sizes WHERE repository_id=20').first()).n, 1);
    assert.equal((await target.database.prepare('SELECT last_establish FROM commercial_link_attempts').first()).last_establish, 'expired');
    await assert.rejects(exportHealthyRecoveryInput({ database: current.database, point: selectedPoint,
      source: { ...source, healthEvidence: '' }, checkpoint: async () => {} }), { code: 'E_RECOVERY_SOURCE' });
    await assert.rejects(exportHealthyRecoveryInput({ database: current.database, point: selectedPoint, source,
      checkpoint: async () => { throw new Error('fixture protected output unavailable'); } }), /protected output unavailable/u);
  } finally { await current.runtime.dispose(); await target?.runtime.dispose(); }
});

test('healthy-source export proves its output route before reads and refuses incomplete table reads', async () => {
  const selectedPoint = { ...point, databaseId: 'fixture-db' };
  const source = { mode: 'immutable-current-copy', databaseId: selectedPoint.databaseId, capturedAt: through,
    snapshotId: 'fixture-current', healthEvidence: 'fixture-health', consistencyEvidence: 'fixture-immutable-copy', interpretation: 'fixture-0016' };
  let read = false;
  await assert.rejects(exportHealthyRecoveryInput({ point: selectedPoint, source,
    database: { prepare() { read = true; } }, checkpoint: async () => { throw new Error('fixture output refusal'); } }), /output refusal/u);
  assert.equal(read, false);
  const committed = [];
  const partial = { prepare(sql) { return {
    first: async () => ({ count: 2 }),
    all: async () => ({ success: true, results: sql.startsWith('PRAGMA') ? [{ name: 'installation_id' }] : [{ installation_id: 9 }] })
  }; } };
  await assert.rejects(exportHealthyRecoveryInput({ point: selectedPoint, source, database: partial,
    checkpoint: async value => { committed.push(value); } }), { code: 'E_RECOVERY_SOURCE' });
  assert.equal(committed.length, 1);
  assert.equal(committed[0].phase, 'reading');
  assert.notEqual(committed[0].kind, 'diffdevil.app-recovery-input');
});

test('retention replay matches the live future-record setting without deleting existing observations', async () => {
  const f = await fixture();
  try {
    const live = createAdmissionService({ store: f.app, authorize: async () => true });
    await live.update(17, { revision: 0, origin: 'fixture', history: { enabled: true, retentionDays: 1 } });
    await f.replay(input([{ type: 'history-retention', repositoryId: 18, retentionDays: 1 }]));
    const rows = (await f.database.prepare('SELECT repository_id,expires_at FROM analytical_file_sizes WHERE repository_id IN (17,18) ORDER BY repository_id').all()).results;
    assert.equal(rows.length, 2, 'both live and replay retain the observations at their original expiry');
    assert.equal(rows[0].expires_at, rows[1].expires_at);
    assert.equal((await f.app.repositoryAdmission(17)).history.retentionDays, (await f.app.repositoryAdmission(18)).history.retentionDays);
  } finally { await f.runtime.dispose(); }
});

test('history-off replay matches stopCollecting consent and selection semantics', async () => {
  const f = await fixture();
  try {
    const manage = new D1ManageStore(f.database, { now: () => at });
    for (const repositoryId of [17, 18]) {
      await f.app.setRepositoryExecution(repositoryId, { enabled: false, origin: 'fixture' });
      await manage.select(repositoryId, 77);
    }
    const live = createAdmissionService({ store: f.app, authorize: async () => true });
    await live.update(17, { revision: 0, origin: 'fixture', history: { enabled: false, stopCollecting: true } });
    await manage.deselect(17); // The live history action deselects when execution is inactive.
    await f.replay(input([{ type: 'history-disabled', repositoryId: 18, deselect: true }]));
    assert.deepEqual((await f.app.repositoryAdmission(17)).history, (await f.app.repositoryAdmission(18)).history);
    assert.equal((await f.app.repositoryAdmission(18)).history.reason, null, 'pausing collection does not withdraw retained history consent');
    assert.equal(await manage.selection(18), null);
    assert.equal((await f.database.prepare('SELECT count(*) AS n FROM analytical_file_sizes WHERE repository_id IN (17,18)').first()).n, 2);
  } finally { await f.runtime.dispose(); }
});

test('stop, in-grace release, delegation removal and setup-off preserve their distinct live effects', async () => {
  const f = await fixture();
  try {
    const manage = new D1ManageStore(f.database, { now: () => at });
    for (const repositoryId of [17, 18]) await manage.select(repositoryId, 77);
    await manage.grantDelegation({ accountId: 9001, userId: 77, login: 'fixture', role: 'account-admin' });
    await manage.saveAutomaticSetup(9001, { enableExecution: true, writerDeclared: true, actorId: 77, actorRole: 'account-admin' });
    await manage.saveAutomaticSetup(9002, { enableExecution: true, writerDeclared: true, actorId: 88, actorRole: 'owner' });
    await f.replay(input([{ type: 'repository-stopped', repositoryId: 17 }, { type: 'repository-released', repositoryId: 18 },
      { type: 'delegation-removed', accountId: 9001, userId: 77 }, { type: 'automatic-setup-disabled', accountId: 9002 }]));
    assert.equal(await manage.selection(17), null);
    assert.equal((await f.app.repositoryAdmission(17)).execution.reason, 'explicitly-disabled');
    assert.equal(await manage.selection(18), null);
    assert.equal((await f.app.repositoryAdmission(18)).execution.reason, null, 'release removes selection without inventing another consent withdrawal');
    assert.equal((await f.database.prepare('SELECT count(*) AS n FROM analytical_file_sizes WHERE repository_id IN (17,18)').first()).n, 2);
    assert.equal(await manage.delegation(9001, 77), null);
    assert.ok(await manage.automaticSetup(9001), 'revoking its chooser disables authority without deleting the stored choice');
    assert.equal(await manage.automaticSetup(9002), null);
  } finally { await f.runtime.dispose(); }
});

test('restore support needs its actual duty guarantee plus seven days, without a staging-specific ceiling', () => {
  const missing = input(); delete missing.coverage.tombstoneRetentionDays;
  assert.throws(() => readRecoveryInput(missing, point, through), { code: 'E_RECOVERY_INPUT' });
  const inadequate = input(); inadequate.coverage.tombstoneRetentionDays = 36;
  assert.throws(() => readRecoveryInput(inadequate, point, through), { code: 'E_RECOVERY_INPUT' });
  const longerPoint = { ...point, supportedUntil: '2026-11-15T00:00:00.000Z' };
  const longer = input(); longer.point = longerPoint;
  assert.throws(() => readRecoveryInput(longer, longerPoint, through), { code: 'E_RECOVERY_INPUT' });
  longer.coverage.tombstoneRetentionDays = 52;
  assert.equal(readRecoveryInput(longer, longerPoint, through).coverage.tombstoneRetentionDays, 52);
  longer.events = [{ id: 'deletion', type: 'history-deleted', repositoryId: 17, at, reapplyUntil: until }];
  assert.throws(() => readRecoveryInput(longer, longerPoint, through), { code: 'E_RECOVERY_INPUT' });
});
