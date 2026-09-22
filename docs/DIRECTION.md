# diffdevil direction

## Meaning

The complete destination remains a portable diff-policy engine, with useful
language-free entry points and full detail depth when needed. This document owns
the current implemented frontier and the active release and application work.
The Vision is not redefined as whichever first example was easiest to ship.

## Current product frontier

The shared engine serves local Git, unified diffs, saved reports, and GitHub PRs.
It provides raw and replacement-aware line facts, file facts and scopes, correlated
bounded evidence, detail parsing/binding/type checking/evaluation, JSON/YAML policy,
queries, checks, bands, plans, and optional managed labels and owned comments.
The CLI and typed public exports are installed-package tested.

The root, analyze, apply, and sync-labels Actions share one host and engine. Their
committed native-ESM distribution runs without a consumer install. Root no-config
uses `size@1`, creates missing definitions, reconciles only its managed group, and
posts no comments. Analyze is read-only. Workspace policy cannot authorize Action
writes; base and immutable pinned policy are distinct from hostile diff data. An
optional `policy-token` confines trusted base/pinned policy and relative-template
reads to a separate credential; PR acquisition and all effects remain on
`github-token`, while omitting the new input preserves the single-token route.

All aliases remain supported. Simple arithmetic and matching examples use normal
detail formulas; file selection and quantifier shortcuts retain their useful job.
[The complete horizon](implementation-horizon.md) remains selected beyond these
release-candidate paths.

## Active application frontier

diffdevil remains an open-source CLI, TypeScript library, and workflow Actions tool.
The managed App is an optional convenience for adopters, not the product's centre.
The public playground is a separate free learning and configuration experience.

The three ways to operate diffdevil are: run it yourself (CLI, TypeScript API, GitHub
Actions), bring Changed into GitHub (the browser extension, *diffdevil for GitHub*: a
personal in-place view with no repository installation, workflow or write access), and
let it run for you (the GitHub App: repository-level managed operation). The public
website presents them in that order, makes the extension the easiest adoption route and
its primary action, and keeps the open package visibly first-class. The playground is
the trial surface, not a fourth route. The public category descriptor is *Composable
diff analysis and automation for GitHub and the CLI.*

Current source now contains the complete local-first Chrome extension under
`apps/browser-extension/` and the reusable browser entry under
`src/diffdevil/browser/`. Its exact-head browser and repository verification is green,
including an installed Manifest V3 worker and native Chrome storage. Live authenticated
GitHub journeys, Windows interactive accessibility, native writable-label readback,
managed-App report delivery, Store submission and publication remain separate release
acceptance and provider effects.

Current source contains the first read-only measurement playground under
`apps/playground/`, backed by the shared engine and versioned response contract.
That exact application is live at
[`diffdevil-playground.wolfsblvt.workers.dev`](https://diffdevil-playground.wolfsblvt.workers.dev)
on Cloudflare Workers. It establishes the shared-engine browser measurement route,
not the complete configurable playground or commercial service.

The managed GitHub App runtime is also live on Cloudflare Workers and installed only
on `Wolfsblvt/wolf-leitsatz`. Its contained canary exercised the native check,
managed-label, and persisted operational-result path, then restored the repository to
its pre-canary state. This establishes the managed transport and one installed-repository
lifecycle, not the dashboard, broader repository admission, complete history,
offboarding/export, settled product limits, or commercial service.

The selected implementation direction is now explicit:

- Retain `.diffdevil.yml` as the single conventional repository file. Keep current
  explicit configuration, trusted policy sources, and Action step-level overrides.
  Do not introduce automatic `<owner>/.github` policy discovery.
- Extend shared lowering for partial convenience settings while preserving explicit
  declaration/array semantics. App account/organization defaults sit below
  repository overrides; Actions do not inherit dashboard settings. The exact
  current-versus-selected boundary is in [presets and shortcuts](integration/presets-and-shortcuts.md#configuration-layering).
- Build the [complete managed App](integration/github-app.md): installation and
  preset setup, account/organization administration, effective policy and origins,
  labels, owned comments, native check summaries, and optional history.
  `Checks: write` belongs to the selected App permission contract. Earlier omission
  from the first canary is not a removal of that functionality.
- Keep the [playground](integration/playground.md) public, unauthenticated, read-only,
  and independent of App history. Carry curated examples, configuration editing,
  terminal/agent/GitHub-preview/explanation views, and portable exports through one
  shared engine. Provide its own page and a compact homepage entry.
- Implement the [data boundary](PRIVACY-AND-DATA.md): seven-day recovery records;
  opt-in aggregate and pathless per-file numeric history; thirty-day free history;
  paid history without automatic age expiry while its entitlement/service remains
  active, subject to explicit deletion and disclosed limits. No permanent history
  is collected before opt-in. Prices and usage quotas are not a commercial offer.
- Target Cloudflare Workers, Queues, and D1 directly rather than first building a
  temporary VPS-specific App. Keep application logic and persisted meaning outside
  provider bindings, retain Node consumers, and qualify useful export/import.
  Avoid a second complete operating stack or generic provider framework.
- Keep App, website, playground, and service source in this repository under the
  AGPL application boundary. Self-hosting is intentional and documented, not the
  primary homepage pitch. The reusable software remains MIT.

The public website source now exists under `apps/website/`: the accepted homepage,
the complete configurable playground running the shared engine in the browser,
the examples catalogue with frozen fixtures and captured real-PR snapshots, the
manual rendered from the repository's own Markdown, the public App page, and the
legal/privacy routes. It is built and qualified locally only. It is not deployed,
remotely previewed, routed or exposed; publication is a separate decision after
the remaining accepted sources (the Agent Skill, the setup instructions and the
researched curated catalogue) are admitted through their own Work. The playground
API gained `/api/report` and `/api/head` for browser-side replay and freshness;
the live Worker still serves the earlier contract until it is redeployed.

The live playground and managed App Workers consume the same static, bundler-visible
generated validator boundary as Node and the Actions. The hosted applications reuse
that portable engine boundary rather than introducing a hosted engine fork.

The live measurement playground qualifies one operating path before the dashboard
and all richer views exist. It does not satisfy the complete App or playground
outcome. Carry the
remaining user journeys through implementation and qualification, rather than
reclassifying them as optional polish or requiring the product to be designed again.
The owning workplace carries current assignments and returns; these documents
carry the selected product contract.

## Current release preparation

The final pass adds task-first guides and tested examples for one-file PR labeling,
local scripts, source/test signals, and opt-in comments. User documentation has a
durable editorial/source home in [Documentation design](documentation.md). The
selected website/documentation tranche renders these sources rather than
introducing a competing wiki.

Public technical references retain the founding choices, alternatives, research,
and earlier implementation evidence. Private activation instructions and raw
conversations are excluded from the publication history. Unique original records were admitted once to the Company's private data
archive; private repository and path coordinates are intentionally not part of
this public product documentation. The consumed transfer archive is not a product
asset. The earlier complete development-history carrier is historical, not this
public source checkout.

The CLI version reads installed package metadata instead of a hardcoded development
string. Package qualification uses npm's Windows launcher dispatch on Windows and
checks an alternative release-version specimen. Workflow summaries now include
source revisions, individual raw/replacement facts, file counts, and policy metrics.
These changes do not alter measurement semantics.

## Repository layout and delivery

The reusable product core, including its tests/contracts/presets, is under
`src/diffdevil/`. `apps/playground/` owns the AGPL application adapter, public assets,
application response contract and focused tests. `actions/` owns distribution;
`docs/` owns manuals/examples/research; `tools/` owns build and qualification scripts.
One package and shared semantic engine remain.
The root Action address is unchanged; sub-actions now use `/actions/analyze`,
`/actions/apply`, and `/actions/sync-labels`. Old prerelease subdirectory addresses
are intentionally not retained as duplicate root wrappers.

The public checkout itself is the delivery root. The private transfer was
consumed after durable target readback and is not needed to build or publish the
tracked tree. Application surfaces stay in the same repository and release
lifecycle, but their exact directory layout is selected by the implementation
tranche rather than frozen by this document.
[The project map](PROJECT-MAP.md) locates current ownership.

## Current release standing

The stable open-tool release is complete from exact `v1.0.0` source snapshot
`0827485`: npm `@wolfsblvt/diffdevil@1.0.0`, immutable `v1.0.0`, the GitHub
Release, and maintained Action alias `v1` are read back. A fresh Windows Node 24
consumer installed and exercised the registry artifact outside every checkout.
Both immutable `v1.0.0` and maintained `v1` then exercised the root, `analyze`,
`apply`, and `sync-labels` Action entries through the public refs. Current and
historical runtime/consumer evidence remains separated in
[Qualification](qualification.md).

The [GitHub Marketplace listing](https://github.com/marketplace/actions/diffdevil)
is public for `v1.0.0`, owned by `Wolfsblvt`, with **Continuous integration**
and **Utilities** as its categories. Release-ref Action execution is now observed;
external-fork and live partial-write journeys remain separate unobserved provider
claims. Source, npm, Action refs, Marketplace, the live playground, and the
managed App remain independent observable outcomes.

Wolf and Nyxara selected MIT for reusable software and AGPL-3.0-only for
application/service code. Original documentation prose is CC BY 4.0, runnable
examples are MIT, and brand/visual assets remain reserved. The
[licence map](../LICENSES/README.md) distinguishes those surfaces. Wolf authorized the
public source repository and the v1 publication after this preparation. Public
source, npm, Action refs, Marketplace listing, security intake, and the website,
playground, and GitHub App remain separate observable outcomes. Do not imply all
of them happened because one Git push or release succeeded. Application
implementation continues independently around the same engine and contracts.

## Preserve the remaining horizon

Keep richer explanation/discovery, further measured usability improvements,
additional qualified platforms, visual identity, the website, playground, and
GitHub App in their natural product homes. The application surfaces are optional adoption routes but active selected
implementation, not optional polish. Their implementation still works inside
out from useful behavior rather than beginning with a hosting control plane. Do
not add a bundler merely to hide the generated file count; reconsider packaging
when it has a demonstrated consumer benefit. Do not replace selected source,
query, policy, effect, or hosted-application capabilities with a size labeler to
make the release checklist shorter.
