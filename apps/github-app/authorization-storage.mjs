// SPDX-License-Identifier: AGPL-3.0-only

/** D1 adapter for one-time user authorization and opaque browser sessions. */
export class D1AuthorizationStore {
  constructor(database, { now = () => new Date().toISOString() } = {}) {
    this.database = database;
    this.now = now;
  }

  statement(sql, ...values) { return this.database.prepare(sql).bind(...values); }

  async createAttempt(hash, returnContext, expiresAt) {
    await this.statement('INSERT INTO authorization_attempts (state_hash, return_context, expires_at) VALUES (?, ?, ?)', hash, returnContext, expiresAt).run();
  }

  async consumeAttempt(hash, returnContext) {
    const now = this.now();
    const result = await this.statement(`UPDATE authorization_attempts SET consumed_at=?
      WHERE state_hash=? AND return_context=? AND consumed_at IS NULL AND expires_at > ?`, now, hash, returnContext, now).run();
    return (result.meta?.changes ?? 0) === 1;
  }

  async saveAuthorization(userId, protectedMaterial, expiresAt) {
    const now = this.now();
    await this.statement(`INSERT INTO user_authorizations (user_id, protected_material, expires_at, revoked_at, updated_at)
      VALUES (?, ?, ?, NULL, ?) ON CONFLICT(user_id) DO UPDATE SET protected_material=excluded.protected_material,
      expires_at=excluded.expires_at, revoked_at=NULL, updated_at=excluded.updated_at`, userId, protectedMaterial, expiresAt, now).run();
  }

  async refreshAuthorization(userId, previousMaterial, protectedMaterial, expiresAt) {
    const now = this.now();
    const result = await this.statement(`UPDATE user_authorizations SET protected_material=?, expires_at=?, updated_at=?
      WHERE user_id=? AND protected_material=? AND revoked_at IS NULL AND expires_at > ?`, protectedMaterial, expiresAt, now, userId, previousMaterial, now).run();
    return (result.meta?.changes ?? 0) === 1;
  }

  async authorization(userId) {
    return this.statement('SELECT protected_material, expires_at, revoked_at FROM user_authorizations WHERE user_id=?', userId).first();
  }

  async revokeAuthorization(userId) {
    const now = this.now();
    await this.database.batch([
      this.statement("UPDATE user_authorizations SET revoked_at=?, protected_material='' WHERE user_id=?", now, userId),
      this.statement('UPDATE browser_sessions SET revoked_at=? WHERE user_id=? AND revoked_at IS NULL', now, userId)
    ]);
  }

  async createArtifact(hash, userId, returnContext, expiresAt) {
    await this.statement('INSERT INTO authorization_artifacts (artifact_hash, user_id, return_context, expires_at) VALUES (?, ?, ?, ?)', hash, userId, returnContext, expiresAt).run();
  }

  async consumeArtifact(hash, returnContext) {
    const now = this.now();
    const row = await this.statement(`SELECT user_id FROM authorization_artifacts
      WHERE artifact_hash=? AND return_context=? AND consumed_at IS NULL AND expires_at > ?`, hash, returnContext, now).first();
    if (!row) return undefined;
    const result = await this.statement(`UPDATE authorization_artifacts SET consumed_at=?
      WHERE artifact_hash=? AND return_context=? AND consumed_at IS NULL AND expires_at > ?`, now, hash, returnContext, now).run();
    return (result.meta?.changes ?? 0) === 1 ? row.user_id : undefined;
  }

  async createSession(hash, userId, returnContext, expiresAt) {
    await this.statement('INSERT INTO browser_sessions (session_hash, user_id, return_context, expires_at) VALUES (?, ?, ?, ?)', hash, userId, returnContext, expiresAt).run();
  }

  async rotateSession(previousHash, hash, userId, returnContext, expiresAt) {
    const now = this.now();
    const previous = await this.statement(`UPDATE browser_sessions SET revoked_at=? WHERE session_hash=? AND user_id=?
      AND return_context=? AND revoked_at IS NULL AND expires_at > ?`, now, previousHash, userId, returnContext, now).run();
    if ((previous.meta?.changes ?? 0) !== 1) return false;
    await this.createSession(hash, userId, returnContext, expiresAt);
    return true;
  }

  async session(hash) {
    return this.statement('SELECT user_id, return_context, expires_at, revoked_at FROM browser_sessions WHERE session_hash=?', hash).first();
  }

  async revokeSession(hash) {
    await this.statement('UPDATE browser_sessions SET revoked_at=? WHERE session_hash=? AND revoked_at IS NULL', this.now(), hash).run();
  }

  async repositoryIdentity(repositoryId) {
    return this.statement('SELECT installation_id FROM repositories WHERE repository_id=?', repositoryId).first();
  }

  async maintain() {
    const now = this.now();
    await this.database.batch([
      this.statement('DELETE FROM authorization_attempts WHERE expires_at <= ?', now),
      this.statement('DELETE FROM authorization_artifacts WHERE expires_at <= ?', now),
      this.statement('DELETE FROM browser_sessions WHERE expires_at <= ?', now),
      this.statement('DELETE FROM user_authorizations WHERE expires_at <= ? OR revoked_at IS NOT NULL', now)
    ]);
  }
}
