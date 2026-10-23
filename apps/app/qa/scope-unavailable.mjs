// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/** Exercise the rendered analytical shell after the signed-in reader loses a selected namespace or repository. */
export async function scopeUnavailableJourney({ page, check, shot, settled, ORIGIN, github, restart }) {
  const baselineInstallations = github.state.installations;
  const baselineInaccessibleRepositoryIds = github.state.inaccessibleRepositoryIds;
  try {
    for (const [path, title] of [
      ['/', 'Overview'],
      ['/prs', 'Pull requests'],
      ['/history', 'History'],
      ['/files', 'Files']
    ]) {
      for (const selection of [
        { scope: '%40parser-guild', name: 'parser-guild', lose: () => { github.state.installations = baselineInstallations.filter(installation => installation.account.login !== 'parser-guild'); } },
        { scope: 'parser-guild%2Fparser-lab', name: 'parser-guild/parser-lab', lose: () => { github.state.inaccessibleRepositoryIds = new Set([1001]); } }
      ]) {
        github.state.installations = baselineInstallations;
        github.state.inaccessibleRepositoryIds = baselineInaccessibleRepositoryIds;
        selection.lose();
        await restart();
        const response = await page.goto(`${ORIGIN}${path}?s=${selection.scope}&per=90d`, { waitUntil: 'networkidle' });
        await settled();
        const status = page.locator('[data-scope-unavailable]');
        check(`${title} keeps its frame and reports lost ${selection.name} scope`, response.status() === 200
          && await page.locator('h1').first().innerText() === title
          && await page.locator('[data-nav]').count() === 1
          && await status.count() === 1
          && (await status.innerText()).includes(`Current GitHub access to ${selection.name} could not be confirmed`));
        check(`${title} does not present inaccessible ${selection.name} scope as measured data or an upgrade offer`, await page.locator('[data-chart], [data-premium-region], .a-result').count() === 0
          && !/Data loaded|0 repositories|0 with history|See Pro|Upgrade to Pro/u.test(await page.locator('#main').innerText())
          && await page.locator('.a-nav-sec a[href^="/files"] .a-plan').count() === 0
          && await page.getByRole('link', { name: 'Choose another scope' }).count() === 1);
        if (selection.name === 'parser-guild/parser-lab') {
          check(`${title} retains the authorized namespace sibling while the selected repository is unavailable`, (await page.locator('[data-nav]').innerText()).includes('grammar-fuzz'));
        }
        if (path === '/' && selection.name === 'parser-guild/parser-lab') await shot('scope-unavailable-repository-overview-1440');
      }
    }
  } finally {
    github.state.installations = baselineInstallations;
    github.state.inaccessibleRepositoryIds = baselineInaccessibleRepositoryIds;
    await restart();
  }
}
