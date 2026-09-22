import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { files, sha256, stageRuntimeClosure } from './distribution.mjs';
import { writeDeterministicZip } from './deterministic-zip.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const options = new Map(process.argv.slice(2).flatMap((value, index, values) => value.startsWith('--') ? [[value.slice(2), values[index + 1]]] : []));
const product = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const skill = JSON.parse(await readFile(join(root, 'skills/versions.json'), 'utf8'));
const skillSource = await readFile(join(root, 'skills/diffdevil/SKILL.md'), 'utf8');
const productVersion = options.get('product-version') ?? product.version;
const skillVersion = skill.diffdevil;
const sourceRef = options.get('source-ref');
if (!sourceRef) throw new Error('build-release requires --source-ref <immutable source commit>.');
if (!/^[0-9a-f]{40}$/u.test(sourceRef)) throw new Error('--source-ref must be a full 40-character Git commit SHA.');
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/u.test(productVersion) || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/u.test(skillVersion)) {
  throw new Error('Product and Skill versions must be SemVer.');
}
if (Object.keys(skill).length !== 1 || typeof skill.diffdevil !== 'string') throw new Error('skills/versions.json must be the exact generated diffdevil version projection.');
const frontmatterVersion = skillSource.match(/^metadata:\s*$[\s\S]*?^\s+version:\s*["']([^"']+)["']\s*$/mu)?.[1];
if (frontmatterVersion !== skillVersion) throw new Error(`skills/versions.json (${skillVersion}) does not match SKILL.md metadata.version (${frontmatterVersion ?? 'missing'}).`);
if (options.has('skill-version') && options.get('skill-version') !== skillVersion) throw new Error('--skill-version cannot override the canonical Skill version projection.');
const output = resolve(options.get('output') ?? join(root, 'artifacts/release', productVersion));
const releaseBase = options.get('release-base') ?? `https://github.com/Wolfsblvt/diffdevil/releases/download/v${productVersion}`;
const epoch = Number(options.get('epoch') ?? 0);
if (!Number.isInteger(epoch) || epoch < 0 || epoch > 0x7fffffff) throw new Error('--epoch must be a non-negative Unix timestamp.');

async function writeZip(directory, destination) {
  const members = await Promise.all((await files(directory)).map(async path => ({ name: relative(directory, path).replaceAll('\\', '/'), source: await readFile(path) })));
  const entries = await writeDeterministicZip(members, destination, { epoch });
  return entries.map(entry => ({ name: entry.name, size: entry.size, compressedSize: entry.compressedSize }));
}

const executableOrNativeExtensions = new Set(['.cmd', '.dll', '.dylib', '.exe', '.node', '.ps1', '.sh', '.so']);
function dependencyName(name) {
  const marker = '/node_modules/';
  const start = name.indexOf(marker);
  if (start === -1) return undefined;
  const parts = name.slice(start + marker.length).split('/');
  return parts[0]?.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}
function archiveBudget(entries, compressedBytes) {
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
  await writeFile(join(runtimeRoot, 'package.json'), JSON.stringify({ name: 'diffdevil-standalone', private: true, type: 'module', version: productVersion }, null, 2) + '\n');
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
  // The bundle owns one root manifest. Do not copy the Skill-only root manifest
  // into that same path and then hash bytes that the bundle manifest replaces.
  await rm(join(bundledRoot, 'MANIFEST.json'));
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
    const entries = await writeZip(directory, path);
    const data = await readFile(path);
    const size = (await stat(path)).size;
    return [key, { name, url: `${releaseBase}/${name}`, sha256: sha256(data), size, archive: archiveBudget(entries, size), ...(key === 'skill' ? {} : { node: '>=22' }) }];
  })));
  const release = {
    kind: 'diffdevil.release-manifest', schemaVersion: '1.0',
    source: { repository: 'Wolfsblvt/diffdevil', commit: sourceRef },
    productVersion,
    skills: { diffdevil: { version: skillVersion, sourcePath: 'skills/diffdevil', sourceCommit: sourceRef, treeSha256: skillTreeSha256 } },
    assets: locations,
  };
  await writeFile(join(output, 'diffdevil-release-manifest.json'), JSON.stringify(release, null, 2) + '\n');
  console.log(JSON.stringify({ output, release, reproducibility: { archive: 'deterministic ZIP member order, DEFLATE level 9, and --epoch timestamps' } }, null, 2));
} finally {
  await rm(temporary, { recursive: true, force: true });
}
