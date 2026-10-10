// SPDX-License-Identifier: AGPL-3.0-only
import type { BrowserComparison, BrowserInput } from '@wolfsblvt/diffdevil/browser';
import { request, type AcquisitionCoverage, type Lookup, type Packet, type PolicySource, type PublicPull } from '../shared/protocol.js';
import { boundedText, ExtensionError, safePath } from '../shared/errors.js';
import { DEFAULT_FILE_LIMIT, FILE_LIMIT, selectFiles, type DeclineReason } from '../shared/coverage.js';
import { blobText, embeddedFiles, pageComparison, sameComparison, unpatchedPaths, visiblePaths, withEntries, type Route } from './github.js';
const LIMIT = 8 * 1024 * 1024;
/** The configured automatic limit, or the default when the setting is absent or unusable. */
export const automaticLimit = (settings: Readonly<Record<string, unknown>>): number => { const value = settings['analysis.maximumFiles']; return Number.isSafeInteger(value) && Number(value) >= FILE_LIMIT.minimum && Number(value) <= FILE_LIMIT.maximum ? Number(value) : DEFAULT_FILE_LIMIT; };
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
/** A fresh read of a pull-request route binds its base and head to the requested pull request. */
async function readRoute(current: Route, path: string, signal: AbortSignal): Promise<{ observed: BrowserComparison; document: Document }> {
  const fresh = await html(path, signal); const observed = pageComparison(fresh.document, current);
  if (!fresh.response.ok || new URL(fresh.response.url).pathname !== path || !observed) throw new ExtensionError('COMPARISON_MOVED', 'GitHub did not confirm this pull request’s base, head and file count.');
  return { observed, document: fresh.document };
}
/** The fresh read must name the same base, head and file count. */
function assertSame(comparison: BrowserComparison, observed: BrowserComparison): void {
  if (!sameComparison(comparison, observed) || comparison.changedFiles !== undefined && observed.changedFiles !== undefined && comparison.changedFiles !== observed.changedFiles) throw Object.assign(new ExtensionError('COMPARISON_MOVED', 'GitHub did not confirm the same base, head and file count.'), { observed });
}
async function confirm(current: Route, comparison: BrowserComparison, path: string, signal: AbortSignal): Promise<BrowserComparison> {
  const { observed } = await readRoute(current, path, signal); assertSame(comparison, observed); return observed;
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
 * itself; empty `isTooBig` entries from a multi-path request are retried alone
 * because that flag can describe the batch response budget. A failed retry
 * leaves only that file bounded; a failed batch request leaves the caller's
 * existing evidence intact.
 */
const ENTRY_BATCH = 8; const ENTRY_CONCURRENCY = 3; const ENTRY_HEADERS = { 'GitHub-Verified-Fetch': 'true', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' };
export async function loadDiffEntries(current: Route, comparison: BrowserComparison, paths: readonly string[], signal: AbortSignal): Promise<{ entries: unknown[]; retryFailures: number; retryFailureCodes: string[] }> {
  const batches: string[][] = []; for (let index = 0; index < paths.length; index += ENTRY_BATCH) batches.push(paths.slice(index, index + ENTRY_BATCH));
  const entries: unknown[] = []; const retryFailureCodes = new Set<string>(); let retryFailures = 0; let next = 0;
  const fetchEntries = async (requested: readonly string[]): Promise<unknown[]> => {
    const url = `${current.path}/page_data/diff_entries?paths=${requested.map(encodeURIComponent).join(',')}&w=0&range=${comparison.head}`;
    const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.any([signal, AbortSignal.timeout(20_000)]), headers: ENTRY_HEADERS });
    if (new URL(response.url).origin !== 'https://github.com' || !response.ok || !/application\/json/iu.test(response.headers.get('Content-Type') ?? '')) throw new ExtensionError('DIFF_ENTRIES', `GitHub’s diff entries route answered HTTP ${response.status}.`);
    const value: unknown = JSON.parse(await boundedText(response, LIMIT));
    if (!Array.isArray(value)) throw new ExtensionError('DIFF_ENTRIES', 'GitHub’s diff entries route did not return a list.');
    return value;
  };
  const worker = async (): Promise<void> => {
    for (let batch = batches[next++]; batch; batch = batches[next++]) {
      const value = await fetchEntries(batch);
      if (batch.length === 1) { entries.push(...value); continue; }
      const requested = new Set(batch);
      const overflows = value.filter((item): item is Record<string, unknown> => {
        if (!item || typeof item !== 'object') return false;
        const entry = item as Record<string, unknown>;
        return entry.isTooBig === true && (!Array.isArray(entry.diffLines) || entry.diffLines.length === 0)
          && typeof entry.path === 'string' && requested.has(entry.path);
      });
      const retriedPaths = new Set(overflows.map(entry => String(entry.path)));
      entries.push(...value.filter(item => !overflows.includes(item as Record<string, unknown>)));
      for (const path of retriedPaths) {
        try { entries.push(...await fetchEntries([path])); }
        catch (error) {
          if (signal.aborted) throw error;
          retryFailures++;
          retryFailureCodes.add(error instanceof ExtensionError ? error.code : 'DIFF_ENTRIES');
        }
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(ENTRY_CONCURRENCY, batches.length) }, worker));
  return { entries, retryFailures, retryFailureCodes: [...retryFailureCodes] };
}
/** What a fresh read of the same route said about a comparison shown from the cache. */
export type Standing = { readonly standing: 'current' } | { readonly standing: 'moved'; readonly observed?: BrowserComparison } | { readonly standing: 'unconfirmed'; readonly code: string };
export interface Acquired {
  readonly packet: Packet; readonly settings: Lookup['settings'];
  /** Present when the result came straight from held facts: reads the same route fresh and says whether the comparison still stands. */
  readonly verify?: () => Promise<Standing>;
}
export interface AcquireOptions { /** A comparison already confirmed by a fresh same-route read; skips the pre-policy confirmation. */ readonly confirmed?: BrowserComparison }
const identity = (comparison: BrowserComparison): string => `${comparison.repository.toLowerCase()}#${comparison.pullRequest}@${comparison.base}...${comparison.head}`;
/**
 * One browser profile acquires a comparison once. A tab that finds another tab already at work waits
 * for it and then reads what it stored. Where the page has no usable lock manager the work simply runs.
 */
async function exclusive<T>(name: string, signal: AbortSignal, work: () => Promise<T>): Promise<T> {
  const locks = (globalThis.navigator as { locks?: { request<R>(name: string, options: { signal: AbortSignal }, callback: () => Promise<R>): Promise<R> } } | undefined)?.locks;
  if (!locks) return work();
  let started = false;
  try { return await locks.request(name, { signal }, async () => { started = true; return work(); }); }
  catch (error) { if (started || signal.aborted) throw error; return work(); }
}
/** Provider-shaped files with patches kept only for the chosen paths: the automatic limit applied to a list that arrived whole. */
function bound(files: readonly unknown[], limit: number, visible: readonly string[]): { files: unknown[]; coverage: AcquisitionCoverage } {
  const records = files.map(file => file as Record<string, unknown>); const declined: Record<string, DeclineReason> = Object.create(null) as Record<string, DeclineReason>;
  const withheld = new Set<string>(); for (const file of records) if (file.patch === undefined && Number(file.additions ?? 0) + Number(file.deletions ?? 0) > 0) { declined[String(file.filename)] = 'omitted'; withheld.add(String(file.filename)); }
  const chosen = new Set(selectFiles(records.map(file => String(file.filename)), visible, limit, withheld));
  return { files: records.map(file => chosen.has(String(file.filename)) || file.patch === undefined ? file : (({ patch: _patch, ...rest }) => rest)(file)), coverage: { limit, declined } };
}
/** Reads source through the signed-in page; all analysis runs in the extension worker. */
export async function acquire(current: Route, document: Document, signal: AbortSignal, options: AcquireOptions = {}): Promise<Acquired> {
  let comparison = options.confirmed ?? pageComparison(document, current); let publicResult: PublicPull | undefined;
  // The embedded /changes payload has no independent PR number. A fresh read
  // of that exact route binds its base and head to the requested PR before
  // either value can select trusted-base policy or cached analysis.
  let changes = Boolean(document.querySelector('script[data-target="react-app.embeddedData"]'));
  const changesPath = `${current.path}/changes`; const confirmationPath = changes ? changesPath : current.path;
  // After a soft navigation the tab's document can still be another route's
  // payload; file evidence comes from the fresh read that bound the comparison.
  let sourceDocument = document;
  // Held facts exist only for a comparison that was confirmed for this PR before: reattach from them
  // at once and confirm freshness in the background. A page that cannot name its comparison, such as
  // a private Conversation tab, is offered the last one confirmed for the pull request.
  if (!options.confirmed) {
    let held = comparison; let remembered = false;
    if (!held) {
      try { held = (await request<{ comparison?: BrowserComparison }>({ type: 'cache.recent', repository: current.repository, pullRequest: current.pullRequest })).comparison; remembered = held !== undefined; }
      catch (error) { if (signal.aborted) throw error; }
    }
    if (held) {
      const lookup = await request<Lookup>({ type: 'cache.lookup', comparison: held }); if (signal.aborted) throw signal.reason;
      if (lookup.paused) throw new ExtensionError('REPOSITORY_PAUSED', 'diffdevil is paused for this repository.');
      if (lookup.reportCached && (lookup.selected.mode === 'personal-only' || lookup.policy)) {
        const policy: PolicySource = lookup.selected.mode === 'personal-only' ? { status: 'unavailable', at: Date.now() } : lookup.policy!;
        const selected = { ...lookup.selected, ...(policy.status === 'present' ? { repository: policy.text! } : {}) };
        const templates = await request<string[]>({ type: 'policy.templates', layers: selected });
        if (templates.every(path => lookup.templatePaths?.includes(path))) {
          const bound = held; const packet = await request<Packet>({ type: 'analysis.run', input: { comparison: bound, policy } });
          if (signal.aborted) throw signal.reason; const path = remembered || changes ? changesPath : confirmationPath;
          return { packet, settings: lookup.settings, verify: async (): Promise<Standing> => {
            try { await confirm(current, bound, path, signal); return { standing: 'current' }; }
            catch (error) { if (signal.aborted) throw error; const observed = (error as { observed?: BrowserComparison }).observed; return observed ? { standing: 'moved', observed } : { standing: 'unconfirmed', code: (error as { code?: string }).code ?? 'UNREACHABLE' }; }
          } };
        }
      }
    }
  }
  if (comparison && changes) {
    const fresh = await readRoute(current, changesPath, signal); assertSame(comparison, fresh.observed);
    comparison = fresh.observed; sourceDocument = fresh.document;
  }
  if (!comparison) {
    try { const refreshed = await html(current.path, signal); if (refreshed.response.ok) comparison = pageComparison(refreshed.document, current); }
    catch (error) { if (signal.aborted) throw error; }
  }
  if (!comparison) {
    try { publicResult = await request<PublicPull>({ type: 'source.public', repository: current.repository, pullRequest: current.pullRequest, files: true, optionalFallback: true }); comparison = publicResult.comparison; }
    catch (error) {
      if (signal.aborted) throw error;
      // A private pull request has no anonymous route and its Conversation page
      // carries no comparison, so the signed-in /changes page is its source from
      // every tab of the pull request. The public failure stays the diagnostic.
      try { const fresh = await readRoute(current, changesPath, signal); comparison = fresh.observed; sourceDocument = fresh.document; changes = true; }
      catch (signedIn) {
        if (signal.aborted) throw signedIn;
        console.info('[diffdevil] signed-in source unavailable', { code: (signedIn as { code?: string }).code ?? 'SIGNED_IN_UNAVAILABLE' }); throw error;
      }
    }
  }
  const resolved = comparison; const source = sourceDocument; const known = publicResult;
  return exclusive(`diffdevil:acquire:${identity(resolved)}`, signal, async () => {
    // Another tab may have stored this comparison while this one waited for the lock.
    const lookup = await request<Lookup>({ type: 'cache.lookup', comparison: resolved }); if (signal.aborted) throw signal.reason;
    if (lookup.paused) throw new ExtensionError('REPOSITORY_PAUSED', 'diffdevil is paused for this repository.');
    const limit = automaticLimit(lookup.settings); let acquisition: BrowserInput | undefined; let coverage: AcquisitionCoverage | undefined; let provider = known;
    if (!lookup.reportCached) {
      const visible = visiblePaths(document);
      const fromProvider = (result: PublicPull): BrowserInput => {
        const limited = bound(result.files ?? [], limit, visible); coverage = limited.coverage;
        return { comparison: result.comparison, format: 'github-files', files: limited.files, complete: result.files?.length === result.comparison.changedFiles };
      };
      if (provider?.files) acquisition = fromProvider(provider);
      else {
        try { acquisition = await unifiedDiff(current, resolved, signal); }
        catch (error) {
          if (signal.aborted) throw error;
          // Signed-in route: the page's own summaries and embedded contents. The automatic limit chooses
          // which files are measured now; a file without content stays bounded, and that is honest.
          let embedded = changes ? embeddedFiles(source) : undefined; let routeError: string | undefined;
          if (embedded) {
            const declined: Record<string, DeclineReason> = { ...embedded.declined };
            const order = embedded.files.map(file => String(file.filename)); const chosen = new Set(selectFiles(order, visiblePaths(document), limit, new Set(Object.keys(declined))));
            let files = embedded.files.map(file => chosen.has(String(file.filename)) || file.patch === undefined ? file : (({ patch: _patch, ...rest }) => rest)(file));
            const pending = unpatchedPaths(files).filter(path => chosen.has(path)); let loaded = 0; let declinedNow = 0; let retryFailures = 0; let retryFailureCodes: string[] = [];
            if (pending.length) {
              try {
                const result = await loadDiffEntries(current, resolved, pending, signal);
                const merged = withEntries(files, result.entries);
                files = merged.files; loaded = merged.loaded; declinedNow = merged.declined; Object.assign(declined, merged.declinedPaths); retryFailures = result.retryFailures; retryFailureCodes = result.retryFailureCodes;
              }
              catch (routeFailure) { if (signal.aborted) throw routeFailure; routeError = (routeFailure as { code?: string }).code ?? 'DIFF_ENTRIES'; }
            }
            const patched = files.filter(file => file.patch !== undefined).length;
            embedded = { ...embedded, files, patched, declined };
            console.info('[diffdevil] signed-in acquisition', { files: files.length, limit, chosen: chosen.size, embedded: patched - loaded, loaded, declined: declinedNow, bounded: files.length - patched, ...(retryFailures ? { retryFailures, retryFailureCodes } : {}), ...(routeError ? { routeError } : {}) });
            coverage = { limit, declined };
            acquisition = { comparison: resolved, format: 'github-files', files, complete: embedded.complete && files.length === (resolved.changedFiles ?? files.length) };
          }
          // The anonymous API completes a public comparison when the signed-in route could not; a private
          // one keeps the signed-in evidence it already has. Files left bounded by the limit never reach it.
          if (!embedded || routeError) {
            try {
              const result = await request<PublicPull>({ type: 'source.public', repository: current.repository, pullRequest: current.pullRequest, files: true, ...(acquisition ? { optionalFallback: true } : {}) });
              if (!sameComparison(resolved, result.comparison)) throw new ExtensionError('COMPARISON_MOVED', 'The pull request changed during acquisition. Refresh the comparison.');
              provider = result; acquisition = fromProvider(result);
            } catch (fallback) { if (signal.aborted || !acquisition) throw fallback; }
          }
        }
      }
    }
    const comparisonNow = provider?.comparison ?? resolved; let policy: PolicySource = { status: 'unavailable', at: Date.now() };
    if (lookup.selected.mode !== 'personal-only') {
      try { policy = lookup.policy ?? await policyFile(comparisonNow, '.diffdevil.yml', signal, Boolean(provider)); }
      catch (error) { if (signal.aborted) throw error; }
    }
    const selected = { ...lookup.selected, ...(policy.status === 'present' ? { repository: policy.text! } : {}) };
    const templates = await request<string[]>({ type: 'policy.templates', layers: selected }); const sources: Record<string, string> = Object.create(null) as Record<string, string>; const absentTemplates: string[] = [];
    for (const path of templates) {
      if (lookup.templatePaths?.includes(path)) continue; // trusted at an immutable base: held already
      try { const value = await policyFile(comparisonNow, path, signal, Boolean(provider)); if (value.status === 'present' && value.text !== undefined) sources[path] = value.text; else if (value.status === 'absent') absentTemplates.push(path); }
      catch (error) { if (signal.aborted) throw error; } // The compiler reports missing trusted template text.
    }
    if (!provider) await confirm(current, comparisonNow, changes ? changesPath : current.path, signal);
    else {
      const after = await request<PublicPull>({ type: 'source.public', repository: current.repository, pullRequest: current.pullRequest });
      if (!sameComparison(comparisonNow, after.comparison) || comparisonNow.changedFiles !== after.comparison.changedFiles) throw new ExtensionError('COMPARISON_MOVED', 'The comparison changed while policy was acquired.');
    }
    if (signal.aborted) throw signal.reason;
    const packet = await request<Packet>({ type: 'analysis.run', input: { comparison: comparisonNow, ...(acquisition ? { acquisition } : {}), policy, ...(templates.length ? { templates: sources } : {}), ...(absentTemplates.length ? { absentTemplates } : {}), ...(coverage ? { coverage } : {}) } });
    if (signal.aborted) throw signal.reason; return { packet, settings: lookup.settings };
  });
}
