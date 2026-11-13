// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
export const RECOVERY_DUTIES = ['deletion-expiry', 'history-consent', 'service-disconnect', 'works-disconnect', 'execution-selection', 'delegation-setup'];
export const RECOVERY_MARGIN_DAYS = 7;
const DAY = 86_400_000;
const iso = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
const text = value => typeof value === 'string' && value.trim().length > 0;
const nativeCut = value => value?.kind === 'd1-export' && text(value.databaseId) && text(value.bookmark)
  && typeof value.sqlSha256 === 'string' && /^[a-f0-9]{64}$/u.test(value.sqlSha256);

/** A native cut identifies exported state, not a wall-clock commit time. */
export function sameNativeRecoveryCut(left, right) {
  return nativeCut(left) && right?.kind === 'd1-export' && left.databaseId === right.databaseId
    && left.bookmark === right.bookmark && left.sqlSha256 === right.sqlSha256;
}

/** Evidence coordinates must be qualified by the operating custodian; strings alone cannot prove capture or custody. */
export function isNativeRecoverySource(source, point) {
  const observations = source?.captureObservations;
  return source?.mode === 'immutable-current-native-copy' && text(point?.databaseId)
    && iso(point.capturedAt) && iso(point.supportedUntil) && point.capturedAt <= point.supportedUntil
    && source.databaseId === point.databaseId && source.capturedAt === undefined
    && nativeCut(source.cut) && source.cut.databaseId === point.databaseId
    && text(source.snapshotId) && text(source.healthEvidence) && text(source.consistencyEvidence) && text(source.custodyEvidence)
    && ['source', 'schema', 'originalSeal'].every(key => text(source.interpretation?.[key]))
    && iso(observations?.requestedAt) && iso(observations.firstResponseAt) && iso(observations.completedAt)
    && point.capturedAt <= observations.requestedAt && observations.requestedAt <= observations.firstResponseAt
    && observations.firstResponseAt <= observations.completedAt && observations.completedAt <= point.supportedUntil
    && text(observations.evidence);
}

/** A supported point needs actual later-duty retention through its full restore window plus the privacy margin. */
export function hasRecoveryCoverage(point, guaranteedDays) {
  const duration = Date.parse(point.supportedUntil) - Date.parse(point.capturedAt);
  return Number.isSafeInteger(guaranteedDays) && guaranteedDays > 0 && Number.isFinite(duration) && duration >= 0
    && duration + RECOVERY_MARGIN_DAYS * DAY <= guaranteedDays * DAY;
}
