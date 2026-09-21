// SPDX-License-Identifier: AGPL-3.0-only
/**
 * The site's icon registry: semantic name → geometry. Pages and components ask for a
 * meaning through `Icon.astro`; only this file knows where a drawing comes from.
 *
 * It follows the Wolfsblvt Works icon standard's three routes with local, build-time data
 * and no runtime icon request:
 *   · ui      → Lucide, read from the installed `@iconify-json/lucide` collection
 *   · brand   → Simple Icons, read from the installed `@iconify-json/simple-icons` collection
 *   · product → the ratified Works-authored diffdevil family, vendored below from
 *               Wolfsblvt/wolfsblvt-icons@8596b6bc (`src/icons/products/diffdevil/`, MIT)
 *
 * `@wolfsblvt/icons` is the intended consumer route and is not published yet. Until it is,
 * this registry keeps the same selected glyphs (`social-links` is `lucide:waypoints`, as the
 * shared header standard names it). Adopting the package later replaces this one file and
 * `Icon.astro`; no caller changes. It is a map, not a second icon framework.
 */
import { createRequire } from 'node:module';

interface Collection { readonly icons: Record<string, { readonly body: string }>; readonly width?: number; readonly height?: number }
const require = createRequire(import.meta.url);
const lucide = require('@iconify-json/lucide/icons.json') as Collection;
const simple = require('@iconify-json/simple-icons/icons.json') as Collection;

const stroked = (paths: string): string => `<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</g>`;

/** Works-authored product glyphs, 24 × 24, two-pixel stroke. Geometry is copied unchanged. */
const product = {
  'diffdevil/brand': stroked('<path d="M4 4l3 2.25V9h10V6.25L20 4v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"/><path d="M12 9v11"/><path d="M6.5 13h3"/><path d="M14.5 13h3"/><path d="M16 11.5v3"/>'),
  'diffdevil/changed': stroked('<path d="M8 3H6a3 3 0 0 0-3 3v2"/><path d="M16 3h2a3 3 0 0 1 3 3v2"/><path d="M21 16v2a3 3 0 0 1-3 3h-2"/><path d="M8 21H6a3 3 0 0 1-3-3v-2"/><path d="M7 10h5"/><path d="M9.5 7.5v5"/><path d="M12 15h5"/>'),
  'diffdevil/raw-churn': stroked('<path d="M4 7h6"/><path d="M7 4v6"/><path d="M14 7h6"/><path d="M4 17h6"/><path d="M14 17h6"/>'),
  'diffdevil/bands': stroked('<rect x="3" y="12" width="18" height="6" rx="1"/><path d="M7.5 12v6"/><path d="M12 12v6"/><path d="M16.5 12v6"/><circle cx="12" cy="7" r="1.5"/><path d="M12 8.5V10"/>'),
} as const;

/** Semantic name → `<route>:<id>`. Add a meaning here before using it anywhere. */
export const iconMap = {
  // header and shell
  search: 'ui:search',
  chevron: 'ui:chevron-down',
  'social-links': 'ui:waypoints',
  external: 'ui:arrow-up-right',
  copy: 'ui:copy',
  copied: 'ui:check',
  'theme-light': 'ui:sun',
  'theme-dark': 'ui:moon',
  // destinations
  github: 'brand:github',
  discord: 'brand:discord',
  bluesky: 'brand:bluesky',
  chrome: 'brand:googlechrome',
  'github-actions': 'brand:githubactions',
  cli: 'ui:terminal',
  website: 'ui:globe',
  // support
  sponsor: 'ui:heart',
  star: 'ui:star',
  // product identity and concepts
  brand: 'product:diffdevil/brand',
  changed: 'product:diffdevil/changed',
  'raw-churn': 'product:diffdevil/raw-churn',
  bands: 'product:diffdevil/bands',
} as const;

export type IconName = keyof typeof iconMap;

/** Inner SVG markup for a 24 × 24 viewBox. A name that cannot be resolved fails the build. */
export function iconBody(name: IconName): string {
  const [route, id] = iconMap[name].split(/:(.*)/su) as [string, string];
  const body = route === 'ui' ? lucide.icons[id]?.body : route === 'brand' ? simple.icons[id]?.body : (product as Record<string, string>)[id];
  if (!body) throw new Error(`Icon "${name}" (${iconMap[name]}) is not in its installed collection.`);
  return body;
}
