// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { Miniflare } from 'miniflare';
import { compilePolicy, unwrap } from '@wolfsblvt/diffdevil';
import { D1AppStore } from './storage.mjs';
import { turnoverEvidence, fileContinuity } from './turnover-v1.mjs';
import { record, base, head, at, transition, revisions } from './analytical-data.fixtures.mjs';
import { createAnalyticalDataService } from './analytical-data.mjs';
import { D1AppReadStore } from '../app/src/lib/app-store.mjs';
import { loadView, loadSurface } from '../app/src/lib/view.mjs';
import { createContextCache } from '../app/src/lib/viewer.mjs';
import { createLocator } from '../app/src/lib/locator.mjs';
import { sizeCaptureGroups } from './size-capture-groups.mjs';
import { sizeHistoryRows } from './analytical-size-storage.mjs';

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
  const measure = (result, sql) => {
    tally.read += result.meta?.rows_read ?? 0; tally.written += result.meta?.rows_written ?? 0;
    tally.queries?.push({ sql, read: result.meta?.rows_read ?? 0, rows: result.results?.length ?? 0,
      valueBytes: Buffer.byteLength(JSON.stringify((result.results ?? []).map(Object.values))) });
    if (result.meta?.size_after) tally.bytes = result.meta.size_after;
    return result;
  };
  const wrap = (statement, sql) => {
    const proxy = new Proxy(statement, { get(target, key) {
      if (key === 'bind') return (...values) => wrap(target.bind(...values), sql);
      if (key === 'run' || key === 'all') return async (...values) => measure(await target[key](...values), sql);
      if (key === 'first') return async column => { const row = measure(await target.all(), sql).results?.[0] ?? null; return column === undefined ? row : row?.[column] ?? null; };
      const value = target[key]; return typeof value === 'function' ? value.bind(target) : value;
    } });
    raw.set(proxy, statement); return proxy;
  };
  return { prepare: sql => wrap(database.prepare(sql), sql), batch: async statements => (await database.batch(statements.map(row => raw.get(row)))).map(result => measure(result)) };
}

test('marker pagination seeks forward across the complete retained window, including same-time ties and expiry', async t => {
  const runtime = new Miniflare({ workers: [{ config: { name: 'paged-sizes', compatibilityDate: '2026-09-17',
    env: { APP_DB: { type: 'd1', id: `pages-${crypto.randomUUID()}` } }, manifest: { mainModule: 'worker.mjs', modulesRoot: resolve('.'),
      modules: { 'worker.mjs': { type: 'esm', contents: 'export default { fetch() { return new Response("ok"); } };' } } } } }] });
  try {
    const database = await runtime.getD1Database('APP_DB'), tally = { read: 0, written: 0, queries: [] };
    const store = new D1AppStore(metered(database, tally), { now: () => stamp(25) });
    for (const name of (await readdir('apps/github-app/migrations')).sort()) await store.migrate(await readFile(`apps/github-app/migrations/${name}`, 'utf8'));
    await store.recordLifecycle({ installationId: 9, action: 'created', addedRepositories: [17], removedRepositories: [] });
    await store.setRepositoryConsent(17, { enabled: true, retentionDays: 30, origin: 'fixture' });
    await database.prepare(`INSERT INTO analytical_size_facts VALUES (17,'paging','[{"path":"pagination.txt","size":123}]')`).run();
    await database.prepare(`WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<7600)
      INSERT INTO analytical_size_observations(repository_id,fact_key,observed_at,revision,expires_at)
      SELECT 17,'paging',CASE WHEN x<=1500 THEN ? ELSE strftime('%Y-%m-%dT%H:%M:%fZ','2026-09-02',x || ' seconds') END,
        printf('%040x',x),CASE WHEN x>7563 THEN ? ELSE ? END FROM n`).bind(stamp(2), stamp(10), stamp(30)).run();
    const expected = (await database.prepare(`SELECT observed_at,revision,rowid AS sequence FROM analytical_size_observations
      WHERE expires_at>? ORDER BY observed_at,fact_key,revision`).bind(stamp(25)).all()).results;
    tally.queries.length = 0;
    const history = await store.analyticalSizeHistory(17, stamp(1), stamp(30));
    assert.deepEqual(history.groups[0].observations.map(({ observedAt, revision, sequence }) => ({ observed_at: observedAt, revision, sequence })), expected);
    assert.equal(expected.length, 7563, 'no marker is capped, collapsed or replaced by an expired marker');
    const pages = tally.queries.filter(row => row.sql?.startsWith('SELECT fact_key,observed_at,revision,expires_at,order_json,rowid'));
    assert.equal(pages.length, 8);
    const reads = pages.reduce((total, page) => total + page.read, 0);
    t.diagnostic(`7,563 markers, including 1,500 equal-time ties: page reads ${pages.map(page => page.read).join(', ')}; total ${reads}`);
    assert.ok(reads < 2 * expected.length, `later pages must not rescan the whole earlier time window (${reads} rows read)`);
    assert.deepEqual(await store.analyticalSizeHistory(17, stamp(1), stamp(30), { paths: ['pagination.txt'] }), history,
      'selected-path pagination preserves the same full 7,563 markers and equal-time ties');
  } finally { await runtime.dispose(); }
});

test('selected paths read their complete size history and anchors without transferring unrelated snapshots', async t => {
  const runtime = new Miniflare({ workers: [{ config: { name: 'selected-sizes', compatibilityDate: '2026-09-17',
    env: { APP_DB: { type: 'd1', id: `selected-${crypto.randomUUID()}` } }, manifest: { mainModule: 'worker.mjs', modulesRoot: resolve('.'),
      modules: { 'worker.mjs': { type: 'esm', contents: 'export default { fetch() { return new Response("ok"); } };' } } } } }] });
  try {
    const database = await runtime.getD1Database('APP_DB'), tally = { read: 0, written: 0, queries: [] };
    const store = new D1AppStore(metered(database, tally), { now: () => stamp(25) });
    for (const name of (await readdir('apps/github-app/migrations')).sort()) await store.migrate(await readFile(`apps/github-app/migrations/${name}`, 'utf8'));
    await store.recordLifecycle({ installationId: 9, action: 'created', addedRepositories: [17], removedRepositories: [] });
    await store.setRepositoryConsent(17, { enabled: true, retentionDays: 30, origin: 'fixture' });
    const names = Array.from({ length: 915 }, (_, index) => index === 17 ? `src/space ' quote ☃.txt` : `src/file-${index}.txt`);
    const sets = Array.from({ length: Math.ceil(names.length / 18) }, (_, group) => names.slice(group * 18, (group + 1) * 18)
      .map((path, index) => ({ path, size: index === 0 ? null : index === 1 ? 0 : 100 + index })));
    await database.prepare(`INSERT INTO analytical_size_facts(repository_id,fact_key,facts_json)
      SELECT 17,'set:' || key,value FROM json_each(?)`).bind(JSON.stringify(sets)).run();
    await database.prepare(`WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<142)
      INSERT INTO analytical_size_observations(repository_id,fact_key,observed_at,revision,expires_at,order_json)
      SELECT 17,f.fact_key,strftime('%Y-%m-%dT%H:%M:%fZ','2026-09-02',x || ' hours'),printf('%040x',x),?,
        (SELECT json_group_array(x*10000+CAST(j.key AS INTEGER)*2) FROM json_each(f.facts_json) j)
      FROM n,analytical_size_facts f WHERE f.repository_id=17`).bind(stamp(30)).run();
    // Equal-time revisions, an expired later observation, and a changed set are distinct from a snapshot cap.
    await database.prepare(`INSERT INTO analytical_size_facts VALUES (17,'changed',?)`).bind(JSON.stringify([{ path: names[17], size: 42 }])).run();
    await database.prepare(`INSERT INTO analytical_size_observations(repository_id,fact_key,observed_at,revision,expires_at)
      VALUES (17,'changed',?, ?, ?),(17,'changed',?, ?, ?),(17,'changed',?, ?, ?)`)
      .bind(stamp(4), 'e'.repeat(40), stamp(30), stamp(4), 'f'.repeat(40), stamp(30), stamp(6), 'd'.repeat(40), stamp(10)).run();
    await database.prepare(`INSERT INTO analytical_size_facts VALUES (17,'expired-only','[{"path":"expired-only.txt","size":999}]')`).run();
    await database.prepare(`INSERT INTO analytical_size_observations(repository_id,fact_key,observed_at,revision,expires_at)
      VALUES (17,'expired-only',?,?,?)`).bind(stamp(4), head, stamp(10)).run();
    const window = { from: stamp(3), to: stamp(7) }, selected = [names[0], names[17], names[912], 'absent.txt'];
    tally.queries.length = 0;
    const complete = await store.analyticalSizeHistory(17, window.from, window.to);
    const fullCost = tally.queries.reduce((cost, row) => ({ read: cost.read + row.read, bytes: cost.bytes + row.valueBytes, rows: cost.rows + row.rows }), { read: 0, bytes: 0, rows: 0 });
    const expected = [...sizeHistoryRows(complete)].filter(row => selected.includes(row.path));
    tally.queries.length = 0;
    const scoped = await store.analyticalSizeHistory(17, window.from, window.to, { paths: [...selected, names[17]] });
    const scopedCost = tally.queries.reduce((cost, row) => ({ read: cost.read + row.read, bytes: cost.bytes + row.valueBytes, rows: cost.rows + row.rows }), { read: 0, bytes: 0, rows: 0 });
    const selectedRows = [...sizeHistoryRows(scoped)];
    assert.equal(selectedRows.length, expected.length, 'selected reads must not return the full repository');
    assert.deepEqual(order(selectedRows), order(expected), 'selection preserves every observation, boundary, original tie position, null and zero');
    assert.ok(scopedCost.bytes < fullCost.bytes / 20, `unrelated size facts must stay in D1 (${scopedCost.bytes} vs ${fullCost.bytes} serialized result-value bytes)`);
    assert.ok(scopedCost.read < fullCost.read, `selection must also remove database work (${scopedCost.read} vs ${fullCost.read} rows read)`);
    assert.deepEqual(await store.analyticalSizes(17, window.from, window.to, { paths: selected }),
      (await store.analyticalSizes(17, window.from, window.to)).filter(row => selected.includes(row.path)));
    assert.deepEqual(await store.analyticalSizes(17, stamp(20), stamp(24), { paths: selected }),
      (await store.analyticalSizes(17, stamp(20), stamp(24))).filter(row => selected.includes(row.path)),
      'a path with only a boundary anchor survives without a window marker');
    assert.deepEqual(await store.analyticalSizeHistory(17, window.from, window.to, { paths: [] }), { repositoryId: 17, groups: [], boundaries: [] });
    assert.deepEqual(await store.analyticalSizes(17, window.from, window.to, { paths: ['absent.txt'] }), []);
    assert.deepEqual(await store.analyticalSizeHistory(17, window.from, window.to, { paths: ['expired-only.txt'] }), { repositoryId: 17, groups: [], boundaries: [] });
    await assert.rejects(store.analyticalSizeHistory(17, window.from, window.to, { paths: 'src/file-0.txt' }), TypeError);
    t.diagnostic(`915 paths / 142 captures: full ${JSON.stringify(fullCost)}; selected ${JSON.stringify(scopedCost)}. Bytes encode returned D1 values, excluding RPC framing; no wall/CPU claim.`);

    await t.test('the real App locator and detail keep the full answer with an adopting extension', async () => {
      const name = names[912];
      await store.recordAnalytical(transition(1, name, revisions.slice(0, 2), stamp(4)));
      await store.recordAnalytical(transition(2, 'unrelated.txt', revisions.slice(1, 3), stamp(5), { complete: false }));
      await store.recordAnalytical(record(3, null));
      const policy = { id: 'current', compiled: unwrap(compilePolicy({ version: 1, defaults: { paths: { exclude: ['unrelated.txt'] } } })) };
      const repository = { repositoryId: 17, owner: 'reader', fullName: 'reader/repo', standing: { historyReadable: true } };
      const run = async selectedRead => {
        let plan = 'pro', access = true;
        const service = createAnalyticalDataService({ store, authorize: async () => access, entitlement: async () => plan, namespace: async () => 9,
          currentPolicy: async () => policy, now: () => stamp(25), premium: {
            async files({ query, merged, store }) {
              const selected = merged.flatMap(record => (record.final?.report?.files ?? []).filter(file => file.path === query.path)
                .flatMap(() => record.facts.report.files.filter(file => file.path === query.path && file.included)
                  .map(file => ({ pullRequest: record.pullRequest, changed: file.lines.changed }))));
              const history = await store.analyticalSizeHistory(17, query.from, query.to, selectedRead ? { paths: [query.path] } : undefined);
              return { files: [{ repositoryId: 17, path: query.path, contributions: selected,
                sizeHistory: [...sizeHistoryRows(history)].filter(row => row.path === query.path) }], sizeObservation: [] };
            },
            async file({ files }) { return files[0]; }
          } });
        const runtime = { store: new D1AppReadStore(database, { now: () => stamp(25) }), now: () => stamp(25), cache: createContextCache(),
          premium: { provided: true }, locator: createLocator({ secret: 'local-selected-size-history-fixture' }),
          analytics: { service, query: (input, actor, source) => service.query({ version: 1, ...input }, actor, source) } };
        const fileLocator = await runtime.locator.of(17, name);
        const view = await loadView({ url: new URL(`https://app.example/file/reader/repo/${fileLocator}?per=30d`),
          viewer: { userId: 123, plan: 'Pro', namespaces: [{ login: 'reader', yours: true }], repositories: [repository] },
          session: { reads: { recentPullRequests: async () => ({ pullRequests: [] }) } }, runtime, surface: 'file', detail: { repositoryId: 17, fileLocator } });
        assert.deepEqual(view.fileIdentity, { repositoryId: 17, path: name, hasSelectedPeriodActivity: true });
        const answer = await loadSurface(view, runtime, 'file', { path: name });
        assert.equal(answer.coverage.merged, 3, 'unrelated incomplete and unrecovered comparisons remain in coverage');
        assert.equal(answer.coverage.recoveredMerged, 2);
        assert.equal(answer.coverage.completeWindow, false);
        assert.equal(answer.result.sizeHistory.length, 142);
        plan = 'free';
        assert.equal((await loadSurface(view, runtime, 'file', { path: name })).standing, 'free');
        access = false;
        assert.equal(await loadSurface(view, runtime, 'file', { path: name }), null);
        return answer;
      };
      assert.deepEqual(await run(true), await run(false), 'the actual App path returns an equal response; the extension here models selector adoption, not premium qualification');
    });
    const settings = store.historySettings.bind(store);
    let reads = 0;
    t.mock.method(store, 'historySettings', async (...args) => {
      if (++reads === 2) await database.prepare("UPDATE repositories SET access_state='unavailable' WHERE repository_id=17").run();
      return settings(...args);
    });
    try {
      assert.deepEqual(await store.analyticalSizeHistory(17, window.from, window.to, { paths: selected }), { repositoryId: 17, groups: [], boundaries: [] },
        'access lost after the selected D1 read discards its result');
    } finally {
      t.mock.restoreAll();
      await database.prepare("UPDATE repositories SET access_state='available' WHERE repository_id=17").run();
    }
    await store.deleteHistory(17);
    assert.deepEqual(await store.analyticalSizeHistory(17, window.from, window.to, { paths: selected }), { repositoryId: 17, groups: [], boundaries: [] });
  } finally { await runtime.dispose(); }
});

test('shared snapshots preserve migration, every window row, turnover, first-writer identity and deletion while removing repeated facts', async t => {
  const runtime = new Miniflare({ workers: [{ config: { name: 'shared-sizes', compatibilityDate: '2026-09-17',
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
        const shared = await store.analyticalSizeHistory(17, window.from, window.to);
        const compactRows = new Map();
        for (const { expiresAt, sequence, ...row } of sizeHistoryRows(shared)) compactRows.set(JSON.stringify([row.path, row.observedAt, row.revision]), row);
        assert.deepEqual(order([...compactRows.values()]), order(old), 'the compact reader preserves every window/boundary observation including null, zero and same-time revisions');
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
      assert.deepEqual(await store.analyticalSizeHistory(18, stamp(2), stamp(11)), { repositoryId: 18, groups: [], boundaries: [] });
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
