// SPDX-License-Identifier: AGPL-3.0-only
import type { BrowserComparison } from '@wolfsblvt/diffdevil/browser';
export interface Route { repository: string; pullRequest: number; path: string }
export function route(url: string): Route | undefined {
  const parsed = new URL(url); if (parsed.origin !== 'https://github.com') return undefined;
  const match = /^\/([a-z0-9_.-]+\/[a-z0-9_.-]+)\/pull\/([1-9]\d*)(?:\/|$)/iu.exec(parsed.pathname);
  if (!match || match[1]!.split('/').some(part => part === '.' || part === '..') || !Number.isSafeInteger(Number(match[2]))) return undefined;
  return { repository: match[1]!, pullRequest: Number(match[2]), path: `/${match[1]}/pull/${match[2]}` };
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
export function pageComparison(document: Document, current: Route): BrowserComparison | undefined {
  const embedded = document.querySelector('script[data-target="react-app.embeddedData"]');
  if (embedded?.textContent) {
    try {
      const data = JSON.parse(embedded.textContent) as { payload?: { pullRequestsChangesRoute?: { comparison?: { fullDiff?: Record<string, unknown> } } } };
      const diff = data.payload?.pullRequestsChangesRoute?.comparison?.fullDiff;
      const base = sha(diff?.baseOid); const head = sha(diff?.headOid);
      if (base && head) {
        const files = count(diff?.changedFiles ?? diff?.changedFileCount) ?? fileCount(document, current);
        return { host: 'github.com', repository: current.repository, pullRequest: current.pullRequest, base, head, ...(files === undefined ? {} : { changedFiles: files }) };
      }
    } catch { /* Unreadable provider data does not establish comparison identity. */ }
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
export const FILE_HEADERS = '.file-header, [data-testid="file-header"], [data-test-selector="file-header"], [data-testid="diff-file-header"], [data-diff-header-wrapper]';
export const LIVE_DIFFSTAT = '[data-testid~="diffstat"]';
const NOT_A_SUMMARY = `${FILE_HEADERS}, [data-testid="progressive-diffs-list"], [data-testid*="file-tree"], [data-testid*="fileTree"], file-tree, [role="tree"], aside, nav`;
const TOOLBAR_SUMMARY = '.pr-toolbar .diffstat, .diffbar-item.diffstat, .toc-diff-stats, .diffbar .diffstat';
export const PROVIDER_CHANGE = `${FILE_HEADERS}, .gh-header-meta, .tabnav-extra, .diffstat, ${LIVE_DIFFSTAT}, ${TOOLBAR_SUMMARY}, [data-testid="pull-request-header"]`;
export function filePath(header: Element): string | undefined {
  if (header.matches('[data-diff-header-wrapper]')) {
    const section = header.querySelector('[class*="DiffFileHeader-module__file-path-section__"]') ?? header;
    return section.querySelector('button[data-file-path]')?.getAttribute('data-file-path')
      ?? section.querySelector('h3[class*="DiffFileHeader-module__file-name__"]')?.textContent?.trim() ?? undefined;
  }
  const ancestor = header.closest('[data-path], [data-file-path]');
  return header.getAttribute('data-path') ?? header.getAttribute('data-file-path') ?? ancestor?.getAttribute('data-path') ?? ancestor?.getAttribute('data-file-path')
    ?? header.querySelector('[data-tagsearch-path]')?.getAttribute('data-tagsearch-path') ?? header.querySelector('a[title]')?.getAttribute('title') ?? undefined;
}
/**
 * GitHub's own diffstat, as the thing a seat replaces. `anchor` is where the seat
 * is inserted (before it); `nodes` are hidden or demoted, never removed, so a
 * failure can restore them in place.
 */
export interface NativeStat { readonly anchor: HTMLElement; readonly nodes: readonly HTMLElement[] }
const own = (element: Element): boolean => Boolean(element.closest('[data-diffdevil]'));
/** Sibling `addition diffstat` / `deletion diffstat` tokens form one seat; their parent is the anchor when it holds nothing else. */
function tokenGroup(first: HTMLElement): NativeStat {
  const parent = first.parentElement;
  const tokens = parent ? [...parent.children].filter((child): child is HTMLElement => child instanceof HTMLElement && !own(child) && (child.matches(LIVE_DIFFSTAT) || child.matches('.diffstat'))) : [first];
  const onlyTokens = parent && [...parent.childNodes].every(node => node instanceof Element ? tokens.includes(node as HTMLElement) || own(node) : !node.textContent?.trim());
  return onlyTokens && !parent.matches(`${FILE_HEADERS}, .file-info, .tabnav, main, body`) ? { anchor: parent, nodes: [parent] } : { anchor: first, nodes: tokens };
}
export function aggregateNative(document: Document): NativeStat | undefined {
  const established = '[data-testid="pull-request-diff-stats"], [data-testid="pr-diff-stats"], #diffstat, .tabnav-extra .diffstat, .gh-header-meta .diffstat, #partial-discussion-header .diffstat';
  for (const element of document.querySelectorAll<HTMLElement>(established)) if (!own(element) && !element.closest(NOT_A_SUMMARY)) return { anchor: element, nodes: [element] };
  // GitHub's current React summary exposes sibling tokens such as
  // `addition diffstat` and `neutral diffstat` rather than one container.
  for (const element of document.querySelectorAll<HTMLElement>(LIVE_DIFFSTAT)) {
    if (own(element) || element.closest(NOT_A_SUMMARY)) continue;
    return tokenGroup(element);
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
  return token ? tokenGroup(token) : undefined;
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
