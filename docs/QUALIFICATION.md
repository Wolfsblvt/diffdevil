# diffdevil qualification

## Meaning

This records executed evidence for the current source layout, separately from
historical runtime results and unobserved external effects. A schema specimen is
not execution, a green unit suite is not a packaged consumer, and mock HTTP is not
live GitHub permission evidence.

## September 16 playground application evidence

The first executable playground candidate was independently reviewed at exact
[`18378fe`](https://github.com/Wolfsblvt/diffdevil/commit/18378fe3b5db8fc6fe7a1c5248a461f24d6b1aea).
[Verify run 35040133174](https://github.com/Wolfsblvt/diffdevil/actions/runs/35040133174)
passed Linux Node 22, Linux Node 24 and Windows Node 24 at that head, including
ordinary verification, full conformance, the registry-backed installed-package
consumer and all four install-free Action consumers.

The fresh cold application review also started the local server on Windows 11 /
Node 26.7.0, exercised malformed input and HTTP error routes, and completed one
unauthenticated live analysis of public diffdevil PR #1. That read returned a
complete 14-file comparison whose raw and replacement-aware totals reconciled with
Git. The reviewer's local `npm test` observed **467 passed** at `18378fe`; that
ambient Node 26 run is useful count and operator-path evidence, not Node 22/24
runtime qualification.

The review found stale current-frontier copy, an unguarded versioned response
contract, a missing executable npm/application exclusion, and a rejected static
asset read that could remain cached for the process lifetime. The current branch
repairs those findings and its final exact-head hosted result must be consumed
separately before integration. No hosted deployment, credential, private-repository
read, or provider write is established by this application evidence.

## September 16 v1 source baseline — native Windows evidence

The release-source baseline at exact `main@cb3ac562` is `@wolfsblvt/diffdevil@1.0.0`, with root lock
metadata updated and `private: true` removed. On Windows 11, the scoped native
toolchain was **Node v24.19.0, npm 11.17.0, PowerShell 7.6.5**. A process-scoped
PATH selected that Node executable for npm script children as well as the explicit
npm launcher; the ambient `C:\Program Files\nodejs\node.exe` was v26.7.0. One
earlier verification attempt inherited that ambient runtime and was cancelled
before a verdict. It is not Node 24 evidence.

That exact baseline restored **15 locked packages** with `npm ci --offline`
from `artifacts/dependencies/npm-cache`, without new dependency versions. The
release-sensitive paths then passed:

| Boundary | Current Node 24 result |
| --- | --- |
| `npm run build:actions` and `npm run verify` | 1,141 generated files over 12 locked runtime packages; parity current; **461 passed, 0 failed, 0 skipped**. |
| `npm run test:conformance` | **189 passed, 0 failed, 0 not executed, 0 harness failures**. |
| `npm run test:package` | **485-file** `1.0.0` tarball installed offline outside the checkout; actual Windows npm launcher dispatch, installed PowerShell launcher version/scalar query, CLI, ESM API, schemas and TypeScript declarations passed. |
| `npm run test:actions` | **10 isolated Node 24 executions** across root and three sub-actions, with no consumer install; mock HTTP only. |
| Exact-lock advisory check | `npm audit --json` against `https://registry.npmjs.org/` returned **0** reported advisories at this check. It is advisory evidence, not a guarantee against undisclosed defects. |

The tested source changes are release identity, content/licence scope, package
qualification expectations, and the copied Action licence/metadata hashes; no
semantic engine or provider mutation behavior changed. GitHub private
vulnerability reporting was read back as enabled for the public repository, and
the hosted `SECURITY.md` bytes matched the local source.

After the source push, [Verify run 35034503781](https://github.com/Wolfsblvt/diffdevil/actions/runs/35034503781)
at exact `main@cb3ac562224c7c9d80cefaf87d0ab94f62a5117d` passed Linux
Node 22, Linux Node 24, and Windows Node 24. Each job passed ordinary verification,
full conformance, the registry-backed installed-package consumer, and the
install-free Action consumers. This establishes those hosted consumer paths for
that exact source head, not live GitHub write permissions or events.

The subsequent independent cold source review returned seven findings. The
accepted permission question requires live provider evidence; accepted source and
licence repairs require a newly joined candidate and fresh affected qualification.
npm publication, immutable and major Action refs, Marketplace, and real provider
effects remain separate readbacks.

## Prior environment and boundary

The September 15, 2026 native pass ran on **Windows 11, Node v24.19.0, npm
12.0.2, PowerShell 7.6.5**. All **15 locked packages** restored offline from the
supplied npm cache. No dependency was added or upgraded. The Action runtime
targets **Node 24**, while the CLI/library floor remains Node 22.

The preceding layout pass ran on Linux x64, Node v22.16.0, npm 10.9.2 and Git
2.47.3 at `main@fe3d8b22`. Its results remain useful floor evidence for that
earlier exact tree; the current native pass includes the Windows qualification
tool fixes described below.

Node 24.11.1 actually ran in the previous environment, as recorded in the
[previous Action qualification](reference/2026-09-15/previous-action-qualification.md)
and [final pre-layout review](reference/2026-09-15/final-review.md).
Those earlier executions did **not** qualify the moved paths under Node 24; the
native pass below now does. Native macOS, live provider effects and independent
security review remain unobserved. Hosted CI is described below; its first run
failed and its repaired run passed.

No real credentials, hosted workflow, public tag/release, npm publication or live
provider effect was part of this local qualification. The licence decision and
public-source grant are subsequent to the first native pass reported below.

## Executed current commands

| Boundary | Command | Observed result |
| --- | --- | --- |
| Preparation | `npm run check:prep` | 45 JSON assets; 189 unique declared conformance cases. |
| Build | `npm run build` | Source, declarations, preset and standalone validators built. |
| Ordinary tests and distribution parity | `npm run verify` | **461 passed, 0 failed, 0 skipped**; all committed generated Action bytes match. |
| Supplied conformance | `npm run test:conformance` | **189 passed, 0 failed, 0 not executed, 0 harness failures**. |
| Installed npm consumer | `npm run test:package` | **485-file tarball**, installed offline outside the checkout; actual Windows npm dispatch and installed PowerShell launcher version/query, CLI/API/schema/type consumers passed. |
| Distributed Actions | `npm run test:actions` | **10 isolated executions**, all four current metadata-selected paths, Node 24, no consumer install, mock HTTP only. |
| Shortcut/formula comparison on preceding Linux layout | `npm run demo:shortcuts` | Four CLI pairs, named/custom formula and pure Action shorthand/policy parity passed. Not an Action host test. |
| Example relocation regression on preceding Linux layout | Focused `examples.test.mjs` | All eight example/CI-contract tests passed after repairing old root-copy and subpath assumptions. |

The 189 supplied conformance cases are a separately reported part of production
execution, not 189 additional ordinary tests. Zero discovery and empty test files
remain errors. The test totals are evidence, not a quota enforced by tooling.

## What the layout checks reach

The product now lives under `src/diffdevil/`, including its tests, contracts and
presets. Manuals/examples/research are under `docs/`; build and qualification
scripts are under `tools/`. The root Action path is unchanged. Sub-actions are
`actions/analyze`, `actions/apply`, and `actions/sync-labels`, beside the shared
`actions/runtime` closure. No obsolete root wrappers remain.

The initial broad test run exposed a fixture copying the old `examples/` directory
and a workflow parser assuming every sub-action had only one path component. Both
were corrected and the complete suite reran successfully. Package qualification
uses the actual moved schema and documentation assets. Action qualification copies
only distributed paths outside the checkout, so checkout `node_modules` cannot
silently repair a missing runtime dependency. The generated closure contains
**1,141 files** across metadata, wrappers, catalog and runtime, including the same
**12 locked runtime packages** and their original notices.

The CLI executable name, all public ESM/TypeScript export names, language semantics,
working aliases and shortcuts are unchanged. The package journey still changes
the installed version to `9.8.7-qualification` and checks the actual CLI response.
On Windows it executes npm's installed dispatch and the installed `.ps1` launcher
for version and scalar query; it also inspects the installed CMD and PowerShell
launcher bytes. On Linux the earlier journey executed the installed POSIX launcher.

Native execution exposed two qualification-harness defects: npm 12 returns pack
JSON keyed by package name rather than the older array, and Node's `--import`
requires a file URL for a Windows absolute path. Both were repaired in the
consumer harnesses and the affected journeys passed. Neither changed the semantic
engine or shipped Action distribution.

One intermediate native `verify` run exposed a supported Action output defect:
Windows file IDs on this host exceeded `Number.MAX_SAFE_INTEGER`, so numeric
`ino` comparison could round distinct workflow output and summary files to the
same value. Three tests rejected their separate command files in that run.
The file-handle identity check now uses BigInt stats; a focused test accepts
distinct files and rejects both an identical path and a hardlink. The final
full `verify` run passed **461/461** with current generated Action bytes.

## Complete supplied conformance

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

Cases run through the production parser, binder, type checker, evaluator, policy
and source loaders as appropriate. They include both YAML source-location cases,
collection/evidence semantics and source/shortcut parity. Earlier incomplete totals
remain historical observations, not current failures or invented extra passes.

## Trust and effect evidence

Ordinary and installed/distributed consumers exercise API pagination, missing or
inconsistent patches, trusted base/pinned policy, workspace read-only confinement,
head/base/policy freshness, managed label groups and definitions, owned comment
lifecycles, request/readback distinction and partial/ambiguous writes. These are
fake HTTP observations. They do not establish actual provider permissions, actor
identity, fork event behavior, secret masking or hosted summary rendering.

Tests also exercise real local Git, controlled filter/textconv/external-diff
suppression, process execution, file transport, multiline output protocols,
escaping, bounded summaries, and machine-clean stdout. The user guide specimens
execute the real CLI and shared Action host rather than a transcription of their
intended syntax. The teaching patch yields 10 replacement-aware changed lines and
16 raw churn; its policy exclusion yields 6 changed lines.

The first public-source [hosted run](https://github.com/Wolfsblvt/diffdevil/actions/runs/35018780115)
at `main@3e8e9a4` exercised Linux Node 22/24 and Windows Node 24. Every job
passed ordinary verification and conformance, then the installed package step
failed `ENOTCACHED`: fresh CI `npm ci` had cached locked project tarballs but
not the registry metadata needed by a lockless tarball consumer. Action smoke
was skipped in that run. CI now selects an explicit registry install for the
hosted package journey while local package qualification remains offline.
The failed run is not a hosted matrix pass. [Verify run 35020088812](https://github.com/Wolfsblvt/diffdevil/actions/runs/35020088812)
at exact `main@26a2d7e70bb4acceac2b72ca6ee3512f9ad5d395` then passed all
three jobs: Linux Node 22, Linux Node 24, and Windows Node 24. Each job passed
ordinary verification, full conformance, the registry-backed installed package
consumer, and install-free Action consumers. This establishes those hosted
consumer paths at that source head, not live GitHub write permissions or events.

## Evidence location and next execution

Current native logs are under `artifacts/verification/native-node24-*.log`;
the earlier layout logs remain under `artifacts/verification/layout/`. The qualification
commands write their own result documents under `artifacts/conformance/`,
`artifacts/package/`, `artifacts/verification/actions/` and
`artifacts/shortcut-demo/`. Regenerable tarballs, build output and developer
installations need not travel in a source handoff. Dated public research and
substantive prior returns live once under [the reference map](reference/README.md).
Historical artifact paths there identify their old runs, not files guaranteed to
be present in today's checkout.

The preceding September 15 Windows pass qualified its earlier exact tree. The
September 16 source-baseline section qualifies `main@cb3ac562`, and run
35034503781 qualifies its hosted consumer paths at that exact head. The
application section records the separately reviewed `18378fe` playground head.
Public `main` subsequently acquired provider repairs at `d60ae9f6`. The replayed
application and release candidate must have regenerated Action bytes and fresh
native and hosted qualification; none of the earlier green results is borrowed
for that joined head. Live-provider canary evidence remains a separate boundary.
Wolf and Nyxara settled the [software licence split](DECISIONS.md); the
[component map](../LICENSES/README.md) assigns original documentation prose and
runnable examples while reserving brand/visual assets. npm publication, release
tags, Marketplace, live effects, and website delivery are separate effects.
