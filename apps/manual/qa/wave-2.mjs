// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {manualPages} from '../manifest.mjs';
export async function qualifySurfaces({page,origins,check,screenshot}) {
 await check('Every open-surface article reads at desktop and 320px with complete examples kept open',async()=>{
  await page.emulateMedia({forcedColors:'none'});
  for(const width of [1280,320]){
   await page.setViewportSize({width,height:900});
   for(const selected of manualPages.filter(page=>page.wave===2)){
    await page.goto(origins.docs+selected.route);
    await expect(page.locator('h1').first()).toHaveText(selected.title);
    const article=page.locator('.sl-markdown-content');
    assert.ok(await article.locator('p').count(),selected.key);
    assert.equal(await article.locator('details pre').count(),0,selected.key+' must not hide full working examples');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1),true,selected.route+' at '+width);
    if(selected.key==='browser-extension'){
     const image=article.locator('img[src="/assets/manual/settings-policy-bands-light.png"]');
     await expect(image).toHaveCount(1);
     await expect.poll(()=>image.evaluate(node=>node.complete&&node.naturalWidth>0)).toBe(true);
     if(width===1280)await screenshot('wave-2-extension-settings.png');
    }
    if(selected.key==='typescript-library')await expect(article.locator('pre').filter({hasText:'function requireResult'})).toHaveCount(1);
   }
  }
 });
 await check('Browser extension keeps its product title and sidebar label; shared workflows join real articles',async()=>{
  await page.setViewportSize({width:1280,height:900});
  await page.goto(origins.docs+'/use/browser-extension/');
  await expect(page.locator('.sidebar a').filter({hasText:/^Browser extension$/})).toHaveCount(1);
  await page.goto(origins.docs+'/use/shared-workflows/');
  await page.locator('.sl-markdown-content a[href="'+origins.docs+'/use/reports-plans-and-apply/"]').first().click();
  await expect(page.locator('h1').first()).toHaveText('Reports, plans, and apply');
  await expect(page.locator('.sl-markdown-content pre').filter({hasText:'--output desired.json'})).toBeVisible();
  await screenshot('wave-2-report-lifecycle.png');
 });
 await check('Raw Skill setup is the exact canonical source served by the built product',async()=>{
  await page.goto(origins.site+'/');
  const response=await page.evaluate(async()=>{
   const response=await fetch('/setup/skill.md');
   return {status:response.status,text:await response.text()};
  });
  assert.equal(response.status,200);
  assert.equal(response.text,readFileSync('docs/setup/skill.md','utf8'));
 });
 await check('Retired source fragments select the right successor and shared-workflow pages enter joined search',async()=>{
  const state=JSON.parse(readFileSync('apps/manual/authoring-state.json','utf8'));
  const ref=JSON.parse(readFileSync('artifacts/manual/manifest.json','utf8')).ref;
  for(const [source,transfer] of Object.entries(state.transfers)){
   for(const [old,target] of Object.entries(transfer.anchors)){
    const selected=manualPages.find(page=>page.key===target.page);
    await page.goto(origins.site+'/source/?f='+encodeURIComponent(source)+'#'+old);
    await expect(page.locator('[data-source-result]')).toHaveAttribute('href',`https://github.com/Wolfsblvt/diffdevil/blob/${ref}/${selected.source}#${target.anchor}`);
   }
  }
  const {records}=JSON.parse(readFileSync('artifacts/public-search/records.json','utf8'));
  for(const route of ['/use/playground/','/use/coding-agent/','/use/reports-plans-and-apply/'])
   assert.ok(records.some(record=>record.url===origins.docs+route||record.canonical===origins.docs+route),route);
  for(const route of Object.keys(state.routes))assert.equal(records.some(record=>record.url===origins.site+route||record.canonical===origins.site+route),false,route);
 });
}
