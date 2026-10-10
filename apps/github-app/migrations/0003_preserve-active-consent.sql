-- SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
-- Active legacy rows are current consent facts even though their historical origin is unknown.
UPDATE repositories SET execution_consent_reason = NULL WHERE state = 'active';
UPDATE repositories SET history_consent_reason = NULL WHERE state = 'active' AND history_enabled = 1;
