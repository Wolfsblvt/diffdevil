// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * Mounts every chart frame on a page, one per animation frame top to bottom, under the page
 * line, and keeps the loading and motion language of Chart Grammar v1.1: navigation answers at
 * once, a period change updates the charts in place (the server renders the new page; the live
 * chart instances receive its models and morph), a bucket pick or a file selection swaps only
 * the panels that changed, and segmented switches slide one thumb.
 */
import { Frame, type Recipe } from './frame';
import { RECIPES } from './recipes';
import { mountHero } from './hero';
import { readoutOf, readoutHtml, tableOf, tableHtml, teachOf } from '../../lib/charts/readout.mjs';

declare global { interface Window { __diffdevilCharts?: { mounted: string[]; timings: { id: string; ms: number }[]; cloud: () => unknown } } }

/** A chart drawn by its own controller rather than a frame recipe (the premium cloud); it marks its host `is-mounted`. */
export type Mounter = (host: HTMLElement) => void;
/** What a live controller exposes to a page swap: the next model, a selection, and its chrome pressed again. */
export interface LiveChart { update(model: unknown, options: { meta: string }): void; select?(key: string): void; pressChrome?(): void }

const live = new Map<string, Frame>();
const MOUNTERS = new Map<string, Mounter>();
const telemetry = (window.__diffdevilCharts ??= { mounted: [], timings: [], cloud: () => [] });

/**
 * The premium extension's browser entry joins here: its frame recipes and its own mounters. Frames of a kind no one
 * has registered yet wait unmounted (the server-rendered readout and table stay), and mount once their kind arrives.
 */
export function registerCharts({ recipes = {}, mounters = {} }: { recipes?: Record<string, Recipe>; mounters?: Record<string, Mounter> }): void {
  Object.assign(RECIPES, recipes);
  for (const [kind, mount] of Object.entries(mounters)) MOUNTERS.set(kind, mount);
  mountCharts();
}

function mountOne(host: HTMLElement): void {
  const kind = host.dataset.chart!;
  const started = performance.now();
  if (kind === 'hero') mountHero(host);
  else if (MOUNTERS.has(kind)) MOUNTERS.get(kind)!(host);
  else {
    const recipe = RECIPES[kind];
    if (!recipe) { delete host.dataset.queued; return; }
    const frame = new Frame(host, recipe);
    if (kind === 'mosaic' && host.dataset.pickBucket) frame.onSelect(index => { if (index !== null) void swapTo(host.dataset.pickBucket!.replace('__W__', String(index)), { reason: 'bucket' }); });
    live.set(frame.id, frame);
  }
  host.classList.add('is-in');
  telemetry.mounted.push(host.dataset.chartId ?? kind);
  telemetry.timings.push({ id: host.dataset.chartId ?? kind, ms: Math.round(performance.now() - started) });
}

/** Mount the page's charts progressively: real frames first, then one chart per animation frame. */
export function mountCharts(root: ParentNode = document): void {
  const hosts = [...root.querySelectorAll<HTMLElement>('[data-chart]')].filter(host => !host.classList.contains('is-mounted') && !host.dataset.queued);
  if (hosts.length === 0) { if (!document.querySelector('[data-chart][data-queued]')) document.body.classList.remove('is-drawing'); return; }
  for (const host of hosts) host.dataset.queued = '1';
  document.body.classList.add('is-drawing');
  const next = () => {
    const host = hosts.shift();
    if (!host) { document.body.classList.remove('is-drawing'); return; }
    if (host.isConnected) { try { mountOne(host); if (host.classList.contains('is-mounted')) delete host.dataset.queued; } catch (error) { console.error(`chart ${host.dataset.chartId ?? host.dataset.chart} failed to mount`, error); host.classList.add('is-mounted', 'is-failed'); } }
    setTimeout(next, 30);
  };
  requestAnimationFrame(next);
}

/** Segmented switches: one thumb slides to the pressed option, including across a re-render. */
const THUMBS = new Map<string, { x: number; w: number }>();
export function placeThumbs(root: ParentNode = document): void {
  for (const [index, segment] of [...root.querySelectorAll<HTMLElement>('.a-seg')].entries()) {
    const key = segment.getAttribute('aria-label') || segment.dataset.seg || `seg${index}`;
    let thumb = segment.querySelector<HTMLElement>(':scope > .seg-thumb');
    if (!thumb) { thumb = document.createElement('i'); thumb.className = 'seg-thumb'; thumb.setAttribute('aria-hidden', 'true'); segment.prepend(thumb); segment.classList.add('has-thumb'); }
    const on = segment.querySelector<HTMLElement>(':scope > [aria-pressed="true"], :scope > [aria-current="true"]');
    if (!on) { thumb.style.opacity = '0'; continue; }
    const x = on.offsetLeft, w = on.offsetWidth, previous = THUMBS.get(key);
    if (!thumb.dataset.placed) { thumb.style.transition = 'none'; thumb.style.transform = `translateX(${previous ? previous.x : x}px)`; thumb.style.width = `${previous ? previous.w : w}px`; thumb.getBoundingClientRect(); thumb.style.transition = ''; thumb.dataset.placed = '1'; }
    thumb.style.transform = `translateX(${x}px)`; thumb.style.width = `${w}px`; thumb.style.opacity = '1';
    THUMBS.set(key, { x, w });
  }
}

let swapping: AbortController | null = null;

/**
 * Fetch the same page at a new URL and carry the live charts across: a chart whose id exists on
 * both pages keeps its instance and morphs to the new model; everything else is replaced. Used
 * for the period switch, the History bucket pick and the Files card selection.
 */
export async function swapTo(url: string, { reason }: { reason: 'period' | 'bucket' | 'select' | 'metric' | 'initial' }): Promise<boolean> {
  swapping?.abort();
  const controller = (swapping = new AbortController());
  const frame = document.querySelector<HTMLElement>('.a-frame');
  if (!frame) return false;
  document.body.classList.add('is-drawing');
  if (reason === 'period') document.body.classList.add('is-leaving');
  let html: string;
  try {
    const response = await fetch(url, { credentials: 'same-origin', headers: { accept: 'text/html', 'x-diffdevil-render': 'page' }, signal: controller.signal });
    if (response.redirected && new URL(response.url).pathname === '/sign-in') { location.href = response.url; return false; }
    // A 404 can carry the authorised, useful not-found/Free state of a detail page.
    if (!response.ok && response.status !== 404) throw new Error('E_ANALYTICAL_READ');
    html = await response.text();
  } catch (error) {
    if (!controller.signal.aborted) {
      document.body.classList.remove('is-drawing', 'is-leaving');
      document.dispatchEvent(new CustomEvent('diffdevil:load-failed', { detail: { url, reason } }));
    }
    return false;
  }
  if (controller.signal.aborted) return false;
  const next = new DOMParser().parseFromString(html, 'text/html');
  const nextFrame = next.querySelector<HTMLElement>('.a-frame');
  if (!nextFrame) {
    document.body.classList.remove('is-drawing', 'is-leaving');
    document.dispatchEvent(new CustomEvent('diffdevil:load-failed', { detail: { url, reason } }));
    return false;
  }
  const focusedNav = document.activeElement instanceof HTMLElement && document.activeElement.closest('[data-nav]') ? document.activeElement : null;
  const navHref = focusedNav instanceof HTMLAnchorElement ? focusedNav.getAttribute('href') : null;
  const navLabel = focusedNav?.getAttribute('aria-label');
  const filterValue = document.querySelector<HTMLInputElement>('[data-nav-filter]')?.value ?? '';
  // Keep the live chart instances whose panel survives: move the node, then feed it the next model. A person may be
  // inside a kept panel with the keyboard when the swap lands (a metric click, then arrows in the Turnover map):
  // moving the node blurs it and restarts its entrance animation, so the keyboard's place is remembered, the
  // entrance is not replayed, and focus is handed back afterwards. The plot never moves under the keyboard.
  const kept: { host: HTMLElement; incoming: HTMLElement; model: any; meta: string; teach: string; table: string; sel: number | null; keyboard: ReturnType<Frame['keyboardState']> | null; focused: HTMLElement | null }[] = [];
  for (const incoming of nextFrame.querySelectorAll<HTMLElement>('[data-chart][data-chart-id]')) {
    const id = incoming.dataset.chartId!;
    const existing = document.querySelector<HTMLElement>(`[data-chart-id="${CSS.escape(id)}"]`);
    if (!existing || !existing.classList.contains('is-mounted') || existing.dataset.chart !== incoming.dataset.chart) continue;
    const model = JSON.parse(incoming.querySelector('[data-chart-model]')?.textContent || 'null');
    if (!model) continue;
    const active = document.activeElement as HTMLElement | null;
    const focused = active && existing.contains(active) ? active : null;
    const frameLive = (existing as any).__frame as Frame | undefined;
    kept.push({ host: existing, incoming, model, meta: incoming.querySelector('[data-meta]')?.textContent ?? '', teach: incoming.querySelector('[data-teach]')?.textContent ?? '', table: incoming.querySelector('[data-table]')?.innerHTML ?? '', sel: incoming.dataset.sel === undefined ? null : Number(incoming.dataset.sel), keyboard: focused && frameLive ? frameLive.keyboardState() : null, focused });
    // The entrance already happened on this page; a carried panel must not rise and fade in again.
    existing.classList.remove('is-in');
    if (incoming.dataset.chart === 'hero') adoptHero(existing, incoming); else adoptChrome(existing, incoming);
    incoming.replaceWith(existing);
  }
  const scroll = window.scrollY;
  frame.replaceWith(nextFrame);
  document.title = next.title;
  if (reason !== 'initial') history.pushState(null, '', url);
  window.scrollTo(0, scroll);
  document.body.classList.remove('is-leaving');
  for (const entry of kept) {
    const frameLive = (entry.host as any).__frame as Frame | undefined;
    if (frameLive) { frameLive.update(entry.model, { meta: entry.meta, teach: entry.teach || teachOf(entry.model), table: entry.table || tableHtml(tableOf(entry.model)), sel: entry.sel }); continue; }
    const controller = (entry.host as any).__live as LiveChart | undefined;
    if (controller) { if (reason === 'select' && controller.select) controller.select(entry.host.dataset.selected ?? ''); else controller.update(entry.model, { meta: entry.meta }); continue; }
    const heroLive = (entry.host as any).__hero as { update: (model: any) => void } | undefined;
    if (heroLive) heroLive.update(entry.model);
  }
  // Readouts of kept frames keep their default text current without a pin.
  for (const entry of kept) { const readout = entry.host.querySelector('[data-readout]'); if (readout && (entry.host as any).__frame && entry.sel === null) readout.innerHTML = readoutHtml(readoutOf(entry.model, null), { hint: true }); }
  // The keyboard goes back where it was: the same row focused (and pinned) when the next model still names it there.
  for (const entry of kept) {
    if (!entry.focused || !entry.focused.isConnected) continue;
    const frameLive = (entry.host as any).__frame as Frame | undefined;
    if (frameLive && entry.keyboard) frameLive.restoreKeyboard(entry.keyboard);
    entry.focused.focus({ preventScroll: true });
  }
  document.dispatchEvent(new CustomEvent('diffdevil:page', { detail: { reason } }));
  if (reason === 'initial') {
    const filter = document.querySelector<HTMLInputElement>('[data-nav-filter]');
    if (filter && filterValue) { filter.value = filterValue; filter.dispatchEvent(new Event('input')); }
    const target = navHref ? document.querySelector<HTMLElement>(`[data-nav] a[href="${CSS.escape(navHref)}"]`)
      : navLabel ? document.querySelector<HTMLElement>(`[data-nav] [aria-label="${CSS.escape(navLabel)}"]`) : null;
    target?.focus({ preventScroll: true });
  }
  mountCharts(nextFrame);
  placeThumbs(nextFrame);
  return true;
}

/** The hero keeps only its plot: the lead figure, delta line and legend around it are the incoming page's. */
function adoptHero(existing: HTMLElement, incoming: HTMLElement): void {
  const plot = existing.querySelector('[data-hero-plot]');
  if (!plot) return;
  const fresh = [...incoming.childNodes].map(node => ((node as Element).matches?.('[data-hero-plot]') ? plot : node));
  existing.replaceChildren(...fresh);
}

/** A surviving frame takes the incoming page's header, footer and data attributes; its plot, readout and chart instance stay. */
function adoptChrome(existing: HTMLElement, incoming: HTMLElement): void {
  for (const name of [...existing.getAttributeNames()]) if (name.startsWith('data-') && !incoming.hasAttribute(name) && !['data-qa-mark'].includes(name)) existing.removeAttribute(name);
  for (const name of incoming.getAttributeNames()) if (name.startsWith('data-')) existing.setAttribute(name, incoming.getAttribute(name)!);
  for (const part of ['header.a-pn-h', 'footer.a-pn-f']) {
    const current = existing.querySelector(`:scope > ${part}`), next = incoming.querySelector(`:scope > ${part}`);
    if (current && next) current.replaceWith(next);
    else if (current && !next) current.remove();
    else if (!current && next) { if (part.startsWith('header')) existing.prepend(next); else existing.append(next); }
  }
  // a controller's view switch and metric buttons live in the chrome (the cloud's): press them to the live state again
  ((existing as any).__live as LiveChart | undefined)?.pressChrome?.();
  const frame = (existing as any).__frame as { pressChrome?: () => void } | undefined;
  frame?.pressChrome?.();
}

/** Navigation feedback: the clicked entry becomes current and the page dims before the next page is computed. */
export function wireNavigationFeedback(): void {
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href]');
    if (!link || link.target || link.origin !== location.origin) return;
    if (link.closest('[data-period]')) { event.preventDefault(); void swapTo(link.href, { reason: 'period' }); return; }
    const swap = link.dataset.swap ?? (link.closest('.a-bucketnav') ? 'bucket' : undefined);
    if (swap === 'bucket' || swap === 'select') { event.preventDefault(); void swapTo(link.href, { reason: swap }); return; }
    if (link.closest('.a-nav')) {
      for (const current of document.querySelectorAll('.a-nav a[aria-current]')) current.removeAttribute('aria-current');
      link.setAttribute('aria-current', 'page');
      document.body.classList.add('is-drawing', 'is-leaving');
    }
  }, true);
  window.addEventListener('popstate', () => location.reload());
  window.addEventListener('pageshow', event => { if ((event as PageTransitionEvent).persisted) document.body.classList.remove('is-drawing', 'is-leaving'); });
}
