-- SPDX-License-Identifier: AGPL-3.0-only
-- Customer-authorized Wirt links, the latest applied benefit projection, organisation
-- bindings and the product-report outbox. Commercial facts never become GitHub authority.
CREATE TABLE commercial_link_attempts (state_hash TEXT PRIMARY KEY, browser_hash TEXT NOT NULL, user_id INTEGER NOT NULL, intent_id TEXT NOT NULL, protected_verifier TEXT NOT NULL, protected_grant TEXT, expires_at TEXT NOT NULL, consumed_at TEXT, finished_at TEXT);
CREATE INDEX commercial_link_attempts_expiry ON commercial_link_attempts(expires_at);
CREATE TABLE commercial_links (link_id TEXT PRIMARY KEY, product_account INTEGER NOT NULL, works_account TEXT NOT NULL, state TEXT NOT NULL, intent_id TEXT, protected_grant TEXT, established_at TEXT NOT NULL, ended_at TEXT, end_source TEXT, applied_epoch INTEGER, applied_version INTEGER, applied_result TEXT, applied_at TEXT, projection_json TEXT, revision INTEGER NOT NULL DEFAULT 0, report_version INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL);
CREATE UNIQUE INDEX commercial_links_active_account ON commercial_links(product_account) WHERE state='active';
CREATE TABLE commercial_bindings (link_id TEXT NOT NULL, slot TEXT NOT NULL, organisation_id INTEGER NOT NULL, authority TEXT NOT NULL, display TEXT, since TEXT NOT NULL, checked_at TEXT NOT NULL, PRIMARY KEY (link_id, slot), FOREIGN KEY (link_id) REFERENCES commercial_links(link_id));
CREATE UNIQUE INDEX commercial_bindings_organisation ON commercial_bindings(organisation_id);
CREATE TABLE commercial_refusals (link_id TEXT NOT NULL, slot TEXT NOT NULL, organisation_id INTEGER NOT NULL, reason TEXT NOT NULL, refused_at TEXT NOT NULL, PRIMARY KEY (link_id, slot, organisation_id));
CREATE TABLE commercial_reports (link_id TEXT NOT NULL, report_version INTEGER NOT NULL, body TEXT NOT NULL, state TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, next_attempt_at TEXT, last_status INTEGER, code TEXT, created_at TEXT NOT NULL, PRIMARY KEY (link_id, report_version));
CREATE INDEX commercial_reports_due ON commercial_reports(state, next_attempt_at);
CREATE TABLE commercial_nonces (nonce_hash TEXT PRIMARY KEY, expires_at TEXT NOT NULL);
CREATE INDEX commercial_nonces_expiry ON commercial_nonces(expires_at);
-- The installation's GitHub account is the repository namespace that a subscription can fund.
ALTER TABLE installations ADD COLUMN account_id INTEGER;
