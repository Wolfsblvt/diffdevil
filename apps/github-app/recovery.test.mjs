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
import { D1HistoryJobStore, runHistoryJob } from './history-jobs.mjs';
import { record, patch, base, head } from './analytical-data.fixtures.mjs';
import { describeJob } from '../app/src/lib/manage/jobs.mjs';
import { closeLocalAccount } from '../app/src/lib/manage/account-closure.mjs';

const point = { id: 'sanitized-point', capturedAt: '2026-10-01T00:00:00.000Z', supportedUntil: '2026-10-31T00:00:00.000Z' };
const through = '2026-10-05T00:00:00.000Z';
const at = '2026-10-02T00:00:00.000Z';
const until = '2026-11-08T00:00:00.000Z';
const healthyPoint = { ...point, databaseId: 'fixture-db' };
const healthySource = { mode: 'immutable-current-copy', databaseId: healthyPoint.databaseId, capturedAt: through,
  snapshotId: 'fixture-current', healthEvidence: 'fixture-health', consistencyEvidence: 'fixture-immutable-copy', interpretation: 'fixture-0016' };
const exportCurrent = database => exportHealthyRecoveryInput({ database, point: healthyPoint, source: healthySource, checkpoint: async () => {} });
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

test('history deletion rolls back every destructive row on failure, retries the original event, and survives healthy replay', async () => {
  const current = await fixture(), target = await fixture();
  try {
    await current.app.recordAnalytical(record(1));
    await target.app.recordAnalytical(record(1));
    const projection = { schemaVersion: 3, engineVersion: 'engine-v1', reportVersion: 'report-v1', metricVersion: 'metrics-v1',
      source: { base, head }, evidence: 'exact', fileSet: { complete: true }, totals: {}, configuredResults: [], gaps: [],
      files: [{ ordinal: 0 }], effects: [{ kind: 'label.add', outcome: 'changed' }] };
    for (const f of [current, target]) {
      await f.app.recordHistory({ repositoryId: 17, pullRequest: 1, comparisonId: 'deletion-fixture', policyId: 'policy' }, projection);
      await f.database.batch([
        f.database.prepare("INSERT INTO app_checks(repository_id,pull_request,head_sha,policy_id,check_run_id) VALUES (17,1,'head','policy',1)"),
        f.database.prepare("INSERT INTO repairs(repair_id,repair_kind,repository_id,projection_json,state,code,created_at) VALUES ('delete-repair','analysis',17,'{}','open','fixture',?)").bind(at)
      ]);
      await f.database.prepare(`INSERT INTO history_jobs(job_id,repository_id,installation_id,kind,state,sequence,scope_limit,cursor_json,progress_json,requested_by,requested_at,updated_at)
        VALUES ('delete-import',17,9,'import','queued',1,100,'{}','{}',77,?,?)`).bind(at, at).run();
    }
    const snapshot = async database => ({
      history: await database.prepare('SELECT count(*) AS n FROM history_records WHERE repository_id=17').first(),
      files: await database.prepare('SELECT count(*) AS n FROM history_file_rows').first(),
      effects: await database.prepare('SELECT count(*) AS n FROM history_effect_rows').first(),
      analytics: await database.prepare('SELECT count(*) AS n FROM analytical_pull_requests WHERE repository_id=17').first(),
      sizes: await database.prepare('SELECT count(*) AS n FROM analytical_file_sizes WHERE repository_id=17').first(),
      consent: await database.prepare('SELECT history_enabled,history_consent_reason,settings_revision FROM repositories WHERE repository_id=17').first(),
      deletion: await database.prepare("SELECT deleted_at,reapply_until FROM deletion_tombstones WHERE scope='history:17'").first(),
      checks: await database.prepare('SELECT count(*) AS n FROM app_checks WHERE repository_id=17').first(),
      repairs: await database.prepare('SELECT count(*) AS n FROM repairs WHERE repository_id=17').first(),
      job: await database.prepare("SELECT state,reason FROM history_jobs WHERE job_id='delete-import'").first()
    });
    const before = await snapshot(current.database);
    for (const name of ['history', 'files', 'effects', 'analytics', 'sizes', 'checks', 'repairs']) assert.equal(before[name].n, 1, `seeded ${name}`);
    let deletionBatch = false;
    const broken = new D1AppStore({ prepare: sql => {
      if (sql.includes('INSERT INTO deletion_tombstones')) deletionBatch = true;
      return current.database.prepare(sql);
    },
    batch: statements => current.database.batch(deletionBatch ? [...statements, current.database.prepare('SELECT * FROM fixture_missing_table')] : statements)
    }, { now: () => at });
    await assert.rejects(broken.deleteHistory(17), /fixture_missing_table/u);
    assert.deepEqual(await snapshot(current.database), before, 'failure after removal SQL rolls back measurements, consent, tombstone and jobs together');
    await assert.rejects(broken.reapplyRepositoryDeletion(18, { deletedAt: at, reapplyUntil: until }), /fixture_missing_table/u);
    assert.ok(await current.app.repositoryAdmission(18), 'failed offboarding preserves the repository');
    assert.equal((await current.database.prepare('SELECT count(*) AS n FROM analytical_file_sizes WHERE repository_id=18').first()).n, 1);

    let clock = at;
    const store = new D1AppStore(current.database, { now: () => clock });
    await store.deleteHistory(17, { revision: before.consent.settings_revision });
    const deleted = await snapshot(current.database);
    for (const name of ['history', 'files', 'effects', 'analytics', 'sizes', 'checks', 'repairs']) assert.equal(deleted[name].n, 0, name);
    assert.equal(deleted.consent.history_enabled, 0);
    assert.deepEqual(deleted.job, { state: 'stopped', reason: 'history-deleted' });
    assert.deepEqual(deleted.deletion, { deleted_at: at, reapply_until: until });
    const requestOrigin = `history-deletion-revision-${before.consent.settings_revision}`;
    assert.equal((await store.exportState()).configurations.find(row => row.repository_id === 17).history_consent_origin, requestOrigin, 'the raw configuration snapshot retains the retry identity');
    assert.equal(await store.executionAllowed(17), true, 'history deletion leaves repository execution admitted');
    await current.database.prepare("INSERT INTO app_checks(repository_id,pull_request,head_sha,policy_id,check_run_id) VALUES (17,2,'later-head','policy',2)").run();
    deleted.checks.n = 1;
    clock = through;
    await store.deleteHistory(17); // Lost completion response, retried after restart with a later clock.
    await store.deleteHistory(17, { revision: before.consent.settings_revision });
    assert.deepEqual(await snapshot(current.database), deleted, 'retries do not manufacture another event or extend its lifetime');

    await new D1CommercialStore(current.database).endLink('link-1', { source: 'fixture-end', endedAt: at });
    const exported = await exportCurrent(current.database);
    const repositories = exported.currentState.tables.find(table => table.name === 'repositories');
    const repositoryIdColumn = repositories.columns.indexOf('repository_id');
    const originColumn = repositories.columns.indexOf('history_consent_origin');
    assert.equal(repositories.rows.find(row => row[repositoryIdColumn] === 17)[originColumn], requestOrigin, 'the raw healthy-source snapshot retains the exact identity');
    assert.equal((await target.replay(exported, { point: healthyPoint })).phase, 'replayed');
    assert.equal((await target.app.exportState()).configurations.find(row => row.repository_id === 17).history_consent_origin, requestOrigin, 'replay preserves the raw request identity');
    assert.equal((await target.app.repositoryAdmission(17)).history.origin, 'history-deletion');
    assert.equal((await target.app.repositoryConsentState(17)).history.origin, 'history-deletion', 'ordinary readback projects the replayed category');
    assert.equal((await target.app.historySettings(17)).enabled, false);
    assert.equal((await target.database.prepare('SELECT count(*) AS n FROM history_records WHERE repository_id=17').first()).n, 0);
    const restoredJobs = new D1HistoryJobStore(target.database, { now: () => through });
    let providerRead = false;
    const result = await runHistoryJob({ jobId: 'delete-import', repositoryId: 17, action: 'import', sequence: 2 }, {
      jobs: restoredJobs, store: target.app, clientFor: async () => { providerRead = true; throw new Error('deleted import must not read a provider'); }, now: () => through
    });
    assert.equal(providerRead, false);
    assert.notEqual(result.status, 'complete');

    // A later explicit choice is current authority; an old form or replay cannot erase it.
    clock = at; // Equal wall-clock timestamps do not undo the actual later consent commit.
    const admission = createAdmissionService({ store, authorize: async () => true });
    await admission.update(17, { revision: (await store.repositoryAdmission(17)).revision,
      actor: { userId: 77 }, origin: 'dashboard', history: { enabled: true, retentionDays: 30 } });
    const reconsented = await snapshot(current.database);
    await store.deleteHistory(17);
    await store.deleteHistory(17, { deletedAt: at, reapplyUntil: until });
    await assert.rejects(store.deleteHistory(17, { revision: before.consent.settings_revision }), { code: 'E_ADMISSION_STALE' });
    assert.deepEqual(await snapshot(current.database), reconsented);
    // A newly rendered, current-revision deletion is still a supported deliberate operation.
    clock = through;
    await store.deleteHistory(17, { revision: reconsented.consent.settings_revision });
    assert.equal((await snapshot(current.database)).consent.history_enabled, 0);
  } finally { await current.runtime.dispose(); await target.runtime.dispose(); }
});

test('a completed atomic account closure survives current-source rollback and preserves later explicit reconsent', async () => {
  const current = await fixture(), target = await fixture();
  try {
    await current.app.recordInstallationAccount(9, 77, 'user');
    await new D1CommercialStore(current.database).endLink('link-1', { source: 'fixture-unlink', endedAt: at });
    await current.database.prepare("INSERT INTO participation_prompts(user_id,campaign_key,campaign_version) VALUES (77,'fixture',1)").run();
    await current.database.prepare('INSERT INTO repository_selections(repository_id,selected_at,actor_id) VALUES (17,?,77)').bind(at).run();
    const repositories = await Promise.all([17,18,19,20].map(async repositoryId => ({ repositoryId, revision: (await current.app.repositoryAdmission(repositoryId)).revision })));
    await closeLocalAccount({ database: current.database, userId: 77, repositories, now: () => at });
    const deletion = await current.database.prepare("SELECT deleted_at,reapply_until FROM deletion_tombstones WHERE scope='history:17'").first();
    assert.equal(deletion.deleted_at, at);
    assert.equal(deletion.reapply_until, until);
    const exported = await exportCurrent(current.database);
    for (let retry = 0; retry < 2; retry++) {
      assert.equal((await target.replay(exported, { point: healthyPoint })).phase, 'replayed');
      assert.deepEqual(await target.database.prepare("SELECT deleted_at,reapply_until FROM deletion_tombstones WHERE scope='history:17'").first(), deletion);
      assert.equal((await target.app.repositoryAdmission(17)).history.enabled, false);
      assert.equal(await target.app.executionAllowed(17), false);
      assert.equal((await target.database.prepare('SELECT count(*) AS n FROM repository_selections WHERE repository_id=17').first()).n, 0);
      assert.equal((await target.database.prepare('SELECT count(*) AS n FROM participation_prompts WHERE user_id=77').first()).n, 0);
      const authorization = await target.auth.authorization(77), session = await target.auth.session('session');
      assert.ok(!authorization || authorization.revoked_at, 'maintenance may remove an ended grant');
      assert.ok(!session || session.revoked_at, 'the old session is unavailable after replay');
      assert.equal((await target.database.prepare('SELECT count(*) AS n FROM analytical_size_observations WHERE repository_id=17').first()).n, 0);
    }
    // A later deliberate sign-in/consent is current state, not another invocation of the old closure.
    await current.auth.saveAuthorizationWithArtifact(77, 'new-synthetic-grant', point.supportedUntil, 'later-artifact', 'app', point.supportedUntil);
    await current.auth.exchangeArtifact('later-artifact', 'app', 'later-session', point.supportedUntil);
    const store = new D1AppStore(current.database, { now: () => through });
    await createAdmissionService({ store, authorize: async () => true }).update(17, { revision: (await store.repositoryAdmission(17)).revision,
      actor: { userId: 77 }, origin: 'dashboard', history: { enabled: true, retentionDays: 30 } });
    assert.equal((await target.replay(await exportCurrent(current.database), { point: healthyPoint })).phase, 'replayed');
    assert.equal((await target.app.repositoryAdmission(17)).history.enabled, true);
    assert.equal((await target.app.repositoryAdmission(17)).history.actorId, 77);
    assert.equal((await target.auth.authorization(77)).revoked_at, null);
  } finally { await current.runtime.dispose(); await target.runtime.dispose(); }
});

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

test('healthy replay preserves live deletion across every operational table and classifies the whole migrated schema', async () => {
  const current = await fixture(), target = await fixture();
  try {
    const keys = { app_checks: 'repository_id', repairs: 'repository_id', deliveries: 'repository_id',
      execution_attempts: 'repository_id', execution_leases: 'repository_id', operational_results: 'delivery_id' };
    for (const f of [current, target]) for (const id of [17, 18, 19]) {
      await f.database.batch([
        f.database.prepare("INSERT INTO app_checks(repository_id,pull_request,head_sha,policy_id,check_run_id) VALUES (?,1,'head','policy',1)").bind(id),
        f.database.prepare("INSERT INTO repairs(repair_id,repair_kind,repository_id,projection_json,state,code,created_at) VALUES (?,'analysis',?,'{\"private\":\"derived measurement\"}','open','fixture',?)").bind(`repair-${id}`, id, at),
        f.database.prepare("INSERT INTO deliveries(delivery_id,installation_id,repository_id,state,received_at) VALUES (?,9,?,'complete',?)").bind(String(id), id, at),
        f.database.prepare("INSERT INTO execution_attempts(attempt_id,delivery_id,repository_id,pull_request,started_at,state) VALUES (?,?,?,1,?,'complete')").bind(`attempt-${id}`, String(id), id, at),
        f.database.prepare("INSERT INTO operational_results(delivery_id,status,recorded_at) VALUES (?,'complete',?)").bind(String(id), at),
        f.database.prepare("INSERT INTO execution_leases(repository_id,pull_request,state,delivery_id) VALUES (?,1,'complete',?)").bind(id, String(id))
      ]);
    }
    await current.app.deleteHistory(17);
    await current.app.reapplyRepositoryDeletion(18, { deletedAt: at, reapplyUntil: until });
    await new D1CommercialStore(current.database).endLink('link-1', { source: 'fixture-end', endedAt: at });
    const exported = await exportCurrent(current.database);
    const classified = [...exported.currentState.tables.map(table => table.name), ...Object.keys(exported.currentState.membership),
      'history_file_rows', 'history_effect_rows', 'analytical_size_facts'];
    const schema = (await current.database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'").all()).results.map(row => row.name);
    assert.equal(new Set(classified).size, classified.length, 'each table has exactly one recovery disposition');
    assert.deepEqual(classified.sort(), schema.sort(), 'new migrated tables need an explicit recovery disposition');
    assert.equal((await target.replay(exported, { point: healthyPoint })).phase, 'replayed');
    for (const [table, key] of Object.entries(keys)) for (const id of [17, 18, 19]) {
      const sql = `SELECT count(*) AS n FROM ${table} WHERE ${key}=?`;
      const value = key === 'delivery_id' ? String(id) : id;
      const expected = await current.database.prepare(sql).bind(value).first();
      assert.deepEqual(await target.database.prepare(sql).bind(value).first(), expected, `${table}, repository ${id}: live deletion parity`);
      assert.equal(expected.n, id === 18 || (id === 17 && ['app_checks', 'repairs'].includes(table)) ? 0 : 1, `${table}, repository ${id}: seeded live outcome`);
    }
    assert.equal((await target.replay(exported, { point: healthyPoint })).phase, 'replayed', 'membership replay is repeatable');
  } finally { await current.runtime.dispose(); await target.runtime.dispose(); }
});

test('healthy rollback rewinds jobs to retained data and ordinary continuation recovers missing comparisons', async () => {
  const current = await fixture(), target = await fixture();
  try {
    for (const f of [current, target]) await f.app.recordAnalytical(record(1));
    await current.app.recordAnalytical(record(2)); // This comparison was acquired after the point and is deliberately not imported.
    await current.app.recordAnalyticalSizes([{ repositoryId: 17, path: 'later.ts', observedAt: at, revision: head, size: 7 }]);
    for (const [id, repo, kind, state, reason] of [
      ['older', 17, 'import', 'complete', 'all-recoverable'], ['import', 17, 'import', 'running', null],
      ['older-open', 17, 'recalculate', 'paused', 'person'],
      ['recalculate', 17, 'recalculate', 'complete', 'interpreted'], ['paused', 19, 'import', 'paused', 'person'],
      ['stopped-repository', 19, 'recalculate', 'running', null],
      ['deleted', 20, 'import', 'queued', null], ['off', 18, 'import', 'queued', null]
    ]) await current.database.prepare(`INSERT INTO history_jobs(job_id,repository_id,installation_id,kind,state,reason,sequence,scope_limit,cursor_json,progress_json,policy_id,requested_by,requested_at,updated_at,lease_until)
      VALUES (?,?,9,?,?,?,4,100,?,?, 'selected-policy',77,?,?,?)`).bind(id, repo, kind, state, reason,
      JSON.stringify(kind === 'import' ? { page: 3, index: 7 } : { targets: [2], index: 1, capture: { revision: head, since: at } }),
      JSON.stringify({ examined: 107, recorded: 107, records: 107, sizes: 7, interpretable: 107 }), id.startsWith('older') ? point.capturedAt : at, through, until).run();
    await current.app.deleteHistory(20);
    await current.app.setRepositoryConsent(18, { enabled: false, origin: 'fixture-off' });
    await current.app.setRepositoryExecution(19, { enabled: false, origin: 'fixture-stop' });
    await new D1CommercialStore(current.database).endLink('link-1', { source: 'fixture-end', endedAt: at });
    const exported = await exportCurrent(current.database);
    assert.equal((await target.replay(exported, { point: healthyPoint })).phase, 'replayed');
    assert.equal((await target.replay(exported, { point: healthyPoint })).phase, 'replayed', 'a retry derives the same job standing from the committed input');
    const jobs = new D1HistoryJobStore(target.database, { now: () => through });
    const restored = await jobs.job('import');
    assert.equal(restored.state, 'queued');
    assert.deepEqual(restored.cursor, {});
    assert.deepEqual(restored.progress, {});
    assert.equal(restored.scopeLimit, 100);
    assert.equal(restored.requestedBy, 77);
    assert.equal(restored.requestedAt, at);
    assert.equal(restored.sequence, 5, 'an old queued message cannot claim rewound work');
    assert.equal(await jobs.claim('import', 4), null);
    assert.equal((await jobs.job('older')).state, 'stopped', 'older completed runs cannot claim current coverage or become duplicate open work');
    for (const id of ['paused', 'recalculate']) {
      const job = await jobs.job(id);
      assert.equal(job.state, 'paused');
      assert.deepEqual(job.cursor, {});
      assert.deepEqual(job.progress, {});
      assert.match(describeJob(job).title, /paused/iu);
    }
    assert.equal((await jobs.job('paused')).reason, 'person');
    assert.equal((await jobs.job('older-open')).reason, 'person', 'an older explicit request can still be open after retry; age alone does not supersede it');
    assert.equal((await jobs.job('older-open')).state, 'paused');
    assert.equal((await jobs.job('stopped-repository')).reason, 'repository-stopped');
    assert.equal((await jobs.job('recalculate')).reason, 'recovery-rollback');
    assert.equal((await jobs.job('deleted')).reason, 'history-deleted');
    assert.equal((await jobs.job('off')).state, 'stopped');
    assert.ok(!(await jobs.due()).some(job => job.jobId === 'recalculate'), 'a completed unbounded request is not automatically rebuilt on recovery');
    assert.deepEqual((await target.app.analyticalRecords(17)).map(row => row.pullRequest), [1]);
    assert.equal((await target.database.prepare('SELECT count(*) AS n FROM analytical_file_sizes WHERE repository_id=17').first()).n, 1, 'post-point size is not imported');
    const requested = [];
    const pull = { number: 2, state: 'closed', created_at: at, updated_at: at, closed_at: at, merged_at: at, head: { sha: head }, merge_commit_sha: head };
    const client = { async json(route) {
      requested.push(route);
      if (route === '/repositories/17') return { id: 17, full_name: 'owner/repo', default_branch: 'main' };
      if (route.endsWith('/branches/main')) return { commit: { sha: head } };
      if (route.includes('state=closed')) return [{ ...pull }, { ...pull, number: 1 }];
      if (route.endsWith('/pulls/2')) return pull;
      if (route.includes('/git/commits/')) return { sha: head, parents: [{ sha: base }, { sha: 'c'.repeat(40) }] };
      if (route.includes('/compare/')) return { merge_base_commit: { sha: base }, files: [{ filename: 'a.txt' }] };
      throw new Error(`Unexpected fixture route ${route}`);
    }, async request(route) { return { text: route.includes('/compare/') ? patch : 'line\n' }; } };
    const dependencies = { jobs, store: target.app, clientFor: async () => client, now: () => through };
    assert.equal((await runHistoryJob({ jobId: 'import', repositoryId: 17, action: 'import', sequence: 5 }, dependencies)).status, 'complete');
    assert.ok(requested.some(route => route.endsWith('page=1')), 'the missing post-point page remains eligible');
    assert.deepEqual((await target.app.analyticalRecords(17)).map(row => row.pullRequest), [1, 2]);
    const completed = await jobs.job('import');
    assert.equal(completed.progress.recorded, 1);
    assert.equal(completed.progress.already, 1);
    assert.ok((await target.app.analyticalRecords(17)).find(row => row.pullRequest === 2).final, 'ordinary acquisition restores actual numerical comparison');
    const recalculation = await jobs.resume('recalculate');
    assert.equal((await runHistoryJob({ jobId: recalculation.jobId, repositoryId: 17, action: 'recalculate', sequence: recalculation.sequence }, dependencies)).status, 'continued');
    assert.deepEqual((await jobs.job('recalculate')).cursor.targets, [], 'recalculation rediscovers targets instead of skipping an old target list');
  } finally { await current.runtime.dispose(); await target.runtime.dispose(); }
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
