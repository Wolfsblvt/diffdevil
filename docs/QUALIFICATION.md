# diffdevil Qualification

## Meaning

This records executed production evidence for the current implementation. It
separates ordinary tests, complete supplied conformance cases, packaged consumers,
and unobserved provider/runtime surfaces. Expected data is never a passing test.

## Observed environment

The September 15, 2026 final review and documentation cut was exercised on **Linux x64**
with **Node v22.16.0 and Node v24.11.1**, npm 10.9.2 and Git 2.47.3. Node 24 was an
already installed executable, not a downloaded runtime or a compatibility inference.
The pinned build uses TypeScript 5.8.3, Node typings 22.15.33, Chevrotain 13.2.0,
YAML 2.9.1 and Ajv 8.20.0. All fifteen locked packages restore with `npm ci
--offline` from `artifacts/dependencies/npm-cache`; twelve are runtime packages.

No live credentials, GitHub effects, remote, publication, public tag or project
licence selection occurred. Independent security review and native Windows/macOS
execution have not been performed.

## Commands and results

| Boundary | Command | Actual result |
| --- | --- | --- |
| Preparation assets | `npm run check:prep` | 45 JSON assets and 189 declared cases validated as assets. |
| Source/declarations | `npm run build` | Passed on Node 22 and 24 with the pinned toolchain. |
| Ordinary source and generated parity | `npm run verify` | **461 passed, 0 failed, 0 skipped** on each runtime; regenerated Action files match exactly. |
| Supplied conformance | `npm run test:conformance` | **189 passed, 0 failed, 0 not executed; 0 harness failures** on each runtime. |
| Shortcut comparison | `npm run demo:shortcuts` | Four CLI pairs, JSON-authored formula/named retrieval and pure Action shorthand/policy desired-plan pair passed. |
| Packaged consumer | `npm run test:package` | Offline install outside checkout on each runtime; **481-file tarball**, CLI, YAML/JSON policies, mock GitHub application, exports and strict types passed. |
| Shipped Action consumers | `npm run test:actions` with both runtime paths | **20 isolated executions** across all four metadata-selected entry points, without consumer installation or checkout dependencies. |
| Windows launchers | npm `cmd-shim` in package test | CMD/PowerShell contents generated and inspected; native execution unobserved. |
| Earlier independent schemas | Python jsonschema Draft 2020-12 | Historical cross-check: 20 input/normalized policy, report and plan specimens passed; not a fresh Ajv-equivalence claim. |
| Live GitHub/hosted runner | Not run | Outside this assignment; no permission, fork-run, actor, UI or Marketplace claim. |

The ordinary total includes the earlier **49 Action-host tests**, **five
metadata-contract checks**, the CLI repository-base-policy freshness regression,
and **eight new executable-example/CI-contract tests**. Totals describe executed tests, not a target quota.
The 189 conformance cases are reported separately from the ordinary test count;
they are not 189 additional ordinary tests.

Current runtime, conformance, shortcut and package transcripts are in
`artifacts/verification/final-pass/`. The separately executed Action journey is
recorded in `artifacts/verification/actions/`. Interrupted tool invocations remain
separate from completed zero-exit verification records; an interrupted run is not
a pass. `consumer.json` records each Action execution, actual runtime, selected
entry, outputs and fake-provider writes. Per-case conformance observations are in
`artifacts/conformance/results.json`. Package bytes, integrity and file count are
in `artifacts/package/qualification.json`; per-runtime snapshots are retained with
the final-pass evidence. A successful old package test does not qualify modified
package bytes.

Earlier CLI/provider transcripts remain `artifacts/cli-host-{verify,package,conformance}.log`;
GitHub-only transcripts remain `artifacts/github-{verify,package,conformance}.log`.
YAML, policy and language evidence remains in its original artifact paths. These
historical observations establish their own checkpoints, not an extra current run.

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
| `source-positions` | 6 | 6 | 0 | 0 |
| `syntax-invalid` | 20 | 20 | 0 | 0 |
| `syntax-valid` | 24 | 24 | 0 | 0 |
| `templates` | 7 | 7 | 0 | 0 |
| **Total** | **189** | **189** | **0** | **0** |

Both YAML cases run through the production source loader and original-range
translation. The current 189 passing cases include parsing, binding, typing,
evaluation, collection evidence and source/shortcut parity. Earlier lower totals
belong to their historical commits, not this restored and extended tree.

## Final review and executable user examples

The installed `--version` route previously returned a hardcoded development
version. It now reads package metadata beside the installed CLI. The package
journey changes that consumer metadata to `9.8.7-qualification`, executes the
actual launcher, and restores the original bytes. The Windows branch uses npm's
installed launcher dispatch; on Linux only the POSIX executable is run.

The task-guide examples execute the real CLI and the shared Action host. The
four-file teaching patch yields 10 replacement-aware changed lines and 16 raw
churn. Excluding its lockfile yields 6 changed lines. Tests read the guide's
actual command specimens and check named queries, desired plans, the exact
quickstart workflow, scope-driven label transitions, and an idempotent upserted
comment. Parsed CI metadata establishes the declared commands, not a hosted run.

The workflow summary now exposes raw and replacement counts, comparison revisions,
file counts/completeness, and configured metrics beside desired and observed
provider results. Escaping and unavailable-value semantics are retained. No
measurement primitive or working alias was removed.

The public reference editions retain substantive earlier research/returns without
private activation text. Exact originals and full earlier Git history remain in
the private development carrier. A separate clean-root publication repository
prevents older private instructions entering public ancestry. A local source/tree
and relative-link inspection is not an independent security review or a promise
that remote links will never change. See the [dated final review](../reference/2026-09-15/final-review.md).

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

The earlier JSON-only policy cut did not obtain YAML/Ajv; the subsequent YAML
cut added the supplied packages and standalone validators.
Twenty independently validated specimens passed the supplied structural JSON
Schemas using Python jsonschema. That check is local cross-validation, not the
runtime validator and not full semantic equivalence with Ajv. The authored size
preset's byte hash and an independently derived canonical value hash both bind
the generated TypeScript data.

The six-task demonstration now executes the pure single-rule Action compiler
and compares rule results and desired operations with authored detail policy.
It does not execute GitHub Actions or provider requests. JSON and YAML formula authoring and named retrieval are consumer-tested.

## Action-host and distribution evidence

All four entry points share host inputs, policy selection, source acquisition,
evaluation, effect reconciliation, output transport and error handling. The root
no-config path creates missing size definitions and reconciles only its managed
group without comments. Analyze and definition verification remain read-only.
Tests exercise `INPUT_*`, real event/output/summary files, multiline delimiters,
escaped summaries/errors, every metadata input/output, generated shorthand and
full policies, controlled local Git, base/pinned/workspace trust, workspace and
symlink confinement, typed parameters and scope/path/output selection.

Saved reports and plans are compared with fresh trusted inputs; forged or stale
evidence cannot authorize writes. Mock HTTP tests expose changed heads, bases,
repository-base policy revisions, ambiguous writes, partial application and
readback journals. A token alone does not turn a read-only path into a writer.
These tests do not certify every real race or GitHub permissions configuration.

The generated artifact is a **multi-file native-ESM closure**, not a minified
single-file bundle: **1,138 generated files and 12 locked runtime packages**, with
original licence/notice files. Each `action.yml` selects Node 24 and an actual
shipped entry. `check:actions` compares a clean reconstruction, including the
metadata, wrappers, input/output catalog and manifest, rather than merely finding
an executable file. Original vendor bytes survive Git text handling.

The isolated journey copies only the distribution, not authored source or the
root `node_modules`, to a directory outside the checkout. Per runtime it executes
root defaults, bounded analyze, root planning, saved-artifact apply, stale report
refusal, base policy, multiline comments, definition verification, definition
application and a partial-write case. Expected nonzero statuses are checked as
such; they are not silently counted as successful application. The provider is an
external in-memory HTTP fixture. No install or production-runner patch occurs.
See [Action distribution](integration/action-distribution.md) for file paths and
[GitHub Actions](integration/github-actions.md) for the behavioral contract.

## Current missing or unobserved surfaces

CLI, API, npm package and the four install-free Actions now have local consumer
qualification. That is a coherent **local release candidate**, not a public release.
Native Windows/macOS, hosted Actions, a live GitHub canary, independent security
and full-lock dependency-advisory review, public source hosting, licence selection,
security intake, publication and a documentation site remain unobserved or
unselected. [Publication boundary](PUBLICATION-BOUNDARY.md) identifies the current
clean publication-history/private-carrier distinction and remaining external effects.

Mocked API evidence does not certify token permission configuration, App actor
identity, archive-state response fields or race timing on the real service. Local
Node 24 proves the executed binary/OS boundary, not GitHub's hosted runner image.
Generated Windows launchers are not native Windows execution. Plans and manifest
hashes establish identity, not authentication. Hosts must select trusted policy;
the Actions reacquire evidence before applying supplied artifacts.

The complete destination remains active in [Direction](DIRECTION.md). No public
readiness, dependency-security, visual-brand or live-effect clearance is inferred.

## YAML and Ajv evidence

Nineteen additional ordinary tests cover both supplied YAML source-map cases,
end-to-end policy parity, unsafe numeric spellings, tags, multi-document rejection,
CST nesting limits, expanded aliases, anchored diagnostics, CRLF and all scalar
styles. Fixed schemas validate actual policies, reports and plans. Schema success
remains distinct from semantic arithmetic consistency and provider authority.
The compiler and a YAML-authored query execute with runtime string code generation
disabled. Installed-package tests invoke YAML outside the checkout and include
the build-generated validator module. This historical YAML-only evidence did not
qualify Node 24 or GitHub; the later runtime/host evidence is reported separately above.

Root-runner regressions exercise nested discovery, helper exclusion, empty
registered-test files, zero discovery and preserved real test failure. The
empty-file specimen first passed Node’s native wrapper without a registered
test, then failed the repaired ordinary entry. See `artifacts/root-runner.log`.

## GitHub adapter evidence

Thirty-six additional tests cover API-origin confinement, Enterprise paths, safe
read retries and rate limits, credential-redacted errors, non-retried writes,
response budgets, pagination, the file-list ceiling, partial patches, ambiguous
file-kind refinement, pinned policy/template acquisition, current head/base
checks, label definitions/assignments, archived-label handling, case conflicts,
owned author/marker checks, comment lifecycles, duplicate-state conflicts,
ambiguous write readback, trusted/untrusted reports and forged plan rejection.

The installed npm consumer invokes the installed `/github` exports against an
explicit fake HTTP provider. It acquires actual normalized facts, evaluates a
policy, reconciles labels/comments and ensures a definition, then checks the
public TypeScript declarations. Nothing contacts live GitHub.

## Explicit host application and controlled Git

The recovered CLI host tests exercise base/workspace policy selection, typed
parameters, definition verify/apply and exit codes, saved-plan freshness,
preflight argument/format failures, partial journals, expanded YAML and held
plans. The installed CLI executable also performs default size reconciliation
against the fixture HTTP boundary. No actual provider mutation occurs.

A real Git regression demonstrated that disabling textconv/external diff does
not disable worktree clean/process filters. Controlled acquisition now disables
those configured drivers and filesystem monitors. PR-bound local Git tests
preserve the merge base separately from the live base tip and reject a policy
loaded before a base change. Rule selection narrows effects without changing
the compiled policy identity.

The Action cut also forwards repository-base policy freshness into the CLI's
standalone definition route. Its regression changes the default-branch revision
before the first write and observes refusal with no mutation. Action workspace
policy/template reads now enforce real-path containment; an outside file or an
escaping symlink is rejected rather than trusted because the input is read-only.
