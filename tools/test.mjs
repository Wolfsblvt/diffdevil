import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { run } from 'node:test';
import { tap } from 'node:test/reporters';

// Prune nested app toolchains before descent; dependencies are not repository tests.
const ignored = new Set(['node_modules', '.astro', 'dist', 'artifacts']);
function discover(root) {
  return readdirSync(root, { withFileTypes: true }).flatMap(entry => {
    if (ignored.has(entry.name)) return [];
    const path = join(root, entry.name);
    return entry.isDirectory() ? discover(path) : entry.isFile() && entry.name.endsWith('.test.mjs') ? [path] : [];
  });
}
const roots = ['src/diffdevil/tests', 'apps'];
const files = roots.flatMap(discover).sort();
if (files.length === 0) {
  console.error(`No ordinary test files were discovered under ${roots.join(' or ')}.`);
  process.exit(2);
}
const observed = new Set();
let failed = false;
async function* inspectEvents() {
  for await (const event of run({ files })) {
    if (event.type === 'test:fail') failed = true;
    if (event.type === 'test:summary') {
      const { file, counts, success } = event.data;
      if (!success) failed = true;
      if (file && counts.tests > 0) observed.add(resolve(file));
    }
    yield event;
  }
}
try {
  for await (const text of tap(inspectEvents())) process.stdout.write(text);
  for (const file of files) {
    if (observed.has(resolve(file))) continue;
    console.error(`Ordinary test file did not report registered test cases: ${file}`);
    failed = true;
  }
  process.exitCode = failed ? 1 : 0;
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 2;
}
