# diffdevil Decisions

## Meaning

This records product/repository choices whose rationale cannot be reconstructed cheaply from source. D054–D063 carry the accepted edition, plan, funding and management settlement of 2026-10-02. They are selected product direction, not evidence that billing, collection or the expanded dashboard is live.

The complete predecessor record is preserved byte-for-byte as [Decisions through D053](DECISIONS-through-d053.md), with its existing references to the complete D001–D043 record. Earlier headings remain below to preserve fragment destinations. A new decision supersedes only its named boundary; it does not erase the previous rationale or implementation evidence.

[Plans](app-plans.md), [management](app-management.md), [dashboard](dashboard.md), [access](dashboard-access.md) and [privacy/data](PRIVACY-AND-DATA.md) own the joined maintained contracts. Private deliberation and owner transcripts are not part of this public record.

## D054: Separate Community from private premium application capabilities

**Decision.** Community supplies the complete basic application with operator-controlled repository, history and import limits. Additional privately maintained application capabilities supply rich file history and Business coordination. The public application works without them or a subscription. The open engine, CLI/API/Actions, extension and playground remain complete.

**Why.** A useful self-hosted edition and a paid additional software product can coexist. Hosting convenience alone need not carry the entire commercial proposition, and retaining a useful open engine does not require publishing every premium application.

**Superseded.** The future-facing all-application-source/full-feature-parity assumption in D014, D029 and D032. Existing public component licences and the one-engine semantic boundary remain. This decision does not relabel third-party source or implement a private package. No public extension store/API/compatibility promise is selected.

## D055: Sell basic history, file memory and coordinated operation as distinct plans

**Decision.** Free offers basic PR/repository history and managed operation. Pro adds historical file exploration, prominent clouds, Turnover, co-change and richer PR context. Business adds linked policies, automatic setup, delegation, coordinated refresh and administrative audit. Prices are €9/€90 Pro, €42/€400 Business and €9/€90 for each extra organisation, monthly/annual, as tax-inclusive consumer totals.

**Why.** A personal developer can buy codebase memory without paying for group coordination; a person or team can independently value Business operation. The free experience remains useful without giving away the entire paid product.

**Superseded.** Unselected €19/€59 and Team/Scale hypotheses, and ambiguity about whether “Individual” meant Free or paid. D049's reader/visibility meaning remains. No per-reader seat, per-PR fee or purchased processing credits are introduced.

## D056: Let an individual subscription fund named organisation scopes

**Decision.** An individual owns the subscription. Each paid plan includes one organisation connection; additional connections inherit its tier/cadence. One ordinary funder may support an organisation at a time, with owner/funder disconnection and agreed replacement. Free can connect one organisation within pooled three-private/ten-public-history allowances.

**Why.** One understandable personal purchase can support a personal estate and explicitly chosen organisations without multiplying paid readers or treating organisational records as the payer's property. One funder prevents colleagues stacking allowances.

**Consequences.** Pro personal repositories have no count ceiling; each Pro organisation has three private slots and otherwise the same Pro capabilities. Business organisations have no repo-count ceiling. Installation reach and repository selection remain explicit. Funding does not grant access or administrative rights. This settles D049's previously open purchase unit.

## D057: Reserve shared policy coordination for Business

**Decision.** Pro has one configured default for personal repositories and one per connected organisation, with a repository-settings apply/difference action. It has no shared named-policy library, bulk application or global unsynchronised-repository hints. Business supplies linked named policies, defaults, automatic eligible setup and coordinated updates.

**Why.** A saved per-scope default supports deliberate manual use. A shared library with global drift and bulk application would already give away much of the coordinated product.

**Superseded.** D050's unrestricted Individual named-library assumption. Arbitrary valid repository-specific configuration, portable policy, trusted repository overrides and manual history replay remain. This is a hosted capability boundary, not a limit on the open engine.

## D058: Retain base file facts on Free for compatible policy replay

**Decision.** Every history-enabled tier, including Free, retains permitted paths and numerical per-file observations, including analytically excluded files. Free/Pro can manually recalculate a repository. Enriched historical file capabilities remain premium.

**Why.** Aggregate totals cannot answer a new arbitrary path exclusion after file facts are discarded. Retaining the base foundation avoids unnecessary GitHub reacquisition without granting every derived premium feature.

**Consequences.** No source contents/patches are retained. D045's data expansion and D047's current-policy interpretation remain; pending refreshes identify their actual displayed basis. A newly source-dependent metric still needs sufficient evidence. No fictional original results or policy-era warehouse.

## D059: Protect live operation and expose delayed historical work honestly

**Decision.** Eligible live checks, size labels and replies have priority and no monthly execution-credit cutoff. Imports, enrichment and broad recalculation may lag/pause with visible coverage. Free import can capture up to 100 recent PRs per selected repository; monthly import amounts remain explicit launch configuration.

**Why.** Background workload should not turn ordinary PR use into a microtransaction or break the core workflow. Provider limits and actual service pressure still need honest pacing.

**Consequences.** No bills for duplicates/recovery and no purchased credits. Durable continuation is separate from execution-message lifetime. Advanced provider-budget headroom can arrive later, but rate-limit compliance cannot. This settles D051's allowance direction without inventing numeric monthly budgets or a completion guarantee.

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

## Earlier decisions and retained fragments

The headings below preserve earlier links. Their full text remains in the exact predecessor record; follow its references for D001–D043. Later decisions above supersede only the stated portions. Historical source is not automatically current implementation.

### D001 — The product is `diffdevil`

[Retained D001](DECISIONS-through-d053.md#d001--the-product-is-diffdevil).

### D002 — One repository and one public npm package

[Retained D002](DECISIONS-through-d053.md#d002--one-repository-and-one-public-npm-package).

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

[Retained D044](DECISIONS-through-d053.md#d044-make-the-app-activity-first-for-collaborators-as-well-as-administrators).

### D045: Retain named file measurements and PR lifecycle without storing source

[Retained D045](DECISIONS-through-d053.md#d045-retain-named-file-measurements-and-pr-lifecycle-without-storing-source).

### D046: Use final merged comparisons for general file activity and explicit metric names

[Retained D046](DECISIONS-through-d053.md#d046-use-final-merged-comparisons-for-general-file-activity-and-explicit-metric-names).

### D047: Reinterpret history with current policy instead of multiplying policy-era dashboards

[Retained D047](DECISIONS-through-d053.md#d047-reinterpret-history-with-current-policy-instead-of-multiplying-policy-era-dashboards).

### D048: Make the optional PR brief selective, deterministic and lifecycle-aware

[Retained D048](DECISIONS-through-d053.md#d048-make-the-optional-pr-brief-selective-deterministic-and-lifecycle-aware).

### D049: Derive visibility from GitHub and sell coordination rather than reader seats

[Retained D049](DECISIONS-through-d053.md#d049-derive-visibility-from-github-and-sell-coordination-rather-than-reader-seats).

### D050: Give linked policies and automatic setup a real Team consequence

[Retained D050](DECISIONS-through-d053.md#d050-give-linked-policies-and-automatic-setup-a-real-team-consequence).

### D051: Import recoverable history without replaying effects

[Retained D051](DECISIONS-through-d053.md#d051-import-recoverable-history-without-replaying-effects).

### D052: Publish an explicit anonymous analytical projection for public repositories

[Retained D052](DECISIONS-through-d053.md#d052-publish-an-explicit-anonymous-analytical-projection-for-public-repositories).

### D053: Research relationship selection and chart rendering as different problems

[Retained D053](DECISIONS-through-d053.md#d053-research-relationship-selection-and-chart-rendering-as-different-problems).

