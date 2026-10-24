---
title: FAQ
description: "Answers about Changed, the browser extension, the App, plans, permissions, and what happens to your data."
---

# Frequently asked questions

Why another diff tool? Start here. Then choose how to use it and check what it reads, writes, and remembers.

<aside class="faq-note" role="note" id="product-status">
<p><strong>In development.</strong> The extension and complete App are implemented in source; private previews and earlier deployed services do not establish public availability. Chrome Web Store distribution, open App installation, and paid access have separate launch steps. These answers describe the selected experience. Check <a href="https://diffdevil.dev/install/">Install</a> for current access.</p>
</aside>

<nav class="faq-categories" aria-label="FAQ categories">
<a href="#faq-why">Why diffdevil?</a>
<a href="#faq-numbers">Understanding the numbers</a>
<a href="#faq-browser">Browser extension and Lens Studio</a>
<a href="#faq-local">Local use and policy</a>
<a href="#faq-automation">GitHub Actions, labels, and comments</a>
<a href="#faq-managed">Managed App and self-hosting</a>
<a href="#faq-privacy">Privacy, history, and data</a>
<a href="#faq-agents">Coding agents, releases, and the project</a>
</nav>

<h2 id="faq-why">Why diffdevil?</h2>

<article class="faq-question" data-faq-id="changed-vs-churn">

<a class="faq-id" href="#changed-vs-churn" title="Copy link to this question">#changed-vs-churn</a>

<details open>
<summary><h3>GitHub already shows additions and deletions.</h3></summary>

<div class="faq-answer" id="changed-vs-churn" tabindex="-1">

GitHub’s diffstat counts every returned file and adds additions and deletions together. That often
makes a replacement look twice as large, and it cannot express which files your question actually
cares about. diffdevil adds replacement-aware **Changed**, explicit scopes and exclusions, and
policy you can reuse.

</div>

</details>

</article>

<article class="faq-question" data-faq-id="beyond-size-labels">

<a class="faq-id" href="#beyond-size-labels" title="Copy link to this question">#beyond-size-labels</a>

<details open>
<summary><h3>When is diffdevil worth using?</h3></summary>

<div class="faq-answer" id="beyond-size-labels" tabindex="-1">

A size labeler is totally fine when you only want a rough size. A local script is enough for one
local check.

diffdevil earns its place when the same logic should work everywhere: locally, in scripts, in GitHub
Actions, in the browser extension, in the managed App, or through a coding agent. You define the
question once instead of rebuilding slightly different versions of it.

</div>

</details>

</article>

<article class="faq-question" data-faq-id="code-review">

<a class="faq-id" href="#code-review" title="Copy link to this question">#code-review</a>

<details>
<summary><h3>Does diffdevil replace code review?</h3></summary>

<div class="faq-answer" id="code-review" tabindex="-1">

No. diffdevil calculates numbers from a diff and your configuration, and it can apply configured
labels or comments. It does not inspect the code for correctness, design, risk, or maintainability
like a code-review tool does.

</div>

</details>

</article>

<h2 id="faq-numbers">Understanding the numbers</h2>

<article class="faq-question" data-faq-id="changed-makes-sense">

<a class="faq-id" href="#changed-makes-sense" title="Copy link to this question">#changed-makes-sense</a>

<details>
<summary><h3>Why does Changed make more sense?</h3></summary>

<div class="faq-answer" id="changed-makes-sense" tabindex="-1">

For most people asking how much a change changed, **Changed** is the more useful number. Replacing
three lines is three modified lines, not six unrelated additions and deletions.

diffdevil still keeps raw additions, deletions, and churn available. Changed is primary because it
usually matches how humans reason about edits.

</div>

</details>

</article>

<article class="faq-question" data-faq-id="files-and-exclusions">

<a class="faq-id" href="#files-and-exclusions" title="Copy link to this question">#files-and-exclusions</a>

<details>
<summary><h3>Why not ignore lockfiles and generated files automatically?</h3></summary>

<div class="faq-answer" id="files-and-exclusions" tabindex="-1">

Because diffdevil cannot know which files matter to your question. A lockfile may be background
noise in one policy and the main subject in another.

Explicit exclusions and named scopes let you ask a narrower question without pretending those files
were absent from the change.

</div>

</details>

</article>

<article class="faq-question" data-faq-id="measurement-evidence" data-faq-note="product-status" aria-describedby="product-status">

<a class="faq-id" href="#measurement-evidence" title="Copy link to this question">#measurement-evidence</a>

<details>
<summary><h3>Why is a result bounded or unknown?</h3></summary>

<div class="faq-answer" id="measurement-evidence" tabindex="-1">

Because the available evidence may not prove an exact answer. A range of 60–70 still proves “below 100”; a range
of 90–110 does not. diffdevil preserves that distinction instead of substituting zero or a guess.

In the extension, large PRs can start partially measured. Open a file or choose **Analyze remaining
files** to request more evidence. GitHub may still withhold a patch; the result keeps that limitation
visible. [How evidence affects a result](understand/evidence-and-uncertainty.md).

</div>

</details>

</article>

<h2 id="faq-browser">Browser extension and Lens Studio</h2>

<article class="faq-question" data-faq-id="playground-or-extension" data-faq-note="product-status" aria-describedby="product-status">

<a class="faq-id" href="#playground-or-extension" title="Copy link to this question">#playground-or-extension</a>

<details>
<summary><h3>Lens Studio or browser extension?</h3></summary>

<div class="faq-answer" id="playground-or-extension" tabindex="-1">

Use **Lens Studio**, the public playground, to learn without installing anything or signing in.
Frozen examples and public GitHub PRs let you explore measurements, test policy, and export reusable
inputs. It has no private-PR mode, account history, or repository writes.

Use **diffdevil for GitHub**, the browser extension, for everyday PR reading with Changed and your
policy inside GitHub. Neither requires the App. [Explore the learning surface](use/playground.md).

</div>

</details>

</article>

<article class="faq-question" data-faq-id="extension-without-repo-setup" data-faq-note="product-status" aria-describedby="product-status">

<a class="faq-id" href="#extension-without-repo-setup" title="Copy link to this question">#extension-without-repo-setup</a>

<details>
<summary><h3>Can I use the extension without repository setup?</h3></summary>

<div class="faq-answer" id="extension-without-repo-setup" tabindex="-1">

Yes. The extension changes your view, not the repository. It needs no workflow, App installation,
repository ownership, or write permission.

You still need normal GitHub access to the pull request. A virtual band shown by the extension is
your local result. It does not create labels, apply the band, or post comments. Its optional
label-picker handoff still leaves the actual selection to you in GitHub.

</div>

</details>

</article>

<article class="faq-question" data-faq-id="extension-private-prs" data-faq-note="product-status" aria-describedby="product-status">

<a class="faq-id" href="#extension-private-prs" title="Copy link to this question">#extension-private-prs</a>

<details>
<summary><h3>Can the extension read private pull requests?</h3></summary>

<div class="faq-answer" id="extension-private-prs" tabindex="-1">

Yes, when your signed-in GitHub session can read them. It uses that session’s existing access and
analyzes the patches in your browser. You do not supply a personal access token or create a
diffdevil account.

Its permissions cover storage and GitHub.com/API access, not all websites or general browsing
history. The current extension targets Chrome on GitHub.com; Firefox, GitHub Enterprise hosts, and
incognito are not supported. [Extension access and setup](use/browser-extension.md).

</div>

</details>

</article>

<article class="faq-question" data-faq-id="extension-local-data" data-faq-note="product-status" aria-describedby="product-status">

<a class="faq-id" href="#extension-local-data" title="Copy link to this question">#extension-local-data</a>

<details>
<summary><h3>What does the extension save?</h3></summary>

<div class="faq-answer" id="extension-local-data" tabindex="-1">

It keeps a bounded local cache of reports, filenames, revisions, evidence, and trusted policy,
including referenced templates. Raw patches stay in memory. Cached private metadata is accessible
to someone with access to your browser profile. Small display and guided-policy preferences can
use Chrome sync; advanced policy and repository overrides stay local.

Use scoped clearing controls or reset all extension data. Pausing keeps data; clearing does not
resume work, and open pages may display results until refreshed. Uninstalling leaves exported files.
[Storage and clearing controls](use/browser-extension.md).

</div>

</details>

</article>

<article class="faq-question" data-faq-id="extension-policy" data-faq-note="product-status" aria-describedby="product-status">

<a class="faq-id" href="#extension-policy" title="Copy link to this question">#extension-policy</a>

<details>
<summary><h3>Whose policy does the extension use?</h3></summary>

<div class="faq-answer" id="extension-policy" tabindex="-1">

You choose. **Composed** layers personal defaults, trusted repository policy, then explicit personal
overrides for that repository. **Repository** uses repository policy, falling back to personal
defaults only when it is absent. **Personal only** skips repository policy while keeping your
personal repository overrides.

Repository policy and its templates come from the trusted base revision, never the PR head. An
unreadable or invalid policy remains a visible failure, not a successful fallback.
[Policy modes and precedence](use/browser-extension.md).

</div>

</details>

</article>

<article class="faq-question" data-faq-id="different-results" data-faq-note="product-status" aria-describedby="product-status">

<a class="faq-id" href="#different-results" title="Copy link to this question">#different-results</a>

<details>
<summary><h3>Why do different routes show different results?</h3></summary>

<div class="faq-answer" id="different-results" tabindex="-1">

They can use different revisions, evidence, selected files, or effective policy. The extension
evaluates locally with your chosen policy mode; it does not currently fetch authenticated App
reports. Actions do not silently inherit App account defaults.

When the comparison, evidence, effective policy, and semantic versions match, the result should
match. Different inputs explain a difference; they do not excuse identical inputs disagreeing.

</div>

</details>

</article>

<h2 id="faq-local">Local use and policy</h2>

<article class="faq-question" data-faq-id="non-javascript-projects">

<a class="faq-id" href="#non-javascript-projects" title="Copy link to this question">#non-javascript-projects</a>

<details>
<summary><h3>Is diffdevil tied to JavaScript or GitHub?</h3></summary>

<div class="faq-answer" id="non-javascript-projects" tabindex="-1">

No. The CLI needs Node.js, but the repository can be C#, Rust, Python, or anything else. You do not
need to add a `package.json` just to analyze a project.

Local Git, supplied diffs, and saved reports work without GitHub. The extension, App, and built-in
provider automation are the GitHub-specific surfaces.

</div>

</details>

</article>

<article class="faq-question" data-faq-id="no-language-required">

<a class="faq-id" href="#no-language-required" title="Copy link to this question">#no-language-required</a>

<details>
<summary><h3>How much configuration do I need to learn?</h3></summary>

<div class="faq-answer" id="no-language-required" tabindex="-1">

None for ordinary use. Presets and shortcuts cover common counts, paths, thresholds, and size labels
without a policy file or expression language.

Add configuration only when you have something to change. Use **detail** when a custom formula or
selection actually benefits from an expression.

</div>

</details>

</article>

<h2 id="faq-automation">GitHub Actions, labels, and comments</h2>

<article class="faq-question" data-faq-id="automation-overlap">

<a class="faq-id" href="#automation-overlap" title="Copy link to this question">#automation-overlap</a>

<details>
<summary><h3>Will diffdevil interfere with existing automation?</h3></summary>

<div class="faq-answer" id="automation-overlap" tabindex="-1">

Not by default. The size preset manages only its declared label group and posts no comment.
Read-only analysis can coexist with other automation.

The real conflict is two writers managing the same labels or comment lifecycle. Give overlapping
effects one owner; keep unrelated jobs and checks.

</div>

</details>

</article>

<article class="faq-question" data-faq-id="trusted-policy">

<a class="faq-id" href="#trusted-policy" title="Copy link to this question">#trusted-policy</a>

<details>
<summary><h3>Why doesn’t a policy change in my PR affect its labels immediately?</h3></summary>

<div class="faq-answer" id="trusted-policy" tabindex="-1">

Because a pull request must not be able to rewrite the rules controlling privileged effects on
itself.

Automatic writes use policy from a trusted base revision or an explicitly selected immutable source.
The PR-head policy can still be previewed, but previewing it does not authorize it.

</div>

</details>

</article>

<h2 id="faq-managed">Managed App and self-hosting</h2>

<article class="faq-question" data-faq-id="why-managed" data-faq-note="product-status" aria-describedby="product-status">

<a class="faq-id" href="#why-managed" title="Copy link to this question">#why-managed</a>

<details>
<summary><h3>Why use the managed App?</h3></summary>

<div class="faq-answer" id="why-managed" tabindex="-1">

For managed PR automation and repository memory. The App uses the same engine while adding six
analytical destinations: **Overview, Pull requests, History, Files, PR detail, and File detail**.
They connect repository patterns to the changes and files behind them.

**Manage** handles repository operation, processing, effective policy, funding, and account controls.
Installation reach, automated effects, and history collection are separate choices; installing
alone does not opt a repository into history. Trusted `.diffdevil.yml` values override App defaults.
Use Actions when you prefer to own the workflow and runner.
[Meet the App](use/managed-app/README.md).

</div>

</details>

</article>

<article class="faq-question" data-faq-id="app-plans" data-faq-note="product-status" aria-describedby="product-status">

<a class="faq-id" href="#app-plans" title="Copy link to this question">#app-plans</a>

<details>
<summary><h3>What changes between Free, Pro, and Business?</h3></summary>

<div class="faq-answer" id="app-plans" tabindex="-1">

**Free** provides managed PR automation and useful basic PR/repository history. **Pro** adds rich
historical file exploration, Turnover, co-change, and reusable defaults. **Business** adds shared
linked policies, coordinated changes, automatic eligible setup, delegated administration, and audit.

Plans change App depth, coordination, and repository allowances. They do not change what Changed
means or charge per pull request. Free history can retain the base file measurements needed for
policy replay without granting Pro’s file-exploration views.
[Plans, allowances, and funding](use/managed-app/service.md).

</div>

</details>

</article>

<article class="faq-question" data-faq-id="app-sharing" data-faq-note="product-status" aria-describedby="product-status">

<a class="faq-id" href="#app-sharing" title="Copy link to this question">#app-sharing</a>

<details>
<summary><h3>Does everyone reading App history need a paid seat?</h3></summary>

<div class="faq-answer" id="app-sharing" tabindex="-1">

No. Collaborators with current GitHub access can read a repository’s available App capability
without buying reader seats. A subscription belongs to an individual and can fund connected
organisations; each organisation has one ordinary funder, rather than stacked allowances.

Paying grants neither repository access nor administrative authority. Shared private links check
access again when opened. A public repository does not automatically publish its analytics: an
administrator must explicitly enable that public view.
[Readers, funding, and access](use/managed-app/service.md).

</div>

</details>

</article>

<article class="faq-question" data-faq-id="leaving-managed-service" data-faq-note="product-status" aria-describedby="product-status">

<a class="faq-id" href="#leaving-managed-service" title="Copy link to this question">#leaving-managed-service</a>

<details>
<summary><h3>Can I leave the hosted service or self-host?</h3></summary>

<div class="faq-answer" id="leaving-managed-service" tabindex="-1">

Yes. Ordinary diffdevil policy moves to the CLI or Actions. The **Community App** supplies basic
self-hosted operation without the official service’s quotas; your resources and retention policy
govern it. Premium App modules have separate commercial licensing.

Authorized history export and deletion remain available after a downgrade. Cancellation is not
deletion: retained archives follow the service’s disclosed policy, and protected names still require
current GitHub access. Self-hosting means owning credentials, updates, recovery, and data handling.
Cut over writers deliberately so two routes do not manage the same labels or comments.
[Self-hosting and leaving the service](use/managed-app/self-hosting.md).

</div>

</details>

</article>

<h2 id="faq-privacy">Privacy, history, and data</h2>

<article class="faq-question" data-faq-id="code-data" data-faq-note="product-status" aria-describedby="product-status">

<a class="faq-id" href="#code-data" title="Copy link to this question">#code-data</a>

<details>
<summary><h3>Does diffdevil send my code anywhere?</h3></summary>

<div class="faq-answer" id="code-data" tabindex="-1">

It depends on the route. The CLI processes locally, Actions run on your configured runner, and the
extension evaluates in your browser without uploading source to a diffdevil backend or sending
telemetry.

Hosted routes process data on their server. Lens Studio reads public PRs for live analysis and
frozen-example freshness checks. The App can transiently acquire authorized repository data
to calculate results. It retains operational records and opted-in history, including protected
repository names and file paths, but does not archive source contents or patches.
[Security and data boundaries](help/security-and-data.md).

</div>

</details>

</article>

<article class="faq-question" data-faq-id="app-history" data-faq-note="product-status" aria-describedby="product-status">

<a class="faq-id" href="#app-history" title="Copy link to this question">#app-history</a>

<details>
<summary><h3>Does the App keep a copy of my repository or track developers?</h3></summary>

<div class="faq-answer" id="app-history" tabindex="-1">

It keeps change history, not a source archive or developer ranking. Opted-in history, including
Free history, retains repository names, relative file paths, per-file measurements, lifecycle,
comparison references, evidence, and versions. Policy-excluded files can remain in those facts for
later replay. Names and paths are protected metadata, not anonymous numbers.

Source contents, patches, PR prose, and contributor-performance dimensions are excluded. Repository
and file trends use one final recoverable comparison per merged PR; open-PR activity is separate.
Collection can run with automated effects off. [History and retained data](use/managed-app/service.md).

</div>

</details>

</article>

<h2 id="faq-agents">Coding agents, releases, and the project</h2>

<article class="faq-question" data-faq-id="coding-agents">

<a class="faq-id" href="#coding-agents" title="Copy link to this question">#coding-agents</a>

<details>
<summary><h3>What does the Agent Skill add?</h3></summary>

<div class="faq-answer" id="coding-agents" tabindex="-1">

It teaches a coding agent when and how to use diffdevil instead of hand-counting changes, rebuilding
queries, or scraping human output.

The Skill does not install the executable or grant new permissions. It supplies persistent tool
knowledge; diffdevil supplies facts; the agent still has to read and judge the code.

</div>

</details>

</article>

<article class="faq-question" data-faq-id="semantic-versioning">

<a class="faq-id" href="#semantic-versioning" title="Copy link to this question">#semantic-versioning</a>

<details>
<summary><h3>Can an update change what my rules mean?</h3></summary>

<div class="faq-answer" id="semantic-versioning" tabindex="-1">

Released semantic identities fix the meaning of Changed, the expression language, path matching,
reports, and presets such as `size@1`.

A bug fix can correct behavior that violated that contract. An incompatible semantic change needs an
explicit new version instead of silently reinterpreting existing policy.

</div>

</details>

</article>

<article class="faq-question" data-faq-id="licensing">

<a class="faq-id" href="#licensing" title="Copy link to this question">#licensing</a>

<details>
<summary><h3>Why both MIT and AGPL?</h3></summary>

<div class="faq-answer" id="licensing" tabindex="-1">

The reusable engine, CLI, library, and Actions use MIT because they are meant to fit into other
tools. The public website uses AGPL-3.0-only. The Community App/service code uses AGPL with a narrow
permission for independent premium modules; modifications to the App remain reciprocal. Private
premium modules have separate commercial terms.

Documentation, runnable examples, and brand assets have their own terms. The licence follows the
component, not whichever repository folder happens to be nearby.

</div>

</details>

</article>
