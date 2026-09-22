# Public manual foundation

## Meaning

The maintained Markdown is `docs/manual/`. This application renders only the
explicit pages in `manifest.mjs` at `https://docs.diffdevil.dev/`. The product site
and its admitted FAQ remain in `apps/website`; the FAQ is not a second manual page.

## Build and inspect

From the repository root, use `npm ci --ignore-scripts`, then `npm run website:build`.
This builds the engine, both static hosts and one joined Pagefind index. Output is
`artifacts/website/dist` and `artifacts/manual/dist`. Neither command deploys anything.
`npm run manual:check` checks the actual manual renderer; `npm run manual:test`
checks source contracts. `npm run manual:dev` serves the manual on loopback port 4322.

The manual consumes the exact accepted `Wolfsblvt/starlight-works` source commit
`22d4567006ec7a33d890fab2f3d3515332498a90` through that repository's own build and pack
commands. It is not an npm publication. `manual:prepare` records source and consumer
receipts under `artifacts/manual-toolchain/`. The package supplies linked sidebar
groups and the five GitHub alerts; this repository does not copy their implementation.
The manual's isolated dependency graph supplies its supported Starlight 0.42.2 peer,
without upgrading the accepted website's locked Starlight 0.42.1 graph.

The source package is unpacked from its verified local tarball and installed with
`--install-links`, not linked into a sibling repository. Direct consumer versions
are pinned. The child lock is generated, retained with each qualification artifact,
and reused by subsequent preparations of that checkout. A clean preparation resolves
a new transitive graph and must earn its own evidence; it does not reproduce an
earlier graph merely because the source SHA is unchanged. The exact Git coordinate
and package receipt govern the unpublished package. `DIFFDEVIL_DOCS_OFFLINE=1` requires a previously prepared source/dependency
cache and refuses to download it. A clean checkout needs one online preparation.

## Author a chapter

Keep one H1 matching its manifest title and ordinary GitHub-readable Markdown.
Relative links name maintained sources; the AST projection maps them to explicit
public routes or the finite source resolver. Code blocks are never rewritten.
Register public images in `assets.json`; the build copies only those assets.
Full working examples stay open. Secondary variants may use native disclosures.

The 41 page scaffolds are deliberately not complete prose. Their authoring comments
are removed from the renderer, and their readiness is private build state in
`authoring-state.json`. Complete the selected reader job, examples, expected results,
failure returns and source links before changing `scaffold` to `authored`.

Capability availability is independent. A page marked `in-development` in the
manifest must carry exactly one top GitHub NOTE containing **In development**.
Removing that note requires rereading and correcting the governed page against
actual complete capability, not merely completing its prose. `capabilities.json`
records remaining source or public-availability dependencies without printing a
planning panel into every article.

The sequence is Start + Understand, open surfaces + workflows, Policy + Reference,
then Managed App + Help, followed by final reconciliation and fresh review. All
waves continue the same draft branch. README compression belongs to final
reconciliation, not Foundation.

## Routes, provenance and migration

Public routes, aliases, sidebar parents and disclosure defaults are literal manifest
fields. They are never inferred from repository directories. Source links name the
exact candidate commit; Edit links name its actual authoring branch. The root is
What is diffdevil, with `/start/what-is-diffdevil/` as a 308 alias.

`migration.mjs` represents every accepted moving and retained source family.
Existing guides stay current until all of a split's successors are authored. To
transfer a family, record its exact historical `fromRef`, SHA-256 and complete
`oldAnchors` (GitHub heading IDs plus `_top`) in `authoring-state.json`, select a
primary successor and map every old fragment to `{page, anchor}`. The renderer
reads the historical Git bytes to check that inventory and the new rendered
anchors to check the destinations. A retired source must actually be removed;
forwarding Markdown stubs refuse. Bounded operator residue or a release maintainer
map needs its separate explicit job. Incoming links must be updated in the same cut.

A transfer also selects `redirects`, `sourceIds` and `search` together. Select each
legacy public route in `state.routes` as `{target: "page-key"}`. Unknown routes,
unready successors and partial family transfers refuse. No legacy route is
activated merely because a replacement file exists. Every emitted retired route must
have its explicit transfer, and selected source fragments must resolve. The resolver preserves old
source IDs and can direct an old fragment to a different member of a split.

The build emits a small Cloudflare Pages advanced-mode `_worker.js` handler in each
static output. It delegates ordinary requests to `env.ASSETS.fetch` and applies the
selected matching-route `www` to apex 308 and exact route aliases. This uses the
[native handler contract](https://developers.cloudflare.com/pages/functions/advanced-mode/),
because [domain-level redirects are not supported in `_redirects`](https://developers.cloudflare.com/pages/configuration/redirects/).
The accompanying `_redirects` files contain path rules only. Noindex HTML aliases
retain a usable link in plain static previews and preserve query/fragment when
JavaScript is enabled. No Markdown source forwarding files are written.

Browser qualification executes the emitted handler against a local static-assets
binding; it does not implement a second redirect simulator. Host adoption and live
HTTP readback remain separate from this build. No hosting or DNS operation occurs.

## Search, FAQ and generated inventories

One Pagefind build joins selected product/legacy pages, current manual pages and
individual rendered FAQ questions. It is mirrored into both outputs, so either
origin uses a local copy without an unconfigured CORS dependency. Metadata carries
SITE, DOCS or FAQ independently of source paths. Scaffolds, legal/noindex routes,
the resolver, qualification pages and the whole FAQ page are not indexed.

`related-questions.json` stores existing FAQ IDs only. Titles are read from the
admitted `docs/manual/faq.md`; answers, stable IDs, native disclosures and the
product-shell route remain owned by that source. Missing IDs refuse. The ordinary
FAQ browser qualification runs on the combined candidate as well.

`<!-- manual:generated NAME -->` inserts a bounded mechanical inventory into an
authored page. Supported names are `cli-help`, `actions`, `typescript-exports`,
`schemas`, `detail`, `presets`, `real-pr-catalogue`, `presenter-small`,
`presenter-report` and `presenter-plan`. These read the actual built
CLI/API, Action metadata and canonical contracts/catalogue; they are not another
manually maintained reference. Source links remain useful when reading on GitHub.
Schema fields and language catalogues are mechanical inventories, not a claim that
structural validity establishes semantic validity. Preset expansion is checked
against the canonical preset through the real compiler. Presenter specimens execute
the real CLI and keep the small 10-Changed/16-churn input distinct from the
178-Changed presentation input. A command failure fails generation.

The real-PR catalogue remains the one shared `docs/examples/catalogue` family.
Playground links carry a real `example--variant` key. Controlled teaching patches
remain linked canonical assets, not fabricated gallery entries or obsolete synthetic
playground IDs.

## Qualification and deliberate limits

`npm run manual:qa` builds an isolated noindex reading fixture, then runs Chromium
against both actual static outputs under intercepted canonical HTTPS origins. It
checks routes/aliases, the finite resolver, shared shell/theme, linked groups,
five alerts, actual FAQ fragments, search kinds, native no-JavaScript disclosures,
and narrow/keyboard behavior. The
normal production build never includes that fixture. Results and screenshots name
the exact candidate under `artifacts/manual/qa/`.

The cross-host theme handoff is limited to owned site/manual HTML links. It transfers
only the existing preference and bounce side, then removes its query parameter
before first paint. Direct visits retain each origin's local preference. No cookie,
authentication or synchronization service is implied.

Automated DOM and browser evidence does not establish an actual screen-reader user
journey, live hosting, DNS, public App/Store availability or deployment acceptance.
None of those effects is performed by this foundation.
