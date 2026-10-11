// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * The signed-in diffdevil App: server-rendered on Cloudflare Workers, reading the managed
 * App's D1 state, with the managed App's runtime routes joined in the same Worker through the
 * custom entry in src/worker.mjs. The website's header, tokens, styles and fonts are imported
 * from the website source so the shell is the same component, not a copy. Building creates no
 * Worker, route, domain or deployment.
 */
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import { fileURLToPath } from 'node:url';
import { selectPremium } from './premium-selection.mjs';
import { appBuildTarget } from './build-target.mjs';

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
// The Community App is complete on its own; the premium extension joins only when present (premium-selection.mjs).
const premium = selectPremium();
const appSource = fileURLToPath(new URL('./src', import.meta.url));
const target = appBuildTarget();

export default defineConfig({
  site: target.origin,
  output: 'server',
  trailingSlash: 'never',
  outDir: `${target.artifacts}/dist`,
  session: false,
  adapter: cloudflare({
    // No image transforms: nothing on these pages is an optimised image, and no Images binding is wanted.
    imageService: 'passthrough',
    // The header fragment prerenders through the website's build-time icon registry, which needs Node.
    prerenderEnvironment: 'node',
    configPath: target.configPath,
    persistState: { path: `${target.artifacts}/state` }
  }),
  devToolbar: { enabled: false },
  // Cross-origin POSTs are refused by the authorization service against the configured APP_ORIGIN
  // (every mutating route passes the Origin header to it). Astro's own check compares against the
  // request URL, which a local proxy may rewrite; one explicit origin rule is enough.
  security: { checkOrigin: false },
  vite: {
    // The managed App's runtime imports the reusable engine by its package name; the App bundles the built engine.
    resolve: { alias: { '@diffdevil/premium-app': premium.entry, '@diffdevil/premium-styles': premium.styles, '@diffdevil-app': appSource, '@wolfsblvt/diffdevil/github': fileURLToPath(new URL('../../dist/lib/github/index.js', import.meta.url)), '@wolfsblvt/diffdevil': fileURLToPath(new URL('../../dist/lib/index.js', import.meta.url)) } },
    server: { fs: { allow: [repositoryRoot] } },
    build: { chunkSizeWarningLimit: 900 }
  }
});
