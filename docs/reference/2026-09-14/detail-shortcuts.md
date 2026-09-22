# Historical detail shortcuts return

## Meaning

This public evidence edition preserves the substantive detail shortcuts
return from the pre-Action implementation sequence, as archived before the
September 15, 2026 publication-preparation pass. Counts, commands, limits, and
recommendations below describe that earlier checkpoint, not current standing.
The exact original is preserved privately. Current behavior and proof are in
[Qualification](../../qualification.md) and the maintained manuals. Artifact
paths below identify historical local evidence, not downloadable public files.

## Recommendation

Keep standard metric aliases, scalar threshold checks, file quantifiers, and path
projections. They remove real boilerplate, especially the default inclusion
filter and `map`/lambda construction. Use normal detail for custom arithmetic and
more involved conditions. Retrieve a
named formula with `--metric metrics.<id>` rather than inventing formula flags.
Teach the preset first for ordinary Action use, a single-rule shortcut for one
threshold/effect, and full policy only when there are multiple joined rules.

The same AST, binder, type checker, numeric evidence and interpreter execute all
implemented shortcuts. The equivalent expression printed by `explain` is not
reparsed or used as the execution implementation.

## What is actually runnable

Run `npm run demo:shortcuts` after building. It executes both the shortcut and
independently authored detail text for the first four CLI tasks, comparing actual
stdout and exit status. For the fifth it compiles a custom detail formula through
the public API, saves the typed metric, and retrieves it through the CLI. Exact
observations are in `artifacts/shortcut-demo/comparison.json`.

The first four pairs now execute through their respective production front ends.
Separate conformance tests compare the same source/shortcut semantics across
exact, bounded, incomplete, and unmeasurable fixtures. This is no longer merely
AST-to-AST evidence. The Action rule and YAML formula-loading experience remain
unimplemented, so the complete six-task integration comparison is still open.

The specimen below uses the exact report fixture with 178 changed lines. Prefix
commands with `node dist/lib/cli/main.js` in the checkout, or use `diffdevil` after
installing the built tarball. Add `--report examples/reports/exact.json` to replay
that same input. Omitting the source analyzes current tracked worktree changes.

## 1. Retrieve total replacement-aware changed lines

```sh
diffdevil query --metric changed --format value
# detail:
diffdevil query --expr 'totals.lines.changed' --format value
```

Output for the specimen: `178` followed by one newline.
The shortcut requires one metric name and one format. The normal form teaches the
report root and field path. Keep the shortcut as the normal first-use example;
show its exact path beside it in the metric reference.

## 2. Check a total threshold

```sh
diffdevil check --metric changed --gt 100
# detail:
diffdevil check --expr 'totals.lines.changed > 100'
```

The specimen exits `0` with no stdout. A resolved false result exits `1`, unknown
exits `3`, and invalid input exits `2`. The shortcut avoids quoting but introduces
`gt` alongside the ordinary `>` operator. Keep both, but do not teach every
comparator alias before the user needs one. The expression is clearer once the
reader already knows the report model.

## 3. Test whether any included file exceeds a threshold

```sh
diffdevil check --files any --metric changed --gt 100
# detail:
diffdevil check --expr 'any(filter(files, f => f.included), f => f.lines.changed > 100)'
```

The specimen exits `0` without stdout. This is the strongest shortcut: it avoids
collection filtering, a lambda, the per-file root and inclusion boilerplate. Keep
it prominently. `--all-files` is deliberate; it must never be silently assumed.

## 4. Return matching paths

```sh
diffdevil query --files --metric modified --gt 20 --select path --format lines
# detail:
diffdevil query --expr 'map(filter(files, f => f.included && f.lines.modified > 20), f => f.path)' --format lines
```

The specimen emits:

```text
src/Foo.cs
```

The shortcut hides two collection operations and two binders. Keep it. It does
not hide membership uncertainty: strict path output refuses uncertain selection,
unknown order or unsafe delimiters. `--certain` is an explicit narrower question,
not the default. Use `--format nul` for paths containing line breaks.

## 5. Define and use a custom formula

The selected ordinary configuration is:

```yaml
version: 1
presets: []
metrics:
  weighted:
    formula: totals.lines.deleted + 2 * totals.lines.modified
```

```sh
diffdevil query --metric metrics.weighted --format value
# Normal detail retrieval:
diffdevil query --expr 'metrics.weighted' --format value
```

Do not add `--deleted-weight`, `--modified-weight`, or a second mini-formula
syntax. The normal grammar is the concise definition. The runnable demonstration
compiles this exact detail source through the public API, saves the result with
its numeric type, and retrieves `248` through `--metric metrics.weighted`.
One-off calculation already needs no configuration:

```sh
diffdevil query --expr 'totals.lines.deleted + 2 * totals.lines.modified' --format value
```

YAML definition remains unimplemented. The API bridge proves source compilation
and saved named retrieval, not the final configuration-file authoring experience.
The additional concepts are a formula, a metric name, and its numeric type; there
is no second arithmetic vocabulary to learn.

## 6. Define one Action rule

Selected single-rule shortcut, not an available published Action:

```yaml
- uses: Wolfsblvt/diffdevil@v1
  with:
    metric: changed
    threshold: '100'
    comparison: gt
    label: review/large-change
```

Equivalent selected policy:

```yaml
version: 1
presets: []
metrics:
  review:
    measure: lines.changed
rules:
  overLimit:
    when: metrics.review > 100
    effects:
      labels:
        add: [review/large-change]
        removeWhenFalse: true
```

The shortcut removes configuration-file placement and named metric/rule
boilerplate. Keep it for one simple condition. The policy becomes easier to read
when several metrics and rules share definitions. The root no-config destination
remains bundled `size@1`, ensure-missing label definitions, managed-size
reconciliation, and no comments. No part of that Action execution is claimed by
this checkpoint.

## Shell and YAML transport

The first four expression examples contain no single quotes and can be enclosed
in single quotes in Bash and PowerShell. The shortcut numbers require no quoting;
quote path globs such as `'src/**'` so the shell does not expand them. For
expressions with mixed quotes or dynamic values, prefer the selected
`--expr-file`/typed-parameter path rather than building source with interpolation.
`--expr-file` and `--expr-stdin` now execute. CLI parameter-file binding remains
part of the pending policy/configuration join; direct API environments can already
carry validated typed parameters.

Native Windows argument transport was not executed. The package test generated
and inspected npm's CMD and PowerShell launchers, which is a narrower claim.
YAML `formula` and `when` values above are detail source, not GitHub `${{ ... }}`
expressions or template `{{ ... }}` placeholders.

## Remaining co-design evidence

The source-string comparison is now executed. Next, run the YAML formula and
exercise the one-rule and default Actions against mocked GitHub. Preserve the
working shortcut expectations and compare those complete consumer experiences
before expanding the flag surface.
