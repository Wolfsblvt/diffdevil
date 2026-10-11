-- SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
-- Operating continuity for the Manage console. The facts the runtime needs to enforce the selected allowances itself:
-- an installation account's kind (personal or organisation) and a repository's visibility, both observed from GitHub
-- webhooks or the administrator's own reads; durable history jobs (imports and recalculation) whose progress and
-- cursor outlive any queue message; a repository's explicit adoption of its namespace's Pro default; and the moment a
-- saved choice of what stays became the actual consequence of a plan reduction.
ALTER TABLE installations ADD COLUMN account_kind TEXT;
ALTER TABLE repositories ADD COLUMN visibility TEXT;
CREATE TABLE history_jobs (
  job_id TEXT PRIMARY KEY,
  repository_id INTEGER NOT NULL,
  installation_id INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('import', 'recalculate')),
  state TEXT NOT NULL CHECK (state IN ('queued', 'running', 'paused', 'complete', 'stopped', 'failed')),
  reason TEXT,
  sequence INTEGER NOT NULL DEFAULT 0,
  scope_limit INTEGER,
  cursor_json TEXT NOT NULL DEFAULT '{}',
  progress_json TEXT NOT NULL DEFAULT '{}',
  policy_id TEXT,
  requested_by INTEGER,
  requested_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  lease_until TEXT,
  wake_at TEXT,
  finished_at TEXT
);
CREATE INDEX history_jobs_repository ON history_jobs(repository_id, requested_at);
CREATE INDEX history_jobs_open ON history_jobs(state, updated_at);
CREATE TABLE repository_default_adoptions (repository_id INTEGER PRIMARY KEY, account_id INTEGER NOT NULL, default_revision INTEGER NOT NULL, applied_at TEXT NOT NULL, actor_id INTEGER);
ALTER TABLE plan_change_choices ADD COLUMN applied_at TEXT;
ALTER TABLE plan_change_choices ADD COLUMN outcome_json TEXT;
