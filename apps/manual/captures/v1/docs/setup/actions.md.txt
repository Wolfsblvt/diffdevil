# Set up diffdevil with GitHub Actions

## Meaning

Configure this repository's pull-request automation with diffdevil, preserve its existing policy and CI, and verify the resulting behavior. This is a one-time setup guide, not a persistent Agent Skill. The ordinary new labeling setup uses the built-in size policy; an existing installation retains its deliberate policy and responsibilities.

## Establish the target and existing behavior

Read the repository's instructions. Resolve the actual GitHub target, relevant default/base branches, working branch, and workflow conventions. In a fork, distinguish upstream from the fork instead of choosing a write target from the first remote name.

Inspect `.diffdevil.yml`, explicitly selected policy/templates, existing diffdevil workflow steps, and any App or other automation managing the same labels/comments. An inaccessible file or installation is not evidence of absence. Use the current task and standing grants without adding a fresh approval question for every ordinary edit.

For a new ordinary labeling setup, `size@1` measures replacement-aware changed lines, reconciles its managed `size/*` labels, ensures missing definitions, posts no comments, and creates no size-based merge gate. Preserve a deliberate opt-out or custom policy instead of replacing it with this default. When the requested behavior is materially unclear, explain the useful alternatives and ask.

Choose one writer for each overlapping managed effect. App-written labels and read-only Actions may coexist. If an App already owns labeling, adding useful analysis is different from installing a competing labeler. Preserve unrelated jobs, checks, and automation.

## Add or adapt the applying workflow

Reuse a suitable existing workflow only when its event, permissions, and execution preserve this job's trust boundary. Otherwise create `.github/workflows/diffdevil.yml`:

```yaml
name: Pull-request size

on:
  pull_request_target:
    types: [opened, reopened, synchronize, edited]

concurrency:
  group: diffdevil-size-${{ github.event.pull_request.number }}
  cancel-in-progress: false

jobs:
  size:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
    steps:
      - name: Apply diffdevil policy
        uses: Wolfsblvt/diffdevil@v1
```

This complete workflow applies the root Action's default policy. Consumers need no checkout, `setup-node`, npm installation, `package.json`, personal token, or manually pre-created size labels. The Action uses the job's GitHub token by default; preserve an existing deliberate credential/principal arrangement when it supplies the intended access.

`@v1` is the maintained major reference. The inspected immutable `v1.0.0` release is commit `0827485c9d3795ef58a7934cd7a4b8b3fb5cc9c5`. Follow the repository's pinning convention and resolve any later selected release from real release metadata, not a design specimen.

The concurrency group covers this workflow, not a separate App or differently named workflow. It avoids canceling an in-progress application. Preserve suitable existing serialization and reconcile other writers separately.

`pull_request_target` is for PR-data automation here, not executing the PR's code. Do not convert an existing build/test workflow wholesale to that trigger or add PR-head checkout/scripts to this privileged job. Inspect actual repository/organization event, Action-reference, runner, and token restrictions. A blocked trigger or denied write is a precise installation constraint. Resolve it through an authorized provider/configuration route, or return the actual administrator step. A read-only substitute does not complete requested labeling.

## Select existing policy explicitly

When the project deliberately uses `.diffdevil.yml`, use this complete alternative:

```yaml
name: Pull-request policy

on:
  pull_request_target:
    types: [opened, reopened, synchronize, edited]

concurrency:
  group: diffdevil-policy-${{ github.event.pull_request.number }}
  cancel-in-progress: false

jobs:
  policy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    steps:
      - name: Apply diffdevil policy
        uses: Wolfsblvt/diffdevil@v1
        with:
          config: .diffdevil.yml
          policy-source: base
```

These workflows are alternatives, not two writers to install together. Without `config`, the Action uses bundled policy and does not automatically discover the root file. Explicit trusted policy adds a Contents read.

Automatic writes read policy and relative templates from the trusted PR base or an explicit immutable source. A new policy file must be present in that selected trusted revision before this writer can use it. PR-head policy may be previewed as data without becoming the authority for automatic effects. A missing, invalid or unreadable configured source is an error, not a reason to silently apply another policy.

Preserve deliberate explicit config paths, declarations, exclusions, and templates. Root `.diffdevil.yml` is the single conventional filename. Follow the shared resolver's whole-declaration replacement and documented append/replace semantics. The inspected 1.0.0 compiler requires complete supplied size-threshold/label maps; discover later support from the actual installed schema rather than assuming planned partial maps work.

A compatible local CLI can validate the candidate:

```sh
diffdevil validate --config .diffdevil.yml
diffdevil explain --policy --config .diffdevil.yml --format json
```

This proves local candidate behavior, not what a live workflow loaded. Workflow-only adoption does not require adding a local npm dependency merely for this optional check. A narrow `policy-token` may separately supply trusted policy reads; `github-token` remains responsible for PR acquisition and effects. Use that existing interface when the user's credential design needs it, not as mandatory onboarding complexity.

## Add read-only analysis where that is the intended responsibility

For an App-owned repository or a requested measurements-only workflow, this is a complete no-config example:

```yaml
name: Pull-request diff analysis

on:
  pull_request:
    types: [opened, reopened, synchronize, edited]

jobs:
  analyze:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: read
    steps:
      - name: Analyze diff
        id: diff
        uses: Wolfsblvt/diffdevil/actions/analyze@v1
```

A repository-policy analysis adds `contents: read` and explicit `config`/`policy-source` inputs when it should use that policy. Actions do not inherit App dashboard defaults. Compare effective settings before describing an App report and an Action report as equivalent.

`/actions/analyze` is read-only. The root Action supports `mode: plan` to produce intended effects without applying them. `/actions/apply` performs explicit application and revalidates supplied full artifacts against current evidence. `/actions/sync-labels` verifies definitions by default; `operation: apply` performs the selected definition changes.

Keep facts, policy, intended effects, and observed application distinct. A sufficient existing grant may cover application directly; a preliminary plan is useful where it answers a real question, not a mandatory extra approval ceremony. Manual and managed application must not race over the same effect.

## Activate and verify

Use the repository's normal authorized change path. A file on a branch is prepared source, not proof of an active workflow. Event behavior and trusted workflow/config revisions determine when a run is possible; there is no blanket rule that nothing can run before merge.

Inspect an appropriate authorized PR/run once the selected workflow is available. Establish its Action reference, target, compared revisions, actual policy source, evidence and rule result, and effect/readback outcome. A green job alone does not prove that the intended policy reached the intended PR.

For default size labeling, verify the managed label matches the reported band, unrelated labels remain, and no default comment or merge requirement was introduced. An existing correct label is a valid no-op. `size/Unknown` can be the intended configured result when a band cannot be established.

Read-only coexistence succeeds when the Action produces useful evidence without competing provider writes. No matching PR/run means execution is unobserved, not broken or proven. Name the remaining occasion without inventing a test PR, rerun, or provider effect outside the request.

`report-json` and `plan-json` are compact Action summaries, not full replay artifacts. Use actual `report-path`/`plan-path` files for full artifacts and inspect the effects journal for partial application. Reports may contain repository context; public upload is not an ordinary installation proof. After an ambiguous write, reconcile readback before retrying.

## Return the result

Report the changed or preserved workflow/config, selected ref, effective policy, current writer responsibilities, actual verification and precise remainder. Distinguish prepared source, active automation, and an observed PR result.

Installing this Action does not persistently teach an agent. When that is requested, use [Skill installation]({{PUBLIC_ORIGIN}}/setup/skill.md), normally at user scope.

## Deeper reference

- [Action interface and trust](https://github.com/Wolfsblvt/diffdevil/blob/main/docs/manual/use/github-actions.md)
- [Auto-labeling quickstart](https://github.com/Wolfsblvt/diffdevil/blob/main/docs/manual/start/label-pull-requests.md)
- [Presets and host layers](https://github.com/Wolfsblvt/diffdevil/blob/main/docs/manual/policy/README.md)
- [GitHub privileged PR-data workflows](https://docs.github.com/en/actions/reference/security/securely-using-pull_request_target)
