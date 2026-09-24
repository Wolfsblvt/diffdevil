// SPDX-License-Identifier: AGPL-3.0-only
import { origins } from '../../public-origins.mjs';
export function sourceResolverUrl(id) { return `${origins.site}/source/?f=${encodeURIComponent(id)}`; }
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

/** Keep the displayed source synchronized with same-document navigation.
 * @param {{view: Window, targets: Record<string, {url: string, fragments?: Record<string, string>}>, link: HTMLAnchorElement, status: HTMLElement}} options
 */
export function bindSourceSelection({view, targets, link, status}) {
 const refresh = () => {
  const target = resolveSource(view.location.href, targets);
  link.hidden = !target;
  status.textContent = target ? 'Selected source found.' : 'No recognized source was selected.';
  if (target) {
   link.setAttribute('href', target);
   link.focus();
  } else {
   link.removeAttribute('href');
  }
 };
 view.addEventListener('hashchange', refresh);
 view.addEventListener('popstate', refresh);
 refresh();
 return () => {
  view.removeEventListener('hashchange', refresh);
  view.removeEventListener('popstate', refresh);
 };
}
