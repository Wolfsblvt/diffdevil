// SPDX-License-Identifier: AGPL-3.0-only
import type { HumanReportView } from '@wolfsblvt/diffdevil/browser';
import { DEFAULTS, type Settings } from '../shared/catalogue.js';
import { request as defaultRequest, type Packet } from '../shared/protocol.js';
import { SETTINGS_KEY } from '../shared/settings-key.js';
import { node, button } from '../shared/dom.js';
import { acquire as defaultAcquire } from './acquire.js';
import { route, aggregateNative, toolbarNative, fileNative, FILE_HEADERS, PROVIDER_CHANGE, filePath, pageComparison, sameComparison, fullFilesView, type NativeStat } from './github.js';
import { projection, failureMarker, type Projection } from './render.js';
import { errorPanel, type ReportActions } from './report.js';
import { labelHandoff, pickerAvailable } from './labels.js';
import { Popover } from './popover.js';
/** Dependencies are explicit so lifecycle tests never need to impersonate a browser origin. */
export interface ContentDependencies { readonly href?: () => string; readonly acquire?: typeof defaultAcquire; readonly request?: typeof defaultRequest }
interface Failure { code: string; message: string }
const LABEL_INTENT = 'diffdevil.labelIntent';
const reduced = (): boolean => matchMedia('(prefers-reduced-motion: reduce)').matches;
export function startContent(dependencies: ContentDependencies = {}): { refresh: () => Promise<void>; stop: () => void } {
  const href = dependencies.href ?? (() => location.href);
  const acquire = dependencies.acquire ?? defaultAcquire;
  const request = dependencies.request ?? defaultRequest;
  const lifecycle = new AbortController(); let stopped = false;
  const popover = new Popover(); const mounted = new Map<HTMLElement, Projection>(); const natives = new Set<HTMLElement>();
  const fileViews = new Map<string, HumanReportView>(); const waiting = new Set<string>(); const failed = new Set<string>();
  let settings: Settings = { ...DEFAULTS }; let packet: Packet | undefined; let controller: AbortController | undefined;
  let generation = 0; let activeRoute = ''; let identityInFlight = ''; let failedIdentity = ''; let acquiring = false; let fileBusy = false; let renderQueued = false;
  let status: HTMLElement | undefined; let fileError = false; let failure: Failure | undefined; let observedRoot: Element | undefined; let observer: MutationObserver | undefined;
  let stopLabelObservation: (() => void) | undefined;
  const own = (node: Node): boolean => node instanceof Element && Boolean(node.closest('[data-diffdevil], .ddx-root, .ddx-popover-host, .ddx-status'));
  const current = (): { repository: string; pullRequest: number; path: string } | undefined => route(href());
  const actions: ReportActions = {
    copyText: async path => { if (!packet) throw new Error('No analysis is available.'); return request<string>({ type: 'report.text', key: packet.key, ...(path === undefined ? {} : { path }) }); },
    retry: () => { void refresh(true); },
    settingsUrl: chrome.runtime.getURL('options.html'),
    diagnostics: error => JSON.stringify({ kind: 'diffdevil.failure/1', code: error.code, message: error.message, version: chrome.runtime.getManifest().version, route: current()?.path, comparison: packet ? { base: packet.comparison.base, head: packet.comparison.head } : undefined, at: new Date().toISOString() }, null, 2),
    errorPanel: (error, host) => { const scope = current(); return errorPanel(error, scope ? `${scope.repository} #${scope.pullRequest}` : undefined, host, actions); },
    findLabel: (label, members, statusNode) => {
      stopLabelObservation?.();
      if (pickerAvailable(document)) { stopLabelObservation = labelHandoff(label, members, statusNode, document); return; }
      // The picker lives in the Conversation sidebar. Carry the intent there and open it on arrival.
      const scope = current(); if (!scope) return;
      try { sessionStorage.setItem(LABEL_INTENT, JSON.stringify({ key: scope.path, label, members })); } catch { /* No intent survives; the user opens the picker on Conversation. */ }
      location.assign(`https://github.com${scope.path}`);
    },
  };
  function labelIntent(): void {
    let raw: string | null = null; try { raw = sessionStorage.getItem(LABEL_INTENT); } catch { return; }
    if (!raw || !pickerAvailable(document)) return;
    try {
      const intent = JSON.parse(raw) as { key: string; label: string; members: string[] }; const scope = current();
      sessionStorage.removeItem(LABEL_INTENT); if (!scope || intent.key !== scope.path) return;
      const statusNode = node('span', 'ddx-status'); statusNode.setAttribute('role', 'status'); document.body.append(statusNode);
      stopLabelObservation?.(); const stop = labelHandoff(intent.label, intent.members, statusNode, document);
      stopLabelObservation = () => { stop(); statusNode.remove(); };
      setTimeout(() => { stopLabelObservation?.(); stopLabelObservation = undefined; }, 20_000);
    } catch { /* Malformed intent is dropped. */ }
  }
  function restoreNatives(): void { for (const native of natives) native.classList.remove('ddx-native-hidden', 'ddx-native-faint', 'ddx-native-leaving'); natives.clear(); }
  function clear(): void {
    for (const item of mounted.values()) item.cleanup(); mounted.clear(); popover.close(false); status?.remove(); status = undefined; restoreNatives();
  }
  function showStatus(message: string, retry: () => void): void {
    status ??= node('div', 'ddx-status ddx-status-fallback'); status.setAttribute('role', 'status'); status.setAttribute('data-diffdevil', '');
    if (status.dataset.message !== message) {
      status.dataset.message = message; status.replaceChildren(node('span', 'ddx-status-mark', '×'), node('span', 'ddx-status-text', message), button('Retry', retry, 'ddx-small'));
    }
    if (!status.isConnected) document.body.append(status);
  }
  /** Native is replaced (hidden) or demoted (faint) by ours in the same row; while loading and after failure it stays at full strength. */
  function demote(native: NativeStat): void {
    const faint = settings['display.nativeChurn'] === 'faint';
    for (const element of native.nodes) {
      natives.add(element);
      if (faint) { element.classList.remove('ddx-native-hidden', 'ddx-native-leaving'); element.classList.add('ddx-native-faint'); continue; }
      if (element.classList.contains('ddx-native-hidden')) continue;
      if (reduced()) { element.classList.add('ddx-native-hidden'); continue; }
      element.classList.add('ddx-native-leaving');
      setTimeout(() => { if (element.classList.contains('ddx-native-leaving')) { element.classList.remove('ddx-native-leaving'); element.classList.add('ddx-native-hidden'); } }, 100);
    }
  }
  function seat(native: NativeStat, item: Projection, replace: boolean): void {
    mounted.set(native.anchor, item);
    if (!reduced()) { item.root.classList.add('ddx-entering'); requestAnimationFrame(() => item.root.classList.remove('ddx-entering')); }
    native.anchor.insertAdjacentElement('beforebegin', item.root);
    if (replace) demote(native); else for (const element of native.nodes) { natives.add(element); element.classList.remove('ddx-native-hidden', 'ddx-native-faint', 'ddx-native-leaving'); }
  }
  function schedule(): void { if (stopped || renderQueued) return; renderQueued = true; queueMicrotask(() => { renderQueued = false; render(); }); }
  function render(): void {
    if (stopped) return;
    popover.reconcile();
    for (const [anchor, item] of mounted) if (!anchor.isConnected || !item.root.isConnected || !fullFilesView(href()) && item.root.dataset.ddx === 'file') { item.cleanup(); mounted.delete(anchor); }
    if (!settings['display.enabled']) return;
    const aggregate = aggregateNative(document);
    if (failure && !packet) {
      if (aggregate) { status?.remove(); status = undefined; if (!mounted.has(aggregate.anchor)) seat(aggregate, failureMarker(failure, popover, actions, actions.retry), false); }
      else showStatus(`diffdevil could not read this comparison. ${failure.message} (${failure.code})`, actions.retry);
      return;
    }
    if (!packet || acquiring) return;
    const context = { settings, popover, document, actions };
    if (aggregate) { if (!fileError) { status?.remove(); status = undefined; } if (!mounted.has(aggregate.anchor)) seat(aggregate, projection(packet.view, 'aggregate', context), true); else demote(aggregate); }
    else if (!fileError) showStatus('diffdevil could not find GitHub’s pull-request summary on this page. Changed is not shown.', () => { if (packet && !fileError) schedule(); else void refresh(true); });
    const toolbar = toolbarNative(document, aggregate?.anchor);
    if (toolbar && !mounted.has(toolbar.anchor)) seat(toolbar, projection(packet.view, 'toolbar', context), true);
    if (fullFilesView(href())) for (const header of document.querySelectorAll<HTMLElement>(FILE_HEADERS)) {
      const native = fileNative(header); if (!native || mounted.has(native.anchor)) continue;
      const path = filePath(header); if (!path) continue; const view = fileViews.get(path);
      if (view) { seat(native, projection(view, 'file', context), view.focus?.included !== false); if (view.focus?.included === false) { for (const element of native.nodes) { natives.add(element); element.classList.add('ddx-native-faint'); } } }
      else if (!failed.has(path) && packet.files.some(file => file.path === path || file.oldPath === path)) waiting.add(path);
    }
    if (waiting.size && !fileBusy) void renderFiles();
    labelIntent();
  }
  async function renderFiles(): Promise<void> {
    if (!packet || fileBusy) return; fileBusy = true; const revision = generation; const paths = [...waiting].slice(0, 24); paths.forEach(path => waiting.delete(path));
    try {
      const result = await request<Record<string, HumanReportView>>({ type: 'analysis.files', key: packet.key, paths }); if (revision !== generation) return;
      for (const [path, view] of Object.entries(result)) fileViews.set(path, view); for (const path of paths) if (!Object.hasOwn(result, path)) failed.add(path);
    } catch (error) {
      if (revision !== generation) return;
      if ((error as { code?: string }).code === 'CONTEXT_EXPIRED') { void refresh(true); return; }
      paths.forEach(path => failed.add(path)); fileError = true; const code = (error as { code?: string }).code ?? 'FILE_PROJECTION';
      showStatus(`File Changed is unavailable. ${error instanceof Error ? error.message : 'File evidence is unavailable.'} (${code})`, () => { void refresh(true); });
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
    const scope = current();
    if (!scope) { generation++; controller?.abort(); clear(); packet = undefined; failure = undefined; activeRoute = ''; acquiring = false; observer?.disconnect(); observedRoot = undefined; return; }
    observe(); const key = `${scope.repository.toLowerCase()}#${scope.pullRequest}`; const identity = pageComparison(document, scope); const identityKey = `${key}:${identity?.base ?? '?'}:${identity?.head ?? '?'}`;
    if (!force && failedIdentity === identityKey) return;
    if (!force && packet && activeRoute === key && identity && sameComparison(packet.comparison, identity)) { schedule(); return; }
    if (!force && acquiring && activeRoute === key && (!identity || identityInFlight === identityKey)) return;
    const revision = ++generation; controller?.abort(); const signal = (controller = new AbortController()).signal;
    // The head advanced on the same pull request: keep the previous result visible
    // and labelled with the new short SHA instead of blanking the seat between heads.
    const moved = Boolean(packet && activeRoute === key && identity && !sameComparison(packet.comparison, identity));
    acquiring = true; activeRoute = key; identityInFlight = identityKey; fileError = false; failure = undefined;
    if (moved) { popover.close(false); for (const item of mounted.values()) item.stale(identity!.head); } else clear();
    try {
      settings = await request<Settings>({ type: 'settings.get' }); if (revision !== generation) return;
      if (!settings['display.enabled']) { packet = undefined; clear(); return; }
      const result = await acquire(scope, document, signal);
      if (revision !== generation || signal.aborted || !current()) return;
      clear(); fileViews.clear(); waiting.clear(); failed.clear();
      packet = result.packet; settings = result.settings; failedIdentity = '';
    } catch (error) {
      if (revision !== generation || signal.aborted) return;
      clear(); fileViews.clear(); waiting.clear(); failed.clear();
      packet = undefined; failedIdentity = identityKey;
      failure = { code: (error as { code?: string }).code ?? 'ACQUISITION_FAILED', message: error instanceof Error ? error.message : 'Source is unavailable.' };
      console.error('[diffdevil] acquisition failed', failure);
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
    stopped = true; generation++; controller?.abort(); lifecycle.abort(); observer?.disconnect(); rootWatcher.disconnect(); themeWatcher.disconnect(); chrome.storage.onChanged.removeListener(changed); stopLabelObservation?.(); clear();
  } };
}
