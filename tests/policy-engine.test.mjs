import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { compilePolicy, explainPolicy } from '../dist/lib/policy/compile.js';
import { evaluatePolicy, evaluatePolicyQuery } from '../dist/lib/policy/evaluate.js';
import { createPlan, readPlan } from '../dist/lib/policy/plan.js';
import { normalizePolicy } from '../dist/lib/policy/normalize.js';
import { readReport, analyzeDiff } from '../dist/lib/report.js';
import { SIZE_PRESET } from '../dist/lib/policy/size-preset.js';
import { canonicalJson } from '../dist/lib/inert.js';
import { DEFAULT_LIMITS } from '../dist/lib/limits.js';
import { unwrap } from '../dist/lib/errors.js';

const fixture = name => JSON.parse(readFileSync(new URL(`../examples/reports/${name}.json`, import.meta.url)));
const config = extra => ({ version: 1, presets: [], ...extra });
const compile = extra => unwrap(compilePolicy(config(extra)));
const error = (result, code) => { assert.equal(result.ok, false, JSON.stringify(result)); assert.equal(result.diagnostics[0].code, code); return result.diagnostics[0]; };
const target = { repository: 'example/repository', pullRequest: 42 };
const query = (policy, expression, report = fixture('exact'), options) => unwrap(evaluatePolicyQuery(policy, report, expression, options));
const measured = value => value.result.value.measurement;
const planned = (policy, report = fixture('exact'), options) => unwrap(createPlan(unwrap(evaluatePolicy(policy, report)), target, options));

test('size preset generation remains bound to its canonical authored bytes', () => {
  const source = readFileSync('src/policy/size-preset.ts', 'utf8');
  const digest = createHash('sha256').update(readFileSync('presets/size-v1.yml')).digest('hex');
  assert.ok(source.includes(`source SHA-256 ${digest}`));
  // Independently derived from the same YAML document, not from generated TypeScript.
  assert.equal(createHash('sha256').update(canonicalJson(SIZE_PRESET)).digest('hex'), 'ecab10f36c7ccacaee2b9bbbd7c9f3c9adc0314901c16ed12354735811e44e81');
});
test('size defaults compile and explicitly selected path policy replaces saved exclusions', () => {
  const policy = unwrap(compilePolicy());
  const result = unwrap(evaluatePolicy(policy, fixture('exact')));
  assert.equal(result.report.metrics.review.value, 678);
  assert.equal(result.report.bands.size.id, 'l');
  assert.equal(result.rules.size.disposition, 'matched');
  assert.equal(unwrap(readReport(result.report)).reportId, result.report.reportId);
  const withExclusion = unwrap(compilePolicy({version:1,defaults:{paths:{exclude:['package-lock.json']}}}));
  const result2 = unwrap(evaluatePolicy(withExclusion, fixture('exact')));
  assert.equal(result2.report.metrics.review.value, 178);
  assert.equal(planned(withExclusion).operations[0].selected, 'size/M');
});
test('forward references, numeric promotion, and stable IDs ignore declaration ordering', () => {
  const metrics = { z:{formula:'metrics.a + 2'}, a:{formula:'1 / 2'} };
  const first = compile({metrics}), second = compile({metrics:{a:metrics.a,z:metrics.z}});
  assert.equal(first.id, second.id);
  const result = unwrap(evaluatePolicy(first, fixture('exact')));
  assert.deepEqual(result.report.metricTypes, {a:'float',z:'float'});
  assert.equal(result.report.metrics.z.value, 2.5);
  assert.deepEqual(result, unwrap(evaluatePolicy(second, fixture('exact'))));
});
test('read-only environments do not freeze the owning metric dictionary', () => {
  const policy = compile({metrics:{a:{formula:'1'},b:{formula:'metrics.a + 2'},c:{formula:'metrics.b * 3'}}});
  for (let i=0;i<3;i++) assert.equal(measured(query(policy,'metrics.c')).value, 9);
});
test('dependency cycles include dead branches and whole-record captures', () => {
  const d = error(compilePolicy(config({metrics:{a:{formula:'true ? 1 : metrics.b'},b:{formula:'metrics.a'}}})), 'E_METRIC_CYCLE');
  assert.deepEqual(d.details.cycle, ['a','b','a']);
  error(compilePolicy(config({metrics:{self:{formula:'count([metrics])'}}})), 'E_METRIC_CYCLE');
});
test('all declarations are statically checked even when unrelated to a query', () => {
  error(compilePolicy(config({metrics:{unused:{formula:'unknown.root'}}})), 'E_UNKNOWN_NAME');
  error(compilePolicy(config({queries:{unused:{expression:'totals.lines.chagned'}}})), 'E_UNKNOWN_FIELD');
  error(compilePolicy(config({rules:{unused:{when:'3'}}})), 'E_TYPE');
  error(compilePolicy(config({metrics:{unused:{formula:'true'}}})), 'E_TYPE');
  error(compilePolicy(config({metrics:{unused:{formula:'bands.size.id'}}})), 'E_UNKNOWN_NAME');
});
test('lazy query roots avoid unrelated runtime faults; analyze deliberately evaluates them', () => {
  const policy = compile({metrics:{good:{formula:'7'},unused:{formula:'1 / 0'}}});
  assert.equal(measured(query(policy,'metrics.good')).value,7);
  assert.deepEqual(Object.keys(query(policy,'metrics.good').report.metrics), ['good']);
  error(evaluatePolicy(policy,fixture('exact')),'E_DIVIDE_ZERO');
});
test('whole metric records retain all bound dependencies in lazy queries', () => {
  const policy = compile({metrics:{a:{formula:'7'},b:{formula:'8'}}});
  const result = query(policy,'metrics');
  assert.equal(result.result.value.fields.a.measurement.value,7);
  assert.equal(result.result.value.fields.b.measurement.value,8);
});
test('named metrics keep shared replacement-family correlation through multiple dependencies', () => {
  const policy = compile({metrics:{deleted:{measure:'lines.deleted'},modified:{measure:'lines.modified'},total:{formula:'metrics.deleted + metrics.modified'}}});
  const result = query(policy,'metrics.total',fixture('bounded'));
  assert.deepEqual(measured(result),{status:'exact',value:10});
  assert.equal(result.report.metrics.deleted.status,'bounded');
  assert.equal(result.report.metrics.modified.status,'bounded');
  assert.equal(unwrap(readReport(result.report)).metrics.total.value,10);
});
test('scopes cannot restore globally excluded files and canonical measures are enforced', () => {
  const policy = compile({defaults:{paths:{exclude:['package-lock.json']}},scopes:{production:{includeOnly:['src/**']}},metrics:{production:{measure:'lines.changed',scope:'production'}}});
  const result = query(policy,'metrics.production');
  assert.equal(measured(result).value,173);
  error(compilePolicy(config({metrics:{wrong:{measure:'changed'}}})),'E_CONFIG');
  error(compilePolicy(config({scopes:{x:{}},metrics:{wrong:{measure:'files.total',scope:'x'}}})),'E_CONFIG');
});
test('parameter types, defaults, required values and immutable binding affect policy identity', () => {
  const policy = compile({parameters:{count:{type:'integer',default:3},weight:{type:'float',default:0.5},name:{type:'string',required:true},flag:{type:'boolean',default:true}},metrics:{value:{formula:'params.count * params.weight'}},queries:{name:{expression:'params.name'}}});
  error(evaluatePolicy(policy,fixture('exact')),'E_PARAMETER_REQUIRED');
  const one = query(policy,'metrics.value',fixture('exact'),{parameters:{name:'001'}});
  assert.equal(measured(one).value,1.5);
  assert.equal(query(policy,{query:'name'},fixture('exact'),{parameters:{name:'001'}}).result.value.value,'001');
  const two = query(policy,'metrics.value',fixture('exact'),{parameters:{name:'001',count:4}});
  assert.notEqual(one.report.policyId,two.report.policyId);
  error(evaluatePolicy(policy,fixture('exact'),{parameters:{name:'x',extra:4}}),'E_PARAMETER_UNKNOWN');
  error(evaluatePolicy(policy,fixture('exact'),{parameters:{name:'x',count:0.5}}),'E_PARAMETER_TYPE');
});
test('band inputs and rule conditions enforce phase restrictions', () => {
  error(compilePolicy(config({bands:{a:{value:'bands.b.id',ranges:[{id:'x',otherwise:true}]}}})),'E_UNKNOWN_NAME');
  error(compilePolicy(config({rules:{a:{when:'orElse(rules.b.decision, false)'},b:{when:'true'}}})),'E_UNKNOWN_NAME');
});
test('analysis does not run rules, but named rule queries request the required read-only result', () => {
  const policy = compile({rules:{a:{when:'1 / 0 > 2'},b:{when:'true'}},queries:{b:{expression:'orElse(rules.b.decision, false)'}}});
  assert.deepEqual(unwrap(evaluatePolicy(policy,fixture('exact'),{phase:'analyze'})).rules,{});
  assert.equal(query(policy,{query:'b'}).result.value.decision.value,true);
  error(evaluatePolicy(policy,fixture('exact')),'E_DIVIDE_ZERO');
});
test('unknown holds effects; fail is a planning refusal, not a replacement for unknown data', () => {
  const policy = compile({rules:{uncertain:{when:'totals.lines.changed > 65',effects:{labels:{add:['broad'],removeWhenFalse:true}}}}});
  const result = unwrap(evaluatePolicy(policy,fixture('bounded')));
  assert.equal(result.rules.uncertain.disposition,'held');
  const plan = unwrap(createPlan(result,target));
  assert.deepEqual(plan.operations,[]);assert.equal(plan.held[0].rule,'uncertain');
  const strict = compile({rules:{uncertain:{when:'totals.lines.changed > 65',onUnknown:'fail'}}});
  const evaluated = unwrap(evaluatePolicy(strict,fixture('bounded')));
  assert.equal(evaluated.rules.uncertain.decision.status,'unknown');
  error(createPlan(evaluated,target),'E_RULE_UNRESOLVED');
});
test('boolean false removals are deliberate; other labels remain outside the plan', () => {
  const policy = compile({rules:{yes:{when:'true',effects:{labels:{add:['a']}}},no:{when:'false',effects:{labels:{add:['b'],removeWhenFalse:true}}},ignored:{when:'false',effects:{labels:{add:['c']}}}}});
  assert.deepEqual(planned(policy).operations,[{kind:'label.remove',rule:'no',name:'b'},{kind:'label.add',rule:'yes',name:'a'}]);
});
test('an unknown band can choose its authored fallback, without creating a comment occasion', () => {
  const policy = unwrap(compilePolicy({version:1,rules:{size:{band:'size',effects:{labels:{group:'size',byBand:{xs:'size/XS',s:'size/S',m:'size/M',l:'size/L',xl:'size/XL'},unknown:'size/Unknown'},comment:{mode:'upsert',template:'Band: {{ bands.size }}'}}}}}));
  const plan = planned(policy,fixture('unmeasurable'));
  assert.equal(plan.rules.size.disposition,'fallback');
  assert.equal(plan.operations.length,1);
  assert.equal(plan.operations[0].selected,'size/Unknown');
});
test('managed group coverage and ownership membership are validated', () => {
  error(compilePolicy({version:1,rules:{size:{band:'size',effects:{labels:{group:'size',byBand:{xs:'size/XS'}}}}}}),'E_CONFIG');
  error(compilePolicy({version:1,rules:{size:{band:'size',effects:{labels:{group:'missing',byBand:{}}}}}}),'E_UNKNOWN_NAME');
});
test('cross-rule assignments and held ownership cannot silently choose a winner', () => {
  const policy = compile({rules:{a:{when:'true',effects:{labels:{add:['same']}}},b:{when:'false',effects:{labels:{add:['same'],removeWhenFalse:true}}}}});
  error(createPlan(unwrap(evaluatePolicy(policy,fixture('exact'))),target),'E_EFFECT_CONFLICT');
  const held = compile({rules:{a:{when:'true',effects:{labels:{add:['same']}}},b:{when:'totals.lines.changed > 65',effects:{labels:{add:['same']}}}}});
  error(createPlan(unwrap(evaluatePolicy(held,fixture('bounded'))),target),'E_EFFECT_CONFLICT');
});
test('definitions are distinct explicit operations and default size creates no comments', () => {
  const policy = unwrap(compilePolicy());
  assert.equal(planned(policy).operations.length,1);
  assert.equal(planned(policy,fixture('exact'),{definitions:'ensure'}).operations.filter(x=>x.kind==='label.ensure').length,6);
  assert.equal(planned(policy,fixture('exact'),{definitions:'sync'}).operations.filter(x=>x.kind==='label.sync').length,6);
});
test('comment substitution uses completed metrics/parameters and neutralizes data mentions', () => {
  const policy = compile({parameters:{name:{type:'string',default:'@team_*'}},metrics:{x:{formula:'2'}},rules:{a:{when:'true',effects:{comment:{mode:'upsert',template:'**Measured** {{ metrics.x }} {{ params.name }}'}}},b:{when:'false',effects:{comment:{mode:'once',trigger:'always',template:'false'}}}}});
  const result = unwrap(evaluatePolicy(policy,fixture('exact')));
  const plan = unwrap(createPlan(result,target));
  assert.equal(plan.operations[0].body,'**Measured** 2 @\u200bteam\\_\\*');
  assert.equal(plan.operations[1].body,'false');
  assert.deepEqual(unwrap(createPlan(result,target)),plan,'Repeated planning must not retain spent budgets');
});
test('template files require exact host-supplied content and affect identity', () => {
  const configValue=config({rules:{a:{when:'true',effects:{comment:{mode:'once',templateFile:'note.md'}}}}});
  error(compilePolicy(configValue),'E_TEMPLATE_SOURCE');
  const first=unwrap(compilePolicy(configValue,{templateFiles:{'note.md':'First'}}));
  const second=unwrap(compilePolicy(configValue,{templateFiles:{'note.md':'Second'}}));
  assert.notEqual(first.id,second.id);assert.equal(planned(first).operations[0].body,'First');
});
test('parameterized work shares a logical policy limit, including template rendering', () => {
  const policy=compile({metrics:{a:{formula:'1 + 2'},b:{formula:'3 + 4'}}});
  error(evaluatePolicy(policy,fixture('exact'),{limits:{...DEFAULT_LIMITS,policyWork:4}}),'E_LIMIT');
  const withComment=compile({rules:{a:{when:'true',effects:{comment:{mode:'once',template:'This literal is work too.'}}}}});
  const result=unwrap(evaluatePolicy(withComment,fixture('exact'),{limits:{...DEFAULT_LIMITS,policyWork:5}}));
  error(createPlan(result,target),'E_LIMIT');
});
test('opaque handles and rules-phase boundaries cannot be bypassed by casting data', () => {
  error(evaluatePolicy({kind:'diffdevil.policy'},fixture('exact')),'E_PROGRAM');
  const policy=unwrap(compilePolicy());
  const result=unwrap(evaluatePolicy(policy,fixture('exact')));
  error(createPlan(JSON.parse(JSON.stringify(result)),target),'E_PROGRAM');
  error(createPlan(unwrap(evaluatePolicy(policy,fixture('exact'),{phase:'analyze'})),target),'E_PLAN_CONTEXT');
});
test('plans round trip without authenticating their source, reject unsupported operations and target drift', () => {
  const plan=planned(unwrap(compilePolicy()),fixture('bounded'),{definitions:'ensure'});
  assert.deepEqual(JSON.parse(JSON.stringify(unwrap(readPlan(JSON.stringify(plan))))),JSON.parse(JSON.stringify(plan)));
  error(readPlan({...plan,target:{...target,pullRequest:0}}),'E_PLAN_INVALID');
  error(readPlan({...plan,target:{...target,pullRequest:43}}),'E_PLAN_TARGET');
  error(readPlan({...plan,preconditions:{head:'different'}}),'E_PLAN_TARGET');
  error(readPlan({...plan,operations:[{kind:'exec',command:'never'}]}),'E_PLAN_INVALID');
  error(readPlan({...plan,operations:[{...plan.operations.at(-1),selected:'outside'}]}),'E_PLAN_INVALID');
  error(readPlan({...plan,operations:[{...plan.operations.at(-1),command:'extra'}]}),'E_PLAN_INVALID');
});
test('normalization replaces declarations, appends/clears paths, and preserves provenance without mutable internals', () => {
  const policy=unwrap(compilePolicy({version:1,metrics:{review:{formula:'2'}},defaults:{paths:{exclude:['a/**']}}},{paths:{exclude:['b/**']}}));
  const explanation=explainPolicy(policy);
  assert.deepEqual({...explanation.document.metrics.review},{formula:'2'});
  assert.deepEqual(explanation.document.defaults.paths.exclude,['a/**','b/**']);
  assert.ok(explanation.origins.some(x=>x.path==='/metrics/review'&&x.replaces==='preset:size@1'));
  assert.equal('generated' in explanation,false);
  assert.deepEqual(unwrap(normalizePolicy({version:1,defaults:{paths:{exclude:['a/**']}}},{paths:{exclude:[],excludeMode:'replace'}})).document.defaults.paths.exclude,[]);
  error(compilePolicy({version:1,size:{metric:'raw-churn'},metrics:{review:{formula:'2'}}}),'E_CONFIG_CONFLICT');
  error(compilePolicy({version:1,presets:[],size:{metric:'changed'}}),'E_CONFIG_CONFLICT');
});


test('final numeric binding rejects modulo on a forward-referenced float', () => {
  error(compilePolicy(config({ metrics: { a: { formula: 'metrics.b % 2' }, b: { formula: '1 / 2' } } })), 'E_TYPE');
});
test('two band rules cannot select different members of the same managed group', () => {
  const policy = compile({
    bands: { low: { value: '1', ranges: [{ id: 's', lt: 5 }, { id: 'l', otherwise: true }] }, high: { value: '9', ranges: [{ id: 's', lt: 5 }, { id: 'l', otherwise: true }] } },
    labelGroups: { size: ['size/S', 'size/L'] },
    rules: Object.fromEntries(['low', 'high'].map(id => [id, { band: id, effects: { labels: { group: 'size', byBand: { s: 'size/S', l: 'size/L' } } } }]))
  });
  error(createPlan(unwrap(evaluatePolicy(policy, fixture('exact'))), target), 'E_EFFECT_CONFLICT');
});
test('size overrides retain custom metrics, label identities and honest definitions', () => {
  const policy = unwrap(compilePolicy({ version: 1, defaults: { paths: { exclude: ['package-lock.json'] } }, metrics: { custom: { formula: 'totals.lines.deleted + 2 * totals.lines.modified' } },
    size: { metric: 'metrics.custom', thresholds: { xs: 5, s: 10, m: 200, l: 500 }, labels: { xs: 'review/tiny', s: 'review/small', m: 'review/medium', l: 'review/large', xl: 'review/huge', unknown: 'review/unknown' } }
  }));
  const result = unwrap(evaluatePolicy(policy, fixture('exact')));
  assert.equal(result.report.metrics.review.value, 248);
  assert.equal(result.report.bands.size.id, 'l');
  const plan = unwrap(createPlan(result, target, { definitions: 'ensure' }));
  assert.equal(plan.operations.at(-1).selected, 'review/large');
  assert.equal(plan.operations.filter(op => op.kind === 'label.ensure').length, 6);
  assert.ok(plan.operations.filter(op => op.kind === 'label.ensure').every(op => !op.name.startsWith('size/')));
  assert.equal(unwrap(readPlan(plan)).operations.at(-1).selected, 'review/large');
});

test('read-only policy checks may consume rule results and still require boolean type', () => {
  const policy = compile({rules:{x:{when:'totals.lines.changed > 1'}},metrics:{unused:{formula:'1 / 0'}}});
  const result = query(policy,'requirePresent(rules.x.decision)',fixture('exact'),{context:'condition'});
  assert.equal(result.result.value.decision.value,true);
  assert.deepEqual(result.report.metrics,{});
  error(evaluatePolicyQuery(policy,fixture('exact'),'rules.x.disposition',{context:'condition'}),'E_TYPE');
});
