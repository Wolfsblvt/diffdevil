// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/** Shared numerical snapshots. Markers preserve exact observation identity and expiry; facts contain paths/sizes only. */
const PAGE = 1000;
const FACT_PAGE = 99; // D1 permits 100 bound parameters; the repository is one of them.

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
export async function publishSizeSet(store, repositoryId, rows) {
  const { observedAt, revision, expires, captureSince } = rows[0];
  let pending = rows;
  let published = 0;
  while (pending.length) {
    const now = store.now();
    if (expires !== null && expires <= now) return { status: 'expired' };
    const paths = JSON.stringify(pending.map(row => row.path));
    const existing = await store.statement(`SELECT names.path FROM analytical_size_observations o
      CROSS JOIN analytical_size_facts f CROSS JOIN analytical_size_members m CROSS JOIN analytical_size_paths names
      WHERE o.repository_id=? AND o.observed_at=? AND o.revision=? AND f.repository_id=o.repository_id
      AND f.fact_key=o.fact_key AND m.repository_id=f.repository_id AND m.fact_id=f.fact_id
      AND names.path_id=m.path_id AND names.path IN (SELECT value FROM json_each(?))`,
    repositoryId, observedAt, revision, paths).all();
    const known = new Set((existing.results ?? []).map(row => row.path));
    pending = pending.filter(row => !known.has(row.path));
    if (!pending.length) break;
    const remainingPaths = JSON.stringify(pending.map(row => row.path));
    const facts = JSON.stringify(pending.map(({ path, size }) => ({ path, size })).sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
    const key = await factKey(facts);
    const results = await store.database.batch([
      store.statement(`INSERT INTO analytical_size_facts(repository_id,fact_key,facts_json)
        SELECT ?,?,? WHERE ${guard} ON CONFLICT DO NOTHING`, repositoryId, key, facts, ...guardValues(repositoryId, now)),
      store.statement(`INSERT INTO analytical_size_paths(repository_id,path)
        SELECT f.repository_id,json_extract(j.value,'$.path') FROM analytical_size_facts f,json_each(f.facts_json) j
        WHERE f.repository_id=? AND f.fact_key=? AND NOT EXISTS
          (SELECT 1 FROM analytical_size_members WHERE repository_id=? AND fact_id=f.fact_id)
        AND ${guard} ON CONFLICT DO NOTHING`, repositoryId, key, repositoryId, ...guardValues(repositoryId, now)),
      store.statement(`INSERT INTO analytical_size_members(repository_id,path_id,fact_id,ordinal,size)
        SELECT f.repository_id,p.path_id,f.fact_id,j.key,json_extract(j.value,'$.size')
        FROM analytical_size_facts f,json_each(f.facts_json) j JOIN analytical_size_paths p
          ON p.repository_id=f.repository_id AND p.path=json_extract(j.value,'$.path')
        WHERE f.repository_id=? AND f.fact_key=? AND NOT EXISTS
          (SELECT 1 FROM analytical_size_members WHERE repository_id=? AND fact_id=f.fact_id)
        AND ${guard} ON CONFLICT DO NOTHING`, repositoryId, key, repositoryId, ...guardValues(repositoryId, now)),
      store.statement(`INSERT INTO analytical_size_observations(repository_id,fact_key,observed_at,revision,expires_at,capture_since)
        SELECT ?,?,?,?,?,? WHERE ${guard}
        AND EXISTS (SELECT 1 FROM analytical_size_facts WHERE repository_id=? AND fact_key=?)
        AND NOT EXISTS (SELECT 1 FROM analytical_size_observations o
          CROSS JOIN analytical_size_facts f CROSS JOIN analytical_size_members m CROSS JOIN analytical_size_paths names
          WHERE o.repository_id=? AND o.observed_at=? AND o.revision=? AND f.repository_id=o.repository_id
          AND f.fact_key=o.fact_key AND m.repository_id=f.repository_id AND m.fact_id=f.fact_id
          AND names.path_id=m.path_id AND names.path IN (SELECT value FROM json_each(?)))
        ON CONFLICT DO NOTHING`, repositoryId, key, observedAt, revision, expires, captureSince ?? null, ...guardValues(repositoryId, now),
      repositoryId, key, repositoryId, observedAt, revision, remainingPaths),
      store.statement(`DELETE FROM analytical_size_members WHERE repository_id=? AND fact_id=
        (SELECT fact_id FROM analytical_size_facts WHERE repository_id=? AND fact_key=?)
        AND NOT EXISTS (SELECT 1 FROM analytical_size_observations WHERE repository_id=? AND fact_key=?)`, repositoryId, repositoryId, key, repositoryId, key),
      store.statement(`DELETE FROM analytical_size_paths WHERE repository_id=? AND path IN
        (SELECT json_extract(value,'$.path') FROM json_each(?)) AND NOT EXISTS
        (SELECT 1 FROM analytical_size_members m WHERE m.repository_id=? AND m.path_id=analytical_size_paths.path_id)`, repositoryId, facts, repositoryId),
      store.statement(`DELETE FROM analytical_size_facts WHERE repository_id=? AND fact_key=?
        AND NOT EXISTS (SELECT 1 FROM analytical_size_observations WHERE repository_id=? AND fact_key=?)`, repositoryId, key, repositoryId, key)
    ]);
    if (results[3].meta?.changes === 1) { published += pending.length; break; }
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
export async function sizesAt(store, repositoryId, revision, now, latest, captureSince) {
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
  let captured;
  if (captureSince !== undefined) {
    const result = await store.statement(`SELECT names.path FROM analytical_size_observations o
      CROSS JOIN analytical_size_facts f CROSS JOIN analytical_size_members m CROSS JOIN analytical_size_paths names
      WHERE o.repository_id=? AND o.revision=? AND o.capture_since=? AND (o.expires_at IS NULL OR o.expires_at>?)
      AND f.repository_id=o.repository_id AND f.fact_key=o.fact_key AND m.repository_id=f.repository_id
      AND m.fact_id=f.fact_id AND names.path_id=m.path_id`, repositoryId, revision, captureSince, now).all();
    captured = new Set((result.results ?? []).map(row => row.path));
  }
  return [...perPath.values()].map(({ path, observedAt, size }) => ({ path, observedAt, size,
    ...(captured ? { captured: captured.has(path) } : {}) }));
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
    const paths = await store.statement(`DELETE FROM analytical_size_members WHERE (repository_id,fact_id) IN
      (SELECT f.repository_id,f.fact_id FROM analytical_size_facts f JOIN json_each(?) j
        ON f.repository_id=json_extract(j.value,'$[0]') AND f.fact_key=json_extract(j.value,'$[1]'))
      AND NOT EXISTS (SELECT 1 FROM analytical_size_observations o
        JOIN analytical_size_facts f USING(repository_id,fact_key)
        WHERE o.repository_id=analytical_size_members.repository_id AND f.fact_id=analytical_size_members.fact_id)
      RETURNING repository_id,path_id`, keys).all();
    const pathIds = JSON.stringify([...new Map((paths.results ?? []).map(row => [row.path_id, row.path_id])).values()]);
    await store.statement(`DELETE FROM analytical_size_paths WHERE path_id IN (SELECT value FROM json_each(?))
      AND NOT EXISTS (SELECT 1 FROM analytical_size_members m WHERE m.repository_id=analytical_size_paths.repository_id
        AND m.path_id=analytical_size_paths.path_id)`, pathIds).run();
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
  const rows = await expand(store, repositoryId, markers);
  for (const [operator, aggregate, boundary] of [['<=', 'MAX', from], ['>=', 'MIN', to]]) {
    // Seek once per shared set inside D1, then join its bound to indexed path membership.
    // Old fact JSON never crosses into the Worker to choose a nearer boundary observation.
    const result = await store.statement(`WITH set_bounds AS MATERIALIZED (
      SELECT f.fact_id,f.fact_key,(SELECT ${aggregate}(o.observed_at) FROM analytical_size_observations o
        WHERE o.repository_id=? AND o.fact_key=f.fact_key AND o.observed_at${operator}?
        AND (o.expires_at IS NULL OR o.expires_at>?)) AS observed_at
      FROM analytical_size_facts f WHERE f.repository_id=?), candidates AS MATERIALIZED (
      SELECT m.path_id,m.size,m.ordinal,s.fact_key,s.observed_at FROM set_bounds s
      JOIN analytical_size_members m ON m.fact_id=s.fact_id WHERE m.repository_id=? AND s.observed_at IS NOT NULL),
      bounds AS MATERIALIZED (SELECT path_id,${aggregate}(observed_at) AS observed_at FROM candidates GROUP BY path_id)
      SELECT names.path,c.size,o.observed_at,o.revision,
        COALESCE(json_extract(o.order_json,'$[' || c.ordinal || ']'),o.rowid) AS sequence
      FROM candidates c JOIN bounds b ON b.path_id=c.path_id AND b.observed_at=c.observed_at
      JOIN analytical_size_observations o ON o.repository_id=? AND o.fact_key=c.fact_key AND o.observed_at=c.observed_at
      JOIN analytical_size_paths names ON names.path_id=c.path_id WHERE o.expires_at IS NULL OR o.expires_at>?`,
    repositoryId, boundary, now, repositoryId, repositoryId, repositoryId, now).all();
    rows.push(...(result.results ?? []).map(row => ({ repositoryId, path: row.path, size: row.size,
      observedAt: row.observed_at, revision: row.revision, sequence: row.sequence })));
  }
  const unique = new Map();
  for (const row of rows) {
    unique.set(JSON.stringify([row.path, row.observedAt, row.revision]), row);
  }
  return [...unique.values()].sort((a, b) => a.observedAt.localeCompare(b.observedAt)
    || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0) || a.sequence - b.sequence)
    .map(({ expiresAt, sequence, ...observation }) => observation);
}
