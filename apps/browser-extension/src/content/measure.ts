// SPDX-License-Identifier: AGPL-3.0-only
import { request, type MeasureVia, type Packet, type PublicPull } from '../shared/protocol.js';
import type { DeclineReason } from '../shared/coverage.js';
import { loadDiffEntries } from './acquire.js';
import { measurableEntries, type Route } from './github.js';
/** GitHub lists a pull request's files 100 to a page, at most 30 pages. */
const PAGE = 100;
/**
 * The files of one comparison that a reader or a continuation wants measured now. Patch text is read
 * from GitHub the way the page itself reads it, handed to the worker that owns the report, and
 * forgotten; the worker's reply is the comparison with those files exact where the provider allowed.
 */
export async function measure(current: Route, packet: Packet, paths: readonly string[], via: MeasureVia, signal: AbortSignal): Promise<Packet> {
  const comparison = packet.comparison; const wanted = new Set(paths);
  let found: { patches: { path: string; patch: string }[]; declined: Record<string, DeclineReason> };
  try { found = measurableEntries((await loadDiffEntries(current, comparison, paths, signal)).entries, wanted); }
  catch (error) {
    if (signal.aborted) throw error;
    // The classic page has no page_data route. A public pull request can still be read from the provider's own file pages.
    found = await publicPages(packet, paths, current, wanted);
  }
  if (signal.aborted) throw signal.reason;
  return request<Packet>({ type: 'analysis.extend', comparison, patches: found.patches, ...(Object.keys(found.declined).length ? { declined: found.declined } : {}), via });
}
async function publicPages(packet: Packet, paths: readonly string[], current: Route, wanted: ReadonlySet<string>): Promise<{ patches: { path: string; patch: string }[]; declined: Record<string, DeclineReason> }> {
  const order = packet.files.map(file => file.path); const pages = new Set(paths.map(path => Math.floor(Math.max(0, order.indexOf(path)) / PAGE) + 1));
  const patches: { path: string; patch: string }[] = []; const declined: Record<string, DeclineReason> = Object.create(null) as Record<string, DeclineReason>;
  for (const page of [...pages].slice(0, 3)) {
    const result = await request<PublicPull>({ type: 'source.public', repository: current.repository, pullRequest: current.pullRequest, files: true, page });
    for (const item of result.files ?? []) {
      const file = item as Record<string, unknown>; const path = String(file.filename);
      if (wanted.has(path) && typeof file.patch === 'string') patches.push({ path, patch: file.patch }); else if (wanted.has(path)) declined[path] = 'omitted';
    }
  }
  return { patches, declined };
}
