// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fixture, disposeFixture, viewerFor, NOW, ORIGIN } from './support.mjs';
import { handleManageAction } from '../src/lib/manage/actions.mjs';
import { handleManageExport } from '../src/lib/manage/export.mjs';
import { openSession, SESSION_COOKIE } from '../src/lib/routes.mjs';
import { historyProjection } from '../../github-app/contracts.mjs';
import { loadManage } from '../src/lib/manage/model.mjs';
import { loadView } from '../src/lib/view.mjs';
import { runHistoryJob } from '../../github-app/history-jobs.mjs';
import { describeJob } from '../src/lib/manage/jobs.mjs';
import { resolveViewer } from '../src/lib/viewer.mjs';
after(disposeFixture);

test('consented history imports and repairs three current-API comparisons with repository effects off', async t => {
  const { app: compose, runtime: fixtureRuntime } = await fixture({ seed: async store => {
    await store.recordLifecycle({ installationId: 9, action: 'created', addedRepositories: [1005], removedRepositories: [] });
    await store.recordInstallationAccount(9, 123, 'user');
    await store.recordRepositoryVisibility(1005, false);
    return {};
  } });
  const queued = [];
  const app = compose(undefined, { env: { APP_QUEUE: { send: async value => queued.push(value) } } });
  const database = await fixtureRuntime.getD1Database('APP_DB');
  const { cookie, opened, viewer: initialViewer } = await viewerFor(app);
  let viewer = initialViewer;
  const refreshViewer = async () => { viewer = await resolveViewer({ reads: opened.reads, actor: opened.actor, store: app.store, entitlement: app.entitlement, cache: app.cache }); };
  const repositoryId = 1005, repository = 'ada-sample/notes-site';
  const act = async (action, enabled = 'on', fields = {}) => {
    const response = await handleManageAction(new Request(`${ORIGIN}/manage/do`, { method: 'POST', headers: { origin: ORIGIN },
      body: new URLSearchParams({ action, repository, enabled, back: `/manage/repositories/${repository}`, ...fields }) }), { runtime: app, viewer, session: opened });
    const destination = new URL(response.headers.get('location'), ORIGIN);
    return { message: destination.searchParams.get('m'), reason: destination.searchParams.get('reason') };
  };
  const exportFor = async (name = repository) => {
    await refreshViewer();
    const response = await handleManageExport({ url: new URL(`${ORIGIN}/manage/export?repository=${name}`), locals: { app, viewer, session: opened } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    return response.json();
  };
  const rawCount = async id => (await database.prepare('SELECT COUNT(*) AS n FROM analytical_pull_requests WHERE repository_id=?').bind(id).first()).n;
  assert.equal((await act('history')).message, 'history-on');
  await refreshViewer();
  const admission = await app.appStore.repositoryAdmission(repositoryId);
  assert.equal(admission.state, 'pending-enable');
  const standing = (await app.store.repositoryStandings([repositoryId])).get(repositoryId);
  assert.equal(standing.historyEnabled, true);
  assert.equal(standing.executionActive, false);
  assert.equal(standing.status, 'history');
  const managed = await loadManage({ runtime: app, viewer, session: opened });
  assert.equal(managed.namespaces.flatMap(ns => ns.repositories).find(repo => repo.repositoryId === repositoryId).state.label, 'History only');

  const sha = n => String(n).padStart(40, 'a');
  const mergeOf = number => sha(number + 10), parentOf = number => sha(number + 20);
  const pulls = [1, 2, 3].map(number => ({ number, state: 'closed', merged_at: '2026-10-08T12:00:00.000Z', closed_at: '2026-10-08T12:00:00.000Z',
    created_at: '2026-10-07T12:00:00.000Z', updated_at: '2026-10-08T12:00:00.000Z', commits: 1, head: { sha: sha(number + 30) } }));
  let timelineAvailable = false;
  const reads = [];
  const client = { json: async route => {
    reads.push(route);
    if (route === `/repositories/${repositoryId}`) return { id: repositoryId, full_name: repository, default_branch: 'main' };
    if (route.startsWith(`/repos/${repository}/pulls?`)) return pulls;
    if (route.includes('/pulls/')) return pulls.find(pull => route.endsWith(`/${pull.number}`));
    if (route.includes('/timeline?')) {
      if (!timelineAvailable) throw Object.assign(new Error('unavailable'), { code: 'E_GITHUB_REQUEST', status: 503 });
      const number = Number(route.split('/issues/')[1].split('/')[0]);
      return [{ event: 'merged', commit_id: mergeOf(number), created_at: pulls[0].merged_at }];
    }
    if (route.includes('/branches/')) return { commit: { sha: mergeOf(3) } };
    if (route.includes('/git/commits/')) {
      const revision = route.split('/').at(-1), number = pulls.find(pull => mergeOf(pull.number) === revision)?.number;
      return { sha: revision, parents: number ? [{ sha: parentOf(number) }] : [] };
    }
    if (route.includes('/commits/')) {
      const revision = route.split('/commits/')[1].split('/')[0], number = pulls.find(pull => mergeOf(pull.number) === revision)?.number;
      return number ? [{ number, merged_at: pulls[0].merged_at }] : [];
    }
    if (route.includes('/compare/')) return { merge_base_commit: { sha: route.split('/compare/')[1].split('...')[0] }, files: [{ filename: 'a.txt' }] };
    throw new Error(`Unexpected read ${route}`);
  }, request: async route => {
    reads.push(route);
    return { text: route.includes('/compare/') ? 'diff --git a/a.txt b/a.txt\n--- a/a.txt\n+++ b/a.txt\n@@ -1 +1 @@\n-old\n+new\n' : 'new\n' };
  } };
  const dependencies = { jobs: app.jobs, store: app.appStore, env: { APP_QUEUE: { send: async value => queued.push(value) } }, clientFor: async () => client,
    now: () => NOW, operating: app.operating.standing, importScope: app.importScope };
  const drain = async () => { let steps = 0; while (queued.length) { assert.ok(++steps < 10); await runHistoryJob(queued.shift(), dependencies); } };
  assert.equal((await act('import')).message, 'import-queued');
  await drain();
  const imported = (await app.jobs.latest(repositoryId)).import;
  assert.equal(imported.state, 'complete');
  assert.equal(imported.progress.unrecovered, 3);
  assert.equal(imported.progress.lastRecovery.code, 'E_GITHUB_REQUEST');
  assert.equal(imported.progress.lastRecovery.providerStatus, 503);
  assert.equal(imported.progress.lastRecovery.phase, 'merge-timeline');
  assert.match(describeJob(imported).detail, /acquisition unavailable/u);
  assert.ok((await app.appStore.analyticalRecords(repositoryId)).every(record => record.final === null));

  timelineAvailable = true;
  assert.equal((await act('recalculate')).message, 'recalculate-queued');
  await drain();
  const recalculated = (await app.jobs.latest(repositoryId)).recalculate;
  assert.equal(recalculated.state, 'complete');
  assert.equal(recalculated.progress.reacquired, 3);
  assert.equal(recalculated.progress.withoutComparison, 0);
  const records = await app.appStore.analyticalRecords(repositoryId);
  assert.equal(records.length, 3);
  assert.ok(records.every(record => record.final?.basis === 'final-merged-comparison' && record.final.report.totals.lines.changed.value === 1));
  assert.equal(await app.appStore.executionAllowed(repositoryId), false);
  const finalAdmission = await app.appStore.repositoryAdmission(repositoryId);
  assert.deepEqual(finalAdmission.execution, admission.execution);
  assert.deepEqual(finalAdmission.writer, admission.writer);
  const view = await loadView({ url: new URL(`${ORIGIN}/history?s=${repository}`), viewer, session: opened, runtime: app, surface: 'history' });
  assert.equal(view.historyRepositories.length, 1);
  assert.equal(view.current.mergedRecovered, 3);
  assert.ok(!reads.some(route => route.includes('undefined')));
  assert.equal((await act('import')).message, 'import-queued');
  assert.equal((await act('stop')).message, 'stopped');
  const stopped = (await app.store.repositoryStandings([repositoryId])).get(repositoryId);
  assert.equal(stopped.historyConsented, true);
  assert.equal(stopped.historyEnabled, false, 'Stop pauses collection without revoking consent');
  assert.equal(stopped.historyPauseReason, 'stopped');
  assert.equal(stopped.selected, false, 'Stop frees the place');
  assert.equal(stopped.status, 'history-paused');
  const readsBeforePause = reads.length;
  await drain();
  assert.equal(reads.length, readsBeforePause, 'a queued import respects Stop before acquiring provider data');
  assert.equal((await app.jobs.latest(repositoryId)).import.reason, 'repository-stopped');
  assert.equal((await app.appStore.analyticalRecords(repositoryId)).length, 3);
  await refreshViewer();
  const retainedView = await loadView({ url: new URL(`${ORIGIN}/history?s=${repository}`), viewer, session: opened, runtime: app, surface: 'history' });
  assert.equal(retainedView.current.mergedRecovered, 3, 'Stop keeps retained comparisons available');
  await t.test('a collection pause exports its permitted retained comparisons', async () => {
    const exported = (await exportFor()).repositories[0];
    assert.ok(exported.retainedHistory);
    assert.deepEqual(exported.analyticalRecords.records.map(row => row.record), records);
    assert.equal((await app.appStore.historySettings(repositoryId, { independentExecution: true })).enabled, false);
  });
  await t.test('failed personal history deletion refuses account closure and keeps the session recoverable', async () => {
    // Fail the actual shared D1 boundary; closure no longer calls the standalone history-deletion method.
    await database.exec("CREATE TRIGGER fixture_closure_deletion BEFORE DELETE ON analytical_pull_requests BEGIN SELECT RAISE(ABORT,'fixture deletion unavailable'); END");
    try {
      const refused = await act('close-account', 'off', { confirm: viewer.login, back: '/manage/account' });
      assert.equal(refused.message, 'close-incomplete');
      assert.equal(refused.reason, null);
      assert.equal(await rawCount(repositoryId), 3);
      assert.equal((await openSession(new Request(`${ORIGIN}/manage/account`, { headers: { cookie: `${SESSION_COOKIE}=${cookie}` } }), app)).refusal, undefined);
    } finally { await database.exec('DROP TRIGGER fixture_closure_deletion'); }
  });
  assert.equal((await act('history')).message, 'history-on', 'explicit history readmission is independent of execution');
  assert.equal((await app.appStore.historySettings(repositoryId, { independentExecution: true })).enabled, true);
  assert.equal(await app.appStore.executionAllowed(repositoryId), false);
  // Migration 0003 preserves this valid consent even though its original actor and origin are unknown.
  await database.prepare('UPDATE repositories SET history_consent_origin=NULL, history_consent_actor_id=NULL WHERE repository_id=?').bind(repositoryId).run();
  assert.equal((await act('history', 'off')).message, 'history-off');
  const off = (await app.store.repositoryStandings([repositoryId])).get(repositoryId);
  assert.equal(off.historyEnabled, false);
  assert.equal(off.historyConsented, true, 'Stop collecting stops new collection without revoking history consent');
  assert.equal(off.historyReason, null);
  assert.equal(off.historyCollectionEnabled, false);
  assert.equal(off.historyReadable, true);
  assert.equal(off.historyOrigin, 'unknown');
  assert.equal(off.historyActorId, null);
  assert.equal(off.selected, false);
  assert.equal((await app.appStore.historySettings(repositoryId, { independentExecution: true })).enabled, false, 'opt-out still prevents new collection');
  assert.equal((await app.appStore.analyticalRecords(repositoryId)).length, 3, 'Stop collecting preserves already-retained records for reading');
  await refreshViewer();
  const historyOffView = await loadView({ url: new URL(`${ORIGIN}/history?s=${repository}`), viewer, session: opened, runtime: app, surface: 'history' });
  assert.equal(historyOffView.historyRepositories.length, 1);
  assert.equal(historyOffView.current.mergedRecovered, 3, 'History keeps its factual retained population after collection stops');
  await t.test('legacy consent with unknown provenance retains real exports after Stop collecting', async () => {
    const exported = (await exportFor()).repositories[0];
    assert.ok(exported.retainedHistory);
    assert.deepEqual(exported.analyticalRecords.records.map(row => row.record), records);
    assert.equal((await app.appStore.repositoryAdmission(repositoryId)).history.origin, 'unknown');
    assert.equal((await app.appStore.repositoryAdmission(repositoryId)).history.actorId, null);
    assert.equal((await app.appStore.recordAnalytical({ ...records[0], pullRequest: 99 })).status, 'disabled');
    assert.equal(await rawCount(repositoryId), 3, 'retained readability cannot publish a new comparison');
  });
  await t.test('export still requires current administration and retained reads still enforce each refusal', async () => {
    const readAdmission = app.auth.readAdmission;
    app.auth.readAdmission = async () => { throw Object.assign(new Error('fixture administration denied'), { code: 'E_ADMISSION_UNAUTHORIZED' }); };
    try {
      const refused = await exportFor();
      assert.deepEqual(refused.repositories, []);
      assert.deepEqual(refused.notAdministered, [repository]);
    } finally { app.auth.readAdmission = readAdmission; }
    const changes = [
      ['history_consent_reason', 'never-enabled', null],
      ['history_consent_reason', 'explicitly-disabled', null],
      ['history_consent_reason', 're-consent-required', null],
      ['history_consent_reason', 'unknown', null],
      ['state', 'offboarding', 'pending-enable'],
      ['access_state', 'removed', 'available']
    ];
    for (const [column, value, original] of changes) {
      await database.prepare(`UPDATE repositories SET ${column}=? WHERE repository_id=?`).bind(value, repositoryId).run();
      try {
        assert.equal((await app.store.repositoryStandings([repositoryId])).get(repositoryId).historyReadable, false, `${column}=${value}`);
        assert.deepEqual(await app.appStore.analyticalRecords(repositoryId), []);
        const exported = await exportFor();
        assert.ok(exported.repositories.every(row => row.retainedHistory === null && row.analyticalRecords === null));
      } finally { await database.prepare(`UPDATE repositories SET ${column}=? WHERE repository_id=?`).bind(original, repositoryId).run(); }
    }
    const expiry = (await database.prepare('SELECT expires_at FROM analytical_pull_requests WHERE repository_id=? AND pull_request=1').bind(repositoryId).first()).expires_at;
    await database.prepare('UPDATE analytical_pull_requests SET expires_at=? WHERE repository_id=? AND pull_request=1').bind(NOW, repositoryId).run();
    assert.equal((await exportFor()).repositories[0].analyticalRecords.records.length, 2, 'expired observations are omitted');
    await database.prepare('UPDATE analytical_pull_requests SET expires_at=? WHERE repository_id=? AND pull_request=1').bind(expiry, repositoryId).run();
    await database.prepare('INSERT INTO deletion_tombstones(scope,deleted_at,reapply_until) VALUES (?,?,?)').bind(`history:${repositoryId}`, NOW, '2026-11-15T00:00:00.000Z').run();
    try {
      assert.deepEqual(await app.appStore.analyticalRecords(repositoryId), []);
      const exported = await exportFor();
      assert.ok(exported.repositories.every(row => row.retainedHistory === null && row.analyticalRecords === null));
    } finally { await database.prepare('DELETE FROM deletion_tombstones WHERE scope=?').bind(`history:${repositoryId}`).run(); }
  });
  await t.test('account closure deletes stopped and paused personal history and keeps organisation history', async () => {
    for (const [id, installationId, accountId, kind, privateRepository] of [[1004, 9, 123, 'user', true], [1002, 10, 7001, 'organization', false]]) {
      await app.appStore.recordLifecycle({ installationId, action: 'created', addedRepositories: [id], removedRepositories: [] });
      await app.appStore.recordInstallationAccount(installationId, accountId, kind);
      await app.appStore.recordRepositoryVisibility(id, privateRepository);
      await app.appStore.setRepositoryConsent(id, { enabled: true, retentionDays: 30, origin: 'fixture' });
      assert.equal((await app.appStore.recordAnalytical({ ...records[0], repositoryId: id })).status, 'published');
    }
    await app.appStore.setRepositoryExecution(1004, { enabled: true, origin: 'fixture' });
    assert.equal((await app.appStore.recordHistory({ repositoryId: 1004, pullRequest: 1, comparisonId: 'closure-pathless', policyId: 'fixture' }, historyProjection(records[0].final.report, []))).status, 'published');
    assert.equal((await database.prepare('SELECT COUNT(*) AS n FROM history_records WHERE repository_id=1004').first()).n, 1);
    await refreshViewer();
    assert.equal((await act('stop', 'off', { repository: 'ada-sample/dotfiles' })).message, 'stopped');
    const paused = (await app.store.repositoryStandings([1004])).get(1004);
    assert.equal(paused.historyConsented, true);
    assert.equal(paused.historyEnabled, false);
    const retainedExport = (await exportFor()).repositories[0].analyticalRecords;
    const closure = await act('close-account', 'off', { confirm: viewer.login, back: '/manage/account' });
    assert.equal(closure.reason, 'E_ACCOUNT_CLOSED');
    assert.equal((await openSession(new Request(`${ORIGIN}/manage/account`, { headers: { cookie: `${SESSION_COOKIE}=${cookie}` } }), app)).refusal, 'E_SESSION_UNAVAILABLE');
    for (const id of [repositoryId, 1004]) {
      assert.equal(await rawCount(id), 0);
      assert.deepEqual(await app.appStore.analyticalRecords(id), []);
      assert.ok(await database.prepare('SELECT 1 FROM deletion_tombstones WHERE scope=? AND reapply_until>?').bind(`history:${id}`, NOW).first());
    }
    assert.equal((await database.prepare('SELECT COUNT(*) AS n FROM history_records WHERE repository_id=1004').first()).n, 0);
    assert.equal((await app.appStore.importAnalytical(retainedExport)).published, 0, 'an earlier export cannot restore deleted personal history');
    assert.equal(await rawCount(1002), 1, 'organisation-owned history remains');
    assert.equal((await app.appStore.analyticalRecords(1002)).length, 1);
    assert.equal(await database.prepare('SELECT 1 FROM deletion_tombstones WHERE scope=?').bind('history:1002').first(), null);
  });
});
