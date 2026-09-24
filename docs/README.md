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
| How are releases prepared and published? | [Publication boundary](publication-boundary.md) and [release-source map](releases/README.md) |
| What owns the manual's prose, routes, examples and migration? | [Documentation design](documentation.md) and [manual application](../apps/manual/README.md) |
| What owns wording and presentation? | [Branding](branding.md), [shared presenters](presentation.md) and [design source](../design/README.md) |
| What owns the FAQ's stable identifiers and behavior? | [FAQ authoring contract](faq-authoring.md) |

The [implementation horizon](implementation-horizon.md) preserves selected product
breadth. Current direction and source determine what is implemented; accepted future
capability does not become historical merely because it is not released.

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
qualification. [Dated release accounts](releases/README.md) describe their release,
not everything currently present on `main`. They remain available through exact
repository links and the finite source resolver, but do not enter current manual
navigation or default search as competing instructions.
