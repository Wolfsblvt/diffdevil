# GitHub Actions reference

The root Action and three sub-actions share one policy engine. Choose the entry
by the responsibility it should own, then use the exact metadata inventory below.
The [Actions guide](../use/github-actions.md) owns the operating journey. This page
does not turn source qualification into a claim that a workflow ran in your repository.

## Four entry points

| Entry | Default responsibility |
| --- | --- |
| `Wolfsblvt/diffdevil@v1` | Apply the default size policy, ensure missing definitions, preserve unrelated labels, no comments. Root mode can select analyze, plan or apply. |
| `Wolfsblvt/diffdevil/actions/analyze@v1` | Read-only analysis and selected metric/decision outputs. Effect inputs are rejected. |
| `Wolfsblvt/diffdevil/actions/apply@v1` | Reacquire, revalidate and explicitly apply trusted policy. |
| `Wolfsblvt/diffdevil/actions/sync-labels@v1` | Verify or apply managed repository definitions, not PR assignments. |

The metadata selects Node 24 and bundled runtime paths. Consumer jobs do not
install the Action's dependencies. A maintained major reference and an immutable
release/commit have different update behavior. The chosen reference must actually
ship every documented input; generating this reference does not move any tag.

## Permissions, events and complete examples

This complete [root workflow](../../examples/workflows/size.yml) selects label
writes deliberately and does not execute PR code:

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

The complete [read-only workflow](../../examples/workflows/analyze.yml) selects
a different responsibility:

```yaml
name: Analyze pull-request diff
on:
  pull_request:
    types: [opened, reopened, synchronize]
permissions:
  pull-requests: read
jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: Wolfsblvt/diffdevil/actions/analyze@v1
        id: diff
        with:
          metric: changed
          threshold: '100'
          comparison: gt
      - name: Report a resolved threshold
        if: steps.diff.outputs.decision == 'true'
        run: echo "The comparison exceeds 100 replacement-aware changed lines."
```

No-config API analysis needs PR reads; applying labels needs the appropriate
repository permission. Explicit base/pinned config additionally needs Contents
access. A `policy-token` can supply read-only trusted-policy/template reads separately
from the `github-token` that acquires the PR and owns effects. Omitting it retains
the single-credential route. Metadata defaults do not override repository or
organization restrictions.

Target inference accepts PR, PR-target and PR issue-comment contexts; other events
need explicit repository and PR selection. An event payload supplies identity, not
trusted current head/base evidence. The root specimen omits label-change events so
its own reconciliation is not a selected event loop. Concurrency can serialize
or cancel selected refreshes but never replaces freshness checks; cancellation of
an active writer also does not roll back requests already performed.

## Trusted configuration and input combinations

Omitted `config` means bundled defaults, not automatic workspace or account-wide
configuration discovery. Base/pinned policy and relative templates share a trusted
commit. A PR-head edit cannot replace write policy. Workspace policy is read-only
in Actions and its reads, including symlink targets, remain within the selected
workspace. Do not execute untrusted PR scripts in a privileged job.

Simple metric/path selection stays language-free. Threshold/condition/effect
shorthand creates a standalone single-rule policy without a hidden size rule.
A full policy may select output metrics/formulas/scopes without changing its declared
effects, but cannot be combined with conflicting inline rule generation. Parameters
are typed JSON data, not workflow-interpolated strings spliced into expressions.

## Exact inputs, defaults and outputs

The following inventories come from the four canonical `action.yml` files. Each
entry retains its own applicability, required flag and declared default. Edit the
canonical Action source and rebuild metadata, not these generated boundaries.
Descriptions here are exact metadata, not a substitute for the authored trust and
artifact explanations in this page.

<!-- manual:generated actions -->
### action.yml

[Canonical Action metadata](../../../action.yml)

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `github-token` | No | `"${{ github.token }}"` | GitHub credential for the selected repository. A token does not enable writes. |
| `policy-token` | No | Not declared | Optional read credential used only for trusted base/pinned policy and repository-relative template acquisition. |
| `repository` | No | Not declared | Target owner/repository. Defaults to the workflow repository. |
| `pull-request` | No | Not declared | Positive PR number. Defaults to a PR event or PR issue-comment event. |
| `source` | No | Not declared | github-api (default), or git for controlled local comparison of the live PR revisions. |
| `git-cwd` | No | Not declared | Checkout directory for source: git. Defaults to GITHUB_WORKSPACE. |
| `mode` | No | Not declared | Root operation: analyze, plan, or apply (default). |
| `preset` | No | Not declared | size@1 (implicit default), or none. Single-rule shorthand does not implicitly add size rules. |
| `config` | No | Not declared | Explicit policy file. Loaded from the PR base by default; no workspace discovery. |
| `policy` | No | Not declared | Inline YAML/JSON policy from a trusted workflow, mutually exclusive with config. |
| `policy-source` | No | Not declared | base (default), pinned, or workspace. Workspace policy is read-only in Actions. |
| `policy-ref` | No | Not declared | Full commit SHA required by policy-source: pinned. |
| `policy-repository` | No | Not declared | Optional owner/repository for policy-source: pinned. |
| `rule` | No | Not declared | Select one declared rule. Absent selects all; sync-labels selects its definitions only. |
| `metric` | No | Not declared | Standard measure alias or metrics.<id>, default changed. With full policy, selects numeric output only. Alternative to formula. |
| `threshold` | No | Not declared | Typed numeric threshold for a generated rule; default comparison gte. |
| `comparison` | No | Not declared | Threshold comparison: gt, gte, lt, lte, eq, or ne. |
| `files` | No | Not declared | Threshold quantifier: any or all included files. |
| `scope` | No | Not declared | Named scope for a standard measure, not rebinding a named formula. |
| `path` | No | Not declared | Newline-separated rename-aware path alternatives for a shortcut. |
| `exclude` | No | Not declared | Newline-separated exclusion patterns; no implicit blacklist. |
| `include-only` | No | Not declared | Newline-separated inclusion alternatives. |
| `force-include` | No | Not declared | Newline-separated overrides of exclusions. |
| `exclude-mode` | No | Not declared | append (default) or replace for the exclusion list. |
| `include-only-mode` | No | Not declared | append (default) or replace for the inclusion list. |
| `force-include-mode` | No | Not declared | append (default) or replace for the force-inclusion list. |
| `label` | No | Not declared | Label assigned by a generated threshold/condition rule. |
| `remove-label-when-false` | No | Not declared | true (default) or false for generated label removal on a resolved false decision. |
| `definitions` | No | Not declared | Assignment apply: ensure (default), none, verify, sync. Definition apply: sync (default) or ensure. |
| `formula` | No | Not declared | Numeric detail expression for a generated metric; with full policy, selects numeric output only. Alternative to metric. |
| `condition` | No | Not declared | Boolean detail expression for a generated rule. Alternative to threshold/comparison/files. |
| `parameters` | No | Not declared | JSON object of typed parameter bindings. Values are data, never detail source. |
| `report-path` | No | Not declared | Full report destination, never input. Defaults to a unique runner-temporary file. |
| `plan-path` | No | Not declared | Full desired plan destination in plan/apply mode, never input. |
| `effects-path` | No | Not declared | Full provider observation journal destination, including partial writes. |
| `summary` | No | Not declared | true (default) or false. Write a workflow summary without posting a PR comment. |
| `comment-template` | No | Not declared | Explicit generated comment template; requires comment-mode and a condition/threshold. |
| `comment-mode` | No | Not declared | Explicit create, once, upsert, or once-per-transition comment lifecycle. |
| `comment-author` | No | Not declared | Expected bot login for owned-comment readback. Default github-actions[bot]. |
| `comment-author-id` | No | Not declared | Optional positive numeric identity for owned-comment readback. |
| `occasion-id` | No | Not declared | Stable workflow occasion for create comments; defaults to run ID plus Action step identity. |

| Output | Description |
| --- | --- |
| `lines-added` | lines-added; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `lines-added-status` | lines-added-status; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `lines-added-min` | lines-added-min; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `lines-added-max` | lines-added-max; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `lines-deleted` | lines-deleted; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `lines-deleted-status` | lines-deleted-status; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `lines-deleted-min` | lines-deleted-min; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `lines-deleted-max` | lines-deleted-max; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `lines-modified` | lines-modified; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `lines-modified-status` | lines-modified-status; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `lines-modified-min` | lines-modified-min; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `lines-modified-max` | lines-modified-max; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `lines-changed` | lines-changed; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `lines-changed-status` | lines-changed-status; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `lines-changed-min` | lines-changed-min; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `lines-changed-max` | lines-changed-max; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `raw-added` | raw-added; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `raw-added-status` | raw-added-status; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `raw-added-min` | raw-added-min; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `raw-added-max` | raw-added-max; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `raw-deleted` | raw-deleted; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `raw-deleted-status` | raw-deleted-status; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `raw-deleted-min` | raw-deleted-min; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `raw-deleted-max` | raw-deleted-max; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `raw-churn` | raw-churn; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `raw-churn-status` | raw-churn-status; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `raw-churn-min` | raw-churn-min; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `raw-churn-max` | raw-churn-max; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `files-total` | files-total; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `files-total-status` | files-total-status; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `files-total-min` | files-total-min; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `files-total-max` | files-total-max; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `files-included` | files-included; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `files-included-status` | files-included-status; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `files-included-min` | files-included-min; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `files-included-max` | files-included-max; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `files-excluded` | files-excluded; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `files-excluded-status` | files-excluded-status; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `files-excluded-min` | files-excluded-min; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `files-excluded-max` | files-excluded-max; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `files-unmeasurable` | files-unmeasurable; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `files-unmeasurable-status` | files-unmeasurable-status; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `files-unmeasurable-min` | files-unmeasurable-min; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `files-unmeasurable-max` | files-unmeasurable-max; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `measurement-status` | measurement-status; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `metric-value` | metric-value; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `metric-status` | metric-status; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `metric-min` | metric-min; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `metric-max` | metric-max; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `decision` | decision; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `band` | band; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `band-status` | band-status; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `report-json` | Compact diffdevil.action-report-summary, not a full report. Full JSON is at report-path. |
| `report-path` | report-path; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `plan-json` | Compact diffdevil.action-plan-summary, not an executable plan. Full JSON is at plan-path. |
| `plan-path` | plan-path; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `effects-changed` | Count of operations with verified changed readback; empty when effects were not applied. |
| `effects-status` | effects-status; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `effects-path` | effects-path; see the Action manual for exact, bounded, unavailable and not-applied values. |

### actions/analyze/action.yml

[Canonical Action metadata](../../../actions/analyze/action.yml)

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `github-token` | No | `"${{ github.token }}"` | GitHub credential for the selected repository. A token does not enable writes. |
| `policy-token` | No | Not declared | Optional read credential used only for trusted base/pinned policy and repository-relative template acquisition. |
| `repository` | No | Not declared | Target owner/repository. Defaults to the workflow repository. |
| `pull-request` | No | Not declared | Positive PR number. Defaults to a PR event or PR issue-comment event. |
| `source` | No | Not declared | github-api (default), or git for controlled local comparison of the live PR revisions. |
| `git-cwd` | No | Not declared | Checkout directory for source: git. Defaults to GITHUB_WORKSPACE. |
| `preset` | No | Not declared | size@1 (implicit default), or none. Single-rule shorthand does not implicitly add size rules. |
| `config` | No | Not declared | Explicit policy file. Loaded from the PR base by default; no workspace discovery. |
| `policy` | No | Not declared | Inline YAML/JSON policy from a trusted workflow, mutually exclusive with config. |
| `policy-source` | No | Not declared | base (default), pinned, or workspace. Workspace policy is read-only in Actions. |
| `policy-ref` | No | Not declared | Full commit SHA required by policy-source: pinned. |
| `policy-repository` | No | Not declared | Optional owner/repository for policy-source: pinned. |
| `rule` | No | Not declared | Select one declared rule. Absent selects all; sync-labels selects its definitions only. |
| `metric` | No | Not declared | Standard measure alias or metrics.<id>, default changed. With full policy, selects numeric output only. Alternative to formula. |
| `threshold` | No | Not declared | Typed numeric threshold for a generated rule; default comparison gte. |
| `comparison` | No | Not declared | Threshold comparison: gt, gte, lt, lte, eq, or ne. |
| `files` | No | Not declared | Threshold quantifier: any or all included files. |
| `scope` | No | Not declared | Named scope for a standard measure, not rebinding a named formula. |
| `path` | No | Not declared | Newline-separated rename-aware path alternatives for a shortcut. |
| `exclude` | No | Not declared | Newline-separated exclusion patterns; no implicit blacklist. |
| `include-only` | No | Not declared | Newline-separated inclusion alternatives. |
| `force-include` | No | Not declared | Newline-separated overrides of exclusions. |
| `exclude-mode` | No | Not declared | append (default) or replace for the exclusion list. |
| `include-only-mode` | No | Not declared | append (default) or replace for the inclusion list. |
| `force-include-mode` | No | Not declared | append (default) or replace for the force-inclusion list. |
| `formula` | No | Not declared | Numeric detail expression for a generated metric; with full policy, selects numeric output only. Alternative to metric. |
| `condition` | No | Not declared | Boolean detail expression for a generated rule. Alternative to threshold/comparison/files. |
| `parameters` | No | Not declared | JSON object of typed parameter bindings. Values are data, never detail source. |
| `report-path` | No | Not declared | Full report destination, never input. Defaults to a unique runner-temporary file. |
| `summary` | No | Not declared | true (default) or false. Write a workflow summary without posting a PR comment. |

| Output | Description |
| --- | --- |
| `lines-added` | lines-added; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `lines-added-status` | lines-added-status; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `lines-added-min` | lines-added-min; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `lines-added-max` | lines-added-max; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `lines-deleted` | lines-deleted; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `lines-deleted-status` | lines-deleted-status; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `lines-deleted-min` | lines-deleted-min; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `lines-deleted-max` | lines-deleted-max; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `lines-modified` | lines-modified; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `lines-modified-status` | lines-modified-status; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `lines-modified-min` | lines-modified-min; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `lines-modified-max` | lines-modified-max; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `lines-changed` | lines-changed; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `lines-changed-status` | lines-changed-status; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `lines-changed-min` | lines-changed-min; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `lines-changed-max` | lines-changed-max; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `raw-added` | raw-added; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `raw-added-status` | raw-added-status; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `raw-added-min` | raw-added-min; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `raw-added-max` | raw-added-max; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `raw-deleted` | raw-deleted; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `raw-deleted-status` | raw-deleted-status; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `raw-deleted-min` | raw-deleted-min; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `raw-deleted-max` | raw-deleted-max; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `raw-churn` | raw-churn; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `raw-churn-status` | raw-churn-status; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `raw-churn-min` | raw-churn-min; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `raw-churn-max` | raw-churn-max; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `files-total` | files-total; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `files-total-status` | files-total-status; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `files-total-min` | files-total-min; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `files-total-max` | files-total-max; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `files-included` | files-included; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `files-included-status` | files-included-status; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `files-included-min` | files-included-min; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `files-included-max` | files-included-max; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `files-excluded` | files-excluded; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `files-excluded-status` | files-excluded-status; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `files-excluded-min` | files-excluded-min; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `files-excluded-max` | files-excluded-max; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `files-unmeasurable` | files-unmeasurable; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `files-unmeasurable-status` | files-unmeasurable-status; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `files-unmeasurable-min` | files-unmeasurable-min; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `files-unmeasurable-max` | files-unmeasurable-max; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `measurement-status` | measurement-status; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `metric-value` | metric-value; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `metric-status` | metric-status; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `metric-min` | metric-min; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `metric-max` | metric-max; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `decision` | decision; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `band` | band; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `band-status` | band-status; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `report-json` | Compact diffdevil.action-report-summary, not a full report. Full JSON is at report-path. |
| `report-path` | report-path; see the Action manual for exact, bounded, unavailable and not-applied values. |

### actions/apply/action.yml

[Canonical Action metadata](../../../actions/apply/action.yml)

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `github-token` | No | `"${{ github.token }}"` | GitHub credential for the selected repository. A token does not enable writes. |
| `policy-token` | No | Not declared | Optional read credential used only for trusted base/pinned policy and repository-relative template acquisition. |
| `repository` | No | Not declared | Target owner/repository. Defaults to the workflow repository. |
| `pull-request` | No | Not declared | Positive PR number. Defaults to a PR event or PR issue-comment event. |
| `source` | No | Not declared | github-api (default), or git for controlled local comparison of the live PR revisions. |
| `git-cwd` | No | Not declared | Checkout directory for source: git. Defaults to GITHUB_WORKSPACE. |
| `preset` | No | Not declared | size@1 (implicit default), or none. Single-rule shorthand does not implicitly add size rules. |
| `config` | No | Not declared | Explicit policy file. Loaded from the PR base by default; no workspace discovery. |
| `policy` | No | Not declared | Inline YAML/JSON policy from a trusted workflow, mutually exclusive with config. |
| `policy-source` | No | Not declared | base (default), pinned, or workspace. Workspace policy is read-only in Actions. |
| `policy-ref` | No | Not declared | Full commit SHA required by policy-source: pinned. |
| `policy-repository` | No | Not declared | Optional owner/repository for policy-source: pinned. |
| `rule` | No | Not declared | Select one declared rule. Absent selects all; sync-labels selects its definitions only. |
| `metric` | No | Not declared | Standard measure alias or metrics.<id>, default changed. With full policy, selects numeric output only. Alternative to formula. |
| `threshold` | No | Not declared | Typed numeric threshold for a generated rule; default comparison gte. |
| `comparison` | No | Not declared | Threshold comparison: gt, gte, lt, lte, eq, or ne. |
| `files` | No | Not declared | Threshold quantifier: any or all included files. |
| `scope` | No | Not declared | Named scope for a standard measure, not rebinding a named formula. |
| `path` | No | Not declared | Newline-separated rename-aware path alternatives for a shortcut. |
| `exclude` | No | Not declared | Newline-separated exclusion patterns; no implicit blacklist. |
| `include-only` | No | Not declared | Newline-separated inclusion alternatives. |
| `force-include` | No | Not declared | Newline-separated overrides of exclusions. |
| `exclude-mode` | No | Not declared | append (default) or replace for the exclusion list. |
| `include-only-mode` | No | Not declared | append (default) or replace for the inclusion list. |
| `force-include-mode` | No | Not declared | append (default) or replace for the force-inclusion list. |
| `label` | No | Not declared | Label assigned by a generated threshold/condition rule. |
| `remove-label-when-false` | No | Not declared | true (default) or false for generated label removal on a resolved false decision. |
| `definitions` | No | Not declared | Assignment apply: ensure (default), none, verify, sync. Definition apply: sync (default) or ensure. |
| `formula` | No | Not declared | Numeric detail expression for a generated metric; with full policy, selects numeric output only. Alternative to metric. |
| `condition` | No | Not declared | Boolean detail expression for a generated rule. Alternative to threshold/comparison/files. |
| `parameters` | No | Not declared | JSON object of typed parameter bindings. Values are data, never detail source. |
| `report-path` | No | Not declared | Full report destination, never input. Defaults to a unique runner-temporary file. |
| `plan-path` | No | Not declared | Full desired plan destination in plan/apply mode, never input. |
| `effects-path` | No | Not declared | Full provider observation journal destination, including partial writes. |
| `summary` | No | Not declared | true (default) or false. Write a workflow summary without posting a PR comment. |
| `input-report` | No | Not declared | Saved report to validate against fresh acquisition; never accepted as write authority. |
| `input-plan` | No | Not declared | Saved plan to compare with a freshly evaluated trusted policy before writes. |
| `comment-template` | No | Not declared | Explicit generated comment template; requires comment-mode and a condition/threshold. |
| `comment-mode` | No | Not declared | Explicit create, once, upsert, or once-per-transition comment lifecycle. |
| `comment-author` | No | Not declared | Expected bot login for owned-comment readback. Default github-actions[bot]. |
| `comment-author-id` | No | Not declared | Optional positive numeric identity for owned-comment readback. |
| `occasion-id` | No | Not declared | Stable workflow occasion for create comments; defaults to run ID plus Action step identity. |

| Output | Description |
| --- | --- |
| `lines-added` | lines-added; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `lines-added-status` | lines-added-status; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `lines-added-min` | lines-added-min; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `lines-added-max` | lines-added-max; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `lines-deleted` | lines-deleted; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `lines-deleted-status` | lines-deleted-status; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `lines-deleted-min` | lines-deleted-min; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `lines-deleted-max` | lines-deleted-max; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `lines-modified` | lines-modified; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `lines-modified-status` | lines-modified-status; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `lines-modified-min` | lines-modified-min; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `lines-modified-max` | lines-modified-max; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `lines-changed` | lines-changed; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `lines-changed-status` | lines-changed-status; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `lines-changed-min` | lines-changed-min; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `lines-changed-max` | lines-changed-max; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `raw-added` | raw-added; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `raw-added-status` | raw-added-status; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `raw-added-min` | raw-added-min; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `raw-added-max` | raw-added-max; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `raw-deleted` | raw-deleted; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `raw-deleted-status` | raw-deleted-status; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `raw-deleted-min` | raw-deleted-min; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `raw-deleted-max` | raw-deleted-max; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `raw-churn` | raw-churn; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `raw-churn-status` | raw-churn-status; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `raw-churn-min` | raw-churn-min; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `raw-churn-max` | raw-churn-max; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `files-total` | files-total; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `files-total-status` | files-total-status; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `files-total-min` | files-total-min; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `files-total-max` | files-total-max; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `files-included` | files-included; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `files-included-status` | files-included-status; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `files-included-min` | files-included-min; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `files-included-max` | files-included-max; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `files-excluded` | files-excluded; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `files-excluded-status` | files-excluded-status; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `files-excluded-min` | files-excluded-min; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `files-excluded-max` | files-excluded-max; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `files-unmeasurable` | files-unmeasurable; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `files-unmeasurable-status` | files-unmeasurable-status; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `files-unmeasurable-min` | files-unmeasurable-min; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `files-unmeasurable-max` | files-unmeasurable-max; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `measurement-status` | measurement-status; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `metric-value` | metric-value; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `metric-status` | metric-status; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `metric-min` | metric-min; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `metric-max` | metric-max; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `decision` | decision; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `band` | band; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `band-status` | band-status; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `report-json` | Compact diffdevil.action-report-summary, not a full report. Full JSON is at report-path. |
| `report-path` | report-path; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `plan-json` | Compact diffdevil.action-plan-summary, not an executable plan. Full JSON is at plan-path. |
| `plan-path` | plan-path; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `effects-changed` | Count of operations with verified changed readback; empty when effects were not applied. |
| `effects-status` | effects-status; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `effects-path` | effects-path; see the Action manual for exact, bounded, unavailable and not-applied values. |

### actions/sync-labels/action.yml

[Canonical Action metadata](../../../actions/sync-labels/action.yml)

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `github-token` | No | `"${{ github.token }}"` | GitHub credential for the selected repository. A token does not enable writes. |
| `policy-token` | No | Not declared | Optional read credential used only for trusted base/pinned policy and repository-relative template acquisition. |
| `repository` | No | Not declared | Target owner/repository. Defaults to the workflow repository. |
| `preset` | No | Not declared | size@1 (implicit default), or none. Single-rule shorthand does not implicitly add size rules. |
| `config` | No | Not declared | Explicit policy file. Loaded from the PR base by default; no workspace discovery. |
| `policy` | No | Not declared | Inline YAML/JSON policy from a trusted workflow, mutually exclusive with config. |
| `policy-source` | No | Not declared | base (default), pinned, or workspace. Workspace policy is read-only in Actions. |
| `policy-ref` | No | Not declared | Full commit SHA required by policy-source: pinned. |
| `policy-repository` | No | Not declared | Optional owner/repository for policy-source: pinned. |
| `rule` | No | Not declared | Select one declared rule. Absent selects all; sync-labels selects its definitions only. |
| `exclude` | No | Not declared | Newline-separated exclusion patterns; no implicit blacklist. |
| `include-only` | No | Not declared | Newline-separated inclusion alternatives. |
| `force-include` | No | Not declared | Newline-separated overrides of exclusions. |
| `exclude-mode` | No | Not declared | append (default) or replace for the exclusion list. |
| `include-only-mode` | No | Not declared | append (default) or replace for the inclusion list. |
| `force-include-mode` | No | Not declared | append (default) or replace for the force-inclusion list. |
| `definitions` | No | Not declared | Assignment apply: ensure (default), none, verify, sync. Definition apply: sync (default) or ensure. |
| `effects-path` | No | Not declared | Full provider observation journal destination, including partial writes. |
| `summary` | No | Not declared | true (default) or false. Write a workflow summary without posting a PR comment. |
| `operation` | No | Not declared | verify (default, read-only) or apply declared repository label definitions. |

| Output | Description |
| --- | --- |
| `effects-changed` | Count of operations with verified changed readback; empty when effects were not applied. |
| `effects-status` | effects-status; see the Action manual for exact, bounded, unavailable and not-applied values. |
| `effects-path` | effects-path; see the Action manual for exact, bounded, unavailable and not-applied values. |
<!-- /manual:generated actions -->

## Scalars, summaries and full artifacts

Scalar outputs retain status and independently available lower/upper bounds.
An exact-value output is nonempty only when exactness is established. A numeric
empty field is not zero. A selected boolean `decision` can be true, false or unknown;
no applicable single decision is empty. An unresolved band has explicit unknown
standing, not an invented band ID.

`report-json`, `plan-json` and `effects-json` are compact Action summary envelopes,
not the full artifacts. Their kinds are `diffdevil.action-report-summary`,
`diffdevil.action-plan-summary` and `diffdevil.action-effects-summary` with schema
version `1.0`. Full reasons, candidates, files, operations and observations stay in
`report-path`, `plan-path` and `effects-path`. Summary truncation does not change
canonical measurements or license truncating the full artifact.

`GITHUB_OUTPUT` must be a writable regular runner file. Unless summary is disabled,
`GITHUB_STEP_SUMMARY` must be a distinct file. Full artifacts default to unique
runner-temporary paths; custom parent directories must already exist, and destinations
cannot overwrite inputs, event data or command files. The partial effects journal is
written before the other artifacts. File creation is not automatic upload or cross-job
retention. Choose uploads and retention deliberately for potentially sensitive data.

## Revalidate before applying

The [complete analyze/apply workflow](../../examples/workflows/analyze-and-apply.yml)
uses the full report path, not compact JSON output. The apply Action **always
reacquires** current evidence. Supplied reports are compared after evaluation under
the selected trusted policy; supplied plans must match freshly derived plans.
There is no Action `trust-report` input. Same-job files, matching hashes and a valid
schema are not artifact authentication.

Definition synchronization observes the default-branch commit and refuses relevant
base drift. Ensure preserves existing metadata; sync deliberately reconciles managed
metadata. An unavailable required label produces `E_LABEL_UNAVAILABLE`, with explicit
synchronization as the repair when authorized. Comments require explicit policy or
supported template inputs and retain expected author/lifecycle/occasion boundaries.

## Process result and recovery

Actions exit 0 for completed analysis/planning or verified reconciliation, 1 for
known definition-verification drift, and 2 for invalid input, failed acquisition or
incomplete application. A false or unknown analysis condition is an output, not
automatically a failed Action. This is intentionally different from CLI `check`.

Stale evidence or policy refuses the obsolete write. If some requests happened
before failure, retain the journal and reconcile actual state; there is no pretend
transaction rollback. Provider acknowledgments are not counted as changed without
readback. Multiline workflow outputs use collision-checked delimiters and escaped
error/masking commands. Local doubles do not prove GitHub's own masking or rendered
UI. Use [Reports, plans and apply](../use/shared-workflows/reports-plans-and-apply.md)
for recovery and [Schemas and compatibility](language-and-contracts/schemas-and-compatibility.md)
for the different artifact contracts.
