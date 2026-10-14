// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * The built App's native Manage form, in isolated Chromium against disposable D1 and GitHub/Works wire doubles.
 * Run after app:build (or app:build:staging with DIFFDEVIL_APP_TARGET=staging). No live account or provider is reached.
 */
import assert from 'node:assert/strict';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { unstable_getMiniflareWorkerOptions } from 'wrangler';
import { appBuildTarget } from '../build-target.mjs';
import { D1AppStore } from '../../github-app/storage.mjs';
import { migrationNames } from './seed.mjs';
import { createFakeGitHub, CODE, USER } from './fixture.mjs';

const target = appBuildTarget();
const APP = target.origin;
const WORKS = target.name === 'staging' ? 'https://wirt-test.wolfsblvt.app' : 'https://works.example.test';
const CALLBACK = `${APP}/integrations/wirt/link/callback`;
const KEY = 'fixture-works-signing-material-at-least-32-bytes';
const OUT = join(target.artifacts, 'qa', 'works-entry');
const hash = body => createHash('sha256').update(body).digest('hex');
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const github = createFakeGitHub();
const intents = new Map(), calls = [];
let failure = null;
const link = randomUUID();
const projection = {
  schema: 'wirt.benefit-projection/v1', client: 'diffdevil',
  stream: { works_account: '77', link: { id: link, product_account: { github_user_id: USER.id } } },
  account_lineage: [], order: { epoch: 1, version: 1 }, generated_at: new Date().toISOString(), source_operation: null,
  commercial: { standing: 'funded', tier: 'pro', cadence: 'monthly', period: { started_on: '2026-10-01', ends_on: '2026-11-01' },
    renewal_preference: 'automatic', cancellation_intent: 'none', grace: null, ended: null,
    next_renewal: { on: '2026-11-01', total_cents: 900, currency: 'EUR', tax_inclusive: true } },
  benefits: { organisation_capacity: [], grants: [], protection: null }, pending: [], bindings_seen: []
};

/** Independent byte/signature and PKCE checks at the actual outgoing consumer boundary. */
async function outbound(request) {
  const url = new URL(request.url), body = await request.text();
  calls.push({ origin: url.origin, path: url.pathname, method: request.method });
  if (url.hostname === 'github.invalid') return github.fetch(request.url, { method: request.method, headers: request.headers, ...(body ? { body } : {}) });
  assert.equal(url.origin, WORKS, 'no unadmitted outbound provider');
  if (url.pathname !== '/api/oauth/token') {
    const header = name => request.headers.get(name);
    const expected = createHmac('sha256', KEY).update(['wirt-http/v1', 'diffdevil', request.method, url.pathname,
      header('x-wirt-product-account'), header('x-wirt-time'), header('x-wirt-nonce'), hash(body)].join('\n')).digest('hex');
    assert.equal(header('x-wirt-signature'), expected);
    assert.match(header('x-wirt-nonce'), /^[0-9a-f-]{36}$/u);
  }
  if (url.pathname === '/api/wirt/diffdevil/link-intents') {
    assert.equal(request.method, 'POST');
    if (failure === 'unavailable') return json({ error: 'unavailable' }, 503);
    const input = JSON.parse(body), id = randomUUID();
    assert.equal(input.product_account, USER.id);
    assert.match(input.state, /^[A-Za-z0-9_-]{43}$/u);
    assert.match(input.challenge, /^[A-Za-z0-9_-]{43}$/u);
    intents.set(id, input);
    return json({ intent: id, authorization_url: `${failure === 'foreign' ? 'https://unadmitted.example.test' : WORKS}/wirt/products/diffdevil/link/${id}` }, 201);
  }
  if (url.pathname === '/api/oauth/token') {
    const form = new URLSearchParams(body), input = intents.get(form.get('code'));
    assert.ok(input);
    assert.equal(form.get('client_id'), 'fixture-works-client');
    assert.equal(form.get('redirect_uri'), CALLBACK);
    assert.equal(createHash('sha256').update(form.get('code_verifier')).digest('base64url'), input.challenge);
    return json({ access_token: 'fixture-works-access', refresh_token: 'fixture-works-refresh', expires_in: 3600 });
  }
  if (url.pathname === '/api/wirt/diffdevil/links') {
    assert.equal(request.headers.get('authorization'), 'Bearer fixture-works-access');
    const input = JSON.parse(body);
    assert.ok(intents.has(input.intent));
    if (failure === 'pending') return json({ error: 'not confirmed' }, 503);
    return json({ stream: projection.stream }, 201);
  }
  if (url.pathname.endsWith('/projection')) return json(projection);
  throw new Error(`Unexpected Works fixture path: ${url.pathname}`);
}

const built = unstable_getMiniflareWorkerOptions(join(target.artifacts, 'dist/server/wrangler.json'));
const workerOptions = { ...built.workerOptions };
// Miniflare 5 takes an explicit module manifest; these are only the App build's emitted ESM chunks.
delete workerOptions.modulesRules;
const modulesRoot = resolve(target.artifacts, 'dist/server');
const chunks = (await readdir(modulesRoot, { recursive: true })).filter(path => path.endsWith('.mjs') && path !== 'entry.mjs');
const modules = ['entry.mjs', ...chunks].map(path => ({ type: 'ESModule', path: join(modulesRoot, path) }));
const local = new Miniflare(convertV4MiniflareOptions({ ...workerOptions, name: 'works-entry', modules, modulesRoot,
  d1Databases: { APP_DB: randomUUID() }, outboundService: outbound,
  bindings: { ...built.workerOptions.bindings, APP_ORIGIN: APP, APP_SEAL_KEY: 'fixture-seal-key-with-enough-length',
    GITHUB_OAUTH_CLIENT_ID: 'fixture-client', GITHUB_OAUTH_CLIENT_SECRET: 'fixture-secret-private',
    GITHUB_API_BASE: 'http://github.invalid', GITHUB_OAUTH_BASE: 'http://github.invalid',
    WIRT_ORIGIN: WORKS, WIRT_OAUTH_CLIENT_ID: 'fixture-works-client', WIRT_LINK_CALLBACK_URL: CALLBACK,
    WIRT_LINK_CONTINUATION_URL: `${APP}/manage/plan`, WIRT_SIGNING_KEY_CURRENT: KEY }
}));
let browser;
const results = [], violations = [], transportErrors = [], nativeResponses = [];
const check = (name, condition) => { assert.ok(condition, name); results.push(name); console.log(`✓ ${name}`); };
try {
  const database = await local.getD1Database('APP_DB');
  const store = new D1AppStore(database);
  for (const name of await migrationNames()) await store.migrate(await readFile(resolve('apps/github-app/migrations', name), 'utf8'));
  await mkdir(OUT, { recursive: true });
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(10_000);
  // CDP intercepts every redirect hop. Playwright routing alone handles only the initial request of a redirect chain.
  const wire = await context.newCDPSession(page);
  wire.on('Fetch.requestPaused', async ({ requestId, request }) => {
    const url = new URL(request.url);
    const fulfill = async answer => wire.send('Fetch.fulfillRequest', { requestId, responseCode: answer.status,
      responseHeaders: [...answer.headers].map(([name, value]) => ({ name, value })), body: Buffer.from(await answer.arrayBuffer()).toString('base64') });
    try {
      if (url.origin === APP) {
        const answer = await local.dispatchFetch(request.url, { method: request.method, headers: request.headers, body: request.postData, redirect: 'manual' });
        if (url.pathname === '/manage/do') nativeResponses.push({ status: answer.status, location: answer.headers.get('location') });
        await fulfill(answer);
        return;
      }
      if (url.origin === 'https://github.com' && url.pathname === '/login/oauth/authorize') {
        await fulfill(new Response(`<a href="${APP}/auth/callback?state=${url.searchParams.get('state')}&amp;code=${CODE}">Approve fixture GitHub sign-in</a>`, { headers: { 'content-type': 'text/html' } }));
        return;
      }
      if (url.origin === WORKS && url.pathname.startsWith('/wirt/products/diffdevil/link/')) {
        const id = url.pathname.split('/').at(-1), input = intents.get(id);
        assert.ok(input);
        if (failure === 'redirect') {
          await fulfill(new Response(null, { status: 303, headers: { location: 'https://unadmitted.example.test/collect' } }));
          return;
        }
        await fulfill(new Response(`<h1>Fixture Works consent</h1><p>Product account ${input.product_account}</p><form method="get" action="${CALLBACK}"><input name="state" type="hidden" value="${input.state}"><input name="code" type="hidden" value="${id}"><button>Approve fixture Works link</button></form><a href="${APP}/manage/plan">Return without approving</a>`, { headers: { 'content-type': 'text/html' } }));
        return;
      }
      throw new Error(`Unexpected browser destination: ${url.origin}${url.pathname}`);
    } catch (error) {
      transportErrors.push(String(error));
      console.error(String(error));
      await wire.send('Fetch.failRequest', { requestId, errorReason: 'BlockedByClient' }).catch(() => {});
    }
  });
  await wire.send('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Request' }] });
  page.on('console', message => { if (/form-action/u.test(message.text())) violations.push(message.text()); });
  await page.goto(`${APP}/sign-in`);
  await page.getByRole('link', { name: 'Continue with GitHub', exact: true }).click();
  await page.getByRole('link', { name: 'Approve fixture GitHub sign-in' }).click();
  await page.waitForURL(APP + '/');
  await page.goto(`${APP}/manage/plan`);
  const pro = page.getByRole('button', { name: 'Pro · €9 a month or €90 a year', exact: true });
  check('the built native Pro button posts link to same-origin /manage/do', await pro.evaluate(button => button.form.method === 'post' && button.form.getAttribute('action') === '/manage/do' && button.form.elements.action.value === 'link'));
  await pro.click();
  try { await page.waitForURL(`${WORKS}/wirt/products/diffdevil/link/*`, { timeout: 5000 }); }
  catch { throw new Error(`Native entry did not reach consent; stayed at ${page.url()}; POST: ${JSON.stringify(nativeResponses)}; form-action violations: ${JSON.stringify(violations)}; transport errors: ${JSON.stringify(transportErrors)}`); }
  const response = nativeResponses[0];
  check('native POST returns 303 to the exact admitted intent route', response.status === 303 && intents.has(new URL(response.location).pathname.split('/').at(-1)));
  check('configured Works consent is reached without a CSP violation', violations.length === 0);
  await page.screenshot({ path: join(OUT, 'native-works-consent.png'), fullPage: true });
  await page.getByRole('link', { name: 'Return without approving' }).click();
  check('an unapproved return stays open without claiming the Works step occurred', await page.locator('[data-link-standing="open"]').count() === 1 && await page.locator('.m-return .m-steps3').count() === 0 && intents.size === 1);
  // A contained storage-read refusal proves the existing unavailable presentation without losing the disposable attempt.
  await database.prepare('ALTER TABLE commercial_link_attempts RENAME TO commercial_link_attempts_unavailable').run();
  try {
    await page.reload();
    check('unavailable attempt evidence shows the existing refusal rather than progress', (await page.locator('body').innerText()).includes('Works could not be read right now') && await page.locator('.m-return.wait').count() === 0 && intents.size === 1);
    await page.screenshot({ path: join(OUT, 'native-works-read-unavailable.png'), fullPage: true });
  } finally { await database.prepare('ALTER TABLE commercial_link_attempts_unavailable RENAME TO commercial_link_attempts').run(); }
  await database.prepare('UPDATE commercial_link_attempts SET expires_at=?').bind(new Date(Date.now() - 1000).toISOString()).run();
  await page.reload();
  check('the expired unconsumed attempt shows the existing expiry message and explicit retry', await page.locator('[data-link-standing="expired"]').count() === 1 && (await page.locator('body').innerText()).includes('The link attempt expired before it finished') && await page.getByRole('button', { name: 'Try again', exact: true }).count() === 1 && intents.size === 1);
  await page.screenshot({ path: join(OUT, 'native-works-expired.png'), fullPage: true });
  await database.prepare('UPDATE works_departures SET snapshot_json=NULL').run();
  await page.reload();
  check('the pre-repair departure also reads the actual expired attempt', await page.locator('[data-link-standing="expired"]').count() === 1 && intents.size === 1);
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await page.waitForURL(`${WORKS}/wirt/products/diffdevil/link/*`);
  const approvedIntent = new URL(page.url()).pathname.split('/').at(-1);
  failure = 'pending';
  await page.getByRole('button', { name: 'Approve fixture Works link' }).click();
  await page.waitForURL(url => url.origin === APP && url.searchParams.get('works-link') === 'pending');
  check('approved but unestablished remains pending and offers the same-link continuation', await page.locator('[data-link-standing="pending"]').count() === 1 && (await page.locator('body').innerText()).includes('continues the same link instead of starting over'));
  const pendingReturn = await page.evaluate(() => ({ headline: document.querySelector('.m-return[data-link-standing="pending"] b')?.textContent ?? '', text: document.querySelector('.m-return[data-link-standing="pending"]')?.textContent ?? '', waiting: Boolean(document.querySelector('.m-return.wait')) }));
  check('the server-owned unfinished return stays neutral, uncharged and retryable', /didn't finish/u.test(pendingReturn.headline) && /Nothing was charged/u.test(pendingReturn.text) && !pendingReturn.wait && await page.getByRole('button', { name: 'Try again', exact: true }).count() === 1);
  const intentCount = intents.size;
  failure = null;
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await page.waitForURL(url => url.origin === APP && url.searchParams.get('m') === 'linked');
  check('explicit recovery uses the retained approved intent without another consent', intents.size === intentCount);
  const establishmentCount = calls.filter(call => call.path === '/api/wirt/diffdevil/links').length;
  await page.goto(`${CALLBACK}?state=${intents.get(approvedIntent).state}&code=${approvedIntent}`);
  await page.waitForURL(url => url.origin === APP && url.pathname === '/manage/plan' && url.searchParams.get('works-link') === 'invalid');
  check('a spent callback keeps the finished link visible and performs no second establishment', await page.locator('.m-return.done').count() === 1 && calls.filter(call => call.path === '/api/wirt/diffdevil/links').length === establishmentCount);
  check('state/browser binding and PKCE complete the native callback', await page.locator('body').innerText().then(text => text.includes('Linked to Wolfsblvt Works')));
  const applied = await database.prepare('SELECT product_account, applied_version, applied_result FROM commercial_links WHERE link_id = ?').bind(link).first();
  assert.deepEqual(applied, { product_account: USER.id, applied_version: 1, applied_result: 'applied' });
  const queued = await database.prepare('SELECT body, state FROM commercial_reports WHERE link_id = ?').bind(link).all();
  check('the applied projection and durable queued report belong to the same numeric product account', queued.results.length > 0 && queued.results.every(row => {
    const report = JSON.parse(row.body);
    return row.state === 'pending' && report.stream.link.id === link && report.stream.link.product_account.github_user_id === USER.id && report.applied.result === 'applied';
  }));
  await page.screenshot({ path: join(OUT, 'native-works-linked.png'), fullPage: true });

  // A new isolated product session/account is unnecessary: remove only the disposable fixture link between refusal cases.
  await database.prepare('DELETE FROM commercial_links').run();
  await database.prepare('DELETE FROM works_departures').run();
  for (const kind of ['unavailable', 'foreign']) {
    failure = kind;
    await page.goto(`${APP}/manage/plan`);
    const before = (await database.prepare('SELECT count(*) AS n FROM commercial_link_attempts').first()).n;
    await page.getByRole('button', { name: 'Pro · €9 a month or €90 a year', exact: true }).click();
    await page.waitForURL(url => url.origin === APP && url.searchParams.get('m') === 'commercial-unavailable');
    check(`${kind} Works answer returns a visible refusal with no local attempt`,
      (await page.locator('body').innerText()).includes('Works is not reachable') && (await database.prepare('SELECT count(*) AS n FROM commercial_link_attempts').first()).n === before);
  }
  await page.screenshot({ path: join(OUT, 'native-works-unavailable.png'), fullPage: true });

  // The admitted Works hop must not open the rest of the form redirect chain to unadmitted destinations.
  failure = 'redirect';
  await page.goto(`${APP}/manage/plan`);
  const requests = [];
  page.on('request', request => requests.push(request.url()));
  const refused = page.waitForEvent('console', { predicate: message => /form-action/u.test(message.text()) });
  await pro.click({ noWaitAfter: true });
  await refused;
  check('an unadmitted continuation after the Works hop stays blocked by CSP', violations.length > 0 && new URL(page.url()).origin === APP && !requests.some(url => url.startsWith('https://unadmitted.example.test')));
  check('all browser and backend provider traffic stays in the doubles', transportErrors.length === 0 && calls.every(call => ['http://github.invalid', WORKS].includes(call.origin)));
  await writeFile(join(OUT, 'results.json'), JSON.stringify({ target: target.name, build: built.main, browser: browser.version(), viewport: '1440x900', results, violations, calls }, null, 2));
} finally {
  await browser?.close();
  await local.dispose();
}
