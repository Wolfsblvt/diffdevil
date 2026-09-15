# Automatically label pull-request size

## Meaning

Add one workflow to maintain replacement-aware PR-size labels, including on fork
pull requests. This is the shortest complete setup: no checkout, configuration
file, manual label creation, package installation, or personal token. It also
explains the result, the permissions, and the first useful customizations.

## Add one workflow

**Release-candidate note:** the workflow below targets the intended first public
`v1` release. That ref has not been published in this candidate. Once the release
exists, the file is ready to copy unchanged. Before publication, use the local
Action qualification described in [Development](../DEVELOPMENT.md), not a
nonexistent remote ref. The copyable source is
[`examples/workflows/size.yml`](../examples/workflows/size.yml).

Save this as `.github/workflows/diffdevil.yml` in the repository whose PRs you want
to label, then merge it into that repository's **default branch**:

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

Open or update a pull request. A successful run creates any missing `size/*`
label definitions and leaves exactly one applicable managed size label on the PR.
It does not remove unrelated labels or post a comment. Look in the workflow run's
summary for the compared revisions, counted files, measurements, and observed
label changes. An existing PR is not retroactively processed merely by adding the
workflow; its next matching event, or a rerun of an existing run, triggers work.

`edited` includes retargeting the PR, which can change the comparison. The
concurrency group serializes runs for one PR and avoids canceling a run halfway
through a write. GitHub may replace a queued run with a newer one; every actual
invocation acquires current PR evidence rather than trusting an old event SHA.

## What the labels mean

| Label | Replacement-aware changed lines |
| --- | ---: |
| `size/XS` | 0–19 |
| `size/S` | 20–99 |
| `size/M` | 100–499 |
| `size/L` | 500–999 |
| `size/XL` | 1,000 or more |
| `size/Unknown` | Available evidence cannot establish one band |

Replacing three adjacent lines with three new lines counts as **three modified
lines**, not six changed lines. Raw churn still reports all six additions and
deletions. Unrelated additions and deletions at separate edit locations do not
cancel each other.

The bundled `size@1` preset includes all changed paths unless you explicitly
exclude some. It does not automatically ignore lockfiles, generated sources,
formatting changes, or documentation. A large result does not fail the workflow
just for being large. Size is orientation, not importance, risk, or code quality.

A missing or truncated patch need not force `Unknown`: when every possible count
falls in one band, that band is proven from bounds. A range crossing a boundary
or material changes that cannot be measured in lines can yield `size/Unknown`.
A configuration error instead fails the run; it is not an unknown-size result.

## Why these permissions and this event

The root Action uses the workflow token automatically. The label endpoints accept
Pull requests write permission, which also covers reading the PR. The bundled
preset needs no repository file read. Adding `config:` or a repository template
also requires `contents: read`.

`pull_request_target` lets this workflow label PRs from forks. GitHub runs this
workflow from the base repository's **default branch**; diffdevil's separate
`policy-source: base` setting reads a configured policy from the PR's current
**target base commit**, which may be on a release branch. These are different
sources. The no-config recipe reads no repository policy at all.

Keep this job free of PR-head checkout, install, build, tests, or scripts. The
Action reads patches as data and runs its shipped JavaScript. Put ordinary PR
build/test work in a separate `pull_request` workflow with read-only permissions.
Repository or organization restrictions may still prevent the run or its writes.
The [dated provider notes](../reference/2026-09-15/github-workflows.md) link the
official event, permission, and runtime contracts.

## Make one useful change

To omit known generated material, add inputs to the same step:

```yaml
      - uses: Wolfsblvt/diffdevil@v1
        with:
          exclude: |
            **/package-lock.json
            **/bin/**
            **/obj/**
```

These exclusions are examples, not universal recommendations. Only exclude paths
whose omission makes sense in your repository. Rename decisions consider both
old and new paths; moving authored code under an excluded folder does not make it
silently disappear.

For custom thresholds or names, keep `size@1` and use a small
[policy file](../integration/presets-and-shortcuts.md). For source/test signals,
custom metrics, and one updated comment, use the
[policy recipes](policy-recipes.md). Do not copy a complete engine configuration
just to exclude one file.

## Read-only instead

Use `Wolfsblvt/diffdevil/actions/analyze@v1` with `pull-requests: read`. It emits the same
facts and a summary but never writes labels or comments, even if a write-capable
token is supplied. [The analyze workflow](../examples/workflows/analyze.yml)
is a complete example. Do not assume the root Action is read-only: choosing it
selects the documented size-label application unless `mode` says otherwise.

## Troubleshooting

| Symptom | Check or action |
| --- | --- |
| The Action ref cannot be resolved | The release must exist. Pin a reviewed published commit SHA for an immutable deployment instead of inventing a SHA. |
| No workflow run appears | Put the workflow on the default branch, trigger a listed event, and inspect repository/organization Actions restrictions. |
| Permission or inaccessible-resource error | Check effective Pull requests write permission. Custom policy files need Contents read; a private-resource 404 is not proof that the file does not exist. |
| An existing size label has a different color | Default ensure mode deliberately preserves existing metadata. Use explicit definition sync to change it. |
| A required label is archived | Unarchive it deliberately or run explicit definition sync. Ensure mode does not silently undo an archive. |
| `size/Unknown` | Inspect status, bounds, included unmeasurable files, and file-list completeness in the report. Never substitute zero for unavailable evidence. |
| A stale-source error | Rerun against the current head/base/policy. Saved artifacts are evidence to revalidate, not permission to apply old effects. |
| The run reports partial effects | Inspect the effects journal and current provider state. Earlier observed changes are not rolled back. Rerun only after reconciling the uncertainty. |

This recipe is exercised locally against fake HTTP by the example and distributed
Action tests. Hosted event delivery and real permission behavior remain separate
release-canary evidence.
