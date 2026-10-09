// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Run an Astro command for the signed-in App with the surface facts its shared header needs:
 * links back to the product site are absolute, and the header's trailing action points at
 * the App origin. Build only: no deployment, publication, remote preview or account effect.
 *
 *   node tools/app-command.mjs build|dev|preview [extra astro args]
 */
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { origins } from '../apps/website/public-origins.mjs';

const [command, ...rest] = process.argv.slice(2);
if (!['build', 'dev', 'preview'].includes(command)) { console.error('Expected build, dev or preview.'); process.exit(2); }
const appOrigin = process.env.DIFFDEVIL_APP_ORIGIN ?? origins.app;
const extra = command === 'dev' ? ['--host', '127.0.0.1', '--port', '4411'] : command === 'preview' ? ['--host', '127.0.0.1', '--port', '4412'] : [];
const result = spawnSync(process.execPath, [resolve('node_modules/astro/bin/astro.mjs'), command, '--root', 'apps/app', ...extra, ...rest], {
  stdio: 'inherit', windowsHide: true,
  env: { ...process.env, DIFFDEVIL_SURFACE: 'app', DIFFDEVIL_SITE_ORIGIN: origins.site, PUBLIC_DASHBOARD_URL: `${appOrigin}/`, DIFFDEVIL_APP_ORIGIN: appOrigin }
});
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 2);
