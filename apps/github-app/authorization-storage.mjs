// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0

// Only actual funded standing earns sessionless retention. A restore hold preserves that last
// funded purpose for reconciliation, but never makes an ended/pending projection funded.
const NO_ORGANISATION_FUNDING = `NOT EXISTS (SELECT 1 FROM commercial_bindings b
  JOIN commercial_links l ON l.link_id=b.link_id
  WHERE l.product_account=user_authorizations.user_id AND l.state='active'
    AND json_extract(l.projection_json,'$.commercial.standing') IN ('funded','renewal-in-grace')
    AND json_extract(l.projection_json,'$.commercial.tier') IN ('pro','business'))`;
const SERVICE_DISCONNECTED = `EXISTS (SELECT 1 FROM user_service_connections c
  WHERE c.user_id=user_authorizations.user_id AND c.disconnected_at IS NOT NULL)`;
const NO_SERVICE_PURPOSE = `(${SERVICE_DISCONNECTED} OR ${NO_ORGANISATION_FUNDING})`;

/** A browser-owned insert must not recreate erased account facts after that browser's session ends. */
export function browserWriteGuard(userId, sessionHash, at) {
  return sessionHash === undefined ? { sql: '1', values: [] } : {
    sql: `EXISTS (SELECT 1 FROM browser_sessions WHERE session_hash=? ${userId === undefined ? '' : 'AND user_id=?'} AND revoked_at IS NULL AND expires_at>?)`,
    values: [sessionHash, ...(userId === undefined ? [] : [userId]), at]
  };
}

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

  async claimAuthorizationRefresh(userId, previousMaterial, claim) {
    const result = await this.statement(`UPDATE user_authorizations SET refresh_claim=?
      WHERE user_id=? AND protected_material=? AND refresh_claim IS NULL AND revoked_at IS NULL AND expires_at>?`,
    claim, userId, previousMaterial, this.now()).run();
    return (result.meta?.changes ?? 0) === 1;
  }

  async refreshAuthorization(userId, previousMaterial, protectedMaterial, expiresAt, claim = null) {
    const now = this.now();
    const result = await this.statement(`UPDATE user_authorizations SET protected_material=?, expires_at=?, updated_at=?, refresh_claim=NULL
      WHERE user_id=? AND protected_material=? AND refresh_claim IS ? AND revoked_at IS NULL AND expires_at > ?`, protectedMaterial, expiresAt, now, userId, previousMaterial, claim, now).run();
    return (result.meta?.changes ?? 0) === 1;
  }

  async authorization(userId) {
    return this.statement('SELECT protected_material, expires_at, revoked_at, refresh_claim FROM user_authorizations WHERE user_id=?', userId).first();
  }

  async serviceConnection(userId) {
    const row = await this.statement(`SELECT protected_material, revoked_at, expires_at,
      NOT ${NO_ORGANISATION_FUNDING} AS funded
      FROM user_authorizations WHERE user_id=?`, userId).first();
    const preference = await this.statement('SELECT disconnected_at FROM user_service_connections WHERE user_id=?', userId).first();
    if (preference?.disconnected_at) return 'disconnected';
    if (!row?.funded) return 'not-retained';
    return row.protected_material && !row.revoked_at && row.expires_at > this.now() ? 'retained' : 'unavailable';
  }

  async serviceDisconnected(userId) {
    return Boolean((await this.statement('SELECT disconnected_at FROM user_service_connections WHERE user_id=?', userId).first())?.disconnected_at);
  }

  /** Deliberate reconnect requires the same verified grant to still be current at commit. */
  async reconnectService(userId, expectedMaterial) {
    const now = this.now();
    const result = await this.statement(`INSERT INTO user_service_connections (user_id, disconnected_at, updated_at)
      SELECT user_id, NULL, ? FROM user_authorizations WHERE user_id=? AND protected_material=? AND revoked_at IS NULL AND expires_at > ?
      ON CONFLICT(user_id) DO UPDATE SET disconnected_at=NULL, updated_at=excluded.updated_at`, now, userId, expectedMaterial, now).run();
    return (result.meta?.changes ?? 0) === 1;
  }

  /** Commit a fresh user grant and its pending one-time artifact in one D1 transaction. */
  async saveAuthorizationWithArtifact(userId, protectedMaterial, authorizationExpiresAt, artifactHash, returnContext, artifactExpiresAt) {
    const now = this.now();
    await this.database.batch([
      this.statement(`INSERT INTO user_authorizations (user_id, protected_material, expires_at, revoked_at, updated_at)
        VALUES (?, ?, ?, NULL, ?) ON CONFLICT(user_id) DO UPDATE SET protected_material=excluded.protected_material,
        expires_at=excluded.expires_at, revoked_at=NULL, updated_at=excluded.updated_at, refresh_claim=NULL`, userId, protectedMaterial, authorizationExpiresAt, now),
      this.statement('INSERT INTO authorization_artifacts (artifact_hash, user_id, return_context, expires_at) VALUES (?, ?, ?, ?)', artifactHash, userId, returnContext, artifactExpiresAt)
    ]);
  }

  async revokeAuthorization(userId, { disconnectService = false, expectedMaterial, expectedRefreshClaim, sessionHash } = {}) {
    const guard = sessionHash === undefined ? undefined : browserWriteGuard(userId, sessionHash, this.now());
    const [sessions, ...authorization] = this.revokeAuthorizationStatements(userId, { disconnectService, expectedMaterial, expectedRefreshClaim, guard });
    // A browser lease stays live until all guarded effects commit. Provider lease revocation keeps its original order.
    await this.database.batch(guard ? [...authorization, sessions] : [sessions, ...authorization]);
  }

  /** Prepared revocation lets account closure end grants and sessions in its own local transaction. */
  revokeAuthorizationStatements(userId, { disconnectService = false, expectedMaterial, expectedRefreshClaim, guard = { sql: '1', values: [] }, sessionGuard = guard } = {}) {
    const now = this.now();
    const statement = (sql, ...values) => this.statement(`${sql} AND (${guard.sql})`, ...values, ...guard.values);
    const refreshGuard = expectedRefreshClaim === undefined ? '' : ' AND refresh_claim IS ?';
    const refreshValues = expectedRefreshClaim === undefined ? [] : [expectedRefreshClaim];
    const matches = expectedMaterial === undefined ? '' : ` AND EXISTS (SELECT 1 FROM user_authorizations WHERE user_id=? AND protected_material=?${refreshGuard})`;
    const lease = expectedMaterial === undefined ? [] : [userId, expectedMaterial, ...refreshValues];
    const statements = [
      this.statement(`WITH admitted AS MATERIALIZED (SELECT 1 WHERE ${sessionGuard.sql})
        UPDATE browser_sessions SET revoked_at=? WHERE user_id=? AND revoked_at IS NULL${matches} AND EXISTS (SELECT 1 FROM admitted)`, ...sessionGuard.values, now, userId, ...lease),
      statement(`UPDATE authorization_artifacts SET consumed_at=? WHERE user_id=? AND consumed_at IS NULL${matches}`, now, userId, ...lease),
      statement(`UPDATE user_authorizations SET revoked_at=?, protected_material='', refresh_claim=NULL WHERE user_id=?${expectedMaterial === undefined ? '' : ` AND protected_material=?${refreshGuard}`}`, now, userId, ...(expectedMaterial === undefined ? [] : [expectedMaterial, ...refreshValues]))
    ];
    if (disconnectService) statements.push(this.statement(`INSERT INTO user_service_connections (user_id, disconnected_at, updated_at)
      SELECT ?, ?, ? WHERE (${guard.sql}) ON CONFLICT(user_id) DO UPDATE SET disconnected_at=excluded.disconnected_at, updated_at=excluded.updated_at`, userId, now, now, ...guard.values));
    return statements;
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
        AND NOT EXISTS (SELECT 1 FROM authorization_artifacts WHERE user_id=user_authorizations.user_id AND consumed_at IS NULL AND expires_at > ?)
        AND ${NO_SERVICE_PURPOSE}`,
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
        AND NOT EXISTS (SELECT 1 FROM authorization_artifacts WHERE user_id=user_authorizations.user_id AND consumed_at IS NULL AND expires_at > ?)
        AND ${NO_SERVICE_PURPOSE}`,
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
          AND NOT EXISTS (SELECT 1 FROM authorization_artifacts WHERE user_id=user_authorizations.user_id AND consumed_at IS NULL AND expires_at > ?)
          AND ${NO_SERVICE_PURPOSE})`, now, now, now)
    ]);
  }
}
