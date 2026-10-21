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
      const response = await env.ASSETS.fetch(request);
      const headers = new Headers(response.headers);
      // Legal pages must remain fetchable so crawlers can observe this directive.
      if (/^\/(?:impressum|privacy|terms)\/?$/u.test(url.pathname)) {
        headers.set('X-Robots-Tag', 'noindex, nosnippet');
      }
      // Revalidate mutable documents and the joined index after either host rolls back.
      // Content-addressed Astro assets can safely outlive an individual deployment.
      headers.set('Cache-Control', response.status >= 400 ? 'no-store' : url.pathname.startsWith('/_astro/')
        ? 'public, max-age=31536000, immutable' : 'public, max-age=0, must-revalidate');
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    },
  };
}
