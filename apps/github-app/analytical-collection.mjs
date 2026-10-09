// SPDX-License-Identifier: AGPL-3.0-only
import { analyzeDiff, unwrap } from '@wolfsblvt/diffdevil';
import { analyzeGitHub } from '@wolfsblvt/diffdevil/github';
import { normalizeAnalyticalRecord } from './analytical-data.mjs';

const sha = value => typeof value === 'string' && /^[0-9a-f]{40,64}$/u.test(value);
const iso = value => value == null ? null : new Date(value).toISOString();

/** Use GitHub's default-branch commit introducer, rather than guessing squash versus rebase from parent count. */
export async function recoverFinalComparison({ client, repository, pull, commit, defaultBranch }) {
  if (commit.sha !== pull.merge_commit_sha || !sha(commit.sha) || typeof defaultBranch !== 'string'
    || !Number.isSafeInteger(pull.commits) || pull.commits < 1) return null;
  const branchRoute = `/repos/${repository}/branches/${encodeURIComponent(defaultBranch)}`;
  const defaultHead = (await client.json(branchRoute)).commit?.sha;
  if (!sha(defaultHead)) return null;
  const reach = await client.json(`/repos/${repository}/compare/${commit.sha}...${defaultHead}`);
  if (reach.merge_base_commit?.sha !== commit.sha) return null;
  let current = commit, introduced = 0;
  for (;;) {
    let belongs = false;
    for (let page = 1;; page++) {
      const associated = await client.json(`/repos/${repository}/commits/${current.sha}/pulls?per_page=100&page=${page}`);
      if (!Array.isArray(associated) || associated.some(value => !Number.isSafeInteger(value.number))) throw new TypeError('Commit introducer unavailable.');
      if (associated.some(value => value.number === pull.number && value.merged_at)) { belongs = true; break; }
      if (associated.length < 100) break;
    }
    if (!belongs) {
      if (introduced === 0 || (await client.json(branchRoute)).commit?.sha !== defaultHead) return null;
      return { base: current.sha, head: commit.sha };
    }
    // The provider's original PR commit count bounds a squash/rebase contribution, not an arbitrary history limit.
    if (++introduced > pull.commits || current.parents?.length !== 1 || !sha(current.parents[0].sha)) return null;
    const parent = current.parents[0].sha;
    current = await client.json(`/repos/${repository}/git/commits/${parent}`);
    if (current.sha !== parent) throw new TypeError('Commit ancestry unavailable.');
  }
}

/** Read immutable Git blobs transiently; persist a line count, not content or a provider byte-size counter. */
export async function observeFileSize(client, repository, path, revision) {
  if (!sha(revision)) throw new TypeError('File size requires an immutable revision.');
  try {
    const response = await client.request(`/repos/${repository}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${revision}`, { accept: 'application/vnd.github.raw+json' });
    const body = response.text;
    if (body.includes('\0')) return null;
    return body === '' ? 0 : body.split('\n').length - (body.endsWith('\n') ? 1 : 0);
  } catch (error) {
    if (error?.status === 404) return null;
    throw error;
  }
}

/** No writes to GitHub. A caller supplies its admitted read client and explicitly recovered squash/rebase boundary. */
export async function collectAnalyticalPullRequest({ client, store, repositoryId, pullRequest, now = () => new Date().toISOString(), resolveFinalComparison, recordedResult }) {
  if (!(await store.historySettings(repositoryId, { independentExecution: true })).enabled) return { status: 'disabled' };
  const repository = await client.json(`/repositories/${repositoryId}`);
  if (repository?.id !== repositoryId || typeof repository.full_name !== 'string' || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(repository.full_name)) throw new TypeError('Repository identity mismatch.');
  const name = repository.full_name;
  const route = `/repos/${name}/pulls/${pullRequest}`;
  const before = await client.json(route);
  if (before.number !== pullRequest || !sha(before.head?.sha)) throw new TypeError('Pull request identity mismatch.');
  const existing = (await store.analyticalRecords(repositoryId)).find(record => record.pullRequest === pullRequest);
  const observedAt = now(), revisions = existing?.revisions ?? [];
  let final = existing?.final ?? null, recovery = null, code = null;
  try {
    if (before.state === 'open') {
      const report = unwrap(await analyzeGitHub(client, { provider: 'github', repository: name, pullRequest }));
      const sameHead = recordedResult?.head === report.source.head;
      const revision = { base: report.source.base, head: report.source.head, observedAt, report,
        ...(sameHead ? { originalPolicyId: recordedResult.policyId, originalBand: recordedResult.band,
          desiredLabel: recordedResult.desiredLabel, observedLabel: recordedResult.observedLabel } : {}) };
      const index = revisions.findIndex(value => value.base === revision.base && value.head === revision.head);
      if (index < 0) revisions.push(revision);
      else revisions[index] = { ...revisions[index], report, observedAt };
    } else if (before.merged_at && !final) {
      const commit = await client.json(`/repos/${name}/git/commits/${before.merge_commit_sha}`);
      let boundary;
      if (commit.sha === before.merge_commit_sha && commit.parents?.length > 1 && sha(commit.parents[0].sha)) boundary = { base: commit.parents[0].sha, head: commit.sha };
      else boundary = resolveFinalComparison ? await resolveFinalComparison({ repositoryId, pullRequest, pull: before, commit })
        : await recoverFinalComparison({ client, repository: name, pull: before, commit, defaultBranch: repository.default_branch });
      if (boundary && sha(boundary.base) && sha(boundary.head) && boundary.head === before.merge_commit_sha) {
        const comparison = await client.json(`/repos/${name}/compare/${boundary.base}...${boundary.head}`);
        if (comparison.merge_base_commit?.sha !== boundary.base || !Array.isArray(comparison.files)) throw new TypeError('Final comparison does not establish its direct base.');
        const diff = await client.request(`/repos/${name}/compare/${boundary.base}...${boundary.head}`, { accept: 'application/vnd.github.diff' });
        const parsed = unwrap(analyzeDiff(diff.text));
        const complete = comparison.files.length < 300 && comparison.files.length === parsed.files.length
          && comparison.files.every(file => parsed.files.some(value => value.path === file.filename));
        const total = Math.max(comparison.files.length, parsed.files.length);
        const report = unwrap(analyzeDiff(diff.text, { fileSet: { complete, total: complete ? { status: 'exact', value: total }
          : { status: 'unknown', lower: total, reasons: [{ code: 'FILE_SET_INCOMPLETE' }] } },
        source: { kind: 'github-api', comparison: 'direct', comparisonId: `final:${boundary.base}:${boundary.head}`, ...boundary } }));
        const sizes = [];
        for (const file of report.files) sizes.push({ path: file.path,
          before: file.changeType === 'added' ? 0 : file.kind === 'text' ? await observeFileSize(client, name, file.oldPath ?? file.path, boundary.base) : null,
          after: file.changeType === 'deleted' ? 0 : file.kind === 'text' ? await observeFileSize(client, name, file.path, boundary.head) : null });
        final = { ...boundary, observedAt, report, sizes, basis: 'final-merged-comparison' };
      } else recovery = 'final-merge-boundary-unrecovered';
    }
  } catch (error) {
    // An unavailable comparison does not erase the independently observed PR lifecycle.
    recovery = 'comparison-acquisition-unavailable';
    const candidate = error?.diagnostic?.code ?? error?.code;
    code = typeof candidate === 'string' && /^[A-Z0-9_]+$/u.test(candidate) ? candidate : 'E_APP_DATA_COMPARISON';
  }
  const after = await client.json(route);
  if (after.head?.sha !== before.head.sha || after.state !== before.state || after.merge_commit_sha !== before.merge_commit_sha || after.updated_at !== before.updated_at) throw Object.assign(new Error('E_APP_DATA_STALE'), { code: 'E_APP_DATA_STALE' });
  if (recordedResult?.head === after.head.sha && Array.isArray(after.labels)) {
    const selected = after.labels.filter(label => recordedResult.managedLabels?.includes(label.name));
    const revision = revisions.find(value => value.head === after.head.sha);
    if (revision) revision.observedLabel = selected.length === 1 ? selected[0].name : null;
  }
  const record = normalizeAnalyticalRecord({ version: 1, repositoryId, pullRequest,
    state: before.merged_at ? 'merged' : before.state === 'closed' ? 'closed' : before.draft ? 'draft' : 'open',
    openedAt: iso(before.created_at), readyAt: existing?.readyAt ?? null, mergedAt: iso(before.merged_at), closedAt: iso(before.closed_at),
    updatedAt: iso(before.updated_at), observedAt, currentHead: before.head.sha, revisions, final });
  return { ...await store.recordAnalytical(record), recovery, code };
}

/** Capture actual current default-branch sizes for known files; refuse a moved branch before publishing. */
export async function captureDefaultBranchSizes({ client, store, repositoryId, now = () => new Date().toISOString() }) {
  if (!(await store.historySettings(repositoryId, { independentExecution: true })).enabled) return { status: 'disabled' };
  const repository = await client.json(`/repositories/${repositoryId}`);
  if (repository.id !== repositoryId || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(repository.full_name) || typeof repository.default_branch !== 'string') throw new TypeError('Repository identity mismatch.');
  const route = `/repos/${repository.full_name}/branches/${encodeURIComponent(repository.default_branch)}`;
  const branch = await client.json(route), revision = branch.commit?.sha;
  if (!sha(revision)) throw new TypeError('Default branch revision unavailable.');
  const records = await store.analyticalRecords(repositoryId);
  const paths = [...new Set(records.flatMap(record => [record.final, ...record.revisions].flatMap(revision => revision?.report?.files.filter(file => file.kind === 'text').map(file => file.path) ?? [])))];
  const observations = [];
  for (const path of paths) observations.push({ repositoryId, path, revision, size: await observeFileSize(client, repository.full_name, path, revision) });
  const observedAt = now();
  if ((await client.json(route)).commit?.sha !== revision) throw Object.assign(new Error('E_APP_DATA_STALE'), { code: 'E_APP_DATA_STALE' });
  for (const observation of observations) await store.recordAnalyticalSize({ ...observation, observedAt });
  return { status: 'observed', revision, observedAt, files: observations.length };
}
