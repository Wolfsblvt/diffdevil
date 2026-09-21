// SPDX-License-Identifier: AGPL-3.0-only
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { diffdevilSyntax } from './src/lib/shiki-theme.ts';
import { themeScript } from './src/lib/theme-script.mjs';
import searchIndex from './search-index.mjs';

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const engine = path => fileURLToPath(new URL(`../../dist/lib/${path}`, import.meta.url));
const sidebarFile = new URL('./src/content/sidebar.json', import.meta.url);
if (!existsSync(sidebarFile)) throw new Error('Run `node tools/website-docs.mjs` before building the website; the docs collection is generated from the manifest.');
const sidebar = JSON.parse(readFileSync(sidebarFile, 'utf8'));

export default defineConfig({
  site: process.env.DIFFDEVIL_SITE_ORIGIN ?? 'https://diffdevil.invalid',
  output: 'static',
  trailingSlash: 'always',
  outDir: fileURLToPath(new URL('../../artifacts/website/dist', import.meta.url)),
  integrations: [
    starlight({
      title: 'diffdevil',
      description: 'The diffdevil manual: CLI, GitHub Actions, policies and the detail language, TypeScript API, playground and GitHub App.',
      sidebar,
      pagefind: false,
      customCss: ['./src/styles/fonts.css', './src/styles/tokens.css', './src/styles/global.css', './src/styles/starlight.css'],
      components: {
        Header: './src/components/docs/Header.astro',
        ThemeProvider: './src/components/docs/ThemeProvider.astro',
        ThemeSelect: './src/components/docs/ThemeSelect.astro',
        Footer: './src/components/docs/Footer.astro',
        SiteTitle: './src/components/docs/SiteTitle.astro',
      },
      editLink: { baseUrl: 'https://github.com/Wolfsblvt/diffdevil/edit/main/' },
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/Wolfsblvt/diffdevil' }],
      expressiveCode: { themes: [diffdevilSyntax], useStarlightDarkModeSwitch: false, useStarlightUiThemeColors: false, styleOverrides: { borderRadius: '10px', borderColor: '#2c303a', codeFontFamily: 'var(--font-mono)', codeFontSize: '12.5px', codeLineHeight: '1.6', frames: { editorActiveTabBackground: '#0c0f17', editorTabBarBackground: '#0c0f17', terminalBackground: '#0c0f17', terminalTitlebarBackground: '#0c0f17', editorBackground: '#0c0f17', shadowColor: 'transparent' } } },
      head: [
        { tag: 'script', content: themeScript },
        { tag: 'link', attrs: { rel: 'icon', href: '/favicon.ico', sizes: '32x32' } },
        { tag: 'link', attrs: { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' } },
        { tag: 'link', attrs: { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' } },
        { tag: 'link', attrs: { rel: 'manifest', href: '/manifest.webmanifest' } },
        { tag: 'meta', attrs: { name: 'theme-color', content: '#151922' } },
      ],
      pagination: true,
      lastUpdated: false,
      credits: false,
      favicon: '/favicon.svg',
      disable404Route: true,
    }),
    react(),
    searchIndex(),
  ],
  markdown: { shikiConfig: { theme: diffdevilSyntax } },
  vite: {
    resolve: {
      alias: [
        { find: /^node:crypto$/u, replacement: fileURLToPath(new URL('./src/shims/node-crypto.mjs', import.meta.url)) },
        { find: /^node:util$/u, replacement: fileURLToPath(new URL('./src/shims/node-util.mjs', import.meta.url)) },
        { find: /^@wolfsblvt\/diffdevil\/core$/u, replacement: engine('core.js') },
        { find: /^@wolfsblvt\/diffdevil\/policy$/u, replacement: engine('policy/index.js') },
        { find: /^@wolfsblvt\/diffdevil\/language$/u, replacement: engine('language/index.js') },
        { find: /^@wolfsblvt\/diffdevil\/format$/u, replacement: engine('format.js') },
        { find: /^@wolfsblvt\/diffdevil\/errors$/u, replacement: engine('errors.js') },
      ],
    },
    server: { fs: { allow: [repositoryRoot] } },
    build: { commonjsOptions: { include: [/node_modules/, /dist[\\/]lib[\\/]validation/] }, chunkSizeWarningLimit: 900 },
  },
});
