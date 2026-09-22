# What is diffdevil

diffdevil turns a Git diff into facts you can read, query, and use in automation.
It measures files and lines, evaluates your policy, and can deliberately maintain
GitHub labels and comments. The same engine works in a terminal, in a workflow,
in your application, and while you review a pull request in the browser.

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
Use **diffdevil for GitHub**, the browser extension, for a personal Changed view
without installing repository automation. The optional managed App is the route
for having a service operate repository automation. The public Playground lets
you explore the same measurements and policy without installing anything.

The measurements are shared; the responsibilities are not. A local report is not
a GitHub label. An extension's size pill is your local classification. A plan
says what a host intends to change, not what GitHub has accepted. Only explicit
application attempts effects, and readback establishes what was observed afterward.
The [Surfaces guide](use/README.md) separates these operating choices.

## Get a first result

| What you want to do | Start here |
| --- | --- |
| Read Changed beside GitHub's PR and file statistics | [See changed lines on GitHub](start/see-changed-lines-on-github.md) |
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
