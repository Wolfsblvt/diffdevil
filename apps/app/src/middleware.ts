// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Every request: compose the runtime, authenticate the protected routes, resolve the viewer,
 * and stamp the response with the App's security and private-cache headers. A refused
 * session goes to sign-in with its reason; nothing protected renders first. Liveness and
 * the sign-in page answer even when the Worker is not yet configured.
 */
import { defineMiddleware } from 'astro:middleware';
import { createAppRuntime } from './lib/runtime.mjs';
import { openSession, pageHeaders, securityHeaders } from './lib/routes.mjs';
import { resolveViewer } from './lib/viewer.mjs';

const PUBLIC = [/^\/sign-in$/u, /^\/auth\//u, /^\/health\//u, /^\/fragments\//u];

export const onRequest = defineMiddleware(async (context, next) => {
  if (context.isPrerendered) return next();
  const { pathname } = context.url;
  const isPublic = PUBLIC.some(pattern => pattern.test(pathname));
  let configurationProblem: string | undefined;
  // The Worker environment is read lazily: the header fragment prerenders in Node, where the cloudflare module does not exist.
  try { const { env } = await import('cloudflare:workers'); context.locals.app = createAppRuntime(env as unknown as Env); }
  catch (error) { configurationProblem = error instanceof Error ? error.message : 'unknown configuration problem'; }
  context.locals.configurationProblem = configurationProblem;
  if (configurationProblem && (!isPublic || pathname.startsWith('/auth/'))) {
    return new Response(`The App is not configured: ${configurationProblem}`, { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', ...securityHeaders() } });
  }
  if (!isPublic) {
    const runtime = context.locals.app;
    const opened = await openSession(context.request, runtime);
    if ('refusal' in opened) return context.redirect(`/sign-in?reason=${encodeURIComponent(opened.refusal)}`, 303);
    context.locals.session = opened;
    try { context.locals.viewer = await resolveViewer({ reads: opened.reads, actor: opened.actor, store: runtime.store, entitlement: runtime.entitlement, cache: runtime.cache }); }
    catch (error) {
      const code = (error as { code?: string })?.code === 'E_GITHUB_RATE_LIMIT' ? 'E_GITHUB_RATE_LIMIT' : 'E_PROVIDER_UNAVAILABLE';
      return context.redirect(`/sign-in?reason=${encodeURIComponent(code)}`, 303);
    }
  }
  const response = await next();
  for (const [name, value] of Object.entries(pathname.startsWith('/auth/') || pathname.startsWith('/health/') ? securityHeaders() : pageHeaders())) response.headers.set(name, value);
  return response;
});
