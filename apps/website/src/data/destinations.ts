// SPDX-License-Identifier: AGPL-3.0-only
/**
 * The one product-owned list of social and external destinations. The header's Community
 * panel, the compact menu and the footer all render from it, so a destination is activated
 * or changed in exactly one place. A destination without a real URL stays in the list and
 * renders as an unavailable (disabled) link; it is never pointed somewhere invented.
 *
 * Header rule: GitHub is the one direct icon, so it is left out of the Community panel.
 * Footer rule: icons only, never collapsed, complete — Works, Discord, Bluesky, GitHub.
 */
import type { IconName } from './icons';
import { copy } from './copy';
import { BLUESKY_URL, COMPANY_SITE, DISCORD_URL, GITHUB } from './site';

export interface Destination { readonly id: string; readonly icon: IconName; readonly label: string; readonly note: string; readonly href: string | undefined }

const c = copy.community;
const works: Destination = { id: 'works', icon: 'website', label: c.works[0], note: c.works[1], href: COMPANY_SITE };
const discord: Destination = { id: 'discord', icon: 'discord', label: c.discord[0], note: c.discord[1], href: DISCORD_URL };
const bluesky: Destination = { id: 'bluesky', icon: 'bluesky', label: c.bluesky[0], note: c.bluesky[1], href: BLUESKY_URL };
const github: Destination = { id: 'github', icon: 'github', label: c.github[0], note: c.github[1], href: GITHUB };

/** Community panel, in panel order. The direct header icon already carries GitHub. */
export const community: readonly Destination[] = [discord, bluesky, works];
/** Footer, in footer order. */
export const footerSocials: readonly Destination[] = [works, discord, bluesky, github];
