-- SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
-- A one-use provider refresh must be claimed before the external rotation. An
-- interrupted/unknown rotation cannot be retried by expiring its claim: only the
-- committed replacement or a fresh verified authorization clears that uncertainty.
ALTER TABLE user_authorizations ADD COLUMN refresh_claim TEXT;
