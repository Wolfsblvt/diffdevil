// SPDX-License-Identifier: MIT
import { capture, unwrap } from '../errors.js';
import { contentId, deepFreeze } from '../inert.js';
import { aggregateFiles, readReport, summarizeMeasurements } from '../report.js';
import { evaluatePolicy } from '../policy/evaluate.js';
export const HUMAN_VIEW_VERSION = 'diffdevil.human-view/1';
/** A file projection preserves its evidence, then evaluates the same policy on its own facts. */
function fileReport(report, file) {
    const fileSet = { complete: true, total: { status: 'exact', value: 1 } };
    const totals = aggregateFiles([file], fileSet);
    const body = { kind: report.kind, schemaVersion: report.schemaVersion, semantics: report.semantics, source: report.source, files: [file], fileSet, totals,
        measurement: summarizeMeasurements([...Object.values(totals.raw), ...Object.values(totals.lines), ...Object.values(totals.files)], file.included ? file.measurement.reasons : []) };
    return unwrap(readReport({ ...body, reportId: contentId('report', body) }));
}
function rails(report, policy) {
    return Object.entries(policy.document.bands ?? {}).map(([id, definition]) => {
        const decision = report.bands?.[id];
        const selected = decision?.status === 'resolved' ? decision.id : undefined;
        const rule = Object.values(policy.document.rules ?? {}).find(rule => 'band' in rule && rule.band === id && rule.effects?.labels && 'byBand' in rule.effects.labels);
        const mapping = rule?.effects?.labels;
        let lower = definition.minimum;
        const cells = definition.ranges.map(range => {
            const label = mapping?.byBand[range.id];
            const color = label ? policy.document.labelDefinitions?.[label]?.color : undefined;
            const result = { id: range.id, name: label ?? range.id, selected: selected === range.id,
                ...(lower === undefined ? {} : { lower }), ...(range.lt === undefined ? {} : { upper: range.lt }),
                ...(label === undefined ? {} : { label }), ...(color === undefined ? {} : { color }) };
            lower = range.lt;
            return result;
        });
        const label = selected === undefined ? undefined : mapping?.byBand[selected];
        return { id, expression: definition.value, cells, ...(selected === undefined ? {} : { selected }), ...(label === undefined ? {} : { label }),
            ...(mapping ? { group: mapping.group, members: policy.document.labelGroups?.[mapping.group] ?? [] } : {}) };
    });
}
/** Shared, typed human projection. DOM and CLI hosts never recompute Changed. */
export function humanReport(input, policy, path, errors = []) {
    return capture(() => {
        const parent = unwrap(readReport(input));
        const file = path === undefined ? undefined : parent.files.find(item => item.path === path);
        if (path !== undefined && !file)
            throw new Error('The requested file is absent from this comparison.');
        let report = file ? fileReport(parent, file) : parent;
        if (policy)
            report = unwrap(evaluatePolicy(policy.program, report)).report;
        const focus = file ? report.files[0] : undefined;
        const lines = focus?.lines ?? report.totals.lines;
        return deepFreeze({ kind: HUMAN_VIEW_VERSION, report, ...(focus ? { focus } : {}), changed: lines.changed, added: lines.added, deleted: lines.deleted, modified: lines.modified,
            raw: focus?.raw ?? report.totals.raw, evidence: focus?.measurement ?? report.measurement, rails: policy && focus?.included !== false ? rails(report, policy) : [],
            ...(policy ? { policy: { digest: policy.digest, mode: policy.mode, origins: policy.origins, layers: policy.layers } } : {}), errors });
    });
}
//# sourceMappingURL=view.js.map