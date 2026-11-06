// SPDX-License-Identifier: AGPL-3.0-only
/** Attribute errors to extension code, never to a repository name inside a host diagnostic. */
export function isExtensionConsoleError(sourceUrl, text) {
  // Chrome can omit a console location. Keep the production error prefixes useful there.
  return sourceUrl.startsWith('chrome-extension://')
    || /^(?:\[diffdevil\] (?:acquisition failed|pause failed)|diffdevil (?:content request failed|extension operation failed))(?:\s|$)/u.test(text);
}
