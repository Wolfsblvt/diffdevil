# detail language

Use detail when named facts and shortcuts no longer express your question. This is
one substantial reference with stable sections, not a requirement to learn a language
before using diffdevil. The [policy progression](../../policy/from-measurements-to-rules/README.md)
starts with ordinary queries and complete files.

## Minimal expression

```sh
npx diffdevil query --diff-file docs/examples/diffs/review.diff --no-config --expr 'totals.lines.changed + totals.raw.churn' --format value
```

With the complete [payments diff](../../../examples/diffs/review.diff) this returns
26: ten Changed plus sixteen raw churn. The arithmetic is a demonstration, not a
new standard measurement. The complete [rules policy](../../../examples/policies/story/rules.yml)
shows the same language inside scoped metric, band, query and condition declarations.
Expression files use `.ddexpr`, UTF-8 and one complete expression. Library input can
also retain `{text, language: 'diffdevil-expr/1', name}`.

## Syntax and source locations

### Source unit and character model

A source unit contains exactly one expression followed by end of input. Leading and trailing whitespace are permitted. The parser must consume EOF; successfully parsing a prefix is not success.

Files are UTF-8. The host may remove one UTF-8 BOM at the beginning while retaining an offset mapping. A BOM inside expression content is not whitespace. Source offsets use zero-based UTF-16 code units because this is the TypeScript-facing source-coordinate contract. End offsets are exclusive. Display lines and columns are one-based; columns count UTF-16 code units, not terminal display cells.

Accepted whitespace is space, horizontal tab, carriage return, and line feed. CRLF is one display line break. Other Unicode characters may occur inside strings but are not invisible identifier or whitespace alternatives. This keeps copied configuration unambiguous.

There is no comment syntax. `//` and `/* ... */` are invalid. YAML comments outside the expression scalar remain YAML comments, not language input. A `.ddexpr` file contains the expression itself, not YAML or Markdown fences.

### Identifiers and reserved words

Identifiers match `[A-Za-z_][A-Za-z0-9_]*`. Matching is case-sensitive. The keywords are `true`, `false`, `null`, and `in`.

Keywords match complete identifiers. `inside`, `trueValue`, and `nullCount` are identifiers, not a keyword followed by another token. The lexer uses an identifier alternative for these prefixes.

Reserved words may appear as quoted record keys or member keys:

```text
{"in": 1}["in"]
```

All language-visible object keys reject `__proto__`, `prototype`, and `constructor`. This is defense in depth; the evaluator still uses schema-bound inert values rather than JavaScript property traversal. A forbidden key receives `E_FORBIDDEN_NAME`, not a mysterious missing-field error.

Names declared by a configuration must be unique within their namespace. A metric and scope may share an ID because `metrics.review` and `scopes.review` are explicit different roots. A lambda variable may not shadow a root, built-in function, or active outer lambda variable.

### Numbers

The unsigned lexical form is:

```text
(0 | [1-9][0-9]*) ('.' [0-9]+)? ([eE] [+-]? [0-9]+)?
```

A leading sign is an operator, not part of the number token. These are valid:

```text
0
42
0.5
12.75
1e3
2.5E-2
-100
```

These are invalid:

```text
01
.5
1.
0x10
1_000
NaN
Infinity
```

`NaN` and `Infinity` lex as names and fail binding; they are not numeric literals. A malformed number such as `01` must not be accepted as two adjacent valid numbers. The lexical/parse result is an error even if a prefix was valid.

A literal with no decimal point or exponent is an integer. A literal containing either is a float, even when its mathematical value is integral. Integer literals are range-checked from their digits before converting to a JavaScript number. Unary minus permits the full symmetric safe-integer domain; neither endpoint requires an exceptional unsigned literal.

### Strings

Both quote styles produce the same string type:

```text
"src/**"
'src/**'
```

Supported escapes are `\\`, `\/`, `\'`, `\"`, `\b`, `\f`, `\n`, `\r`, `\t`, and `\uXXXX`. A Unicode escape must contain four hexadecimal digits. A surrogate escape must form a valid pair; lone surrogates are rejected. Raw source strings likewise contain valid Unicode scalar values.

Raw line breaks and unescaped control characters U+0000 through U+001F are invalid inside strings. A decoded string may contain an escaped line break, which later affects whether it can be printed as one line. Backticks, interpolation, multiline string literals, `\xNN`, and brace-form Unicode escapes are not part of version 1.

Quotes do not trigger evaluation:

```text
"${{ github.ref }}"
"{{ metrics.review }}"
```

Both are literal strings from detail's perspective. A surrounding GitHub workflow processor can still evaluate its own syntax before diffdevil receives the input. Host quoting is a separate boundary.

### Operators and precedence

Higher rows bind more tightly:


Examples:

```text
1 + 2 * 3                 # explanatory result: 7
(1 + 2) * 3               # explanatory result: 9
10 - 3 - 2                # explanatory result: 5
true ? 1 : false ? 2 : 3   # equivalent to true ? 1 : (false ? 2 : 3)
```

The `#` annotations above are explanatory, not expression source.

A comparison or equality level accepts at most one operator. `0 < x < 100` and `a == b == c` are invalid. Write `0 < x && x < 100`. Parentheses can make a comparison's boolean result an explicit operand where the type checker permits it.

There is no exponentiation, bitwise arithmetic, assignment, increment/decrement, `===`, null-coalescing operator, optional chaining, or pipe operator. `==` is already strict typed equality. `%` is integer remainder, not percentage syntax.

### Property access

```text
totals.lines.changed
metrics["production-review"]
map(files, f => {path: f.path})
```

Dot access takes an identifier. Bracket access takes a **literal string**, not an arbitrary expression or array index. Resolve access against the static record schema. Unknown fields fail compilation. Dynamic lookup and JavaScript prototypes are inaccessible.

A returned record may be accessed when its type is known:

```text
{count: totals.files.included}.count
```

There are no member function calls. `f.path.startsWith("src/")` is invalid; use `startsWith(f.path, "src/")`. There is no callable-value syntax such as `(someExpression)(argument)`.

### Calls and lambda binders

A call begins with a bare function identifier:

```text
sum(scopes.tests.files, f => f.lines.changed)
```

The function name must resolve to the fixed built-in catalog for this language version. Overloads are selected statically by arity and argument types. Functions are not ordinary values.

A lambda has exactly one unparenthesized parameter and one expression body:

```text
f => f.lines.changed
```

It is accepted only in the declared binder argument of a collection operation. These are invalid:

```text
f => f.path                   # no top-level lambda values
map(files, (f) => f.path)      # unsupported binder spelling
map(files, (a, b) => a.path)   # no multi-parameter binder
[ f => f.path ]               # no stored functions
call(params.functionName)     # no dynamic dispatch
```

Nested binders may read outer bound values, but cannot shadow their names:

```text
any(files, outer => any(scopes.tests.files, inner => outer.path == inner.path))
```

This is finite but potentially quadratic. It is allowed and budgeted, not assumed cheap because the grammar has no explicit loops.

### Lists and records

Lists use square brackets, records use braces, and record fields use a colon. Trailing commas are not accepted in version 1.

```text
[]
[1, 2, 3]
["added", "deleted"]
{}
{path: f.path, changed: f.lines.changed}
{"previous-path": f.oldPath}
```

List elements must have one compatible static type; integer and float elements can promote to numeric. Empty lists acquire their element type from context or remain `never` until used. Mixed arbitrary arrays are rejected rather than becoming untyped JSON containers.

Record field names are unique after decoding. `{a: 1, "a": 2}` is an error. Fields can have different types. Record values are evaluated in written field order. Records do not have methods, a prototype, or setters.

The parser can accept a structurally valid record before binding reports duplicate or forbidden names. This distinction is preserved in diagnostics and conformance cases.

### Conditional expressions

Both branches must have compatible static types. Integer and float promote to float. Two record branches must have the same keys with pairwise compatible types. Collection branches must have compatible item types. An optional value can unify with its present type or null as described in the type reference.

The condition must be boolean. Only the selected branch is evaluated for a known decision. An unknown condition produces an unknown value of the joined result type; it does not evaluate both branches or choose an apparently harmless one. Every branch is nevertheless parsed, bound, and type-checked.

### Complete grammar and AST contract

The [EBNF](../../../../src/diffdevil/contracts/detail/v1/grammar.ebnf) defines the grammar independently of Chevrotain's implementation DSL. The [AST schema](../../../../src/diffdevil/contracts/detail/v1/ast.schema.json) defines the implementation-facing syntax model used by binder and conformance tests. It is not a public persisted-program format.

The parser may preserve redundant parentheses as source spans without adding a semantic node. It must retain operator locations, decoded literals plus raw spelling, call and argument spans, member-key spans, record field order, and binder declarations. These are needed for source-positioned errors and explanations.

### Syntax is not the sandbox

A valid AST is not executable until names, context, types, built-in signatures, and resource constraints have been checked. A parsed property named `constructor`, an unknown function, a lambda in a normal argument, and a query returning a record where a metric requires a number all fail before evaluation.

Production compilation rejects every lexer or parser error and does not evaluate recovered or partially parsed trees. No editor recovery capability is claimed by that production contract.

## Values, types and measurements

### Static types and runtime evidence

The static types are `integer`, `float`, `boolean`, `string`, `null`, records with named fields, homogeneous collections, and optional versions of those types. `number` in a signature means either integer or float. An empty collection has element type `never` until a surrounding operation supplies a type.

Evidence is not a replacement for type. An unknown integer is still an integer; an unmeasurable line count is not a string error message. A boolean whose truth cannot be established is still a boolean decision. A record may contain both exact and unresolved fields without making its known path unavailable.

Record compatibility is structural with explicit keys. There is no `any` type that disables checking. Inputs added by a TypeScript host have a declared schema and inert values, not arbitrary host objects.

### Numeric domains

Integers lie in the exact range `-9007199254740991` through `9007199254740991`. Raw and replacement-aware counts are nonnegative integers. Count limits are verified before conversion or arithmetic can lose precision.

Floats are finite IEEE-754 binary64 values. A decimal point or exponent in a literal selects float. `/` returns float. Mixing integer and float promotes to float. `+`, `-`, and `*` on integers remain integer and are checked for overflow. `%` accepts integers only and returns the remainder after division truncated toward zero, so `-5 % 3` is `-2`.

Reject non-finite results and unsafe integer literals. Normalize negative zero to zero in observable values. Floating underflow follows binary64 behavior. No hidden tolerance is added to equality, thresholds, or band boundaries.

The safe-integer boundary and numeric representation follow ECMAScript's numeric model; the prohibition on unsafe counts and the evidence rules here are diffdevil design choices.

“Exact” means one determined value under this model. It does not mean arbitrary-precision decimal or real arithmetic. For example, `0.1 + 0.2 == 0.3` is false under the selected float model. For exact integral policy weighting, prefer `3 * metrics.source + metrics.tests` over unnecessary decimal factors.

### Numeric evidence states

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

### Structural absence, null, uncertainty, and errors

**Missing** means an optional structural field is absent. A normal non-renamed file may have no `oldPath`. This is expected data, not incomplete measurement.

**Null** is an explicitly supplied null value. It may be present in typed parameters or query records; it is not a numeric fallback.

**Unknown** means relevant evidence is insufficient. It is not the absence of a report field. A missing required field, misspelled name, unsupported report state, or invalid configuration is an error.

**Unmeasurable** means the measurement does not apply. Counting an included binary modification as zero would change the question rather than resolve it.

**Error** means the operation or input is invalid, including syntax, type, division by zero, inconsistent evidence, and exhausted limits. Errors carry diagnostics and abort the affected evaluation; they are not values users can compare to a number.

There is no automatic conversion from missing, null, unknown, or unmeasurable to `0`, `false`, `""`, or an empty collection.

### Optional values and guards

`isMissing(x)` and `isNull(x)` inspect structural state. `orElse(x, fallback)` substitutes only for missing or null. Its fallback is evaluated lazily. It does not substitute for a numeric unknown or unmeasurable value.

```text
orElse(f.oldPath, f.path)
```

A field that may be absent cannot be passed directly to a function requiring a present string. Use `orElse` or `requirePresent`.

The checker may narrow an immutable optional field within the immediate true branch of `!isMissing(x) && !isNull(x)` and its following `&&` expression. The mandatory version-1 narrowing patterns are these direct guards on the same bound symbol/member identity; general logical implication inference is not required. Ternary true branches inherit those same direct guards. A helper remains the portable clear choice for more elaborate conditions.

If presence itself is unresolved, neither `isMissing` nor `isNull` fabricates certainty. `orElse` returns an unknown value of its joined result type without evaluating the fallback. Optional aggregate results use this state when a collection might be empty.

### Arithmetic over intervals

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

### Primitive correlations

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

### Numeric comparisons

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

### Boolean algebra and evaluation order

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

### Conditional values

For `condition ? yes : no`, evaluate only the selected branch when the condition is resolved. When the condition is unknown, return an unknown value of the compatible result type without evaluating either branch. This deliberately avoids speculative branch errors and implementation-dependent proof attempts.

A configuration compiler still validates both branch types and dependencies. A metric cycle is not permitted just because a branch is usually false.

### Explicit projections and requirements

`status(number)` reports its numeric evidence state as an exact string. `isExact(number)` reports whether it is exact. `lowerBound` and `upperBound` select an available justified bound as an exact number and retain provenance identifying the projection. Unavailable bounds fail with `E_BOUND_UNAVAILABLE`.

`requireExact(number)` returns its exact numeric value or fails with `E_EXACT_REQUIRED`. `requirePresent(optional)` requires structural presence and non-null, but does not require numeric exactness. These are distinct assertions.

A policy can deliberately branch on status and select a fallback value. Such a fallback is authored policy, and explanations must identify it. The evaluator never supplies it invisibly.

### Deterministic evidence and diagnostics

Reasons use stable codes with optional source/file references. Multiple reasons are deduplicated by code and subject, then ordered by canonical subject order. Do not put stack traces, dates, locale-dependent strings, or unstable object IDs in the semantic result.

Errors report the smallest relevant expression span plus related operand/declaration locations. A bound projection, explicit partial collection, or status-based fallback is evidence about how the result was obtained, not a warning that can be discarded before a plan is saved.

### File-counter population

`totals.files.total` counts all changed files in the comparison. `included` and `excluded` partition that population according to effective global path policy. All other standard file counters, including change-type, binary, and unmeasurable counters, describe **included** files. This prevents an excluded generated file from reappearing in an ordinary threshold through a secondary counter. Per-file queries can deliberately inspect the full observed `files` collection.

Within a named scope, `included` describes the scope's selected population, and subtype counters use the same population. Scope totals do not expose global `total`/`excluded` counters; `scope.fileSet.total` is the wire-level selection cardinality. Scope completeness is independent of whether zero observed files happened to match. A consumer must preserve each count's evidence when unseen files could change it.

## Operators

Operators below are enumerated from the canonical catalogue. The authored numeric
and decision sections above govern their evidence semantics; a signature alone
cannot explain whether bounds prove a condition. Edit the catalogue, not this island.

<!-- manual:generated detail-operators -->
| Operator | Arity | Arguments | Result | Precedence | Associativity | Lazy |
| --- | --- | --- | --- | --- | --- | --- |
| `!` | 1 | `boolean` | `boolean` | 8 | right | false |
| `+` | 1 | `number` | `number` | 8 | right | false |
| `-` | 1 | `number` | `number` | 8 | right | false |
| `*` | 2 | `number`, `number` | `number` | 7 | left | false |
| `/` | 2 | `number`, `number` | `float` | 7 | left | false |
| `%` | 2 | `integer`, `integer` | `integer` | 7 | left | false |
| `+` | 2 | `number`, `number` | `number` | 6 | left | false |
| `-` | 2 | `number`, `number` | `number` | 6 | left | false |
| `<` | 2 | `ordered-scalar`, `same` | `boolean` | 5 | none | false |
| `<=` | 2 | `ordered-scalar`, `same` | `boolean` | 5 | none | false |
| `>` | 2 | `ordered-scalar`, `same` | `boolean` | 5 | none | false |
| `>=` | 2 | `ordered-scalar`, `same` | `boolean` | 5 | none | false |
| `in` | 2 | `scalar`, `collection<same>` | `boolean` | 5 | none | false |
| `==` | 2 | `scalar`, `compatible-scalar` | `boolean` | 4 | none | false |
| `!=` | 2 | `scalar`, `compatible-scalar` | `boolean` | 4 | none | false |
| `&&` | 2 | `boolean`, `boolean` | `boolean` | 3 | left | true |
| `\|\|` | 2 | `boolean`, `boolean` | `boolean` | 2 | left | true |
| `?:` | 3 | `boolean`, `T`, `T` | `T` | 1 | right | true |
<!-- /manual:generated detail-operators -->

## Collections

### Logical collection model

A collection contains ordered observed entries and an explicit remainder description. Each observed entry has **definite** or **possible** membership. The remainder records whether unseen entries can exist and any justified cardinality bounds. A collection also records whether its output order can be established.

An ordinary list literal is complete, ordered, and has only definite members. The root `files` collection is constructed from observed report files and file-list completeness metadata. The JSON report stores observed file records as a normal array plus `fileSet` metadata; the evaluator presents the richer logical collection.

A report with 100 observed files and a proven total of 120 is not a complete 100-item collection. A report with uncertain selection of an observed file is not the same as an unseen file. Preserve both distinctions in queries and explanations.

### Stable file order

Source adapters normalize observed files into ascending canonical `path`, then `oldPath`, then file ID, using Unicode scalar lexicographic order. IDs are deterministic within a comparison, not random. This canonical order removes provider pagination order from evaluation and floating-point aggregate behavior.

`filter` and `map` preserve source order. `sortBy` is stable for equal keys. A file collection with unseen items may have an unresolved final order because unseen paths could sort before observed paths. The observed order is still useful but must not be represented as the complete global ordering.

### Filtering

```text
filter(files, f => f.included && f.lines.changed > 100)
```

For each observed input entry, evaluate the predicate once in order:

| Input membership | Predicate | Output membership |
| --- | --- | --- |
| definite | true | definite |
| definite | false | absent |
| definite | unknown | possible |
| possible | true | possible |
| possible | false | absent |
| possible | unknown | possible |

An encountered predicate error aborts the query; it does not drop the file. The unseen remainder remains possible unless the compiler can prove the predicate is the literal false expression. Version 1 requires only that syntactic constant case, not arbitrary theorem proving over unseen files.

Filtering does not change the values attached to a retained file. It changes membership. This distinction matters when a later sum includes a potentially selected negative custom metric.

### Mapping

```text
map(scopes.production.files, f => {path: f.path, changed: f.lines.changed})
```

`map` preserves membership, order, and cardinality information. The selector is evaluated for every observed entry, including possible members, in input order. Errors encountered while projecting possible members remain errors. Users can choose `certain(...)` before `map` to narrow the question explicitly.

Optional fields stay optional. A missing `oldPath` is retained as missing in the typed result; it is not silently removed and does not shrink the collection. A singleton result remains a collection. A record field order is its authored order for output, not engine-specific dictionary order.

### Any and all

```text
any(files, f => f.included && f.lines.changed > 100)
all(scopes.tests.files, f => f.lines.changed <= 100)
```

A **definite** member with a true predicate proves `any`; a definite member with a false predicate disproves `all`. Possible members cannot supply those decisive witnesses because they might not belong to the collection.

Without a decisive witness, possible membership, unknown predicates, or unseen entries can leave the result unknown. A complete collection whose members all definitely fail makes `any` false. A complete collection whose members all definitely pass makes `all` true.

For a complete empty collection, `any` is false and `all` is true. Thus “all selected files are small” does not assert that any selected files exist. Add `count(selection) > 0` when non-emptiness matters.

Evaluate in collection order and short-circuit on a decisive witness. A later invalid operation is not evaluated after a witness has settled the result, but an earlier encountered error is not erased. Possible membership still requires evaluation where its predicate may affect the result.

### Count

`count(collection)` measures membership, not the presence of projected scalar values. A mapped missing optional field still occupies an entry.

For a complete collection with `d` definite and `p` possible entries, count is `[d, d+p]`, normalized to exact where equal. Add known unseen count bounds. Without an upper bound for unseen selected items, retain an unknown count with its proven lower bound.

An unfiltered file collection can have an exact count while its paths remain incomplete if a trusted source supplied the total cardinality. Filtering normally loses that exact total unless its selection can be established. Do not make list completeness and cardinality exactness synonyms.

### Sum and numeric aggregation

For complete exact input, numeric aggregation follows canonical input order. Integer sums use checked integer arithmetic; a float selector produces a float accumulation in that order. `sum([])` is exact integer zero.

A definite entry contributes its entire numeric domain. A possible entry contributes the union of zero and that domain, conservatively represented by its interval hull. For a value in `[-10,-5]`, a possible contribution is `[-10,0]`, not `[0,-5]`. Combining contributions uses the numeric arithmetic and supported family-correlation model.

An unmeasurable definite or possible contribution makes the aggregate unmeasurable: the line sum is not defined in worlds where that material is selected. An unseen remainder with applicable but unavailable measurements yields unknown with justified constraints. A nonnegative selector can preserve a lower bound from observed definite contributions.

`min` and `max` return missing on a definitely empty complete collection. When non-emptiness is certain and all item domains are available, use the conservative extremum domain across mandatory/optional entries. The implementation guide defines the reference interval calculation. An incomplete remainder without usable value bounds leaves the extremum unknown. Do not pretend that the largest observed file is necessarily the largest file in the comparison.

`avg` returns missing for a definitely empty complete collection. If the collection may be empty, the result has uncertain optional presence. If count is proven positive, evaluate the sum divided by count with shared selection evidence retained conservatively. Independent interval division may overestimate the range; that is the fixed version-1 fallback, not permission to report a narrower guess.

### Sorting and taking a prefix

```text
take(sortBy(scopes.production.files, f => f.path), 10)
```

`sortBy` accepts present exact numeric, string, or boolean keys of one compatible type. Its optional direction argument is the literal `"asc"` or `"desc"`, default `"asc"`. Boolean order is false before true; string order is locale-independent.

An unknown key does not make the input invalid, but it prevents establishing the sorted order. Preserve entries with unresolved ordering. An unmeasurable numeric key has the same ordering consequence. A missing key is a type/requirement error unless explicitly replaced.

`take` requires an exact nonnegative integer count. Taking zero returns the complete empty collection. Taking a positive prefix requires enough ordering and membership evidence. If possible or unseen entries can change which entries occupy that prefix, preserve that selection uncertainty instead of presenting observed entries as the proven top N.

For ordinary complete collections with only definite entries and exact keys, sort/take produce ordinary complete results. The language does not require advanced users to reason about uncertainty when the evidence is exact.

### Explicit definite-only projection

```text
certain(filter(files, f => f.included && f.lines.changed > 100))
```

`certain` drops possible observed members and all unseen remainder, retaining definite observed entries in their observed order. The returned collection is complete **for that explicitly narrower question** and carries a `DEFINITE_OBSERVED_ONLY` evidence note. It does not claim the original selection was complete.

When the original global order was unresolved, the selected observed entries retain a determinate observed order. Applying `sortBy` afterward sorts those entries only. This makes strict path output possible without hiding what was omitted.

The equivalent shortcut is `--certain`. No default query or effect rule inserts it automatically.

### Included files and scopes

The expression root `files` includes excluded file records so an author can inspect path-policy decisions. Normal shortcuts begin from the included selection. These roots are explicit:

```text
files
filter(files, f => f.included)
scopes.production.files
```

Each file has `included` and an inclusion explanation. `totals.raw` and `totals.lines` aggregate included files only. `totals.files.total` counts all changed files; `included` and `excluded` refer to global policy. Scope totals describe that scope's selected collection, not global acquisition counts.

Scopes have an optional `includeOnly` boundary and additional `exclude` and `forceInclude` patterns. Global policy runs first. A scope selects only globally included files. Its `includeOnly` boundary is then a hard scope boundary; within that boundary, scope `forceInclude` overrides scope exclusions. A scope cannot reintroduce a globally excluded file or pull an unrelated file across its include-only boundary. Change the global policy explicitly when that is intended.

This refines the earlier broad “force include wins” sketch: force inclusion wins inside its own policy layer, not across an unrelated scope definition.

### Path matching profile

`diffdevil-glob/1` is shared by configuration and the functions `glob` and `pathMatches`.

| Form | Meaning |
| --- | --- |
| `*` | Zero or more non-separator Unicode scalar characters. |
| `?` | Exactly one non-separator scalar character. |
| `[abc]` | One listed character. |
| `[a-z]` | One scalar in an ascending range. |
| `[!abc]` | One non-separator character not in the class. |
| `**` as a whole path segment | Zero or more complete path segments. |

Patterns are anchored to the whole repository-relative path. `/` is the only separator. Matching is case-sensitive on every platform. Dotfiles have no special exclusion. `src/**` includes `src/Foo.cs`; `**/*.md` includes root `README.md`. An embedded `ab**cd` segment is invalid rather than having accidental globstar meaning.

Backslash is an ordinary character, not a Windows separator or an escape. Literal wildcard characters use classes, such as `[*]`, `[?]`, and `[[]`. A closing bracket can be listed first in a class. A dash is literal first or last. Reject unterminated classes, descending ranges, empty classes, absolute paths, empty segments, `.`/`..` path segments, brace expansion, extglob, and patterns beginning with standalone negation syntax. Use the `exclude` field for exclusions.

Actual Git paths are not normalized through the host filesystem. Do not change case, resolve symlinks, collapse a literal backslash, or resolve `..` segments. A valid repository path from a source adapter must already meet the normalized path contract; malformed paths are source errors, not globs to repair.

### Renames

For a file rename, `path` is the destination and `oldPath` is the source. For a deletion, `path` is the old path and `oldPath` is absent unless the source describes a meaningful prior endpoint.

`glob(f.path, pattern)` intentionally tests only the selected path. `pathMatches(f, pattern)` returns true when either rename endpoint matches.

For global inclusion, evaluate each available endpoint with global precedence: force-include, then include-only restriction, then exclusion, then default inclusion. The file is included when either endpoint is included. Thus a rename from authored source into excluded generated output does not disappear. Scope selection applies the same any-endpoint principle inside its additional scope boundary.

A pure detected rename contributes zero lines only when content identity is proven. A rename with edits contributes its edit blocks. Path selection never changes the measurement algorithm.

### Strict output boundary

Lossless query JSON retains possible membership, unresolved values, and unseen remainder. Plain scalar, lines, NUL-delimited strings, and plain JSONL records require a determined selected result. They fail with exit `3` instead of emitting an apparently complete partial answer.

The CLI validates a strict result before writing semantic output. Files with newline characters use NUL or JSON. A collection of records is not implicitly joined into a path list. Formatting does not add new evidence.

### Cardinality constraints and deterministic prefix precision

A logical collection may additionally carry a justified `cardinality` measurement for its total selected count. This is distinct from which observed entries belong. It is nonnegative integer evidence and never unmeasurable. The reader intersects it with the lower/upper count derived from definite entries, possible entries, and unseen bounds; an empty intersection is invalid input. `count` returns the intersection, normalized to exact when its endpoints coincide. This allows “exactly one result, identity not yet established” without pretending there are zero known results or two results.

`map` preserves a cardinality constraint. `filter` preserves it only for the syntactic literal-true predicate, sets it to exact zero for literal false, and otherwise recomputes conservative selection bounds. `certain` replaces it with the exact number of retained definite observed items. `sortBy` preserves cardinality, even when the order remains unknown. No helper may keep a stale constraint after changing membership.

For `take(c, n)`, transform the input count interval by `min(count,n)`. Retain this as an output cardinality constraint even when item identity cannot be resolved. For known order with no unseen remainder, an entry at a candidate position is definitely in the prefix when it is definite and the maximum number of preceding selected entries is less than `n`. It is possibly in the prefix when the minimum preceding count is less than `n`. Otherwise omit it. These prefix count bounds use preceding entry memberships without inventing dependencies between their selection predicates.

With unknown global order or an unseen remainder, version 1 conservatively marks all observed candidate entries possible, bounds the unseen prefix contribution by `n`, and retains the transformed total cardinality. If the complete input is proven to contain at most `n` entries, preserve its membership unchanged because the whole collection is selected. `take(c, 0)` is always a complete, known-order empty collection. Do not infer precise ranks for uncertain numeric sort keys in this profile.

For example, two definite records with unresolved ordering have a count of two. Taking one produces two possible identities plus an exact cardinality of one. JSON can represent that result; plain path output cannot choose either record. A subsequent count is exactly one. This is a collection constraint, not a general symbolic relationship solver.

Aggregates may use the resulting proven non-emptiness. The version-1 sum fallback otherwise uses the documented independent optional-contribution hull and may be wider than a cardinality-aware optimizer. That conservative precision is explicit. A later optimizer must not silently alter decisions under an already released semantic profile.

## Functions

In the descriptions below, `C<T>` is a logical collection, `Optional<T>` includes structural absence and null, and `N` is integer or float. Numeric results carry measurement evidence; boolean results carry three-valued decisions. Arguments evaluate left to right and reached errors propagate unless a function explicitly documents lazy evaluation.

The following signatures are exact catalogue data. Their semantics, optional results,
empty-input behavior and deliberate omissions are explained immediately afterward.

<!-- manual:generated detail-functions -->
| Function | Signatures | Evaluation |
| --- | --- | --- |
| `status` | `(number) -> string` | eager |
| `isExact` | `(number) -> boolean` | eager |
| `lowerBound` | `(N:number) -> N` | eager |
| `upperBound` | `(N:number) -> N` | eager |
| `requireExact` | `(N:number) -> N` | eager |
| `isMissing` | `(Optional<T>) -> boolean` | eager |
| `isNull` | `(Optional<T>) -> boolean` | eager |
| `requirePresent` | `(Optional<T>) -> T` | eager |
| `abs` | `(N:number) -> N` | eager |
| `floor` | `(number) -> integer` | eager |
| `ceil` | `(number) -> integer` | eager |
| `orElse` | `(Optional<T>, T) -> T` | lazy-fallback |
| `filter` | `(collection<T>, (T) -> boolean) -> collection<T>` | ordered-binder |
| `map` | `(collection<T>, (T) -> U) -> collection<U>` | ordered-binder |
| `any` | `(collection<T>, (T) -> boolean) -> boolean` | ordered-short-circuit |
| `all` | `(collection<T>, (T) -> boolean) -> boolean` | ordered-short-circuit |
| `count` | `(collection<T>) -> integer` | eager |
| `sum` | `(collection<N:number>) -> N`; `(collection<T>, (T) -> N:number) -> N` | ordered-binder |
| `min` | `(collection<N:number>) -> Optional<N>`; `(collection<T>, (T) -> N:number) -> Optional<N>` | ordered-binder |
| `max` | `(collection<N:number>) -> Optional<N>`; `(collection<T>, (T) -> N:number) -> Optional<N>` | ordered-binder |
| `avg` | `(collection<N:number>) -> Optional<float>`; `(collection<T>, (T) -> N:number) -> Optional<float>` | ordered-binder |
| `sortBy` | `(collection<T>, (T) -> K:present-sort-key) -> collection<T>`; `(collection<T>, (T) -> K:present-sort-key, "asc"\|"desc") -> collection<T>` | ordered-binder |
| `take` | `(collection<T>, exact-nonnegative-integer) -> collection<T>` | eager |
| `certain` | `(collection<T>) -> collection<T>` | eager |
| `startsWith` | `(string, string) -> boolean` | eager |
| `endsWith` | `(string, string) -> boolean` | eager |
| `contains` | `(string, string) -> boolean` | eager |
| `length` | `(string) -> integer` | eager |
| `glob` | `(string, string) -> boolean` | eager |
| `pathMatches` | `(File, string) -> boolean` | eager |
<!-- /manual:generated detail-functions -->

### Evidence and optional values

#### `status(value: N) -> string`

Returns one of `"exact"`, `"bounded"`, `"unknown"`, or `"unmeasurable"`. The returned status string is exact even when the numeric input is unknown. This function does not accept a whole report, decision, or arbitrary object.

```text
status(metrics.review) in ["bounded", "unknown"]
```

#### `isExact(value: N) -> boolean`

Equivalent to checking numeric status for exactness. It is a resolved decision about current evidence, not a request to refine that evidence. It does not throw merely because a value is unmeasurable.

#### `lowerBound(value: N) -> N` and `upperBound(value: N) -> N`

Return the justified available endpoint as an exact value of the same numeric type. For an exact input, both return its value. Missing endpoints cause `E_BOUND_UNAVAILABLE`. An evidence note identifies the bound projection; the original value retains its original state.

#### `requireExact(value: N) -> N`

Returns the exact input or raises `E_EXACT_REQUIRED`. Use it when inability to establish exactness is an invalid condition for a particular calculation. Strict scalar CLI formatting normally supplies the output requirement without inserting this function into formulas.

#### `isMissing(value: Optional<T>) -> boolean`

True for structural absence, false for a known present value including null, unknown when presence itself is unresolved. A declared present T is accepted and produces false. Numeric uncertainty alone does not mean missing.

#### `isNull(value: Optional<T>) -> boolean`

True for explicit null, false for missing or known non-null values, unknown when the value could be null. Missing and null remain distinguishable even though `orElse` handles both.

#### `requirePresent(value: Optional<T>) -> T`

Raises `E_PRESENT_REQUIRED` for missing, null, or unresolved presence. It does not require a numeric T to be exact. It is useful before string/path helpers.

#### `orElse(value: Optional<T>, fallback: T) -> T`

Returns the known present non-null value, or evaluates and returns the fallback for missing/null. Fallback evaluation is lazy. Unresolved presence returns an unknown joined value without evaluating fallback. Numeric unknown and unmeasurable inputs are present values and are returned unchanged.

### Numeric helpers

#### `abs(value: N) -> N`

Absolute value. Exact integer input remains integer. A bounded interval crossing zero has lower bound zero and upper bound the greater endpoint magnitude. Other intervals map by sign. Unmeasurable propagates. Applicable unknown input retains nonnegative standing.

#### `floor(value: N) -> integer` and `ceil(value: N) -> integer`

Round toward negative or positive infinity. The result must be a safe integer. Exact out-of-range input is `E_NUMERIC_OVERFLOW`; a bounded domain that could exceed the integer range is `E_POSSIBLE_DOMAIN`. Map interval endpoints monotonically. Neither operation is an exactness assertion: a rounded interval can remain bounded or collapse to exact.

#### `round(value: N, digits: integer) -> float`

Not part of version 1. It is listed here as deliberately absent because decimal rounding policy is not silently delegated to a host-language convenience method. Use integral weights or explicit `floor`/`ceil` arithmetic with understood binary64 consequences. An unknown function named `round` fails binding.

### Collection operations

#### `filter(items: C<T>, predicate: (T) -> boolean) -> C<T>`

Retains true entries, excludes false entries, and marks unknown entries possible. Existing possible membership stays possible. Preserves source order and remainder evidence. Predicate evaluation is once per observed entry in order.

#### `map(items: C<T>, selector: (T) -> U) -> C<U>`

Projects every observed entry while preserving membership and order. Optional results remain entries. U may be a record or another collection; nested collections do not auto-flatten. Errors on reached possible entries propagate.

#### `any(items: C<T>, predicate: (T) -> boolean) -> boolean`

True after a definite true witness; false only when every admissible member definitely fails and no unresolved remainder can match. Complete empty input is false. Short-circuits at a decisive witness.

#### `all(items: C<T>, predicate: (T) -> boolean) -> boolean`

False after a definite false witness; true only when every admissible member passes. Complete empty input is true. Unseen or possible entries can leave the result unknown. Short-circuits at a decisive counterexample.

#### `count(items: C<T>) -> integer`

Counts collection membership, including entries whose projected value is missing. Exact, bounded, or unknown according to membership/cardinality evidence. Complete empty input is exact zero.

#### `sum(items: C<N>) -> N`
#### `sum(items: C<T>, selector: (T) -> N) -> N`

Sums in stable input order. Complete empty input returns exact integer zero. Possible members contribute a domain that includes zero. Supported primitive correlations survive selector projection and aggregation. Unmeasurable selected contributions are not ignored.

#### `min(items: C<N>) -> Optional<N>`
#### `min(items: C<T>, selector: (T) -> N) -> Optional<N>`
#### `max(items: C<N>) -> Optional<N>`
#### `max(items: C<T>, selector: (T) -> N) -> Optional<N>`

Return an extremum, missing for definitely empty input, or uncertain optional presence when empty and nonempty outcomes are both possible. With definite members, lower/upper extrema use the conservative collection rules. Unseen values do not become invisible. Exact key ties have no effect on the numeric result.

These functions take a collection, not varargs. Use `max([a, b])` for two numbers. This leaves one consistent aggregation vocabulary.

#### `avg(items: C<N>) -> Optional<float>`
#### `avg(items: C<T>, selector: (T) -> N) -> Optional<float>`

Computes the selected sum divided by selected count when non-emptiness is proven. Complete empty input is missing; uncertain emptiness has unresolved optional presence. Incomplete value evidence remains unresolved even when count is exact.

#### `sortBy(items: C<T>, key: (T) -> K [, direction: string]) -> C<T>`

K is present numeric, string, or boolean, with one compatible type. Direction is the exact literal `"asc"` or `"desc"`; default `"asc"`. Stable for equal keys. Unknown/unmeasurable numeric keys retain items and mark order unresolved; missing keys are rejected unless handled by the author. Sorting is budgeted, including key extraction and comparisons.

#### `take(items: C<T>, count: integer) -> C<T>`

Count must be exact and nonnegative. Zero returns an exact complete empty collection. An uncertain source order or membership may make the selected prefix unresolved. It is not a “take the observed items and ignore the rest” operation.

#### `certain(items: C<T>) -> C<T>`

Returns only definite observed members, excluding unseen remainder and possible observed membership, with an explicit `DEFINITE_OBSERVED_ONLY` evidence note. This makes an intentionally narrower complete collection. It is never inserted by default shortcuts or output formatting.

### String and path helpers

#### `startsWith(text: string, prefix: string) -> boolean`
#### `endsWith(text: string, suffix: string) -> boolean`
#### `contains(text: string, fragment: string) -> boolean`

Case-sensitive literal comparisons with no regex or glob expansion. Empty prefix, suffix, or fragment matches. Unknown string operands produce unknown decisions. Missing/null operands require explicit handling.

#### `length(text: string) -> integer`

Counts Unicode scalar values, not UTF-16 code units, bytes, grapheme clusters, or display columns. An empty string has length zero. Use `count` for a collection. Source spans intentionally use a different UTF-16 coordinate convention because they map to TypeScript source tooling.

#### `glob(path: string, pattern: string) -> boolean`

Matches the entire normalized path using `diffdevil-glob/1`. A literal pattern is validated at compile time; a typed parameter pattern is validated when evaluated. Malformed patterns are `E_GLOB_PATTERN`, not false. This function does not consult the filesystem.

#### `pathMatches(file: File, pattern: string) -> boolean`

Checks the current path and, for a rename, the old path. Equivalent to any matching available endpoint, not just the destination. Pattern validation matches `glob`. A missing old path is normal and does not make the result unknown.

### Membership operator

`value in collection` is strict scalar membership, not a function overload for substring or dictionary keys. Integer/float comparisons use numeric promotion; other types must match. A definite equal value proves true. With no definite match, possible members or unknown comparable values can leave membership unknown. A complete exact empty collection gives false.

```text
f.changeType in ["added", "renamed"]
```

Use `contains` for substrings and named schema fields for records. There is no dynamic object-key existence operator; declared optional fields use `isMissing`.

### Deliberately absent facilities

Version 1 does not include regex matching, dates, time, randomness, locale functions, recursive reducers, string-to-number coercion, arbitrary conversion to JavaScript, environment lookup, filesystem operations, external data fetches, dynamic imports, or user-defined function registration.

Hosts bind typed parameters before evaluation instead of assembling source text. A consumer can calculate additional facts in its own program and pass normalized declared data; that code remains outside detail and its portability/security guarantee.

### Errors and discovery

Unknown functions, wrong arity, invalid lambda positions, incompatible types, unsupported overloads, and invalid literal-only options are compile diagnostics. Reached domain failures and input-dependent invalid patterns are evaluation diagnostics. Resource exhaustion is always an error.

`diffdevil schema --kind language` and the TypeScript symbol catalog expose these signatures for editors and agents. Documentation and completion should derive from the same signature catalog, but the semantic descriptions above remain human-readable normative rules rather than generated fragments pretending to explain themselves.

## Shortcuts without expression source

Shortcuts lower typed data to the same checked expression model. They never implement
another arithmetic or uncertainty model. Multiple immediate paths are OR alternatives
and use rename-aware `pathMatches`. A standard metric can be aggregated over that
selection; a named metric already owns its scope. A scope cannot combine with
`--all-files`, and a global acquisition-only counter cannot gain per-file meaning.

Query `--files` is a flag; check `--files any|all` selects a boolean quantifier.
The default file projection is path. Multiple comma-separated projection fields
produce records with canonical keys, not concatenated strings. With a comparator
and no explicit metric, the file predicate uses Changed. Status and numeric comparison
are alternatives, not a combined predicate. A scalar metric query cannot acquire a
comparator by pretending to be a check. `--certain` is applied after filtering and
before projection; it is rejected on shortcut boolean checks because it would silently
narrow the decision. An explicit expression can state that narrower question.

The exact aliases, projection fields and canonical measures below come from their
versioned catalogue; quoted thresholds and paths remain data.

<!-- manual:generated detail-shortcuts -->
[Canonical shortcut contract](../../../../src/diffdevil/contracts/detail/v1/shortcuts.json)

| Alias | Canonical meaning |
| --- | --- |
| `changed` | `lines.changed` |
| `added-only` | `lines.added` |
| `deleted-only` | `lines.deleted` |
| `modified` | `lines.modified` |
| `raw-added` | `raw.added` |
| `raw-deleted` | `raw.deleted` |
| `raw-churn` | `raw.churn` |
| `destructive` | `lines.deleted + lines.modified` |
| `files` | `files.included` |
| `files-added` | `files.added` |
| `files-deleted` | `files.deleted` |
| `files-modified` | `files.modified` |
| `files-renamed` | `files.renamed` |
| `files-copied` | `files.copied` |
| `files-binary` | `files.binary` |
| `files-unmeasurable` | `files.unmeasurable` |

| Projection field | Canonical field |
| --- | --- |
| `path` | `path` |
| `old-path` | `oldPath` |
| `change-type` | `changeType` |
| `changed` | `lines.changed` |
| `modified` | `lines.modified` |
| `added-only` | `lines.added` |
| `deleted-only` | `lines.deleted` |
| `raw-added` | `raw.added` |
| `raw-deleted` | `raw.deleted` |
| `raw-churn` | `raw.churn` |

| Canonical measure ID |
| --- |
| `raw.added` |
| `raw.deleted` |
| `raw.churn` |
| `lines.added` |
| `lines.deleted` |
| `lines.modified` |
| `lines.changed` |
| `files.total` |
| `files.included` |
| `files.excluded` |
| `files.added` |
| `files.deleted` |
| `files.modified` |
| `files.renamed` |
| `files.copied` |
| `files.binary` |
| `files.unmeasurable` |
<!-- /manual:generated detail-shortcuts -->

## Evaluation phases and environment

All names bind against an explicit static environment; there is no implicit current
file. Lambda parameters bind each selected entry. Metrics and bands cannot read later
rule results. Rule conditions can read completed bands, not other rules. Queries and
templates can read completed rules. The CLI's query condition context still uses
query-phase availability while requiring a boolean result.

Configuration is validated as a whole, including unused declarations. Evaluation
then follows the selected operation: analyze computes metrics/bands; rules-phase
evaluation can produce desired operations; query evaluation visits required dependencies.
Errors in reached operands propagate in source order; a later boolean witness cannot
erase an earlier failure. A missing required schema context produces `E_REPORT_CONTEXT`,
not a numeric unknown. Supported formula correlations exist within one request and
are not guessed from saved numeric results.

The inventory retains all environment fields and context roots exactly. A value
available in the schema can still carry unknown evidence.

<!-- manual:generated detail-environment -->
[Canonical environment contract](../../../../src/diffdevil/contracts/detail/v1/environment.json)

### language

| Key / index | Value |
| --- | --- |
| `value` | `diffdevil-expr/1` |

### roots

| Key / index | Value |
| --- | --- |
| `totals` | `Included raw/line aggregates and global file counts` |
| `files` | `Observed all-files logical collection with remainder evidence` |
| `scopes` | `Named scope collections and selected aggregates` |
| `metrics` | `Named numeric measurements` |
| `bands` | `Named band resolution records` |
| `rules` | `Completed rule results, query/template phase only` |
| `params` | `Declared inert typed parameter data` |
| `measurement` | `Overall evidence diagnostics` |
| `source` | `Read-only comparison identity` |

### lineFields

| Key / index | Value |
| --- | --- |
| `0` | `added` |
| `1` | `deleted` |
| `2` | `modified` |
| `3` | `changed` |

### rawFields

| Key / index | Value |
| --- | --- |
| `0` | `added` |
| `1` | `deleted` |
| `2` | `churn` |

### fileFields

| Key / index | Value |
| --- | --- |
| `id` | `string` |
| `path` | `string` |
| `oldPath` | `optional<string>` |
| `changeType` | `string` |
| `kind` | `string` |
| `included` | `boolean` |
| `raw` | `RawMeasurements` |
| `lines` | `LineMeasurements` |
| `measurement` | `MeasurementSummary` |

### changeTypes

| Key / index | Value |
| --- | --- |
| `0` | `added` |
| `1` | `deleted` |
| `2` | `modified` |
| `3` | `renamed` |
| `4` | `copied` |
| `5` | `type-changed` |
| `6` | `unmerged` |

### materialKinds

| Key / index | Value |
| --- | --- |
| `0` | `text` |
| `1` | `binary` |
| `2` | `submodule` |
| `3` | `unknown` |

### fileCounts

| Key / index | Value |
| --- | --- |
| `0` | `total` |
| `1` | `included` |
| `2` | `excluded` |
| `3` | `added` |
| `4` | `deleted` |
| `5` | `modified` |
| `6` | `renamed` |
| `7` | `copied` |
| `8` | `binary` |
| `9` | `unmeasurable` |

### scopeFileCounts

| Key / index | Value |
| --- | --- |
| `0` | `included` |
| `1` | `added` |
| `2` | `deleted` |
| `3` | `modified` |
| `4` | `renamed` |
| `5` | `copied` |
| `6` | `binary` |
| `7` | `unmeasurable` |

### contextRoots

| Key / index | Value |
| --- | --- |
| `metric` | `["totals","files","scopes","metrics","params","measurement","source"]` |
| `band` | `["totals","files","scopes","metrics","params","measurement","source"]` |
| `condition` | `["totals","files","scopes","metrics","bands","params","measurement","source"]` |
| `query` | `["totals","files","scopes","metrics","bands","rules","params","measurement","source"]` |

### stringOrder

| Key / index | Value |
| --- | --- |
| `value` | `Unicode scalar lexicographic; locale independent` |

### noImplicitCurrentFile

| Key / index | Value |
| --- | --- |
| `value` | `true` |
<!-- /manual:generated detail-environment -->

## Diagnostics

Diagnostics identify stable code, phase, severity and message, with an original source
range and configuration pointer when available. Phases distinguish acquisition,
configuration, lexing/parsing, binding, typing, evaluation, formatting, planning and
application. A misspelled field or exhausted budget is an error; incomplete evidence
can be a valid result. Consumers branch on codes/details, never frozen message text.
Suggestions do not repair and execute a different expression.

Ranges are `{source, start, end}` with zero-based UTF-16 offsets and exclusive ends.
Display line and column are one-based, with UTF-16 columns rather than glyph width.
EOF is zero-width at decoded source length. Unavailable positions are omitted.
CRLF is one line break. File/stdin BOM handling preserves original source coordinates.
JSON escapes and YAML folding/indentation/aliases need mappings back to original
source; a scalar-only fallback must declare its precision, never invent a caret.
Alias declaration and use-site locations stay distinct.

Invalid input, numeric overflow, possible domain errors, unavailable bounds,
missing required values, graph cycles and resource failure do not become unknown
values. Error ordering and bounded diagnostics retain useful context without raw
unbounded input dumps. Parser implementation internals and token/CST adaptation
remain in [parser architecture](../../../language/parser-architecture.md), not a
second public parser-construction tutorial.

For an observed failure, use [Troubleshooting](../../help/troubleshooting.md#an-expression-is-rejected) to select a repair by symptom, code and phase, then return to the task.

<!-- manual:generated detail-diagnostics -->
| Code | Phase | Meaning |
| --- | --- | --- |
| `E_SOURCE` | source | Source acquisition or comparison failed. |
| `E_CONFIG` | config | Configuration violates structural or required semantic constraints. |
| `E_CONFIG_CONFLICT` | config | Mutually exclusive authoring paths or conflicting override layers. |
| `E_PARAMETER_REQUIRED` | config | Required declared parameter missing. |
| `E_PARAMETER_TYPE` | config | Binding does not match declared parameter type. |
| `E_LEX_CHARACTER` | lex | Unexpected character. |
| `E_STRING` | lex | Invalid string spelling or escape. |
| `E_NUMBER_LITERAL` | lex | Invalid or unsafe numeric literal. |
| `E_PARSE` | parse | Invalid expression structure or incomplete input. |
| `E_TRAILING_INPUT` | parse | Tokens remain after the complete expression. |
| `E_UNKNOWN_NAME` | bind | Name is not declared in this context. |
| `E_UNKNOWN_FIELD` | bind | Field is not in the bound schema. |
| `E_UNKNOWN_FUNCTION` | bind | Function is not in the versioned catalog. |
| `E_FORBIDDEN_NAME` | bind | Forbidden object key or name. |
| `E_DUPLICATE_FIELD` | bind | Record keys duplicate after decoding. |
| `E_BINDER_POSITION` | bind | Lambda in a non-binder position. |
| `E_SHADOWING` | bind | Lambda shadows a root, builtin, or active outer binding. |
| `E_TYPE` | type | Incompatible operand, collection, branch, or context type. |
| `E_ARITY` | type | Wrong number of arguments. |
| `E_OPTIONAL_VALUE` | type | Optional value requires a presence guard or helper. |
| `E_METRIC_CYCLE` | config | Named metric dependency graph contains a cycle. |
| `E_DIVIDE_ZERO` | evaluate | Exact zero divisor. |
| `E_POSSIBLE_DOMAIN` | evaluate | Some admissible applicable inputs make an operation invalid. |
| `E_NUMERIC_OVERFLOW` | evaluate | Numeric result violates the selected domain. |
| `E_BOUND_UNAVAILABLE` | evaluate | Requested justified endpoint is absent. |
| `E_EXACT_REQUIRED` | evaluate | Explicit exactness requirement not met. |
| `E_PRESENT_REQUIRED` | evaluate | Explicit presence requirement not met. |
| `E_GLOB_PATTERN` | evaluate | Malformed path pattern; literal cases reported at compile time. |
| `E_LIMIT` | evaluate | A selected size, parsing, or evaluation budget was exhausted. |
| `E_BAND_ORDER` | config | Band thresholds not strictly increasing. |
| `E_BAND_IDS` | config | Duplicate band IDs. |
| `E_BAND_OTHERWISE` | config | Missing, duplicate, or misplaced final otherwise. |
| `E_BAND_DOMAIN` | evaluate | Input lies outside the declared band domain. |
| `E_RULE_UNRESOLVED` | plan | Rule requires a resolved result but evidence cannot establish it. |
| `E_EFFECT_CONFLICT` | plan | Incompatible desired operations on the same managed target. |
| `E_TEMPLATE_PLACEHOLDER` | config | Invalid or unknown template placeholder. |
| `E_TEMPLATE_FORMAT` | config | Unsupported template formatter or incompatible type. |
| `E_REPORT_INVALID` | source | Report structure or evidence is inconsistent. |
| `E_REPORT_CONTEXT` | bind | Required policy/environment context is unavailable. |
| `E_VERSION` | source | Unsupported schema or semantic profile. |
| `E_FORMAT_TYPE` | format | Selected result is incompatible with the output format. |
| `E_FORMAT_DELIMITER` | format | Scalar text cannot be represented in selected delimiter format. |
| `E_RESULT_UNRESOLVED` | format | Strict output or decision cannot be established. |
| `E_PLAN_STALE` | apply | Current comparison/provider preconditions differ. |
| `E_PLAN_UNTRUSTED` | apply | Plan/report lacks trusted provenance for the intended privileged effect. |
| `E_PERMISSION` | apply | Provider permission does not allow the selected operation. |
| `E_LABEL_UNAVAILABLE` | apply | Managed label exists but cannot be assigned under current provider standing. |
| `E_PROVIDER` | apply | Provider operation failed or remains unreconciled. |
| `E_IO` | source | Input/output transport failure. |
| `E_INTERNAL` | evaluate | Unexpected implementation failure. |
<!-- /manual:generated detail-diagnostics -->

## Deterministic limits

Limits belong to a trusted host, not a policy that raises its own allowance.
Source bytes/tokens/nodes/nesting, strings/config/aliases, expression and policy
work, serialized output and diagnostic counts are separately bounded. The profile
metadata retains its proposed-default standing; the values are not benchmark claims.
Acquisition limits are separate and cannot manufacture complete provider evidence.

Charge logical operations, observed collection visits, string/glob work, sorting,
record/collection construction and serialization according to the selected schedule.
Short-circuited subtrees consume no evaluation work; caching cannot alter logical
budget outcomes. Nested operations are legal but their multiplicative work is charged.
`E_LIMIT` means failed evaluation without a valid completed result, not a successful
partial calculation. A different host budget and a different language version are
separate identities.

<!-- manual:generated detail-limits -->
[Canonical limits and standing](../../../../src/diffdevil/contracts/detail/v1/limits.json)

| Limit | Value |
| --- | --- |
| `id` | `diffdevil-limits/1` |
| `standing` | `Proposed defaults; calibrate on real workloads before release without changing language meaning.` |
| `expressionBytes` | `65536` |
| `tokens` | `32768` |
| `astNodes` | `16384` |
| `nestingDepth` | `64` |
| `stringBytes` | `65536` |
| `configBytes` | `1048576` |
| `expandedYamlAliases` | `100` |
| `expressionWork` | `10000000` |
| `policyWork` | `100000000` |
| `resultBytes` | `67108864` |
| `diagnostics` | `100` |
| `charges` | `{"astNode":1,"primitiveOperation":1,"collectionEntry":1,"inspectedUnicodeScalar":1,"globState":1,"sortComparison":1,"recordFieldCreated":1,"collectionEntryCreated":1,"serializationChunkBytes":256,"serializationChunk":1,"metricReference":1}` |
| `cachePolicy` | `Logical trace independent of physical cache warmth; named metric evaluated once per request.` |
| `overrides` | `Trusted host only; policy cannot raise own limits` |
| `exhaustionCode` | `E_LIMIT` |
| `exhaustionExit` | `2` |
<!-- /manual:generated detail-limits -->

## Versioning and interchange

The language is `diffdevil-expr/1`, with separately named number, glob, replacement
and limits profiles. Do not silently change operator precedence, optional/unknown
handling, empty aggregates or proof precision within those identities. A computation
becoming a resolved write rather than a hold is observable policy behavior.

Persist source, environment/semantic identities and canonical result evidence, not
parser tokens, CSTs or executable handles. The [schema reference](schemas-and-compatibility.md)
separates report/query/plan envelopes, additive reading, strict execution and current
migration limits. [Troubleshooting](../../help/troubleshooting.md) remains the
symptom-led return path; exact operator/function/diagnostic catalogues are not a
substitute for identifying which stage failed.
