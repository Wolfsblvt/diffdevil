// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/** Local, occasion-bound GitHub manifest capture and exact-target installer handoff. */
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import { open, readFile, rename, rm, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parse } from 'jsonc-parser';
import { createProtector } from '../app/src/lib/protector.mjs';
import { validateGitHubAppPrivateKey } from './crypto.mjs';
import { createProcessRunner, installCredentials, nativeProcessEnvironment, readSealKey, registrationInputs, selectedEnvironmentInputs, validateAppId, validateOAuthClientId, validateWebhookSecret } from './operator-helper.mjs';

const FORMAT = 'diffdevil-manifest-capture-v1';
const HANDSHAKE_MS = 60 * 60 * 1000; // GitHub's documented manifest handshake, not an authorization lifetime.
const CHILD = fileURLToPath(new URL('./manifest-convert.mjs', import.meta.url));
const STATES = new Set(['prepared', 'callback-received', 'conversion-attempted', 'captured', 'ready']);

function fail(message, code = 'E_MANIFEST_INPUT') { throw Object.assign(new Error(message), { code }); }
function token(value, name) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/u.test(value)) fail(`${name} must be an identifier.`);
  return value;
}
function same(left, right) {
  const a = Buffer.from(left ?? ''), b = Buffer.from(right ?? '');
  return a.length === b.length && timingSafeEqual(a, b);
}
function paths(options) {
  for (const name of ['capturePath', 'receiptPath']) if (!options[name]) fail(`${name} is required.`);
  try { selectedEnvironmentInputs(options); } catch { fail('Choose one explicit file or named environment source per key, with distinct valid input names.'); }
  if (!options.sealKeyPath && !options.sealKeyEnv) fail('Select a retained seal file or named environment input.');
  const files = [options.capturePath, options.receiptPath, options.sealKeyPath].filter(Boolean).map(path => resolve(path));
  if (new Set(files).size !== files.length) fail('Capture, receipt and retained seal must have separate paths.');
  token(options.sealKeyRecoveryRef, 'Seal custody reference');
}
async function protector(options) {
  let secret;
  try { secret = await readSealKey(options); } catch { fail('The selected retained seal is unavailable or invalid.'); }
  return createProtector({ secret });
}
async function writeAtomic(path, contents, exclusive = false) {
  const temporary = exclusive ? path : join(dirname(path), `.manifest-${randomBytes(16).toString('hex')}.tmp`);
  try {
    const file = await open(temporary, 'wx', 0o600);
    try { await file.writeFile(contents, 'utf8'); await file.sync(); } finally { await file.close(); }
    if (!exclusive) await rename(temporary, path);
  } catch { fail('Checkpoint commit failed. Retain the existing capture; do not repeat conversion.', 'E_MANIFEST_CHECKPOINT'); }
  finally { if (!exclusive) await rm(temporary, { force: true }).catch(() => {}); }
}
async function destination(path) {
  try { await stat(path); fail('Output already exists. Resume that capture instead of registering again.'); }
  catch (error) { if (error.code !== 'ENOENT') fail('Output exists or is unusable. Resume the existing capture.'); }
  const probe = join(dirname(path), `.manifest-probe-${randomBytes(16).toString('hex')}`);
  try { await writeAtomic(probe, 'probe', true); await writeAtomic(probe, 'replacement'); }
  finally { await rm(probe, { force: true }).catch(() => {}); }
}

/** Non-mutating preview exercises the same registration selection and checkpoint destinations. */
export async function checkManifest(options) {
  paths(options);
  const selection = registrationSelection(options);
  if (options.sealKeyPath) {
    try { if (!(await stat(options.sealKeyPath)).isFile()) throw new Error(); } catch { fail('The retained seal input file is unavailable.'); }
  }
  await destination(options.capturePath);
  await destination(options.receiptPath);
  return { state: 'ready-for-registration', ...selection, conversion: 'not-attempted', protectedValues: 'unread', liveRedirect: 'unobserved' };
}
function registrationSelection(options) {
  token(options.owner, 'Registration owner');
  if (!['personal', 'organisation'].includes(options.ownerType)) fail('Choose personal or organisation registration.');
  if (!['public', 'private'].includes(options.visibility)) fail('Select public or private visibility explicitly.');
  const inputs = registrationInputs(options);
  const port = Number(options.port ?? 43871);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) fail('Choose a loopback port from 1024 to 65535.');
  if (options.fixtureOrigin && !/^http:\/\/127\.0\.0\.1:\d+$/u.test(options.fixtureOrigin)) fail('Synthetic provider must be an explicit IPv4 loopback origin.');
  return { owner: options.owner, ownerType: options.ownerType, appName: inputs.appName, visibility: inputs.visibility, webhookUrl: inputs.webhookUrl, ...(inputs.oauthCallbackUrl ? { oauthCallbackUrl: inputs.oauthCallbackUrl } : {}), policyRefresh: options.policyRefresh === true, port, mode: options.fixtureOrigin ? 'fixture' : 'provider', ...(options.fixtureOrigin ? { fixtureOrigin: options.fixtureOrigin } : {}) };
}

function manifestFor(capture) {
  const inputs = registrationInputs(capture.selection);
  return {
    name: inputs.appName, url: 'https://github.com/Wolfsblvt/diffdevil', description: 'Composable diff analysis and policy for GitHub pull requests.',
    hook_attributes: { url: inputs.webhookUrl, active: true },
    redirect_url: `http://127.0.0.1:${capture.selection.port}/callback`,
    ...(inputs.oauthCallbackUrl ? { callback_urls: [inputs.oauthCallbackUrl] } : {}),
    public: inputs.visibility === 'public', default_permissions: { contents: 'read', pull_requests: 'write', checks: 'write' }, default_events: inputs.events
  };
}
function registrationEndpoint(capture) {
  const origin = capture.selection.fixtureOrigin ?? 'https://github.com';
  const path = capture.selection.ownerType === 'personal' ? '/settings/apps/new' : `/organizations/${capture.selection.owner}/settings/apps/new`;
  return `${origin}${path}?state=${capture.stateToken}`;
}
function safeReceipt(capture) {
  const { fixtureOrigin, ...selection } = capture.selection;
  return { format: FORMAT, captureId: capture.id, state: capture.stage, ...selection, sealKeyRecoveryRef: capture.sealKeyRecoveryRef,
    requestedVisibility: selection.visibility, providerVisibility: 'unobserved',
    conversion: ['prepared', 'callback-received'].includes(capture.stage) ? 'not-attempted' : capture.stage === 'conversion-attempted' ? 'attempted-unknown' : 'response-captured',
    installation: 'separate-receipt', ...(capture.identity ? { identity: capture.identity } : {}) };
}
async function save(options, capture, seal, exclusive = false) {
  // The encrypted authoritative capture commits first; status/resume can rebuild a missing safe receipt.
  await writeAtomic(options.capturePath, await seal.seal(capture), exclusive);
  await writeAtomic(options.receiptPath, `${JSON.stringify(safeReceipt(capture), null, 2)}\n`, exclusive);
}
async function load(options) {
  paths(options);
  const seal = await protector(options);
  let capture;
  try { capture = await seal.open(await readFile(options.capturePath, 'utf8')); } catch { /* Fixed error below. */ }
  if (capture?.format !== FORMAT || !STATES.has(capture.stage) || capture.sealKeyRecoveryRef !== options.sealKeyRecoveryRef) fail('Capture is absent, unusable, or belongs to another retained seal/custody reference.', 'E_MANIFEST_CAPTURE');
  registrationSelection(capture.selection);
  token(capture.id, 'Capture identity');
  token(capture.stateToken, 'Callback state');
  if (!Number.isFinite(capture.createdAt)) fail('Capture has no usable handshake checkpoint.');
  return { capture, seal };
}
async function locked(options, operation) {
  paths(options);
  // An interruption leaves this exact lock for an operator to reconcile; never steal another live writer's capture.
  const lockPath = `${options.capturePath}.lock`;
  let handle;
  try { handle = await open(lockPath, 'wx', 0o600); } catch { fail('Capture is already owned or has an interrupted lock. Confirm its process stopped before removing only that lock.', 'E_MANIFEST_LOCK'); }
  try { await handle.writeFile(JSON.stringify({ pid: process.pid })); await handle.sync(); return await operation(); }
  finally { await handle.close(); await rm(lockPath, { force: true }); }
}
function expired(capture) { return Date.now() - capture.createdAt >= HANDSHAKE_MS; }
function identityAndInputs(capture) {
  let app;
  try { if (capture.response.status !== 201) throw new Error(); app = JSON.parse(capture.response.body); } catch { fail('Conversion response is retained but unusable. Reconcile the existing GitHub registration; do not reconvert.', 'E_MANIFEST_RESPONSE'); }
  const selected = capture.selection;
  if (app.owner?.login?.toLowerCase() !== selected.owner.toLowerCase() || app.owner?.type !== (selected.ownerType === 'personal' ? 'User' : 'Organization')) fail('Captured App does not match the selected registration owner/type. The encrypted response is preserved.', 'E_MANIFEST_IDENTITY');
  // GitHub explicitly lets the creating operator edit the proposed name in the native form.
  if (typeof app.name !== 'string' || !app.name.trim() || /\r|\n/u.test(app.name)) fail('Captured App has no usable provider name.', 'E_MANIFEST_IDENTITY');
  const appId = validateAppId(String(app.id));
  const clientId = validateOAuthClientId(app.client_id);
  const slug = token(app.slug, 'Captured App slug');
  const permissions = app.permissions;
  if (!permissions || permissions.contents !== 'read' || permissions.pull_requests !== 'write' || permissions.checks !== 'write' || Object.keys(permissions).some(key => !['contents', 'pull_requests', 'checks', 'metadata'].includes(key))) fail('Captured App permissions differ from the manifest.', 'E_MANIFEST_IDENTITY');
  const expectedEvents = manifestFor(capture).default_events;
  if (!Array.isArray(app.events) || expectedEvents.some(event => !app.events.includes(event)) || app.events.some(event => ![...expectedEvents, 'installation', 'installation_repositories'].includes(event))) fail('Captured App events differ from the manifest.', 'E_MANIFEST_IDENTITY');
  validateGitHubAppPrivateKey(app.pem);
  return { identity: { appId, oauthClientId: clientId, appName: app.name, slug, botLogin: `${slug}[bot]`, owner: selected.owner, ownerType: selected.ownerType },
    values: { GITHUB_APP_ID: appId, GITHUB_APP_PRIVATE_KEY: app.pem.replace(/\r?\n$/u, ''), GITHUB_WEBHOOK_SECRET: validateWebhookSecret(app.webhook_secret), GITHUB_OAUTH_CLIENT_ID: clientId, GITHUB_OAUTH_CLIENT_SECRET: validateWebhookSecret(app.client_secret) } };
}
async function convert(options, capture, seal) {
  if (capture.stage === 'conversion-attempted') fail('Conversion outcome is unknown. The one-use code will not be retried. Reconcile the existing App registration and recover its inputs through full-set installation.', 'E_MANIFEST_UNKNOWN');
  if (capture.stage === 'callback-received') {
    if (expired(capture)) fail('GitHub manifest handshake expired. Reconcile any existing registration before selecting a new flow.', 'E_MANIFEST_EXPIRED');
    capture.stage = 'conversion-attempted';
    await save(options, capture, seal);
    const runner = createProcessRunner();
    const response = await runner({ args: [CHILD], input: JSON.stringify({ code: capture.code, fixtureOrigin: capture.selection.fixtureOrigin }), env: nativeProcessEnvironment(process.env, options), signal: options.signal });
    if (response.code !== 0) fail('Conversion outcome is unknown; resume will refuse a second conversion.', 'E_MANIFEST_UNKNOWN');
    try { capture.response = JSON.parse(response.stdout); } catch { fail('Conversion outcome is unknown; its child response was unusable.', 'E_MANIFEST_UNKNOWN'); }
    capture.stage = 'captured';
    delete capture.code;
    await save(options, capture, seal); // Preserve even malformed provider bodies before parsing/validation.
  }
  if (['captured', 'ready'].includes(capture.stage)) {
    capture.identity = identityAndInputs(capture).identity;
    capture.stage = 'ready';
    await save(options, capture, seal);
  }
  return safeReceipt(capture);
}
function escapeHtml(value) { return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;'); }
function permissionAndEventDisclosure(manifest, selection) {
  const labels = { contents: 'Contents', pull_requests: 'Pull requests', checks: 'Checks' };
  const permissions = Object.entries(manifest.default_permissions).map(([name, access]) => `<dt>${escapeHtml(labels[name] ?? name)}</dt><dd>${escapeHtml(access)}</dd>`).join('');
  const events = manifest.default_events.map(event => `<li><code>${escapeHtml(event)}</code>${event === 'push' ? ' — refresh trusted policy when the repository’s default branch changes.' : ''}</li>`).join('');
  const lifecycle = registrationInputs(selection).providerDefaultEvents.map(event => `<code>${escapeHtml(event)}</code>`).join(', ');
  return `<section aria-labelledby="permissions-heading"><h2 id="permissions-heading">Requested permissions</h2><dl>${permissions}</dl></section><section aria-labelledby="events-heading"><h2 id="events-heading">Selected events</h2><ul>${events}</ul></section><section aria-labelledby="lifecycle-heading"><h2 id="lifecycle-heading">GitHub lifecycle events</h2><p>GitHub supplies ${lifecycle} by default. These lifecycle events are separate from the selected subscriptions and do not add another requested permission.</p></section>`;
}
function page(body) {
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>diffdevil · GitHub App registration</title><style>body{font:17px/1.6 system-ui;max-width:44rem;margin:3rem auto;padding:0 1rem;color:#202124}h1{line-height:1.2}button{font:inherit;padding:.6rem 1rem;cursor:pointer}button:focus-visible{outline:3px solid #315ad8;outline-offset:3px}dl{display:grid;grid-template-columns:10rem 1fr}dt{font-weight:600}dd{margin:0;overflow-wrap:anywhere}</style><main>${body}</main></html>`;
}

async function serve(options, capture, seal) {
  let finish;
  const completed = new Promise(resolveResult => { finish = resolveResult; });
  let handling = false;
  let outcome;
  const cancellation = new AbortController();
  const conversionOptions = { ...options, signal: cancellation.signal };
  const origin = `http://127.0.0.1:${capture.selection.port}`;
  const server = createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    // Chromium applies form-action to the provider's redirect chain too: allow the exact loopback return.
    response.setHeader('Content-Security-Policy', `default-src 'none'; style-src 'unsafe-inline'; form-action ${capture.selection.fixtureOrigin ?? 'https://github.com'} ${origin}; frame-ancestors 'none'; base-uri 'none'`);
    const reply = (status, body) => { response.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' }); response.end(page(body)); };
    if (request.headers.host !== `127.0.0.1:${capture.selection.port}` || request.method !== 'GET') return reply(403, '<h1>Request refused</h1>');
    const url = new URL(request.url, origin);
    if (url.pathname === '/result' && outcome) {
      reply(outcome.error ? 409 : 200, outcome.error
        ? '<h1>Capture needs recovery</h1><p>The helper preserved its last checkpoint. Read the fixed terminal result and resume that capture; do not create another App or repeat conversion.</p>'
        : '<h1>GitHub inputs captured</h1><p>The matching inputs are encrypted in the retained capture. The non-secret receipt names the App identity. Continue with the separate exact-target installation command; nothing has been installed or deployed.</p>');
      finish(outcome);
      return;
    }
    if (url.pathname === `/start/${capture.stateToken}` && capture.stage === 'prepared') {
      const manifest = manifestFor(capture);
      const fields = [['App name', capture.selection.appName], ['Registration owner', `${capture.selection.owner} (${capture.selection.ownerType})`], ['Visibility', capture.selection.visibility], ['Webhook', capture.selection.webhookUrl], ['OAuth callback', capture.selection.oauthCallbackUrl ?? 'Standalone backend; none']];
      return reply(200, `<h1>Register the diffdevil GitHub App</h1><p>Confirm the namespace, visibility, permissions and events below. The next step creates a GitHub App on GitHub. This local helper captures its matching inputs; it does not install or deploy them.</p><dl>${fields.map(([label, value]) => `<dt>${label}</dt><dd>${escapeHtml(value)}</dd>`).join('')}</dl>${permissionAndEventDisclosure(manifest, capture.selection)}<p>Complete this manifest handshake within one hour. Keep this helper running for the return.</p><p>If you already submitted on GitHub before an interruption, inspect that registration first. An interrupted callback does not mean the App was never created; do not submit another registration to recover it.</p><form method="post" action="${escapeHtml(registrationEndpoint(capture))}"><input type="hidden" name="manifest" value="${escapeHtml(JSON.stringify(manifest))}"><button type="submit">Continue on GitHub</button></form>`);
    }
    if (url.pathname !== '/callback') return reply(404, '<h1>Registration helper</h1><p>Use the local start address printed by the helper.</p>');
    const valid = url.searchParams.getAll('state').length === 1 && url.searchParams.getAll('code').length === 1 && same(url.searchParams.get('state'), capture.stateToken) && /^[A-Za-z0-9_-]+$/u.test(url.searchParams.get('code') ?? '');
    if (!valid || handling || capture.stage !== 'prepared' || expired(capture)) return reply(403, '<h1>Callback refused</h1><p>The callback did not match this active registration. No conversion was attempted.</p>');
    handling = true;
    // Never return code/state in HTML or forward them to an asset, log, or result URL.
    try {
      capture.code = url.searchParams.get('code'); capture.stage = 'callback-received';
      await save(options, capture, seal);
      outcome = { result: await convert(conversionOptions, capture, seal) };
    } catch (error) { outcome = { error }; }
    if (cancellation.signal.aborted) finish(outcome);
    response.writeHead(303, { Location: '/result' }); response.end();
  });
  server.on('clientError', (_error, socket) => socket.end('HTTP/1.1 400 Bad Request\r\n\r\n'));
  try {
    await new Promise((resolveListen, rejectListen) => { server.once('error', rejectListen); server.listen(capture.selection.port, '127.0.0.1', resolveListen); });
    // A non-secret acknowledgement, never the callback URL or provider response.
    options.onListening?.(`${origin}/start/${capture.stateToken}`);
    const stop = error => {
      cancellation.abort();
      // The callback owns its native child through close and its attempted checkpoint through commit.
      if (!handling || outcome) finish(outcome ?? { error });
    };
    const timeout = setTimeout(() => stop(Object.assign(new Error('GitHub manifest handshake expired. Resume/reconcile this capture before any new registration.'), { code: 'E_MANIFEST_EXPIRED' })), Math.max(1, capture.createdAt + HANDSHAKE_MS - Date.now()));
    const cancelled = () => stop(Object.assign(new Error('Registration stopped; resume the preserved capture.'), { code: 'E_MANIFEST_STOPPED' }));
    process.once('SIGINT', cancelled); process.once('SIGTERM', cancelled);
    try { const { result, error } = await completed; if (error) throw error; return result; }
    finally { clearTimeout(timeout); process.off('SIGINT', cancelled); process.off('SIGTERM', cancelled); }
  } finally { await new Promise(resolveClose => { server.close(resolveClose); server.closeAllConnections(); }); }
}

/** Creates the empty encrypted checkpoint before browser input; binds only IPv4 loopback. */
export async function registerManifest(options) {
  await checkManifest(options);
  return locked(options, async () => {
    const seal = await protector(options);
    const capture = { format: FORMAT, id: randomBytes(16).toString('hex'), stateToken: randomBytes(32).toString('hex'), stage: 'prepared', createdAt: Date.now(), selection: registrationSelection(options), sealKeyRecoveryRef: options.sealKeyRecoveryRef };
    await save(options, capture, seal, true);
    return serve(options, capture, seal);
  });
}
/** Reopens a retained response without another conversion; only an unattempted callback can convert. */
export async function resumeManifest(options) {
  return locked(options, async () => {
    const { capture, seal } = await load(options);
    if (capture.stage !== 'prepared') return convert(options, capture, seal);
    if (expired(capture)) fail('Handshake expired. Reconcile any existing App before a new registration.', 'E_MANIFEST_EXPIRED');
    return serve(options, capture, seal);
  });
}
/** Read-only safe status. The protected capture must exist and open; a receipt alone proves nothing. */
export async function manifestStatus(options) { return safeReceipt((await load(options)).capture); }

/** Loads five matched inputs in memory and uses the existing undeployed-version installer. */
export async function installManifest(options) {
  return locked(options, async () => {
    const { capture } = await load(options);
    if (capture.stage !== 'ready') fail('Resume must establish a usable captured response before installation.');
    const { identity } = identityAndInputs(capture);
    let config;
    try { const errors = []; config = parse(await readFile(options.config, 'utf8'), errors); if (errors.length) throw new Error(); } catch { fail('Installation requires a readable exact target config.'); }
    if (config.vars?.APP_ORIGIN) {
      if (`${config.vars.APP_ORIGIN}/webhooks/github` !== capture.selection.webhookUrl || `${config.vars.APP_ORIGIN}/auth/callback` !== capture.selection.oauthCallbackUrl || config.vars.GITHUB_APP_BOT_LOGIN !== identity.botLogin) fail('Captured webhook/OAuth/bot identity does not match the selected App configuration.', 'E_MANIFEST_TARGET');
    }
    if (capture.selection.mode === 'fixture' && !options.fixtureWrangler) fail('Synthetic capture requires an explicit synthetic native provider.');
    if (capture.selection.mode === 'provider' && options.fixtureWrangler) fail('Provider capture cannot install through a synthetic provider.');
    if (!options.installReceiptPath || [options.capturePath, options.receiptPath, options.sealKeyPath, options.wirtSigningKeyPath, options.sealKeyPreviousReceiptPath].filter(Boolean).some(path => resolve(path) === resolve(options.installReceiptPath))) fail('Use a separate new installation receipt.');
    return installCredentials({ config: options.config, accountId: options.accountId, worker: options.worker, appId: identity.appId, baseVersionId: options.baseVersionId, artifactPath: options.artifactPath, artifactSha256: options.artifactSha256,
      ...(config.vars?.APP_ORIGIN ? { oauthClientId: identity.oauthClientId, sealKeyPath: options.sealKeyPath, sealKeyEnv: options.sealKeyEnv, sealKeyRecoveryRef: options.sealKeyRecoveryRef, sealKeyInitial: options.sealKeyInitial, sealKeyPreviousReceiptPath: options.sealKeyPreviousReceiptPath, wirtSigningKeyPath: options.wirtSigningKeyPath, wirtSigningKeyEnv: options.wirtSigningKeyEnv } : {}),
      readGitHubInputs: async () => identityAndInputs((await load(options)).capture).values, receiptPath: options.installReceiptPath,
      ...(capture.selection.mode === 'fixture' ? { fixture: true, fixtureWrangler: options.fixtureWrangler } : {}) });
  });
}

const NAMES = { 'capture-file': 'capturePath', 'receipt-file': 'receiptPath', 'seal-key-file': 'sealKeyPath', 'seal-key-env': 'sealKeyEnv', 'seal-key-recovery-ref': 'sealKeyRecoveryRef', 'seal-key-initial': 'sealKeyInitial', 'seal-key-previous-receipt': 'sealKeyPreviousReceiptPath', 'base-version-id': 'baseVersionId', 'artifact-file': 'artifactPath', 'artifact-sha256': 'artifactSha256', 'owner': 'owner', 'owner-type': 'ownerType', 'visibility': 'visibility', 'app-name': 'appName', 'webhook-url': 'webhookUrl', 'oauth-callback-url': 'oauthCallbackUrl', 'port': 'port', 'fixture-provider': 'fixtureOrigin', 'config': 'config', 'worker': 'worker', 'account-id': 'accountId', 'install-receipt-file': 'installReceiptPath', 'wirt-signing-key-file': 'wirtSigningKeyPath', 'wirt-signing-key-env': 'wirtSigningKeyEnv', 'fixture-wrangler': 'fixtureWrangler' };
const FLAGS = new Set(['policy-refresh', 'seal-key-initial']);
export async function main(argv = process.argv.slice(2)) {
  const [command, ...args] = argv;
  if (command === '--help') {
    const entry = process.platform === 'win32'
      ? 'pwsh -NoProfile -NonInteractive -File apps/github-app/operator-launch.ps1 manifest'
      : 'bash -p apps/github-app/operator-launch.sh manifest';
    process.stdout.write(`Usage: ${entry} check|register|resume|status|install --capture-file <encrypted-file> --receipt-file <non-secret-file> (--seal-key-file <retained-file> | --seal-key-env <explicit-name>) --seal-key-recovery-ref <custody-id>
Registration: --owner <login> --owner-type personal|organisation --visibility public|private --app-name <name> --webhook-url <https-url> [--oauth-callback-url <https-url>] [--policy-refresh] [--port <loopback-port>]
Install: --config <exact-config> --account-id <id> --install-receipt-file <new-receipt> --artifact-file <qualified-artifact> --artifact-sha256 <qualified-64-hex-digest> [--worker <matching-name>]; joined App: --base-version-id <continuity-base> (--seal-key-initial | --seal-key-previous-receipt <previous-successful-receipt>); Wirt: (--wirt-signing-key-file <retained-file> | --wirt-signing-key-env <explicit-name>)
The clean entry must run before Node starts. Direct library callers need an already-clean runtime. The artifact supplies the complete modules/settings/assets for one undeployed version; installation never patches latest.
See docs/integration/app-staging.md for the capture, interruption and separate installation handoff. No command deploys or opens a browser.\n`);
    return;
  }
  const options = {};
  for (let index = 0; index < args.length; index++) {
    const name = args[index].replace(/^--/u, '');
    const key = name === 'policy-refresh' ? 'policyRefresh' : NAMES[name];
    if (!args[index].startsWith('--') || !key || Object.hasOwn(options, key)) fail('Unknown or repeated named option.');
    options[key] = FLAGS.has(name) ? true : args[++index];
    if (options[key] === undefined || String(options[key]).startsWith('--')) fail('A named option is missing its value.');
  }
  const actions = { check: checkManifest, register: registerManifest, resume: resumeManifest, status: manifestStatus, install: installManifest };
  if (!Object.hasOwn(actions, command)) fail('Choose check, register, resume, status or install; use --help for invocation.');
  options.onListening = localUrl => process.stdout.write(`${JSON.stringify({ state: 'listening', localUrl, providerWrite: 'not-attempted' })}\n`);
  process.stdout.write(`${JSON.stringify(await actions[command](options), null, 2)}\n`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { process.stderr.write(`${/^E_MANIFEST_/u.test(error.code ?? '') ? error.message : 'Manifest handoff failed; protected contents and provider details are withheld. Retain the capture and installation receipt.'}\n`); process.exitCode = 2; });
}
