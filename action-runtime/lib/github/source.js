import { captureAsync, fail, unwrap } from '../errors.js';
import { contentId, deepFreeze } from '../inert.js';
import { exact } from '../numeric.js';
import { analyzeGit } from '../sources/git.js';
import { analyzeChanges } from '../report.js';
import { parsePatch, parseUnifiedDiff } from '../sources/patch.js';
import { validatePath } from '../paths.js';
import { GitHubClient, GitHubRequestError } from './client.js';
import { githubInteger, githubRecord, githubSha, githubString, pullPath } from './values.js';
/** Read the current target, not an event's potentially stale head or base. */
export async function readPullSnapshot(client, target) {
    const pr = githubRecord(await client.json(pullPath(target)), 'pull request');
    if (pr.number !== target.pullRequest)
        fail('E_PLAN_TARGET', 'GitHub returned a different pull request.', 'source');
    const base = githubRecord(pr.base, 'base'), head = githubRecord(pr.head, 'head');
    const repo = githubRecord(base.repo, 'base repository');
    if (githubString(repo.full_name, 'base repository name').toLowerCase() !== target.repository.toLowerCase())
        fail('E_PLAN_TARGET', 'GitHub returned a different base repository.', 'source');
    if (pr.state !== 'open' && pr.state !== 'closed')
        fail('E_GITHUB_RESPONSE', 'Unknown pull-request state.', 'source');
    return { head: githubSha(head.sha, 'head SHA'), base: githubSha(base.sha, 'base SHA'), changedFiles: githubInteger(pr.changed_files, 'changed files'), state: pr.state };
}
export function githubSourceIdentity(client, target, snapshot) {
    return { kind: 'github-api', comparison: 'three-dot', repository: target.repository, pullRequest: target.pullRequest,
        head: snapshot.head, base: snapshot.base,
        comparisonId: contentId('comparison', [client.apiUrl, target.repository.toLowerCase(), target.pullRequest, snapshot.base, snapshot.head]) };
}
function changeFromApi(input) {
    const file = githubRecord(input, 'changed file');
    const path = validatePath(githubString(file.filename, 'filename'));
    const statuses = { added: 'added', removed: 'deleted', modified: 'modified', renamed: 'renamed', copied: 'copied', changed: 'type-changed', unchanged: 'modified' };
    const status = githubString(file.status, 'file status'), changeType = statuses[status];
    if (!changeType)
        fail('E_GITHUB_RESPONSE', `Unsupported GitHub file status: ${status}.`, 'source');
    const additions = githubInteger(file.additions, 'raw additions'), deletions = githubInteger(file.deletions, 'raw deletions');
    if (!Number.isSafeInteger(additions + deletions) || file.changes !== undefined && file.changes !== additions + deletions)
        fail('E_GITHUB_RESPONSE', 'GitHub raw file counters disagree.', 'source');
    const oldPath = changeType === 'renamed' || changeType === 'copied' ? validatePath(githubString(file.previous_filename, 'previous filename')) : undefined;
    const common = { path, changeType, additions, deletions, ...(oldPath === undefined ? {} : { oldPath }) };
    if (file.patch !== undefined && typeof file.patch !== 'string')
        fail('E_GITHUB_RESPONSE', 'GitHub patch must be text when present.', 'source');
    // Submodule fragments have no mode header; obtain the raw diff before treating them as text.
    const ambiguousGitlink = typeof file.patch === 'string' && /^[+-]Subproject commit [0-9a-f]+(?:-dirty)?$/mu.test(file.patch);
    if (typeof file.patch === 'string' && file.patch !== '' && !ambiguousGitlink) {
        try {
            const patch = parsePatch(file.patch);
            if (patch.additions === additions && patch.deletions === deletions)
                return { ...common, kind: 'text', patch };
        }
        catch { /* Raw source counters still bound a text patch whose edit blocks are incomplete. */ }
    }
    if (ambiguousGitlink || additions + deletions === 0)
        return { ...common, kind: 'unknown', incompleteReason: 'MATERIAL_KIND_UNKNOWN' };
    return { ...common, kind: 'text', incompleteReason: file.patch === undefined ? 'PATCH_OMITTED' : 'PATCH_INCOMPLETE' };
}
async function refineKinds(client, target, changes) {
    if (!changes.some(change => change.kind === 'unknown'))
        return changes;
    let diff;
    try {
        diff = (await client.request(pullPath(target), { accept: 'application/vnd.github.diff' })).text;
    }
    catch (error) {
        // This optional read improves evidence only; a denied/missing raw diff does not erase the API facts.
        if (error instanceof GitHubRequestError)
            return changes;
        throw error;
    }
    const proofs = new Map(), duplicates = new Set();
    try {
        for (const proof of parseUnifiedDiff(diff))
            proofs.set(proof.path, proof);
    }
    catch { /* Fall back to independently complete file blocks, not an alternate diff parser. */ }
    if (proofs.size === 0)
        for (const fragment of diff.split(/(?=^diff --git )/mu).filter(Boolean)) {
            try {
                const parsed = parseUnifiedDiff(fragment);
                if (parsed.length === 1) {
                    const proof = parsed[0];
                    if (proofs.has(proof.path))
                        duplicates.add(proof.path);
                    else
                        proofs.set(proof.path, proof);
                }
            }
            catch { /* Truncated fragments supply no stronger evidence. Other complete file blocks remain usable. */ }
        }
    return changes.map(change => {
        if (change.kind !== 'unknown')
            return change;
        const proof = proofs.get(change.path);
        if (!proof || duplicates.has(change.path) || proof.oldPath !== change.oldPath || proof.changeType !== change.changeType)
            return change;
        if (proof.kind === 'binary' || proof.kind === 'submodule')
            return { ...change, kind: proof.kind };
        if (proof.patch && proof.additions === change.additions && proof.deletions === change.deletions)
            return { ...change, kind: 'text', patch: proof.patch };
        return change;
    });
}
/** Paginated PR acquisition with explicit completeness and before/after identity checks. */
export function analyzeGitHub(client, target, options = {}) {
    return captureAsync(async () => {
        const before = await readPullSnapshot(client, target);
        const pages = await client.list(`${pullPath(target)}/files?per_page=100`, { maximumItems: 3000 });
        const changes = await refineKinds(client, target, pages.items.map(changeFromApi));
        const after = await readPullSnapshot(client, target);
        if (before.head !== after.head || before.base !== after.base || before.changedFiles !== after.changedFiles)
            fail('E_SOURCE_STALE', 'Pull-request head or base changed during acquisition. Analyze the current comparison.', 'source');
        if (changes.length > before.changedFiles)
            fail('E_GITHUB_RESPONSE', 'GitHub returned more files than the pull-request total.', 'source');
        if (pages.truncated && changes.length === before.changedFiles)
            fail('E_GITHUB_RESPONSE', 'GitHub pagination contradicts the complete file count.', 'source');
        const report = unwrap(analyzeChanges(changes, { ...options, source: githubSourceIdentity(client, target, before),
            fileSet: { complete: changes.length === before.changedFiles, total: exact(before.changedFiles) } }));
        return deepFreeze(report);
    });
}
/** Exact local-Git acquisition bound to the live PR, without checking out or executing its code. */
export function analyzeGitHubGit(client, target, options = {}) {
    return captureAsync(async () => {
        const before = await readPullSnapshot(client, target);
        const measured = unwrap(await analyzeGit({ ...options, base: before.base, head: before.head, comparison: 'three-dot' }));
        const after = await readPullSnapshot(client, target);
        if (before.head !== after.head || before.base !== after.base)
            fail('E_SOURCE_STALE', 'The PR head or base moved during local Git acquisition. Analyze the current comparison again.', 'source');
        const identity = githubSourceIdentity(client, target, before);
        const { reportId: ignored, ...body } = measured;
        const report = { ...body, source: { ...measured.source, repository: target.repository, pullRequest: target.pullRequest,
                comparisonId: identity.comparisonId, baseTip: before.base } };
        return deepFreeze({ ...report, reportId: contentId('report', report) });
    });
}
//# sourceMappingURL=source.js.map