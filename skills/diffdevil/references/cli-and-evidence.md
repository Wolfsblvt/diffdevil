# CLI and evidence

## Meaning

This reference teaches diffdevil acquisition, queries, output consumption, and
evidence through concrete commands. It extends the everyday skill core; the
[CLI manual](https://github.com/Wolfsblvt/diffdevil/blob/main/docs/manual/use/cli.md)
owns the complete command contract.

## Run the CLI in the existing environment

Reuse the project-selected executable or user installation. Check its version
and help when establishing the command route. With Node.js and npm available,
an execution-cache route does not add files to the project's package manifest:

```sh
npm exec --yes --package=@wolfsblvt/diffdevil -- diffdevil analyze --format agent
```

An exact package selection uses `--package=@wolfsblvt/diffdevil@VERSION`, replacing
VERSION with the selected real npm version. A dev dependency fits a project that
already manages tools that way; a user installation fits a user-managed toolchain.
The skill does not select a new runtime version or dependency policy for the user.

No command execution means the host cannot run the CLI directly. Use an available
execution tool or supported integration when it reaches the requested result.
Reading instructions or a supplied report is still useful, but is not a CLI run.
When command execution exists but registry access fails, use the
[restricted-harness route](restricted-harnesses.md) for an already available or
supplied complete runtime.

## Acquire the comparison you need

| Source | Invocation and meaning |
| --- | --- |
| Tracked worktree | `analyze`: HEAD to final tracked worktree, including staged and unstaged content once |
| Index | `analyze --staged`: HEAD to index |
| Branch changes | `analyze --base origin/main --head HEAD`: merge base to head |
| Two snapshots | Add `--comparison direct` to the two-ref invocation |
| Patch file | `analyze --diff-file change.diff` |
| Piped patch | `analyze --stdin` |
| Saved full report | `query --report report.json ...` |
| GitHub PR | `analyze --repo OWNER/REPO --pr NUMBER` |

Both revision arguments are required. `--cwd PATH` selects another working
directory. Untracked files are not counted by the default tracked comparison.
A missing revision, authentication failure, or non-Git directory without another
source is an acquisition error, not a measured zero.

A GitHub PR URL identifies OWNER/REPO and NUMBER; the CLI takes those separate
arguments. The public Playground accepts its own URL input. Saved-report queries
stay offline unless another selected operation actually needs fresh provider state.

## Ask useful questions

```sh
diffdevil query --metric changed --format value
diffdevil query --metric raw-churn --format json
diffdevil query --metric files --format value
diffdevil query --files --select path,changed,raw-churn --format json
diffdevil query --path 'src/**' --metric changed --format json
diffdevil query --files --metric modified --gt 20 --select path --format lines
diffdevil check --files all --metric changed --lte 100
diffdevil query --expr 'totals.lines.deleted + totals.lines.modified' --format json
```

Metric aliases include `changed`, `modified`, `added-only`, `deleted-only`,
`raw-added`, `raw-deleted`, `raw-churn`, `destructive`, and `files`.
`destructive` is deleted-only plus modified positions, not a risk judgment.
`metrics.NAME` addresses a declared custom metric. `schema --kind metrics`
provides the executable catalog.

`query --files` is a flag; `check --files any|all` is a quantifier.
A file query defaults to paths. `--select` accepts one field or a comma-separated
record selection. Repeated `--path` patterns are alternatives; they use the
product's rename-aware path matcher, not shell expansion.

`--scope NAME` selects a named scope. A named metric already owns its scope.
`--all-files` includes observed excluded files when that selection is supported.
`--certain` intentionally projects the definite observed subset, retaining an
evidence note. Use it for a definite-subset question rather than calling the
subset the complete change.

Comparators are `--gt`, `--gte`, `--lt`, `--lte`, `--eq`, and `--ne`.
`--status exact|bounded|unknown|unmeasurable` is an alternative status predicate.
Expression selectors and metric/file shortcut selectors are separate forms.

## Understand the measurements

For each contiguous edit block under `replacement-lines-v1`, paired added and
deleted positions become modified lines. Unpaired additions and deletions remain
added-only and deleted-only. Pairing never crosses unrelated edit blocks.

For one block with two deletions and three additions: raw churn is 5, modified is
2, added-only is 1, deleted-only is 0, and replacement-aware changed is 3.
An addition and a deletion in separate blocks do not become one modification.

The report distinguishes observed and included files. Path exclusions change
the selected totals without erasing acquired file facts. `size@1` has no automatic
generated/vendor/lockfile exclusion. Binary or submodule material can be visible
while line measurement is unmeasurable.

For a measurement bounded to 60–70, `<= 100` is true, `> 100` is false, and
`> 65` is unresolved. `--format value` cannot emit an exact number for that range.
A band can be known when the whole range lies in it; crossing band boundaries
leaves the band unresolved. Unknown is distinct from false, zero, empty, invalid,
and unavailable acquisition.

## Choose the output

| Format | Useful consumer and behavior |
| --- | --- |
| `human`, `markdown`, `agent` | Reading views; agent is compact deterministic text |
| Analyze `json` | Full `diffdevil.report` with source, semantics, files, totals, and policy results |
| Query `json` | Typed `diffdevil.query` envelope, including evidence and collection membership |
| Plan `json` | Desired `diffdevil.plan`; not a provider-write receipt |
| Query `value` | One exact present scalar with a trailing newline |
| Query `lines` | Determined scalar selection, one item per line |
| Query `nul` | Determined string selection with NUL delimiters, useful for paths |
| Query `jsonl` | Determined plain JSON items |
| Analyze `jsonl` | Header/file/summary records; the final summary completes the stream |
| Analyze `env` | Fixed key/value data with evidence companions, not shell code |

`value` rejects null, missing values, records, collections, and delimiter-bearing
strings. Strict collection formats reject unresolved selection; JSON represents it.
An exact empty selection legitimately writes zero bytes in lines/NUL mode.

Inspect numeric `.status` before `.value`; bounded measurements use `.lower`
and `.upper`. A query envelope's typed value is not the same shape as a report
total. `schema --kind report|query|plan|config|language|metrics` describes the
selected family. Use one actual kind, not that literal alternatives string.

## Reuse reports and handle exits

```sh
diffdevil analyze --format json --output report.json
diffdevil query --report report.json --metric changed --format json
diffdevil query --report report.json --files --select path --format nul
```

A plain report query retains its stored meaning rather than discovering today's
local policy. Explicit configuration or preset selection reevaluates it.
A new report is needed for new source evidence, not for every question.

Exit `0` means a successful operation, a true check, or matching label definitions.
Exit `1` means a valid false check or known definition drift. Exit `2` means an
invalid or failed operation, including incomplete application. Exit `3` means
the requested decision or strict output is unresolved.

JSON analysis may exit zero with bounded/unknown values. `plan --require-resolved`
can return 3 and still write its inspectable JSON plan. `onUnknown: fail` instead
is the policy's error choice. These are tool outcomes; the caller selects how they
affect its workflow.

`--output PATH` directs the artifact to a file and leaves stdout empty. Strict
output is validated before replacing an existing file. After a failed invocation,
an older file at that path is not the new result. Diagnostics use stderr;
`--diagnostics json` emits structured diagnostic lines.

## Shell use and recovery

Pass path patterns as quoted data. For complex detail strings use a UTF-8
expression file and `--expr-file PATH`. `--expr-stdin` and diff `--stdin` cannot
both consume the same stream. Typed `--param NAME=VALUE` bindings avoid building
expressions through string interpolation.

In PowerShell, capture `$LASTEXITCODE` immediately after the native command:

```powershell
$value = diffdevil query --metric changed --format value
$status = $LASTEXITCODE
if ($status -eq 0) { $changed = [long]$value }
else { Write-Host "No exact scalar was returned; exit $status." }
```

For a rejected scalar, request JSON to inspect evidence. For an invalid expression,
use its diagnostic/source location and the language catalog. For missing Git
objects, select a source whose actual evidence is available. For truncated upstream
evidence, local exact Git objects may improve the comparison. Report what was
actually acquired rather than relabeling a partial source as complete.

[Presets and shortcuts](https://github.com/Wolfsblvt/diffdevil/blob/main/docs/manual/policy/README.md)
and [interchange](https://github.com/Wolfsblvt/diffdevil/blob/main/docs/manual/reference/language-and-contracts/schemas-and-compatibility.md)
provide the deeper catalogs. Use documentation for the executable release when
a current-source example differs from the installed interface.
