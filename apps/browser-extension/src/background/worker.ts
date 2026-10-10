// SPDX-License-Identifier: AGPL-3.0-only
import { readComparison, requiredTemplates, BROWSER_ADAPTER, HUMAN_VIEW_VERSION, SEMANTICS } from '@wolfsblvt/diffdevil/browser';
import { Preferences } from './preferences.js';
import { AnalysisCache } from './cache.js';
import { Analysis } from './analysis.js';
import { PublicSource } from './public-source.js';
import { authorize } from './authorization.js';
import { operationDiagnostic } from './diagnostic.js';
import { firstInstallUrl } from './first-install.js';
import { bytes, isPaused, pausedWith, repositoryKey } from '../shared/settings.js';
import { advancedChanges } from '../shared/catalogue.js';
import { ExtensionError } from '../shared/errors.js';
import { isCaughtOptionalPublicAbsence, type Diagnostics, type Message } from '../shared/protocol.js';
declare const __ENGINE_VERSION__: string;
const preferences = new Preferences(chrome.storage); const cache = new AnalysisCache(indexedDB); const provider = new PublicSource();
async function recordError(error: unknown, phase = 'background', sender?: chrome.runtime.Sender): Promise<void> {
  const diagnostic = operationDiagnostic(error, phase, sender);
  console.error('diffdevil extension operation failed', diagnostic);
  const state = await chrome.storage.local.get('diagnosticCodes'); const previous = Array.isArray(state.diagnosticCodes) ? state.diagnosticCodes : [];
  await chrome.storage.local.set({ diagnosticCodes: [...previous.slice(-19), diagnostic] });
}
const analysis = new Analysis({ cache, engine: __ENGINE_VERSION__,
  cacheFailed: () => recordError(new ExtensionError('CACHE_UNAVAILABLE', 'Rebuildable cache unavailable.')),
  remember: (comparison, at) => chrome.storage.session.set({ lastComparison: { ...comparison, at } }) });
async function diagnostics(): Promise<Diagnostics> {
  const [info, localBytes, syncBytes, errors, last] = await Promise.all([cache.summary(), chrome.storage.local.getBytesInUse(null), chrome.storage.sync.getBytesInUse(null), chrome.storage.local.get('diagnosticCodes'), chrome.storage.session.get('lastComparison')]);
  return { version: chrome.runtime.getManifest().version, engine: __ENGINE_VERSION__, schema: '1.0', measurement: SEMANTICS.replacementLines, presenter: HUMAN_VIEW_VERSION, cache: info, localBytes, syncBytes,
    errors: Array.isArray(errors.diagnosticCodes) ? errors.diagnosticCodes as Diagnostics['errors'] : [], ...(last.lastComparison ? { last: last.lastComparison as NonNullable<Diagnostics['last']> } : {}) };
}
async function handle(message: Message, sender: chrome.runtime.Sender): Promise<unknown> {
  authorize(sender, message, chrome.runtime.id);
  switch (message.type) {
    case 'settings.get': return preferences.load();
    case 'settings.save': { const result = await preferences.save(message.patch, message.replace === true); analysis.forget(); await cache.configure(Number(result['cache.maximumSize'])).catch(() => undefined); return result; }
    case 'policy.templates': { const result = requiredTemplates(JSON.stringify(message.layers)); return result.ok ? result.value.slice(0, 16) : []; }
    case 'source.public': { const settings = await preferences.load(); if (isPaused(settings, message.repository)) throw new ExtensionError('REPOSITORY_PAUSED', 'diffdevil is paused for this repository.'); return provider.pull(message.repository, message.pullRequest, message.files === true, message.page); }
    case 'source.policy': { const settings = await preferences.load(); if (isPaused(settings, message.repository)) throw new ExtensionError('REPOSITORY_PAUSED', 'diffdevil is paused for this repository.'); return provider.policy(message.repository, message.base, message.path); }
    case 'cache.lookup': return analysis.lookup(readComparison(message.comparison), await preferences.load());
    case 'cache.recent': return analysis.recent(message.repository, message.pullRequest, await preferences.load());
    case 'analysis.run': return analysis.run(message.input, await preferences.load());
    case 'analysis.extend': return analysis.extend(message, await preferences.load());
    case 'analysis.files': {
      if (!Array.isArray(message.paths) || message.paths.length > 24 || message.paths.some(path => typeof path !== 'string' || path.length > 4096)) throw new ExtensionError('FILE_LIMIT', 'Request at most 24 visible files.');
      return analysis.files(message.key, message.comparison, message.paths, await preferences.load());
    }
    case 'report.text': {
      if (message.path !== undefined && (typeof message.path !== 'string' || message.path.length > 4096)) throw new ExtensionError('FILE_LIMIT', 'Request one file path.');
      return analysis.text(message.key, message.comparison, message.path, await preferences.load());
    }
    case 'repository.pause': {
      const settings = await preferences.update(current => ({ 'repositories.paused': pausedWith(String(current['repositories.paused']), message.repository, message.paused === true, Date.now()) }));
      // Anything already analysed for that repository stops being served from memory; its cached data stays.
      analysis.forget(context => context.comparison.repository.toLowerCase() === repositoryKey(message.repository));
      return { paused: isPaused(settings, message.repository) };
    }
    case 'diagnostics.get': return diagnostics();
    case 'data.inventory': return analysis.inventory();
    case 'options.open': await chrome.runtime.openOptionsPage(); return null;
    case 'data.action': {
      if (['data.clearRepositoryOverrides', 'data.resetAll', 'data.clearRepository', 'data.clearPullRequest'].includes(message.action) && message.confirmed !== true) throw new ExtensionError('CONFIRMATION_REQUIRED', 'Confirm this destructive operation in Settings.');
      switch (message.action) {
        case 'data.clearAnalysisCache': await analysis.clearReports(); break;
        case 'data.clearPolicyCache': await analysis.clearPolicies(); break;
        case 'data.clearRepository': await analysis.clearScope(repositoryKey(String(message.repository))); break;
        case 'data.clearPullRequest': if (!Number.isSafeInteger(message.pullRequest) || Number(message.pullRequest) < 1) throw new ExtensionError('PR_IDENTITY', 'Invalid pull-request number.'); await analysis.clearScope(repositoryKey(String(message.repository)), Number(message.pullRequest)); break;
        case 'data.clearRepositoryOverrides': await preferences.save({ 'policy.repositoryOverrides': '{}' }); analysis.forget(); break;
        case 'data.resetAll': await analysis.clearAll(); await preferences.reset(); break;
        case 'diagnostics.copySupportSnapshot': {
          const [info, settings] = await Promise.all([diagnostics(), preferences.load()]); const { last, ...safeInfo } = info;
          return { kind: 'diffdevil.support/1', ...safeInfo, adapter: BROWSER_ADAPTER, sourcePresent: Boolean(last), advancedActive: advancedChanges(settings).map(item => item.id),
            settings: Object.fromEntries(Object.entries(settings).map(([id, value]) => [id, (id.startsWith('policy.') && !['policy.mode', 'policy.preset', 'policy.primaryMetric'].includes(id)) || id === 'repositories.paused' ? { redacted: true, bytes: bytes(value) } : value])) };
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
      const code = error instanceof ExtensionError ? error.code : 'EXTENSION_OPERATION';
      // A paused repository answering "paused" is the pause working, not a failure to record.
      if (!isCaughtOptionalPublicAbsence(input as Message, code) && code !== 'REPOSITORY_PAUSED') await recordError(error, (input as Message).type, sender).catch(() => undefined);
      reply({ ok: false, code, message: error instanceof Error ? error.message : 'The extension operation failed.' });
    }
  })(); return true;
});
// Restrict direct storage access on every worker start as well as installation.
for (const area of [chrome.storage.local, chrome.storage.sync, chrome.storage.session]) void area.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' }).catch(error => { void recordError(error).catch(() => undefined); });
chrome.action.onClicked.addListener(() => { void chrome.runtime.openOptionsPage(); });
// The first install, and only that, opens Settings at its ready section. Updates, browser starts and imports never do.
chrome.runtime.onInstalled.addListener(details => {
  const url = firstInstallUrl(details, chrome.runtime.getURL); if (!url) return;
  void chrome.tabs.create({ url }).catch(error => { void recordError(error, 'first-install').catch(() => undefined); });
});
