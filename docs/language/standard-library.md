# detail standard library

## Meaning

This document defines the fixed standard-library surface of `diffdevil-expr/1`. Each function has a declared signature, evaluation strategy, and evidence behavior. The [function catalog](../../spec/detail/v1/functions.json) is its machine-readable signature companion. Function registration from user configuration or arbitrary JavaScript callbacks is not supported.

`C<T>` means a logical collection of T, `Optional<T>` includes structural missing/null, and `N` means integer or float. Numeric results carry measurement evidence. Boolean results are decisions. Unless stated otherwise, arguments are evaluated left-to-right and errors propagate.

## Evidence and optional values

### `status(value: N) -> string`

Returns one of `"exact"`, `"bounded"`, `"unknown"`, or `"unmeasurable"`. The returned status string is exact even when the numeric input is unknown. This function does not accept a whole report, decision, or arbitrary object.

```text
status(metrics.review) in ["bounded", "unknown"]
```

### `isExact(value: N) -> boolean`

Equivalent to checking numeric status for exactness. It is a resolved decision about current evidence, not a request to refine that evidence. It does not throw merely because a value is unmeasurable.

### `lowerBound(value: N) -> N` and `upperBound(value: N) -> N`

Return the justified available endpoint as an exact value of the same numeric type. For an exact input, both return its value. Missing endpoints cause `E_BOUND_UNAVAILABLE`. An evidence note identifies the bound projection; the original value retains its original state.

### `requireExact(value: N) -> N`

Returns the exact input or raises `E_EXACT_REQUIRED`. Use it when inability to establish exactness is an invalid condition for a particular calculation. Strict scalar CLI formatting normally supplies the output requirement without inserting this function into formulas.

### `isMissing(value: Optional<T>) -> boolean`

True for structural absence, false for a known present value including null, unknown when presence itself is unresolved. A declared present T is accepted and produces false. Numeric uncertainty alone does not mean missing.

### `isNull(value: Optional<T>) -> boolean`

True for explicit null, false for missing or known non-null values, unknown when the value could be null. Missing and null remain distinguishable even though `orElse` handles both.

### `requirePresent(value: Optional<T>) -> T`

Raises `E_PRESENT_REQUIRED` for missing, null, or unresolved presence. It does not require a numeric T to be exact. It is useful before string/path helpers.

### `orElse(value: Optional<T>, fallback: T) -> T`

Returns the known present non-null value, or evaluates and returns the fallback for missing/null. Fallback evaluation is lazy. Unresolved presence returns an unknown joined value without evaluating fallback. Numeric unknown and unmeasurable inputs are present values and are returned unchanged.

## Numeric helpers

### `abs(value: N) -> N`

Absolute value. Exact integer input remains integer. A bounded interval crossing zero has lower bound zero and upper bound the greater endpoint magnitude. Other intervals map by sign. Unmeasurable propagates. Applicable unknown input retains nonnegative standing.

### `floor(value: N) -> integer` and `ceil(value: N) -> integer`

Round toward negative or positive infinity. The result must be a safe integer. Exact out-of-range input is `E_NUMERIC_OVERFLOW`; a bounded domain that could exceed the integer range is `E_POSSIBLE_DOMAIN`. Map interval endpoints monotonically. Neither operation is an exactness assertion: a rounded interval can remain bounded or collapse to exact.

### `round(value: N, digits: integer) -> float`

Not part of version 1. It is listed here as deliberately absent because decimal rounding policy is not silently delegated to a host-language convenience method. Use integral weights or explicit `floor`/`ceil` arithmetic with understood binary64 consequences. An unknown function named `round` fails binding.

## Collection operations

### `filter(items: C<T>, predicate: (T) -> boolean) -> C<T>`

Retains true entries, excludes false entries, and marks unknown entries possible. Existing possible membership stays possible. Preserves source order and remainder evidence. Predicate evaluation is once per observed entry in order.

### `map(items: C<T>, selector: (T) -> U) -> C<U>`

Projects every observed entry while preserving membership and order. Optional results remain entries. U may be a record or another collection; nested collections do not auto-flatten. Errors on reached possible entries propagate.

### `any(items: C<T>, predicate: (T) -> boolean) -> boolean`

True after a definite true witness; false only when every admissible member definitely fails and no unresolved remainder can match. Complete empty input is false. Short-circuits at a decisive witness.

### `all(items: C<T>, predicate: (T) -> boolean) -> boolean`

False after a definite false witness; true only when every admissible member passes. Complete empty input is true. Unseen or possible entries can leave the result unknown. Short-circuits at a decisive counterexample.

### `count(items: C<T>) -> integer`

Counts collection membership, including entries whose projected value is missing. Exact, bounded, or unknown according to membership/cardinality evidence. Complete empty input is exact zero.

### `sum(items: C<N>) -> N`
### `sum(items: C<T>, selector: (T) -> N) -> N`

Sums in stable input order. Complete empty input returns exact integer zero. Possible members contribute a domain that includes zero. Supported primitive correlations survive selector projection and aggregation. Unmeasurable selected contributions are not ignored.

### `min(items: C<N>) -> Optional<N>`
### `min(items: C<T>, selector: (T) -> N) -> Optional<N>`
### `max(items: C<N>) -> Optional<N>`
### `max(items: C<T>, selector: (T) -> N) -> Optional<N>`

Return an extremum, missing for definitely empty input, or uncertain optional presence when empty and nonempty outcomes are both possible. With definite members, lower/upper extrema use the conservative collection rules. Unseen values do not become invisible. Exact key ties have no effect on the numeric result.

These functions take a collection, not varargs. Use `max([a, b])` for two numbers. This leaves one consistent aggregation vocabulary.

### `avg(items: C<N>) -> Optional<float>`
### `avg(items: C<T>, selector: (T) -> N) -> Optional<float>`

Computes the selected sum divided by selected count when non-emptiness is proven. Complete empty input is missing; uncertain emptiness has unresolved optional presence. Incomplete value evidence remains unresolved even when count is exact.

### `sortBy(items: C<T>, key: (T) -> K [, direction: string]) -> C<T>`

K is present numeric, string, or boolean, with one compatible type. Direction is the exact literal `"asc"` or `"desc"`; default `"asc"`. Stable for equal keys. Unknown/unmeasurable numeric keys retain items and mark order unresolved; missing keys are rejected unless handled by the author. Sorting is budgeted, including key extraction and comparisons.

### `take(items: C<T>, count: integer) -> C<T>`

Count must be exact and nonnegative. Zero returns an exact complete empty collection. An uncertain source order or membership may make the selected prefix unresolved. It is not a “take the observed items and ignore the rest” operation.

### `certain(items: C<T>) -> C<T>`

Returns only definite observed members, excluding unseen remainder and possible observed membership, with an explicit `DEFINITE_OBSERVED_ONLY` evidence note. This makes an intentionally narrower complete collection. It is never inserted by default shortcuts or output formatting.

## String and path helpers

### `startsWith(text: string, prefix: string) -> boolean`
### `endsWith(text: string, suffix: string) -> boolean`
### `contains(text: string, fragment: string) -> boolean`

Case-sensitive literal comparisons with no regex or glob expansion. Empty prefix, suffix, or fragment matches. Unknown string operands produce unknown decisions. Missing/null operands require explicit handling.

### `length(text: string) -> integer`

Counts Unicode scalar values, not UTF-16 code units, bytes, grapheme clusters, or display columns. An empty string has length zero. Use `count` for a collection. Source spans intentionally use a different UTF-16 coordinate convention because they map to TypeScript source tooling.

### `glob(path: string, pattern: string) -> boolean`

Matches the entire normalized path using `diffdevil-glob/1`. A literal pattern is validated at compile time; a typed parameter pattern is validated when evaluated. Malformed patterns are `E_GLOB_PATTERN`, not false. This function does not consult the filesystem.

### `pathMatches(file: File, pattern: string) -> boolean`

Checks the current path and, for a rename, the old path. Equivalent to any matching available endpoint, not just the destination. Pattern validation matches `glob`. A missing old path is normal and does not make the result unknown.

## Membership operator

`value in collection` is strict scalar membership, not a function overload for substring or dictionary keys. Integer/float comparisons use numeric promotion; other types must match. A definite equal value proves true. With no definite match, possible members or unknown comparable values can leave membership unknown. A complete exact empty collection gives false.

```text
f.changeType in ["added", "renamed"]
```

Use `contains` for substrings and named schema fields for records. There is no dynamic object-key existence operator; declared optional fields use `isMissing`.

## Deliberately absent facilities

Version 1 does not include regex matching, dates, time, randomness, locale functions, recursive reducers, string-to-number coercion, arbitrary conversion to JavaScript, environment lookup, filesystem operations, external data fetches, dynamic imports, or user-defined function registration.

Hosts bind typed parameters before evaluation instead of assembling source text. A consumer can calculate additional facts in its own program and pass normalized declared data; that code remains outside detail and its portability/security guarantee.

## Errors and discovery

Unknown functions, wrong arity, invalid lambda positions, incompatible types, unsupported overloads, and invalid literal-only options are compile diagnostics. Reached domain failures and input-dependent invalid patterns are evaluation diagnostics. Resource exhaustion is always an error.

`diffdevil schema --kind language` and the TypeScript symbol catalog expose these signatures for editors and agents. Documentation and completion should derive from the same signature catalog, but the semantic descriptions above remain human-readable normative rules rather than generated fragments pretending to explain themselves.
