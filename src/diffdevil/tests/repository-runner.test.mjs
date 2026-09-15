import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../../../tools/test.mjs', import.meta.url));
function runFixture(files) {
  const directory = mkdtempSync(join(tmpdir(), 'diffdevil-runner-'));
  try {
    mkdirSync(join(directory, 'src/diffdevil/tests/nested'), { recursive: true });
    for (const [name, body] of Object.entries(files)) writeFileSync(join(directory, 'src/diffdevil/tests', name), body);
    const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
    return spawnSync(process.execPath, [script], { cwd: directory, env, encoding: 'utf8', windowsHide: true });
  } finally { rmSync(directory, { recursive: true, force: true }); }
}
const realTest = "import {test} from 'node:test'; test('registered behavior',()=>{});";
test('ordinary runner discovers nested tests and excludes helper files', () => {
  const result = runFixture({ 'nested/real.test.mjs': realTest, 'helper.mjs': 'throw Error("not a test")' });
  assert.equal(result.status, 0, result.stderr + result.stdout);
  assert.match(result.stdout, /registered behavior/);
});
test('ordinary runner rejects an empty test file even beside passing tests', () => {
  const result = runFixture({ 'real.test.mjs': realTest, 'empty.test.mjs': '// No test registrations.' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /did not report registered test cases: src[/\\]diffdevil[/\\]tests[/\\]empty\.test\.mjs/);
});
test('ordinary runner preserves test failure and zero-discovery failure', () => {
  const failed = runFixture({ 'failed.test.mjs': "import {test} from 'node:test'; test('failure survives',()=>{throw Error('expected regression')});" });
  assert.equal(failed.status, 1); assert.match(failed.stdout, /expected regression/);
  assert.equal(runFixture({}).status, 2);
});
