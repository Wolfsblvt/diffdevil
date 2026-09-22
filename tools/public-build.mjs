// SPDX-License-Identifier: AGPL-3.0-only
/** Build only: no deployment, publication, remote preview, DNS or account effect. */
import { prepareManual, root, manualRoot, run, packageBin } from './manual-package.mjs';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { origins } from '../apps/manual/manifest.mjs';

prepareManual();
run(process.execPath, ['tools/website-assets.mjs']);
run(process.execPath, ['apps/manual/render.mjs']);
run(process.execPath, ['tools/website-docs.mjs']);
packageBin('astro', 'astro', ['build', '--root', 'apps/website'], root, {
  env: { ...process.env, DIFFDEVIL_SURFACE: 'site', DIFFDEVIL_JOINED_SEARCH: '1', DIFFDEVIL_SITE_ORIGIN: origins.site },
});
packageBin('astro', 'astro', ['build', '--root', 'apps/manual'], manualRoot, {
  env: { ...process.env, DIFFDEVIL_SURFACE: 'manual', DIFFDEVIL_SITE_ORIGIN: origins.site },
});

const manifest = JSON.parse(readFileSync(join(root, 'artifacts/manual/manifest.json'), 'utf8'));
const handler = readFileSync(join(root, 'apps/manual/static-handler.mjs'), 'utf8');
for (const [host, name, rules] of [['site', 'website', manifest.redirects], ['docs', 'manual', manifest.aliases]]) {
  const directory = join(root, `artifacts/${name}/dist`);
  // Path rules also serve a plain static adapter. Host redirects require the real
  // request handler: Pages does not accept a domain-level source in _redirects.
  writeFileSync(join(directory, '_redirects'), rules.map(rule => `${rule.from} ${rule.to} 308`).join('\n') + '\n');
  writeFileSync(join(directory, '_worker.js'), handler + '\nexport default createStaticHandler(' + JSON.stringify({ ...origins, host, redirects: rules }) + ');\n');
  for (const rule of rules) {
    const target = join(directory, rule.from.slice(1), 'index.html');
    mkdirSync(dirname(target), { recursive: true });
    const destination = JSON.stringify(rule.to);
    writeFileSync(target, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex, nosnippet"><link rel="canonical" href="${rule.to}"><title>Moved</title><script>const target=new URL(${destination});target.search=location.search;target.hash=location.hash;location.replace(target.href);</script></head><body><a href="${rule.to}">Continue to the manual</a></body></html>`);
  }
}
run(process.execPath, ['apps/manual/search-index.mjs']);
