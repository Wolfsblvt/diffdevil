// SPDX-License-Identifier: AGPL-3.0-only
/** Executable policy chapters and mechanically derived reference boundaries. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { parse } from 'yaml';
import { analyzeDiff, readReport, readPlan, validateSchema, unwrap, sourcePosition } from '../../dist/lib/index.js';
import { compilePolicy, readPolicyYaml, evaluatePolicy, evaluatePolicyQuery, createPlan } from '../../dist/lib/policy/index.js';
import { pages } from './manifest.mjs';
import { schemaFields, generatedIsland } from './generated-islands.mjs';
import { committedIslands, projectIslands, updateInventories } from './generated-content.mjs';
import { sourceTargets, resolveSource } from './source-resolver.mjs';
import { isRetired, pageIsCurrent } from './migration.mjs';

const root=resolve(import.meta.dirname,'../..');
const read=path=>readFileSync(join(root,path),'utf8');
const wave=pages.filter(page=>page.wave===3);
const state=JSON.parse(read('apps/manual/authoring-state.json'));
const small=unwrap(analyzeDiff(read('docs/examples/diffs/review.diff')));
const blocks=source=>[...read(source).matchAll(/```([^\n]*)\n([\s\S]*?)\n```/gu)];
const policy=name=>unwrap(compilePolicy(unwrap(readPolicyYaml(read(`docs/examples/policies/story/${name}.yml`),{name:name+'.yml'}))));

test('each complete policy chapter runs independently over the same small comparison',()=>{
 for(const name of ['preset','configure','paths','rules','labels','comments']) {
  const compiled=policy(name),result=unwrap(evaluatePolicy(compiled,small));
  const selected=!['preset','configure'].includes(name);
  assert.equal(result.report.totals.lines.changed.value,selected?6:10,name);
  assert.equal(result.report.totals.raw.churn.value,selected?8:16,name);
  assert.equal(result.report.bands.size.id,name==='configure'?'s':'xs',name);
  assert.equal(result.report.files.length,4,'Exclusion must not delete an observed file.');
  if (['rules','labels','comments'].includes(name)) {
   assert.equal(result.report.metrics.sourceReview.value,3);
   assert.equal(result.report.metrics.testReview.value,2);
   assert.equal(result.report.metrics.attention.value,5);
   assert.equal(result.report.bands.attention.id,'substantial');
   const falseCheck=unwrap(evaluatePolicyQuery(compiled,small,'metrics.attention >= params.attentionAt',{context:'condition',parameters:{attentionAt:6}}));
   assert.equal(falseCheck.result.value.decision.value,false);
  }
  const plan=unwrap(createPlan(result,{repository:'example/repository',pullRequest:42},{definitions:'ensure'}));
  assert.equal(plan.stage,'desired');assert.deepEqual(plan.held,[]);
  assert.equal(plan.operations.some(op=>op.kind==='label.add'&&op.name==='review/payments'),['labels','comments'].includes(name));
  const comments=plan.operations.filter(op=>op.kind==='comment.reconcile');
  assert.equal(comments.length,name==='comments'?1:0);
  if(comments.length) assert.match(comments[0].body,/Source Changed: 3\nTests Changed: 2\nIncluded Changed: 6\nIncluded raw churn: 8/u);
  assert.equal(readPlan(JSON.stringify(plan)).ok,true);
 }
});

test('copyable policies, workflows and TypeScript consumer are complete canonical files',()=>{
 for(const name of ['preset','configure','paths','rules','labels','comments']) {
  const expected=read(`docs/examples/policies/story/${name}.yml`).trimEnd();
  assert.ok(wave.some(page=>blocks(page.source).some(([,language,body])=>language==='yaml'&&body===expected)),name);
 }
 for(const [asset,page,language] of [
  ['workflows/size.yml','reference/github-actions.md','yaml'],
  ['workflows/analyze.yml','reference/github-actions.md','yaml'],
  ['library/inspect-change.mts','reference/typescript-api.md','typescript'],
 ]) assert.ok(blocks('docs/manual/'+page).some(([,kind,body])=>kind===language&&body===read('docs/examples/'+asset).trimEnd()),asset);
});

test('all displayed read-only CLI invocations execute, including the intentional false check',t=>{
 const home=mkdtempSync(join(tmpdir(),'diffdevil policy reference '));t.after(()=>rmSync(home,{recursive:true,force:true}));
 let executed=0;
 for(const page of wave) for(const [,kind,body] of blocks(page.source)) {
  if(kind!=='sh')continue;
  for(const line of body.split('\n').filter(line=>line.startsWith('npx diffdevil '))) {
   const tokens=[...line.matchAll(/'([^']*)'|"([^"]*)"|(\S+)/gu)].map(m=>m[1]??m[2]??m[3]);
   const args=tokens.slice(2).map(arg=>arg.startsWith('docs/examples/')?join(root,arg):arg);
   assert.ok(!['apply','labels'].includes(args[0]),'Provider mutation must not enter an offline documentation check.');
   const expected=line.includes('--param attentionAt=6')?1:0;
   const result=spawnSync(process.execPath,[join(root,'dist/lib/cli/main.js'),...args],{cwd:home,encoding:'utf8',windowsHide:true,env:{...process.env,NO_COLOR:'1',FORCE_COLOR:'0'}});
   assert.ifError(result.error);assert.equal(result.status,expected,`${page.source}\n${line}\n${result.stderr}`);executed++;
  }
 }
 assert.ok(executed>0,'No documented invocations were exercised.');
});

test('canonical valid artifacts and relational-invalid counterparts keep separate outcomes',()=>{
 for(const name of ['exact','bounded','incomplete','unmeasurable']) {
  const input=JSON.parse(read(`docs/examples/reports/${name}.json`));
  assert.equal(validateSchema('report',input).ok,true);assert.equal(readReport(input).ok,true);
 }
 for(const name of ['query-bounded','query-incomplete','query-paths']) assert.equal(validateSchema('query',JSON.parse(read(`docs/examples/reports/${name}.json`))).ok,true);
 const reversed=JSON.parse(read('docs/examples/reports/bounded.json'));
 reversed.totals.lines.changed={status:'bounded',lower:70,upper:60};
 assert.equal(validateSchema('report',reversed).ok,true);assert.equal(readReport(reversed).ok,false);
 const missing=parse(read('docs/examples/policies/story/rules.yml'));missing.metrics.sourceReview.scope='undeclared';
 assert.equal(validateSchema('policy',missing).ok,true);assert.equal(compilePolicy(missing).ok,false);
 const badPlan=JSON.parse(read('docs/examples/reports/plan.json'));
 assert.equal(readPlan(badPlan).ok,true);badPlan.target.pullRequest++;
 assert.equal(validateSchema('plan',badPlan).ok,true);const rejected=readPlan(badPlan);assert.equal(rejected.ok,false);assert.equal(rejected.diagnostics[0].code,'E_PLAN_TARGET');
 const bounded=unwrap(readReport(JSON.parse(read('docs/examples/reports/bounded.json'))));
 const hold=unwrap(compilePolicy({version:1,presets:[],rules:{signal:{when:'totals.lines.changed >= 65',onUnknown:'hold',effects:{labels:{add:['review/signal'],removeWhenFalse:true}}}}}));
 const plan=unwrap(createPlan(unwrap(evaluatePolicy(hold,bounded)),{repository:'example/repository',pullRequest:42}));
 assert.equal(plan.held.length,1);assert.deepEqual(plan.operations,[],'Unknown does not request false-removal.');
 assert.deepEqual(sourcePosition('😀\r\nx',4),{line:2,column:1});
});

test('schema inventories preserve branch-local requiredness, references and boolean schemas',()=>{
 const rows=schemaFields({type:'object',properties:{choice:{oneOf:[{type:'object',required:['n'],properties:{n:{type:['integer','null'],minimum:0}}},{type:'object',properties:{n:{$ref:'#/$defs/Number'}}}]},extra:false},$defs:{Number:{type:'number'}}});
 const first=rows.find(row=>row[0]==='`$.choice.oneOf[0].n`'), second=rows.find(row=>row[0]==='`$.choice.oneOf[1].n`');
 assert.match(first[1],/integer.*null/u);assert.match(first[2],/^Required/u);assert.match(first[5],/minimum/u);
 assert.equal(second[1],'`reference`');assert.equal(second[2],'Not required here');assert.match(second[5],/#\/\$defs\/Number/u);
 assert.ok(rows.some(row=>row[0]==='`$.extra`'&&row[1]==='`false`'));
 assert.ok(rows.some(row=>row[4]==='`#/$defs/Number`'));
});

test('committed inventories are deterministic, detect byte drift and never rewrite authored framing',()=>{
 const receipts=updateInventories({root});assert.ok(receipts.length>0);
 for(const receipt of receipts){assert.ok(receipt.inputs.length>0);assert.match(receipt.sha256,/^[a-f0-9]{64}$/u);}
 const source='docs/manual/policy/README.md',raw=read(source);
 assert.equal(committedIslands(raw,{root,source}),raw);
 const drift=raw.replace('<!-- manual:generated presets -->\n','<!-- manual:generated presets -->\nBROKEN\n');
 assert.throws(()=>committedIslands(drift,{root,source}),/generated presets drift/u);
 assert.equal(committedIslands(drift,{root,source,write:true}),raw);
 assert.throws(()=>committedIslands(raw.replace('<!-- /manual:generated presets -->',''),{root,source}),/edit boundary/u);
 const framing='An independently edited introduction.\n\n'+raw;
 assert.equal(committedIslands(framing,{root,source}),framing);
 assert.ok(!projectIslands(raw,{root,source}).includes('<!-- manual:generated'));
 assert.equal(generatedIsland('detail-shortcuts',{root,source}),generatedIsland('detail-shortcuts',{root,source}));
 const api=read('docs/manual/reference/typescript-api.md');
 assert.match(api,/declare function/u);assert.match(api,/readonly/u);assert.match(api,/Result</u);
 assert.match(api,/api-policy-evaluate-evaluatepolicyquery/u);
});

test('CLI argument inventory and real help remain reachable from authored reference',()=>{
 const source=read('src/diffdevil/cli/arguments.ts'),reference=read('docs/manual/reference/cli.md');
 for(const name of ['lists','strings','flags']) {
  const list=source.match(new RegExp(`const ${name}=\\[([^\\]]*)\\]`));assert.ok(list,name);
  for(const [,flag] of list[1].matchAll(/'([^']+)'/gu))assert.ok(reference.includes('--'+flag),flag);
 }
 for(const flag of ['files','gt','gte','lt','lte','eq','ne'])assert.ok(reference.includes('--'+flag),flag);
 const help=spawnSync(process.execPath,[join(root,'dist/lib/cli/main.js'),'--help'],{encoding:'utf8',windowsHide:true});
 assert.equal(help.status,0,help.stderr);
 for(const command of ['analyze','query','check','validate','explain','plan','apply','labels','schema']) assert.ok(help.stdout.includes(command)&&reference.includes(command),command);
});

test('Wave 3 source transfers survive the completed Help join',()=>{
 for(const page of wave)assert.equal(state.pages[page.key].status,'authored',page.key);
 const baseline='a9df2c151da1f3bc36e4d2f4608ace62eca6d330';
 const ref='1'.repeat(40),targets=sourceTargets({ref,state,exists:path=>existsSync(join(root,path))});
 for(const [source,transfer] of Object.entries(state.transfers)) if(transfer.fromRef===baseline) {
  assert.equal(existsSync(join(root,source)),false,source);
  for(const [old,destination] of Object.entries(transfer.anchors)) {
   const page=pages.find(page=>page.key===destination.page);
   assert.equal(resolveSource('/source/?f='+encodeURIComponent(source)+'#'+encodeURIComponent(old),targets),`https://github.com/Wolfsblvt/diffdevil/blob/${ref}/${page.source}#${encodeURIComponent(destination.anchor)}`);
  }
 }
});
