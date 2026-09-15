import { fail } from '../errors.js';
import { Budget } from '../limits.js';
import { arithmetic, bounds, integer, interval, mergeReasons, numberValue, optionalContribution, resolved, unknownDecision } from '../numeric.js';
import { compareScalarStrings } from '../paths.js';
import { asDecision, asNumber, completeCollection, unknownValue, valueReasons } from './values.js';
const incomplete = { code: 'FILE_SET_INCOMPLETE' };
const possible = { code: 'POSSIBLE_MEMBERSHIP' };
/** Intersect membership-derived counts with separately justified cardinality. */
export function countCollection(input) {
    let lower = input.items.filter(entry => entry.membership === 'definite').length + input.unseen.minimum;
    let upper = input.unseen.maximum === undefined ? Infinity : input.items.length + input.unseen.maximum;
    if (input.cardinality) {
        const [a, b] = bounds(input.cardinality);
        lower = Math.max(lower, a);
        upper = Math.min(upper, b);
    }
    if (!Number.isSafeInteger(lower) || Number.isFinite(upper) && !Number.isSafeInteger(upper) || lower > upper)
        fail('E_INPUT', 'Collection membership contradicts its safe cardinality.');
    return numberValue(interval(lower, upper, input.unseen.possible ? [incomplete] : [possible]));
}
export function mapCollection(input, select, budget) {
    return { ...input, items: input.items.map(entry => { budget.charge(); return { ...entry, value: select(entry.value) }; }) };
}
export function filterCollection(input, test, budget, literal) {
    if (literal === false)
        return completeCollection([]);
    const items = [];
    let changed = false;
    for (const entry of input.items) {
        budget.charge();
        const decision = asDecision(test(entry.value));
        if (decision.status === 'resolved' && !decision.value) {
            changed = true;
            continue;
        }
        const membership = entry.membership === 'possible' || decision.status === 'unknown' ? 'possible' : 'definite';
        changed ||= membership !== entry.membership;
        items.push({ membership, value: entry.value });
    }
    if (!changed && (literal === true || !input.unseen.possible))
        return { ...input, items };
    return { kind: 'collection', items, unseen: { ...input.unseen, minimum: 0 }, order: input.order, ...(input.notes ? { notes: input.notes } : {}) };
}
export function quantifyCollection(input, test, mode, budget, literal) {
    const witness = mode === 'any';
    let reasons = [];
    for (const entry of input.items) {
        budget.charge();
        const decision = asDecision(test(entry.value));
        if (decision.status === 'resolved' && decision.value === witness && entry.membership === 'definite')
            return resolved(witness);
        if (decision.status === 'unknown')
            reasons = mergeReasons(reasons, decision.reasons);
        else if (decision.value === witness && entry.membership === 'possible')
            reasons = mergeReasons(reasons, [possible]);
    }
    if (literal !== undefined) {
        if (literal !== witness)
            return resolved(!witness);
        const [lower, upper] = bounds(countCollection(input).measurement);
        if (lower > 0)
            return resolved(witness);
        if (upper === 0)
            return resolved(!witness);
    }
    if (input.unseen.possible)
        reasons = mergeReasons(reasons, [incomplete]);
    return reasons.length ? unknownDecision(reasons) : resolved(!witness);
}
export function sumCollection(input, budget, numericType = 'integer', nonnegative = false) {
    let total = numberValue({ status: 'exact', value: 0 }, numericType);
    for (const entry of input.items) {
        budget.charge();
        const value = asNumber(entry.value);
        total = arithmetic('+', total, entry.membership === 'definite' ? value : optionalContribution(value));
    }
    if (input.unseen.possible)
        total = arithmetic('+', total, numberValue({ status: 'unknown', reasons: [incomplete], ...(nonnegative ? { lower: 0 } : {}) }, numericType));
    return total;
}
export function aggregateCollection(input, name, budget, numericType, nonnegative = false) {
    if (name === 'sum')
        return sumCollection(input, budget, numericType, nonnegative);
    const count = countCollection(input), [minimum, maximum] = bounds(count.measurement);
    if (maximum === 0)
        return { kind: 'missing' };
    if (minimum === 0)
        return unknownValue({ kind: 'optional', item: name === 'avg' ? 'float' : numericType }, [{ code: 'POSSIBLE_EMPTY_COLLECTION' }]);
    if (name === 'avg')
        return arithmetic('/', sumCollection(input, budget, numericType, nonnegative), count);
    const numbers = input.items.map(entry => { budget.charge(); return { ...entry, value: asNumber(entry.value) }; });
    const undefinedValues = numbers.filter(entry => entry.value.measurement.status === 'unmeasurable');
    if (undefinedValues.length)
        return numberValue({ status: 'unmeasurable', reasons: mergeReasons(...undefinedValues.map(entry => valueReasons(entry.value))) }, numericType);
    if (input.unseen.possible)
        return numberValue({ status: 'unknown', reasons: [incomplete], ...(nonnegative ? { lower: 0 } : {}) }, numericType);
    const ranges = numbers.map(entry => ({ membership: entry.membership, range: bounds(entry.value.measurement) }));
    const mandatory = ranges.filter(entry => entry.membership === 'definite');
    // No spread over a potentially large collection: extrema use bounded stack space.
    let lower = name === 'min' ? Infinity : -Infinity;
    let upper = name === 'min' ? Infinity : -Infinity;
    if (name === 'min') {
        for (const entry of ranges)
            lower = Math.min(lower, entry.range[0]);
        if (mandatory.length)
            for (const entry of mandatory)
                upper = Math.min(upper, entry.range[1]);
        else {
            upper = -Infinity;
            for (const entry of ranges)
                upper = Math.max(upper, entry.range[1]);
        }
    }
    else {
        for (const entry of ranges)
            upper = Math.max(upper, entry.range[1]);
        if (mandatory.length)
            for (const entry of mandatory)
                lower = Math.max(lower, entry.range[0]);
        else {
            lower = Infinity;
            for (const entry of ranges)
                lower = Math.min(lower, entry.range[0]);
        }
    }
    return numberValue(interval(lower, upper, mergeReasons(...numbers.map(entry => valueReasons(entry.value)))), numericType);
}
/** Return an exact ordering comparison, or undefined when evidence cannot order. */
export function scalarOrder(a, b, budget) {
    budget.charge();
    if (a.kind === 'unknown' || b.kind === 'unknown')
        return undefined;
    if (a.kind === 'number' && b.kind === 'number') {
        if (a.measurement.status !== 'exact' || b.measurement.status !== 'exact')
            return undefined;
        return a.measurement.value < b.measurement.value ? -1 : a.measurement.value > b.measurement.value ? 1 : 0;
    }
    if (a.kind === 'boolean' && b.kind === 'boolean') {
        if (a.decision.status === 'unknown' || b.decision.status === 'unknown')
            return undefined;
        return Number(a.decision.value) - Number(b.decision.value);
    }
    if (a.kind === 'string' && b.kind === 'string') {
        budget.charge(a.value.length + b.value.length);
        return compareScalarStrings(a.value, b.value);
    }
    fail('E_TYPE', 'Ordering requires compatible present scalar values.');
}
export function sortCollection(input, key, descending, budget) {
    const keyed = input.items.map((entry, index) => { budget.charge(); return { entry, index, key: key(entry.value) }; });
    const unresolved = input.unseen.possible || keyed.some(item => scalarOrder(item.key, item.key, budget) === undefined);
    if (unresolved) {
        budget.note({ code: 'ORDER_UNRESOLVED' });
        return { ...input, order: 'unknown' };
    }
    keyed.sort((a, b) => (scalarOrder(a.key, b.key, budget) * (descending ? -1 : 1)) || a.index - b.index);
    return { ...input, items: keyed.map(item => item.entry), order: 'known' };
}
export function takeCollection(input, amount, budget) {
    if (amount.numericType !== 'integer' || amount.measurement.status !== 'exact' || amount.measurement.value < 0)
        fail('E_TAKE_COUNT', 'take requires an exact nonnegative integer.');
    const n = amount.measurement.value;
    if (n === 0)
        return completeCollection([]);
    const [lower, upper] = bounds(countCollection(input).measurement);
    if (upper <= n)
        return input;
    if (input.order === 'known' && !input.unseen.possible && input.items.every(entry => entry.membership === 'definite'))
        return { ...input, items: input.items.slice(0, n), ...(input.cardinality ? { cardinality: { status: 'exact', value: n } } : {}) };
    const items = [];
    let priorMinimum = 0, priorMaximum = 0;
    for (const entry of input.items) {
        budget.charge();
        if (input.order === 'unknown' || input.unseen.possible)
            items.push({ ...entry, membership: 'possible' });
        else if (priorMinimum < n)
            items.push({ ...entry, membership: entry.membership === 'definite' && priorMaximum < n ? 'definite' : 'possible' });
        if (entry.membership === 'definite')
            priorMinimum++;
        priorMaximum++;
    }
    return { kind: 'collection', items, unseen: input.unseen.possible ? { possible: true, minimum: 0, maximum: Math.min(n, input.unseen.maximum ?? n) } : input.unseen,
        order: input.order, cardinality: interval(Math.min(n, lower), Math.min(n, upper)), ...(input.notes ? { notes: input.notes } : {}) };
}
export function certainCollection(input, budget) {
    budget.note({ code: 'DEFINITE_OBSERVED_ONLY' });
    return completeCollection(input.items.filter(entry => entry.membership === 'definite').map(entry => entry.value));
}
//# sourceMappingURL=collections.js.map