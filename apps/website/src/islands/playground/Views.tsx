// SPDX-License-Identifier: AGPL-3.0-only
/** Four views of one result: Terminal (real human presenter), Agent · data, GitHub preview (desired plan, never applied), Explanation (key by key). */
import { useMemo, useState } from 'react';
import { copy } from '../../data/copy';
import { docPaths, paths } from '../../data/site';
import { agent, appCheckSummary, display, evaluate, evidenceGlyph, human, json, planHuman, planJson, type Evaluation } from './engine';
import type { Acquired } from './Playground';
import { copyText } from '../../lib/clipboard';
import type { View } from './state';

interface Props { view: View; evaluation: Evaluation; acquired: Acquired }

function Block({ title, meta, text, lang = 'text', footer }: { title: string; meta?: string; text: string; lang?: string; footer?: React.ReactNode }) {
  const id = useMemo(() => `blk-${Math.random().toString(36).slice(2, 8)}`, []);
  return (
    <figure className="machine code pg-block">
      <figcaption className="code-head"><span>{title}</span>{meta && <span>· {meta}</span>}<span className="spacer" /><button type="button" onClick={() => copyText(text)} aria-label={`Copy ${title}`}>Copy</button></figcaption>
      <pre className="code-body" id={id} data-lang={lang}><code>{text}</code></pre>
      {footer && <p className="pg-block-foot">{footer}</p>}
    </figure>
  );
}

const explanationAnchors: Record<string, string> = {
  presets: `${docPaths.presets}#presets`, size: `${docPaths.presets}#size-overrides`, measurement: `${docPaths.versioning}`, defaults: `${docPaths.policies}#defaults`,
  scopes: `${docPaths.policies}#scopes`, metrics: `${docPaths.policies}#metrics`, bands: `${docPaths.policies}#bands`, rules: `${docPaths.policies}#rules`,
  labelGroups: `${docPaths.templates}#label-groups`, labelDefinitions: `${docPaths.policies}#label-definitions`, queries: `${docPaths.policies}#queries`, parameters: `${docPaths.policies}#parameters`,
};

export function Views({ view, evaluation, acquired }: Props) {
  const c = copy.playground;
  const [agentMode, setAgentMode] = useState<'agent' | 'json' | 'plan'>('agent');
  const [commentPreview, setCommentPreview] = useState(false);
  const report = evaluation.report, plan = evaluation.plan;

  if (view === 'terminal') {
    return (
      <div className="stack">
        <Block title="diffdevil analyze" meta={`--config ${acquired.policyName} --format human`} text={human(report)} footer={c.terminalFoot} />
        {plan && <Block title="diffdevil plan" meta={`--config ${acquired.policyName} --format human`} text={planHuman(plan)} />}
      </div>
    );
  }
  if (view === 'agent') {
    return (
      <div className="stack">
        <div className="segmented" role="tablist" aria-label="Data view">
          <button type="button" role="tab" aria-selected={agentMode === 'agent'} onClick={() => setAgentMode('agent')}>--format agent</button>
          <button type="button" role="tab" aria-selected={agentMode === 'json'} onClick={() => setAgentMode('json')}>report.json</button>
          <button type="button" role="tab" aria-selected={agentMode === 'plan'} onClick={() => setAgentMode('plan')}>plan.json</button>
        </div>
        {agentMode === 'agent' && <Block title="diffdevil analyze" meta="--format agent" text={agent(report)} footer={<>{c.agentFoot} <a className="link" href={docPaths.agents}>Agent integration</a></>} />}
        {agentMode === 'json' && <Block title="report.json" meta={`diffdevil.report ${report.schemaVersion}`} text={json(report)} lang="json" />}
        {agentMode === 'plan' && (plan ? <Block title="plan.json" meta={`diffdevil.plan ${plan.schemaVersion} · stage ${plan.stage}`} text={planJson(plan)} lang="json" /> : <p className="caption">No plan: {evaluation.planDiagnostics.map(d => d.message).join(' ')}</p>)}
      </div>
    );
  }
  if (view === 'github') {
    const labels = plan?.operations.filter(op => op.kind === 'label.select' || op.kind === 'label.add') ?? [];
    const removes = plan?.operations.filter(op => op.kind === 'label.remove') ?? [];
    const comments = plan?.operations.filter(op => op.kind === 'comment.reconcile') ?? [];
    const definitions = evaluation.effective.labelDefinitions ?? {};
    const commentPolicy = acquired.example?.commentPolicy;
    const preview = commentPreview && commentPolicy ? evaluate(commentPolicy.text, commentPolicy.name, acquired.report) : undefined;
    const previewComments = preview?.ok ? preview.plan?.operations.filter(op => op.kind === 'comment.reconcile') ?? [] : [];
    return (
      <div className="stack">
        <div className="notice-proposed"><strong>{c.githubNotice}</strong> {c.githubNoticeBody}</div>
        <div className="grid-2">
          <div className="panel stack">
            <p className="label">{c.labelsH}{plan ? ` · target ${plan.target.repository}#${plan.target.pullRequest}` : ''}</p>
            {labels.length === 0 && removes.length === 0 && <p className="caption">No label operation. {plan?.held.length ? `Held: ${plan.held.map(h => `${h.rule} (${h.reasons.map(r => r.code).join(', ')})`).join('; ')}.` : ''}</p>}
            <ul className="pg-labels">
              {labels.map((op, i) => op.kind === 'label.select'
                ? <li key={i}><span className="label-swatch" style={{ background: `#${definitions[op.selected]?.color ?? 'C5DEF5'}` }}>{op.selected}</span> <span className="caption">managed group {op.group}: {op.members.filter(m => m !== op.selected).join(', ')} absent</span></li>
                : op.kind === 'label.add' ? <li key={i}><span className="label-swatch" style={{ background: `#${definitions[op.name]?.color ?? 'C5DEF5'}` }}>{op.name}</span> <span className="caption">rule {op.rule}</span></li> : null)}
              {removes.map((op, i) => op.kind === 'label.remove' ? <li key={`r${i}`}><span className="caption">− {op.name} removed when false · rule {op.rule}</span></li> : null)}
            </ul>
          </div>
          <div className="panel stack">
            <p className="label">{c.checkH}</p>
            <pre className="machine code-body pg-check"><code>{`diffdevil analysis\n${appCheckSummary(report, plan)}`}</code></pre>
            <p className="caption">{c.checkFoot}</p>
          </div>
        </div>
        <div className="panel stack">
          <p className="label">{c.commentH} · {comments.length ? 'on' : c.commentOffNote}{commentPolicy && !comments.length ? <> · <label className="small"><input type="checkbox" checked={commentPreview} onChange={e => setCommentPreview(e.target.checked)} /> {c.commentShownWith.replace('review-comment.yml', commentPolicy.name)}</label></> : null}</p>
          {(comments.length ? comments : previewComments).map((op, i) => op.kind === 'comment.reconcile' ? (
            <div key={i} className="pg-comment">
              <p className="caption">mode {op.mode} · trigger {op.trigger} · marker <code>&lt;!-- diffdevil:rule={op.rule} --&gt;</code></p>
              <pre className="pg-comment-body">{op.body}</pre>
            </div>
          ) : null)}
          {!comments.length && !previewComments.length && <p className="caption">No comment in this policy. Turn one on in Controls, or open Policy and add a rule with <code>effects.comment</code>.</p>}
        </div>
      </div>
    );
  }
  // explain
  const rules = Object.entries(evaluation.result.rules);
  const origins = evaluation.origins;
  const userKeys = Object.keys(evaluation.document).filter(k => k !== 'version');
  return (
    <div className="stack">
      <ul className="pg-lanes">
        {c.explainLanes.map(([glyph, name, meaning]) => <li key={name}><span className="lane" data-lane={name.toLowerCase()}>{glyph} {name}</span><span className="caption">{meaning}</span></li>)}
      </ul>
      <div className="panel stack">
        <p className="label">■ Fact · evidence</p>
        <p className="small">Measurement <span className="chip-ev" data-status={report.measurement.status}>{evidenceGlyph[report.measurement.status]} {report.measurement.status}</span>{report.measurement.reasons.length ? <> — {report.measurement.reasons.map(r => `${r.code}${r.subject ? ` (${r.subject})` : ''}`).join(', ')}</> : null}. File set {report.fileSet.complete ? 'complete' : 'incomplete'}: {display(report.fileSet.total)} observed, {display(report.totals.files.included)} included, {display(report.totals.files.excluded)} excluded.</p>
        {evaluation.result.evidence.length > 0 && <p className="caption">Evaluation notes: {evaluation.result.evidence.map(r => r.code).join(', ')}</p>}
      </div>
      <div className="panel stack">
        <p className="label">§ Rule · which settings produced this</p>
        <ul className="pg-keys">
          {userKeys.map(key => <li key={key}><a className="link-plain mono" href={explanationAnchors[key] ?? docPaths.policies}>{key}</a> <span className="caption">{describeKey(key, evaluation)}</span></li>)}
        </ul>
        {origins.length > 0 && <details><summary className="caption">Origins ({origins.length})</summary><ul className="pg-keys">{origins.map((o, i) => <li key={i}><span className="mono">{o.path}</span> <span className="caption">from {o.layer}{o.replaces ? `, replaces ${o.replaces}` : ''}</span></li>)}</ul></details>}
      </div>
      <div className="panel stack">
        <p className="label">§ Rules · results</p>
        <ul className="pg-keys">
          {rules.map(([id, r]) => <li key={id}><span className="mono">{id}</span> <span className="caption">{r.disposition}{r.band ? ` · band ${r.band.status === 'resolved' ? r.band.id : `unknown (${r.band.candidates.join(', ')})`}` : ''}{r.decision ? ` · ${r.decision.status === 'resolved' ? String(r.decision.value) : 'unknown'}` : ''}</span></li>)}
          {rules.length === 0 && <li className="caption">No rules in this policy.</li>}
        </ul>
      </div>
      <div className="panel stack">
        <p className="label">→ Proposed</p>
        <p className="small">{plan ? `${plan.operations.length} desired operation${plan.operations.length === 1 ? '' : 's'}, ${plan.held.length} held. Stage ${plan.stage}; nothing applied.` : `No plan: ${evaluation.planDiagnostics.map(d => d.message).join(' ')}`}</p>
        <p className="label" data-lane="readback">⟲ Readback</p>
        <p className="caption">Not observed. The playground reads no repository state and applies nothing. <a className="link" href={paths.docs + 'actions/github-actions/#analyze-then-revalidate-and-apply-explicitly'}>How apply reads back</a></p>
      </div>
    </div>
  );
}

function describeKey(key: string, e: Evaluation): string {
  const d = e.document as Record<string, any>;
  switch (key) {
    case 'presets': return d.presets.length ? `expands ${d.presets.join(', ')}` : 'no preset; everything declared here';
    case 'size': return `overrides on the size preset: ${Object.keys(d.size).join(', ')}`;
    case 'defaults': return `paths: exclude ${d.defaults.paths?.exclude?.length ?? 0}, includeOnly ${d.defaults.paths?.includeOnly?.length ?? 0}, forceInclude ${d.defaults.paths?.forceInclude?.length ?? 0}`;
    case 'scopes': return Object.entries(d.scopes).map(([id]) => `${id}: ${e.report.scopes?.[id] ? display(e.report.scopes[id]!.totals.files.included) + ' files' : '—'}`).join(' · ');
    case 'metrics': return Object.keys(d.metrics).map(id => `${id} = ${display(e.report.metrics?.[id])}`).join(' · ');
    case 'bands': return Object.keys(d.bands).map(id => { const b = e.report.bands?.[id]; return `${id} → ${b ? (b.status === 'resolved' ? b.id : 'unknown') : '—'}`; }).join(' · ');
    case 'rules': return Object.keys(d.rules).map(id => `${id}: ${e.result.rules[id]?.disposition ?? '—'}`).join(' · ');
    case 'labelGroups': return Object.entries(d.labelGroups).map(([g, m]) => `${g} (${(m as string[]).length} members)`).join(' · ');
    case 'labelDefinitions': return `${Object.keys(d.labelDefinitions).length} definitions`;
    case 'queries': return `${Object.keys(d.queries).join(', ')}`;
    case 'parameters': return Object.entries(d.parameters).map(([n, p]: [string, any]) => `${n}: ${p.type}${p.default !== undefined ? ` = ${p.default}` : ''}`).join(' · ');
    case 'measurement': return d.measurement.replacementLines;
    case 'language': return d.language;
    default: return '';
  }
}
