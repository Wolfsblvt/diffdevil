// SPDX-License-Identifier: AGPL-3.0-only
import { buildManualAndJoin } from '../../tools/public-build.mjs';

/** The website's ordinary build is the entry to both public outputs. Build the
 * manual after the site, then produce exactly one typed search index from both.
 * Keeping this in the application hook leaves engine/Action package metadata alone.
 */
export default function searchIndex() {
  return { name: 'diffdevil-public-docs', hooks: {
    'astro:build:done': ({ logger }) => {
      buildManualAndJoin();
      logger.info('Built the manual and mirrored one joined SITE/DOCS/FAQ index.');
    },
  } };
}
