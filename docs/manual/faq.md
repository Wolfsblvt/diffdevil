---
title: FAQ
description: "What makes diffdevil different, which way to use it, and what happens to your changes and data."
---

# Frequently asked questions

Why another diff tool? Start here. The practical details are further down.

<nav class="faq-categories" aria-label="FAQ categories">
<a href="#faq-why">Why diffdevil?</a>
<a href="#faq-numbers">Understanding the numbers</a>
<a href="#faq-browser">Browser extension and Playground</a>
<a href="#faq-automation">Policies and automation</a>
<a href="#faq-managed">Managed App and your data</a>
<a href="#faq-help">Compatibility and help</a>
</nav>

<h2 id="faq-why">Why diffdevil?</h2>

<article class="faq-question" data-faq-id="why-diffdevil">

<a class="faq-id" href="#why-diffdevil" title="Copy link to this question">#why-diffdevil</a>

<details open>
<summary><h3>What would I use diffdevil for?</h3></summary>

<div class="faq-answer" id="why-diffdevil" tabindex="-1">

Use diffdevil when a change needs to become something more useful than a patch: a
replacement-aware line count, a file selection, a policy check, or a deliberate label or
comment. See those facts in GitHub, query them locally, or use them in scripts and CI. The same
engine does the counting everywhere. If you only need Git's raw additions and deletions, Git
already has you covered.

</div>

</details>

</article>

<article class="faq-question" data-faq-id="changed-vs-churn">

<a class="faq-id" href="#changed-vs-churn" title="Copy link to this question">#changed-vs-churn</a>

<details open>
<summary><h3>Why is Changed different from GitHub’s line counts?</h3></summary>

<div class="faq-answer" id="changed-vs-churn" tabindex="-1">

Raw churn counts additions and deletions separately. Changed counts replacements once within
each contiguous edit block: replacing three lines produces three modified lines, six lines of
raw churn, and three Changed lines. Delete three lines here and add three elsewhere, and Changed
is six; unrelated locations are not paired. Added-only, deleted-only and modified counts stay
visible. Neither number is broken. They answer different questions.

[Counting rules](../language/types-and-measurements.md)

</div>

</details>

</article>

<article class="faq-question" data-faq-id="beyond-size-labels">

<a class="faq-id" href="#beyond-size-labels" title="Copy link to this question">#beyond-size-labels</a>

<details>
<summary><h3>Why use diffdevil instead of a size-labeling Action?</h3></summary>

<div class="faq-answer" id="beyond-size-labels" tabindex="-1">

You may not need to. If your current labeler does exactly what you want, replacing it buys you
another migration. diffdevil earns its place when you want replacement-aware counting, explicit
uncertainty, your own metrics and scopes, or the same results in GitHub, local tools and agents.
Size labels are one useful outcome, not the boundary of the product. You can use the analysis
without adopting any label automation.

</div>

</details>

</article>

<article class="faq-question" data-faq-id="choose-a-surface">

<a class="faq-id" href="#choose-a-surface" title="Copy link to this question">#choose-a-surface</a>

<details>
<summary><h3>Should I use the CLI, GitHub Action, browser extension, or App?</h3></summary>

<div class="faq-answer" id="choose-a-surface" tabindex="-1">

Use the extension for a personal view of Changed inside GitHub, with no repository setup. Use
the CLI for local work and scripts, the TypeScript library to embed analysis, or Actions for
automation you configure in your own workflow. Choose the App for managed repository operation;
self-host it when you want to own that operation instead. The Playground lets you try the
results first. These are different ways to use one engine, not progressively less restricted
editions.

</div>

</details>

</article>

<article class="faq-question" data-faq-id="free-and-accounts">

<a class="faq-id" href="#free-and-accounts" title="Copy link to this question">#free-and-accounts</a>

<details>
<summary><h3>Is diffdevil free, and do I need an account?</h3></summary>

<div class="faq-answer" id="free-and-accounts" tabindex="-1">

The open CLI, library, GitHub Actions and browser extension need no diffdevil account or
subscription. The public Playground is free and account-free too. GitHub access still follows
GitHub's permissions. Managed hosting is optional: its allowance and paid conveniences pay for
operation, administration and history, not a better measurement engine. Running things yourself
can still have runner or hosting costs. Open source does not make somebody else's computers
free.

</div>

</details>

</article>

<article class="faq-question" data-faq-id="not-an-ai-reviewer">

<a class="faq-id" href="#not-an-ai-reviewer" title="Copy link to this question">#not-an-ai-reviewer</a>

<details>
<summary><h3>Is diffdevil an AI code reviewer?</h3></summary>

<div class="faq-answer" id="not-an-ai-reviewer" tabindex="-1">

No. diffdevil parses changes and evaluates declared rules deterministically; it does not ask a
model to review your code. It cannot establish correctness, risk, complexity or architectural
quality from a line count. A person or coding agent can use its facts while reviewing a change,
but that review is a separate job. No model or model-provider account is required to run
diffdevil.

</div>

</details>

</article>

<article class="faq-question" data-faq-id="coding-agents">

<a class="faq-id" href="#coding-agents" title="Copy link to this question">#coding-agents</a>

<details>
<summary><h3>Why would my coding agent use diffdevil?</h3></summary>

<div class="faq-answer" id="coding-agents" tabindex="-1">

A coding agent is an assistant that works on a code project. It can use diffdevil to measure
changes, select files and check policy instead of rebuilding those queries itself. It still has
to read your code. The Agent Skill teaches the available operations and evidence boundaries; the
compact agent output supplies facts, not a review verdict. You do not need an agent to use
diffdevil, and your agent's own data handling remains a separate consideration.

[Coding-agent setup](../setup/skill.md)

</div>

</details>

</article>

<article class="faq-question" data-faq-id="what-can-change">

<a class="faq-id" href="#what-can-change" title="Copy link to this question">#what-can-change</a>

<details>
<summary><h3>Can diffdevil change my code, labels, or comments?</h3></summary>

<div class="faq-answer" id="what-can-change" tabindex="-1">

 diffdevil does not rewrite your source code. Analysis and plans are read-only; deliberately
selected automation can manage configured labels, its own comments and App checks. Important
distinction: the root GitHub Action applies size labels by default. Use `actions/analyze` for
read-only Action analysis. Comments are opt-in. A token does not turn a read operation into a
writer, and a proposed plan does not mean anything was applied.

</div>

</details>

</article>

<h2 id="faq-numbers">Understanding the numbers</h2>

<article class="faq-question" data-faq-id="size-is-not-quality">

<a class="faq-id" href="#size-is-not-quality" title="Copy link to this question">#size-is-not-quality</a>

<details>
<summary><h3>Does a smaller Changed count mean a better or easier-to-review pull request?</h3></summary>

<div class="faq-answer" id="size-is-not-quality" tabindex="-1">

No. A one-line change can need more scrutiny than a large mechanical replacement. Changed
describes measured text changes, not correctness, importance, review effort or developer
productivity. A size band is your configured classification, not a grade handed down by the
tool. Use it for orientation or declared workflow rules. An exact number does not make an
unrelated judgment exact.

</div>

</details>

</article>

<article class="faq-question" data-faq-id="files-and-exclusions">

<a class="faq-id" href="#files-and-exclusions" title="Copy link to this question">#files-and-exclusions</a>

<details>
<summary><h3>Which files count, and can I exclude generated files or lockfiles?</h3></summary>

<div class="faq-answer" id="files-and-exclusions" tabindex="-1">

All files supplied by the selected diff are included by default, including lockfiles and
generated-looking paths. There is no hidden generated-file detector deciding what matters. You
can declare exclusions, include-only patterns, force-includes and named scopes; the report keeps
inclusion decisions inspectable. Binary files and submodules retain their file facts without
becoming invented text-line counts. The default local comparison covers tracked files, not
untracked files waiting to be added.

[Paths and scopes](../language/collections-and-scopes.md)

</div>

</details>

</article>

<article class="faq-question" data-faq-id="measurement-evidence">

<a class="faq-id" href="#measurement-evidence" title="Copy link to this question">#measurement-evidence</a>

<details>
<summary><h3>Why is a result bounded, unknown, or unmeasurable?</h3></summary>

<div class="faq-answer" id="measurement-evidence" tabindex="-1">

Because an honest answer sometimes is not one number. Bounded means a proven range. Unknown
means the available evidence cannot establish the result, though useful bounds may remain.
Unmeasurable means that measurement cannot be represented from the source, such as text-line
changes for a binary file. Missing patches or an incomplete file set must not become zero. A
configuration or network failure is a different problem, not another spelling of unknown.

</div>

</details>

</article>

<article class="faq-question" data-faq-id="rules-with-uncertainty">

<a class="faq-id" href="#rules-with-uncertainty" title="Copy link to this question">#rules-with-uncertainty</a>

<details>
<summary><h3>Can a rule match without an exact count?</h3></summary>

<div class="faq-answer" id="rules-with-uncertainty" tabindex="-1">

Yes, when every possible value gives the same answer. A proven range of 120–150 establishes that
a count is above 100. A range of 90–110 does not. The same principle can establish a size band
without inventing an exact number. Otherwise the decision remains unresolved and the policy's
explicit unknown handling applies. Missing evidence is not treated as a false condition that
quietly removes a label.

</div>

</details>

</article>

<article class="faq-question" data-faq-id="different-results">

<a class="faq-id" href="#different-results" title="Copy link to this question">#different-results</a>

<details>
<summary><h3>Why do I get different results in the CLI, extension, Action, or App?</h3></summary>

<div class="faq-answer" id="different-results" tabindex="-1">

First compare the inputs: base and head revisions, comparison mode, included paths, effective
policy, metric versions and available evidence. Local changes, a cached PR snapshot and a live
PR are not necessarily the same comparison. Personal extension overrides can also differ from
repository automation. The shared engine keeps meaning consistent; it cannot make different
inputs identical. A virtual band, a proposed label and an observed GitHub label are separate
facts too.

[Inspect effective policy](../integration/presets-and-shortcuts.md#configuration-layering)

</div>

</details>

</article>

<h2 id="faq-browser">Browser extension and Playground</h2>

<aside class="faq-note" role="note" id="extension-status">
<p><strong>In development.</strong> The browser extension is in development. The answers here describe its selected release experience, not a current Chrome Web Store listing. The Playground is independent.</p>
</aside>

<article class="faq-question" data-faq-id="extension-without-repo-setup" data-faq-note="extension-status" aria-describedby="extension-status">

<a class="faq-id" href="#extension-without-repo-setup" title="Copy link to this question">#extension-without-repo-setup</a>

<details>
<summary><h3>Can I use the extension on repositories I don’t own?</h3></summary>

<div class="faq-answer" id="extension-without-repo-setup" tabindex="-1">

<span class="faq-standing">In development</span>

Yes. The extension changes your view of a pull request, not the repository. You need access to
read the PR, but no repository ownership, workflow, App installation or write permission.
Personal policy supplies a classification even when the repository has no size labels at all.
Private repositories still require your existing GitHub access; the extension does not grant
access or bypass organization restrictions.

</div>

</details>

</article>

<article class="faq-question" data-faq-id="extension-data" data-faq-note="extension-status" aria-describedby="extension-status">

<a class="faq-id" href="#extension-data" title="Copy link to this question">#extension-data</a>

<details>
<summary><h3>What does the browser extension read, send, and store?</h3></summary>

<div class="faq-answer" id="extension-data" tabindex="-1">

<span class="faq-standing">In development</span>

It reads the GitHub comparison and applicable base-revision policy, then analyzes them locally.
Raw patches stay in memory and are not saved in its persistent caches. Cached reports can
contain paths and numeric facts; cached policy contains configuration. Settings and repository
overrides are stored separately. Compact preferences may sync through your browser account.
Default operation has no Wolfsblvt Works backend, telemetry or patch upload. “Local analysis”
does not mean “nothing is stored” or “browser sync stops existing.”

</div>

</details>

</article>

<article class="faq-question" data-faq-id="virtual-labels" data-faq-note="extension-status" aria-describedby="extension-status">

<a class="faq-id" href="#virtual-labels" title="Copy link to this question">#virtual-labels</a>

<details>
<summary><h3>Does the extension’s size badge change GitHub labels?</h3></summary>

<div class="faq-answer" id="virtual-labels" tabindex="-1">

<span class="faq-standing">In development</span>

No. The badge is a virtual result from the selected policy, even on a repository with no label
automation. An observed GitHub label is shown as a separate fact. Where the native handoff is
available, the extension opens GitHub's own label picker with the relevant search; you make the
change there. It does not create label definitions, submit labels automatically or trigger App
analysis just because you opened a page.

</div>

</details>

</article>

<article class="faq-question" data-faq-id="extension-policy" data-faq-note="extension-status" aria-describedby="extension-status">

<a class="faq-id" href="#extension-policy" title="Copy link to this question">#extension-policy</a>

<details>
<summary><h3>Which settings win: mine or the repository’s?</h3></summary>

<div class="faq-answer" id="extension-policy" tabindex="-1">

<span class="faq-standing">In development</span>

In the default composed mode, personal global defaults come first, the repository's
`.diffdevil.yml` from the exact PR base revision comes next, and explicit personal overrides for
that repository win last. Effective settings retain their origins. You can deliberately choose
personal-only analysis instead. An invalid repository file is reported as invalid, not quietly
treated as missing. Display preferences remain personal; a local policy result never silently
becomes the App's result.

</div>

</details>

</article>

<article class="faq-question" data-faq-id="supported-browsers" data-faq-note="extension-status" aria-describedby="extension-status">

<a class="faq-id" href="#supported-browsers" title="Copy link to this question">#supported-browsers</a>

<details>
<summary><h3>Which browsers does diffdevil for GitHub support?</h3></summary>

<div class="faq-answer" id="supported-browsers" tabindex="-1">

<span class="faq-standing">In development</span>

The first supported target is desktop Chrome on GitHub.com. That does not automatically promise
Firefox, Safari, mobile browsers, GitHub Enterprise Server or every Chromium-based browser.
Browser support includes the actual GitHub integration and settings experience, not just
accepting an extension manifest. The extension's release information names qualified targets; a
Store listing is only linked when one actually exists.

</div>

</details>

</article>

<article class="faq-question" data-faq-id="playground">

<a class="faq-id" href="#playground" title="Copy link to this question">#playground</a>

<details>
<summary><h3>What can I try in the Playground without installing anything?</h3></summary>

<div class="faq-answer" id="playground" tabindex="-1">

Analyze a public GitHub pull request or open a curated example, adjust policy, inspect the
explanation and compare human, agent and data views. Preview proposed GitHub effects without
applying them, then take useful configuration or commands into your own setup. Frozen examples
preserve a reproducible snapshot; refreshing a live PR can change the result. No account or
repository installation is required. Private PRs and personal access tokens do not belong in the
public Playground.

[Try the Playground](https://diffdevil.dev/playground/)

</div>

</details>

</article>

<h2 id="faq-automation">Policies and automation</h2>

<article class="faq-question" data-faq-id="checks-and-merge-blocking">

<a class="faq-id" href="#checks-and-merge-blocking" title="Copy link to this question">#checks-and-merge-blocking</a>

<details>
<summary><h3>Will diffdevil fail my build or block a merge?</h3></summary>

<div class="faq-answer" id="checks-and-merge-blocking" tabindex="-1">

Not simply because a change is large. The default size policy labels PRs; it does not make XL a
failing quality judgment. CLI checks communicate true, false, failed operations and unresolved
evidence distinctly. Action analysis exposes a decision without automatically failing on false
or unknown. You choose how your workflow uses that result, and repository rules decide which
checks block merging. An App check summary is not an automatic instruction to reject a PR.

</div>

</details>

</article>

<article class="faq-question" data-faq-id="action-permissions">

<a class="faq-id" href="#action-permissions" title="Copy link to this question">#action-permissions</a>

<details>
<summary><h3>What permissions does the GitHub Action need?</h3></summary>

<div class="faq-answer" id="action-permissions" tabindex="-1">

The default API-only size-label workflow needs `pull-requests: write`, with no checkout or
repository-content read. Loading a trusted base configuration additionally needs `contents:
read`. Read-only analysis does not need label-writing permission. The ordinary workflow token is
supported; a personal token is not a setup prerequisite. A separate `policy-token` can isolate
trusted configuration reads from the credential used for PR acquisition and effects.
Organization and fork restrictions still apply.

[Action permissions](../integration/github-actions.md#minimal-complete-workflow)

</div>

</details>

</article>

<article class="faq-question" data-faq-id="fork-pull-requests">

<a class="faq-id" href="#fork-pull-requests" title="Copy link to this question">#fork-pull-requests</a>

<details>
<summary><h3>Can I use it on fork pull requests without trusting the fork?</h3></summary>

<div class="faq-answer" id="fork-pull-requests" tabindex="-1">

Yes, with the documented trust separation: inspect the fork's changes as data, but obtain
write-authorizing policy from the trusted base or an explicitly pinned source. Keep privileged
automation separate from executing PR-head scripts, builds or configuration. The default
API-only workflow needs no checkout. This is not a blanket guarantee for an arbitrary workflow
using `pull_request_target`; your event, token restrictions and surrounding steps still matter.

[Fork workflow guidance](../integration/github-actions.md)

</div>

</details>

</article>

<article class="faq-question" data-faq-id="no-language-required">

<a class="faq-id" href="#no-language-required" title="Copy link to this question">#no-language-required</a>

<details>
<summary><h3>Do I have to learn a new language to use diffdevil?</h3></summary>

<div class="faq-answer" id="no-language-required" tabindex="-1">

No. Presets and ordinary flags or Action inputs cover size labels, common measurements, path
selections and threshold checks. The detail expression language is there when you need custom
formulas or richer policy. Both routes use the same semantics; starting simply does not trap you
in a smaller engine. You should not need a compiler course to ask how many lines changed.

</div>

</details>

</article>

<article class="faq-question" data-faq-id="custom-policy">

<a class="faq-id" href="#custom-policy" title="Copy link to this question">#custom-policy</a>

<details>
<summary><h3>Can I define my own metrics, scopes, size bands, and labels?</h3></summary>

<div class="faq-answer" id="custom-policy" tabindex="-1">

Yes. Define numeric metrics, named file scopes, thresholds, bands, rules and optional label or
comment effects in ordinary YAML or JSON policy. You can replace the size preset rather than
being stuck with its thresholds or label names. Basic controls and advanced expressions use the
same compiler, with validation and inspectable origins. This is configurable diff policy, not
arbitrary JavaScript, shell execution or a replacement for your entire CI system.

[Write a policy](../language/policies-and-bands.md)

</div>

</details>

</article>

<article class="faq-question" data-faq-id="existing-labels-and-comments">

<a class="faq-id" href="#existing-labels-and-comments" title="Copy link to this question">#existing-labels-and-comments</a>

<details>
<summary><h3>What happens to labels and comments that are already there?</h3></summary>

<div class="faq-answer" id="existing-labels-and-comments" tabindex="-1">

Unrelated labels and comments stay alone. diffdevil reconciles only declared managed labels and
comments it can identify as its own. Default label-definition handling creates missing
definitions without overwriting existing colors or descriptions; explicit synchronization is a
different operation. Comments are off unless configured. Manually changing a managed assignment
can be reconciled again on the next selected event. A request acknowledgment is not proof of
success: application results retain readback and partial failures.

</div>

</details>

</article>

<h2 id="faq-managed">Managed App and your data</h2>

<aside class="faq-note" role="note" id="app-status">
<p><strong>In development.</strong> The complete managed service, dashboard and history experience is in development. These answers describe that release, not a currently available commercial offer.</p>
</aside>

<article class="faq-question" data-faq-id="why-managed" data-faq-note="app-status" aria-describedby="app-status">

<a class="faq-id" href="#why-managed" title="Copy link to this question">#why-managed</a>

<details>
<summary><h3>Why use the managed App when the CLI and Actions are free?</h3></summary>

<div class="faq-answer" id="why-managed" tabindex="-1">

<span class="faq-standing">In development</span>

You are paying for someone else to operate it, not for a secret better engine. The App runs the
repository integration and adds shared administration, effective configuration and optional
history. You do not assemble and maintain a workflow and its operational pieces for each
repository. If your existing Action setup already suits you, keep it. Managed hosting is a
convenience, not the entrance fee to the useful product.

</div>

</details>

</article>

<article class="faq-question" data-faq-id="app-data" data-faq-note="app-status" aria-describedby="app-status">

<a class="faq-id" href="#app-data" title="Copy link to this question">#app-data</a>

<details>
<summary><h3>What does the App read and store from my repositories?</h3></summary>

<div class="faq-answer" id="app-data" tabindex="-1">

<span class="faq-standing">In development</span>

The App reads the comparison and trusted policy needed for analysis, processing source and
contextual details transiently. It keeps minimal operational records, necessary
account/configuration state and, only when enabled, numeric history. History excludes patches,
source, file paths, authors and PR discussion. Administrator-supplied configuration can contain
path patterns or templates, so “we never store paths or text” would be false. Numeric repository
and PR references remain linkable to GitHub; minimized does not mean anonymous.

[Data details](../PRIVACY-AND-DATA.md)

</div>

</details>

</article>

<article class="faq-question" data-faq-id="app-history" data-faq-note="app-status" aria-describedby="app-status">

<a class="faq-id" href="#app-history" title="Copy link to this question">#app-history</a>

<details>
<summary><h3>Does the App keep analysis history by default?</h3></summary>

<div class="faq-answer" id="app-history" tabindex="-1">

<span class="faq-standing">In development</span>

No. Installing the App does not enable persistent analysis history. An administrator explicitly
opts in; ordinary automation remains available without it. The separate seven-day operational
ledger supports retries and recovery. The selected hosted history window is thirty rolling days
on the free allowance, with no automatic age expiry for active paid history, subject to deletion
and disclosed limits. That is not unlimited storage, and enabling history later does not
recreate analyses that were never retained.

</div>

</details>

</article>

<article class="faq-question" data-faq-id="export-and-delete" data-faq-note="app-status" aria-describedby="app-status">

<a class="faq-id" href="#export-and-delete" title="Copy link to this question">#export-and-delete</a>

<details>
<summary><h3>Can I export or delete my data?</h3></summary>

<div class="faq-answer" id="export-and-delete" tabindex="-1">

<span class="faq-standing">In development</span>

Yes. You can export retained numeric history and request its deletion; disabling future
collection and deleting existing records are distinct controls. History export preserves
measurement evidence, versions and coverage, not a copy of your repository.
Configuration/account exports are separate. Expired or never-collected history cannot be
restored by upgrading a plan. Deletion also covers derived history projections and follows the
disclosed backup-retention boundary; it is not a promise of instantaneous erasure from every
provider backup.

[Export and deletion](../PRIVACY-AND-DATA.md#retention-deletion-and-recovery)

</div>

</details>

</article>

<article class="faq-question" data-faq-id="uninstalling" data-faq-note="app-status" aria-describedby="app-status">

<a class="faq-id" href="#uninstalling" title="Copy link to this question">#uninstalling</a>

<details>
<summary><h3>What happens when I uninstall the App?</h3></summary>

<div class="faq-answer" id="uninstalling" tabindex="-1">

<span class="faq-standing">In development</span>

New repository work and history collection stop. Previously applied GitHub labels and comments
are not automatically undone. Retained numeric history follows a thirty-day offboarding grace:
only independently authenticated administrators who already held that role can access its
limited export/delete path, without reacquiring GitHub context. Account closure skips that grace
and begins deletion. Restoring an installation does not silently resume history collection, and
uninstalling is not permission to keep fetching repository data.

</div>

</details>

</article>

<article class="faq-question" data-faq-id="self-hosting" data-faq-note="app-status" aria-describedby="app-status">

<a class="faq-id" href="#self-hosting" title="Copy link to this question">#self-hosting</a>

<details>
<summary><h3>Can I self-host the App?</h3></summary>

<div class="faq-answer" id="self-hosting" tabindex="-1">

<span class="faq-standing">In development</span>

Yes. Self-hosting is an intentional route for controlling deployment, credentials and operation
yourself. The supported application route uses Cloudflare Workers, Queues and D1; it is not a
generic Docker or VPS installer. You own the GitHub App registration, service configuration,
upgrades and operational responsibilities. Application source is AGPL-3.0-only, while the
reusable engine remains MIT. Self-hosting changes who operates the service, not the meaning of
its measurements.

[Self-hosting guide](../../apps/github-app/README.md)

</div>

</details>

</article>

<h2 id="faq-help">Compatibility and help</h2>

<article class="faq-question" data-faq-id="non-javascript-projects">

<a class="faq-id" href="#non-javascript-projects" title="Copy link to this question">#non-javascript-projects</a>

<details>
<summary><h3>Can I use diffdevil in a non-JavaScript project?</h3></summary>

<div class="faq-answer" id="non-javascript-projects" tabindex="-1">

Yes. diffdevil analyzes Git changes, not JavaScript projects. C#, Python, Rust, documentation
and other repositories do not need a new `package.json` just to run the CLI. The tool still
needs its own supported runtime: Node.js 22 or newer, plus Git for local Git comparisons. Those
are requirements of the executable, not demands that you change your project's language or build
system.

</div>

</details>

</article>

<article class="faq-question" data-faq-id="offline">

<a class="faq-id" href="#offline" title="Copy link to this question">#offline</a>

<details>
<summary><h3>Can I use diffdevil offline?</h3></summary>

<div class="faq-answer" id="offline" tabindex="-1">

Yes, once the local tool and its dependencies are installed. Available Git objects, unified
diffs and saved reports can be analyzed without network access. Initial installation, fetching
missing revisions, GitHub API acquisition, managed operation and online update checks need their
corresponding network routes. Offline does not mean a remote branch becomes magically current.
Keep the report's comparison identity when using a saved result.

</div>

</details>

</article>

<article class="faq-question" data-faq-id="other-git-hosts">

<a class="faq-id" href="#other-git-hosts" title="Copy link to this question">#other-git-hosts</a>

<details>
<summary><h3>Can I use it with GitLab or other Git hosting services?</h3></summary>

<div class="faq-answer" id="other-git-hosts" tabindex="-1">

Local Git and unified-diff analysis do not depend on GitHub, so you can use the CLI or library
with other Git hosts and CI systems. Native PR acquisition, label/comment automation, the App
and the browser extension target their documented GitHub surface. They do not automatically
become GitLab, Bitbucket or enterprise-host integrations. Portable analysis and a native
provider adapter are different capabilities.

</div>

</details>

</article>

<article class="faq-question" data-faq-id="private-repositories">

<a class="faq-id" href="#private-repositories" title="Copy link to this question">#private-repositories</a>

<details>
<summary><h3>Can I use diffdevil with private repositories?</h3></summary>

<div class="faq-answer" id="private-repositories" tabindex="-1">

Yes, through a surface with the necessary access. Local tools can analyze your available private
checkout or diff. GitHub acquisition and repository automation require appropriate credentials
and grants. The extension uses comparisons you can already access; it does not require ownership
or grant new access. The public Playground accepts public PRs only. Private-data handling also
depends on where you run the tool and which reports you share with workflows or external coding
agents.

</div>

</details>

</article>

<article class="faq-question" data-faq-id="machine-output">

<a class="faq-id" href="#machine-output" title="Copy link to this question">#machine-output</a>

<details>
<summary><h3>Which output should scripts and integrations rely on?</h3></summary>

<div class="faq-answer" id="machine-output" tabindex="-1">

Use versioned JSON or JSONL for structured integration, exact scalar output for a number, and
line or NUL-delimited output for determined path selections. Preserve evidence status rather
than turning unknown into zero. The compact agent format is for model context; human output is
for reading, not scraping. Reports, queries and plans have different envelopes, and command exit
meanings differ. A prettier terminal layout should not break your automation.

[Output reference](../integration/cli.md)

</div>

</details>

</article>

<article class="faq-question" data-faq-id="help-and-feedback">

<a class="faq-id" href="#help-and-feedback" title="Copy link to this question">#help-and-feedback</a>

<details>
<summary><h3>Where can I get help, report a bug, or suggest a feature?</h3></summary>

<div class="faq-answer" id="help-and-feedback" tabindex="-1">

Use the relevant troubleshooting guidance for a setup problem, or open a GitHub issue for a
reproducible bug or feature suggestion. Include the version, surface, expected behavior and a
small safe reproduction when possible. Error codes and comparison details are useful; tokens and
private patches are not. Support here does not come with an invented response-time guarantee.

[GitHub Issues](https://github.com/Wolfsblvt/diffdevil/issues)

</div>

</details>

</article>

<article class="faq-question" data-faq-id="report-a-vulnerability">

<a class="faq-id" href="#report-a-vulnerability" title="Copy link to this question">#report-a-vulnerability</a>

<details>
<summary><h3>How do I report a security vulnerability?</h3></summary>

<div class="faq-answer" id="report-a-vulnerability" tabindex="-1">

Use GitHub's private vulnerability-reporting route for this repository. Include the affected
version, a reproducible description and the security consequence. Keep exploit details,
credentials and private repository data out of public issues while the report is assessed. The
security policy owns the reporting process; it does not promise a response deadline or an
unsupported maintenance window.

[Report privately](https://github.com/Wolfsblvt/diffdevil/security/advisories)

</div>

</details>

</article>
