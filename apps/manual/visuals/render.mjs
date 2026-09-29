// SPDX-License-Identifier: AGPL-3.0-only
/** Render the manual's finite Mermaid/Vega-Lite visual set to deterministic static SVG. */
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));
const sourceRoot = join(repositoryRoot, 'docs/manual/assets/visuals');
const renderedRoot = join(sourceRoot, 'rendered');
const artifactRoot = join(repositoryRoot, 'artifacts/manual/visuals');
const mode = process.argv[2] ?? '--validate';
const allowedModes = new Set(['--write', '--check', '--validate']);
if (!allowedModes.has(mode)) throw new Error(`Unknown visual render mode: ${mode}`);

const sources = Object.freeze({
  chart: 'docs/manual/assets/visuals/evidence-thresholds.vl.json',
  trust: 'docs/manual/assets/visuals/trust-boundary.mmd',
  selection: 'docs/manual/assets/visuals/selection-boundaries.mmd',
  provider: 'docs/manual/assets/visuals/provider-readback.mmd',
});
const outputs = Object.freeze([
  { id: 'evidence-thresholds', source: sources.chart, kind: 'vega-lite', appearance: 'light', width: 600, narrow: false },
  { id: 'evidence-thresholds', source: sources.chart, kind: 'vega-lite', appearance: 'dark', width: 600, narrow: false },
  { id: 'evidence-thresholds-narrow', source: sources.chart, kind: 'vega-lite', appearance: 'light', width: 280, narrow: true },
  { id: 'evidence-thresholds-narrow', source: sources.chart, kind: 'vega-lite', appearance: 'dark', width: 280, narrow: true },
  { id: 'trust-boundary', source: sources.trust, kind: 'mermaid', appearance: 'light' },
  { id: 'trust-boundary', source: sources.trust, kind: 'mermaid', appearance: 'dark' },
  { id: 'selection-boundaries', source: sources.selection, kind: 'mermaid', appearance: 'light' },
  { id: 'selection-boundaries', source: sources.selection, kind: 'mermaid', appearance: 'dark' },
  { id: 'provider-readback', source: sources.provider, kind: 'mermaid', appearance: 'light' },
  { id: 'provider-readback', source: sources.provider, kind: 'mermaid', appearance: 'dark' },
].map(entry => Object.freeze({ ...entry, file: `${entry.id}-${entry.appearance}.svg` })));

const sha256 = value => createHash('sha256').update(value).digest('hex');
const read = path => readFileSync(join(repositoryRoot, path), 'utf8');
const stable = value => JSON.stringify(value, null, 2) + '\n';

function packagePins() {
  const pkg = JSON.parse(readFileSync(join(repositoryRoot, 'apps/manual/package.json'), 'utf8'));
  return {
    mermaid: pkg.dependencies?.mermaid,
    vega: pkg.dependencies?.vega,
    'vega-lite': pkg.dependencies?.['vega-lite'],
  };
}

function packageRoot(name) {
  let current = dirname(fileURLToPath(import.meta.resolve(name)));
  while (current !== dirname(current)) {
    const manifest = join(current, 'package.json');
    if (existsSync(manifest)) {
      try {
        if (JSON.parse(readFileSync(manifest, 'utf8')).name === name) return current;
      } catch {
        // Continue upward. A parent package.json may not describe this package.
      }
    }
    current = dirname(current);
  }
  throw new Error(`Could not resolve package root for ${name}`);
}

function firstExisting(root, candidates) {
  for (const candidate of candidates) {
    const path = join(root, candidate);
    if (existsSync(path)) return path;
  }
  throw new Error(`No supported browser bundle found under ${root}: ${candidates.join(', ')}`);
}

function browserBundles() {
  return {
    mermaid: firstExisting(packageRoot('mermaid'), ['dist/mermaid.min.js', 'dist/mermaid.js']),
    vega: firstExisting(packageRoot('vega'), ['build/vega.min.js', 'build/vega.js']),
    vegaLite: firstExisting(packageRoot('vega-lite'), ['build/vega-lite.min.js', 'build/vega-lite.js']),
  };
}

function appearance(variant) {
  if (variant === 'light') return {
    background: '#fbfcfe', surface: '#ffffff', raised: '#f2f3f7', ink: '#161b24', secondary: '#484d58', muted: '#6c727e',
    hair: '#d8dbe0', strong: '#b4b7be', accent: '#e54eaf', accentText: '#aa167d', modified: '#2a5db0',
    success: '#1f7a4d', warning: '#8a5a12', error: '#b3261e', onMark: '#ffffff',
  };
  return {
    background: '#151922', surface: '#1d222c', raised: '#262b36', ink: '#f0f2f5', secondary: '#b4b7be', muted: '#828690',
    hair: '#2c303a', strong: '#484d58', accent: '#f061ba', accentText: '#f061ba', modified: '#9fc4ff',
    success: '#8fd6aa', warning: '#f2c46d', error: '#ff7a70', onMark: '#0c0f17',
  };
}

function gradientDefinitions(variant) {
  const dark = variant === 'dark';
  const values = dark ? {
    node: ['#262b36', '#1d222c'], cluster: ['#1d222c', '#151922'], focus: ['#4d2545', '#28223a'],
    ok: ['#193c2a', '#10251b'], bad: ['#4a2328', '#29181b'],
  } : {
    node: ['#ffffff', '#f2f3f7'], cluster: ['#fbfcfe', '#f2f3f7'], focus: ['#ffe7f6', '#e8e6fb'],
    ok: ['#eefbf4', '#d2f1df'], bad: ['#fff1ef', '#ffd8d3'],
  };
  const id = name => `dd-${variant}-${name}`;
  return Object.entries(values).map(([name, [start, end]]) =>
    `<linearGradient id="${id(name)}" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${start}"/><stop offset="100%" stop-color="${end}"/></linearGradient>`,
  ).join('');
}

function mermaidConfig(variant, seed) {
  const c = appearance(variant);
  const theme = variant === 'dark' ? 'redux-dark' : 'redux';
  return {
    startOnLoad: false,
    securityLevel: 'strict',
    deterministicIds: true,
    deterministicIDSeed: seed,
    htmlLabels: false,
    theme,
    look: 'neo',
    fontFamily: '"IBM Plex Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
    themeVariables: {
      darkMode: variant === 'dark', background: c.background, mainBkg: c.surface, primaryColor: c.surface,
      primaryTextColor: c.ink, textColor: c.ink, nodeBorder: c.accentText, primaryBorderColor: c.accentText,
      actorBorder: c.accentText, stateBorder: c.accentText, lineColor: c.secondary, arrowheadColor: c.secondary,
      signalColor: c.secondary, clusterBkg: c.background, clusterBorder: c.strong, edgeLabelBackground: c.background,
      activationBkgColor: c.raised, activationBorderColor: c.strong, labelBoxBkgColor: c.surface,
      labelBoxBorderColor: c.strong, noteBkgColor: variant === 'dark' ? '#3a3214' : '#fff8d5',
      noteBorderColor: c.warning, noteTextColor: c.ink, radius: 12, strokeWidth: 2, useGradient: true,
      gradientStart: c.accent, gradientStop: c.modified,
    },
    themeCSS: [
      `.node rect.basic, .node path.basic, .node polygon.basic, .node circle.basic, .node .label-container, rect.actor { fill: url(#dd-${variant}-node) ${c.surface} !important; }`,
      `.cluster rect, .cluster path { fill: url(#dd-${variant}-cluster) ${c.background} !important; }`,
      `.node.focus rect, .node.focus path, .node.focus polygon, .node.focus circle { fill: url(#dd-${variant}-focus) ${c.raised} !important; stroke: ${c.accent} !important; }`,
      `.node.focus .nodeLabel, .node.focus .label, .node.focus text { color: ${c.ink} !important; fill: ${c.ink} !important; }`,
      `.node.ok rect, .node.ok path, .node.ok polygon, .node.ok circle { fill: url(#dd-${variant}-ok) ${c.surface} !important; stroke: ${c.success} !important; }`,
      `.node.ok .nodeLabel, .node.ok .label, .node.ok text { color: ${c.ink} !important; fill: ${c.ink} !important; }`,
      `.node.bad rect, .node.bad path, .node.bad polygon, .node.bad circle { fill: url(#dd-${variant}-bad) ${c.surface} !important; stroke: ${c.error} !important; }`,
      `.node.bad .nodeLabel, .node.bad .label, .node.bad text { color: ${c.ink} !important; fill: ${c.ink} !important; }`,
      `.edgeLabel { color: ${c.ink} !important; }`,
    ].join('\n'),
    flowchart: { htmlLabels: false, padding: 12, nodeSpacing: 34, rankSpacing: 42, curve: 'basis' },
    sequence: { wrap: true, width: 148, actorMargin: 24, messageMargin: 24, boxMargin: 6, mirrorActors: false },
  };
}

function chartConfig(variant) {
  const c = appearance(variant);
  return {
    background: c.background,
    font: '"IBM Plex Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
    padding: { left: 4, right: 8, top: 4, bottom: 4 },
    autosize: { type: 'fit-x', contains: 'padding' },
    view: { stroke: null },
    axis: {
      labelFontSize: 12, labelColor: c.secondary, titleFontSize: 12, titleColor: c.secondary,
      titleFontWeight: 500, titlePadding: 12, labelPadding: 7, domain: false, ticks: false,
      gridColor: c.hair, gridOpacity: 0.8, labelLimit: 160,
    },
    text: { fill: c.secondary, fontSize: 12 },
    rule: { stroke: c.secondary },
    point: { filled: true, stroke: c.background },
    range: { category: [c.modified, c.accent] },
  };
}

function adaptChart(source, variant, width, narrow) {
  const c = appearance(variant);
  const spec = structuredClone(source);
  spec.width = width;
  spec.height = narrow ? 202 : 188;
  spec.encoding.x.axis.title = narrow ? 'file-scoped Changed lines' : 'file-scoped replacement-aware Changed lines';
  spec.encoding.x.axis.tickCount = narrow ? 4 : 5;
  for (const layer of spec.layer) {
    if (layer.name === 'edition-labels') layer.encoding.text.field = narrow ? 'narrowEdition' : 'edition';
    if (layer.name === 'held-threshold-label' || layer.name === 'resolved-threshold-label') {
      layer.encoding.text.field = narrow ? 'narrowLabel' : 'label';
      layer.mark.fontSize = narrow ? 10.5 : 11.5;
    }
    const domain = layer.encoding?.color?.scale?.domain;
    if (JSON.stringify(domain) === JSON.stringify(['bounded', 'exact'])) layer.encoding.color.scale.range = [c.modified, c.accent];
    if (JSON.stringify(domain) === JSON.stringify(['held', 'resolved'])) layer.encoding.color.scale.range = [c.warning, c.success];
  }
  return spec;
}

function mermaidAccessibility(source) {
  const title = source.match(/^\s*accTitle:\s*(.+)$/mu)?.[1]?.trim();
  const description = source.match(/^\s*accDescr:\s*(.+)$/mu)?.[1]?.trim();
  if (!title || !description) throw new Error('Mermaid source needs accTitle and accDescr.');
  return { title, description };
}

async function packageSvg(page, { svg, title, description, variant, gradients = '' }) {
  return page.evaluate(({ svg, title, description, variant, gradients }) => {
    const namespace = 'http://www.w3.org/2000/svg';
    const document = new DOMParser().parseFromString(svg, 'image/svg+xml');
    if (document.querySelector('parsererror')) throw new Error('Renderer returned invalid SVG.');
    const root = document.documentElement;
    root.setAttribute('xmlns', namespace);
    root.setAttribute('role', 'img');
    root.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    root.setAttribute('data-appearance', variant);
    for (const node of [...root.children]) if (node.localName === 'title' || node.localName === 'desc') node.remove();
    const titleNode = document.createElementNS(namespace, 'title');
    const descriptionNode = document.createElementNS(namespace, 'desc');
    const key = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
    titleNode.id = `${key}-${variant}-title`;
    descriptionNode.id = `${key}-${variant}-description`;
    titleNode.textContent = title;
    descriptionNode.textContent = description;
    root.prepend(descriptionNode);
    root.prepend(titleNode);
    root.setAttribute('aria-labelledby', `${titleNode.id} ${descriptionNode.id}`);
    if (gradients) {
      let defs = root.querySelector(':scope > defs');
      if (!defs) {
        defs = document.createElementNS(namespace, 'defs');
        descriptionNode.after(defs);
      }
      const holder = new DOMParser().parseFromString(`<svg xmlns="${namespace}"><defs>${gradients}</defs></svg>`, 'image/svg+xml');
      for (const child of [...holder.querySelector('defs').children]) defs.append(document.importNode(child, true));
    }
    const viewBox = root.getAttribute('viewBox')?.trim().split(/[ ,]+/u).map(Number);
    if (viewBox?.length === 4 && viewBox.every(Number.isFinite)) {
      root.setAttribute('width', String(Math.ceil(viewBox[2])));
      root.setAttribute('height', String(Math.ceil(viewBox[3])));
    }
    if (root.querySelector('script, foreignObject')) throw new Error('Portable SVG may not contain script or foreignObject.');
    for (const node of root.querySelectorAll('[href], [xlink\\:href]')) {
      const href = node.getAttribute('href') ?? node.getAttribute('xlink:href') ?? '';
      if (href && !href.startsWith('#') && !href.startsWith('data:')) throw new Error(`External SVG resource: ${href}`);
    }
    return new XMLSerializer().serializeToString(root) + '\n';
  }, { svg, title, description, variant, gradients });
}

async function renderAll(destination) {
  const { chromium } = await import('@playwright/test');
  const bundles = browserBundles();
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({ path: bundles.mermaid });
  await page.addScriptTag({ path: bundles.vega });
  await page.addScriptTag({ path: bundles.vegaLite });
  const rendered = [];
  try {
    for (const output of outputs) {
      let svg;
      if (output.kind === 'mermaid') {
        const source = read(output.source);
        const accessibility = mermaidAccessibility(source);
        const config = mermaidConfig(output.appearance, `${output.id}-${output.appearance}`);
        const raw = await page.evaluate(async ({ source, config, renderId }) => {
          const mermaid = window.mermaid?.default ?? window.mermaid;
          if (!mermaid?.render) throw new Error('Mermaid browser bundle did not expose render().');
          mermaid.initialize(config);
          return (await mermaid.render(renderId, source)).svg;
        }, { source, config, renderId: `dd-${output.id}-${output.appearance}` });
        svg = await packageSvg(page, { ...accessibility, svg: raw, variant: output.appearance, gradients: gradientDefinitions(output.appearance) });
      } else {
        const source = JSON.parse(read(output.source));
        const spec = adaptChart(source, output.appearance, output.width, output.narrow);
        const config = chartConfig(output.appearance);
        const raw = await page.evaluate(async ({ spec, config }) => {
          if (!window.vega || !window.vegaLite) throw new Error('Vega browser bundles are unavailable.');
          const compiled = window.vegaLite.compile(spec, { config });
          const view = new window.vega.View(window.vega.parse(compiled.spec), { renderer: 'none' });
          try { return await view.toSVG(); } finally { view.finalize(); }
        }, { spec, config });
        svg = await packageSvg(page, {
          svg: raw,
          title: 'Bounded and exact evidence against policy thresholds',
          description: 'The PR-files edition proves a file-scoped Changed interval from 8,679 through 11,330. It crosses 9,500, so that policy holds, but stays entirely below 12,000, so that band resolves. The raw-diff edition establishes exact 9,603.',
          variant: output.appearance,
        });
      }
      mkdirSync(destination, { recursive: true });
      writeFileSync(join(destination, output.file), svg, 'utf8');
      rendered.push({ ...output, sha256: sha256(svg) });
    }
  } finally {
    await page.close();
    const browserVersion = browser.version();
    await browser.close();
    mkdirSync(artifactRoot, { recursive: true });
    writeFileSync(join(artifactRoot, 'runtime.json'), stable({ browserVersion }), 'utf8');
  }
  return rendered;
}

function expectedReceipt(rendered) {
  const pins = packagePins();
  for (const [name, value] of Object.entries(pins)) if (!/^\d+\.\d+\.\d+(?:[-+].+)?$/u.test(value ?? '')) throw new Error(`Pin ${name} must be an exact version.`);
  return {
    formatVersion: 1,
    renderer: 'apps/manual/visuals/render.mjs',
    runtimes: pins,
    sources: [...new Set(outputs.map(output => output.source))].sort().map(path => ({ path, sha256: sha256(read(path)) })),
    outputs: rendered.map(output => ({
      path: `docs/manual/assets/visuals/rendered/${output.file}`,
      visual: output.id,
      kind: output.kind,
      appearance: output.appearance,
      width: output.width ?? null,
      narrow: output.narrow ?? false,
      source: output.source,
      sha256: output.sha256,
    })),
  };
}

function validateSvg(path, content) {
  if (!/<svg\b/u.test(content) || !/\brole="img"/u.test(content) || !/<title\b/u.test(content) || !/<desc\b/u.test(content)) throw new Error(`${path}: missing SVG accessibility structure.`);
  if (/<(?:script|foreignObject)\b/iu.test(content)) throw new Error(`${path}: unsafe or non-portable SVG content.`);
  if (/\b(?:href|xlink:href)="(?!#|data:)/iu.test(content) || /url\(\s*["']?https?:/iu.test(content) || /@import/iu.test(content)) throw new Error(`${path}: external SVG resource.`);
  if (!/\bviewBox="[^"]+"/u.test(content)) throw new Error(`${path}: missing viewBox.`);
}

function validateCommitted() {
  const receiptPath = join(renderedRoot, 'receipt.json');
  if (!existsSync(receiptPath)) throw new Error('Missing committed visual receipt.');
  const receiptText = readFileSync(receiptPath, 'utf8');
  const receipt = JSON.parse(receiptText);
  if (receipt.formatVersion !== 1 || receipt.renderer !== 'apps/manual/visuals/render.mjs') throw new Error('Unsupported visual receipt.');
  if (JSON.stringify(receipt.runtimes) !== JSON.stringify(packagePins())) throw new Error('Visual runtime pins differ from the receipt.');
  for (const source of receipt.sources) if (sha256(read(source.path)) !== source.sha256) throw new Error(`${source.path}: source differs from the visual receipt.`);
  for (const output of receipt.outputs) {
    const path = join(repositoryRoot, output.path);
    if (!existsSync(path)) throw new Error(`${output.path}: missing rendered visual.`);
    const content = readFileSync(path, 'utf8');
    if (sha256(content) !== output.sha256) throw new Error(`${output.path}: rendered bytes differ from the receipt.`);
    validateSvg(output.path, content);
  }
  const expectedFiles = outputs.map(output => `docs/manual/assets/visuals/rendered/${output.file}`).sort();
  const actualFiles = receipt.outputs.map(output => output.path).sort();
  if (JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles)) throw new Error('Visual receipt does not cover the complete selected output set.');
  const chart = JSON.parse(read(sources.chart));
  if (chart.data?.url || chart.layer?.some(layer => layer.data?.url)) throw new Error('Visual chart may not fetch remote data.');
  if (chart.usermeta?.repository !== 'prettier/prettier' || chart.usermeta?.pullRequest !== 13183 || chart.usermeta?.focusPath !== 'tests/format/js/ternaries/__snapshots__/jsfmt.spec.js.snap') throw new Error('Chart provenance changed unexpectedly.');
  for (const path of [sources.trust, sources.selection, sources.provider]) {
    const source = read(path);
    mermaidAccessibility(source);
    if (/\bclick\s+/iu.test(source) || /https?:\/\//iu.test(source)) throw new Error(`${path}: Mermaid source may not contain links or remote resources.`);
  }
  mkdirSync(artifactRoot, { recursive: true });
  writeFileSync(join(artifactRoot, 'validation.json'), stable({ ok: true, receiptSha256: sha256(receiptText), outputs: receipt.outputs.length }), 'utf8');
  return receipt;
}

async function main() {
  if (mode === '--validate') {
    validateCommitted();
    console.log('Manual visuals: committed source/output receipt is valid.');
    return;
  }
  const temporary = mkdtempSync(join(tmpdir(), 'diffdevil-visuals-'));
  try {
    const rendered = await renderAll(temporary);
    const receipt = expectedReceipt(rendered);
    writeFileSync(join(temporary, 'receipt.json'), stable(receipt), 'utf8');
    if (mode === '--write') {
      rmSync(renderedRoot, { recursive: true, force: true });
      mkdirSync(renderedRoot, { recursive: true });
      for (const file of [...outputs.map(output => output.file), 'receipt.json']) writeFileSync(join(renderedRoot, file), readFileSync(join(temporary, file)));
    } else {
      for (const file of [...outputs.map(output => output.file), 'receipt.json']) {
        const committed = join(renderedRoot, file);
        if (!existsSync(committed) || readFileSync(committed).compare(readFileSync(join(temporary, file))) !== 0) throw new Error(`${relative(repositoryRoot, committed)} is stale; run npm --prefix apps/manual run render:visuals.`);
      }
    }
    validateCommitted();
    mkdirSync(artifactRoot, { recursive: true });
    writeFileSync(join(artifactRoot, 'render-result.json'), stable({ ok: true, mode, outputs: receipt.outputs }), 'utf8');
    console.log(`Manual visuals: ${mode === '--write' ? 'rendered' : 'reproduced'} ${receipt.outputs.length} SVG files.`);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

await main();
