// SPDX-License-Identifier: AGPL-3.0-only
/** Chapter cards use the existing product artwork and build-time fonts, never runtime rendering. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { master } from '../../tools/identity-frames.mjs';

const xml = text => text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

/** Write a 1200×630 preview at the chapter's own stable route. */
export function writeChapterCard(page, publicDirectory, root) {
 const lines = [];
 for (const word of page.title.split(/\s+/u)) {
  if (!lines.length || `${lines.at(-1)} ${word}`.length > 34) lines.push(word);
  else lines[lines.length-1] += ` ${word}`;
 }
 const mark = master('diffdevil-symbol-master-dark.svg').replace(/<svg\b/u,'<svg x="72" y="70" width="64" height="64"');
 const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#151922"/>${mark}<text x="160" y="115" font-family="IBM Plex Sans" font-size="30" fill="#b4b7be">diffdevil Docs</text>${lines.map((line,index)=>`<text x="72" y="${245+index*76}" font-family="IBM Plex Sans" font-weight="700" font-size="64" fill="#f0f2f5">${xml(line)}</text>`).join('')}<rect x="72" y="515" width="70" height="4" fill="#f061ba"/><text x="72" y="572" font-family="IBM Plex Mono" font-size="20" fill="#b4b7be">${xml(page.section)} · docs.diffdevil.dev</text></svg>`;
 const file = join(publicDirectory,page.route,'og.png');
 mkdirSync(dirname(file),{recursive:true});
 writeFileSync(file,new Resvg(svg,{font:{loadSystemFonts:false,fontFiles:[join(root,'artifacts/website/fonts/ibm-plex-sans-700.ttf'),join(root,'artifacts/website/fonts/ibm-plex-mono-400.ttf')]}}).render().asPng());
}
