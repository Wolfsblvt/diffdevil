import { fail, unwrap } from '../errors.js';
import { GitHubClient } from '../github/client.js';
import { loadHostedGitHubPolicy, type HostedPolicy, type HostedPolicySelection } from '../hosts/github-policy.js';
import { compileActionShortcut } from '../policy/action-shortcut.js';
import type { PathOverrides } from '../policy/types.js';
import { choice, type ActionContext } from './inputs.js';
import { SHORTCUT_INPUTS } from './surface.js';
/** Host selection only. Inline shortcuts and authored policies retain the same compiler. */
export async function loadActionPolicy(context: ActionContext, client: GitHubClient): Promise<HostedPolicy> {
  const { inputs, mode } = context;
  const presets = inputs.preset === undefined ? undefined : choice(inputs.preset, ['size@1', 'none'], 'size@1', 'preset') === 'none' ? [] : ['size@1'] as const;
  const full = inputs.config !== undefined || inputs.policy !== undefined;
  const shorthand = Object.fromEntries(SHORTCUT_INPUTS.filter(name => inputs[name] !== undefined).map(name => [name, inputs[name]!]));
  const generatedRule = ['threshold', 'comparison', 'files', 'label', 'remove-label-when-false', 'comment-template', 'comment-mode', 'condition'];
  if (full && generatedRule.some(name => inputs[name] !== undefined)) fail('E_CONFIG_CONFLICT', 'A full policy cannot be combined with generated rule/effect shorthand. Declare the rule in policy; metric/formula, scope and path may select read-only output.', 'config');
  const paths: Record<string, unknown> = {};
  for (const [flag, field] of [['exclude', 'exclude'], ['include-only', 'includeOnly'], ['force-include', 'forceInclude']] as const) {
    if (inputs[flag] !== undefined) paths[field] = inputs[flag]!.split(/\r?\n/u).map(line => line.trim()).filter(Boolean);
    if (inputs[`${flag}-mode`] !== undefined) paths[`${field}Mode`] = choice(inputs[`${flag}-mode`], ['append', 'replace'], 'append', `${flag}-mode`);
  }
  if (!full && Object.keys(shorthand).length) {
    if (['policy-source', 'policy-ref', 'policy-repository'].some(name => inputs[name] !== undefined)) fail('E_CONFIG_CONFLICT', 'Policy source selectors require config or policy.', 'config');
    return { policy: unwrap(compileActionShortcut(shorthand, { entryPoint: mode === 'analyze' ? 'analyze' : 'root', ...(presets === undefined ? {} : { presets }) })) };
  }
  const selection: HostedPolicySelection = {
    workspaceRoot: context.cwd,
    ...(inputs.config === undefined ? {} : { config: inputs.config }),
    ...(inputs.policy === undefined ? {} : { inline: inputs.policy }),
    ...(inputs['policy-source'] === undefined ? {} : { source: choice(inputs['policy-source'], ['base', 'pinned', 'workspace'], 'base', 'policy-source') }),
    ...(inputs['policy-ref'] === undefined ? {} : { ref: inputs['policy-ref'] }),
    ...(inputs['policy-repository'] === undefined ? {} : { repository: inputs['policy-repository'] }),
    ...(presets === undefined ? {} : { presets }), paths: paths as PathOverrides,
  };
  return loadHostedGitHubPolicy(client, { repository: context.repository, ...(context.pullRequest === undefined ? {} : { pullRequest: context.pullRequest }) }, selection, context.cwd);
}
