// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * Which premium extension, if any, this App build joins. The public App is complete without one: the Community
 * build has the six-route shell, base operation and history, and truthful Free and unavailable states. A build joins
 * the premium extension only when one is present, resolved once here for both the Astro build and the build command:
 *
 *   DIFFDEVIL_PREMIUM=off        build the Community App even when the extension is present
 *   DIFFDEVIL_PREMIUM=<path>     join the extension entry at that path (it must exist)
 *   unset                        join <repository>/premium/app/index.mjs when it exists, otherwise build Community
 *
 * `styles` is the extension's stylesheet (`styles/premium.css` beside its entry) or the empty Community one. The App
 * shell imports it through `@diffdevil/premium-styles`: Astro links CSS by each page's static imports, and the
 * extension's components reach the pages only through the runtime seam, so their own style imports never would.
 */
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
export const COMMUNITY_ENTRY = resolve(here, 'src/premium/absent.mjs');
export const DEFAULT_ENTRY = resolve(here, '../../premium/app/index.mjs');
export const COMMUNITY_STYLES = resolve(here, 'src/premium/absent.css');
const stylesOf = entry => { const styles = resolve(dirname(entry), 'styles/premium.css'); return existsSync(styles) ? styles : COMMUNITY_STYLES; };

export function selectPremium(env = process.env) {
  const selection = env.DIFFDEVIL_PREMIUM;
  if (selection === 'off') return { provided: false, entry: COMMUNITY_ENTRY, styles: COMMUNITY_STYLES, reason: 'DIFFDEVIL_PREMIUM=off' };
  if (selection) {
    const entry = resolve(selection);
    if (!existsSync(entry)) throw new Error(`DIFFDEVIL_PREMIUM names ${selection}, which does not exist.`);
    return { provided: true, entry, styles: stylesOf(entry), reason: 'DIFFDEVIL_PREMIUM' };
  }
  return existsSync(DEFAULT_ENTRY) ? { provided: true, entry: DEFAULT_ENTRY, styles: stylesOf(DEFAULT_ENTRY), reason: 'premium/app present' } : { provided: false, entry: COMMUNITY_ENTRY, styles: COMMUNITY_STYLES, reason: 'no premium extension present' };
}
