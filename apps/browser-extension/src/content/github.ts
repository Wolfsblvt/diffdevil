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
export const FILE_HEADERS = '.file-header, [data-testid="file-header"], [data-test-selector="file-header"], [data-testid="diff-file-header"]';
export const LIVE_DIFFSTAT = '[data-testid~="diffstat"]';
export const PROVIDER_CHANGE = `${FILE_HEADERS}, .gh-header-meta, .diffstat, ${LIVE_DIFFSTAT}, [data-testid="pull-request-header"]`;
export function filePath(header: Element): string | undefined {
  const ancestor = header.closest('[data-path], [data-file-path]');
  return header.getAttribute('data-path') ?? header.getAttribute('data-file-path') ?? ancestor?.getAttribute('data-path') ?? ancestor?.getAttribute('data-file-path')
    ?? header.querySelector('[data-tagsearch-path]')?.getAttribute('data-tagsearch-path') ?? header.querySelector('a[title]')?.getAttribute('title') ?? undefined;
}
export function aggregateHost(document: Document): HTMLElement | undefined {
  const established = '[data-testid="pull-request-diff-stats"], [data-testid="pr-diff-stats"], #diffstat, .gh-header-meta .diffstat, #partial-discussion-header .diffstat, .pr-toolbar .diffstat';
  for (const element of document.querySelectorAll<HTMLElement>(established)) if (!element.closest(FILE_HEADERS)) return element;
  // GitHub's current React summary exposes sibling tokens such as
  // `addition diffstat` and `neutral diffstat`, rather than one legacy
  // `.diffstat` container. Mount beside their shared immediate group.
  for (const element of document.querySelectorAll<HTMLElement>(LIVE_DIFFSTAT)) {
    if (element.closest(FILE_HEADERS)) continue;
    const parent = element.parentElement;
    if (parent && !parent.closest(FILE_HEADERS)) return parent;
    return element;
  }
  return document.querySelector<HTMLElement>('#partial-discussion-header .gh-header-meta, .gh-header-meta, [data-testid="pull-request-header"]') ?? undefined;
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
  return parsed.pathname.replace(/\/$/u, '') === `${current.path}/files`
    && !['base_oid', 'head_oid', 'commit', 'sha', 'base', 'head'].some(key => parsed.searchParams.has(key));
}
