# The App's premium seam

## Meaning

This directory is the one place where the public App meets the paid implementations. It owns the extension contract, the build-time join and the Community default; it contains no premium behaviour. The complete Community application builds, runs and qualifies without any extension; a build that joins one renders the premium slots of the public pages for an entitled reader.

## The extension

An extension is a plain object with up to four optional parts (`registry.mjs`):

- `service(host)`: composes the analytical read service's file extension (`files`, `file`, `pr`; see [the data contract](../../../../docs/integration/app-analytical-data.md#community-service-and-premium-extension)). `host` is `{ kit, github, store, clientFor }` from `createAnalyticalPremiumHost`.
- `projection`: `{ mapFiles }`, how the service's file rows become the shape its page bodies render. Node-safe, used by `loadView`.
- `pages`: `{ overview, files, file, history, pr, manage }`, the loaders and Astro components the public pages render in their premium slots: Overview `Concentration`, `Cloud`, `Turnover` and `load`; Files `Body` and `query`; File detail `Body`; History `Panels` and the selected bucket's `BucketFiles`; PR detail `Context`, `Cochange` and `fileHrefs`; Manage `Defaults` (the Pro default editor), `Policies`, `People` and `Audit` (the Business pages). The stored namespace default, its join to the effective policy, the linked policies and their publications, automatic setup, delegations, the administrative record and every other Manage fact are Community (`lib/manage/`); without the extension an entitled namespace is told the editor or coordination surface is not part of the build. The file charts inside those bodies draw in the public chart frame: their models, readouts (registered through `lib/charts/readout.mjs`) and browser recipes (registered through `client/charts/mount.ts`) are the extension's.
- `brief`: the premium PR-brief provider ([the provider contract](../../../shared/pr-brief/contract.mjs)). The App Worker hands it to the managed runtime, which composes premium brief context only for an eligible repository, and to the admission preview. Without it the standard brief composes its complete basic form and reports each premium module `not-provided`.

Page bodies import the public App through the four files in `bridge/`, resolved by the `@diffdevil-app` alias. The extension can live anywhere the build is pointed at. Public implementation modules behind the bridge are not direct premium imports or independent compatibility promises.

## Source seam version 1

The unreleased source declaration in `apps/github-app/release.json` names two interfaces. The service consumes the host supplied by `createAnalyticalPremiumHost` and the analytical service's `premium` argument. The application consumes the extension object described above, the shared PR-brief provider contract and these four bridge modules:

- `bridge/components.mjs` supplies the existing Astro frame, panels, evidence/plan/file components and Manage form, banner and state components. Their existing props and slots remain the caller contract.
- `bridge/helpers.mjs` supplies the surface loader, retained-record and route helpers, server model helpers and the People/Policies/Audit presenters actually used by the premium bodies. Server helpers do not import Astro components. Pure chart formatting and readout registration live in `bridge/charts.mjs`.
- `bridge/charts.mjs` supplies pure chart models, formatting and readout registration to both Node and browser consumers. Browser recipes never import the server helper barrel.
- `bridge/client.ts` supplies chart registration and navigation, frame/mount types, token and reduced-motion readers, and the shared chart recipe primitives. The premium extension registers its own recipes and keeps its own cloud implementation; it does not take over the Community renderer.

No registration lifecycle or generic plugin API is introduced. Premium loaders receive the public runtime and authorized view rather than importing runtime construction. The existing service host keeps GitHub acquisition, storage and interval rules public while private algorithms receive that host explicitly. Premium browser and server tests exercise the same bridge as the production consumer.

For File detail, the first `file` surface read carries the authorized retained records needed to resolve the opaque
locator and does not call the rich `files` aggregation. `loadSurface(view, runtime, 'file', { path })` continues that
same request-local context after resolution, checks current access and readable history again, and calls the extension's
`file` method for the selected path. The ordinary Files destination continues to call `files` for its complete rich
table. A serialized response, another runtime or a changed selection cannot reuse the detail context. The public
loading fixture exercises this bridge without copying private algorithms.

For large size histories, the host store's optional compact read is documented in
[the analytical contract](../../../../docs/integration/app-analytical-data.md#community-service-and-premium-extension).
It preserves shared facts, every exact observation and per-path boundary anchors without requiring an expanded row
array. Consumers select and qualify that representation explicitly; existing flat readers keep their full contract.

The declaration is source-only: no `app-vX.Y.Z` release has published it. The separately maintained private consumer must accept version 1 only after importing this matching premium subtree and qualifying its actual composition route. Its generated lock records the exact Community candidate; it does not pin the local composite containing premium ancestry.

## The join

`premium-selection.mjs` (beside `astro.config.mjs`) resolves the extension once for the Astro build and for the build command: `premium/app/index.mjs` when present, `DIFFDEVIL_PREMIUM=<path>` to choose another, `DIFFDEVIL_PREMIUM=off` to build Community from a tree that has the extension. The build aliases `@diffdevil/premium-app` to the chosen entry or to `absent.mjs`, and `@diffdevil/premium-styles` to the extension's `styles/premium.css` or the empty `absent.css`; the App shell imports the latter, because Astro links a stylesheet only through a page's static imports and the extension's components reach pages only through this seam. Only the Worker entry and the request middleware import `index.mjs`; everything else receives the composed extension through `createAppRuntime(env, { premium })`, so tests and tools compose with or without it. There is no discovery, registration call or lifecycle.
