import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, writeFile, rm, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { tmpdir, platform, arch } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { parse } from 'yaml';

const root = fileURLToPath(new URL('..', import.meta.url));
const evidenceRoot = join(root, 'artifacts/verification/actions');
await mkdir(evidenceRoot, { recursive: true });
const home = await mkdtemp(join(tmpdir(), 'diffdevil distributed action '));
const distribution = join(home, 'distribution'), workspace = join(home, 'workspace');
const entries = ['root', 'analyze', 'apply', 'sync-labels'];
const runtimes = [...new Set([process.execPath, ...(process.env.DIFFDEVIL_NODE24 ? [resolve(process.env.DIFFDEVIL_NODE24)] : [])])];
const observations = [];
const cleanEnvironment = { ...process.env };
for (const key of Object.keys(cleanEnvironment)) if (key.startsWith('INPUT_') || ['NODE_OPTIONS', 'NODE_PATH', 'GH_TOKEN', 'GITHUB_TOKEN', 'ACTIONS_RUNTIME_TOKEN', 'GITHUB_API_URL'].includes(key)) delete cleanEnvironment[key];
function execute(node, args, options = {}) {
  const result = spawnSync(node, args, { encoding: 'utf8', windowsHide: true, env: cleanEnvironment, cwd: workspace, maxBuffer: 8 * 1024 * 1024, ...options });
  if (result.error) throw result.error;
  return result;
}
function readOutputs(text) {
  const values = {}, lines = text.split('\n');
  for (let i = 0; i < lines.length - 1; i++) {
    const separator = lines[i].indexOf('<<'); assert.ok(separator > 0);
    const name = lines[i].slice(0, separator), delimiter = lines[i].slice(separator + 2), content = [];
    while (++i < lines.length && lines[i] !== delimiter) content.push(lines[i]);
    assert.ok(i < lines.length, 'unterminated multiline output'); assert.equal(Object.hasOwn(values, name), false);
    values[name] = content.join('\n');
  }
  return values;
}
try {
  await mkdir(workspace, { recursive: true }); await mkdir(distribution, { recursive: true });
  await cp(join(root, 'actions/runtime'), join(distribution, 'actions/runtime'), { recursive: true });
  const metadata = {};
  for (const entry of entries) {
    const source = entry === 'root' ? root : join(root, 'actions', entry), destination = entry === 'root' ? distribution : join(distribution, 'actions', entry);
    await mkdir(destination, { recursive: true });
    await cp(join(source, 'action.yml'), join(destination, 'action.yml'));
    if (entry !== 'root') await cp(join(source, 'index.mjs'), join(destination, 'index.mjs'));
    metadata[entry] = parse(await readFile(join(destination, 'action.yml'), 'utf8'));
    assert.equal(metadata[entry].runs.using, 'node24');
    assert.ok((await stat(resolve(destination, metadata[entry].runs.main))).isFile());
  }
  assert.equal(existsSync(join(home, 'node_modules')), false);
  assert.equal(existsSync(join(distribution, 'node_modules')), false);
  assert.equal(existsSync(join(distribution, 'src')), false);
  assert.equal(existsSync(join(distribution, 'package.json')), false);
  await cp(join(root, 'src/diffdevil/tests/helpers/github.mjs'), join(home, 'github-fixture.mjs'));
  // External test preload replaces only the wire boundary. No production runner source is patched.
  await writeFile(join(home, 'wire-preload.mjs'), `import { FakeGitHub, BASE, json } from './github-fixture.mjs';
import { writeFileSync } from 'node:fs';
const fake = new FakeGitHub();
fake.contents.set(BASE + ':.diffdevil.yml', JSON.stringify({version:1,presets:[],labelDefinitions:{'review/custom':{color:'abcdef',description:'Custom'}},rules:{custom:{when:'totals.lines.changed > 1',effects:{labels:{add:['review/custom']}}}}}));
if(process.env.FIXTURE_SCENARIO==='bounded') delete fake.files[0].patch;
if(process.env.FIXTURE_SCENARIO==='partial') fake.before=call=>call.method==='POST'&&call.body?.name==='size/L'?json({},201):undefined;
if(process.env.FIXTURE_SCENARIO==='stale') fake.head='d'.repeat(40);
globalThis.fetch=fake.fetch;
process.on('exit',()=>writeFileSync(process.env.FIXTURE_STATE,JSON.stringify({labels:[...fake.labels],definitions:[...fake.definitions.values()],comments:fake.comments,calls:fake.calls.map(({method,path,body})=>({method,path,body}))})));
`);
  let sequence = 0;
  async function action(node, entry, inputs = {}, { scenario = 'ordinary', expectedExit = 0, expectOutputs = true } = {}) {
    const job = join(home, `job-${++sequence}`); await mkdir(job);
    const env = { ...cleanEnvironment, GITHUB_ACTIONS: 'true', GITHUB_EVENT_NAME: 'pull_request_target', GITHUB_REPOSITORY: 'example/repository',
      GITHUB_EVENT_PATH: join(job, 'event.json'), GITHUB_WORKSPACE: workspace, RUNNER_TEMP: job,
      GITHUB_OUTPUT: join(job, 'output'), GITHUB_STEP_SUMMARY: join(job, 'summary'), GITHUB_RUN_ID: '123', GITHUB_ACTION: 'diffdevil',
      FIXTURE_STATE: join(job, 'state.json'), FIXTURE_SCENARIO: scenario };
    await writeFile(env.GITHUB_EVENT_PATH, JSON.stringify({ repository: { full_name: 'example/repository' }, pull_request: { number: 42 } }));
    await writeFile(env.GITHUB_OUTPUT, ''); await writeFile(env.GITHUB_STEP_SUMMARY, '');
    for (const [name, definition] of Object.entries(metadata[entry].inputs)) if (definition.default !== undefined) {
      assert.equal(typeof definition.default, 'string');
      env[`INPUT_${name.toUpperCase()}`] = definition.default === '${{ github.token }}' ? 'fixture-token-not-a-credential' : definition.default;
    }
    for (const [name, value] of Object.entries(inputs)) env[`INPUT_${name.toUpperCase()}`] = value;
    const entryRoot = entry === 'root' ? distribution : join(distribution, 'actions', entry);
    const main = resolve(entryRoot, metadata[entry].runs.main);
    const result = execute(node, ['--import', join(home, 'wire-preload.mjs'), main], { env });
    assert.equal(result.status, expectedExit, `${entry}: ${result.stdout}\n${result.stderr}`);
    assert.equal(result.stderr, '', 'Action does not mix raw exception stacks or progress into transport');
    assert.ok(result.stdout.split('\n').filter(Boolean).every(line => /^::(?:add-mask|error)::/u.test(line)), 'only controlled workflow commands on stdout');
    const outputs = readOutputs(await readFile(env.GITHUB_OUTPUT, 'utf8'));
    if (expectOutputs) assert.deepEqual(Object.keys(outputs).sort(), Object.keys(metadata[entry].outputs).sort());
    else assert.equal(Object.keys(outputs).length, 0);
    const state = JSON.parse(await readFile(env.FIXTURE_STATE, 'utf8'));
    const summary = await readFile(env.GITHUB_STEP_SUMMARY, 'utf8');
    observations.push({ runtime: execute(node, ['--version']).stdout.trim(), entry, main: relative(distribution, main).replaceAll('\\', '/'), scenario, inputs: Object.keys(inputs), exit: result.status,
      outputs: Object.keys(outputs).length, writes: state.calls.filter(call => call.method !== 'GET').length });
    return { outputs, state, summary, stdout: result.stdout };
  }
  for (const node of runtimes) {
    const version = execute(node, ['--version']); assert.equal(version.status, 0);
    if (node === process.env.DIFFDEVIL_NODE24) assert.match(version.stdout, /^v24\./u, 'selected Node 24 binary must actually be Node 24');
    const rootResult = await action(node, 'root');
    assert.deepEqual(rootResult.state.labels, ['size/XS']); assert.equal(rootResult.state.definitions.length, 6); assert.equal(rootResult.state.comments.length, 0);
    assert.equal(rootResult.outputs['lines-changed'], '3'); assert.equal(rootResult.outputs['raw-churn'], '6'); assert.equal(rootResult.outputs['effects-status'], 'verified');
    const analysis = await action(node, 'analyze', { threshold: '4', comparison: 'gt' }, { scenario: 'bounded' });
    assert.equal(analysis.outputs.decision, 'unknown'); assert.equal(analysis.outputs['lines-changed'], ''); assert.equal(analysis.outputs['lines-changed-min'], '3');
    assert.equal(analysis.state.calls.some(call => call.method !== 'GET'), false); assert.match(analysis.summary, /Not applied/);
    const planned = await action(node, 'root', { mode: 'plan' });
    assert.equal(planned.state.calls.some(call => call.method !== 'GET'), false);
    const applied = await action(node, 'apply', { 'input-report': planned.outputs['report-path'], 'input-plan': planned.outputs['plan-path'] });
    assert.deepEqual(applied.state.labels, ['size/XS']); assert.equal(applied.outputs['effects-status'], 'verified');
    const stale = await action(node, 'apply', { 'input-report': planned.outputs['report-path'] }, { scenario: 'stale', expectedExit: 2, expectOutputs: false });
    assert.equal(stale.state.calls.some(call => call.method !== 'GET'), false); assert.match(stale.stdout, /E_REPORT_STALE/);
    const custom = await action(node, 'root', { config: '.diffdevil.yml' }); assert.deepEqual(custom.state.labels, ['review/custom']);
    const comment = await action(node, 'root', { condition: 'totals.lines.changed > 1', 'comment-template': 'Changed: {{ totals.lines.changed }}\nSecond line', 'comment-mode': 'upsert', 'comment-author': 'fixture-app[bot]' });
    assert.equal(comment.state.comments.length, 1); assert.match(comment.state.comments[0].body, /^Changed: 3\nSecond line/);
    const verified = await action(node, 'sync-labels', {}, { expectedExit: 1 });
    assert.equal(verified.state.calls.some(call => call.method !== 'GET'), false); assert.equal(verified.outputs['effects-status'], 'incomplete');
    const synced = await action(node, 'sync-labels', { operation: 'apply', definitions: 'ensure' });
    assert.equal(synced.state.definitions.length, 6); assert.equal(synced.state.calls.some(call => call.path.includes('/pulls/') || call.path.includes('/issues/')), false);
    const partial = await action(node, 'root', {}, { scenario: 'partial', expectedExit: 2 });
    assert.equal(partial.outputs['effects-status'], 'incomplete');
    const journal = JSON.parse(await readFile(partial.outputs['effects-path'], 'utf8'));
    assert.equal(journal.observations.at(-1).outcome, 'unresolved'); assert.notEqual(journal.observations.at(-1).readback, 'verified');
  }
  const manifest = JSON.parse(await readFile(join(distribution, 'actions/runtime/MANIFEST.json'), 'utf8'));
  const evidence = { kind: 'diffdevil.action-consumer-verification', verifiedAt: new Date().toISOString(), platform: platform(), arch: arch(),
    runtimeVersions: [...new Set(observations.map(row => row.runtime))], node24Executed: observations.some(row => row.runtime.startsWith('v24.')),
    distribution: { format: manifest.format, files: Object.keys(manifest.files).length + 1, packages: manifest.dependencies.length },
    outsideCheckout: true, developmentNodeModulesAbsent: true, installCommandsInConsumer: 0, provider: 'in-memory fake HTTP; no live GitHub',
    executions: observations, limitations: ['Not a GitHub-hosted runner', ...(platform() === 'win32' ? [] : ['No native Windows execution']), 'No live permissions/effects', 'No publication'] };
  await writeFile(join(evidenceRoot, 'consumer.json'), JSON.stringify(evidence, null, 2) + '\n');
  console.log(`Distributed Action consumer passed: ${observations.length} executions; ${evidence.runtimeVersions.join(', ')}; four entry points; no install; mock HTTP only.`);
  if (!evidence.node24Executed) console.log('Node 24 was not exercised. Supply DIFFDEVIL_NODE24 or run this command under Node 24.');
} finally { await rm(home, { recursive: true, force: true }); }
