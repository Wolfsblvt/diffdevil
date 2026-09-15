# Types, measurements, and decisions

## Meaning

This document defines the value semantics of `diffdevil-expr/1`. Numeric facts carry evidence; conditions preserve unresolved decisions; structural absence is distinct from measurement uncertainty. It owns arithmetic, missing/null behavior, and the small correlation model needed to keep replacement-aware formulas trustworthy. Collection membership is specified separately in [Collections and scopes](collections-and-scopes.md).

## Static types and runtime evidence

The static types are `integer`, `float`, `boolean`, `string`, `null`, records with named fields, homogeneous collections, and optional versions of those types. `number` in a signature means either integer or float. An empty collection has element type `never` until a surrounding operation supplies a type.

Evidence is not a replacement for type. An unknown integer is still an integer; an unmeasurable line count is not a string error message. A boolean whose truth cannot be established is still a boolean decision. A record may contain both exact and unresolved fields without making its known path unavailable.

Record compatibility is structural with explicit keys. There is no `any` type that disables checking. Inputs added by a TypeScript host have a declared schema and inert values, not arbitrary host objects.

## Numeric domains

Integers lie in the exact range `-9007199254740991` through `9007199254740991`. Raw and replacement-aware counts are nonnegative integers. Count limits are verified before conversion or arithmetic can lose precision.

Floats are finite IEEE-754 binary64 values. A decimal point or exponent in a literal selects float. `/` returns float. Mixing integer and float promotes to float. `+`, `-`, and `*` on integers remain integer and are checked for overflow. `%` accepts integers only and returns the remainder after division truncated toward zero, so `-5 % 3` is `-2`.

Reject non-finite results and unsafe integer literals. Normalize negative zero to zero in observable values. Floating underflow follows binary64 behavior. No hidden tolerance is added to equality, thresholds, or band boundaries.

The safe-integer boundary and numeric representation follow ECMAScript's numeric model; the prohibition on unsafe counts and the evidence rules here are diffdevil design choices. See [N1](../../reference/2026-09-09/sources-and-research.md#n1).

“Exact” means one determined value under this model. It does not mean arbitrary-precision decimal or real arithmetic. For example, `0.1 + 0.2 == 0.3` is false under the selected float model. For exact integral policy weighting, prefer `3 * metrics.source + metrics.tests` over unnecessary decimal factors.

## Numeric evidence states

| State | Meaning | Required payload |
| --- | --- | --- |
| `exact` | Exactly one determined value. | `value` |
| `bounded` | A justified finite closed interval with more than one possible value. | `lower`, `upper` |
| `unknown` | Applicable, but evidence does not establish an exact value or a finite two-sided interval. | Reasons; optional finite one-sided constraint. |
| `unmeasurable` | The selected measurement is not applicable to this material under its measurement contract. | Reasons. |

A singleton bounded interval is normalized to exact. Bounds are inclusive. Bounds must be ordered, finite, and compatible with the numeric type. An unknown value with both finite bounds is normalized to bounded, or exact when equal. Invalid input tags or contradictory bounds are report errors.

Examples:

```json
{"status":"exact","value":173}
{"status":"bounded","lower":60,"upper":70}
{"status":"unknown","lower":0,"reasons":[{"code":"FILE_SET_INCOMPLETE"}]}
{"status":"unmeasurable","reasons":[{"code":"BINARY_LINES_UNDEFINED"}]}
```

Exactness is value-specific. A report can have exact raw deletion totals and bounded replacement-aware totals. An overall `measurement.status` summarizes limitations but does not replace checking the particular value a condition uses.

## Structural absence, null, uncertainty, and errors

**Missing** means an optional structural field is absent. A normal non-renamed file may have no `oldPath`. This is expected data, not incomplete measurement.

**Null** is an explicitly supplied null value. It may be present in typed parameters or query records; it is not a numeric fallback.

**Unknown** means relevant evidence is insufficient. It is not the absence of a report field. A missing required field, misspelled name, unsupported report state, or invalid configuration is an error.

**Unmeasurable** means the measurement does not apply. Counting an included binary modification as zero would change the question rather than resolve it.

**Error** means the operation or input is invalid, including syntax, type, division by zero, inconsistent evidence, and exhausted limits. Errors carry diagnostics and abort the affected evaluation; they are not values users can compare to a number.

There is no automatic conversion from missing, null, unknown, or unmeasurable to `0`, `false`, `""`, or an empty collection.

## Optional values and guards

`isMissing(x)` and `isNull(x)` inspect structural state. `orElse(x, fallback)` substitutes only for missing or null. Its fallback is evaluated lazily. It does not substitute for a numeric unknown or unmeasurable value.

```text
orElse(f.oldPath, f.path)
```

A field that may be absent cannot be passed directly to a function requiring a present string. Use `orElse` or `requirePresent`.

The checker may narrow an immutable optional field within the immediate true branch of `!isMissing(x) && !isNull(x)` and its following `&&` expression. The mandatory version-1 narrowing patterns are these direct guards on the same bound symbol/member identity; general logical implication inference is not required. Ternary true branches inherit those same direct guards. A helper remains the portable clear choice for more elaborate conditions.

If presence itself is unresolved, neither `isMissing` nor `isNull` fabricates certainty. `orElse` returns an unknown value of its joined result type without evaluating the fallback. Optional aggregate results use this state when a collection might be empty.

## Arithmetic over intervals

Evaluate operands in source order. Validate each operation as it is reached. For ordinary independent finite intervals:

```text
[a,b] + [c,d] = [a+c,b+d]
[a,b] - [c,d] = [a-d,b-c]
[a,b] * [c,d] = [min(ac,ad,bc,bd), max(ac,ad,bc,bd)]
```

Use exact checked integer endpoint operations for integer intervals. Float endpoint operations use the selected binary64 operation; interval implementation must enclose every possible result of that operation, with outward adjustment where its computation requires it. Do not describe machine-computed endpoints as exact real-number bounds.

Division requires the divisor's applicable domain to exclude zero. An exact zero divisor produces `E_DIVIDE_ZERO`. A bounded or unknown divisor whose domain may contain zero produces `E_POSSIBLE_DOMAIN`. Missing non-null operands are rejected by typing or `requirePresent`; unmeasurable operands propagate unmeasurable rather than creating a fictitious numeric divisor domain.

For integer remainder with a nonzero finite divisor interval, a sound fallback bound is derived from `max(abs(divisor endpoints)) - 1`, intersected with the numerator's sign and magnitude domain. Exact operands use exact remainder. This conservative fallback is the version-1 contract; no tighter implementation-dependent answer may change a condition silently.

A possible integer overflow or non-finite float result is `E_POSSIBLE_DOMAIN`; a proven overflow is `E_NUMERIC_OVERFLOW`. These are not measurement unknown. The language must not prove safety by rounding an invalid integer first.

Unmeasurable input propagates through numeric arithmetic, including multiplication by zero. An unknown applicable input retains justified constraints where the selected interval operation can derive them. For example, adding an exact nonnegative count to a nonnegative unknown retains a lower bound. The finite static count domain does not authorize inventing a useful measured upper bound; computational range limits are not evidence about the diff.

## Primitive correlations

Version 1 preserves the standard relationships for one applicable text-measurement family:

```text
raw.added   = lines.added + lines.modified
raw.deleted = lines.deleted + lines.modified
raw.churn   = lines.added + lines.deleted + 2 * lines.modified
lines.changed = lines.added + lines.deleted + lines.modified
```

For a file with exact raw additions `60` and deletions `10`, but unavailable edit-block pairing, let `M` be its unknown modified-line count in `[0,10]`:

```text
lines.modified = M
lines.added = 60 - M
lines.deleted = 10 - M
lines.changed = 70 - M
```

Then `lines.deleted + lines.modified` is exactly `10`, not `[0,20]`. That identity is useful enough to be mandatory rather than an optional optimization.

The reference evaluation domain uses integer affine forms for these validated primitive families. Addition, subtraction, unary signs, and multiplication by an exact integer coefficient preserve a form while all reached intermediate operations remain valid. Named metric references preserve that form. Each family has stable identity derived from the same normalized file, comparison, inclusion selection, and metric version; unrelated files do not share a pairing variable. A scope aggregate sums the applicable file-family forms.

This is not general symbolic algebra. Float operations, division, remainder, arbitrary unknown input parameters, and unsupported transforms fall back to the documented interval domain and do not earn algebraic cancellation. Repeated reads of an arbitrary unknown `params.x` do not imply `params.x - params.x` becomes exact zero in version 1. Unmeasurable values never gain a pairing variable.

Normalization must not hide operand failures or change evaluation order. Evaluate and validate both reached operands before deriving a normalized result. Do not reassociate a sequence to bypass an overflow that the authored intermediate expression encounters. Do not substitute an invariant when its text applicability, family identity, raw counts, or evidence consistency has not been validated.

Saved reports must preserve enough primitive provenance to reconstruct this finite model. A claimed relationship in attacker-supplied JSON is not trusted merely because its hash matches its own contents. Input consistency and privileged artifact provenance are separate requirements.

## Numeric comparisons

For applicable domains, a comparison is true when it holds for every admissible value pair, false when it holds for none, and unknown otherwise. Use the preserved affine relationship where both sides share supported primitive families; otherwise use the interval abstraction.

For `x` in `[60,70]`:

| Expression | Decision |
| --- | --- |
| `x >= 50` | true |
| `x < 60` | false |
| `x >= 65` | unknown |
| `x == 65` | unknown |
| `x != 100` | true |

Overlapping intervals do not establish equality. Equality between exact compatible values uses strict value equality. Strings compare case-sensitively in Unicode scalar lexicographic order, independent of locale. Booleans support equality but not ordering. Records and collections do not support equality or ordering in version 1; select a comparable scalar instead.

Comparison involving unmeasurable numeric evidence yields an unknown decision with an applicability reason. It does not become an operation error merely because the predicate cannot be proved. Explicit `requireExact` can deliberately make that state an error.

## Boolean algebra and evaluation order

The truth tables are:

| `a` | `b` | `a && b` | `a || b` |
| --- | --- | --- | --- |
| true | true | true | true |
| true | false | false | true |
| true | unknown | unknown | true |
| false | true | false | true |
| false | false | false | false |
| false | unknown | false | unknown |
| unknown | true | unknown | true |
| unknown | false | false | unknown |
| unknown | unknown | unknown | unknown |

`!unknown` is unknown. Evaluation is left-to-right. A known false left operand short-circuits `&&`; a known true left operand short-circuits `||`. An unknown left operand requires the right operand because it may establish the result.

```text
false && (1 / 0 > 0)
```

This is false without a division error. But `false && missingSymbol` is a compile error because every branch is bound and checked.

```text
(1 / 0 > 0) || true
```

This is a runtime error, not true. Do not reorder terms or suppress an encountered error because a later term would settle the decision.

## Conditional values

For `condition ? yes : no`, evaluate only the selected branch when the condition is resolved. When the condition is unknown, return an unknown value of the compatible result type without evaluating either branch. This deliberately avoids speculative branch errors and implementation-dependent proof attempts.

A configuration compiler still validates both branch types and dependencies. A metric cycle is not permitted just because a branch is usually false.

## Explicit projections and requirements

`status(number)` reports its numeric evidence state as an exact string. `isExact(number)` reports whether it is exact. `lowerBound` and `upperBound` select an available justified bound as an exact number and retain provenance identifying the projection. Unavailable bounds fail with `E_BOUND_UNAVAILABLE`.

`requireExact(number)` returns its exact numeric value or fails with `E_EXACT_REQUIRED`. `requirePresent(optional)` requires structural presence and non-null, but does not require numeric exactness. These are distinct assertions.

A policy can deliberately branch on status and select a fallback value. Such a fallback is authored policy, and explanations must identify it. The evaluator never supplies it invisibly.

## Deterministic evidence and diagnostics

Reasons use stable codes with optional source/file references. Multiple reasons are deduplicated by code and subject, then ordered by canonical subject order. Do not put stack traces, dates, locale-dependent strings, or unstable object IDs in the semantic result.

Errors report the smallest relevant expression span plus related operand/declaration locations. A bound projection, explicit partial collection, or status-based fallback is evidence about how the result was obtained, not a warning that can be discarded before a plan is saved.

## File-counter population

`totals.files.total` counts all changed files in the comparison. `included` and `excluded` partition that population according to effective global path policy. All other standard file counters, including change-type, binary, and unmeasurable counters, describe **included** files. This prevents an excluded generated file from reappearing in an ordinary threshold through a secondary counter. Per-file queries can deliberately inspect the full observed `files` collection.

Within a named scope, `included` describes the scope's selected population, and subtype counters use the same population. Scope totals do not expose global `total`/`excluded` counters; `scope.fileSet.total` is the wire-level selection cardinality. Scope completeness is independent of whether zero observed files happened to match. A consumer must preserve each count's evidence when unseen files could change it.
