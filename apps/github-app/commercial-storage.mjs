// SPDX-License-Identifier: AGPL-3.0-only

const changed = result => (result?.meta?.changes ?? 0) === 1;
const conflict = () => Object.assign(new Error('E_COMMERCIAL_CONFLICT'), { code: 'E_COMMERCIAL_CONFLICT' });
const PAGE = 25;

/**
 * D1 adapter for Wirt links. Every link mutation compares and advances `revision`; a transition
 * also writes its own unique `transition_id`, and every child statement requires that exact token.
 * A lost compare-and-set therefore leaves no binding, refusal or report behind, even when another
 * writer happened to advance the revision by the same amount.
 */
export class D1CommercialStore {
  constructor(database, { now = () => new Date().toISOString() } = {}) {
    this.database = database;
    this.now = now;
  }

  statement(sql, ...values) { return this.database.prepare(sql).bind(...values); }

  async consumeNonce(hash, expiresAt) {
    return changed(await this.statement('INSERT OR IGNORE INTO commercial_nonces (nonce_hash, expires_at) VALUES (?, ?)', hash, expiresAt).run());
  }

  async createLinkAttempt({ stateHash, browserHash, userId, intentId, protectedVerifier, expiresAt }) {
    await this.statement(`INSERT INTO commercial_link_attempts (state_hash, browser_hash, user_id, intent_id, protected_verifier, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)`, stateHash, browserHash, userId, intentId, protectedVerifier, expiresAt).run();
  }

  /** One browser, one signed-in product account and one unexpired attempt may continue a link callback once. */
  async consumeLinkAttempt(stateHash, browserHash, userId) {
    const now = this.now();
    const row = await this.statement(`SELECT intent_id, protected_verifier FROM commercial_link_attempts
      WHERE state_hash=? AND browser_hash=? AND user_id=? AND consumed_at IS NULL AND expires_at > ?`, stateHash, browserHash, userId, now).first();
    if (!row) return undefined;
    const result = await this.statement(`UPDATE commercial_link_attempts SET consumed_at=?, protected_verifier=''
      WHERE state_hash=? AND browser_hash=? AND user_id=? AND consumed_at IS NULL AND expires_at > ?`, now, stateHash, browserHash, userId, now).run();
    return changed(result) ? { intentId: row.intent_id, protectedVerifier: row.protected_verifier } : undefined;
  }

  /** Persist the exchanged owner grant before establishment, so a lost establishment response can be retried. */
  async holdExchangedGrant(stateHash, protectedGrant, expiresAt) {
    await this.statement('UPDATE commercial_link_attempts SET protected_grant=?, expires_at=? WHERE state_hash=? AND finished_at IS NULL', protectedGrant, expiresAt, stateHash).run();
  }

  /** A refreshed grant replaces exactly the grant it was refreshed from, before its first use. */
  async replaceAttemptGrant(stateHash, previous, next) {
    return changed(await this.statement('UPDATE commercial_link_attempts SET protected_grant=? WHERE state_hash=? AND finished_at IS NULL AND protected_grant=?', next, stateHash, previous).run());
  }

  async attempt(stateHash) { return this.statement('SELECT * FROM commercial_link_attempts WHERE state_hash=?', stateHash).first(); }

  /** Typed evidence of the latest establishment try; the attempt stays retryable until finished or expired. */
  async recordEstablishment(stateHash, outcome) {
    await this.statement('UPDATE commercial_link_attempts SET last_establish=?, last_establish_at=? WHERE state_hash=?', outcome, this.now(), stateHash).run();
  }

  async unfinishedEstablishment(userId) {
    return this.statement(`SELECT state_hash, intent_id, protected_grant FROM commercial_link_attempts WHERE user_id=? AND protected_grant IS NOT NULL
      AND finished_at IS NULL AND expires_at > ? ORDER BY expires_at DESC LIMIT 1`, userId, this.now()).first();
  }

  async finishAttempt(stateHash) {
    await this.statement("UPDATE commercial_link_attempts SET finished_at=?, protected_grant=NULL, protected_verifier='' WHERE state_hash=?", this.now(), stateHash).run();
  }

  async link(linkId) { return this.statement('SELECT * FROM commercial_links WHERE link_id=?', linkId).first(); }
  async activeLink(productAccount) { return this.statement("SELECT * FROM commercial_links WHERE product_account=? AND state='active'", productAccount).first(); }
  async bindings(linkId) { return (await this.statement('SELECT * FROM commercial_bindings WHERE link_id=? ORDER BY slot', linkId).all()).results ?? []; }
  async refusals(linkId) { return (await this.statement('SELECT * FROM commercial_refusals WHERE link_id=? ORDER BY slot, organisation_id', linkId).all()).results ?? []; }
  async binding(organisationId) { return this.statement('SELECT * FROM commercial_bindings WHERE organisation_id=?', organisationId).first(); }

  /** A retried establishment of the same Wirt stream refreshes only its owner grant. */
  async saveEstablishedLink({ linkId, productAccount, worksAccount, intentId, protectedGrant }) {
    const now = this.now();
    try {
      await this.statement(`INSERT INTO commercial_links (link_id, product_account, works_account, state, intent_id, protected_grant, established_at, updated_at)
        VALUES (?, ?, ?, 'active', ?, ?, ?, ?)
        ON CONFLICT(link_id) DO UPDATE SET protected_grant=excluded.protected_grant, updated_at=excluded.updated_at, revision=commercial_links.revision + 1
        WHERE commercial_links.state='active' AND commercial_links.product_account=excluded.product_account`, linkId, productAccount, worksAccount, intentId, protectedGrant, now, now).run();
    } catch { throw conflict(); }
    const row = await this.link(linkId);
    if (!row || row.state !== 'active' || row.product_account !== productAccount) throw conflict();
    return row;
  }

  async replaceGrant(linkId, previous, next) {
    return changed(await this.statement(`UPDATE commercial_links SET protected_grant=?, updated_at=?, revision=revision + 1
      WHERE link_id=? AND state='active' AND protected_grant=?`, next, this.now(), linkId, previous).run());
  }

  /**
   * Commit one decided transition. A stale revision changes nothing and asks the caller to decide again.
   * `observations` record a newly observed organisation authority for bindings that still name that organisation.
   */
  async transition(link, { applied, worksAccount, removedSlots = [], binding, unbindSlot, refusal, observations = [], report }) {
    const now = this.now(), token = crypto.randomUUID();
    const owned = 'EXISTS (SELECT 1 FROM commercial_links WHERE link_id=? AND transition_id=?)';
    const statements = [applied
      ? this.statement(`UPDATE commercial_links SET revision=revision + 1, transition_id=?, works_account=?, applied_epoch=?, applied_version=?, applied_result=?, applied_at=?, projection_json=?, updated_at=?
        WHERE link_id=? AND state='active' AND revision=?`, token, worksAccount ?? link.works_account, applied.epoch, applied.version, applied.result, applied.at, applied.projectionJson, now, link.link_id, link.revision)
      : this.statement("UPDATE commercial_links SET revision=revision + 1, transition_id=?, updated_at=? WHERE link_id=? AND state='active' AND revision=?", token, now, link.link_id, link.revision)];
    const child = (sql, ...values) => statements.push(this.statement(`${sql} ${owned}`, ...values, link.link_id, token));
    for (const slot of removedSlots) child('DELETE FROM commercial_bindings WHERE link_id=? AND slot=? AND', link.link_id, slot);
    if (unbindSlot) child('DELETE FROM commercial_bindings WHERE link_id=? AND slot=? AND', link.link_id, unbindSlot);
    if (binding) {
      statements.push(this.statement(`INSERT INTO commercial_bindings (link_id, slot, organisation_id, authority_observed, authority_checked_at, display, since)
        SELECT ?, ?, ?, ?, ?, ?, ? WHERE ${owned}
        ON CONFLICT(link_id, slot) DO UPDATE SET authority_observed=excluded.authority_observed, authority_checked_at=excluded.authority_checked_at, display=excluded.display
        WHERE commercial_bindings.organisation_id=excluded.organisation_id`,
      link.link_id, binding.slot, binding.organisationId, binding.authority, now, binding.display, binding.since, link.link_id, token));
    }
    for (const value of observations) {
      child('UPDATE commercial_bindings SET authority_observed=?, authority_checked_at=?, display=? WHERE link_id=? AND slot=? AND organisation_id=? AND',
        value.authority, now, value.authority === 'present' ? value.display : null, link.link_id, value.slot, value.organisationId);
    }
    if (refusal) {
      statements.push(this.statement(`INSERT OR REPLACE INTO commercial_refusals (link_id, slot, organisation_id, reason, refused_at)
        SELECT ?, ?, ?, ?, ? WHERE ${owned}`, link.link_id, refusal.slot, refusal.organisationId, refusal.reason, now, link.link_id, token));
    }
    if (report) {
      child("UPDATE commercial_reports SET state='superseded', next_attempt_at=NULL, disclosure=NULL WHERE link_id=? AND state='pending' AND", link.link_id);
      statements.push(this.statement(`INSERT INTO commercial_reports (link_id, report_version, body, disclosure, state, next_attempt_at, created_at)
        SELECT ?, ?, ?, ?, 'pending', ?, ? WHERE ${owned}`, link.link_id, report.version, report.body, report.disclosure ?? null, now, now, link.link_id, token));
      statements.push(this.statement('UPDATE commercial_links SET report_version=? WHERE link_id=? AND transition_id=?', report.version, link.link_id, token));
    }
    let results;
    try { results = await this.database.batch(statements); }
    catch { return false; }
    return changed(results[0]);
  }

  /** A recheck that confirms the recorded observation only moves its time. */
  async confirmObservation(linkId, { slot, organisationId, authority }) {
    await this.statement('UPDATE commercial_bindings SET authority_checked_at=? WHERE link_id=? AND slot=? AND organisation_id=? AND authority_observed=?',
      this.now(), linkId, slot, organisationId, authority).run();
  }

  /** Bindings of active links whose authority is unknown or was checked before `before`, oldest check first. */
  async staleObservations(before, limit = PAGE) {
    return (await this.statement(`SELECT b.*, l.product_account FROM commercial_bindings b JOIN commercial_links l ON l.link_id=b.link_id
      WHERE l.state='active' AND (b.authority_checked_at < ? OR b.authority_observed='unknown') ORDER BY b.authority_checked_at LIMIT ?`, before, limit).all()).results ?? [];
  }

  /**
   * Ending is permanent for a link ID: benefits, bindings, grant and unsent reports stop together,
   * and no retained report keeps a display label.
   */
  async endLink(linkId, { source, endedAt }) {
    const now = this.now();
    await this.database.batch([
      this.statement(`UPDATE commercial_links SET state='ended', ended_at=COALESCE(ended_at, ?), end_source=COALESCE(end_source, ?), protected_grant=NULL,
        projection_json=NULL, restored_at=NULL, revision=revision + 1, transition_id=NULL, updated_at=? WHERE link_id=?`, endedAt, source, now, linkId),
      this.statement('DELETE FROM commercial_bindings WHERE link_id=?', linkId),
      this.statement('DELETE FROM commercial_refusals WHERE link_id=?', linkId),
      this.statement(`UPDATE commercial_reports SET state=CASE WHEN state='pending' THEN 'superseded' ELSE state END, next_attempt_at=NULL, disclosure=NULL
        WHERE link_id=?`, linkId)
    ]);
  }

  /**
   * After the store is restored to an earlier point, every active link is held until Wirt's current
   * answer reconciles it. Restored pending reports describe pre-restore state and are superseded.
   */
  async holdRestoredLinks(restoredAt) {
    const [held] = await this.database.batch([
      this.statement("UPDATE commercial_links SET restored_at=?, revision=revision + 1, transition_id=NULL, updated_at=? WHERE state='active'", restoredAt, this.now()),
      this.statement(`UPDATE commercial_reports SET state='superseded', next_attempt_at=NULL, disclosure=NULL WHERE state='pending'
        AND link_id IN (SELECT link_id FROM commercial_links WHERE state='active' AND restored_at=?)`, restoredAt)
    ]);
    return held?.meta?.changes ?? 0;
  }

  async restoredLinks(after = '', limit = PAGE) {
    return (await this.statement("SELECT * FROM commercial_links WHERE state='active' AND restored_at IS NOT NULL AND link_id > ? ORDER BY link_id LIMIT ?", after, limit).all()).results ?? [];
  }

  /** Only the hold this reconciliation observed is released; a newer restore keeps its own hold. */
  async releaseRestoreHold(linkId, restoredAt) {
    return changed(await this.statement("UPDATE commercial_links SET restored_at=NULL, updated_at=? WHERE link_id=? AND state='active' AND restored_at=?", this.now(), linkId, restoredAt).run());
  }

  async latestReport(linkId) {
    return this.statement('SELECT * FROM commercial_reports WHERE link_id=? ORDER BY report_version DESC LIMIT 1', linkId).first();
  }

  async dueReports(limit = PAGE) {
    return (await this.statement(`SELECT r.* FROM commercial_reports r JOIN commercial_links l ON l.link_id=r.link_id
      WHERE r.state='pending' AND l.state='active' AND r.next_attempt_at <= ? ORDER BY r.next_attempt_at LIMIT ?`, this.now(), limit).all()).results ?? [];
  }

  /** Refusals stay queued until a report carrying them has been accepted by Wirt. A report leaving `pending` drops its labels. */
  async markReport(linkId, version, { state, attempts, nextAttemptAt = null, status = null, code = null }) {
    const statements = [this.statement(`UPDATE commercial_reports SET state=?, attempts=?, next_attempt_at=?, last_status=?, code=?,
      disclosure=CASE WHEN ?='pending' THEN disclosure ELSE NULL END WHERE link_id=? AND report_version=? AND state='pending'`, state, attempts, nextAttemptAt, status, code, state, linkId, version)];
    if (state === 'sent') statements.push(this.statement(`DELETE FROM commercial_refusals WHERE link_id=?
      AND refused_at <= (SELECT created_at FROM commercial_reports WHERE link_id=? AND report_version=?)`, linkId, linkId, version));
    await this.database.batch(statements);
  }

  /** The repository's namespace is its installation account; unknown remains unknown. */
  async repositoryNamespace(repositoryId) {
    const row = await this.statement(`SELECT i.account_id FROM repositories r JOIN installations i ON i.installation_id=r.installation_id
      WHERE r.repository_id=?`, repositoryId).first();
    return Number.isSafeInteger(row?.account_id) ? row.account_id : undefined;
  }

  /**
   * The active link funding one account: the account's own link, or an organisation binding with its
   * observed authority. Funding and authority stay separate facts; the caller decides use.
   */
  async funding(accountId) {
    const own = await this.activeLink(accountId);
    if (own) return { link: own };
    const binding = await this.statement(`SELECT b.* FROM commercial_bindings b JOIN commercial_links l ON l.link_id=b.link_id
      WHERE l.state='active' AND b.organisation_id=?`, accountId).first();
    return binding ? { link: await this.link(binding.link_id), binding } : {};
  }

  /**
   * Sent, superseded or failed report evidence carries no labels. It is kept thirty days; an active
   * link keeps its latest report regardless of age, while an ended link keeps only its link identity.
   */
  async maintain() {
    const now = this.now(), reportCutoff = new Date(Date.parse(now) - 30 * 86_400_000).toISOString();
    await this.database.batch([
      this.statement('DELETE FROM commercial_nonces WHERE expires_at <= ?', now),
      this.statement('DELETE FROM commercial_link_attempts WHERE expires_at <= ?', now),
      this.statement(`DELETE FROM commercial_reports WHERE state IN ('sent', 'superseded') AND created_at < ?
        AND report_version < (SELECT MAX(r.report_version) FROM commercial_reports r WHERE r.link_id=commercial_reports.link_id)`, reportCutoff),
      this.statement(`DELETE FROM commercial_reports WHERE created_at < ?
        AND link_id IN (SELECT link_id FROM commercial_links WHERE state='ended')`, reportCutoff)
    ]);
  }
}
