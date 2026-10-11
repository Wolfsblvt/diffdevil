// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0

/** Convert a retained UTC instant into the producer's commercial date. Missing/invalid timezone stays unknown. */
export function operationDate(at, timeZone) {
  const time = Date.parse(at ?? '');
  if (!Number.isFinite(time) || typeof timeZone !== 'string' || !timeZone) return null;
  try {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(time);
    const part = type => parts.find(value => value.type === type).value;
    return `${part('year')}-${part('month')}-${part('day')}`;
  } catch { return null; }
}
