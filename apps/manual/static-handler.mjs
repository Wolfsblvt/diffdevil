// SPDX-License-Identifier: AGPL-3.0-only
/** Cloudflare Pages advanced-mode handler. Route identity comes from the selected
 * build, never a source path or an incoming destination parameter. The browser
 * carries fragments across HTTP redirects; the handler preserves path and query.
 */
export function createStaticHandler({ site, docs, compatibility, host, redirects }) {
  const canonical = host === 'site' ? site : docs;
  const selected = new Map(redirects.map(({ from, to }) => [from, to]));
  return {
    async fetch(request, env) {
      const url = new URL(request.url);
      if (url.hostname === new URL(compatibility).hostname) {
        return Response.redirect(site + url.pathname + url.search, 308);
      }
      const destination = selected.get(url.pathname);
      if (destination && url.hostname === new URL(canonical).hostname) {
        const target = new URL(destination);
        target.search = url.search;
        return Response.redirect(target.href, 308);
      }
      return env.ASSETS.fetch(request);
    },
  };
}
