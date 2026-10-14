// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * Operating continuity against the real local D1: the selected allowances as the runtime applies them (execution and
 * collection, without a signed-in viewer), a saved choice of what stays becoming durable state at the plan's actual
 * reduction (and diffdevil not picking when there is none), and history imports and recalculation as durable jobs run
 * through the managed App's real queue consumer, with their pause, resume, rate-limit, allowance and deletion
 * outcomes. GitHub is a wire-shaped double; Works is the loopback stand-in. Nothing reaches GitHub or Works.
 */
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { handleManageAction } from '../src/lib/manage/actions.mjs';
import { loadManage } from '../src/lib/manage/model.mjs';
import { describeJob, jobBrief } from '../src/lib/manage/jobs.mjs';
import { SESSION_COOKIE, openSession } from '../src/lib/routes.mjs';
import { resolveViewer } from '../src/lib/viewer.mjs';
import { createGitHubAppWorker, executeDelivery } from '../../github-app/app.mjs';
import { D1AppStore } from '../../github-app/storage.mjs';
import { fixture, disposeFixture, signIn, ORIGIN } from './support.mjs';

after(disposeFixture);

const plan = (since, extra = {}) => JSON.stringify({ account: 123, linked: true, since, commercial: { standing: 'funded', tier: 'pro', cadence: 'annual', period: { started_on: '2026-03-14', ends_on: '2027-03-14' }, renewal_preference: 'automatic', cancellation_intent: 'none', grace: null, ended: null, next_renewal: null },
  capacity: [{ slot: 'slot-included', funding: 'included', binding: { organisationId: 7001, authority: 'present', display: 'parser-guild' } }], others: { 7002: 'business' }, ...extra });
/** Small operator allowances make a reduction over the limit with the fixture's few repositories. */
const TIGHT = JSON.stringify({ free: { private: 1, publicHistory: 1, importPullRequests: 5 }, proOrganisation: { private: 1 } });

async function locals(app, cookie) {
  const opened = await openSession(new Request(`${ORIGIN}/manage`, { headers: { cookie: `${SESSION_COOKIE}=${cookie}` } }), app);
  const viewer = await resolveViewer({ reads: opened.reads, actor: opened.actor, store: app.store, entitlement: app.entitlement, cache: app.cache });
  return { runtime: app, session: opened, viewer };
}
async function act(app, cookie, fields) {
  const response = await handleManageAction(new Request(`${ORIGIN}/manage/do`, { method: 'POST', headers: { cookie: `${SESSION_COOKIE}=${cookie}`, origin: ORIGIN, 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(fields) }), await locals(app, cookie));
  assert.equal(response.status, 303, `${fields.action}: ${response.status}`);
  return new URL(response.headers.get('location'), ORIGIN).searchParams.get('m');
}
/** The tests share one seeded database: put the repositories and Free connection a reduction test relies on back. */
async function reset(env) {
  const store = new D1AppStore(env.APP_DB);
  for (const repositoryId of [1001, 1004]) {
    await store.setRepositoryExecution(repositoryId, { enabled: true, origin: 'fixture' });
    await store.setRepositoryConsent(repositoryId, { enabled: true, retentionDays: 3660, origin: 'fixture' });
  }
  await env.APP_DB.batch(['DELETE FROM free_connections', 'DELETE FROM plan_change_choices', 'DELETE FROM repository_selections'].map(sql => env.APP_DB.prepare(sql)));
}
async function manageModel(app, cookie) { const context = await locals(app, cookie); return loadManage({ viewer: context.viewer, session: context.session, runtime: app }); }

test('without allowances (Community) the runtime never limits; the operator keeps that control', async () => {
  const { app: compose } = await fixture();
  const app = compose();
  assert.equal(app.operating.limited, false);
  assert.deepEqual(await app.operating.standing(1004), { execution: 'allowed', history: 'allowed', reason: 'not-limited' });
});

test('a reduction applies the saved choice: the runtime holds what was not chosen at once, and the choice becomes durable state', async () => {
  const { app: compose, env } = await fixture();
  await reset(env);
  const app = compose(undefined, { env: { APP_COMMERCIAL_FIXTURE: plan('2026-10-03'), APP_PLAN_ALLOWANCES: TIGHT } });
  const { cookie } = await signIn(app);
  // On Pro: personal has no limit, parser-guild has its (operator-set) one private slot, held by parser-lab.
  assert.equal((await app.operating.standing(1004)).execution, 'allowed');
  assert.equal((await app.operating.standing(1001)).reason, 'within-allowance');
  // Before the effective date: keep parser-guild connected and parser-lab running; dotfiles is not chosen.
  assert.equal(await act(app, cookie, { action: 'plan-choice', organisation: '7001', keep: '1001', from: 'pro', target: 'free', back: '/manage/plan' }), 'choice-saved');
  assert.equal((await app.operating.standing(1004)).execution, 'allowed', 'nothing changes before the reduction takes effect');
  // Works applies the reduction (the stand-in moves the plan as an applied order would).
  app.commercial.applyPlan('free');
  // The runtime already follows the choice, before anyone visits Manage: parser-guild joins the Free pool, dotfiles waits.
  assert.deepEqual(await app.operating.standing(1001), { execution: 'allowed', history: 'allowed', reason: 'within-allowance' });
  assert.deepEqual(await app.operating.standing(1004), { execution: 'held', history: 'held', reason: 'not-chosen' });
  const store = new D1AppStore(env.APP_DB);
  await assert.rejects(() => executeDelivery({ type: 'pull-request', action: 'synchronize', installationId: 9, repositoryId: 1004, pullRequest: 1 }, 'delivery', { env: {}, store, lease: {}, operating: app.operating.standing }), { code: 'E_APP_ALLOWANCE' }, 'execution refuses before any credential or provider read');
  // The scheduled maintenance (or the next visit) makes it durable: connected, released and stopped, history kept.
  assert.deepEqual(await app.operating.maintain(), { applied: 1 });
  const choice = await app.manage.planChoice(123);
  assert.ok(choice.appliedAt);
  assert.deepEqual({ kept: choice.outcome.kept, released: choice.outcome.released, connected: choice.outcome.connected }, { kept: [1001], released: [1004], connected: 7001 });
  assert.equal((await app.manage.freeConnection(123)).organisationId, 7001);
  assert.equal(await store.executionAllowed(1004), false);
  assert.deepEqual(await app.operating.maintain(), { applied: 0 }, 'an applied choice is applied once');
  const loaded = await manageModel(app, cookie);
  const dotfiles = loaded.namespaces.find(namespace => namespace.login === 'ada-sample').repositories.find(repository => repository.repositoryId === 1004);
  assert.equal(dotfiles.state.kind, 'stoppedByYou');
  assert.equal(dotfiles.standing.historyConsented, true, 'the lower allowance holds collection without revoking separate consent');
  assert.match(dotfiles.state.why, /when the plan changed/u);
  assert.equal(loaded.namespaces[0].capacity.over, false, 'the saved choice really frees displaced capacity');
  assert.equal((await store.historySettings(1004, { independentExecution: true })).enabled, false, 'released history is held at collection, not just hidden');
  assert.equal(loaded.namespaces.find(namespace => namespace.login === 'parser-guild').repositories.find(repository => repository.repositoryId === 1001).state.kind, 'active');
  assert.equal(await act(app, cookie, { action: 'stop', repository: 'parser-guild/parser-lab', back: '/manage' }), 'stopped');
  assert.equal((await app.store.repositoryStandings([1001])).get(1001).historyConsented, true, 'Stop frees the place without changing history choice');
  assert.equal(await act(app, cookie, { action: 'select', repository: 'ada-sample/dotfiles', back: '/manage' }), 'selected', 'the freed place admits a different repository');
  assert.equal((await store.historySettings(1004, { independentExecution: true })).enabled, true, 'explicit re-admission resumes retained consent');
  assert.equal(await store.executionAllowed(1004), false, 'history resumes without enabling repository effects');
});

test('without a choice diffdevil does not pick: a scope over its lower limit holds all of it, and an organisation without a plan holds', async () => {
  const { app: compose, env } = await fixture();
  await reset(env);
  const zero = JSON.stringify({ free: { private: 0, publicHistory: 0, importPullRequests: 5 }, proOrganisation: { private: 0 } });
  const app = compose(undefined, { env: { APP_COMMERCIAL_FIXTURE: plan('2026-10-04'), APP_PLAN_ALLOWANCES: zero } });
  const { cookie } = await signIn(app);
  app.commercial.applyPlan('free');
  assert.equal((await app.operating.standing(1001)).reason, 'no-plan', 'an organisation neither funded nor connected has no plan');
  assert.deepEqual(await app.operating.standing(1004), { execution: 'held', history: 'held', reason: 'over-allowance-unchosen' });
  assert.deepEqual(await app.operating.standing(1005), { execution: 'allowed', history: 'allowed', reason: 'within-allowance' }, 'public labels never count; this one has no history to hold');
  assert.deepEqual(await app.operating.maintain(), { applied: 0 }, 'no saved choice: nothing is picked or written');
  const loaded = await manageModel(app, cookie);
  const personal = loaded.namespaces.find(namespace => namespace.kind === 'user');
  assert.equal(personal.capacity.over, true); assert.equal(personal.capacity.chosen, false);
  assert.equal(personal.repositories.find(repository => repository.repositoryId === 1004).state.kind, 'overAllowance');
  assert.ok(loaded.attention.some(item => /Choose what stays/u.test(item.title) && item.href === '/manage/plan#choose'));
  // Saving a choice after the reduction applies it at once.
  const applied = await act(app, cookie, { action: 'plan-choice', keep: '1004', from: 'pro', target: 'free', back: '/manage/plan' });
  assert.equal(applied, 'choice-over', 'a choice beyond the lower allowance is refused rather than trimmed');
  assert.equal(await act(app, cookie, { action: 'plan-choice', from: 'pro', target: 'free', back: '/manage/plan' }), 'choice-applied');
  assert.equal((await app.manage.planChoice(123)).outcome.released.includes(1004), true);
});

/** A wire-shaped GitHub double for one repository's closed pull requests: unmerged ones record lifecycle; a merged one has no recoverable comparison. */
function githubDouble({ repositoryId, fullName, pulls, failOnce = null }) {
  let failures = failOnce ? 1 : 0;
  const created = number => new Date(Date.UTC(2026, 5, 1) + number * 3_600_000).toISOString();
  const pull = number => ({ number, state: 'closed', draft: false, merged_at: number % 5 === 0 ? created(number + 1) : null, merge_commit_sha: number % 5 === 0 ? 'a'.repeat(40) : null, created_at: created(number), closed_at: created(number + 1), updated_at: created(number + 1), head: { sha: `${String(number).padStart(4, '0')}${'b'.repeat(36)}` }, commits: 1 });
  const reads = [];
  return {
    reads,
    async json(route) {
      reads.push(route);
      if (failures && route.includes(failOnce)) { failures -= 1; throw Object.assign(new Error('rate limited'), { code: 'E_GITHUB_RATE_LIMIT' }); }
      if (route === `/repositories/${repositoryId}`) return { id: repositoryId, full_name: fullName, default_branch: 'main' };
      const listing = /\/pulls\?state=closed&sort=created&direction=desc&per_page=(\d+)&page=(\d+)$/u.exec(route);
      if (listing) { const size = Number(listing[1]), page = Number(listing[2]); return [...pulls].sort((left, right) => right - left).slice((page - 1) * size, page * size).map(pull); }
      if (route === `/repos/${fullName}/branches/main`) return { commit: { sha: 'c'.repeat(40) } };
      const one = new RegExp(`^/repos/${fullName}/pulls/(\\d+)$`, 'u').exec(route);
      if (one) return pull(Number(one[1]));
      throw Object.assign(new Error(`unexpected ${route}`), { code: 'E_GITHUB_REQUEST', status: 404 });
    },
    async request(route) { reads.push(route); throw Object.assign(new Error(`unexpected ${route}`), { code: 'E_GITHUB_REQUEST', status: 404 }); }
  };
}
function fakeQueue() {
  const sent = [];
  return { sent, async send(body, options) { sent.push({ body, delaySeconds: options?.delaySeconds ?? 0 }); }, async sendBatch(messages) { for (const message of messages) sent.push({ body: message.body, delaySeconds: 0 }); } };
}
/** Deliver every queued step through the managed App's real queue consumer, as the Worker's queue handler would. */
async function drain(worker, env, queue, { until = 50 } = {}) {
  const outcomes = [];
  for (let round = 0; round < until && queue.sent.length; round++) {
    const { body } = queue.sent.shift();
    const message = { body, acked: false, retried: false, ack() { this.acked = true; }, retry() { this.retried = true; } };
    await worker.queue({ messages: [message] }, env);
    outcomes.push(message.acked ? 'ack' : message.retried ? 'retry' : 'none');
  }
  return outcomes;
}

test('an import is a durable job: queued behind live work, run in steps through the real consumer, deduplicated, and its progress shown', async () => {
  const { app: compose, env, clock } = await fixture();
  await reset(env);
  const queue = fakeQueue();
  const app = compose(undefined, { env: { APP_QUEUE: queue } });
  const { cookie } = await signIn(app);
  const github = githubDouble({ repositoryId: 1004, fullName: 'ada-sample/dotfiles', pulls: Array.from({ length: 12 }, (_, index) => 9001 + index) });
  const workerEnv = { APP_DB: env.APP_DB, APP_QUEUE: queue };
  const worker = createGitHubAppWorker({ analyticalClientFactory: async () => github, operating: app.operating.standing, importScope: app.importScope, currentPolicy: repositoryId => app.policies.current({ repositoryId }), now: () => clock.value });
  assert.equal(await act(app, cookie, { action: 'import', repository: 'ada-sample/dotfiles', back: '/manage' }), 'import-queued');
  assert.equal(await act(app, cookie, { action: 'import', repository: 'ada-sample/dotfiles', back: '/manage' }), 'import-running', 'asking again is the same work, not new work');
  assert.equal(queue.sent.length, 1);
  assert.equal(queue.sent[0].body.type, 'history-job');
  assert.equal(await act(app, cookie, { action: 'import', repository: 'ada-sample/notes-site', back: '/manage' }), 'history-required');
  assert.deepEqual(await drain(worker, workerEnv, queue), ['ack', 'ack'], 'two steps: ten pull requests, then the remaining two');
  const job = (await app.jobs.latest(1004)).import;
  assert.equal(job.state, 'complete'); assert.equal(job.reason, 'all-recoverable');
  assert.equal(job.scopeLimit, null, 'a Community deployment imports all recoverable history');
  assert.deepEqual({ examined: job.progress.examined, recorded: job.progress.recorded, unrecovered: job.progress.unrecovered }, { examined: 12, recorded: 10, unrecovered: 2 });
  const records = (await new D1AppStore(env.APP_DB).analyticalRecords(1004)).filter(record => record.pullRequest >= 9001);
  assert.equal(records.length, 12, 'every imported pull request is one record, merged ones with their lifecycle even without a comparison');
  assert.ok(records.every(record => record.revisions.length === 0 && !record.final), 'an import never invents an original App result or comparison');
  assert.ok(github.reads.every(route => !/labels|comments|check-runs|issues/u.test(route)), 'an import only reads pull requests');
  const view = describeJob(job);
  assert.equal(view.open, false);
  assert.equal(view.tone, 'warn', 'finishing the listing does not make the unrecovered comparisons successful');
  assert.deepEqual(view.actions, []);
  // A repeated import finds them retained: the same logical identity, not duplicated work.
  assert.equal(await act(app, cookie, { action: 'import', repository: 'ada-sample/dotfiles', back: '/manage' }), 'import-queued');
  await drain(worker, workerEnv, queue);
  const again = (await app.jobs.latest(1004)).import;
  assert.equal(again.progress.already, 10, 'closed ones are already retained; merged ones without a comparison are tried again');
});

test('recalculation re-reads what the current policy cannot interpret, names its basis, and pauses and resumes from saved progress', async () => {
  const { app: compose, env, clock } = await fixture();
  const queue = fakeQueue();
  const app = compose(undefined, { env: { APP_QUEUE: queue } });
  const { cookie } = await signIn(app);
  const github = githubDouble({ repositoryId: 1004, fullName: 'ada-sample/dotfiles', pulls: [9101, 9105], failOnce: '/branches/' });
  const workerEnv = { APP_DB: env.APP_DB, APP_QUEUE: queue };
  const worker = createGitHubAppWorker({ analyticalClientFactory: async () => github, operating: app.operating.standing, importScope: app.importScope, currentPolicy: repositoryId => app.policies.current({ repositoryId }), now: () => clock.value });
  assert.equal(await act(app, cookie, { action: 'import', repository: 'ada-sample/dotfiles', back: '/manage' }), 'import-queued');
  await drain(worker, workerEnv, queue);
  assert.equal(await act(app, cookie, { action: 'recalculate', repository: 'ada-sample/dotfiles', back: '/manage' }), 'recalculate-queued');
  let job = (await app.jobs.latest(1004)).recalculate;
  // A person pauses before the step runs: the queued step is not claimed, and nothing is lost.
  assert.equal(await act(app, cookie, { action: 'job-pause', repository: 'ada-sample/dotfiles', job: job.jobId, back: '/manage' }), 'job-paused');
  await drain(worker, workerEnv, queue);
  assert.equal((await app.jobs.job(job.jobId)).state, 'paused');
  assert.equal(describeJob(await app.jobs.job(job.jobId)).actions[0], 'resume');
  assert.equal(await act(app, cookie, { action: 'job-resume', repository: 'ada-sample/dotfiles', job: job.jobId, back: '/manage' }), 'job-resumed');
  // The default-branch size read meets a rate limit once: the job pauses with a wake time and a delayed step.
  await drain(worker, workerEnv, queue, { until: 1 });
  job = await app.jobs.job(job.jobId);
  assert.equal(job.state, 'paused'); assert.equal(job.reason, 'provider-rate-limit');
  assert.equal(queue.sent.at(-1).delaySeconds, 900);
  assert.match(describeJob(job).detail, /rate limit/u);
  const early = await drain(worker, workerEnv, { sent: [queue.sent.at(-1)] });
  assert.deepEqual(early, ['ack']); assert.equal((await app.jobs.job(job.jobId)).state, 'paused', 'a step that arrives before the wake time does not run');
  clock.value = new Date(Date.parse(clock.value) + 20 * 60_000).toISOString();
  await drain(worker, workerEnv, queue);
  job = await app.jobs.job(job.jobId);
  assert.equal(job.state, 'complete');
  assert.ok(job.progress.targets >= 1, 'the merged pull request without a comparison is re-read');
  assert.equal(job.progress.unrecovered >= 1, true, 'and stays named when GitHub still cannot supply its comparison');
  assert.equal(job.progress.basis, 'current-policy'); assert.match(job.policyId, /^policy-/u);
  assert.match(describeJob(job).detail, /interpreted under the current policy/u);
});

test('a hosted Free import reaches its allowance; an organisation without a plan pauses it; deletion stops it for good', async () => {
  const { app: compose, env, clock } = await fixture();
  await reset(env);
  const queue = fakeQueue();
  const app = compose(undefined, { env: { APP_QUEUE: queue, APP_COMMERCIAL_FIXTURE: JSON.stringify({ account: 123, linked: false, others: {} }), APP_PLAN_ALLOWANCES: JSON.stringify({ free: { private: 3, publicHistory: 10, importPullRequests: 5 }, proOrganisation: { private: 3 } }) } });
  const { cookie } = await signIn(app);
  const github = githubDouble({ repositoryId: 1001, fullName: 'parser-guild/parser-lab', pulls: Array.from({ length: 12 }, (_, index) => 9201 + index) });
  const workerEnv = { APP_DB: env.APP_DB, APP_QUEUE: queue };
  const worker = createGitHubAppWorker({ analyticalClientFactory: async () => github, operating: app.operating.standing, importScope: app.importScope, currentPolicy: repositoryId => app.policies.current({ repositoryId }), now: () => clock.value });
  assert.equal(await act(app, cookie, { action: 'import', repository: 'parser-guild/parser-lab', back: '/manage' }), 'import-queued');
  let job = (await app.jobs.latest(1001)).import;
  assert.equal(job.scopeLimit, 5, 'the Free import reaches recent pull requests up to its allowance');
  await drain(worker, workerEnv, queue);
  job = await app.jobs.job(job.jobId);
  assert.equal(job.state, 'paused'); assert.equal(job.reason, 'over-allowance', 'parser-guild is not connected to the Free account, so nothing is collected');
  assert.equal(jobBrief([job]), 'importing paused');
  assert.ok(await app.manage.connectFree(123, 7001));
  assert.equal(await act(app, cookie, { action: 'job-resume', repository: 'parser-guild/parser-lab', job: job.jobId, back: '/manage' }), 'job-resumed');
  await drain(worker, workerEnv, queue);
  job = await app.jobs.job(job.jobId);
  assert.equal(job.state, 'complete'); assert.equal(job.reason, 'limit-reached'); assert.equal(job.progress.examined, 5);
  assert.match(describeJob(job).title, /Free import limit/u);
  // Deleting history stops an open job, and the deletion record keeps a late step from writing.
  assert.equal(await act(app, cookie, { action: 'recalculate', repository: 'parser-guild/parser-lab', back: '/manage' }), 'recalculate-queued');
  await new D1AppStore(env.APP_DB).deleteHistory(1001);
  const stopped = (await app.jobs.latest(1001)).recalculate;
  assert.equal(stopped.state, 'stopped'); assert.equal(stopped.reason, 'history-deleted');
  await drain(worker, workerEnv, queue);
  assert.equal((await app.jobs.job(stopped.jobId)).state, 'stopped');
});
