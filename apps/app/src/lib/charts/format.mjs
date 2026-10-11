// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * Text helpers shared by the chart models, the server-rendered readouts and tables, and the
 * client renderer (the same module is bundled for the browser). Numbers stay tabular, the
 * typographic minus is used for negatives, and durations read in the unit a person expects.
 */
import { n0, describeBound } from '../intervals.mjs';
import { escapeHtml } from '../format.mjs';

export { n0, describeBound, escapeHtml as esc };

/** Elapsed days as a short human duration: `<1 h`, `18 h`, `2.7 d`, `3.1 w`. */
export function fmtDur(days) {
  if (days === null || days === undefined || !Number.isFinite(days)) return '—';
  if (days < 1 / 24) return '<1 h';
  if (days < 1) return `${Math.round(days * 24)} h`;
  if (days < 14) return `${days.toFixed(1)} d`;
  return `${(days / 7).toFixed(1)} w`;
}

/** Axis tick for a duration in days: whole hours, days or weeks. */
export function tickDur(days) {
  if (days < 1) return `${Math.round(days * 24)} h`;
  if (days < 7) return `${Math.round(days)} d`;
  return `${Math.round(days / 7)} w`;
}

/** `lo`, `lo–hi`, or `≥ lo` when the upper end is unknown: an open interval is never printed as a point. */
export function rangeText(lo, hi) {
  return describeBound({ status: hi === lo ? 'exact' : 'bounded', lower: lo, upper: hi ?? null });
}

/** Signed count with the typographic minus and `±0` for zero. */
export function signed(value, unit = '') {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  const rounded = Math.round(value);
  return `${rounded > 0 ? '+' : rounded < 0 ? '−' : '±'}${n0(Math.abs(rounded))}${unit}`;
}

/** Turnover multiple: two decimals below 0.1×, one above; `≥ lo×` when the upper end is unknown (open above). */
export function turnoverText(lo, hi) {
  const one = value => `${value < 0.1 ? value.toFixed(2) : value.toFixed(1)}×`;
  if (lo === null || lo === undefined) return 'n/a';
  if (hi === null || hi === undefined) return `≥ ${one(lo)}`;
  if (one(hi) === one(lo)) return one(lo);
  return `${one(lo)}–${one(hi)}`;
}

export function percent(share) { return `${Math.round(share * 100)}%`; }

/** Round to a pleasant axis maximum. */
export function niceMax(value) {
  const safe = Math.max(1, value);
  const magnitude = 10 ** Math.floor(Math.log10(safe));
  const step = safe / magnitude;
  return ([1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find(candidate => step <= candidate) ?? 10) * magnitude;
}

/** Nearest-rank quantile over sorted numbers. */
export function quantile(sorted, fraction) {
  if (sorted.length === 0) return null;
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(fraction * sorted.length) - 1))];
}

export function medianOf(numbers) {
  const sorted = numbers.slice().sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/** The last path segment and the directory before it. */
export function splitPath(path) {
  const cut = path.lastIndexOf('/');
  return { dir: cut >= 0 ? path.slice(0, cut + 1) : '', name: cut >= 0 ? path.slice(cut + 1) : path };
}

/** The shortest path suffix that is unique among `keys`, so a cloud word stays short but unambiguous. */
export function uniqueSuffix(key, keys) {
  const parts = key.split('/');
  for (let count = 1; count <= parts.length; count++) {
    const suffix = parts.slice(-count).join('/');
    if (keys.filter(candidate => candidate === suffix || candidate.endsWith(`/${suffix}`)).length === 1) return suffix;
  }
  return key;
}

/** Relative time in plain words from an ISO or epoch time against `now`. */
export function agoText(at, now) {
  const elapsed = (typeof now === 'number' ? now : Date.parse(now)) - (typeof at === 'number' ? at : Date.parse(at));
  if (!Number.isFinite(elapsed)) return '—';
  const HOUR = 3_600_000, DAY = 86_400_000;
  if (elapsed < HOUR) return 'just now';
  if (elapsed < DAY) return `${Math.round(elapsed / HOUR)} h ago`;
  const days = Math.round(elapsed / DAY);
  return days === 1 ? '1 day ago' : `${days} days ago`;
}

export function dateText(at) {
  return new Date(at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

/** A composition bar from `{ k, share }` or `{ k, v }` parts. */
export function compositionBar(parts, height = 6) {
  const total = parts.reduce((sum, part) => sum + (part.share ?? part.v ?? 0), 0) || 1;
  const open = '<' + 'span';
  return `${open} class="cl-comp" style="height:${height}px">${parts.filter(part => (part.share ?? part.v ?? 0) > 0).map(part => `<i class="${part.k}" style="flex:${(part.share ?? part.v) / total}"></i>`).join('')}</span>`;
}
