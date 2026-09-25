# Recipes

Choose by the result you need, then keep the whole policy while adapting it.
Each linked YAML file is complete. The small payments patch makes the consequences
checkable without credentials or a provider write; the real-PR catalogue adds scale
and different evidence, not a second policy engine.

## Start from a working specimen

Use a working [CLI](../use/cli.md) and the complete
[payments patch](../../examples/diffs/review.diff). Example commands use repository
paths; save the complete files at those paths or change their arguments.

| Intended result | Complete policy | Result on the patch |
| --- | --- | --- |
| Default size without custom expressions | [Preset](../../examples/policies/story/preset.yml) | 10 Changed, 16 churn, XS. |
| Smaller size thresholds | [Thresholds](../../examples/policies/story/configure.yml) | The same 10 Changed becomes S. |
| Source/test selections excluding the lockfile | [Paths](../../examples/policies/story/paths.yml) | Included Changed 6; source 3 and tests 2. |
| A named source-plus-test condition | [Rules](../../examples/policies/story/rules.yml) | Attention 5, true at threshold 5; no custom effect. |
| A requested payments attention label | [Labels](../../examples/policies/story/labels.yml) | Desired payments label plus inherited size/XS. |
| The same label and an owned summary comment | [Comments](../../examples/policies/story/comments.yml) | A desired comment with 3 / 2 / 6 / 8 measurements. |

## Customize size bands

This complete policy keeps the preset and changes all four cut points together:

```yaml
version: 1
presets: [size@1]
size:
  thresholds: {xs: 10, s: 80, m: 300, l: 800}
```

```sh
npx diffdevil validate --config docs/examples/policies/story/configure.yml
npx diffdevil plan --diff-file docs/examples/diffs/review.diff --config docs/examples/policies/story/configure.yml --target-repo example/repository --target-pr 42 --format json
```

A supplied threshold map must currently be complete and strictly increasing.
A supplied label map must include all five bands and the unknown label. Do not
combine a `size` override with conflicting full declarations for the generated IDs.
For a genuinely different policy, use `presets: []`, as demonstrated by the complete
[custom policy](../../examples/policies/full.yml).

## Signal source changes without test changes

The complete [review-signals policy](../../examples/policies/review-signals.yml)
retains size labels and declares `sourceWithoutTests` using two explicit scopes.
It requests `review/source-without-tests` only when source Changed is positive and
test Changed is zero. On the payments patch that condition is false: tests changed.
The absence of changed test paths would not prove an absence of adequate tests,
and a changed test path does not prove that the tests pass.

```sh
npx diffdevil plan --diff-file docs/examples/diffs/review.diff --config docs/examples/policies/review-signals.yml --target-repo example/repository --target-pr 42 --format json
```

Adapt the path patterns to your repository. Unknown test membership must hold the
rule rather than becoming zero and falsely triggering it. Overlapping source and
test scopes are your policy choice; inspect them before combining totals.

## Measure deleted or rewritten lines

The complete [custom policy](../../examples/policies/full.yml) names
`totals.lines.deleted + totals.lines.modified` and a `destructiveLimit` parameter.
Its label condition also requires at least five included files. On this patch,
after the lockfile exclusion, removed-or-rewritten lines are 2 and only three files
are included, so the rule is false. This name describes a line category, not a
proof that the change destroyed functionality.

```sh
npx diffdevil query --diff-file docs/examples/diffs/review.diff --config docs/examples/policies/full.yml --metric destructive --format value
npx diffdevil plan --diff-file docs/examples/diffs/review.diff --config docs/examples/policies/full.yml --target-repo example/repository --target-pr 42 --format json
```

## Preview one comment without automatic size labels

The complete [review-comment policy](../../examples/policies/review-comment.yml)
selects `presets: []`. It requests one upserted report comment, explicitly triggered
always, with 10 Changed, 16 churn, 6 deleted-only-or-modified lines and four included
files on the unfiltered patch. That is a different selected result from the payments
comment recipe, which excludes the lockfile. Do not copy one recipe's expected
numbers onto the other.

```sh
npx diffdevil plan --diff-file docs/examples/diffs/review.diff --config docs/examples/policies/review-comment.yml --target-repo example/repository --target-pr 42 --format json
```

## Maintain definitions deliberately

A desired label may need a repository definition before assignment. The label and
comment recipes include their new definition; the preset supplies its own complete
set. Preview `--definitions ensure` to create missing definitions only, or choose
sync deliberately when you own the metadata. `labels verify` and `labels apply`
are provider operations and belong to the [definitions workflow](../use/shared-workflows/labels-comments-and-definitions.md),
not a supposed offline step hidden in this recipe page.

## Keep the failure with the recipe

Validate the chosen complete file before execution. Unsupported fields and partial
maps are configuration errors; missing required bindings are parameter errors;
unresolved conditions are not false; held plans have requested no held effect.
Use canonical JSON for evidence you need to inspect without strict scalar refusal.
Do not solve an unknown by adding a zero fallback or an unannounced `certain` filter.

The [real-PR catalogue](https://diffdevil.dev/examples/) contains lockfile scope,
runtime guards, formatting, binary, spread, bounds and incomplete-file-set examples.
Open a named variant from its card to retain its immutable source edition and exact
policy. Use [Configure policy](configure.md) for layering, [Paths and scopes](paths-and-scopes.md)
for selection, and [Effects and templates](from-measurements-to-rules/effects-and-templates.md)
for the difference between the preview and an actual write.
