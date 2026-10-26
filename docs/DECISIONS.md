# diffdevil Decisions

## Meaning

This records product/repository choices whose rationale cannot be reconstructed cheaply from source. D044 preserves independent release families, D064–D073, D075–D077 and D080–D086 carry the ratified analytical and operating product, D074 preserves the extension persistence boundary, and D054–D063 carry the accepted edition, plan, funding and management settlement of 2026-10-02. D056 also carries the purpose-bound GitHub service-connection settlement of 2026-10-10. D078 and D079 carry the App's premium-interface permission and its App-family release channel of 2026-10-10. These are selected product direction, not evidence that billing, collection or the expanded dashboard is live.

The complete predecessor record is preserved byte-for-byte as [Decisions through D073](DECISIONS-through-d053.md), with its existing references to the complete D001–D043 record. Earlier headings remain below to preserve fragment destinations. A new decision supersedes only its named boundary; it does not erase the previous rationale or implementation evidence.

D089 carries the settled single-Wirt-target relationship and the distinction
between that selected environment model and an admitted live consumer. D090 makes
CI the ordinary publication route for the public family and Playground Worker.

[Plans](app-plans.md), [management](app-management.md), [dashboard](dashboard.md), [access](dashboard-access.md) and [privacy/data](PRIVACY-AND-DATA.md) own the joined maintained contracts. Private deliberation and owner transcripts are not part of this public record.

## D044: Version the tools people install, not the whole repository

**Status:** Settled by Wolf and Nyxara, 2026-09-30. Source adoption and qualification are distinct from publishing any release.

**Decision.** diffdevil remains one product family and one deterministic engine, with four release families. The public npm library/core, CLI, root and three sub-actions, and standalone runtime share the open-tool version. The browser extension, App server/dashboard together, and canonical Agent Skill each own an independent SemVer. The website, manual, Playground and internal packages do not gain public counters simply because they are separate directories or deployments. No family synchronizes major, minor or patch numbers for cosmetic consistency.

**Why.** Users install and operate these tools independently. A browser-layout fix should not force an unchanged npm package, Action, Skill or service release; a service fix should not wait for a Store publication. Version changes should communicate the affected consumer's contract rather than another surface's activity. The closely related CLI/library/Action/standalone family deliberately accepts bounded wrapper-only release churn. Product coherence comes from shared behavior, explicit contents, clear names and joined release communication, not matching integers.

**Rejected.** One mandatory version and publication wave for every tool; periodic major/minor catch-up; a global counter that publishes only changed tools but still creates unrelated version jumps; independent semantic implementations; and another public suite/marketing version. Matching version numbers would not make Store, registry and service rollout atomic or establish shared-engine parity.

**Consequences.** [Release families and versioning](RELEASING.md) is the canonical operational contract. Existing open-tool `vX.Y.Z` tags and Action `vMAJOR` aliases retain their meanings. Other exact release tags are `extension-vX.Y.Z`, `app-vX.Y.Z` and `skill-vX.Y.Z`. Update discovery and availability are family- and channel-specific, never the repository's unfiltered latest release. Every distribution identifies the actual engine and exact source/build it contains; a later checkout retaining an old package version must not masquerade as the published artifact. Compound Skill/runtime archives identify both components and their compatibility. Shared semantic, correctness and security changes are assessed and coordinated across affected consumers without forced unrelated publications. Public report, policy, language and metric contracts remain independently explicit.

**Presentation.** Name the installed surface beside its version; put engine/source detail in diagnostics. A lower extension number does not mean an outdated engine. Keep one joined product release history with labeled family entries and accurate channel availability. Do not invent releases or retroactively renumber the immutable `v1.0.0` artifacts.

**Supersession.** D002's universal version-together rationale is narrowed to the open-tool family. D014 and D029 still select one repository and joined product development; their references to a shared release lifecycle do not impose cross-family version or publication lockstep. The existing source/package/publication distinction in D016 and artifact-integrity boundary in D041 remain intact.

**Source.** Wolf's direct approval of the independent-family recommendation and instruction to author its durable guidance on 2026-09-30. The public contract is recorded here without reproducing the private design conversation. Reopen only for an actual change to an independently consumed boundary or concrete release/compatibility evidence, not unequal version numbers.

## D054: Separate Community from private premium application capabilities

**Decision.** Community supplies the complete basic application with operator-controlled repository, history and import limits. Additional privately maintained application capabilities supply rich file history and Business coordination. The public application works without them or a subscription. The open engine, CLI/API/Actions, extension and playground remain complete.

**Why.** A useful self-hosted edition and a paid additional software product can coexist. Hosting convenience alone need not carry the entire commercial proposition, and retaining a useful open engine does not require publishing every premium application.

**Superseded.** The future-facing all-application-source/full-feature-parity assumption in D014, D029 and D032. Existing public component licences and the one-engine semantic boundary remain. This decision does not relabel third-party source or implement a private package. No public extension store/API/compatibility promise is selected.

## D055: Sell basic history, file memory and coordinated operation as distinct plans

**Decision.** Free offers basic PR/repository history and managed operation. Pro adds historical file exploration, prominent clouds, Turnover, co-change and richer PR context. Business adds linked policies, automatic setup, delegation, coordinated refresh and administrative audit. Prices are €9/€90 Pro, €42/€400 Business and €9/€90 for each extra organisation, monthly/annual, as tax-inclusive consumer totals.

**Why.** A personal developer can buy codebase memory without paying for group coordination; a person or team can independently value Business operation. The free experience remains useful without giving away the entire paid product.

**Superseded.** Unselected €19/€59 and Team/Scale hypotheses, and ambiguity about whether “Individual” meant Free or paid. D069's reader/visibility meaning remains. No per-reader seat, per-PR fee or purchased processing credits are introduced.

## D056: Let an individual subscription fund named organisation scopes

**Decision.** An individual owns the subscription. Each paid plan includes one organisation connection; additional connections inherit its tier/cadence. One ordinary funder may support an organisation at a time, with owner/funder disconnection and agreed replacement. Free can connect one organisation within pooled three-private/ten-public-history allowances.

**Why.** One understandable personal purchase can support a personal estate and explicitly chosen organisations without multiplying paid readers or treating organisational records as the payer's property. One funder prevents colleagues stacking allowances.

**Consequences.** Pro personal repositories have no count ceiling; each Pro organisation has three private slots and otherwise the same Pro capabilities. Business organisations have no repo-count ceiling. Installation reach and repository selection remain explicit. Funding does not grant access or administrative rights. This settles D069's previously open purchase unit.

**Service-connection settlement (2026-10-10).** Keep the funder's same-scope protected GitHub connection while an enabled connection and actually funded organisation binding need current authority checks, independently of browser logout. Disclose retention at bind, explicit reconnect and logout and allow local disconnect without unbinding. Disconnect stays off across ordinary sign-ins until the owner deliberately reconnects; browser access is a separate purpose. Ending funded standing or removing the last binding purpose releases a sessionless grant to ordinary cleanup; actual revocation and expiry still withhold use. A restore hold preserves the last funded purpose for reconciliation, not an unconditional retention exemption. This supersedes the earlier unconditional final-session grant-deletion promise for this service purpose only.

**Why and rejected alternatives.** The selected organisation capability must remain usable for authorised collaborators without depending on the funder's dashboard presence. Keeping deletion at logout would turn that browser action into a funded-organisation interruption; adding GitHub App Members-read instead would select another provider-permission route. Neither alternative is selected. Automatically reconnecting service at ordinary sign-in would make a deliberate disconnect temporary and surprise someone returning only to browse; Wolf selected explicit reconnect instead. The retained grant changes no subscription, GitHub scope or repository authority. The customer disclosure/disconnect/reconnect journey still needs designed and qualified delivery before adoption; source behavior is not that delivery.

**Sources.** [Account/service-connection contract](dashboard-access.md#browser-access-and-the-funding-service-connection), [privacy boundary](PRIVACY-AND-DATA.md#distinct-purposes-and-lifetimes), and [executable revocation seam](integration/app-commercial-link.md#independent-github-connection-revocation).

## D057: Reserve shared policy coordination for Business

**Decision.** Pro has one configured default for personal repositories and one per connected organisation, with a repository-settings apply/difference action. It has no shared named-policy library, bulk application or global unsynchronised-repository hints. Business supplies linked named policies, defaults, automatic eligible setup and coordinated updates.

**Why.** A saved per-scope default supports deliberate manual use. A shared library with global drift and bulk application would already give away much of the coordinated product.

**Superseded.** D070's unrestricted Individual named-library assumption. Arbitrary valid repository-specific configuration, portable policy, trusted repository overrides and manual history replay remain. This is a hosted capability boundary, not a limit on the open engine.

## D058: Retain base file facts on Free for compatible policy replay

**Decision.** Every history-enabled tier, including Free, retains permitted paths and numerical per-file observations, including analytically excluded files. Free/Pro can manually recalculate a repository. Enriched historical file capabilities remain premium.

**Why.** Aggregate totals cannot answer a new arbitrary path exclusion after file facts are discarded. Retaining the base foundation avoids unnecessary GitHub reacquisition without granting every derived premium feature.

**Consequences.** No source contents/patches are retained. D065's data expansion and D067's current-policy interpretation remain; pending refreshes identify their actual displayed basis. A newly source-dependent metric still needs sufficient evidence. No fictional original results or policy-era warehouse.

## D059: Protect live operation and expose delayed historical work honestly

**Decision.** Eligible live checks, size labels and replies have priority and no monthly execution-credit cutoff. Imports, enrichment and broad recalculation may lag/pause with visible coverage. Free import can capture up to 100 recent PRs per selected repository; monthly import amounts remain explicit launch configuration.

**Why.** Background workload should not turn ordinary PR use into a microtransaction or break the core workflow. Provider limits and actual service pressure still need honest pacing.

**Consequences.** No bills for duplicates/recovery and no purchased credits. Durable continuation is separate from execution-message lifetime. Advanced provider-budget headroom can arrive later, but rate-limit compliance cannot. This settles D071's allowance direction without inventing numeric monthly budgets or a completion guarantee.

## D060: Make previews and Open Source support repository-scoped grants

**Decision.** One stable GitHub account can capture a one-repository premium snapshot of up to 100 past PRs once. It stays explorable but frozen, with no continuing premium updates. A manual OSS grant provides premium repository statistics/backfill and local-policy auto-refresh outside ordinary limits, without cross-repository linking by itself.

**Why.** A real sample demonstrates file memory without permanently giving every one-repository user the paid service. Repository grants support public community projects without another commercial tier or reader invoice.

**Consequences.** Reinstall cannot reset preview eligibility. Partial capture resumes the same attempt. Privatisation revokes OSS eligibility/public serving but is not deletion. Normal sufficient paid entitlement may continue independently.

## D061: Keep upgrades and add-ons on a coherent shared billing route

**Decision.** Upgrade starts a new full period, crediting unused actual old paid components and reanchoring existing add-ons. Adding an organisation mid-period preserves the existing renewal and charges only its remaining fraction. The shared billing service owns quotes, tax, invoices, credits and payment reconciliation; diffdevil consumes authenticated benefit state.

**Why.** A single recurring date/total is understandable, while unused paid service receives a fair credit. The two operations need different proration rather than one ambiguous label or a second product-local billing engine.

**Examples.** Halfway through a synthetic €9 thirty-day Pro month, a new €42 Business month costs €37.50. Adding a €9 organisation on day ten costs €6 now and joins the original renewal. Annual credit uses discounted actual paid value and actual time. Pending/uncertain payment is not completed entitlement.

## D062: Honour paid terms, preserve data exit and protect early prices

**Decision.** Downgrades/removals take effect at paid-term end. Premium views/processing then stop while eligible basic operation and authorised export/deletion remain. Selected frozen state follows the disclosed shared archive/recovery policy. Paid beta prices are protected during beta and at least twelve months afterwards for continuous subscribers, with paid periods honoured in full.

**Why.** Ending a paid feature should not erase records during payment retry or require repurchase to export them. Finite early-price protection rewards initial customers without an unmeasured lifetime promise.

**Superseded.** The old financial-entitlement thirty-day destruction assumption in D036, not its stricter provider-access-loss, explicit deletion or numeric/pathless grace boundaries. A pause/allowance release is not itself destructive repository offboarding. Restored payment cannot bypass GitHub authority or resurrect deliberate deletion.

## D063: Make customer and operator management part of the App

**Decision.** The activity-first experience is joined by scoped repository/organisation selection, processing coverage, subscription and ending views. A separate private operator/agent-supported view explains real service consumption, commercial receipts and cash costs. Optional product news/feedback consent remains separate from necessary service messages.

**Why.** Users need to know what is operating, waiting or funded without becoming service operators. The service owner needs actual evidence of cost and failure rather than an assumed model. Administration supports the product; it does not replace its analytical entrance.

**Boundaries.** Read/access and money-moving authority remain separate. Reuse shared billing/operations rather than duplicating a finance system. No contributor surveillance, raw payment-instrument exposure, private source storage or blanket marketing enrolment is selected.

## D064: Make the App activity-first for collaborators as well as administrators

**Status:** Selected product direction, 2026-10-01; implementation remains separate.

**Decision.** The signed-in home presents authorised repository activity. Repository, PR and file details are first-class analytical destinations. Administration is a separate capability, not the entrance everyone must use. PR lifecycle/development and file activity receive equal treatment.

**Why.** A collaborator who never configures an installation still benefits from its accumulated repository context. The optional PR brief needs a complete detail destination, and a file cloud needs somewhere useful to lead. An administrator-first control room would subordinate the product's daily value to setup and recovery.

**Superseded.** The earlier control-room-first hierarchy as the permanent dashboard experience. Operational attention and configuration remain selected, but support the analytical entrance. The 2026-10-09 ratification releases Overview, Pull requests, History, Files, PR detail and File detail with the dark even-grid App shell, fixed existing header and side navigation. Both surface and trailing action read App. Useful Free panels, premium panel chips and namespace-versus-viewer entitlement presentation preserve daily value without giant blockers. Exact chart/cloud rendering remains provisional; its co-design comes first, then Manage/subscription design. The synthetic reference is not production source or an authenticated journey.

## D065: Retain named file measurements and PR lifecycle without storing source

**Status:** Selected, 2026-10-01; old pathless source is not upgraded by this decision.

**Decision.** After explicit history enablement, retain repository names, filenames, relative paths, numerical file measurements, comparison identity, observed rename continuity and PR lifecycle facts. Retain permitted measurements for policy-excluded files while excluding them from ordinary analytics. File contents and patches may be processed transiently, then discarded, including from incidental logs, queues and caches.

**Why.** Useful file frequency, Turnover, co-change, detail views and policy reinterpretation require durable file identity and lifecycle. The old within-analysis anonymous rows cannot provide these outcomes. A blanket pathless boundary would make an implementation shortcut the product ceiling.

**Superseded.** D034's pathless-only/no-filename restriction and its prohibition on durable file identity, and the corresponding former Vision/privacy wording. D034's separate recovery/history consent and D036's deletion/offboarding protections remain. Named history does not silently widen the old numeric-only post-access-loss grace exception.

**Rejected.** Retaining source, contributor-performance dimensions or complete reports; treating filenames as anonymous; installation automatically enabling history; or making a filename-free mode a prerequisite to useful first delivery. A future opt-out must disclose missing historical coverage.

**Joined request/navigation consequence, 2026-10-09.** Named paths can occur in authenticated URLs and local browser history. App documents/responses select explicit `same-origin` referrer policy, excluding path/query cross-origin while retaining same-origin consumers. Diagnostics omit full private URLs, query strings and full referrers while retaining bounded operation/status/failure facts. Qualify the actual document and outbound-link route; no live leak or current logging qualification is inferred. [Privacy/data](PRIVACY-AND-DATA.md#named-paths-in-requests-and-navigation) owns the disclosure. This preserves useful queries and drill-down rather than treating a provider default or endpoint-only check as complete protection.

## D066: Use final merged comparisons for general file activity and explicit metric names

**Decision.** General file/repository history uses one final recoverable comparison per merged PR. Open PR development and revisions remain a separate subject. Change frequency, volume, growth/shrinkage, concentration and Turnover are distinct metrics. Prominent word clouds default to distinct merged-PR change frequency. Turnover is displayed as a multiple, with a short explanation and a separately specified calculation contract.

**Why.** The selected population is understandable and avoids counting every evolving snapshot as delivered change. Frequency provides a useful cloud without making file size the automatic dominant signal. Concise names support reading; exhaustive wording belongs in details and documentation.

**Superseded.** `latest-observed-in-window` as the permanent product-wide baseline once actual lifecycle/final-comparison evidence exists. That remains an honest name for older source data and must not be relabelled as merged history. Direct pushes and general branch-throughput collection are not added to the starting scope.

**Joined calculation decision, 2026-10-09.** **turnover-v1 is adopted:** replacement-aware Changed in the selected period divided by the file's time-weighted average size during that period, displayed as a multiple such as `1.8×`. Its brief explanation remains **Change volume relative to file size**; it is not the percentage of unique lines rewritten and may exceed one. Bounded Changed produces a Turnover range. A file created or deleted during the period shows `n/a` with that reason. Zero-size, binary or unavailable size evidence must state applicability rather than yield infinity or an invented denominator. This file definition does not invent a repository-level denominator. The selected denominator accounts for changing file size over the period rather than silently using its endpoint size. This supersedes only the open file-level denominator above. Final-comparison acquisition, renamed-file continuity and applicability still require qualification; the older analysis-time population remains honestly named. No unique-lines, hotness or quality claim follows.

## D067: Reinterpret history with current policy instead of multiplying policy-era dashboards

**Decision.** Ordinary analytics uses current effective policy over retained measurements. A PR detail may additionally show its actually recorded original merge-time result with an understandable switch when it differs. Repository-owned trusted `.diffdevil.yml` keeps precedence over App defaults, with visible origins and overrides.

**Why.** Users need the current view of repository activity, not a parallel repository-wide dashboard for every previous policy. Retaining excluded measurements enables honest reinterpretation without treating a filter as irreversible data loss.

**Rejected.** Overwriting historical provider actions, inventing an original result for imported PRs, reversing repository precedence, or building rollback and whole-repository policy time travel as prerequisites. Unsupported source-dependent recalculation reports its limitation.

## D068: Make the optional PR brief selective, deterministic and lifecycle-aware

**Decision.** A bounded configurable brief selects useful context, joins the existing owned size comment when enabled and links to full PR detail. Settings choose modules, priorities, conditions and compactness without an LLM or new template engine. Refresh affected open PRs on own, neighbour and policy changes and after reopening. Do not keep updating closed replies. A separate optional final summary may be posted on merge.

**Why.** Repository memory is most useful when it informs the next PR without requiring another dashboard visit. A short selection is more useful than an exhaustive statistics dump. Current same-file work and historical companions supply context without diagnosing conflicts or instructing people to edit files.

**Boundaries.** Same-file change counts are not overlapping-line counts. Brief settings are App-only, not new `.diffdevil.yml` fields. Historical import never writes old PR labels/comments. Public brief text obeys the PR audience independently of its dashboard link.

## D069: Derive visibility from GitHub and sell coordination rather than reader seats

**Decision.** Anyone may sign in. Current collaborators can read the capabilities available for their connected repositories without their own subscription. GitHub visibility remains the ceiling; Team cannot grant access to otherwise inaccessible private repositories. Individual administration is manual with complete useful analytics. Team adds delegation, linked shared policy, coordinated refresh, account-wide automation and an administrative audit.

**Why.** The reader and the administrator are different users of the same product. Charging for repeated coordination avoided is a coherent value proposition; withholding useful analytics or billing every reader would work against adoption.

**Consequences.** Personal GitHub accounts may use Team, including a solo maintainer. Account defaults stay account-scoped. Native GitHub powers remain outside diffdevil's permission controls. A protected aggregate includes only repositories its reader may access. Per-member/seat billing is not selected; the commercial settlement in D055/D056 now owns the subscription unit and tier names.

## D070: Give linked policies and automatic setup a real Team consequence

**Decision.** Individual uses named/default configurations through deliberate per-repository application and difference inspection. Team may link repositories to shared settings, propagate edits, queue selected current-policy recalculation and refresh open labels/briefs. Explicit account automation can configure newly reachable repositories and start selected history/import behaviour. Both personal and organisation accounts support the applicable model.

**Why.** Team buys operational leverage even when one person runs many repositories. A reused copy only saves initial setup; a maintained link removes recurring coordination. Automation should perform the selected setup rather than recreate the same manual confirmation on every repository.

**Boundaries.** Automation follows real GitHub App reach. Policy choice does not silently grant history collection, publication or permissions. Individual retains the same underlying analytical and manual operating capabilities. No rollback feature is required by this decision.

**Later settlement.** D057 narrows Pro to per-scope defaults and reserves named linked policies and coordinated operation for Business. That explicitly supersedes the original Individual named-library assumption without changing this decision's reason for maintained links.

## D071: Import recoverable history without replaying effects

**Decision.** Support explicit open-PR scans and progressive, resumable historical imports of all recoverable selected statistics. Recent results can become useful while a larger import continues; live PR work has priority. Imported and live observations deduplicate. Imported final facts do not invent vanished intermediate states or original App results.

**Why.** Existing repositories should obtain useful context without waiting months. Calendar age alone does not measure acquisition work, so allowances need workload evidence rather than an assumed cost per month.

**Boundaries.** No retroactive replies or labels, no implicit resurrection of deleted/disabled ranges, no completion-time guarantee and no new quotas in this decision. Revised free/paid import capacity and cost belong to pricing co-design.

## D072: Publish an explicit anonymous analytical projection for public repositories

**Decision.** An account has a boolean publication default and repositories use inherit/enabled/disabled. Only public GitHub repositories are eligible. Publication is explicit and the resulting read-only analytical view requires no account. Unpublication or repository privatisation stops serving it.

**Why.** A public cloud and file/PR context can help people explore an open-source codebase. Requiring sign-in for intentionally public data adds friction without changing the intended audience.

**Boundaries.** The public view is not an unlocked administrator session. It excludes settings, audit, members' administrative rights, billing and private sibling facts. A public repository is not automatically published. Previously copied public data cannot be recalled from readers.

## D073: Research relationship selection and chart rendering as different problems

**Decision.** Co-change and selective-brief relevance require deterministic algorithm design with sample, background-frequency, broad-change and tiny-edit treatment. Renderer research separately selects maintained charts/word-cloud/relationship tooling supporting filtering, switching metrics, linked exploration and accessible evidence. Owner-led design determines the final compositions.

**Why.** A rendering library does not decide which observation is useful, and a pair-count algorithm does not choose a usable interactive chart. Keeping the questions distinct prevents a convenient library or a first scoring idea from becoming accidental product meaning.

**Open.** Sub-five-line downweighting, broad-change exclusion and other thresholds are hypotheses, not accepted formulas. Earlier renderer recommendations are evidence to reassess against the expanded capability, not a preselected answer. No new dependency is adopted by this record.

## D074: Persist the browser extension's facts, not its views, and bound automatic work rather than inspection

**Status:** Direction by Wolf ("Keep the PR data, because it's genuinely tiny. Provide a purge option in the extension settings, and a max file limit."), product contract by Nyxara in the #542 room, implemented by the extension continuity candidate. Not a release.

**Decision.** The extension persists the canonical normalized report with its coverage, trusted policy evidence and a last-confirmed-comparison pointer, and recomputes every presentation and effective-policy projection from them under the settings in force. The configurable automatic file limit bounds automatic whole-PR acquisition and analysis only: files near the viewport first, then provider order, with scrolling spending the same number and an explicit act measuring the rest. The aggregate stays bounded until files are measured, the report always shows measured, bounded, provider-declined and total, and nothing is extrapolated from a subset. Pause is a local per-repository state, separate from clearing data.

**Why.** A decorated DOM or view packet would duplicate the cache for every theme and policy change and would resurrect old presentation after a restart; the report is the only fact worth keeping, and it costs about 0.8 KB per file. A file order is not a statistical sample, so a limit that extrapolated would invent evidence, and a limit that made later files permanently unanalysable would make the reader's own file a blind spot. Stopping work is not forgetting data, so pause and clear stay different requests.

**Rejected.** Serializing the decorated view; extrapolating from the analysed subset; a limit on what the reader may open; deleting data when pausing; a consent step for first use, because installation and Chrome's permission grant already selected the local capability.

**Reconsider when.** An App-delivered report becomes a second source for the same comparison, or measured use shows the default of 150 is the wrong cut.

## D075: The App is a complete Community application with the paid implementations joined through two seams

**Status:** Source separation of the analytical App, 2026-10-10; implements the owner's packaging disposition (split application capability, not facts or honesty). Not a decision about where the premium source lives, how it is licensed, or when anything is published.

**Decision.** Public source carries the engine, the contracts and quantitative definitions (including turnover-v1 and its evidence rules), base-observation collection, authorization, the plan and entitlement contracts, the App shell, the six routes, the Pull requests, Overview, History and PR detail common panels, and truthful Free and unavailable states. The paid implementations (per-file aggregation, the read-time size observation, co-change, and the Files, File detail and premium panel bodies) live under `premium/`, a subtree that joins through exactly two seams: an optional `premium` argument of `createAnalyticalDataService`, and an optional extension the App build resolves from `@diffdevil/premium-app`. Without the extension the App builds, runs and says so; an entitled reader of a Community build is told file history is not part of the build rather than shown an empty result.

**Why.** The complete paid product must not ship publicly as dormant code whose only missing ingredient is an entitlement check, and Community must stay independently operable. The seams are one object and one build alias, not a plugin platform: no discovery, registry or lifecycle exists to maintain.

**Rejected.** Keeping the premium bodies in public pages behind `if (plan)` (the disclosure the disposition forbids); a runtime-discovered plugin system (machinery with no second consumer); making the extension a separate package now (a private home is not authorized); moving the turnover-v1 definition private (a reusable definition does not become private because a paid view consumes it).

**Consequences.** `DIFFDEVIL_PREMIUM=off` builds the Community edition from the full tree, and a tree without `premium/` builds it by default; `artifacts/app/edition.json` records which was built so qualification asserts the right journeys. The extension's tests, charts, styles and browser journeys travel with it. Whether the current history of a public branch can carry the premium bytes is a custody question for the maintainers, not settled here.

**Sources.** The packaging disposition, the classified join, the selected option (a), #788.

## D076: The standard PR brief is a host-composed owned comment with its own lifecycle identity

**Status:** Implementation of the Wolf-ratified `pr-brief-r4.1` message, 2026-10-10; source only. Not a deployment, live writer, control layout or decision about where premium source lives. (D075 is the concurrent Community/premium separation.)

**Decision.** The standard brief joins the managed App as one App-owned rule, `diffdevil-brief`, added in a final `app` policy layer only when the stored `brief.mode` is `standard` and the trusted policy has no repository-authored comment rules; those keep the existing advanced route. The engine's `applyGitHubPolicy` takes host-composed bodies (`composeComments`) rendered from the freshly evaluated report and plan, and otherwise applies the ordinary owned-comment upsert, freshness, readback and observation rules. A host-composed rule is owned by expected author, target, rule and host lifecycle identity (`diffdevil-app-brief/1`) rather than policy ID. The optional final summary is a separate terminal host comment, written once per final comparison through `reconcileHostComment`. The Community composer and preview live in `apps/shared/pr-brief/`; premium context joins through one versioned provider object and the build alias `@diffdevil/premium-brief`.

**Why.** The ratified lifecycle refreshes the one owned report after policy and brief changes. Policy-ID ownership would start a second comment on every trusted policy edit and orphan the first. The brief needs the evaluated report, so it cannot be a template written before evaluation, and the portable template language is not to grow into a second message language. Keeping the engine as the only writer preserves one freshness, readback and repair contract.

**Rejected.** Rendering the brief through portable templates; a separate App writer beside the engine; policy-bound ownership for the brief; printing evaluation times into live bodies, which would make identical facts write on every event; a model-generated summary.

**Consequences.** The engine's public API gains additive options and exports; existing template rules, modes and triggers are unchanged, and a template comment and a host comment never adopt each other. Selection gates and control vocabulary are qualified engineering defaults recorded with their reasons in the [PR brief errata](../packages/design/pr-brief/ERRATA.md), not owner-ratified settings.

**Repair (2026-10-10, after the bounded cold review in #790).** Current same-file neighbours are a live per-evaluation read of open PRs and their current paths, available to an eligible repository without history consent; retained analyses are history and never stand in for the current index. A host-composed comment may record a bounded identifier context in its own owned marker, and `beforeWrite` receives the pending write: the brief records the open PRs it described and refreshes them through ordinary `brief-refresh` queue deliveries, and its write re-asserts the history consent its body relied on. Rejected: a separate operational index table (new persistent path storage and migration for a fact the provider and the owned comment already carry); fanning out to every open PR on each event (unbounded provider reads); failing or retrying the whole delivery on a consent withdrawal (it would hold the basic report and labels hostage to an unrelated permission). The preview evaluates synthetic evidence through the observed effective policy rather than presenting the design's policy under its identity.

**Repair (2026-10-10, refresh cost, #790).** A refresh rebuilt the full neighbour index for every refreshed brief: about 51–155 reads each, up to 100 times for one settings change, which could spend an installation's hourly GitHub budget and stall size labels on every repository it serves. One raw read of the open PRs and their paths now answers every evaluation that needs it in the same queue invocation (each subject excludes itself and applies its own policy). A refresh names its PRs, or every open PR, and runs in parts of 20 that share that read; the rest continue in the next part, so nothing is silently dropped beyond a bound. Parts pace themselves by the observed rate budget and stop inside a 25% reserve, as the ordinary index read does, so the basic size report keeps its budget. A direct default-branch push that may change `.diffdevil.yml` is a policy refresh keyed by its commit, which a merged PR's merge commit shares. Rejected: carrying the index in queue messages or D1 (it would persist another PR's paths only to save reads); a cache service or scheduler; refreshing only the first 100 open PRs. The history guard runs immediately before the brief's write; a request already sent cannot be withdrawn, and the withdrawal's own settings refresh recomposes that brief after the lease it holds.

**Repair (2026-10-10, refresh continuation and invocation fit, #790).** The cost repair still left two silent losses: an `open` refresh reached only the 500 most recently updated open PRs, and a chain ended after 100 parts even while pacing or a held lease was the only reason PRs remained. Both left older or deferred briefs to wait for an unrelated event. An `open` refresh now walks every open PR in number order with a cursor of PR numbers (the last one reached, a listing page, and reached PRs carried for another attempt), and parts are not capped: a chain ends when every due PR has settled. A rate limit on a part's own reads continues the part as its continuation instead of spending the queue's retries. Separately, one queue invocation on Workers Paid may make 1,000 D1 queries; a 20-brief part alone issued 643 and a realistic batch of refresh parts and ordinary events 1,385 in local D1 qualification, past which D1 refuses every query and the rest of the batch fails mid-delivery. The consumer now counts the invocation's D1 statements, runs ordinary events first, and starts refresh evaluations only inside a measured reserve; what does not fit continues at once in the next invocation. Each policy's inclusion of the shared index's paths is now evaluated once per policy and PR, which had been about 90% of a part's CPU time. Rejected: a part cap or deferral count that abandons briefs (pacing would become loss); forcing a queue batch size of 1 (one 20-brief part alone issues about 640–720 statements without history, so it leaves little margin, and it would serialize ordinary events too); a scheduler or job table for refresh state (the cursor fits in the message); raising live Worker limits (not granted, and D1's per-invocation limit is fixed by plan).

**Repair (2026-10-10, history size capture in parts, #790).** One ordinary event in a repository with history on still had no bound: after its record published, the delivery read the default-branch size of every text path the retained records know and wrote each with its own consent read, about one GitHub read and three D1 statements per path. In local D1 qualification with refusal past 1,000 statements, one event whose history knew 600 paths, or two events with 300, ran out mid-capture; the whole batch was retried, its sibling events lost their labels and checks, and each retry overran again. A published record now enqueues a `history-capture` part instead, which runs after basic operation like a refresh part. The first part pins the branch revision and its start time; each part captures, in chunks of 100 bracketed by branch reads and written as one batch under one consent read, the known paths still lacking an observation at that revision since the start, and continues the rest as its next part: at once when the D1 allowance stopped it, after the reset when the rate reserve did. A part that runs again therefore repeats nothing. A size already retained at the same immutable revision is reused rather than read again. A moved branch or an unavailable read ends the chain with the PR's analytical repair, as the whole capture did, keeping the sizes already observed. Withdrawal stops it without writing. Rejected: truncating or sampling large repositories; capping parts; carrying paths or an offset in queue messages (paths stay out of the queue, and an offset into a changing list could skip a path); a capture job table; restarting at a newer revision, which a busy branch could chase forever while the newer merge's own capture already covers it.

**Sources.** #790, the ratified design Return, the accepted consequence, [the PR brief design source](../packages/design/pr-brief/README.md).

## D077: Charts are one authored readout frame over ECharts, with d3-cloud packing the cloud

**Status:** Chart and cloud system accepted by the owner on 2026-10-10 and implemented in the signed-in App; not a deployment or a plan change.

**Decision.** Every analytical chart in the App is one frame (`packages/design/chart-grammar-v1.1.md`, Surface Grammar v1.1's chart section): panel header, a fixed-geometry readout (66 px: 20 px for what is focused and its tags, 40 px for values that never wrap), the plot, a teach line and an equivalent table. The readout is legend, tooltip and keyboard announcement at once; there is no floating tooltip anywhere. Hover or arrow keys focus, click or Enter pins (magenta is selection and focus only), Enter again drills, Escape clears; charts over the same buckets share hover and selection. The accepted recipes are the mosaic (Change volume, also per merged PR with the file-size strip), pull-request flow as paired bars with the net written above, the backlog as a white step line and a range strip, time to merge by size on a log axis with a visible ruler, the size mix and lifecycle in one row grammar (Unknown outside the shares, stage medians never summed), growth and shrinkage, concentration, the size lanes, the Turnover map whose diagonals are Turnover values, development over size zones, recent activity on a PR's files, meter rows for co-change, and the hero line. The cloud is concept A: d3-cloud packs with steered spiral starts so words glide and the layout is deterministic, a binary-search fit fills the stage, two-run labels and the composition underline are rasterised into the collision sprite, a docked readout replaces the lens, partners light as fixed-width meter chips, `by folder`/`by repository` arranges treemap cells, and Top opens as a real column. Packing runs in a Worker over an OffscreenCanvas with the App's own fonts, with a main-thread fallback. The page compositions changed where better charts needed it: a full-width cloud and compact Change volume on the Pro Overview, lifecycle moved to Pull requests, the Turnover map replaced the high-turnover list and hotspot rail, Merged PRs by size on Pro History too, the Files toolbar's metric moved into the cloud panel, and meter rows replaced the donut rings and the orbit. `unknown` never renders as `0`; partial coverage renders `≥`. Loading answers at once (skeletons in each chart's shape, charts mounting one per frame under a page line, busy pills for slow switches); motion explains state (first draw out of the skeleton, a 620 ms in-place morph on period change, one sliding thumb per switch) and `prefers-reduced-motion` removes all of it. ECharts 6.1 (SVG renderer, one theme, custom series) is the general renderer and d3-cloud 1.2.9 the one bounded specialist; the App owns readouts, chips, skeletons and busy states as HTML.

**Why.** The owner's direction, exactly: usable, modern and still pretty charts; no floating tooltip, because it hid the cloud and the word under the pointer; charts that stay the same height whatever is hovered or selected; a visible answer to "how long does it usually take, and for what size?"; a visible indication that the time axis is not linear; equal-width partner chips so the scale is visible; a Top column that uses real space rather than an overlay; Change volume and Merged PRs by size kept on Pro; and "no confetti movements, but animations look modern and flexible". Readouts beside the plot keep the geometry contract that tooltips cannot, and let keyboard, pointer and screen reader share one text. A Worker keeps the packing (several packs per fit, about 0.4 s on the main thread in the prototype) from freezing the page while the busy state stays honest. Server-rendered readouts and tables from the same model keep the no-script view and the drawn chart from disagreeing. ECharts's custom series lets marks be authored rather than defaults; d3-cloud's call-order randomness is what makes steering possible, so it is pinned.

**Rejected.** Cloud concepts B as primary (islands) and C (a ranked index); the floating delayed lens and the F2 tooltip frame; mirrored flow; time to merge as dots on a log axis or as aligned lengths; the pinned legend rail and the overlay drawer; donut rings and the co-change orbit; keeping PR #79's provisional SVG figures or adopting chart-library defaults; a client-side router for the whole App merely to morph on period change (the period switch, bucket pick and card selection fetch the next page and carry the live chart nodes across instead).

**Consequences.** `packages/design/chart-grammar-v1.1.md` and `tokens-chart-v1.1.css` are the continuing authority; the prototype and the private Artifact are evidence. The App builds one JSON model per chart on the server (`apps/app/src/lib/charts/`), renders the frame from it and draws it in the browser (`apps/app/src/client/charts/`). Under D075 the premium file charts (growth and shrinkage, concentration, the Turnover map, recent file activity) and the cloud are the premium extension's (`premium/app/lib/charts/`, `premium/app/client/`): they draw in the public frame by registering their readouts and recipes, so a Community build carries the frame, the common charts and their grammar but no premium chart module. Open intervals read `≥ a` everywhere, medians are interval-aware over exact and bounded values alike (the size mix uses the period tiles' median, Turnover one interval median for the map and the cloud), the Turnover map ranks by proven Turnover and says when another file could be higher, and the cloud's co-change partners come from the analytical service's one direction-correct derivation (`together / subjectPullRequests` over the selected period), named whether or not they are drawn. `echarts` and `d3-cloud` are development dependencies bundled into the App's browser assets; the CSP allows the same-origin layout Worker. Keyboard moves and pins are announced through a live region; pointer movement is not. The accepted recipes are qualified at desktop width in the dark theme against the synthetic fixture (including a denser pass); real repository distributions, screen readers, narrow screens and the light theme remain explicitly open, and the chart tokens name provisional light values for that occasion. Concentration over time is computed per History bucket from the window's contributions (the prototype's trailing-four-week reading needs data before the window, which the surface does not carry); the flow strip spans the 13-week context the surface carries, not a longer history.

**Sources.** The chart handoff, its acceptance, the implementation Work and [D073](#d073-research-relationship-selection-and-chart-rendering-as-different-problems), whose renderer question this settles for the App.

## D078: Let independent premium modules join the AGPL App through two named interfaces

**Status:** Direction by Wolf, 2026-10-10 (quoted below): outside contributions and the private paid edition must coexist without a contributor-rights programme. The section 7 mechanism, its exact wording, its all-recipient scope and the narrow application bridge are the diffdevil Leads' selection under that direction: product and packaging judgment by Nyxara, technical acceptance by Katja, 2026-10-10. The wording is accepted as the project licence candidate; it is not legal-professional certification. Numbered after D074–D077, which in-flight App source already uses.

**Decision.** The managed App program (`apps/github-app/`, `apps/shared/` and `apps/app/` where present) is licensed `AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0`. The [premium-interface permission](../LICENSES/AdditionRef-diffdevil-premium-interface-exception-1.0.txt) is an AGPLv3 section 7 additional permission: an independent module under other terms may join the App only through the Premium Service Interface (the optional `premium` argument of `createAnalyticalDataService`) and the Premium Application Interface (the extension resolved from `@diffdevil/premium-app` and `@diffdevil/premium-styles`, whose brief provider the managed-App Worker also resolves from `@diffdevil/premium-brief`), as a version Wolfsblvt Works publishes declares them, without becoming AGPL solely because of that combination. The App program and every modification of it stay AGPL, including the section 13 source offer. Copied or derived App code is never an independent module. Each version declares the exact files of each interface in `release.json`'s `premiumSeam`; the initial public contract declared `null`; the joined Community App source declares version 1 through D084.

**Why.** AGPL already permits private, paid and commercial operation, so contributions and the paid edition never needed a relicensing grant. Wolf: “Doesn't AGPL-3.0 say the code can be used wherever, even in a private, paid proprietary server, etc etc, just that any modifications to that code need to be made public as well?” The remaining boundary is a combined work: AGPL alone does not let an independent proprietary module be built into the same covered program. A narrow permission at the two seams that the Community App source separates (D075, which arrives with that source) gives the private Pro/Business modules a lawful joining boundary, keeps every public change source-available, and lets outside contributions arrive under the ordinary component licence. Declaring the interface files per version keeps the permission exactly as wide as the published interface rather than the whole program.

**Rejected.** A diffdevil-local contribution agreement, PR rights acknowledgement or proprietary relicensing grant (Wolf: “The shared CONTRIBUTING was designed to cover cases like diffdevil or shelfbound.”); a CLA, DCO programme or rights audit; a permission for any module or any part of the program, which would be a general proprietary-plugin platform; a permission limited to Wolfsblvt Works, which would be a private grant dressed as a public licence term; and leaving the combined-work question to assumption.

**Consequences.** The [component licence map](../LICENSES/README.md#app-program--agpl-30-only-with-the-premium-interface-permission) owns the plain-language terms and the [account-wide contribution guide](https://github.com/Wolfsblvt/.github/blob/main/CONTRIBUTING.md) remains the complete contribution contract. Every licence notice in the App program carries the expression; a repository test refuses a plain AGPL notice there, so new App files cannot silently fall outside the permission. Anyone, not only Wolfsblvt Works, may join an independent module through the published interfaces; that is the honest scope of a public licence term, not a promise of a supported plugin system. A release declaring a seam must list files that carry the permission, which the release manifest builder enforces. Interface width is a product choice: every public module an extension imports belongs in the declaration or must stop being imported. Earlier AGPL-only versions stay as they were published. No customer licence, self-hosted commercial licence or legal certification is created.

**Source.** Wolf's direction in the diffdevil Lead conversation, 2026-10-10, quoted above. The mechanism, wording, scope and bridge: the diffdevil Leads' recorded judgment under that direction, 2026-10-10.

## D079: Let App consumers follow App-family releases through an exact manifest

**Status:** Direction by Wolf, 2026-10-10: consume the latest compatible App release instead of hand-maintained hashes. The manifest contract, selection rules and generated lock are the diffdevil Leads' selection under that direction: product judgment by Nyxara, technical acceptance by Katja, 2026-10-10. This is the public half of the route; the private consumer's resolver and lock live in its own repository.

**Decision.** Each `app-vX.Y.Z` release attaches one `diffdevil-app-X.Y.Z.release.json` manifest derived from the exact release commit: version, tag, channel, source commit and tree, declared engine version, and the `premiumSeam` contract version, declared files of both interfaces and the permission that covers them. A consumer selects the greatest stable App-family release by numeric SemVer, verifies the manifest against the release and the fetched tag, checks seam compatibility, and records an exact generated lock. [Release families](RELEASING.md#app-family-release-manifest-and-its-consumers) owns the contract.

**Why.** An exact bootstrap hash is a useful receipt, but a maintained product should consume the latest compatible release rather than turn every relevant public merge into a manual premium update. Release selection keeps unrelated merges inert, and the lock keeps every build reproducible without anyone editing hashes. A declared seam version tells the consumer whether it can join a release before it builds anything.

**Rejected.** Following `main` (unreleased and unrelated changes would flow in); GitHub's repository-wide Latest or a mutable `latest` download URL (reserved for the open tool by D044, and not family-aware); a human-maintained exact pin as product direction; a source archive asset (the Git tree already identifies the content); and a general cross-repository release controller.

**Consequences.** The App's first named release also needs its `premiumSeam` declaration once the Community seam is on `main`; until then `main` declares `null`, which no premium consumer can join. A development manifest serves the consumer's local-checkout override with the same fields. An inconsistent selected release fails the refresh rather than silently falling back. Automatic private refresh on release is the private repository's route, not a public controller.

**Source.** Wolf's correction of the composition model, 2026-10-10, in the diffdevil Lead conversation. The manifest, selection and lock mechanism: the diffdevil Leads' recorded judgment under that direction, 2026-10-10.

## D080: Manage is one console with sub-tabs, capacity first, and the first Works link lands on the plan page

**Status:** The App's operating half (Manage, repository settings, Plan & funding, Account), co-designed with Wolf over five rounds and ratified on 2026-10-10 ("This is nearly great. I really like it. Yes, we can take this as the final candidate."); implemented in source on 2026-10-10 and qualified locally against a Works stand-in. Not a deployment, a real Works link, a payment or a customer journey.

**Decision.** Manage is one console reached from the navigation foot, with its own sub-tabs: Overview · Repositories · Defaults · Plan & funding · Account; on Business, Defaults becomes Policies and People and Audit join. Repository settings open under the same tabs with the breadcrumb `Manage / namespace`. Capacity is shown first and as named slot cells: the plan band with the organisation slots, then one row per namespace with a cell per private slot named by the repository holding it; Free shows both finite allowances (private, and public with history) pooled across the personal account and its one connected organisation; Pro organisations show three private cells; unlimited scopes show no cells. Repositories split enabled above not enabled, with the state and its reason on every row; switching is in place and the incoming repository lands as Pending enable, so nothing is written before its policy is reviewed; Free administrators choose which public repositories use the history places. A paid plan does not add Free organisations: an organisation without a slot has no plan unless another administrator connects it on their Free account, and the Free connected organisation can be changed. Pro's plan comparison leads with Business; the comparison is product consequence only, the amount always comes from Works' quote. The first upgrade links Wolfsblvt Works and forwards straight to Works' plan page; diffdevil keeps a short-lived departure record and shows a return strip on Plan & funding whose waiting state reads as live work, whose confirmed state carries the next action, and whose decision comes from the applied order Works has sent since the departure, never from the return itself; the admitted return destination is `/manage/plan`. Account shows four separate relationships (GitHub sign-in, App installations, the funding connection, Works), discloses the retained funding connection when a slot is bound and when the person signs out, and offers disconnect and reconnect: a disconnected connection never resumes because of time, renewal, sign-in or a return from Works.

**Why.** Wolf's direction, exactly: a Manage window with its own sub-tabs made more sense than a navigation mode or in-place tabs; what the plan allows, open slots and over-the-limit standing had to be obvious and greatly visible right away, with a visible scale of slots used and free; enabled repositories always shown above the others with switching in place; the first Works link landing straight on the plan page; no unlimited Free organisations on a paid plan; connected organisations changeable; Business as the default comparison on Pro; and the return from Works visibly working while it waits. Juno's authority check binds the funding guards: no implicit resume, disclosure at bind and sign-out, funding grants no access, ownership or billing visibility.

**Engineering choices recorded with the implementation, not owner-ratified.** Selection is its own Manage fact (`repository_selections`), separate from provider reach, execution consent and history consent, so a selected repository holds a slot before it runs. Allowances are operator configuration (`APP_PLAN_ALLOWANCES`) that default to the hosted offer when a subscription source is connected and to no limit otherwise, enforced at the Manage boundary where a selection is made; the webhook runtime does not enforce them. The Pro namespace default is stored per numeric account (`namespace_defaults`) and joins the effective policy as the resolver's existing `account` layer for the App's interpretation, the preview and execution. History retention days are operator configuration (`APP_HISTORY_RETENTION_DAYS`) named as such in the console. A loopback-only commercial stand-in (`APP_COMMERCIAL_FIXTURE`) carries the paid presentation, slots, the link and the return for local qualification. The one-writer guidance is the admission contract's writer declaration, made at enable time.

**Rejected.** Manage as a second navigation mode (A) or as Activity | Manage tabs in place (B); a settings inventory in place of the ratified experience; letting diffdevil pick which repositories stay when a plan reduces; hardening placeholder policy (retention terms, the shared archive date, audit retention, the monthly import budget, closure while a paid plan runs) into constants; a floating or neutral return strip.

**Open.** Importing past pull requests and recalculation; applying the saved choice of what stays at the effective date; allowance enforcement inside the webhook runtime; phone-width design, the light theme as a designed surface, and screen readers themselves (keyboard operation, 1024 and 900 widths, the dark lock under a light preference and reduced motion are qualified under D081); real Works, a real link and a real customer. Linked policies with per-repository publishing results, automatic setup, delegated administration and the administrative record are implemented under D081.

**Sources.** The Manage handoff, Juno's authority check, the implementation Work #792, [the App experience](../apps/app/README.md).

## D081: Business coordination is published into repository settings, delegated within GitHub's ceiling, and recorded as it happened

**Status:** Implemented in source on 2026-10-10 as the Business and consumer completion of the Manage console (#792, Work B), inside the frame D080 ratified; qualified locally against the Works stand-in. These are agent-authored engineering choices for the ratified reference, not owner ratification of a changed product boundary. Not a deployment, a real Works link or a real customer. The delegation ceiling below is owner direction (Wolf, 2026-10-10), not an engineering choice.

**Superseded in part by [D086](#d086-an-administrators-automatic-setup-choice-belongs-to-the-namespace-an-account-administrators-stays-person-bound) (2026-10-11).** An automatic-setup choice made by the namespace's administrator on GitHub is now the namespace's setting: the per-setup requirement below that "an owner's choice needs administration of the repository", and the Known limit that follows from it, no longer apply. Account-administrator choices and everything else in this entry stand.

**Decision.** A Business namespace coordinates named linked policies: one policy document per name, read with the same engine and schema as the CLI and Actions and kept by revision; a repository is linked to at most one policy of its own namespace. Linking applies the policy's current revision as the repository's stored App settings through the admission contract, and publishing a revision writes it into every linked repository the same way, so the effective policy changes exactly where a repository's own settings would and the repository's `.diffdevil.yml` still wins for what it sets. Each publication keeps a result per repository as it happened: applied; applied partly, naming the values the observed repository file keeps; queued behind in-flight work on that repository (an active delivery lease or a claimed repair), so live pull requests keep priority; or failed on a refusal, with nothing half-written. Retry attempts the queued and failed ones again and leaves applied ones alone; a repository unlinked since is not written to. Unlinking or removing a policy leaves the current settings as plain repository settings. Automatic setup is chosen per namespace: a newly granted repository may be linked to a named policy, selected, and have labels and the check enabled when the administrator declared the one writer for new repositories; history and the pull-request message are never turned on by it, a repository that was operated before waits for a person, and it applies only while the namespace is on Business. Delegated administration names GitHub users by login: an Account administrator coordinates policies and configures the whole namespace, a Repository administrator configures the repositories named for them; both act on a repository only while their own current GitHub access to it includes write (push), proved at every action, and only while the namespace is on Business. Visibility alone is not enough: a delegate GitHub gives read access only, or narrows from write to read, is refused there and the refusal is kept, never carried by the App's own access. Only the namespace's current GitHub administration names or removes a delegate, read from GitHub again for that action. Automatic setup stays a choice of the owner or an Account administrator and acts for that chooser under the role it was saved with, checked at each newly granted repository it is about to change. An Account administrator's choice acts only while their delegation still coordinates the namespace, whatever GitHub grants them on the repository (repository administration on GitHub is a write ceiling, not a coordinating role), and then needs write there; an owner's choice needs administration of the repository. The chooser is found by account id, so a rename follows them and a recycled login cannot stand in. Any other answer, including one GitHub could not give, `none`, or one naming a different account, holds that repository for a person with the reason. Coordinators see who the setup acts for and as what, how many new repositories it left waiting since it was chosen and why, in Policies and Needs you, and can choose it again so it acts for them; removing the Account administrator who chose it tells the remover that new repositories now wait. The export keeps the setup's linked policy and who chose it as what. Known limit: the installation's Metadata read shows repository permission, not organisation membership, so an owner demoted in the organisation who still administers a new repository itself still passes; the saved role records what the choice was made as and is never presented as proof of current organisation administration. Funding or a subscription makes nobody an administrator; delegates never fund, change the plan or see invoices. A publication across repositories keeps each repository's own result, so it is truthfully partly applied when the publisher can write to some of them and not others. The administrative record keeps what people and the automation they chose requested, where, with which result (requested, queued, applied, partly, failed) and reason; a refused request is kept as failed; facts seen only on GitHub join as observed with no diffdevil actor; what is recorded is kept, and no retention term is invented.

**Why.** The ratified reference shows publishing as a per-repository result with queueing behind imports and a Retry, linked policies with the repository file winning, automatic setup that never silently turns on history or publication, delegates within GitHub's ceiling with Can and Can't, and an audit that keeps requested, queued and failed as they happened. Writing a published revision into the repository's own settings keeps one effective-policy chain for Pro adoption and Business coordination and leaves a repository's settings whole when the link ends. Queueing on the runtime's own in-flight facts avoids a job platform while keeping live pull requests first. Wolf settled the delegation ceiling directly: “I feel like we should lock this down as "if you manage diffdevil, you also need write access to the repository", because otherwise it feels weird.” Someone who steers diffdevil's labels, check, pull-request message and policy publication on a repository can therefore already do the corresponding work on GitHub themselves, and the People and Audit surfaces say so: you can manage diffdevil here because you can write to this repository on GitHub. The rejected alternative let an explicit DiffDevil delegation reach beyond the delegate's own GitHub write role, bounded only by visibility; it would have let organisations delegate DiffDevil operation without granting push. An interim cut moved automatic setup to the GitHub administrators alone, because a later repository's permission seemed unknowable without stored personal tokens; Katja rejected that reduction of the selected Account-administrator capability, and the check now happens at each actual setup through the App's own installation instead. Tala's cold review then found that GitHub repository administration let a removed Account administrator's choice keep linking namespace policy, that a rename held forever, that held setup was invisible to coordinators, and that the export dropped the linked policy; the role kept with the choice, the id-based lookup, the visible recovery and the export repair answer those.

**Engineering choices recorded with the implementation, not owner-ratified.** Migration `0013_business.sql` carries `linked_policies`, `policy_links` (with the revision last applied), `policy_publications` and their results, `automatic_setup`, `delegations` and `administrative_events`. Queued publications are completed by Retry or superseded by the next publication; no scheduler completes them. Open history jobs (queued, running or paused) join the same in-flight read, so publication waits for their completion or cancellation. The authorization service accepts a delegate as `delegated-admin` only when the repository is available to them through an installation they can see and GitHub reports their own `push` permission on it; a named delegate without it is refused with `E_ADMISSION_WRITE_REQUIRED`, distinct from `E_ADMISSION_UNAUTHORIZED`, so Manage, publication results and the record can say why. The managed runtime hands newly granted repositories to the App's automatic setup after lifecycle reconciliation; a setup failure is recorded and never fails the delivery. Coordination of policies and automatic setup belongs to the namespace's owner or an Account administrator, and naming people to the owner alone. Automatic setup stores the chooser's account id, the login shown for them and the role the choice was saved under (`automatic_setup.actor_login`, `actor_role`; an owner's role is read from GitHub again at saving). At each setup it reads, with an installation credential scoped to the one repository and Metadata read, the chooser's current login from their id (`GET /user/{account_id}`) and then GitHub's calculated repository permission for it (`GET /repos/{owner}/{repo}/collaborators/{username}/permission`, `createRepositoryPermissionReader`), accepting the answer only when its user id is the stored one and refreshing the shown login on a rename; an Account-administrator chooser without a current coordinating delegation is held before GitHub is asked, and a deployment without App credentials cannot ask and holds. Held outcomes carry `held: 'chooser-authority'` in the record, which Policies and Needs you count since the choice was saved; the Business tabs appear for everyone who coordinates a Business namespace, and a Pro person who coordinates one keeps their own Defaults beside them.

**Also under this entry.** The chart frame's carried-across-a-swap defect found by the 792 qualification is repaired: a kept frame no longer replays its entrance animation (the 3 px rise) or loses keyboard focus and its pinned row when a URL-state page swap lands while the keyboard is inside it; the browser qualification waits for the cloud's metric swap to settle before the next frame's checks. The accessible Manage journeys qualified here are keyboard-only operation (sub-tabs, selecting, the enable panel with its declaration, the typed confirmation dialog and its way out, stopping), visible focus, labelled controls, named buttons and links, hidden decorative icons, headed or captioned tables, status and alert live regions, 1024 and 900 widths without horizontal overflow, the dark lock under a light colour-scheme preference, and reduced motion on the waiting return strip. Screen readers themselves, phone width and a designed light theme remain open.

**Sources.** The Manage handoff, Wolf's delegation decision, the automatic-setup repair, the cold review and its disposition, the completion placement, [account authorisation](dashboard-access.md#administrative-audit), [the App experience](../apps/app/README.md).

## D082: The runtime holds what the plan does not cover, history jobs are durable, and a Pro default is adopted

**Status:** Engineering choices made while implementing the remainder of D080 inside its ratified frame (#792 Work A, 2026-10-10), agent-authored and not separately owner-ratified. Implemented in source and qualified locally; not deployed, and not exercised against real GitHub, real Works or a real customer.

**Decision.** *Allowances govern operation itself.* One operating check, shared with the console's own capacity rule, answers for every delivery, live collection and history job whether a repository may execute and collect history under its scope's allowance: the Free pool (personal account and its one connected organisation), a Pro organisation's private slots, or no limit. A scope is over its limit only after a plan or connection reduction, and then diffdevil does not pick: with the administrator's saved choice the chosen repositories run and the others are held; without one, everything private in that scope is held, and public history over its places pauses for all of them, until a choice is made. An organisation neither funded nor connected has no plan and is held. Unknown is not false: an unestablished plan, account kind or visibility leaves operation unchanged, and a deployment without allowances (Community) is never limited here. The runtime records the identifier-level facts this needs (installation account kind, repository visibility) from webhooks and the administrator's own reads. *The saved choice becomes the consequence at the reduction*: once the authoritative plan is below the plan the choice was made on, it is applied (on the next Manage visit or the scheduled maintenance): the Free connection is made, unchosen private repositories are stopped and released with history and settings kept, an unchosen organisation's repositories stop, while already-published Business settings remain unchanged. Saving a choice after the reduction applies it at once. *History jobs are durable D1 rows* (`history_jobs`): an import or recalculation request is one job per repository and kind, whose cursor and progress live in D1 while queue messages only name the job and its step, so a lost, late or duplicated message neither replays nor forks it. Each step re-checks consent, deletion, the operating allowance and the plan's import scope, does a bounded amount of read-only work through the existing analytical collection, and queues the next step behind live deliveries. A rate limit pauses with a wake time and a delayed step; a person can pause and resume; a failure is retried from the same place; the scheduled maintenance requeues a step whose message was lost. Imports read closed pull requests most recent first: on the hosted Free plan up to `free.importPullRequests` (100 by default, D059), otherwise all recoverable history. Recalculation re-acquires what the current policy cannot interpret yet, refreshes default-branch sizes and records which policy the result was checked under; interpretation itself stays read-time. *A Pro default is adopted, never linked*: the repository settings page compares the repository with its namespace default, previews the differences and the resulting policy, and applying writes the default's sections into that repository's App settings, recording the adopted revision as the effective origin. The original operating donor retained a live Business account layer; D084 supersedes that path with D081's explicit publication into repository settings, which are the sole App runtime policy.

**Why.** D080's ratified frame says what the plan funds and that diffdevil never picks what stays; enforcing that only on the selection page left repositories running beyond a reduced plan and made the saved choice decorative. D057 already selected deliberate per-repository application for Pro; a live default contradicted it and silently changed effective policy for repositories that never adopted it. D059 and the processing contract require visible, resumable, honest background work that never outranks live operation and never depends on a message's lifetime.

**Rejected.** Keeping the oldest selections when a scope is over its limit (that is picking); keeping over-limit repositories running until someone chooses; a generic job platform, priority lanes or invented monthly import budgets and retention constants; treating an unreadable linked policy as an empty layer; storing a Pro default as a live layer with a per-repository opt-out.

**Consequences.** Migration `0014_operating-continuity.sql`. A monthly import budget remains unsettled launch configuration and is not enforced. Live deliveries and history steps share one queue; steps are small and yield, but no separate lane exists. Imports read closed pull requests only (open ones are collected live) and cannot recover a comparison GitHub no longer supplies; that remains named per job. Business coordination is implemented under D081. Its published repository settings and the explicit Pro adoption remain the single effective-policy route after D084 joins them.

**Sources.** The Work, [D080](#d080-manage-is-one-console-with-sub-tabs-capacity-first-and-the-first-works-link-lands-on-the-plan-page), [D057](#d057-reserve-shared-policy-coordination-for-business), [D059](#d059-protect-live-operation-and-expose-delayed-historical-work-honestly), [management](app-management.md).

## D083: The beta survey is product feedback; its reward is Wirt's, delivered as one signed completion fact

**Status:** The DiffDevil half of the first participation reward campaign, implemented in source on 2026-10-10 under #796 and qualified against a Wirt double and the local Works stand-in. The customer promise is Wolf's and Nyxara's; the product-side choices below carry the final invitation/date disposition; joined security and actual producer/consumer qualification remain separate. Not a live campaign, mail, a real reward or a payment.

**Decision.** Wolf's direction: "If you participate in the beta, you get 1 month of Pro for free during testing." "If you continue paying, you lock into the current beta price, like normally." "If you fill out the survey, you get a **discount**." "**Participation reward campaign** is the right name for it. It can be more than beta surveys in the future." The survey, its answers, their privacy and the invitation are diffdevil's; the campaign, the reward and every amount are Wirt's. Completing the survey commits the answers and one outbound completion fact together; the fact (campaign, version, completion time, an opaque completion identity and a distinct durable event identity) is delivered through the account's signed Works link until Wirt answers definitely, and is all Wirt ever receives. The reward diffdevil shows always comes from Wirt's facts, rewards route or quote; diffdevil never derives an amount, a remaining use or a post-reward price. Deleting the answers keeps the completion and the reward.

**Engineering choices recorded with the implementation, not owner-ratified.** Following Nyxara's reconciliation on #796 and #795's producer repair, the completion and the business event are separate identities: the event is created once with the completion and survives retries and restore, the transport nonce is fresh per request, and the outcome recorded is Wirt's stated `accepted`, `replayed` or refusal, never inferred (an earlier shared completion/idempotency identity is superseded). Delivery resolves the account's active link at each attempt and waits for a link rather than failing. A Wirt refusal is checked against Wirt's current rewards before it is recorded, so a restore that lost the original completion reconciles to the earned reward instead of reading as refused. Delivery uses the reports' backoff but is never abandoned. A participant is a linked account with a Pro relationship; Business and an unreadable plan are not invited. Meaningful use is Pro for the campaign's invitation delay plus a managed operation that finished during beta access, successfully, held or failed; a repository merely enabled or running is setup, not use (Nyxara's reconciliation: failed use is meaningful, and feedback only from people the software already pleased is not research). Nyxara's final disposition requires preservation before operational pruning, independently of a page visit: one campaign-scoped timestamp for any eligible terminal managed outcome during an authoritative beta-access window. A newer active or retryable delivery cannot hide an earlier finished one. Link age and price protection do not establish beta access; without an identifiable authoritative window, proactive eligibility is unknown and the manual survey remains reachable. The invitation appears in the App only, once and then once more as the only reminder. A continuation preview creates a Wirt quote, so it is created only by the person's Origin-checked POST through the existing Manage action route and stored until Wirt's quote lapses; a page GET, prefetch or cross-site link creates none (Juno's finding, adopted by Katja and Nyxara). The campaign's key, version, window and both delays are deployment configuration (`APP_PARTICIPATION_CAMPAIGN`) with no defaults. All of it is Community source.

**Rejected.** A generic survey platform or campaign rule engine; scoring, gating or reviewing answers before the reward; sending answers, free text or product context to Wirt; treating an HTTP acknowledgement as an issued reward; computing the discount locally; deleting a reward when answers are deleted; mail or repeated nudges; quoting both cadences on every Plan & funding view; creating a quote from a GET.

**Open.** The exact opening, completion and claim dates, cohort and reminder timing; actual joined staging qualification against Wirt's accepted participation producer; real beta use and its feedback readback; screen-reader and phone-width qualification; actual installed producer/consumer interoperability. Completion/reward fixtures match accepted `b17c75e`; the beta consumer preserves candidate `c33d5d9`'s distinct `benefits.beta_grants`, actual access windows and authoritative `commercial_timezone`. Missing/invalid calendar or legacy beta facts remain unknown, while native-shaped local fixtures qualify the selected commercial-date conversion. The early-conversion promise fork and producer acceptance remain with Wirt; no PHP execution or installed delivery is claimed here.

**Sources.** Wirt's campaign Plan, Nyxara's first-campaign disposition, the Work, [the consumer](integration/app-commercial-link.md#participation-reward-campaigns), [privacy and data](PRIVACY-AND-DATA.md#participation-survey-responses).

## D084: Expose the existing premium consumers through a narrow declared bridge

**Status:** Agent-authored source integration for the accepted two-interface relationship of D078/D079. Source seam version 1 is unreleased; private canonical import and exact composition qualification remain separate.

**Decision and why.** The premium application uses four public bridge modules: Astro components, Node-safe server helpers, pure shared chart helpers, and browser chart helpers/types. They expose only symbols needed by the real consumer. The service receives its existing host explicitly and the brief uses its existing provider contract. Public implementation modules behind the bridge are not separate premium compatibility promises. The App release declaration names these files and the service/application entry contracts under the accepted permission. This keeps one useful Community program without a private source requirement and preserves the complete paid implementation through deliberate composition.

**Rejected and superseded.** Treating every historical implementation import as a supported interface; a plugin registry or lifecycle; mixed Astro/server exports that break Node consumers. Business publication and Pro adoption both use repository settings, so the operating donor's alternate live account layer and plan-reduction conversion are superseded. Settings already published or adopted survive a plan reduction directly. Publication waits behind open history jobs through its existing busy check.

**Current consequence.** Public Decisions D074, D078 and D079 remain stable. The unlanded App architecture record is D085, preserving the newly landed extension D074. Concurrent local Manage, Business, operating and campaign records are reconciled as D080–D083. Never-deployed migrations have the ordered identities 0013 Business, 0014 operating continuity and 0015 participation; no deployed database reset or migration effect follows. The complete six-destination, Manage, brief and campaign result remains selected. The canonical private consumer accepts seam 1 only after importing the matching subtree and exercising its maintained generated-lock route.

**Sources.** [The public premium contract](../apps/app/src/premium/README.md), [App release declaration](../apps/github-app/release.json), [Manage source](../apps/app/src/lib/manage/), and the current integration Work #793.

## D085: The signed-in App is one Astro Worker over the managed App's runtime, contract and D1

**Status:** Implementation architecture of the analytical join, 2026-10-10; not a deployment, plan or commercial choice.

**Decision.** `apps/app/` is an Astro project with `output: 'server'` on `@astrojs/cloudflare`, built as one Worker through a custom entry (`src/worker.mjs`) that serves the pages and routes the managed App's own paths (webhook ingress, `/api/analytics`, the Wirt commercial routes, health), Queue consumer and scheduled maintenance to `apps/github-app/app.mjs` on the same host, D1, authorization service and protector. It imports the website's header, tokens, styles and fonts directly and prerenders the header once at build. Every page reads the managed App's analytical data contract in-process for the surface it renders; the App derives no measurement from rows. Entitlement comes from the Wirt commercial consumer by installation account; the current policy from the repository's stored App configuration over the bundled preset; a file-detail address from an opaque locator. Every view is a URL; charts are replaceable provisional figures bound to the same data as their accessible tables.

**Why.** One serving path keeps one bound authorization/protector contract for pages, analytics and integration callbacks, one secret set and one deployment, and lets `/api/analytics` answer with the App's real authorization adapter installed. The adapter supports the custom Worker entry natively, so the join costs no post-build machinery. One data contract keeps the App's populations, coverage and entitlement the backend's facts rather than a second derivation. The handoff requires the website's header unchanged: importing the component beats copying its markup. The named-path privacy consequence (D065) needs a file address that is not a path; an HMAC handle under the seal key is stateless, stable per deployment and reveals nothing without the key.

**Rejected.** A second Worker for the App beside the webhook Worker (two secret sets, two deployments, a path split on one host, no installed analytics adapter) once the adapter's custom entry proved available; a hand-written Worker that string-templates pages; a client-side application over the JSON API; re-deriving populations in the App from analytical rows; a path in the file-detail URL; any chart library adoption (the renderer is a separate co-design).

**Consequences.** The standalone webhook Worker in `apps/github-app/` remains buildable as the operator-boundary runtime; which unit is deployed is a deployment decision. Where a repository with history has no retained named record yet, its older pathless analyses drive the page by analysis time and the page says so; the transient GitHub lifecycle read of the first candidate is retired, and GitHub supplies display titles only. A window that begins before the first retained observation is partial and its comparison withheld. This supersedes the first candidate's separate-Worker and transient-lifecycle choices; D064–D066's owner decisions stand.

**Sources.** The join placement, the scope repair, the URL/privacy challenge and [App experience](../apps/app/README.md).

## D086: An administrator's automatic-setup choice belongs to the namespace; an Account administrator's stays person-bound

**Status:** Owner decision by Wolf, 2026-10-11 (#471), choosing “A — Lasting namespace setting (recommended)”. Implemented in Community source and qualified locally against the GitHub double; not deployed, and not exercised against real organisation roles or an installed App token.

**Decision.** An automatic-setup choice made under current GitHub administration of the namespace (an organisation administrator, read from GitHub again for that action, or the personal account itself) is the namespace's setting. It keeps applying after its chooser leaves the organisation, is demoted or loses access, until a current administrator or Account administrator changes it or turns it off. That authority is established again for every change or turning off, and a refused attempt is recorded. Applying the setting still needs the App's own current installation and repository access and keeps every other D081 condition: Business, a repository never operated before (a re-added one waits for a person), the one-writer declaration before enabling, history and the pull-request message never turned on, and a factual outcome per repository that names whose setting it carried out (chooser, role, date). Account-administrator choices stay person-bound: they act only while the chooser's delegation still coordinates the namespace and reaches the repository, and only where GitHub gives them write, checked at each repository as D081 describes. An Account administrator who changes the namespace's setting makes it theirs and person-bound, and the record names what it replaced. Policies, Needs you, Audit and the export say whose choice it is. Human and delegated administration, naming and revocation of delegates, the write ceiling, stable identity, repository-file authority, held recovery and export keep their D081 meaning.

**Why.** The accepted source treated an owner's choice as acting for that person and checked their repository administration at each setup, yet the installation's Metadata read cannot see organisation membership, so a demoted owner who kept repository administration still passed: the check measured the wrong thing. Making it truthfully person-bound would need the Members-read App permission, which GitHub requests from every installation (Free and Community included) for one Business path, with a re-approval wave and held setups until each installation approves. Automatic setup already reads as a namespace setting, and GitHub's own organisation settings (rulesets, default workflow permissions, security defaults) keep applying after the administrator who configured them is demoted, while any current administrator can see and change them. Wolf chose that relationship. It keeps his current-access rule for people who actively administer or hold delegated choices: delegated authority ends with its delegation; namespace configuration need not end with its author.

**Rejected.** Keeping owner choices person-bound by rechecking the original owner's current organisation role and repository ceiling at each setup through a new Members-read permission; a retained personal or funding token to read membership; treating a repository's addition to a selected-repositories installation as proof of current authority (an unverified premise, not used to justify this decision).

**Supersedes.** In [D081](#d081-business-coordination-is-published-into-repository-settings-delegated-within-githubs-ceiling-and-recorded-as-it-happened), the per-setup requirement that an owner's choice needs administration of the repository, and the Known limit about a demoted owner who still administers it. The rest of D081 stands.

**Engineering choices recorded with the implementation, not owner-ratified.** No schema change: `automatic_setup.actor_role` `owner` marks the namespace's setting and `account-admin` a person-bound choice, so never-deployed rows read the same way. The namespace's setting mints no credential and makes no GitHub read about its chooser at setup; the chooser login shown is the one recorded at saving and is not refreshed. Saving, changing or turning off reads the person's organisation role from GitHub again and otherwise accepts a current coordinating delegation; an Account administrator's save answers `setup-saved-yours`. Setup records carry `detail.belongs`, `chosenAs` and `chosenAt`, and the export's `automaticSetup.belongsTo` is `namespace` or `chooser`. The setup presentation (`presentAutomaticSetup`, `SETUP_RULE`, the saving words) is Community and reaches the premium Policies body through the bridge helpers.

**Sources.** Wolf's decision and Katja's adoption on #471, Juno's independent challenge, the decision card's alternatives and cost, [D081](#d081-business-coordination-is-published-into-repository-settings-delegated-within-githubs-ceiling-and-recorded-as-it-happened), [account authorisation](dashboard-access.md#administration).

## D087: Share unchanged size facts while retaining every observation

**Status:** Agent-authored storage/query implementation in the 2026-10-11 source
candidate; not a retention, tier, price, deployment or production-migration choice.

**Decision.** Store bounded canonical sets of paths and measured sizes once, with
separate observation markers carrying every exact time, revision and original
expiry. Identical numerical sets can share across revisions without establishing
continuity: Turnover still requires the actual complete comparison chain. Keep
the full logical window and version-1 export, including intermediate observations.
Use indexed window markers, fetch their shared facts once, and select nearest
anchors as scalar rows through native SQLite JSON, seeking once per shared set
within D1; all intermediate markers remain authoritative.
Partition sorted captures at path-hash boundaries with a 100-path maximum, so an
ordinary added file does not shift every later group. Keep capture's existing
per-path processing allowance alongside actual statement accounting. Markers
also record the capture's start for continuation: overlapping captures cannot
silently complete each other's paths, while immutable numerical sizes are reused.
That operational metadata does not change observation or export identity. Drain indexed
physical expiry in bounded queries, with facts kept until their last marker ends.

**Why and alternatives.** Repeating unchanged path/size facts per event multiplies
storage and indexed writes without adding a numerical fact. Endpoint-only reads
would lose the premium file consumer's complete `sizeHistory`. Shorter retention,
smaller tiers and a new database estate are product choices rather than equivalent
storage repair. Sharing leaves those choices untouched and preserves exact
observation identity, unknowns, consent, deletion and restore semantics. Window
responses still cost memory proportional to the complete requested logical history
plus scalar anchors; this is not a claim that arbitrarily large file responses fit
a Worker. The original positional partition and per-set anchor selection failed
on long histories with added files: partitions shifted broadly, and selecting
nearest anchors after decoding old sets materialised nearly all retained facts.
D1 now performs that selection directly from the shared JSON. A derived membership
index was measured and rejected: native JSON selection supplied the same bounded
Worker transfer with fewer reported reads and no extra stored path/size rows.
D1 still parses retained candidate sets and can report more row reads than the
original Worker-side filtering; this is not universal cost reduction or a claim
that short windows bound database CPU.

**Transition.** Migration 0016 carries retained rows into the shared representation.
Its logical SQL view serves diagnostics and export, not old writers. Schema and
runtime roll out together with old writers stopped; the local transition tests do
not perform or qualify a production migration.

**Sources.** [Analytical storage contract](integration/app-analytical-data.md),
[shared-size implementation](../apps/github-app/analytical-size-storage.mjs) and
[actual D1 equivalence tests](../apps/github-app/analytical-size-storage.test.mjs).

## D088: Attach credentials to a qualified artifact in one existing-Worker version

**Status:** Maintainer-selected operator contract; the 2026-10-21 source candidate
does not authorize live credentials, provider writes, deployment or publication.

**Decision.** Establish a clean runtime before Node starts, then pass credential
children only required OS paths, selected native authentication and fixed controls.
Prepare one source artifact from pinned Wrangler's native dry-run modules/settings
and the complete selected static assets. Qualify its SHA-256 before protected input.
Use native Wrangler authentication inside the contained upload child and create
one undeployed version on the existing script with the artifact and secret bindings
together. Keep the original Worker, App/OAuth identities, D1/Queues, seal, valued
state and operating custody. Preserve legacy receipts through read-only recovery.

**Why and alternatives.** A latest-version check followed by `versions secret bulk`
does not bind the write: a foreign upload can become latest before attachment.
Post-write binding names cannot prevent that effect. Pinned Wrangler 4.150.0's full
upload command also retries creation and preserves unspecified secrets; those
behaviors do not supply this exact operation. The focused upload child instead
uses the existing-script Upload Version API once, with complete modules, settings,
staged assets and credentials, without inherited selectors, resource provisioning,
deployment or a non-versioned settings write. It retains the established native
authentication route rather than creating a credential store or owner courier job.
The returned version ID, unique operation tag, artifact SHA, observed script ETag
and unchanged deployment establish request-bound lineage; they are not a provider
byte download, secret-value equality or live runtime proof. Ambiguous completion
remains partial/unknown and never earns a repeated write.

**Sources.** [Operator contract](../apps/github-app/README.md#registration-and-credential-helper),
[staging operation and recovery](integration/app-staging.md#protected-input-operation),
and the pinned provider route qualified by the native-bundle, asset-protocol,
foreign-upload and lost-response specimens in `apps/github-app/`.

## D089: Select one complete Wirt environment per App deployment

**Status:** Settled by Wolf on 2026-10-24 and accepted by the product and technical
Leads. This records the selected relationship, not a live target change or billing
activation.

**Decision.** One production Wirt serves active payments and products. Persistent
mirrored Wirt staging supports development, fixes, tests and new integrations
without polluting production commercial data. Production diffdevil targets
production Wirt when admitted. Internal diffdevil staging normally targets Wirt
staging; a deliberately selected production target can support qualification that
needs its real effects. Each deployment selects one complete target at a time,
irrespective of the product's own maturity.

**Why.** Product development needs a useful mirrored commercial environment without
turning experimental changes into production money or customer data. Once a product
uses the active commercial service, its staging or beta label does not require a
separate production Wirt. One explicit relationship keeps consumer state and its
observed commercial consequences understandable.

**Rejected or superseded.** Simultaneous staging/production attachment, shared
report cursors or commercial history, and fallback inferred from a surviving TEST
registration are not selected. The original production-origin TEST bridge remains
compatibility/history evidence, not the future production topology. This changes
no consent, report ordering, disconnect, authorisation or preservation semantics.

**Current consequence.** The [commercial contract](integration/app-commercial-link.md#wirt-environment-selection)
owns the single complete target and source-support boundary; the
[staging handoff](integration/app-staging.md) owns concrete assignments and admission,
and [recovery](integration/app-recovery.md#preserve-the-original-point-and-isolation)
preserves the same interpretation. Existing staging A/B links/history and original
registration/key continuity remain intact. The complete paid-capable App may be
delivered before production Works activation, truthfully unconfigured rather than
silently using staging or substituting a Free-only build. Actual production Wirt,
protected inputs, target changes and commercial use need their own admitted
delivery and evidence; source configuration performs none of them.

**Sources.** Wolf's production/staging environment account and explicit ratification
of 2026-10-24, accepted by the product and technical Leads; the maintained contracts
linked above preserve the public product consequence without private transcripts.

## D090: Accepted main publishes the public family and Playground through CI

**Status:** Wolf's correction of 2026-10-24, accepted by the product and technical
Leads. This records the selected operating model and its source contract; it is not
an adopted workflow, a configured secret or a live deployment.

**Decision.** The first frozen Direct Upload was a launch operation, not the
publication model. One GitHub Actions controller publishes the static public family
to the two existing Direct Upload Pages projects, manual first and site second, from
accepted relevant `main`. A separate controller deploys the Playground Worker as its
own runtime and credential boundary. Both trigger only on their consumed inputs,
keep pull requests credential-free, expose each protected input to the step that
needs it, record source, receipt, deployment and rollback coordinates, and read the
public result back. A workflow or controller-only landing publishes nothing; the
first production use of each is an explicit adoption dispatch, after which routine
relevant merges deploy without an approval button.

**Why.** Accepted website, manual and Worker source otherwise waits for somebody to
remember a laptop ritual, so production silently lags `main`. A reproducible
controller with a protected Environment is the ordinary route for a public product
Home; the human remains responsible for adoption, credential scope and recovery, not
for pressing deploy on every merge.

**Rejected.** Recreating the projects for Pages Git integration (a second controller
and needless provider churn); one workflow deploying site and Worker together (a
Worker repair would rebuild both hosts and the static change would redeploy the
API); an inclusion-only path list (a newly consumed input would silently never
publish); a controller change that republishes immediately (configuration landing
would ship an unreconciled cut); an account-wide convenience token; and routine
owner approval per run.

**Consequences.** [Production publication controllers](integration/production-publication.md)
own the closures, credential and receipt contracts, adoption and recovery. The
[website publication carrier](integration/website-publication.md) keeps the guarded
build and remains the bootstrap record and manual recovery route. Adoption, secrets,
Environment settings and every live run need their own Ops evidence.

**Sources.** Wolf's direct challenge to the publication posture and the selected
controller Work, both on 2026-10-24, with the product Lead's public-family semantics
and the technical Lead's source and credential admission.

## D091: Keep the single-decision Policy Lab in Community and hosted Free

**Status:** Selected by the product Lead on 2026-10-25, admitted for source implementation by the technical/integration Lead. Live adoption remains separate.

**Decision.** The complete one-question Policy Lab evaluator, editor, transition account, evidence compatibility and focused policy-file handoff belong in the public Community App and hosted Free. Existing Pro/Business evidence and authority enrich this same implementation. Preview remains temporary and effect-free; the actual repository authority adopts through `.diffdevil.yml`.

**Why.** Reinterpreting already-authorized retained numerical facts joins understanding change to shaping the policy that acts on it. It introduces no provider effect, new retained history, service, allowance or saved-result store. Withholding the useful experiment from a reader who can already inspect current policy and basic history would leave that basic product incomplete.

**Superseded.** The provisional premium-only placement for this v1 interaction is not selected. Broader paid historical exploration remains distinct; richer retention and file evidence follow existing entitlements, not a second evaluator or a paywall around the transition account.

**Consequence.** [Policy and history interpretation](dashboard.md#policy-lab-v1) owns the current behavior. Matrix cells and an equivalent semantic linear table share one result. Missing and incompatible evidence remain explicit. The current trusted policy reader is reused; a failed read cannot become a fallback experiment. Candidate, head, window and retained population are pinned, with supersession rather than silent relabelling. No automatic provider apply, arbitrary formula editor or persistent result cache follows.

**Sources.** The product Lead’s Policy Lab contract and settled Community/Free module judgment, followed by the technical/integration Lead’s source Assignment of 2026-10-25. This record preserves their product consequence without private workplace material.

## D092: Advance only the TEST commercial calendar

**Status:** Selected by Wolf on 2026-10-26; paired App consumer admitted by the technical/integration Lead. Source qualification and installed adoption remain distinct.

**Decision.** Consume Wirt's ordered signed v2 TEST offset through the existing projection/store and customer presentation. Ordinary v1 has no offset field. Commercial comparisons use real now plus the applied offset. Genuine feedback/activity windows, raw occurrences, security and operational clocks remain real; entitlement continues to trust Wirt's derived standing.

**Why.** The later TEST journey can traverse its full commercial calendar without waiting the same elapsed real-world time. Wolf selected that route after the shared A/B calendar consequence was disclosed: advancing TEST preserves annual calendar dates and money/history, but shortens the elapsed real time available to use existing TEST coverage. It does not prove a year of genuine use.

**Rejected or superseded.** A host-clock change, global time mock, scheduler-only interpretation, accelerated genuine feedback, fabricated completion or rewritten payment history cannot supply the selected result. The field does not select a second clock store, acknowledgement ledger or history interpreter.

**Current consequence.** [The integration contract](integration/app-commercial-link.md#signed-test-commercial-time) owns the wire validation, persistence, presentation and real/commercial split. Producer-derived real bounds on actual beta windows supply historical occurrence membership and genuine invitation delay; today's offset is not a history interpreter. The existing preserved real-use timestamp remains sufficient without a new per-operation store. Actual producer/consumer installation, independent security disposition and separately admitted advancement/use remain required at their own boundaries. The complete App and commercial journey are retained.

**Sources.** Wolf's selection of “Implement and qualify TEST commercial time (Recommended)” after the complete shared-calendar tradeoff card, accepted by the App technical/integration Lead on 2026-10-26; the Wirt responsible Lead's settled signed v2 contract and explicit clarification that genuine feedback/activity stays real. Private workplace references remain in the owning Return rather than this public record.

## Earlier decisions and retained fragments

The headings below preserve earlier links. Their full text remains in the exact predecessor record; follow its references for D001–D043. Later decisions above supersede only the stated portions. Historical source is not automatically current implementation.

### D001 — The product is `diffdevil`

[Retained D001](DECISIONS-through-d053.md#d001--the-product-is-diffdevil).

### D002 — One repository and one public npm package

[Retained D002](DECISIONS-through-d053.md#d002--one-repository-and-one-public-npm-package). D044 above narrows universal version coupling to the open-tool family.

### D003 — diffdevil is a portable diff-policy engine

[Retained D003](DECISIONS-through-d053.md#d003--diffdevil-is-a-portable-diff-policy-engine).

### D004 — Preserve raw and replacement-aware facts separately

[Retained D004](DECISIONS-through-d053.md#d004--preserve-raw-and-replacement-aware-facts-separately).

### D005 — Unknown evidence is first-class data

[Retained D005](DECISIONS-through-d053.md#d005--unknown-evidence-is-first-class-data).

### D006 — The optional expression language is detail

[Retained D006](DECISIONS-through-d053.md#d006--the-optional-expression-language-is-detail).

### D007 — Chevrotain parses detail

[Retained D007](DECISIONS-through-d053.md#d007--chevrotain-parses-detail).

### D008 — Basic use remains language-free

[Retained D008](DECISIONS-through-d053.md#d008--basic-use-remains-language-free).

### D009 — Action entry points and mutation stages

[Retained D009](DECISIONS-through-d053.md#d009--action-entry-points-and-mutation-stages).

### D010 — Root Action default

[Retained D010](DECISIONS-through-d053.md#d010--root-action-default).

### D011 — One ordinary size preset has no hidden path exclusions

[Retained D011](DECISIONS-through-d053.md#d011--one-ordinary-size-preset-has-no-hidden-path-exclusions).

### D012 — Comments and label definitions are product capability

[Retained D012](DECISIONS-through-d053.md#d012--comments-and-label-definitions-are-product-capability).

### D013 — Keep aliases; teach the clearer form

[Retained D013](DECISIONS-through-d053.md#d013--keep-aliases-teach-the-clearer-form).

### D014 — License reusable components under MIT and application/service components under AGPL-3.0-only (2026-09-15)

[Retained D014](DECISIONS-through-d053.md#d014--license-reusable-components-under-mit-and-applicationservice-components-under-agpl-30-only-2026-09-15).

### D015 — Visual identity

[Retained D015](DECISIONS-through-d053.md#d015--visual-identity).

### D016: Separate qualification from publication

[Retained D016](DECISIONS-through-d053.md#d016-separate-qualification-from-publication).

### D017 — Shared TypeScript core and explicit offline qualification

[Retained D017](DECISIONS-through-d053.md#d017--shared-typescript-core-and-explicit-offline-qualification).

### D018 — Preserve saved custom metric numeric types

[Retained D018](DECISIONS-through-d053.md#d018--preserve-saved-custom-metric-numeric-types).

### D019: Qualify the installed artifact and keep the offline toolchain explicit

[Retained D019](DECISIONS-through-d053.md#d019-qualify-the-installed-artifact-and-keep-the-offline-toolchain-explicit).

### D020: Chevrotain source parsing joins the existing engine

[Retained D020](DECISIONS-through-d053.md#d020-chevrotain-source-parsing-joins-the-existing-engine).

### D021: Keep policy semantics independent of unavailable authoring dependencies

[Retained D021](DECISIONS-through-d053.md#d021-keep-policy-semantics-independent-of-unavailable-authoring-dependencies).

### D022: Keep query/check phases and desired effects semantically explicit

[Retained D022](DECISIONS-through-d053.md#d022-keep-querycheck-phases-and-desired-effects-semantically-explicit).

### D023 — Use the supplied authoring dependencies without replacing the engine

[Retained D023](DECISIONS-through-d053.md#d023--use-the-supplied-authoring-dependencies-without-replacing-the-engine).

### D024: Verify executable contracts without freezing narrative

[Retained D024](DECISIONS-through-d053.md#d024-verify-executable-contracts-without-freezing-narrative).

### D025: Keep GitHub transport small and effect evidence explicit

[Retained D025](DECISIONS-through-d053.md#d025-keep-github-transport-small-and-effect-evidence-explicit).

### D026: Keep local Git data-only without losing PR comparison identity

[Retained D026](DECISIONS-through-d053.md#d026-keep-local-git-data-only-without-losing-pr-comparison-identity).

### D027: Ship a complete native-ESM Action closure without workflow installation

[Retained D027](DECISIONS-through-d053.md#d027-ship-a-complete-native-esm-action-closure-without-workflow-installation).

### D028: Group the single product and nest prerelease sub-actions

[Retained D028](DECISIONS-through-d053.md#d028-group-the-single-product-and-nest-prerelease-sub-actions).

### D029: Keep one engine across reusable and managed application surfaces

[Retained D029](DECISIONS-through-d053.md#d029-keep-one-engine-across-reusable-and-managed-application-surfaces).

### D030: License original documentation openly while reserving product identity

[Retained D030](DECISIONS-through-d053.md#d030-license-original-documentation-openly-while-reserving-product-identity).

### D031: Allow a separate read credential for trusted Action policy

[Retained D031](DECISIONS-through-d053.md#d031-allow-a-separate-read-credential-for-trusted-action-policy).

### D032: Keep the open tool primary and the optional App complete

[Retained D032](DECISIONS-through-d053.md#d032-keep-the-open-tool-primary-and-the-optional-app-complete).

### D033: One conventional config, explicit host layers, and partial settings

[Retained D033](DECISIONS-through-d053.md#d033-one-conventional-config-explicit-host-layers-and-partial-settings).

### D034: Separate seven-day recovery from opted-in quantitative history

[Retained D034](DECISIONS-through-d053.md#d034-separate-seven-day-recovery-from-opted-in-quantitative-history).

### D035: Target Cloudflare directly with concrete portability boundaries

[Retained D035](DECISIONS-through-d053.md#d035-target-cloudflare-directly-with-concrete-portability-boundaries).

### D036: Offboard retained history without stranded access

[Retained D036](DECISIONS-through-d053.md#d036-offboard-retained-history-without-stranded-access).

### D037: Render the manual from repository Markdown through a generated, manifest-selected collection

[Retained D037](DECISIONS-through-d053.md#d037-render-the-manual-from-repository-markdown-through-a-generated-manifest-selected-collection).

### D038: Run the shared engine in the browser for the playground; replay saved reports instead of refetching

[Retained D038](DECISIONS-through-d053.md#d038-run-the-shared-engine-in-the-browser-for-the-playground-replay-saved-reports-instead-of-refetching).

### D039: Keep one stable public shell across product pages and the generated manual

[Retained D039](DECISIONS-through-d053.md#d039-keep-one-stable-public-shell-across-product-pages-and-the-generated-manual).

### D040: Make Changed the human focus and give agents a versioned compact projection

[Retained D040](DECISIONS-through-d053.md#d040-make-changed-the-human-focus-and-give-agents-a-versioned-compact-projection).

### D041: Record what the Action ships, not hashes of its inputs

[Retained D041](DECISIONS-through-d053.md#d041-record-what-the-action-ships-not-hashes-of-its-inputs).

### D042: Separate manual source identity from routes and preserve whole-source cutovers

[Retained D042](DECISIONS-through-d053.md#d042-separate-manual-source-identity-from-routes-and-preserve-whole-source-cutovers).

### D043: Give application surfaces their own top-level category

[Retained D043](DECISIONS-through-d053.md#d043-give-application-surfaces-their-own-top-level-category).

### D044: Make the App activity-first for collaborators as well as administrators

[Current D064](#d064-make-the-app-activity-first-for-collaborators-as-well-as-administrators). The draft's earlier number remains a fragment alias; its exact prior text is retained in [Decisions through D053](DECISIONS-through-d053.md#d044-make-the-app-activity-first-for-collaborators-as-well-as-administrators).

### D045: Retain named file measurements and PR lifecycle without storing source

[Current D065](#d065-retain-named-file-measurements-and-pr-lifecycle-without-storing-source). The draft's earlier number remains a fragment alias; its exact prior text is retained in [Decisions through D053](DECISIONS-through-d053.md#d045-retain-named-file-measurements-and-pr-lifecycle-without-storing-source).

### D046: Use final merged comparisons for general file activity and explicit metric names

[Current D066](#d066-use-final-merged-comparisons-for-general-file-activity-and-explicit-metric-names). The draft's earlier number remains a fragment alias; its exact prior text is retained in [Decisions through D053](DECISIONS-through-d053.md#d046-use-final-merged-comparisons-for-general-file-activity-and-explicit-metric-names).

### D047: Reinterpret history with current policy instead of multiplying policy-era dashboards

[Current D067](#d067-reinterpret-history-with-current-policy-instead-of-multiplying-policy-era-dashboards). The draft's earlier number remains a fragment alias; its exact prior text is retained in [Decisions through D053](DECISIONS-through-d053.md#d047-reinterpret-history-with-current-policy-instead-of-multiplying-policy-era-dashboards).

### D048: Make the optional PR brief selective, deterministic and lifecycle-aware

[Current D068](#d068-make-the-optional-pr-brief-selective-deterministic-and-lifecycle-aware). The draft's earlier number remains a fragment alias; its exact prior text is retained in [Decisions through D053](DECISIONS-through-d053.md#d048-make-the-optional-pr-brief-selective-deterministic-and-lifecycle-aware).

### D049: Derive visibility from GitHub and sell coordination rather than reader seats

[Current D069](#d069-derive-visibility-from-github-and-sell-coordination-rather-than-reader-seats). The draft's earlier number remains a fragment alias; its exact prior text is retained in [Decisions through D053](DECISIONS-through-d053.md#d049-derive-visibility-from-github-and-sell-coordination-rather-than-reader-seats).

### D050: Give linked policies and automatic setup a real Team consequence

[Current D070](#d070-give-linked-policies-and-automatic-setup-a-real-team-consequence). The draft's earlier number remains a fragment alias; its exact prior text is retained in [Decisions through D053](DECISIONS-through-d053.md#d050-give-linked-policies-and-automatic-setup-a-real-team-consequence).

### D051: Import recoverable history without replaying effects

[Current D071](#d071-import-recoverable-history-without-replaying-effects). The draft's earlier number remains a fragment alias; its exact prior text is retained in [Decisions through D053](DECISIONS-through-d053.md#d051-import-recoverable-history-without-replaying-effects).

### D052: Publish an explicit anonymous analytical projection for public repositories

[Current D072](#d072-publish-an-explicit-anonymous-analytical-projection-for-public-repositories). The draft's earlier number remains a fragment alias; its exact prior text is retained in [Decisions through D053](DECISIONS-through-d053.md#d052-publish-an-explicit-anonymous-analytical-projection-for-public-repositories).

### D053: Research relationship selection and chart rendering as different problems

[Current D073](#d073-research-relationship-selection-and-chart-rendering-as-different-problems). The draft's earlier number remains a fragment alias; its exact prior text is retained in [Decisions through D053](DECISIONS-through-d053.md#d053-research-relationship-selection-and-chart-rendering-as-different-problems).
