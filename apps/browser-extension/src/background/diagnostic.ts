// SPDX-License-Identifier: AGPL-3.0-only
import type { Diagnostics } from '../shared/protocol.js';
import { ExtensionError } from '../shared/errors.js';

type RouteStanding = 'missing' | 'invalid' | 'github-pr' | 'github-other' | 'extension-options' | 'other-origin';

function standing(value: string | undefined): RouteStanding {
  if (!value) return 'missing';
  try {
    const url = new URL(value);
    if (url.protocol === 'chrome-extension:' && url.pathname === '/options.html') return 'extension-options';
    if (url.origin !== 'https://github.com') return 'other-origin';
    return /^\/[^/]+\/[^/]+\/pull\/[1-9]\d*(?:\/|$)/u.test(url.pathname) ? 'github-pr' : 'github-other';
  } catch { return 'invalid'; }
}

function routeAgreement(frame: string | undefined, tab: string | undefined): 'same' | 'different' | 'unavailable' {
  if (!frame || !tab) return 'unavailable';
  try {
    const frameUrl = new URL(frame); const tabUrl = new URL(tab);
    return frameUrl.origin === tabUrl.origin && frameUrl.pathname === tabUrl.pathname ? 'same' : 'different';
  }
  catch { return 'unavailable'; }
}

/** Retain route shape and frame identity, never a private repository or URL. */
export function operationDiagnostic(error: unknown, phase: string, sender?: chrome.runtime.Sender): Diagnostics['errors'][number] {
  return {
    code: error instanceof ExtensionError ? error.code : 'EXTENSION_OPERATION',
    phase,
    at: Date.now(),
    ...(sender ? {
      frameId: sender.frameId ?? null,
      documentId: (sender as chrome.runtime.Sender & { documentId?: string }).documentId ?? null,
      senderUrl: standing(sender.url),
      tabUrl: standing(sender.tab?.url),
      routeAgreement: routeAgreement(sender.url, sender.tab?.url),
      tabId: sender.tab?.id ?? null,
    } : {}),
  };
}
