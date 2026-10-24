// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/** Explicit test import: fake only HTTP; execute the maintained uploader and native synthetic authentication. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
const args = process.argv.slice(2);
const artifactPath = args[args.indexOf('--artifact-file') + 1];
const artifact = JSON.parse(await readFile(artifactPath, 'utf8'));
const options = JSON.parse(await readFile(join(dirname(artifactPath), 'fixture-options.json'), 'utf8'));
const statePath = join(dirname(artifactPath), 'fixture-state.json');
globalThis.fetch = async (url, request) => {
  assert.equal(request.redirect, 'error');
  assert.equal(request.headers.Authorization, 'Bearer synthetic-native-auth');
  if (url.endsWith('/assets-upload-session')) return { ok: true, json: async () => ({ success: true, result: { jwt: 'synthetic-assets-complete', buckets: [] } }) };
  assert.equal(url, `https://api.cloudflare.com/client/v4/accounts/${artifact.accountId}/workers/scripts/${artifact.worker}/versions?bindings_inherit=strict`);
  const state = JSON.parse(await readFile(statePath, 'utf8'));
  // A foreign upload wins latest immediately before the maintained uploader's POST.
  state.foreignUpload = !artifact.retainedInputs || options.foreignUploadDuringPost === true;
  const metadata = JSON.parse(request.body.get('metadata'));
  const secrets = Object.fromEntries(metadata.bindings.filter(binding => binding.type === 'secret_text').map(binding => [binding.name, binding.text]));
  for (const file of artifact.modules) assert.equal(Buffer.from(await request.body.get(file.name).arrayBuffer()).toString('base64'), file.content);
  assert.equal(metadata.keep_bindings, undefined);
  if (artifact.assets) {
    assert.equal(metadata.assets.jwt, 'synthetic-assets-complete');
    assert.deepEqual(metadata.assets.config, artifact.assets.config);
  }
  const retained = artifact.retainedInputs ? ['GITHUB_APP_ID', 'GITHUB_WEBHOOK_SECRET', 'GITHUB_APP_PRIVATE_KEY'] : [];
  assert.deepEqual(metadata.bindings.filter(binding => binding.type === 'inherit').map(binding => binding.name), retained);
  state.inputs = [...Object.keys(secrets), ...retained];
  state.deliveryHash = createHash('sha256').update(JSON.stringify(secrets)).digest('hex');
  state.artifactSha256 = args[args.indexOf('--artifact-sha256') + 1];
  state.operationId = args[args.indexOf('--operation-id') + 1];
  state.secretAttachmentBase = `artifact:${state.artifactSha256}`;
  state.moduleHash = createHash('sha256').update(Buffer.from(artifact.modules[0].content, 'base64')).digest('hex');
  state.writes += 1;
  state.created = true;
  await writeFile(statePath, JSON.stringify(state));
  if (options.loseAcknowledgement) throw new Error('synthetic lost response after version creation');
  return { ok: true, json: async () => ({ success: true, result: { id: 'version-created' } }) };
};
