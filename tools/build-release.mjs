import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { deflateRawSync } from 'node:zlib';
import { files, sha256, stageRuntimeClosure } from './distribution.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const options = new Map(process.argv.slice(2).flatMap((value, index, values) => value.startsWith('--') ? [[value.slice(2), values[index + 1]]] : []));
const product = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const skill = JSON.parse(await readFile(join(root, 'skills/versions.json'), 'utf8'));
const productVersion = options.get('product-version') ?? product.version;
const skillVersion = options.get('skill-version') ?? skill.diffdevil;
const sourceRef = options.get('source-ref');
if (!sourceRef) throw new Error('build-release requires --source-ref <immutable source commit>.');
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/u.test(productVersion) || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/u.test(skillVersion)) {
  throw new Error('Product and Skill versions must be SemVer.');
}
const output = resolve(options.get('output') ?? join(root, 'artifacts/release', productVersion));
const releaseBase = options.get('release-base') ?? `https://github.com/Wolfsblvt/diffdevil/releases/download/v${productVersion}`;
const epoch = Number(options.get('epoch') ?? 0);
if (!Number.isInteger(epoch) || epoch < 0 || epoch > 0x7fffffff) throw new Error('--epoch must be a non-negative Unix timestamp.');

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function dosTime(unixSeconds) {
  const date = new Date(Math.max(unixSeconds, 315532800) * 1000);
  const time = (date.getUTCHours() << 11) | (date.getUTCMinutes() << 5) | Math.floor(date.getUTCSeconds() / 2);
  const day = ((date.getUTCFullYear() - 1980) << 9) | ((date.getUTCMonth() + 1) << 5) | date.getUTCDate();
  return { time, day };
}
function u16(value) { const bytes = Buffer.alloc(2); bytes.writeUInt16LE(value); return bytes; }
function u32(value) { const bytes = Buffer.alloc(4); bytes.writeUInt32LE(value >>> 0); return bytes; }
async function writeZip(directory, destination) {
  const entries = [];
  const stamp = dosTime(epoch);
  for (const path of await files(directory)) {
    const name = relative(directory, path).replaceAll('\\', '/');
    const source = await readFile(path);
    const payload = deflateRawSync(source, { level: 9 });
    entries.push({ name, source, payload, crc: crc32(source) });
  }
  const chunks = [], central = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name);
    const header = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), u16(20), u16(0x0800), u16(8), u16(stamp.time), u16(stamp.day), u32(entry.crc), u32(entry.payload.length), u32(entry.source.length), u16(name.length), u16(0), name]);
    chunks.push(header, entry.payload);
    central.push(Buffer.concat([Buffer.from([0x50, 0x4b, 0x01, 0x02]), u16(0x0314), u16(20), u16(0x0800), u16(8), u16(stamp.time), u16(stamp.day), u32(entry.crc), u32(entry.payload.length), u32(entry.source.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name]));
    offset += header.length + entry.payload.length;
  }
  const centralBytes = Buffer.concat(central);
  chunks.push(centralBytes, Buffer.concat([Buffer.from([0x50, 0x4b, 0x05, 0x06]), u16(0), u16(0), u16(entries.length), u16(entries.length), u32(centralBytes.length), u32(offset), u16(0)]));
  await writeFile(destination, Buffer.concat(chunks));
  return entries.map(entry => entry.name);
}
async function copyTree(from, to) {
  for (const file of await files(from)) {
    const destination = join(to, relative(from, file));
    await mkdir(resolve(destination, '..'), { recursive: true });
    await cp(file, destination);
  }
}
async function manifest(directory, kind, extra = {}) {
  const members = {};
  for (const file of await files(directory)) members[relative(directory, file).replaceAll('\\', '/')] = sha256(await readFile(file));
  return { kind, schemaVersion: '1.0', source: { repository: 'Wolfsblvt/diffdevil', commit: sourceRef }, productVersion, skillVersion, files: members, ...extra };
}
async function treeDigest(directory) {
  const members = {};
  for (const file of await files(directory)) members[relative(directory, file).replaceAll('\\', '/')] = sha256(await readFile(file));
  return sha256(JSON.stringify(members));
}

await mkdir(output, { recursive: true });
const temporary = await mkdtemp(join(tmpdir(), 'diffdevil-release-'));
try {
  const skillRoot = join(temporary, 'skill');
  await copyTree(join(root, 'skills/diffdevil'), skillRoot);
  const skillTreeSha256 = await treeDigest(skillRoot);
  await writeFile(join(skillRoot, 'MANIFEST.json'), JSON.stringify(await manifest(skillRoot, 'diffdevil.skill'), null, 2) + '\n');
  const runtimeRoot = join(temporary, 'standalone');
  const runtime = join(runtimeRoot, 'runtime');
  const closure = await stageRuntimeClosure({ root, runtime, name: 'diffdevil-standalone-runtime', target: '>=22', description: 'Generated install-free native ESM runtime for the diffdevil CLI.' });
  await copyTree(join(root, 'src/diffdevil/contracts'), join(runtimeRoot, 'src/diffdevil/contracts'));
  await copyTree(join(root, 'src/diffdevil/presets'), join(runtimeRoot, 'src/diffdevil/presets'));
  await writeFile(join(runtime, 'README.md'), '# diffdevil standalone runtime\n\n## Meaning\n\nThis generated Node 22+ runtime contains the compiled CLI, its exact locked production dependency closure, the schema and preset assets the CLI exposes, and redistribution notices. It does not include Node.js itself.\n');
  await writeFile(join(runtimeRoot, 'carrier.json'), JSON.stringify({ kind: 'diffdevil.standalone', schemaVersion: '1.0', source: { repository: 'Wolfsblvt/diffdevil', commit: sourceRef }, productVersion, node: '>=22' }, null, 2) + '\n');
  await mkdir(join(runtimeRoot, 'scripts'), { recursive: true });
  await writeFile(join(runtimeRoot, 'scripts/run.mjs'), `import { spawnSync } from 'node:child_process';\nimport { fileURLToPath } from 'node:url';\nimport { join } from 'node:path';\nconst root = fileURLToPath(new URL('..', import.meta.url));\nconst result = spawnSync(process.execPath, [join(root, 'runtime/lib/cli/main.js'), ...process.argv.slice(2)], { stdio: 'inherit' });\nif (result.error) throw result.error;\nprocess.exitCode = result.status ?? 1;\n`);
  await writeFile(join(runtimeRoot, 'scripts/diffdevil'), '#!/usr/bin/env sh\nexec node "$(dirname "$0")/run.mjs" "$@"\n');
  await writeFile(join(runtimeRoot, 'scripts/diffdevil.cmd'), '@echo off\r\nnode "%~dp0run.mjs" %*\r\n');
  await writeFile(join(runtime, 'MANIFEST.json'), JSON.stringify(await manifest(runtimeRoot, 'diffdevil.standalone-runtime', { node: '>=22', dependencies: closure.dependencies }), null, 2) + '\n');
  const bundledRoot = join(temporary, 'bundled');
  await copyTree(skillRoot, bundledRoot);
  await copyTree(runtimeRoot, join(bundledRoot, 'runtime-bundle'));
  await writeFile(join(bundledRoot, 'carrier.json'), JSON.stringify({ kind: 'diffdevil.skill-with-runtime', schemaVersion: '1.0', source: { repository: 'Wolfsblvt/diffdevil', commit: sourceRef }, productVersion, skillVersion, node: '>=22' }, null, 2) + '\n');
  await mkdir(join(bundledRoot, 'scripts'), { recursive: true });
  await writeFile(join(bundledRoot, 'scripts/run.mjs'), `import { spawnSync } from 'node:child_process';\nimport { fileURLToPath } from 'node:url';\nimport { join } from 'node:path';\nconst root = fileURLToPath(new URL('..', import.meta.url));\nconst result = spawnSync(process.execPath, [join(root, 'runtime-bundle/runtime/lib/cli/main.js'), ...process.argv.slice(2)], { stdio: 'inherit' });\nif (result.error) throw result.error;\nprocess.exitCode = result.status ?? 1;\n`);
  await writeFile(join(bundledRoot, 'MANIFEST.json'), JSON.stringify(await manifest(bundledRoot, 'diffdevil.skill-with-runtime', { node: '>=22' }), null, 2) + '\n');
  const names = {
    skill: `diffdevil-skill-${skillVersion}.zip`,
    standalone: `diffdevil-standalone-${productVersion}-node22.zip`,
    bundled: `diffdevil-skill-${skillVersion}-with-diffdevil-${productVersion}-node22.zip`,
  };
  const locations = Object.fromEntries(await Promise.all(Object.entries(names).map(async ([key, name]) => {
    const directory = key === 'skill' ? skillRoot : key === 'standalone' ? runtimeRoot : bundledRoot;
    const path = join(output, name);
    await writeZip(directory, path);
    const data = await readFile(path);
    return [key, { name, url: `${releaseBase}/${name}`, sha256: sha256(data), size: (await stat(path)).size, ...(key === 'skill' ? {} : { node: '>=22' }) }];
  })));
  const release = {
    kind: 'diffdevil.release-manifest', schemaVersion: '1.0',
    source: { repository: 'Wolfsblvt/diffdevil', commit: sourceRef },
    productVersion,
    skills: { diffdevil: { version: skillVersion, sourcePath: 'skills/diffdevil', sourceCommit: sourceRef, treeSha256: skillTreeSha256 } },
    assets: locations,
  };
  await writeFile(join(output, 'release-manifest.json'), JSON.stringify(release, null, 2) + '\n');
  console.log(JSON.stringify({ output, release, reproducibility: { archive: 'deterministic ZIP member order, DEFLATE level 9, and --epoch timestamps' } }, null, 2));
} finally {
  await rm(temporary, { recursive: true, force: true });
}
