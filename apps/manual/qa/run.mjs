// SPDX-License-Identifier: AGPL-3.0-only
/** Exercise actual static files under intercepted canonical HTTPS origins. */
import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { manualPages, origins, pageUrl } from '../manifest.mjs';
import { faqRecords } from '../../website/faq-content.mjs';
const root = resolve('.'), out = join(root,'artifacts/manual/qa');
mkdirSync(out,{recursive:true});
const ref = execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const manifest = JSON.parse(readFileSync('artifacts/manual/manifest.json','utf8'));
assert.equal(manifest.ref,ref); assert.equal(manifest.qa,true);
const records = JSON.parse(readFileSync('artifacts/public-search/records.json','utf8'));
const faq = faqRecords(readFileSync('artifacts/website/dist/faq/index.html','utf8'));
const result = {ref,checks:[],failures:[],unexpectedRequests:[],pageErrors:[],screenshots:[],limitations:['Intercepted static origins, not live deployment.','DOM/keyboard evidence, not an actual screen-reader user journey.']};
const mime = {'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.woff2':'font/woff2','.wasm':'application/wasm','.pf_fragment':'application/octet-stream','.pf_index':'application/octet-stream','.pf_meta':'application/octet-stream'};
const browser = await chromium.launch();
const context = await browser.newContext({viewport:{width:1280,height:900},colorScheme:'dark',reducedMotion:'reduce'});
const redirects = [];
for (const host of ['website','manual']) {
 const file = `artifacts/${host}/dist/_redirects`;
 for (const line of readFileSync(file,'utf8').split('\n').filter(Boolean)) {
  const [from,to,status] = line.trim().split(/\s+/u);
  redirects.push({origin:host==='manual'?origins.docs:origins.site,from,to,status:Number(status)});
 }
}
await context.route('**/*',async route=>{
 const url = new URL(route.request().url());
 if (!Object.values(origins).includes(url.origin)) { result.unexpectedRequests.push(url.href); await route.abort(); return; }
 for (const rule of redirects) {
  const source = rule.from.startsWith('http') ? rule.from : rule.origin+rule.from;
  const stem = source.endsWith('*') ? source.slice(0,-1) : source;
  const path = url.origin+url.pathname;
  if (source.endsWith('*') ? path.startsWith(stem) : path===source) {
   const target = new URL(rule.to.replace(':splat',path.slice(stem.length)),url.origin);
   target.search = url.search;
   await route.fulfill({status:rule.status,headers:{location:target.href}}); return;
  }
 }
 const host = url.origin===origins.docs?'manual':url.origin===origins.site?'website':undefined;
 if (!host) { await route.fulfill({status:404,body:'No selected static host'}); return; }
 let path;
 try { path = decodeURIComponent(url.pathname); } catch { await route.fulfill({status:400}); return; }
 if (path.split('/').includes('..') || path.includes('\\')) { await route.fulfill({status:400}); return; }
 let file = join(root,`artifacts/${host}/dist`,path);
 if (path.endsWith('/')) file=join(file,'index.html');
 if (!existsSync(file) || !statSync(file).isFile()) { await route.fulfill({status:404,body:'Not found'}); return; }
 await route.fulfill({status:200,contentType:mime[extname(file)]??'application/octet-stream',body:readFileSync(file)});
});
const page = await context.newPage();
page.on('pageerror',error=>result.pageErrors.push(error.message));
async function check(name,fn) {
 try { await fn(); result.checks.push(name); console.log('PASS '+name); }
 catch(error) { result.failures.push({name,error:error.stack??String(error)}); console.error('FAIL '+name+': '+error.message); await page.screenshot({path:join(out,`failure-${result.failures.length}.png`),fullPage:true}).catch(()=>{}); }
}
async function screenshot(name) { await page.screenshot({path:join(out,name),fullPage:true}); result.screenshots.push(name); }
try {
 await check('Every selected manual route has its actual H1 and exact source/edit provenance',async()=>{
  for (const selected of manualPages) {
   const response = await page.goto(pageUrl(selected.key)); assert.equal(response.status(),200,selected.key);
   await expect(page.locator('h1').first()).toHaveText(selected.title);
   await expect(page.locator('.docs-provenance a').filter({hasText:'View source'})).toHaveAttribute('href',`https://github.com/Wolfsblvt/diffdevil/blob/${ref}/${selected.source}`);
   await expect(page.locator('.docs-provenance a').filter({hasText:'Edit on GitHub'})).toHaveAttribute('href',`https://github.com/Wolfsblvt/diffdevil/edit/docs/public-manual/${selected.source}`);
   assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),pageUrl(selected.key));
   assert.match(await page.locator('meta[name=robots]').getAttribute('content'),/noindex/u);
  }
  assert.equal(existsSync('artifacts/manual/dist/faq/index.html'),false);
 });
 await check('Root alias and www compatibility are matching 308 rules preserving query and fragment',async()=>{
  const seen=[]; const observe=response=>{if(response.status()===308)seen.push(response.url());}; page.on('response',observe);
  await page.goto(origins.docs+'/start/what-is-diffdevil/?keep=1#related-questions');
  assert.equal(page.url(),origins.docs+'/?keep=1#related-questions');
  await page.goto(origins.compatibility+'/faq/?keep=2#changed-vs-churn');
  assert.equal(page.url(),origins.site+'/faq/?keep=2#changed-vs-churn');
  page.off('response',observe); assert.equal(seen.length,2);
 });
 await check('Resolver succeeds only for allow-listed IDs and refuses arbitrary files, URLs and duplicate parameters',async()=>{
  await page.goto(origins.site+'/source/?f=docs%2Fmanual%2Fuse%2Fcli.md#related-questions');
  await expect(page.locator('[data-source-result]')).toHaveAttribute('href',`https://github.com/Wolfsblvt/diffdevil/blob/${ref}/docs/manual/use/cli.md#related-questions`);
  await expect(page.locator('[data-source-result]')).toBeFocused();
  for (const query of ['f=../secret','f=https://example.org/','f=__proto__','f=docs/manual/missing.md','f=README.md&f=SECURITY.md']) {
   await page.goto(origins.site+'/source/?'+query);
   await expect(page.locator('[data-source-result]')).toBeHidden();
   await expect(page.locator('[data-source-status]')).toHaveText('No recognized source was selected.');
  }
 });
 await check('Linked categories and disclosure controls remain independent and keyboard operable',async()=>{
  await page.goto(origins.docs+'/');
  const managed=page.locator('[data-slw-group="Managed App"]');
  const details=managed.locator(':scope > details');
  await expect(details).not.toHaveAttribute('open','');
  const control=details.locator(':scope > summary'); await control.focus(); await page.keyboard.press('Space');
  await expect(details).toHaveAttribute('open','');
  assert.equal(await managed.locator(':scope > .slw-group-heading a').count(),1);
  const target=await control.getAttribute('aria-controls'); assert.equal(await page.locator('[id="'+target+'"]').count(),1);
  await managed.locator(':scope > .slw-group-heading a').click(); await expect(page.locator('h1').first()).toHaveText('Managed App');
  await expect(page.locator('[data-slw-group="Managed App"] > details')).toHaveAttribute('open','');
  await page.goto(pageUrl('cli-reference'));
  await expect(page.locator('[data-slw-group="REFERENCE"] > details')).toHaveAttribute('open','');
  await expect(page.locator('[data-slw-group="Interfaces"] > details')).toHaveAttribute('open','');
  await page.goto(origins.docs+'/');
  await expect(page.locator('[data-slw-group="REFERENCE"] > details')).not.toHaveAttribute('open','');
 });
 await check('Five shared-package alerts and an open complete example render in the real article',async()=>{
  await page.goto(origins.docs+'/__qualification/reading/');
  const kinds=await page.locator('[data-slw-alert]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-slw-alert').toUpperCase()).sort());
  assert.deepEqual(kinds,['CAUTION','IMPORTANT','NOTE','TIP','WARNING']);
  await expect(page.locator('.sl-markdown-content pre').first()).toBeVisible();
  const extra=page.locator('.sl-markdown-content details'); await expect(extra).not.toHaveAttribute('open','');
  await extra.locator('summary').focus(); await page.keyboard.press('Enter'); await expect(extra).toHaveAttribute('open','');
  assert.equal(await page.locator('.sl-markdown-content img').evaluate(image=>image.complete && image.naturalWidth>0),true);
  await screenshot('reading-dark-desktop.png');
 });
 await check('Theme continuity uses the shared control, owned handoff and before-paint state',async()=>{
  await page.goto(origins.site+'/');
  const control=page.locator('[data-theme-control]').first();
  await expect(page.locator('html')).toHaveAttribute('data-theme-pref','dark');
  await control.click(); await expect(page.locator('html')).toHaveAttribute('data-theme-pref','auto');
  await control.click(); await expect(page.locator('html')).toHaveAttribute('data-theme-pref','light');
  await page.locator('.primary-nav a').filter({hasText:/^Docs$/u}).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme-pref','light'); assert.equal(new URL(page.url()).origin,origins.docs); assert.equal(new URL(page.url()).searchParams.has('dd-theme'),false);
  await page.locator('.primary-nav a').filter({hasText:/^FAQ$/u}).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme-pref','light'); assert.equal(new URL(page.url()).pathname,'/faq/');
  await page.goto(origins.docs+'/__qualification/reading/'); await screenshot('reading-light-desktop.png');
 });
 await check('Related FAQ anchors open their existing disclosure without a second shell',async()=>{
  await page.goto(pageUrl('changed-lines-and-raw-churn'));
  await page.locator('.sl-markdown-content a[href*="/faq/#changed-vs-churn"]').click();
  assert.equal(new URL(page.url()).pathname,'/faq/'); assert.equal(new URL(page.url()).hash,'#changed-vs-churn');
  await expect(page.locator('#changed-vs-churn')).toBeVisible();
  const article=page.locator('[data-faq-id="changed-vs-churn"]'); await expect(article.locator('details')).toHaveAttribute('open','');
  assert.equal(await page.locator('.slw-sidebar').count(),0);
 });
 await check('Joined search carries SITE, DOCS and question-level FAQ records without leakage',async()=>{
  assert.equal(records.ref,ref);
  assert.deepEqual([...new Set(records.records.map(record=>record.kind))].sort(),['DOCS','FAQ','SITE']);
  assert.equal(records.records.filter(record=>record.kind==='FAQ').length,faq.length);
  assert.equal(records.records.some(record=>new URL(record.url).hostname==='docs.diffdevil.dev'),false);
  assert.equal(records.records.some(record=>/\/(source|privacy|impressum|__qualification)\//u.test(record.url)),false);
  const hash=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
  assert.equal(hash('artifacts/website/dist/pagefind/pagefind.js'),hash('artifacts/manual/dist/pagefind/pagefind.js'));
  await page.goto(origins.docs+'/'); await page.keyboard.press('Control+k');
  const dialog=page.locator('[data-search-dialog]'); await expect(dialog).toBeVisible();
  const input=page.locator('[data-search-input]'); await expect(input).toBeFocused();
  await input.fill('GitHub already shows additions');
  await expect(page.locator('[data-search-results] a[data-kind="faq"]').first()).toBeVisible({timeout:15000});
  await page.keyboard.press('ArrowDown'); assert.equal(await page.locator('[data-search-results] a').first().evaluate(node=>node===document.activeElement),true);
  await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible();
 });
 await check('Narrow/mobile and forced-colors layouts keep page width bounded with named controls',async()=>{
  for (const width of [1280,1024,768,640,390,320]) {
   await page.setViewportSize({width,height:900}); await page.goto(origins.docs+'/__qualification/reading/');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1),true,`Horizontal page overflow at ${width}px`);
   for (const button of await page.locator('button:visible').all()) assert.ok((await button.getAttribute('aria-label')) || (await button.getAttribute('aria-labelledby')) || (await button.getAttribute('title')) || (await button.innerText()).trim(),`Unnamed button at ${width}px`);
   if(width===390 || width===320) await screenshot(`reading-${width}.png`);
  }
  const menu=page.locator('.sl-menu-button'); await expect(menu).toBeVisible(); await menu.focus(); await page.keyboard.press('Enter');
  await expect(menu).toHaveAttribute('aria-expanded','true'); await page.keyboard.press('Enter'); await expect(menu).toHaveAttribute('aria-expanded','false');
  await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'}); await screenshot('reading-forced-colors.png');
  await page.locator('.sl-markdown-content details > summary').focus();
  assert.notEqual(await page.locator('.sl-markdown-content details > summary').evaluate(node=>getComputedStyle(node).outlineStyle),'none');
 });
 await check('Shared shell has no page-script errors or unexpected external requests',async()=>{
  assert.deepEqual(result.pageErrors,[]); assert.deepEqual(result.unexpectedRequests,[]);
 });
} finally {
 result.ok=result.failures.length===0;
 writeFileSync(join(out,'result.json'),JSON.stringify(result,null,2)+'\n');
 await context.close(); await browser.close();
}
if (!result.ok) process.exitCode=1;
