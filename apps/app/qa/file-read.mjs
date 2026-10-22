// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/** Public file-view consumer timings. Local workerd, synthetic data; no live/Cloudflare paint claim. */
import { createHmac } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function fileReadJourney({ page, check, shot, ORIGIN, OUT, settled, scale }) {
  const path = 'src/index.ts';
  const initialPeriod = scale ? '7d' : '30d';
  const nextPeriod = scale ? '30d' : '90d';
  const handle = createHmac('sha256', 'diffdevil-app-file-locator:fixture-seal-key-with-enough-length').update(`1001\n${path}`).digest('base64url').slice(0, 22);
  const routeUrl = new URL(`/file/parser-guild/parser-lab/${handle}`, ORIGIN);
  routeUrl.search = new URLSearchParams({ s: 'parser-guild/parser-lab', per: initialPeriod, q: 'src', sel: handle }).toString();
  const route = routeUrl.href;
  await page.addInitScript(() => {
    const observations = { commits: [], paintOpportunityMs: null };
    window.__fileRead = observations;
    document.addEventListener('diffdevil:page', event => {
      observations.commits.push({ reason: event.detail?.reason ?? 'region', ms: performance.now(), file: Boolean(document.querySelector('[data-file-read]')) });
      if (document.querySelector('[data-file-read]')) requestAnimationFrame(() => requestAnimationFrame(() => { observations.paintOpportunityMs = performance.now(); }));
    });
  });
  const samples = [];
  for (let index = 0; index < 3; index++) {
    const requests = [], pending = [];
    const finished = request => {
      if (request.resourceType() !== 'fetch' || new URL(request.url()).pathname !== new URL(route).pathname) return;
      const part = request.headers()['x-diffdevil-render'];
      pending.push((async () => { requests.push({ part, timing: request.timing(), sizes: await request.sizes() }); })());
    };
    page.on('requestfinished', finished);
    try {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await page.locator('[data-file-read]').waitFor();
      await settled();
      await page.waitForFunction(() => window.__fileRead.paintOpportunityMs !== null);
      await Promise.all(pending);
      const sample = await page.evaluate(() => ({ timeOrigin: performance.timeOrigin, observations: window.__fileRead,
        detailMs: Number(document.querySelector('[data-file-read]').dataset.detailMs), populations: Number(document.querySelector('[data-file-read]').dataset.populations),
        files: Number(document.querySelector('[data-file-read]').dataset.files), identity: document.querySelector('[data-file-read]').dataset.fileIdentity,
        heading: document.querySelector('[data-file-read] h1').textContent }));
      samples.push({ ...sample, requests });
      check('file-detail resolves and enriches only the selected retained file', sample.heading === path && sample.files === 1, JSON.stringify(sample));
      check('file-detail consumer enriches one server-view population', sample.populations === 1, JSON.stringify({ populations: sample.populations, detailMs: sample.detailMs }));
      if (index === 2) {
        await shot('file-read-populated');
        let periodAttempts = 0;
        const isPeriodRequest = request => {
          const url = new URL(request.url());
          return url.pathname === routeUrl.pathname && (url.searchParams.get('per') ?? '30d') === nextPeriod
            && request.headers()['x-diffdevil-render'] === 'page';
        };
        const periodResponse = response => isPeriodRequest(response.request());
        await page.route(`${ORIGIN}/**`, async requestRoute => {
          if (isPeriodRequest(requestRoute.request()) && ++periodAttempts === 1) {
            return requestRoute.fulfill({ status: 503, body: 'Synthetic period read unavailable' });
          }
          return requestRoute.continue();
        });
        try {
          const periodLink = page.getByRole('link', { name: nextPeriod === '30d' ? '30 days' : '90 days', exact: true });
          const periodHref = new URL(await periodLink.getAttribute('href'), page.url());
          check('file-detail period control points to the authenticated file route and next period',
            periodHref.pathname === routeUrl.pathname && (periodHref.searchParams.get('per') ?? '30d') === nextPeriod, periodHref.href);
          if (periodHref.pathname !== routeUrl.pathname) throw new Error(`File-detail period link escaped its authenticated route: ${periodHref.pathname}`);
          const firstAttempt = page.waitForResponse(periodResponse);
          await periodLink.click();
          const failed = await firstAttempt;
          const retry = page.getByRole('button', { name: 'Retry view', exact: true });
          await retry.waitFor();
          const preserved = await page.evaluate(() => ({
            pathname: location.pathname,
            period: new URL(location.href).searchParams.get('per'),
            file: document.querySelector('[data-file-read] h1')?.textContent
          }));
          check('a failed file-detail period change keeps the previous view and exposes retry',
            failed.status() === 503 && preserved.pathname === routeUrl.pathname
              && preserved.period === initialPeriod && preserved.file === path, JSON.stringify(preserved));

          const retryAttempt = page.waitForResponse(periodResponse);
          await retry.focus();
          await page.keyboard.press('Enter');
          const recovered = await retryAttempt;
          await settled();
          const result = await page.evaluate(() => ({
            pathname: location.pathname,
            params: Object.fromEntries(new URL(location.href).searchParams),
            file: document.querySelector('[data-file-read] h1')?.textContent,
            period: document.querySelector('[data-fixture-period]')?.getAttribute('data-fixture-period')
          }));
          check('file-detail period retry stays on the authenticated route and preserves selection context',
            recovered.status() === 200 && recovered.headers()['cache-control']?.includes('private')
              && periodAttempts === 2 && result.pathname === routeUrl.pathname
              && result.params.s === 'parser-guild/parser-lab' && (result.params.per ?? '30d') === nextPeriod
              && result.params.q === 'src' && result.params.sel === handle
              && result.file === path && result.period === nextPeriod, JSON.stringify(result));
        } finally { await page.unroute(`${ORIGIN}/**`); }
      }
    } finally { page.off('requestfinished', finished); }
  }
  if (scale) {
    const outsidePeriodPath = 'src/fixture/file-0914.ts';
    const outsidePeriodHandle = createHmac('sha256', 'diffdevil-app-file-locator:fixture-seal-key-with-enough-length').update(`1001\n${outsidePeriodPath}`).digest('base64url').slice(0, 22);
    const emptyRoute = new URL(`/file/parser-guild/parser-lab/${outsidePeriodHandle}`, ORIGIN);
    emptyRoute.search = new URLSearchParams({ s: 'parser-guild/parser-lab', per: '7d' }).toString();
    const emptyResponse = await page.goto(emptyRoute.href, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: outsidePeriodPath, exact: true }).waitFor();
    const emptyView = await page.evaluate(() => ({ heading: document.querySelector('h1')?.textContent,
      message: document.querySelector('.a-focus .lede')?.textContent, period: new URL(location.href).searchParams.get('per') ?? '30d' }));
    check('a known retained file with no selected-period row remains an honest empty file view',
      emptyResponse?.status() === 200 && emptyView.heading === outsidePeriodPath
        && emptyView.message?.includes('does not establish that the file was unchanged') && emptyView.period === '7d', JSON.stringify(emptyView));

    const unknownPath = 'src/no-such-file.ts';
    const unknownHandle = createHmac('sha256', 'diffdevil-app-file-locator:fixture-seal-key-with-enough-length').update(`1001\n${unknownPath}`).digest('base64url').slice(0, 22);
    const unknownRoute = new URL(`/file/parser-guild/parser-lab/${unknownHandle}`, ORIGIN);
    unknownRoute.search = new URLSearchParams({ s: 'parser-guild/parser-lab', per: '7d' }).toString();
    const unknownResponse = await page.request.get(unknownRoute.href, { headers: { 'x-diffdevil-render': 'enrichment' } });
    const unknownText = await unknownResponse.text();
    check('an unknown locator stays distinct from a known file with no period activity',
      unknownResponse.status() === 404 && unknownText.includes('does not identify a file') && !unknownText.includes(unknownPath), unknownText.replace(/\s+/gu, ' ').slice(0, 400));
  }
  await writeFile(join(OUT, 'file-read.json'), JSON.stringify({ boundary: 'local built public App/bridge, synthetic extension and retained fixture; paintOpportunityMs is two animation frames after DOM commit, not a compositor timestamp', samples }, null, 2));
}
