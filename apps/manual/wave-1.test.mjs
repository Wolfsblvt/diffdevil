// SPDX-License-Identifier: AGPL-3.0-only
/** Executable first-success contracts, not phrase-locked narrative. */
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { analyzeDiff, unwrap } from '../../dist/lib/index.js';
import { compilePolicy, evaluatePolicy, readPolicyYaml, createPlan } from '../../dist/lib/policy/index.js';
import { generatedIsland } from './generated-islands.mjs';
const root = resolve(import.meta.dirname, '../..');
const read = path => readFileSync(join(root, path), 'utf8');
const json = path => JSON.parse(read(path));
const home = mkdtempSync(join(tmpdir(), 'diffdevil wave one '));
after(() => rmSync(home, { recursive: true, force: true }));
const entry = join(root, 'dist/lib/cli/main.js');
function cli(args, status = 0, cwd = root) {
  const result = spawnSync(process.execPath, [entry, ...args], { cwd, encoding: 'utf8', windowsHide: true, env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' } });
  assert.ifError(result.error);
  assert.equal(result.status, status, `${args.join(' ')}\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}
const policy = document => unwrap(compilePolicy(unwrap(readPolicyYaml(JSON.stringify(document)))));
const small = unwrap(analyzeDiff(read('docs/examples/diffs/review.diff')));
const evaluated = unwrap(evaluatePolicy(policy({ version: 1, presets: ['size@1'] }), small));
writeFileSync(join(home, 'report.json'), JSON.stringify(evaluated.report));
const bundled = join(home, 'production.mjs');
await build({ stdin: { contents: [
  "export { exportCli } from './apps/website/src/islands/playground/export-cli.ts';",
  "export { readState } from './apps/website/src/islands/playground/state.ts';",
  "export { personalYaml, validateSettings, decorateView } from './apps/browser-extension/src/shared/settings.ts';",
  "export { humanReport, compileBrowserPolicy } from './dist/browser/index.js';",
].join('\n'), resolveDir: root }, outfile: bundled, bundle: true, platform: 'node', format: 'esm', target: 'node22', alias: { '@wolfsblvt/diffdevil/browser': join(root, 'dist/browser/index.js') } });
const production = await import(pathToFileURL(bundled).href);

test('The complete introductory replacement and review specimens keep their separate accounting', () => {
  const replacement = unwrap(analyzeDiff(read('docs/examples/diffs/replacement.diff')));
  assert.equal(replacement.totals.lines.changed.value, 3);
  assert.equal(replacement.totals.raw.churn.value, 6);
  assert.equal(small.totals.lines.changed.value, 10);
  assert.equal(small.totals.raw.churn.value, 16);
  assert.equal(small.files.length, 4);
  assert.equal(evaluated.report.bands.size.id, 'xs');
  const selected = unwrap(evaluatePolicy(policy({ version: 1, presets: ['size@1'], defaults: { paths: { exclude: ['package-lock.json'] } } }), small));
  assert.equal(selected.report.totals.lines.changed.value, 6);
  assert.equal(selected.report.totals.raw.churn.value, 8);
  assert.equal(selected.report.files.filter(file => file.included).length, 3);
});

test('Copyable complete workflow, hold policy and shell consumers match their canonical assets', () => {
  for (const [page, asset, language] of [
    ['start/label-pull-requests.md', 'workflows/size.yml', 'yaml'],
    ['understand/facts-to-provider-state.md', 'policies/hold-unresolved.yml', 'yaml'],
    ['start/use-results-in-scripts.md', 'scripts/report-consumer.sh', 'bash'],
    ['start/use-results-in-scripts.md', 'scripts/report-consumer.ps1', 'powershell'],
  ]) {
    const blocks = [...read('docs/manual/' + page).matchAll(/```([^\n]*)\n([\s\S]*?)\n```/gu)];
    assert.ok(blocks.some(([, kind, text]) => kind === language && text === read('docs/examples/' + asset).trimEnd()), asset);
  }
});

test('CLI decisions preserve true, false, invalid and unresolved instead of fabricating scalars', () => {
  const source = ['--report', 'docs/examples/reports/bounded.json'];
  cli(['check', ...source, '--expr', 'totals.lines.changed < 100'], 0);
  cli(['check', ...source, '--expr', 'totals.lines.changed < 60'], 1);
  cli(['check', ...source, '--expr', 'totals.lines.changed >= 65'], 3);
  cli(['check', ...source, '--expr', 'not a valid expression'], 2);
  assert.equal(cli(['query', ...source, '--metric', 'changed', '--format', 'value'], 3), '');
  const output = join(home, 'strict-output'); writeFileSync(output, 'preserved');
  cli(['query', ...source, '--metric', 'changed', '--format', 'value', '--output', output], 3);
  assert.equal(readFileSync(output, 'utf8'), 'preserved');
  const result = JSON.parse(cli(['query', ...source, '--metric', 'changed', '--format', 'json']));
  assert.deepEqual(result.value.measurement, { status: 'bounded', lower: 60, upper: 70 });
});

test('Incomplete path membership refuses a complete list; certain deliberately selects the observed subset', () => {
  const args = ['query', '--report', 'docs/examples/reports/incomplete.json', '--files', '--select', 'path', '--format', 'nul'];
  assert.equal(cli(args, 3), '');
  assert.equal(cli([...args, '--certain']), 'src/Observed.cs\0');
});

test('A held custom rule and the default Unknown label are different outcomes', () => {
  const args = ['plan', '--report', 'docs/examples/reports/bounded.json', '--config', 'docs/examples/policies/hold-unresolved.yml', '--target-repo', 'example/repository', '--target-pr', '42', '--format', 'json'];
  const held = JSON.parse(cli(args));
  assert.equal(held.stage, 'desired'); assert.equal(held.held.length, 1); assert.deepEqual(held.operations, []);
  assert.equal(JSON.parse(cli([...args, '--require-resolved'], 3)).held.length, 1);
  const unknown = JSON.parse(cli(['plan', '--report', 'docs/examples/reports/incomplete.json', '--no-config', '--preset', 'size@1', '--target-repo', 'example/repository', '--target-pr', '43', '--format', 'json']));
  assert.deepEqual(unknown.held, []);
  assert.ok(unknown.operations.some(operation => operation.selected === 'size/Unknown'));
});

test('Generated catalogue links select actual example and variant identities in the production URL reader', () => {
  const rendered = generatedIsland('real-pr-catalogue', { root, ref: '1'.repeat(40) });
  const links = [...rendered.matchAll(/\]\((https:\/\/diffdevil.dev\/playground\/[^)]+)\)/gu)];
  const entries = json('docs/examples/catalogue/catalogue.json').entries;
  assert.equal(links.length, 7);
  for (const [, href] of links) {
    const state = production.readState(new URL(href).search, entries[0].id);
    const entry = entries.find(candidate => candidate.id === state.example);
    assert.ok(entry, href); assert.ok(entry.variants.some(variant => variant.id === state.variant), href);
    assert.equal(state.head, 'snapshot');
  }
});

test('The Playground exported commands replay the displayed exclusion report and current policy', () => {
  const snapshot = json('docs/examples/catalogue/snapshots/vite-18968.json');
  const policies = json('docs/examples/catalogue/policies.json').policies;
  for (const [name, changed, churn, band] of [['standard', 22, 25, 's'], ['vite-without-lockfile', 1, 2, 'xs']]) {
    const applied = unwrap(evaluatePolicy(policy(policies[name]), snapshot.report));
    assert.equal(applied.report.totals.lines.changed.value, changed);
    assert.equal(applied.report.totals.raw.churn.value, churn);
    assert.equal(applied.report.bands.size.id, band);
    writeFileSync(join(home, 'report.json'), JSON.stringify(applied.report));
    writeFileSync(join(home, '.diffdevil.yml'), JSON.stringify(policies[name]));
    const text = production.exportCli(json('package.json').version, name === 'standard', { repository: 'vitejs/vite', pullRequest: 18968 });
    const commands = text.split('\n').filter(line => !line.startsWith('#'));
    assert.equal(commands.length, 3);
    for (const line of commands) {
      const args = line.split(' ').slice(2);
      assert.ok(['analyze', 'query', 'plan'].includes(args[0]));
      assert.ok(args.includes('--report')); assert.ok(!args.includes('--base'));
      const output = cli(args, 0, home);
      if (args[0] === 'query') assert.equal(output, `${changed}\n`);
    }
    const desired = unwrap(createPlan(applied, { repository: 'vitejs/vite', pullRequest: 18968 }));
    assert.equal(desired.stage, 'desired');
  }
});

test('The admitted extension presentation reads the same canonical 10 Changed / 16 churn specimen', () => {
  const settings = production.validateSettings({});
  const compiled = unwrap(production.compileBrowserPolicy(JSON.stringify({ mode: 'personal-only', personal: production.personalYaml(settings) })));
  const view = unwrap(production.humanReport(small, compiled));
  assert.equal(view.changed.value, 10); assert.equal(view.raw.churn.value, 16);
  assert.equal(view.report.files.length, 4);
  assert.equal(view.rails[0].selected, 'xs');
});

test('The first desired-plan insert is the shared presenter of the small specimen, not the 178-line fixture', () => {
  const insert = generatedIsland('presenter-first-plan', { root, ref: '1'.repeat(40) });
  const actual = cli(['plan', '--diff-file', 'docs/examples/diffs/review.diff', '--no-config', '--target-repo', 'example/repository', '--target-pr', '42', '--format', 'human', '--color', 'never']).trimEnd();
  assert.equal(insert, '```text\n' + actual + '\n```');
});
