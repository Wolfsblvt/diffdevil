// SPDX-License-Identifier: MIT
import { readReport } from '../report.js';
import { comparisonKey, type BrowserComparison } from './acquisition.js';
import type { Report } from '../model.js';

/** Optional immutable delivery contract. No check-Markdown scraping or hosted-analysis request. */
export interface BrowserAppReport {
  readonly kind: 'diffdevil.browser-app-report';
  readonly version: 1;
  readonly comparison: BrowserComparison;
  readonly engineVersion: string;
  readonly policyId: string;
  readonly report: Report;
}
export type AppStanding =
  | { readonly kind: 'local'; readonly reason: string }
  | { readonly kind: 'exact'; readonly report: Report }
  | { readonly kind: 'policy-mismatch'; readonly report: Report }
  | { readonly kind: 'stale'; readonly head: string }
  | { readonly kind: 'incompatible'; readonly reason: string };

export function assessAppReport(local: BrowserComparison, policyId: string, engineVersion: string, input: unknown): AppStanding {
  if (input === undefined || input === null) return { kind: 'local', reason: 'No authenticated App report delivery is configured.' };
  if (typeof input !== 'object' || Array.isArray(input)) return { kind: 'incompatible', reason: 'Malformed App report envelope.' };
  const value = input as Partial<BrowserAppReport>;
  if (value.kind !== 'diffdevil.browser-app-report' || value.version !== 1 || !value.comparison || value.engineVersion !== engineVersion) return { kind: 'incompatible', reason: 'Unsupported App report or engine version.' };
  try {
    comparisonKey(value.comparison);
    if (value.comparison.host !== local.host || value.comparison.repository.toLowerCase() !== local.repository.toLowerCase() || value.comparison.pullRequest !== local.pullRequest) return { kind: 'incompatible', reason: 'The App report belongs to another pull request.' };
    if (value.comparison.base !== local.base || value.comparison.head !== local.head) return { kind: 'stale', head: value.comparison.head };
    const parsed = readReport(value.report);
    if (!parsed.ok || parsed.value.source.base !== local.base || parsed.value.source.head !== local.head || parsed.value.source.repository?.toLowerCase() !== local.repository.toLowerCase() || parsed.value.source.pullRequest !== local.pullRequest || parsed.value.policyId !== value.policyId) return { kind: 'incompatible', reason: 'The report identity disagrees with its envelope.' };
    return value.policyId === policyId ? { kind: 'exact', report: parsed.value } : { kind: 'policy-mismatch', report: parsed.value };
  } catch { return { kind: 'incompatible', reason: 'Invalid App comparison identity.' }; }
}
