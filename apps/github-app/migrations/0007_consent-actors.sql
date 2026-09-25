-- SPDX-License-Identifier: AGPL-3.0-only
-- Only the latest execution and history consent decisions retain their acting
-- GitHub administrator IDs; older rows have unknown actors.
ALTER TABLE repositories ADD COLUMN execution_consent_actor_id INTEGER;
ALTER TABLE repositories ADD COLUMN history_consent_actor_id INTEGER;
