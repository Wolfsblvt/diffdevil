// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Read-only D1 access for the App experience. It reads what the managed App already
 * retains: repository standing and the opted-in, pathless numeric history. It writes
 * nothing, serves a repository's history only while that repository's history consent is
 * current, and never infers names, authors or merge facts from numeric rows.
 */

const batches = (values, size = 100) => Array.from({ length: Math.ceil(values.length / size) }, (_, index) => values.slice(index * size, (index + 1) * size));
const boundedDays = value => Number.isSafeInteger(value) && value >= 1 && value <= 3660 ? value : null;
const parse = text => { try { return JSON.parse(text); } catch { return undefined; } };
const placeholders = list => list.map(() => '?').join(',');

/** The cap keeps one page from reading an unbounded window; a truncated read says so. */
export const ANALYSIS_READ_LIMIT = 4000;

export class D1AppReadStore {
  constructor(database, { now = () => new Date().toISOString() } = {}) {
    this.database = database;
    this.now = now;
  }
  statement(sql, ...values) { return this.database.prepare(sql).bind(...values); }

  /** Persisted admission standing for the repositories the viewer may see. */
  async repositoryStandings(repositoryIds) {
    const standings = new Map();
    if (repositoryIds.length === 0) return standings;
    const now = this.now();
    for (const chunk of batches(repositoryIds)) {
      const rows = await this.statement(`SELECT r.repository_id, r.installation_id, r.state, r.access_state, r.history_enabled, r.retention_days, r.execution_consent_reason, r.history_consent_reason, i.state AS installation_state,
        EXISTS (SELECT 1 FROM deletion_tombstones t WHERE t.scope IN ('repository:' || r.repository_id, 'history:' || r.repository_id) AND t.reapply_until > ?) AS tombstoned
        FROM repositories r JOIN installations i ON i.installation_id = r.installation_id WHERE r.repository_id IN (${placeholders(chunk)})`, now, ...chunk).all();
      for (const row of rows.results ?? []) {
        const executionActive = row.state === 'active' && row.access_state === 'available' && row.installation_state === 'active' && row.execution_consent_reason === null;
        const historyEnabled = row.history_enabled === 1 && row.history_consent_reason === null && row.state === 'active' && row.access_state === 'available' && row.installation_state === 'active' && !row.tombstoned;
        standings.set(row.repository_id, {
          repositoryId: row.repository_id, installationId: row.installation_id, state: row.state, accessState: row.access_state, installationState: row.installation_state,
          executionActive, historyEnabled, retentionDays: boundedDays(row.retention_days), tombstoned: Boolean(row.tombstoned),
          status: historyEnabled ? 'history' : executionActive ? 'labels-only' : 'history-off'
        });
      }
    }
    return standings;
  }

  async historyEnabledRepositories(repositoryIds) {
    const standings = await this.repositoryStandings(repositoryIds);
    return repositoryIds.filter(id => standings.get(id)?.historyEnabled);
  }

  /** Published analyses observed inside [from, to) for history-enabled repositories, newest first. */
  async analyses(repositoryIds, from, to) {
    const enabled = await this.historyEnabledRepositories(repositoryIds);
    if (enabled.length === 0) return { records: [], truncated: false, repositories: enabled };
    const now = this.now();
    const rows = [];
    for (const chunk of batches(enabled, 50)) {
      const result = await this.statement(`SELECT id, repository_id, pull_request, comparison_id, policy_id, schema_version, engine_version, report_version, metric_version, base_sha, head_sha, observed_at, projection_json, coverage_json, results_json, gaps_json
        FROM history_records WHERE repository_id IN (${placeholders(chunk)}) AND state='published' AND observed_at>=? AND observed_at<? AND (expires_at IS NULL OR expires_at>?)
        ORDER BY observed_at DESC, id DESC LIMIT ?`, ...chunk, from, to, now, ANALYSIS_READ_LIMIT + 1).all();
      rows.push(...(result.results ?? []));
    }
    rows.sort((a, b) => b.observed_at.localeCompare(a.observed_at) || b.id - a.id);
    const truncated = rows.length > ANALYSIS_READ_LIMIT;
    return { records: await this.hydrate(rows.slice(0, ANALYSIS_READ_LIMIT)), truncated, repositories: enabled };
  }

  /** Every retained analysis of one pull request, oldest first: its development across analysed heads. */
  async pullRequestAnalyses(repositoryId, pullRequest) {
    const enabled = await this.historyEnabledRepositories([repositoryId]);
    if (enabled.length === 0) return [];
    const result = await this.statement(`SELECT id, repository_id, pull_request, comparison_id, policy_id, schema_version, engine_version, report_version, metric_version, base_sha, head_sha, observed_at, projection_json, coverage_json, results_json, gaps_json
      FROM history_records WHERE repository_id=? AND pull_request=? AND state='published' AND (expires_at IS NULL OR expires_at>?) ORDER BY observed_at ASC, id ASC LIMIT 500`, repositoryId, pullRequest, this.now()).all();
    return this.hydrate(result.results ?? []);
  }

  /** Observation bounds of the retained history for the scope: first and latest analysis time. */
  async observationBounds(repositoryIds) {
    const enabled = await this.historyEnabledRepositories(repositoryIds);
    if (enabled.length === 0) return { first: null, latest: null };
    let first = null, latest = null;
    for (const chunk of batches(enabled, 50)) {
      const row = await this.statement(`SELECT MIN(observed_at) AS first, MAX(observed_at) AS latest FROM history_records WHERE repository_id IN (${placeholders(chunk)}) AND state='published'`, ...chunk).first();
      if (row?.first && (!first || row.first < first)) first = row.first;
      if (row?.latest && (!latest || row.latest > latest)) latest = row.latest;
    }
    return { first, latest };
  }

  async hydrate(rows) {
    const files = new Map(), effects = new Map();
    for (const chunk of batches(rows.map(row => row.id))) {
      const [fileRows, effectRows] = await Promise.all([
        this.statement(`SELECT history_id, ordinal, values_json FROM history_file_rows WHERE history_id IN (${placeholders(chunk)}) ORDER BY history_id, ordinal`, ...chunk).all(),
        this.statement(`SELECT history_id, ordinal, effect_json FROM history_effect_rows WHERE history_id IN (${placeholders(chunk)}) ORDER BY history_id, ordinal`, ...chunk).all()
      ]);
      for (const row of fileRows.results ?? []) { if (!files.has(row.history_id)) files.set(row.history_id, []); files.get(row.history_id).push({ ordinal: row.ordinal, ...(parse(row.values_json) ?? {}) }); }
      for (const row of effectRows.results ?? []) { if (!effects.has(row.history_id)) effects.set(row.history_id, []); effects.get(row.history_id).push(parse(row.effect_json) ?? { kind: 'unknown' }); }
    }
    return rows.map(row => ({
      id: row.id, repositoryId: row.repository_id, pullRequest: row.pull_request, comparisonId: row.comparison_id, policyId: row.policy_id,
      schemaVersion: row.schema_version, engineVersion: row.engine_version, reportVersion: row.report_version, metricVersion: row.metric_version,
      base: row.base_sha, head: row.head_sha, observedAt: row.observed_at,
      projection: parse(row.projection_json) ?? {}, fileSet: parse(row.coverage_json) ?? {}, results: parse(row.results_json) ?? [], gaps: parse(row.gaps_json) ?? [],
      files: files.get(row.id) ?? [], effects: effects.get(row.id) ?? []
    }));
  }
}
