-- SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
-- Facts are shared; every time/revision/expiry remains an independent observation.
ALTER TABLE analytical_file_sizes RENAME TO analytical_file_sizes_original;
CREATE TABLE analytical_size_facts (
  repository_id INTEGER NOT NULL,
  fact_key TEXT NOT NULL,
  facts_json TEXT NOT NULL,
  PRIMARY KEY (repository_id, fact_key)
);
CREATE TABLE analytical_size_observations (
  repository_id INTEGER NOT NULL,
  fact_key TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  revision TEXT NOT NULL,
  expires_at TEXT,
  order_json TEXT,
  PRIMARY KEY (repository_id, fact_key, observed_at, revision)
);
CREATE INDEX analytical_size_revision ON analytical_size_observations(repository_id,revision,fact_key,observed_at);
CREATE INDEX analytical_size_time ON analytical_size_observations(repository_id,observed_at,fact_key,revision);
CREATE INDEX analytical_size_expiry ON analytical_size_observations(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX analytical_pr_expiry ON analytical_pull_requests(expires_at) WHERE expires_at IS NOT NULL;
-- Compact retained captures too. The temporary mapping supplies short keys without requiring a provider hash function.
CREATE TABLE analytical_size_migration AS
  WITH numbered AS (SELECT *,rowid AS position,(ROW_NUMBER() OVER
    (PARTITION BY repository_id,observed_at,revision,expires_at ORDER BY path)-1)/100 AS part
    FROM analytical_file_sizes_original)
  SELECT repository_id,observed_at,revision,expires_at,part,
    json_group_array(json_object('path',path,'size',size) ORDER BY path) AS facts_json,
    json_group_array(position ORDER BY path) AS order_json,MAX(position) AS sequence
  FROM numbered GROUP BY repository_id,observed_at,revision,expires_at,part;
CREATE TABLE analytical_size_migration_keys AS
  SELECT repository_id,MIN(rowid) AS id,facts_json FROM analytical_size_migration GROUP BY repository_id,facts_json;
CREATE UNIQUE INDEX analytical_size_migration_lookup ON analytical_size_migration_keys(repository_id,facts_json);
INSERT INTO analytical_size_facts(repository_id,fact_key,facts_json)
  SELECT repository_id,'legacy:' || id,facts_json FROM analytical_size_migration_keys;
INSERT INTO analytical_size_observations(rowid,repository_id,fact_key,observed_at,revision,expires_at,order_json)
  SELECT m.sequence,m.repository_id,'legacy:' || k.id,m.observed_at,m.revision,m.expires_at,m.order_json
  FROM analytical_size_migration m JOIN analytical_size_migration_keys k USING(repository_id,facts_json);
DROP TABLE analytical_size_migration_keys;
DROP TABLE analytical_size_migration;
DROP TABLE analytical_file_sizes_original;
-- The logical projection preserves the original diagnostic/export shape, not a second writable store.
CREATE VIEW analytical_file_sizes AS
  SELECT o.repository_id,json_extract(j.value,'$.path') AS path,o.observed_at,o.revision,
    json_extract(j.value,'$.size') AS size,o.expires_at
  FROM analytical_size_observations o JOIN analytical_size_facts f USING(repository_id,fact_key),json_each(f.facts_json) j;
