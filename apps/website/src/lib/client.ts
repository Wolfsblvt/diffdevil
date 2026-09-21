// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Shared client behaviour for every page, the manual included: the bouncing theme control,
 * header destination panels (Install, Community, compact Menu), global search, clipboard
 * copies with one live region, and hash-driven disclosure opening. Plain DOM; no framework
 * on ordinary pages.
 */
import { announce, copyText, wireCopyButtons } from './clipboard';
import { wireSearch } from './search';
import { THEME_KEY, THEME_NEXT_KEY } from './theme-script.mjs';
import { copy } from '../data/copy';

/* ── theme: Dark → Auto → Light → Auto → Dark → … ───────────────────────────────────── */
type Side = 'dark' | 'light';
type Preference = Side | 'auto';
interface ThemeState { pref: Preference; next: Side }

const opposite = (side: Side): Side => (side === 'dark' ? 'light' : 'dark');
const systemSide = (): Side => { try { return matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'; } catch { return 'dark'; } };
const resolve = (state: ThemeState): Side => (state.pref === 'auto' ? systemSide() : state.pref);

/** The pre-paint script already resolved storage, defaults and migration; read its result. */
function readTheme(): ThemeState {
  const root = document.documentElement;
  const pref = root.getAttribute('data-theme-pref');
  const next = root.getAttribute('data-theme-next');
  const valid: Preference = pref === 'dark' || pref === 'light' || pref === 'auto' ? pref : 'dark';
  return { pref: valid, next: next === 'dark' || next === 'light' ? next : valid === 'dark' ? 'light' : 'dark' };
}

/** One step of the traversal. In Auto, `next` is the manual side the bounce is heading for. */
export function stepTheme(state: ThemeState, direction: 1 | -1): ThemeState {
  if (state.pref === 'auto') {
    const pref = direction === 1 ? state.next : opposite(state.next);
    return { pref, next: opposite(pref) };
  }
  return { pref: 'auto', next: direction === 1 ? opposite(state.pref) : state.pref };
}

function describe(state: ThemeState): string {
  const c = copy.theme;
  const label = (side: Side) => (side === 'dark' ? c.dark : c.light);
  const current = state.pref === 'auto' ? c.auto(label(resolve(state)).toLowerCase()) : label(state.pref);
  const after = stepTheme(state, 1);
  return `${current}. ${c.next(after.pref === 'auto' ? c.auto(label(resolve(after)).toLowerCase()).split(',')[0]! : label(after.pref))}`;
}

function applyTheme(state: ThemeState, persist: boolean): void {
  const root = document.documentElement;
  root.setAttribute('data-theme', resolve(state));
  root.setAttribute('data-theme-pref', state.pref);
  root.setAttribute('data-theme-next', state.next);
  if (persist) { try { localStorage.setItem(THEME_KEY, state.pref); localStorage.setItem(THEME_NEXT_KEY, state.next); } catch { /* storage unavailable: the choice lasts for this page */ } }
  const text = describe(state);
  for (const control of document.querySelectorAll<HTMLButtonElement>('[data-theme-control]')) { control.title = text; control.setAttribute('aria-description', text); }
}

function wireThemeControl(): void {
  let state = readTheme();
  const advance = (direction: 1 | -1): void => { state = stepTheme(state, direction); applyTheme(state, true); announce(`${copy.theme.label}: ${describe(state)}`); };
  for (const control of document.querySelectorAll<HTMLButtonElement>('[data-theme-control]')) {
    // A native button: Enter and Space arrive as one click. The arrows only supplement it.
    control.addEventListener('click', () => advance(1));
    control.addEventListener('keydown', event => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      event.preventDefault();
      advance(event.key === 'ArrowRight' ? 1 : -1);
    });
  }
  // Auto follows the system; an explicit choice ignores it. The bounce side never changes here.
  try { matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => { if (state.pref === 'auto') applyTheme(state, false); }); } catch { /* no media query support */ }
  applyTheme(state, false);
}

/* ── header destination panels: nonmodal disclosures of ordinary links ─────────────── */
function wirePanels(): void {
  const triggers = [...document.querySelectorAll<HTMLButtonElement>('[data-panel-trigger]')];
  const panelOf = (trigger: HTMLButtonElement) => document.getElementById(trigger.getAttribute('aria-controls') ?? '');
  const close = (trigger: HTMLButtonElement): void => { const panel = panelOf(trigger); if (!panel || panel.hidden) return; panel.hidden = true; panel.style.removeProperty('--shift'); trigger.setAttribute('aria-expanded', 'false'); };
  const open = (trigger: HTMLButtonElement): void => {
    for (const other of triggers) if (other !== trigger) close(other); // one panel at a time
    const panel = panelOf(trigger);
    if (!panel) return;
    panel.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    // Shift instead of clipping: keep the panel inside the viewport with a 12px gutter.
    const box = panel.getBoundingClientRect(), gutter = 12, width = document.documentElement.clientWidth;
    const shift = box.right > width - gutter ? width - gutter - box.right : box.left < gutter ? gutter - box.left : 0;
    if (shift) panel.style.setProperty('--shift', `${Math.round(shift)}px`);
  };
  for (const trigger of triggers) {
    const host = trigger.closest<HTMLElement>('.disclosure-host');
    trigger.addEventListener('click', () => (trigger.getAttribute('aria-expanded') === 'true' ? close(trigger) : open(trigger)));
    host?.addEventListener('keydown', event => { if (event.key === 'Escape' && trigger.getAttribute('aria-expanded') === 'true') { event.stopPropagation(); close(trigger); trigger.focus(); } });
    // Focus moving on (Tab past the last row) closes the panel without holding focus back.
    host?.addEventListener('focusout', event => { const to = (event as FocusEvent).relatedTarget as Node | null; if (to && !host.contains(to)) close(trigger); });
  }
  // An outside click closes without stealing focus from what was clicked.
  document.addEventListener('pointerdown', event => { for (const trigger of triggers) if (!trigger.closest('.disclosure-host')?.contains(event.target as Node)) close(trigger); });
  // A panel is positioned for the width it opened at: never carry it across a resize or a layout seam.
  window.addEventListener('resize', () => { for (const trigger of triggers) close(trigger); });
}

/** Deep links such as #agents-skill reveal the card they name. */
function openHashTarget(): void {
  const id = location.hash.slice(1);
  if (!id) return;
  const target = document.getElementById(id);
  const control = target?.querySelector<HTMLButtonElement>('[data-disclosure]');
  if (control && control.getAttribute('aria-expanded') !== 'true') control.click();
}

/** The shortcut hint names the key that actually works on this platform. */
function labelShortcut(): void {
  const mac = /Mac|iPhone|iPad/u.test(navigator.platform ?? '');
  for (const hint of document.querySelectorAll<HTMLElement>('[data-search-shortcut]')) hint.textContent = mac ? '⌘ K' : 'Ctrl K';
}

wireThemeControl();
wirePanels();
wireSearch();
labelShortcut();
wireCopyButtons(document);
openHashTarget();
window.addEventListener('hashchange', openHashTarget);

export { announce, copyText };
