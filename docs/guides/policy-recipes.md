# Add useful review signals and comments

## Meaning

These complete policies extend diffdevil beyond size labels: explicit exclusions,
source/test scopes, a repository-defined signal, scalar queries, and an opt-in
comment updated in place. Each recipe names its files, observable results, and
limits. Policies and workflows under `examples/` are the executable source.

## Signal source changes without test-path changes

Copy [`review-signals.yml`](../../examples/policies/review-signals.yml) to
`.github/diffdevil.yml` in the consuming repository. Copy the matching
[`review-signals` workflow](../../examples/workflows/review-signals.yml) to
`.github/workflows/diffdevil.yml`. As with the
[quickstart](auto-label-pull-requests.md), the remote `@v1` coordinate becomes
usable when the first release is published.

This keeps the default size labels, excludes only `**/package-lock.json`, names
source and test scopes, and manages one additional label:

```yaml
metrics:
  sourceReview:
    measure: lines.changed
    scope: source
  testsReview:
    measure: lines.changed
    scope: tests
  removedOrRewritten:
    formula: totals.lines.deleted + totals.lines.modified
rules:
  sourceWithoutTests:
    when: metrics.sourceReview > 0 && metrics.testsReview == 0
    onUnknown: hold
    effects:
      labels:
        add: [review/source-without-tests]
        removeWhenFalse: true
```

That excerpt explains the rule; the linked complete file also declares scopes,
the preset, label metadata, and named queries. Copy the complete file rather than
expecting an excerpt to supply its missing declarations.

The label means exactly that source paths changed and configured test paths did
not. It does **not** mean the change lacks tests, that existing tests are
insufficient, or that the code is risky. Adjust the path scopes to match your
repository. When the condition becomes false, only this declared label is
removed; unrelated labels remain untouched. Unresolved evidence holds the rule
rather than pretending it is false.

Keep both files on the appropriate trusted branches. The workflow runs from the
repository's default branch; `policy-source: base` loads the policy at the current
PR target base commit. A policy change in the PR will not control the privileged
run before it is trusted. Repositories targeting release branches must make that
policy available on those branches, or deliberately select an immutable pinned
policy source.

### Try the same policy locally

```sh
node dist/lib/cli/main.js validate --config examples/policies/review-signals.yml
node dist/lib/cli/main.js query --diff-file examples/diffs/review.diff --config examples/policies/review-signals.yml --name sourceReview --format value
node dist/lib/cli/main.js plan --diff-file examples/diffs/review.diff --config examples/policies/review-signals.yml --target-repo example/repository --target-pr 42 --format json
```

The named query returns **3**. The policy counts **6 changed lines** across three
included files after excluding the four-line lockfile replacement. Test paths
contribute **2**, so `sourceWithoutTests` is false. Its desired plan can remove
that one label and select `size/XS`; it has made no provider requests or changes.
The synthetic target above is only a plan target, not a real repository request.

A production-only patch using these same source changes resolves the rule true.
The example tests exercise that transition and label removal through fake HTTP.

## Keep one useful comment up to date

Copy [`review-comment.yml`](../../examples/policies/review-comment.yml) to
`.github/diffdevil-comment.yml`, and its
[workflow](../../examples/workflows/review-comment.yml) to
`.github/workflows/diffdevil-comment.yml`.

This independent recipe uses `presets: []`: it posts a summary but does not select
size labels. Its complete rule uses `mode: upsert`, `trigger: always`, and a
small explicit template:

```text
**Change summary**

Replacement-aware changed lines: {{ totals.lines.changed }}
Raw churn: {{ totals.raw.churn }}
Deleted-only or modified lines: {{ metrics.removedOrRewritten }}
Included files: {{ totals.files.included }}

These are diff measurements, not a judgment of code quality or risk.
```

On the supplied patch these values are **10**, **16**, **6**, and **4**. A second
identical run does not add or rewrite a comment unnecessarily. Later changes
update the owned comment rather than adding a reply on every push. Ownership
binds to the expected author and policy/rule marker, not just matching visible
text. Changing policy identity can start a new comment lifecycle; it does not
grant ownership of comments written under an unrelated policy.

The default workflow token uses the default `github-actions[bot]` comment actor.
A separately supplied app token needs the matching `comment-author` (and optional
`comment-author-id`). Selecting another actor is not permission to edit arbitrary
comments. All template files used for writes are read from the trusted policy
source, never the PR worktree.

## Use a threshold without a policy file

The [destructive-change workflow](../../examples/workflows/destructive.yml) shows
an inline formula and label. The formula `totals.lines.deleted +
totals.lines.modified` counts positions removed or rewritten, not raw churn.
The threshold is ordinary repository policy; naming it “destructive” does not
establish risk or bad code. Comments remain opt-in.

## Deliberately check or synchronize definitions

The ordinary root Action creates missing definitions but preserves the colors and
descriptions of existing ones. Before deliberately changing managed definitions,
use `/sync-labels` with its default `operation: verify`. Definition drift produces
exit 1 and a journal without writes. Use `operation: apply` and `definitions:
sync` to create/update declared definitions, or `definitions: ensure` to create
only missing ones. Neither operation deletes unrelated definitions.

For the bundled size definitions, these are complete steps within a workflow job
with Pull requests write permission:

```yaml
- uses: Wolfsblvt/diffdevil/sync-labels@v1
  with:
    operation: apply
    definitions: ensure
```

The root Action already does ensure for you; a separate setup workflow is not
required for the quickstart. Use `push` on a trusted branch or an explicit manual
workflow for repository-wide definition synchronization, not an untrusted build
job. See [GitHub Actions](../integration/github-actions.md) for complete metadata,
policy source choices, saved artifacts, and output semantics.
