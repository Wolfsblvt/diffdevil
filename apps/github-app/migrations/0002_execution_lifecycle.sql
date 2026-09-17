-- SPDX-License-Identifier: AGPL-3.0-only
ALTER TABLE deliveries ADD COLUMN attempt_id TEXT;
ALTER TABLE deliveries ADD COLUMN fence INTEGER NOT NULL DEFAULT 0;
ALTER TABLE execution_leases ADD COLUMN attempt_id TEXT;
ALTER TABLE execution_leases ADD COLUMN fence INTEGER NOT NULL DEFAULT 0;
ALTER TABLE repositories ADD COLUMN access_state TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE repositories ADD COLUMN policy_id TEXT;
ALTER TABLE repositories ADD COLUMN consent_origin TEXT;
ALTER TABLE repositories ADD COLUMN configuration_json TEXT;
ALTER TABLE app_checks ADD COLUMN app_id INTEGER;
ALTER TABLE app_checks ADD COLUMN updated_at TEXT;
ALTER TABLE history_records ADD COLUMN schema_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE history_records ADD COLUMN state TEXT NOT NULL DEFAULT 'published';
CREATE TABLE IF NOT EXISTS history_file_rows (repository_id INTEGER NOT NULL, comparison_id TEXT NOT NULL, policy_id TEXT NOT NULL, ordinal INTEGER NOT NULL, values_json TEXT NOT NULL, PRIMARY KEY (repository_id, comparison_id, policy_id, ordinal));
CREATE TABLE IF NOT EXISTS history_effect_rows (repository_id INTEGER NOT NULL, comparison_id TEXT NOT NULL, policy_id TEXT NOT NULL, ordinal INTEGER NOT NULL, effect_json TEXT NOT NULL, PRIMARY KEY (repository_id, comparison_id, policy_id, ordinal));
CREATE TABLE IF NOT EXISTS history_repairs (id INTEGER PRIMARY KEY, repository_id INTEGER NOT NULL, comparison_id TEXT NOT NULL, policy_id TEXT NOT NULL, code TEXT NOT NULL, created_at TEXT NOT NULL, state TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS history_repairs_open ON history_repairs(state, created_at);
