// SPDX-License-Identifier: AGPL-3.0-only
/**
 * PROVISIONAL chart rendering. The ratified design settled what these charts encode (the
 * mosaic bar: height is Changed, colour area is composition, outline is raw churn, a hatched
 * cap is the unresolved part of a bounded value, a dashed outline is partial acquisition;
 * bounded numbers as ranges; lanes with hollow dots for bounded or unrecovered). It did not
 * settle their finish. The chart-and-cloud system is being co-designed separately; every
 * figure here is a replaceable slot marked `data-chart-provisional`, bound to the same data
 * the accessible table beside it shows. Nothing in this file is accepted production design.
 */
import { n0 } from './intervals.mjs';
import { escapeHtml as esc, fmtDate } from './format.mjs';

const figure = (name, w, h, body, label) => `<figure class="a-chart" data-chart-provisional="${name}" role="img" aria-label="${esc(label)}"><svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" focusable="false">${body}</svg></figure>`;
const HATCH = '<defs><pattern id="a-unres" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" fill="#2c303a"/><line x1="0" y1="0" x2="0" y2="5" stroke="var(--fg-3)" stroke-width="2"/></pattern></defs>';

export function niceMax(value) {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = value / magnitude;
  return (step <= 1 ? 1 : step <= 2 ? 2 : step <= 2.5 ? 2.5 : step <= 5 ? 5 : 10) * magnitude;
}
const grid = (x0, x1, y, max, steps) => Array.from({ length: steps + 1 }, (_, index) => { const value = (max / steps) * index, yy = y(value); return `<line x1="${x0}" x2="${x1}" y1="${yy}" y2="${yy}"/><text class="tick" x="${x0 - 8}" y="${yy + 3.5}" text-anchor="end">${n0(value)}</text>`; }).join('');

/** Cumulative count of the selected period against the previous one, per day. */
export function cumulative(current, previous, { w = 520, h = 120 } = {}) {
  const L = 34, R = 12, T = 10, B = 20, n = Math.max(current.length, 2);
  const total = list => list.reduce((acc, value) => { acc.push((acc.at(-1) ?? 0) + value); return acc; }, []);
  const a = total(current), b = total(previous);
  const max = niceMax(Math.max(1, a.at(-1) ?? 0, b.at(-1) ?? 0));
  const x = index => L + (index / (n - 1)) * (w - L - R), y = value => T + (1 - value / max) * (h - T - B);
  const path = series => series.map((value, index) => `${index ? 'L' : 'M'}${x(index).toFixed(1)},${y(value).toFixed(1)}`).join('');
  let s = `<g class="grid">${grid(L, w - R, y, max, 2)}</g>`;
  if (b.length) s += `<path d="${path(b)}" fill="none" stroke="var(--fg-3)" stroke-width="1.5" stroke-dasharray="3 4"/>`;
  s += `<path d="${path(a)}" fill="none" stroke="var(--fg)" stroke-width="2"/>`;
  s += `<text class="tick" x="${x(0)}" y="${h - 5}">start</text><text class="tick" x="${x(n - 1)}" y="${h - 5}" text-anchor="end">now</text>`;
  return figure('cumulative', w, h, s, 'Cumulative count through the selected period, with the previous period dashed');
}

export function minibars(values, w = 150, h = 24) {
  const max = Math.max(1, ...values), gap = 2, bw = (w - gap * (values.length - 1)) / Math.max(1, values.length);
  return figure('minibars', w, h, values.map((value, index) => `<rect x="${(index * (bw + gap)).toFixed(1)}" y="${(h - (value / max) * h).toFixed(1)}" width="${bw.toFixed(1)}" height="${((value / max) * h).toFixed(1)}" fill="${index === values.length - 1 ? 'var(--fg)' : 'var(--fg-3)'}"/>`).join(''), 'Recent values as small bars');
}

export function spark(values, w = 150, h = 24) {
  if (values.length < 2) return '';
  const lo = Math.min(...values), hi = Math.max(...values), span = hi - lo || 1;
  const x = index => (index / (values.length - 1)) * w, y = value => h - 2 - ((value - lo) / span) * (h - 4);
  return figure('spark', w, h, `<path d="${values.map((value, index) => `${index ? 'L' : 'M'}${x(index).toFixed(1)},${y(value).toFixed(1)}`).join('')}" fill="none" stroke="var(--fg-2)" stroke-width="1.5"/><circle cx="${x(values.length - 1)}" cy="${y(values.at(-1))}" r="2.5" fill="var(--fg)"/>`, 'Recent values as a small line');
}

/**
 * Mosaic bars (ratified encoding). Each series item: { added, deleted, modified, boundedLow,
 * boundedHigh, boundedCount, rawChurn, coverage, label, count, recovered }.
 */
export function mosaic(series, { w = 1180, h = 280, every = 1, selected, fill = 0.72, maxBar = 170, label = item => item.label ?? fmtDate(item.start), title } = {}) {
  const L = 50, R = 16, T = 22, B = 26;
  const exactOf = item => item.added + item.deleted + item.modified, provenOf = item => exactOf(item) + (item.boundedLow || 0);
  const max = niceMax(Math.max(1, ...series.map(item => Math.max(item.rawChurn || 0, provenOf(item)))) * 1.04);
  const bw = (w - L - R) / Math.max(1, series.length), y = value => T + (1 - value / max) * (h - T - B), base = y(0);
  const width = Math.max(6, Math.min(maxBar, bw * fill));
  let s = HATCH + `<g class="grid">${grid(L, w - R, y, max, 4)}</g>`;
  series.forEach((item, index) => {
    const exact = exactOf(item), proven = provenOf(item), partial = item.coverage === 'partial', x0 = L + index * bw + (bw - width) / 2;
    if (selected === index) s += `<rect class="selband" x="${L + index * bw + 2}" y="${T - 14}" width="${bw - 4}" height="${h - T - B + 14}" rx="4"/>`;
    if (!proven) s += `<line x1="${x0}" x2="${x0 + width}" y1="${base - 1}" y2="${base - 1}" stroke="var(--fg-3)" stroke-width="2"/>`;
    else {
      const raw = item.rawChurn || 0;
      if (raw) s += `<rect x="${x0 - 0.5}" y="${y(raw)}" width="${width + 1}" height="${base - y(raw)}" rx="2" fill="none" stroke="var(--fg-3)" stroke-width="1" ${partial ? 'stroke-dasharray="3 3"' : ''} opacity=".8"/>`;
      const opacity = partial ? '.45' : '1';
      if (exact) {
        const top = y(exact), height = base - top, mw = Math.min(width, width * (item.modified / exact)), rw = Math.max(0, width - mw - (mw > 0 && mw < width ? 1.5 : 0)), ah = height * (item.added / Math.max(1, item.added + item.deleted));
        if (mw > 0) s += `<rect x="${x0}" y="${top}" width="${mw}" height="${height}" fill="var(--a-mod)" opacity="${opacity}"/>`;
        if (rw > 0) s += `<rect x="${x0 + width - rw}" y="${top}" width="${rw}" height="${ah}" fill="var(--a-add)" opacity="${opacity}"/><rect x="${x0 + width - rw}" y="${top + ah}" width="${rw}" height="${height - ah}" fill="var(--a-del)" opacity="${opacity}"/>`;
      }
      if (item.boundedLow) s += `<rect x="${x0}" y="${y(proven)}" width="${width}" height="${y(exact) - y(proven)}" fill="url(#a-unres)" opacity="${partial ? '.5' : '1'}"><title>${item.boundedCount || 1} bounded: proven ${n0(item.boundedLow)}${item.boundedHigh !== null && item.boundedHigh !== undefined ? `–${n0(item.boundedHigh)}` : ' or more'} Changed, composition not established</title></rect>`;
      if (partial) s += `<text class="ann" x="${x0 + width / 2}" y="${y(Math.max(raw, proven)) - 7}" text-anchor="middle">partial ${item.recovered}/${item.count}</text>`;
    }
    if (index % every === 0 || index === series.length - 1) s += `<text class="tick" x="${x0 + width / 2}" y="${h - 7}" text-anchor="middle">${esc(label(item, index))}</text>`;
    const tip = `${title ? title(item, index) : label(item, index)}${partial ? ` · partial: ${item.recovered} of ${item.count} recovered` : ''}\nChanged ${item.boundedLow ? `${n0(proven)}${item.boundedHigh !== null ? `–${n0(exact + item.boundedHigh)}` : ' or more'}` : n0(exact)}\n~ ${n0(item.modified)} modified · + ${n0(item.added)} added-only · − ${n0(item.deleted)} deleted-only\nraw churn ${n0(item.rawChurn || 0)}`;
    s += `<rect class="hit" data-index="${index}" x="${L + index * bw}" y="${T}" width="${bw}" height="${h - T - B}"><title>${esc(tip)}</title></rect>`;
  });
  s += `<line class="base" x1="${L}" x2="${w - R}" y1="${base}" y2="${base}"/>`;
  return figure('mosaic', w, h, s, 'Changed per bucket: bar height is Changed, coloured area is composition, outline is raw churn, hatched cap is the unresolved part of bounded values');
}

export const mosaicLegend = ({ bounded = true, partial = false } = {}) => `<div class="a-legend"><span class="a-teach">bar height = Changed · colour area = composition · outline = raw churn</span><span><i style="background:var(--a-mod)"></i>~ modified</span><span><i style="background:var(--a-add)"></i>+ added-only</span><span><i style="background:var(--a-del)"></i>− deleted-only</span>${bounded ? '<span><i class="hatch"></i>bounded · proven minimum</span>' : ''}${partial ? '<span><i class="part"></i>partial acquisition</span>' : ''}</div>`;

/** Weekly flow: opened as outline, merged filled, closed unmerged hatched, analysed as a dot row, open-at-end as a line. */
export function flow(weeks, { w = 820, h = 270, lifecycle = true } = {}) {
  const L = 36, R = 44, T = 16, B = 26, n = Math.max(1, weeks.length);
  const max = niceMax(Math.max(1, ...weeks.map(week => Math.max(week.opened, week.merged + week.closed, week.analysed))));
  const bw = (w - L - R) / n, y = value => T + (1 - value / max) * (h - T - B), base = y(0);
  let s = HATCH + `<g class="grid">${grid(L, w - R, y, max, 4)}</g>`;
  weeks.forEach((week, index) => {
    const x0 = L + index * bw + bw * 0.16, width = bw * 0.68;
    if (lifecycle) {
      if (week.opened) s += `<rect x="${x0}" y="${y(week.opened)}" width="${width}" height="${base - y(week.opened)}" fill="none" stroke="var(--fg-2)" stroke-width="1.5" rx="2"/>`;
      if (week.merged) s += `<rect x="${x0 + width * 0.18}" y="${y(week.merged)}" width="${width * 0.64}" height="${base - y(week.merged)}" fill="var(--fg-2)"/>`;
      if (week.closed) s += `<rect x="${x0 + width * 0.18}" y="${y(week.merged + week.closed)}" width="${width * 0.64}" height="${y(week.merged) - y(week.merged + week.closed)}" fill="url(#a-unres)"/>`;
    } else if (week.analysed) s += `<rect x="${x0 + width * 0.18}" y="${y(week.analysed)}" width="${width * 0.64}" height="${base - y(week.analysed)}" fill="var(--fg-2)"/>`;
    s += `<text class="tick" x="${x0 + width / 2}" y="${h - 7}" text-anchor="middle">${esc(fmtDate(week.start))}</text>`;
    s += `<rect class="hit" x="${L + index * bw}" y="${T}" width="${bw}" height="${h - T - B}"><title>${esc(`week of ${fmtDate(week.start)}${lifecycle ? `\nopened ${week.opened} · merged ${week.merged} · closed unmerged ${week.closed} · open at week end ${week.openAtEnd}` : ''}\nanalysed ${week.analysed}`)}</title></rect>`;
  });
  if (lifecycle) {
    const lineMax = niceMax(Math.max(1, ...weeks.map(week => week.openAtEnd)));
    const ly = value => T + (1 - value / lineMax) * (h - T - B);
    s += `<path d="${weeks.map((week, index) => `${index ? 'L' : 'M'}${(L + index * bw + bw / 2).toFixed(1)},${ly(week.openAtEnd).toFixed(1)}`).join('')}" fill="none" stroke="var(--a-open)" stroke-width="1.75"/>`;
    s += `<text class="tick" x="${w - R + 6}" y="${ly(lineMax) + 3.5}">${n0(lineMax)}</text><text class="tick" x="${w - R + 6}" y="${ly(0) + 3.5}">0</text>`;
  }
  s += `<line class="base" x1="${L}" x2="${w - R}" y1="${base}" y2="${base}"/>`;
  return figure('flow', w, h, s, lifecycle ? 'Pull requests opened, merged and closed unmerged per week, with the number open at each week end' : 'Pull requests analysed per week');
}

/** Size lanes: one dot per pull request in its band lane over the period; hollow when bounded or unrecovered. */
export function lanes(prs, { w = 1180, h = 250, days = 30, nowIso, href, bands, unknownBand } = {}) {
  const L = 78, R = 14, T = 12, B = 24;
  const lanesDef = [...bands.slice().reverse(), unknownBand];
  const lh = (h - T - B) / lanesDef.length, now = Date.parse(nowIso), x = iso => L + (1 - (now - Date.parse(iso)) / (days * 86_400_000)) * (w - L - R);
  let s = '';
  lanesDef.forEach((band, index) => { const yy = T + index * lh + lh / 2; s += `<line x1="${L}" x2="${w - R}" y1="${yy}" y2="${yy}" stroke="var(--a-grid)"/><rect x="6" y="${yy - 9}" width="64" height="18" rx="9" fill="none" stroke="var(--hair-strong)"/><circle cx="17" cy="${yy}" r="3.5" fill="${band.color}"/><text class="tick strong" x="25" y="${yy + 3.5}">${band.short}</text>`; });
  for (const pr of prs) {
    const at = pr.lifecycle?.mergedAt ?? pr.observedAt;
    const index = lanesDef.findIndex(band => band.id === pr.latest.band.id);
    const yy = T + index * lh + lh / 2 + (((pr.number * 7) % 9) - 4) * 1.2;
    const hollow = pr.latest.changed.status !== 'exact';
    const dot = `<circle cx="${x(at).toFixed(1)}" cy="${yy.toFixed(1)}" r="5" fill="${pr.latest.band.color}" ${hollow ? 'fill-opacity=".15" stroke="var(--fg-2)" stroke-dasharray="2 2"' : 'stroke="#0c0f17" stroke-width="1"'}><title>${esc(`#${pr.number}${pr.title ? ` ${pr.title}` : ''}\n${pr.latest.band.label}${pr.latest.band.standing === 'derived' ? ' (derived)' : ''} · ${fmtDate(at)}`)}</title></circle>`;
    s += href ? `<a href="${esc(href(pr))}">${dot}</a>` : dot;
  }
  [0, 0.5, 1].forEach(fraction => { const t = now - (1 - fraction) * days * 86_400_000; s += `<text class="tick" x="${L + fraction * (w - L - R)}" y="${h - 6}" text-anchor="${fraction === 0 ? 'start' : fraction === 1 ? 'end' : 'middle'}">${fraction === 1 ? 'today' : fmtDate(new Date(t).toISOString())}</text>`; });
  return figure('lanes', w, h, s, 'Pull requests by size band over time; hollow dots are bounded or not recovered');
}

/** Changed across analysed heads with the size-v1 thresholds that the small bands cross. */
export function development(heads, { w = 420, h = 160 } = {}) {
  const L = 40, R = 70, T = 18, B = 24;
  const values = heads.map(head => head.changed.upper ?? head.changed.lower ?? 0);
  const max = niceMax(Math.max(120, ...values) * 1.15);
  const x = index => L + (index / Math.max(1, heads.length - 1)) * (w - L - R), y = value => T + (1 - value / max) * (h - T - B);
  let s = '';
  for (const [value, label] of [[20, 'XS│S'], [100, 'S│M'], [500, 'M│L'], [1000, 'L│XL']]) {
    if (value > max) continue;
    s += `<line x1="${L}" x2="${w - R}" y1="${y(value)}" y2="${y(value)}" stroke="var(--fg-3)" stroke-dasharray="2 4" opacity=".7"/><text class="tick" x="${w - R + 6}" y="${y(value) + 3.5}">${value} · ${label}</text>`;
  }
  s += `<path d="${heads.map((head, index) => `${index ? 'L' : 'M'}${x(index)},${y(head.changed.lower ?? 0)}`).join('')}" fill="none" stroke="var(--fg-2)" stroke-width="1.75"/>`;
  heads.forEach((head, index) => {
    const last = index === heads.length - 1, bounded = head.changed.status !== 'exact';
    if (bounded && head.changed.upper !== null) s += `<line x1="${x(index)}" x2="${x(index)}" y1="${y(head.changed.lower)}" y2="${y(head.changed.upper)}" stroke="var(--fg-2)" stroke-dasharray="2 2"/>`;
    s += `<circle cx="${x(index)}" cy="${y(head.changed.lower ?? 0)}" r="${last ? 4.5 : 3.5}" fill="${last ? 'var(--fg)' : 'var(--bg-raised)'}" stroke="var(--fg)" stroke-width="1.75"/><text class="${last ? 'val' : 'tick strong'}" x="${x(index)}" y="${y(head.changed.upper ?? head.changed.lower ?? 0) - 10}" text-anchor="middle">${esc(head.text)}</text><text class="tick" x="${x(index)}" y="${h - 6}" text-anchor="middle">head ${index + 1}</text>`;
  });
  s += `<line class="base" x1="${L}" x2="${w - R}" y1="${y(0)}" y2="${y(0)}"/>`;
  return figure('development', w, h, s, 'Changed across analysed heads with size band thresholds');
}

/** One tick per time over a lookback. */
export function strip(times, { w = 160, h = 18, days = 90, nowIso } = {}) {
  const now = Date.parse(nowIso), x = iso => w - ((now - Date.parse(iso)) / 86_400_000 / days) * w;
  return `<svg class="a-strip" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true" data-chart-provisional="strip"><line x1="0" x2="${w}" y1="${h - 1}" y2="${h - 1}" stroke="var(--hair)"/>${times.map(iso => `<line x1="${x(iso).toFixed(1)}" x2="${x(iso).toFixed(1)}" y1="3" y2="${h - 2}" stroke="var(--fg-2)" stroke-width="2" stroke-linecap="round"/>`).join('')}</svg>`;
}
