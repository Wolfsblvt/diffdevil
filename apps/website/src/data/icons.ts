// SPDX-License-Identifier: AGPL-3.0-only
/**
 * The site's icon registry: semantic name → drawing. Pages and components ask for a
 * meaning through `Icon.astro`; only this file knows what it looks like.
 *
 * TEMPORARY DRAWINGS. The reusable diffdevil icon family is being designed by the owner.
 * Everything here except the GitHub mark is a deliberately neutral 16 × 16 placeholder so
 * layout, focus, disabled and responsive behaviour can be built and qualified now. When
 * the family lands, replace the bodies (and `viewBox` where needed); no caller changes.
 * `discord` is a generic conversation glyph on purpose: it is not the Discord mark.
 */
export interface IconDrawing { readonly body: string; readonly stroke?: boolean; readonly viewBox?: string }

const github = 'M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z';

export const icons = {
  github: { body: `<path d="${github}"/>` },
  discord: { stroke: true, body: '<path d="M2.5 3.5h11v7.5h-6l-3 2.5V11h-2z"/><path d="M6 7.25h.01M10 7.25h.01"/>' },
  website: { stroke: true, body: '<circle cx="8" cy="8" r="6"/><path d="M2 8h12M8 2c2 2 2 10 0 12M8 2c-2 2-2 10 0 12"/>' },
  search: { stroke: true, body: '<circle cx="7" cy="7" r="4.25"/><path d="m10.25 10.25 3.25 3.25"/>' },
  'theme-light': { stroke: true, body: '<circle cx="8" cy="8" r="2.75"/><path d="M8 1.5v1.75M8 12.75v1.75M1.5 8h1.75M12.75 8h1.75M3.4 3.4l1.25 1.25M11.35 11.35l1.25 1.25M3.4 12.6l1.25-1.25M11.35 4.65l1.25-1.25"/>' },
  'theme-dark': { stroke: true, body: '<path d="M13 9.5A5.5 5.5 0 0 1 6.5 3 5.5 5.5 0 1 0 13 9.5z"/>' },
  'theme-auto': { body: '<path d="M8 3a5 5 0 0 0 0 10z"/><circle cx="8" cy="8" r="5" fill="none" stroke="currentColor" stroke-width="1.5"/>' },
  sponsor: { stroke: true, body: '<path d="M8 13.5S2.5 10.2 2.5 6.4A2.9 2.9 0 0 1 8 5.2a2.9 2.9 0 0 1 5.5 1.2c0 3.8-5.5 7.1-5.5 7.1z"/>' },
  star: { stroke: true, body: '<path d="m8 2 1.85 3.75 4.15.6-3 2.95.7 4.1L8 11.45 4.3 13.4l.7-4.1-3-2.95 4.15-.6z"/>' },
  copy: { stroke: true, body: '<rect x="5.5" y="5.5" width="8" height="8" rx="1.5"/><path d="M10.5 5.5v-2a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2"/>' },
} as const satisfies Record<string, IconDrawing>;

export type IconName = keyof typeof icons;
