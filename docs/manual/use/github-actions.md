# GitHub Actions

Use Actions when the repository should own diffdevil automation through reviewed workflow files. The runtime is shipped with the Action: a consumer job does not install Node packages or build diffdevil. You choose the event, trusted policy and allowed effects; the shared engine supplies the measurements and decisions.

## Choose an entry point

| Entry | Responsibility |
| --- | --- |
| `Wolfsblvt/diffdevil@v1` | The complete default size-label workflow; root `mode` can instead select analysis or planning |
| `Wolfsblvt/diffdevil/actions/analyze@v1` | Read-only analysis and selected decision outputs, even when its credential can write |
| `Wolfsblvt/diffdevil/actions/apply@v1` | Fresh acquisition, revalidation and explicit policy application |
| `Wolfsblvt/diffdevil/actions/sync-labels@v1` | Repository definition verification or explicit synchronization |

The root Action defaults to `apply`: choosing it deliberately chooses its documented label effects. The analyze sub-action rejects effect inputs. Sync-labels defaults to read-only verification. These distinctions are more useful than memorizing every option; the [Actions reference](../reference/github-actions.md) owns exact generated inputs and outputs.

`@v1` is the maintained major Action coordinate, not an npm version pin. A repository can choose an immutable reviewed commit according to its own dependency policy. Current-source additions must be present in the selected distributed Action; successful tests of this checkout do not move a published tag.

## Add the complete default workflow

Save this complete [size workflow](../../examples/workflows/size.yml) as `.github/workflows/diffdevil.yml` and make it active through the repository's normal change process:

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

Actions must be enabled and the repository's policy must permit the selected Action and token permissions. This API-only job uses `pull_request_target` and never checks out or executes PR code. Keep privileged metadata automation separate from build/test jobs that run untrusted code.

The first useful result is a matching managed size label, or a successful no-op if it is already correct. Missing required definitions are created; unrelated labels and existing definition metadata are preserved. The default posts no comment. The [first-success guide](../start/label-pull-requests.md) covers activation and inspection.

## Keep read-only analysis separate

This complete [read-only workflow](../../examples/workflows/analyze.yml) can run on `pull_request` without selecting any label or comment writes:

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

Its threshold tests whether Changed is greater than 100. `decision` is a string: `true`, `false` or `unknown`. Only the true case enters the displayed follow-up step. Neither false nor unknown automatically fails an analysis Action. Add your own deliberate handling when the workflow needs a gate; do not let a missing numeric output become zero.

## Select trusted configuration and credentials

No config selects the built-in policy. To use a repository policy, add `config: .diffdevil.yml` to the step and grant `contents: read` as well as the permissions needed by the selected operation. Policy and referenced templates are loaded from the immutable current PR base, not the PR's proposed file. Changing configuration in the PR does not give that PR authority over privileged effects.

`policy-source: pinned` requires an explicit config and full immutable `policy-ref`; `policy-repository` can deliberately select another repository. `policy-source: workspace` is available for read-only analysis and cannot authorize Action writes. The adapter confines workspace policy/template reads, including symlinks, to the chosen workspace.

`github-token` owns PR acquisition and effects. Optional `policy-token` is confined to trusted base/pinned configuration and template reads. Omitting it preserves the single-token route. Use that split when the effect credential should not acquire Contents access solely to read policy. Keep credentials in the workflow's supported secret or token mechanism, never in formulas or exported policy.

Full policies and simple shorthand use one compiler. For a single threshold rule, `metric`, `threshold` and `comparison` can be sufficient. A full config preserves its authored effects; conflicting shorthand is rejected rather than silently overriding it. Bind untrusted strings through typed parameters, not GitHub interpolation inside a formula.

## Read outputs and retain the right artifacts

Each numeric output has status and bound companions. A plain numeric value is present only when exact. Inspect those companions before numeric comparisons. A selected band or decision is not proof of a label operation.

`report-json` and `plan-json` are **compact Action summaries**, not full replayable artifacts. The complete versions are at `report-path` and `plan-path`; effect execution writes its operation/readback journal to `effects-path`. These are runner files. Copying their path into another job does not transfer their bytes, and diffdevil does not upload them automatically.

For cross-job retention, use your workflow's explicit artifact transport and access/retention policy. Reports can contain private paths and revisions; plans can contain rendered comments and policy details. File provenance, schema validity and a successful upload do not authenticate untrusted input. Destination parents must exist, and output paths must not overwrite inputs, event data or runner command files.

## Analyze, then explicitly apply

The complete [two-step workflow](../../examples/workflows/analyze-and-apply.yml) demonstrates a same-job carrier:

```yaml
name: Inspect and apply pull-request size
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
      - uses: Wolfsblvt/diffdevil/actions/analyze@v1
        id: measured
      - uses: Wolfsblvt/diffdevil/actions/apply@v1
        with:
          input-report: ${{ steps.measured.outputs.report-path }}
```

The first step remains read-only even though this job has write permission. The second step **does write** when its revalidation succeeds. It is not an approval pause: a normal successful first step proceeds to apply.

Apply always reacquires current evidence, including for same-job reports. It re-evaluates under the selected trusted policy and compares the supplied artifact. There is no Action `trust-report` input. A plan supplies expected desired operations, not arbitrary instructions to execute. See [Reports, plans, and apply](shared-workflows/reports-plans-and-apply.md) for the lifecycle and CLI difference.

## Definitions, reruns and coexistence

Use sync-labels for a deliberate repository-definition check or metadata synchronization, not as a mandatory setup job before the default root Action. `operation: verify` is read-only; `operation: apply` selects synchronization, with `definitions: ensure` available when only missing names should be created. No PR assignment is changed by that definition-only operation.

A repository/PR concurrency group serializes this workflow's runs. Freshness checks still matter before effects, and the group does not coordinate an independently operated App. Select one owner of overlapping labels/comments. The minimal events deliberately omit label events to avoid a self-triggering loop. A manually removed managed label is restored on the next selected event, not continuously between runs.

## Recover by stage

**No run:** check workflow activation, event, repository restrictions and the selected revision. **Failed acquisition or policy:** inspect the source/configuration diagnostic; invalid or inaccessible policy is not permission to default. **Denied write:** check the actual credential's permissions rather than adding a checkout of PR code.

**Unknown decision:** inspect evidence, bounds and holds. The default policy can select `size/Unknown`; custom rules may hold effects. **Stale artifact:** capture a new comparison and plan. **Partial or ambiguous effects:** read `effects-path` and current GitHub state before retrying. Multiple provider requests are not one atomic transaction.

Actions return 0 for completed analysis/planning or verified reconciliation, 1 for known definition-verification drift, and 2 for invalid/failed operations or incomplete application. This differs deliberately from CLI `check` exits. A rerun must preserve comment actor and occasion identity where relevant. [Labels, comments, and definitions](shared-workflows/labels-comments-and-definitions.md) carries that shared contract.
