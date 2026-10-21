// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/** The built Worker and retained fixture, with the data reply held/refused independently of its document. */
export async function loadingJourney({ page, check, shot, ORIGIN, settled }) {
  const scope = '/?s=%40parser-guild&per=90d';
  let release;
  let gate = new Promise(resolve => { release = resolve; });
  let mode = 'hold';
  const requests = [];
  await page.route(`${ORIGIN}/**`, async route => {
    const request = route.request(), part = request.headers()['x-diffdevil-render'];
    if (!part) return route.continue();
    requests.push(part);
    if (part === 'page') {
      if (mode === 'hold') await gate;
      if (mode === 'fail') return route.fulfill({ status: 503, contentType: 'text/plain', body: 'Fixture analytical read unavailable' });
    }
    return route.continue();
  });
  const started = Date.now();
  const response = await page.goto(`${ORIGIN}${scope}`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-analytical-loading]').waitFor();
  const shellMs = Date.now() - started;
  check('the protected shell renders while its analytical response is held', response.status() === 200 && await page.locator('h1').innerText() === 'Overview', `${shellMs}ms`);
  check('loading contains no invented population or value', await page.locator('[data-analytical-region]').getAttribute('aria-busy') === 'true' && await page.locator('.a-hero .val').count() === 0);
  await page.getByRole('link', { name: 'History', exact: true }).first().focus();
  check('navigation remains keyboard reachable while data is held', await page.getByRole('link', { name: 'History', exact: true }).first().evaluate(node => node === document.activeElement));
  await page.locator('[data-namespace="parser-guild"]').waitFor();
  check('repository navigation resolves independently of the held population', requests.includes('navigation'));
  await shot('loading-held-overview');
  mode = 'pass'; release();
  await page.locator('[data-analytical-loading]').waitFor({ state: 'detached' });
  await settled();
  check('the held view becomes the real retained population', /merged pull requests/iu.test(await page.locator('.a-hero-l .eb').innerText()) && Number((await page.locator('.a-hero-l .val .n').innerText()).replace(/\D/gu, '')) > 0);
  await shot('loading-populated-overview');
  mode = 'fail';
  await page.goto(`${ORIGIN}/history?s=%40parser-guild&per=90d`, { waitUntil: 'domcontentloaded' });
  const retry = page.locator('[data-loading-retry]');
  await retry.waitFor({ state: 'visible' });
  check('an unavailable data response remains local, names unknowns and exposes retry', page.url().includes('/history') && /unavailable, not zero/u.test(await page.locator('[data-loading-status]').innerText()) && await page.locator('[data-nav]').count() === 1);
  await shot('loading-unavailable-history');
  mode = 'pass';
  await retry.focus(); await page.keyboard.press('Enter');
  await page.locator('[data-analytical-loading]').waitFor({ state: 'detached' });
  await settled();
  check('keyboard retry restores populated history and an intelligible focus position', await page.locator('[data-chart-id="volume"]').count() === 1 && await page.locator('#main').evaluate(node => node === document.activeElement));
  gate = new Promise(resolve => { release = resolve; }); mode = 'hold';
  await page.goto(`${ORIGIN}${scope}`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-analytical-loading]').waitFor();
  mode = 'pass';
  await page.getByRole('link', { name: '7 days', exact: true }).click();
  await page.waitForURL(url => url.searchParams.get('per') === '7d');
  release();
  await settled();
  check('a superseded delayed reply cannot replace the selected period', new URL(page.url()).searchParams.get('per') === '7d' && await page.locator('[data-period] [aria-current="true"]').innerText() === '7 days');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${ORIGIN}/prs?s=%40parser-guild&per=90d`, { waitUntil: 'networkidle' });
  await settled();
  check('reduced motion still reaches the populated PR view', await page.locator('.a-prs2 .a-pr').count() > 0);
  for (const [path, title] of [['/files?s=%40parser-guild&per=90d', 'Files'], ['/pr/parser-guild/parser-lab/452?per=90d', 'Pull request'], ['/file/parser-guild/parser-lab/' + 'a'.repeat(22) + '?s=%40parser-guild&per=90d', 'File history']]) {
    await page.goto(`${ORIGIN}${path}`, { waitUntil: 'networkidle' });
    await settled();
    check(`${title} completes the protected progressive route without invented premium results`, await page.locator('[data-analytical-loading]').count() === 0 && await page.locator('h1').count() === 1 && await page.locator('[data-nav]').count() === 1);
    if (title === 'Pull request') check('the retained file exposes its complete path independently of visual line wrapping', await page.locator('.a-tbl.named td[aria-label="src/index.ts"] .a-path').textContent() === 'src/index.ts');
  }
  const document = await page.request.get(`${ORIGIN}/?s=%40parser-guild&per=90d&render=document`);
  const documentHtml = await document.text();
  check('the complete server document remains available without client acquisition', document.status() === 200 && documentHtml.includes('data-hero-plot') && !documentHtml.includes('data-analytical-loading'));
  const internal = await page.request.get(`${ORIGIN}/render/analytical-navigation`);
  check('direct internal fragments cannot bypass middleware authorization', internal.status() === 404);
  const deniedRead = page.waitForResponse(response => new URL(response.url()).pathname === '/pr/someone/else/1' && response.request().headers()['x-diffdevil-render'] === 'page');
  const generic = await page.goto(`${ORIGIN}/pr/someone/else/1`, { waitUntil: 'networkidle' });
  check('an inaccessible detail returns a generic shell then an authorised 404 without protected detail', generic.status() === 200 && (await deniedRead).status() === 404 && await page.locator('.a-result').count() === 0 && /Not in your repositories/u.test(await page.locator('#main').innerText()));
  const anonymous = await page.context().browser().newContext();
  try {
    const denied = await anonymous.request.get(`${ORIGIN}/`, { maxRedirects: 0 });
    check('a signed-out request still receives no protected shell', denied.status() === 303 && denied.headers().location.startsWith('/sign-in'));
  } finally { await anonymous.close(); }
  await page.unroute(`${ORIGIN}/**`);
}
