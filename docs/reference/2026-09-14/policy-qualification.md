# Historical policy qualification return

## Meaning

This public evidence edition preserves the substantive policy qualification
return from the pre-Action implementation sequence, as archived before the
September 15, 2026 publication-preparation pass. Counts, commands, limits, and
recommendations below describe that earlier checkpoint, not current standing.
The exact original is preserved privately. Current behavior and proof are in
[Qualification](../../QUALIFICATION.md) and the maintained manuals. Artifact
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
| Ordinary suite | `npm test` | **328 passed, 0 failed, 0 skipped.** |
| Supplied conformance | `npm run test:conformance` | **187 passed, 0 failed, 2 not executed; 0 harness failures.** |
| Shortcut comparison | `npm run demo:shortcuts` | Four CLI pairs, JSON-authored formula/named retrieval and pure Action shorthand/policy desired-plan pair passed. |
| Packaged consumer | `npm run test:package` | Offline install outside checkout; CLI, JSON policy/parameters/desired plans, source/shortcut queries, schemas, exports and strict types passed. |
| Independent schemas | Python jsonschema Draft 2020-12 | 20 input/normalized policy, report and plan specimens passed; not Ajv qualification. |
| Windows launchers | npm `cmd-shim` in package test | CMD/PowerShell contents generated and inspected; native execution unobserved. |
| Node 24 Action | Not run | No bundle or runtime qualification yet. |
| Live GitHub | Not run | Outside this assignment. |

Current slice transcripts are in `artifacts/verification/policy/`; prior language
transcripts remain in `artifacts/evidence/final-*.txt`. Per-case observations
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

## Joined policy evidence

Fifty-two additional ordinary tests cover static checking of all declarations,
forward references, real cycle paths, whole-record dependencies, integer/float
inference, lazy query roots, shared work limits, scopes/path replacement, named
metric correlations, typed parameters and identities, rule phase isolation,
unknown holds and explicit plan failure, false-label removal, managed-group
conflicts, unknown-band label fallback without a comment occasion, template
sources/rendering, desired definition operations and plan round-trips.

JSON tests cover duplicate decoded keys, unsafe integer spellings, finite floats,
BOM/CRLF/Unicode, exact source ranges through escapes and runtime diagnostics.
Spawned CLI tests cover configured queries/checks/plans, saved-report discovery
bypass versus explicit recomputation, parameter files, template paths, invalid
input combinations and no output-file clobber on unknown or failed results.

Installed-package qualification found a real phase bug: CLI checks used rule
condition root restrictions, rejecting completed rule results. They now compile
as read-only queries and separately require boolean type. `requirePresent` is
still needed for optional rule decision fields. Rule declarations remain unable
to read other rules. Earlier debugging transcripts retain the failed observation;
the corrected package test and final suite pass.

The cache and package lock remain unchanged: no YAML/Ajv dependency was obtained.
Twenty independently validated specimens passed the supplied structural JSON
Schemas using Python jsonschema. That check is local cross-validation, not the
runtime validator and not full semantic equivalence with Ajv. The authored size
preset's byte hash and an independently derived canonical value hash both bind
the generated TypeScript data.

The six-task demonstration now executes the pure single-rule Action compiler
and compares rule results and desired operations with authored detail policy.
It does not execute GitHub Actions or provider requests. JSON formula authoring
and named retrieval are now consumer-tested; YAML is a separate missing route.

## Missing or unobserved at that checkpoint

YAML configuration/source mapping, Ajv runtime/differential validation, GitHub
acquisition and trusted policy selection, provider permissions/pagination,
label assignments/definitions, comment ownership and lifecycle occasions,
retries/readback, bundled Node 24 root/sub-Actions, native Windows execution,
live canary and publication remain incomplete or unobserved.

Desired comment operations contain rendered text and validated lifecycle options,
not authenticated comment ownership or observed transition state. Desired plans
are not provider request lists or evidence that effects were applied. Plan
transport validation does not establish freshness or policy trust.

This is a joined policy/CLI/package cut, not a complete product release.

## Delivered archive readback

The final ZIP was CRC-checked and freshly extracted. Its local main ref is
`43ccbc6f7d876438f846c6c49cbe96891b4d7ba4`, Git integrity passes, tracked state is
clean and there are no remotes. The included cache restored all nine packages
offline, the fresh extraction rebuilt, and all 328 tests passed again. The
configured CLI returned weighted value 248 and a desired ensure/add label plan.
Exact archive hash and the fresh test transcript accompany the return JSON.
