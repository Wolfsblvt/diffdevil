-- SPDX-License-Identifier: AGPL-3.0-only
-- Browser authorization is independent of repository execution and history consent.
CREATE TABLE authorization_attempts (state_hash TEXT PRIMARY KEY, return_context TEXT NOT NULL, expires_at TEXT NOT NULL, consumed_at TEXT);
CREATE INDEX authorization_attempts_expiry ON authorization_attempts(expires_at);
CREATE TABLE user_authorizations (user_id INTEGER PRIMARY KEY, protected_material TEXT NOT NULL, expires_at TEXT NOT NULL, revoked_at TEXT, updated_at TEXT NOT NULL);
CREATE TABLE authorization_artifacts (artifact_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL, return_context TEXT NOT NULL, expires_at TEXT NOT NULL, consumed_at TEXT);
CREATE INDEX authorization_artifacts_expiry ON authorization_artifacts(expires_at);
CREATE TABLE browser_sessions (session_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL, return_context TEXT NOT NULL, expires_at TEXT NOT NULL, revoked_at TEXT);
CREATE INDEX browser_sessions_expiry ON browser_sessions(expires_at);
