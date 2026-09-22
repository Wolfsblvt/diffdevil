# GitHub Actions

Use Actions when repository automation should live in reviewed workflow files. The Action obtains a PR comparison, evaluates the same policy as the CLI, and publishes results in GitHub's job environment. Choose separately whether that job is allowed to apply effects.

## Choose an entry point

| Entry at the selected ref | Job |
| --- | --- |
| `Wolfsblvt/diffdevil@v1` | Convenient size-label application by default; `mode` can select analyze, plan or apply |
| `Wolfsblvt/diffdevil/actions/analyze@v1` | Read-only analysis and decisions |
| `Wolfsblvt/diffdevil/actions/apply@v1` | Deliberate application, with fresh acquisition and artifact validation |
| `Wolfsblvt/diffdevil/actions/sync-labels@v1` | Repository label-definition verification by default; explicit application available |

Actions ship their runtime. An API-only job does not need npm, a source checkout, or a build of the PR. You need permission to maintain the workflow, Actions enabled, and an allowed Action ref. `v1` is a moving compatibility alias. A version tag names a release; only a full commit SHA pins exact Git source. The [release account](../../releases/v1.0.0.md) identifies the published version separately from current development source.

## Start with the default applying workflow

This complete [size workflow](../../examples/workflows/size.yml) maintains the preset's size group, creates missing required definitions, preserves unrelated labels and posts no comment:

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

Make it available through the repository's normal workflow change process. Then inspect a matching PR event and its job summary. The useful result is the correct label, including a successful no-op when that label is already present. An unresolved classification can select the preset's explicit `size/Unknown` label; it is not a failed parser or a zero-size PR.

> [!WARNING]
> This job runs with write authority on `pull_request_target`. Keep it API-only. Do not check out or execute PR-head code in this privileged job. Build and test untrusted code in a separate job with the appropriate read-only boundary.

The event provides repository and PR identity. For another event, supply the explicit target the Action requires. A local Git source is an explicit alternative requiring the relevant objects already present in a controlled checkout; it is not an implicit fallback from missing API evidence.

## Use a separate read-only workflow

The complete [analysis workflow](../../examples/workflows/analyze.yml) asks whether Changed exceeds 100 without giving the job label or comment authority:

```yaml
name: Analyze pull-request diff
on:
  pull_request:
    types: [opened, reopened, synchronize]
permissions:
  pull-requests: read
jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: Wolfsblvt/diffdevil/actions/analyze@v1
        id: diff
        with:
          metric: changed
          threshold: '100'
          comparison: gt
      - name: Report a resolved threshold
        if: steps.diff.outputs.decision == 'true'
        run: echo "The comparison exceeds 100 replacement-aware changed lines."
```

The second step deliberately runs only for the string `true`. A false or unknown result does not automatically fail the analysis step. Select your workflow's consequence explicitly; neither an empty output nor the string `false` should be treated as a numeric zero or tested by generic truthiness. Read-only fork events can have restricted tokens and approval requirements even when the workflow itself is valid.

## Select trusted configuration and credentials

Omitting `config` selects the bundled policy, not a discovered workspace file. For custom repository policy, place `.diffdevil.yml` in the trusted base and select it explicitly:

```yaml
# Step excerpt for the applying workflow above.
- uses: Wolfsblvt/diffdevil@v1
  with:
    config: .diffdevil.yml
    policy-source: base
```

That job additionally needs `contents: read` for policy and template acquisition. The full file must be available at the selected base revision; a new policy in this PR is diff data, not this run's write authority. Pinned policy uses an explicit immutable commit and may select a different policy repository. Workspace policy is available for read-only analysis, never as Action write authority.

`github-token` owns PR acquisition and effects. Optional `policy-token` can separately read trusted base/pinned policy and templates; omitting it retains the single-credential route. Select only the permissions needed by the job. A separate policy token must be able to read its actual repository, not merely the PR repository.

Inputs are strings. Use documented `true`/`false`, quote numeric thresholds, and preserve newline-list structure. A complete config and the single-rule threshold/condition shorthand are not silently merged when their contracts conflict. [Configure policy](../policy/configure.md) explains the shared declarations; the [Actions reference](../reference/github-actions.md) owns the generated exact input/default/output inventory.

## Outputs are not all interchangeable artifacts

A numeric output has evidence companions. Read `lines-changed-status` before treating `lines-changed` as an exact number; bounds belong in the corresponding minimum/maximum outputs. A resolved band need not imply an exact metric. A selected `decision` is `true`, `false` or `unknown`; when no single decision is selected it can be empty.

`report-json` and `plan-json` are compact Action summaries. They are not the full canonical artifacts consumed by the library readers or apply. Use `report-path`, `plan-path` and `effects-path` for the full files, including the operation journal. Default paths are unique runner-local files. Custom destination parents must exist, and artifact/output/summary paths must not collide.

A file on one runner is not automatically present on the next. Deliberately upload and download the full artifact when crossing jobs, with access and retention suitable for its paths, policy and source identities. Do not put full private reports in a public job log just because the summary was safe to display.

## Plan first; apply deliberately

The complete [plan/apply workflow](../../examples/workflows/plan-and-apply.yml) passes full files between two steps in one trusted job. It selects the same base policy for both steps. Planning needs read permissions; this combined job has write permission because its second step applies.

The apply entry consumes `input-report` and `input-plan`. It does not use a pre-existing `report-path` as an input. It reacquires current evidence and recomputes the selected policy even for same-job artifacts; no `trust-report` switch exists in Actions. A stale or tampered plan cannot supply additional effects. An output file, matching hash, green earlier job or manual approval alone does not authenticate its contents as current write authority.

For definition maintenance without PR assignments, use `actions/sync-labels`: default verification is read-only; `operation: apply` is the explicit write route. [Shared workflows](shared-workflows/README.md) owns the detailed artifact and effect lifecycle.

## Reruns, coexistence and recovery

Serialize overlapping effects by PR and keep `cancel-in-progress: false` for an applying job so a new event does not deliberately interrupt an operation sequence. Freshness checks still matter: concurrency does not freeze the PR. Do not subscribe to label events merely to maintain labels unless the surrounding automation has a deliberate loop-safe arrangement.

Choose one writer for each managed label group and comment lifecycle. A read-only Action can coexist with an App or another tool, but two applying hosts with different policies can fight over the same state.

When nothing appears, first check whether the workflow ran and which event/revision it used. When it ran, distinguish acquisition, policy, permissions, held decisions and effect readback. An acknowledged request without verified readback remains partial. Keep the effects file, inspect what already changed, and then retry or repair the affected operation. Do not repeatedly create comments to test whether the first one arrived.

Updates change the selected Action ref through normal workflow review. Recheck your actual config, event and consuming outputs. A successful job proves its executed contract, not live App availability, extension installation or code quality.
