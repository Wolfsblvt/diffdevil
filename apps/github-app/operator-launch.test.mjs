// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { generateKeyPairSync, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { syntheticArtifact } from './fixtures/operator-artifact.mjs';
import { sha256, RETAINED_INPUT_NAMES } from './operator-artifact.mjs';

function launch(helper, args, env, { bash, ...options } = {}) {
  const windows = process.platform === 'win32' && !bash;
  const executable = windows ? 'pwsh' : bash ?? 'bash';
  const prefix = windows
    ? ['-NoProfile', '-NonInteractive', '-File', resolve('apps/github-app/operator-launch.ps1')]
    : ['-p', resolve('apps/github-app/operator-launch.sh')];
  return spawnSync(executable, [...prefix, helper, ...args], { encoding: 'utf8', windowsHide: true, env, ...options });
}

const entries = [undefined, ...(process.platform === 'win32' && existsSync('C:/Program Files/Git/bin/bash.exe') ? ['C:/Program Files/Git/bin/bash.exe'] : [])];
for (const bash of entries) test(`public clean ${bash ? 'Git Bash' : process.platform === 'win32' ? 'PowerShell' : 'Bash'} launch prevents ambient preloads before Node and preserves the seven-input installation journey`, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'diffdevil clean entry '));
  const marker = join(directory, 'preload-ran');
  const preload = join(directory, 'hostile.cjs');
  const shellStartup = join(directory, 'startup.sh');
  const pem = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({ type: 'pkcs1', format: 'pem' });
  const values = { webhook: randomUUID(), oauth: randomUUID(), seal: randomUUID(), wirt: randomUUID() };
  const config = join(directory, 'config.json');
  const receiptPath = join(directory, 'receipt.json');
  try {
    await writeFile(preload, `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'ambient code ran'); process.stdin.on('data', chunk => require('node:fs').appendFileSync(${JSON.stringify(marker)}, chunk));`);
    await writeFile(shellStartup, `printf compromised > '${marker.replaceAll("'", "'\\''")}'\n`);
    await writeFile(config, JSON.stringify({ name: 'diffdevil-app', account_id: 'fixture-account', vars: { APP_ORIGIN: 'https://example.invalid', WIRT_ORIGIN: 'https://wirt.invalid' }, d1_databases: [{ binding: 'APP_DB', database_id: '12345678-1234-1234-1234-123456789abc' }] }));
    await writeFile(join(directory, 'key.pem'), pem);
    await writeFile(join(directory, 'webhook.txt'), values.webhook);
    await writeFile(join(directory, 'oauth.txt'), values.oauth);
    const artifact = await syntheticArtifact(config);
    const env = { ...process.env, NODE_OPTIONS: `--require=${JSON.stringify(preload)}`, NODE_PATH: directory, BASH_ENV: shellStartup, HTTPS_PROXY: 'http://127.0.0.1:1', NODE_EXTRA_CA_CERTS: join(directory, 'missing-ca'), CF_API_TOKEN: 'unselected', CLOUDFLARE_API_BASE_URL: 'http://127.0.0.1:1', TEST_SEAL: values.seal, TEST_WIRT: values.wirt };
    // Positive control establishes that this exact ambient preload would run.
    const unsafe = spawnSync(process.execPath, ['-e', 'process.stdin.resume()'], { env, input: 'synthetic-credential-payload', encoding: 'utf8', windowsHide: true });
    assert.equal(unsafe.status, 0);
    assert.match(await readFile(marker, 'utf8'), /synthetic-credential-payload/u);
    await rm(marker);

    const result = launch('operator', ['install', '--fake', '--app-id', '123', '--private-key-file', join(directory, 'key.pem'), '--webhook-secret-stdin', '--oauth-client-id', 'fixture-client', '--oauth-client-secret-file', join(directory, 'oauth.txt'), '--seal-key-env', 'TEST_SEAL', '--wirt-signing-key-env', 'TEST_WIRT', '--seal-key-initial', '--seal-key-recovery-ref', 'retained-fixture', '--base-version-id', 'fixture-before', '--account-id', 'fixture-account', '--config', config, '--receipt-file', receiptPath, '--artifact-file', artifact.artifactPath, '--artifact-sha256', artifact.artifactSha256], env, { bash, input: values.webhook });
    assert.equal(result.status, 0, result.stderr);
    const receipt = JSON.parse(result.stdout);
    assert.equal(receipt.mode, 'fixture');
    assert.equal(receipt.state, 'version-created');
    assert.equal(receipt.inputs.length, 7);
    assert.equal(await readFile(marker).then(() => true, () => false), false);
    for (const value of [...Object.values(values), pem]) assert.equal(`${result.stdout}${result.stderr}`.includes(value), false);
    assert.deepEqual(JSON.parse(await readFile(receiptPath, 'utf8')), receipt);

    const resumed = launch('operator', ['resume', '--fake', '--account-id', 'fixture-account', '--config', config, '--receipt-file', receiptPath], env, { bash });
    // The in-memory provider is fresh: read-only reconciliation cannot invent the version.
    assert.equal(resumed.status, 2);
    assert.equal(await readFile(marker).then(() => true, () => false), false);
    const retainedInputs = { format: 'diffdevil-retained-inputs-v1', accountId: 'fixture-account', worker: 'diffdevil-app', databaseId: '12345678-1234-1234-1234-123456789abc', configHash: sha256(await readFile(config)), sourceVersionId: 'fixture-before', custodyRef: 'fixture-version-custody', identity: { appId: '123', clientId: 'fixture-client', botLogin: 'diffdevil[bot]', botId: '456' } };
    const retained = await syntheticArtifact(config, { retainedInputs });
    const retainedReceipt = join(directory, 'retained-receipt.json');
    const retainedArguments = ['--fake', '--app-id', '123', '--oauth-client-id', 'fixture-client', '--oauth-client-secret-file', join(directory, 'oauth.txt'), '--seal-key-env', 'TEST_SEAL', '--wirt-signing-key-env', 'TEST_WIRT', '--seal-key-initial', '--seal-key-recovery-ref', 'retained-fixture', '--base-version-id', 'fixture-before', '--account-id', 'fixture-account', '--config', config, '--receipt-file', retainedReceipt, '--artifact-file', retained.artifactPath, '--artifact-sha256', retained.artifactSha256];
    for (const command of ['check', 'install']) {
      const result = launch('operator', [command, ...retainedArguments], env, { bash });
      assert.equal(result.status, 0, result.stderr);
      const report = JSON.parse(result.stdout);
      assert.equal(report.state, command === 'check' ? 'ready-for-input' : 'version-created');
      assert.deepEqual(report.inputProvenance.retained, RETAINED_INPUT_NAMES);
      assert.equal(await readFile(marker).then(() => true, () => false), false);
      for (const value of [...Object.values(values), pem]) assert.equal(`${result.stdout}${result.stderr}`.includes(value), false);
    }
    const status = launch('manifest', ['--help'], env, { bash });
    assert.equal(status.status, 0, status.stderr);
    assert.equal(await readFile(marker).then(() => true, () => false), false);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
