/** Formatting only; hosts do not recalculate evidence or classify bands. */
export function measurementText(value) {
    const n = (value) => new Intl.NumberFormat('en').format(value);
    switch (value.status) {
        case 'exact': return n(value.value);
        case 'bounded': return `${n(value.lower)}–${n(value.upper)}`;
        case 'unknown': return value.lower === undefined ? '?' : `≥${n(value.lower)}`;
        case 'unmeasurable': return '∅';
    }
}
export function evidenceText(status) { return `${{ exact: '=', bounded: '≈', unknown: '?', unmeasurable: '∅' }[status]} ${status}`; }
//# sourceMappingURL=text.js.map