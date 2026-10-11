// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * The chart recipes of Chart Grammar v1.1, as ECharts options over the shared models. Marks are
 * authored with custom series; axes, grids and pickers follow the grammar's mechanics. Every
 * recipe returns a Spec for the frame: rows, option(state), the pointer picker where the default
 * category rounding does not apply, and the drill target per row.
 */
import type { Recipe, Spec, FrameState } from './frame';
import { MONO, SANS, type Chart, type Tokens } from './theme';
import { fmtDur, tickDur, n0, niceMax, signed, turnoverText, percent, dateText, describeBound } from '../../lib/charts/format.mjs';

export const enter = (originX: number, originY: number, children: any[], axis: 'x' | 'y', index: number) => ({ type: 'group', originX, originY, enterFrom: axis === 'y' ? { scaleY: 0 } : { scaleX: 0 }, enterAnimation: { duration: 480, delay: Math.min(220, index * 16), easing: 'cubicOut' }, children });
export const chipWidth = (text: string) => text.length * 6.6 + 12;
export const rowPick = (rows: number) => (chart: Chart, point: [number, number]) => { const value = chart.convertFromPixel({ gridIndex: 0 }, point) as number[] | undefined; if (!value) return null; const index = Math.round(value[1]); return index >= 0 && index < rows ? index : null; };
export const nearest = (chart: Chart, point: [number, number], positions: (index: number) => number[] | null, count: number, radius2 = 196) => { let best: number | null = null, distance = radius2; for (let index = 0; index < count; index++) { const at = positions(index); if (!at) continue; const d = (at[0] - point[0]) ** 2 + (at[1] - point[1]) ** 2; if (d < distance) { distance = d; best = index; } } return best; };
export const dateTicks = (from: number, to: number, count: number) => Array.from({ length: count + 1 }, (_, index) => Math.round(from + (index * (to - from)) / count));
export const sizeChip = (T: Tokens, x: number, y: number, text: string, color: string, opacity: number) => { const width = chipWidth(text); return [{ type: 'rect', shape: { x, y: y - 8.5, width, height: 17, r: 8.5 }, style: { fill: color, opacity } }, { type: 'text', style: { text, x: x + width / 2, y, align: 'center', verticalAlign: 'middle', fill: T.machine, font: `600 10.5px ${MONO}`, opacity } }]; };

/** Change volume: the mosaic. */
export const mosaic: Recipe = (model, T) => {
  const rows = model.rows as any[];
  const max = niceMax(Math.max(1, ...rows.map(row => Math.max(row.rawChurn, row.proven))) * 1.06);
  const strip = model.strip as { values: (number | null)[]; start: number | null; label: string } | null;
  const stripValues = strip ? strip.values.filter((value): value is number => value !== null) : [];
  const stripLo = strip ? Math.min(strip.start ?? Infinity, ...stripValues) : 0, stripHi = strip ? Math.max(strip.start ?? -Infinity, ...stripValues) : 0, stripPad = Math.max(4, (stripHi - stripLo) * 0.25);
  return {
    rows: rows.length,
    drill: index => (rows[index].href ? { href: rows[index].href, label: `${rows[index].count} ${model.population} PR${rows[index].count === 1 ? '' : 's'}` } : null),
    option: state => {
      const focus = state.focus ?? state.sel;
      const option: any = {
        grid: strip ? [{ left: 46, right: 10, top: 14, bottom: 26 + 84 }, { left: 46, right: 10, height: 34, bottom: 14 }] : { left: 46, right: 10, top: 14, bottom: 26 },
        xAxis: strip ? [{ type: 'category', data: rows.map(row => row.label), axisLabel: { interval: model.every - 1 } }, { type: 'category', gridIndex: 1, data: rows.map(row => row.label), axisLabel: { show: false }, axisLine: { show: false } }] : { type: 'category', data: rows.map(row => row.label), axisLabel: { interval: model.every - 1 } },
        yAxis: strip ? [{ type: 'value', max, splitNumber: 3, axisLabel: { formatter: (value: number) => (value >= 1000 ? `${(value / 1000).toLocaleString('en-GB')}k` : value) } }, { type: 'value', gridIndex: 1, min: Math.floor(stripLo - stripPad), max: Math.ceil(stripHi + stripPad), interval: Math.ceil(stripHi + stripPad) - Math.floor(stripLo - stripPad), splitLine: { show: false }, axisLabel: { show: false } }] : { type: 'value', max, splitNumber: 3, axisLabel: { formatter: (value: number) => (value >= 1000 ? `${(value / 1000).toLocaleString('en-GB')}k` : value) } },
        series: [{ id: 'm', type: 'custom', data: rows.map((row, index) => [index, row.rawChurn, state.focus === index ? 1 : 0, state.sel === index ? 1 : 0]), encode: { x: 0, y: 1 }, clip: false,
          renderItem: (params: any, api: any) => {
            const index = params.dataIndex, row = rows[index], cs = params.coordSys, c0 = api.coord([index, 0]), bw = api.size([1, 0])[0], width = Math.min(64, bw * 0.62), x0 = c0[0] - width / 2, base = c0[1], y = (value: number) => api.coord([index, value])[1];
            const partial = row.coverage === 'partial', exact = row.exact, proven = row.proven, opacity = partial ? 0.42 : 1, kids: any[] = [];
            if (api.value(2) || api.value(3)) kids.push({ type: 'rect', shape: { x: c0[0] - bw / 2 + 2, y: cs.y - 4, width: bw - 4, height: cs.height + 4, r: 5 }, style: { fill: T.wash, stroke: api.value(3) ? T.accent : 'transparent', lineWidth: 1 }, silent: true });
            if (row.coverage === 'none') { kids.push({ type: 'line', shape: { x1: x0, y1: base - 1, x2: x0 + width, y2: base - 1 }, style: { stroke: T.fg3, lineWidth: 2, lineDash: [2, 3] } }); kids.push({ type: 'text', style: { text: 'unknown', x: c0[0], y: base - 8, align: 'center', verticalAlign: 'bottom', fill: T.fg3, font: `italic 500 10px ${MONO}` } }); return enter(c0[0], base, kids, 'y', index); }
            kids.push({ type: 'rect', shape: { x: x0 - 0.5, y: y(row.rawChurn), width: width + 1, height: base - y(row.rawChurn), r: [3, 3, 0, 0] }, style: { fill: 'none', stroke: T.fg3, lineWidth: 1, lineDash: partial ? [3, 3] : null, opacity: 0.85 } });
            if (exact) {
              const top = y(exact), height = base - top, mw = width * (row.modified / exact), gap = mw > 0 && mw < width ? 2 : 0, rw = Math.max(0, width - mw - gap), ah = height * (row.added / Math.max(1, row.added + row.deleted));
              if (mw > 0) kids.push({ type: 'rect', shape: { x: x0, y: top, width: mw, height, r: [2, 0, 0, 0] }, style: { fill: T.mod, opacity } });
              if (rw > 0) { kids.push({ type: 'rect', shape: { x: x0 + width - rw, y: top, width: rw, height: Math.max(0, ah - 1), r: [0, 2, 0, 0] }, style: { fill: T.add, opacity } }); kids.push({ type: 'rect', shape: { x: x0 + width - rw, y: top + ah + 1, width: rw, height: Math.max(0, height - ah - 1) }, style: { fill: T.del, opacity } }); }
            }
            if (row.boundedLow) kids.push({ type: 'rect', shape: { x: x0, y: y(proven), width, height: Math.max(0, y(exact) - y(proven) - 2), r: [2, 2, 0, 0] }, style: { fill: T.unres, opacity: partial ? 0.5 : 1 } });
            if (partial) kids.push({ type: 'text', style: { text: bw > 74 ? `partial ${row.recovered}/${row.count}` : `${row.recovered}/${row.count}`, x: c0[0], y: y(Math.max(row.rawChurn, proven)) - 6, align: 'center', verticalAlign: 'bottom', fill: T.fg2, font: `500 10.5px ${MONO}` } });
            return enter(c0[0], base, kids, 'y', index);
          } }]
      };
      if (strip) {
        option.graphic = [{ type: 'text', left: 46, bottom: 56, style: { text: `${strip.label} · started at ${strip.start === null ? 'unobserved' : n0(strip.start)}`, fill: T.fg3, font: `500 10.5px ${MONO}` } }];
        option.series.push({ id: 'strip', type: 'line', xAxisIndex: 1, yAxisIndex: 1, step: 'middle', data: strip.values, connectNulls: false, symbol: 'circle', symbolSize: (_: unknown, params: any) => (params.dataIndex === focus ? 8 : 5), itemStyle: { color: T.fg }, lineStyle: { color: T.fg2, width: 1.5 }, areaStyle: { color: 'rgba(180,183,190,.08)', origin: 'start' }, emphasis: { disabled: true }, endLabel: { show: strip.values.at(-1) !== null && strip.values.at(-1) !== undefined, formatter: (params: any) => n0(params.value), color: T.fg, fontFamily: MONO, fontSize: 10.5, distance: 4 } });
      }
      return option;
    }
  };
};

/** Pull-request flow: paired bars, net, the backlog line and the range strip. */
export const flow: Recipe = (model, T) => {
  const rows = model.rows as any[];
  const lifecycle = model.lifecycle as boolean;
  return {
    rows: rows.length,
    drill: index => (rows[index].href ? { href: rows[index].href, label: 'these PRs' } : null),
    option: state => {
      const band = state.focus ?? state.sel, dim = (index: number) => (band === null || band === index ? 1 : 0.42);
      const categories = rows.map(row => row.label);
      if (!lifecycle) {
        return { grid: { left: 30, right: 20, top: 18, bottom: 26 }, xAxis: { type: 'category', data: categories, axisLabel: { interval: 1 } }, yAxis: { type: 'value', max: niceMax(Math.max(1, ...rows.map(row => row.analysed)) * 1.14), splitNumber: 3 },
          series: [{ id: 'analysed', type: 'bar', barWidth: '46%', data: rows.map((row, index) => ({ value: row.analysed, itemStyle: { color: T.fg2, opacity: dim(index), borderRadius: [2, 2, 0, 0] } })), emphasis: { disabled: true }, markArea: band !== null ? { silent: true, itemStyle: { color: T.wash, borderColor: state.sel === band ? T.accent : 'transparent', borderWidth: 1 }, data: [[{ xAxis: band }, { xAxis: band }]] } : undefined }] };
      }
      const max = niceMax(Math.max(1, ...rows.map(row => Math.max(row.opened, row.merged + row.closed, row.openAtEnd))) * 1.14);
      const marker = band !== null ? { silent: true, itemStyle: { color: state.sel === band ? 'rgba(255,255,255,.03)' : T.wash, borderColor: state.sel === band ? T.accent : 'transparent', borderWidth: 1 }, data: [[{ xAxis: band }, { xAxis: band }]] } : undefined;
      const line = { id: 'openEnd', type: 'line', step: 'middle', data: rows.map(row => row.openAtEnd), symbol: 'none', lineStyle: { color: T.fg, width: 1.5, opacity: 0.9, shadowColor: 'rgba(12,15,23,.95)', shadowBlur: 4 }, z: 5, emphasis: { disabled: true }, endLabel: { show: true, formatter: (params: any) => `${params.value} open`, color: T.fg, fontFamily: MONO, fontSize: 10.5, distance: 5 } };
      return {
        grid: { left: 30, right: 58, top: 18, bottom: 64 }, xAxis: { type: 'category', data: categories, axisLabel: { interval: 1 } }, yAxis: { type: 'value', max, splitNumber: 3 },
        series: [line,
          { id: 'opened', type: 'bar', stack: 'in', barWidth: '30%', barGap: '12%', data: rows.map((row, index) => ({ value: row.opened, itemStyle: { color: T.open, opacity: 0.8 * dim(index), borderRadius: [2, 2, 0, 0] } })), emphasis: { disabled: true }, markArea: marker },
          { id: 'merged', type: 'bar', stack: 'out', barWidth: '30%', data: rows.map((row, index) => ({ value: row.merged, itemStyle: { color: row.covered ? T.merged : 'transparent', borderColor: T.merged, borderWidth: row.covered ? 0 : 1, borderType: 'dashed', opacity: dim(index), borderRadius: row.closed ? 0 : [2, 2, 0, 0] } })), emphasis: { disabled: true } },
          { id: 'closed', type: 'bar', stack: 'out', barWidth: '30%', data: rows.map((row, index) => ({ value: row.closed, itemStyle: { color: T.closedHatch, borderColor: T.closed, borderWidth: 0.75, opacity: dim(index), borderRadius: [2, 2, 0, 0] } })), emphasis: { disabled: true } },
          { id: 'net', type: 'custom', data: rows.map((row, index) => [index, Math.max(row.opened, row.merged + row.closed)]), encode: { x: 0, y: 1 }, z: 6, silent: true,
            renderItem: (params: any, api: any) => { const index = params.dataIndex, value = rows[index].net, at = api.coord([index, api.value(1)]); return { type: 'text', style: { text: signed(value), x: at[0], y: at[1] - 6, align: 'center', verticalAlign: 'bottom', fill: value > 0 ? T.fg2 : T.fg3, font: `500 10px ${MONO}`, opacity: dim(index) } }; } }],
        dataZoom: [{ type: 'slider', xAxisIndex: 0, height: 26, bottom: 6, left: 30, right: 58, brushSelect: false, showDetail: false, moveHandleSize: 0, handleSize: '70%', borderColor: T.hair, backgroundColor: 'transparent', fillerColor: 'rgba(255,255,255,.045)',
          handleIcon: 'path://M2,0 L2,20 M6,0 L6,20', handleStyle: { color: T.fg3, borderColor: T.fg3, borderWidth: 1.5 },
          dataBackground: { lineStyle: { color: T.fg3, width: 1, opacity: 0.6 }, areaStyle: { color: 'rgba(180,183,190,.08)' } }, selectedDataBackground: { lineStyle: { color: T.fg2, width: 1.25 }, areaStyle: { color: 'rgba(180,183,190,.16)' } }, textStyle: { color: T.fg3, fontFamily: MONO, fontSize: 10 } }]
      };
    }
  };
};

/** Rows of the size grammar: all PRs first, then one row per size label. */
function sizeRowFrame(T: Tokens, params: any, api: any, row: any, index: number, state: FrameState, rightPad: number) {
  const cs = params.coordSys, y = api.coord([0, index])[1], focus = state.focus ?? state.sel, on = focus === null || focus === index, opacity = on ? 1 : 0.32, kids: any[] = [];
  if (focus === index || state.sel === index) kids.push({ type: 'rect', shape: { x: cs.x - 60, y: y - 15, width: cs.width + rightPad + 60, height: 30, r: 5 }, style: { fill: T.wash, stroke: state.sel === index ? T.accent : 'transparent' } });
  if (index === 0) kids.push({ type: 'line', shape: { x1: cs.x - 60, y1: y + 17, x2: cs.x + cs.width + rightPad, y2: y + 17 }, style: { stroke: T.hair, lineWidth: 1 } });
  if (row.color) kids.push(...sizeChip(T, cs.x - 58, y, row.short, row.color, opacity));
  else kids.push({ type: 'text', style: { text: 'all PRs', x: cs.x - 58, y, verticalAlign: 'middle', fill: T.fg, font: `600 11.5px ${SANS}`, opacity } });
  return { cs, y, on, opacity, kids };
}

/** Time to merge by size, on a log time axis with its ruler. */
export const ttm: Recipe = (model, T) => {
  const rows = model.rows as any[];
  const lo = model.lo as number, hi = model.hi as number, ln = (days: number) => Math.log(Math.max(lo, days));
  const ticks = [1 / 24, 3 / 24, 6 / 24, 12 / 24, 1, 2, 3, 5, 7, 14, 28].filter(tick => tick >= lo && tick <= hi);
  const ruler: number[] = [];
  for (let t = 3 / 24; t < 1; t += 3 / 24) if (t > lo && t < hi) ruler.push(t);
  for (let t = 1; t < 7; t++) if (t > lo && t < hi) ruler.push(t);
  for (let t = 7; t < hi; t += 7) if (t > lo) ruler.push(t);
  const unitIndex = (t: number) => (t < 1 ? Math.round(t * 8) : t < 7 ? Math.round(t) : Math.round(t / 7));
  const all = rows[0];
  return {
    rows: rows.length,
    pick: rowPick(rows.length),
    drill: index => (rows[index].href ? { href: rows[index].href, label: `${rows[index].n} PRs` } : null),
    option: state => ({
      grid: { left: 64, right: 58, top: 10, bottom: 34 },
      xAxis: { type: 'value', min: ln(lo), max: ln(hi), axisLabel: { margin: 14, customValues: ticks.map(ln), formatter: (value: number) => tickDur(Math.exp(value)) }, axisTick: { show: true, customValues: ticks.map(ln), lineStyle: { color: T.hairS } }, splitLine: { show: false }, axisLine: { show: true, lineStyle: { color: T.hairS } } },
      yAxis: { type: 'value', min: -0.5, max: rows.length - 0.5, inverse: true, show: false },
      series: rows.length === 0 ? [] : [
        { id: 'grid', type: 'line', data: [], z: 1, markLine: { silent: true, symbol: 'none', label: { show: false }, lineStyle: { color: T.grid, width: 1, type: 'solid' }, data: ticks.map(tick => ({ xAxis: ln(tick) })) } },
        { id: 'minor', type: 'line', data: [], z: 1, markLine: { silent: true, symbol: 'none', label: { show: false }, lineStyle: { color: 'rgba(255,255,255,.035)', width: 1, type: 'solid' }, data: ruler.map(tick => ({ xAxis: ln(tick) })) } },
        { id: 'ruler', type: 'custom', data: [[ln(lo), 0]], encode: { x: 0, y: 1 }, z: 4, silent: true, clip: false, renderItem: (params: any, api: any) => {
          const cs = params.coordSys, y0 = cs.y + cs.height + 3, kids: any[] = [], edges = [lo, ...ruler, hi];
          for (let k = 0; k < edges.length - 1; k++) { const a = api.coord([ln(edges[k]), 0])[0], b = api.coord([ln(edges[k + 1]), 0])[0]; kids.push({ type: 'rect', shape: { x: a, y: y0, width: Math.max(0, b - a - 1), height: 5 }, style: { fill: edges[k] >= 7 ? 'rgba(180,183,190,.55)' : edges[k] >= 1 ? (unitIndex(edges[k]) % 2 ? 'rgba(180,183,190,.42)' : 'rgba(180,183,190,.2)') : (unitIndex(edges[k]) % 2 ? 'rgba(130,134,144,.38)' : 'rgba(130,134,144,.16)') } }); }
          return { type: 'group', children: kids };
        } },
        { id: 'allmed', type: 'line', data: [], z: 2, markLine: { silent: true, symbol: 'none', label: { show: false }, lineStyle: { color: T.fg3, width: 1, type: [3, 3] }, data: [{ xAxis: ln(all.med) }] } },
        { id: 'm', type: 'custom', z: 3, data: rows.map((row, index) => [ln(row.med), index]), encode: { x: 0, y: 1 }, renderItem: (params: any, api: any) => {
          const index = params.dataIndex, row = rows[index];
          const { cs, y, on, opacity, kids } = sizeRowFrame(T, params, api, row, index, state, 56);
          const X = (days: number) => api.coord([ln(days), index])[0], lead = index === 0;
          row.dots.forEach((days: number, k: number) => kids.push({ type: 'circle', shape: { cx: X(days), cy: y + ((k % 3) - 1) * 3, r: 2.6 }, style: { fill: row.color ?? T.fg2, opacity: (lead ? 0.35 : 0.45) * opacity } }));
          const x1 = X(row.q1), x3 = X(row.q3), xm = X(row.med), h = lead ? 12 : 10;
          if (row.n < 3) kids.push({ type: 'rect', shape: { x: Math.min(x1, xm - 4), y: y - h / 2, width: Math.max(8, x3 - x1), height: h, r: h / 2 }, style: { fill: 'none', stroke: row.color ?? T.fg2, lineWidth: 1.25, lineDash: [3, 2.5], opacity } });
          else kids.push({ type: 'rect', shape: { x: x1, y: y - h / 2, width: Math.max(6, x3 - x1), height: h, r: h / 2 }, style: { fill: row.color ?? T.fg2, opacity: (lead ? 0.5 : 0.85) * opacity } });
          kids.push({ type: 'rect', shape: { x: xm - 1.5, y: y - h / 2 - 4, width: 3, height: h + 8, r: 1.5 }, style: { fill: T.fg, stroke: T.raised, lineWidth: 1, opacity } });
          kids.push({ type: 'text', style: { text: fmtDur(row.med), x: cs.x + cs.width + 8, y: y - 6, verticalAlign: 'middle', fill: on ? T.fg : T.fg3, font: `600 11.5px ${MONO}` } }, { type: 'text', style: { text: `n=${row.n}`, x: cs.x + cs.width + 8, y: y + 7, verticalAlign: 'middle', fill: T.fg3, font: `500 10px ${MONO}` } });
          return { type: 'group', originX: cs.x, originY: y, enterFrom: { scaleX: 0 }, enterAnimation: { duration: 460, delay: Math.min(200, index * 30), easing: 'cubicOut' }, children: kids };
        } }]
    })
  };
};

/** PR size mix: the whole mix as one bar, then count capsules per label. */
export const mix: Recipe = (model, T) => {
  const rows = model.rows as any[];
  const known = Math.max(1, model.known as number);
  return {
    rows: rows.length,
    pick: rowPick(rows.length),
    drill: index => (rows[index].href ? { href: rows[index].href, label: `${rows[index].count} PRs` } : null),
    option: state => ({
      grid: { left: 64, right: 112, top: 10, bottom: 10 }, xAxis: { type: 'value', min: 0, max: 1, show: false }, yAxis: { type: 'value', min: -0.5, max: rows.length - 0.5, inverse: true, show: false },
      series: rows.length === 0 ? [] : [{ id: 'm', type: 'custom', data: rows.map((_, index) => [0, index]), encode: { x: 0, y: 1 }, renderItem: (params: any, api: any) => {
        const index = params.dataIndex, row = rows[index];
        const { cs, y, on, opacity, kids } = sizeRowFrame(T, params, api, row, index, state, 110);
        if (index === 0) {
          let x = cs.x;
          for (const part of rows.slice(1).filter(candidate => !candidate.unknown)) { const width = (part.count / known) * cs.width; kids.push({ type: 'rect', shape: { x: x + 1, y: y - 8, width: Math.max(1, width - 2), height: 16, r: 3 }, style: { fill: part.color, opacity } }); if (width > 46) kids.push({ type: 'text', style: { text: `${part.short} ${percent(part.count / known)}`, x: x + 7, y, verticalAlign: 'middle', fill: T.machine, font: `600 10.5px ${MONO}`, opacity } }); x += width; }
          kids.push({ type: 'text', style: { text: String(model.n), x: cs.x + cs.width + 10, y: y - 6, verticalAlign: 'middle', fill: T.fg, font: `600 11.5px ${MONO}` } }, { type: 'text', style: { text: 'PRs', x: cs.x + cs.width + 10, y: y + 7, verticalAlign: 'middle', fill: T.fg3, font: `500 10px ${MONO}` } });
          return { type: 'group', originX: cs.x, originY: y, enterFrom: { scaleX: 0 }, enterAnimation: { duration: 460, easing: 'cubicOut' }, children: kids };
        }
        const width = (row.count / model.maxCount) * cs.width;
        kids.push({ type: 'rect', shape: { x: cs.x, y: y - 5, width: cs.width, height: 10, r: 5 }, style: { fill: T.wash } });
        kids.push({ type: 'rect', shape: { x: cs.x, y: y - 5, width: Math.max(6, width), height: 10, r: 5 }, style: row.unknown ? { fill: 'none', stroke: row.color, lineWidth: 1.25, lineDash: [3, 2.5], opacity } : { fill: row.color, opacity: 0.85 * opacity } });
        kids.push({ type: 'text', style: { text: String(row.count), x: cs.x + cs.width + 10, y: y - 6, verticalAlign: 'middle', fill: on ? T.fg : T.fg3, font: `600 11.5px ${MONO}` } }, { type: 'text', style: { text: row.share === null ? 'held' : percent(row.share), x: cs.x + cs.width + 10, y: y + 7, verticalAlign: 'middle', fill: T.fg3, font: `500 10px ${MONO}` } });
        if (row.medianChanged?.status !== 'empty') kids.push({ type: 'text', style: { text: `med ${describeBound(row.medianChanged)}`, x: cs.x + cs.width + 46, y, verticalAlign: 'middle', fill: T.fg3, font: `500 10px ${MONO}`, opacity } });
        return { type: 'group', originX: cs.x, originY: y, enterFrom: { scaleX: 0 }, enterAnimation: { duration: 460, delay: Math.min(200, index * 30), easing: 'cubicOut' }, children: kids };
      } }]
    })
  };
};

/** PR lifecycle by size: draft, then ready → merged, with the median total as its own tick. */
export const lifecycle: Recipe = (model, T) => {
  const rows = model.rows as any[];
  const max = model.max as number;
  return {
    rows: rows.length,
    pick: rowPick(rows.length),
    drill: index => (rows[index].href ? { href: rows[index].href, label: `${rows[index].n} PRs` } : null),
    option: state => ({
      grid: { left: 64, right: 58, top: 10, bottom: 28 },
      xAxis: { type: 'value', min: 0, max, splitNumber: 4, axisLabel: { formatter: (value: number) => (value ? `${Number(value.toFixed(1))} d` : '0') }, splitLine: { show: true, lineStyle: { color: T.grid } } },
      yAxis: { type: 'value', min: -0.5, max: rows.length - 0.5, inverse: true, show: false },
      series: rows.length === 0 ? [] : [{ id: 'm', type: 'custom', data: rows.map((row, index) => [row.tMed ?? 0, index]), encode: { x: 0, y: 1 }, renderItem: (params: any, api: any) => {
        const index = params.dataIndex, row = rows[index];
        const { cs, y, on, opacity, kids } = sizeRowFrame(T, params, api, row, index, state, 56);
        const X = (days: number) => api.coord([days, index])[0], lead = index === 0, h = lead ? 12 : 10, color = row.color ?? T.fg2;
        const x0 = X(0), xd = X(row.dMed ?? 0), xr = X((row.dMed ?? 0) + (row.rMed ?? 0)), few = row.n < 3;
        if (row.dMed) kids.push({ type: 'rect', shape: { x: x0, y: y - h / 2, width: Math.max(3, xd - x0 - 2), height: h, r: [h / 2, 0, 0, h / 2] }, style: { fill: 'none', stroke: color, lineWidth: 1.25, lineDash: [2, 2], opacity } });
        kids.push({ type: 'rect', shape: { x: xd, y: y - h / 2, width: Math.max(4, xr - xd), height: h, r: row.dMed ? [0, h / 2, h / 2, 0] : h / 2 }, style: few ? { fill: 'none', stroke: color, lineWidth: 1.25, lineDash: [3, 2.5], opacity } : { fill: color, opacity: (lead ? 0.5 : 0.85) * opacity } });
        const xt = X(row.tMed ?? 0); kids.push({ type: 'rect', shape: { x: xt - 1.5, y: y - h / 2 - 4, width: 3, height: h + 8, r: 1.5 }, style: { fill: T.fg, stroke: T.raised, lineWidth: 1, opacity } });
        kids.push({ type: 'text', style: { text: fmtDur(row.tMed), x: cs.x + cs.width + 8, y: y - 6, verticalAlign: 'middle', fill: on ? T.fg : T.fg3, font: `600 11.5px ${MONO}` } }, { type: 'text', style: { text: `n=${row.n}`, x: cs.x + cs.width + 8, y: y + 7, verticalAlign: 'middle', fill: T.fg3, font: `500 10px ${MONO}` } });
        return { type: 'group', originX: cs.x, originY: y, enterFrom: { scaleX: 0 }, enterAnimation: { duration: 460, delay: Math.min(200, index * 30), easing: 'cubicOut' }, children: kids };
      } }]
    })
  };
};

/** Merged PRs by size: one dot per merged PR in its lane. */
export const lanes: Recipe = (model, T) => {
  const rows = model.rows as any[];
  const bands = model.bands as any[];
  const from = model.from as number, to = model.to as number;
  const range = model.range as [number, number] | null;
  return {
    rows: rows.length,
    pick: (chart, point) => nearest(chart, point, index => chart.convertToPixel({ seriesId: 'm' }, [rows[index].mergedAt, rows[index].lane]) as number[], rows.length, 144),
    drill: index => (rows[index].href ? { href: rows[index].href, label: `#${rows[index].number}` } : null),
    option: state => {
      const focus = state.focus ?? state.sel;
      return {
        grid: { left: 70, right: 14, top: 8, bottom: 26 },
        xAxis: { type: 'time', min: from, max: to, axisLabel: { customValues: dateTicks(from, to, 6), formatter: (value: number) => dateText(value) }, axisTick: { customValues: dateTicks(from, to, 6) }, splitLine: { show: false } },
        yAxis: { type: 'value', min: -0.5, max: Math.max(0.5, bands.length - 0.5), inverse: true, show: false },
        series: [{ id: 'lanes', type: 'custom', data: bands.map((_, index) => [from, index]), encode: { x: 0, y: 1 }, silent: true, renderItem: (params: any, api: any) => {
          const index = params.dataIndex, band = bands[index], cs = params.coordSys, y = api.coord([from, index])[1];
          return { type: 'group', children: [{ type: 'line', shape: { x1: cs.x, y1: y, x2: cs.x + cs.width, y2: y }, style: { stroke: T.grid, lineWidth: 1 } }, ...sizeChip(T, cs.x - 64, y, band.short, band.color, 1)] };
        } },
        { id: 'm', type: 'scatter', data: rows.map((row, index) => ({ value: [row.mergedAt, row.lane], itemStyle: row.hollow ? { color: 'transparent', borderColor: T.bands[row.bandId] ?? T.bands.unknown, borderWidth: 1.5, borderType: 'dashed', opacity: focus === null || focus === index ? 1 : 0.3 } : { color: T.bands[row.bandId] ?? T.bands.unknown, borderColor: state.sel === index ? T.accent : focus === index ? T.fg : T.raised, borderWidth: focus === index || state.sel === index ? 2 : 1.5, opacity: focus === null || focus === index ? 1 : 0.3 } })), symbolSize: (_: unknown, params: any) => (params.dataIndex === focus ? 16 : 12), emphasis: { disabled: true }, z: 3,
          markArea: range ? { silent: true, itemStyle: { color: 'rgba(240,97,186,.07)', borderColor: 'rgba(240,97,186,.55)', borderWidth: 1 }, data: [[{ xAxis: range[0] }, { xAxis: range[1] }]] } : undefined }]
      };
    }
  };
};

/** Development: Changed per analysed head over the policy's size zones. */
export const development: Recipe = (model, T) => {
  const rows = model.rows as any[];
  const zones = model.zones as any[];
  const last = rows.length - 1;
  return {
    rows: rows.length,
    option: state => {
      const focus = state.focus ?? state.sel ?? last;
      return {
        grid: { left: 40, right: 44, top: 14, bottom: 26 },
        xAxis: { type: 'category', boundaryGap: false, data: rows.map((_, index) => `head ${index + 1}`), axisLine: { show: false } },
        yAxis: { type: 'value', min: 0, max: model.top, splitNumber: 3, splitLine: { show: false } },
        series: [
          { id: 'zones', type: 'custom', data: zones.map((_, index) => [0, index]), silent: true, z: 1, renderItem: (params: any, api: any) => { const zone = zones[params.dataIndex], cs = params.coordSys, yTop = api.coord([0, zone.hi])[1], yBottom = api.coord([0, zone.lo])[1], current = rows[focus]?.bandId === zone.id;
            return { type: 'group', children: [{ type: 'rect', shape: { x: cs.x, y: yTop, width: cs.width, height: yBottom - yTop }, style: { fill: zone.color, opacity: current ? 0.13 : 0.045 } }, { type: 'line', shape: { x1: cs.x, y1: yBottom, x2: cs.x + cs.width, y2: yBottom }, style: { stroke: zone.color, opacity: zone.lo ? 0.35 : 0, lineWidth: 1, lineDash: [2, 3] } }, { type: 'text', style: { text: zone.short, x: cs.x + cs.width + 8, y: (yBottom + yTop) / 2, verticalAlign: 'middle', fill: current ? zone.color : T.fg3, font: `600 10.5px ${MONO}` } }] }; } },
          { id: 'm', type: 'line', data: rows.map(row => row.changed), z: 3, symbol: 'circle', symbolSize: (_: unknown, params: any) => (params.dataIndex === focus ? 13 : params.dataIndex === last ? 11 : 9), itemStyle: { color: T.raised, borderColor: T.fg, borderWidth: 2 }, lineStyle: { color: T.fg2, width: 1.75 }, emphasis: { disabled: true },
            label: { show: true, position: 'top', distance: 8, color: T.fg, fontFamily: MONO, fontSize: 11, fontWeight: 600, formatter: (params: any) => (rows[params.dataIndex].upper !== null && rows[params.dataIndex].upper !== rows[params.dataIndex].changed ? `${n0(rows[params.dataIndex].changed)}–${n0(rows[params.dataIndex].upper)}` : n0(params.value)) },
            markPoint: { silent: true, symbol: 'roundRect', symbolSize: [46, 17], itemStyle: { color: T.raised2, borderColor: T.hairS }, label: { color: T.fg, fontFamily: MONO, fontSize: 10 }, data: rows.map((row, index) => (row.transition ? { coord: [index, row.changed], symbolOffset: [0, 26], value: row.transition.replace(' → ', '→') } : null)).filter(Boolean) } }
        ]
      };
    }
  };
};

/** The recipes by chart kind. The premium extension adds its file charts through `registerCharts` (mount.ts). */
export const RECIPES: Record<string, Recipe> = { mosaic, flow, ttm, mix, lifecycle, lanes, development };
export type { Spec };
