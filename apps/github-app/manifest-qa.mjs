// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/** Isolated headless browser + real local CLI/native-child qualification against synthetic GitHub. */
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { manifestFixture, manifestCli, includesSecrets, nativeState } from './fixtures/manifest-provider.mjs';

const out = 'artifacts/verification/manifest';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const ownerType of ['personal', 'organisation']) for (const visibility of ['public', 'private']) {
    const wirt = ownerType === 'organisation';
    const setup = await manifestFixture({ ownerType, visibility, wirt });
    const fixtureOptionsPath = join(setup.directory, 'fixture-options.json');
    const fixtureOptions = JSON.parse(await readFile(fixtureOptionsPath, 'utf8'));
    await writeFile(fixtureOptionsPath, JSON.stringify({ ...fixtureOptions, absentEnvironmentNames: ['DIFFDEVIL_FIXTURE_SEAL', 'DIFFDEVIL_FIXTURE_WIRT'] }));
    await rm(setup.options.sealKeyPath);
    if (wirt) await rm(setup.wirtSigningKeyPath);
    setup.options = { ...setup.options, sealKeyPath: undefined, sealKeyEnv: process.platform === 'win32' ? 'diffdevil_fixture_seal' : 'DIFFDEVIL_FIXTURE_SEAL', ...(wirt ? { wirtSigningKeyEnv: 'DIFFDEVIL_FIXTURE_WIRT' } : {}), environmentValues: { DIFFDEVIL_FIXTURE_SEAL: setup.seal, ...(wirt ? { DIFFDEVIL_FIXTURE_WIRT: setup.values.WIRT_SIGNING_KEY_CURRENT } : {}) } };
    const context = await browser.newContext({ viewport: { width: 1100, height: 850 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.name));
    const running = manifestCli('register', setup.options);
    try {
      await page.goto(await running.listening);
      await page.getByRole('button', { name: 'Continue on GitHub' }).focus();
      assert.equal(await page.locator('button:focus').count(), 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      if (ownerType === 'personal' && visibility === 'public') await page.screenshot({ path: join(out, 'registration-start.png') });
      await page.keyboard.press('Enter');
      await page.getByRole('heading', { name: 'GitHub inputs captured' }).waitFor();
      assert.equal(new URL(page.url()).pathname, '/result');
      assert.equal(new URL(page.url()).search, '');
      const result = await running.completed;
      assert.equal(result.code, 0); assert.equal(includesSecrets(result.output + result.errors, setup), false);
      assert.equal(errors.length, 0); assert.equal(setup.state.conversions, 1);
      assert.equal(setup.state.posts.length, 1);
      const post = setup.state.posts[0];
      assert.equal(post.path, ownerType === 'personal' ? '/settings/apps/new' : '/organizations/fixture-owner/settings/apps/new');
      assert.equal(post.manifest.public, visibility === 'public');
      assert.equal(post.manifest.callback_urls[0], 'https://staging.example/auth/callback');
      assert.deepEqual(post.manifest.default_permissions, { contents: 'read', pull_requests: 'write', checks: 'write' });
      assert.deepEqual(post.manifest.default_events, ['pull_request', 'check_run', 'push']);
      if (ownerType === 'personal' && visibility === 'public') await page.screenshot({ path: join(out, 'registration-captured.png') });
      const installed = await manifestCli('install', { ...setup.options, config: setup.config, accountId: 'account-1', installReceiptPath: join(setup.directory, 'receipt.json'), fixtureWrangler: 'apps/github-app/fixtures/operator-provider.mjs', baseVersionId: 'version-before', sealKeyInitial: true }).completed;
      assert.equal(includesSecrets(installed.output + installed.errors, setup), false);
      assert.equal(installed.code, 0, installed.errors);
      const receipt = JSON.parse(installed.output);
      assert.equal(receipt.state, 'version-created'); assert.equal(receipt.baseVersionId, 'version-before');
      assert.equal(receipt.identity.state, 'verified'); assert.equal(receipt.sealKeyContinuity.state, 'initial');
      assert.equal(receipt.inputs.length, wirt ? 7 : 6); assert.equal((await nativeState(setup)).writes, 1);
      assert.equal(setup.state.conversions, 1);
      results.push({ ownerType, visibility, state: 'version-created', inputs: receipt.inputs.length, sealInput: 'explicit-environment', baseVersionId: receipt.baseVersionId, browser: 'isolated-headless-chromium', nativeConversion: 'contained', provider: 'synthetic' });
    } catch (error) {
      console.error(JSON.stringify({ ownerType, visibility, failure: error.name, providerPosts: setup.state.posts.length, conversions: setup.state.conversions, pageStage: new URL(page.url()).pathname.startsWith('/start/') ? 'start' : 'return' }));
      await page.screenshot({ path: join(out, 'registration-failure.png') });
      throw error;
    } finally {
      if (running.child.exitCode === null) { running.child.kill(); await running.completed; }
      await context.close(); await setup.close(); await rm(setup.directory, { recursive: true, force: true });
    }
  }
  await writeFile(join(out, 'result.json'), `${JSON.stringify({ state: 'passed', results, liveGitHub: 'unobserved', realCustody: 'unobserved' }, null, 2)}\n`);
  console.log('Manifest browser qualification passed: personal/organisation × public/private; environment-only capture and exact-base Community/Wirt installation; synthetic GitHub only.');
} finally { await browser.close(); }
