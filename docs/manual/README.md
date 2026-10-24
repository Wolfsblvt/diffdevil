# What is diffdevil

diffdevil helps you understand what changed in a pull request, use those facts in
automation, and follow how a codebase changes over time. It measures files and
lines, evaluates your policy, and can deliberately maintain GitHub labels and
comments. The same engine powers a personal browser extension, free open tools,
and a managed App for repository history and automation.

The CLI, TypeScript library and four GitHub Actions are released. The browser
extension is in Chrome Web Store preparation, and the managed App is implemented
and under private qualification; public installation and paid plans are not open yet. The
[release guide](help/releases.md) distinguishes the available distributions.

## A replacement is not six changed lines

Replace three adjacent lines with three new lines:

```diff
-colour=blue
-retries=2
-timeout=10
+colour=green
+retries=3
+timeout=20
```

Git's raw counters describe **3 additions + 3 deletions = 6 churn**. diffdevil also
reports **3 Changed**: three modified line positions, counted once each. Neither
number is hidden or renamed. They answer different questions.

This excerpt comes from the complete [replacement patch](../examples/diffs/replacement.diff).
Changed pairs additions and deletions within contiguous edit blocks; it does not
understand whether two lines do the same thing. The
[full counting explanation](understand/changed-lines-and-churn.md) covers
unequal replacements, separate blocks, and incomplete patches.

## Use the facts for your own decisions

A size label is a useful first result, not the extent of the product. You can ask
how many changed lines fall under `src/**`, list files above a threshold, compare
source and test activity, or keep one configured review comment up to date.
Queries return data; checks answer conditions; policies give reusable names to
metrics, scopes, bands, and rules.

You do not need to learn an expression language before doing something useful.
The default `size@1` policy classifies Changed and supplies size labels. Structured
shortcuts handle common questions. The **detail** language is there when your
question needs a formula rather than another switch.

Evidence stays attached to the answer. A complete patch can establish an exact
count. Partial material may establish a range, leave a value unknown, or make a
line measurement inapplicable. diffdevil does not turn any of those into zero to
keep a script moving.

## One engine, different responsibilities

Run diffdevil yourself through the CLI, TypeScript library, or GitHub Actions.
These are complete free tools; no diffdevil account or hosted subscription is required.
Use **diffdevil for GitHub**, the browser extension, for a personal Changed view
without installing repository automation. The optional managed App is the route
for shared repository history and operated automation. Lens Studio, the public Playground, lets
you explore the same measurements and policy without installing anything.

The measurements are shared; the responsibilities are not. A local report is not
a GitHub label. An extension's size pill is your local classification. A plan
says what a host intends to change, not what GitHub has accepted. Only explicit
application attempts effects, and readback establishes what was observed afterward.
The [Surfaces guide](use/README.md) separates these operating choices.

## Give your repository a memory

The managed App connects individual changes to the history of a repository. Its
Overview, PRs, History and Files routes let you follow pull requests through their
lifecycle, inspect changes over time, and explore file growth, repeated edits and
files that change together. PR detail and File detail keep the underlying
measurements and coverage inspectable. [Read repository history](use/managed-app/read-history.md)
explains each view and what its measurements mean.

The selected hosted offer has **Free** for PR operation and basic repository
history, **Pro** for deeper file history and context, and **Business** for shared
policies and delegated administration. Readers with current GitHub access can use
a connected repository's funded capabilities without buying seats. These are
planned service terms; [Plans and shared access](use/managed-app/plans-and-sharing.md)
owns the full offer and its availability note. [Community self-hosting](use/managed-app/self-hosting.md)
has separate operating responsibilities and does not include the private premium modules.

History collection is explicit. The service retains measurements, paths and
comparison metadata, not source code or patch contents. Read
[Security and data](help/security-and-data.md) for permissions, retention and exit.
Repository and file measurements describe change; they are not ratings of people.

## Get a first result

| What you want to do | Start here |
| --- | --- |
| Read Changed beside GitHub's PR and file statistics | [See changed lines on GitHub](start/see-changed-lines-on-github.md) |
| Understand repository and file history in the App | [Read repository history](use/managed-app/read-history.md) |
| Keep a repository's size labels up to date | [Label pull requests](start/label-pull-requests.md) |
| Inspect a patch or your own working changes | [Analyze local changes](start/analyze-local-changes.md) |
| Explore a frozen public PR, then change its policy | [Try a public pull request](start/try-a-public-pull-request.md) |

Each route includes the prerequisites, expected result, and first useful repair
when the result does not appear. Once a local report is useful, take it into
[complete Bash and PowerShell consumers](start/use-results-in-scripts.md).

## What a count cannot tell you

Line counts do not measure importance, risk, complexity, correctness, or quality.
A one-line change can deserve close attention; a large mechanical replacement can
be straightforward. A size band is a policy classification, not a review verdict.
Excluding a lockfile changes the question being measured, not the contents of the
pull request.

For the shared mental model, continue with
[How diffdevil reasons](understand/README.md). The manual then separates operating
a surface, writing policy, and looking up an exact interface, so your first result
does not require reading the reference manual first.
