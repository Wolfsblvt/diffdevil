import { capture, fail } from '../errors.js';
import type { EffectOperation, EffectPlan, Result } from '../model.js';
import type { Rendered } from '../format.js';
import {
  agentRule,
  agentSemantics,
  agentSource,
  humanIdentifier,
  humanRule,
  padLabel,
  paintBrand,
  paintQuiet,
  paintStrong,
  reasonCodes,
  type TextPresentationOptions,
} from '../presentation.js';

function planTarget(plan: EffectPlan): string { return `${plan.target.repository}#${plan.target.pullRequest}`; }

function operationSubject(operation: EffectOperation): string {
  switch(operation.kind){
    case 'label.ensure':
    case 'label.sync': return `${JSON.stringify(operation.name)} · #${operation.definition.color} · ${JSON.stringify(operation.definition.description)}`;
    case 'label.add':
    case 'label.remove': return `${JSON.stringify(operation.name)} · rule ${JSON.stringify(operation.rule)}`;
    case 'label.select': return `${JSON.stringify(operation.selected)} · managed group ${JSON.stringify(operation.group)} · rule ${JSON.stringify(operation.rule)} · members ${JSON.stringify(operation.members)}`;
    case 'comment.reconcile': return `${JSON.stringify(operation.rule)} · ${operation.mode} · ${operation.trigger}${operation.occasionId===undefined?'':` · occasion ${JSON.stringify(operation.occasionId)}`} · body ${JSON.stringify(operation.body)}`;
  }
}

function agentOperation(operation: EffectOperation): string {
  switch(operation.kind){
    case 'label.ensure':
    case 'label.sync': return `kind=${operation.kind} name=${JSON.stringify(operation.name)} color=${JSON.stringify(operation.definition.color)} description=${JSON.stringify(operation.definition.description)}${operation.rule===undefined?'':` rule=${JSON.stringify(operation.rule)}`}`;
    case 'label.add':
    case 'label.remove': return `kind=${operation.kind} rule=${JSON.stringify(operation.rule)} name=${JSON.stringify(operation.name)}`;
    case 'label.select': return `kind=${operation.kind} rule=${JSON.stringify(operation.rule)} group=${JSON.stringify(operation.group)} selected=${JSON.stringify(operation.selected)} members=${JSON.stringify(operation.members)}`;
    case 'comment.reconcile': return `kind=${operation.kind} rule=${JSON.stringify(operation.rule)} mode=${operation.mode} trigger=${operation.trigger} body=${JSON.stringify(operation.body)}${operation.occasionId===undefined?'':` occasion=${JSON.stringify(operation.occasionId)}`}`;
  }
}

function markdownCode(value: string): string {
  const longest=Math.max(0,...(value.match(/`+/gu)??[]).map(run=>run.length));
  const fence='`'.repeat(longest+1);
  return `${fence}${longest?` ${value} `:value}${fence}`;
}

function planMarkdown(plan: EffectPlan): string {
  const lines=['# diffdevil effect plan','',`- Stage: ${markdownCode(plan.stage)}`,`- Target: ${markdownCode(planTarget(plan))}`,`- Report: ${markdownCode(plan.reportId)}`,`- Policy: ${markdownCode(plan.policyId)}`,'','## Proposed effects',''];
  if(!plan.operations.length) lines.push('No desired operations.');
  else for(const operation of plan.operations) lines.push(`- ${markdownCode(operation.kind)}: ${markdownCode(operationSubject(operation))}`);
  if(plan.held.length){
    lines.push('','## Held rules','');
    for(const held of plan.held) lines.push(`- ${markdownCode(held.rule)}: ${reasonCodes(held.reasons).join(', ')}`);
  }
  lines.push('','> No provider effects were applied.');
  return lines.join('\n')+'\n';
}

function planHumanDetails(plan: EffectPlan, color: boolean): string[] {
  const lines=['',paintStrong('Details',color),
    `  ${padLabel('Schema')}${plan.schemaVersion}`,
    `  ${padLabel('Report')}${JSON.stringify(plan.reportId)}`,
    `  ${padLabel('Policy')}${JSON.stringify(plan.policyId)}`,
    `  ${padLabel('Source id')}${JSON.stringify(plan.source.comparisonId)}`,
    `  ${padLabel('Semantics')}${plan.semantics.replacementLines} · ${plan.semantics.language} · ${plan.semantics.numbers} · ${plan.semantics.paths}`,
  ];
  if(plan.preconditions){
    const values=Object.entries(plan.preconditions).map(([name,value])=>`${humanIdentifier(name)} ${JSON.stringify(value)}`);
    if(values.length) lines.push(`  ${padLabel('Requires')}${values.join(' · ')}`);
  }
  if(plan.operations.length){
    lines.push('',paintStrong('Operations',color));
    for(const operation of plan.operations) lines.push(`  ${padLabel(operation.kind)}${operationSubject(operation)}`);
  }
  if(Object.keys(plan.rules).length){
    lines.push('',paintStrong('Rules',color));
    for(const [name,value] of Object.entries(plan.rules)) lines.push(`  ${humanIdentifier(name)} · ${humanRule(value)}`);
  }
  return lines;
}

function planHuman(plan: EffectPlan, options: TextPresentationOptions): string {
  const color=options.color===true, full=options.detail==='full';
  const lines=[
    `${paintBrand('diffdevil',color)} ${paintStrong('effect plan',color)}`,
    paintQuiet(`${planTarget(plan)} · ${plan.stage} · nothing applied`,color),
    '',
  ];
  for(const operation of plan.operations) if(operation.kind==='label.select'){
    lines.push(`${padLabel('Select')}${paintStrong(operation.selected,color)}`);
    lines.push(`  managed group ${humanIdentifier(operation.group)} · rule ${humanIdentifier(operation.rule)}`);
  }
  for(const operation of plan.operations) if(operation.kind==='label.add') lines.push(`${padLabel('Add')}${paintStrong(operation.name,color)} · rule ${humanIdentifier(operation.rule)}`);
  for(const operation of plan.operations) if(operation.kind==='label.remove') lines.push(`${padLabel('Remove')}${paintStrong(operation.name,color)} · rule ${humanIdentifier(operation.rule)}`);
  for(const operation of plan.operations) if(operation.kind==='comment.reconcile') lines.push(`${padLabel('Comment')}${humanIdentifier(operation.rule)} · ${operation.mode} · ${operation.trigger}`);
  const ensure=plan.operations.filter(operation=>operation.kind==='label.ensure').length;
  const sync=plan.operations.filter(operation=>operation.kind==='label.sync').length;
  if(ensure) lines.push(`${padLabel('Ensure')}${ensure} label definition${ensure===1?'':'s'}`);
  if(sync) lines.push(`${padLabel('Sync')}${sync} label definition${sync===1?'':'s'}`);
  if(!plan.operations.length) lines.push(`${padLabel('Proposed')}no desired operations`);
  if(plan.held.length) lines.push(`${padLabel('Held')}${plan.held.map(held=>`${humanIdentifier(held.rule)} (${reasonCodes(held.reasons).join(', ')})`).join(' · ')}`);
  lines.push(paintQuiet(`${padLabel('Readback')}not observed`,color));
  if(full) lines.push(...planHumanDetails(plan,color));
  return lines.join('\n')+'\n';
}

function planAgent(plan: EffectPlan): string {
  const lines=[
    `diffdevil.agent-plan/1 schema=${plan.schemaVersion} stage=${plan.stage} applied=false`,
    `semantics ${agentSemantics(plan.semantics)}`,
    `source ${agentSource(plan.source)}`,
    `target repository=${JSON.stringify(plan.target.repository)} pull_request=${plan.target.pullRequest}`,
    `identity report=${JSON.stringify(plan.reportId)} policy=${JSON.stringify(plan.policyId)}`,
  ];
  if(plan.preconditions){
    const values=Object.entries(plan.preconditions).map(([name,value])=>`${name}=${JSON.stringify(value)}`);
    if(values.length) lines.push(`preconditions ${values.join(' ')}`);
  }
  for(const [name,value] of Object.entries(plan.rules)) lines.push(`rule ${agentRule(name,value)}`);
  for(const operation of plan.operations) lines.push(`effect ${agentOperation(operation)}`);
  if(plan.held.length) for(const held of plan.held) lines.push(`held rule=${JSON.stringify(held.rule)} reasons=${JSON.stringify(held.reasons)}`);
  else lines.push('held count=0');
  lines.push('readback observed=false');
  return lines.join('\n')+'\n';
}

/** Human output explains desired effects without claiming they were applied. */
export function formatPlan(plan: EffectPlan, format = 'json', options: TextPresentationOptions = {}): Result<Rendered> {
  return formatPlanWithOptions(plan,format,options);
}

/** Format one desired plan through a presentation-specific projection. */
export function formatPlanWithOptions(plan: EffectPlan, format = 'json', options: TextPresentationOptions = {}): Result<Rendered> {
  return capture(() => {
    if (format === 'json') return { stdout: JSON.stringify(plan, null, 2) + '\n', exitCode: 0 };
    if (format === 'human') return { stdout: planHuman(plan,options), exitCode: 0 };
    if (format === 'agent') return { stdout: planAgent(plan), exitCode: 0 };
    if (format === 'markdown') return { stdout: planMarkdown(plan), exitCode: 0 };
    return fail('E_FORMAT', 'Plans support JSON, human, Markdown or agent output.', 'format');
  });
}
