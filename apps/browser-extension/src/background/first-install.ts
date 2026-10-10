// SPDX-License-Identifier: AGPL-3.0-only
/**
 * The page the extension opens for itself, and the only moment it does. Chrome reports why the
 * worker started; an update, a browser or extension update and a Chrome update are not a first
 * install, and neither is opening Settings or importing settings, which never reach this function.
 */
export function firstInstallUrl(details: { readonly reason: string }, getURL: (path: string) => string): string | undefined {
  return details.reason === 'install' ? getURL('options.html#ready') : undefined;
}
