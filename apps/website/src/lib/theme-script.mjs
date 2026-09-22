// SPDX-License-Identifier: AGPL-3.0-only
/** One before-paint rule for the website and manual. Cross-host navigation carries only
 * the appearance preference and bounce direction, never cookies, identity or credentials.
 */
import { themeTransferUrl, wireThemeTransfer } from './theme-transfer.mjs';
export const THEME_KEY = 'diffdevil.theme';
export const THEME_NEXT_KEY = 'diffdevil.theme.next';
export const THEME_TRANSFER = 'dd-theme';
export function initializeTheme() {
 const d = document.documentElement;
 let p = 'dark', n = 'light', saved = false;
 try {
  let value = localStorage.getItem('diffdevil.theme');
  if (value === 'system') value = 'auto';
  if (['dark','auto','light'].includes(value)) p = value;
  const next = localStorage.getItem('diffdevil.theme.next');
  if (next === 'dark' || next === 'light') { n = next; saved = true; }
 } catch {}
 try {
  const url = new URL(location.href);
  if (['https://diffdevil.dev','https://docs.diffdevil.dev'].includes(url.origin) && url.searchParams.has('dd-theme')) {
   const values = url.searchParams.getAll('dd-theme');
   const match = values.length === 1 && /^(dark|auto|light)\.(dark|light)$/u.exec(values[0]);
   if (match) { p = match[1]; n = match[2]; saved = true; try { localStorage.setItem('diffdevil.theme',p); localStorage.setItem('diffdevil.theme.next',n); } catch {} }
   url.searchParams.delete('dd-theme');
   history.replaceState(history.state,'',url.pathname+url.search+url.hash);
  }
 } catch {}
 let light = false;
 try { light = window.matchMedia('(prefers-color-scheme: light)').matches; } catch {}
 const resolved = p === 'auto' ? (light ? 'light' : 'dark') : p;
 if (p === 'auto' && !saved) { n = resolved === 'dark' ? 'light' : 'dark'; try { localStorage.setItem('diffdevil.theme.next',n); localStorage.setItem('diffdevil.theme','auto'); } catch {} }
 if (p !== 'auto') n = p === 'dark' ? 'light' : 'dark';
 d.setAttribute('data-theme',resolved); d.setAttribute('data-theme-pref',p); d.setAttribute('data-theme-next',n);
}
export const themeScript = `(${initializeTheme.toString()})();(${wireThemeTransfer.toString()})(${themeTransferUrl.toString()});`;
