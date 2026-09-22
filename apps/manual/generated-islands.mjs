// SPDX-License-Identifier: AGPL-3.0-only
/** Mechanical inventories are generated inside a maintained Markdown chapter. */
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
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
export function generatedIsland(id,{root,ref}) {
 const pkg=JSON.parse(readFileSync(join(root,'package.json'),'utf8'));
 const require=createRequire(join(root,'package.json'));
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
  const entry=typeof pkg.bin==='string'?pkg.bin:pkg.bin.diffdevil;
  const output=execFileSync(process.execPath,[join(root,entry),'--help'],{cwd:root,encoding:'utf8',env:{...process.env,NO_COLOR:'1',FORCE_COLOR:'0'},shell:false});
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
   return [entry.title,entry.lessons.join(', '),`[Open in the playground](https://diffdevil.dev/playground/?example=${encodeURIComponent(entry.id+'--'+variant.id)})`];
  }));
 }
 if(id==='schemas') {
  const paths=files(root,'src/diffdevil/contracts/schemas').filter(path=>path.endsWith('.json'));
  if(!paths.length) throw new Error('The canonical schema inventory is empty.');
  return table(['Schema','Identity'],paths.map(path=>{const schema=JSON.parse(readFileSync(join(root,path),'utf8'));return [link(path.split('/').at(-1),path),code(schema.$id ?? schema.title ?? '')];}));
 }
 const directories={detail:'src/diffdevil/contracts/detail/v1',presets:'src/diffdevil/presets'};
 if(Object.hasOwn(directories,id)) {
  const paths=files(root,directories[id]);
  if(!paths.length) throw new Error(`The canonical ${id} inventory is empty.`);
  const inventory=table(['Canonical source'],paths.map(path=>[link(relative(directories[id],path).replaceAll('\\','/'),path)]));
  if (id !== 'detail') return inventory;
  const functions=JSON.parse(readFileSync(join(root,directories.detail,'functions.json'),'utf8')).functions;
  if (!Array.isArray(functions) || !functions.length) throw new Error('The canonical function inventory is empty.');
  return `### Functions\n\n${table(['Function','Signatures','Evaluation'],functions.map(fn=>[code(fn.name),fn.signatures.map(code).join('; '),fn.evaluation]))}\n\n### Language contract sources\n\n${inventory}`;
 }
 throw new Error(`Unknown generated island: ${id}`);
}
