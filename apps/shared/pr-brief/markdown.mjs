// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * Markdown and number grammar for the PR brief. Provider-supplied values (titles, paths, repository names) are data:
 * they are escaped where they land, never trusted as Markdown. Numbers follow the ratified copy: plain integers below
 * 1,000, en dashes for ranges, `unavailable` for a value the evidence cannot establish, and shares rounded outward when
 * either side is a range so a bounded fact never looks more precise than its evidence.
 */

const CONTROL = /[\u0000-\u0008\u000b-\u001f\u007f\u2028\u2029]/gu;
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

/** Collapse line breaks and control characters so untrusted text cannot leave its paragraph or table cell. */
function singleLine(value) { return String(value).replace(/\r\n|\r|\n|\t/gu, ' ').replace(CONTROL, '\uFFFD'); }

/** Escape untrusted inline text (PR titles). Mentions are neutralized so a title cannot ping anyone. */
export function text(value) {
  return singleLine(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('@', '@\u200b')
    .replace(/[\\`*_{}[\]()#+.!|~-]/gu, '\\$&');
}

/**
 * Inline code for a path or identity. The fence grows past any backtick run in the value; inside a table cell a pipe
 * must be escaped because GitHub splits cells before it parses code spans.
 */
export function code(value, { cell = false } = {}) {
  let content = singleLine(value);
  if (cell) content = content.replaceAll('|', '\\|');
  let longest = 0;
  for (const run of content.matchAll(/`+/gu)) longest = Math.max(longest, run[0].length);
  const fence = '`'.repeat(longest + 1);
  const pad = content.startsWith('`') || content.endsWith('`') || (content.startsWith(' ') && content.endsWith(' ') && content.trim()) ? ' ' : '';
  return `${fence}${pad}${content}${pad}${fence}`;
}

/** A link whose text is escaped data and whose destination is percent-encoded where Markdown would break it. */
export function link(label, destination) {
  const target = String(destination).replace(/[\s<>()\\]/gu, character => encodeURIComponent(character));
  return `[${label}](${target})`;
}

export function number(value) {
  if (!Number.isFinite(value)) return 'unavailable';
  return Math.abs(value) >= 1000 ? value.toLocaleString('en-US', { maximumFractionDigits: 0 }) : String(value);
}

/** Small counts read as words in prose (“the other four files”); larger counts stay numeric. */
export function countWord(value) { return Number.isSafeInteger(value) && value >= 0 && value < WORDS.length ? WORDS[value] : number(value); }

/** Sentence-initial form of countWord (“Two open PRs”). */
export function countTitle(value) { const word = countWord(value); return word.charAt(0).toUpperCase() + word.slice(1); }

/**
 * Normalize an engine or analytical measurement to an interval. `{ lower, upper: null }` is a known lower bound with an
 * open upper side; `null` is no value at all. Unknown evidence never becomes zero.
 */
export function interval(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? { lower: value, upper: value } : null;
  if (value.status === 'exact' && Number.isFinite(value.value)) return { lower: value.value, upper: value.value };
  if ((value.status === 'exact' || value.status === 'bounded') && Number.isFinite(value.lower)) return { lower: value.lower, upper: Number.isFinite(value.upper) ? value.upper : null };
  if (Object.hasOwn(value, 'lower') && !Object.hasOwn(value, 'status')) return { lower: value.lower ?? 0, upper: value.upper ?? null };
  return null;
}

export function exact(value) { const range = interval(value); return range !== null && range.upper !== null && range.lower === range.upper; }

/** `248`, `42–78`, or `unavailable`. An open upper side has no single display and reads as unavailable here. */
export function amount(value) {
  const range = interval(value);
  if (range === null || range.upper === null) return 'unavailable';
  return range.lower === range.upper ? number(range.lower) : `${number(range.lower)}–${number(range.upper)}`;
}

export function sum(values) {
  const ranges = values.map(interval);
  if (ranges.some(range => range === null)) return null;
  return { lower: ranges.reduce((total, range) => total + range.lower, 0), upper: ranges.some(range => range.upper === null) ? null : ranges.reduce((total, range) => total + range.upper, 0) };
}

/**
 * Whole-number share of a part in a total. Exact on both sides rounds to nearest; any range rounds outward (lowest
 * part over highest total, down; highest part over lowest total, up) so “60–69%” contains every consistent value.
 */
export function share(part, total) {
  const p = interval(part), t = interval(total);
  if (p === null || t === null || p.upper === null || t.upper === null || t.lower <= 0) return null;
  if (p.lower === p.upper && t.lower === t.upper) {
    const value = Math.round((p.lower / t.lower) * 100);
    return { lower: value, upper: value, text: `${value}%` };
  }
  const lower = Math.floor((p.lower / t.upper) * 100), upper = Math.min(100, Math.ceil((p.upper / t.lower) * 100));
  return { lower, upper, text: lower === upper ? `${lower}%` : `${lower}–${upper}%` };
}

/** Turnover multiples keep one decimal; a bounded ratio is an outward-rounded range. */
export function multiple(value) {
  const range = interval(value);
  if (range === null || range.upper === null) return null;
  const down = Math.floor(range.lower * 10) / 10, up = Math.ceil(range.upper * 10) / 10;
  if (range.lower === range.upper) return `${(Math.round(range.lower * 10) / 10).toFixed(1)}×`;
  return down.toFixed(1) === up.toFixed(1) ? `${down.toFixed(1)}×` : `${down.toFixed(1)}–${up.toFixed(1)}×`;
}

/** “a”, “a and b”, “a, b and c”; `serial` adds the comma the activity sentence uses (“…, and d in 1”). */
export function list(items, { serial = false } = {}) {
  if (items.length <= 1) return items.join('');
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}${serial ? ',' : ''} and ${items.at(-1)}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function day(date) { return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`; }

/** “12 Jul–10 Oct 2026”; the year is repeated only when the window crosses one. */
export function dateRange(from, to) {
  const start = new Date(from), end = new Date(to);
  return start.getUTCFullYear() === end.getUTCFullYear() ? `${day(start)}–${day(end)} ${end.getUTCFullYear()}`
    : `${day(start)} ${start.getUTCFullYear()}–${day(end)} ${end.getUTCFullYear()}`;
}

/** “10 Oct 2026 at 02:20 UTC”. */
export function instant(value) {
  const date = new Date(value);
  return `${day(date)} ${date.getUTCFullYear()} at ${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')} UTC`;
}

/** The short commit form the copy uses; the full identity stays in the owned state and the check. */
export function shortRevision(value) { return typeof value === 'string' && /^[0-9a-f]{7,64}$/iu.test(value) ? value.slice(0, 7) : String(value); }

/** UTF-8 size, the unit of the body budget. */
export function bytes(value) { return new TextEncoder().encode(value).byteLength; }
