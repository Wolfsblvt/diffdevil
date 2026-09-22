// SPDX-License-Identifier: AGPL-3.0-only
/** Build only: no deployment, publication, remote preview, DNS or account effect. */
import { prepareManual, root, manualRoot, run, packageBin } from './manual-package.mjs';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
prepareManual();
run(process.execPath,['tools/website-assets.mjs']);
run(process.execPath,['apps/manual/render.mjs']);
run(process.execPath,['tools/website-docs.mjs']);
packageBin('astro','astro',['build','--root','apps/website'],root,{env:{...process.env,DIFFDEVIL_SURFACE:'site',DIFFDEVIL_JOINED_SEARCH:'1',DIFFDEVIL_SITE_ORIGIN:'https://diffdevil.dev'}});
packageBin('astro','astro',['build','--root','apps/manual'],manualRoot,{env:{...process.env,DIFFDEVIL_SURFACE:'manual',DIFFDEVIL_SITE_ORIGIN:'https://diffdevil.dev'}});
const manifest = JSON.parse(readFileSync(join(root,'artifacts/manual/manifest.json'),'utf8'));
const site = join(root,'artifacts/website/dist'), docs = join(root,'artifacts/manual/dist');
writeFileSync(join(site,'_redirects'),['https://www.diffdevil.dev/* https://diffdevil.dev/:splat 308',...manifest.redirects.map(rule=>`${rule.from} ${rule.to} 308`),''].join('\n'));
writeFileSync(join(docs,'_redirects'),manifest.aliases.map(rule=>`${rule.from} ${rule.to} 308`).join('\n')+'\n');
for (const [directory,rules] of [[site,manifest.redirects],[docs,manifest.aliases]]) for (const rule of rules) {
 const target = join(directory,rule.from.slice(1),'index.html');
 mkdirSync(dirname(target),{recursive:true});
 writeFileSync(target,`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex, nosnippet"><meta http-equiv="refresh" content="0;url=${rule.to}"><link rel="canonical" href="${rule.to}"><title>Moved</title></head><body><a href="${rule.to}">Continue to the manual</a></body></html>`);
}
run(process.execPath,['apps/manual/search-index.mjs']);
