// SPDX-License-Identifier: AGPL-3.0-only
import { analyzeBrowserInput, comparisonKey, compileBrowserPolicy, formatReport, humanReport, readComparison, requiredTemplates, BROWSER_ADAPTER, HUMAN_VIEW_VERSION, SEMANTICS, type BrowserPolicy, type Report, type Diagnostic, type HumanReportView, type BrowserComparison } from '@wolfsblvt/diffdevil/browser';
import { Preferences } from './preferences.js';
import { AnalysisCache } from './cache.js';
import { PublicSource } from './public-source.js';
import { authorize } from './authorization.js';
import { operationDiagnostic } from './diagnostic.js';
import { bytes, decorateView, selectedPolicy } from '../shared/settings.js';
import { advancedChanges, type Settings } from '../shared/catalogue.js';
import { ExtensionError } from '../shared/errors.js';
import type { AnalysisInput, Diagnostics, Message, Packet, PolicySource } from '../shared/protocol.js';
declare const __ENGINE_VERSION__: string;
const preferences = new Preferences(chrome.storage); const cache = new AnalysisCache(indexedDB); const provider = new PublicSource();
interface Cached { report: Report; at: number }
interface Context { packet: Packet; report: Report; policy?: BrowserPolicy; settings: Settings; files: Map<string, HumanReportView> }
const contexts = new Map<string, Context>();
const inFlight = new Map<string, Promise<Packet>>();
const reportKey = (comparison: BrowserComparison): string => `report:${comparisonKey(comparison)}:${__ENGINE_VERSION__}:${SEMANTICS.replacementLines}`;
const policyKey = (comparison: BrowserComparison): string => `policy:${comparison.host}/${comparison.repository.toLowerCase()}@${comparison.base}/.diffdevil.yml`;
const errorDiagnostic = (code: string, message: string): Diagnostic => ({ code, message, severity: 'error', phase: 'config' });
async function recordError(error: unknown, phase = 'background', sender?: chrome.runtime.Sender): Promise<void> {
  const diagnostic = operationDiagnostic(error, phase, sender);
  console.error('diffdevil extension operation failed', diagnostic);
  const state = await chrome.storage.local.get('diagnosticCodes'); const previous = Array.isArray(state.diagnosticCodes) ? state.diagnosticCodes : [];
  await chrome.storage.local.set({ diagnosticCodes: [...previous.slice(-19), diagnostic] });
}
async function optionalCache<T>(operation: () => Promise<T>): Promise<T | undefined> {
  try { return await operation(); } catch { await recordError(new ExtensionError('CACHE_UNAVAILABLE', 'Rebuildable cache unavailable.')); return undefined; }
}
async function analyze(input: AnalysisInput, settings: Settings): Promise<Packet> {
  const comparison = readComparison(input.comparison); const generation = cache.generation;
  await optionalCache(() => cache.configure(Number(settings['cache.maximumSize'])));
  const rawKey = reportKey(comparison); const cached = await optionalCache(() => cache.get<Cached>(rawKey)); let report = cached?.report;
  if (!report) {
    if (!input.acquisition) throw new ExtensionError('CACHE_MISS', 'Source is required for this uncached comparison.');
    if (comparisonKey(input.acquisition.comparison) !== comparisonKey(comparison)) throw new ExtensionError('SOURCE_IDENTITY', 'The source does not match the requested comparison.');
    const result = analyzeBrowserInput(JSON.stringify(input.acquisition));
    if (!result.ok) throw new ExtensionError(result.diagnostics[0]?.code ?? 'SOURCE_INVALID', result.diagnostics.map(item => item.message).join('\n'));
    report = result.value;
    const saved: Cached = { report, at: Date.now() };
    await optionalCache(() => cache.put(rawKey, 'report', saved, generation));
  }
  if (!input.policy || !['present', 'absent', 'unavailable'].includes(input.policy.status) || input.policy.status === 'present' && typeof input.policy.text !== 'string') throw new ExtensionError('POLICY_EVIDENCE', 'Policy acquisition standing is invalid.');
  const selected = selectedPolicy(settings, comparison.repository); let policy: BrowserPolicy | undefined; let errors: readonly Diagnostic[] = [];
  if (selected.mode !== 'personal-only' && input.policy.status === 'unavailable') errors = [errorDiagnostic('REPOSITORY_POLICY_UNAVAILABLE', 'The exact base policy could not be read. Facts remain visible. Select Personal only explicitly to classify without repository policy.')];
  else {
    const result = compileBrowserPolicy(JSON.stringify({ ...selected, ...(input.policy.status === 'present' ? { repository: input.policy.text } : {}), ...(input.templates ? { templateFiles: input.templates } : {}) }));
    if (result.ok) policy = result.value; else errors = result.diagnostics;
  }
  if (input.policy.status !== 'unavailable') await optionalCache(() => cache.put(policyKey(comparison), 'policy', input.policy, generation));
  const projection = humanReport(report, policy, undefined, errors);
  if (!projection.ok) throw new ExtensionError('REPORT_VIEW', projection.diagnostics.map(item => item.message).join('\n'));
  const invalidDigest = policy ? policy.digest : Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify([selected, errors])))), byte => byte.toString(16).padStart(2, '0')).join('');
  const key = `${rawKey}:${invalidDigest}`;
  const packet: Packet = { key, comparison, view: decorateView(projection.value, settings), files: report.files.map(file => ({ path: file.path, ...(file.oldPath === undefined ? {} : { oldPath: file.oldPath }) })), refreshedAt: cached?.at ?? Date.now(), cached: Boolean(cached) };
  if (generation === cache.generation) {
    contexts.delete(key); contexts.set(key, { packet, report, ...(policy ? { policy } : {}), settings, files: new Map() });
    while (contexts.size > 6) contexts.delete(contexts.keys().next().value!);
    await chrome.storage.session.set({ lastComparison: { ...comparison, at: packet.refreshedAt } });
  }
  return packet;
}
async function diagnostics(): Promise<Diagnostics> {
  const [info, localBytes, syncBytes, errors, last] = await Promise.all([cache.summary(), chrome.storage.local.getBytesInUse(null), chrome.storage.sync.getBytesInUse(null), chrome.storage.local.get('diagnosticCodes'), chrome.storage.session.get('lastComparison')]);
  return { version: chrome.runtime.getManifest().version, engine: __ENGINE_VERSION__, schema: '1.0', measurement: SEMANTICS.replacementLines, presenter: HUMAN_VIEW_VERSION, cache: info, localBytes, syncBytes,
    errors: Array.isArray(errors.diagnosticCodes) ? errors.diagnosticCodes as Diagnostics['errors'] : [], ...(last.lastComparison ? { last: last.lastComparison as NonNullable<Diagnostics['last']> } : {}) };
}
async function handle(message: Message, sender: chrome.runtime.Sender): Promise<unknown> {
  const scope = authorize(sender, message, chrome.runtime.id);
  switch (message.type) {
    case 'settings.get': return preferences.load();
    case 'settings.save': { const result = await preferences.save(message.patch, message.replace === true); contexts.clear(); await optionalCache(() => cache.configure(Number(result['cache.maximumSize']))); return result; }
    case 'policy.templates': { const result = requiredTemplates(JSON.stringify(message.layers)); return result.ok ? result.value.slice(0, 16) : []; }
    case 'source.public': return provider.pull(message.repository, message.pullRequest, message.files === true);
    case 'source.policy': return provider.policy(message.repository, message.base, message.path);
    case 'cache.lookup': {
      const comparison = readComparison(message.comparison); const settings = await preferences.load();
      const [report, policy] = await Promise.all([optionalCache(() => cache.get<Cached>(reportKey(comparison))), optionalCache(() => cache.get<PolicySource>(policyKey(comparison)))]);
      return { settings, selected: selectedPolicy(settings, comparison.repository), reportCached: Boolean(report), ...(policy ? { policy } : {}) };
    }
    case 'analysis.run': {
      const settings = await preferences.load();
      // Coalesce identical inputs only; a different personal policy must never join.
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify([message.input, settings])));
      const key = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
      const existing = inFlight.get(key); if (existing) return existing;
      if (inFlight.size >= 3) throw new ExtensionError('ANALYSIS_BUSY', 'Three analyses are already active. Retry when one completes.');
      const operation = analyze(message.input, settings).finally(() => { inFlight.delete(key); }); inFlight.set(key, operation); return operation;
    }
    case 'analysis.files': {
      if (!Array.isArray(message.paths) || message.paths.length > 24 || message.paths.some(path => typeof path !== 'string' || path.length > 4096)) throw new ExtensionError('FILE_LIMIT', 'Request at most 24 visible files.');
      const context = contexts.get(message.key); if (!context) throw new ExtensionError('CONTEXT_EXPIRED', 'The analysis context was evicted or the worker restarted. Refresh the report.');
      if (!scope.options && (context.packet.comparison.repository.toLowerCase() !== scope.repository || context.packet.comparison.pullRequest !== scope.pullRequest)) throw new ExtensionError('SENDER_SCOPE', 'This report belongs to a different pull request.');
      const result: Record<string, HumanReportView> = Object.create(null) as Record<string, HumanReportView>;
      for (const path of message.paths) {
        const file = context.report.files.find(file => file.path === path || file.oldPath === path); if (!file) continue;
        let view = context.files.get(file.path);
        if (!view) {
          const projection = humanReport(context.report, context.policy, file.path, context.packet.view.errors);
          if (!projection.ok) throw new ExtensionError('FILE_VIEW', projection.diagnostics.map(item => item.message).join('\n'));
          view = decorateView(projection.value, context.settings); context.files.set(file.path, view);
          // Visible files are cheap to rebuild; retain at most 150 projections.
          while (context.files.size > 150) context.files.delete(context.files.keys().next().value!);
        }
        result[path] = view;
      }
      return result;
    }
    case 'report.text': {
      // "Copy facts" writes the exact text the CLI prints for the same scope.
      const context = contexts.get(message.key); if (!context) throw new ExtensionError('CONTEXT_EXPIRED', 'The analysis context was evicted or the worker restarted. Refresh the report.');
      if (!scope.options && (context.packet.comparison.repository.toLowerCase() !== scope.repository || context.packet.comparison.pullRequest !== scope.pullRequest)) throw new ExtensionError('SENDER_SCOPE', 'This report belongs to a different pull request.');
      let view = context.packet.view;
      if (message.path !== undefined) {
        if (typeof message.path !== 'string' || message.path.length > 4096) throw new ExtensionError('FILE_LIMIT', 'Request one file path.');
        const projection = humanReport(context.report, context.policy, message.path, context.packet.view.errors);
        if (!projection.ok) throw new ExtensionError('FILE_VIEW', projection.diagnostics.map(item => item.message).join('\n'));
        view = projection.value;
      }
      const rendered = formatReport(view.report, 'human', { color: false });
      if (!rendered.ok) throw new ExtensionError('REPORT_TEXT', rendered.diagnostics.map(item => item.message).join('\n'));
      return rendered.value.stdout;
    }
    case 'diagnostics.get': return diagnostics();
    case 'options.open': await chrome.runtime.openOptionsPage(); return null;
    case 'data.action': {
      if (['data.clearRepositoryOverrides', 'data.resetAll'].includes(message.action) && message.confirmed !== true) throw new ExtensionError('CONFIRMATION_REQUIRED', 'Confirm this destructive operation in Settings.');
      switch (message.action) {
        case 'data.clearAnalysisCache': await cache.clear('report'); contexts.clear(); break;
        case 'data.clearPolicyCache': await cache.clear('policy'); contexts.clear(); break;
        case 'data.clearRepositoryOverrides': await preferences.save({ 'policy.repositoryOverrides': '{}' }); contexts.clear(); break;
        case 'data.resetAll': await cache.clear(); contexts.clear(); await preferences.reset(); break;
        case 'diagnostics.copySupportSnapshot': {
          const [info, settings] = await Promise.all([diagnostics(), preferences.load()]); const { last, ...safeInfo } = info;
          return { kind: 'diffdevil.support/1', ...safeInfo, adapter: BROWSER_ADAPTER, sourcePresent: Boolean(last), advancedActive: advancedChanges(settings).map(item => item.id),
            settings: Object.fromEntries(Object.entries(settings).map(([id, value]) => [id, id.startsWith('policy.') && !['policy.mode', 'policy.preset', 'policy.primaryMetric'].includes(id) ? { redacted: true, bytes: bytes(value) } : value])) };
        }
        default: throw new ExtensionError('UNKNOWN_ACTION', 'Unknown data-management action.');
      }
      return diagnostics();
    }
    default: throw new ExtensionError('UNKNOWN_REQUEST', 'Unsupported extension request.');
  }
}
chrome.runtime.onMessage.addListener((input, sender, reply) => {
  if (!input || typeof input !== 'object' || typeof (input as Record<string, unknown>).type !== 'string') { reply({ ok: false, code: 'INVALID_REQUEST', message: 'Invalid extension request.' }); return; }
  void (async () => {
    try {
      if (bytes(input) > 24 * 1024 * 1024) throw new ExtensionError('MESSAGE_LIMIT', 'The request exceeds 24 MiB.');
      reply({ ok: true, value: await handle(input as Message, sender) });
    } catch (error) {
      await recordError(error, (input as Message).type, sender).catch(() => undefined);
      reply({ ok: false, code: error instanceof ExtensionError ? error.code : 'EXTENSION_OPERATION', message: error instanceof Error ? error.message : 'The extension operation failed.' });
    }
  })(); return true;
});
// Restrict direct storage access on every worker start as well as installation.
for (const area of [chrome.storage.local, chrome.storage.sync, chrome.storage.session]) void area.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' }).catch(error => { void recordError(error).catch(() => undefined); });
chrome.action.onClicked.addListener(() => { void chrome.runtime.openOptionsPage(); });
