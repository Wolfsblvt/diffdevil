// SPDX-License-Identifier: AGPL-3.0-only
/** Joined Help contracts: source transport, safe executable specimens and finite routing. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,mkdtempSync,rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {pages,manualPages} from './manifest.mjs';
import {sourceTargets,resolveSource,repositorySources} from './source-resolver.mjs';
import {pageIsCurrent,isRetired,legacyRedirects} from './migration.mjs';
import {generatedIsland} from './generated-islands.mjs';
import {committedIslands} from './generated-content.mjs';
import {indexable} from './search-index.mjs';
import {entries as legacyEntries} from '../website/docs-manifest.mjs';
import {readHistoricalSource} from './historical-source.mjs';
const root=resolve(import.meta.dirname,'../..'),read=p=>readFileSync(join(root,p),'utf8');
const base='c708cebe95fd9325f7ef548148ab9d24b31b2f7e';
const state=JSON.parse(read('apps/manual/authoring-state.json'));
const wave=pages.filter(p=>p.wave===4);
const blocks=source=>[...read(source).matchAll(/```([^\n]*)\n([\s\S]*?)\n```/gu)];

test('all seven Help/App sources complete the selected family without adding public routes',()=>{
 assert.equal(wave.length,7);assert.equal(pages.length,42);assert.equal(manualPages.length,41);
 for(const p of manualPages)assert.equal(pageIsCurrent(p.key,state),true,p.key);
 for(const p of wave){
  const raw=read(p.source);assert.equal(state.pages[p.key].status,'authored',p.key);
  assert.ok(raw.startsWith('# '+p.title+'\n'));assert.ok(!raw.includes('<!-- authoring: scaffold'));
  const notes=[...raw.matchAll(/^> \[!NOTE\]\n> \*\*In development\*\*/gmu)];
  assert.equal(notes.length,p.availability==='in-development'?1:0,p.key);
  for(const route of p.legacyRoutes)assert.ok(legacyRedirects(state).some(r=>r.from===route&&r.status===308),route);
 }
});

test('five language families retain immutable source receipts and every split fragment',()=>{
 const ref='1'.repeat(40),targets=sourceTargets({ref,state,exists:p=>existsSync(join(root,p))});
 for(const name of ['syntax','types-and-measurements','collections-and-scopes','standard-library','diagnostics-and-limits']){
  const path='docs/language/'+name+'.md',transfer=state.transfers[path];
  const old=readHistoricalSource(root,path,transfer);
  assert.equal(transfer.fromRef,base);assert.equal(transfer.fromSourceSha256,createHash('sha256').update(old).digest('hex'));
  assert.equal(isRetired(path,state),true);assert.equal(existsSync(join(root,path)),false);
  assert.ok(transfer.oldAnchors.length>1);
  for(const anchor of transfer.oldAnchors){
   const to=transfer.anchors[anchor],page=pages.find(p=>p.key===to.page);
   assert.equal(resolveSource('/source/?f='+encodeURIComponent(path)+'#'+encodeURIComponent(anchor),targets),`https://github.com/Wolfsblvt/diffdevil/blob/${ref}/${page.source}#${encodeURIComponent(to.anchor)}`);
  }
 }
 assert.equal(state.transfers['docs/releases/README.md'].phase,'maintainer-map');
 assert.ok(existsSync(join(root,'docs/releases/README.md')));
 assert.ok(repositorySources.includes('docs/language/parser-architecture.md'));
});

test('finite hand-authored technical router resolves every selected ID and rejects unrelated paths',()=>{
 const targets=sourceTargets({ref:'1'.repeat(40),state,exists:p=>existsSync(join(root,p))});
 const links=[...read('docs/manual/help/technical-and-project-documentation.md').matchAll(/https:\/\/diffdevil\.dev\/source\/\?f=([^\s)]+)/gu)];
 assert.ok(links.length>0);
 for(const [,encoded] of links)assert.ok(resolveSource('/source/?f='+encoded,targets),decodeURIComponent(encoded));
 assert.equal(resolveSource('/source/?f=apps%2Fgithub-app%2Foperator-helper.mjs',targets),null,'A real file is not automatic resolver admission.');
 assert.ok(resolveSource('/source/?f=docs%2Freleases%2Fv1.0.0.md',targets));
});

test('all read-only troubleshooting commands execute with distinct invalid and unresolved exits',t=>{
 const cwd=mkdtempSync(join(tmpdir(),'diffdevil-help-'));t.after(()=>rmSync(cwd,{recursive:true,force:true}));
 let count=0;
 for(const [,language,body] of blocks('docs/manual/help/troubleshooting.md'))if(language==='sh'){
  const logical=body.replace(/\\\n\s*/gu,' ');
  for(const line of logical.split('\n').filter(l=>l.startsWith('npx diffdevil '))){
   const tokens=[...line.matchAll(/'([^']*)'|"([^"]*)"|(\S+)/gu)].map(m=>m[1]??m[2]??m[3]);
   const args=tokens.slice(2).map(a=>a.startsWith('docs/examples/')?join(root,a):a);
   assert.ok(['validate','query'].includes(args[0]),'The offline Help check must not acquire provider data or write effects.');
   const expected=line.includes('modifed')?2:line.includes('--format value')?3:0;
   const result=spawnSync(process.execPath,[join(root,'dist/lib/cli/main.js'),...args],{cwd,encoding:'utf8',windowsHide:true,env:{...process.env,NO_COLOR:'1',FORCE_COLOR:'0'}});
   assert.ifError(result.error);assert.equal(result.status,expected,line+'\n'+result.stderr);
   if(expected===3)assert.equal(result.stdout,'','Unresolved strict output supplies no invented scalar.');
   count++;
  }
 }
 assert.ok(count>=3,'Expected the authored successful, invalid and unresolved specimens.');
});

test('registration specimen is a non-secret read-only operation with the selected permission boundary',()=>{
 const page='docs/manual/use/managed-app/self-hosting.md';
 const command=blocks(page).flatMap(([,language,body])=>language==='sh'?body.split('\n'):[]).find(line=>line.includes('operator-helper.mjs registration '));
 assert.ok(command);
 const args=command.split(' ').slice(1);
 const result=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',windowsHide:true});
 assert.ifError(result.error);assert.equal(result.status,0,result.stderr);
 const output=JSON.parse(result.stdout);
 assert.equal(output.permissions.contents,'read');
 assert.equal(output.permissions.pullRequests,'write');
 assert.equal(output.permissions.checks,'write');
 assert.equal(output.webhookUrl,'https://example.invalid/webhooks/github');
});

test('App diagnostics and release metadata stay inside reproducible paired islands',()=>{
 for(const [island,source] of [['app-execution-stages','docs/manual/help/troubleshooting.md'],['release-source-identities','docs/manual/help/releases.md']]){
  const inputs=new Set(),body=generatedIsland(island,{root,source,onSource:p=>inputs.add(p)});
  assert.ok(inputs.size>0);assert.equal(committedIslands(read(source),{root,source}),read(source));
  assert.ok(body.includes('|'));
  assert.throws(()=>committedIslands(read(source).replace(`<!-- manual:generated ${island} -->\n`,`<!-- manual:generated ${island} -->\nBROKEN\n`),{root,source}),/drift/u);
 }
});

test('dated release notes remain reachable but never become default current search results',()=>{
 const entry=legacyEntries.find(e=>e.source==='docs/releases/v1.0.0.md');
 assert.ok(entry);
 const route=entry.route??`/docs/${entry.slug}/`;
 assert.equal(indexable(route,'<article data-pagefind-body>Historic release</article>'),false);
 assert.equal(indexable('/help/releases/','<article data-pagefind-body>Choose a release</article>'),true);
 const targets=sourceTargets({ref:'1'.repeat(40),state,exists:p=>existsSync(join(root,p))});
 assert.ok(resolveSource('/source/?f='+encodeURIComponent(entry.source),targets));
});
