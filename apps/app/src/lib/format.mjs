// SPDX-License-Identifier: AGPL-3.0-only
/** Small text helpers shared by the App pages. Numbers stay tabular; times are relative where a person expects it. */
export { n0 } from './intervals.mjs';

const MINUTE = 60_000, HOUR = 3_600_000, DAY = 86_400_000;

export function ago(iso, now) {
  if (!iso) return '—';
  const elapsed = Date.parse(now) - Date.parse(iso);
  if (!Number.isFinite(elapsed)) return '—';
  if (elapsed < MINUTE) return 'just now';
  if (elapsed < HOUR) return `${Math.round(elapsed / MINUTE)} min ago`;
  if (elapsed < DAY) return `${Math.round(elapsed / HOUR)} h ago`;
  const days = Math.round(elapsed / DAY);
  return days === 1 ? '1 day ago' : `${days} days ago`;
}

export function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

export function fmtMonth(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' });
}

export function fmtMonthLong(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/** Signed delta with the typographic minus. */
export function sgn(value, unit = '', decimals = 0) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  const magnitude = Math.abs(value).toFixed(decimals);
  return `${value > 0 ? '+' : value < 0 ? '−' : '±'}${magnitude}${unit}`;
}

export function days(ms, decimals = 1) { return (ms / DAY).toFixed(decimals); }

export function pct(part, whole) { return whole ? Math.round((part / whole) * 100) : 0; }

export function plural(count, one, many = `${one}s`) { return `${count} ${count === 1 ? one : many}`; }

export function shortSha(sha) { return typeof sha === 'string' ? sha.slice(0, 7) : '—'; }

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/gu, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}
