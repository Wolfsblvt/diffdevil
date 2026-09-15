import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { run } from 'node:test';

// Count only actual named test events. Loading an expectation never counts as a pass.
const directory = 'spec/detail/v1/conformance';
const cases = new Map();
for (const file of readdirSync(directory).filter(file => file.endsWith('.json')).sort()) {
  const suite = file.slice(0, -5);
  const document = JSON.parse(readFileSync(join(directory, file), 'utf8'));
  for (const row of document.cases ?? []) {
    cases.set(`${suite}/${row.id}`, { suite, id: row.id, status: 'not-executed' });
  }
}
const files = readdirSync('tests', { recursive: true })
  .filter(file => file.endsWith('.test.mjs')).sort().map(file => join('tests', file));
const failures = [];
for await (const event of run({ files, testNamePatterns: [/^conformance /] })) {
  if (event.type !== 'test:pass' && event.type !== 'test:fail') continue;
  const { name, skip, todo, details } = event.data;
  const match = /^conformance ([^/]+?)\s*\/\s*(.+)$/.exec(name);
  if (!match) {
    if (event.type === 'test:fail') failures.push({ name, message: details.error?.message });
    continue;
  }
  const key = `${match[1].trim()}/${match[2]}`;
  const row = cases.get(key);
  if (!row) {
    failures.push({ name, message: 'Named conformance test has no supplied case.' });
    continue;
  }
  if (row.status !== 'not-executed') {
    failures.push({ name, message: 'A supplied case was reported more than once.' });
    continue;
  }
  row.status = skip || todo ? 'not-executed' : event.type === 'test:pass' ? 'passed' : 'failed';
  if (skip || todo) row.reason = String(skip || todo);
  if (event.type === 'test:fail') row.message = details.error?.message;
}
const totals = { declared: cases.size, passed: 0, failed: 0, notExecuted: 0 };
const suites = {};
for (const row of cases.values()) {
  const counts = suites[row.suite] ??= { declared: 0, passed: 0, failed: 0, notExecuted: 0 };
  counts.declared++;
  const key = row.status === 'not-executed' ? 'notExecuted' : row.status;
  totals[key]++;
  counts[key]++;
}
const report = {
  meaning: 'Actual production test events against supplied cases. Not-executed is not a passing result.',
  command: 'npm run test:conformance',
  node: process.version,
  totals,
  suites,
  failures,
  cases: [...cases.values()],
};
mkdirSync('artifacts/conformance', { recursive: true });
writeFileSync('artifacts/conformance/results.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ...totals, harnessFailures: failures.length, suites }, null, 2));
if (totals.failed || failures.length) process.exitCode = 1;
