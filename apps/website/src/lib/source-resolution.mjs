// SPDX-License-Identifier: AGPL-3.0-only
/** A finite map is the complete resolver authority. No path or URL fallback. */
export function resolveSource(input, targets) {
 let url;
 try { url = new URL(input, 'https://diffdevil.dev'); } catch { return null; }
 const ids = url.searchParams.getAll('f');
 if (ids.length !== 1 || !Object.hasOwn(targets, ids[0])) return null;
 const target = targets[ids[0]];
 let fragment;
 try { fragment = decodeURIComponent(url.hash.slice(1)); } catch { return null; }
 if (fragment && Object.hasOwn(target.fragments ?? {}, fragment)) return target.fragments[fragment];
 return target.url + (fragment ? '#' + encodeURIComponent(fragment) : '');
}
