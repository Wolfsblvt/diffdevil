// SPDX-License-Identifier: AGPL-3.0-only
/** The rail: input tabs, public-PR input or the shared real-PR lessons, then configuration. A hard-edged column flush with the header; the desktop rail never collapses; ≤ 900 it becomes a sticky bottom sheet. */
import { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { copy } from '../../data/copy';
import { parsePullRequestUrl, prUrl, type PlaygroundState } from './state';
import type { Evaluation, EvaluationFailure } from './engine';
import type { Acquired, ApiError } from './Playground';
import { Controls } from './Controls';
import { copyText } from '../../lib/clipboard';

const PolicyEditor = lazy(() => import('./PolicyEditor'));

export interface ExampleCard {
  readonly id: string; readonly title: string; readonly lessons: readonly string[]; readonly summary: string;
  readonly variants: readonly {
    id: string; label: string; repository: string; pullRequest: number; head: string; capturedAt: string; edition: string; evidence: string;
  }[];
}

interface Props {
  state: PlaygroundState; catalogue: readonly ExampleCard[];
  acquired: Acquired | undefined; evaluation: Evaluation | EvaluationFailure | undefined; lastValid: Evaluation | undefined;
  working: boolean; error: ApiError | undefined; policyText: string;
  onSelectExample: (id: string, variant: string) => void; onAnalyzePr: (pr: { owner: string; repo: string; number: number }) => void; onCancel: () => void;
  onMode: (mode: 'pr' | 'examples') => void; onCfg: (cfg: 'controls' | 'policy') => void; onPolicy: (text: string) => void;
}

export const GitHubMark = () => <svg className="gh" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" /></svg>;

export function Rail(props: Props) {
  const { state, catalogue, acquired, working, error } = props;
  const c = copy.playground;
  const [editing, setEditing] = useState(state.mode !== 'pr' || !state.pr);
  const [refused, setRefused] = useState<string | undefined>();
  const [sheetOpen, setSheetOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  // The compact display shows the last public PR the visitor analyzed, never an example's PR.
  const lastPr = state.mode === 'pr' ? state.pr : acquired?.kind === 'pr' ? acquired.pr : undefined;

  // Collapse to the compact display only once this PR's analysis actually succeeded.
  useEffect(() => { if (state.mode === 'pr' && acquired?.kind === 'pr' && acquired.pr && state.pr && acquired.pr.number === state.pr.number && acquired.pr.repo === state.pr.repo && acquired.pr.owner === state.pr.owner && !error) setEditing(false); }, [state.mode, state.pr, acquired, error]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === '/' && !(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || (event.target as HTMLElement)?.isContentEditable)) {
        event.preventDefault(); props.onMode('pr'); setEditing(true); setTimeout(() => input.current?.focus(), 0);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [props]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const value = input.current?.value ?? '';
    const pr = parsePullRequestUrl(value);
    if (!pr) { setRefused(c.states.refused(value || '(empty)')); input.current?.focus(); return; }
    setRefused(undefined);
    props.onAnalyzePr(pr);
  };

  const config = (
    <section className="pg-config" aria-labelledby="pg-config-h">
      <div className="pg-config-head">
        <h2 id="pg-config-h" className="label">{c.config}</h2>
        <div className="segmented" role="tablist" aria-label="Configuration mode">
          <button type="button" role="tab" aria-selected={state.cfg === 'controls'} onClick={() => props.onCfg('controls')}>{c.controls}</button>
          <button type="button" role="tab" aria-selected={state.cfg === 'policy'} onClick={() => props.onCfg('policy')}>{c.policy}</button>
        </div>
      </div>
      {state.cfg === 'controls'
        ? <Controls evaluation={props.evaluation} lastValid={props.lastValid} acquired={acquired} onPolicy={props.onPolicy} onOpenPolicy={() => props.onCfg('policy')} />
        : <Suspense fallback={<p className="status"><span className="spinner" aria-hidden="true" />Loading the editor…</p>}>
            <PolicyEditor text={props.policyText} name={acquired?.policyName ?? '.diffdevil.yml'} evaluation={props.evaluation} onChange={props.onPolicy} />
          </Suspense>}
      <p className="pg-ctl-note">{c.configNote}</p>
    </section>
  );

  const railBody = (
    <>
      <div className="rail-tabs" role="tablist" aria-label="Input">
        <button type="button" role="tab" id="tab-pr" aria-selected={state.mode === 'pr'} aria-controls="panel-input" onClick={() => { props.onMode('pr'); setEditing(!lastPr); }}>{c.tabPr}</button>
        <button type="button" role="tab" id="tab-examples" aria-selected={state.mode === 'examples'} aria-controls="panel-input" onClick={() => { const entry = catalogue.find(candidate => candidate.id === state.example) ?? catalogue[0]; if (entry?.variants[0]) props.onSelectExample(entry.id, state.variant ?? entry.variants[0].id); else props.onMode('examples'); }}>{c.tabExamples}</button>
      </div>
      <div id="panel-input" role="tabpanel" aria-labelledby={state.mode === 'pr' ? 'tab-pr' : 'tab-examples'} className="pg-input">
        {state.mode === 'pr' ? (
          <div className="stack">
            {editing || !lastPr ? (
              <form onSubmit={submit} className="field" noValidate>
                <label className="field-label" htmlFor="pg-url">{c.inputLabel}</label>
                <input ref={input} id="pg-url" className="input" type="url" inputMode="url" placeholder={copy.prPlaceholder} defaultValue={lastPr ? prUrl(lastPr) : ''} autoComplete="off" spellCheck={false} aria-busy={working} onKeyDown={e => { if (e.key === 'Escape' && working) { e.preventDefault(); props.onCancel(); } }} />
                <p className="field-hint">{c.inputHint}</p>
                <div className="pg-input-actions">
                  <button className="btn btn-inverse" type="submit" disabled={working}>{c.inputButton}</button>
                  {working && <span className="status" role="status"><span className="spinner" aria-hidden="true" />{c.working}</span>}
                </div>
              </form>
            ) : (
              <p className="pg-analyzed">
                <span className="label">{c.analyzed}</span>
                <a className="pg-pr" href={prUrl(lastPr)} rel="noopener" aria-label={prUrl(lastPr)}><GitHubMark /> <strong>{lastPr.owner}/{lastPr.repo}</strong> · PR #{lastPr.number}</a>
                <span className="pg-pr-actions"><button type="button" className="link-plain small" onClick={() => { setEditing(true); setTimeout(() => { input.current?.focus(); input.current?.select(); }, 0); }}>{c.edit}</button> · <button type="button" className="link-plain small" onClick={() => copyText(prUrl(lastPr))}>{c.copyUrl}</button></span>
              </p>
            )}
            {refused && <p className="status" role="alert">{refused}</p>}
            {error && !refused && <p className="status" role="alert">{errorText(error)}</p>}
          </div>
        ) : (
          <div className="stack">
            <p className="field-hint">{c.prsHint}</p>
            <ul className="pg-examples">
              {catalogue.map(card => (
                <li key={card.id}>
                  <span className="pg-card pg-card-lesson"><span className="pg-card-body pg-card-wide"><span className="pg-card-title">{card.title}</span><span className="pg-card-hook">{card.summary}</span><span className="pg-card-meta">{card.lessons.join(' · ')}</span></span>
                    <span className="pg-card-variants">{card.variants.map(variant => <button key={variant.id} type="button" className="link-plain small" aria-pressed={state.example === card.id && state.variant === variant.id} onClick={() => props.onSelectExample(card.id, variant.id)}><GitHubMark /> {variant.label} · {variant.repository}#{variant.pullRequest} · {variant.evidence}</button>)}</span>
                  </span>
                </li>
              ))}

            </ul>
          </div>
        )}
      </div>
      {config}
    </>
  );

  return (
    <aside className="pg-rail" aria-label="Input and configuration">
      <div className="pg-rail-desktop">{railBody}</div>
      <div className="pg-rail-narrow">
        <button type="button" className="pg-sheet-toggle btn btn-quiet" aria-expanded={sheetOpen} aria-controls="pg-sheet" onClick={() => setSheetOpen(o => !o)}>
          <span className="lane">{c.config}</span> · <span className="caption">{state.mode === 'pr' && lastPr ? `${lastPr.owner}/${lastPr.repo}#${lastPr.number}` : state.example}</span> · Edit {sheetOpen ? '▾' : '▴'}
        </button>
        {sheetOpen && <div id="pg-sheet" className="pg-sheet" role="dialog" aria-label="Input and configuration" onKeyDown={e => { if (e.key === 'Escape') setSheetOpen(false); }}>{railBody}</div>}
      </div>
    </aside>
  );
}

export function errorText(error: ApiError): string {
  const c = copy.playground.states;
  switch (error.code) {
    case 'E_PLAYGROUND_URL': case 'E_GITHUB_PERMISSION': return c.refused('the pull request');
    case 'E_GITHUB_RATE_LIMIT': return c.budget(error.retryMinutes);
    case 'UNREACHABLE': return c.unreachable;
    case 'E_LIMIT': return error.message;
    default: return `${c.upstream} (${error.code})`;
  }
}
