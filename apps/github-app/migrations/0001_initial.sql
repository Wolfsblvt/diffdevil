-- SPDX-License-Identifier: AGPL-3.0-only
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS installations (installation_id INTEGER PRIMARY KEY, state TEXT NOT NULL, updated_at TEXT NOT NULL, offboarding_at TEXT, tombstoned_at TEXT);
CREATE TABLE IF NOT EXISTS repositories (repository_id INTEGER PRIMARY KEY, installation_id INTEGER NOT NULL, full_name TEXT, history_enabled INTEGER NOT NULL DEFAULT 0, retention_days INTEGER, state TEXT NOT NULL DEFAULT 'active', updated_at TEXT NOT NULL, FOREIGN KEY (installation_id) REFERENCES installations(installation_id));
CREATE TABLE IF NOT EXISTS deliveries (delivery_id TEXT PRIMARY KEY, installation_id INTEGER NOT NULL, repository_id INTEGER, pull_request INTEGER, state TEXT NOT NULL, lease_until TEXT, received_at TEXT NOT NULL, completed_at TEXT, code TEXT);
CREATE INDEX IF NOT EXISTS deliveries_expiry ON deliveries(lease_until);
CREATE TABLE IF NOT EXISTS execution_leases (repository_id INTEGER NOT NULL, pull_request INTEGER NOT NULL, state TEXT NOT NULL, lease_until TEXT, delivery_id TEXT NOT NULL, PRIMARY KEY (repository_id, pull_request));
CREATE TABLE IF NOT EXISTS app_checks (repository_id INTEGER NOT NULL, pull_request INTEGER NOT NULL, head_sha TEXT NOT NULL, policy_id TEXT NOT NULL, check_run_id INTEGER NOT NULL, PRIMARY KEY (repository_id, pull_request, head_sha, policy_id));
CREATE TABLE IF NOT EXISTS operational_results (delivery_id TEXT PRIMARY KEY, policy_id TEXT, comparison_id TEXT, status TEXT NOT NULL, effect_count INTEGER NOT NULL DEFAULT 0, recorded_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS history_records (id INTEGER PRIMARY KEY, repository_id INTEGER NOT NULL, pull_request INTEGER NOT NULL, comparison_id TEXT NOT NULL, policy_id TEXT NOT NULL, observed_at TEXT NOT NULL, expires_at TEXT, projection_json TEXT NOT NULL, UNIQUE(repository_id, comparison_id));
CREATE INDEX IF NOT EXISTS history_expiry ON history_records(expires_at);
CREATE TABLE IF NOT EXISTS deletion_tombstones (scope TEXT PRIMARY KEY, deleted_at TEXT NOT NULL, reapply_until TEXT NOT NULL);
