// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { projectMarkdown, anchorsOf, fragmentAliases, validateAvailability, validateFragments } from './render.mjs';
import { indexable, qualifyFaqRecords } from './search-index.mjs';
const ref='1'.repeat(40), page={title:'Specimen',source:'docs/manual/specimen.md'};
function fixture(fn){const root=mkdtempSync(join(tmpdir(),'manual-projection-'));try{
 for(const path of ['docs/manual/use/cli.md','docs/ARCHITECTURE.md','assets/mark.svg']){mkdirSync(join(root,path,'..'),{recursive:true});writeFileSync(join(root,path),'fixture');}
 fn(root);
}finally{rmSync(root,{recursive:true,force:true});}}
test('AST projection preserves code and reference-style link titles while resolving explicit routes',()=>fixture(root=>{
 const raw='# Specimen\n\n[CLI][cli]\n\n[cli]: use/cli.md "Protocol"\n\n```md\n[CLI](use/cli.md)\n```\n';
 const result=projectMarkdown(raw,page,{root,ref,targets:{}});
 assert.match(result.body,/https:\/\/docs.diffdevil.dev\/use\/cli\/ "Protocol"/u);
 assert.match(result.body,/```md\n\[CLI\]\(use\/cli.md\)\n```/u);
 assert.ok(!result.body.startsWith('# Specimen'));
}));
test('Unregistered images and Markdown sources refuse; allow-listed images and sources succeed',()=>fixture(root=>{
 const image='# Specimen\n\n![Mark](../../assets/mark.svg)\n';
 assert.throws(()=>projectMarkdown(image,page,{root,ref,targets:{}}),/register/u);
 assert.match(projectMarkdown(image,page,{root,ref,targets:{},assets:{'assets/mark.svg':'/assets/manual/mark.svg'}}).body,/\/assets\/manual\/mark.svg/u);
 const link='# Specimen\n\n[Architecture](../ARCHITECTURE.md)\n';
 assert.throws(()=>projectMarkdown(link,page,{root,ref,targets:{}}),/allow-list/u);
 assert.match(projectMarkdown(link,page,{root,ref,targets:{'docs/ARCHITECTURE.md':{url:'https://github.com/example'}}}).body,/source\/\?f=docs%2FARCHITECTURE.md/u);
}));
test('Duplicate headings and explicit anchors produce a stable fragment inventory',()=>{
 assert.deepEqual(anchorsOf('## A heading\n\n## A heading\n\n<span id="fixed"></span>'),['a-heading','a-heading-1','fixed']);
});
test('Search excludes whole FAQ, legal, resolver, scaffold and isolated qualification pages',()=>{
 const body='<main data-pagefind-body>Text</main>';
 for(const path of ['/faq/','/source/','/privacy/','/impressum/','/docs/','/docs/cli/','/docs/releases/v1-0-0/','/__qualification/reading/']) assert.equal(indexable(path,body),false);
 assert.equal(indexable('/use/cli/','<meta name="robots" content="noindex">'+body),false);
 assert.equal(indexable('/use/cli/',body),true);
 assert.throws(()=>qualifyFaqRecords([{id:'bad',url:'/faq/#other',canonical:'https://diffdevil.dev/faq/#bad'}]),/preserve/u);
});


import { generatedIsland, schemaFields } from './generated-islands.mjs';
import { repositoryRoot } from './render.mjs';
test('Preserved headings do not produce duplicate compatibility IDs; moved anchors remain explicit',()=>{
 const state={transfers:{old:{phase:'retired',primary:'cli',anchors:{existing:{page:'cli',anchor:'existing'},moved:{page:'cli-reference',anchor:'formats'}}}}};
 assert.deepEqual(fragmentAliases(state,{cli:['existing']}),{cli:{moved:'https://docs.diffdevil.dev/reference/cli/#formats'}});
 assert.throws(()=>fragmentAliases(state,{cli:['existing','moved']}),/Ambiguous old fragment/u);
});
test('Schema fields retain required, nested, array and conditional branches',()=>{
 const rows=schemaFields({type:'object',required:['files'],properties:{files:{type:'array',items:{oneOf:[{type:'string'},{type:'object',properties:{count:{type:'integer'}}}]}}}});
 assert.ok(rows.some(row=>row[0]==='`$.files`'&&row[2].startsWith('Required')));
 assert.ok(rows.some(row=>row[0]==='`$.files[].oneOf[1].count`'&&row[1]==='`integer`'));
});
test('Generated references consume actual metadata and checked runtime expansion',()=>{
 const options={root:repositoryRoot,ref};
 const detail=generatedIsland('detail',options);
 for(const term of ['E_UNKNOWN_FUNCTION','## Operators','## Functions','## Diagnostics','## Limits']) assert.ok(detail.includes(term),term);
 assert.ok(generatedIsland('schemas',options).includes('`$.schemaVersion`'));
 assert.ok(generatedIsland('presets',options).includes('size/Unknown'));
 assert.ok(generatedIsland('actions',options).includes('policy-token'));
 assert.throws(()=>generatedIsland('unregistered',options),/Unknown generated/u);
});
test('Small, report and plan specimens execute the shared presenters with distinct fixture semantics',()=>{
 for(const id of ['presenter-small','presenter-first-plan','presenter-report','presenter-plan']) assert.ok(generatedIsland(id,{root:repositoryRoot,ref}).startsWith('```text'));
});

test('Split-source fragments follow the selected old-route landing, not only its primary successor',()=>{
 const state={transfers:{'old.md':{phase:'retired',primary:'evidence-and-uncertainty',anchors:{previous:{page:'detail-language',anchor:'limits'}}}},routes:{'/docs/old/':{target:'detail-language'}}};
 const result=fragmentAliases(state,{},[{source:'old.md',slug:'old'}]);
 assert.equal(result['detail-language'].previous,'https://docs.diffdevil.dev/reference/detail-language/#limits');
 assert.equal(result['evidence-and-uncertainty'].previous,result['detail-language'].previous);
});

test('Availability is one top note, independent of private authoring comments',()=>{
 const page={source:'page.md',availability:'in-development'};
 const note='> [!NOTE]\n> **In development**\n';
 assert.doesNotThrow(()=>validateAvailability('# Title\n\n<!-- authoring: scaffold -->\n\n'+note,page));
 assert.doesNotThrow(()=>validateAvailability('# Title\n\n'+note+'>\n> Capability explanation in its own paragraph.\n',page));
 assert.throws(()=>validateAvailability('# Title\n\nBody first.\n\n'+note,page),/top-only/u);
 assert.throws(()=>validateAvailability('# Title\n\n'+note+'\nText\n\n'+note,page),/top-only/u);
 assert.throws(()=>validateAvailability('# Title\n\n'+note,{...page,availability:'current'}),/top-only/u);
});
test('Selected fragments refuse a missing anchor rather than publishing a broken link',()=>{
 const reference={from:'source.md',source:'target.md',anchor:'section'};
 assert.doesNotThrow(()=>validateFragments([reference],{'target.md':['section']}));
 assert.throws(()=>validateFragments([reference],{'target.md':['elsewhere']}),/target.md#section/u);
});

import {readFileSync, existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {validateProjection} from './migration.mjs';
import {entries as legacyEntries} from '../website/docs-manifest.mjs';
import {manualPages} from './manifest.mjs';
test('Every retained apex projection captures its actual old sections and maps to existing canonical headings',()=>{
 const state=JSON.parse(readFileSync(new URL('./authoring-state.json',import.meta.url),'utf8'));
 const targetAnchors=Object.fromEntries(manualPages.map(page=>[page.key,['_top',...anchorsOf(readFileSync(page.source,'utf8'))]]));
 for(const [route,selection] of Object.entries(state.routes)){
  const capture=selection.projection;
  if(!capture)continue;
  const entry=legacyEntries.find(entry=>(entry.route??(entry.slug?`/docs/${entry.slug}/`:'/docs/'))===route);
  assert.ok(entry&&existsSync(entry.source),route);
  const original=execFileSync('git',['show',`${capture.fromRef}:${entry.source}`],{cwd:repositoryRoot,encoding:'utf8'});
  const body=original.startsWith('---\n')?original.replace(/^---\n[\s\S]*?\n---\n/u,''):original.replace(/^#\s+.+?\r?\n(?:\r?\n)?/u,'');
  validateProjection(route,selection,{source:entry.source,digest:createHash('sha256').update(original).digest('hex'),anchors:['_top',...anchorsOf(body),...(entry.faq?.length?['related-questions']:[])],targetAnchors});
 }
});
