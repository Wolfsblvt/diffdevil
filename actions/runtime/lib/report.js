import { assertSchema } from './schema.js';
import { capture, fail } from './errors.js';
import { array, canonicalJson, contentId, deepFreeze, inertCopy, record, string } from './inert.js';
import { arithmetic, bounds, exact, integer, interval, mergeReasons, numberValue, reasonsOf, replacementFamily } from './numeric.js';
import { compareScalarStrings, compilePathPolicy, selectPath, validatePath } from './paths.js';
import { SEMANTICS } from './model.js';
import { parseUnifiedDiff } from './sources/patch.js';
const RAW = ['added', 'deleted', 'churn'];
const LINES = ['added', 'deleted', 'modified', 'changed'];
const COUNTS = ['added', 'deleted', 'modified', 'renamed', 'copied', 'binary', 'unmeasurable'];
const STATUSES = ['exact', 'bounded', 'unknown', 'unmeasurable'];
const INCOMPLETE = { code: 'FILE_SET_INCOMPLETE' };
export function validateMeasurement(input, type = 'integer', nonnegative = false) {
    const value = record(input, 'Measurement');
    const checkNumber = (item) => {
        if (typeof item !== 'number' || !Number.isFinite(item) || (type === 'integer' && !Number.isSafeInteger(item)) || (nonnegative && item < 0))
            fail('E_REPORT_INVALID', 'Measurement contains an invalid numeric endpoint.', 'source');
        return item === 0 ? 0 : item;
    };
    if (value.status === 'exact') {
        if ('lower' in value || 'upper' in value || 'reasons' in value)
            fail('E_REPORT_INVALID', 'Exact evidence cannot contain unresolved payloads.', 'source');
        return exact(checkNumber(value.value));
    }
    if (value.status === 'bounded') {
        if ('value' in value || 'reasons' in value)
            fail('E_REPORT_INVALID', 'Bounded evidence cannot contain an exact or unknown payload.', 'source');
        const lower = checkNumber(value.lower), upper = checkNumber(value.upper);
        if (lower > upper)
            fail('E_REPORT_INVALID', 'Measurement bounds are reversed.', 'source');
        return interval(lower, upper);
    }
    if (value.status === 'unknown' || value.status === 'unmeasurable') {
        const reasons = readReasons(value.reasons, true);
        if ('value' in value)
            fail('E_REPORT_INVALID', 'Unresolved evidence cannot contain an exact value.', 'source');
        if (value.status === 'unmeasurable') {
            if ('value' in value || 'lower' in value || 'upper' in value)
                fail('E_REPORT_INVALID', 'Unmeasurable evidence cannot have a numeric payload.', 'source');
            return { status: 'unmeasurable', reasons };
        }
        const lower = value.lower === undefined ? -Infinity : checkNumber(value.lower);
        const upper = value.upper === undefined ? Infinity : checkNumber(value.upper);
        if (lower > upper)
            fail('E_REPORT_INVALID', 'Unknown measurement has contradictory bounds.', 'source');
        return interval(lower, upper, reasons);
    }
    return fail('E_REPORT_INVALID', 'Unknown measurement status.', 'source');
}
export function readReasons(input, nonempty = false) {
    const reasons = array(input, 'Reasons').map(item => {
        const r = record(item, 'Reason'), code = string(r.code, 'Reason code');
        if (!code)
            fail('E_REPORT_INVALID', 'Reason code cannot be empty.', 'source');
        return { code, ...(r.subject !== undefined ? { subject: string(r.subject, 'Reason subject') } : {}), ...(r.message !== undefined ? { message: string(r.message, 'Reason message') } : {}) };
    });
    if (nonempty && reasons.length === 0)
        fail('E_REPORT_INVALID', 'Unresolved evidence must state a reason.', 'source');
    return reasons;
}
/** Validate saved policy evidence before it becomes a query or template root. */
export function readBand(input) {
    const value = record(input, 'Band result');
    if (value.status === 'resolved') {
        const id = string(value.id, 'Band ID');
        if (!id || 'candidates' in value || 'reasons' in value)
            fail('E_REPORT_INVALID', 'Resolved band has an invalid ID or unresolved payload.', 'source');
        for (const key of ['lower', 'upper'])
            if (value[key] !== undefined && (typeof value[key] !== 'number' || !Number.isFinite(value[key])))
                fail('E_REPORT_INVALID', 'Band boundaries must be finite.', 'source');
        if (value.lower !== undefined && value.upper !== undefined && value.lower >= value.upper)
            fail('E_REPORT_INVALID', 'Band boundaries are empty or reversed.', 'source');
        return { status: 'resolved', id, ...(value.lower !== undefined ? { lower: value.lower } : {}), ...(value.upper !== undefined ? { upper: value.upper } : {}) };
    }
    if (value.status === 'unknown') {
        if ('id' in value || 'lower' in value || 'upper' in value)
            fail('E_REPORT_INVALID', 'Unknown band cannot contain a selected range.', 'source');
        const candidates = array(value.candidates, 'Band candidates').map(id => string(id, 'Band candidate'));
        if (candidates.some(id => !id) || new Set(candidates).size !== candidates.length)
            fail('E_REPORT_INVALID', 'Band candidates must be distinct nonempty IDs.', 'source');
        return { status: 'unknown', candidates, reasons: readReasons(value.reasons, true) };
    }
    return fail('E_REPORT_INVALID', 'Unsupported band status.', 'source');
}
export function readDecision(input) {
    const value = record(input, 'Rule decision');
    if (value.status === 'resolved' && typeof value.value === 'boolean' && !('reasons' in value))
        return { status: 'resolved', value: value.value };
    if (value.status === 'unknown' && !('value' in value))
        return { status: 'unknown', reasons: readReasons(value.reasons, true) };
    return fail('E_REPORT_INVALID', 'Invalid saved rule decision.', 'source');
}
export function readRule(input) {
    const value = record(input, 'Rule result');
    if (!['matched', 'unmatched', 'held', 'fallback'].includes(String(value.disposition)))
        fail('E_REPORT_INVALID', 'Unsupported rule disposition.', 'source');
    return { disposition: value.disposition, ...(value.decision !== undefined ? { decision: readDecision(value.decision) } : {}), ...(value.band !== undefined ? { band: readBand(value.band) } : {}) };
}
function namedResults(input, read) {
    const result = Object.create(null);
    for (const [name, value] of Object.entries(record(input, 'Named results'))) {
        if (!name)
            fail('E_REPORT_INVALID', 'Result names cannot be empty.', 'source');
        result[name] = read(value);
    }
    return result;
}
function summary(input) {
    const value = record(input, 'Measurement summary');
    if (!STATUSES.includes(value.status))
        fail('E_REPORT_INVALID', 'Invalid measurement summary status.', 'source');
    return { status: value.status, reasons: readReasons(value.reasons) };
}
export function summarizeMeasurements(measurements, additional = []) {
    let status = 'exact';
    for (const value of measurements)
        if (STATUSES.indexOf(value.status) > STATUSES.indexOf(status))
            status = value.status;
    return { status, reasons: mergeReasons(...measurements.map(reasonsOf), additional) };
}
function sum(values, unseen) {
    let total = integer(0);
    for (const value of values)
        total = arithmetic('+', total, numberValue(value));
    if (!unseen || total.measurement.status === 'unmeasurable')
        return total.measurement;
    const [lower] = bounds(total.measurement);
    return { status: 'unknown', ...(Number.isFinite(lower) ? { lower } : {}), reasons: mergeReasons(reasonsOf(total.measurement), [INCOMPLETE]) };
}
function membershipCount(observed, maximumUnseen, minimumUnseen = 0) {
    return interval(observed + minimumUnseen, Number.isFinite(maximumUnseen) ? observed + maximumUnseen : Infinity, [INCOMPLETE]);
}
function remainder(fileSet, observed) {
    if (fileSet.complete)
        return [0, 0];
    const [lo, hi] = bounds(fileSet.total);
    return [Math.max(0, lo - observed), Math.max(0, hi - observed)];
}
export function aggregateFiles(files, fileSet, options = {}) {
    const selected = files.filter(file => file.included), [unseenMin, unseenMax] = remainder(fileSet, files.length);
    const extra = options.noneIncluded ? 0 : unseenMax;
    const unseen = extra > 0;
    const raw = Object.fromEntries(RAW.map(key => [key, sum(selected.map(file => file.raw[key]), unseen)]));
    const lines = Object.fromEntries(LINES.map(key => [key, sum(selected.map(file => file.lines[key]), unseen)]));
    const counts = {};
    if (!options.scope) {
        counts.total = fileSet.total;
        counts.excluded = membershipCount(files.length - selected.length, options.allIncluded ? 0 : unseenMax, options.noneIncluded ? unseenMin : 0);
    }
    counts.included = membershipCount(selected.length, extra, options.allIncluded ? unseenMin : 0);
    for (const key of COUNTS)
        counts[key] = membershipCount(selected.filter(file => key === 'binary' ? file.kind === 'binary' : key === 'unmeasurable' ? file.measurement.status === 'unmeasurable' : file.changeType === key).length, extra);
    return { raw, lines, files: counts };
}
function normalizedFile(change, source, paths) {
    validatePath(change.path);
    if (change.oldPath !== undefined)
        validatePath(change.oldPath);
    const id = contentId('file', [source.comparisonId, change.path, change.oldPath ?? null]);
    const inclusion = selectPath(change, paths);
    const common = { id, path: change.path, ...(change.oldPath !== undefined ? { oldPath: change.oldPath } : {}), changeType: change.changeType, kind: change.kind, included: inclusion.included, inclusionReasons: inclusion.reasons };
    const reason = change.kind === 'binary' ? 'BINARY_LINES_UNDEFINED' : change.kind === 'submodule' ? 'SUBMODULE_LINES_UNDEFINED' : 'MATERIAL_KIND_UNKNOWN';
    if (change.kind !== 'text') {
        const missing = change.kind === 'unknown' ? { status: 'unknown', lower: 0, reasons: [{ code: reason }] } : { status: 'unmeasurable', reasons: [{ code: reason }] };
        return { ...common, raw: { added: missing, deleted: missing, churn: missing }, lines: { added: missing, deleted: missing, modified: missing, changed: missing }, measurement: summarizeMeasurements([missing]) };
    }
    const additions = change.additions ?? change.patch?.additions, deletions = change.deletions ?? change.patch?.deletions;
    if (additions === undefined || deletions === undefined) {
        const missing = { status: 'unknown', lower: 0, reasons: [{ code: change.incompleteReason ?? 'RAW_COUNTS_UNAVAILABLE' }] };
        return { ...common, raw: { added: missing, deleted: missing, churn: missing }, lines: { added: missing, deleted: missing, modified: missing, changed: missing }, measurement: summarizeMeasurements([missing]) };
    }
    if (change.patch && (change.patch.additions !== additions || change.patch.deletions !== deletions))
        fail('E_SOURCE', 'Patch counts disagree with source raw statistics.', 'source');
    if (change.patch) {
        let observedAdded = 0, observedDeleted = 0;
        for (const block of change.patch.blocks) {
            if (!Number.isSafeInteger(block.added) || !Number.isSafeInteger(block.deleted) || block.added < 0 || block.deleted < 0)
                fail('E_SOURCE', 'Invalid edit-block counts.', 'source');
            observedAdded += block.added;
            observedDeleted += block.deleted;
        }
        if (observedAdded !== additions || observedDeleted !== deletions)
            fail('E_SOURCE', 'Edit blocks disagree with patch raw counts.', 'source');
    }
    const familyId = contentId('family', [source.comparisonId, id, SEMANTICS.replacementLines]);
    const modified = change.patch?.blocks.reduce((value, block) => value + Math.min(block.added, block.deleted), 0);
    const family = replacementFamily(familyId, additions, deletions, modified);
    const raw = Object.fromEntries(RAW.map(key => [key, family.raw[key].measurement]));
    const lines = Object.fromEntries(LINES.map(key => [key, family.lines[key].measurement]));
    return { ...common, raw, lines, family: { id: familyId, rawCountsExact: true, blocksComplete: change.patch !== undefined },
        measurement: summarizeMeasurements(Object.values(lines), change.patch ? [] : [{ code: change.incompleteReason ?? 'PATCH_INCOMPLETE' }]) };
}
function orderedFiles(files) {
    return [...files].sort((a, b) => compareScalarStrings(a.path, b.path) || compareScalarStrings(a.oldPath ?? '', b.oldPath ?? '') || compareScalarStrings(a.id, b.id));
}
export function analyzeChanges(changes, options = {}) {
    return capture(() => {
        const source = options.source ?? { kind: 'unified-diff', comparison: 'supplied', comparisonId: contentId('comparison', changes) };
        const paths = compilePathPolicy(options.paths);
        const files = orderedFiles(changes.map(change => normalizedFile(change, source, paths)));
        const ids = new Set(files.map(file => file.id));
        if (ids.size !== files.length)
            fail('E_SOURCE', 'A source supplied duplicate changed files.', 'source');
        const fileSet = readFileSet(options.fileSet ?? { complete: true, total: exact(files.length) }, files.length);
        const allIncluded = paths.includeOnly === undefined && paths.exclude.length === 0;
        const noneIncluded = paths.includeOnly?.length === 0 && paths.forceInclude.length === 0;
        const totals = aggregateFiles(files, fileSet, { allIncluded, noneIncluded });
        let report = { kind: 'diffdevil.report', schemaVersion: '1.0', semantics: SEMANTICS, source, fileSet, files, totals,
            measurement: summarizeMeasurements([...Object.values(totals.raw), ...Object.values(totals.lines), ...Object.values(totals.files)], mergeReasons(...files.filter(file => file.included).map(file => file.measurement.reasons), fileSet.complete ? [] : [INCOMPLETE])) };
        if (options.scopes)
            report = attachScopes(report, options.scopes);
        return deepFreeze({ ...report, reportId: contentId('report', report) });
    });
}
export function analyzeDiff(text, options = {}) {
    return capture(() => {
        const result = analyzeChanges(parseUnifiedDiff(text), { ...options, source: options.source ?? { kind: 'unified-diff', comparison: 'supplied', comparisonId: contentId('comparison', text) } });
        if (!result.ok)
            fail(result.diagnostics[0].code, result.diagnostics[0].message, result.diagnostics[0].phase);
        return result.value;
    });
}
export function attachScopes(report, definitions) {
    const scopes = Object.create(null);
    for (const [name, definition] of Object.entries(definitions)) {
        const policy = compilePathPolicy(definition);
        const selected = report.files.filter(file => file.included && selectPath(file, policy, true).included);
        const complete = report.fileSet.complete || policy.includeOnly?.length === 0;
        const extra = complete ? 0 : remainder(report.fileSet, report.files.length)[1];
        const fileSet = { complete, total: membershipCount(selected.length, extra) };
        scopes[name] = { fileIds: selected.map(file => file.id), fileSet, totals: aggregateFiles(selected, fileSet, { scope: true, allIncluded: true }) };
    }
    return { ...report, scopes };
}
export function withPathPolicy(report, policy = {}, scopes = {}) {
    const compiled = compilePathPolicy(policy);
    const files = report.files.map(file => { const selection = selectPath(file, compiled); return { ...file, included: selection.included, inclusionReasons: selection.reasons }; });
    const totals = aggregateFiles(files, report.fileSet, { allIncluded: compiled.includeOnly === undefined && compiled.exclude.length === 0, noneIncluded: compiled.includeOnly?.length === 0 && compiled.forceInclude.length === 0 });
    const base = { kind: report.kind, schemaVersion: report.schemaVersion, semantics: report.semantics, source: report.source, fileSet: report.fileSet, files, totals,
        measurement: summarizeMeasurements([...Object.values(totals.raw), ...Object.values(totals.lines), ...Object.values(totals.files)], mergeReasons(...files.filter(f => f.included).map(f => f.measurement.reasons))) };
    const result = attachScopes(base, scopes);
    return { ...result, reportId: contentId('report', result) };
}
function readRaw(input) { const r = record(input, 'Raw measurements'); return { added: validateMeasurement(r.added, 'integer', true), deleted: validateMeasurement(r.deleted, 'integer', true), churn: validateMeasurement(r.churn, 'integer', true) }; }
function readLines(input) { const r = record(input, 'Line measurements'); return { added: validateMeasurement(r.added, 'integer', true), deleted: validateMeasurement(r.deleted, 'integer', true), modified: validateMeasurement(r.modified, 'integer', true), changed: validateMeasurement(r.changed, 'integer', true) }; }
function readFileSet(input, count) {
    const value = record(input, 'File set');
    if (typeof value.complete !== 'boolean')
        fail('E_REPORT_INVALID', 'File-set completeness must be boolean.', 'source');
    const total = validateMeasurement(value.total, 'integer', true);
    if (total.status === 'unmeasurable')
        fail('E_REPORT_INVALID', 'File cardinality is not unmeasurable.', 'source');
    const [lo, hi] = bounds(total);
    if (hi < count || (value.complete && (total.status !== 'exact' || total.value !== count)))
        fail('E_REPORT_INVALID', 'File cardinality contradicts the observed file list.', 'source');
    if (!value.complete && lo === hi && hi === count)
        fail('E_REPORT_INVALID', 'An incomplete file list cannot claim all identities are observed.', 'source');
    return { complete: value.complete, total };
}
function readTotals(input, scope = false) {
    const value = record(input, 'Totals'), inputFiles = record(value.files, 'File counts');
    const files = Object.create(null);
    for (const key of [...(scope ? [] : ['total', 'excluded']), 'included', ...COUNTS]) {
        files[key] = validateMeasurement(inputFiles[key], 'integer', true);
        if (files[key].status === 'unmeasurable')
            fail('E_REPORT_INVALID', 'File counts cannot be unmeasurable.', 'source');
    }
    return { raw: readRaw(value.raw), lines: readLines(value.lines), files };
}
function equivalent(a, b) { return canonicalJson(a) === canonicalJson(b); }
function readFile(input) {
    const value = record(input, 'File'), id = string(value.id, 'File ID'), path = validatePath(string(value.path, 'File path'));
    if (!id)
        fail('E_REPORT_INVALID', 'File ID cannot be empty.', 'source');
    if (!['added', 'deleted', 'modified', 'renamed', 'copied', 'type-changed', 'unmerged'].includes(String(value.changeType)))
        fail('E_REPORT_INVALID', 'Unsupported file change type.', 'source');
    if (!['text', 'binary', 'submodule', 'unknown'].includes(String(value.kind)) || typeof value.included !== 'boolean')
        fail('E_REPORT_INVALID', 'Invalid file material kind or inclusion state.', 'source');
    const raw = readRaw(value.raw), lines = readLines(value.lines);
    let family;
    if (value.family !== undefined) {
        const f = record(value.family, 'Primitive family');
        if (value.kind !== 'text' || typeof f.rawCountsExact !== 'boolean' || typeof f.blocksComplete !== 'boolean')
            fail('E_REPORT_INVALID', 'Invalid text primitive provenance.', 'source');
        family = { id: string(f.id, 'Family ID'), rawCountsExact: f.rawCountsExact, blocksComplete: f.blocksComplete };
        if (!family.id)
            fail('E_REPORT_INVALID', 'Family ID cannot be empty.', 'source');
        if (family.rawCountsExact) {
            if (raw.added.status !== 'exact' || raw.deleted.status !== 'exact')
                fail('E_REPORT_INVALID', 'Exact raw family has unresolved raw counts.', 'source');
            if (family.blocksComplete && lines.modified.status !== 'exact')
                fail('E_REPORT_INVALID', 'Complete edit blocks have an unresolved modified count.', 'source');
            const expected = replacementFamily(family.id, raw.added.value, raw.deleted.value, family.blocksComplete && lines.modified.status === 'exact' ? lines.modified.value : undefined);
            for (const key of RAW)
                if (!equivalent(raw[key], expected.raw[key].measurement))
                    fail('E_REPORT_INVALID', `Raw ${key} contradicts primitive provenance.`, 'source');
            for (const key of LINES)
                if (!equivalent(lines[key], expected.lines[key].measurement))
                    fail('E_REPORT_INVALID', `Replacement-aware ${key} contradicts primitive provenance.`, 'source');
        }
    }
    if (value.kind === 'text' && raw.added.status === 'exact' && raw.deleted.status === 'exact' && lines.modified.status === 'exact' && Object.values(lines).every(m => m.status === 'exact')) {
        const expected = replacementFamily('validation', raw.added.value, raw.deleted.value, lines.modified.value);
        for (const key of RAW)
            if (!equivalent(raw[key], expected.raw[key].measurement))
                fail('E_REPORT_INVALID', 'Exact raw counts violate the replacement identities.', 'source');
        for (const key of LINES)
            if (!equivalent(lines[key], expected.lines[key].measurement))
                fail('E_REPORT_INVALID', 'Exact line counts violate the replacement identities.', 'source');
    }
    const measured = summary(value.measurement);
    const expectedStatus = summarizeMeasurements([...Object.values(raw), ...Object.values(lines)]).status;
    if (measured.status !== expectedStatus)
        fail('E_REPORT_INVALID', 'File measurement summary contradicts its values.', 'source');
    if ((value.kind === 'binary' || value.kind === 'submodule') && Object.values(lines).some(m => m.status !== 'unmeasurable'))
        fail('E_REPORT_INVALID', 'Material without text-line semantics cannot carry applicable line counts.', 'source');
    return { id, path, ...(value.oldPath !== undefined ? { oldPath: validatePath(string(value.oldPath, 'Old path')) } : {}), changeType: value.changeType, kind: value.kind, included: value.included, raw, lines, measurement: measured,
        ...(family ? { family } : {}), ...(value.inclusionReasons !== undefined ? { inclusionReasons: readReasons(value.inclusionReasons) } : {}) };
}
function assertTotals(actual, expected, complete) {
    for (const group of ['raw', 'lines', 'files']) {
        const values = actual[group], required = expected[group];
        for (const key of Object.keys(required)) {
            const a = values[key], b = required[key];
            if (complete) {
                if (!equivalent(a, b))
                    fail('E_REPORT_INVALID', `Complete ${group}.${key} total disagrees with file evidence.`, 'source');
            }
            else {
                if (b.status === 'unmeasurable' && a.status !== 'unmeasurable')
                    fail('E_REPORT_INVALID', 'Totals erase an observed unmeasurable contribution.', 'source');
                if (a.status !== 'unmeasurable' && b.status !== 'unmeasurable') {
                    const [al, ah] = bounds(a), [bl, bh] = bounds(b);
                    if (ah < bl || al > bh || al < bl)
                        fail('E_REPORT_INVALID', `Incomplete ${group}.${key} total contradicts observed contributions.`, 'source');
                }
            }
        }
    }
}
/** Shared source identity validation for reports and effect plans. */
export function readSourceIdentity(input) {
    const s = record(input, 'Source');
    if (!['git', 'unified-diff', 'github-api'].includes(String(s.kind)))
        fail('E_REPORT_INVALID', 'Unsupported source kind.', 'source');
    const comparisonId = string(s.comparisonId, 'Comparison ID');
    if (!comparisonId)
        fail('E_REPORT_INVALID', 'Comparison ID is empty.', 'source');
    if (s.comparison !== undefined && !['three-dot', 'direct', 'worktree', 'staged', 'supplied'].includes(String(s.comparison)))
        fail('E_REPORT_INVALID', 'Unsupported comparison mode.', 'source');
    if (s.pullRequest !== undefined && (typeof s.pullRequest !== 'number' || !Number.isSafeInteger(s.pullRequest) || s.pullRequest <= 0))
        fail('E_REPORT_INVALID', 'Pull-request number must be a positive integer.', 'source');
    const source = { kind: s.kind, comparisonId,
        ...(s.base !== undefined ? { base: string(s.base, 'Base revision') } : {}),
        ...(s.baseTip !== undefined ? { baseTip: string(s.baseTip, 'Base tip revision') } : {}), ...(s.head !== undefined ? { head: string(s.head, 'Head revision') } : {}),
        ...(s.repository !== undefined ? { repository: string(s.repository, 'Repository') } : {}),
        ...(s.comparison !== undefined ? { comparison: s.comparison } : {}),
        ...(s.pullRequest !== undefined ? { pullRequest: s.pullRequest } : {}) };
    return source;
}
/** Read, copy, validate and freeze a report. A content hash is not authentication. */
export function readReport(input) {
    return capture(() => {
        let decoded = input;
        if (typeof input === 'string') {
            try {
                decoded = JSON.parse(input);
            }
            catch {
                fail('E_REPORT_INVALID', 'Report is not valid JSON.', 'source');
            }
        }
        const value = record(inertCopy(decoded), 'Report');
        if (value.kind !== 'diffdevil.report' || value.schemaVersion !== '1.0')
            fail('E_VERSION', 'Unsupported report kind or schema version.', 'source');
        const semantics = record(value.semantics, 'Semantics');
        for (const [key, expected] of Object.entries(SEMANTICS))
            if (semantics[key] !== expected)
                fail('E_VERSION', `Unsupported ${key} semantic profile.`, 'source');
        assertSchema('report', value);
        const source = readSourceIdentity(value.source);
        const files = orderedFiles(array(value.files, 'Files').map(readFile));
        if (new Set(files.map(f => f.id)).size !== files.length || new Set(files.map(f => f.path)).size !== files.length)
            fail('E_REPORT_INVALID', 'Duplicate file IDs or paths.', 'source');
        const families = files.flatMap(f => f.family ? [f.family.id] : []);
        if (new Set(families).size !== families.length)
            fail('E_REPORT_INVALID', 'Unrelated files share a primitive family.', 'source');
        const fileSet = readFileSet(value.fileSet, files.length), totals = readTotals(value.totals);
        if (!equivalent(fileSet.total, totals.files.total))
            fail('E_REPORT_INVALID', 'Total file count disagrees with file-set cardinality.', 'source');
        assertTotals(totals, aggregateFiles(files, fileSet), fileSet.complete);
        const measured = summary(value.measurement);
        if (measured.status !== summarizeMeasurements([...Object.values(totals.raw), ...Object.values(totals.lines), ...Object.values(totals.files)]).status)
            fail('E_REPORT_INVALID', 'Overall measurement summary contradicts aggregate evidence.', 'source');
        const scopes = Object.create(null);
        if (value.scopes !== undefined)
            for (const [name, item] of Object.entries(record(value.scopes, 'Scopes'))) {
                if (!name)
                    fail('E_REPORT_INVALID', 'Scope IDs cannot be empty.', 'source');
                const scope = record(item, `Scope ${name}`), ids = array(scope.fileIds, 'Scope file IDs').map(id => string(id, 'Scope file ID'));
                if (new Set(ids).size !== ids.length)
                    fail('E_REPORT_INVALID', 'Scope has duplicate file IDs.', 'source');
                const selected = ids.map(id => { const file = files.find(f => f.id === id); if (!file || !file.included)
                    fail('E_REPORT_INVALID', 'Scope references an absent or globally excluded file.', 'source'); return file; });
                const set = readFileSet(scope.fileSet, ids.length), scopeTotals = readTotals(scope.totals, true);
                assertTotals(scopeTotals, aggregateFiles(selected, set, { scope: true, allIncluded: true }), set.complete);
                scopes[name] = { fileIds: orderedFiles(selected).map(f => f.id), fileSet: set, totals: scopeTotals };
            }
        const metrics = Object.create(null);
        const metricTypes = Object.create(null);
        if (value.metrics !== undefined) {
            const declared = record(value.metricTypes, 'Metric types');
            for (const [name, metric] of Object.entries(record(value.metrics, 'Metrics'))) {
                if (!name)
                    fail('E_REPORT_INVALID', 'Metric IDs cannot be empty.', 'source');
                const type = declared[name];
                if (type !== 'integer' && type !== 'float')
                    fail('E_REPORT_INVALID', `Metric ${name} requires an explicit integer or float type.`, 'source');
                metrics[name] = validateMeasurement(metric, type);
                metricTypes[name] = type;
            }
            if (Object.keys(declared).some(name => !Object.hasOwn(metrics, name)))
                fail('E_REPORT_INVALID', 'Metric types name an absent metric.', 'source');
        }
        else if (value.metricTypes !== undefined)
            fail('E_REPORT_INVALID', 'Metric types require metrics.', 'source');
        return deepFreeze({ kind: 'diffdevil.report', schemaVersion: '1.0', semantics: { ...SEMANTICS,
                ...(semantics.presets !== undefined ? { presets: array(semantics.presets, 'Preset identities').map(x => string(x, 'Preset identity')) } : {}),
                ...(semantics.limits !== undefined ? { limits: string(semantics.limits, 'Limit profile') } : {}) }, source, measurement: measured, fileSet, totals, files,
            ...(value.scopes !== undefined ? { scopes } : {}), ...(value.metrics !== undefined ? { metrics, metricTypes } : {}),
            ...(value.bands !== undefined ? { bands: namedResults(value.bands, readBand) } : {}), ...(value.rules !== undefined ? { rules: namedResults(value.rules, readRule) } : {}),
            ...(value.reportId !== undefined ? { reportId: string(value.reportId, 'Report ID') } : {}), ...(value.policyId !== undefined ? { policyId: string(value.policyId, 'Policy ID') } : {}) });
    });
}
//# sourceMappingURL=report.js.map