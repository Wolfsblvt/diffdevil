// SPDX-License-Identifier: MIT
import { Resvg } from '@resvg/resvg-js';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { deflateSync } from 'node:zlib';
const out = resolve('artifacts/browser-extension/store'); await mkdir(out, { recursive: true });
const qa = resolve('artifacts/browser-extension/qa');
const receipt = JSON.parse(await readFile(join(qa, 'receipt.json'), 'utf8'));
if (receipt.failed || receipt.passed < 40) throw new Error('Generate and pass the production DOM QA before preparing Store screenshots. Run npm run extension:qa.');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const entries = [];
function pngInfo(bytes) { if (bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('Expected a PNG image.'); return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), depth: bytes[24], colorType: bytes[25] }; }
const screenshots = [
  ['01-changed-on-github.png', 'github-dark.png', 'Aggregate and lazy per-file Changed, raw churn, dynamic policy bands and local provenance.'],
  ['02-inspect-the-report.png', 'report-light.png', 'The persistent anchored report keeps source identity, evidence, decomposition and policy details inspectable.'],
  ['03-your-icon-preference.png', 'settings-icon-dark.png', 'Literal stable-setting anchors and the monochrome, full-colour or no-icon choices.'],
  ['04-your-policy-bands.png', 'settings-bands-light.png', 'Editable personal thresholds, colour metadata and optional existing-label mappings in the authored light theme.'],
  ['05-honest-uncertainty.png', 'evidence-unknown.png', 'Incomplete evidence remains visibly unknown. No unsupported exact total or selected band is manufactured.'],
];
for (const [name, source, caption] of screenshots) {
  const bytes = await readFile(join(qa, source)); const info = pngInfo(bytes);
  if (info.width !== 1280 || info.height !== 800 || info.depth !== 8 || info.colorType !== 2) throw new Error(`${source} must be a 1280×800, 24-bit RGB screenshot.`);
  await copyFile(join(qa, source), join(out, name)); entries.push({ name, ...info, sha256: sha256(bytes), source: `../qa/${source}`, caption, standing: 'Actual production UI in an explicitly authored fixture; not a live or installed-extension capture.' });
}
const wordmark = await readFile('design/assets/identity/diffdevil-wordmark-dark.svg');
const mark = `data:image/svg+xml;base64,${wordmark.toString('base64')}`;
const screenshot = `data:image/png;base64,${(await readFile(join(qa, 'github-dark.png'))).toString('base64')}`;
const header = (width, height) => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#151922"/><g font-family="DejaVu Sans,Arial,sans-serif">`;
const small = header(440, 280) + `<image href="${mark}" x="30" y="25" width="118" height="30"/>
<text x="30" y="91" fill="#eef1f5" font-size="21" font-weight="600">Count replacements once.</text>
<rect x="30" y="114" width="380" height="103" rx="10" fill="#0c0f17" stroke="#343a47"/>
<text x="49" y="154" fill="#e9edf3" font-size="22">Changed</text><text x="159" y="155" fill="#fff" font-size="30" font-weight="600">178</text>
<text x="49" y="184" fill="#bdc3cf" font-size="14">+60 added   −18 deleted   ~100 modified</text>
<rect x="315" y="133" width="73" height="25" rx="12" fill="none" stroke="#727987"/><text x="329" y="150" fill="#c6ceda" font-size="12">size/M</text>
<text x="31" y="240" fill="#a6adbb" font-size="12">GitHub pull requests. Your local policy.</text>
<text x="31" y="262" fill="#858d9c" font-size="10">Source candidate · No account or source upload</text></g></svg>`;
const marquee = header(1400, 560) + `<image href="${mark}" x="56" y="44" width="158" height="40"/>
<text x="56" y="149" fill="#eef1f5" font-size="36" font-weight="600">Changed, not just churn.</text>
<text x="58" y="194" fill="#b4bccb" font-size="20">Replacement-aware measurements.</text>
<text x="58" y="225" fill="#b4bccb" font-size="20">Your policy. On the pull request.</text>
<rect x="56" y="273" width="560" height="146" rx="13" fill="#0c0f17" stroke="#343a47"/>
<text x="79" y="325" fill="#e9edf3" font-size="26">Changed</text><text x="219" y="327" fill="#fff" font-size="39" font-weight="600">178</text>
<text x="80" y="364" fill="#bec6d2" font-size="19">+60 added   −18 deleted   ~100 modified</text>
<text x="80" y="397" fill="#858e9f" font-size="15">Raw +160 −118  ·  local analysis</text>
<rect x="687" y="79" width="661" height="420" rx="10" fill="#0d1117" stroke="#444c59"/>
<image href="${screenshot}" x="692" y="85" width="651" height="407"/>
<text x="57" y="494" fill="#a6adbb" font-size="15">No account. No telemetry. No source upload.</text>
<text x="58" y="522" fill="#858d9c" font-size="12">Source candidate · Authored GitHub fixture · Not a live capture</text></g></svg>`;
// Encode opaque promotional rasters as PNG24 (RGB), not an RGBA image with a
// nominally opaque alpha channel. No extra image processor or font payload ships.
function crc32(buffer) { let crc = 0xffffffff; for (const byte of buffer) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = crc >>> 1 ^ (crc & 1 ? 0xedb88320 : 0); } return (crc ^ 0xffffffff) >>> 0; }
function chunk(type, content) { const name = Buffer.from(type); const length = Buffer.alloc(4); length.writeUInt32BE(content.length); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([name, content]))); return Buffer.concat([length, name, content, crc]); }
function rgbPng(rendered) {
  const { width, height } = rendered; const rgba = rendered.pixels; const rows = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) { const source = (y * width + x) * 4; const target = y * (width * 3 + 1) + 1 + x * 3; if (rgba[source + 3] !== 255) throw new Error('Promotional art must be opaque.'); rows[target] = rgba[source]; rows[target + 1] = rgba[source + 1]; rows[target + 2] = rgba[source + 2]; }
  const header = Buffer.alloc(13); header.writeUInt32BE(width); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 2;
  return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', header), chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]);
}
for (const [name, svg] of [['small-promo-440x280', small], ['marquee-1400x560', marquee]]) {
  const png = rgbPng(new Resvg(svg, { font: { loadSystemFonts: true, defaultFontFamily: 'DejaVu Sans' } }).render());
  await writeFile(join(out, `${name}.svg`), svg); await writeFile(join(out, `${name}.png`), png);
  entries.push({ name: `${name}.png`, ...pngInfo(png), sha256: sha256(png), editableSource: `${name}.svg`, standing: 'Authored promotional composition using accepted identity bytes and exact synthetic fixture measurements. Source-candidate disclosure is retained.' });
}
const icon = await readFile('artifacts/browser-extension/unpacked/assets/icon-128.png');
if (pngInfo(icon).width !== 128 || pngInfo(icon).height !== 128) throw new Error('The Store icon must be 128×128.');
await writeFile(join(out, 'store-icon-128.png'), icon); entries.push({ name: 'store-icon-128.png', ...pngInfo(icon), sha256: sha256(icon), standing: 'Accepted master symbol on a 96×96 consumer field with 16px transparent outer padding; no new product glyph geometry.' });
await writeFile(join(out, 'asset-manifest.json'), JSON.stringify({ kind: 'diffdevil.store-assets/1', published: false, reservedIdentity: true, fontsEmbedded: false, imageRequirements: 'https://developer.chrome.com/docs/webstore/images', checkedOn: '2026-09-19', entries }, null, 2) + '\n');
console.log(`Prepared ${entries.length} Store images and editable promotional SVG sources. No listing, deployment or publication performed.`);
