// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Where Settings sends people. The canonical public origins are the website's selected
 * facts (apps/website/public-origins.mjs); the static header and footer in options.html
 * carry the complete link set, and this module holds the few destinations the rendered
 * settings reach on their own. A test keeps every link in options.html inside these hosts.
 */
import { isSide } from './theme-state.js';
export const SITE = 'https://diffdevil.dev';
export const DOCS = 'https://docs.diffdevil.dev';
export const GITHUB = 'https://github.com/Wolfsblvt/diffdevil';
export const WORKS = 'https://wolfsblvt.works/';
export const destinations = {
  app: `${SITE}/app/`,
  guide: `${DOCS}/use/browser-extension/`,
} as const;
/**
 * The website keeps one appearance across its two hosts through `?dd-theme=<preference>.<next>`
 * on a page link. A link from Settings to either host carries the same, so the site opens in
 * the theme the person is already looking at. Everything else about the URL is untouched.
 */
export function themeHandoff(href: string, root: HTMLElement): string {
  try {
    const target = new URL(href);
    if ((target.origin !== SITE && target.origin !== DOCS) || !target.pathname.endsWith('/')) return href;
    const preference = root.dataset.themePref; const next = root.dataset.themeNext;
    if ((preference !== 'dark' && preference !== 'auto' && preference !== 'light') || !isSide(next)) return href;
    target.searchParams.set('dd-theme', `${preference}.${next}`); return target.href;
  } catch { return href; }
}
