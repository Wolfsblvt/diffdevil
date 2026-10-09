# Hosted privacy, history, and data boundaries

## Meaning

This document owns the selected data contract for the optional managed GitHub App, dashboard and public playground. It separates operational recovery, account/configuration data, administrative audit and optional analytical history. It is an engineering and product contract, not a legal privacy notice or a claim that collection, retention, deletion, authentication or billing is deployed. [Direction](DIRECTION.md) owns availability; [dashboard capabilities](dashboard.md) and [access](dashboard-access.md) own the selected experience.

The dashboard co-design expands the former pathless-only projection: named file history and PR lifecycle facts are selected because they are necessary to understand where a codebase changes. This does not authorise storing source contents, patches or contributor-performance history. Existing pathless source remains a narrower implementation until changed and qualified.

## Distinct purposes and lifetimes

| Data class | Purpose | Selected boundary |
| --- | --- | --- |
| Operational delivery and attempt ledger | Deduplication, diagnosis, retry and recovery | Seven days; retries do not reset the original event's lifetime. |
| Optional analytical history | Repository/PR/file measurements, lifecycle, relationships and comparisons | Separate explicit enablement, disclosed retention/capacity, deletion and export. |
| Account, installation, configuration and entitlement | Requested service, authority, effective settings and subscription standing | While needed for the active service and its explicit lifecycle, not the recovery TTL. |
| Administrative audit | Explain configuration, permission and operating changes | Protected, purpose-specific lifetime; not contributor analytics or an undeclared source archive. |

The earlier engineering baseline is thirty rolling days for free history and no automatic age expiry for paid history while entitlement and service remain active, subject to selected shorter retention, deletion and disclosed capacity. The companion plans/management contract carries the later commercial and premium-ending settlement; the earlier baseline is not authority to override it. This document publishes no new prices or capacity promises.

No-age-expiry does not mean infinite storage, unlimited computation, a lifetime hosting promise or currently available paid service. Account configuration must not disappear after seven quiet days, and necessary account state is not permission to collect optional history before enablement.

## Execution and history are separate choices

Installation reach, execution admission and history consent remain distinct. Installing the App does not silently enable persistent history. An authorised administrator enables history for the selected scope, with a clear account of collected data, retention, coverage, export and deletion.

Named file data is part of the normal selected history capability once history is enabled. A separate filename-free mode may be considered later; it is not a first-delivery prerequisite or an already available privacy switch. A future opt-out cannot promise to reconstruct names that were not retained during its disabled interval.

Business may apply explicitly selected automatic history/import behaviour to newly reachable repositories. That is an account administrator's deliberate automation choice, not consent inferred from a preset name or App installation alone.

Workers recheck current eligibility before committing history. Queued or retried work must not resurrect collection after disablement, repopulate a deleted range or bypass an offboarding boundary. History-store failure is separate from GitHub effect success; do not rerun a non-idempotent comment merely to repair a dashboard record.

## Operational records without analytical history

Retain only the facts needed to recover admitted work: delivery/event identity, numeric installation/repository identifiers, PR number, receipt time, attempt/lease state, bounded diagnostic codes, immutable source and trusted-policy identities, compact selected-result/effect counts and readback standing.

Do not create a permanent fallback result table or per-file archive for a possible future dashboard. The recovery ledger is not a hidden historical dataset. Failed and dead-letter work obeys the same lifetime and minimisation boundary. Active leases remain valid through bounded execution; cleanup must not create competing writers.

These identifiers are linkable to GitHub and are not anonymous. Omitting contributor names does not justify an anonymisation claim.

## Retained analytical projection

Build history through an explicit allowlist, not full-report serialisation followed by redaction. A new field in the shared engine report must not automatically become hosted data.

| Category | Selected retained meaning |
| --- | --- |
| Repository identity | Stable provider repository ID, account relationship and repository name needed for authorised analytical navigation. |
| PR and comparison identity | PR number, immutable comparison/base/head references, event/observation/import times, metric/report/engine versions and policy references. |
| PR lifecycle | Observed opening/creation, draft/ready, close/reopen and merge facts, with provenance and gaps. |
| File identity and structure | Filenames, repository-relative current/previous paths, file identity and observed rename relationships where established; no invented continuity. |
| File-set coverage | Reported, observed, included, excluded, omitted, binary and unmeasurable counts and completeness. |
| Numerical measurements | Raw additions/deletions/churn; added-only/deleted-only/modified/Changed; numerical file sizes at known revisions; change-type/material enums; exact, bounded or unavailable evidence. |
| Configuration interpretation | Permitted numeric rule/scope/metric results, policy identity and provenance sufficient to distinguish current interpretation from an actually recorded original result. |
| Policy and effect outcome | Desired/requested/observed result categories, bounded counts and readback standing, without retaining arbitrary rendered comments or provider responses. |
| Coverage | Collection start/stop, retention boundaries, import provenance, known gaps and incomplete acquisition. |

Paths and repository names are protected repository metadata. They are not harmless merely because they are not source contents. Numeric IDs and revision references remain linkable. Do not market the dataset as anonymous.

### Excluded files are measured, not silently discarded

Capture permitted paths and numerical facts for observed policy-excluded files too. Ordinary analytics excludes them according to the current effective policy. Retaining those measurements permits later policy changes and an optional include-excluded view without necessarily reacquiring the source.

A policy exclusion is an analytical filter, not a no-collection control. The administration experience and data description must make that distinction understandable. Source contents remain transient for included and excluded files alike.

### Current policy and original results

Ordinary analytics interprets retained facts using the current effective policy. Recalculation changes derived results, not the underlying observation or historical provider actions.

At PR detail, an original merge-time result can be shown when actually recorded. Do not infer an old policy body or provider effect from a hash, today's configuration or a newly imported comparison. No repository-wide archive of parallel policy-era dashboards is required.

A new scope may be reconstructible from retained paths and numbers. A source-dependent metric may not be. Unsupported recalculation must report the missing dependency or coverage rather than inventing history.

## Data that must not be retained as analytical history

Do not retain source/file contents, patch hunks, full diffs, raw webhook bodies, complete report/plan objects, PR or commit prose, review/comment bodies, contributor identity dimensions, arbitrary label/template/provider-error text, secrets, tokens, session credentials or copies of user configuration masquerading as measurements.

File contents may be acquired and processed transiently in memory to measure size or changes, then discarded. The no-content rule applies to queues, dead-letter records, logs, traces, telemetry, caches and exports as well as the database. Logging an exception with a full patch is still storage.

A filename may itself contain sensitive text; the selected permission to retain paths does not grant permission to publish them or to collect arbitrary nearby prose. Configuration supplied deliberately by an administrator has its own protected purpose.

Per-file records and publication must be bounded and atomic, or visibly incomplete. A partially stored analysis must not be presented as complete. Stable file identity and observed renames require their own truthful contract; identical path spelling alone does not prove continuity.

## Configuration and administrative audit

The service stores settings that administrators deliberately submit: presets, thresholds, exclusions, labels, templates supported by the existing core, named App configurations, brief settings, defaults and linked-policy relationships. Configuration may contain paths or authored text. Keep it in protected configuration storage, not analytical logs or automatically copied into every analysis.

Execution and history decisions retain current authenticated actor provenance independently. Browser-submitted actor identity is not authoritative. Unknown legacy actors stay unknown.

The selected Business experience additionally includes a full administrative audit of meaningful settings, policy, permissions, import/delete and observed installation-management actions. Record only data needed to explain the actor, scope, change, time and result. Requested, failed and observed-complete are different outcomes. Exact audit lifetime, protected before/after representation and export need a concrete contract before collection; this document does not invent an unlimited audit-retention promise.

This audit supersedes the earlier current-actor-only product ceiling, not its current implementation evidence. Administrator identities serve accountability for administration; they do not authorise PR-author rankings, reviewer throughput or personnel analytics.

## Current authorised context

Recheck the signed-in person's current GitHub repository access and the installation's grant before serving protected history or reacquiring context. Subscription, account membership, installation ownership or a previously working URL is not permanent repository authority. Business delegation does not widen GitHub visibility.

Protected charts, tooltips, DOM attributes, exports, URLs and aggregate queries follow the same scope as visible tables. An inaccessible repository's numbers must not remain in a summary after its name is hidden. Readable shared URLs are authorisation checked, not public bearer links.

Source or PR context acquired on demand remains transient. Deleted or unavailable revisions may prevent exact reconstruction; keep the recorded facts and the limitation visible. Do not join today's PR head to yesterday's measurement.

### Named paths in requests and navigation

Authenticated analytical queries and file drill-down may carry repository-relative paths in request URLs, query parameters and navigation links. A no-source-retention claim does not make those names anonymous or remove them from local browser history. Disclose that local-history consequence; a copied or bookmarked protected link still re-authorises when opened.

The selected App boundary is an explicit `same-origin` referrer policy on App documents and responses: it preserves same-origin consumers while excluding path/query metadata from outbound cross-origin requests, including GitHub links. Application diagnostics omit full private request URLs, query strings and full referrers, retaining useful bounded operation/status/failure facts. Do not treat a URL as a safe diagnostic payload merely because it contains no source body.

Qualify the real joined document/navigation route and outbound links; endpoint response headers alone do not prove browser navigation behaviour. This is the selected implementation/disclosure boundary, not evidence that a live leak occurred or that App/browser/provider logging is already qualified. The existing GET seam remains provisional; an alternative must preserve useful queries, authenticated links and file drill-down.

## Statistics describe the codebase, not people

PR lifecycle/development and file activity are distinct populations. General file/repository historical statistics use one final recoverable comparison per merged PR. Open PRs and their revisions remain separate. Current related-work awareness uses a current open-PR file index, not an invented merged observation.

Unique PRs, analysed revisions and recovery attempts are different counts. Never sum every evolving PR snapshot as code delivered. Counts state their time basis: merge time, lifecycle occurrence, analysis observation or import time as appropriate.

Retain unknown, omitted and bounded populations and sample sizes. Comparisons must preserve metric definition, effective analytical scope, coverage and evidence compatibility. A high Turnover or frequently changed file is not a diagnosis of poor design or developer performance.

Co-change algorithms may weight relationships but must not silently rewrite ordinary file frequency/volume evidence. No contributor rankings, productivity, risk, quality, complexity or importance scores follow from these measurements.

## Import and recalculation

Historical import and open-PR scanning are explicit collection capabilities. Import preserves final comparisons and lifecycle facts only where recoverable. Earlier provider events, discarded intermediate heads and original diffdevil results must not be invented. Record that an observation was imported and distinguish provider occurrence from import time.

Imports can proceed progressively, resume and expose useful completed ranges. Live processing has priority; provider rate limits and work/capacity allowances apply. Duplicate live/import observations share a logical identity rather than doubling statistics or billable work.

Import and recalculation are not historical GitHub-effect replay. They do not post comments, change labels or update closed-PR replies. A separate live open-PR refresh may act through the normal consent and effect contract.

An import must not silently refill a disabled interval or a deliberately deleted range. Re-enablement starts honest future coverage. Any separately offered restoration of an intentional gap would require explicit product authority and a truthful recovery contract; it is not inferred from a larger plan allowance.

## Retention, export and deletion

Stopping future collection and deleting retained history are separate controls. Stopping collection does not extend expiry. Deletion covers primary observations, named file rows, lifecycle facts, co-change/other derived projections, rollups, caches and pending exports. Tombstones prevent queued retries, imports and backup restoration from recreating deleted ranges.

Exports are authorised, documented and versioned. They preserve supported measurements, identifiers, paths when authorised, versions, evidence and coverage. Analytical export is not a full database dump and does not include credentials, source, account settings or an administrative audit by accident. Configuration and audit exports require their own authority and purpose.

A changed plan or capacity boundary must be visible. Earlier paid no-age-expiry intent does not authorise unbounded bytes or silent deletion. The selected plans/management contract reconciles premium ending separately from provider access loss; its actual retention, payment-failure, capacity and export journeys must be qualified before publication. An ordinary billing retry is not confirmed offboarding.

### Offboarding transitions

The previously selected offboarding contract remains in force until deliberately revised. Confirmed repository deselection, installation removal or entitlement end stops collection and begins the selected thirty-day offboarding grace; confirmed account closure skips grace after offering export before final confirmation.

During grace, only an independently authenticated service-account or organisation administrator whose role existed before access loss may inspect the permitted retained numerical projection, export, shorten grace or delete. This is the sole post-installation exception. It grants no repository access, installation credential, GitHub reacquisition or cleanup write.

The expansion to named history does not automatically expand that old exception to filenames or private repository context. Without current GitHub repository authority, the grace projection remains numeric/pathless. Broader post-loss metadata export is not selected by this dashboard co-design.

If no valid administrator remains, data is inaccessible and expires on schedule. Restored access does not silently resume collection. Grace expiry or account closure removes primary history and derived data within seven days. Deletion/expiry tombstones survive the longest supported backup-restore window plus seven days and are reapplied before restored data can be served or processed.

A temporary outage, suspension, failed API call, unverified access response or billing retry is not a destructive transition. Suspend affected protected work and reconcile. Only explicit administrator action, provider lifecycle evidence or a positively establishing authenticated read starts the relevant offboarding transition.

Implement and qualify actual database/backup deletion before advertising the service. Disclose any bounded backup expiration; do not claim instantaneous erasure of every provider backup without evidence. Legally or financially required account records require their own purpose/lifetime and are not an excuse to retain analytical history.

## Published read-only analytics

Publication is explicit, account-scoped and limited to public GitHub repositories. The account default is a boolean; repositories inherit or explicitly enable/disable. Public visibility alone does not publish a dashboard, and a private repository is never eligible through an inherited default.

Published views are anonymous analytical projections, not public administrative sessions. They exclude settings, member permissions, audit, billing and private sibling context. Unpublication or confirmed privatisation stops serving, including the relevant public cached projection. Previously copied public material cannot be recalled from outside readers.

The same audience rule applies to PR briefs: private context must not be posted into a public PR merely because the installer can see it. An authenticated dashboard link does not protect the words surrounding it.

## Public playground

The public playground remains independent of App history, authentication, imports and subscriptions. It uses public PRs or curated fixtures, not private installation credentials. It does not enrol visitors in history or retain source, raw IPs or entered PR URLs as product analytics by default.

Any short-lived public-result cache is a disclosed service optimisation keyed to an immutable public comparison, not an indefinite repository archive. Keep source/context transient and curated published fixtures distinct from collected visitor data.

## Qualification before collection

Exercise named paths, old paths, hostile filenames, source/patch material, PR prose, credentials, config templates and provider errors. Prove that permitted metadata stays authorised and prohibited content does not escape into storage, logs, queues, exports or shared caches.

Qualify duplicate/reordered deliveries, final merged comparisons, imports, policy recalculation, changed scopes, unknown/bounded evidence, concurrent consent changes, deletion/restore, loss of access, public/private transitions, open/closed/reopened brief lifecycle and account separation. Named metadata, audit and public publication introduce real new boundaries; old pathless tests do not qualify them automatically.

Source documentation, schemas, a passing projection test and a deployed runtime each prove different things. Preserve those distinctions in availability claims.
