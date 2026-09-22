// SPDX-License-Identifier: MIT
import { build } from 'esbuild';
import { Resvg } from '@resvg/resvg-js';
import { readFile, writeFile, mkdir, rm, copyFile, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
const root = resolve('apps/browser-extension');
const out = resolve('artifacts/browser-extension/unpacked');
const fontFree = process.argv.includes('--without-fonts');
const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
await rm(out, { recursive: true, force: true }); await mkdir(join(out, 'assets'), { recursive: true });
const common = { bundle: true, platform: 'browser', target: 'chrome120', legalComments: 'eof', metafile: true, define: { __ENGINE_VERSION__: JSON.stringify(packageJson.version) },
  alias: { '@wolfsblvt/diffdevil/browser/text': resolve('dist/lib/browser/text.js'), '@wolfsblvt/diffdevil/browser': resolve('dist/browser/index.js') } };
const modules = await build({ ...common, entryPoints: { background: join(root, 'src/background/worker.ts'), options: join(root, 'src/options/main.ts') }, outdir: out, format: 'esm', splitting: true, chunkNames: 'chunks/[name]-[hash]' });
const content = await build({ ...common, entryPoints: [join(root, 'src/content/main.ts')], outfile: join(out, 'content.js'), format: 'iife' });
await build({ ...common, entryPoints: [join(root, 'src/options/theme.ts')], outfile: join(out, 'theme.js'), format: 'iife' });
await build({ entryPoints: [join(root, 'src/options/options.css')], outfile: join(out, 'options.css'), bundle: true, target: 'chrome120', loader: { '.svg': 'file' }, assetNames: 'assets/[name]-[hash]' });
await copyFile(join(root, 'src/content/content.css'), join(out, 'content.css'));
await copyFile(join(root, 'options.html'), join(out, 'options.html'));
const manifest = JSON.parse(await readFile(join(root, 'manifest.json'), 'utf8')); manifest.version = packageJson.version;
await writeFile(join(out, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
const identity = resolve('design/assets/identity'); const identities = [];
const acceptedBrand = await readFile(join(root, 'assets/diffdevil-brand.svg'));
const acceptedBrandHash = createHash('sha256').update(acceptedBrand).digest('hex');
if (acceptedBrandHash !== 'd33cf3b1a7a8ec52706da3311ac82e0500ec6c2eee8e35baeaaa2d5ef2b9b34e') throw new Error('The vendored diffdevil/brand glyph disagrees with its accepted canonical source.');
await writeFile(join(out, 'assets/diffdevil-brand.svg'), acceptedBrand);
identities.push({ path: 'Wolfsblvt/wolfsblvt-icons@8596b6bc2ba7c4b950963b7ec26cee1a26974439:src/icons/products/diffdevil/brand.svg', sha256: acceptedBrandHash, license: 'MIT' });
for (const file of ['diffdevil-symbol-micro-dark.svg', 'diffdevil-symbol-micro-light.svg', 'diffdevil-wordmark-dark.svg', 'diffdevil-wordmark-light.svg']) {
  const bytes = await readFile(join(identity, file)); await copyFile(join(identity, file), join(out, 'assets', file)); identities.push({ path: `design/assets/identity/${file}`, sha256: createHash('sha256').update(bytes).digest('hex') });
}
for (const size of [16, 32, 48, 128]) {
  const source = (await readFile(join(identity, `diffdevil-symbol-${size <= 32 ? 'micro' : 'master'}-dark.svg`), 'utf8')).replace(/^<\?xml[^>]*>/u, '');
  const pad = size === 128 ? 16 : 0; const extent = size - pad * 2;
  // Only a consumer frame and scaling. Accepted symbol path geometry is untouched.
  const nested = source.replace(/<svg\b([^>]*)>/u, (_match, attributes) => `<svg${attributes.replace(/\s(?:width|height)="[^"]*"/gu, '')} x="${pad}" y="${pad}" width="${extent}" height="${extent}">`);
  const frame = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect x="${pad}" y="${pad}" width="${extent}" height="${extent}" rx="${Math.max(2, Math.round(extent * .15))}" fill="#0c0f17"/>${nested}</svg>`;
  await writeFile(join(out, 'assets', `icon-${size}.png`), new Resvg(frame).render().asPng());
}
let fonts = '';
if (!fontFree) for (const [family, cssName, weights] of [['ibm-plex-sans', 'IBM Plex Sans', [400, 600]], ['ibm-plex-mono', 'IBM Plex Mono', [400]]]) {
  for (const weight of weights) { const file = `${family}-latin-${weight}-normal.woff2`; await copyFile(`node_modules/@fontsource/${family}/files/${file}`, join(out, 'assets', file)); fonts += `@font-face{font-family:"${cssName}";font-style:normal;font-weight:${weight};font-display:swap;src:url("assets/${file}") format("woff2")}\n`; }
}
await writeFile(join(out, 'options.css'), fonts + await readFile(join(out, 'options.css'), 'utf8'));
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
function prose(title, text) {
  const paragraphs = text.trim().split(/\n\s*\n/u).map(block => { const header = /^(#{1,3}) (.+)$/u.exec(block.trim()); return header ? `<h${header[1].length}>${escape(header[2])}</h${header[1].length}>` : `<p>${escape(block.replaceAll('\n', ' '))}</p>`; }).join('\n');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)} · diffdevil</title><script src="theme.js"></script><link rel="stylesheet" href="options.css"></head><body><main class="app-main"><a href="options.html">← Settings</a>${paragraphs}</main></body></html>`;
}
for (const [file, page, title] of [['privacy.md', 'privacy.html', 'Privacy'], ['licenses.md', 'licenses.html', 'Licences']]) await writeFile(join(out, page), prose(title, await readFile(join(root, file), 'utf8')));
await mkdir(join(out, 'licenses'), { recursive: true });
for (const [name, path] of Object.entries({ 'AGPL-3.0-only.txt': 'LICENSES/AGPL-3.0-only.txt', 'MIT.txt': 'LICENSES/MIT.txt', 'chevrotain.txt': 'node_modules/chevrotain/LICENSE.txt', 'yaml.txt': 'node_modules/yaml/LICENSE', 'ajv.txt': 'node_modules/ajv/LICENSE', 'fast-deep-equal.txt': 'node_modules/fast-deep-equal/LICENSE', 'fast-uri.txt': 'node_modules/fast-uri/LICENSE', 'json-schema-traverse.txt': 'node_modules/json-schema-traverse/LICENSE', ...(!fontFree ? { 'IBM-Plex-Sans-OFL.txt': 'node_modules/@fontsource/ibm-plex-sans/LICENSE', 'IBM-Plex-Mono-OFL.txt': 'node_modules/@fontsource/ibm-plex-mono/LICENSE' } : {}) })) await copyFile(path, join(out, 'licenses', name));
const metadata = { modules: modules.metafile, content: content.metafile };
const external = Object.values(metadata).flatMap(meta => Object.values(meta.outputs)).flatMap(output => output.imports).filter(item => item.external);
if (external.length) throw new Error(`Extension contains external executable imports: ${external.map(item => item.path).join(', ')}`);
const inventory = [];
async function walk(directory, relative = '') { for (const file of await readdir(directory, { withFileTypes: true })) { const path = join(directory, file.name); const name = relative + file.name; if (file.isDirectory()) await walk(path, `${name}/`); else { const bytes = await readFile(path); inventory.push({ path: name, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }); } } }
await walk(out);
const receipt = { version: packageJson.version, fontFilesIncluded: !fontFree, glyph: 'accepted-diffdevil-brand-centre-seam', identities, files: inventory.sort((a, b) => a.path.localeCompare(b.path)), bytes: inventory.reduce((sum, file) => sum + file.bytes, 0) };
await writeFile('artifacts/browser-extension/build-receipt.json', `${JSON.stringify(receipt, null, 2)}\n`);
await writeFile('artifacts/browser-extension/bundle-metafile.json', `${JSON.stringify(metadata, null, 2)}\n`);
console.log(`Built ${inventory.length} files (${(receipt.bytes / 1024 / 1024).toFixed(2)} MiB). Fonts ${fontFree ? 'omitted; system fallbacks' : 'from locked dependencies'}. No publication performed.`);
