# Managed App dashboard

## Meaning

This document owns the selected analytical and operating experience of the developing diffdevil App. It is not a claim that the dashboard, imports, premium capabilities, billing or public views are already available. [Direction](DIRECTION.md) owns current evidence; [plans and editions](app-plans.md) owns the accepted commercial boundary; [access](dashboard-access.md), [management](app-management.md), [privacy/data](PRIVACY-AND-DATA.md) and [App integration](integration/github-app.md) own their respective contracts.

The complete destination is independent of the first delivery order. The analytical page structure and semantic presentation below are ratified; exact chart/cloud rendering, Manage/subscription UI and other undesigned surfaces remain open. This contract adopts no renderer dependency or new commercial choice.

## Product purpose

The App has three joined jobs: **Understand change**, **Shape policy** and **Run it together**. Its ordinary entrance is activity-first, not an administrator's control room with statistics attached. People who never change a setting are intended users.

The open CLI, library, Actions, extension and playground remain independently useful. The App uses the same semantic engine and adds repository-wide memory, historical context and coordinated operation. The Free/Community basic experience is useful on its own; Pro adds the historical file product and Business adds coordination. Do not narrow the open engine to create that distinction.

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

Anyone can sign in with GitHub and read connected repositories they currently may access, including repositories funded by somebody else. The home combines their authorised activity, repository comparisons and eligible premium views. It is not necessary to own an installation or buy a reader seat.

Authorise the population before computing totals and relationships. Hiding a private repository name while keeping its numbers in the total is not sufficient. Mixed entitlement and coverage must be explicit; unavailable premium data is not zero.

Administrators have relevant management navigation, but Pro does not receive a global policy-drift inventory or unsynchronised-repository hints. Those are Business coordination, not ordinary analytical comparisons.

Listing private repositories outside the current installation grant is not a first-delivery requirement. A useful GitHub installation/repository link remains valid; sign-in alone must not be assumed to enumerate everything.

### Repository detail

Open on PR activity and useful context, with entitled file history, coverage and current related work. PR lifecycle and file activity deserve distinct substantial treatment. Settings and processing are separate destinations, available according to authority.

A premium word cloud is a prominent analytical entrance. It leads into a file or repository and its contributing observations, rather than ending at a decorative label.

### Pull-request detail

A direct brief link opens that PR's dedicated view. It includes immutable comparison identity, raw and replacement-aware facts, file contributions, lifecycle, evidence, policy interpretation and eligible context.

Measured facts, configured judgments, desired effects, attempted writes and observed GitHub outcomes remain distinct. Current-policy interpretation is the normal view once recalculated. While a refresh is pending, identify the displayed basis. Where an original merge-time result was actually retained, offer a concise indication and switch to it. Imported PRs do not acquire fictional original App results.

Base PR facts stay useful while premium enrichment is pending. A paid historical file feature must not conceal ordinary current-PR facts such as its file count or measured Changed.

### File detail

Pro/Business and applicable repository grants supply a dedicated historical file view: change frequency, volume, Turnover, growth/shrinkage, contributing merged PRs and relationships with other files/components.

Observed renames and immutable references support continuity only where established. Identical path spelling does not prove that two observations are the same historical file. Deletion, binary/empty data, unavailable evidence and identity gaps remain visible.

The ratified analytical experience includes a File detail page. A commit-detail destination is a later possibility, not a commitment to a general commit-analytics subsystem.

## Two distinct analytical subjects

### PR lifecycle and development

Retain observable creation/opening, draft/ready, closure/reopening and merge facts with provider event time, observation time and import provenance. Support PR volumes, sizes, open populations, size/breadth development and elapsed state duration where the transitions are known.

Elapsed time is not development effort, review labour or someone's speed. Missing transitions are not zero-duration stages. Unique PRs, analysed revisions and service attempts are separate counts; evolving snapshots are not summed as code delivered.

### Merged-PR foundation for file activity

General file/repository history uses one final recoverable comparison per merged PR, assigned to its merge-time population. Qualify its immutable reference and evidence across supported merge, squash and rebase paths. The latest observed open head is not silently substituted for the final comparison.

A separate current open-PR file index supports related-work awareness without retaining every intermediate file edit. Open-PR development has its own population.

These metrics describe merged-PR activity, not all target-branch changes. Direct pushes and general all-branch/commit throughput remain outside the selected starting scope. Live and imported observations share identities so they cannot double-count one PR.

## File and repository measurements

| Metric | Meaning |
| --- | --- |
| Change frequency | Distinct merged PRs touching the file in the selected period; default cloud weight. |
| Change volume | Replacement-aware Changed over the selected final comparisons; raw additions, deletions and churn remain separate facts. |
| Turnover | Change volume relative to file size, shown as a multiple such as `1.8×`. |
| Growth or shrinkage | Defined net addition/deletion or size movement, not repeated replacement activity. |
| Breadth and concentration | Distribution of change across files or components. |
| Co-change | Observed files/components appearing together, with sample context and contributing PRs. |

**turnover-v1 is adopted:** replacement-aware Changed in the selected period divided by the file's time-weighted average size during that period, displayed as a multiple such as `1.8×`. Its brief explanation remains **Change volume relative to file size**; it is not the percentage of unique lines rewritten and may exceed one. Bounded Changed produces a Turnover range. A file created or deleted during the period shows `n/a` with that reason. Zero-size, binary or unavailable size evidence must state applicability rather than yield infinity or an invented denominator. This file definition does not invent a repository-level denominator.

Repository comparisons use explicit measures too. A personal Pro account can compare its repositories and use the supported repository clouds; these analytics do not require Business merely because several repositories are involved.

No synthetic hotness, risk, quality, complexity, importance or people-productivity score is selected.

## Charts and exploration

Clouds remain prominent and frequency-weighted by default. Other supported metrics can change weight; exact values, disambiguated identities and drill-down remain accessible.

The intended family includes activity time series, lifecycle populations, distributions/baselines, file and repository clouds, breadth/concentration, relative-change comparisons and focused co-change. A selected file's relationship neighbourhood is useful design material, not a mandate to draw a whole-repository network.

Users can change scope, period and metric, compare compatible populations, filter/select and drill into a PR or file without writing SQL or learning a chart language. The renderer must support the complete vocabulary, not demote clouds because an ordinary chart package cannot draw them.

The application owns authorisation, measurements, aggregation, coverage and evidence. Charts, concise text, accessible values and exports are projections of that meaning. Unknown is not zero, bounded values are not exact midpoints and missing history is not interpolated continuity. Compact captions should not repeat a full metric definition.

## Selective PR brief

### Purpose and configuration

The optional brief brings useful repository context into normal PR reading. It is deliberately selective, not a complete review or a claim to mention every relevant fact.

Bounded controls choose eligible modules, priorities, conditions and compactness. Selection is deterministic, with no language model or new template engine. The existing portable comment-template feature remains separate.

The size report remains basic value. Premium modules can add recent file activity, another open PR touching the same file/component, a historical companion absent from this PR and compatible repository context. The algorithm selects useful observations rather than printing a row for every changed file. Ranking, minimum support, broad-change influence and tie-breaking still need their own contract.

### Historical companions and current neighbours

“This file often changes with these tests that this PR does not change” is an observation, not a missing-test diagnosis or instruction to edit tests.

“67 Changed in the same file” describes the other PR's measured volume, not 67 overlapping positions or a predicted merge conflict. Same-file/component awareness is the selected capability; line-overlap and semantic conflict detection are separate potential expansions.

### Comment lifecycle

When the size report is enabled, context joins that same owned comment rather than creating a second recurring report. Refresh affected open PRs after own-comparison changes, relevant neighbouring changes, applicable policy/brief changes and reopening. Write only meaningful changes.

Do not keep editing closed or merged replies. An optional final merge summary is a separate explicit event. Imports never post historical comments, labels or final summaries.

Public brief text must fit its actual audience. A protected dashboard link does not make private sibling context safe to post. Unavailable premium context must not break an otherwise valid basic size report.

Brief settings are App-only and may travel with its configured policy; they do not create another `.diffdevil.yml` language.

## Co-change calculation boundary

A deterministic relation may use merged file sets, pair counts, conditional frequency and companions' background frequency, with sample counts and contributing evidence. Broad refactors, ubiquitous files, tiny changes, sparse observations, asymmetry, renames, exclusions and components need careful algorithm design.

No less-than-five-lines cutoff or automatic exclusion of very broad changes is selected. Relationship weighting must not erase the foundation or change ordinary frequency/volume counts. Policy-excluded observations remain retained but excluded from the ordinary view.

Algorithm design and chart selection are distinct: one selects useful facts and relationships; the other renders and explores them.

## Policy and history interpretation

Trusted `.diffdevil.yml` values retain precedence over App defaults. Show configured and effective values and their origins. Neither manual nor bulk application may claim to change a value still overridden by the repository.

Pro has one reusable personal default and one for each connected organisation. A repository settings page shows its appropriate default, differences and deliberate application action. Repository-specific custom configuration remains valid. No Pro bulk application, named shared-policy library or global drift hints are selected.

Business adds named linked policies, per-scope defaults, automatic eligible setup, delegated administration and coordinated updates. Link/unlink choices remain explicit. History consent and publication are independent choices even when the account authorises automation for new repositories.

Free and Pro can manually request current-policy replay for a repository. History-enabled Free retains the base paths and numerical file observations, including excluded files, needed for supported replay. Retention of these rows does not supply premium historical exploration.

Recalculation changes a derived interpretation, not immutable observations or original GitHub effects. Only necessary work is queued: changing brief compactness does not reimport source history. Newly source-dependent metrics may need additional acquisition or declare incomplete historical coverage.

No repository-wide policy-era warehouse or initial rollback UI is required. Audit retains meaningful administrative changes for its own purpose.

## Historical import and processing management

Connecting an established repository should provide progressively useful context rather than require months of prospective collection. Import all recoverable selected statistics within the chosen scope and allowance. Open-PR scans establish current detail/related-work, while historical imports establish earlier final comparisons and lifecycle evidence.

Free imports up to 100 recent PRs per selected repository import. Paid import prioritises useful recent coverage, then older history. Monthly account import allowances are bounded but their numeric values remain launch configuration, not invented here. No live PR spends that import allowance.

Jobs are resumable and visibly scoped. Show completed ranges, partial/unavailable observations and actual policy basis. Live work takes priority; enrichment, older import and recalculation may lag or pause under sustained usage. Keep durable job progress independent of execution-message lifetime.

Respect actual provider limits from the first useful delivery. More sophisticated proactive priority/headroom management can follow observed use; it does not create an exemption from rate limits meanwhile.

Imports do not reconstruct vanished intermediate revisions or fictional original effects. Qualify supported final comparisons, truncation and unavailable patches. Deduplicate live/import work and honour disabled/deleted ranges. A larger subscription does not silently refill a deliberate deletion.

## Management, publication and delivery

[Account management](app-management.md) specifies repository selection, organisation funding, processing views, authoritative upgrade/add-on quotes and term-end downgrade/archive behaviour. [Plans](app-plans.md) specifies Free/Pro/Business and Community, the preview and OSS grant.

An administrator can publish anonymous read-only analytical views for eligible public repositories using an account boolean and repository inherit/enabled/disabled override. Public visibility does not itself opt in. Published data follows repository entitlement and excludes settings, billing, audit, delegation and private sibling context. Unpublishing or privatisation stops serving the projection.

A separate internal operator view needs service usage, processing health and cash-economics visibility with scoped agent support. It is not the customer's Business audit and not the ordinary analytical entrance. Optional news/feedback consent remains separate from necessary service messages.

The analytical pages and file turnover-v1 are ratified. The selected product still requires chart/cloud co-design, then Manage/subscription design, renderer qualification, co-change/brief algorithms, acquisition/storage qualification, operational tuning and shared commercial integration. Those implementation questions do not reopen settled pricing or shrink the product to the old pathless backend. No live effect or available paid service follows from this document.
