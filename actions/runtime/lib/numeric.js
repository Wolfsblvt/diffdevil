import { fail } from './errors.js';
const MAX = BigInt(Number.MAX_SAFE_INTEGER);
export const exact = (value) => ({ status: 'exact', value: Object.is(value, -0) ? 0 : value });
export const resolved = (value) => ({ status: 'resolved', value });
export const unknownDecision = (reasons) => ({ status: 'unknown', reasons: reasons.length ? reasons : [{ code: 'INTERVAL_COMPARISON' }] });
export function reasonsOf(measurement) {
    return measurement.status === 'unknown' || measurement.status === 'unmeasurable' ? measurement.reasons : [];
}
export function mergeReasons(...groups) {
    const found = new Map();
    for (const reasons of groups)
        for (const reason of reasons)
            found.set(`${reason.code}\0${reason.subject ?? ''}`, reason);
    return [...found.values()];
}
export function bounds(measurement) {
    switch (measurement.status) {
        case 'exact': return [measurement.value, measurement.value];
        case 'bounded': return [measurement.lower, measurement.upper];
        case 'unknown': return [measurement.lower ?? -Infinity, measurement.upper ?? Infinity];
        case 'unmeasurable': return [-Infinity, Infinity];
    }
}
export function interval(lower, upper, reasons = [{ code: 'UNKNOWN_VALUE' }]) {
    if (Number.isNaN(lower) || Number.isNaN(upper) || lower > upper)
        fail('E_INTERNAL', 'Invalid numeric interval.');
    if (Number.isFinite(lower) && Number.isFinite(upper))
        return lower === upper ? exact(lower) : { status: 'bounded', lower: lower === 0 ? 0 : lower, upper: upper === 0 ? 0 : upper };
    return { status: 'unknown', reasons: reasons.length ? reasons : [{ code: 'UNKNOWN_VALUE' }], ...(Number.isFinite(lower) ? { lower } : {}), ...(Number.isFinite(upper) ? { upper } : {}) };
}
export function checkedInteger(value, code = 'E_NUMERIC_OVERFLOW') {
    if (!Number.isSafeInteger(value))
        fail(code, 'Integer is outside the safe integer domain.');
    return value === 0 ? 0 : value;
}
function checkedBigint(value, possible) {
    if (value > MAX || value < -MAX)
        fail(possible ? 'E_POSSIBLE_DOMAIN' : 'E_NUMERIC_OVERFLOW', 'Arithmetic exceeds the safe integer domain.');
    return Number(value);
}
export function numberValue(measurement, numericType = 'integer') {
    const result = { kind: 'number', numericType, measurement };
    if (measurement.status === 'exact') {
        if (!Number.isFinite(measurement.value) || (numericType === 'integer' && !Number.isSafeInteger(measurement.value)))
            fail('E_NUMERIC_OVERFLOW', 'Numeric value is outside its finite domain.');
        if (numericType === 'integer')
            affineForms.set(result, { constant: BigInt(measurement.value), terms: new Map() });
    }
    return result;
}
export const integer = (value) => numberValue(exact(checkedInteger(value)));
// Provenance is request-local, never accepted as a user-supplied expression object.
const affineForms = new WeakMap();
function affineBounds(form) {
    let lower = form.constant, upper = form.constant;
    for (const term of form.terms.values()) {
        const a = term.coefficient * term.lower, b = term.coefficient * term.upper;
        lower += a < b ? a : b;
        upper += a > b ? a : b;
    }
    return [lower, upper];
}
function affineValue(form) {
    const [lower, upper] = affineBounds(form);
    const outside = upper < -MAX || lower > MAX;
    if (outside)
        fail('E_NUMERIC_OVERFLOW', 'Every possible arithmetic result exceeds the safe integer domain.');
    const result = numberValue(interval(checkedBigint(lower, lower !== upper), checkedBigint(upper, lower !== upper)));
    affineForms.set(result, form);
    return result;
}
function combineForms(left, right, sign) {
    const terms = new Map(left.terms);
    for (const [key, term] of right.terms) {
        const old = terms.get(key);
        if (old && (old.lower !== term.lower || old.upper !== term.upper))
            fail('E_REPORT_INVALID', 'A primitive family has inconsistent domains.', 'source');
        const coefficient = (old?.coefficient ?? 0n) + sign * term.coefficient;
        if (coefficient === 0n)
            terms.delete(key);
        else
            terms.set(key, { ...term, coefficient });
    }
    return { constant: left.constant + sign * right.constant, terms };
}
function scaleForm(form, coefficient) {
    return { constant: form.constant * coefficient, terms: new Map([...form.terms].flatMap(([key, term]) => coefficient === 0n ? [] : [[key, { ...term, coefficient: term.coefficient * coefficient }]])) };
}
/** Construct the finite primitive correlation model from validated text counts. */
export function replacementFamily(id, additions, deletions, modified) {
    checkedInteger(additions);
    checkedInteger(deletions);
    if (additions < 0 || deletions < 0 || (modified !== undefined && (!Number.isSafeInteger(modified) || modified < 0 || modified > Math.min(additions, deletions))))
        fail('E_REPORT_INVALID', 'Invalid replacement family counts.', 'source');
    const rawAdded = integer(additions), rawDeleted = integer(deletions);
    const rawChurn = arithmetic('+', rawAdded, rawDeleted);
    let m;
    if (modified !== undefined)
        m = integer(modified);
    else
        m = affineValue({ constant: 0n, terms: new Map([[id, { coefficient: 1n, lower: 0n, upper: BigInt(Math.min(additions, deletions)) }]]) });
    return { raw: { added: rawAdded, deleted: rawDeleted, churn: rawChurn }, lines: {
            added: arithmetic('-', rawAdded, m), deleted: arithmetic('-', rawDeleted, m), modified: m, changed: arithmetic('-', rawChurn, m),
        } };
}
function endpoint(op, a, b, type, possible) {
    if (Number.isFinite(a) && Number.isFinite(b)) {
        if (type === 'integer') {
            const x = BigInt(a), y = BigInt(b);
            return checkedBigint(op === '+' ? x + y : op === '-' ? x - y : op === '*' ? x * y : x % y, possible);
        }
        const value = op === '+' ? a + b : op === '-' ? a - b : op === '*' ? a * b : op === '/' ? a / b : a % b;
        if (!Number.isFinite(value))
            fail(possible ? 'E_POSSIBLE_DOMAIN' : 'E_NUMERIC_OVERFLOW', 'Arithmetic has a non-finite result.');
        return value === 0 ? 0 : value;
    }
    if (op === '*' && (a === 0 || b === 0))
        return 0;
    return op === '+' ? a + b : op === '-' ? a - b : op === '*' ? a * b : a / b;
}
export function arithmetic(op, left, right) {
    const type = op === '/' || left.numericType === 'float' || right.numericType === 'float' ? 'float' : 'integer';
    if (op === '%' && type !== 'integer')
        fail('E_TYPE', 'Remainder requires integer operands.', 'type');
    const lm = left.measurement, rm = right.measurement;
    if (lm.status === 'unmeasurable' || rm.status === 'unmeasurable')
        return numberValue({ status: 'unmeasurable', reasons: mergeReasons(reasonsOf(lm), reasonsOf(rm)) }, type);
    const [a, b] = bounds(lm), [c, d] = bounds(rm);
    const bothExact = lm.status === 'exact' && rm.status === 'exact';
    if (op === '/' || op === '%') {
        if (rm.status === 'exact' && rm.value === 0)
            fail('E_DIVIDE_ZERO', 'The divisor is exactly zero.');
        if (c <= 0 && d >= 0)
            fail('E_POSSIBLE_DOMAIN', 'The divisor may be zero.');
    }
    const lf = affineForms.get(left), rf = affineForms.get(right);
    if (type === 'integer' && lf && rf) {
        if (op === '+' || op === '-')
            return affineValue(combineForms(lf, rf, op === '+' ? 1n : -1n));
        if (op === '*' && lm.status === 'exact')
            return affineValue(scaleForm(rf, BigInt(lm.value)));
        if (op === '*' && rm.status === 'exact')
            return affineValue(scaleForm(lf, BigInt(rm.value)));
    }
    if (bothExact)
        return numberValue(exact(endpoint(op, a, c, type, false)), type);
    const reasons = mergeReasons(reasonsOf(lm), reasonsOf(rm));
    if (op === '%') {
        const magnitude = Math.max(Math.abs(c), Math.abs(d)) - 1;
        const lower = a >= 0 ? 0 : Math.max(a, -magnitude);
        const upper = b <= 0 ? 0 : Math.min(b, magnitude);
        return numberValue(interval(lower, upper, reasons), type);
    }
    let values;
    if (op === '+')
        values = [endpoint(op, a, c, type, true), endpoint(op, b, d, type, true)];
    else if (op === '-')
        values = [endpoint(op, a, d, type, true), endpoint(op, b, c, type, true)];
    else
        values = [endpoint(op, a, c, type, true), endpoint(op, a, d, type, true), endpoint(op, b, c, type, true), endpoint(op, b, d, type, true)];
    if (values.some(Number.isNaN))
        return numberValue({ status: 'unknown', reasons: reasons.length ? reasons : [{ code: 'UNKNOWN_VALUE' }] }, type);
    return numberValue(interval(Math.min(...values), Math.max(...values), reasons), type);
}
export function negate(value) { return arithmetic('*', integer(-1), value); }
export function numericComparison(op, left, right) {
    if (left.measurement.status === 'unmeasurable' || right.measurement.status === 'unmeasurable')
        return unknownDecision(mergeReasons(reasonsOf(left.measurement), reasonsOf(right.measurement)));
    let [a, b] = bounds(left.measurement), [c, d] = bounds(right.measurement);
    const lf = affineForms.get(left), rf = affineForms.get(right);
    if (left.numericType === 'integer' && right.numericType === 'integer' && lf && rf) {
        const [lo, hi] = affineBounds(combineForms(lf, rf, -1n));
        // A comparison is not an authored subtraction: wide differences are valid.
        if (op === '==')
            return lo === 0n && hi === 0n ? resolved(true) : hi < 0n || lo > 0n ? resolved(false) : unknownDecision([{ code: 'INTERVAL_COMPARISON' }]);
        if (op === '!=') {
            const eq = numericComparison('==', left, right);
            return eq.status === 'resolved' ? resolved(!eq.value) : eq;
        }
        if (op === '<')
            return hi < 0n ? resolved(true) : lo >= 0n ? resolved(false) : unknownDecision([{ code: 'INTERVAL_COMPARISON' }]);
        if (op === '<=')
            return hi <= 0n ? resolved(true) : lo > 0n ? resolved(false) : unknownDecision([{ code: 'INTERVAL_COMPARISON' }]);
        if (op === '>')
            return lo > 0n ? resolved(true) : hi <= 0n ? resolved(false) : unknownDecision([{ code: 'INTERVAL_COMPARISON' }]);
        return lo >= 0n ? resolved(true) : hi < 0n ? resolved(false) : unknownDecision([{ code: 'INTERVAL_COMPARISON' }]);
    }
    let yes = false, no = false;
    switch (op) {
        case '<':
            yes = b < c;
            no = a >= d;
            break;
        case '<=':
            yes = b <= c;
            no = a > d;
            break;
        case '>':
            yes = a > d;
            no = b <= c;
            break;
        case '>=':
            yes = a >= d;
            no = b < c;
            break;
        case '==':
            yes = a === b && c === d && a === c;
            no = b < c || d < a;
            break;
        case '!=':
            yes = b < c || d < a;
            no = a === b && c === d && a === c;
            break;
    }
    return yes ? resolved(true) : no ? resolved(false) : unknownDecision([{ code: 'INTERVAL_COMPARISON' }]);
}
export function numericHelper(name, input) {
    const type = name === 'abs' ? input.numericType : 'integer';
    if (input.measurement.status === 'unmeasurable')
        return numberValue(input.measurement, type);
    const [a, b] = bounds(input.measurement);
    let lo, hi;
    if (name === 'abs') {
        lo = a <= 0 && b >= 0 ? 0 : Math.min(Math.abs(a), Math.abs(b));
        hi = Math.max(Math.abs(a), Math.abs(b));
    }
    else {
        const round = name === 'floor' ? Math.floor : Math.ceil;
        lo = round(a);
        hi = round(b);
    }
    if (type === 'integer') {
        const isExact = input.measurement.status === 'exact';
        for (const endpoint of [lo, hi])
            if (Number.isFinite(endpoint) && !Number.isSafeInteger(endpoint))
                fail(isExact ? 'E_NUMERIC_OVERFLOW' : 'E_POSSIBLE_DOMAIN', 'Rounded result exceeds the safe integer domain.');
    }
    return numberValue(interval(lo, hi, reasonsOf(input.measurement)), type);
}
export function optionalContribution(value) {
    if (value.measurement.status === 'unmeasurable')
        return value;
    const [a, b] = bounds(value.measurement);
    return numberValue(interval(Math.min(0, a), Math.max(0, b), reasonsOf(value.measurement)), value.numericType);
}
//# sourceMappingURL=numeric.js.map