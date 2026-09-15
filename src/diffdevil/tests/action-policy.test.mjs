import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compileActionShortcut, compilePolicy, evaluatePolicy, createPlan, explainPolicy } from '../../../dist/lib/policy/index.js';
import { unwrap } from '../../../dist/lib/errors.js';
const report=JSON.parse(readFileSync('docs/examples/reports/exact.json','utf8'));
const target={repository:'example/repository',pullRequest:42};
const error=(result,code)=>{assert.equal(result.ok,false,JSON.stringify(result));assert.equal(result.diagnostics[0].code,code);};
const plan=(policy)=>unwrap(createPlan(unwrap(evaluatePolicy(unwrap(policy),report)),target,{definitions:'ensure'}));
test('Action single-rule shorthand and authored detail share decisions and desired effects',()=>{
  const shorthand=compileActionShortcut({metric:'destructive',threshold:'500',comparison:'gte',label:'review/destructive'});
  const full=compilePolicy({version:1,presets:[],metrics:{inline:{formula:'totals.lines.deleted + totals.lines.modified'}},labelDefinitions:{'review/destructive':{color:'D1D5DB',description:'Managed by the diffdevil inline rule'}},rules:{inline:{when:'totals.lines.deleted + totals.lines.modified >= 500',effects:{labels:{add:['review/destructive'],removeWhenFalse:true}}}}});
  const a=plan(shorthand),b=plan(full);
  assert.deepEqual(a.operations,b.operations);assert.deepEqual(a.rules,b.rules);
  assert.equal(a.operations[1].kind,'label.add');
  assert.deepEqual(Object.keys(a.rules),['inline']);
});
test('Action metric-only shorthand retains size defaults, with no implicit comments',()=>{
  const empty=plan(compileActionShortcut({}));assert.equal(empty.operations.at(-1).group,'size');
  const changed=plan(compileActionShortcut({metric:'raw-churn'}));assert.equal(changed.operations.filter(x=>x.kind==='comment.reconcile').length,0);
  assert.deepEqual(explainPolicy(unwrap(compileActionShortcut({metric:'raw-churn'}))).semantics.presets,['size@1']);
});
test('analyze shorthand has a read-only file decision and rejects all explicit effects',()=>{
  const p=unwrap(compileActionShortcut({metric:'changed',files:'any',threshold:'100',comparison:'gt'},{entryPoint:'analyze'}));
  const result=unwrap(evaluatePolicy(p,report));assert.equal(result.rules.inline.decision.value,true);
  assert.deepEqual(unwrap(createPlan(result,target)).operations,[]);
  for(const inputs of [{label:'x'},{'comment-mode':'once','comment-template':'x'},{'remove-label-when-false':'false'}])error(compileActionShortcut(inputs,{entryPoint:'analyze'}),'E_CONFIG');
});
test('formula and condition inputs use detail while threshold and path inputs remain data',()=>{
  const p=unwrap(compileActionShortcut({formula:'totals.lines.deleted + 2 * totals.lines.modified',threshold:'200',label:'weighted',exclude:'package-lock.json'}));
  const result=unwrap(evaluatePolicy(p,report));assert.equal(result.report.metrics.inline.value,248);assert.equal(result.rules.inline.decision.value,true);
  const advanced=plan(compileActionShortcut({condition:'totals.lines.changed > 100','comment-mode':'once','comment-template':'Value: {{ totals.lines.changed }}'}));
  assert.equal(advanced.operations[0].kind,'comment.reconcile');
  error(compileActionShortcut({metric:'changed',threshold:'1 || true',label:'x'}),'E_NUMERIC_LITERAL');
  const literalPath=unwrap(compileActionShortcut({threshold:'1',label:'x',path:'src/";evil/**'}));
  assert.equal(unwrap(evaluatePolicy(literalPath,report)).rules.inline.decision.value,false);
});
test('Action input conflicts are explicit, not precedence or truthiness guesses',()=>{
  for(const inputs of [{threshold:'1'},{comparison:'gt'},{label:'x'},{metric:'changed',formula:'2'}, {'comment-template':'x'}, {threshold:'1',condition:'true',label:'x'}, {threshold:'1',label:'x','remove-label-when-false':'yes'}, {formula:'2',scope:'x'}, {config:'path.json',threshold:'1',label:'x'}])error(compileActionShortcut(inputs),'E_CONFIG');
  const p=plan(compileActionShortcut({threshold:'10000',label:'x','remove-label-when-false':'false'}));
  assert.equal(p.operations.some(x=>x.kind==='label.remove'),false);
});
