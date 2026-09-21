// SPDX-License-Identifier: AGPL-3.0-only
import { readComparison, type BrowserComparison } from '@wolfsblvt/diffdevil/browser';
import { repositoryKey } from '../shared/settings.js';
import { boundedText, ExtensionError, object, safePath } from '../shared/errors.js';
import type { PolicySource, PublicPull } from '../shared/protocol.js';
const API = 'https://api.github.com';
const safeInteger = (value: unknown): number => { if (!Number.isSafeInteger(value) || Number(value) < 0) throw new ExtensionError('PROVIDER_COUNTER', 'GitHub did not return valid comparison counters.'); return Number(value); };
export class PublicSource {
  constructor(private readonly fetcher: typeof fetch = fetch) {}
  private async get(path: string, maximum: number): Promise<{ response: Response; value: unknown }> {
    const response = await this.fetcher(`${API}${path}`, { credentials: 'omit', cache: 'no-store', redirect: 'error', headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }, signal: AbortSignal.timeout(20_000) });
    if (response.status === 403 || response.status === 429) throw new ExtensionError('GITHUB_RATE_LIMIT', 'GitHub declined the public API request. No token is collected; retry after the provider limit resets.');
    if (!response.ok && response.status !== 404) throw new ExtensionError('GITHUB_HTTP', `GitHub returned HTTP ${response.status}.`);
    const text = await boundedText(response, maximum); return { response, value: text ? JSON.parse(text) as unknown : null };
  }
  async pull(repository: string, pullRequest: number, includeFiles = false): Promise<PublicPull> {
    const repo = repositoryKey(repository); if (!Number.isSafeInteger(pullRequest) || pullRequest < 1) throw new ExtensionError('PR_IDENTITY', 'Invalid pull-request number.');
    const path = `/repos/${repo}/pulls/${pullRequest}`;
    const snapshot = async (): Promise<BrowserComparison> => {
      const result = await this.get(path, 1024 * 1024);
      if (result.response.status === 404) throw new ExtensionError('PUBLIC_UNAVAILABLE', 'This pull request is not publicly accessible. Its signed-in GitHub route is required.');
      const value = object(result.value); const base = object(value.base); const head = object(value.head);
      if (value.number !== pullRequest || repositoryKey(String(object(base.repo).full_name)) !== repo) throw new ExtensionError('PR_IDENTITY', 'GitHub returned a different pull request.');
      return readComparison({ host: 'github.com', repository, pullRequest, base: base.sha, head: head.sha, changedFiles: safeInteger(value.changed_files), additions: safeInteger(value.additions), deletions: safeInteger(value.deletions) });
    };
    const before = await snapshot(); if (!includeFiles) return { comparison: before };
    const files: unknown[] = []; let acquiredBytes = 0;
    for (let page = 1; files.length < Math.min(before.changedFiles ?? 0, 3000); page++) {
      const result = await this.get(`${path}/files?per_page=100&page=${page}`, 6 * 1024 * 1024);
      if (!result.response.ok || !Array.isArray(result.value)) throw new ExtensionError('PROVIDER_FILES', 'GitHub did not return the file collection.');
      acquiredBytes += new TextEncoder().encode(JSON.stringify(result.value)).byteLength;
      if (acquiredBytes > 20 * 1024 * 1024) throw new ExtensionError('SOURCE_LIMIT', 'The provider file collection exceeds 20 MiB.');
      files.push(...result.value); if (result.value.length < 100) break;
    }
    const after = await snapshot(); if (JSON.stringify(before) !== JSON.stringify(after)) throw new ExtensionError('COMPARISON_MOVED', 'The pull-request comparison changed during acquisition. Refresh the new comparison.');
    return { comparison: after, files };
  }
  async policy(repository: string, base: string, path: string): Promise<PolicySource> {
    const repo = repositoryKey(repository); if (!/^[\da-f]{40}$/u.test(base)) throw new ExtensionError('BASE_IDENTITY', 'A complete immutable base SHA is required.');
    const result = await this.get(`/repos/${repo}/contents/${safePath(path)}?ref=${base}`, 512 * 1024);
    if (result.response.status === 404) {
      const commit = await this.get(`/repos/${repo}/git/commits/${base}`, 1024 * 1024);
      if (!commit.response.ok || object(commit.value).sha !== base) throw new ExtensionError('POLICY_ACCESS', 'Access to the exact base could not be confirmed. A 404 is not proof of absent private policy.');
      return { status: 'absent', at: Date.now() };
    }
    const value = object(result.value); if (value.type !== 'file' || value.encoding !== 'base64' || typeof value.content !== 'string' || typeof value.sha !== 'string' || !/^[a-f0-9]{40}$/u.test(value.sha)) throw new ExtensionError('POLICY_BODY', 'GitHub did not return complete policy text.');
    const data = Uint8Array.from(atob(value.content.replace(/\s/gu, '')), char => char.charCodeAt(0));
    if (data.length > 256 * 1024) throw new ExtensionError('POLICY_LIMIT', 'Policy exceeds 256 KiB.');
    return { status: 'present', text: new TextDecoder('utf-8', { fatal: true }).decode(data), blob: value.sha, at: Date.now() };
  }
}
