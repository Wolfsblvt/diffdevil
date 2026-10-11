// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * The F1 frame controller: one ECharts instance inside a server-rendered frame, with the
 * readout as legend, tooltip and keyboard announcement at once; hover, keyboard and pin that
 * never move the plot; the chart/table switch; linked groups over the same buckets; and an
 * in-place update for the period morph. Recipes supply the option, the mark picker and the
 * drill target; the readout text comes from the shared model module.
 */
import { echarts, readTokens, reducedMotion, type Chart, type Tokens } from './theme';
import { readoutOf, readoutHtml, readoutText } from '../../lib/charts/readout.mjs';

export interface FrameState { focus: number | null; sel: number | null; view: 'chart' | 'table' }
export interface Spec {
  rows: number;
  option: (state: FrameState) => echarts.EChartsCoreOption;
  /** Nearest mark under a pointer position; the default rounds the category under the pointer. */
  pick?: (chart: Chart, point: [number, number]) => number | null;
  /** Drill target of a row, or null when the row has nowhere to go. */
  drill?: (index: number) => { href: string; label: string } | null;
  /** Rows whose selection is kept across Esc and re-click (the chart drives other panels). */
  keepSel?: boolean;
  /** Called when the selection changes through this chart. */
  onSelect?: (index: number | null) => void;
  /** Stagger entrance marks of these series (bar, scatter) a little. */
  stagger?: boolean;
}
export type Recipe = (model: any, tokens: Tokens, context: { host: HTMLElement }) => Spec;

const GROUPS = new Map<string, Set<Frame>>();

export class Frame {
  readonly host: HTMLElement;
  readonly kind: string;
  readonly id: string;
  readonly chart: Chart;
  model: any;
  private spec: Spec;
  private readonly recipe: Recipe;
  private readonly tokens: Tokens;
  private readonly plot: HTMLElement;
  private readonly readout: HTMLElement;
  private readonly table: HTMLElement;
  private readonly announce: HTMLElement | null;
  private readonly group: string | null;
  private state: FrameState;
  /** Focus set from the keyboard; pointer-out events then leave it alone until the pointer really moves inside the plot or the plot blurs. */
  private keyed = false;
  /** When a page swap handed focus back to the plot: that focus is a restoration, not an entry, so nothing is auto-picked. */
  private restoredAt = -1;
  private pointerAt: [number, number] | null = null;
  private morphing = false;
  private observer: ResizeObserver;

  constructor(host: HTMLElement, recipe: Recipe) {
    this.host = host;
    this.kind = host.dataset.chart!;
    this.id = host.dataset.chartId!;
    this.recipe = recipe;
    this.tokens = readTokens();
    this.plot = host.querySelector<HTMLElement>('[data-plot]')!;
    this.readout = host.querySelector<HTMLElement>('[data-readout]')!;
    this.table = host.querySelector<HTMLElement>('[data-table]')!;
    this.announce = host.querySelector<HTMLElement>('[data-announce]');
    this.group = host.dataset.chartGroup ?? null;
    this.model = JSON.parse(host.querySelector<HTMLScriptElement>('[data-chart-model]')!.textContent || 'null');
    this.state = { focus: null, sel: host.dataset.sel ? Number(host.dataset.sel) : null, view: 'chart' };
    this.spec = recipe(this.model, this.tokens, { host });
    if (host.dataset.keepSel === 'true') this.spec.keepSel = true;
    this.plot.replaceChildren();
    this.chart = echarts.init(this.plot, 'diffdevil', { renderer: 'svg' });
    const first = this.option();
    if (this.spec.stagger !== false) for (const series of (first.series as any[]) ?? []) if (series.type === 'bar' || series.type === 'scatter') series.animationDelay = (index: number) => Math.min(220, index * 12);
    this.chart.setOption(first);
    this.paintReadout();
    this.wire();
    if (this.group) { if (!GROUPS.has(this.group)) GROUPS.set(this.group, new Set()); GROUPS.get(this.group)!.add(this); }
    this.observer = new ResizeObserver(() => { if (!this.plot.isConnected || this.chart.isDisposed()) { this.observer.disconnect(); return; } this.chart.resize(); });
    this.observer.observe(this.plot);
    host.classList.add('is-mounted');
    (host as any).__frame = this;
  }

  private option(): echarts.EChartsCoreOption {
    const option = this.spec.option(this.state);
    option.tooltip = { show: false };
    option.animation = !reducedMotion();
    option.animationDurationUpdate = this.morphing ? 620 : 160;
    option.animationEasingUpdate = this.morphing ? 'cubicInOut' : 'cubicOut';
    return option;
  }

  private paint(): void {
    this.chart.setOption(this.option(), { replaceMerge: ['series', 'graphic'] });
    this.paintReadout();
  }

  private paintReadout(): void {
    const index = this.state.focus ?? this.state.sel;
    const pinned = this.state.sel !== null && (this.state.focus === null || this.state.focus === this.state.sel);
    const drill = pinned && this.spec.drill ? this.spec.drill(this.state.sel!) : null;
    this.readout.innerHTML = readoutHtml(readoutOf(this.model, index), { pinned, clearable: pinned && !this.spec.keepSel, drill, hint: index === null });
  }

  private say(): void {
    if (!this.announce) return;
    const index = this.state.focus ?? this.state.sel;
    this.announce.textContent = `${readoutText(readoutOf(this.model, index))}${this.state.sel !== null && this.state.sel === index ? ' · pinned' : ''}`;
  }

  private indexAt(point: [number, number]): number | null {
    if (this.spec.pick) return this.spec.pick(this.chart, point);
    const value = this.chart.convertFromPixel({ gridIndex: 0 }, point) as number[] | undefined;
    return Math.max(0, Math.min(this.spec.rows - 1, Math.round(value ? value[0] : 0)));
  }

  setFocus(index: number | null, { quiet = false, announce = false } = {}): void {
    if (index === this.state.focus) return;
    this.state.focus = index;
    this.paint();
    if (announce) this.say();
    if (!quiet && this.group) for (const peer of GROUPS.get(this.group) ?? []) if (peer !== this) peer.setFocus(index, { quiet: true });
  }

  setSelection(index: number | null, { quiet = false } = {}): void {
    this.state.sel = index;
    this.paint();
    this.say();
    if (!quiet) {
      this.spec.onSelect?.(index);
      if (this.group) for (const peer of GROUPS.get(this.group) ?? []) if (peer !== this) peer.setSelection(index, { quiet: true });
    }
  }

  private drillTo(index: number): void {
    const target = this.spec.drill?.(index);
    if (target) location.href = target.href;
  }

  private wire(): void {
    const zr = this.chart.getZr();
    // A layout shift under a resting pointer makes the browser synthesise a mousemove at the same place; that is not pointer intent and must not take focus from the keyboard.
    zr.on('mousemove', (event: any) => { const point: [number, number] = [event.offsetX, event.offsetY]; if (this.pointerAt && this.pointerAt[0] === point[0] && this.pointerAt[1] === point[1]) return; this.pointerAt = point; if (!this.chart.containPixel('grid', point)) { if (!this.keyed) this.setFocus(null); return; } this.keyed = false; this.setFocus(this.indexAt(point)); });
    zr.on('globalout', () => { if (!this.keyed) this.setFocus(null); });
    zr.on('click', (event: any) => {
      const point: [number, number] = [event.offsetX, event.offsetY];
      if (!this.chart.containPixel('grid', point)) return;
      const index = this.indexAt(point);
      if (index === null) return;
      if (this.state.sel === index) { if (this.spec.keepSel) return; this.setSelection(null); return; }
      this.setSelection(index);
    });
    this.plot.addEventListener('keydown', event => {
      if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(event.key)) this.keyed = true;
      const last = this.spec.rows - 1;
      const current = this.state.focus ?? this.state.sel ?? last;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') { event.preventDefault(); this.setFocus(Math.min(last, (this.state.focus === null ? current - 1 : current) + 1), { announce: true }); }
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') { event.preventDefault(); this.setFocus(Math.max(0, (this.state.focus === null ? current + 1 : current) - 1), { announce: true }); }
      else if (event.key === 'Home') { event.preventDefault(); this.setFocus(0, { announce: true }); }
      else if (event.key === 'End') { event.preventDefault(); this.setFocus(last, { announce: true }); }
      else if (event.key === 'Enter' && this.state.focus !== null) { event.preventDefault(); if (this.state.sel === this.state.focus) this.drillTo(this.state.focus); else this.setSelection(this.state.focus); }
      else if (event.key === 'Escape') { event.preventDefault(); this.state.focus = null; if (!this.spec.keepSel) this.setSelection(null); else this.paint(); }
    });
    this.plot.addEventListener('focus', () => { if (performance.now() - this.restoredAt < 200) return; if (this.state.focus === null && this.spec.rows > 0) { this.keyed = true; this.setFocus(this.state.sel ?? this.spec.rows - 1, { announce: true }); } });
    this.plot.addEventListener('blur', () => { this.keyed = false; this.setFocus(null); });
    this.host.addEventListener('click', event => {
      const target = event.target as HTMLElement;
      if (target.closest('.fr-clear')) { this.setSelection(null); return; }
      const view = target.closest<HTMLButtonElement>('[data-view]');
      if (view) this.setView(view.dataset.view as 'chart' | 'table');
    });
  }

  /** After the page swap replaced the frame's header: show the current view on the fresh switch. */
  pressChrome(): void { this.setView(this.state.view); }

  /** The keyboard's place in this frame, for carrying it across a page swap: the focused and pinned rows and the focused row's name. */
  keyboardState(): { focus: number | null; sel: number | null; when: string } {
    const index = this.state.focus ?? this.state.sel;
    return { focus: this.state.focus, sel: this.state.sel, when: index === null ? '' : readoutOf(this.model, index).when };
  }

  /**
   * Put the keyboard back where it was after a swap carried this frame across: the same row keeps focus and its pin
   * when the next model still names it there; a model whose rows moved leaves the keyboard at the frame's start.
   */
  restoreKeyboard({ focus, sel, when }: { focus: number | null; sel: number | null; when: string }): void {
    this.restoredAt = performance.now();
    const index = focus ?? sel;
    if (index === null || index >= this.spec.rows || readoutOf(this.model, index).when !== when) return;
    this.keyed = true;
    if (sel !== null && this.state.sel === null) this.state.sel = sel;
    if (focus !== null) this.setFocus(focus, { quiet: true }); else this.paint();
  }

  /** Register the page's reaction to a selection made through this chart (the History bucket pick). */
  onSelect(handler: (index: number | null) => void): void { this.spec.onSelect = handler; }

  setView(view: 'chart' | 'table'): void {
    this.state.view = view;
    for (const button of this.host.querySelectorAll<HTMLButtonElement>('[data-view]')) button.setAttribute('aria-pressed', String(button.dataset.view === view));
    const tableOn = view === 'table';
    this.host.classList.toggle('is-table', tableOn);
    this.table.hidden = !tableOn;
    if (!tableOn) this.chart.resize();
  }

  /** The period morph: the same instance receives the next model; marks move, totals count. */
  update(model: any, { meta, teach, table, sel }: { meta?: string; teach?: string; table?: string; sel?: number | null } = {}): void {
    const before = [...this.readout.querySelectorAll('.fr-vals dd')].map(element => element.textContent ?? '');
    this.model = model;
    const onSelect = this.spec.onSelect;
    this.spec = this.recipe(model, this.tokens, { host: this.host });
    if (this.host.dataset.keepSel === 'true') this.spec.keepSel = true;
    if (onSelect) this.spec.onSelect = onSelect;
    this.state.focus = null;
    this.state.sel = sel === undefined ? null : sel;
    if (meta !== undefined) { const element = this.host.querySelector('[data-meta]'); if (element) element.textContent = meta; }
    if (teach !== undefined) { const element = this.host.querySelector('[data-teach]'); if (element) element.textContent = teach; }
    if (table !== undefined) this.table.innerHTML = table;
    this.morphing = !reducedMotion();
    this.chart.setOption(this.option(), { replaceMerge: ['series', 'graphic'] });
    this.morphing = false;
    this.paintReadout();
    if (!reducedMotion()) tweenValues(this.readout, before);
  }

  dispose(): void {
    this.observer.disconnect();
    this.chart.dispose();
    if (this.group) GROUPS.get(this.group)?.delete(this);
  }
}

/** Count changed plain numbers from their old value (period morph only; hover updates stay instant). */
function tweenValues(readout: HTMLElement, before: string[]): void {
  readout.querySelectorAll<HTMLElement>('.fr-vals dd').forEach((element, index) => {
    const parse = (text: string) => { const match = /^([≥+−-]?\s?)([\d,]+)(\D*)$/u.exec(text.trim()); return match ? { pre: match[1], value: Number(match[2].replace(/,/gu, '')), post: match[3] } : null; };
    const from = parse(before[index] ?? ''), to = parse(element.textContent ?? '');
    if (!from || !to || from.value === to.value || from.post !== to.post) return;
    const started = performance.now(), duration = 620;
    const format = (value: number) => `${to.pre}${Math.round(value).toLocaleString('en-GB')}${to.post}`;
    const step = (now: number) => { const progress = Math.min(1, (now - started) / duration), eased = 1 - (1 - progress) ** 3; element.textContent = format(from.value + (to.value - from.value) * eased); if (progress < 1 && element.isConnected) requestAnimationFrame(step); else element.textContent = format(to.value); };
    requestAnimationFrame(step);
  });
}

export function framesInGroup(group: string): Frame[] { return [...(GROUPS.get(group) ?? [])]; }
