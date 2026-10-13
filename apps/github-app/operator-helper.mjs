// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0

import { spawn } from 'node:child_process';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { open, readFile, rename, rm, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parse } from 'jsonc-parser';
import { createAppJwt, validateGitHubAppPrivateKey } from './crypto.mjs';
import { readSigningKeys } from './commercial-wirt.mjs';

const GITHUB_REGISTRATION_URL = 'https://github.com/settings/apps/new';
const DEFAULT_WRANGLER = fileURLToPath(new URL('../../node_modules/wrangler/bin/wrangler.js', import.meta.url));
const INERT_DATABASE_IDS = new Set(['00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001']);
const BACKEND_INPUTS = ['GITHUB_APP_ID', 'GITHUB_WEBHOOK_SECRET', 'GITHUB_APP_PRIVATE_KEY'];
const APP_INPUTS = [...BACKEND_INPUTS, 'GITHUB_OAUTH_CLIENT_ID', 'GITHUB_OAUTH_CLIENT_SECRET', 'APP_SEAL_KEY'];

function inputNames(target, options) {
  return target.joinedApp ? [...APP_INPUTS, ...(target.wirtConfigured || options.wirtSigningKeyPath || options.wirtSigningKeyEnv ? ['WIRT_SIGNING_KEY_CURRENT'] : [])] : BACKEND_INPUTS;
}

function fail(message, code = 'E_OPERATOR_INPUT', receipt) {
  throw Object.assign(new Error(message), { code, receipt });
}

function requireValue(value, name) {
  if (typeof value !== 'string' || value.trim().length === 0) fail(`${name} is required.`);
  return value;
}

function identifier(value, name) {
  const text = requireValue(value, name);
  if (!/^[A-Za-z0-9_-]+$/u.test(text)) fail(`${name} has an invalid format.`);
  return text;
}

export function validateAppId(appId) {
  const value = requireValue(appId, 'GitHub App ID');
  if (!/^[1-9]\d*$/u.test(value)) fail('GitHub App ID must be a positive numeric ID.');
  return value;
}

export function validateOAuthClientId(clientId) {
  const value = requireValue(clientId, 'GitHub OAuth client ID');
  if (!/^[A-Za-z0-9_.-]+$/u.test(value)) fail('GitHub OAuth client ID has an invalid format.');
  return value;
}

export function validateWebhookSecret(secret) {
  const value = requireValue(secret, 'Webhook secret');
  if (/\r|\n/u.test(value)) fail('Webhook secret must be a single line.');
  return value;
}

function httpsUrl(value, name) {
  let parsed;
  try { parsed = new URL(requireValue(value, name)); } catch { fail(`${name} must be an HTTPS URL.`); }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.hash || parsed.search) fail(`${name} must be an HTTPS URL without credentials, query or fragment.`);
  return parsed;
}

/** Non-secret registration preparation; push is selected explicitly for trusted policy refresh. */
export function registrationInputs({ webhookUrl, visibility = 'private', appName = 'diffdevil', oauthCallbackUrl, policyRefresh = false }) {
  const parsed = httpsUrl(webhookUrl, 'Webhook URL');
  if (visibility !== 'private' && visibility !== 'public') fail('Visibility must be private or public.');
  requireValue(appName, 'App name');
  const callback = oauthCallbackUrl ? httpsUrl(oauthCallbackUrl, 'OAuth callback URL') : undefined;
  if (callback && callback.origin !== parsed.origin) fail('OAuth callback and webhook must belong to the same App origin.');
  const registration = new URL(GITHUB_REGISTRATION_URL);
  const fields = { name: appName, description: 'Composable diff analysis and policy for GitHub pull requests.', url: 'https://github.com/Wolfsblvt/diffdevil', public: String(visibility === 'public'), webhook_active: 'true', webhook_url: parsed.toString(), contents: 'read', pull_requests: 'write', checks: 'write' };
  if (callback) fields['callback_urls[]'] = callback.toString();
  for (const [key, value] of Object.entries(fields)) registration.searchParams.set(key, value);
  const events = ['pull_request', 'check_run', ...(policyRefresh ? ['push'] : [])];
  for (const event of events) registration.searchParams.append('events[]', event);
  return { appName, visibility, webhookUrl: parsed.toString(), ...(callback ? { oauthCallbackUrl: callback.toString() } : {}), permissions: { contents: 'read', pullRequests: 'write', checks: 'write' }, events, providerDefaultEvents: ['installation', 'installation_repositories'], registrationUrl: registration.toString() };
}

export function buildWranglerCommand(command, args, { worker, config }) {
  return [command, ...args, '--name', worker, '--config', config];
}

/** Drain native output privately. Neither stderr nor a raw native exception reaches the caller. */
export function createProcessRunner({ executable = process.execPath } = {}) {
  return async ({ args, input, env, signal }) => {
    const child = spawn(executable, args, { env, signal, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    const stdout = [];
    child.stdout.on('data', chunk => stdout.push(chunk));
    child.stderr.resume();
    child.stdin.on('error', () => {}); // A refused command can close stdin before consuming it.
    let failed = false;
    const completion = new Promise(resolveExit => {
      child.once('error', () => { failed = true; });
      child.once('close', resolveExit);
    });
    child.stdin.end(input);
    try {
      const code = await completion; // Cancellation/error alone is not evidence the native child stopped.
      if (failed) fail('The native provider process could not complete.', 'E_OPERATOR_PROCESS');
      return { code, stdout: Buffer.concat(stdout).toString('utf8') };
    } catch { fail('The native provider process could not complete.', 'E_OPERATOR_PROCESS'); }
  };
}

function environment(accountId, options) {
  const env = withoutProtectedInputs(process.env, options);
  const controls = { CLOUDFLARE_ACCOUNT_ID: accountId, WRANGLER_SEND_METRICS: 'false', WRANGLER_WRITE_LOGS: 'false', WRANGLER_LOG: 'error' };
  const withheld = new Set([...Object.keys(controls), 'CLOUDFLARE_ENV'].map(environmentName));
  // Match only selected names. Windows process.env is case-insensitive; this copied object is not.
  for (const key of Object.keys(env)) if (withheld.has(environmentName(key))) delete env[key];
  return { ...env, ...controls };
}

function environmentName(name) {
  return process.platform === 'win32' ? name.toUpperCase() : name;
}

/** Validate the explicitly selected file/environment sources for capture and installation. */
export function selectedEnvironmentInputs(options) {
  const selected = new Set();
  for (const [path, name, label] of [
    [options.sealKeyPath, options.sealKeyEnv, 'Seal key'],
    [options.wirtSigningKeyPath, options.wirtSigningKeyEnv, 'Wirt signing key']
  ]) {
    if (path && name) fail(`Choose either a ${label} file or named environment input.`);
    if (!name) continue;
    const variable = requireValue(name, `${label} environment variable name`);
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(variable)) fail(`${label} environment variable name has an invalid format.`);
    const normalized = environmentName(variable);
    if (['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_ENV', 'WRANGLER_SEND_METRICS', 'WRANGLER_WRITE_LOGS', 'WRANGLER_LOG'].includes(normalized)) fail('A protected input name must not replace the helper\'s provider controls.');
    if (selected.has(normalized)) fail('Each protected input must use a distinct named environment variable.');
    selected.add(normalized);
  }
}

/** Withhold only the selected seal/Wirt names from a contained child's environment. */
export function withoutProtectedInputs(source, options) {
  const env = { ...source };
  const names = new Set([options.sealKeyEnv, options.wirtSigningKeyEnv].filter(Boolean).map(environmentName));
  for (const name of Object.keys(env)) if (names.has(environmentName(name))) delete env[name];
  return env;
}

async function qualificationConfig({ config, worker, accountId }) {
  let source, data;
  try {
    source = await readFile(requireValue(config, 'Configuration path'), 'utf8');
    const errors = [];
    data = parse(source, errors, { allowTrailingComma: true });
    if (errors.length || !data || typeof data !== 'object' || Array.isArray(data)) throw new Error();
  } catch { fail('Provide a readable, valid JSON/JSONC target configuration.', 'E_OPERATOR_CONFIG'); }
  const selectedWorker = identifier(data.name, 'Configuration Worker name');
  if (worker !== undefined && worker !== selectedWorker) fail('Requested Worker differs from the configuration name.', 'E_OPERATOR_TARGET');
  const selectedAccount = identifier(accountId, 'Cloudflare account ID');
  if (data.account_id !== undefined && data.account_id !== selectedAccount) fail('Requested account differs from the configuration account.', 'E_OPERATOR_TARGET');
  const databases = data.d1_databases;
  if (!Array.isArray(databases) || databases.length !== 1 || databases[0]?.binding !== 'APP_DB') fail('The target must select exactly one APP_DB database.', 'E_OPERATOR_CONFIG');
  const databaseId = databases[0].database_id;
  if (typeof databaseId !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/iu.test(databaseId) || INERT_DATABASE_IDS.has(databaseId.toLowerCase())) fail('Replace the inert APP_DB database coordinate before protected input.', 'E_OPERATOR_CONFIG');
  const botLogin = data.vars?.GITHUB_APP_BOT_LOGIN ?? 'diffdevil[bot]';
  if (typeof botLogin !== 'string' || !/^[A-Za-z0-9_-]+\[bot\]$/u.test(botLogin) || botLogin === 'staging-bot-login-required[bot]') fail('Configure the selected GitHub App bot login before protected input.', 'E_OPERATOR_CONFIG');
  return { worker: selectedWorker, accountId: selectedAccount, databaseId, botLogin, configuredAppId: data.vars?.GITHUB_APP_ID, configuredClientId: data.vars?.GITHUB_OAUTH_CLIENT_ID, config: resolve(config), configHash: createHash('sha256').update(source).digest('hex'), joinedApp: typeof data.vars?.APP_ORIGIN === 'string', wirtConfigured: typeof data.vars?.WIRT_ORIGIN === 'string' };
}

async function nativeJson({ runner, args, env }) {
  try {
    const result = await runner({ args, input: '', env });
    if (result.code !== 0) return undefined;
    return JSON.parse(result.stdout);
  } catch { return undefined; }
}

async function readVersions({ runner, wrangler, ...target }) {
  const result = await nativeJson({ runner, args: buildWranglerCommand(wrangler, ['versions', 'list', '--json'], target), env: target.env });
  const entries = Array.isArray(result) ? result : result?.versions;
  if (!Array.isArray(entries) || entries.some(entry => typeof entry?.id !== 'string' || !/^[A-Za-z0-9_-]+$/u.test(entry.id))) return { state: 'unknown' };
  return { state: 'read-back', versions: entries.map(entry => ({ id: entry.id })) };
}

async function readDeployment({ runner, wrangler, ...target }) {
  const result = await nativeJson({ runner, args: buildWranglerCommand(wrangler, ['deployments', 'list', '--json'], target), env: target.env });
  const entries = Array.isArray(result) ? result : result?.deployments;
  if (!Array.isArray(entries) || entries.length === 0 || entries.some(entry => typeof entry?.id !== 'string')) return { state: 'unknown' };
  // Do not persist arbitrary provider fields. Order, version identities and traffic are the active deployment facts.
  // Wrangler 4.135 sorts deployments list --json by created_on ascending.
  const deployment = entries.at(-1);
  if (!/^[A-Za-z0-9_-]+$/u.test(deployment.id) || !Array.isArray(deployment.versions) || deployment.versions.some(version => typeof version?.version_id !== 'string' || !/^[A-Za-z0-9_-]+$/u.test(version.version_id) || typeof version.percentage !== 'number' || !Number.isFinite(version.percentage))) return { state: 'unknown' };
  return { state: 'read-back', snapshot: JSON.stringify({ id: deployment.id, versions: deployment.versions.map(version => ({ version_id: version.version_id, percentage: version.percentage })) }) };
}

async function requireTarget(options) {
  selectedEnvironmentInputs(options);
  const target = await qualificationConfig(options);
  target.fixture = options.fixture === true;
  target.env = environment(target.accountId, options);
  const account = await nativeJson({ runner: options.runner, args: [options.wrangler, 'whoami', '--account', target.accountId, '--json', '--config', target.config], env: target.env });
  if (!Array.isArray(account?.accounts) || !account.accounts.some(entry => entry?.id === target.accountId)) fail('Wrangler could not read back the requested Cloudflare account.', 'E_OPERATOR_TARGET');
  target.deployment = await readDeployment({ ...options, ...target });
  if (target.deployment.state !== 'read-back') fail('Wrangler could not read back the requested Worker deployment.', 'E_OPERATOR_TARGET');
  target.versions = await readVersions({ ...options, ...target });
  if (target.versions.state !== 'read-back') fail('Wrangler could not read back the requested Worker versions.', 'E_OPERATOR_TARGET');
  return target;
}

function hasVersionTarget(bindings, target) {
  const database = Array.isArray(bindings) ? bindings.filter(binding => binding?.name === 'APP_DB') : [];
  const bots = Array.isArray(bindings) ? bindings.filter(binding => binding?.name === 'GITHUB_APP_BOT_LOGIN') : [];
  const botMatches = bots.length === 0 ? target.botLogin === 'diffdevil[bot]' : bots.length === 1 && bots[0].type === 'plain_text' && typeof bots[0].text === 'string' && bots[0].text.toLowerCase() === target.botLogin.toLowerCase();
  return database.length === 1 && database[0].type === 'd1' && database[0].id === target.databaseId && botMatches;
}

async function requireVersionTarget(options, target) {
  // Secret bulk patches the latest uploaded version, which need not be the active deployment.
  // The pinned Wrangler versions list is ordered by created_on ascending.
  const latest = target.versions.versions.at(-1);
  if (!latest) fail('The selected Worker has no uploaded version to receive credentials.', 'E_OPERATOR_TARGET');
  if (target.joinedApp || options.baseVersionId !== undefined) {
    if (latest.id !== identifier(options.baseVersionId, 'Qualified base version ID')) fail('The latest Worker version differs from the qualified bootstrap/base; no provider write was attempted.', 'E_OPERATOR_TARGET');
  }
  const viewed = await nativeJson({ runner: options.runner, args: buildWranglerCommand(options.wrangler, ['versions', 'view', latest.id, '--json'], target), env: target.env });
  if (viewed?.id !== latest.id || !hasVersionTarget(viewed.resources?.bindings, target)) fail('The latest Worker version does not read back the configured APP_DB and bot identity.', 'E_OPERATOR_TARGET');
  if (target.joinedApp && options.sealKeyInitial && viewed.resources.bindings.some(binding => binding.type === 'secret_text' && binding.name === 'APP_SEAL_KEY')) {
    fail('The qualified version already has APP_SEAL_KEY. Use the established target’s retained seal and previous successful receipt; initial mode cannot replace it.', 'E_OPERATOR_TARGET');
  }
  target.baseVersionId = latest.id;
}

async function inputFiles(options, target) {
  const captured = typeof options.readGitHubInputs === 'function';
  const paths = captured ? [] : [requireValue(options.privateKeyPath, 'Private key path')];
  if (!captured && options.webhookSecretPath) paths.push(options.webhookSecretPath);
  if (!captured && !options.webhookSecretPath && typeof options.readWebhookSecret !== 'function') fail('Supply a webhook secret file or the hidden/redirected input route.');
  if (target.joinedApp) {
    validateOAuthClientId(options.oauthClientId);
    if (!captured) paths.push(requireValue(options.oauthClientSecretPath, 'OAuth client secret path'));
    const sealKey = protectedInputSource(options.sealKeyPath, options.sealKeyEnv, 'Retained seal key');
    if (sealKey.path) paths.push(sealKey.path);
    if (target.wirtConfigured || options.wirtSigningKeyPath || options.wirtSigningKeyEnv) {
      const wirtKey = protectedInputSource(options.wirtSigningKeyPath, options.wirtSigningKeyEnv, 'Wirt signing key');
      if (wirtKey.path) paths.push(wirtKey.path);
    }
    identifier(options.sealKeyRecoveryRef, 'Seal key recovery reference');
    if (Boolean(options.sealKeyInitial) === Boolean(options.sealKeyPreviousReceiptPath)) fail('Choose an initial seal for a new/empty target, or an established target\'s previous seal receipt.');
    if (options.sealKeyPreviousReceiptPath) paths.push(options.sealKeyPreviousReceiptPath);
  } else if (options.oauthClientId || options.oauthClientSecretPath || options.sealKeyPath || options.sealKeyEnv || options.wirtSigningKeyPath || options.wirtSigningKeyEnv || options.sealKeyRecoveryRef || options.sealKeyInitial || options.sealKeyPreviousReceiptPath) {
    fail('Joined-App inputs require a joined-App configuration.', 'E_OPERATOR_CONFIG');
  }
  for (const path of paths) {
    try { if (!(await stat(path)).isFile()) throw new Error(); } catch { fail('A required protected input file is unavailable.', 'E_OPERATOR_INPUT_FILE'); }
    if (resolve(path) === resolve(options.receiptPath)) fail('The receipt must not replace a protected input file.', 'E_OPERATOR_RECEIPT');
  }
}

function initialReceipt(target, options) {
  return { format: 'diffdevil-credential-version-v1', mode: target.fixture ? 'fixture' : 'provider', state: 'prepared', accountId: target.accountId, worker: target.worker, databaseId: target.databaseId, configHash: target.configHash, baseVersionId: target.baseVersionId, inputs: inputNames(target, options), identity: { state: 'unobserved' }, ...(target.joinedApp ? { sealKeyRecoveryRef: options.sealKeyRecoveryRef, sealKeyContinuity: { state: 'unobserved' } } : {}), command: 'not-attempted', version: { state: 'unknown' }, deployment: { state: 'unknown' }, carrier: { state: 'not-created' }, before: { deployment: target.deployment, versions: target.versions } };
}

async function unchangedConfiguration(target) {
  const current = await qualificationConfig(target);
  if (current.configHash !== target.configHash) fail('Target configuration changed during input; no provider write was attempted.', 'E_OPERATOR_TARGET');
}

async function writeReceipt(path, receipt, { exclusive = false } = {}) {
  const temporary = exclusive ? path : join(dirname(path), `.diffdevil-receipt-${randomUUID()}.tmp`);
  try {
    const file = await open(temporary, 'wx', 0o600);
    try { await file.writeFile(`${JSON.stringify(receipt, null, 2)}\n`, 'utf8'); await file.sync(); } finally { await file.close(); }
    if (!exclusive) await rename(temporary, path);
  } catch { fail('The non-secret receipt could not be committed; retain the last receipt and reconcile before retrying.', 'E_OPERATOR_RECEIPT', receipt); }
  finally { if (!exclusive) await rm(temporary, { force: true }).catch(() => {}); }
}

async function receiptDestination(path) {
  requireValue(path, 'Non-secret receipt path');
  try { await stat(path); fail('Receipt already exists; use resume rather than repeating installation.', 'E_OPERATOR_RECEIPT'); }
  catch (error) { if (error.code !== 'ENOENT') fail('Receipt already exists or is unusable; use resume for an existing receipt.', 'E_OPERATOR_RECEIPT'); }
  // Exercise replacement in this directory before input, without touching the requested checkpoint.
  const first = join(dirname(path), `.diffdevil-probe-${randomUUID()}.tmp`);
  const second = join(dirname(path), `.diffdevil-probe-${randomUUID()}.tmp`);
  try {
    await writeReceipt(first, { probe: true }, { exclusive: true });
    await writeReceipt(second, { probe: true }, { exclusive: true });
    await rename(first, second);
  } catch { fail('The receipt directory does not support the required atomic commit.', 'E_OPERATOR_RECEIPT'); }
  finally { await Promise.all([rm(first, { force: true }), rm(second, { force: true })]); }
}

/** Same target, file metadata and receipt-commit preflight as install; no protected contents read. */
export async function checkCredentials(options) {
  const selected = { wrangler: DEFAULT_WRANGLER, runner: createProcessRunner(), ...options };
  validateAppId(selected.appId);
  const target = await requireTarget(selected);
  await requireVersionTarget(selected, target);
  await receiptDestination(selected.receiptPath);
  await inputFiles(selected, target);
  return { state: 'ready-for-input', mode: target.fixture ? 'fixture' : 'provider', accountId: target.accountId, worker: target.worker, databaseId: target.databaseId, baseVersionId: target.baseVersionId, inputs: inputNames(target, selected), protectedValues: 'unread', identity: 'unverified', providerWrite: 'not-attempted' };
}

async function readSecretFile(path) {
  try { return (await readFile(path, 'utf8')).replace(/\r?\n$/u, ''); }
  catch { fail('A protected input file could not be read.', 'E_OPERATOR_INPUT_FILE'); }
}

function protectedInputSource(path, environmentName, label) {
  if (path && environmentName) fail(`Choose either a ${label} file or named environment input.`);
  if (environmentName) return { environmentName };
  return { path: requireValue(path, `${label} path`) };
}

async function readProtectedInput(source, label) {
  if (source.environmentName) return requireValue(process.env[source.environmentName], `${label} environment input`);
  return readSecretFile(source.path);
}

/** Read the retained seal through the same explicit source and validation used by both callers. */
export async function readSealKey(options) {
  const value = await readProtectedInput(protectedInputSource(options.sealKeyPath, options.sealKeyEnv, 'Retained seal key'), 'Retained seal key');
  if (value.length < 16 || /\r|\n/u.test(value)) fail('Retained seal key must be a single line of at least 16 characters.');
  return value;
}

async function qualifiedIdentity(options, target, values) {
  try {
    const githubFetch = options.githubFetch ?? fetch;
    const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
    const jwt = await createAppJwt({ appId: values.GITHUB_APP_ID, privateKey: values.GITHUB_APP_PRIVATE_KEY });
    const response = await githubFetch('https://api.github.com/app', { method: 'GET', redirect: 'error', headers: { ...headers, Authorization: `Bearer ${jwt}` } });
    if (!response.ok) throw new Error();
    const app = await response.json();
    const appId = validateAppId(String(app.id));
    const clientId = validateOAuthClientId(app.client_id);
    const slug = identifier(app.slug, 'GitHub App slug');
    if (appId !== values.GITHUB_APP_ID || (target.configuredAppId !== undefined && String(target.configuredAppId) !== appId) || (target.joinedApp && clientId !== values.GITHUB_OAUTH_CLIENT_ID) || (target.configuredClientId !== undefined && target.configuredClientId !== clientId) || `${slug}[bot]`.toLowerCase() !== target.botLogin.toLowerCase()) throw new Error();
    // This public read needs no bearer. Never forward the App JWT to another endpoint.
    const botResponse = await githubFetch(`https://api.github.com/users/${encodeURIComponent(`${slug}[bot]`)}`, { method: 'GET', redirect: 'error', headers });
    if (!botResponse.ok) throw new Error();
    const bot = await botResponse.json();
    if (bot.type !== 'Bot' || typeof bot.login !== 'string' || bot.login.toLowerCase() !== target.botLogin.toLowerCase()) throw new Error();
    return { state: 'verified', appId, clientId, botLogin: target.botLogin, botId: validateAppId(String(bot.id)) };
  } catch { fail('GitHub App identity could not be verified against the selected App ID, OAuth client and configured bot. No provider write was attempted.', 'E_OPERATOR_IDENTITY'); }
}

function sealFingerprint(value) {
  return createHash('sha256').update('diffdevil-seal-continuity-v1\0').update(value).digest('hex');
}

async function sealContinuity(options, target, value) {
  const sha256 = sealFingerprint(value);
  if (options.sealKeyInitial) return { state: 'initial', sha256 };
  try {
    const previous = JSON.parse(await readFile(options.sealKeyPreviousReceiptPath, 'utf8'));
    if (previous.format !== 'diffdevil-credential-version-v1' || previous.mode !== (target.fixture ? 'fixture' : 'provider') || previous.accountId !== target.accountId || previous.worker !== target.worker || previous.databaseId !== target.databaseId || previous.state !== 'version-created' || previous.command !== 'accepted' || previous.version?.state !== 'read-back' || previous.sealKeyRecoveryRef !== options.sealKeyRecoveryRef || !['initial', 'matched'].includes(previous.sealKeyContinuity?.state) || previous.sealKeyContinuity.sha256 !== sha256) throw new Error();
    return { state: 'matched', sha256, previousVersionId: identifier(previous.version.id, 'Previous seal version ID') };
  } catch { fail('Retained seal continuity could not be matched to the established target and custody reference. Keep the original seal; no provider write was attempted.', 'E_OPERATOR_SEAL'); }
}

/** Generate only into an already-admitted custody destination. Returns no protected value. */
export async function generateSealKey({ sealKeyPath, sealKeyRecoveryRef }) {
  requireValue(sealKeyPath, 'New custody-owned seal key path');
  const recoveryRef = identifier(sealKeyRecoveryRef, 'Established seal key recovery reference');
  const value = randomBytes(32).toString('base64url');
  try {
    const file = await open(sealKeyPath, 'wx', 0o600);
    try { await file.writeFile(`${value}\n`, 'utf8'); await file.sync(); } finally { await file.close(); }
  } catch { fail('Seal generation did not finish. Inspect the selected custody destination before retrying; no existing file was overwritten.', 'E_OPERATOR_SEAL'); }
  return { state: 'seal-created', recoveryRef, sha256: sealFingerprint(value), custody: 'externally-established-not-proved-by-generation' };
}

async function credentialValues(options, target) {
  const captured = options.readGitHubInputs ? await options.readGitHubInputs() : undefined;
  if (captured && (captured.GITHUB_APP_ID !== options.appId || (target.joinedApp && captured.GITHUB_OAUTH_CLIENT_ID !== options.oauthClientId))) fail('Captured GitHub identity differs from the selected installation.');
  const privateKey = captured ? captured.GITHUB_APP_PRIVATE_KEY : await readSecretFile(options.privateKeyPath);
  validateGitHubAppPrivateKey(privateKey);
  const webhook = captured ? captured.GITHUB_WEBHOOK_SECRET : options.webhookSecretPath ? await readSecretFile(options.webhookSecretPath) : await options.readWebhookSecret();
  const values = { GITHUB_APP_ID: validateAppId(options.appId), GITHUB_WEBHOOK_SECRET: validateWebhookSecret(webhook), GITHUB_APP_PRIVATE_KEY: privateKey };
  if (!target.joinedApp) return values;
  values.GITHUB_OAUTH_CLIENT_ID = validateOAuthClientId(options.oauthClientId);
  values.GITHUB_OAUTH_CLIENT_SECRET = validateWebhookSecret(captured ? captured.GITHUB_OAUTH_CLIENT_SECRET : await readSecretFile(options.oauthClientSecretPath));
  values.APP_SEAL_KEY = await readSealKey(options);
  if (target.wirtConfigured || options.wirtSigningKeyPath || options.wirtSigningKeyEnv) {
    values.WIRT_SIGNING_KEY_CURRENT = await readProtectedInput(protectedInputSource(options.wirtSigningKeyPath, options.wirtSigningKeyEnv, 'Wirt signing key'), 'Wirt signing key');
    readSigningKeys({ current: values.WIRT_SIGNING_KEY_CURRENT });
  }
  return values;
}

function newVersion(before, after) {
  if (after.state !== 'read-back') return { state: 'unknown' };
  const beforeIds = new Set(before.versions.map(version => version.id));
  const created = after.versions.filter(version => !beforeIds.has(version.id));
  if (created.length === 0) return { state: 'absent' };
  if (created.length !== 1) return { state: 'unknown' };
  return { state: 'observed', id: created[0].id };
}

async function reconcileReceipt({ runner, wrangler, target, report }) {
  if (report.command === 'not-attempted') {
    report.state = 'not-attempted';
    return report;
  }
  const candidate = report.version.id ? { state: 'observed', id: report.version.id } : newVersion(report.before.versions, await readVersions({ runner, wrangler, ...target }));
  report.version = candidate;
  if (candidate.state === 'observed') {
    const viewed = await nativeJson({ runner, args: buildWranglerCommand(wrangler, ['versions', 'view', candidate.id, '--json'], target), env: target.env });
    const bindings = viewed?.resources?.bindings;
    const hasInputs = hasVersionTarget(bindings, target) && report.inputs.every(name => bindings.some(binding => binding?.type === 'secret_text' && binding.name === name));
    report.version = { state: viewed?.id === candidate.id && hasInputs ? 'read-back' : 'unknown', id: candidate.id };
  }
  const after = await readDeployment({ runner, wrangler, ...target });
  report.deployment = after.state === 'read-back' ? { state: after.snapshot === report.before.deployment.snapshot ? 'unchanged' : 'changed' } : { state: 'unknown' };
  if (report.command === 'accepted' && report.version.state === 'read-back' && report.deployment.state === 'unchanged') report.state = 'version-created';
  else if (report.command === 'failed' && report.version.state === 'absent' && report.deployment.state === 'unchanged') report.state = 'not-created';
  else if (report.version.state === 'read-back' || report.deployment.state === 'changed') report.state = 'partial';
  else report.state = 'unknown';
  return report;
}

/** Creates one undeployed version. Protected contents go directly to contained native stdin, never a disk carrier. */
export async function installCredentials(options) {
  const selected = { wrangler: DEFAULT_WRANGLER, runner: createProcessRunner(), ...options };
  validateAppId(selected.appId);
  const target = await requireTarget(selected);
  await requireVersionTarget(selected, target);
  await receiptDestination(selected.receiptPath);
  await inputFiles(selected, target);
  const report = initialReceipt(target, selected);
  await writeReceipt(selected.receiptPath, report, { exclusive: true });
  let values;
  try {
    try { values = await credentialValues(selected, target); }
    catch { fail('Protected inputs could not be validated.', 'E_OPERATOR_INPUT'); }
    report.identity = await qualifiedIdentity(selected, target, values);
    if (target.joinedApp) report.sealKeyContinuity = await sealContinuity(selected, target, values.APP_SEAL_KEY);
    await unchangedConfiguration(target);
    target.versions = await readVersions({ ...selected, ...target });
    if (target.versions.state !== 'read-back') fail('Worker versions could not be read back before the write.', 'E_OPERATOR_TARGET');
    await requireVersionTarget({ ...selected, baseVersionId: report.baseVersionId }, target);
  } catch (error) {
    values = undefined;
    report.state = 'not-attempted';
    await writeReceipt(selected.receiptPath, report);
    const reason = {
      E_OPERATOR_IDENTITY: 'GitHub App identity did not qualify.',
      E_OPERATOR_SEAL: 'Retained seal continuity did not qualify.',
      E_OPERATOR_TARGET: 'The exact target or qualified base did not remain current.',
      E_OPERATOR_CONFIG: 'The target configuration did not remain usable.'
    }[error.code] ?? 'Protected inputs could not be validated.';
    fail(`${reason} No provider write was attempted. Correct the cause and use a new receipt for a deliberately selected new operation; keep this receipt.`, error.code?.startsWith('E_OPERATOR_') ? error.code : 'E_OPERATOR_INPUT', report);
  }
  // Durable ambiguity marker precedes the non-idempotent operation, even if the process is interrupted.
  report.command = 'attempted-unknown';
  report.state = 'unknown';
  await writeReceipt(selected.receiptPath, report);
  try {
    const write = await selected.runner({ args: buildWranglerCommand(selected.wrangler, ['versions', 'secret', 'bulk', '--message', 'Prepare App credentials without deployment'], target), input: JSON.stringify(values), env: target.env });
    report.command = write.code === 0 ? 'accepted' : 'failed';
  } catch { /* The request may have arrived. Keep the durable attempted-unknown marker. */ }
  values = undefined;
  await writeReceipt(selected.receiptPath, report);
  await reconcileReceipt({ ...selected, target, report });
  await writeReceipt(selected.receiptPath, report);
  if (report.state !== 'version-created') fail('Credential version has an incomplete result. Resume this receipt to reconcile; do not repeat installation.', 'E_OPERATOR_VERSION', report);
  return report;
}

async function readReceipt(path, target) {
  let report;
  try { report = JSON.parse(await readFile(requireValue(path, 'Receipt path'), 'utf8')); } catch { fail('Resume requires a readable existing receipt.', 'E_OPERATOR_RECEIPT'); }
  const inputs = inputNames(target, { wirtSigningKeyPath: report?.inputs?.includes('WIRT_SIGNING_KEY_CURRENT') });
  const correctTarget = report?.format === 'diffdevil-credential-version-v1' && report.mode === (target.fixture ? 'fixture' : 'provider') && report.accountId === target.accountId && report.worker === target.worker && report.databaseId === target.databaseId && report.configHash === target.configHash && JSON.stringify(report.inputs) === JSON.stringify(inputs);
  const correctState = ['not-attempted', 'attempted-unknown', 'accepted', 'failed'].includes(report?.command) && report.before?.versions?.state === 'read-back' && Array.isArray(report.before.versions.versions) && report.before.versions.versions.every(version => typeof version?.id === 'string' && /^[A-Za-z0-9_-]+$/u.test(version.id)) && report.before?.deployment?.state === 'read-back' && typeof report.before.deployment.snapshot === 'string' && (report.version?.id === undefined || (typeof report.version.id === 'string' && /^[A-Za-z0-9_-]+$/u.test(report.version.id)));
  if (!correctTarget || !correctState) fail('Receipt is unusable or belongs to a different exact target/configuration.', 'E_OPERATOR_RECEIPT');
  const baseVersionId = identifier(report.baseVersionId, 'Receipt base version ID');
  if (baseVersionId !== report.before.versions.versions.at(-1)?.id) fail('Receipt base version differs from its qualified checkpoint.', 'E_OPERATOR_RECEIPT');
  let identity = { state: 'unobserved' }, continuity;
  if (report.identity?.state === 'verified') {
    if (report.identity.botLogin !== target.botLogin) fail('Receipt GitHub bot identity differs from the target.', 'E_OPERATOR_RECEIPT');
    identity = { state: 'verified', appId: validateAppId(report.identity.appId), clientId: validateOAuthClientId(report.identity.clientId), botLogin: target.botLogin, botId: validateAppId(report.identity.botId) };
  } else if (report.command !== 'not-attempted') fail('Receipt has no qualified GitHub App identity.', 'E_OPERATOR_RECEIPT');
  if (target.joinedApp) {
    continuity = { state: 'unobserved' };
    if (['initial', 'matched'].includes(report.sealKeyContinuity?.state) && /^[a-f0-9]{64}$/u.test(report.sealKeyContinuity.sha256 ?? '')) {
      continuity = { state: report.sealKeyContinuity.state, sha256: report.sealKeyContinuity.sha256, ...(report.sealKeyContinuity.state === 'matched' ? { previousVersionId: identifier(report.sealKeyContinuity.previousVersionId, 'Previous seal version ID') } : {}) };
    } else if (report.command !== 'not-attempted') fail('Receipt has no retained seal continuity check.', 'E_OPERATOR_RECEIPT');
  }
  let beforeDeployment;
  try {
    const snapshot = JSON.parse(report.before.deployment.snapshot);
    identifier(snapshot.id, 'Deployment ID');
    if (!Array.isArray(snapshot.versions)) throw new Error();
    beforeDeployment = { id: snapshot.id, versions: snapshot.versions.map(version => ({ version_id: identifier(version.version_id, 'Version ID'), percentage: version.percentage })) };
    if (beforeDeployment.versions.some(version => typeof version.percentage !== 'number' || !Number.isFinite(version.percentage))) throw new Error();
  } catch { fail('Receipt deployment checkpoint is unusable.', 'E_OPERATOR_RECEIPT'); }
  // Reconstruct the allowlisted receipt; an edited receipt cannot inject arbitrary data into output.
  return { ...initialReceipt(target, { sealKeyRecoveryRef: target.joinedApp ? identifier(report.sealKeyRecoveryRef, 'Seal key recovery reference') : undefined }), baseVersionId, identity, ...(target.joinedApp ? { sealKeyContinuity: continuity } : {}), inputs, command: report.command, before: { deployment: { state: 'read-back', snapshot: JSON.stringify(beforeDeployment) }, versions: { state: 'read-back', versions: report.before.versions.versions.map(version => ({ id: version.id })) } }, version: report.version?.id ? { state: 'unknown', id: report.version.id } : { state: 'unknown' } };
}

/** Readback-only recovery. No credential read, secret upload, deployment, or blind retry. */
export async function resumeCredentials(options) {
  const selected = { wrangler: DEFAULT_WRANGLER, runner: createProcessRunner(), ...options };
  const target = await requireTarget(selected);
  const report = await readReceipt(selected.receiptPath, target);
  await reconcileReceipt({ ...selected, target, report });
  await writeReceipt(selected.receiptPath, report);
  if (!['version-created', 'not-created', 'not-attempted'].includes(report.state)) fail('Receipt remains partial or unknown; reconcile the exact provider target before another effect.', 'E_OPERATOR_VERSION', report);
  return report;
}

export async function readHiddenTerminalSecret({ input = process.stdin, output = process.stdout } = {}) {
  if (!input.isTTY || !output.isTTY || typeof input.setRawMode !== 'function') fail('Interactive entry requires a TTY; use a protected file or redirected --webhook-secret-stdin.', 'E_OPERATOR_TTY');
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

const BOOLEAN_OPTIONS = new Set(['fake', 'webhook-secret-stdin', 'policy-refresh', 'seal-key-initial']);
const VALUE_OPTIONS = new Set(['webhook-url', 'visibility', 'app-name', 'oauth-callback-url', 'app-id', 'private-key-file', 'account-id', 'config', 'worker', 'base-version-id', 'webhook-secret-file', 'oauth-client-id', 'oauth-client-secret-file', 'seal-key-file', 'seal-key-env', 'seal-key-recovery-ref', 'seal-key-previous-receipt', 'wirt-signing-key-file', 'wirt-signing-key-env', 'receipt-file', 'wrangler']);

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = {};
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token.startsWith('--')) fail('Unexpected argument. Use named options with non-secret values.');
    const name = token.slice(2);
    if ((!BOOLEAN_OPTIONS.has(name) && !VALUE_OPTIONS.has(name)) || Object.hasOwn(options, name)) fail('Unknown or repeated option.');
    if (BOOLEAN_OPTIONS.has(name)) options[name] = true;
    else {
      const value = rest[++index];
      if (value === undefined || value.startsWith('--')) fail('A named option is missing its value.');
      options[name] = value;
    }
  }
  return { command, options };
}

function createFakeRunner() {
  let versionCreated = false, inputs = [];
  return async ({ args, input }) => {
    if (args.includes('whoami')) return { code: 0, stdout: JSON.stringify({ accounts: [{ id: 'fixture-account' }] }) };
    if (args.includes('deployments')) return { code: 0, stdout: JSON.stringify([{ id: 'fixture-deployment', versions: [{ version_id: 'fixture-before', percentage: 100 }] }]) };
    if (args.includes('versions') && args.includes('list')) return { code: 0, stdout: JSON.stringify(versionCreated ? [{ id: 'fixture-before' }, { id: 'fixture-created' }] : [{ id: 'fixture-before' }]) };
    if (args.includes('versions') && args.includes('view')) {
      const config = parse(await readFile(args[args.indexOf('--config') + 1], 'utf8'));
      return { code: 0, stdout: JSON.stringify({ id: args[args.indexOf('view') + 1], resources: { bindings: [{ name: 'APP_DB', type: 'd1', id: config.d1_databases[0].database_id }, ...(config.vars?.GITHUB_APP_BOT_LOGIN ? [{ name: 'GITHUB_APP_BOT_LOGIN', type: 'plain_text', text: config.vars.GITHUB_APP_BOT_LOGIN }] : []), ...inputs.map(name => ({ type: 'secret_text', name }))] } }) };
    }
    if (args.includes('bulk')) { inputs = Object.keys(JSON.parse(input)); versionCreated = true; return { code: 0, stdout: '' }; }
    return { code: 2, stdout: '' };
  };
}

function createFakeGitHubFetch(options) {
  return async url => {
    const config = parse(await readFile(options.config, 'utf8'));
    const botLogin = config.vars?.GITHUB_APP_BOT_LOGIN ?? 'diffdevil[bot]';
    const data = url.endsWith('/app') ? { id: Number(options.appId), client_id: options.oauthClientId ?? 'fixture-client', slug: botLogin.replace(/\[bot\]$/u, '') } : { id: 456, login: botLogin, type: 'Bot' };
    return { ok: true, json: async () => data };
  };
}

function help() {
  return `Usage:
  node apps/github-app/operator-helper.mjs registration --webhook-url <https-url> [--visibility private|public] [--app-name <name>] [--oauth-callback-url <https-url>] [--policy-refresh]
  node apps/github-app/operator-helper.mjs check|install --app-id <numeric-id> --private-key-file <app-pem> --account-id <account-id> --config <exact-json-or-jsonc> --receipt-file <new-durable-receipt> [--worker <matching-name>] [--webhook-secret-file <protected-file> | --webhook-secret-stdin] [--fake]
    Joined-App configs also require --base-version-id <qualified-bootstrap-version> --oauth-client-id <id> --oauth-client-secret-file <protected-file> (--seal-key-file <retained-file> | --seal-key-env <variable-name>) --seal-key-recovery-ref <opaque-custody-id> (--seal-key-initial | --seal-key-previous-receipt <established-target-receipt>). With Wirt configured, add --wirt-signing-key-file <protected-file> or --wirt-signing-key-env <variable-name>.
  node apps/github-app/operator-helper.mjs generate-seal --seal-key-file <new-admitted-custody-file> --seal-key-recovery-ref <established-custody-id>
  node apps/github-app/operator-helper.mjs resume --account-id <account-id> --config <same-exact-config> --receipt-file <existing-receipt> [--worker <matching-name>]

Omit webhook input flags for the hidden TTY checkpoint. --webhook-secret-stdin requires an already-safe redirected channel. Generation requires externally established custody and never prints the key. The config selects the Worker; --worker verifies it, never overrides it. No command deploys.`;
}

export async function main(argv = process.argv.slice(2)) {
  const { command, options } = parseArgs(argv);
  if (command === 'generate-seal') {
    process.stdout.write(`${JSON.stringify(await generateSealKey({ sealKeyPath: options['seal-key-file'], sealKeyRecoveryRef: options['seal-key-recovery-ref'] }), null, 2)}\n`);
    return;
  }
  if (command === 'registration') {
    process.stdout.write(`${JSON.stringify(registrationInputs({ webhookUrl: options['webhook-url'], visibility: options.visibility, appName: options['app-name'], oauthCallbackUrl: options['oauth-callback-url'], policyRefresh: options['policy-refresh'] }), null, 2)}\n`);
    return;
  }
  if (['check', 'install', 'resume'].includes(command)) {
    if (options['webhook-secret-file'] && options['webhook-secret-stdin']) fail('Choose one webhook input route.');
    if (options['webhook-secret-stdin'] && process.stdin.isTTY) fail('Refusing TTY stdin; omit the flag for hidden entry.', 'E_OPERATOR_TTY');
    const selected = { appId: options['app-id'], privateKeyPath: options['private-key-file'], accountId: options['account-id'], config: options.config, worker: options.worker, baseVersionId: options['base-version-id'], receiptPath: options['receipt-file'], webhookSecretPath: options['webhook-secret-file'], oauthClientId: options['oauth-client-id'], oauthClientSecretPath: options['oauth-client-secret-file'], sealKeyPath: options['seal-key-file'], sealKeyEnv: options['seal-key-env'], sealKeyRecoveryRef: options['seal-key-recovery-ref'], sealKeyInitial: options['seal-key-initial'], sealKeyPreviousReceiptPath: options['seal-key-previous-receipt'], wirtSigningKeyPath: options['wirt-signing-key-file'], wirtSigningKeyEnv: options['wirt-signing-key-env'], readWebhookSecret: options['webhook-secret-stdin'] ? readRedirectedSecret : readHiddenTerminalSecret, ...(options.wrangler ? { wrangler: options.wrangler } : {}), ...(options.fake ? { fixture: true, runner: createFakeRunner(), githubFetch: createFakeGitHubFetch({ config: options.config, appId: options['app-id'], oauthClientId: options['oauth-client-id'] }) } : {}) };
    const result = await (command === 'check' ? checkCredentials(selected) : command === 'resume' ? resumeCredentials(selected) : installCredentials(selected));
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  process.stderr.write(`${help()}\n`);
  process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => {
    if (error.receipt) process.stdout.write(`${JSON.stringify(error.receipt, null, 2)}\n`);
    // Unknown filesystem, parser, native and input errors can contain protected bytes.
    process.stderr.write(`${/^E_OPERATOR_/u.test(error.code ?? '') ? error.message : 'Operator preparation failed; protected input and native details are withheld.'}\n`);
    process.exitCode = 2;
  });
}
