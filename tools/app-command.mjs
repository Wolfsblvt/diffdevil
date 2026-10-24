// SPDX-License-Identifier: MIT
/**
 * Run an Astro command for the signed-in App with the surface facts its shared header needs:
 * links back to the product site are absolute, and the header's trailing action points at
 * the App origin. Build only: no deployment, publication, remote preview or account effect.
 *
 *   node tools/app-command.mjs build|dev|preview [--staging] [extra astro args]
 */
import { spawnSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { origins } from '../apps/website/public-origins.mjs';
import { selectPremium } from '../apps/app/premium-selection.mjs';
import { appBuildTarget } from '../apps/app/build-target.mjs';
import { writeWebAppAssets } from './web-app-assets.mjs';

const [command, ...rest] = process.argv.slice(2);
if (!['build', 'dev', 'preview'].includes(command)) { console.error('Expected build, dev or preview.'); process.exit(2); }
const targetEnv = { ...process.env, ...(rest.includes('--staging') ? { DIFFDEVIL_APP_TARGET: 'staging' } : {}) };
const target = appBuildTarget(targetEnv);
// A fixed-path check must not build one target and qualify another target's old artifact.
const expectedTarget = rest.find(argument => argument.startsWith('--expect-target='))?.slice('--expect-target='.length);
if (expectedTarget !== undefined && target.name !== expectedTarget) {
  console.error(`App check expected target ${expectedTarget}, but selected ${target.name}. Use check:app:staging for staging, or restore DIFFDEVIL_APP_TARGET before check:app.`);
  process.exit(2);
}
const appOrigin = target.origin;
if (command === 'build' || command === 'dev') {
  writeWebAppAssets('app', 'apps/app/public');
  const discoverable = target.name === 'production';
  writeFileSync('apps/app/public/robots.txt', `User-agent: *\n${discoverable ? 'Allow: /' : 'Disallow: /'}\nSitemap: ${appOrigin}/sitemap.xml\n`);
  writeFileSync('apps/app/public/sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    + (discoverable ? `<url><loc>${appOrigin}/</loc></url>` : '') + '</urlset>\n');
}
const astroArgs = rest.filter(argument => argument !== '--staging' && !argument.startsWith('--expect-target='));
const extra = command === 'dev' ? ['--host', '127.0.0.1', '--port', '4411'] : command === 'preview' ? ['--host', '127.0.0.1', '--port', '4412'] : [];
const result = spawnSync(process.execPath, [resolve('node_modules/astro/bin/astro.mjs'), command, '--root', 'apps/app', ...extra, ...astroArgs], {
  stdio: 'inherit', windowsHide: true,
  env: { ...targetEnv, DIFFDEVIL_SURFACE: 'app', DIFFDEVIL_SITE_ORIGIN: origins.site, PUBLIC_DASHBOARD_URL: `${appOrigin}/`, DIFFDEVIL_APP_ORIGIN: appOrigin }
});
if (result.error) console.error(result.error.message);
// A build records the edition it joined, so qualification asserts the right journeys (Community, or Community plus premium).
if (command === 'build' && result.status === 0) {
  const selection = selectPremium();
  const notices = [await readFile(resolve('apps/app/THIRD-PARTY-NOTICES.txt'), 'utf8')];
  const privateNotices = selection.provided ? resolve(dirname(selection.entry), '..', 'THIRD-PARTY-NOTICES.txt') : null;
  if (privateNotices && existsSync(privateNotices)) notices.push(await readFile(privateNotices, 'utf8'));
  await writeFile(join(target.artifacts, 'dist/client/third-party-notices.txt'), notices.join('\n\n'));
  const qa = selection.provided ? join(dirname(selection.entry), 'qa', 'journeys.mjs') : null;
  await mkdir(target.artifacts, { recursive: true });
  await writeFile(join(target.artifacts, 'edition.json'), `${JSON.stringify({ target: target.name, origin: target.origin, premium: selection.provided, reason: selection.reason, entry: selection.provided ? relative(resolve('.'), selection.entry) : null, qa: qa && existsSync(qa) ? relative(resolve('.'), qa) : null, builtAt: new Date().toISOString() }, null, 2)}
`);
}
process.exit(result.status ?? 2);
