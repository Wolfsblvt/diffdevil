import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {formatQuery,formatReport} from '../../../dist/lib/format.js';
import {unwrap} from '../../../dist/lib/errors.js';
import {readReport} from '../../../dist/lib/report.js';
for(const row of JSON.parse(readFileSync(new URL('../../../src/diffdevil/contracts/detail/v1/conformance/machine-output.json',import.meta.url))).cases){
 test(`conformance machine-output / ${row.id}`,()=>{
  const result=formatQuery({value:row.value,evidence:[],work:0},{command:row.command,...(row.format?{format:row.format}:{})});
  const observed=result.ok?{stdout:result.value.stdout,exit:result.value.exitCode}:{stdout:'',exit:result.diagnostics[0].code==='E_RESULT_UNRESOLVED'?3:2};
  assert.deepEqual(observed,{stdout:row.stdout,exit:row.exit});
  if(row.error) assert.equal(result.diagnostics[0].code,row.error);
 });
}
test('canonical reports and environment output preserve bounded evidence',()=>{
 const report=unwrap(readReport(JSON.parse(readFileSync(new URL('../../../docs/examples/reports/bounded.json',import.meta.url)))));
 const json=unwrap(formatReport(report,'json'));assert.equal(JSON.parse(json.stdout).measurement.status,'bounded');
 const env=unwrap(formatReport(report,'env')).stdout;assert.match(env,/DIFFDEVIL_LINES_CHANGED_STATUS=bounded/);assert.doesNotMatch(env,/DIFFDEVIL_LINES_CHANGED=/);
 const jsonl=unwrap(formatReport(report,'jsonl')).stdout.trim().split('\n').map(JSON.parse);assert.equal(jsonl[0].type,'header');assert.equal(jsonl.at(-1).type,'summary');
});
