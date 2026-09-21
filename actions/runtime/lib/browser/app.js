// SPDX-License-Identifier: MIT
import { comparisonKey, readComparison } from './acquisition.js';
/** Agreement is not approval. Call only for an authenticated immutable report delivery. */
export function appStanding(local, app) {
    if (!app)
        return 'local';
    if (app.kind !== 'diffdevil.browser-report' || app.version !== 1)
        return 'incompatible';
    try {
        const a = readComparison(local.comparison);
        const b = readComparison(app.comparison);
        if (a.repository.toLowerCase() !== b.repository.toLowerCase() || a.pullRequest !== b.pullRequest)
            return 'incompatible';
        if (comparisonKey(a) !== comparisonKey(b))
            return 'stale';
        if (['engine', 'schema', 'measurement', 'presenter'].some(key => local[key] !== app[key]))
            return 'incompatible';
        if (local.policyDigest !== app.policyDigest)
            return 'policy-mismatch';
        return local.reportId === app.reportId ? 'matching' : 'incompatible';
    }
    catch {
        return 'incompatible';
    }
}
//# sourceMappingURL=app.js.map