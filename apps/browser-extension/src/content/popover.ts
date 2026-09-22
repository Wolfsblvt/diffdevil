// SPDX-License-Identifier: AGPL-3.0-only
/** One anchored, non-modal report. No backdrop, focus trap, or page-scroll lock. */
export class Popover {
  private anchor?: HTMLElement;
  private panel?: HTMLElement;
  private listeners?: AbortController;
  private detached?: MutationObserver;
  private resized?: ResizeObserver;
  toggle(anchor: HTMLElement, panel: HTMLElement): void {
    if (this.anchor === anchor) { this.close(); return; }
    this.close(false); this.anchor = anchor; this.panel = panel;
    panel.classList.add('ddx-popover'); panel.id = 'diffdevil-report-popover'; panel.setAttribute('role', 'dialog'); panel.tabIndex = -1;
    anchor.setAttribute('aria-expanded', 'true'); anchor.setAttribute('aria-controls', panel.id); document.body.append(panel); this.position(); panel.focus({ preventScroll: true });
    const controller = this.listeners = new AbortController();
    document.addEventListener('pointerdown', event => { const path = event.composedPath(); if (!path.includes(anchor) && !path.includes(panel)) this.close(false); }, { capture: true, signal: controller.signal });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); this.close(); } }, { signal: controller.signal });
    document.addEventListener('scroll', this.position, { capture: true, passive: true, signal: controller.signal }); window.addEventListener('resize', this.position, { signal: controller.signal });
    this.resized = new ResizeObserver(this.position); this.resized.observe(panel);
    this.detached = new MutationObserver(() => this.reconcile()); if (anchor.parentNode) this.detached.observe(anchor.parentNode, { childList: true });
  }
  reconcile(): void { if (this.anchor && !this.anchor.isConnected) this.close(false); }
  close(restore = true): void {
    const anchor = this.anchor; this.listeners?.abort(); this.detached?.disconnect(); this.resized?.disconnect(); this.panel?.remove();
    anchor?.setAttribute('aria-expanded', 'false'); anchor?.removeAttribute('aria-controls');
    delete this.anchor; delete this.panel; delete this.listeners; delete this.detached; delete this.resized;
    if (restore && anchor?.isConnected) anchor.focus({ preventScroll: true });
  }
  private position = (): void => {
    if (!this.panel || !this.anchor?.isConnected) { this.reconcile(); return; }
    const panel = this.panel; const anchor = this.anchor.getBoundingClientRect(); const padding = 12;
    if (anchor.bottom < 0 || anchor.top > innerHeight) { this.close(false); return; }
    panel.style.maxWidth = `${Math.max(1, innerWidth - padding * 2)}px`;
    const belowSpace = Math.max(0, innerHeight - anchor.bottom - padding - 6);
    const aboveSpace = Math.max(0, anchor.top - padding - 6);
    const naturalHeight = panel.scrollHeight + 2;
    const above = belowSpace < naturalHeight && aboveSpace > belowSpace;
    // Constrain the chosen side instead of shifting a full-height report over its
    // own trigger. The trigger must remain clickable for click-again dismissal.
    panel.style.maxHeight = `${Math.max(1, above ? aboveSpace : belowSpace)}px`;
    const size = panel.getBoundingClientRect();
    panel.style.top = `${Math.max(padding, above ? anchor.top - size.height - 6 : anchor.bottom + 6)}px`;
    panel.style.left = `${Math.max(padding, Math.min(anchor.right - size.width, innerWidth - size.width - padding))}px`;
  };
}
