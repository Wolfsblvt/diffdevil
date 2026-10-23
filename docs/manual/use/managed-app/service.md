# Use the managed service

> [!NOTE]
> **In development**
>
> This describes the selected managed-service experience. The analytical App and Manage are implemented and privately qualified; general public admission and paid availability are not established.

Use the managed service to collect repository history and operate selected PR automation without maintaining its infrastructure. **Manage** is where authorized administrators select repositories, configure policy and inspect processing. **Plan & funding** handles benefits and organization connections; **Account** handles your account and service connection. To read activity without administering it, start with [Read repository history](read-history.md).

## Establish the account and repository

Start from the installation entry supplied by the public product, or the actual identity and entry point of your explicitly selected self-hosted operator. Verify the App's publisher and the intended personal or organization account. Do not enroll in another service simply because its installation link is easier to find.

An organization may require an administrator's approval. A submitted installation request is not an installation; an installation is not repository enablement. Reuse an appropriate existing installation and its deliberate repository scope rather than requesting access to every repository for a one-repository task. An inaccessible installation listing does not prove that no installation exists.

Anyone can sign in with GitHub. Sign-in identifies you but does not itself establish installation-administration authority. The service checks current account, installation and repository access for protected reads and changes. A connected repository can be funded by somebody else without requiring you to buy a reader seat. Background installation credentials remain server-side. Hosted customers do not supply an App private key, Cloudflare credential or personal write token.

The selected App permissions are **Contents: read**, **Pull requests: write**, and **Checks: write**, with ordinary GitHub metadata access. Contents permits trusted policy and template reads; pull-request access supports acquisition and configured labels/comments; checks access permits native summaries. Review the actual repository list and permission request. A materially different request needs explanation, not blind acceptance.

## Separate installation, enablement, and history

There are three independent questions:

| Decision | What it establishes | What it does not establish |
| --- | --- | --- |
| Install or grant repository access | GitHub permits the App to reach that scope | That execution is enabled or a useful PR result has run |
| Enable execution for the repository | The chosen automation may operate under the effective policy | Consent to persistent history, another repository, or paid service |
| Enable history | Eligible collection, import and recalculation may retain the disclosed measurements | Permission to write checks/labels/replies, complete historical coverage or a permanent archive |

Newly discovered repositories begin without execution consent. Restored access or imported settings must not silently resume execution or collection. Existing installations can have incomplete historical consent provenance; “unknown” is not a fabricated administrator approval.

History can run while execution, checks, labels and briefs stay off. Conversely, labelling-only operation need not create persistent history. An eligible private history-only repository still occupies its private allowance.

In **Manage**, select the personal or organization scope you mean to administer. Its Overview leads with capacity and unresolved operating choices. The repository list distinguishes enabled with history, labelling-only, deliberately paused, inactive over the allowance, provider access removed, and retained or archived history. An installed repository is not automatically selected just because it receives a PR.

Open a repository's **Operation**, **History** or **Configuration** settings for the corresponding job. **Stop operating** pauses collection and frees its place while preserving consent, retained history and settings. **Stop collecting** is the distinct history-off choice. A capacity swap names the repository whose collection will pause; resuming history must fit the current allowance and can leave execution off. Neither choice silently deletes history. The [plan guide](plans-and-sharing.md#capabilities-and-repository-allowances) owns the exact pooled and per-organization allowances.

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

### Defaults, linked policies and brief settings

Every eligible repository can keep its own policy. Pro adds one reusable personal default and one per connected organization, with an explicit difference/apply action in that repository's settings. It does not add a global drift inventory or bulk apply.

Business adds named linked policies, coordinated publication, automatic eligible setup, delegated administration and Audit. A publication records the result for each linked repository and queues the relevant refresh; it cannot override a value still supplied by trusted `.diffdevil.yml`. Choosing a policy does not itself consent to history or public analytics.

Automatic setup selected by a current GitHub namespace administrator belongs to the namespace and can continue after that person leaves, until an authorized administrator changes it. Setup selected by a delegated Account administrator remains person-bound and requires their current delegation and repository write access. Business delegation stays within the delegate's current GitHub write authority. Funding alone grants none of these powers.

Optional brief controls and their preview live in Configuration. They select what the App adds to its owned size report; they do not create another portable template language. [Read repository history](read-history.md#understand-a-pr-brief) explains what the resulting context means.

## Preview, then enable the intended behavior

Before enabling execution, inspect a representative comparison and its effective policy. Identify the selected label groups, missing-definition behavior, owned-comment lifecycle, native check behavior, and any held rules. Preview produces facts and desired effects; it is not proof that provider state changed.

Establish one writer for overlapping effects. Resolve unknown ownership before enabling the replacement. Saving settings alone does not establish successful execution, and a concurrent settings change requires rereading current configuration rather than overwriting a newer decision.

Use Manage to enable the selected repository and verify its resulting standing, including the declaration of which automation owns the effects. Its implemented controls have local qualification; the complete public installation and live writer journey remain separate. An unavailable control or rejected authority needs that boundary resolved, not an invented API route or a direct database write.

## Verify a real pull-request result

Inspect an appropriate PR after a supported event, or a supported reanalysis of the current comparison. Match the repository, PR, base/head revisions, policy identity, measurement evidence, and check to the same analysis. A native check acknowledgment or queued delivery is not enough.

For the default setup, verify the intended size label, preservation of unrelated labels and definition presentation, one App-owned native summary for the execution identity, and no unsolicited comment. A correct existing label is a successful no-op. A check should explain unknown evidence or held effects rather than presenting them as an exact zero or a false condition. Large size does not automatically fail the check or change branch protection.

For optional comments, verify the App actor and supported lifecycle. The App does not adopt or rewrite another actor's historical comments. For multiple operations, distinguish desired, attempted, and read-back state: GitHub requests are not one atomic transaction. [Reports, plans, and apply](../shared-workflows/reports-plans-and-apply.md) explains the shared model.

A useful setup result therefore records installation/access, explicit execution standing, effective policy, chosen effects, history choice, and the observed PR result separately. Pending administrator approval, enablement still required, and an unobserved first run remain specific unfinished steps.

## Choose history deliberately

History is optional and does not disable ordinary automation when left off. Before opting in, inspect the data collected, retention, repository scope, collection start, coverage, and export/deletion terms. The short operational ledger remains separate: it exists for seven-day deduplication, diagnosis, and recovery, not a hidden permanent activity timeline.

Enabled history follows the disclosed service/operator retention policy. Read the actual retention, any shorter setting and data-exit terms; a plan is not a promise of infinite storage. Planned prices and repository allowances live in [Plans and shared access](plans-and-sharing.md), while numeric monthly import budgets and production operating terms still require publication.

History stores repository names, relative file paths and numerical per-file results with evidence, versions, lifecycle facts and comparison references. No source contents, patches, contributor-performance dimensions, PR prose or comment bodies are retained as history. Configuration is separately protected and can contain your submitted path patterns or text. A history export must not silently join that configuration or fetched GitHub context into its records.

Read distributions with their coverage. A revision count is not a PR count, an analysis date is not a merge date, and an omitted measurement is not zero. General file history uses final merged-PR comparisons; open-PR development is separate. Permitted excluded-file observations remain available for supported policy replay. Re-enabling collection cannot recover expired records or silently refill a deliberately deleted interval.

## Inspect and extend history

Open the repository's **History** settings to inspect collection, import, recalculation and covered ranges. The view distinguishes paused work, fair scheduling, provider rate limits, partial acquisition and recoverable failure. Read the job's actual policy basis and missing comparisons as well as its progress; an ended listing or reached plan limit does not prove that every comparison was recoverable.

An import starts with useful recent PRs and continues within its selected scope and allowance. Free can import up to 100 recent PRs per selected repository import; paid processing can continue into older recoverable history. Exact monthly budgets are still launch configuration. Open-PR scanning supplies current context separately. Neither route reconstructs vanished intermediate heads or fictional original App results.

Use the offered pause/resume or retry action for optional processing. Progress survives a retry; live eligible PR operation has priority and does not spend a historical-import allowance. A queue is not a promise of an exact completion time. Pausing an import does not disable live labels or cancel billing.

Recalculation interprets retained measurements under the current policy without rewriting immutable observations or historical GitHub effects. Free and Pro can request it for a repository; Business can coordinate it for linked policies. A newly source-dependent calculation may need more evidence or retain a gap. Import and replay never post retroactive labels, comments or closed-PR replies.

## Export, stop collection, or leave

Export the resolved policy for use elsewhere and permitted analytical history in its versioned format when needed. History can be exported while collection is stopped or paused, subject to current authority; its permitted named measurements remain protected data. Configuration/state export is a separate artifact, not an extra field in every history record.

| Choice | Consequence |
| --- | --- |
| Pause optional processing or stop operating | Work pauses; retained history and settings are not deleted, and billing does not pause |
| Stop collecting | No new history; existing rows remain readable under current access and retention |
| Delete selected history | Remove its base and derived records, caches and pending exports, with protection against queued work recreating it |
| Downgrade or end premium | Honor the paid period, stop premium processing/exploration when it ends, retain selected eligible basic operation and the disclosed frozen recovery state |
| Explicitly offboard a repository or confirm installation removal | Stop collection and enter the separate offboarding process |
| Close the account | Offer export before confirmation, then start the applicable deletion without an offboarding grace |

The shared frozen-archive default after financial service end is four years, with the customer's actual deadline and any justified data-heavy exception to be qualified before sale. It is inactive selected-state recovery, not an updating premium dataset. Authorized export and deletion remain available without another purchase. This archive does not override explicit deletion, repository offboarding or lost GitHub authority.

Explicit repository offboarding and confirmed installation removal instead start a thirty-day grace. After access loss, only a qualifying pre-existing service-account or organization administrator has the narrowly scoped recovery exception. Without current GitHub authority, it permits only numeric/pathless retained data, not private filenames, reacquisition or writes through a removed installation. Mere pause, allowance-slot release or lower-plan inactivity does not select this destructive offboarding path.

Account closure, expiry, backup handling and deletion completion have distinct consequences. [Security and data](../../help/security-and-data.md#retention-deletion-and-offboarding) owns the complete reader explanation. A temporary outage or unknown access response must not trigger deletion by guess. Restored access or payment does not silently resume collection or restore deliberately deleted data.

## Manage the account connection

In **Plan & funding**, inspect the plan standing, what it funds, organization slots and any pending change before following a Works action. A proposed change, a returned checkout and a confirmed funded period are different states. The [plan guide](plans-and-sharing.md#change-or-end-a-paid-plan) explains the selected upgrade, add-on and ending behavior.

Browser logout ends browser access. An enabled funding-service connection can retain the same protected GitHub grant while a qualifying funded organization needs current authority checks. It does not add repository permissions. **Account** provides a separate disconnect action: it removes the local grant and ends its sessions while leaving funding and organization bindings in place. Premium use then lacks verified authority until it is deliberately reconnected.

An ordinary later sign-in restores browser access without silently reconnecting that service purpose. Read the disclosed standing and use explicit reconnect when wanted. Local disconnect, GitHub's remote OAuth revocation, releasing a funding slot and ending a subscription are different actions. The [access contract](../../../dashboard-access.md#browser-access-and-the-funding-service-connection) explains those boundaries; local source qualification does not establish a real customer connection.

## Move between Actions and the App

Prepare the destination before changing the current writer. Export or reconcile its policy, compare effective defaults and origins, and preview the intended effects. Preserve useful read-only Actions: their presence alone is not a conflict.

At cutover, disable only the old writer's overlapping labels/comments, reconcile in-flight or ambiguous operations, then enable the destination and inspect a real result. A workflow concurrency group cannot fence an independently running App. If the old writer may still act, keep the replacement paused rather than racing both.

Historical comments belonging to the old actor remain historical; the new actor starts its own supported lifecycle. Moving back to Actions uses the same discipline. Rollback is an explicit policy/writer transition, not permission to run both or delete unrelated CI. Preserve the exported policy and the observed last state so the next operator can distinguish a useful no-op from missing execution.

## Recover by the failing stage

No delivery, rejected access, disabled execution, invalid policy, stale comparison, provider failure, incomplete effects, and failed history persistence need different repairs. Use the stable diagnostic code together with its phase and the current repository/PR identity, not a screenshot of an imagined dashboard label.

A stale comparison needs fresh acquisition. An ambiguous write needs provider readback before retry. History persistence after a successful label/check is a separate recovery job; repeating effects to repair history is wrong. The [App troubleshooting entries](../../help/troubleshooting.md#the-app-is-installed-but-does-not-run) connect those symptoms to the service and operator boundaries without requiring you to understand queue internals.
