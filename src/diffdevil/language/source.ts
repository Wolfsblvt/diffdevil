import { fail } from '../errors.js';
import type { Diagnostic, SourceRange } from '../model.js';

/** Text presented to the detail compiler. Offsets index the original JavaScript string in UTF-16 code units. */
export interface ExpressionSource {
  readonly text: string;
  readonly language: 'diffdevil-expr/1';
  readonly name?: string;
}
export function expressionSource(source: string | ExpressionSource): ExpressionSource {
  const value = typeof source === 'string' ? { text: source, language: 'diffdevil-expr/1' as const } : source;
  if (!value || typeof value.text !== 'string' || value.name !== undefined && typeof value.name !== 'string') {
    fail('E_SOURCE', 'An expression requires UTF-16 text and an optional source name.', 'source');
  }
  if (value.language !== 'diffdevil-expr/1') fail('E_VERSION', 'Unsupported expression language.', 'source');
  return Object.freeze({ ...value });
}
export function sourceRange(source: ExpressionSource, start: number, end: number): SourceRange {
  return { ...(source.name === undefined ? {} : { source: source.name }), start, end };
}
/** One-based line and UTF-16 column, with CRLF treated as one newline. */
export function sourcePosition(text: string, offset: number): { line: number; column: number } {
  let line = 1, start = 0;
  for (let i = 0; i < Math.min(offset, text.length); i++) {
    if (text[i] === '\r') {
      if (text[i + 1] === '\n' && i + 1 < offset) i++;
      line++; start = i + 1;
    } else if (text[i] === '\n') { line++; start = i + 1; }
  }
  return { line, column: offset - start + 1 };
}
export function locateDiagnostic(diagnostic: Diagnostic, source: ExpressionSource): Diagnostic {
  if (!diagnostic.range) return diagnostic;
  return { ...diagnostic, details: { ...diagnostic.details, ...sourcePosition(source.text, diagnostic.range.start) } };
}
