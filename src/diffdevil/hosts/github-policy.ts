import { posix, resolve } from 'node:path';
import { fail, unwrap } from '../errors.js';
import { validatePath } from '../paths.js';
import type { PlanTarget } from '../model.js';
import { GitHubClient } from '../github/client.js';
import { loadGitHubPolicy, readGitHubText } from '../github/policy.js';
import { readPullSnapshot } from '../github/source.js';
import { githubRecord, githubSha, githubString, repositoryPath } from '../github/values.js';
import { compilePolicy, type CompiledPolicy } from '../policy/compile.js';
import { compilePolicyText, loadLocalPolicy, type HostPolicyOptions } from './policy.js';
import { readUtf8, readWorkspaceUtf8 } from './io.js';
import { DEFAULT_LIMITS } from '../limits.js';

export interface HostedPolicySelection extends HostPolicyOptions {
  /** Actions confine explicit workspace policy/templates; trusted local CLI hosts may omit this. */
  readonly workspaceRoot?: string;
  readonly config?: string;
  readonly inline?: string;
  readonly source?: 'base' | 'pinned' | 'workspace';
  readonly ref?: string;
  readonly repository?: string;
}
export interface HostedPolicy {
  readonly policy: CompiledPolicy;
  /** Present only for PR-base policy, not deliberately pinned or workspace sources. */
  readonly expectedPolicyBase?: string;
  /** Repository-base definition synchronization rechecks its policy revision before writes. */
  readonly assertCurrent?: () => Promise<void>;
}

async function defaultBranchCommit(client: GitHubClient, repository: string): Promise<string> {
  const root = repositoryPath(repository);
  const repo = githubRecord(await client.json(root), 'repository');
  const branch = githubString(repo.default_branch, 'default branch');
  const commit = githubRecord(await client.json(`${root}/commits/${encodeURIComponent(branch)}`), 'default branch commit');
  return githubSha(commit.sha, 'default branch commit');
}

/** Select actual trusted host sources. A PR's changed policy never becomes apply policy implicitly. */
export async function loadHostedGitHubPolicy(
  client: GitHubClient,
  target: Pick<PlanTarget, 'repository'> & Partial<Pick<PlanTarget, 'pullRequest'>>,
  selection: HostedPolicySelection,
  cwd: string,
): Promise<HostedPolicy> {
  if (selection.config !== undefined && selection.inline !== undefined) fail('E_CONFIG_CONFLICT', 'Select a policy file or inline policy, not both.', 'config');
  const source = selection.source ?? 'base';
  if (!['base', 'pinned', 'workspace'].includes(source)) fail('E_CONFIG', 'Policy source must be base, pinned or workspace.', 'config');
  if (source !== 'pinned' && (selection.ref !== undefined || selection.repository !== undefined)) fail('E_CONFIG_CONFLICT', 'Policy ref/repository require explicit pinned policy source.', 'config');
  if (source === 'pinned' && selection.ref === undefined) fail('E_CONFIG', 'Pinned policy needs a full commit SHA in policy-ref.', 'config');
  const options: HostPolicyOptions = {
    ...(selection.paths === undefined ? {} : { paths: selection.paths }),
    ...(selection.presets === undefined ? {} : { presets: selection.presets }),
    ...(selection.limits === undefined ? {} : { limits: selection.limits }),
  };
  if (selection.config === undefined && selection.inline === undefined) {
    if (selection.source !== undefined || selection.ref !== undefined || selection.repository !== undefined) fail('E_CONFIG_CONFLICT', 'A policy source selector requires config or inline policy.', 'config');
    return { policy: unwrap(compilePolicy({ version: 1 }, options)) };
  }
  if (source === 'workspace') {
    const policy = selection.inline === undefined
      ? await loadLocalPolicy(selection.config, cwd, options, selection.workspaceRoot)
      : await compilePolicyText(selection.inline, 'inline:policy', options, path => {
        const input = { maximum: selection.limits?.configBytes ?? DEFAULT_LIMITS.configBytes, preserveBom: true };
        return selection.workspaceRoot === undefined ? readUtf8(resolve(cwd, path), input) : readWorkspaceUtf8(resolve(cwd, path), selection.workspaceRoot, input);
      });
    return { policy };
  }
  const repository = selection.repository ?? target.repository;
  const ref = source === 'pinned' ? githubSha(selection.ref, 'policy ref')
    : target.pullRequest === undefined ? await defaultBranchCommit(client, target.repository)
    : (await readPullSnapshot(client, { repository: target.repository, pullRequest: target.pullRequest })).base;
  const path = selection.config ?? '.diffdevil.yml';
  const policy = selection.inline === undefined
    ? unwrap(await loadGitHubPolicy(client, { repository, ref, path }, options))
    : await compilePolicyText(selection.inline, 'inline:policy', options, relative => {
      if (relative.startsWith('/') || relative.includes('\\') || /^[A-Za-z][A-Za-z0-9+.-]*:/u.test(relative)) fail('E_POLICY_SOURCE', 'Template file must be repository-relative.', 'config');
      return readGitHubText(client, { repository, ref, path: validatePath(posix.normalize(relative)) }, selection.limits?.configBytes);
    });
  return { policy, ...(source === 'base' && target.pullRequest !== undefined ? { expectedPolicyBase: ref } : {}),
    ...(source === 'base' && target.pullRequest === undefined ? { assertCurrent: async () => {
      if (await defaultBranchCommit(client, target.repository) !== ref) fail('E_POLICY_STALE', 'Repository base moved after policy acquisition. Reload policy before definition synchronization.', 'apply');
    } } : {}) };
}
