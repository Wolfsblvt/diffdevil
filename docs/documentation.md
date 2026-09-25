# Documentation design and example ownership

## Meaning

This is the maintained editorial and source-ownership contract for the complete
diffdevil manual. Repository Markdown and executable examples are canonical;
GitHub and the explicit Starlight projection are reading surfaces for that source.
It explains the reader jobs, teaching order, source/route migration, generated
boundaries, availability and public joins. It is neither another API specification
nor a second page ledger: the executable manifests own exact identities.

## Three front doors with different jobs

The root [README](../README.md) is a crafted quick manual. It gives enough purpose,
trust, installation and working examples to reach first success without reading
an entire reference. It is not the complete manual or a directory of links.

[What is diffdevil](manual/README.md), at `docs.diffdevil.dev/`, starts the manual:
one replacement counted as Changed and raw churn, one engine across operating
surfaces, and a reasoned first-success choice. `/start/what-is-diffdevil/` is its
alias, not another homepage. The repository [documentation map](README.md) serves
contributors, integrators and operators, not a second public navigation tree.

The product homepage at `diffdevil.dev/` explains why the product matters and its
adoption doors: the browser extension, open CLI/Actions and optional managed App.
Examples and Playground are separate exploration routes, not an App conversion
funnel. Surface product pages explain adoption and trust; Start/Use chapters own
operation. The open package retains the complete semantic engine.

## Begin with a useful result

Teach the small replacement distinction before the type system. PR size labeling
is an easy visible result, not the product definition. Start pages carry one
complete outcome, prerequisites, expected observation and first useful repair.
Surface pages explain operation; categories explain the choice between their
children rather than displaying only links. Concepts distinguish tempting wrong
interpretations, references explain exact contracts, and Help routes symptoms back
to the reader's original task.

The selected reading order is **START**, **USE DIFFDEVIL**, **WRITE POLICY**,
**UNDERSTAND**, **REFERENCE** and **HELP**. Exact pages, independent public routes,
category links, default disclosure state and aliases live in
[`apps/manual/manifest.mjs`](../apps/manual/manifest.mjs), not an inferred mapping
from filenames. Linked categories and their disclosure controls remain separately
focusable. Current ancestry opens; other groups retain their declared defaults.

Policy teaching follows one small continuing story while every chapter supplies a
complete independently runnable file. Prefer ordinary expressions for arithmetic
and useful file shortcuts for collection/selection boilerplate. Preserve working
aliases and capabilities rather than reducing the language to simplify a page.

Keep facts, policy decisions, desired effects, attempted requests and observed
provider state separate. Changed is not raw churn, unknown is not zero or false,
and a count does not establish quality, risk, importance or merge authority.
Operational prose is plain; [branding](branding.md) owns names, not a mascot voice
for command examples.

## Own examples as executable assets

The complete `docs/examples/diffs/review.diff` is the **10 Changed / 16 raw churn**
teaching patch, with source, test, documentation and lockfile blocks. The separate
**178 Changed** report/policy specimen supplies the shared presenters. Neither may
borrow the other's expected output.

Every copyable example names its complete asset, consumer, prerequisites, selected
version, source and policy, expected semantic result, and relevant failed,
unresolved or held outcome. Put the complete file before variants. Excerpts link
the canonical full file. Do not hide permissions, write consequences, uncertainty
or recovery in a collapsed block.

[`docs/examples/catalogue/`](examples/catalogue/README.md) is the single real-PR
catalogue consumed by Examples, Playground and manual links. Both `example` and
`variant` select a frozen source edition and policy. The combined asset key is not
a substitute URL contract. Live refresh creates a different observation; it does
not silently replace a lesson. Controlled engine fixtures never become supposedly
real gallery entries. Provenance and rights travel with each source edition.

The website, manual, CLI/Action summaries, Skill and Playground consume shared
presenters or canonical structured artifacts. They never maintain another semantic
display model. `src/diffdevil/tests/examples.test.mjs`, manual wave tests and the
installed-package/Action consumers qualify actual source assets. Fake HTTP proves
its exercised boundary, not live permissions. Parsing a PowerShell script on Linux
does not qualify its Windows execution. Tests preserve behavior and complete
examples, not fixed narrative wording or a quota of assertions.

## Keep one canonical source per responsibility

`docs/manual/` owns the 41 manual chapters and the separately authored canonical
FAQ. The FAQ renders only at `diffdevil.dev/faq/`, in the product shell without a
manual sidebar. Stable question IDs survive title edits, and one question is one
search record. The manual links those questions instead of rewriting answers.

The complete `skills/diffdevil/` folder remains the installed Skill, with its own
version, references, notices and update contract. `/skill/SKILL.md` is a reading
projection, not the whole installation. The five `docs/setup/*.md` payloads remain
canonical task instructions; deterministic raw-route rendering refuses unresolved
bindings. Website handoffs point to those instructions, not a second installer.

[`apps/manual/migration.mjs`](../apps/manual/migration.mjs) owns source-family
consequences and [`authoring-state.json`](../apps/manual/authoring-state.json)
records exact historical bytes, successor anchors and selected route transfers.
All selected old reader guides and language chapters have transferred. The release
README retains a distinct maintainer-map job; component, operator, security,
privacy, licensing, catalogue and dated evidence sources keep their specialist
homes. No forwarding Markdown stubs remain.

The apex no longer renders a competing manual. Its old
[`docs-manifest.mjs`](../apps/website/docs-manifest.mjs) is a finite compatibility
inventory only. Manual successors receive emitted 308s; remaining technical and
historical projections lead to exact GitHub source. Retained raw/specialist sources
keep their own source-resolver identity even when their former public article
moves. Each affected old section has an explicit semantic destination. A server
cannot inspect a fragment: browser handoff preserves the query, and native
compatibility links remain available without JavaScript.

## Generate inventories, not explanations

The 13 paired generated islands derive from Action metadata, public exports and
resolved declarations, schemas, presets, detail catalogues, App execution phases
and source version identities. Authored framing, workflows, concepts and recovery
remain outside their boundaries. The generator refuses drift, missing or duplicate
markers and malformed pairs. Exact inventories do not replace a useful reference.
CLI reference stays authored and is checked against executable help.

The renderer selects only manifest sources, never `docs/**` wholesale. Source links
use the exact build commit; Edit links target the named contribution branch.
Technical links pass through the finite `/source/?f=<stable-source-id>` resolver.
Unknown IDs, arbitrary paths, external destinations and ambiguous selections are
refused rather than interpreted as a URL template.

## Join the public reading experience

Product and manual share the Works shell, header, footer and theme behavior.
`www.diffdevil.dev/*` is a matching-route 308 to the apex; the App host stays
separate. One Pagefind build joins **SITE**, **DOCS** and question-level **FAQ** and
is mirrored into the two static outputs. Legacy, technical, historical, legal,
resolver and qualification pages do not become default current search results.
Legal routes retain their separate noindex/nosnippet posture.

Theme initializes before paint. Owned site/manual HTML links carry only the theme
preference and bounce side, preserving unrelated query and fragment data. Direct
visits use origin-local storage. No cross-host authentication, account state,
cookie or synchronization service is introduced.

Keep comfortable reading width, all five alert meanings, visible focus, keyboard
operation, reduced motion, forced colors, zoom and narrow-screen reflow. Wide code
and tables may scroll internally; the page must not. The real Starlight English
i18n record names the manual navigation for assistive technology; it is a used
label, not an empty declaration added to silence a warning.

## Availability and design boundaries

Each of the two extension and three App chapters retains one top-only
**In development** NOTE while the complete selected public capability is not
usable. The FAQ has its existing grouped note. Read the complete page and governing
source/provider evidence before changing a marker. Do not remove accepted
capabilities, fabricate Store availability or call a deployed backend a completed
administrator journey to reduce the marker count.

[`apps/manual/capabilities.json`](../apps/manual/capabilities.json) records the
remaining exact source/availability dependencies. Published CLI/API/Action use,
current source, corrected open candidates, contained provider observations,
selected future capability, historical release accounts and genuinely undefined
commercial or adapter details are different standing. A configured destination
or source version is not publication. The earlier deployed measurement Playground
is not the complete richer public website.

Final dashboard wording, controls, layout, experienced routes and first journey
remain owner co-design. Final extension in-place presentation and Store imagery
consume accepted functional source plus its separate co-design result. Support and
Sponsor remain separate source/design work. Fixture scenes and Store-kit captures
are labeled source/design evidence, never live-use proof or final visual authority.
Self-hosting stays findable through its supported Workers/Queue/D1 guide without
becoming the main adoption route.

## Qualification and publication

The complete continuing candidate includes README, maps, homepage, product and
install/download links, all source-family transfers, redirects/fragments, search,
theme, Source/Edit and executable examples. Source generation, root verification,
package/Action consumers, both static builds and affected browser journeys each
supply their own evidence on its exact final head. The fresh independent docs
review follows authoring; it is not simulated by the author's checks.

Exact evidence, limitations and current candidate custody live in the contribution
Return. The source contract does not claim a check ran merely because it names one.
Publication, remote preview, DNS, website deployment, Store/App release, OAuth and
history activation remain separate effects. [Component rights](../LICENSES/README.md)
apply independently to reusable software, applications, prose, examples and visuals.

## Package front-door consolidation

The root README is also the npm package's actual front door. The unused
`docs/package/README.md` template is retired: its install/query/Skill/effect and
compatibility explanation is owned by the root quick manual and the corresponding
canonical manual/Skill sources. No packer consumed that template and it had no
selected public route or stable resolver ID. Git retains its authored history;
there is no forwarding Markdown replacement and no second package manual.

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
