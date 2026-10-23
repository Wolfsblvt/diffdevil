// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/** Exercise namespace funding through the built shell, commercial adapter and analytical service. */
import { COMMERCIAL_PRO, COMMERCIAL_FREE } from './manage.mjs';

export async function namespaceFundingJourney({ page, check, go, settled, shot, github, restart }) {
  const baselineRoles = new Map(github.state.roles);
  try {
    for (const [name, spec, plan, role = 'admin'] of [
      ['unfunded-admin', { ...COMMERCIAL_PRO, capacity: [{ slot: 'slot-included', funding: 'included', binding: null }] }, 'Free'],
      ['funded-pro-admin', COMMERCIAL_PRO, 'Pro'],
      ['funded-business-admin', { ...COMMERCIAL_PRO, capacity: [], others: { 7001: 'business', 7002: 'business' } }, 'Business'],
      ['free-admin-funded-org', { ...COMMERCIAL_FREE, others: { 7001: 'pro', 7002: 'business' } }, 'Pro'],
      ['free-shared-reader', { ...COMMERCIAL_FREE, others: { 7001: 'pro', 7002: 'business' } }, 'Pro', 'member'],
      ['unknown-funding', { ...COMMERCIAL_PRO, capacity: [], others: { 7001: 'unknown', 7002: 'business' } }, 'Unknown']
    ]) {
      github.state.roles.set('parser-guild', role);
      await restart(spec);
      await go('/files?s=%40parser-guild&per=90d');
      await settled();
      const namespace = page.locator('[data-namespace="parser-guild"] .a-acct');
      const chips = await namespace.locator('.a-plan').allTextContents();
      check(`${name}: the organisation chip follows its funded standing`, plan === 'Free' || plan === 'Unknown' ? chips.length === 0 : chips.length === 1 && chips[0] === plan, JSON.stringify(chips));
      check(`${name}: the shared Business namespace keeps its plan`, (await page.locator('[data-namespace="northwind-tools"] .a-acct .a-plan').textContent()).trim() === 'Business');
      const personal = page.locator('[data-namespace="ada-sample"] .a-acct .a-plan');
      check(`${name}: personal subscription remains independent`, spec.linked ? (await personal.textContent()).trim() === 'Pro' : await personal.count() === 0);
      const main = await page.locator('#main').innerText();
      check(`${name}: Files uses the authoritative scope answer`, plan === 'Unknown' ? /File history unavailable/u.test(main) && !/What Pro adds|See Pro|not part of this build/u.test(main)
        : plan === 'Free' ? /What Pro adds/u.test(main) && !/This scope's plan includes/u.test(main) : /This scope's plan includes file history/u.test(main), main.slice(0, 450));
      if (name === 'unfunded-admin') {
        await go('/manage');
        check('unfunded admin: Manage and analytical navigation agree without binding the unused slot', /No plan|Unfunded/u.test(await page.locator('[data-namespace-row="parser-guild"]').innerText())
          && await page.locator('[data-namespace="parser-guild"] .a-acct .a-plan').count() === 0);
        await shot('unfunded-org-personal-pro-1440');
      }
      if (name === 'free-admin-funded-org') {
        await go('/files?per=90d');
        check('Free All repositories points to funded organisations regardless of administration', await page.locator('.a-pointers a[href*="parser-guild"]').count() === 1
          && await page.locator('.a-pointers a[href*="northwind-tools"]').count() === 1);
      }
      if (plan === 'Unknown') {
        check('unknown funding is named in navigation without a Files Pro offer', /Plan unavailable/u.test(await namespace.innerText())
          && await page.locator('.a-nav-sec a[href^="/files"] .a-plan').count() === 0);
        for (const path of ['/?s=%40parser-guild', '/history?s=%40parser-guild', '/pr/parser-guild/parser-lab/452?s=%40parser-guild', '/file/parser-guild/parser-lab/xxxxxxxxxxxxxxxxxxxxxx?s=%40parser-guild', '/files?s=parser-guild%2Fgrammar-fuzz']) {
          await go(`${path}&per=90d`);
          await settled();
          const content = await page.locator('#main').innerText();
          check(`unknown funding keeps a truthful premium state at ${path}`, /plan funding this scope could not be established/u.test(content)
            && await page.locator('#main .a-prohint, #main .a-plan').count() === 0 && !/What Pro adds|See Pro/u.test(content));
        }
        await shot('unknown-org-funding-1440');
      }
    }
  } finally {
    github.state.roles = baselineRoles;
  }
}
