// SPDX-License-Identifier: AGPL-3.0-only
/** Verify the actual two-host HTML and discovery output before it can be an upload input. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { origins } from './public-origins.mjs';

const decode = value => value.replaceAll('&amp;','&').replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>');
function attributes(tag) {
 return Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/gu)].map(([,name,value])=>[name,decode(value)]));
}
function meta(html,name) {
 const matches=[...html.matchAll(/<meta\b[^>]*>/gu)].map(([tag])=>attributes(tag)).filter(attrs=>(attrs.name??attrs.property)===name);
 assert.equal(matches.length,1,`one ${name}`);
 return matches[0].content;
}
function links(html,rel) {
 return [...html.matchAll(/<link\b[^>]*>/gu)].map(([tag])=>attributes(tag)).filter(attrs=>attrs.rel===rel);
}
function png(path,width,height=width) {
 const bytes=readFileSync(path);
 assert.equal(bytes.subarray(1,4).toString(),'PNG',path);
 assert.equal(bytes.readUInt32BE(16),width,path);
 assert.equal(bytes.readUInt32BE(20),height,path);
}

/** Called after both public outputs and their exact sitemaps have been generated. */
export function verifyPublicIdentity(records) {
 for (const [kind,directory,routes] of [
  ['site','artifacts/website/dist',['/','/playground/','/examples/','/extension/','/app/','/faq/']],
  ['docs','artifacts/manual/dist',records.filter(page=>page.current).map(page=>page.route)],
 ]) {
  const origin=origins[kind];
  const sitemap=readFileSync(join(directory,'sitemap.xml'),'utf8');
  assert.deepEqual([...sitemap.matchAll(/<loc>(.*?)<\/loc>/gu)].map(([,url])=>url).sort(),routes.map(route=>origin+route).sort());
  assert.equal(readFileSync(join(directory,'robots.txt'),'utf8'),`User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);
  const descriptions=new Set();
  for (const route of routes) {
   const html=readFileSync(join(directory,route,'index.html'),'utf8');
   const titles=[...html.matchAll(/<title>(.*?)<\/title>/gsu)];
   assert.equal(titles.length,1,route);
   const title=decode(titles[0][1]);
   const suffix=kind==='docs'?'diffdevil Docs':'diffdevil';
   assert.ok(route==='/'?title===suffix:title.endsWith(` · ${suffix}`),`${route}: ${title}`);
   assert.ok(title.split(' · ').length<=3,title);
   assert.doesNotMatch(title,/[\u0000-\u001f\u007f\u200b\u202a-\u202e\u2066-\u2069]/u);
   assert.match(html,/<html\b[^>]*lang="en"/u);
   const description=meta(html,'description');
   assert.ok(description?.trim(),route);
   assert.ok(!descriptions.has(description),`${route}: page-specific description`);
   descriptions.add(description);
   assert.doesNotMatch(html,/<meta[^>]*name="robots"[^>]*content="[^"]*noindex/u,route);
   assert.deepEqual(links(html,'canonical').map(item=>item.href),[origin+route]);
   assert.equal(meta(html,'og:url'),origin+route);
   assert.equal(meta(html,'og:site_name'),suffix);
   assert.equal(meta(html,'twitter:title'),meta(html,'og:title'));
   assert.equal(meta(html,'twitter:description'),description);
   assert.equal(meta(html,'og:description'),description);
   assert.equal(meta(html,'twitter:image'),meta(html,'og:image'));
   assert.equal(meta(html,'twitter:image:alt'),meta(html,'og:image:alt'));
   const image=new URL(meta(html,'og:image'));
   assert.equal(image.origin,origin);
   png(join(directory,image.pathname),1200,630);
   for (const rel of ['icon','mask-icon','apple-touch-icon']) {
    const assets=links(html,rel);
    assert.ok(assets.length,`${route}: ${rel}`);
    for (const asset of assets) assert.ok(readFileSync(join(directory,asset.href)).length,asset.href);
   }
   png(join(directory,links(html,'apple-touch-icon')[0].href),180);
   const manifests=links(html,'manifest');
   assert.equal(manifests.length,kind==='site'?1:0,route);
   if (kind==='site') {
    assert.equal(manifests[0].href,route==='/playground/'?'/playground/manifest.webmanifest':'/manifest.webmanifest');
    const manifest=JSON.parse(readFileSync(join(directory,manifests[0].href),'utf8'));
    assert.equal(manifest.display,route==='/playground/'?'standalone':'browser');
    for (const icon of manifest.icons) {
     const [width,height]=icon.sizes.split('x').map(Number);
     png(join(directory,icon.src),width,height);
    }
   }
   if (route==='/') {
    const json=html.match(/<script type="application\/ld\+json">(.*?)<\/script>/su)?.[1];
    assert.ok(json,`${kind} Home structured identity`);
    const identity=JSON.parse(json);
    assert.equal(identity['@type'],'WebSite');
    assert.equal(identity.name,suffix);
    assert.equal(identity.url,origin+'/');
   }
  }
 }
 for (const route of ['/privacy/','/impressum/','/terms/','/source/']) {
  const html=readFileSync(join('artifacts/website/dist',route,'index.html'),'utf8');
  assert.match(meta(html,'robots'),/noindex/u,route);
 }
 for (const host of ['website','manual']) {
  const html=readFileSync(`artifacts/${host}/dist/404.html`,'utf8');
  assert.match(meta(html,'robots'),/noindex/u,`${host}: missing page`);
 }
 console.log('Identity: exact titles, unique descriptions, canonical/social/icon/manifest output and both public sitemaps verified.');
}
