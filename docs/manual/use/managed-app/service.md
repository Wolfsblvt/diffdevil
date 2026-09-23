# Use the managed service

> [!NOTE]
> **In development**
>
> This describes the complete selected managed-service experience. Public admission and the final dashboard journey are not yet established.

Use the managed service to operate repository automation without maintaining its Worker, queue, database, installation credentials, or upgrades. You still control which repositories participate, their policy and enabled effects, history consent, and any migration from existing automation.

## Establish the account and repository

Start from the installation entry supplied by the public product, or the actual identity and entry point of your explicitly selected self-hosted operator. Verify the App's publisher and the intended personal or organization account. Do not enroll in another service simply because its installation link is easier to find.

An organization may require an administrator's approval. A submitted installation request is not an installation; an installation is not repository enablement. Reuse an appropriate existing installation and its deliberate repository scope rather than requesting access to every repository for a one-repository task. An inaccessible installation listing does not prove that no installation exists.

GitHub sign-in identifies you but does not itself establish installation-administration authority. The service checks current account, installation, and repository access for protected reads and changes. Background installation credentials remain server-side. Hosted customers do not supply an App private key, Cloudflare credential, or personal write token.

The selected App permissions are **Contents: read**, **Pull requests: write**, and **Checks: write**, with ordinary GitHub metadata access. Contents permits trusted policy and template reads; pull-request access supports acquisition and configured labels/comments; checks access permits native summaries. Review the actual repository list and permission request. A materially different request needs explanation, not blind acceptance.

## Separate installation, enablement, and history

There are three independent questions:

| Decision | What it establishes | What it does not establish |
| --- | --- | --- |
| Install or grant repository access | GitHub permits the App to reach that scope | That execution is enabled or a useful PR result has run |
| Enable execution for the repository | The chosen automation may operate under the effective policy | Consent to persistent history, another repository, or paid service |
| Enable history | Eligible future analyses may enter the disclosed retained-history window | Retroactive coverage of earlier analyses or a permanent archive |

Newly discovered repositories begin without execution consent. Restored access or imported settings must not silently resume execution or collection. Existing installations can have incomplete historical consent provenance; “unknown” is not a fabricated administrator approval.

The service exposes the repository's reach, execution standing, history standing, configuration origins, and any outstanding reason it cannot proceed. These are product facts, not prescribed dashboard field names. Current source includes the non-visual admission contract; final controls and their order remain part of dashboard co-design.

## Inspect the effective policy

For a new, otherwise unconfigured repository, the default is `size@1`: managed size labels and a native check summary, with comments and history off. An existing repository may deliberately choose something else. Read its applicable instructions, root `.diffdevil.yml`, relative templates, and current workflows before changing it.

This complete repository file selects the ordinary preset:

```yaml
version: 1
presets: [size@1]
```

It is the same [canonical preset specimen](../../../examples/policies/story/preset.yml) used by the policy chapters, not a special hosted format. It does not install the App, enable execution, or opt into history.

The App resolves preset selection, account/organization defaults, and explicitly supplied repository settings into one validated policy. Trusted repository settings override only what they supply. Check the origin of a value as well as its result: identical filenames do not imply that an Action and the App have identical inherited settings. `presets: []` is an explicit opt-out; arrays and declarations do not acquire an undocumented deep merge. [Configure policy](../../policy/configure.md#know-which-host-supplies-each-layer) owns the layering rules and current convenience-setting boundary.

Automatic writes use policy and relative templates from the trusted base or another explicitly selected immutable source. Proposed PR-head policy is suitable for a read-only preview, not write authority. Missing, invalid, inaccessible, and stale policy are different conditions. Do not replace a read failure with default size labeling.

Export the resolved ordinary policy when comparing another host or preparing to leave. A policy identity binds a result to selected policy; it cannot reconstruct lost source or authorize a write by itself.

## Preview, then enable the intended behavior

Before enabling execution, inspect a representative comparison and its effective policy. Identify the selected label groups, missing-definition behavior, owned-comment lifecycle, native check behavior, and any held rules. Preview produces facts and desired effects; it is not proof that provider state changed.

Establish one writer for overlapping effects. Resolve unknown ownership before enabling the replacement. Saving settings alone does not establish successful execution, and a concurrent settings change requires rereading current configuration rather than overwriting a newer decision.

Use the service's admitted controls to enable the selected repository and verify the resulting standing. Do not invent an API route or issue direct database writes as a substitute for an unavailable dashboard. The backend may be ready for an authorized adapter while the public interaction remains unqualified.

## Verify a real pull-request result

Inspect an appropriate PR after a supported event, or a supported reanalysis of the current comparison. Match the repository, PR, base/head revisions, policy identity, measurement evidence, and check to the same analysis. A native check acknowledgment or queued delivery is not enough.

For the default setup, verify the intended size label, preservation of unrelated labels and definition presentation, one App-owned native summary for the execution identity, and no unsolicited comment. A correct existing label is a successful no-op. A check should explain unknown evidence or held effects rather than presenting them as an exact zero or a false condition. Large size does not automatically fail the check or change branch protection.

For optional comments, verify the App actor and supported lifecycle. The App does not adopt or rewrite another actor's historical comments. For multiple operations, distinguish desired, attempted, and read-back state: GitHub requests are not one atomic transaction. [Reports, plans, and apply](../shared-workflows/reports-plans-and-apply.md) explains the shared model.

A useful setup result therefore records installation/access, explicit execution standing, effective policy, chosen effects, history choice, and the observed PR result separately. Pending administrator approval, enablement still required, and an unobserved first run remain specific unfinished steps.

## Choose history deliberately

History is optional and does not disable ordinary automation when left off. Before opting in, inspect the data collected, retention, repository scope, collection start, coverage, and export/deletion terms. The short operational ledger remains separate: it exists for seven-day deduplication, diagnosis, and recovery, not a hidden permanent activity timeline.

The selected free history window is thirty rolling days from analysis time. The paid-history design has no automatic age expiry while the entitlement and service remain active, subject to a user-selected shorter period, deletion, and disclosed limits. This is not an unlimited-storage claim or an available paid offer; prices, quotas, and billing terms still require publication.

History stores aggregate and pathless per-file quantitative results with their evidence, versions, and comparison references. No source, patches, filenames, authors, PR prose, or comment bodies are retained as history. Configuration is separately protected and can contain your submitted path patterns or text. A history export must not silently join that configuration or fetched GitHub context into its numeric records.

Read distributions with their coverage. A revision count is not a PR count, an analysis date is not a merge date, and an omitted measurement is not zero. A gap before opt-in, during disabled collection, or beyond retention is not backfilled by retries. Re-enabling a longer window preserves still-retained records; it cannot recover expired ones.

## Export, stop collection, or leave

Export the resolved policy for use elsewhere and retained numeric history in its versioned format when needed. Stopping future collection and deleting existing history are distinct choices. Deletion covers the selected history, derived projections, and pending recovery that could recreate it; an uninstall alone is not a claim that every provider backup vanished immediately.

Repository deselection, confirmed installation removal, and entitlement end stop collection immediately and begin the selected thirty-day offboarding grace. Only an independently authenticated service-account or organization administrator whose authority predates the access loss may inspect, export, shorten, or delete already-retained numeric history during that grace. This exception cannot fetch GitHub context, restore repository access, or perform cleanup writes through a removed installation. Without an eligible administrator, the history is inaccessible and still expires.

Account closure offers export before confirmation, then begins deletion immediately instead of granting that grace. After grace expiry or confirmed closure, primary history, pathless rows, rollups, caches, and pending exports are removed within seven days. Backup expiration and restore protection must be disclosed and qualified; deletion tombstones prevent old backups from reviving deleted data. [Security and data](../../help/security-and-data.md#retention-deletion-and-offboarding) links the complete authoritative lifecycle.

A temporary provider outage or one failed access check is not a destructive offboarding instruction. Protected work may pause while access is reconciled. Restoration never silently resumes history consent.

## Move between Actions and the App

Prepare the destination before changing the current writer. Export or reconcile its policy, compare effective defaults and origins, and preview the intended effects. Preserve useful read-only Actions: their presence alone is not a conflict.

At cutover, disable only the old writer's overlapping labels/comments, reconcile in-flight or ambiguous operations, then enable the destination and inspect a real result. A workflow concurrency group cannot fence an independently running App. If the old writer may still act, keep the replacement paused rather than racing both.

Historical comments belonging to the old actor remain historical; the new actor starts its own supported lifecycle. Moving back to Actions uses the same discipline. Rollback is an explicit policy/writer transition, not permission to run both or delete unrelated CI. Preserve the exported policy and the observed last state so the next operator can distinguish a useful no-op from missing execution.

## Recover by the failing stage

No delivery, rejected access, disabled execution, invalid policy, stale comparison, provider failure, incomplete effects, and failed history persistence need different repairs. Use the stable diagnostic code together with its phase and the current repository/PR identity, not a screenshot of an imagined dashboard label.

A stale comparison needs fresh acquisition. An ambiguous write needs provider readback before retry. History persistence after a successful label/check is a separate recovery job; repeating effects to repair history is wrong. The [App troubleshooting entries](../../help/troubleshooting.md#the-app-is-installed-but-does-not-run) connect those symptoms to the service and operator boundaries without requiring you to understand queue internals.
