// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Build-time terminal specimens. Every command shown on a narrative surface is executed
 * here by the real CLI (`dist/lib/cli/main.js`) against a repository-owned input, and the
 * surface prints that run's stdout and exit code. A command the CLI refuses fails the
 * build instead of shipping as teaching text.
 *
 * The displayed command omits the input flags; the surface names the input in its header.
 */
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { repositoryRoot } from './engine-node';
import { files } from './specimens';

export interface CliRun { readonly args: readonly string[]; readonly stdout: string; readonly lines: readonly string[]; readonly code: number }

const INPUT = ['--report', files.exactReport, '--config', files.fullPolicy] as const;

/** Runs `diffdevil <args>` on exact.json under full.yml. `expect` is the set of exit codes the specimen is teaching. */
export function runCli(args: readonly string[], expect: readonly number[] = [0]): CliRun {
  const result = spawnSync(process.execPath, [join(repositoryRoot, 'dist/lib/cli/main.js'), ...args, ...INPUT], { cwd: repositoryRoot, encoding: 'utf8' });
  const code = result.status ?? -1;
  if (!expect.includes(code)) throw new Error(`Website specimen \`diffdevil ${args.join(' ')}\` exited ${code}, expected ${expect.join(' or ')}.\n${result.stderr}`);
  const stdout = result.stdout.replace(/\r\n/gu, '\n').replace(/\n+$/u, '');
  return { args, stdout, lines: stdout ? stdout.split('\n') : [], code };
}

/** The part of a report presenter's output up to its first blank line: its self-describing header. */
export function headerOf(run: CliRun): string[] {
  const end = run.lines.indexOf('');
  return run.lines.slice(0, end === -1 ? run.lines.length : end);
}
