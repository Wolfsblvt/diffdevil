// SPDX-License-Identifier: AGPL-3.0-only
/** Mechanical inventories are generated inside a maintained Markdown chapter. */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative, posix } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { sourceUrl } from './source-resolver.mjs';
const cell=value=>String(value ?? '').replaceAll('|','\\|').replace(/\r?\n/gu,' ').trim();
function code(value) {
 const text=String(value ?? '').replace(/\r?\n/gu,' ');
 const length=Math.max(0,...[...text.matchAll(/`+/gu)].map(match=>match[0].length))+1;
 const delimiter='`'.repeat(length), pad=text.startsWith('`')||text.endsWith('`')?' ':'';
 return delimiter+pad+text+pad+delimiter;
}
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
/** Enumerate structural branches without promoting branch-local requirements to globals.
 * References stay references; definitions retain their own schema pointers. */
export function schemaFields(schema, path = '$', required = false, pointer = '#') {
 const rows = [];
 if (typeof schema === 'boolean') return [[code(path), code(schema), required ? 'Required in this object/branch' : 'Not required here', '', code(pointer), 'Boolean schema']];
 if (!schema || typeof schema !== 'object') return rows;
 const type = schema.type ?? (schema.properties ? 'object' : schema.$ref ? 'reference' : 'unspecified');
 const nested = new Set(['properties','patternProperties','$defs','definitions','items','prefixItems','additionalProperties','unevaluatedProperties','contains','propertyNames','oneOf','anyOf','allOf','not','if','then','else','dependentSchemas']);
 const constraints = Object.fromEntries(Object.entries(schema).filter(([key]) => !nested.has(key) && !['type','description','title','$comment','$schema','$id'].includes(key)));
 rows.push([code(path), Array.isArray(type) ? type.map(code).join(' | ') : code(type), required ? 'Required in this object/branch' : 'Not required here', schema.description ?? '', code(pointer), code(JSON.stringify(constraints))]);
 const escape = value => value.replaceAll('~','~0').replaceAll('/','~1');
 for (const [name, child] of Object.entries(schema.properties ?? {})) rows.push(...schemaFields(child, path + '.' + name, schema.required?.includes(name), pointer + '/properties/' + escape(name)));
 for (const keyword of ['patternProperties','$defs','definitions','dependentSchemas'])
  for (const [name, child] of Object.entries(schema[keyword] ?? {})) rows.push(...schemaFields(child, path + '.' + keyword + '[' + JSON.stringify(name) + ']', false, pointer + '/' + keyword + '/' + escape(name)));
 for (const keyword of ['items','additionalProperties','unevaluatedProperties','contains','propertyNames','not','if','then','else'])
  if (schema[keyword] !== undefined && !Array.isArray(schema[keyword])) rows.push(...schemaFields(schema[keyword], path + (keyword === 'items' ? '[]' : '.' + keyword), false, pointer + '/' + keyword));
 for (const keyword of ['oneOf','anyOf','allOf','prefixItems'])
  for (const [index, child] of (schema[keyword] ?? []).entries()) rows.push(...schemaFields(child, path + '.' + keyword + '[' + index + ']', false, pointer + '/' + keyword + '/' + index));
 return rows;
}
/** Public aliases, overloads and type declarations come from the built package exports. */
function publicApi(root, pkg, link, recordSource) {
 const ts = createRequire(new URL('./package.json', import.meta.url))('typescript');
 const entries = Object.entries(pkg.exports).filter(([,value]) => value && typeof value === 'object' && typeof value.types === 'string');
 const program = ts.createProgram(entries.map(([,value]) => join(root,value.types)), {skipLibCheck:true,module:ts.ModuleKind.NodeNext,moduleResolution:ts.ModuleResolutionKind.NodeNext,target:ts.ScriptTarget.ES2022});
 const checker = program.getTypeChecker(), printer = ts.createPrinter({removeComments:true,newLine:ts.NewLineKind.LineFeed});
 const declarations = new Map(), indexes = [];
 for (const [subpath,value] of entries) {
  recordSource(value.types.replace(/^\.\//u,''));
  const file = program.getSourceFile(join(root,value.types));
  const module = file && checker.getSymbolAtLocation(file);
  if (!module) throw new Error(`Public declaration was not built: ${value.types}`);
  const rows = checker.getExportsOfModule(module).sort((a,b)=>a.name < b.name ? -1 : a.name > b.name ? 1 : 0).map(item => {
   const target = item.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(item) : item;
   const nodes = target.getDeclarations() ?? [];
   if (!nodes.length) throw new Error(`Missing declaration for ${subpath}/${item.name}`);
   const declaredPath = relative(root,nodes[0].getSourceFile().fileName).replaceAll('\\','/');
   const id = 'api-' + (declaredPath.replace(/^dist\/lib\//u,'').replace(/\.d\.ts$/u,'') + '-' + target.name).replace(/[^A-Za-z0-9_-]/gu,'-').toLowerCase();
   if (!declarations.has(id)) {
    const bodies = nodes.map(node => {
     recordSource(relative(root,node.getSourceFile().fileName).replaceAll('\\','/'));
     const printed = printer.printNode(ts.EmitHint.Unspecified,node,node.getSourceFile()).trim();
     return ts.isVariableDeclaration(node) ? 'declare const ' + printed + ';' : printed;
    });
    const source = declaredPath.replace(/^dist\/lib\//u,'src/diffdevil/').replace(/\.d\.ts$/u,'.ts');
    const external = declaredPath.startsWith('node_modules/');
    if (!external && !existsSync(join(root,source))) throw new Error(`No canonical source for ${declaredPath}`);
    if (!external) recordSource(source);
    declarations.set(id, `<a id="${id}"></a>\n\n#### ${code(target.name)}\n\n${external ? code(declaredPath) + ' · ' + link('Dependency identity', 'package-lock.json') : link('Canonical source',source)}\n\n` + '```typescript\n' + [...new Set(bodies)].join('\n') + '\n```');
   }
   return [code(item.name),code(target.name),`[Declaration](#${id})`];
  });
  indexes.push(`### ${subpath === '.' ? pkg.name : pkg.name + subpath.slice(1)}\n\n${table(['Public export','Declared symbol','Signature / type'],rows)}`);
 }
 return indexes.join('\n\n') + '\n\n### Public declarations\n\n' + [...declarations.entries()].sort(([a],[b])=>a < b ? -1 : a > b ? 1 : 0).map(([,body])=>body).join('\n\n');
}
/** Run only the explicit, read-only specimens selected below. */
function cli(root, entry, args, expected = 0) {
 const result = spawnSync(process.execPath,[join(root,entry),...args],{cwd:root,encoding:'utf8',env:{...process.env,NO_COLOR:'1',FORCE_COLOR:'0'},shell:false,windowsHide:true});
 if (result.error || result.status !== expected) throw new Error(`Manual specimen ${args.join(' ')} failed: ${result.error?.message ?? result.stderr}`);
 return result.stdout.replace(/\r\n/gu,'\n').trimEnd();
}
export function generatedIsland(id,{root,ref,source,onSource = () => {}}) {
 const recordSource = path => { onSource(path); };
 const read = path => { recordSource(path); return readFileSync(join(root,path),'utf8'); };
 const pkg=JSON.parse(read('package.json'));
 const require=createRequire(join(root,'package.json'));
 const entry=typeof pkg.bin==='string'?pkg.bin:pkg.bin.diffdevil;
 const run=args=>cli(root,entry,args);
 const link=(label,path)=>{ recordSource(path); const url = source ? posix.relative(posix.dirname(source),path) : sourceUrl(path,ref); return `[${label}](${url})`; };
 if(id==='actions') {
  const {parse}=require('yaml');
  return ['action.yml','actions/analyze/action.yml','actions/apply/action.yml','actions/sync-labels/action.yml'].map(path=>{
   const action=parse(read(path));
   const inputs=Object.entries(action.inputs ?? {}).map(([name,value])=>[code(name),value.required===true?'Yes':'No',value.default === undefined ? 'Not declared' : code(JSON.stringify(value.default)),value.description]);
   const outputs=Object.entries(action.outputs ?? {}).map(([name,value])=>[code(name),value.description]);
   return `### ${path}\n\n${link('Canonical Action metadata',path)}\n\n${table(['Input','Required','Default','Description'],inputs)}\n\n${table(['Output','Description'],outputs)}`;
  }).join('\n\n');
 }
 if(id==='cli-help') {
  const output=run(['--help']);
  return '```text\n'+output.trimEnd()+'\n```';
 }
 if(id==='typescript-exports') return publicApi(root,pkg,link,recordSource);
 if(id==='real-pr-catalogue') {
  const catalogue=JSON.parse(read('docs/examples/catalogue/catalogue.json'));
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
   const schema=JSON.parse(read(path));
   return `### ${path.split('/').at(-1)}\n\n${link('Canonical JSON Schema',path)}\n\n${table(['Field / branch','Type','Requiredness','Description','Schema pointer','Constraints'],schemaFields(schema))}`;
  }).join('\n\n');
 }
 if(id==='presets') {
  const {parse,stringify}=require('yaml');
  const path='src/diffdevil/presets/size-v1.yml';
  const expansion=JSON.parse(run(['explain','--policy','--preset','size@1','--no-config','--format','json']));
  assert.deepEqual(expansion.document,parse(read(path)), 'size@1 expansion drifted from its canonical source');
  return `${link('size@1 source',path)}\n\n` + '```yaml\n' + stringify(expansion.document).trimEnd() + '\n```';
 }
 if (['detail-operators','detail-functions','detail-diagnostics','detail-limits'].includes(id)) {
  const section = id.slice('detail-'.length);
  const all = generatedIsland('detail',{root,ref,source,onSource});
  const title = section[0].toUpperCase()+section.slice(1);
  const start = all.indexOf('### '+title+'\n\n') + ('### '+title+'\n\n').length;
  const end = all.indexOf('\n\n### ',start);
  return all.slice(start,end < 0 ? undefined : end);
 }
 if(id==='detail-shortcuts') {
  const path='src/diffdevil/contracts/detail/v1/shortcuts.json', data=JSON.parse(read(path));
  return link('Canonical shortcut contract',path)+'\n\n'+table(['Alias','Canonical meaning'],Object.entries(data.aliases).map(([key,value])=>[code(key),code(value)]))+'\n\n'+table(['Projection field','Canonical field'],Object.entries(data.projectionFields).map(([key,value])=>[code(key),code(value)]))+'\n\n'+table(['Canonical measure ID'],data.canonicalMeasureIds.map(value=>[code(value)]));
 }
 if(id==='detail-environment') {
  const path='src/diffdevil/contracts/detail/v1/environment.json', environment=JSON.parse(read(path));
  return link('Canonical environment contract',path)+'\n\n'+Object.entries(environment).map(([key,value])=>`### ${key}\n\n`+table(['Key / index','Value'],Object.entries(typeof value==='object'?value:{value}).map(([name,item])=>[code(name),code(typeof item==='object'?JSON.stringify(item):item)]))).join('\n\n');
 }
 if(id==='detail-versions') {
  const path='src/diffdevil/contracts/detail/v1/profile.json';
  return link('Canonical profile metadata',path)+'\n\n'+table(['Field','Value'],Object.entries(JSON.parse(read(path))).map(([key,value])=>[code(key),code(value)]));
 }
 if(id==='detail') {
  const directory='src/diffdevil/contracts/detail/v1';
  const contract=name=>JSON.parse(read(directory+'/'+name+'.json'));
  const {functions}=contract('functions'), {operators}=contract('operators'), {codes}=contract('diagnostics'), limits=contract('limits');
  if (![functions,operators,codes].every(items=>Array.isArray(items)&&items.length)) throw new Error('A selected detail catalogue is empty.');
  const inventory=table(['Canonical source'],files(root,directory).map(path=>[link(relative(directory,path).replaceAll('\\','/'),path)]));
  return `### Operators\n\n${table(['Operator','Arity','Arguments','Result','Precedence','Associativity','Lazy'],operators.map(op=>[code(op.symbol),op.arity,op.arguments.map(code).join(', '),code(op.result),op.precedence,op.associativity,op.lazy]))}\n\n` +
   `### Functions\n\n${table(['Function','Signatures','Evaluation'],functions.map(fn=>[code(fn.name),fn.signatures.map(code).join('; '),fn.evaluation]))}\n\n` +
   `### Diagnostics\n\n${table(['Code','Phase','Meaning'],codes.map(row=>[code(row.code),row.defaultPhase,row.meaning]))}\n\n` +
   `### Limits\n\n${link('Canonical limits and standing',directory+'/limits.json')}\n\n${table(['Limit','Value'],Object.entries(limits).map(([name,value])=>[code(name),code(typeof value === 'object' ? JSON.stringify(value) : String(value))]))}\n\n` +
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
