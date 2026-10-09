// SPDX-License-Identifier: AGPL-3.0-only
/**
 * The prerendered site-header fragment, read once per isolate from the Worker's own assets.
 * Pages inject it as raw HTML, so the App shell is the website's header component rather
 * than a copy that could drift.
 */
let cached;

export async function siteHeader(_locals, origin) {
  if (cached) return cached;
  let assets;
  try { ({ env: { ASSETS: assets } } = await import('cloudflare:workers')); } catch { assets = undefined; }
  let html = '';
  // The prerendered page is a static asset; ask for the exact file so no trailing-slash redirect intervenes.
  for (const path of ['/fragments/header/index.html', '/fragments/header.html', '/fragments/header']) {
    try {
      const url = new URL(path, origin);
      const response = assets ? await assets.fetch(new Request(url)) : await fetch(url);
      if (response.ok) { html = await response.text(); break; }
    } catch { html = ''; }
  }
  // The fragment is a partial; a stray doctype from a non-partial build would still be harmless here.
  html = html.replace(/^\s*<!doctype html>/iu, '').trim();
  if (html) cached = html;
  return html;
}
