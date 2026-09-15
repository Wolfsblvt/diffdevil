# diffdevil Project Map

## Meaning

This map locates the current shared engine, CLI, provider adapter, Action hosts, committed runtime and evidence carriers. It describes responsibilities and source/generated/private boundaries, not a mandatory future package hierarchy.

## Current root

| Path | Responsibility |
| --- | --- |
| `README.md` | Crafted public-facing front door with honest implementation standing. |
| `AGENTS.md` | Repository-local implementation and effect boundary. |
| `package.json` | Package metadata and verification commands. |
| `docs/guides/` | Task-first setup, local automation and policy recipes. |
| `docs/DOCUMENTATION.md` | Teaching design and future website source ownership. |
| `reference/2026-09-15/` | Publication-preparation and current provider evidence. |
| `docs/` | Product, language, integration, architecture, development, and branding truth. |
| `spec/detail/v1/` | Grammar, catalogs, schemas, declarations, limits, and conformance cases for detail v1. |
| `schemas/` | Public policy, report, query-result, and plan structural schemas. |
| `presets/` | Shipped policy presets, beginning with `size@1`. |
| `examples/` | Expressions, policies, reports and scripts; unpublished workflow specimens are identified separately. |
| `reference/2026-09-09/` | Dated research, decisions, implementation guidance, and qualification evidence. |
| `scripts/check-prep.mjs` | Machine-asset and case-identity validation; not product execution or prose checking. |
| `action.yml`, `analyze/`, `apply/`, `sync-labels/` | Generated Action metadata and thin sub-action entry wrappers. |
| `action-runtime/` | Committed, install-free ESM closure with locked runtime dependencies and source/file manifest. |
| `reference/2026-09-14/` | Dated provider and Action-distribution evidence. |

## Maintained documentation

[`docs/README.md`](README.md) is the documentation map.

The most important durable subjects are:

- product destination: `VISION.md`;
- current movement: `DIRECTION.md`;
- implementation whole: `IMPLEMENTATION-HORIZON.md`;
- durable choices: `DECISIONS.md`;
- textual brand: `BRANDING.md`;
- architecture: `ARCHITECTURE.md`;
- development: `DEVELOPMENT.md`;
- first-use product route: `automation.md`;
- detail language: `language.md` and `language/`;
- integration surfaces: `integration/`.

## Implemented ownership

```text
src/                     normalized facts, evidence, report and schema primitives
src/language/            Chevrotain front end, AST, binding, types and evaluation
src/policy/              authoring, presets, shortcuts, scopes, rules and plans
src/sources/             local Git acquisition
src/hosts/               shared bounded files and trusted policy acquisition
src/cli/                 CLI parsing, orchestration and stream entry
src/github/              provider reads, effects, freshness and readback
src/actions/             Action host transport and shared runner
scripts/                 builds and independent qualification journeys
tests/                   ordinary deterministic and boundary tests
```

`dist/lib/` is ignored build output for npm. `action-runtime/` is deliberately
committed distribution output; consumers need its dependency closure without an
installation step. The root/sub-action metadata selects that exact runtime.
Do not hand-edit generated files or confuse root development `node_modules`
with the shipped closure under `action-runtime/node_modules`.

## Implemented source and evidence

`src/` contains the shared measurement, evidence, report, path, and Git-source
implementation described in `ARCHITECTURE.md`. `tests/` contains automatically
discovered Node test suites. `scripts/build.mjs` emits the library and declarations;
`scripts/test.mjs` discovers and runs the ordinary suite.

`dist/lib/` is generated. `artifacts/evidence/` contains prior command transcripts;
`artifacts/verification/policy/` contains earlier policy logs and schema specimens;
`artifacts/verification/actions/` contains earlier host/distribution qualification; `artifacts/verification/final-pass/` contains this final pass;
`artifacts/dependencies/npm-cache/` contains the verified offline dependency
closure used by the private return. Artifact directories are not maintained
product source or public package content.

`src/language/` contains the shared typed AST compiler, validated environment,
collection algebra and interpreter. Its syntax nodes are not a persisted policy
format. `source.ts`, `lexer.ts`, `parser.ts`, `cst-to-ast.ts`, and `text.ts` now
implement the selected Chevrotain front end. Source expressions and structured
shortcuts share the remaining compiler and interpreter.

## Executable CLI and policy engine

- `src/cli/`: strict invocation parsing, acquisition/output orchestration, stream entry.
- `src/format.ts`: report and query projections with machine-clean output.
- `src/language/shortcuts.ts`: shared AST lowering and explanatory printing.
- `src/policy/`: inert validation, JSON/YAML locations, preset normalization, metric graph,
  policy compiler/evaluator, desired plans, bands and comment templates.
- `src/policy/action-shortcut.ts`: pure single-rule input lowering, not an Action runner.
- `src/cli/policy.ts` and `src/hosts/io.ts`: local configuration/template/parameter acquisition
  and bounded UTF-8 transport, outside the pure policy modules.
- `src/index.ts`, `src/core.ts`, and subpath `index.ts` files: package API boundaries.
- `scripts/package-smoke.mjs`: installed-tarball, ESM, CLI and declaration checks.
- `scripts/conformance.mjs`: actual per-case test events and explicit unexecuted cases.
- `scripts/shortcut-demo.mjs`: four CLI pairs, JSON-authored formula, and the pure
  single-rule Action shorthand/full-policy comparison.
- `examples/policies/weighted.json`: executable local metric/query/label policy.
- `tests/policy-*.test.mjs`, `tests/action-policy.test.mjs`: joined policy, CLI,
  source-diagnostic, hold/conflict and desired-plan behavior.
- `tests/conformance-text.test.mjs`: supplied source cases, CST/AST locations, limits,
  and source/shortcut parity.
- `docs/QUALIFICATION.md`: observed proof and unexecuted conformance boundaries.

- `src/policy/yaml.ts`, `yaml-source-map.ts`: bounded core YAML and original-source maps.
- `src/schema.ts`: fixed-schema shape validation, separate from semantic readers.
- `scripts/schema-build.mjs`: build-only Ajv generation of product-owned schemas.
- `dist/lib/validation/schemas.cjs`: generated static validators included in npm.
- `tests/policy-yaml.test.mjs`, `tests/schema.test.mjs`: YAML/conformance and schema boundaries.
- `examples/policies/weighted.yml`: YAML counterpart to the executable JSON policy.

## GitHub adapter

`src/github/` contains origin-confined HTTP transport, PR acquisition, pinned
policy loading, label/comment reconciliation and operation readback.
`tests/github-*.test.mjs` uses a bounded HTTP fixture under `tests/helpers/`.
The CLI read-only GitHub source, explicit application/definition commands and
public `/github` export share that code. `src/hosts/` owns common host policy
loading and file transport; it contains no expression semantics.
`src/actions/run.ts` joins all four Action entry points to those same hosts and
provider modules. `scripts/build-actions.mjs` creates and verifies generated bytes;
`scripts/action-smoke.mjs` executes them outside the checkout. `tests/actions.test.mjs`
and `tests/action-metadata.test.mjs` protect transport, metadata and shared-host
behavior. [Action distribution](integration/action-distribution.md) owns the
consumer path and packaging rationale.
