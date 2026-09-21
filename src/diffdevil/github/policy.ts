import { posix } from 'node:path';
import { captureAsync, fail, unwrap } from '../errors.js';
import { DEFAULT_LIMITS } from '../limits.js';
import { validatePath } from '../paths.js';
import { type CompiledPolicy, type PolicyCompileOptions } from '../policy/compile.js';
import { compilePolicyText } from '../hosts/policy.js';
import type { Result } from '../model.js';
import { GitHubClient } from './client.js';
import { githubInteger, githubRecord, githubSha, githubString, repositoryPath } from './values.js';

export interface GitHubPolicySource { readonly repository: string; readonly ref: string; readonly path: string }
/** Read only a regular file at an immutable trusted commit; never follow a content URL or symlink. */
export async function readGitHubText(client: GitHubClient, source: GitHubPolicySource, maximum = DEFAULT_LIMITS.configBytes): Promise<string> {
  const ref = githubSha(source.ref, 'policy ref'), path = validatePath(source.path);
  const route = `${repositoryPath(source.repository)}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(ref)}`;
  const file = githubRecord(await client.json(route), 'repository content');
  if (file.type !== 'file' || file.submodule_git_url || file.target || file.encoding !== 'base64') fail('E_POLICY_SOURCE', 'Policy and templates must be regular UTF-8 files with base64 content, not links, submodules or directories.', 'config');
  const size = githubInteger(file.size, 'content size');
  if (size > maximum) fail('E_LIMIT', 'Trusted policy content exceeds the selected size limit.', 'config');
  const encoded = githubString(file.content, 'content').replace(/[\r\n]/gu, '');
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(encoded)) fail('E_POLICY_SOURCE', 'GitHub policy content is not valid base64.', 'config');
  const bytes = Buffer.from(encoded, 'base64');
  if (bytes.byteLength !== size || bytes.toString('base64') !== encoded) fail('E_POLICY_SOURCE', 'GitHub policy content does not match its declared encoding or byte length.', 'config');
  let text: string;
  try { text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes); }
  catch { fail('E_POLICY_SOURCE', 'GitHub policy content is not valid UTF-8.', 'config'); }
  return text;
}
/** The host selects this trusted base/pinned source. The PR head never supplies apply policy implicitly. */
export async function readGitHubPolicy(client: GitHubClient, source: GitHubPolicySource, options: Pick<PolicyCompileOptions, 'presets' | 'paths' | 'limits'> = {}): Promise<CompiledPolicy> {
  const maximum = options.limits?.configBytes ?? DEFAULT_LIMITS.configBytes;
  const text = await readGitHubText(client, source, maximum);
  const name = `github:${source.repository}@${source.ref}:${source.path}`;
  return compilePolicyText(text, name, options, relative => {
    if (relative.startsWith('/') || relative.includes('\\') || /^[A-Za-z][A-Za-z0-9+.-]*:/u.test(relative)) fail('E_POLICY_SOURCE', 'Template file must be a repository-relative path.', 'config');
    const path = validatePath(posix.normalize(posix.join(posix.dirname(source.path), relative)));
    return readGitHubText(client, { ...source, path }, maximum);
  });
}
/** Preserve the Result-shaped API for callers that do not need transport-specific handling. */
export function loadGitHubPolicy(client: GitHubClient, source: GitHubPolicySource, options: Pick<PolicyCompileOptions, 'presets' | 'paths' | 'limits'> = {}): Promise<Result<CompiledPolicy>> {
  return captureAsync(() => readGitHubPolicy(client, source, options));
}
