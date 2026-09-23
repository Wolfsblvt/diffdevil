// SPDX-License-Identifier: AGPL-3.0-only
/** Exercise the authored policy/reference family through the built reading surface. */
import assert from 'node:assert/strict';
import { expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { manualPages } from '../manifest.mjs';

export async function qualifyPolicyReference({page, origins, check, screenshot}) {
 await check('Policy and reference articles retain open complete examples at two widths in both themes', async()=>{
  await page.emulateMedia({forcedColors:'none'});
  for(const theme of ['light','dark']) for(const width of [1280,320]) {
   await page.setViewportSize({width,height:900});
   for(const selected of manualPages.filter(page=>page.wave===3)) {
    await page.goto(origins.docs+selected.route);
    await page.evaluate(theme=>{document.documentElement.dataset.theme=theme;document.documentElement.dataset.themePref=theme;},theme);
    await expect(page.locator('h1').first()).toHaveText(selected.title);
    const article=page.locator('.sl-markdown-content');
    assert.ok(await article.locator('p').count(),selected.key);
    assert.equal(await article.locator('details pre').count(),0,selected.key);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1),true,selected.key+' '+theme+' '+width);
    if(width===320&&['start-with-a-preset','typescript-api-reference','schemas-and-compatibility','detail-language'].includes(selected.key)) await screenshot(`wave-3-${selected.key}-${theme}-${width}.png`);
   }
  }
 });
 await check('Reference deep links preserve exact declarations and repository-only language architecture',async()=>{
  await page.setViewportSize({width:1280,height:900});
  await page.goto(origins.docs+'/reference/typescript-api/');
  await page.locator('.sl-markdown-content a[href="#api-policy-evaluate-evaluatepolicyquery"]').first().click();
  assert.equal(new URL(page.url()).hash,'#api-policy-evaluate-evaluatepolicyquery');
  await expect(page.locator('[id="api-policy-evaluate-evaluatepolicyquery"]')).toHaveCount(1);
  await page.goto(origins.docs+'/reference/detail-language/#syntax-and-source-locations');
  await expect(page.locator('#syntax-and-source-locations')).toBeVisible();
  await expect(page.locator('.sl-markdown-content a[href*="f=docs%2Flanguage%2Fparser-architecture.md"]')).toHaveCount(1);
  const {records}=JSON.parse(readFileSync('artifacts/public-search/records.json','utf8'));
  const manifest=JSON.parse(readFileSync('artifacts/manual/manifest.json','utf8'));
  for(const selected of manifest.records.filter(page=>page.wave===3&&page.current)) assert.ok(records.some(record=>record.url===origins.docs+selected.route),selected.key);
  assert.equal(records.some(record=>record.url===origins.site+'/docs/policies-and-detail/parser-architecture/'),false);
 });
}
