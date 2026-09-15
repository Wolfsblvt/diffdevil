import { captureAsync, diagnosticOf, fail, unwrap } from '../errors.js';
import { canonicalJson, deepFreeze } from '../inert.js';
import type { Diagnostic, EffectPlan, PlanTarget, Report, Result } from '../model.js';
import { readReport } from '../report.js';
import { explainPolicy, type CompiledPolicy } from '../policy/compile.js';
import { evaluatePolicy, type PolicyEvaluateOptions, type PolicyResult } from '../policy/evaluate.js';
import { createPlan, readPlan, selectedDefinitions } from '../policy/plan.js';
import type { CommentDefinition } from '../policy/types.js';
import { GitHubClient } from './client.js';
import { analyzeGitHub, analyzeGitHubGit, githubSourceIdentity, readPullSnapshot } from './source.js';
import { assignmentIntent, definitionIntent, readAssignments, readDefinitions, reconcileAssignments, reconcileDefinitions } from './labels.js';
import { prepareComments, readOwnedComments, reconcileComments, type CommentAuthor } from './comments.js';
import { EffectSession, type EffectObservation } from './observation.js';

export interface GitHubApplyOptions extends Pick<PolicyEvaluateOptions, 'parameters' | 'limits'> {
  readonly definitions?: 'none' | 'ensure' | 'sync' | 'verify';
  /** A host may deliberately reuse a report only when its acquisition and carrier are trusted. */
  readonly inputReport?: Report;
  readonly trustReport?: boolean;
  /** A saved plan is checked against a newly evaluated trusted policy, never blindly executed. */
  readonly inputPlan?: EffectPlan;
  readonly commentAuthor?: CommentAuthor;
  readonly occasionId?: string;
  readonly rules?: readonly string[];
  /** Bind a base-loaded policy to the exact base used to acquire it. */
  readonly expectedPolicyBase?: string;
  /** Explicitly acquire the live PR's exact revisions through local Git. */
  readonly localGit?: { readonly cwd?: string };
}
export interface GitHubApplyResult {
  readonly kind: 'diffdevil.github-apply'; readonly schemaVersion: '1.0';
  readonly status: 'verified' | 'incomplete'; readonly changed: number;
  readonly report: Report; readonly plan: EffectPlan;
  readonly observations: readonly EffectObservation[];
  readonly diagnostics: readonly Diagnostic[];
}
/** Evaluate selected trusted policy, then explicitly reconcile its bounded GitHub effects. */
export function applyGitHubPolicy(client: GitHubClient, target: PlanTarget, policy: CompiledPolicy, options: GitHubApplyOptions = {}): Promise<Result<GitHubApplyResult>> {
  return captureAsync(async () => {
    const mode = options.definitions ?? 'ensure';
    if (!['none', 'ensure', 'sync', 'verify'].includes(mode)) fail('E_CONFIG', 'Definitions mode must be none, ensure, sync or verify.', 'config');
    if (options.localGit && options.inputReport && options.trustReport) fail('E_CONFIG_CONFLICT', 'Select fresh local Git acquisition or a trusted report, not both.', 'config');
    const suppliedReport = options.inputReport === undefined ? undefined : unwrap(readReport(options.inputReport));
    const report = options.localGit ? unwrap(await analyzeGitHubGit(client, target, options.localGit)) : suppliedReport && options.trustReport === true ? suppliedReport : unwrap(await analyzeGitHub(client, target));
    const evaluated = unwrap(evaluatePolicy(policy, report, options));
    if (suppliedReport && options.trustReport !== true) assertReportMatchesPolicy(policy, suppliedReport, evaluated, options);
    const plan = unwrap(createPlan(evaluated, target, { definitions: mode === 'verify' ? 'none' : mode, ...(options.rules === undefined ? {} : { rules: options.rules }) }));
    if (options.inputPlan) {
      const supplied = unwrap(readPlan(options.inputPlan));
      if (canonicalJson(supplied) !== canonicalJson(plan)) fail('E_PLAN_STALE', 'Saved plan differs from the selected policy and current report. Re-plan before application.', 'plan');
    }
    const assertCurrent = async (): Promise<void> => {
      const current = await readPullSnapshot(client, target);
      if (current.state !== 'open') fail('E_PLAN_STALE', 'The target pull request is closed; this plan is not applied.', 'apply');
      const expected = githubSourceIdentity(client, target, current);
      if (options.expectedPolicyBase !== undefined && current.base !== options.expectedPolicyBase) fail('E_POLICY_STALE', 'The PR base moved after policy acquisition. Reload policy from the current base.', 'apply');
      const supported = plan.source.kind === 'github-api' || plan.source.kind === 'git' && plan.source.comparison === 'three-dot' && plan.source.baseTip !== undefined;
      if (!supported || plan.source.comparisonId !== expected.comparisonId || plan.source.head !== expected.head || (plan.source.kind === 'git' ? plan.source.baseTip : plan.source.base) !== expected.base) fail('E_PLAN_STALE', 'The analyzed head, base, API host or target no longer matches the current pull request. Reanalyze before applying.', 'apply');
    };
    await assertCurrent();
    const document = explainPolicy(policy).document;
    const heldLabels: string[] = [];
    for (const entry of plan.held) {
      const labels = document.rules?.[entry.rule]?.effects?.labels;
      if (labels) heldLabels.push(...('group' in labels ? document.labelGroups![labels.group]! : labels.add));
    }
    const wanted = assignmentIntent(plan, heldLabels);
    const definitions = definitionIntent(selectedDefinitions(document, options.rules));
    const currentDefinitions = wanted.size || definitions.size && mode !== 'none' ? await readDefinitions(client, target.repository) : new Map();
    const assignments = wanted.size ? await readAssignments(client, target.repository, target.pullRequest) : new Map();
    // Known archived assignments must be repaired explicitly, not unarchived by ensure.
    for (const [key, entry] of wanted) if (entry.wanted && currentDefinitions.get(key)?.archived && mode !== 'sync') fail('E_LABEL_UNAVAILABLE', `Label ${entry.name} is archived. Use explicit definition sync to restore its assignable state.`, 'apply');
    const comments: Record<string, CommentDefinition> = Object.create(null);
    for (const [rule, definition] of Object.entries(document.rules ?? {})) if (Object.hasOwn(plan.rules, rule) && definition.effects?.comment) comments[rule] = definition.effects.comment;
    const author = options.commentAuthor ?? { login: 'github-actions[bot]' };
    const previous = Object.keys(comments).length ? await readOwnedComments(client, plan, author) : [];
    const prepared = prepareComments(plan, comments, previous, options.occasionId);
    const session = new EffectSession(assertCurrent), diagnostics: Diagnostic[] = [];
    try {
      if (mode !== 'none' && definitions.size) await reconcileDefinitions(client, target.repository, definitions, currentDefinitions, mode, session);
      if (wanted.size) await reconcileAssignments(client, plan, wanted, assignments, currentDefinitions, session);
      await reconcileComments(client, plan, author, prepared, session);
      await assertCurrent();
    } catch (error) { diagnostics.push(diagnosticOf(error, 'apply')); }
    return deepFreeze({ kind: 'diffdevil.github-apply', schemaVersion: '1.0', status: diagnostics.length ? 'incomplete' : 'verified',
      changed: session.observations.filter(observation => observation.outcome === 'changed').length,
      report: evaluated.report, plan, observations: session.observations, diagnostics });
  });
}

/** A transported report is compared with fresh facts and selected policy, not promoted to authority. */
export function assertReportMatchesPolicy(policy: CompiledPolicy, supplied: Report, fresh: PolicyResult, options: PolicyEvaluateOptions = {}): void {
  if (supplied.policyId !== undefined && supplied.policyId !== fresh.policyId) fail('E_POLICY_STALE', 'Saved report used a different policy or parameter binding. Analyze with the selected trusted policy.', 'apply');
  const expected = unwrap(evaluatePolicy(policy, supplied, options)).report;
  if (canonicalJson(expected) !== canonicalJson(fresh.report)) fail('E_REPORT_STALE', 'Saved report differs from fresh source evidence. Reanalyze before application.', 'apply');
}
