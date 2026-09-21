// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Generate the Starlight docs collection from the maintained repository Markdown named
 * in apps/website/docs-manifest.mjs. Output is ignored build input, not a second manual:
 * each page keeps its source body, gains front matter (title, edit URL, provenance),
 * has its H1 lifted into the title, and has relative links rewritten to site routes
 * for selected pages or to the repository on GitHub for everything else.
 *
 *   node tools/website-docs.mjs            # write apps/website/src/content/docs
 *   node tools/website-docs.mjs --report   # also print the selection and any missing optional sources
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, posix, relative, resolve } from 'node:path';
import { entries, groups, productPages, tryIt } from '../apps/website/docs-manifest.mjs';

import { FAQ_SOURCE, FAQ_ROUTE, faqRecords } from '../apps/website/faq-content.mjs';

const root = resolve('.');
const OUT = join(root, 'apps/website/src/content/docs');
const REPO_BLOB = 'https://github.com/Wolfsblvt/diffdevil/blob/main/';
const REPO_EDIT = 'https://github.com/Wolfsblvt/diffdevil/edit/main/';
const packageVersion = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;

const bySource = new Map([...entries, ...productPages].map(entry => [entry.source, entry]));
const selected = entries.filter(entry => existsSync(join(root, entry.source)));
const missing = entries.filter(entry => !existsSync(join(root, entry.source)));
for (const entry of missing) if (!entry.optional) throw new Error(`Manifest source is missing: ${entry.source}`);

/** Site route of a manifest entry; the collection lives under docs/ so the root stays free for the product pages. */
function routeOf(entry) { return entry.route ?? (entry.slug ? `/docs/${entry.slug}/` : '/docs/'); }
function fileOf(entry) { return join(OUT, 'docs', entry.slug ? `${entry.slug}.md` : 'index.md'); }

function titleOf(text, entry) {
  const match = /^#\s+(.+?)\s*$/mu.exec(text);
  return entry.title ?? match?.[1] ?? entry.slug;
}
function stripH1(text) { return text.replace(/^#\s+.+?\r?\n(\r?\n)?/u, ''); }
function escapeYaml(value) { return JSON.stringify(value); }

/** Rewrite one Markdown link target relative to `source`. Returns undefined to leave it alone. */
function rewriteTarget(target, source) {
  if (target.startsWith('https://diffdevil.dev/')) return { href: target.slice('https://diffdevil.dev'.length) };
  if (/^(?:[a-z]+:|#|\/)/iu.test(target)) return undefined;
  const [pathPart, hash = ''] = target.split('#');
  const resolvedPath = posix.normalize(posix.join(posix.dirname(source), pathPart || posix.basename(source)));
  const entry = bySource.get(resolvedPath);
  if (entry && existsSync(join(root, entry.source))) return { href: routeOf(entry) + (hash ? `#${hash}` : ''), asset: resolvedPath };
  if (source === FAQ_SOURCE) throw new Error(`FAQ link has no selected website destination: ${resolvedPath}`);
  return { href: `${REPO_BLOB}${resolvedPath}${hash ? `#${hash}` : ''}`, asset: resolvedPath };
}

function rewriteLinks(body, source) {
  // Skip fenced code blocks; rewrite inline links elsewhere.
  const parts = body.split(/(```[\s\S]*?```)/u);
  return parts.map((part, index) => {
    if (index % 2 === 1) return part;
    return part.replace(/\[([^\]]*)\]\(([^)\s]+)\)/gu, (whole, label, target) => {
      const rewritten = rewriteTarget(target, source);
      if (!rewritten) return whole;
      const companion = source !== FAQ_SOURCE && tryIt[rewritten.asset] && !rewritten.href.startsWith('/docs/') ? ` ([Try it in the playground](/playground/?example=${tryIt[rewritten.asset]}))` : '';
      return `[${label}](${rewritten.href})${companion}`;
    });
  }).join('');
}

// FAQ keeps its authored title/frontmatter and native disclosures. Only links are projected.
const faqSource = readFileSync(join(root, FAQ_SOURCE), 'utf8');
const faqQuestions = new Map(faqRecords(faqSource).map(question => [question.id, question]));
const faqOutput = join(root, 'apps/website/src/generated/faq.md');
mkdirSync(dirname(faqOutput), { recursive: true });
writeFileSync(faqOutput, rewriteLinks(faqSource, FAQ_SOURCE));
function relatedQuestions(entry) {
  if (!entry.faq?.length) return '';
  const links = entry.faq.map(id => {
    const question = faqQuestions.get(id);
    if (!question) throw new Error(`Unknown FAQ question ${id} linked from ${entry.source}`);
    return `- [${question.title}](${FAQ_ROUTE}#${id})`;
  });
  return `\n\n## Related questions\n\n${links.join('\n')}\n`;
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
for (const entry of selected) {
  const raw = readFileSync(join(root, entry.source), 'utf8');
  const title = titleOf(raw, entry);
  const body = rewriteLinks(stripH1(raw), entry.source) + relatedQuestions(entry);
  const frontMatter = [
    '---',
    `title: ${escapeYaml(title)}`,
    `editUrl: ${escapeYaml(`${REPO_EDIT}${entry.source}`)}`,
    `diffdevil:`,
    `  source: ${escapeYaml(entry.source)}`,
    `  sourceUrl: ${escapeYaml(`${REPO_BLOB}${entry.source}`)}`,
    `  appliesTo: ${escapeYaml(packageVersion)}`,
    `  tested: ${entry.tested ? 'true' : 'false'}`,
    '---',
    '',
  ].join('\n');
  const file = fileOf(entry);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, frontMatter + body);
}
writeFileSync(join(OUT, '.generated'), 'Generated by tools/website-docs.mjs from apps/website/docs-manifest.mjs. Do not edit; edit the repository Markdown.\n');

/** The sidebar, in manifest order, with optional pages omitted when absent. */
export const sidebar = groups.map(group => ({
  label: group.label,
  items: group.entries.flatMap(entry => {
    if (entry.link) return [{ label: entry.label, link: entry.link }];
    if (!existsSync(join(root, entry.source))) return [];
    const raw = readFileSync(join(root, entry.source), 'utf8');
    return [{ label: titleOf(raw, entry), link: routeOf(entry) }];
  }),
})).filter(group => group.items.length > 0);
writeFileSync(join(root, 'apps/website/src/content/sidebar.json'), JSON.stringify(sidebar, null, 2) + '\n');

if (process.argv.includes('--report')) {
  console.log(`faq: ${faqQuestions.size} questions projected from ${FAQ_SOURCE}`);
  console.log(`docs: ${selected.length} pages generated under ${relative(root, OUT)}`);
  for (const entry of missing) console.log(`  optional source not present: ${entry.source} (${entry.slug})`);
}
