# Repository documentation

## Meaning

This is the repository's technical documentation map, not another public manual
homepage. It routes contributors, integrators and operators to maintained design,
executable contracts, component homes and dated evidence. User operation lives in
the [complete manual](manual/README.md); its canonical standalone
[FAQ](manual/faq.md) answers adoption and trust questions.

## Develop and understand the product

| Question | Maintained source |
| --- | --- |
| Why does this product exist, and where is it going? | [Vision](VISION.md) and [current direction](DIRECTION.md) |
| What lives where? | [Project map](PROJECT-MAP.md) and [architecture](ARCHITECTURE.md) |
| How do I restore, build, run or verify it? | [Development](DEVELOPMENT.md) |
| Why were consequential choices made? | [Decisions](DECISIONS.md) |
| Which behavior is exercised, and which is still unobserved? | [Qualification](qualification.md) |
| Which tools share versions, and how do updates work? | [Release families and versioning](RELEASING.md), including the [App-family release manifest](RELEASING.md#app-family-release-manifest-and-its-consumers), and [reader release guidance](manual/help/releases.md) |
| How are authorized releases published and read back? | [Publication boundary](publication-boundary.md) |
| What owns the manual's prose, routes, examples and migration? | [Documentation design](documentation.md) and [manual application](../apps/manual/README.md) |
| What owns wording and presentation? | [Branding](branding.md), [shared presenters](presentation.md) and [design source](../packages/design/README.md) |
| What owns the FAQ's stable identifiers and behavior? | [FAQ authoring contract](faq-authoring.md) |

The [implementation horizon](implementation-horizon.md) preserves selected product
breadth. Current direction and source determine what is implemented; accepted future
capability does not become historical merely because it is not released.

## Shape the managed App

| Question | Maintained source |
| --- | --- |
| What should the activity-first dashboard, PR/file details, clouds and brief do? | [Dashboard capabilities](dashboard.md) |
| What do Community, Free, Pro and Business include? | [App editions and planned plans](app-plans.md) |
| How do repository selection, organisation funding, processing and plan changes work? | [App management](app-management.md) |
| Who may read, configure, delegate or publish a view? | [Dashboard accounts and access](dashboard-access.md) |
| What is retained, what remains transient, and what does import mean? | [Privacy and data](PRIVACY-AND-DATA.md) |
| How does that product join authentication, execution and recovery? | [Managed App architecture](integration/github-app.md) |
| Why did named history and merged-PR metrics replace the earlier boundary? | [Analytical decisions D064–D073](DECISIONS.md#d064-make-the-app-activity-first-for-collaborators-as-well-as-administrators) |

These sources describe selected capabilities and an accepted planned offer, not an
already deployed dashboard or available paid service. [Commercial decisions](DECISIONS.md#d054-separate-community-from-private-premium-application-capabilities)
record the edition, funding, price and lifecycle choices. The six analytical pages and
shell are ratified; chart/cloud co-design precedes Manage/subscription design.
Renderer qualification, remaining algorithms and numeric monthly import budgets remain implementation work. The public
manual continues to describe supported operation rather than presenting planned
features as shipped.

## Integrate against a real contract

Start with the [interface reference](manual/reference/README.md) for CLI, Actions,
TypeScript, schemas and detail. The following remain repository-owned technical
sources, not duplicate public chapters:

| Boundary | Source |
| --- | --- |
| Install-free Action packaging and runtime closure | [Action distribution](integration/action-distribution.md) |
| GitHub acquisition, trust and effect adapter | [GitHub API](integration/github-api.md) |
| Browser-safe engine exports and extension integration | [Browser integration](integration/browser-extension.md) |
| Parser architecture and source locations | [Parser architecture](language/parser-architecture.md) |
| Policy, report, query and plan schemas | [Canonical JSON Schemas](../src/diffdevil/contracts/schemas/) |
| Language grammar, operators, functions, diagnostics and cases | [detail v1 contracts](../src/diffdevil/contracts/detail/v1/README.md) |
| Executable preset source | [Presets](../src/diffdevil/presets/) |
| Complete runnable specimens | [Example map](examples/README.md) |
| Real-PR editions shared by Examples and Playground | [Catalogue integration](integration/example-catalogue.md) and [capture maintenance](../apps/website/catalogue/README.md) |

The manual's [schema and compatibility guide](manual/reference/language-and-contracts/schemas-and-compatibility.md)
explains how to consume those contracts. Generated symbol and metadata inventories
supplement authored explanation; none is a second hand-maintained API.

## Operate a component

| Component | Source and responsibility |
| --- | --- |
| Public website | [Website](../apps/website/README.md): product routes, catalogue, shared shell, asset generation and publication preparation |
| Manual | [Manual](../apps/manual/README.md): explicit source/route selection, generation, migration, joined search and two-host qualification |
| Public-PR acquisition | [Playground adapter](../apps/playground/README.md): local/Worker API, throttling and transport |
| Managed App | [App operator source](../apps/github-app/README.md) and [architecture](integration/github-app.md): supported backend, storage, recovery and provider boundaries |
| Wirt commercial link, benefit projection and entitlement | [Commercial link consumer](integration/app-commercial-link.md) |
| Browser extension | [Extension component](../apps/browser-extension/README.md): build, permissions, settings and qualification; [privacy source](../apps/browser-extension/privacy.md) |
| Agent Skill and setup | [Canonical Skill](../skills/diffdevil/SKILL.md), its complete references, and [rendered setup payloads](setup/) |

The manual owns [App adoption](manual/use/managed-app/service.md),
[self-hosting](manual/use/managed-app/self-hosting.md) and
[symptom-led recovery](manual/help/troubleshooting.md). A backend deployment does
not prove reachable public administration; a local extension build does not prove
Store availability or the complete installed journey.

## Security, data and rights

[Security reporting](../SECURITY.md), [privacy and data](PRIVACY-AND-DATA.md) and the
[component licence map](../LICENSES/README.md) remain the specialist authorities.
The manual [explains their consequences](manual/help/security-and-data.md) without
replacing those sources or inventing service terms.

## Historical evidence

[The reference map](reference/README.md) retains dated research, rationale and
qualification. [Decisions through D043](DECISIONS-through-d043.md), [the dashboard decision record through D053](DECISIONS-through-d053.md) and the
[pre-expansion App runtime contract](integration/github-app-runtime-v1.md) preserve
complete earlier text; their superseded product assumptions do not compete with
the current dashboard/access/privacy contracts. Existing decision fragments remain
reachable from the current Decisions index.

The [v1.0.0 release account](releases/v1.0.0.md) describes that release,
not everything currently present on `main`. Dated accounts remain available through exact
repository links and the finite source resolver, but do not enter current manual
navigation or default search as competing instructions.
