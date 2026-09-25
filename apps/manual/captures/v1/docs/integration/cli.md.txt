# CLI integration contract

## Meaning

This document defines the composable diffdevil CLI: source selection, shorthand and expression arguments, result formats, exit codes, quoting, discovery, and plan/application boundaries. It is a selected interface specification. The no-language first-use guide is [Automation](../automation.md); expression semantics are independent of the shell carrying them.

## Current executable standing

The development build implements `analyze`, `query`, `check`, desired-effect
`plan`, policy `validate` and effective-policy `explain` over local Git,
unified-diff input and validated reports. `--expr`, `--expr-file`, and
`--expr-stdin` execute detail through Chevrotain and the shared typed interpreter.
Structured metric/file shortcuts remain language-free. Strict outputs and check
exit codes are implemented. Text diagnostics preserve source names, original
UTF-16 ranges, and line/column details, including BOMs transported from files/stdin.

YAML/JSON configuration, bundled presets, named metrics/queries, bands,
typed parameters and desired plans now use the shared policy compiler. `schema`
supports report/config/query/plan/language/metrics. `explain` prints a shortcut's equivalent
source; `explain --policy` emits normalized policy with override origins.

GitHub acquisition/application and label definition verify/apply are implemented
through the shared adapter. Finer per-value provenance explanations remain open. Discovery loads `.diffdevil.yml`
at the Git root (or non-repository working directory). YAML uses core 1.2 semantics,
bounded aliases and original source coordinates. Invalid policy is never ignored.
See [Qualification](../qualification.md) for evidence.

### Current configured commands

```sh
diffdevil validate --config policy.json --format json
diffdevil explain --policy --config policy.json --exclude 'vendor/**' --format json
diffdevil query --config policy.json --name weighted --format value
diffdevil check --config policy.json --name over-limit --param threshold=200
diffdevil plan --config policy.json --target-repo example/repository --target-pr 42 --definitions ensure --format json
```

`--config` selects an explicit JSON or YAML file. `--no-config` disables discovery, not
presets. `--preset size@1` and `--preset none` are explicit preset selection.
Path arrays append by default; corresponding `--exclude-mode`,
`--include-only-mode` and `--force-include-mode` can replace, with an empty
replacement clearing that layer. Template files resolve relative to the explicit
configuration file, not the caller's working directory.

`--params-file PATH` reads a JSON object. Repeated `--param NAME=VALUE` uses the
declared type and splits only the first equals sign; duplicate bindings, including
across file and flags, are errors. A declared string keeps `001` unchanged.
Saved query names use `--name`, named metrics use `--metric metrics.NAME`, and a
band ID uses `--band NAME`. A check over a rule's optional decision is explicit:
`--expr 'requirePresent(rules.weighted.decision)'`.

A report query bypasses discovery and retains stored results. Explicit configuration
or preset selection recomputes paths and results; no hidden default exclusions are
imported from the saved report. Planning a saved report requires selected policy
or explicit built-in defaults. A local diff needs a plan target; a report's known
repository/PR may supply it, but an explicit contradictory target is rejected.
`--target-repo`/`--target-pr` do not request GitHub source acquisition.

`--definitions none|ensure|sync` controls desired definition operations. The CLI
default is none; the future root Action selects ensure. Plans, including comments,
are data only. Strict output is validated before writing stdout or atomically
replacing an output file. Unknown/failing results do not overwrite an existing file.

## Command surface

| Command | Result and mutation boundary |
| --- | --- |
| `analyze` | Acquire facts, calculate requested/configured metrics and bands, emit a report. No provider mutation. |
| `query` | Select one value or collection from facts/policy results. No provider mutation. |
| `check` | Evaluate one boolean decision. No provider mutation. |
| `plan` | Evaluate policy and emit intended/held effects. No provider mutation. |
| `apply` | Explicitly apply a current trusted policy or validated saved plan to GitHub. |
| `labels verify` | Read and compare required label definitions. No mutation. |
| `labels apply` | Create/update explicitly managed label definitions. |
| `schema` | Emit a selected schema or the language/metric catalog. |
| `explain` | Explain a value, rule, scope, evidence limitation, or effective policy. |
| `validate` | Validate configuration/expressions without provider mutation. |

The `sync-labels` Action path remains the provider entry point for label definitions. Earlier pre-release CLI spellings `labels validate` and `labels sync` are not permanent compatibility aliases; current documentation uses the explicit verify/apply vocabulary.

## Source selection

Choose at most one source family:

| Input | Meaning |
| --- | --- |
| No explicit source | `HEAD` versus final tracked worktree content, including staged and unstaged changes once. |
| `--staged` | `HEAD` versus index. |
| `--base REF --head REF` | Three-dot comparison from merge base to head by default. |
| `--base REF --head REF --comparison direct` | Direct two-revision comparison. |
| `--diff-file PATH` | Supplied unified diff. |
| `--stdin` | Supplied unified diff on stdin. |
| `--report PATH` | Validated normalized saved report. |
| `--pr NUMBER --repo OWNER/REPO` | GitHub PR API source. |

For explicit revision comparison, both `--base` and `--head` are required in this contract. Avoid a hidden second meaning for a half-supplied pair. Revision arguments are passed to controlled Git invocation as data; no external diff driver or text conversion is executed by the source adapter.

The no-argument local source excludes untracked files because they are not part of the selected tracked Git comparison. It reports this source choice clearly. A future untracked-file adapter can be explicit without changing what `HEAD` versus tracked worktree means.

Stdin can have only one owner. `--stdin` for a diff conflicts with `--expr-stdin`. A saved report does not trigger a network refresh unless explicitly requested by an operation that needs current provider state, such as apply. A report-source query stays usable offline.

A non-Git working directory with no source is `E_SOURCE`, not an empty diff. Missing commits, unsupported diff formats, and authentication failures are source errors, not unknown numeric measurements.

## Configuration and semantic selection

Local commands discover `.diffdevil.yml` at the selected repository root. They do not walk arbitrarily above the root. `--config PATH` selects a file explicitly; `--no-config` uses built-in defaults without discovery. `--preset size@1` selects the preset; `--preset none` means no preset. Repeated preset inputs form an ordered list when multiple bundled presets exist.

When reading a report that already contains evaluated policy results, a query can use those compatible saved results without a configuration file. Re-evaluation with a different policy requires explicit configuration and produces new result metadata. Do not silently reinterpret a saved rule under today's filesystem configuration.

The host records resolved language, numeric, measurement, path, preset, and report versions. Unsupported major semantics fail before evaluation. Limits are selected by trusted host options, not by an untrusted policy file.

## Query and check selectors

Use exactly one of an expression selector or the structured shortcut family:

```text
--expr TEXT
--expr-file PATH
--expr-stdin
--name SAVED_QUERY
```

`--name` for `query` selects a configured saved query. `check --name` requires that saved query's result type to be boolean. Expression files are UTF-8 and contain one expression, without a Markdown wrapper.

Shortcuts use `--metric`, comparator flags, `--files`, `--scope`, `--path`, `--select`, and `--certain` as specified in [Presets and shortcuts](presets-and-shortcuts.md). They are not combined with expression selectors. A query with `--band size` selects the resolved band ID as a string result, or an unknown string result when unresolved; it does not expose a missing `.id` as an ordinary absent field.

Typed parameters use repeated `--param name=value`. Split at the first `=` only. Parameter names come from declarations; values are parsed according to declared type. `--params-file PATH` accepts a JSON object of typed values. Supplying the same parameter twice is an invocation error rather than last-writer-wins ambiguity.

## Output formats

### Human and agent

`analyze` defaults to the compact human summary. Replacement-aware `Changed` is always the primary result, followed by its added-only, deleted-only, and modified decomposition; raw and file facts are quieter supporting context. Evidence remains explicit as glyph plus word (`= exact`, `≈ bounded`, `? unknown`, `∅ unmeasurable`). `plan` gives desired provider effects their own projection and never implies that a provider write or readback occurred.

`--detail full` expands aggregate identities, evidence, file categories, scopes, configured metrics, bands, rules, plan preconditions, and desired operations. It does not dump individual file records; JSON and report JSONL own exhaustive record-level consumption.

Human report and plan output support `--color auto|always|never`, defaulting to `auto`. Automatic color requires an interactive true-color terminal, respects `NO_COLOR` and `FORCE_COLOR`, and remains plain when redirected or written through `--output`. Color reinforces hierarchy only; every state and value remains complete in plain text.

`--format agent` emits a materially different fixed-order record projection headed by `diffdevil.agent-report/1` or `diffdevil.agent-plan/1`. It preserves semantic/source identity, evidence, replacement-aware and raw facts, files, scopes, metrics, bands, rules, desired effects, and absent readback without human prose, ANSI color, or generated review judgment. It is optimized for coding-agent context, not offered as a second semantic model.

`--format markdown` remains readable documentation/workflow prose. Human and agent text are public projections, not stable field-extraction protocols; automation requiring structured fields uses canonical JSON or JSONL. [Human and agent presentation](../presentation.md) owns the full grouping, density, color, agent-record, plan, and projection-versioning contract.

### Canonical JSON

`analyze --format json` emits one versioned report object. `plan --format json` emits one plan. `query --format json` emits a versioned query-result envelope containing a typed value and evidence. These formats can represent uncertainty successfully and exit zero when the operation itself succeeded.

A query envelope is intentional: `{status: bounded, ...}` cannot be safely confused with an ordinary user record. External consumers can use jq, PowerShell `ConvertFrom-Json`, Python, or the TypeScript report reader. Do not scrape the human view.

### Exact scalar value

`query --format value` requires one exact present scalar number, boolean, or string. Numbers use locale-independent decimal serialization, booleans use `true`/`false`, strings are raw text. It writes a trailing newline. Missing/null, records, and collections are `E_FORMAT_TYPE`; unresolved scalar evidence produces exit `3` with `E_RESULT_UNRESOLVED`.

A scalar string containing CR, LF, or NUL cannot use `value`; use JSON. This keeps shell assignment and one-value output unambiguous.

### Lines and NUL-delimited values

`--format lines` requires a complete determined collection of exact present scalar strings/numbers/booleans. It writes one item per line, with no decoration. CR/LF/NUL in a string are `E_FORMAT_DELIMITER`.

`--format nul` accepts a determined collection of present strings and writes a NUL after every item. A string containing NUL is rejected. Use it for arbitrary Git paths when newline separation is unsuitable.

An empty determined collection writes zero bytes and exits zero. An incomplete collection does not masquerade as an empty determined collection.

### JSON Lines

`query --format jsonl` writes one plain JSON value per determined selected collection item. Numbers must be exact; optional missing fields or unresolved members cannot be silently omitted. Explicit null is representable. For records, field order is stable. Use canonical query JSON for lossless unresolved results.

`analyze --format jsonl` uses typed report records rather than the query format: one header with semantic versions and source, zero or more file records, and one summary containing aggregate evidence and completion standing. This can represent an incomplete diff successfully because each record is explicitly a report fragment, not a plain result list. These two command-specific JSONL contracts are documented separately in the interchange reference.

### Environment data

`analyze --format env` emits fixed `DIFFDEVIL_*` key/value data for standard scalar facts. Each measurement has an explicit status and optional value/lower/upper fields. Only fixed safe key names and normalized scalar values are emitted. This is not shell code; do not ask users to `eval` it. Rich user strings and records belong in JSON.

## Stdout, stderr, and output files

In machine formats and agent format, stdout contains only the selected artifact. No progress message, ANSI color, warning, or version greeting is allowed. Human report and plan output may contain ANSI only under the explicit color contract above. Diagnostics, including informational evidence limitations when requested, go to stderr. `--diagnostics json` makes stderr diagnostics structured JSONL.

`--output PATH` writes the selected artifact to that file and leaves stdout empty. Human `--color auto` is plain on that route; `--color always` is the deliberate opt-in to persist ANSI bytes. The tool validates before replacing an existing output, uses a temporary sibling and atomic rename where supported, and reports filesystem failures honestly. An existing file is not considered a successful result after a failed invocation.

Strict selected-result modes resolve and validate the entire result before starting stdout emission, within the selected output budget. A broken pipe or disk error can still interrupt transport. Such an interruption is not a successfully completed partial query.

## Exit statuses

| Status | Meaning |
| --- | --- |
| `0` | Successful operation; check true; labels verification matches. |
| `1` | Valid check false, or label verification found drift. |
| `2` | Invalid input or operation, including config/type/domain/source/resource/apply errors. |
| `3` | Valid evidence cannot establish the requested decision or strict selected result. |

`check` emits no stdout by default. Its true/false result belongs in exit status. `check --format json` additionally emits the decision envelope while preserving exits 0/1/3. Invalid checks emit diagnostics only and exit 2.

A valid plan with held rules exits zero. `plan --require-resolved` makes unresolved policy decisions exit 3 while still allowing the canonical JSON plan to be written for inspection. A configured `onUnknown: fail` is a policy error and exits 2. These are different author choices.

## PowerShell examples

```powershell
$value = diffdevil query --report report.json --metric changed --format value
if ($LASTEXITCODE -ne 0) { throw 'No exact changed-line count was returned.' }
$changed = [long]$value
```

```powershell
diffdevil check --files any --metric changed --gt 100
switch ($LASTEXITCODE) {
    0 { Write-Host 'At least one included file exceeds the threshold.' }
    1 { Write-Host 'No included file exceeds the threshold.' }
    3 { throw 'The threshold decision is unresolved.' }
    default { throw 'diffdevil failed.' }
}
```

For expression text without quoted strings, single-quoted arguments are straightforward:

```powershell
diffdevil check --expr 'metrics.review >= 100 && totals.files.included >= 5'
```

With language string literals, a useful form is:

```powershell
diffdevil check --expr "any(files, f => f.included && pathMatches(f, 'src/**'))"
```

There are no `$` identifiers in detail. Nevertheless, arbitrary data should be a parameter, not inserted into that double-quoted expression. For complex expression text use `--expr-file`.

PowerShell's native argument transport changed in 7.3, and `.cmd`/`.bat` wrappers have special behavior. An npm launcher may traverse that path. The examples need qualification on Windows PowerShell 5.1 and current PowerShell 7 with the actual installed CLI shim, not just direct `node` invocation. See [P1](../reference/2026-09-09/sources-and-research.md#p1).

## Bash examples

```bash
if diffdevil check --metric destructive --gte 500; then
  printf '%s\n' 'The configured threshold is met.'
else
  rc=$?
  case "$rc" in
    1) printf '%s\n' 'The configured threshold is not met.' ;;
    3) printf '%s\n' 'The decision is unresolved.' >&2; exit 3 ;;
    *) exit "$rc" ;;
  esac
fi
```

Use outer single quotes and inner double quotes for expression strings:

```bash
diffdevil query --expr 'map(filter(files, f => f.included && pathMatches(f, "src/**")), f => f.path)' --format lines
```

Bash cannot include a literal single quote inside a single-quoted string. Expression files and typed parameters avoid escalating quote complexity. See [B1](../reference/2026-09-09/sources-and-research.md#b1).

## Label definitions and explicit application

```powershell
diffdevil labels verify --repo owner/repository
diffdevil labels apply --repo owner/repository
diffdevil apply --repo owner/repository --pr 42
```

`labels verify` compares the selected policy's managed definitions without writing. Exit 1 reports missing or different definitions. `labels apply` defaults to synchronizing explicitly managed definitions, preserving all unrelated definitions. `--definitions ensure` creates missing definitions but preserves existing metadata.

`apply` defaults to ensuring missing required definitions and applying the chosen PR policy. A token alone never runs these commands. A saved plan must be selected explicitly with `--plan PATH`; mixing a saved plan with a different formula, threshold, or policy override is invalid.

Credentials use the host's selected secure credential route, not expression parameters. Diagnostics never echo token values.

## Discovery and validation

```powershell
diffdevil schema --kind config
diffdevil schema --kind report
diffdevil schema --kind language
diffdevil schema --kind metrics
diffdevil explain --policy --format yaml
diffdevil explain --metric changed
diffdevil validate --config .diffdevil.yml
```

`explain --policy --format yaml` exports the complete effective ordinary policy with explicit preset expansion. Human explanations include origin and evidence. Schema output contains stable machine contracts rather than an instruction to search source code.

The public coding-agent guidance should prefer these discovery and machine interfaces. No separate agent language or second numeric model is needed.

## Explicit GitHub writes

```sh
diffdevil apply --repo example/repository --pr 42 --format json
diffdevil apply --repo example/repository --pr 42 --config .diffdevil.yml --rule size
diffdevil apply --plan desired.json --config .diffdevil.yml --format json
diffdevil labels verify --repo example/repository --config .diffdevil.yml
diffdevil labels apply --repo example/repository --config .diffdevil.yml
```

These commands are explicit provider operations. Use a host-selected `GH_TOKEN`
or `GITHUB_TOKEN`; there is no credential command-line argument. The default
apply policy is bundled `size@1`, with missing definitions ensured and no comments.
An explicit config is loaded at the current PR base commit. Definition-only
commands load config from a resolved default-branch commit without acquiring a PR.
Write commands do not discover `.diffdevil.yml` from the current directory.

`--policy-source pinned --policy-ref FULL_SHA` selects a deliberate immutable
policy, optionally from `--policy-repository OWNER/REPO`.
`--policy-source workspace` deliberately trusts the supplied local config.
Remote templates use the same commit as the policy; workspace templates resolve
relative to their config. `--no-config` chooses built-in policy, not head discovery.

Apply normally reacquires current GitHub evidence. `--git` instead compares the
PR's exact current commits already present locally, without checkout, fetch,
repository scripts, executable clean filters or filesystem monitors. Both paths
verify the current PR before each effect. `--report PATH --trust-report` is an
explicit host assertion that a bound report's acquisition and carrier are trusted;
a path or hash is not authentication. A supplied `--plan` must match a freshly
derived desired plan. Supply `--rule` consistently for a selected-rule plan.

`--definitions none|ensure|verify|sync` controls definition behavior during apply.
A saved plan supplies its own ensure/sync/none default; otherwise apply uses ensure.
`labels verify` is read-only; `labels apply` defaults to sync, with
`--definitions ensure` available for create-missing only. Verify exits 1 for
known definition drift, 2 for acquisition/permission failures, and 0 for a match.
Apply exits 0 for verified reconciliation and 2 for incomplete effects; the
JSON result retains every attempted operation and readback. Held rules are
reported as holds, not effects that succeeded.

Use `--comment-author LOGIN` (and optionally `--comment-author-id ID`) for an
App principal other than the ordinary GitHub Actions bot. Create-mode comments
need a stable `--occasion ID`; retries should retain that ID. Comments require
an explicit policy/template, never merely a supplied token.

`plan --require-resolved` still writes the inspectable plan, but exits 3 when it
contains held rules. `explain --policy --format yaml` emits reusable expanded
policy YAML; JSON additionally preserves the explanatory metadata.
