// SPDX-License-Identifier: AGPL-3.0-only

/** D1 adapter for one-time user authorization and opaque browser sessions. */
export class D1AuthorizationStore {
  constructor(database, { now = () => new Date().toISOString() } = {}) {
    this.database = database;
    this.now = now;
  }

  statement(sql, ...values) { return this.database.prepare(sql).bind(...values); }

  async createAttempt(hash, browserHash, returnContext, expiresAt) {
    await this.statement('INSERT INTO authorization_attempts (state_hash, browser_hash, return_context, expires_at) VALUES (?, ?, ?, ?)', hash, browserHash, returnContext, expiresAt).run();
  }

  async consumeAttempt(hash, browserHash) {
    const now = this.now();
    const row = await this.statement(`SELECT return_context FROM authorization_attempts
      WHERE state_hash=? AND browser_hash=? AND consumed_at IS NULL AND expires_at > ?`, hash, browserHash, now).first();
    if (!row) return undefined;
    const result = await this.statement(`UPDATE authorization_attempts SET consumed_at=?
      WHERE state_hash=? AND browser_hash=? AND consumed_at IS NULL AND expires_at > ?`, now, hash, browserHash, now).run();
    return (result.meta?.changes ?? 0) === 1 ? row.return_context : undefined;
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

  /** Commit a fresh user grant and its pending one-time artifact in one D1 transaction. */
  async saveAuthorizationWithArtifact(userId, protectedMaterial, authorizationExpiresAt, artifactHash, returnContext, artifactExpiresAt) {
    const now = this.now();
    await this.database.batch([
      this.statement(`INSERT INTO user_authorizations (user_id, protected_material, expires_at, revoked_at, updated_at)
        VALUES (?, ?, ?, NULL, ?) ON CONFLICT(user_id) DO UPDATE SET protected_material=excluded.protected_material,
        expires_at=excluded.expires_at, revoked_at=NULL, updated_at=excluded.updated_at`, userId, protectedMaterial, authorizationExpiresAt, now),
      this.statement('INSERT INTO authorization_artifacts (artifact_hash, user_id, return_context, expires_at) VALUES (?, ?, ?, ?)', artifactHash, userId, returnContext, artifactExpiresAt)
    ]);
  }

  async revokeAuthorization(userId) {
    const now = this.now();
    await this.database.batch([
      this.statement("UPDATE user_authorizations SET revoked_at=?, protected_material='' WHERE user_id=?", now, userId),
      this.statement('UPDATE browser_sessions SET revoked_at=? WHERE user_id=? AND revoked_at IS NULL', now, userId)
    ]);
  }

  async artifactUser(hash, returnContext) {
    const now = this.now();
    const row = await this.statement(`SELECT user_id FROM authorization_artifacts
      WHERE artifact_hash=? AND return_context=? AND consumed_at IS NULL AND expires_at > ?`, hash, returnContext, now).first();
    return row?.user_id;
  }

  /** The artifact remains pending until a session exists in the same transaction. */
  async exchangeArtifact(hash, returnContext, sessionHash, sessionExpiresAt, previousSessionHash) {
    const now = this.now();
    const activeAuthorization = `EXISTS (SELECT 1 FROM user_authorizations u WHERE u.user_id=authorization_artifacts.user_id
      AND u.revoked_at IS NULL AND u.expires_at > ?)`;
    const statements = [
      this.statement(`INSERT INTO browser_sessions (session_hash, user_id, return_context, expires_at)
        SELECT ?, user_id, return_context, ? FROM authorization_artifacts
        WHERE artifact_hash=? AND return_context=? AND consumed_at IS NULL AND expires_at > ? AND ${activeAuthorization}`,
      sessionHash, sessionExpiresAt, hash, returnContext, now, now),
      this.statement(`UPDATE authorization_artifacts SET consumed_at=? WHERE artifact_hash=? AND return_context=?
        AND consumed_at IS NULL AND expires_at > ? AND ${activeAuthorization}`, now, hash, returnContext, now, now)
    ];
    if (previousSessionHash) statements.push(
      this.statement(`UPDATE browser_sessions SET revoked_at=? WHERE session_hash=? AND revoked_at IS NULL
        AND EXISTS (SELECT 1 FROM browser_sessions WHERE session_hash=?)`, now, previousSessionHash, sessionHash),
      this.statement(`DELETE FROM user_authorizations WHERE user_id=(SELECT user_id FROM browser_sessions WHERE session_hash=?)
        AND NOT EXISTS (SELECT 1 FROM browser_sessions WHERE user_id=user_authorizations.user_id AND revoked_at IS NULL AND expires_at > ?)
        AND NOT EXISTS (SELECT 1 FROM authorization_artifacts WHERE user_id=user_authorizations.user_id AND consumed_at IS NULL AND expires_at > ?)`,
      previousSessionHash, now, now)
    );
    const results = await this.database.batch(statements);
    return (results[0]?.meta?.changes ?? 0) === 1 && (results[1]?.meta?.changes ?? 0) === 1;
  }

  async rotateSession(previousHash, hash, userId, returnContext, expiresAt) {
    const now = this.now();
    const results = await this.database.batch([
      this.statement(`INSERT INTO browser_sessions (session_hash, user_id, return_context, expires_at)
        SELECT ?, user_id, return_context, ? FROM browser_sessions WHERE session_hash=? AND user_id=?
        AND return_context=? AND revoked_at IS NULL AND expires_at > ?`, hash, expiresAt, previousHash, userId, returnContext, now),
      this.statement(`UPDATE browser_sessions SET revoked_at=? WHERE session_hash=? AND user_id=?
        AND return_context=? AND revoked_at IS NULL AND expires_at > ?
        AND EXISTS (SELECT 1 FROM browser_sessions WHERE session_hash=?)`, now, previousHash, userId, returnContext, now, hash)
    ]);
    return (results[0]?.meta?.changes ?? 0) === 1 && (results[1]?.meta?.changes ?? 0) === 1;
  }

  async session(hash) {
    return this.statement('SELECT user_id, return_context, expires_at, revoked_at FROM browser_sessions WHERE session_hash=?', hash).first();
  }

  async revokeSession(hash) {
    const now = this.now();
    await this.database.batch([
      this.statement('UPDATE browser_sessions SET revoked_at=? WHERE session_hash=? AND revoked_at IS NULL', now, hash),
      this.statement(`DELETE FROM user_authorizations WHERE user_id=(SELECT user_id FROM browser_sessions WHERE session_hash=?)
        AND NOT EXISTS (SELECT 1 FROM browser_sessions WHERE user_id=user_authorizations.user_id AND revoked_at IS NULL AND expires_at > ?)
        AND NOT EXISTS (SELECT 1 FROM authorization_artifacts WHERE user_id=user_authorizations.user_id AND consumed_at IS NULL AND expires_at > ?)`,
      hash, now, now)
    ]);
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
      this.statement(`DELETE FROM user_authorizations WHERE expires_at <= ? OR revoked_at IS NOT NULL
        OR (NOT EXISTS (SELECT 1 FROM browser_sessions WHERE user_id=user_authorizations.user_id AND revoked_at IS NULL AND expires_at > ?)
          AND NOT EXISTS (SELECT 1 FROM authorization_artifacts WHERE user_id=user_authorizations.user_id AND consumed_at IS NULL AND expires_at > ?))`, now, now, now)
    ]);
  }
}
