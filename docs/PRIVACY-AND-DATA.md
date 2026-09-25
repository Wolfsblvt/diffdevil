# Hosted privacy, history, and data boundaries

## Meaning

This document owns the selected data contract for diffdevil's optional managed GitHub App and public playground. Managed automation keeps a short recovery ledger; persistent product history is a separate opt-in feature containing quantitative results, not an archive of repository contents or contributors. It defines what may be retained, why, how long, and what historical dashboards may honestly conclude.

This is an engineering and product contract for implementation, not a claim that a hosted service, database, account system, billing integration, retention job, or legal privacy notice is already deployed. Current availability remains in [Direction](DIRECTION.md). The [App architecture](integration/github-app.md) owns execution and authorization; the [playground contract](manual/use/playground.md) owns the public demonstration.

## Three distinct lifetimes

| Data class | Purpose | Selected lifetime |
| --- | --- | --- |
| Operational delivery and attempt ledger | Deduplication, retry, diagnosis, and recovery of admitted App work | Seven days |
| Optional quantitative analysis history | User-facing activity, measurements, comparisons, and statistics | Off until enabled; thirty rolling days on the free hosted allowance |
| Account, installation, configuration, and entitlement state | Know which service was requested, by whom it may be administered, and how it should run | While needed for the active service and its explicit account lifecycle, not the delivery-ledger TTL |

The paid-history design has no automatic age expiry while the history entitlement and service remain active. Users may choose a shorter period or delete their history. This is not unlimited compute, unlimited storage, a lifetime hosting promise, or a currently available commercial offer. Prices, usage allowances, and a billing-provider contract remain release decisions.

Account configuration must not disappear because seven days passed without a PR. Conversely, necessary account state must not become a justification for collecting optional analysis history without consent.

## Operational records without history opt-in

Keep only what recovers the operation:

- delivery identity, selected event/action, installation and numeric repository IDs, PR number, and receipt time;
- attempt/lease identity, start/end times, completion standing, and bounded stable diagnostic codes;
- the immutable source and policy identities needed to distinguish stale work;
- compact selected-result and effect-count/readback summaries.

No per-file history table is populated in this mode. No permanent minimal-result table is silently appended for a possible future dashboard. Users deliberately receive managed automation without long-term product memory; analyses before opt-in cannot later be presented as recorded history.

Successful, failed, and dead-letter delivery records share the seven-day recovery boundary. A new retry does not continually extend the original event's retention. An active attempt needs its lease through its bounded execution; expiration cleanup must not create a competing writer. Operator logs and failed-job payloads must not quietly retain richer or longer-lived copies.

Numeric IDs and PR/revision references are linkable to GitHub. These are minimized operational records, not anonymous data. Do not advertise irreversible anonymization merely because a username was omitted.

## Persistent history is an explicit installation choice

An installation administrator enables history for the intended account/organization and repositories. Installation itself does not opt in. The setting states the data collected, retention period, current coverage, and how to export or delete it.

A worker rechecks current eligibility before committing history. Queued or retried work cannot resurrect collection after it was disabled or repopulate a deliberately deleted history range. Delivery idempotency and analysis identity are different: duplicate transport attempts do not produce duplicate history or chargeable analyses.

History is optional without disabling labels, comments, native checks, repository policy, or ordinary recovery. A history-store failure must not erase or misreport an already observed GitHub effect. Record the separate history failure and repair it within the available recovery/consent boundary; do not rerun a non-idempotent effect to repair a dashboard row.

## Retained measurement projection

Build history through an explicit allowlist from the canonical report and effect observations. Do not serialize the report and attempt to redact a few familiar keys afterward. Adding a field to the core report must not automatically add it to hosted storage.

Retain these result categories:

| Category | Retained meaning |
| --- | --- |
| Analysis identity | Numeric repository ID, PR number, base/head/comparison identities, analysis time, engine/report/metric versions, and policy identity |
| File-set coverage | Reported, observed, included, excluded, omitted, binary, and unmeasurable counts where supplied by the engine; completeness and evidence standing |
| Aggregate line measurements | Raw additions, raw deletions, raw churn; added-only, deleted-only, modified, and replacement-aware changed lines |
| Pathless per-file measurements | The same numeric measures per observed file, change-type/material/applicability enums, inclusion standing, and exact/bounded/unknown evidence |
| Configured numeric results | Scope counts and metric values, using opaque configuration references rather than copying arbitrary user-defined text into history |
| Policy/effect result | Rule/band references, match/evidence standing, counts and categories of desired/applied/no-op/failed effects, and readback standing |
| Time and coverage | First observation, analysis time, opt-in/retention coverage boundaries, and known collection gaps |

Store canonical measurement values with their evidence and bounds. Do not turn unavailable values into zero, collapse a proven interval to a midpoint, or describe a partial file set as a complete PR.

The source-only history query contract derives charts and Policy Lab decisions from retained rows. Shared saved lenses are protected configuration: an allowlisted query can name a metric, scope, band or rule reference and may carry a user-visible name or description there. They retain no numeric snapshot or personal identity and travel only in configuration export. History deletion or expiry removes the source records and leaves a lens with missing historical coverage; repository offboarding removes the protected lens configuration. The seven-day operational ledger separately records execution attempts and duplicate delivery receipts without promoting them to long-term product history.

Per-file records have at most an ordinal local to one analysis. It is not derived from a path, not a cross-revision identity, and not a way to track an individual file over time. Duplicate numeric rows remain distinct observations so a distribution still counts all observed files.

Persist per-file measurements in bounded rows or chunks rather than one unbounded report blob. Atomic publication, or a visible incomplete standing, must prevent a partially stored analysis from appearing complete. This is a concrete persisted-data boundary, not a generic event platform.

## Data excluded from analysis history

Do not retain:

- current or previous file paths, file names, directory names, or deterministic hashes of them;
- PR authors, commit authors/committers, reviewers, logins, names, emails, avatars, or contributor identifiers;
- PR titles/bodies, commit messages, review text, issue prose, or arbitrary webhook fields;
- source contents, patch hunks, complete diffs, raw webhook bodies, or full report/plan objects;
- rendered comments, arbitrary label text, free-text provider responses, or error strings that can contain paths or prose;
- tokens, App JWTs, webhook secrets, session credentials, or other secret material;
- copies of user-supplied configuration inside an analysis record.

A hash of a filename is not an acceptable substitute for omitting the filename. Opaque metric/rule references must not be obtained by copying a potentially path-bearing display name.

This boundary covers the database, queue, DLQ, logs, traces, exports, telemetry, and caches. It is not enough to sanitize the primary table while logging the full report in an exception.

## Configuration is not collected repository history

The dashboard necessarily stores the settings its administrator explicitly submits: preset selection, numerical defaults, exclusions, labels, and templates. Such configuration can contain path patterns or user-authored text. It belongs in the protected configuration store, not analysis history or operational logs.

Store only service identity and authorization data actually needed for account administration. A dashboard administrator's account ID is not permission to collect PR-author identities or build contributor statistics.

For each repository's latest execution and history consent decision, retain the acting administrator's numeric GitHub user ID beside that consent's origin and standing. The server takes it from the authenticated administrator session when consent changes; browser-submitted identity is ignored. An edit that only changes configuration or history retention does not replace the consent actor. Existing decisions whose actor was not recorded remain unknown rather than acquiring an inferred author. Authorized repository administrators may read the current consent actors; they are excluded from analysis history, operational result projections, and numeric history exports. They travel with protected configuration exports and are deleted with the repository's retained configuration after offboarding. Deletion tombstones keep consent standing without the actor ID. This is current-decision provenance, not a history of every prior settings revision.

Repository configuration and relative templates are read from the trusted GitHub revision for the operation. Do not retain their full bodies as part of each analysis. History stores the resolved policy identity and the origin/version references needed to explain what was applied. When old dashboard settings or repository material cannot be recovered, show the recorded numerical result and say that the historical explanation cannot be fully reconstructed. A hash alone does not recreate an old policy.

Current dashboard settings and user-selected revisions needed by the service remain an explicit configuration concern. They are not an undeclared second code archive.

## Contextual detail stays on GitHub

A dashboard may retrieve the referenced PR, comparison, and permitted contextual details on demand. Recheck the signed-in user's current access and the installation's current repository grant before making that request or returning protected history. Account membership or a previously working URL is not perpetual access.

Context is processed transiently and returned only to the authorized view. Responses containing repository context are private and non-storable by shared caches; application logs must not capture their bodies. Do not silently persist fetched names or authors to make the next view faster.

GitHub remains the source of truth for that context. Deleted/private/inaccessible PRs, revoked access, unavailable revisions, and changed provider evidence may make contextual reconstruction impossible. Show that limitation while preserving the recorded numeric result. Do not promise that every pathless historical row can later be matched to a filename: a local ordinal is not a durable GitHub file identity.

For a full historical view, reacquire the exact comparison when available and recompute through the matching engine/metric contract. Do not attach today's PR head or filename list to yesterday's numbers.

## Statistics describe measurements, not people

The first useful dashboards answer questions such as:

- How many files did analyzed PRs touch during a chosen period?
- Were changed lines concentrated in a few files or spread across many files?
- How did raw churn and replacement-aware size distributions differ?
- Which declared policy results occurred, and how much evidence was exact?
- How did these distributions vary between repositories or periods?

Count unique PRs separately from distinct analyzed revisions and execution attempts. A default PR distribution uses one explicitly described representative analysis per PR in the selected window, such as the latest observed revision in that window. Revision activity is a separate view. Never sum every successive PR snapshot and call that the amount of code changed during the month.

Charts state their time basis: for example, PRs analyzed in August, not all PRs created or merged in August. Creation/merge statistics require the corresponding evidence rather than an inference from analysis timestamps.

Default statistics distinguish all observed files from policy-included files and make exclusions discoverable. Unknown or omitted per-file values remain a separate population; they do not disappear from the denominator or masquerade as zero.

Show retention boundaries, opt-in date, collection gaps, and sample size. Two periods with different coverage cannot be presented as directly comparable without that qualification. Aggregate rollups inherit the same retention/deletion and opt-in boundaries; they are not a loophole for retaining expired history forever.

No contributor rankings, productivity scores, risk scores, or inferred code quality follow from these measurements.

## Retention, deletion, and recovery

Thirty-day free history is a rolling window measured from the analysis time, not the most recent retry or view. Enabling a longer paid window preserves still-retained records; it does not restore already expired history.

The paid no-age-expiry choice remains subject to the active service, user-selected shorter retention, explicit deletion, and disclosed storage/usage terms. A downgrade must show the new thirty-day boundary and allow export before an acknowledged destructive transition. Do not silently delete an older history range during an unrelated billing retry.

Use distinct controls for stopping future collection and deleting existing history. Stopping collection does not secretly extend existing expiry. Deleting history removes the selected records, derived rollups, and cached projections and prevents recovery work from recreating them. Service-owned deletion requires no GitHub write after installation removal.

### Offboarding transitions

Collection stops immediately for the affected scope when an administrator explicitly deselects a repository, the provider confirms installation removal, the paid-history entitlement ends, or the service confirms account closure. Queued or retried work cannot revive collection, and a disabled interval is not backfilled if access or service is later restored.

Repository deselection, installation removal, and entitlement end start a thirty-day offboarding grace. During that grace, only a service-account or organization administrator whose role existed before access loss and who can authenticate independently of the removed installation may inspect the already retained numeric history, export it, shorten the grace, or delete it. This is the sole post-installation exception to the current installation/repository authorization requirement: it does not restore repository access, use an installation credential, reacquire GitHub context, expose names or prose, or turn older paid history into an ordinary free dashboard feature.

If no valid administrator remains, the history is inaccessible and still expires on its selected schedule rather than waiting indefinitely for a future claimant. Restored installation or repository access does not silently resume collection; an authorized administrator must explicitly re-enable future history.

Confirmed account closure skips the grace. Offer export before final confirmation, then begin deletion immediately. Grace expiry or account closure removes primary history, pathless per-file rows, rollups, caches, and pending exports within seven days. Deletion and expiry tombstones survive the longest supported backup-restore window plus seven days and are reapplied before restored data can be served or processed.

One failed API call, temporary outage, billing retry, suspension, or unverified access response is not a destructive transition. Suspend new protected work or serving as needed and reconcile; offboarding begins only from explicit administrator action, a provider lifecycle event, or an authenticated provider read that positively establishes removal or deselection. Any legally, financially, or abuse-prevention-required account record needs its own disclosed purpose and lifetime and may not retain the analysis projection by convenience.

Before hosted availability, implement and qualify the real database/backup deletion boundary and disclose any bounded backup expiration. A restore must preserve opt-outs, deletions, and expiration rather than resurrecting them. Do not claim immediate erasure of every provider backup without evidence.

Export retained numeric data in a documented, versioned machine format without joining in prohibited context. A useful export preserves evidence, versions, identifiers, and coverage. It is separate from an operator database export, which may contain protected configuration and account state.

The versioned query and export code selects only currently retained, published records at read time. An exported file already delivered to an authorized administrator is outside server-side deletion reach; the service does not preserve a second pending export or cached chart projection. Analysis rows alone cannot prove that an entire requested period was collected, so a query reports observed-sample coverage and known record gaps rather than inventing complete opt-in coverage.

## Public playground

The playground does not enroll visitors in App history and does not expose private PRs. Its rate-limit counters are short-lived abuse/compute controls, not an activity timeline. Do not retain raw client IPs or entered PR URLs in product analytics by default.

Public-result caching is a separately disclosed short-lived service optimization, not permanent history. Prefer the quantitative projection keyed to immutable public comparison identity. Keep fetched paths and prose transient, and never reuse App installation credentials. Curated repository-owned fixtures are published examples, not collected visitor data.

## Implementation evidence

Qualify the allowlist with source-shaped specimens containing paths, old paths, authors, arbitrary rule/label text, templates, and errors. Prove that none reaches history, logs, queues, exports, or shared caches. Exercise exact/bounded/unknown results, partial file sets, duplicate deliveries, opt-in changes during work, expiration, deletion, restore, access removal, and account/repository separation.

Also qualify repository deselection, installation removal, entitlement end, and confirmed account closure; the independent pre-loss administrator check; the grace export/shorten/delete paths; no GitHub reacquisition or cleanup write after access loss; no automatic resume after restoration; grace expiry and immediate account-closure deletion; and tombstone reapplication across the longest supported backup-restore window.

A clean source diff or database migration is not evidence that retention runs in production. A passing numeric projection test does not prove dashboard authorization. Preserve those proof boundaries when reporting implementation.
