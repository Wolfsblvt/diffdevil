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

test('the participation browser fixture remains inside its beta grant and campaign window on the real run date', () => {
  const now = Date.now();
  const beta = COMMERCIAL_BETA.betaGrants[0].access_windows[0];
  const campaign = readCampaign(QA_CAMPAIGN);

  assert.ok(Date.parse(`${beta.started_on}T00:00:00.000Z`) < now);
  assert.ok(Date.parse(`${beta.until}T00:00:00.000Z`) > now);
  assert.equal(windowOf(campaign, new Date(now).toISOString()), 'open');
  assert.ok(Date.parse(COMMERCIAL_BETA.participation.campaign.claim_closes_at) > now);
});
