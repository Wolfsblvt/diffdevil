// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/** The public URL/acquisition counterpart. replaceState models the private controller's effect, not its UI or projection. */
export async function filesQueryJourney({ page, check, shot, ORIGIN, settled }) {
  const query = 'path/' + 'a'.repeat(148) + '/package-lock.json';
  const address = new URL('/files', ORIGIN);
  address.search = new URLSearchParams({ s: 'parser-guild/parser-lab', per: '30d', m: 'changed', q: query, page: '2' }).toString();
  for (const part of ['document', 'page', 'enrichment']) {
    const url = new URL(address);
    if (part === 'document') url.searchParams.set('render', 'document');
    const response = await page.request.get(url.href, part === 'document' ? {} : { headers: { 'x-diffdevil-render': part } });
    const html = await response.text();
    const observed = await page.evaluate(({ html }) => {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      return { query: doc.querySelector('[data-fixture-query]')?.getAttribute('data-fixture-query'), period: doc.querySelector('[data-period] a')?.getAttribute('href') };
    }, { html });
    check(`${part} Files read preserves the complete 171-character query`, response.status() === 200
      && (part === 'page' ? new URL(observed.period, ORIGIN).searchParams.get('q') === query : observed.query === query));
  }

  let held = null;
  const requests = [];
  const hold = (part, outcome = 'pass') => {
    let release, observed;
    const specimen = { part, outcome, used: false, gate: new Promise(resolve => { release = resolve; }), seen: new Promise(resolve => { observed = resolve; }), observed: () => observed() };
    held = specimen;
    specimen.release = () => { if (held === specimen) held = null; release(); };
    return { seen: specimen.seen, release: specimen.release };
  };
  await page.route(`${ORIGIN}/**`, async route => {
    if (new URL(route.request().url()).pathname !== '/files') return route.continue();
    const part = route.request().headers()['x-diffdevil-render'];
    if (['page', 'navigation', 'enrichment'].includes(part)) requests.push(part);
    const specimen = held;
    if (specimen && ((!specimen.used && specimen.part === part) || (specimen.part === 'common' && ['page', 'navigation'].includes(part)))) {
      specimen.used = true;
      specimen.observed(); await specimen.gate;
      if (specimen.outcome === 'fail') return route.fulfill({ status: 503, body: 'Synthetic Files region unavailable' });
    }
    return route.continue().catch(() => {}); // A newer navigation may have aborted this deliberately held request.
  });
  const edit = async pageNumber => page.evaluate(({ query, pageNumber }) => {
    const url = new URL(location.href); url.searchParams.set('q', 'new/' + query); url.searchParams.set('page', String(pageNumber));
    history.replaceState(null, '', url);
  }, { query, pageNumber });
  const complete = async () => page.locator('[data-premium-region][data-pending]').first().waitFor({ state: 'detached', timeout: 5_000 }).then(() => true, () => false);
  try {
    let pending = hold('common');
    await page.goto(address.href, { waitUntil: 'domcontentloaded' }); await pending.seen;
    await edit(3); pending.release(); await settled();
    check('Files-local edits survive the common acquisition and its complete-query links', new URL(page.url()).searchParams.get('q') === 'new/' + query
      && await page.locator('[data-fixture-query]').first().getAttribute('data-fixture-query') === 'new/' + query);

    pending = hold('enrichment');
    await page.goto(address.href, { waitUntil: 'domcontentloaded' }); await pending.seen;
    const count = requests.length; await edit(4);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    check('Files-local replace-state edits issue no additional analytical request', requests.length === count, JSON.stringify({ before: count, after: requests.length }));
    pending.release();
    check('a current Files enrichment settles after local query/page edits', await complete());
    check('the settled acquisition preserves the newer local Files URL', new URL(page.url()).searchParams.get('q') === 'new/' + query && new URL(page.url()).searchParams.get('page') === '4');

    pending = hold('enrichment', 'fail');
    await page.goto(address.href, { waitUntil: 'domcontentloaded' }); await pending.seen;
    await edit(5); pending.release();
    const retry = page.locator('[data-premium-retry]:visible').first();
    const retryVisible = await retry.waitFor({ timeout: 5_000 }).then(() => true, () => false);
    check('local Files edits do not hide an acquired region failure or strand its retry', retryVisible);
    if (retryVisible) {
      await retry.focus(); await page.keyboard.press('Enter'); await settled();
      check('keyboard retry acquires the complete newer Files query', await page.locator('[data-fixture-query]').first().getAttribute('data-fixture-query') === 'new/' + query);
    }

    pending = hold('enrichment');
    await page.goto(address.href, { waitUntil: 'domcontentloaded' }); await pending.seen;
    await page.getByRole('link', { name: '7 days', exact: true }).click();
    await page.waitForURL(url => url.searchParams.get('per') === '7d'); await settled();
    pending.release(); await page.waitForLoadState('networkidle');
    check('a superseded Files population cannot commit after a real period navigation', new URL(page.url()).searchParams.get('per') === '7d'
      && await page.locator('[data-fixture-period]').first().getAttribute('data-fixture-period') === '7d');
    await shot('files-query-current-population');
  } finally { held?.release(); await page.unroute(`${ORIGIN}/**`); }
}
