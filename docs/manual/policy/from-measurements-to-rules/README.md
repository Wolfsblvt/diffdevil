# From measurements to rules

Start by asking a question of the measurements. A query returns a value; a check
asks whether a condition is established; a metric names a calculation; a band
classifies its numeric possibilities; a rule decides what a policy requests.
None of these stages is observed provider state.

## Query, then check

Use a working [CLI](../../use/cli.md), the complete
[payments patch](../../../examples/diffs/review.diff), and the complete
[policy below](../../../examples/policies/story/rules.yml). All commands are read-only.
The example paths are repository-relative; saved copies can use other paths.

```sh
npx diffdevil query --diff-file docs/examples/diffs/review.diff --no-config --metric changed --format value
npx diffdevil check --diff-file docs/examples/diffs/review.diff --no-config --metric changed --lt 20 --format json
```

The first command returns 10. The second establishes true and exits 0. A false
check exits 1, invalid input or an operation error exits 2, and unresolved evidence
exits 3. A successful evaluation can contain an unknown result; successful execution
is not the same thing as a true condition.

## Name the question in a complete policy

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
```

```sh
npx diffdevil validate --config docs/examples/policies/story/rules.yml
npx diffdevil query --diff-file docs/examples/diffs/review.diff --config docs/examples/policies/story/rules.yml --name attention --format value
npx diffdevil check --diff-file docs/examples/diffs/review.diff --config docs/examples/policies/story/rules.yml --expr 'metrics.attention >= params.attentionAt' --format json
npx diffdevil query --diff-file docs/examples/diffs/review.diff --config docs/examples/policies/story/rules.yml --band attention --format json
```

The source scope contributes 3 Changed and tests 2. `metrics.attention` is their
sum, **5**, while included Changed is 6 because documentation is a different scope.
The saved query returns 5. The check is true at the default threshold 5. The custom
band is `substantial`, because the preceding `lt: 5` range excludes its upper bound.
This is a repository-specific attention criterion, not a universal risk score.

## Separate measures, formulas and scopes

A `measure` names a standard fact, such as `lines.changed`, optionally within a
named scope. A `formula` is detail source with explicit roots, such as the two
metric references above. Do not put arbitrary expression text into `size.metric`
or combine a formula declaration with a `scope` that hides the formula's input.
Metric dependencies are checked for cycles and type correctness. Adding scope
totals is only meaningful when you understand overlap.

Use ordinary arithmetic to state the question. Weighting adds product meaning;
it does not make lines a measurement of quality. `totals.lines.deleted +
totals.lines.modified` measures deleted-only or rewritten lines, not confirmed
breakage. Every reported uncertainty still travels through the formula.

## Classify the whole possible value

Bands contain ordered, exclusive `lt` ranges and a final `otherwise: true` range.
The declared minimum and increasing bounds describe the numeric domain. They must
be consistent with the metric; `otherwise` is not an unknown fallback.

For example, bounds `[60,70]` resolve inside the default S band, despite not giving
an exact scalar. Bounds `[15,30]` cross XS and S and cannot pick either. A justified
lower bound at or above 1000 can establish XL for a nonnegative size measure even
when there is no known upper bound. Never use the midpoint to invent an exact count.

## Declare and inspect a rule

A rule selects exactly one `when` condition or `band`. The custom attention rule
above has no effects. The separately inherited `size@1` rule does have a size-label
plan; retaining a preset retains its declarations until explicitly replaced.

```sh
npx diffdevil plan --diff-file docs/examples/diffs/review.diff --config docs/examples/policies/story/rules.yml --target-repo example/repository --target-pr 42 --format json
```

This constructs desired data for an inert example target. It does not contact that
repository. Inspect rule decisions, operations and held records separately. The
custom rule resolves true but requests nothing yet. [Effects and templates](effects-and-templates.md)
adds the requested label and optional comment without changing what the metric means.

## Respect evaluation phases

`analyze` computes configured metrics and bands, not rule effects. A rules-phase
policy result can produce a plan. Query evaluation computes the selected dependencies
and may read completed rules; a rule declaration itself cannot depend on another
rule. Metrics read facts, scopes, parameters and metrics. Bands consume metrics,
not other band decisions. Configuration validation checks all declarations, even
ones not reached by one lazy query.

Missing report context is not unknown evidence: a reference needing unavailable
schema context is `E_REPORT_CONTEXT`. A saved metric's type is retained explicitly;
it is not guessed from whether its JSON number happens to contain a decimal point.

## Keep unresolved decisions visible

`onUnknown: hold` preserves the rule's intended managed state rather than interpreting
unknown as false and removing a label. `onUnknown: fail` makes unresolved evaluation
a policy error. Explicit band-to-label unknown mappings can request a visible
unresolved label, but do not turn unresolved conditions into matched comments.
A valid held plan normally exits 0; `--require-resolved` selects exit 3 while preserving
an inspectable JSON plan. This is distinct from `onUnknown: fail` and exit 2.

For broader evidence, use the frozen [bounded-decisions catalogue lesson](https://diffdevil.dev/examples/)
and the [detail language](../../reference/language-and-contracts/detail-language.md).
Do not change an unresolved query into a narrower definite-only query without
making that change of question explicit.
