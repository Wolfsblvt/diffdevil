-- SPDX-License-Identifier: AGPL-3.0-only
-- Service disconnect is an account preference, independent of replaceable browser grants.
-- No grant or commercial state is copied. Ordinary sign-in must not clear this preference.
CREATE TABLE user_service_connections (user_id INTEGER PRIMARY KEY, disconnected_at TEXT, updated_at TEXT NOT NULL);
