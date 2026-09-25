// SPDX-License-Identifier: AGPL-3.0-only
import type { BrowserComparison, BrowserInput } from '@wolfsblvt/diffdevil/browser';
import { request, type Lookup, type Packet, type PolicySource, type PublicPull } from '../shared/protocol.js';
import { boundedText, ExtensionError, safePath } from '../shared/errors.js';
import { blobText, embeddedFiles, pageComparison, sameComparison, unpatchedPaths, withEntries, type Route } from './github.js';
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
/** A fresh read of the same PR route must name the same base, head and file count. */
async function confirm(current: Route, comparison: BrowserComparison, path: string, signal: AbortSignal): Promise<BrowserComparison> {
  const fresh = await html(path, signal); const observed = pageComparison(fresh.document, current);
  if (!fresh.response.ok || new URL(fresh.response.url).pathname !== path || !observed) throw new ExtensionError('COMPARISON_MOVED', 'GitHub did not confirm this pull request’s base, head and file count.');
  if (!sameComparison(comparison, observed) || comparison.changedFiles !== undefined && observed.changedFiles !== undefined && comparison.changedFiles !== observed.changedFiles) throw Object.assign(new ExtensionError('COMPARISON_MOVED', 'GitHub did not confirm the same base, head and file count.'), { observed });
  return observed;
}
/** The signed-in diff route is a cross-origin redirect without CORS from a page context; it is attempted, never relied on. */
async function unifiedDiff(current: Route, comparison: BrowserComparison, signal: AbortSignal): Promise<BrowserInput> {
  const response = await fetch(`${current.path}.diff`, { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.any([signal, AbortSignal.timeout(30_000)]), headers: { Accept: 'text/plain' } });
  if (!response.ok || !['https://github.com', 'https://patch-diff.githubusercontent.com'].includes(new URL(response.url).origin) || /text\/html/iu.test(response.headers.get('Content-Type') ?? '')) throw new ExtensionError('DIFF_UNAVAILABLE', 'The GitHub diff route did not return source material.');
  const text = await boundedText(response, LIMIT);
  if (text.trim() && !text.startsWith('diff --git ')) throw new ExtensionError('DIFF_FORMAT', 'The provider response is not a unified diff.');
  return { comparison, format: 'diff', text, complete: true };
}
/**
 * The same-origin route GitHub's own /changes page uses for the diff content it
 * did not embed. The signed-in reader's cookies go with it, so it covers private
 * pull requests without a token or any new permission. Batched like the page
 * itself; entries GitHub declines (too big, binary, submodule, truncated) stay
 * bounded. Any refusal fails the whole load; the caller keeps its evidence.
 */
const ENTRY_BATCH = 8; const ENTRY_CONCURRENCY = 3; const ENTRY_HEADERS = { 'GitHub-Verified-Fetch': 'true', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' };
async function loadDiffEntries(current: Route, comparison: BrowserComparison, paths: readonly string[], signal: AbortSignal): Promise<unknown[]> {
  const batches: string[][] = []; for (let index = 0; index < paths.length; index += ENTRY_BATCH) batches.push(paths.slice(index, index + ENTRY_BATCH));
  const entries: unknown[] = []; let next = 0;
  const worker = async (): Promise<void> => {
    for (let batch = batches[next++]; batch; batch = batches[next++]) {
      const url = `${current.path}/page_data/diff_entries?paths=${batch.map(encodeURIComponent).join(',')}&w=0&range=${comparison.head}`;
      const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.any([signal, AbortSignal.timeout(20_000)]), headers: ENTRY_HEADERS });
      if (new URL(response.url).origin !== 'https://github.com' || !response.ok || !/application\/json/iu.test(response.headers.get('Content-Type') ?? '')) throw new ExtensionError('DIFF_ENTRIES', `GitHub’s diff entries route answered HTTP ${response.status}.`);
      const value: unknown = JSON.parse(await boundedText(response, LIMIT));
      if (!Array.isArray(value)) throw new ExtensionError('DIFF_ENTRIES', 'GitHub’s diff entries route did not return a list.');
      entries.push(...value);
    }
  };
  await Promise.all(Array.from({ length: Math.min(ENTRY_CONCURRENCY, batches.length) }, worker));
  return entries;
}
export interface Acquired {
  readonly packet: Packet; readonly settings: Lookup['settings'];
  /** Present when the result came straight from the worker's cache: checks the page's comparison against a fresh read of the same route. */
  readonly verify?: () => Promise<{ moved: false } | { moved: true; observed?: BrowserComparison }>;
}
export interface AcquireOptions { /** A comparison already confirmed by a fresh same-route read; skips the pre-policy confirmation. */ readonly confirmed?: BrowserComparison }
/** Reads source through the signed-in page; all analysis runs in the extension worker. */
export async function acquire(current: Route, document: Document, signal: AbortSignal, options: AcquireOptions = {}): Promise<Acquired> {
  let comparison = options.confirmed ?? pageComparison(document, current); let publicResult: PublicPull | undefined;
  // The embedded /changes payload has no independent PR number. A fresh read
  // of that exact route binds its base and head to the requested PR before
  // either value can select trusted-base policy or cached analysis.
  const changes = Boolean(document.querySelector('script[data-target="react-app.embeddedData"]'));
  const confirmationPath = changes ? `${current.path}/changes` : current.path;
  // A cached report exists only for a comparison that was confirmed for this PR
  // before: reattach from it at once and confirm freshness in the background.
  if (comparison && !options.confirmed) {
    const cached = await request<Lookup>({ type: 'cache.lookup', comparison }); if (signal.aborted) throw signal.reason;
    if (cached.reportCached && (cached.selected.mode === 'personal-only' || cached.policy)) {
      const policy: PolicySource = cached.selected.mode === 'personal-only' ? { status: 'unavailable', at: Date.now() } : cached.policy!;
      const selected = { ...cached.selected, ...(policy.status === 'present' ? { repository: policy.text! } : {}) };
      const templates = await request<string[]>({ type: 'policy.templates', layers: selected });
      if (!templates.length) {
        const bound = comparison; const packet = await request<Packet>({ type: 'analysis.run', input: { comparison: bound, policy } });
        if (signal.aborted) throw signal.reason;
        return { packet, settings: cached.settings, verify: async () => {
          try { await confirm(current, bound, confirmationPath, signal); return { moved: false }; }
          catch (error) { if (signal.aborted) throw error; const observed = (error as { observed?: BrowserComparison }).observed; return { moved: true, ...(observed ? { observed } : {}) }; }
        } };
      }
    }
  }
  if (comparison && changes && !options.confirmed) await confirm(current, comparison, confirmationPath, signal);
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
      try { acquisition = await unifiedDiff(current, comparison, signal); }
      catch (error) {
        if (signal.aborted) throw error;
        // Signed-in route: the page's own summaries and embedded contents. A file
        // without embedded content stays bounded; that is honest, not a failure.
        let embedded = changes && !options.confirmed ? embeddedFiles(document) : undefined;
        if (embedded) {
          // Files GitHub did not embed are loaded through the page's own route and
          // measured exactly; only what GitHub itself declines stays bounded.
          const pending = unpatchedPaths(embedded.files); let loaded = 0; let declined = 0; let routeError: string | undefined;
          if (pending.length) {
            try { const merged = withEntries(embedded.files, await loadDiffEntries(current, comparison, pending, signal)); embedded = { ...embedded, files: merged.files, patched: embedded.patched + merged.loaded }; loaded = merged.loaded; declined = merged.declined; }
            catch (routeFailure) { if (signal.aborted) throw routeFailure; routeError = (routeFailure as { code?: string }).code ?? 'DIFF_ENTRIES'; }
          }
          console.info('[diffdevil] signed-in acquisition', { files: embedded.files.length, embedded: embedded.patched - loaded, loaded, declined, bounded: embedded.files.length - embedded.patched, ...(routeError ? { routeError } : {}) });
          acquisition = { comparison, format: 'github-files', files: embedded.files, complete: embedded.complete && embedded.files.length === (comparison.changedFiles ?? embedded.files.length) };
        }
        if (!embedded || embedded.patched < embedded.files.length) {
          // The anonymous API can complete a public comparison; a private one
          // keeps the signed-in evidence it already has.
          try {
            const result = await request<PublicPull>({ type: 'source.public', repository: current.repository, pullRequest: current.pullRequest, files: true });
            if (!sameComparison(comparison, result.comparison)) throw new ExtensionError('COMPARISON_MOVED', 'The pull request changed during acquisition. Refresh the comparison.');
            publicResult = result; comparison = result.comparison;
            acquisition = { comparison, format: 'github-files', files: result.files ?? [], complete: result.files?.length === comparison.changedFiles };
          } catch (fallback) { if (signal.aborted || !acquisition) throw fallback; }
        }
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
  if (!publicResult) await confirm(current, comparison, confirmationPath, signal);
  else {
    const after = await request<PublicPull>({ type: 'source.public', repository: current.repository, pullRequest: current.pullRequest });
    if (!sameComparison(comparison, after.comparison) || comparison.changedFiles !== after.comparison.changedFiles) throw new ExtensionError('COMPARISON_MOVED', 'The comparison changed while policy was acquired.');
  }
  if (signal.aborted) throw signal.reason;
  const packet = await request<Packet>({ type: 'analysis.run', input: { comparison, ...(acquisition ? { acquisition } : {}), policy, ...(templates.length ? { templates: sources } : {}) } });
  if (signal.aborted) throw signal.reason; return { packet, settings: lookup.settings };
}
