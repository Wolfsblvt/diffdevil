// SPDX-License-Identifier: AGPL-3.0-only
/** Graphical controls over the policy document with live per-key annotations. Keys the controls cannot represent are listed, not lost. */
import { useState } from 'react';
import { copy } from '../../data/copy';
import { MEASURES, applyControl, controlsFrom, display, patternMatches, type Evaluation, type EvaluationFailure } from './engine';
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

  return (
    <div className="pg-controls">
      {invalid && <p className="status" role="alert">Configuration error in the policy; showing the {c.states.previousPolicy}. <button type="button" className="link-plain" onClick={onOpenPolicy}>{c.keptLink} →</button></p>}
      <div className="pg-control">
        <label className="field-label" htmlFor="ctl-preset">{c.preset}</label>
        <div className="pg-control-row">
          <select id="ctl-preset" className="select" value={controls.preset} onChange={e => edit({ kind: 'preset', preset: e.target.value as 'size@1' | 'none' })}>
            <option value="size@1">size@1</option><option value="none">none · explicit</option>
          </select>
          <span className="caption">{controls.preset === 'none' ? 'policy declares everything itself' : 'bands, labels and the size rule from the preset'}</span>
        </div>
      </div>
      <div className="pg-control">
        <label className="field-label" htmlFor="ctl-metric">{c.metric} · <code>{current.focusMetric}</code></label>
        <div className="pg-control-row">
          {controls.metricFormula !== undefined
            ? <code className="code-inline">{controls.metricFormula}</code>
            : <select id="ctl-metric" className="select" value={controls.metricMeasure ?? 'lines.changed'} onChange={e => edit({ kind: 'measure', measure: e.target.value })}>
                {MEASURES.map(measure => <option key={measure} value={measure}>{measure}</option>)}
              </select>}
          <span className="caption">evaluates to {display(metricValue)}{metricValue ? ` · ${metricValue.status}` : ''}</span>
        </div>
      </div>
      {controls.bands.length > 0 && (
        <div className="pg-control">
          <span className="field-label">{c.bands}{controls.bandLabelGroup ? <> · group <code>{controls.bandLabelGroup}</code></> : null}</span>
          <ul className="pg-bands">
            {controls.bands.map(row => {
              const here = band?.status === 'resolved' && band.id === row.id;
              return (
                <li key={row.id} className={here ? 'is-here' : ''}>
                  <span className="mono">{row.id}</span>
                  {row.lt !== undefined
                    ? <label className="visually-hidden-label"><span className="visually-hidden">threshold for {row.id}</span><span className="caption">&lt;</span> <input className="input pg-num" type="number" min={0} value={row.lt} onChange={e => edit({ kind: 'threshold', id: row.id, lt: Number(e.target.value) })} /></label>
                    : <span className="caption">rest</span>}
                  {row.label !== undefined && <input className="input pg-label" type="text" aria-label={`label for ${row.id}`} value={row.label} onChange={e => edit({ kind: 'label', id: row.id, label: e.target.value })} />}
                  <span className="caption pg-here">{here ? `← ${display(metricValue)} lands here` : ''}</span>
                </li>
              );
            })}
            {band?.status === 'unknown' && <li className="caption">band unknown across {band.candidates.join(', ')}</li>}
          </ul>
        </div>
      )}
      <div className="pg-control">
        <span className="field-label">{c.exclude}</span>
        <ul className="pg-patterns">
          {controls.exclude.map((pattern, index) => (
            <li key={`${pattern}-${index}`}>
              <code className="code-inline">{pattern}</code>
              <span className="caption">matches {patternMatches(acquired.report, pattern) ?? '?'} file{patternMatches(acquired.report, pattern) === 1 ? '' : 's'}</span>
              <button type="button" className="link-plain caption" aria-label={`Remove ${pattern}`} onClick={() => edit({ kind: 'exclude', patterns: controls.exclude.filter((_, i) => i !== index) })}>remove</button>
            </li>
          ))}
          <li className="pg-add">
            <input className="input" type="text" placeholder="+ add pattern, e.g. **/*.lock" aria-label="Add an exclusion pattern" value={newPattern} onChange={e => setNewPattern(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newPattern.trim()) { e.preventDefault(); edit({ kind: 'exclude', patterns: [...controls.exclude, newPattern.trim()] }); setNewPattern(''); } }} />
          </li>
        </ul>
        {controls.forceInclude.length > 0 && <p className="caption">force-include: {controls.forceInclude.join(', ')}</p>}
      </div>
      <div className="pg-control">
        <span className="field-label">{c.comment}</span>
        <div className="pg-control-row">
          <label className="small"><input type="checkbox" checked={controls.comment} onChange={e => edit({ kind: 'comment', on: e.target.checked })} /> {controls.comment ? c.commentOn : c.commentOff}</label>
          {controls.commentRule && <span className="caption">rule <code>{controls.commentRule}</code></span>}
        </div>
      </div>
      {controls.kept.length > 0 && (
        <div className="notice-kept">
          <strong>{c.kept}</strong>, {c.keptTail} {controls.kept.join(' · ')}. <button type="button" className="link-plain" onClick={onOpenPolicy}>{c.keptLink} →</button>
        </div>
      )}
    </div>
  );
}
