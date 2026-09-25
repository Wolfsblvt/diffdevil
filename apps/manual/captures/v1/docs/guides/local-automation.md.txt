# Use diff facts in local scripts

## Meaning

Measure a diff, extract a scalar, list selected paths, or make a shell decision
without parsing a human report. These examples run from a built source checkout
and preserve the difference between false, unknown, and an error. The same CLI
commands apply to the published `@wolfsblvt/diffdevil` executable.

## Get a first result without GitHub

Install the released package with Node 22 or later:

```sh
npm install --save-dev @wolfsblvt/diffdevil
npm exec -- diffdevil analyze \
  --diff-file node_modules/@wolfsblvt/diffdevil/docs/examples/diffs/review.diff \
  --format human
```

From a source checkout:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run build
node dist/lib/cli/main.js analyze --diff-file docs/examples/diffs/review.diff --format human
```

No token or network provider is involved in the analysis. The supplied four-file
patch has **10 replacement-aware changed lines**, **16 raw churn**, **6 modified
lines**, and **4 added-only lines**. Two adjacent source lines become three,
which contributes three changed lines. A four-line lockfile replacement
contributes four more; it is not hidden by default.

The first command installs the exact lockfile dependencies. An offline handover
can append `--offline --cache artifacts/dependencies/npm-cache`. Normal public
source checkouts do not contain that private cache.

## Return one number

```sh
node dist/lib/cli/main.js query --diff-file docs/examples/diffs/review.diff --expr 'totals.lines.changed' --format value
```

Output is exactly `10` followed by a newline. Human explanations and diagnostics
do not appear in the scalar. Simple arithmetic uses ordinary detail expressions:

```sh
node dist/lib/cli/main.js query --diff-file docs/examples/diffs/review.diff --expr 'totals.lines.deleted + 2 * totals.lines.modified' --format value
```

That returns `12`: this formula deliberately weights modified lines twice. It is
not a new meaning for the standard changed-lines metric.

PowerShell can consume a scalar after checking that the command actually returned
one:

```powershell
$value = & node dist/lib/cli/main.js query --diff-file docs/examples/diffs/review.diff --expr 'totals.lines.changed' --format value
if ($LASTEXITCODE -ne 0) { throw 'The exact changed-line value is unavailable.' }
$changed = [long]$value
Write-Output "Changed lines: $changed"
```

## Find files above a threshold

The file shortcut removes a filter, a lambda, and a projection without changing
the evaluator:

```sh
node dist/lib/cli/main.js query --diff-file docs/examples/diffs/review.diff --files --metric changed --gt 2 --select path --format lines
```

This emits `package-lock.json` and `src/payments.ts`, one path per line in canonical path order. Use `--gt
100` for a real “large file change” rule. Match only source paths with `--path
'src/**'`; repeat `--path` for additional patterns. Use `--format json` instead of
line output when consuming arbitrary filenames that may contain line breaks.

To test for any such file rather than list it:

```sh
node dist/lib/cli/main.js check --diff-file docs/examples/diffs/review.diff --files any --metric changed --gt 100
```

The supplied small patch exits **1**, meaning valid and false. The command does
not fail because the patch is small. Exit meanings are:

| Exit | Meaning |
| --- | --- |
| `0` | The valid condition is true. |
| `1` | The valid condition is false. |
| `2` | Invalid configuration, input, or operation. |
| `3` | Evidence cannot resolve the requested result. |

A Bash gate that must not silently accept unknown evidence:

```bash
if node dist/lib/cli/main.js check --diff-file docs/examples/diffs/review.diff --files any --metric changed --gt 100; then
  printf '%s\n' 'At least one file exceeds 100 changed lines.'
else
  result=$?
  case "$result" in
    1) printf '%s\n' 'No included file exceeds the threshold.' ;;
    3) printf '%s\n' 'Cannot establish the threshold from available evidence.' >&2; exit 3 ;;
    *) printf '%s\n' 'diffdevil could not evaluate the check.' >&2; exit "$result" ;;
  esac
fi
```

Whether a true condition should fail CI is your policy, not an implicit diffdevil
judgment. Keep a separate failure/error branch rather than treating every nonzero
exit as false. For a long expression, use `--expr-file rule.ddexpr` instead of
stacking shell, YAML, and expression escaping.

## Inspect your actual working changes

Run the built CLI from the repository you want to inspect, or use an absolute path
to its executable:

```sh
# Tracked staged and unstaged changes relative to HEAD.
node dist/lib/cli/main.js analyze --format human

# Staged changes only.
node dist/lib/cli/main.js analyze --staged --format json

# Topic-branch changes since the merge base with the selected base.
node dist/lib/cli/main.js analyze --base origin/main --head HEAD --format markdown
```

The first two commands do not include untracked files. Stage a new file before
expecting it in the staged or tracked-worktree report. Fetch the desired base
revision yourself before comparing; diffdevil does not fetch, checkout, install,
or execute repository code. `--comparison direct` selects a direct commit
comparison instead of three-dot semantics.

## Analyze once, query several times

```sh
node dist/lib/cli/main.js analyze --diff-file docs/examples/diffs/review.diff --format json --output review-report.json
node dist/lib/cli/main.js query --report review-report.json --expr 'totals.raw.churn' --format value
node dist/lib/cli/main.js query --report review-report.json --files --metric changed --gt 2 --select path --format json
```

The first query returns `16`. JSON preserves typed evidence and structured paths.
A saved report is useful for local queries; a saved report or plan never becomes
unchecked authority for GitHub writes. Apply reacquires current evidence and
checks source and policy identity.

See the [CLI manual](../integration/cli.md) for every source, format, selector,
parameter, and exit contract, and [policy recipes](policy-recipes.md) for named
scopes and custom results.
