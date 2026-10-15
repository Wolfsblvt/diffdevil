// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
export const RECOVERY_DUTIES = ['deletion-expiry', 'history-consent', 'service-disconnect', 'works-disconnect', 'execution-selection', 'delegation-setup'];
export const RECOVERY_MARGIN_DAYS = 7;
const DAY = 86_400_000;

/** A supported point needs actual later-duty retention through its full restore window plus the privacy margin. */
export function hasRecoveryCoverage(point, guaranteedDays) {
  const duration = Date.parse(point.supportedUntil) - Date.parse(point.capturedAt);
  return Number.isSafeInteger(guaranteedDays) && guaranteedDays > 0 && Number.isFinite(duration) && duration >= 0
    && duration + RECOVERY_MARGIN_DAYS * DAY <= guaranteedDays * DAY;
}
