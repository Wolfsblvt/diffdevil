# diffdevil examples

## Meaning

These are complete consumer inputs for the CLI, shared policy engine, and GitHub
Actions. The smaller task recipes are exercised by `tests/examples.test.mjs`;
installed and distributed consumers have separate tests. A parsed remote workflow
is not a published Action or a hosted run. The `@v1` examples activate only after
that release exists.

## Pick a useful result

| Result | Complete files | Guide |
| --- | --- | --- |
| Automatic size labels with no config or comments | [size workflow](workflows/size.yml) | [Quickstart](../docs/guides/auto-label-pull-requests.md) |
| Transparent local counts, scalars and path queries | [four-file patch](diffs/review.diff) | [Local automation](../docs/guides/local-automation.md) |
| Source changes without test-path changes | [policy](policies/review-signals.yml), [workflow](workflows/review-signals.yml) | [Policy recipes](../docs/guides/policy-recipes.md) |
| One updated comment, no size labels | [policy](policies/review-comment.yml), [workflow](workflows/review-comment.yml) | [Policy recipes](../docs/guides/policy-recipes.md) |
| Read-only Action facts and a threshold decision | [analyze workflow](workflows/analyze.yml) | [Action manual](../docs/integration/github-actions.md) |
| Inline removed-or-rewritten threshold | [threshold workflow](workflows/destructive.yml) | [Policy recipes](../docs/guides/policy-recipes.md) |
| Change preset thresholds without replacing its ownership | [threshold policy](policies/thresholds.yml) | [Presets](../docs/integration/presets-and-shortcuts.md) |
| Full explicit metrics, scopes, bands and labels | [full policy](policies/full.yml) | [Policy manual](../docs/language/policies-and-bands.md) |

The source/test signal is an explicit repository rule, not a test-quality judgment.
The comment recipe uses `presets: []` so commenting does not silently add labels.
The default root workflow has no exclusions; recipes only omit paths they name.

## Expressions, shell samples and report specimens

[Expression files](expressions/large-files.ddexpr) avoid nested shell quoting.
[PowerShell scalar composition](scripts/query.ps1) checks the native exit code
before conversion. [Bash checks](scripts/check.sh) distinguish false from unknown
and error. Native PowerShell execution requires its own platform evidence.

The JSON reports under `reports/` are synthetic exact, bounded, incomplete and
unmeasurable specimens. Their source and report identities are fixture values,
not actual PR coordinates or write authority. Desired plans constructed from a
fixture are useful data but cannot be applied as unchecked provider requests.
