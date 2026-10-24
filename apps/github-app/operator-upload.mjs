// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/** Contained credential child: native authentication, immutable assets, one version POST, no deployment/retry. */
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readCredentialArtifact, RETAINED_INPUT_NAMES, sha256 } from './operator-artifact.mjs';
import { assertRetainedSourceCurrent, buildWranglerCommand, createProcessRunner, nativeProcessEnvironment } from './operator-helper.mjs';

const NATIVE_WRANGLER = fileURLToPath(new URL('../../node_modules/wrangler/bin/wrangler.js', import.meta.url));
const fail = () => { throw new Error('Artifact upload did not complete.'); };

async function authentication({ config, env, runner, wrangler }) {
  // This credential-valued native response stays inside this contained child.
  const response = await runner({ args: buildWranglerCommand(wrangler, ['auth', 'token', '--json'], { config }), env: { ...env, WRANGLER_LOG: 'log' }, input: '' });
  if (response.code !== 0) fail();
  const value = JSON.parse(response.stdout);
  if (['api_token', 'oauth'].includes(value.type) && typeof value.token === 'string' && value.token) return { Authorization: `Bearer ${value.token}` };
  if (value.type === 'api_key' && value.key && value.email) return { 'X-Auth-Key': value.key, 'X-Auth-Email': value.email };
  fail();
}

async function providerRequest(fetchImpl, path, headers, body) {
  const response = await fetchImpl(`https://api.cloudflare.com/client/v4${path}`, { method: 'POST', headers, body, redirect: 'error' });
  if (!response.ok) fail();
  const envelope = await response.json();
  if (envelope.success !== true || !envelope.result) fail();
  return envelope.result;
}

async function uploadAssets({ artifact, accountId, worker, headers, fetchImpl }) {
  if (!artifact.assets) return undefined;
  const assets = artifact.assets;
  const byHash = new Map(assets.files.map(file => [file.hash, file]));
  const manifest = Object.fromEntries(assets.files.map(file => [file.path, { hash: file.hash, size: file.size }]));
  const session = await providerRequest(fetchImpl, `/accounts/${accountId}/workers/scripts/${worker}/assets-upload-session`, { ...headers, 'Content-Type': 'application/json' }, JSON.stringify({ manifest }));
  if (typeof session.jwt !== 'string' || !Array.isArray(session.buckets) || session.buckets.some(bucket => !Array.isArray(bucket) || bucket.some(hash => !byHash.has(hash)))) fail();
  let completion = session.buckets.length === 0 || session.buckets.every(bucket => bucket.length === 0) ? session.jwt : undefined;
  let single = false;
  try { single = JSON.parse(Buffer.from(session.jwt.split('.')[1], 'base64url').toString('utf8')).wrangler_single_asset_uploads === true; } catch { /* Opaque tokens use the documented bulk protocol. */ }
  for (const bucket of session.buckets) {
    if (!bucket.length) continue;
    if (single) {
      for (const hash of bucket) {
        const file = byHash.get(hash);
        const result = await providerRequest(fetchImpl, `/accounts/${accountId}/workers/assets/upload/${hash}`, { Authorization: `Bearer ${session.jwt}`, 'Content-Type': file.type }, Buffer.from(file.content, 'base64'));
        completion = result.jwt || completion;
      }
    } else {
      const body = new FormData();
      for (const hash of bucket) {
        const file = byHash.get(hash);
        body.append(hash, new File([file.content], hash, { type: file.type }));
      }
      const result = await providerRequest(fetchImpl, `/accounts/${accountId}/workers/assets/upload?base64=true`, { Authorization: `Bearer ${session.jwt}` }, body);
      completion = result.jwt || completion;
    }
  }
  if (!completion) fail();
  return { jwt: completion, config: assets.config };
}

/** Tests replace only the transport/auth boundary; the CLI fixes both to the maintained provider route. */
export async function uploadCredentialArtifact({ artifactPath, artifactSha256, operationId, config, accountId, worker, values, wrangler = NATIVE_WRANGLER, runner = createProcessRunner(), fetchImpl = fetch }) {
  let versionRequest = 'not-attempted';
  try {
    if (!/^[A-Za-z0-9_-]+$/u.test(accountId) || !/^[A-Za-z0-9_-]+$/u.test(worker) || !/^[A-Za-z0-9_-]+$/u.test(operationId)) fail();
    const artifact = await readCredentialArtifact({ artifactPath, artifactSha256 });
    if (artifact.worker !== worker || artifact.accountId !== accountId) fail();
    if (artifact.retainedInputs && RETAINED_INPUT_NAMES.some(name => Object.hasOwn(values, name))) fail();
    const env = { ...nativeProcessEnvironment(process.env, {}), CLOUDFLARE_ACCOUNT_ID: accountId, WRANGLER_WRITE_LOGS: 'false', WRANGLER_SEND_METRICS: 'false' };
    const sourceTarget = { runner, wrangler, config, env, accountId, worker, configHash: artifact.configHash, databaseId: artifact.retainedInputs?.databaseId };
    let sourceDeployment;
    if (artifact.retainedInputs) {
      if (sha256(await readFile(config)) !== artifact.configHash) fail();
      sourceDeployment = await assertRetainedSourceCurrent(sourceTarget, artifact.retainedInputs);
    }
    const headers = await authentication({ config, env, runner, wrangler });
    const assets = await uploadAssets({ artifact, accountId, worker, headers, fetchImpl });
    const bindings = [...artifact.metadata.bindings.filter(binding => !Object.hasOwn(values, binding.name)), ...Object.entries(values).map(([name, text]) => ({ name, type: 'secret_text', text }))];
    if (new Set(bindings.map(binding => binding.name)).size !== bindings.length) fail();
    const metadata = { ...artifact.metadata, bindings, ...(assets ? { assets } : {}), annotations: { 'workers/tag': operationId, 'workers/message': `diffdevil artifact ${artifactSha256}` } };
    const body = new FormData();
    body.set('metadata', JSON.stringify(metadata));
    for (const file of artifact.modules) body.set(file.name, new File([Buffer.from(file.content, 'base64')], file.name, { type: file.type }));
    if (artifact.retainedInputs) {
      if (sha256(await readFile(config)) !== artifact.configHash) fail();
      // Asset staging can take time: check latest and deployment again at the actual version boundary.
      await assertRetainedSourceCurrent(sourceTarget, artifact.retainedInputs, sourceDeployment);
    }
    // Exactly one request. A lost acknowledgement is reconciled by the parent receipt, never retried here.
    versionRequest = 'attempted-unknown';
    const result = await providerRequest(fetchImpl, `/accounts/${accountId}/workers/scripts/${worker}/versions?bindings_inherit=strict`, headers, body);
    if (typeof result.id !== 'string' || !/^[A-Za-z0-9_-]+$/u.test(result.id)) fail();
    return { id: result.id, artifactSha256, operationId };
  } catch {
    throw Object.assign(new Error('Artifact upload did not complete; reconcile the existing receipt.'), { versionRequest });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const value = name => args[args.indexOf(name) + 1];
  let ranUpload = false;
  try {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    const values = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    ranUpload = true;
    const result = await uploadCredentialArtifact({ artifactPath: value('--artifact-file'), artifactSha256: value('--artifact-sha256'), operationId: value('--operation-id'), config: value('--config'), worker: value('--name'), accountId: process.env.CLOUDFLARE_ACCOUNT_ID, wrangler: value('--native-wrangler'), values });
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    // No raw credential, artifact contents, token, response body or exception crosses this boundary.
    process.stdout.write(`${JSON.stringify({ artifactSha256: value('--artifact-sha256'), operationId: value('--operation-id'), versionRequest: error.versionRequest ?? (ranUpload ? 'attempted-unknown' : 'not-attempted') })}\n`);
    process.stderr.write('Artifact upload has an incomplete result; reconcile the existing receipt.\n');
    process.exitCode = 2;
  }
}
