// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * Every request: compose the runtime, authenticate the protected routes, resolve the viewer,
 * and stamp the response with the App's security and private-cache headers. A refused
 * session goes to sign-in with its reason; nothing protected renders first. Liveness and
 * the sign-in page answer even when the Worker is not yet configured.
 */
import { defineMiddleware } from 'astro:middleware';
import { createAppRuntime } from './lib/runtime.mjs';
import { premium } from './premium/index.mjs';
import { openSession, pageHeaders, securityHeaders, cookieValue, SESSION_COOKIE } from './lib/routes.mjs';
import { resolveViewer } from './lib/viewer.mjs';
import { analyticalRoute, openAnalyticalShell } from './lib/analytical-request.mjs';

const PUBLIC = [/^\/sign-in$/u, /^\/auth\//u, /^\/health\//u, /^\/fragments\//u];

export const onRequest = defineMiddleware(async (context, next) => {
  if (context.isPrerendered) return next();
  const { pathname } = context.url;
  // Internal render targets are reachable only by this request's authenticated rewrite.
  if (pathname.startsWith('/render/analytical-')) {
    if (!context.locals.analyticalUrl) return new Response('Not found', { status: 404, headers: pageHeaders(context.locals.app) });
    const response = await next();
    for (const [name, value] of Object.entries(pageHeaders(context.locals.app))) response.headers.set(name, value);
    return response;
  }
  const analytical = analyticalRoute(pathname);
  const render = context.request.headers.get('x-diffdevil-render') ?? (context.url.searchParams.get('render') === 'document' ? 'page' : null);
  const isPublic = PUBLIC.some(pattern => pattern.test(pathname));
  let configurationProblem: string | undefined;
  // The Worker environment is read lazily: the header fragment prerenders in Node, where the cloudflare module does not exist.
  try { const { env } = await import('cloudflare:workers'); context.locals.app = createAppRuntime(env as unknown as Env, { premium }); }
  catch (error) { configurationProblem = error instanceof Error ? error.message : 'unknown configuration problem'; }
  context.locals.configurationProblem = configurationProblem;
  if (configurationProblem && (!isPublic || pathname.startsWith('/auth/'))) {
    return new Response(`The App is not configured: ${configurationProblem}`, { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', ...securityHeaders() } });
  }
  if (!isPublic) {
    const runtime = context.locals.app;
    if (analytical && !['page', 'navigation', 'notifications', 'enrichment'].includes(render ?? '')) {
      const refusal = await openAnalyticalShell(context.request, runtime, cookieValue, SESSION_COOKIE);
      if (refusal) return context.redirect(`/sign-in?reason=${encodeURIComponent(refusal)}`, 303);
      context.locals.analyticalUrl = context.url.href;
      return context.rewrite(`/render/analytical-shell${context.url.search}`);
    }
    const opened = await openSession(context.request, runtime);
    if ('refusal' in opened) {
      if (analytical && opened.refusal === 'E_AUTHORIZATION_UNAVAILABLE') return new Response('Current authorization could not be established. Retry this view.', { status: 503, headers: pageHeaders(runtime) });
      return context.redirect(`/sign-in?reason=${encodeURIComponent(opened.refusal)}`, 303);
    }
    context.locals.session = opened;
    try { context.locals.viewer = await resolveViewer({ reads: opened.reads, actor: opened.actor, store: runtime.store, entitlement: runtime.entitlement, cache: runtime.cache }); }
    catch (error) {
      const code = (error as { code?: string })?.code === 'E_GITHUB_RATE_LIMIT' ? 'E_GITHUB_RATE_LIMIT' : 'E_PROVIDER_UNAVAILABLE';
      if (analytical) return new Response('Current repository access could not be read. Retry this view.', { status: 503, headers: pageHeaders(runtime) });
      return context.redirect(`/sign-in?reason=${encodeURIComponent(code)}`, 303);
    }
    if (analytical) {
      context.locals.analyticalUrl = context.url.href;
      context.locals.deferChrome = context.url.searchParams.get('render') !== 'document';
      context.locals.deferPremium = render === 'page' && context.url.searchParams.get('render') !== 'document';
      if (context.locals.deferPremium) {
        runtime.analytics = runtime.baseAnalytics;
        runtime.deferPremium = true;
      }
      if (render === 'navigation' || render === 'notifications') return context.rewrite(`/render/analytical-${render}${context.url.search}`);
    }
  }
  const response = await next();
  for (const [name, value] of Object.entries(pathname.startsWith('/auth/') || pathname.startsWith('/health/') ? securityHeaders() : pageHeaders(context.locals.app))) response.headers.set(name, value);
  return response;
});
