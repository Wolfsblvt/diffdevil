# Label pull requests

Add one workflow that measures pull requests and keeps their default size label up to date. It uses replacement-aware **Changed**, creates missing required label definitions, preserves unrelated labels, and does not post a comment.

You need permission to add a workflow, GitHub Actions enabled, and a repository or organization policy that permits the selected Action and pull-request writes. Choose one owner for the same size-label group: do not leave another Action or an App competing over those assignments.

## Add the complete workflow

Create `.github/workflows/diffdevil.yml` with this complete file. The canonical copy is [the size workflow](../../examples/workflows/size.yml).

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

`@v1` follows the maintained Action major. Use the versioned `@v1.0.0` release for a fixed release selection, or its verified full commit SHA when your repository requires an immutable source. The Action includes its runtime; the job does not run `npm install`.

This is an API-only workflow. It does **not** check out the PR or execute its code. `pull_request_target` supplies the trusted workflow context used for labeling, so keep this job separate from builds or tests that execute proposed code. Do not add a PR-head checkout to make this example work.

The default token comes from the Action metadata. No pasted token or secret in the YAML is needed for this no-config route. The concurrency group serializes runs for the PR; disabling cancellation avoids deliberately interrupting a writer midway through a sequence. It does not make GitHub's individual operations a transaction.

## Make it active and inspect one result

Land the workflow through your repository's normal change process so it is available on the default branch. Then open or update an appropriate pull request, or use another event listed in the workflow. Merely adding this YAML inside a proposed PR does not prove that the trusted workflow is already active.

Open the matching **Pull-request size** run in Actions. Check that it addresses the intended PR and current revisions, then read its analysis and effects result. Finally inspect the PR's labels.

For the [10-Changed teaching patch](../../examples/diffs/review.diff), `size@1` resolves the `xs` band and desires `size/XS`. Your actual PR receives the band supported by its own included facts. The rule maintains one selected size label while preserving unrelated labels. Required definitions missing from the repository are ensured; existing definition colors and descriptions are not silently synchronized.

An already-correct label is success when provider readback confirms it. It need not produce a new write or a new comment. The default has **no comment effect**, and a large band is not a judgment about correctness, risk or quality.

## Customize only when you have a different question

The no-config workflow selects the bundled preset, with no hidden lockfile or generated-file exclusions. It does not automatically adopt a similarly named file merely because that file exists in a checkout.

For reviewed repository policy, use the explicit base-policy route in [GitHub Actions](../use/github-actions.md). A trusted base configuration additionally needs content-read capability. The [current Actions integration](../../integration/github-actions.md#split-trusted-policy-reads-from-effects) gives the complete token separation example when policy reads and effects use different credentials. Keep policy trusted independently of the PR data being measured.

[Start with a preset](../policy/README.md) owns preset selection and customization. Exact input/default/output names come from the [Actions reference](../reference/github-actions.md) and [canonical root Action metadata](../../../action.yml), not an extra option table here.

## When no label appears

**There is no run.** Check whether the workflow is active on the default branch, whether an enabled event occurred, and whether repository Actions policy permits it. Adding label-write permission cannot repair a workflow that never ran.

**The run failed before planning.** Read the source or configuration diagnostic. A failed acquisition is not an empty PR. An invalid explicit policy is not the default policy.

**A label operation was denied or did not finish.** Inspect the effects result and provider permissions, not just the analysis number. Check current labels before retrying an ambiguous or partial write. [From facts to provider state](../understand/facts-to-provider-state.md) explains requests and readback.

**The result is `size/Unknown`.** The default policy deliberately uses that fallback when evidence cannot establish one band. This differs from a held rule that requests no assignment. Read the interval, reasons and file-set completeness before changing policy or obtaining stronger evidence. Do not replace Unknown with the smallest label to make automation look successful.

Return to the matching run after repair and verify the actual label or a verified no-op. Continue with [GitHub Actions](../use/github-actions.md) for other workflows and [Troubleshooting](../help/troubleshooting.md) for the wider failure taxonomy.
