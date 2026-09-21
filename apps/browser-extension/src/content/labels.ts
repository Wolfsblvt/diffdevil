// SPDX-License-Identifier: AGPL-3.0-only
const ROOTS = ['.js-issue-labels', '.sidebar-labels', '[data-testid="issue-labels"]', '[data-testid="labels-section"]'];
export function observedLabels(document: Document): readonly string[] {
  return [...document.querySelectorAll(ROOTS.flatMap(root => [`${root} .IssueLabel`, `${root} [data-testid="issue-label"]`]).join(','))].map(node => node.getAttribute('data-name') ?? node.textContent?.trim() ?? '').filter(Boolean);
}
function trigger(document: Document): HTMLElement | undefined {
  const elements = document.querySelectorAll<HTMLElement>('#labels-select-menu summary, .js-issue-labels summary, .sidebar-labels summary, button[aria-label="Edit labels"], [data-testid="labels-section"] button');
  return [...elements].find(element => !element.matches('[disabled], [aria-disabled="true"]') && !element.closest('[hidden], [inert]') && element.getClientRects().length > 0);
}
export const pickerAvailable = (document: Document): boolean => Boolean(trigger(document));
/** The only write is the user's own visible native GitHub selection. */
export function labelHandoff(label: string, members: readonly string[], status: HTMLElement, document: Document): () => void {
  const control = trigger(document);
  if (!control) { status.textContent = 'GitHub’s writable label picker is unavailable here.'; return () => undefined; }
  const before = observedLabels(document); const previous = before.filter(name => members.includes(name) && name !== label); let searched = false;
  const stop = (): void => { observer.disconnect(); clearTimeout(timer); document.removeEventListener('keydown', escape); };
  const escape = (event: KeyboardEvent): void => { if (event.key === 'Escape') stop(); };
  const prepare = (): void => {
    const input = document.querySelector<HTMLInputElement>('#labels-select-menu input, input[placeholder="Filter labels"], input[placeholder="Search labels"], [data-testid="label-picker"] input, .SelectMenu-filter input');
    if (input && !searched) {
      searched = true; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, label); input.dispatchEvent(new Event('input', { bubbles: true })); input.focus(); input.select();
      status.textContent = `Choose “${label}” in GitHub.${previous.length ? ` Replace managed ${previous.join(', ')} deliberately; unrelated labels stay yours.` : ''} diffdevil has not applied it.`;
    }
    if (observedLabels(document).includes(label) && !before.includes(label)) { status.textContent = `Observed on GitHub: ${label}.`; stop(); }
    else if (searched && !input) { status.textContent = 'Picker closed. No new label selection was observed.'; stop(); }
  };
  const observer = new MutationObserver(prepare); observer.observe(document.body, { childList: true, subtree: true });
  const timer = setTimeout(() => { if (!searched) status.textContent = 'The native picker could not be opened or inspected. No labels were changed.'; stop(); }, 15_000);
  document.addEventListener('keydown', escape);
  if (control.tagName === 'SUMMARY' && control.parentElement instanceof HTMLDetailsElement) { if (!control.parentElement.open) control.click(); } else control.click();
  prepare(); return stop;
}
