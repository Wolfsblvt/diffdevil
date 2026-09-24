// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {manualPages, pages, pageUrl, origins} from './manifest.mjs';
import {migrations, siteRedirects, validateProjection, pageIsCurrent} from './migration.mjs';
import {sourceTargets, resolveSource} from './source-resolver.mjs';
import {fragmentDestination} from './fragment-destination.mjs';
import {createStaticHandler} from './static-handler.mjs';
import {indexable, qualifyFaqRecords} from './search-index.mjs';
import {entries} from '../website/docs-manifest.mjs';
import {faqRecords} from '../website/faq-content.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const read=path=>readFileSync(join(root,path),'utf8');
const state=JSON.parse(read('apps/manual/authoring-state.json'));
const ref=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const targets=sourceTargets({ref,state,exists:path=>existsSync(join(root,path)),legacySources:entries.map(entry=>entry.source)});

test('The complete manual and separate FAQ have no competing current apex article',()=>{
 assert.equal(manualPages.length,41);
 assert.equal(pages.filter(page=>page.kind==='FAQ').length,1);
 for(const page of manualPages)assert.equal(pageIsCurrent(page.key,state),true,page.key);
 const routes=siteRedirects(state,entries,targets);
 assert.equal(new Set(routes.map(rule=>rule.from)).size,routes.length);
 for(const entry of entries){
  const route=entry.route??(entry.slug?`/docs/${entry.slug}/`:'/docs/');
  const destination=routes.find(rule=>rule.from===route);
  assert.ok(destination,route);
  if(entry.repositoryOnly)assert.equal(destination.to,targets[entry.source].url);
  else assert.equal(destination.to,pageUrl(state.routes[route].target));
 }
 assert.throws(()=>siteRedirects(state,[...entries,{source:'unknown.md',slug:'unknown'}],targets),/no disposition/u);
 assert.throws(()=>siteRedirects(state,entries,{}),/Unqualified repository/u);
});

test('All emitted route destinations preserve query values without reaching an external provider',async()=>{
 const rules=siteRedirects(state,entries,targets);
 const handler=createStaticHandler({...origins,host:'site',redirects:rules});
 const assets={ASSETS:{fetch:()=>{throw new Error('A selected redirect reached static assets');}}};
 for(const rule of rules){
  const response=await handler.fetch(new Request(origins.site+rule.from+'?keep=a&keep=b%20c&f=ignored'),assets);
  assert.equal(response.status,308,rule.from);
  const expected=new URL(rule.to);expected.search='?keep=a&keep=b%20c&f=ignored';
  assert.equal(response.headers.get('location'),expected.href,rule.from);
 }
 for(const path of ['/faq/','/docs/cli/','/playground/']){
  const response=await handler.fetch(new Request(origins.compatibility+path+'?q=kept'),assets);
  assert.equal(response.status,308);assert.equal(response.headers.get('location'),origins.site+path+'?q=kept');
 }
});

test('Old fragment handoff preserves repeated query values and refuses malformed or unmapped input',()=>{
 const target=pageUrl('troubleshooting')+'#an-app-operation-needs-repair';
 const aliases={old:target};
 assert.equal(fragmentDestination(pageUrl('detail-language')+'?q=one&q=two%20words#old',aliases),target.replace('#','?q=one&q=two%20words#'));
 assert.equal(fragmentDestination(pageUrl('detail-language')+'#%6Fld',aliases),target);
 assert.equal(fragmentDestination(pageUrl('detail-language')+'#%ZZ',aliases),null);
 assert.equal(fragmentDestination(pageUrl('detail-language')+'#other',aliases),null);
 assert.equal(fragmentDestination('not a URL',aliases),null);
 assert.equal(fragmentDestination(pageUrl('cli')+'?q=keep#same',{same:pageUrl('cli')+'#same'}),null);
});

test('Retained raw and technical sources keep exact GitHub identities while their old projections move',()=>{
 for(const [route,selection] of Object.entries(state.routes)){
  const capture=selection.projection;if(!capture)continue;
  const bytes=execFileSync('git',['show',`${capture.fromRef}:${capture.source}`],{cwd:root});
  assert.equal(createHash('sha256').update(bytes).digest('hex'),capture.fromSourceSha256,route);
  assert.equal(resolveSource('/source/?f='+encodeURIComponent(capture.source),targets),`https://github.com/Wolfsblvt/diffdevil/blob/${ref}/${capture.source}`);
  assert.deepEqual(Object.keys(capture.anchors).sort(),[...new Set(capture.oldAnchors)].sort());
 }
 const observed={source:'retained.md',digest:'a'.repeat(64),anchors:['_top','old'],targetAnchors:{cli:['_top','current']}};
 const selection={projection:{source:'retained.md',fromSourceSha256:observed.digest,oldAnchors:observed.anchors,anchors:{_top:{page:'cli',anchor:'_top'},old:{page:'cli',anchor:'current'}}}};
 assert.doesNotThrow(()=>validateProjection('/old/',selection,observed));
 assert.throws(()=>validateProjection('/old/',selection,{...observed,digest:'b'.repeat(64)}),/capture/u);
 assert.throws(()=>validateProjection('/old/',selection,{...observed,anchors:['_top']}),/inventory/u);
 assert.throws(()=>validateProjection('/old/',selection,{...observed,targetAnchors:{cli:['_top']}}),/successor/u);
});

test('Retired families have successors, no forwarding files and finite fragment-safe source IDs',()=>{
 for(const family of migrations){
  const transfer=state.transfers[family.source];assert.ok(transfer,family.source);
  if(transfer.phase==='retired')assert.equal(existsSync(join(root,family.source)),false,family.source);
  else assert.ok(transfer.residueJob&&existsSync(join(root,family.source)),family.source);
  for(const [old,destination] of Object.entries(transfer.anchors)){
   const selected=pages.find(page=>page.key===destination.page);assert.ok(selected);
   assert.equal(resolveSource('/source/?f='+encodeURIComponent(family.source)+'#'+encodeURIComponent(old),targets),`https://github.com/Wolfsblvt/diffdevil/blob/${ref}/${selected.source}#${encodeURIComponent(destination.anchor)}`);
  }
 }
 for(const query of ['f=../secret','f=https://example.org','f=constructor','f=__proto__','f=README.md&f=README.md'])assert.equal(resolveSource('/source/?'+query,targets),null);
});

test('Current search accepts reader pages and rejects every legacy, technical, historical and whole-FAQ route',()=>{
 const body='<main data-pagefind-body>Reader content</main>';
 for(const page of manualPages)assert.equal(indexable(page.route,body),true,page.key);
 for(const entry of entries)assert.equal(indexable(entry.route??`/docs/${entry.slug}/`,body),false,entry.source);
 for(const path of ['/faq/','/source/','/privacy/','/impressum/','/404/','/__qualification/reading/'])assert.equal(indexable(path,body),false,path);
 for(const path of ['/','/playground/','/examples/','/extension/','/app/'])assert.equal(indexable(path,body),true,path);
 const faq=qualifyFaqRecords(faqRecords(read('docs/manual/faq.md')));
 assert.equal(faq.length,20);assert.equal(new Set(faq.map(item=>item.canonical)).size,faq.length);
 assert.throws(()=>qualifyFaqRecords([...faq,faq[0]]),/unique/u);
});
