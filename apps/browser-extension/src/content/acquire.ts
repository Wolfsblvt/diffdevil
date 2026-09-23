// SPDX-License-Identifier: AGPL-3.0-only
import type { BrowserComparison, BrowserInput } from '@wolfsblvt/diffdevil/browser';
import { request, type Lookup, type Packet, type PolicySource, type PublicPull } from '../shared/protocol.js';
import { boundedText, ExtensionError, safePath } from '../shared/errors.js';
import { blobText, pageComparison, sameComparison, type Route } from './github.js';
const LIMIT = 8 * 1024 * 1024;
async function html(path: string, signal: AbortSignal): Promise<{ response: Response; document: Document }> {
  const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.any([signal, AbortSignal.timeout(20_000)]), headers: { Accept: 'text/html' } });
  const url = new URL(response.url);
  if (url.origin !== 'https://github.com' || /^\/(?:login|session|sessions)(?:\/|$)/u.test(url.pathname)) throw new ExtensionError('SIGNED_IN_UNAVAILABLE', 'The signed-in GitHub page is unavailable.');
  if (!response.ok && response.status !== 404) throw new ExtensionError('GITHUB_HTTP', `GitHub returned HTTP ${response.status}.`);
  return { response, document: new DOMParser().parseFromString(await boundedText(response, LIMIT), 'text/html') };
}
async function policyFile(comparison: BrowserComparison, path: string, signal: AbortSignal, publicAccess: boolean): Promise<PolicySource> {
  try {
    const result = await html(`/${comparison.repository}/blob/${comparison.base}/${safePath(path)}`, signal);
    if (result.response.status === 404) {
      const base = await html(`/${comparison.repository}/commit/${comparison.base}`, signal);
      if (!base.response.ok) throw new ExtensionError('BASE_ACCESS', 'Access to the exact trusted base could not be confirmed.');
      return { status: 'absent', at: Date.now() };
    }
    const text = blobText(result.document);
    if (text === undefined || new TextEncoder().encode(text).byteLength > 256 * 1024) throw new ExtensionError('POLICY_BODY', 'GitHub did not expose complete policy text.');
    return { status: 'present', text, at: Date.now() };
  } catch (error) {
    if (signal.aborted || !publicAccess) throw error;
    return request<PolicySource>({ type: 'source.policy', repository: comparison.repository, base: comparison.base, path });
  }
}
/** Reads source through the signed-in page; all analysis runs in the extension worker. */
export async function acquire(current: Route, document: Document, signal: AbortSignal): Promise<{ packet: Packet; settings: Lookup['settings'] }> {
  let comparison = pageComparison(document, current); let publicResult: PublicPull | undefined;
  if (!comparison) {
    try { const refreshed = await html(current.path, signal); if (refreshed.response.ok) comparison = pageComparison(refreshed.document, current); }
    catch (error) { if (signal.aborted) throw error; }
  }
  if (!comparison) {
    publicResult = await request<PublicPull>({ type: 'source.public', repository: current.repository, pullRequest: current.pullRequest, files: true }); comparison = publicResult.comparison;
  }
  const lookup = await request<Lookup>({ type: 'cache.lookup', comparison }); if (signal.aborted) throw signal.reason;
  let acquisition: BrowserInput | undefined;
  if (!lookup.reportCached) {
    if (publicResult?.files) acquisition = { comparison, format: 'github-files', files: publicResult.files, complete: publicResult.files.length === comparison.changedFiles };
    else {
      try {
        const response = await fetch(`${current.path}.diff`, { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.any([signal, AbortSignal.timeout(30_000)]), headers: { Accept: 'text/plain' } });
        if (!response.ok || !['https://github.com', 'https://patch-diff.githubusercontent.com'].includes(new URL(response.url).origin) || /text\/html/iu.test(response.headers.get('Content-Type') ?? '')) throw new ExtensionError('DIFF_UNAVAILABLE', 'The GitHub diff route did not return source material.');
        const text = await boundedText(response, LIMIT);
        if (text.trim() && !text.startsWith('diff --git ')) throw new ExtensionError('DIFF_FORMAT', 'The provider response is not a unified diff.');
        acquisition = { comparison, format: 'diff', text, complete: true };
      } catch (error) {
        if (signal.aborted) throw error;
        publicResult = await request<PublicPull>({ type: 'source.public', repository: current.repository, pullRequest: current.pullRequest, files: true });
        if (!sameComparison(comparison, publicResult.comparison)) throw new ExtensionError('COMPARISON_MOVED', 'The pull request changed during acquisition. Refresh the comparison.');
        comparison = publicResult.comparison;
        acquisition = { comparison, format: 'github-files', files: publicResult.files ?? [], complete: publicResult.files?.length === comparison.changedFiles };
      }
    }
  }
  let policy: PolicySource = { status: 'unavailable', at: Date.now() };
  if (lookup.selected.mode !== 'personal-only') {
    try { policy = lookup.policy ?? await policyFile(comparison, '.diffdevil.yml', signal, Boolean(publicResult)); }
    catch (error) { if (signal.aborted) throw error; }
  }
  const selected = { ...lookup.selected, ...(policy.status === 'present' ? { repository: policy.text! } : {}) };
  const templates = await request<string[]>({ type: 'policy.templates', layers: selected }); const sources: Record<string, string> = Object.create(null) as Record<string, string>;
  for (const path of templates) {
    try { const value = await policyFile(comparison, path, signal, Boolean(publicResult)); if (value.status === 'present' && value.text !== undefined) sources[path] = value.text; }
    catch (error) { if (signal.aborted) throw error; } // The compiler reports missing trusted template text.
  }
  if (!publicResult) {
    const after = await html(current.path, signal); const observed = pageComparison(after.document, current);
    if (!after.response.ok || !observed || !sameComparison(comparison, observed) || comparison.changedFiles !== undefined && observed.changedFiles !== undefined && comparison.changedFiles !== observed.changedFiles) throw new ExtensionError('COMPARISON_MOVED', 'GitHub did not confirm the same base, head and file count after acquisition.');
  } else {
    const after = await request<PublicPull>({ type: 'source.public', repository: current.repository, pullRequest: current.pullRequest });
    if (!sameComparison(comparison, after.comparison) || comparison.changedFiles !== after.comparison.changedFiles) throw new ExtensionError('COMPARISON_MOVED', 'The comparison changed while policy was acquired.');
  }
  if (signal.aborted) throw signal.reason;
  const packet = await request<Packet>({ type: 'analysis.run', input: { comparison, ...(acquisition ? { acquisition } : {}), policy, ...(templates.length ? { templates: sources } : {}) } });
  if (signal.aborted) throw signal.reason; return { packet, settings: lookup.settings };
}
