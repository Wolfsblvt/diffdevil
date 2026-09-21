// SPDX-License-Identifier: MIT
import { build } from 'esbuild';
import { mkdir, writeFile, copyFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
/** Ship a self-contained portable entry, not an undocumented Node alias recipe. */
export async function buildBrowser() {
  await rm('dist/browser', { recursive: true, force: true }); await mkdir('dist/browser', { recursive: true });
  const result = await build({ entryPoints: ['dist/lib/browser/index.js'], outfile: 'dist/browser/index.js', bundle: true, platform: 'browser', format: 'esm', target: 'es2022', legalComments: 'eof', metafile: true,
    alias: { 'node:crypto': resolve('dist/lib/browser/runtime/crypto.js'), 'node:util': resolve('dist/lib/browser/runtime/util.js') } });
  const external = Object.values(result.metafile.outputs).flatMap(output => output.imports).filter(item => item.external);
  if (external.length) throw new Error(`Portable browser bundle contains unresolved imports: ${external.map(item => item.path).join(', ')}`);
  await writeFile('dist/browser/metafile.json', `${JSON.stringify(result.metafile, null, 2)}\n`);
  await copyFile('LICENSES/MIT.txt', 'dist/browser/LICENSE.txt');
}
