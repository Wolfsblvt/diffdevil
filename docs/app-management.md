# App accounts, processing and subscription management

## Meaning

This document owns the selected management experience for the developing App: individual subscriptions funding organisations, explicit repository selection, background-history visibility, plan changes and data exit. It complements [plan definitions](app-plans.md), [authorisation and publication](dashboard-access.md), [analytical capabilities](dashboard.md) and [privacy/data](PRIVACY-AND-DATA.md). It describes planned behaviour, not a deployed billing service.

## Keep activity and administration distinct

The home, repository, PR and file destinations lead with activity and its meaning. Settings, repository selection, processing and subscription management are separate destinations for authorised people. A collaborator should not have to administer an installation to read useful data.

Administrators need a clear account scope: personal repositories, one explicitly connected organisation or another funded organisation. Selecting a scope does not change a reader's GitHub permissions. The subscription does not become a seat charge for everyone who can read.

The analytical shell and six destinations are ratified for implementation. Manage/configuration/account/subscription visual and interaction design deliberately follows chart/cloud system co-design inside that shell. The commercial and lifecycle rules below are settled product contracts; they do not authorise inventing their screens or reopening the selected prices. [The analytical contract](dashboard.md#ratified-analytical-experience) names the current design boundary.

## Connect a subscription to an organisation

The individual owns the subscription and its purchased organisation connections. An organisation has at most one ordinary funding subscriber at a time. Display who provides its plan, the available capabilities and whether the connection is included or an add-on.

The organisation owner may disconnect or replace the connection, and the funder may withdraw it. A replacement requires agreement from the incoming subscriber and an available connection. Funding conveys neither GitHub access nor diffdevil administrative authority. Organisational data and settings do not become personal property of the payer.

Multiple colleagues cannot stack their Pro subscriptions to expand the same organisation's private allowance. One subscription can fund several different organisations through add-ons. Each organisation retains its own configuration, administration and data scope.

An organisation administrator can manage continuity without seeing the funder's card, unrelated invoices or other organisations. The shared Works billing identity can have business invoice details even when the diffdevil subscriber signs in as a GitHub individual.

## Select repositories explicitly

Show actual App-granted repositories and explain which are selected for operation. Installation reach, enabled execution, history consent and plan eligibility are separate facts.

The management list distinguishes:

- enabled with history;
- enabled for labelling only;
- deliberately paused;
- inactive because the allowance is exhausted;
- unavailable because provider access was removed;
- retained or archived data after operation ended.

These are explanatory states, not necessarily one combined storage enum. A pause does not delete data; deletion is a separate action. Disabling diffdevil operation is not the same as uninstalling the App in GitHub.

Free pools three private repositories and ten public-history repositories across personal repositories and its one connected organisation. A public repository outside the history allocation can still receive labelling. Pro personal repositories have no count ceiling, and each Pro organisation has three private slots. Business's personal and connected organisation scopes have no repo-count ceiling.

An administrator can disable one selected repository to make space for another. Do not select an arbitrary replacement or retroactively count an idle installed repository because a PR appeared. Automatic Business setup still requires actual App reach and sufficient applicable entitlement.

## Configure a repository or coordinate an estate

Each repository can have its own valid policy. Trusted `.diffdevil.yml` values override App defaults; show both the selected configuration and effective origins.

Pro has one reusable default for personal repositories and one for each connected organisation. Its apply/difference prompt belongs in that repository's settings. There is no Pro global unsynchronised-repository inventory, bulk apply or shared-policy library.

Business adds named linked configurations, account-wide coordination, automatic eligible repository setup and delegated administration. Publishing a changed linked policy queues the affected history interpretation and eligible open-PR updates. Only work relevant to the changed settings is required: brief compactness does not imply full historical source reacquisition.

History collection, publication and delegated rights remain independent choices. A named policy does not silently enable them. Business automation may apply them only after the appropriate administrator explicitly chose that behaviour.

## Inspect history processing

Provide a scoped view of imports, enrichment and recalculation, with useful progress before the whole selected history is complete. Pro/Business administrators see their premium work; Free administrators still receive truthful basic-history/import standing.

Show the job's purpose, repository/range, completed coverage, remaining scope when known, actual policy basis and reason for delay. Distinguish user pause, fair scheduling, provider rate limit, partial evidence, recoverable failure and completion. Do not give an exact total or completion estimate the service has not established.

Live PR work has priority. Recent premium enrichment can lag while the base report remains useful. Older import and wide recalculation may be paused for sustained heavy use; a visible queue is not a guarantee that every account will eventually catch up.

Actions can request an import, pause/resume optional processing, retry a recoverable failure, refresh history, export or delete. Pausing an import does not disable live labels or cancel billing. Resumption preserves the same progress and does not count service recovery as new customer work.

Store long-running progress independently of an execution message's lifetime. Recheck current access, history consent, entitlement and deletion boundaries when continuing work. Pending jobs cannot revive deliberately removed history.

## Change the plan with one understandable bill

The subscription view shows its plan, tax-inclusive recurring total, cadence, funded-through/renewal date, price-protection standing, included organisation and add-ons. The shared billing service owns the authoritative quote, tax, credits, payment and entitlement result.

### Upgrade into a new full period

Credit unused value from the actual paid old components and start a new full period on the selected cadence. Existing add-ons move to that same new anchor, with their own unused old value credited and their new full period included. Do not leave separate renewal dates behind.

For an illustrative thirty-day month, after fifteen days of €9 Pro:

| Line | Amount |
| --- | ---: |
| New full Business month | €42.00 |
| Unused paid Pro credit | −€4.50 |
| **Due now** | **€37.50** |

The next renewal is €42 at the end of the new full month. This is not a same-anchor charge for only the remaining price difference.

With one existing monthly organisation add-on halfway through the old period, the new full Business-plus-add-on period is €51 and unused old Pro-plus-add-on credit is €9: **€42 is due now**, with the joined next renewal at €51.

Annual upgrades use actual discounted annual amounts and actual unused time. A recently purchased prorated add-on is credited from what was actually paid and the period it funded, not a fictional full-month charge.

### Add an organisation within the current period

Keep the current renewal date and charge only the remaining fraction of the add-on's monthly or annual price.

For an illustrative thirty-day month, ten days have passed and twenty remain. The €9 organisation add-on costs **€6 now**. At the unchanged renewal, Pro plus one add-on costs **€18/month** or Business plus one add-on costs **€51/month**.

An annual add-on uses €90 multiplied by the remaining fraction of the parent's annual period. It does not create a new anniversary. Add-ons always inherit the current parent tier, including when it changes.

The examples use simple synthetic periods. Actual calendar intervals, rounding, tax adjustments, existing protected prices and payment status come from the shared billing quote. Display the amount due now, credit, new/current period and next renewal together.

### Pending and failed changes

A checkout redirect is not payment proof. Pending, failed and completed payment/entitlement states remain distinguishable. Preserve the existing paid plan when an attempted upgrade fails. Reconcile an uncertain charge before retrying it; one request must not issue duplicate credit or payment.

## Downgrade, end renewal and preserve data

Downgrades and add-on removals take effect after the already-paid period. Show the effective date and consequences in advance, including organisation connections, selected repository allowances, retained administrator and premium processing.

When Business ends, eligible repositories can keep their current configuration as ordinary repository settings rather than losing it with the link. Linked updates, automatic setup and delegated administration no longer continue under a lower plan. Let the customer select what remains within the lower allowance rather than silently choosing repositories.

Use the shared Works distinction between automatic renewal, explicit cancellation intent, payment failure/grace and actual service end. A processing pause is not a billing pause. One customer's ending does not stop the shared multi-tenant application.

After premium entitlement ends, premium exploration and processing stop, but authorised export and deletion remain available. Eligible Free operation can continue. A frozen selected-state archive follows the disclosed shared service recovery policy; its actual deadline is visible. It is not an indefinite secretly retained dataset or an actively updating paid account.

Current GitHub authority still governs named analytical data. Billing history does not restore lost repository access. Provider removal and confirmed deletion remain separate from a financial downgrade, including their stricter privacy and restoration protections.

## Preview and Open Source grants

The one-time preview is tied to a stable GitHub account, not an installation. It captures up to 100 historical PRs for one authorised repository. The premium sample remains explorable but frozen. An interrupted capture resumes the same attempt; reinstalling does not mint another sample or ongoing premium updates.

An approved OSS repository receives its repository-scoped capabilities outside normal subscription allowances. It can be personal or organisational, even when the requester's ordinary organisation slot is used elsewhere. Display the benefit's source without treating it as a fourth hosted plan.

Privatisation stops public publication and revokes the OSS grant. An ordinary plan can continue only if it independently covers the repository. Revocation does not itself request deletion.

## Operator and communication boundaries

A separate private operator view joins aggregate service consumption and processing health with actual receipts, taxes, fees, refunds and service bills. Estimated per-account costs remain identified as estimates; shared costs are not deducted twice. This is not the customer Business audit or contributor-performance analytics.

Agent-supported operator access must be scoped and attributable. Ordinary reporting does not need raw payment instruments, provider secrets, source contents or unrestricted financial mutation. Reuse established shared billing and operations controls rather than duplicating them inside the product.

Product news and feedback invitations are optional and separate from necessary billing, security and service messages. Signing in with GitHub does not itself subscribe a person to marketing. The normal feedback/contact route remains usable without joining a newsletter.

## Availability

All capabilities here require implementation and qualification. The public documentation candidate does not change a subscription, collect data, deploy a worker, publish private history or activate a paid service.
