// SPDX-License-Identifier: AGPL-3.0-only

const leaseExpiry = (now, durationMs) => new Date(Date.parse(now) + durationMs).toISOString();
/** D1-only adapter. SQL expresses the duplicate/lease transition; callers never perform read-then-write claiming. */
export class D1AppStore {
  constructor(database, { now = () => new Date().toISOString(), leaseMs = 5 * 60_000 } = {}) { this.database = database; this.now = now; this.leaseMs = leaseMs; }
  statement(sql, ...values) { return this.database.prepare(sql).bind(...values); }
  async migrate(sql) { for (const statement of sql.split(/;\s*(?:\r?\n|$)/u).map(value => value.trim()).filter(Boolean)) await this.database.prepare(statement).run(); }
  async readiness() { await this.database.prepare('SELECT 1 AS ready').first(); return true; }
  async claimDelivery(envelope, deliveryId) {
    const now = this.now(), until = leaseExpiry(now, this.leaseMs);
    const result = await this.statement(`INSERT INTO deliveries (delivery_id, installation_id, repository_id, pull_request, state, lease_until, received_at)
      VALUES (?, ?, ?, ?, 'active', ?, ?) ON CONFLICT(delivery_id) DO UPDATE SET state='active', lease_until=excluded.lease_until
      WHERE deliveries.state='active' AND deliveries.lease_until < excluded.lease_until AND deliveries.lease_until < ?`, deliveryId, envelope.installationId,
    envelope.repositoryId ?? null, envelope.pullRequest ?? null, until, now, now).run();
    if ((result.meta?.changes ?? 0) > 0) return 'claimed';
    const existing = await this.statement('SELECT state, lease_until FROM deliveries WHERE delivery_id=?', deliveryId).first();
    return existing?.state === 'complete' || existing?.state === 'terminal' ? 'duplicate' : 'active';
  }
  async claimExecution(envelope, deliveryId) {
    const now = this.now(), until = leaseExpiry(now, this.leaseMs);
    const result = await this.statement(`INSERT INTO execution_leases (repository_id, pull_request, state, lease_until, delivery_id) VALUES (?, ?, 'active', ?, ?)
      ON CONFLICT(repository_id, pull_request) DO UPDATE SET lease_until=excluded.lease_until, delivery_id=excluded.delivery_id
      WHERE execution_leases.state='active' AND execution_leases.lease_until < ?`, envelope.repositoryId, envelope.pullRequest, until, deliveryId, now).run();
    return (result.meta?.changes ?? 0) > 0 ? 'claimed' : 'active';
  }
  async complete(envelope, deliveryId, result) {
    const now = this.now();
    await this.database.batch([
      this.statement("UPDATE deliveries SET state='complete', completed_at=?, code=? WHERE delivery_id=?", now, result.status, deliveryId),
      this.statement("DELETE FROM execution_leases WHERE repository_id=? AND pull_request=? AND delivery_id=?", envelope.repositoryId, envelope.pullRequest, deliveryId),
      this.statement('INSERT OR REPLACE INTO operational_results (delivery_id, policy_id, comparison_id, status, effect_count, recorded_at) VALUES (?, ?, ?, ?, ?, ?)', deliveryId, result.policyId ?? null, result.comparisonId ?? null, result.status, result.effectCount ?? 0, now)
    ]);
  }
  async terminal(envelope, deliveryId, code) {
    await this.database.batch([
      this.statement("UPDATE deliveries SET state='terminal', completed_at=?, code=? WHERE delivery_id=?", this.now(), code, deliveryId),
      this.statement('DELETE FROM execution_leases WHERE repository_id=? AND pull_request=? AND delivery_id=?', envelope.repositoryId, envelope.pullRequest, deliveryId)
    ]);
  }
  async recordCheck(identity, checkRunId) { await this.statement('INSERT OR REPLACE INTO app_checks (repository_id, pull_request, head_sha, policy_id, check_run_id) VALUES (?, ?, ?, ?, ?)', identity.repositoryId, identity.pullRequest, identity.head, identity.policyId, checkRunId).run(); }
  async check(identity) { return this.statement('SELECT check_run_id FROM app_checks WHERE repository_id=? AND pull_request=? AND head_sha=? AND policy_id=?', identity.repositoryId, identity.pullRequest, identity.head, identity.policyId).first(); }
  async recordHistory(identity, projection, retentionDays) {
    const now = this.now(), expires = retentionDays === null ? null : new Date(Date.parse(now) + retentionDays * 86_400_000).toISOString();
    await this.statement('INSERT OR REPLACE INTO history_records (repository_id, pull_request, comparison_id, policy_id, observed_at, expires_at, projection_json) VALUES (?, ?, ?, ?, ?, ?, ?)', identity.repositoryId, identity.pullRequest, identity.comparisonId, identity.policyId, now, expires, JSON.stringify(projection)).run();
  }
  async recordLifecycle(envelope) {
    const now = this.now(), state = envelope.action === 'deleted' ? 'removed' : 'active';
    const statements = [this.statement('INSERT INTO installations (installation_id, state, updated_at) VALUES (?, ?, ?) ON CONFLICT(installation_id) DO UPDATE SET state=excluded.state, updated_at=excluded.updated_at', envelope.installationId, state, now)];
    if (state === 'removed') statements.push(this.statement("UPDATE repositories SET state='offboarding', history_enabled=0, updated_at=? WHERE installation_id=?", now, envelope.installationId));
    await this.database.batch(statements);
  }
  /** Seven-day operational recovery is separate from any opted-in history lifetime. */
  async pruneRecovery() {
    const cutoff = new Date(Date.parse(this.now()) - 7 * 86_400_000).toISOString();
    await this.statement("DELETE FROM deliveries WHERE received_at < ? AND state IN ('complete', 'terminal')", cutoff).run();
    await this.statement('DELETE FROM operational_results WHERE recorded_at < ?', cutoff).run();
  }
  /** Expiry records a restore-resistant tombstone before removing the numeric projection. */
  async expireHistory() {
    const now = this.now();
    const expired = await this.statement('SELECT DISTINCT repository_id FROM history_records WHERE expires_at IS NOT NULL AND expires_at <= ?', now).all();
    const rows = expired.results ?? [];
    const until = new Date(Date.parse(now) + 37 * 86_400_000).toISOString();
    await this.database.batch([
      ...rows.map(entry => this.statement('INSERT OR REPLACE INTO deletion_tombstones (scope, deleted_at, reapply_until) VALUES (?, ?, ?)', `repository:${entry.repository_id}`, now, until)),
      this.statement('DELETE FROM history_records WHERE expires_at IS NOT NULL AND expires_at <= ?', now)
    ]);
  }
}
