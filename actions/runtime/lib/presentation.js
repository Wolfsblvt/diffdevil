const ESC = '\u001b[';
const RESET = `${ESC}0m`;
const palette = {
    brand: '38;2;240;97;186',
    added: '38;2;143;214;170',
    deleted: '38;2;255;159;176',
};
function ansi(text, enabled, ...codes) {
    return enabled ? `${ESC}${codes.join(';')}m${text}${RESET}` : text;
}
export function paintBrand(text, enabled = false) { return ansi(text, enabled, palette.brand, '1'); }
export function paintAdded(text, enabled = false) { return ansi(text, enabled, palette.added, '1'); }
export function paintDeleted(text, enabled = false) { return ansi(text, enabled, palette.deleted, '1'); }
export function paintPrimary(text, enabled = false) { return ansi(text, enabled, '1'); }
export function paintStrong(text, enabled = false) { return ansi(text, enabled, '1'); }
export function paintQuiet(text, enabled = false) { return ansi(text, enabled, '2'); }
export function evidenceLabel(status) {
    switch (status) {
        case 'exact': return '= exact';
        case 'bounded': return '≈ bounded';
        case 'unknown': return '? unknown';
        case 'unmeasurable': return '∅ unmeasurable';
    }
}
export function reasonCodes(reasons) {
    return reasons.map(reason => reason.subject ? `${reason.code} (${reason.subject})` : reason.code);
}
function measurementReasons(value) {
    return value.status === 'unknown' || value.status === 'unmeasurable' ? value.reasons : [];
}
/** Human measurements stay compact while making locally different non-exact standing explicit. */
export function humanMeasurement(value, surrounding) {
    switch (value.status) {
        case 'exact': return String(value.value);
        case 'bounded': return `${value.lower}–${value.upper}${surrounding === 'bounded' ? '' : ' (≈ bounded)'}`;
        case 'unknown': {
            const bounds = [value.lower === undefined ? undefined : `≥ ${value.lower}`, value.upper === undefined ? undefined : `≤ ${value.upper}`]
                .filter((part) => part !== undefined).join(', ');
            return `${bounds || 'value unavailable'}${surrounding === 'unknown' ? '' : ' (? unknown)'}`;
        }
        case 'unmeasurable': return '∅ unmeasurable';
    }
}
export function humanSignedMeasurement(sign, value, surrounding) {
    if (value.status === 'unmeasurable')
        return humanMeasurement(value, surrounding);
    return `${sign}${humanMeasurement(value, surrounding)}`;
}
export function agentMeasurement(value) {
    switch (value.status) {
        case 'exact': return String(value.value);
        case 'bounded': return `bounded(${value.lower},${value.upper})`;
        case 'unknown': {
            const parts = [];
            if (value.lower !== undefined)
                parts.push(`lower=${value.lower}`);
            if (value.upper !== undefined)
                parts.push(`upper=${value.upper}`);
            parts.push(`reasons=${JSON.stringify(value.reasons)}`);
            return `unknown(${parts.join(',')})`;
        }
        case 'unmeasurable': return `unmeasurable(reasons=${JSON.stringify(value.reasons)})`;
    }
}
export function measurementReasonSuffix(value) {
    const reasons = measurementReasons(value);
    return reasons.length ? ` · ${reasonCodes(reasons).join(', ')}` : '';
}
export function humanSource(source) {
    let subject;
    if (source.repository && source.pullRequest !== undefined)
        subject = `${source.repository}#${source.pullRequest}`;
    else if (source.base && source.head)
        subject = `${source.base}..${source.head}`;
    else
        subject = source.comparisonId;
    return [source.kind, subject, source.comparison ?? 'supplied'].join(' · ');
}
export function agentSource(source) {
    const fields = [`kind=${source.kind}`, `comparison=${source.comparison ?? 'supplied'}`, `id=${JSON.stringify(source.comparisonId)}`];
    if (source.base !== undefined)
        fields.push(`base=${JSON.stringify(source.base)}`);
    if (source.head !== undefined)
        fields.push(`head=${JSON.stringify(source.head)}`);
    if (source.baseTip !== undefined)
        fields.push(`base_tip=${JSON.stringify(source.baseTip)}`);
    if (source.repository !== undefined)
        fields.push(`repository=${JSON.stringify(source.repository)}`);
    if (source.pullRequest !== undefined)
        fields.push(`pull_request=${source.pullRequest}`);
    return fields.join(' ');
}
export function agentSemantics(semantics) {
    const fields = [
        `language=${semantics.language}`,
        `numbers=${semantics.numbers}`,
        `replacement_lines=${semantics.replacementLines}`,
        `paths=${semantics.paths}`,
    ];
    if (semantics.presets !== undefined)
        fields.push(`presets=${JSON.stringify(semantics.presets)}`);
    if (semantics.limits !== undefined)
        fields.push(`limits=${JSON.stringify(semantics.limits)}`);
    return fields.join(' ');
}
export function humanBand(value) {
    if (value.status === 'resolved')
        return value.id;
    return `? unknown; candidates ${value.candidates.map(candidate => JSON.stringify(candidate)).join(', ') || 'none'}${value.reasons.length ? ` · ${reasonCodes(value.reasons).join(', ')}` : ''}`;
}
export function agentBand(value) {
    if (value.status === 'resolved') {
        const fields = [JSON.stringify(value.id)];
        if (value.lower !== undefined)
            fields.push(`lower=${value.lower}`);
        if (value.upper !== undefined)
            fields.push(`upper=${value.upper}`);
        return `resolved(${fields.join(',')})`;
    }
    return `unknown(candidates=${JSON.stringify(value.candidates)},reasons=${JSON.stringify(value.reasons)})`;
}
export function agentDecision(value) {
    return value.status === 'resolved' ? String(value.value) : `unknown(reasons=${JSON.stringify(value.reasons)})`;
}
export function humanRule(value) {
    const parts = [value.disposition];
    if (value.decision !== undefined)
        parts.push(value.decision.status === 'resolved' ? `decision ${value.decision.value}` : `decision ? unknown${value.decision.reasons.length ? ` · ${reasonCodes(value.decision.reasons).join(', ')}` : ''}`);
    if (value.band !== undefined)
        parts.push(`band ${humanBand(value.band)}`);
    return parts.join(' · ');
}
export function agentRule(id, value) {
    const fields = [`id=${JSON.stringify(id)}`, `disposition=${value.disposition}`];
    if (value.decision !== undefined)
        fields.push(`decision=${agentDecision(value.decision)}`);
    if (value.band !== undefined)
        fields.push(`band=${agentBand(value.band)}`);
    return fields.join(' ');
}
export function humanIdentifier(value) {
    return /^[A-Za-z_][A-Za-z0-9_.\/-]*$/u.test(value) ? value : JSON.stringify(value);
}
export function padLabel(value, width = 11) { return value.padEnd(width); }
//# sourceMappingURL=presentation.js.map