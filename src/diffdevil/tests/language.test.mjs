import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ast as a } from '../../../dist/lib/language/ast.js';
import { compileAst } from '../../../dist/lib/language/compile.js';
import { evaluateExpression } from '../../../dist/lib/language/evaluate.js';
import { createEnvironment, environmentFromReport, withParameters, withPolicyValues } from '../../../dist/lib/language/environment.js';
import { boolValue, recordValue, completeCollection, textValue } from '../../../dist/lib/language/values.js';
import { collection, optional, recordType } from '../../../dist/lib/language/types.js';
import { integer, numberValue } from '../../../dist/lib/numeric.js';
import { analyzeDiff, readReport } from '../../../dist/lib/report.js';
import { unwrap } from '../../../dist/lib/errors.js';
import { DEFAULT_LIMITS } from '../../../dist/lib/limits.js';

const fixture = name => JSON.parse(readFileSync(new URL(`../../../docs/examples/reports/${name}.json`, import.meta.url)));
const env = name => unwrap(environmentFromReport(fixture(name)));
const empty = unwrap(createEnvironment({},{}));
const p = path => a.path(path.split('.'));
const lit = a.literal;
const call = (name,...args) => a.call(name,args);
const run = (node, environment=empty, options={}) => {
  const program = unwrap(compileAst(node,{environment:environment.schema}));
  return evaluateExpression(program,environment,options);
};
const value = (node, environment=empty) => unwrap(run(node,environment)).value;
const error = (result,code) => { assert.equal(result.ok,false); assert.equal(result.diagnostics[0].code,code); };
const reason = [{code:'INSUFFICIENT_EVIDENCE'}];

test('typed arithmetic, finite floats, Unicode scalar helpers, and empty aggregates', () => {
  assert.deepEqual(value(a.binary('+',lit(1),a.binary('*',lit(2),lit(3)))),integer(7));
  assert.deepEqual(value(a.binary('/',lit(5),lit(2))),numberValue({status:'exact',value:2.5},'float'));
  assert.deepEqual(value(call('length',lit('A😀'))),integer(2));
  assert.deepEqual(value(call('sum',a.list([]))),integer(0));
  assert.deepEqual(value(call('min',a.list([]))),{kind:'missing'});
  assert.deepEqual(value(call('floor',lit(-1.2))),integer(-2));
});
for (const row of JSON.parse(readFileSync(new URL('../../../src/diffdevil/contracts/detail/v1/conformance/boolean-truth-tables.json',import.meta.url))).cases) {
  // These exercise supplied truth-table expectations via ASTs, not source parsing.
  test(`semantic vector boolean / ${row.id} (AST input)`, () => {
    const e = unwrap(createEnvironment({params:recordType({a:'boolean',b:'boolean'})},{params:recordValue(row.bindings)}));
    const node = a.binary(row.source.includes('&&') ? '&&' : '||',p('params.a'),p('params.b'));
    assert.deepEqual(value(node,e),row.expect.value);
  });
}
test('short circuits skip execution but never skip binding or typing', () => {
  const divide = a.binary('>',a.binary('/',lit(1),lit(0)),lit(0));
  assert.deepEqual(value(a.binary('&&',lit(false),divide)),boolValue(false));
  assert.deepEqual(value(a.binary('||',lit(true),divide)),boolValue(true));
  error(compileAst(a.binary('&&',lit(false),p('missing.name')),{environment:empty.schema}),'E_UNKNOWN_NAME');
  error(compileAst(a.binary('&&',lit(false),lit(1)),{environment:empty.schema}),'E_TYPE');
  error(run(a.binary('||',divide,lit(true))),'E_DIVIDE_ZERO');
});
test('unknown conditions do not evaluate either branch or guess a shared result', () => {
  const e = unwrap(createEnvironment({params:recordType({u:'boolean'})},{params:recordValue({u:boolValue({status:'unknown',reasons:reason})})}));
  const result = value(a.conditional(p('params.u'),a.binary('/',lit(1),lit(0)),lit(2)),e);
  assert.equal(result.kind,'number'); assert.equal(result.numericType,'float'); assert.equal(result.measurement.status,'unknown');
  error(run(a.binary('&&',p('params.u'),a.binary('>',a.binary('/',lit(1),lit(0)),lit(0))),e),'E_DIVIDE_ZERO');
});
test('optional presence is distinct from numeric evidence; fallback is lazy', () => {
  const e = unwrap(createEnvironment({params:recordType({label:optional('string'),n:'integer'})},{params:recordValue({label:{kind:'missing'},n:numberValue({status:'unknown',reasons:reason})})}));
  assert.deepEqual(value(call('orElse',p('params.label'),lit('fallback')),e),textValue('fallback'));
  assert.equal(value(call('orElse',p('params.n'),a.binary('/',lit(1),lit(0))),e).measurement.status,'unknown');
  assert.deepEqual(value(call('isMissing',p('params.n')),e),boolValue(false));
  error(run(call('requirePresent',p('params.label')),e),'E_PRESENT_REQUIRED');
  error(compileAst(call('length',p('params.label')),{environment:e.schema}),'E_OPTIONAL_VALUE');
  const narrowed = a.binary('&&',a.binary('&&',a.unary('!',call('isMissing',p('params.label'))),a.unary('!',call('isNull',p('params.label')))),a.binary('>',call('length',p('params.label')),lit(0)));
  assert.deepEqual(value(narrowed,e),boolValue(false));
});
test('report reuse reconstructs primitive correlation, including named metrics within a request', () => {
  const e = env('bounded');
  const sum = a.binary('+',p('totals.lines.deleted'),p('totals.lines.modified'));
  assert.deepEqual(value(sum,e),value(p('totals.raw.deleted'),e));
  const x = value(p('totals.lines.modified'),e);
  const extended = withPolicyValues(e,{metrics:{x}});
  assert.deepEqual(value(a.binary('-',p('metrics.x'),p('totals.lines.modified')),extended),integer(0));
});
test('saved metric types preserve an integral float rather than guessing integer', () => {
  const report = fixture('exact'); report.metrics.weight={status:'exact',value:1}; report.metricTypes.weight='float';
  const e = unwrap(environmentFromReport(unwrap(readReport(JSON.stringify(report)))));
  assert.equal(value(p('metrics.weight'),e).numericType,'float');
  delete report.metricTypes; error(readReport(report),'E_REPORT_INVALID');
});
test('file filtering, mapping and scoped totals use validated normalized facts', () => {
  const e = env('exact');
  const selected = call('filter',p('files'),a.lambda('f',p('f.included')));
  const paths = value(call('map',selected,a.lambda('f',p('f.path'))),e);
  assert.equal(paths.items.length,fixture('exact').files.filter(f=>f.included).length);
  assert.deepEqual(value(call('sum',selected,a.lambda('f',p('f.lines.changed'))),e),value(p('totals.lines.changed'),e));
  assert.deepEqual(value(call('any',selected,a.lambda('f',a.binary('>',p('f.lines.changed'),lit(0)))),e),boolValue(true));
});
test('possible membership affects counts and signed sums without discarding items', () => {
  const items={kind:'collection',items:[{membership:'definite',value:integer(3)},{membership:'possible',value:numberValue({status:'bounded',lower:-10,upper:-5})}],unseen:{possible:false,minimum:0,maximum:0},order:'known'};
  const e=unwrap(createEnvironment({params:recordType({items:collection('integer')})},{params:recordValue({items})}));
  assert.deepEqual(value(call('count',p('params.items')),e),numberValue({status:'bounded',lower:1,upper:2}));
  assert.deepEqual(value(call('sum',p('params.items')),e),numberValue({status:'bounded',lower:-7,upper:3}));
  const certain=unwrap(run(call('certain',p('params.items')),e)); assert.deepEqual(certain.value,completeCollection([integer(3)])); assert.equal(certain.evidence[0].code,'DEFINITE_OBSERVED_ONLY');
});
test('incomplete any/all require actual witnesses and keep absent remainder', () => {
  const e=env('incomplete');
  assert.equal(value(call('any',p('files'),a.lambda('f',a.binary('>',p('f.lines.changed'),lit(99999)))),e).decision.status,'unknown');
  assert.deepEqual(value(call('any',p('files'),a.lambda('f',a.binary('>',p('f.lines.changed'),lit(0)))),e),boolValue(true));
  assert.deepEqual(value(call('all',p('files'),a.lambda('f',lit(false))),e),boolValue(false));
  assert.equal(value(call('count',call('filter',p('files'),a.lambda('f',lit(false)))),e).measurement.value,0);
});
test('unknown ordering and take retain possible membership with exact selected cardinality', () => {
  const items={kind:'collection',items:[{membership:'definite',value:integer(2)},{membership:'definite',value:numberValue({status:'bounded',lower:0,upper:3})}],unseen:{possible:false,minimum:0,maximum:0},order:'known'};
  const e=unwrap(createEnvironment({params:recordType({items:collection('integer')})},{params:recordValue({items})}));
  const take=call('take',call('sortBy',p('params.items'),a.lambda('x',p('x'))),lit(1));
  const result=unwrap(run(take,e)); assert.equal(result.value.items.length,2); assert.ok(result.value.items.every(x=>x.membership==='possible')); assert.equal(result.value.order,'unknown');
  assert.deepEqual(value(call('count',take),e),integer(1));
  assert.deepEqual(value(call('take',p('params.items'),lit(0)),e),completeCollection([]));
});
test('stable sorting, nested projections, empty optional aggregates, and numeric promotion', () => {
  const source=a.list([lit(2),lit(1),lit(2)]);
  assert.deepEqual(value(call('sortBy',source,a.lambda('x',p('x')))),completeCollection([integer(1),integer(2),integer(2)]));
  assert.equal(value(a.list([lit(1),lit(2.5)])).items[0].value.numericType,'float');
  assert.equal(value(call('avg',source)).numericType,'float');
  assert.deepEqual(value(call('orElse',call('max',a.list([])),lit(9))),integer(9));
});
test('in membership, paths, strings, optional rename handling, and bound projections', () => {
  assert.deepEqual(value(a.binary('in',lit(2),a.list([lit(1),lit(2)]))),boolValue(true));
  assert.deepEqual(value(call('contains',lit('ä😀b'),lit('😀'))),boolValue(true));
  assert.deepEqual(value(call('glob',lit('src/.hidden/x.ts'),lit('src/**'))),boolValue(true));
  const e=env('bounded'); const result=unwrap(run(call('lowerBound',p('totals.lines.changed')),e));
  assert.equal(result.value.measurement.status,'exact'); assert.equal(result.evidence[0].code,'BOUND_PROJECTION');
  error(run(call('requireExact',p('totals.lines.changed')),e),'E_EXACT_REQUIRED');
});
test('opaque programs, environment schemas, inert boundaries, and work limits are enforced', () => {
  const compiled=unwrap(compileAst(lit(1),{environment:empty.schema}));
  error(evaluateExpression({...compiled},empty),'E_PROGRAM');
  error(evaluateExpression(compiled,{...empty}),'E_INPUT');
  const other=unwrap(createEnvironment({params:recordType({x:'integer'})},{params:recordValue({x:integer(1)})}));
  error(evaluateExpression(compiled,other),'E_ENVIRONMENT_SCHEMA');
  error(run(a.binary('+',lit(1),lit(2)),empty,{limits:{...DEFAULT_LIMITS,expressionWork:1}}),'E_LIMIT');
  const hostile={}; Object.defineProperty(hostile,'kind',{get(){throw new Error('executed');},enumerable:true});
  error(compileAst(hostile,{environment:empty.schema}),'E_AST');
});
test('diagnostics retain UTF-16 spans and reject shadowing, forbidden names, wrong arity, dead-branch errors', () => {
  const span={source:'expression',start:3,end:12};
  const result=compileAst(a.name('unbound',span),{environment:empty.schema}); error(result,'E_UNKNOWN_NAME'); assert.deepEqual(result.diagnostics[0].range,span);
  error(compileAst(call('sum',lit(1),lit(2),lit(3)),{environment:empty.schema}),'E_ARITY');
  error(compileAst(call('map',a.list([lit(1)]),a.lambda('totals',lit(1))),{environment:empty.schema}),'E_SHADOWING');
  error(compileAst(a.member(lit('x'),'constructor'),{environment:empty.schema}),'E_FORBIDDEN_NAME');
  error(compileAst(a.conditional(lit(true),lit(1),lit('x')),{environment:empty.schema}),'E_TYPE');
});
