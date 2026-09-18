// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Shared client behaviour for every page, the manual included: the three-state theme
 * switch, global search, clipboard copies with one live region, the narrow-screen menu,
 * and hash-driven disclosure opening. Plain DOM; no framework on ordinary pages.
 */
import { announce, copyText, wireCopyButtons } from './clipboard';
import { wireSearch } from './search';

type Theme = 'light' | 'system' | 'dark';
const THEMES: readonly Theme[] = ['light', 'system', 'dark'];
const STORAGE_KEY = 'diffdevil.theme';

function readTheme(): Theme {
  try { const value = localStorage.getItem(STORAGE_KEY); return value === 'dark' || value === 'light' ? value : 'system'; }
  catch { return 'system'; }
}

function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', theme);
  root.setAttribute('data-theme-choice', theme);
  try { theme === 'system' ? localStorage.removeItem(STORAGE_KEY) : localStorage.setItem(STORAGE_KEY, theme); } catch { /* private mode: the choice lasts for this page */ }
  for (const option of document.querySelectorAll<HTMLButtonElement>('[data-theme-option]')) {
    const on = option.dataset.themeOption === theme;
    option.setAttribute('aria-checked', String(on));
    option.tabIndex = on ? 0 : -1;
  }
}

function wireThemeSwitch(): void {
  for (const control of document.querySelectorAll<HTMLElement>('[data-theme-switch]')) {
    const options = [...control.querySelectorAll<HTMLButtonElement>('[data-theme-option]')];
    for (const option of options) option.addEventListener('click', () => applyTheme(option.dataset.themeOption as Theme));
    // Arrow keys cycle in both directions and wrap, so the three states form a ring.
    control.addEventListener('keydown', event => {
      const index = THEMES.indexOf(readTheme());
      const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
      const next = step ? THEMES[(index + step + THEMES.length) % THEMES.length] : event.key === 'Home' ? THEMES[0] : event.key === 'End' ? THEMES.at(-1) : undefined;
      if (!next) return;
      event.preventDefault();
      applyTheme(next);
      options.find(option => option.dataset.themeOption === next)?.focus();
    });
  }
  applyTheme(readTheme());
}

function wireMenuToggle(): void {
  const toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const header = document.querySelector<HTMLElement>('[data-site-header]');
  if (!toggle || !header) return;
  const set = (open: boolean): void => { header.classList.toggle('is-menu-open', open); toggle.setAttribute('aria-expanded', String(open)); };
  toggle.addEventListener('click', () => set(!header.classList.contains('is-menu-open')));
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && header.classList.contains('is-menu-open')) { set(false); toggle.focus(); } });
}

/** Deep links such as #agents-skill reveal the card they name. */
function openHashTarget(): void {
  const id = location.hash.slice(1);
  if (!id) return;
  const target = document.getElementById(id);
  const control = target?.querySelector<HTMLButtonElement>('[data-disclosure]');
  if (control && control.getAttribute('aria-expanded') !== 'true') control.click();
}

wireThemeSwitch();
wireMenuToggle();
wireSearch();
wireCopyButtons(document);
openHashTarget();
window.addEventListener('hashchange', openHashTarget);

export { announce, copyText };
