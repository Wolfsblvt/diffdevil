import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,rmSync,readFileSync,writeFileSync,truncateSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ast as a} from '../dist/lib/language/ast.js';
import {compileAst} from '../dist/lib/language/compile.js';
import {compileShortcut,expandShortcut,METRIC_ALIASES,MEASURES,PROJECTIONS,COMPARATORS} from '../dist/lib/language/shortcuts.js';
import {evaluateExpression} from '../dist/lib/language/evaluate.js';
import {environmentFromReport} from '../dist/lib/language/environment.js';
import {parseInvocation} from '../dist/lib/cli/arguments.js';
import {unwrap} from '../dist/lib/errors.js';
const root=fileURLToPath(new URL('../',import.meta.url)),cli=resolve(root,'dist/lib/cli/main.js');
const invoke=(args,options={})=>spawnSync(process.execPath,[cli,...args],{encoding:'utf8',cwd:root,timeout:10000,...options});
const report=name=>resolve(root,`examples/reports/${name}.json`);
const p=path=>a.path(path.split('.')),call=(name,...args)=>a.call(name,args),l=a.literal;
const expressions={
 scalar:p('totals.lines.changed'), threshold:a.binary('>',p('totals.lines.changed'),l(100)),
 'file-any':call('any',call('filter',p('files'),a.lambda('f',p('f.included'))),a.lambda('f',a.binary('>',p('f.lines.changed'),l(100)))),
 paths:call('map',call('filter',p('files'),a.lambda('f',a.binary('&&',p('f.included'),a.binary('>',p('f.lines.modified'),l(20))))),a.lambda('f',p('f.path'))),
 scope:p('scopes.tests.totals.lines.changed'),destructive:a.binary('>=',a.binary('+',p('totals.lines.deleted'),p('totals.lines.modified')),l(500))
};
const cases=JSON.parse(readFileSync(resolve(root,'spec/detail/v1/conformance/shortcuts.json'))).cases;
for(const row of cases){
 test(`shortcut specification / ${row.id}${row.error?'':' (AST parity, not text parsing)'}`,()=>{
  if(row.error){assert.throws(()=>parseInvocation(row.argv),error=>error.diagnostic?.code===row.error);return;}
  for(const name of ['exact','bounded','incomplete','unmeasurable']){
   const raw=JSON.parse(readFileSync(report(name)));
   if(row.id==='scope'&&!raw.scopes?.tests)continue;
   const env=unwrap(environmentFromReport(raw));
   const shortcut=unwrap(compileShortcut(parseInvocation(row.argv).shortcut,{environment:env.schema}));
   const direct=unwrap(compileAst(expressions[row.id],{environment:env.schema,context:row.argv[0]==='check'?'condition':'query'}));
   assert.deepEqual(evaluateExpression(shortcut,env),evaluateExpression(direct,env));
  }
 });
}
test('shortcut catalogs match the maintained machine contract',()=>{
 const catalog=JSON.parse(readFileSync(resolve(root,'spec/detail/v1/shortcuts.json')));
 assert.deepEqual(METRIC_ALIASES,catalog.aliases);assert.deepEqual([...MEASURES],catalog.canonicalMeasureIds);assert.deepEqual(PROJECTIONS,catalog.projectionFields);assert.deepEqual(COMPARATORS,catalog.comparators);
});
test('actual CLI emits exact values, clean JSON, file paths, and all check exit statuses',()=>{
 const scalar=invoke(['query','--report',report('exact'),'--metric','changed']);assert.equal(scalar.status,0);assert.equal(scalar.stdout,'178\n');assert.equal(scalar.stderr,'');
 const yes=invoke(['check','--report',report('exact'),'--metric','changed','--gt','100']);assert.equal(yes.status,0);assert.equal(yes.stdout,'');
 const no=invoke(['check','--report',report('exact'),'--metric','changed','--gt','999']);assert.equal(no.status,1);assert.equal(no.stdout,'');
 const unknown=invoke(['check','--report',report('bounded'),'--metric','changed','--gt','65']);assert.equal(unknown.status,3);assert.equal(unknown.stdout,'');
 const full=invoke(['query','--report',report('bounded'),'--metric','changed','--format','json']);assert.equal(full.status,0);assert.equal(JSON.parse(full.stdout).value.measurement.status,'bounded');assert.equal(full.stderr,'');
 const bad=invoke(['check','--report',report('exact'),'--gt','0 || true','--diagnostics','json']);assert.equal(bad.status,2);assert.equal(bad.stdout,'');assert.equal(JSON.parse(bad.stderr).code,'E_NUMERIC_LITERAL');
});
test('unified-diff stdin reaches the same query and path selection core',()=>{
 const input='diff --git a/src/x b/src/x\n--- a/src/x\n+++ b/src/x\n@@ -1 +1,2 @@\n-old\n+new\n+added\n';
 const result=invoke(['query','--stdin','--metric','changed','--no-config'],{input});assert.equal(result.status,0);assert.equal(result.stdout,'2\n');
 const paths=invoke(['query','--stdin','--files','--path','src/**','--no-config'],{input});assert.equal(paths.stdout,'src/x\n');assert.equal(paths.status,0);
 const excluded=invoke(['query','--stdin','--metric','changed','--exclude','src/**','--no-config'],{input});assert.equal(excluded.stdout,'0\n');assert.equal(excluded.status,0);
});
test('strict unresolved results do not overwrite an existing output file',()=>{
 const temp=mkdtempSync(resolve(tmpdir(),'diffdevil-output-'));const output=resolve(temp,'output.txt');writeFileSync(output,'existing');
 try{
  const unresolved=invoke(['query','--report',report('bounded'),'--metric','changed','--output',output]);assert.equal(unresolved.status,3);assert.equal(unresolved.stdout,'');assert.equal(readFileSync(output,'utf8'),'existing');
  const exact=invoke(['query','--report',report('exact'),'--metric','changed','--output',output]);assert.equal(exact.status,0);assert.equal(exact.stdout,'');assert.equal(readFileSync(output,'utf8'),'178\n');
 }finally{rmSync(temp,{recursive:true,force:true});}
});
test('schema discovery and current capability failures remain explicit',()=>{
 for(const kind of ['report','config','query','plan','language']){
  const r=invoke(['schema','--kind',kind]);assert.equal(r.status,0,r.stderr);assert.ok(JSON.parse(r.stdout));
 }
 const r=invoke(['query','--report',report('exact'),'--expr','totals.lines.changed']);assert.equal(r.status,0,r.stderr);assert.equal(r.stdout,'178\n');
 const missing=invoke(['query','--report','does-not-exist.json']);assert.equal(missing.status,2);assert.match(missing.stderr,/E_SOURCE/);
});
test('selection conflicts are rejected instead of ignored',()=>{
 for(const args of [['query','--scope','x','--all-files'],['check','--certain','--gt','1'],['check','--files','any','--metric','files','--gt','1'],['query','--metric','metrics.review','--path','src/**'],['query','--metric','files.total','--path','src/**'],['query','--select','path'],['query','--status','exact']]){
  const parsed=parseInvocation(args);assert.equal(compileShortcut(parsed.shortcut,{environment:unwrap(environmentFromReport(JSON.parse(readFileSync(report('exact'))))).schema}).ok,false);
 }
 for(const args of [['analyze','--kind','report'],['query','--metric','changed','--metric','modified'],['query','--comparison','direct','--diff-file','x']])assert.throws(()=>parseInvocation(args));
});

test('file acquisition refuses invalid UTF-8, non-files, and over-limit inputs cleanly',()=>{
 const temp=mkdtempSync(resolve(tmpdir(),'diffdevil-input-'));
 try{
  const invalid=resolve(temp,'invalid.diff');writeFileSync(invalid,Buffer.from([0xff]));
  const bad=invoke(['analyze','--diff-file',invalid,'--no-config']);assert.equal(bad.status,2);assert.equal(bad.stdout,'');assert.match(bad.stderr,/E_SOURCE/);
  const directory=invoke(['analyze','--diff-file',temp,'--no-config']);assert.equal(directory.status,2);assert.equal(directory.stdout,'');assert.match(directory.stderr,/E_SOURCE/);
  const large=resolve(temp,'large.diff');writeFileSync(large,'');truncateSync(large,64*1024*1024+1);
  const bounded=invoke(['analyze','--diff-file',large,'--no-config']);assert.equal(bounded.status,2);assert.equal(bounded.stdout,'');assert.match(bounded.stderr,/E_LIMIT/);
 }finally{rmSync(temp,{recursive:true,force:true});}
});

test('detail text, expression files and expression stdin share clean CLI output',()=>{
 const temp=mkdtempSync(resolve(tmpdir(),'diffdevil-expression-'));
 try {
  const file=resolve(temp,'calculation with spaces.ddexpr');writeFileSync(file,'totals.lines.deleted + 2 * totals.lines.modified\r\n');
  const fromFile=invoke(['query','--report',report('exact'),'--expr-file',file,'--format','value']);
  assert.equal(fromFile.status,0,fromFile.stderr);assert.equal(fromFile.stdout,'248\n');
  const fromStdin=invoke(['query','--report',report('bounded'),'--expr-stdin','--format','value'],{input:'totals.lines.deleted + totals.lines.modified'});
  assert.equal(fromStdin.status,0,fromStdin.stderr);assert.equal(fromStdin.stdout,'10\n');
  const paths=invoke(['query','--report',report('exact'),'--expr','map(filter(files, f => f.included && f.lines.modified > 20), f => f.path)','--format','lines']);
  assert.equal(paths.stdout,'src/Foo.cs\n');assert.equal(paths.status,0,paths.stderr);
  for (const [text,exit] of [['totals.lines.changed > 50',0],['totals.lines.changed > 100',1],['totals.lines.changed > 65',3],['1/0 > 0',2]]) {
   const r=invoke(['check','--report',report('bounded'),'--expr',text]);assert.equal(r.status,exit,r.stderr);assert.equal(r.stdout,'');
  }
  writeFileSync(file,'totals.lines.modifed');
  const invalid=invoke(['query','--report',report('exact'),'--expr-file',file,'--diagnostics','json']);
  assert.equal(invalid.status,2);assert.equal(invalid.stdout,'');
  const diagnostic=JSON.parse(invalid.stderr);assert.equal(diagnostic.code,'E_UNKNOWN_FIELD');assert.equal(diagnostic.range.source,file);assert.deepEqual([diagnostic.range.start,diagnostic.range.end],[13,20]);
  const empty=invoke(['query','--report',report('exact'),'--expr','']);assert.equal(empty.status,2);assert.match(empty.stderr,/E_PARSE/);
 }finally{rmSync(temp,{recursive:true,force:true});}
});

test('expression file and stdin transport preserve BOM offsets and reject a second BOM',()=>{
 const temp=mkdtempSync(resolve(tmpdir(),'diffdevil-bom-'));
 try {
  const file=resolve(temp,'expression.ddexpr');
  const source='\uFEFFtotals.lines.modifed';writeFileSync(file,source);
  for(const [selector,options] of [[['--expr-file',file],{}],[['--expr-stdin'],{input:source}]]) {
   const result=invoke(['query','--report',report('exact'),...selector,'--diagnostics','json'],options);
   assert.equal(result.status,2);assert.equal(result.stdout,'');
   const diagnostic=JSON.parse(result.stderr);
   assert.equal(diagnostic.code,'E_UNKNOWN_FIELD');
   assert.deepEqual([diagnostic.range.start,diagnostic.range.end],[14,21]);
   assert.deepEqual([diagnostic.details.line,diagnostic.details.column],[1,15]);
  }
  writeFileSync(file,'\uFEFFtotals.lines.changed');
  const good=invoke(['query','--report',report('exact'),'--expr-file',file]);assert.equal(good.stdout,'178\n');assert.equal(good.status,0);
  writeFileSync(file,'\uFEFF\uFEFFtotals.lines.changed');
  const double=invoke(['query','--report',report('exact'),'--expr-file',file]);assert.equal(double.status,2);assert.match(double.stderr,/E_LEX_CHARACTER/);
 }finally{rmSync(temp,{recursive:true,force:true});}
});
