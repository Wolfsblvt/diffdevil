// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Four views of one result. Terminal: the real human presenters as one terminal session.
 * Agent · data: the real agent projection beside the report and plan documents, with the
 * site's restrained syntax colouring. GitHub preview: the desired plan as GitHub would
 * show it, never as applied. Explanation: fact → rule → proposed → readback, and the
 * settings that produced the result, each linked to its manual section.
 */
import { useState, type ReactNode } from 'react';
import { copy } from '../../data/copy';
import { docPaths, paths } from '../../data/site';
import { agent, appCheckSummary, display, evaluate, evidenceGlyph, human, json, planHuman, planJson, type Evaluation } from './engine';
import type { Acquired } from './Playground';
import { copyText } from '../../lib/clipboard';
import { highlightJson, highlightLines } from './highlight';
import type { View } from './state';

interface Props { view: View; evaluation: Evaluation; acquired: Acquired }

const explanationAnchors: Record<string, string> = {
  presets: `${docPaths.presets}#presets`, size: `${docPaths.presets}#size-overrides`, measurement: `${docPaths.versioning}`, defaults: `${docPaths.policies}#defaults`,
  scopes: `${docPaths.policies}#scopes`, metrics: `${docPaths.policies}#metrics`, bands: `${docPaths.policies}#bands`, rules: `${docPaths.policies}#rules`,
  labelGroups: `${docPaths.templates}#label-groups`, labelDefinitions: `${docPaths.policies}#label-definitions`, queries: `${docPaths.policies}#queries`, parameters: `${docPaths.policies}#parameters`,
};

const Code = ({ children }: { children: ReactNode }) => <code className="pg-code">{children}</code>;

/** A comment body is Markdown. Render the small subset comment templates use; anything else stays literal text. */
function CommentBody({ body }: { body: string }) {
  const inline = (text: string, seed: string): ReactNode[] => text.split(/(\*\*[^*]+\*\*|`[^`]+`)/u).map((part, index) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={`${seed}${index}`}>{part.slice(2, -2)}</strong>
      : part.startsWith('`') && part.endsWith('`') ? <Code key={`${seed}${index}`}>{part.slice(1, -1)}</Code> : part);
  const lines = body.split('\n').filter(line => !/^\s*<!--.*-->\s*$/u.test(line));
  return (
    <div className="pg-comment-text">
      {lines.map((line, index) => {
        const heading = /^#{1,6}\s+(.*)$/u.exec(line);
        const bullet = /^\s*[-*]\s+(.*)$/u.exec(line);
        if (heading) return <p key={index} className="is-heading">{inline(heading[1]!, `h${index}`)}</p>;
        if (bullet) return <p key={index} className="is-bullet">{inline(bullet[1]!, `b${index}`)}</p>;
        if (!line.trim()) return <span key={index} className="is-gap" />;
        return <p key={index}>{inline(line, `p${index}`)}</p>;
      })}
    </div>
  );
}

export function Views({ view, evaluation, acquired }: Props) {
  const c = copy.playground;
  const [data, setData] = useState<'report' | 'plan'>('report');
  const [commentPreview, setCommentPreview] = useState(true);
  const report = evaluation.report, plan = evaluation.plan;

  if (view === 'terminal') {
    const analyze = human(report), planText = plan ? planHuman(plan) : undefined;
    const config = acquired.policyName;
    return (
      <>
        <figure className="machine machine-inner pg-term">
          <figcaption className="machine-head"><span>terminal</span><span className="pg-head-actions"><button type="button" onClick={() => copyText(analyze)}>Copy analyze</button>{planText && <button type="button" onClick={() => copyText(planText)}>Copy plan</button>}</span></figcaption>
          <pre className="terminal pg-term-body"><code><span className="p">$ </span><span className="c">diffdevil analyze --config {config}</span>{'\n'}{analyze.trimEnd()}{planText && <>{'\n\n'}<span className="p">$ </span><span className="c">diffdevil plan --config {config}</span>{'\n'}{planText.trimEnd()}</>}</code></pre>
        </figure>
        <p className="pg-view-foot">{c.terminalFoot}</p>
      </>
    );
  }

  if (view === 'agent') {
    const text = data === 'report' ? json(report) : plan ? planJson(plan) : '';
    const agentText = agent(report);
    return (
      <div className="pg-agent">
        <div className="pg-col">
          <p className="label pg-col-label"><span>Compact agent projection · --format agent</span><button type="button" className="pg-copy" onClick={() => copyText(agentText)}>Copy</button></p>
          <pre className="machine machine-inner pg-data" tabIndex={0}><code>{highlightLines(agentText.trimEnd())}</code></pre>
          <p className="pg-view-foot">{c.agentFoot} <a className="link" href={docPaths.agents}>Agent integration</a></p>
        </div>
        <div className="pg-col">
          <p className="label pg-col-label">
            <span>{data === 'report' ? `Report · diffdevil.report ${report.schemaVersion}` : plan ? `Plan · diffdevil.plan ${plan.schemaVersion} · stage ${plan.stage}` : 'Plan'}</span>
            <span className="pg-head-actions">
              <span className="segmented" role="tablist" aria-label="Document">
                <button type="button" role="tab" aria-selected={data === 'report'} onClick={() => setData('report')}>report.json</button>
                <button type="button" role="tab" aria-selected={data === 'plan'} onClick={() => setData('plan')}>plan.json</button>
              </span>
              <button type="button" className="pg-copy" onClick={() => copyText(text)} disabled={!text}>Copy</button>
            </span>
          </p>
          {text
            ? <pre className="machine machine-inner pg-data" tabIndex={0} data-lang="json"><code>{highlightJson(text)}</code></pre>
            : <p className="notice-proposed">No plan: {evaluation.planDiagnostics.map(d => d.message).join(' ')}</p>}
        </div>
      </div>
    );
  }

  if (view === 'github') {
    const selects = plan?.operations.filter(op => op.kind === 'label.select') ?? [];
    const adds = plan?.operations.filter(op => op.kind === 'label.add') ?? [];
    const removes = plan?.operations.filter(op => op.kind === 'label.remove') ?? [];
    const comments = plan?.operations.filter(op => op.kind === 'comment.reconcile') ?? [];
    const definitions = evaluation.effective.labelDefinitions ?? {};
    const swatch = (name: string) => <span className="label-swatch" style={{ background: `#${definitions[name]?.color ?? 'C5DEF5'}` }}>{name}</span>;
    const commentPolicy = acquired.example?.commentPolicy;
    const preview = !comments.length && commentPreview && commentPolicy ? evaluate(commentPolicy.text, commentPolicy.name, acquired.report) : undefined;
    const shown = comments.length ? comments : preview?.ok ? preview.plan?.operations.filter(op => op.kind === 'comment.reconcile') ?? [] : [];
    const [summaryTitle, ...summaryLines] = `diffdevil analysis · ${report.source.head ?? report.source.kind}\n${appCheckSummary(report, plan)}`.split('\n').filter(Boolean);
    return (
      <div className="pg-github">
        <div className="pg-col">
          <div className="notice-proposed"><strong>{c.githubNotice}</strong> {c.githubNoticeBody}</div>
          <div className="machine machine-inner pg-box">
            <p className="label pg-box-head">{c.labelsH}{selects[0]?.kind === 'label.select' ? ` · managed group ${selects[0].group}` : ''}</p>
            <div className="pg-box-body">
              {selects.length === 0 && adds.length === 0 && removes.length === 0 && <p className="pg-dim">No label operation.{plan?.held.length ? ` Held: ${plan.held.map(h => `${h.rule} (${h.reasons.map(r => r.code).join(', ')})`).join('; ')}.` : ''}</p>}
              {selects.map((op, i) => op.kind === 'label.select' ? (
                <div key={`s${i}`} className="pg-label-rows">
                  <p className="pg-label-row">{swatch(op.selected)}<span>selected{definitions[op.selected]?.description ? ` · ${definitions[op.selected]!.description}` : ''}</span></p>
                  <p className="pg-label-row pg-dim"><span className="mono">{op.members.filter(m => m !== op.selected).join(' · ')}</span><span>absent (other group members)</span></p>
                </div>
              ) : null)}
              {adds.map((op, i) => op.kind === 'label.add' ? <p key={`a${i}`} className="pg-label-row">{swatch(op.name)}<span>added · rule {op.rule} matched</span></p> : null)}
              {removes.map((op, i) => op.kind === 'label.remove' ? <p key={`r${i}`} className="pg-label-row pg-dim"><span className="mono">{op.name}</span><span>absent · rule {op.rule} not matched, removeWhenFalse</span></p> : null)}
              <p className="pg-box-foot">Labels outside declared groups and rules are never touched.{plan ? ` Target ${plan.target.repository}#${plan.target.pullRequest}.` : ''}</p>
            </div>
          </div>
          <div className="machine machine-inner pg-box">
            <p className="label pg-box-head">{c.checkH}</p>
            <div className="pg-box-body pg-check">
              <p><strong>{summaryTitle}</strong></p>
              {summaryLines.map((line, index) => <p key={index}>{line}</p>)}
              <p className="pg-box-foot">{c.checkFoot}</p>
            </div>
          </div>
        </div>
        <div className="machine machine-inner pg-box">
          <p className="label pg-box-head pg-box-head-split">
            <span>{c.commentH}</span>
            <span>{comments.length ? 'on in this policy' : c.commentOffNote}{!comments.length && commentPolicy ? <> · <label className="pg-toggle"><input type="checkbox" checked={commentPreview} onChange={e => setCommentPreview(e.target.checked)} /> {c.commentShownWith.replace('review-comment.yml', commentPolicy.name)}</label></> : null}</span>
          </p>
          <div className="pg-box-body">
            {shown.map((op, i) => op.kind === 'comment.reconcile' ? (
              <div key={i} className="pg-comment-wrap">
                <article className="pg-comment" aria-label="Rendered comment preview">
                  <header className="pg-comment-head"><span className="logo logo-micro pg-avatar" role="img" aria-label="" /><strong>diffdevil</strong><span className="pg-comment-meta">bot · would comment</span></header>
                  <CommentBody body={op.body} />
                  <p className="pg-comment-marker">&lt;!-- diffdevil:rule={op.rule} --&gt;</p>
                </article>
                <p className="pg-box-foot">Mode <Code>{op.mode}</Code> · trigger <Code>{op.trigger}</Code>: one comment, identified by its marker and updated in place. It never adopts a comment written by anyone else.</p>
              </div>
            ) : null)}
            {!shown.length && <p className="pg-dim">No comment in this policy. Turn one on in Controls, or open Policy and add a rule with <Code>effects.comment</Code>.</p>}
          </div>
        </div>
      </div>
    );
  }

  // explain
  const rules = Object.entries(evaluation.result.rules);
  const origins = evaluation.origins;
  const userKeys = Object.keys(evaluation.document).filter(k => k !== 'version');
  const metric = report.metrics?.[evaluation.focusMetric];
  const definition = evaluation.effective.metrics?.[evaluation.focusMetric];
  const included = report.files.filter(file => file.included), excluded = report.files.filter(file => !file.included);
  const contribution = included.slice(0, 4).map(file => `${file.path} ${display(file.lines.changed)}`).join(' + ') + (included.length > 4 ? ` + ${included.length - 4} more` : '');
  const lines = report.totals.lines, raw = report.totals.raw;
  const hasModified = lines.modified.status === 'exact' && lines.modified.value > 0;
  const operations = plan?.operations ?? [];
  const proposed = operations.map(op => op.kind === 'label.select' ? `select ${op.selected} in group ${op.group}` : op.kind === 'label.add' ? `add ${op.name}` : op.kind === 'label.remove' ? `keep ${op.name} absent` : op.kind === 'comment.reconcile' ? `${op.mode} the ${op.rule} comment` : op.kind);
  return (
    <div className="pg-explain">
      <div className="pg-col">
        <div className="machine machine-inner pg-lane">
          <p className="label">■ Fact</p>
          <p>Metric <Code>{evaluation.focusMetric}</Code>{definition && 'measure' in definition ? <> = <Code>{definition.measure}</Code> over included files</> : definition && 'formula' in definition ? <> = <Code>{definition.formula}</Code></> : null} evaluated to <strong>{display(metric)}</strong>, {evidenceGlyph[metric?.status ?? report.measurement.status]} {metric?.status ?? report.measurement.status}.</p>
          <p className="pg-dim">{contribution ? `${contribution}.` : 'No included files.'}{excluded.length ? ` ${excluded.slice(0, 3).map(file => `${file.path} (${display(file.lines.changed)}) excluded`).join(', ')}${excluded.length > 3 ? `, and ${excluded.length - 3} more excluded` : ''}.` : ''}</p>
          <p className="pg-dim">Measurement {evidenceGlyph[report.measurement.status]} {report.measurement.status}{report.measurement.reasons.length ? ` — ${report.measurement.reasons.map(r => `${r.code}${r.subject ? ` (${r.subject})` : ''}`).join(', ')}` : ''}. File set {report.fileSet.complete ? 'complete' : 'incomplete'}.</p>
        </div>
        <div className="machine machine-inner pg-lane">
          <p className="label">§ Rule</p>
          {rules.map(([id, r]) => (
            <p key={id}>{r.band
              ? r.band.status === 'resolved'
                ? <>Band: {r.band.lower ?? 0} ≤ {display(metric)}{r.band.upper !== undefined ? ` < ${r.band.upper}` : ''} → <strong>{r.band.id}</strong>. </>
                : <>Band unknown across {r.band.candidates.join(', ')}. </>
              : null}Rule <Code>{id}</Code> {r.disposition}{r.decision ? ` (${r.decision.status === 'resolved' ? String(r.decision.value) : 'unknown'})` : ''}.</p>
          ))}
          {rules.length === 0 && <p className="pg-dim">No rules in this policy.</p>}
          {evaluation.result.evidence.length > 0 && <p className="pg-dim">Evaluation notes: {evaluation.result.evidence.map(r => r.code).join(', ')}</p>}
        </div>
        <div className="machine machine-inner pg-lane">
          <p className="label">→ Proposed</p>
          <p>{plan ? proposed.length ? `${proposed.join('; ')}.` : 'No desired operation.' : `No plan: ${evaluation.planDiagnostics.map(d => d.message).join(' ')}`}{plan?.held.length ? ` Held: ${plan.held.map(h => h.rule).join(', ')}.` : ''}{plan && !operations.some(op => op.kind === 'comment.reconcile') ? ' No comment.' : ''}</p>
          {plan && <p className="pg-dim">Stage {plan.stage}; nothing applied.</p>}
        </div>
        <div className="pg-lane pg-lane-readback">
          <p className="label">⟲ Readback</p>
          <p>{c.explainLanes[3][2]} <a className="link" href={`${paths.docs}actions/github-actions/#analyze-then-revalidate-and-apply-explicitly`}>How apply reads back</a></p>
        </div>
      </div>
      <div className="pg-col">
        {hasModified && (
          <div className="machine machine-inner pg-lane">
            <p className="label">Why {display(lines.modified)} modified, not {display(raw.deleted)} + {display(raw.added)}</p>
            <p>Under <Code>{report.semantics.replacementLines}</Code>, adjacent deleted and added lines in one edit block pair as modified. Raw counters stay +{display(raw.added)} / −{display(raw.deleted)}; the replacement-aware count is {display(lines.changed)}.</p>
          </div>
        )}
        <div className="machine machine-inner pg-lane">
          <p className="label">{c.explainKeys}</p>
          <ul className="pg-keys">
            {userKeys.map(key => <li key={key}><a href={explanationAnchors[key] ?? docPaths.policies}><Code>{key}</Code> <span className="pg-key-text">{describeKey(key, evaluation)}</span> <span aria-hidden="true">→</span></a></li>)}
          </ul>
          <p className="pg-box-foot">Each arrow opens the manual section for that key.</p>
          {origins.length > 0 && <details className="pg-origins"><summary>Origins ({origins.length})</summary><ul className="pg-keys">{origins.map((o, i) => <li key={i}><Code>{o.path}</Code> <span className="pg-key-text">from {o.layer}{o.replaces ? `, replaces ${o.replaces}` : ''}</span></li>)}</ul></details>}
        </div>
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
