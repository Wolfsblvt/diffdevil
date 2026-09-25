// SPDX-License-Identifier: AGPL-3.0-only
/** Project the separately authored FAQ and exact source provenance. The old apex
 * article collection is retired; canonical chapters render only on the manual host.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, posix, resolve } from 'node:path';
import { entries } from '../apps/website/docs-manifest.mjs';
import { FAQ_SOURCE, FAQ_ROUTE, faqRecords } from '../apps/website/faq-content.mjs';
import { pages, pageUrl } from '../apps/manual/manifest.mjs';
import { sourceResolverUrl, sourceTargets, sourceRef, editRef } from '../apps/manual/source-resolver.mjs';
import { migratedSource } from '../apps/manual/migration.mjs';

const root = resolve('.');
const state = JSON.parse(readFileSync(join(root, 'apps/manual/authoring-state.json'), 'utf8'));
const ref = sourceRef(root);
const branch = editRef(root);
const targets = sourceTargets({ref, state, exists: source => existsSync(join(root, source)), legacySources: entries.map(entry => entry.source)});
const generated = join(root, 'apps/website/src/generated');
mkdirSync(generated, {recursive: true});
writeFileSync(join(generated, 'source-provenance.json'), JSON.stringify({ref, editRef: branch}, null, 2) + '\n');

function rewriteTarget(target) {
  if (/^(?:[a-z]+:|#|\/)/iu.test(target)) return target;
  const [path, hash = ''] = target.split('#');
  const source = posix.normalize(posix.join(posix.dirname(FAQ_SOURCE), path));
  const successor = migratedSource(source, state) ?? source;
  const page = pages.find(page => page.source === successor);
  const mapped = state.transfers?.[source]?.anchors?.[hash];
  if (mapped) return pageUrl(mapped.page) + '#' + mapped.anchor;
  if (page) return (page.key === 'faq' ? FAQ_ROUTE : pageUrl(page.key)) + (hash ? '#' + hash : '');
  if (Object.hasOwn(targets, source)) return sourceResolverUrl(source) + (hash ? '#' + hash : '');
  throw new Error(`FAQ link has no selected reader or source destination: ${source}`);
}

// Only link destinations change. Answers, identifiers and native disclosures remain source-owned.
const source = readFileSync(join(root, FAQ_SOURCE), 'utf8');
const projected = source.split(/(```[\s\S]*?```)/u).map((part, index) => index % 2 ? part :
  part.replace(/\[([^\]]*)\]\(([^)\s]+)\)/gu, (_whole, label, target) => `[${label}](${rewriteTarget(target)})`)).join('');
writeFileSync(join(generated, 'faq.md'), projected);
// These are disposable output paths owned by the retired website projection.
rmSync(join(root, 'apps/website/src/content/docs'), {recursive: true, force: true});
rmSync(join(root, 'apps/website/src/content/sidebar.json'), {force: true});
if (process.argv.includes('--report')) console.log(`FAQ: ${faqRecords(source).length} questions; apex manual projection retired.`);
