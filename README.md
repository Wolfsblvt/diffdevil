# diffdevil

[![npm version](https://img.shields.io/npm/v/%40wolfsblvt%2Fdiffdevil?logo=npm&color=CB3837)](https://www.npmjs.com/package/@wolfsblvt/diffdevil)
[![Verify](https://github.com/Wolfsblvt/diffdevil/actions/workflows/verify.yml/badge.svg?branch=main)](https://github.com/Wolfsblvt/diffdevil/actions/workflows/verify.yml)
![Runtime](https://img.shields.io/badge/Node-22%2B-339933?logo=nodedotjs)

> **The devil is in the diff.**

**Measure changes. Match rules. Act on the result.**

A CLI, TypeScript library and set of GitHub Actions that turn diffs into useful
facts and deliberate automation. Count a three-line replacement as **three Changed**,
keep its **six lines of raw churn**, select the files that matter to your policy,
and use the result in a script, a check, a size band or an inspectable effect plan.
The same engine powers every surface. A diffdevil account is not required.

**[Get started](#get-started)** · [Complete manual](docs/manual/README.md) ·
[FAQ](docs/manual/faq.md) · [Releases](docs/manual/help/releases.md)

GitHub and npm carry the released **v1.0.0 CLI, library and four Actions**.
diffdevil is a product in development. The browser extension and complete managed
service are not publicly released. The richer website, Examples and manual-host
experience is source-owned, not a claim that its domains are already serving it.
The [earlier public-PR measurement Playground](https://diffdevil-playground.wolfsblvt.workers.dev)
is a separate deployed surface, not that complete website experience.

## Get started

Use **Node.js 22 or later** and npm. Git is needed for Git-backed comparisons, not
for the packaged teaching patch below. Install the released package in your project:

```sh
npm install --save-dev @wolfsblvt/diffdevil
npm exec -- diffdevil analyze --no-config --diff-file node_modules/@wolfsblvt/diffdevil/docs/examples/diffs/review.diff --format human
```

The complete four-file patch produces **10 Changed** and **16 raw churn**. The
report keeps additions, deletions and modifications distinct; `--no-config` makes
this first example independent of any policy already in your repository.

Then use it on your own tracked worktree or staged changes:

```sh
npm exec -- diffdevil analyze --format human
npm exec -- diffdevil analyze --staged --format human
npm exec -- diffdevil analyze --base main --head HEAD --format json
```

The last command uses the merge-base comparison. Inspect the report's source
revisions and inclusion rules before interpreting its total. The
[local-change guide](docs/manual/start/analyze-local-changes.md) explains each
comparison and the first repair for missing refs, configuration or an empty result.

## Label pull requests with one file

You need permission to add a workflow and allow it to write pull-request labels.
Save this complete workflow as `.github/workflows/diffdevil.yml` and make it
available through your repository's normal change process:

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

Inspect a run and its PR: one managed `size/*` label should be applied or retained.
The default creates missing definitions, preserves unrelated labels and existing
label presentation, and posts **no comment**. An unresolved band can select
`size/Unknown`; it does not invent zero.

This privileged job reads PR data without checking out or executing PR code. Keep
PR-head builds and tests separate. For read-only reports use
`Wolfsblvt/diffdevil/actions/analyze@v1`; the other explicit entries are
`/actions/apply` and `/actions/sync-labels`. All four ship their executable runtime,
so the workflow needs no npm install. Pin `@v1.0.0` or an exact release commit when
you need an immutable reference rather than the maintained `@v1` alias.

[Labeling guide and recovery](docs/manual/start/label-pull-requests.md) ·
[Actions operation](docs/manual/use/github-actions.md) ·
[Exact inputs and outputs](docs/manual/reference/github-actions.md)

## Ask the question your script needs

Human and agent reports are reading interfaces. Use structured JSON, strict scalar
output or a process exit when another program consumes the result:

```sh
npm exec -- diffdevil query --expr 'totals.lines.changed' --format value
npm exec -- diffdevil check --expr 'totals.lines.changed <= 250'
npm exec -- diffdevil query --files --metric modified --gt 20 --select path --format nul
```

`check` exits **0** for true, **1** for false, **2** for invalid input or operation
failure, and **3** for unresolved evidence. Exact output refuses evidence it cannot
represent honestly. NUL-separated paths avoid confusing a filename with a line of
shell output. [Complete Bash and PowerShell consumers](docs/manual/start/use-results-in-scripts.md)
show the full handling, including exit 3.

**Changed is a measurement, not a verdict.** Exact, bounded, unknown, unmeasurable
and incomplete file membership remain distinct. A bound may prove a threshold
without supplying an exact number. Neither Changed nor raw churn measures quality,
risk, importance or whether a PR should merge.
[Read the counting model](docs/manual/understand/changed-lines-and-churn.md) and
[evidence model](docs/manual/understand/evidence-and-uncertainty.md).

## Grow into policy, not another tool

Start with the built-in `size@1` preset. When you need more, ordinary YAML or JSON
policy gives you named scopes, typed parameters, metrics, queries, bands, rules,
labels and owned comments. The optional **detail** expression language uses the
same compiler and evaluator as the shortcuts. Expressions are never JavaScript.

The [policy guide](docs/manual/policy/README.md) builds one small example from a
preset to a deliberate rule. [Recipes](docs/manual/policy/recipes.md) provide
complete checked files, and [the reference](docs/manual/reference/README.md) owns
exact commands, APIs and language contracts. A plan describes desired effects;
it is not evidence that a label or comment was applied.

The TypeScript library exposes the same engine through supported public imports:

```typescript
import { readFile } from 'node:fs/promises';
import { analyzeDiff, unwrap } from '@wolfsblvt/diffdevil';

const report = unwrap(analyzeDiff(await readFile('change.diff', 'utf8')));
console.log(report.totals.lines.changed);
```

[Embedding and failure handling](docs/manual/use/typescript-library.md) ·
[Public API reference](docs/manual/reference/typescript-api.md)

## Choose where it works

The open CLI, library and Actions are the product, not restricted entry tiers.
Other surfaces reuse their meaning and change who operates the work:

| Surface | What it adds | Start here |
| --- | --- | --- |
| CLI and scripts | Local comparisons, precise queries and explicit effects | [CLI](docs/manual/use/cli.md) |
| GitHub Actions | Repository-owned automation in reviewed workflows | [Actions](docs/manual/use/github-actions.md) |
| TypeScript library | The engine inside your own application | [Library](docs/manual/use/typescript-library.md) |
| Browser extension | Personal aggregate and per-file Changed inside GitHub, without repository writes | [Extension](docs/manual/use/browser-extension.md) |
| Playground and Examples | Read-only exploration of public PRs and frozen real-PR editions | [Playground](docs/manual/use/playground.md) |
| Managed App | Optional operated repository automation, administration and opt-in quantitative history | [Managed App](docs/manual/use/managed-app/README.md) |
| Coding-agent Skill | Persistent tool knowledge; executable access remains separate | [Coding agents](docs/manual/use/coding-agent.md) |

Extension and managed-service guides describe the complete selected experience
beneath their availability notes. Self-hosting has its own
[Workers, Queue and D1 operator guide](docs/manual/use/managed-app/self-hosting.md).
Two hosts must not compete over the same managed labels or comment lifecycle.
[Shared workflows](docs/manual/use/shared-workflows/README.md) explains coexistence.

The selected public homes are [diffdevil.dev](https://diffdevil.dev/) and
[docs.diffdevil.dev](https://docs.diffdevil.dev/). Until their publication is verified,
the repository manual linked above remains the complete reading route. A configured
Store, App or download destination is not publication evidence.

## Documentation and contributing

[The manual](docs/manual/README.md) owns user operation; the
[repository documentation map](docs/README.md) owns architecture, development,
contracts and dated evidence. [Development](docs/DEVELOPMENT.md) carries source
bootstrap and `npm run verify`, with package, Action and browser qualification kept
separate. [Release guidance](docs/manual/help/releases.md) distinguishes the package,
Action aliases, independently versioned Skill and source-only surfaces.

Read [Security and data](docs/manual/help/security-and-data.md) before sharing a
report or choosing credentials. Report suspected vulnerabilities through the
[private security route](SECURITY.md), not a public issue.

## License

The [component licence map](LICENSE.md) assigns **MIT** to reusable engine, CLI, API,
Action software and mapped runnable examples, **AGPL-3.0-only** to application/service
software and **CC BY 4.0** to original documentation prose, while brand and visual
rights remain reserved as detailed in [LICENSES/README.md](LICENSES/README.md).
