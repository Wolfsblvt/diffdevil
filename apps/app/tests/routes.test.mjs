// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createAppRuntime } from '../src/lib/runtime.mjs';
import { securityHeaders, pageHeaders } from '../src/lib/routes.mjs';
import { returnOutcome, presentProjection } from '../src/lib/manage/works.mjs';
import { commercialStatus } from '../src/lib/manage/model.mjs';
import { handleManageAction } from '../src/lib/manage/actions.mjs';

test('Works initiation refuses a foreign Origin before creating any attempt or continuation', async () => {
  let starts = 0;
  const runtime = { config: { allowedOrigins: ['https://app.example.test'] }, commercial: { beginLink() { starts++; } } };
  const response = await handleManageAction(new Request('https://app.example.test/manage/do', { method: 'POST',
    headers: { origin: 'https://unadmitted.example.test' }, body: new URLSearchParams({ action: 'link' }) }),
  { runtime, session: {}, viewer: {} });
  assert.equal(response.status, 403);
  assert.equal(starts, 0);
  assert.doesNotMatch(await response.text(), /http-equiv|href=/u);
});

test('document form policy admits only the successfully configured Works origin, keeping every other protection', () => {
  // Composition validates configuration without reading the database or contacting a provider.
  const compose = (extra = {}) => createAppRuntime({ APP_DB: {}, APP_ORIGIN: 'https://app.example.test',
    APP_SEAL_KEY: 'fixture-seal-key-with-enough-length', GITHUB_OAUTH_CLIENT_ID: 'fixture-client',
    GITHUB_OAUTH_CLIENT_SECRET: 'fixture-secret-private', ...extra });
  const works = 'https://works.example.test';
  const env = { WIRT_ORIGIN: works, WIRT_SIGNING_KEY_CURRENT: 'fixture-signing-material-at-least-32-bytes',
    WIRT_OAUTH_CLIENT_ID: 'fixture-works-client', WIRT_LINK_CALLBACK_URL: 'https://app.example.test/integrations/wirt/link/callback' };
  const policy = app => securityHeaders(app)['content-security-policy'];
  const destinations = app => /form-action ([^;]+)/u.exec(policy(app))[1];
  const configured = compose(env);
  assert.equal(configured.config.worksOrigin, works);
  assert.equal(destinations(configured), `'self' https://github.com ${works}`);
  assert.equal(pageHeaders(configured)['content-security-policy'], policy(configured));
  assert.equal(new Headers(pageHeaders(configured)).get('cache-control'), 'private, no-store');
  assert.equal(policy(configured).replace(` ${works}`, ''), policy(compose()));
  for (const invalid of ['https://works.example.test/path', 'https://works.example.test/', 'https://works.example.test; form-action *', 'https://works.example.test;script-src', 'https://*.example.test', 'https://works.example.test,other', "https://works.example.test'other", 'https://works.example.test"other', 'https://user:pass@works.example.test', 'http://works.example.test', 'not a URL']) {
    const app = compose({ ...env, WIRT_ORIGIN: invalid });
    assert.equal(app.commercialSource, 'none');
    assert.equal(app.config.worksOrigin, null);
    assert.equal(destinations(app), "'self' https://github.com");
  }
  for (const key of ['WIRT_SIGNING_KEY_CURRENT', 'WIRT_OAUTH_CLIENT_ID', 'WIRT_LINK_CALLBACK_URL']) {
    const app = compose({ ...env, [key]: undefined });
    assert.equal(app.config.worksOrigin, null);
    assert.equal(destinations(app), "'self' https://github.com");
  }
  const fixtureApp = compose({ APP_ORIGIN: 'http://localhost:4412', APP_COMMERCIAL_FIXTURE: JSON.stringify({ account: 123, linked: false }) });
  assert.equal(fixtureApp.commercialSource, 'fixture');
  assert.equal(destinations(fixtureApp), "'self' https://github.com", 'the local stand-in never adds an external destination');
});

test('a link departure presents observed attempt standing, while unavailable evidence and replay preserve current truth', async () => {
  const departure = { purpose: 'link', snapshot: null };
  for (const standing of ['open', 'unknown']) assert.equal(returnOutcome({ departure, status: { linked: false, linkAttempt: { standing } } }), 'link-open');
  for (const standing of ['expired', 'pending', 'failed', 'denied', 'invalid', 'conflict', 'ended']) assert.equal(returnOutcome({ departure, status: { linked: false, linkAttempt: { standing } } }), 'link-failed');
  assert.equal(returnOutcome({ departure, status: { linked: true }, outcome: 'invalid' }), 'done');
  assert.equal(returnOutcome({ departure: null, status: { linked: true }, outcome: 'invalid' }), 'done');
  assert.equal(returnOutcome({ departure: null, status: { linked: false }, outcome: 'linked' }), 'link-open', 'a callback word alone never confirms a link');
  const commercial = await commercialStatus({ session: { session: 'fixture', actor: { userId: 123 } }, runtime: { commercial: { status() { throw new Error('unavailable'); } } }, fresh: true, departure });
  assert.equal(commercial.standing, 'unavailable');
  assert.doesNotThrow(() => presentProjection(commercial.status));
  assert.equal(returnOutcome({ departure, status: commercial.status }), null, 'the existing unavailable banner replaces invented progress');
});
