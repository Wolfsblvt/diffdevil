-- SPDX-License-Identifier: AGPL-3.0-only
-- Query retained analyses by repository and observation time without indexing
-- path-bearing or user-authored configuration.
CREATE INDEX IF NOT EXISTS history_repository_window ON history_records(repository_id, state, observed_at DESC, id DESC);

-- A delivery is not an execution attempt. These rows share the seven-day
-- operational ledger lifetime and are removed with their parent delivery.
CREATE TABLE IF NOT EXISTS execution_attempts (
  attempt_id TEXT PRIMARY KEY,
  delivery_id TEXT NOT NULL,
  repository_id INTEGER NOT NULL,
  pull_request INTEGER NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  state TEXT NOT NULL,
  code TEXT,
  FOREIGN KEY (delivery_id) REFERENCES deliveries(delivery_id)
);
CREATE INDEX IF NOT EXISTS execution_attempt_repository_window ON execution_attempts(repository_id, started_at);
ALTER TABLE deliveries ADD COLUMN duplicate_count INTEGER NOT NULL DEFAULT 0;

-- Saved lenses are protected configuration, separate from numeric history.
CREATE TABLE IF NOT EXISTS history_lenses (
  repository_id INTEGER NOT NULL,
  lens_id TEXT NOT NULL,
  lens_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (repository_id, lens_id)
);
