-- SPDX-License-Identifier: AGPL-3.0-only
-- Separate from pathless observation history. One lifecycle/development record per PR.
-- only an explicitly recovered final merged comparison enters merged-file analytics.
CREATE TABLE analytical_pull_requests (
  repository_id INTEGER NOT NULL,
  pull_request INTEGER NOT NULL,
  updated_at TEXT NOT NULL,
  expires_at TEXT,
  record_json TEXT NOT NULL,
  PRIMARY KEY (repository_id, pull_request)
);
CREATE INDEX analytical_repository_expiry ON analytical_pull_requests(repository_id, expires_at);
CREATE TABLE analytical_file_sizes (
  repository_id INTEGER NOT NULL,
  path TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  revision TEXT NOT NULL,
  size INTEGER,
  expires_at TEXT,
  PRIMARY KEY (repository_id, path, observed_at, revision)
);
CREATE INDEX analytical_file_size_window ON analytical_file_sizes(repository_id,path,observed_at);
