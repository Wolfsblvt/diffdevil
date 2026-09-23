// SPDX-License-Identifier: AGPL-3.0-only
/** Check committed mechanical islands; narrative outside the markers is never rewritten. */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generatedIsland } from './generated-islands.mjs';
import { manualPages } from './manifest.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const paired = /<!-- manual:generated ([a-z-]+) -->\n([\s\S]*?)\n<!-- \/manual:generated \1 -->/gu;

export function committedIslands(raw, { root, source, write = false, receipts = [] }) {
 const seen = new Set();
 const result = raw.replace(paired, (whole, id, body) => {
  if (seen.has(id)) throw new Error(`${source}: duplicate generated island ${id}`);
  seen.add(id);
  const sources = new Set();
  const expected = generatedIsland(id, { root, source, onSource: path => sources.add(path) });
  if (!write && body !== expected) throw new Error(`${source}: generated ${id} drift; run npm --prefix apps/manual run generate`);
  receipts.push({ source, island: id, sha256: hash(expected), bytes: Buffer.byteLength(expected), inputs: [...sources].sort().map(path => ({path, sha256: hash(readFileSync(join(root,path)))})) });
  return `<!-- manual:generated ${id} -->\n${expected}\n<!-- /manual:generated ${id} -->`;
 });
 const closed = [...raw.matchAll(/<!-- \/manual:generated ([a-z-]+) -->/gu)];
 const openings = [...raw.matchAll(/<!-- manual:generated ([a-z-]+) -->/gu)];
 if (manualPages.some(page => page.source === source && page.wave === 3) && openings.length !== seen.size) throw new Error(`${source}: missing committed generated edit boundary`);
 if (closed.length !== seen.size) throw new Error(`${source}: malformed generated edit boundary`);
 return result;
}

/** Preserve the earlier waves' dynamic presenter islands; paired inventories are committed. */
export function projectIslands(raw, options) {
 const checked = committedIslands(raw, options);
 const islands = [];
 const masked = checked.replace(paired, (_, id, body) => { islands.push(body); return `\u0000MANUAL_ISLAND_${islands.length-1}\u0000`; });
 const expanded = masked.replace(/<!-- manual:generated ([a-z-]+) -->/gu, (_,id) => generatedIsland(id, options));
 return expanded.replace(/\u0000MANUAL_ISLAND_(\d+)\u0000/gu, (_,index) => islands[Number(index)]);
}

export function updateInventories({root, write = false}) {
 const receipts = [];
 for (const page of manualPages) {
  const path = join(root,page.source), raw = readFileSync(path,'utf8');
  const updated = committedIslands(raw,{root,source:page.source,write,receipts});
  if (write && updated !== raw) writeFileSync(path,updated);
 }
 return receipts;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
 const root = fileURLToPath(new URL('../../',import.meta.url));
 const args = process.argv.slice(2);
 if (args.some(arg => !['--write','--check'].includes(arg)) || args.includes('--write') && args.includes('--check')) throw new Error('Use --write or --check.');
 const receipts = updateInventories({root,write:args.includes('--write')});
 console.log(`manual: ${receipts.length} committed inventories ${args.includes('--write')?'updated':'checked'}`);
}
