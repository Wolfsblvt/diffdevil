# Sources and research: September 9, 2026

## Meaning

This dated register records the sources behind the language package and separates source-derived facts from selected diffdevil design. It supports the companion decision and implementation documents. It is not a claim that every candidate was installed, benchmarked, security-audited, or tested in the product repository.

External sources below were consulted on September 9, 2026. URLs are provided for durable verification. Statements labeled as design consequence are our recommendation, not claims made by those projects.

## Product sources and public edition

This September 15 public edition retains the external research and its dated
claims below. Exact private conversations and their source manifests remain in
the development archive, not as broken links in public documentation.

**O1: Selected product corrections.** Chevrotain is the parser toolkit; full
language depth is optional for CLI and Action consumers; the root Action supplies
a no-config size-label workflow with no automatic comments.

**O2: Founding design.** The [technical founding record](founding-and-decisions.md)
preserves block-level replacement counting, raw facts, uncertainty, scopes,
portable consumers, plans, effects, and managed ownership. Provisional names and
the earlier no-default-label stance are superseded.

**O3: Branding.** The [canonical reference](../../BRANDING.md) owns lowercase
naming and measurement vocabulary. The dated [branding reconciliation](branding-reconciliation.md)
records the narrow default-preset correction, rather than reopening the brand.

**O4: Language comparison.** The preceding design compared embedded alternatives
and selected structured policy with a constrained uncertainty-aware expression
language. Conversational release claims are not independently verified package
metadata. External facts below retain their original consultation date.

## C1

### Chevrotain release and packaging facts

Primary: [Official changelog](https://chevrotain.io/docs/changes/CHANGELOG.html) and [breaking changes](https://chevrotain.io/docs/changes/BREAKING_CHANGES.html).

Verified facts used here: the current changelog lists 13.2.0 dated August 1, 2026. Version 13 changed unavailable token/CST locations to `-1`. Current packaging is officially ESM. Historical redundant visitor-method checking was removed. The version-12 changelog reports a smaller maintainer minified build after removing lodash; that is not a measured diffdevil bundle.

Design consequence: qualify a pinned 13.2.0-or-later compatible patch with current declarations, handle unavailable coordinates deliberately, and measure our actual packaging rather than repeating upstream benchmark numbers as product performance.

## C2

### CST and visitor behavior

Primary: [Concrete syntax tree guide](https://chevrotain.io/docs/guide/concrete_syntax_tree.html).

The toolkit supports CST traversal with visitors and location information. The visitor convenience for an array does not imply mapping every element. The documentation provides mechanisms for generating/validating visitor structures.

Design consequence: use a separate explicit CST-to-AST visitor, preserve positions, visit repetitions intentionally, and keep evaluation out of grammar rules. Do not rely on historical claims about redundant-method validation that conflict with current changelog evidence.

## C3

### Grammar definition, lookahead, and recovery

Primary: [Parsing tutorial](https://chevrotain.io/docs/tutorial/step2_parsing.html), [grammar error guidance](https://chevrotain.io/docs/guide/resolving_grammar_errors.html), [fault tolerance](https://chevrotain.io/docs/tutorial/step4_fault_tolerance.html), and [initialization performance](https://chevrotain.io/docs/guide/initialization_performance.html).

The toolkit provides grammar methods, self-analysis, bounded lookahead mechanisms, and configurable recovery. These are mechanisms, not a mandate to repair executable policy input.

Design consequence: validated left-factored grammar, self-analysis at construction, production no-recovery, separate editor recovery, and a mandatory EOF entry rule. The selected algorithmic details are owned by this package rather than copied from a tutorial language.

## C4

### Lexical extension points and diagnostics

Primary: [Lexing tutorial](https://chevrotain.io/docs/tutorial/step1_lexing.html), [custom token patterns](https://chevrotain.io/docs/guide/custom_token_patterns.html), [alternative matches](https://chevrotain.io/docs/features/token_alternative_matches.html), and [custom errors](https://chevrotain.io/docs/features/custom_errors.html).

These document token ordering, identifier alternatives, custom token matching, and error-provider extension points.

Design consequence: simple bounded tokens, a linear string scanner where useful, keyword-prefix handling, explicit numeric boundaries, and a diffdevil diagnostic adapter with stable codes. The proposed scanner was not executed in this research.

## C5

### Chevrotain licensing

Primary: [Official repository](https://github.com/chevrotain/chevrotain) and [project-maintained overview](https://github.com/Chevrotain/chevrotain/blob/master/agents.md).

The project identifies Apache-2.0 licensing. Implementation must retain applicable dependency notices in distributed bundles. This register does not select the overall diffdevil repository license or provide legal clearance for a product name. Direct guesses at a LICENSE file URL did not retrieve successfully; the verified claim comes from the official repository metadata/overview, not a successfully fetched license-file body.

## Y1

### YAML source-preserving loading

Primary: [yaml documentation](https://eemeli.org/yaml/) and [YAML 1.2.2 specification](https://yaml.org/spec/1.2.2/).

The yaml package documents document parsing, source-token retention, line counters, integer handling, key uniqueness, and alias limits. YAML quoting and block folding change how source text maps to decoded scalar content.

Design consequence: preserve document/scalar information; reject loader errors and duplicate/cyclic structures; map expression ranges back to source honestly. The detailed decoded-to-original mapper remains implementation work. A parser option alone does not prove exact YAML carets.

## J1

### Standalone schema validation

Primary: [Ajv standalone validation](https://ajv.js.org/standalone.html).

Ajv documents generation of standalone validation modules for fixed schemas.

Design consequence: generate shipped validators at build time if Ajv is chosen; do not dynamically compile untrusted schemas or enable coercions that change authored policy. This is independent of detail's pure expression evaluator.

## S1

### JSON Schema dialect

Primary: [JSON Schema Draft 2020-12](https://json-schema.org/draft/2020-12).

This is the schema dialect selected for the assets. The specific policy/report shapes and relational checks are diffdevil design. Ordinary schema structure does not establish metric graph acyclicity, band ordering across items, evidence consistency, or plan authorization.

## N1

### Numeric model

Primary: [ECMAScript numbers and dates specification](https://tc39.es/ecma262/multipage/numbers-and-dates.html).

The safe-integer boundary and Number's binary64 model support the chosen TypeScript/JSON-facing representation. Rejecting unsafe counts, interval evidence, finite-domain checks, and precision-versioning are our additional contract, not automatic guarantees supplied by a JavaScript `number` annotation.

## P1

### PowerShell native argument transport

Primary: [PowerShell about_Parsing](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_parsing?view=powershell-7.6) and [about_Quoting_Rules](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_quoting_rules?view=powershell-7.6).

Microsoft documents native argument-passing changes beginning in PowerShell 7.3 and special Windows handling for certain executable wrappers, including command scripts.

Design consequence: first-class expression files and typed parameters; qualify actual npm launchers across supported PowerShell versions. This package does not claim that its shell examples were run on Windows.

## B1

### Bash quoting

Primary: [GNU Bash reference manual, maintainer-hosted mirror](https://tiswww.case.edu/php/chet/bash/bashref.html).

Single quotes preserve literal content but cannot directly contain a single quote. Shell expansion and command exit status remain the shell's behavior, not part of detail.

Design consequence: outer-single/inner-double expression examples, explicit nonzero handling, and data parameters rather than source interpolation. The included shell script is an integration specimen for the future CLI, not an evaluated diffdevil command.

## G1

### GitHub labels and permissions

Primary: [REST label endpoints](https://docs.github.com/en/rest/issues/labels).

Current documentation covers shared issue/PR label operations, repository label creation/update, and permitted write scopes. Relevant operations accept Issues-write or Pull-requests-write permission. Existing labels can also have provider standing, such as archived status, that prevents assignment.

Design consequence: the minimal API-only workflow can request pull-request write permission, ensure missing required definitions, and add/remove only managed assignments. A managed archived/unassignable definition is reported honestly; ensure-missing mode does not silently overwrite existing metadata or standing. Explicit definition synchronization can restore configured assignability when deliberately selected.

## G2

### Workflow trust and release pinning

Primary: [GitHub events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows) and [secure use](https://docs.github.com/en/actions/reference/security/secure-use).

The docs distinguish event trust contexts and warn against executing untrusted PR material with privileged credentials. Immutable commit pins provide stronger dependency identity than a moving major tag.

Design consequence: default API-only `pull_request_target` automation, trusted-base policy, no PR-head build in the privileged job, and explicit typed bindings rather than injection into source. `@v1` examples do not claim a real release or pin was created.

## G3

### Action packaging, outputs, and references

Primary: [Metadata syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/metadata-syntax) and [workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax).

The docs support JavaScript Action metadata, declared inputs/outputs, subdirectory Action references, permissions, and current runtime options including Node 24. Outputs have size limits.

Design consequence: root plus sub-actions sharing a bundled implementation, exact scalar companion statuses, compact summary output, and a full report artifact. No size-limit workaround silently truncates a canonical report.

## G4

### GitHub comment operations

Primary: [REST issue-comment endpoints](https://docs.github.com/en/rest/issues/comments).

The API supplies listing/creation/update operations for the shared issue/PR comment surface. Our ownership markers, author checks, lifecycle triggers, retry identities, and no-default-comment policy are product decisions built around that API, not behaviors the provider automatically supplies.

## K1

### Deterministic cost as a production pattern

Primary: [Kubernetes CEL API reference](https://kubernetes.io/docs/reference/using-api/cel/).

Kubernetes documents cost accounting and runtime budgets for CEL. This supports deterministic work budgeting as a credible implementation pattern.

Design consequence: charge AST/collection/string/glob work and whole-policy work. Our exact profile constants remain proposals awaiting workload qualification; they are not Kubernetes constants or measured diffdevil performance.

## Alternative-language research retained

These primary sources support the earlier comparison without turning this package into another selection round:

| Approach | Primary source | Retained finding and design judgment |
| --- | --- | --- |
| CEL | [CEL project](https://cel.dev/) | Designed for embedding and host-provided data. Strongest runner-up. The missing work for our design is the complete measurement/collection evidence domain, not ordinary arithmetic syntax. |
| JSON Logic | [Operations](https://jsonlogic.com/operations.html) | JSON-serializable operators include arithmetic and collections, with its own coercion/truthiness choices. A good generated-rule format; not the selected hand-authored/shell language. |
| Original JMESPath | [Specification](https://jmespath.org/specification.html) | Compact JSON selection with projection/missing-value rules and no general infix arithmetic in that original grammar. Not a natural complete domain-policy contract. |
| JMESPath Community | [Current specification](https://jmespath.site/specification/latest/) | Includes arithmetic extensions. Rejecting it merely for original JMESPath's missing arithmetic would be incorrect; uncertainty/selection semantics still differ from this product's desired contract. |
| JSONata | [Processing model](https://docs.jsonata.org/processing) | Rich transformations and sequence behavior, including shape transformations that are undesirable defaults for stable scalar/collection CLI contracts. More language than this domain requires. |
| jq | [Manual](https://jqlang.org/manual/) | Excellent external JSON transformation/composition tool. Keep reports useful to jq rather than embed a second runtime to make the policy language a jq clone. |

These are fit judgments, not claims that rejected tools are unsafe or unmaintained. The exact newest releases, complete dependency trees, licenses of all transitive alternatives, and bundle costs were not re-audited in this package. The selected Chevrotain path has the current checks described above.

One attempted CEL overview-page fetch timed out; the official project root was retrieved successfully. Failed direct license/path guesses and a package-registry fetch did not become evidence. No failed source is cited as a successful inspection.

## What research does not establish

No independent security audit, performance benchmark, fuzzing campaign, executed Chevrotain grammar, live GitHub workflow, Windows shell test, npm publication, or repository code review was performed. The package qualification file records the structural/declaration/example checks that actually ran.

The mature language contract and new defaults are explicit design decisions informed by these sources and the selected product direction. They are not facts discovered in an upstream library, and upstream documentation cannot override them silently.
