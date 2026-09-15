import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile, stat, rm } from 'node:fs/promises';
import { existsSync, mkdtempSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const root = fileURLToPath(new URL('../', import.meta.url));
const artifacts = resolve(root, 'artifacts/package');
await mkdir(artifacts, { recursive: true });
const run = (command, args, cwd = root) => {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', windowsHide: true, env: { ...process.env, NO_COLOR: '1', npm_config_audit: 'false', npm_config_fund: 'false' } });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `${command} ${args.join(' ')}\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
};
// Use npm's own executable instead of platform-specific shell quoting.
const npmScript = process.env.npm_execpath;
assert.ok(npmScript, 'Run package qualification through npm run test:package.');
const npm = (args, cwd = root) => run(process.execPath, [npmScript, ...args], cwd);
const [packed] = JSON.parse(npm(['pack', '--ignore-scripts', '--json', '--pack-destination', artifacts]));
const tarball = resolve(artifacts, packed.filename);
const paths = packed.files.map(file => file.path);
assert.ok(paths.includes('dist/lib/cli/main.js'));
assert.ok(paths.includes('dist/lib/index.d.ts'));
assert.ok(paths.includes('src/diffdevil/contracts/schemas/report-v1.schema.json'));
for (const path of ['docs/guides/auto-label-pull-requests.md', 'docs/guides/local-automation.md', 'docs/examples/diffs/review.diff', 'docs/examples/policies/review-signals.yml', 'docs/reference/README.md']) {
  assert.ok(paths.includes(path), `Missing consumer documentation asset: ${path}`);
}
assert.equal(paths.some(path => /(^|\/)(\.git|\.handoff|artifacts|node_modules|source-inputs)(\/|$)/.test(path)), false);
assert.equal(paths.some(path => ['src/diffdevil/tests/', 'tools/', 'actions/'].some(prefix => path.startsWith(prefix))), false, 'The npm artifact must not include repository tests/tooling or the separate Action distribution.');
// Keep the consumer outside the checkout so Node cannot borrow its dependencies.
const home = mkdtempSync(join(tmpdir(), 'diffdevil consumer with spaces '));
await writeFile(join(home, 'package.json'), JSON.stringify({ private: true, type: 'module' }) + '\n');
const cache = resolve(root, 'artifacts/dependencies/npm-cache');
npm(['install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', ...(existsSync(cache) ? ['--cache', cache] : []), tarball], home);
const packageRoot = join(home, 'node_modules/@wolfsblvt/diffdevil');
const bin = join(home, 'node_modules/.bin/diffdevil');
const packageVersion = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8')).version;
// npm owns platform-specific launcher selection and escaping on Windows. Do not
// pass the POSIX .bin shell file directly to CreateProcess or invent cmd quoting.
const runBin = args => process.platform === 'win32'
  ? npm(['exec', '--offline', '--no', '--', 'diffdevil', ...args], home)
  : run(bin, args, home);
const patch = 'diff --git a/a.txt b/a.txt\n--- a/a.txt\n+++ b/a.txt\n@@ -1,2 +1,3 @@\n-old\n+new\n+added\n context\n';
await writeFile(join(home, 'change.diff'), patch);
assert.equal(runBin(['--version']), packageVersion + '\n');
// Exercise a release version different from the checkout's development version.
const installedManifestPath = join(packageRoot, 'package.json');
const installedManifest = await readFile(installedManifestPath, 'utf8');
try {
  await writeFile(installedManifestPath, JSON.stringify({ ...JSON.parse(installedManifest), version: '9.8.7-qualification' }));
  assert.equal(runBin(['--version']), '9.8.7-qualification\n');
} finally { await writeFile(installedManifestPath, installedManifest); }
assert.equal(runBin(['query', '--diff-file', 'change.diff', '--metric', 'changed', '--format', 'value']), '2\n');
assert.equal(runBin(['query', '--diff-file', 'change.diff', '--expr', 'totals.lines.changed', '--format', 'value']), '2\n');
await writeFile(join(home, 'expression.ddexpr'), '\uFEFFtotals.lines.changed');
assert.equal(runBin(['query', '--diff-file', 'change.diff', '--expr-file', 'expression.ddexpr', '--format', 'value']), '2\n');
assert.equal(JSON.parse(runBin(['schema', '--kind', 'report'])).$id, 'urn:diffdevil:report:1');
const policyDocument = {
  version: 1, presets: [], parameters: { threshold: { type: 'integer', default: 1 } },
  metrics: { weighted: { formula: 'totals.lines.deleted + 2 * totals.lines.modified' } },
  queries: { weighted: { expression: 'metrics.weighted' } },
  labelDefinitions: { 'review/weighted': { color: 'D1D5DB', description: 'Configured weighted-change threshold' } },
  rules: { weighted: { when: 'metrics.weighted > params.threshold', effects: {
    labels: { add: ['review/weighted'], removeWhenFalse: true },
    comment: { mode: 'upsert', template: 'Weighted: {{ metrics.weighted }}' }
  } } }
};
await writeFile(join(home, 'policy.json'), JSON.stringify(policyDocument, null, 2));
await writeFile(join(home, 'policy.yml'), 'version: 1\npresets: []\nmetrics:\n  weighted:\n    formula: totals.lines.deleted + 2 * totals.lines.modified\nqueries:\n  weighted:\n    expression: metrics.weighted\n');
assert.equal(runBin(['query', '--diff-file', 'change.diff', '--config', 'policy.yml', '--name', 'weighted', '--format', 'value']), '2\n');
assert.ok(paths.includes('dist/lib/validation/schemas.cjs'));

assert.equal(runBin(['query', '--diff-file', 'change.diff', '--config', 'policy.json', '--name', 'weighted', '--format', 'value']), '2\n');
assert.equal(runBin(['check', '--diff-file', 'change.diff', '--config', 'policy.json', '--param', 'threshold=0', '--expr', 'requirePresent(rules.weighted.decision)']), '');
const installedPlan = JSON.parse(runBin(['plan', '--diff-file', 'change.diff', '--config', 'policy.json', '--target-repo', 'example/repository', '--target-pr', '42', '--definitions', 'ensure', '--format', 'json']));
assert.equal(installedPlan.stage, 'desired');
assert.deepEqual(installedPlan.operations.map(op => op.kind), ['label.ensure', 'label.add', 'comment.reconcile']);
assert.equal(installedPlan.operations[2].body, 'Weighted: 2');

await writeFile(join(home, 'github-fixture.mjs'), await readFile(resolve(root, 'src/diffdevil/tests/helpers/github.mjs'), 'utf8'));

// Exercise the installed executable itself, with a fixture fetch boundary and no token.
await writeFile(join(home, 'cli-provider-fixture.mjs'), `import { FakeGitHub } from './github-fixture.mjs';
const fake = new FakeGitHub(); globalThis.fetch = fake.fetch;
delete process.env.GH_TOKEN; delete process.env.GITHUB_TOKEN; delete process.env.GITHUB_API_URL;
`);
const cliApplied = JSON.parse(run(process.execPath, ['--import', './cli-provider-fixture.mjs', join(packageRoot, 'dist/lib/cli/main.js'), 'apply', '--repo', 'example/repository', '--pr', '42', '--format', 'json'], home));
assert.equal(cliApplied.status, 'verified');
assert.equal(cliApplied.plan.operations.some(op => op.kind === 'label.select' && op.selected === 'size/XS'), true);
assert.equal(cliApplied.observations.some(op => op.kind === 'label.add' && op.readback === 'verified'), true);

const body = `import assert from 'node:assert/strict';
import { analyzeDiff, environmentFromReport, compileShortcut, evaluateExpression, unwrap } from '@wolfsblvt/diffdevil';
import { parseUnifiedDiff } from '@wolfsblvt/diffdevil/core';
import { ast, compileAst, compileExpression, parseExpression } from '@wolfsblvt/diffdevil/language';
import { compileBands, resolveBand, compileTemplate, renderTemplate, readPolicyJson, readPolicyYaml, compilePolicy, evaluatePolicy, evaluatePolicyQuery, createPlan, readPlan, compileActionShortcut } from '@wolfsblvt/diffdevil/policy';
import { analyzeGit } from '@wolfsblvt/diffdevil/git';
import { GitHubClient, analyzeGitHub, applyGitHubPolicy, syncGitHubLabels } from '@wolfsblvt/diffdevil/github';
import { FakeGitHub, TARGET } from './github-fixture.mjs';
assert.ok(import.meta.resolve('chevrotain').startsWith(new URL('./node_modules/', import.meta.url).href));
const patch = ${JSON.stringify(patch)};
const report = unwrap(analyzeDiff(patch));
const environment = unwrap(environmentFromReport(report));
const program = unwrap(compileShortcut({kind:'query',metric:'changed'},{environment:environment.schema}));
assert.equal(unwrap(evaluateExpression(program,environment)).value.measurement.value,2);
const custom = unwrap(compileAst(ast.binary('+',ast.path(['totals','raw','added']),ast.literal(1)),{environment:environment.schema}));
assert.equal(unwrap(evaluateExpression(custom,environment)).value.measurement.value,3);
const authored = unwrap(compileExpression('totals.raw.added + 1', {environment: environment.schema}));
assert.deepEqual(unwrap(evaluateExpression(authored,environment)).value,unwrap(evaluateExpression(custom,environment)).value);
assert.equal(unwrap(parseExpression('1+2*3')).operator,'+');
const bands = unwrap(compileBands({minimum:0,ranges:[{id:'small',lt:20},{id:'large',otherwise:true}]}));
assert.equal(unwrap(resolveBand(bands,report.totals.lines.changed)).id,'small');
const template = unwrap(compileTemplate('Changed: {{ totals.lines.changed }}',environment.schema));
assert.equal(unwrap(renderTemplate(template,environment)),'Changed: 2');
const source = unwrap(readPolicyJson(${JSON.stringify(JSON.stringify(policyDocument))}, { name: 'consumer-policy.json' }));
const policy = unwrap(compilePolicy(source));
assert.equal(unwrap(compilePolicy(unwrap(readPolicyYaml(${JSON.stringify(JSON.stringify(policyDocument))})))).id, policy.id);
const evaluated = unwrap(evaluatePolicy(policy, report, {parameters: {threshold: 1}}));
assert.equal(evaluated.report.metrics.weighted.value, 2);
assert.equal(unwrap(evaluatePolicyQuery(policy,report,{query:'weighted'})).result.value.measurement.value,2);
const desired = unwrap(createPlan(evaluated, {repository:'example/repository',pullRequest:42}, {definitions:'ensure'}));
assert.ok(unwrap(readPlan(JSON.stringify(desired))).operations.some(op=>op.kind==='label.add'));
const inline = unwrap(compileActionShortcut({metric:'changed',threshold:'1',label:'review/inline'}));
assert.equal(unwrap(evaluatePolicy(inline,report)).rules.inline.decision.value,true);
assert.equal(typeof parseUnifiedDiff,'function');assert.equal(typeof analyzeGit,'function');
const fake = new FakeGitHub(), client = new GitHubClient({fetch:fake.fetch,readRetries:0});
const acquired = unwrap(await analyzeGitHub(client,TARGET));
assert.equal(acquired.totals.lines.changed.value,3);
const applied = unwrap(await applyGitHubPolicy(client,TARGET,policy,{commentAuthor:fake.author}));
assert.equal(applied.status,'verified');assert.ok(fake.labels.has('review/weighted'));assert.equal(fake.comments.length,1);
assert.equal(unwrap(await syncGitHubLabels(client,TARGET.repository,{other:{color:'aabbcc',description:'Other'}},'ensure')).status,'verified');
await assert.rejects(import('@wolfsblvt/diffdevil/dist/lib/report.js'), {code:'ERR_PACKAGE_PATH_NOT_EXPORTED'});
console.log('installed API, policy source/compiler/evaluator, desired plan, Action shorthand and closed exports passed');\n`;
await writeFile(join(home, 'consumer.mjs'), body);
run(process.execPath, ['consumer.mjs'], home);
await writeFile(join(home, 'consumer.ts'), `import { analyzeDiff, unwrap, type Report, type Value } from '@wolfsblvt/diffdevil';
import { ast, compileAst, compileExpression, parseExpression, environmentFromReport, evaluateExpression, type ExpressionSource } from '@wolfsblvt/diffdevil/language';
import { compileBands, resolveBand, compilePolicy, readPolicyJson, readPolicyYaml, evaluatePolicy, evaluatePolicyQuery, createPlan, readPlan, compileActionShortcut, type PolicyDocument, type PolicyResult, type CompiledPolicy } from '@wolfsblvt/diffdevil/policy';
import { GitHubClient, applyGitHubPolicy, analyzeGitHub, syncGitHubLabels, type GitHubApplyResult } from '@wolfsblvt/diffdevil/github';
const github: GitHubClient = new GitHubClient({fetch:globalThis.fetch});
const appliedType: Promise<import('@wolfsblvt/diffdevil').Result<GitHubApplyResult>> = applyGitHubPolicy(github,{repository:'example/repository',pullRequest:42},unwrap(compilePolicy()));
const report: Report = unwrap(analyzeDiff(''));
const env = unwrap(environmentFromReport(report));
const program = unwrap(compileAst(ast.path(['totals','lines','changed']), {environment:env.schema}));
const result: Value = unwrap(evaluateExpression(program,env)).value;
const bands = unwrap(compileBands({minimum:0,ranges:[{id:'empty',lt:1},{id:'changed',otherwise:true}]}));
const classified = unwrap(resolveBand(bands,report.totals.lines.changed));
const source: ExpressionSource = {text: 'totals.lines.changed', language: 'diffdevil-expr/1'};
const textProgram = unwrap(compileExpression(source, {environment:env.schema}));
const syntax = unwrap(parseExpression(source));
const document: PolicyDocument = {version:1,presets:[],metrics:{changed:{measure:'lines.changed'}},rules:{large:{when:'metrics.changed > 1'}}};
const policy: CompiledPolicy = unwrap(compilePolicy(unwrap(readPolicyYaml(JSON.stringify(document), {name:'policy.yml'}))));
const policyResult: PolicyResult = unwrap(evaluatePolicy(policy,report));
const planned = unwrap(createPlan(policyResult,{repository:'example/repository',pullRequest:1}));
const transported = unwrap(readPlan(planned));
const selected = unwrap(evaluatePolicyQuery(policy,report,'metrics.changed'));
const actionInput: CompiledPolicy = unwrap(compileActionShortcut({metric:'changed'}));
void result; void classified; void textProgram; void syntax; void transported; void selected; void actionInput;\n`);
const compiler = resolve(root, 'node_modules/typescript/bin/tsc');
run(process.execPath, [compiler, '--noEmit', '--strict', '--skipLibCheck', 'false', '--target', 'ES2022', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', '--typeRoots', resolve(root, 'node_modules/@types'), 'consumer.ts'], home);
// npm's Windows launcher generator is inspected here, not executed on Windows.
const requireNpm = createRequire(npmScript);
const cmdShim = requireNpm('cmd-shim');
const shim = join(home, 'generated windows', 'diffdevil');
await cmdShim(join(packageRoot, 'dist/lib/cli/main.js'), shim);
const cmd = await readFile(shim + '.cmd', 'utf8');
const ps1 = await readFile(shim + '.ps1', 'utf8');
assert.match(cmd, /cli[/\\]main\.js/);assert.match(cmd, /%\*/);
assert.match(ps1, /cli[/\\]main\.js/);assert.match(ps1, /\$args/);
const observation = {
  node: process.version, platform: process.platform, arch: process.arch, npm: npm(['--version']).trim(), tarball,
  integrity: packed.integrity, shasum: packed.shasum, fileCount: paths.length,
  bytes: (await stat(tarball)).size,
  checks: ['tarball file boundary', 'offline installation into a path containing spaces outside the checkout', 'consumer-local Chevrotain resolution', process.platform === 'win32' ? 'installed CLI through npm Windows launcher dispatch' : 'installed POSIX CLI bin', 'installed explicit CLI apply through fixture HTTP', 'installed version follows package metadata, including a different release-version specimen', 'installed shortcut, inline detail and BOM expression-file scalar queries', 'installed schema asset', 'root/core/language/policy/git/github ESM exports', 'closed internal export paths', 'shared AST, detail text and shortcut execution', 'band and template API', 'installed YAML/JSON source/compiler/evaluator/query/plan round-trip', 'build-time standalone schemas' , 'installed named query and typed-parameter CLI check', 'installed desired label/definition/comment plan', 'pure Action shorthand compiler', 'installed GitHub acquisition and label/comment/definition reconciliation against mock HTTP', 'strict TypeScript consumer declarations', 'npm-generated CMD and PowerShell launcher contents'],
  unobserved: [...(process.platform === 'win32' ? [] : ['native Windows execution']), ...(process.versions.node.startsWith('24.') ? [] : ['Node 24 execution in this package run']), 'Action distribution (separate test:actions boundary)', 'live GitHub effects']
};
await writeFile(join(artifacts, 'qualification.json'), JSON.stringify(observation, null, 2) + '\n');
console.log(JSON.stringify(observation, null, 2));
await rm(home, {recursive: true});
