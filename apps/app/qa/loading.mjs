// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/** The built Worker and retained fixture, with the data reply held/refused independently of its document. */
export async function loadingJourney({ page, check, shot, ORIGIN, settled, joined }) {
  const scope = '/?s=%40parser-guild&per=90d';
  let release;
  let gate = new Promise(resolve => { release = resolve; });
  let mode = 'hold';
  let releaseNavigation;
  let holdNavigation = true;
  const navigationGate = new Promise(resolve => { releaseNavigation = resolve; });
  const requests = [];
  await page.route(`${ORIGIN}/**`, async route => {
    const request = route.request(), part = request.headers()['x-diffdevil-render'];
    if (!part) return route.continue();
    requests.push(part);
    if (part === 'navigation' && holdNavigation) await navigationGate;
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
  await page.locator('[data-analytical-notifications]:not([data-notifications-pending])').waitFor({ state: 'attached' });
  check('optional notifications finish while both common population and navigation are held', requests.includes('notifications') && await page.locator('[data-analytical-loading]').count() === 1);
  holdNavigation = false; releaseNavigation();
  await page.locator('[data-namespace="parser-guild"]').waitFor();
  check('the navigation reply preserves the focused link while the population remains held', await page.getByRole('link', { name: 'History', exact: true }).first().evaluate(node => node === document.activeElement));
  check('repository navigation resolves independently of the held population', requests.includes('navigation'));
  await shot('loading-held-overview');
  mode = 'pass'; release();
  await page.locator('[data-analytical-loading]').waitFor({ state: 'detached' });
  await settled();
  check('the held view becomes the real retained population', /merged pull requests/iu.test(await page.locator('.a-hero-l .eb').innerText()) && Number((await page.locator('.a-hero-l .val .n').innerText()).replace(/\D/gu, '')) > 0);
  if (joined) check('acquired premium regions load their own browser modules and mount their charts', await page.locator('[data-premium-region] [data-chart]').count() > 0 && await page.locator('[data-premium-region] [data-chart]').evaluateAll(charts => charts.every(chart => chart.classList.contains('is-mounted') && !chart.classList.contains('is-failed'))));
  if (await page.locator('[data-loading-view-surface]').count()) check('dedicated Overview enrichment supplies the consumed Files context', await page.locator('[data-loading-view-surface]').first().getAttribute('data-loading-view-surface') === 'files');
  await shot('loading-populated-overview');
  await page.goto(`${ORIGIN}${scope}#main`, { waitUntil: 'domcontentloaded' });
  await settled();
  check('a hash deep link acquires the analytical document and retains its anchor', new URL(page.url()).hash === '#main' && await page.locator('.a-hero').count() === 1);
  gate = new Promise(resolve => { release = resolve; }); mode = 'hold';
  await page.goto(`${ORIGIN}${scope}`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-analytical-loading]').waitFor();
  await page.locator('a[href="#main"]').focus(); await page.keyboard.press('Enter');
  mode = 'pass'; release(); await settled();
  check('a skip-link hash added during acquisition cannot strand the loading shell', new URL(page.url()).hash === '#main' && await page.locator('.a-hero').count() === 1);
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
  if (joined) {
    let finishPremium;
    let premiumGate = new Promise(resolve => { finishPremium = resolve; });
    let premiumMode = 'hold';
    await page.route(`${ORIGIN}/**`, async route => {
      if (route.request().headers()['x-diffdevil-render'] !== 'enrichment') return route.continue();
      if (premiumMode === 'hold') await premiumGate;
      if (premiumMode === 'fail') return route.fulfill({ status: 503, body: 'Fixture premium unavailable' });
      return route.continue();
    });
    for (const [path, title] of [['/pr/parser-guild/parser-lab/452?per=90d', 'Pull request'], ['/file/parser-guild/parser-lab/' + 'a'.repeat(22) + '?s=%40parser-guild&per=90d', 'File history']]) {
      premiumMode = 'hold'; premiumGate = new Promise(resolve => { finishPremium = resolve; });
      await page.goto(`${ORIGIN}${path}`, { waitUntil: 'domcontentloaded' });
      await page.locator('[data-analytical-loading]').waitFor({ state: 'detached' });
      await page.locator('[data-premium-region][data-pending="loading"]').first().waitFor();
      check(`${title} retains one page heading and navigation while premium is held`, await page.locator('h1').count() === 1 && await page.locator('[data-nav]').count() === 1);
      if (title === 'File history') check('pending file identity reveals no unestablished path', await page.locator('h1').innerText() === 'File history' && await page.locator('[data-pending-file-head]').innerText().then(text => text.includes('parser-guild/parser-lab')));
      await shot(`loading-held-premium-${title === 'File history' ? 'file' : 'pr'}`);
      premiumMode = 'fail'; finishPremium();
      const retryPremium = page.locator('[data-premium-retry]:visible').first();
      await retryPremium.waitFor();
      check(`${title} premium failure remains local and exposes keyboard retry`, /unavailable, not zero/u.test(await page.locator('[data-region-status]').first().innerText()) && await page.locator('h1').count() === 1);
      // PR has a known retained identity and can finish population through this fixture.
      // An unknown opaque file remains an honest unavailable/not-found result.
      premiumMode = 'pass'; await retryPremium.focus(); await page.keyboard.press('Enter');
      await page.locator('[data-premium-region][data-pending]').first().waitFor({ state: 'detached' });
      check(`${title} premium retry completes without replacing common navigation`, await page.locator('[data-nav]').count() === 1 && await page.locator('h1').count() === 1);
    }
    premiumMode = 'pass';
    await page.goto(`${ORIGIN}${scope}`, { waitUntil: 'networkidle' }); await settled();
    await page.locator('[data-premium-region] [data-chart]').first().evaluate(node => { window.__loadingPremiumChart = node; });
    premiumGate = new Promise(resolve => { finishPremium = resolve; }); premiumMode = 'hold';
    await page.getByRole('link', { name: '7 days', exact: true }).click();
    await page.waitForURL(url => url.searchParams.get('per') === '7d');
    await page.locator('[data-premium-region][data-pending="loading"]').first().waitFor();
    check('fresh common results commit while the previous premium chart remains usable and identified', await page.locator('[data-premium-region] [data-chart]').first().evaluate(node => node === window.__loadingPremiumChart) && /previous selection remains displayed/u.test(await page.locator('[data-region-status]').first().innerText()));
    premiumMode = 'fail'; finishPremium();
    await page.locator('[data-premium-retry]:visible').first().waitFor();
    check('optional premium failure cannot block the new common period', new URL(page.url()).searchParams.get('per') === '7d' && await page.locator('[data-period] [aria-current="true"]').innerText() === '7 days');
    premiumMode = 'pass'; await page.locator('[data-premium-retry]:visible').first().click(); await settled();
    check('premium region retry updates the same live chart object', await page.locator('[data-premium-region] [data-chart]').first().evaluate(node => node === window.__loadingPremiumChart));
    await page.unroute(`${ORIGIN}/**`);
  }
  let releaseOld;
  const oldGate = new Promise(resolve => { releaseOld = resolve; });
  let firstNotification = true;
  await page.route(`${ORIGIN}/**`, async route => {
    if (route.request().headers()['x-diffdevil-render'] !== 'notifications') return route.continue();
    const old = firstNotification; firstNotification = false;
    const answer = await route.fetch();
    const body = (await answer.text()).replace('data-analytical-notifications', `data-notification-generation="${old ? 'old' : 'new'}" data-analytical-notifications`);
    if (old) await oldGate;
    return route.fulfill({ response: answer, body });
  });
  await page.goto(`${ORIGIN}${scope}`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-analytical-loading]').waitFor({ state: 'detached' });
  await page.getByRole('link', { name: '7 days', exact: true }).click();
  await page.waitForURL(url => url.searchParams.get('per') === '7d');
  await page.getByRole('link', { name: '90 days', exact: true }).click();
  await page.waitForURL(url => url.searchParams.get('per') === '90d');
  await page.locator('[data-notification-generation="new"]').waitFor({ state: 'attached' });
  releaseOld(); await page.waitForLoadState('networkidle'); await settled();
  check('an old A notification cannot commit after an A-to-B-to-A view sequence', await page.locator('[data-notification-generation="old"]').count() === 0 && await page.locator('[data-notification-generation="new"]').count() === 1);
  await page.unroute(`${ORIGIN}/**`);
}
