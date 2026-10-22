// SPDX-License-Identifier: MIT
// The settings shell's icons are resolved at build time through the shared Wolfsblvt
// catalogue, exactly as the website resolves its header and footer glyphs
// (apps/website/src/data/icons.ts). Callers name a meaning, never a drawing; the static
// options document carries `<span data-icon="…">` slots that this module replaces with
// inline SVG. Nothing is fetched at runtime.
import { createRequire } from 'node:module';
import { getBrand, resolveUiIcon } from '@wolfsblvt/icons';
const require = createRequire(import.meta.url);
const collections = { lucide: require('@iconify-json/lucide/icons.json'), 'simple-icons': require('@iconify-json/simple-icons/icons.json') };
/** Meaning → catalogue route. Keep the names the website uses for the same meanings. */
export const icons = { github: 'brand:github', 'theme-dark': 'ui:lucide:moon', 'theme-light': 'ui:lucide:sun' };
const escape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
/** One resolved icon as the website's Icon component renders it: decorative, sized, catalogue body. */
export function iconSvg(name, { size = 16, className = '' } = {}) {
  const route = icons[name]; if (!route) throw new Error(`Unknown settings icon "${name}".`);
  const [kind, glyph] = route.split(/:(.*)/su);
  const reference = kind === 'brand' ? getBrand(glyph).iconifyName : resolveUiIcon(glyph);
  const [collection, id] = reference.split(':');
  const body = collections[collection]?.icons[id]?.body; if (!body) throw new Error(`Icon "${name}" (${reference}) is not in its installed collection.`);
  const classes = ['icon', ...className.split(/\s+/u).filter(Boolean)].join(' ');
  return `<svg class="${escape(classes)}" data-icon="${escape(name)}" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
}
/** Replace every icon slot in a static document. A slot that survives is a build defect, not a blank. */
export function inlineIcons(html) {
  const result = html.replace(/<span data-icon="([^"]+)"([^>]*)><\/span>/gu, (_match, name, attributes) => {
    const size = Number(/\bdata-size="(\d+)"/u.exec(attributes)?.[1] ?? 16); const className = /\bclass="([^"]*)"/u.exec(attributes)?.[1] ?? '';
    return iconSvg(name, { size, className });
  });
  if (/<span data-icon=/u.test(result)) throw new Error('An icon slot in options.html could not be resolved.');
  return result;
}
