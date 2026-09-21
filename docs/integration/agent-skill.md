# Use diffdevil with an agent

## Meaning

The diffdevil Agent Skill gives a coding agent reusable knowledge for measuring
changes, querying files, evaluating policy, and applying selected GitHub effects.
It is a persistent skill with an everyday core and detailed references, not a
one-off setup prompt or a replacement for the agent's own instructions.

## Install it for your agent

Give the agent this prompt:

```text
Install the official diffdevil skill using https://raw.githubusercontent.com/Wolfsblvt/diffdevil/main/docs/setup/skill.md. Use your harness's personal skill scope unless my instructions say otherwise. Include its references and verify it is available.
```

The canonical copyable text is [skill-prompt.txt](../setup/skill-prompt.txt).
The [setup handoff](../setup/skill.md) points to the same
[installation procedure](../../skills/diffdevil/references/install-and-update.md)
used for refresh. Personal scope is the default; project or managed scope follows
your instructions and the harness's documented capabilities.

The installed folder contains `SKILL.md` plus references for CLI/evidence,
policy/effects, integrations, restricted/Web harnesses, and installation/updates. Ordinary use loads the
core. Deeper work loads the relevant reference. All those files are available
locally; a routine custom-policy task does not need to fetch a second manual first.

## What it helps with

The skill is described for proactive use during review, PR preparation, change
summaries, and automation. You do not have to name diffdevil each time. For example:

- “Explain my tracked changes and show which source files changed most.”
- “Check our configured change threshold and include the evidence.”
- “Apply the repository's size labels to this PR under my standing grant.”

It teaches the complete supported tool, including one-off and standing-grant
application, while preserving what the tool reports about facts, policy,
planned effects, and actual outcomes.

The [worked examples](../examples/agent-skill.md) show ordinary questions,
custom policy, incomplete evidence, and installation/update situations.

## Runtime and versioning

The skill is Markdown, not a bundled executable. An available CLI or npm execution
route runs diffdevil without turning a non-JavaScript repository into a Node project.
The current CLI requires Node.js 22 or newer. An existing project installation
and version selection remain usable.

Skill SemVer is independent of npm SemVer. On first relevant use, the agent checks
the stable release manifest named in the Skill frontmatter. The repository's
[version map](../../skills/versions.json) is a strictly validated source projection,
not a second update service. Refresh follows your existing instructions and the
host's ordinary installation permissions. Offline use remains available; a
failed freshness check does not make a local report unusable.

Manual installation uses the complete canonical [skill folder](../../skills/diffdevil/).
The detailed installation reference contains host-specific location suggestions,
copy/readback steps, local-modification handling, and refresh behavior.

## Package, website, and harness

GitHub Releases, the npm artifact, and the website distribute the same canonical files.
The release family also offers an install-free Node 22+ runtime and a bundled
Skill-plus-runtime carrier, both bound by the stable manifest and immutable digest.
Obtaining the package does not automatically register its skill with a harness.
Installing the skill does not automatically install a managed GitHub App.

A downloaded file, a discoverable skill, and a working executable are different
installation facts. The agent reports which of them it actually established.
No instruction file can guarantee a host capability that the current client
does not expose.

Original explanatory text follows the repository's documentation licence;
runnable examples follow its example licence. See the
[licence map](../../LICENSES/README.md).
