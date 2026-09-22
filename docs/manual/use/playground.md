# Playground

Use the [Playground](https://diffdevil.dev/playground/) to inspect a real change, experiment with policy and leave with reusable inputs before installing anything. It is a read-only learning surface. It does not install an App, request a personal access token or apply repository labels/comments.

The complete configurable experience is implemented in the website source. Public hosting is a separate release step; the earlier measurement-only Worker is not evidence that every view and export described here is deployed. For source-checkout access, use the [website development route](../../../apps/website/README.md) and open its local `/playground/` page. Its configured API must supply the report and head contracts for live acquisition; frozen examples need no GitHub access.

## Start with a frozen source edition

Open the [lockfile lesson, all-files variant](https://diffdevil.dev/playground/?example=lockfile-scope&variant=all). It selects the retained Vite PR snapshot and standard policy, not whatever that upstream PR looks like today. Expect **22 Changed**, **25 raw churn** and band `s`. The source strip identifies the teaching snapshot and immutable revisions.

Switch to the [without-lockfile variant](https://diffdevil.dev/playground/?example=lockfile-scope&variant=without-lockfile). The selected policy excludes `pnpm-lock.yaml`, leaving **1 Changed**, **2 raw churn** and band `xs`. This changes the question, not the acquired patch. [Try a public pull request](../start/try-a-public-pull-request.md) walks through that first experiment.

The [Examples catalogue](https://diffdevil.dev/examples/) and Playground share one set of lessons and source editions. The other guides cover runtime guards, formatting/snapshots, binary material, similar size with different spread, bounded decisions and incomplete file sets. A link carries separate `example` and `variant` identities. Reuse those links rather than copying a detached count or inventing a synthetic gallery entry.

## Know which comparison you are viewing

A frozen edition retains its source, policy and provenance. A live refresh is a distinct acquisition and can produce a different result. The same PR number does not establish that two views measured the same head/base.

On the public-PR tab, enter a supported `https://github.com/OWNER/REPO/pull/NUMBER` URL and select **Analyze public PR**. Only public GitHub.com input is accepted. A private PR, arbitrary URL or Enterprise host is not a different way to use the same public endpoint. Anonymous acquisition can be throttled or receive incomplete material; inspect the resulting evidence before concluding that the comparison is exact.

## Edit policy without changing the source

Simple controls let you choose supported preset/metric settings, bands and explicit path exclusions. For the lockfile lesson, add `pnpm-lock.yaml` in the exclusion control and press Enter. The file remains visible as excluded while included totals change. Editing a threshold or exclusion reevaluates the acquired report locally instead of refetching the PR.

Advanced policy editing uses ordinary `.diffdevil.yml` through the shared compiler. It is not JavaScript and does not fetch remote templates or inherit private App account settings. When a policy contains settings the simple controls cannot represent, keep it in the policy editor rather than assuming that switching to controls can preserve arbitrary declarations.

Invalid YAML, an unsupported declaration or a type error remains a configuration failure. Correct the marked input and evaluate again; a visible older result must not be read as proof that the failed edit took effect. No silent fallback should be treated as a successful policy change.

## Read four views of one result

**Terminal** uses the shared human presenter. **Agent/data** exposes a compact agent reading and structured data. **GitHub preview** displays desired labels and optional comment/check-style presentation. **Explanation** shows the configured metrics, rules, paths and evidence behind that result.

The views do not acquire four different comparisons. A desired `size/XS` label is not an observed GitHub assignment; previewing a comment does not post it. Bounded, unknown, unmeasurable and incomplete membership remain meaningful across views. The [shared evidence model](../understand/evidence-and-uncertainty.md) explains when a band or condition can resolve without an exact scalar.

## Export a useful next step

Open **Export** and select the consumer you need. The tabs supply CLI commands, a complete workflow, `.diffdevil.yml`, or separate report/plan JSON. Save the full report as `report.json`; save the policy too when the selected configuration is not just the default preset.

The CLI export replays that saved comparison, not your current worktree or a newly moving PR. It analyzes the report, queries Changed and previews a desired plan with the actual target identity. It does not apply effects. An unresolved strict scalar exits 3; use query JSON when you need the bounds and reasons.

The Action step export is a starter excerpt, not a complete workflow. In particular, an applying step does not embed custom policy from the editor. Use the complete workflow together with the exported `.diffdevil.yml` for that configuration.

The complete workflow export is different: it operates on future workflow events under its selected trusted policy and permissions. Inspect those permissions and put the exported policy at the declared location before adopting it. A locally valid preview neither activates the workflow nor grants write access. [GitHub Actions](github-actions.md) owns that operating journey.

Report JSON, plan JSON and agent text are not interchangeable exports. Use [Reports, plans, and apply](shared-workflows/reports-plans-and-apply.md) before carrying one into a different host. A copied plan remains desired data.

## Refresh and share deliberately

Use the explicit live/current-head route when you want new provider evidence. Rechecking whether the head moved is not the same as refreshing the analyzed report. Keep the snapshot identity attached to the result until reacquisition succeeds; do not combine an older count with new file identities.

The share URL records selected example/variant, view and configuration mode. Edited policy may be encoded in the `policy` query parameter. Encoding is **not encryption**: the URL can disclose configuration through copied links, browser history or the host receiving the navigation. Do not put secrets or private repository policy in it. A frozen-example URL without custom policy is the safer reproducible lesson link.

## Data limits and failure recovery

The browser evaluates acquired reports and edited policy locally. Live public acquisition sends the target PR identity to the configured backend, which performs bounded read-only GitHub requests. It must not borrow private App installation credentials. There is no visitor account/history requirement or private-PR mode. Exported files remain under your control and can contain paths, revisions or policy details.

**Invalid URL:** correct the public GitHub PR input; no analysis has succeeded. **Private/unavailable PR:** use an authorized local/CLI route, not a token pasted into the Playground. **Throttled or failed acquisition:** keep the input, inspect the error and retry after the indicated constraint or use a frozen lesson. **Invalid policy:** repair the editor content. **Moved head:** choose an explicit new acquisition. **Incomplete or oversized result:** retain the evidence/limit rather than treating a displayed subset as the whole PR.

A source-only API or older deployed Worker may not provide the complete report/head routes. That is an access/version boundary, not an empty result. The [application/operator home](../../../apps/playground/README.md) owns backend setup, while this guide owns the visitor experience. Continue with [CLI](cli.md) or [With a coding agent](coding-agent.md) when the experiment becomes ordinary work.
