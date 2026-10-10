// SPDX-License-Identifier: AGPL-3.0-only
/**
 * One anchored, non-modal report (Extension Grammar v1 §6 interaction contract).
 * The shell is GitHub's (surface, border, elevation, position, dismissal); it
 * renders in a shadow root so no GitHub rule reaches the report and none of ours
 * reaches GitHub. Host custom properties inherit through the shadow boundary.
 */
import popoverCss from './popover.css';
export interface PopoverOptions { readonly width: number; readonly align: 'start' | 'end' }
const SHEET_BELOW = 544; const GAP = 8; const MARGIN = 16;
export class Popover {
  private anchor?: HTMLElement;
  private host?: HTMLElement;
  private panel?: HTMLElement;
  private options: PopoverOptions = { width: 420, align: 'end' };
  private listeners?: AbortController;
  private detached?: MutationObserver;
  private resized?: ResizeObserver;
  toggle(anchor: HTMLElement, panel: HTMLElement, options: PopoverOptions = { width: 420, align: 'end' }): void {
    if (this.anchor === anchor) { this.close(); return; }
    this.close(false); this.anchor = anchor; this.panel = panel; this.options = options;
    const host = document.createElement('div'); host.className = 'ddx-popover-host'; host.setAttribute('data-diffdevil', '');
    const shadow = host.attachShadow({ mode: 'open' }); const style = document.createElement('style'); style.textContent = popoverCss;
    panel.classList.add('ddx-popover'); panel.id = 'diffdevil-report-popover'; panel.setAttribute('role', 'dialog'); panel.tabIndex = -1;
    const handle = document.createElement('span'); handle.className = 'ddx-handle'; handle.setAttribute('aria-hidden', 'true'); panel.prepend(handle);
    shadow.append(style, panel); this.host = host;
    anchor.setAttribute('aria-expanded', 'true'); anchor.setAttribute('aria-controls', panel.id); document.body.append(host);
    this.position();
    (panel.querySelector<HTMLElement>('.ddx-close') ?? panel).focus({ preventScroll: true });
    requestAnimationFrame(() => panel.classList.add('ddx-open'));
    const controller = this.listeners = new AbortController();
    document.addEventListener('pointerdown', event => { const path = event.composedPath(); if (!path.includes(anchor) && !path.includes(panel)) this.close(false); }, { capture: true, signal: controller.signal });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); this.close(); } }, { signal: controller.signal });
    document.addEventListener('scroll', this.position, { capture: true, passive: true, signal: controller.signal }); window.addEventListener('resize', this.position, { signal: controller.signal });
    this.resized = new ResizeObserver(this.position); this.resized.observe(panel);
    this.detached = new MutationObserver(() => this.reconcile()); if (anchor.parentNode) this.detached.observe(anchor.parentNode, { childList: true });
  }
  get open(): boolean { return this.anchor !== undefined; }
  reconcile(): void { if (this.anchor && !this.anchor.isConnected) this.close(false); }
  close(restore = true): void {
    const anchor = this.anchor; this.listeners?.abort(); this.detached?.disconnect(); this.resized?.disconnect(); this.host?.remove();
    anchor?.setAttribute('aria-expanded', 'false'); anchor?.removeAttribute('aria-controls');
    delete this.anchor; delete this.panel; delete this.host; delete this.listeners; delete this.detached; delete this.resized;
    if (restore && anchor?.isConnected) anchor.focus({ preventScroll: true });
  }
  private position = (): void => {
    if (!this.panel || !this.anchor?.isConnected) { this.reconcile(); return; }
    const panel = this.panel; const anchor = this.anchor.getBoundingClientRect();
    if (anchor.bottom < 0 || anchor.top > innerHeight) { this.close(false); return; }
    // Below 544 px the report becomes a bottom sheet: full width, same content, same dismissal.
    if (innerWidth < SHEET_BELOW) { panel.classList.add('ddx-sheet'); panel.style.cssText = `max-height:${Math.max(120, Math.floor(innerHeight * 0.85))}px`; return; }
    panel.classList.remove('ddx-sheet');
    const width = Math.min(this.options.width, innerWidth - MARGIN * 2);
    const belowSpace = Math.max(0, innerHeight - anchor.bottom - GAP - MARGIN);
    const aboveSpace = Math.max(0, anchor.top - GAP - MARGIN);
    panel.style.width = `${width}px`; panel.style.maxHeight = 'none';
    const natural = panel.scrollHeight + 2;
    // Flip above only when there is no room below; constrain the chosen side so
    // the report never covers its own trigger, which must stay clickable.
    const above = belowSpace < natural && aboveSpace > belowSpace;
    panel.style.maxHeight = `${Math.max(1, above ? aboveSpace : belowSpace)}px`;
    const size = panel.getBoundingClientRect();
    panel.style.top = `${Math.max(MARGIN, above ? anchor.top - size.height - GAP : anchor.bottom + GAP)}px`;
    const preferred = this.options.align === 'end' ? anchor.right - size.width : anchor.left;
    panel.style.left = `${Math.max(MARGIN, Math.min(preferred, innerWidth - size.width - MARGIN))}px`;
  };
}
