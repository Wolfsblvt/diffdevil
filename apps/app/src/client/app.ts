// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * The App's client behaviour: the website header's panels, search launcher and copy buttons
 * (shared code, not a copy), the dark-only lock on the theme control, the navigation's
 * collapse memory and repository filter, the Files table filter, and the chart system of
 * Chart Grammar v1.1 (progressive mounting, the period morph, bucket and file selection swaps,
 * segmented-switch thumbs, navigation feedback). Everything renders without this script; it
 * draws the charts over the server-rendered readouts and tables and removes friction.
 */
import { wirePanels, labelShortcut } from '../../../website/src/lib/shell-behaviour';
import { wireSearch } from '../../../website/src/lib/search';
import { wireCopyButtons } from '../../../website/src/lib/clipboard';
import { mountCharts, placeThumbs, wireNavigationFeedback } from './charts/mount';
import { loadAnalyticalDocument } from './loading';
import './policy-lab';

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

/* Navigation: remembered collapse per namespace, and a live repository filter. Re-run after a page swap. */
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
function wirePage(): void {
  for (const toggle of document.querySelectorAll<HTMLButtonElement>('[data-nav-toggle]')) {
    if (toggle.dataset.wired) continue;
    toggle.dataset.wired = '1';
    const namespace = toggle.dataset.navToggle!;
    applyCollapse(namespace, collapsed.has(namespace));
    toggle.addEventListener('click', () => { if (collapsed.has(namespace)) collapsed.delete(namespace); else collapsed.add(namespace); writeCollapsed(collapsed); applyCollapse(namespace, collapsed.has(namespace)); });
  }
  const filter = document.querySelector<HTMLInputElement>('[data-nav-filter]');
  if (filter && !filter.dataset.wired) {
    filter.dataset.wired = '1';
    filter.addEventListener('input', () => {
      const needle = filter.value.trim().toLowerCase();
      for (const link of document.querySelectorAll<HTMLElement>('[data-nav-repo]')) link.hidden = needle !== '' && !link.dataset.navRepo!.includes(needle);
      for (const group of document.querySelectorAll<HTMLElement>('[data-namespace]')) {
        const anyVisible = [...group.querySelectorAll<HTMLElement>('[data-nav-repo]')].some(link => !link.hidden);
        group.hidden = needle !== '' && !anyVisible && !group.dataset.namespace!.toLowerCase().includes(needle);
        if (needle !== '') applyCollapse(group.dataset.namespace!, false);
      }
    });
  }
  /* Files: a live filter over the ranked table; the server-rendered rows stay the source of truth. */
  const fileFilter = document.querySelector<HTMLInputElement>('[data-file-filter]');
  if (fileFilter && !fileFilter.dataset.wired) {
    fileFilter.dataset.wired = '1';
    fileFilter.addEventListener('input', () => {
      const needle = fileFilter.value.trim().toLowerCase();
      for (const row of document.querySelectorAll<HTMLElement>('[data-file-row]')) row.hidden = needle !== '' && !row.dataset.fileRow!.includes(needle);
    });
  }
  for (const scroller of document.querySelectorAll<HTMLElement>('.pr-files-scroll')) {
    if (scroller.dataset.keyboardWired) continue;
    scroller.dataset.keyboardWired = '1';
    scroller.addEventListener('keydown', event => {
      const step = Math.max(40, Math.round(scroller.clientWidth * 0.8));
      if (event.key === 'ArrowRight') scroller.scrollLeft += step;
      else if (event.key === 'ArrowLeft') scroller.scrollLeft -= step;
      else if (event.key === 'Home') scroller.scrollLeft = 0;
      else if (event.key === 'End') scroller.scrollLeft = scroller.scrollWidth;
      else return;
      event.preventDefault();
    });
  }
  placeThumbs();
}

wireNavigationFeedback();
wirePage();
document.addEventListener('diffdevil:page', () => { wirePage(); mountCharts(); });
document.addEventListener('click', event => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const control = target.closest('.a-seg > [aria-pressed], .a-seg > [aria-current]');
  const segment = control?.closest<HTMLElement>('.a-seg');
  if (segment) requestAnimationFrame(() => placeThumbs(segment.parentElement ?? document));
});
mountCharts();
loadAnalyticalDocument();
