// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/** Qualify artifact-bound attachment against the foreign-latest counterexample, with synthetic inputs only. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash, createPublicKey, generateKeyPairSync, randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { syntheticArtifact } from './operator-artifact.mjs';

const directory = await mkdtemp(join(tmpdir(), 'diffdevil-latest-race-'));
try {
  const key = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
  const config = join(directory, 'config.json');
  const receipt = join(directory, 'receipt.json');
  await writeFile(config, JSON.stringify({ name: 'diffdevil-app', account_id: 'account-1', vars: { APP_ORIGIN: 'https://example.invalid', WIRT_ORIGIN: 'https://wirt.invalid' }, d1_databases: [{ binding: 'APP_DB', database_id: '12345678-1234-1234-1234-123456789abc' }] }));
  await writeFile(join(directory, 'key.pem'), key.export({ type: 'pkcs1', format: 'pem' }));
  await writeFile(join(directory, 'fixture-public-key.pem'), createPublicKey(key).export({ type: 'spki', format: 'pem' }));
  for (const name of ['webhook', 'oauth', 'seal', 'wirt']) await writeFile(join(directory, `${name}.txt`), randomUUID());
  await writeFile(join(directory, 'fixture-options.json'), JSON.stringify({ foreignUploadBeforeWrite: true }));
  const artifact = await syntheticArtifact(config);
  // This test-owned import replaces GitHub only; Wrangler is the separate native fixture.
  const prefix = ['--import', pathToFileURL(resolve('apps/github-app/fixtures/operator-github.mjs')).href, 'apps/github-app/operator-helper.mjs'];
  const target = ['--account-id', 'account-1', '--config', config, '--receipt-file', receipt, '--fixture-wrangler', resolve('apps/github-app/fixtures/operator-provider.mjs'), '--artifact-file', artifact.artifactPath, '--artifact-sha256', artifact.artifactSha256];
  const env = { ...process.env, DIFFDEVIL_OPERATOR_FIXTURE_DIRECTORY: directory };
  delete env.NODE_OPTIONS;
  const run = args => spawnSync(process.execPath, [...prefix, ...args], { encoding: 'utf8', env, windowsHide: true });
  const installed = run(['install', ...target, '--base-version-id', 'version-before', '--app-id', '123', '--private-key-file', join(directory, 'key.pem'), '--webhook-secret-file', join(directory, 'webhook.txt'), '--oauth-client-id', 'fixture-oauth-client', '--oauth-client-secret-file', join(directory, 'oauth.txt'), '--seal-key-file', join(directory, 'seal.txt'), '--wirt-signing-key-file', join(directory, 'wirt.txt'), '--seal-key-initial', '--seal-key-recovery-ref', 'synthetic-custody']);
  assert.equal(installed.status, 0, installed.stderr);
  const first = JSON.parse(await readFile(receipt, 'utf8'));
  const beforeResume = JSON.parse(await readFile(join(directory, 'fixture-state.json'), 'utf8'));
  assert.equal(first.baseVersionId, 'version-before');
  assert.equal(first.command, 'accepted');
  assert.equal(first.state, 'version-created');
  assert.equal(first.artifact.lineage, 'read-back');
  assert.equal(beforeResume.secretAttachmentBase, `artifact:${artifact.artifactSha256}`);
  assert.equal(beforeResume.foreignUpload, true);
  assert.equal(beforeResume.inputs.length, 7);
  const resumed = run(['resume', ...target]);
  assert.equal(resumed.status, 0, resumed.stderr);
  const afterResume = JSON.parse(await readFile(join(directory, 'fixture-state.json'), 'utf8'));
  assert.equal(afterResume.writes, 1);
  const wranglerLock = JSON.parse(await readFile('package-lock.json', 'utf8')).packages['node_modules/wrangler'];
  process.stdout.write(`${JSON.stringify({ specimen: 'synthetic-cli-and-native-child', qualifiedBase: first.baseVersionId, actualAttachmentBase: beforeResume.secretAttachmentBase, foreignUpload: beforeResume.foreignUpload, inputCount: beforeResume.inputs.length, command: first.command, receipt: first.state, writesAfterReadOnlyResume: afterResume.writes, guarantee: 'artifact-bound source; unrelated latest upload did not receive credentials', wrangler: { version: wranglerLock.version, integrity: wranglerLock.integrity }, helperSha256: createHash('sha256').update(await readFile('apps/github-app/operator-helper.mjs')).digest('hex') }, null, 2)}\n`);
} finally { await rm(directory, { recursive: true, force: true }); }
