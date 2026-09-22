# CLI

Use the CLI to inspect a local change, ask a precise question in a script, or deliberately operate GitHub policy. You select the input and execution environment; diffdevil supplies the same [measurement and evidence model](../understand/README.md) used by the other surfaces.

## Install and identify the executable

The package requires Node.js 22 or newer. Git is needed for Git-backed comparisons, not for a supplied patch or saved report. From a JavaScript project, install a selected version as a development dependency:

```sh
npm install --save-dev @wolfsblvt/diffdevil@1.0.0
npx --no-install diffdevil --version
npx --no-install diffdevil --help
```

For a repository in another ecosystem, run it without creating a package manifest:

```sh
npm exec --yes --package=@wolfsblvt/diffdevil@1.0.0 -- diffdevil --version
```

The examples below use `diffdevil` for the executable you selected. Use that npm prefix, or put your project's `node_modules/.bin` on this shell's PATH as shown in [Use results in scripts](../start/use-results-in-scripts.md). Do not assume a globally installed command and the project's package are the same version.

The [release account](../../releases/v1.0.0.md) identifies the stable cut. Current source can contain later presentation or browser work without changing that published artifact. Use the selected executable's help and release notes when a newer source example differs from an older installation. Install-free runtime archives, where published, are described by the [Skill's runtime acquisition guide](../../../skills/diffdevil/references/restricted-harnesses.md); a source ZIP alone is not an executable bundle.

## Select the comparison you actually mean

With no source flags, analysis compares HEAD with the final tracked worktree. Staged and unstaged changes are counted together once. Untracked files are not included.

```sh
diffdevil analyze --format human
diffdevil analyze --staged --format agent
diffdevil analyze --base origin/main --head HEAD --format human
diffdevil analyze --base origin/main --head HEAD --comparison direct --format json
```

The branch comparison normally starts at the merge base. `--comparison direct` compares the two named endpoints instead. Both refs must already exist locally: this command does not fetch a missing branch for you. `--cwd PATH` selects a different local repository.

For a controlled first result, follow [Analyze local changes](../start/analyze-local-changes.md), whose complete package-supplied patch produces 10 Changed and 16 raw churn. Other input families are a UTF-8 `--diff-file PATH`, `--stdin`, a canonical `--report PATH`, or `--repo OWNER/REPO --pr NUMBER` for GitHub acquisition. Select one family; do not combine a patch with a PR selector and assume one silently wins. Stdin also cannot simultaneously carry both a patch and an expression.

Read the report's source and revision fields before comparing runs. A pasted diff need not establish the same complete source identity as a Git or GitHub acquisition.

## Select or bypass configuration

Ordinary local commands discover `.diffdevil.yml` at the Git root, or in the working directory outside Git. Select another YAML or JSON file with `--config PATH`. An unreadable or invalid selected file is an error, not permission to fall back silently.

```sh
diffdevil validate --config .diffdevil.yml --format json
diffdevil explain --policy --config .diffdevil.yml --format yaml
diffdevil analyze --no-config --preset size@1 --format human
diffdevil analyze --no-config --preset none --format json
```

`--no-config` bypasses discovery; it does not disable the default preset. `--preset none` is the separate opt-out. No hidden lockfile or generated-file exclusion is added by the default size policy.

Use `--param NAME=VALUE` for declared typed parameters, or `--params-file PATH` for a JSON object. Duplicate or unknown parameters are rejected. An expression is data for detail, never a shell command or JavaScript program. [Configure policy](../policy/configure.md) owns layering and complete declarations.

## Analyze, query and check

Analysis gives an overview. Query selects data. Check asks a boolean question:

```sh
diffdevil analyze --format agent
diffdevil query --path 'src/**' --metric changed --format json
diffdevil query --expr 'totals.lines.deleted + totals.lines.modified' --format json
diffdevil check --metric changed --lt 100
diffdevil query --files --path 'src/**' --select path --format nul --output paths.bin
```

Quote globs and expressions so your shell does not expand them first. For difficult quoting, use `--expr-file PATH`; a named policy query uses `--name NAME`. Shortcuts and expressions are alternative ways of asking the same engine, not competing languages.

Choose `human` for reading, `agent` for a compact text projection, and `json` for reusable structured results. Human `--detail full` expands aggregate identity, categories and scopes; it is not a dump of every file. Human color and detail controls do not apply to machine formats. Exact `value` and determined `lines`/`nul` output refuse uncertainty they cannot represent. Use NUL-delimited files for arbitrary Git paths; PowerShell's native line pipeline is not a byte-preserving path transport.

The [complete Bash and PowerShell consumers](../start/use-results-in-scripts.md) demonstrate exits 0, 1, 2 and 3, including a false condition, corrupt input, and an unresolved scalar. Do not scrape colored human output or execute `env` output with `eval`.

## Save facts, then decide about effects

```sh
diffdevil analyze --no-config --preset size@1 --format json --output report.json
diffdevil query --report report.json --metric changed --format json
```

These commands keep repeated questions on one comparison. A saved-report query preserves captured policy results unless you explicitly select re-evaluation. Saving JSON does not freeze the worktree or provider. Reports can contain private filenames, repository identities and policy material; choose storage and sharing accordingly.

[Reports, plans, and apply](shared-workflows/reports-plans-and-apply.md) carries the complete capture, planning, trust and application journey. Local `plan` with explicit target fields prepares desired effects without contacting that target. Only an explicit provider operation performs writes.

GitHub reads and effects use the selected provider endpoint and credentials such as `GH_TOKEN` or `GITHUB_TOKEN`. Keep tokens out of command arguments, policy, reports and source control. Provider operations are not offline, and possessing a token does not replace authority to use it.

Apply does not use ordinary implicit workspace configuration discovery. Its default policy source is the current trusted PR base; bundled defaults apply when no custom configuration is selected. CLI workspace trust is an explicit operator choice. Actions deliberately have a different, stricter write-source contract. Do not copy a local preview command into privileged automation without resolving that distinction.

## Definitions, updates and failure return

Label definitions have their own commands: `labels verify` reads and reports drift; `labels apply` performs the selected reconciliation. They do not mean “attach this label to a PR.” [Labels, comments, and definitions](shared-workflows/labels-comments-and-definitions.md) explains verify, ensure, sync and ownership.

Update a project dependency through its normal reviewed package/lock change, then check the actual executable version again. Re-run the consuming script or policy example, not only `--version`. Updating the Skill alone does not update the executable.

A missing ref, unavailable input, invalid policy or provider failure returns exit 2 with diagnostics on stderr. A check's false result is exit 1. An unresolved decision or strict output refusal is exit 3, not a fabricated zero. A plan can validly contain held rules; `--require-resolved` emits that plan but returns 3. An incomplete application retains its operation journal and exits 2. Read back possibly completed effects before retrying them.

Continue to the [CLI reference](../reference/cli.md) for exact combinations and formats, or [Source identity, trust, and mutation](../understand/trust-and-mutation.md) when a saved result is being promoted into a provider action.
