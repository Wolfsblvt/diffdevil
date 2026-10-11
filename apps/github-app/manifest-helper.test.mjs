// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { request } from 'node:http';
import { test } from 'node:test';
import { checkManifest, manifestStatus, resumeManifest } from './manifest-helper.mjs';
import { createProtector } from '../app/src/lib/protector.mjs';
import { createProcessRunner, resumeCredentials } from './operator-helper.mjs';
import { manifestFixture, manifestCli, includesSecrets, nativeState } from './fixtures/manifest-provider.mjs';

async function capture(setup, { badState = false } = {}) {
  const process = manifestCli('register', setup.options);
  const url = await process.listening;
  const html = await (await fetch(url)).text();
  const encodedAction = html.match(/action="([^"]+)"/u)[1].replaceAll('&amp;', '&');
  const action = new URL(encodedAction);
  const callback = new URL(`http://127.0.0.1:${setup.options.port}/callback`);
  callback.searchParams.set('code', 'synthetic-one-use-code');
  callback.searchParams.set('state', badState ? 'wrong-state' : action.searchParams.get('state'));
  return { process, callback, html };
}
async function cleanup(setup, running) {
  if (running && running.child.exitCode === null) { running.child.kill(); await running.completed; }
  await setup.close(); await rm(setup.directory, { recursive: true, force: true });
}

test('contents-aware preflight refuses existing/unusable outputs before registration and retains selection', async () => {
  const setup = await manifestFixture({ ownerType: 'organisation', visibility: 'private' });
  try {
    const result = await checkManifest(setup.options);
    assert.equal(result.ownerType, 'organisation'); assert.equal(result.visibility, 'private'); assert.equal(result.conversion, 'not-attempted');
    await writeFile(setup.options.capturePath, 'valuable-existing-capture');
    await assert.rejects(checkManifest(setup.options), { code: 'E_MANIFEST_INPUT' });
    assert.equal(await readFile(setup.options.capturePath, 'utf8'), 'valuable-existing-capture');
    assert.equal(setup.state.conversions, 0);
  } finally { await cleanup(setup); }
});

test('state and Host refusal leave conversion unattempted; the matching callback captures all five inputs privately', { timeout: 30000 }, async () => {
  const setup = await manifestFixture(); let running;
  try {
    const route = await capture(setup); running = route.process;
    const wrong = new URL(route.callback); wrong.searchParams.set('state', 'other-state');
    assert.equal((await fetch(wrong)).status, 403);
    // Node fetch normalizes Host; use the actual HTTP seam to send a foreign authority.
    const foreignHost = await new Promise(resolveStatus => {
      const req = request(route.callback, { headers: { Host: 'attacker.invalid' } }, response => { response.resume(); resolveStatus(response.statusCode); }); req.end();
    });
    assert.equal(foreignHost, 403);
    assert.equal(setup.state.conversions, 0);
    const response = await fetch(route.callback);
    assert.equal(response.status, 200); assert.match(await response.text(), /GitHub inputs captured/u);
    assert.equal(response.url.endsWith('/result'), true);
    const result = await running.completed;
    assert.equal(result.code, 0); assert.equal(includesSecrets(result.output + result.errors, setup), false);
    assert.equal(setup.state.conversions, 1);
    const status = await manifestStatus(setup.options);
    assert.equal(status.state, 'ready'); assert.equal(status.identity.oauthClientId, 'Iv1.fixture-client');
    const disk = await readFile(setup.options.capturePath, 'utf8');
    assert.equal(includesSecrets(disk + await readFile(setup.options.receiptPath, 'utf8'), setup), false);
    const resumed = await resumeManifest(setup.options);
    assert.equal(resumed.state, 'ready'); assert.equal(setup.state.conversions, 1);
  } finally { await cleanup(setup, running); }
});

test('captured raw response survives a late receipt failure and resumes without repeating conversion', { timeout: 30000 }, async () => {
  const setup = await manifestFixture(); let running;
  try {
    setup.state.beforeResponse = async () => { await rm(setup.options.receiptPath); await mkdir(setup.options.receiptPath); };
    const route = await capture(setup); running = route.process;
    assert.equal((await fetch(route.callback)).status, 409);
    assert.equal((await running.completed).code, 2);
    const protectedState = await createProtector({ secret: setup.seal }).open(await readFile(setup.options.capturePath, 'utf8'));
    assert.equal(protectedState.stage, 'captured');
    assert.equal(typeof protectedState.response.body, 'string');
    await rm(setup.options.receiptPath, { recursive: true });
    assert.equal((await resumeManifest(setup.options)).state, 'ready');
    assert.equal(setup.state.conversions, 1);
  } finally { await cleanup(setup, running); }
});

test('lost conversion response is durable unknown and cannot repeat the one-use conversion', { timeout: 30000 }, async () => {
  const setup = await manifestFixture(); let running;
  try {
    setup.state.failConversion = true;
    const route = await capture(setup); running = route.process;
    assert.equal((await fetch(route.callback)).status, 409);
    const result = await running.completed;
    assert.equal(result.code, 2); assert.equal(includesSecrets(result.output + result.errors, setup), false);
    assert.equal((await manifestStatus(setup.options)).state, 'conversion-attempted');
    await assert.rejects(resumeManifest(setup.options), { code: 'E_MANIFEST_UNKNOWN' });
    assert.equal(setup.state.conversions, 1);
  } finally { await cleanup(setup, running); }
});

test('wrong namespace is preserved as captured and refuses installation; an absent capture cannot resume from a receipt', { timeout: 30000 }, async () => {
  const setup = await manifestFixture(); let running;
  try {
    setup.body.owner.login = 'different-owner';
    const route = await capture(setup); running = route.process;
    assert.equal((await fetch(route.callback)).status, 409);
    assert.equal((await running.completed).code, 2);
    assert.equal((await manifestStatus(setup.options)).state, 'captured');
    await assert.rejects(resumeManifest(setup.options), { code: 'E_MANIFEST_IDENTITY' });
    await rm(setup.options.capturePath);
    await assert.rejects(manifestStatus(setup.options), { code: 'E_MANIFEST_CAPTURE' });
    assert.equal(setup.state.conversions, 1);
  } finally { await cleanup(setup, running); }
});

for (const [joined, wirt, name] of [[true, false, 'Community six'], [false, false, 'standalone three'], [true, true, 'Wirt seven']]) test(`encrypted handoff delivers matching ${name} inputs through the real native installer`, { timeout: 30000 }, async () => {
  const setup = await manifestFixture({ joined, wirt }); let running;
  try {
    const route = await capture(setup); running = route.process;
    await fetch(route.callback); assert.equal((await running.completed).code, 0);
    const options = { ...setup.options, config: setup.config, accountId: 'account-1', installReceiptPath: join(setup.directory, 'receipt.json'), fixtureWrangler: 'apps/github-app/fixtures/operator-provider.mjs', wirtSigningKeyPath: setup.wirtSigningKeyPath };
    const result = await manifestCli('install', options).completed;
    assert.equal(result.code, 0); assert.equal(includesSecrets(result.output + result.errors, setup), false);
    assert.equal(JSON.parse(result.output).state, 'version-created');
    const native = await nativeState(setup);
    assert.equal(native.writes, 1); assert.equal(native.deliveryHash, createHash('sha256').update(JSON.stringify(setup.values)).digest('hex'));
    assert.equal(setup.state.conversions, 1);
    // Repeating install must refuse the existing installation receipt before a second write.
    assert.equal((await manifestCli('install', options).completed).code, 2);
    assert.equal((await nativeState(setup)).writes, 1);
  } finally { await cleanup(setup, running); }
});

test('unsafe native positive control emits synthetic secrets on both streams; the helper containment test can detect them', { timeout: 30000 }, async () => {
  const setup = await manifestFixture();
  try {
    const child = spawn(process.execPath, ['apps/github-app/manifest-convert.mjs'], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    let output = '', errors = '';
    child.stdout.on('data', chunk => { output += chunk; }); child.stderr.on('data', chunk => { errors += chunk; });
    const done = once(child, 'close');
    child.stdin.end(JSON.stringify({ code: 'synthetic-one-use-code', fixtureOrigin: setup.options.fixtureOrigin }));
    assert.equal((await done)[0], 0);
    assert.equal(includesSecrets(output, setup), true); assert.equal(includesSecrets(errors, setup), true);
  } finally { await cleanup(setup); }
});

test('a mismatched App target refuses before upload and an interrupted installation resumes without the capture or another write', { timeout: 30000 }, async () => {
  const setup = await manifestFixture(); let running;
  try {
    const route = await capture(setup); running = route.process;
    await fetch(route.callback); assert.equal((await running.completed).code, 0);
    const config = JSON.parse(await readFile(setup.config, 'utf8'));
    config.vars.GITHUB_APP_BOT_LOGIN = 'other-app[bot]';
    await writeFile(setup.config, JSON.stringify(config));
    const options = { ...setup.options, config: setup.config, accountId: 'account-1', installReceiptPath: join(setup.directory, 'receipt.json'), fixtureWrangler: 'apps/github-app/fixtures/operator-provider.mjs' };
    const refused = await manifestCli('install', options).completed;
    assert.equal(refused.code, 2);
    assert.equal(includesSecrets(refused.output + refused.errors, setup), false);
    await assert.rejects(readFile(join(setup.directory, 'fixture-state.json')), { code: 'ENOENT' });
    config.vars.GITHUB_APP_BOT_LOGIN = 'diffdevil-synthetic[bot]';
    await writeFile(setup.config, JSON.stringify(config));
    await writeFile(join(setup.directory, 'fixture-options.json'), JSON.stringify({ omitReadback: true }));
    const incomplete = await manifestCli('install', options).completed;
    assert.equal(incomplete.code, 2); assert.equal(includesSecrets(incomplete.output + incomplete.errors, setup), false);
    assert.equal((await nativeState(setup)).writes, 1);
    await rm(setup.options.capturePath); await rm(setup.options.sealKeyPath);
    await writeFile(join(setup.directory, 'fixture-options.json'), '{}');
    // The fixture-labelled receipt must recover through the fixture-labelled source seam.
    // The ordinary CLI's provider-mode refusal of such a receipt is deliberate containment.
    const resumed = await resumeCredentials({ config: setup.config, accountId: 'account-1', receiptPath: options.installReceiptPath, wrangler: options.fixtureWrangler, fixture: true, runner: createProcessRunner() });
    assert.equal(resumed.state, 'version-created');
    assert.equal(includesSecrets(JSON.stringify(resumed), setup), false); assert.equal((await nativeState(setup)).writes, 1);
  } finally { await cleanup(setup, running); }
});
