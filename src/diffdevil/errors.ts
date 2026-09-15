import type { Diagnostic, Result, SourceRange } from './model.js';

/** An internal control-flow error whose public payload is a stable diagnostic. */
export class DiffdevilError extends Error {
  constructor(readonly diagnostic: Diagnostic) { super(diagnostic.message); this.name = 'DiffdevilError'; }
}
export function fail(code: string, message: string, phase: Diagnostic['phase'] = 'evaluate', range?: SourceRange): never {
  throw new DiffdevilError({ code, phase, severity: 'error', message, ...(range ? { range, precision: 'character' as const } : {}) });
}
export function diagnosticOf(error: unknown, phase: Diagnostic['phase'] = 'evaluate'): Diagnostic {
  if (error instanceof DiffdevilError) return error.diagnostic;
  return { code: 'E_INTERNAL', phase, severity: 'error', message: error instanceof Error ? error.message : 'Unexpected non-error exception.' };
}
export function capture<T>(work: () => T): Result<T> {
  try { return { ok: true, value: work(), diagnostics: [] }; }
  catch (error) { return { ok: false, diagnostics: [diagnosticOf(error)] }; }
}
export async function captureAsync<T>(work: () => Promise<T>): Promise<Result<T>> {
  try { return { ok: true, value: await work(), diagnostics: [] }; }
  catch (error) { return { ok: false, diagnostics: [diagnosticOf(error)] }; }
}
export function unwrap<T>(result: Result<T>): T {
  if (!result.ok) throw new DiffdevilError(result.diagnostics[0] ?? { code: 'E_INTERNAL', phase: 'evaluate', severity: 'error', message: 'Operation failed without a diagnostic.' });
  return result.value;
}
