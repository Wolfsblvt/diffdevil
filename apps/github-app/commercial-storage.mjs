// SPDX-License-Identifier: AGPL-3.0-only

const changed = result => (result?.meta?.changes ?? 0) === 1;
const conflict = () => Object.assign(new Error('E_COMMERCIAL_CONFLICT'), { code: 'E_COMMERCIAL_CONFLICT' });

/**
 * D1 adapter for Wirt links. Every link mutation compares and advances `revision`, so applying a
 * projection, binding an organisation and queueing its report commit together or not at all.
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

  #reportStatements(linkId, revision, report) {
    if (!report) return [];
    const guard = 'EXISTS (SELECT 1 FROM commercial_links WHERE link_id=? AND revision=?)';
    return [
      this.statement(`UPDATE commercial_reports SET state='superseded', next_attempt_at=NULL WHERE link_id=? AND state='pending' AND ${guard}`, linkId, linkId, revision + 1),
      this.statement(`INSERT INTO commercial_reports (link_id, report_version, body, state, next_attempt_at, created_at)
        SELECT ?, ?, ?, 'pending', ?, ? WHERE ${guard}`, linkId, report.version, report.body, this.now(), this.now(), linkId, revision + 1),
      this.statement(`UPDATE commercial_links SET report_version=? WHERE link_id=? AND revision=?`, report.version, linkId, revision + 1)
    ];
  }

  /** Commit one decided transition. A stale revision changes nothing and asks the caller to decide again. */
  async transition(link, { applied, worksAccount, removedSlots = [], binding, unbindSlot, refusal, report }) {
    const now = this.now(), next = link.revision + 1;
    const guard = 'EXISTS (SELECT 1 FROM commercial_links WHERE link_id=? AND revision=?)';
    const statements = [applied
      ? this.statement(`UPDATE commercial_links SET revision=?, works_account=?, applied_epoch=?, applied_version=?, applied_result=?, applied_at=?, projection_json=?, updated_at=?
        WHERE link_id=? AND state='active' AND revision=?`, next, worksAccount ?? link.works_account, applied.epoch, applied.version, applied.result, applied.at, applied.projectionJson, now, link.link_id, link.revision)
      : this.statement("UPDATE commercial_links SET revision=?, updated_at=? WHERE link_id=? AND state='active' AND revision=?", next, now, link.link_id, link.revision)];
    for (const slot of removedSlots) statements.push(this.statement(`DELETE FROM commercial_bindings WHERE link_id=? AND slot=? AND ${guard}`, link.link_id, slot, link.link_id, next));
    if (unbindSlot) statements.push(this.statement(`DELETE FROM commercial_bindings WHERE link_id=? AND slot=? AND ${guard}`, link.link_id, unbindSlot, link.link_id, next));
    if (binding) statements.push(this.statement(`INSERT INTO commercial_bindings (link_id, slot, organisation_id, authority, display, since, checked_at)
      SELECT ?, ?, ?, ?, ?, ?, ? WHERE ${guard}
      ON CONFLICT(link_id, slot) DO UPDATE SET authority=excluded.authority, display=excluded.display, checked_at=excluded.checked_at
      WHERE commercial_bindings.organisation_id=excluded.organisation_id`,
    link.link_id, binding.slot, binding.organisationId, binding.authority, binding.display, binding.since, now, link.link_id, next));
    if (refusal) statements.push(this.statement(`INSERT OR REPLACE INTO commercial_refusals (link_id, slot, organisation_id, reason, refused_at)
      SELECT ?, ?, ?, ?, ? WHERE ${guard}`, link.link_id, refusal.slot, refusal.organisationId, refusal.reason, now, link.link_id, next));
    statements.push(...this.#reportStatements(link.link_id, link.revision, report));
    let results;
    try { results = await this.database.batch(statements); }
    catch { return false; }
    return changed(results[0]);
  }

  /** Ending is permanent for a link ID: benefits, bindings, grant and unsent reports stop together. */
  async endLink(linkId, { source, endedAt }) {
    const now = this.now();
    await this.database.batch([
      this.statement(`UPDATE commercial_links SET state='ended', ended_at=COALESCE(ended_at, ?), end_source=COALESCE(end_source, ?), protected_grant=NULL,
        projection_json=NULL, revision=revision + 1, updated_at=? WHERE link_id=?`, endedAt, source, now, linkId),
      this.statement('DELETE FROM commercial_bindings WHERE link_id=?', linkId),
      this.statement('DELETE FROM commercial_refusals WHERE link_id=?', linkId),
      this.statement("UPDATE commercial_reports SET state='superseded', next_attempt_at=NULL WHERE link_id=? AND state='pending'", linkId)
    ]);
  }

  async latestReport(linkId) {
    return this.statement('SELECT * FROM commercial_reports WHERE link_id=? ORDER BY report_version DESC LIMIT 1', linkId).first();
  }

  async dueReports(limit = 25) {
    return (await this.statement(`SELECT r.* FROM commercial_reports r JOIN commercial_links l ON l.link_id=r.link_id
      WHERE r.state='pending' AND l.state='active' AND r.next_attempt_at <= ? ORDER BY r.next_attempt_at LIMIT ?`, this.now(), limit).all()).results ?? [];
  }

  /** Refusals stay queued until a report carrying them has been accepted by Wirt. */
  async markReport(linkId, version, { state, attempts, nextAttemptAt = null, status = null, code = null }) {
    const statements = [this.statement(`UPDATE commercial_reports SET state=?, attempts=?, next_attempt_at=?, last_status=?, code=?
      WHERE link_id=? AND report_version=? AND state='pending'`, state, attempts, nextAttemptAt, status, code, linkId, version)];
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

  /** The active link funding one account: the account's own link, or a present-authority organisation binding. */
  async fundingLink(accountId) {
    return this.statement(`SELECT l.* FROM commercial_links l WHERE l.state='active' AND (l.product_account=?
      OR EXISTS (SELECT 1 FROM commercial_bindings b WHERE b.link_id=l.link_id AND b.organisation_id=? AND b.authority='present'))
      ORDER BY CASE WHEN l.product_account=? THEN 0 ELSE 1 END LIMIT 1`, accountId, accountId, accountId).first();
  }

  /** Accepted or superseded report bodies are kept thirty days; each link's latest report and failed evidence remain. */
  async maintain() {
    const now = this.now(), reportCutoff = new Date(Date.parse(now) - 30 * 86_400_000).toISOString();
    await this.database.batch([
      this.statement('DELETE FROM commercial_nonces WHERE expires_at <= ?', now),
      this.statement('DELETE FROM commercial_link_attempts WHERE expires_at <= ?', now),
      this.statement(`DELETE FROM commercial_reports WHERE state IN ('sent', 'superseded') AND created_at < ?
        AND report_version < (SELECT MAX(r.report_version) FROM commercial_reports r WHERE r.link_id=commercial_reports.link_id)`, reportCutoff)
    ]);
  }
}
