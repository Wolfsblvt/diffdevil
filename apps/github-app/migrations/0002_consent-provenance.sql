-- SPDX-License-Identifier: AGPL-3.0-only
-- Existing consent_origin values are intentionally not copied: the old column
-- recorded only the final write and cannot prove which of three facts it names.
ALTER TABLE repositories ADD COLUMN execution_consent_origin TEXT;
ALTER TABLE repositories ADD COLUMN execution_consent_reason TEXT DEFAULT 'unknown';
ALTER TABLE repositories ADD COLUMN history_consent_origin TEXT;
ALTER TABLE repositories ADD COLUMN history_consent_reason TEXT DEFAULT 'unknown';
ALTER TABLE repositories ADD COLUMN configuration_origin TEXT;
