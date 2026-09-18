// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Shared client behaviour for every page: theme menu, clipboard copies with one live
 * region, the narrow-screen menu, and hash-driven disclosure opening. Plain DOM; no
 * framework on ordinary pages.
 */
import { announce, copyText, wireCopyButtons } from './clipboard';

type Theme = 'system' | 'dark' | 'light';
const STORAGE_KEY = 'diffdevil.theme';

function readTheme(): Theme {
  try { const value = localStorage.getItem(STORAGE_KEY); return value === 'dark' || value === 'light' ? value : 'system'; }
  catch { return 'system'; }
}

function applyTheme(theme: Theme): void {
  if (theme === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', theme);
  try { theme === 'system' ? localStorage.removeItem(STORAGE_KEY) : localStorage.setItem(STORAGE_KEY, theme); } catch { /* private mode: the choice lasts for this page */ }
  for (const control of document.querySelectorAll<HTMLElement>('[data-theme-control]')) {
    control.querySelector('[data-theme-current]')!.textContent = theme;
    control.querySelector<HTMLButtonElement>('[data-theme-button]')!.setAttribute('aria-label', `Theme: ${theme}`);
    for (const option of control.querySelectorAll<HTMLButtonElement>('[data-theme-option]')) option.setAttribute('aria-checked', option.dataset.themeOption === theme ? 'true' : 'false');
  }
}

function wireThemeMenu(): void {
  for (const control of document.querySelectorAll<HTMLElement>('[data-theme-control]')) {
    const button = control.querySelector<HTMLButtonElement>('[data-theme-button]')!;
    const menu = control.querySelector<HTMLElement>('[data-theme-menu]')!;
    const options = [...control.querySelectorAll<HTMLButtonElement>('[data-theme-option]')];
    const close = (refocus = true): void => { menu.hidden = true; button.setAttribute('aria-expanded', 'false'); if (refocus) button.focus(); };
    const open = (): void => {
      menu.hidden = false; button.setAttribute('aria-expanded', 'true');
      (options.find(option => option.getAttribute('aria-checked') === 'true') ?? options[0])?.focus();
    };
    button.addEventListener('click', () => (menu.hidden ? open() : close()));
    menu.addEventListener('keydown', event => {
      const index = options.indexOf(document.activeElement as HTMLButtonElement);
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); const next = (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length; options[next]?.focus(); }
      else if (event.key === 'Escape') { event.preventDefault(); close(); }
      else if (event.key === 'Home') { event.preventDefault(); options[0]?.focus(); }
      else if (event.key === 'End') { event.preventDefault(); options.at(-1)?.focus(); }
    });
    for (const option of options) option.addEventListener('click', () => { applyTheme(option.dataset.themeOption as Theme); close(); });
    document.addEventListener('click', event => { if (!menu.hidden && !control.contains(event.target as Node)) close(false); });
  }
  applyTheme(readTheme());
}

function wireMenuToggle(): void {
  const toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const nav = document.getElementById('site-nav');
  if (!toggle || !nav) return;
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
}

/** Deep links such as #agents-skill reveal the card they name. */
function openHashTarget(): void {
  const id = location.hash.slice(1);
  if (!id) return;
  const target = document.getElementById(id);
  const control = target?.querySelector<HTMLButtonElement>('[data-disclosure]');
  if (control && control.getAttribute('aria-expanded') !== 'true') control.click();
}

wireThemeMenu();
wireMenuToggle();
wireCopyButtons(document);
openHashTarget();
window.addEventListener('hashchange', openHashTarget);

export { announce, copyText };
