# With a coding agent

Give an agent the diffdevil Skill when measured changes would help its ordinary work: review, PR preparation, change summaries, local checks or policy editing. The Skill teaches the existing tool, its evidence boundaries and deeper references. It does not supply a second counting engine, replace reading code or grant permission to mutate a repository.

## Install the complete Skill, not a pasted introduction

Use the maintained [Skill setup instructions](https://diffdevil.dev/setup/skill.md) with the actual harness's native installer or documented persistent Skill location. The [canonical installation procedure](../../../skills/diffdevil/references/install-and-update.md) owns the source selection, folder contents, update and recovery mechanics; this human guide does not replace it.

A useful setup request is:

> Follow https://diffdevil.dev/setup/skill.md to install the complete diffdevil Skill in my normal persistent Skill scope and verify its discovery and executable access.

The default is personal scope unless your instructions select repository scope. An open repository is not itself that selection. Inspect an existing installation first so a second copy does not silently win host precedence. Managed plugins and custom copies need their actual update route rather than another competing folder.

Obtain the complete `skills/diffdevil/` tree, including its references and notice. For a stable release, use the manifest and archive it actually names, verify the archive SHA-256, check the Skill version and tree digest, and preserve the original UTF-8 bytes. Do not copy only `SKILL.md`, rewrite it for the harness or infer an archive URL from a package version.

A missing stable carrier is a publication boundary. For an explicitly selected development installation, resolve repository `main` once to an immutable full commit and take the complete folder from that source. Report development standing rather than calling mutable source a stable release. A local package can also supply its canonical Skill folder; inspect that folder's own metadata.

## Prove persistent discovery separately from reading

After copying or installing, use the host's Skill listing/discovery and load both the installed core and one local reference. Report the actual scope/location, version and any required reload. Files copied, Skill discovered, updated content loaded and executable available are four different observations.

Reading an online `SKILL.md` in a conversation is useful instructions, **not a persistent installation**. A folder in a disposable execution sandbox is not automatically the user's persistent harness directory. When the host exposes no persistent route, retain the complete folder and state that limit rather than claiming installation.

The canonical procedure maintains host-specific location/reload suggestions. Use its current source and the actual harness instead of reproducing a second host-location table here.

## Establish the executable

Reuse the installed CLI and check it:

```sh
npm exec -- diffdevil --version
npm exec -- diffdevil --help
```

For a one-off route without adding a dependency:

```sh
npm exec --yes --package=@wolfsblvt/diffdevil -- diffdevil --version
```

Use the selected prefix consistently for subsequent commands. The [CLI guide](cli.md) covers project installation and updates. Node.js is needed to execute the CLI, Git for local Git sources, and network/credentials only for the selected acquisition or effects. Installing Markdown does not install Node, update npm or authorize provider writes.

## Use it in ordinary work

Ask the agent to select the actual comparison before measuring. A worktree question, a staged change, a merge-base comparison, a saved report and a current GitHub PR are not synonyms. For example:

> Compare my branch with origin/main, inspect the changed files and summarize what needs review. Use diffdevil for measurements, keep incomplete evidence visible, and do not apply GitHub metadata changes.

A suitable local analysis is `diffdevil analyze --base origin/main --head HEAD --format agent`, using the established executable route and existing refs. Capture canonical JSON when several queries should share one observation. The Skill is useful proactively; the user need not say “run diffdevil” whenever measurements help.

The result complements code inspection. A small count is not proof of correctness, and a large count is not a risk verdict. Preserve [evidence and uncertainty](../understand/evidence-and-uncertainty.md) rather than hand-counting unavailable patches to produce a tidier answer.

## Choose output and effect authority

Use agent format for compact reading, full report JSON for reusable facts, query JSON for structured selections and strict scalar/path formats only when the result is representable. Agent text is not a report reader's input. The [complete shell consumers](../start/use-results-in-scripts.md) show why false, failure and unresolved exits must remain separate.

An agent can validate configuration and inspect a desired plan without changing a repository. `apply` and `labels apply` cross the effect boundary under your existing one-off or standing grant. The Skill does not require ceremonial reconfirmation for already-authorized writes, but neither the Skill nor a token creates that authority.

Before reporting an effect, distinguish the plan, attempted operations and observed readback. Keep comment ownership/occasion identity on retries. [Reports, plans, and apply](shared-workflows/reports-plans-and-apply.md) and [Labels, comments, and definitions](shared-workflows/labels-comments-and-definitions.md) are the shared operating references, not agent-specific exceptions.

Reports and tool output can enter the agent harness or provider context. Local diffdevil processing does not establish that the surrounding agent platform keeps those results on your machine. Use its actual access, retention and sharing policy, and redact sensitive artifacts before public posting.

## Update without breaking a working installation

The Skill checks its release manifest on first relevant use. Its version is independent of the package and need not match the CLI. Read versions and digests from the source metadata; do not stamp a version into this guide.

Stage a complete new folder, compare local modifications with known source, replace only the selected installation and repeat discovery/load checks. Preserve customized material and unknown lineage rather than calling it official byte-identical content. A failed download leaves the last complete installation usable; do not activate a mixture of old core and new references.

Updating the Skill alone does not add commands to an older executable. Inspect the actual `--help` and use the normal package update route when a newer capability is required. Conversely, an unavailable freshness check does not invalidate a local analysis that the installed tool can perform.

## Offline and restricted harnesses

Local files and saved reports remain useful offline. A blocked registry and an absent runtime are different problems. The canonical [restricted-harness reference](../../../skills/diffdevil/references/restricted-harnesses.md) explains the selected bundled and standalone carriers, their manifests and `node scripts/run.mjs` launcher. A carrier includes the needed tool files; it does not magically include Node or persistent host storage.

A browser that can read an artifact is not proof that a shell can download it. Use actually mounted files and the exposed execution route. Do not pretend that a transient run installed the Skill, or that an offline check established release freshness.

For broader adoption, the maintained [CLI setup](https://diffdevil.dev/setup/cli.md), [Actions setup](https://diffdevil.dev/setup/actions.md) and [combined setup](https://diffdevil.dev/setup/everything.md) keep their own task-specific payloads. App setup remains subject to its actual availability and separate authority. No new agent protocol is needed to use the same product.
