// SPDX-License-Identifier: AGPL-3.0-only
import type { BrowserComparison, HumanReportView } from '@wolfsblvt/diffdevil/browser';
import type { Settings } from '../shared/catalogue.js';
import { request as defaultRequest, type MeasureVia, type Packet, type PacketFile } from '../shared/protocol.js';
import { SETTINGS_KEY } from '../shared/settings-key.js';
import { isPaused } from '../shared/repository.js';
import { automaticRemaining, selectFiles } from '../shared/coverage.js';
import { node, button } from '../shared/dom.js';
import { acquire as defaultAcquire, automaticLimit, type Standing } from './acquire.js';
import { measure as defaultMeasure } from './measure.js';
import { route, aggregateNative, toolbarNative, fileNative, treeCounters, pathAnchors, FILE_HEADERS, PROVIDER_CHANGE, filePath, pageComparison, sameComparison, fullFilesView, visiblePaths, viewportPaths, type NativeStat } from './github.js';
import { projection, failureMarker, readingMarker, pausedMarker, type Projection } from './render.js';
import { errorPanel, type Attempt, type Progress, type Provenance, type ReportActions } from './report.js';
import { labelHandoff, pickerAvailable } from './labels.js';
import { Popover } from './popover.js';
/** Dependencies are explicit so lifecycle tests never need to impersonate a browser origin. */
export interface ContentDependencies { readonly href?: () => string; readonly acquire?: typeof defaultAcquire; readonly request?: typeof defaultRequest; readonly measure?: typeof defaultMeasure }
interface Failure { code: string; message: string }
/** Mounted views need only a root and their lifecycle; the reading marker has no trigger. */
type MountedView = Pick<Projection, 'root' | 'stale' | 'standing' | 'update' | 'cleanup'>;
/** A read this short never shows its marker: a cached or public result would otherwise flash it on every page. */
const READING_DELAY_MS = 800;
/** Scrolling settles before files the reader has landed on are measured. */
const VISIBLE_SETTLE_MS = 350;
/** One explicit pass is measured in slices, so every slice is already persisted if the pass is interrupted. */
const CONTINUATION_SLICE = 48;
const VISIBLE_BATCH = 24;
const LABEL_INTENT = 'diffdevil.labelIntent';
/** Two slices of one pass, as one outcome. */
function joinAttempts(a: Attempt, b: Attempt): Attempt {
  const unresolved = { ...a.unresolved }; for (const [reason, count] of Object.entries(b.unresolved) as [keyof Attempt['unresolved'], number][]) unresolved[reason] = (unresolved[reason] ?? 0) + count;
  return { asked: a.asked + b.asked, measured: a.measured + b.measured, declined: a.declined + b.declined, unresolved, changed: a.changed || b.changed };
}
const reduced = (): boolean => matchMedia('(prefers-reduced-motion: reduce)').matches;
export function startContent(dependencies: ContentDependencies = {}): { refresh: () => Promise<void>; stop: () => void } {
  const href = dependencies.href ?? (() => location.href);
  const acquire = dependencies.acquire ?? defaultAcquire;
  const request = dependencies.request ?? defaultRequest;
  const measure = dependencies.measure ?? defaultMeasure;
  const lifecycle = new AbortController(); let stopped = false;
  const popover = new Popover(); const mounted = new Map<HTMLElement, MountedView>(); const natives = new Set<HTMLElement>();
  const fileViews = new Map<string, HumanReportView>(); const waiting = new Set<string>(); const failed = new Set<string>();
  /** Every seat a file has, so a file that gains evidence updates in place. */
  const fileSeats = new Map<string, Set<MountedView>>();
  // Settings arrive from the worker before anything is drawn; the catalogue (and its descriptions) stays out of the page.
  let settings: Settings = {}; let packet: Packet | undefined; let controller: AbortController | undefined;
  let generation = 0; let acquiringSince = 0; let readingTimer: ReturnType<typeof setTimeout> | undefined; let activeRoute = ''; let identityInFlight = ''; let failedIdentity = ''; let acquiring = false; let fileBusy = false; let renderQueued = false;
  let status: HTMLElement | undefined; let fileError = false; let failure: Failure | undefined; let observedRoot: Element | undefined; let observer: MutationObserver | undefined;
  let stopLabelObservation: (() => void) | undefined;
  // Provenance: where the facts on screen came from and whether GitHub has confirmed them since.
  let provenance: Provenance = 'live'; let paused = false; let verifyAgain: (() => Promise<Standing>) | undefined;
  // Measurement: one operation at a time, never more files per comparison than the configured automatic limit without an explicit act.
  let index = new Map<string, PacketFile>(); let measuring = false; let settleTimer: ReturnType<typeof setTimeout> | undefined; let attempted = new Set<string>(); let filled = '';
  let continuation: AbortController | undefined; let progress: Progress | undefined; let note: string | undefined;
  // What the last explicit pass changed, so finishing one is never mistaken for a silent no-op; and the files the reader asked about again.
  let lastPass: Attempt | undefined; const askedAgain = new Set<string>();
  // GitHub anchors a file as `diff-` + SHA-256(path). Hashing the packet's own
  // paths binds a tree counter to its file without trusting hashed class names.
  let hashes = new Map<string, string>(); let hashing: string | undefined;
  const knownPath = (path: string): boolean => Boolean(packet?.files.some(file => file.path === path || file.oldPath === path));
  async function hashPaths(): Promise<void> {
    if (!packet || hashing === packet.key) return; hashing = packet.key; const key = packet.key;
    const anchors = await pathAnchors(packet.files.map(file => file.path));
    if (stopped || packet?.key !== key) return;
    hashes = anchors; if (anchors.size) schedule();
  }
  const own = (node: Node): boolean => node instanceof Element && Boolean(node.closest('[data-diffdevil], .ddx-root, .ddx-popover-host, .ddx-status'));
  const current = (): { repository: string; pullRequest: number; path: string } | undefined => route(href());
  const adoptIndex = (next: Packet): void => { index = new Map(next.files.map(file => [file.path, file])); };
  /** The packet is replaced by one with more evidence: aggregate seats and the seats of files that changed update where they stand. */
  function adopt(next: Packet): void {
    const before = index; adoptIndex(next); packet = next;
    for (const item of mounted.values()) if (item.root.dataset.ddx === 'aggregate' || item.root.dataset.ddx === 'toolbar') item.update(next.view);
    // Only files on screen need a new view now; the others are projected when they are first seated.
    for (const file of next.files) if (before.get(file.path)?.standing !== file.standing) { fileViews.delete(file.path); failed.delete(file.path); if (fileSeats.has(file.path)) waiting.add(file.path); }
    schedule();
  }
  const setProvenance = (state: Provenance): void => { provenance = state; for (const item of mounted.values()) item.standing(state); popover.rebuild(); };
  async function setPause(flag: boolean): Promise<void> {
    const scope = current(); if (!scope) return;
    try { await request<{ paused: boolean }>({ type: 'repository.pause', repository: scope.repository, paused: flag }); } catch (error) { console.error('[diffdevil] pause failed', error); return; }
    void refresh(true);
  }
  const actions: ReportActions = {
    copyText: async path => { if (!packet) throw new Error('No analysis is available.'); return request<string>({ type: 'report.text', key: packet.key, comparison: packet.comparison, ...(path === undefined ? {} : { path }) }); },
    retry: () => { void refresh(true); },
    settingsUrl: chrome.runtime.getURL('options.html'),
    dataUrl: chrome.runtime.getURL('options.html#data.controls'),
    provenance: () => provenance,
    coverage: { summary: () => packet?.coverage, progress: () => progress, start: () => startContinuation(), cancel: () => continuation?.abort(), note: () => note, outcome: () => lastPass, remaining: () => continuable().length },
    fileStanding: path => { const file = index.get(path); return file && { standing: file.standing, ...(file.reason ? { reason: file.reason } : {}), ...(file.unresolved ? { unresolved: file.unresolved } : {}), ...(askedAgain.has(path) ? { askedAgain: true } : {}) }; },
    measureFile: path => { void measureNow('explicit', [path]).then(attempt => { if (attempt && !attempt.measured && !attempt.declined) { askedAgain.add(path); popover.rebuild(); } }); },
    pause: () => { void setPause(true); },
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
    for (const item of mounted.values()) item.cleanup(); mounted.clear(); fileSeats.clear(); popover.close(false); status?.remove(); status = undefined; restoreNatives();
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
  function seat(native: NativeStat, item: MountedView, replace: boolean): void {
    mounted.set(native.anchor, item);
    if (!reduced()) { item.root.classList.add('ddx-entering'); requestAnimationFrame(() => item.root.classList.remove('ddx-entering')); }
    native.anchor.insertAdjacentElement('beforebegin', item.root);
    if (replace) demote(native); else for (const element of native.nodes) { natives.add(element); element.classList.remove('ddx-native-hidden', 'ddx-native-faint', 'ddx-native-leaving'); }
  }
  function schedule(): void { if (stopped || renderQueued) return; renderQueued = true; queueMicrotask(() => { renderQueued = false; render(); }); }
  /** While a read is under way GitHub's counts stay at full strength and the seat says so, once the read is no longer instant. */
  function reading(aggregate: NativeStat | undefined): void {
    if (!aggregate || mounted.has(aggregate.anchor)) return;
    const wait = READING_DELAY_MS - (Date.now() - acquiringSince);
    if (wait > 0) { readingTimer ??= setTimeout(() => { readingTimer = undefined; schedule(); }, wait); return; }
    seat(aggregate, readingMarker(), false);
  }
  function render(): void {
    if (stopped) return;
    popover.reconcile();
    for (const [anchor, item] of mounted) if (!anchor.isConnected || !item.root.isConnected || !fullFilesView(href()) && item.root.dataset.ddx === 'file') { item.cleanup(); mounted.delete(anchor); }
    if (!settings['display.enabled']) return;
    const aggregate = aggregateNative(document);
    // A paused repository gets one muted line in the aggregate seat; GitHub's own counters are untouched.
    if (paused) { if (aggregate && !mounted.has(aggregate.anchor)) seat(aggregate, pausedMarker(() => { void setPause(false); }), false); return; }
    if (failure && !packet) {
      if (aggregate) { status?.remove(); status = undefined; if (!mounted.has(aggregate.anchor)) seat(aggregate, failureMarker(failure, popover, actions, actions.retry), false); }
      else showStatus(`diffdevil could not read this comparison. ${failure.message} (${failure.code})`, actions.retry);
      return;
    }
    if (!packet && acquiring) { reading(aggregate); return; }
    if (!packet || acquiring) return;
    const context = { settings, popover, document, actions };
    if (aggregate) { if (!fileError) { status?.remove(); status = undefined; } if (!mounted.has(aggregate.anchor)) seat(aggregate, projection(packet.view, 'aggregate', context), true); else demote(aggregate); }
    else if (!fileError) showStatus('diffdevil could not find GitHub’s pull-request summary on this page. Changed is not shown.', () => { if (packet && !fileError) schedule(); else void refresh(true); });
    const toolbar = toolbarNative(document, aggregate?.anchor);
    if (toolbar && !mounted.has(toolbar.anchor)) seat(toolbar, projection(packet.view, 'toolbar', context), true);
    const fileSeat = (native: NativeStat, path: string, tree: boolean): void => {
      const view = fileViews.get(path);
      if (view) {
        const item = projection(view, 'file', context); if (tree) item.root.dataset.ddx = 'tree';
        seat(native, item, view.focus?.included !== false);
        const seats = fileSeats.get(path) ?? new Set<MountedView>(); seats.add(item); fileSeats.set(path, seats);
        if (view.focus?.included === false) for (const element of native.nodes) { natives.add(element); element.classList.add('ddx-native-faint'); }
      } else if (!failed.has(path) && knownPath(path)) waiting.add(path);
    };
    if (fullFilesView(href())) {
      for (const header of document.querySelectorAll<HTMLElement>(FILE_HEADERS)) {
        const native = fileNative(header); if (!native || mounted.has(native.anchor)) continue;
        const path = filePath(header); if (path) fileSeat(native, path, false);
      }
      // The file tree's per-file counters receive the same F treatment (grammar §8).
      if (hashing !== packet.key) void hashPaths();
      for (const counter of treeCounters(document, knownPath)) {
        if (mounted.has(counter.native.anchor)) continue;
        const path = counter.path ?? counter.hashes.map(hash => hashes.get(hash)).find(value => value !== undefined);
        if (path) fileSeat(counter.native, path, true);
      }
    }
    if (waiting.size && !fileBusy) void renderFiles();
    labelIntent(); scheduleVisible();
  }
  async function renderFiles(): Promise<void> {
    if (!packet || fileBusy) return; fileBusy = true; const revision = generation; const paths = [...waiting].slice(0, 24); paths.forEach(path => waiting.delete(path));
    try {
      const result = await request<Record<string, HumanReportView>>({ type: 'analysis.files', key: packet.key, comparison: packet.comparison, paths }); if (revision !== generation) return;
      for (const [path, view] of Object.entries(result)) {
        fileViews.set(path, view);
        // A file that already has seats gained evidence: they update where they stand, and an open report stays open.
        for (const item of fileSeats.get(path) ?? []) { if (item.root.isConnected) item.update(view); }
      }
      for (const path of paths) if (!Object.hasOwn(result, path)) failed.add(path);
    } catch (error) {
      if (revision !== generation) return;
      if ((error as { code?: string }).code === 'CONTEXT_EXPIRED') { void refresh(true); return; }
      if ((error as { code?: string }).code === 'REPOSITORY_PAUSED') { void refresh(true); return; }
      paths.forEach(path => failed.add(path)); fileError = true; const code = (error as { code?: string }).code ?? 'FILE_PROJECTION';
      showStatus(`File Changed is unavailable. ${error instanceof Error ? error.message : 'File evidence is unavailable.'} (${code})`, () => { void refresh(true); });
    } finally { fileBusy = false; schedule(); }
  }
  /**
   * Measure files in the order given, through the worker that owns the report. A result with new
   * evidence replaces the packet; an identical one is not adopted, so nothing redraws as though it
   * had progressed. Resolves to what changed for the asked files, or undefined when the work stopped. Never throws.
   */
  async function measureNow(via: MeasureVia, paths: readonly string[], signal: AbortSignal = lifecycle.signal): Promise<Attempt | undefined> {
    const scope = current(); if (!scope || !packet || !paths.length || stopped) return undefined;
    const revision = generation; const base = packet; measuring = true;
    try {
      const next = await measure(scope, base, paths, via, signal); if (revision !== generation || signal.aborted) return undefined;
      const attempt = compare(base, next, paths);
      if (attempt.changed) adopt(next);
      return attempt;
    } catch (error) {
      if (signal.aborted || revision !== generation) return undefined;
      const code = (error as { code?: string }).code ?? 'MEASURE_FAILED'; console.info('[diffdevil] measurement stopped', { via, code });
      // GitHub now names another comparison: these facts are no longer current, so they are read again rather than extended.
      if (code === 'COMPARISON_MOVED') {
        const observed = (error as { observed?: BrowserComparison }).observed; measuring = false; continuation?.abort();
        void settle(revision, controller?.signal ?? lifecycle.signal, { standing: 'moved', ...(observed ? { observed } : {}) }, scope); return undefined;
      }
      note = error instanceof Error ? error.message : 'GitHub did not supply the files.';
      return undefined;
    } finally { measuring = false; schedule(); popover.rebuild(); }
  }
  /** What a measurement did for the files it asked about, judged from the packets before and after. */
  function compare(before: Packet, after: Packet, paths: readonly string[]): Attempt {
    const old = new Map(before.files.map(file => [file.path, file])); const now = new Map(after.files.map(file => [file.path, file]));
    let measured = 0; let declined = 0; const unresolved: Attempt['unresolved'] = {};
    for (const path of paths) {
      const was = old.get(path); const is = now.get(path); if (!is) continue;
      if (is.standing === 'measured') { if (was?.standing !== 'measured') measured++; }
      else if (is.standing === 'declined') { if (was?.standing !== 'declined') declined++; }
      else { const reason = is.unresolved ?? 'not-returned'; unresolved[reason] = (unresolved[reason] ?? 0) + 1; }
    }
    const changed = after.key !== before.key || JSON.stringify(after.coverage) !== JSON.stringify(before.coverage) || JSON.stringify(after.files) !== JSON.stringify(before.files);
    return { asked: paths.length, measured, declined, unresolved, changed };
  }
  /** Every bounded file: an explicit pass asks again even where the last attempt could not measure. */
  const continuable = (): string[] => packet ? packet.files.filter(file => file.standing === 'bounded').map(file => file.path) : [];
  /** Files on screen where the reader settled, outside the measured set, within what remains of the comparison's automatic budget. */
  function scheduleVisible(): void {
    if (!packet || stopped || measuring || continuation) return;
    clearTimeout(settleTimer); settleTimer = setTimeout(() => { void measureVisible(); }, VISIBLE_SETTLE_MS);
  }
  async function measureVisible(): Promise<void> {
    if (!packet || stopped || measuring || continuation || !fullFilesView(href())) return;
    const room = automaticRemaining(packet.coverage, automaticLimit(settings)); if (room <= 0) return;
    const seated = new Set([...fileSeats.entries()].filter(([, items]) => [...items].some(item => item.root.isConnected)).map(([path]) => path));
    // A file the last attempt could not measure is asked about again only by an explicit act.
    const wanted = viewportPaths(document).filter(path => seated.has(path) && index.get(path)?.standing === 'bounded' && !index.get(path)?.unresolved && !attempted.has(path)).slice(0, Math.min(room, VISIBLE_BATCH));
    if (!wanted.length) return;
    wanted.forEach(path => attempted.add(path)); await measureNow('visible', wanted);
  }
  /** The reader raised the limit since this comparison was last measured: one automatic pass spends what the higher limit adds. */
  async function fillToLimit(): Promise<void> {
    if (!packet || measuring || continuation) return; const limit = automaticLimit(settings); const room = automaticRemaining(packet.coverage, limit); const identity = `${packet.key}:${limit}`;
    if (limit <= packet.coverage.limit || room <= 0 || packet.coverage.bounded <= 0 || filled === identity) return; filled = identity;
    const bounded = packet.files.filter(file => file.standing === 'bounded' && !file.unresolved).map(file => file.path);
    const chosen = selectFiles(bounded, visiblePaths(document), room); if (chosen.length) await measureNow('automatic', chosen);
  }
  /** The one explicit continuation: every file still bounded, in slices that are each persisted before the next begins. */
  function startContinuation(): void {
    if (!packet || continuation) return; const scope = current(); if (!scope) return;
    const paths = continuable(); if (!paths.length) return;
    const control = continuation = new AbortController();
    progress = { done: 0, total: paths.length, failed: 0 }; note = undefined; lastPass = undefined; popover.rebuild();
    let total: Attempt = { asked: 0, measured: 0, declined: 0, unresolved: {}, changed: false };
    void (async () => {
      try {
        for (let at = 0; at < paths.length && !control.signal.aborted; at += CONTINUATION_SLICE) {
          const slice = paths.slice(at, at + CONTINUATION_SLICE); const attempt = await measureNow('explicit', slice, control.signal);
          if (!attempt) break;
          total = joinAttempts(total, attempt);
          progress = { done: progress!.done + slice.length, total: paths.length, failed: progress!.failed + slice.filter(path => index.get(path)?.standing === 'bounded').length }; popover.rebuild();
        }
      } finally { if (total.asked) lastPass = total; continuation = undefined; progress = undefined; popover.rebuild(); schedule(); }
    })();
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
  const reset = (): void => { clear(); fileViews.clear(); waiting.clear(); failed.clear(); attempted = new Set(); lastPass = undefined; askedAgain.clear(); };
  /** Facts shown from held data were checked against a fresh read of the same route; say what that read found. */
  async function verified(revision: number, signal: AbortSignal, verify: () => Promise<Standing>, scope: { repository: string; pullRequest: number; path: string }): Promise<void> {
    let outcome: Standing;
    try { outcome = await verify(); } catch { if (revision === generation && !signal.aborted) { verifyAgain = verify; setProvenance('unconfirmed'); } return; }
    if (revision !== generation || signal.aborted) return;
    if (outcome.standing === 'current') { verifyAgain = undefined; setProvenance('live'); return; }
    // GitHub could not be asked: the exact facts stay on screen, labelled as not confirmed, and are checked again when it is reachable.
    if (outcome.standing === 'unconfirmed') { verifyAgain = verify; setProvenance('unconfirmed'); return; }
    await settle(revision, signal, outcome, scope);
  }
  /** The comparison moved: the facts on screen are marked stale and the comparison GitHub named now is acquired. */
  async function settle(revision: number, signal: AbortSignal, outcome: Extract<Standing, { standing: 'moved' }>, scope: { repository: string; pullRequest: number; path: string }): Promise<void> {
    verifyAgain = undefined; popover.close(false); for (const item of mounted.values()) item.stale(outcome.observed?.head ?? '');
    if (!outcome.observed) { void refresh(true); return; }
    acquiring = true;
    try {
      const result = await acquire(scope, document, signal, { confirmed: outcome.observed });
      if (revision !== generation || signal.aborted || !current()) return;
      reset(); packet = result.packet; adoptIndex(result.packet); settings = result.settings; provenance = 'live';
    } catch (error) {
      if (revision !== generation || signal.aborted) return;
      reset(); packet = undefined; index = new Map();
      failure = { code: (error as { code?: string }).code ?? 'ACQUISITION_FAILED', message: error instanceof Error ? error.message : 'Source is unavailable.' };
      console.error('[diffdevil] acquisition failed', failure);
    } finally { if (revision === generation) { acquiring = false; schedule(); } }
  }
  async function refresh(force: boolean): Promise<void> {
    if (stopped) return;
    const scope = current();
    if (!scope) { generation++; controller?.abort(); continuation?.abort(); clear(); packet = undefined; index = new Map(); failure = undefined; paused = false; activeRoute = ''; acquiring = false; observer?.disconnect(); observedRoot = undefined; return; }
    observe(); const key = `${scope.repository.toLowerCase()}#${scope.pullRequest}`; const identity = pageComparison(document, scope); const identityKey = `${key}:${identity?.base ?? '?'}:${identity?.head ?? '?'}`;
    // A failure belongs to the surface it was read on: moving from Conversation to Files reads again.
    const failureKey = `${identityKey}:${fullFilesView(href()) ? 'files' : 'other'}`;
    if (!force && failedIdentity === failureKey) return;
    // A tab that cannot name its comparison (private Conversation) neither contradicts nor replaces an acquired result.
    if (!force && packet && activeRoute === key && (!identity || sameComparison(packet.comparison, identity))) { schedule(); return; }
    if (!force && acquiring && activeRoute === key && (!identity || identityInFlight === identityKey)) return;
    const revision = ++generation; controller?.abort(); continuation?.abort(); const signal = (controller = new AbortController()).signal;
    // The head advanced on the same pull request: keep the previous result visible
    // and labelled with the new short SHA instead of blanking the seat between heads.
    const moved = Boolean(packet && activeRoute === key && identity && !sameComparison(packet.comparison, identity));
    acquiring = true; acquiringSince = Date.now(); activeRoute = key; identityInFlight = identityKey; fileError = false; failure = undefined;
    if (moved) { popover.close(false); for (const item of mounted.values()) item.stale(identity!.head); } else clear();
    schedule();
    try {
      settings = await request<Settings>({ type: 'settings.get' }); if (revision !== generation) return;
      paused = isPaused(settings, scope.repository);
      if (!settings['display.enabled'] || paused) { packet = undefined; index = new Map(); reset(); return; }
      const result = await acquire(scope, document, signal);
      if (revision !== generation || signal.aborted || !current()) return;
      reset(); packet = result.packet; adoptIndex(result.packet); settings = result.settings; failedIdentity = ''; verifyAgain = result.verify; provenance = result.verify ? 'cached' : 'live';
      if (result.verify) void verified(revision, signal, result.verify, scope); void fillToLimit();
    } catch (error) {
      if (revision !== generation || signal.aborted) return;
      reset(); packet = undefined; index = new Map();
      if ((error as { code?: string }).code === 'REPOSITORY_PAUSED') { paused = true; return; }
      failedIdentity = failureKey;
      failure = { code: (error as { code?: string }).code ?? 'ACQUISITION_FAILED', message: error instanceof Error ? error.message : 'Source is unavailable.' };
      console.error('[diffdevil] acquisition failed', failure);
    } finally { if (revision === generation) { acquiring = false; schedule(); } }
  }
  let navigationQueued = false;
  const navigated = (): void => { if (navigationQueued) return; navigationQueued = true; queueMicrotask(() => { navigationQueued = false; void refresh(false); if (verifyAgain && provenance === 'unconfirmed') recheck(); }); };
  /** GitHub could not be reached the last time: ask again when the browser says it can be, and on navigation. */
  function recheck(): void {
    const verify = verifyAgain; const scope = current(); if (!verify || !scope || !packet || acquiring) return;
    void verified(generation, controller?.signal ?? lifecycle.signal, verify, scope);
  }
  window.addEventListener('online', recheck, { signal: lifecycle.signal });
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
  document.addEventListener('scroll', scheduleVisible, { capture: true, passive: true, signal: lifecycle.signal });
  void refresh(false);
  return { refresh: () => refresh(true), stop: (): void => {
    stopped = true; generation++; clearTimeout(readingTimer); clearTimeout(settleTimer); controller?.abort(); continuation?.abort(); lifecycle.abort(); observer?.disconnect(); rootWatcher.disconnect(); themeWatcher.disconnect(); chrome.storage.onChanged.removeListener(changed); stopLabelObservation?.(); clear();
  } };
}
