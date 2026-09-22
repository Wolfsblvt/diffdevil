# Try a public pull request

Use the Playground to read a real PR result without installing anything, then change its policy and see what that changes. Start with a retained teaching snapshot: it does not depend on GitHub answering a new request, and its revisions stay fixed while you experiment.

You need a browser. No account or token is required. Live acquisition accepts public GitHub.com PRs only; it is not a private-repository route or the managed App.

## Open the lockfile lesson

Open [the whole-change lockfile lesson](https://diffdevil.dev/playground/?example=lockfile-scope&variant=all). It selects the retained `vitejs/vite#18968` teaching snapshot, head `48db5c9555f2d43cb88367506e79854fce8ed47d`, captured September 18, 2026, with the `standard` catalogue policy (`size@1`).

The useful starting result is **22 Changed / 25 churn across 2 included files**, classified as `s`. Both files and the evidence belong to that captured comparison, not to whatever the PR may contain when you open its GitHub page today.

Read **Terminal** for the shared human presentation. **Agent · data** exposes the tool-oriented result; **Explanation** connects facts to the policy. **GitHub preview** shows desired labels and an optional comment, not labels that the Playground has applied or read back from GitHub.

## Change one explicit exclusion

Under **Controls**, enter `pnpm-lock.yaml` in **Exclude** and press Enter. Alternatively, open the catalogue's [Exclude lockfile variant](https://diffdevil.dev/playground/?example=lockfile-scope&variant=without-lockfile) for the same complete policy change.

The result becomes **1 Changed / 2 churn**, with **1 included file and 1 excluded file**. Its size band is now `xs`. The observed comparison still contains two files; the lockfile did not stop changing because you excluded it from this question.

| Selected policy | Included Changed | Included churn | Observed / included / excluded files | Band |
| --- | ---: | ---: | --- | --- |
| Whole change (`standard`) | 22 | 25 | 2 / 2 / 0 | `s` |
| Exclude lockfile (`vite-without-lockfile`) | 1 | 2 | 2 / 1 / 1 | `xs` |

Control edits re-evaluate the acquired report rather than refetching the PR. **Policy** shows the ordinary configuration behind them. A setting that the visual controls cannot represent remains in the policy; switching views is not permission to discard it. Invalid edits show diagnostics and distinguish the last valid result from the current invalid input.

This lesson uses complete source and policy records from the [shared example catalogue](../../integration/example-catalogue.md). It is not a second website-only calculation. The snapshot retains normalized evidence, not raw source lines; policy replay is supported, but reconstructing or remeasuring a patch from that snapshot is not.

## Distinguish the snapshot from a fresh acquisition

**Analyze latest** deliberately asks for the source PR's current comparison. Inspect the returned revisions and evidence again; this is a new acquisition, not an update to the frozen lesson's facts. **Back to snapshot** restores the retained teaching edition.

To try a different public PR, choose **Public pull request**, enter its full GitHub PR URL, and select **Analyze public PR**. The input must name a public `github.com` PR, not an arbitrary URL. Do not paste a token or expect the Playground to inherit private repository access from your browser's GitHub session.

The output may be bounded, unknown, unmeasurable or limited by an incomplete file set. An exact raw counter does not supply missing edit blocks. A new PR may also differ from a teaching example in both file population and policy. Compare identities and origins before comparing numbers.

## Export the result you just inspected

Open **Export**. Select **report.json / plan.json**, choose the `report.json` artifact, use **Copy**, and save that single JSON document as `report.json`. Do not join a report and plan into one JSON file. A plan is a separate artifact selectable in the same tab.

After the exclusion, also copy the **.diffdevil.yml** tab into that file. The **CLI** tab gives read-only commands for the saved comparison. With [Node.js and the CLI execution route available](analyze-local-changes.md), the excluded lockfile example is:

```sh
npx @wolfsblvt/diffdevil analyze --report report.json --format human
npx @wolfsblvt/diffdevil query --report report.json --metric changed --format value
npx @wolfsblvt/diffdevil plan --report report.json --config .diffdevil.yml --target-repo vitejs/vite --target-pr 18968 --format human
```

The scalar prints **1**. The plan desires `size/XS` and reports that nothing was applied; it does not contact or modify Vite's repository. The report commands retain the exported comparison. Planning explicitly uses the saved policy rather than an unrelated policy discovered in your current checkout.

An **Action step** is not a complete workflow. The separate **Complete workflow** export describes a workflow for your own repository and states whether it writes effects. A preview is not evidence of permission, activation or provider readback. Continue with [Label pull requests](label-pull-requests.md) when reviewed repository automation is the job you want to adopt.

## When the result cannot be obtained

**Invalid or unavailable PR input:** correct the URL and confirm that the PR is public. A private, absent or inaccessible result is not a zero-sized PR.

**Read budget or provider failure:** retain the input and last useful result, respect the shown retry information, or return to a saved lesson. Repeatedly changing thresholds will not repair acquisition. Local analysis is a separate route, not a claim that the failed request succeeded.

**Policy error:** repair the marked declaration in Policy. Do not mistake the visibly retained previous valid result for output from the invalid edit.

**An export refuses an exact value:** read its exit and evidence. Use canonical query JSON for unresolved values rather than coercing a range to a midpoint or an absent path set to an empty list. [Use results in scripts](use-results-in-scripts.md) gives complete consumers.

## Explore a different lesson

The [Examples gallery](https://diffdevil.dev/examples/) and these links use the same catalogue. Each link selects a declared example and variant:

<!-- manual:generated real-pr-catalogue -->

Use [Playground](../use/playground.md) for the deeper operating guide, [Evidence and uncertainty](../understand/evidence-and-uncertainty.md) for interpretation, and [Security and data](../help/security-and-data.md) for the data boundary. A frozen result, a fresh analysis, a desired plan and an applied effect remain four different things.
