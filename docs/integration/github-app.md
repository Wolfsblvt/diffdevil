# Managed GitHub App architecture

## Meaning

This joins the developing App's product and operating architecture. [Dashboard capabilities](../dashboard.md), [plans](../app-plans.md), [access](../dashboard-access.md), [management](../app-management.md) and [privacy/data](../PRIVACY-AND-DATA.md) own their respective contracts. [Direction](../DIRECTION.md) distinguishes selected behaviour, existing source and live evidence.

The detailed pre-expansion architecture remains byte-for-byte in [runtime v1](github-app-runtime-v1.md). Its ingress, credential, lease, recovery and source-evidence details remain useful. Its pathless-only and administrator-first assumptions are not current product requirements. Its existence does not implement the new capabilities.

## One engine and independently useful editions

CLI, library, Actions, extension and playground remain useful without an App subscription. The App shares their deterministic engine, reports, policy and effect boundaries rather than becoming a second analyser.

The public Community application supplies basic managed operation/history with operator-controlled resources. Additional commercial capabilities are composed separately. A Community build must work without private components or the official billing service. This is not a public third-party plugin platform or a promise of a stable extension API.

The ordinary application is activity-first for authorised readers. Repository/PR details and entitled historical file views connect to complete underlying observations. Settings, processing and subscription controls are separate operations. Entitlement should control actual server capabilities, not merely hide a browser button.

## Identity, reach, funding and permission

Preserve the relevant [runtime authorisation contract](github-app-runtime-v1.md#permissions-and-current-access) with the current access model. User session, installation token, GitHub repository permission, application role, purchased benefit and independent history consent remain separate facts.

Personal subscriptions can fund named organisation connections. One ordinary funder per organisation prevents stacked allowances; a funding replacement does not transfer data ownership or grant access. Add-ons inherit the parent's tier/cadence.

A repository's capabilities can come from its funded scope, a frozen preview or an OSS grant. Do not reduce eligibility to a global `user.isPro` field: a Free reader can legitimately view another repository's premium data.

Business delegation is inside GitHub visibility. Protected aggregates/exports/saved views use the actual authorised population. The numeric/pathless post-access-loss exception remains narrow; subscription history or archive ownership does not authorise private filenames without current repository access.

## Events, comparisons and trusted policy

The v1 supported ingress events/actions remain source evidence, not an implication that all new lifecycle events are handled. Add lifecycle, merge/reopen/close, repository selection/visibility and access transitions deliberately and qualify duplication, ordering and unknowns.

Final merged history uses one supported immutable comparison with actual merge evidence. Open development and current overlap remain separate. A last observed open head is not silently relabelled final. Supported merge/squash/rebase paths, truncated files and unavailable evidence need acquisition qualification.

Acquire `.diffdevil.yml` from the trusted operation revision. PR-head policy or code never chooses privileged writes. Preserve policy identity, current base/head freshness and inert processing from the existing runtime.

## Admission and configuration

Installation reach does not automatically select every repository for operation. Account management owns selected execution, independent history, labelling-only and inactive-over-limit states. Concurrent selections of a final limited slot need one coherent account result, not two successful overallocations.

App presets/defaults resolve below explicit repository overrides through the same shared resolver. Show configured/effective values and origins; an overridden bulk change is not an observed effective change.

Pro has one personal default and one per connected organisation, with repository-local application/differences only. Business adds linked named policies, delegation, automatic eligible setup and coordinated refresh. Neither hides or removes arbitrary valid repository policy.

History, publication and delegation are independently authorised even when automatic setup is selected. Once that selection is valid, otherwise eligible newly granted repositories need no repetitive manual approval loop.

Brief settings are bounded App configuration, not another portable policy language. Queue only work actually affected by a setting: shortness of a comment does not require years of blob acquisition. Audit is required for Business, not an initial rollback UI.

## Live execution and recovery

Preserve signed webhook admission, enabled-repository checks, scoped queue/lease ownership, stale-work refusal, delivery deduplication and uncertain-write reconciliation from [runtime v1](github-app-runtime-v1.md).

Analysis, policy result, intended effect, request and observed readback are distinct. Modify only declared labels and owned comments, preserving unrelated metadata. Do not repeat a non-idempotent successful provider effect merely because history storage failed.

Enabled eligible checks, size labels and size replies have priority and no monthly PR-credit cutoff. Provider-compliant account pacing may delay them. An import budget does not disable ordinary live work.

The seven-day recovery ledger is not permanent analytical history. Failed/dead-letter records cannot store source or retain it longer. Retried transport is not a new PR, measurement or chargeable import.

## History and premium enrichment

History-enabled Free stores permitted base paths/numerical file facts, including excluded observations, so compatible policy changes can replay without unnecessary GitHub reacquisition. Premium enrichment supplies additional numerical-size acquisition, historical file relationships and eligible views/context. Base row retention does not itself grant those capabilities.

Use explicit allowlisted projections rather than retaining whole reports. Contents/patches remain transient across primary/secondary stores, queues, logs, traces and exports. Record observed rename continuity, lifecycle, coverage and versions without inventing identity from equal path names.

General file/repository history is final merged-PR activity. Preserve the earlier statistics work's useful interval/sample/quantity semantics without claiming anonymous rows establish named trajectories. Current-policy replay changes a derived interpretation; original observations and provider effects remain immutable.

A query must identify its available policy basis while a manual or automatic refresh is pending. Imported PRs have no fictional original App result. No repository-wide parallel policy-era warehouse is selected.

## Progressive work and provider-aware scheduling

Separate live processing, recent historical enrichment, and older imports/wide recalculation. Background work can lag or be paused under sustained use; management shows actual coverage and reason. Do not promise an ETA or eventual catchup from a queue's existence.

Durable job state holds the selected scope, cursor/progress and work identity. The execution queue carries ready batches, not the only durable copy of a weeks-long import. Continuing work rechecks reach, selection, consent, benefit and deletion boundaries before committing.

Meter unique new historical-import work within its configured allowance. Duplicates and service recovery do not consume another customer unit. Preserve live/import logical identity and do not revive intentionally deleted intervals on upgrade or retry.

Respect actual GitHub retry/reset instructions from the first useful delivery. The later advanced adapter can observe installation/user resource buckets, retain budget/reset evidence and reserve headroom by staggering lower-priority reads before live writes need the capacity. Separate primary/secondary rate limits and content-generating effects; no plan overrides provider restrictions.

Open-PR scans establish current detail/overlap; historical imports establish prior final observations and recoverable lifecycle. Imports never apply retrospective GitHub effects.

## Selective brief

The optional deterministic brief joins the owned size report and links directly to PR detail. Premium context can use current same-file work and retained historical relationships. Ordinary size output remains available if enrichment is absent.

Refresh affected open PRs after own/neighbour/policy changes and reopening, only when meaningful content changes. Closed/merged replies are not continuously updated. Optional final merge summary is a distinct explicit event.

Modules, conditions, priorities and compactness are bounded settings. A renderer or an existing label routine does not define the relevance algorithm. Same-file volume is not overlapping lines or a conflict prediction. Public text must fit its audience independently of any protected link.

## Shared commercial integration

The shared Works commercial service owns customer/payment identity, catalogue, authoritative quotes, invoices, recurring charge scheduling, tax, credits, refunds and payment reconciliation. diffdevil owns GitHub scope, funding links, repository selection and application entitlement. It does not maintain a competing invoice or tax engine.

The product needs an authenticated benefit projection with current plan, effective dates, cadence, add-on quantity, price protection and scheduled transitions. It may display a shared quote but cannot invent monetary state from a browser field or checkout redirect.

An upgrade starts a new full period and credits unused actually paid previous components. Existing add-ons reanchor with it. A mid-period additional organisation instead joins the existing renewal. [Management](../app-management.md#change-the-plan-with-one-understandable-bill) contains the exact examples.

Failed/uncertain changes preserve coherent existing paid standing and require reconciliation before retry. A payment end is not a whole-App stop: lower-plan eligible basic operation can continue. Expiring Business links become ordinary repository configuration where eligible.

The one-time preview and OSS grants are separately attributable benefits, not inferred payments. Reinstalling cannot reset preview eligibility; privatisation revokes OSS eligibility without implicitly deleting data.

## Sessions, publication and data exit

Preserve browser-bound OAuth state, server-side token custody, opaque sessions, mutation CSRF/Origin protection and current operation authorisation. Source checks do not prove live OAuth/cookies/migrations. No arbitrary new short session cap is introduced by this expansion.

Protected responses are private and not share-cacheable. Tokens never enter chart payloads, URLs or browser storage by convenience.

Public analytics is an explicit anonymous projection for eligible public repositories with account default and repository override. Exclude settings, audit, billing, delegation and private siblings. Unpublish/privatisation invalidates serving and its applicable cache.

Financial downgrade, temporary processing pause, slot release, repository offboarding, installation removal and confirmed account deletion are distinct. A paused/inactive repository is not an implicit deletion request. Apply the [current retention/exit contract](../PRIVACY-AND-DATA.md#export-deletion-and-ending), including authorised export, selected-state archive, narrow numeric access-loss grace and restore-resistant deletion.

App documents and responses select an explicit `same-origin` referrer policy, and application diagnostics omit full private request URLs, query strings and full referrers. [Named-path request/navigation privacy](../PRIVACY-AND-DATA.md#named-paths-in-requests-and-navigation) owns disclosure and joined document/outbound-link qualification. A header-only endpoint check does not establish that journey.

## Provider and operator boundaries

Cloudflare Workers, Queues and D1 remain the first adapter. Confine credentials and platform queue/storage mechanics to it. Retain portable engine/application meaning, identity, data exit and Node consumers. Do not invent a generic provider platform or claim a second supported host from interface names.

The shared static-validator/engine requirement remains [the v1 prerequisite](github-app-runtime-v1.md#shared-engine-worker-prerequisite). No runtime evaluation of policy as JavaScript or hosted measurement fork is introduced.

A private operator view joins aggregate resource use, processing freshness and cash figures through existing commercial/operating sources. Keep actual amounts and estimates distinct, shared costs counted once, and agent access scoped. It does not require payment instruments or another provider-control console.

Optional product-news/feedback consent remains separate from necessary service communication and repository-data enablement.

## Qualification and held effects

Qualify base and premium module composition, live admission/effects, lifecycle/final comparison, named-file privacy, excluded-data replay, funding replacement, actual repository-authorised reads, imports, provider pacing, linked updates, brief lifecycle, preview reuse, OSS/public-private changes and data ending/restore.

Shared quote/payment tests and actual platform integration prove different boundaries. Old pathless, canary and auth checks do not automatically qualify the expanded product.

This document performs no migration, history enablement, payment, deployment, dependency adoption or public-data publication. The six analytical destinations and shell are ratified for implementation; chart/cloud system co-design precedes Manage/subscription design. Complete user/operator journeys, renderer/algorithm qualification and exact operating configuration remain work under the selected product contract.
