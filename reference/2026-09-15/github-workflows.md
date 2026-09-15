# GitHub workflow contracts checked on September 15, 2026

## Meaning

This dated primary-source check supports the public quickstart and repository CI.
It distinguishes GitHub's provider contract from locally executed fake-HTTP proof.
It does not claim that a workflow was installed, that credentials were exercised,
or that the Action has been published.

## Event and policy source are different

GitHub's [event reference](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#pull_request_target)
states that `pull_request_target` runs in the base repository's **default branch**
context. Its default activities are opened, reopened, and synchronize; edited is
available and covers relevant PR edits. The quickstart additionally selects
edited so retargeting can recalculate the comparison. This is distinct from
diffdevil reading an explicitly selected policy from the PR's current target base
commit. Never describe those sources as automatically identical.

The [security guide](https://docs.github.com/en/actions/reference/security/securely-using-pull_request_target)
explains the elevated-trust context and why running fork code under it is unsafe.
The recipe contains no checkout or repository-code execution. Ordinary validation
uses `pull_request`, not a privileged target event.

## Permissions and runtime

The [label endpoint reference](https://docs.github.com/en/rest/issues/labels)
permits Pull requests write or Issues write for creating, updating, adding, and
removing labels. The no-config recipe therefore uses only Pull requests write.
Custom repository policy/template reads additionally require Contents read.
Effective organization/repository restrictions and real token access are not
proven by the declared permissions or the local HTTP fixture.

The [metadata reference](https://docs.github.com/en/actions/reference/workflows-and-actions/metadata-syntax#runs-for-javascript-actions)
defines `runs.using: node24` and resolves `runs.main` inside the action. All four
shipped metadata files select that runtime; qualification separately records the
Node executable actually used locally.

The [workflow syntax reference](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#concurrency)
explains concurrency groups and pending-run replacement. The applying recipes use
per-PR groups without canceling an in-progress write. This is not a transaction or
a guarantee that every intermediate event receives its own run.

## Observed versus selected

Provider statements above were checked against official documentation on this
date. The workflow examples are parsed and their inputs drive real local runners
against mock HTTP. That does not establish hosted event delivery, policy settings,
real token grants, or publication. Native runtime and consumer results belong in
`docs/QUALIFICATION.md`.

## CI dependency choice

The read-only validation workflow pins two official upstream Actions rather than
introducing custom checkout or runtime-download code:

| Action | Inspected commit | Inspected surface |
| --- | --- | --- |
| `actions/checkout` v6 | `d23441a48e516b6c34aea4fa41551a30e30af803` | `action.yml`: Node 24, ordinary checkout, `persist-credentials`, fork-checkout protection |
| `actions/setup-node` v6 | `249970729cb0ef3589644e2896645e5dc5ba9c38` | `action.yml`: Node 24, explicit node-version, package-manager-cache control |

The corresponding `refs/tags/v6` and exact metadata were read through GitHub on
this date. That is a metadata/source-coordinate check, not a full upstream code
security audit. Checkout credential persistence and automatic cache storage are
disabled. The selected Node matrix is Linux 22/24 and Windows 24; actual versions
are printed by each run. Installation downloads locked dependencies only when
this workflow is later authorized and activated; no such download occurred while
authoring it. The pipeline itself publishes nothing and does not label or comment.

These actions are CI-only dependencies, not included in the npm package or runtime
closure. Their exit cost is replacement of two CI steps; they do not change the
engine or force a second package toolchain. Hosted runtime availability, compute
cost, upstream advisories, and the real workflow run remain external observations.
