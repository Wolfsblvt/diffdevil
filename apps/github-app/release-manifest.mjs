// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * Derive the App-family release manifest for one exact source commit.
 *
 *   node apps/github-app/release-manifest.mjs --source-ref <40-hex commit> [--development] [--repo <git dir>] [--output <dir>]
 *
 * Everything is read from the commit through Git, never from the working tree, so the manifest describes the immutable
 * source an `app-vX.Y.Z` tag names. The manifest is the asset a family-aware consumer reads after selecting a release;
 * docs/RELEASING.md owns that selection contract. Nothing here tags, publishes or deploys.
 */
import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const MANIFEST_KIND = 'diffdevil.app-release';
export const MANIFEST_SCHEMA_VERSION = '1.0';
export const RELEASE_METADATA_PATH = 'apps/github-app/release.json';
// Public App releases are Community source. The private extension joins at this path only in a composite.
export const PREMIUM_EXTENSION_PATH = 'premium';
/**
 * The AGPLv3 section 7 additional permission at the two premium interfaces (LICENSES/README.md). Its notice belongs on
 * every licensed file of the App program, so a contribution to those files carries it and every declared interface
 * file is actually covered by the permission a consumer relies on.
 */
export const PREMIUM_INTERFACE_PERMISSION = Object.freeze({
  id: 'AdditionRef-diffdevil-premium-interface-exception-1.0',
  path: 'LICENSES/AdditionRef-diffdevil-premium-interface-exception-1.0.txt',
  expression: 'AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0',
  programPaths: Object.freeze(['apps/app/', 'apps/github-app/', 'apps/shared/'])
});
// The permission's two named interfaces; a declaration lists the files of each.
export const PREMIUM_INTERFACES = Object.freeze(['service', 'application']);
const REPOSITORY = 'Wolfsblvt/diffdevil';
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/u;
const COMMIT = /^[0-9a-f]{40}$/u;
const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));

function fail(message) {
  throw Object.assign(new Error(message), { code: 'E_APP_RELEASE' });
}

function git(repo, args) {
  const result = spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8', windowsHide: true });
  return { ok: result.status === 0, stdout: result.stdout?.trim() ?? '', stderr: (result.stderr || result.stdout || '').trim() };
}

function readJsonAt(repo, commit, path) {
  const shown = git(repo, ['show', `${commit}:${path}`]);
  if (!shown.ok) fail(`${path} is absent at ${commit}.`);
  try {
    return JSON.parse(shown.stdout);
  } catch (error) {
    fail(`${path} at ${commit} is not valid JSON: ${error.message}`);
  }
}

function pathExistsAt(repo, commit, path) {
  return git(repo, ['cat-file', '-e', `${commit}:${path}`]).ok;
}

const isRelativePosixPath = path => typeof path === 'string' && path.length > 0 && !path.startsWith('/') && !path.includes('\\') && !path.split('/').includes('..');

/**
 * The premium seam is declared in release metadata: one integer contract version and the files of each named
 * interface. Every declared file must exist in the very tree it describes, lie inside the App program and carry the
 * permission's notice; otherwise the release would offer an interface the permission does not cover.
 */
function premiumSeam(repo, commit, declared) {
  if (declared === null || declared === undefined) return null;
  const { version, interfaces } = declared;
  if (!Number.isInteger(version) || version < 1) fail(`premiumSeam.version must be a positive integer, not ${JSON.stringify(version)}.`);
  if (!interfaces || typeof interfaces !== 'object' || Object.keys(interfaces).sort().join() !== [...PREMIUM_INTERFACES].sort().join()) {
    fail(`premiumSeam.interfaces must name exactly the ${PREMIUM_INTERFACES.join(' and ')} interfaces.`);
  }
  if (!pathExistsAt(repo, commit, PREMIUM_INTERFACE_PERMISSION.path)) fail(`premiumSeam is declared, but ${commit} lacks ${PREMIUM_INTERFACE_PERMISSION.path}.`);
  const declaredInterfaces = {};
  for (const name of PREMIUM_INTERFACES) {
    const paths = interfaces[name];
    if (!Array.isArray(paths) || paths.length === 0 || !paths.every(isRelativePosixPath) || new Set(paths).size !== paths.length) {
      fail(`premiumSeam.interfaces.${name} must be a non-empty list of distinct repository-relative POSIX paths.`);
    }
    const outside = paths.filter(path => !PREMIUM_INTERFACE_PERMISSION.programPaths.some(prefix => path.startsWith(prefix)));
    if (outside.length) fail(`premiumSeam ${name} interface files must lie in the App program (${PREMIUM_INTERFACE_PERMISSION.programPaths.join(', ')}): ${outside.join(', ')}.`);
    const missing = paths.filter(path => !pathExistsAt(repo, commit, path));
    if (missing.length) fail(`premiumSeam ${version} is declared, but ${commit} lacks ${missing.join(', ')}.`);
    const uncovered = paths.filter(path => !git(repo, ['show', `${commit}:${path}`]).stdout.includes(PREMIUM_INTERFACE_PERMISSION.expression));
    if (uncovered.length) fail(`premiumSeam ${name} interface files lack the ${PREMIUM_INTERFACE_PERMISSION.id} notice at ${commit}: ${uncovered.join(', ')}.`);
    declaredInterfaces[name] = [...paths];
  }
  return {
    version,
    interfaces: declaredInterfaces,
    permission: { id: PREMIUM_INTERFACE_PERMISSION.id, path: PREMIUM_INTERFACE_PERMISSION.path }
  };
}

/**
 * Build the manifest object for `commit`. A release build requires the selected non-null App version; a development
 * manifest describes an unreleased commit with the same seam and source identity for a local joined consumer.
 */
export function appReleaseManifest({ repo = root, sourceRef, development = false } = {}) {
  if (!COMMIT.test(sourceRef ?? '')) fail('--source-ref must be a full 40-character Git commit SHA.');
  const commit = git(repo, ['rev-parse', '--verify', '--quiet', `${sourceRef}^{commit}`]);
  if (!commit.ok || commit.stdout !== sourceRef) fail(`${sourceRef} is not a commit in ${repo}.`);
  const tree = git(repo, ['rev-parse', `${sourceRef}^{tree}`]).stdout;

  const metadata = readJsonAt(repo, sourceRef, RELEASE_METADATA_PATH);
  if (metadata.family !== 'app') fail(`${RELEASE_METADATA_PATH} must declare family "app".`);
  const { version } = metadata;
  if (version === null && !development) fail(`${RELEASE_METADATA_PATH} has version null at ${sourceRef}: select the App version before building a release manifest.`);
  if (version !== null && !SEMVER.test(version ?? '')) fail(`${RELEASE_METADATA_PATH} version ${JSON.stringify(version)} is not SemVer without build metadata.`);
  if (pathExistsAt(repo, sourceRef, PREMIUM_EXTENSION_PATH)) fail(`${sourceRef} contains ${PREMIUM_EXTENSION_PATH}/; a public App release is Community source, not a composite.`);

  const engine = readJsonAt(repo, sourceRef, 'package.json').version;
  const prerelease = version !== null && SEMVER.exec(version)[4] !== undefined;
  return {
    kind: MANIFEST_KIND,
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    family: 'app',
    version,
    tag: development ? null : `app-v${version}`,
    channel: development ? 'development' : prerelease ? 'prerelease' : 'stable',
    source: { repository: REPOSITORY, commit: sourceRef, tree },
    // The root package version at this commit names the engine source, not a published npm artifact.
    engine: { declaredVersion: engine },
    premiumSeam: premiumSeam(repo, sourceRef, metadata.premiumSeam)
  };
}

/** The exact release asset name a consumer reads; development manifests never become release assets. */
export function manifestAssetName(manifest) {
  return manifest.channel === 'development'
    ? `diffdevil-app-development-${manifest.source.commit}.release.json`
    : `diffdevil-app-${manifest.version}.release.json`;
}

function parseArgs(argv) {
  const options = { development: false };
  for (let index = 0; index < argv.length; index += 1) {
    const name = argv[index];
    if (name === '--development') { options.development = true; continue; }
    if (!['--source-ref', '--repo', '--output'].includes(name)) fail(`Unknown option ${name}.`);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) fail(`${name} needs a value.`);
    options[name.slice(2).replace(/-(\w)/gu, (_, letter) => letter.toUpperCase())] = value;
    index += 1;
  }
  return options;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    const options = parseArgs(process.argv.slice(2));
    const manifest = appReleaseManifest({ repo: resolve(options.repo ?? root), sourceRef: options.sourceRef, development: options.development });
    const output = resolve(options.output ?? join(root, 'artifacts/release/app', manifest.version ?? 'development'));
    const path = join(output, manifestAssetName(manifest));
    await mkdir(output, { recursive: true });
    await writeFile(path, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`${manifest.channel} App manifest ${path}`);
    console.log(`  source ${manifest.source.commit} tree ${manifest.source.tree}`);
    console.log(`  premium seam ${manifest.premiumSeam ? `v${manifest.premiumSeam.version} under ${manifest.premiumSeam.permission.id}` : 'not declared'}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
