// SPDX-License-Identifier: AGPL-3.0-only
/** Build the two publication outputs. This command never invokes a provider. */
import { legalOperator } from '../apps/website/legal-operator.mjs';
import { npm } from './manual-package.mjs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

process.env.DIFFDEVIL_WEBSITE_PUBLICATION = '1';
// Check the operator before an expensive build; never log the projection.
legalOperator();
const git = args => execFileSync('git', args, { encoding: 'utf8', windowsHide: true }).trim();
if (git(['status', '--porcelain', '--untracked-files=normal'])) throw new Error('Commit the exact source candidate before building publication artifacts.');
const source = git(['rev-parse', 'HEAD']);
// The two availability switches (apps/website/src/data/availability.ts) are independent explicit inputs: a surface
// opens only when its real public destination is supplied here, and an unexpected destination refuses the build.
function destination(name, prefix) {
  const value = (process.env[name] ?? '').trim();
  if (value && !value.startsWith(prefix)) throw new Error(`${name} must be a ${prefix}… destination, or empty while the surface is coming.`);
  return value;
}
const store = destination('DIFFDEVIL_PUBLICATION_STORE_URL', 'https://chromewebstore.google.com/detail/');
const appInstall = destination('DIFFDEVIL_PUBLICATION_APP_INSTALL_URL', 'https://github.com/apps/');
Object.assign(process.env, {
  DIFFDEVIL_SOURCE_REF: source,
  DIFFDEVIL_SITE_ORIGIN: 'https://diffdevil.dev',
  DIFFDEVIL_EDIT_REF: 'main',
  PUBLIC_PLAYGROUND_API: 'https://diffdevil-playground.wolfsblvt.workers.dev',
  PUBLIC_APP_INSTALL_URL: appInstall, PUBLIC_DASHBOARD_URL: '', PUBLIC_CHROME_WEB_STORE_URL: store,
  PUBLIC_DISCORD_URL: '', PUBLIC_BLUESKY_URL: '',
});
delete process.env.DIFFDEVIL_DOCS_QA;
// A local candidate is not an immutable published download manifest.
delete process.env.DIFFDEVIL_PUBLISHED_RELEASE_MANIFEST;
npm(['run', 'website:build']);
function files(directory, prefix = '') {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = `${prefix}${entry.name}`;
    if (entry.isDirectory()) return files(`${directory}/${entry.name}`, `${path}/`);
    const bytes = readFileSync(`${directory}/${entry.name}`);
    return [{ path, size: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }];
  }).sort((a, b) => a.path.localeCompare(b.path));
}
writeFileSync('artifacts/website/publication.json', JSON.stringify({ source,
  availability: { extension: store ? 'open' : 'coming', app: appInstall ? 'open' : 'coming' },
  site: files('artifacts/website/dist'), docs: files('artifacts/manual/dist'),
}, null, 2) + '\n');
console.log('Publication build complete; exact output hashes: artifacts/website/publication.json. No upload performed.');
