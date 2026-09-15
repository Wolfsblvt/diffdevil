import { fail } from '../errors.js';
import type { Rendered } from '../format.js';
import type { GitHubApplyResult } from '../github/apply.js';
import type { DefinitionResult } from '../github/labels.js';
import type { EffectPlan } from '../model.js';

/** The saved plan controls no authority. This only recovers its desired definition mode. */
export function planDefinitionMode(plan: EffectPlan | undefined): 'none' | 'ensure' | 'sync' | undefined {
  if (!plan) return undefined;
  const ensure = plan.operations.some(op => op.kind === 'label.ensure');
  const sync = plan.operations.some(op => op.kind === 'label.sync');
  if (ensure && sync) fail('E_PLAN_INVALID', 'A saved plan mixes definition modes. Re-plan with one mode.', 'plan');
  return sync ? 'sync' : ensure ? 'ensure' : 'none';
}

/** Render observations, never promote acknowledged requests into verified effects. */
export function formatEffects(result: GitHubApplyResult | DefinitionResult, format = 'human', verifyOnly = false): Rendered {
  const exitCode = result.status === 'verified' ? 0 : verifyOnly && result.diagnostics.every(d => d.code === 'E_LABEL_DEFINITIONS') ? 1 : 2;
  if (format === 'json') return { stdout: JSON.stringify(result, null, 2) + '\n', exitCode };
  if (!['human','markdown','agent'].includes(format)) fail('E_FORMAT', 'Provider results support human, JSON, Markdown or agent output.', 'format');
  const lines = [format === 'markdown' ? '# diffdevil provider result' : 'diffdevil provider result', '',
    `Status: ${result.status}`, `Verified changed operations: ${result.changed}`];
  for (const observation of result.observations) lines.push(`${observation.kind} ${JSON.stringify(observation.subject)}: ${observation.outcome}; readback ${observation.readback}`);
  if ('plan' in result) for (const entry of result.plan.held) lines.push(`Held rule ${JSON.stringify(entry.rule)}: ${entry.reasons.map(r => r.code).join(', ')}`);
  for (const diagnostic of result.diagnostics) lines.push(`${diagnostic.code}: ${JSON.stringify(diagnostic.message)}`);
  return { stdout: lines.join('\n') + '\n', exitCode };
}
