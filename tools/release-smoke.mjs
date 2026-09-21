import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';

const root = fileURLToPath(new URL('..', import.meta.url));
const temporary = await mkdtemp(join(tmpdir(), 'diffdevil-release-smoke-'));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

function run(command, args, cwd = root) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 16 * 1024 * 1024,
    env: { ...process.env, NO_COLOR: '1' },
  });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `${command} ${args.join(' ')}\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}

function zipEntries(bytes) {
  const entries = [];
  let offset = 0;
  while (offset + 4 <= bytes.length && bytes.readUInt32LE(offset) === 0x04034b50) {
    const flags = bytes.readUInt16LE(offset + 6);
    const method = bytes.readUInt16LE(offset + 8);
    const compressedSize = bytes.readUInt32LE(offset + 18);
    const size = bytes.readUInt32LE(offset + 22);
    const nameLength = bytes.readUInt16LE(offset + 26);
    const extraLength = bytes.readUInt16LE(offset + 28);
    assert.equal(flags & 1, 0, 'Release ZIP members must not be encrypted.');
    assert.equal(method, 8, 'Release ZIP members must use DEFLATE.');
    const nameStart = offset + 30;
    const payloadStart = nameStart + nameLength + extraLength;
    const name = bytes.subarray(nameStart, nameStart + nameLength).toString('utf8');
    const payload = bytes.subarray(payloadStart, payloadStart + compressedSize);
    const source = inflateRawSync(payload);
    assert.equal(source.length, size, `ZIP member size mismatch: ${name}`);
    assert.ok(name && !name.startsWith('/') && !name.includes('\\') && !name.split('/').includes('..'), `Unsafe ZIP member path: ${name}`);
    entries.push({ name, size, compressedSize, source });
    offset = payloadStart + compressedSize;
  }
  assert.ok(entries.length > 0, 'Release ZIP must contain files.');
  assert.equal(bytes.readUInt32LE(offset), 0x02014b50, 'Release ZIP local entries must be followed by the central directory.');
  return entries;
}

async function extract(entries, destination) {
  for (const entry of entries) {
    const target = resolve(destination, entry.name);
    assert.equal(relative(destination, target).startsWith('..'), false, `ZIP member escapes extraction root: ${entry.name}`);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, entry.source);
  }
}

const executableOrNativeExtensions = new Set(['.cmd', '.dll', '.dylib', '.exe', '.node', '.ps1', '.sh', '.so']);
function dependencyName(name) {
  const marker = '/node_modules/';
  const start = name.indexOf(marker);
  if (start === -1) return undefined;
  const parts = name.slice(start + marker.length).split('/');
  return parts[0]?.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}
function expectedBudget(entries, compressedBytes) {
  const dependencies = new Map();
  for (const entry of entries) {
    const name = dependencyName(`/${entry.name}`);
    if (name) dependencies.set(name, (dependencies.get(name) ?? 0) + entry.size);
  }
  const bySize = (left, right) => right.size - left.size || left.name.localeCompare(right.name);
  return {
    compressedBytes,
    uncompressedBytes: entries.reduce((total, entry) => total + entry.size, 0),
    memberCount: entries.length,
    largestMembers: entries.map(({ name, size }) => ({ name, size })).sort(bySize).slice(0, 10),
    executableOrNativeExtensions: [...new Set(entries.map(entry => extname(entry.name).toLowerCase()).filter(extension => executableOrNativeExtensions.has(extension)))].sort(),
    majorDependencyContributors: [...dependencies].map(([name, size]) => ({ name, size })).sort(bySize).slice(0, 10),
  };
}

async function verifyManifest(directory, manifestPath, entries) {
  const manifest = JSON.parse(await readFile(join(directory, manifestPath), 'utf8'));
  const files = Object.fromEntries(entries
    .filter(entry => entry.name !== manifestPath)
    .map(entry => [entry.name, sha256(entry.source)]));
  assert.deepEqual(manifest.files, files, `${manifestPath} must cover the exact carrier tree except itself.`);
  return manifest;
}

function runCarrier(directory, script, args) {
  return run(process.execPath, [join(directory, script), ...args], directory);
}

try {
  const sourceRef = run('git', ['rev-parse', 'HEAD']).trim();
  const first = join(temporary, 'first');
  const second = join(temporary, 'second');
  for (const output of [first, second]) {
    run(process.execPath, [join(root, 'tools/build-release.mjs'), '--source-ref', sourceRef, '--output', output, '--epoch', '0']);
  }

  const manifestName = 'diffdevil-release-manifest.json';
  const firstManifestBytes = await readFile(join(first, manifestName));
  const secondManifestBytes = await readFile(join(second, manifestName));
  assert.deepEqual(firstManifestBytes, secondManifestBytes, 'Release manifests must be reproducible.');
  const release = JSON.parse(firstManifestBytes);
  assert.equal(release.source.commit, sourceRef);
  assert.equal(release.skills.diffdevil.version, JSON.parse(await readFile(join(root, 'skills/versions.json'), 'utf8')).diffdevil);

  const extracted = {};
  const archiveEntries = {};
  for (const [kind, asset] of Object.entries(release.assets)) {
    const firstBytes = await readFile(join(first, asset.name));
    const secondBytes = await readFile(join(second, asset.name));
    assert.deepEqual(firstBytes, secondBytes, `${kind} archive must be reproducible.`);
    assert.equal(asset.sha256, sha256(firstBytes), `${kind} archive digest mismatch.`);
    assert.equal(asset.size, firstBytes.length, `${kind} archive size mismatch.`);
    const entries = zipEntries(firstBytes);
    assert.deepEqual(asset.archive, expectedBudget(entries, firstBytes.length), `${kind} archive budget/readback mismatch.`);
    archiveEntries[kind] = entries;
    extracted[kind] = join(temporary, `extracted-${kind}`);
    await extract(entries, extracted[kind]);
  }

  const skillManifest = await verifyManifest(extracted.skill, 'MANIFEST.json', archiveEntries.skill);
  assert.equal(skillManifest.skillVersion, release.skills.diffdevil.version);
  assert.equal(sha256(JSON.stringify(skillManifest.files)), release.skills.diffdevil.treeSha256, 'Canonical Skill tree digest mismatch.');
  const standaloneManifest = await verifyManifest(extracted.standalone, 'runtime/MANIFEST.json', archiveEntries.standalone);
  assert.equal(standaloneManifest.productVersion, release.productVersion);
  const bundledManifest = await verifyManifest(extracted.bundled, 'MANIFEST.json', archiveEntries.bundled);
  assert.equal(bundledManifest.skillVersion, release.skills.diffdevil.version);
  assert.equal(bundledManifest.productVersion, release.productVersion);

  const diff = join(root, 'docs/examples/diffs/review.diff');
  for (const [kind, script] of [['standalone', 'scripts/run.mjs'], ['bundled', 'scripts/run.mjs']]) {
    assert.equal(runCarrier(extracted[kind], script, ['--version']), `${release.productVersion}\n`);
    const report = JSON.parse(runCarrier(extracted[kind], script, ['analyze', '--diff-file', diff, '--format', 'json']));
    assert.equal(report.kind, 'diffdevil.report');
  }

  console.log(JSON.stringify({
    sourceRef,
    productVersion: release.productVersion,
    skillVersion: release.skills.diffdevil.version,
    runtimes: { node: process.version, platform: process.platform },
    assets: Object.fromEntries(Object.entries(release.assets).map(([kind, asset]) => [kind, { name: asset.name, sha256: asset.sha256, archive: asset.archive }])),
    result: 'release archives reproduced, read back, extracted, and executed',
  }, null, 2));
} finally {
  await rm(temporary, { recursive: true, force: true });
}
