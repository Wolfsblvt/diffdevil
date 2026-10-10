// SPDX-License-Identifier: AGPL-3.0-only
/** Repository identity and pause state. No engine imports: the content script reads these without the compiler. */
const encoded = (text: string): number => new TextEncoder().encode(text).byteLength;
export function repositoryKey(value: string): string {
  const key = value.toLowerCase();
  if (!/^[a-z0-9_.-]+\/[a-z0-9_.-]+$/u.test(key) || key.split('/').some(part => part === '.' || part === '..')) throw new Error('Use owner/repository, without a URL.');
  return key;
}
/** Pause is keyed by host and normalized repository, and carries only when it began. */
export interface Pause { at: number }
export const pauseKey = (repository: string): string => `github.com/${repositoryKey(repository)}`;
export function pausedRepositories(text: string): Record<string, Pause> {
  if (encoded(text) > 1024 * 1024) throw new Error('Paused repositories exceed 1 MiB.');
  const input: unknown = JSON.parse(text); if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Paused repositories must be keyed by repository.');
  const result: Record<string, Pause> = Object.create(null) as Record<string, Pause>;
  for (const [key, entry] of Object.entries(input)) {
    const match = /^github\.com\/(.+)$/u.exec(key); if (!match) throw new Error('Pause a GitHub repository as github.com/owner/repository.');
    const name = pauseKey(match[1]!); if (Object.hasOwn(result, name)) throw new Error('Duplicate repository identity.');
    if (!entry || typeof entry !== 'object' || Array.isArray(entry) || Object.keys(entry).some(field => field !== 'at') || !Number.isSafeInteger((entry as Pause).at) || (entry as Pause).at < 0) throw new Error('Each paused repository records when it was paused.');
    result[name] = { at: (entry as Pause).at };
  }
  return result;
}
export const isPaused = (settings: Readonly<Record<string, unknown>>, repository: string): boolean => Object.hasOwn(pausedRepositories(String(settings['repositories.paused'] ?? '{}')), pauseKey(repository));
/** The stored value after pausing or resuming one repository; every other repository is untouched. */
export function pausedWith(text: string, repository: string, paused: boolean, at: number): string {
  const current = pausedRepositories(text); const key = pauseKey(repository);
  if (paused) { if (!Object.hasOwn(current, key)) current[key] = { at }; } else delete current[key];
  return JSON.stringify(Object.fromEntries(Object.entries(current).sort(([a], [b]) => a.localeCompare(b))));
}
