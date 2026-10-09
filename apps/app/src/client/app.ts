// SPDX-License-Identifier: AGPL-3.0-only
/**
 * The App's client behaviour: the website header's panels, search launcher and copy buttons
 * (shared code, not a copy), the dark-only lock on the theme control, the navigation's
 * collapse memory and repository filter, and bucket picking on the history chart.
 * Everything renders without this script; it only removes friction.
 */
import { wirePanels, labelShortcut } from '../../../website/src/lib/shell-behaviour';
import { wireSearch } from '../../../website/src/lib/search';
import { wireCopyButtons } from '../../../website/src/lib/clipboard';

wirePanels();
wireSearch();
labelShortcut();
wireCopyButtons(document);

/* The App is dark-only for now (owner decision). The header's control stays in place and says so. */
for (const control of document.querySelectorAll<HTMLButtonElement>('[data-theme-control]')) {
  control.setAttribute('aria-disabled', 'true');
  control.title = 'The App is dark-only for now.';
  control.addEventListener('click', event => { event.preventDefault(); event.stopImmediatePropagation(); }, true);
  control.addEventListener('keydown', event => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); event.stopImmediatePropagation(); } }, true);
}

/* Navigation: remembered collapse per namespace, and a live repository filter. */
const COLLAPSED_KEY = 'diffdevil.app.nav-collapsed';
function readCollapsed(): Set<string> { try { return new Set(JSON.parse(localStorage.getItem(COLLAPSED_KEY) ?? '[]')); } catch { return new Set(); } }
function writeCollapsed(set: Set<string>): void { try { localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...set])); } catch { /* storage unavailable: the choice lasts for this page */ } }
const collapsed = readCollapsed();
function applyCollapse(namespace: string, isCollapsed: boolean): void {
  const toggle = document.querySelector<HTMLButtonElement>(`[data-nav-toggle="${CSS.escape(namespace)}"]`);
  const repos = document.querySelector<HTMLElement>(`[data-nav-repos="${CSS.escape(namespace)}"]`);
  if (!toggle || !repos) return;
  toggle.setAttribute('aria-expanded', String(!isCollapsed));
  toggle.setAttribute('aria-label', `${isCollapsed ? 'Expand' : 'Collapse'} ${namespace}`);
  repos.hidden = isCollapsed;
}
for (const toggle of document.querySelectorAll<HTMLButtonElement>('[data-nav-toggle]')) {
  const namespace = toggle.dataset.navToggle!;
  applyCollapse(namespace, collapsed.has(namespace));
  toggle.addEventListener('click', () => { if (collapsed.has(namespace)) collapsed.delete(namespace); else collapsed.add(namespace); writeCollapsed(collapsed); applyCollapse(namespace, collapsed.has(namespace)); });
}
const filter = document.querySelector<HTMLInputElement>('[data-nav-filter]');
filter?.addEventListener('input', () => {
  const needle = filter.value.trim().toLowerCase();
  for (const link of document.querySelectorAll<HTMLElement>('[data-nav-repo]')) link.hidden = needle !== '' && !link.dataset.navRepo!.includes(needle);
  for (const group of document.querySelectorAll<HTMLElement>('[data-namespace]')) {
    const anyVisible = [...group.querySelectorAll<HTMLElement>('[data-nav-repo]')].some(link => !link.hidden);
    group.hidden = needle !== '' && !anyVisible && !group.dataset.namespace!.toLowerCase().includes(needle);
    if (needle !== '') applyCollapse(group.dataset.namespace!, false);
  }
});

/* History: a click on a bucket column follows the same link the bucket row offers. */
const picker = document.querySelector<HTMLElement>('[data-pick-bucket]');
picker?.addEventListener('click', event => {
  const hit = (event.target as Element).closest<SVGRectElement>('rect.hit');
  if (!hit?.dataset.index) return;
  location.href = picker.dataset.pickBucket!.replace('__W__', hit.dataset.index);
});
