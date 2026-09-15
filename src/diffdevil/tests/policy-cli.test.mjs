import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { compilePolicy, evaluatePolicy, unwrap } from '../../../dist/lib/index.js';
const root=resolve('.'),bin=resolve('dist/lib/cli/main.js'),report=resolve('docs/examples/reports/exact.json');
const run=(args,home=root)=>spawnSync(process.execPath,[bin,...args],{cwd:home,encoding:'utf8',timeout:10000});
const ok=result=>{assert.equal(result.status,0,result.stderr);assert.equal(result.stderr,'');return result.stdout;};
const config={version:1,defaults:{paths:{exclude:['package-lock.json']}},parameters:{limit:{type:'integer',default:200},name:{type:'string',default:'001'}},metrics:{weighted:{formula:'totals.lines.deleted + 2 * totals.lines.modified'}},queries:{weighted:{expression:'metrics.weighted'},large:{expression:'metrics.weighted > params.limit'},name:{expression:'params.name'}},rules:{weighted:{when:'metrics.weighted > params.limit',effects:{labels:{add:['review/weighted'],removeWhenFalse:true},comment:{mode:'upsert',template:'Weighted: {{ metrics.weighted }}'}}}}};
function home(work){const path=mkdtempSync(resolve(tmpdir(),'diffdevil policy '));try{writeFileSync(resolve(path,'policy.json'),JSON.stringify(config));work(path);}finally{rmSync(path,{recursive:true,force:true});}}

test('actual CLI compiles policy, runs custom metrics and saved queries, and emits an inspectable plan',()=>home(dir=>{
 const input=['--report',report,'--config','policy.json'];
 assert.equal(ok(run(['query',...input,'--metric','metrics.weighted'],dir)),'248\n');
 assert.equal(ok(run(['query',...input,'--name','weighted'],dir)),'248\n');
 assert.equal(ok(run(['query',...input,'--band','size'],dir)),'m\n');
 assert.equal(run(['check',...input,'--name','large'],dir).status,0);
 assert.equal(run(['check',...input,'--name','large','--param','limit=999'],dir).status,1);
 const plan=JSON.parse(ok(run(['plan',...input,'--target-repo','example/repository','--target-pr','42','--definitions','ensure','--format','json'],dir)));
 assert.equal(plan.stage,'desired');assert.equal(plan.target.pullRequest,42);
 assert.equal(plan.operations.find(x=>x.kind==='label.select').selected,'size/M');
 assert.equal(plan.operations.find(x=>x.kind==='comment.reconcile').body,'Weighted: 248');
}));
test('CLI parameters preserve literal values, split the first equals sign, and reject duplicates',()=>home(dir=>{
 const input=['--report',report,'--config','policy.json'];
 assert.equal(ok(run(['query',...input,'--name','name','--param','name=001=a'],dir)),'001=a\n');
 writeFileSync(resolve(dir,'params.json'),JSON.stringify({name:'@x',limit:999}));
 assert.equal(ok(run(['query',...input,'--name','name','--params-file','params.json'],dir)),'@x\n');
 for(const flags of [['--param','name=x','--param','name=y'],['--params-file','params.json','--param','limit=2'],['--param','missing=2'],['--param','limit=1 || true']]){
  const result=run(['query',...input,'--name','name',...flags],dir);assert.equal(result.status,2);assert.equal(result.stdout,'');
 }
}));
test('JSON policy diagnostics survive actual file loading with Unicode escapes and CRLF',()=>home(dir=>{
 const text='\uFEFF{\r\n "version":1,"presets":[],"metrics":{"bad":{"formula":"totals.lines.\\u006Disspelled"}}}';
 writeFileSync(resolve(dir,'invalid.json'),text);
 const result=run(['validate','--config','invalid.json','--diagnostics','json'],dir);
 assert.equal(result.status,2);assert.equal(result.stdout,'');const d=JSON.parse(result.stderr);
 assert.equal(d.code,'E_UNKNOWN_FIELD');assert.equal(d.range.source,resolve(dir,'invalid.json'));assert.equal(text.slice(d.range.start,d.range.end),'\\u006Disspelled');
 writeFileSync(resolve(dir,'invalid.json'),'{"version":1,"invalid":true}');
 const shape=run(['validate','--config','invalid.json','--diagnostics','json'],dir);assert.equal(JSON.parse(shape.stderr).range.source,resolve(dir,'invalid.json'));
}));
test('policy validation and explanation need no diff, and show effective origins',()=>home(dir=>{
 const validated=JSON.parse(ok(run(['validate','--config','policy.json','--format','json'],dir)));assert.equal(validated.valid,true);
 const explanation=JSON.parse(ok(run(['explain','--policy','--config','policy.json','--exclude','extra/**','--format','json'],dir)));
 assert.deepEqual(explanation.document.defaults.paths.exclude,['package-lock.json','extra/**']);
 assert.ok(explanation.origins.some(x=>x.layer==='invocation:append'));assert.equal('generated' in explanation,false);
 const clear=JSON.parse(ok(run(['explain','--policy','--config','policy.json','--exclude-mode','replace','--format','json'],dir)));
 assert.deepEqual(clear.document.defaults.paths.exclude,[]);
}));
test('saved report queries bypass discovery; explicit re-evaluation records new metadata',()=>home(dir=>{
 writeFileSync(resolve(dir,'.diffdevil.yml'),'version: 1\nmetrics:\n  bad:\n    formula: totals.lines.missing\n');
 assert.equal(ok(run(['query','--report',report,'--metric','changed'],dir)),'178\n');
 const raw=run(['query','--report',report,'--metric','changed','--preset','none'],dir);
 // Explicit policy selection still respects discovered configuration unless explicitly disabled.
 assert.equal(raw.status,2);assert.match(raw.stderr,/E_UNKNOWN_FIELD/);
 const reconfigured=JSON.parse(ok(run(['analyze','--report',report,'--preset','none','--no-config','--format','json'],dir)));
 assert.equal(reconfigured.totals.lines.changed.value,678);assert.deepEqual(reconfigured.metrics,{});
 assert.equal(reconfigured.semantics.presets.length,0);
 const missing=run(['query','--report',report,'--name','weighted'],dir);assert.equal(missing.status,2);assert.match(missing.stderr,/E_REPORT_CONTEXT/);
}));
test('default preset can analyze real diff input without a configuration file',()=>home(dir=>{
 writeFileSync(resolve(dir,'change.diff'),'diff --git a/a b/a\n--- a/a\n+++ b/a\n@@ -1 +1,2 @@\n-old\n+new\n+added\n');
 const result=JSON.parse(ok(run(['analyze','--diff-file','change.diff','--format','json'],dir)));
 assert.equal(result.metrics.review.value,2);assert.equal(result.bands.size.id,'xs');assert.deepEqual(result.rules,{});
}));
test('YAML discovery loads the selected policy and invalid configuration does not fall back',()=>home(dir=>{
 writeFileSync(resolve(dir,'.diffdevil.yml'),'version: 1\npresets: []\nmetrics:\n  bad:\n    formula: totals.lines.missing\n');
 const discovery=run(['validate'],dir);assert.equal(discovery.status,2);assert.match(discovery.stderr,/E_UNKNOWN_FIELD/);
 assert.equal(run(['validate','--no-config'],dir).status,0);
 writeFileSync(resolve(dir,'policy.json'),'{"version":1,"version":1}');
 const duplicate=run(['validate','--config','policy.json'],dir);assert.equal(duplicate.status,2);assert.match(duplicate.stderr,/E_CONFIG_DUPLICATE/);
}));
test('plan failure and unresolved configured values cannot overwrite an existing output file',()=>home(dir=>{
 const bounded=resolve(root,'docs/examples/reports/bounded.json');
 writeFileSync(resolve(dir,'unknown.json'),JSON.stringify({version:1,presets:[],metrics:{changed:{measure:'lines.changed'}},rules:{x:{when:'totals.lines.changed > 65',onUnknown:'fail'}}}));
 writeFileSync(resolve(dir,'output.txt'),'preserved');
 const r=run(['plan','--report',bounded,'--config','unknown.json','--output','output.txt','--format','json'],dir);assert.equal(r.status,2);assert.match(r.stderr,/E_RULE_UNRESOLVED/);
 assert.equal(readFileSync(resolve(dir,'output.txt'),'utf8'),'preserved');
 const query=run(['query','--report',bounded,'--config','unknown.json','--metric','metrics.changed','--output','output.txt'],dir);assert.equal(query.status,3);assert.equal(readFileSync(resolve(dir,'output.txt'),'utf8'),'preserved');
}));
test('template paths are resolved beside explicit config, not process working directory',()=>home(dir=>{
 writeFileSync(resolve(dir,'note.txt'),'From file: {{ metrics.weighted }}');
 const copy=structuredClone(config);copy.rules.weighted.effects.comment={mode:'upsert',templateFile:'note.txt'};writeFileSync(resolve(dir,'policy.json'),JSON.stringify(copy));
 const result=JSON.parse(ok(run(['plan','--report',report,'--config',resolve(dir,'policy.json'),'--target-repo','example/repository','--target-pr','42','--format','json'])));
 assert.equal(result.operations.find(x=>x.kind==='comment.reconcile').body,'From file: 248');
}));
test('invalid source/target/selector combinations are not silently ignored',()=>home(dir=>{
 for(const args of [['validate','--config','policy.json','--report',report],['query','--report',report,'--target-repo','example/repository','--target-pr','42'],['plan','--report',report,'--target-pr','42'],['explain','--policy','--metric','changed'],['explain','--expr','1+2'],['explain','--config','policy.json','--metric','changed']]){
  const result=run(args,dir);assert.equal(result.status,2,args.join(' '));assert.equal(result.stdout,'');
 }
}));

test('CLI checks can read completed rules without giving rule conditions that capability',()=>home(dir=>{
 const input=['--report',report,'--config','policy.json','--expr','requirePresent(rules.weighted.decision)'];
 assert.equal(run(['check',...input],dir).status,0);
 assert.equal(run(['check',...input,'--param','limit=999'],dir).status,1);
 const complete=unwrap(evaluatePolicy(unwrap(compilePolicy(config)),JSON.parse(readFileSync(report,'utf8')))).report;
 writeFileSync(resolve(dir,'complete.json'),JSON.stringify(complete));
 assert.equal(run(['check','--report','complete.json','--expr','requirePresent(rules.weighted.decision)'],dir).status,0);
 const notBoolean=run(['check','--report','complete.json','--expr','rules.weighted.disposition'],dir);
 assert.equal(notBoolean.status,2);assert.match(notBoolean.stderr,/E_TYPE/);
 const invalid=structuredClone(config);invalid.rules.weighted.when='rules.size.disposition == "matched"';
 writeFileSync(resolve(dir,'invalid.json'),JSON.stringify(invalid));
 assert.match(run(['validate','--config','invalid.json'],dir).stderr,/E_UNKNOWN_NAME/);
}));
