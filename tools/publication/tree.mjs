// SPDX-License-Identifier: AGPL-3.0-only
/** The publication receipt's file inventory: one shape for writing and for re-checking upload bytes. */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';

/** Every file below `directory`, sorted, with its size and SHA-256. */
export function listTree(directory, prefix = '') {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = `${prefix}${entry.name}`;
    if (entry.isDirectory()) return listTree(`${directory}/${entry.name}`, `${path}/`);
    const bytes = readFileSync(`${directory}/${entry.name}`);
    return [{ path, size: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }];
  }).sort((a, b) => a.path.localeCompare(b.path));
}

/** Differences between a receipt inventory and the bytes now on disk; empty means identical. */
export function compareTree(expected, actual) {
  const want = new Map(expected.map(file => [file.path, file]));
  const have = new Map(actual.map(file => [file.path, file]));
  const differences = [];
  for (const [path, file] of want) {
    const current = have.get(path);
    if (!current) differences.push(`missing ${path}`);
    else if (current.size !== file.size || current.sha256 !== file.sha256) differences.push(`changed ${path}`);
  }
  for (const path of have.keys()) if (!want.has(path)) differences.push(`unexpected ${path}`);
  return differences;
}
