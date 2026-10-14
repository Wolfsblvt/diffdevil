// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fixture, disposeFixture, viewerFor, NOW, ORIGIN } from './support.mjs';
import { handleManageAction } from '../src/lib/manage/actions.mjs';
import { loadManage } from '../src/lib/manage/model.mjs';
import { loadView } from '../src/lib/view.mjs';
import { runHistoryJob } from '../../github-app/history-jobs.mjs';
import { describeJob } from '../src/lib/manage/jobs.mjs';
import { resolveViewer } from '../src/lib/viewer.mjs';
after(disposeFixture);

test('consented history imports and repairs three current-API comparisons with repository effects off', async () => {
  const { app: compose } = await fixture({ seed: async store => {
    await store.recordLifecycle({ installationId: 9, action: 'created', addedRepositories: [1005], removedRepositories: [] });
    await store.recordInstallationAccount(9, 123, 'user');
    await store.recordRepositoryVisibility(1005, false);
    return {};
  } });
  const queued = [];
  const app = compose(undefined, { env: { APP_QUEUE: { send: async value => queued.push(value) } } });
  const { opened, viewer: initialViewer } = await viewerFor(app);
  let viewer = initialViewer;
  const refreshViewer = async () => { viewer = await resolveViewer({ reads: opened.reads, actor: opened.actor, store: app.store, entitlement: app.entitlement, cache: app.cache }); };
  const repositoryId = 1005, repository = 'ada-sample/notes-site';
  const act = async (action, enabled = 'on') => {
    const response = await handleManageAction(new Request(`${ORIGIN}/manage/do`, { method: 'POST', headers: { origin: ORIGIN },
      body: new URLSearchParams({ action, repository, enabled, back: `/manage/repositories/${repository}` }) }), { runtime: app, viewer, session: opened });
    return { message: new URL(response.headers.get('location'), ORIGIN).searchParams.get('m') };
  };
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
  assert.equal((await act('history')).message, 'history-on', 'explicit history readmission is independent of execution');
  assert.equal((await app.appStore.historySettings(repositoryId, { independentExecution: true })).enabled, true);
  assert.equal(await app.appStore.executionAllowed(repositoryId), false);
  assert.equal((await act('history', 'off')).message, 'history-off');
  const off = (await app.store.repositoryStandings([repositoryId])).get(repositoryId);
  assert.equal(off.historyEnabled, false);
  assert.equal(off.historyConsented, true, 'Stop collecting stops new collection without revoking history consent');
  assert.equal(off.historyCollectionEnabled, false);
  assert.equal(off.historyReadable, true);
  assert.equal(off.selected, false);
  assert.equal((await app.appStore.historySettings(repositoryId, { independentExecution: true })).enabled, false, 'opt-out still prevents new collection');
  assert.equal((await app.appStore.analyticalRecords(repositoryId)).length, 3, 'Stop collecting preserves already-retained records for reading');
  await refreshViewer();
  const historyOffView = await loadView({ url: new URL(`${ORIGIN}/history?s=${repository}`), viewer, session: opened, runtime: app, surface: 'history' });
  assert.equal(historyOffView.historyRepositories.length, 1);
  assert.equal(historyOffView.current.mergedRecovered, 3, 'History keeps its factual retained population after collection stops');
});
