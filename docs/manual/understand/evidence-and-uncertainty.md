# Evidence and uncertainty

A measurement can be useful before it is exact. If Changed is between **60 and 70**, every possible value is below 100. That is enough for a check against 100, but not enough to print 65 as the count.

The tempting mistake is to replace missing certainty with a convenient scalar, false condition or empty collection. diffdevil keeps those distinctions in the result instead.

## Read the particular value

| Standing | What the evidence establishes | What it does not establish |
| --- | --- | --- |
| Exact `65` | One determined value under the measurement contract | Importance, quality or risk |
| Bounded `[60,70]` | A finite, inclusive interval | A preferred value inside it |
| Unknown | The measurement applies, but its value or a finite two-sided interval is not established; a one-sided constraint may remain | Zero, false or an empty result |
| Unmeasurable | This line measurement does not apply to the material, such as a binary file | Permission to omit the file from the comparison |

These are numeric evidence states, not four data types. An unknown count remains numeric. A report may contain exact paths and raw statistics alongside bounded Changed measurements. Read the standing of the value your question uses, rather than treating the report's overall status as a substitute for every field.

Missing and null mean something else. A normal file can lack an optional `oldPath`; that is structural absence, not an unknown rename measurement. Explicit null is a present value. An invalid expression, malformed report or failed source acquisition is an **error**, not uncertainty about a successfully acquired comparison.

## Try a decision that bounds can answer

Use the [complete bounded report](../../examples/reports/bounded.json) from a [built source checkout](../start/analyze-local-changes.md#install-the-executable). It retains exact raw counts of 60 additions and 10 deletions, but no complete replacement-block evidence. Changed is `[60,70]`.

```sh
node dist/lib/cli/main.js check --report docs/examples/reports/bounded.json --expr 'totals.lines.changed < 100'
node dist/lib/cli/main.js check --report docs/examples/reports/bounded.json --expr 'totals.lines.changed < 60'
node dist/lib/cli/main.js check --report docs/examples/reports/bounded.json --expr 'totals.lines.changed >= 65'
```

The first check is **true, exit 0**. The second is **false, exit 1**. The third is **unresolved, exit 3**, because the interval straddles that threshold. These are three successful interpretations of the available evidence, not three degrees of parser failure.

A strict scalar asks a stronger question:

```sh
node dist/lib/cli/main.js query --report docs/examples/reports/bounded.json --metric changed --format value
node dist/lib/cli/main.js query --report docs/examples/reports/bounded.json --metric changed --format json
```

The scalar form refuses with exit 3 and no value on stdout. The canonical query JSON succeeds with exit 0 and preserves the bounds. Use JSON when your consumer can interpret evidence; obtain stronger evidence when the task genuinely requires one exact count. Do not add a zero fallback.

A band can resolve for the same reason as the first check: the whole interval fits inside it. Under `size@1`, every value from 60 through 70 belongs to `s`. An interval crossing a boundary cannot select a convenient middle band.

## Counts do not supply missing files

File-set completeness is separate from numeric certainty. The [complete incomplete-report fixture](../../examples/reports/incomplete.json) declares three files but contains one observed record. It does not describe three known paths.

```sh
node dist/lib/cli/main.js query --report docs/examples/reports/incomplete.json --files --select path --format nul
node dist/lib/cli/main.js query --report docs/examples/reports/incomplete.json --files --select path --certain --format nul
```

The first command refuses to emit a supposedly complete list. The second deliberately asks for **definite observed members only**. It can return the one known path, but it has not recovered the two missing files. Use `--certain` only when that narrower question is the intended one.

Likewise, filtering a complete file list can leave uncertain membership when the predicate depends on unresolved measurements. An empty determined collection is a valid answer; an incomplete or unresolved collection is not silently made empty. A display showing only its first rows is a presentation limit, not a complete file inventory.

For real source editions, open [bounded decisions](https://diffdevil.dev/playground/?example=bounded-decisions&variant=proven) or [incomplete file sets](https://diffdevil.dev/playground/?example=incomplete-file-set&variant=comparison). Read the selected variant and its retained source standing before comparing results.

## Preserve the distinction through policy and effects

A rule can hold its effects when its condition is unresolved. Holding differs from a definitely false condition. It also differs from an explicit fallback: the default size policy can select `size/Unknown` when its band cannot resolve.

The [unmeasurable fixture](../../examples/reports/unmeasurable.json) keeps its binary file in the inventory without pretending its line count is zero. Excluding it would ask a different question, just as excluding an absent or uncertain member would.

When a result is surprising, first inspect source identity, the selected value's reasons and bounds, file-set completeness and path policy. Then decide whether to acquire stronger evidence, choose a representation that preserves it, or explicitly narrow the question. [Use results in scripts](../start/use-results-in-scripts.md) gives complete consumers; [From facts to provider state](facts-to-provider-state.md) shows a held rule without a write.
