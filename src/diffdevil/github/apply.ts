import { captureAsync, diagnosticOf, fail, unwrap } from '../errors.js';
import { canonicalJson, deepFreeze } from '../inert.js';
import { DEFAULT_LIMITS, enforceBytes } from '../limits.js';
import type { Diagnostic, EffectPlan, PlanTarget, Report, Result } from '../model.js';
import { readReport } from '../report.js';
import { explainPolicy, type CompiledPolicy } from '../policy/compile.js';
import { evaluatePolicy, type PolicyEvaluateOptions, type PolicyResult } from '../policy/evaluate.js';
import { createPlan, readPlan, selectedDefinitions } from '../policy/plan.js';
import type { CommentDefinition } from '../policy/types.js';
import { GitHubClient } from './client.js';
import { analyzeGitHub, analyzeGitHubGit, githubSourceIdentity, readPullSnapshot } from './source.js';
import { assignmentIntent, definitionIntent, readAssignments, readDefinitions, reconcileAssignments, reconcileDefinitions } from './labels.js';
import { hostContext, prepareComments, readOwnedComments, reconcileComments, type CommentAuthor, type HostLifecycles } from './comments.js';
import { EffectSession, type EffectObservation, type PendingWrite } from './observation.js';

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
  /**
   * Hosts with durable execution ownership assert it immediately before every provider write. The pending write's kind
   * and subject let a host assert a write-specific condition, such as the permission a composed comment body relies on.
   */
  readonly beforeWrite?: (write: PendingWrite) => Promise<void>;
  /**
   * Host-composed bodies for named comment rules, rendered from the freshly evaluated report and plan instead of the
   * rule's template. Each rule keeps a stable host lifecycle identity, so its owned comment survives policy changes.
   * The lifecycle mode, trigger, freshness and ownership checks are unchanged; composition never runs as policy.
   */
  readonly composeComments?: Readonly<Record<string, HostComposedComment>>;
}
export interface HostComposedComment {
  readonly lifecycle: string;
  /**
   * Compose the body from the fresh report and plan. `previous.context` is the context the latest owned comment of this
   * rule recorded. Returning `{ body, context }` records a bounded identifier context with the new publication.
   */
  readonly compose: (input: { readonly report: Report; readonly plan: EffectPlan; readonly previous: { readonly found: boolean; readonly context?: string } }) => string | { readonly body: string; readonly context?: string };
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
    if (options.composeComments && options.inputPlan) fail('E_CONFIG_CONFLICT', 'A saved plan cannot be combined with host-composed comments.', 'config');
    const desired = unwrap(createPlan(evaluated, target, { definitions: mode === 'verify' ? 'none' : mode, ...(options.rules === undefined ? {} : { rules: options.rules }) }));
    const author = options.commentAuthor ?? { login: 'github-actions[bot]' };
    const hosts: HostLifecycles = Object.fromEntries(Object.entries(options.composeComments ?? {}).map(([rule, value]) => [rule, value.lifecycle]));
    // Host composition may depend on what the previous owned publication recorded, so its owned comments are read first.
    const hostPrevious = options.composeComments ? await readOwnedComments(client, desired, author, hosts) : undefined;
    const { plan, contexts } = composeHostComments(desired, evaluated.report, explainPolicy(policy).document, options.composeComments, hostPrevious);
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
    const previous = hostPrevious ?? (Object.keys(comments).length ? await readOwnedComments(client, plan, author, hosts) : []);
    const prepared = prepareComments(plan, comments, previous, options.occasionId, hosts, contexts);
    const session = new EffectSession(async write => {
      await assertCurrent();
      await options.beforeWrite?.(write);
    }), diagnostics: Diagnostic[] = [];
    try {
      if (mode !== 'none' && definitions.size) await reconcileDefinitions(client, target.repository, definitions, currentDefinitions, mode, session);
      if (wanted.size) await reconcileAssignments(client, plan, wanted, assignments, currentDefinitions, session);
      await reconcileComments(client, plan, author, prepared, session, hosts);
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

/** Replace selected rules' rendered template bodies with host-composed bodies; everything else in the plan is unchanged. */
function composeHostComments(plan: EffectPlan, report: Report, document: ReturnType<typeof explainPolicy>['document'], composers?: Readonly<Record<string, HostComposedComment>>,
  previous: readonly { readonly state: { readonly rule: string; readonly sequence: number; readonly context?: string } }[] = []): { plan: EffectPlan; contexts: Record<string, string> } {
  const contexts: Record<string, string> = Object.create(null);
  if (!composers) return { plan, contexts };
  for (const [rule, composer] of Object.entries(composers)) {
    if (!document.rules?.[rule]?.effects?.comment) fail('E_CONFIG', `Host-composed comment rule ${rule} must declare a comment effect.`, 'config');
    if (typeof composer?.compose !== 'function' || typeof composer.lifecycle !== 'string' || !/^[A-Za-z0-9._:/-]{1,100}$/u.test(composer.lifecycle)) fail('E_CONFIG', `Host-composed comment rule ${rule} needs a compose function and a stable lifecycle identity.`, 'config');
  }
  const operations = plan.operations.map(operation => {
    if (operation.kind !== 'comment.reconcile' || !Object.hasOwn(composers, operation.rule)) return operation;
    const latest = previous.filter(comment => comment.state.rule === operation.rule).sort((a, b) => b.state.sequence - a.state.sequence)[0];
    const composed = composers[operation.rule]!.compose({ report, plan, previous: latest ? { found: true, ...(latest.state.context === undefined ? {} : { context: latest.state.context }) } : { found: false } });
    const body = typeof composed === 'string' ? composed : composed?.body;
    if (typeof body !== 'string' || !body.trim()) fail('E_TEMPLATE_OWNERSHIP', `Host-composed comment ${operation.rule} did not produce a body.`, 'plan');
    enforceBytes(body, DEFAULT_LIMITS.stringBytes, 'Host-composed comment', 'format');
    const context = typeof composed === 'string' ? undefined : hostContext(composed.context);
    if (context !== undefined) contexts[operation.rule] = context;
    return { ...operation, body };
  });
  return { plan: deepFreeze({ ...plan, operations }), contexts };
}
