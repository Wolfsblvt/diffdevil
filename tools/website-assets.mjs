// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Generate the website's derived icon/raster assets from the identity masters in
 * brand/source/diffdevil (tools/identity-frames.mjs). The SVGs are the committed source; every output here is
 * deterministic generated material, written to ignored paths and copied into the
 * built site by the website build. Nothing is hand-cropped and no raster is committed.
 *
 *   node tools/website-assets.mjs            # generate into apps/website/public (ignored files)
 *   node tools/website-assets.mjs --report   # also print measured framing as JSON
 *
 * Outputs: favicon.ico (16 + 32 from the micro drawing), favicon.svg (micro, theme-aware),
 * mask-icon.svg (mono), apple-touch-icon.png 180, app-logo-512.png (web manifest frame),
 * github-app-logo-512.png (GitHub App badge frame), og.png 1200×630, the /app/ and /extension/ cards
 * og-app.png and og-extension.png 1200×630 from their committed product captures, manifest.webmanifest.
 *
 * Framing: one master mark, several consumer-specific frames. Each frame declares its
 * outer pad and the occupancy range (visible mark bounds as a share of the canvas) it
 * must land in. The generator measures the actual non-background bounds of what it
 * rendered and fails when a frame drifts outside its declared range, so a scale change
 * is one number here and one real exported candidate to look at, not an editor session.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { Resvg } from '@resvg/resvg-js';
import { FRAMES, faviconAdaptive, master as svg, measureBounds, onGround } from './identity-frames.mjs';

export { FRAMES, measureBounds };
const OUT = 'apps/website/public/';

mkdirSync(OUT, { recursive: true });

/** The rasterizer loads TTF/OTF only and the self-hosted fonts ship as WOFF; WOFF 1.0 is the same sfnt tables, zlib-compressed. */
function woffToSfnt(woff) {
  const flavor = woff.readUInt32BE(4), numTables = woff.readUInt16BE(12);
  const entries = [];
  for (let i = 0; i < numTables; i++) {
    const at = 44 + i * 20;
    entries.push({ tag: woff.subarray(at, at + 4), offset: woff.readUInt32BE(at + 4), compLength: woff.readUInt32BE(at + 8), origLength: woff.readUInt32BE(at + 12), checksum: woff.readUInt32BE(at + 16) });
  }
  const entrySelector = Math.floor(Math.log2(numTables)), searchRange = 2 ** entrySelector * 16, rangeShift = numTables * 16 - searchRange;
  const header = Buffer.alloc(12 + numTables * 16);
  header.writeUInt32BE(flavor, 0); header.writeUInt16BE(numTables, 4); header.writeUInt16BE(searchRange, 6); header.writeUInt16BE(entrySelector, 8); header.writeUInt16BE(rangeShift, 10);
  let offset = header.length; const tables = [];
  entries.forEach((entry, i) => {
    const raw = woff.subarray(entry.offset, entry.offset + entry.compLength);
    const data = entry.compLength === entry.origLength ? Buffer.from(raw) : inflateSync(raw);
    const padded = Buffer.concat([data, Buffer.alloc((4 - (data.length % 4)) % 4)]);
    entry.tag.copy(header, 12 + i * 16); header.writeUInt32BE(entry.checksum, 16 + i * 16); header.writeUInt32BE(offset, 20 + i * 16); header.writeUInt32BE(entry.origLength, 24 + i * 16);
    offset += padded.length; tables.push(padded);
  });
  return Buffer.concat([header, ...tables]);
}
mkdirSync('artifacts/website/fonts', { recursive: true });
const fontFiles = Object.entries({ 'ibm-plex-sans-700': 'node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-700-normal.woff', 'ibm-plex-mono-400': 'node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff' })
  .map(([name, path]) => { const out = `artifacts/website/fonts/${name}.ttf`; writeFileSync(out, woffToSfnt(readFileSync(path))); return out; });

function render(source, width) {
  return new Resvg(source, { fitTo: { mode: 'width', value: width }, font: { loadSystemFonts: false, fontFiles, defaultFontFamily: 'IBM Plex Sans' } }).render();
}
/** ICO container with PNG entries (supported by every current browser and Windows). */
function ico(entries) {
  const header = Buffer.alloc(6); header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(entries.length, 4);
  const dir = Buffer.alloc(16 * entries.length);
  let offset = 6 + dir.length; const blobs = [];
  entries.forEach(({ size, data }, i) => {
    dir.writeUInt8(size === 256 ? 0 : size, i * 16); dir.writeUInt8(size === 256 ? 0 : size, i * 16 + 1);
    dir.writeUInt8(0, i * 16 + 2); dir.writeUInt8(0, i * 16 + 3); dir.writeUInt16LE(1, i * 16 + 4); dir.writeUInt16LE(32, i * 16 + 6);
    dir.writeUInt32LE(data.length, i * 16 + 8); dir.writeUInt32LE(offset, i * 16 + 12); offset += data.length; blobs.push(data);
  });
  return Buffer.concat([header, dir, ...blobs]);
}

const microDark = svg('diffdevil-symbol-micro-dark.svg'), microLight = svg('diffdevil-symbol-micro-light.svg');
const master = svg('diffdevil-symbol-master-dark.svg'), mono = svg('diffdevil-symbol-mono-dark.svg');
const stacked = svg('diffdevil-lockup-stacked-dark.svg');

// favicon.ico: 16 + 32 rasters of the micro drawing on the midnight ground (a tab icon needs a ground).
writeFileSync(`${OUT}favicon.ico`, ico([16, 32].map(size => ({ size, data: render(onGround(microDark, size, 0.08), size).asPng() }))));
// favicon.svg: micro drawing with a prefers-color-scheme switch between the two authored files.
writeFileSync(`${OUT}favicon.svg`, faviconAdaptive(microDark, microLight));
writeFileSync(`${OUT}mask-icon.svg`, mono);

// Framed rasters from the one master mark: measure, then refuse to emit a frame outside its declared occupancy.
const report = {};
const failures = [];
for (const [name, frame] of Object.entries(FRAMES)) {
  const rendered = render(onGround(master, frame.size, frame.pad), frame.size);
  const bounds = measureBounds(rendered);
  report[name] = { file: frame.file, size: frame.size, pad: frame.pad, use: frame.use, bounds: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }, occupancy: Number(bounds.occupancy.toFixed(3)), declared: frame.occupancy };
  if (bounds.occupancy < frame.occupancy[0] || bounds.occupancy > frame.occupancy[1]) failures.push(`${name} (${frame.file}): occupancy ${bounds.occupancy.toFixed(3)} outside declared ${frame.occupancy.join('–')}`);
  else writeFileSync(`${OUT}${frame.file}`, rendered.asPng());
}
// Open Graph 1200 × 630: midnight ground, stacked lockup left, hero slogan in Plex Sans 700 off-white, strapline in Plex Mono muted.
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#151922"/>${stacked.replace(/^<\?xml[^>]*>\s*/u, '').replace(/<svg\b/u, '<svg x="96" y="175" width="330" height="280"')}<text x="500" y="300" font-family="IBM Plex Sans" font-weight="700" font-size="72" fill="#f0f2f5">The devil is</text><text x="500" y="380" font-family="IBM Plex Sans" font-weight="700" font-size="72" fill="#f0f2f5">in the diff.</text><text x="500" y="450" font-family="IBM Plex Mono" font-size="21" fill="#b4b7be">Measure changes. Match rules. Act on the result.</text></svg>`;
writeFileSync(`${OUT}og.png`, render(og, 1200).asPng());
// Surface cards 1200 × 630 for /app/ and /extension/: the horizontal lockup, the surface's own line, and its real
// product capture bleeding off the right and bottom edges. The captures are the committed website/Store-kit sources.
const lockup = svg('diffdevil-lockup-dark.svg').replace(/^<\?xml[^>]*>\s*/u, '').replace(/<svg\b/u, '<svg x="72" y="72" width="194" height="48"');
const capture = path => `data:image/png;base64,${readFileSync(path).toString('base64')}`;
const surfaceCard = ({ lines, strap, image, width, height, place = { x: 560, y: 150, width, height } }) => `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#151922"/>${lockup}${lines.map((line, i) => `<text x="72" y="${250 + i * 64}" font-family="IBM Plex Sans" font-weight="700" font-size="54" fill="#f0f2f5">${line}</text>`).join('')}<text x="72" y="${250 + lines.length * 64 + 18}" font-family="IBM Plex Mono" font-size="19" fill="#b4b7be">${strap}</text><clipPath id="c"><rect x="560" y="150" width="${width}" height="${height}" rx="14"/></clipPath><rect x="559" y="149" width="${width + 2}" height="${height + 2}" rx="15" fill="#2c303a"/><image x="${place.x}" y="${place.y}" width="${place.width}" height="${place.height}" clip-path="url(#c)" preserveAspectRatio="xMinYMin slice" xlink:href="${image}"/></svg>`;
writeFileSync(`${OUT}og-app.png`, render(surfaceCard({ lines: ['diffdevil,', 'with a memory.'], strap: 'History for every repository you choose.', image: capture('apps/website/src/assets/app/overview.png'), width: 860, height: 500 }), 1200).asPng());
writeFileSync(`${OUT}og-extension.png`, render(surfaceCard({ lines: ['Changed,', 'directly in GitHub.'], strap: 'diffdevil for GitHub', image: capture('apps/browser-extension/store/assets/screenshots/02-inspect-the-report.png'), width: 800, height: 500, place: { x: 320, y: 96, width: 1000, height: 625 } }), 1200).asPng());
writeFileSync(`${OUT}manifest.webmanifest`, JSON.stringify({ name: 'diffdevil', short_name: 'diffdevil', description: 'The devil is in the diff. Measure changes, evaluate rules, and automate what follows.', start_url: '/', display: 'browser', background_color: '#151922', theme_color: '#151922', icons: [{ src: '/app-logo-512.png', sizes: '512x512', type: 'image/png' }, { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }] }, null, 2) + '\n');

if (process.argv.includes('--report')) console.log(JSON.stringify(report, null, 2));
else console.log(`website assets written to ${OUT}: ` + Object.entries(report).map(([name, r]) => `${name} ${Math.round(r.occupancy * 100)}%`).join(', '));
if (failures.length) { for (const failure of failures) console.error(`framing drift: ${failure}`); process.exitCode = 1; }
