// SPDX-License-Identifier: AGPL-3.0-only
import { node } from './dom.js';
/**
 * Canonical compact product identity copied unchanged from
 * Wolfsblvt/wolfsblvt-icons@8596b6bc2ba7c4b950963b7ec26cee1a26974439.
 * `diffdevil/brand` is MIT geometry with SHA-256
 * d33cf3b1a7a8ec52706da3311ac82e0500ec6c2eee8e35baeaaa2d5ef2b9b34e.
 */
export const GLYPH_STATUS = 'accepted-diffdevil-brand-centre-seam';
export function productIcon(mode: string, dark: boolean, url: (path: string) => string): HTMLElement | undefined {
  if (mode === 'none') return undefined;
  const mark = node('span', 'ddx-brand'); mark.setAttribute('aria-hidden', 'true');
  if (mode === 'full-color') {
    const image = node('img'); image.alt = ''; image.width = 16; image.height = 16; image.src = url(`assets/diffdevil-symbol-micro-${dark ? 'dark' : 'light'}.svg`); mark.append(image);
  } else {
    const source = url('assets/diffdevil-brand.svg'); mark.classList.add('ddx-brand-mono');
    mark.style.maskImage = `url("${source}")`; mark.style.setProperty('-webkit-mask-image', `url("${source}")`);
  }
  return mark;
}
