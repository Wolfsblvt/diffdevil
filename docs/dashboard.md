# Managed App dashboard

## Meaning

This document owns the selected capability and experience of the authenticated diffdevil App: understanding repository changes, exploring pull requests and files, configuring selective PR context, and operating repositories individually or together. It describes the intended product, not a claim that its dashboard, data collection, imports, billing, or public views are already available. [Direction](DIRECTION.md) owns current availability; [App integration](integration/github-app.md) owns execution; [access and accounts](dashboard-access.md) owns permissions; [privacy and data](PRIVACY-AND-DATA.md) owns retention and processing boundaries.

The complete experience is selected independently of delivery order. The analytical page structure and semantic presentation below are ratified; exact chart/cloud rendering, Manage/subscription UI and other undesigned surfaces remain open. This contract adopts no renderer dependency or new commercial choice.

## Product purpose

The App has three equally necessary jobs:

- **Understand change:** PR lifecycle, size and development; file and repository activity; historical context and relationships.
- **Shape policy:** inspect effective configuration, test proposed policies, reinterpret retained measurements, and apply changes deliberately.
- **Run it together:** shared operation, account defaults, repository administration, recovery, delegated permissions, and coordinated configuration.

The dashboard is activity-first, not an administration console with statistics attached. People who never change a setting are intended users. Settings support the analytical experience rather than defining its entrance.

The open CLI, library and Actions remain complete, independently useful ways to measure and automate diffs. The extension improves one reader's present-tense GitHub view. The App adds repository-wide operation and memory, shared context, and coordination. It does not introduce a second semantic engine or make the open product deliberately inconvenient.

## Ratified analytical experience

The analytical design ratified on 2026-10-09 releases six complete destinations for implementation: **Overview**, **Pull requests**, **History**, **Files**, **PR detail** and **File detail**. Repository and namespace selections scope these pages; repository detail remains a first-class analytical destination. The visible location label and trailing product action both read **App**, including on the website header. “Dashboard” describes the analytical capability, not a competing surface name.

The selected shell is dark-only for now, with an even 12-column panel grid, side navigation, the existing fixed Works header and its unchanged width, and a wide frame with side gutters. The period selection persists across pages. Panel metadata wraps rather than being ellipsized; freshness identifies the analysed comparison against the current one. Files are qualified by repository and path. Chart marks lead to contributing PRs, files or filtered lists.

Premium feature panels show their Pro/Business chip. Navigation shows paid namespace chips and the viewer's current plan in the account switcher; Free has no navigation chip and breadcrumbs carry none. A namespace's features follow that namespace's funded plan, including for a Free collaborator. Premium All-repositories aggregates follow the viewer's own plan and include only eligible premium-funded repositories, naming excluded coverage. These entitlement rules never widen repository authorisation.

Free has useful analytical panels and bounded See Pro placeholders rather than giant empty blockers. Its Files entrance can point to accessible funded namespaces and useful History; it does not expose premium file-history rows merely because base measurements are retained. Manage and future pricing links are navigation seams, not permission to invent those screens.

| Destination | Ratified analytical content |
| --- | --- |
| Overview | Merged-PR lead and period comparison; lifecycle/size facts; eligible change cloud and current PR activity; size mix, flow and repository context. Free substitutes useful change-volume and time-to-merge panels. |
| Pull requests | Analytics first: flow, lifecycle, size mix, time to merge and analysed-head development; then a searchable/filterable PR list with explicit state, size, measurement and repository. |
| History | Bucketed Changed/composition, contributing PR drill-down and period comparison with coverage. Pro adds file growth/shrinkage and concentration; Free keeps merged-PR size activity. |
| Files | Eligible frequency-first cloud with Changed/raw churn/Turnover alternatives, repository-qualified ranked files and selected-file facts/co-change. |
| PR detail | Comparison identity/freshness, lifecycle, measured facts, policy, desired and observed effects; eligible same-file context; visible excluded files and separate head-by-head development. |
| File detail | Changed, raw churn, distinct merged PRs, Turnover and size; contributions per merged PR, size trajectory, co-change and “here versus PR total”. |

Most history analytics use merged PRs in the selected period. Flow also names its opened population and 13-week context; current activity uses active PRs; co-change declares its 90-day window. Unique PRs, revisions and attempts never substitute for one another. History buckets are daily for 7 days, two-day for 30 days, weekly for 90 days and calendar months for one year; missing earlier coverage is not a fictional full year.

The selected measurement grammar makes bar height Changed and colour area its modified/added/deleted composition, with raw churn at its true scale as an outline. Bounded values show a range, not an approximate midpoint; incomplete acquisition shows a lower bound with partial coverage. Unknown size bands remain separate. Desired/proposed labels and actually observed GitHub labels remain distinguishable. This is semantic grammar; exact chart rendering remains provisional.

**Design remainder:** chart and cloud system co-design comes first, then Manage/configuration/account/subscription co-design inside this shell. Modern, authored and usable chart interaction is core product design, not later cosmetic polish. Prototype SVGs or framework defaults must not become accepted aesthetics through implementation. Non-conflicting architecture, routes, data and shell work can continue. Renderer adoption, light theme, phone-width design, public/operator views and the other undesigned states remain separate; this document does not claim an exercised production journey.

## Destinations and ordinary journeys

### Signed-in home

A person may sign in with GitHub without owning an installation or buying a subscription. The home brings together currently accessible, connected repositories and their relevant activity. Its totals, clouds and comparisons use only that reader's authorised repository population. An inaccessible repository must not remain indirectly visible through a total or summary.

A collaborator can move directly from a PR brief to the corresponding PR detail. The ordinary entrance must not require understanding installation IDs, configuring an account, or entering an administrator-only control room. Administrators additionally receive relevant operating and setup information.

Listing unconnected private repositories is not a first-delivery requirement. Linking to GitHub's repository or installation selection remains a valid entry route. A sign-in session must not be assumed to provide an inventory outside its actual authorisation.

### Repository detail

A repository opens on activity and useful context: PR populations, changes through time, file activity and relationships, coverage, and relevant current work. Its settings and operation views remain separate destinations available to authorised people.

### Pull-request detail

Each PR has a dedicated detail destination containing its immutable comparison identity, current measured facts, evidence, policy interpretation, file contributions, lifecycle observations, historical context and related open work. It is the complete destination behind the intentionally selective brief.

Facts, configured decisions, desired effects, performed requests and observed GitHub results stay distinguishable. Current policy is the default interpretation. Where an original merge-time result was actually retained, the view can indicate a changed policy and switch between the current interpretation and that recorded result. Imported history must not invent an App result from before the App observed it.

### File detail

Each file has a dedicated detail destination for change frequency, volume, Turnover, growth or shrinkage, history, related files or components, and contributing merged PRs. A cloud or other overview leads into this object rather than stopping at a decorative label.

Retained rename observations and immutable references support continuity where established. Ambiguous identity, deletion, unavailable content and historical gaps remain visible. A current path is not automatically the identity of every earlier file with that spelling.

The ratified analytical experience includes a File detail page. A commit-detail destination is a later possibility, not a first-delivery commitment to general commit analytics.

## Two distinct analytical subjects

PR lifecycle and file activity receive equal treatment. They share measurements where appropriate but answer different questions and do not silently substitute populations.

### PR lifecycle and development

Retain observable creation/opening, draft and ready-for-review transitions, closure, reopening and merge facts with their event times and comparison references. Useful views include PR volumes and size distributions, open populations, development of a PR's size or breadth, and elapsed time in states where evidence exists.

Elapsed time is not development effort, review labour or an individual's speed. Missing transitions do not become zero-duration stages. Event occurrence time, observation time and import time are different facts.

Unique PRs, analysed revisions and execution attempts are separate counts. Reprocessing or webhook redelivery does not add another PR. Successive snapshots are not summed as code delivered.

### Merged-PR foundation for file activity

General file and repository historical statistics use one final recoverable comparison per merged PR, assigned to its merge-time population. An importer or live collector must bind that comparison to known immutable references and evidence. A latest open-PR snapshot is not silently substituted for a final merged result.

Open-PR development remains available in its own analytical subject. A separate current open-PR index supports overlap awareness. It does not require an archive of every intermediate file edit.

This population is explicitly merged-PR activity. It is not all target-branch change: direct pushes and general branch/commit-throughput capture are outside the selected starting scope. A later expansion must state its own population and avoid double-counting imported and live observations.

## File and repository measurements

A shared measured foundation supports several explicit metrics, not a blended hotness score.

| Metric | Meaning and use |
| --- | --- |
| Change frequency | Number of distinct merged PRs touching the file in the selected period. Default weight for the prominent file cloud. |
| Change volume | Replacement-aware Changed lines accumulated across the selected final merged-PR comparisons. Raw additions, deletions and churn remain separate selectable facts. |
| Turnover | Change volume relative to file size, displayed as a multiple such as `1.8×`. |
| Growth or shrinkage | Defined net additions/deletions or size movement, kept distinct from repeated replacement activity. |
| Breadth and concentration | How changes distribute across files or components instead of reducing every change to one total. |
| Co-change | Observable frequency and strength of files or components appearing together, with contributing PRs and sample context. |

**turnover-v1 is adopted:** replacement-aware Changed in the selected period divided by the file's time-weighted average size during that period, displayed as a multiple such as `1.8×`. Its brief explanation remains **Change volume relative to file size**; it is not the percentage of unique lines rewritten and may exceed one. Bounded Changed produces a Turnover range. A file created or deleted during the period shows `n/a` with that reason. Zero-size, binary or unavailable size evidence must state applicability rather than yield infinity or an invented denominator. This file definition does not invent a repository-level denominator.

Repository comparisons use the same principle of explicit metrics: frequency, volume, relative change and their distributions. Repository clouds and alternative comparison charts are useful for both personal and organisation accounts. An Pro plan does not lose these analytics merely because several repositories are involved.

Repositories need not be ranked as better or worse. Metrics describe change, not risk, complexity, importance, quality or productivity.

## Chart and exploration capabilities

Word clouds are a prominent analytical entrance, not a novelty fallback. Their default weight is change frequency. Other supported metrics may change the weight without changing the underlying meaning of the selected metric. Exact values and links to the corresponding file or repository remain available.

The intended chart family includes time-series activity, lifecycle populations, distributions and baselines, file and repository clouds, concentration/breadth, relative-change comparisons, and focused co-change exploration. A selected file's change neighbourhood is a promising interaction, not a ratified visual composition or a requirement to show the entire repository as a network.

Users can filter, select a metric, change scope or period, compare compatible populations, and drill from an overview into a PR or file and its contributing evidence. These capabilities must not require authoring arbitrary SQL or learning a chart-specification language.

The chart library is an implementation selection still to be researched against this complete vocabulary. A previous renderer recommendation is not automatically sufficient for word clouds, linked exploration and relationship views. Prefer maintained rendering and interaction capabilities over hand-building a general chart system.

The application owns measurements, filtering meaning, authorisation, coverage and aggregation. A chart is one projection alongside concise text, accessible values and exports. Unknown data is not zero; bounded values are not plotted as exact midpoints; gaps are not interpolated into false continuity. Compact labels carry the immediate meaning, while details and documentation carry full definitions.

## Selective PR brief

### Purpose and configuration

The optional brief brings useful repository memory into ordinary PR reading. It is best-effort and deliberately selective, not a complete report and not a claim to contain everything a reviewer should know.

An administrator selects eligible information types and their priorities, conditions and compactness through bounded settings such as checkboxes, toggles and sliders. Selection is deterministic. No language model or new template engine is required. Advanced implementation must not turn basic configuration into programming.

Possible observations include:

- the current PR's size and repository baseline;
- recent activity of a selected changed file;
- another open PR touching the same file or defined component;
- a historical companion file that this PR does not change.

A representative concise result might combine the size line with two or three contextual observations and a link to full PR detail. This is an illustration, not a frozen line count or layout.

The relevance algorithm chooses useful observations, limits redundant coverage and suppresses unhelpful lines. A PR touching many files must not produce one observation per file. The ranking, thresholds, minimum samples, broad-change influence and tie-breaking require a bounded algorithm design; no specific scoring formula is selected here.

### Historical companions and current neighbours

A statement such as “This file often changes with these tests that this PR does not change” describes an observed relationship. It is not a claim that the tests should be edited, a missing-test diagnosis or merge advice.

A statement that another open PR has 67 Changed lines in the same file describes that other PR's per-file change volume. It does not mean that 67 identical lines overlap, that a conflict exists, or that GitHub's mergeability analysis has been reproduced.

The first capability is same-file or explicitly defined component awareness. Line-overlap or semantic conflict detection would be a separate expansion.

### Comment lifecycle

When the ordinary size report is enabled, the brief joins the same owned comment. It must not create a competing second ongoing report. The underlying portable owned-comment and label features remain unchanged.

Refresh affected open PRs when their own comparisons change, when relevant neighbouring open PRs change, when an applicable policy or brief configuration changes, and after reopening. Update the existing owned comment only when its meaningful content changes.

Do not keep refreshing comments on closed or merged PRs. A separate optional setting may publish a final summary when a PR merges. That explicit final event is distinct from ongoing refresh after closure.

A historical import has no authority to post comments, update labels or create retroactive final summaries. Publicly posted brief content must be appropriate for the PR's actual audience; a protected dashboard link does not protect text already disclosed in the comment.

Brief settings are App-only and may be shared with the App's named configuration. They are not a new `.diffdevil.yml` template or configuration surface.

## Co-change research boundary

A deterministic relationship can begin with merged-PR file sets, pair counts and conditional frequency, then account for each companion's background frequency. Useful output explains the relationship with sample counts and contributing PRs rather than publishing a synthetic risk score.

Broad formatting/refactoring PRs, ubiquitous files, tiny edits, low sample counts, asymmetric relationships, changing policy exclusions and component definitions require research before selecting weighting. Downweighting changes below five lines was an exploratory possibility, not an accepted threshold. Excluding very small or very large observations is likewise not settled.

Retain the measurement evidence independently of a chosen relationship ranking. Co-change weighting must not quietly alter the ordinary frequency or volume counts. Policy-excluded files stay out of ordinary views while their permitted measurements remain available for reinterpretation.

Algorithm research and chart-renderer research are separate contributions: one defines useful relationships and selective facts; the other chooses how to render and explore those facts.

## Configuration and policy changes

Repository-owned trusted `.diffdevil.yml` values remain authoritative over App defaults. Show the chosen App configuration, the resolved effective policy, each setting's origin and which values the repository file overrides. Bulk application must not claim to change values that remain overridden.

Pro administration supports one personal default and one per connected organisation, deliberate application to each repository and inspection of differences. A repository may remain intentionally different.

Business adds linked shared configurations. An account can choose configurations that link when adopted; repositories can link or unlink as selected. Updating a linked shared policy propagates to its linked repositories, respecting repository overrides. Settings may also queue current-policy history recalculation and refresh eligible open-PR labels and briefs.

Ordinary historical analytics show the current effective policy. Retained measurements remain unchanged; the derived view is recalculated. Do not build repository-wide policy-era dashboards as a prerequisite. Original recorded PR results remain factual historical evidence where available, separate from today's interpretation.

Only work needed by a changed setting should be queued. A brief-length change does not require reacquiring years of source; a new source-dependent metric may require new measurements or an explicitly incomplete historical range.

Rollback is not a starting feature. Administrative history must preserve attributable changes, but that does not mandate a generic rollback system. History consent, publication and delegated access are separate administrative choices; applying a named analysis policy must not silently enable additional collection or publication.

## Pro and Business capability distinction

The current hosted names are Free, Pro and Business. Free supplies basic PR/repository history; Pro adds premium file-history exploration and context; Business adds coordination. The complete commercial settlement is carried by the companion plans/management proposal, not selected again here. These are developing capabilities, not a currently available paid service.

Pro has the full useful analytical vocabulary, repository comparisons, dedicated detail views, per-scope defaults, deliberate imports, policy experimentation and optional PR briefs. Its administering person performs repository setup and updates manually. Collaborators with current access can read the repository's available data without purchasing a separate subscription.

Business sells coordinated operation: linked policies, delegated administration, account-wide setup awareness, automatic adoption rules, coordinated history/open-PR refresh, and an administrative audit trail. It does not reserve the useful charts or the meaning of a diff for groups.

A single person using a personal GitHub account can choose Business for that automation. A GitHub organisation is not automatically the same as a Business subscription. Account defaults apply within their own managed account; visibility of a collaborator repository does not apply the reader's personal defaults to it.

For Pro, useful repository-local banners can offer applying a default or starting an import. For Business, account-wide awareness and explicitly selected automation can configure newly reachable repositories, link policy, and start the selected history/import behaviour. Automation follows an actual GitHub App grant and never manufactures access.

No per-member billing is selected. Settled prices and plan allowances belong to the companion plans/management contract; numeric monthly import budgets remain launch configuration, not hidden meters added here. Provider redelivery and the service's own recovery attempts must not become chargeable analyses.

## Historical import and open-PR scanning

Connecting an established repository should not require waiting months to obtain useful context. Support an explicit historical import of **all recoverable selected statistics** within its chosen scope and allowance.

An open-PR scan establishes today's detail views and related-work index. A historical import establishes earlier PR populations, final merged comparisons, file activity and relationships. These are distinct operations even when offered in one onboarding journey.

Imports are resumable, progressive and visibly bounded. Recent results should become useful before the complete selected import finishes. Show scope, progress, unavailable observations and coverage rather than an unsupported completion-time promise. Live PR operation takes priority over background imports and recalculation.

Use adaptive pacing against actual provider limits. Reuse sufficient retained facts and deduplicate imported/live observations. A calendar period alone does not describe the amount of work: a quiet six-month repository may cost less to import than one busy week elsewhere.

Recoverable final comparisons do not imply recoverable intermediate revisions, every lifecycle transition or an original diffdevil policy result. Squash/rebase handling, immutable comparisons, provider file limits and omitted patches need qualification on real supported acquisition paths. Unknown or partial results remain explicit.

Free use may offer bounded import; paid Pro and Business may offer deeper capacity. No counts, calendar limits, retry intervals or prices are selected here. Import does not override opt-outs, deletions or retention boundaries and does not apply historical GitHub effects.

## Public read-only publication

An authorised account administrator can explicitly publish analytical views of eligible public repositories. The account has a boolean publication default; each repository has inherit, enabled or disabled. The setting belongs prominently in administration, but is not enabled merely because a repository is public.

A published view is anonymous and read-only. It exposes permitted repository statistics, file clouds and analytical detail, not settings, billing, members' administration rights, audit records or private sibling repositories. Unpublication or repository privatisation stops public serving. See [access and accounts](dashboard-access.md) for the complete boundary.

## Remaining design and implementation decisions

The analytical pages and file turnover-v1 are ratified. The selected product still needs chart/cloud co-design, then Manage/subscription design, renderer qualification, co-change and selective-brief algorithms, qualified final-comparison/import acquisition, storage/workload measurements and commercial integration. These are owned implementation or co-design outcomes, not reasons to shrink this capability description back to pathless size statistics.

No source code, collection, migrations, live authorisation, background imports, billing, public publication or dashboard deployment is established by this document. Existing narrower source evidence remains evidence for what it actually implements.
