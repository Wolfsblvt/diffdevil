// SPDX-License-Identifier: MIT
import { capture, unwrap } from '../errors.js';
import { analyzeChanges, readReport, withMeasuredFiles } from '../report.js';
import { changeFromGitHubFile } from './github-change.js';
const STATUS = { added: 'added', deleted: 'removed', modified: 'modified', renamed: 'renamed', copied: 'copied', 'type-changed': 'changed', unmerged: undefined };
/**
 * Measure bounded files of a persisted comparison from provider patch text, keeping everything
 * already known. Each file goes through the engine's own provider-file normalizer against the raw
 * counters the report already holds, so a patch that disagrees with them stays bounded exactly as it
 * would have at first acquisition. Aggregates are recomputed by the engine; nothing is extrapolated.
 */
export function measureBoundedFiles(input, patches) {
    return capture(() => {
        const report = unwrap(readReport(input));
        const files = new Map(report.files.map(file => [file.path, file]));
        const replacements = new Map();
        const rejected = [];
        const measured = [];
        for (const { path, patch } of patches) {
            const file = files.get(path);
            if (!file) {
                rejected.push({ path, code: 'FILE_ABSENT' });
                continue;
            }
            if (file.family?.blocksComplete)
                continue;
            const status = STATUS[file.changeType];
            if (file.kind !== 'text' || !status || file.raw.added.status !== 'exact' || file.raw.deleted.status !== 'exact') {
                rejected.push({ path, code: 'RAW_COUNTS_UNAVAILABLE' });
                continue;
            }
            const change = changeFromGitHubFile({ filename: file.path, status, additions: file.raw.added.value, deletions: file.raw.deleted.value, patch, ...(file.oldPath === undefined ? {} : { previous_filename: file.oldPath }) });
            if (!change.patch) {
                rejected.push({ path, code: change.incompleteReason ?? 'PATCH_INCOMPLETE' });
                continue;
            }
            const record = unwrap(analyzeChanges([change], { source: report.source })).files[0];
            if (record.id !== file.id) {
                rejected.push({ path, code: 'FILE_IDENTITY' });
                continue;
            }
            replacements.set(file.id, record);
            measured.push(path);
        }
        return { report: replacements.size ? unwrap(readReport(withMeasuredFiles(report, replacements))) : report, measured, rejected };
    });
}
//# sourceMappingURL=measure.js.map