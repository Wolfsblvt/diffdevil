// SPDX-License-Identifier: AGPL-3.0-only
import { readdir, readFile, mkdir, cp, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { searchKind } from '../website/src/lib/search-kinds.mjs';
import { origins } from './manifest.mjs';
import { entries as legacyEntries } from '../website/docs-manifest.mjs';
// Historical sources keep their finite route/source identity, not a current-search hit.
const historicalRoutes = new Set(legacyEntries.filter(entry=>entry.historical).map(entry=>entry.route ?? `/docs/${entry.slug}/`));
const root = fileURLToPath(new URL('../../',import.meta.url));
function checked(result,label) { if (result.errors?.length) throw new Error(`${label}: ${result.errors.join('; ')}`); return result; }
function escape(value) { return String(value).replace(/[&<>"']/gu,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]); }
async function htmlFiles(directory) {
 const files = [];
 for (const entry of await readdir(directory,{withFileTypes:true})) {
  if (entry.isDirectory() && entry.name !== 'pagefind') files.push(...await htmlFiles(join(directory,entry.name)));
  else if (entry.isFile() && entry.name.endsWith('.html')) files.push(join(directory,entry.name));
 }
 return files.sort();
}
export function indexable(path,html) {
 return !path.startsWith('/docs/') && !path.startsWith('/downloads/') && !historicalRoutes.has(path) && !['/faq/','/source/','/privacy/','/impressum/','/terms/','/404/'].includes(path) && !path.startsWith('/__qualification/') && !/name=["']robots["'][^>]*content=["'][^"']*noindex/iu.test(html) && /\bdata-pagefind-body\b/u.test(html);
}
export function qualifyFaqRecords(records) {
 const seen = new Set();
 for (const record of records) {
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u.test(record.id) || seen.has(record.id) || record.url !== '/faq/#'+record.id || record.canonical !== origins.site+'/faq/#'+record.id || !record.title || !record.category || !record.html.includes('data-pagefind-body')) throw new Error('FAQ search records must preserve unique source identifiers, category, title and canonical fragment.');
  seen.add(record.id);
 }
 return records;
}
export async function buildSearch() {
 const pagefind = await import('pagefind');
 const manifest = JSON.parse(await readFile(join(root,'artifacts/manual/manifest.json'),'utf8'));
 const {index} = checked(await pagefind.createIndex({rootSelector:'[data-pagefind-body]'}),'Create joined index');
 if (!index) throw new Error('Pagefind returned no index.');
 const records = [], seen = new Set();
 const record = value => {
  if (seen.has(value.url)) throw new Error(`Duplicate current search destination: ${value.url}`);
  seen.add(value.url); records.push(value);
 };
 try {
  for (const [host,directory] of [['site',join(root,'artifacts/website/dist')],['docs',join(root,'artifacts/manual/dist')]]) {
   for (const file of await htmlFiles(directory)) {
    const path = '/'+relative(directory,file).replaceAll('\\','/').replace(/index\.html$/u,'').replace(/\.html$/u,'/');
    const html = await readFile(file,'utf8');
    if (!indexable(path,html)) continue;
    if (host === 'docs' && !manifest.records.some(page=>page.route === path && page.current)) continue;
    const url = origins[host]+path;
    const kind = searchKind(url, { kind: host === 'docs' ? 'DOCS' : undefined });
    const metadata = `<span data-pagefind-meta="kind" data-pagefind-ignore>${kind}</span><span data-pagefind-meta="canonical" data-pagefind-ignore>${escape(url)}</span>`;
    const content = html.replace(/(<[a-z][^>]*\bdata-pagefind-body(?:=["'][^"']*["'])?[^>]*>)/iu,'$1'+metadata);
    checked(await index.addHTMLFile({url,content}),`Index ${url}`); record({url,kind});
   }
  }
  const faqFile = join(root,'artifacts/website/dist/faq/index.html');
  if (existsSync(faqFile)) {
   if (!existsSync(join(root,'apps/website/faq-content.mjs')) || !existsSync(join(root,'docs/manual/faq.md'))) throw new Error('A built FAQ requires its separately admitted source and parser.');
   const {faqRecords} = await import(pathToFileURL(join(root,'apps/website/faq-content.mjs')).href);
   for (const question of qualifyFaqRecords(faqRecords(await readFile(faqFile,'utf8')))) {
    checked(await index.addHTMLFile({url:question.canonical,content:question.html}),`Index FAQ ${question.id}`);
    record({url:question.canonical,kind:'FAQ',id:question.id});
   }
  }
  const output = join(root,'artifacts/public-search/pagefind');
  await rm(output,{recursive:true,force:true}); await mkdir(output,{recursive:true});
  checked(await index.writeFiles({outputPath:output}),'Write joined index');
  for (const host of ['website','manual']) {
   const target = join(root,`artifacts/${host}/dist/pagefind`); await rm(target,{recursive:true,force:true}); await cp(output,target,{recursive:true});
  }
  await writeFile(join(root,'artifacts/public-search/records.json'),JSON.stringify({ref:manifest.ref,records},null,2)+'\n');
  console.log(`Joined search: ${records.length} records; one index mirrored into both hosts.`);
 } finally { await pagefind.close(); }
 return records;
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) await buildSearch();
