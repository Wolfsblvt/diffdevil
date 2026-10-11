// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/** Shared numerical snapshots. Markers preserve exact observation identity and expiry; facts contain paths/sizes only. */
const PAGE = 100;
const FACT_PAGE = PAGE - 1; // D1 permits 100 bound parameters; the repository is one of them.

const guard = `EXISTS (SELECT 1 FROM repositories r JOIN installations i ON i.installation_id=r.installation_id
  WHERE r.repository_id=? AND r.history_enabled=1 AND r.history_consent_reason IS NULL
  AND r.state IN ('active','pending-enable') AND r.access_state='available' AND i.state='active')
  AND NOT EXISTS (SELECT 1 FROM deletion_tombstones WHERE scope IN (?,?) AND reapply_until>?)`;
const guardValues = (repositoryId, now) => [repositoryId, `history:${repositoryId}`, `repository:${repositoryId}`, now];

/** Canonical sets share unchanged facts even when their immutable revision or observation time changes. */
async function factKey(facts) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(facts));
  return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
}

/** Publish a bounded set atomically. Overlapping same-time captures retain the original per-path first-writer rule. */
export async function publishSizeSet(store, repositoryId, rows, now) {
  const { observedAt, revision, expires } = rows[0];
  let pending = rows;
  let published = 0;
  while (pending.length) {
    const existing = await store.statement(`SELECT f.facts_json FROM analytical_size_observations o
      JOIN analytical_size_facts f USING(repository_id,fact_key)
      WHERE o.repository_id=? AND o.revision=? AND o.observed_at=?`, repositoryId, revision, observedAt).all();
    const known = new Set((existing.results ?? []).flatMap(row => JSON.parse(row.facts_json).map(fact => fact.path)));
    pending = pending.filter(row => !known.has(row.path));
    if (!pending.length) break;
    const facts = JSON.stringify(pending.map(({ path, size }) => ({ path, size })).sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
    const key = await factKey(facts);
    const results = await store.database.batch([
      store.statement(`INSERT INTO analytical_size_facts(repository_id,fact_key,facts_json)
        SELECT ?,?,? WHERE ${guard} ON CONFLICT DO NOTHING`, repositoryId, key, facts, ...guardValues(repositoryId, now)),
      store.statement(`INSERT INTO analytical_size_observations(repository_id,fact_key,observed_at,revision,expires_at)
        SELECT ?,?,?,?,? WHERE ${guard}
        AND EXISTS (SELECT 1 FROM analytical_size_facts WHERE repository_id=? AND fact_key=?)
        AND NOT EXISTS (SELECT 1 FROM analytical_size_observations o
          JOIN analytical_size_facts f USING(repository_id,fact_key),json_each(f.facts_json) old,json_each(?) fresh
          WHERE o.repository_id=? AND o.revision=? AND o.observed_at=?
          AND json_extract(old.value,'$.path')=json_extract(fresh.value,'$.path'))
        ON CONFLICT DO NOTHING`, repositoryId, key, observedAt, revision, expires, ...guardValues(repositoryId, now),
      repositoryId, key, facts, repositoryId, revision, observedAt),
      store.statement(`DELETE FROM analytical_size_facts WHERE repository_id=? AND fact_key=?
        AND NOT EXISTS (SELECT 1 FROM analytical_size_observations WHERE repository_id=? AND fact_key=?)`, repositoryId, key, repositoryId, key)
    ]);
    if (results[1].meta?.changes === 1) { published += pending.length; break; }
    if (!(await store.historySettings(repositoryId, { independentExecution: true })).enabled) return { status: 'disabled' };
    // A concurrent overlap can only remove paths from this bounded set. Re-read it rather than drop new paths.
  }
  return { status: 'published', published };
}

/** Decode each shared fact set once, then reconstruct the exact logical rows named by the markers. */
async function expand(store, repositoryId, markers) {
  const keys = [...new Set(markers.map(row => row.fact_key))], facts = new Map();
  for (let offset = 0; offset < keys.length; offset += FACT_PAGE) {
    const part = keys.slice(offset, offset + FACT_PAGE);
    const result = await store.statement(`SELECT fact_key,facts_json FROM analytical_size_facts
      WHERE repository_id=? AND fact_key IN (${part.map(() => '?').join(',')})`, repositoryId, ...part).all();
    for (const row of result.results ?? []) facts.set(row.fact_key, JSON.parse(row.facts_json));
  }
  return markers.flatMap(row => {
    const positions = row.order_json ? JSON.parse(row.order_json) : [];
    return (facts.get(row.fact_key) ?? []).map(({ path, size }, index) => ({ repositoryId, path, size,
      observedAt: row.observed_at, revision: row.revision, expiresAt: row.expires_at, sequence: positions[index] ?? row.sequence }));
  });
}

/** Indexed keyset pages bound each D1 query; the full logical result is never truncated. */
async function markersIn(store, repositoryId, from, to, now) {
  const rows = [];
  let cursor = null;
  while (true) {
    const result = await store.statement(`SELECT fact_key,observed_at,revision,expires_at,order_json,rowid AS sequence FROM analytical_size_observations
      WHERE repository_id=? AND observed_at BETWEEN ? AND ? AND (expires_at IS NULL OR expires_at>?)
      ${cursor ? 'AND (observed_at,fact_key,revision)>(?,?,?)' : ''}
      ORDER BY observed_at,fact_key,revision LIMIT ${PAGE}`, repositoryId, from, to, now,
    ...(cursor ? [cursor.observed_at, cursor.fact_key, cursor.revision] : [])).all();
    const page = result.results ?? [];
    rows.push(...page);
    if (page.length < PAGE) return rows;
    cursor = page.at(-1);
  }
}

/** Latest per-path observation at an immutable revision supports both reuse and durable capture continuation. */
export async function sizesAt(store, repositoryId, revision, now, latest) {
  if (!latest) {
    const markers = await store.statement(`SELECT fact_key,observed_at,revision,expires_at FROM analytical_size_observations
      WHERE repository_id=? AND revision=? AND (expires_at IS NULL OR expires_at>?) ORDER BY observed_at`, repositoryId, revision, now).all();
    return (await expand(store, repositoryId, markers.results ?? [])).map(({ path, observedAt, size }) => ({ path, observedAt, size }));
  }
  const result = await store.statement(`SELECT fact_key,MAX(observed_at) AS observed_at FROM analytical_size_observations INDEXED BY analytical_size_revision
    WHERE repository_id=? AND revision=? AND (expires_at IS NULL OR expires_at>?) GROUP BY fact_key`, repositoryId, revision, now).all();
  const rows = await expand(store, repositoryId, (result.results ?? []).map(row => ({ ...row, revision })));
  const perPath = new Map();
  for (const row of rows) if (!perPath.has(row.path) || perPath.get(row.path).observedAt < row.observedAt) perPath.set(row.path, row);
  return [...perPath.values()].map(({ path, observedAt, size }) => ({ path, observedAt, size }));
}

/** Expiry is immediately enforced on reads; physical cleanup drains indexed, bounded queries without a retention cut. */
export async function expireSizes(store, now) {
  while (true) {
    const deleted = await store.statement(`DELETE FROM analytical_size_observations WHERE rowid IN
      (SELECT rowid FROM analytical_size_observations WHERE expires_at IS NOT NULL AND expires_at<=? ORDER BY expires_at LIMIT 1000)
      RETURNING repository_id,fact_key`, now).all();
    const rows = deleted.results ?? [];
    if (!rows.length) return;
    const keys = JSON.stringify([...new Map(rows.map(row => [JSON.stringify([row.repository_id, row.fact_key]), [row.repository_id, row.fact_key]])).values()]);
    await store.statement(`DELETE FROM analytical_size_facts WHERE (repository_id,fact_key) IN
      (SELECT json_extract(value,'$[0]'),json_extract(value,'$[1]') FROM json_each(?))
      AND NOT EXISTS (SELECT 1 FROM analytical_size_observations o
        WHERE o.repository_id=analytical_size_facts.repository_id AND o.fact_key=analytical_size_facts.fact_key)`, keys).run();
    if (rows.length < 1000) return;
  }
}

/** Exact window observations and the nearest retained boundary anchors for every path. */
export async function sizesIn(store, repositoryId, from, to, now) {
  const markers = await markersIn(store, repositoryId, from, to, now);
  for (const [operator, aggregate, boundary] of [['<=', 'MAX', from], ['>=', 'MIN', to]]) {
    const result = await store.statement(`SELECT o.fact_key,o.observed_at,o.revision,o.expires_at,o.order_json,o.rowid AS sequence
      FROM analytical_size_facts f CROSS JOIN analytical_size_observations o
      WHERE f.repository_id=? AND o.repository_id=f.repository_id AND o.fact_key=f.fact_key
      AND o.observed_at=(SELECT ${aggregate}(p.observed_at) FROM analytical_size_observations p
        WHERE p.repository_id=f.repository_id AND p.fact_key=f.fact_key AND p.observed_at${operator}?
        AND (p.expires_at IS NULL OR p.expires_at>?)) AND (o.expires_at IS NULL OR o.expires_at>?)`,
    repositoryId, boundary, now, now).all();
    markers.push(...(result.results ?? []));
  }
  const rows = await expand(store, repositoryId, markers), before = new Map(), after = new Map();
  for (const row of rows) {
    if (row.observedAt <= from && (!before.has(row.path) || before.get(row.path) < row.observedAt)) before.set(row.path, row.observedAt);
    if (row.observedAt >= to && (!after.has(row.path) || after.get(row.path) > row.observedAt)) after.set(row.path, row.observedAt);
  }
  const unique = new Map();
  for (const row of rows) if ((row.observedAt >= from && row.observedAt <= to) || before.get(row.path) === row.observedAt || after.get(row.path) === row.observedAt) {
    unique.set(JSON.stringify([row.path, row.observedAt, row.revision]), row);
  }
  return [...unique.values()].sort((a, b) => a.observedAt.localeCompare(b.observedAt)
    || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0) || a.sequence - b.sequence)
    .map(({ expiresAt, sequence, ...observation }) => observation);
}
