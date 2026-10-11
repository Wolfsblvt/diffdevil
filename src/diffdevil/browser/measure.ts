// SPDX-License-Identifier: MIT
import { capture, unwrap } from '../errors.js';
import { analyzeChanges, readReport, withMeasuredFiles } from '../report.js';
import { changeFromGitHubFile } from './github-change.js';
import type { FileRecord, Report, Result } from '../model.js';

/** Provider patch text for one path of an already analyzed comparison. */
export interface PatchEvidence { readonly path: string; readonly patch: string }
export interface MeasureOutcome {
  readonly report: Report;
  /** Paths whose bounded record became exact. */
  readonly measured: readonly string[];
  /** Paths whose patch could not be used, with the engine's own reason. A rejected path stays bounded. */
  readonly rejected: readonly { readonly path: string; readonly code: string }[];
}
const STATUS: Readonly<Record<FileRecord['changeType'], string | undefined>> = { added: 'added', deleted: 'removed', modified: 'modified', renamed: 'renamed', copied: 'copied', 'type-changed': 'changed', unmerged: undefined };
/**
 * Measure bounded files of a persisted comparison from provider patch text, keeping everything
 * already known. Each file goes through the engine's own provider-file normalizer against the raw
 * counters the report already holds, so a patch that disagrees with them stays bounded exactly as it
 * would have at first acquisition. Aggregates are recomputed by the engine; nothing is extrapolated.
 */
export function measureBoundedFiles(input: Report, patches: readonly PatchEvidence[]): Result<MeasureOutcome> {
  return capture(() => {
    const report = unwrap(readReport(input)); const files = new Map(report.files.map(file => [file.path, file]));
    const replacements = new Map<string, FileRecord>(); const rejected: { path: string; code: string }[] = []; const measured: string[] = [];
    for (const { path, patch } of patches) {
      const file = files.get(path);
      if (!file) { rejected.push({ path, code: 'FILE_ABSENT' }); continue; }
      if (file.family?.blocksComplete) continue;
      const status = STATUS[file.changeType];
      if (file.kind !== 'text' || !status || file.raw.added.status !== 'exact' || file.raw.deleted.status !== 'exact') { rejected.push({ path, code: 'RAW_COUNTS_UNAVAILABLE' }); continue; }
      const change = changeFromGitHubFile({ filename: file.path, status, additions: file.raw.added.value, deletions: file.raw.deleted.value, patch, ...(file.oldPath === undefined ? {} : { previous_filename: file.oldPath }) });
      if (!change.patch) { rejected.push({ path, code: change.incompleteReason ?? 'PATCH_INCOMPLETE' }); continue; }
      const record = unwrap(analyzeChanges([change], { source: report.source })).files[0]!;
      if (record.id !== file.id) { rejected.push({ path, code: 'FILE_IDENTITY' }); continue; }
      replacements.set(file.id, record); measured.push(path);
    }
    return { report: replacements.size ? unwrap(readReport(withMeasuredFiles(report, replacements))) : report, measured, rejected };
  });
}
