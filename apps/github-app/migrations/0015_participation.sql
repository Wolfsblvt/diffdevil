-- SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
-- Participation reward campaigns, product side. diffdevil owns the survey, its answers and their privacy; Wolfsblvt Works
-- (Wirt) owns the commercial reward. One response per GitHub account and campaign version. Completing it writes the
-- outbound completion fact in the same batch, so a completion never exists without its delivery record and a delivery
-- never exists without its completion. The fact carries two identities: the opaque completion (`response_id`) and the
-- durable business event (`event_id`), created once with the completion and kept unchanged across retries and restore,
-- while each request's transport nonce is separate and fresh. Deleting the answers keeps the completion, its event and its
-- time, because the reward they earned is a separate commercial fact.
CREATE TABLE participation_responses (
  user_id INTEGER NOT NULL,
  campaign_key TEXT NOT NULL,
  campaign_version INTEGER NOT NULL,
  response_id TEXT NOT NULL UNIQUE,
  survey TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('draft', 'completed')),
  answers_json TEXT,
  started_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  answers_deleted_at TEXT,
  PRIMARY KEY (user_id, campaign_key, campaign_version)
);
CREATE TABLE participation_deliveries (
  response_id TEXT PRIMARY KEY REFERENCES participation_responses(response_id),
  event_id TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL,
  campaign_key TEXT NOT NULL,
  campaign_version INTEGER NOT NULL,
  completed_at TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('pending', 'accepted', 'refused')),
  outcome TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TEXT,
  last_attempt_at TEXT,
  last_status INTEGER,
  link_id TEXT,
  reward_id TEXT,
  receipt_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX participation_deliveries_due ON participation_deliveries(state, next_attempt_at);
-- A Pro continuation preview the person explicitly asked for (an Origin-checked POST), so that rendering the page
-- creates no Wirt quote. It holds Wirt's quote as Wirt answered it and lapses with that quote.
CREATE TABLE participation_previews (
  user_id INTEGER NOT NULL,
  cadence TEXT NOT NULL CHECK (cadence IN ('monthly', 'annual')),
  quote_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  PRIMARY KEY (user_id, cadence)
);
-- The invitation's own record: when the App first saw a managed-operation outcome during beta access (the delivery
-- ledger that shows it is pruned after its recovery window, so the observation is kept here), then one invitation and
-- one reminder.
CREATE TABLE participation_prompts (
  user_id INTEGER NOT NULL,
  campaign_key TEXT NOT NULL,
  campaign_version INTEGER NOT NULL,
  use_observed_at TEXT,
  invited_at TEXT,
  dismissed_at TEXT,
  reminded_at TEXT,
  reminder_dismissed_at TEXT,
  PRIMARY KEY (user_id, campaign_key, campaign_version)
);
