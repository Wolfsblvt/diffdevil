// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0

import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { createHash, generateKeyPairSync, randomUUID, verify } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PassThrough } from 'node:stream';
import { test } from 'node:test';
import { createProtector } from '../app/src/lib/protector.mjs';
import { checkCredentials, createProcessRunner, installCredentials as install, resumeCredentials, readHiddenTerminalSecret, registrationInputs } from './operator-helper.mjs';

const databaseId = '12345678-1234-1234-1234-123456789abc';
const keyPair = generateKeyPairSync('rsa', { modulusLength: 2048 });
const fixtureKey = keyPair.privateKey.export({ type: 'pkcs1', format: 'pem' });
const deployment = id => ({ id, versions: [{ version_id: 'version-before', percentage: 100 }] });
const installCredentials = options => install({ receiptPath: join(dirname(options.config), 'receipt.json'), githubFetch: fixtureGitHubFetch(options.oauthClientId), ...options });

function fixtureGitHubFetch(clientId = 'fixture-client', overrides = {}) {
  return async (url, request) => {
    assert.equal(request.redirect, 'error');
    if (url.endsWith('/app')) {
      const jwt = request.headers.Authorization.slice('Bearer '.length);
      const [header, body, signature] = jwt.split('.');
      if (!verify('RSA-SHA256', Buffer.from(`${header}.${body}`), keyPair.publicKey, Buffer.from(signature, 'base64url'))) return { ok: false };
      return { ok: true, json: async () => ({ id: 123, client_id: clientId, slug: 'diffdevil', ...overrides }) };
    }
    assert.equal(url, 'https://api.github.com/users/diffdevil%5Bbot%5D');
    assert.equal(request.headers.Authorization, undefined);
    return { ok: true, json: async () => ({ id: 456, login: 'diffdevil[bot]', type: 'Bot' }) };
  };
}

const appInputs = ['GITHUB_APP_ID', 'GITHUB_WEBHOOK_SECRET', 'GITHUB_APP_PRIVATE_KEY', 'GITHUB_OAUTH_CLIENT_ID', 'GITHUB_OAUTH_CLIENT_SECRET', 'APP_SEAL_KEY', 'WIRT_SIGNING_KEY_CURRENT'];

async function appFixture(worker = 'diffdevil-app-staging') {
  const setup = await fixture();
  const values = { GITHUB_APP_ID: '123', GITHUB_WEBHOOK_SECRET: randomUUID(), GITHUB_APP_PRIVATE_KEY: fixtureKey.replace(/\r?\n$/u, ''), GITHUB_OAUTH_CLIENT_ID: 'fixture-oauth-client', GITHUB_OAUTH_CLIENT_SECRET: randomUUID(), APP_SEAL_KEY: randomUUID(), WIRT_SIGNING_KEY_CURRENT: randomUUID() };
  const files = { webhookSecretPath: 'webhook.txt', oauthClientSecretPath: 'oauth.txt', sealKeyPath: 'seal.txt', wirtSigningKeyPath: 'wirt.txt' };
  const names = ['GITHUB_WEBHOOK_SECRET', 'GITHUB_OAUTH_CLIENT_SECRET', 'APP_SEAL_KEY', 'WIRT_SIGNING_KEY_CURRENT'];
  for (const [index, [key, file]] of Object.entries(files).entries()) {
    files[key] = join(setup.directory, file);
    await writeFile(files[key], `${values[names[index]]}\n`);
  }
  await writeFile(setup.config, JSON.stringify({ name: worker, account_id: 'account-1', vars: { APP_ORIGIN: 'https://staging.example', WIRT_ORIGIN: 'https://wirt.example' }, d1_databases: [{ binding: 'APP_DB', database_id: databaseId }] }));
  await writeFile(join(setup.directory, 'fixture-options.json'), '{}');
  await writeFile(join(setup.directory, 'fixture-public-key.pem'), keyPair.publicKey.export({ type: 'spki', format: 'pem' }));
  return { ...setup, values, options: { appId: '123', privateKeyPath: setup.privateKeyPath, config: setup.config, receiptPath: join(setup.directory, 'receipt.json'), accountId: 'account-1', baseVersionId: 'version-before', sealKeyInitial: true, oauthClientId: values.GITHUB_OAUTH_CLIENT_ID, sealKeyRecoveryRef: 'fixture-recovery-copy', ...files } };
}

function cli(setup, command = 'install', extra = [], { inputArgs, environment = {} } = {}) {
  const target = ['--config', setup.config, '--account-id', 'account-1', '--receipt-file', setup.options.receiptPath, '--wrangler', 'apps/github-app/fixtures/operator-provider.mjs', '--base-version-id', setup.options.baseVersionId];
  const inputs = command === 'resume' ? [] : inputArgs ?? ['--app-id', '123', '--private-key-file', setup.privateKeyPath, '--webhook-secret-file', setup.options.webhookSecretPath, '--oauth-client-id', setup.options.oauthClientId, '--oauth-client-secret-file', setup.options.oauthClientSecretPath, '--seal-key-file', setup.options.sealKeyPath, '--seal-key-initial', '--seal-key-recovery-ref', setup.options.sealKeyRecoveryRef, '--wirt-signing-key-file', setup.options.wirtSigningKeyPath];
  const preload = pathToFileURL(resolve('apps/github-app/fixtures/operator-github.mjs')).href;
  return spawnSync(process.execPath, ['apps/github-app/operator-helper.mjs', command, ...target, ...inputs, ...extra], { cwd: process.cwd(), encoding: 'utf8', windowsHide: true, env: { ...process.env, NODE_OPTIONS: `--import=${preload}`, DIFFDEVIL_OPERATOR_FIXTURE_DIRECTORY: setup.directory, ...environment, [process.platform === 'win32' ? 'cloudflare_env' : 'CLOUDFLARE_ENV']: 'must-not-inherit' } });
}

function containsProtectedValues(text, setup) {
  return ['GITHUB_WEBHOOK_SECRET', 'GITHUB_OAUTH_CLIENT_SECRET', 'APP_SEAL_KEY', 'WIRT_SIGNING_KEY_CURRENT'].some(name => text.includes(setup.values[name])) || text.includes('BEGIN RSA PRIVATE KEY');
}

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), 'diffdevil-app-helper-'));
  const privateKeyPath = join(directory, 'github-app.pem');
  const config = join(directory, 'qualification.jsonc');
  await Promise.all([
    writeFile(privateKeyPath, fixtureKey),
    writeFile(config, JSON.stringify({ name: 'diffdevil-github-app', account_id: 'account-1', d1_databases: [{ binding: 'APP_DB', database_id: databaseId }] }))
  ]);
  return { directory, privateKeyPath, config };
}

function versionRunner({ account = 'match', command = 'accepted', deployment: deploymentState = 'unchanged', versionReadback = 'complete' } = {}) {
  let created = false;
  let inputs = [];
  const calls = [];
  return {
    calls,
    runner: async call => {
      calls.push(call);
      if (call.args.includes('whoami')) return { code: 0, stdout: JSON.stringify({ accounts: account === 'match' ? [{ id: 'account-1' }] : [] }), stderr: '' };
      if (call.args.includes('deployments')) return { code: 0, stdout: JSON.stringify(deploymentState === 'absent' ? [] : deploymentState === 'changed' && created ? [deployment('deployment-after')] : [deployment('deployment-before')]), stderr: '' };
      if (call.args.includes('versions') && call.args.includes('list')) {
        if (versionReadback === 'unknown' && created) return { code: 1, stdout: '', stderr: '' };
        return { code: 0, stdout: JSON.stringify(created ? [{ id: 'version-before' }, { id: 'version-created' }] : [{ id: 'version-before' }]), stderr: '' };
      }
      if (call.args.includes('versions') && call.args.includes('view')) {
        const id = call.args[call.args.indexOf('view') + 1];
        if (!created || versionReadback === 'complete') return { code: 0, stdout: JSON.stringify({ id, resources: { bindings: [{ name: 'APP_DB', type: 'd1', id: databaseId }, ...inputs.map(name => ({ type: 'secret_text', name }))] } }), stderr: '' };
        return { code: versionReadback === 'wrong-id' ? 0 : 1, stdout: versionReadback === 'wrong-id' ? JSON.stringify({ id: 'other-version' }) : '', stderr: '' };
      }
      if (call.args.includes('bulk')) {
        inputs = Object.keys(JSON.parse(call.input));
        if (command === 'throws') throw new Error('fixture transport error');
        created = command === 'accepted';
        return { code: command === 'accepted' ? 0 : 1, stdout: '', stderr: '' };
      }
      return { code: 2, stdout: '', stderr: '' };
    }
  };
}

test('the ready-entry path runs Wrangler from the helper installation outside the caller directory', async () => {
  const setup = await fixture();
  const callerDirectory = await mkdtemp(join(tmpdir(), 'diffdevil-helper-caller-'));
  const markerPath = join(callerDirectory, 'decoy-ran.txt');
  const decoyPath = join(callerDirectory, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
  const { calls, runner } = versionRunner();
  const originalDirectory = process.cwd();

  try {
    await mkdir(dirname(decoyPath), { recursive: true });
    await writeFile(decoyPath, `import { writeFileSync } from 'node:fs'; writeFileSync(${JSON.stringify(markerPath)}, 'ran'); process.stdout.write('DECOY');\n`);
    process.chdir(callerDirectory);

    const readiness = await checkCredentials({ appId: '123', privateKeyPath: setup.privateKeyPath, webhookSecretPath: setup.privateKeyPath, accountId: 'account-1', config: setup.config, receiptPath: join(setup.directory, 'receipt.json'), runner });
    assert.equal(readiness.state, 'ready-for-input');

    const result = await createProcessRunner()({ args: [calls[0].args[0], '--version'], env: process.env });
    assert.equal(result.code, 0);
    assert.notEqual(result.stdout, 'DECOY');
    assert.equal(await readFile(markerPath).then(() => true, () => false), false);
  } finally {
    process.chdir(originalDirectory);
    await Promise.all([rm(setup.directory, { recursive: true, force: true }), rm(callerDirectory, { recursive: true, force: true })]);
  }
});

test('registration inputs select only the App permissions and explicit events', () => {
  const inputs = registrationInputs({ webhookUrl: 'https://app.example/webhooks/github' });
  assert.deepEqual(inputs.permissions, { contents: 'read', pullRequests: 'write', checks: 'write' });
  assert.deepEqual(inputs.events, ['pull_request', 'check_run']);
  assert.deepEqual(inputs.providerDefaultEvents, ['installation', 'installation_repositories']);
  const url = new URL(inputs.registrationUrl);
  assert.equal(url.searchParams.get('issues'), null);
  assert.deepEqual(url.searchParams.getAll('events[]'), ['pull_request', 'check_run']);
});

test('credential installation creates one undeployed version without a transient secret carrier', async () => {
  const setup = await fixture();
  const { calls, runner } = versionRunner();
  const webhookSecret = randomUUID();
  try {
    const result = await installCredentials({ appId: '123', privateKeyPath: setup.privateKeyPath, accountId: 'account-1', config: setup.config, readWebhookSecret: async () => webhookSecret, runner });
    assert.equal(result.state, 'version-created');
    assert.equal(result.worker, 'diffdevil-github-app');
    assert.deepEqual(result.version, { state: 'read-back', id: 'version-created' });
    assert.deepEqual(result.deployment, { state: 'unchanged' });
    assert.deepEqual(result.carrier, { state: 'not-created' });
    const bulk = calls.find(call => call.args.includes('bulk'));
    assert.ok(bulk);
    assert.equal(bulk.args.includes(webhookSecret), false);
    assert.equal(bulk.args.some(argument => argument.includes('BEGIN RSA PRIVATE KEY')), false);
    assert.equal(bulk.args[bulk.args.indexOf('bulk') + 1], '--message');
    assert.deepEqual(Object.keys(JSON.parse(bulk.input)), ['GITHUB_APP_ID', 'GITHUB_WEBHOOK_SECRET', 'GITHUB_APP_PRIVATE_KEY']);
    const receipt = await readFile(join(setup.directory, 'receipt.json'), 'utf8');
    assert.equal(receipt.includes(webhookSecret), false);
    assert.equal(receipt.includes('BEGIN RSA PRIVATE KEY'), false);
    assert.deepEqual(JSON.parse(receipt), result);
  } finally {
    await rm(setup.directory, { recursive: true, force: true });
  }
});

test('credential installation returns a partial receipt when a created version changes the deployment', async () => {
  const setup = await fixture();
  try {
    await assert.rejects(installCredentials({ appId: '123', privateKeyPath: setup.privateKeyPath, accountId: 'account-1', config: setup.config, readWebhookSecret: async () => randomUUID(), runner: versionRunner({ deployment: 'changed' }).runner }), error => error.code === 'E_OPERATOR_VERSION' && error.receipt.state === 'partial' && error.receipt.deployment.state === 'changed');
  } finally {
    await rm(setup.directory, { recursive: true, force: true });
  }
});

test('credential installation returns a bounded not-created receipt after a failed bulk write', async () => {
  const setup = await fixture();
  try {
    await assert.rejects(installCredentials({ appId: '123', privateKeyPath: setup.privateKeyPath, accountId: 'account-1', config: setup.config, readWebhookSecret: async () => randomUUID(), runner: versionRunner({ command: 'failed' }).runner }), error => error.code === 'E_OPERATOR_VERSION' && error.receipt.state === 'not-created' && error.receipt.command === 'failed' && error.receipt.version.state === 'absent');
  } finally {
    await rm(setup.directory, { recursive: true, force: true });
  }
});

test('credential installation returns an unknown receipt when the provider route stops reporting', async () => {
  const setup = await fixture();
  try {
    await assert.rejects(installCredentials({ appId: '123', privateKeyPath: setup.privateKeyPath, accountId: 'account-1', config: setup.config, readWebhookSecret: async () => randomUUID(), runner: versionRunner({ command: 'throws' }).runner }), error => error.code === 'E_OPERATOR_VERSION' && error.receipt.state === 'unknown' && error.receipt.command === 'attempted-unknown' && error.receipt.carrier.state === 'not-created');
  } finally {
    await rm(setup.directory, { recursive: true, force: true });
  }
});

test('credential installation reports unknown rather than treating a missing version readback as success', async () => {
  const setup = await fixture();
  try {
    await assert.rejects(installCredentials({ appId: '123', privateKeyPath: setup.privateKeyPath, accountId: 'account-1', config: setup.config, readWebhookSecret: async () => randomUUID(), runner: versionRunner({ versionReadback: 'unknown' }).runner }), error => error.code === 'E_OPERATOR_VERSION' && error.receipt.state === 'unknown' && error.receipt.version.state === 'unknown');
  } finally {
    await rm(setup.directory, { recursive: true, force: true });
  }
});

test('credential installation rejects an account mismatch before reading secret input or creating a carrier', async () => {
  const setup = await fixture();
  let secretRead = false;
  const { calls, runner } = versionRunner({ account: 'mismatch' });
  try {
    await assert.rejects(installCredentials({ appId: '123', privateKeyPath: setup.privateKeyPath, accountId: 'account-1', config: setup.config, readWebhookSecret: async () => { secretRead = true; return randomUUID(); }, runner }), { code: 'E_OPERATOR_TARGET' });
    assert.equal(secretRead, false);
    assert.equal(calls.some(call => call.args.includes('bulk')), false);
  } finally {
    await rm(setup.directory, { recursive: true, force: true });
  }
});

test('credential installation rejects an absent Worker deployment before reading secret input or creating a carrier', async () => {
  const setup = await fixture();
  let secretRead = false;
  const { calls, runner } = versionRunner({ deployment: 'absent' });
  try {
    await assert.rejects(installCredentials({ appId: '123', privateKeyPath: setup.privateKeyPath, accountId: 'account-1', config: setup.config, readWebhookSecret: async () => { secretRead = true; return randomUUID(); }, runner }), { code: 'E_OPERATOR_TARGET' });
    assert.equal(secretRead, false);
    assert.equal(calls.some(call => call.args.includes('bulk')), false);
  } finally {
    await rm(setup.directory, { recursive: true, force: true });
  }
});

test('credential installation reports unknown when version view does not confirm the new version identity', async () => {
  const setup = await fixture();
  try {
    await assert.rejects(installCredentials({ appId: '123', privateKeyPath: setup.privateKeyPath, accountId: 'account-1', config: setup.config, readWebhookSecret: async () => randomUUID(), runner: versionRunner({ versionReadback: 'wrong-id' }).runner }), error => error.code === 'E_OPERATOR_VERSION' && error.receipt.state === 'unknown' && error.receipt.version.state === 'unknown');
  } finally {
    await rm(setup.directory, { recursive: true, force: true });
  }
});

test('credential installation refuses the source placeholder configuration before any provider command', async () => {
  const setup = await fixture();
  const placeholder = join(setup.directory, 'source.jsonc');
  await writeFile(placeholder, JSON.stringify({ name: 'diffdevil-github-app', d1_databases: [{ binding: 'APP_DB', database_id: '00000000-0000-0000-0000-000000000000' }] }));
  try {
    await assert.rejects(installCredentials({ appId: '123', privateKeyPath: setup.privateKeyPath, accountId: 'account-1', config: placeholder, readWebhookSecret: async () => randomUUID(), runner: async () => { throw new Error('must not invoke provider'); } }), { code: 'E_OPERATOR_CONFIG' });
  } finally {
    await rm(setup.directory, { recursive: true, force: true });
  }
});

test('the interactive checkpoint disables echo and never writes the secret to its terminal output', async () => {
  const input = new PassThrough();
  const output = new PassThrough();
  const rawMode = [];
  const displayed = [];
  input.isTTY = true;
  input.setRawMode = value => rawMode.push(value);
  input.resume();
  output.isTTY = true;
  output.on('data', chunk => displayed.push(chunk.toString('utf8')));
  const pending = readHiddenTerminalSecret({ input, output });
  const secret = randomUUID();
  input.write(`${secret}\r`);
  assert.equal(await pending, secret);
  assert.deepEqual(rawMode, [true, false]);
  assert.equal(displayed.join('').includes(secret), false);
});

test('the disposable CLI path reads redirected stdin and emits only a bounded receipt', async () => {
  const setup = await fixture();
  const webhookSecret = randomUUID();
  try {
    const data = JSON.parse(await readFile(setup.config, 'utf8'));
    data.account_id = 'fixture-account';
    await writeFile(setup.config, JSON.stringify(data));
    const result = spawnSync(process.execPath, ['apps/github-app/operator-helper.mjs', 'install', '--fake', '--app-id', '123', '--private-key-file', setup.privateKeyPath, '--account-id', 'fixture-account', '--config', setup.config, '--receipt-file', join(setup.directory, 'receipt.json'), '--webhook-secret-stdin'], { cwd: process.cwd(), input: `${webhookSecret}\n`, encoding: 'utf8', windowsHide: true });
    assert.equal(result.status, 0);
    assert.equal(result.stdout.includes(webhookSecret), false);
    assert.equal(result.stderr.includes(webhookSecret), false);
    const receipt = JSON.parse(result.stdout);
    assert.equal(receipt.state, 'version-created');
    assert.equal(receipt.worker, 'diffdevil-github-app');
    assert.deepEqual(receipt.version, { state: 'read-back', id: 'fixture-created' });
    assert.deepEqual(receipt.carrier, { state: 'not-created' });
  } finally {
    await rm(setup.directory, { recursive: true, force: true });
  }
});

test('explicit seal and Wirt environment inputs stay in the helper and native stdin', async () => {
  const setup = await appFixture();
  const sealName = process.platform === 'win32' ? 'diffdevil_test_seal_key' : 'DIFFDEVIL_TEST_SEAL_KEY';
  const wirtName = 'DIFFDEVIL_TEST_WIRT_KEY';
  const optionsPath = join(setup.directory, 'fixture-options.json');
  const valuesPath = join(setup.directory, 'fixture-state.json');
  const inputArgs = ['--app-id', '123', '--private-key-file', setup.privateKeyPath, '--webhook-secret-file', setup.options.webhookSecretPath, '--oauth-client-id', setup.options.oauthClientId, '--oauth-client-secret-file', setup.options.oauthClientSecretPath, '--seal-key-env', sealName, '--seal-key-initial', '--seal-key-recovery-ref', setup.options.sealKeyRecoveryRef, '--wirt-signing-key-env', wirtName];
  try {
    await writeFile(optionsPath, JSON.stringify({ absentEnvironmentNames: [sealName, wirtName] }));
    const result = cli(setup, 'install', [], { inputArgs, environment: { [sealName.toUpperCase()]: setup.values.APP_SEAL_KEY, [wirtName]: setup.values.WIRT_SIGNING_KEY_CURRENT } });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(containsProtectedValues(result.stdout + result.stderr, setup), false);
    const receipt = JSON.parse(await readFile(setup.options.receiptPath, 'utf8'));
    assert.equal(containsProtectedValues(JSON.stringify(receipt), setup), false);
    const state = JSON.parse(await readFile(valuesPath, 'utf8'));
    assert.deepEqual(state.inputs, appInputs);
    assert.equal(state.deliveryHash, createHash('sha256').update(JSON.stringify(setup.values)).digest('hex'));
    assert.equal(containsProtectedValues(JSON.stringify(state), setup), false);
  } finally { await rm(setup.directory, { recursive: true, force: true }); }
});

test('conflicting file and environment sources refuse before provider reads or writes', async () => {
  const setup = await appFixture();
  const secretName = 'DIFFDEVIL_TEST_SEAL_KEY';
  const statePath = join(setup.directory, 'fixture-state.json');
  try {
    const result = cli(setup, 'install', ['--seal-key-env', secretName], { environment: { [secretName]: setup.values.APP_SEAL_KEY } });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /Choose either a Seal key file or named environment input/u);
    assert.equal(containsProtectedValues(result.stdout + result.stderr, setup), false);
    assert.equal(await readFile(statePath).then(() => true, () => false), false);
    assert.equal(await readFile(setup.options.receiptPath).then(() => true, () => false), false);
    let providerRead = false;
    await assert.rejects(checkCredentials({ ...setup.options, sealKeyPath: undefined, sealKeyEnv: 'CLOUDFLARE_ACCOUNT_ID', runner: async () => { providerRead = true; } }), { code: 'E_OPERATOR_INPUT' });
    assert.equal(providerRead, false);
  } finally { await rm(setup.directory, { recursive: true, force: true }); }
});

test('staging registration preserves organisation reach, OAuth callback and trusted policy refresh', () => {
  const result = registrationInputs({ webhookUrl: 'https://staging.example/webhooks/github', oauthCallbackUrl: 'https://staging.example/auth/callback', visibility: 'public', appName: 'diffdevil staging', policyRefresh: true });
  const url = new URL(result.registrationUrl);
  assert.equal(result.appName, 'diffdevil staging');
  assert.equal(url.searchParams.get('public'), 'true');
  assert.deepEqual(url.searchParams.getAll('callback_urls[]'), ['https://staging.example/auth/callback']);
  assert.deepEqual(url.searchParams.getAll('events[]'), ['pull_request', 'check_run', 'push']);
  assert.throws(() => registrationInputs({ webhookUrl: 'https://staging.example/webhooks/github', oauthCallbackUrl: 'https://production.example/auth/callback' }), { code: 'E_OPERATOR_INPUT' });
});

test('wrong Worker/account and inert, absent or invalid D1 targets refuse before key/input/provider reads', async () => {
  const setup = await fixture();
  let inputRead = false, providerRead = false;
  const base = { appId: '123', privateKeyPath: join(setup.directory, 'missing-private-key.pem'), config: setup.config, accountId: 'account-1', readWebhookSecret: async () => { inputRead = true; return randomUUID(); }, runner: async () => { providerRead = true; throw new Error(); } };
  try {
    await assert.rejects(installCredentials({ ...base, worker: 'diffdevil-app-staging' }), { code: 'E_OPERATOR_TARGET' });
    await assert.rejects(installCredentials({ ...base, accountId: 'account-2' }), { code: 'E_OPERATOR_TARGET' });
    for (const id of ['00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', undefined, '', 'provider-required']) {
      await writeFile(setup.config, JSON.stringify({ name: 'diffdevil-app-staging', d1_databases: [{ binding: 'APP_DB', database_id: id }] }));
      await assert.rejects(installCredentials(base), { code: 'E_OPERATOR_CONFIG' });
    }
    assert.equal(inputRead, false);
    assert.equal(providerRead, false);
    assert.equal(await readFile(join(setup.directory, 'receipt.json')).then(() => true, () => false), false);
  } finally { await rm(setup.directory, { recursive: true, force: true }); }
});

test('joined-App check requires the full input and seal recovery contract before reading contents', async () => {
  const setup = await appFixture();
  const { calls, runner } = versionRunner();
  try {
    // Metadata exists but the content is deliberately not a valid private key. Check must not parse it.
    await writeFile(setup.privateKeyPath, 'not-a-key');
    const result = await checkCredentials({ ...setup.options, runner });
    assert.deepEqual(result.inputs, appInputs);
    assert.equal(result.protectedValues, 'unread');
    assert.equal(result.providerWrite, 'not-attempted');
    assert.equal(result.identity, 'unverified');
    assert.equal(calls.some(call => call.args.includes('bulk')), false);
    await assert.rejects(checkCredentials({ ...setup.options, sealKeyRecoveryRef: undefined, runner }), { code: 'E_OPERATOR_INPUT' });
    await assert.rejects(checkCredentials({ ...setup.options, oauthClientSecretPath: undefined, runner }), { code: 'E_OPERATOR_INPUT' });
    assert.equal(await readFile(setup.options.receiptPath).then(() => true, () => false), false);
  } finally { await rm(setup.directory, { recursive: true, force: true }); }
});

for (const worker of ['diffdevil-app', 'diffdevil-app-staging']) {
  test(`the real CLI delivers all seven inputs to ${worker}, contains echoing native output and retains a non-secret receipt`, async () => {
    const setup = await appFixture(worker);
    try {
      const checked = cli(setup, 'check', ['--worker', worker]);
      assert.equal(checked.status, 0, checked.stderr);
      assert.equal(JSON.parse(checked.stdout).protectedValues, 'unread');
      const result = cli(setup, 'install', ['--worker', worker]);
      assert.equal(result.status, 0, result.stderr);
      const report = JSON.parse(result.stdout);
      assert.equal(report.worker, worker);
      assert.equal(report.state, 'version-created');
      assert.deepEqual(report.inputs, appInputs);
      const receiptText = await readFile(setup.options.receiptPath, 'utf8');
      assert.deepEqual(JSON.parse(receiptText), report);
      assert.equal(containsProtectedValues(result.stdout + result.stderr + receiptText, setup), false);
      const state = JSON.parse(await readFile(join(setup.directory, 'fixture-state.json'), 'utf8'));
      assert.equal(state.deliveryHash, createHash('sha256').update(JSON.stringify(setup.values)).digest('hex'));
      assert.equal(state.writes, 1);
      assert.ok(state.calls.every(args => !args.includes('deploy')));
      assert.equal(state.calls.some(args => args.some(arg => containsProtectedValues(arg, setup))), false);
      const resumed = cli(setup, 'resume');
      assert.equal(resumed.status, 0, resumed.stderr);
      assert.equal(JSON.parse(resumed.stdout).state, 'version-created');
      assert.equal(JSON.parse(await readFile(join(setup.directory, 'fixture-state.json'), 'utf8')).writes, 1);
    } finally { await rm(setup.directory, { recursive: true, force: true }); }
  });
}

test('the real CLI contains failed-provider stdout/stderr without claiming version creation', async () => {
  const setup = await appFixture();
  try {
    await writeFile(join(setup.directory, 'fixture-options.json'), JSON.stringify({ failWrite: true }));
    const result = cli(setup);
    assert.equal(result.status, 2);
    assert.equal(JSON.parse(result.stdout).state, 'not-created');
    assert.equal(containsProtectedValues(result.stdout + result.stderr + await readFile(setup.options.receiptPath, 'utf8'), setup), false);
    const resumed = cli(setup, 'resume');
    assert.equal(resumed.status, 0);
    assert.equal(JSON.parse(resumed.stdout).state, 'not-created');
  } finally { await rm(setup.directory, { recursive: true, force: true }); }
});

test('late native readback failure resumes from the committed receipt without input files or another write', async () => {
  const setup = await appFixture();
  try {
    await writeFile(join(setup.directory, 'fixture-options.json'), JSON.stringify({ omitReadback: true }));
    const result = cli(setup);
    assert.equal(result.status, 2);
    assert.equal(JSON.parse(result.stdout).state, 'unknown');
    assert.equal(JSON.parse(await readFile(setup.options.receiptPath, 'utf8')).command, 'accepted');
    for (const path of [setup.privateKeyPath, setup.options.webhookSecretPath, setup.options.oauthClientSecretPath, setup.options.sealKeyPath, setup.options.wirtSigningKeyPath]) await rm(path);
    await writeFile(join(setup.directory, 'fixture-options.json'), '{}');
    const resumed = cli(setup, 'resume');
    assert.equal(resumed.status, 0, resumed.stderr);
    assert.equal(JSON.parse(resumed.stdout).state, 'version-created');
    assert.equal(JSON.parse(await readFile(join(setup.directory, 'fixture-state.json'), 'utf8')).writes, 1);
    assert.equal(containsProtectedValues(resumed.stdout + resumed.stderr, setup), false);
  } finally { await rm(setup.directory, { recursive: true, force: true }); }
});

test('the latest deployment changing is partial even when an older deployment stays identical', async () => {
  const setup = await appFixture();
  try {
    await writeFile(join(setup.directory, 'fixture-options.json'), JSON.stringify({ changedDeployment: true }));
    const result = cli(setup);
    assert.equal(result.status, 2);
    assert.equal(JSON.parse(result.stdout).state, 'partial');
    assert.equal(JSON.parse(result.stdout).deployment.state, 'changed');
  } finally { await rm(setup.directory, { recursive: true, force: true }); }
});

test('the real CLI refuses an existing/unusable receipt and refuses missing or foreign resume state', async () => {
  const setup = await appFixture();
  try {
    await writeFile(setup.options.receiptPath, 'existing-checkpoint');
    let result = cli(setup);
    assert.equal(result.status, 2);
    assert.equal(await readFile(setup.options.receiptPath, 'utf8'), 'existing-checkpoint');
    assert.equal(JSON.parse(await readFile(join(setup.directory, 'fixture-state.json'), 'utf8')).writes, 0);
    result = cli(setup, 'resume');
    assert.equal(result.status, 2);
    await rm(setup.options.receiptPath);
    result = cli(setup, 'resume');
    assert.equal(result.status, 2);
    result = cli(setup, 'install', ['--receipt-file', join(setup.directory, 'missing', 'receipt.json')]);
    assert.equal(result.status, 2); // Repeated options are refused rather than silently taking the last target.
    const success = cli(setup);
    assert.equal(success.status, 0, success.stderr);
    await writeFile(setup.config, (await readFile(setup.config, 'utf8')) + '\n');
    result = cli(setup, 'resume');
    assert.equal(result.status, 2);
    assert.equal(JSON.parse(await readFile(join(setup.directory, 'fixture-state.json'), 'utf8')).writes, 1);
  } finally { await rm(setup.directory, { recursive: true, force: true }); }
});

test('a retained seal dependency opens the protected authorization after independent reconstruction', async () => {
  const setup = await appFixture();
  try {
    const key = (await readFile(setup.options.sealKeyPath, 'utf8')).trimEnd();
    const sealed = await createProtector({ secret: key }).seal({ accessToken: 'synthetic-restorable-authorization' });
    const recoveryPath = join(setup.directory, 'independently-retained-seal.txt');
    await writeFile(recoveryPath, key);
    await rm(setup.options.sealKeyPath);
    const restoredKey = await readFile(recoveryPath, 'utf8');
    assert.deepEqual(await createProtector({ secret: restoredKey }).open(sealed), { accessToken: 'synthetic-restorable-authorization' });
    assert.equal(await createProtector({ secret: randomUUID() }).open(sealed), undefined);
  } finally { await rm(setup.directory, { recursive: true, force: true }); }
});

test('Community sign-in without Wirt does not require an unused commercial credential', async () => {
  const setup = await appFixture('diffdevil-app');
  try {
    const data = JSON.parse(await readFile(setup.config, 'utf8'));
    delete data.vars.WIRT_ORIGIN;
    await writeFile(setup.config, JSON.stringify(data));
    const result = await installCredentials({ ...setup.options, wirtSigningKeyPath: undefined, runner: versionRunner().runner });
    assert.deepEqual(result.inputs, appInputs.slice(0, 6));
    assert.equal(result.state, 'version-created');
  } finally { await rm(setup.directory, { recursive: true, force: true }); }
});

test('the real CLI refuses a latest-version database mismatch before protected input or checkpoint creation', async () => {
  const setup = await appFixture();
  try {
    await writeFile(join(setup.directory, 'fixture-options.json'), JSON.stringify({ foreignDatabase: true }));
    await rm(setup.privateKeyPath);
    const result = cli(setup);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /latest Worker version does not read back the configured APP_DB/u);
    const state = JSON.parse(await readFile(join(setup.directory, 'fixture-state.json'), 'utf8'));
    assert.equal(state.writes, 0);
    assert.equal(state.calls.some(args => args.includes('bulk')), false);
    assert.equal((await readdir(setup.directory)).includes('receipt.json'), false);
    assert.equal(containsProtectedValues(result.stdout + result.stderr, setup), false);
  } finally { await rm(setup.directory, { recursive: true, force: true }); }
});

test('JSONC targets preserve URL strings, comments and trailing commas without overriding the configured Worker', async () => {
  const setup = await fixture();
  try {
    await writeFile(setup.config, `{
      // Target selected by the operator, not the helper's old default.
      "name": "diffdevil-github-app",
      "account_id": "account-1",
      "vars": { "SITE_ORIGIN": "https://example.test/a//b" },
      "d1_databases": [{ "binding": "APP_DB", "database_id": "${databaseId}", }],
    }`);
    const result = await installCredentials({ appId: '123', privateKeyPath: setup.privateKeyPath, accountId: 'account-1', config: setup.config, readWebhookSecret: async () => randomUUID(), runner: versionRunner().runner });
    assert.equal(result.state, 'version-created');
  } finally { await rm(setup.directory, { recursive: true, force: true }); }
});

test('input failure and configuration drift retain a no-write receipt with no raw exception', async () => {
  const setup = await fixture();
  const receiptPath = join(setup.directory, 'receipt.json');
  const { calls, runner } = versionRunner();
  const canary = randomUUID();
  try {
    const options = { appId: '123', privateKeyPath: setup.privateKeyPath, config: setup.config, accountId: 'account-1', runner };
    await assert.rejects(installCredentials({ ...options, readWebhookSecret: async () => { throw new Error(canary); } }), error => error.code === 'E_OPERATOR_INPUT' && !JSON.stringify(error.receipt).includes(canary) && !error.message.includes(canary));
    assert.equal(JSON.parse(await readFile(receiptPath, 'utf8')).command, 'not-attempted');
    const resumed = await resumeCredentials({ ...options, receiptPath });
    assert.equal(resumed.state, 'not-attempted');
    await rm(receiptPath);
    const original = await readFile(setup.config, 'utf8');
    await assert.rejects(installCredentials({ ...options, readWebhookSecret: async () => { await writeFile(setup.config, original + '\n'); return canary; } }), { code: 'E_OPERATOR_TARGET' });
    assert.equal(JSON.parse(await readFile(receiptPath, 'utf8')).command, 'not-attempted');
    assert.equal(calls.some(call => call.args.includes('bulk')), false);
    assert.deepEqual((await readdir(setup.directory)).filter(name => name.startsWith('.diffdevil-')), []);
  } finally { await rm(setup.directory, { recursive: true, force: true }); }
});

test('an unusable checkpoint directory refuses before protected input', async () => {
  const setup = await fixture();
  let inputRead = false;
  try {
    await assert.rejects(installCredentials({ appId: '123', privateKeyPath: setup.privateKeyPath, accountId: 'account-1', config: setup.config, receiptPath: join(setup.directory, 'missing-directory', 'receipt.json'), readWebhookSecret: async () => { inputRead = true; return randomUUID(); }, runner: versionRunner().runner }), { code: 'E_OPERATOR_RECEIPT' });
    assert.equal(inputRead, false);
  } finally { await rm(setup.directory, { recursive: true, force: true }); }
});

test('a receipt commit failure after the write retains the ambiguity marker and resume never repeats the write', async () => {
  const setup = await fixture();
  const receiptDirectory = join(setup.directory, 'receipt-home');
  const retainedDirectory = join(setup.directory, 'retained-receipt-home');
  const { mkdir } = await import('node:fs/promises');
  await mkdir(receiptDirectory);
  const receiptPath = join(receiptDirectory, 'receipt.json');
  const fake = versionRunner();
  let moved = false;
  const runner = async call => {
    const result = await fake.runner(call);
    if (call.args.includes('bulk')) { await rename(receiptDirectory, retainedDirectory); moved = true; }
    return result;
  };
  try {
    const options = { appId: '123', privateKeyPath: setup.privateKeyPath, config: setup.config, accountId: 'account-1', receiptPath, readWebhookSecret: async () => randomUUID(), runner };
    await assert.rejects(installCredentials(options), { code: 'E_OPERATOR_RECEIPT' });
    assert.equal(JSON.parse(await readFile(join(retainedDirectory, 'receipt.json'), 'utf8')).command, 'attempted-unknown');
    await rename(retainedDirectory, receiptDirectory);
    moved = false;
    await assert.rejects(resumeCredentials({ ...options, runner: fake.runner }), error => error.code === 'E_OPERATOR_VERSION' && error.receipt.state === 'partial' && error.receipt.version.state === 'read-back');
    assert.equal(fake.calls.filter(call => call.args.includes('bulk')).length, 1);
  } finally {
    if (moved) await rename(retainedDirectory, receiptDirectory);
    await rm(setup.directory, { recursive: true, force: true });
  }
});

test('App ID, OAuth client and bot mismatches persist terminal no-write receipts', async () => {
  const setup = await appFixture();
  try {
    for (const [index, mismatch] of [{ id: 999 }, { client_id: 'other-client' }, { slug: 'other-app' }].entries()) {
      const fake = versionRunner();
      const receiptPath = join(setup.directory, `identity-refused-${index}.json`);
      await assert.rejects(installCredentials({ ...setup.options, receiptPath, runner: fake.runner, githubFetch: fixtureGitHubFetch(setup.options.oauthClientId, mismatch) }), error => error.code === 'E_OPERATOR_IDENTITY' && error.receipt.state === 'not-attempted' && /new receipt/u.test(error.message));
      const receipt = JSON.parse(await readFile(receiptPath, 'utf8'));
      assert.equal(receipt.state, 'not-attempted');
      assert.equal(receipt.command, 'not-attempted');
      assert.equal(fake.calls.some(call => call.args.includes('bulk')), false);
      assert.equal(containsProtectedValues(JSON.stringify(receipt), setup), false);
    }
    const privateKey = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({ type: 'pkcs1', format: 'pem' });
    await writeFile(setup.privateKeyPath, privateKey);
    const fake = versionRunner();
    await assert.rejects(installCredentials({ ...setup.options, runner: fake.runner }), { code: 'E_OPERATOR_IDENTITY' });
    assert.equal(fake.calls.some(call => call.args.includes('bulk')), false);
  } finally { await rm(setup.directory, { recursive: true, force: true }); }
});

test('the hidden CLI refuses an unverified bot and contains arbitrary identity response fields', async () => {
  const setup = await appFixture();
  try {
    await writeFile(join(setup.directory, 'fixture-options.json'), JSON.stringify({ githubIdentity: { client_secret: setup.values.GITHUB_OAUTH_CLIENT_SECRET }, githubBot: { type: 'User', private_key: fixtureKey } }));
    const result = cli(setup);
    assert.equal(result.status, 2);
    assert.equal(JSON.parse(result.stdout).state, 'not-attempted');
    assert.equal(containsProtectedValues(result.stdout + result.stderr, setup), false);
    assert.equal(JSON.parse(await readFile(join(setup.directory, 'fixture-state.json'), 'utf8')).writes, 0);
  } finally { await rm(setup.directory, { recursive: true, force: true }); }
});

test('manifest-captured GitHub inputs qualify identity without plaintext credential files', async () => {
  const setup = await appFixture();
  const fake = versionRunner();
  try {
    for (const path of [setup.privateKeyPath, setup.options.webhookSecretPath, setup.options.oauthClientSecretPath]) await rm(path);
    const clientId = 'Iv1.synthetic-client';
    const values = { ...setup.values, GITHUB_OAUTH_CLIENT_ID: clientId };
    const result = await installCredentials({ ...setup.options, oauthClientId: clientId, runner: fake.runner, githubFetch: fixtureGitHubFetch(clientId), readGitHubInputs: async () => {
      assert.equal(JSON.parse(await readFile(setup.options.receiptPath, 'utf8')).command, 'not-attempted');
      return values;
    } });
    assert.deepEqual(result.identity, { state: 'verified', appId: '123', clientId, botLogin: 'diffdevil[bot]', botId: '456' });
    assert.deepEqual(JSON.parse(fake.calls.find(call => call.args.includes('bulk')).input), values);
    assert.equal(containsProtectedValues(JSON.stringify(result), setup), false);
  } finally { await rm(setup.directory, { recursive: true, force: true }); }
});

test('initial seal mode refuses an existing uploaded seal by name before protected input or a native write', async () => {
  const setup = await appFixture();
  try {
    await writeFile(join(setup.directory, 'fixture-options.json'), JSON.stringify({ existingInputs: ['APP_SEAL_KEY'] }));
    for (const command of ['check', 'install']) {
      const result = cli(setup, command);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /APP_SEAL_KEY/u);
      assert.equal(containsProtectedValues(result.stdout + result.stderr, setup), false);
    }
    const state = JSON.parse(await readFile(join(setup.directory, 'fixture-state.json'), 'utf8'));
    assert.equal(state.writes, 0);
    assert.equal(state.calls.some(args => args.includes('bulk')), false);
    await assert.rejects(readFile(setup.options.receiptPath), { code: 'ENOENT' });
  } finally { await rm(setup.directory, { recursive: true, force: true }); }
});

test('the qualified bootstrap version refuses early mismatch and drift during private input', async () => {
  const setup = await appFixture();
  const fake = versionRunner();
  let inputRead = false;
  try {
    await assert.rejects(installCredentials({ ...setup.options, baseVersionId: 'foreign-build', runner: fake.runner }), { code: 'E_OPERATOR_TARGET' });
    assert.equal(await readFile(setup.options.receiptPath).then(() => true, () => false), false);
    const runner = async call => inputRead && call.args.includes('list') && call.args.includes('versions') ? { code: 0, stdout: JSON.stringify([{ id: 'foreign-build' }]) } : fake.runner(call);
    await assert.rejects(installCredentials({ ...setup.options, runner, readGitHubInputs: async () => { inputRead = true; return setup.values; } }), error => error.code === 'E_OPERATOR_TARGET' && error.receipt.state === 'not-attempted');
    assert.equal(JSON.parse(await readFile(setup.options.receiptPath, 'utf8')).state, 'not-attempted');
    assert.equal(fake.calls.some(call => call.args.includes('bulk')), false);
  } finally { await rm(setup.directory, { recursive: true, force: true }); }
});

test('the uploaded bootstrap must carry the configured bot before protected input', async () => {
  const setup = await appFixture();
  let inputRead = false;
  try {
    const config = JSON.parse(await readFile(setup.config, 'utf8'));
    config.vars.GITHUB_APP_BOT_LOGIN = 'diffdevil-staging[bot]';
    await writeFile(setup.config, JSON.stringify(config));
    await assert.rejects(installCredentials({ ...setup.options, runner: versionRunner().runner, readGitHubInputs: async () => { inputRead = true; return setup.values; } }), { code: 'E_OPERATOR_TARGET' });
    assert.equal(inputRead, false);
    assert.equal(await readFile(setup.options.receiptPath).then(() => true, () => false), false);
  } finally { await rm(setup.directory, { recursive: true, force: true }); }
});

test('the real CLI qualifies a distinct staging bot through App, user and uploaded-version readback', async () => {
  const setup = await appFixture();
  try {
    const config = JSON.parse(await readFile(setup.config, 'utf8'));
    config.vars.GITHUB_APP_BOT_LOGIN = 'diffdevil-staging[bot]';
    await writeFile(setup.config, JSON.stringify(config));
    await writeFile(join(setup.directory, 'fixture-options.json'), JSON.stringify({ githubIdentity: { slug: 'diffdevil-staging' } }));
    const result = cli(setup);
    assert.equal(result.status, 0, result.stderr);
    const receipt = JSON.parse(result.stdout);
    assert.equal(receipt.identity.botLogin, config.vars.GITHUB_APP_BOT_LOGIN);
    assert.equal(receipt.baseVersionId, setup.options.baseVersionId);
    assert.equal(containsProtectedValues(result.stdout + result.stderr, setup), false);
  } finally { await rm(setup.directory, { recursive: true, force: true }); }
});

test('a durable seal receipt survives the original carrier and refuses another key, target or custody reference', async () => {
  const original = await appFixture();
  const replacement = await appFixture();
  const handback = await mkdtemp(join(tmpdir(), 'diffdevil-retained-operation-'));
  const previousPath = join(handback, 'credential-receipt.json');
  try {
    const first = await installCredentials({ ...original.options, runner: versionRunner().runner });
    await writeFile(previousPath, JSON.stringify(first));
    const retainedKey = original.values.APP_SEAL_KEY;
    await rm(original.directory, { recursive: true, force: true });
    await writeFile(replacement.options.sealKeyPath, retainedKey);
    const options = { ...replacement.options, sealKeyInitial: false, sealKeyPreviousReceiptPath: previousPath };
    const matched = await installCredentials({ ...options, runner: versionRunner().runner });
    assert.deepEqual(matched.sealKeyContinuity, { state: 'matched', sha256: first.sealKeyContinuity.sha256, previousVersionId: first.version.id });
    assert.equal(matched.sealKeyRecoveryRef, first.sealKeyRecoveryRef);
    assert.equal(JSON.stringify(matched).includes(retainedKey), false);
    for (const [index, change] of [{ receipt: { ...first, databaseId: 'abcdefab-abcd-abcd-abcd-abcdefabcdef' } }, { recoveryRef: 'foreign-custody' }, { key: replacement.values.APP_SEAL_KEY }].entries()) {
      await writeFile(previousPath, JSON.stringify(change.receipt ?? first));
      await writeFile(replacement.options.sealKeyPath, change.key ?? retainedKey);
      const fake = versionRunner();
      await assert.rejects(installCredentials({ ...options, receiptPath: join(replacement.directory, `continuity-refused-${index}.json`), sealKeyRecoveryRef: change.recoveryRef ?? options.sealKeyRecoveryRef, runner: fake.runner }), error => error.code === 'E_OPERATOR_SEAL' && error.receipt.state === 'not-attempted');
      assert.equal(fake.calls.some(call => call.args.includes('bulk')), false);
    }
  } finally { await Promise.all([original.directory, replacement.directory, handback].map(path => rm(path, { recursive: true, force: true }))); }
});

test('seal generation writes one exclusive random custody input and prints only its non-secret check', async () => {
  const setup = await fixture();
  const path = join(setup.directory, 'synthetic-custody-seal.txt');
  const args = ['apps/github-app/operator-helper.mjs', 'generate-seal', '--seal-key-file', path, '--seal-key-recovery-ref', 'fixture-custody'];
  try {
    const result = spawnSync(process.execPath, args, { encoding: 'utf8', windowsHide: true });
    assert.equal(result.status, 0, result.stderr);
    const key = (await readFile(path, 'utf8')).trimEnd();
    assert.match(key, /^[A-Za-z0-9_-]{43}$/u);
    const receipt = JSON.parse(result.stdout);
    assert.equal(receipt.recoveryRef, 'fixture-custody');
    assert.equal(receipt.sha256, createHash('sha256').update('diffdevil-seal-continuity-v1\0').update(key).digest('hex'));
    assert.equal((result.stdout + result.stderr).includes(key), false);
    const repeated = spawnSync(process.execPath, args, { encoding: 'utf8', windowsHide: true });
    assert.equal(repeated.status, 2);
    assert.equal((await readFile(path, 'utf8')).trimEnd(), key);
    assert.equal((repeated.stdout + repeated.stderr).includes(key), false);
  } finally { await rm(setup.directory, { recursive: true, force: true }); }
});
