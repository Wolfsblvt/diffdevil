// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0

import { validateRepositoryConfiguration } from './configuration.mjs';
import { policyNameOf, premiumEligibility, resolveBriefRoute, storedBriefSettings } from './brief.mjs';
import { previewBrief as renderPreview } from '../shared/pr-brief/preview.mjs';
import { readBriefSettings } from '../shared/pr-brief/settings.mjs';

const originPattern = /^[A-Za-z0-9._-]{1,100}$/u;
const boundedDays = value => Number.isSafeInteger(value) && value >= 1 && value <= 3660 ? value : undefined;

/** Running provider version; the operator's accepted deployment record supplies its source correspondence. */
export function admissionServiceIdentity(origin, metadata) {
  return { origin, versionId: typeof metadata?.id === 'string' && /^[A-Za-z0-9-]{1,100}$/u.test(metadata.id) ? metadata.id : null };
}

/** Bind a deliberate admission to the host/version inspected, without adding a second credential or expiry. */
export function assertAdmissionService(expected, current) {
  if (!current?.versionId) throw admissionError('E_ADMISSION_VERSION_UNAVAILABLE');
  if (expected?.origin !== current.origin || expected?.versionId !== current.versionId) throw admissionError('E_ADMISSION_STALE');
}

function admissionError(code, message = code) { return Object.assign(new Error(message), { code }); }
function validatedConfiguration(value) {
  try { return validateRepositoryConfiguration(value); }
  catch { throw admissionError('E_ADMISSION_CONFIGURATION'); }
}
function requireOrigin(value) {
  if (typeof value !== 'string' || !originPattern.test(value)) throw admissionError('E_ADMISSION_ORIGIN');
  return value;
}
async function selectedPolicy(admission, resolvePolicy) {
  if (typeof resolvePolicy !== 'function') return undefined;
  const selected = await resolvePolicy({ repositoryId: admission.repositoryId, installationId: admission.installationId, configuration: admission.configuration.value });
  if (!selected?.policy || !selected?.document || typeof selected.source !== 'string') throw admissionError('E_EFFECTIVE_POLICY_UNAVAILABLE');
  return selected;
}
function policyProjection(selected) {
  if (!selected) return { standing: 'unobserved', reason: 'E_EFFECTIVE_POLICY_UNAVAILABLE' };
  return {
    standing: 'observed',
    source: selected.source,
    sourceIdentity: selected.sourceIdentity,
    policyId: selected.policy.id,
    provenance: selected.provenance,
    configuredEffects: { labelDefinitions: Object.keys(selected.document.labelDefinitions ?? {}), rules: Object.keys(selected.document.rules ?? {}), behavior: 'creates-declared-labels-if-missing-without-rewriting-existing-definitions' }
  };
}
function nextAction(admission) {
  if (admission.reach.tombstoned) return { actor: 'service', action: 'wait-for-tombstone-expiry' };
  if (admission.reach.repository !== 'available' || admission.reach.installation !== 'active') return { actor: 'provider', action: 'restore-installation-access' };
  if (admission.execution.reason === null && admission.state === 'active') return { actor: 'repository-admin', action: 'disable-execution' };
  if (!['detected', 'administrator-declared'].includes(admission.writer.confidence)) return { actor: 'repository-admin', action: 'declare-exclusive-writer' };
  return { actor: 'repository-admin', action: admission.execution.reason === 're-consent-required' ? 're-consent-execution' : 'enable-execution' };
}
/**
 * The brief route the stored settings select. Without an observed trusted policy, repository-authored comment rules are
 * unobserved, so a standard selection is reported as unconfirmed rather than as the effective route.
 */
function briefProjection(admission, selected, appAuthor) {
  const settings = storedBriefSettings(admission.configuration.value);
  const route = resolveBriefRoute(settings, selected?.document);
  return { settings, route: selected ? route : { ...route, policyObserved: false, ...(route.effective === 'standard' ? { reason: 'repository-templates-unobserved' } : {}) },
    writer: { login: appAuthor, confidence: admission.writer.confidence, lifecycle: 'diffdevil-app-brief/1' } };
}
async function projectAdmission(admission, resolvePolicy, appAuthor) {
  const selected = await selectedPolicy(admission, resolvePolicy);
  const lastDelivery = admission.lastDelivery === undefined ? undefined : {
    ...admission.lastDelivery,
    effect: admission.lastDelivery.code === 'E_ACCESS_DISABLED' ? 'not-attempted-execution-disabled' : 'unobserved'
  };
  return { ...admission, lastDelivery, policy: policyProjection(selected), brief: briefProjection(admission, selected, appAuthor), next: nextAction(admission) };
}

/** Whether an accepted update changes what open briefs may say: settings, the repository policy layer or history consent. */
function briefsAffected(request, consent) { return request.configuration !== undefined || consent.historyConsentChanged; }

/**
 * The non-visual App boundary for a future authenticated dashboard or operator adapter. `refreshBriefs`, when supplied,
 * enqueues a fresh evaluation of the repository's open briefs after an accepted change that affects them; its outcome is
 * reported, and its failure never undoes the accepted update. `previewPolicy` resolves the effective trusted policy for
 * the brief preview only, so ordinary admission reads make no provider request.
 */
export function createAdmissionService({ store, authorize = async () => false, resolvePolicy, previewPolicy = resolvePolicy, entitlement, briefProvider = null, appAuthor = 'diffdevil[bot]', refreshBriefs }) {
  if (!store || typeof store.repositoryAdmission !== 'function' || typeof store.updateRepositoryAdmission !== 'function') throw new TypeError('Admission service requires a repository admission store.');

  async function authorizeRequest(request) {
    if (!await authorize(request)) throw admissionError('E_ADMISSION_UNAUTHORIZED');
  }
  async function read(repositoryId, actor = {}) {
    await authorizeRequest({ kind: 'read', repositoryId, actor });
    const admission = await store.repositoryAdmission(repositoryId);
    if (!admission) throw admissionError('E_ADMISSION_UNKNOWN_REPOSITORY');
    return projectAdmission(admission, resolvePolicy, appAuthor);
  }
  async function update(repositoryId, request) {
    const origin = requireOrigin(request?.origin);
    await authorizeRequest({ kind: 'update', repositoryId, actor: request?.actor, origin });
    const before = await store.repositoryAdmission(repositoryId);
    if (!before) throw admissionError('E_ADMISSION_UNKNOWN_REPOSITORY');
    if (before.reach.tombstoned) throw admissionError('E_ADMISSION_TOMBSTONED');
    if (before.reach.repository !== 'available' || before.reach.installation !== 'active') throw admissionError('E_ADMISSION_UNAVAILABLE');
    if (!Number.isSafeInteger(request?.revision) || request.revision !== before.revision) throw admissionError('E_ADMISSION_STALE');

    const configuration = request.configuration === undefined ? undefined : validatedConfiguration(request.configuration);
    const writer = request.writer === undefined ? undefined : request.writer?.confidence === 'administrator-declared' ? { confidence: 'administrator-declared' } : (() => { throw admissionError('E_ADMISSION_WRITER'); })();
    const execution = request.execution;
    if (execution !== undefined && typeof execution !== 'boolean') throw admissionError('E_ADMISSION_EXECUTION');
    const finalWriter = writer?.confidence ?? before.writer.confidence;
    const finalConfiguration = configuration ?? (before.configuration.value === undefined ? undefined : validatedConfiguration(before.configuration.value));
    if (execution === true && !['detected', 'administrator-declared'].includes(finalWriter)) throw admissionError('E_ADMISSION_WRITER_UNRESOLVED');

    let history;
    if (request.history !== undefined) {
      if (!request.history || typeof request.history.enabled !== 'boolean') throw admissionError('E_ADMISSION_HISTORY');
      if (request.history.stopCollecting !== undefined && (typeof request.history.stopCollecting !== 'boolean' || request.history.enabled)) throw admissionError('E_ADMISSION_HISTORY');
      const retentionDays = request.history.enabled ? boundedDays(request.history.retentionDays) : null;
      if (request.history.enabled && retentionDays === undefined) throw admissionError('E_ADMISSION_HISTORY_RETENTION');
      history = { enabled: request.history.enabled, stopCollecting: request.history.stopCollecting === true, retentionDays, policyId: finalConfiguration?.policyId ?? null };
    }
    if (!configuration && !writer && execution === undefined && !history) throw admissionError('E_ADMISSION_NO_CHANGE');
    const executionConsentChanged = execution !== undefined
      && (execution ? before.execution.reason !== null : before.execution.reason !== 'explicitly-disabled');
    const historyConsentChanged = history !== undefined && !history.stopCollecting
      && (history.enabled ? !before.history.enabled : before.history.reason !== 'explicitly-disabled');
    const actorId = executionConsentChanged || historyConsentChanged ? request.actor?.userId : undefined;
    if (origin === 'dashboard' && (executionConsentChanged || historyConsentChanged)
      && (!Number.isSafeInteger(actorId) || actorId <= 0)) throw admissionError('E_ADMISSION_ACTOR');
    const after = await store.updateRepositoryAdmission(repositoryId, {
      revision: request.revision, configuration, execution, history, writer, origin, actorId,
      executionConsentChanged, historyConsentChanged
    });
    if (!after) throw admissionError('E_ADMISSION_STALE');
    const projected = await projectAdmission(after, resolvePolicy, appAuthor);
    if (!briefsAffected(request, { historyConsentChanged })) return projected;
    let refresh = { status: 'unavailable' };
    if (after.state !== 'active') refresh = { status: 'not-needed', reason: 'execution-disabled' };
    else if (typeof refreshBriefs === 'function') {
      try { refresh = await refreshBriefs({ repositoryId, installationId: after.installationId ?? before.installationId, cause: 'settings', causeId: `revision-${after.revision}` }); }
      catch { refresh = { status: 'failed' }; }
    }
    return { ...projected, brief: { ...projected.brief, refresh } };
  }
  /**
   * Preview the stored or proposed brief settings over the synthetic fixture. Nothing is stored, posted, migrated,
   * consented or entitled; proposed settings are validated exactly as an update would validate them.
   */
  async function previewBrief(repositoryId, actor = {}, proposal) {
    await authorizeRequest({ kind: 'read', repositoryId, actor });
    const admission = await store.repositoryAdmission(repositoryId);
    if (!admission) throw admissionError('E_ADMISSION_UNKNOWN_REPOSITORY');
    let settings;
    try { settings = proposal === undefined ? storedBriefSettings(admission.configuration.value) : readBriefSettings(proposal); }
    catch { throw admissionError('E_ADMISSION_BRIEF_SETTINGS'); }
    // An unreadable effective policy leaves the preview a labelled design specimen; it never borrows a policy identity.
    let selected, unobserved = 'E_EFFECTIVE_POLICY_UNAVAILABLE';
    try { selected = await selectedPolicy(admission, previewPolicy); }
    catch (error) { selected = undefined; unobserved = typeof error?.code === 'string' && /^E_[A-Z0-9_]{1,60}$/u.test(error.code) ? error.code : unobserved; }
    const brief = briefProjection({ ...admission, configuration: { value: { ...(admission.configuration.value ?? {}), brief: settings } } }, selected, appAuthor);
    const historyOn = admission.history.enabled && admission.history.reason === null;
    let plan = 'unknown';
    try { plan = entitlement ? await entitlement({ repositoryId, actor }) : 'unknown'; } catch { plan = 'unknown'; }
    const premium = briefProvider ? premiumEligibility(plan) : { eligible: false, reason: 'premium-not-in-build' };
    return renderPreview({ settings, route: brief.route, writer: brief.writer, provider: briefProvider,
      source: selected ? { standing: 'observed', kind: selected.source, identity: selected.sourceIdentity, policyId: selected.policy.id } : { standing: 'unobserved', reason: unobserved },
      policy: selected ? { compiled: selected.policy, document: selected.document, name: policyNameOf(selected.document, selected.provenance) } : null,
      // Current neighbours need only an eligible plan; history consent gates the history-backed modules inside the provider.
      eligibility: { history: historyOn ? { standing: 'available' } : { standing: 'consent-required', reason: 'history-off' }, premium } });
  }
  /** Inspect the actual default-branch policy through the same resolver execution uses. No settings or effects change. */
  async function inspect(repositoryId, actor = {}) {
    await authorizeRequest({ kind: 'read', repositoryId, actor });
    const admission = await store.repositoryAdmission(repositoryId);
    if (!admission) throw admissionError('E_ADMISSION_UNKNOWN_REPOSITORY');
    const selected = await selectedPolicy(admission, previewPolicy);
    if (!selected || typeof selected.expectedPolicyBase !== 'string') throw admissionError('E_ADMISSION_POLICY_UNAVAILABLE');
    return {
      ...await projectAdmission(admission, async () => selected, appAuthor),
      policy: { ...policyProjection(selected), base: selected.expectedPolicyBase, document: selected.document },
      basis: { repositoryId, installationId: admission.installationId, revision: admission.revision,
        policyId: selected.policy.id, policyBase: selected.expectedPolicyBase },
      requestedEffects: { check: 'native-pull-request-summary', labels: selected.document.labelGroups ?? {},
        rules: selected.document.rules ?? {}, brief: briefProjection(admission, selected, appAuthor),
        history: 'unchanged', providerEffects: 'not-attempted' }
    };
  }

  /** Deliberately enable only the inspected repository and policy. History and configuration are separate operations. */
  async function admit(repositoryId, { basis, writerDeclared = false, actor, origin }) {
    await authorizeRequest({ kind: 'update', repositoryId, actor, origin });
    if (typeof writerDeclared !== 'boolean') throw admissionError('E_ADMISSION_WRITER');
    const current = await inspect(repositoryId, actor);
    if (!basis || Object.entries(current.basis).some(([key, value]) => basis[key] !== value)) throw admissionError('E_ADMISSION_STALE');
    let after;
    try {
      after = await update(repositoryId, { revision: current.revision, execution: true, actor, origin,
        ...(writerDeclared ? { writer: { confidence: 'administrator-declared' } } : {}) });
    } catch (error) {
      if (['E_ADMISSION_STALE', 'E_ADMISSION_UNAUTHORIZED', 'E_ADMISSION_UNAVAILABLE', 'E_ADMISSION_TOMBSTONED',
        'E_ADMISSION_UNKNOWN_REPOSITORY', 'E_ADMISSION_WRITER_UNRESOLVED', 'E_ADMISSION_CONFIGURATION', 'E_ADMISSION_ACTOR', 'E_ADMISSION_ORIGIN'].includes(error?.code)) throw error;
      // A failed response/readback after the batch is not proof that consent was not recorded.
      throw admissionError('E_ADMISSION_UNCONFIRMED');
    }
    if (after.revision !== current.revision + 1 || after.state !== 'active' || after.execution.reason !== null) throw admissionError('E_ADMISSION_UNCONFIRMED');
    return { admission: after, operation: { kind: 'enable-execution', actorId: actor.userId, basis: current.basis,
      revision: after.revision, outcome: 'recorded', providerEffects: 'not-attempted', history: 'unchanged' } };
  }
  return { read, update, previewBrief, inspect, admit };
}
