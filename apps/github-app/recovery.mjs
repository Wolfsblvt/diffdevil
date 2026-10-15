// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
import { D1AppStore } from './storage.mjs';
import { D1AuthorizationStore } from './authorization-storage.mjs';
import { D1CommercialStore } from './commercial-storage.mjs';
import { D1ManageStore } from '../app/src/lib/manage/store.mjs';
import { D1ParticipationStore } from '../app/src/lib/participation/store.mjs';
import { applyHealthyRecoveryState, validateHealthyRecoveryState } from './recovery-input.mjs';
import { createAdmissionService } from './admission.mjs';
import { hasRecoveryCoverage, RECOVERY_DUTIES, RECOVERY_MARGIN_DAYS } from './recovery-contract.mjs';

const DAY = 86_400_000;
const TYPES = new Set(['history-deleted', 'repository-deleted', 'history-disabled', 'history-retention', 'service-disconnected', 'works-disconnected',
  'participation-answers-deleted', 'account-closed', 'sessions-revoked', 'free-organisation-disconnected',
  'repository-stopped', 'repository-released', 'delegation-removed', 'automatic-setup-disabled']);
const iso = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
const id = value => Number.isSafeInteger(value) && value > 0;
const text = value => typeof value === 'string' && value.trim().length > 0;
const refuse = () => Object.assign(new TypeError('A complete, point-bound recovery input is required; no restored use is qualified.'), { code: 'E_RECOVERY_INPUT' });

/**
 * Validate the complete artifact before any target write. Coverage coordinates must come from the trusted
 * recovery custodian's independently recovered inputs; shape validation cannot authenticate or discover them.
 * The boundary is inclusive: duties at the point timestamp must be included when commit ordering is unknown.
 */
export function readRecoveryInput(input, point, through) {
  if (!point || !text(point.id) || !iso(point.capturedAt) || !iso(point.supportedUntil)
    || !iso(through) || through < point.capturedAt || through > point.supportedUntil
    || input?.kind !== 'diffdevil.app-recovery-input' || input.version !== 1
    || input.point?.id !== point.id || input.point?.capturedAt !== point.capturedAt || input.point?.supportedUntil !== point.supportedUntil
    || (input.currentState !== undefined && input.point?.databaseId !== point.databaseId)
    || input.coverage?.from !== point.capturedAt || input.coverage?.through !== through
    || !hasRecoveryCoverage(point, input.coverage?.tombstoneRetentionDays)
    || !Array.isArray(input.events) || !Array.isArray(input.coverage.sources)) throw refuse();
  const sources = new Map();
  for (const source of input.coverage.sources) {
    if (!RECOVERY_DUTIES.includes(source?.duty) || sources.has(source.duty) || !text(source.authority)
      || !text(source.checkpoint) || !text(source.recoveryEvidence) || source.through !== through) throw refuse();
    sources.set(source.duty, source);
  }
  if (sources.size !== RECOVERY_DUTIES.length) throw refuse();
  const requiredLifetime = Date.parse(point.supportedUntil) - Date.parse(point.capturedAt) + RECOVERY_MARGIN_DAYS * DAY;
  const ids = new Set();
  let previous = point.capturedAt;
  for (const event of input.events) {
    if (!text(event?.id) || ids.has(event.id) || !TYPES.has(event.type) || !iso(event.at)
      || event.at < previous || event.at > through) throw refuse();
    if (event.type.startsWith('history-') || event.type.startsWith('repository-')) {
      if (!id(event.repositoryId)) throw refuse();
    }
    if (['history-deleted', 'repository-deleted', 'account-closed'].includes(event.type) && (!iso(event.reapplyUntil)
      || Date.parse(event.reapplyUntil) < Date.parse(event.at) + requiredLifetime)) throw refuse();
    if (event.type === 'history-retention' && (!id(event.retentionDays) || event.retentionDays > 3660)) throw refuse();
    if (['service-disconnected', 'participation-answers-deleted', 'account-closed', 'sessions-revoked', 'free-organisation-disconnected'].includes(event.type) && !id(event.userId)) throw refuse();
    if (event.type === 'works-disconnected' && !text(event.linkId)) throw refuse();
    if (event.type === 'history-disabled' && typeof event.deselect !== 'boolean') throw refuse();
    if (['delegation-removed', 'automatic-setup-disabled'].includes(event.type) && !id(event.accountId)) throw refuse();
    if (event.type === 'delegation-removed' && !id(event.userId)) throw refuse();
    if (event.type === 'participation-answers-deleted' && (!text(event.campaign?.key) || !id(event.campaign?.version))) throw refuse();
    if (['account-closed', 'free-organisation-disconnected'].includes(event.type)
      && (!Array.isArray(event.repositoryIds) || event.repositoryIds.some(value => !id(value))
        || new Set(event.repositoryIds).size !== event.repositoryIds.length)) throw refuse();
    ids.add(event.id);
    previous = event.at;
  }
  // Do not let a caller mutate validated objects while replay awaits D1 or its checkpoint writer.
  return structuredClone(input);
}

/**
 * Apply later obligations to an isolated restored D1 before any reader, Queue or maintenance consumer starts.
 * `checkpoint` must durably commit the supplied value, or reject. No input means no replay, never empty duties.
 * On interruption rerun the same input against the same isolated point. Duty replay restricts/erases state;
 * the healthy-source route carries actual current authority and preferences from its complete protected input.
 * A receipt qualifies this input boundary only, never current provider access, artifact custody or serving.
 *
 * @param {{database: object, input: object, point: {id: string, capturedAt: string, supportedUntil: string, databaseId?: string}, through: string,
 * checkpoint: (receipt: object) => Promise<void>, commercial?: object}} options
 */
export async function replayRecoveryObligations({ database, input, point, through, checkpoint, commercial }) {
  const selected = readRecoveryInput(input, point, through);
  if (typeof checkpoint !== 'function') throw refuse();
  if (selected.currentState !== undefined) await validateHealthyRecoveryState(database, selected);
  else if (selected.coverage.mode === 'healthy-source-rollback') throw refuse();
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(selected)));
  const inputSha256 = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  let at = through;
  const now = () => at;
  const app = new D1AppStore(database, { now });
  const auth = new D1AuthorizationStore(database, { now });
  const works = new D1CommercialStore(database, { now });
  const manage = new D1ManageStore(database, { now });
  const participation = new D1ParticipationStore(database, { now });
  // The admitted offline input owns these local mutations; this is not a provider authorization answer.
  const admission = createAdmissionService({ store: app, authorize: async () => true });
  const update = async (repositoryId, patch) => {
    const current = await app.repositoryAdmission(repositoryId);
    if (current) await admission.update(repositoryId, { revision: current.revision, origin: 'recovery-input', ...patch });
  };
  const receipt = { kind: 'diffdevil.app-recovery-checkpoint', version: 1, point: selected.point,
    inputSha256, coverage: selected.coverage, phase: 'applying', applied: [], commercial: null, code: null };
  const commit = () => checkpoint(structuredClone(receipt));
  // Prove the output route before touching the restored database.
  await commit();
  try {
    if (selected.currentState) {
      await applyHealthyRecoveryState(database, selected.currentState, through);
      receipt.applied.push('healthy-current-state');
      await commit();
    }
    await works.holdRestoredLinks(through);
    for (const event of selected.events) {
      at = event.at;
      switch (event.type) {
        case 'history-deleted':
          await app.deleteHistory(event.repositoryId, { deletedAt: event.at, reapplyUntil: event.reapplyUntil });
          break;
        case 'repository-deleted':
          await app.reapplyRepositoryDeletion(event.repositoryId, { deletedAt: event.at, reapplyUntil: event.reapplyUntil });
          break;
        case 'history-disabled':
          await update(event.repositoryId, { history: { enabled: false, stopCollecting: true } });
          if (event.deselect) await manage.deselect(event.repositoryId);
          break;
        case 'history-retention':
          await app.reapplyHistoryRetention(event.repositoryId, event.retentionDays);
          break;
        case 'service-disconnected':
          await auth.revokeAuthorization(event.userId, { disconnectService: true });
          break;
        case 'works-disconnected':
          await works.endLink(event.linkId, { source: 'recovery-input', endedAt: event.at });
          break;
        case 'participation-answers-deleted':
          await participation.deleteAnswers(event.userId, event.campaign);
          break;
        case 'sessions-revoked':
          await manage.revokeUserSessions(event.userId);
          break;
        case 'repository-stopped':
          await update(event.repositoryId, { execution: false });
          await manage.deselect(event.repositoryId);
          break;
        case 'repository-released':
          await manage.deselect(event.repositoryId);
          break;
        case 'delegation-removed':
          await manage.revokeDelegation(event.accountId, event.userId);
          break;
        case 'automatic-setup-disabled':
          await manage.removeAutomaticSetup(event.accountId);
          break;
        case 'free-organisation-disconnected':
          for (const repositoryId of event.repositoryIds) await app.setRepositoryExecution(repositoryId, { enabled: false, origin: 'recovery-input' });
          await manage.disconnectFree(event.userId);
          break;
        case 'account-closed':
          // The authoritative closure names its personal targets; never infer organisations from restored reach.
          for (const repositoryId of event.repositoryIds) {
            await app.setRepositoryExecution(repositoryId, { enabled: false, origin: 'recovery-input' });
            await manage.deselect(repositoryId);
            await app.deleteHistory(repositoryId, { deletedAt: event.at, reapplyUntil: event.reapplyUntil });
          }
          // A closure was admitted only without a Works link. A stale restored link cannot resurrect it.
          for (const link of (await database.prepare("SELECT link_id FROM commercial_links WHERE product_account=? AND state='active'").bind(event.userId).all()).results) {
            await works.endLink(link.link_id, { source: 'recovery-account-closure', endedAt: event.at });
          }
          await manage.forgetAccount(event.userId);
          await participation.forgetAccount(event.userId);
          await auth.revokeAuthorization(event.userId, { disconnectService: true });
          await manage.forgetPreference(event.userId);
          break;
      }
      receipt.applied.push(event.id);
      await commit();
    }
    at = through;
    await app.expireHistory();
    await auth.maintain();
    const remaining = await database.prepare("SELECT count(*) AS count FROM commercial_links WHERE state='active'").first();
    if (remaining.count > 0) {
      if (!commercial) {
        receipt.commercial = { current: 0, ended: 0, unavailable: remaining.count };
      } else {
        receipt.commercial = await commercial.reconcileAfterRestore();
        // Read the actual hold state too; an adapter's acknowledgement cannot release one.
        const held = await database.prepare("SELECT count(*) AS count FROM commercial_links WHERE state='active' AND restored_at IS NOT NULL").first();
        if (held.count > 0) receipt.commercial.unavailable = Math.max(receipt.commercial.unavailable ?? 0, held.count);
      }
    } else receipt.commercial = { current: 0, ended: 0, unavailable: 0 };
    receipt.phase = receipt.commercial.unavailable === 0 ? 'replayed' : 'incomplete';
    receipt.code = receipt.phase === 'incomplete' ? 'E_RECOVERY_COMMERCIAL_UNAVAILABLE' : null;
    await commit();
    return structuredClone(receipt);
  } catch (error) {
    receipt.phase = 'incomplete';
    receipt.code = error?.code === 'E_COMMERCIAL_UNAVAILABLE' ? 'E_RECOVERY_COMMERCIAL_UNAVAILABLE' : 'E_RECOVERY_REPLAY';
    // Persist only a product code, never raw database/provider/credential errors.
    try { await commit(); } catch { /* The previous committed prefix remains incomplete. */ }
    throw Object.assign(new Error('Recovery replay is incomplete; keep the target isolated and replay the input.'), { code: receipt.code, cause: error, checkpoint: structuredClone(receipt) });
  }
}
