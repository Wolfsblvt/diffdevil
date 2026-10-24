// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { readCredentialArtifact, sha256, assetHash, RETAINED_INPUT_NAMES } from './operator-artifact.mjs';
import { uploadCredentialArtifact } from './operator-upload.mjs';
import { createProcessRunner, nativeProcessEnvironment } from './operator-helper.mjs';
import { syntheticArtifact } from './fixtures/operator-artifact.mjs';

test('the real helper prepares pinned native modules/settings and filtered assets as one independently hashed artifact', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'diffdevil native artifact '));
  try {
    await mkdir(join(directory, 'client'));
    const config = join(directory, 'wrangler.json');
    await writeFile(join(directory, 'worker.mjs'), 'import message from "./message.txt"; export default { fetch() { return new Response(message); } };');
    await writeFile(join(directory, 'message.txt'), 'retained native module');
    await writeFile(join(directory, 'client/index.html'), '<h1>artifact asset</h1>');
    await writeFile(join(directory, 'client/private.txt'), 'synthetic excluded asset');
    await writeFile(join(directory, 'client/.assetsignore'), 'private.txt\n');
    await writeFile(join(directory, 'client/_headers'), '/*\n  X-Artifact: retained\n');
    await writeFile(config, JSON.stringify({ name: 'diffdevil-artifact-fixture', account_id: 'account-1', main: 'worker.mjs', compatibility_date: '2026-10-01', rules: [{ type: 'Text', globs: ['**/*.txt'], fallthrough: true }], assets: { directory: 'client', binding: 'ASSETS', run_worker_first: true }, vars: { APP_ORIGIN: 'https://example.invalid' }, d1_databases: [{ binding: 'APP_DB', database_id: '12345678-1234-1234-1234-123456789abc' }] }));
    const path = join(directory, 'artifact.json');
    const env = nativeProcessEnvironment(process.env, {});
    for (const name of ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_API_KEY', 'CLOUDFLARE_EMAIL']) delete env[name];
    env.WRANGLER_HOME = directory;
    const result = await createProcessRunner({ cwd: process.cwd() })({ args: [resolve('apps/github-app/operator-helper.mjs'), 'prepare-artifact', '--config', config, '--account-id', 'account-1', '--artifact-file', path], input: '', env });
    assert.equal(result.code, 0, result.stdout);
    const receipt = JSON.parse(result.stdout);
    const artifact = await readCredentialArtifact({ artifactPath: path, artifactSha256: receipt.sha256 });
    assert.ok(artifact.modules.some(file => Buffer.from(file.content, 'base64').toString().includes('retained native module')));
    assert.deepEqual(artifact.assets.files.map(file => file.path), ['/index.html']);
    assert.equal(artifact.assets.config.run_worker_first, true);
    assert.match(artifact.assets.config._headers, /X-Artifact: retained/u);
    assert.equal(artifact.metadata.keep_bindings, undefined);
    assert.equal(artifact.configHash, sha256(await readFile(config)));
    const retainedInputsPath = join(directory, 'retained-inputs.json');
    const retainedInputs = { format: 'diffdevil-retained-inputs-v1', accountId: 'account-1', worker: 'diffdevil-artifact-fixture', databaseId: '12345678-1234-1234-1234-123456789abc', configHash: artifact.configHash, sourceVersionId: 'qualified-original', custodyRef: 'exclusive-source-operation', identity: { appId: '123', clientId: 'fixture-client', botLogin: 'diffdevil[bot]', botId: '456' } };
    await writeFile(retainedInputsPath, JSON.stringify(retainedInputs));
    const retainedPath = join(directory, 'retained-artifact.json');
    const retainedResult = await createProcessRunner({ cwd: process.cwd() })({ args: [resolve('apps/github-app/operator-helper.mjs'), 'prepare-artifact', '--config', config, '--account-id', 'account-1', '--artifact-file', retainedPath, '--retained-inputs-file', retainedInputsPath], input: '', env });
    assert.equal(retainedResult.code, 0, retainedResult.stdout);
    const retained = await readCredentialArtifact({ artifactPath: retainedPath, artifactSha256: JSON.parse(retainedResult.stdout).sha256 });
    assert.deepEqual(retained.retainedInputs, retainedInputs);
    assert.deepEqual(retained.metadata.bindings.filter(binding => binding.type === 'inherit'), RETAINED_INPUT_NAMES.map(name => ({ name, type: 'inherit' })));
    assert.deepEqual(retained.modules, artifact.modules);
    assert.deepEqual(retained.assets, artifact.assets);
    const original = await readFile(path);
    await writeFile(path, `${original}\n`);
    await assert.rejects(readCredentialArtifact({ artifactPath: path, artifactSha256: receipt.sha256 }), { code: 'E_OPERATOR_ARTIFACT' });
  } finally { await rm(directory, { recursive: true, force: true }); }
});

async function uploadFixture() {
  const directory = await mkdtemp(join(tmpdir(), 'diffdevil atomic upload '));
  const config = join(directory, 'config.json');
  await writeFile(config, JSON.stringify({ name: 'existing-worker', account_id: 'account-1', d1_databases: [{ binding: 'APP_DB', database_id: '12345678-1234-1234-1234-123456789abc' }] }));
  const selected = await syntheticArtifact(config);
  const artifact = JSON.parse(await readFile(selected.artifactPath, 'utf8'));
  const bytes = Buffer.from('<h1>complete selected asset</h1>');
  artifact.assets = { binding: 'ASSETS', config: { run_worker_first: true, _headers: '/*\n X-Test: exact' }, files: [{ path: '/index.html', content: bytes.toString('base64'), type: 'text/html; charset=utf-8', size: bytes.length, hash: assetHash('/index.html', bytes) }] };
  artifact.metadata.bindings.push({ type: 'assets', name: 'ASSETS' });
  const encoded = `${JSON.stringify(artifact)}\n`;
  await writeFile(selected.artifactPath, encoded);
  return { directory, config, artifact, ...selected, artifactSha256: sha256(encoded) };
}

for (const single of [false, true]) test(`one source-bound version POST survives a foreign latest upload with ${single ? 'single' : 'bulk'} native asset protocol`, async () => {
  const setup = await uploadFixture();
  const requests = [];
  const values = { GITHUB_APP_PRIVATE_KEY: 'synthetic-key', APP_SEAL_KEY: 'synthetic-retained-seal' };
  const sessionJwt = `header.${Buffer.from(JSON.stringify({ wrangler_single_asset_uploads: single })).toString('base64url')}.signature`;
  const response = result => ({ ok: true, json: async () => ({ success: true, result }) });
  let foreignLatest = 'previous-version';
  const fetchImpl = async (url, request) => {
    requests.push(url);
    assert.equal(request.redirect, 'error');
    if (url.endsWith('/assets-upload-session')) {
      assert.equal(JSON.parse(request.body).manifest['/index.html'].hash, setup.artifact.assets.files[0].hash);
      return response({ jwt: sessionJwt, buckets: [[setup.artifact.assets.files[0].hash]] });
    }
    if (url.includes('/workers/assets/upload')) {
      foreignLatest = 'unrelated-foreign-code';
      assert.equal(request.headers.Authorization, `Bearer ${sessionJwt}`);
      return response({ jwt: 'synthetic-completed-assets' });
    }
    assert.ok(url.endsWith('/workers/scripts/existing-worker/versions?bindings_inherit=strict'));
    assert.equal(foreignLatest, 'unrelated-foreign-code');
    const metadata = JSON.parse(request.body.get('metadata'));
    assert.equal(metadata.assets.jwt, 'synthetic-completed-assets');
    assert.deepEqual(metadata.assets.config, setup.artifact.assets.config);
    assert.equal(metadata.keep_bindings, undefined);
    assert.equal(metadata.keep_assets, undefined);
    assert.equal(metadata.annotations['workers/message'], `diffdevil artifact ${setup.artifactSha256}`);
    for (const file of setup.artifact.modules) assert.equal(Buffer.from(await request.body.get(file.name).arrayBuffer()).toString('base64'), file.content);
    for (const [name, text] of Object.entries(values)) assert.ok(metadata.bindings.some(binding => binding.name === name && binding.type === 'secret_text' && binding.text === text));
    return response({ id: 'created-exact-artifact' });
  };
  try {
    const result = await uploadCredentialArtifact({ ...setup, accountId: 'account-1', worker: 'existing-worker', operationId: 'operation-1', values, fetchImpl, runner: async call => {
      assert.ok(call.args.includes('token') && call.args.includes('--json'));
      assert.equal(call.env.NODE_OPTIONS, undefined);
      return { code: 0, stdout: JSON.stringify({ type: 'oauth', token: 'synthetic-native-auth' }) };
    } });
    assert.deepEqual(result, { id: 'created-exact-artifact', operationId: 'operation-1', artifactSha256: setup.artifactSha256 });
    assert.equal(requests.filter(url => url.includes('/versions')).length, 1);
    assert.equal(JSON.stringify(result).includes('synthetic-native-auth'), false);
  } finally { await rm(setup.directory, { recursive: true, force: true }); }
});

test('a lost version acknowledgement is never retried by the actual uploader', async () => {
  const setup = await uploadFixture();
  let posts = 0;
  try {
    await assert.rejects(uploadCredentialArtifact({ ...setup, accountId: 'account-1', worker: 'existing-worker', operationId: 'operation-unknown', values: { APP_SEAL_KEY: 'synthetic-seal' }, runner: async () => ({ code: 0, stdout: '{"type":"api_token","token":"synthetic-auth"}' }), fetchImpl: async url => {
      if (url.endsWith('/assets-upload-session')) return { ok: true, json: async () => ({ success: true, result: { jwt: 'synthetic-completion', buckets: [] } }) };
      posts++;
      throw new Error('synthetic lost response after request acceptance');
    } }), error => error.versionRequest === 'attempted-unknown');
    assert.equal(posts, 1);
  } finally { await rm(setup.directory, { recursive: true, force: true }); }
});

test('native authentication failure attests no version request and makes no provider request', async () => {
  const setup = await uploadFixture();
  let requests = 0;
  try {
    await assert.rejects(uploadCredentialArtifact({ ...setup, accountId: 'account-1', worker: 'existing-worker', operationId: 'before-effect', values: { APP_SEAL_KEY: 'synthetic-seal' }, runner: async () => ({ code: 2, stdout: '' }), fetchImpl: async () => { requests++; throw new Error('Must not reach provider.'); } }), error => error.versionRequest === 'not-attempted');
    assert.equal(requests, 0);
  } finally { await rm(setup.directory, { recursive: true, force: true }); }
});

async function retainedUploadFixture() {
  const setup = await uploadFixture();
  const retainedInputs = { format: 'diffdevil-retained-inputs-v1', accountId: 'account-1', worker: 'existing-worker', databaseId: '12345678-1234-1234-1234-123456789abc', configHash: setup.artifact.configHash, sourceVersionId: 'qualified-original', custodyRef: 'exclusive-version-operation', identity: { appId: '123', clientId: 'fixture-client', botLogin: 'diffdevil[bot]', botId: '456' } };
  setup.artifact.retainedInputs = retainedInputs;
  setup.artifact.metadata.bindings.push(...RETAINED_INPUT_NAMES.map(name => ({ name, type: 'inherit' })));
  const bytes = `${JSON.stringify(setup.artifact)}\n`;
  await writeFile(setup.artifactPath, bytes);
  return { ...setup, artifactSha256: sha256(bytes) };
}

for (const outcome of ['accepted', 'source-changed', 'source-unknown', 'missing-original', 'deployment-changed', 'lost-acknowledgement']) test(`retained multipart upload: ${outcome}`, async () => {
  const setup = await retainedUploadFixture();
  let staged = false, posts = 0;
  const runner = async ({ args }) => {
    if (args.includes('token')) return { code: 0, stdout: '{"type":"api_token","token":"synthetic-auth"}' };
    if (args.includes('deployments')) return { code: 0, stdout: JSON.stringify([{ id: staged && outcome === 'deployment-changed' ? 'foreign-deployment' : 'original-deployment', versions: [{ version_id: 'qualified-original', percentage: 100 }] }]) };
    if (args.includes('list')) return staged && outcome === 'source-unknown' ? { code: 1, stdout: '' } : { code: 0, stdout: JSON.stringify([{ id: 'qualified-original' }, ...(staged && outcome === 'source-changed' ? [{ id: 'foreign-version' }] : [])]) };
    return { code: 0, stdout: JSON.stringify({ id: 'qualified-original', resources: { bindings: [{ name: 'APP_DB', type: 'd1', id: setup.artifact.retainedInputs.databaseId }, ...RETAINED_INPUT_NAMES.filter(name => outcome !== 'missing-original' || name !== 'GITHUB_APP_PRIVATE_KEY').map(name => ({ name, type: 'secret_text' }))] } }) };
  };
  const fetchImpl = async (url, request) => {
    if (url.endsWith('/assets-upload-session')) { staged = true; return { ok: true, json: async () => ({ success: true, result: { jwt: 'synthetic-completion', buckets: [] } }) }; }
    posts++;
    assert.ok(url.endsWith('/versions?bindings_inherit=strict'));
    const metadata = JSON.parse(request.body.get('metadata'));
    assert.deepEqual(metadata.bindings.filter(binding => binding.type === 'inherit'), RETAINED_INPUT_NAMES.map(name => ({ name, type: 'inherit' })));
    assert.equal(metadata.bindings.some(binding => RETAINED_INPUT_NAMES.includes(binding.name) && Object.hasOwn(binding, 'text')), false);
    assert.equal(metadata.bindings.find(binding => binding.name === 'APP_SEAL_KEY').text, 'synthetic-new-seal');
    if (outcome === 'lost-acknowledgement') throw new Error('synthetic response lost');
    return { ok: true, json: async () => ({ success: true, result: { id: 'created-retained' } }) };
  };
  try {
    const operation = uploadCredentialArtifact({ ...setup, accountId: 'account-1', worker: 'existing-worker', operationId: 'operation-retained', values: { APP_SEAL_KEY: 'synthetic-new-seal' }, runner, fetchImpl });
    if (outcome === 'accepted') assert.equal((await operation).id, 'created-retained');
    else await assert.rejects(operation, error => error.versionRequest === (outcome === 'lost-acknowledgement' ? 'attempted-unknown' : 'not-attempted'));
    assert.equal(posts, ['accepted', 'lost-acknowledgement'].includes(outcome) ? 1 : 0);
  } finally { await rm(setup.directory, { recursive: true, force: true }); }
});

test('retained artifacts refuse arbitrary inheritance, renamed/explicit-version bindings and original replacement values', async () => {
  const setup = await retainedUploadFixture();
  try {
    for (const mutation of [artifact => { delete artifact.retainedInputs; }, artifact => { artifact.metadata.keep_bindings = ['secret_text']; }, artifact => { artifact.metadata.bindings.at(-1).old_name = 'other-key'; }, artifact => { artifact.metadata.bindings.at(-1).version_id = 'qualified-original'; }, artifact => { artifact.metadata.bindings.push({ name: 'ARBITRARY_SECRET', type: 'inherit' }); }, artifact => { artifact.retainedInputs.identity.appId = 'different-id'; }]) {
      const artifact = structuredClone(setup.artifact);
      mutation(artifact);
      const bytes = JSON.stringify(artifact);
      await writeFile(setup.artifactPath, bytes);
      await assert.rejects(readCredentialArtifact({ artifactPath: setup.artifactPath, artifactSha256: sha256(bytes) }), { code: 'E_OPERATOR_ARTIFACT' });
    }
    const bytes = JSON.stringify(setup.artifact);
    await writeFile(setup.artifactPath, bytes);
    let authenticated = false;
    await assert.rejects(uploadCredentialArtifact({ ...setup, artifactSha256: sha256(bytes), accountId: 'account-1', worker: 'existing-worker', operationId: 'refused-replacement', values: { GITHUB_APP_PRIVATE_KEY: 'synthetic-replacement' }, runner: async () => { authenticated = true; throw new Error(); } }), error => error.versionRequest === 'not-attempted');
    assert.equal(authenticated, false);
  } finally { await rm(setup.directory, { recursive: true, force: true }); }
});
