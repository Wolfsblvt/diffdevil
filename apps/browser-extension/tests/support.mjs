// SPDX-License-Identifier: AGPL-3.0-only
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
export async function productionModules() {
  const directory = await mkdtemp(join(tmpdir(), 'diffdevil-extension-tests-'));
  const file = join(directory, 'modules.mjs');
  await build({ stdin: { contents: [
    `export * from './apps/browser-extension/src/shared/catalogue.ts';`,
    `export * from './apps/browser-extension/src/shared/settings.ts';`,
    `export * from './apps/browser-extension/src/shared/errors.ts';`,
    `export * from './apps/browser-extension/src/background/preferences.ts';`,
    `export * from './apps/browser-extension/src/background/cache.ts';`,
    `export * from './apps/browser-extension/src/background/authorization.ts';`,
    `export * from './apps/browser-extension/src/background/diagnostic.ts';`,
    `export * from './apps/browser-extension/src/background/public-source.ts';`,
    `export * from './apps/browser-extension/src/content/github.ts';`,
    `export * from './dist/browser/index.js';`,
  ].join('\n'), resolveDir: resolve('.') }, outfile: file, bundle: true, platform: 'node', format: 'esm', target: 'node22', alias: { '@wolfsblvt/diffdevil/browser': resolve('dist/browser/index.js') } });
  return { module: await import(pathToFileURL(file).href), cleanup: () => rm(directory, { recursive: true, force: true }) };
}
export class MemoryArea {
  data = {};
  failures = 0;
  async get(keys) { const result = keys === undefined || keys === null ? this.data : Object.fromEntries((Array.isArray(keys) ? keys : [keys]).filter(key => Object.hasOwn(this.data, key)).map(key => [key, this.data[key]])); return structuredClone(result); }
  async set(values) { if (this.failures > 0) { this.failures--; throw new Error('simulated quota failure'); } this.data = { ...this.data, ...structuredClone(values) }; }
  async remove(keys) { for (const key of Array.isArray(keys) ? keys : [keys]) delete this.data[key]; }
  async clear() { this.data = {}; }
  async getBytesInUse(keys) { return new TextEncoder().encode(JSON.stringify(await this.get(keys))).byteLength; }
  async setAccessLevel() {}
}
export function memoryAreas() { return { sync: new MemoryArea(), local: new MemoryArea(), session: new MemoryArea() }; }
export const comparison = { host: 'github.com', repository: 'fixture/example', pullRequest: 42, base: 'a'.repeat(40), head: 'b'.repeat(40), changedFiles: 1, additions: 2, deletions: 1 };
export const patch = 'diff --git a/a.ts b/a.ts\n--- a/a.ts\n+++ b/a.ts\n@@ -1,2 +1,3 @@\n-old\n+new\n+extra\n keep\n';
export const unwrap = result => { if (!result.ok) throw new Error(JSON.stringify(result.diagnostics)); return result.value; };
export function metadata(overrides = {}) { return { number: 42, base: { sha: comparison.base, repo: { full_name: 'fixture/example' } }, head: { sha: comparison.head }, changed_files: 1, additions: 2, deletions: 1, ...overrides }; }
export const response = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
