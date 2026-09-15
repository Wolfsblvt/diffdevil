# Historical detail qualification return

## Meaning

This public evidence edition preserves the substantive detail qualification
return from the pre-Action implementation sequence, as archived before the
September 15, 2026 publication-preparation pass. Counts, commands, limits, and
recommendations below describe that earlier checkpoint, not current standing.
The exact original is preserved privately. Current behavior and proof are in
[Qualification](../../docs/QUALIFICATION.md) and the maintained manuals. Artifact
paths below identify historical local evidence, not downloadable public files.

## Observed environment

Node 22.16.0, npm 10.9.2, Git 2.47.3, TypeScript 5.8.3, Node typings 22.15.33,
and Chevrotain 13.2.0 were used in the Linux container. The complete locked
nine-package dependency closure was restored with `npm ci --offline` from
`artifacts/dependencies/npm-cache`. No live credentials, GitHub effects, remote,
publication, public tag, or licence selection occurred.

## Commands and results

| Boundary | Command | Actual result |
| --- | --- | --- |
| Preparation assets | `npm run check:prep` | 189 declared cases validated as assets. |
| Source/declarations | `npm run build` | Passed with the pinned toolchain. |
| Ordinary suite | `npm test` | **276 passed, 0 failed, 0 skipped.** |
| Supplied conformance | `npm run test:conformance` | **187 passed, 0 failed, 2 not executed; 0 harness failures.** |
| Shortcut comparison | `npm run demo:shortcuts` | Four complete CLI pairs and text-defined formula/named retrieval passed. |
| Packaged consumer | `npm run test:package` | Offline install outside the checkout, CLI bin, source/shortcut queries, BOM expression file, schemas, exports, types and band/template API passed. |
| Windows launchers | npm `cmd-shim` in package test | CMD/PowerShell contents generated and inspected; native execution unobserved. |
| Node 24 Action | Not run | No bundle or runtime qualification yet. |
| Live GitHub | Not run | Outside this assignment. |

Current transcripts are in `artifacts/evidence/final-*.txt`. Per-case observations
are in `artifacts/conformance/results.json`. Package bytes, integrity, file count,
and exercised checks are in `artifacts/package/qualification.json`. An earlier
successful package check does not qualify a subsequently modified tarball.

## Complete supplied conformance cases

The case reporter consumes actual Node test events from production tests. It does
not infer passes from fixture presence, semantic-only AST vectors, or prose.

| Supplied suite | Declared | Passed | Failed | Not executed |
| --- | ---: | ---: | ---: | ---: |
| `ast` | 2 | 2 | 0 | 0 |
| `band-invalid` | 5 | 5 | 0 | 0 |
| `bands` | 16 | 16 | 0 | 0 |
| `binding-invalid` | 15 | 15 | 0 | 0 |
| `boolean-truth-tables` | 18 | 18 | 0 | 0 |
| `collections` | 16 | 16 | 0 | 0 |
| `evaluation` | 29 | 29 | 0 | 0 |
| `machine-output` | 8 | 8 | 0 | 0 |
| `paths` | 14 | 14 | 0 | 0 |
| `shortcuts` | 9 | 9 | 0 | 0 |
| `source-positions` | 6 | 4 | 0 | 2 |
| `syntax-invalid` | 20 | 20 | 0 | 0 |
| `syntax-valid` | 24 | 24 | 0 | 0 |
| `templates` | 7 | 7 | 0 | 0 |
| **Total** | **189** | **187** | **0** | **2** |

The unexecuted cases are `source-positions/yaml-plain-member` and
`source-positions/yaml-quoted-escape`. Both need the YAML-to-decoded-expression
source-map adapter. They are not known failures and not partial passes.

The 187 passing cases now include real Chevrotain source parsing, binding, typing,
evaluation, boolean truth tables, incomplete collections, and source/shortcut
parity. Earlier 53-whole/24-semantic-only counts described the previous cut and
are superseded by this executed result. Ordinary tests remain a separate count.

## Additional implementation evidence

Focused checks cover grammar self-analysis, strict lexical and parsing failure,
CST and AST locations, UTF-16 after astral characters, CRLF, leading BOMs,
integer spelling/overflow and finite floats, validated string escapes, operator
order/associativity, multiple list/record/call children, nested conditionals,
resource limits, and recovery of parser invocation state after failures.

One real CLI defect was found outside the supplied corpus: the default UTF-8
decoder stripped a leading BOM before the parser could preserve original offsets.
Expression file/stdin decoding now retains it for the lexer. Tests verify correct
diagnostics and rejection of a second BOM. Diff/report decoding retains its
existing transport behavior.

The Bash examples for five expression tasks were also executed, and a real
tracked Git fixture was queried through detail: one replacement plus one added-only
line yields two changed lines and raw churn of three. Results are in
`artifacts/evidence/final-bash.txt` and `final-local-git.json`.

The installed consumer is outside the repository so module resolution cannot
borrow checkout dependencies. Its Chevrotain resolution is explicitly local to
the consumer installation. The package test exercises source compilation rather
than only a version command. Strict TypeScript checks resolve the installed
package's actual generated declarations.

## Missing or unobserved at that checkpoint

YAML configuration/source mapping, preset composition, the complete policy
compiler and effect planner, GitHub acquisition, permissions, pagination, label
assignments/definitions, comment ownership/lifecycle and retries, bundled Node 24
root/sub-Actions, native Windows execution, live canary, and publication remain
incomplete or unobserved. Existing band/template primitives do not establish a
full policy or provider lifecycle.

This is an executable language/CLI/package cut, not a complete product release.
