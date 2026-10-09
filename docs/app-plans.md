# App editions and planned hosted plans

## Meaning

This document specifies the selected Community edition and hosted Free, Pro and Business offer. It is a reviewable product contract for an App still in development, **not an available checkout or a claim that the paid capabilities have shipped**. [Current direction](DIRECTION.md) owns implementation standing. [Account management](app-management.md) explains funding, repository selection and plan changes; [dashboard capabilities](dashboard.md) explains the analytical experience.

## Choose the capability, not a reader seat

**Free** provides managed PR operation and useful basic repository history.
**Pro** adds file-level codebase memory and richer exploration.
**Business** adds coordinated policies, automatic setup and delegated operation.

A subscription belongs to an individual account and can fund explicitly connected organisations. Collaborators with current GitHub access can read the capabilities available for a connected repository without buying reader seats.

| Purchase | Monthly | Annually | Monthly equivalent when paid annually |
| --- | ---: | ---: | ---: |
| Pro, including one connected organisation | €9 | €90 | €7.50 |
| Business, including one connected organisation | €42 | €400 | €33.33 |
| Each additional organisation, on either paid plan | €9 | €90 | €7.50 |

These are tax-inclusive consumer totals in EUR. Applicable consumption tax is included, not added to the advertised price. The shared billing service supplies the actual tax treatment and authoritative quote. Annual amounts are charged annually, not as the displayed monthly equivalent.

An add-on inherits its parent plan's features, cadence and renewal date. It is not a separately tiered subscription: a Business organisation add-on receives Business coordination, while a Pro organisation add-on receives Pro's three-private-repository allowance. No per-member, per-PR or processing-credit purchase model is selected.

## Hosted capability and repository allowances

| Capability | Free | Pro | Business |
| --- | --- | --- | --- |
| Configured checks, size labels and owned size replies | Included on enabled eligible repositories | Included | Included |
| Personal private repositories | Up to 3, pooled with one connected organisation | No repository-count limit | No repository-count limit |
| Public repositories with labelling | No repository-count limit | No repository-count limit | No repository-count limit |
| Public repositories with history | Up to 10, pooled with one connected organisation | No repository-count limit | No repository-count limit |
| Included organisation | One, using the pooled Free allowances | One, with up to 3 private repositories | One, without a repository-count limit |
| Additional organisations | Not included | Paid add-on; same Pro capabilities and 3-private allowance | Paid add-on; same Business capabilities |
| PR size, lifecycle and basic repository history | Included when history is enabled | Included | Included |
| Base file measurements needed for policy replay | Retained with history, including excluded observations | Included | Included |
| File-history exploration, clouds, Turnover and co-change | Preview/approved repository grant only | Included | Included |
| Premium file-context modules in optional PR briefs | Approved repository grant only | Included | Included |
| Progressive historical import | Up to 100 recent PRs per selected repository import | Recent first, followed by older recoverable history | Same, with coordinated onboarding |
| Monthly import allowance | Bounded; value to be published before sale | Bounded; value to be published before sale | Bounded; value to be published before sale |
| Historical recalculation | Manual per repository | Manual per repository | Automatic/coordinated for linked policies; manual available |
| Repository-specific policy | Included | Included | Included |
| Reusable account default | No paid default-library capability | One personal default and one per connected organisation | Shared named policies and a default per account scope |
| Policy linking, propagation and bulk application | No | No | Included |
| Automatic eligible repository setup | No | No | Included |
| Administration | One administering person per managed scope | One administering person per managed scope | Delegated scoped administration |
| Full administrative audit experience | No | No | Included |
| Reading currently authorised repository data | No paid reader seats | No paid reader seats | No paid reader seats |

A Pro organisation otherwise receives the same Pro experience as personal repositories. Free's organisation does not create another set of Free slots. Each additional Pro organisation has its own three-private-repository allowance.

A public repository outside Free's history allowance can remain labelling-only. Installed repositories do not become active or consume all allowances automatically. [Repository selection](app-management.md#select-repositories-explicitly) makes the chosen state and its consequences visible.

## Live work and background history

Live eligible checks, labels and size replies have priority. There is no monthly PR budget that turns them off and no additional charge for another PR, revision, provider duplicate or service-owned recovery. Actual requests still follow GitHub's rate limits and service fair scheduling.

Historical import, file enrichment and broad recalculation run asynchronously. They may be delayed or paused under sustained heavy use. The processing view shows actual scope, progress, policy basis and coverage instead of promising an unsupported completion time. Background work must not exhaust the live-processing lane.

The monthly historical-import allowance is distinct from live operation. Exact monthly values remain launch configuration; this document does not invent them. A resumed import or service retry does not consume the same logical work twice.

## Community self-hosting

The open Community application supplies the basic Free capability set **without the official service's repository-count, import or history-retention quotas**. Its operator chooses resource and retention settings. It works without a hosted subscription.

Rich historical file exploration and Business coordination are separate premium capabilities, supplied by privately maintained application extensions rather than included in Community behind a disabled button. The reusable engine, CLI, API, Actions, browser extension and public playground remain complete useful products under their existing component licences.

Commercial self-hosting is a separately licensed **Contact us** deployment option for premium capabilities, not a fourth hosted tier or a promise that another hosting adapter already exists.

## Preview and Open Source support

**One-time preview:** a stable GitHub account can choose one authorised repository and capture up to 100 historical PRs with premium file-level data. The result remains an explorable frozen sample, without continuing premium updates or live premium brief entitlement. Reinstallation does not reset eligibility; an interrupted attempt resumes the same capture.

**Open Source programme:** manual approval grants an eligible public repository premium file history/statistics, corresponding backfill and automatic refresh when its own policy changes. The grant is associated with its requester and repository, consumes none of the requester's normal allowances and works for personal or organisation repositories. It does not itself grant cross-repository policy linking.

Privatisation revokes the OSS benefit and public serving. An independently sufficient ordinary subscription can continue; grant revocation is not an instruction to delete history.

## Payment periods, price protection and availability

An upgrade starts a new full period and credits unused actually paid value. A mid-period organisation addition joins the current renewal and costs the unused fraction of its cadence's price. Downgrades and add-on removals take effect at paid-period end. [The management contract](app-management.md#change-the-plan-with-one-understandable-bill) gives the concrete examples and ending behaviour.

Paid beta subscribers retain their existing plan and purchased add-on prices throughout beta and for at least twelve months after beta ends while continuously subscribed. Already-paid periods are honoured. Recovery inside ordinary payment grace does not strip price protection. This is not a lifetime-price promise or an announcement of a predetermined future increase.

Before paid enrolment, the advertised capabilities, tax-inclusive checkout, funded organisation scope, processing visibility and data exit must work together. A beta label does not turn planned software into delivered functionality.
