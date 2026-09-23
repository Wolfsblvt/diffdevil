# Integrations

## Meaning

This reference connects the skill's CLI and policy knowledge to GitHub Actions,
the TypeScript API, and managed operation. Each uses the same engine; host-specific
inputs and outputs remain distinct.

## GitHub Actions

| Entry | Behavior |
| --- | --- |
| `Wolfsblvt/diffdevil@v1` | Root convenience entry; defaults to size-label application |
| `Wolfsblvt/diffdevil/actions/analyze@v1` | Read-only analysis |
| `Wolfsblvt/diffdevil/actions/apply@v1` | Explicit application with fresh evidence and artifact validation |
| `Wolfsblvt/diffdevil/actions/sync-labels@v1` | Definition verification by default; `operation: apply` writes |

Root `mode` can select analyze, plan, or apply. Actions carry their runtime:
consumer jobs do not install the npm package. Use the user's selected published
Action ref or exact commit.

The maintained no-config size workflow is:

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

This API-only workflow needs no checkout. It ensures missing size definitions,
reconciles the managed group, and posts no comments. Custom base-ref configuration
also needs its read capability, usually `contents: read`.

For read-only analysis, use the analyze entry in a workflow with the read
permissions and event appropriate to the repository. A threshold example:

```yaml
- uses: Wolfsblvt/diffdevil/actions/analyze@v1
  id: changes
  with:
    metric: changed
    files: any
    threshold: '100'
    comparison: gt
```

This is a step excerpt, not a complete workflow. Its `decision` may be true, false,
or unknown; the analysis step does not automatically fail because the condition
is false or unknown. The workflow decides the consequence.

### Policy and output details

Actions select `config` explicitly. Omitting it uses the bundled route, not
automatic working-directory discovery. Trusted base/pinned configuration and
templates control writes; workspace policy is read-only in Actions.
A privileged workflow's data acquisition is not a reason to execute PR-head code.

`policy-token`, when supplied, is used for base/pinned policy and template reads.
`github-token` acquires the PR and performs effects. Without the optional token,
the documented single-credential route remains supported.

Use `report-path` and `plan-path` for full reusable artifacts.
`report-json` and `plan-json` are compact summaries, not full report/plan inputs.
`input-report` and `input-plan` consume artifacts on the apply entry;
the output path names never become input selectors because a file already exists.

Apply reacquires and revalidates, even for same-job artifacts. Full artifact files
are not automatically uploaded across jobs. `effects-path` preserves the journal,
including partial outcomes. Inspect evidence companions rather than treating an
empty scalar output as zero.

The [Actions manual](https://github.com/Wolfsblvt/diffdevil/blob/main/docs/manual/use/github-actions.md)
owns the full input/output catalog and workflow contract. The
[workflow examples](https://github.com/Wolfsblvt/diffdevil/tree/main/docs/examples/workflows)
provide complete runnable source for common jobs.

## TypeScript API

The package exposes the root, `/core`, `/language`, `/policy`, `/git`, and
`/github` exports. Use the installed declarations for exact signatures.

A pure analysis and policy example:

```typescript
import { analyzeDiff, unwrap } from '@wolfsblvt/diffdevil';
import { compilePolicy, evaluatePolicy, createPlan } from '@wolfsblvt/diffdevil/policy';

const report = unwrap(analyzeDiff(unifiedDiffText));
const policy = unwrap(compilePolicy({ version: 1, presets: ['size@1'] }));
const evaluated = unwrap(evaluatePolicy(policy, report));
const plan = unwrap(createPlan(
  evaluated,
  { repository: 'example/repository', pullRequest: 42 },
  { definitions: 'ensure' },
));
```

`unifiedDiffText` is the caller's supplied string. This produces a desired plan,
not a GitHub mutation. `unwrap` selects throwing error handling; callers may
instead inspect each `Result`'s `ok`, `value`, and `diagnostics`.

A successful result can contain an unknown decision or bounded measurement.
`readReport` and `readPlan` validate artifacts. `compileExpression` and
`evaluateExpression` provide the typed detail path. `/github` exposes
`GitHubClient`, `analyzeGitHub`, `loadGitHubPolicy`, `applyGitHubPolicy`,
and `syncGitHubLabels` for explicit provider work.

Use the [TypeScript guide](https://github.com/Wolfsblvt/diffdevil/blob/main/docs/manual/use/typescript-library.md)
and shipped declarations for embedding. A cast after `JSON.parse` does not perform
the reader's semantic validation.

## Managed App and setup

The managed App is an alternative operating route for the same policy engine,
with its own installation, administration, checks, and optional history.
The public Playground is an independent read-only learning surface.
Consult current product installation docs for actual availability and entry URLs.

Choose an operating route from the user's needs and existing setup. Consider
who should maintain execution, available credentials and automation, managed
service needs, and which route already owns the desired effects. There is no
fixed Actions-versus-App fallback in this skill.

Purposeful coexistence is useful, such as read-only Actions alongside App-owned
labels. Two independent writers reconciling the same managed effect need an
explicit arrangement. Preserve unrelated automation while resolving that overlap.

Installing the skill teaches later tool use; one-off agent-assisted setup performs
an installation task. They are separate capabilities. Everything setup includes
this same skill, normally in personal scope, unless the user's instructions
select another scope. The
[skill installation handoff](https://github.com/Wolfsblvt/diffdevil/blob/main/docs/setup/skill.md)
uses the installed installation reference rather than a second installation recipe.
