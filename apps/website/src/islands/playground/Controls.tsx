// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Graphical controls over the policy document with live per-key annotations. One grid:
 * a fixed label column on the left, the control and its annotation on the right, for every
 * row. Keys the controls cannot represent are listed, not lost.
 */
import { useState } from 'react';
import { copy } from '../../data/copy';
import { MEASURES, applyControl, controlsFrom, display, evidenceGlyph, patternMatches, type Evaluation, type EvaluationFailure } from './engine';
import type { Acquired } from './Playground';

interface Props { evaluation: Evaluation | EvaluationFailure | undefined; lastValid: Evaluation | undefined; acquired: Acquired | undefined; onPolicy: (text: string) => void; onOpenPolicy: () => void }

export function Controls({ evaluation, lastValid, acquired, onPolicy, onOpenPolicy }: Props) {
  const c = copy.playground;
  const [newPattern, setNewPattern] = useState('');
  const current = evaluation?.ok ? evaluation : lastValid;
  if (!current || !acquired) return <p className="caption">{evaluation && !evaluation.ok ? 'The current policy is invalid; open Policy to repair it.' : 'Loading…'}</p>;
  const controls = controlsFrom(current);
  const metricValue = current.report.metrics?.[current.focusMetric];
  const band = current.focusBand ? current.report.bands?.[current.focusBand] : undefined;
  const edit = (e: Parameters<typeof applyControl>[1]) => onPolicy(applyControl(current, e));
  const invalid = evaluation && !evaluation.ok;
  const addPattern = () => { if (!newPattern.trim()) return; edit({ kind: 'exclude', patterns: [...controls.exclude, newPattern.trim()] }); setNewPattern(''); };

  return (
    <>
      {invalid && <p className="status" role="alert">Configuration error in the policy; showing the {c.states.previousPolicy}. <button type="button" className="pg-textlink" onClick={onOpenPolicy}>{c.keptLink} →</button></p>}
      <div className="pg-controls">
        <label className="pg-ctl-label" htmlFor="ctl-preset">{c.preset}</label>
        <div className="pg-ctl">
          <select id="ctl-preset" className="select" value={controls.preset} onChange={e => edit({ kind: 'preset', preset: e.target.value as 'size@1' | 'none' })}>
            <option value="size@1">size@1</option><option value="none">none · explicit</option>
          </select>
          <p className="pg-ctl-note">{controls.preset === 'none' ? 'policy declares everything itself' : 'bands, labels and the size rule from the preset'}</p>
        </div>

        <label className="pg-ctl-label" htmlFor="ctl-metric">{c.metric}</label>
        <div className="pg-ctl">
          {controls.metricFormula !== undefined
            ? <span className="pg-readonly mono" id="ctl-metric">{current.focusMetric} = {controls.metricFormula}</span>
            : <span className="pg-metric"><span className="mono pg-metric-name">{current.focusMetric} =</span><select id="ctl-metric" className="select mono" value={controls.metricMeasure ?? 'lines.changed'} onChange={e => edit({ kind: 'measure', measure: e.target.value })}>
                {MEASURES.map(measure => <option key={measure} value={measure}>{measure}</option>)}
              </select></span>}
          <p className="pg-ctl-note">evaluates to {display(metricValue)}{metricValue ? ` · ${evidenceGlyph[metricValue.status]} ${metricValue.status}` : ''}</p>
        </div>

        {controls.bands.length > 0 && <>
          <span className="pg-ctl-label" id="ctl-bands">{c.bands}</span>
          <ul className="pg-ctl pg-bands" aria-labelledby="ctl-bands">
            {controls.bands.map(row => {
              const here = band?.status === 'resolved' && band.id === row.id;
              return (
                <li key={row.id} className={here ? 'is-here' : ''}>
                  <span className="pg-band-id">{row.id}</span>
                  <span className="pg-band-lt" aria-hidden="true">{row.lt !== undefined ? '<' : ''}</span>
                  {row.lt !== undefined
                    ? <input className="input pg-num" type="number" min={0} aria-label={`upper threshold for band ${row.id}`} value={row.lt} onChange={e => edit({ kind: 'threshold', id: row.id, lt: Number(e.target.value) })} />
                    : <input className="input pg-num" type="text" value="rest" readOnly tabIndex={-1} aria-label={`band ${row.id} takes the rest`} />}
                  {row.label !== undefined
                    ? <input className="input pg-label" type="text" aria-label={`label for band ${row.id}`} value={row.label} onChange={e => edit({ kind: 'label', id: row.id, label: e.target.value })} />
                    : <span />}
                  {here && <span className="pg-here">← {display(metricValue)} lands here</span>}
                </li>
              );
            })}
            {band?.status === 'unknown' && <li className="pg-ctl-note">band unknown across {band.candidates.join(', ')}</li>}
          </ul>
        </>}

        <span className="pg-ctl-label" id="ctl-exclude">{c.exclude}</span>
        <div className="pg-ctl">
          <ul className="pg-patterns" aria-labelledby="ctl-exclude">
            {controls.exclude.map((pattern, index) => {
              const matches = patternMatches(acquired.report, pattern);
              return (
                <li key={`${pattern}-${index}`}>
                  <span className="mono pg-pattern">{pattern}</span>
                  <span className="pg-ctl-note">· matches {matches ?? '?'}{matches === 1 ? ' file' : ''}</span>
                  <button type="button" className="pg-textlink pg-remove" aria-label={`Remove ${pattern}`} onClick={() => edit({ kind: 'exclude', patterns: controls.exclude.filter((_, i) => i !== index) })}>remove</button>
                </li>
              );
            })}
          </ul>
          <input className="input pg-add" type="text" placeholder="+ add pattern, e.g. **/*.lock" aria-label="Add an exclusion pattern, then press Enter" value={newPattern} onChange={e => setNewPattern(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPattern(); } }} />
          {controls.forceInclude.length > 0 && <p className="pg-ctl-note">force-include: {controls.forceInclude.join(', ')}</p>}
        </div>

        <span className="pg-ctl-label" id="ctl-comment">{c.comment}</span>
        <div className="pg-ctl pg-comment-ctl">
          <button type="button" role="switch" aria-checked={controls.comment} aria-labelledby="ctl-comment" className="pg-switch" onClick={() => edit({ kind: 'comment', on: !controls.comment })}><span /></button>
          <span className="pg-ctl-note">{controls.comment ? c.commentOn : c.commentOff}{controls.commentRule ? ` · rule ${controls.commentRule}` : ''}</span>
        </div>
      </div>
      {controls.kept.length > 0 && (
        <div className="notice-kept">
          <strong>{c.kept}</strong>, {c.keptTail} {controls.kept.join(' · ')}. <button type="button" className="pg-textlink" onClick={onOpenPolicy}>{c.keptLink} →</button>
        </div>
      )}
    </>
  );
}
