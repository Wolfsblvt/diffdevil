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
const ACCESS = 'https://access.example.test';
const authenticatedIntents = new Set();
let authenticationHops = 0;
const CALLBACK = `${APP}/integrations/wirt/link/callback`;
const KEY = 'fixture-works-signing-material-at-least-32-bytes';
const emptyCoverage = process.argv.includes('--empty-coverage');
const noJavaScript = process.argv.includes('--no-javascript');
const OUT = join(target.artifacts, 'qa', 'works-entry', ...(emptyCoverage ? ['empty-coverage'] : []), ...(noJavaScript ? ['no-javascript'] : []));
const hash = body => createHash('sha256').update(body).digest('hex');
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const github = createFakeGitHub();
const intents = new Map(), calls = [];
let failure = null;
let holdContinuation = false;
const link = randomUUID();
const projection = {
  schema: 'wirt.benefit-projection/v1', client: 'diffdevil',
  stream: { works_account: '77', link: { id: link, product_account: { github_user_id: USER.id } } },
  account_lineage: [], order: { epoch: 1, version: 1 }, generated_at: new Date().toISOString(), source_operation: null,
  commercial: emptyCoverage ? null : { standing: 'funded', tier: 'pro', cadence: 'monthly', period: { started_on: '2026-10-01', ends_on: '2026-11-01' },
    renewal_preference: 'automatic', cancellation_intent: 'none', grace: null, ended: null,
    next_renewal: { on: '2026-11-01', total_cents: 900, currency: 'EUR', tax_inclusive: true } },
  benefits: { organisation_capacity: [], grants: [], protection: null,
    ...(emptyCoverage ? { beta_grants: [], participation_rewards: [], funded_components: [] } : {}) }, pending: [], bindings_seen: []
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
    assert.equal(input.product_account_label, USER.login, 'the native form signs its authenticated GitHub handle');
    assert.match(input.state, /^[A-Za-z0-9_-]{43}$/u);
    assert.match(input.challenge, /^[A-Za-z0-9_-]{43}$/u);
    intents.set(id, input);
    return json({ intent: id, authorization_url: `${failure === 'foreign' ? 'https://unadmitted.example.test' : WORKS}/${failure === 'wrong-path' ? 'unadmitted' : 'wirt/products/diffdevil/link'}/${id}` }, 201);
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
let browser, wire, closing = false;
const inFlight = new Set();
const networkFailures = new Map();
let abortedResources = 0;
const results = [], violations = [], transportErrors = [], nativeResponses = [], planPolicies = [];
const formAction = headers => headers.get('content-security-policy')?.split(';').map(part => part.trim()).find(part => part.startsWith('form-action '));
const check = (name, condition) => { assert.ok(condition, name); results.push(name); console.log(`✓ ${name}`); };
try {
  const database = await local.getD1Database('APP_DB');
  const store = new D1AppStore(database);
  for (const name of await migrationNames()) await store.migrate(await readFile(resolve('apps/github-app/migrations', name), 'utf8'));
  await mkdir(OUT, { recursive: true });
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: !noJavaScript });
  const page = await context.newPage();
  page.setDefaultTimeout(10_000);
  // CDP intercepts every redirect hop. Playwright routing alone handles only the initial request of a redirect chain.
  wire = await context.newCDPSession(page);
  wire.on('Network.loadingFailed', event => networkFailures.set(event.requestId, event.errorText));
  await wire.send('Network.enable');
  const handlePaused = async ({ requestId, request, networkId, resourceType }) => {
    const url = new URL(request.url);
    const fulfill = async answer => wire.send('Fetch.fulfillRequest', { requestId, responseCode: answer.status,
      responseHeaders: [...answer.headers].map(([name, value]) => ({ name, value })), body: Buffer.from(await answer.arrayBuffer()).toString('base64') });
    try {
      if (url.origin === APP) {
        const answer = await local.dispatchFetch(request.url, { method: request.method, headers: request.headers, body: request.postData, redirect: 'manual' });
        if (url.pathname === '/manage/do') nativeResponses.push({ status: answer.status, method: request.method,
          action: new URLSearchParams(request.postData).get('action'), location: answer.headers.get('location'),
          body: answer.status === 200 ? await answer.clone().text() : null,
          private: answer.headers.get('cache-control') === 'private, no-store',
          bound: Boolean(answer.headers.get('set-cookie')?.includes('__Host-diffdevil-works-link')), formAction: formAction(answer.headers) });
        if (url.pathname === '/manage/plan' && answer.status === 200) planPolicies.push(formAction(answer.headers));
        if (url.pathname === '/manage/do' && answer.status === 200 && holdContinuation) {
          // Suppress only the automatic refresh to exercise the actual document's ordinary-link fallback.
          const body = (await answer.text()).replace(/<meta http-equiv="refresh"[^>]*>/u, '');
          await fulfill(new Response(body, { status: answer.status, headers: answer.headers }));
          return;
        }
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
        if (!authenticatedIntents.has(id)) {
          await fulfill(new Response(null, { status: 302, headers: { location: `${ACCESS}/login?intent=${id}` } }));
          return;
        }
        assert.equal(request.method, 'GET');
        assert.ok(!request.postData, 'the App form body is never forwarded to Works');
        await fulfill(new Response(`<h1>Fixture Works consent</h1><p>Product account ${input.product_account}</p><form method="get" action="${CALLBACK}"><input name="state" type="hidden" value="${input.state}"><input name="code" type="hidden" value="${id}"><button>Approve fixture Works link</button></form><a href="${APP}/manage/plan">Return without approving</a>`, { headers: { 'content-type': 'text/html' } }));
        return;
      }
      if (url.origin === ACCESS && url.pathname === '/login') {
        assert.equal(request.method, 'GET');
        assert.ok(!request.postData, 'the App form body is never forwarded to authentication');
        assert.ok(!request.headers.Cookie && !request.headers.cookie, 'App cookies never reach the authentication double');
        const id = url.searchParams.get('intent');
        assert.ok(intents.has(id));
        authenticatedIntents.add(id);
        authenticationHops++;
        await fulfill(new Response(null, { status: 302, headers: { location: `${WORKS}/wirt/products/diffdevil/link/${id}` } }));
        return;
      }
      throw new Error(`Unexpected browser destination: ${url.origin}${url.pathname}`);
    } catch (error) {
      if (closing) return; // Fetch.disable deliberately cancels remaining resource interceptions during teardown.
      // A new document can discard an in-flight stylesheet/image. Count only a CDP-confirmed browser abort;
      // navigation failures and any uncorroborated interception error still fail the transport check.
      if (resourceType !== 'Document' && String(error).includes('Invalid InterceptionId')
        && networkFailures.get(networkId) === 'net::ERR_ABORTED') { abortedResources++; return; }
      transportErrors.push(String(error));
      console.error(String(error));
      await wire.send('Fetch.failRequest', { requestId, errorReason: 'BlockedByClient' }).catch(() => {});
    }
  };
  wire.on('Fetch.requestPaused', event => {
    const pending = handlePaused(event).finally(() => inFlight.delete(pending));
    inFlight.add(pending);
  });
  await wire.send('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Request' }] });
  page.on('console', message => { if (/form-action/u.test(message.text())) violations.push(message.text()); });
  await page.goto(`${APP}/sign-in`);
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole('link', { name: 'Continue with GitHub', exact: true }).click();
  await page.getByRole('link', { name: 'Approve fixture GitHub sign-in' }).click();
  if (noJavaScript) {
    await page.waitForLoadState('load');
    await page.getByRole('button', { name: 'Continue to the App', exact: true }).click();
  }
  await page.waitForURL(APP + '/');
  await page.evaluate(() => document.fonts.ready);
  await page.goto(`${APP}/manage/plan`);
  await page.evaluate(() => document.fonts.ready);
  const pro = page.getByRole('button', { name: 'Pro · €9 a month or €90 a year', exact: true });
  check('the built native Pro button posts link to same-origin /manage/do', await pro.evaluate(button => button.form.method === 'post' && button.form.getAttribute('action') === '/manage/do' && button.form.elements.action.value === 'link'));
  await pro.click();
  try { await page.getByRole('heading', { name: 'Fixture Works consent' }).waitFor({ timeout: 5000 }); }
  catch { throw new Error(`Native entry did not reach consent; stayed at ${page.url()}; POST: ${JSON.stringify(nativeResponses)}; form-action violations: ${JSON.stringify(violations)}; transport errors: ${JSON.stringify(transportErrors)}`); }
  const response = nativeResponses[0];
  const continuationLink = response.body.match(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/u);
  const initialIntent = [...intents.keys()][0];
  const expectedAuthorizationUrl = `${WORKS}/wirt/products/diffdevil/link/${initialIntent}`;
  check('native POST commits a private bound document before automatically opening the admitted intent', response.status === 200
    && response.method === 'POST' && response.action === 'link' && response.location === null && response.private && response.bound
    && response.body.includes(`http-equiv="refresh" content="0;url=${expectedAuthorizationUrl}"`)
    && continuationLink?.[1] === expectedAuthorizationUrl && continuationLink[2].trim().length > 0);
  check('Works authentication redirects return to recognizable consent without a CSP violation or extra click', authenticationHops === 1 && violations.length === 0);
  await page.screenshot({ path: join(OUT, 'native-works-consent.png'), fullPage: true });
  await page.goBack();
  check('Back returns to Plan without repeating the initiation POST', new URL(page.url()).pathname === '/manage/plan' && intents.size === 1 && nativeResponses.length === 1);
  await page.goForward();
  await page.getByRole('heading', { name: 'Fixture Works consent' }).waitFor();
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
  const beforeRetry = nativeResponses.length;
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await page.getByRole('heading', { name: 'Fixture Works consent' }).waitFor();
  check('expired native retry reaches consent through authentication with one fresh intent', authenticationHops === 2 && intents.size === 2 && violations.length === 0);
  const retryResponse = nativeResponses[beforeRetry];
  const expectedPolicy = `form-action 'self' https://github.com ${WORKS}`;
  check('expired Try again really posts link and returns 303 to a fresh admitted Works intent', retryResponse.method === 'POST' && retryResponse.action === 'link'
    && retryResponse.status === 303 && new URL(retryResponse.location).origin === WORKS && intents.size === 2);
  check('both the form document and Manage response retain the exact configured Works form policy', planPolicies.at(-1) === expectedPolicy && retryResponse.formAction === expectedPolicy && violations.length === 0);
  const approvedIntent = new URL(page.url()).pathname.split('/').at(-1);
  failure = 'pending';
  await page.getByRole('button', { name: 'Approve fixture Works link' }).click();
  await page.waitForURL(url => url.origin === APP && url.searchParams.get('works-link') === 'pending');
  check('approved but unestablished remains pending and offers the same-link continuation', await page.locator('[data-link-standing="pending"]').count() === 1 && (await page.locator('body').innerText()).includes('continues the same link instead of starting over'));
  const pendingReturn = await page.evaluate(() => ({ headline: document.querySelector('.m-return[data-link-standing="pending"] b')?.textContent ?? '', text: document.querySelector('.m-return[data-link-standing="pending"]')?.textContent ?? '', waiting: Boolean(document.querySelector('.m-return.wait')) }));
  check('the server-owned unfinished return stays neutral, uncharged and retryable', /didn't finish/u.test(pendingReturn.headline) && /Nothing was charged/u.test(pendingReturn.text) && !pendingReturn.wait && await page.getByRole('button', { name: 'Try again', exact: true }).count() === 1);
  const intentCount = intents.size;
  const auditCount = async () => (await database.prepare('SELECT count(*) AS n FROM administrative_events WHERE account_id=?').bind(USER.id).first()).n;
  const pendingAuditCount = await auditCount();
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await page.waitForURL(url => url.origin === APP && url.searchParams.get('m') === 'link-pending');
  check('a still-pending retry is visible and keeps its approved intent and a safe failed-request Audit event',
    await page.locator('[data-link-standing="pending"]').count() === 1 && (await page.locator('.m-msg').innerText()).includes('continues the same link')
    && intents.size === intentCount && await auditCount() === pendingAuditCount + 1);
  const pendingEvent = await database.prepare('SELECT result, reason, detail_json FROM administrative_events WHERE account_id=? ORDER BY event_id DESC LIMIT 1').bind(USER.id).first();
  check('the pending Audit entry describes the unfinished request without provider material', pendingEvent.result === 'failed'
    && pendingEvent.reason === "The link didn't finish: Works didn't answer after you approved. Nothing was charged. Trying again continues the same link." && pendingEvent.detail_json === null);
  await page.screenshot({ path: join(OUT, 'native-works-pending.png'), fullPage: true });
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
  if (emptyCoverage) {
    const standing = page.locator('[data-standing="no-coverage"]');
    check('confirmed empty coverage renders linked Free with no invented funded plan', await standing.count() === 1
      && (await standing.innerText()).includes('Free') && (await standing.innerText()).includes('No Works-funded benefits')
      && await page.locator('[data-funds]').count() === 0 && await page.locator('[data-standing="linking"]').count() === 0);
    await page.goto(`${APP}/manage`);
    check('Manage overview names confirmed absence in information tone', (await page.locator('[data-plan-band]').innerText()).includes('No Works-funded benefits'));
    await page.screenshot({ path: join(OUT, 'native-works-empty-overview.png'), fullPage: true });
  }

  // A new isolated product session/account is unnecessary: remove only the disposable fixture link between refusal cases.
  await database.prepare('DELETE FROM commercial_links').run();
  await database.prepare('DELETE FROM works_departures').run();
  for (const kind of ['unavailable', 'foreign', 'wrong-path']) {
    failure = null;
    await page.goto(`${APP}/manage/plan`);
    await pro.click();
    await page.waitForURL(`${WORKS}/wirt/products/diffdevil/link/*`);
    await page.getByRole('link', { name: 'Return without approving' }).click();
    await database.prepare('UPDATE commercial_link_attempts SET expires_at=? WHERE consumed_at IS NULL').bind(new Date(Date.now() - 1000).toISOString()).run();
    await page.reload();
    check(`${kind} refusal starts at the real expired-attempt Try again control`, await page.locator('[data-link-standing="expired"]').count() === 1);
    failure = kind;
    const before = (await database.prepare('SELECT count(*) AS n FROM commercial_link_attempts').first()).n;
    const beforeAudit = await auditCount();
    await page.getByRole('button', { name: 'Try again', exact: true }).click();
    await page.waitForURL(url => url.origin === APP && url.searchParams.get('m') === 'commercial-unavailable');
    check(`${kind} Works answer returns a visible refusal with no new local attempt`,
      (await page.locator('body').innerText()).includes('Works is not reachable') && (await database.prepare('SELECT count(*) AS n FROM commercial_link_attempts').first()).n === before);
    const event = await database.prepare('SELECT actor_id, what, result, reason, detail_json FROM administrative_events WHERE account_id=? ORDER BY event_id DESC LIMIT 1').bind(USER.id).first();
    check(`${kind} refusal appends the safe account Audit event before answering`, await auditCount() === beforeAudit + 1 && event.actor_id === USER.id
      && event.what === 'Started the Wolfsblvt Works link' && event.result === 'failed'
      && event.reason === 'Works is not reachable from this deployment right now, so nothing was changed.' && event.detail_json === null);
    await page.screenshot({ path: join(OUT, `native-works-${kind}.png`), fullPage: true });
  }

  failure = null;
  holdContinuation = true;
  const beforeFallback = intents.size;
  await pro.click();
  const fallback = page.getByRole('link', { name: /\S/u });
  await fallback.waitFor();
  const fallbackIntent = [...intents.keys()].at(-1);
  const expectedFallbackUrl = `${WORKS}/wirt/products/diffdevil/link/${fallbackIntent}`;
  check('a suppressed automatic refresh leaves an accessible fallback to the same created intent', intents.size === beforeFallback + 1
    && await fallback.count() === 1 && await fallback.getAttribute('href') === expectedFallbackUrl);
  await page.screenshot({ path: join(OUT, 'native-works-continuation.png'), fullPage: true });
  await fallback.click();
  await page.getByRole('heading', { name: 'Fixture Works consent' }).waitFor();
  check('the fallback reaches consent through authentication without another attempt', intents.size === beforeFallback + 1);
  holdContinuation = false;

  // The form policy is unchanged: an arbitrary first external form destination remains blocked.
  await page.goto(`${APP}/manage/plan`);
  const requests = [];
  page.on('request', request => requests.push(request.url()));
  const refused = page.waitForEvent('console', { predicate: message => /form-action/u.test(message.text()) });
  await page.evaluate(() => {
    const form = document.createElement('form');
    form.method = 'post'; form.action = 'https://unadmitted.example.test/collect';
    document.body.append(form); form.submit();
  });
  await refused;
  check('an arbitrary first external form destination stays blocked by CSP', violations.length === 1 && new URL(page.url()).origin === APP && !requests.some(url => url.startsWith('https://unadmitted.example.test')));
  check('all browser and backend provider traffic stays in the doubles', transportErrors.length === 0 && calls.every(call => ['http://github.invalid', WORKS].includes(call.origin)));
<<<<<<< HEAD
  await writeFile(join(OUT, 'results.json'), JSON.stringify({ target: target.name, build: built.main, browser: browser.version(), viewport: '1440x900', javaScript: !noJavaScript, authenticationHops, abortedResources,
    results, violations, calls, planPolicies,
    nativeResponses: nativeResponses.map(({ location, ...answer }) => ({ ...answer, destination: new URL(location, APP).origin === WORKS ? 'configured-works' : 'same-app' })) }, null, 2));
} finally {
  closing = true;
  wire?.removeAllListeners('Fetch.requestPaused');
  await wire?.send('Fetch.disable').catch(() => {});
  await Promise.allSettled([...inFlight]);
  await browser?.close();
  await local.dispose();
}
