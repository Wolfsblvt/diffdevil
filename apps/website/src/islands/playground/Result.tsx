// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Main column, contiguous and hard-edged: comparison strip → primary result frame →
 * "See this result as" tiles → view panel → Files → Other metrics. The frame never
 * changes shape between snapshot and live analysis; only the strip and the
 * values change.
 */
import { useEffect, useRef, useState } from 'react';
import { copy } from '../../data/copy';
import { display, evidenceGlyph, observedTotals, type Evaluation, type EvaluationFailure, type NumericMeasurement } from './engine';
import type { PlaygroundState, View } from './state';
import type { Acquired, ApiError } from './Playground';
import { Views } from './Views';
import { ExportDialog } from './ExportDialog';
import { errorText, GitHubMark } from './Rail';

interface Props {
  state: PlaygroundState; acquired: Acquired | undefined; previous: Acquired | undefined;
  evaluation: Evaluation | EvaluationFailure | undefined; lastValid: Evaluation | undefined;
  working: boolean; error: ApiError | undefined; newerHead: string | undefined; policyText: string;
  onView: (view: View) => void; onHead: (head: 'snapshot' | 'live') => void;
}

/** One right-aligned numeric sub-column per figure, so file rows line up digit under digit. */
function Figures({ values, signs }: { values: readonly (NumericMeasurement | undefined)[]; signs?: readonly string[] }) {
  return (
    <span className="pg-figures" style={{ gridTemplateColumns: `repeat(${values.length}, minmax(0, 1fr))` }}>
      {values.map((value, index) => <span key={index}>{signs?.[index] ?? ''}{display(value)}</span>)}
    </span>
  );
}

export function Result(props: Props) {
  const { state, acquired, evaluation, lastValid, working, error, newerHead } = props;
  const c = copy.playground;
  const [exportOpen, setExportOpen] = useState(false);
  const tiles = useRef<(HTMLButtonElement | null)[]>([]);
  const current = evaluation?.ok ? evaluation : lastValid;
  const stale = !!(evaluation && !evaluation.ok);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement || (event.target as HTMLElement)?.isContentEditable) return;
      if (document.querySelector('dialog[open]')) return;
      if (event.key === 'e' || event.key === 'E') { event.preventDefault(); setExportOpen(true); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  if (!acquired || !current) {
    return (
      <section className="pg-main pg-main-empty" aria-live="polite">
        {error ? <p className="status" role="alert">{errorText(error)}</p> : <p className="status"><span className="spinner" aria-hidden="true" />{working ? c.working : 'Loading the example…'}</p>}
      </section>
    );
  }

  const report = current.report;
  const metric = report.metrics?.[current.focusMetric];
  const band = current.focusBand ? report.bands?.[current.focusBand] : undefined;
  const rule = Object.values(current.result.rules).find(r => r.band && current.focusBand);
  const selectedLabel = current.plan?.operations.find(op => op.kind === 'label.select');
  const labelName = selectedLabel && selectedLabel.kind === 'label.select' ? selectedLabel.selected : undefined;
  const definitions = current.effective.labelDefinitions ?? {};
  const observed = observedTotals(report);
  const status = metric?.status ?? report.measurement.status;
  const example = acquired.example;
  const sha7 = (sha: string | undefined) => sha?.slice(0, 7) ?? '';
  const viewIndex = c.tiles.findIndex(t => t.id === state.view);
  const focusDefinition = current.effective.metrics?.[current.focusMetric];
  const otherMetrics = Object.entries(report.metrics ?? {}).filter(([id]) => id !== current.focusMetric);
  const allExact = otherMetrics.every(([, m]) => m.status === 'exact');
  const number = (value: number) => new Intl.NumberFormat('en').format(value);

  const onTileKey = (event: React.KeyboardEvent, index: number) => {
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % c.tiles.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + c.tiles.length) % c.tiles.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = c.tiles.length - 1;
    else return;
    event.preventDefault();
    props.onView(c.tiles[next]!.id);
    tiles.current[next]?.focus();
  };

  return (
    <section className="pg-main" aria-busy={working}>
      <div className={`pg-strip ${stale || (working && acquired) ? 'is-dimmed' : ''}`}>
        <div className="pg-strip-main">
          {(acquired.kind === 'snapshot' || acquired.kind === 'live') && example && <><span className="pg-strip-title"><GitHubMark /><a href={example.url} rel="noopener">{example.repository} · PR #{example.pullRequest}</a></span>
            {acquired.kind === 'snapshot'
              ? <><span className="chip-meta">teaching snapshot · {example.edition}</span><span>head {sha7(example.snapshot?.head)} · captured {example.snapshot?.analyzedAt.slice(0, 10)}</span><span>policy {acquired.policyName}</span></>
              : <><span className="chip-meta">live · head {sha7(acquired.liveHead)}</span><button type="button" className="btn btn-quiet pg-mini" onClick={() => props.onHead('snapshot')}>{c.backToSnapshot} {sha7(example.snapshot?.head)}</button></>}
          </>}
          {acquired.kind === 'pr' && acquired.pr && <><span className="pg-strip-title"><GitHubMark />{acquired.pr.owner}/{acquired.pr.repo} · PR #{acquired.pr.number}</span><span className="chip-meta">live · head {sha7(report.source.head)}</span></>}
          <span>report {report.schemaVersion} · {report.semantics.replacementLines}</span>
          <span>policy {acquired.policyName}</span>
          <span className="chip-ev pg-strip-ev" data-status={report.measurement.status}>{evidenceGlyph[report.measurement.status]} {report.measurement.status}{report.fileSet.complete ? ' · file set complete' : ' · file set incomplete'}</span>
        </div>
        {acquired.kind === 'snapshot' && newerHead && example && (
          <div className="pg-newer">
            <span className="mono">⟳</span> <strong>{c.newer}</strong> {c.newerBody(sha7(newerHead), sha7(example.snapshot?.head))}
            <button type="button" className="btn btn-secondary pg-mini" onClick={() => props.onHead('live')}>{c.analyzeLatest} · {sha7(newerHead)}</button>
          </div>
        )}
        {example && <p className="pg-why"><strong>{c.whyThisPr}</strong> — {example.id} · {example.variant} · source {example.sourceId}</p>}
        {error && acquired && <p className="status" role="alert">{errorText(error)} {props.previous ? `(${c.states.previous})` : ''}</p>}
        {stale && <p className="status" role="alert">Configuration error in the policy — showing the result {c.states.previousPolicy}.</p>}
      </div>

      <div className={`pg-primary ${stale ? 'is-dimmed' : ''}`}>
        <div className="pg-primary-value result-frame">
          <p className="label">{c.primaryLabel} · {current.focusMetric}</p>
          <p className="pg-big"><span className="metric-l">{display(metric)}</span><span className="metric-unit">{current.focusMetric === 'review' || current.focusMetric.endsWith('Review') ? c.changedUnit : ''}</span></p>
          <p className="pills"><span className="chip-ev" data-status={status}>{evidenceGlyph[status]} {status}</span><span className="chip-meta">{focusDefinition && 'measure' in focusDefinition ? focusDefinition.measure : 'formula'}</span></p>
          <p className="pg-result-line">
            {band ? (band.status === 'resolved' ? <>band {band.id} → {labelName ? <span className="label-swatch" style={{ background: `#${definitions[labelName]?.color ?? 'C5DEF5'}` }}>{labelName}</span> : <span>no label operation</span>}</> : <>band ? unknown across {band.candidates.join(', ')} → {rule?.disposition === 'held' ? 'held, no label proposed' : labelName ?? 'no label'}</>) : <span>no band on this metric</span>}
          </p>
        </div>
        <div className="pg-fact"><p className="label">■ Decomposition</p><ul className="facts facts-strong"><li><span>+ added-only</span><span className="v">{display(report.totals.lines.added)}</span></li><li><span>− deleted-only</span><span className="v">{display(report.totals.lines.deleted)}</span></li><li><span>~ modified</span><span className="v">{display(report.totals.lines.modified)}</span></li></ul></div>
        <div className="pg-fact"><p className="label">■ Raw · included</p><ul className="facts"><li><span>+ additions</span><span className="v">{display(report.totals.raw.added)}</span></li><li><span>− deletions</span><span className="v">{display(report.totals.raw.deleted)}</span></li><li><span>churn</span><span className="v">{display(report.totals.raw.churn)}</span></li></ul></div>
        <div className="pg-fact"><p className="label">▣ Files</p><ul className="facts facts-white"><li><span>observed</span><span className="v">{display(report.fileSet.total)}{report.fileSet.complete ? '' : ' +'}</span></li><li><span>included</span><span className="v">{display(report.totals.files.included)}</span></li><li><span>excluded</span><span className="v">{display(report.totals.files.excluded)}</span></li></ul></div>
      </div>

      <div className="pg-views-head">
        <div><h2 className="pg-views-title">{c.viewsH}</h2><p className="pg-views-sub">{c.viewsSub}</p></div>
        <button type="button" className="btn btn-secondary pg-export" onClick={() => setExportOpen(true)} aria-haspopup="dialog">{c.export} · {c.exportSub}</button>
      </div>
      <div className="pg-tiles" role="tablist" aria-label={c.viewsH}>
        {c.tiles.map((tile, index) => (
          <button key={tile.id} ref={el => { tiles.current[index] = el; }} type="button" role="tab" id={`tile-${tile.id}`} aria-selected={state.view === tile.id} aria-controls="pg-view-panel" tabIndex={state.view === tile.id ? 0 : -1} className="pg-tile" onClick={() => props.onView(tile.id)} onKeyDown={e => onTileKey(e, index)}>
            <span className="pg-tile-head"><span className="t">{tile.title}</span><span className="g" aria-hidden="true">{tile.glyph}</span></span>
            <span className="m">{tile.meaning}</span>
          </button>
        ))}
      </div>
      <div id="pg-view-panel" role="tabpanel" aria-labelledby={`tile-${c.tiles[viewIndex]?.id ?? 'terminal'}`} className={`pg-view ${stale ? 'is-dimmed' : ''}`}>
        <Views view={state.view} evaluation={current} acquired={acquired} />
      </div>

      <section className="pg-files" aria-labelledby="pg-files-h">
        <div className="pg-files-head">
          <h2 id="pg-files-h" className="pg-files-title">{c.filesH}</h2>
          {observed.all && report.totals.files.excluded?.status === 'exact' && report.totals.files.excluded.value > 0 && (
            <p className="pg-files-note">Observed total with excluded files: churn {number(observed.churn)} · changed {number(observed.changed)}. Included totals are what policy sees.</p>
          )}
        </div>
        <div className="pg-table-scroll" tabIndex={0} role="group" aria-label="Files table">
          <div className="pg-table" role="table" aria-labelledby="pg-files-h">
            <div className="pg-row pg-row-head" role="row">
              <span role="columnheader">path</span><span role="columnheader">change</span><span role="columnheader">scope</span>
              <span role="columnheader" className="pg-figures" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}><span>raw +</span><span>−</span><span>churn</span></span>
              <span role="columnheader" className="pg-figures" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}><span>+only</span><span>−only</span><span>~mod</span><span>changed</span></span>
              <span role="columnheader">evidence</span>
            </div>
            {report.files.map(file => {
              const scopes = Object.entries(report.scopes ?? {}).filter(([, scope]) => scope.fileIds.includes(file.id)).map(([id]) => id);
              const reason = file.inclusionReasons?.[0]?.subject;
              return (
                <div key={file.id} role="row" className={`pg-row ${file.included ? '' : 'is-excluded'}`}>
                  <span role="cell" className="pg-path"><span className="pg-path-name">{file.path}</span>{file.oldPath ? <span className="pg-path-note"> ← {file.oldPath}</span> : null}</span>
                  <span role="cell" className="pg-dim">{file.changeType}{file.kind !== 'text' ? ` · ${file.kind}` : ' · text'}</span>
                  <span role="cell" className="pg-dim">{file.included ? scopes.join(', ') || '—' : `excluded${reason ? ` · ${reason}` : ''}`}</span>
                  <span role="cell"><Figures values={[file.raw.added, file.raw.deleted, file.raw.churn]} signs={['+', '−', '']} /></span>
                  <span role="cell"><Figures values={[file.lines.added, file.lines.deleted, file.lines.modified, file.lines.changed]} /></span>
                  <span role="cell"><span className="chip-ev" data-status={file.measurement.status}>{evidenceGlyph[file.measurement.status]} {file.measurement.status}</span></span>
                </div>
              );
            })}
          </div>
        </div>
        {otherMetrics.length > 0 && (
          <p className="pg-other" aria-label={c.otherMetrics}>
            <span className="pg-other-label">{c.otherMetrics}</span>
            {otherMetrics.map(([id, m]) => <span key={id}>{id} {display(m)}{allExact ? '' : ` ${evidenceGlyph[m.status]}`}</span>)}
            {allExact && <span className="pg-other-ev">= exact for all</span>}
          </p>
        )}
      </section>

      {exportOpen && <ExportDialog evaluation={current} acquired={acquired} policyText={props.policyText} onClose={() => setExportOpen(false)} />}
    </section>
  );
}
