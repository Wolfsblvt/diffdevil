// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/** Interval arithmetic shared by the analytical read service, turnover-v1 and the premium file extension. */
/** Non-negative interval endpoints. null is unbounded, never an invented zero measurement. */
export function interval(value) {
  if (value && Object.hasOwn(value, 'lower')) return { lower: value.lower ?? 0, upper: value.upper ?? null };
  if (value?.status === 'exact') return { lower: value.value, upper: value.value };
  return { lower: value?.lower ?? value?.minimum ?? 0, upper: value?.upper ?? value?.maximum ?? null };
}
export function amount(lower, upper) {
  return { status: upper === lower ? 'exact' : upper === null ? 'unknown' : 'bounded', lower, upper };
}
export function sum(values) {
  const bounds = values.map(interval);
  return amount(bounds.reduce((n, value) => n + value.lower, 0), bounds.some(value => value.upper === null) ? null : bounds.reduce((n, value) => n + value.upper, 0));
}
/** Median envelopes include bounded and unrecovered observations in the same population. */
export function median(values) {
  if (!values.length) return { status: 'unavailable', lower: null, upper: null, samples: 0 };
  const bounds = values.map(interval);
  const middle = sides => {
    const sorted = sides.map(value => value ?? Infinity).sort((a, b) => a - b);
    const index = Math.floor(sorted.length / 2);
    const result = sorted.length % 2 ? sorted[index] : (sorted[index - 1] + sorted[index]) / 2;
    return Number.isFinite(result) ? result : null;
  };
  return { ...amount(middle(bounds.map(value => value.lower)), middle(bounds.map(value => value.upper))), samples: values.length };
}
