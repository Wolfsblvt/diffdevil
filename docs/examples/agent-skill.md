# Agent Skill worked examples

## Meaning

These scenarios illustrate how an agent uses the diffdevil core and references.
Commands with symbolic paths or targets require the actual task's values.
Sample responses describe behavior, not live measurements or provider effects
performed by this document.

## Ordinary review without naming the tool

User: “Review my changes and explain what they touch.”

The description makes the skill relevant without an explicit diffdevil request.
The agent can run `diffdevil analyze --format agent` for tracked-change orientation,
then inspect source and query file scopes as useful. It still reads the code for
semantic review; the measurement does not replace that judgment.

For repeated questions, save a full report and query it. For staged-only work,
select `--staged` rather than quietly including the unstaged worktree.

## A useful policy plan

User: “Show what standard size labeling would do to this PR.”

```sh
diffdevil plan --repo OWNER/REPO --pr NUMBER --no-config --preset size@1 --definitions ensure --format json
```

The agent reports the configured band, evidence, and desired managed effects.
This is a plan. No provider change is claimed.

For a custom local policy, the agent reads the policy/effects reference and names
the source it previewed. That local preview is not silently described as the
trusted base policy a subsequent write command would load.

## One-off authorized application

User: “Apply the standard size label to this PR, create missing size labels,
and do not post a comment.”

```sh
diffdevil apply --repo OWNER/REPO --pr NUMBER --no-config --preset size@1 --format json
```

This selects the covered behavior directly. The response uses the actual effect
journal: for example, “Added the selected size label; unrelated labels were
untouched,” only when that state was observed. No additional approval ritual
is introduced by the skill.

## Standing authority

Earlier user instruction: “For this repository, keep size labels current when
I ask you to prepare or update a PR; ensure missing size definitions, no comments.”

Later user request: “Update this PR.”

The agent applies the covered behavior without asking for the same grant again.
A new comment template or broader label-definition synchronization is a different
effect choice, evaluated under the user's instructions rather than assumed from
that example grant.

## No application grant

User: “Inspect this PR.”

The agent analyzes, queries, and can explain a useful policy preview.
It does not turn the inspection request into label/comment application.
It also does not declare the tool permanently read-only: application remains
available when requested or already covered by a standing instruction.

## Incomplete evidence

The report has replacement-aware changed lines bounded to 60–70.

A useful response is: “Changed lines are between 60 and 70. The <=100 condition
is true; the >65 condition is unresolved.”

The first check can exit 0, the second 3. JSON retains the bounds.
An exact scalar request exits 3 rather than choosing the midpoint.
The agent can still use the proven condition in the surrounding task.

If a file is binary and line measurement is unmeasurable, report its visible file
fact separately from its unavailable line count. Neither situation creates
a universal stop for the whole task.

## A personal installation in a C# checkout

User: “Install this skill.”

The agent uses its documented personal skill location, includes all references,
and confirms actual host discovery. The open repository does not change that
default. Obtaining the CLI through npm's execution cache needs no project manifest.

The completion distinguishes the installed skill from CLI availability.
For a remote host with no persistent personal write route, the agent explains that
actual limitation and uses any supported native personal installer before
returning an uninstalled folder.

## Existing installation, update, and offline use

On first relevant use, the agent fetches the stable release manifest named in
the Skill frontmatter.

If equal, use the existing copy. If newer, obtain the complete immutable Skill
ZIP named by the manifest, verify its digest, and refresh under the user's update
instructions. If the installed files were customized, preserve and reconcile
that actual difference rather than replacing it invisibly. A pinned or newer
local version remains selected.

Offline, use the installed core/references and available local CLI/report.
A failed update check means unknown freshness, not invalid source evidence.
A failed folder download does not activate a half-updated skill.

## Interrupted application

An API request times out after sending a comment operation.

The tool's returned journal and a current read distinguish a confirmed change
from an unobserved one. The agent reconciles that attempt before a retry and
retains the create occasion when applicable. It neither invents rollback nor
repeats a create operation solely because a request failed to return.

This is use of the provider's actual result contract, not a separate agent
safety policy.
