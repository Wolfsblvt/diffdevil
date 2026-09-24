// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Seats: the in-place replacements of a GitHub diffstat (Extension Grammar v1
 * §4, §7, §8). Inline surfaces use only host tokens; the popover speaks diffdevil.
 */
import { measurementText as value, evidenceText } from '@wolfsblvt/diffdevil/browser/text';
import type { HumanReportView, Rail, RailCell } from '@wolfsblvt/diffdevil/browser';
import type { Settings } from '../shared/catalogue.js';
import { node, button, isDark } from '../shared/dom.js';
import { productIcon } from '../shared/icons.js';
import { observedLabels } from './labels.js';
import type { Popover } from './popover.js';
import { aggregatePanel, concisePanel, filePanel, type ReportActions } from './report.js';
export type SeatKind = 'aggregate' | 'toolbar' | 'file';
export interface SeatContext { readonly settings: Settings; readonly popover: Popover; readonly document: Document; readonly actions: ReportActions }
export interface Projection { root: HTMLElement; trigger: HTMLButtonElement; stale: (head?: string) => void; cleanup: () => void }
export const sizeRail = (view: HumanReportView): Rail | undefined => view.rails.find(rail => rail.id === 'size') ?? view.rails[0];
export const short = (sha: string | undefined): string => sha?.slice(0, 7) ?? '?';
export function rangeText(cell: RailCell, subject?: string): string {
  const lower = cell.lower ?? 0; const middle = subject ?? 'n';
  return cell.upper === undefined ? `${lower} ≤ ${middle}` : `${lower} ≤ ${middle} < ${cell.upper}`;
}
function measured(view: HumanReportView): { lower?: number; upper?: number } {
  const changed = view.changed;
  if (changed.status === 'exact') return { lower: changed.value, upper: changed.value };
  if (changed.status === 'bounded') return { lower: changed.lower, upper: changed.upper };
  if (changed.status === 'unknown') return { ...(changed.lower === undefined ? {} : { lower: changed.lower }), ...(changed.upper === undefined ? {} : { upper: changed.upper }) };
  return {};
}
/** Segments a bounded or unknown value could still land in, so the rail can show them dotted. */
function candidate(cell: RailCell, span: { lower?: number; upper?: number }): boolean {
  if (span.lower === undefined && span.upper === undefined) return false;
  const below = span.upper !== undefined && cell.lower !== undefined && span.upper < cell.lower;
  const above = span.lower !== undefined && cell.upper !== undefined && span.lower >= cell.upper;
  return !below && !above;
}
const reasonText = (view: HumanReportView): string => view.evidence.reasons.map(reason => reason.message ?? reason.code).join(' · ');
export function evidenceChip(view: HumanReportView, compact = false): HTMLElement {
  const status = view.evidence.status;
  const chip = node('span', 'ddx-evidence', compact ? evidenceText(status).slice(0, 1) : evidenceText(status));
  chip.dataset.status = status;
  chip.title = `${evidenceText(status)}. ${reasonText(view) || (status === 'exact' ? 'Every included edit block was observed.' : 'The range is what the available evidence proves.')}`;
  return chip;
}
export function decomposition(view: HumanReportView): HTMLElement {
  const parts = node('span', 'ddx-parts');
  parts.append(node('span', 'ddx-add', `+${value(view.added)}`), node('span', 'ddx-del', `−${value(view.deleted)}`), node('span', 'ddx-mod', `~${value(view.modified)}`));
  parts.title = 'Added only · deleted only · modified. A replaced line counts once.';
  return parts;
}
/** 56 × 9 px, N equal segments from the active policy; omitted above nine bands. */
export function bandRail(view: HumanReportView, rail: Rail): HTMLElement | undefined {
  if (rail.cells.length > 9) return undefined;
  const track = node('span', 'ddx-rail'); track.setAttribute('role', 'img');
  const selected = rail.cells.find(cell => cell.selected); const span = measured(view); const changed = value(view.changed);
  track.setAttribute('aria-label', `${rail.id} band rail, ${rail.cells.length} bands, ${selected ? `${selected.name} selected` : 'no band selected'}`);
  for (const cell of rail.cells) {
    const segment = node('span', `ddx-cell${cell.selected ? ' ddx-selected' : !selected && candidate(cell, span) ? ' ddx-candidate' : ''}`);
    segment.title = `${cell.name} · ${rangeText(cell)}${cell.selected ? ` · ${changed} lands here` : ''}`;
    if (cell.color && /^[\da-f]{6}$/iu.test(cell.color)) segment.style.setProperty('--ddx-band', `#${cell.color}`);
    track.append(segment);
  }
  return track;
}
export function sizeChip(view: HumanReportView, rail: Rail, document: Document): HTMLElement {
  const chip = node('span', 'ddx-chip');
  if (view.errors.length) {
    chip.dataset.standing = 'policy'; chip.textContent = '! policy unavailable';
    chip.title = `${view.errors.map(error => `${error.code}: ${error.message}`).join(' ')} Measurement is unaffected; no size label is proposed.`;
    return chip;
  }
  const selected = rail.cells.find(cell => cell.selected);
  if (!selected) {
    chip.dataset.standing = 'unknown'; chip.textContent = `${rail.id} ?`;
    const span = measured(view); const candidates = rail.cells.filter(cell => candidate(cell, span)).map(cell => cell.name);
    chip.title = `${candidates.length > 1 ? `Measurement straddles ${candidates.join(' and ')}.` : 'No single band is established by the evidence.'} No label proposed.`;
    return chip;
  }
  const label = rail.label ?? selected.label; const observed = label !== undefined && observedLabels(document).includes(label);
  chip.dataset.standing = observed ? 'observed' : 'proposed';
  if (selected.color && /^[\da-f]{6}$/iu.test(selected.color)) { const swatch = node('span', 'ddx-swatch'); swatch.style.setProperty('--ddx-band', `#${selected.color}`); chip.append(swatch); }
  chip.append(label ?? `${rail.id}/${selected.name}`);
  chip.title = observed ? `${label} is present on this pull request. diffdevil applied nothing; this is your local policy result.` : 'Local policy result. No GitHub label has been applied.';
  return chip;
}
function excludedReason(view: HumanReportView): string {
  const reasons = view.focus?.inclusionReasons ?? [];
  return reasons.map(reason => reason.subject ? `${reason.code} · ${reason.subject}` : reason.message ?? reason.code).join(' · ') || 'policy path rule';
}
/** One seat. The button carries icon, word, value, decomposition and chip; rail and provenance sit outside it. */
export function projection(view: HumanReportView, kind: SeatKind, context: SeatContext): Projection {
  const { settings, popover, document, actions } = context;
  const root = node('span', 'ddx-root'); root.dataset.ddx = kind; root.setAttribute('data-diffdevil', '');
  const trigger = node('button', 'ddx-trigger'); trigger.type = 'button'; trigger.setAttribute('aria-expanded', 'false'); trigger.setAttribute('aria-haspopup', 'dialog');
  const excluded = view.focus?.included === false; const exact = view.evidence.status === 'exact';
  const mark = productIcon(String(settings['display.brandIcon']), isDark(document), chrome.runtime.getURL);
  if (mark) { if (kind !== 'aggregate') mark.classList.add('ddx-brand-quiet'); trigger.append(mark); }
  if (excluded) {
    trigger.append(node('span', 'ddx-excluded', '— excluded'));
    trigger.title = `Excluded by policy · ${excludedReason(view)} · not counted in Changed. Open the file report.`;
  } else {
    if (kind !== 'file') trigger.append(node('span', 'ddx-word', 'Changed'));
    // Bounded reads "≈ 340–360"; unknown and unmeasurable keep the presenter's own glyphs.
    trigger.append(node('strong', 'ddx-value', view.changed.status === 'bounded' ? `≈ ${value(view.changed)}` : value(view.changed)));
    if (exact) trigger.append(decomposition(view)); else trigger.append(evidenceChip(view, kind === 'file'));
    trigger.title = `Open the ${kind === 'file' ? 'file' : 'pull-request'} report. ${evidenceText(view.evidence.status)}. Replacements count once.`;
  }
  const rail = kind === 'aggregate' && !excluded ? sizeRail(view) : undefined;
  if (rail || kind === 'aggregate' && view.errors.length && !excluded) trigger.append(sizeChip(view, rail ?? { id: 'size', expression: '', cells: [] }, document));
  const width = kind === 'aggregate' ? 420 : 360; const align = kind === 'toolbar' ? 'start' : 'end';
  const panel = (): HTMLElement => kind === 'aggregate' ? aggregatePanel(view, popover, actions) : kind === 'toolbar' ? concisePanel(view, popover, actions) : filePanel(view, popover, actions);
  trigger.addEventListener('click', event => { event.stopPropagation(); popover.toggle(trigger, panel(), { width, align }); });
  root.append(trigger);
  if (rail && !view.errors.length) { const track = bandRail(view, rail); if (track) root.append(track); }
  if (kind === 'aggregate') {
    const provenance = node('span', 'ddx-provenance', 'local');
    provenance.title = 'Computed in this browser from the pull-request comparison. No App report is implied.';
    root.append(provenance);
  }
  let rereading: HTMLElement | undefined;
  const stale = (head?: string): void => {
    root.classList.toggle('ddx-stale', head !== undefined); rereading?.remove(); rereading = undefined;
    if (head === undefined) return;
    rereading = node('span', 'ddx-rereading', '⟳ re-reading '); const code = node('code', '', short(head)); rereading.append(code);
    rereading.title = 'The head advanced. The previous result stays visible until the new comparison is read.';
    trigger.insertAdjacentElement('afterend', rereading);
  };
  return { root, trigger, stale, cleanup: () => { root.remove(); } };
}
/** The failure marker takes the seat's leading position; GitHub's counts stay at full colour after it. */
export function failureMarker(error: { code: string; message: string }, popover: Popover, actions: ReportActions, retry: () => void): Projection {
  const root = node('span', 'ddx-root'); root.dataset.ddx = 'failure'; root.setAttribute('data-diffdevil', '');
  const trigger = button('× diffdevil', () => popover.toggle(trigger, actions.errorPanel(error, popover), { width: 420, align: 'end' }), 'ddx-marker');
  trigger.setAttribute('aria-haspopup', 'dialog'); trigger.setAttribute('aria-expanded', 'false');
  trigger.title = `diffdevil could not read this comparison. ${error.message} GitHub’s counts are unchanged.`;
  const again = button('Retry', retry, 'ddx-retry');
  root.append(trigger, node('span', 'ddx-dot', '·'), again);
  return { root, trigger, stale: () => undefined, cleanup: () => { root.remove(); } };
}
export { aggregatePanel as reportPanel } from './report.js';
