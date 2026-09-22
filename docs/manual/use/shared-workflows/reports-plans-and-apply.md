# Reports, plans, and apply

Capture a comparison once for repeatable inspection, then make any later write an explicit, separately verified operation. A report says what was observed. A plan says what the selected policy wants. An apply result records requests and readback. Keeping those artifacts distinct lets you reuse useful work without reusing stale authority.

The read-only examples below need the [CLI](../cli.md), installed in the project with `npm i -D @wolfsblvt/diffdevil`. The provider examples additionally require authority over the named repository and suitable credentials. Commands using `example/repository` and PR `42` are invocation examples, not a live target to run against unchanged.

## Capture and inspect a full report

Use the complete packaged teaching patch, without discovering an unrelated project policy:

```sh
npm exec -- diffdevil analyze --diff-file node_modules/@wolfsblvt/diffdevil/docs/examples/diffs/review.diff --no-config --preset size@1 --format json --output report.json
npm exec -- diffdevil analyze --report report.json --format human
npm exec -- diffdevil query --report report.json --metric changed --format value
```

The scalar is **10**; the same report retains **16 raw churn**, four included files and the default `xs` band. `report.json` is the whole `diffdevil.report` object, not a shortened terminal projection. Keep its source/comparison identity, versions, evidence reasons, file-list completeness and policy metadata when carrying it elsewhere. The [source patch](../../../examples/diffs/review.diff) and [counting explanation](../../understand/changed-lines-and-churn.md) make the result inspectable without guessing at a screenshot.

A report captured from a patch file describes that supplied patch. Supplying a target to a later plan does not prove that the patch was fetched from that PR. For a provider-bound capture, use a current PR acquisition:

```sh
npm exec -- diffdevil analyze --repo example/repository --pr 42 --no-config --preset size@1 --format json --output pr-report.json
```

Keep the recorded head, base and comparison, not just the human PR number. A new commit can make the saved observation historical immediately after acquisition.

## Reuse the observation or select another policy deliberately

Querying the saved report keeps its captured facts and policy results by default. It does not silently rediscover a local configuration file. This is useful for several questions about one observation:

```sh
npm exec -- diffdevil query --report report.json --expr totals.raw.churn --format value
npm exec -- diffdevil query --report report.json --files --select path --format json
```

The first query prints **16**. The second uses a query envelope to retain structured paths and their evidence; it is not a new report. For byte-safe script consumption and exits, use the [complete Bash and PowerShell consumers](../../start/use-results-in-scripts.md).

To reinterpret the same observation under an explicitly selected policy, supply the new configuration. The complete [review policy](../../../examples/policies/review-signals.yml) excludes the lockfile and adds a source/test signal:

```sh
npm exec -- diffdevil analyze --report report.json --config node_modules/@wolfsblvt/diffdevil/docs/examples/policies/review-signals.yml --format json --output selected-report.json
```

The included question now has **6 Changed** and **8 churn**; the excluded lockfile remains an observed file with its own facts. Source Changed is 3 and test Changed is 2, so the source-without-tests rule is false when evaluated. This is policy reevaluation, not stronger acquisition. It neither discovers missing patches nor updates the captured PR head.

## Derive a desired plan

A plan connects policy decisions to a selected target without reading or writing its current labels. Planning from a saved report requires an explicit policy selection: here `--no-config --preset size@1` chooses the built-in size policy, rather than treating the report as authority for its own effects:

```sh
npm exec -- diffdevil plan --report report.json --no-config --preset size@1 --target-repo example/repository --target-pr 42 --definitions ensure --format json --output desired.json
npm exec -- diffdevil plan --report report.json --no-config --preset size@1 --target-repo example/repository --target-pr 42 --definitions ensure --format human
```

The small specimen's shared presenter shows the desired size result:

<!-- manual:generated presenter-first-plan -->

That insert is produced from the [same teaching patch](../../../examples/diffs/review.diff) by the shared presenter. The JSON plan has `stage: desired`, selects `size/XS`, and requests the selected definition behavior. It does not know whether the label already exists or whether an assignment will be a no-op. It is not an application result and contains no provider readback.

For a held-plan example, use the [complete threshold policy](../../../examples/policies/hold-unresolved.yml) and [bounded report](../../../examples/reports/bounded.json):

```sh
npm exec -- diffdevil plan --report node_modules/@wolfsblvt/diffdevil/docs/examples/reports/bounded.json --config node_modules/@wolfsblvt/diffdevil/docs/examples/policies/hold-unresolved.yml --target-repo example/repository --target-pr 42 --require-resolved --format json --output held.json
```

Changed is between 60 and 70, so `>= 65` is unresolved. The plan records the held rule and this command exits **3 while retaining the inspectable plan**. Without `--require-resolved`, a valid plan can exit 0 with holds. `onUnknown: fail` is a different policy choice and produces an error, not a fabricated false result.

## Validate trust and freshness before applying

Check artifact kind and semantic compatibility, the intended repository/PR, source identity, selected policy/parameters/templates, and who is allowed to make the effects. A hash verifies bytes against an expected digest; it does not prove who acquired them or that their carrier was protected. Reading or validating a plan does not grant mutation authority.

The CLI normally reacquires current PR evidence and compares a supplied plan with the freshly derived desired plan. A saved plan is not an editable command queue for inserting an extra label. Keep rule selection and policy choices consistent. If the PR, policy or selected plan has changed, inspect a fresh plan instead of forcing the old one through.

## Apply deliberately and read the result

The ordinary no-config size operation is:

```sh
npm exec -- diffdevil apply --repo example/repository --pr 42 --format json --output apply-result.json
```

It uses the built-in size policy, ensures missing required definitions, reconciles its managed size labels and posts no default comment. Credentials come from the selected environment, normally `GH_TOKEN` or `GITHUB_TOKEN`, never an expression parameter or copied command-line token.

A reviewed repository policy and a saved plan can be selected explicitly:

```sh
npm exec -- diffdevil apply --plan desired.json --config .github/diffdevil.yml --format json --output apply-result.json
```

This only succeeds when the saved plan agrees with the selected current policy and comparison. Here `.github/diffdevil.yml` is loaded from the PR's trusted base by the write path, not whatever file happens to be in the working directory. A deliberately pinned policy uses its immutable commit; workspace trust is an explicit CLI choice. See [Source identity, trust, and mutation](../../understand/trust-and-mutation.md), rather than transferring a read-only host's policy assumptions into a writer.

Inspect the full result. A desired add, a sent request, an acknowledged response and verified readback are different stages. An already-correct managed label is a successful no-op. A held rule remains held. Partial effects do not roll back previously completed operations, and a successful process is not evidence that every contemplated rule wrote something.

## Recover stale and partial work

A head/base change before writes prevents obsolete effects. A change between operations can leave an incomplete result with earlier verified operations retained. Reacquire the current comparison, inspect what already happened and derive the next plan under current policy.

After a timeout or ambiguous create, read back the expected target and ownership/occasion before retrying. The adapter already performs bounded reconciliation and records what it could verify. Preserve that journal; do not blindly repeat a comment POST or assume that exit 2 means no side effect occurred.

A parse/schema/relational failure is an invalid artifact, not unknown measurement evidence. Repair the source or use the matching reader/version. An unresolved value may need stronger evidence or a different question. Keep [From facts to provider state](../../understand/facts-to-provider-state.md) as the common interpretation across every host.

## CLI and Actions differ at the artifact boundary

The CLI exposes `--report PATH --trust-report` as an explicit host assertion that acquisition and the carrier are trusted. It can avoid reacquisition, but still validates bound identity, the selected policy and freshness before effects. Use it only when your controlled workflow really supplies that trust. A downloaded JSON file's location or digest is insufficient.

The apply Action accepts `input-report` and `input-plan` but does **not** expose that trust assertion: it always reacquires current PR evidence. The [complete split Action example](../github-actions.md#analyze-then-explicitly-apply) transports a report for comparison, not as permission to skip verification. Artifacts crossing jobs also need an explicit supported upload/download route; a `report-path` is a runner-local path, not a URL or persistent storage service.

Store, share and delete reports according to their contents. Paths, repository identities, revisions, policy parameters and rendered comment content can be sensitive even when the report omits source text. Full artifacts are useful precisely because they retain detail; compact display is not a privacy guarantee.
