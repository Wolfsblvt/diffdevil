# With a coding agent

The diffdevil Agent Skill teaches an agent when measured changes help, how to choose a source and output, and how to use policy without inventing certainty. It complements reading code. It does not turn line counts into a review, install a runtime by being read, or grant permission to write to GitHub.

## Install the complete Skill

Use the [canonical installation procedure](../../../skills/diffdevil/references/install-and-update.md) and your harness's actual persistent Skill route. Personal scope is the default for an unqualified installation request unless your instructions select another scope. Opening a repository does not automatically select repository-wide installation.

The canonical artifact is the whole `skills/diffdevil/` tree, including `SKILL.md`, its references and notices. Copying only the core leaves its deeper instructions broken. The [setup handoff](../../setup/skill.md) uses this same installation procedure; it is not another independently maintained installer.

For a released carrier, read the stable release manifest, select `assets.skill`, verify the archive SHA-256 before extraction, and compare the Skill's `metadata.version` with `skills.diffdevil.version`. Verify the complete tree and preserve its bytes. Do not combine a core from one revision with references from another.

A missing manifest or unpublished archive is an acquisition fact. For an explicitly selected development installation, resolve `main` once to a full commit and copy the complete tree at that coordinate, reporting development standing. Do not invent a stable download URL. An already installed npm package can also supply its own complete Skill tree; its Skill version is read from the Skill, not inferred from the npm version.

After copying, verify that the host discovers the installed Skill and can load both its core and a reference. Files present, host discovery and active loaded content are distinct checks. A managed plugin or customized copy has its own ownership; inspect it before overwriting it or adding a competing active copy. Harness-specific paths and reload behavior belong to the linked current installation source, not a second table here that can drift.

## Establish the executable separately

In the environment where the agent will run commands, verify:

```sh
diffdevil --version
diffdevil --help
```

Reuse the project's selected executable. When acquisition is part of the task, the [CLI guide](cli.md) supplies npm and non-JavaScript-project routes. A Skill directory need not include Node.js or the executable; an installed CLI need not establish persistent Skill discovery.

An agent can also use the [TypeScript library](typescript-library.md) when its host supplies that route. That is library execution, not proof that a CLI launcher, workflow or remote provider operation was exercised.

## Use it in ordinary work

The Skill is useful during PR preparation, change summaries, policy work and code review, even when the user did not explicitly name diffdevil. Ask the tool for facts that improve the actual task rather than adding a ceremonial size report to every response.

For example, after selecting the repository and comparison:

```sh
diffdevil analyze --base origin/main --head HEAD --format agent
diffdevil query --path 'src/**' --metric changed --format json
diffdevil query --files --path 'src/**' --select path --format nul --output paths.bin
diffdevil check --metric changed --lt 100
```

These are independent examples. The first uses a branch comparison; the later commands use the ordinary tracked-worktree source. Keep the same explicit source flags, or capture and reuse one report, when several questions must concern the same comparison. Do not quietly mix a branch report with a worktree threshold.

Use the resulting paths to focus reading, measurements to explain what changed, and policy decisions for their configured purpose. A large change is not automatically risky; a small one is not automatically correct. Preserve incomplete file membership rather than claiming the visible files are the complete review scope.

## Choose output for its consumer

`agent` is a compact readable report. `json` is the canonical structured analysis artifact. Query JSON is a different envelope, while `value` and NUL path output have strict representation requirements. Use [the complete script consumers](../start/use-results-in-scripts.md) rather than treating every nonzero exit as the same failure.

A successful JSON result can carry unknown evidence. Exit 1 can mean a valid false check; exit 2 is invalid or failed; exit 3 means unresolved or unrepresentable strict output. Keep that distinction in the agent's explanation and subsequent decisions. The installed [CLI and evidence reference](../../../skills/diffdevil/references/cli-and-evidence.md) gives operational depth without requiring the agent to reconstruct it from a screenshot.

## Effects stay under the existing grant

The Skill supports planning and actual application. It is not intrinsically read-only, but installation itself authorizes no provider effect. Under an existing one-off or standing grant, the agent can use the normal apply route without asking again for each already-authorized operation.

Before application, identify the target, trusted policy source, current revisions, credential scope and selected effect owner. Use [Reports, plans, and apply](shared-workflows/reports-plans-and-apply.md) for the complete workflow. A copied report or confident chat summary is not a trust receipt. An ambiguous write requires readback, not another blind comment creation.

The agent's own access and data handling remain relevant. Reports, tool output and attachments may enter the harness or provider context; local diffdevil analysis does not imply that an agent platform never transmits the results. Share the smallest useful evidence and redact private source, credentials and configuration before public posting.

## Versions, updates and offline use

The Skill checks the stable release metadata on first relevant use in a session. Its SemVer is independent of the CLI package version. Follow your existing update instructions, stage a complete replacement and preserve modified copies before switching. A failed update must leave the previous complete installation usable, not half updated.

Offline, use the installed Skill and executable with local files or saved reports. Unknown update freshness is not a failed analysis. Conversely, a connector that can read GitHub does not prove that the execution shell can reach npm or the provider API.

The [restricted-harness reference](../../../skills/diffdevil/references/restricted-harnesses.md) distinguishes a complete supplied npm installation, an install-free runtime archive and a source-only ZIP. Published bundled carriers can supply both Skill and runtime, but still require their digest checks and an actual Node execution route. Loading files in this conversation or a disposable sandbox is not necessarily a persistent personal installation.

Return the exact missing piece when setup fails: incomplete tree, digest/version mismatch, undiscoverable Skill, missing runtime, unavailable registry or provider access, or unknown offline freshness. Do not replace that with a universal claim that the tool cannot work in the host.

For broader repository setup, use the maintained [CLI](../../setup/cli.md), [Actions](../../setup/actions.md) or [combined setup](../../setup/everything.md) handoff. Those are purposeful tasks with their own selected effects, not consequences of installing tool knowledge.
