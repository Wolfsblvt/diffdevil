// SPDX-License-Identifier: AGPL-3.0-only

import { DEFAULT_SIZE_POLICY, resolveEffectivePolicy, validateRepositoryConfiguration } from './configuration.mjs';

const originPattern = /^[A-Za-z0-9._-]{1,100}$/u;
const boundedDays = value => Number.isSafeInteger(value) && value >= 1 && value <= 3660 ? value : undefined;

function admissionError(code, message = code) { return Object.assign(new Error(message), { code }); }
function requireOrigin(value) {
  if (typeof value !== 'string' || !originPattern.test(value)) throw admissionError('E_ADMISSION_ORIGIN');
  return value;
}
function policyProjection(configuration) {
  const selected = configuration.value === undefined
    ? resolveEffectivePolicy({ preset: DEFAULT_SIZE_POLICY })
    : validateRepositoryConfiguration(configuration.value);
  const document = selected.document;
  return {
    source: configuration.value === undefined ? 'default' : 'stored',
    policyId: configuration.policyId === 'unknown' ? selected.policy.id : configuration.policyId,
    provenance: selected.provenance,
    configuredEffects: { labelDefinitions: Object.keys(document.labelDefinitions ?? {}), rules: Object.keys(document.rules ?? {}), behavior: 'creates-declared-labels-if-missing-without-rewriting-existing-definitions' }
  };
}
function nextAction(admission) {
  if (admission.reach.tombstoned) return { actor: 'service', action: 'wait-for-tombstone-expiry' };
  if (admission.reach.repository !== 'available' || admission.reach.installation !== 'active') return { actor: 'provider', action: 'restore-installation-access' };
  if (admission.execution.reason === null && admission.state === 'active') return { actor: 'repository-admin', action: 'disable-execution' };
  if (!['detected', 'administrator-declared'].includes(admission.writer.confidence)) return { actor: 'repository-admin', action: 'declare-exclusive-writer' };
  return { actor: 'repository-admin', action: admission.execution.reason === 're-consent-required' ? 're-consent-execution' : 'enable-execution' };
}
function projectAdmission(admission) {
  const lastDelivery = admission.lastDelivery === undefined ? undefined : {
    ...admission.lastDelivery,
    effect: admission.lastDelivery.code === 'E_ACCESS_DISABLED' ? 'not-attempted-execution-disabled' : 'unobserved'
  };
  return { ...admission, lastDelivery, policy: policyProjection(admission.configuration), next: nextAction(admission) };
}

/** The non-visual App boundary for a future authenticated dashboard or operator adapter. */
export function createAdmissionService({ store, authorize = async () => false }) {
  if (!store || typeof store.repositoryAdmission !== 'function' || typeof store.updateRepositoryAdmission !== 'function') throw new TypeError('Admission service requires a repository admission store.');

  async function authorizeRequest(request) {
    if (!await authorize(request)) throw admissionError('E_ADMISSION_UNAUTHORIZED');
  }
  async function read(repositoryId, actor = {}) {
    await authorizeRequest({ kind: 'read', repositoryId, actor });
    const admission = await store.repositoryAdmission(repositoryId);
    if (!admission) throw admissionError('E_ADMISSION_UNKNOWN_REPOSITORY');
    return projectAdmission(admission);
  }
  async function update(repositoryId, request) {
    const origin = requireOrigin(request?.origin);
    await authorizeRequest({ kind: 'update', repositoryId, actor: request?.actor, origin });
    const before = await store.repositoryAdmission(repositoryId);
    if (!before) throw admissionError('E_ADMISSION_UNKNOWN_REPOSITORY');
    if (before.reach.tombstoned) throw admissionError('E_ADMISSION_TOMBSTONED');
    if (before.reach.repository !== 'available' || before.reach.installation !== 'active') throw admissionError('E_ADMISSION_UNAVAILABLE');
    if (!Number.isSafeInteger(request?.revision) || request.revision !== before.revision) throw admissionError('E_ADMISSION_STALE');

    const configuration = request.configuration === undefined ? undefined : validateRepositoryConfiguration(request.configuration);
    const writer = request.writer === undefined ? undefined : request.writer?.confidence === 'administrator-declared' ? { confidence: 'administrator-declared' } : (() => { throw admissionError('E_ADMISSION_WRITER'); })();
    const execution = request.execution;
    if (execution !== undefined && typeof execution !== 'boolean') throw admissionError('E_ADMISSION_EXECUTION');
    const finalWriter = writer?.confidence ?? before.writer.confidence;
    const finalConfiguration = configuration ?? (before.configuration.value === undefined ? undefined : validateRepositoryConfiguration(before.configuration.value));
    if (execution === true && !['detected', 'administrator-declared'].includes(finalWriter)) throw admissionError('E_ADMISSION_WRITER_UNRESOLVED');

    let history;
    if (request.history !== undefined) {
      if (!request.history || typeof request.history.enabled !== 'boolean') throw admissionError('E_ADMISSION_HISTORY');
      const retentionDays = request.history.enabled ? boundedDays(request.history.retentionDays) : null;
      if (request.history.enabled && retentionDays === undefined) throw admissionError('E_ADMISSION_HISTORY_RETENTION');
      history = { enabled: request.history.enabled, retentionDays, policyId: finalConfiguration?.policyId ?? null };
    }
    if (!configuration && !writer && execution === undefined && !history) throw admissionError('E_ADMISSION_NO_CHANGE');
    const after = await store.updateRepositoryAdmission(repositoryId, { revision: request.revision, configuration, execution, history, writer, origin });
    if (!after) throw admissionError('E_ADMISSION_STALE');
    return projectAdmission(after);
  }
  return { read, update };
}
