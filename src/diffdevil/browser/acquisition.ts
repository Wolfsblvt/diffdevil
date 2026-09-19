// SPDX-License-Identifier: MIT
import { capture, fail, unwrap } from '../errors.js';
import { contentId, deepFreeze } from '../inert.js';
import { analyzeChanges } from '../report.js';
import { parseUnifiedDiff, type ChangeInput } from '../sources/patch.js';
import type { DiffSourceIdentity, FileSet, Report, Result } from '../model.js';

/** Provider identity, not the DOM position at which a result happens to be drawn. */
export interface BrowserComparison {
  readonly host: 'github.com';
  readonly repository: string;
  readonly pullRequest: number;
  readonly base: string;
  readonly head: string;
}
export interface AcquisitionEvidence {
  readonly files?: number;
  readonly additions?: number;
  readonly deletions?: number;
  /** False when the provider explicitly omits material or a transport is cut short. */
  readonly complete?: boolean;
}
export const BROWSER_DIFF_LIMIT = 8 * 1024 * 1024;
export const BROWSER_ADAPTER_VERSION = 'diffdevil.browser/1';

export function validateComparison(input: BrowserComparison): BrowserComparison {
  if (input.host !== 'github.com' || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(input.repository)
    || input.repository.split('/').some(part => part === '.' || part === '..')
    || !Number.isSafeInteger(input.pullRequest) || input.pullRequest < 1
    || !/^[a-f0-9]{40}$/u.test(input.base) || !/^[a-f0-9]{40}$/u.test(input.head)) {
    fail('E_BROWSER_IDENTITY', 'A browser comparison requires a repository, PR number, and full immutable base/head SHAs.', 'source');
  }
  return deepFreeze({ host: input.host, repository: input.repository, pullRequest: input.pullRequest, base: input.base, head: input.head });
}

export function comparisonKey(input: BrowserComparison): string {
  const c = validateComparison(input);
  return `${c.host}/${c.repository.toLowerCase()}#${c.pullRequest}@${c.base}...${c.head}`;
}

export function browserSource(input: BrowserComparison): DiffSourceIdentity {
  const c = validateComparison(input);
  return { kind: 'unified-diff', comparison: 'three-dot', comparisonId: contentId('comparison', c),
    repository: c.repository, pullRequest: c.pullRequest, base: c.base, head: c.head };
}

/** Strict parsing and the existing replacement-lines engine; no browser-only arithmetic. */
export function analyzeUnifiedDiff(text: string, identity: BrowserComparison, evidence: AcquisitionEvidence = {}): Result<Report> {
  return capture(() => {
    if (new TextEncoder().encode(text).byteLength > BROWSER_DIFF_LIMIT) {
      fail('E_BROWSER_DIFF_LIMIT', `The diff exceeds the ${BROWSER_DIFF_LIMIT}-byte browser analysis limit.`, 'source');
    }
    for (const value of [evidence.files, evidence.additions, evidence.deletions]) {
      if (value !== undefined && (!Number.isSafeInteger(value) || value < 0)) fail('E_BROWSER_EVIDENCE', 'Provider counters must be nonnegative safe integers.', 'source');
    }
    let changes = parseUnifiedDiff(text);
    if (evidence.files !== undefined && changes.length > evidence.files) {
      fail('E_BROWSER_EVIDENCE', 'The diff contains more files than this comparison advertises. Refresh the comparison.', 'source');
    }
    // A syntactically complete patch can still have been cut at a file boundary.
    // Only independent cardinality evidence establishes a complete file set.
    const complete = evidence.complete !== false && evidence.files !== undefined && evidence.files === changes.length;
    const fileSet: FileSet = complete
      ? { complete: true, total: { status: 'exact', value: changes.length } }
      : { complete: false, total: evidence.files !== undefined && evidence.files > changes.length
        ? { status: 'exact', value: evidence.files }
        : { status: 'unknown', lower: changes.length, reasons: [{ code: 'GITHUB_FILE_SET_UNCONFIRMED' }] } };
    if (complete) {
      const added = changes.reduce((sum, file) => sum + (file.additions ?? file.patch?.additions ?? 0), 0);
      const deleted = changes.reduce((sum, file) => sum + (file.deletions ?? file.patch?.deletions ?? 0), 0);
      if (evidence.additions !== undefined && evidence.additions !== added || evidence.deletions !== undefined && evidence.deletions !== deleted) {
        // Counts disagree, so even a well-formed hunk is not proof that its file is
        // complete. Preserve identities but do not bless partial raw counts as exact.
        changes = changes.map((file): ChangeInput => ({ path: file.path, ...(file.oldPath === undefined ? {} : { oldPath: file.oldPath }),
          changeType: file.changeType, kind: file.kind, incompleteReason: 'GITHUB_DIFF_COUNTER_MISMATCH' }));
      }
    }
    return unwrap(analyzeChanges(changes, { source: browserSource(identity), fileSet }));
  });
}

/** Explicit absence of source material is a report with unknown evidence, not zero. */
export function unavailableBrowserReport(identity: BrowserComparison, reason: string, files?: number): Result<Report> {
  const total = files !== undefined && Number.isSafeInteger(files) && files > 0
    ? { status: 'exact' as const, value: files }
    : { status: 'unknown' as const, lower: 0, reasons: [{ code: reason }] };
  return analyzeChanges([], { source: browserSource(identity), fileSet: { complete: false, total } });
}
