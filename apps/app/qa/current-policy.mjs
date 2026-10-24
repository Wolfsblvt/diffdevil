// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/** Trusted policy through the built Worker, local GitHub wire double, real sign-in and retained D1. */
export async function currentPolicyJourney({ page, go, check, shot, ORIGIN, github, restart, joined, settled, publicFileFixture }) {
  const repository = 'parser-guild/parser-lab';
  if (publicFileFixture) {
    let retainedHref, observedChanged;
    const currentPolicy = 'version: 1\nsize:\n  thresholds: { xs: 1, s: 2, m: 3, l: 4 }\n';
    github.state.policyHead = 'd'.repeat(40);
    for (const [name, contents, inclusion] of [['default', currentPolicy, 'included'], ['excluded', 'version: 1\ndefaults: { paths: { exclude: ["**"] } }\n', 'excluded'], ['unavailable', 503, 'unavailable'], ['restored', currentPolicy, 'included']]) {
      github.state.policyFiles.set(repository, contents);
      await go('/files?s=parser-guild%2Fparser-lab&per=90d'); await settled();
      const link = page.locator('[data-fixture-file-link="src/index.ts"]');
      const href = await link.getAttribute('href');
      retainedHref ??= href;
      check(`${name} policy preserves the same observed opaque file action`, href === retainedHref);
      await link.focus(); await page.keyboard.press('Enter');
      await page.locator('[data-file-read]').waitFor(); await settled();
      const facts = page.locator('[data-fixture-inclusion]');
      const changed = await facts.getAttribute('data-fixture-observed-changed');
      observedChanged ??= changed;
      check(`${name} policy reaches retained detail with truthful interpretation and unchanged facts`, new URL(page.url()).pathname === new URL(retainedHref, ORIGIN).pathname
        && await facts.getAttribute('data-fixture-inclusion') === inclusion && changed !== null && changed === observedChanged
        && await facts.getAttribute('data-fixture-policy-basis') === (inclusion === 'unavailable' ? 'unfiltered-base-facts' : 'current-policy')
        && await page.locator('[data-file-read]').getAttribute('data-file-identity') === 'src/index.ts');
      const basis = page.locator('[data-current-policy-basis]');
      const unavailable = page.locator('[data-current-policy-unavailable]');
      check(`${name} File detail explains current policy or its unavailable state`, inclusion === 'unavailable'
        ? await unavailable.isVisible() && await page.getByRole('link', { name: 'Retry current policy', exact: true }).count() === 1
        : await basis.count() === 1 && (await basis.innerText()).includes(`.diffdevil.yml@${'d'.repeat(40)}`));
      const documentUrl = new URL(retainedHref, ORIGIN); documentUrl.searchParams.set('render', 'document');
      const document = await page.request.get(documentUrl.href);
      const documentBody = await document.text();
      check(`${name} retained file has a real complete document, not just a successful shell`, document.status() === 200
        && documentBody.includes('data-file-read'));
      check(`${name} complete File-detail document carries exactly one matching policy notice`, inclusion === 'unavailable'
        ? (documentBody.match(/data-current-policy-unavailable/gu)?.length ?? 0) === 1
        : (documentBody.match(/data-current-policy-basis/gu)?.length ?? 0) === 1
          && documentBody.includes(`.diffdevil.yml@${'d'.repeat(40)}`));
      if (inclusion === 'unavailable') {
        if (name === 'unavailable') await shot('current-policy-unavailable-file-detail');
        github.state.policyFiles.set(repository, currentPolicy);
        await page.getByRole('link', { name: 'Retry current policy', exact: true }).click();
        await page.locator('[data-file-read]').waitFor(); await settled();
        check('File-detail retry recovers policy without losing file, scope or period', new URL(page.url()).pathname === new URL(retainedHref, ORIGIN).pathname
          && new URL(page.url()).searchParams.get('s') === repository && new URL(page.url()).searchParams.get('per') === '90d'
          && await page.locator('[data-current-policy-unavailable]').count() === 0
          && await page.locator('[data-current-policy-basis]').count() === 1
          && await page.locator('[data-file-read]').getAttribute('data-file-identity') === 'src/index.ts');
      }
      if (name === 'excluded') await shot('current-policy-excluded-file-detail');
    }
    github.state.policyFiles.delete(repository);
    let releaseFilePolicy;
    github.state.policyGate = new Promise(resolve => { releaseFilePolicy = resolve; });
    try {
      await page.goto(`${ORIGIN}${retainedHref}`, { waitUntil: 'domcontentloaded' });
      await page.locator('[data-analytical-loading]').waitFor();
      await page.locator('[data-pending-file-head]').waitFor();
      const pendingFacts = {
        url: page.url(), navCount: await page.locator('[data-nav]').count(),
        title: await page.locator('[data-pending-file-head] h1').innerText(),
        scope: await page.locator('[data-pending-file-head] .a-scope').innerText(),
        regionCount: await page.locator('[data-premium-region="file-body"]').count(),
        regionState: await page.locator('[data-premium-region="file-body"]').getAttribute('data-pending'),
        fileReadCount: await page.locator('[data-file-read]').count()
      };
      check('deferred File detail keeps its prompt title, navigation and selected scope and period', pendingFacts.navCount === 1
        && pendingFacts.title === 'File history' && /parser-guild\/parser-lab\s*·\s*90 days/u.test(pendingFacts.scope)
        && pendingFacts.regionCount === 1 && ['true', 'loading'].includes(pendingFacts.regionState) && pendingFacts.fileReadCount === 0, JSON.stringify(pendingFacts));
      await page.locator('[data-pending-file-head]').getByRole('link', { name: 'Files', exact: true }).click();
      await page.waitForURL(url => url.pathname === '/files' && url.searchParams.get('s') === repository && url.searchParams.get('per') === '90d');
    } finally { github.state.policyGate = null; releaseFilePolicy(); }
    await settled();
    check('a held File-detail answer cannot replace a later Files navigation', new URL(page.url()).pathname === '/files'
      && new URL(page.url()).searchParams.get('s') === repository && new URL(page.url()).searchParams.get('per') === '90d');
  }
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
  if (joined) {
    for (const path of ['/', '/history']) {
      await go(`${path}?s=parser-guild%2Fparser-lab&per=90d`);
      await settled();
      check(`${path} keeps the shared trusted policy notice through premium enrichment`, await page.locator('[data-current-policy-basis]').count() === 1
        && (await page.locator('[data-current-policy-basis]').innerText()).includes('.diffdevil.yml@' + 'c'.repeat(40)));
    }
    await go('/files?s=parser-guild%2Fparser-lab&per=90d');
    await settled();
    check('deferred Files displays the trusted policy beside the acquired premium body', await page.locator('[data-current-policy-basis]').count() === 1
      && (await page.locator('[data-current-policy-basis]').allTextContents()).join('').includes('.diffdevil.yml@' + 'c'.repeat(40)));
    await shot('current-policy-deferred-files-trusted');
    const document = await page.request.get(`${ORIGIN}/files?s=parser-guild%2Fparser-lab&per=90d&render=document`);
    check('the complete Files document carries one policy basis without client acquisition', document.ok()
      && (await document.text()).match(/data-current-policy-basis/gu)?.length === 1);
  }
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
  check('PR detail retains the shared current-policy basis', await page.locator('[data-current-policy-basis]').count() === 1);
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
  if (joined) {
    await go('/files?s=parser-guild%2Fparser-lab&per=90d');
    await settled();
    check('deferred Files preserves its body with an honest unavailable notice and retry', await page.locator('[data-current-policy-unavailable]').count() === 1
      && await page.getByRole('link', { name: 'Retry current policy', exact: true }).count() === 1
      && await page.locator('[data-premium-region="files-body"] [data-chart].is-mounted').count() > 0);
    await shot('current-policy-deferred-files-unavailable');
  }
  github.state.policyFiles.delete(repository);
  await page.getByRole('link', { name: 'Retry current policy', exact: true }).click();
  await page.waitForFunction(() => !document.querySelector('[data-analytical-loading]'));
  check('retry recovers in the selected repository and period', new URL(page.url()).searchParams.get('s') === repository
    && new URL(page.url()).searchParams.get('per') === '90d' && await page.locator('[data-current-policy-unavailable]').count() === 0);
  if (joined) {
    await settled();
    check('Files policy retry reaches the acquired body and removes the old failure', new URL(page.url()).pathname === '/files'
      && await page.locator('[data-current-policy-basis]').count() === 1 && await page.locator('[data-current-policy-unavailable]').count() === 0);
  }
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
