// SPDX-License-Identifier: AGPL-3.0-only
import type { BrowserComparison } from '@wolfsblvt/diffdevil/browser';
import type { DeclineReason, UnresolvedReason } from '../shared/coverage.js';
export interface Route { repository: string; pullRequest: number; path: string }
export function route(url: string): Route | undefined {
  const parsed = new URL(url); if (parsed.origin !== 'https://github.com') return undefined;
  const match = /^\/([a-z0-9_.-]+\/[a-z0-9_.-]+)\/pull\/([1-9]\d*)(?:\/|$)/iu.exec(parsed.pathname);
  if (!match || match[1]!.split('/').some(part => part === '.' || part === '..') || !Number.isSafeInteger(Number(match[2]))) return undefined;
  return { repository: match[1]!, pullRequest: Number(match[2]), path: `/${match[1]}/pull/${match[2]}` };
}
/** GitHub wraps rendered paths in bidi isolation marks (U+200E and friends); analysis paths carry none. */
export function cleanPath(value: string | null | undefined): string | undefined {
  const text = value?.replace(/[‎‏‪-‮⁦-⁩؜﻿]/gu, '').trim();
  return text ? text : undefined;
}
export function providerObjects(document: Document): readonly Record<string, unknown>[] {
  const result: Record<string, unknown>[] = [];
  for (const script of [...document.querySelectorAll('script[type="application/json"]')].slice(0, 20)) {
    const text = script.textContent ?? ''; if (text.length > 4 * 1024 * 1024) continue;
    try {
      const queue = [{ value: JSON.parse(text) as unknown, depth: 0 }]; let offset = 0;
      while (offset < queue.length && offset < 25_000) {
        const item = queue[offset++]!; if (!item.value || typeof item.value !== 'object' || item.depth > 15) continue;
        if (!Array.isArray(item.value)) result.push(item.value as Record<string, unknown>);
        for (const value of Object.values(item.value)) if (value && typeof value === 'object' && queue.length < 25_000) queue.push({ value, depth: item.depth + 1 });
      }
    } catch { /* Other scripts do not establish comparison evidence. */ }
  }
  return result;
}
const sha = (value: unknown): string | undefined => typeof value === 'string' && /^[a-f0-9]{40}$/u.test(value) ? value : undefined;
const count = (value: unknown): number | undefined => Number.isSafeInteger(value) && Number(value) >= 0 ? Number(value) : undefined;
function fileCount(document: Document, current: Route): number | undefined {
  for (const link of document.querySelectorAll<HTMLAnchorElement>('nav a[href], .tabnav-tab[href]')) {
    if (new URL(link.getAttribute('href')!, 'https://github.com').pathname !== `${current.path}/files`) continue;
    const text = link.querySelector('.Counter, [data-testid="counter"]')?.textContent?.trim().replaceAll(',', '');
    if (text && /^\d+$/u.test(text)) return count(Number(text));
  }
  return undefined;
}
function embeddedRoute(document: Document): Record<string, unknown> | undefined {
  const embedded = document.querySelector('script[data-target="react-app.embeddedData"]');
  if (!embedded?.textContent || embedded.textContent.length > 16 * 1024 * 1024) return undefined;
  try { const data = JSON.parse(embedded.textContent) as { payload?: { pullRequestsChangesRoute?: Record<string, unknown> } }; return data.payload?.pullRequestsChangesRoute; }
  catch { return undefined; }
}
const record = (value: unknown): Record<string, unknown> | undefined => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
export function pageComparison(document: Document, current: Route): BrowserComparison | undefined {
  const changes = embeddedRoute(document);
  if (changes) {
    const diff = record(record(changes.comparison)?.fullDiff);
    const base = sha(diff?.baseOid); const head = sha(diff?.headOid);
    if (base && head) {
      const summaries = record(changes.comparison)?.diffSummaries ?? changes.diffSummaries;
      const files = count(diff?.changedFiles ?? diff?.changedFileCount) ?? (Array.isArray(summaries) ? summaries.length : undefined) ?? fileCount(document, current);
      return { host: 'github.com', repository: current.repository, pullRequest: current.pullRequest, base, head, ...(files === undefined ? {} : { changedFiles: files }) };
    }
  }
  for (const object of providerObjects(document)) {
    const base = sha(object.baseRefOid ?? object.baseOid ?? object.baseSha); const head = sha(object.headRefOid ?? object.headOid ?? object.headSha);
    if (!base || !head || object.number !== undefined && object.number !== current.pullRequest) continue;
    const files = count(object.changedFiles ?? object.changed_files ?? object.changedFileCount) ?? fileCount(document, current);
    const additions = count(object.additions); const deletions = count(object.deletions);
    return { host: 'github.com', repository: current.repository, pullRequest: current.pullRequest, base, head,
      ...(files === undefined ? {} : { changedFiles: files }), ...(additions === undefined ? {} : { additions }), ...(deletions === undefined ? {} : { deletions }) };
  }
  const value = (selector: string, attr = 'value'): string | undefined => document.querySelector(selector)?.getAttribute(attr) ?? undefined;
  const base = sha(value('input#pull_request_base_sha')) ?? sha(value('[data-base-ref-oid]', 'data-base-ref-oid')) ?? sha(value('meta[name="pull-request-base-sha"]', 'content'));
  const head = sha(value('input#pull_request_head_sha')) ?? sha(value('[data-current-head-oid]', 'data-current-head-oid')) ?? sha(value('meta[name="pull-request-head-sha"]', 'content'));
  const files = fileCount(document, current);
  return base && head ? { host: 'github.com', repository: current.repository, pullRequest: current.pullRequest, base, head, ...(files === undefined ? {} : { changedFiles: files }) } : undefined;
}
export function sameComparison(a: BrowserComparison, b: BrowserComparison): boolean { return a.repository.toLowerCase() === b.repository.toLowerCase() && a.pullRequest === b.pullRequest && a.base === b.base && a.head === b.head; }
/**
 * The signed-in page's own file evidence: every file's summary and whatever
 * diff content GitHub embedded. Shaped like the provider's file list so the
 * engine keeps a file without patch text honestly bounded. Undefined when the
 * page carries no usable summaries.
 */
export interface EmbeddedFiles { readonly files: readonly Record<string, unknown>[]; readonly patched: number; readonly complete: boolean; /** Files GitHub itself declined to give lines for, by path. */ readonly declined: Readonly<Record<string, DeclineReason>> }
const STATUSES: Record<string, string> = { added: 'added', add: 'added', deleted: 'removed', removed: 'removed', delete: 'removed', modified: 'modified', modify: 'modified', changed: 'modified', renamed: 'renamed', rename: 'renamed', copied: 'copied', copy: 'copied', 'type-changed': 'changed', type_changed: 'changed', typechange: 'changed' };
const text = (value: unknown): string | undefined => typeof value === 'string' && value ? value : undefined;
/** GitHub itself declines to supply lines for these; the file stays honestly bounded. */
export const declineReason = (entry: Record<string, unknown>): DeclineReason | undefined => entry.isBinary === true ? 'binary' : entry.isSubmodule === true ? 'submodule' : entry.isTooBig === true ? 'too-big' : typeof entry.truncatedReason === 'string' && entry.truncatedReason !== '' ? 'truncated' : undefined;
export const unmeasurableEntry = (entry: Record<string, unknown>): boolean => declineReason(entry) !== undefined;
export function contentPatch(entry: Record<string, unknown> | undefined): string | undefined {
  if (!entry || unmeasurableEntry(entry)) return undefined;
  const raw = text(entry.patch) ?? text(entry.rawPatch) ?? text(entry.diff); if (raw) return raw;
  const lines = Array.isArray(entry.diffLines) ? entry.diffLines : Array.isArray(entry.hunks) ? entry.hunks.flatMap(hunk => Array.isArray(record(hunk)?.lines) ? record(hunk)!.lines as unknown[] : []) : undefined;
  if (!lines?.length) return undefined;
  const marker: Record<string, string> = { addition: '+', add: '+', added: '+', deletion: '-', delete: '-', deleted: '-', context: ' ', unchanged: ' ', hunk: '@', hunk_header: '@', injected_context: ' ' };
  const parsed: { kind: string; text: string }[] = [];
  for (const line of lines) {
    const item = record(line); const kind = marker[String(item?.type ?? item?.kind ?? '').toLowerCase()]; const body = typeof item?.text === 'string' ? item.text : typeof item?.content === 'string' ? item.content : undefined;
    if (!kind || body === undefined) return undefined; if (kind === '@' && !/^@@ /u.test(body)) continue; parsed.push({ kind, text: body });
  }
  const bodies = parsed.filter(line => line.kind !== '@');
  const prefixed = bodies.length > 0 && bodies.every(line => line.text.startsWith(line.kind));
  const rows = parsed.map(line => line.kind === '@' ? line.text : prefixed ? line.text : `${line.kind}${line.text}`);
  if (!parsed.some(line => line.kind === '@')) {
    const added = bodies.filter(line => line.kind === '+').length; const deleted = bodies.filter(line => line.kind === '-').length; const context = bodies.length - added - deleted;
    rows.unshift(`@@ -1,${context + deleted} +1,${context + added} @@`);
  }
  return `${rows.join('\n')}\n`;
}
export function embeddedFiles(document: Document): EmbeddedFiles | undefined {
  const changes = embeddedRoute(document); if (!changes) return undefined;
  const comparison = record(changes.comparison);
  const summaries = comparison?.diffSummaries ?? changes.diffSummaries; if (!Array.isArray(summaries) || !summaries.length || summaries.length > 3000) return undefined;
  const contents = comparison?.diffContents ?? changes.diffContents;
  const entries: Record<string, unknown>[] = Array.isArray(contents) ? contents.map(record).filter((entry): entry is Record<string, unknown> => entry !== undefined) : record(contents) ? Object.entries(record(contents)!).map(([key, value]): Record<string, unknown> => ({ path: key, ...(record(value) ?? {}) })) : [];
  const byKey = new Map<string, Record<string, unknown>>();
  for (const entry of entries) for (const key of [entry.pathDigest, entry.digest, entry.path, entry.newPath, entry.filename]) if (typeof key === 'string') byKey.set(key, entry);
  const files: Record<string, unknown>[] = []; let patched = 0; let complete = true; const declined: Record<string, DeclineReason> = Object.create(null) as Record<string, DeclineReason>;
  for (const item of summaries) {
    const summary = record(item); const path = cleanPath(text(summary?.path) ?? text(summary?.newPath) ?? text(summary?.filename));
    const additions = count(summary?.linesAdded ?? summary?.additions); const deletions = count(summary?.linesDeleted ?? summary?.deletions);
    const status = STATUSES[String(summary?.changeType ?? summary?.status ?? '').toLowerCase()];
    if (!summary || !path || additions === undefined || deletions === undefined || !status) { complete = false; continue; }
    const oldPath = cleanPath(text(summary.oldPath) ?? text(summary.previousPath) ?? text(summary.previous_filename));
    const entry = [summary.pathDigest, summary.digest, path].map(key => typeof key === 'string' ? byKey.get(key) : undefined).find(value => value !== undefined);
    const patch = summary.isBinary === true ? undefined : contentPatch(entry); if (patch !== undefined) patched++;
    const reason = summary.isBinary === true ? 'binary' : summary.isSubmodule === true ? 'submodule' : entry ? declineReason(entry) : undefined; if (reason && patch === undefined) declined[path] = reason;
    files.push({ filename: path, status, additions, deletions, ...(typeof summary.pathDigest === 'string' ? { pathDigest: summary.pathDigest } : {}), ...(oldPath === undefined ? {} : { previous_filename: oldPath }), ...(patch === undefined ? {} : { patch }) });
  }
  return files.length ? { files, patched, complete, declined } : undefined;
}
/** Files still without patch text that GitHub might supply through its page_data route. */
export const unpatchedPaths = (files: readonly Record<string, unknown>[]): string[] => files.filter(file => file.patch === undefined).map(file => String(file.filename));
/** What one returned entry gives: patch text, GitHub's own decline, or why it still cannot be measured. */
export type EntryOutcome = { readonly patch: string } | { readonly declined: DeclineReason } | { readonly unresolved: Exclude<UnresolvedReason, 'not-returned' | 'disagrees' | 'unreachable'> };
export function entryOutcome(entry: Record<string, unknown>): EntryOutcome {
  const reason = declineReason(entry); if (reason) return { declined: reason };
  const patch = contentPatch(entry); if (patch !== undefined) return { patch };
  const lines = Array.isArray(entry.diffLines) ? entry.diffLines.length : Array.isArray(entry.hunks) ? entry.hunks.length : 0;
  if (lines > 0 || text(entry.patch) !== undefined) return { unresolved: 'unreadable' };
  // Observed on a private pull request: a generated lockfile comes back with exact counters, every
  // decline flag false and no lines; only its new tree entry says `isGenerated`. GitHub offers it on
  // demand, so it is collapsed, not declined.
  return { unresolved: record(entry.newTreeEntry)?.isGenerated === true || record(entry.oldTreeEntry)?.isGenerated === true ? 'collapsed' : 'no-lines' };
}
/**
 * The shape of an entry that could not be measured, for the path-free diagnostic: GitHub's field
 * names, which of its flags are set, and how many lines of which kinds it carried. Never a path,
 * a line's text or any other value.
 */
export function entryShape(entry: Record<string, unknown>): { keys: string[]; set: string[]; lines: number; lineTypes: string[] } {
  const lines = Array.isArray(entry.diffLines) ? entry.diffLines : [];
  return { keys: Object.keys(entry).sort(), set: Object.keys(entry).filter(key => entry[key] === true).sort(), lines: lines.length,
    lineTypes: [...new Set(lines.map(line => String(record(line)?.type ?? record(line)?.kind ?? '?').slice(0, 24)))].sort().slice(0, 12) };
}
/** Merge `page_data/diff_entries` entries (the same shape as embedded contents) into the file list, by digest or path. Requested files the entries cannot measure say why. */
export function withEntries(files: readonly Record<string, unknown>[], entries: readonly unknown[], requested: ReadonlySet<string> = new Set()): { files: Record<string, unknown>[]; loaded: number; declined: number; declinedPaths: Record<string, DeclineReason>; unresolved: Record<string, UnresolvedReason>; shapes: ReturnType<typeof entryShape>[] } {
  const byKey = new Map<string, Record<string, unknown>>();
  for (const item of entries) { const entry = record(item); if (!entry) continue; for (const key of [entry.pathDigest, entry.path]) if (typeof key === 'string') byKey.set(key, entry); }
  let loaded = 0; let declined = 0; const declinedPaths: Record<string, DeclineReason> = Object.create(null) as Record<string, DeclineReason>;
  const unresolved: Record<string, UnresolvedReason> = Object.create(null) as Record<string, UnresolvedReason>; const shapes: ReturnType<typeof entryShape>[] = [];
  const merged = files.map(file => {
    if (file.patch !== undefined) return file;
    const path = String(file.filename);
    const entry = byKey.get(path) ?? (typeof file.pathDigest === 'string' ? byKey.get(file.pathDigest) : undefined);
    if (!entry) { if (requested.has(path)) unresolved[path] = 'not-returned'; return file; }
    const outcome = entryOutcome(entry);
    if ('declined' in outcome) { declined++; declinedPaths[path] = outcome.declined; return file; }
    if ('unresolved' in outcome) { unresolved[path] = outcome.unresolved; shapes.push(entryShape(entry)); return file; }
    loaded++; return { ...file, patch: outcome.patch };
  });
  return { files: merged, loaded, declined, declinedPaths, unresolved, shapes };
}
/** What the page_data route returned for the requested paths: usable patch text, the files GitHub itself declined, and why any other requested file is still unmeasured. */
export function measurableEntries(entries: readonly unknown[], requested: ReadonlySet<string>): { patches: { path: string; patch: string }[]; declined: Record<string, DeclineReason>; unresolved: Record<string, UnresolvedReason>; shapes: ReturnType<typeof entryShape>[] } {
  const patches: { path: string; patch: string }[] = []; const declined: Record<string, DeclineReason> = Object.create(null) as Record<string, DeclineReason>;
  const unresolved: Record<string, UnresolvedReason> = Object.create(null) as Record<string, UnresolvedReason>; const shapes: ReturnType<typeof entryShape>[] = []; const seen = new Set<string>();
  for (const item of entries) {
    const entry = record(item); const path = text(entry?.path); if (!entry || !path || !requested.has(path) || seen.has(path)) continue; seen.add(path);
    const outcome = entryOutcome(entry);
    if ('declined' in outcome) declined[path] = outcome.declined;
    else if ('unresolved' in outcome) { unresolved[path] = outcome.unresolved; shapes.push(entryShape(entry)); }
    else patches.push({ path, patch: outcome.patch });
  }
  for (const path of requested) if (!seen.has(path)) unresolved[path] = 'not-returned';
  return { patches, declined, unresolved, shapes };
}
/**
 * The files the reader has in front of them: headers rendered near the viewport first, then the other
 * rendered headers, each in page order. These are the first files an automatic pass measures.
 */
export function visiblePaths(document: Document): string[] {
  const near: string[] = []; const rest: string[] = []; const seen = new Set<string>(); const height = document.defaultView?.innerHeight ?? 0;
  for (const header of document.querySelectorAll<HTMLElement>(FILE_HEADERS)) {
    const path = filePath(header); if (!path || seen.has(path)) continue; seen.add(path);
    const box = header.getBoundingClientRect(); (box.bottom >= -height && box.top <= height * 2 && (box.width > 0 || box.height > 0) ? near : rest).push(path);
  }
  return [...near, ...rest];
}
/**
 * The files whose diff is on screen now: every rendered header inside the viewport, and the file whose
 * header has scrolled above it while its lines still fill the top. Only these are the reader's demand;
 * a file further down is not, however soon it was rendered.
 */
export function viewportPaths(document: Document): string[] {
  const height = document.defaultView?.innerHeight ?? 0; const inside: string[] = []; const seen = new Set<string>();
  let above: string | undefined; let nextTop: number | undefined;
  for (const header of document.querySelectorAll<HTMLElement>(FILE_HEADERS)) {
    const path = filePath(header); if (!path || seen.has(path)) continue; seen.add(path);
    const box = header.getBoundingClientRect(); if (!(box.width > 0 || box.height > 0)) continue;
    if (box.top < 0) { above = path; nextTop = undefined; continue; }
    nextTop ??= box.top;
    if (box.top < height) inside.push(path);
  }
  // The file above the viewport is still being read unless the next header sits at the very top.
  return above !== undefined && (nextTop === undefined || nextTop > 0) ? [above, ...inside] : inside;
}
export const FILE_HEADERS = '.file-header, [data-testid="file-header"], [data-test-selector="file-header"], [data-testid="diff-file-header"], [data-diff-header-wrapper]';
export const LIVE_DIFFSTAT = '[data-testid~="diffstat"]';
const NOT_A_SUMMARY = `${FILE_HEADERS}, [data-testid="progressive-diffs-list"], [data-testid*="file-tree"], [data-testid*="fileTree"], file-tree, [role="tree"], aside, nav`;
const TOOLBAR_SUMMARY = '.pr-toolbar .diffstat, .diffbar-item.diffstat, .toc-diff-stats, .diffbar .diffstat';
export const PROVIDER_CHANGE = `${FILE_HEADERS}, .gh-header-meta, .tabnav-extra, .diffstat, ${LIVE_DIFFSTAT}, ${TOOLBAR_SUMMARY}, [data-testid="pull-request-header"]`;
export function filePath(header: Element): string | undefined {
  if (header.matches('[data-diff-header-wrapper]')) {
    const section = header.querySelector('[class*="DiffFileHeader-module__file-path-section__"]') ?? header;
    return cleanPath(section.querySelector('button[data-file-path]')?.getAttribute('data-file-path'))
      ?? cleanPath(section.querySelector('h3[class*="DiffFileHeader-module__file-name__"], h3')?.textContent);
  }
  const ancestor = header.closest('[data-path], [data-file-path]');
  return cleanPath(header.getAttribute('data-path') ?? header.getAttribute('data-file-path') ?? ancestor?.getAttribute('data-path') ?? ancestor?.getAttribute('data-file-path')
    ?? header.querySelector('[data-tagsearch-path]')?.getAttribute('data-tagsearch-path') ?? header.querySelector('a[title]')?.getAttribute('title'));
}
/**
 * GitHub's own diffstat, as the thing a seat replaces. `anchor` is where the seat
 * is inserted (before it); `nodes` are hidden or demoted, never removed, so a
 * failure can restore them in place.
 */
export interface NativeStat { readonly anchor: HTMLElement; readonly nodes: readonly HTMLElement[] }
const own = (element: Element): boolean => Boolean(element.closest('[data-diffdevil]'));
const SEAT_STOP = `${FILE_HEADERS}, .file-info, .tabnav, .tabnav-extra, .pr-toolbar, .diffbar, [role="tree"], [role="treeitem"], li, main, body`;
/** Only counts, signs, squares and their accessible words: nothing a reader would miss if the node were demoted. */
/** GitHub includes `Lines changed` in some labels; match it before its `changes?` prefix. */
const churnOnly = (element: HTMLElement): boolean => element.textContent!.replace(/[\s\d,+−–-]|additions?|deletions?|changed|changes?|lines?|files?|and|&|:/giu, '') === '' && !element.querySelector('a, button, input, h1, h2, h3, h4');
/**
 * The complete native churn seat around one diffstat token: GitHub's current
 * pages put the `+911 −53` counts before an inner group of squares, and the seat
 * must lead all of it. Climb while the ancestor holds nothing but churn.
 */
function nativeSeat(first: HTMLElement): NativeStat {
  let seat = first; let parent = first.parentElement;
  for (let depth = 0; depth < 5 && parent && !parent.matches(SEAT_STOP) && churnOnly(parent) && !own(parent); depth++) { seat = parent; parent = parent.parentElement; }
  if (seat !== first) return { anchor: seat, nodes: [seat] };
  const tokens = parent ? [...parent.children].filter((child): child is HTMLElement => child instanceof HTMLElement && !own(child) && (child.matches(LIVE_DIFFSTAT) || child.matches('.diffstat'))) : [first];
  return { anchor: first, nodes: tokens };
}
export function aggregateNative(document: Document): NativeStat | undefined {
  const established = '[data-testid="pull-request-diff-stats"], [data-testid="pr-diff-stats"], #diffstat, .tabnav-extra .diffstat, .gh-header-meta .diffstat, #partial-discussion-header .diffstat';
  for (const element of document.querySelectorAll<HTMLElement>(established)) if (!own(element) && !element.closest(NOT_A_SUMMARY)) return { anchor: element, nodes: [element] };
  // GitHub's current React summary exposes tokens such as `addition diffstat`
  // and `neutral diffstat` inside a churn group rather than one container.
  for (const element of document.querySelectorAll<HTMLElement>(LIVE_DIFFSTAT)) {
    if (own(element) || element.closest(NOT_A_SUMMARY)) continue;
    return nativeSeat(element);
  }
  return undefined;
}
/** The Files-changed toolbar sentence, only where GitHub renders one apart from the header seat. */
export function toolbarNative(document: Document, aggregate: HTMLElement | undefined): NativeStat | undefined {
  for (const element of document.querySelectorAll<HTMLElement>(TOOLBAR_SUMMARY)) {
    if (own(element) || element === aggregate || element.closest(FILE_HEADERS) || aggregate && (element.contains(aggregate) || aggregate.contains(element))) continue;
    return { anchor: element, nodes: [element] };
  }
  return undefined;
}
export function fileNative(header: HTMLElement): NativeStat | undefined {
  const classic = [...header.querySelectorAll<HTMLElement>('.diffstat')].find(element => !own(element));
  if (classic) return { anchor: classic, nodes: [classic] };
  const token = [...header.querySelectorAll<HTMLElement>(LIVE_DIFFSTAT)].find(element => !own(element));
  if (!token) return undefined;
  // Current React headers can render counts and colored squares as adjacent
  // siblings. Claim only the contiguous churn run so they move as one native seat.
  for (let child: HTMLElement = token; child !== header;) {
    const container = child.parentElement;
    if (!container || !header.contains(container)) break;
    const siblings = [...container.children].filter((element): element is HTMLElement => element instanceof HTMLElement);
    const index = siblings.indexOf(child);
    if (index < 0) break;
    let start = index; let end = index;
    while (start > 0 && churnOnly(siblings[start - 1]!) && !own(siblings[start - 1]!)) start--;
    while (end + 1 < siblings.length && churnOnly(siblings[end + 1]!) && !own(siblings[end + 1]!)) end++;
    if (start !== end) {
      const nodes = siblings.slice(start, end + 1);
      const hasCounts = nodes.some(node => /[+−–-]\s*\d/u.test(node.textContent ?? ''));
      const hasDiffstat = nodes.some(node => node.matches(LIVE_DIFFSTAT) || node.querySelector(LIVE_DIFFSTAT));
      if (hasCounts && hasDiffstat) return { anchor: nodes[0]!, nodes };
    }
    child = container;
  }
  return nativeSeat(token);
}
const TREE = '[data-testid*="file-tree" i], [data-testid*="fileTree"], file-tree, [role="tree"]';
const TREE_ROW = '[role="treeitem"], [data-tree-entry-type], li';
export interface TreeCounter { readonly row: HTMLElement; readonly native: NativeStat; readonly path?: string; readonly hashes: readonly string[] }
/** GitHub's diff anchors are `diff-` + SHA-256 of the path; a tree row's id or link names it. */
const HASH = /diff-([a-f0-9]{64})/gu;
function rowPath(row: HTMLElement): string | undefined {
  const explicit = cleanPath(row.getAttribute('data-file-path') ?? row.getAttribute('data-path') ?? row.querySelector('[data-file-path], [data-path]')?.getAttribute('data-file-path') ?? row.querySelector('[data-path]')?.getAttribute('data-path'));
  if (explicit) return explicit;
  const filterable = cleanPath(row.querySelector('[data-filterable-item-text]')?.textContent);
  if (filterable) return filterable;
  const payload = row.getAttribute('data-hydro-click-payload');
  if (payload) { try { const path = (JSON.parse(payload) as { payload?: { data?: { path?: unknown } } }).payload?.data?.path; if (typeof path === 'string') return cleanPath(path); } catch { /* Not a path source. */ } }
  return undefined;
}
/** Bounded reconstruction: the row's own label under its ancestor directory labels. Accepted only when the packet knows that path. */
function ancestorPath(row: HTMLElement, known: (path: string) => boolean): string | undefined {
  const label = (item: HTMLElement): string | undefined => cleanPath(item.querySelector<HTMLElement>('[class*="item-label"], [class*="content-text"], [class*="TreeView-item-content"] span, a span, span')?.textContent);
  const parts: string[] = []; const own = label(row); if (!own) return undefined; parts.unshift(own);
  for (let ancestor = row.parentElement?.closest<HTMLElement>('[role="treeitem"]'); ancestor; ancestor = ancestor.parentElement?.closest<HTMLElement>('[role="treeitem"]')) { const name = label(ancestor); if (!name) return undefined; parts.unshift(name); if (parts.length > 64) return undefined; }
  const candidate = parts.join('/'); return known(candidate) ? candidate : undefined;
}
/** `diff-<sha256(path)>` → path for the analysis's own files. Empty where subtle crypto is unavailable; the other bindings still apply. */
export async function pathAnchors(paths: readonly string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>(); const subtle = globalThis.crypto?.subtle; if (!subtle) return result;
  for (const path of paths.slice(0, 3000)) {
    try { const digest = await subtle.digest('SHA-256', new TextEncoder().encode(path)); result.set(Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join(''), path); }
    catch { /* A path that cannot be hashed keeps its other bindings. */ }
  }
  return result;
}
/** Per-file counters in GitHub's file tree, when it shows them; aggregate placement never lands here. */
export function treeCounters(document: Document, known: (path: string) => boolean): TreeCounter[] {
  const result: TreeCounter[] = []; const seen = new Set<HTMLElement>();
  for (const tree of document.querySelectorAll<HTMLElement>(TREE)) for (const token of tree.querySelectorAll<HTMLElement>(`${LIVE_DIFFSTAT}, .diffstat`)) {
    if (own(token) || seen.has(token)) continue;
    const row = token.closest<HTMLElement>(TREE_ROW); if (!row || row.matches('[data-tree-entry-type="directory"]')) continue;
    const native = token.matches('.diffstat') ? { anchor: token, nodes: [token] } : nativeSeat(token); native.nodes.forEach(node => seen.add(node)); seen.add(token);
    if (result.some(item => item.native.anchor === native.anchor)) continue;
    const hashes = [...row.outerHTML.matchAll(HASH)].map(match => match[1]!);
    const path = rowPath(row) ?? ancestorPath(row, known);
    result.push({ row, native, ...(path === undefined ? {} : { path }), hashes: [...new Set(hashes)] });
  }
  return result;
}
export function blobText(document: Document): string | undefined {
  for (const value of providerObjects(document)) {
    if (value.isTruncated === true || value.truncated === true || value.isBinary === true) continue;
    if (Array.isArray(value.rawLines) && value.rawLines.every(line => typeof line === 'string')) return value.rawLines.join('\n');
    if (typeof value.rawBlob === 'string') return value.rawBlob;
  }
  const lines = document.querySelectorAll('.js-file-line.blob-code, .blob-code-inner.js-file-line');
  return lines.length ? [...lines].map(line => line.textContent ?? '').join('\n') : undefined;
}

/** Aggregate is always the full PR; never put full-PR file counts on commit-only diffs. */
export function fullFilesView(url: string): boolean {
  const current = route(url); if (!current) return false;
  const parsed = new URL(url);
  return [`${current.path}/files`, `${current.path}/changes`].includes(parsed.pathname.replace(/\/$/u, ''))
    && !['base_oid', 'head_oid', 'commit', 'sha', 'base', 'head'].some(key => parsed.searchParams.has(key));
}
