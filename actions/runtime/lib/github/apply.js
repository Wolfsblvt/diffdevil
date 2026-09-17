import { captureAsync, diagnosticOf, fail, unwrap } from '../errors.js';
import { canonicalJson, deepFreeze } from '../inert.js';
import { readReport } from '../report.js';
import { explainPolicy } from '../policy/compile.js';
import { evaluatePolicy } from '../policy/evaluate.js';
import { createPlan, readPlan, selectedDefinitions } from '../policy/plan.js';
import { GitHubClient } from './client.js';
import { analyzeGitHub, analyzeGitHubGit, githubSourceIdentity, readPullSnapshot } from './source.js';
import { assignmentIntent, definitionIntent, readAssignments, readDefinitions, reconcileAssignments, reconcileDefinitions } from './labels.js';
import { prepareComments, readOwnedComments, reconcileComments } from './comments.js';
import { EffectSession } from './observation.js';
/** Evaluate selected trusted policy, then explicitly reconcile its bounded GitHub effects. */
export function applyGitHubPolicy(client, target, policy, options = {}) {
    return captureAsync(async () => {
        const mode = options.definitions ?? 'ensure';
        if (!['none', 'ensure', 'sync', 'verify'].includes(mode))
            fail('E_CONFIG', 'Definitions mode must be none, ensure, sync or verify.', 'config');
        if (options.localGit && options.inputReport && options.trustReport)
            fail('E_CONFIG_CONFLICT', 'Select fresh local Git acquisition or a trusted report, not both.', 'config');
        const suppliedReport = options.inputReport === undefined ? undefined : unwrap(readReport(options.inputReport));
        const report = options.localGit ? unwrap(await analyzeGitHubGit(client, target, options.localGit)) : suppliedReport && options.trustReport === true ? suppliedReport : unwrap(await analyzeGitHub(client, target));
        const evaluated = unwrap(evaluatePolicy(policy, report, options));
        if (suppliedReport && options.trustReport !== true)
            assertReportMatchesPolicy(policy, suppliedReport, evaluated, options);
        const plan = unwrap(createPlan(evaluated, target, { definitions: mode === 'verify' ? 'none' : mode, ...(options.rules === undefined ? {} : { rules: options.rules }) }));
        if (options.inputPlan) {
            const supplied = unwrap(readPlan(options.inputPlan));
            if (canonicalJson(supplied) !== canonicalJson(plan))
                fail('E_PLAN_STALE', 'Saved plan differs from the selected policy and current report. Re-plan before application.', 'plan');
        }
        const assertCurrent = async () => {
            const current = await readPullSnapshot(client, target);
            if (current.state !== 'open')
                fail('E_PLAN_STALE', 'The target pull request is closed; this plan is not applied.', 'apply');
            const expected = githubSourceIdentity(client, target, current);
            if (options.expectedPolicyBase !== undefined && current.base !== options.expectedPolicyBase)
                fail('E_POLICY_STALE', 'The PR base moved after policy acquisition. Reload policy from the current base.', 'apply');
            const supported = plan.source.kind === 'github-api' || plan.source.kind === 'git' && plan.source.comparison === 'three-dot' && plan.source.baseTip !== undefined;
            if (!supported || plan.source.comparisonId !== expected.comparisonId || plan.source.head !== expected.head || (plan.source.kind === 'git' ? plan.source.baseTip : plan.source.base) !== expected.base)
                fail('E_PLAN_STALE', 'The analyzed head, base, API host or target no longer matches the current pull request. Reanalyze before applying.', 'apply');
        };
        await assertCurrent();
        const document = explainPolicy(policy).document;
        const heldLabels = [];
        for (const entry of plan.held) {
            const labels = document.rules?.[entry.rule]?.effects?.labels;
            if (labels)
                heldLabels.push(...('group' in labels ? document.labelGroups[labels.group] : labels.add));
        }
        const wanted = assignmentIntent(plan, heldLabels);
        const definitions = definitionIntent(selectedDefinitions(document, options.rules));
        const currentDefinitions = wanted.size || definitions.size && mode !== 'none' ? await readDefinitions(client, target.repository) : new Map();
        const assignments = wanted.size ? await readAssignments(client, target.repository, target.pullRequest) : new Map();
        // Known archived assignments must be repaired explicitly, not unarchived by ensure.
        for (const [key, entry] of wanted)
            if (entry.wanted && currentDefinitions.get(key)?.archived && mode !== 'sync')
                fail('E_LABEL_UNAVAILABLE', `Label ${entry.name} is archived. Use explicit definition sync to restore its assignable state.`, 'apply');
        const comments = Object.create(null);
        for (const [rule, definition] of Object.entries(document.rules ?? {}))
            if (Object.hasOwn(plan.rules, rule) && definition.effects?.comment)
                comments[rule] = definition.effects.comment;
        const author = options.commentAuthor ?? { login: 'github-actions[bot]' };
        const previous = Object.keys(comments).length ? await readOwnedComments(client, plan, author) : [];
        const prepared = prepareComments(plan, comments, previous, options.occasionId);
        const session = new EffectSession(async () => {
            await assertCurrent();
            await options.beforeWrite?.();
        }), diagnostics = [];
        try {
            if (mode !== 'none' && definitions.size)
                await reconcileDefinitions(client, target.repository, definitions, currentDefinitions, mode, session);
            if (wanted.size)
                await reconcileAssignments(client, plan, wanted, assignments, currentDefinitions, session);
            await reconcileComments(client, plan, author, prepared, session);
            await assertCurrent();
        }
        catch (error) {
            diagnostics.push(diagnosticOf(error, 'apply'));
        }
        return deepFreeze({ kind: 'diffdevil.github-apply', schemaVersion: '1.0', status: diagnostics.length ? 'incomplete' : 'verified',
            changed: session.observations.filter(observation => observation.outcome === 'changed').length,
            report: evaluated.report, plan, observations: session.observations, diagnostics });
    });
}
/** A transported report is compared with fresh facts and selected policy, not promoted to authority. */
export function assertReportMatchesPolicy(policy, supplied, fresh, options = {}) {
    if (supplied.policyId !== undefined && supplied.policyId !== fresh.policyId)
        fail('E_POLICY_STALE', 'Saved report used a different policy or parameter binding. Analyze with the selected trusted policy.', 'apply');
    const expected = unwrap(evaluatePolicy(policy, supplied, options)).report;
    if (canonicalJson(expected) !== canonicalJson(fresh.report))
        fail('E_REPORT_STALE', 'Saved report differs from fresh source evidence. Reanalyze before application.', 'apply');
}
//# sourceMappingURL=apply.js.map