import { capture, fail } from '../errors.js';
import { deepFreeze, inertCopy, record, array, string } from '../inert.js';
import { bounds, mergeReasons, reasonsOf } from '../numeric.js';
import { validateMeasurement } from '../report.js';
const definitions = new WeakMap();
/** Validate ordered exclusive cuts; no separate lower bounds can create gaps. */
export function compileBands(input) {
    return capture(() => {
        const source = record(inertCopy(input, { code: 'E_CONFIG' }), 'Band definition', 'E_CONFIG');
        for (const key of Object.keys(source))
            if (!['minimum', 'ranges'].includes(key))
                fail('E_CONFIG', `Unknown band property ${key}.`, 'config');
        if (source.minimum !== undefined && (typeof source.minimum !== 'number' || !Number.isFinite(source.minimum)))
            fail('E_BAND_DOMAIN', 'Band minimum must be finite.', 'config');
        let previous = source.minimum;
        const ranges = array(source.ranges, 'Band ranges', 'E_BAND_OTHERWISE');
        if (!ranges.length)
            fail('E_BAND_OTHERWISE', 'A band set requires a final otherwise range.', 'config');
        const ids = new Set();
        const normalized = ranges.map((input, index) => {
            const r = record(input, 'Band range', 'E_CONFIG'), id = string(r.id, 'Band ID', 'E_BAND_IDS');
            if (!id || ids.has(id))
                fail('E_BAND_IDS', 'Band IDs must be nonempty and unique.', 'config');
            ids.add(id);
            for (const key of Object.keys(r))
                if (!['id', 'lt', 'otherwise'].includes(key))
                    fail('E_CONFIG', `Unknown range property ${key}.`, 'config');
            if (r.otherwise !== undefined) {
                if (r.otherwise !== true || r.lt !== undefined || index !== ranges.length - 1)
                    fail('E_BAND_OTHERWISE', 'otherwise must be true, exclusive of lt, and last.', 'config');
                return { id, otherwise: true };
            }
            if (index === ranges.length - 1)
                fail('E_BAND_OTHERWISE', 'The final band must use otherwise.', 'config');
            if (typeof r.lt !== 'number' || !Number.isFinite(r.lt))
                fail('E_BAND_ORDER', 'Band cuts must be finite numbers.', 'config');
            if (previous !== undefined && r.lt <= previous)
                fail('E_BAND_ORDER', 'Band cuts must strictly increase above the minimum.', 'config');
            previous = r.lt;
            return { id, lt: r.lt };
        });
        const compiled = deepFreeze({ ids: [...ids] });
        definitions.set(compiled, deepFreeze({ ranges: normalized, ...(source.minimum !== undefined ? { minimum: source.minimum } : {}) }));
        return compiled;
    });
}
export function resolveBand(program, input) {
    return capture(() => {
        const definition = definitions.get(program);
        if (!definition)
            fail('E_PROGRAM', 'Resolve only a successfully compiled band set.');
        const measurement = validateMeasurement(inertCopy(input, { code: 'E_INPUT' }), 'float');
        const [minimum, maximum] = bounds(measurement), floor = definition.minimum ?? -Infinity;
        if (measurement.status !== 'unmeasurable' && maximum < floor)
            fail('E_BAND_DOMAIN', 'The value is outside the configured band domain.');
        if ((measurement.status === 'exact' || measurement.status === 'bounded') && minimum < floor)
            fail('E_POSSIBLE_DOMAIN', 'The measurement partly violates the configured band minimum.');
        let lower = floor;
        const candidates = [];
        for (const range of definition.ranges) {
            const upper = range.lt ?? Infinity;
            if (maximum >= lower && minimum < upper)
                candidates.push({ status: 'resolved', id: range.id, ...(Number.isFinite(lower) ? { lower } : {}), ...(Number.isFinite(upper) ? { upper } : {}) });
            lower = upper;
        }
        const domainUnproven = measurement.status === 'unknown' && minimum < floor;
        if (measurement.status !== 'unmeasurable' && !domainUnproven && candidates.length === 1)
            return candidates[0];
        return { status: 'unknown', candidates: candidates.map(item => item.id), reasons: mergeReasons(reasonsOf(measurement), [{ code: domainUnproven ? 'BAND_DOMAIN_UNPROVEN' : 'BAND_UNRESOLVED' }]) };
    });
}
//# sourceMappingURL=bands.js.map