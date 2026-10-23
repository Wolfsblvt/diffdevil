# Managed App

> [!NOTE]
> **In development**
>
> The complete managed-service experience described here is being prepared for public use. The CLI, library, and Actions work independently of it.

The App gives selected GitHub repositories a memory and a place to run diffdevil together. Read PR activity and file history, explore the evidence behind a policy, or choose the checks, labels and replies the service operates. It uses the same engine and ordinary policy as the [CLI](../cli.md) and [GitHub Actions](../github-actions.md).

| Your next job | Guide |
| --- | --- |
| Read activity, follow a PR or explore a file | [Read repository history](read-history.md) |
| Choose capabilities or understand shared access and funding | [Plans and shared access](plans-and-sharing.md) |
| Connect repositories, configure operation or manage history | [Use the managed service](service.md) |
| Operate Community under your own registration and infrastructure | [Self-host the App](self-hosting.md) |

The analytical destinations are **Overview**, **Pull requests**, **History**, **Files**, **PR detail** and **File detail**. **Manage** holds settings and operation separately. A collaborator can read a connected repository's available capabilities under current GitHub access without administering the installation or buying a reader seat.

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

History retains repository names, relative file paths, numerical per-file measurements, evidence, versions, policy references, lifecycle facts and immutable comparison identities. This includes permitted measurements of excluded files, so a changed policy can reinterpret them. It does not retain source contents, patches, contributor-performance dimensions, PR prose or rendered comments. Names and paths are protected repository metadata; “minimized” does not mean anonymous.

A historical view states its covered period, collection gaps, population and policy basis. General file history uses one final recoverable comparison per merged PR; open-PR development stays separate. Unique PRs, analyzed revisions and execution attempts are different counts. Missing or unknown values do not disappear from the population, and successive PR snapshots are not summed as “code changed this month.” These are measurements of changes, not rankings of people.

Permitted contextual detail is fetched from GitHub on demand with current authorization. Lost access, deleted PRs, unavailable revisions, or an unrecoverable old policy can prevent reconstruction. Yesterday's numbers are not silently attached to today's head or filename list. [Security and data](../../help/security-and-data.md) explains the recovery ledger, opt-in history, export, retention, and leaving the service.

## Coexist with your other tools

The extension supplies a personal, local view while browsing GitHub. It does not require this App, enable repository automation, or create hosted history. [Lens Studio (the Playground)](../playground.md) is free, read-only learning and cannot inspect private PRs. Coding-agent knowledge likewise does not install or authorize an App.

A read-only Action can remain useful beside App-owned effects. Two independent writers should not compete over the same label group or comment lifecycle. [The managed-service migration](service.md#move-between-actions-and-the-app) prepares the destination, pauses only the overlapping writer, reconciles in-flight work, and verifies the replacement before declaring the cutover complete.

## Availability and release boundaries

Current source implements the six analytical destinations, the chart and file-cloud system, named history, imports, current-policy recalculation and Manage. Community and the separately composed premium experience have local qualification. The runtime has separate deployed backend and ingress evidence. Neither establishes general public admission, real collected history, ordinary live customer use or a purchasable subscription. [Direction](../../../DIRECTION.md) owns that implementation and deployment record.

The current analytical design is for ordinary desktop use in its dark shell. Whole-App light theme, phone, public analytics and operator views remain separate work. Do not infer those experiences from the public website's responsive layout or theme switch.

Installation and sign-in destinations must come from the [actual product](https://diffdevil.dev/app/) or your selected operator. A configured URL, reserved host or successful sign-in is not proof that adoption is open. Planned capabilities, prices and allowances are now selected in [Plans and shared access](plans-and-sharing.md); monthly import budgets and the complete production service still require qualification and publication. The [release guide](../../help/releases.md) keeps these outcomes separate from the published open tools and explains the independent App version.
