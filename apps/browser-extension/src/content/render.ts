// SPDX-License-Identifier: AGPL-3.0-only
import { measurementText as value, evidenceText } from '@wolfsblvt/diffdevil/browser/text';
import type { HumanReportView, Rail } from '@wolfsblvt/diffdevil/browser';
import type { Settings } from '../shared/catalogue.js';
import { node, button, isDark } from '../shared/dom.js';
import { productIcon } from '../shared/icons.js';
import { Popover } from './popover.js';
import { labelHandoff, observedLabels, pickerAvailable } from './labels.js';
function facts(title: string, items: readonly (readonly [string, string])[]): HTMLElement {
  const section = node('section', 'ddx-facts'); section.append(node('h3', '', title)); const list = node('dl');
  for (const [name, text] of items) list.append(node('dt', '', name), node('dd', '', text)); section.append(list); return section;
}
function range(cell: Rail['cells'][number]): string { return `${cell.lower === undefined ? 'Unbounded below' : `At least ${cell.lower}`}${cell.upper === undefined ? '; no upper limit' : `; below ${cell.upper}`}${cell.selected ? '; selected' : ''}`; }
export function reportPanel(view: HumanReportView, popover: Popover): HTMLElement {
  const panel = node('div'); const header = node('header', 'ddx-heading'); const close = button('×', () => popover.close(), 'ddx-close'); close.setAttribute('aria-label', 'Close report');
  const heading = node('h2', '', 'diffdevil analysis'); heading.id = 'diffdevil-report-heading'; panel.setAttribute('aria-labelledby', heading.id);
  header.append(heading, close); panel.append(header);
  const source = view.report.source;
  panel.append(node('p', 'ddx-source', `${source.repository ?? source.kind}${source.pullRequest ? ` #${source.pullRequest}` : ''} · ${evidenceText(view.evidence.status)}`),
    node('p', 'ddx-revisions', `${source.base?.slice(0, 12) ?? '?'} → ${source.head?.slice(0, 12) ?? '?'} · ${source.comparison ?? 'supplied'}`));
  if (view.focus) { panel.append(node('h3', 'ddx-file-name', view.focus.path)); if (!view.focus.included) panel.append(node('p', 'ddx-notice', 'Excluded from the aggregate. These are its actual file measurements; no size tier is selected.')); }
  const primary = node('div', 'ddx-report-primary'); primary.append(node('span', '', 'Changed'), node('strong', '', value(view.changed)), node('span', '', 'lines')); panel.append(primary);
  panel.append(node('p', 'ddx-report-parts', `+${value(view.added)} added only · −${value(view.deleted)} deleted only · ~${value(view.modified)} modified`));
  panel.append(facts('Raw', [['Additions', `+${value(view.raw.added)}`], ['Deletions', `−${value(view.raw.deleted)}`], ['Churn', value(view.raw.churn)]]));
  panel.append(facts('Evidence', [['Measurement', evidenceText(view.evidence.status)], ['File set', `${view.report.fileSet.complete ? 'Complete' : 'Incomplete'} · ${value(view.report.fileSet.total)} files`], ['Source', 'Local browser analysis'], ['Semantics', view.report.semantics.replacementLines]]));
  if (view.evidence.reasons.length) panel.append(node('p', 'ddx-notice', view.evidence.reasons.map(reason => reason.code).join(' · ')));
  if (!view.focus) panel.append(facts('Files', Object.entries(view.report.totals.files).map(([name, count]) => [name, value(count)])));
  if (Object.keys(view.report.metrics ?? {}).length) panel.append(facts('Metrics', Object.entries(view.report.metrics ?? {}).map(([name, metric]) => [name, `${value(metric)} · ${evidenceText(metric.status)}`])));
  for (const rail of view.rails) {
    panel.append(facts(`Band: ${rail.id}`, [['Expression', rail.expression], ['Result', rail.label ?? rail.selected ?? 'No single band established'], ...rail.cells.map(cell => [cell.name, range(cell)] as const)]));
    if (rail.group) panel.append(facts('Managed label intent', [['Group', rail.group], ['Members', rail.members?.join(', ') ?? 'none'], ['Mapped label', rail.label ?? 'none'], ['Observed on GitHub', observedLabels(document).filter(label => rail.members?.includes(label)).join(', ') || 'none visible']]));
  }
  if (view.errors.length) { const errors = node('section', 'ddx-policy-error'); errors.append(node('h3', '', 'Policy not applied')); for (const error of view.errors) errors.append(node('p', '', `${error.code}: ${error.message}`)); panel.append(errors); }
  if (view.policy) {
    panel.append(facts('Policy', [['Mode', view.policy.mode], ['Layers', view.policy.layers.join(' < ')], ['Digest', view.policy.digest]]));
    const details = node('details', 'ddx-details'); details.append(node('summary', '', 'Effective-setting provenance'), facts('Origins', view.policy.origins.map(origin => [origin.path, `${origin.layer}${origin.replaces ? ` · replaces ${origin.replaces}` : ''}`]))); panel.append(details);
  }
  for (const [title, data] of [['Scopes', view.report.scopes], ['Rules', view.report.rules], ['File detail', view.focus]] as const) {
    if (!data || !Object.keys(data).length) continue;
    const details = node('details', 'ddx-details'); details.append(node('summary', '', title), node('pre', '', JSON.stringify(data, null, 2))); panel.append(details);
  }
  const identity = node('details', 'ddx-details'); identity.append(node('summary', '', 'Report identity'), facts('Identifiers', [['Report', view.report.reportId ?? 'unavailable'], ['Policy', view.report.policyId ?? 'none'], ['Schema', view.report.schemaVersion], ['Presenter', view.kind], ['Comparison', source.comparisonId]])); panel.append(identity);
  const footer = node('footer', 'ddx-report-footer'); const settings = node('a', '', 'Extension settings'); settings.href = chrome.runtime.getURL('options.html'); settings.target = '_blank'; settings.rel = 'noopener noreferrer';
  const copy = button('Copy report facts', () => { void navigator.clipboard.writeText(JSON.stringify(view, null, 2)).then(() => { copy.textContent = 'Copied'; }, () => { copy.textContent = 'Clipboard unavailable'; }); }, 'ddx-small'); copy.title = 'Includes paths and report facts, but not source lines.';
  footer.append(settings, copy); panel.append(footer); return panel;
}
export interface Projection { root: HTMLElement; trigger: HTMLButtonElement; cleanup: () => void }
export function projection(view: HumanReportView, settings: Settings, popover: Popover, aggregate: boolean): Projection {
  const root = node('span', 'ddx-root'); root.dataset.ddx = aggregate ? 'aggregate' : 'file'; root.dataset.density = String(settings['display.density']);
  const column = node('span', 'ddx-column'); const trigger = node('button', 'ddx-trigger'); trigger.type = 'button'; trigger.setAttribute('aria-expanded', 'false'); trigger.setAttribute('aria-haspopup', 'dialog');
  const mark = productIcon(String(settings['display.brandIcon']), isDark(document), chrome.runtime.getURL); if (mark) trigger.append(mark);
  trigger.append(node('span', 'ddx-primary-label', 'Changed'), node('strong', 'ddx-value', value(view.changed)));
  if (settings['display.decomposition']) { const breakdown = node('span', 'ddx-breakdown'); breakdown.append(node('span', 'ddx-added', `+${value(view.added)}`), node('span', 'ddx-deleted', `−${value(view.deleted)}`), node('span', 'ddx-modified', `~${value(view.modified)}`)); trigger.append(breakdown); }
  if (view.evidence.status !== 'exact') trigger.append(node('span', 'ddx-evidence', evidenceText(view.evidence.status)));
  trigger.title = `Open ${aggregate ? 'pull-request' : 'file'} report. ${evidenceText(view.evidence.status)}. Replacements count once.`;
  trigger.addEventListener('click', event => { event.stopPropagation(); popover.toggle(trigger, reportPanel(view, popover)); });
  column.append(trigger); if (settings['display.rawChurn']) column.append(node('span', 'ddx-raw', `Raw +${value(view.raw.added)} −${value(view.raw.deleted)}`)); root.append(column);
  const rail = view.rails.find(rail => rail.id === 'size') ?? view.rails[0];
  if (view.focus?.included === false) root.append(node('span', 'ddx-pill', 'excluded'));
  else if (rail && settings['display.virtualBandPill']) { const pill = node('span', 'ddx-pill', rail.label ?? (rail.selected ? `${rail.id}/${rail.selected}` : `${rail.id}/?`)); pill.title = 'Virtual local classification. Not an applied GitHub label.'; root.append(pill); }
  if (rail && settings['display.bandRail']) {
    const track = node('span', 'ddx-rail'); track.setAttribute('role', 'list'); track.setAttribute('aria-label', `${rail.id} policy bands`);
    for (const cell of rail.cells) { const square = node('span', `ddx-cell${cell.selected ? ' ddx-selected' : ''}`); square.tabIndex = 0; square.setAttribute('role', 'listitem'); square.title = `${cell.name}: ${range(cell)}`; square.setAttribute('aria-label', square.title); if (cell.selected) square.setAttribute('aria-current', 'true'); if (cell.color && /^[\da-f]{6}$/iu.test(cell.color)) square.style.setProperty('--ddx-band', `#${cell.color}`); track.append(square); }
    root.append(track);
  }
  if (settings['display.appStanding']) { const local = node('span', 'ddx-local', 'local'); local.title = 'Computed in this browser. No App report or approval is implied.'; root.append(local); }
  if (view.errors.length) { const warning = button('policy unavailable', () => popover.toggle(trigger, reportPanel(view, popover)), 'ddx-warning'); root.append(warning); }
  let stopLabelObservation: (() => void) | undefined;
  if (aggregate && rail?.label && settings['labels.nativeHandoff']) {
    const status = node('span', 'ddx-label-status'); status.setAttribute('role', 'status');
    if (observedLabels(document).includes(rail.label)) status.textContent = `${rail.label} · observed on GitHub`;
    else if (pickerAvailable(document)) root.append(button(`Find ${rail.label}`, () => { stopLabelObservation?.(); stopLabelObservation = labelHandoff(rail.label!, rail.members ?? [], status, document); }, 'ddx-small'));
    root.append(status);
  }
  return { root, trigger, cleanup: () => { stopLabelObservation?.(); root.remove(); } };
}
