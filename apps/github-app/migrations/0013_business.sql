-- SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
-- Business coordination facts of the Manage console, kept beside the Community facts of 0012 and separate from
-- provider reach and the consents: named linked policies per namespace with their revisions, which repository is
-- linked to which policy, each publication and its per-repository result as it happened, the automatic setup an
-- administrator chose for newly granted repositories, delegated administration within GitHub's ceiling, and the
-- administrative record (who requested what, where, with which result). Nothing here is contributor activity.
CREATE TABLE linked_policies (policy_id TEXT PRIMARY KEY, account_id INTEGER NOT NULL, name TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0, configuration_json TEXT NOT NULL, engine_policy_id TEXT, created_at TEXT NOT NULL, saved_at TEXT NOT NULL, actor_id INTEGER);
CREATE UNIQUE INDEX linked_policies_name ON linked_policies(account_id, name);
CREATE TABLE policy_links (repository_id INTEGER PRIMARY KEY, policy_id TEXT NOT NULL, linked_at TEXT NOT NULL, actor_id INTEGER, applied_revision INTEGER);
CREATE INDEX policy_links_policy ON policy_links(policy_id);
CREATE TABLE policy_publications (publication_id TEXT PRIMARY KEY, policy_id TEXT NOT NULL, revision INTEGER NOT NULL, requested_at TEXT NOT NULL, actor_id INTEGER);
CREATE INDEX policy_publications_policy ON policy_publications(policy_id, requested_at);
CREATE TABLE policy_publication_results (publication_id TEXT NOT NULL, repository_id INTEGER NOT NULL, state TEXT NOT NULL, reason TEXT, detail_json TEXT, attempts INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL, PRIMARY KEY (publication_id, repository_id));
CREATE TABLE automatic_setup (account_id INTEGER PRIMARY KEY, policy_id TEXT, enable_execution INTEGER NOT NULL DEFAULT 0, writer_declared INTEGER NOT NULL DEFAULT 0, saved_at TEXT NOT NULL, actor_id INTEGER, actor_login TEXT, actor_role TEXT);
CREATE TABLE delegations (account_id INTEGER NOT NULL, user_id INTEGER NOT NULL, login TEXT NOT NULL, role TEXT NOT NULL, repositories_json TEXT, granted_at TEXT NOT NULL, granted_by INTEGER, PRIMARY KEY (account_id, user_id));
CREATE INDEX delegations_user ON delegations(user_id);
CREATE TABLE administrative_events (event_id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, account_id INTEGER, repository_id INTEGER, where_text TEXT NOT NULL, actor_kind TEXT NOT NULL, actor_id INTEGER, actor_login TEXT, what TEXT NOT NULL, result TEXT NOT NULL, reason TEXT, detail_json TEXT);
CREATE INDEX administrative_events_account ON administrative_events(account_id, at);
