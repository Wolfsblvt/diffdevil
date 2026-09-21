// SPDX-License-Identifier: AGPL-3.0-only
import { ExtensionError } from '../shared/errors.js';
import { repositoryKey } from '../shared/settings.js';
import type { Message } from '../shared/protocol.js';
/** No arbitrary-URL proxy and no content-script access to settings mutations. */
export function authorize(sender: chrome.runtime.Sender, message: Message, extensionId: string): { options: boolean; repository?: string; pullRequest?: number } {
  if (sender.id !== extensionId) throw new ExtensionError('SENDER_REJECTED', 'The message did not originate in this extension.');
  const url = new URL(sender.url ?? sender.tab?.url ?? 'about:blank');
  if (url.protocol === 'chrome-extension:' && url.hostname === extensionId && url.pathname === '/options.html') return { options: true };
  if (url.origin !== 'https://github.com' || sender.frameId !== undefined && sender.frameId !== 0) throw new ExtensionError('SENDER_REJECTED', 'A supported top-level GitHub page is required.');
  const route = /^\/([^/]+\/[^/]+)\/pull\/([1-9]\d*)(?:\/|$)/u.exec(url.pathname);
  if (!route) throw new ExtensionError('SENDER_REJECTED', 'This request requires a GitHub pull-request page.');
  if (['settings.save', 'data.action', 'diagnostics.get'].includes(message.type)) throw new ExtensionError('OPTIONS_REQUIRED', 'Manage extension data from Settings.');
  const repository = repositoryKey(route[1]!); const pullRequest = Number(route[2]);
  const target = message.type === 'analysis.run' ? message.input.comparison : message.type === 'cache.lookup' ? message.comparison : message.type === 'source.public' || message.type === 'source.policy' ? message : undefined;
  if (target && repositoryKey(target.repository) !== repository || target && 'pullRequest' in target && target.pullRequest !== pullRequest) throw new ExtensionError('SENDER_SCOPE', 'A page may acquire only its own pull request.');
  return { options: false, repository, pullRequest };
}
