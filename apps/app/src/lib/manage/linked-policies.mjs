// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * Named linked policies (Business). A policy is a policy document read with the same engine and schema as the CLI
 * and Actions, kept by revision per namespace; a repository is linked to at most one policy. Publishing a revision
 * writes it into every linked repository's stored App settings through the admission contract, so the effective
 * policy changes exactly where a repository's own settings would, and the repository's `.diffdevil.yml` still wins
 * for what it sets. Each repository's result is kept as it happened: `applied`, `partly` (the repository file wins
 * a value), `queued` (behind in-flight work on that repository; live pull requests keep priority) or `failed`
 * (a refusal; nothing half-written). Retry attempts the queued and failed ones again. Closed pull requests are
 * untouched; history is re-read with the new policy, not rewritten.
 */
import { DEFAULT_SIZE_POLICY, resolveEffectivePolicy } from '../../../../github-app/configuration.mjs';
import { readPolicyDocument } from './defaults.mjs';

export const PUBLICATION_WORDS = Object.freeze({
  requested: { label: 'Requested', tone: 'info', icon: 'clock' },
  applied: { label: 'Applied', tone: 'ok', icon: 'check' },
  partly: { label: 'Applied, partly', tone: 'ok', icon: 'check' },
  queued: { label: 'Queued', tone: 'warn', icon: 'clock' },
  failed: { label: 'Failed', tone: 'err', icon: 'circle-alert' }
});
export const RETRYABLE = new Set(['queued', 'failed']);
export const POLICY_NAME = /^[A-Za-z0-9][A-Za-z0-9 ._-]{0,59}$/u;

/** Read a policy document as a linked policy's revision: the repository-authored policy subset, proven to compile. */
export function readLinkedPolicy(text) { return readPolicyDocument(text); }

/** The setting paths a policy sets, in the words the configuration table uses (`bands.size`, `scopes.tests`). */
export function pathsSetBy(configuration) {
  try { return Object.keys(resolveEffectivePolicy({ preset: DEFAULT_SIZE_POLICY, repository: configuration }).provenance).filter(path => path !== '/presets' || Array.isArray(configuration.presets)).map(path => path.slice(1).replaceAll('/', '.')); }
  catch { return []; }
}

/** The reason text of a refused admission call, in the publication's words. */
function refusalOf(error) {
  const code = typeof error?.code === 'string' ? error.code : '';
  if (code === 'E_ADMISSION_UNAUTHORIZED' || code === 'E_SESSION_UNAVAILABLE') return { state: 'failed', reason: 'GitHub does not confirm you administer this repository right now. Nothing was written.' };
  if (code === 'E_ADMISSION_WRITE_REQUIRED') return { state: 'failed', reason: 'GitHub gives you read access to this repository, not write, so you can\'t manage diffdevil here. Nothing was written.' };
  if (code === 'E_ADMISSION_STALE') return { state: 'queued', reason: 'Its settings changed while publishing. Nothing was written; retry to apply over the new settings.' };
  if (code === 'E_ADMISSION_UNKNOWN_REPOSITORY') return { state: 'failed', reason: 'The App has not recorded this repository yet; its next delivery records it.' };
  if (code === 'E_ADMISSION_TOMBSTONED') return { state: 'failed', reason: 'A deletion record is live for this repository; nothing is written until it ends.' };
  if (code === 'E_ADMISSION_UNAVAILABLE') return { state: 'failed', reason: 'The repository is not reachable right now (removed or suspended). Nothing was written.' };
  return { state: 'failed', reason: `The settings were refused (${code || 'unknown'}). Nothing was written.` };
}

/**
 * Apply one revision to one repository through the admission contract, as the signed-in administrator. Returns the
 * result to keep: `{ state, reason, detail }`.
 */
export async function applyRevision({ runtime, cookie, origin, policy, repositoryId }) {
  const busy = await runtime.manage.repositoryBusy(repositoryId).catch(() => ({ busy: false }));
  if (busy.busy) return { state: 'queued', reason: `Waiting behind ${busy.reason} on this repository. Labels on open pull requests update first; retry when it has finished.`, detail: { behind: busy.reason } };
  let current;
  try { current = (await runtime.auth.readAdmission({ session: cookie, repositoryId })).body; }
  catch (error) { return { ...refusalOf(error), detail: null }; }
  if (current.reach?.tombstoned) return { state: 'failed', reason: 'A deletion record is live for this repository; nothing is written until it ends.', detail: null };
  if (current.reach?.repository !== 'available' || current.reach?.installation !== 'active') return { state: 'failed', reason: `The repository is not reachable right now (${current.reach?.installation !== 'active' ? 'installation suspended' : 'removed from the installation'}). Nothing was written.`, detail: null };
  const brief = current.configuration?.value?.brief;
  let after;
  try { after = (await runtime.auth.updateAdmission({ session: cookie, repositoryId, method: 'POST', origin, settings: { revision: current.revision, configuration: { repository: policy.configuration, ...(brief ? { brief } : {}) } } })).body; }
  catch (error) { return { ...refusalOf(error), detail: null }; }
  // The repository file wins for what it sets: when the trusted policy was observed, name the values it keeps.
  const observed = current.policy?.standing === 'observed';
  const supplied = observed ? new Set(Object.entries(current.policy.provenance ?? {}).filter(([, layer]) => layer === 'supplied').map(([path]) => path.slice(1).replaceAll('/', '.'))) : new Set();
  const overridden = pathsSetBy(policy.configuration).filter(path => supplied.has(path));
  await runtime.manage.markApplied(repositoryId, policy.policyId, policy.revision).catch(() => {});
  const refresh = after.brief?.refresh?.status ?? 'unavailable';
  const follow = refresh === 'queued' || refresh === 'enqueued' ? 'Open pull requests are re-evaluated; history is re-read with the new policy.' : refresh === 'not-needed' ? 'Nothing runs here yet; it applies when the repository is enabled.' : 'Open pull requests are re-evaluated where the deployment can; history is re-read with the new policy.';
  if (overridden.length) return { state: 'partly', reason: `${overridden.join(', ')} ${overridden.length === 1 ? 'stays' : 'stay'} as the repository file sets ${overridden.length === 1 ? 'it' : 'them'}. Everything else applied (settings revision ${after.revision}). ${follow}`, detail: { revision: after.revision, overridden, refresh } };
  return { state: 'applied', reason: `Effective policy updated (settings revision ${after.revision}). ${follow}${observed ? '' : ' The repository file is read on GitHub at evaluation and still wins for what it sets.'}`, detail: { revision: after.revision, overridden: [], refresh } };
}

/** Publish the policy's current revision to every linked repository, keeping each result. Returns the publication. */
export async function publishPolicy({ runtime, cookie, origin, viewer, policy }) {
  const links = await runtime.manage.policyLinks(policy.policyId);
  const publicationId = await runtime.manage.createPublication({ policyId: policy.policyId, revision: policy.revision, actorId: viewer.userId, repositoryIds: links.map(link => link.repositoryId) });
  for (const link of links) {
    const result = await applyRevision({ runtime, cookie, origin, policy, repositoryId: link.repositoryId });
    await runtime.manage.saveResult(publicationId, link.repositoryId, result);
  }
  return runtime.manage.publication(publicationId);
}

/** Attempt the queued and failed repositories of a publication again; applied ones are left alone. */
export async function retryPublication({ runtime, cookie, origin, publication }) {
  const policy = await runtime.manage.linkedPolicy(publication.policyId);
  if (!policy) return publication;
  for (const result of publication.results) {
    if (!RETRYABLE.has(result.state)) continue;
    // A repository unlinked since the publication is not written to.
    const link = await runtime.manage.policyLink(result.repositoryId);
    if (!link || link.policyId !== policy.policyId) { await runtime.manage.saveResult(publication.publicationId, result.repositoryId, { state: 'failed', reason: 'Unlinked since this publication; nothing is written.', detail: null }); continue; }
    await runtime.manage.saveResult(publication.publicationId, result.repositoryId, await applyRevision({ runtime, cookie, origin, policy: { ...policy, revision: publication.revision }, repositoryId: result.repositoryId }));
  }
  return runtime.manage.publication(publication.publicationId);
}

/** One line for a publication: how many of its repositories applied, and whether anything still waits or failed. */
export function summarizePublication(publication) {
  const total = publication.results.length;
  const applied = publication.results.filter(result => result.state === 'applied' || result.state === 'partly').length;
  const queued = publication.results.filter(result => result.state === 'queued').length;
  const failed = publication.results.filter(result => result.state === 'failed').length;
  const result = total === 0 ? 'applied' : queued ? 'queued' : failed ? 'failed' : 'applied';
  const text = total === 0 ? 'No repository was linked; nothing to publish.' : applied === total ? `Applied to ${total === 1 ? 'its one repository' : `all ${total} repositories`}.` : `${applied} of ${total} applied${queued ? `, ${queued} queued` : ''}${failed ? `, ${failed} failed` : ''}.`;
  return { total, applied, queued, failed, result, text, retryable: queued + failed > 0 };
}
