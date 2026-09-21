// SPDX-License-Identifier: MIT
import { capture, fail, unwrap } from '../errors.js';
import { contentId } from '../inert.js';
import { analyzeChanges } from '../report.js';
import { parseUnifiedDiff } from '../sources/patch.js';
import { changeFromGitHubFile } from './github-change.js';
import { githubInteger, githubRecord, githubSha, githubString, repositoryPath } from '../github/values.js';
export const BROWSER_ADAPTER = 'diffdevil.browser/1';
export const MAX_ACQUISITION_BYTES = 24 * 1024 * 1024;
export function readComparison(input) {
    const value = githubRecord(input, 'Browser comparison');
    if (value.host !== 'github.com')
        fail('E_BROWSER_HOST', 'The browser adapter supports github.com only.', 'source');
    const repository = githubString(value.repository, 'repository');
    repositoryPath(repository);
    if (repository.split('/').some(part => part === '.' || part === '..'))
        fail('E_BROWSER_IDENTITY', 'Invalid repository identity.', 'source');
    return { host: 'github.com', repository, pullRequest: githubInteger(value.pullRequest, 'pull request', 1),
        base: githubSha(value.base, 'base SHA'), head: githubSha(value.head, 'head SHA'),
        ...(value.changedFiles === undefined ? {} : { changedFiles: githubInteger(value.changedFiles, 'file count') }),
        ...(value.additions === undefined ? {} : { additions: githubInteger(value.additions, 'additions') }),
        ...(value.deletions === undefined ? {} : { deletions: githubInteger(value.deletions, 'deletions') }) };
}
export function comparisonKey(input) {
    const c = readComparison(input);
    return `${c.host}/${c.repository.toLowerCase()}#${c.pullRequest}@${c.base}...${c.head}`;
}
/** A damaged block supplies no proof. Independently complete blocks still matter. */
function recovered(text) {
    const result = [];
    const paths = new Set();
    for (const block of text.split(/(?=^diff --git )/mu)) {
        if (!block.startsWith('diff --git '))
            continue;
        let parsed;
        try {
            parsed = parseUnifiedDiff(block);
        }
        catch {
            continue;
        }
        if (parsed.length !== 1)
            continue;
        const file = parsed[0];
        if (paths.has(file.path))
            fail('E_BROWSER_DUPLICATE', 'Duplicate file identity in the acquired diff.', 'source');
        paths.add(file.path);
        result.push(file);
    }
    return result;
}
function unknownFile(file, reason) {
    return { path: file.path, ...(file.oldPath === undefined ? {} : { oldPath: file.oldPath }),
        kind: file.kind, changeType: file.changeType, incompleteReason: reason };
}
/** Serialized provider evidence is the public boundary; no alternate diff arithmetic. */
export function analyzeBrowserInput(json) {
    return capture(() => {
        if (typeof json !== 'string' || new TextEncoder().encode(json).byteLength > MAX_ACQUISITION_BYTES)
            fail('E_BROWSER_LIMIT', 'Browser acquisition exceeds 24 MiB.', 'source');
        const input = githubRecord(JSON.parse(json), 'Browser acquisition');
        const comparison = readComparison(input.comparison);
        if (typeof input.complete !== 'boolean')
            fail('E_BROWSER_EVIDENCE', 'Transport completeness must be explicit.', 'source');
        let complete = input.complete;
        let changes;
        if (input.format === 'github-files') {
            if (!Array.isArray(input.files))
                fail('E_BROWSER_INPUT', 'Expected the provider file array.', 'source');
            changes = input.files.map(changeFromGitHubFile);
            if (typeof input.diff === 'string') {
                const proofs = new Map(recovered(input.diff).map(file => [file.path, file]));
                changes = changes.map(file => {
                    const proof = proofs.get(file.path);
                    if (!proof || proof.oldPath !== file.oldPath || proof.changeType !== file.changeType)
                        return file;
                    if (proof.kind === 'binary' || proof.kind === 'submodule')
                        return { ...file, kind: proof.kind };
                    return proof.patch && file.additions === proof.additions && file.deletions === proof.deletions ? { ...file, kind: 'text', patch: proof.patch } : file;
                });
            }
        }
        else if (input.format === 'diff') {
            if (typeof input.text !== 'string')
                fail('E_BROWSER_INPUT', 'Expected unified-diff text.', 'source');
            if (input.text.trim() && !input.text.startsWith('diff --git ') && !input.text.startsWith('--- '))
                fail('E_BROWSER_INPUT', 'The response is not a unified diff.', 'source');
            try {
                changes = [...parseUnifiedDiff(input.text)];
            }
            catch {
                changes = recovered(input.text);
                complete = false;
            }
        }
        else
            return fail('E_BROWSER_INPUT', 'Unsupported browser acquisition format.', 'source');
        if (new Set(changes.map(file => file.path)).size !== changes.length)
            fail('E_BROWSER_DUPLICATE', 'Duplicate file identity.', 'source');
        if (comparison.changedFiles !== undefined && changes.length > comparison.changedFiles)
            fail('E_BROWSER_EVIDENCE', 'Acquired files exceed the observed PR total.', 'source');
        const all = comparison.changedFiles !== undefined && changes.length === comparison.changedFiles;
        if (!complete && input.format === 'github-files' && all && changes.length)
            fail('E_BROWSER_EVIDENCE', 'Pagination contradicts the observed complete file count.', 'source');
        if (input.complete === false && input.format === 'diff' && changes.length)
            changes[changes.length - 1] = unknownFile(changes.at(-1), 'BROWSER_TRUNCATED_DIFF');
        if (all) {
            const added = changes.reduce((n, file) => n + (file.additions ?? file.patch?.additions ?? 0), 0);
            const deleted = changes.reduce((n, file) => n + (file.deletions ?? file.patch?.deletions ?? 0), 0);
            if (comparison.additions !== undefined && comparison.additions !== added || comparison.deletions !== undefined && comparison.deletions !== deleted)
                changes = changes.map(file => unknownFile(file, 'BROWSER_COUNTER_MISMATCH'));
        }
        const fileSet = all ? { complete: true, total: { status: 'exact', value: changes.length } }
            : { complete: false, total: comparison.changedFiles === undefined ? { status: 'unknown', lower: changes.length, reasons: [{ code: 'BROWSER_FILE_SET_UNPROVEN' }] } : { status: 'exact', value: comparison.changedFiles } };
        return unwrap(analyzeChanges(changes, { fileSet, source: { kind: input.format === 'diff' ? 'unified-diff' : 'github-api', comparison: 'three-dot',
                repository: comparison.repository, pullRequest: comparison.pullRequest, base: comparison.base, head: comparison.head,
                comparisonId: contentId('comparison', [BROWSER_ADAPTER, comparisonKey(comparison)]) } }));
    });
}
//# sourceMappingURL=acquisition.js.map