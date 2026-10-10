// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { PREMIUM_INTERFACE_PERMISSION, appReleaseManifest, manifestAssetName } from './release-manifest.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));
const INTERFACES = { service: ['apps/github-app/analytical-data.mjs'], application: ['apps/app/premium-selection.mjs', 'apps/app/src/premium/registry.mjs'] };
const SEAM = { version: 1, interfaces: INTERFACES };
const covered = `// SPDX-License-Identifier: ${PREMIUM_INTERFACE_PERMISSION.expression}\nexport {};\n`;
const seamFiles = Object.fromEntries(Object.values(INTERFACES).flat().map(path => [path, covered]));
const permissionFile = { [PREMIUM_INTERFACE_PERMISSION.path]: 'exception text\n' };

function git(repo, ...args) {
  const result = spawnSync('git', ['-C', repo, '-c', 'user.name=fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false', ...args], { encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

/** Commit `files` into a fresh repository and return its path and commit. */
async function fixture(files) {
  const repo = await mkdtemp(join(tmpdir(), 'diffdevil-app-release-'));
  git(repo, 'init', '--quiet');
  for (const [path, content] of Object.entries({ 'package.json': JSON.stringify({ version: '1.7.4' }), ...files })) {
    await mkdir(dirname(join(repo, path)), { recursive: true });
    await writeFile(join(repo, path), typeof content === 'string' ? content : JSON.stringify(content));
  }
  git(repo, 'add', '--all');
  git(repo, 'commit', '--quiet', '-m', 'fixture');
  return { repo, commit: git(repo, 'rev-parse', 'HEAD'), tree: git(repo, 'rev-parse', 'HEAD^{tree}') };
}

const releaseJson = (version, premiumSeam) => ({ 'apps/github-app/release.json': { family: 'app', version, premiumSeam } });

test('a stable App release manifest projects exact source, engine, both declared interfaces and their permission from the commit', async t => {
  const { repo, commit, tree } = await fixture({ ...releaseJson('1.2.0', SEAM), ...seamFiles, ...permissionFile });
  t.after(() => rm(repo, { recursive: true, force: true }));
  // A dirty working tree must not leak into a manifest that names an immutable commit.
  await writeFile(join(repo, 'apps/github-app/release.json'), JSON.stringify({ family: 'app', version: '9.9.9' }));
  const manifest = appReleaseManifest({ repo, sourceRef: commit });
  assert.deepEqual(manifest, {
    kind: 'diffdevil.app-release',
    schemaVersion: '1.0',
    family: 'app',
    version: '1.2.0',
    tag: 'app-v1.2.0',
    channel: 'stable',
    source: { repository: 'Wolfsblvt/diffdevil', commit, tree },
    engine: { declaredVersion: '1.7.4' },
    premiumSeam: {
      version: 1,
      interfaces: INTERFACES,
      permission: { id: 'AdditionRef-diffdevil-premium-interface-exception-1.0', path: 'LICENSES/AdditionRef-diffdevil-premium-interface-exception-1.0.txt' }
    }
  });
  assert.equal(manifestAssetName(manifest), 'diffdevil-app-1.2.0.release.json');
});

test('a SemVer suffix is a prerelease channel, never a stable update candidate', async t => {
  const { repo, commit } = await fixture(releaseJson('1.3.0-rc.1', null));
  t.after(() => rm(repo, { recursive: true, force: true }));
  const manifest = appReleaseManifest({ repo, sourceRef: commit });
  assert.equal(manifest.channel, 'prerelease');
  assert.equal(manifest.tag, 'app-v1.3.0-rc.1');
  assert.equal(manifest.premiumSeam, null);
});

test('a development manifest describes an unreleased commit without inventing a tag', async t => {
  const { repo, commit } = await fixture({ ...releaseJson(null, SEAM), ...seamFiles, ...permissionFile });
  t.after(() => rm(repo, { recursive: true, force: true }));
  assert.throws(() => appReleaseManifest({ repo, sourceRef: commit }), /version null/u);
  const manifest = appReleaseManifest({ repo, sourceRef: commit, development: true });
  assert.equal(manifest.channel, 'development');
  assert.equal(manifest.tag, null);
  assert.equal(manifest.version, null);
  assert.equal(manifest.premiumSeam.permission.id, PREMIUM_INTERFACE_PERMISSION.id);
  assert.equal(manifestAssetName(manifest), `diffdevil-app-development-${commit}.release.json`);
});

test('the manifest refuses a seam the permission does not cover', async t => {
  const cases = {
    missingFile: [{ ...releaseJson('1.2.0', SEAM), ...seamFiles, 'apps/github-app/analytical-data.mjs': undefined, ...permissionFile }, /lacks apps\/github-app\/analytical-data\.mjs/u],
    plainAgplNotice: [{ ...releaseJson('1.2.0', SEAM), ...seamFiles, 'apps/app/src/premium/registry.mjs': '// SPDX-License-Identifier: AGPL-3.0-only\n', ...permissionFile }, /application interface files lack the AdditionRef-diffdevil-premium-interface-exception-1\.0 notice at [0-9a-f]{40}: apps\/app\/src\/premium\/registry\.mjs/u],
    missingPermissionText: [{ ...releaseJson('1.2.0', SEAM), ...seamFiles }, /lacks LICENSES\/AdditionRef-diffdevil-premium-interface-exception-1\.0\.txt/u],
    outsideProgram: [{ ...releaseJson('1.2.0', { version: 1, interfaces: { ...INTERFACES, application: ['apps/website/src/x.mjs'] } }), ...seamFiles, 'apps/website/src/x.mjs': covered, ...permissionFile }, /must lie in the App program/u],
    oneInterfaceOnly: [{ ...releaseJson('1.2.0', { version: 1, interfaces: { service: INTERFACES.service } }), ...seamFiles, ...permissionFile }, /exactly the service and application interfaces/u],
    flatPaths: [{ ...releaseJson('1.2.0', { version: 1, paths: Object.values(INTERFACES).flat() }), ...seamFiles, ...permissionFile }, /exactly the service and application interfaces/u],
    emptyInterface: [{ ...releaseJson('1.2.0', { version: 1, interfaces: { ...INTERFACES, service: [] } }), ...seamFiles, ...permissionFile }, /interfaces\.service must be a non-empty list/u],
    escapingPath: [{ ...releaseJson('1.2.0', { version: 1, interfaces: { ...INTERFACES, service: ['apps/github-app/../../x.mjs'] } }), ...seamFiles, ...permissionFile }, /interfaces\.service must be a non-empty list/u],
    badSeamVersion: [{ ...releaseJson('1.2.0', { ...SEAM, version: 0 }), ...seamFiles, ...permissionFile }, /positive integer/u],
    composite: [{ ...releaseJson('1.2.0', null), 'premium/app/index.mjs': 'export {};\n' }, /Community source, not a composite/u],
    badVersion: [releaseJson('1.2', null), /not SemVer/u]
  };
  const fixtures = {};
  for (const [name, [files]] of Object.entries(cases)) fixtures[name] = await fixture(Object.fromEntries(Object.entries(files).filter(([, content]) => content !== undefined)));
  t.after(() => Promise.all(Object.values(fixtures).map(({ repo }) => rm(repo, { recursive: true, force: true }))));
  for (const [name, [, expected]] of Object.entries(cases)) {
    assert.throws(() => appReleaseManifest({ repo: fixtures[name].repo, sourceRef: fixtures[name].commit }), expected, name);
  }
  const { repo, commit } = fixtures.badVersion;
  assert.throws(() => appReleaseManifest({ repo, sourceRef: commit.slice(0, 12) }), /full 40-character/u);
  assert.throws(() => appReleaseManifest({ repo, sourceRef: 'f'.repeat(40) }), /is not a commit/u);
});

test('the repository App metadata stays a valid release source', async () => {
  const metadata = JSON.parse(await readFile(fileURLToPath(new URL('./release.json', import.meta.url)), 'utf8'));
  assert.equal(metadata.family, 'app');
  assert.ok(metadata.version === null || /^\d+\.\d+\.\d+/u.test(metadata.version));
  assert.ok('premiumSeam' in metadata, 'release.json declares premiumSeam, null until the public seam exists');
});

test('every licence notice in the App program carries the premium-interface permission', async () => {
  // A plain AGPL notice inside the program would leave that file, and contributions to it, outside the permission.
  const listed = spawnSync('git', ['-C', root, 'ls-files', '-z', '--', ...PREMIUM_INTERFACE_PERMISSION.programPaths], { encoding: 'utf8', windowsHide: true });
  assert.equal(listed.status, 0, listed.stderr);
  const files = listed.stdout.split('\0').filter(Boolean);
  assert.ok(files.length > 0, 'the App program has tracked files');
  const notices = [];
  for (const file of files) {
    const match = /SPDX-License-Identifier:\s*([^\n*]*?)\s*(?:\*\/|-->|"|$)/mu.exec(await readFile(join(root, file), 'utf8'));
    if (match) notices.push([file, match[1]]);
  }
  assert.ok(notices.length > 0, 'the App program carries licence notices');
  assert.deepEqual(notices.filter(([, expression]) => expression !== PREMIUM_INTERFACE_PERMISSION.expression), []);
  assert.match(await readFile(join(root, PREMIUM_INTERFACE_PERMISSION.path), 'utf8'), /Additional permission under section 7 of the GNU Affero General Public License/u);
});
