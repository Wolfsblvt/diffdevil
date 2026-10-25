// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chromium } from '@playwright/test';
import { cloudViewIsReady } from './cloud-view-readiness.mjs';

const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH;

test('cloud readiness follows both supported table-hiding contracts', async () => {
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  try {
    const page = await browser.newPage();
    await page.setContent(`
      <style>
        .cl-wrap { width: 240px; height: 120px; }
        .cl { width: 100%; height: 100%; }
        .cl-stage { width: 100%; height: 100%; }
        .cl-words { width: 100%; height: 100%; }
        .community .cl-list { display: none; }
        .premium .cl-listwrap { display: none; }
      </style>
      <div id="community" class="is-mounted community">
        <div class="cl"><div class="cl-wrap"><div class="cl-stage"><div class="cl-words"><span class="cl-w">file</span></div></div></div></div>
        <table class="cl-list"><tbody><tr><td>file</td></tr></tbody></table>
      </div>
      <div id="premium" class="is-mounted premium">
        <div class="cl"><div class="cl-wrap"><div class="cl-stage"><div class="cl-words"><span class="cl-w">file</span></div></div></div></div>
        <div class="cl-listwrap"><table class="cl-list"><tbody><tr><td>file</td></tr></tbody></table></div>
      </div>
    `);

    await page.waitForFunction(cloudViewIsReady, '#community', { timeout: 1_000 });
    await page.waitForFunction(cloudViewIsReady, '#premium', { timeout: 1_000 });
    assert.equal(await page.evaluate(cloudViewIsReady, '#community'), true);
    assert.equal(await page.evaluate(cloudViewIsReady, '#premium'), true);

    await page.locator('#premium .cl').evaluate(cloud => cloud.classList.add('is-busy'));
    assert.equal(await page.evaluate(cloudViewIsReady, '#premium'), false, 'busy cloud must not be ready');
    await page.locator('#premium .cl').evaluate(cloud => cloud.classList.remove('is-busy'));
    await page.locator('#premium .cl-w').evaluate(word => word.remove());
    assert.equal(await page.evaluate(cloudViewIsReady, '#premium'), false, 'empty cloud must not be ready');
    await page.locator('#community .cl-wrap').evaluate(stage => stage.style.display = 'none');
    assert.equal(await page.evaluate(cloudViewIsReady, '#community'), false, 'hidden cloud stage must not be ready');
    await page.locator('#community .cl-wrap').evaluate(stage => stage.style.display = '');
    await page.locator('#community .cl-list').evaluate(list => list.style.display = 'table');
    assert.equal(await page.evaluate(cloudViewIsReady, '#community'), false, 'visible list must not count as the cloud view');
  } finally {
    await browser.close();
  }
});
