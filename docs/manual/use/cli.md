# CLI

Use the CLI when you want to inspect a change, ask a precise question, put a result in a script, or deliberately operate GitHub metadata. It works in repositories of any programming language. Local analysis needs neither a diffdevil account nor a GitHub token.

## Install and identify the executable

Use Node.js 22 or newer. In a project that keeps development tools in npm, run:

```sh
npm i -D @wolfsblvt/diffdevil
npm exec -- diffdevil --version
npm exec -- diffdevil --help
```

The version command reports the executable actually selected. Commit your project's dependency and lockfile changes through its normal process; the guide does not prescribe a fixed package version. To update that installation, use `npm update @wolfsblvt/diffdevil`, then repeat the version/help check and your affected commands.

For a one-off run without adding a dependency to a non-JavaScript project:

```sh
npm exec --yes --package=@wolfsblvt/diffdevil -- diffdevil --version
```

Registry access is needed to obtain an uncached package, not to analyze an already available local input. An existing global installation can be used directly as `diffdevil`. The remaining examples use `npm exec -- diffdevil` for the project-local route; do not accidentally select a different global executable midway through a workflow.

This manual describes the current source interface. The installed release's `--help` governs the options you can run. The enhanced human presenter, `--detail` and `--color` require the release carrying them; an older published package may have the same measurement semantics and a different presentation. Source-checkout use is documented in [Development](../../DEVELOPMENT.md): build the checkout and substitute its absolute `dist/lib/cli/main.js` entry after `node`. Do not run a relative source-checkout path from a different repository.

## Select the comparison before reading its size

The [local first-success guide](../start/analyze-local-changes.md) runs the supplied four-file patch. For ordinary work, choose one source family:

| Invocation after `npm exec -- diffdevil` | What it measures |
| --- | --- |
| `analyze` | `HEAD` against final tracked worktree content, staged and unstaged together once |
| `analyze --staged` | `HEAD` against the index |
| `analyze --base origin/main --head HEAD` | Merge base to the selected head |
| `analyze --base origin/main --head HEAD --comparison direct` | The two revisions directly |
| `analyze --diff-file change.diff` | A supplied unified diff |
| `analyze --stdin` | A unified diff from standard input |
| `analyze --report report.json` | A validated saved report, not a live refresh |
| `analyze --repo OWNER/REPO --pr NUMBER` | A current GitHub PR through the provider adapter |

`OWNER/REPO` and `NUMBER` are placeholders for the actual target. Both local revisions must already exist; analysis does not fetch, check out, stage or execute repository code. Untracked files are outside the default comparison. A non-Git directory without an explicit input is a source error, not an empty diff. Standard input can carry a diff or an expression, not both at once.

GitHub acquisition can need credentials for private access or provider capacity. Supply them through the host's `GH_TOKEN` or `GITHUB_TOKEN` environment, not a command argument, policy parameter or pasted transcript. A token grants no implicit mutation. [Source identity, trust, and mutation](../understand/trust-and-mutation.md) explains how local and provider comparisons differ.

## Choose configuration deliberately

Ordinary local commands discover `.diffdevil.yml` at the Git root, or the working directory outside a Git repository. `--config PATH` selects a YAML or JSON file. `--no-config` disables discovery, not presets; add `--preset none` to opt out of the default `size@1` policy.

Validate before depending on a new policy:

```sh
npm exec -- diffdevil validate --config .diffdevil.yml --format json
npm exec -- diffdevil explain --policy --config .diffdevil.yml --format yaml
```

The second command exports an expanded ordinary policy, not a proprietary CLI dialect. Template paths resolve beside the selected config. Repeated `--param NAME=VALUE` binds declared scalar types; `--params-file PATH` supplies a JSON object. Duplicate bindings are errors. Pass data as parameters rather than inserting it into expression text.

Path overrides append unless their corresponding `--exclude-mode`, `--include-only-mode` or `--force-include-mode` selects replacement. A discovered but invalid file is never silently ignored. Continue with [Configure policy](../policy/configure.md) for layering and [Paths and scopes](../policy/paths-and-scopes.md) for selection semantics.

## Analyze, query and check the same report

These complete commands use the packaged teaching input and do not write to GitHub:

```sh
npm exec -- diffdevil analyze --diff-file node_modules/@wolfsblvt/diffdevil/docs/examples/diffs/review.diff --no-config --preset size@1 --format json --output report.json
npm exec -- diffdevil query --report report.json --metric changed --format value
npm exec -- diffdevil check --report report.json --metric changed --lt 100
npm exec -- diffdevil query --report report.json --files --select path --format nul --output paths.nul
```

Expect Changed **10**, raw churn **16**, four included files and a true below-100 check. `check` is quiet by default; its exit is the decision. The last command writes a determined path collection with NUL separators. An arbitrary Git path can contain spaces or newlines, so do not split it as shell words.

The same captured report supports the weighted formula and file selection without changing the comparison:

```sh
npm exec -- diffdevil query --report report.json --expr 'totals.lines.deleted + 2 * totals.lines.modified' --format value
npm exec -- diffdevil query --report report.json --files --metric changed --gt 2 --select path --format lines
```

The formula returns **12**, deliberately counting modified lines twice. It does not rename the standard Changed metric. The path query returns `package-lock.json` and `src/payments.ts`; use NUL or JSON for arbitrary names.

For deeper questions use an ordinary expression, for example `query --expr 'totals.lines.deleted + totals.lines.modified' --format json`. An expression file avoids nested shell quoting. `--name` selects a configured saved query, while `--metric metrics.NAME` selects a named metric. Expressions and shortcut selectors are alternatives, not two competing instructions in one invocation.

## Choose output for its consumer

Human output is for reading. In the enhanced presenter, `--detail full` expands aggregate evidence, policy and identities; it does not dump every file. `--color never` is useful for plain human transcripts. Agent output is a compact record projection for a coding agent, not a second numeric model and not a replayable report.

Use canonical report JSON to retain all file facts, evidence and identities. Query JSON is a different envelope; plan JSON is different again. Strict `value`, `lines` and `nul` formats refuse what they cannot represent faithfully. Unknown data can be a successful JSON result but cannot become an exact scalar by changing the output flag.

Machine output goes to stdout and diagnostics to stderr. `--output PATH` validates before replacing the destination and leaves stdout empty. A failed run does not make an older file at that path current. [Use results in scripts](../start/use-results-in-scripts.md) supplies complete Bash and PowerShell consumers preserving exits 0, 1, 2 and 3.

## Reuse reports, then cross the write boundary explicitly

A report query bypasses local discovery and uses captured compatible results. Explicit configuration or preset selection requests reevaluation and new policy metadata. Saving a report freezes an observation, not the external PR.

`plan` evaluates desired effects without sending requests. `apply` performs selected effects and returns request/readback observations. Its policy rules differ from local discovery: an explicit config normally comes from the current PR base, and no config selects the built-in policy. A saved plan must match the newly derived desired plan. Read the complete [report-to-apply workflow](shared-workflows/reports-plans-and-apply.md) before using `apply`.

`labels verify` reads repository-wide definitions; `labels apply` reconciles only selected definitions. They are not PR label assignment. The [effect ownership guide](shared-workflows/labels-comments-and-definitions.md) explains ensure, verify, sync and comment lifecycles.

## Recover the failing stage

An invalid input, missing revision, unreadable config, unsupported option or provider failure exits **2** with a diagnostic. Correct that cause; it is not unknown measurement evidence. A valid false check or known definition drift exits **1**. A decision or strict output that evidence cannot establish exits **3**. Successful operations exit **0**, including JSON carrying uncertainty and plans containing holds.

For an older executable, inspect its help and update through the installation route you selected rather than removing evidence checks from a script. For a stale report or plan, reacquire the intended comparison and re-evaluate. After an ambiguous or partial write, inspect the effects journal and actual provider state before retrying. Do not assume rollback or repeat a possibly completed comment creation.

Use [CLI commands and output formats](../reference/cli.md) for exact enumeration, [Evidence and uncertainty](../understand/evidence-and-uncertainty.md) for interpretation, and [Troubleshooting](../help/troubleshooting.md) for the next useful repair.
