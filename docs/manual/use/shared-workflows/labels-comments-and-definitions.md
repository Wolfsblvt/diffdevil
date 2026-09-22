# Labels, comments, and definitions

Choose which repository metadata diffdevil should own, then let it reconcile only that selection. Assigning `size/XS` to a PR is different from creating the repository's `size/XS` definition. Posting a comment is different again: it needs an explicit policy and a lifecycle that can recognize its own earlier work.

The [default labeling workflow](../../start/label-pull-requests.md) already supplies one useful setup: ensure missing size definitions, keep one member of the managed size group, preserve unrelated labels, and post no comment. The same effect model serves the CLI, Actions and supported provider adapters.

## Assignments and definitions have different scopes

A **definition** belongs to the repository and carries a label name, color, description and availability. An **assignment** attaches an available definition to one PR. A policy can declare definitions without deciding to assign every one of them.

| Operation | Intended consequence |
| --- | --- |
| `ensure` | Create missing managed definitions; preserve existing metadata |
| `verify` | Read definitions and report drift; do not write |
| `sync` | Synchronize explicitly managed definitions, including selected metadata |
| `none` | Do not manage definitions as part of the PR operation |

None of these means “delete every other repository label.” `ensure` is not a recoloring command. An unavailable or archived required definition can block assignment instead of silently substituting a different label. Explicit synchronization can restore a managed definition when that is the selected operation.

With the [CLI](../cli.md), verify before choosing a repository-wide metadata change:

```sh
npm exec -- diffdevil labels verify --repo example/repository --config .github/diffdevil.yml
npm exec -- diffdevil labels apply --repo example/repository --config .github/diffdevil.yml --definitions ensure
```

These are provider invocation examples: replace the target and select actual credentials/authority before running them. The first is read-only. The second can create missing definitions. `labels apply` **without** `--definitions ensure` defaults to `sync`, so it can also change existing managed metadata. Definition-only commands resolve policy from the default branch, not a PR or implicitly discovered workspace file.

Verification exits 0 for a match, 1 for known drift and 2 for a failed/invalid operation. Do not confuse the actionable “definition differs” result with a permission failure. The [`sync-labels` Action](../github-actions.md#definitions-reruns-and-coexistence) offers the same explicit verification/application boundary.

## Declare ownership, not a replacement label set

A managed size group selects the appropriate member and removes obsolete members of **that group**. It leaves unrelated labels alone. Boolean rules can declare an added label and opt into removal when their condition is false. An unresolved condition does not become that false case.

This complete [review-signals policy](../../../examples/policies/review-signals.yml) keeps size labels, excludes a known generated file and adds a separate source/test relationship label:

```yaml
# Retain size labels, exclude a known generated input, and add a source/test signal.
version: 1
presets: [size@1]
defaults:
  paths:
    exclude: ['**/package-lock.json']
scopes:
  source:
    includeOnly: ['src/**']
  tests:
    includeOnly: ['tests/**', '**/*.Tests/**']
metrics:
  sourceReview:
    measure: lines.changed
    scope: source
  testsReview:
    measure: lines.changed
    scope: tests
  removedOrRewritten:
    formula: totals.lines.deleted + totals.lines.modified
queries:
  sourceReview:
    expression: metrics.sourceReview
  changedPaths:
    expression: 'map(filter(files, f => f.included), f => f.path)'
labelDefinitions:
  review/source-without-tests:
    color: C5DEF5
    description: Source files changed without changes in the configured test paths
rules:
  sourceWithoutTests:
    when: metrics.sourceReview > 0 && metrics.testsReview == 0
    onUnknown: hold
    effects:
      labels:
        add: [review/source-without-tests]
        removeWhenFalse: true
```

Save it as `.github/diffdevil.yml` through your normal repository change process. Before using it for privileged writes, it must be available from the trusted policy source selected by the writer. Preview the complete policy against the packaged patch locally:

```sh
npm exec -- diffdevil plan --diff-file node_modules/@wolfsblvt/diffdevil/docs/examples/diffs/review.diff --config .github/diffdevil.yml --target-repo example/repository --target-pr 42 --definitions ensure --format json --output review-plan.json
```

The included result is **6 Changed** after the lockfile exclusion. Source Changed is 3 and test Changed is 2, so `sourceWithoutTests` is false and the plan deliberately requests removal of that one label if present. It does not claim the existing PR was read or changed. Removing the test contribution in a new comparison can make the rule true; this is a path-based relationship, not proof of test quality or coverage.

Conflicting rules are not resolved by whichever happens to run last. Normalized label identities, group membership, held ownership and incompatible add/remove intentions are checked before affected effects. Fix the policy conflict instead of broadening removal to every visible label. Adding a new managed member is verified before obsolete members are removed, so a denied addition does not erase the existing classification.

## Opt into one owned comment

The complete [review-comment policy](../../../examples/policies/review-comment.yml) posts a summary without size labels:

```yaml
# One opt-in report comment, updated in place. No automatic size labels.
version: 1
presets: []
metrics:
  removedOrRewritten:
    formula: totals.lines.deleted + totals.lines.modified
rules:
  reviewSummary:
    when: 'true'
    effects:
      comment:
        mode: upsert
        trigger: always
        template: |
          **Change summary**

          Replacement-aware changed lines: {{ totals.lines.changed }}
          Raw churn: {{ totals.raw.churn }}
          Deleted-only or modified lines: {{ metrics.removedOrRewritten }}
          Included files: {{ totals.files.included }}

          These are diff measurements, not a judgment of code quality or risk.
```

Save it as `.github/diffdevil-comment.yml` and preview it with the same full teaching patch:

```sh
npm exec -- diffdevil plan --diff-file node_modules/@wolfsblvt/diffdevil/docs/examples/diffs/review.diff --config .github/diffdevil-comment.yml --target-repo example/repository --target-pr 42 --format json --output comment-plan.json
```

The desired body displays **10 Changed**, **16 churn**, **6 deleted-only or modified lines**, and **4 included files**. `presets: []` deliberately opts out of automatic size behavior. Nothing is posted by this preview. An applying host must select this trusted config and the expected comment author before the effect can occur.

Templates substitute completed values; they do not execute arithmetic or programs inside braces. Define arithmetic as a metric, then reference it. Authored Markdown remains yours, while the normal display formatter escapes substituted data and neutralizes accidental mentions. A misspelled placeholder is an error; a valid measurement with uncertain evidence displays its actual standing. [Effects and templates](../../policy/from-measurements-to-rules/effects-and-templates.md) owns the policy-writing treatment; the [maintained template contract](../../../integration/templates.md) remains the exact reference during migration.

## Choose mode and trigger separately

Mode governs how an eligible occasion changes the owned comment:

- **`upsert`** maintains one comment for the rule and does not write when its rendered content is unchanged.
- **`once`** creates one owned comment and leaves it unchanged afterward.
- **`create`** creates a comment per distinct eligible occasion; retrying that same occasion must not duplicate it.
- **`once-per-transition`** creates on entry into a resolved true state, including the first true observation.

The trigger answers whether there is an occasion at all. `always` and `matched` serve their declared conditions; `band-changed` applies only to band rules. Boolean rules default to `matched`, band rules to `band-changed`. A new head within the same band is not a band change. `once-per-transition` is for boolean rules and incompatible trigger combinations are configuration errors.

With `upsert` and `matched`, a later false result leaves the existing comment unchanged rather than deleting it. This version has no automatic comment-deletion operation. Unknown intervals preserve prior resolved transition state; they do not manufacture a false-to-true transition when evidence returns.

## Preserve actor and occasion identity

The adapter recognizes ownership using the target, policy/rule identity and expected bot/App author together with its validated metadata. A contributor can copy a visible marker into a comment; that does not give diffdevil ownership of it. Templates cannot forge the adapter's reserved metadata.

The ordinary Action author is selected by the Action contract. For a different authorized App principal, supply `comment-author` and, when appropriate, its numeric `comment-author-id`; the CLI uses the corresponding `--comment-author` options. Do not select an identity merely because its old comment looks convenient to edit.

For `create`, preserve the stable occasion supplied by the host. CLI callers supply `--occasion`; Actions derive the run occasion unless explicitly selected otherwise. A rerun of the same occasion is not a new request for another comment. Process restarts do not reset lifecycle state. Duplicate owned sequences or malformed metadata stop affected reconciliation instead of authorizing arbitrary deletion.

## Holds, ambiguous writes and partial results

A held rule preserves the effects it cannot safely decide, rather than behaving as false. The default size policy may deliberately choose `size/Unknown`; that is an authored fallback label, not a known size or an automatic comment occasion. The [bounded held-plan example](reports-plans-and-apply.md#derive-a-desired-plan) keeps that distinction executable.

GitHub's multi-operation label/comment work is not transactional. A denied request, changed PR head or failed readback can leave earlier operations completed. Inspect the operation journal and current provider state. An acknowledgment without verified readback remains incomplete; an ambiguous create is read back for its expected author and occasion before any repeated POST.

Keep the result of a partial run. Deleting it and blindly rerunning discards precisely the information needed to distinguish “not attempted” from “possibly completed.” The [apply workflow](reports-plans-and-apply.md#recover-stale-and-partial-work) supplies the common recovery path.

## Move ownership between writers deliberately

Disable overlapping writes in the old host before enabling the new one. Transfer the policy and required templates/parameters, compare effective policy and managed names, establish the new host's trusted source and credentials, then inspect a fresh run and its readback. A read-only Action or personal extension can remain active.

An Action and an App do not share one global concurrency lock. Different policies can fight over a label despite each host being correctly serialized. Comment lifecycles also include policy and author identity: changing either can begin a separate lifecycle, leaving previous comments untouched. There is no automatic cross-author adoption or cleanup promise. Preserve useful prior results and handle any intentional legacy-comment cleanup as a separate authorized operation.

[Managed App](../managed-app/README.md) explains the service choice when available. The migration principles do not require that service: one CLI host can replace another, or a repository can simply keep its reviewed Action as the writer.
