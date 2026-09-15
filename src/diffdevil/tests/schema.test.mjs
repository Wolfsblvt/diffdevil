import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { validateSchema, compilePolicy, evaluatePolicy, createPlan, unwrap } from '../../../dist/lib/index.js';
const report = JSON.parse(readFileSync('docs/examples/reports/exact.json', 'utf8'));

test('fixed standalone schemas validate policy, report and desired plans without granting semantic truth', () => {
  assert.equal(validateSchema('report', report).ok, true);
  const policy = {version:1,presets:[],rules:{changed:{when:'totals.lines.changed > 100',effects:{labels:{add:['review/changed']}}}}};
  assert.equal(validateSchema('policy',policy).ok,true);
  const evaluated = unwrap(evaluatePolicy(unwrap(compilePolicy(policy)), report));
  assert.equal(validateSchema('plan', unwrap(createPlan(evaluated,{repository:'example/repository',pullRequest:42}))).ok,true);
  const contradictory = structuredClone(report); contradictory.totals.lines.changed.value++;
  // Shape and actual arithmetic evidence are deliberately different boundaries.
  assert.equal(validateSchema('report',contradictory).ok,true);
  assert.equal(validateSchema('report',{...report,kind:'other'}).ok,false);
  assert.equal(validateSchema('plan',{}).ok,false);
  assert.equal(validateSchema('policy',{version:1,unexpected:true}).ok,false);
  assert.equal(validateSchema('not-a-schema',{}).ok,false);
});

test('schema validation rejects executable object input before accessing its fields', () => {
  let called=false;
  const input = {get version(){called=true;return 1;}};
  assert.equal(validateSchema('policy',input).ok,false);
  assert.equal(called,false);
  assert.equal(validateSchema('policy',{version:1,metrics:{x:{formula:'1'}},parameters:{x:{type:'float',default:Infinity}}}).ok,false);
});

test('the complete compiler works when Node forbids runtime string code generation', () => {
  const source = `import {readPolicyYaml,compilePolicy,evaluatePolicyQuery,unwrap} from './dist/lib/index.js';
    import {readFileSync} from 'node:fs';
    const policy=unwrap(compilePolicy(unwrap(readPolicyYaml('version: 1\\npresets: []\\nqueries:\\n  arithmetic:\\n    expression: 2 + 3\\n'))));
    const result=unwrap(evaluatePolicyQuery(policy,JSON.parse(readFileSync('docs/examples/reports/exact.json','utf8')),{query:'arithmetic'}));
    if(result.result.value.measurement.value!==5)process.exit(1);`;
  const result=spawnSync(process.execPath,['--disallow-code-generation-from-strings','--input-type=module','-e',source],{encoding:'utf8',windowsHide:true});
  assert.equal(result.status,0,result.stderr);
});
