# Shortcut and detail comparison

## Meaning

This is the current co-design object for the six complete user tasks requested
in the implementation assignment. It compares cognitive and quoting cost without
creating a second expression vocabulary. It states where the current build can
execute each route and where the comparison is still design evidence.

## Settled presentation

Keep standard metric aliases, scalar threshold checks, file quantifiers, and path
projections. They remove real boilerplate, especially the default inclusion
filter and `map`/lambda construction. The selected presentation uses ordinary detail/custom formulas for simple matching and arithmetic
in public examples. Retain every alias; this teaching choice removes no capability. Retrieve a
named formula with `--metric metrics.<id>` rather than inventing formula flags.
Teach the preset first for ordinary Action use, simple conditions as normal
detail, and the collection shortcuts where they remove lambda/filter boilerplate.

The same AST, binder, type checker, numeric evidence and interpreter execute all
implemented shortcuts. The equivalent expression printed by `explain` is not
reparsed or used as the execution implementation.

## What is actually runnable

Run `npm run demo:shortcuts` after building. It executes both the shortcut and
independently authored detail text for the first four CLI tasks, comparing actual
stdout and exit status. For the fifth it compiles a custom formula through the
public API and an explicit JSON file, retrieves the named metric through both
CLI forms, and also replays a saved typed metric. The sixth compares the pure
single-rule Action compiler against independently authored policy through rule
results and desired operations. Observations are in
`artifacts/shortcut-demo/comparison.json`.

The first four pairs now execute through their respective production front ends.
Separate conformance tests compare the same source/shortcut semantics across
exact, bounded, incomplete, and unmeasurable fixtures. This is no longer merely
AST-to-AST evidence. The Action input compiler and JSON authoring route now run;
YAML loading now runs too; the Action runner and its provider effects remain
unimplemented.
Those transport/consumer boundaries are not proved by the six computational tasks.

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
report root and field path. Both routes remain available. Public formula demonstrations lead with the
normal detail form; the metric reference preserves every alias.

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
compiles this exact detail source through the public API and the executable
[weighted JSON policy](../examples/policies/weighted.json). It retrieves `248`
through both `--metric metrics.weighted` and `--expr 'metrics.weighted'`:

```sh
diffdevil query --report examples/reports/exact.json \
  --config examples/policies/weighted.json --metric metrics.weighted --format value
```

That policy explicitly excludes `package-lock.json` to match the fixture's saved
inclusion selection. Selecting a new policy recomputes its paths; defaults do
not silently inherit an old exclusion. The API also saves the result with its
numeric type and retrieves it later without its authoring configuration.
One-off calculation already needs no configuration:

```sh
diffdevil query --expr 'totals.lines.deleted + 2 * totals.lines.modified' --format value
```

YAML loading remains unimplemented. Explicit JSON configuration is now an
exercised authoring route, not just an API bridge. The additional concepts are a
formula, a metric name and configuration placement. Numeric type is inferred and
preserved by the compiler; there is no second arithmetic vocabulary to learn.

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
reconciliation, and no comments. The pure input compiler now proves the
single-rule shortcut and authored policy produce equivalent decisions and desired
operations, without creating a hidden size rule. It also proves the no-input
route selects size policy with no comments. The future root runner must explicitly
request missing-definition creation and perform provider reconciliation. No Action
runner, Node 24 bundle or GitHub mutation is claimed by this checkpoint.

A runnable API route, with no YAML parser required, is:

```javascript
import { compileActionShortcut, evaluatePolicy, createPlan } from '@wolfsblvt/diffdevil/policy';
import { unwrap } from '@wolfsblvt/diffdevil';
const policy = unwrap(compileActionShortcut({
  metric: 'changed', threshold: '100', comparison: 'gt',
  label: 'review/large-change', exclude: 'package-lock.json',
}));
const result = unwrap(evaluatePolicy(policy, report));
const desired = unwrap(createPlan(result,
  { repository: 'example/repository', pullRequest: 42 },
  { definitions: 'ensure' }));
```

For the specimen, the decision is resolved true and the desired operations are
`label.ensure review/large-change` and `label.add review/large-change`.
The shortcut requires the metric, comparator, threshold and effect; full policy
adds declaration names and ownership structure, useful when several rules share it.

## Shell and YAML transport

The first four expression examples contain no single quotes and can be enclosed
in single quotes in Bash and PowerShell. The shortcut numbers require no quoting;
quote path globs such as `'src/**'` so the shell does not expand them. For
expressions with mixed quotes or dynamic values, prefer the selected
`--expr-file`/typed-parameter path rather than building source with interpolation.
`--expr-file`, `--expr-stdin`, typed `--param NAME=VALUE` and JSON
`--params-file PATH` now execute. A parameter is data, never substituted into
expression source. Shell single-quote examples work for the shown static strings;
use parameter files for values whose own quoting is inconvenient.

Native Windows argument transport was not executed. The package test generated
and inspected npm's CMD and PowerShell launchers, which is a narrower claim.
YAML `formula` and `when` values above are detail source, not GitHub `${{ ... }}`
expressions or template `{{ ... }}` placeholders.

## Remaining co-design evidence

The source-string, JSON configuration and pure Action-policy comparisons are
executed. Next, run the YAML authoring experience and exercise the one-rule and
default Action runners against mocked GitHub, including real output transport and
provider reconciliation. Preserve the working shortcut expectations and compare
those full experiences before expanding the flag surface.
