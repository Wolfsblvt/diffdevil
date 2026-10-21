// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyticalRecords, NOW } from '../qa/fixture.mjs';
import { COMMERCIAL_BETA, QA_CAMPAIGN } from '../qa/participation.mjs';
import { readCampaign, windowOf } from '../src/lib/participation/campaign.mjs';

test('the Pro Files fixture includes a recent isolated file and positive co-change examples', () => {
  const records = analyticalRecords().records.filter(record => record.repositoryId === 1001 && record.final);
  const soloPath = 'src/independent-parser.ts';
  const soloRecords = records.filter(record => record.final.report.files.some(file => file.path === soloPath));
  const solo = soloRecords[0];
  const recentCutoff = Date.parse(NOW) - 90 * 86_400_000;

  assert.equal(soloRecords.length, 1);
  assert.equal(solo.final.report.files.length, 1);
  assert.ok(Date.parse(solo.mergedAt) >= recentCutoff);
  assert.ok(records.some(record => Date.parse(record.mergedAt) >= recentCutoff && record.final.report.files.length > 1));
});

test('the participation fixture preserves beta and campaign window boundaries around the real run date', () => {
  const now = Date.now();
  const beta = COMMERCIAL_BETA.betaGrants[0].access_windows[0];
  const campaign = readCampaign(QA_CAMPAIGN);
  const betaStart = Date.parse(`${beta.started_on}T00:00:00.000Z`);
  const betaEnd = Date.parse(`${beta.until}T00:00:00.000Z`);
  const insideBeta = at => at >= betaStart && at < betaEnd;
  const daysRemaining = (betaEnd - Date.parse(`${new Date(now).toISOString().slice(0, 10)}T00:00:00.000Z`)) / 86_400_000;

  assert.equal(insideBeta(betaStart - 1), false, 'the exclusive start boundary leaves earlier use outside beta access');
  assert.equal(insideBeta(now), true, 'the current UTC run date is inside the beta grant');
  assert.equal(insideBeta(betaEnd), false, 'the exclusive end boundary leaves later use outside beta access');
  assert.equal(COMMERCIAL_BETA.betaGrants[0].remaining_units, daysRemaining, 'remaining native time derives from the same run-date basis');
  assert.equal(COMMERCIAL_BETA.betaGrants[0].remaining_units, 15, 'the midpoint of the thirty-day run-relative grant has fifteen days left');
  assert.equal(COMMERCIAL_BETA.commercial.period.started_on, beta.started_on);
  assert.equal(COMMERCIAL_BETA.commercial.period.ends_on, beta.until);

  const beforeCampaign = new Date(Date.parse(campaign.opensAt) - 1).toISOString();
  const afterCampaign = new Date(Date.parse(campaign.closesAt)).toISOString();
  assert.equal(windowOf(campaign, beforeCampaign), 'not-open');
  assert.equal(windowOf(campaign, new Date(now).toISOString()), 'open');
  assert.equal(windowOf(campaign, afterCampaign), 'closed');
  assert.equal(COMMERCIAL_BETA.participation.campaign.claim_closes_at, campaign.closesAt);
});
