// SPDX-License-Identifier: AGPL-3.0-only
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightWorks from '@wolfsblvt/starlight-works';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { sidebar, origins } from './manifest.mjs';
import { engineAliases } from '../website/engine-aliases.mjs';
import { themeScript } from '../website/src/lib/theme-script.mjs';
import { diffdevilSyntax } from '../website/src/lib/shiki-theme.ts';
const root = fileURLToPath(new URL('../../',import.meta.url));
const shared = path => fileURLToPath(new URL('../website/src/'+path,import.meta.url));
const own = path => fileURLToPath(new URL('./src/'+path,import.meta.url));
const faq = existsSync(new URL('../../docs/manual/faq.md',import.meta.url)) && existsSync(new URL('../website/src/pages/faq.astro',import.meta.url));
export default defineConfig({
 site: origins.docs, output:'static', trailingSlash:'always',
 outDir: fileURLToPath(new URL('../../artifacts/manual/dist/',import.meta.url)),
 integrations:[starlight({
  title:'diffdevil Docs', titleDelimiter:'·', description:'Learn to measure Git changes, configure policy, and use diffdevil in your terminal, workflows and GitHub.',
  plugins:[starlightWorks({sidebar:sidebar({includeFAQ:faq})})],
  pagefind:false,
  customCss:[shared('styles/fonts.css'),shared('styles/tokens.css'),shared('styles/global.css'),shared('styles/starlight.css'),own('styles/reading.css')],
  components:{Header:shared('components/docs/Header.astro'),ThemeProvider:shared('components/docs/ThemeProvider.astro'),ThemeSelect:shared('components/docs/ThemeSelect.astro'),SiteTitle:shared('components/docs/SiteTitle.astro'),Footer:own('components/Footer.astro')},
  social:[{icon:'github',label:'GitHub',href:'https://github.com/Wolfsblvt/diffdevil'}],
  expressiveCode:{themes:[diffdevilSyntax],useStarlightDarkModeSwitch:false,useStarlightUiThemeColors:false,styleOverrides:{codeFontFamily:'var(--font-mono)',codeFontSize:'13px',codeLineHeight:'1.6',borderRadius:'10px'}},
  head:[{tag:'script',content:themeScript},{tag:'link',attrs:{rel:'icon',href:'/favicon.svg',type:'image/svg+xml'}},
   {tag:'link',attrs:{rel:'apple-touch-icon',href:'/apple-touch-icon.png'}},
   {tag:'link',attrs:{rel:'icon',href:'/favicon-192.png',type:'image/png',sizes:'192x192'}},
   {tag:'link',attrs:{rel:'mask-icon',href:'/mask-icon.svg',color:'#f061ba'}},
   {tag:'link',attrs:{rel:'sitemap',href:'/sitemap.xml'}},
   {tag:'meta',attrs:{name:'theme-color',content:'#151922'}}],
  pagination:true,lastUpdated:false,credits:false,favicon:'/favicon.svg',
 })],
 markdown:{shikiConfig:{theme:diffdevilSyntax}},
 vite:{resolve:{alias:engineAliases},server:{fs:{allow:[root]}}},
});
