# diffdevil public website

## Meaning

This application owns the product front door, the browser-based Playground, real-PR
Examples, public extension/App explanations, canonical FAQ, legal routes and agent
setup/download handoffs. It uses the same engine, policies, reports and presenters
as the open CLI/library/Actions. It is not the authenticated dashboard or a second
manual: `apps/manual/` renders the selected `docs/manual/` chapters on their own host.
A source build, fixture scene or local browser check does not establish deployment,
Store availability, an ordinary installed extension journey or a public managed App.

## Build and use locally

From the repository root:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run website:build
npm run qa:website
npm --prefix apps/manual run qa
node apps/website/qa/faq.mjs
```

`website:build` builds the engine, derives product assets, projects the FAQ and exact
source provenance, builds this site, then builds the manual and one joined Pagefind
index. The two outputs are `artifacts/website/dist/` and `artifacts/manual/dist/`.
The [manual toolchain](../manual/README.md#build-and-inspect) needs its selected
source dependency and first online preparation; an offline run must have that exact
prepared dependency graph. It does not silently replace the shared package.

`npm run website:dev` serves the product site locally. `website:preview` previews
already-built files on the local machine; neither command publishes a remote preview.
`qa:website` operates the built product and a loopback Playground API with a fake
GitHub boundary. The manual and FAQ suites exercise their actual emitted handlers,
canonical origins, search, accessibility and fragment behavior. Results describe
exact candidates and exercised boundaries, not live services. See
[Development](../../docs/DEVELOPMENT.md) for the complete command contract.

## Sources and hosts

The product site is `https://diffdevil.dev/`; `www.diffdevil.dev` is the matching-path
308 compatibility host. The manual is `https://docs.diffdevil.dev/`, whose root is
**What is diffdevil**. The FAQ is only `https://diffdevil.dev/faq/` and has no manual
sidebar. `https://app.diffdevil.dev/` remains the selected managed application Home,
not a static-site route or evidence that authenticated administration is usable.

`apps/manual/manifest.mjs` owns explicit chapter routes. `docs-manifest.mjs` here is
only the finite legacy apex inventory: selected old article URLs redirect to their
manual successors; seven repository-only projections redirect to exact GitHub source.
Its old sidebar groups are compatibility inventory, not current navigation. The
ignored apex chapter collection and its old content-loader are retired. No broad
`docs/**` publication or Markdown forwarding stubs replace them.

One Pagefind build indexes the five product reading routes, all forty-one current
manual chapters and each of the twenty FAQ questions, then mirrors the same index
into both hosts. There is no whole-FAQ hit, legacy `/docs/` hit or technical/history
spill. Legal, resolver, error and qualification pages stay outside current search.
The real Starlight manual owns its English navigation label; this product site does
not retain a spare Starlight/i18n collection.

The shared header, footer and before-paint theme code are used by both applications.
Theme handoff carries only the allow-listed presentation preference and removes its
transport parameter. It creates no account state, shared authentication or sync
service. Source links select the build's exact commit and Edit links select the
contribution branch. Non-manual technical links use the finite `/source/?f=...`
resolver; arbitrary paths, URLs, unknown IDs and duplicate selector parameters refuse.

## Product routes and shared examples

The homepage presents the accepted three operating choices: run it yourself, bring
Changed into GitHub, or let the GitHub App run for a repository. The open package
remains first-class. The extension keeps its selected prominent position without a
fictional Store link. The Playground remains a separate trial route reached through
the header, hero and measurement explanation, not a fourth operation card.

`/examples/` and `/playground/` consume `docs/examples/catalogue/`: seven real PRs,
sixteen variants and explicit frozen source editions. Links carry both `example`
and `variant`; live refresh is a separate edition. Controlled engine fixtures remain
teaching/test inputs and never become public gallery provenance. Catalogue guides
are rendered in the selected Playground result rather than copied into essays.

Narrative terminal/agent specimens execute the real CLI and shared presenters through
`src/lib/cli-specimen.ts` and `src/lib/specimens.ts`. The small introductory replacement
and the separate 178-Changed report keep their own semantics. A failed specimen fails
the build. Policy and desired-plan projections do not imply provider application;
illustrative effect results remain explicitly distinct from live-use proof.

## Extension and managed-App standing

`/extension/` explains complete adoption, measurements, policy provenance, inspection,
Settings and data boundaries. Its top **In development** note remains until the full
selected public capability is usable. The semantic HTML scenes and committed Settings
captures are source/design illustrations, not proof of a signed-in GitHub journey or
final Store imagery. The accepted functional correction and the final in-place design
have separate admission boundaries. Do not harden report placement, interaction or
Store imagery from these fixtures.

`/app/` explains why managed operation may help, its relationship to open tooling,
effective policy, independent installation/execution/history states, recovery and
self-hosting. Its top note distinguishes implemented/deployed backend components from
the complete public service. Dashboard wording, controls, experienced routes and the
first administrator journey remain co-design. No fixture supplies those decisions.
Selected history tiers do not invent published prices, quotas, billing or commitments.

Store, App installation, dashboard, community and Sponsor actions consume explicitly
configured destinations through `ActionLink`; unconfigured actions remain visibly
unavailable. Host selection alone does not configure an install destination.
Support/Sponsor composition remains its separate co-design/source work.

## Agent setup and downloads

The complete `skills/diffdevil/` tree is the canonical install artifact. The raw
`/skill/SKILL.md` route is a reading projection of its core, not a complete installation.
The independent Skill version comes from source metadata. The homepage handoff uses
`/setup/skill.md`, so references, notices, version/digest verification and persistent
client discovery remain in the canonical installer instructions.

All five `docs/setup/{skill,cli,actions,app,everything}.md` payloads are served through
deterministic binding and unresolved-token refusal. The copied intent links to the
corresponding raw instructions; human explanations remain in the manual. Executable
access is established separately from Skill reading or persistent installation.

Downloads consume the shared release metadata and manifest contract, not another list
of versions or guessed archive URLs. Stable Skill/runtime assets that are not published
remain unavailable even when a local build can produce them. Build/package source,
release attachments and a successful installation are separate observations.

## Layout

| Path | Responsibility |
| --- | --- |
| `astro.config.mjs` | Static Astro product pages, React Playground and shared-engine aliases. |
| `src/pages/` | Product, Playground, Examples, extension, App, FAQ, resolver, legal and raw setup/download routes. |
| `src/components/` | Shared header/footer/search/theme, configured actions and source-backed product illustrations. |
| `src/components/home/` | Homepage sections and executable/shared-presenter specimens. |
| `src/islands/playground/` | Input, policy editing, comparison, result views and portable exports. |
| `src/data/` | Keyed copy, selected origins/routes, configured destinations and icons. |
| `src/lib/` | Engine access, catalogue and agent-source consumers, rendering, search and presentation helpers. |
| `src/styles/` | Accepted tokens, fonts and product/reading grammar, including mappings used by the manual. |
| `src/shims/` | Browser implementations for the engine's selected Node imports. |
| `docs-manifest.mjs` | Finite legacy route/source inventory, not an active manual. |
| `src/generated/` | Ignored FAQ and exact source-provenance projections; never separately authored. |
| `public/` | Static files plus ignored derived brand assets. |
| `qa/` | Product and FAQ browser qualification; the manual suite owns joined reading journeys. |

## Assets and legal surfaces

The canonical identity SVGs remain under `design/assets/identity/`; the asset builder
produces ignored icons/rasters with its checked framing. Reuse the accepted icon family
and existing shared imports instead of drawing feature-local substitutes. Rendered
Store/source imagery retains its provenance and does not become live-use evidence.

Legal pages are public but `noindex, nosnippet` and excluded from site search. Product
data/security links lead to the manual and its maintained authorities; the website
privacy page owns website processing only. The operator notice points to its real
Company source rather than inventing legal identity or terms here.

## License

Application software is AGPL-3.0-only, the reusable engine is MIT, documentation and
reserved visual rights follow the [component map](../../LICENSES/README.md), and
third-party fonts retain their own notices.

## Setup and download build inputs

`apps/website/setup-render.mjs` binds the five canonical `docs/setup/` payloads.
`PUBLIC_ORIGIN` uses the configured public site origin. `APP_INSTALL_URL` and
`APP_DASHBOARD_URL` use `PUBLIC_APP_INSTALL_URL` and `PUBLIC_DASHBOARD_URL`. Missing
App destinations produce an explicit unavailable response at `/setup/app.md`;
unknown tokens and invalid URLs fail instead of leaking placeholders. GitHub
Actions expressions remain unchanged. `/skill/SKILL.md` remains a byte-identical
reading projection, not a complete installation.

`/downloads/skill/`, `/downloads/standalone/` and `/downloads/bundled/` consume the
existing `tools/build-release.mjs` manifest keys. A later publication operation
may supply `DIFFDEVIL_PUBLISHED_RELEASE_MANIFEST` as the local path of that exact
manifest after publication and asset readback. It must not bind a merely built
unpublished candidate. No binding means a visible unavailable state, not a guessed
archive URL. Versions, sizes, digests and destinations come from the manifest;
the site performs no publication or runtime discovery. These utility pages stay
out of joined current search.
