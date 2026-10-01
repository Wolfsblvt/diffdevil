# Managed App dashboard

## Meaning

This document owns the selected capability and experience of the authenticated diffdevil App: understanding repository changes, exploring pull requests and files, configuring selective PR context, and operating repositories individually or together. It describes the intended product, not a claim that its dashboard, data collection, imports, billing, or public views are already available. [Direction](DIRECTION.md) owns current availability; [App integration](integration/github-app.md) owns execution; [access and accounts](dashboard-access.md) owns permissions; [privacy and data](PRIVACY-AND-DATA.md) owns retention and processing boundaries.

The complete experience is selected independently of delivery order. This document does not select final page layouts, chart libraries, colours, exact routes, pricing, quotas, or algorithm thresholds.

## Product purpose

The App has three equally necessary jobs:

- **Understand change:** PR lifecycle, size and development; file and repository activity; historical context and relationships.
- **Shape policy:** inspect effective configuration, test proposed policies, reinterpret retained measurements, and apply changes deliberately.
- **Run it together:** shared operation, account defaults, repository administration, recovery, delegated permissions, and coordinated configuration.

The dashboard is activity-first, not an administration console with statistics attached. People who never change a setting are intended users. Settings support the analytical experience rather than defining its entrance.

The open CLI, library and Actions remain complete, independently useful ways to measure and automate diffs. The extension improves one reader's present-tense GitHub view. The App adds repository-wide operation and memory, shared context, and coordination. It does not introduce a second semantic engine or make the open product deliberately inconvenient.

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

The eventual page, drawer, ledger or other presentation is a design choice. A commit-detail destination is a later possibility, not a first-delivery commitment to general commit analytics.

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

Turnover has a concise visible explanation: **Change volume relative to file size.** It is not the percentage of unique lines rewritten and may exceed one. Its exact baseline, aggregation across a period, treatment of changing file size and repository-level denominator remain calculation-contract work. No arbitrary formula is ratified merely by the display name. New, empty, deleted, binary and unmeasurable files need explicit applicability rather than infinite, invented or misleading values.

Repository comparisons use the same principle of explicit metrics: frequency, volume, relative change and their distributions. Repository clouds and alternative comparison charts are useful for both personal and organisation accounts. An Individual plan does not lose these analytics merely because several repositories are involved.

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

Individual administration supports named reusable configurations, an account default, deliberate application to each repository and inspection of differences. A repository may remain intentionally different.

Team adds linked shared configurations. An account can choose configurations that link when adopted; repositories can link or unlink as selected. Updating a linked shared policy propagates to its linked repositories, respecting repository overrides. Settings may also queue current-policy history recalculation and refresh eligible open-PR labels and briefs.

Ordinary historical analytics show the current effective policy. Retained measurements remain unchanged; the derived view is recalculated. Do not build repository-wide policy-era dashboards as a prerequisite. Original recorded PR results remain factual historical evidence where available, separate from today's interpretation.

Only work needed by a changed setting should be queued. A brief-length change does not require reacquiring years of source; a new source-dependent metric may require new measurements or an explicitly incomplete historical range.

Rollback is not a starting feature. Administrative history must preserve attributable changes, but that does not mandate a generic rollback system. History consent, publication and delegated access are separate administrative choices; applying a named analysis policy must not silently enable additional collection or publication.

## Individual and Team capability distinction

These are product capability names, not currently published subscription offers. Prices, allowances, fair use, account bundles and paid availability remain separate commercial decisions.

Individual has the full useful analytical vocabulary, repository comparisons, dedicated detail views, named configurations, deliberate imports, policy experimentation and optional PR briefs. Its administering person performs repository setup and updates manually. Collaborators with current access can read the repository's available data without purchasing a separate subscription.

Team sells coordinated operation: linked policies, delegated administration, account-wide setup awareness, automatic adoption rules, coordinated history/open-PR refresh, and an administrative audit trail. It does not reserve the useful charts or the meaning of a diff for groups.

A single person using a personal GitHub account can choose Team for that automation. A GitHub organisation is not automatically the same as a Team subscription. Account defaults apply within their own managed account; visibility of a collaborator repository does not apply the reader's personal defaults to it.

For Individual, useful repository-local banners can offer applying a default or starting an import. For Team, account-wide awareness and explicitly selected automation can configure newly reachable repositories, link policy, and start the selected history/import behaviour. Automation follows an actual GitHub App grant and never manufactures access.

No per-member billing is selected. Capacity and workload are commercial dimensions for the later pricing decision, not hidden meters added here. Provider redelivery and the service's own recovery attempts must not become chargeable analyses.

## Historical import and open-PR scanning

Connecting an established repository should not require waiting months to obtain useful context. Support an explicit historical import of **all recoverable selected statistics** within its chosen scope and allowance.

An open-PR scan establishes today's detail views and related-work index. A historical import establishes earlier PR populations, final merged comparisons, file activity and relationships. These are distinct operations even when offered in one onboarding journey.

Imports are resumable, progressive and visibly bounded. Recent results should become useful before the complete selected import finishes. Show scope, progress, unavailable observations and coverage rather than an unsupported completion-time promise. Live PR operation takes priority over background imports and recalculation.

Use adaptive pacing against actual provider limits. Reuse sufficient retained facts and deduplicate imported/live observations. A calendar period alone does not describe the amount of work: a quiet six-month repository may cost less to import than one busy week elsewhere.

Recoverable final comparisons do not imply recoverable intermediate revisions, every lifecycle transition or an original diffdevil policy result. Squash/rebase handling, immutable comparisons, provider file limits and omitted patches need qualification on real supported acquisition paths. Unknown or partial results remain explicit.

Free use may offer bounded import; paid Individual and Team may offer deeper capacity. No counts, calendar limits, retry intervals or prices are selected here. Import does not override opt-outs, deletions or retention boundaries and does not apply historical GitHub effects.

## Public read-only publication

An authorised account administrator can explicitly publish analytical views of eligible public repositories. The account has a boolean publication default; each repository has inherit, enabled or disabled. The setting belongs prominently in administration, but is not enabled merely because a repository is public.

A published view is anonymous and read-only. It exposes permitted repository statistics, file clouds and analytical detail, not settings, billing, members' administration rights, audit records or private sibling repositories. Unpublication or repository privatisation stops public serving. See [access and accounts](dashboard-access.md) for the complete boundary.

## Remaining design and implementation decisions

The selected product still needs concrete visual design, a chart/library choice, co-change and selective-brief algorithms, a precise Turnover calculation, a qualified final-comparison/import contract, storage and workload measurements, and the later pricing/allowance design. These are owned implementation or co-design outcomes, not reasons to shrink this capability description back to pathless size statistics.

No source code, collection, migrations, live authorisation, background imports, billing, public publication or dashboard deployment is established by this document. Existing narrower source evidence remains evidence for what it actually implements.
