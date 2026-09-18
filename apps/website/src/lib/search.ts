// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Global search over the Pagefind index the build writes for the whole site. One modal on
 * every route; each hit says whether it is a manual page or a site page. The index and
 * its runtime are loaded on first open, never on page load.
 */
import { copy } from '../data/copy';

interface SubResult { readonly title: string; readonly url: string; readonly excerpt: string }
interface ResultData { readonly url: string; readonly excerpt: string; readonly meta: { readonly title?: string }; readonly sub_results?: readonly SubResult[] }
interface Pagefind {
  init?: () => Promise<void>;
  debouncedSearch: (query: string, options?: object, delay?: number) => Promise<{ results: { data: () => Promise<ResultData> }[] } | null>;
}

const MAX_RESULTS = 8;
let engine: Promise<Pagefind | undefined> | undefined;

function load(): Promise<Pagefind | undefined> {
  // The path is assembled at run time so the bundler leaves it alone: the file exists only in built output.
  const path = ['', 'pagefind', 'pagefind.js'].join('/');
  engine ??= import(/* @vite-ignore */ path).then(async (module: Pagefind) => { await module.init?.(); return module; }).catch(() => undefined);
  return engine;
}

/** A manual page lives under /docs/; everything else is a page of the site. */
export function kindOf(url: string): 'docs' | 'site' {
  return /^\/docs(\/|$)/u.test(new URL(url, location.origin).pathname) ? 'docs' : 'site';
}

function hit(data: ResultData): HTMLLIElement {
  const c = copy.search;
  const kind = kindOf(data.url);
  const item = document.createElement('li');
  const link = document.createElement('a');
  link.className = 'search-hit'; link.href = data.url; link.dataset.kind = kind;
  const head = document.createElement('span'); head.className = 'search-hit-head';
  const chip = document.createElement('span'); chip.className = 'chip-meta search-kind'; chip.textContent = kind === 'docs' ? c.kindDocs : c.kindSite;
  const title = document.createElement('span'); title.className = 'search-hit-title'; title.textContent = data.meta.title ?? data.url;
  head.append(chip, title);
  const excerpt = document.createElement('span'); excerpt.className = 'search-hit-excerpt';
  excerpt.innerHTML = data.excerpt; // Pagefind escapes the page text and adds only <mark>.
  link.append(head, excerpt);
  item.append(link);
  const subs = (data.sub_results ?? []).filter(sub => sub.url !== data.url).slice(0, 3);
  if (subs.length > 0) {
    const list = document.createElement('ul'); list.className = 'search-subs';
    for (const sub of subs) {
      const li = document.createElement('li'); const a = document.createElement('a');
      a.className = 'search-sub'; a.href = sub.url; a.textContent = sub.title;
      li.append(a); list.append(li);
    }
    item.append(list);
  }
  return item;
}

export function wireSearch(): void {
  const dialog = document.querySelector<HTMLDialogElement>('[data-search-dialog]');
  if (!dialog) return;
  const c = copy.search;
  const input = dialog.querySelector<HTMLInputElement>('[data-search-input]')!;
  const status = dialog.querySelector<HTMLElement>('[data-search-status]')!;
  const results = dialog.querySelector<HTMLElement>('[data-search-results]')!;
  let sequence = 0;

  const open = (): void => { if (!dialog.open) dialog.showModal(); input.focus(); input.select(); void load(); };
  for (const trigger of document.querySelectorAll<HTMLButtonElement>('[data-search-open]')) trigger.addEventListener('click', open);
  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); open(); }
  });
  // A click on the backdrop closes; a click inside never does.
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.querySelector('[data-search-form]')!.addEventListener('submit', event => {
    // Enter in the field follows the first hit; the Esc button is the form's only submitter and closes.
    if ((event as SubmitEvent).submitter) return;
    event.preventDefault();
    results.querySelector<HTMLAnchorElement>('a')?.click();
  });
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const stops: HTMLElement[] = [input, ...results.querySelectorAll<HTMLAnchorElement>('a')];
    const index = stops.indexOf(document.activeElement as HTMLElement);
    event.preventDefault();
    stops[(index + (event.key === 'ArrowDown' ? 1 : -1) + stops.length) % stops.length]?.focus();
  });

  input.addEventListener('input', async () => {
    const query = input.value.trim();
    const mine = ++sequence;
    if (!query) { results.replaceChildren(); status.textContent = c.hint; return; }
    const pagefind = await load();
    if (mine !== sequence) return;
    if (!pagefind) { results.replaceChildren(); status.textContent = c.unavailable; return; }
    const found = await pagefind.debouncedSearch(query, {}, 120);
    if (!found || mine !== sequence) return; // superseded by a newer keystroke
    const data = await Promise.all(found.results.slice(0, MAX_RESULTS).map(result => result.data()));
    if (mine !== sequence) return;
    results.replaceChildren(...data.map(hit));
    status.textContent = found.results.length > 0 ? c.count(found.results.length, data.length) : c.none(query);
  });
}
