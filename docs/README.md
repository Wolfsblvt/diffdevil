# diffdevil Documentation

## Meaning

This is the documentation map for diffdevil. It separates current product direction, normative contracts, user-facing integration, implementation guidance, and dated evidence so readers can enter at the subject they actually need.

## Start with a task

| You want to… | Start here |
| --- | --- |
| Understand why diffdevil differs, choose a surface, or check its trust boundaries | [FAQ](manual/faq.md) |
| Automatically label PR size with one workflow | [Auto-labeling quickstart](manual/start/label-pull-requests.md) |
| Get a scalar, path list, or reliable shell condition | [Local automation](manual/start/analyze-local-changes.md) |
| Add a source/test signal or one updated comment | [Policy recipes](manual/policy/recipes.md) |
| Copy a complete tested input | [Example map](examples/README.md) |
| Inspect one public PR in a browser | [Live playground](https://diffdevil-playground.wolfsblvt.workers.dev) · [Application and local route](../apps/playground/README.md) |

No expression-language study is required for the size workflow. Go deeper only
when a custom formula, scope, or policy needs it.

## Product and repository

| Subject | Source |
| --- | --- |
| Durable product destination | [`VISION.md`](VISION.md) |
| Current implementation outcome | [`DIRECTION.md`](DIRECTION.md) |
| Complete implementation horizon | [`implementation-horizon.md`](implementation-horizon.md) |
| Durable decisions and open forks | [`DECISIONS.md`](DECISIONS.md) |
| Human, agent, and effect-plan presentation | [`presentation.md`](presentation.md) |
| Repository structure | [`PROJECT-MAP.md`](PROJECT-MAP.md) |
| Architecture boundaries | [`ARCHITECTURE.md`](ARCHITECTURE.md) |
| Local development and verification | [`DEVELOPMENT.md`](DEVELOPMENT.md) |
| Executed qualification and remaining evidence | [`qualification.md`](qualification.md) |
| Shortcut ergonomics comparison | [`shortcut-comparison.md`](shortcut-comparison.md) |
| Publication boundary | [`publication-boundary.md`](publication-boundary.md) |
| Release notes and publication standing | [Releases](manual/help/releases.md) |
| Documentation teaching and future site source | [`documentation.md`](documentation.md) |
| FAQ editorial, route, search and verification contract | [`faq-authoring.md`](faq-authoring.md) |
| Canonical textual brand | [`branding.md`](branding.md) |
| Live and local public-PR playground | [`../apps/playground/README.md`](../apps/playground/README.md) |
| Managed App architecture (source and contained backend canary; complete public experience in development) | [`integration/github-app.md`](integration/github-app.md) |
| Hosted data, opt-in history, and retention contract | [`PRIVACY-AND-DATA.md`](PRIVACY-AND-DATA.md) |
| Complete public playground experience (beyond the local measurement form) | [`manual/use/playground.md`](manual/use/playground.md) |
| Public website source, build and local qualification (not deployed) | [`../apps/website/README.md`](../apps/website/README.md) |
| Playground example catalogue and snapshot contract | [`../apps/website/catalogue/README.md`](../apps/website/catalogue/README.md) |

## Use diffdevil

| Subject | Source |
| --- | --- |
| First useful CLI and Action routes | [`automation.md`](manual/use/README.md) |
| CLI protocol and source selection | [`integration/cli.md`](manual/use/cli.md) |
| Human, agent, and plan presentation | [`presentation.md`](presentation.md) |
| GitHub Action interface | [`integration/github-actions.md`](manual/use/github-actions.md) |
| Install-free Action distribution | [`integration/action-distribution.md`](integration/action-distribution.md) |
| GitHub provider API and trust | [`integration/github-api.md`](integration/github-api.md) |
| Managed service adoption | [Use the managed service](manual/use/managed-app/service.md) |
| Operate your own App | [Self-host the App](manual/use/managed-app/self-hosting.md) · [Complete operator source](../apps/github-app/README.md) |
| Failed task, data handling, or release standing | [Troubleshooting](manual/help/troubleshooting.md) · [Security and data](manual/help/security-and-data.md) · [Releases](manual/help/releases.md) |
| Presets and shortcut lowering | [`integration/presets-and-shortcuts.md`](manual/policy/README.md) |
| Shared frozen examples and capture maintenance | [`integration/example-catalogue.md`](integration/example-catalogue.md) |
| Templates and comment lifecycle | [`integration/templates.md`](manual/policy/from-measurements-to-rules/effects-and-templates.md) |
| GitHub browser extension and portable browser API | [`integration/browser-extension.md`](integration/browser-extension.md) |
| TypeScript embedding | [`integration/typescript-api.md`](manual/use/typescript-library.md) |
| Playground response schema | [`../apps/playground/contracts/response-v1.schema.json`](../apps/playground/contracts/response-v1.schema.json) |

## detail language

Start with [`language.md`](manual/reference/language-and-contracts/README.md).

| Subject | Source |
| --- | --- |
| Syntax | [Syntax reference](manual/reference/language-and-contracts/detail-language.md#syntax-and-source-locations) |
| Types and evidence | [Types and measurements](manual/reference/language-and-contracts/detail-language.md#values-types-and-measurements) |
| Collections and scopes | [Collections and scopes](manual/reference/language-and-contracts/detail-language.md#collections) |
| Standard library | [Function catalogue and semantics](manual/reference/language-and-contracts/detail-language.md#functions) |
| Policies and bands | [`language/policies-and-bands.md`](manual/policy/from-measurements-to-rules/README.md) |
| Diagnostics and limits | [Diagnostic reference](manual/reference/language-and-contracts/detail-language.md#diagnostics) |
| Parser architecture | [`language/parser-architecture.md`](language/parser-architecture.md) |
| Versioning and interchange | [`language/versioning-and-interchange.md`](manual/reference/language-and-contracts/schemas-and-compatibility.md) |

Core machine contracts live under [`../src/diffdevil/contracts/detail/v1/`](../src/diffdevil/contracts/detail/v1/), [`../src/diffdevil/contracts/schemas/`](../src/diffdevil/contracts/schemas/), and [`../src/diffdevil/presets/`](../src/diffdevil/presets/). Application-specific transport contracts stay with their application, including the [playground response schema](../apps/playground/contracts/response-v1.schema.json).

## Examples

[`../examples/README.md`](examples/README.md) maps expressions, policies, reports, scripts, and workflow specimens. Workflow remote references use the published `@v1` interface; a specimen remains separate from a successful hosted run. Expression/policy execution is identified in Qualification.
`docs/examples/policies/weighted.json` is now executed by the shortcut demonstration
and configured CLI tests; Qualification names the remaining unobserved routes.

## Dated evidence

[The reference map](reference/README.md) identifies historical public editions and current source precedence. [`reference/2026-09-09/`](reference/2026-09-09/) preserves:

- founding and decisions;
- source research;
- Chevrotain implementation guidance;
- branding reconciliation;
- qualification and its exact limits.

Dated references explain the selected design. Maintained product and language documents remain current authority.

The [September 14 references](reference/2026-09-14/) add provider and Action
distribution evidence. npm and Action consumer journeys are separately exercised;
neither establishes live GitHub or publication standing.
