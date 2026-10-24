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

Business delegation is inside GitHub visibility, and a delegate administers a repository only while their own GitHub access to it includes write. Protected aggregates/exports/saved views use the actual authorised population. The numeric/pathless post-access-loss exception remains narrow; subscription history or archive ownership does not authorise private filenames without current repository access.

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

The App's analytical and recalculation readers share `createPolicyResolver` with trusted preview: the verified repository installation supplies a repository-scoped Contents-read credential, the current default-branch head pins the file, and trusted repository policy overrides the applicable stored App layer and preset. Acquisition is reused within one request/invocation, never per historical row. A positively missing policy file permits fallback; a missing referenced template, failed settings/provider read or malformed policy does not. Analytical responses retain readable base facts and name unavailable interpretation, while recalculation preserves its progress and reports policy-resolution failure instead of `interpreted`. Successful job receipts retain their actual policy identity, source and trusted head, independently of later policy changes. These reads perform no policy adoption or repository effects.

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

**Source implementation (local, not deployed).** Stored App configuration may carry `brief` beside the repository policy layer: `mode` (`off` by default, `standard`, `advanced`), `modules`, `priority`, `historyWindowDays` and `finalSummary`. `standard` adds one App-owned rule, `diffdevil-brief`, as a final `app` policy layer whose body the engine's host-composition seam (`composeComments`) renders from the freshly evaluated report. It uses the ordinary owned upsert lifecycle, freshness checks and readback; its ownership is the expected App author, target, rule and host lifecycle `diffdevil-app-brief/1`, so a trusted policy change refreshes the same comment instead of starting another. Repository-authored comment rules keep the advanced route and suppress the standard brief. An identical render writes nothing; the history window ends at the next UTC midnight and live bodies print no evaluation time.

Premium context needs a Pro or Business plan for the repository and the joined premium provider (the App extension's `brief` part in the signed-in App's Worker; in the standalone Worker the alias `@diffdevil/premium-brief`, resolved to `premium/pr-brief/` or the Community stub `pr-brief-absent.mjs`). **Current same-file neighbours** are current operation, not history: each evaluation reads the repository's open PRs (most recently updated first, bounded to 50 file lists) and their current paths live, reduces them to the paths the effective policy includes, and stores nothing; any bound or unreadable PR makes the index partial and the headline non-totalizing. They need no history consent. **History-backed context** (basic median, file activity, Turnover, companion) needs history consent and reads only that repository's retained records. Every count is taken after the subject-repository filter.

History consent is re-asserted immediately before the brief is written. If it was withdrawn after the inputs were read, that write is refused and the brief is recomposed in the same delivery from fresh inputs, which no longer read history: the basic report, current neighbours and labels still land, and nothing history-backed is newly published. The check is not a transaction with GitHub: a withdrawal that lands after the check, while the write request is already on its way, cannot recall it. That accepted withdrawal enqueues its own settings refresh, which defers behind the execution lease the in-flight delivery holds and then recomposes that brief without history. A context failure degrades to the complete basic brief; it never blocks the size report or labels.

**Refresh of affected open briefs.** Each publication records, in its own owned-comment marker, the open PR numbers it described as sharing files (`n:7,12`, at most 100). A PR's own event then enqueues a `brief-refresh` for the union of the PRs its previous publication described and those it shares files with now; closing a PR enqueues the PRs its last brief described. A change that can alter every open brief enqueues one refresh of `open` PRs: merging a change to `.diffdevil.yml`, a direct default-branch push that touches it (or cannot show it did not, because it was forced or its commit list is incomplete), and an accepted settings, policy-layer or history-consent change in the admission service, which only enqueues the cause and makes no provider request. A merged PR's refresh and its push are keyed by the same commit, so they are one refresh. The push handler is source only: the App receives `push` only once its registration subscribes to it.

A refresh message names the PRs (at most 500) or `open`, never paths. A named refresh lists the open PRs, skips any named PR that has closed (it receives no write), and evaluates up to 20 of the rest per part. An `open` refresh walks every open PR in number order through GitHub's creation-ordered listing, beyond any listing bound: each part takes the next PRs above its cursor (`after`, the last PR it reached, with `page` as a resume hint that steps back when PRs closed below it), and PRs it reached but could not settle are `carried` into the next part and run first. Each PR is evaluated through the ordinary delivery path under its own delivery identity derived from the cause and its own execution lease, so a repeated cause is the same deliveries and a refresh never fans out further. The part shares one installation credential and one read of the open PRs and their current paths, so the neighbour index costs one read per part instead of one per brief. Whatever remains, including a PR whose lease another delivery holds, continues in the next part of the same cause; parts are not capped, so a chain ends only when every due PR has settled. With a healthy observed rate budget the next part follows at once, an unobserved budget spaces parts by 60 seconds, a deferred PR waits 90 seconds, and a part inside the rate reserve or hitting a rate limit stops and continues after GitHub's reset (at most one hour). A rate limit on the part's own reads continues the same part after an hour as its continuation, so pacing never spends the queue's retries towards the dead-letter queue; other part failures still retry through the queue. A repository without the standard brief selected refreshes nothing. A failed enqueue never fails the delivery that caused it; the affected brief then refreshes on its own next event.

**Provider cost.** One raw read of the open PRs and their paths costs 1–5 listing pages plus 1–3 file pages for each of the 51 most recently updated open PRs: about 52–160 reads. Within one queue invocation (up to ten messages), that read is reused for two minutes by every evaluation in the same repository, ordinary PR events included, and held only in memory with each policy's inclusion of those paths, evaluated once per policy and PR rather than once per subject. A refresh of all open briefs therefore costs about one index read per 20 briefs plus each brief's own evaluation; an `open` walk adds about one listing page per part. In the local qualification, refreshing 45 open briefs made 180 file-list reads (three index reads of 45 PRs, plus each brief's own analysis), where rebuilding the index per brief would have needed about 2,000. The App keeps 25% of the installation's observed hourly budget (`x-ratelimit-*`) for basic operation: inside that reserve an ordinary event skips the optional index (the brief keeps its recorded neighbours) and a refresh waits, so size labels, checks and the basic brief keep working.

**Invocation fit.** The App needs Workers Paid: one delivery issues more D1 queries than the Free plan's 50 per invocation. On Workers Paid one queue invocation may make 1,000 D1 queries and 10,000 subrequests, and D1 binds first. In local D1 qualification one 20-brief refresh part issued 643 D1 statements beside 446 GitHub requests, and a batch of two `open` parts, a neighbour part and seven ordinary events would have issued 1,385; one brief evaluation issued at most 36 statements (59 with history on, plus two entitlement reads in the signed-in App), an ordinary event at most 50 (88 with history collection). Past the D1 limit, D1 refuses every further query, so a delivery would stop between its provider effects and its records and every later message of the batch would fail with it. The consumer therefore counts each D1 statement of the invocation (each statement of a batch counts, the conservative reading), runs a batch's ordinary events and lifecycle changes before its refresh parts, starts a refresh evaluation only while 80 queries remain (above the largest evaluation measured), and starts a refresh part only while it can also claim, check and finish itself. A part that is stopped continues at once in the next invocation; a part that cannot start goes back to the queue unchanged and unclaimed. Ordinary events are not limited by this budget: they are the work the reserve protects. A history-on event's capture of the default branch's known file sizes, which had read and written every known path inside the event (one GitHub read and three D1 statements each, so one event with about 330 known paths overran), now runs as `history-capture` parts after basic operation: each part reads a path only while its write, its chunk's consent read and the part's finish still fit, writes each chunk of 100 as one batch, and continues the rest at once in the next invocation (or after GitHub's reset inside the rate reserve). With 400 known paths, one merge and two sibling events took 149 D1 statements in their own invocation, then 997 and 306 for their three captures; with 600 known paths and five events, the captures drained in four invocations of at most 997, with no refusal or retry. The cost is refresh throughput: about 30 brief evaluations per invocation, fewer with history on or beside many ordinary events. Draining that batch took 13 invocations of at most 941 D1 statements and 1,531 subrequests each, with no queue retry, and every chain ended. Plan, live limits, real batching and runtime CPU remain adoption facts to read back.

Closing stops every report write. With `finalSummary` on, a merged PR receives one terminal summary per final comparison through `reconcileHostComment`, deduplicated by occasion; a failure keeps its request/readback observations and terminal identity in the repair record. The check link targets the PR's checks tab; the App link appears only when `APP_ORIGIN` declares a served App. The admission service projects the brief route and expected writer. `previewBrief` (App route `POST /api/brief/preview`) resolves the effective trusted policy with a Contents-read installation credential (stored configuration, then `.diffdevil.yml` at the default branch head) and evaluates the synthetic fixture evidence through it, so bands, thresholds, exclusions and their explanation are that policy's own; without an observed policy it is labelled a design specimen and borrows no policy identity. It performs no write (`effects: 'none'`).

The per-path capture counts above describe the original bounded-capture
qualification. [D087](../DECISIONS.md#d087-share-unchanged-size-facts-while-retaining-every-observation)
shares the physical size facts while keeping every observation and the existing
per-path processing allowance. The [analytical storage contract](app-analytical-data.md)
owns its current representation, window reads, expiry and migration boundary.

## Shared commercial integration

The source consumer of this interface is [the Wirt commercial link contract](app-commercial-link.md): the customer-authorized link, signed projection receiver, ordered reports, unlink, organisation bindings and the entitlement adapter the analytical read service consumes.

The shared Works commercial service owns customer/payment identity, catalogue, authoritative quotes, invoices, recurring charge scheduling, tax, credits, refunds and payment reconciliation. diffdevil owns GitHub scope, funding links, repository selection and application entitlement. It does not maintain a competing invoice or tax engine. Commercial standing selects capability and never grants repository access.

The product needs an authenticated benefit projection with current plan, effective dates, cadence, add-on quantity, price protection and scheduled transitions. It may display a shared quote but cannot invent monetary state from a browser field or checkout redirect.

An upgrade starts a new full period and credits unused actually paid previous components. Existing add-ons reanchor with it. A mid-period additional organisation instead joins the existing renewal. [Management](../app-management.md#change-the-plan-with-one-understandable-bill) contains the exact examples.

Failed/uncertain changes preserve coherent existing paid standing and require reconciliation before retry. A payment end is not a whole-App stop: lower-plan eligible basic operation can continue. Expiring Business links become ordinary repository configuration where eligible.

The one-time preview and OSS grants are separately attributable benefits, not inferred payments. Reinstalling cannot reset preview eligibility; privatisation revokes OSS eligibility without implicitly deleting data.

## Sessions, publication and data exit

Preserve browser-bound OAuth state, server-side token custody, opaque sessions, mutation CSRF/Origin protection and current operation authorisation. Source checks do not prove live OAuth/cookies/migrations. No arbitrary new short session cap is introduced by this expansion.

Browser logout is separate from the [purpose-bound funding service connection](../dashboard-access.md#browser-access-and-the-funding-service-connection): an enabled connection with actually funded organisation standing keeps the same protected grant available for current authority checks. Independent disconnect removes that local grant and its sessions/artifacts without unbinding or ending payment, and stays off across ordinary sign-ins until explicit reconnect. Logout returns local connection standing for disclosure after its session is gone. Bind/reconnect/logout disclosures, the customer disconnect/reconnect path and historical restore of that preference remain required qualification before customer adoption.

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

The signed-in analytical App ([`apps/app/`](../../apps/app/README.md)) exists as source over this runtime, authorization service and D1, reading [the analytical data contract](app-analytical-data.md) in one joined Worker; it is locally qualified against a fixture and not deployed.

Qualify base and premium module composition, live admission/effects, lifecycle/final comparison, named-file privacy, excluded-data replay, funding replacement, actual repository-authorised reads, imports, provider pacing, linked updates, brief lifecycle, preview reuse, OSS/public-private changes and data ending/restore.

Shared quote/payment tests and actual platform integration prove different boundaries. Old pathless, canary and auth checks do not automatically qualify the expanded product.

This document performs no migration, history enablement, payment, deployment, dependency adoption or public-data publication. The six analytical destinations and shell are ratified for implementation; chart/cloud system co-design precedes Manage/subscription design. Complete user/operator journeys, renderer/algorithm qualification and exact operating configuration remain work under the selected product contract.
