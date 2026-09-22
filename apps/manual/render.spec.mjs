// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { projectMarkdown, anchorsOf } from './render.mjs';
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
 for(const path of ['/faq/','/source/','/privacy/','/impressum/','/__qualification/reading/']) assert.equal(indexable(path,body),false);
 assert.equal(indexable('/use/cli/','<meta name="robots" content="noindex">'+body),false);
 assert.equal(indexable('/use/cli/',body),true);
 assert.throws(()=>qualifyFaqRecords([{id:'bad',url:'/faq/#other',canonical:'https://diffdevil.dev/faq/#bad'}]),/preserve/u);
});
