// SPDX-License-Identifier: MIT
import { comparisonKey, readComparison, type BrowserComparison } from './acquisition.js';
export interface AppReportIdentity {
  readonly kind: 'diffdevil.browser-report'; readonly version: 1; readonly comparison: BrowserComparison;
  readonly reportId: string; readonly policyDigest: string; readonly engine: string; readonly schema: string; readonly measurement: string; readonly presenter: string;
}
export type AppStanding = 'local' | 'matching' | 'policy-mismatch' | 'stale' | 'incompatible';
/** Agreement is not approval. Call only for an authenticated immutable report delivery. */
export function appStanding(local: AppReportIdentity, app?: AppReportIdentity): AppStanding {
  if (!app) return 'local';
  if (app.kind !== 'diffdevil.browser-report' || app.version !== 1) return 'incompatible';
  try {
    const a = readComparison(local.comparison); const b = readComparison(app.comparison);
    if (a.repository.toLowerCase() !== b.repository.toLowerCase() || a.pullRequest !== b.pullRequest) return 'incompatible';
    if (comparisonKey(a) !== comparisonKey(b)) return 'stale';
    if (['engine', 'schema', 'measurement', 'presenter'].some(key => local[key as keyof AppReportIdentity] !== app[key as keyof AppReportIdentity])) return 'incompatible';
    if (local.policyDigest !== app.policyDigest) return 'policy-mismatch';
    return local.reportId === app.reportId ? 'matching' : 'incompatible';
  } catch { return 'incompatible'; }
}
