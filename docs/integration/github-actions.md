# GitHub Actions integration

## Meaning

This document defines the diffdevil Action surfaces, their language-free defaults, inline customization, outputs, trusted-policy boundary, and optional label/comment behavior. The root Action is the convenient default size-label automation; sub-actions expose read-only analysis, explicit application, and definition synchronization. All share the same policy compiler and evaluator.

These entry points are implemented and qualified through native and hosted consumer matrices plus a separate private live-provider canary, but unpublished. `@v1` in the workflow specimens is a future release coordinate, not an existing release. Current platform and evidence boundaries remain explicit below.

## Current executable boundary

Shared Action runners implement root, analyze, apply and sync-labels through
`src/diffdevil/actions/run.ts`. Focused tests execute runner inputs, event files,
output/summary files, policy trust, artifact revalidation, controlled Git, and
provider readback against fake GitHub HTTP. [Qualification](../QUALIFICATION.md)
owns exact native, hosted, installed-package, Action-consumer, and live-provider
evidence.

The accepted source has a separate private canary for missing-definition creation,
true no-op readback, managed-label replacement, trusted base policy despite a
hostile PR-head copy, stale-plan refusal, one owned-comment update, and split
policy/effect credentials. That evidence does not turn fake-provider tests into
live tests or establish a genuine external-fork event or live partial-write
failure.

The runners use the same policy compiler as CLI/API. Generated threshold rules
opt out of hidden size rules. Analyze rejects effect inputs. A full policy may
select metric/formula/scope/path outputs without altering its declared effects;
generated condition/threshold/effect shorthand instead requires a standalone
inline rule. Workspace policy remains read-only in Actions.

The native-ESM distribution ships all four metadata-selected paths without an
installation step. Exact accepted source has consumer evidence on Linux Node 22,
Linux Node 24, and Windows Node 24, including installed package and all four
install-free Action paths. Workflow examples remain unpublished interfaces, not
evidence of an existing `@v1`.

## Entry points

| Action | Default operation |
| --- | --- |
| `Wolfsblvt/diffdevil@v1` | Analyze PR, evaluate `size@1`, ensure missing required labels, reconcile size assignment, no comments. |
| `Wolfsblvt/diffdevil/actions/analyze@v1` | Read-only facts, metrics, band and optional threshold decision. |
| `Wolfsblvt/diffdevil/actions/apply@v1` | Acquire fresh evidence, revalidate supplied report/plan, and apply selected policy. |
| `Wolfsblvt/diffdevil/actions/sync-labels@v1` | Verify or apply explicitly managed repository label definitions. |

Root `mode` may be `analyze`, `plan`, or `apply`; it defaults to `apply`. Sub-actions have their explicit operation and reject contradictory mode/effect inputs. Choosing the root Action is a deliberate selection of its documented size-label effects. Merely possessing a token never changes a read-only entry point into a writer.

The current GitHub metadata contract supports subdirectory Action references and a Node 24 JavaScript runtime. The local Action distribution includes its required implementation; consumer jobs do not run `npm install`. See [G3](../reference/2026-09-09/sources-and-research.md#g3).

## Minimal complete workflow

The [auto-labeling quickstart](../guides/auto-label-pull-requests.md) owns setup and troubleshooting. The YAML below is the same tested workflow asset.


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

This is intentionally a complete workflow rather than a misleading five-line fragment. No checkout, configuration file, formula, threshold map, label setup, comment template, or token boilerplate is required. The Action's metadata supplies its ordinary `${{ github.token }}` default; a caller can provide an App token through `github-token` when appropriate for their repository.

Current REST label operations accept Issues-write or Pull-requests-write permission. This no-config API-only route does not need repository-content reads. A custom configuration loaded from the base ref additionally needs `contents: read`. Organization/repository token restrictions and Action policies can still deny the operation; diagnostics must identify the missing capability rather than advise unsafe head-code execution. See [G1](../reference/2026-09-09/sources-and-research.md#g1).

### Split trusted policy reads from effects

When a narrow App token owns effects without Contents access, do not broaden it
merely to load policy. Keep the ordinary workflow credential read-only and pass it
as `policy-token`:

```yaml
permissions:
  contents: read
  pull-requests: read
jobs:
  policy-size:
    runs-on: ubuntu-latest
    steps:
      - id: app-token
        uses: actions/create-github-app-token@bcd2ba49218906704ab6c1aa796996da409d3eb1 # v3.2.0
        with:
          app-id: ${{ vars.DIFFDEVIL_APP_ID }}
          private-key: ${{ secrets.DIFFDEVIL_APP_PRIVATE_KEY }}
          permission-pull-requests: write
      - uses: Wolfsblvt/diffdevil@v1
        with:
          config: .diffdevil.yml
          policy-source: base
          policy-token: ${{ github.token }}
          github-token: ${{ steps.app-token.outputs.token }}
```

`policy-token` is confined to trusted base/pinned policy and relative-template
reads. `github-token` still acquires the pull request and owns every label/comment
effect. Both credentials are masked and redacted. Omitting `policy-token` preserves
the original single-credential route; the no-config workflow above does not need
this split.

Use an immutable release commit SHA in security-sensitive workflows once a real release exists. `@v1` remains the compact documented major-version route; this package invents no release SHA. See [G2](../reference/2026-09-09/sources-and-research.md#g2).

## What the size default manages

The owned group is `size/XS`, `size/S`, `size/M`, `size/L`, `size/XL`, and `size/Unknown`. Thresholds and colors are in the [preset asset](../../src/diffdevil/presets/size-v1.yml). A proven band selects exactly one group member, including the explicitly configured unknown label when needed.

Definition mode defaults to `ensure`: create a missing definition, preserve existing colors/descriptions, and never delete an unrelated definition. A definition created concurrently is reconciled by re-reading it, not treated as an unexplained failure.

Assignment reconciliation adds the selected member when absent and removes only other declared group members. It does not replace the complete PR label array. The adapter reads back the managed subset and reports what changed.

Comments are off. There is no “helpful” automatic request to split XL changes and no default failing check for size. Workflow summaries and logs explain the measurement without posting PR replies.

## Simple customization without detail

Measure raw churn instead:

```yaml
- uses: Wolfsblvt/diffdevil@v1
  with:
    metric: raw-churn
```

Add an explicit exclusion:

```yaml
- uses: Wolfsblvt/diffdevil@v1
  with:
    exclude: |
      **/package-lock.json
      **/bin/**
      **/obj/**
```

Create one threshold label rather than the default size rule:

```yaml
- uses: Wolfsblvt/diffdevil@v1
  with:
    metric: destructive
    threshold: '500'
    comparison: gte
    label: review/destructive
```

That input shape selects a generated single-rule policy. It does not also run size labeling. The label is removed on a resolved false decision by default, held on unknown, and created if missing using a neutral definition. `remove-label-when-false: 'false'` can retain it deliberately.

For a per-file threshold:

```yaml
- uses: Wolfsblvt/diffdevil/actions/analyze@v1
  id: large_file
  with:
    metric: changed
    files: any
    threshold: '100'
    comparison: gt
```

The `files` input accepts `any` or `all` in threshold mode. It operates over included files or the selected named scope. This is the Action equivalent of CLI file checks, not a second expression grammar.

## Core inputs

| Input | Contract |
| --- | --- |
| `github-token` | Credential supplied by host, default ordinary GitHub token. Never expression data. |
| `policy-token` | Optional read credential confined to trusted base/pinned policy and relative-template acquisition. When absent, `github-token` retains the existing single-credential behavior. |
| `repository` | Target owner/repository; defaults to workflow repository, then event repository. An overridden repository needs an explicit PR number. |
| `pull-request` | PR number; defaults to supported event PR. |
| `source`, `git-cwd` | `github-api` by default; `git` compares existing local objects for the current PR revisions. `git-cwd` requires `source: git` and defaults to the workspace. |
| `mode` | Root-only `analyze`, `plan`, `apply`; default apply. |
| `preset` | Bundled preset identity; default size@1, `none` disables. |
| `config` | Explicit policy path; base-ref acquisition by default, with no implicit workspace discovery. |
| `policy-source`, `policy-ref`, `policy-repository` | `base`, `pinned` (full commit SHA required, optional repository), or `workspace` (read-only in Actions). |
| `policy` | Inline YAML/JSON policy string, mutually exclusive with config. |
| `rule` | One configured rule ID to select; absent selects all configured rules. |
| `metric` | Friendly standard alias, canonical measure, or explicit `metrics.<id>`. |
| `threshold`, `comparison` | Typed numeric threshold and gt/gte/lt/lte/eq/ne; default comparison gte. |
| `files` | any/all in threshold mode. |
| `scope` | Named scope for a standard measure; not an implicit rebinding of a named formula. |
| `path` | Newline-separated rename-aware immediate path alternatives. |
| `exclude`, `include-only`, `force-include` | Newline-separated path patterns. |
| `exclude-mode`, `include-only-mode`, `force-include-mode` | append by default, or replace. |
| `label` | Single-rule managed assignment label. |
| `remove-label-when-false` | true by default for a generated single rule. |
| `definitions` | Assignment apply: `ensure` default, or `none`, `verify`, `sync`. Definition apply: `sync` default or `ensure`. Definition verification is not a desired-plan operation. |
| `formula` | Advanced numeric detail expression, alternative to metric. |
| `condition` | Advanced boolean detail expression for a generated rule/decision. |
| `parameters` | JSON object of typed bindings. |
| `report-path`, `plan-path`, `effects-path` | Full artifact destinations; never input selection. The effects journal preserves partial outcomes. |
| `input-report`, `input-plan` | Explicit saved-artifact inputs, supported by the apply entry point. |
| `summary` | true by default; controls workflow summary, not machine-result semantics. |
| `operation` | sync-labels only: `verify` by default, or explicit `apply`. |
| `comment-template`, `comment-mode` | Explicit generated comment and lifecycle: create, once, upsert, once-per-transition. A condition or threshold is required. |
| `comment-author`, `comment-author-id` | Expected author for owned-comment readback; default login `github-actions[bot]`. A numeric ID also requires the login. |
| `occasion-id` | Stable create-comment occasion; defaults to workflow run ID plus Action step identity. |

The public input catalog asset declares per-entry-point direction for artifact paths. An apply step uses `input-report` or `input-plan` to consume an artifact; `report-path` and `plan-path` always mean destinations. This explicit naming avoids one string changing between input and output depending on accidental file existence.

Inline expression inputs accept detail directly, with no `${{ ... }}` or `{{ ... }}` wrapper. `formula` and `metric` conflict. `condition` conflicts with threshold/comparison/files shortcut inputs. A complete config/inline policy conflicts with a generated single-rule definition; selected path-list overrides and rule selection remain valid. With full policy,
`metric`/`formula` and optional `scope`/`path` select a numeric output only; they do
not rewrite that policy's conditions, bands or effects.

All Action inputs arrive as strings. Boolean inputs accept the exact documented true/false forms; numeric inputs are validated without unsafe integer coercion. Empty optional inputs mean omitted, not zero or false. Lists are trimmed line-by-line, blank lines ignored, and patterns remain literal data. A deliberate empty replacement list must use explicit policy YAML because an empty Action string means omitted.

## Read-only outputs

Common outputs are strings:

```text
measurement-status
lines-added, lines-added-status, lines-added-min, lines-added-max
lines-deleted, lines-deleted-status, lines-deleted-min, lines-deleted-max
lines-modified, lines-modified-status, lines-modified-min, lines-modified-max
lines-changed, lines-changed-status, lines-changed-min, lines-changed-max
raw-added, raw-deleted, raw-churn
files-total, files-included, files-excluded, files-unmeasurable
metric-value, metric-status, metric-min, metric-max
decision
band, band-status
report-json, report-path
plan-json, plan-path
effects-changed, effects-status, effects-path
```

Every exposed numeric scalar follows the same status/min/max companion convention, including raw/file counts where evidence can be incomplete. The compact catalog is abbreviated above; the [Action surface asset](../../src/diffdevil/contracts/detail/v1/action-surface.json) declares the generation rule.

`*-value` or the plain numeric output is nonempty only for an exact value. Available bounds are emitted independently. `decision` is `true`, `false`, or `unknown` for one selected rule with a decision; otherwise it is empty. `band` is empty when unresolved (with `band-status: unknown`) or when no single band-bearing rule is selected. Selecting numeric output independently does not change either rule result. Do not force unknown into zero or omit its status.

Full per-file reports belong in files. `report-json` has kind
`diffdevil.action-report-summary`; `plan-json` has kind
`diffdevil.action-plan-summary`, both with schema version `1.0`. Neither can be
passed to the full report/plan reader. The report envelope carries identities,
semantics, source, measurement status, totals and selected values. Unknown values
retain status and available bounds plus `reasonCount`; unknown bands also carry
`candidateCount`. Full reasons, candidates, per-file facts and operations remain
in the full artifacts. The plan envelope carries desired operation/hold counts,
not an instruction list. The complete output-command batch is limited to 512 KiB
(UTF-16 approximation) before mutations. [Distribution evidence](../reference/2026-09-14/action-distribution.md)
records the platform boundary.

Root/apply additionally expose effect status, changed-operation count and journal
path. Empty effect outputs mean not applied, not zero observed changes. Analyze
exposes report outputs only. Sync-labels exposes the three effect outputs only.
Exact per-entry names are validated against all four metadata files in ordinary
verification.

`GITHUB_OUTPUT` must be a writable regular runner file. Summary emission also
requires a distinct `GITHUB_STEP_SUMMARY` file unless `summary: 'false'` is selected.
Full artifacts default to unique runner-temporary files. Custom destination parents
must exist, and destinations cannot overwrite input artifacts, event data or runner
command files. A partial effects journal is written before the other artifacts.
These files are local runner artifacts; this Action does not automatically upload
them or claim cross-job retention. Treat reports and plans as potentially sensitive
repository data when selecting workflow uploads and retention.

## Analyze, then revalidate and apply explicitly

```yaml
- uses: Wolfsblvt/diffdevil/actions/analyze@v1
  id: changes
- uses: Wolfsblvt/diffdevil/actions/apply@v1
  with:
    input-report: ${{ steps.changes.outputs.report-path }}
```

The apply Action always reacquires current evidence, even for same-job artifacts.
It compares a supplied report after evaluation under the selected trusted policy
and compares a supplied plan with a freshly derived plan. There is no Action
`trust-report` input or implicit authenticated cache. The CLI/API's explicit
trusted-carrier option is a different host contract. Same-job paths, schema
validity and matching hashes do not authenticate an artifact from an untrusted job.

The apply adapter validates semantic versions, source comparison identity, selected trusted policy, and current head/base conditions before mutation. It rejects stale plans. GitHub does not provide a single atomic transaction for multiple labels/comments; report partial provider failures honestly and re-read actual state before retry.

## Definition synchronization

```yaml
- uses: Wolfsblvt/diffdevil/actions/sync-labels@v1
  with:
    operation: verify
```

`operation: apply` is the explicit reconciliation path. Its default definition behavior is sync of the selected managed definitions; `definitions: ensure` creates missing names only. Neither operation evaluates PR-size rules or changes PR assignments. A config
selected from the repository base is pinned to the observed default-branch commit
and rechecked before writes and at completion; base drift stops synchronization.

The root Action's ensure-missing composition exists specifically so normal users do not have to run this separate operation first. The separate operation remains useful for deliberate metadata synchronization and CI verification.

## Trusted policy and hostile diff separation

The API diff may be hostile. Its paths, line contents, and provider strings are treated as inert data. Apply policy controls bot effects and must come from a trusted source: bundled preset, inline trusted workflow input, or a pinned/base-ref configuration. A PR cannot replace that policy by editing its own `.diffdevil.yml`. Explicit
workspace selection remains read-only, and its policy/template reads are confined
to the selected workspace, including symlink targets. Relative template paths may
leave the config subdirectory only while remaining inside that workspace.

The default root workflow uses `pull_request_target` and no checkout. Read-only `pull_request` workflows may analyze a checkout normally. A local-Git source in a privileged job remains an explicit route with controlled Git commands and no execution of repository scripts. The boundary is not “checkout is forbidden”; it is “untrusted executable content does not receive privileged credentials.” See [G2](../reference/2026-09-09/sources-and-research.md#g2).

GitHub interpolation runs before diffdevil. Do not insert PR titles or branch names into a `formula`/`condition` string. Bind values through the `parameters` JSON input or a trusted parameter file, with correct host serialization. A raw expression template is not a safe data channel.

## Concurrency and events

Target inference accepts pull_request, pull_request_target and PR issue_comment
events. Other events require explicit repository/PR selection; sync-labels needs
only a repository. Event files supply target identity, not trusted current head/base
facts. The minimal workflow handles opened, reopened, and synchronized PRs. It intentionally omits labeled/unlabeled events to avoid a self-triggering assignment loop. A repository can add ready-for-review or an explicit dispatch refresh when useful.

An optional concurrency group keyed by repository and PR can cancel obsolete runs. It is a scheduling optimization, not a substitute for source identity checks before apply. Manual removal of a managed size label is corrected on the next selected refresh event; the preset does not claim perpetual enforcement between events.

## Comments remain explicit

A `comment-template` and `comment-mode` are supported in generated single-rule mode; both must be deliberate inputs. Full policies use the structured comment section. No template is supplied merely because a threshold matched. See [Templates](templates.md) for rendering, ownership, and transition behavior.

Workflow summaries carry measurement detail independently of PR comments. Disabling comments does not hide what was measured or why a label was selected.

## Existing labels that cannot be assigned

The definition adapter must distinguish an existing assignable label from a label that exists but cannot currently be assigned, including an archived label where supported by the provider. Default `ensure` creates missing definitions but does not silently undo deliberate existing definition state. An unusable required definition produces `E_LABEL_UNAVAILABLE` before assignment changes. Explicit definition synchronization may restore the required managed label to assignable state as part of its stated reconciliation. This exception must report the exact label and the explicit `labels apply` repair route; it must not pretend first-run setup succeeded. Provider capability and permissions must be checked against the current API [G1](../reference/2026-09-09/sources-and-research.md).

## Process result and error transport

Actions exit **0** for completed analysis/planning or verified reconciliation,
**1** for definition-verification drift, and **2** for invalid input, failed
acquisition or incomplete application. An ordinary false or unknown analysis
condition is an output, not automatically a failing Action. This deliberately
differs from the CLI `check` command's exit-code protocol.

A stale report, plan or trusted policy fails before applying its obsolete result.
If provider state changed after some operations already completed, the result is
incomplete and retains those observations rather than pretending rollback occurred.
Provider acknowledgments are not counted as changed without readback.

The stream entry emits only escaped error/masking workflow commands; library and
provider code do not print raw patches, token values, event payloads or progress.
Multiline outputs use independent collision-checked delimiters. Summary markup is
escaped and truncated only at the presentation boundary, with the full journal
retained. Local process tests do not prove GitHub's own secret masking or rendered UI.

[Distribution paths and rebuilds](action-distribution.md) · [Qualification](../QUALIFICATION.md)
