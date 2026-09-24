// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Popover content (Extension Grammar v1 §6, §7, §8): a GitHub shell around a
 * diffdevil report. One dominant value, decomposition beside it, raw beneath,
 * then policy and plan. Machine notation is mono; nothing here is magenta but
 * the hero's left edge.
 */
import { measurementText as value, evidenceText } from '@wolfsblvt/diffdevil/browser/text';
import type { HumanReportView, Rail } from '@wolfsblvt/diffdevil/browser';
import { node, button } from '../shared/dom.js';
import { productIcon } from '../shared/icons.js';
import type { Popover } from './popover.js';
import { observedLabels } from './labels.js';
export interface ReportActions {
  /** The canonical human report for the scope: the text the CLI prints. */
  readonly copyText: (path?: string) => Promise<string>;
  readonly retry: () => void;
  readonly settingsUrl: string;
  readonly detailsUrl?: (view: HumanReportView) => string | undefined;
  /** Opens GitHub's own picker pre-filled with the label, or undefined when no route exists on this page. */
  readonly findLabel?: (label: string, members: readonly string[], status: HTMLElement) => void;
  readonly diagnostics: (error: { code: string; message: string }) => string;
  readonly errorPanel: (error: { code: string; message: string }, popover: Popover) => HTMLElement;
}
const short = (sha: string | undefined): string => sha?.slice(0, 7) ?? '?';
const glyph = (): HTMLElement => productIcon('monochrome', true, chrome.runtime.getURL)!;
function header(title: string, meta: string | undefined, popover: Popover, mono = false): { header: HTMLElement; heading: HTMLElement } {
  const wrap = node('header', 'ddx-head'); const titles = node('div', 'ddx-titles');
  const heading = node('h2', `ddx-title${mono ? ' ddx-title-mono' : ''}`); heading.id = 'diffdevil-report-heading'; heading.append(glyph(), title); titles.append(heading);
  if (meta) titles.append(node('p', 'ddx-meta', meta));
  const close = button('×', () => popover.close(), 'ddx-close'); close.setAttribute('aria-label', 'Close report');
  wrap.append(titles, close); return { header: wrap, heading };
}
function eyebrow(text: string, standing?: string): HTMLElement {
  const label = node('span', 'ddx-eyebrow', text);
  if (standing) label.append(node('span', 'ddx-standing', ` · ${standing}`));
  return label;
}
/** The hero: midnight ground in both themes, value beside "changed", decomposition column. */
function machineBlock(view: HumanReportView, options: { accent: boolean; large: boolean; second: string }): HTMLElement {
  const block = node('div', `ddx-machine${options.accent ? ' ddx-focus' : ''}${options.large ? ' ddx-large' : ''}`);
  const left = node('div', 'ddx-hero'); const line = node('div', 'ddx-hero-line');
  line.append(node('strong', 'ddx-hero-value', value(view.changed)), node('span', 'ddx-hero-unit', 'changed')); left.append(line);
  const chips = node('div', 'ddx-chips'); const evidence = node('span', 'ddx-chip-evidence', evidenceText(view.evidence.status)); evidence.dataset.status = view.evidence.status;
  if (view.evidence.reasons.length) evidence.title = view.evidence.reasons.map(reason => reason.message ?? reason.code).join(' · ');
  chips.append(evidence, node('span', 'ddx-chip-measure', options.second)); left.append(chips);
  const right = node('div', 'ddx-decomposition'); right.append(node('span', 'ddx-eyebrow', 'decomposition'));
  for (const [sign, measure, className] of [['+', view.added, 'ddx-sign-add'], ['−', view.deleted, 'ddx-sign-del'], ['~', view.modified, 'ddx-sign-mod']] as const) {
    const row = node('span', 'ddx-row'); row.append(node('span', className, sign), node('b', '', value(measure))); right.append(row);
  }
  block.append(left, right); return block;
}
function rawBlock(view: HumanReportView, churn: boolean): HTMLElement {
  const block = node('div', 'ddx-block ddx-raw'); block.append(eyebrow('raw'));
  const row = node('div', 'ddx-raw-row');
  const item = (label: string, measure: string): HTMLElement => { const span = node('span', '', `${label} `); span.append(node('b', '', measure)); return span; };
  row.append(item('+ additions', value(view.raw.added)), item('− deletions', value(view.raw.deleted)));
  if (churn) row.append(item('churn', value(view.raw.churn)));
  block.append(row); return block;
}
function filesStrip(view: HumanReportView): HTMLElement {
  const files = view.report.totals.files; const parts = [`${value(files.total ?? view.report.fileSet.total)} files`];
  for (const key of ['included', 'added', 'modified', 'deleted', 'renamed']) { const measure = files[key]; if (measure && !(measure.status === 'exact' && measure.value === 0 && key !== 'included')) parts.push(`${value(measure)} ${key}`); }
  const excluded = files.excluded; if (excluded && !(excluded.status === 'exact' && excluded.value === 0)) parts.push(`${value(excluded)} excluded`);
  return node('div', 'ddx-strip', parts.join(' · '));
}
function composition(view: HumanReportView): string {
  const policy = view.policy; if (!policy) return 'preset default';
  const base = short(view.report.source.base);
  const layers = policy.layers.map(layer => layer === 'repository' ? `repository@${base}` : layer);
  return policy.mode === 'composed' && layers.length > 1 ? `composed · ${layers.join(' < ')}` : layers.join(' < ') || policy.mode;
}
function keyValue(key: string, ...valueNodes: (string | Node)[]): [HTMLElement, HTMLElement] {
  const k = node('span', 'ddx-key', key); const v = node('span', 'ddx-val'); v.append(...valueNodes); return [k, v];
}
function railInline(rail: Rail): HTMLElement {
  const track = node('span', 'ddx-rail'); track.setAttribute('aria-hidden', 'true');
  for (const cell of rail.cells) { const segment = node('span', `ddx-cell${cell.selected ? ' ddx-selected' : ''}`); if (cell.color && /^[\da-f]{6}$/iu.test(cell.color)) segment.style.setProperty('--ddx-band', `#${cell.color}`); segment.title = cell.name; track.append(segment); }
  return track;
}
function policyBlock(view: HumanReportView): HTMLElement | undefined {
  if (!view.policy && !view.errors.length && !view.rails.length) return undefined;
  const block = node('div', 'ddx-block ddx-grid'); block.append(eyebrow('policy', composition(view)));
  if (view.errors.length) {
    const notice = node('div', 'ddx-notice');
    notice.append(node('span', 'ddx-notice-lead', '! policy not applied'), ...view.errors.map(error => node('span', '', ` · ${error.code} · ${error.message}`)), node('span', '', ' · measurement unaffected · use personal policy in Settings'));
    block.append(notice); return block;
  }
  for (const rail of view.rails) {
    const selected = rail.cells.find(cell => cell.selected); const changed = value(view.changed);
    const text = selected ? `${rail.id} → ${selected.name}` : `${rail.id} → ?`;
    const predicate = selected ? `${selected.lower ?? 0} ≤ ${changed}${selected.upper === undefined ? '' : ` < ${selected.upper}`}` : 'no single band established';
    block.append(...keyValue('band', text, ' ', railInline(rail), ' ', node('span', 'ddx-quiet', predicate)));
  }
  const metrics = Object.entries(view.report.metrics ?? {});
  if (metrics.length) block.append(...keyValue('metrics', metrics.map(([name, metric]) => `${name} ${value(metric)}`).join(' · ')));
  return block;
}
function ink(color: string): string { const n = Number.parseInt(color, 16); const luminance = 0.299 * (n >> 16 & 255) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255); return luminance > 150 ? '#1f2328' : '#ffffff'; }
function planBlock(view: HumanReportView, actions: ReportActions): HTMLElement | undefined {
  const rail = view.rails.find(item => item.label); if (!rail?.label || view.errors.length) return undefined;
  const label = rail.label; const selected = rail.cells.find(cell => cell.selected); const pr = view.report.source.pullRequest;
  const observed = observedLabels(document).includes(label);
  const block = node('div', 'ddx-block ddx-grid'); block.append(eyebrow('→ effect plan', observed ? 'observed · nothing applied by diffdevil' : 'desired · nothing applied'));
  const chip = node('span', 'ddx-label', label); if (selected?.color && /^[\da-f]{6}$/iu.test(selected.color)) { chip.style.background = `#${selected.color}`; chip.style.color = ink(selected.color); }
  const status = node('span', 'ddx-label-status'); status.setAttribute('role', 'status');
  const select = [chip];
  if (!observed && actions.findLabel) {
    const find = button('Find in labels ↗', () => actions.findLabel!(label, rail.members ?? [], status), 'ddx-secondary');
    find.title = `Opens GitHub’s Labels picker and pre-fills it with ${label}. Nothing is applied by diffdevil.`;
    select.push(find);
  }
  block.append(...keyValue('select', ...select), ...keyValue('⟲ readback', observed ? `observed · ${label} on #${pr ?? '?'}` : 'not observed'), status);
  return block;
}
function copyAction(actions: ReportActions, path?: string): HTMLButtonElement {
  const copy = button('Copy facts', () => {
    void actions.copyText(path).then(text => navigator.clipboard.writeText(text)).then(() => { copy.textContent = 'Copied ✓'; setTimeout(() => { copy.textContent = 'Copy facts'; }, 1600); }, () => { copy.textContent = 'Clipboard unavailable'; });
  }, 'ddx-link');
  copy.title = `Copies the canonical diffdevil human report for this ${path === undefined ? 'comparison' : 'file'} — the same text the CLI prints.`;
  return copy;
}
function externalLink(text: string, href: string): HTMLAnchorElement { const link = node('a', 'ddx-link', text); link.href = href; link.target = '_blank'; link.rel = 'noopener noreferrer'; return link; }
function footer(view: HumanReportView, actions: ReportActions, file: boolean): HTMLElement {
  const wrap = node('footer', 'ddx-footer'); const left = node('span', 'ddx-footer-group');
  const details = actions.detailsUrl?.(view); const detailsLink = details ? externalLink('Details ↗', details) : undefined;
  if (file) { left.append(copyAction(actions, view.focus?.path)); if (detailsLink) left.append(detailsLink); wrap.append(left); return wrap; }
  if (detailsLink) left.append(detailsLink); left.append(copyAction(actions));
  wrap.append(left, externalLink('Settings', actions.settingsUrl)); return wrap;
}
function shell(popover: Popover, parts: (HTMLElement | undefined)[], heading: HTMLElement): HTMLElement {
  const panel = node('div'); panel.setAttribute('aria-labelledby', heading.id);
  panel.append(...parts.filter((part): part is HTMLElement => part !== undefined)); void popover; return panel;
}
export function aggregatePanel(view: HumanReportView, popover: Popover, actions: ReportActions): HTMLElement {
  const source = view.report.source;
  const meta = `${source.repository ?? source.kind}${source.pullRequest ? ` #${source.pullRequest}` : ''} · ${short(source.base)} → ${short(source.head)} · ${source.comparison ?? 'supplied'} · local`;
  const head = header('diffdevil analysis', meta, popover);
  return shell(popover, [head.header, machineBlock(view, { accent: true, large: true, second: 'lines.changed' }), rawBlock(view, true), filesStrip(view), policyBlock(view), planBlock(view, actions), footer(view, actions, false)], head.heading);
}
export function concisePanel(view: HumanReportView, popover: Popover, actions: ReportActions): HTMLElement {
  const source = view.report.source;
  const head = header('diffdevil analysis', `${value(view.report.totals.files.total ?? view.report.fileSet.total)} files · ${short(source.base)} → ${short(source.head)} · local`, popover);
  return shell(popover, [head.header, machineBlock(view, { accent: true, large: false, second: 'lines.changed' }), rawBlock(view, true), filesStrip(view), footer(view, actions, false)], head.heading);
}
export function filePanel(view: HumanReportView, popover: Popover, actions: ReportActions): HTMLElement {
  const focus = view.focus; const path = focus?.path ?? ''; const name = path.split('/').pop() ?? path; const status = focus?.changeType ?? 'modified';
  const head = header(name, undefined, popover, true); head.heading.title = path;
  const lane = node('div', 'ddx-strip');
  lane.textContent = `${focus?.included === false ? '— excluded' : '▣ included'} · ${status}${focus?.included === false && focus.inclusionReasons?.length ? ` · ${focus.inclusionReasons.map(reason => reason.subject ?? reason.code).join(' · ')}` : ''}${view.evidence.status !== 'exact' && view.evidence.reasons.length ? ` · ${view.evidence.reasons.map(reason => `${reason.message ?? 'evidence bounded'} (${reason.code})`).join(' · ')}` : ''}`;
  return shell(popover, [head.header, machineBlock(view, { accent: false, large: false, second: status }), rawBlock(view, false), lane, footer(view, actions, true)], head.heading);
}
/** Failed claim · reason · consequence · next action. Text-colour border, no red wash. */
export function errorPanel(error: { code: string; message: string }, meta: string | undefined, popover: Popover, actions: ReportActions): HTMLElement {
  const head = header('diffdevil analysis', meta, popover);
  const block = node('div', 'ddx-error');
  block.append(node('p', 'ddx-error-claim', '× Could not read this comparison.'), node('p', '', `${error.message} (${error.code})`), node('p', 'ddx-quiet', 'GitHub’s counts are unchanged. Nothing was measured.'));
  const row = node('div', 'ddx-actions');
  const copy = button('Copy diagnostics', () => { void navigator.clipboard.writeText(actions.diagnostics(error)).then(() => { copy.textContent = 'Copied ✓'; setTimeout(() => { copy.textContent = 'Copy diagnostics'; }, 1600); }, () => { copy.textContent = 'Clipboard unavailable'; }); }, 'ddx-link');
  row.append(button('Retry', () => { popover.close(false); actions.retry(); }, 'ddx-link'), copy, externalLink('Settings', actions.settingsUrl));
  return shell(popover, [head.header, block, row], head.heading);
}
