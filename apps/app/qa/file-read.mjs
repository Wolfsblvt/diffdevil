// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/** Public file-view consumer timings. Local workerd, synthetic data; no live/Cloudflare paint claim. */
import { createHmac } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function fileReadJourney({ page, check, shot, ORIGIN, OUT, settled, scale }) {
  const path = scale ? 'src/fixture/file-0914.ts' : 'src/index.ts';
  const handle = createHmac('sha256', 'diffdevil-app-file-locator:fixture-seal-key-with-enough-length').update(`1001\n${path}`).digest('base64url').slice(0, 22);
  const route = `${ORIGIN}/file/parser-guild/parser-lab/${handle}?s=parser-guild%2Fparser-lab&per=30d`;
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
        files: Number(document.querySelector('[data-file-read]').dataset.files), heading: document.querySelector('h1').textContent }));
      samples.push({ ...sample, requests });
      check('file-detail consumer reads the selected retained file and complete population', sample.heading === path && sample.files === (scale ? 915 : sample.files) && sample.files > 0);
      check('file-detail consumer enriches one server-view population', sample.populations === 1, JSON.stringify({ populations: sample.populations, detailMs: sample.detailMs }));
      if (index === 2) await shot('file-read-populated');
    } finally { page.off('requestfinished', finished); }
  }
  await writeFile(join(OUT, 'file-read.json'), JSON.stringify({ boundary: 'local built public App/bridge, synthetic extension and retained fixture; paintOpportunityMs is two animation frames after DOM commit, not a compositor timestamp', samples }, null, 2));
}
