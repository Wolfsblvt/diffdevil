// SPDX-License-Identifier: AGPL-3.0-only
/**
 * The controllers' consumed-input filters, read from the workflows themselves. The CLI lists which
 * files changed between two commits would reach a controller: the adoption reconciliation that
 * decides what a first or recovery run would actually publish beyond a known cut.
 * Usage: node tools/publication/paths.mjs --workflow publish-website.yml|deploy-playground.yml --from <commit> --to <commit>
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const root = fileURLToPath(new URL('../../', import.meta.url));

/** GitHub's filter-pattern subset used here: `**`, `*`, `?`. */
function pattern(glob) {
  let source = '';
  for (let index = 0; index < glob.length; index += 1) {
    if (glob.startsWith('**/', index)) { source += '(?:.*/)?'; index += 2; }
    else if (glob.startsWith('**', index)) { source += '.*'; index += 1; }
    else if (glob[index] === '*') source += '[^/]*';
    else if (glob[index] === '?') source += '[^/]?';
    else source += glob[index].replace(/[.+^${}()|[\]\\]/u, '\\$&');
  }
  return new RegExp(`^${source}$`, 'u');
}

/** Whether `file` matches an ordered GitHub `paths` list; a later pattern overrides an earlier one. */
export function triggers(paths, file) {
  let included = false;
  for (const entry of paths) {
    const negated = entry.startsWith('!');
    if (pattern(negated ? entry.slice(1) : entry).test(file)) included = !negated;
  }
  return included;
}

export function pushPaths(workflow, source = root) {
  return parse(readFileSync(join(source, '.github/workflows', workflow), 'utf8')).on.push.paths;
}

/** Changed files between two commits that the named controller consumes. */
export function consumedChanges({ workflow, from, to, git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true }) }) {
  const paths = pushPaths(workflow);
  return git(['diff', '--name-only', '--no-renames', from, to]).split('\n').filter(Boolean).filter(file => triggers(paths, file));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const option = name => { const index = process.argv.indexOf(`--${name}`); return index > 0 ? process.argv[index + 1] : undefined; };
  const [workflow, from, to] = ['workflow', 'from', 'to'].map(option);
  if (!workflow || !from || !to) { console.error('Usage: --workflow <file> --from <commit> --to <commit>'); process.exit(2); }
  const files = consumedChanges({ workflow, from, to });
  console.log(files.length ? files.join('\n') : `No ${workflow} input changed between ${from} and ${to}.`);
}
