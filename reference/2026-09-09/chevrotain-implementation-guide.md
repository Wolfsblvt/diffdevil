# Chevrotain implementation guide: September 9, 2026

## Meaning

This dated guide gives the local implementer a concrete route from the selected detail grammar to a maintainable Chevrotain lexer/parser, binder, evaluator, and shared shortcut integration. It preserves implementation reasoning, pitfalls, and proof boundaries that would be expensive to reconstruct. It is advice for this design cut, not a current work queue or a claim that the parser has been implemented.

The durable [parser architecture](../../docs/language/parser-architecture.md), [syntax](../../docs/language/syntax.md), and [semantic reference](../../docs/language/types-and-measurements.md) own the resulting contract. This guide proposes how to build it, not another grammar.

## Before writing source

Read the actual repository's root instructions, manifests, existing parser/evaluator code, tests, and build entry points. This package did not inspect that repository. Reuse coherent existing work instead of adding a parallel implementation under these suggested paths.

Resolve the package's schema URNs locally. Confirm that the chosen Node/TypeScript/module configuration can import the pinned Chevrotain release and bundle it for the Action. The current documentation reviewed here identifies Chevrotain 13.2.0, published August 1, 2026; its current packaging is officially ESM. This is a qualified starting candidate, not an instruction to ignore a later security patch or established compatible repository lockfile. See [C1](sources-and-research.md#c1).

Do not implement all semantics inside a parser callback because the first arithmetic example makes that easy. The numeric and collection domains are the valuable product behavior; their tests must not require a Git checkout or a GitHub token.

## 1. Establish the trusted catalogs and source types

Create immutable token/operator/function catalogs from the assets. Give standard-library functions internal IDs, declared arities/overloads, allowed binder positions, type rules, and evaluation strategies. Documentation/completion can derive signatures from that catalog; prose semantics stay in their maintained guide.

Define one source abstraction with original text, decoded text, source name, and optional origin map. Use UTF-16 half-open spans in the public diagnostic boundary. Token-specific inclusive endpoints are converted in one place. Keep raw literal spelling for errors and number-kind classification.

Define AST types before the visitor and separate them from Chevrotain types. A `Member` stores the object, decoded literal key, and key span. A `Call` stores a bare name, name span, and ordered arguments. A record stores an ordered array of key/value fields so duplicate keys can be diagnosed before object construction. Never use a JavaScript object literal as the parser's record accumulator before forbidden/duplicate key checks.

## 2. Lexer construction

The finite token vocabulary needs whitespace, identifier, number, string, keywords, punctuation, and operators. Define `Identifier` before keyword construction so each keyword can name it as its longer alternative, while placing keyword token types before Identifier in the actual token array.

Put multi-character operators before their prefixes. `=>` must be distinct from comparison syntax; `>=`, `<=`, `==`, and `!=` precede one-character forms. There is no assignment `=` token. A lone ampersand or vertical bar is invalid, not an implicit boolean operator.

Use full position tracking. Mark skipped whitespace as line-breaking. String scanning rejects raw line breaks rather than treating them as a multiline token. Production lexical recovery is disabled; after a lexer error the compiler returns diagnostics and never evaluates the remaining tokens.

### Numbers

Classify the literal from spelling before converting. A decimal point or exponent yields float. Pure digits yield integer and must be checked against the safe range from exact digits, for example with a bounded digit comparison or trusted internal BigInt conversion. BigInt may be an implementation aid; it is not a public language type or JSON output.

Use a boundary-aware scanner or equivalent post-token validation for `01`, `1e`, `1.`, and numeric text immediately followed by an identifier continuation. They should receive the selected numeric-literal diagnostic rather than be silently tokenized into several acceptable pieces. `1 - -2` is valid unary subtraction composition; negative literals are not a special token.

For floats, reject non-finite conversion and preserve the exact binary64 result. Do not parse all configuration numbers through an unsafe JavaScript Number before discovering that an integer was too large.

### Strings

A linear custom matcher is appropriate: inspect quote, advance through valid scalar/escape sequences, close at the matching quote, and report an unterminated or invalid-escape span. It must return no match only when the current character is not its opening quote; malformed opened strings should receive deliberate diagnostics rather than expensive regex fallback.

Decode `\uXXXX` pairs explicitly, rejecting lone surrogates. Keep decoded values and raw ranges. Reject unsupported escapes such as `\x41` and backtick interpolation. Literal `${{ ... }}` text remains literal to detail; host workflow expansion is separate.

Chevrotain's custom matcher interface supplies the extension point; the scanner and its errors are our design. See [C4](sources-and-research.md#c4). Do not copy a generic string regex with unexamined catastrophic backtracking.

## 3. CST grammar

Use `CstParser` rather than embedding evaluation actions. Define one method per EBNF production and call `performSelfAnalysis()` after rules are constructed. Use an entry rule that consumes expression and EOF. Keep grammar validation enabled in development/build qualification.

Start with bounded lookahead of two where needed. The ordinary binary precedence rules are iterative left-associative chains. Equality and comparison use at most one optional operator. Unary signs recurse or collect a bounded prefix sequence. The ternary recurses right-associatively.

### Left-factor identifier-led syntax

A primary beginning with Identifier can be a reference or a bare-name function call. Consume the identifier once, then optionally parse call suffix. Member suffixes apply afterward. This makes method calls impossible syntactically because a member suffix does not introduce a subsequent call suffix.

At a call argument, `Identifier` followed by `Arrow` selects a lambda; otherwise select expression. Use the corresponding bounded lookahead/gate only at that earned ambiguity. A lambda is syntactically legal there even if the function later rejects that argument position; the binder owns that rule.

Bracket member access consumes a String token only. Numeric indexes and dynamic property expressions are not accidentally inherited from a JavaScript parser.

### Avoid recovery leakage

Set production parser recovery off. A parser exception, error list, inserted token, or recovered node produces no executable program. A separate editor entry point can use tolerant parsing and partial results under a type that cannot be passed to the evaluator.

Do not use `BACKTRACK`, global ignored ambiguities, or a large lookahead setting to make a flawed grammar pass initialization. The selected grammar is small enough to left-factor deliberately. Chevrotain's parser and grammar-error guides explain the relevant toolkit mechanisms; our selected rules remain in the EBNF. See [C3](sources-and-research.md#c3).

### Bound parser nesting before stack overflow

A post-parse depth walk is insufficient. Enforce token/source limits before parsing, and maintain a guarded nesting counter around recursive grammar boundaries or an equivalent pre-parse delimiter/unary-depth check plus parser protection. Decrement in a finally-safe path after parse errors. Test many unary prefixes as well as deeply nested parentheses/lists/conditionals.

Do not classify parser-stack exhaustion as ordinary unknown evidence. Return the selected size/limit diagnostic with no program.

## 4. CST-to-AST visitor

Use a visitor with explicit handlers rather than the default permissive traversal for semantic construction. Call the toolkit's visitor validation for required handlers. Its documentation and changelog differ on historical redundant-method checking; current code should not rely on redundant-method rejection. The changelog records that check's removal. See [C1](sources-and-research.md#c1) and [C2](sources-and-research.md#c2).

CST child collections are arrays. Map repeated children explicitly; a `visit(array)` convenience does not imply visiting every entry. Build binary chains in written order, not by collecting operator kinds and accidentally reordering mixed `+`/`-` operations.

Retain the `?`/`:` region and branch spans for conditional diagnostics. Preserve decoded record keys before checking duplicates. Keep a clear error for malformed visitor context rather than constructing a partial AST with undefined children.

For current Chevrotain 13 positions, adapt `-1` unavailable locations. An empty optional grammar node may not have a useful span. Derive an honest enclosing span or omit unavailable coordinates; do not convert `-1` into position zero. EOF errors should target the actual decoded-source end.

Discard the CST after AST construction unless an editor/explanation consumer explicitly needs it. A compiled program should not retain all token objects and source duplication accidentally.

## 5. Binding and type checking

Build the environment schema from validated report shape, named metrics/scopes/bands, declared parameters, and the expression context. Resolve names to stable internal slots. Property keys resolve to schema members, not arbitrary object lookup at runtime.

Resolve functions from the fixed catalog and validate binder positions before trying to type-check a lambda as a normal argument. Bind lambda parameters in lexical scopes; reject root/built-in/outer-local shadowing. Retain access to outer locals for nested collection predicates.

Type checking must handle numeric promotion, strict booleans, comparable scalar types, homogeneous collections, records, optional presence, and compatible ternary branches. The supported direct optional guard patterns need their own tests; do not infer arbitrary propositions with a hidden theorem engine.

Metrics require present numeric results. Conditions require boolean. Queries accept all supported values. Bind both branches of short-circuit and ternary expressions even when one is a constant dead branch. A missing symbol is not allowed to hide there.

Collect metric references from bound nodes. Build and validate the complete dependency graph independently of runtime branch selection. A cycle diagnostic should show the actual cycle and all declaration locations needed to fix it.

## 6. Numeric domain implementation

Keep exact integer, exact float, interval, unknown constraints, and unmeasurable state in one typed numeric module. Validate type/evidence separately. Normalize singleton intervals to exact and reject inconsistent source bounds.

Exact operations are checked in source order. For intervals, implement the documented conservative arithmetic and domain checks. A denominator interval crossing zero is a possible-domain failure. Remainder uses the specified conservative integer sign/magnitude bound, not a guessed real remainder formula.

### Primitive affine families

For a text family with exact raw A and D but unavailable pairing, represent M in `[0,min(A,D)]`; map added to `A-M`, deleted to `D-M`, modified to M, and changed to `A+D-M`. Preserve that bounded integer affine form through the documented operations and named metric references.

For complete edit blocks, M may already be exact. Aggregate forms by file-family identity, preserving independent variables. Never merge families based only on equal path strings from different comparisons or scopes.

At each reached operation, evaluate operands, verify domain validity, then derive the supported normalized result. Do not reassociate authored intermediate operations to hide an overflow. Do not derive `unmeasurable - unmeasurable = 0`. Unsupported transforms deliberately fall back to the interval representation; the precision profile is part of semantics.

Test the important identity using the bounded +60/-10 fixture: deleted-only plus modified is exact 10. Test different families with equal ranges to ensure they do not cancel. Test saved-report reconstruction against corrupted primitive evidence.

### Property qualification

For tiny A and D, enumerate every admissible M, calculate exact concrete expressions, and compare those answers with abstract bounds and decisions. The enumeration is a genuinely independent oracle for a limited world, unlike running the same abstract evaluator twice. Include negative coefficients, multiple files, and safe-range boundaries.

## 7. Collection-domain implementation

Do not represent every collection as a bare array. A small immutable structure should retain observed entries, definite/possible membership, unseen count bounds, and known/unknown order. Preserve evidence through map/filter and output encoding.

For filter, false removes, true preserves input membership, and unknown produces possible membership. For any/all, only definite witnesses can immediately settle true/false respectively. Evaluate in order and short-circuit; errors already encountered are not absorbed.

Count intersects definite/optional/remainder bounds with any justified total-cardinality constraint. Keep that constraint through sort/map and derive min(count,n) through take, as specified in the collection manual. Sum adds every mandatory contribution and the hull of zero with each optional contribution. Negative optional values are essential regression cases.

For min with certain non-emptiness, the lower bound is the least possible selected value among mandatory/optional entries; the upper bound is the least upper bound among mandatory entries, or the greatest admissible chosen upper bound when all entries are optional but non-emptiness is externally proven. Max is dual. Unknown unseen value domains generally prevent finite exact extrema. If emptiness remains possible, return unresolved optional presence instead of selecting a value.

Average with proven positive count uses conservative sum/count interval division, retaining the fact that uncertainty remains. It may be looser than a world-enumerating answer; that is the selected fallback. A possibly empty collection yields an unknown optional float, not `0` or a present unknown number.

Sort/take are membership-sensitive. Unknown keys or unseen entries can alter the prefix. The straightforward correct first implementation retains unresolved ordering/membership rather than inventing precise ranks. Complete ordinary exact collections still support normal sorting and taking. `certain` is the explicit observed-only escape, with an evidence note.

## 8. Bands and policy compilation

Compile presets into ordinary policy data first, then apply documented overrides and validate references. Keep provenance pointing to preset, config, and invocation input. Do not accidentally evaluate the default size rule in a generated single-threshold Action that selects a different policy shape.

Bands are cut-point structures. Validate increasing thresholds and the final tail before evaluating values. Resolve from domain containment, including a one-sided lower bound that proves the infinite tail. Unknown is a result state, not the last numeric range.

Resolve all rule decisions and desired effects before provider writes. Held rules retain prior managed state. Detect conflicts across groups/labels rather than allowing the last YAML rule to win. Template compilation is a separate scanner/lookup stage; no full detail evaluator is embedded in placeholders.

## 9. Shortcuts and adapter seams

Construct shortcut AST nodes directly. Bind numeric threshold and path data without concatenation into source. Synthetic spans should refer to `--threshold`, `with.metric`, or the relevant config property. Pretty-printing an equivalent expression is useful for explanation but not necessary for execution.

Parity tests compare shortcut and handwritten expression results over the exact, bounded, incomplete, and unmeasurable fixtures. Include outputs/exits, not only numeric values. A shorthand that outputs paths must preserve the same uncertain membership as a full query.

Before strict output, fully validate the selected result and budget. A long path list must not print a valid-looking prefix before discovering an unknown final member. Use bounded memory or a controlled temporary spool if needed. Broken-pipe handling is separate transport behavior.

Qualify actual Bash and PowerShell launch paths, including npm-generated Windows shims. Do not claim PowerShell support based on a direct node invocation alone. Typed parameters and expression files are the robust complex-input path.

## 10. Validation and editor support

Use fixed Draft 2020-12 schemas for structure. Ajv standalone generation at build time avoids runtime schema compilation for shipped schemas. Do not enable coercion, removeAdditional, or default filling that silently changes policy. Validate the function/shortcut catalog consistency too.

The YAML loader should retain document nodes/source tokens. `keepSourceTokens` and line counters are helpful mechanisms, but mapping decoded folded/quoted scalars to source is owned work. Test CRLF, tabs where valid, quote escapes, folded blank lines, aliases, and Unicode before claiming exact carets.

Expose parser/checker APIs and a symbol/signature catalog for editors. A language server can reuse them later. Do not build a second type checker in the editor or make editor recovery a precondition for a functioning CLI.

## 11. Proof sequence without shrinking the destination

A coherent implementation sequence is syntax and static checking, then exact numeric/boolean evaluation, then bounded evidence and primitive correlation, then uncertain collections and bands, then policy/shortcut parity, then CLI/Action boundaries. This is a sequence through the selected full contract, not a redefinition of the product as “exact arithmetic only.”

Each step must make unsupported behavior explicit. An intermediate implementation must reject an unsupported construct/state rather than silently coerce it. Public release claims should enumerate supported profiles/features honestly; the mature documentation preserves the accepted horizon.

A root verification command should run the cheap pure contract suite routinely. Provider writes and multi-shell integration need separate focused qualification. Do not create a network fixture for every arithmetic case or a test quota that rewards repeated setup.

## 12. Acceptance evidence for the implementation cut

The local implementation should produce evidence of grammar self-analysis, production no-recovery behavior, token/AST/span fixtures, binder/type failures, evidence arithmetic, correlation soundness, collection uncertainty, band boundaries, shortcut parity, schema validation, YAML mapping, API declaration/consumer smoke, strict stdout/exits, and actual CLI launcher transport.

For the Action, separately qualify missing-label creation, preservation of existing metadata, assignment reconciliation, unrelated-label preservation, no default comments, insufficient permissions, stale head rejection, trusted config loading, and retry/readback after ambiguous provider responses. These require actual adapter behavior, not a parser test.

Performance evidence should distinguish cold initialization, parsing, binding, evaluation, report allocation, and bundling. This package supplies no measured latency, throughput, memory, or bundle-size promise. Calibrate budgets against real and adversarial workloads without making a timing gate the semantic truth.

## Stop conditions and uncertainty

If implementation finds a genuine contradiction among grammar, docs, schemas, or cases, preserve the exact conflict and reconcile the affected contract. Do not reopen settled defaults merely because a parser API takes a different shape. Conversely, do not defend an unsound evidence rule because it was written confidently in a reference.

This guide was written from current primary documentation and the selected design, without installing or executing Chevrotain in the product repository. The package's own qualification record states the asset checks that actually ran. The guide's acceptance list is future implementation evidence, not a claim that those checks passed here.
