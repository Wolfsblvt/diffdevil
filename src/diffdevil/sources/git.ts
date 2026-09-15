import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { captureAsync, fail, unwrap } from '../errors.js';
import { contentId } from '../inert.js';
import { analyzeDiff } from '../report.js';
import type { AnalyzeOptions } from '../report.js';
import type { Report, Result } from '../model.js';

const execute = promisify(execFile);
export interface GitOptions extends Omit<AnalyzeOptions, 'source' | 'fileSet'> {
  readonly cwd?: string;
  readonly base?: string;
  readonly head?: string;
  readonly staged?: boolean;
  readonly comparison?: 'three-dot' | 'direct';
  readonly maximumBytes?: number;
}
/** Git is used only as a data source. No hooks, repository scripts, external diff, or textconv are run. */
export async function analyzeGit(options: GitOptions = {}): Promise<Result<Report>> {
  return captureAsync(async () => {
    if ((options.base === undefined) !== (options.head === undefined)) fail('E_SOURCE', 'Use --base and --head together.', 'source');
    if (options.staged && options.base !== undefined) fail('E_SOURCE', 'Staged and revision comparisons cannot be combined.', 'source');
    if (options.comparison !== undefined && options.base === undefined) fail('E_SOURCE', 'A comparison mode requires --base and --head.', 'source');
    const environment: NodeJS.ProcessEnv = { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_OPTIONAL_LOCKS: '0', GIT_NO_REPLACE_OBJECTS: '1', GIT_CONFIG_COUNT: '0', LC_ALL: 'C' };
    // An ambient Git context must not redirect an explicitly selected working directory.
    for (const name of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES', 'GIT_CONFIG_PARAMETERS', 'GH_TOKEN', 'GITHUB_TOKEN', 'ACTIONS_RUNTIME_TOKEN', 'INPUT_GITHUB-TOKEN']) delete (environment as NodeJS.ProcessEnv)[name];
    for (const name of Object.keys(environment)) if (name.startsWith('INPUT_')) delete environment[name];
    const controlledConfig = ['-c', 'core.fsmonitor=false'];
    const git = async (args: readonly string[], maximumBytes = options.maximumBytes ?? 64 * 1024 * 1024, emptyWhenAbsent = false): Promise<string> => {
      try {
        const result = await execute('git', ['--no-pager', ...controlledConfig, ...args], { cwd: options.cwd ?? process.cwd(), env: environment, encoding: 'buffer', maxBuffer: maximumBytes, windowsHide: true });
        try { return new TextDecoder('utf-8', { fatal: true }).decode(result.stdout); }
        catch { return fail('E_SOURCE', 'Git returned non-UTF-8 paths or diff text; no lossy decoding was performed.', 'source'); }
      } catch (error) {
        const e = error as { code?: string | number; stderr?: Buffer };
        if (emptyWhenAbsent && e.code === 1) return '';
        if (e.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER') fail('E_LIMIT', `Git diff exceeds the ${maximumBytes}-byte acquisition limit.`, 'source');
        if (error instanceof Error && error.name === 'DiffdevilError') throw error;
        fail('E_SOURCE', `Git data acquisition failed${e.stderr ? `: ${e.stderr.toString('utf8').trim()}` : `: ${error instanceof Error ? error.message : 'unknown process error'}`}`, 'source');
      }
    };
    await git(['rev-parse', '--show-toplevel']);
    // Worktree comparisons can invoke clean/process filters even with textconv disabled.
    // Read only their names, then disable executable drivers for this data-only invocation.
    const filterKeys = await git(['config', '--null', '--name-only', '--get-regexp', '^filter\\..*\\.(clean|smudge|process|required)$'], 1048576, true);
    for (const key of new Set(filterKeys.split('\0').filter(Boolean))) {
      controlledConfig.push('-c', `${key}=${key.endsWith('.required') ? 'false' : ''}`);
    }
    const revision = (ref: string): Promise<string> => git(['rev-parse', '--verify', '--end-of-options', `${ref}^{commit}`], 4096).then(value => value.trim());
    if ((await git(['ls-files', '--unmerged', '-z'])).length) fail('E_SOURCE', 'The index contains unmerged entries. Resolve the conflicts before analysis.', 'source');
    const head = await revision(options.head ?? 'HEAD');
    const requestedBase = options.base === undefined ? head : await revision(options.base);
    const comparison = options.base !== undefined ? options.comparison ?? 'three-dot' : options.staged ? 'staged' : 'worktree';
    const base = comparison === 'three-dot' ? (await git(['merge-base', requestedBase, head], 4096)).trim() : requestedBase;
    const args = ['diff', '--no-ext-diff', '--no-textconv', '--no-color', '--full-index', '--src-prefix=a/', '--dst-prefix=b/', '--find-renames', '--ignore-submodules=none', '--submodule=short', '--unified=3'];
    if (options.base !== undefined) args.push(base, head);
    else if (options.staged) args.push('--cached', head);
    else args.push(head);
    args.push('--');
    const text = await git(args);
    if (await revision(options.head ?? 'HEAD') !== head) fail('E_SOURCE', 'The selected head moved during analysis. Run analysis again against the current head.', 'source');
    return unwrap(analyzeDiff(text, { ...(options.paths ? { paths: options.paths } : {}), ...(options.scopes ? { scopes: options.scopes } : {}),
      source: { kind: 'git', base, head, comparison, comparisonId: contentId('comparison', { kind: 'git', base, head, comparison, text }) } }));
  });
}
