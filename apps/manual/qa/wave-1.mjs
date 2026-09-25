// SPDX-License-Identifier: AGPL-3.0-only
/** The authored first-success route uses the actual built Playground and exports. */
import assert from 'node:assert/strict';
import { expect } from '@playwright/test';
import { parse } from 'yaml';
import { readFileSync } from 'node:fs';
export async function qualifyFirstSuccess({ page, origins, check, screenshot }) {
  await check('Authored root and complete first-success examples remain readable at desktop and 320px', async () => {
    await page.emulateMedia({ forcedColors: 'none' });
    for (const width of [1280, 320]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of ['/', '/start/analyze-local-changes/', '/start/label-pull-requests/', '/start/use-results-in-scripts/', '/understand/evidence-and-uncertainty/']) {
        await page.goto(origins.docs + route);
        const article = page.locator('.sl-markdown-content');
        assert.ok((await article.locator('p').count()) > 0);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), true, route + ' at ' + width);
        if (route === '/start/use-results-in-scripts/') {
          // Both complete consumers are open, not hidden in a disclosure.
          assert.equal(await article.locator('pre').filter({ hasText: '#!/usr/bin/env bash' }).count(), 1);
          assert.equal(await article.locator('pre').filter({ hasText: 'Set-StrictMode' }).count(), 1);
          assert.equal(await article.locator('details pre').count(), 0);
        }
        if (route === '/') await screenshot(`first-success-root-${width}.png`);
      }
    }
  });
  await check('The manual opens the exact frozen lesson, changes an exclusion and exports separate replayable artifacts', async () => {
    const snapshot = JSON.parse(readFileSync(new URL('../../../docs/examples/catalogue/snapshots/vite-18968.json', import.meta.url), 'utf8'));
    const headUrl = 'http://127.0.0.1:4173/api/head?url=' + encodeURIComponent(snapshot.url);
    let probes = 0;
    // This single read-only probe is fixture HTTP, not a live freshness assertion.
    // Every other external request still reaches the suite's refusing guard.
    const headFixture = async route => {
      if (route.request().method() !== 'GET') return route.fallback();
      probes++;
      await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({
        kind: 'diffdevil.playground-response', schemaVersion: '1.0', ok: true, status: 200, canonicalUrl: snapshot.url,
        head: { head: snapshot.provenance.head, base: snapshot.provenance.baseTip, state: 'open', changedFiles: snapshot.report.files.length },
      }) });
    };
    await page.route(headUrl, headFixture);
    try {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(origins.docs + '/start/try-a-public-pull-request/');
      await page.locator('.sl-markdown-content a[href*="example=lockfile-scope&variant=all"]').first().click();
      await expect(page.locator('.pg-primary')).toContainText('22', { timeout: 15000 });
      await expect(page.locator('.pg-strip')).toContainText('teaching snapshot');
      await page.getByRole('textbox', { name: 'Add an exclusion pattern, then press Enter' }).fill('pnpm-lock.yaml');
      await page.getByRole('textbox', { name: 'Add an exclusion pattern, then press Enter' }).press('Enter');
      await expect(page.locator('.pg-files .is-excluded')).toHaveCount(1);
      await page.locator('.pg-export').click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await dialog.getByRole('tab', { name: 'report.json / plan.json', exact: true }).click();
      const code = dialog.locator('pre code');
      const report = JSON.parse(await code.innerText());
      assert.equal(report.kind, 'diffdevil.report');
      assert.equal(report.source.repository, 'vitejs/vite');
      assert.equal(report.source.head, '48db5c9555f2d43cb88367506e79854fce8ed47d');
      assert.equal(report.totals.lines.changed.value, 1);
      assert.equal(report.totals.raw.churn.value, 2);
      await dialog.getByRole('combobox', { name: 'Artifact' }).selectOption('plan');
      const plan = JSON.parse(await code.innerText());
      assert.equal(plan.kind, 'diffdevil.plan'); assert.equal(plan.stage, 'desired');
      assert.ok(plan.operations.some(operation => operation.selected === 'size/XS'));
      await dialog.getByRole('tab', { name: '.diffdevil.yml', exact: true }).click();
      assert.ok(parse(await code.innerText()).defaults.paths.exclude.includes('pnpm-lock.yaml'));
      await dialog.getByRole('tab', { name: 'Complete workflow', exact: true }).click();
      const workflow = parse(await code.innerText());
      assert.equal(workflow.permissions['contents'], 'read');
      assert.equal(workflow.permissions['pull-requests'], 'write');
      await dialog.getByRole('tab', { name: 'CLI', exact: true }).click();
      assert.match(await code.innerText(), /analyze --report report\.json/u);
      assert.match(await code.innerText(), /plan --report report\.json --config \.diffdevil\.yml/u);
      assert.doesNotMatch(await code.innerText(), /--base|\bapply\s+--/u);
      await screenshot('first-success-snapshot-export.png');
      await page.keyboard.press('Escape'); await expect(dialog).toBeHidden();
      // A malformed public URL must not become a new zero-valued result.
      await page.getByRole('tab', { name: 'Public pull request', exact: true }).click();
      const input = page.getByPlaceholder('https://github.com/owner/repo/pull/123');
      await input.fill('https://example.org/not-a-github-pr');
      await page.getByRole('button', { name: 'Analyze public PR', exact: true }).click();
      await expect(page.getByRole('alert')).toContainText('Not a public github.com pull-request URL');
      await expect.poll(() => probes).toBeGreaterThan(0);
    } finally {
      await page.unroute(headUrl, headFixture);
    }
  });
}
