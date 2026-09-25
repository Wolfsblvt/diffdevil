// SPDX-License-Identifier: AGPL-3.0-only
/** Final cross-surface qualification uses the actual emitted files and handlers.
 * These checks are author/integration evidence, not the independent final review.
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { expect } from '@playwright/test';
import { pageUrl } from '../manifest.mjs';
import { entries } from '../../website/docs-manifest.mjs';
import { publishedRelease, downloadKinds } from '../../website/download-source.mjs';

export async function qualifyReconciliation({ page, origins, check, screenshot, handlers, asset, manifest, records, ref }) {
  const state = JSON.parse(readFileSync('apps/manual/authoring-state.json', 'utf8'));
  await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'reduce', colorScheme: 'dark' });
  await page.setViewportSize({ width: 1280, height: 900 });
  await check('Every legacy route has one emitted 308, including retained technical and historical sources', async () => {
    const redirects = new Map(manifest.redirects.map(rule => [rule.from, rule]));
    for (const entry of entries) {
      const path = entry.route ?? (entry.slug ? '/docs/' + entry.slug + '/' : '/docs/');
      const rule = redirects.get(path); assert.ok(rule, path);
      const request = new Request(origins.site + path + '?view=agent&example=bounded-decisions&variant=bounded');
      const response = await handlers.site.fetch(request, { ASSETS: { fetch: req => asset(req, 'website') } });
      assert.equal(response.status, 308, path);
      const destination = new URL(response.headers.get('location'));
      assert.equal(destination.search, new URL(request.url).search, path);
      assert.equal(destination.origin + destination.pathname, rule.to, path);
      if (entry.repositoryOnly) assert.ok(destination.pathname.startsWith('/Wolfsblvt/diffdevil/blob/' + ref + '/'), path);
      const fallback = readFileSync('artifacts/website/dist' + path + 'index.html', 'utf8');
      assert.match(fallback, /noindex/u); assert.doesNotMatch(fallback, /data-pagefind-body/u);
    }
  });
  await check('Retained-source projection fragments reach current sections without dropping queries', async () => {
    let exercised = 0;
    for (const selection of Object.values(state.routes)) {
      if (!selection.projection) continue;
      const old = selection.projection.oldAnchors.find(anchor => {
        const target = selection.projection.anchors[anchor];
        return target && (target.page !== selection.target || target.anchor !== anchor);
      });
      if (!old) continue;
      exercised++;
      const destination = selection.projection.anchors[old];
      // The emitted 308 and its query handling are checked above. Playwright's
      // route interception cannot serve the second hop of that redirect, so
      // start this browser-owned fragment check at the selected landing page.
      await page.goto(pageUrl(selection.target) + '?view=agent#' + encodeURIComponent(old));
      await expect(page).toHaveURL(pageUrl(destination.page) + '?view=agent#' + encodeURIComponent(destination.anchor));
      await expect(page.locator('[id="' + destination.anchor + '"]').first()).toBeVisible();
    }
    assert.ok(exercised > 0, 'Expected a retained source with a moved fragment');
  });
  await check('Product pages link directly to canonical chapters; raw setup resolves or explicitly refuses', async () => {
    for (const path of ['/', '/app/', '/extension/', '/examples/', '/faq/']) {
      await page.goto(origins.site + path);
      const old = await page.locator('a[href]').evaluateAll(nodes => nodes.map(node => node.href).filter(href => {
        const url = new URL(href); return url.hostname === 'diffdevil.dev' && url.pathname.startsWith('/docs/');
      }));
      assert.deepEqual(old, [], path);
    }
    for (const intent of ['skill', 'cli', 'actions', 'app', 'everything']) {
      const text = readFileSync('artifacts/website/dist/setup/' + intent + '.md', 'utf8');
      assert.doesNotMatch(text, /\{\{[A-Z_]+\}\}/u, intent);
      assert.ok(text.startsWith('#'), intent);
      if (intent === 'app' && !(process.env.PUBLIC_APP_INSTALL_URL && process.env.PUBLIC_DASHBOARD_URL)) {
        assert.match(text, /not available/u);
        assert.doesNotMatch(text, /github\.com\/apps\//u);
      }
    }
    assert.equal(readFileSync('artifacts/website/dist/skill/SKILL.md', 'utf8'), readFileSync('skills/diffdevil/SKILL.md', 'utf8'));
    await page.goto(origins.site + '/#agents-skill');
    const instruction = await page.locator('#agents-skill [data-copy]').getAttribute('data-copy');
    assert.ok(instruction.includes('/setup/skill.md'));
    assert.equal(instruction.includes('from ' + origins.site + '/skill/SKILL.md'), false);
  });
  await check('Download routes use exact manifest assets or a visible unavailable state', async () => {
    const release = publishedRelease();
    for (const kind of downloadKinds) {
      const response = await page.goto(origins.site + '/downloads/' + kind + '/');
      assert.equal(response.status(), 200);
      if (release) {
        await expect(page.locator('a[href="' + release.assets[kind].url + '"]')).toBeVisible();
        await expect(page.locator('pre')).toContainText(release.assets[kind].sha256);
      } else {
        await expect(page.locator('main')).toContainText('Archive not available');
        assert.equal(await page.locator('main a[href*="/releases/download/"]').count(), 0);
      }
      for (const width of [1280, 390, 320]) {
        await page.setViewportSize({ width, height: 900 });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), true, kind + '/' + width);
      }
    }
    await screenshot('download-unavailable-or-published-320.png');
  });
  await check('Final search has one current home per result and no former apex manual or downloads leakage', async () => {
    const site = records.records.filter(record => record.kind === 'SITE').map(record => new URL(record.url).pathname).sort();
    assert.deepEqual(site, ['/', '/app/', '/examples/', '/extension/', '/playground/']);
    assert.equal(records.records.filter(record => record.kind === 'DOCS').length, manifest.records.filter(record => record.current).length);
    assert.equal(records.records.filter(record => record.kind === 'FAQ').length, 20);
    assert.equal(records.records.length, new Set(records.records.map(record => record.url)).size);
    assert.equal(existsSync('apps/website/src/content/docs/index.mdx'), false);
  });
  await check('A public-host theme handoff creates no shared account or authentication state', async () => {
    await page.goto(origins.site + '/?dd-theme=light.dark');
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.locator('.primary-nav a').filter({ hasText: /^Docs$/u }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme-pref', 'light');
    assert.equal(new URL(page.url()).searchParams.has('dd-theme'), false);
    assert.deepEqual(await page.context().cookies(), []);
    await expect(page.locator('h1').first()).toBeVisible();
  });
}
