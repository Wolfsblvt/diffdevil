// SPDX-License-Identifier: MIT
import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { files } from './distribution.mjs';
import { readDeterministicZip, writeDeterministicZip, zipTimestamp } from './deterministic-zip.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const unpacked = join(root, 'artifacts/browser-extension/unpacked');
const receiptPath = join(root, 'artifacts/browser-extension/build-receipt.json');
const output = join(root, 'artifacts/browser-extension/package');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const requiredMembers = new Set(['background.js', 'content.css', 'content.js', 'licenses.html', 'manifest.json', 'options.css', 'options.html', 'options.js', 'privacy.html', 'theme.js', 'assets/diffdevil-brand.svg', 'assets/icon-16.png', 'assets/icon-32.png', 'assets/icon-48.png', 'assets/icon-128.png', 'assets/diffdevil-symbol-micro-dark.svg', 'assets/diffdevil-symbol-micro-light.svg', 'assets/diffdevil-wordmark-dark.svg', 'assets/diffdevil-wordmark-light.svg', 'licenses/AGPL-3.0-only.txt', 'licenses/MIT.txt', 'licenses/ajv.txt', 'licenses/chevrotain.txt', 'licenses/fast-deep-equal.txt', 'licenses/fast-uri.txt', 'licenses/json-schema-traverse.txt', 'licenses/yaml.txt']);
const allowedMember = path => requiredMembers.has(path) || /^assets\/diffdevil-(?:lockup|symbol-(?:master|micro)|wordmark(?:-tail)?)-(?:dark|light)-[A-Z0-9]+\.svg$/u.test(path) || /^assets\/ibm-plex-(?:mono|sans)-latin-(?:400|600)-normal\.woff2$/u.test(path) || /^licenses\/IBM-Plex-(?:Mono|Sans)-OFL\.txt$/u.test(path) || /^chunks\/chunk-[A-Z0-9]+\.js$/u.test(path);

function exactReceipt(receipt) {
  if (!receipt || typeof receipt.version !== 'string' || !Array.isArray(receipt.files)) throw new Error('The extension build receipt is invalid. Run npm run extension:build first.');
  const entries = new Map();
  for (const entry of receipt.files) {
    if (!entry || typeof entry.path !== 'string' || !Number.isInteger(entry.bytes) || entry.bytes < 0 || !/^[0-9a-f]{64}$/u.test(entry.sha256) || entries.has(entry.path)) throw new Error('The extension build receipt has invalid or duplicate file entries.');
    if (!allowedMember(entry.path)) throw new Error(`The extension build receipt names a package member outside the strict allowlist: ${entry.path}`);
    entries.set(entry.path, entry);
  }
  for (const path of requiredMembers) if (!entries.has(path)) throw new Error(`The extension build receipt is missing required package member ${path}.`);
  return entries;
}

async function verifiedMembers(receipt) {
  const expected = exactReceipt(receipt);
  const actual = new Map((await files(unpacked)).map(path => [relative(unpacked, path).replaceAll('\\', '/'), path]));
  if (actual.size !== expected.size || [...expected.keys()].some(path => !actual.has(path)) || [...actual.keys()].some(path => !expected.has(path))) throw new Error('The unpacked extension tree does not exactly match its accepted build receipt. Run npm run extension:build first.');
  const members = [];
  for (const [name, entry] of expected) {
    const source = await readFile(actual.get(name));
    if (source.length !== entry.bytes || sha256(source) !== entry.sha256) throw new Error(`The unpacked extension member does not match its accepted build receipt: ${name}`);
    members.push({ name, source });
  }
  return members.sort((left, right) => left.name.localeCompare(right.name));
}

const receipt = JSON.parse(await readFile(receiptPath, 'utf8'));
const members = await verifiedMembers(receipt);
const manifest = JSON.parse(await readFile(join(unpacked, 'manifest.json'), 'utf8'));
if (manifest.version !== receipt.version || manifest.version_name !== receipt.version) throw new Error('The unpacked manifest version does not match the accepted build receipt.');
await mkdir(output, { recursive: true });
const archiveName = `diffdevil-for-github-${receipt.version}.zip`;
const archive = join(output, archiveName);
const written = await writeDeterministicZip(members, archive, { epoch: 0 });
const archiveBytes = await readFile(archive);
const readBack = readDeterministicZip(archiveBytes);
const stamp = zipTimestamp(0);
if (readBack.length !== written.length || readBack.some((entry, index) => entry.name !== written[index]?.name || entry.size !== written[index]?.size || entry.crc !== written[index]?.crc || entry.time !== stamp.time || entry.day !== stamp.day || !entry.source.equals(written[index].source))) throw new Error('The packaged extension ZIP did not read back as the accepted unpacked tree.');
const packageReceipt = { kind: 'diffdevil.browser-extension-package/1', source: { unpackedReceipt: 'artifacts/browser-extension/build-receipt.json', version: receipt.version }, archive: { path: relative(root, archive).replaceAll('\\', '/'), sha256: sha256(archiveBytes), bytes: (await stat(archive)).size, epoch: 0, members: readBack.map(entry => ({ path: entry.name, bytes: entry.size, crc32: entry.crc, sha256: sha256(entry.source) })) } };
await writeFile(join(output, 'package-receipt.json'), `${JSON.stringify(packageReceipt, null, 2)}\n`);
console.log(`Packaged and read back ${readBack.length} strict-allowlist extension members at ${relative(root, archive)}. No Store submission or publication performed.`);
