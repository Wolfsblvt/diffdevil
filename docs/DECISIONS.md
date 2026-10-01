# diffdevil Decisions

## Meaning

This document records product and repository choices whose rationale cannot be reconstructed cheaply from code. It distinguishes selected direction from current implementation and from open research. The complete earlier D001–D043 record is preserved byte-for-byte in [Decisions through D043](DECISIONS-through-d043.md), in the same directory so its relative references keep their meaning. The earlier decision headings below retain their existing fragment destinations and link to that complete record. A later decision supersedes only the boundary it explicitly names.

The dashboard decisions below were selected in owner co-design on 2026-10-01. They are product direction and documentation, not evidence of new runtime implementation, data collection, public service availability or a commercial offer. [Dashboard capabilities](dashboard.md), [access](dashboard-access.md) and [privacy](PRIVACY-AND-DATA.md) carry the maintained joined contracts. Private conversation records and pricing hypotheses are intentionally not copied here.

## D044: Make the App activity-first for collaborators as well as administrators

**Status:** Selected product direction, 2026-10-01; implementation remains separate.

**Decision.** The signed-in home presents authorised repository activity. Repository, PR and file details are first-class analytical destinations. Administration is a separate capability, not the entrance everyone must use. PR lifecycle/development and file activity receive equal treatment.

**Why.** A collaborator who never configures an installation still benefits from its accumulated repository context. The optional PR brief needs a complete detail destination, and a file cloud needs somewhere useful to lead. An administrator-first control room would subordinate the product's daily value to setup and recovery.

**Superseded.** The earlier control-room-first hierarchy as the permanent dashboard experience. Operational attention and configuration remain selected, but support the analytical entrance. Final layout, routes-as-experienced and visual compositions remain design work.

## D045: Retain named file measurements and PR lifecycle without storing source

**Status:** Selected, 2026-10-01; old pathless source is not upgraded by this decision.

**Decision.** After explicit history enablement, retain repository names, filenames, relative paths, numerical file measurements, comparison identity, observed rename continuity and PR lifecycle facts. Retain permitted measurements for policy-excluded files while excluding them from ordinary analytics. File contents and patches may be processed transiently, then discarded, including from incidental logs, queues and caches.

**Why.** Useful file frequency, Turnover, co-change, detail views and policy reinterpretation require durable file identity and lifecycle. The old within-analysis anonymous rows cannot provide these outcomes. A blanket pathless boundary would make an implementation shortcut the product ceiling.

**Superseded.** D034's pathless-only/no-filename restriction and its prohibition on durable file identity, and the corresponding former Vision/privacy wording. D034's separate recovery/history consent and D036's deletion/offboarding protections remain. Named history does not silently widen the old numeric-only post-access-loss grace exception.

**Rejected.** Retaining source, contributor-performance dimensions or complete reports; treating filenames as anonymous; installation automatically enabling history; or making a filename-free mode a prerequisite to useful first delivery. A future opt-out must disclose missing historical coverage.

## D046: Use final merged comparisons for general file activity and explicit metric names

**Decision.** General file/repository history uses one final recoverable comparison per merged PR. Open PR development and revisions remain a separate subject. Change frequency, volume, growth/shrinkage, concentration and Turnover are distinct metrics. Prominent word clouds default to distinct merged-PR change frequency. Turnover is displayed as a multiple, with a short explanation and a separately specified calculation contract.

**Why.** The selected population is understandable and avoids counting every evolving snapshot as delivered change. Frequency provides a useful cloud without making file size the automatic dominant signal. Concise names support reading; exhaustive wording belongs in details and documentation.

**Superseded.** `latest-observed-in-window` as the permanent product-wide baseline once actual lifecycle/final-comparison evidence exists. That remains an honest name for older source data and must not be relabelled as merged history. Direct pushes and general branch-throughput collection are not added to the starting scope.

**Open.** Exact Turnover baseline/aggregation, final-comparison acquisition and renamed-file edge cases require qualification. No percentage-of-unique-lines-rewritten claim or hotness/quality score is selected.

## D047: Reinterpret history with current policy instead of multiplying policy-era dashboards

**Decision.** Ordinary analytics uses current effective policy over retained measurements. A PR detail may additionally show its actually recorded original merge-time result with an understandable switch when it differs. Repository-owned trusted `.diffdevil.yml` keeps precedence over App defaults, with visible origins and overrides.

**Why.** Users need the current view of repository activity, not a parallel repository-wide dashboard for every previous policy. Retaining excluded measurements enables honest reinterpretation without treating a filter as irreversible data loss.

**Rejected.** Overwriting historical provider actions, inventing an original result for imported PRs, reversing repository precedence, or building rollback and whole-repository policy time travel as prerequisites. Unsupported source-dependent recalculation reports its limitation.

## D048: Make the optional PR brief selective, deterministic and lifecycle-aware

**Decision.** A bounded configurable brief selects useful context, joins the existing owned size comment when enabled and links to full PR detail. Settings choose modules, priorities, conditions and compactness without an LLM or new template engine. Refresh affected open PRs on own, neighbour and policy changes and after reopening. Do not keep updating closed replies. A separate optional final summary may be posted on merge.

**Why.** Repository memory is most useful when it informs the next PR without requiring another dashboard visit. A short selection is more useful than an exhaustive statistics dump. Current same-file work and historical companions supply context without diagnosing conflicts or instructing people to edit files.

**Boundaries.** Same-file change counts are not overlapping-line counts. Brief settings are App-only, not new `.diffdevil.yml` fields. Historical import never writes old PR labels/comments. Public brief text obeys the PR audience independently of its dashboard link.

## D049: Derive visibility from GitHub and sell coordination rather than reader seats

**Decision.** Anyone may sign in. Current collaborators can read the capabilities available for their connected repositories without their own subscription. GitHub visibility remains the ceiling; Team cannot grant access to otherwise inaccessible private repositories. Individual administration is manual with complete useful analytics. Team adds delegation, linked shared policy, coordinated refresh, account-wide automation and an administrative audit.

**Why.** The reader and the administrator are different users of the same product. Charging for repeated coordination avoided is a coherent value proposition; withholding useful analytics or billing every reader would work against adoption.

**Consequences.** Personal GitHub accounts may use Team, including a solo maintainer. Account defaults stay account-scoped. Native GitHub powers remain outside diffdevil's permission controls. A protected aggregate includes only repositories its reader may access. Per-member/seat billing is not selected; exact managed-account subscription bundles remain pricing work.

## D050: Give linked policies and automatic setup a real Team consequence

**Decision.** Individual uses named/default configurations through deliberate per-repository application and difference inspection. Team may link repositories to shared settings, propagate edits, queue selected current-policy recalculation and refresh open labels/briefs. Explicit account automation can configure newly reachable repositories and start selected history/import behaviour. Both personal and organisation accounts support the applicable model.

**Why.** Team buys operational leverage even when one person runs many repositories. A reused copy only saves initial setup; a maintained link removes recurring coordination. Automation should perform the selected setup rather than recreate the same manual confirmation on every repository.

**Boundaries.** Automation follows real GitHub App reach. Policy choice does not silently grant history collection, publication or permissions. Individual retains the same underlying analytical and manual operating capabilities. No rollback feature is required by this decision.

## D051: Import recoverable history without replaying effects

**Decision.** Support explicit open-PR scans and progressive, resumable historical imports of all recoverable selected statistics. Recent results can become useful while a larger import continues; live PR work has priority. Imported and live observations deduplicate. Imported final facts do not invent vanished intermediate states or original App results.

**Why.** Existing repositories should obtain useful context without waiting months. Calendar age alone does not measure acquisition work, so allowances need workload evidence rather than an assumed cost per month.

**Boundaries.** No retroactive replies or labels, no implicit resurrection of deleted/disabled ranges, no completion-time guarantee and no new quotas in this decision. Revised free/paid import capacity and cost belong to pricing co-design.

## D052: Publish an explicit anonymous analytical projection for public repositories

**Decision.** An account has a boolean publication default and repositories use inherit/enabled/disabled. Only public GitHub repositories are eligible. Publication is explicit and the resulting read-only analytical view requires no account. Unpublication or repository privatisation stops serving it.

**Why.** A public cloud and file/PR context can help people explore an open-source codebase. Requiring sign-in for intentionally public data adds friction without changing the intended audience.

**Boundaries.** The public view is not an unlocked administrator session. It excludes settings, audit, members' administrative rights, billing and private sibling facts. A public repository is not automatically published. Previously copied public data cannot be recalled from readers.

## D053: Research relationship selection and chart rendering as different problems

**Decision.** Co-change and selective-brief relevance require deterministic algorithm design with sample, background-frequency, broad-change and tiny-edit treatment. Renderer research separately selects maintained charts/word-cloud/relationship tooling supporting filtering, switching metrics, linked exploration and accessible evidence. Owner-led design determines the final compositions.

**Why.** A rendering library does not decide which observation is useful, and a pair-count algorithm does not choose a usable interactive chart. Keeping the questions distinct prevents a convenient library or a first scoring idea from becoming accidental product meaning.

**Open.** Sub-five-line downweighting, broad-change exclusion and other thresholds are hypotheses, not accepted formulas. Earlier renderer recommendations are evidence to reassess against the expanded capability, not a preselected answer. No new dependency is adopted by this record.

## Earlier decisions and retained fragments

The following headings preserve existing decision-link destinations. Read [the complete earlier record](DECISIONS-through-d043.md) for each decision's original rationale, sources and implementation standing. D045 explicitly narrows which portion of D034 remains current; the rest are not reopened merely by this documentation return.

### D001 — The product is `diffdevil`

[Original D001](DECISIONS-through-d043.md#d001--the-product-is-diffdevil).

### D002 — One repository and one public npm package

[Original D002](DECISIONS-through-d043.md#d002--one-repository-and-one-public-npm-package).

### D003 — diffdevil is a portable diff-policy engine

[Original D003](DECISIONS-through-d043.md#d003--diffdevil-is-a-portable-diff-policy-engine).

### D004 — Preserve raw and replacement-aware facts separately

[Original D004](DECISIONS-through-d043.md#d004--preserve-raw-and-replacement-aware-facts-separately).

### D005 — Unknown evidence is first-class data

[Original D005](DECISIONS-through-d043.md#d005--unknown-evidence-is-first-class-data).

### D006 — The optional expression language is detail

[Original D006](DECISIONS-through-d043.md#d006--the-optional-expression-language-is-detail).

### D007 — Chevrotain parses detail

[Original D007](DECISIONS-through-d043.md#d007--chevrotain-parses-detail).

### D008 — Basic use remains language-free

[Original D008](DECISIONS-through-d043.md#d008--basic-use-remains-language-free).

### D009 — Action entry points and mutation stages

[Original D009](DECISIONS-through-d043.md#d009--action-entry-points-and-mutation-stages).

### D010 — Root Action default

[Original D010](DECISIONS-through-d043.md#d010--root-action-default).

### D011 — One ordinary size preset has no hidden path exclusions

[Original D011](DECISIONS-through-d043.md#d011--one-ordinary-size-preset-has-no-hidden-path-exclusions).

### D012 — Comments and label definitions are product capability

[Original D012](DECISIONS-through-d043.md#d012--comments-and-label-definitions-are-product-capability).

### D013 — Keep aliases; teach the clearer form

[Original D013](DECISIONS-through-d043.md#d013--keep-aliases-teach-the-clearer-form).

### D014 — License reusable components under MIT and application/service components under AGPL-3.0-only (2026-09-15)

[Original D014](DECISIONS-through-d043.md#d014--license-reusable-components-under-mit-and-applicationservice-components-under-agpl-30-only-2026-09-15).

### D015 — Visual identity

[Original D015](DECISIONS-through-d043.md#d015--visual-identity).

### D016: Separate qualification from publication

[Original D016](DECISIONS-through-d043.md#d016-separate-qualification-from-publication).

### D017 — Shared TypeScript core and explicit offline qualification

[Original D017](DECISIONS-through-d043.md#d017--shared-typescript-core-and-explicit-offline-qualification).

### D018 — Preserve saved custom metric numeric types

[Original D018](DECISIONS-through-d043.md#d018--preserve-saved-custom-metric-numeric-types).

## D019: Qualify the installed artifact and keep the offline toolchain explicit

[Original D019](DECISIONS-through-d043.md#d019-qualify-the-installed-artifact-and-keep-the-offline-toolchain-explicit).

### D020: Chevrotain source parsing joins the existing engine

[Original D020](DECISIONS-through-d043.md#d020-chevrotain-source-parsing-joins-the-existing-engine).

### D021: Keep policy semantics independent of unavailable authoring dependencies

[Original D021](DECISIONS-through-d043.md#d021-keep-policy-semantics-independent-of-unavailable-authoring-dependencies).

### D022: Keep query/check phases and desired effects semantically explicit

[Original D022](DECISIONS-through-d043.md#d022-keep-querycheck-phases-and-desired-effects-semantically-explicit).

### D023 — Use the supplied authoring dependencies without replacing the engine

[Original D023](DECISIONS-through-d043.md#d023--use-the-supplied-authoring-dependencies-without-replacing-the-engine).

## D024: Verify executable contracts without freezing narrative

[Original D024](DECISIONS-through-d043.md#d024-verify-executable-contracts-without-freezing-narrative).

## D025: Keep GitHub transport small and effect evidence explicit

[Original D025](DECISIONS-through-d043.md#d025-keep-github-transport-small-and-effect-evidence-explicit).

## D026: Keep local Git data-only without losing PR comparison identity

[Original D026](DECISIONS-through-d043.md#d026-keep-local-git-data-only-without-losing-pr-comparison-identity).

## D027: Ship a complete native-ESM Action closure without workflow installation

[Original D027](DECISIONS-through-d043.md#d027-ship-a-complete-native-esm-action-closure-without-workflow-installation).

## D028: Group the single product and nest prerelease sub-actions

[Original D028](DECISIONS-through-d043.md#d028-group-the-single-product-and-nest-prerelease-sub-actions).

## D029: Keep one engine across reusable and managed application surfaces

[Original D029](DECISIONS-through-d043.md#d029-keep-one-engine-across-reusable-and-managed-application-surfaces).

## D030: License original documentation openly while reserving product identity

[Original D030](DECISIONS-through-d043.md#d030-license-original-documentation-openly-while-reserving-product-identity).

## D031: Allow a separate read credential for trusted Action policy

[Original D031](DECISIONS-through-d043.md#d031-allow-a-separate-read-credential-for-trusted-action-policy).

## D032: Keep the open tool primary and the optional App complete

[Original D032](DECISIONS-through-d043.md#d032-keep-the-open-tool-primary-and-the-optional-app-complete).

## D033: One conventional config, explicit host layers, and partial settings

[Original D033](DECISIONS-through-d043.md#d033-one-conventional-config-explicit-host-layers-and-partial-settings).

## D034: Separate seven-day recovery from opted-in quantitative history

[Original D034](DECISIONS-through-d043.md#d034-separate-seven-day-recovery-from-opted-in-quantitative-history). Its pathless-only restriction is superseded by D045; separate consent/recovery remains.

## D035: Target Cloudflare directly with concrete portability boundaries

[Original D035](DECISIONS-through-d043.md#d035-target-cloudflare-directly-with-concrete-portability-boundaries).

## D036: Offboard retained history without stranded access

[Original D036](DECISIONS-through-d043.md#d036-offboard-retained-history-without-stranded-access). The named-data expansion does not widen its numeric-only post-loss exception.

## D037: Render the manual from repository Markdown through a generated, manifest-selected collection

[Original D037](DECISIONS-through-d043.md#d037-render-the-manual-from-repository-markdown-through-a-generated-manifest-selected-collection).

## D038: Run the shared engine in the browser for the playground; replay saved reports instead of refetching

[Original D038](DECISIONS-through-d043.md#d038-run-the-shared-engine-in-the-browser-for-the-playground-replay-saved-reports-instead-of-refetching).

## D039: Keep one stable public shell across product pages and the generated manual

[Original D039](DECISIONS-through-d043.md#d039-keep-one-stable-public-shell-across-product-pages-and-the-generated-manual).

## D040: Make Changed the human focus and give agents a versioned compact projection

[Original D040](DECISIONS-through-d043.md#d040-make-changed-the-human-focus-and-give-agents-a-versioned-compact-projection).

## D041: Record what the Action ships, not hashes of its inputs

[Original D041](DECISIONS-through-d043.md#d041-record-what-the-action-ships-not-hashes-of-its-inputs).

## D042: Separate manual source identity from routes and preserve whole-source cutovers

[Original D042](DECISIONS-through-d043.md#d042-separate-manual-source-identity-from-routes-and-preserve-whole-source-cutovers).

## D043: Give application surfaces their own top-level category

[Original D043](DECISIONS-through-d043.md#d043-give-application-surfaces-their-own-top-level-category).
