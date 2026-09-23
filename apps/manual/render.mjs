// SPDX-License-Identifier: AGPL-3.0-only
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, statSync } from 'node:fs';
import { dirname, join, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkStringify from 'remark-stringify';
import GithubSlugger from 'github-slugger';
import { manualPages, pages, pageUrl, validateManifest } from './manifest.mjs';
import { migrations, validateTransfer, cutoverPlan, legacyRedirects, pageIsCurrent, validateRetiredRoutes } from './migration.mjs';
import { sourceTargets, sourceResolverUrl, sourceUrl } from './source-resolver.mjs';
import { projectIslands } from './generated-content.mjs';
import { entries as legacyEntries } from '../website/docs-manifest.mjs';
import { faqRecords, FAQ_SOURCE, FAQ_CANONICAL } from '../website/faq-content.mjs';
import relatedQuestions from './related-questions.json' with { type: 'json' };
import publicAssets from './assets.json' with { type: 'json' };

export const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const parser = unified().use(remarkParse).use(remarkGfm);
const printer = unified().use(remarkStringify, { bullet: '-', fences: true }).use(remarkGfm);
function walk(node, visit) { visit(node); for (const child of node.children ?? []) walk(child, visit); }
function text(node) { return node.value ?? (node.children ?? []).map(text).join(''); }
export function anchorsOf(markdown) {
 const slugger = new GithubSlugger(), result = [];
 walk(parser.parse(markdown), node => {
  if (node.type === 'heading') result.push(slugger.slug(text(node)));
  if (node.type === 'html') for (const match of node.value.matchAll(/\bid=["']([^"']+)["']/gu)) result.push(match[1]);
 });
 return result;
}
export function sourceRef(root = repositoryRoot) {
 const ref = process.env.DIFFDEVIL_SOURCE_REF ?? execFileSync('git', ['rev-parse','HEAD'], { cwd: root, encoding: 'utf8' }).trim();
 if (!/^[a-f0-9]{40}$/u.test(ref)) throw new Error('DIFFDEVIL_SOURCE_REF must be an exact commit SHA.');
 return ref;
}
function editRef(root) {
 const ref = process.env.DIFFDEVIL_EDIT_REF || process.env.GITHUB_HEAD_REF || execFileSync('git',['branch','--show-current'],{cwd:root,encoding:'utf8'}).trim() || 'main';
 if (!/^[a-zA-Z0-9_./-]+$/u.test(ref) || ref.includes('..')) throw new Error('Invalid edit branch.');
 return ref;
}
/** Compatibility anchors supplement, never duplicate, the current article headings. */
export function fragmentAliases(state,anchorInventory,entries = legacyEntries) {
 const fragments = {};
 for (const [source,transfer] of Object.entries(state.transfers ?? {})) {
  if (transfer.phase === 'current') continue;
  const landings = new Set([transfer.primary]);
  for (const entry of entries.filter(entry=>entry.source===source)) {
   const route = entry.route ?? (entry.slug ? `/docs/${entry.slug}/` : '/docs/');
   if (state.routes?.[route]) landings.add(state.routes[route].target);
  }
  for (const key of landings) {
   const map = fragments[key] ??= {};
   for (const [old,destination] of Object.entries(transfer.anchors ?? {})) {
    const url = pageUrl(destination.page)+'#'+encodeURIComponent(destination.anchor);
    const unchanged = pageUrl(key)+'#'+encodeURIComponent(old);
    if ((map[old] && map[old] !== url) || (anchorInventory[key]?.includes(old) && url !== unchanged)) throw new Error(`Ambiguous old fragment: ${old}`);
    if (url !== unchanged) map[old] = url;
   }
  }
 }
 return fragments;
}
/** AST rewriting keeps code, titles, reference definitions and nested Markdown intact. */
export function projectMarkdown(raw, page, {root, ref, targets, assets = {}}) {
 const tree = parser.parse(raw);
 const h1s = tree.children.filter(node => node.type === 'heading' && node.depth === 1);
 if (h1s.length !== 1 || text(h1s[0]) !== page.title) throw new Error(`${page.source}: one H1 matching the manifest title is required.`);
 tree.children = tree.children.filter(node => node !== h1s[0]);
 const links = [], fragments = [];
 walk(tree, node => {
  if (node.type === 'html' && /<!--\s*authoring:/u.test(node.value)) node.value = '';
  if (node.type === 'html' && /(?:href|src)=["'](?!https?:|#|\/)/u.test(node.value)) throw new Error(`${page.source}: use Markdown links/images for source-relative URLs.`);
  if (!['link','image','definition'].includes(node.type)) return;
  const target = node.url;
  if (target.startsWith('#')) { fragments.push({source:page.source,anchor:decodeURIComponent(target.slice(1))}); return; }
  if (/^[a-z][a-z0-9+.-]*:/iu.test(target)) {
   if (!/^(?:https?:|mailto:)/iu.test(target)) throw new Error(`${page.source}: unsupported link scheme: ${target}`);
   return;
  }
  if (target.startsWith('/')) throw new Error(`${page.source}: repository Markdown needs relative source links or explicit public URLs: ${target}`);
  const url = new URL(target, 'https://source.invalid/' + page.source);
  let path;
  try { path = decodeURIComponent(url.pathname.slice(1)); } catch { throw new Error(`${page.source}: malformed source link`); }
  if (path.includes('\\') || path.split('/').includes('..') || !existsSync(join(root,path))) throw new Error(`${page.source}: missing source link: ${target}`);
  links.push(path);
  if (url.hash && path.endsWith('.md')) fragments.push({source:path,anchor:decodeURIComponent(url.hash.slice(1))});
  const selected = pages.find(item => item.source === path);
  if (node.type === 'image') {
   if (!Object.hasOwn(assets,path)) throw new Error(`${page.source}: register the selected public image: ${path}`);
   node.url = assets[path] + url.hash;
  } else if (selected) node.url = pageUrl(selected.key) + url.search + url.hash;
  else if (Object.hasOwn(targets,path)) node.url = sourceResolverUrl(path) + url.hash;
  else {
   if (path.endsWith('.md')) throw new Error(`${page.source}: add a technical Markdown destination to the finite source allow-list: ${path}`);
   node.url = (statSync(join(root,path)).isDirectory() ? sourceUrl(path,ref).replace('/blob/','/tree/') : sourceUrl(path,ref)) + url.hash;
  }
 });
 return { body: printer.stringify(tree), links, fragments };
}
/** The availability marker describes capability, never the chapter's writing status. */
export function validateAvailability(raw, page) {
 const body = parser.parse(raw).children.filter(node => node.type !== 'heading' || node.depth !== 1)
  .filter(node => !(node.type === 'html' && /^<!--/u.test(node.value.trim())));
 const notes = body.filter(node => node.type === 'blockquote' && /^\[!NOTE\]\s+In development(?:\s|$)/u.test(text(node.children?.[0] ?? node)));
 const expected = page.availability === 'in-development';
 if (notes.length !== (expected ? 1 : 0) || (expected && body[0] !== notes[0])) throw new Error(`${page.source}: capability standing requires one top-only In development NOTE, or none for current capability.`);
}
export function validateFragments(references, inventory) {
 for (const {from,source,anchor} of references) {
  if (Object.hasOwn(inventory,source) && !inventory[source].includes(anchor)) throw new Error(`${from}: missing selected fragment ${source}#${anchor}`);
 }
}

export function generateManual({root = repositoryRoot, qa = process.env.DIFFDEVIL_DOCS_QA === '1'} = {}) {
 validateManifest();
 const ref = sourceRef(root), branch = editRef(root), state = JSON.parse(readFileSync(join(root,'apps/manual/authoring-state.json'),'utf8'));
 const version = JSON.parse(readFileSync(join(root,'package.json'),'utf8')).version;
 const exists = path => existsSync(join(root,path));
 for (const key of Object.keys(state.pages ?? {})) if (!pages.some(page => page.key === key)) throw new Error(`Unknown authoring page: ${key}`);
 for (const key of Object.keys(state.transfers ?? {})) if (!migrations.some(row => row.source === key)) throw new Error(`Unknown source transfer: ${key}`);
 const targets = sourceTargets({ref,state,exists,legacySources:legacyEntries.map(entry => entry.source)});
 const questions = new Map(faqRecords(readFileSync(join(root,FAQ_SOURCE),'utf8')).map(question => [question.id,question]));
 for (const [key,ids] of Object.entries(relatedQuestions)) {
  if (!manualPages.some(page => page.key === key)) throw new Error(`Unknown related-question page: ${key}`);
  if (new Set(ids).size !== ids.length) throw new Error(`Duplicate related FAQ id for ${key}`);
  for (const id of ids) if (!questions.has(id)) throw new Error(`Unknown related FAQ id ${id} for ${key}`);
 }
 for (const [source,route] of Object.entries(publicAssets)) {
  if (!exists(source) || !statSync(join(root,source)).isFile() || !/^\/assets\/manual\/[a-zA-Z0-9._/-]+$/u.test(route) || route.split('/').includes('..')) throw new Error(`Invalid public asset registration: ${source}`);
 }
 const out = join(root,'apps/manual/src/content/docs'), evidence = join(root,'artifacts/manual');
 rmSync(out,{recursive:true,force:true}); mkdirSync(out,{recursive:true}); mkdirSync(evidence,{recursive:true});
 const generatedReceipts = [];
 const records = [], anchorInventory = {}, sourceLinks = {}, fragmentReferences = [];
 for (const page of manualPages) {
  let raw = readFileSync(join(root,page.source),'utf8');
  const standing = state.pages?.[page.key]?.status;
  if (!['scaffold','authored'].includes(standing)) throw new Error(`${page.source}: explicit authoring standing is required.`);
  if (standing === 'authored' && /<!--\s*authoring:\s*scaffold/u.test(raw)) throw new Error(`${page.source}: remove the scaffold marker after authoring.`);
  validateAvailability(raw,page);
  const digest = createHash('sha256').update(raw).digest('hex');
  raw = projectIslands(raw,{root,ref,source:page.source,receipts:generatedReceipts});
  const projection = projectMarkdown(raw,page,{root,ref,targets,assets:publicAssets});
  if (relatedQuestions[page.key]?.length) projection.body += '\n## Related questions\n\n' + relatedQuestions[page.key].map(id => {
   const question = questions.get(id);
   return `- [${question.title.replace(/[\[\]\\]/gu,'\\$&')}](${FAQ_CANONICAL}#${id})`;
  }).join('\n') + '\n';
  const anchors = [...new Set(['_top', ...anchorsOf(projection.body)])];
  anchorInventory[page.key] = anchors; sourceLinks[page.source] = projection.links;
  fragmentReferences.push(...projection.fragments.map(item=>({...item,from:page.source})));
  const current = pageIsCurrent(page.key,state);
  const front = {
   title: page.title, editUrl: `https://github.com/Wolfsblvt/diffdevil/edit/${branch}/${page.source}`,
   pagefind: current,
   head: [{tag:'meta',attrs:{name:'diffdevil-availability',content:page.availability}}, ...(!current ? [{tag:'meta',attrs:{name:'robots',content:'noindex, nosnippet'}}] : [])],
   diffdevil: { key:page.key,source:page.source,sourceUrl:sourceUrl(page.source,ref),sourceRef:ref,appliesTo:version,availability:page.availability },
  };
  const file = join(out,page.route === '/' ? 'index.md' : page.route.slice(1,-1)+'.md');
  mkdirSync(dirname(file),{recursive:true}); writeFileSync(file,'---\n'+JSON.stringify(front,null,2)+'\n---\n\n'+projection.body);
  records.push({...page,current,authoring:standing,sourceSha256:digest,anchors});
 }
 validateFragments(fragmentReferences,{...Object.fromEntries(records.map(page=>[page.source,page.anchors])),[FAQ_SOURCE]:anchorsOf(readFileSync(join(root,FAQ_SOURCE),'utf8'))});
 const incoming = {};
 const trackedMarkdown = execFileSync('git',['ls-files','-z','--','*.md'],{cwd:root,encoding:'utf8'}).split('\0').filter(path=>path && !path.startsWith('actions/runtime/') && !path.startsWith('docs/reference/'));
 const scan = new Set([...trackedMarkdown,'README.md','docs/README.md',...manualPages.map(page=>page.source),...migrations.map(row=>row.source),FAQ_SOURCE,...legacyEntries.map(entry=>entry.source)]);
 for (const source of scan) if (exists(source)) {
  walk(parser.parse(readFileSync(join(root,source),'utf8')), node => {
   if (!['link','definition'].includes(node.type) || /^(?:[a-z]+:|#|\/)/iu.test(node.url)) return;
   const path = posix.normalize(posix.join(posix.dirname(source),node.url.split(/[?#]/u)[0]));
   (incoming[path] ??= []).push(source);
  });
 }
 for (const row of migrations) {
  const transfer = state.transfers?.[row.source];
  if (transfer && transfer.phase !== 'current') {
   if (!/^[a-f0-9]{40}$/u.test(transfer.fromRef ?? '')) throw new Error(`${row.source}: capture from an exact historical Git commit`);
   const old = execFileSync('git',['show',`${transfer.fromRef}:${row.source}`],{cwd:root,encoding:'utf8'});
   const oldHash = createHash('sha256').update(old).digest('hex');
   const oldAnchors = [...new Set(['_top',...anchorsOf(old)])].sort();
   if (oldHash !== transfer.fromSourceSha256 || JSON.stringify(oldAnchors) !== JSON.stringify([...(transfer.oldAnchors ?? [])].sort())) throw new Error(`${row.source}: historical source digest or fragment inventory does not match Git`);
  }
  validateTransfer(row,transfer,state,{sourceExists:exists(row.source),inboundLinks:incoming[row.source] ?? [],targetAnchors:anchorInventory});
 }
 const repositoryRedirects = legacyEntries.filter(entry=>entry.repositoryOnly).map(entry=> {
  if (!exists(entry.source) || !Object.hasOwn(targets,entry.source)) throw new Error(`Unqualified repository-only destination: ${entry.source}`);
  return {from:entry.route ?? `/docs/${entry.slug}/`,to:sourceUrl(entry.source,ref),status:308};
 });
 const redirects = [...legacyRedirects(state),...repositoryRedirects];
 validateRetiredRoutes(state,legacyEntries,redirects);
 const aliases = manualPages.flatMap(page=>page.aliases.map(from=>({from,to:pageUrl(page.key),status:308})));
 const fragments = fragmentAliases(state,anchorInventory);
 const report = {ref,version,records,aliases,redirects,fragments,cutover:cutoverPlan(state),faq:{source:'docs/manual/faq.md',present:exists('docs/manual/faq.md'),shellPresent:exists('apps/website/src/pages/faq.astro')},qa};
 writeFileSync(join(evidence,'generated-islands.json'),JSON.stringify(generatedReceipts,null,2)+'\n');
 writeFileSync(join(evidence,'manifest.json'),JSON.stringify(report,null,2)+'\n');
 const generated = join(root,'apps/website/src/generated'); mkdirSync(generated,{recursive:true});
 writeFileSync(join(generated,'source-targets.json'),JSON.stringify(targets,null,2)+'\n');
 const manualGenerated = join(root,'apps/manual/src/generated'); mkdirSync(manualGenerated,{recursive:true});
 writeFileSync(join(manualGenerated,'fragments.json'),JSON.stringify(fragments,null,2)+'\n');
 const publicDir = join(root,'apps/manual/public'); rmSync(publicDir,{recursive:true,force:true}); mkdirSync(publicDir,{recursive:true});
 for (const [source,route] of Object.entries(publicAssets)) { const dest = join(publicDir,route.slice(1)); mkdirSync(dirname(dest),{recursive:true}); cpSync(join(root,source),dest); }
 for (const asset of ['favicon.ico','favicon.svg','apple-touch-icon.png','mask-icon.svg','manifest.webmanifest']) if (exists('apps/website/public/'+asset)) cpSync(join(root,'apps/website/public',asset),join(publicDir,asset));
 if (qa) {
  const fixturePage = {title:'Reading qualification',source:'apps/manual/qa/reading.md'};
  const fixture = projectMarkdown(readFileSync(join(root,fixturePage.source),'utf8'),fixturePage,{root,ref,targets,assets:publicAssets}).body;
  const path = join(out,'__qualification/reading.md'); mkdirSync(dirname(path),{recursive:true});
  writeFileSync(path,`---\ntitle: Reading qualification\npagefind: false\nhead:\n  - tag: meta\n    attrs: {name: robots, content: 'noindex, nosnippet'}\ndiffdevil:\n  key: qualification\n  source: apps/manual/qa/reading.md\n  sourceUrl: ${sourceUrl('apps/manual/qa/reading.md',ref)}\n  sourceRef: ${ref}\n  appliesTo: ${version}\n  availability: current\n---\n\n${fixture}`);
 }
 console.log(`manual: ${records.length} selected source pages; ${records.filter(row=>row.current).length} current; ${redirects.length} legacy redirects activated`);
 return report;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) generateManual();
