-- SPDX-License-Identifier: AGPL-3.0-only
CREATE TABLE delivery_repairs (
  delivery_id TEXT PRIMARY KEY,
  repair_kind TEXT NOT NULL,
  projection_json TEXT NOT NULL,
  state TEXT NOT NULL,
  claimed_at TEXT,
  completed_at TEXT,
  code TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX delivery_repairs_open ON delivery_repairs(state, created_at);

CREATE TABLE history_records_v3 (
  id INTEGER PRIMARY KEY,
  repository_id INTEGER NOT NULL,
  pull_request INTEGER NOT NULL,
  comparison_id TEXT NOT NULL,
  policy_id TEXT NOT NULL,
  schema_version INTEGER NOT NULL,
  engine_version TEXT NOT NULL,
  report_version TEXT NOT NULL,
  metric_version TEXT NOT NULL,
  base_sha TEXT,
  head_sha TEXT,
  observed_at TEXT NOT NULL,
  expires_at TEXT,
  projection_json TEXT NOT NULL,
  coverage_json TEXT NOT NULL,
  results_json TEXT NOT NULL,
  gaps_json TEXT NOT NULL,
  state TEXT NOT NULL,
  UNIQUE(repository_id, comparison_id, policy_id, schema_version, metric_version)
);
INSERT INTO history_records_v3 (id, repository_id, pull_request, comparison_id, policy_id, schema_version, engine_version, report_version, metric_version, observed_at, expires_at, projection_json, coverage_json, results_json, gaps_json, state)
  SELECT id, repository_id, pull_request, comparison_id, policy_id, schema_version, 'unknown', 'unknown', 'unknown', observed_at, expires_at, projection_json, '{}', '[]', '[]', state FROM history_records;
CREATE TABLE history_file_rows_v3 (history_id INTEGER NOT NULL, ordinal INTEGER NOT NULL, values_json TEXT NOT NULL, PRIMARY KEY (history_id, ordinal), FOREIGN KEY (history_id) REFERENCES history_records_v3(id));
INSERT INTO history_file_rows_v3 (history_id, ordinal, values_json)
  SELECT r.id, f.ordinal, f.values_json FROM history_file_rows f JOIN history_records_v3 r ON r.repository_id=f.repository_id AND r.comparison_id=f.comparison_id AND r.policy_id=f.policy_id;
CREATE TABLE history_effect_rows_v3 (history_id INTEGER NOT NULL, ordinal INTEGER NOT NULL, effect_json TEXT NOT NULL, PRIMARY KEY (history_id, ordinal), FOREIGN KEY (history_id) REFERENCES history_records_v3(id));
INSERT INTO history_effect_rows_v3 (history_id, ordinal, effect_json)
  SELECT r.id, e.ordinal, e.effect_json FROM history_effect_rows e JOIN history_records_v3 r ON r.repository_id=e.repository_id AND r.comparison_id=e.comparison_id AND r.policy_id=e.policy_id;
DROP TABLE history_file_rows;
DROP TABLE history_effect_rows;
DROP TABLE history_records;
ALTER TABLE history_records_v3 RENAME TO history_records;
ALTER TABLE history_file_rows_v3 RENAME TO history_file_rows;
ALTER TABLE history_effect_rows_v3 RENAME TO history_effect_rows;
CREATE INDEX history_expiry ON history_records(expires_at);
