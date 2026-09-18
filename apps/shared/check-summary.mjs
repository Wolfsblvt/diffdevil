// SPDX-License-Identifier: AGPL-3.0-only
/**
 * The App's native check summary text, shared by the managed App runtime (which posts
 * it) and the public playground (which previews it). One composer, one wording.
 */
export function checkSummary(report, result) {
  const changed = report.totals?.lines?.changed?.value;
  const raw = report.totals?.raw?.churn?.value;
  return `Replacement-aware changed lines: ${Number.isSafeInteger(changed) ? changed : 'unavailable'}\nRaw churn: ${Number.isSafeInteger(raw) ? raw : 'unavailable'}\nPolicy effects observed: ${result.changed}`;
}
