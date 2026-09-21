---
title: FAQ
description: "What makes diffdevil different, which way to use it, and what happens to your changes and data."
---

# Frequently asked questions

Why another diff tool? Start here. The practical details are further down.

<aside class="faq-note" role="note" id="product-status">
<p><strong>In development.</strong> The browser extension and complete managed-service experience are in development. Their answers describe the complete experience.</p>
</aside>

<nav class="faq-categories" aria-label="FAQ categories">
<a href="#faq-why">Why diffdevil?</a>
<a href="#faq-numbers">Understanding the numbers</a>
<a href="#faq-browser">Browser extension and Playground</a>
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

<article class="faq-question" data-faq-id="measurement-evidence">

<a class="faq-id" href="#measurement-evidence" title="Copy link to this question">#measurement-evidence</a>

<details>
<summary><h3>Why show an unknown result?</h3></summary>

<div class="faq-answer" id="measurement-evidence" tabindex="-1">

Because a plausible guess quickly becomes a trusted fact once a script or policy acts on it.

diffdevil keeps what the evidence can prove. A range of 60–70 still proves “below 100”; a range of
90–110 does not. It reports that difference instead of substituting zero, false, or a midpoint.

</div>

</details>

</article>

<h2 id="faq-browser">Browser extension and Playground</h2>

<article class="faq-question" data-faq-id="playground-or-extension" data-faq-note="product-status" aria-describedby="product-status">

<a class="faq-id" href="#playground-or-extension" title="Copy link to this question">#playground-or-extension</a>

<details>
<summary><h3>Playground or browser extension?</h3></summary>

<div class="faq-answer" id="playground-or-extension" tabindex="-1">

Use the Playground to experiment, test policies, and understand a result without installing
anything.

Use the browser extension for everyday work. It puts Changed and your policy directly into the
GitHub pull requests you already read.

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
your local result, not a GitHub label it secretly applied.

</div>

</details>

</article>

<article class="faq-question" data-faq-id="different-results" data-faq-note="product-status" aria-describedby="product-status">

<a class="faq-id" href="#different-results" title="Copy link to this question">#different-results</a>

<details>
<summary><h3>Why can the extension, an Action, and the App disagree about the same PR?</h3></summary>

<div class="faq-answer" id="different-results" tabindex="-1">

They can use different revisions, evidence, selected files, or policy. The extension may also have
personal overrides while repository automation uses trusted repository settings.

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

For operated execution, not a better algorithm. The App carries installation administration, shared
defaults, native check summaries, continuity, and optional history.

Use Actions when you want to own the workflow and runner setup. Use the App when you want the
service to carry that operating work. The open CLI, library, and Actions keep the same measurement
and policy capabilities.

</div>

</details>

</article>

<article class="faq-question" data-faq-id="leaving-managed-service" data-faq-note="product-status" aria-describedby="product-status">

<a class="faq-id" href="#leaving-managed-service" title="Copy link to this question">#leaving-managed-service</a>

<details>
<summary><h3>Can I leave the hosted service or self-host?</h3></summary>

<div class="faq-answer" id="leaving-managed-service" tabindex="-1">

Yes. The App uses ordinary diffdevil policy, not a hosted-only language. You can move to CLI or
Actions, export the policy, or operate the App yourself.

Self-hosting transfers real responsibility: credentials, resources, updates, recovery, and data
handling. Moving writers also needs a deliberate cutover so the old and new routes do not manage the
same effects at once.

</div>

</details>

</article>

<h2 id="faq-privacy">Privacy, history, and data</h2>

<article class="faq-question" data-faq-id="code-data" data-faq-note="product-status" aria-describedby="product-status">

<a class="faq-id" href="#code-data" title="Copy link to this question">#code-data</a>

<details>
<summary><h3>Does diffdevil send my code anywhere?</h3></summary>

<div class="faq-answer" id="code-data" tabindex="-1">

No, not to another analysis provider. The CLI stays on your machine. Actions run in your GitHub
runner. The Playground and browser extension evaluate with the shared engine in your browser.

Only the managed App processes repository data in the App runtime, and it does not forward or
archive your source code. It retains only the specific operational or opted-in numeric data
described by the service.

</div>

</details>

</article>

<article class="faq-question" data-faq-id="app-history" data-faq-note="product-status" aria-describedby="product-status">

<a class="faq-id" href="#app-history" title="Copy link to this question">#app-history</a>

<details>
<summary><h3>Does the App keep a copy of my repository or track developers?</h3></summary>

<div class="faq-answer" id="app-history" tabindex="-1">

No. Persistent history is opt-in and stores numerical measurements and comparison references, not
source files, filenames, authors, or pull-request prose.

It is designed to explain change patterns, not rank people or reconstruct the repository. A separate
short recovery ledger exists so admitted operations can be retried and diagnosed.

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
tools. The website, managed App, and service software use AGPL-3.0-only so modified network
applications retain reciprocal source terms.

Documentation, runnable examples, and brand assets have their own terms. The licence follows the
component, not whichever repository folder happens to be nearby.

</div>

</details>

</article>
