// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Interval arithmetic over retained measurements. A measurement is exact, bounded
 * (a proven range) or unknown. Unknown is never zero: it only proves the floor a count
 * domain already has. Statistics over mixed populations keep both ends, so a median
 * can honestly read `a–b` or `≥ a` instead of silently dropping the bounded members,
 * which are disproportionately the largest changes.
 */

/** Read one retained measurement as `{ status, lower, upper }`; counts prove a zero floor. */
export function bound(measurement, { nonNegative = true } = {}) {
  const floor = nonNegative ? 0 : null;
  if (!measurement || typeof measurement !== 'object') return { status: 'unknown', lower: floor, upper: null };
  if (measurement.status === 'exact' && Number.isFinite(measurement.value)) return { status: 'exact', lower: measurement.value, upper: measurement.value };
  if (measurement.status === 'bounded') {
    const lower = Number.isFinite(measurement.minimum) ? measurement.minimum : floor;
    const upper = Number.isFinite(measurement.maximum) ? measurement.maximum : null;
    return { status: 'bounded', lower, upper };
  }
  return { status: 'unknown', lower: floor, upper: null };
}

export const exact = value => ({ status: 'exact', lower: value, upper: value });
export const unknown = () => ({ status: 'unknown', lower: 0, upper: null });

/** Sum of bounds: the lower end adds proven minimums; the upper end exists only when every member has one. */
export function sumBounds(values) {
  const lower = values.reduce((total, value) => total + (value.lower ?? 0), 0);
  const upper = values.every(value => value.upper !== null) ? values.reduce((total, value) => total + value.upper, 0) : null;
  const status = values.length === 0 || values.every(value => value.status === 'exact') ? 'exact' : values.some(value => value.status === 'unknown') ? 'unknown' : 'bounded';
  return { status, lower, upper };
}

/** Nearest-rank quantile, the same rule the history backend uses (nearest-rank-v1). */
export function nearestRank(numbers, fraction) {
  if (numbers.length === 0) return null;
  const ordered = [...numbers].sort((a, b) => a - b);
  return ordered[Math.max(0, Math.ceil(fraction * ordered.length) - 1)];
}

/**
 * Interval-aware median: the median of the lower ends and the median of the upper ends.
 * A member without an upper end leaves the result open above (`≥ a`). An empty population
 * is `n/a`, never zero.
 */
export function intervalMedian(values, fraction = 0.5) {
  if (values.length === 0) return { status: 'empty', lower: null, upper: null, sample: 0 };
  const lower = nearestRank(values.map(value => value.lower ?? 0), fraction);
  const upper = values.every(value => value.upper !== null) ? nearestRank(values.map(value => value.upper), fraction) : null;
  const status = values.every(value => value.status === 'exact') ? 'exact' : upper === null ? 'open' : lower === upper ? 'exact' : 'bounded';
  return { status, lower, upper, sample: values.length };
}

/** Plain-number formatting with thin thousands grouping. */
export function n0(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  const rounded = Math.round(value);
  return String(rounded).replace(/\B(?=(\d{3})+(?!\d))/gu, ',');
}

/**
 * Text for a bound. Exact prints the number; a finite range prints `a–b`; a range with no
 * upper end prints `≥ a`; an empty population prints `n/a`. Never `≈`.
 */
export function describeBound(value, { decimals = 0 } = {}) {
  if (!value || value.status === 'empty') return 'n/a';
  const show = number => decimals ? Number(number).toFixed(decimals) : n0(number);
  if (value.status === 'unknown' && (value.lower ?? 0) === 0 && value.upper === null) return 'unknown';
  if (value.upper === null) return `≥ ${show(value.lower ?? 0)}`;
  if (value.lower === value.upper) return show(value.lower);
  return `${show(value.lower)}–${show(value.upper)}`;
}

/** The evidence word for one bound, matching the website's chip vocabulary. */
export function evidenceOf(value) {
  if (!value) return 'unknown';
  if (value.status === 'exact') return 'exact';
  if (value.status === 'bounded' && value.upper !== null) return 'bounded';
  return 'unknown';
}
