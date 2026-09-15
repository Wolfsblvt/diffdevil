# detail: the diffdevil expression language

## Meaning

**detail** is the typed expression language used by diffdevil for custom metric formulas, rule conditions, queries, and boolean checks. It combines familiar arithmetic and collection operations with explicit evidence states, so an incomplete diff cannot silently become an exact answer. This page introduces the language and routes to its complete technical reference.

The language is **optional**. Presets and shortcuts handle ordinary line counts, file counts, thresholds, path selection, and size labels without expressions or a configuration file. This document specifies `diffdevil-expr/1`, a selected design contract rather than a claim of released implementation.

## Start without learning a language

These operations contain no expression source:

```powershell
diffdevil analyze
diffdevil query --metric changed --format value
diffdevil check --metric changed --gt 100
diffdevil check --files any --metric changed --gt 100
diffdevil query --files --metric modified --gt 20 --select path --format lines
```

The same convenience exists in GitHub Actions. The root Action applies the default size-label policy without a configuration file. See [Automation](automation.md) for the complete workflow and [Presets and shortcuts](integration/presets-and-shortcuts.md) for the precise lowering rules.

Use detail when the desired calculation or selection goes beyond those ordinary forms. An advanced expression does not switch to a different measurement engine.

## A first formula

```text
totals.lines.added + totals.lines.deleted + totals.lines.modified
```

This adds three mutually exclusive replacement-aware categories. It is equivalent to the standard fact:

```text
totals.lines.changed
```

Raw churn is different:

```text
totals.raw.added + totals.raw.deleted
```

A three-line replacement has raw additions `3`, raw deletions `3`, raw churn `6`, modified lines `3`, and replacement-aware changed lines `3`. These meanings come from `replacement-lines-v1`, not from the user's expression.

## A first condition

```text
metrics.review >= 100 && totals.files.included >= 5
```

Conditions use comparisons, `&&`, `||`, and `!`. There is no implicit truthiness. A number is not a boolean, a missing field is not zero, and an unknown comparison is not false.

Conditions have three possible decisions: true, false, and unknown. Invalid expressions and operations are errors, not a fourth decision.

## A first query

```text
map(
  filter(files, f => f.included && f.lines.modified > 20),
  f => f.path
)
```

This filters the observed files and returns their paths. The local variable `f` is explicitly bound by `filter` or `map`. There is no hidden “current file” that changes the meaning of an unqualified field name.

A condition with unknown measurement may leave a file's membership unresolved. The JSON result retains that uncertainty. A newline path list is available only when the selected list is fully determined, unless the author explicitly asks for definite observed matches with `certain(...)`.

## Four contexts, one meaning

| Context | Required result | Example |
| --- | --- | --- |
| Metric formula | Numeric measurement | `metrics.review + 2 * metrics.productionReview` |
| Rule condition | Boolean decision | `metrics.review >= 500` |
| CLI query | Any supported data value or selection | `map(scopes.tests.files, f => f.path)` |
| CLI check | Boolean decision | `any(scopes.tests.files, f => f.lines.changed > 100)` |

A formula cannot produce a label or a string. A query can return strings, records, collections, numbers, and decisions. Context restricts the result and visible names, not the interpretation of an operator.

Band definitions and effects are structured YAML rather than embedded expression programs. Comment templates are a separate, deliberately limited substitution format. Neither provides a route to execute code.

## Explicit roots

| Root | Meaning |
| --- | --- |
| `totals.raw` | Raw additions, deletions, and churn over included files. |
| `totals.lines` | Replacement-aware line measurements over included files. |
| `totals.files` | Global observed/completeness-aware file counts. |
| `files` | All observed changed file records, including excluded records. |
| `scopes.<id>.files` | Files selected by that named scope and the effective path policy. |
| `scopes.<id>.totals` | Aggregates over that scope's selected files. |
| `metrics.<id>` | Named numeric measurements. |
| `bands.<id>` | Structured band resolution, including candidate IDs when unresolved. |
| `rules.<id>` | Rule results, available after rule evaluation to queries and templates. |
| `params.<id>` | Explicitly declared typed input values. |
| `measurement` | Overall acquisition/measurement diagnostics. |
| `source` | Read-only identity and comparison metadata. |

Use `totals.lines.changed` for the total, `f.lines.changed` for one file, and `scopes.tests.totals.lines.changed` for a scope. Bare `lines.changed` is not an arbitrary expression. The shorter spelling is a **measure identifier** in structured configuration, where the surrounding fields already select its scope.

## Names and literals

Identifiers are case-sensitive ASCII names such as `review`, `productionReview`, and `f`. Names containing punctuation use a quoted member key:

```text
metrics["production-review"]
```

Numbers use decimal notation. Strings can use either quote style and do not interpolate values:

```text
"src/**"
'src/**'
```

Lists and records are explicit and keep their shape:

```text
["added", "renamed"]
{path: f.path, changed: f.lines.changed}
```

A one-item list is still a list. A missing field in a projection is not silently removed. A record does not become an executable object.

## Evidence is part of the value

```text
status(metrics.review) == "bounded"
isExact(metrics.review)
upperBound(metrics.review) < 100
```

For a value proven to lie between 60 and 70 inclusive:

```text
metrics.review >= 50     // explanation only: true
metrics.review >= 65     // explanation only: unknown
metrics.review > 100     // explanation only: false
```

The annotations above are explanatory, not valid detail comments. Expression version 1 has no comment syntax. Put explanations in YAML comments, Markdown, or nearby configuration fields.

`upperBound` selects a proven bound; it does not make the original measurement exact. `requireExact` fails when the measurement is not exact. The normal scalar CLI output already requires exactness, so ordinary users need not call it themselves.

## Beyond the basics

The reference is intentionally split by the question being answered:

| Read | To understand |
| --- | --- |
| [Syntax](language/syntax.md) | Tokens, precedence, grammar, literals, binding, and invalid forms. |
| [Types and measurements](language/types-and-measurements.md) | Numeric arithmetic, uncertainty, correlation, missing/null, and decisions. |
| [Collections and scopes](language/collections-and-scopes.md) | Filtering, aggregation, incomplete enumeration, order, paths, and renames. |
| [Standard library](language/standard-library.md) | Every function signature and its result/error behavior. |
| [Policies and bands](language/policies-and-bands.md) | Configuration compilation, metric graphs, bands, rules, and effects. |
| [Diagnostics and limits](language/diagnostics-and-limits.md) | Error phases, source positions, deterministic cost, and security. |
| [Parser architecture](language/parser-architecture.md) | Chevrotain, CST/AST/bound-program boundaries, and testing seams. |
| [Versioning and interchange](language/versioning-and-interchange.md) | Saved reports, result encoding, compatibility, and migration. |

The [grammar](../src/diffdevil/contracts/detail/v1/grammar.ebnf), [catalogs](../src/diffdevil/contracts/detail/v1/README.md), and [conformance cases](../src/diffdevil/contracts/detail/v1/conformance/README.md) provide implementable companion assets. They do not require end users to understand parser internals.

## Design limits

There are no statements, assignments, recursive functions, imports, network operations, shell commands, file reads, regular-expression execution, JavaScript callbacks, or dynamic member lookup. Ordinary functional collection operations are available, but their work is charged to an evaluation budget.

These limits preserve a portable diff-policy language. They do not limit which source adapters or GitHub effects the host product can offer outside the evaluator.
