import { capture, fail } from './errors.js';
import { DEFAULT_LIMITS, enforceBytes } from './limits.js';
import { SEMANTICS } from './model.js';
export function queryEnvelope(result, report) {
    return { kind: 'diffdevil.query', schemaVersion: '1.0', semantics: report?.semantics ?? SEMANTICS, ...(report ? { source: report.source, ...(report.reportId ? { reportId: report.reportId } : {}) } : {}), value: result.value, evidence: result.evidence };
}
function unresolved() { return fail('E_RESULT_UNRESOLVED', 'Available evidence cannot establish the requested strict result. Use canonical JSON to retain the evidence.', 'format'); }
function determined(value) {
    if (value.kind !== 'collection')
        fail('E_FORMAT_TYPE', 'This output format requires a collection.', 'format');
    if (value.unseen.possible || value.items.some(item => item.membership !== 'definite') || value.order !== 'known')
        unresolved();
    return value;
}
function plain(value) {
    switch (value.kind) {
        case 'number':
            if (value.measurement.status !== 'exact')
                return unresolved();
            if (!Number.isFinite(value.measurement.value) || value.numericType === 'integer' && !Number.isSafeInteger(value.measurement.value))
                fail('E_FORMAT_TYPE', 'Invalid numeric output value.', 'format');
            return value.measurement.value;
        case 'boolean':
            if (value.decision.status !== 'resolved')
                return unresolved();
            return value.decision.value;
        case 'string': return value.value;
        case 'null': return null;
        case 'unknown': return unresolved();
        case 'missing': fail('E_FORMAT_TYPE', 'Plain output cannot omit a structurally missing value.', 'format');
        case 'record': return Object.fromEntries(Object.entries(value.fields).map(([key, v]) => [key, plain(v)]));
        case 'collection': return determined(value).items.map(item => plain(item.value));
    }
}
function scalar(value, nul = false) {
    if (value.kind === 'unknown')
        unresolved();
    if (nul ? value.kind !== 'string' : !['number', 'boolean', 'string'].includes(value.kind))
        fail('E_FORMAT_TYPE', nul ? 'NUL output requires strings.' : 'This output requires an exact present scalar.', 'format');
    const text = String(plain(value));
    if (nul ? text.includes('\0') : /[\r\n\0]/.test(text))
        fail('E_FORMAT_DELIMITER', 'The value contains a delimiter that this output format cannot represent. Use canonical JSON or NUL-delimited paths.', 'format');
    return text;
}
/** Validate the whole strict result before emitting any stdout bytes. */
export function formatQuery(result, options = {}) {
    return capture(() => {
        const command = options.command ?? 'query', format = options.format;
        let exitCode = 0, stdout = '';
        if (command === 'check') {
            if (result.value.kind !== 'boolean')
                fail('E_FORMAT_TYPE', 'A check requires a boolean decision.', 'format');
            if (format !== undefined && format !== 'json')
                fail('E_FORMAT_TYPE', 'Checks support silent output or canonical JSON.', 'format');
            const d = result.value.decision;
            exitCode = d.status === 'unknown' ? 3 : d.value ? 0 : 1;
            if (format === 'json')
                stdout = JSON.stringify(queryEnvelope(result, options.report)) + '\n';
        }
        else
            switch (format ?? 'value') {
                case 'json':
                    stdout = JSON.stringify(queryEnvelope(result, options.report)) + '\n';
                    break;
                case 'value':
                    stdout = scalar(result.value) + '\n';
                    break;
                case 'lines':
                    stdout = determined(result.value).items.map(item => scalar(item.value) + '\n').join('');
                    break;
                case 'nul':
                    stdout = determined(result.value).items.map(item => scalar(item.value, true) + '\0').join('');
                    break;
                case 'jsonl':
                    stdout = determined(result.value).items.map(item => JSON.stringify(plain(item.value)) + '\n').join('');
                    break;
                default: fail('E_FORMAT_TYPE', `Unsupported query output format ${String(format)}.`, 'format');
            }
        enforceBytes(stdout, DEFAULT_LIMITS.resultBytes, 'Selected output', 'format');
        return { stdout, exitCode };
    });
}
export function displayMeasurement(value) {
    if (value.status === 'exact')
        return String(value.value);
    if (value.status === 'bounded')
        return `${value.lower}–${value.upper} (bounded)`;
    if (value.status === 'unknown')
        return `unknown${value.lower === undefined ? '' : `; minimum ${value.lower}`}${value.upper === undefined ? '' : `; maximum ${value.upper}`}`;
    return 'unmeasurable';
}
export function formatReport(report, format = 'human') {
    return capture(() => {
        let stdout;
        if (format === 'json')
            stdout = JSON.stringify(report) + '\n';
        else if (format === 'jsonl')
            stdout = [{ type: 'header', kind: report.kind, schemaVersion: report.schemaVersion, semantics: report.semantics, source: report.source }, ...report.files.map(file => ({ type: 'file', file })), { type: 'summary', measurement: report.measurement, fileSet: report.fileSet, totals: report.totals, scopes: report.scopes, metrics: report.metrics, metricTypes: report.metricTypes, bands: report.bands, rules: report.rules }].map(x => JSON.stringify(x)).join('\n') + '\n';
        else if (format === 'env') {
            const lines = [`DIFFDEVIL_SCHEMA_VERSION=${report.schemaVersion}`, `DIFFDEVIL_MEASUREMENT_STATUS=${report.measurement.status}`];
            for (const group of ['raw', 'lines', 'files'])
                for (const [name, m] of Object.entries(report.totals[group])) {
                    const key = `DIFFDEVIL_${group}_${name}`.toUpperCase();
                    lines.push(`${key}_STATUS=${m.status}`);
                    if (m.status === 'exact')
                        lines.push(`${key}=${m.value}`);
                    else if (m.status === 'bounded' || m.status === 'unknown') {
                        if (m.lower !== undefined)
                            lines.push(`${key}_LOWER=${m.lower}`);
                        if (m.upper !== undefined)
                            lines.push(`${key}_UPPER=${m.upper}`);
                    }
                }
            stdout = lines.join('\n') + '\n';
        }
        else if (['human', 'markdown', 'agent'].includes(format)) {
            const rows = [['Source', report.source.kind], ['Comparison', report.source.comparison ?? 'supplied'], ['Measurement', report.measurement.status], ['Added only', displayMeasurement(report.totals.lines.added)], ['Deleted only', displayMeasurement(report.totals.lines.deleted)], ['Modified', displayMeasurement(report.totals.lines.modified)], ['Changed', displayMeasurement(report.totals.lines.changed)], ['Raw additions', displayMeasurement(report.totals.raw.added)], ['Raw deletions', displayMeasurement(report.totals.raw.deleted)], ['Raw churn', displayMeasurement(report.totals.raw.churn)], ...Object.entries(report.totals.files).map(([key, value]) => [`Files ${key}`, displayMeasurement(value)]), ...Object.entries(report.metrics ?? {}).map(([key, value]) => [`Metric ${JSON.stringify(key)}`, displayMeasurement(value)]), ...Object.entries(report.bands ?? {}).map(([key, value]) => [`Band ${JSON.stringify(key)}`, value.status === 'resolved' ? JSON.stringify(value.id) : `unknown; candidates ${JSON.stringify(value.candidates)}`])];
            if (format === 'markdown')
                stdout = '# diffdevil analysis\n\n| Fact | Value |\n| --- | --- |\n' + rows.map(row => '| ' + row.map(x => String(x).replaceAll('|', '\\|').replaceAll('<', '&lt;').replaceAll('`', '\\`')).join(' | ') + ' |').join('\n') + '\n';
            else
                stdout = (format === 'agent' ? `DIFFDEVIL REPORT\nschema: ${report.schemaVersion}\nmetric: ${report.semantics.replacementLines}` : 'diffdevil analysis') + '\n\n' + rows.map(([label, v]) => `${String(label).padEnd(20)} ${v}`).join('\n') + '\n';
        }
        else
            fail('E_FORMAT_TYPE', `Unsupported report format ${String(format)}.`, 'format');
        enforceBytes(stdout, DEFAULT_LIMITS.resultBytes, 'Report output', 'format');
        return { stdout, exitCode: 0 };
    });
}
//# sourceMappingURL=format.js.map