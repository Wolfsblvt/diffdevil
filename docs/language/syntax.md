# detail syntax

## Meaning

This document defines the source syntax of `diffdevil-expr/1`: lexical forms, expression structure, operator precedence, member access, binders, and static syntactic restrictions. Its companion [EBNF](../../spec/detail/v1/grammar.ebnf) is the grammar asset. Runtime evidence, arithmetic, and collection behavior live in their separate references rather than being implicit parser behavior.

## Source unit and character model

A source unit contains exactly one expression followed by end of input. Leading and trailing whitespace are permitted. The parser must consume EOF; successfully parsing a prefix is not success.

Files are UTF-8. The host may remove one UTF-8 BOM at the beginning while retaining an offset mapping. A BOM inside expression content is not whitespace. Source offsets use zero-based UTF-16 code units because this is the TypeScript-facing source-coordinate contract. End offsets are exclusive. Display lines and columns are one-based; columns count UTF-16 code units, not terminal display cells.

Accepted whitespace is space, horizontal tab, carriage return, and line feed. CRLF is one display line break. Other Unicode characters may occur inside strings but are not invisible identifier or whitespace alternatives. This keeps copied configuration unambiguous.

There is no comment syntax. `//` and `/* ... */` are invalid. YAML comments outside the expression scalar remain YAML comments, not language input. A `.ddexpr` file contains the expression itself, not YAML or Markdown fences.

## Identifiers and reserved words

Identifiers match `[A-Za-z_][A-Za-z0-9_]*`. Matching is case-sensitive. The keywords are `true`, `false`, `null`, and `in`.

Keywords match complete identifiers. `inside`, `trueValue`, and `nullCount` are identifiers, not a keyword followed by another token. The lexer uses an identifier alternative for these prefixes.

Reserved words may appear as quoted record keys or member keys:

```text
{"in": 1}["in"]
```

All language-visible object keys reject `__proto__`, `prototype`, and `constructor`. This is defense in depth; the evaluator still uses schema-bound inert values rather than JavaScript property traversal. A forbidden key receives `E_FORBIDDEN_NAME`, not a mysterious missing-field error.

Names declared by a configuration must be unique within their namespace. A metric and scope may share an ID because `metrics.review` and `scopes.review` are explicit different roots. A lambda variable may not shadow a root, built-in function, or active outer lambda variable.

## Numbers

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

## Strings

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

## Operators and precedence

Higher rows bind more tightly:

| Level | Operators/forms | Associativity |
| --- | --- | --- |
| 9 | Primary and member access | Member chain left-to-right |
| 8 | Unary `!`, `+`, `-` | Right-to-left |
| 7 | `*`, `/`, `%` | Left-to-right |
| 6 | `+`, `-` | Left-to-right |
| 5 | `<`, `<=`, `>`, `>=`, `in` | Non-associative |
| 4 | `==`, `!=` | Non-associative |
| 3 | `&&` | Left-to-right, short-circuit |
| 2 | `||` | Left-to-right, short-circuit |
| 1 | `condition ? yes : no` | Right-associative |

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

## Property access

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

## Calls and lambda binders

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

## Lists and records

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

## Conditional expressions

Both branches must have compatible static types. Integer and float promote to float. Two record branches must have the same keys with pairwise compatible types. Collection branches must have compatible item types. An optional value can unify with its present type or null as described in the type reference.

The condition must be boolean. Only the selected branch is evaluated for a known decision. An unknown condition produces an unknown value of the joined result type; it does not evaluate both branches or choose an apparently harmless one. Every branch is nevertheless parsed, bound, and type-checked.

## Complete grammar and AST contract

The [EBNF](../../spec/detail/v1/grammar.ebnf) defines the grammar independently of Chevrotain's implementation DSL. The [AST schema](../../spec/detail/v1/ast.schema.json) defines the implementation-facing syntax model used by binder and conformance tests. It is not a public persisted-program format.

The parser may preserve redundant parentheses as source spans without adding a semantic node. It must retain operator locations, decoded literals plus raw spelling, call and argument spans, member-key spans, record field order, and binder declarations. These are needed for source-positioned errors and explanations.

## Syntax is not the sandbox

A valid AST is not executable until names, context, types, built-in signatures, and resource constraints have been checked. A parsed property named `constructor`, an unknown function, a lambda in a normal argument, and a query returning a record where a metric requires a number all fail before evaluation.

Parser recovery exists only for editor assistance. Production compilation rejects every lexer or parser error and does not evaluate recovered or partially parsed trees.
