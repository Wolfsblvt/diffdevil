# CLI commands and output formats

Use this reference to select a command, source family, arguments and output contract.
The [CLI guide](../use/cli.md) owns the ordinary installation and operating journey;
[script use](../start/use-results-in-scripts.md) supplies complete shell consumers.
The reference describes the current source contract. An installed distribution must
actually contain the selected option; `--help` and `--version` identify that executable.

## Invocation and source families

Run `npx diffdevil` after `npm i -D @wolfsblvt/diffdevil`, or use an already installed
`diffdevil`. No package version is hardcoded into ordinary installation. Node 22 or
newer is the package runtime floor. Git is needed for Git sources, not for a supplied
patch or saved report. Credentials are needed only for operations that acquire or
apply through GitHub.

| Source selection | Comparison |
| --- | --- |
| No source flags | HEAD versus final tracked worktree, staged and unstaged changes counted once; not untracked files. |
| `--staged` | HEAD versus index. |
| `--base REF --head REF` | Merge-base-to-head by default. Both revisions are required. |
| `--comparison direct` with both revisions | Direct comparison of those revisions. |
| `--diff-file PATH` or `--stdin` | Complete supplied unified diff, file or stdin. |
| `--report PATH` | A validated normalized saved report, not an Action summary. |
| `--repo OWNER/REPO --pr NUMBER` | Explicit GitHub PR acquisition. |

Select at most one family. `--cwd PATH` chooses the working directory; it does not
silently fetch missing refs. Controlled Git execution does not invoke repository
scripts, external diff drivers or text conversion. A non-Git directory without an
explicit source is `E_SOURCE`, not an empty result. Only one input can own stdin:
`--stdin` and `--expr-stdin` conflict. `--target-repo` and `--target-pr` name an inert
plan destination, not an acquisition request.

## Common options and compatibility

| Options | Contract |
| --- | --- |
| `--help`, `--version` | Discover the selected executable. |
| `--config PATH`, `--no-config` | Explicit JSON/YAML configuration or bypass discovery. They conflict. No-config does not remove presets. |
| `--preset ID` | Repeatable ordered preset selection; `size@1` selects size, `none` selects none. Unknown IDs fail. |
| `--exclude`, `--include-only`, `--force-include` | Repeatable path patterns; append by default. |
| `--exclude-mode`, `--include-only-mode`, `--force-include-mode` | Select `append` or `replace` for the corresponding invocation list. |
| `--param NAME=VALUE`, `--params-file PATH` | Typed bindings; file is a JSON object. Split the first equals sign only; duplicate bindings fail. |
| `--format FORMAT` | Select a command-supported representation. No universal every-command format set. |
| `--output PATH` | Write the selected artifact to a file, leaving stdout empty. |
| `--diagnostics human\|json` | Select stderr diagnostic presentation; JSON diagnostics use JSONL. |
| `--color auto\|always\|never`, `--detail auto\|compact\|full` | Human `analyze` and `plan` presentation only, not arbitrary machine-format options. |

Options requiring a value cannot omit it. Repeated non-list flags, unknown flags
and unsupported combinations are errors before acquisition. Typed invocation data
never becomes executable configuration. Local read-only commands discover only
`.diffdevil.yml` at Git root or the non-repository current directory. A report query
without explicit policy retains compatible stored results and bypasses discovery;
explicit config or preset selection recomputes under that deliberately selected policy.
Write commands use a different trusted-policy contract below.

## analyze

Acquire facts, calculate configured metrics and bands, and emit a report without
provider mutation. It does not run configured rule effects. Read the included
measurements alongside excluded file records and the source identity.

```sh
npx diffdevil analyze --diff-file docs/examples/diffs/review.diff --no-config --format json --output report.json
```

The complete [small patch](../../examples/diffs/review.diff) produces 10 Changed
and 16 raw churn. It is not the separate 178-Changed presenter specimen.

## query

Select one expression (`--expr TEXT`, `--expr-file PATH`, `--expr-stdin`), one saved
query (`--name NAME`), a band (`--band ID`), or a structured shortcut. Do not mix
expression selectors and shortcut flags. A `.ddexpr` file contains one UTF-8
expression, not Markdown or a script. `--band` returns the selected ID or an unknown
string when resolution is unavailable.

Structured shortcuts select `--metric`, optional `--scope` and repeatable `--path`,
`--files`, `--select`, `--all-files`, `--certain`, or status/threshold conditions in
their supported shapes. Friendly measures include `changed`, `raw-churn` and
`destructive`; a named metric uses `metrics.<id>` explicitly. Query `--files` is a flag; check `--files any` and `--files all`
ask per-file conditions. Use `--select path` for paths, not a coercion of arbitrary records.
`--status exact|bounded|unknown|unmeasurable` is the evidence-status selector
and conflicts with a numeric comparator. `--certain` deliberately narrows to
definite observed members and is never an implicit repair.

```sh
npx diffdevil query --report report.json --metric changed --format value
npx diffdevil query --report report.json --expr 'map(filter(files, f => f.included), f => f.path)' --format nul
```

A named metric already owns its scope: combining it with invocation scope/path or
all-files selection is invalid. Exact alias, operator and collection contracts are
available in [detail](language-and-contracts/detail-language.md).

## check

A check requires a boolean expression/saved query or a valid shortcut condition.
The comparators are `--gt`, `--gte`, `--lt`, `--lte`, `--eq` and `--ne`; their
threshold is data. Do not supply competing comparisons. Numeric uncertainty can
still prove a threshold from bounds.

```sh
npx diffdevil check --report report.json --metric changed --lt 20 --format json
```

Without an explicit format, check writes no stdout and communicates its decision
through its exit. JSON additionally carries the decision envelope. Invalid input
produces diagnostics, not a valid unknown decision envelope.

## validate and explain

```sh
npx diffdevil validate --config docs/examples/policies/story/rules.yml --format json
npx diffdevil explain --policy --config docs/examples/policies/story/rules.yml --format yaml
npx diffdevil explain --metric destructive
```

`validate` checks the effective policy and all its declarations. It does not
acquire provider data or promise a future rule result. `explain --policy` emits
normalized policy and origins; YAML is complete reusable expanded policy, JSON
also carries explanatory metadata. Without `--policy`, explain lowers supported
shortcuts to their equivalent expression. It is not a universal per-value provenance
explorer or a command that explains any arbitrary result.

## plan and apply

```sh
npx diffdevil plan --diff-file docs/examples/diffs/review.diff --config docs/examples/policies/story/comments.yml --target-repo example/repository --target-pr 42 --format json --output desired.json
```

`plan` evaluates rules and emits desired/held effects without contacting that
target. A report's known repository/PR can supply target identity; a contradictory
explicit target is rejected. `--rule ID` selects one rule. `--definitions
none|ensure|sync` controls desired definition operations and defaults to none for
CLI planning. `--require-resolved` selects exit 3 for held decisions while preserving
the canonical inspectable plan. A configured `onUnknown: fail` is instead an error.

`apply` is an explicit GitHub writer. Its source is current provider evidence or
controlled exact-commit Git with `--git`. It normally reacquires before application.
A supplied `--plan PATH` must match a freshly derived plan. Supplying a report also
requires the explicit `--trust-report` host assertion; schema validity, hashes,
same-job paths and downloaded artifacts are not authentication. Actions do not offer
this CLI trusted-report option. `--rule` must match the selected-rule plan.

Write policy is bundled by default; explicit config comes from the current PR base.
`--policy-source base|pinned|workspace` selects trust, `--policy-ref FULL_SHA` binds a
pinned source, and `--policy-repository OWNER/REPO` selects an explicit policy origin.
Workspace deliberately trusts local configuration; it is not ambient discovery.
Remote templates share the selected policy commit. `--definitions
none|ensure|verify|sync` controls apply, normally ensure unless a saved plan supplies
its own default. Every effect checks current target identity and retains readback.

`--occasion ID` supplies stable create-comment deduplication. `--comment-author LOGIN`
and optional `--comment-author-id ID` identify the expected comment principal.
Credentials come from `GH_TOKEN` or `GITHUB_TOKEN`, never an expression parameter
or a command-line token flag. Use the [complete apply journey](../use/shared-workflows/reports-plans-and-apply.md)
before running these provider operations against a real repository.

## labels

`labels verify --repo OWNER/REPO` is read-only and compares managed definitions.
`labels apply --repo OWNER/REPO` explicitly synchronizes those definitions by default;
`--definitions ensure` selects create-missing only. Neither command changes PR
assignments or runs size rules. Explicit base config resolves the observed default
branch commit and checks drift, not a PR head. Unrelated definitions are preserved.
An existing unavailable label yields `E_LABEL_UNAVAILABLE`, not a fabricated success;
explicit synchronization is the deliberate repair when authorized.

## schema

`schema --kind config|report|query|plan|language|metrics` emits the selected current
machine contract or catalogue. The CLI `config` name and the library's schema kind
`policy` refer to configuration at their respective interfaces; they are not
interchangeable literal arguments to every API.

```sh
npx diffdevil schema --kind report
npx diffdevil schema --kind language
```

## Output formats and stream guarantees

| Format | Meaning and refusal boundary |
| --- | --- |
| `human` | Reading projection. Human reports/plans honor color/detail; not a replay artifact. |
| `agent` | Stable bounded machine-assisted reading projection, plain and color-free; not canonical report/plan JSON. |
| `json` | Canonical command artifact: report, query, plan, or the command's documented result. |
| `value` | Query scalar only when exact and representable. Does not choose a point in a bound. |
| `lines` | Determined string collection, one item per line; newline-containing paths are refused. |
| `nul` | Determined string collection separated by NUL bytes, suitable for arbitrary newline paths. |
| `jsonl` for query | Strict determined collection, one plain JSON value per item. No unresolved or missing members silently omitted. |
| `jsonl` for analyze | Report header, file records and mandatory final summary. Not the query protocol. |
| `env` for analyze | Fixed safe `DIFFDEVIL_*` scalar/status/bound keys. Data, never shell code to eval. |
| `markdown` | The selected command's Markdown projection; not a canonical transport or evidence upgrade. |
| `yaml` for policy explanation | Expanded ordinary configuration; not a report format. |

A command rejects formats it does not support. Human `auto` color follows output
terminal/environment conditions; file output is plain unless `always` deliberately
persists ANSI. Machine and agent stdout contain only the selected artifact, never
progress banners or ANSI. Diagnostics go to stderr; `--diagnostics json` does not
turn stdout into a diagnostic stream.

Strict formats validate the whole semantic result before emission. File output
validates before replacing an existing file, with a temporary sibling and atomic
rename where supported. A pipe, disk or OS failure can still interrupt transport;
an old file or partial stream is not a newly successful result.

## Exit codes and recovery

| Exit | Contract |
| --- | --- |
| 0 | Operation succeeded; check true; definition verification matched. Analysis can still contain unknowns and a normal plan can contain holds. |
| 1 | Valid check false, or known label-definition verification drift. |
| 2 | Invalid input or failed operation, including source, config, type, domain, limits or incomplete apply. |
| 3 | Valid evidence cannot establish the decision or strict output, or require-resolved planning contains holds. |

Do not collapse 1 and 3 into one false branch or 2 into a zero value. Preserve
structured diagnostic code, phase, source name, configuration pointer and available
span. Spans use zero-based UTF-16 offsets with exclusive ends; display line/column
is one-based. A missing location is omitted, not invented at column zero.

The [Bash and PowerShell consumers](../start/use-results-in-scripts.md) handle the
native npm launcher and exits. Use expression files or typed parameters for complex
quoting rather than interpolating data into source. Availability of an option in
this source does not move an npm release or Action tag; update to a distribution
that actually ships the contract before relying on it.
