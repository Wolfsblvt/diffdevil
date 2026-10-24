# Security and data

The data boundary depends on where you run diffdevil. Local analysis, an Action runner, a browser extension, Lens Studio (the public Playground), and a managed App do not send or retain the same information. None requires treating source code or a PR author as a measure of risk or productivity.

This is a reader's guide to the maintained [privacy and history contract](../../PRIVACY-AND-DATA.md), [App architecture](../../integration/github-app.md), [extension privacy notice](../../../apps/browser-extension/privacy.md), and [security-reporting policy](../../../SECURITY.md). Those sources own the complete specialist requirements. This page is not a separate legal notice, production-privacy certification, or promise that an unfinished hosted capability is already available.

## What leaves the machine

| Surface | Processing and external boundary | Data to handle carefully |
| --- | --- | --- |
| CLI and TypeScript library | Local Git, patch, and saved-report analysis runs in the selected process; a selected GitHub source or effect makes GitHub requests | Local reports, paths, policy/templates, credentials supplied to the host, and deliberately written artifacts |
| GitHub Actions | Runs on the chosen runner; GitHub reads and selected writes use workflow-supplied credentials | Job logs, summaries, artifacts, report/effect files, and the runner's own retention/access settings |
| Browser extension | Shared-engine analysis in the local extension worker; GitHub requests use the permitted page/public fallback routes | Rebuildable report/path/policy cache, local overrides, synchronized small preferences, and deliberate settings exports |
| Public Playground | Public GitHub reads and local browser analysis where supported; an independently deployed measurement API can process public comparison material | PR identities and shared policy in URLs, transient provider context, tab freshness state and exported outputs |
| Managed App | Server-side acquisition and selected GitHub effects under installation access | Protected configuration/account state, seven-day recovery records, and separately opted-in quantitative history |

The source website contains the complete configurable learning surface and documentation; the deployed measurement Worker is an earlier, narrower application. The App implements its analytical views and Manage with local qualification, alongside separate deployed backend evidence. General public admission and the live customer/data lifecycle remain unqualified. The extension has source and installed-build evidence; Store publication remains separate. [Releases](releases.md) keeps source support and actual distribution/deployment distinct.

## Local tools and Actions

Local analysis does not require uploading a patch to a diffdevil service. A deliberate GitHub source requests data from GitHub, and a deliberate apply operation can write there. Running in an agent's remote sandbox is still running in that environment, not automatically on your personal machine.

An Action's report or summary can contain repository paths and comparison identities. Retention and who can download an uploaded artifact depend on the runner/repository configuration. The App's seven-day recovery policy is not an Action-artifact retention setting, and the library does not impose a universal deletion policy on a caller's saved files.

A token supplies capability, not an instruction to mutate. Analyze remains read-only. Privileged policy comes from a trusted selected source, not executable PR-head code. The optional Action `policy-token` is confined to policy/template reads; acquisition and effects remain on `github-token`. [Source identity, trust, and mutation](../understand/trust-and-mutation.md) explains these boundaries.

## Extension processing and storage

The extension sends no source to a Wolfsblvt Works analysis backend, has no telemetry/advertising service, and asks for no personal access token or local daemon. Raw diffs are transient analysis inputs. The rebuildable cache retains normalized reports with their measured/bounded/declined coverage, private paths/revisions, trusted repository-policy text and templates, exact-base absence results and the last comparison confirmed for each pull request, so a comparison can reappear after a reload or restart; it is not independently encrypted from someone with access to the browser profile.

Small display/guided-policy preferences can synchronize through the browser provider when synchronization is enabled. Large advanced YAML, repository overrides and repository pause choices remain local. “Local analysis” is not a claim that synchronized preferences never leave the device.

Clearing caches or resetting data affects the extension's storage, not repository truth. Already rendered information may remain until an open page refreshes or closes. A support snapshot excludes repository identities, paths, policy text, and source; a deliberate full settings export can contain private configuration and needs separate care. The [extension privacy notice](../../../apps/browser-extension/privacy.md) owns the exact retained fields, permissions, deletion behavior, and unsupported incognito/host boundaries.

The extension does not silently apply labels. A native label-picker handoff leaves the actual selection to the user. There is no current authenticated App report-delivery integration, and a stored App preference does not authorize a hosted analysis or consume an invented quota.

## Public Playground

The public service does not accept private PRs, borrow App installation credentials, or enroll visitors in App history. Do not submit private source or a token to work around that boundary. Curated examples are deliberately published fixtures, not a record of visitor activity.

Opening a saved example can make a public head-revision check through the configured API. The browser keeps a successful public head ID in the tab's session storage to avoid repeat checks; the retained lesson does not depend on that check succeeding. Share URLs can contain an entered public PR identity or edited policy, so they can expose those values through copying, browser history and navigation requests.

The current public API sends `Cache-Control: no-store` and implements neither a result cache nor an application rate limiter. GitHub's anonymous rate limits still apply. Raw client IPs and entered PR URLs are not collected as default product analytics; that does not establish the hosting provider's request-log or retention settings. Follow the actual deployed service's notice for those operating facts. The [public-service operator source](../../../apps/playground/README.md#public-service-operating-boundary) owns production budgets, credential isolation and any separately selected cache or abuse controls.

## Authorization and writes in the App

GitHub sign-in establishes identity, not authority to administer any installation. Protected repository reads, configuration changes, history access/export/deletion, and account administration require current applicable authorization. Installation credentials stay server-side and are separate from a signed-in person's authorization.

Repository writes use trusted policy and fresh comparison identities. A saved report/plan hash establishes internal consistency, not trusted origin or permission. Plans, requests, observed effects, and native checks remain distinct. Ambiguous writes require readback before retry, especially for comment creation. Another actor's historical comment is not adopted as App-owned state.

Detail expressions operate on checked inert data with fixed functions; they cannot call a shell, network, filesystem, timer, environment lookup, or arbitrary JavaScript callback. This does not sandbox arbitrary code already executing in a TypeScript host. The host still owns its process, credentials, and untrusted-data construction boundary.

## Recovery data is not history consent

The operational ledger lasts seven days and keeps only what is needed for admitted-work deduplication, diagnosis, retries, and recovery: delivery/attempt identity, numeric repository/installation identifiers, PR/comparison/policy references, bounded codes, and compact result/effect readback summaries. Failures and dead letters share that boundary; retry does not continually reset the original retention clock.

With history off, the App collects no new history. Rows already retained remain readable while the person still has current repository access and the rows remain within retention; Stop collecting does not delete them. Explicit deletion and access-loss rules still apply. Labels, comments, checks, and ordinary recovery remain available without new history collection. Account, installation, configuration, and entitlement state have their separate active-service lifecycle; they do not disappear because the recovery ledger expires.

Numeric repository/PR/revision references remain linkable to GitHub. Omitting names does not make either recovery records or history anonymous. Queues, dead letters, logs, traces, caches, and exports must obey the same minimized-data intent instead of becoming hidden richer copies.

## Opt-in quantitative history

An authorized installation administrator selects history for the intended scope after seeing its data, retention, coverage, and export/deletion controls. The worker rechecks eligibility when recording a result. Queued work cannot restore collection after opt-out or repopulate deliberately deleted history.

History retains repository names, relative file paths, numerical per-file measurements, evidence, bounds, versions, lifecycle facts, immutable comparison identities, opaque configuration references and selected policy/effect outcomes. It excludes source contents and patches, contributor-performance dimensions, PR/commit/review prose, raw webhook bodies, arbitrary error text, rendered comments, secret material and full report/plan/configuration bodies. Names and paths are protected repository metadata. File continuity requires observed evidence; matching names alone do not establish it. Older pathless records retain their limited coverage rather than inventing missing filenames.

History-enabled Free also retains the base paths and numerical observations needed for supported policy replay, including analytically excluded files. Exclusion changes the analytical question; it is not a no-collection setting. Retaining those base facts does not grant premium historical file exploration. Recalculation changes a derived current-policy view, not the immutable observation or an actual historical GitHub effect.

Separately submitted configuration can include path patterns and authored label/template text. It belongs in protected configuration storage, not the numeric-history projection. A historical policy hash cannot recreate a missing old policy or template.

Authorized contextual detail can be reacquired transiently from GitHub after checking current user and installation access. Responses containing private context must not enter shared caches. A missing revision or revoked grant can make the original view unreconstructable; it does not justify attaching today's context to yesterday's numbers. Coverage dates, sample sizes, missing populations, and gaps remain visible in history and statistics.

File-detail addresses use opaque locators rather than repository-relative paths, and document titles do not contain the path. Analytical queries carry paths in authenticated request bodies, not URLs. Opening a copied link checks access again. App documents use a same-origin referrer policy and protected JSON uses no-referrer; diagnostics must not keep full private request URLs, bodies or referrers. This protects the navigation boundary without making the visible file page or an authorized export anonymous.

## Account, funding and optional feedback

Configuration, account state, funding and administrative audit have purposes distinct from analytical history. A linked Works account supplies its benefit projection and organization bindings, not payment instruments or unrelated invoices. A funder grants no repository authority merely by paying. Business Audit concerns operating changes and their outcomes, not contributor performance.

An enabled qualifying funding-service connection can retain the same protected GitHub grant for current authority checks after browser logout. Account provides independent disconnect/reconnect controls. Disconnect removes the local grant and invalidates its sessions without ending the subscription or unbinding organizations; ordinary sign-in must not silently undo that preference. [Account connections](../use/managed-app/service.md#manage-the-account-connection) explains the reader consequence.

An optional participation survey stores the answers you deliberately submit separately from repository analytics. The answers stay in diffdevil; Works receives a completion fact for the campaign reward. You can inspect, export and delete your answers. Deleting answers keeps the minimal completion fact and the reward it earned; account closure deletes the participation rows. The [participation contract](../../PRIVACY-AND-DATA.md#participation-survey-responses) distinguishes these records from Works' own commercial records. No marketing subscription follows from GitHub sign-in.

## Retention, deletion, and offboarding

Enabled hosted history follows the disclosed service policy, explicit deletion and any selected shorter retention. Community's operator selects its own retention and resources. Read the actual policy and visible deadline; neither a paid plan nor a recovery archive promises unlimited storage or perpetual operation. [Plans and shared access](../use/managed-app/plans-and-sharing.md) owns the selected commercial offer and what still needs publication.

Stopping future collection and deleting retained history are separate actions. Deletion removes the selected base history, named file rows, lifecycle, enrichment, relationships, derived rollups, cached projections and pending exports. Queued work, imports and restores must respect deletion tombstones. Analytical exports use a documented, versioned allowlist that can include authorized names and paths; an operator database export can contain additional protected configuration and account state and is not interchangeable with it.

**Financial downgrade or premium ending:** honor the paid period, then stop premium exploration and processing while selected eligible basic operation can continue. Authorized export and deletion remain available without another purchase. Selected frozen state follows the shared recovery policy and visible deadline; its default is four years from service end, with the actual archive and any justified data-heavy exception to be qualified before sale. It is inactive recovery state, not continuing premium history.

**Explicit repository offboarding or confirmed installation removal:** stop collection and begin the separate thirty-day grace. Pausing, freeing an allowance slot or being inactive over a lower-plan limit does not itself select offboarding. The sole post-access-loss exception is a qualifying independently authenticated service-account or organization administrator whose role predates the loss. During grace they may inspect/export/shorten/delete the permitted retained projection. Without current GitHub authority it is **numeric and pathless**: a former payer cannot export private filenames through this exception. It cannot reacquire context, use a removed installation credential or restore repository access. With no eligible administrator, history is inaccessible and still expires.

**Account closure:** offer export before final confirmation, then begin the applicable deletion without that grace. Personal and organization-owned state retain their respective ownership. Grace expiry or confirmed closure removes applicable primary and derived history, caches and pending exports within seven days. Deletion/expiry tombstones outlive the longest supported backup-restore window by seven days and must be reapplied before restored data is served or processed. A claim of immediate erasure of all provider backups requires evidence; bounded backup expiration must be disclosed and qualified. A frozen archive does not override a deletion request, offboarding or current access.

A single failed API call, temporary suspension, outage or billing retry is not positive evidence of removal and must not trigger destructive offboarding by guess. Restored access or payment does not silently resume disabled collection or restore deliberately deleted data. The [complete privacy contract](../../PRIVACY-AND-DATA.md#export-deletion-and-ending) owns the full transition and restoration requirements.

## Self-hosted responsibility

Self-hosting gives you the operating responsibility as well as the source. Qualify real authorization, migration/maintenance execution, recovery lifetimes, export/import, deletion across your backups, and safe decommissioning. Protect account/configuration exports and credentials; a build, migration, or passing numeric-projection test cannot prove production authorization or retention.

Use the [self-hosting guide](../use/managed-app/self-hosting.md) to enter the maintained Worker/Queue/D1 operator route. Do not infer the official service's terms, backup window, support commitment, or public availability from a source checkout. The [licence map](../../../LICENSES/README.md) separately identifies software, documentation, examples, and reserved assets.

## Report a vulnerability

Use GitHub's private vulnerability-reporting route described in [SECURITY.md](../../../SECURITY.md). Include the affected version or commit, a reproducible description, and the security consequence; keep exploit details out of public Issues and pull requests during assessment. Do not send secrets or unnecessary private source to make the report complete.

The security policy does not promise an established response time or indefinite support for every old version. Ordinary non-sensitive defects belong in [Technical and project documentation](technical-and-project-documentation.md), with the minimal diagnostic information described in [Troubleshooting](troubleshooting.md#report-a-useful-problem-safely).
