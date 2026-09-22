# Public manual foundation

## Meaning

The maintained Markdown is `docs/manual/`. This application renders only the
explicit pages in `manifest.mjs` at `https://docs.diffdevil.dev/`. The product site
and its admitted FAQ remain in `apps/website`; the FAQ is not a second manual page.
Application source here is AGPL-3.0-only. Documentation, examples and visual assets
keep their separate rights in the repository's licence map.

## Build and inspect

From the repository root, use `npm ci --ignore-scripts`, then `npm run website:build`.
This builds the engine and product site, then the website's build hook builds the
manual and one joined Pagefind index. Output is `artifacts/website/dist` and
`artifacts/manual/dist`. Neither command deploys anything. Ordinary `npm run verify`
uses this same two-host build through `check:website`.

Manual-only commands belong to this application, not the reusable package's metadata:

```sh
npm --prefix apps/manual run check
npm --prefix apps/manual test
npm --prefix apps/manual run test:projection
npm --prefix apps/manual run dev
npm --prefix apps/manual run qa
```

`check` builds the engine and checks the actual manual renderer. `test` checks the
source contracts and executable START/UNDERSTAND/USE specimens; both require the built
engine. `test:projection` additionally requires the prepared toolchain
and built engine. `dev` serves the manual on loopback port 4322. `qa` starts from an
ordinary two-host production build and creates the isolated reading qualification
build described below. The root package and its Action distribution are unchanged
by these application-only commands.

The manual consumes the exact accepted `Wolfsblvt/starlight-works` source commit
`22d4567006ec7a33d890fab2f3d3515332498a90` through that repository's own build and pack
commands. It is not an npm publication. `npm --prefix apps/manual run toolchain`
records source and consumer receipts under `artifacts/manual-toolchain/`. The package
supplies linked sidebar groups and the five GitHub alerts; this repository does not
copy their implementation. The manual's isolated dependency graph supplies its
supported Starlight 0.42.2 peer without upgrading the accepted website's locked
Starlight 0.42.1 graph.

The source package is unpacked from its verified local tarball and installed with
`--install-links`, not linked into a sibling repository. Direct consumer versions
are pinned. The child lock is generated, retained with each qualification artifact,
and reused by subsequent preparations of that checkout. A clean preparation resolves
a new transitive graph and must earn its own evidence; it does not reproduce an
earlier graph merely because the source SHA is unchanged. The exact Git coordinate
and package receipt govern the unpublished package. `DIFFDEVIL_DOCS_OFFLINE=1` requires
a previously prepared source/dependency cache and refuses to download it. A clean
checkout needs one online preparation. `npm --prefix apps/manual run verify:offline`
sets that control while running ordinary root verification.

## Author a chapter

Keep one H1 matching its manifest title and ordinary GitHub-readable Markdown.
Relative links name maintained sources; the AST projection maps them to explicit
public routes or the finite source resolver. Code blocks are never rewritten.
Register public images in `assets.json`; the build copies only those assets.
Full working examples stay open. Secondary variants may use native disclosures.

START, UNDERSTAND and the open USE surfaces have twenty-one authored chapters.
The thirteen Policy/Reference and seven Managed App/Help chapters remain scaffolds; the accepted FAQ stays separate. Authoring comments
are removed from the renderer, and readiness is private build state in
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
activated merely because a replacement file exists. Every emitted retired route
must have its explicit transfer, and selected source fragments must resolve. The
resolver preserves old source IDs and can direct an old fragment to a different
member of a split. Explicit filename aliases preserve selected pre-rename technical
source IDs; unknown casing, paths and URLs still refuse.

The build emits a small Cloudflare Pages advanced-mode `_worker.js` handler in each
static output. It delegates ordinary requests to `env.ASSETS.fetch` and applies the
selected matching-route `www` to apex 308 and exact route aliases. This uses the
[native handler contract](https://developers.cloudflare.com/pages/functions/advanced-mode/),
because [domain-level redirects are not supported in `_redirects`](https://developers.cloudflare.com/pages/configuration/redirects/).
The accompanying `_redirects` files contain path rules only. Noindex HTML aliases
retain a usable link in plain static previews and preserve query/fragment when
JavaScript is enabled. No Markdown source forwarding files are written.

Browser qualification executes the emitted handler against a local static-assets
binding. Redirect journeys use real loopback HTTP: canonical status and Location
are recorded before adapting only the transport origin, and the browser carries
fragments across the actual 308 responses. Host adoption and live HTTP readback
remain separate from this build. No hosting or DNS operation occurs.

Wave 2 retires the old auto-label guide, local-automation guide and Playground
visitor guide. Their complete successor sets are authored; all old fragments,
source IDs, inbound links, three legacy public routes and search ownership move
together. Playground operator requirements remain in `apps/playground/README.md`.
CLI, Actions, TypeScript, templates, language and the broad automation overview
retain their old source ownership until their remaining Policy/Reference successors
are authored. Thirteen manual pages are now current/searchable; authorship of the
other eight completed chapters does not bypass their unfinished source families.

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
`presenter-first-plan`, `presenter-report` and `presenter-plan`. These read the actual built CLI/API, Action
metadata and canonical contracts/catalogue; they are not another manually maintained
reference. Source links remain useful when reading on GitHub. Schema fields and
language catalogues are mechanical inventories, not a claim that structural validity
establishes semantic validity. Preset expansion is checked against the canonical
preset through the real compiler. Presenter specimens execute the real CLI and keep
the small 10-Changed/16-churn input distinct from the 178-Changed presentation input.
A command failure fails generation. `wave-1.test.mjs` also exercises scalar/check
exits, incomplete paths, held plans, the admitted extension projection, catalogue
identities and exported CLI replay. Open workflow, policy and shell blocks are
checked against their complete canonical example files, not phrase-locked prose.

The real-PR catalogue remains the one shared `docs/examples/catalogue` family.
Playground links carry separate `example=<id>&variant=<id>` parameters; the
combined `example--variant` key names an asset, not the public query contract. Controlled teaching patches
remain linked canonical assets, not fabricated gallery entries or obsolete synthetic
playground IDs.

## Qualification and deliberate limits

`npm --prefix apps/manual run qa` builds an isolated noindex reading fixture, then
runs Chromium against both actual static outputs under intercepted canonical HTTPS
origins and loopback HTTP for redirects. It checks routes/aliases, the finite
resolver, shared shell/theme, linked groups, five alerts, actual FAQ fragments,
search kinds, native no-JavaScript disclosures and narrow/keyboard behavior.
The normal production build never includes that fixture. Results and screenshots
name the exact candidate under `artifacts/manual/qa/`. The authored first-success
journey opens the retained PR lesson through its manual link, changes an exclusion,
exports separate valid report and plan JSON, inspects the saved-report CLI commands,
and rejects malformed public input. It checks actual authored pages at 1280 and
320 pixels. Set `PLAYWRIGHT_EXECUTABLE_PATH` to use an existing Chromium binary.

The cross-host theme handoff is limited to owned site/manual HTML links. It transfers
only the existing preference and bounce side, then removes its query parameter
before first paint. Direct visits retain each origin's local preference. Same-page
fragment controls are not rewritten. No cookie, authentication or synchronization
service is implied.

Automated DOM and browser evidence does not establish an actual screen-reader user
journey, live hosting, DNS, public App/Store availability or deployment acceptance.
None of those effects is performed by this foundation.

## Wave 2 return boundary

The ten open-surface/shared-workflow chapters are authored as one operating family.
The three Managed App pages and all later-wave scaffolds are unchanged. The complete
Skill tree, raw setup sources, real-PR catalogue and presenters remain their original
canonical sources. The raw `/setup/skill.md` route now serves its already-maintained
setup file rather than inventing a second installer.

The inherited Windows consumer defect selected more than one native executable with
`Get-Command`. Its same-carrier correction selects the first result, while the full
installed-package test still covers Windows PowerShell 5.1 and PowerShell 7, paths
with spaces, literal UTF-8/NUL path handling, and exits 0/1/2/3. No test is skipped or
weakened. The temporary source-bundle workflow transport is removed.

`wave-2.test.mjs` executes the complete report lifecycle and the actual two-step
Action against fixture HTTP, including reacquisition and stale-source refusal. It
checks complete example bytes, separate label/comment effects, finite migration,
sidebar identity and unpinned npm installation snippets. Package qualification
compiles and executes `docs/examples/library/inspect-change.mts` outside the checkout
against the packed installation, including exact, bounded, incomplete and invalid
inputs. The library and canonical shell consumers remain packaged with the reusable tool.

`qa/wave-2.mjs` checks all ten built articles at desktop and narrow widths, their
open complete examples, admitted settings image, shared-workflow links, raw Skill
setup, retired source/fragment destinations and selected search records. The common
suite also exercises emitted 308 handlers, themes, five alerts, FAQ and no-JavaScript
reading. Provider installation/publication and an actual screen-reader journey are
not claimed by these tests.

At this authoring boundary, extension source is admitted but Store publication is
not established. Extension PR #45 at `5efea7761121d96cad29922158af8d5949cf30d7` is an
open launch-target candidate, not adopted source. Full configurable Playground
source and a deployed measurement-only service remain different availability
claims. The enhanced CLI presenter must exist in the selected released executable;
plain npm installation is not pinned to an old package to disguise that release
boundary. The Skill's version, release manifest and archive availability remain
independent. None of these facts authorizes publication or widens the App wave.

Continue on this same draft carrier for Policy/Reference. Re-read the exact head
and hosted results returned in the PR discussion, preserving any later correction;
this document intentionally does not contain its own commit hash. Three source
families have transferred, not the whole manual. Final README compression, remaining
retirements, whole-manual review and live host adoption remain later work.
