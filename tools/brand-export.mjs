// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Deterministic export of the diffdevil identity bundle (Brand Bundle Contract, schemaVersion 1) from the committed
 * masters in brand/source/diffdevil into brand/bundle/diffdevil. Never edit the bundle by hand: fix the master or this
 * exporter, then export again.
 *
 *   node tools/brand-export.mjs <immutable-pre-export-input-commit>
 *
 * The input commit must already contain every export input unchanged (masters, this exporter, the shared frames, the
 * pinned validator and the qualification record); the manifest names it as `source.commit`, and the exported bundle is
 * committed afterwards in a later carrier commit. Static SVGs drop the inert C2PA metadata and prefix their ids; PNGs
 * are rendered by the locked @resvg/resvg-js. The tailed footer wordmark has no identity role and stays a master only.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { FRAMES, faviconAdaptive, master, measureBounds, onGround, prefixIds } from './identity-frames.mjs';
import { bundleSha256, canonicalAssetPath, validateBrandBundle } from './brand-bundle/scripts/validate-brand-bundle.mjs';

const sourceCommit = process.argv[2];
if (!/^[0-9a-f]{40}$/u.test(sourceCommit ?? '')) throw new Error('Usage: node tools/brand-export.mjs <immutable-pre-export-input-commit>');
const BUNDLE = 'brand/bundle/diffdevil';
const EVIDENCE = 'docs/brand-qualification.md';
// Refuse to seal a manifest against a commit whose inputs differ from the files read here.
const inputs = ['brand/source/diffdevil', 'tools/brand-export.mjs', 'tools/identity-frames.mjs', 'tools/brand-bundle', 'package-lock.json', EVIDENCE];
const git = args => execFileSync('git', args, { windowsHide: true, encoding: 'utf8' }).trim();
if (git(['ls-files', '--others', '--exclude-standard', '--', ...inputs])) throw new Error('Commit the export inputs before sealing the bundle.');
execFileSync('git', ['diff', '--exit-code', sourceCommit, '--', ...inputs], { windowsHide: true, stdio: 'inherit' });

rmSync(BUNDLE, { recursive: true, force: true });
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
function put(path, bytes) {
  const target = join(BUNDLE, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, bytes);
  return { path, byteCount: bytes.length, sha256: sha256(bytes) };
}
const render = (svg, width) => new Resvg(svg, { fitTo: { mode: 'width', value: width }, font: { loadSystemFonts: false } }).render();
const APPEARANCE = { dark: 'on-dark', light: 'on-light' };
const evidence = anchor => ({ sourcePath: `${EVIDENCE}#${anchor}` });

/** One variant: a static SVG plus PNG renditions at the given widths, all from one drawing. */
function variant(role, { appearance, colorMode = 'full-color', svg, widths, qualifiedBackgrounds, anchor, minimumWidthPx, extra = [] }) {
  const meta = { appearance, colorMode };
  const representations = [];
  const vector = { format: 'svg', motion: 'static' };
  vector.file = put(canonicalAssetPath(role, meta, vector), Buffer.from(svg));
  representations.push(vector);
  for (const width of widths) {
    const image = render(svg, width);
    const raster = { format: 'png', motion: 'static', width: image.width, height: image.height, pixelDensity: 1 };
    raster.file = put(canonicalAssetPath(role, meta, raster), image.asPng());
    representations.push(raster);
  }
  for (const { svg: adaptiveSvg } of extra) {
    const adaptive = { format: 'svg', motion: 'static', adaptive: true };
    adaptive.file = put(canonicalAssetPath(role, meta, adaptive), Buffer.from(adaptiveSvg));
    representations.push(adaptive);
  }
  return { appearance, colorMode, qualifiedBackgrounds, qualificationEvidence: evidence(anchor), minimumWidthPx, representations };
}

/** The same drawing exported for both background classes, from its `-dark` and `-light` masters. */
function paired(role, name, { widths, anchor, minimumWidthPx, monochrome, adaptive }) {
  const id = role.replace('.', '-');
  const variants = ['light', 'dark'].map(theme => variant(role, {
    appearance: APPEARANCE[theme], svg: prefixIds(master(name(theme)), `diffdevil-${id}-${APPEARANCE[theme]}`), widths,
    // An adaptive rendition is inspected in both scheme states on both background classes.
    qualifiedBackgrounds: adaptive ? ['light', 'dark'] : [theme], anchor, minimumWidthPx, extra: adaptive ? [{ svg: adaptive }] : [],
  }));
  for (const theme of monochrome ? ['light', 'dark'] : []) variants.push(variant(role, {
    appearance: APPEARANCE[theme], colorMode: 'monochrome', svg: prefixIds(master(monochrome(theme)), `diffdevil-${id}-${APPEARANCE[theme]}-monochrome`),
    widths: [512], qualifiedBackgrounds: [theme], anchor, minimumWidthPx,
  }));
  return { role, variants };
}

/** An opaque application tile: the master mark on the midnight ground, framed and measured like the website's icons. */
function tile(role, frame, sizes) {
  const svg = onGround(prefixIds(master('diffdevil-symbol-master-dark.svg'), `diffdevil-${role.replace('.', '-')}`), frame.size, frame.pad);
  const occupancy = measureBounds(render(svg, frame.size)).occupancy;
  if (occupancy < frame.occupancy[0] || occupancy > frame.occupancy[1]) throw new Error(`${role}: occupancy ${occupancy.toFixed(3)} outside ${frame.occupancy.join('–')}`);
  return { role, variants: [variant(role, { appearance: 'universal', svg, widths: sizes, qualifiedBackgrounds: ['light', 'dark'], anchor: 'application-tiles', minimumWidthPx: 16 })] };
}

const manifest = {
  schemaVersion: 1,
  brand: { id: 'diffdevil', displayName: 'diffdevil', description: 'The devil is in the diff.' },
  source: { repository: 'Wolfsblvt/diffdevil', commit: sourceCommit, exporter: 'tools/brand-export.mjs' },
  assets: [
    paired('mark.primary', theme => `diffdevil-symbol-master-${theme}.svg`, { widths: [512, 256, 128, 64], anchor: 'marks', minimumWidthPx: 24, monochrome: theme => `diffdevil-symbol-mono-${theme}.svg` }),
    paired('mark.compact', theme => `diffdevil-symbol-micro-${theme}.svg`, { widths: [64, 32, 16], anchor: 'marks', minimumWidthPx: 12 }),
    paired('wordmark', theme => `diffdevil-wordmark-${theme}.svg`, { widths: [1200, 600], anchor: 'wordmark-and-lockups', minimumWidthPx: 72 }),
    paired('lockup.default', theme => `diffdevil-lockup-${theme}.svg`, { widths: [1200, 600], anchor: 'wordmark-and-lockups', minimumWidthPx: 120 }),
    paired('lockup.compact', theme => `diffdevil-lockup-stacked-${theme}.svg`, { widths: [600, 300], anchor: 'wordmark-and-lockups', minimumWidthPx: 64 }),
    paired('icon.favicon', theme => `diffdevil-symbol-micro-${theme}.svg`, { widths: [64, 48, 32, 16], anchor: 'favicon', minimumWidthPx: 16, adaptive: faviconAdaptive(master('diffdevil-symbol-micro-dark.svg'), master('diffdevil-symbol-micro-light.svg')) }),
    tile('icon.application', FRAMES.webApp, [512, 192]),
    tile('icon.touch', FRAMES.appleTouch, [180]),
    tile('icon.maskable', FRAMES.webApp, [512]),
  ],
};
manifest.bundleSha256 = bundleSha256(manifest);
writeFileSync(join(BUNDLE, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
await validateBrandBundle(BUNDLE);
console.log(`Exported ${BUNDLE} from ${sourceCommit}: ${manifest.bundleSha256}`);
