// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compilePolicy, unwrap } from '@wolfsblvt/diffdevil';
import { createAnalyticalDataService } from './analytical-data.mjs';
import { actor, record, query, to } from './analytical-data.fixtures.mjs';

const scope = { kind: 'repository', repositoryId: 17 };
const filesQuery = () => query('files', { scope });
const fileQuery = () => query('file', { scope, path: 'a.txt' });

function fixture() {
  const state = { readable: true, access: true, reads: 0, populations: 0, duringDetail: () => {},
    policy: { id: 'current', compiled: unwrap(compilePolicy({ version: 1, presets: ['size@1'] })) } };
  const rows = [record(), record(2, null)];
  const service = createAnalyticalDataService({
    store: {
      analyticalRecords: async () => { state.reads++; return state.readable ? structuredClone(rows) : []; },
      historySettings: async () => ({ readable: state.readable })
    },
    authorize: async () => state.access, entitlement: async () => 'pro', namespace: async () => 9,
    currentPolicy: async () => state.policy, now: () => to,
    premium: {
      async files({ merged }) {
        state.populations++;
        return { files: merged.flatMap(row => row.facts.report?.files.map(file => ({ repositoryId: row.repositoryId, path: file.path,
          changed: file.lines.changed, included: file.included })) ?? []), sizeObservation: [{ repositoryId: 17, standing: 'unavailable' }] };
      },
      async file({ query, files }) {
        state.duringDetail();
        const file = files.find(row => row.path === query.path);
        return file ? { file } : undefined;
      }
    }
  });
  return { service, state };
}

test('one server file view enriches its full population once and returns the same detail as an independent query', async () => {
  const { service, state } = fixture();
  const source = await service.query(filesQuery(), actor);
  const continued = await service.query(fileQuery(), actor, source);
  assert.equal(state.reads, 1);
  assert.equal(state.populations, 1);
  assert.equal(continued.coverage.merged, 2);
  assert.equal(continued.coverage.recoveredMerged, 1);
  assert.deepEqual(continued, await service.query(fileQuery(), actor));
});

test('a changed period, reader, metric or policy gets a fresh file population', async () => {
  for (const change of ['period', 'reader', 'metric', 'policy']) {
    const { service, state } = fixture();
    const source = await service.query(filesQuery(), actor);
    const input = fileQuery();
    if (change === 'period') input.from = '2026-08-01T00:00:00.000Z';
    if (change === 'metric') input.metric = 'changed';
    if (change === 'policy') state.policy = { ...state.policy, compiled: unwrap(compilePolicy({ version: 1 })) };
    await service.query(input, change === 'reader' ? { ...actor } : actor, source);
    assert.equal(state.reads, 2, change);
    assert.equal(state.populations, 2, change);
  }
});

test('serialized or another service\'s responses cannot carry a file continuation', async () => {
  const { service, state } = fixture();
  const source = await service.query(filesQuery(), actor);
  await service.query(fileQuery(), actor, structuredClone(source));
  assert.equal(state.populations, 2);
  const other = fixture();
  await other.service.query(fileQuery(), actor, source);
  assert.equal(other.state.populations, 1);
});

test('access or readable history lost before or during a continuation exposes no file result', async () => {
  for (const change of ['access-before', 'access-during', 'history-before', 'history-during']) {
    const { service, state } = fixture();
    const source = await service.query(filesQuery(), actor);
    if (change === 'access-before') state.access = false;
    if (change === 'history-before') state.readable = false;
    if (change === 'access-during') state.duringDetail = () => { state.access = false; };
    if (change === 'history-during') state.duringDetail = () => { state.readable = false; };
    await assert.rejects(service.query(fileQuery(), actor, source), { code: change.startsWith('access') ? 'E_APP_DATA_UNAUTHORIZED' : 'E_APP_DATA_NOT_FOUND' }, change);
  }
});
