// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/** Real signed-in Community Worker, local retained D1 and GitHub wire double. */
export async function policyLabJourney({ page, go, check, shot, ORIGIN, github, expectFailure }) {
  const repository = 'parser-guild/parser-lab';
  github.state.policyFiles.set(repository, 'version: 1\nsize:\n  thresholds: { xs: 10, s: 100, m: 500, l: 1000 }\n');
  await go(`/history?s=${encodeURIComponent(repository)}&per=90d`);
  await page.getByRole('link', { name: 'Try a policy change', exact: true }).click();
  await page.locator('[data-lab-editor]:visible').waitFor().catch(async error => {
    await shot('policy-lab-initial-failure');
    throw new Error(`${await page.locator('main').innerText()}\n${error}`);
  });
  await page.waitForFunction(() => document.querySelector('[data-lab-status]')?.textContent?.includes('Experiment ready'));
  check('Community Lab opens from History with current trusted policy and retained merged population',
    (await page.locator('[data-lab-basis]').innerText()).includes('.diffdevil.yml@')
    && (await page.locator('[data-lab-basis]').innerText()).includes('retained merged PRs'));
  const current = await page.locator('[data-lab-result]').innerText();
  await page.locator('input[name="limit-0"]').fill('1');
  await page.locator('input[name="limit-1"]').fill('2');
  await page.locator('input[name="limit-2"]').fill('3');
  await page.locator('input[name="limit-3"]').fill('4');
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route('**/api/policy-lab*', async route => {
    if (route.request().method() === 'POST') await gate;
    await route.continue();
  });
  await page.getByRole('button', { name: 'Preview change', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('[data-lab-status]')?.textContent?.includes('Evaluating replacement'));
  check('pending replacement preserves the previous answer and editing focus', await page.locator('[data-lab-result]').innerText() === current
    && await page.getByRole('link', { name: 'History', exact: true }).count() > 0);
  release();
  await page.waitForFunction(() => document.querySelector('[data-lab-status]')?.textContent?.includes('Experiment ready'));
  await page.unroute('**/api/policy-lab*');
  check('changed candidate keeps a matrix and equivalent table from one account', await page.locator('.pl-matrix table').count() === 1
    && await page.locator('.pl-linear table').count() === 1 && (await page.locator('[data-lab-adoption]').innerText()).includes('bands:'));
  await page.locator('.pl-matrix button').first().focus(); await page.keyboard.press('Enter');
  check('matrix selection is keyboard operable and filters retained evidence', (await page.locator('[data-lab-status]').innerText()).includes('→'));
  await page.getByRole('button', { name: 'Couldn’t evaluate', exact: true }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot('policy-lab-desktop');

  // Crossing cuts fail locally and preserve a useful, explicitly previous candidate.
  await page.locator('input[name="limit-0"]').fill('200');
  expectFailure(true);
  await page.getByRole('button', { name: 'Preview change', exact: true }).click();
  await page.locator('[data-lab-retry]:visible').waitFor();
  expectFailure(false);
  check('invalid complete band set produces a retryable error with prior answer intact',
    (await page.locator('[data-lab-status]').innerText()).includes('E_BAND_ORDER') && await page.locator('.pl-matrix table').count() === 1);
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('[data-lab-status]')?.textContent?.includes('Experiment ready'));

  github.state.policyHead = 'd'.repeat(40);
  await page.getByRole('button', { name: 'Preview change', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('[data-lab-status]')?.textContent?.includes('superseded'));
  check('a changed trusted head supersedes the carried experiment', await page.locator('[data-lab-editor]:visible').count() === 0);
  await page.getByRole('button', { name: 'Retry policy and history', exact: true }).click();
  await page.locator('[data-lab-editor]:visible').waitFor();
  github.state.policyFiles.set(repository, 503);
  await page.getByRole('button', { name: 'Preview change', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('[data-lab-status]')?.textContent?.includes('trusted-policy-unavailable'));
  check('provider failure is unavailable rather than fallback or zero', await page.locator('.pl-matrix table').count() === 0);
  github.state.policyFiles.delete(repository);
  await page.getByRole('button', { name: 'Retry policy and history', exact: true }).click();
  await page.locator('[data-lab-editor]:visible').waitFor();
  github.state.policyFiles.set(repository, 'version: 1\nmetrics:\n  change: { measure: lines.changed }\nrules:\n  limit: { when: "metrics.change >= 100" }\n');
  await go(`/policy-lab?s=${encodeURIComponent(repository)}&per=90d`);
  await page.locator('[data-lab-editor]:visible').waitFor();
  await page.locator('select[name="decision"]').selectOption('rule:limit');
  await page.locator('input[name="threshold"]').fill('1');
  await page.getByRole('button', { name: 'Preview change', exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('[data-lab-status]')?.textContent?.includes('Experiment ready'));
  check('an existing threshold is edited by keyboard through the same Community result and adoption panel',
    (await page.locator('[data-lab-adoption]').innerText()).includes('metrics.change >= 1')
    && (await page.locator('.pl-matrix table').innerText()).includes('matched'));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  check('narrow reduced-motion Lab has linear evidence without horizontal page overflow', await page.locator('.pl-linear').isVisible()
    && await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), await page.evaluate(() => `${document.documentElement.scrollWidth}/${innerWidth}`));
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot('policy-lab-narrow');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  check('preview does not send provider writes', github.calls.every(call => call.method === 'GET'
    || call.path.includes('access_tokens') || call.path.includes('oauth') || /^\/applications\/[^/]+\/token$/u.test(call.path)),
    JSON.stringify(github.calls.filter(call => call.method !== 'GET').map(({ method, path }) => ({ method, path }))));
  const refused = await page.request.get(`${ORIGIN}/api/policy-lab?s=not-authorized%2Frepo`);
  check('an unauthorized repository cannot obtain experiment rows', refused.status() === 403);
}
