# From facts to provider state

A report can be correct, a policy can resolve, and a plan can be valid without any label having changed. diffdevil keeps **facts, decisions, desired effects, attempted requests and observed provider state** separate so that you can tell what actually happened.

## Begin with facts and a decision

The [small review patch](../../examples/diffs/review.diff) establishes 10 Changed lines and 16 raw churn across four included files. With `size@1`, the `review` metric is 10 and the `size` band resolves to `xs`. That is the policy's classification, not a GitHub observation.

Run the following from a [built source checkout](../start/analyze-local-changes.md#install-the-executable):

```sh
node dist/lib/cli/main.js plan --diff-file docs/examples/diffs/review.diff --no-config --preset size@1 --target-repo example/repository --target-pr 42 --format human --color never
```

`example/repository#42` is a teaching target, not a repository this command contacts. The complete patch and bundled preset are the inputs. The shared presenter produces:

<!-- manual:generated presenter-first-plan -->

The plan selects `size/XS` for its managed group. It does not know the current labels on the teaching target and cannot say which ones would be added or removed there. No token is needed and nothing is applied.

Use `--format json` for the complete plan artifact. The human text is a reading interface, not a replayable substitute for the versioned plan.

## Definitions and assignments are different effects

Selecting a label assigns its name to a PR. Ensuring a missing label definition establishes repository metadata that assignment needs. Synchronizing an existing definition's color and description is another deliberate operation.

The default applying Action ensures missing required definitions and manages the size-label group. It preserves unrelated PR labels and does not rewrite existing definition metadata merely because the preset supplies a different color. Comments require an explicit comment policy; the default has none.

A plan may also contain these desired operations. Their presence is still intent, not an installation or provider receipt. [Labels, comments, and definitions](../use/shared-workflows/labels-comments-and-definitions.md) owns the complete lifecycle.

## An unresolved rule can hold

This complete [held-rule policy](../../examples/policies/hold-unresolved.yml) asks whether Changed is at least 65 and explicitly holds when the answer is unresolved:

```yaml
# Complete concept specimen: do not turn an unresolved condition into false.
version: 1
language: diffdevil-expr/1
presets: []
labelDefinitions:
  review/threshold:
    color: C5DEF5
    description: At least 65 replacement-aware changed lines
rules:
  threshold:
    when: totals.lines.changed >= 65
    onUnknown: hold
    effects:
      labels:
        add: [review/threshold]
        removeWhenFalse: true
```

Against the [bounded report](../../examples/reports/bounded.json), Changed is `[60,70]`:

```sh
node dist/lib/cli/main.js plan --report docs/examples/reports/bounded.json --config docs/examples/policies/hold-unresolved.yml --format json
```

The `threshold` decision is unknown, its disposition is `held`, the held-rule list records its reason, and there are **no desired label operations**. `removeWhenFalse` does not remove the label, because this condition is not false. The ordinary planning command exits 0: a valid plan can describe a hold. Add `--require-resolved` when your consumer requires all selected decisions to resolve; this returns exit 3 while retaining the inspectable plan JSON.

This is different from `size@1`'s explicit `size/Unknown` fallback. A fallback intentionally requests that label when the size band cannot resolve. Do not call the fallback a hold or call either outcome an exact size measurement.

## Application must establish more than the plan

An applying host establishes the target, trusted policy, current source and selected effects before attempting writes. The [trust and mutation contract](trust-and-mutation.md) matters here: a plan's JSON shape or identity hash does not authorize it.

Once application begins, read the effects result in stages:

| What was observed | What you can conclude | First useful action |
| --- | --- | --- |
| Desired state already matches, confirmed by readback | A verified successful no-op; no write was needed | Keep the result; do not force a change to manufacture activity |
| Request acknowledged and readback matches | The intended state was observed after the request | Report the verified outcome |
| Request acknowledged but readback unavailable | A request was accepted, not that the state was verified | Obtain readback before claiming success |
| Request timed out or its response was ambiguous | The write may already have happened | Observe current state before any retry |
| Earlier operations verified, later operation failed or source changed | Partial/incomplete application, not rollback | Preserve verified outcomes, inspect current state, and form a fresh safe continuation |

An analysis success is not an effect success. Likewise, a returned result object can preserve an incomplete application with its observations; inspect that status rather than treating object presence as all-green.

## Keep the conclusion no broader than the observation

GitHub operations are separate requests. A PR can change between them. Rechecking identity before writes and again at completion prevents stale success claims; it does not make the sequence atomic or undo an earlier verified effect.

A browser extension's local band and a Playground's desired-label preview are not provider readback. They need not match repository automation when source edition or effective policy differs.

Return to [Label pull requests](../start/label-pull-requests.md) for the first applying workflow. Continue with [Reports, plans, and apply](../use/shared-workflows/reports-plans-and-apply.md) for artifact handling, or [Troubleshooting](../help/troubleshooting.md) when a real operation stopped at one of these stages.
