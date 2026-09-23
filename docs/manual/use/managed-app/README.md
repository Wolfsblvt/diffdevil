# Managed App

> [!NOTE]
> **In development**
>
> The complete managed-service experience described here is being prepared for public use. The CLI, library, and Actions work independently of it.

The managed App runs diffdevil for selected GitHub repositories. You choose the policy and enabled effects; the service acquires the comparison, evaluates it, applies the selected GitHub changes, and operates retries and recovery. It uses the same engine and ordinary policy as the [CLI](../cli.md) and [GitHub Actions](../github-actions.md), not a hosted-only rules language.

Choose [Use the managed service](service.md) when you want the service operated for you. Choose [Self-host the App](self-hosting.md) when your organization will own the GitHub App registration, Cloudflare resources, credentials, updates, and data lifecycle. Self-hosting is an intentional operating route, not a different or restricted analysis engine.

## What happens on a pull request

After installation and explicit repository enablement, a supported PR event starts an analysis of the current comparison. diffdevil reads trusted repository policy, measures the change, resolves the policy, and reconciles its selected effects. Proposed PR code is data; the App does not execute it. A PR-head configuration change cannot authorize privileged automatic writes.

A normal new setup selects `size@1`, manages its size labels, and maintains one native GitHub check summary. Missing declared label definitions are created without rewriting existing definition presentation. Unrelated labels are left alone. Comments and persistent history are separate, initially disabled choices.

The useful result is not merely an accepted webhook. It is a report for the intended base/head comparison, the effective policy, and observed GitHub state. When the correct label already exists, a verified no-op is success. Incomplete evidence can instead leave a decision unresolved or an effect held; the App does not replace that result with a convenient zero.

The check reports measurements, evidence, policy results, and effect observations for that revision. A new head does not inherit the previous head's success. A large size classification is not, by itself, a failed quality check, a risk score, or a merge veto. Installing diffdevil does not change branch protection or make its check required.

## Your policy remains yours

The effective policy combines the selected bundled preset, account or organization defaults, and the settings explicitly supplied by the repository. The conventional file is `.diffdevil.yml` at the repository root. There is no automatic discovery of an owner's `.github` repository, and Actions do not inherit dashboard settings.

Inspect both effective values and their origins before enabling writes. An explicit `presets: []` removes inherited preset selection; it is not treated as a request to restore size labeling. An invalid or unreadable policy is a failure to resolve, not an absent file that permits fallback defaults. [Configure policy](../../policy/configure.md) explains declaration replacement, path precedence, and the current limits of convenience settings.

The service exports an ordinary resolved policy so it can be used outside the App. Configuration export is distinct from exporting retained analysis history: the former answers how to run diffdevil; the latter records what was observed during a covered period.

## History without a repository archive

Persistent history adds quantitative activity, comparisons, distributions, and statistics across retained analyses. It is optional: ordinary labels, owned comments, native checks, and recovery do not require it. Installing the App is not history consent.

History retains aggregate and pathless per-file measurements, evidence, versions, policy references, and immutable comparison identities. It does not retain source, patches, filenames, contributor identities, PR prose, or rendered comments. The identifiers remain linkable to GitHub; “minimized” does not mean anonymous.

A historical view states its opt-in date, retention window, collection gaps, population, and analysis-time basis. Unique PRs, analyzed revisions, and execution attempts are different counts. Missing or unknown values do not disappear from the population, and successive PR snapshots are not summed as “code changed this month.” These are measurements of changes, not rankings of people.

Permitted contextual detail is fetched from GitHub on demand with current authorization. Lost access, deleted PRs, unavailable revisions, or an unrecoverable old policy can prevent reconstruction. Yesterday's numbers are not silently attached to today's head or filename list. [Security and data](../../help/security-and-data.md) explains the recovery ledger, opt-in history, export, retention, and leaving the service.

## Coexist with your other tools

The extension supplies a personal, local view while browsing GitHub. It does not require this App, enable repository automation, or create hosted history. The public Playground is read-only and cannot be used to inspect private PRs. Coding-agent knowledge likewise does not install or authorize an App.

A read-only Action can remain useful beside App-owned effects. Two independent writers should not compete over the same label group or comment lifecycle. [The managed-service migration](service.md#move-between-actions-and-the-app) prepares the destination, pauses only the overlapping writer, reconciles in-flight work, and verifies the replacement before declaring the cutover complete.

## Availability and release boundaries

The repository contains the Worker/Queue/D1 runtime, policy resolution, stable execution diagnostics, admission state, and operator seams. A deployed backend canary has exercised a contained repository lifecycle. Neither that canary nor source-level tests establish general public admission, a finished dashboard, full live history/export/offboarding, or a commercially available service. [Direction](../../../DIRECTION.md) owns the current implementation and deployment record.

The complete release experience includes account and organization administration, effective policy and origins, preview, explicit enablement, selected effects, optional history and statistics, export, deletion, and offboarding. Final dashboard language, layout, controls, routes, and interaction sequence are still being co-designed; this guide specifies the decisions and observable results rather than inventing screens.

Installation and dashboard destinations must come from the actual public product or your selected operator. A configured URL, reserved host, or successful sign-in is not proof that adoption is open. Exact prices, quotas, billing terms, complete production recovery qualification, and an alternate Docker adapter are not supplied by this guide. The [release guide](../../help/releases.md) keeps these outcomes separate from the published open tools.
