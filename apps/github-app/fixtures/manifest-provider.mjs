// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/** Synthetic GitHub server and process harness. No real accounts, credentials, or provider writes. */
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { generateKeyPairSync, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const pem = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({ type: 'pkcs1', format: 'pem' });
export async function manifestFixture({ ownerType = 'personal', visibility = 'public', joined = true, wirt = false } = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'diffdevil-manifest-'));
  const seal = randomUUID();
  const body = { id: 123, name: 'diffdevil-synthetic', slug: 'diffdevil-synthetic', owner: { login: 'fixture-owner', type: ownerType === 'personal' ? 'User' : 'Organization' }, client_id: 'Iv1.fixture-client', client_secret: randomUUID(), webhook_secret: randomUUID(), pem, permissions: { contents: 'read', pull_requests: 'write', checks: 'write', metadata: 'read' }, events: ['pull_request', 'check_run', 'push'] };
  const config = join(directory, 'config.json');
  const wirtSigningKeyPath = wirt ? join(directory, 'wirt.txt') : undefined;
  const wirtKey = wirt ? randomUUID() : undefined;
  if (wirt) await writeFile(wirtSigningKeyPath, wirtKey);
  const values = { GITHUB_APP_ID: '123', GITHUB_WEBHOOK_SECRET: body.webhook_secret, GITHUB_APP_PRIVATE_KEY: pem.replace(/\r?\n$/u, ''), ...(joined ? { GITHUB_OAUTH_CLIENT_ID: body.client_id, GITHUB_OAUTH_CLIENT_SECRET: body.client_secret, APP_SEAL_KEY: seal } : {}), ...(wirt ? { WIRT_SIGNING_KEY_CURRENT: wirtKey } : {}) };
  await writeFile(config, JSON.stringify({ name: joined ? 'diffdevil-app-staging' : 'diffdevil-github-app', account_id: 'account-1', ...(joined ? { vars: { APP_ORIGIN: 'https://staging.example', GITHUB_APP_BOT_LOGIN: 'diffdevil-synthetic[bot]', ...(wirt ? { WIRT_ORIGIN: 'https://wirt.example' } : {}) } } : {}), d1_databases: [{ binding: 'APP_DB', database_id: '12345678-1234-1234-1234-123456789abc' }] }));
  const sealKeyPath = join(directory, 'seal.txt');
  await writeFile(sealKeyPath, seal);
  await writeFile(join(directory, 'fixture-options.json'), '{}');
  const state = { conversions: 0, posts: [], failConversion: false, beforeResponse: undefined };
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://127.0.0.1');
      if (request.method === 'POST' && url.pathname.endsWith('/settings/apps/new')) {
        const chunks = []; for await (const chunk of request) chunks.push(chunk);
        const form = new URLSearchParams(Buffer.concat(chunks).toString('utf8'));
        const manifest = JSON.parse(form.get('manifest'));
        state.posts.push({ path: url.pathname, manifest });
        const callback = new URL(manifest.redirect_url);
        callback.searchParams.set('code', 'synthetic-one-use-code');
        callback.searchParams.set('state', url.searchParams.get('state'));
        response.writeHead(303, { Location: callback.toString() }); response.end();
      } else if (request.method === 'POST' && url.pathname === '/app-manifests/synthetic-one-use-code/conversions') {
        state.conversions++;
        await state.beforeResponse?.();
        if (state.failConversion) { request.socket.destroy(); return; }
        response.writeHead(201, { 'Content-Type': 'application/json' }); response.end(JSON.stringify(body));
      } else { response.writeHead(404); response.end(); }
    } catch { response.writeHead(500); response.end('synthetic refusal'); }
  });
  await new Promise(resolveListen => server.listen(0, '127.0.0.1', resolveListen));
  const portProbe = createServer();
  await new Promise(resolveListen => portProbe.listen(0, '127.0.0.1', resolveListen));
  const port = portProbe.address().port;
  await new Promise(resolveClose => portProbe.close(resolveClose));
  const options = { capturePath: join(directory, 'capture.enc'), receiptPath: join(directory, 'capture-receipt.json'), sealKeyPath, sealKeyRecoveryRef: 'fixture-retained-custody', owner: 'fixture-owner', ownerType, visibility, appName: body.name, webhookUrl: 'https://staging.example/webhooks/github', ...(joined ? { oauthCallbackUrl: 'https://staging.example/auth/callback' } : {}), policyRefresh: true, port, fixtureOrigin: `http://127.0.0.1:${server.address().port}` };
  return { directory, seal, body, values, config, options, state, wirtSigningKeyPath, close: () => new Promise(resolveClose => { server.close(resolveClose); server.closeAllConnections(); }) };
}
const flags = { capturePath: 'capture-file', receiptPath: 'receipt-file', sealKeyPath: 'seal-key-file', sealKeyRecoveryRef: 'seal-key-recovery-ref', owner: 'owner', ownerType: 'owner-type', visibility: 'visibility', appName: 'app-name', webhookUrl: 'webhook-url', oauthCallbackUrl: 'oauth-callback-url', port: 'port', fixtureOrigin: 'fixture-provider', config: 'config', accountId: 'account-id', installReceiptPath: 'install-receipt-file', fixtureWrangler: 'fixture-wrangler', wirtSigningKeyPath: 'wirt-signing-key-file' };
export function manifestCli(command, options) {
  const args = ['apps/github-app/manifest-helper.mjs', command];
  for (const [key, value] of Object.entries(options)) {
    if (key === 'policyRefresh' && value) args.push('--policy-refresh');
    else if (flags[key] && value !== undefined) args.push(`--${flags[key]}`, String(value));
  }
  const child = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  let output = '', errors = '', resolveListening;
  const listening = new Promise(resolveUrl => { resolveListening = resolveUrl; });
  child.stdout.on('data', chunk => {
    output += chunk.toString();
    const first = output.split('\n')[0];
    try { const record = JSON.parse(first); if (record.state === 'listening') resolveListening(record.localUrl); } catch { /* A chunk can end mid-record. */ }
  });
  child.stderr.on('data', chunk => { errors += chunk.toString(); });
  const completed = once(child, 'close').then(([code]) => ({ code, output, errors }));
  return { child, listening, completed };
}
export function includesSecrets(text, setup) { return [setup.seal, setup.body.client_secret, setup.body.webhook_secret, ...Object.values(setup.values).filter(value => value.length > 20), 'BEGIN RSA PRIVATE KEY', 'synthetic-one-use-code'].some(value => text.includes(value)); }
export async function nativeState(setup) { return JSON.parse(await readFile(join(setup.directory, 'fixture-state.json'), 'utf8')); }
