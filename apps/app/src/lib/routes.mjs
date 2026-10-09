// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Framework-neutral handlers for the sign-in journey and the response headers every App
 * page carries. The authorization service owns the security meaning; these functions map
 * HTTP to it: cookies in, redirects and one small continuation page out, stable error codes
 * turned into plain words.
 */
import { protectedHeaders } from '../../../github-app/authorization.mjs';
import { RETURN_CONTEXT } from './runtime.mjs';
import { escapeHtml } from './format.mjs';

export const SESSION_COOKIE = '__Host-diffdevil-session';
export const OAUTH_COOKIE = '__Host-diffdevil-oauth';

export function cookieValue(request, name) {
  const header = request.headers.get('cookie') ?? '';
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return undefined;
}

/** Browser security headers for every App response; pages add the protected-cache pair. */
export function securityHeaders() {
  return {
    // style-src allows attribute styles: data-bound bar widths and label colours are rendered as style attributes
    // from escaped server values. Scripts remain 'self' only; no inline script exists on any App page.
    'content-security-policy': "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: https://avatars.githubusercontent.com; connect-src 'self'; base-uri 'none'; form-action 'self' https://github.com; frame-ancestors 'none'",
    'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    // same-origin, not no-referrer: with no-referrer a browser sends `Origin: null` on same-origin form posts, which the sign-in exchange must refuse.
    'referrer-policy': 'same-origin',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY'
  };
}
export function pageHeaders() { return { ...securityHeaders(), ...protectedHeaders() }; }

/** Plain words for the stable refusal codes a person can meet on the way in. */
export const SIGN_IN_MESSAGES = Object.freeze({
  'E_AUTH_STATE': 'That sign-in attempt expired or did not start in this browser. Start again.',
  'E_AUTH_PROVIDER': 'GitHub did not complete the sign-in. Start again; nothing was stored.',
  'E_AUTH_ARTIFACT': 'The sign-in handoff expired before it finished. Start again.',
  'E_AUTH_RETURN_CONTEXT': 'The sign-in return was not one the App accepts. Start again from the App.',
  'E_AUTH_ORIGIN': 'The request did not come from the App. Start again from the App.',
  'E_AUTH_CODE': 'GitHub returned without a code. Start again.',
  'E_AUTH_DESTINATION': 'The App could not build a valid GitHub sign-in destination. This is a configuration problem on the App side.',
  'E_SESSION_UNAVAILABLE': 'Your session ended. Sign in again to continue.',
  'E_AUTHORIZATION_UNAVAILABLE': 'GitHub no longer confirms your authorization. Sign in again to continue.'
});

function redirect(location, headers = {}) { return new Response(null, { status: 303, headers: { location, ...securityHeaders(), ...headers } }); }
const signInWith = (code, headers) => redirect(`/sign-in?reason=${encodeURIComponent(code)}`, headers);

export async function authStart(request, runtime) {
  try {
    const begun = await runtime.auth.begin(RETURN_CONTEXT);
    return redirect(begun.authorizationUrl, begun.headers);
  } catch (error) { return signInWith(error?.code ?? 'E_AUTH_DESTINATION'); }
}

/** GitHub returns here. The one-time artifact is exchanged for a session only by a same-origin POST. */
export async function authCallback(request, runtime) {
  const url = new URL(request.url);
  try {
    const completed = await runtime.auth.complete({ state: url.searchParams.get('state'), code: url.searchParams.get('code'), browserBinding: cookieValue(request, OAUTH_COOKIE) });
    const body = `<!doctype html><html lang="en" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Signing in · diffdevil App</title><link rel="stylesheet" href="/auth/continue.css"></head><body><main class="continue"><form method="post" action="/auth/session" data-continue><input type="hidden" name="artifact" value="${escapeHtml(completed.artifact)}"><input type="hidden" name="return" value="${escapeHtml(completed.returnContext)}"><p>GitHub confirmed your sign-in.</p><button type="submit" class="btn btn-primary">Continue to the App</button></form></main><script src="/auth/continue.js"></script></body></html>`;
    return new Response(body, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', ...securityHeaders(), ...completed.headers } });
  } catch (error) { return signInWith(error?.code ?? 'E_AUTH_PROVIDER'); }
}

export async function authSession(request, runtime) {
  let form;
  try { form = await request.formData(); } catch { return signInWith('E_AUTH_ARTIFACT'); }
  try {
    const result = await runtime.auth.exchange({ artifact: form.get('artifact'), returnContext: form.get('return'), method: request.method, origin: request.headers.get('origin'), previousSession: cookieValue(request, SESSION_COOKIE) });
    return redirect('/', result.headers);
  } catch (error) { return signInWith(error?.code ?? 'E_AUTH_ARTIFACT'); }
}

export async function authLogout(request, runtime) {
  try {
    const result = await runtime.auth.logout({ session: cookieValue(request, SESSION_COOKIE), method: request.method, origin: request.headers.get('origin') });
    return redirect('/sign-in', result.headers);
  } catch (error) { return signInWith(error?.code ?? 'E_AUTH_ORIGIN'); }
}

/** Authenticate the session cookie and hand back bound provider reads for the rest of the request. */
export async function openSession(request, runtime) {
  const session = cookieValue(request, SESSION_COOKIE);
  if (!session) return { refusal: 'E_SESSION_UNAVAILABLE' };
  try { return await runtime.auth.read({ session }, async (reads, actor) => ({ reads, actor, session })); }
  catch (error) { return { refusal: error?.code ?? 'E_SESSION_UNAVAILABLE' }; }
}
