// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyticalRecords, NOW } from '../qa/fixture.mjs';

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
