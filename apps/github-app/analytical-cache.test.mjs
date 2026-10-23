// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compilePolicy, unwrap } from '@wolfsblvt/diffdevil';
import { createAnalyticalCache } from './analytical-cache.mjs';
import { createAnalyticalDataService } from './analytical-data.mjs';
import { record } from './analytical-data.fixtures.mjs';
import { createContextCache } from '../app/src/lib/viewer.mjs';

test('distinct live interpretations remain bounded after 2,000 entries, with amortized eviction work', () => {
  const cache = createAnalyticalCache({ now: () => 0 });
  // Count visited map candidates rather than machine-dependent elapsed time. The old all-live prune visits 48M.
  let visits = 0;
  const originals = [Symbol.iterator, 'entries', 'keys', 'values'].map(method => [method, Map.prototype[method]]);
  for (const [method, original] of originals) {
    Map.prototype[method] = function (...args) {
      const iterator = original.apply(this, args);
      return { next(...input) { visits++; return iterator.next(...input); }, [Symbol.iterator]() { return this; } };
    };
  }
  const before = visits;
  try {
    for (let index = 0; index < 10_000; index++) cache.memo(`interpretation:${index}`, () => Object.freeze({ changed: index }));
  } finally {
    for (const [method, original] of originals) Map.prototype[method] = original;
  }
  const traversed = visits - before;
  assert.ok(traversed < 50_000, `insertion must not repeatedly scan the live set (${traversed} visits)`);
  assert.equal(cache.usage().entries, 2000);
  assert.ok(cache.usage().weightBytes <= cache.usage().maxBytes);
  assert.deepEqual(cache.memo('interpretation:9999', () => { throw new Error('warm tail was lost'); }), { changed: 9999 });
  let recomputed = false;
  assert.deepEqual(cache.memo('interpretation:0', () => { recomputed = true; return { changed: 0 }; }), { changed: 0 });
  assert.equal(recomputed, true, 'eviction drops only reuse, not the ability to calculate the same value');
});

test('weight, oversized keys/values, fixed expiry and failures leave complete computation available', () => {
  let clock = 0;
  const cache = createAnalyticalCache({ now: () => clock, maxBytes: 4000, maxEntryBytes: 2000 });
  const value = Object.freeze({ text: 'λ'.repeat(400) });
  for (const key of ['a', 'b', 'c']) assert.equal(cache.memo(key, () => value), value);
  assert.equal(cache.usage().entries, 2, 'bytes evict before the entry-count ceiling');
  assert.ok(cache.usage().weightBytes <= 4000);
  assert.equal(cache.memo('c', () => { throw new Error('expected warm hit'); }), value);
  const retained = cache.usage();
  let oversized = 0;
  for (let index = 0; index < 2; index++) {
    assert.equal(cache.memo('large-value', () => { oversized++; return { text: 'x'.repeat(2000) }; }).text.length, 2000);
    assert.equal(cache.memo('x'.repeat(2000), () => { oversized++; return value; }), value);
  }
  assert.equal(oversized, 4, 'oversized work is returned but never retained');
  assert.deepEqual(cache.usage(), retained, 'a bypass cannot flush useful small entries');
  assert.throws(() => cache.memo('failure', () => { throw new Error('retry'); }), /retry/);
  assert.equal(cache.memo('failure', () => 3), 3);
  clock = 60_000;
  assert.equal(cache.memo('c', () => 4), 4, 'a hit never extends the original lifetime');
  assert.equal(cache.usage().entries, 1, 'one expiry pass removes the expired prefix');
  cache.clear();
  assert.equal(cache.usage().entries, 0);
  assert.equal(cache.usage().weightBytes, 0);
});

test('a broad retained-history read keeps its entire answer when its interpretations exceed retention', async () => {
  const original = record();
  const rows = Array.from({ length: 2505 }, (_, index) => ({ ...original, pullRequest: index + 1,
    final: { ...original.final, report: { ...original.final.report, reportId: `retained-comparison:${index}` } } }));
  const compiled = unwrap(compilePolicy({ version: 1, presets: ['size@1'] }));
  const cache = createAnalyticalCache();
  let computations = 0;
  const interpretationCache = { memo: (key, compute) => cache.memo(key, () => { computations++; return compute(); }) };
  const service = cache => createAnalyticalDataService({ store: { analyticalRecords: async () => structuredClone(rows) },
    authorize: async () => true, entitlement: async () => 'free', namespace: async () => 9,
    currentPolicy: async () => ({ compiled }), interpretationCache: cache, now: () => '2026-10-01T00:00:00.000Z' });
  const query = { version: 1, surface: 'overview', repositoryIds: [17], from: '2026-09-01T00:00:00.000Z', to: '2026-10-01T00:00:00.000Z' };
  const actor = { authorizedRepositoryIds: [17] };
  const answer = await service(interpretationCache).query(query, actor);
  assert.equal(computations, 2505, 'every distinct live interpretation was reached');
  assert.equal(answer.coverage.merged, 2505);
  assert.deepEqual(answer, await service().query(query, actor));
  assert.ok(cache.usage().entries <= 2000);
  assert.ok(cache.usage().weightBytes <= cache.usage().maxBytes);
  const detail = pullRequest => ({ ...query, surface: 'pr', pullRequest });
  const before = computations;
  assert.deepEqual(await service(interpretationCache).query(detail(2505), actor), await service().query(detail(2505), actor));
  assert.equal(computations, before, 'a retained interpretation remains useful across fresh service compositions');
  assert.deepEqual(await service(interpretationCache).query(detail(1), actor), await service().query(detail(1), actor));
  assert.equal(computations, before + 1, 'an evicted interpretation recomputes the complete detail');
});

test('analytical pressure leaves provider context, pending coalescing, expiry and retry independent', async () => {
  let clock = 0, loads = 0, release;
  const provider = createContextCache(() => clock), analytical = createAnalyticalCache();
  const pending = provider.get('profile:123', () => { loads++; return new Promise(resolve => { release = resolve; }); });
  await Promise.resolve();
  for (let index = 0; index < 10_000; index++) analytical.memo(`report:${index}`, () => ({ changed: index }));
  const concurrent = provider.get('profile:123', () => { throw new Error('lost pending provider read'); });
  release({ login: 'reader' });
  assert.deepEqual(await pending, await concurrent);
  assert.equal(loads, 1);
  analytical.clear();
  assert.deepEqual(await provider.get('profile:123', () => { throw new Error('analytical clear removed provider context'); }), { login: 'reader' });
  clock = 60_001;
  assert.deepEqual(await provider.get('profile:123', () => ({ login: 'current' })), { login: 'current' });
  await assert.rejects(provider.get('failed', () => { throw new Error('provider unavailable'); }), /provider unavailable/);
  assert.equal(await provider.get('failed', () => 'recovered'), 'recovered');
});
