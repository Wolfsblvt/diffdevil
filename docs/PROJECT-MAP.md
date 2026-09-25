# diffdevil project map

## Meaning

This map locates the single product, shipped Actions, documentation and repository
tooling. It distinguishes authored code, executable contracts, committed distribution
and disposable outputs without introducing independently versioned products.

## Root responsibilities

| Path | Responsibility |
| --- | --- |
| `src/diffdevil/` | Reusable MIT product core: shared engine, CLI, provider/Action hosts, core tests, contracts and presets. |
| `apps/playground/` | AGPL application adapter: shared local/Worker public-PR route, Worker configuration, browser assets, versioned response contract and application tests. |
| `apps/github-app/` | AGPL managed-App adapter: verified webhook ingress, Queue execution, D1 recovery/history state, migrations and operator boundary. |
| `apps/browser-extension/` | AGPL Chrome Manifest V3 application: GitHub pull-request projection, settings, provider acquisition, bounded local storage, browser qualification and unpublished Store-preparation material. |
| `apps/website/` | AGPL public website: Astro static product output, the standalone FAQ and finite legacy redirects, the complete playground as one lazy React island running the shared engine in the browser, examples catalogue, browser-extension and App pages, legal/privacy routes. Its build hook joins the public manual and search. No command deploys either host. |
| `apps/shared/` | Small presenters both AGPL applications use (currently the App check-summary composer). |
| `actions/` | Three sub-action entry points and their shared, committed runtime. |
| `apps/manual/` | Explicit-source public manual renderer, source/route/migration manifests, isolated application toolchain and commands, shared-package consumption, generated reference inserts and qualification. Chapter prose stays in `docs/manual/`; the standalone FAQ stays with the product site. |
| `packages/design/` | Canonical reusable visual reference: E3/W1/T2 with Foundation A grammars, tokens, explicit errata, and reserved production identity SVGs; not executable website source. |
| `docs/` | Maintained manuals, runnable examples and dated technical research. |
| `tools/` | Builds, generation and repository/consumer qualification, including the canonical FAQ and manual projections, derived website assets and curated-snapshot capture/audit. |
| `.github/` | Provider-owned workflow convention, not a second implementation. |
| `action.yml` | One-step root Action, forwarding to the shared runtime. |
| `package.json`, `package-lock.json`, `tsconfig.json` | Reusable product package, root development lock and core compiler boundary. The manual's private application toolchain has its own package metadata and qualification lock. |
| `README.md`, `AGENTS.md` | Public product front door and repository-local contribution contract. |

`apps/playground/`, `apps/github-app/`, `apps/browser-extension/` and `apps/website/` consume the built reusable engine; none duplicates measurement, policy, or provider semantics. The website's playground bundles that engine through two small shims for its Node-only imports, while the extension consumes the closed browser export and lightweight formatter. Their browser/server/Worker, managed ingress/Queue/D1 and GitHub-DOM adapters are application code, not npm-package contents.

`dist/`, root `node_modules/` and `artifacts/` are ignored generated/local material,
not extra products. They are recreated by documented commands and are not part of
the public source boundary. The committed dependency closure inside
`actions/runtime/node_modules/` is deliberate distribution, not a developer install.

## Product ownership

All paths below are relative to `src/diffdevil/`:

| Subject | Source |
| --- | --- |
| Normalized diff, path selection, raw/replacement facts, evidence and reports | Root modules such as `core.ts`, `evidence.ts`, `report.ts`, `format.ts` |
| detail syntax, AST, binding, types, collection algebra and interpreter | `language/` |
| Policies, metrics, scopes, presets, shortcuts, rules, plans and templates | `policy/` |
| Local Git data acquisition | `sources/` |
| Shared bounded file and trusted policy acquisition | `hosts/` |
| Command parsing, source orchestration and machine-clean output | `cli/` |
| Provider acquisition, freshness, labels, comments and readback | `github/` |
| Action transport, targeting, inputs, outputs, summaries and runner | `actions/` |
| Core Node tests and explicit fake HTTP fixtures | `tests/` |
| Public policy/report/query/plan structural schemas | `contracts/schemas/` |
| detail grammar, catalogs, interchange definitions and supplied cases | `contracts/detail/v1/` |
| Shipped declarative presets | `presets/` |

The playground server, browser assets, response schema, Worker adapter and application
tests live under `apps/playground/`; the managed App has separate Worker/Queue/D1
adapters, migrations, and focused application tests under `apps/github-app/`. The
browser extension owns its Chrome/GitHub lifecycle, settings and qualification under
`apps/browser-extension/`, while reusable browser-safe engine code remains under
`src/diffdevil/browser/`. These applications reuse the core without moving their
AGPL application code into the MIT source boundary.
`apps/playground/wrangler.jsonc` owns the playground Worker name, runtime
compatibility and static-asset routing. `apps/github-app/wrangler.jsonc` carries
source-level App bindings with a non-operational D1 placeholder. Both configs contain
no account ID, token, custom domain or deployment state; remaining hosted state is
deliberately outside source.

The compiled public exports still live under `dist/lib/`. Consumer import names
and the `diffdevil` CLI do not expose the source-tree nesting. There is no workspace
federation or second policy engine. The isolated manual renderer does not compile
a different reusable engine.

## Action distribution

```text
action.yml                          -> actions/runtime/lib/actions/root.js
actions/analyze/action.yml           -> index.mjs -> ../runtime/lib/actions/analyze.js
actions/apply/action.yml             -> index.mjs -> ../runtime/lib/actions/apply.js
actions/sync-labels/action.yml       -> index.mjs -> ../runtime/lib/actions/sync-labels.js
```

`tools/build-actions.mjs` owns metadata, wrappers, compiled JavaScript, standalone
validators, locked runtime package trees and the distribution identity/closure
manifest; source and generated bytes are compared by the builder, not recorded in
a second per-file hash registry.
`tools/action-smoke.mjs` executes all four actual metadata-selected paths outside
the checkout. [Action distribution](integration/action-distribution.md) owns the
consumer contract and packaging rationale. Generated bytes are reviewed and
committed, never hand-edited.

## Documentation and proof

[The public manual](manual/README.md) owns reader operation; [the repository
documentation map](README.md) enters technical and maintainer sources.
[Documentation design](documentation.md) owns teaching and canonical source/route
ownership; `docs/examples/` contains its executed specimens. `docs/reference/` retains
dated research and implementation evidence, not alternate current instructions.

[Development](DEVELOPMENT.md) owns restoration and commands.
[Qualification](qualification.md) records observed boundaries and limitations.
[The manual application](../apps/manual/README.md) owns its selected source projection,
chapter-authoring contract and two-host browser qualification.
`tools/test.mjs` discovers core and application tests; `tools/conformance.mjs` reports actual
supplied-case execution separately; `tools/package-smoke.mjs` tests the installed
npm artifact. These tests use real filesystem/process boundaries and mock provider
HTTP where specified, not live repository effects.
