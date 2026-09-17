# Public playground experience

## Meaning

The diffdevil playground is a free, public, read-only way to try the open-source tool and understand a real result before installing anything. It is not the managed GitHub App, its account dashboard, or a mandatory hosted onboarding funnel. This document owns the selected demonstration, configuration, explanation, and export experience.

The repository currently has a local measurement-oriented playground under [`apps/playground/`](../../apps/playground/README.md), using the real engine and a versioned response envelope. The richer interaction described here remains selected implementation work, not a claim that every view, editor, example, or hosted route already exists.

## Entry and page structure

Give the playground a dedicated `/playground/` page. The homepage includes a compact entry with a public PR field, a curated example, and a link to the full explanation. Reuse the same product components and engine-backed behavior instead of maintaining two approximations.

Keep three clear product doors: use the CLI/Actions, try the playground, or choose the optional managed App. Lead with the open-source tool and its useful examples. The playground's successful result is understanding or a reusable configuration, not necessarily an App installation.

The complete playground page contains:

- a public PR URL entry and curated example selector;
- preset selection and relevant configuration controls;
- the analyzed comparison, versions, evidence standing, and active exclusions;
- terminal, agent/data, GitHub-effect preview, and explanation views;
- equivalent CLI, Action, and repository-policy exports;
- practical explanation of limits, privacy, and the different adoption routes.

## Public inputs only

Accept a canonical GitHub.com public PR URL and normalize it before acquisition. Do not treat an arbitrary URL as a fetch target, permit user-selected API hosts, or use a URL to reach local/internal addresses. Limit redirects and acquisition to the supported GitHub source contract.

No account is required. Do not accept private PRs, ask visitors for personal access tokens, expose installation credentials, or infer repository access from a dashboard login. A future authenticated private playground would require an explicit product decision; App sign-in does not silently select it.

Curated specimens are available without GitHub access. A pasted/uploaded unified diff can be an additional source using the existing parser when the implementation supports it. A browser-local route should stay genuinely local, without uploading the source to obtain a result it can compute locally.

User-provided policy, expressions, paths, and templates are bounded data for the shared compiler and presenter. They do not execute JavaScript, shell commands, imports, repository scripts, or remote template/preset fetches. An effect preview does not confer write authority.

## One real result with useful views

All views consume the same report, resolved policy, and non-mutating effect plan.

| View | Purpose |
| --- | --- |
| Terminal | Show the real human-readable CLI-style output without a separately calculated website result |
| Agent / data | Show the compact agent projection and versioned structured output an integration can consume |
| GitHub preview | Show proposed labels, a check summary, and an optional rendered comment without applying them |
| Explanation | Show which settings, scopes, exclusions, metrics, rules, and evidence produced the result |

A measurement-only result is not a policy preview. Where current provider state is not observed, describe proposed desired labels/comments rather than inventing a precise add/remove/no-op readback. No preview may say an effect was applied.

Preserve exact, bounded, unknown, unmeasurable, omitted-file, and incomplete-file-set distinctions in every view. Bounded values keep their marker and interval. A report projection limit cannot make the displayed first files look like the complete PR.

The result names the analyzed head/base/comparison. When a live PR changes, show that the view is an older snapshot and offer an explicit refresh. Never silently mix a cached count from one head with paths or policy from another.

## Configuration without a language prerequisite

Start with the same bundled presets and relevant simple settings as the open product. Users can adjust metrics, thresholds, path inclusion/exclusion, label names, and optional comment templates without learning detail.

Advanced users may inspect or edit the ordinary policy and expressions. Simple controls and advanced editing resolve through one compiler/lowering path. Switching views must not discard settings the visual editor cannot represent; show them as advanced configuration.

Use the [shared layering contract](presets-and-shortcuts.md#configuration-layering). The playground may demonstrate App-style defaults, but it does not fetch private dashboard settings or add hidden hosted inheritance. A public repository's proposed policy can be previewed as data with its origin stated.

Configuration changes should reuse the already acquired immutable comparison when possible. Re-evaluating a threshold must not refetch the whole PR by default. Local/browser reuse still enforces bounded evaluation and keeps source data out of persistent storage.

Invalid policy identifies the setting and valid correction. It does not silently substitute the preset. Keep the user's last input visible while a request fails so repair does not mean starting over.

## Curated examples with a reason

Each curated example has a short explanation of the product fact it demonstrates, a repository-owned reproducible input or immutable source reference, the configuration, and the expected engine result.

The initial collection should demonstrate:

- an equal-sized replacement counted once, with raw churn visible alongside it;
- a few files with substantial line changes versus many files with small changes;
- explicit lockfile/generated-file exclusion and the difference between observed and included totals;
- a custom metric/label and optional owned-comment preview;
- bounded or incomplete evidence, including a case where a band is provable and one where it is not.

Prefer hand-picked examples that teach distinct behavior, not an enormous gallery of arbitrary repositories. A local fixture is the stable demonstration; a link to a live PR is additional context. Clearly distinguish a frozen example from refreshing its source.

Examples exercise the actual engine and shared presenters. Keep complete examples in their existing repository-owned homes; do not create independent website-only policy calculations. Tests verify semantic outcomes and completeness markers, not frozen promotional paragraphs.

## Export and adoption

The result can export:

- one equivalent CLI invocation with the actual source/configuration assumptions;
- an Action step or complete workflow, clearly distinguished, using supported Action inputs;
- the conventional `.diffdevil.yml` policy or an explicitly expanded portable policy;
- the permitted report/plan data and compact agent output.

State whether a workflow uses read-only analysis or writes labels/comments, its token/permission requirements, and the trusted-policy source. A working preview is not proof that a copied workflow has permission to mutate the repository.

The user may carry the selected configuration into managed-App setup. That transition asks for installation and authorization when necessary; it does not turn the anonymous playground into an authenticated session or preserve its input as App history without consent.

Exports must use currently supported command, Action, and schema versions. Planned partial settings or App behavior must not be presented as runnable on an older release. Current docs and actual runtime truth govern example availability.

## Public compute, GitHub budget, and caching

Rate limiting protects both shared compute and upstream API capacity. Implement visitor and service-wide budgets, bounded payload/evaluation/result sizes, and an understandable retry response. Invalid requests should fail before expensive acquisition. A permanent CAPTCHA or sign-in requirement is not the default product answer.

The current local source uses unauthenticated GitHub reads. GitHub's standard unauthenticated REST allowance is 60 requests per hour per originating IP, shared by that backend's visitors. Do not mistake a generous compute allowance for a usable upstream budget.

Curated examples and reuse of acquired comparisons reduce that cost. Any future authenticated public-data acquisition uses a separate credential boundary with explicit public-only qualification; it must never borrow the managed App's private-repository installation credentials.

Separate immutable numeric analysis caching from contextual details. Cached public results need bounded expiry and public-visibility revalidation before reuse when the live source is involved. Repository visibility can change. A cache cannot expose previously public context indefinitely after access changes.

The [data contract](../PRIVACY-AND-DATA.md#public-playground) excludes permanent visitor history, source/PR-prose collection, and raw-IP product analytics. The full source used for analysis may live transiently in memory or the active browser view; shared caches do not silently archive it.

## Website integration and accessibility

Use the product website's shared visual identity, navigation, code presentation, and accessible controls. Ordinary content stays statically rendered where practical; the playground is the justified interactive part. Do not make the whole documentation site an application shell.

Support keyboard use, labeled controls, readable errors, copying/exporting without color-only indicators, narrow screens, and an output state understandable without animation. Explain loading, upstream throttling, missing data, and failed analysis without hiding the input.

The full manual and examples remain repository-owned. A site build selects reader-facing sources deliberately; it does not publish the entire internal product/documentation tree through a broad glob.

## Qualification boundary

Qualify a curated example and one real public PR through the same engine, with a representative configuration edit and export. Exercise all views against a common report, including incomplete/bounded evidence. Check keyboard/narrow-screen use, malformed/non-public input, no provider writes, credentials isolation, rate limits, cache visibility/expiry, and the actual copied command/workflow syntax.

Local measurement tests, an application schema, Worker startup, a preview URL, production hosting, and a complete visitor journey are separate evidence. A deployed measurement form is useful progress, but it does not complete the selected configurable playground.

## Provider reference

- [GitHub REST rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)
