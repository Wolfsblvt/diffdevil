# Start with a preset

Get a useful policy before writing an expression. With no configuration, diffdevil
uses `size@1`: it measures replacement-aware Changed, selects a size band, and can
plan the corresponding label. The host decides whether to apply that plan. A local
analysis is not a GitHub write.

## See the default result

These examples need a working [CLI](../use/cli.md). Install it with
`npm i -D @wolfsblvt/diffdevil`. The commands use the repository's example paths;
outside a checkout, save the linked complete files at those paths or change the
arguments to their saved locations. No example in this chapter contacts GitHub.

Use the complete [payments patch](../../examples/diffs/review.diff), containing
source, tests, documentation and a lockfile:

```sh
npx diffdevil analyze --diff-file docs/examples/diffs/review.diff --no-config --format human
npx diffdevil query --diff-file docs/examples/diffs/review.diff --no-config --metric changed --format value
```

The patch has **10 Changed and 16 raw churn**. A replacement of four lockfile lines
contributes four Changed, not eight. The default band is XS. This classification
says nothing about correctness, risk or how carefully to review the patch.

## What size@1 selects

The preset supplies the review metric, five ordered numeric bands, a managed label
group, six definitions and one rule. The numeric intervals are `[0,20)`,
`[20,100)`, `[100,500)`, `[500,1000)` and `[1000,+∞)`. An exact zero is XS;
insufficient evidence can select `size/Unknown`. Unknown is not a sixth numeric
interval and is not zero.

All observed diff files are included by default. Lockfiles and generated-looking
paths are not secretly excluded. Binary or submodule changes remain visible with
honest line applicability. Size does not turn XL into a failed check. Comments
are off. The root Action normally ensures missing definitions while preserving
existing metadata and unrelated labels; read-only hosts only present the decision.

## Select it explicitly

Save this complete [preset policy](../../examples/policies/story/preset.yml):

```yaml
version: 1
presets: [size@1]
```

```sh
npx diffdevil validate --config docs/examples/policies/story/preset.yml
npx diffdevil analyze --diff-file docs/examples/diffs/review.diff --config docs/examples/policies/story/preset.yml --format human
```

The explicit policy gives the same default result. A missing `presets` field also
selects `size@1`; `presets: []` deliberately selects no preset. A misspelled or
unsupported preset fails rather than silently choosing a substitute. Presets are
bundled data, not URLs, npm modules, or executable imports.

## Inspect the complete expansion

```sh
npx diffdevil explain --policy --config docs/examples/policies/story/preset.yml --format yaml
```

Expanded YAML is ordinary reusable policy. Its `presets: []` prevents importing the
same preset again. JSON explanation additionally carries origins and replacements.
The following exact expansion is generated from the bundled source and checked
against the compiler. Edit the preset source, not the bounded inventory below.

<!-- manual:generated presets -->
[size@1 source](../../../src/diffdevil/presets/size-v1.yml)

```yaml
version: 1
language: diffdevil-expr/1
presets: []
measurement:
  replacementLines: replacement-lines-v1
defaults:
  paths: {}
metrics:
  review:
    measure: lines.changed
bands:
  size:
    value: metrics.review
    minimum: 0
    ranges:
      - id: xs
        lt: 20
      - id: s
        lt: 100
      - id: m
        lt: 500
      - id: l
        lt: 1000
      - id: xl
        otherwise: true
labelGroups:
  size:
    - size/XS
    - size/S
    - size/M
    - size/L
    - size/XL
    - size/Unknown
labelDefinitions:
  size/XS:
    color: C2E0C6
    description: 0–19 replacement-aware changed lines
  size/S:
    color: BFDADC
    description: 20–99 replacement-aware changed lines
  size/M:
    color: C5DEF5
    description: 100–499 replacement-aware changed lines
  size/L:
    color: D4C5F9
    description: 500–999 replacement-aware changed lines
  size/XL:
    color: DCC6E0
    description: 1,000 or more replacement-aware changed lines
  size/Unknown:
    color: D1D5DB
    description: Available evidence cannot establish one size band
rules:
  size:
    band: size
    onUnknown: hold
    effects:
      labels:
        group: size
        byBand:
          xs: size/XS
          s: size/S
          m: size/M
          l: size/L
          xl: size/XL
        unknown: size/Unknown
```
<!-- /manual:generated presets -->

## Choose the next amount of policy

Stay with the preset when its question is yours. Use [Configure policy](configure.md)
when you need different thresholds, names or parameters. Use [Paths and scopes](paths-and-scopes.md)
when you need to separate source, tests and lockfiles without losing the original
comparison. Use [From measurements to rules](from-measurements-to-rules/README.md)
when one standard measurement no longer expresses the question. [Recipes](recipes.md)
provide complete policies to adapt, not fragments that rely on hidden defaults.

`size@1` identifies preset semantics. It is not the installed package version,
Action major, expression language or report schema version. Updating one does not
silently authorize reinterpreting another. The [compatibility reference](../reference/language-and-contracts/schemas-and-compatibility.md)
keeps those identities separate.
