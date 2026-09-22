# Analyze local changes

Get a useful report from a small supplied patch, then select your own worktree,
staged changes, or branch comparison. This route reads changes. It does not need
a GitHub account or token and does not apply labels or comments.

## Install the executable

Use Node.js 22 or newer. From the project where you want a local development
dependency, install the package and check the executable:

```sh
npm i -D @wolfsblvt/diffdevil
npm exec -- diffdevil --version
```

Read the version actually installed. The following commands use `npm exec -- diffdevil`
so they select that project's executable. Installation needs access to the package;
subsequent analysis of local files does not contact a provider. Git is only needed
when the selected source is Git-backed.

For a diffdevil source checkout instead, run `npm ci --ignore-scripts --no-audit
--no-fund` and `npm run build` at its root, then use
`node dist/lib/cli/main.js` in place of `npm exec -- diffdevil`. The repository's
[development guide](../../DEVELOPMENT.md) owns the full build requirements.

## Run the small patch

The package includes the complete [payments review patch](../../examples/diffs/review.diff).
It changes a source file, a test, documentation, and a lockfile. Run:

```sh
npm exec -- diffdevil analyze --diff-file node_modules/@wolfsblvt/diffdevil/docs/examples/diffs/review.diff --no-config --preset size@1 --format human
```

`--no-config` avoids discovering a policy in your working directory; the explicit
preset keeps this demonstration reproducible. It does not turn off policy or
silently exclude generated files.

The result is **10 Changed / 16 raw churn**, with **4 files included**. Changed
splits into 4 added-only, 0 deleted-only, and 6 modified lines. The default policy
classifies it as the internal band `xs`. No label was applied.

This output is produced by the shared presenter from the same complete patch:

<!-- manual:generated presenter-small -->

Two adjacent source lines become three, contributing three Changed. Four
lockfile lines are replaced, contributing four more. See the
[complete accounting](../understand/changed-lines-and-churn.md#account-for-the-complete-small-example)
for the distinction from additions plus deletions.

## Measure the tracked worktree

Now run from the Git repository you want to inspect:

```sh
npm exec -- diffdevil analyze --format human
```

Without an explicit source, diffdevil compares `HEAD` with the final tracked
worktree content. Staged and unstaged changes are included once, rather than
counted as two separate patches. Untracked files are not part of this comparison.

Unlike the controlled example, this command discovers `.diffdevil.yml` at the
repository root. An invalid discovered file is an error, not permission to fall
back to different settings. Use `--no-config` deliberately to inspect the built-in
policy without discovery.

## Inspect the staged result

```sh
npm exec -- diffdevil analyze --staged --format human
```

This compares `HEAD` with the index. A newly created untracked file appears here
after you stage it through your normal Git workflow. diffdevil itself does not
stage, change, or execute repository files.

## Compare a branch

```sh
npm exec -- diffdevil analyze --base origin/main --head HEAD --format human
```

Both revisions must exist locally. The default is the change from their merge
base to the selected head, corresponding to a three-dot comparison. Add
`--comparison direct` only when you intend to compare the two revisions directly.
Fetch or select the correct base yourself; analysis does not fetch or check out
anything.

When using a built source executable to inspect a different repository, invoke
its **absolute path** from the target repository. Running a relative
`dist/lib/cli/main.js` from the diffdevil checkout measures that checkout instead.

## Verify what the report describes

Read the source line before comparing counts. Check the source kind, comparison
mode, and resolved revisions. To inspect aggregate identities, evidence, scopes,
and policy results, use `--detail full` when the installed help lists it. The enhanced
presenter is current source capability and requires a release carrying it; source
qualification does not update an older registry package. Use `--format json` for the complete
report, including individual file records.

A report can successfully contain bounded or unknown values. “The command
succeeded” and “every requested measurement is exact” are different observations.
[Evidence and uncertainty](../understand/evidence-and-uncertainty.md) explains
what can still be concluded.

## When the result is not what you expected

**Executable missing or wrong version:** check `node --version`, complete the
installation, and run the version command from the same project as the analysis.
Do not confuse a globally installed executable with the local package.

**Source error:** a non-Git directory without `--diff-file` or `--report`, or a
missing base/head revision, is not an empty diff. Read the diagnostic and correct
the directory, source path, or local refs.

**Configuration error:** repair the named file and declaration. A deliberate
`--no-config` comparison is useful for diagnosis, but does not repair that policy.

**A valid empty comparison:** zero Changed with a complete file set can mean the
selected worktree or index has no changes. Check which comparison you selected
and whether the files are still untracked. Do not turn an error or incomplete
file set into this result.

Continue with [Use results in scripts](use-results-in-scripts.md) to save a report
and consume its data. The [CLI guide](../use/cli.md),
[Interfaces](../reference/README.md), and
[Troubleshooting](../help/troubleshooting.md) provide the next-depth routes.
