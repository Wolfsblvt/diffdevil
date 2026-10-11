// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { Miniflare } from 'miniflare';
import { D1AppStore } from './storage.mjs';
import { turnoverEvidence, fileContinuity } from './turnover-v1.mjs';
import { record, base, head, at } from './analytical-data.fixtures.mjs';
import { sizeCaptureGroups } from './size-capture-groups.mjs';

const order = rows => rows.toSorted((a, b) => JSON.stringify([a.path, a.observedAt, a.revision, a.size])
  .localeCompare(JSON.stringify([b.path, b.observedAt, b.revision, b.size])));
const stamp = day => `2026-09-${String(day).padStart(2, '0')}T00:00:00.000Z`;
const oldWindow = `SELECT s.path,s.observed_at,s.revision,s.size FROM baseline_sizes s WHERE s.repository_id=?
  AND (s.observed_at BETWEEN ? AND ?
    OR s.observed_at=(SELECT MAX(p.observed_at) FROM baseline_sizes p WHERE p.repository_id=s.repository_id AND p.path=s.path AND p.observed_at<=? AND (p.expires_at IS NULL OR p.expires_at>?))
    OR s.observed_at=(SELECT MIN(p.observed_at) FROM baseline_sizes p WHERE p.repository_id=s.repository_id AND p.path=s.path AND p.observed_at>=? AND (p.expires_at IS NULL OR p.expires_at>?)))
  AND (s.expires_at IS NULL OR s.expires_at>?) ORDER BY s.observed_at`;

// D1's own accounting, not elapsed time or a modeled row count, supplies the improvement evidence.
function metered(database, tally) {
  const raw = new WeakMap();
  const measure = result => {
    tally.read += result.meta?.rows_read ?? 0; tally.written += result.meta?.rows_written ?? 0;
    if (result.meta?.size_after) tally.bytes = result.meta.size_after;
    return result;
  };
  const wrap = statement => {
    const proxy = new Proxy(statement, { get(target, key) {
      if (key === 'bind') return (...values) => wrap(target.bind(...values));
      if (key === 'run' || key === 'all') return async (...values) => measure(await target[key](...values));
      if (key === 'first') return async column => { const row = measure(await target.all()).results?.[0] ?? null; return column === undefined ? row : row?.[column] ?? null; };
      const value = target[key]; return typeof value === 'function' ? value.bind(target) : value;
    } });
    raw.set(proxy, statement); return proxy;
  };
  return { prepare: sql => wrap(database.prepare(sql)), batch: async statements => (await database.batch(statements.map(row => raw.get(row)))).map(measure) };
}

test('shared snapshots preserve migration, every window row, turnover, first-writer identity and deletion while removing repeated facts', async t => {
  const runtime = new Miniflare({ workers: [{ config: { name: 'shared-sizes', type: 'worker', compatibilityDate: '2026-09-17',
    env: { APP_DB: { type: 'd1', id: `sizes-${crypto.randomUUID()}` } }, manifest: { mainModule: 'worker.mjs', modulesRoot: resolve('.'),
      modules: { 'worker.mjs': { type: 'esm', contents: 'export default { fetch() { return new Response("ok"); } };' } } } } }] });
  try {
    const database = await runtime.getD1Database('APP_DB'), tally = { read: 0, written: 0 }, clock = { value: at };
    const store = new D1AppStore(metered(database, tally), { now: () => clock.value });
    const migrations = (await readdir('apps/github-app/migrations')).sort();
    for (const name of migrations.filter(name => name < '0016')) await store.migrate(await readFile(`apps/github-app/migrations/${name}`, 'utf8'));
    await store.recordLifecycle({ installationId: 9, action: 'created', addedRepositories: [17, 18], removedRepositories: [] });
    for (const id of [17, 18]) await store.setRepositoryConsent(id, { enabled: true, retentionDays: 30, origin: 'fixture' });
    const legacy = [
      ['a.txt', stamp(1), base, 100, stamp(28)], ['a.txt', stamp(4), base, 100, stamp(28)],
      ['a.txt', stamp(8), head, 103, stamp(28)], ['a.txt', stamp(20), head, 103, stamp(28)],
      ['a.txt', stamp(21), head, 103, null], ['unknown.txt', stamp(2), base, null, stamp(28)],
      ['unicode/ä.txt', stamp(4), base, 0, stamp(28)], ['a.txt', stamp(3), 'f'.repeat(40), null, stamp(14)],
      ['a.txt', stamp(8), '0'.repeat(40), 99, stamp(28)]
    ];
    await database.batch(legacy.map(row => database.prepare('INSERT INTO analytical_file_sizes VALUES (17,?,?,?,?,?)').bind(...row)));
    await database.prepare('CREATE TABLE baseline_sizes AS SELECT * FROM analytical_file_sizes').run();
    const before = await database.prepare('SELECT * FROM analytical_file_sizes ORDER BY path,observed_at,revision').all();
    await store.migrate(await readFile('apps/github-app/migrations/0016_shared_size_observations.sql', 'utf8'));
    assert.deepEqual((await database.prepare('SELECT * FROM analytical_file_sizes ORDER BY path,observed_at,revision').all()).results, before.results,
      'the retained-row migration keeps every identity, size (including null/zero), time and expiry');

    await t.test('actual old and new D1 window queries and turnover agree at and between all endpoints', async () => {
      const records = [record()];
      await store.recordAnalytical(records[0]);
      const continuity = fileContinuity(records);
      const contribution = { mergedAt: records[0].mergedAt, file: records[0].final.report.files[0], base, head,
        size: records[0].final.sizes[0] };
      for (const [start, end] of [[1, 4], [3, 7], [4, 8], [5, 19], [8, 21], [20, 22], [22, 25]]) {
        const window = { from: stamp(start), to: stamp(end) };
        const old = (await database.prepare(oldWindow).bind(17, window.from, window.to, window.from, clock.value, window.to, clock.value, clock.value).all()).results
          .map(row => ({ repositoryId: 17, path: row.path, observedAt: row.observed_at, revision: row.revision, size: row.size }));
        const current = await store.analyticalSizes(17, window.from, window.to);
        assert.deepEqual(order(current), order(old), `complete sizeHistory for ${start}..${end}`);
        assert.deepEqual(current.filter(row => row.path === 'a.txt'), old.filter(row => row.path === 'a.txt'), 'same-time revisions retain their original order');
        const changes = [contribution].filter(row => row.mergedAt >= window.from && row.mergedAt < window.to);
        assert.deepEqual(turnoverEvidence(changes, window, current.filter(row => row.path === 'a.txt'), (a, b, since) => continuity(a, b, since, 'a.txt')),
          turnoverEvidence(changes, window, old.filter(row => row.path === 'a.txt'), (a, b, since) => continuity(a, b, since, 'a.txt')));
      }
    });

    await t.test('repeated sets across events and revisions share facts and keep the full export and latest capture evidence', async () => {
      const paths = Array.from({ length: 100 }, (_, index) => `src/file-${String(index).padStart(3, '0')}.ts`);
      tally.written = 0;
      for (let day = 1; day <= 12; day++) {
        clock.value = stamp(day);
        await store.recordAnalyticalSizes(paths.map(path => ({ repositoryId: 18, path, observedAt: clock.value,
          revision: day < 6 ? base : head, size: 100 })));
      }
      const written = tally.written;
      assert.ok(written < 1200, `actual rows written ${written}; original per-path law would write 3,600`);
      const groups = sizeCaptureGroups(paths).length;
      assert.equal((await database.prepare('SELECT COUNT(*) AS n FROM analytical_size_facts WHERE repository_id=18').first()).n, groups);
      assert.equal((await database.prepare('SELECT COUNT(*) AS n FROM analytical_size_observations WHERE repository_id=18').first()).n, 12 * groups);
      assert.equal((await store.exportAnalytical(18)).sizes.length, 1200, 'every intermediate timestamp is retained');
      assert.equal((await store.analyticalSizes(18, stamp(2), stamp(11))).length, 1000);
      assert.equal((await store.analyticalSizesAt(18, head)).length, 700, 'the ordinary method retains its full logical contract');
      assert.ok((await store.analyticalSizesAt(18, head, { latest: true })).every(row => row.observedAt === stamp(12)));
      assert.equal((await store.analyticalSizesAt(18, head, { latest: true })).length, 100);
      t.diagnostic(`100 paths × 12 captures across two revisions: ${written} actual D1 rows written; ${groups} shared fact sets, ${12 * groups} markers, 1,200 exact logical observations.`);
      const original = await store.exportAnalytical(18);
      const duplicate = paths.map(path => ({ repositoryId: 18, path, observedAt: stamp(12), revision: head, size: 999 }));
      assert.equal((await store.recordAnalyticalSizes(duplicate)).published, 0, 'an existing per-path/time/revision wins even under different grouping/values');
      await store.recordAnalyticalSizes([...duplicate, { repositoryId: 18, path: 'new.txt', observedAt: stamp(12), revision: head, size: null }]);
      assert.equal((await store.exportAnalytical(18)).sizes.length, 1201);
      await store.deleteHistory(18);
      assert.equal((await store.importAnalytical(original)).published, 0);
      assert.equal((await database.prepare('SELECT COUNT(*) AS n FROM analytical_size_facts WHERE repository_id=18').first()).n, 0);
      assert.deepEqual(await store.analyticalSizesAt(18, head, { latest: true }), []);
    });

    await t.test('concurrent overlapping sets retain each identity once and withdrawal before the batch writes no representation', async () => {
      const observation = (path, size) => ({ repositoryId: 17, path, observedAt: stamp(22), revision: head, size });
      const outcomes = await Promise.all([
        store.recordAnalyticalSizes([observation('race-a.txt', 1), observation('race-b.txt', 2)]),
        store.recordAnalyticalSizes([observation('race-b.txt', 3), observation('race-c.txt', 4)])
      ]);
      assert.equal(outcomes.reduce((total, result) => total + result.published, 0), 3);
      const stored = (await store.exportAnalytical(17)).sizes.filter(row => row.path.startsWith('race-'));
      assert.equal(stored.length, 3);
      let withdraw = true;
      const guarded = new D1AppStore({ prepare: sql => database.prepare(sql), batch: async statements => {
        if (withdraw) { withdraw = false; await database.prepare('UPDATE repositories SET history_enabled=0 WHERE repository_id=17').run(); }
        return database.batch(statements);
      } }, { now: () => clock.value });
      assert.equal((await guarded.recordAnalyticalSizes([observation('withdrawn.txt', 5)])).status, 'disabled');
      assert.equal((await database.prepare("SELECT COUNT(*) AS n FROM analytical_file_sizes WHERE path='withdrawn.txt'").first()).n, 0);
      assert.equal((await database.prepare("SELECT COUNT(*) AS n FROM analytical_size_facts WHERE facts_json LIKE '%withdrawn.txt%'").first()).n, 0);
      await store.setRepositoryConsent(17, { enabled: true, retentionDays: 30, origin: 'fixture' });
    });

    await t.test('a tombstone that expires between a refused batch and the consent read does not hold the retry on its old clock', async () => {
      const instant = '2026-09-12T00:00:00.000Z';
      clock.value = instant;
      let attempts = 0;
      const guarded = new D1AppStore({ prepare: sql => database.prepare(sql), batch: async statements => {
        if (++attempts > 3) throw new Error('retry made no progress');
        if (attempts === 1) await database.prepare('INSERT INTO deletion_tombstones(scope,deleted_at,reapply_until) VALUES (?,?,?)')
          .bind('history:17', instant, '2026-09-12T00:00:00.001Z').run();
        const result = await database.batch(statements);
        clock.value = '2026-09-12T00:00:00.002Z';
        return result;
      } }, { now: () => clock.value });
      assert.equal((await guarded.recordAnalyticalSize({ repositoryId: 17, path: 'clock.txt', revision: head, observedAt: instant, size: 7 })).status, 'published');
      assert.equal(attempts, 2);
    });

    await t.test('expiry drains more than one indexed batch and retains facts shared by an unexpired marker', async () => {
      await database.prepare(`WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<1001)
        INSERT INTO analytical_size_observations(repository_id,fact_key,observed_at,revision,expires_at)
        SELECT 17,(SELECT fact_key FROM analytical_size_facts WHERE repository_id=17
          AND facts_json='[{"path":"a.txt","size":100}]' LIMIT 1),printf('2025-%04d',x),?,? FROM n`).bind(base, stamp(13)).run();
      clock.value = stamp(15);
      await store.maintain();
      assert.equal((await database.prepare('SELECT COUNT(*) AS n FROM analytical_size_observations WHERE expires_at<=?').bind(clock.value).first()).n, 0);
      assert.equal((await database.prepare('SELECT COUNT(*) AS n FROM analytical_file_sizes WHERE repository_id=17').first()).n, 12);
      assert.ok((await store.exportAnalytical(17)).sizes.some(row => row.size === 100));
      const plans = (await database.prepare('EXPLAIN QUERY PLAN SELECT rowid FROM analytical_size_observations WHERE expires_at IS NOT NULL AND expires_at<=? ORDER BY expires_at LIMIT 1000').bind(clock.value).all()).results;
      assert.ok(plans.some(row => row.detail.includes('analytical_size_expiry')));
      const reuse = (await database.prepare('EXPLAIN QUERY PLAN SELECT fact_key,MAX(observed_at) FROM analytical_size_observations INDEXED BY analytical_size_revision WHERE repository_id=? AND revision=? GROUP BY fact_key').bind(17, base).all()).results;
      assert.ok(reuse.some(row => row.detail.includes('analytical_size_revision')));
    });
  } finally { await runtime.dispose(); }
});
