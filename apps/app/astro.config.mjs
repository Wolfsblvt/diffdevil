// SPDX-License-Identifier: AGPL-3.0-only
/**
 * The signed-in diffdevil App: server-rendered on Cloudflare Workers, reading the managed
 * App's D1 state. The website's header, tokens, styles and fonts are imported from the
 * website source so the shell is the same component, not a copy. Building creates no
 * Worker, route, domain or deployment.
 */
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));

export default defineConfig({
  site: process.env.DIFFDEVIL_APP_ORIGIN ?? 'https://app.diffdevil.dev',
  output: 'server',
  trailingSlash: 'never',
  outDir: fileURLToPath(new URL('../../artifacts/app/dist', import.meta.url)),
  session: false,
  adapter: cloudflare({
    // No image transforms: nothing on these pages is an optimised image, and no Images binding is wanted.
    imageService: 'passthrough',
    // The header fragment prerenders through the website's build-time icon registry, which needs Node.
    prerenderEnvironment: 'node',
    configPath: 'wrangler.jsonc',
    persistState: { path: fileURLToPath(new URL('../../artifacts/app/state', import.meta.url)) }
  }),
  devToolbar: { enabled: false },
  // Cross-origin POSTs are refused by the authorization service against the configured APP_ORIGIN
  // (every mutating route passes the Origin header to it). Astro's own check compares against the
  // request URL, which a local proxy may rewrite; one explicit origin rule is enough.
  security: { checkOrigin: false },
  vite: {
    server: { fs: { allow: [repositoryRoot] } },
    build: { chunkSizeWarningLimit: 900 }
  }
});
