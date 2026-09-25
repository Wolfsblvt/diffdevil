# Security and data

The data boundary depends on where you run diffdevil. Local analysis, an Action runner, a browser extension, the public Playground, and a managed App do not send or retain the same information. None requires treating source code or a PR author as a measure of risk or productivity.

This is a reader's guide to the maintained [privacy and history contract](../../PRIVACY-AND-DATA.md), [App architecture](../../integration/github-app.md), [extension privacy notice](../../../apps/browser-extension/privacy.md), and [security-reporting policy](../../../SECURITY.md). Those sources own the complete specialist requirements. This page is not a separate legal notice, production-privacy certification, or promise that an unfinished hosted capability is already available.

## What leaves the machine

| Surface | Processing and external boundary | Data to handle carefully |
| --- | --- | --- |
| CLI and TypeScript library | Local Git, patch, and saved-report analysis runs in the selected process; a selected GitHub source or effect makes GitHub requests | Local reports, paths, policy/templates, credentials supplied to the host, and deliberately written artifacts |
| GitHub Actions | Runs on the chosen runner; GitHub reads and selected writes use workflow-supplied credentials | Job logs, summaries, artifacts, report/effect files, and the runner's own retention/access settings |
| Browser extension | Shared-engine analysis in the local extension worker; GitHub requests use the permitted page/public fallback routes | Rebuildable report/path/policy cache, local overrides, synchronized small preferences, and deliberate settings exports |
| Public Playground | Public GitHub reads and local browser analysis where supported; an independently deployed measurement API can process public comparison material | Submitted public PR identity, transient provider context, outputs you export, and disclosed service rate-limit/cache data |
| Managed App | Server-side acquisition and selected GitHub effects under installation access | Protected configuration/account state, seven-day recovery records, and separately opted-in quantitative history |

The source website contains the complete configurable Playground and documentation; the deployed measurement Worker is an earlier, narrower application. The App has a deployed backend canary, not general public admission or a fully qualified dashboard/history service. The extension exists in source but Store publication remains separate. [Releases](releases.md) keeps source support and actual distribution/deployment distinct.

## Local tools and Actions

Local analysis does not require uploading a patch to a diffdevil service. A deliberate GitHub source requests data from GitHub, and a deliberate apply operation can write there. Running in an agent's remote sandbox is still running in that environment, not automatically on your personal machine.

An Action's report or summary can contain repository paths and comparison identities. Retention and who can download an uploaded artifact depend on the runner/repository configuration. The App's seven-day recovery policy is not an Action-artifact retention setting, and the library does not impose a universal deletion policy on a caller's saved files.

A token supplies capability, not an instruction to mutate. Analyze remains read-only. Privileged policy comes from a trusted selected source, not executable PR-head code. The optional Action `policy-token` is confined to policy/template reads; acquisition and effects remain on `github-token`. [Source identity, trust, and mutation](../understand/trust-and-mutation.md) explains these boundaries.

## Extension processing and storage

The extension sends no source to a Wolfsblvt Works analysis backend, has no telemetry/advertising service, and asks for no personal access token or local daemon. Raw diffs and referenced template contents are transient analysis inputs. The rebuildable cache can retain normalized reports, private paths/revisions, trusted repository-policy text, and exact-base absence results; it is not independently encrypted from someone with access to the browser profile.

Small display/guided-policy preferences can synchronize through the browser provider when synchronization is enabled. Large advanced YAML and repository overrides remain local. “Local analysis” is not a claim that synchronized preferences never leave the device.

Clearing caches or resetting data affects the extension's storage, not repository truth. Already rendered information may remain until an open page refreshes or closes. A support snapshot excludes repository identities, paths, policy text, and source; a deliberate full settings export can contain private configuration and needs separate care. The [extension privacy notice](../../../apps/browser-extension/privacy.md) owns the exact retained fields, permissions, deletion behavior, and unsupported incognito/host boundaries.

The extension does not silently apply labels. A native label-picker handoff leaves the actual selection to the user. There is no current authenticated App report-delivery integration, and a stored App preference does not authorize a hosted analysis or consume an invented quota.

## Public Playground

The public service does not accept private PRs, borrow App installation credentials, or enroll visitors in App history. Do not submit private source or a token to work around that boundary. Curated examples are deliberately published fixtures, not a record of visitor activity.

Rate-limit counters are short-lived abuse/compute controls, not a persistent activity timeline. Raw client IPs and entered PR URLs are not collected as default product analytics. Any short-lived public-result cache is a separately disclosed service optimization, preferably a quantitative projection tied to immutable public comparison identity; fetched paths and prose stay transient. Follow the actual deployed service's notice rather than assuming every selected source capability is already serving traffic.

## Authorization and writes in the App

GitHub sign-in establishes identity, not authority to administer any installation. Protected repository reads, configuration changes, history access/export/deletion, and account administration require current applicable authorization. Installation credentials stay server-side and are separate from a signed-in person's authorization.

Repository writes use trusted policy and fresh comparison identities. A saved report/plan hash establishes internal consistency, not trusted origin or permission. Plans, requests, observed effects, and native checks remain distinct. Ambiguous writes require readback before retry, especially for comment creation. Another actor's historical comment is not adopted as App-owned state.

Detail expressions operate on checked inert data with fixed functions; they cannot call a shell, network, filesystem, timer, environment lookup, or arbitrary JavaScript callback. This does not sandbox arbitrary code already executing in a TypeScript host. The host still owns its process, credentials, and untrusted-data construction boundary.

## Recovery data is not history consent

The operational ledger lasts seven days and keeps only what is needed for admitted-work deduplication, diagnosis, retries, and recovery: delivery/attempt identity, numeric repository/installation identifiers, PR/comparison/policy references, bounded codes, and compact result/effect readback summaries. Failures and dead letters share that boundary; retry does not continually reset the original retention clock.

With history off, there is no permanent per-file/result table quietly collecting data for a future dashboard. Labels, comments, checks, and ordinary recovery remain available without long-term history. Account, installation, configuration, and entitlement state have their separate active-service lifecycle; they do not disappear because the recovery ledger expires.

Numeric repository/PR/revision references remain linkable to GitHub. Omitting names does not make either recovery records or history anonymous. Queues, dead letters, logs, traces, caches, and exports must obey the same minimized-data intent instead of becoming hidden richer copies.

## Opt-in quantitative history

An authorized installation administrator selects history for the intended scope after seeing its data, retention, coverage, and export/deletion controls. The worker rechecks eligibility when recording a result. Queued work cannot restore collection after opt-out or repopulate deliberately deleted history.

History retains aggregate and pathless per-file measurements, evidence, bounds, versions, immutable comparison identities, opaque configuration references, and selected policy/effect outcomes. It excludes source/patches, filenames and hashes of filenames, contributor identities, PR/commit/review prose, raw webhook bodies, arbitrary error text, rendered comments, secret material, and full report/plan/configuration bodies. A per-analysis file ordinal is not a cross-revision file identifier.

Separately submitted configuration can include path patterns and authored label/template text. It belongs in protected configuration storage, not the numeric-history projection. A historical policy hash cannot recreate a missing old policy or template.

Authorized contextual detail can be reacquired transiently from GitHub after checking current user and installation access. Responses containing private context must not enter shared caches. A missing revision or revoked grant can make the original view unreconstructable; it does not justify attaching today's context to yesterday's numbers. Coverage dates, sample sizes, missing populations, and gaps remain visible in history and statistics.

## Retention, deletion, and offboarding

Free hosted history uses a thirty-day rolling window from analysis time. The selected paid-history design has no automatic age expiry while the entitlement and service remain active, subject to explicit deletion, shorter user-selected retention, and disclosed storage/usage terms. Prices, quotas, and billing terms are not established offers. Upgrading retention cannot restore expired records; a downgrade needs the new boundary and an export opportunity before an acknowledged destructive change.

Stopping future collection and deleting retained history are separate actions. Deletion removes the selected records, derived rollups, cached projections, and pending work that could recreate them. History exports use a documented versioned numeric format; an operator database export can contain additional protected configuration and account state and is not interchangeable with it.

Confirmed repository deselection, installation removal, or entitlement end stops collection immediately and starts a thirty-day offboarding grace. The sole post-access-loss exception is an independently authenticated service-account or organization administrator whose role predates the loss: during that grace, they may inspect/export/shorten/delete already-retained numeric history. They cannot reacquire GitHub context, use a removed installation credential, or restore repository access. With no eligible administrator, history is inaccessible and still expires.

Account closure skips the grace: offer export before final confirmation, then begin deletion immediately. Grace expiry or closure removes primary history, pathless rows, rollups, caches, and pending exports within seven days. Deletion/expiry tombstones outlive the longest supported backup-restore window by seven days and must be reapplied before restored data is served or processed. A claim of immediate erasure of all provider backups requires evidence; bounded backup expiration must be disclosed and qualified.

A single failed API call, temporary suspension, outage, or billing retry is not positive evidence of removal and must not trigger destructive offboarding by guess. Restored access does not silently resume execution or history consent. The [complete privacy contract](../../PRIVACY-AND-DATA.md#retention-deletion-and-recovery) owns the full transition and restoration requirements.

## Self-hosted responsibility

Self-hosting gives you the operating responsibility as well as the source. Qualify real authorization, migration/maintenance execution, recovery lifetimes, export/import, deletion across your backups, and safe decommissioning. Protect account/configuration exports and credentials; a build, migration, or passing numeric-projection test cannot prove production authorization or retention.

Use the [self-hosting guide](../use/managed-app/self-hosting.md) to enter the maintained Worker/Queue/D1 operator route. Do not infer the official service's terms, backup window, support commitment, or public availability from a source checkout. The [licence map](../../../LICENSES/README.md) separately identifies software, documentation, examples, and reserved assets.

## Report a vulnerability

Use GitHub's private vulnerability-reporting route described in [SECURITY.md](../../../SECURITY.md). Include the affected version or commit, a reproducible description, and the security consequence; keep exploit details out of public Issues and pull requests during assessment. Do not send secrets or unnecessary private source to make the report complete.

The security policy does not promise an established response time or indefinite support for every old version. Ordinary non-sensitive defects belong in [Technical and project documentation](technical-and-project-documentation.md), with the minimal diagnostic information described in [Troubleshooting](troubleshooting.md#report-a-useful-problem-safely).
