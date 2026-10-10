// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Popover content (Extension Grammar v1 §6, §7, §8): a GitHub shell around a
 * diffdevil report. One dominant value, decomposition beside it, raw beneath,
 * then policy and plan. Machine notation is mono; nothing here is magenta but
 * the hero's left edge.
 */
import { measurementText as value, evidenceText } from '@wolfsblvt/diffdevil/browser/text';
import type { HumanReportView, Rail } from '@wolfsblvt/diffdevil/browser';
import { measuredAutomatically, retryable, type CoverageSummary, type DeclineReason, type FileStanding, type UnresolvedReason } from '../shared/coverage.js';
import { node, button } from '../shared/dom.js';
import { productIcon } from '../shared/icons.js';
import type { Popover } from './popover.js';
import { observedLabels } from './labels.js';
/** Whether the facts on screen came from this browser's cache, and whether GitHub has since confirmed them. */
export type Provenance = 'live' | 'cached' | 'unconfirmed';
export const provenanceText = (state: Provenance, compact: boolean): string => state === 'live' ? 'local' : state === 'cached' ? (compact ? 'local · cached' : 'local · from cache · confirming') : (compact ? 'local · cached · not confirmed' : 'local · from cache · not confirmed');
export const provenanceTitle = (state: Provenance): string => state === 'live' ? 'Computed in this browser from the pull-request comparison. No App report is implied.'
  : state === 'cached' ? 'Shown at once from this browser’s local cache while GitHub confirms the comparison is unchanged. A moved head is never kept as current.'
  : 'GitHub could not be reached to confirm this comparison. These facts are exact for the base and head named here and were read earlier on this device.';
/** A continuation in progress; `failed` counts files the provider did not supply. */
export interface Progress { readonly done: number; readonly total: number; readonly failed: number }
/** What one explicit act did for the files it asked about. `changed` is whether the report gained any evidence at all. */
export interface Attempt { readonly asked: number; readonly measured: number; readonly declined: number; readonly unresolved: Partial<Record<UnresolvedReason, number>>; readonly changed: boolean }
export interface CoverageControl {
  readonly summary: () => CoverageSummary | undefined;
  readonly progress: () => Progress | undefined;
  /** Why the last pass stopped, when it did. */
  readonly note: () => string | undefined;
  /** What the last completed pass did. */
  readonly outcome: () => Attempt | undefined;
  /** Bounded files a pass can still ask GitHub for; GitHub's settled answer for this head is not asked for again. */
  readonly remaining: () => number;
  /** The one explicit continuation: measure every file still bounded. */
  readonly start: () => void;
  readonly cancel: () => void;
}
export interface ReportActions {
  readonly provenance: () => Provenance;
  readonly coverage: CoverageControl;
  /** Where one file stands, and why the provider declined it. */
  readonly fileStanding: (path: string) => { readonly standing: FileStanding; readonly reason?: DeclineReason; readonly unresolved?: UnresolvedReason; /** The reader asked again and nothing changed. */ readonly askedAgain?: boolean } | undefined;
  readonly measureFile: (path: string) => void;
  readonly pause: () => void;
  readonly dataUrl: string;
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
/** A control's identity across rebuilds of the open report: the rebuilt report gives focus back to the control with the same key. */
const keyed = <T extends HTMLElement>(control: T, key: string): T => { control.dataset.key = key; return control; };
const glyph = (): HTMLElement => productIcon('monochrome', true, chrome.runtime.getURL)!;
function header(title: string, meta: string | undefined, popover: Popover, mono = false): { header: HTMLElement; heading: HTMLElement } {
  const wrap = node('header', 'ddx-head'); const titles = node('div', 'ddx-titles');
  const heading = node('h2', `ddx-title${mono ? ' ddx-title-mono' : ''}`); heading.id = 'diffdevil-report-heading'; heading.append(glyph(), title); titles.append(heading);
  if (meta) titles.append(node('p', 'ddx-meta', meta));
  const close = keyed(button('×', () => popover.close(), 'ddx-close'), 'close'); close.setAttribute('aria-label', 'Close report');
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
    const find = keyed(button('Find in labels ↗', () => actions.findLabel!(label, rail.members ?? [], status), 'ddx-secondary'), 'find-label');
    find.title = `Opens GitHub’s Labels picker and pre-fills it with ${label}. Nothing is applied by diffdevil.`;
    select.push(find);
  }
  block.append(...keyValue('select', ...select), ...keyValue('⟲ readback', observed ? `observed · ${label} on #${pr ?? '?'}` : 'not observed'), status);
  return block;
}
const REASON_TEXT: Readonly<Record<DeclineReason, string>> = { binary: 'binary', submodule: 'submodule', 'too-big': 'too big', truncated: 'truncated', omitted: 'no patch supplied' };
/** Short forms for counts: `1 collapsed by GitHub`. */
const UNRESOLVED_SHORT: Readonly<Record<UnresolvedReason, string>> = { collapsed: 'collapsed by GitHub (generated)', 'no-lines': 'sent without lines', 'not-returned': 'not returned', unreadable: 'in an unread format', disagrees: 'not matching GitHub’s counts', unreachable: 'unreachable' };
/** One file's sentence: what GitHub did and what follows. */
const UNRESOLVED_TEXT: Readonly<Record<UnresolvedReason, string>> = {
  collapsed: 'GitHub marks this file generated and collapses it: it reports the counts but sends none of its lines unless you choose Load diff on the page. diffdevil cannot read a collapsed file yet, so its numbers stay a range.',
  'no-lines': 'GitHub returned this file with its counts but none of its lines and no reason. Its numbers stay a range.',
  'not-returned': 'GitHub did not return this file when it was asked for. Its numbers stay a range until it is asked for again.',
  unreadable: 'GitHub sent this file’s lines in a form diffdevil does not read. Its numbers stay a range.',
  disagrees: 'The lines GitHub sent for this file do not match GitHub’s own counts, so they were not used. Its numbers stay a range.',
  unreachable: 'GitHub could not be reached for this file. Its numbers stay a range until it is asked for again.',
};
const plural = (count: number, one: string, many = `${one}s`): string => `${count} ${count === 1 ? one : many}`;
const reasonList = (reasons: Partial<Record<UnresolvedReason, number>>): string => Object.entries(reasons).map(([reason, count]) => `${count} ${UNRESOLVED_SHORT[reason as UnresolvedReason]}`).join(', ');
/** The finished pass in one sentence: never a bare redraw that looks like progress. */
export function attemptText(attempt: Attempt): string {
  const still = Object.values(attempt.unresolved).reduce((sum, count) => sum + (count ?? 0), 0); const asked = `Asked GitHub for ${plural(attempt.asked, 'file')}`;
  if (!attempt.measured && !attempt.declined) return `${asked}; none could be measured${still ? `: ${reasonList(attempt.unresolved)}` : ''}.`;
  const parts = [`${attempt.measured} measured`, ...(attempt.declined ? [`${attempt.declined} declined by GitHub`] : []), ...(still ? [`${still} still bounded: ${reasonList(attempt.unresolved)}`] : [])];
  return `${asked}: ${parts.join(' · ')}.`;
}
/** measured / bounded / provider-declined / total, the automatic limit, and how many files were measured automatically or on request. */
function coverageBlock(actions: ReportActions): HTMLElement | undefined {
  const summary = actions.coverage.summary(); if (!summary) return undefined;
  const block = node('div', 'ddx-block ddx-grid ddx-coverage'); block.append(eyebrow('coverage', summary.bounded > 0 ? 'bounded until the rest is measured' : summary.declined > 0 ? 'every file GitHub supplied is measured' : 'every file measured'));
  const declined = Object.entries(summary.declinedReasons).map(([reason, count]) => `${count} ${REASON_TEXT[reason as DeclineReason]}`).join(', ');
  const counts = node('span', 'ddx-coverage-counts');
  for (const [label, count, key] of [['measured', summary.measured, 'measured'], ['bounded', summary.bounded, 'bounded'], ['provider-declined', summary.declined, 'declined'], ['total', summary.total, 'total']] as const) {
    const item = node('span', 'ddx-coverage-item'); item.dataset.part = key; item.append(`${label} `, node('b', '', `${summary.totalExact || key !== 'total' ? '' : '≥ '}${count}`)); counts.append(item);
  }
  if (declined) counts.title = `Provider declined: ${declined}.`;
  const limit = node('span', 'ddx-quiet', `automatic limit ${summary.limit} · ${measuredAutomatically(summary)} measured automatically${summary.explicit ? ` · ${summary.explicit} on request` : ''}`);
  block.append(...keyValue('files', counts), ...keyValue('limit', limit));
  if (summary.unresolved > 0) block.append(...keyValue('not supplied', node('span', 'ddx-quiet', reasonList(summary.unresolvedReasons))));
  const progress = actions.coverage.progress();
  if (progress) {
    const line = node('span', 'ddx-coverage-progress', `Analyzing remaining files · ${progress.done} of ${progress.total}${progress.failed ? ` · ${progress.failed} not supplied` : ''}`); line.setAttribute('role', 'status');
    // Start and Cancel are one control slot, so focus moves from one to the other as the pass begins and ends.
    const cancel = keyed(button('Cancel', () => actions.coverage.cancel(), 'ddx-link'), 'continuation');
    block.append(...keyValue('', line, cancel));
  } else {
    const stopped = actions.coverage.note(); const finished = actions.coverage.outcome(); const remaining = actions.coverage.remaining();
    if (stopped && summary.bounded > 0) block.append(...keyValue('', node('span', 'ddx-quiet', `The last pass stopped: ${stopped} What was measured is kept; run it again to continue.`)));
    else if (finished) { const line = node('span', 'ddx-quiet ddx-coverage-outcome', attemptText(finished)); line.setAttribute('role', 'status'); block.append(...keyValue('', line)); }
    if (remaining > 0) {
      const more = keyed(button('Analyze remaining files', () => actions.coverage.start(), 'ddx-secondary'), 'continuation');
      more.title = `Reads ${plural(remaining, 'more file')} from GitHub, one explicit pass for this comparison, and keeps the result in this browser. Nothing is estimated from the files already measured.`;
      block.append(...keyValue('', more));
    }
  }
  return block;
}
function copyAction(actions: ReportActions, path?: string): HTMLButtonElement {
  const copy = keyed(button('Copy facts', () => {
    void actions.copyText(path).then(text => navigator.clipboard.writeText(text)).then(() => { copy.textContent = 'Copied ✓'; setTimeout(() => { copy.textContent = 'Copy facts'; }, 1600); }, () => { copy.textContent = 'Clipboard unavailable'; });
  }, 'ddx-link'), 'copy-facts');
  copy.title = `Copies the canonical diffdevil human report for this ${path === undefined ? 'comparison' : 'file'} — the same text the CLI prints.`;
  return copy;
}
function externalLink(text: string, href: string): HTMLAnchorElement { const link = node('a', 'ddx-link', text); link.href = href; link.target = '_blank'; link.rel = 'noopener noreferrer'; return link; }
function footer(view: HumanReportView, actions: ReportActions, file: boolean): HTMLElement {
  const wrap = node('footer', 'ddx-footer'); const left = node('span', 'ddx-footer-group'); const right = node('span', 'ddx-footer-group');
  const details = actions.detailsUrl?.(view); const detailsLink = details ? keyed(externalLink('Details ↗', details), 'details') : undefined;
  if (file) { left.append(copyAction(actions, view.focus?.path)); if (detailsLink) left.append(detailsLink); wrap.append(left); return wrap; }
  if (detailsLink) left.append(detailsLink); left.append(copyAction(actions));
  const pause = keyed(button('Pause this repository', actions.pause, 'ddx-link'), 'pause'); pause.title = 'Stops diffdevil on every pull request of this repository in this browser and brings GitHub’s own counters back. Nothing is deleted and nothing changes on GitHub; Resume is on the page and in Settings.';
  right.append(pause, keyed(externalLink('Local data', actions.dataUrl), 'local-data'), keyed(externalLink('Settings', actions.settingsUrl), 'settings')); wrap.append(left, right); return wrap;
}
function shell(popover: Popover, parts: (HTMLElement | undefined)[], heading: HTMLElement): HTMLElement {
  const panel = node('div'); panel.setAttribute('aria-labelledby', heading.id);
  panel.append(...parts.filter((part): part is HTMLElement => part !== undefined)); void popover; return panel;
}
export function aggregatePanel(view: HumanReportView, popover: Popover, actions: ReportActions): HTMLElement {
  const source = view.report.source;
  const meta = `${source.repository ?? source.kind}${source.pullRequest ? ` #${source.pullRequest}` : ''} · ${short(source.base)} → ${short(source.head)} · ${source.comparison ?? 'supplied'} · ${provenanceText(actions.provenance(), false)}`;
  const head = header('diffdevil analysis', meta, popover);
  return shell(popover, [head.header, machineBlock(view, { accent: true, large: true, second: 'lines.changed' }), rawBlock(view, true), filesStrip(view), coverageBlock(actions), policyBlock(view), planBlock(view, actions), footer(view, actions, false)], head.heading);
}
export function concisePanel(view: HumanReportView, popover: Popover, actions: ReportActions): HTMLElement {
  const source = view.report.source;
  const head = header('diffdevil analysis', `${value(view.report.totals.files.total ?? view.report.fileSet.total)} files · ${short(source.base)} → ${short(source.head)} · ${provenanceText(actions.provenance(), true)}`, popover);
  return shell(popover, [head.header, machineBlock(view, { accent: true, large: false, second: 'lines.changed' }), rawBlock(view, true), filesStrip(view), footer(view, actions, false)], head.heading);
}
export function filePanel(view: HumanReportView, popover: Popover, actions: ReportActions): HTMLElement {
  const focus = view.focus; const path = focus?.path ?? ''; const name = path.split('/').pop() ?? path; const status = focus?.changeType ?? 'modified';
  const head = header(name, undefined, popover, true); head.heading.title = path;
  const lane = node('div', 'ddx-strip');
  lane.textContent = `${focus?.included === false ? '— excluded' : '▣ included'} · ${status}${focus?.included === false && focus.inclusionReasons?.length ? ` · ${focus.inclusionReasons.map(reason => reason.subject ?? reason.code).join(' · ')}` : ''}${view.evidence.status !== 'exact' && view.evidence.reasons.length ? ` · ${view.evidence.reasons.map(reason => `${reason.message ?? 'evidence bounded'} (${reason.code})`).join(' · ')}` : ''}`;
  return shell(popover, [head.header, machineBlock(view, { accent: false, large: false, second: status }), rawBlock(view, false), lane, fileCoverage(view, actions), footer(view, actions, true)], head.heading);
}
/** Why a file's numbers are a range, and the one act that can make them exact. */
function fileCoverage(view: HumanReportView, actions: ReportActions): HTMLElement | undefined {
  const path = view.focus?.path; const state = path === undefined ? undefined : actions.fileStanding(path); if (!path || !state || state.standing === 'measured') return undefined;
  const block = node('div', 'ddx-strip ddx-file-coverage');
  if (state.standing === 'declined') { block.textContent = `GitHub declined to supply this file’s lines (${REASON_TEXT[state.reason ?? 'omitted']}). Its numbers stay bounded.`; return block; }
  if (state.unresolved) {
    const line = node('span', '', `${state.askedAgain ? 'Asked again just now. ' : ''}${UNRESOLVED_TEXT[state.unresolved]} `); if (state.askedAgain) line.setAttribute('role', 'status');
    block.append(line);
    // GitHub's own answer for this head does not change; offering the same request again would only redraw.
    if (retryable(state.unresolved)) block.append(keyed(button('Ask GitHub again', () => actions.measureFile(path), 'ddx-secondary'), 'measure-file'));
    return block;
  }
  const summary = actions.coverage.summary();
  const limited = summary !== undefined && measuredAutomatically(summary) >= summary.limit;
  block.append(node('span', '', `Not measured yet${limited ? `: the automatic limit of ${summary.limit} files left it bounded.` : '.'} `));
  const measure = keyed(button('Measure this file', () => actions.measureFile(path), 'ddx-secondary'), 'measure-file'); block.append(measure); return block;
}
/** Failed claim · reason · consequence · next action. Text-colour border, no red wash. */
export function errorPanel(error: { code: string; message: string }, meta: string | undefined, popover: Popover, actions: ReportActions): HTMLElement {
  const head = header('diffdevil analysis', meta, popover);
  const block = node('div', 'ddx-error');
  block.append(node('p', 'ddx-error-claim', '× Could not read this comparison.'), node('p', '', `${error.message} (${error.code})`), node('p', 'ddx-quiet', 'GitHub’s counts are unchanged. Nothing was measured.'));
  const row = node('div', 'ddx-actions');
  const copy = keyed(button('Copy diagnostics', () => { void navigator.clipboard.writeText(actions.diagnostics(error)).then(() => { copy.textContent = 'Copied ✓'; setTimeout(() => { copy.textContent = 'Copy diagnostics'; }, 1600); }, () => { copy.textContent = 'Clipboard unavailable'; }); }, 'ddx-link'), 'copy-diagnostics');
  row.append(keyed(button('Retry', () => { popover.close(false); actions.retry(); }, 'ddx-link'), 'retry'), copy, keyed(externalLink('Settings', actions.settingsUrl), 'settings'));
  return shell(popover, [head.header, block, row], head.heading);
}
