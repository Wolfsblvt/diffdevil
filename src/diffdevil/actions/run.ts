import { resolve } from 'node:path';
import { captureAsync, fail, unwrap } from '../errors.js';
import { GitHubClient } from '../github/client.js';
import { analyzeGitHub, analyzeGitHubGit } from '../github/source.js';
import { applyGitHubPolicy, assertReportMatchesPolicy } from '../github/apply.js';
import { syncGitHubLabels } from '../github/labels.js';
import { readUtf8 } from '../hosts/io.js';
import { planDefinitionMode } from '../hosts/effects.js';
import { readReport } from '../report.js';
import { explainPolicy, type CompiledPolicy } from '../policy/compile.js';
import { evaluatePolicy, evaluatePolicyQuery } from '../policy/evaluate.js';
import { createPlan, readPlan, selectedDefinitions, selectedRuleIds } from '../policy/plan.js';
import type { PlanTarget, Report, Result } from '../model.js';
import { actionContext, choice, positiveInteger, type ActionContext } from './inputs.js';
import { loadActionPolicy } from './policy.js';
import { ActionOutputSession, actionOutputs, outputCommands, type ActionResult } from './outputs.js';
import type { ActionEntryPoint } from './surface.js';
export interface ActionRunOptions {
  readonly environment?: NodeJS.ProcessEnv; readonly cwd?: string;
  /** Tests and embedding hosts may supply a transport; distributed entry points use the real client. */
  readonly client?: GitHubClient;
}
export interface ActionRunResult extends ActionResult { readonly outputs: Readonly<Record<string, string>> }
function selectedDisplay(policy: CompiledPolicy, report: Report, context: ActionContext): Pick<ActionResult, 'metric' | 'decision' | 'band'> {
  const document = explainPolicy(policy).document;
  const ids = selectedRuleIds(document, context.inputs.rule === undefined ? undefined : [context.inputs.rule]);
  const single = ids.length === 1 ? report.rules?.[ids[0]!] : undefined;
  const bandId = ids.length === 1 ? document.rules?.[ids[0]!]?.band : undefined;
  const expression = bandId === undefined ? document.metrics?.inline ? 'metrics.inline' : document.metrics?.review ? 'metrics.review' : 'totals.lines.changed' : document.bands![bandId]!.value;
  const outputSelection = (context.inputs.config !== undefined || context.inputs.policy !== undefined) && ['metric', 'formula', 'scope', 'path'].some(name => context.inputs[name] !== undefined);
  const selector = !outputSelection ? expression : context.inputs.formula ?? { kind: 'query' as const, metric: context.inputs.metric ?? 'changed',
    ...(context.inputs.scope === undefined ? {} : { scope: context.inputs.scope }),
    ...(context.inputs.path === undefined ? {} : { paths: context.inputs.path.split(/\r?\n/u).map(line => line.trim()).filter(Boolean) }) };
  const value = unwrap(evaluatePolicyQuery(policy, report, selector, { parameters: context.parameters })).result.value;
  if (value.kind !== 'number') fail('E_INTERNAL', 'Selected Action metric must be numeric.', 'evaluate');
  return { metric: value.measurement, ...(single?.decision === undefined ? {} : { decision: single.decision }), ...(single?.band === undefined ? {} : { band: single.band }) };
}
/** All four distributed entry points enter here; no CLI parsing or separate Action semantics. */
export function runAction(entryPoint: ActionEntryPoint, options: ActionRunOptions = {}): Promise<Result<ActionRunResult>> {
  return captureAsync(async () => {
    const environment = options.environment ?? process.env;
    const context = await actionContext(entryPoint, environment, options.cwd);
    const { inputs, mode } = context;
    const client = options.client ?? new GitHubClient({ ...(inputs['github-token'] === undefined ? {} : { token: inputs['github-token'] }), ...(environment.GITHUB_API_URL === undefined ? {} : { apiUrl: environment.GITHUB_API_URL }) });
    const artifacts = await ActionOutputSession.open(context, environment);
    try {
      const hosted = await loadActionPolicy(context, client), policy = hosted.policy;
      const rules = inputs.rule === undefined ? undefined : [inputs.rule];
      selectedRuleIds(explainPolicy(policy).document, rules);
      let result: ActionResult;
      if (entryPoint === 'sync-labels') {
        const definitions = selectedDefinitions(explainPolicy(policy).document, rules);
        const selectedMode = mode === 'verify' ? 'verify' : choice(inputs.definitions, ['ensure', 'sync'], 'sync', 'definitions');
        const effects = unwrap(await syncGitHubLabels(client, context.repository, definitions, selectedMode, hosted.assertCurrent === undefined ? {} : { assertCurrent: hosted.assertCurrent }));
        result = { effects, exitCode: effects.status === 'verified' ? 0 : mode === 'verify' && effects.diagnostics.every(diagnostic => diagnostic.code === 'E_LABEL_DEFINITIONS') ? 1 : 2 };
      } else {
        const target: PlanTarget = { repository: context.repository, pullRequest: context.pullRequest! };
        const suppliedReport = inputs['input-report'] === undefined ? undefined : unwrap(readReport(await readUtf8(resolve(context.cwd, inputs['input-report']))));
        const suppliedPlan = inputs['input-plan'] === undefined ? undefined : unwrap(readPlan(await readUtf8(resolve(context.cwd, inputs['input-plan']))));
        const measured = unwrap(await (context.source === 'git'
          ? analyzeGitHubGit(client, target, { cwd: resolve(context.cwd, inputs['git-cwd'] ?? '.') })
          : analyzeGitHub(client, target)));
        const evaluated = unwrap(evaluatePolicy(policy, measured, { parameters: context.parameters }));
        if (suppliedReport) assertReportMatchesPolicy(policy, suppliedReport, evaluated, { parameters: context.parameters });
        const display = selectedDisplay(policy, evaluated.report, context);
        const definitionMode = choice(inputs.definitions, ['none', 'ensure', 'sync', 'verify'], planDefinitionMode(suppliedPlan) ?? 'ensure', 'definitions');
        const plan = mode === 'analyze' ? undefined : unwrap(createPlan(evaluated, target, { definitions: definitionMode === 'verify' ? 'none' : definitionMode, ...(rules === undefined ? {} : { rules }) }));
        result = { report: evaluated.report, ...(plan === undefined ? {} : { plan }), ...display, exitCode: 0 };
        // Prove the bounded Action transport before mutations. Full files retain complete evidence.
        outputCommands(actionOutputs(entryPoint, result, artifacts.paths));
        if (mode === 'apply') {
          const occasionId = inputs['occasion-id'] ?? (environment.GITHUB_RUN_ID && environment.GITHUB_ACTION ? `${environment.GITHUB_RUN_ID}:${environment.GITHUB_ACTION}` : undefined);
          const effects = unwrap(await applyGitHubPolicy(client, target, policy, {
            parameters: context.parameters, definitions: definitionMode,
            // This report was acquired in this invocation, not authenticated by its filename/hash.
            inputReport: measured, trustReport: true, inputPlan: suppliedPlan ?? plan!,
            ...(hosted.expectedPolicyBase === undefined ? {} : { expectedPolicyBase: hosted.expectedPolicyBase }),
            ...(rules === undefined ? {} : { rules }), ...(occasionId === undefined ? {} : { occasionId }),
            ...(inputs['comment-author'] === undefined ? {} : { commentAuthor: { login: inputs['comment-author'], ...(inputs['comment-author-id'] === undefined ? {} : { id: positiveInteger(inputs['comment-author-id'], 'comment-author-id') }) } }),
          }));
          result = { report: effects.report, plan: effects.plan, effects, ...display, exitCode: effects.status === 'verified' ? 0 : 2 };
        }
      }
      const outputs = await artifacts.publish(entryPoint, result);
      return { ...result, outputs };
    } finally { await artifacts.close(); }
  });
}
