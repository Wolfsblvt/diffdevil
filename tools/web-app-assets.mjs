// SPDX-License-Identifier: AGPL-3.0-only
/** Install identities derived from the approved masters; no service worker or offline storage. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { master, onGround, GROUND, faviconAdaptive } from './identity-frames.mjs';

/** The two selected applications have independent, stable launch identities. */
const APP_IDENTITIES = {
  app: { id: '/', name: 'diffdevil App', short_name: 'diffdevil', description: 'Understand change across your repositories.', master: 'diffdevil-symbol-master-dark.svg' },
  playground: { id: '/playground/', name: 'diffdevil Playground', short_name: 'Playground', description: 'Explore public pull requests, experiment with policy, and inspect the results with the diffdevil engine.', master: 'diffdevil-symbol-micro-dark.svg' },
};

/** Emit one application's manifest and opaque, mask-safe icons. @param {'app'|'playground'} kind @param {string} publicDirectory */
export function writeWebAppAssets(kind, publicDirectory) {
  const { master: donor, ...identity } = APP_IDENTITIES[kind];
  const directory = join(publicDirectory, identity.id);
  mkdirSync(directory, { recursive: true });
  const mark = master(donor);
  if (kind === 'app') writeFileSync(join(directory, 'favicon.svg'), faviconAdaptive(master('diffdevil-symbol-micro-dark.svg'), master('diffdevil-symbol-micro-light.svg')));
  // Keep the complete drawing inside the central 80%-diameter circle, including square corners.
  // These are compositions of approved artwork, not new logos or raster crops.
  for (const size of [180, 192, 512]) {
    const svg = onGround(mark, size, size === 180 ? 0.18 : 0.23);
    const name = size === 180 ? 'apple-touch-icon' : `icon-${size}`;
    writeFileSync(join(directory, `${name}.svg`), svg);
    writeFileSync(join(directory, `${name}.png`), new Resvg(svg).render().asPng());
  }
  const manifest = {
    ...identity, start_url: identity.id, scope: identity.id, display: 'standalone',
    background_color: GROUND, theme_color: '#151922', lang: 'en',
    icons: [192, 512].map(size => ({ src: `${identity.id}icon-${size}.png`, sizes: `${size}x${size}`, type: 'image/png', purpose: 'any maskable' })),
  };
  writeFileSync(join(directory, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2) + '\n');
}
