# Effects and templates

Turn an understood decision into explicit desired operations. A plan describes what
should happen; only an applying host can attempt requests and observe the result.
Preview before crossing that boundary.

## Preview one complete label policy

This chapter needs the [CLI](../../use/cli.md) and the complete
[payments patch](../../../examples/diffs/review.diff). Save the complete
[label policy](../../../examples/policies/story/labels.yml):

```yaml
version: 1
presets: [size@1]
defaults:
  paths:
    exclude: ['**/package-lock.json']
scopes:
  source:
    includeOnly: ['src/**']
  tests:
    includeOnly: ['tests/**']
parameters:
  attentionAt:
    type: integer
    default: 5
metrics:
  sourceReview:
    measure: lines.changed
    scope: source
  testReview:
    measure: lines.changed
    scope: tests
  attention:
    formula: metrics.sourceReview + metrics.testReview
bands:
  attention:
    value: metrics.attention
    minimum: 0
    ranges:
      - id: small
        lt: 5
      - id: substantial
        otherwise: true
queries:
  attention:
    expression: metrics.attention
rules:
  attention:
    when: metrics.attention >= params.attentionAt
    onUnknown: hold
    effects:
      labels:
        add: [review/payments]
        removeWhenFalse: true
labelDefinitions:
  review/payments:
    color: C5DEF5
    description: Source and test changes meet the configured attention threshold
```

```sh
npx diffdevil plan --diff-file docs/examples/diffs/review.diff --config docs/examples/policies/story/labels.yml --target-repo example/repository --target-pr 42 --definitions ensure --format json
```

Source plus test Changed is 5, so `review/payments` is desired. The inherited preset
also requests `size/XS`. This is an offline plan, not a claim that either label exists
on GitHub. `removeWhenFalse` applies to a resolved false condition; `onUnknown: hold`
does not turn missing evidence into permission to remove a label.

## Own labels and their definitions

Assigning a label and creating its repository definition are separate operations.
`ensure` creates missing definitions without overwriting existing metadata; `verify`
checks for drift; `sync` reconciles explicitly managed metadata. None owns unrelated
repository labels. Definitions-only commands are separate from PR assignments.

Band effects map every numeric band into a declared managed group, with an explicit
unknown mapping when selected. Members and mappings must agree. Conflicting desired
operations fail with `E_EFFECT_CONFLICT` before application rather than letting rule
order choose a winner. A token, source path or hash supplies no additional ownership.
[Labels, comments and definitions](../../use/shared-workflows/labels-comments-and-definitions.md)
explains no-ops, ownership and writer cutover in full.

## Add one optional owned comment

This complete [comment policy](../../../examples/policies/story/comments.yml)
contains the same facts, rules and labels, plus an explicitly opted-in comment:

```yaml
version: 1
presets: [size@1]
defaults:
  paths:
    exclude: ['**/package-lock.json']
scopes:
  source:
    includeOnly: ['src/**']
  tests:
    includeOnly: ['tests/**']
parameters:
  attentionAt:
    type: integer
    default: 5
metrics:
  sourceReview:
    measure: lines.changed
    scope: source
  testReview:
    measure: lines.changed
    scope: tests
  attention:
    formula: metrics.sourceReview + metrics.testReview
bands:
  attention:
    value: metrics.attention
    minimum: 0
    ranges:
      - id: small
        lt: 5
      - id: substantial
        otherwise: true
queries:
  attention:
    expression: metrics.attention
rules:
  attention:
    when: metrics.attention >= params.attentionAt
    onUnknown: hold
    effects:
      labels:
        add: [review/payments]
        removeWhenFalse: true
      comment:
        mode: upsert
        trigger: matched
        template: |
          **Payments change**

          Source Changed: {{ metrics.sourceReview }}
          Tests Changed: {{ metrics.testReview }}
          Included Changed: {{ totals.lines.changed }}
          Included raw churn: {{ totals.raw.churn }}

          This is a configured attention signal, not a quality or risk judgment.
labelDefinitions:
  review/payments:
    color: C5DEF5
    description: Source and test changes meet the configured attention threshold
```

```sh
npx diffdevil plan --diff-file docs/examples/diffs/review.diff --config docs/examples/policies/story/comments.yml --target-repo example/repository --target-pr 42 --format json
```

The preview includes source Changed 3, tests Changed 2, included Changed 6 and
included churn 8. The template does not secretly evaluate arbitrary code.
The default preset alone would never request this comment.

## Substitute data, not expressions

`{{ metrics.attention }}` selects a read-only value path. Arithmetic, calls, loops,
conditionals and filesystem access do not belong inside a template. Compute a named
metric first. `display` is the default renderer and escapes substituted Markdown
and neutralizes substituted mentions. `text` deliberately leaves text formatting
to the author; `json` is suitable for structured values inside a code block.
Records and collections require an explicit appropriate renderer rather than an
implicit string conversion. Missing renders as not available, null remains null,
and bounded or unknown measurements retain their evidence instead of a fabricated
point value.

A backslash before `{{` makes that opening literal; an escaped backslash followed
by an opening still leaves a real substitution. An unmatched opening is a template
error. Closing braces outside a substitution are ordinary text. Escaping applies
to inserted data, not to the template author's own prose or authored mentions.
When using a template file, acquire it from the same trusted source as the policy;
compilation in the library receives the already acquired text explicitly.

## Select lifecycle, trigger and occasion

| Mode | Selected lifecycle |
| --- | --- |
| `upsert` | Reconcile one owned comment in place. |
| `once` | Create the owned comment only when that lifecycle has no prior instance. |
| `create` | Create for an explicit stable occasion; a retry retains that occasion. |
| `once-per-transition` | For a boolean rule, create on the selected resolved transition, not every repeated evaluation. |

Triggers are `always`, `matched`, and `band-changed`. A boolean rule defaults to
`matched`; a band rule defaults to `band-changed`. Band-changed requires a band rule;
once-per-transition requires a boolean rule. A false matched upsert leaves the old
comment alone; it does not delete it. Unknown holds preserve the last resolved state
and do not manufacture transitions.

Ownership binds the expected author, target, policy and rule lifecycle, not merely
a copied marker. Changed policy identity starts a different lifecycle. An App
principal may need an explicit expected comment author; create mode needs a stable
occasion identifier. Those are application inputs, not arbitrary template fields.

## Apply through the selected host

No command above applies anything. Use the complete [report, plan and apply workflow](../../use/shared-workflows/reports-plans-and-apply.md)
when you have authority and credentials for a real target. CLI application normally
reacquires current evidence and trusted base policy; Actions reacquire before writes
rather than treating an uploaded report as authenticated. An exact saved plan must
match the freshly derived plan, source and selected rule set.

Keep stale comparison, held decision, definition conflict, template error, permission
failure and partial provider result distinct. GitHub operations are not one atomic
transaction. A successful request can be followed by failed readback; retain attempted
operations and observed state and reconcile before retrying an ambiguous effect.
One writer should own overlapping labels or comment lifecycles across Actions and
an App. Continue with [Recipes](../recipes.md) for other complete choices.
