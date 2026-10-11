// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * The one ECharts registration for the App: the modular build with the SVG renderer, and the
 * `diffdevil` theme read from the design tokens at runtime, so the charts follow the stylesheet
 * rather than a second palette. Hatch textures are drawn once per token set.
 */
import * as echarts from 'echarts/core';
import { BarChart, CustomChart, LineChart, ScatterChart } from 'echarts/charts';
import { DataZoomSliderComponent, GraphicComponent, GridComponent, MarkAreaComponent, MarkLineComponent, MarkPointComponent } from 'echarts/components';
import { LabelLayout } from 'echarts/features';
import { SVGRenderer } from 'echarts/renderers';

echarts.use([BarChart, CustomChart, LineChart, ScatterChart, DataZoomSliderComponent, GraphicComponent, GridComponent, MarkAreaComponent, MarkLineComponent, MarkPointComponent, LabelLayout, SVGRenderer]);

export { echarts };
export type Chart = echarts.ECharts;

export const MONO = '"IBM Plex Mono", ui-monospace, Menlo, Consolas, monospace';
export const SANS = '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif';

export interface Tokens {
  fg: string; fg2: string; fg3: string; hair: string; hairS: string; grid: string; raised: string; raised2: string; machine: string;
  add: string; del: string; mod: string; open: string; merged: string; closed: string; accent: string; wash: string;
  unres: { image: HTMLCanvasElement; repeat: 'repeat' }; closedHatch: { image: HTMLCanvasElement; repeat: 'repeat' };
  bands: Record<string, string>;
}

/** Hatch textures: one diagonal family; colour carries what is unresolved (neutral) or closed (state). */
function hatch(line: string, background: string, gap: number): { image: HTMLCanvasElement; repeat: 'repeat' } {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = gap * 2;
  const context = canvas.getContext('2d')!;
  context.fillStyle = background; context.fillRect(0, 0, gap * 2, gap * 2);
  context.strokeStyle = line; context.lineWidth = 1.6;
  for (let offset = -gap * 2; offset <= gap * 2; offset += gap) { context.beginPath(); context.moveTo(offset, gap * 2); context.lineTo(offset + gap * 2, 0); context.stroke(); }
  return { image: canvas, repeat: 'repeat' };
}

let tokens: Tokens | null = null;

/** Read the chart tokens once from the document's computed custom properties. */
export function readTokens(): Tokens {
  if (tokens) return tokens;
  const style = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  const fg = read('--ch-ink-1', '#f0f2f5'), fg2 = read('--ch-ink-2', '#b4b7be'), fg3 = read('--ch-ink-3', '#828690'), hair = read('--hair', '#2c303a');
  const closed = read('--ch-closed', '#ff7a70');
  tokens = {
    fg, fg2, fg3, hair, hairS: read('--hair-strong', '#484d58'), grid: read('--ch-grid', '#22262f'), raised: read('--bg-raised', '#1d222c'), raised2: read('--bg-raised-2', '#262b36'), machine: read('--bg-machine', '#0c0f17'),
    add: read('--diff-add', '#8fd6aa'), del: read('--diff-del', '#ff9fb0'), mod: read('--diff-mod', '#9fc4ff'), open: read('--ch-open', '#8fd6aa'), merged: read('--ch-merged', '#c3b5ff'), closed, accent: read('--accent', '#f061ba'),
    wash: 'rgba(255,255,255,.035)',
    unres: hatch(fg3, hair, 5), closedHatch: hatch(`${closed}cc`, 'transparent', 4),
    bands: { xs: '#C2E0C6', s: '#BFDADC', m: '#C5DEF5', l: '#D4C5F9', xl: '#DCC6E0', unknown: '#D1D5DB' }
  };
  echarts.registerTheme('diffdevil', {
    backgroundColor: 'transparent',
    textStyle: { fontFamily: MONO, color: fg3, fontSize: 10.5 },
    animationDuration: 480, animationEasing: 'cubicOut', animationDurationUpdate: 160, animationEasingUpdate: 'cubicOut',
    categoryAxis: { axisLine: { lineStyle: { color: tokens.hairS } }, axisTick: { show: false }, axisLabel: { color: fg3, fontFamily: MONO, fontSize: 10.5, margin: 10 }, splitLine: { show: false } },
    valueAxis: { axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: fg3, fontFamily: MONO, fontSize: 10.5, margin: 12 }, splitLine: { lineStyle: { color: tokens.grid, width: 1 } } },
    timeAxis: { axisLine: { lineStyle: { color: tokens.hairS } }, axisTick: { show: false }, axisLabel: { color: fg3, fontFamily: MONO, fontSize: 10.5, margin: 10 }, splitLine: { show: false } },
    logAxis: { axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: fg3, fontFamily: MONO, fontSize: 10.5 }, splitLine: { lineStyle: { color: tokens.grid, width: 1 } } }
  });
  return tokens;
}

export const reducedMotion = (): boolean => matchMedia('(prefers-reduced-motion: reduce)').matches;
