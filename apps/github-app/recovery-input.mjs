// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
import { APP_TOMBSTONE_DAYS, D1AppStore } from './storage.mjs';
import { hasRecoveryCoverage, RECOVERY_DUTIES } from './recovery-contract.mjs';

// Current privacy/authority/configuration state travels together. Measurements remain on the old point;
// their complete current logical membership below prevents a rollback resurrecting removed observations.
const TABLES = ['installations', 'repositories', 'deletion_tombstones',
  'authorization_attempts', 'user_authorizations', 'authorization_artifacts', 'browser_sessions', 'user_service_connections',
  'repository_selections', 'free_connections', 'works_departures', 'plan_change_choices', 'namespace_defaults',
  'linked_policies', 'policy_links', 'policy_publications', 'policy_publication_results', 'automatic_setup', 'delegations', 'administrative_events',
  'repository_default_adoptions', 'history_jobs', 'history_lenses',
  'participation_responses', 'participation_deliveries', 'participation_previews', 'participation_prompts',
  'commercial_links', 'commercial_bindings', 'commercial_refusals', 'commercial_reports', 'commercial_nonces', 'commercial_link_attempts'];
const MEMBERSHIP = {
  history_records: ['repository_id', 'comparison_id', 'policy_id', 'schema_version', 'engine_version', 'report_version', 'metric_version'],
  analytical_pull_requests: ['repository_id', 'pull_request'],
  analytical_size_observations: ['repository_id', 'fact_key', 'observed_at', 'revision']
};
const iso = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
const text = value => typeof value === 'string' && value.trim().length > 0;
const fail = () => Object.assign(new TypeError('A complete immutable copy of the healthy current source is required.'), { code: 'E_RECOVERY_SOURCE' });
const quote = value => `"${value}"`;

async function columns(database, table) {
  const result = await database.prepare(`PRAGMA table_info(${quote(table)})`).all();
  if (!result.success || !result.results?.length) throw fail();
  return result.results.map(column => column.name);
}

/** An immutable source makes separate bounded reads consistent. Count/read disagreement or any D1 limit refuses. */
async function readTable(database, table, selected) {
  const count = await database.prepare(`SELECT count(*) AS count FROM ${quote(table)}`).first();
  const result = await database.prepare(`SELECT ${selected.map(quote).join(',')} FROM ${quote(table)}`).all();
  if (!result.success || !Array.isArray(result.results) || result.results.length !== count?.count) throw fail();
  return result.results.map(row => selected.map(column => row[column]));
}

/**
 * Produce the one-time rollback input from an already isolated, immutable copy of a proven healthy current
 * App database. Ops owns native consistent capture, health/identity evidence and protected artifact custody.
 * This function performs no remote read/capture and cannot establish health from a caller's strings.
 * `checkpoint` commits the complete protected input before it can be returned to a restore consumer.
 */
export async function exportHealthyRecoveryInput({ database, point, source, checkpoint }) {
  if (!text(point?.id) || !text(point?.databaseId) || !iso(point.capturedAt) || !iso(point.supportedUntil)
    || source?.mode !== 'immutable-current-copy' || source.databaseId !== point.databaseId
    || !iso(source.capturedAt) || source.capturedAt < point.capturedAt || source.capturedAt > point.supportedUntil
    || !text(source.snapshotId) || !text(source.healthEvidence) || !text(source.consistencyEvidence)
    || !text(source.interpretation) || !hasRecoveryCoverage(point, APP_TOMBSTONE_DAYS) || typeof checkpoint !== 'function') throw fail();
  const selectedSource = structuredClone(source), tables = [], membership = {};
  // Establish the protected output path before reading credential-bearing current state.
  await checkpoint({ kind: 'diffdevil.healthy-source-export-checkpoint', version: 1, phase: 'reading', point: structuredClone(point), source: structuredClone(selectedSource) });
  for (const name of TABLES) {
    const selected = await columns(database, name);
    const rows = await readTable(database, name, selected);
    tables.push({ name, columns: selected, rowCount: rows.length, rows });
  }
  for (const [name, selected] of Object.entries(MEMBERSHIP)) membership[name] = await readTable(database, name, selected);
  const input = { kind: 'diffdevil.app-recovery-input', version: 1, point: structuredClone(point),
    coverage: { from: point.capturedAt, through: selectedSource.capturedAt, mode: 'healthy-source-rollback', tombstoneRetentionDays: APP_TOMBSTONE_DAYS,
      sources: RECOVERY_DUTIES.map(duty => ({ duty,
        authority: selectedSource.snapshotId, checkpoint: selectedSource.capturedAt, recoveryEvidence: selectedSource.consistencyEvidence, through: selectedSource.capturedAt })) },
    events: [], currentState: { kind: 'diffdevil.healthy-recovery-state', version: 1, source: selectedSource, tables, membership } };
  await checkpoint(structuredClone(input));
  return input;
}

/** Validate the whole projection and actual target schema before the first restored write. */
export async function validateHealthyRecoveryState(database, input) {
  const state = input.currentState;
  if (!state || state.kind !== 'diffdevil.healthy-recovery-state' || state.version !== 1
    || input.coverage.mode !== 'healthy-source-rollback' || input.coverage.tombstoneRetentionDays !== APP_TOMBSTONE_DAYS || !text(input.point.databaseId)
    || state.source?.databaseId !== input.point.databaseId || state.source?.mode !== 'immutable-current-copy'
    || state.source?.capturedAt !== input.coverage.through || !text(state.source.snapshotId)
    || !text(state.source.healthEvidence) || !text(state.source.consistencyEvidence) || !text(state.source.interpretation)
    || !Array.isArray(state.tables) || state.tables.length !== TABLES.length || !state.membership) throw fail();
  for (const [index, name] of TABLES.entries()) {
    const table = state.tables[index];
    if (table?.name !== name || JSON.stringify(table.columns) !== JSON.stringify(await columns(database, name))
      || !Array.isArray(table.rows) || table.rowCount !== table.rows.length || table.rows.some(row => !Array.isArray(row) || row.length !== table.columns.length
        || row.some(value => value !== null && typeof value !== 'string' && typeof value !== 'number'))) throw fail();
  }
  for (const [name, selected] of Object.entries(MEMBERSHIP)) {
    if (!Array.isArray(state.membership[name]) || state.membership[name].some(row => !Array.isArray(row) || row.length !== selected.length
      || row.some(value => typeof value !== 'string' && typeof value !== 'number'))) throw fail();
    const actual = await columns(database, name);
    if (selected.some(column => !actual.includes(column))) throw fail();
  }
}

/** Apply the actual current restrictions/state, never infer deletion absence from a point's zero counts. */
export async function applyHealthyRecoveryState(database, state, through) {
  const store = new D1AppStore(database, { now: () => through });
  for (const [name, selected] of Object.entries(MEMBERSHIP)) {
    const known = new Set(state.membership[name].map(row => JSON.stringify(row)));
    const rows = await database.prepare(`SELECT ${name === 'history_records' ? 'id,' : ''}${selected.map(quote).join(',')} FROM ${quote(name)}`).all();
    if (!rows.success || !Array.isArray(rows.results)) throw fail();
    for (const row of rows.results) if (!known.has(JSON.stringify(selected.map(column => row[column])))) {
      if (name === 'history_records') await store.removeHistoryRecord(row.id);
      else await database.prepare(`DELETE FROM ${quote(name)} WHERE ${selected.map(column => `${quote(column)}=?`).join(' AND ')}`)
        .bind(...selected.map(column => row[column])).run();
    }
  }
  // Child rows go first. Attempts keep their original point history; current facts supersede matching IDs.
  for (const table of [...state.tables].reverse()) if (table.name !== 'commercial_link_attempts') await database.prepare(`DELETE FROM ${quote(table.name)}`).run();
  for (const table of state.tables) {
    const sql = `INSERT ${table.name === 'commercial_link_attempts' ? 'OR REPLACE ' : ''}INTO ${quote(table.name)} (${table.columns.map(quote).join(',')}) VALUES (${table.columns.map(() => '?').join(',')})`;
    for (let offset = 0; offset < table.rows.length; offset += 100) {
      await database.batch(table.rows.slice(offset, offset + 100).map(row => database.prepare(sql).bind(...row)));
    }
  }
  await database.prepare(`DELETE FROM analytical_size_facts WHERE NOT EXISTS (SELECT 1 FROM analytical_size_observations o
    WHERE o.repository_id=analytical_size_facts.repository_id AND o.fact_key=analytical_size_facts.fact_key)`).run();
}
