# diffdevil

![Availability](https://img.shields.io/badge/npm-unpublished-6B7280?logo=npm)
![Runtime](https://img.shields.io/badge/tested_runtimes-Node_22_%2B_24-339933?logo=nodedotjs)
![Language](https://img.shields.io/badge/detail-v1-536B92)

> **The devil is in the diff.**

**Measure changes. Match rules. Act on the result.**

A composable CLI, TypeScript library and GitHub Action for turning Git diffs into
queryable facts, configured rules, and inspectable label/comment effects. Raw churn counts a
three-line replacement as six lines. Replacement-aware changed lines count it
once, while keeping both sets of facts available.

This **unpublished local release candidate** supports local Git, unified diffs,
saved reports, detail expressions, YAML/JSON policies, GitHub acquisition, and
explicit label/comment reconciliation. All four Actions ship executable JavaScript
and their dependencies, with no workflow installation step. Their consumer paths are
qualified locally on Node 22 and 24 against mock HTTP, not a live GitHub canary.
There is no public licence or published npm/`@v1` release yet. A plan remains data,
not an applied change.

```sh
node dist/lib/cli/main.js query --report examples/reports/exact.json \
  --expr 'totals.lines.changed' --format value
# 178
```

**[Label your PRs](docs/guides/auto-label-pull-requests.md)** · [Local scripts](docs/guides/local-automation.md) · [Policy recipes](docs/guides/policy-recipes.md) · [User manual](docs/automation.md) · [CLI reference](docs/integration/cli.md) · [Actions](docs/integration/github-actions.md) · [TypeScript API](docs/integration/typescript-api.md)

## Label your PRs with one file

Save this as `.github/workflows/diffdevil.yml` on your repository's default branch.
It creates missing size labels and maintains one on each matching PR. No config,
checkout, package install, personal token, or comment is required.

**The `@v1` coordinate becomes usable when the first public release is published.**
This candidate does not invent a released ref. The complete
[auto-labeling quickstart](docs/guides/auto-label-pull-requests.md) explains setup,
permissions, label ranges, custom exclusions, and troubleshooting.

```yaml
name: Pull-request size
on:
  pull_request_target:
    types: [opened, reopened, synchronize, edited]
permissions:
  pull-requests: write
concurrency:
  group: diffdevil-size-${{ github.event.pull_request.number }}
  cancel-in-progress: false
jobs:
  size:
    runs-on: ubuntu-latest
    steps:
      - uses: Wolfsblvt/diffdevil@v1
```

Keep this privileged job separate from PR-head checkout, builds, and tests. The
Action reads patches as data. Use `/analyze` for a read-only run instead. Existing
unrelated labels remain untouched; default ensure mode preserves existing label
colors and descriptions. An unavailable exact count is not silently replaced
with zero.

## Get started

Use Node.js 22 or later and npm. Local comparisons also require Git. From this
source checkout:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run build
node dist/lib/cli/main.js analyze --diff-file examples/diffs/review.diff --format human
```

The four-file teaching patch reports **10 changed lines** and **16 raw churn**.
Follow [local automation](docs/guides/local-automation.md) for exact values, path
queries, shell conditions, and reusable reports. Offline dependency restoration
is documented in [Development](docs/DEVELOPMENT.md#restore-and-build).
The installed npm tarball exposes the same commands as `diffdevil`; the commands
here use the built entry point so they work before publication.

Analyze tracked working-tree changes, compare two revisions, or read a patch:

```sh
node dist/lib/cli/main.js analyze
node dist/lib/cli/main.js analyze --base main --head HEAD --format json
node dist/lib/cli/main.js analyze --diff-file examples/diffs/review.diff --format json
```

`--base main --head HEAD` uses the selected merge-base comparison. Reports retain
source revisions, inclusion reasons, raw facts, replacement-aware facts, and the
quality of the evidence. See [sources and output](docs/integration/cli.md).

## Ask for the answer your script needs

Use ordinary **detail** expressions for scalar formulas and simple conditions.
Use shortcuts where they remove collection and projection boilerplate. Every
alias remains available; both routes share one compiler and evaluator.

```sh
# A scalar, with no heading or diagnostic prose on stdout.
node dist/lib/cli/main.js query --expr 'totals.raw.added + totals.raw.deleted' --format value

# A valid condition communicates its result through the exit code.
node dist/lib/cli/main.js check --expr 'totals.lines.changed > 100'

# Collection shortcuts select included files and handle the quantifier/projection.
node dist/lib/cli/main.js check --files any --metric changed --gt 100
node dist/lib/cli/main.js query --files --metric modified --gt 20 --select path --format lines
```

`check` exits **0** for true, **1** for false, **2** for invalid input or an
operation failure, and **3** for unresolved evidence. Strict scalar and path-list
output refuses an unresolved result rather than inventing a value. Diagnostics
go to stderr. Use `--format nul` for NUL-delimited path output, and `--expr-file`
or `--expr-stdin` for expressions that are awkward to quote.

[Complete formats and exit codes](docs/integration/cli.md) · [detail reference](docs/language.md)

## Write policy once

A discovered `.diffdevil.yml` or an explicit YAML/JSON file can define scopes,
parameters, metrics, saved queries, bands, rules, and desired effects. Formulas
use the same detail grammar as the CLI:

```yaml
version: 1
presets: []
metrics:
  rewritten:
    formula: totals.lines.deleted + 2 * totals.lines.modified
queries:
  rewritten:
    expression: metrics.rewritten
rules:
  broad-rewrite:
    when: metrics.rewritten >= 500
    effects:
      labels:
        add: [review/broad-rewrite]
        removeWhenFalse: true
```

The [complete weighted example](examples/policies/weighted.yml) also defines a
typed threshold and its label definition. Query it or inspect its desired effects:

```sh
node dist/lib/cli/main.js query --report examples/reports/exact.json \
  --config examples/policies/weighted.yml --name weighted --format value
# 248

node dist/lib/cli/main.js plan --report examples/reports/exact.json \
  --config examples/policies/weighted.yml --target-repo example/repository \
  --target-pr 42 --definitions ensure --format json
```

Policy validation rejects unknown names, type errors, metric cycles, invalid
bands, and conflicting assignments. YAML errors preserve original source
positions through quoting, folding, and aliases. Plans keep unresolved rules
held; they never interpret unknown as false or remove an unrelated label.

[Policy and band manual](docs/language/policies-and-bands.md) · [Templates](docs/integration/templates.md)

## Know what the numbers mean

| Change | Raw additions | Raw deletions | Raw churn | Replacement-aware changed |
| --- | ---: | ---: | ---: | ---: |
| Replace three adjacent lines | 3 | 3 | 6 | 3 |
| Add five lines, delete two in the same edit block | 5 | 2 | 7 | 5 |
| Delete three here, add three elsewhere | 3 | 3 | 6 | 6 |

The versioned `replacement-lines-v1` algorithm pairs additions and deletions
inside a contiguous edit block, never across unrelated locations. Added-only,
deleted-only, and modified facts remain individually queryable.

**Exact, bounded, unknown, and unmeasurable are different evidence states.** A
bounded count can prove a threshold or band when every possible value agrees.
It cannot supply a fabricated exact scalar. Binary changes do not become zero
text lines. Neither line counts nor file counts measure importance, risk,
complexity, quality, or whether a change should merge.

[Evidence and arithmetic](docs/language/types-and-measurements.md) · [Scopes and collections](docs/language/collections-and-scopes.md)

## Use one of four Actions

The shipped metadata selects **Node 24**. Given this exact trusted checkout at
`diffdevil/` in a workflow workspace, read-only analysis needs no npm install:

```yaml
- uses: ./diffdevil/analyze
  id: changes
  with:
    metric: changed
    files: any
    threshold: '100'
    comparison: gt
```

`steps.changes.outputs.decision` is `true`, `false`, or `unknown`. This local path
requires the **complete trusted checkout**, not just its `analyze` subdirectory.
There is not yet a public repository/release from which to obtain it with a remote
`uses:` coordinate.

| Entry | Behavior |
| --- | --- |
| Root | No-config size labeling: ensure missing definitions, reconcile only the managed size group, no comments. `mode: analyze` or `plan` selects a read-only route. |
| `/analyze` | Read-only facts, metrics, decisions and bands—even when a token is supplied. |
| `/apply` | Acquire fresh facts, revalidate supplied artifacts, then apply selected trusted policy. |
| `/sync-labels` | Verify definitions by default; explicit `operation: apply` ensures or synchronizes them. |

Choosing root's default is choosing label automation. Write modes require suitable
workflow permissions; a token alone does not enable writes. Base or explicitly
pinned policy controls effects, never a PR's changed workspace config. Do not run
untrusted PR scripts in a privileged job. Partial writes remain an incomplete
result with a full readback journal, not a success-shaped guess.

[Complete Action inputs and trust](docs/integration/github-actions.md) ·
[Install-free distribution](docs/integration/action-distribution.md)

## Use the same engine from TypeScript

The package exports its root API and `/core`, `/language`, `/policy`, `/git`, and `/github`
subpaths with generated declarations. Parsing, binding, type checking,
interpretation, policy evaluation, and planning have separate responsibilities.
No user expression is evaluated as JavaScript.

```typescript
import { readFile } from 'node:fs/promises';
import { analyzeDiff, unwrap } from '@wolfsblvt/diffdevil';

const report = unwrap(analyzeDiff(await readFile('change.diff', 'utf8')));
console.log(report.totals.lines.changed);
```

[API signatures and examples](docs/integration/typescript-api.md) · [Architecture](docs/ARCHITECTURE.md)

## Read GitHub changes and reconcile declared effects

Read a pull request without checking out or executing its code:

```sh
node dist/lib/cli/main.js query --repo OWNER/REPO --pr 42 \
  --expr 'totals.lines.changed' --format value
```

Private repositories require a suitable token in `GH_TOKEN` or `GITHUB_TOKEN`.
Read-only acquisition performs no label or comment mutation. The TypeScript
adapter exposes separate explicit application and label-definition operations.
It preserves unrelated metadata and checks current head/base revisions before
writes. Its provider behavior is qualified with mocked HTTP responses, not a
live GitHub canary.

[GitHub API and trust boundaries](docs/integration/github-api.md)

## Documentation and development

Start with the [task guides](docs/README.md#start-with-a-task), then use the
[documentation map](docs/README.md) for complete language and integration
contracts. The [GitHub Action guide](docs/integration/github-actions.md)
documents the implemented interfaces and keeps local qualification separate from
hosted-runner and publication evidence.

The ordinary source verification command is `npm run verify`. Installed-package,
conformance, and runtime evidence are separate commands and claims:
[Development](docs/DEVELOPMENT.md) · [Qualification](docs/QUALIFICATION.md).

## License

A Wolfsblvt Works product.

Copyright © Wolfsblvt. All rights reserved.

This candidate has no selected public licence. It is not yet offered under a public or general licence. Its
contents may be used, copied, modified, disclosed, or distributed only within
permission explicitly granted by the copyright holder. Access to the repository
or receipt of a copy grants no additional rights.
