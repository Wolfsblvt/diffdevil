# Use diffdevil in scripts and GitHub Actions

## Meaning

This guide starts with the normal, language-free diffdevil experience: useful local analysis, scalar values, threshold checks, matching paths, and automatic pull-request size labels. It then shows the same operations through explicit expressions and reusable reports. It provides a compact interface overview; the task guides own complete first-use recipes; detailed CLI, Action, and language contracts are linked at their point of use.

The CLI and all four Action entry points are published. `@v1` is the maintained
major Action coordinate; `@v1.0.0` is its immutable first release. Local
consumers can still use a complete trusted checkout as explained in the
[Action distribution manual](integration/action-distribution.md).
The CLI and Action use the same facts, presets, and evaluator.

For the complete first-use paths, start with [auto-labeling PRs](guides/auto-label-pull-requests.md), [local scripts](guides/local-automation.md), or [policy recipes](guides/policy-recipes.md).

## Automatic size labels, without a config file

The ordinary workflow is `.github/workflows/diffdevil-size.yml`:

```yaml
name: Pull-request size
on:
  pull_request_target:
    types: [opened, reopened, synchronize, edited]
permissions:
  pull-requests: write
concurrency:
  group: diffdevil-size-${{ github.event.pull_request.number }}
  cancel-in-progress: false
jobs:
  size:
    runs-on: ubuntu-latest
    steps:
      - uses: Wolfsblvt/diffdevil@v1
```

The implemented root Action behavior is:

1. Obtain the pull-request diff through GitHub's API, without checking out or executing its head.
2. Use the bundled `size@1` policy and `replacement-lines-v1` measurement.
3. Create missing required size-label definitions.
4. Add the selected size label and remove only other members of its managed size group.
5. Emit outputs and a workflow summary. **Do not post comments.**

No `.diffdevil.yml`, handwritten formula, explicit band rules, label setup command, or extra installation step is required. Existing label colors and descriptions are preserved in this ensure-missing mode. A separate explicit synchronization operation can reconcile their metadata later.

Choosing this root Action is choosing this documented label automation. It does not infer intent from the presence of a token. Use the `/analyze` entry point for read-only operation.

GitHub's current permission documentation permits the relevant label operations with pull-request write permission. The trusted-base event is appropriate here because the Action consumes hostile diff data without running PR-head code. Do not add a PR-head checkout and build to this privileged job. See the [GitHub contract](integration/github-actions.md) and its primary-source references for platform constraints and release pinning.

## Default size meaning

| Label | Replacement-aware changed lines |
| --- | --- |
| `size/XS` | 0–19 |
| `size/S` | 20–99 |
| `size/M` | 100–499 |
| `size/L` | 500–999 |
| `size/XL` | 1,000 or more |
| `size/Unknown` | Available evidence cannot establish one band. |

The size preset counts tracked diff material without a hidden generated-file exclusion list. Users can add explicit path exclusions when appropriate. This default favors explainability over guessing which files matter in an unfamiliar repository.

A bounded count can establish a band: a proven 60–70 lines is `size/S`. A proven 15–30 lines is `size/Unknown`. An included binary or submodule change that is unmeasurable in lines is not silently zero. A complete comparison whose files are all explicitly excluded is zero counted lines and `size/XS`.

Size is orientation, not risk, quality, importance, or a merge recommendation. XL does not fail a check by default.

## Read-only GitHub analysis

```yaml
- uses: Wolfsblvt/diffdevil/actions/analyze@v1
  id: diff
```

Read common results directly:

```yaml
- name: Report broad changes
  if: >-
    steps.diff.outputs.lines-changed-status == 'exact' &&
    fromJSON(steps.diff.outputs.lines-changed) > 100
  run: echo "More than 100 replacement-aware changed lines"
```

The status check is necessary when manually reading a scalar output. A more convenient single measurement-and-threshold step is:

```yaml
- uses: Wolfsblvt/diffdevil/actions/analyze@v1
  id: broad
  with:
    metric: changed
    threshold: '100'
    comparison: gt
```

It emits `decision: true`, `false`, or `unknown`. Later steps can compare that string without parsing expression syntax or treating an empty scalar as zero.

## Local analysis and values

```powershell
diffdevil analyze
```

With no source selector, the intended local default compares `HEAD` with the final tracked working-tree content, including staged and unstaged changes as one final diff. It does not add the index diff and working-tree diff together. Untracked files are not silently treated as Git changes. See [CLI source selection](integration/cli.md) for explicit staged, revision, unified-diff, and saved-report routes.

For a scalar suitable for assignment:

```powershell
$result = diffdevil query --metric changed --format value
if ($LASTEXITCODE -ne 0) {
    throw 'An exact changed-line count is unavailable.'
}
$changed = [long]$result
```

On success, stdout is only a value such as `173`, followed by a newline. Diagnostics go to stderr. Check the exit code before converting text into a number.

Bash:

```bash
if changed="$(diffdevil query --metric changed --format value)"; then
  printf '%s\n' "$changed"
else
  rc=$?
  exit "$rc"
fi
```

## Thresholds and file checks

```powershell
diffdevil check --metric changed --gt 100
diffdevil check --metric destructive --gte 500
diffdevil check --files any --metric changed --gt 100
diffdevil check --files all --metric changed --lte 100
```

These comparisons require no expression. The file shortcuts operate on included files by default. `--scope tests` selects a configured scope; `--path 'src/**'` adds an immediate path selection.

The exit contract is:

| Exit | Meaning |
| --- | --- |
| `0` | Valid check is true, or an ordinary operation succeeded. |
| `1` | Valid check is false. For `labels verify`, definitions differ. |
| `2` | Invalid invocation/input/configuration/expression, failed source operation, invalid evaluation operation, or exhausted resource budget. |
| `3` | Evidence cannot resolve the requested check or strict result. |

A shell `if` must not treat every nonzero result as an ordinary false decision. Handle `1` separately from `2` and `3` when the distinction matters.

## Matching paths and records

```powershell
diffdevil query --files --metric modified --gt 20 --select path --format lines
```

For records instead of paths:

```powershell
diffdevil query --files --metric changed --gt 100 --select path,changed --format jsonl
```

A line-based path list requires determined membership and paths without line breaks. Use `--format nul` or JSON when newline-delimited paths are unsuitable. Unknown membership is retained by `--format json`; it is not quietly discarded to make `lines` look successful.

To deliberately return definite observed matches only, use `--certain`. Its result explains that unresolved or unobserved matches were omitted from that explicitly narrower question. This is an opt-in projection, not the default interpretation of an incomplete diff.

## A small configuration change

Create `.diffdevil.yml` only when a repository needs something beyond the defaults:

```yaml
version: 1
size:
  metric: raw-churn
defaults:
  paths:
    exclude:
      - '**/package-lock.json'
```

This retains the size preset but measures raw churn and explicitly excludes one lockfile pattern. It does not require copying six label definitions or every band rule.

In the privileged root Action, name the trusted base-branch configuration explicitly:

```yaml
- uses: Wolfsblvt/diffdevil@v1
  with:
    config: .diffdevil.yml
```

The no-input Action intentionally uses the bundled preset rather than discovering an arbitrary workspace file. Local CLI configuration discovery and privileged Action configuration loading have different trust contexts, not different policy semantics.

## Add language only where it is useful

```yaml
version: 1
metrics:
  weighted:
    formula: metrics.review + 2 * scopes.production.totals.lines.changed
scopes:
  production:
    includeOnly: ['src/**']
```

Then:

```powershell
diffdevil query --metric metrics.weighted --format value
```

Or write an expression directly:

```powershell
diffdevil check --expr 'metrics.weighted >= 500 && totals.files.included >= 5'
```

An expression is one selector, not an add-on string mixed unpredictably with shortcut flags. [Presets and shortcuts](integration/presets-and-shortcuts.md) defines which combinations are valid.

## Analyze once, consume many times

```powershell
diffdevil analyze --format json --output report.json
diffdevil query --report report.json --metric changed --format value
diffdevil query --report report.json --files --select path --format lines
diffdevil plan --report report.json --format json --output plan.json
```

`plan` produces intended effects without mutation. `apply` is the deliberate GitHub effect stage. A saved plan is validated against its current target and trusted policy before use; a matching hash alone does not authenticate an untrusted artifact.

The TypeScript API exposes the same compilation and evaluation operations. Coding agents should use these interfaces rather than rebuilding diff arithmetic or scraping human output.

## Detailed integration references

[Presets and shortcuts](integration/presets-and-shortcuts.md) defines the ordinary configuration abstraction. [CLI](integration/cli.md) defines argument composition, formats, quoting, source selection, and exits. [GitHub Actions](integration/github-actions.md) defines entry points, inputs, labels, trust, and outputs. [TypeScript API](integration/typescript-api.md) defines embedding. [Templates](integration/templates.md) defines optional comments without introducing a second expression engine.
