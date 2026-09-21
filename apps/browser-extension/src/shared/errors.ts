// SPDX-License-Identifier: AGPL-3.0-only
export class ExtensionError extends Error { constructor(readonly code: string, message: string) { super(message); } }
export async function boundedText(response: Response, maximum: number): Promise<string> {
  if (!response.body) return '';
  const reader = response.body.getReader(); const decoder = new TextDecoder('utf-8', { fatal: true }); let size = 0; let text = '';
  try { for (;;) { const chunk = await reader.read(); if (chunk.done) return text + decoder.decode(); size += chunk.value.byteLength; if (size > maximum) throw new ExtensionError('SOURCE_LIMIT', 'The source exceeds the browser acquisition limit.'); text += decoder.decode(chunk.value, { stream: true }); } }
  finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
}
export const object = (value: unknown): Record<string, unknown> => { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ExtensionError('PROVIDER_RESPONSE', 'The provider returned an unexpected response.'); return value as Record<string, unknown>; };
export function safePath(value: string): string {
  if (typeof value !== 'string' || !value || value.length > 1024 || value.startsWith('/') || value.includes('\\') || /[\x00-\x1f]/u.test(value) || value.split('/').some(part => !part || part === '.' || part === '..')) throw new ExtensionError('POLICY_PATH', 'Use a repository-relative policy path without parent traversal.');
  return value.split('/').map(encodeURIComponent).join('/');
}
