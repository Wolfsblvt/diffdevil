// SPDX-License-Identifier: AGPL-3.0-only
import type { BrowserComparison } from '@wolfsblvt/diffdevil/browser';
import { request, type Lookup, type MeasureVia, type Packet, type PublicPull } from '../shared/protocol.js';
import type { DeclineReason } from '../shared/coverage.js';
import { ExtensionError } from '../shared/errors.js';
import { comparisonIdentity, exclusive, loadDiffEntries } from './acquire.js';
import { measurableEntries, pageComparison, sameComparison, type Route } from './github.js';
/** GitHub lists a pull request's files 100 to a page, at most 30 pages. */
const PAGE = 100;
interface Found { patches: { path: string; patch: string }[]; declined: Record<string, DeclineReason> }
/** Patch text read for another comparison never extends this one; the error carries what GitHub named instead. */
function moved(observed: BrowserComparison): ExtensionError {
  return Object.assign(new ExtensionError('COMPARISON_MOVED', 'The pull request changed since this report was measured. Its new comparison is read again.'), { observed });
}
/**
 * The files of one comparison that a reader or a continuation wants measured now. Patch text is read
 * from GitHub the way the page itself reads it, handed to the worker that owns the report, and
 * forgotten; the worker's reply is the comparison with those files exact where the provider allowed.
 *
 * One browser profile reads each file once: tabs measuring the same comparison take turns, and each
 * asks the worker first which of its files are still bounded, so a file another tab measured while
 * this one waited is not read from GitHub again.
 */
export async function measure(current: Route, packet: Packet, paths: readonly string[], via: MeasureVia, signal: AbortSignal): Promise<Packet> {
  const comparison = packet.comparison;
  return exclusive(`diffdevil:measure:${comparisonIdentity(comparison)}`, signal, async () => {
    const lookup = await request<Lookup>({ type: 'cache.lookup', comparison, paths: [...paths] }); if (signal.aborted) throw signal.reason;
    if (lookup.paused) throw new ExtensionError('REPOSITORY_PAUSED', 'diffdevil is paused for this repository.');
    const pending = new Set(lookup.bounded ?? paths); const asked = paths.filter(path => pending.has(path));
    let found: Found = { patches: [], declined: Object.create(null) as Record<string, DeclineReason> };
    if (asked.length) {
      try {
        // The signed-in route is asked for the packet's own head; the page must not already name another comparison.
        found = measurableEntries((await loadDiffEntries(current, comparison, asked, signal)).entries, pending);
        const shown = typeof document === 'undefined' ? undefined : pageComparison(document, current);
        if (shown && !sameComparison(comparison, shown)) throw moved(shown);
      } catch (error) {
        if (signal.aborted || (error as { code?: string }).code === 'COMPARISON_MOVED') throw error;
        // The classic page has no page_data route. A public pull request can still be read from the provider's own file pages.
        found = await publicPages(packet, asked, current, pending);
      }
    }
    if (signal.aborted) throw signal.reason;
    return request<Packet>({ type: 'analysis.extend', comparison, patches: found.patches, ...(Object.keys(found.declined).length ? { declined: found.declined } : {}), via });
  });
}
async function publicPages(packet: Packet, paths: readonly string[], current: Route, wanted: ReadonlySet<string>): Promise<Found> {
  const comparison = packet.comparison;
  const order = packet.files.map(file => file.path); const pages = new Set(paths.map(path => Math.floor(Math.max(0, order.indexOf(path)) / PAGE) + 1));
  const patches: { path: string; patch: string }[] = []; const declined: Record<string, DeclineReason> = Object.create(null) as Record<string, DeclineReason>;
  for (const page of [...pages].slice(0, 3)) {
    const result = await request<PublicPull>({ type: 'source.public', repository: current.repository, pullRequest: current.pullRequest, files: true, page });
    // Each page is consistent with itself; it must also be the comparison this report measures.
    const observed = result.comparison;
    if (!sameComparison(comparison, observed) || comparison.changedFiles !== undefined && observed.changedFiles !== undefined && comparison.changedFiles !== observed.changedFiles) throw moved(observed);
    for (const item of result.files ?? []) {
      const file = item as Record<string, unknown>; const path = String(file.filename);
      if (wanted.has(path) && typeof file.patch === 'string') patches.push({ path, patch: file.patch }); else if (wanted.has(path)) declined[path] = 'omitted';
    }
  }
  return { patches, declined };
}
