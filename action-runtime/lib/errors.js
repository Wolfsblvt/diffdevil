/** An internal control-flow error whose public payload is a stable diagnostic. */
export class DiffdevilError extends Error {
    diagnostic;
    constructor(diagnostic) {
        super(diagnostic.message);
        this.diagnostic = diagnostic;
        this.name = 'DiffdevilError';
    }
}
export function fail(code, message, phase = 'evaluate', range) {
    throw new DiffdevilError({ code, phase, severity: 'error', message, ...(range ? { range, precision: 'character' } : {}) });
}
export function diagnosticOf(error, phase = 'evaluate') {
    if (error instanceof DiffdevilError)
        return error.diagnostic;
    return { code: 'E_INTERNAL', phase, severity: 'error', message: error instanceof Error ? error.message : 'Unexpected non-error exception.' };
}
export function capture(work) {
    try {
        return { ok: true, value: work(), diagnostics: [] };
    }
    catch (error) {
        return { ok: false, diagnostics: [diagnosticOf(error)] };
    }
}
export async function captureAsync(work) {
    try {
        return { ok: true, value: await work(), diagnostics: [] };
    }
    catch (error) {
        return { ok: false, diagnostics: [diagnosticOf(error)] };
    }
}
export function unwrap(result) {
    if (!result.ok)
        throw new DiffdevilError(result.diagnostics[0] ?? { code: 'E_INTERNAL', phase: 'evaluate', severity: 'error', message: 'Operation failed without a diagnostic.' });
    return result.value;
}
//# sourceMappingURL=errors.js.map