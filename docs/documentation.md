# Documentation design and example ownership

## Meaning

This is the durable editorial home for explaining diffdevil: the reader tasks,
teaching order, strongest examples, source ownership, and future website/help
shape. It is not another API specification. Repository-owned manuals and tested
examples remain canonical whether readers arrive through GitHub or a later site.

## Begin with an outcome

The front door introduces a portable diff-policy engine, then gives the reader
three direct routes: label PRs with one workflow, query local changes, or author a
policy. PR size is the fastest visible success, not the product definition.
Explain the three-line replacement before introducing the entire type system.

| Reader task | First page | Observable success | Deeper source |
| --- | --- | --- | --- |
| Automatically label PR size | `manual/start/label-pull-requests.md` | One size label, no comment, inspectable summary | `integration/github-actions.md` |
| Get a number or condition into a script | `manual/start/use-results-in-scripts.md` | Exact scalar, path list, meaningful exit status | `integration/cli.md` |
| Add a repository-specific signal | `guides/policy-recipes.md` | Source/test scoped rule, desired plan, managed label | `language/policies-and-bands.md` |
| Keep one informative comment | `guides/policy-recipes.md` | One owned upsert comment without repeated noise | `integration/templates.md` |
| Integrate the engine programmatically | `integration/typescript-api.md` | Typed report and policy from the installed package | Public exports and declarations |
| Explain an unavailable count | Quickstart troubleshooting, then `language/types-and-measurements.md` | Correct status/bounds, no invented zero | Report schema and executable cases |

These are real tasks rather than a gallery of every flag. Keep one strongest
complete example per task before offering variations. A copyable example states
its filename, location, prerequisites, required edits, expected result, write
behavior, and failure/unknown behavior. Label excerpts as excerpts.

## Teach the clearer form; preserve every working route

Use ordinary detail expressions for simple arithmetic and matches. Prefer a file
shortcut when it removes collection, lambda, quantifier, projection, or path
quoting boilerplate. Both use one compiler. Do not remove aliases to make the
manual look smaller, and do not force a first-time label user to learn detail.

Distinguish four things wherever they affect a decision: measured facts,
repository policy, desired effects, and observed provider results. Raw churn is
not replacement-aware changed lines. No measurement establishes quality, risk,
importance, or merge authority. Use the canonical [branding reference](branding.md)
for naming and operational vocabulary, not a mascot voice in examples.

## Own examples as executable assets

`docs/examples/diffs/review.diff` is the small transparent teaching specimen. Its source,
test, documentation, and lockfile blocks deliberately demonstrate replacement
accounting and explicit exclusion. The two smaller policies teach a custom signal
and a comment without requiring the larger complete policy specimen.

`src/diffdevil/tests/examples.test.mjs` consumes the actual patch, policy files, workflow YAML,
and command examples. It exercises the production CLI and shared Action runner
against fake HTTP. These tests prove executable behavior, not the prose around
it, GitHub event delivery, or real permission grants. `test:actions` separately
executes the shipped paths outside the checkout. Native shell scripts have their
own platform evidence; parsing PowerShell text on Linux is not running it.

A maintained example change carries its test and expected output in the same
change. Prefer behavioral assertions and parsed configuration to frozen paragraphs
or test-count quotas. Reference excerpts may repeat a short example for reading,
but link its complete asset and repair both when behavior changes. Do not make a
new runtime copy of a workflow just for the website.

## Website, playground, and optional hosted operation

The public website presents an open-source CLI, library, and workflow Actions
product first. Show the replacement distinction, one-file workflow setup, a
composable CLI query, and the plan/apply boundary before any commercial pitch.

The three adoption doors are **Use the CLI / Actions**, **Try the playground**,
and **Optional managed GitHub App**. They need not have identical prominence:
the tool is the product, the playground teaches it, and hosting removes operating
work. App installation is not the presumed outcome of every visitor journey.

The [playground experience](manual/use/playground.md) has its own page and a
compact homepage entry. Curated examples, settings controls, terminal/agent output,
GitHub-effect previews, explanation, and exports derive from the same engine.
Keep this anonymous read-only experience distinct from the authenticated App
dashboard and its opted-in history.

Explain the optional App's added value concretely: maintained execution, account
or organization defaults, effective configuration, repository administration,
native checks, and opt-in history/statistics. The comparison must say what a
self-operated workflow would need to assemble, not imply that the CLI or Actions
lack the full measurement or policy language.

Use Astro static output as the website foundation and Starlight for the structured
manual, with interactive components where the playground/dashboard need them.
Keep product branding independent and consistent across the home, playground,
and help. This selects a publishing family, not a claim of a built site.

Help navigation can group **Get started**, **Recipes**, **CLI**, **Actions**,
**Policies and detail**, **Library API**, **Playground**, **Managed App**, and
**Troubleshooting**. Select reader-facing repository Markdown and the same tested
example assets. Contribution links edit those sources. Do not publish all of
`docs/` through a broad glob, copy it into a separate wiki, or make a second
manually maintained website policy engine.

Self-hosting belongs in findable App/operator documentation and the licence
explanation. It is intentional, not hidden; it is not a fourth primary sales door.
Document only deployment adapters that are actually supported, including their
provider, credential, cost, and maintenance requirements.

The App, website application, playground, and service code remain in this
repository under AGPL-3.0-only. Original documentation prose, runnable examples,
and branding retain the separate rights in the licence map. Do not describe an
open-source licence as a grant to impersonate the official service.

Domains, live hosting, billing, and publication remain separately observed
outcomes. A site description must distinguish selected experience from features
currently available to a visitor; a canary cannot silently redefine either.

## Release-sensitive copy

Keep the prerelease availability note until the referenced package and Action ref
exist. Then update it in one intentional release change. A `uses:` coordinate
is not a released Action merely because YAML parses. A CI badge must refer to an
actual run; package badges require a real published package. Local qualification
belongs in Qualification, not an eternal launch checklist at the top of the user
README.


## Public-manual source foundation

The purpose-built manual is maintained under `docs/manual/` and rendered by
[`apps/manual/`](../apps/manual/README.md) at `docs.diffdevil.dev`. Its explicit
manifest selects source identities, routes, aliases, task-led navigation and
capability standing. The product FAQ remains the single `docs/manual/faq.md`
source at `diffdevil.dev/faq/`, in the product shell without a manual sidebar.

The foundation supplies chapter scaffolds, generated mechanical reference inserts,
executed presenter specimens, Source/Edit links, finite technical-source access,
shared shell and theme behavior, and one joined SITE/DOCS/FAQ search index.
Scaffolds are not authored chapters or current search results. Availability is a
separate product fact, expressed by one top-only In development NOTE where needed.

Wave 2 transfers the complete auto-label, local-automation and Playground visitor
families to their START/USE successors. Their incoming links, source-ID and fragment
mappings, public redirects and search selection move together. Other legacy sources
remain current until every destination of their selected split is authored.
`apps/manual/migration.mjs` owns those exact source-family dispositions. No Markdown
forwarding stubs are used. The root README's later compression remains a separate
final reconciliation step.

The authoring sequence is Start and Understand; open surfaces and shared workflows;
Policy and Reference; Managed App and Help; then final cross-surface reconciliation.
All continue the same draft manual carrier. The FAQ answers are already authored
and are not duplicated by those chapter contributions. Source readiness, joined
reader qualification and publication remain different claims.
