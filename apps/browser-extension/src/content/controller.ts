// SPDX-License-Identifier: AGPL-3.0-only
import type { HumanReportView } from '@wolfsblvt/diffdevil/browser';
import { DEFAULTS, type Settings } from '../shared/catalogue.js';
import { request as defaultRequest, type Packet } from '../shared/protocol.js';
import { SETTINGS_KEY } from '../shared/settings-key.js';
import { node, button } from '../shared/dom.js';
import { acquire as defaultAcquire } from './acquire.js';
import { route, aggregateHost, FILE_HEADERS, LIVE_DIFFSTAT, PROVIDER_CHANGE, filePath, pageComparison, sameComparison, fullFilesView } from './github.js';
import { projection, reportPanel, type Projection } from './render.js';
import { Popover } from './popover.js';
/** Dependencies are explicit so lifecycle tests never need to impersonate a browser origin. */
export interface ContentDependencies { readonly href?: () => string; readonly acquire?: typeof defaultAcquire; readonly request?: typeof defaultRequest }
export function startContent(dependencies: ContentDependencies = {}): { refresh: () => Promise<void>; stop: () => void } {
  const href = dependencies.href ?? (() => location.href);
  const acquire = dependencies.acquire ?? defaultAcquire;
  const request = dependencies.request ?? defaultRequest;
  const lifecycle = new AbortController(); let stopped = false;
const popover = new Popover(); const mounted = new Map<HTMLElement, Projection>(); const fileViews = new Map<string, HumanReportView>(); const waiting = new Set<string>(); const failed = new Set<string>();
let settings: Settings = { ...DEFAULTS }; let packet: Packet | undefined; let controller: AbortController | undefined;
let generation = 0; let activeRoute = ''; let identityInFlight = ''; let failedIdentity = ''; let acquiring = false; let fileBusy = false; let renderQueued = false; let opened = false;
let status: HTMLElement | undefined; let fileError = false; let observedRoot: Element | undefined; let observer: MutationObserver | undefined;
const own = (node: Node): boolean => node instanceof Element && Boolean(node.closest('.ddx-root, .ddx-popover, .ddx-status'));
function clear(): void {
  for (const item of mounted.values()) item.cleanup(); mounted.clear(); popover.close(false); status?.remove(); status = undefined;
  for (const node of document.querySelectorAll('.ddx-native-dim, .ddx-native-hidden')) node.classList.remove('ddx-native-dim', 'ddx-native-hidden');
}
function showStatus(message: string, error = false): void {
  const host = aggregateHost(document);
  status?.remove(); status = node('span', `ddx-status${error ? ' ddx-error' : ''}`, message); status.setAttribute('role', 'status');
  if (error) status.append(button('Retry', () => { void refresh(true); }, 'ddx-small'));
  if (host) host.insertAdjacentElement('afterend', status);
  else { status.classList.add('ddx-status-fallback'); document.body.append(status); }
}
function nativeStat(host: HTMLElement): void {
  const selector = `.diffstat, #diffstat, [data-testid$="diff-stats"], ${LIVE_DIFFSTAT}`;
  const candidates = host.matches(selector) ? [host] : [...host.querySelectorAll<HTMLElement>(selector)].filter(element => !own(element));
  for (const element of candidates) { element.classList.toggle('ddx-native-hidden', Boolean(settings['display.hideNativeDiffstat'])); element.classList.toggle('ddx-native-dim', Boolean(settings['display.dimNativeDiffstat']) && !settings['display.hideNativeDiffstat']); }
}
function mount(host: HTMLElement, view: HumanReportView, aggregate: boolean): void {
  if (mounted.has(host)) return;
  const item = projection(view, settings, popover, aggregate); mounted.set(host, item);
  const interactive = host.closest('button, a');
  if (interactive) interactive.insertAdjacentElement('afterend', item.root); else if (aggregate) host.insertAdjacentElement('afterend', item.root); else host.append(item.root);
  nativeStat(host);
  if (aggregate && settings['display.detailDefaultOpen'] && !opened) { opened = true; popover.toggle(item.trigger, reportPanel(view, popover)); }
}
function schedule(): void { if (stopped || renderQueued) return; renderQueued = true; queueMicrotask(() => { renderQueued = false; render(); }); }
function render(): void {
  if (stopped) return;
  popover.reconcile(); for (const [host, item] of mounted) if (!host.isConnected || !item.root.isConnected || !fullFilesView(href()) && item.root.dataset.ddx === 'file') { item.cleanup(); mounted.delete(host); }
  if (!packet || acquiring || !settings['display.enabled']) return;
  const aggregate = aggregateHost(document);
  if (aggregate || !settings['display.aggregateChanged']) { if (!fileError) { status?.remove(); status = undefined; } }
  else if (!fileError) showStatus('Changed ? · diffdevil could not find GitHub’s pull-request summary on this page.', true);
  if (aggregate) { nativeStat(aggregate); if (settings['display.aggregateChanged']) mount(aggregate, packet.view, true); }
  if (fullFilesView(href())) for (const header of document.querySelectorAll<HTMLElement>(FILE_HEADERS)) {
    nativeStat(header); if (!settings['display.fileChanged']) continue;
    const path = filePath(header); if (!path || mounted.has(header)) continue; const view = fileViews.get(path);
    if (view) mount(header, view, false); else if (!failed.has(path) && packet.files.some(file => file.path === path || file.oldPath === path)) waiting.add(path);
  }
  if (waiting.size && !fileBusy) void renderFiles();
}
async function renderFiles(): Promise<void> {
  if (!packet || fileBusy) return; fileBusy = true; const revision = generation; const paths = [...waiting].slice(0, 24); paths.forEach(path => waiting.delete(path));
  try {
    const result = await request<Record<string, HumanReportView>>({ type: 'analysis.files', key: packet.key, paths }); if (revision !== generation) return;
    for (const [path, view] of Object.entries(result)) fileViews.set(path, view); for (const path of paths) if (!Object.hasOwn(result, path)) failed.add(path);
  } catch (error) {
    if (revision !== generation) return;
    if ((error as { code?: string }).code === 'CONTEXT_EXPIRED') { void refresh(true); return; }
    paths.forEach(path => failed.add(path)); fileError = true; showStatus(error instanceof Error ? error.message : 'File evidence is unavailable.', true);
  } finally { fileBusy = false; schedule(); }
}
function observe(): void {
  const root = document.querySelector('#repo-content-pjax-container, main, [role="main"]') ?? document.body;
  if (root === observedRoot && observer) return; observer?.disconnect(); observedRoot = root;
  observer = new MutationObserver(records => {
    let providerChanged = false; let identityChanged = false;
    for (const record of records) {
      if (own(record.target)) continue;
      if (record.type === 'attributes' || record.target instanceof Element && record.target.matches('script[type="application/json"], input#pull_request_head_sha, input#pull_request_base_sha')) { identityChanged = true; continue; }
      for (const added of [...record.addedNodes, ...record.removedNodes]) {
        if (!(added instanceof Element) || own(added)) continue;
        if (added.matches('script[type="application/json"]') || added.querySelector('script[type="application/json"]')) identityChanged = true;
        if (!added.isConnected || added.matches(PROVIDER_CHANGE) || added.querySelector(PROVIDER_CHANGE)) providerChanged = true;
      }
    }
    if (identityChanged) void refresh(false); else if (providerChanged) schedule();
  });
  observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-current-head-oid', 'data-base-ref-oid', 'value'] });
}
async function refresh(force: boolean): Promise<void> {
  if (stopped) return;
  const current = route(href());
  if (!current) { generation++; controller?.abort(); clear(); packet = undefined; activeRoute = ''; acquiring = false; observer?.disconnect(); observedRoot = undefined; return; }
  observe(); const key = `${current.repository.toLowerCase()}#${current.pullRequest}`; const identity = pageComparison(document, current); const identityKey = `${key}:${identity?.base ?? '?'}:${identity?.head ?? '?'}`;
  if (!force && failedIdentity === identityKey) return;
  if (!force && packet && activeRoute === key && identity && sameComparison(packet.comparison, identity)) { schedule(); return; }
  if (!force && acquiring && activeRoute === key && (!identity || identityInFlight === identityKey)) return;
  const revision = ++generation; controller?.abort(); const signal = (controller = new AbortController()).signal;
  acquiring = true; activeRoute = key; identityInFlight = identityKey; clear(); fileViews.clear(); waiting.clear(); failed.clear(); opened = false; fileError = false;
  try {
    settings = await request<Settings>({ type: 'settings.get' }); if (revision !== generation) return;
    if (!settings['display.enabled']) { packet = undefined; return; }
    showStatus('Changed · reading comparison…'); const result = await acquire(current, document, signal);
    if (revision !== generation || signal.aborted || !route(href())) return;
    packet = result.packet; settings = result.settings; failedIdentity = '';
  } catch (error) {
    if (revision !== generation || signal.aborted) return;
    packet = undefined; failedIdentity = identityKey; showStatus(`Changed ? · ${error instanceof Error ? error.message : 'Source is unavailable.'}`, true);
  } finally { if (revision === generation) { acquiring = false; schedule(); } }
}
let navigationQueued = false;
const navigated = (): void => { if (navigationQueued) return; navigationQueued = true; queueMicrotask(() => { navigationQueued = false; void refresh(false); }); };
for (const event of ['turbo:load', 'pjax:end', 'soft-nav:payload', 'soft-nav:end', 'popstate']) { document.addEventListener(event, navigated, { signal: lifecycle.signal }); window.addEventListener(event, navigated, { signal: lifecycle.signal }); }
// This outer watcher only checks whether the observed root was detached.
const rootWatcher = new MutationObserver(() => { if (observedRoot && !observedRoot.isConnected) { observe(); navigated(); } });
rootWatcher.observe(document.body, { childList: true, subtree: true });
const changed = (changes: Record<string, { oldValue?: unknown; newValue?: unknown }>, area: string): void => { if ((area === 'sync' || area === 'local') && Object.hasOwn(changes, SETTINGS_KEY)) void refresh(true); };
chrome.storage.onChanged.addListener(changed);
const refreshTheme = (): void => { if (packet && !acquiring) { clear(); schedule(); } };
const themeWatcher = new MutationObserver(refreshTheme);
themeWatcher.observe(document.documentElement, { attributes: true, attributeFilter: ['data-color-mode', 'data-theme', 'data-dark-theme', 'data-light-theme'] });
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', refreshTheme, { signal: lifecycle.signal });
void refresh(false);
return { refresh: () => refresh(true), stop: (): void => {
  stopped = true; generation++; controller?.abort(); lifecycle.abort(); observer?.disconnect(); rootWatcher.disconnect(); themeWatcher.disconnect(); chrome.storage.onChanged.removeListener(changed); clear();
} };
}
