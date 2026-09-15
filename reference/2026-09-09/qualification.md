# Reference package qualification: September 9, 2026

## Meaning

This record states the evidence obtained for the authored detail language reference package. It distinguishes structural/schema/declaration/example checks performed in the sandbox from the Chevrotain implementation and live CLI/Action behavior that have not been exercised. Its purpose is to make the package's reliability and remaining implementation qualification explicit without treating fixture files as completed tests.

## Boundary

The checked subject is the delivered `diffdevil-language-reference-2026-09-09` package. No product repository was cloned, edited, committed, published, or used to execute a parser. No package was published and no GitHub resources, labels, workflows, or comments were changed.

The Python verification used locally available `jsonschema` with Draft 2020-12 and an in-memory schema registry, `ruamel.yaml` with duplicate keys rejected, and ordinary file/text checks. TypeScript declaration checking and Bash syntax checking were separate actual process invocations. Python is not a selected product runtime or required implementation toolchain; it was a disposable authoring check in this sandbox.

## Checks performed

| Check | What it establishes | Result |
| --- | --- | --- |
| JSON parsing | Every supplied JSON asset parses without non-JSON NaN/Infinity constants. | Passed. |
| Schema meta-validation | All six JSON Schemas are valid Draft 2020-12 schema documents. Local URN resolution is configured explicitly. | Passed. |
| YAML loading | Nine YAML examples/preset files parse with duplicate keys rejected. | Passed. |
| Policy structural validation | Four policy examples and the expanded size preset satisfy the supplied policy schema. | Passed. |
| Public artifact validation | Eight report/query/plan examples satisfy their corresponding schemas. | Passed. |
| Expected typed values | Sixty expected values in the semantic fixtures, plus supplied typed bindings, satisfy the typed-value schema. | Passed. |
| AST fixtures | Two expected syntax trees satisfy the internal AST schema, including operator spans. | Passed. |
| Case identity and references | All 189 cases across 14 suites have unique suite-local IDs; named environments and selected diagnostics resolve. | Passed. |
| EBNF symbol references | All references in the 20-production grammar resolve to defined productions or named lexical tokens. | Passed. |
| Number-pattern examples | The catalog regex accepts eight selected valid unsigned spellings and rejects eight selected invalid/signed spellings. | Passed. |
| Source-coordinate anchors | Six coordinate specimens select the intended UTF-16 text ranges; the quoted YAML escape anchor decodes to the expected character. | Passed. |
| Default preset relations | Ordered size cut points, one final tail, unique band IDs, six definitions, non-recursive expanded preset, and no comment effects. | Passed. |
| Exact sample arithmetic | Sixteen replacement/raw invariants plus included-file sums and file counts in the exact report fixture. | Passed. |
| Bounded sample arithmetic | Eleven concrete pairing worlds for raw +60/-10 establish changed bounds 60–70 and deleted-only plus modified equal to 10. | Passed. |
| TypeScript declarations | `tsc --noEmit --strict --target ES2022 --module ESNext --lib ES2022` accepts `public-api.d.ts`. | Passed. |
| Bash script syntax | `bash -n examples/scripts/check.sh` accepts the supplied script. It does not run diffdevil. | Passed. |
| Local documentation links | Relative file targets in authored Markdown resolve. Historical imported payloads are excluded from this check. | Passed. |
| Historical source preservation | Both supplied project attachments match the preserved copies byte-for-byte and match their recorded SHA-256 hashes. | Passed. |

The companion `qualification-results.json` records the actual check inventory and process exit codes. Its file/word counts describe the inspected cut before final inventory packaging, not a promise that an archive inventory and its evidence file have identical self-counts. The original package manifest recorded delivered content hashes, excluding itself. That transport manifest is preserved with the private original; it is not the current repository or npm inventory.

## Checks not performed

**No Chevrotain lexer or parser was installed, implemented, or executed for detail.** Grammar self-analysis, lookahead ambiguity checking, token production, real CST construction, visitor execution, and recovered-tree rejection therefore remain implementation work. A schema-valid expected AST is not a parser-produced AST.

**No detail binder, type checker, interpreter, shortcut compiler, band evaluator, template renderer, or effect planner was executed.** The 189 cases declare expected behavior; they are not 189 passing runtime tests. Independent arithmetic checks cover the named small examples only, not the complete abstract domain or soundness of an unbuilt evaluator.

**No real YAML source-map implementation was executed.** The offset anchors and source specimens were checked as strings; the future loader must produce those mappings and test folded/literal scalars, aliases, CRLF, and escapes through the actual implementation.

**No Windows PowerShell or npm-generated Windows launcher was exercised.** The PowerShell script is authored guidance. Shell portability still needs qualification through the supported native launch paths, including Windows PowerShell 5.1 and the selected PowerShell 7 profile.

**No GitHub workflow was run.** YAML parsing is not Action execution, permission qualification, fork-event behavior, label creation, archived-label handling, assignment readback, comment lifecycle validation, or stale-head protection. The `@v1` workflow references describe the intended future release interface; this package does not prove those release coordinates exist.

**No independent security audit, fuzzing campaign, full dependency audit, bundle benchmark, throughput benchmark, or memory profile was performed.** Resource budgets are a specified mechanism with proposed defaults, not calibrated performance claims. Current upstream documentation informed the design; it is not proof that an implementation is secure.

## Corrections made during package checks

The authored files were reconciled before delivery: relative paths in the spec entry page; destination versus input artifact names in the Action table; explicit result-union handling in API examples; scope/file-counter population wording; declaration fields corresponding to scope `fileSet`; escaped template delimiter behavior; required AST operator spans; and total-cardinality evidence for uncertain collection prefixes.

These corrections are part of this prepared reference revision. The original supplied branding and founding transcript were not edited to match the new decisions. Their supersessions are recorded separately.

## How implementation should consume this evidence

Use the grammar, catalogs, schemas, and fixtures as concrete inputs. Build the Chevrotain self-analysis and semantic test harness around them, then replace “expected behavior” with actual implementation evidence at the real boundary. Preserve pure-language tests independently of Git/provider setup, and qualify shell/GitHub behavior through a focused real adapter path.

The package is a thorough design and implementation reference. It is not a release certification, a passing product test suite, or a hidden claim that the evaluator already exists.
