// SPDX-License-Identifier: AGPL-3.0-only
import { createRequire } from 'node:module';
import { getBrand, resolveProductIcon, resolveUiIcon } from '@wolfsblvt/icons';
import type { ProductIconName, UiIconName } from '@wolfsblvt/icons';

/** Keep the site's caller-facing meanings while resolving source through the shared catalogue. */
export const iconMap = {
  // header and shell
  search: 'ui:search',
  chevron: 'ui:lucide:chevron-down',
  'social-links': 'ui:lucide:waypoints',
  external: 'ui:lucide:arrow-up-right',
  copy: 'ui:copy',
  copied: 'ui:lucide:check',
  'theme-light': 'ui:lucide:sun',
  'theme-dark': 'ui:lucide:moon',
  // destinations
  github: 'brand:github',
  discord: 'brand:discord',
  bluesky: 'simple-icons:bluesky',
  chrome: 'simple-icons:googlechrome',
  'github-actions': 'simple-icons:githubactions',
  cli: 'ui:lucide:terminal',
  website: 'ui:lucide:globe',
  // support
  sponsor: 'ui:lucide:heart',
  star: 'ui:lucide:star',
  // product identity and concepts
  brand: 'product:diffdevil/brand',
  changed: 'product:diffdevil/changed',
  'raw-churn': 'product:diffdevil/raw-churn',
  bands: 'product:diffdevil/bands',
} as const;

export type IconName = keyof typeof iconMap;

interface IconCollection { readonly icons: Record<string, { readonly body: string }> }
const require = createRequire(import.meta.url);
const lucide = require('@iconify-json/lucide/icons.json') as IconCollection;
const simple = require('@iconify-json/simple-icons/icons.json') as IconCollection;

export interface ResolvedIcon { readonly body: string; readonly viewBox: string; readonly product: boolean }

/** Resolve one existing semantic name through the shared catalogue and local build-time data. */
export function resolveIcon(name: IconName): ResolvedIcon {
  const [kind, glyph] = iconMap[name].split(/:(.*)/su) as [string, string];
  if (kind === 'product') {
    const icon = resolveProductIcon(glyph as ProductIconName);
    return { body: icon.body, viewBox: icon.viewBox, product: true };
  }

  let reference: string;
  if (kind === 'ui') reference = resolveUiIcon(glyph as UiIconName);
  else if (kind === 'brand') reference = getBrand(glyph).iconifyName;
  else reference = iconMap[name] as `simple-icons:${string}`;
  const [collection, id] = reference.split(':') as ['lucide' | 'simple-icons', string];
  const body = collection === 'lucide' ? lucide.icons[id]?.body : simple.icons[id]?.body;
  if (!body) throw new Error(`Icon "${name}" (${reference}) is not in its installed collection.`);
  return { body, viewBox: '0 0 24 24', product: false };
}
