# Public manual source and rendering

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
source contracts and executable START/UNDERSTAND/USE/POLICY specimens; both require the built
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
supported Starlight 0.42.2 peer without rewriting the website's independent root
lockfile. A later root-toolchain update remains its own qualified source change.

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

START, UNDERSTAND, USE, WRITE POLICY/REFERENCE and Managed App/Help have forty-one
authored chapters. The accepted FAQ stays separate. Authoring comments
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
waves continue the same draft branch. The root README is the quick manual; chapter depth remains in `docs/manual/`.

## Routes, provenance and migration

Public routes, aliases, sidebar parents and disclosure defaults are literal manifest
fields. They are never inferred from repository directories. Source links name the
exact candidate commit; Edit links name its actual authoring branch. The root is
What is diffdevil, with `/start/what-is-diffdevil/` as a 308 alias.

`migration.mjs` represents every accepted moving and retained source family.
Existing guides stay current until all of a split's successors are authored. To
transfer a family, record its exact historical `fromRef`, SHA-256 and complete
`oldAnchors` (GitHub heading IDs plus `_top`) in `authoring-state.json`, select a
primary successor and map every old fragment to `{page, anchor}`. Byte-exact
pre-cutover sources live under `captures/v1/` as `.md.txt` files, keyed by their
original repository paths. The recorded Git commit remains provenance, but a
normal build reads the committed captures because the original manual branch was
squash-merged and retired. The renderer checks each capture's SHA-256 and old
fragment inventory against the recorded state, then checks each destination
against the new rendered anchors. A retired source must actually be removed;
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
Wave 3 additionally transfers the broad automation overview, recipes, CLI, Actions,
TypeScript, presets/shortcuts, templates, language overview, policies/bands and
versioning/interchange. Their 156 old fragments and ten old public routes move in
the same cut. Wave 4 completes the seven Managed App/Help pages and joins the five
detailed language sources to detail reference and symptom-led Troubleshooting. Their
complete old-fragment inventories, source IDs, inbound links and legacy routes move
together; all forty-one manual chapters are current/searchable. The release directory
keeps only its distinct maintainer map over dated notes. Final carrier-10 cross-surface
reconciliation and fresh review remain separate from this source-authoring result.
Parser architecture remains repository-owned: its old public route redirects to
the exact repository source, the finite source resolver remains available, and the
old article is no longer projected or indexed as public manual content.

## Search, FAQ and generated inventories

One Pagefind build joins selected product/legacy pages, current manual pages and
individual rendered FAQ questions. It is mirrored into both outputs, so either
origin uses a local copy without an unconfigured CORS dependency. Metadata carries
SITE, DOCS or FAQ independently of source paths. Scaffolds, legal/noindex routes,
the resolver, qualification pages and the whole FAQ page are not indexed.

`related-questions.json` stores existing FAQ IDs only. Titles are read from the
admitted `docs/manual/faq.md`; answers, stable IDs, native disclosures and the
product-shell route remain owned by that source. Missing IDs refuse. The ordinary
FAQ browser qualification runs on the combined candidate as well. It executes the
emitted handlers for both canonical hosts, including legacy-to-manual links, rather
than assuming every FAQ destination is a page in the product host. The hosted
summary reports manual and FAQ outcomes separately. Its existing qualification
artifact includes a read-only Git bundle and commit/tree receipt under
`artifacts/manual/source/`, so source history remains recoverable even after a red
qualification; that transport is not publication or evidence of a passing run.

The Policy/Reference inventories are committed inside paired edit boundaries:

```markdown
<!-- manual:generated NAME -->
... mechanically emitted Markdown ...
<!-- /manual:generated NAME -->
```

Edit authored framing outside those boundaries. Change canonical metadata, code,
schemas or catalogues for a mechanical fact, then run:

```sh
npm --prefix apps/manual run generate
npm --prefix apps/manual run check:generated
```

The renderer also refuses exact-byte drift, missing closing boundaries, duplicate
islands and malformed markers. `generated-content.mjs` updates only paired bodies,
never prose, examples, recovery advice, conclusions or migration judgment. CLI
reference remains authored and checked against real help and option declarations.
Earlier waves retain their existing dynamic presenter and example markers.

Thirteen committed blocks cover Action metadata, public exports and complete resolved
declarations, schema fields, the checked size preset, and detail operators, functions,
diagnostics, limits, environment, versions and shortcuts, plus App execution-stage
fallback codes/phases and checkout package/Action/Skill identities. Source metadata
does not prove provider publication. Public aliases, overloads,
generics, optional/readonly members and source links survive; external public
re-exports retain their dependency identity. Schema pointers and branch-local
requiredness remain explicit, with references, unions, definitions and boolean schemas
unflattened. Exact inputs and SHA-256, emitted bytes and SHA-256 are recorded in
`artifacts/manual/generated-islands.json` as reproducible build evidence, not a
second authored source registry.

Presenter specimens use the shared engine and distinguish the small 10-Changed /
16-churn input from the 178-Changed presentation input. Complete excerpts are compared
with canonical files. `wave-3.test.mjs` executes every displayed read-only CLI invocation
and six independent policy chapters, proves false versus unresolved behavior, and
checks structurally valid but semantically invalid report/policy/plan counterparts.
`wave-4.test.mjs` checks the joined source-family/fragment cut, finite router IDs,
canonical read-only troubleshooting specimens, and unchanged prior-wave/FAQ bytes
except the explicit joined detail additions. App D1 and operator-helper suites remain
the real isolated operating-contract tests, not a documentation-only simulation.
The root test discovery and this application's `test` include both waves. Tests preserve
contracts and behavior rather than prose wording.

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

## Source-family and final cross-surface cutover

All 41 chapter sources and the separate canonical FAQ are authored. Eighteen old
reader guides/language sources are retired, without Markdown forwarding stubs;
`docs/releases/README.md` retains its separate release-map job. The exact family
and anchor dispositions remain in `migration.mjs` and `authoring-state.json`.

The apex does not render old Starlight articles or another documentation homepage.
Its former selection manifest is now only the finite compatibility inventory:
manual successors receive 308s, while repository-only projections lead to exact
GitHub source. Retained specialist/raw sources have `projection` capture records
on their old routes, preserving their section destinations without redirecting
canonical technical source IDs away from their own GitHub files. Browser semantic
fragment handoff retains unrelated query parameters; no-JavaScript readers retain
native links to each mapped destination.

The repository README supplies complete first-success CLI and Action paths; the
repository documentation map routes technical readers. Product adoption pages,
header/footer, FAQ, Examples, Playground, installation prompts and download links
use the explicit manual routes. No stale path replacement guesses a self-hosting
route or a nested extension privacy page. FAQ Source/Edit actions identify its
canonical Markdown and the exact build commit/contribution branch.

The website's Skill handoff uses `/setup/skill.md`; the complete Skill tree and
five raw setup payloads keep their existing owners. Search has one current result
per selected URL: 41 manual chapters, five product pages and 20 FAQ questions.
Retired `/docs/` articles and historical/technical projections are excluded even
when an old HTML file is encountered. Legal and source-resolver routes remain
outside current search. The English Starlight i18n collection supplies the actual
manual-navigation accessible label, rather than an empty warning-suppression file.

`reconciliation.test.mjs` qualifies the final finite routes, retained-source
captures, resolver behavior, query/fragment handoff, source identities and
source-family preservation. `qa/reconciliation.mjs` adds the joined product/manual
journeys to the existing four wave suites. All screenshots are qualification
material, not a published service, Store image or approved final extension design.

The two extension and three App chapter markers are retained. `capabilities.json`
keeps published packages separate from source candidates and actual provider
observations. Dashboard and extension experience co-design, Sponsor, public host
publication, Store submission, App OAuth and history stay outside this source cut.

The source-writing history remains on one draft carrier. Exact-head evidence and
any qualification limits belong in its Return, not a frozen claim in this README.
The programme's independent final review follows the complete reconciliation
candidate; local author checks do not become that fresh review.
