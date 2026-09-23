// SPDX-License-Identifier: AGPL-3.0-only
/** Real reading routes only; no invented dashboard or provider-facing interaction. */
import assert from 'node:assert/strict';
import {expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {manualPages,pageUrl} from '../manifest.mjs';
import {entries as legacyEntries} from '../../website/docs-manifest.mjs';
export async function qualifyManagedHelp({page,origins,check,screenshot}) {
 await check('Seven Managed App and Help articles reflow in both themes without hiding operating prerequisites',async()=>{
  await page.emulateMedia({forcedColors:'none'});
  for(const theme of ['light','dark'])for(const width of [1280,320]){
   await page.setViewportSize({width,height:900});
   for(const selected of manualPages.filter(p=>p.wave===4)){
    await page.goto(pageUrl(selected.key));
    await page.evaluate(theme=>{document.documentElement.dataset.theme=theme;document.documentElement.dataset.themePref=theme;},theme);
    await expect(page.locator('h1').first()).toHaveText(selected.title);
    const article=page.locator('.sl-markdown-content');
    assert.ok(await article.locator('p').count());
    assert.equal(await article.locator('details pre').count(),0,selected.key);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1),true,selected.key+' '+width+' '+theme);
    assert.equal(await page.locator('meta[name="diffdevil-availability"]').getAttribute('content'),selected.availability);
    if(width===320&&['self-host-app','troubleshooting'].includes(selected.key))await screenshot(`wave-4-${selected.key}-${theme}-${width}.png`);
   }
  }
 });
 await check('Managed adoption, self-hosting, repair and exact operator source form one reader journey',async()=>{
  await page.setViewportSize({width:1280,height:900});
  await page.goto(pageUrl('managed-app'));
  await page.locator(`.sl-markdown-content a[href="${pageUrl('managed-service')}"]`).first().click();
  await expect(page.locator('h1').first()).toHaveText('Use the managed service');
  await page.goto(pageUrl('self-host-app'));
  await expect(page.locator('.sl-markdown-content pre').filter({hasText:'d1 migrations apply APP_DB --local'})).toHaveCount(1);
  await page.locator('.sl-markdown-content a[href*="f=apps%2Fgithub-app%2FREADME.md"]').first().click();
  const ref=JSON.parse(readFileSync('artifacts/manual/manifest.json','utf8')).ref;
  await expect(page.locator('[data-source-result]')).toHaveAttribute('href',`https://github.com/Wolfsblvt/diffdevil/blob/${ref}/apps/github-app/README.md`);
  await page.goto(pageUrl('troubleshooting')+'#an-app-operation-needs-repair');
  await expect(page.locator('#an-app-operation-needs-repair')).toBeVisible();
  await page.locator(`.sl-markdown-content a[href="${pageUrl('self-host-app')}#observe-and-repair-by-stage"]`).click();
  await expect(page.locator('#observe-and-repair-by-stage')).toBeVisible();
  await screenshot('wave-4-recovery-desktop.png');
 });
 await check('Five retired language routes keep semantic fragment destinations including the Troubleshooting split',async()=>{
  for(const [old,fragment,key,anchor] of [
   ['syntax','source-unit-and-character-model','detail-language','source-unit-and-character-model'],
   ['types-and-measurements','numeric-evidence-states','detail-language','numeric-evidence-states'],
   ['collections-and-scopes','strict-output-boundary','detail-language','strict-output-boundary'],
   ['standard-library','errors-and-discovery','detail-language','errors-and-discovery'],
   ['diagnostics-and-limits','coordinates','troubleshooting','a-diagnostic-points-into-yaml-an-expression-or-a-unicode-line'],
  ]){
   await page.goto(origins.site+'/docs/policies-and-detail/'+old+'/#'+fragment);
   await expect(page).toHaveURL(pageUrl(key)+'#'+anchor);
   await expect(page.locator('[id="'+anchor+'"]').first()).toBeVisible();
  }
 });
 await check('Joined current search contains all seven chapters and no historical or retired duplicate',async()=>{
  const {records}=JSON.parse(readFileSync('artifacts/public-search/records.json','utf8'));
  for(const selected of manualPages.filter(p=>p.wave===4||p.key==='detail-language'))assert.ok(records.some(r=>r.url===pageUrl(selected.key)),selected.key);
  for(const entry of legacyEntries.filter(e=>e.historical)){
   const route=entry.route??`/docs/${entry.slug}/`;
   assert.equal(records.some(r=>r.url===origins.site+route),false,entry.source);
  }
  assert.equal(records.some(r=>r.url?.includes('/docs/policies-and-detail/')),false);
  await page.goto(pageUrl('technical-project-docs'));
  await page.locator('.sl-markdown-content a[href*="f=docs%2Freleases%2Fv1.0.0.md"]').click();
  await expect(page.locator('[data-source-result]')).toHaveAttribute('href',/\/docs\/releases\/v1\.0\.0\.md$/u);
 });
}
