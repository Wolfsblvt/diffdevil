import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compilePolicy, readPolicyJson, evaluatePolicy, evaluatePolicyQuery } from '../dist/lib/policy/index.js';
import { unwrap } from '../dist/lib/errors.js';
import { DEFAULT_LIMITS } from '../dist/lib/limits.js';
const fixture = JSON.parse(readFileSync('examples/reports/exact.json','utf8'));
const error = (result,code) => {assert.equal(result.ok,false);assert.equal(result.diagnostics[0].code,code);return result.diagnostics[0];};
const compile = text => compilePolicy(unwrap(readPolicyJson(text,{name:'policy.json'})));

test('JSON policy handles its BOM, preserves decoded strings, and shares the policy compiler',()=>{
  const text='\uFEFF{"version":1,"presets":[],"metrics":{"x":{"formula":"totals.lines.deleted + 2 * totals.lines.modified"}},"defaults":{"paths":{"exclude":["package-lock.json"]}}}';
  const source=unwrap(readPolicyJson(text));
  const a=unwrap(compilePolicy(source)), b=unwrap(compilePolicy(source.document));
  assert.equal(a.id,b.id);
  const result=unwrap(evaluatePolicy(a,fixture));assert.equal(result.report.metrics.x.value,248);
  assert.throws(()=>{source.document.version=2;},TypeError);
});
test('duplicate decoded JSON keys are rejected rather than silently taking the last value',()=>{
  for(const text of ['{"version":1,"version":1}','{"version":1,"metrics":{"x":{},"\\u0078":{}}}']){
    const d=error(readPolicyJson(text),'E_CONFIG_DUPLICATE');assert.equal(d.precision,'character');assert.ok(d.configPath);
  }
});
test('native JSON syntax, safe integer tokens, finite floats and inert records are enforced',()=>{
  for(const text of ['{version:1}','{"version":1,}','\uFEFF\uFEFF{"version":1}'])error(readPolicyJson(text),'E_CONFIG_JSON');
  error(readPolicyJson('{"version":1,"parameters":{"x":{"type":"integer","default":9007199254740993}}}'),'E_INTEGER_OVERFLOW');
  error(readPolicyJson('{"version":1,"parameters":{"x":{"type":"float","default":1e400}}}'),'E_FLOAT_OVERFLOW');
  error(readPolicyJson('{"version":1,"__proto__":{}}'),'E_CONFIG');
});
test('JSON expression diagnostics point through escaped identifiers to original UTF-16 bytes',()=>{
  const text='\uFEFF{\r\n "version":1,"presets":[],\r\n "metrics":{"x":{"formula":"totals.lines.\\u006Disspelled"}}\r\n}';
  const d=error(compile(text),'E_UNKNOWN_FIELD');
  assert.equal(d.range.source,'policy.json');
  assert.equal(text.slice(d.range.start,d.range.end),'\\u006Disspelled');
  assert.equal(d.configPath,'/metrics/x/formula');assert.equal(d.details.line,3);
});
test('JSON source ranges survive compilation and runtime evaluation errors',()=>{
  const text='{"version":1,"presets":[],"metrics":{"x":{"formula":"1 / 0"}}}';
  const p=unwrap(compile(text));const d=error(evaluatePolicy(p,fixture),'E_DIVIDE_ZERO');
  assert.equal(d.range.source,'policy.json');assert.equal(text.slice(d.range.start,d.range.end),'1 / 0');
  assert.equal(d.details.line,1);assert.equal(d.details.column,d.range.start+1);
});
test('JSON templates map compile errors and structural errors retain authored context',()=>{
  const text='{"version":1,"presets":[],"rules":{"a":{"when":"true","effects":{"comment":{"mode":"once","template":"Hi {{ totals.lines.\\u006Disspelled }}"}}}}}';
  const d=error(compile(text),'E_TEMPLATE_PLACEHOLDER');
  assert.equal(d.range.source,'policy.json');assert.equal(text.slice(d.range.start,d.range.end),'\\u006Disspelled');
  assert.equal(d.configPath,'/rules/a/effects/comment/template');
  const bad='{"version":1,"metrics":{"a":{"formula":"2","unexpected":true}}}';
  const invalid=error(compile(bad),'E_CONFIG');assert.equal(invalid.precision,'scalar');assert.equal(bad.slice(invalid.range.start,invalid.range.end),'true');
});
test('JSON source walking is bounded and preserves Unicode data without normalization',()=>{
  error(readPolicyJson('{"x":[[[1]]]}',{limits:{...DEFAULT_LIMITS,nestingDepth:2}}),'E_LIMIT');
  error(readPolicyJson('{"version":1}',{limits:{...DEFAULT_LIMITS,configBytes:3}}),'E_LIMIT');
  const text=JSON.stringify({version:1,presets:[],parameters:{name:{type:'string',default:'A😀e\u0301'}},queries:{name:{expression:'params.name'}}});
  const p=unwrap(compile(text));assert.equal(unwrap(evaluatePolicyQuery(p,fixture,{query:'name'})).result.value.value,'A😀e\u0301');
});
