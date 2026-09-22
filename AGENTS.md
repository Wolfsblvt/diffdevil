# diffdevil repository instructions

## Meaning

This is the repository-local contributor and coding-agent contract. It identifies
the product invariants, maintained sources, executable commands, generated files,
and boundaries around provider writes. It does not require private organizational
instructions to understand or contribute to diffdevil.

## Durable branch

`main` is the durable source branch. The first stable release cut selects pull
requests as the ordinary maintainer integration route while retaining lawful direct
recovery and tiny maintainer effects. This records the repository convention; current
GitHub settings and branch protection must still be read separately.

```text
main:
  maintainer integration: PR preferred
  external contributions: PR required
  required pre-integration evidence: Verify on the exact candidate head
  required approval/review: none
  resolved conversations: no
  automatic CI: Verify on main push and pull request (Linux Node 22/24, Windows Node 24)
  automatic retained branch effects: none
  other pre-update evidence: none
```

`PR preferred` does not require self-approval, invent branch protection, or forbid
an attributable direct correction whose consequence is safer and smaller than a
separate integration cycle.

## Start with the relevant source

Read `docs/VISION.md`, `docs/DIRECTION.md`, and `docs/branding.md` for product intent
and naming, then use `docs/README.md` to enter the subject being changed. Maintained
manuals plus `src/diffdevil/contracts/schemas/`, `src/diffdevil/contracts/detail/v1/`, and `src/diffdevil/presets/` own executable contracts.
`docs/reference/` retains dated rationale and evidence, not newer authority over those
contracts. A disagreement among code, schema, catalog, examples, and prose is a
specific defect to reconcile, not permission to choose the easiest behavior.

## Build and verify

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run build
npm run verify
node dist/lib/cli/main.js analyze --diff-file docs/examples/diffs/review.diff --format human
```

`verify` checks machine assets, builds source/declarations, runs registered tests,
and checks exact generated Action parity. When source or packaging affects the
Actions, run `npm run build:actions`, inspect the generated diff, and verify again.
Run `npm run test:conformance`, `npm run test:package`, and `npm run test:actions`
for the separately named consumer boundaries. `npm run website:build` builds both
public static hosts and their joined search index; `verify` includes that build.
`npm run qa:website` qualifies the existing website, while
`npm --prefix apps/manual run qa` qualifies the two-host manual/FAQ interfaces.
No website command deploys, previews remotely, or exposes anything. See
`docs/DEVELOPMENT.md` and `apps/manual/README.md` for what each command proves.
Do not replace executable proof with fixed prose or test-count gates.

## Preserve the product

Keep one semantic engine behind the CLI, library, and four Action entry points.
Raw churn, replacement-aware changed lines, policy judgments, desired effects,
and observed provider state are different facts. Unknown evidence is not false,
zero, empty, or a generic configuration error. Expressions never execute as
JavaScript. Preserve all working aliases and useful collection/path shortcuts;
teach simple arithmetic using ordinary formulas.

`/actions/analyze` stays read-only. The root Action selects the documented size-label
application by default. Privileged writes use trusted policy, never PR-head
configuration or code. Reconcile only declared labels and owned comments, check
freshness, and retain partial request/readback observations. Tests use fake HTTP,
not real credentials or live repository mutation.

## Generated and public boundaries

Edit `src/diffdevil/`, not the generated `actions/runtime/` implementation or `action.yml`
files. The new public manual is generated from `docs/manual/` through the explicit
`apps/manual/manifest.mjs`. Existing guide projections remain selected in
`apps/website/docs-manifest.mjs` until their complete source-family cutover. Edit
maintained Markdown, never either ignored generated collection. See
`apps/manual/README.md` for source, route, migration and qualification commands.
The Agent Skill and setup instructions are repository-owned product content served
by the site, not website copy. Commit reviewed Action distribution output because
consumers do not install dependencies. Root `dist/`, `node_modules/`, and `artifacts/`
are generated or local; do not force-add them. Never commit credentials, private raw
conversations, personal instructions, or local transfer archives.

Inspect Git status and the exact staged diff before committing. Preserve unrelated
work and attributable history. Public tags, releases, package publication, live
provider effects, and security settings are not side effects of running tests.
Follow the explicit release procedure in `docs/publication-boundary.md` when those
operations are authorized. Reusable software is MIT; application/service software is
AGPL-3.0-only. Documentation, examples, and reserved brand/visual rights are mapped in `LICENSES/README.md`.
