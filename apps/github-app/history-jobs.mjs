// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * Durable history jobs: importing past pull requests and recalculating a repository's history
 * (docs/app-management.md#inspect-history-processing, docs/PRIVACY-AND-DATA.md#import-and-progressive-processing).
 *
 * A job is a D1 row that owns its purpose, scope, cursor and progress; a queue message only names the job and the step
 * it continues, so a lost, late or duplicated message can neither replay nor fork the work, and progress outlives any
 * message. Each step re-checks history consent, deletion, the operating allowance and (for imports) the plan's import
 * scope before reading GitHub, then does a bounded amount of work and queues the next step behind the live deliveries.
 *
 * Both kinds only read GitHub and write through the existing analytical collection, which upserts one record per pull
 * request: an imported and a live observation of the same pull request share one logical identity, nothing replays an
 * old label, comment or closed-PR reply, and an import never invents an original App result. Recalculation does not
 * rewrite observations either; the current policy interprets retained base facts on every read, so recalculation
 * re-acquires the records that read cannot interpret yet and records which policy the result was checked under.
 */
import { collectAnalyticalPullRequest, captureDefaultBranchSizes, defaultBranch } from './analytical-collection.mjs';
import { rateReserveReached } from './brief.mjs';
import { HISTORY_JOB_KINDS, historyJobEnvelope } from './contracts.mjs';

/** Technical pacing, not product limits: how much one queue message does before the next step yields to live work. */
export const JOB_STEP = 10;
const PAGE = 50;
const LEASE_MS = 5 * 60_000;
const RATE_LIMIT_BACKOFF_SECONDS = 15 * 60;
/** A queued step that has not run for this long lost its message; the scheduled maintenance queues it again. */
const STALL_MS = 30 * 60_000;
const OPEN = ['queued', 'running', 'paused'];
/** Pauses the service resolves on its own (as opposed to a person's pause or a failure, which wait for a person). */
const SYSTEM_PAUSES = ['provider-rate-limit', 'over-allowance', 'plan-unestablished'];

const parse = text => { try { return JSON.parse(text ?? '{}') ?? {}; } catch { return {}; } };
const code = error => { const value = error?.diagnostic?.code ?? error?.code; return typeof value === 'string' && /^[A-Z0-9_]{1,80}$/u.test(value) ? value : 'E_APP_HISTORY_JOB'; };
const later = (now, ms) => new Date(Date.parse(now) + ms).toISOString();

function rowJob(row) {
  if (!row) return null;
  return { jobId: row.job_id, repositoryId: row.repository_id, installationId: row.installation_id, kind: row.kind, state: row.state, reason: row.reason ?? null, sequence: row.sequence,
    scopeLimit: Number.isSafeInteger(row.scope_limit) ? row.scope_limit : null, cursor: parse(row.cursor_json), progress: parse(row.progress_json), policyId: row.policy_id ?? null,
    requestedBy: row.requested_by ?? null, requestedAt: row.requested_at, updatedAt: row.updated_at, wakeAt: row.wake_at ?? null, finishedAt: row.finished_at ?? null };
}

export class D1HistoryJobStore {
  constructor(database, { now = () => new Date().toISOString(), id = () => crypto.randomUUID() } = {}) {
    this.database = database;
    this.now = now;
    this.id = id;
  }
  statement(sql, ...values) { return this.database.prepare(sql).bind(...values); }

  /** One open job per repository and kind: asking again returns the job already doing it (a retry is not new work). */
  async request({ repositoryId, installationId, kind, scopeLimit = null, actorId = null }) {
    if (!HISTORY_JOB_KINDS.includes(kind)) throw new TypeError('History job kind is not supported.');
    const open = await this.openJob(repositoryId, kind);
    if (open) return { job: open, created: false };
    const now = this.now(), jobId = this.id();
    await this.statement(`INSERT INTO history_jobs (job_id, repository_id, installation_id, kind, state, sequence, scope_limit, requested_by, requested_at, updated_at)
      SELECT ?, ?, ?, ?, 'queued', 0, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM history_jobs WHERE repository_id=? AND kind=? AND state IN ('queued', 'running', 'paused'))`,
    jobId, repositoryId, installationId, kind, scopeLimit, actorId, now, now, repositoryId, kind).run();
    const job = await this.job(jobId);
    return job ? { job, created: true } : { job: await this.openJob(repositoryId, kind), created: false };
  }
  async job(jobId) { return rowJob(await this.statement('SELECT * FROM history_jobs WHERE job_id=?', jobId).first()); }
  async openJob(repositoryId, kind) {
    return rowJob(await this.statement("SELECT * FROM history_jobs WHERE repository_id=? AND kind=? AND state IN ('queued', 'running', 'paused') ORDER BY requested_at DESC LIMIT 1", repositoryId, kind).first());
  }
  /** The latest job of each kind for one repository: what its History panel shows. */
  async latest(repositoryId) {
    const rows = await this.statement('SELECT * FROM history_jobs WHERE repository_id=? ORDER BY requested_at DESC LIMIT 20', repositoryId).all();
    const out = {};
    for (const row of rows.results ?? []) if (!out[row.kind]) out[row.kind] = rowJob(row);
    return out;
  }
  /** Open jobs for a set of repositories, for the one-line progress the Repositories list shows. */
  async openFor(repositoryIds) {
    const out = new Map();
    for (const repositoryId of repositoryIds) {
      const rows = await this.statement("SELECT * FROM history_jobs WHERE repository_id=? AND state IN ('queued', 'running', 'paused') ORDER BY requested_at", repositoryId).all();
      if ((rows.results ?? []).length) out.set(repositoryId, (rows.results ?? []).map(rowJob));
    }
    return out;
  }

  /** Claim one step: only the step the job expects, and only while no live lease holds it. */
  async claim(jobId, sequence) {
    const now = this.now();
    // A service pause whose wake time has come is claimable by the delayed step it queued; a person's pause is not.
    const result = await this.statement(`UPDATE history_jobs SET state='running', reason=NULL, wake_at=NULL, lease_until=?, updated_at=? WHERE job_id=? AND sequence=?
      AND (state IN ('queued', 'running') OR (state='paused' AND reason IN (${SYSTEM_PAUSES.map(() => '?').join(', ')}) AND wake_at IS NOT NULL AND wake_at <= ?))
      AND (lease_until IS NULL OR lease_until <= ?)`, later(now, LEASE_MS), now, jobId, sequence, ...SYSTEM_PAUSES, now, now).run();
    return (result.meta?.changes ?? 0) === 1 ? this.job(jobId) : null;
  }
  /** Save a finished step and expect the next one. Returns the next sequence, or undefined when someone paused or stopped the job meanwhile. */
  async advance(job, { cursor, progress }) {
    const now = this.now();
    const result = await this.statement(`UPDATE history_jobs SET sequence=sequence + 1, state='queued', reason=NULL, cursor_json=?, progress_json=?, lease_until=NULL, wake_at=NULL, updated_at=?
      WHERE job_id=? AND sequence=? AND state='running'`, JSON.stringify(cursor), JSON.stringify(progress), now, job.jobId, job.sequence).run();
    return (result.meta?.changes ?? 0) === 1 ? job.sequence + 1 : undefined;
  }
  async finish(job, state, { reason = null, progress = job.progress, policyId = job.policyId } = {}) {
    const now = this.now();
    await this.statement(`UPDATE history_jobs SET state=?, reason=?, progress_json=?, policy_id=?, lease_until=NULL, wake_at=NULL, updated_at=?, finished_at=? WHERE job_id=? AND sequence=? AND state='running'`,
      state, reason, JSON.stringify(progress), policyId, now, now, job.jobId, job.sequence).run();
  }
  /** A pause the service resolves: the step expected next stays the same, so the delayed message or maintenance continues it. */
  async pause(job, reason, { wakeAt = null, cursor = job.cursor, progress = job.progress } = {}) {
    const now = this.now();
    const result = await this.statement(`UPDATE history_jobs SET sequence=sequence + 1, state='paused', reason=?, wake_at=?, cursor_json=?, progress_json=?, lease_until=NULL, updated_at=?
      WHERE job_id=? AND sequence=? AND state='running'`, reason, wakeAt, JSON.stringify(cursor), JSON.stringify(progress), now, job.jobId, job.sequence).run();
    return (result.meta?.changes ?? 0) === 1 ? job.sequence + 1 : undefined;
  }
  /** A person pauses optional processing. Live labels and billing are unaffected; a step in flight is not saved, and resuming repeats it idempotently. */
  async pauseByPerson(jobId) {
    const now = this.now();
    const result = await this.statement("UPDATE history_jobs SET sequence=sequence + 1, state='paused', reason='person', lease_until=NULL, wake_at=NULL, updated_at=? WHERE job_id=? AND state IN ('queued', 'running', 'paused')", now, jobId).run();
    return (result.meta?.changes ?? 0) === 1 ? this.job(jobId) : null;
  }
  /** Resume a paused job, or retry a failed one, from its saved cursor and progress. Returns the job to queue. */
  async resume(jobId) {
    const now = this.now();
    const result = await this.statement("UPDATE history_jobs SET sequence=sequence + 1, state='queued', reason=NULL, lease_until=NULL, wake_at=NULL, finished_at=NULL, updated_at=? WHERE job_id=? AND state IN ('paused', 'failed')", now, jobId).run();
    return (result.meta?.changes ?? 0) === 1 ? this.job(jobId) : null;
  }
  /** Jobs whose next step lost its message or whose service pause is over: the scheduled maintenance queues them again. */
  async due() {
    const now = this.now(), stalled = later(now, -STALL_MS);
    const rows = await this.statement(`SELECT * FROM history_jobs WHERE (state='queued' AND updated_at <= ?) OR (state='running' AND lease_until <= ?)
      OR (state='paused' AND reason IN (${SYSTEM_PAUSES.map(() => '?').join(', ')}) AND (wake_at IS NULL OR wake_at <= ?)) ORDER BY updated_at LIMIT 100`, stalled, now, ...SYSTEM_PAUSES, now).all();
    return (rows.results ?? []).map(rowJob);
  }
  async reopen(job) {
    const now = this.now();
    const result = await this.statement("UPDATE history_jobs SET sequence=sequence + 1, state='queued', reason=NULL, lease_until=NULL, wake_at=NULL, updated_at=? WHERE job_id=? AND sequence=? AND state IN ('queued', 'running', 'paused')", now, job.jobId, job.sequence).run();
    return (result.meta?.changes ?? 0) === 1 ? job.sequence + 1 : undefined;
  }
}

/** Queue one step of a job. A failed send leaves the job queued; the scheduled maintenance sends it again. */
export async function sendJobStep(queue, job, sequence, { delaySeconds = 0, now = () => new Date().toISOString() } = {}) {
  if (!queue) return 'unavailable';
  try {
    const body = historyJobEnvelope({ installationId: job.installationId, repositoryId: job.repositoryId, jobId: job.jobId, kind: job.kind, sequence, receivedAt: now() });
    await queue.send(body, delaySeconds > 0 ? { delaySeconds } : undefined);
    return 'sent';
  } catch { return 'unsent'; }
}

/**
 * Run one step of the job a queue message names. `dependencies`: `store` (the managed App store), `jobs`, `env`
 * (`APP_QUEUE`), `clientFor(job)` (a read-only installation client for the job's repository), `operating(repositoryId)`
 * (the operating allowance: `{ history: 'allowed' | 'held', reason }`), `importScope(repositoryId)` (`{ limit }` or
 * `{ unknown: true }`), `currentPolicy(repositoryId)`, `resolveFinalComparison` and `now`.
 */
export async function runHistoryJob(envelope, dependencies) {
  const { jobs, store } = dependencies;
  const now = dependencies.now ?? (() => new Date().toISOString());
  const job = await jobs.claim(envelope.jobId, envelope.sequence);
  if (!job || job.repositoryId !== envelope.repositoryId || job.kind !== envelope.action) return { status: 'not-claimed' };
  const settings = await store.historySettings(job.repositoryId, { independentExecution: true });
  if (settings.pauseReason) {
    const reason = settings.pauseReason === 'capacity' ? 'over-allowance' : 'repository-stopped';
    await jobs.pause(job, reason);
    return { status: 'paused', reason };
  }
  if (!settings.enabled) { await jobs.finish(job, 'stopped', { reason: 'history-off' }); return { status: 'stopped' }; }
  const operating = dependencies.operating ? await dependencies.operating(job.repositoryId) : { history: 'allowed' };
  if (operating.history !== 'allowed') { await jobs.pause(job, 'over-allowance'); return { status: 'paused', reason: 'over-allowance' }; }
  let scopeLimit = job.scopeLimit;
  if (job.kind === 'import' && dependencies.importScope) {
    const scope = await dependencies.importScope(job.repositoryId);
    if (scope.unknown) { await jobs.pause(job, 'plan-unestablished'); return { status: 'paused', reason: 'plan-unestablished' }; }
    // A lower plan narrows a running import; a higher plan does not silently widen the import already requested.
    scopeLimit = scope.limit === null ? job.scopeLimit : job.scopeLimit === null ? scope.limit : Math.min(job.scopeLimit, scope.limit);
  }
  const progress = { ...job.progress };
  try {
    const client = await dependencies.clientFor(job);
    const step = job.kind === 'import'
      ? await importStep({ ...dependencies, client, job, scopeLimit, progress, now })
      : await recalculateStep({ ...dependencies, client, job, progress, now });
    if (step.status === 'disabled') { await jobs.finish(job, 'stopped', { reason: 'history-off', progress }); return { status: 'stopped' }; }
    if (step.status === 'complete') { await jobs.finish(job, 'complete', { reason: step.reason ?? null, progress, policyId: step.policyId ?? job.policyId }); return { status: 'complete' }; }
    const next = await jobs.advance(job, { cursor: step.cursor, progress });
    if (next === undefined) return { status: 'superseded' };
    await sendJobStep(dependencies.env?.APP_QUEUE, job, next, { now });
    return { status: 'continued', sequence: next };
  } catch (error) {
    const failure = code(error);
    if (failure === 'E_GITHUB_RATE_LIMIT') {
      // The wake time sits a minute before the delayed step arrives, so that step finds the pause over.
      const wakeAt = later(now(), (RATE_LIMIT_BACKOFF_SECONDS - 60) * 1000);
      const next = await jobs.pause(job, 'provider-rate-limit', { wakeAt, progress });
      if (next !== undefined) await sendJobStep(dependencies.env?.APP_QUEUE, { ...job }, next, { delaySeconds: RATE_LIMIT_BACKOFF_SECONDS, now });
      return { status: 'paused', reason: 'provider-rate-limit' };
    }
    await jobs.finish(job, 'failed', { reason: failure, progress });
    return { status: 'failed', code: failure };
  }
}

/** Import closed pull requests, most recent first, through the ordinary collection. Open pull requests are collected live. */
async function importStep({ client, store, job, scopeLimit, progress, resolveFinalComparison, budget, now }) {
  const cursor = { page: 1, index: 0, ...job.cursor };
  for (const key of ['examined', 'recorded', 'already', 'unrecovered', 'changed', 'unavailable']) progress[key] ??= 0;
  progress.limit = scopeLimit;
  const repository = await client.json(`/repositories/${job.repositoryId}`);
  if (repository?.id !== job.repositoryId || typeof repository.full_name !== 'string') throw Object.assign(new Error('E_APP_DATA_REPOSITORY'), { code: 'E_APP_DATA_REPOSITORY' });
  const known = new Set((await store.analyticalRecords(job.repositoryId)).filter(record => record.final || record.state === 'closed').map(record => record.pullRequest));
  let done = 0;
  while (done < JOB_STEP) {
    if (budget?.collect && !budget.collect()) return { status: 'continue', cursor };
    if (scopeLimit !== null && progress.examined >= scopeLimit) return { status: 'complete', reason: 'limit-reached' };
    const page = await client.json(`/repos/${repository.full_name}/pulls?state=closed&sort=created&direction=desc&per_page=${PAGE}&page=${cursor.page}`);
    if (!Array.isArray(page)) throw Object.assign(new Error('E_APP_DATA_LISTING'), { code: 'E_APP_DATA_LISTING' });
    if (cursor.index >= page.length) {
      if (page.length < PAGE) return { status: 'complete', reason: 'all-recoverable' };
      cursor.page += 1; cursor.index = 0;
      continue;
    }
    const pull = page[cursor.index];
    cursor.index += 1; done += 1;
    if (!Number.isSafeInteger(pull?.number)) continue;
    progress.examined += 1;
    progress.newest ??= pull.created_at ?? null;
    if (pull.created_at) progress.oldest = pull.created_at;
    if (known.has(pull.number)) { progress.already += 1; continue; }
    try {
      const result = await collectAnalyticalPullRequest({ client, store, repositoryId: job.repositoryId, pullRequest: pull.number, resolveFinalComparison, now });
      if (result.status === 'disabled') return { status: 'disabled' };
      if (result.code === 'E_GITHUB_RATE_LIMIT') throw Object.assign(new Error('E_GITHUB_RATE_LIMIT'), { code: result.code });
      if (result.recovery) { progress.unrecovered += 1; progress.lastRecovery = { pullRequest: pull.number, reason: result.recovery, code: result.code, phase: result.phase, providerStatus: result.providerStatus }; } else progress.recorded += 1;
    } catch (error) {
      if (code(error) === 'E_GITHUB_RATE_LIMIT') { cursor.index -= 1; progress.examined -= 1; throw error; }
      if (code(error) === 'E_APP_DATA_STALE') progress.changed += 1;
      else { progress.unavailable += 1; progress.lastCode = code(error); }
    }
  }
  return { status: 'continue', cursor };
}

/** Re-acquire what the current policy cannot interpret yet, refresh default-branch sizes, then name the interpretation basis. */
async function recalculateStep({ client, store, job, progress, currentPolicy, resolveFinalComparison, budget, now }) {
  const cursor = { ...job.cursor };
  if (!Array.isArray(cursor.targets)) {
    const records = await store.analyticalRecords(job.repositoryId);
    const repairs = store.analyticalRepairs ? await store.analyticalRepairs(job.repositoryId) : [];
    cursor.targets = [...new Set([...records.filter(record => record.state === 'merged' && !record.final).map(record => record.pullRequest), ...repairs.map(repair => repair.pullRequest)])].sort((left, right) => right - left);
    cursor.index = 0;
    Object.assign(progress, { targets: cursor.targets.length, reacquired: 0, unrecovered: 0, changed: 0, unavailable: 0 });
  }
  const end = Math.min(cursor.targets.length, cursor.index + JOB_STEP);
  for (; cursor.index < end; cursor.index++) {
    if (budget?.collect && !budget.collect()) return { status: 'continue', cursor };
    const pullRequest = cursor.targets[cursor.index];
    try {
      const result = await collectAnalyticalPullRequest({ client, store, repositoryId: job.repositoryId, pullRequest, resolveFinalComparison, now });
      if (result.status === 'disabled') return { status: 'disabled' };
      if (result.code === 'E_GITHUB_RATE_LIMIT') throw Object.assign(new Error('E_GITHUB_RATE_LIMIT'), { code: result.code });
      if (result.recovery) { progress.unrecovered += 1; progress.lastRecovery = { pullRequest, reason: result.recovery, code: result.code, phase: result.phase, providerStatus: result.providerStatus }; }
      else { progress.reacquired += 1; if (store.resolveAnalyticalRepair) await store.resolveAnalyticalRepair(job.repositoryId, pullRequest); }
    } catch (error) {
      if (code(error) === 'E_GITHUB_RATE_LIMIT') throw error;
      if (code(error) === 'E_APP_DATA_STALE') progress.changed += 1;
      else { progress.unavailable += 1; progress.lastCode = code(error); }
    }
  }
  if (cursor.index < cursor.targets.length) return { status: 'continue', cursor };
  // Commit the immutable revision and capture start before reading any sizes. A replay resumes that same capture.
  if (!cursor.capture) {
    const { revision } = await defaultBranch(client, job.repositoryId);
    cursor.capture = { revision, since: now() };
    return { status: 'continue', cursor };
  }
  let rated = false;
  const sizes = await captureDefaultBranchSizes({ client, store, repositoryId: job.repositoryId, ...cursor.capture, now,
    proceed: (paths, reading) => {
      if (reading && rateReserveReached(client.rateBudget)) { rated = true; return false; }
      return !budget?.capture || budget.capture(paths);
    },
    afterChunk: paths => budget?.captured?.(paths)
  });
  if (sizes.status === 'disabled') return { status: 'disabled' };
  progress.sizes = (progress.sizes ?? 0) + (sizes.files ?? 0);
  if (sizes.status === 'continued') {
    if (rated) throw Object.assign(new Error('E_GITHUB_RATE_LIMIT'), { code: 'E_GITHUB_RATE_LIMIT' });
    return { status: 'continue', cursor };
  }
  const records = await store.analyticalRecords(job.repositoryId);
  progress.records = records.length;
  progress.interpretable = records.filter(record => record.final || (record.revisions ?? []).some(revision => revision.report)).length;
  progress.withoutComparison = records.filter(record => record.state === 'merged' && !record.final).length;
  const policy = currentPolicy ? await currentPolicy(job.repositoryId) : null;
  progress.basis = policy?.id ? 'current-policy' : 'unfiltered-base-facts';
  progress.policy = policy?.id ? { id: policy.id, origin: policy.origin ?? null, sourceIdentity: policy.sourceIdentity ?? null, trustedHead: policy.trustedHead ?? null }
    : { id: null, reason: policy?.reason ?? 'current-policy-unavailable' };
  if (!currentPolicy) return { status: 'complete', reason: 'base-facts-refreshed', policyId: null };
  if (!policy?.id) throw Object.assign(new Error('Current effective policy is unavailable.'), { code: 'E_EFFECTIVE_POLICY_UNAVAILABLE' });
  return { status: 'complete', reason: 'interpreted', policyId: policy.id };
}

/** The scheduled maintenance's share: queue again what lost its message or finished a service pause. */
export async function resumeHistoryJobs({ jobs, env, now }) {
  let queued = 0;
  for (const job of await jobs.due()) {
    const next = await jobs.reopen(job);
    if (next !== undefined && await sendJobStep(env?.APP_QUEUE, job, next, { now }) === 'sent') queued += 1;
  }
  return { queued };
}

export { OPEN as OPEN_JOB_STATES };
