// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * The Overview hero line: cumulative merged pull requests through the period against the
 * previous one. Hover or arrow keys rewrite the delta line beside the lead figure; leaving
 * restores it. One tab stop, no tooltip.
 */
import { echarts, readTokens, reducedMotion, MONO, type Chart } from './theme';
import { dateText } from '../../lib/charts/format.mjs';

export function mountHero(host: HTMLElement): Chart | null {
  const script = host.querySelector<HTMLScriptElement>('[data-chart-model]');
  const stage = host.querySelector<HTMLElement>('[data-hero-plot]');
  let delta = host.querySelector<HTMLElement>('[data-hero-dl]');
  if (!script || !stage || !delta) return null;
  const model = JSON.parse(script.textContent || 'null');
  const rows = model.rows as { at: number; cur: number; prev: number | null }[];
  if (!rows.length) return null;
  const T = readTokens();
  stage.replaceChildren();
  const chart = echarts.init(stage, 'diffdevil', { renderer: 'svg' });
  let base = delta.innerHTML;
  let last = rows.length - 1;
  let focus: number | null = null;
  const option = () => ({
    animation: !reducedMotion(), tooltip: { show: false },
    grid: { left: 26, right: 34, top: 8, bottom: 20 },
    xAxis: { type: 'category', boundaryGap: false, data: rows.map(row => dateText(row.at)), axisLabel: { interval: Math.ceil(rows.length / 3) - 1, formatter: (value: string, index: number) => (index === last ? 'today' : value) }, axisLine: { show: false } },
    yAxis: { type: 'value', splitNumber: 2 },
    series: [
      ...(model.comparable ? [{ id: 'prev', type: 'line', data: rows.map(row => row.prev), symbol: 'none', lineStyle: { color: T.fg3, width: 1.5, type: [4, 4] }, emphasis: { disabled: true } }] : []),
      { id: 'cur', type: 'line', data: rows.map(row => row.cur), symbol: 'circle', symbolSize: (_: unknown, params: any) => (params.dataIndex === focus || (focus === null && params.dataIndex === last) ? 8 : 0), itemStyle: { color: T.raised, borderColor: T.fg, borderWidth: 2 }, lineStyle: { color: T.fg, width: 2 }, areaStyle: { color: 'rgba(240,242,245,.06)' }, emphasis: { disabled: true },
        endLabel: { show: focus === null, formatter: (params: any) => String(params.value), color: T.fg, fontFamily: MONO, fontSize: 11, fontWeight: 600, distance: 6 },
        markLine: focus !== null ? { silent: true, symbol: 'none', label: { show: false }, lineStyle: { color: T.hairS, type: 'solid' }, data: [{ xAxis: focus }] } : undefined }
    ]
  });
  chart.setOption(option());
  const set = (index: number | null) => {
    if (index === focus) return;
    focus = index;
    chart.setOption(option(), { replaceMerge: ['series'] });
    if (index === null) { delta!.innerHTML = base; return; }
    const row = rows[index];
    const compare = model.comparable && row.prev !== null ? ` · previous by then <b>${row.prev}</b> · <b>${row.cur - row.prev >= 0 ? '+' : '−'}${Math.abs(row.cur - row.prev)}</b>` : '';
    delta!.innerHTML = `<span>by <b>${dateText(row.at)}</b> · <b>${row.cur}</b> ${model.kindWord}${compare}</span>`;
  };
  const zr = chart.getZr();
  let pointerAt: [number, number] | null = null;
  // A synthesised mousemove after a layout shift repeats the last position; it is not pointer intent.
  zr.on('mousemove', (event: any) => { const point: [number, number] = [event.offsetX, event.offsetY]; if (pointerAt && pointerAt[0] === point[0] && pointerAt[1] === point[1]) return; pointerAt = point; if (!chart.containPixel('grid', point)) return set(null); const value = chart.convertFromPixel({ gridIndex: 0 }, point) as number[] | undefined; set(Math.max(0, Math.min(last, Math.round(value ? value[0] : 0)))); });
  zr.on('globalout', () => set(null));
  stage.tabIndex = 0;
  stage.setAttribute('role', 'application');
  stage.setAttribute('aria-label', `Cumulative ${model.kindWord} pull requests: arrow keys step through the period`);
  stage.addEventListener('keydown', event => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); set(Math.max(0, Math.min(last, (focus ?? last) + (event.key === 'ArrowRight' ? 1 : -1)))); } if (event.key === 'Escape') set(null); });
  stage.addEventListener('blur', () => set(null));
  const observer = new ResizeObserver(() => { if (!stage.isConnected || chart.isDisposed()) { observer.disconnect(); return; } chart.resize(); });
  observer.observe(stage);
  host.classList.add('is-mounted');
  // The period swap replaces the hero's text around the plot; the line re-reads its delta element and the new window.
  (host as any).__hero = { chart, update(next: any) { model.rows = next.rows; model.comparable = next.comparable; model.kindWord = next.kindWord; rows.splice(0, rows.length, ...next.rows); last = rows.length - 1; focus = null; delta = host.querySelector<HTMLElement>('[data-hero-dl]') ?? delta; base = delta!.innerHTML; chart.setOption(option(), { replaceMerge: ['series'] }); } };
  return chart;
}
