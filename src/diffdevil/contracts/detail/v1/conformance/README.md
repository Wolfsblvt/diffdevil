# detail conformance cases

## Meaning

These cases declare expected version-1 behavior at risk-bearing seams: tokenization/parsing, binding/types, numeric evidence, boolean algebra, incomplete collections, band boundaries, paths, templates, shortcuts, and machine output. They are data for a future test harness. This package does not contain or claim to have executed a detail runtime.

## Harness interpretation

`syntax-valid` checks a complete production parse and root AST kind, not successful binding of arbitrary names. `syntax-invalid` checks the selected primary diagnostic code and phase. `binding-invalid` starts with the named schema and checks the expected static error.

Evaluation and collection cases provide a source, named normalized environment, optional typed bindings, and expected typed value or error. Expected reason objects are **subset assertions on stable codes/subjects**, not exact human wording. Extra justified evidence is allowed; different numeric bounds, membership, result type, or decision are not. `requiredEvidenceCodes` must be found in the returned evidence, including explicit projections.

A value's optional `notes` are evidence, not a second result. Compare collection semantic contents and separately assert required evidence. For overloaded empty aggregates, integer zero/missing are the documented defaults; a surrounding numeric context may promote zero explicitly.

Band cases provide an already evaluated numeric measurement. Band-invalid cases intentionally pass structural schema checks in some cases and must fail relational validation. Shortcut cases assert semantic parity with the listed expression; do not implement the shorthand by evaluating that string with interpolated data.

Path cases call `glob` by default or the named `pathMatches` helper. Invalid patterns are errors, not false. Template cases exercise only substitution, not detail expressions. Machine-output cases compare exact stdout bytes and exit status; diagnostics belong on stderr.

The environment report paths are relative to this file's directory. Fixture source/repository identities are synthetic and carry no mutation authority.

## Additional generated/property tests

Enumerate small raw addition/deletion counts and admissible pairing values. Verify that affine/interval results contain every concrete answer and that a resolved comparison holds for every admissible world. Include separate files to ensure pairing variables do not cancel across unrelated families.

Generate file collections with definite/possible membership and finite small unseen variants. Check any/all witnesses, count bounds, negative optional contributions, uncertain emptiness, sorted prefixes, and explicit `certain` projections. A reference enumeration over tiny worlds is independent of the production abstract evaluator and catches false precision.

Generate expression whitespace variants and valid string escapes while retaining AST meaning. Generate near-valid malformed operator/quote/binder input for source-range diagnostics. Test YAML quoted, literal, folded, CRLF, and alias mapping through the actual loader.

Avoid a test-count quota. Add cases when they preserve a real semantic boundary. Keep pure-language suites free of Git/network setup; use a small number of real adapter tests for shell argument transport and GitHub behavior.

## AST and source-coordinate fixtures

`ast.json` contains complete expected syntax trees for precedence/associativity, including half-open spans. Validate these trees against the AST schema, then have the future parser produce and compare them. Structural validity here is not proof that the parser constructs them.

`source-positions.json` gives anchor offsets in UTF-16 code units. For YAML cases, check both decoded and original ranges through the real scalar loader. A raw `container` is a complete YAML source specimen, not a language expression. These fixtures exercise source-coordinate meaning without fixing human diagnostic wording.

Collection `cardinality` is optional extra evidence about total selection size. Compare its supplied constraints where present, and validate consistency with entry/remainder bounds. A runtime may omit a redundant constraint but must preserve its semantic effect in count, emptiness, and prefix behavior.
