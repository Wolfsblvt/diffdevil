# diffdevil Documentation

## Meaning

This is the documentation map for diffdevil. It separates current product direction, normative contracts, user-facing integration, implementation guidance, and dated evidence so readers can enter at the subject they actually need.

## Start with a task

| You want to… | Start here |
| --- | --- |
| Understand why diffdevil differs, choose a surface, or check its trust boundaries | [FAQ](manual/faq.md) |
| Automatically label PR size with one workflow | [Auto-labeling quickstart](manual/start/label-pull-requests.md) |
| Get a scalar, path list, or reliable shell condition | [Local automation](manual/start/analyze-local-changes.md) |
| Add a source/test signal or one updated comment | [Policy recipes](guides/policy-recipes.md) |
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
| Release notes and publication standing | [`releases/README.md`](releases/README.md) |
| Documentation teaching and future site source | [`documentation.md`](documentation.md) |
| FAQ editorial, route, search and verification contract | [`faq-authoring.md`](faq-authoring.md) |
| Canonical textual brand | [`branding.md`](branding.md) |
| Live and local public-PR playground | [`../apps/playground/README.md`](../apps/playground/README.md) |
| Optional managed App experience and architecture (selected, not deployed) | [`integration/github-app.md`](integration/github-app.md) |
| Hosted data, opt-in history, and retention contract | [`PRIVACY-AND-DATA.md`](PRIVACY-AND-DATA.md) |
| Complete public playground experience (beyond the local measurement form) | [`manual/use/playground.md`](manual/use/playground.md) |
| Public website source, build and local qualification (not deployed) | [`../apps/website/README.md`](../apps/website/README.md) |
| Playground example catalogue and snapshot contract | [`../apps/website/catalogue/README.md`](../apps/website/catalogue/README.md) |

## Use diffdevil

| Subject | Source |
| --- | --- |
| First useful CLI and Action routes | [`automation.md`](automation.md) |
| CLI protocol and source selection | [`integration/cli.md`](integration/cli.md) |
| Human, agent, and plan presentation | [`presentation.md`](presentation.md) |
| GitHub Action interface | [`integration/github-actions.md`](integration/github-actions.md) |
| Install-free Action distribution | [`integration/action-distribution.md`](integration/action-distribution.md) |
| GitHub provider API and trust | [`integration/github-api.md`](integration/github-api.md) |
| Planned optional App and dashboard | [`integration/github-app.md`](integration/github-app.md) |
| Presets and shortcut lowering | [`integration/presets-and-shortcuts.md`](integration/presets-and-shortcuts.md) |
| Shared frozen examples and capture maintenance | [`integration/example-catalogue.md`](integration/example-catalogue.md) |
| Templates and comment lifecycle | [`integration/templates.md`](integration/templates.md) |
| GitHub browser extension and portable browser API | [`integration/browser-extension.md`](integration/browser-extension.md) |
| TypeScript embedding | [`integration/typescript-api.md`](integration/typescript-api.md) |
| Playground response schema | [`../apps/playground/contracts/response-v1.schema.json`](../apps/playground/contracts/response-v1.schema.json) |

## detail language

Start with [`language.md`](language.md).

| Subject | Source |
| --- | --- |
| Syntax | [`language/syntax.md`](language/syntax.md) |
| Types and evidence | [`language/types-and-measurements.md`](language/types-and-measurements.md) |
| Collections and scopes | [`language/collections-and-scopes.md`](language/collections-and-scopes.md) |
| Standard library | [`language/standard-library.md`](language/standard-library.md) |
| Policies and bands | [`language/policies-and-bands.md`](language/policies-and-bands.md) |
| Diagnostics and limits | [`language/diagnostics-and-limits.md`](language/diagnostics-and-limits.md) |
| Parser architecture | [`language/parser-architecture.md`](language/parser-architecture.md) |
| Versioning and interchange | [`language/versioning-and-interchange.md`](language/versioning-and-interchange.md) |

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
