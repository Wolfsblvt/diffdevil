# detail parser and evaluation architecture

## Meaning

This document defines the durable implementation boundaries for detail: Chevrotain lexing/CST parsing, a typed AST, binding and checking, a pure evaluator, and shared shortcut lowering. It separates the current architectural decision from the dated implementation sequence. The language grammar and semantics remain independent of a particular Chevrotain release.

## Pipeline

```text
trusted built-in preset ─┐
structured CLI shortcut ─┼─> normalized policy / generated AST ─┐
structured YAML policy ─┘                                    │
                                                             v
expression source -> lexer -> CST parser -> AST -> binder/type checker
                                                   -> bound program
                                                   -> evidence evaluator
                                                   -> result / policy plan
```

Source adapters produce a normalized report independently. The evaluator reads that report and explicit parameters. Effect adapters consume plans independently. No parser method performs Git or GitHub work.

## Why Chevrotain

Chevrotain is the selected parser toolkit. Its ordinary TypeScript/JavaScript grammar code and explicit CST/visitor boundary fit a testable, extensible implementation and existing maintainer familiarity. No material requirement here makes Peggy a better product choice. The earlier Peggy recommendation is superseded, not retained as a second engine.

The selection does not outsource the language's types, numeric evidence, collection semantics, or security to Chevrotain. Those are diffdevil-owned contracts. Relevant toolkit sources are recorded in [Research](../reference/2026-09-09/sources-and-research.md#c2).

## Lexer

The token catalog is finite. Whitespace is skipped with accurate line tracking. Multi-character operators precede their prefixes: `=>`, `>=`, `<=`, `==`, `!=`, `&&`, and `||` cannot be broken into shorter operators. Keywords use identifier-aware matching so `inside` is not `in` followed by a name.

Retain the original source and token spans. Literal decoding validates numeric domains and string escapes before a semantic value can be created. Tokens themselves contain source text and positions, not evaluated host objects.

A production lexer has recovery disabled. If it reports an error, do not parse the remaining token stream as an executable expression. An editor may use a distinct tolerant route to display diagnostics and suggestions.

## CST parser

Use `CstParser`, one rule per grammar production, bounded lookahead, full location tracking, and an explicit entry rule consuming EOF. The parser performs self-analysis after its rules are defined. Grammar self-analysis belongs to parser construction, not every expression.

Left-factor identifier-led primaries into a reference or a bare-name call. Member suffixes then apply to the resulting primary. At an argument boundary, `Identifier Arrow` selects a lambda; otherwise parse an ordinary expression. Do not add arbitrary lookahead/backtracking when two-token lookahead settles the distinction.

The parser recognizes syntax only. Whether a function exists, a lambda is in an allowed position, a record has duplicate keys, or a metric returns a number belongs to later phases.

Production parser recovery is disabled. A recovered CST is never bound for evaluation. Editor assistance can produce partial trees under a separate result type without a path into the executable compiler.

## CST visitor and AST

Use a dedicated visitor to produce immutable AST nodes. Do not evaluate expressions inside grammar rules or bind names while traversing the CST. The AST retains raw and decoded literals, operator spans, member-key spans, argument order, record field order, and binder spans.

Supported node kinds are literal, identifier, member, unary, binary, conditional, call, lambda, list, and record. Parentheses affect spans and precedence but need no semantic node. Lambdas remain internal AST syntax and cannot become runtime values.

Visit repeated CST children explicitly. A convenience `visit` call on an array is not assumed to map every child. Keep visitor coverage checks and AST-shape tests separate so missing handling cannot quietly become an empty value. Toolkit visitor behavior is documented in [C2](../reference/2026-09-09/sources-and-research.md#c2).

The [AST schema](../../src/diffdevil/contracts/detail/v1/ast.schema.json) is an internal contract for construction and tests. It is not a serialized public program format. Parser toolkit nodes and token classes must not leak through the public API.

## Binder and type checker

The binder receives a static environment schema, expression context, fixed function catalog, and configuration symbol declarations. It resolves roots/members to slots, functions to internal IDs, and binders to lexical slots. No string property lookup is deferred to arbitrary runtime objects.

Type checking verifies arithmetic categories, boolean operands, compatible comparison types, optional presence, collection element types, function overloads, result context, and direct optional guards. It returns complete diagnostics before a program is executable.

Metric dependencies are collected from bound references rather than textual name searches. Cycles are rejected before evaluation. Declarations are visible independent of YAML order. Different contexts restrict permitted roots through the environment rather than ad hoc parser changes.

A bound program records result type, semantic profile, source mapping, required inputs, static dependencies, and a deterministic operation tree. It is reusable with compatible report environments. It is immutable and has no provider references.

## Evaluator

Evaluation consumes only bound programs, validated inert report values, typed parameters, and a trusted limit profile. It implements numeric evidence, supported affine correlations, three-valued booleans, optional presence, collection membership/order, and structured results.

Keep numeric-domain logic in a cohesive module. Keep collection operations in another module using that numeric API, not duplicating interval arithmetic inside `sum`, bands, CLI, and Actions. Bands consume the same evidence domain as comparisons.

Evaluation is deterministic by expression order and canonical collection/dependency order. Memoize named metrics once per request; physical caches must not alter logical work accounting or error order. No callbacks to configuration-supplied JavaScript are permitted.

## Shortcut compiler

A shortcut is already structured input. Validate its finite options and construct AST/policy nodes directly using the same internal builders. Do not form a source string with interpolated paths or parameter values and send it through the parser.

The shortcut compiler assigns synthetic source spans that point to the actual CLI argument or Action input. `explain` may pretty-print the equivalent expression, but that printed expression is a presentation, not a second executable source with lost argument provenance.

All shortcut-generated AST passes the same binder and checker. This is what makes an ordinary CLI threshold and the equivalent custom expression semantically identical without requiring basic users to learn detail.

## YAML loading and source maps

Use a document-preserving YAML parser. Retain nodes, source tokens, alias relationships, scalar style, and source ranges. Reject duplicate keys, invalid tags, cyclic aliases, and parse errors before policy compilation. Validate unsafe integer values without first losing precision.

Decoded expression source carries a mapping to YAML characters. Block indentation, folded newlines, quote escapes, and aliases require deliberate tests. Exact error locations are an implementation feature, not something automatically supplied by choosing a parser library. The YAML library's available mechanisms are noted in [Y1](../reference/2026-09-09/sources-and-research.md#y1).

## Module neighborhood

A reasonable source shape is:

```text
src/diffdevil/language/
  tokens.ts
  lexer.ts
  parser.ts
  cst-to-ast.ts
  ast.ts
  source-map.ts
  bind.ts
  types.ts
  functions.ts
  evaluate.ts
  numeric-domain.ts
  collections.ts
  diagnostics.ts
src/diffdevil/policy/
  load.ts
  compile.ts
  presets.ts
  shortcuts.ts
  bands.ts
  evaluate.ts
```

Names are illustrative implementation placement, not mandatory file proliferation. Existing coherent repository modules should be reused. Do not create a plugin registry, universal compiler framework, or separate package merely because the reference has several responsibilities.

## Testing boundaries

Lexer tests assert token images, types, positions, and invalid forms. Parser tests assert precedence/structure and full-input consumption. Binder/type tests assert static decisions without running Git. Evaluator tests use small normalized fixtures with exact expected evidence and errors. Policy tests cover graph cycles, band boundaries, shortcut parity, and effect conflicts. Adapter tests cover shell bytes, workflow inputs, and machine output.

Tests should compare stable codes, spans, AST meaning, and result data, not freeze every sentence of explanatory prose. Property tests can establish invariants such as sound intervals over enumerated small primitive families. Differential tests should compare shorthand and full policy routes, not use the same evaluator twice and call that independent proof.

## Extension boundary

Adding a keyword, operator, function, type, or uncertainty rule changes a language contract, not merely a parser switch. Update grammar/catalogs, checker, evaluator, documentation, and focused conformance cases together. Existing semantic profiles remain stable once released.

Changing Chevrotain versions may affect toolkit APIs, locations, initialization, or bundling, but must not alter existing expression meaning. The dated guide provides a concrete starting version and qualification checklist without making that library version part of the language name.
