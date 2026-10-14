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

const point = { id: 'sanitized-point', capturedAt: '2026-10-01T00:00:00.000Z', supportedUntil: '2026-10-31T00:00:00.000Z' };
const through = '2026-10-05T00:00:00.000Z';
const at = '2026-10-02T00:00:00.000Z';
const until = '2026-11-08T00:00:00.000Z';
function input(events = []) {
  return { kind: 'diffdevil.app-recovery-input', version: 1, point,
    coverage: { from: point.capturedAt, through,
      sources: ['deletion-expiry', 'history-consent', 'service-disconnect', 'works-disconnect'].map(duty =>
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
    const duties = input([
      { type: 'history-deleted', repositoryId: 17, reapplyUntil: until },
      { type: 'repository-deleted', repositoryId: 18, reapplyUntil: until },
      { type: 'history-disabled', repositoryId: 19 },
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
    assert.equal((await f.database.prepare('SELECT count(*) AS n FROM analytical_file_sizes WHERE repository_id IN (17,18,20)').first()).n, 0);
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
