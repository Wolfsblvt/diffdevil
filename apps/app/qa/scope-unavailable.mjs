// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/** Exercise the rendered analytical shell after the signed-in reader loses one namespace installation. */
export async function scopeUnavailableJourney({ page, check, shot, settled, ORIGIN, github, restart }) {
  const baseline = github.state.installations;
  github.state.installations = baseline.filter(installation => installation.account.login !== 'parser-guild');
  try {
    await restart();
    for (const [path, title] of [
      ['/', 'Overview'],
      ['/prs', 'Pull requests'],
      ['/history', 'History'],
      ['/files', 'Files']
    ]) {
      const response = await page.goto(`${ORIGIN}${path}?s=%40parser-guild&per=90d`, { waitUntil: 'networkidle' });
      await settled();
      const status = page.locator('[data-scope-unavailable]');
      check(`${title} keeps its frame and reports the lost namespace scope`, response.status() === 200
        && await page.locator('h1').first().innerText() === title
        && await page.locator('[data-nav]').count() === 1
        && await status.count() === 1
        && /Current GitHub access to parser-guild could not be confirmed/u.test(await status.innerText()));
      check(`${title} does not present inaccessible scope as measured data or an upgrade offer`, await page.locator('[data-chart], [data-premium-region], .a-result').count() === 0
        && !/Data loaded|0 repositories|0 with history|See Pro|Upgrade to Pro/u.test(await page.locator('#main').innerText())
        && await page.locator('.a-nav-sec a[href^="/files"] .a-plan').count() === 0
        && await page.getByRole('link', { name: 'Choose another scope' }).count() === 1);
      if (path === '/') await shot('scope-unavailable-overview-1440');
    }
  } finally {
    github.state.installations = baseline;
    await restart();
  }
}
