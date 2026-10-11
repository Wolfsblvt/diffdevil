-- SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
-- The Manage console's own product facts, separate from provider reach, execution consent and history consent:
-- which reachable repositories an administrator selected to operate (a selection holds an allowance slot before
-- execution is enabled), the one organisation a Free account connects to its pooled allowance, the short-lived
-- departure record behind the return from Wolfsblvt Works, the choice of what stays when a paid plan reduces, and
-- the reusable namespace default (Pro) that joins the effective policy as its account layer.
CREATE TABLE repository_selections (repository_id INTEGER PRIMARY KEY, selected_at TEXT NOT NULL, actor_id INTEGER);
CREATE TABLE free_connections (user_id INTEGER PRIMARY KEY, organisation_id INTEGER NOT NULL, since TEXT NOT NULL);
CREATE UNIQUE INDEX free_connections_organisation ON free_connections(organisation_id);
CREATE TABLE works_departures (user_id INTEGER PRIMARY KEY, purpose TEXT NOT NULL, from_path TEXT, snapshot_json TEXT, created_at TEXT NOT NULL, expires_at TEXT NOT NULL);
CREATE TABLE plan_change_choices (user_id INTEGER PRIMARY KEY, choice_json TEXT NOT NULL, saved_at TEXT NOT NULL);
CREATE TABLE namespace_defaults (account_id INTEGER PRIMARY KEY, revision INTEGER NOT NULL DEFAULT 0, configuration_json TEXT NOT NULL, policy_id TEXT, saved_at TEXT NOT NULL, actor_id INTEGER);
