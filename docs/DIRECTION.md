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
writes; base and immutable pinned policy are distinct from hostile diff data.

All aliases remain supported. Simple arithmetic and matching examples use normal
detail formulas; file selection and quantifier shortcuts retain their useful job.
[The complete horizon](IMPLEMENTATION-HORIZON.md) remains selected beyond these
release-candidate paths.

## Active application frontier

The complete selected product also includes a managed GitHub App, a public
read-only PR playground, and the website/documentation experience. These are now
active product Work rather than unnamed later presentation. The current candidate
now contains the first local, read-only playground and documentation-front-door
vertical under `apps/playground/`; the hosted site and GitHub App runtime are not
yet implemented or deployed.

All three surfaces use the same engine and contracts:

- the playground analyzes public PRs without applying repository effects;
- the GitHub App provides hosted operation around the same reports, plans, policy,
  and effect boundaries;
- repository-owned policy remains authoritative over hosted defaults; and
- the website renders repository-owned product and documentation sources rather
  than creating a competing wiki or semantic copy.

The open package, CLI, API and Actions remain fully capable. Hosted value comes
from operation, administration, continuity, scheduling, history, scale and support,
not from removing engine or policy capability from the open product. Reusable
software remains MIT; application and service software remains AGPL-3.0-only.

The first coherent implementation tranche establishes these application boundaries
through one useful local vertical without inventing a second semantic engine, a
repository split, or generic hosted machinery before real behavior. Its tests use
the existing fake-provider boundary; live public GitHub and browser use remain
separate qualification.

## Current release preparation

The final pass adds task-first guides and tested examples for one-file PR labeling,
local scripts, source/test signals, and opt-in comments. User documentation has a
durable editorial/source home in [Documentation design](DOCUMENTATION.md). The
selected website/documentation tranche renders these sources rather than
introducing a competing wiki.

Public technical references retain the founding choices, alternatives, research,
and earlier implementation evidence. Private activation instructions and raw
conversations are excluded from the publication history. Unique original records
were admitted once to `wolf-agents-data@de658c3` under
`workbench/diffdevil/2026-09-15/`; the consumed transfer archive is not a product
asset. The earlier complete development-history carrier is historical, not this
public source checkout.

The CLI version reads installed package metadata instead of a hardcoded development
string. Package qualification uses npm's Windows launcher dispatch on Windows and
checks an alternative release-version specimen. Workflow summaries now include
source revisions, individual raw/replacement facts, file counts, and policy metrics.
These changes do not alter measurement semantics.

## Repository layout and delivery

The product, including tests/contracts/presets, is under `src/diffdevil/`.
`actions/` owns distribution; `docs/` owns manuals/examples/research; `tools/` owns
build and qualification scripts. One package and shared semantic engine remain.
The root Action address is unchanged; sub-actions now use `/actions/analyze`,
`/actions/apply`, and `/actions/sync-labels`. Old prerelease subdirectory addresses
are intentionally not retained as duplicate root wrappers.

The public checkout itself is the delivery root. The private transfer was
consumed after durable target readback and is not needed to build or publish the
tracked tree. Application surfaces stay in the same repository and release
lifecycle, but their exact directory layout is selected by the implementation
tranche rather than frozen by this document.
[The project map](PROJECT-MAP.md) locates current ownership.

## Next release movement

The native Windows/Node 24 qualification is recorded in
[Qualification](QUALIFICATION.md). The next release seams are an independent
trust/effects read, a hosted provider canary, the first-consumer no-dual-writer
contract, and the `v1.0.0` publication path with outside-consumer proof. Current
and historical runtime/consumer evidence is separated in
[Qualification](QUALIFICATION.md); mock HTTP is not live permission evidence.

Wolf and Nyxara selected MIT for reusable software and AGPL-3.0-only for
application/service code. Original documentation prose is CC BY 4.0, runnable
examples are MIT, and brand/visual assets remain reserved. The
[licence map](../LICENSES/README.md) distinguishes those surfaces. The selected
first stable package identity is `@wolfsblvt/diffdevil@1.0.0`; local package and
lock metadata carry that candidate without creating npm or Action refs. Wolf
authorized the public source repository after this preparation; public
source/Action availability, npm availability, Marketplace listing, security intake,
and the website, playground, and GitHub App are separate observable outcomes. Do
not imply all of them happened because one Git push succeeded. Release preparation
and application implementation may move in parallel while publication remains
bound to the accepted reviewed and live-qualified candidate. No package
installation, public repository, token, label change, or publication should be
silently delegated to a user to compensate for an unfinished local implementation.

## Preserve the remaining horizon

Keep richer explanation/discovery, further measured usability improvements,
additional qualified platforms, visual identity, the website, playground, and
GitHub App in their natural product homes. The application surfaces are active
selected product, not optional polish, but their implementation still works inside
out from useful behavior rather than beginning with a hosting control plane. Do
not add a bundler merely to hide the generated file count; reconsider packaging
when it has a demonstrated consumer benefit. Do not replace selected source,
query, policy, effect, or hosted-application capabilities with a size labeler to
make the release checklist shorter.
