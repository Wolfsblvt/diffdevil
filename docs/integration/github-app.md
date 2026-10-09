# Managed GitHub App architecture

## Meaning

This document joins the selected managed-App product with its operating architecture. [Dashboard capabilities](../dashboard.md) and [accounts/access](../dashboard-access.md) own the expanded experience. [Direction](../DIRECTION.md) distinguishes source, canary/deployment evidence and public availability. The App remains an optional operating adapter for the same open diff-policy engine, not a second analyser or a required account funnel.

The detailed pre-expansion architecture is preserved byte-for-byte as [runtime v1](github-app-runtime-v1.md). Its narrow ingress, credential, lease, recovery and source-evidence details remain useful implementation references. Its pathless-only history and administrator-first product assumptions are superseded by the current dashboard/privacy/access contracts, not evidence that the new capability is implemented. The retained file is historical architecture evidence, not a competing current product specification.

## Product and adoption contract

CLI, library and Actions remain complete without an account; the extension remains a personal GitHub view; the public playground remains unauthenticated public learning. Managed operation adds shared checks, labels/owned comments, authoritative readback, configuration, history, context and coordination.

The ordinary App is activity-first. A collaborator may sign in and read currently accessible connected repository, PR and file views without administering an installation. Settings and recovery are separate permitted operations. Shared reports distinguish facts, desired actions, requests and observed effects.

Installation reach, execution consent and history consent are distinct. Neither installation nor a named preset silently enables history. An account may explicitly select automatic setup for newly reachable repositories, including permitted history/import behaviour, without repeatedly approving each otherwise eligible repository.

## Permissions and current access

Preserve the existing [runtime authorisation contract](github-app-runtime-v1.md#permissions-and-current-access) and apply the current [access model](../dashboard-access.md). A user session, App installation token, account membership and paid plan are different facts. Protected operations recheck current user/repository and App reach; background work rechecks current consent and configuration before committing data or effects.

Business delegation operates inside GitHub visibility. It cannot expose private repository analytics to a person without GitHub access or suppress independent native GitHub powers. Aggregates, exports, saved views and chart data use the same authorised population as the visible detail.

The existing narrowly authorised offboarding grace remains numeric/pathless without current repository access. Named history does not silently widen that exception or permit GitHub reacquisition after removal. [Privacy](../PRIVACY-AND-DATA.md#offboarding-transitions) owns the exact selected lifecycle.

## Events, immutable comparisons and trusted policy

The v1 runtime's supported ingress events and actions remain [its explicit source contract](github-app-runtime-v1.md); listing a new lifecycle feature here does not make that event handled. Expansion must add the needed PR lifecycle, merge/close/reopen, access/publication and new-repository observations deliberately and qualify ordering, duplication and gaps.

Final merged-PR history binds one recoverable comparison to immutable references and actual merge/lifecycle evidence. Open-PR trajectories and current file overlap remain separate populations. A last observed open head is not automatically a final merged comparison. Import must qualify supported merge methods and omitted/inaccessible evidence rather than manufacture certainty.

Repository-owned `.diffdevil.yml` is acquired from the trusted operation revision and remains authoritative over App defaults. PR-head policy and code never select privileged writes. Preserve immutable policy identity, current base/head freshness and inert processing boundaries from the runtime contract.

## Configuration, precedence and shared operation

App presets/account defaults supply settings below explicitly supplied repository overrides. The shared resolver owns merge/lowering semantics; do not add a host-specific engine. Show the selected configuration, effective values and provenance. A bulk update cannot claim to change an overridden value.

Pro administration provides per-scope defaults and manual per-repository application. Business adds linked configurations, delegation, account-wide automation and coordinated refresh. Personal accounts can use that capability; a GitHub organisation is not itself a subscription plan.

A linked update can queue selected current-policy history recalculation and eligible open-PR label/brief refresh. Dispatch only work affected by the change. Brief settings are App-only bounded configuration, not a new `.diffdevil.yml` or template engine. Existing portable comment templates and core policy retain their current support.

History consent, publication and delegated access have separate authority. Applying a configuration must not silently enable additional protected-data collection or publication. A starting rollback UI is not required; protected administrative audit preserves what actually changed.

## Execution, effects and recovery

Preserve the v1 signed-webhook admission, repository enablement, bounded queue/lease ownership, stale-work refusal, delivery deduplication and recovery ledger. The [retained runtime document](github-app-runtime-v1.md) contains their detailed operation ordering and source-evidence boundaries.

Analysis, policy result, desired effect, performed request and provider readback remain distinct. Manage only declared labels and owned comments; preserve unrelated metadata. Reconcile uncertain writes before retrying. History repair must not rerun a non-idempotent provider effect that already succeeded.

A transport retry, repeated analysis and new PR are different identities. Seven-day recovery does not grant permanent analytical retention. Failure or dead-letter payloads cannot become a richer or longer-lived source archive.

## Selective brief and current related work

The optional deterministic brief selects a compact useful subset of configured observations and links to PR detail. It shares the owned size report when enabled and uses a current open-PR file/component index for neighbouring work. Same-file counts do not claim line overlap or conflicts.

Refresh affected open PRs on own/neighbour/policy changes and reopening. Do not continuously update closed or merged replies. An explicit optional final merge summary is a separate event. Historical import has no authority to apply labels, publish comments or replay old summaries.

Bounded configuration controls modules, priorities, conditions and compactness. Algorithm research owns useful selection, sample treatment and noise limits; a chart dependency or current label routine does not settle those questions.

## Analytical storage and recalculation

[Privacy and data](../PRIVACY-AND-DATA.md) now selects named file metadata, lifecycle facts, numerical sizes/changes, immutable identity and coverage after explicit history enablement. Included and policy-excluded observations may be retained; ordinary analytics applies current policy. Source/file contents and patches remain transient, including in logs, queues and traces.

General file/repository analytics uses final merged-PR populations. Current policy recalculation changes derived views, not observed provider effects or underlying measurements. A PR may expose an actually recorded original result as a secondary interpretation. No repository-wide policy-era warehouse is required.

The older pathless projection and query work supplies only its documented semantics until expanded. It cannot produce cross-revision named trajectories or true lifecycle cohorts by relabelling anonymous rows. Preserve useful interval-aware statistics, sample counts, quantity compatibility and duplicate handling when joining richer data.

## Import and work priority

Provide distinct open-PR scans and historical imports. Imports are explicit, resumable, progressive and coverage-aware; recent ranges can become useful before the complete selected scope finishes. Live PR work takes priority. Adaptive pacing follows actual GitHub API constraints, not an assumed unlimited batch.

Deduplicate against live observations, avoid unnecessary reacquisition, and honour current authorisation, retention, opt-outs and deletion tombstones throughout. Unsupported old states remain unavailable. Import/recalculation has no implicit GitHub write authority. New import/storage costs require workload measurement; settled commercial terms are not reopened by that qualification.

## Dashboard authentication and sessions

The route-neutral authorisation source and its live-delivery qualification remain distinct. Preserve browser-bound OAuth state, server-side token custody, opaque sessions, mutation CSRF/Origin protection and current per-operation authorisation from [runtime v1](github-app-runtime-v1.md). A source test is not proof of live OAuth, cookies or deployed migrations.

No arbitrary short session cap is introduced by the dashboard expansion. Logout, invalidation and lost authority end the relevant access. Protected responses are private and not share-cacheable. Token material never enters chart payloads, URLs or browser storage by convenience.

App documents and responses select an explicit `same-origin` referrer policy, and application diagnostics omit full private request URLs, query strings and full referrers. [Named-path request/navigation privacy](../PRIVACY-AND-DATA.md#named-paths-in-requests-and-navigation) owns disclosure and joined document/outbound-link qualification. A header-only endpoint check does not establish that journey.

## Public read-only projection

Public analytical publication is a separate explicit projection with an account default and per-repository inherit/enabled/disabled. It is anonymous only for eligible public repositories. It excludes settings, audit, billing, delegated permissions and private sibling information. Unpublication/privatisation invalidates public serving and its caches.

A protected dashboard link does not make a posted PR brief private. All facts in a comment must fit the destination audience. Neither public publication nor Business delegation widens the App's GitHub grant.

## First operating adapter and portability

Cloudflare Workers, Queues and D1 remain the first operating adapter, with credential and queue/storage mechanics confined to that adapter. The current [v1 topology](github-app-runtime-v1.md#first-operating-adapter-and-portability) remains implementation evidence, not proof of an alternate deployment.

Keep the shared engine, application semantics, retention/deletion, identities and useful import/export independent of provider resource names. Self-hosting is intentional. Do not build a generic multi-provider platform or claim a second supported host from interface names alone. Actual data scale, provider limits and the richer workload need measurement before capacity is promised.

## Shared-engine Worker prerequisite

The portable static-validator/shared-engine prerequisite remains [the v1 contract](github-app-runtime-v1.md#shared-engine-worker-prerequisite). Node, Actions, playground and App must consume compatible shared meaning. No runtime expression JavaScript compilation or hosted-only measurement fork is introduced.

## Qualification and held effects

Qualification must cover new lifecycle/final-comparison acquisition, named-file privacy, ignored-data reinterpretation, current authority, delegated settings, imports, current-policy refresh, brief fan-out, open/closed/reopened behaviour, public/private transitions and restore-resistant deletion. Old pathless/auth/canary checks prove their narrower boundaries only.

This documentation grants no migration, history enablement, deployment, public view publication, billing, spend, App reconfiguration or dependency adoption. The six analytical destinations and shell are ratified for implementation; chart/cloud system co-design precedes Manage/subscription design. Renderer selection, remaining algorithms, capacity and the joined user journeys remain separate work toward the selected product.
