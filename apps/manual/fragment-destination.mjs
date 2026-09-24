// SPDX-License-Identifier: AGPL-3.0-only
/** Follow an explicitly mapped old fragment without losing the caller's query.
 * Returning null means no navigation, including an already-current destination.
 */
export function fragmentDestination(current, aliases) {
 let url, id;
 try { url = new URL(current); id = decodeURIComponent(url.hash.slice(1)); } catch { return null; }
 if (!Object.hasOwn(aliases,id)) return null;
 const target = new URL(aliases[id]);
 target.search = url.search;
 return target.href === url.href ? null : target.href;
}
