import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { run } from 'node:test';
import { tap } from 'node:test/reporters';

// Node may report a file without test() registrations as a passing file wrapper.
// Per-file summaries, unlike that wrapper, count actual registered tests.
const files = readdirSync('tests', { recursive: true })
  .filter(path => path.endsWith('.test.mjs')).sort().map(path => join('tests', path));
if (files.length === 0) {
  console.error('No ordinary test files were discovered under tests/.');
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
