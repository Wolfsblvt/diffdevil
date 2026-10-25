// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Admit the checked-out commit as a production source: it must be clean, accepted `main`
 * history and, when a recovery or adoption run names an exact commit, that commit.
 * Usage: node tools/publication/source.mjs [--requested <40-hex sha>]
 */
import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SHA = /^[0-9a-f]{40}$/u;

export function admitSource({ requested = '', git = defaultGit, mainRef = 'refs/remotes/origin/main' } = {}) {
  const wanted = requested.trim();
  if (wanted && !SHA.test(wanted)) throw new Error('A requested source must be one full 40-character lower-case commit SHA.');
  const source = git(['rev-parse', 'HEAD']);
  if (wanted && wanted !== source) throw new Error(`Checked out ${source}, not the requested ${wanted}.`);
  const main = git(['rev-parse', mainRef]);
  // `merge-base --is-ancestor` reports through its exit status; anything else is not accepted history.
  try { git(['merge-base', '--is-ancestor', source, main]); }
  catch { throw new Error(`${source} is not contained in accepted main ${main}; refusing to publish it.`); }
  if (git(['status', '--porcelain', '--untracked-files=normal'])) throw new Error('The production checkout is not clean.');
  return { source, main, requested: wanted || null, current: source === main };
}

function defaultGit(args) {
  return execFileSync('git', args, { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const index = process.argv.indexOf('--requested');
  const admitted = admitSource({ requested: index > 0 ? process.argv[index + 1] ?? '' : '' });
  console.log(JSON.stringify(admitted));
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `sha=${admitted.source}\n`);
}
