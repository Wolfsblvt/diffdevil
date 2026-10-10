# diffdevil Decisions

## Meaning

This records product/repository choices whose rationale cannot be reconstructed cheaply from source. D044 preserves independent release families, D064–D073 carry the ratified analytical product, and D054–D063 carry the accepted edition, plan, funding and management settlement of 2026-10-02. D056 also carries the purpose-bound GitHub service-connection settlement of 2026-10-10. D078 and D079 carry the App's premium-interface permission and its App-family release channel of 2026-10-10. These are selected product direction, not evidence that billing, collection or the expanded dashboard is live.

The complete predecessor record is preserved byte-for-byte as [Decisions through D073](DECISIONS-through-d053.md), with its existing references to the complete D001–D043 record. Earlier headings remain below to preserve fragment destinations. A new decision supersedes only its named boundary; it does not erase the previous rationale or implementation evidence.

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

## D078: Let independent premium modules join the AGPL App through two named interfaces

**Status:** Direction by Wolf, 2026-10-10 (quoted below): outside contributions and the private paid edition must coexist without a contributor-rights programme. The section 7 mechanism, its exact wording, its all-recipient scope and the narrow application bridge are the diffdevil Leads' selection under that direction: product and packaging judgment by Nyxara, technical acceptance by Katja, 2026-10-10. The wording is accepted as the project licence candidate; it is not legal-professional certification. Numbered after D074–D077, which in-flight App source already uses.

**Decision.** The managed App program (`apps/github-app/`, `apps/shared/` and `apps/app/` where present) is licensed `AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0`. The [premium-interface permission](../LICENSES/AdditionRef-diffdevil-premium-interface-exception-1.0.txt) is an AGPLv3 section 7 additional permission: an independent module under other terms may join the App only through the Premium Service Interface (the optional `premium` argument of `createAnalyticalDataService`) and the Premium Application Interface (the extension resolved from `@diffdevil/premium-app` and `@diffdevil/premium-styles`, whose brief provider the managed-App Worker also resolves from `@diffdevil/premium-brief`), as a version Wolfsblvt Works publishes declares them, without becoming AGPL solely because of that combination. The App program and every modification of it stay AGPL, including the section 13 source offer. Copied or derived App code is never an independent module. Each version declares the exact files of each interface in `release.json`'s `premiumSeam`; current `main` declares `null` because the interfaces arrive with the Community App source.

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
