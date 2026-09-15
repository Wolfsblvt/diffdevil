import { capture, fail } from '../errors.js';
import type { EffectPlan, Result } from '../model.js';
import type { Rendered } from '../format.js';

/** Human output explains desired effects without claiming they were applied. */
export function formatPlan(plan: EffectPlan, format = 'json'): Result<Rendered> {
  return capture(() => {
    if (format === 'json') return { stdout: JSON.stringify(plan, null, 2) + '\n', exitCode: 0 };
    if (!['human', 'markdown', 'agent'].includes(format)) fail('E_FORMAT', 'Plans support JSON, human, Markdown or agent output.', 'format');
    const lines = [format === 'markdown' ? '# diffdevil effect plan' : 'diffdevil effect plan', '',
      `Stage: ${plan.stage}`, `Target: ${plan.target.repository}#${plan.target.pullRequest}`, `Report: ${plan.reportId}`, `Policy: ${plan.policyId}`, ''];
    for (const op of plan.operations) {
      const subject = op.kind === 'label.select' ? `${op.group}: ${JSON.stringify(op.selected)} (managed members: ${op.members.map(x=>JSON.stringify(x)).join(', ')})`
        : op.kind === 'comment.reconcile' ? `${op.rule}: ${op.mode}, trigger ${op.trigger}` : JSON.stringify(op.name);
      lines.push(`${op.kind}: ${subject}`);
    }
    for (const held of plan.held) lines.push(`Held rule ${JSON.stringify(held.rule)}: ${held.reasons.map(r=>r.code).join(', ')}`);
    if (!plan.operations.length) lines.push('No desired operations.');
    lines.push('', 'No provider effects were applied.');
    return { stdout: lines.join('\n')+'\n', exitCode: 0 };
  });
}
