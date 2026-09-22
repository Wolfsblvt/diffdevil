# diffdevil examples

## Meaning

These are complete consumer inputs for the CLI, shared policy engine, and GitHub
Actions. The smaller task recipes are exercised by `src/diffdevil/tests/examples.test.mjs`;
installed and distributed consumers have separate tests. The `@v1` Action
coordinate is published; a parsed workflow still does not prove that a hosted
consumer ran it successfully.

## Pick a useful result

| Result | Complete files | Guide |
| --- | --- | --- |
| Automatic size labels with no config or comments | [size workflow](workflows/size.yml) | [Quickstart](../manual/start/label-pull-requests.md) |
| Transparent local counts, scalars and path queries | [four-file patch](diffs/review.diff) | [Local automation](../manual/start/analyze-local-changes.md) |
| File count and line count as separate facts | [two large files beside fourteen small ones](diffs/few-vs-many.diff) | Controlled teaching specimen, not a public catalogue entry |
| Source changes without test-path changes | [policy](policies/review-signals.yml), [workflow](workflows/review-signals.yml) | [Policy recipes](../guides/policy-recipes.md) |
| One updated comment, no size labels | [policy](policies/review-comment.yml), [workflow](workflows/review-comment.yml) | [Policy recipes](../guides/policy-recipes.md) |
| Read-only Action facts and a threshold decision | [analyze workflow](workflows/analyze.yml) | [Action manual](../integration/github-actions.md) |
| Inline removed-or-rewritten threshold | [threshold workflow](workflows/destructive.yml) | [Policy recipes](../guides/policy-recipes.md) |
| Change preset thresholds without replacing its ownership | [threshold policy](policies/thresholds.yml) | [Presets](../integration/presets-and-shortcuts.md) |
| Full explicit metrics, scopes, bands and labels | [full policy](policies/full.yml) | [Policy manual](../language/policies-and-bands.md) |

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

## Surface and shared-workflow consumers

`library/inspect-change.mts` is the complete Node ESM/TypeScript consumer used by the
library guide. It imports only public package exports, reads a complete patch or
report, compiles `size@1`, evaluates a condition and serializes a desired plan. The
review patch establishes 10 Changed / 16 churn; the bounded report preserves 60–70
while proving `< 100`; incomplete input retains an unknown decision; invalid JSON
exits 2 without a fabricated result. `npm run test:package` compiles and runs that
file against the packed installation outside the source tree. No provider is called.

`workflows/analyze-and-apply.yml` is a complete same-job example. It transports the
full report path from read-only analysis to an explicitly writing apply step. The
apply step still reacquires current evidence. `apps/manual/wave-2.test.mjs` executes
that boundary through `runAction` and fixture HTTP, including a changed-head refusal;
it does not publish a workflow or change a real repository. The selected Action
coordinate is the maintained `v1` major; release adoption remains separate.

The shared report workflow links complete existing `review-signals.yml`,
`review-comment.yml`, `hold-unresolved.yml` and bounded/incomplete report fixtures.
Those inputs retain their original ownership. `npm --prefix apps/manual test`
executes the copyable capture/replay/re-policy/plan commands and checks open complete
blocks against canonical files. Human output is a shared presenter projection, not a
second hand-maintained numeric oracle.
