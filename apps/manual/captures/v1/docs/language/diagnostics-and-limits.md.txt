# Diagnostics, deterministic limits, and execution boundaries

## Meaning

This document specifies how detail rejects invalid input, reports useful source positions, bounds work, and separates data evaluation from executable host capabilities. It owns the error and security contract, not a claim that a parser library itself provides a complete sandbox. The accompanying diagnostic and limit catalogs give stable identifiers for implementation and consumers.

## Diagnostic phases

A diagnostic includes a stable `code`, `phase`, `severity`, human-readable `message`, primary source location when available, optional configuration path, related locations, and a bounded set of useful details. Phases are `source`, `config`, `lex`, `parse`, `bind`, `type`, `evaluate`, `format`, `plan`, and `apply`.

Syntax, type, domain, resource, and configuration errors are failures. Evidence reasons such as an incomplete file set are data limitations. They may yield a valid unknown result; they are not automatically parser or evaluation errors.

Examples:

```text
.diffdevil.yml:18:44 E_UNKNOWN_FIELD
metrics.destructive.formula

  totals.lines.deleted + totals.lines.modifed
                                     ^^^^^^^

Unknown field "modifed" on LineMeasurements.
Did you mean "modified"?
```

```text
E_METRIC_CYCLE: review -> weighted -> review
```

```text
E_LIMIT: Expression exceeded its evaluation budget while filtering files.
Expression: queries.largeFiles
Completed result: none
```

A suggestion is advisory text, never an automatic correction. No production parse evaluates a repaired expression.

## Stable codes, not frozen sentences

The [diagnostic catalog](../../src/diffdevil/contracts/detail/v1/diagnostics.json) lists the stable codes selected for version 1. Consumers branch on codes and structured details, not message wording. Messages may improve without changing the meaning of a code.

Unknown field and function diagnostics include the bound subject type and nearby names when a suggestion is unambiguous. Wrong argument counts identify the selected function signatures. Band failures identify the two adjacent cut points or conflicting IDs. Metric cycles identify the dependency path and declaration locations. Invalid patterns report the pattern span, not an arbitrary file that happened to be checked first.

Unexpected internal exceptions become `E_INTERNAL` with a correlation identifier and safe cause information. Do not expose secrets, full unbounded input dumps, or stack traces in normal machine output. Debug logs may contain more detail under explicit host control, still subject to input redaction.

## Coordinates

The canonical range is `{source, start, end}` with zero-based UTF-16 offsets and an exclusive end. Display locations are derived one-based line/column pairs. EOF has a zero-width span at the decoded source length. Unavailable coordinates are omitted, not set to zero or fabricated.

Chevrotain token endpoints are adapted at the parser boundary. Its current major version uses `-1` for unavailable token/CST positions. Do not retain old NaN checks as the only unavailable-position test. See the dated [implementation guide](../reference/2026-09-09/chevrotain-implementation-guide.md) and [C1](../reference/2026-09-09/sources-and-research.md#c1).

YAML expression scalars need two coordinate spaces: decoded expression text and the source YAML token. Escapes, folding, indentation, and aliases can make these different. The loader retains a source map. If exact character mapping is not available, it reports the correct scalar range and explicit `precision: scalar`, plus the accurate decoded-expression offset. It must not display a misleading caret on a guessed source column. Full mapping is the desired release contract and is part of qualification.

For aliases, identify the declaration's primary span and the use site as a related span. Reject duplicate YAML keys and cyclic aliases. Bounded ordinary aliases are allowed; they are data reuse, not code execution.

## Error collection and ordering

Configuration and compilation can return several independent diagnostics in one pass. Order them by source path, start offset, phase order, and code. Cap output to avoid unbounded error floods, and state the number of omitted diagnostics.

Evaluation stops at the first reached fatal error according to source evaluation order. A later decisive boolean cannot erase it. Metric evaluation follows deterministic dependency order. Cache behavior must not change which errors or logical budget outcomes are observed.

All strict machine result modes either validate a semantically complete output first or fail without result data. This is not a promise that an operating system will never interrupt a write midway; transport failures remain transport failures and must not be called valid partial results.

## Limit profile

The initial proposed host profile is `diffdevil-limits/1`:

| Resource | Default |
| --- | ---: |
| Expression UTF-8 source bytes | 65,536 |
| Expression tokens | 32,768 |
| AST nodes | 16,384 |
| Syntactic nesting | 64 |
| Decoded individual string bytes | 65,536 |
| Config bytes | 1,048,576 |
| Expanded YAML aliases | 100 |
| Per-expression work units | 10,000,000 |
| Whole-policy work units | 100,000,000 |
| Materialized query result bytes | 67,108,864 |
| Returned diagnostics | 100 |

These constants are proposed defaults, not benchmark-derived performance claims. A trusted host can choose larger budgets for real large workloads. A policy or expression cannot raise its own limits. The semantic language version and chosen host limit profile are recorded separately.

Source acquisition has its own byte/file constraints and provenance; language limits do not pretend that a provider returned all files. A source adapter reaching a provider limit records incomplete evidence or source failure according to its acquisition contract, not `false` in a predicate.

## Work accounting

Charge a deterministic operation schedule rather than elapsed wall time:

- one unit per visited expression node and bound primitive operation;
- one unit per observed collection entry reached, in addition to its predicate/selector work;
- string comparison/matching units proportional to inspected Unicode scalar characters;
- glob work per visited pattern/path matching state;
- sorting comparisons plus key extraction;
- created record fields and collection entries;
- serialized result bytes in fixed-size chunks.

The catalog defines the exact unit schedule. Short-circuited subtrees consume no evaluation work. Parsing and binding have their own size/nesting protection and must not do unbounded computation before a runtime budget exists.

Metrics are evaluated once per request under a deterministic dependency graph. Result reuse charges the documented logical reference cost, independent of whether a physical cache happened to be warm. An implementation may optimize execution without changing the logical charge trace. Changing the charge schedule belongs to a limit-profile revision.

Nested collection operations are legal. Their multiplicative work is charged. A million-by-million comparison is not allowed to run indefinitely merely because each primitive is harmless. Production systems such as Kubernetes use deterministic CEL cost budgeting; our chosen budget values remain product-specific proposals. See [K1](../reference/2026-09-09/sources-and-research.md#k1).

## Parser and matcher complexity

Use Chevrotain's validated deterministic grammar with bounded lookahead. Do not enable general backtracking to hide grammar ambiguity. Left-factor common prefixes and resolve the lambda-vs-expression argument with bounded lookahead. Limit nesting during parsing, not after a stack overflow.

Token patterns must not admit catastrophic backtracking. Strings can use a small linear scanner through the custom-token interface. Number/identifier/punctuation patterns remain bounded simple forms. Validate malformed string escapes and numeric boundaries explicitly.

Glob matching uses the fixed pattern grammar and bounded state exploration or dynamic programming. No caller-supplied regular expression reaches a host regex engine. Charge state visits and bound the pattern length. Do not turn `**` into a potentially explosive unbounded backtracking regex and call the result safe.

## Inert input boundary

The evaluator accepts normalized data, not arbitrary JavaScript instances. Schema-bound property access uses internal record slots or safe own-data maps. It never traverses prototypes, invokes getters, calls `toString`, reads host methods, or coerces objects to primitives.

Serialized JSON/YAML is validated and normalized. A TypeScript host is responsible for code already running in its process; detail is not a process sandbox against a malicious caller with arbitrary JavaScript execution. The API should make inert input construction easy and reject accessors/prototypes at untrusted-data boundaries where those can arrive.

Forbidden keys, frozen records, and schema checks supplement this design. They are not substitutes for it.

## No ambient capabilities

There is no expression route to `eval`, `new Function`, shell execution, filesystem reads/writes, network calls, environment variables, timers, randomness, dynamic imports, reflection, or user-provided JavaScript callbacks. Standard-library dispatch resolves only fixed internal operation identifiers.

A parser generated or configured from trusted product source is not the same as executing user expression text. This implementation selects Chevrotain rather than a user-supplied grammar. Fixed JSON Schemas may be compiled into standalone validators at build time; user schemas are not dynamically compiled during evaluation. See [J1](../reference/2026-09-09/sources-and-research.md#j1).

## Effects and hostile inputs

Diff content, file names, and provider patch strings are data. Apply-mode policy must come from a trusted selected source. An attacker-controlled `.diffdevil.yml` from a PR head cannot silently become privileged bot policy.

The pure evaluator renders plans; the provider adapter performs only known operations. Validate all semantic conflicts before the first write. Reconcile ambiguous writes before retrying non-idempotent comment creation. Re-read current target identity before effect application, and do not claim atomically transactional GitHub behavior where the provider does not offer it.

No hash proves authorization. A hash can bind the bytes of a report, policy, and plan to one another, but trusted transport or fresh acquisition is still required when those bytes influence privileged effects.

## Release qualification

The implementation must qualify malicious syntax, large/deep input, malformed numbers and strings, prototype-oriented names, extreme intervals, nested collections, hostile path patterns, YAML aliases, source mapping, strict output, and privileged policy loading. The supplied conformance files preserve expected cases; they do not certify a runtime that has not been built.
