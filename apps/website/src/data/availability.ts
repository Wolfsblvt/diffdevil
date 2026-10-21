// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Public availability of the two hosted routes: two independent switches, one per surface.
 * A surface is `open` exactly when its own real public destination is configured at build
 * time: PUBLIC_CHROME_WEB_STORE_URL for the extension, PUBLIC_APP_INSTALL_URL for the GitHub
 * App. The extension can open while the App stays private, and the reverse. Until a surface
 * opens, every action for it renders its `coming` status instead of a button that leads
 * nowhere, and the pages keep explaining the product in full. Setting one URL flips every
 * homepage, page and footer action of that surface at once; there is no second flag to keep
 * in step.
 */
import { copy } from './copy';
import { APP_INSTALL_URL, CHROME_WEB_STORE_URL } from './site';

export type Surface = 'app' | 'extension';
export interface Availability {
  readonly open: boolean;
  /** The configured public destination; present exactly when `open`. */
  readonly href: string | undefined;
  /** The action wording once open, e.g. "Install on GitHub". */
  readonly action: string;
  /** The short status shown while the destination does not exist yet. */
  readonly status: string;
  /** One sentence that says what is and is not available now. */
  readonly note: string;
}

const make = (href: string | undefined, text: { action: string; status: string; note: string }): Availability => ({ open: Boolean(href), href, ...text });

export const availability: Readonly<Record<Surface, Availability>> = {
  app: make(APP_INSTALL_URL, copy.availability.app),
  extension: make(CHROME_WEB_STORE_URL, copy.availability.extension),
};
