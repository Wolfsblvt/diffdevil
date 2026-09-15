import { resolve } from 'node:path';
import { fail, unwrap } from '../errors.js';
import { readReport } from '../report.js';
import { explainPolicy } from '../policy/compile.js';
import { readPlan } from '../policy/plan.js';
import { applyGitHubPolicy } from '../github/apply.js';
import { syncGitHubLabels } from '../github/labels.js';
import { readUtf8 } from '../hosts/io.js';
import { loadHostedGitHubPolicy } from '../hosts/github-policy.js';
import { formatEffects, planDefinitionMode } from '../hosts/effects.js';
import { pathOverrides, presetSelection, readParameters } from './policy.js';
/** Explicit writer commands use the same trusted loader and provider adapter as Actions. */
export async function runEffectCommand(invocation, cwd, client) {
    const v = invocation.values;
    const inputPlan = v.plan ? unwrap(readPlan(await readUtf8(resolve(cwd, String(v.plan))))) : undefined;
    const inputReport = v.report ? unwrap(readReport(await readUtf8(resolve(cwd, String(v.report))))) : undefined;
    const repository = String(v.repo ?? inputPlan?.target.repository ?? '');
    const pullRequest = v.pr === undefined ? inputPlan?.target.pullRequest : Number(v.pr);
    if (inputPlan && (repository !== inputPlan.target.repository || pullRequest !== inputPlan.target.pullRequest))
        fail('E_PLAN_TARGET', 'Explicit target contradicts the saved plan.', 'plan');
    const presets = presetSelection(v.preset);
    const selection = {
        ...(v.config === undefined ? {} : { config: String(v.config) }),
        ...(v['policy-source'] === undefined ? {} : { source: String(v['policy-source']) }),
        ...(v['policy-ref'] === undefined ? {} : { ref: String(v['policy-ref']) }),
        ...(v['policy-repository'] === undefined ? {} : { repository: String(v['policy-repository']) }),
        ...(presets === undefined ? {} : { presets }), paths: pathOverrides(v),
    };
    const hosted = await loadHostedGitHubPolicy(client, { repository, ...(pullRequest === undefined ? {} : { pullRequest }) }, selection, cwd);
    if (invocation.command.startsWith('labels ')) {
        const verify = invocation.command === 'labels verify';
        const mode = verify ? 'verify' : String(v.definitions ?? 'sync');
        const result = unwrap(await syncGitHubLabels(client, repository, explainPolicy(hosted.policy).document.labelDefinitions ?? {}, mode, hosted.assertCurrent === undefined ? {} : { assertCurrent: hosted.assertCurrent }));
        return formatEffects(result, String(v.format ?? 'human'), verify);
    }
    if (pullRequest === undefined)
        fail('E_PLAN_TARGET', 'Application requires a pull-request target.', 'plan');
    const parameters = await readParameters(hosted.policy, v, cwd);
    const options = {
        parameters,
        definitions: String(v.definitions ?? planDefinitionMode(inputPlan) ?? 'ensure'),
        ...(inputPlan === undefined ? {} : { inputPlan }),
        ...(inputReport === undefined ? {} : { inputReport, trustReport: v['trust-report'] === true }),
        ...(v.rule === undefined ? {} : { rules: [String(v.rule)] }),
        ...(v.git ? { localGit: { cwd } } : {}),
        ...(v.occasion === undefined ? {} : { occasionId: String(v.occasion) }),
        ...(v['comment-author'] === undefined ? {} : { commentAuthor: { login: String(v['comment-author']), ...(v['comment-author-id'] === undefined ? {} : { id: Number(v['comment-author-id']) }) } }),
        ...(hosted.expectedPolicyBase === undefined ? {} : { expectedPolicyBase: hosted.expectedPolicyBase }),
    };
    return formatEffects(unwrap(await applyGitHubPolicy(client, { repository, pullRequest }, hosted.policy, options)), String(v.format ?? 'human'));
}
//# sourceMappingURL=effects.js.map