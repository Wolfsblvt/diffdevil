// SPDX-License-Identifier: AGPL-3.0-only

import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { generateKeyPairSync, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';
import { test } from 'node:test';
import { installCredentials, readHiddenTerminalSecret, registrationInputs } from './operator-helper.mjs';

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), 'diffdevil-app-helper-'));
  const privateKeyPath = join(directory, 'github-app.pem');
  const config = join(directory, 'qualification.jsonc');
  const pair = generateKeyPairSync('rsa', { modulusLength: 2048 });
  await Promise.all([
    writeFile(privateKeyPath, pair.privateKey.export({ type: 'pkcs1', format: 'pem' })),
    writeFile(config, JSON.stringify({ account_id: 'account-1', d1_databases: [{ database_id: 'real-database-id' }] }))
  ]);
  return { directory, privateKeyPath, config };
}

function versionRunner({ account = 'match', command = 'accepted', deployment = 'unchanged', versionReadback = 'complete' } = {}) {
  let created = false;
  const calls = [];
  return {
    calls,
    runner: async call => {
      calls.push(call);
      if (call.args.includes('whoami')) return { code: 0, stdout: JSON.stringify({ accounts: account === 'match' ? [{ id: 'account-1' }] : [] }), stderr: '' };
      if (call.args.includes('deployments')) return { code: 0, stdout: JSON.stringify(deployment === 'absent' ? [] : deployment === 'changed' && created ? [{ id: 'deployment-after' }] : [{ id: 'deployment-before' }]), stderr: '' };
      if (call.args.includes('versions') && call.args.includes('list')) {
        if (versionReadback === 'unknown' && created) return { code: 1, stdout: '', stderr: '' };
        return { code: 0, stdout: JSON.stringify(created ? [{ id: 'version-before' }, { id: 'version-created' }] : [{ id: 'version-before' }]), stderr: '' };
      }
      if (call.args.includes('versions') && call.args.includes('view')) return { code: versionReadback === 'complete' || versionReadback === 'wrong-id' ? 0 : 1, stdout: versionReadback === 'complete' ? JSON.stringify({ id: 'version-created' }) : versionReadback === 'wrong-id' ? JSON.stringify({ id: 'other-version' }) : '', stderr: '' };
      if (call.args.includes('bulk')) {
        if (command === 'throws') throw new Error('fixture transport error');
        created = command === 'accepted';
        return { code: command === 'accepted' ? 0 : 1, stdout: '', stderr: '' };
      }
      return { code: 2, stdout: '', stderr: '' };
    }
  };
}

test('registration inputs select only the App permissions and explicit events', () => {
  const inputs = registrationInputs({ webhookUrl: 'https://app.example/webhooks/github' });
  assert.deepEqual(inputs.permissions, { contents: 'read', pullRequests: 'write', checks: 'write' });
  assert.deepEqual(inputs.events, ['pull_request', 'check_run']);
  assert.deepEqual(inputs.providerDefaultEvents, ['installation', 'installation_repositories']);
  const url = new URL(inputs.registrationUrl);
  assert.equal(url.searchParams.get('issues'), null);
  assert.deepEqual(url.searchParams.getAll('events[]'), ['pull_request', 'check_run']);
});

test('credential installation creates one un-deployed version and removes its transient secret carrier', async () => {
  const setup = await fixture();
  const { calls, runner } = versionRunner();
  const webhookSecret = randomUUID();
  try {
    const result = await installCredentials({ appId: '123', privateKeyPath: setup.privateKeyPath, accountId: 'account-1', config: setup.config, readWebhookSecret: async () => webhookSecret, runner });
    assert.deepEqual(result, { state: 'version-created', accountId: 'account-1', worker: 'diffdevil-github-app', command: 'accepted', version: { state: 'read-back', id: 'version-created' }, deployment: { state: 'unchanged' }, carrier: { state: 'removed' } });
    const bulk = calls.find(call => call.args.includes('bulk'));
    assert.ok(bulk);
    assert.equal(bulk.args.includes(webhookSecret), false);
    assert.equal(bulk.args.some(argument => argument.includes('BEGIN RSA PRIVATE KEY')), false);
    assert.equal(await readFile(bulk.args[bulk.args.indexOf('bulk') + 1], 'utf8').then(() => true, () => false), false);
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
    await assert.rejects(installCredentials({ appId: '123', privateKeyPath: setup.privateKeyPath, accountId: 'account-1', config: setup.config, readWebhookSecret: async () => randomUUID(), runner: versionRunner({ command: 'throws' }).runner }), error => error.code === 'E_OPERATOR_VERSION' && error.receipt.state === 'unknown' && error.receipt.command === 'not-attempted' && error.receipt.carrier.state === 'removed');
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
  await writeFile(placeholder, JSON.stringify({ database_id: '00000000-0000-0000-0000-000000000000' }));
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
    const result = spawnSync(process.execPath, ['apps/github-app/operator-helper.mjs', 'install', '--fake', '--app-id', '123', '--private-key-file', setup.privateKeyPath, '--account-id', 'fixture-account', '--config', setup.config, '--webhook-secret-stdin'], { cwd: process.cwd(), input: `${webhookSecret}\n`, encoding: 'utf8', windowsHide: true });
    assert.equal(result.status, 0);
    assert.equal(result.stdout.includes(webhookSecret), false);
    assert.equal(result.stderr.includes(webhookSecret), false);
    assert.deepEqual(JSON.parse(result.stdout), { state: 'version-created', accountId: 'fixture-account', worker: 'diffdevil-github-app', command: 'accepted', version: { state: 'read-back', id: 'fixture-created' }, deployment: { state: 'unchanged' }, carrier: { state: 'removed' } });
  } finally {
    await rm(setup.directory, { recursive: true, force: true });
  }
});
