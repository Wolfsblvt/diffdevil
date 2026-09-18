// SPDX-License-Identifier: AGPL-3.0-only

import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { validateGitHubAppPrivateKey } from './crypto.mjs';

const APP_NAME = 'diffdevil';
const DEFAULT_WORKER = 'diffdevil-github-app';
const GITHUB_REGISTRATION_URL = 'https://github.com/settings/apps/new';
const PLACEHOLDER_DATABASE_ID = '00000000-0000-0000-0000-000000000000';

function fail(message, code = 'E_OPERATOR_INPUT', receipt) {
  throw Object.assign(new Error(message), { code, receipt });
}

function requireValue(value, name) {
  if (typeof value !== 'string' || value.length === 0) fail(`${name} is required.`);
  return value;
}

export function validateAppId(appId) {
  const value = requireValue(String(appId), 'GitHub App ID');
  if (!/^\d+$/u.test(value)) fail('GitHub App ID must be numeric.');
  return value;
}

export function validateWebhookSecret(secret) {
  const value = requireValue(secret, 'Webhook secret');
  if (/\r|\n/u.test(value)) fail('Webhook secret must be a single line.');
  return value;
}

export function registrationInputs({ webhookUrl, visibility = 'private' }) {
  const parsed = new URL(requireValue(webhookUrl, 'Webhook URL'));
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.hash) fail('Webhook URL must be an HTTPS URL without credentials or a fragment.');
  if (visibility !== 'private' && visibility !== 'public') fail('Visibility must be private or public.');
  const registration = new URL(GITHUB_REGISTRATION_URL);
  registration.searchParams.set('name', APP_NAME);
  registration.searchParams.set('description', 'Composable diff analysis and policy for GitHub pull requests.');
  registration.searchParams.set('url', 'https://github.com/Wolfsblvt/diffdevil');
  registration.searchParams.set('public', String(visibility === 'public'));
  registration.searchParams.set('webhook_active', 'true');
  registration.searchParams.set('webhook_url', parsed.toString());
  registration.searchParams.set('contents', 'read');
  registration.searchParams.set('pull_requests', 'write');
  registration.searchParams.set('checks', 'write');
  registration.searchParams.append('events[]', 'pull_request');
  registration.searchParams.append('events[]', 'check_run');
  return { appName: APP_NAME, visibility, webhookUrl: parsed.toString(), permissions: { contents: 'read', pullRequests: 'write', checks: 'write' }, events: ['pull_request', 'check_run'], providerDefaultEvents: ['installation', 'installation_repositories'], registrationUrl: registration.toString() };
}

export function buildWranglerCommand(command, args, { worker, config }) {
  return [command, ...args, '--name', worker, '--config', config];
}

export function createProcessRunner({ executable = process.execPath } = {}) {
  return async ({ args, input, env }) => {
    const child = spawn(executable, args, { env, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    const stdout = [], stderr = [];
    child.stdout.on('data', chunk => stdout.push(chunk));
    child.stderr.on('data', chunk => stderr.push(chunk));
    child.stdin.end(input);
    const [code] = await once(child, 'close');
    return { code, stdout: Buffer.concat(stdout).toString('utf8'), stderr: Buffer.concat(stderr).toString('utf8') };
  };
}

function parseJson(stdout, operation) {
  try { return JSON.parse(stdout); } catch { fail(`${operation} returned unreadable JSON.`, 'E_OPERATOR_TARGET'); }
}

function accountMatches(result, accountId) {
  return Array.isArray(result?.accounts) && result.accounts.some(account => account?.id === accountId);
}

function versionEntries(result) {
  const entries = Array.isArray(result) ? result : result?.versions;
  if (!Array.isArray(entries)) fail('Wrangler version readback has an unknown shape.', 'E_OPERATOR_VERSION_READBACK');
  const versions = entries.map(entry => ({ id: entry?.id ?? entry?.version_id })).filter(entry => typeof entry.id === 'string');
  if (versions.length !== entries.length) fail('Wrangler version readback omitted a version identity.', 'E_OPERATOR_VERSION_READBACK');
  return versions;
}

function deploymentSnapshot(result) {
  const deployments = Array.isArray(result) ? result : result?.deployments;
  if (!Array.isArray(deployments) || deployments.length === 0) fail('Wrangler could not read back a deployment for the requested Worker.', 'E_OPERATOR_TARGET');
  return JSON.stringify(result);
}

async function qualificationConfig(config) {
  const source = await readFile(requireValue(config, 'Qualification configuration path'), 'utf8');
  if (source.includes(PLACEHOLDER_DATABASE_ID)) fail("Refusing the checked-in placeholder Wrangler configuration; provide Katja's derived qualification config.", 'E_OPERATOR_CONFIG');
  return config;
}

function environment(accountId) {
  return { ...process.env, CLOUDFLARE_ACCOUNT_ID: accountId, WRANGLER_SEND_METRICS: 'false' };
}

async function readVersions({ runner, wrangler, worker, config, env }) {
  const result = await runner({ args: buildWranglerCommand(wrangler, ['versions', 'list', '--json'], { worker, config }), input: '', env });
  if (result.code !== 0) return { state: 'unknown' };
  try { return { state: 'read-back', versions: versionEntries(parseJson(result.stdout, 'Wrangler version readback')) }; } catch { return { state: 'unknown' }; }
}

async function readDeployment({ runner, wrangler, worker, config, env }) {
  const result = await runner({ args: buildWranglerCommand(wrangler, ['deployments', 'list', '--json'], { worker, config }), input: '', env });
  if (result.code !== 0) return { state: 'unknown' };
  try { return { state: 'read-back', snapshot: deploymentSnapshot(parseJson(result.stdout, 'Wrangler deployment readback')) }; } catch { return { state: 'unknown' }; }
}

async function requireTarget({ runner, wrangler, worker, config, accountId }) {
  const env = environment(accountId);
  const account = await runner({ args: [wrangler, 'whoami', '--account', accountId, '--json'], input: '', env });
  if (account.code !== 0 || !accountMatches(parseJson(account.stdout, 'Wrangler account readback'), accountId)) fail('Wrangler could not read back the requested Cloudflare account.', 'E_OPERATOR_TARGET');
  const deployment = await readDeployment({ runner, wrangler, worker, config, env });
  if (deployment.state !== 'read-back') fail('Wrangler could not read back the requested Worker deployment.', 'E_OPERATOR_TARGET');
  const versions = await readVersions({ runner, wrangler, worker, config, env });
  if (versions.state !== 'read-back') fail('Wrangler could not read back the requested Worker versions.', 'E_OPERATOR_TARGET');
  return { accountId, worker, config, env, deployment, versions };
}

function initialReceipt(target) {
  return { state: 'unknown', accountId: target.accountId, worker: target.worker, command: 'not-attempted', version: { state: 'unknown' }, deployment: { state: 'unknown' }, carrier: { state: 'not-attempted' } };
}

function newVersion(before, after) {
  if (before.state !== 'read-back' || after.state !== 'read-back') return { state: 'unknown' };
  const beforeIds = new Set(before.versions.map(version => version.id));
  const created = after.versions.filter(version => !beforeIds.has(version.id));
  if (created.length === 0) return { state: 'absent' };
  if (created.length !== 1) return { state: 'unknown' };
  return { state: 'observed', id: created[0].id };
}

async function readCreatedVersion({ runner, wrangler, target, version }) {
  if (version.state !== 'observed') return version;
  const result = await runner({ args: buildWranglerCommand(wrangler, ['versions', 'view', version.id, '--json'], target), input: '', env: target.env });
  if (result.code !== 0) return { state: 'unknown', id: version.id };
  try {
    const viewed = parseJson(result.stdout, 'Wrangler created-version readback');
    const viewedId = viewed?.id ?? viewed?.version_id ?? viewed?.version?.id;
    return viewedId === version.id ? { state: 'read-back', id: version.id } : { state: 'unknown', id: version.id };
  } catch {
    return { state: 'unknown', id: version.id };
  }
}

export async function readHiddenTerminalSecret({ input = process.stdin, output = process.stdout } = {}) {
  if (!input.isTTY || !output.isTTY || typeof input.setRawMode !== 'function') fail('Interactive secret entry requires a TTY; use --webhook-secret-stdin only with redirected stdin.', 'E_OPERATOR_TTY');
  output.write('Webhook secret: ');
  input.setRawMode(true);
  input.resume();
  return new Promise((resolveSecret, rejectSecret) => {
    let value = '';
    const finish = error => {
      input.off('data', onData);
      input.setRawMode(false);
      input.pause();
      output.write('\n');
      if (error) rejectSecret(error); else resolveSecret(value);
    };
    const onData = chunk => {
      for (const character of chunk.toString('utf8')) {
        if (character === '\u0003') return finish(Object.assign(new Error('Secret entry cancelled.'), { code: 'E_OPERATOR_CANCELLED' }));
        if (character === '\r' || character === '\n') return finish();
        if (character === '\u0008' || character === '\u007f') value = value.slice(0, -1); else value += character;
      }
    };
    input.on('data', onData);
  });
}

async function readRedirectedSecret() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8').replace(/\r?\n$/u, '');
}

function reconcileState(result) {
  if (result.command === 'accepted' && result.version.state === 'read-back' && result.deployment.state === 'unchanged' && result.carrier.state === 'removed') return 'version-created';
  if (result.command === 'failed' && result.version.state === 'absent' && result.deployment.state === 'unchanged' && result.carrier.state === 'removed') return 'not-created';
  if (result.deployment.state === 'changed' || result.version.state === 'read-back') return 'partial';
  return 'unknown';
}

/** Creates one un-deployed Worker version containing all three runtime inputs. */
export async function installCredentials({ appId, privateKeyPath, readWebhookSecret, accountId, worker = DEFAULT_WORKER, config, wrangler = 'node_modules/wrangler/bin/wrangler.js', runner = createProcessRunner() }) {
  const validatedAppId = validateAppId(appId);
  const selectedConfig = await qualificationConfig(config);
  const privateKey = await readFile(requireValue(privateKeyPath, 'Private key path'), 'utf8');
  validateGitHubAppPrivateKey(privateKey);
  const target = await requireTarget({ runner, wrangler: requireValue(wrangler, 'Wrangler path'), worker: requireValue(worker, 'Worker name'), config: selectedConfig, accountId: requireValue(accountId, 'Cloudflare account ID') });
  const webhookSecret = validateWebhookSecret(await readWebhookSecret());
  const values = { GITHUB_APP_ID: validatedAppId, GITHUB_WEBHOOK_SECRET: webhookSecret, GITHUB_APP_PRIVATE_KEY: privateKey };
  const report = initialReceipt(target);
  let directory;
  let operationFailed = false;
  try {
    directory = await mkdtemp(join(tmpdir(), 'diffdevil-app-version-secrets-'));
    const carrier = join(directory, 'secrets.json');
    await writeFile(carrier, JSON.stringify(values), { encoding: 'utf8', mode: 0o600 });
    const write = await runner({ args: buildWranglerCommand(wrangler, ['versions', 'secret', 'bulk', carrier, '--message', 'Prepare GitHub App credentials without deployment'], target), input: '', env: target.env });
    report.command = write.code === 0 ? 'accepted' : 'failed';
    const afterVersions = await readVersions({ runner, wrangler, ...target });
    report.version = await readCreatedVersion({ runner, wrangler, target, version: newVersion(target.versions, afterVersions) });
    const afterDeployment = await readDeployment({ runner, wrangler, ...target });
    report.deployment = afterDeployment.state !== 'read-back' ? { state: 'unknown' } : { state: afterDeployment.snapshot === target.deployment.snapshot ? 'unchanged' : 'changed' };
  } catch {
    operationFailed = true;
  } finally {
    if (directory) {
      try { await rm(directory, { recursive: true, force: true }); report.carrier = { state: 'removed' }; } catch { report.carrier = { state: 'cleanup-unknown' }; }
    }
  }
  report.state = reconcileState(report);
  if (operationFailed || report.state !== 'version-created') fail('Credential version was not established with a complete safe readback.', 'E_OPERATOR_VERSION', report);
  return report;
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = {};
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token.startsWith('--')) fail(`Unexpected argument: ${token}`);
    const name = token.slice(2);
    if (name === 'fake' || name === 'webhook-secret-stdin') options[name] = true;
    else {
      const value = rest[++index];
      if (value === undefined || value.startsWith('--')) fail(`Missing value for --${name}.`);
      options[name] = value;
    }
  }
  return { command, options };
}

function createFakeRunner() {
  let versionCreated = false;
  return async ({ args }) => {
    if (args.includes('whoami')) return { code: 0, stdout: JSON.stringify({ accounts: [{ id: 'fixture-account' }] }), stderr: '' };
    if (args.includes('deployments')) return { code: 0, stdout: JSON.stringify([{ id: 'fixture-deployment' }]), stderr: '' };
    if (args.includes('versions') && args.includes('list')) return { code: 0, stdout: JSON.stringify(versionCreated ? [{ id: 'fixture-before' }, { id: 'fixture-created' }] : [{ id: 'fixture-before' }]), stderr: '' };
    if (args.includes('versions') && args.includes('view')) return { code: 0, stdout: JSON.stringify({ id: 'fixture-created' }), stderr: '' };
    if (args.includes('bulk')) { versionCreated = true; return { code: 0, stdout: '', stderr: '' }; }
    return { code: 2, stdout: '', stderr: '' };
  };
}

function help() {
  return `Usage:\n  node apps/github-app/operator-helper.mjs registration --webhook-url <https-url> [--visibility private|public]\n  node apps/github-app/operator-helper.mjs install --app-id <numeric-id> --private-key-file <downloaded-pem> --account-id <account-id> --config <derived-config> [--worker <name>] [--webhook-secret-stdin] [--fake]\n\nInteractive use asks for the webhook secret through a hidden TTY prompt. --webhook-secret-stdin is only for an already-safe redirected automation channel.`;
}

export async function main(argv = process.argv.slice(2)) {
  const { command, options } = parseArgs(argv);
  if (command === 'registration') {
    process.stdout.write(`${JSON.stringify(registrationInputs({ webhookUrl: options['webhook-url'], visibility: options.visibility }), null, 2)}\n`);
    return;
  }
  if (command === 'install') {
    if (options['webhook-secret-stdin'] && process.stdin.isTTY) fail('Refusing TTY stdin for --webhook-secret-stdin; omit the flag for the hidden interactive checkpoint.', 'E_OPERATOR_TTY');
    const readWebhookSecret = options['webhook-secret-stdin'] ? readRedirectedSecret : readHiddenTerminalSecret;
    const result = await installCredentials({ appId: options['app-id'], privateKeyPath: options['private-key-file'], accountId: options['account-id'], config: options.config, worker: options.worker, readWebhookSecret, runner: options.fake ? createFakeRunner() : undefined });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  process.stderr.write(`${help()}\n`);
  process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => {
    if (error.receipt) process.stdout.write(`${JSON.stringify(error.receipt, null, 2)}\n`);
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 2;
  });
}
