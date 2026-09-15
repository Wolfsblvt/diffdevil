import { buildSchemas } from './schema-build.mjs';
import { existsSync, mkdirSync, rmSync, chmodSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const offline = process.argv.includes('--offline-toolchain');
const root = resolve(offline ? 'artifacts/toolchain/node_modules' : 'node_modules');
const compiler = resolve(root, 'typescript/bin/tsc');
if (!existsSync(compiler)) {
  console.error(`Build toolchain not installed at ${root}. Install the declared development dependencies before building.`);
  process.exit(2);
}
// Output is wholly generated; removed source must not survive in the next tarball.
rmSync('dist/lib', { recursive: true, force: true });
mkdirSync('dist/lib', { recursive: true });
const args = [compiler, '-p', 'tsconfig.json', '--typeRoots', resolve(root, '@types'), '--pretty', 'false'];
const result = spawnSync(process.execPath, args, { stdio: 'inherit', windowsHide: true });
if (result.error) { console.error(result.error.message); process.exit(2); }
if (result.status === 0) {
  buildSchemas();
  if (existsSync('dist/lib/cli/main.js')) chmodSync('dist/lib/cli/main.js', 0o755);
}
process.exit(result.status ?? 2);
