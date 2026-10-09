# Hosted privacy, history, and data boundaries

## Meaning

This is the selected engineering/product data contract for the developing managed App, dashboard and public playground. It separates recovery, account/configuration data, administrative audit, optional analytical history and inactive recovery archives. It is not a legal privacy notice or a claim that these collection, deletion, billing or authorisation paths are deployed. [Direction](DIRECTION.md), [plans](app-plans.md), [management](app-management.md) and [access](dashboard-access.md) state the related boundaries.

The older pathless backend is narrower evidence, not the product ceiling. Named base measurements are selected on every history-enabled tier, including Free, so policies can be replayed without unnecessary reacquisition. Premium entitlement governs enriched historical capabilities and their presentation, not whether Free retains the basic file facts needed for supported recalculation.

## Distinct purposes and lifetimes

| Data class | Purpose | Selected boundary |
| --- | --- | --- |
| Delivery/attempt recovery | Deduplication, diagnosis, retry and recovery | Seven days, without retry resetting the original lifetime |
| Enabled analytical history | Repository/PR measurements and lifecycle; entitled file enrichment and relationships | Explicit enablement, disclosed service/operator retention, deletion and export |
| Account, installation, funding, configuration and entitlement | Requested service and its authority | Active service and explicit lifecycle, not recovery TTL |
| Works link and benefit projection | Apply the customer-authorized commercial standing: pseudonymous Works account ID, latest projection (tier, standing, period, capacity and display-only renewal amount), sealed owner grant, organisation bindings with the funder's observed GitHub authority and its time, and a display label only while that authority was last observed present | While the link is active. A label is dropped when a check records absent or unknown authority; report evidence never keeps one, and an unsent report holds it only until it is sent, superseded or failed. Report evidence ages out after thirty days except each active link's latest report. Ending the link removes the projection, grant, bindings and every label at once; its report evidence ages out on the same thirty days, leaving only the ended link identity. No payment instrument, invoice or other account is received |
| Administrative audit | Explain settings, permissions and operating changes | Protected purpose-specific retention, not contributor analytics |
| Preview/OSS benefit record | Honour one-time preview and repository grant eligibility | Minimum justified identity/state, separate from the analytical dataset |
| Frozen selected-state archive | Recover an ended premium service without keeping it running | Disclosed shared recovery policy and deadline, current access and earlier deletion |

The old thirty-day rolling Free-history and financial-entitlement deletion assumptions do not define the new offer. Hosted history and inactive archives must follow the published selected service policy, not an incidental storage TTL. Community's operator chooses its retention and resource limits.

No history promise supplies infinite physical storage, perpetual operation or permission to retain deleted data. Necessary account state must not expire after seven quiet days; equally, an account is not consent to collect optional history.

## Execution, history and enrichment are separate

Installation reach, selected execution and history enablement are distinct. An authorised administrator explicitly enables history with a clear explanation of retained data, coverage, export and deletion. Labelling-only operation does not create permanent history.

History-enabled Free retains permitted paths and numerical per-file facts, including policy-excluded observations. It does not expose premium cross-time file exploration or collect all premium enrichment by default. Pro/Business or an applicable repository grant enable the richer processing and experience.

Business can apply deliberately selected history/import behaviour to newly reachable repositories. A preset name or an App installation alone is not that consent. A future filename-free mode is not a first-delivery requirement or an already available switch.

Continuing jobs recheck reach, consent, entitlement and deletion boundaries before committing. Queued retries must not resume disabled collection or repopulate a deleted range. A history-storage failure is separate from an already successful GitHub effect; do not blindly recreate a comment to repair an analytical row.

## Short operational recovery

Retain only the facts needed to recover admitted work: delivery/event identity, numeric installation/repository identifiers, PR number, receipt time, attempt/lease state, bounded diagnostic codes, immutable comparison and trusted-policy identities, compact result/effect counts and readback standing.

Do not create a permanent fallback analysis table or per-file archive for repositories that did not enable history. Failed/dead-letter work obeys the same minimisation and original lifetime. Active leases protect the actual bounded execution rather than allowing cleanup to create a second writer.

These identifiers are linkable, not anonymous. Omission of contributor names is data minimisation, not anonymisation.

## Explicit retained analytical projection

Use an allowlist, not a full engine report followed by redaction. Adding a field to the engine does not automatically add it to hosted retention.

| Category | Permitted retained meaning |
| --- | --- |
| Repository | Stable provider ID, account relationship and authorised repository name |
| PR/comparison | PR number, immutable base/head/comparison references, occurrence/observation/import times and semantic versions |
| Lifecycle | Observed creation/opening, draft/ready, close/reopen and merge facts with provenance and gaps |
| Base file observation | Current/previous relative paths where observed, numerical raw/Changed facts, change/material status and evidence |
| Identity continuity | Actually supported historical file/rename relationships, not inferred continuity from a reused name |
| Coverage | Reported/observed/included/excluded/omitted/binary/unmeasurable counts, collection intervals and known gaps |
| Premium enrichment | Numerical sizes at known references, eligible derived relationships and historical file interpretation |
| Policy interpretation | Permitted numeric rule/scope/metric results and references distinguishing current interpretation from original recorded result |
| Effect result | Desired/requested/observed categories, bounded counts and readback; not rendered comments or raw responses |

Names and paths are protected repository metadata. They and immutable IDs/references remain linkable. Do not market this dataset as anonymous or publicly expose it merely because it contains no source.

The source-only history query contract derives charts and Policy Lab decisions from retained rows. Shared saved lenses are protected configuration: an allowlisted query can name a metric, scope, band or rule reference and may carry a user-visible name or description there. They retain no numeric snapshot or personal identity and travel only in configuration export. History deletion or expiry removes the source records and leaves a lens with missing historical coverage; repository offboarding removes the protected lens configuration. The seven-day operational ledger separately records execution attempts and duplicate delivery receipts without promoting them to long-term product history.

### Excluded observations

Retain the permitted measured paths and numerical facts of policy-excluded files. Ordinary analytics filters them under the effective policy. This supports changed exclusions and a possible include-excluded view without fetching facts already known.

An analytical exclusion is not a no-collection control. Explain that distinction in settings and data information. Source remains transient for included and excluded observations alike.

### Interpretation and original results

Recalculation derives a current-policy view without rewriting immutable observations or actual historical GitHub actions. Manual Free/Pro and coordinated Business refresh use the same semantics. A queued refresh identifies the basis of currently served results.

At PR detail an original merge-time result may be shown only if recorded. A hash, today's policy or an imported comparison does not reconstruct a missing original policy/result. No repository-wide parallel policy-era warehouse is required.

A newly source-dependent calculation may lack sufficient facts. Acquire additional authorised evidence where supported or report the limitation; do not imply that every possible future metric can be replayed from base rows.

## Information excluded from analytical retention

Do not retain source/file contents, patch hunks, full diffs, raw webhooks, complete report/plan objects, PR/commit prose, review/comment bodies, contributor analytics dimensions, arbitrary labels/templates/provider-error text, credentials or full configuration masquerading as measurements.

Contents may be acquired transiently in memory to calculate measurements and then discarded. This rule reaches logs, traces, queues, dead-letter records, telemetry, caches and exports as well as primary storage. A serialized exception containing a patch is still storage.

A filename itself can contain sensitive text; permission to store paths is not publication permission or authority to capture unrelated prose. Administrator-supplied configuration has a separate protected purpose.

Persist a complete observation atomically or make partial coverage explicit. Incomplete per-file publication must not appear complete. Identical path spelling alone is not stable historical identity.

## Configuration, funding and audit

Store the settings deliberately supplied for service operation: presets, thresholds, exclusions, supported labels/templates, App brief controls, defaults and Business links. Keep them in protected configuration state, not copied into every history row or arbitrary logs.

Execution consent, history consent and configuration authorship preserve independently established actor provenance. A browser-supplied actor string is not authority; unknown old actors remain unknown.

Funding records connect a subscriber's benefit to an organisation without making its records personal property. The organisation may see who provides the plan, not unrelated invoices or payment instruments. Minimal preview eligibility keyed to stable GitHub identity is separate from retained sample data; reinstall is not a reset.

Business provides an administrative audit of meaningful settings, policy, permissions, setup, import/deletion and observed installation-management changes. Actor, scope, event time, intended change and actual outcome remain distinct. Exact retention and protected before/after/export representation require an implementation contract; no unlimited audit promise is inferred.

Administrator identities support operational accountability, not author/reviewer performance rankings.

## Current authorised context

Check current signed-in GitHub repository access and App reach before protected reads or reacquisition. A subscription, former funding relationship, membership or previously working link is not permanent authority.

The same scope governs tables, charts, tooltips, DOM data, queries, exports and aggregates. Hide neither an inaccessible name nor its numbers selectively. Protected shared URLs remain authenticated/authorised, not public bearer links.

On-demand source or PR context stays transient and belongs to the recorded immutable comparison. Do not join today's head to yesterday's measurement. Unavailable/deleted revisions constrain reconstruction without invalidating what was actually observed.

### Named paths in requests and navigation

Authenticated analytical queries and file drill-down may carry repository-relative paths in request URLs, query parameters and navigation links. A no-source-retention claim does not make those names anonymous or remove them from local browser history. Disclose that local-history consequence; a copied or bookmarked protected link still re-authorises when opened.

The selected App boundary is an explicit `same-origin` referrer policy on App documents and responses: it preserves same-origin consumers while excluding path/query metadata from outbound cross-origin requests, including GitHub links. Application diagnostics omit full private request URLs, query strings and full referrers, retaining useful bounded operation/status/failure facts. Do not treat a URL as a safe diagnostic payload merely because it contains no source body.

Qualify the real joined document/navigation route and outbound links; endpoint response headers alone do not prove browser navigation behaviour. This is the selected implementation/disclosure boundary, not evidence that a live leak occurred or that App/browser/provider logging is already qualified. The existing GET seam remains provisional; an alternative must preserve useful queries, authenticated links and file drill-down.

## Populations and statistical honesty

PR lifecycle/development, current open work and final merged-PR file activity are distinct populations. General file/repository history uses one final recoverable comparison per merged PR. Current related-work uses a current open-PR file index.

Unique PRs, analysed revisions and service attempts are distinct counts. Evolving snapshots do not sum to delivered code. Occurrence, merge, observation and import time retain their respective meanings.

Preserve unknown/bounded evidence, missing populations, sample sizes and compatible scope/metric versions. Co-change weighting does not change the underlying frequency/volume observations. High Turnover is not poor design, and no risk, quality, importance, complexity or contributor productivity conclusion is collected by implication.

## Import and progressive processing

Historical import recovers only available final comparisons and lifecycle facts, without inventing vanished intermediate heads or original App results. Open-PR scanning is a separate current-population operation. Record provenance and distinguish import time from actual occurrence.

Progressive jobs preserve useful completed ranges and durable continuation independent of execution-message lifetime. Live operation takes priority and all requests respect provider limits. Imported/live duplicate observations share logical identity; recovery does not spend another customer allowance.

Premium enrichment and broad replay can lag or pause under sustained use. The management view shows actual coverage and basis, not an unsupported eventual-completion promise. A monthly historical-import allowance does not debit ordinary new PRs.

Imports/recalculation never replay old labels, comments or closed-PR replies. A separately authorised current open-PR refresh follows the normal effect contract. Re-enabling collection or buying a larger plan does not silently refill intentionally deleted/disabled intervals.

## Export, deletion and ending

Stopping collection and deleting retained history are separate. A processing pause does not erase data or change billing. An export is documented, versioned and currently authorised; it contains permitted measurements, names where authorised, versions, references and evidence/coverage.

Analytical export is not a raw database dump. Do not include credentials, source, account configuration or audit by accident. Configuration/audit exports have distinct authority and purpose.

Deletion covers base history, named file rows, lifecycle, enrichment, relationships, rollups, caches and pending exports. Tombstones protect against recreation through queued work, imports and backup restore.

<a id="offboarding-transitions"></a>

### Financial downgrade or premium ending

Honour the paid period. At the effective lower plan, premium exploration/processing stops and only selected eligible basic operation continues. Authorised export and deletion remain available without another purchase.

Preserve selected frozen state through the disclosed shared Works archive/recovery policy and visible deadline. The shared default is four years from service end; exact per-customer archival and any explicitly justified data-heavy exception must be qualified before sale. This is not an active premium dataset, a full shared-database copy or permission to extend the deadline by moving the archive.

The new archive choice supersedes only the old financial-entitlement thirty-day destruction assumption. It does not override explicit deletion, repository offboarding, provider removal or lost access. Paying again cannot restore data deliberately deleted or widen current GitHub authority.

### Repository deselection or provider access loss

An explicit repository offboarding/removal or confirmed installation removal stops collection and starts the existing thirty-day offboarding grace. Pausing work, releasing an allowance slot or becoming inactive over a lower-plan limit is not, by itself, this destructive offboarding instruction; the management/archive contract owns those retained states. Confirmed account closure skips grace after export is offered before final confirmation.

During that grace, the sole post-installation exception is an independently authenticated service-account/organisation administrator whose role pre-existed access loss. They may inspect/export the permitted numerical projection, shorten grace or delete. They may not use an installation credential, reacquire GitHub context, restore access or perform cleanup writes.

Without current GitHub repository authority, that exception remains numeric/pathless. Premium payment or a frozen archive does not permit named private metadata export to a revoked former payer. No valid administrator means inaccessible data that expires on schedule.

Restored access does not silently resume collection. Grace expiry or confirmed closure removes primary/derived data within seven days. Reapply deletion/expiry tombstones before restored data is served or processed; retain them through the longest supported restore window plus seven days.

Temporary outages, API failures, ambiguous access responses, suspension or payment retry do not select destructive offboarding. Suspend the affected operation and reconcile with explicit administrator direction, provider lifecycle evidence or a positively establishing authenticated read.

### Backup and residual records

Qualify actual deletion/restore behaviour before advertising it. Disclose bounded backup expiry rather than claiming unobserved instantaneous removal everywhere. Legally required commercial records and minimal eligibility records have their own purpose/lifetime, not a blanket exemption for analytical history.

## Publication, previews and Open Source

Public analytics is an explicit account-scoped choice for public GitHub repositories only, using a boolean default and repository inherit/enabled/disabled. A public repository is not automatically published; private repositories are never eligible through inheritance.

Serve only the repository's eligible analytical projection, excluding configuration, audit, billing, delegated rights and private sibling facts. Unpublishing/privatisation stops relevant public serving and cache use. External copies cannot be recalled.

A preview is a frozen permitted sample with current access and deletion controls, not continuing premium collection. Its eligibility record remains distinct from sample retention. An OSS grant is repository-scoped; privatisation revokes it and public publication, but is not itself a deletion request. Ordinary sufficient entitlement can continue.

Public PR briefs obey their actual audience independently of a protected link. Private contextual facts must not escape through the comment.

The versioned query and export code selects only currently retained, published records at read time. An exported file already delivered to an authorized administrator is outside server-side deletion reach; the service does not preserve a second pending export or cached chart projection. Analysis rows alone cannot prove that an entire requested period was collected, so a query reports observed-sample coverage and known record gaps rather than inventing complete opt-in coverage.

## Public playground

The playground remains independent of App accounts, subscriptions, imports and history. It uses public PRs/curated fixtures, not private installation credentials. It does not enrol visitors into history or retain source, entered PR URLs or raw IPs as product analytics by default.

Any short-lived public-result cache is a disclosed optimisation keyed to an immutable public comparison, not an indefinite history archive. Curated published fixtures are distinct from visitor collection.

Optional product news/feedback consent is also separate from necessary billing/security/service communication and from repository-data consent.

## Qualification before collection

Exercise hostile/current/previous paths, patches/source, prose, credentials, configuration templates and provider errors across primary storage, logs, queues, exports and caches. Prove permitted metadata stays authorised and prohibited content is not retained.

Qualify duplicate/reordered observations, final comparisons, imports, policy replay, excluded paths, partial/bounded results, concurrent consent, funding replacement, preview reuse, OSS privatisation, scheduled downgrade/archive, access-loss grace, deletion/restore and open/closed/reopened brief behaviour.

Old pathless tests do not prove the expanded model. Documentation, schema, projection checks, deployed runtime and real user outcomes remain different evidence.
