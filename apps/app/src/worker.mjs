// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * The one Worker behind app.diffdevil.dev. Astro renders the signed-in pages; the managed
 * App's runtime keeps its routes on the same host and bindings: the verified webhook ingress,
 * the Queue consumer and the scheduled maintenance, the protected `/api/analytics` read with
 * the App's authorization service installed behind it, and the Wirt commercial routes. One
 * host, one D1, one authorization and protector contract, one deployment.
 */
import { handle } from '@astrojs/cloudflare/handler';
import { countedInvocationEnv, createGitHubAppWorker } from '../../github-app/app.mjs';
import { createAppRuntime } from './lib/runtime.mjs';
import { premium } from './premium/index.mjs';

const RUNTIME_PATHS = ['/webhooks/github', '/api/analytics', '/health/ping', '/health/ready'];
const RUNTIME_PREFIXES = ['/integrations/wirt/'];

function runtimeRoute(pathname) {
  return RUNTIME_PATHS.includes(pathname) || RUNTIME_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

/** The managed runtime with the App's services installed; composed per invocation, like every other request. */
function managedRuntime(env) {
  let app;
  try { app = createAppRuntime(env, { premium }); } catch { app = undefined; }
  return createGitHubAppWorker(app ? { authorization: app.auth, commercial: app.commercial, briefProvider: premium.brief, automaticSetup: app.automaticSetup,
    // The selected allowances govern execution, collection and history jobs; jobs read the plan's import scope and the current policy.
    operating: app.operating.standing, importScope: app.importScope, currentPolicy: repositoryId => app.policies.current({ repositoryId }), maintain: app.operating.maintain, beforePrune: app.participation ? () => app.participation.preserveUse() : undefined, maintenance: app.participation ? [() => app.participation.flush()] : [] } : { briefProvider: premium.brief });
}

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);
    if (runtimeRoute(url.pathname)) return managedRuntime(env).fetch(request, env, context);
    return handle(request, env, context);
  },
  async queue(batch, env, context) {
    // Count D1 before the runtime composes its stores, so the commercial reads count against the same invocation allowance.
    const counted = countedInvocationEnv(env);
    return managedRuntime(counted).queue(batch, counted, context);
  },
  async scheduled(controller, env, context) { return managedRuntime(env).scheduled(controller, env, context); }
};
