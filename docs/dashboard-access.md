# App accounts, access and publication

## Meaning

This document owns the selected authorisation and scope model for the developing App. It describes planned behaviour, not deployed authentication or subscription availability. [Plans](app-plans.md) owns commercial capabilities, [management](app-management.md) owns customer operations, [dashboard](dashboard.md) owns analytics and [privacy/data](PRIVACY-AND-DATA.md) owns retained information and ending.

## Separate identity, reach, administration and benefit

GitHub sign-in identifies a person. An App installation defines reachable repositories. The person's current GitHub repository access bounds what they may see. A diffdevil role defines administration inside that scope. A purchased or granted benefit defines capabilities and capacity. Repository selection and independent history consent govern operation.

None substitutes for another. Paying does not reveal a private repository; an installation credential does not give every installation repository's visibility to every signed-in user. Owning a session is not permanent repository authority.

Anyone may sign in. Collaborators can read the capabilities available for connected repositories they currently may access without buying a reader subscription. A Free account can therefore read a colleague's Pro repository or an approved OSS repository without upgrading its unrelated personal scope.

## Personal subscriptions and organisation funding

An individual owns the subscription. Pro and Business each include one organisation connection; additional organisation connections are paid add-ons with the same tier and cadence. A Free account may connect one organisation using its pooled personal/organisation allowances.

Only one ordinary subscriber funds an organisation at a time. Its dashboard identifies that funder and plan. The organisation owner may disconnect or replace the relationship, and the subscriber may withdraw it. An incoming subscriber must accept and have an available connection. Two colleagues cannot stack Pro allowances.

Funding grants no additional GitHub reach or administrative power. Organisational records and settings do not become personal property of whoever pays. Organisation administrators do not gain the funder's card or unrelated invoice access. A business billing identity can remain separate from the GitHub individual used for product sign-in.

Defaults remain scoped: personal defaults apply to owned personal repositories; each organisation has its own defaults. A signed-in home may aggregate several accessible scopes, but cannot apply the reader's configuration to collaborator repositories merely because they are visible.

## Browser access and the funding service connection

Browser logout ends browser access. While a binding's current projection is Pro/Business and `funded` or `renewal-in-grace`, an enabled service connection keeps the funder's same protected GitHub grant with the same scope. Capacity or an active link alone is not funding. A collaborator's funded capability does not depend on the funder keeping a dashboard session open. Grant expiry, actual revocation and absent or unobservable current authority still withhold organisation premium use; payment does not manufacture authority.

The funder can explicitly disconnect the retained connection without unbinding the organisation or ending the subscription. Disconnect removes the locally protected grant, invalidates its browser sessions and pending sign-in artifacts, and retains a service-disconnected preference. Ordinary sign-in restores browser access only; service checks stay off until the owner deliberately reconnects through a usable session and currently verified same-scope grant. The binding remains funded with `unknown` authority and no provider-derived label. Reconnect re-observes authority without rebinding and does not guarantee administration is present. Unbind, capacity removal, link ending or no longer funded standing releases the service purpose; a grant with no remaining purpose, usable session or pending sign-in is removed by ordinary cleanup. The disconnect preference survives that grant cleanup. A restore hold preserves only the last funded purpose for reconciliation and withholds service observations until Wirt supplies its current answer.

Before customer adoption, the designed Account experience must disclose retention at organisation bind, explicit reconnect and logout, and offer independent disconnect/reconnect actions with their premium-use consequence. Sign-in must preserve and show a disconnected preference, not silently reconnect service. Logout returns the backend's local connection standing after the session ends; an unknown fact cannot be presented as retained or released. It must distinguish local disconnect from GitHub's remote OAuth permission, commercial unlink and slot release. The backend seam is implemented in the [commercial consumer](integration/app-commercial-link.md#independent-github-connection-revocation); the Account/Manage/subscription screens and their disclosure/disconnect/reconnect journey remain undesigned or unqualified.

## Read access

Protected analytical access requires current supported GitHub user/repository and App grant checks. Loss of access affects charts, details, queries, exports and aggregates, not only navigation.

A home or organisation summary is calculated from the reader's actual authorised repository set. Hiding the repository name but retaining its numbers or relationships is not sufficient. Shared URLs and saved selections re-authorise when opened; possession of a link is not perpetual access.

Premium capability is evaluated at the repository, including its funding, preview or OSS grant. Missing entitlement or enrichment is not measured zero. Free's retained base file rows do not implicitly expose premium file-history APIs.

Business may delegate or restrict within GitHub visibility; it provides no additional route to private repositories unavailable to the person on GitHub. The existing narrowly defined numeric/pathless post-access-loss grace is a separate recovery capability, not a general named-history access exception.

Namespace analytical features follow that namespace's funded plan. A Free collaborator can read entitled features there under current repository access. Premium All-repositories aggregates instead follow the viewer's own plan and include only eligible premium-funded repositories, with excluded coverage named. A repository-count heuristic must not substitute for namespace versus All-repositories scope, and inaccessible repositories must not change the entitlement decision. [The ratified analytical experience](dashboard.md#ratified-analytical-experience) owns chips, useful Free states and navigation.

## Administration

| Person and scope | Planned capability |
| --- | --- |
| Current collaborator | Read the repository's available analytics and follow brief links. |
| Free/Pro administering person | Configure the managed scope, select repositories, manually import/recalculate, manage history and eligible publication. |
| Other collaborator on Free/Pro | Read-only inside diffdevil, even when GitHub independently grants additional powers. |
| Business delegated repository administrator | Perform expressly delegated operations for selected currently accessible repositories. |
| Business account administrator | Manage defaults, linked policies, automatic setup, delegation and account-level controls within authority. |
| Subscriber/billing owner | Manage the purchase and organisation connection benefits through authorised shared billing, without acquiring repository authority merely by paying. |

Keep the role model understandable. Viewing, configuration, provider effects, imports, history export/deletion, publication, delegation and billing are different consequences; granting one must not grant all implicitly.

Native GitHub powers remain native powers. A plan cannot prevent a sufficiently authorised GitHub user from uninstalling the App or changing the trusted repository configuration file.

Check current authority when an action occurs. A role captured at login is not forever valid. Background work rechecks installation, selection, history consent, entitlement and applicable configuration before committing data or effects.

## Repository admission and defaults

The management view distinguishes provider reach, selected execution, labelling-only, history-enabled, paused and inactive-over-allowance states. A public repository outside Free's history allocation can remain labelling-only. Selection must apply the actual pooled/per-organisation allowance, not regenerate capacity for each reader.

Pro supplies one configured personal default and one per funded organisation. Its local apply/difference action belongs in that repository's settings. It has no global drift hints, shared-policy library or bulk apply. Repository-specific custom policy remains available.

Business adds linked shared configurations and account-wide automation. Explicit rules may configure newly granted eligible repositories, link policy and start the selected history/import behaviour. Once the administrator chose that behaviour, do not convert every eligible repository into another compulsory confirmation.

Automation requires actual App reach. Unconnected private-repository discovery is not a first-delivery requirement. A provider notification or subscription does not create missing repository access.

Policy selection, history collection, publication and delegation remain independent choices. A default configuration name is not consent to collect or publish.

## Overrides and coordinated changes

Trusted `.diffdevil.yml` values keep precedence over App defaults. The administration view shows the selected App settings and effective origins. An automated rollout cannot claim an effect where the repository overrides the changed value.

Business updates propagate only to linked applicable repositories. Coordinated history replay and open-PR refresh use their normal data/effect boundaries. Free/Pro manual history recalculation does not confer Business cross-repository coordination.

Brief configuration belongs to the App. It may be shared with its configured policy but introduces no new portable template language. A lower-plan transition preserves current settings as ordinary repository configuration rather than deleting them along with a link.

## Administrative audit

Business includes an attributable record of settings, policy, permission, automatic setup, import/deletion and observed installation-administration changes. Keep event time, actor when established, scope, intended change and observed result distinct. Unknown actors stay unknown; requested or failed operations are not completed changes.

This is protected administrative data, not contributor activity analytics. Its purpose and lifetime differ from measurement history and seven-day operational recovery. Exact retention and before/after representation need an explicit implementation contract, not an unlimited promise.

Audit does not require an initial rollback interface or a general historical-policy dashboard.

## Publishing read-only analytics

Publication is explicit and eligible only for public GitHub repositories.

| Setting | Values | Scope |
| --- | --- | --- |
| Account publication default | Enabled or disabled | One managed personal/organisation account |
| Repository override | Inherit, enabled or disabled | One repository |

Public GitHub visibility alone does not publish analytics. A private repository stays ineligible even if a broader default enables publication.

The anonymous view is an analytical projection, not an authenticated dashboard with disabled buttons. Its content follows the repository's available capabilities and evidence. Exclude settings, audit, billing, delegation, member-administration details and private sibling facts.

An authorised unpublish or confirmed privatisation stops public serving, including applicable caches. Do not promise recall of external copies. Privatisation also revokes an OSS grant independently of billing and data deletion.

Facts posted in a public PR brief are already public. Never include private cross-repository context merely because the installer can see it; a protected detail link does not protect its surrounding comment.

## Leaving and restoring

Subscription changes, repository deselection, provider access loss and deletion are different transitions. [Management](app-management.md) carries term-end changes and funding continuity; [privacy/data](PRIVACY-AND-DATA.md) carries archive, access-loss grace, deletion and restore protection.

Retained data does not mean a former payer can still read named private metadata after losing GitHub authority. A restored payment does not override deletion or silently resume disabled collection.

No broader private analytics sharing, reader-seat billing, general rollback system or required inventory of every unconnected private repository is implied by these capabilities.
