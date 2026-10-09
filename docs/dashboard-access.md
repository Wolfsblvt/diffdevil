# Dashboard accounts, access and publication

## Meaning

This document owns the selected account and permission model for the managed diffdevil App. It describes planned product behaviour, not a claim of a complete live authentication journey or subscription availability. [Dashboard capabilities](dashboard.md) owns the experience; [App integration](integration/github-app.md) owns runtime authentication; [privacy and data](PRIVACY-AND-DATA.md) owns retained information and offboarding.

## Separate identity, reach, administration and plan

A GitHub sign-in identifies a person. An App installation defines the repositories the service can reach. The person's current GitHub repository access bounds what they may see. Their diffdevil role defines permitted administration within that scope. A plan defines available operated capabilities and capacity.

None of these facts substitutes for another. Paying for Business does not reveal a private repository. Owning a session does not prove current GitHub access. An installation credential does not confer every installation repository's visibility on every user.

Anyone may sign in. A collaborator does not have to own an installation or purchase a separate subscription to read the data available for a repository they can currently access. Empty or unavailable populations should explain the actual state, not imply the person must become an administrator.

## Personal and organisation accounts

Managed account scope follows an explicitly selected GitHub personal account or organisation. Account defaults govern that account's managed repositories. Personal defaults do not apply to another owner's repository merely because the person collaborates there.

Pro and Business are capability plans, not GitHub account types. A personal account may use Business for coordinated automation. A person administering a one-person organisation does not become a group merely because GitHub calls its owner an organisation.

The signed-in home may aggregate several accessible account scopes. It must identify the scope of administration and never silently apply one account's defaults to another. Subscription funding and organisation connections follow the companion plans/management contract; they never imply additional repository authority.

## Read access

Protected analytical access requires the currently supported GitHub user/repository and App grant checks. Loss of access affects detail views, charts, searches, exports and aggregates, not only navigation.

A shared home or organisation summary is calculated from the reader's actual authorised repository set. Hiding a repository's name while retaining its measurements in a total, cloud or relationship is not sufficient. Shared views and saved selections are re-authorised when opened; possession of a link is not perpetual access.

Business may restrict or delegate within GitHub visibility, but it does not provide an additional route to private repositories unavailable to the person on GitHub. There is no organisation-wide analytics-sharing exception that bypasses that ceiling.

The existing narrowly defined offboarding export/grace route is a separate lifecycle capability, not normal dashboard access and not authority to reacquire GitHub context after removal.

## Administration

| Person and scope | Planned diffdevil capability |
| --- | --- |
| Current collaborator | Read available repository, PR and file analytics; follow briefs to protected detail. |
| Pro administering person | Configure that managed account's repositories, per-scope defaults, manual imports, execution/history choices and eligible publication. |
| Other collaborator on Pro | Read-only within diffdevil, even if GitHub independently grants powers outside the App. |
| Business delegated repository administrator | Perform explicitly granted diffdevil operations for selected currently accessible repositories. |
| Business account administrator | Manage account defaults, linked configurations, automatic setup, delegation and account-level controls within current authority. |

The implementation should keep permissions understandable rather than introduce a role taxonomy without a useful operation. Viewing, editing configuration, applying effects, managing history/imports, publication, deletion/export, managing members and billing are different consequences. Delegating one must not accidentally grant all of them.

Native GitHub powers remain native GitHub powers. A diffdevil subscription cannot prevent a sufficiently authorised GitHub user from uninstalling an App in GitHub or changing the repository's trusted configuration file. Document this distinction instead of promising control the App does not own.

Administration needs current authorisation at operation time. A role captured at login is not authority forever. Background work rechecks the current installation, consent and applicable configuration before a consequential write or history publication.

## Defaults and automatic setup

Pro supports named reusable configurations, a chosen account default, repository differences and deliberate per-repository application. Repository-local setup suggestions can offer applying the default and starting an import.

Business adds linked shared policies and account-wide automation. Explicit rules can configure a newly reachable repository, link its policy and start the selected history/import behaviour. Once the administrator chose that automation, it should not be reduced to a repeated manual approval loop for every otherwise eligible repository.

Automatic setup requires actual installation reach. A new repository that the App cannot access is not admitted by a notification or a saved default. Discovery of unconnected private repositories is deferred; a GitHub installation/repository link can provide the initial manual route.

Analysis policy, history consent, publication and access delegation remain separate settings. A preset name is not consent to collect or publish data. Business automation may include those choices only when the account administrator explicitly selected the relevant automatic behaviour.

## Shared policies and repository overrides

Business can link repositories to named shared configuration and propagate updates. Pro can reuse the same kind of named configuration through manual application. Analytics and comparisons are not reserved to Business.

Trusted `.diffdevil.yml` settings keep precedence over App defaults. The repository's administration view shows both the selected App configuration and the effective origins/overrides. A delegated App administrator must not be told a bulk change succeeded for a value the repository still overrides.

PR-brief settings belong to the App's named configuration. They do not add a template engine or a new repository-file policy surface. Existing core configuration and owned-comment functionality remain portable.

## Administrative audit

Business includes an attributable audit of changed settings, policies, permission grants, automatic setup, imports/deletions and observed installation-administration actions. Keep event time, actor when established, scope, intended change and observed outcome distinguishable. Unknown actors stay unknown; a failed or merely requested operation must not appear as a successful completed change.

An audit of administration is not contributor activity analytics. It is protected account data and must not be exposed through a public statistics view. Its purpose and lifetime are distinct from numerical measurement history and the short operational recovery ledger.

A useful audit does not require a rollback UI in the first delivery. Stored historical facts must still support explaining what changed.

## Publishing read-only analytics

Publication is an explicit administrative capability for public GitHub repositories only.

| Setting | Values | Scope |
| --- | --- | --- |
| Account publication default | Disabled or enabled | That account's eligible repositories, not every account a person can administer. |
| Repository publication override | Inherit, enabled or disabled | One repository. |

The default restricted view remains available only to authorised readers. Public GitHub visibility alone does not opt the repository into publication. A private repository is ineligible even when its account default is enabled. An enabled override cannot bypass this eligibility rule.

An intentionally published analytical view requires no GitHub sign-in. It is a public projection, not the authenticated dashboard with controls disabled. Permitted content includes repository/file activity, clouds, supported PR detail and their evidence. It excludes administrative configuration, audit history, billing, delegation/member details and private sibling-repository facts.

Publication must stop after an authorised unpublish or confirmed GitHub privatisation. Public cache and export behaviour must follow that revocation boundary. Implementation must qualify propagation and must not promise that previously copied public data can be retracted from outside readers.

Facts posted into a public PR brief are already public, regardless of whether its detailed dashboard link is protected. Never include private cross-repository context in such a brief merely because the installer can see it.

## Deliberately excluded starting scope

No access grants to GitHub-inaccessible private repositories; no separate paid seat for every collaborator; no automatic power over native GitHub permissions; no mandatory inventory of unconnected private repositories; no repository-wide historical-policy dashboard; and no rollback system merely because audit records exist.

These boundaries keep the useful product coherent without reducing its selected collaboration, analytics or automation capabilities.
