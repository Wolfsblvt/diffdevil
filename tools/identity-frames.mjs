// SPDX-License-Identifier: AGPL-3.0-only
/**
 * The diffdevil identity masters and the framing rules both the brand exporter (tools/brand-export.mjs) and the
 * website asset builder (tools/website-assets.mjs) apply, so a tile, touch or badge frame has one definition.
 * The masters live in brand/source/diffdevil; their `-dark` files are artwork for dark backgrounds, `-light` for light.
 */
import { readFileSync } from 'node:fs';

export const MASTERS = 'brand/source/diffdevil/';
export const GROUND = '#0c0f17';
export const GROUND_RGB = [0x0c, 0x0f, 0x17];

/** Consumer frames: outer pad as a share of the canvas, and the occupancy the visible mark must reach. */
export const FRAMES = {
  appleTouch: { file: 'apple-touch-icon.png', size: 180, pad: 0.18, occupancy: [0.40, 0.56], use: 'iOS home-screen icon' },
  webApp: { file: 'app-logo-512.png', size: 512, pad: 0.18, occupancy: [0.40, 0.56], use: 'web manifest / PWA icon' },
  githubApp: { file: 'github-app-logo-512.png', size: 512, pad: 0.05, occupancy: [0.60, 0.76], use: 'GitHub App badge (circular clip)' },
};

/** Read one master for nesting: drop the XML declaration, the root width/height (re-supplied per placement) and the inert C2PA metadata. */
export function master(name) {
  return readFileSync(`${MASTERS}${name}`, 'utf8')
    .replace(/^<\?xml[^>]*>\s*/u, '')
    .replace(/<metadata>[\s\S]*?<\/metadata>/u, '')
    .replace(/<svg\b([^>]*)>/u, (match, attrs) => `<svg${attrs.replace(/\s(?:width|height)="[^"]*"/gu, '').replace(/\sxmlns:c2pa="[^"]*"/u, '')}>`);
}

/** Prefix every id and its url(#…)/href references, so several drawings can share one document without colliding. */
export function prefixIds(svg, prefix) {
  const ids = [...svg.matchAll(/\sid="([^"]+)"/gu)].map(match => match[1]);
  return ids.reduce((text, id) => text
    .replaceAll(`id="${id}"`, `id="${prefix}-${id}"`)
    .replaceAll(`url(#${id})`, `url(#${prefix}-${id})`)
    .replaceAll(`href="#${id}"`, `href="#${prefix}-${id}"`), svg);
}

/** The browser-tab drawing: the micro mark switching between its dark- and light-background artwork with the scheme. */
export function faviconAdaptive(microDark, microLight) {
  const inner = (file, prefix) => prefixIds(file, prefix).replace(/<svg\b[^>]*>/u, '').replace(/<\/svg>\s*$/u, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><style>.l{display:none}@media(prefers-color-scheme:light){.d{display:none}.l{display:inline}}</style><g class="d">${inner(microDark, 'dd-favicon-dark')}</g><g class="l">${inner(microLight, 'dd-favicon-light')}</g></svg>\n`;
}

/** Place an SVG on the midnight ground with an outer pad. */
export function onGround(inner, size, pad) {
  const inset = Math.round(size * pad), side = size - inset * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="${GROUND}"/>${inner.replace(/<svg\b/u, `<svg x="${inset}" y="${inset}" width="${side}" height="${side}"`)}</svg>`;
}

/** Bounds of every pixel that is not the ground colour: the visible mark, measured, not assumed. */
export function measureBounds(rendered) {
  const { width, height, pixels } = rendered;
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    if (pixels[i] !== GROUND_RGB[0] || pixels[i + 1] !== GROUND_RGB[1] || pixels[i + 2] !== GROUND_RGB[2]) {
      if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  const w = maxX - minX + 1, h = maxY - minY + 1;
  return { x: minX, y: minY, width: w, height: h, occupancy: Math.max(w, h) / width };
}
