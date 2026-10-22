// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/** Keep a person's place while fresh, authorized navigation replaces its previous DOM. */
export function preserveNavigation({ focusFilter = false }: { focusFilter?: boolean } = {}): () => void {
  const nav = document.querySelector<HTMLElement>('[data-nav]');
  const active = document.activeElement;
  const focused = active instanceof HTMLElement && nav?.contains(active) ? active : null;
  const href = focused instanceof HTMLAnchorElement ? focused.getAttribute('href') : null;
  const label = focused?.getAttribute('aria-label');
  const accountControl = focused?.closest('.a-me-host') ? (focused.tagName === 'BUTTON' ? '.a-me-host form button' : '.a-me-host summary') : null;
  const menuOpen = nav?.querySelector<HTMLDetailsElement>('.a-me-host')?.open ?? false;
  const filter = nav?.querySelector<HTMLInputElement>('[data-nav-filter]');
  const value = filter?.value ?? '';
  const selection: [number | null, number | null] | null = filter && focused === filter ? [filter.selectionStart, filter.selectionEnd] : null;

  return () => {
    const next = document.querySelector<HTMLElement>('[data-nav]');
    if (!next) return;
    const menu = next.querySelector<HTMLDetailsElement>('.a-me-host');
    if (menu) menu.open = menuOpen;
    const nextFilter = next.querySelector<HTMLInputElement>('[data-nav-filter]');
    if (nextFilter && value) { nextFilter.value = value; nextFilter.dispatchEvent(new Event('input')); }
    const target = focusFilter ? nextFilter : href ? next.querySelector<HTMLElement>(`a[href="${CSS.escape(href)}"]`)
      : label ? next.querySelector<HTMLElement>(`[aria-label="${CSS.escape(label)}"]`)
        : accountControl ? next.querySelector<HTMLElement>(accountControl) : null;
    target?.focus({ preventScroll: true });
    if (target === nextFilter && selection?.[0] !== null && selection?.[0] !== undefined) nextFilter?.setSelectionRange(selection[0], selection[1]);
  };
}
