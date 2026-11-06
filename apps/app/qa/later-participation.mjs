// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/** Built-Worker synthetic journeys. No real participant, earning, capacity, provider or payment is exercised. */
import { ACTIVITIES } from '../src/lib/participation/survey.mjs';
import { rewardForms } from '../tests/fixtures/reward-forms.mjs';
import { COMMERCIAL_BETA, QA_CAMPAIGN } from './participation.mjs';

export const LATER_CAMPAIGNS = Object.entries(ACTIVITIES).map(([survey, activity]) => ({ ...QA_CAMPAIGN,
  key: `qa-later-${survey}`, survey, name: activity.name, participantUserId: 123 }));
const formFor = { 'return-v1': 'continuous', 'walkthrough-v1': 'time', 'quote-review-v1': 'protectedPrice', 'ongoing-v1': 'finite', 'organisation-v1': 'component' };
const rewards = LATER_CAMPAIGNS.map(campaign => {
  const reward = rewardForms(campaign.key)[formFor[campaign.survey]];
  reward.id = `qa-reward-${campaign.survey}`;
  reward.basis.campaign.name = campaign.name;
  reward.basis.campaign.reason = ACTIVITIES[campaign.survey].reason;
  if (campaign.survey === 'return-v1') {
    reward.state = 'active';
    for (const option of [reward.basis.alternatives[0], reward.alternatives[0]]) { option.unit = 'fixed'; option.value = 100; option.standing = 'active'; }
  }
  if (campaign.survey === 'ongoing-v1') for (const option of [reward.basis.alternatives[0], reward.alternatives[0]]) { option.value = 20; option.remaining_uses = 6; }
  if (campaign.survey === 'organisation-v1') for (const option of [reward.basis.alternatives[0], reward.alternatives[0]]) {
    option.name = 'Additional organisation capacity'; option.reason = 'Funded by your Organisation setup thank-you reward.';
  }
  return { campaign: campaign.key, version: campaign.version, reward };
});
export const LATER_COMMERCIAL = { ...COMMERCIAL_BETA,
  capacity: [{ slot: 'slot-included', funding: 'included', binding: null }, { slot: 'reward-component:1', funding: 'grant', binding: null }],
  fundedComponents: [{ component_id: 'reward-component:1', funding: 'participation-reward', component_kind: 'paid-subject', capacity_type: 'organisation',
    name: 'Additional organisation capacity', reason: 'Funded by your Organisation setup thank-you reward.', state: 'active', starts_on: '2026-10-20', ends_on: '2026-11-19', application_deadline: null }],
  participation: { ...COMMERCIAL_BETA.participation, activities: rewards } };

export async function laterParticipationJourney({ page, go, check, shot, ORIGIN }) {
  // A full-page screenshot taken after native focus scrolling otherwise places fixed chrome mid-image.
  const capture = async name => { await page.evaluate(() => window.scrollTo(0, 0)); await shot(name); };
  const path = survey => `/manage/plan/survey?activity=${LATER_CAMPAIGNS.find(campaign => campaign.survey === survey).key}`;
  const fill = async () => {
    for (const field of await page.locator('[data-survey-form] textarea').all()) await field.fill(`Synthetic task account for ${await field.getAttribute('name')}. This is a fixture, not real activity.`);
  };
  await go('/manage/plan');
  check('all five contextual activities are discoverable in the accepted Manage composition', await page.locator('[data-activities] dt a').count() === 5);
  check('the original A/B survey remains separate', await page.locator('a[href="/manage/plan/survey"]').count() > 0);
  await go(path('return-v1'));
  check('the controlled return activity records a separate structured account without machine-verifying commercial history', await page.getByRole('button', { name: 'Complete this contribution' }).isEnabled()
    && /not automatic proof/u.test(await page.locator('.m-stack').innerText()));
  await fill();
  await page.getByRole('button', { name: 'Save and finish later' }).click();
  await page.waitForURL(/m=survey-saved/u);
  await page.locator('textarea[name="continuity"]').focus();
  await page.keyboard.press('End'); await page.keyboard.type(' Retained while waiting.');
  check('the separate private return draft remains editable with keyboard focus in place', await page.locator('textarea[name="continuity"]:focus').count() === 1
    && (await page.locator('textarea[name="continuity"]').inputValue()).endsWith('Retained while waiting.'));
  await capture('later-return-private-draft');
  await page.getByRole('button', { name: 'Save and finish later' }).click();
  await page.waitForURL(/m=survey-saved/u);
  await go(path('quote-review-v1'));
  check('quote review waits for an actual recorded quote', await page.getByRole('button', { name: 'Complete this contribution' }).isDisabled());
  await page.getByRole('button', { name: 'Request monthly quote' }).click();
  await page.waitForURL(/m=preview-ready/u);
  check('an explicitly requested native-shaped quote is rendered before feedback', await page.locator('[data-activity-quote]').getByRole('group', { name: /^Issued /u }).count() === 1
    && await page.getByRole('button', { name: 'Complete this contribution' }).isEnabled());
  await capture('later-quote-reviewed');
  await fill();
  await page.getByRole('button', { name: 'Complete this contribution' }).click();
  await page.waitForURL(/m=survey-completed/u);
  check('quote feedback completes its own response', await page.locator('[data-survey-answers]').count() === 1);
  await go(path('return-v1'));
  check('quote completion does not complete or overwrite the separate return response', await page.locator('textarea[name="continuity"]').inputValue().then(value => value.endsWith('Retained while waiting.'))
    && await page.locator('[data-survey-answers]').count() === 0);
  await page.getByRole('button', { name: 'Complete this contribution' }).click();
  await page.waitForURL(/m=survey-completed/u);
  check('its own completion renders Wirt-owned Return journey standing with no scheduled end', await page.locator('[data-reward]').innerText().then(value => /Return journey thank-you.*€1 off.*No scheduled end/isu.test(value)));
  await capture('later-return-completed');
  await page.request.post(`${ORIGIN}/manage/do`, { form: { action: 'fixture-simulate', kind: 'wirt:unavailable' }, headers: { origin: ORIGIN } });
  await go(path('walkthrough-v1'));
  await fill();
  await page.getByRole('button', { name: 'Complete this contribution' }).click();
  await page.waitForURL(/m=survey-completed/u);
  check('completion stays durable and independently usable while Works is unavailable', await page.locator('[data-survey-answers]').count() === 1
    && /pending|on its way/u.test(await page.locator('[data-reward]').innerText()));
  await capture('later-walkthrough-delivery-pending');
  await go('/manage/plan');
  check('a pending reward leaves Plan navigation and other activities usable', await page.locator('[data-activities] dt a').count() === 5 && await page.locator('[data-funds]').count() === 1);
  await page.request.post(`${ORIGIN}/manage/do`, { form: { action: 'fixture-simulate', kind: 'wirt:recorded' }, headers: { origin: ORIGIN } });
  await go(path('ongoing-v1')); await fill();
  await page.getByRole('button', { name: 'Complete this contribution' }).click();
  await page.waitForURL(/m=survey-completed/u);
  check('ongoing contribution renders its own six-renewal reward', await page.locator('[data-reward]').innerText().then(text => /20% off.*6 monthly renewals/isu.test(text)));
  await go(path('organisation-v1'));
  check('organisation form reports Active unbound without restarting its calendar', await page.getByRole('button', { name: 'Complete this contribution' }).isDisabled()
    && /Active unbound.*calendar continues/isu.test(await page.locator('.m-stack').innerText()));
  await capture('later-organisation-unbound');
  await go('/manage/plan');
  const capacity = page.locator('.m-org').filter({ has: page.locator('input[name="slot"][value="reward-component:1"]') });
  await capacity.locator('select[name="organisation"]').selectOption('7001');
  await capacity.getByRole('button', { name: 'Fund', exact: true }).click();
  await page.waitForURL(/m=bound/u);
  await go(path('organisation-v1')); await fill();
  check('the actual binding route stays usable without bypassing the unresolved programme-unit premise', await page.getByRole('button', { name: 'Complete this contribution' }).isDisabled()
    && /present organisation authority.*unit provenance/isu.test(await page.locator('.m-stack').innerText()));
  await page.getByRole('button', { name: 'Save and finish later' }).click();
  await page.waitForURL(/m=survey-saved/u);
  check('the additional organisation keeps its separate draft without claiming completion', await page.locator('textarea[name="authority"]').inputValue().then(value => value.includes('Synthetic task account'))
    && await page.locator('[data-survey-answers]').count() === 0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await go(path('organisation-v1'));
  check('reduced motion preserves the waiting draft and keyboard action', await page.locator('textarea[name="authority"]').inputValue().then(value => value.includes('Synthetic task account'))
    && await page.getByRole('button', { name: 'Save and finish later' }).isEnabled());
  await capture('later-organisation-reduced-motion');
}
