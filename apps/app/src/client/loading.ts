// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/** Independent navigation, population and optional notifications; only the current document may commit a reply. */
import { swapTo, carryCharts } from './charts/mount';
import { preserveNavigation } from './navigation-state';

/** Hashes name a focus/anchor within a document, not a different analytical acquisition. */
function documentUrl(value: string): string { const url = new URL(value, location.origin); url.hash = ''; return url.href; }
let enrichmentController: AbortController | null = null;
let notificationController: AbortController | null = null;

function announce(message: string): void {
  const live = document.querySelector('[data-live-region]');
  if (live) live.textContent = message;
}

async function fragment(url: string, part: 'navigation' | 'notifications' | 'enrichment', signal?: AbortSignal): Promise<Document> {
  const response = await fetch(url, { credentials: 'same-origin', headers: { accept: 'text/html', 'x-diffdevil-render': part }, signal });
  if ((!response.ok && response.status !== 404) || response.redirected) throw new Error('E_ANALYTICAL_READ');
  return new DOMParser().parseFromString(await response.text(), 'text/html');
}

export function loadAnalyticalDocument(): void {
  document.addEventListener('diffdevil:page', event => { void enrich((event as CustomEvent).detail?.reason); void notifications(location.href); notificationBadge(); });
  document.addEventListener('diffdevil:load-failed', event => {
    if (document.querySelector('[data-analytical-loading]')) return;
    const { url, reason } = (event as CustomEvent).detail;
    const main = document.querySelector('#main');
    if (!main) return;
    main.querySelector('[data-load-error]')?.remove();
    const notice = document.createElement('div');
    notice.className = 'a-note'; notice.dataset.loadError = ''; notice.setAttribute('role', 'alert');
    notice.append('The new view could not load. The previous view is still displayed. ');
    const button = document.createElement('button');
    button.className = 'btn btn-quiet'; button.textContent = 'Retry view';
    button.addEventListener('click', () => { notice.remove(); void swapTo(url, { reason }); });
    notice.append(button); main.prepend(notice);
  });
  const loading = document.querySelector<HTMLElement>('[data-analytical-loading]');
  if (!loading) return;
  const url = documentUrl(loading.dataset.url!);
  const current = () => loading.isConnected && documentUrl(location.href) === url;
  const region = loading.querySelector<HTMLElement>('[data-analytical-region]')!;
  const status = region.querySelector<HTMLElement>('[data-loading-status]')!;
  const retry = region.querySelector<HTMLButtonElement>('[data-loading-retry]')!;

  async function navigation(): Promise<void> {
    const control = document.querySelector<HTMLButtonElement>('[data-navigation-retry]');
    const retryFocused = control === document.activeElement;
    if (control) control.hidden = true;
    try {
      const next = await fragment(url, 'navigation');
      if (!current()) return;
      const nav = next.querySelector('[data-nav]');
      if (!nav) throw new Error('E_ANALYTICAL_READ');
      const restoreNavigation = preserveNavigation({ focusFilter: retryFocused && document.activeElement === document.body });
      document.querySelector('[data-nav]')?.replaceWith(nav);
      document.dispatchEvent(new CustomEvent('diffdevil:page'));
      restoreNavigation();
    } catch {
      if (!current()) return;
      const message = document.querySelector('[data-navigation-status]');
      if (message) message.textContent = 'Repositories could not load. Navigation is still available.';
      if (control) control.hidden = false;
    }
  }

  async function populate(): Promise<void> {
    if (!current()) return;
    const wasRetryFocused = document.activeElement === retry;
    retry.hidden = true;
    region.setAttribute('aria-busy', 'true');
    status.textContent = 'Loading current data… Measurements and populations have not answered yet.';
    if (!await swapTo(url, { reason: 'initial' })) return;
    announce('Data loaded.');
    if (wasRetryFocused) {
      const main = document.querySelector<HTMLElement>('#main');
      main?.setAttribute('tabindex', '-1');
      main?.focus({ preventScroll: true });
    }
  }

  retry.addEventListener('click', () => void populate());
  document.querySelector('[data-navigation-retry]')?.addEventListener('click', () => void navigation());
  document.addEventListener('diffdevil:load-failed', () => {
    if (!current()) return;
    region.setAttribute('aria-busy', 'false');
    status.textContent = 'Data could not load. Measurements and populations are unavailable, not zero. Retry this view or use the navigation.';
    retry.hidden = false;
    announce('Data could not load. Retry is available.');
  });
  void navigation();
  void notifications(url);
  void populate();
}

async function enrich(reason = 'enrichment'): Promise<void> {
  const slots = [...document.querySelectorAll<HTMLElement>('[data-premium-region][data-pending="true"]')];
  if (!slots.length) return;
  enrichmentController?.abort();
  const controller = (enrichmentController = new AbortController());
  const url = documentUrl(location.href);
  for (const slot of slots) slot.dataset.pending = 'loading';
  try {
    const next = await fragment(url, 'enrichment', controller.signal);
    if (documentUrl(location.href) !== url || !slots.every(slot => slot.isConnected)) return;
    for (const slot of slots) {
      const fresh = next.querySelector<HTMLElement>(`[data-premium-region="${CSS.escape(slot.dataset.premiumRegion!)}"]`);
      if (!fresh || fresh.dataset.pending) throw new Error('E_ANALYTICAL_READ');
    }
    const retryFocused = slots.some(slot => slot.contains(document.activeElement) && document.activeElement?.matches('[data-premium-retry]'));
    document.querySelector('[data-pending-file-head]')?.remove();
    const finishCharts = carryCharts(next, reason);
    for (const slot of slots) {
      const fresh = next.querySelector(`[data-premium-region="${CSS.escape(slot.dataset.premiumRegion!)}"]`)!;
      slot.replaceWith(fresh);
    }
    finishCharts();
    if (retryFocused) {
      const heading = document.querySelector<HTMLElement>(`[data-premium-region="${CSS.escape(slots[0].dataset.premiumRegion!)}"] h1, [data-premium-region="${CSS.escape(slots[0].dataset.premiumRegion!)}"] h2`);
      heading?.setAttribute('tabindex', '-1'); heading?.focus({ preventScroll: true });
    }
    announce('File history loaded.');
    document.dispatchEvent(new CustomEvent('diffdevil:page'));
  } catch {
    if (controller.signal.aborted || documentUrl(location.href) !== url || !slots.some(slot => slot.isConnected)) return;
    for (const slot of slots) {
      if (!slot.isConnected) continue;
      slot.setAttribute('aria-busy', 'false');
      slot.dataset.pending = 'failed';
      const status = slot.querySelector('[data-region-status]');
      if (status) status.textContent = 'This region could not load. Its measurements are unavailable, not zero.';
      const retry = slot.querySelector<HTMLButtonElement>('[data-premium-retry]');
      if (retry) {
        retry.hidden = false;
        retry.onclick = () => {
          for (const candidate of slots) { candidate.dataset.pending = 'true'; candidate.setAttribute('aria-busy', 'true'); }
          void enrich();
        };
      }
    }
    announce('File history could not load. The other panels remain available.');
  }
}

async function notifications(url: string): Promise<void> {
  const target = document.querySelector<HTMLElement>('[data-analytical-notifications][data-notifications-pending="true"]');
  if (!target) return;
  notificationController?.abort();
  const controller = (notificationController = new AbortController());
  target.dataset.notificationsPending = 'loading';
  try {
    const next = await fragment(url, 'notifications', controller.signal);
    if (documentUrl(location.href) !== documentUrl(url) || !target.isConnected) return;
    const invitation = next.querySelector('[data-analytical-notifications]');
    if (!invitation) throw new Error('E_ANALYTICAL_READ');
    target.replaceWith(invitation);
    notificationBadge();
    document.dispatchEvent(new CustomEvent('diffdevil:page'));
  } catch {
    if (controller.signal.aborted || !target.isConnected) return;
    // Optional chrome may be unavailable; it cannot hold navigation or analytical content.
    target.removeAttribute('data-notifications-pending');
    target.dataset.notificationsUnavailable = 'true';
  }
}

function notificationBadge(): void {
  const badge = document.querySelector<HTMLElement>('[data-analytical-badge]');
  const end = document.querySelector('[data-nav-manage] .a-end');
  if (!badge || !end || Number(badge.dataset.count) <= 0) return;
  const count = document.createElement('span');
  count.className = badge.dataset.urgent === 'true' ? 'm-dotn err' : 'm-dotn';
  count.textContent = badge.dataset.count!;
  count.title = `${badge.dataset.count} things need a decision`;
  end.replaceChildren(count);
}
