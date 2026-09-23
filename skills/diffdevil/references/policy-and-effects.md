# Policy and effects

## Meaning

This reference covers configuration, custom queries, desired plans, and the
GitHub application interface. It documents the tool's behavior. User and harness
instructions determine the agent's authority and workflow.

## Read and shape effective policy

Ordinary local commands discover root `.diffdevil.yml`. Use `--config PATH` for
an explicit YAML/JSON file or `--no-config` to bypass discovery. An invalid file
is an error rather than an instruction to fall back to a different policy.

`size@1` supplies replacement-aware size bands, managed size labels, and no
comments or hidden path exclusions. `presets: []` or `--preset none` selects no
preset. Preserve an existing explicit selection when extending configuration.

```sh
diffdevil validate --config .diffdevil.yml --format json
diffdevil explain --policy --config .diffdevil.yml --format json
diffdevil explain --policy --config .diffdevil.yml --format yaml
```

JSON explanation includes provenance; YAML exports an expanded ordinary policy.
`schema --kind config` supplies the installed schema. Prefer an existing recipe
when it supplies the intended behavior.

A complete custom-policy example, saved as `review-policy.yml`:

```yaml
version: 1
presets: []
scopes:
  source:
    includeOnly: ['src/**']
metrics:
  sourceChanged:
    measure: lines.changed
    scope: source
  removedOrRewritten:
    formula: totals.lines.deleted + totals.lines.modified
queries:
  sourceChanged:
    expression: metrics.sourceChanged
  overLimit:
    expression: metrics.removedOrRewritten > 200
```

```sh
diffdevil validate --config review-policy.yml --format json
diffdevil query --config review-policy.yml --name sourceChanged --format json
diffdevil check --config review-policy.yml --name overLimit --format json
```

The named metric owns its declared scope; selecting it does not rebind the formula
to an invocation path. `--name NAME` selects a saved query, while
`--metric metrics.NAME` selects a custom metric directly.

## Grow into detail and reusable rules

Use ordinary detail formulas for arithmetic, path/file shortcuts for convenient
selections, and full declarations for reusable policy. These all use one compiler.

Scopes select files. Metrics compute numbers. Queries return selected values.
Checks require boolean results. Bands classify numeric evidence. Rules evaluate
conditions or bands and contribute effects. Label groups declare the members
that may be reconciled together. Templates define explicit owned comments.

Typed parameters bind through `--param NAME=VALUE` or `--params-file PATH`.
Declarations determine types; repeated names are errors, not last-writer-wins.
For complex source use `--expr-file PATH`. Detail is a deterministic expression
language, not JavaScript, so JavaScript helpers or arbitrary callbacks are not
expression syntax.

Same-ID executable declarations replace whole declarations rather than deeply
merging parts of rules. Arrays follow their documented replacement rules.
Invocation path lists append by default; `--exclude-mode replace`,
`--include-only-mode replace`, and `--force-include-mode replace` select replacement.
An explicit empty replacement can clear that layer.

Size overrides must match the installed schema. The initial CLI contract requires
complete supplied threshold and label maps; do not infer partial-map support from
a newer design example. Inspect the schema and current executable when using it.

Complete maintained examples:
[source/test signal](https://github.com/Wolfsblvt/diffdevil/blob/main/docs/examples/policies/review-signals.yml),
[owned comment](https://github.com/Wolfsblvt/diffdevil/blob/main/docs/examples/policies/review-comment.yml),
and [full policy](https://github.com/Wolfsblvt/diffdevil/blob/main/docs/examples/policies/full.yml).
The [policy manual](https://github.com/Wolfsblvt/diffdevil/blob/main/docs/manual/policy/from-measurements-to-rules/README.md)
owns rule, band, and unknown-behavior syntax.

## Preview desired effects

For the bundled preset and a current PR:

```sh
diffdevil plan --repo OWNER/REPO --pr NUMBER --no-config --preset size@1 --definitions ensure --format json
```

For a local comparison and an explicit future target:

```sh
diffdevil plan --diff-file change.diff --config .diffdevil.yml --target-repo OWNER/REPO --target-pr NUMBER --definitions ensure --format json
```

Replace symbolic targets with actual values. `--target-repo` and `--target-pr`
name a plan target, not a GitHub acquisition request. A local plan is an effect
preview, not evidence that the live PR contains those local changes.

Read-only `plan --config` uses the selected local policy. It does not silently
fetch the trusted base policy used by `apply --config`. To preview that exact
base or pinned policy, acquire its file and relative templates from that source,
then plan using the acquired copy. A PR-head policy preview remains a preview
of those proposed settings.

A desired plan can leave concrete provider deltas unresolved until labels and
comments are read. Held rules remain visible. `--require-resolved` returns 3
for unresolved rules while preserving the inspectable JSON plan. The policy's
`onUnknown` selection may hold, select an explicit fallback, or fail.

## Apply selected effects

When the user's one-off or standing grant covers the identified effects, direct
application is an ordinary tool operation. A preview is useful when the task calls
for one; the CLI does not require a separate saved plan before every apply.

```sh
diffdevil apply --repo OWNER/REPO --pr NUMBER --no-config --preset size@1 --format json
diffdevil apply --repo OWNER/REPO --pr NUMBER --config .diffdevil.yml --format json
diffdevil apply --plan desired.json --config .diffdevil.yml --format json
```

The bundled default ensures missing size-label definitions, reconciles only the
declared size group, and posts no comments. Apply targets GitHub metadata, not
source-file edits. A request to inspect a PR does not itself select those effects.

Write commands use different configuration loading from ordinary local commands:

| Selection | Policy used |
| --- | --- |
| No explicit config | Bundled selected preset |
| `--config .diffdevil.yml` | That path at the current PR base commit |
| `--policy-source pinned --policy-ref FULL_SHA` | Deliberately selected immutable source |
| Add `--policy-repository OWNER/REPO` | The explicit external policy repository |
| `--policy-source workspace --config PATH` | Deliberately selected local policy for the CLI |
| Definition-only command with config | Resolved default-branch commit unless another source is selected |

Remote relative templates use the policy's commit; workspace templates resolve
relative to the local config. PR data and trusted write policy remain distinct.
The CLI's explicit workspace mode is supported; Actions have a different
contract and do not use workspace policy for writes.

Credentials are supplied through the host's `GH_TOKEN` or `GITHUB_TOKEN` route,
not a CLI token argument. Apply normally reacquires GitHub evidence and checks
current comparison identity before each effect. `--git` can instead compare the
current PR's exact objects already available locally without checking out PR code.

A saved plan must match a freshly derived plan under the selected policy and
target. Keep `--rule ID` consistent when using a selected-rule plan.
`--report PATH --trust-report` is the CLI/API's explicit trusted-carrier option,
not a way to authenticate arbitrary JSON. Ordinary reacquisition is available
without it. The Actions do not expose this trust-report option.

## Label definitions and comments

```sh
diffdevil labels verify --repo OWNER/REPO --config .diffdevil.yml --format json
diffdevil labels apply --repo OWNER/REPO --config .diffdevil.yml --definitions ensure --format json
```

`labels verify` reads definitions; exit 1 means known drift.
`labels apply` defaults to synchronizing declared definition metadata.
`--definitions ensure` creates missing definitions while preserving existing
metadata. PR `apply` additionally supports `none`, `verify`, `ensure`, and `sync`
where documented. These operations do not replace unrelated labels.

Comments require explicit policy/templates. Their lifecycle can create, retain,
upsert, or act on a transition according to the selected mode.
`--comment-author LOGIN` identifies a principal other than the default Actions bot;
an optional `--comment-author-id ID` further identifies it.
Create-mode retry uses the same `--occasion ID` so the attempt retains its identity.

The [template manual](https://github.com/Wolfsblvt/diffdevil/blob/main/docs/manual/policy/from-measurements-to-rules/effects-and-templates.md)
owns placeholder and lifecycle details; the
[GitHub API manual](https://github.com/Wolfsblvt/diffdevil/blob/main/docs/integration/github-api.md)
owns current provider acquisition and reconciliation.

## Use the application result

The returned effects journal distinguishes intended operations, attempted
requests, and observed readback. Report changes, no-ops, holds, failures, and
unobserved outcomes according to that result. A held rule is not a completed write.

A stale comparison calls for current evidence and a new plan. A rejected policy
source calls for selecting the intended supported source, not silently using
another policy. Missing permissions identify the affected operation.
An ambiguous request calls for reading its actual provider state before retry:
GitHub does not provide one transaction across all label and comment operations.

A partial failure can leave successful changes in place. Continue or recover under
the user's existing instructions with those observations intact; the tool does
not imply a rollback or require abandoning the rest of the task.
