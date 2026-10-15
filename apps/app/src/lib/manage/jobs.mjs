// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * The words Manage shows for history jobs (docs/app-management.md#inspect-history-processing): purpose, scope, actual
 * progress and coverage, the policy basis and the reason for any delay, distinguishing a person's pause, a provider
 * rate limit, an allowance, partial evidence, a recoverable failure and completion. No completion estimate or total is
 * given that the service has not established: an import names the limit it is bounded by, or says it reads until
 * GitHub has nothing older.
 */
import { plural } from '../format.mjs';

const PAUSES = Object.freeze({
  'recovery-rollback': 'Paused after restoring an older point. Progress was reset to match retained history; resume to reacquire missing work within the original scope.',
  person: 'Paused by an administrator. Live labels and checks are not affected.',
  'repository-stopped': 'Paused: repository operation was stopped. Consent and retained history stay; resume history within the allowance before resuming this job.',
  'provider-rate-limit': 'Paused: GitHub\'s rate limit for this installation. It continues by itself after the limit resets.',
  'over-allowance': 'Paused: this repository is over its plan\'s allowance, so no history is collected. It continues once it is within the allowance again.',
  'plan-unestablished': 'Paused: the plan funding this repository could not be established right now. It continues once it is.'
});
const STOPS = Object.freeze({ 'history-off': 'Stopped: history collection was turned off. What was collected stays until you delete it.', 'history-deleted': 'Stopped: the history was deleted. A deletion record keeps the import from bringing it back.' });

function coverage(progress) {
  if (!progress.newest) return '';
  const day = value => new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  return ` Pull requests opened ${progress.oldest && progress.oldest !== progress.newest ? `${day(progress.oldest)} – ${day(progress.newest)}` : day(progress.newest)}.`;
}

/** `{ title, detail, tone, open, actions }` for one job, or null. `actions` lists `pause` / `resume` / `retry`. */
export function describeJob(job) {
  if (!job) return null;
  const progress = job.progress ?? {};
  const recovery = progress.lastRecovery;
  const recoveryText = recovery ? ` Last unrecovered comparison: PR #${recovery.pullRequest}, ${recovery.reason === 'comparison-acquisition-unavailable' ? `acquisition unavailable (${recovery.code ?? 'E_APP_DATA_COMPARISON'}${recovery.providerStatus ? `, HTTP ${recovery.providerStatus}` : ''}${recovery.phase ? `, ${recovery.phase}` : ''})` : 'merge boundary not established'}.` : '';
  const open = ['queued', 'running', 'paused'].includes(job.state);
  if (job.kind === 'import') {
    const scope = job.scopeLimit === null ? 'all recoverable closed pull requests, most recent first' : `up to ${job.scopeLimit} recent closed pull requests (the Free import)`;
    const counted = `${plural(progress.examined ?? 0, 'pull request')} examined${job.scopeLimit !== null ? ` of up to ${job.scopeLimit}` : ''}: ${progress.recorded ?? 0} recorded, ${progress.already ?? 0} already retained${progress.unrecovered ? `, ${progress.unrecovered} without a recovered final comparison (lifecycle kept)` : ''}${progress.changed ? `, ${progress.changed} changed while read (taken by the live path)` : ''}${progress.unavailable ? `, ${progress.unavailable} unavailable` : ''}.${coverage(progress)}${recoveryText}`;
    if (job.state === 'queued' || job.state === 'running') return { title: job.state === 'running' ? 'Importing past pull requests' : 'Import queued', detail: `${scope[0].toUpperCase()}${scope.slice(1)}. ${counted} Live pull requests go first.`, tone: 'info', open, actions: ['pause'] };
    if (job.state === 'paused') return { title: 'Import paused', detail: `${PAUSES[job.reason] ?? 'Paused.'} ${counted}`, tone: job.reason === 'person' ? '' : 'warn', open, actions: ['resume'] };
    if (job.state === 'complete') return { title: job.reason === 'limit-reached' ? 'Import complete: the Free import limit was reached' : 'Import complete: reached the end of closed pull requests', detail: counted, tone: progress.unrecovered || progress.unavailable ? 'warn' : 'ok', open, actions: [] };
    if (job.state === 'stopped') return { title: 'Import stopped', detail: `${STOPS[job.reason] ?? 'Stopped.'} ${counted}`, tone: '', open, actions: [] };
    return { title: 'Import failed', detail: `${job.reason ?? 'An error'} stopped it. ${counted} Retrying continues from the same place.`, tone: 'err', open, actions: ['retry'] };
  }
  const targets = progress.targets ?? null;
  const reacquired = targets === null ? 'Finding the records the current policy cannot interpret yet.' : `${plural(targets, 'pull request')} needed re-reading from GitHub: ${progress.reacquired ?? 0} re-read${progress.unrecovered ? `, ${progress.unrecovered} still without a recovered comparison` : ''}${progress.unavailable ? `, ${progress.unavailable} unavailable` : ''}.${recoveryText}`;
  if (job.state === 'queued' || job.state === 'running') return { title: job.state === 'running' ? 'Recalculating' : 'Recalculation queued', detail: `${reacquired} Observations are re-read, never rewritten; nothing on GitHub changes.`, tone: 'info', open, actions: ['pause'] };
  if (job.state === 'paused') return { title: 'Recalculation paused', detail: `${PAUSES[job.reason] ?? 'Paused.'} ${reacquired}`, tone: job.reason === 'person' ? '' : 'warn', open, actions: ['resume'] };
  if (job.state === 'complete') return { title: 'Recalculated', detail: `${plural(progress.records ?? 0, 'retained pull request')}, ${progress.interpretable ?? 0} interpreted under ${progress.basis === 'current-policy' ? `the current policy${job.policyId ? ` (${job.policyId.slice(0, 14)}…)` : ''}` : 'no compilable policy (base facts unfiltered)'}${progress.withoutComparison ? `; ${progress.withoutComparison} merged without a recoverable comparison` : ''}. ${reacquired}`, tone: progress.withoutComparison ? 'warn' : 'ok', open, actions: [] };
  if (job.state === 'stopped') return { title: 'Recalculation stopped', detail: STOPS[job.reason] ?? 'Stopped.', tone: '', open, actions: [] };
  return { title: 'Recalculation failed', detail: `${job.reason ?? 'An error'} stopped it. Retrying continues from the same place.`, tone: 'err', open, actions: ['retry'] };
}

/** The short processing word the Repositories list shows beside history. */
export function jobBrief(jobs) {
  const job = (jobs ?? [])[0];
  if (!job) return null;
  const progress = job.progress ?? {};
  const verb = job.kind === 'import' ? 'importing' : 'recalculating';
  if (job.state === 'paused') return `${verb} paused`;
  return job.kind === 'import' ? `${verb} · ${progress.examined ?? 0}${job.scopeLimit !== null ? `/${job.scopeLimit}` : ''}` : verb;
}
