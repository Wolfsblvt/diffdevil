-- SPDX-License-Identifier: AGPL-3.0-only
-- Repository admission changes are compare-and-set operations.  The revision is
-- deliberately separate from provider reach so an interrupted installation can
-- never be mistaken for an administrator settings update.
ALTER TABLE repositories ADD COLUMN settings_revision INTEGER NOT NULL DEFAULT 0;
ALTER TABLE repositories ADD COLUMN configuration_policy_id TEXT;
ALTER TABLE repositories ADD COLUMN writer_standing TEXT NOT NULL DEFAULT 'unverified';
ALTER TABLE repositories ADD COLUMN writer_origin TEXT;
