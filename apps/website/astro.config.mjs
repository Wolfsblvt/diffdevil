// SPDX-License-Identifier: AGPL-3.0-only
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import { fileURLToPath } from 'node:url';
import { diffdevilSyntax } from './src/lib/shiki-theme.ts';
import searchIndex from './search-index.mjs';
import { origins } from './public-origins.mjs';
import { engineAliases } from './engine-aliases.mjs';

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));

export default defineConfig({
  site: process.env.DIFFDEVIL_SITE_ORIGIN ?? origins.site,
  output: 'static',
  trailingSlash: 'always',
  outDir: fileURLToPath(new URL('../../artifacts/website/dist', import.meta.url)),
  integrations: [
    react(),
    searchIndex(),
  ],
  markdown: { shikiConfig: { theme: diffdevilSyntax } },
  vite: {
    resolve: {
      alias: engineAliases,
    },
    server: { fs: { allow: [repositoryRoot] } },
    build: { commonjsOptions: { include: [/node_modules/, /dist[\\/]lib[\\/]validation/] }, chunkSizeWarningLimit: 900 },
  },
});
