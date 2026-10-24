// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/** Trusted policy through the built Worker, local GitHub wire double, real sign-in and retained D1. */
export async function currentPolicyJourney({ page, go, check, shot, ORIGIN, github, restart }) {
  const repository = 'parser-guild/parser-lab';
  const query = { version: 1, surface: 'prs', repositoryIds: [1001], scope: { kind: 'repository', repositoryId: 1001 }, from: '2026-01-01T00:00:00.000Z', to: new Date().toISOString() };
  const endpoint = `${ORIGIN}/api/analytics?query=${encodeURIComponent(JSON.stringify(query))}`;
  const read = async () => { const response = await page.request.get(endpoint); check('built analytical API answers the authorized repository', response.ok()); return response.json(); };
  const absent = await read();
  check('positive file absence retains a current effective fallback', absent.policies[0].standing === 'current' && absent.policies[0].origin !== 'trusted-base');
  github.state.policyFiles.set(repository, 'version: 1\ndefaults: { paths: { exclude: ["**"] } }\n');
  github.state.policyHead = 'c'.repeat(40);
  const overridden = await read();
  check('built consumer uses the trusted repository path override', absent.result.pullRequests.some(row => row.changed.lower > 0)
    && overridden.result.pullRequests.every(row => row.changed.lower === 0));
  check('built consumer identifies the trusted head and preserves original historical results', overridden.policies[0].trustedHead === 'c'.repeat(40)
    && JSON.stringify(overridden.result.pullRequests.map(row => row.original)) === JSON.stringify(absent.result.pullRequests.map(row => row.original)));
  await go('/prs?s=parser-guild%2Fparser-lab&per=90d');
  check('rendered basis names the actual trusted repository source', (await page.locator('[data-current-policy-basis]').innerText()).includes('.diffdevil.yml@' + 'c'.repeat(40)));
  await shot('current-policy-trusted');
  await go('/manage/repositories/parser-guild/parser-lab');
  check('Manage names the same trusted policy source', (await page.locator('main').innerText()).includes('.diffdevil.yml@' + 'c'.repeat(40)));
  github.state.policyFiles.set(repository, 'version: 1\nsize:\n  thresholds: { xs: 1, s: 2, m: 3, l: 4 }\n');
  const reclassified = await read();
  check('trusted size thresholds change classification as well as path selection', reclassified.result.pullRequests.some(row => row.band?.id === 'xl'
    && absent.result.pullRequests.find(original => original.pullRequest === row.pullRequest)?.band?.id !== 'xl'));
  await go('/pr/parser-guild/parser-lab/452?s=parser-guild%2Fparser-lab&per=90d');
  const policyResult = await page.locator('[aria-labelledby="h-policy"]').innerText();
  check('PR detail shows the effective result without asserting bundled thresholds', /band\s+xl/u.test(policyResult)
    && !policyResult.includes('XS <20'));
  await shot('current-policy-bands');
  for (const contents of [503, 'version: [broken']) {
    github.state.policyFiles.set(repository, contents);
    const unavailable = await read();
    check('failed trusted reads keep measurements without a successful policy identity', unavailable.policies[0].requestedId === null
      && unavailable.policies[0].standing === 'unfiltered-base-facts' && unavailable.result.pullRequests.some(row => row.changed.lower > 0));
  }
  await go('/prs?s=parser-guild%2Fparser-lab&per=90d');
  check('failed interpretation renders a local explanation and retry beside retained facts', await page.locator('[data-current-policy-unavailable]').isVisible()
    && await page.locator('.a-prs2 .a-pr').count() > 0);
  check('classification captions disclose unavailable interpretation', (await page.locator('[data-chart-id="mix"] [data-meta]').innerText()).includes('unavailable'));
  await shot('current-policy-unavailable');
  github.state.policyFiles.delete(repository);
  await page.getByRole('link', { name: 'Retry current policy', exact: true }).click();
  await page.waitForFunction(() => !document.querySelector('[data-analytical-loading]'));
  check('retry recovers in the selected repository and period', new URL(page.url()).searchParams.get('s') === repository
    && new URL(page.url()).searchParams.get('per') === '90d' && await page.locator('[data-current-policy-unavailable]').count() === 0);
  let release;
  github.state.policyGate = new Promise(resolve => { release = resolve; });
  try {
    await page.goto(`${ORIGIN}/history?s=parser-guild%2Fparser-lab&per=90d`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-analytical-loading]').waitFor();
    check('the prompt shell and keyboard navigation remain usable while trusted policy is held', await page.getByRole('link', { name: 'Pull requests', exact: true }).first().isVisible());
    await shot('current-policy-pending');
  } finally { github.state.policyGate = null; release(); }
  await page.waitForFunction(() => !document.querySelector('[data-analytical-loading]'));
  check('the held policy read resolves in place', await page.locator('[data-current-policy-basis]').isVisible());
  github.state.policyGate = new Promise(resolve => { release = resolve; });
  try {
    await page.goto(`${ORIGIN}/history?s=parser-guild%2Fparser-lab&per=30d`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-analytical-loading]').waitFor();
    await page.getByRole('link', { name: 'Pull requests', exact: true }).first().click();
    check('navigation can supersede a held policy request', new URL(page.url()).pathname === '/prs');
  } finally { github.state.policyGate = null; release(); }
  await page.waitForFunction(() => !document.querySelector('[data-analytical-loading]'));
  check('the obsolete History answer does not replace Pull requests', new URL(page.url()).pathname === '/prs'
    && await page.locator('.a-prs2').isVisible());
  await restart(false);
  const missingCredentials = await read();
  check('the built consumer refuses missing installation credentials without default success', missingCredentials.policies[0].requestedId === null
    && missingCredentials.policies[0].reason === 'trusted-policy-unavailable' && missingCredentials.result.pullRequests.some(row => row.changed.lower > 0));
  await go('/prs?s=parser-guild%2Fparser-lab&per=90d');
  check('missing credentials preserve the useful page and recovery notice', await page.locator('[data-current-policy-unavailable]').isVisible()
    && await page.locator('.a-prs2').isVisible());
  await shot('current-policy-missing-credentials');
  await restart(true);
  await page.getByRole('link', { name: 'Retry current policy', exact: true }).click();
  await page.waitForFunction(() => !document.querySelector('[data-analytical-loading]'));
  check('restored credentials recover through the actual retry link', await page.locator('[data-current-policy-basis]').isVisible());
  check('policy interpretation issues no provider data mutations', github.calls.every(call => call.method === 'GET'
    || call.path.endsWith('/access_tokens') || call.path === '/login/oauth/access_token' || call.path === '/applications/fixture-client/token'));
}
