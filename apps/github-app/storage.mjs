// SPDX-License-Identifier: AGPL-3.0-only
import { normalizeHistoryLens } from './history-analytics.mjs';

const DAY = 86_400_000;
const leaseExpiry = (now, durationMs) => new Date(Date.parse(now) + durationMs).toISOString();
const nextAttempt = () => crypto.randomUUID();
const boundedDays = value => Number.isSafeInteger(value) && value >= 1 && value <= 3660 ? value : null;
const batches = (values, size = 100) => Array.from({ length: Math.ceil(values.length / size) }, (_, index) => values.slice(index * size, (index + 1) * size));
const consentReasons = new Set(['never-enabled', 'explicitly-disabled', 're-consent-required', 'unknown']);
const validConsentReason = value => value === null || consentReasons.has(value);

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
    await this.statement('UPDATE deliveries SET duplicate_count=duplicate_count+1 WHERE delivery_id=?', envelope.deliveryId).run();
    return ['complete', 'rejected', 'terminal', 'repair'].includes(row?.state) ? { kind: 'duplicate' } : { kind: 'active' };
  }

  async claimExecution(envelope, delivery) {
    const now = this.now(), until = leaseExpiry(now, this.leaseMs);
    await this.statement(`INSERT INTO execution_leases (repository_id, pull_request, state, lease_until, delivery_id, attempt_id, fence)
      VALUES (?, ?, 'active', ?, ?, ?, ?)
      ON CONFLICT(repository_id, pull_request) DO UPDATE SET lease_until=excluded.lease_until, delivery_id=excluded.delivery_id, attempt_id=excluded.attempt_id, fence=execution_leases.fence + 1
      WHERE execution_leases.lease_until <= ?`, envelope.repositoryId, envelope.pullRequest, until, envelope.deliveryId, delivery.attemptId, delivery.fence, now).run();
    const row = await this.statement('SELECT attempt_id, fence FROM execution_leases WHERE repository_id=? AND pull_request=?', envelope.repositoryId, envelope.pullRequest).first();
    if (row?.attempt_id !== delivery.attemptId || !Number.isSafeInteger(row.fence)) return { kind: 'active' };
    await this.statement(`INSERT INTO execution_attempts (attempt_id, delivery_id, repository_id, pull_request, started_at, state)
      VALUES (?, ?, ?, ?, ?, 'active')`, delivery.attemptId, envelope.deliveryId, envelope.repositoryId, envelope.pullRequest, now).run();
    return { kind: 'claimed', ...delivery, executionFence: row.fence, leaseUntil: until };
  }

  async renewLease(envelope, lease) {
    const now = this.now(), until = leaseExpiry(now, this.leaseMs);
    const [delivery, execution] = await this.database.batch([
      this.statement(`UPDATE deliveries SET lease_until=? WHERE delivery_id=? AND attempt_id=? AND fence=? AND state='active' AND lease_until > ?`, until, envelope.deliveryId, lease.attemptId, lease.fence, now),
      this.statement(`UPDATE execution_leases SET lease_until=? WHERE repository_id=? AND pull_request=? AND delivery_id=? AND attempt_id=? AND fence=? AND state='active' AND lease_until > ?`, until, envelope.repositoryId, envelope.pullRequest, envelope.deliveryId, lease.attemptId, lease.executionFence, now)
    ]);
    return (delivery.meta?.changes ?? 0) === 1 && (execution.meta?.changes ?? 0) === 1 ? { ...lease, leaseUntil: until } : undefined;
  }

  async assertLease(envelope, lease) {
    const row = await this.statement(`SELECT 1 AS owned FROM execution_leases WHERE repository_id=? AND pull_request=? AND delivery_id=? AND attempt_id=? AND fence=? AND state='active' AND lease_until > ?`, envelope.repositoryId, envelope.pullRequest, envelope.deliveryId, lease.attemptId, lease.executionFence, this.now()).first();
    if (!row?.owned) throw Object.assign(new Error('The execution lease is no longer owned by this attempt.'), { code: 'E_LEASE_LOST' });
  }

  async finish(envelope, lease, state, result = {}) {
    await this.assertLease(envelope, lease);
    const now = this.now();
    const completed = await this.statement(`UPDATE deliveries SET state=?, completed_at=?, lease_until=NULL, code=?
      WHERE delivery_id=? AND attempt_id=? AND fence=? AND state='active' AND lease_until > ?`, state, now, result.code ?? result.status ?? state, envelope.deliveryId, lease.attemptId, lease.fence, now).run();
    if ((completed.meta?.changes ?? 0) !== 1) throw Object.assign(new Error('Delivery ownership was lost before completion.'), { code: 'E_LEASE_LOST' });
    await this.database.batch([
      this.statement('DELETE FROM execution_leases WHERE repository_id=? AND pull_request=? AND delivery_id=? AND attempt_id=? AND fence=?', envelope.repositoryId, envelope.pullRequest, envelope.deliveryId, lease.attemptId, lease.executionFence),
      this.statement("UPDATE execution_attempts SET completed_at=?, state=?, code=? WHERE attempt_id=? AND state='active'", now, state, result.code ?? result.status ?? state, lease.attemptId),
      this.statement('INSERT INTO operational_results (delivery_id, policy_id, comparison_id, status, effect_count, recorded_at) VALUES (?, ?, ?, ?, ?, ?)', envelope.deliveryId, result.policyId ?? result.repair?.identity?.policyId ?? null, result.comparisonId ?? result.repair?.identity?.comparisonId ?? null, result.status ?? state, result.effectCount ?? 0, now),
      ...(state === 'repair' ? [this.statement(`INSERT INTO repairs (repair_id, repair_kind, repository_id, pull_request, base_sha, head_sha, policy_id, comparison_id, projection_json, state, code, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?) ON CONFLICT(repair_id) DO UPDATE SET repair_kind=excluded.repair_kind, repository_id=excluded.repository_id, pull_request=excluded.pull_request, base_sha=excluded.base_sha, head_sha=excluded.head_sha, policy_id=excluded.policy_id, comparison_id=excluded.comparison_id, projection_json=excluded.projection_json, state='open', code=excluded.code, created_at=excluded.created_at`, `delivery:${envelope.deliveryId}`, result.repair?.kind ?? 'execution', envelope.repositoryId, result.repair?.identity?.pullRequest ?? envelope.pullRequest ?? null, result.repair?.identity?.base ?? null, result.repair?.identity?.head ?? null, result.repair?.identity?.policyId ?? null, result.repair?.identity?.comparisonId ?? null, JSON.stringify(result.repair?.projection ?? {}), result.code ?? 'E_APP_EXECUTION', now)] : [])
    ]);
  }

  /** A retryable delivery releases this attempt; a later Queue attempt must acquire a higher fence. */
  async retry(envelope, lease, code) {
    await this.assertLease(envelope, lease);
    const now = this.now();
    const result = await this.statement(`UPDATE deliveries SET state='retryable', lease_until=?, code=?
      WHERE delivery_id=? AND attempt_id=? AND fence=? AND state='active' AND lease_until > ?`, now, code, envelope.deliveryId, lease.attemptId, lease.fence, now).run();
    if ((result.meta?.changes ?? 0) !== 1) throw Object.assign(new Error('Delivery ownership was lost before retry.'), { code: 'E_LEASE_LOST' });
    await this.statement('DELETE FROM execution_leases WHERE repository_id=? AND pull_request=? AND delivery_id=? AND attempt_id=? AND fence=?', envelope.repositoryId, envelope.pullRequest, envelope.deliveryId, lease.attemptId, lease.executionFence).run();
    await this.statement("UPDATE execution_attempts SET completed_at=?, state='retryable', code=? WHERE attempt_id=? AND state='active'", now, code, lease.attemptId).run();
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

  /** Reappearing access never renews consent; a live deletion tombstone records lost reach. */
  repositoryAccessStatement(repositoryId, installationId, now) {
    const scope = `repository:${repositoryId}`;
    return this.statement(`INSERT INTO repositories (repository_id, installation_id, state, access_state, history_enabled, execution_consent_reason, history_consent_reason, updated_at)
      VALUES (?, ?, 'pending-enable', 'available', 0,
        COALESCE((SELECT execution_consent_reason FROM deletion_tombstones WHERE scope=? AND reapply_until > ?), CASE WHEN EXISTS (SELECT 1 FROM deletion_tombstones WHERE scope=? AND reapply_until > ?) THEN 're-consent-required' ELSE 'never-enabled' END),
        COALESCE((SELECT history_consent_reason FROM deletion_tombstones WHERE scope=? AND reapply_until > ?), CASE WHEN EXISTS (SELECT 1 FROM deletion_tombstones WHERE scope=? AND reapply_until > ?) THEN 're-consent-required' ELSE 'never-enabled' END),
        ?)
      ON CONFLICT(repository_id) DO UPDATE SET installation_id=excluded.installation_id, access_state='available', state=CASE WHEN repositories.state IN ('removed', 'offboarding') THEN 'pending-enable' ELSE repositories.state END, updated_at=excluded.updated_at`, repositoryId, installationId, scope, now, scope, now, scope, now, scope, now, now);
  }

  async recordLifecycle(envelope) {
    const now = this.now(), removed = envelope.action === 'deleted';
    const suspended = envelope.action === 'suspend';
    const resumed = envelope.action === 'unsuspend';
    const state = removed ? 'removed' : suspended ? 'suspended' : 'active';
    const statements = [this.statement(`INSERT INTO installations (installation_id, state, updated_at, offboarding_at)
      VALUES (?, ?, ?, ?) ON CONFLICT(installation_id) DO UPDATE SET state=CASE WHEN installations.state='removed' THEN installations.state ELSE excluded.state END, updated_at=excluded.updated_at, offboarding_at=excluded.offboarding_at`, envelope.installationId, state, now, removed ? now : null)];
    const interrupted = "CASE WHEN execution_consent_reason IS NULL THEN 're-consent-required' ELSE execution_consent_reason END";
    const interruptedHistory = "CASE WHEN history_consent_reason IS NULL THEN 're-consent-required' ELSE history_consent_reason END";
    if (removed) statements.push(this.statement(`UPDATE repositories SET state='offboarding', access_state='removed', history_enabled=0, execution_consent_reason=${interrupted}, history_consent_reason=${interruptedHistory}, updated_at=? WHERE installation_id=?`, now, envelope.installationId));
    if (suspended) statements.push(this.statement(`UPDATE repositories SET state='pending-enable', access_state='suspended', execution_consent_reason=${interrupted}, history_consent_reason=${interruptedHistory}, updated_at=? WHERE installation_id=?`, now, envelope.installationId));
    if (resumed) statements.push(this.statement("UPDATE repositories SET access_state='available', state=CASE WHEN state='suspended' THEN 'pending-enable' ELSE state END, updated_at=? WHERE installation_id=?", now, envelope.installationId));
    for (const repositoryId of envelope.removedRepositories) {
      statements.push(this.statement(`UPDATE repositories SET state='offboarding', access_state='removed', history_enabled=0, execution_consent_reason=${interrupted}, history_consent_reason=${interruptedHistory}, updated_at=? WHERE repository_id=? AND installation_id=?`, now, repositoryId, envelope.installationId));
    }
    for (const repositoryId of envelope.addedRepositories) {
      if (removed) statements.push(this.statement(`UPDATE repositories SET state='offboarding', access_state='removed', history_enabled=0, execution_consent_reason=${interrupted}, history_consent_reason=${interruptedHistory}, updated_at=? WHERE repository_id=? AND installation_id=?`, now, repositoryId, envelope.installationId));
      else statements.push(this.repositoryAccessStatement(repositoryId, envelope.installationId, now));
    }
    await this.database.batch(statements);
  }

  /** A complete provider-selected repository list may reconcile access, but never re-enables execution or collection. */
  async reconcileRepositories(installationId, repositoryIds) {
    if (!Array.isArray(repositoryIds) || repositoryIds.some(id => !Number.isSafeInteger(id) || id < 1)) throw new TypeError('Repository reconciliation requires numeric repository IDs.');
    const now = this.now(), selected = [...new Set(repositoryIds)];
    const existing = await this.statement('SELECT repository_id FROM repositories WHERE installation_id=?', installationId).all();
    const statements = [
      ...selected.map(id => this.repositoryAccessStatement(id, installationId, now)),
      ...((existing.results ?? []).filter(row => !selected.includes(row.repository_id)).map(row => this.statement("UPDATE repositories SET state='offboarding', access_state='removed', history_enabled=0, execution_consent_reason=CASE WHEN execution_consent_reason IS NULL THEN 're-consent-required' ELSE execution_consent_reason END, history_consent_reason=CASE WHEN history_consent_reason IS NULL THEN 're-consent-required' ELSE history_consent_reason END, updated_at=? WHERE repository_id=?", now, row.repository_id)))
    ];
    await this.database.batch(statements);
  }

  async historySettings(repositoryId) {
    const row = await this.statement(`SELECT r.history_enabled, r.history_consent_reason, r.retention_days, r.state, r.access_state, i.state AS installation_state
      FROM repositories r JOIN installations i ON i.installation_id=r.installation_id WHERE r.repository_id=?`, repositoryId).first();
    const tombstone = await this.statement('SELECT 1 AS blocked FROM deletion_tombstones WHERE scope IN (?, ?) AND reapply_until > ?', `history:${repositoryId}`, `repository:${repositoryId}`, this.now()).first();
    return { enabled: !tombstone?.blocked && row?.history_enabled === 1 && row?.history_consent_reason === null && row?.state === 'active' && row?.access_state === 'available' && row?.installation_state === 'active', retentionDays: boundedDays(row?.retention_days) };
  }

  async executionAllowed(repositoryId) {
    const row = await this.statement(`SELECT r.state, r.access_state, r.execution_consent_reason, i.state AS installation_state
      FROM repositories r JOIN installations i ON i.installation_id=r.installation_id WHERE r.repository_id=?`, repositoryId).first();
    return row?.state === 'active' && row?.access_state === 'available' && row?.installation_state === 'active' && row?.execution_consent_reason === null;
  }

  async recordHistory(identity, projection) {
    const settings = await this.historySettings(identity.repositoryId);
    if (!settings.enabled) return { status: 'disabled' };
    const now = this.now(), expires = settings.retentionDays === null ? null : new Date(Date.parse(now) + settings.retentionDays * DAY).toISOString();
    let record;
    try {
      record = await this.statement(`INSERT INTO history_records (repository_id, pull_request, comparison_id, policy_id, schema_version, engine_version, report_version, metric_version, base_sha, head_sha, observed_at, expires_at, projection_json, coverage_json, results_json, gaps_json, state)
        SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'publishing'
        WHERE EXISTS (SELECT 1 FROM repositories r JOIN installations i ON i.installation_id=r.installation_id WHERE r.repository_id=? AND r.history_enabled=1 AND r.state='active' AND r.access_state='available' AND i.state='active')
          AND NOT EXISTS (SELECT 1 FROM deletion_tombstones WHERE scope IN (?, ?) AND reapply_until > ?)
        ON CONFLICT(repository_id, comparison_id, policy_id, schema_version, engine_version, report_version, metric_version) DO NOTHING RETURNING id`,
      identity.repositoryId, identity.pullRequest, identity.comparisonId, identity.policyId, projection.schemaVersion, projection.engineVersion, projection.reportVersion, projection.metricVersion,
       projection.source?.base ?? null, projection.source?.head ?? null, now, expires,
       JSON.stringify({ evidence: projection.evidence, totals: projection.totals }), JSON.stringify(projection.fileSet),
       JSON.stringify({ metrics: projection.configuredResults, scopes: projection.scopes, bands: projection.bands, rules: projection.rules }),
       JSON.stringify(projection.gaps), identity.repositoryId, `history:${identity.repositoryId}`, `repository:${identity.repositoryId}`, now).first();
      if (!record?.id) return { status: 'disabled' };
      const statements = [
        ...projection.files.map(file => this.statement('INSERT INTO history_file_rows (history_id, ordinal, values_json) VALUES (?, ?, ?)', record.id, file.ordinal, JSON.stringify({ raw: file.raw, lines: file.lines, inclusion: file.inclusion, evidence: file.evidence, changeType: file.changeType, material: file.material }))),
        ...projection.effects.map((effect, ordinal) => this.statement('INSERT INTO history_effect_rows (history_id, ordinal, effect_json) VALUES (?, ?, ?)', record.id, ordinal, JSON.stringify(effect)))
      ];
      for (const batch of batches(statements)) await this.database.batch(batch);
      const published = await this.statement(`UPDATE history_records SET state='published' WHERE id=? AND state='publishing'
        AND EXISTS (SELECT 1 FROM repositories r JOIN installations i ON i.installation_id=r.installation_id WHERE r.repository_id=? AND r.history_enabled=1 AND r.state='active' AND r.access_state='available' AND i.state='active')
        AND NOT EXISTS (SELECT 1 FROM deletion_tombstones WHERE scope IN (?, ?) AND reapply_until > ?)`, record.id, identity.repositoryId, `history:${identity.repositoryId}`, `repository:${identity.repositoryId}`, this.now()).run();
      if ((published.meta?.changes ?? 0) !== 1) {
        await this.statement("UPDATE history_records SET state='incomplete' WHERE id=? AND state='publishing'", record.id).run();
        if ((await this.historySettings(identity.repositoryId)).enabled) await this.recordHistoryRepair(identity, projection, 'E_HISTORY_CONSENT_CHANGED');
        else await this.removeHistoryRecord(record.id);
        return { status: 'repair' };
      }
      return { status: 'published' };
    } catch (error) {
      if (record?.id) await this.statement("UPDATE history_records SET state='incomplete' WHERE id=? AND state='publishing'", record.id).run();
      if ((await this.historySettings(identity.repositoryId)).enabled) await this.recordHistoryRepair(identity, projection, 'E_HISTORY_PUBLICATION');
      else if (record?.id) await this.removeHistoryRecord(record.id);
      return { status: 'repair', error };
    }
  }

  async recordHistoryRepair(identity, projection, code) {
    const now = this.now(), repairId = `history:${identity.repositoryId}:${identity.comparisonId}:${identity.policyId}:${projection.engineVersion}:${projection.reportVersion}`;
    await this.statement(`INSERT INTO repairs (repair_id, repair_kind, repository_id, pull_request, base_sha, head_sha, policy_id, comparison_id, projection_json, state, code, created_at)
      SELECT ?, 'history-publication', ?, ?, ?, ?, ?, ?, ?, 'open', ?, ? WHERE EXISTS (SELECT 1 FROM repositories r JOIN installations i ON i.installation_id=r.installation_id WHERE r.repository_id=? AND r.history_enabled=1 AND r.state='active' AND r.access_state='available' AND i.state='active')
        AND NOT EXISTS (SELECT 1 FROM deletion_tombstones WHERE scope=? AND reapply_until > ?)
      ON CONFLICT(repair_id) DO UPDATE SET projection_json=excluded.projection_json, state='open', code=excluded.code, created_at=excluded.created_at`, repairId, identity.repositoryId, identity.pullRequest, projection.source?.base ?? null, projection.source?.head ?? null, identity.policyId, identity.comparisonId, JSON.stringify({ source: projection.source, schemaVersion: projection.schemaVersion, engineVersion: projection.engineVersion, reportVersion: projection.reportVersion, metricVersion: projection.metricVersion }), code, now, identity.repositoryId, `repository:${identity.repositoryId}`, now).run();
  }

  /** Repairs carry stable identities only; an operator must reacquire provider facts before any idempotent reconciliation. */
  async claimRepair(repairId) {
    const now = this.now();
    const result = await this.statement("UPDATE repairs SET state='active', claimed_at=? WHERE repair_id=? AND state='open'", now, repairId).run();
    if ((result.meta?.changes ?? 0) !== 1) return undefined;
    const row = await this.statement('SELECT repair_kind, repository_id, pull_request, base_sha, head_sha, policy_id, comparison_id, projection_json, code FROM repairs WHERE repair_id=?', repairId).first();
    return row ? { repairId, kind: row.repair_kind, identity: { repositoryId: row.repository_id, pullRequest: row.pull_request, base: row.base_sha, head: row.head_sha, policyId: row.policy_id, comparisonId: row.comparison_id }, projection: JSON.parse(row.projection_json), code: row.code } : undefined;
  }
  async completeRepair(repairId) { await this.statement("UPDATE repairs SET state='complete', completed_at=? WHERE repair_id=? AND state='active'", this.now(), repairId).run(); }
  async failRepair(repairId, code) { await this.statement("UPDATE repairs SET state='open', code=? WHERE repair_id=? AND state='active'", code, repairId).run(); }

  async setRepositoryConsent(repositoryId, { enabled, retentionDays, policyId, origin }) {
    const retention = enabled ? boundedDays(retentionDays) : null;
    if (enabled && retention === null) throw new TypeError('History consent requires a bounded retention period.');
    await this.statement('UPDATE repositories SET history_enabled=?, retention_days=?, policy_id=?, history_consent_origin=?, history_consent_reason=?, history_consent_actor_id=NULL, updated_at=? WHERE repository_id=?', enabled ? 1 : 0, retention, policyId ?? null, origin ?? null, enabled ? null : 'explicitly-disabled', this.now(), repositoryId).run();
  }

  async setRepositoryConfiguration(repositoryId, configuration, origin, policyId = null) {
    if (!configuration || typeof configuration !== 'object' || Array.isArray(configuration)) throw new TypeError('Repository configuration must be an object.');
    await this.statement('UPDATE repositories SET configuration_json=?, configuration_origin=?, configuration_policy_id=?, updated_at=? WHERE repository_id=?', JSON.stringify(configuration), origin ?? null, policyId, this.now(), repositoryId).run();
  }
  async setRepositoryExecution(repositoryId, { enabled, origin }) {
    if (typeof enabled !== 'boolean') throw new TypeError('Execution consent must be boolean.');
    await this.statement(`UPDATE repositories SET state=CASE WHEN ?=1 AND access_state='available' THEN 'active' ELSE 'pending-enable' END, execution_consent_origin=?, execution_consent_reason=?, execution_consent_actor_id=NULL, updated_at=? WHERE repository_id=?`, enabled ? 1 : 0, origin ?? null, enabled ? null : 'explicitly-disabled', this.now(), repositoryId).run();
  }
  async repositoryConfiguration(repositoryId) {
    const row = await this.statement('SELECT configuration_json, configuration_origin, configuration_policy_id FROM repositories WHERE repository_id=?', repositoryId).first();
    if (!row?.configuration_json) return undefined;
    try { return { value: JSON.parse(row.configuration_json), origin: row.configuration_origin ?? 'unknown', policyId: row.configuration_policy_id ?? 'unknown' }; }
    catch { throw new TypeError('Stored repository configuration is invalid.'); }
  }

  /** Read persisted admission facts without inferring live provider reach or dashboard authorization. */
  async repositoryAdmission(repositoryId) {
    const row = await this.statement(`SELECT r.repository_id, r.installation_id, r.state, r.access_state, r.settings_revision,
      r.execution_consent_origin, r.execution_consent_reason, r.execution_consent_actor_id, r.history_enabled, r.retention_days, r.history_consent_origin, r.history_consent_reason, r.history_consent_actor_id,
      r.configuration_origin, r.configuration_json, r.configuration_policy_id, r.writer_standing, r.writer_origin, i.state AS installation_state
      FROM repositories r JOIN installations i ON i.installation_id=r.installation_id WHERE r.repository_id=?`, repositoryId).first();
    if (!row) return undefined;
    const tombstone = await this.statement('SELECT 1 AS blocked FROM deletion_tombstones WHERE scope=? AND reapply_until > ?', `repository:${repositoryId}`, this.now()).first();
    let configuration;
    if (row.configuration_json) {
      try { configuration = JSON.parse(row.configuration_json); }
      catch { configuration = undefined; }
    }
    const delivery = await this.statement('SELECT received_at, state, code FROM deliveries WHERE repository_id=? ORDER BY received_at DESC LIMIT 1', repositoryId).first();
    return {
      repositoryId: row.repository_id,
      installationId: row.installation_id,
      state: row.state,
      reach: { repository: row.access_state, installation: row.installation_state, tombstoned: Boolean(tombstone?.blocked) },
      revision: Number.isSafeInteger(row.settings_revision) ? row.settings_revision : 0,
      execution: { origin: row.execution_consent_origin ?? 'unknown', reason: row.execution_consent_reason ?? null, actorId: row.execution_consent_actor_id ?? null },
      history: { enabled: row.history_enabled === 1, retentionDays: boundedDays(row.retention_days), origin: row.history_consent_origin ?? 'unknown', reason: row.history_consent_reason ?? null, actorId: row.history_consent_actor_id ?? null },
      configuration: { origin: row.configuration_origin ?? 'unknown', policyId: row.configuration_policy_id ?? 'unknown', value: configuration },
      writer: { confidence: row.writer_standing ?? 'unverified', origin: row.writer_origin ?? 'unknown' },
      lastDelivery: delivery ? { receivedAt: delivery.received_at, state: delivery.state, code: delivery.code ?? undefined } : undefined
    };
  }

  /** Compare-and-set update for the future dashboard/operator boundary; it never changes provider reach. */
  async updateRepositoryAdmission(repositoryId, { revision, configuration, execution, history, writer, origin, actorId, executionConsentChanged, historyConsentChanged }) {
    if (!Number.isSafeInteger(revision) || revision < 0) throw Object.assign(new TypeError('Admission revision must be a non-negative integer.'), { code: 'E_ADMISSION_REVISION' });
    if (!origin || typeof origin !== 'string') throw Object.assign(new TypeError('Admission origin is required.'), { code: 'E_ADMISSION_ORIGIN' });
    const nextRevision = revision + 1, now = this.now();
    const statements = [this.statement(`UPDATE repositories SET settings_revision=?, updated_at=? WHERE repository_id=? AND settings_revision=?
      AND access_state='available' AND state NOT IN ('removed', 'offboarding')
      AND EXISTS (SELECT 1 FROM installations WHERE installation_id=repositories.installation_id AND state='active')
       AND NOT EXISTS (SELECT 1 FROM deletion_tombstones WHERE scope=? AND reapply_until > ?)`, nextRevision, now, repositoryId, revision, `repository:${repositoryId}`, now)];
    if (configuration) statements.push(this.statement('UPDATE repositories SET configuration_json=?, configuration_origin=?, configuration_policy_id=? WHERE repository_id=? AND settings_revision=?', JSON.stringify(configuration.value), origin, configuration.policyId, repositoryId, nextRevision));
    if (writer) statements.push(this.statement('UPDATE repositories SET writer_standing=?, writer_origin=? WHERE repository_id=? AND settings_revision=?', writer.confidence, origin, repositoryId, nextRevision));
    if (executionConsentChanged) statements.push(this.statement(`UPDATE repositories SET state=CASE WHEN ?=1 THEN 'active' ELSE 'pending-enable' END, execution_consent_origin=?, execution_consent_reason=?, execution_consent_actor_id=? WHERE repository_id=? AND settings_revision=?`, execution ? 1 : 0, origin, execution ? null : 'explicitly-disabled', actorId ?? null, repositoryId, nextRevision));
    if (history) {
      statements.push(this.statement('UPDATE repositories SET history_enabled=?, retention_days=?, policy_id=? WHERE repository_id=? AND settings_revision=?', history.enabled ? 1 : 0, history.retentionDays, history.policyId ?? null, repositoryId, nextRevision));
      if (historyConsentChanged) statements.push(this.statement('UPDATE repositories SET history_consent_origin=?, history_consent_reason=?, history_consent_actor_id=? WHERE repository_id=? AND settings_revision=?', origin, history.enabled ? null : 'explicitly-disabled', actorId ?? null, repositoryId, nextRevision));
    }
    const results = await this.database.batch(statements);
    if ((results[0]?.meta?.changes ?? 0) !== 1) return undefined;
    return this.repositoryAdmission(repositoryId);
  }
  async repositoryConsentState(repositoryId) {
    const row = await this.statement(`SELECT execution_consent_origin, execution_consent_reason, history_consent_origin, history_consent_reason, configuration_origin
      FROM repositories WHERE repository_id=?`, repositoryId).first();
    if (!row) return undefined;
    return {
      execution: { origin: row.execution_consent_origin ?? 'unknown', reason: row.execution_consent_reason === null ? null : row.execution_consent_reason ?? 'unknown' },
      history: { origin: row.history_consent_origin ?? 'unknown', reason: row.history_consent_reason === null ? null : row.history_consent_reason ?? 'unknown' },
      configuration: { origin: row.configuration_origin ?? 'unknown' }
    };
  }

  async removeHistoryRecord(historyId) {
    await this.database.batch([
      this.statement('DELETE FROM history_file_rows WHERE history_id=?', historyId),
      this.statement('DELETE FROM history_effect_rows WHERE history_id=?', historyId),
      this.statement('DELETE FROM history_records WHERE id=?', historyId)
    ]);
  }

  async removeHistoryRecords(repositoryId) {
    const records = await this.statement('SELECT id FROM history_records WHERE repository_id=?', repositoryId).all();
    const statements = (records.results ?? []).flatMap(row => [
      this.statement('DELETE FROM history_file_rows WHERE history_id=?', row.id),
      this.statement('DELETE FROM history_effect_rows WHERE history_id=?', row.id),
      this.statement('DELETE FROM history_records WHERE id=?', row.id)
    ]);
    for (const batch of batches(statements)) await this.database.batch(batch);
  }

  /** Read only currently retained, published projections from one repository. */
  async historyWindow(repositoryId, from, to, policyId) {
    const now = this.now();
    if (!(await this.historySettings(repositoryId)).enabled) return [];
    const blocked = await this.statement('SELECT 1 AS blocked FROM deletion_tombstones WHERE scope IN (?, ?) AND reapply_until > ?', `history:${repositoryId}`, `repository:${repositoryId}`, now).first();
    if (blocked?.blocked) return [];
    const records = await this.statement(`SELECT id, repository_id, pull_request, comparison_id, policy_id, schema_version, engine_version, report_version, metric_version,
      base_sha, head_sha, observed_at, expires_at, projection_json, coverage_json, results_json, gaps_json
      FROM history_records WHERE repository_id=? AND state='published' AND observed_at>=? AND observed_at<?
      AND (expires_at IS NULL OR expires_at>?) AND (? IS NULL OR policy_id=?) ORDER BY observed_at DESC, id DESC`,
    repositoryId, from, to, now, policyId ?? null, policyId ?? null).all();
    const rows = records.results ?? [], files = new Map(), effects = new Map();
    for (const chunk of batches(rows.map(row => row.id))) {
      const placeholders = chunk.map(() => '?').join(',');
      const [fileRows, effectRows] = await Promise.all([
        this.statement(`SELECT history_id, ordinal, values_json FROM history_file_rows WHERE history_id IN (${placeholders}) ORDER BY history_id, ordinal`, ...chunk).all(),
        this.statement(`SELECT history_id, ordinal, effect_json FROM history_effect_rows WHERE history_id IN (${placeholders}) ORDER BY history_id, ordinal`, ...chunk).all()
      ]);
      for (const row of fileRows.results ?? []) { if (!files.has(row.history_id)) files.set(row.history_id, []); files.get(row.history_id).push(JSON.parse(row.values_json)); }
      for (const row of effectRows.results ?? []) { if (!effects.has(row.history_id)) effects.set(row.history_id, []); effects.get(row.history_id).push(JSON.parse(row.effect_json)); }
    }
    if (!(await this.historySettings(repositoryId)).enabled) return [];
    return rows.map(row => ({ repositoryId: row.repository_id, pullRequest: row.pull_request, comparisonId: row.comparison_id, policyId: row.policy_id,
      schemaVersion: row.schema_version, engineVersion: row.engine_version, reportVersion: row.report_version, metricVersion: row.metric_version,
      base: row.base_sha, head: row.head_sha, observedAt: row.observed_at, expiresAt: row.expires_at,
      projection: JSON.parse(row.projection_json), fileSet: JSON.parse(row.coverage_json), results: JSON.parse(row.results_json),
      gaps: JSON.parse(row.gaps_json), files: files.get(row.id) ?? [], effects: effects.get(row.id) ?? [] }));
  }

  async historyOperations(repositoryId, from, to) {
    const attempts = await this.statement(`SELECT a.started_at, a.completed_at, a.state, a.code, d.received_at FROM execution_attempts a
      JOIN deliveries d ON d.delivery_id=a.delivery_id
      WHERE a.repository_id=? AND a.started_at>=? AND a.started_at<? ORDER BY a.started_at`, repositoryId, from, to).all();
    const deliveries = await this.statement(`SELECT d.received_at, d.completed_at, d.state, d.code, d.duplicate_count, o.status, o.effect_count
      FROM deliveries d LEFT JOIN operational_results o ON o.delivery_id=d.delivery_id
      WHERE d.repository_id=? AND d.received_at>=? AND d.received_at<? ORDER BY d.received_at`, repositoryId, from, to).all();
    const repairs = await this.statement(`SELECT state, code, created_at, completed_at FROM repairs
      WHERE repository_id=? AND created_at>=? AND created_at<? ORDER BY created_at`, repositoryId, from, to).all();
    return { attempts: attempts.results ?? [], deliveries: deliveries.results ?? [], repairs: repairs.results ?? [] };
  }

  async saveHistoryLens(repositoryId, lens) {
    const value = normalizeHistoryLens(repositoryId, lens);
    await this.statement(`INSERT INTO history_lenses (repository_id, lens_id, lens_json, created_at)
      VALUES (?, ?, ?, ?) ON CONFLICT(repository_id, lens_id) DO UPDATE SET lens_json=excluded.lens_json`,
    repositoryId, value.id, JSON.stringify(value), this.now()).run();
  }
  async historyLenses(repositoryId) {
    const result = await this.statement('SELECT lens_json, created_at FROM history_lenses WHERE repository_id=? ORDER BY lens_id', repositoryId).all();
    return (result.results ?? []).map(row => ({ ...JSON.parse(row.lens_json), createdAt: row.created_at }));
  }
  async removeHistoryLens(repositoryId, lensId) { await this.statement('DELETE FROM history_lenses WHERE repository_id=? AND lens_id=?', repositoryId, lensId).run(); }

  async maintain() {
    const now = this.now(), recoveryCutoff = new Date(Date.parse(now) - 7 * DAY).toISOString(), graceCutoff = new Date(Date.parse(now) - 30 * DAY).toISOString();
    const expired = await this.statement('SELECT id FROM history_records WHERE expires_at IS NOT NULL AND expires_at <= ?', now).all();
    const offboarding = await this.statement("SELECT repository_id, execution_consent_reason, history_consent_reason FROM repositories WHERE state='offboarding' AND updated_at <= ?", graceCutoff).all();
    const expiryStatements = (expired.results ?? []).flatMap(row => [this.statement('DELETE FROM history_file_rows WHERE history_id=?', row.id), this.statement('DELETE FROM history_effect_rows WHERE history_id=?', row.id), this.statement('DELETE FROM history_records WHERE id=?', row.id)]);
    for (const batch of batches(expiryStatements)) await this.database.batch(batch);
    const tombstoneUntil = new Date(Date.parse(now) + 37 * DAY).toISOString();
    for (const row of offboarding.results ?? []) {
      await this.removeHistoryRecords(row.repository_id);
      await this.database.batch([
        this.statement('DELETE FROM history_lenses WHERE repository_id=?', row.repository_id),
        this.statement('DELETE FROM app_checks WHERE repository_id=?', row.repository_id),
        this.statement('DELETE FROM repairs WHERE repository_id=?', row.repository_id),
        this.statement('DELETE FROM operational_results WHERE delivery_id IN (SELECT delivery_id FROM deliveries WHERE repository_id=?)', row.repository_id),
        this.statement('DELETE FROM execution_attempts WHERE repository_id=?', row.repository_id),
        this.statement('DELETE FROM deliveries WHERE repository_id=?', row.repository_id),
        this.statement('DELETE FROM execution_leases WHERE repository_id=?', row.repository_id),
        this.statement('INSERT INTO deletion_tombstones (scope, deleted_at, reapply_until, execution_consent_reason, history_consent_reason) VALUES (?, ?, ?, ?, ?) ON CONFLICT(scope) DO UPDATE SET deleted_at=excluded.deleted_at, reapply_until=excluded.reapply_until, execution_consent_reason=excluded.execution_consent_reason, history_consent_reason=excluded.history_consent_reason', `repository:${row.repository_id}`, now, tombstoneUntil, row.execution_consent_reason ?? 're-consent-required', row.history_consent_reason ?? 're-consent-required'),
        this.statement('DELETE FROM repositories WHERE repository_id=?', row.repository_id)
      ]);
    }
    await this.database.batch([
      this.statement('DELETE FROM execution_attempts WHERE delivery_id IN (SELECT delivery_id FROM deliveries WHERE received_at < ? AND state IN (\'complete\', \'rejected\', \'terminal\', \'repair\'))', recoveryCutoff),
      this.statement("DELETE FROM deliveries WHERE received_at < ? AND state IN ('complete', 'rejected', 'terminal', 'repair')", recoveryCutoff),
      this.statement('DELETE FROM operational_results WHERE recorded_at < ?', recoveryCutoff),
      this.statement('DELETE FROM deletion_tombstones WHERE reapply_until <= ?', now)
    ]);
  }

  async deleteHistory(repositoryId) {
    const now = this.now(), until = new Date(Date.parse(now) + 37 * DAY).toISOString();
    await this.removeHistoryRecords(repositoryId);
    await this.database.batch([
      this.statement("UPDATE repositories SET history_enabled=0, history_consent_origin='history-deletion', history_consent_reason='explicitly-disabled', history_consent_actor_id=NULL, updated_at=? WHERE repository_id=?", now, repositoryId),
       this.statement('INSERT INTO deletion_tombstones (scope, deleted_at, reapply_until) VALUES (?, ?, ?) ON CONFLICT(scope) DO UPDATE SET deleted_at=excluded.deleted_at, reapply_until=excluded.reapply_until', `history:${repositoryId}`, now, until),
      this.statement('DELETE FROM app_checks WHERE repository_id=?', repositoryId),
      this.statement('DELETE FROM repairs WHERE repository_id=?', repositoryId)
    ]);
  }

  async exportState() {
    const configurations = await this.statement('SELECT repository_id, installation_id, history_enabled, retention_days, policy_id, execution_consent_origin, execution_consent_reason, execution_consent_actor_id, history_consent_origin, history_consent_reason, history_consent_actor_id, configuration_origin, configuration_json, configuration_policy_id, writer_standing, writer_origin, settings_revision FROM repositories').all();
    const tombstones = await this.statement('SELECT scope, deleted_at, reapply_until, execution_consent_reason, history_consent_reason FROM deletion_tombstones').all();
    const lenses = await this.statement('SELECT repository_id, lens_id, lens_json, created_at FROM history_lenses').all();
    return { kind: 'diffdevil.github-app-export', version: 7, exportedAt: this.now(), configurations: configurations.results ?? [], tombstones: tombstones.results ?? [], lenses: lenses.results ?? [] };
  }

  /** Quantitative history travels separately from protected configuration and remains blocked by deletion tombstones. */
  async exportHistory(repositoryId) {
    const now = this.now();
    if (repositoryId !== undefined && (!Number.isSafeInteger(repositoryId) || repositoryId < 1)) throw new TypeError('History export repository ID is invalid.');
    const records = await this.statement(`SELECT id, repository_id, pull_request, comparison_id, policy_id, schema_version, engine_version, report_version, metric_version,
      base_sha, head_sha, observed_at, expires_at, projection_json, coverage_json, results_json, gaps_json, state
      FROM history_records h WHERE state='published' AND (expires_at IS NULL OR expires_at>?) AND (? IS NULL OR repository_id=?)
      AND NOT EXISTS (SELECT 1 FROM deletion_tombstones WHERE scope IN ('history:' || h.repository_id, 'repository:' || h.repository_id) AND reapply_until>?)`,
    now, repositoryId ?? null, repositoryId ?? null, now).all();
    const ids = (records.results ?? []).map(record => record.id);
    const fileRows = [], effectRows = [];
    for (const id of ids) {
      const [files, effects] = await Promise.all([
        this.statement('SELECT history_id, ordinal, values_json FROM history_file_rows WHERE history_id=? ORDER BY ordinal', id).all(),
        this.statement('SELECT history_id, ordinal, effect_json FROM history_effect_rows WHERE history_id=? ORDER BY ordinal', id).all()
      ]);
      fileRows.push(...(files.results ?? [])); effectRows.push(...(effects.results ?? []));
    }
    const tombstones = await this.statement('SELECT scope, deleted_at, reapply_until FROM deletion_tombstones').all();
    return { kind: 'diffdevil.github-app-history-export', version: 2, exportedAt: now, repositoryId: repositoryId ?? null,
      records: records.results ?? [], fileRows, effectRows, tombstones: (tombstones.results ?? []).filter(row => repositoryId === undefined || row.scope.endsWith(`:${repositoryId}`)) };
  }

  async importHistory(value) {
    if (!value || value.kind !== 'diffdevil.github-app-history-export' || ![1, 2].includes(value.version) || !Array.isArray(value.records) || !Array.isArray(value.fileRows) || !Array.isArray(value.effectRows) || !Array.isArray(value.tombstones)) throw new TypeError('Unsupported App history export.');
    const now = this.now(), liveTombstones = new Set();
    const existingTombstones = await this.statement('SELECT scope FROM deletion_tombstones WHERE reapply_until>?', now).all();
    for (const row of existingTombstones.results ?? []) liveTombstones.add(row.scope);
    for (const tombstone of value.tombstones) {
      if (typeof tombstone?.scope !== 'string' || typeof tombstone?.deleted_at !== 'string' || typeof tombstone?.reapply_until !== 'string' || !Number.isFinite(Date.parse(tombstone.deleted_at)) || !Number.isFinite(Date.parse(tombstone.reapply_until))) throw new TypeError('Invalid history deletion tombstone.');
      if (Date.parse(tombstone.reapply_until) > Date.parse(now)) liveTombstones.add(tombstone.scope);
    }
    const tombstoneStatements = value.tombstones.map(tombstone => this.statement('INSERT INTO deletion_tombstones (scope, deleted_at, reapply_until) VALUES (?, ?, ?) ON CONFLICT(scope) DO UPDATE SET deleted_at=excluded.deleted_at, reapply_until=excluded.reapply_until WHERE excluded.reapply_until > deletion_tombstones.reapply_until', tombstone.scope, tombstone.deleted_at, tombstone.reapply_until));
    if (tombstoneStatements.length > 0) await this.database.batch(tombstoneStatements);
    const deletedRepositories = new Set([...liveTombstones].flatMap(scope => /^(history|repository):[1-9][0-9]*$/u.test(scope) ? [Number(scope.split(':')[1])] : []));
    for (const repositoryId of deletedRepositories) await this.removeHistoryRecords(repositoryId);
    const recordIds = new Map();
    for (const record of value.records) {
      if (!Number.isSafeInteger(record?.repository_id) || record.repository_id < 1 || !Number.isSafeInteger(record.pull_request) || record.pull_request < 1 || typeof record.comparison_id !== 'string' || typeof record.policy_id !== 'string' || !Number.isSafeInteger(record.schema_version) || typeof record.engine_version !== 'string' || typeof record.report_version !== 'string' || typeof record.metric_version !== 'string' || typeof record.observed_at !== 'string' || !Number.isFinite(Date.parse(record.observed_at)) || record.state !== 'published') throw new TypeError('Invalid numeric history export.');
      if (liveTombstones.has(`history:${record.repository_id}`) || liveTombstones.has(`repository:${record.repository_id}`)
        || (record.expires_at !== null && record.expires_at !== undefined && record.expires_at <= now)) continue;
      const inserted = await this.statement(`INSERT INTO history_records (repository_id, pull_request, comparison_id, policy_id, schema_version, engine_version, report_version, metric_version, base_sha, head_sha, observed_at, expires_at, projection_json, coverage_json, results_json, gaps_json, state)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published') ON CONFLICT(repository_id, comparison_id, policy_id, schema_version, engine_version, report_version, metric_version) DO NOTHING RETURNING id`, record.repository_id, record.pull_request, record.comparison_id, record.policy_id, record.schema_version, record.engine_version, record.report_version, record.metric_version, record.base_sha ?? null, record.head_sha ?? null, record.observed_at, record.expires_at ?? null, record.projection_json, record.coverage_json, record.results_json, record.gaps_json).first();
      if (inserted?.id) recordIds.set(record.id, inserted.id);
    }
    for (const row of value.fileRows) if (recordIds.has(row?.history_id) && Number.isSafeInteger(row.ordinal) && typeof row.values_json === 'string') await this.statement('INSERT INTO history_file_rows (history_id, ordinal, values_json) VALUES (?, ?, ?)', recordIds.get(row.history_id), row.ordinal, row.values_json).run();
    for (const row of value.effectRows) if (recordIds.has(row?.history_id) && Number.isSafeInteger(row.ordinal) && typeof row.effect_json === 'string') await this.statement('INSERT INTO history_effect_rows (history_id, ordinal, effect_json) VALUES (?, ?, ?)', recordIds.get(row.history_id), row.ordinal, row.effect_json).run();
  }
  async importState(value) {
    if (!value || value.kind !== 'diffdevil.github-app-export' || ![3, 4, 5, 6, 7].includes(value.version) || !Array.isArray(value.configurations) || !Array.isArray(value.tombstones)
      || (value.version === 7 && !Array.isArray(value.lenses))) throw new TypeError('Unsupported App state export.');
    const repositoryIds = new Set(), scopes = new Set();
    for (const configuration of value.configurations) {
      if (!Number.isSafeInteger(configuration?.repository_id) || configuration.repository_id < 1 || repositoryIds.has(configuration.repository_id) || !Number.isSafeInteger(configuration?.installation_id) || configuration.installation_id < 1 || ![0, 1].includes(configuration.history_enabled) || (configuration.retention_days !== null && configuration.retention_days !== undefined && boundedDays(configuration.retention_days) === null) || (configuration.policy_id !== null && configuration.policy_id !== undefined && typeof configuration.policy_id !== 'string') || !['execution_consent_origin', 'history_consent_origin', 'configuration_origin', 'writer_origin'].every(key => configuration[key] === null || configuration[key] === undefined || typeof configuration[key] === 'string') || !['execution_consent_actor_id', 'history_consent_actor_id'].every(key => configuration[key] === null || configuration[key] === undefined || (Number.isSafeInteger(configuration[key]) && configuration[key] > 0)) || !validConsentReason(configuration.execution_consent_reason) || !validConsentReason(configuration.history_consent_reason) || (configuration.configuration_policy_id !== null && configuration.configuration_policy_id !== undefined && typeof configuration.configuration_policy_id !== 'string') || (configuration.writer_standing !== undefined && !['unverified', 'administrator-declared', 'detected'].includes(configuration.writer_standing)) || (configuration.settings_revision !== undefined && (!Number.isSafeInteger(configuration.settings_revision) || configuration.settings_revision < 0))) throw new TypeError('Invalid repository configuration export.');
      if (configuration.configuration_json !== null && configuration.configuration_json !== undefined) {
        try { const parsed = JSON.parse(configuration.configuration_json); if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new TypeError(); }
        catch { throw new TypeError('Invalid repository configuration export.'); }
      }
      repositoryIds.add(configuration.repository_id);
    }
    for (const tombstone of value.tombstones) if (typeof tombstone?.scope !== 'string' || scopes.has(tombstone.scope) || typeof tombstone?.deleted_at !== 'string' || !Number.isFinite(Date.parse(tombstone.deleted_at)) || typeof tombstone?.reapply_until !== 'string' || !Number.isFinite(Date.parse(tombstone.reapply_until)) || (tombstone.execution_consent_reason !== undefined && !validConsentReason(tombstone.execution_consent_reason)) || (tombstone.history_consent_reason !== undefined && !validConsentReason(tombstone.history_consent_reason))) throw new TypeError('Invalid deletion tombstone export.'); else scopes.add(tombstone.scope);
    await this.database.batch([
      ...[...new Set(value.configurations.map(configuration => configuration.installation_id))].map(installationId => this.statement("INSERT INTO installations (installation_id, state, updated_at) VALUES (?, 'suspended', ?) ON CONFLICT(installation_id) DO NOTHING", installationId, this.now())),
      ...value.configurations.map(configuration => {
        const executionReason = configuration.execution_consent_reason === null ? 're-consent-required' : configuration.execution_consent_reason ?? 'unknown';
        const historyReason = configuration.history_consent_reason === null ? 're-consent-required' : configuration.history_consent_reason ?? 'unknown';
        return this.statement(`INSERT INTO repositories (repository_id, installation_id, history_enabled, retention_days, policy_id, execution_consent_origin, execution_consent_reason, execution_consent_actor_id, history_consent_origin, history_consent_reason, history_consent_actor_id, configuration_origin, configuration_json, configuration_policy_id, writer_standing, writer_origin, settings_revision, state, access_state, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending-enable', 'unknown', ?) ON CONFLICT(repository_id) DO UPDATE SET installation_id=excluded.installation_id, history_enabled=excluded.history_enabled, retention_days=excluded.retention_days, policy_id=excluded.policy_id, execution_consent_origin=excluded.execution_consent_origin, execution_consent_reason=excluded.execution_consent_reason, execution_consent_actor_id=excluded.execution_consent_actor_id, history_consent_origin=excluded.history_consent_origin, history_consent_reason=excluded.history_consent_reason, history_consent_actor_id=excluded.history_consent_actor_id, configuration_origin=excluded.configuration_origin, configuration_json=excluded.configuration_json, configuration_policy_id=excluded.configuration_policy_id, writer_standing=excluded.writer_standing, writer_origin=excluded.writer_origin, settings_revision=excluded.settings_revision, state='pending-enable', access_state='unknown', updated_at=excluded.updated_at`, configuration.repository_id, configuration.installation_id, configuration.history_enabled, configuration.retention_days ?? null, configuration.policy_id ?? null, configuration.execution_consent_origin ?? null, executionReason, configuration.execution_consent_actor_id ?? null, configuration.history_consent_origin ?? null, historyReason, configuration.history_consent_actor_id ?? null, configuration.configuration_origin ?? null, configuration.configuration_json ?? null, configuration.configuration_policy_id ?? null, configuration.writer_standing ?? 'unverified', configuration.writer_origin ?? null, configuration.settings_revision ?? 0, this.now());
      }),
      ...value.tombstones.map(tombstone => this.statement('INSERT INTO deletion_tombstones (scope, deleted_at, reapply_until, execution_consent_reason, history_consent_reason) VALUES (?, ?, ?, ?, ?) ON CONFLICT(scope) DO UPDATE SET deleted_at=excluded.deleted_at, reapply_until=excluded.reapply_until, execution_consent_reason=excluded.execution_consent_reason, history_consent_reason=excluded.history_consent_reason WHERE excluded.reapply_until > deletion_tombstones.reapply_until', tombstone.scope, tombstone.deleted_at, tombstone.reapply_until, tombstone.execution_consent_reason ?? null, tombstone.history_consent_reason ?? null)),
      ...value.tombstones.filter(tombstone => /^repository:[1-9][0-9]*$/u.test(tombstone.scope)).map(tombstone => this.statement("UPDATE repositories SET history_enabled=0, state='offboarding', access_state='removed', execution_consent_reason=?, history_consent_reason=?, updated_at=? WHERE repository_id=?", tombstone.execution_consent_reason ?? 're-consent-required', tombstone.history_consent_reason ?? 're-consent-required', this.now(), Number(tombstone.scope.slice('repository:'.length)))),
      ...(value.lenses ?? []).filter(lens => !scopes.has(`repository:${lens.repository_id}`)).map(lens => {
        let parsed;
        try { parsed = normalizeHistoryLens(lens.repository_id, JSON.parse(lens.lens_json)); }
        catch { throw new TypeError('Invalid saved history lens export.'); }
        if (!repositoryIds.has(lens.repository_id) || lens.lens_id !== parsed.id
          || typeof lens.created_at !== 'string' || !Number.isFinite(Date.parse(lens.created_at))) throw new TypeError('Invalid saved history lens export.');
        return this.statement('INSERT INTO history_lenses (repository_id, lens_id, lens_json, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(repository_id, lens_id) DO NOTHING',
          lens.repository_id, parsed.id, JSON.stringify(parsed), lens.created_at);
      })
    ]);
  }
}
