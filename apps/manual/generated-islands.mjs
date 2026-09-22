// SPDX-License-Identifier: AGPL-3.0-only
/** Mechanical inventories are generated inside a maintained Markdown chapter. */
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { sourceUrl } from './source-resolver.mjs';
const cell=value=>String(value ?? '').replaceAll('|','\\|').replace(/\r?\n/gu,' ').trim();
const code=value=>'`'+String(value ?? '').replaceAll('`','').replace(/\r?\n/gu,' ')+'`';
function table(headers,rows) { return ['| '+headers.join(' | ')+' |','| '+headers.map(()=>'---').join(' | ')+' |',...rows.map(row=>'| '+row.map(cell).join(' | ')+' |')].join('\n'); }
function files(root,base) {
 const result=[];
 for(const entry of readdirSync(join(root,base),{withFileTypes:true})) {
  const path=base+'/'+entry.name;
  if(entry.isDirectory()) result.push(...files(root,path));
  else if(entry.isFile()) result.push(path);
 }
 return result.sort();
}
/** Enumerate schema fields without interpreting structural validation as semantic validity. */
export function schemaFields(schema, path = '$', required = false) {
 const rows = [];
 if (!schema || typeof schema !== 'object') return rows;
 const type = schema.type ?? (schema.const !== undefined ? JSON.stringify(schema.const) : schema.enum ? schema.enum.map(value=>JSON.stringify(value)).join(' | ') : schema.$ref ?? (schema.properties ? 'object' : 'branch'));
 rows.push([code(path), Array.isArray(type) ? type.join(' | ') : code(type), required ? 'Required in this object/branch' : 'Not required here', schema.description ?? '']);
 for (const [name, child] of Object.entries(schema.properties ?? {})) rows.push(...schemaFields(child, path + '.' + name, schema.required?.includes(name)));
 if (schema.items && !Array.isArray(schema.items)) rows.push(...schemaFields(schema.items, path + '[]'));
 if (schema.additionalProperties && typeof schema.additionalProperties === 'object') rows.push(...schemaFields(schema.additionalProperties, path + '.*'));
 for (const choice of ['oneOf','anyOf','allOf']) for (const [index, child] of (schema[choice] ?? []).entries()) rows.push(...schemaFields(child, path + '.' + choice + '[' + index + ']'));
 return rows;
}
/** Run only the explicit, read-only specimens selected below. */
function cli(root, entry, args, expected = 0) {
 const result = spawnSync(process.execPath,[join(root,entry),...args],{cwd:root,encoding:'utf8',env:{...process.env,NO_COLOR:'1',FORCE_COLOR:'0'},shell:false,windowsHide:true});
 if (result.error || result.status !== expected) throw new Error(`Manual specimen ${args.join(' ')} failed: ${result.error?.message ?? result.stderr}`);
 return result.stdout.replace(/\r\n/gu,'\n').trimEnd();
}
export function generatedIsland(id,{root,ref}) {
 const pkg=JSON.parse(readFileSync(join(root,'package.json'),'utf8'));
 const require=createRequire(join(root,'package.json'));
 const entry=typeof pkg.bin==='string'?pkg.bin:pkg.bin.diffdevil;
 const run=args=>cli(root,entry,args);
 const link=(label,path)=>`[${label}](${sourceUrl(path,ref)})`;
 if(id==='actions') {
  const {parse}=require('yaml');
  return ['action.yml','actions/analyze/action.yml','actions/apply/action.yml','actions/sync-labels/action.yml'].map(path=>{
   const action=parse(readFileSync(join(root,path),'utf8'));
   const inputs=Object.entries(action.inputs ?? {}).map(([name,value])=>[code(name),value.required===true?'Yes':'No',code(value.default ?? ''),value.description]);
   const outputs=Object.entries(action.outputs ?? {}).map(([name,value])=>[code(name),value.description]);
   return `### ${path}\n\n${link('Canonical Action metadata',path)}\n\n${table(['Input','Required','Default','Description'],inputs)}\n\n${table(['Output','Description'],outputs)}`;
  }).join('\n\n');
 }
 if(id==='cli-help') {
  const output=run(['--help']);
  return '```text\n'+output.trimEnd()+'\n```';
 }
 if(id==='typescript-exports') {
  const ts=createRequire(new URL('./package.json',import.meta.url))('typescript');
  const entries=Object.entries(pkg.exports).filter(([,value])=>value && typeof value==='object' && typeof value.types==='string');
  const roots=entries.map(([,value])=>join(root,value.types));
  const program=ts.createProgram(roots,{skipLibCheck:true,module:ts.ModuleKind.NodeNext,moduleResolution:ts.ModuleResolutionKind.NodeNext,target:ts.ScriptTarget.ES2022});
  const checker=program.getTypeChecker();
  return entries.map(([subpath,value])=>{
   const file=program.getSourceFile(join(root,value.types));
   const symbol=file && checker.getSymbolAtLocation(file);
   if(!symbol) throw new Error(`Public declaration was not built: ${value.types}`);
   const exported=checker.getExportsOfModule(symbol).map(item=>item.getName()).sort();
   return `### ${subpath==='.'?pkg.name:pkg.name+subpath.slice(1)}\n\n${table(['Export'],exported.map(name=>[code(name)]))}`;
  }).join('\n\n');
 }
 if(id==='real-pr-catalogue') {
  const catalogue=JSON.parse(readFileSync(join(root,'docs/examples/catalogue/catalogue.json'),'utf8'));
  if (!Array.isArray(catalogue.entries) || !catalogue.entries.length) throw new Error('The shared PR catalogue is empty.');
  return table(['Example','Lessons','Inspect'],catalogue.entries.map(entry=>{
   const variant=entry.variants?.[0];
   if (!variant) throw new Error(`No catalogue variant for ${entry.id}`);
   return [entry.title,entry.lessons.join(', '),`[Open in the playground](https://diffdevil.dev/playground/?example=${encodeURIComponent(entry.id)}&variant=${encodeURIComponent(variant.id)})`];
  }));
 }
 if(id==='schemas') {
  const paths=files(root,'src/diffdevil/contracts/schemas').filter(path=>path.endsWith('.json'));
  if(!paths.length) throw new Error('The canonical schema inventory is empty.');
  return paths.map(path=>{
   const schema=JSON.parse(readFileSync(join(root,path),'utf8'));
   return `### ${path.split('/').at(-1)}\n\n${link('Canonical JSON Schema',path)}\n\n${table(['Field / branch','Type or value','Requiredness','Description'],schemaFields(schema))}`;
  }).join('\n\n');
 }
 if(id==='presets') {
  const {parse,stringify}=require('yaml');
  const path='src/diffdevil/presets/size-v1.yml';
  const expansion=JSON.parse(run(['explain','--policy','--preset','size@1','--no-config','--format','json']));
  assert.deepEqual(expansion.document,parse(readFileSync(join(root,path),'utf8')), 'size@1 expansion drifted from its canonical source');
  return `${link('size@1 source',path)}\n\n` + '```yaml\n' + stringify(expansion.document).trimEnd() + '\n```';
 }
 if(id==='detail') {
  const directory='src/diffdevil/contracts/detail/v1';
  const read=name=>JSON.parse(readFileSync(join(root,directory,name+'.json'),'utf8'));
  const {functions}=read('functions'), {operators}=read('operators'), {codes}=read('diagnostics'), limits=read('limits');
  if (![functions,operators,codes].every(items=>Array.isArray(items)&&items.length)) throw new Error('A selected detail catalogue is empty.');
  const inventory=table(['Canonical source'],files(root,directory).map(path=>[link(relative(directory,path).replaceAll('\\','/'),path)]));
  return `### Operators\n\n${table(['Operator','Arity','Arguments','Result','Precedence','Associativity','Lazy'],operators.map(op=>[code(op.symbol),op.arity,op.arguments.map(code).join(', '),code(op.result),op.precedence,op.associativity,op.lazy]))}\n\n` +
   `### Functions\n\n${table(['Function','Signatures','Evaluation'],functions.map(fn=>[code(fn.name),fn.signatures.map(code).join('; '),fn.evaluation]))}\n\n` +
   `### Diagnostics\n\n${table(['Code','Phase','Meaning'],codes.map(row=>[code(row.code),row.defaultPhase,row.meaning]))}\n\n` +
   `### Limits\n\n${link('Canonical limits and standing',directory+'/limits.json')}\n\n${table(['Limit','Value'],Object.entries(limits).filter(([,value])=>typeof value==='number').map(([name,value])=>[code(name),value]))}\n\n` +
   `### Language contract sources\n\n${inventory}`;
 }
 if(['presenter-small','presenter-first-plan','presenter-report','presenter-plan'].includes(id)) {
  const report='docs/examples/reports/exact.json', policy='docs/examples/policies/full.yml';
  const small=['presenter-small','presenter-first-plan'].includes(id);
  const source=small?['--diff-file','docs/examples/diffs/review.diff','--no-config']:['--report',report,'--config',policy];
  const facts=JSON.parse(run(['analyze',...source,'--format','json']));
  const scalar=JSON.parse(run(['query',...source,'--expr','totals.lines.changed','--format','value']));
  assert.equal(scalar,small?10:178,'The small teaching input and large presenter input are different specimens.');
  if(small) assert.equal(JSON.parse(run(['query',...source,'--expr','totals.raw.churn','--format','value'])),16);
  assert.equal(facts.kind,'diffdevil.report');
  const command=id==='presenter-first-plan'?['plan',...source,'--target-repo','example/repository','--target-pr','42']:id==='presenter-plan'?['plan',...source,'--target-repo','example/repository','--target-pr','42','--definitions','ensure']:['analyze',...source];
  return '```text\n'+run([...command,'--format','human','--color','never'])+'\n```';
 }
 throw new Error(`Unknown generated island: ${id}`);
}
