// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/** Stop retains consent. Explicit readmission resumes history without enabling repository effects. */
export function historyCollectionPause(row) {
  if (row?.history_enabled !== 1 || row.history_consent_reason !== null || row.state !== 'pending-enable'
    || row.execution_consent_reason !== 'explicitly-disabled' || row.selected_at) return null;
  return row.execution_consent_origin === 'plan-change' ? 'capacity' : 'stopped';
}

/**
 * Reader-facing consent category; storage and recovery snapshots retain the exact request identity.
 * @param {string|null|undefined} origin
 * @returns {string}
 */
export function historyOriginCategory(origin) {
  return origin?.startsWith('history-deletion-revision-') || origin?.startsWith('history-deletion-account-') ? 'history-deletion' : origin ?? 'unknown';
}
