-- SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
-- An expired offboarding projection must preserve whether execution or history
-- was deliberately off rather than making every returning repository re-consent.
ALTER TABLE deletion_tombstones ADD COLUMN execution_consent_reason TEXT;
ALTER TABLE deletion_tombstones ADD COLUMN history_consent_reason TEXT;
