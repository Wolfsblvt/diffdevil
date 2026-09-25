// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { pages, manualPages, byKey, sidebar, pageUrl, validateManifest, packageSource } from './manifest.mjs';
import { migrations, retainedFamilies, pageIsCurrent, validateTransfer, legacyRedirects, validateRetiredRoutes } from './migration.mjs';
import { sourceTargets, resolveSource } from './source-resolver.mjs';
import { themeScript } from '../website/src/lib/theme-script.mjs';
import { themeTransferUrl } from '../website/src/lib/theme-transfer.mjs';
import { searchKind } from '../website/src/lib/search-kinds.mjs';
const state = JSON.parse(readFileSync(new URL('./authoring-state.json',import.meta.url),'utf8'));
const ref = '1'.repeat(40);

test('explicit sources, routes and the separate FAQ form one unambiguous selection',()=>{
 assert.equal(validateManifest(),true);
 assert.equal(new Set(pages.map(page=>page.key)).size,pages.length);
 assert.equal(pages.filter(page=>page.kind==='FAQ').length,1);
 assert.equal(pageUrl('faq'),'https://diffdevil.dev/faq/');
 assert.equal(byKey.get('faq').source,'docs/manual/faq.md');
 assert.equal(pageUrl('what-is-diffdevil'),'https://docs.diffdevil.dev/');
 assert.deepEqual(byKey.get('what-is-diffdevil').aliases,['/start/what-is-diffdevil/']);
 assert.equal(pageUrl('effects-and-templates'),'https://docs.diffdevil.dev/policy/effects-and-templates/');
 assert.notEqual(byKey.get('effects-and-templates').source.replace('docs/manual','').replace('.md','/'),byKey.get('effects-and-templates').route);
 assert.throws(()=>validateManifest([...pages,pages[0]]),/Duplicate/u);
});
test('linked category pages keep separate disclosure defaults and real route slugs',()=>{
 const all=[]; const collect=items=>{for(const item of items){all.push(item);collect(item.items??[]);}}; collect(sidebar({includeFAQ:true}));
 for(const key of ['surfaces','managed-app','shared-workflows','interfaces','language-and-contracts']){
  const page=byKey.get(key),group=all.find(item=>item.label===page.title);
  assert.ok(group?.items.length); assert.equal(group.slug,page.route.slice(1,-1)); assert.equal(group.defaultOpen,page.defaultOpen);
 }
 assert.equal(all.find(item=>item.label==='REFERENCE').defaultOpen,false);
 assert.equal(all.find(item=>item.label==='FAQ').link,pageUrl('faq'));
});
test('scaffolds are explicit and capability standing is not authoring readiness',()=>{
 for(const page of manualPages){
  const body=readFileSync(new URL('../../'+page.source,import.meta.url),'utf8');
  assert.ok(body.startsWith('# '+page.title+'\n'));
  assert.ok(['scaffold','authored'].includes(state.pages[page.key].status));
  const notes=[...body.matchAll(/^> \[!NOTE\]\r?\n> \*\*In development\*\*/gmu)];
  assert.equal(notes.length,page.availability==='in-development'?1:0);
  if(state.pages[page.key].status==='scaffold') assert.equal(pageIsCurrent(page.key,state),false);
 }
 assert.equal(packageSource.commit,'22d4567006ec7a33d890fab2f3d3515332498a90');
 assert.ok(retainedFamilies.some(row=>row.sources.includes('skills/diffdevil/**')));
});
test('resolver succeeds only for finite present source IDs and exact provenance',()=>{
 const targets=sourceTargets({ref,state,exists:path=>path==='docs/manual/README.md'||path==='SECURITY.md'});
 assert.equal(resolveSource('/source/?f=docs%2Fmanual%2FREADME.md#part',targets),`https://github.com/Wolfsblvt/diffdevil/blob/${ref}/docs/manual/README.md#part`);
 for(const id of ['../secret','https://evil.invalid/','__proto__','constructor','docs/manual/missing.md']) assert.equal(resolveSource('/source/?f='+encodeURIComponent(id),targets),null);
 assert.equal(resolveSource('/source/?f=SECURITY.md&f=README.md',targets),null);
 assert.equal(resolveSource('/source/',targets),null);
 assert.throws(()=>sourceTargets({ref:'main',state,exists:()=>true}),/exact commit/u);
});
test('split migrations cannot transfer only the convenient successor',()=>{
 const row=migrations.find(row=>row.source==='docs/guides/auto-label-pull-requests.md');
 const local={pages:{'label-pull-requests':{status:'authored'},'github-actions':{status:'scaffold'}},transfers:{}};
 const transfer={phase:'retired',primary:row.primary,fromSourceSha256:'a'.repeat(64),oldAnchors:['old'],anchors:{old:{page:row.primary,anchor:'new'}},redirects:true,sourceIds:true,search:true};
 const observed={sourceExists:false,inboundLinks:[],targetAnchors:{[row.primary]:['new']}};
 assert.throws(()=>validateTransfer(row,transfer,local,observed),/successor not authored/u);
 local.pages['github-actions'].status='authored';
 assert.doesNotThrow(()=>validateTransfer(row,transfer,local,observed));
 assert.throws(()=>validateTransfer(row,transfer,local,{...observed,sourceExists:true}),/forwarding Markdown/u);
 assert.throws(()=>validateTransfer(row,transfer,local,{...observed,inboundLinks:['README.md']}),/inbound links/u);
 assert.throws(()=>validateTransfer(row,transfer,local,{...observed,targetAnchors:{}}),/successor anchor/u);
 assert.throws(()=>legacyRedirects({pages:{},routes:{'/docs/cli/':{target:'cli'}}}),/Premature/u);
 assert.throws(()=>legacyRedirects({routes:{'/unknown/':{target:'cli'}}}),/Unknown legacy/u);
});
test('source-ID fragments can move to a different successor without accepting arbitrary paths',()=>{
 const local={pages:{},transfers:{'docs/integration/cli.md':{phase:'retired',primary:'cli',anchors:{output:{page:'cli-reference',anchor:'formats'}}}}};
 const targets=sourceTargets({ref,state:local,exists:()=>true});
 assert.equal(resolveSource('/source/?f=docs/integration/cli.md#output',targets),`https://github.com/Wolfsblvt/diffdevil/blob/${ref}/docs/manual/reference/cli.md#formats`);
});
function initial({url='https://diffdevil.dev/',stored={},light=false}={}){
 const attrs={},storage=new Map(Object.entries(stored)),history={state:null,replaceState(_s,_t,path){this.path=path;}};
 vm.runInNewContext(themeScript,{document:{addEventListener(){},documentElement:{setAttribute:(k,v)=>attrs[k]=v}},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},URL,location:{href:url},history,window:{matchMedia:()=>({matches:light})}});
 return {attrs,storage,history};
}
test('theme stays dark-first and preserves Auto/bounce before first paint',()=>{
 assert.equal(initial({light:true}).attrs['data-theme'],'dark');
 const auto=initial({stored:{'diffdevil.theme':'system'},light:true});
 assert.equal(auto.attrs['data-theme'],'light'); assert.equal(auto.attrs['data-theme-pref'],'auto'); assert.equal(auto.attrs['data-theme-next'],'dark');
});
test('cross-host handoff is finite, preserves query/fragment, and does not invent shared storage',()=>{
 const url=themeTransferUrl('https://docs.diffdevil.dev/use/?q=a#heading','https://diffdevil.dev/','auto','light');
 assert.equal(new URL(url).searchParams.get('dd-theme'),'auto.light');
 const received=initial({url,light:false});
 assert.equal(received.attrs['data-theme-pref'],'auto'); assert.equal(received.attrs['data-theme-next'],'light'); assert.equal(received.history.path,'/use/?q=a#heading');
 assert.equal(themeTransferUrl('https://app.diffdevil.dev/','https://diffdevil.dev/','light','dark'),'https://app.diffdevil.dev/');
 assert.equal(themeTransferUrl('/faq/','https://diffdevil.dev/','light','dark'),'https://diffdevil.dev/faq/');
 assert.equal(initial({url:'https://docs.diffdevil.dev/?dd-theme=evil.dark'}).attrs['data-theme'],'dark');
 assert.equal(initial({url:'https://docs.diffdevil.dev/?dd-theme=light.dark&dd-theme=dark.light'}).attrs['data-theme'],'dark');
});
test('search kind is explicit metadata, independent of source layout or collapsed navigation',()=>{
 assert.equal(searchKind('https://docs.diffdevil.dev/reference/cli/'),'DOCS');
 assert.equal(searchKind('/faq/#changed-lines',{kind:'FAQ'}),'FAQ');
 assert.equal(searchKind('/anything/',{kind:'DOCS'}),'DOCS');
 assert.equal(searchKind('/playground/'),'SITE');
});


// The same handler is emitted into both actual static outputs.
import { createStaticHandler } from './static-handler.mjs';
test('Matching-host 308 aliases preserve query and unrelated requests reach static assets',async()=>{
 const origins={site:'https://diffdevil.dev',docs:'https://docs.diffdevil.dev',compatibility:'https://www.diffdevil.dev'};
 const seen=[];
 const env={ASSETS:{fetch:async request=>{seen.push(request.url);return new Response('asset');}}};
 const site=createStaticHandler({...origins,host:'site',redirects:[]});
 const docs=createStaticHandler({...origins,host:'docs',redirects:[{from:'/start/what-is-diffdevil/',to:origins.docs+'/'}]});
 for(const method of ['GET','POST']) {
  const response=await site.fetch(new Request(origins.compatibility+'/faq/?q=hello%20world',{method}),env);
  assert.equal(response.status,308);
  assert.equal(response.headers.get('location'),origins.site+'/faq/?q=hello%20world');
 }
 const alias=await docs.fetch(new Request(origins.docs+'/start/what-is-diffdevil/?keep=1'),env);
 assert.equal(alias.status,308);assert.equal(alias.headers.get('location'),origins.docs+'/?keep=1');
 for(const url of [origins.docs+'/unknown/?f=https://evil.invalid',origins.docs+'/assets/site.css',origins.site+'/start/what-is-diffdevil/']) {
  const response=await docs.fetch(new Request(url),env);assert.equal(await response.text(),'asset');
 }
 assert.equal(seen.length,3);
});

test('A source retirement cannot silently leave its public route behind',()=>{
 const local={transfers:{'old.md':{phase:'retired'}}};
 const entries=[{source:'old.md',slug:'old'}];
 assert.throws(()=>validateRetiredRoutes(local,entries,[]),/missing legacy route/u);
 assert.doesNotThrow(()=>validateRetiredRoutes(local,entries,[{from:'/docs/old/',to:pageUrl('cli'),status:308}]));
});
