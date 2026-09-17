// SPDX-License-Identifier: AGPL-3.0-only

const DAY = 86_400_000;
const leaseExpiry = (now, durationMs) => new Date(Date.parse(now) + durationMs).toISOString();
const nextAttempt = () => crypto.randomUUID();
const boundedDays = value => Number.isSafeInteger(value) && value >= 1 && value <= 3660 ? value : null;

/** D1 is the authority for delivery ownership. Every provider-capable path carries an attempt and fencing token. */
export class D1AppStore {
  constructor(database, { now = () => new Date().toISOString(), leaseMs = 60_000, attemptId = nextAttempt } = {}) {
    this.database = database;
    this.now = now;
    this.leaseMs = leaseMs;
    this.attemptId = attemptId;
  }

  statement(sql, ...values) { return this.database.prepare(sql).bind(...values); }
  async migrate(sql) { for (const statement of sql.split(/;\s*(?:\r?\n|$)/u).map(value => value.trim()).filter(Boolean)) await this.database.prepare(statement).run(); }
  async readiness() { await this.database.prepare('SELECT 1 AS ready').first(); return true; }

  async claimDelivery(envelope) {
    const now = this.now(), until = leaseExpiry(now, this.leaseMs), attemptId = this.attemptId();
    await this.statement(`INSERT INTO deliveries (delivery_id, installation_id, repository_id, pull_request, state, lease_until, attempt_id, fence, received_at)
      VALUES (?, ?, ?, ?, 'active', ?, ?, 1, ?)
      ON CONFLICT(delivery_id) DO UPDATE SET state='active', lease_until=excluded.lease_until, attempt_id=excluded.attempt_id, fence=deliveries.fence + 1, code=NULL
      WHERE deliveries.state IN ('active', 'retryable') AND deliveries.lease_until <= ?`, envelope.deliveryId, envelope.installationId,
    envelope.repositoryId ?? null, envelope.pullRequest ?? null, until, attemptId, now, now).run();
    const row = await this.statement('SELECT state, attempt_id, fence FROM deliveries WHERE delivery_id=?', envelope.deliveryId).first();
    if (row?.attempt_id === attemptId && Number.isSafeInteger(row.fence)) return { kind: 'claimed', attemptId, fence: row.fence };
    return ['complete', 'rejected', 'terminal', 'repair'].includes(row?.state) ? { kind: 'duplicate' } : { kind: 'active' };
  }

  async claimExecution(envelope, delivery) {
    const now = this.now(), until = leaseExpiry(now, this.leaseMs);
    await this.statement(`INSERT INTO execution_leases (repository_id, pull_request, state, lease_until, delivery_id, attempt_id, fence)
      VALUES (?, ?, 'active', ?, ?, ?, ?)
      ON CONFLICT(repository_id, pull_request) DO UPDATE SET lease_until=excluded.lease_until, delivery_id=excluded.delivery_id, attempt_id=excluded.attempt_id, fence=execution_leases.fence + 1
      WHERE execution_leases.lease_until <= ?`, envelope.repositoryId, envelope.pullRequest, until, envelope.deliveryId, delivery.attemptId, delivery.fence, now).run();
    const row = await this.statement('SELECT attempt_id, fence FROM execution_leases WHERE repository_id=? AND pull_request=?', envelope.repositoryId, envelope.pullRequest).first();
    return row?.attempt_id === delivery.attemptId && row?.fence === delivery.fence
      ? { kind: 'claimed', ...delivery, leaseUntil: until }
      : { kind: 'active' };
  }

  async renewLease(envelope, lease) {
    const now = this.now(), until = leaseExpiry(now, this.leaseMs);
    const [delivery, execution] = await this.database.batch([
      this.statement(`UPDATE deliveries SET lease_until=? WHERE delivery_id=? AND attempt_id=? AND fence=? AND state='active' AND lease_until > ?`, until, envelope.deliveryId, lease.attemptId, lease.fence, now),
      this.statement(`UPDATE execution_leases SET lease_until=? WHERE repository_id=? AND pull_request=? AND delivery_id=? AND attempt_id=? AND fence=? AND state='active' AND lease_until > ?`, until, envelope.repositoryId, envelope.pullRequest, envelope.deliveryId, lease.attemptId, lease.fence, now)
    ]);
    return (delivery.meta?.changes ?? 0) === 1 && (execution.meta?.changes ?? 0) === 1 ? { ...lease, leaseUntil: until } : undefined;
  }

  async assertLease(envelope, lease) {
    const row = await this.statement(`SELECT 1 AS owned FROM execution_leases WHERE repository_id=? AND pull_request=? AND delivery_id=? AND attempt_id=? AND fence=? AND state='active' AND lease_until > ?`, envelope.repositoryId, envelope.pullRequest, envelope.deliveryId, lease.attemptId, lease.fence, this.now()).first();
    if (!row?.owned) throw Object.assign(new Error('The execution lease is no longer owned by this attempt.'), { code: 'E_LEASE_LOST' });
  }

  async finish(envelope, lease, state, result = {}) {
    await this.assertLease(envelope, lease);
    const now = this.now();
    const completed = await this.statement(`UPDATE deliveries SET state=?, completed_at=?, lease_until=NULL, code=?
      WHERE delivery_id=? AND attempt_id=? AND fence=? AND state='active' AND lease_until > ?`, state, now, result.code ?? result.status ?? state, envelope.deliveryId, lease.attemptId, lease.fence, now).run();
    if ((completed.meta?.changes ?? 0) !== 1) throw Object.assign(new Error('Delivery ownership was lost before completion.'), { code: 'E_LEASE_LOST' });
    await this.database.batch([
      this.statement('DELETE FROM execution_leases WHERE repository_id=? AND pull_request=? AND delivery_id=? AND attempt_id=? AND fence=?', envelope.repositoryId, envelope.pullRequest, envelope.deliveryId, lease.attemptId, lease.fence),
      this.statement('INSERT INTO operational_results (delivery_id, policy_id, comparison_id, status, effect_count, recorded_at) VALUES (?, ?, ?, ?, ?, ?)', envelope.deliveryId, result.policyId ?? null, result.comparisonId ?? null, result.status ?? state, result.effectCount ?? 0, now)
    ]);
  }

  /** A retryable delivery releases this attempt; a later Queue attempt must acquire a higher fence. */
  async retry(envelope, lease, code) {
    await this.assertLease(envelope, lease);
    const now = this.now();
    const result = await this.statement(`UPDATE deliveries SET state='retryable', lease_until=?, code=?
      WHERE delivery_id=? AND attempt_id=? AND fence=? AND state='active' AND lease_until > ?`, now, code, envelope.deliveryId, lease.attemptId, lease.fence, now).run();
    if ((result.meta?.changes ?? 0) !== 1) throw Object.assign(new Error('Delivery ownership was lost before retry.'), { code: 'E_LEASE_LOST' });
    await this.statement('DELETE FROM execution_leases WHERE repository_id=? AND pull_request=? AND delivery_id=? AND attempt_id=? AND fence=?', envelope.repositoryId, envelope.pullRequest, envelope.deliveryId, lease.attemptId, lease.fence).run();
  }

  async finishLifecycle(envelope, delivery, state = 'complete') {
    const now = this.now();
    const result = await this.statement(`UPDATE deliveries SET state=?, completed_at=?, lease_until=NULL, code=? WHERE delivery_id=? AND attempt_id=? AND fence=? AND state='active' AND lease_until > ?`, state, now, state, envelope.deliveryId, delivery.attemptId, delivery.fence, now).run();
    if ((result.meta?.changes ?? 0) !== 1) throw Object.assign(new Error('Lifecycle delivery ownership was lost.'), { code: 'E_LEASE_LOST' });
  }

  async recordCheck(identity, checkRunId) {
    await this.statement(`INSERT INTO app_checks (repository_id, pull_request, head_sha, policy_id, check_run_id, app_id, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(repository_id, pull_request, head_sha, policy_id) DO UPDATE SET check_run_id=excluded.check_run_id, app_id=excluded.app_id, updated_at=excluded.updated_at`, identity.repositoryId, identity.pullRequest, identity.head, identity.policyId, checkRunId, identity.appId ?? null, this.now()).run();
  }
  async check(identity) { return this.statement('SELECT check_run_id, app_id FROM app_checks WHERE repository_id=? AND pull_request=? AND head_sha=? AND policy_id=?', identity.repositoryId, identity.pullRequest, identity.head, identity.policyId).first(); }

  async recordLifecycle(envelope) {
    const now = this.now(), removed = envelope.action === 'deleted' || envelope.action === 'suspend';
    const state = removed ? 'removed' : 'active';
    const statements = [this.statement(`INSERT INTO installations (installation_id, state, updated_at, offboarding_at)
      VALUES (?, ?, ?, ?) ON CONFLICT(installation_id) DO UPDATE SET state=CASE WHEN installations.state='removed' THEN installations.state ELSE excluded.state END, updated_at=excluded.updated_at, offboarding_at=excluded.offboarding_at`, envelope.installationId, state, now, removed ? now : null)];
    if (removed) statements.push(this.statement("UPDATE repositories SET state='offboarding', access_state='removed', history_enabled=0, updated_at=? WHERE installation_id=?", now, envelope.installationId));
    for (const repositoryId of envelope.repositories) {
      if (removed || envelope.action === 'removed') statements.push(this.statement("UPDATE repositories SET state='offboarding', access_state='removed', history_enabled=0, updated_at=? WHERE repository_id=? AND installation_id=?", now, repositoryId, envelope.installationId));
      else statements.push(this.statement(`INSERT INTO repositories (repository_id, installation_id, state, access_state, history_enabled, updated_at)
        VALUES (?, ?, 'pending-enable', 'available', 0, ?) ON CONFLICT(repository_id) DO UPDATE SET installation_id=excluded.installation_id, access_state='available', updated_at=excluded.updated_at`, repositoryId, envelope.installationId, now));
    }
    await this.database.batch(statements);
  }

  async historySettings(repositoryId) {
    const row = await this.statement(`SELECT r.history_enabled, r.retention_days, r.state, r.access_state, i.state AS installation_state
      FROM repositories r JOIN installations i ON i.installation_id=r.installation_id WHERE r.repository_id=?`, repositoryId).first();
    const tombstone = await this.statement('SELECT 1 AS blocked FROM deletion_tombstones WHERE scope=? AND reapply_until > ?', `repository:${repositoryId}`, this.now()).first();
    return { enabled: !tombstone?.blocked && row?.history_enabled === 1 && row?.state === 'active' && row?.access_state === 'available' && row?.installation_state === 'active', retentionDays: boundedDays(row?.retention_days) };
  }

  async executionAllowed(repositoryId) {
    const row = await this.statement(`SELECT r.state, r.access_state, i.state AS installation_state
      FROM repositories r JOIN installations i ON i.installation_id=r.installation_id WHERE r.repository_id=?`, repositoryId).first();
    return row?.state === 'active' && row?.access_state === 'available' && row?.installation_state === 'active';
  }

  async recordHistory(identity, projection, settings) {
    if (!settings.enabled) return { status: 'disabled' };
    const now = this.now(), expires = settings.retentionDays === null ? null : new Date(Date.parse(now) + settings.retentionDays * DAY).toISOString();
    try {
      await this.database.batch([
        this.statement(`INSERT INTO history_records (repository_id, pull_request, comparison_id, policy_id, schema_version, observed_at, expires_at, projection_json, state)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published') ON CONFLICT(repository_id, comparison_id) DO NOTHING`, identity.repositoryId, identity.pullRequest, identity.comparisonId, identity.policyId, projection.schemaVersion, now, expires, JSON.stringify({ evidence: projection.evidence, fileSet: projection.fileSet, totals: projection.totals })),
        ...projection.files.map(file => this.statement('INSERT OR IGNORE INTO history_file_rows (repository_id, comparison_id, policy_id, ordinal, values_json) VALUES (?, ?, ?, ?, ?)', identity.repositoryId, identity.comparisonId, identity.policyId, file.ordinal, JSON.stringify({ raw: file.raw, lines: file.lines }))),
        ...projection.effects.map((effect, ordinal) => this.statement('INSERT OR IGNORE INTO history_effect_rows (repository_id, comparison_id, policy_id, ordinal, effect_json) VALUES (?, ?, ?, ?, ?)', identity.repositoryId, identity.comparisonId, identity.policyId, ordinal, JSON.stringify(effect)))
      ]);
      return { status: 'published' };
    } catch (error) {
      await this.recordHistoryRepair(identity, 'E_HISTORY_PUBLICATION');
      return { status: 'repair', error };
    }
  }

  async recordHistoryRepair(identity, code) { await this.statement("INSERT INTO history_repairs (repository_id, comparison_id, policy_id, code, created_at, state) VALUES (?, ?, ?, ?, ?, 'open')", identity.repositoryId, identity.comparisonId, identity.policyId, code, this.now()).run(); }

  async setRepositoryConsent(repositoryId, { enabled, retentionDays, policyId, origin }) {
    const retention = enabled ? boundedDays(retentionDays) : null;
    if (enabled && retention === null) throw new TypeError('History consent requires a bounded retention period.');
    await this.statement(`UPDATE repositories SET history_enabled=?, retention_days=?, policy_id=?, consent_origin=?, state=CASE WHEN ?=1 AND access_state='available' THEN 'active' ELSE state END, updated_at=? WHERE repository_id=?`, enabled ? 1 : 0, retention, policyId ?? null, origin ?? null, enabled ? 1 : 0, this.now(), repositoryId).run();
  }

  async setRepositoryConfiguration(repositoryId, configuration, origin) {
    if (!configuration || typeof configuration !== 'object' || Array.isArray(configuration)) throw new TypeError('Repository configuration must be an object.');
    await this.statement('UPDATE repositories SET configuration_json=?, consent_origin=?, updated_at=? WHERE repository_id=?', JSON.stringify(configuration), origin, this.now(), repositoryId).run();
  }
  async setRepositoryExecution(repositoryId, { enabled, origin }) {
    if (typeof enabled !== 'boolean') throw new TypeError('Execution consent must be boolean.');
    await this.statement(`UPDATE repositories SET state=CASE WHEN ?=1 AND access_state='available' THEN 'active' ELSE 'pending-enable' END, consent_origin=?, updated_at=? WHERE repository_id=?`, enabled ? 1 : 0, origin ?? null, this.now(), repositoryId).run();
  }
  async repositoryConfiguration(repositoryId) {
    const row = await this.statement('SELECT configuration_json, consent_origin FROM repositories WHERE repository_id=?', repositoryId).first();
    if (!row?.configuration_json) return undefined;
    try { return { value: JSON.parse(row.configuration_json), origin: row.consent_origin ?? 'unknown' }; }
    catch { throw new TypeError('Stored repository configuration is invalid.'); }
  }

  async maintain() {
    const now = this.now(), recoveryCutoff = new Date(Date.parse(now) - 7 * DAY).toISOString(), graceCutoff = new Date(Date.parse(now) - 30 * DAY).toISOString();
    const expired = await this.statement('SELECT repository_id, comparison_id, policy_id FROM history_records WHERE expires_at IS NOT NULL AND expires_at <= ?', now).all();
    const tombstoneUntil = new Date(Date.parse(now) + 37 * DAY).toISOString();
    await this.database.batch([
      this.statement("DELETE FROM deliveries WHERE received_at < ? AND state IN ('complete', 'rejected', 'terminal', 'repair')", recoveryCutoff),
      this.statement('DELETE FROM operational_results WHERE recorded_at < ?', recoveryCutoff),
      ...((expired.results ?? []).flatMap(row => [
        this.statement('INSERT INTO deletion_tombstones (scope, deleted_at, reapply_until) VALUES (?, ?, ?) ON CONFLICT(scope) DO UPDATE SET deleted_at=excluded.deleted_at, reapply_until=excluded.reapply_until', `repository:${row.repository_id}`, now, tombstoneUntil),
        this.statement('DELETE FROM history_file_rows WHERE repository_id=? AND comparison_id=? AND policy_id=?', row.repository_id, row.comparison_id, row.policy_id),
        this.statement('DELETE FROM history_effect_rows WHERE repository_id=? AND comparison_id=? AND policy_id=?', row.repository_id, row.comparison_id, row.policy_id)
      ])),
      this.statement('DELETE FROM history_records WHERE expires_at IS NOT NULL AND expires_at <= ?', now),
      this.statement("DELETE FROM repositories WHERE state='offboarding' AND updated_at <= ?", graceCutoff),
      this.statement('DELETE FROM deletion_tombstones WHERE reapply_until <= ?', now)
    ]);
  }

  async deleteHistory(repositoryId) {
    const now = this.now(), until = new Date(Date.parse(now) + 37 * DAY).toISOString();
    const records = await this.statement('SELECT comparison_id, policy_id FROM history_records WHERE repository_id=?', repositoryId).all();
    await this.database.batch([
      this.statement('UPDATE repositories SET history_enabled=0, updated_at=? WHERE repository_id=?', now, repositoryId),
      this.statement('INSERT INTO deletion_tombstones (scope, deleted_at, reapply_until) VALUES (?, ?, ?) ON CONFLICT(scope) DO UPDATE SET deleted_at=excluded.deleted_at, reapply_until=excluded.reapply_until', `repository:${repositoryId}`, now, until),
      ...((records.results ?? []).flatMap(row => [
        this.statement('DELETE FROM history_file_rows WHERE repository_id=? AND comparison_id=? AND policy_id=?', repositoryId, row.comparison_id, row.policy_id),
        this.statement('DELETE FROM history_effect_rows WHERE repository_id=? AND comparison_id=? AND policy_id=?', repositoryId, row.comparison_id, row.policy_id)
      ])),
      this.statement('DELETE FROM history_records WHERE repository_id=?', repositoryId)
    ]);
  }

  async exportState() {
    const configurations = await this.statement('SELECT repository_id, history_enabled, retention_days, policy_id, consent_origin, configuration_json, state, access_state FROM repositories').all();
    const tombstones = await this.statement('SELECT scope, deleted_at, reapply_until FROM deletion_tombstones').all();
    return { kind: 'diffdevil.github-app-export', version: 1, exportedAt: this.now(), configurations: configurations.results ?? [], tombstones: tombstones.results ?? [] };
  }
  async importState(value) {
    if (!value || value.kind !== 'diffdevil.github-app-export' || value.version !== 1 || !Array.isArray(value.configurations) || !Array.isArray(value.tombstones)) throw new TypeError('Unsupported App state export.');
    for (const configuration of value.configurations) if (!Number.isSafeInteger(configuration?.repository_id) || configuration.repository_id < 1 || typeof configuration.history_enabled !== 'number' || typeof configuration.state !== 'string' || typeof configuration.access_state !== 'string') throw new TypeError('Invalid repository configuration export.');
    for (const tombstone of value.tombstones) if (typeof tombstone?.scope !== 'string' || typeof tombstone?.deleted_at !== 'string' || typeof tombstone?.reapply_until !== 'string') throw new TypeError('Invalid deletion tombstone export.');
    await this.database.batch([
      ...value.configurations.map(configuration => this.statement(`UPDATE repositories SET history_enabled=?, retention_days=?, policy_id=?, consent_origin=?, configuration_json=?, state=?, access_state=?, updated_at=? WHERE repository_id=?`, configuration.history_enabled, configuration.retention_days ?? null, configuration.policy_id ?? null, configuration.consent_origin ?? null, configuration.configuration_json ?? null, configuration.state, configuration.access_state, this.now(), configuration.repository_id)),
      ...value.tombstones.map(tombstone => this.statement('INSERT INTO deletion_tombstones (scope, deleted_at, reapply_until) VALUES (?, ?, ?) ON CONFLICT(scope) DO UPDATE SET deleted_at=excluded.deleted_at, reapply_until=excluded.reapply_until', tombstone.scope, tombstone.deleted_at, tombstone.reapply_until))
    ]);
  }
}
