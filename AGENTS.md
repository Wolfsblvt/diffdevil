# diffdevil repository instructions

## Meaning

This is the repository-local contributor and coding-agent contract. It identifies
the product invariants, maintained sources, executable commands, generated files,
and boundaries around provider writes. It does not require private organizational
instructions to understand or contribute to diffdevil.

## Start with the relevant source

Read `docs/VISION.md`, `docs/DIRECTION.md`, and `docs/BRANDING.md` for product intent
and naming, then use `docs/README.md` to enter the subject being changed. Maintained
manuals plus `schemas/`, `spec/detail/v1/`, and `presets/` own executable contracts.
`reference/` retains dated rationale and evidence, not newer authority over those
contracts. A disagreement among code, schema, catalog, examples, and prose is a
specific defect to reconcile, not permission to choose the easiest behavior.

## Build and verify

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run build
npm run verify
node dist/lib/cli/main.js analyze --diff-file examples/diffs/review.diff --format human
```

`verify` checks machine assets, builds source/declarations, runs registered tests,
and checks exact generated Action parity. When source or packaging affects the
Actions, run `npm run build:actions`, inspect the generated diff, and verify again.
Run `npm run test:conformance`, `npm run test:package`, and `npm run test:actions`
for the separately named consumer boundaries. See `docs/DEVELOPMENT.md` for what
each proves. Do not replace executable proof with fixed prose or test-count gates.

## Preserve the product

Keep one semantic engine behind the CLI, library, and four Action entry points.
Raw churn, replacement-aware changed lines, policy judgments, desired effects,
and observed provider state are different facts. Unknown evidence is not false,
zero, empty, or a generic configuration error. Expressions never execute as
JavaScript. Preserve all working aliases and useful collection/path shortcuts;
teach simple arithmetic using ordinary formulas.

`/analyze` stays read-only. The root Action selects the documented size-label
application by default. Privileged writes use trusted policy, never PR-head
configuration or code. Reconcile only declared labels and owned comments, check
freshness, and retain partial request/readback observations. Tests use fake HTTP,
not real credentials or live repository mutation.

## Generated and public boundaries

Edit `src/`, not the generated `action-runtime/` implementation or `action.yml`
files. Commit reviewed Action distribution output because consumers do not install
dependencies. Root `dist/`, `node_modules/`, and `artifacts/` are generated or local;
do not force-add them. Never commit credentials, private raw conversations,
personal instructions, or local transfer archives.

Inspect Git status and the exact staged diff before committing. Preserve unrelated
work and attributable history. Public tags, releases, package publication, live
provider effects, and security settings are not side effects of running tests.
Follow the explicit release procedure in `docs/PUBLICATION-BOUNDARY.md` when those
operations are authorized. The project licence is not selected in this candidate.
