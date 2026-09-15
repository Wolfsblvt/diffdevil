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
| Automatically label PR size | `guides/auto-label-pull-requests.md` | One size label, no comment, inspectable summary | `integration/github-actions.md` |
| Get a number or condition into a script | `guides/local-automation.md` | Exact scalar, path list, meaningful exit status | `integration/cli.md` |
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
importance, or merge authority. Use the canonical [branding reference](BRANDING.md)
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

## Future website and wiki-like help

The intended site is a short product front page plus navigable help, not a second
knowledge base. The front page should show: the three-line replacement distinction,
the one-file labeling setup, a composable CLI query, and the plan/apply boundary.
Every claim links to its maintained task guide or manual.

Help navigation can group **Get started**, **Recipes**, **CLI**, **Actions**,
**Policies and detail**, **Library API**, and **Troubleshooting**. Use repository
Markdown as source and consume the same example files. Contribution links should
edit those sources. Do not copy maintained pages into a separately edited GitHub
Wiki or CMS. Historical `docs/reference/` records may remain repository-only unless a
specific article benefits from the rationale.

A static docs adapter, search, redirect policy, domain, visual assets, and hosting
are later delivery decisions. They are not dependencies of useful documentation
or the CLI/Action release. No hosting provider or publication has been configured
by this documentation cut.

## Release-sensitive copy

Keep the prerelease availability note until the referenced package and Action ref
exist. Then update it in one intentional release change. A `uses:` coordinate
is not a released Action merely because YAML parses. A CI badge must refer to an
actual run; package badges require a real published package. Local qualification
belongs in Qualification, not an eternal launch checklist at the top of the user
README.
