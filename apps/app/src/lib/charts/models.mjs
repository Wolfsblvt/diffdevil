// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * One model per chart of Chart Grammar v1.1 (packages/design/chart-grammar-v1.1.md). A page
 * builds the model on the server from the App's record population; the same JSON then renders
 * the default readout and the equivalent table on the server and drives the ECharts/d3-cloud
 * renderer in the browser. Every value a readout, table or mark needs is in the model, so the
 * three views never disagree, and every model is plain JSON. Unknown is never zero: a bucket
 * without a recovered comparison carries `coverage: 'none'`, a partial one `'partial'`. The premium
 * extension's file charts (growth, concentration, Turnover, the cloud, recent file activity) build
 * their models beside its page bodies and register their readouts through `readout.mjs`.
 */
import { BANDS, UNKNOWN_BAND } from '../bands.mjs';
import { fmtDur, quantile, medianOf } from './format.mjs';
import { medianFor } from '../derive.mjs';
import { sumBounds } from '../intervals.mjs';

const DAY = 86_400_000;
const bandList = [...BANDS, UNKNOWN_BAND];
const bandOf = id => bandList.find(band => band.id === id) ?? UNKNOWN_BAND;
const elapsedDays = (from, to) => (from && to ? (Date.parse(to) - Date.parse(from)) / DAY : null);

/** Coverage of a bucket: `none` = merged PRs but no recovered comparison; `partial` = some missing. */
export function coverageOf(count, recovered) {
  if (count > 0 && recovered === 0) return 'none';
  return recovered < count ? 'partial' : 'complete';
}

/**
 * Change volume (the mosaic). `buckets` are the App's volume buckets; `labelOf`/`nameOf`
 * give the axis word and the readout name; `hrefOf` the drill target. An optional `strip`
 * (File detail) carries the file size after each bar.
 */
export function mosaicModel({ buckets, unit, period, population = 'merged', scopeLabel = '', labelOf, nameOf, hrefOf, strip = null, compact = false, sel = null }) {
  const rows = buckets.map((bucket, index) => {
    const exact = bucket.added + bucket.deleted + bucket.modified;
    const covered = bucket.covered !== false;
    const coverage = !covered && bucket.recovered === 0 ? 'none' : !covered ? 'partial' : coverageOf(bucket.count, bucket.recovered);
    const measurement = (key, lower, upper = lower) => {
      const value = bucket.evidence?.[key] ?? { status: coverage === 'none' ? 'unknown' : upper === lower ? 'exact' : 'bounded', lower, upper: coverage === 'complete' ? upper : null };
      return covered ? value : { ...value, status: 'unknown', upper: null };
    };
    return {
      label: labelOf(bucket, index), name: nameOf(bucket, index), href: hrefOf ? hrefOf(bucket, index) : null,
      count: bucket.count, recovered: bucket.recovered, coverage, covered,
      measures: { modified: measurement('modified', bucket.modified), added: measurement('added', bucket.added), deleted: measurement('deleted', bucket.deleted),
        changed: measurement('changed', exact + (bucket.boundedLow || 0), bucket.boundedHigh === null ? null : exact + (bucket.boundedHigh ?? 0)), rawChurn: measurement('rawChurn', bucket.rawChurn || 0) },
      added: bucket.added, deleted: bucket.deleted, modified: bucket.modified, exact,
      boundedLow: bucket.boundedLow || 0, boundedHigh: bucket.boundedHigh ?? null, boundedCount: bucket.boundedCount || 0,
      rawChurn: bucket.rawChurn || 0,
      proven: exact + (bucket.boundedLow || 0),
      ...(bucket.extra ?? {})
    };
  });
  const totals = rows.reduce((total, row) => ({
    count: total.count + row.count, recovered: total.recovered + row.recovered, added: total.added + row.added, deleted: total.deleted + row.deleted, modified: total.modified + row.modified,
    boundedLow: total.boundedLow + row.boundedLow, boundedHigh: total.boundedHigh === null || row.boundedHigh === null ? null : total.boundedHigh + row.boundedHigh, boundedCount: total.boundedCount + row.boundedCount,
    rawChurn: total.rawChurn + row.rawChurn, partial: total.partial + (row.coverage === 'partial' ? 1 : 0)
  }), { count: 0, recovered: 0, added: 0, deleted: 0, modified: 0, boundedLow: 0, boundedHigh: 0, boundedCount: 0, rawChurn: 0, partial: 0 });
  totals.exact = totals.added + totals.deleted + totals.modified;
  totals.proven = totals.exact + totals.boundedLow;
  totals.coverage = coverageOf(totals.count, totals.recovered);
  totals.covered = rows.every(row => row.covered);
  if (!totals.covered) totals.coverage = totals.recovered ? 'partial' : 'none';
  totals.measures = Object.fromEntries(['modified', 'added', 'deleted', 'changed', 'rawChurn'].map(key => [key, sumBounds(rows.map(row => row.measures[key]))]));
  const every = rows.length > 14 ? 2 : 1;
  return { kind: 'mosaic', unit, period, population, scopeLabel, rows, totals, every, strip, compact, sel };
}

/** Pull-request flow over the 13-week context. */
export function flowModel({ weeks, period, scopeLabel = '', labelOf, hrefOf, lifecycle = true }) {
  const rows = weeks.map((week, index) => ({
    label: labelOf(week, index), name: `Week of ${labelOf(week, index)}`, href: hrefOf ? hrefOf(week, index) : null,
    opened: week.opened, merged: week.merged, closed: week.closed, openAtEnd: week.openAtEnd, analysed: week.analysed, covered: week.covered !== false,
    net: week.opened - week.merged - week.closed
  }));
  const totals = rows.reduce((total, row) => ({ opened: total.opened + row.opened, merged: total.merged + row.merged, closed: total.closed + row.closed }), { opened: 0, merged: 0, closed: 0 });
  return { kind: 'flow', unit: 'week', period, scopeLabel, lifecycle, rows, totals: { ...totals, net: totals.opened - totals.merged - totals.closed, openNow: rows.at(-1)?.openAtEnd ?? 0 } };
}

function sizeStats(days) {
  const sorted = days.slice().sort((a, b) => a - b);
  return { n: sorted.length, med: medianOf(sorted), q1: quantile(sorted, 0.25), q3: quantile(sorted, 0.75), min: sorted[0] ?? null, max: sorted.at(-1) ?? null };
}

/**
 * Time to merge by size: `prs` are merged records with lifecycle and the band the current policy
 * judges; rows are `all PRs` then every size label that has merged PRs.
 */
export function ttmModel({ prs, period, hrefOf }) {
  const measured = prs.map(pr => ({ pr, days: elapsedDays(pr.lifecycle?.openedAt, pr.lifecycle?.mergedAt), bandId: pr.latest?.band?.id ?? 'unknown' })).filter(entry => entry.days !== null && entry.days >= 0);
  const groups = [{ key: 'all', label: 'all PRs', short: 'all', color: null, bandId: null, list: measured },
    ...bandList.map(band => ({ key: band.id, label: band.label, short: band.short, color: band.color, bandId: band.id, list: measured.filter(entry => entry.bandId === band.id) })).filter(group => group.list.length)];
  const rows = groups.map(group => ({ key: group.key, label: group.label, short: group.short, color: group.color, bandId: group.bandId, href: hrefOf ? hrefOf(group.bandId) : null, dots: group.list.map(entry => entry.days), ...sizeStats(group.list.map(entry => entry.days)) }));
  const all = rows[0];
  const sized = rows.slice(1);
  const bySlowest = sized.slice().sort((a, b) => b.med - a.med);
  const slowestSolid = bySlowest.find(row => row.n >= 3) ?? null;
  const slowestAny = bySlowest[0] ?? null;
  const sorted = measured.map(entry => entry.days).sort((a, b) => a - b);
  const lo = sorted.length ? Math.max(1 / 48, sorted[0] / 1.8) : 1 / 24, hi = sorted.length ? Math.max(sorted.at(-1) * 1.6, lo * 4) : 7;
  return { kind: 'ttm', unit: 'size', period, rows, n: measured.length, lo, hi,
    slowest: slowestSolid ? { label: slowestSolid.short, med: slowestSolid.med } : null,
    slowerSmall: slowestAny && slowestAny !== slowestSolid ? { label: slowestAny.short, med: slowestAny.med, n: slowestAny.n } : null,
    usually: all ? [all.q1, all.q3] : null, median: all?.med ?? null };
}

/**
 * PR size mix: the known mix as one bar, then one row per label; Unknown is counted but outside the shares. Every
 * median and extreme is interval-aware over all measured PRs of the row, exact and bounded alike (bounded PRs are
 * disproportionately the largest), through the same median the period tiles use for this `basis`.
 */
export function mixModel({ prs, period, lost = 0, hrefOf, basisNote = '', basis = 'retained' }) {
  const median = medianFor(basis);
  const measured = prs.filter(pr => pr.latest);
  const bands = bandList.map(band => ({ band, list: measured.filter(pr => (pr.latest.band?.id ?? 'unknown') === band.id) })).filter(entry => entry.list.length);
  const known = measured.filter(pr => (pr.latest.band?.id ?? 'unknown') !== 'unknown').length;
  const rowOf = (key, label, short, color, list, unknown) => {
    const bounds = list.map(pr => pr.latest.changed);
    const smallest = bounds.length ? Math.min(...bounds.map(value => value.lower ?? 0)) : null;
    const largest = bounds.length ? { status: 'bounded', lower: Math.max(...bounds.map(value => value.lower ?? 0)), upper: bounds.every(value => value.upper !== null) ? Math.max(...bounds.map(value => value.upper)) : null } : null;
    return { key, label, short, color, unknown, count: list.length, share: unknown || !known ? null : list.length / known, medianChanged: median(bounds), smallest, largest, href: hrefOf ? hrefOf(key === 'all' ? null : key) : null };
  };
  const rows = [rowOf('all', 'all PRs', 'all', null, measured, false), ...bands.map(entry => rowOf(entry.band.id, entry.band.label, entry.band.short, entry.band.color, entry.list, entry.band.id === 'unknown'))];
  const most = rows.slice(1).filter(row => !row.unknown).sort((a, b) => b.count - a.count)[0] ?? null;
  const small = rows.slice(1).filter(row => ['xs', 's'].includes(row.key)).reduce((total, row) => total + row.count, 0);
  return { kind: 'mix', unit: 'size', period, rows, n: measured.length, known, lost, basisNote, most: most ? { short: most.short, share: most.share } : null, smallShare: known ? small / known : null, medianChanged: rows[0].medianChanged, maxCount: Math.max(1, ...rows.slice(1).map(row => row.count)) };
}

/** PR lifecycle by size: draft time, ready → merged time and the median total per label. */
export function lifecycleModel({ prs, period, hrefOf }) {
  const HOUR = 3_600_000;
  const measured = prs.filter(pr => pr.lifecycle?.openedAt && pr.lifecycle?.mergedAt);
  const stat = list => {
    const drafted = list.filter(pr => pr.lifecycle.readyAt && Date.parse(pr.lifecycle.readyAt) > Date.parse(pr.lifecycle.openedAt) + HOUR);
    const readyAt = pr => (pr.lifecycle.readyAt && Date.parse(pr.lifecycle.readyAt) > Date.parse(pr.lifecycle.openedAt) ? pr.lifecycle.readyAt : pr.lifecycle.openedAt);
    return { n: list.length, draftShare: list.length ? drafted.length / list.length : 0, dMed: drafted.length ? medianOf(drafted.map(pr => elapsedDays(pr.lifecycle.openedAt, pr.lifecycle.readyAt))) : null,
      rMed: list.length ? medianOf(list.map(pr => elapsedDays(readyAt(pr), pr.lifecycle.mergedAt))) : null, tMed: list.length ? medianOf(list.map(pr => elapsedDays(pr.lifecycle.openedAt, pr.lifecycle.mergedAt))) : null };
  };
  const groups = [{ key: 'all', label: 'all PRs', short: 'all', color: null, bandId: null, list: measured }, ...bandList.map(band => ({ key: band.id, label: band.label, short: band.short, color: band.color, bandId: band.id, list: measured.filter(pr => (pr.latest?.band?.id ?? 'unknown') === band.id) })).filter(group => group.list.length)];
  const rows = groups.map(group => ({ key: group.key, label: group.label, short: group.short, color: group.color, bandId: group.bandId, href: hrefOf ? hrefOf(group.bandId) : null, ...stat(group.list) }));
  const max = Math.max(0.1, ...rows.map(row => Math.max(row.tMed ?? 0, (row.dMed ?? 0) + (row.rMed ?? 0)))) * 1.18;
  return { kind: 'lifecycle', unit: 'size', period, rows, n: measured.length, max };
}

/** Merged PRs by size: one dot per merged PR in its label's lane. */
export function lanesModel({ prs, period, from, to, range = null, hrefOf, repoOf, rowH = 42 }) {
  const measured = prs.filter(pr => pr.lifecycle?.mergedAt).sort((a, b) => a.lifecycle.mergedAt.localeCompare(b.lifecycle.mergedAt));
  const used = bandList.filter(band => measured.some(pr => (pr.latest?.band?.id ?? 'unknown') === band.id));
  const rows = measured.map(pr => {
    const band = bandOf(pr.latest?.band?.id ?? 'unknown');
    const changed = pr.latest?.changed;
    return { number: pr.number, title: pr.title ?? null, repo: repoOf ? repoOf(pr) : null, bandId: band.id, lane: used.indexOf(band), hollow: pr.unrecovered || changed?.status !== 'exact',
      mergedAt: Date.parse(pr.lifecycle.mergedAt), elapsed: elapsedDays(pr.lifecycle.openedAt, pr.lifecycle.mergedAt),
      changed: pr.unrecovered ? null : { status: changed.status, lower: changed.lower, upper: changed.upper }, href: hrefOf ? hrefOf(pr) : null };
  });
  return { kind: 'lanes', unit: 'pull request', period, rows, bands: used.map(band => ({ id: band.id, label: band.label, short: band.short, color: band.color, count: rows.filter(row => row.bandId === band.id).length })), from: Date.parse(from), to: Date.parse(to), range, rowH };
}

function difference(current, previous) {
  if (!current || !previous) return null;
  if (current === previous) return { status: 'exact', lower: 0, upper: 0 };
  if (current.status === 'exact' && previous.status === 'exact' && Number.isFinite(current.lower) && Number.isFinite(previous.lower)) {
    const value = current.lower - previous.lower;
    return { status: 'exact', lower: value, upper: value };
  }
  if (!['exact', 'bounded'].includes(current.status) || !['exact', 'bounded'].includes(previous.status)
    || !Number.isFinite(current.lower) || !Number.isFinite(current.upper)
    || !Number.isFinite(previous.lower) || !Number.isFinite(previous.upper)) {
    return { status: 'unknown', lower: null, upper: null };
  }
  return { status: 'bounded', lower: current.lower - previous.upper, upper: current.upper - previous.lower };
}

/** Development of one PR across its analysed heads, over the size zones of the active policy. */
export function developmentModel({ heads, now }) {
  const rows = heads.map((head, index) => {
    const band = head.band ? bandOf(head.band.id) : null;
    return { index, sha: head.head ? String(head.head).slice(0, 7) : '—', at: Date.parse(head.observedAt), changed: head.changed.lower ?? 0, upper: head.changed.upper ?? null, status: head.changed.status,
      bandId: band?.id ?? null, bandShort: band?.short ?? null, color: band?.color ?? null, changedFrom: index ? difference(head.changed, heads[index - 1].changed) : null, sinceOpened: difference(head.changed, heads[0].changed),
      transition: index && heads[index - 1].band && head.band && heads[index - 1].band.id !== head.band.id ? `${bandOf(heads[index - 1].band.id).short} → ${band.short}` : null };
  });
  const top = Math.max(120, ...rows.map(row => row.upper ?? row.changed)) * 1.35;
  const zones = BANDS.map((band, index) => ({ id: band.id, short: band.short, color: band.color, lo: index ? BANDS[index - 1].lt : 0, hi: Math.min(band.lt, top) })).filter(zone => zone.lo < top);
  return { kind: 'development', unit: 'head', rows, zones, top, now: Date.parse(now) };
}

/** Cumulative merged (or analysed) pull requests through the period against the previous one. */
export function heroModel({ current, previous, from, days, comparable, kindWord }) {
  const cumulative = list => list.reduce((acc, value) => { acc.push((acc.at(-1) ?? 0) + value); return acc; }, []);
  const cur = cumulative(current), prev = comparable ? cumulative(previous) : [];
  const step = (days * DAY) / Math.max(1, current.length);
  return { kind: 'hero', rows: cur.map((value, index) => ({ at: Date.parse(from) + (index + 1) * step, cur: value, prev: prev[index] ?? null })), comparable, kindWord };
}

export { fmtDur };
