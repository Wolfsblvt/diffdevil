// SPDX-License-Identifier: AGPL-3.0-only
/** Compact the finite generated visual set without changing its editable Mermaid/Vega-Lite sources. */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { optimize } from 'svgo';

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));
const renderedRoot = join(repositoryRoot, 'docs/manual/assets/visuals/rendered');
const receiptPath = join(renderedRoot, 'receipt.json');
const sha256 = value => createHash('sha256').update(value).digest('hex');
const escapeAttribute = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
const mode = process.argv[2] ?? '--write';
if (mode !== '--write') throw new Error(`Unknown visual optimization mode: ${mode}`);

function textElement(svg, name) {
  const match = svg.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'u'));
  if (!match || /<[^>]+>/u.test(match[1])) throw new Error(`Generated SVG needs one text-only <${name}> element.`);
  return match[1];
}

function optimizeSvg(svg, output) {
  const title = textElement(svg, 'title');
  const description = textElement(svg, 'desc');
  const key = title.replace(/&[^;]+;/gu, '-').toLowerCase().replace(/[^a-z0-9]+/gu, '-').replace(/^-|-$/gu, '').slice(0, 48);
  const titleId = `${key}-${output.appearance}-title`;
  const descriptionId = `${key}-${output.appearance}-description`;
  let compact = optimize(svg, {
    path: output.path,
    multipass: true,
    plugins: [
      {
        name: 'preset-default',
        params: { overrides: { removeDesc: false } },
      },
      'sortAttrs',
    ],
  }).data.trim();

  compact = compact
    .replace(/<title(?:\s[^>]*)?>[\s\S]*?<\/title>/gu, '')
    .replace(/<desc(?:\s[^>]*)?>[\s\S]*?<\/desc>/gu, '')
    .replace(/\s(?:role|aria-label|aria-roledescription|aria-hidden|aria-labelledby|tabindex|data-appearance)="[^"]*"/gu, '');

  compact = compact.replace(/^<svg\b([^>]*)>/u, (_match, rawAttributes) => {
    const attributes = /\sxmlns="/u.test(rawAttributes)
      ? rawAttributes
      : `${rawAttributes} xmlns="http://www.w3.org/2000/svg"`;
    return `<svg${attributes} role="img" preserveAspectRatio="xMidYMid meet" data-appearance="${escapeAttribute(output.appearance)}" aria-labelledby="${titleId} ${descriptionId}"><title id="${titleId}">${title}</title><desc id="${descriptionId}">${description}</desc>`;
  });
  if (!compact.startsWith('<svg') || !compact.includes('</svg>')) throw new Error(`${output.path}: optimizer returned no SVG root.`);
  return compact + '\n';
}

const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
for (const output of receipt.outputs) {
  const path = join(repositoryRoot, output.path);
  const compact = optimizeSvg(readFileSync(path, 'utf8'), output);
  writeFileSync(path, compact, 'utf8');
  output.sha256 = sha256(compact);
}
const pkg = JSON.parse(readFileSync(join(repositoryRoot, 'apps/manual/package.json'), 'utf8'));
receipt.optimizer = { name: 'svgo', version: pkg.dependencies?.svgo };
if (!/^\d+\.\d+\.\d+(?:[-+].+)?$/u.test(receipt.optimizer.version ?? '')) throw new Error('SVGO must be pinned exactly.');
writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n', 'utf8');
execFileSync(process.execPath, ['apps/manual/visuals/render.mjs', '--validate'], {
  cwd: repositoryRoot,
  stdio: 'inherit',
  windowsHide: true,
});
console.log(`Manual visuals: optimized ${receipt.outputs.length} committed SVG files with SVGO ${receipt.optimizer.version}.`);
