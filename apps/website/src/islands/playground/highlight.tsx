// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Restrained syntax colouring for generated, read-only text in the playground: JSON
 * documents and the line-oriented presenter output. A small tokenizer, not a client
 * highlighter library: the five classes (key, string, number/literal, punctuation,
 * comment) are the same vocabulary build-time Shiki and the policy editor use.
 * It only colours; the text content is exactly the input.
 */
import type { ReactNode } from 'react';

const JSON_TOKEN = /("(?:[^"\\]|\\.)*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|\btrue\b|\bfalse\b|\bnull\b)|([{}[\],])/gu;

export function highlightJson(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0, key = 0;
  for (const match of text.matchAll(JSON_TOKEN)) {
    const index = match.index ?? 0;
    if (index > last) out.push(text.slice(last, index));
    const [whole, string, colon, literal, punct] = match;
    if (string !== undefined) {
      out.push(<span key={key++} className={colon ? 'tok-key' : 'tok-str'}>{string}</span>);
      if (colon) out.push(<span key={key++} className="tok-punct">{colon}</span>);
    } else if (literal !== undefined) out.push(<span key={key++} className="tok-num">{literal}</span>);
    else if (punct !== undefined) out.push(<span key={key++} className="tok-punct">{punct}</span>);
    last = index + whole.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const VALUE_TOKEN = /("(?:[^"\\]|\\.)*")|(-?\d[\d,.]*)|([|→[\]()])/gu;

function values(text: string, seed: number): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0, key = seed;
  for (const match of text.matchAll(VALUE_TOKEN)) {
    const index = match.index ?? 0;
    if (index > last) out.push(text.slice(last, index));
    const [whole, string, number] = match;
    out.push(<span key={key++} className={string !== undefined ? 'tok-str' : number !== undefined ? 'tok-num' : 'tok-punct'}>{whole}</span>);
    last = index + whole.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/**
 * The agent projection is line-oriented: a label, then its value, separated either by
 * `label: value` or by a run of spaces. The label reads as a key; numbers and quoted
 * strings in the value read as literals. Lines that are neither stay plain.
 */
export function highlightLines(text: string): ReactNode[] {
  return text.split('\n').flatMap((line, row) => {
    const match = /^([A-Za-z][^:]*?:)(\s.*)$/u.exec(line) ?? /^(\S(?:.*?\S)?)(\s{2,}.*)$/u.exec(line);
    const body = match ? [<span key={`k${row}`} className="tok-key">{match[1]}</span>, ...values(match[2]!, row * 1000)] : [line];
    return row === 0 ? body : ['\n', ...body];
  });
}
