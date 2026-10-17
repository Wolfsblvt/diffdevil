// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/** The maintained operator journey against the built App, disposable local D1 and the GitHub wire double. */
export async function admissionJourney({ check, go, page, shot }, github) {
  const repository = 'parser-guild/grammar-fuzz';
  const path = `/manage/repositories/${repository}`;
  github.state.policyFiles.set(repository, 'version: 1\npresets: []\n');
  await go('/manage/repositories?ns=parser-guild');
  await page.locator(`[data-repository-row="${repository}"] form button`).click();
  await page.waitForLoadState('networkidle');
  await go(path);
  await page.getByRole('link', { name: 'Inspect trusted policy', exact: true }).click();
  await page.waitForLoadState('networkidle');
  const review = page.locator('[data-admission-review]');
  const before = await review.innerText();
  check('the real inspection shows the pinned policy, running service version and unchanged consent',
    before.includes(github.state.policyHead) && before.includes('trusted-base') && before.includes('History off')
      && before.includes('not-attempted') && !before.includes('version unobserved'), before.slice(0, 650));
  check('an authoritative empty preset is reflected in the actual inspected effects',
    await review.locator('details').first().innerText().then(text => /"presets": \[\]/u.test(text)));
  await shot('admission-inspection-1440');
  const expected = JSON.parse(await review.locator('input[name="inspection"]').inputValue());
  check('the form binds repository, installation, revision, policy, host and running version',
    expected.basis.repositoryId > 0 && expected.basis.installationId > 0 && expected.basis.revision >= 0
      && expected.basis.policyBase === github.state.policyHead && Boolean(expected.basis.policyId)
      && expected.service.origin.startsWith('http://localhost:') && Boolean(expected.service.versionId));

  // A changed default branch must be detected by the form's real POST before consent can be recorded.
  github.state.policyHead = 'c'.repeat(40);
  await review.locator('input[name="writer"]').check();
  await review.getByRole('button', { name: 'Admit execution', exact: true }).click();
  await page.waitForLoadState('networkidle');
  check('policy drift refuses admission through the actual same-origin form', /changed since inspection/u.test(await page.locator('.m-msg').innerText()));
  await go(`${path}?admission=review`);
  await page.locator('[data-admission-review] input[name="writer"]').check();
  await page.getByRole('button', { name: 'Admit execution', exact: true }).click();
  await page.waitForLoadState('networkidle');
  const after = await page.locator('[data-admission-review]').innerText();
  check('admission returns the recorded actor and new revision, with history off and GitHub effects unobserved',
    /Execution consent recorded/u.test(await page.locator('.m-msg').innerText()) && /consent: enabled; actor 123/u.test(after)
      && after.includes('History off') && after.includes(`settings revision ${expected.basis.revision + 1}`));
  await shot('admission-recorded-1440');
  await page.setViewportSize({ width: 1024, height: 900 });
  check('the dense policy review stays within the established narrow desktop viewport',
    await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
  await shot('admission-recorded-1024');
  await page.setViewportSize({ width: 1440, height: 900 });

  github.state.policyFiles.set(repository, 503);
  await go(`${path}?admission=review`);
  check('an unreadable trusted policy renders an explicit unavailable state without an admission button',
    await page.getByText('Trusted policy inspection unavailable', { exact: true }).count() === 1
      && await page.getByRole('button', { name: 'Admit execution', exact: true }).count() === 0);
  await shot('admission-policy-unavailable-1440');
  check('the operator journey never applied a GitHub label, comment or check',
    !github.calls.some(call => call.method !== 'GET' && /\/(labels|comments|check-runs)(?:\/|$)/u.test(call.path)));
}
