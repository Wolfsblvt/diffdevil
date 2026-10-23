// SPDX-License-Identifier: AGPL-3.0-only
/** Build only: no deployment, publication, remote preview, DNS or account effect. */
import { prepareManual, root, manualRoot, run, npm, packageBin } from './manual-package.mjs';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { origins } from '../apps/manual/manifest.mjs';

/** Called once by the website's build-done hook, after its static files exist.
 * The manual has no reciprocal hook, so this cannot recursively rebuild the site.
 */
export function buildManualAndJoin() {
  prepareManual();
  run(process.execPath, ['apps/manual/visuals/render.mjs', '--validate']);
  run(process.execPath, ['apps/manual/render.mjs']);
  packageBin('astro', 'astro', ['build', '--root', 'apps/manual'], manualRoot, {
    env: { ...process.env, DIFFDEVIL_SURFACE: 'manual', DIFFDEVIL_SITE_ORIGIN: origins.site },
  });

  const manifest = JSON.parse(readFileSync(join(root, 'artifacts/manual/manifest.json'), 'utf8'));
  const handler = readFileSync(join(root, 'apps/manual/static-handler.mjs'), 'utf8');
  for (const [host, name, rules] of [['site', 'website', manifest.redirects], ['docs', 'manual', manifest.aliases]]) {
    const directory = join(root, `artifacts/${name}/dist`);
    // Only static consumer output belongs in the upload pair. Prerender chunks can
    // retain the build-only legal projection module and must not become assets.
    rmSync(join(directory, '.prerender'), { recursive: true, force: true });
    // Path rules also serve a plain static adapter. Matching-host redirects need
    // the actual request handler rather than an unsupported _redirects host rule.
    writeFileSync(join(directory, '_redirects'), rules.map(rule => `${rule.from} ${rule.to} 308`).join('\n') + '\n');
    writeFileSync(join(directory, '_worker.js'), handler + '\nexport default createStaticHandler(' + JSON.stringify({ ...origins, host, redirects: rules }) + ');\n');
    for (const rule of rules) {
      const target = join(directory, rule.from.slice(1), 'index.html');
      mkdirSync(dirname(target), { recursive: true });
      const destination = JSON.stringify(rule.to);
      writeFileSync(target, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex, nosnippet"><link rel="canonical" href="${rule.to}"><title>Moved</title><script>const target=new URL(${destination});target.search=location.search;target.hash=location.hash;location.replace(target.href);</script></head><body><a href="${rule.to}">Continue to the maintained source</a></body></html>`);
    }
  }
  run(process.execPath, ['apps/manual/search-index.mjs']);
  for (const [host, name, paths] of [
    [origins.site, 'website', ['/', '/playground/', '/examples/', '/extension/', '/app/', '/faq/']],
    [origins.docs, 'manual', manifest.records.filter(page => page.current).map(page => page.route)],
  ]) {
    const directory = join(root, `artifacts/${name}/dist`);
    writeFileSync(join(directory, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${host}/sitemap.xml\n`);
    writeFileSync(join(directory, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
      paths.map(path => `<url><loc>${host}${path}</loc></url>`).join('') + '</urlset>\n');
  }
}

// Keep the same real website entry point for QA rebuilds and direct invocation.
// Its hook above owns the manual/search join, not a second top-level pipeline.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  npm(['run', 'website:build']);
}
