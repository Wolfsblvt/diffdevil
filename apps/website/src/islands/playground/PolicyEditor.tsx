// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Editable .diffdevil.yml on a real editor (CodeMirror 6), lazy-loaded when Policy
 * mode opens. Diagnostics from the shared compiler become lint markers at their source
 * ranges; the palette is the same restrained diffdevil syntax as read-only YAML.
 */
import { useEffect, useRef } from 'react';
import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { yaml } from '@codemirror/lang-yaml';
import { HighlightStyle, syntaxHighlighting, bracketMatching } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { linter, lintGutter, type Diagnostic as LintDiagnostic } from '@codemirror/lint';
import { copy } from '../../data/copy';
import type { Evaluation, EvaluationFailure, Diagnostic } from './engine';

const palette = HighlightStyle.define([
  { tag: [tags.propertyName, tags.definition(tags.propertyName), tags.attributeName, tags.keyword], color: '#c3b5ff' },
  { tag: [tags.string, tags.special(tags.string)], color: '#d9c8a0' },
  { tag: [tags.number, tags.bool, tags.null, tags.literal], color: '#f0f2f5', fontWeight: '600' },
  { tag: [tags.punctuation, tags.separator, tags.bracket, tags.operator], color: '#828690' },
  { tag: [tags.comment, tags.lineComment], color: '#6f7480', fontStyle: 'italic' },
]);

const theme = EditorView.theme({
  '&': { backgroundColor: '#0c0f17', color: '#f0f2f5', fontSize: '12.5px', borderRadius: '10px', border: '1px solid var(--hair)' },
  '.cm-content': { fontFamily: 'var(--font-mono)', padding: '10px 0', caretColor: '#f0f2f5' },
  '.cm-gutters': { backgroundColor: '#0c0f17', color: '#828690', border: 'none', fontFamily: 'var(--font-mono)' },
  '.cm-activeLine': { backgroundColor: '#151922' },
  '.cm-activeLineGutter': { backgroundColor: '#151922' },
  '&.cm-focused': { outline: '2px solid var(--focus)', outlineOffset: '2px' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': { backgroundColor: 'rgba(240, 97, 186, 0.28) !important' },
  '.cm-lintRange-error': { backgroundImage: 'none', textDecoration: 'underline wavy #ff7a70', textUnderlineOffset: '3px' },
  '.cm-tooltip': { backgroundColor: '#1d222c', color: '#f0f2f5', border: '1px solid #484d58', fontFamily: 'var(--font-ui)', fontSize: '12.5px' },
}, { dark: true });

interface Props { text: string; name: string; evaluation: Evaluation | EvaluationFailure | undefined; onChange: (text: string) => void }

function toLint(diagnostics: readonly Diagnostic[], length: number): LintDiagnostic[] {
  return diagnostics.filter(d => d.severity === 'error').map(d => {
    const from = Math.min(d.range?.start ?? 0, length), to = Math.min(Math.max(d.range?.end ?? from, from), length);
    return { from, to: to === from ? Math.min(from + 1, length) : to, severity: 'error', message: `${d.code}${d.configPath ? ` at ${d.configPath}` : ''}: ${d.message}` };
  });
}

export default function PolicyEditor({ text, name, evaluation, onChange }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | undefined>(undefined);
  const lint = useRef(new Compartment());
  const latest = useRef(evaluation);
  latest.current = evaluation;

  useEffect(() => {
    if (!host.current) return;
    const state = EditorState.create({
      doc: text,
      extensions: [
        lineNumbers(), history(), drawSelection(), highlightActiveLine(), bracketMatching(), lintGutter(),
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        yaml(), syntaxHighlighting(palette), theme, EditorView.lineWrapping,
        lint.current.of(linter(v => { const e = latest.current; return e && !e.ok ? toLint(e.diagnostics, v.state.doc.length) : []; }, { delay: 150 })),
        EditorView.updateListener.of(update => { if (update.docChanged) onChange(update.state.doc.toString()); }),
        EditorView.contentAttributes.of({ 'aria-label': `${name} policy editor` }),
      ],
    });
    view.current = new EditorView({ state, parent: host.current });
    return () => { view.current?.destroy(); view.current = undefined; };
    // The editor owns its document after mount; external text changes are applied below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const editor = view.current;
    if (!editor) return;
    const current = editor.state.doc.toString();
    if (current !== text) editor.dispatch({ changes: { from: 0, to: current.length, insert: text } });
  }, [text]);

  const valid = evaluation?.ok;
  const first = evaluation && !evaluation.ok ? evaluation.diagnostics[0] : undefined;
  return (
    <div className="pg-editor">
      <div className="code-head"><span>{name}</span><span className="spacer" /><span>YAML · no code runs</span></div>
      <div ref={host} />
      <p className={`status pg-editor-status ${valid ? '' : 'is-invalid'}`} role={valid ? 'status' : 'alert'}>
        {valid ? copy.playground.policyValid : first ? `× ${first.code}${first.configPath ? ` at ${first.configPath}` : ''}: ${first.message} The preset is not substituted; the previous valid result stays visible.` : 'Evaluating…'}
      </p>
    </div>
  );
}
