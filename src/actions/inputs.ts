import { resolve } from 'node:path';
import { fail, unwrap } from '../errors.js';
import { enforceBytes, DEFAULT_LIMITS } from '../limits.js';
import { readUtf8 } from '../hosts/io.js';
import { readPolicyJson } from '../policy/source.js';
import { policyRecord } from '../policy/validation.js';
import { githubRecord, githubInteger, githubString, repositoryPath } from '../github/values.js';
import { inputNames, type ActionEntryPoint } from './surface.js';
export type ActionInputs = Readonly<Record<string, string>>;
export type ActionMode = 'analyze' | 'plan' | 'apply' | 'verify' | 'definitions';
export interface ActionContext {
  readonly entryPoint: ActionEntryPoint; readonly inputs: ActionInputs; readonly mode: ActionMode;
  readonly repository: string; readonly pullRequest?: number; readonly cwd: string;
  readonly source: 'github-api' | 'git'; readonly summary: boolean;
  readonly parameters: Readonly<Record<string, unknown>>;
}
const verbatim = new Set(['policy', 'formula', 'condition', 'comment-template', 'parameters']);
/** Hyphens remain hyphens in INPUT_*; GitHub replaces spaces, not punctuation. */
export function readInputs(entry: ActionEntryPoint, environment: NodeJS.ProcessEnv): ActionInputs {
  const allowed = new Set(inputNames(entry)), inputs: Record<string, string> = Object.create(null);
  for (const [key, value] of Object.entries(environment)) {
    if (!key.startsWith('INPUT_') || value === undefined || value.trim() === '') continue;
    const name = key.slice(6).toLowerCase();
    if (!allowed.has(name)) fail('E_ACTION_INPUT', `Input ${name} is not supported by the ${entry} Action.`, 'config');
    enforceBytes(value, DEFAULT_LIMITS.configBytes, `Action input ${name}`, 'config');
    inputs[name] = verbatim.has(name) ? value : value.trim();
  }
  return inputs;
}
export function booleanInput(inputs: ActionInputs, name: string, fallback: boolean): boolean {
  const value = inputs[name];
  if (value === undefined) return fallback;
  if (value !== 'true' && value !== 'false') fail('E_ACTION_INPUT', `${name} requires true or false.`, 'config');
  return value === 'true';
}
export function choice<T extends string>(value: string | undefined, options: readonly T[], fallback: T, name: string): T {
  if (value === undefined) return fallback;
  if (!(options as readonly string[]).includes(value)) fail('E_ACTION_INPUT', `${name} must be ${options.join(', ')}.`, 'config');
  return value as T;
}
export function positiveInteger(value: string, name: string): number {
  if (!/^[1-9][0-9]*$/u.test(value) || !Number.isSafeInteger(Number(value))) fail('E_ACTION_INPUT', `${name} must be a positive safe integer.`, 'config');
  return Number(value);
}
async function eventTarget(environment: NodeJS.ProcessEnv): Promise<{ repository?: string; pullRequest?: number }> {
  if (!environment.GITHUB_EVENT_PATH) return {};
  let parsed: unknown;
  try { parsed = JSON.parse(await readUtf8(environment.GITHUB_EVENT_PATH, { maximum: 16 * 1024 * 1024 })); }
  catch { return fail('E_ACTION_EVENT', 'GITHUB_EVENT_PATH must contain a readable JSON event.', 'source'); }
  const event = githubRecord(parsed, 'event');
  const repository = event.repository === undefined ? undefined : githubString(githubRecord(event.repository, 'event repository').full_name, 'event repository name');
  let pullRequest: number | undefined;
  if (['pull_request', 'pull_request_target'].includes(environment.GITHUB_EVENT_NAME ?? '')) {
    const pull = githubRecord(event.pull_request, 'event pull request');
    pullRequest = githubInteger(pull.number, 'event pull request number');
  } else if (environment.GITHUB_EVENT_NAME === 'issue_comment' && event.issue !== undefined) {
    const issue = githubRecord(event.issue, 'event issue');
    if (issue.pull_request !== undefined) pullRequest = githubInteger(issue.number, 'event PR issue number');
  }
  return { ...(repository === undefined ? {} : { repository }), ...(pullRequest === undefined ? {} : { pullRequest }) };
}
/** Resolve only event target identity. Head, base, policy and diff come from current acquisition. */
export async function actionContext(entryPoint: ActionEntryPoint, environment: NodeJS.ProcessEnv, cwd = environment.GITHUB_WORKSPACE ?? process.cwd()): Promise<ActionContext> {
  const inputs = readInputs(entryPoint, environment), event = await eventTarget(environment);
  const repository = inputs.repository ?? environment.GITHUB_REPOSITORY ?? event.repository;
  if (!repository) fail('E_ACTION_INPUT', 'Select repository or supply a workflow repository.', 'config');
  repositoryPath(repository);
  if (inputs.repository && event.repository && inputs.repository.toLowerCase() !== event.repository.toLowerCase() && !inputs['pull-request'] && entryPoint !== 'sync-labels') fail('E_ACTION_INPUT', 'An overridden repository requires an explicit pull-request number.', 'config');
  const pullRequest = entryPoint === 'sync-labels' ? undefined : inputs['pull-request'] === undefined ? event.pullRequest : positiveInteger(inputs['pull-request'], 'pull-request');
  if (entryPoint !== 'sync-labels' && (pullRequest === undefined || pullRequest < 1)) fail('E_ACTION_INPUT', 'Select pull-request or use a supported PR event.', 'config');
  const mode: ActionMode = entryPoint === 'root' ? choice(inputs.mode, ['analyze', 'plan', 'apply'], 'apply', 'mode') : entryPoint === 'sync-labels' ? (choice(inputs.operation, ['verify', 'apply'], 'verify', 'operation') === 'verify' ? 'verify' : 'definitions') : entryPoint;
  const source = choice(inputs.source, ['github-api', 'git'], 'github-api', 'source');
  if (inputs['git-cwd'] && source !== 'git') fail('E_ACTION_INPUT', 'git-cwd requires source: git.', 'config');
  if (mode === 'analyze' && ['label', 'remove-label-when-false', 'comment-template', 'comment-mode', 'definitions', 'plan-path', 'effects-path', 'comment-author', 'comment-author-id', 'occasion-id'].some(name => inputs[name] !== undefined)) fail('E_ACTION_INPUT', 'Analyze mode rejects effect and plan inputs.', 'config');
  if (mode === 'plan' && ['effects-path', 'comment-author', 'comment-author-id', 'occasion-id'].some(name => inputs[name] !== undefined)) fail('E_ACTION_INPUT', 'Plan mode does not accept provider-application inputs.', 'config');
  if (mode === 'plan' && inputs.definitions === 'verify') fail('E_ACTION_INPUT', 'Definition verification is a provider read, not a desired-plan operation.', 'config');
  if (mode === 'verify' && inputs.definitions !== undefined) fail('E_ACTION_INPUT', 'Definition verification does not accept an apply definitions mode.', 'config');
  // Workspace bytes cannot be authenticated by a token, event type, filename or saved hash.
  if (inputs['policy-source'] === 'workspace' && ['apply', 'definitions'].includes(mode)) fail('E_POLICY_SOURCE', 'Workspace policy is read-only in Actions. Apply bundled, base, or explicitly pinned policy instead.', 'config');
  if (inputs.formula !== undefined && (inputs.metric !== undefined || inputs.scope !== undefined || inputs.path !== undefined)) fail('E_CONFIG_CONFLICT', 'formula is an alternative to metric and selects its own scope/paths.', 'config');
  if (inputs['comment-author-id'] && !inputs['comment-author']) fail('E_ACTION_INPUT', 'comment-author-id requires comment-author.', 'config');
  if (inputs['comment-author-id']) positiveInteger(inputs['comment-author-id'], 'comment-author-id');
  if (inputs['remove-label-when-false']) booleanInput(inputs, 'remove-label-when-false', true);
  const parameters = inputs.parameters === undefined ? {} : policyRecord(unwrap(readPolicyJson(inputs.parameters, { name: 'input:parameters' })).document, '/parameters');
  return { entryPoint, inputs, mode, repository, ...(pullRequest === undefined ? {} : { pullRequest }), cwd: resolve(cwd), source, summary: booleanInput(inputs, 'summary', true), parameters };
}
