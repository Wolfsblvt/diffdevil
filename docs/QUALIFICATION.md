# diffdevil qualification

## Meaning

This records executed evidence for the current source layout, separately from
historical runtime results and unobserved external effects. A schema specimen is
not execution, a green unit suite is not a packaged consumer, and mock HTTP is not
live GitHub permission evidence.

## Current environment and boundary

The September 15, 2026 layout pass ran on **Linux x64, Node v22.16.0, npm 10.9.2**
and Git 2.47.3. All **15 locked packages** restored offline from the supplied npm
cache. No dependency was added or upgraded. The Action runtime still targets
**Node 24**, while the CLI/library floor remains Node 22.

Node 24.11.1 actually ran in the previous environment, as recorded in the
[previous Action qualification](reference/2026-09-15/previous-action-qualification.md)
and [final pre-layout review](reference/2026-09-15/final-review.md).
That binary was unavailable for this pass. Those earlier executions do **not**
qualify the changed source/distribution paths under Node 24. Native Windows/macOS,
a hosted workflow, live provider effects and independent security review remain
unobserved for this candidate.

No real credentials, remote, public tag/release, publication or project licence
selection was part of this work.

## Executed current commands

| Boundary | Command | Observed result |
| --- | --- | --- |
| Preparation | `npm run check:prep` | 45 JSON assets; 189 unique declared conformance cases. |
| Build | `npm run build` | Source, declarations, preset and standalone validators built. |
| Ordinary tests and distribution parity | `npm run verify` | **461 passed, 0 failed, 0 skipped**; all committed generated Action bytes match. |
| Supplied conformance | `npm run test:conformance` | **189 passed, 0 failed, 0 not executed, 0 harness failures**. |
| Installed npm consumer | `npm run test:package` | **482-file tarball**, installed offline outside the checkout; real CLI/API/schema/type consumers passed. |
| Distributed Actions | `npm run test:actions` | **10 isolated executions**, all four current metadata-selected paths, Node 22, no consumer install, mock HTTP only. |
| Shortcut/formula comparison | `npm run demo:shortcuts` | Four CLI pairs, named/custom formula and pure Action shorthand/policy parity passed. |
| Example relocation regression | Focused `examples.test.mjs` | All eight example/CI-contract tests passed after repairing old root-copy and subpath assumptions. |

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
**1,138 files** across metadata, wrappers, catalog and runtime, including the same
**12 locked runtime packages** and their original notices.

The CLI executable name, all public ESM/TypeScript export names, language semantics,
working aliases and shortcuts are unchanged. The package journey still changes
the installed version to `9.8.7-qualification` and checks the actual CLI response;
its normal Linux path executes the installed POSIX launcher. npm-generated CMD
and PowerShell launcher content is inspected, but native execution is not claimed.

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

The read-only Linux/Windows CI matrix is authored, not an observed hosted run.

## Evidence location and next execution

Current transfer logs are in `artifacts/verification/layout/`. The qualification
commands write their own result documents under `artifacts/conformance/`,
`artifacts/package/`, `artifacts/verification/actions/` and
`artifacts/shortcut-demo/`. Regenerable tarballs, build output and developer
installations need not travel in a source handoff. Dated public research and
substantive prior returns live once under [the reference map](reference/README.md).
Historical artifact paths there identify their old runs, not files guaranteed to
be present in today's checkout.

The next local boundary is the four [release qualification commands](PUBLICATION-BOUNDARY.md)
on native Windows with Node 24, followed by independent trust/effect review and an
explicitly authorized disposable live canary. Licence selection, source publication,
npm publication, release tags, Marketplace, security intake and website delivery
remain separate decisions and observations.
