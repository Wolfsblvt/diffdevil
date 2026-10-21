// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/** The six analytical destinations share one protected, progressively acquired document. */
export function analyticalRoute(pathname) {
  if (pathname === '/') return { section: 'overview', title: 'Overview' };
  if (pathname === '/prs') return { section: 'prs', title: 'Pull requests' };
  if (pathname === '/history') return { section: 'history', title: 'History' };
  if (pathname === '/files') return { section: 'files', title: 'Files' };
  if (/^\/pr\/[^/]+\/[^/]+\/[1-9]\d*$/u.test(pathname)) return { section: 'pr', title: 'Pull request' };
  if (/^\/file\/[^/]+\/[^/]+\/[A-Za-z0-9_-]{22}$/u.test(pathname)) return { section: 'file', title: 'File history' };
  return null;
}

/** Shell authentication reads local session standing only; it never exposes provider or repository data. */
export async function openAnalyticalShell(request, runtime, cookieValue, cookieName) {
  try {
    await runtime.auth.serviceConnection({ session: cookieValue(request, cookieName) });
    return null;
  } catch (error) { return error?.code ?? 'E_SESSION_UNAVAILABLE'; }
}
