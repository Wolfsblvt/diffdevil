// SPDX-License-Identifier: AGPL-3.0-only
/** Main column: comparison strip → primary result frame → "See this result as" tiles → view panel → Files → Other metrics. The frame never changes shape. */
import { useEffect, useRef, useState } from 'react';
import { copy } from '../../data/copy';
import { display, evidenceGlyph, observedTotals, type Evaluation, type EvaluationFailure } from './engine';
import type { PlaygroundState, View } from './state';
import type { Acquired, ApiError } from './Playground';
import { Views } from './Views';
import { ExportDialog } from './ExportDialog';
import { errorText } from './Rail';

interface Props {
  state: PlaygroundState; acquired: Acquired | undefined; previous: Acquired | undefined;
  evaluation: Evaluation | EvaluationFailure | undefined; lastValid: Evaluation | undefined;
  working: boolean; error: ApiError | undefined; newerHead: string | undefined; policyText: string;
  onView: (view: View) => void; onHead: (head: 'snapshot' | 'live') => void;
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
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || (event.target as HTMLElement)?.isContentEditable) return;
      if (event.key === 'e' || event.key === 'E') { event.preventDefault(); setExportOpen(true); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  if (!acquired || !current) {
    return (
      <section className="pg-main" aria-live="polite">
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
          {acquired.kind === 'fixture' && example && <><span className="pg-strip-title"><span className="glyph" aria-hidden="true">{example.glyph}</span>{example.title}</span><span className="chip-meta">frozen fixture</span><span className="chip-meta">{report.source.kind} · {report.source.base ?? 'supplied'}{report.source.head ? `…${report.source.head}` : ''}</span></>}
          {(acquired.kind === 'snapshot' || acquired.kind === 'live') && example && <><span className="pg-strip-title"><svg className="gh" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" /></svg> <a href={example.url} rel="noopener">{example.repository} · PR #{example.pullRequest}</a></span>
            {acquired.kind === 'snapshot'
              ? <><span className="chip-meta">curated snapshot</span><span className="chip-meta">head {sha7(example.snapshot?.head)} · analyzed {example.snapshot?.analyzedAt.slice(0, 10)}</span><span className="chip-meta">preset {example.snapshot?.engine.policy}</span></>
              : <><span className="chip-meta">live · head {sha7(acquired.liveHead)}</span><button type="button" className="btn btn-quiet pg-mini" onClick={() => props.onHead('snapshot')}>{c.backToSnapshot} {sha7(example.snapshot?.head)}</button></>}
          </>}
          {acquired.kind === 'pr' && acquired.pr && <><span className="pg-strip-title">{acquired.pr.owner}/{acquired.pr.repo} · PR #{acquired.pr.number}</span><span className="chip-meta">live · head {sha7(report.source.head)}</span></>}
          <span className="chip-meta">report {report.schemaVersion} · {report.semantics.replacementLines}</span>
          <span className="chip-meta">policy {acquired.policyName}</span>
          <span className="spacer" />
          <span className="chip-ev" data-status={report.measurement.status}>{evidenceGlyph[report.measurement.status]} {report.measurement.status}{report.fileSet.complete ? ' · file set complete' : ' · file set incomplete'}</span>
        </div>
        {acquired.kind === 'snapshot' && newerHead && example && (
          <div className="pg-newer">
            <span className="mono">⟳</span> <strong>{c.newer}</strong> {c.newerBody(sha7(newerHead), sha7(example.snapshot?.head))}
            <button type="button" className="btn btn-secondary pg-mini" onClick={() => props.onHead('live')}>{c.analyzeLatest} · {sha7(newerHead)}</button>
          </div>
        )}
        {example?.group === 'curated' && example.reason && <p className="caption pg-why"><strong>{c.whyThisPr}</strong> — {example.reason} {example.teaches}</p>}
        {example?.group === 'fixture' && <p className="caption pg-why">{example.teaches}</p>}
        {error && acquired && <p className="status" role="alert">{errorText(error)} {props.previous ? `(${c.states.previous})` : ''}</p>}
        {stale && <p className="status" role="alert">Configuration error in the policy — showing the result {c.states.previousPolicy}.</p>}
      </div>

      <div className={`machine pg-primary result-frame ${stale ? 'is-dimmed' : ''}`}>
        <div className="pg-primary-value">
          <p className="label">{c.primaryLabel} · {current.focusMetric}</p>
          <p className="pg-big"><span className="metric-l">{display(metric)}</span><span className="metric-unit">{current.focusMetric === 'review' || current.focusMetric.endsWith('Review') ? c.changedUnit : ''}</span></p>
          <p className="pills"><span className="chip-ev" data-status={status}>{evidenceGlyph[status]} {status}</span>{current.effective.metrics?.[current.focusMetric] && 'measure' in current.effective.metrics[current.focusMetric]! ? <span className="chip-meta">{(current.effective.metrics[current.focusMetric] as { measure: string }).measure}</span> : <span className="chip-meta">formula</span>}</p>
          <p className="pg-result-line mono">
            {band ? (band.status === 'resolved' ? <>band {band.id} → {labelName ? <span className="label-swatch" style={{ background: `#${definitions[labelName]?.color ?? 'C5DEF5'}` }}>{labelName}</span> : <span className="caption">no label operation</span>}</> : <>band ? unknown across {band.candidates.join(', ')} → {rule?.disposition === 'held' ? 'held, no label proposed' : labelName ?? 'no label'}</>) : <span className="caption">no band on this metric</span>}
          </p>
        </div>
        <div className="pg-facts">
          <div className="fact-block"><p className="k">■ Decomposition</p><ul className="fact-list"><li><span>+ added-only</span><span className="v">{display(report.totals.lines.added)}</span></li><li><span>− deleted-only</span><span className="v">{display(report.totals.lines.deleted)}</span></li><li><span>~ modified</span><span className="v">{display(report.totals.lines.modified)}</span></li><li><span>changed</span><span className="v">{display(report.totals.lines.changed)}</span></li></ul></div>
          <div className="fact-block"><p className="k">■ Raw · included</p><ul className="fact-list"><li><span>+ additions</span><span className="v">{display(report.totals.raw.added)}</span></li><li><span>− deletions</span><span className="v">{display(report.totals.raw.deleted)}</span></li><li><span>churn</span><span className="v">{display(report.totals.raw.churn)}</span></li></ul></div>
          <div className="fact-block"><p className="k">▣ Files</p><ul className="fact-list"><li><span>observed</span><span className="v">{display(report.fileSet.total)}{report.fileSet.complete ? '' : ' (incomplete)'}</span></li><li><span>included</span><span className="v">{display(report.totals.files.included)}</span></li><li><span>excluded</span><span className="v">{display(report.totals.files.excluded)}</span></li></ul></div>
        </div>
      </div>

      <div className="pg-views">
        <div className="pg-views-head">
          <div><h2 className="h3">{c.viewsH}</h2><p className="caption">{c.viewsSub}</p></div>
          <button type="button" className="btn btn-quiet" onClick={() => setExportOpen(true)} aria-haspopup="dialog">{c.export} <span className="caption">· {c.exportSub}</span></button>
        </div>
        <div className="tiles" role="tablist" aria-label={c.viewsH}>
          {c.tiles.map((tile, index) => (
            <button key={tile.id} ref={el => { tiles.current[index] = el; }} type="button" role="tab" id={`tile-${tile.id}`} aria-selected={state.view === tile.id} aria-controls="pg-view-panel" tabIndex={state.view === tile.id ? 0 : -1} className="tile" onClick={() => props.onView(tile.id)} onKeyDown={e => onTileKey(e, index)}>
              <span className="g" aria-hidden="true">{tile.glyph}</span><span className="t">{tile.title}</span><span className="m">{tile.meaning}</span>
            </button>
          ))}
        </div>
        <div id="pg-view-panel" role="tabpanel" aria-labelledby={`tile-${c.tiles[viewIndex]?.id ?? 'terminal'}`} className={stale ? 'is-dimmed' : ''}>
          <Views view={state.view} evaluation={current} acquired={acquired} />
        </div>
      </div>

      <section className="pg-files" aria-labelledby="pg-files-h">
        <h2 id="pg-files-h" className="h3">{c.filesH}</h2>
        {observed.all && report.totals.files.excluded?.status === 'exact' && report.totals.files.excluded.value > 0 && (
          <p className="caption">Observed total with excluded files: churn {new Intl.NumberFormat('en').format(observed.churn)} · changed {new Intl.NumberFormat('en').format(observed.changed)}. Included totals are what policy sees.</p>
        )}
        <div className="machine pg-table-wrap">
          <table className="table">
            <thead><tr><th>path</th><th>change</th><th>scope</th><th className="num">raw + − churn</th><th className="num">+only −only ~mod changed</th><th>evidence</th></tr></thead>
            <tbody>
              {report.files.map(file => {
                const scopes = Object.entries(report.scopes ?? {}).filter(([, scope]) => scope.fileIds.includes(file.id)).map(([id]) => id);
                return (
                  <tr key={file.id} className={file.included ? '' : 'excluded'}>
                    <td className="path">{file.path}{file.oldPath ? <span className="caption"> ← {file.oldPath}</span> : null}{!file.included && <span className="caption"> · excluded{file.inclusionReasons?.[0]?.subject ? ` by ${file.inclusionReasons[0].subject}` : ''}</span>}</td>
                    <td>{file.changeType}{file.kind !== 'text' ? ` · ${file.kind}` : ''}</td>
                    <td>{scopes.join(', ') || '—'}</td>
                    <td className="num">{display(file.raw.added)} {display(file.raw.deleted)} {display(file.raw.churn)}</td>
                    <td className="num">{display(file.lines.added)} {display(file.lines.deleted)} {display(file.lines.modified)} {display(file.lines.changed)}</td>
                    <td><span className="chip-ev" data-status={file.measurement.status}>{evidenceGlyph[file.measurement.status]} {file.measurement.status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {report.metrics && Object.keys(report.metrics).length > 1 && (
        <section className="pg-other" aria-labelledby="pg-other-h">
          <h2 id="pg-other-h" className="label">{c.otherMetrics}</h2>
          <p className="fact-block">{Object.entries(report.metrics).filter(([id]) => id !== current.focusMetric).map(([id, m]) => <span key={id} className="pg-other-item">{id} <strong>{display(m)}</strong> <span className="chip-ev" data-status={m.status}>{evidenceGlyph[m.status]}</span></span>)}</p>
        </section>
      )}

      {exportOpen && <ExportDialog evaluation={current} acquired={acquired} policyText={props.policyText} onClose={() => setExportOpen(false)} />}
    </section>
  );
}
