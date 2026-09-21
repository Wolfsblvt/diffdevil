# Install and update

## Meaning

This is the shared installation and refresh procedure for the diffdevil skill.
The skill-install handoff and human guide use this same reference. It installs
tool knowledge, including detailed references, rather than changing the agent's
global instructions or the repository's operating policy.

## Select the actual harness location

An unqualified request to install the skill means the user's personal skill scope.
Specific user instructions, global instructions, and the harness's own conventions
take precedence. Repository scope is available when selected, not inferred merely
because the agent is currently working in a repository.

Use the harness's native skill installer or documented persistent skill directory.
The agent should resolve its own environment. These are suggestions for supported
local layouts, not an instruction to populate every path:

| Harness | Personal skill directory | Repository alternative |
| --- | --- | --- |
| Codex local | `$HOME/.agents/skills/diffdevil/` | `.agents/skills/diffdevil/` |
| Claude Code local | `$HOME/.claude/skills/diffdevil/` | `.claude/skills/diffdevil/` |
| GitHub Copilot local | `$HOME/.copilot/skills/diffdevil/` or its supported `.agents` root | `.github/skills/diffdevil/`, or a supported `.claude`/`.agents` root |

`$HOME` denotes the actual user's home, including on Windows. A remote sandbox's
home is not necessarily that user's persistent harness storage.
Account-managed or plugin-based clients use their supported personal installation
route. Package the same canonical folder when a native wrapper is needed.

Inspect an existing diffdevil installation before adding another. Host precedence,
disabled skills, symlinks, and plugin ownership can explain why a different copy
is active. Update the selected installation rather than creating competing copies.

## Obtain one complete source snapshot

The canonical repository is `Wolfsblvt/diffdevil`; the skill folder is
`skills/diffdevil/`. The stable release manifest is:

```text
https://github.com/Wolfsblvt/diffdevil/releases/latest/download/diffdevil-release-manifest.json
```

Its `skills.diffdevil.version` is the Skill's SemVer string; `assets.skill`
names its immutable ZIP, SHA-256, and source commit. There is no CLI version
range in the descriptor. The npm package and Skill can change independently.

For installation or refresh:

1. Read the stable release manifest and verify the selected `assets.skill`
   download against its declared SHA-256 before extracting it.
2. Obtain the complete released Skill folder from that asset, including all
   referenced Markdown and notices. Its `skills.diffdevil.sourceCommit` is
   provenance for that immutable published snapshot, not a request to follow
   mutable `main`.
3. Confirm the folder's `SKILL.md` name is `diffdevil` and its `metadata.version`
   equals that snapshot's `skills.diffdevil.version` value. Check that its
   local reference links resolve.
4. Install that folder into the selected harness scope and read back the copied
   files. Preserve the original UTF-8 bytes, including line endings; do not
   rewrite frontmatter, insert local instructions, or reformat references.

Prefer the native installer when it can preserve that source and file set.
Otherwise ordinary file copy/download is sufficient. When Git is the transport,
use raw Git object bytes or a checkout configuration that preserves LF instead
of silently converting the canonical payload to CRLF.

Before the first carrier publication, the stable manifest may be absent. Do not
describe mutable `main` as a stable release. When the user requested a development
installation, resolve `main` once to a full commit and obtain the complete Skill
folder from that immutable coordinate; report the commit and development standing.
Otherwise retain an existing installation or report that the stable carrier is
not yet available.

A package already on disk may supply the same canonical `skills/diffdevil/`
directory without a network fetch. Its Skill version is read from its own
frontmatter; it need not equal the containing npm version. A network check can
discover a newer Skill without upgrading that npm package.

The manifest also names `assets.bundled`, which carries this Skill together with
the complete install-free runtime, and `assets.standalone`, which carries only
that runtime. Use the bundled carrier when the harness needs both instruction
and transient CLI execution; verify its digest before extraction, then run
`node scripts/run.mjs --version`. Installing or discovering the Skill and
executing the supplied runtime remain separate observed facts.

## Confirm the usable installation

Check the actual host's skill listing/discovery and load the installed skill,
including one local reference. Report the installed version and location plus
any remaining host-specific reload step.

Codex detects local skill changes; restart when the change does not appear.
Claude Code detects local file changes, but previously invoked content has its
own lifecycle: invoke/read the updated skill before relying on its new content.
Copilot CLI provides `/skills reload` and `/skills info diffdevil`.
Use current host documentation when the surface differs.

These are distinct outcomes: files copied, host discovers skill, updated content
loaded, and CLI execution available. The installation can establish the skill
without bundling Node or the CLI. A harmless CLI check is useful when the runtime
is present; a missing runtime does not mean the Markdown was not installed.

When no persistent route is exposed, provide the complete folder and identify
the actual missing installation step. The skill can still be used as supplied
instructions, but that is not a persistent installation. Use an available native
personal route before reducing the result to a file left in a transient sandbox.

## Check and refresh on use

The Skill core checks the stable release manifest on first relevant use in each
session. An explicit user request can check again. There is no daemon or
scheduled updater.

Compare SemVer, not strings: `1.10.0` is newer than `1.9.0`. Equal versions need
no update. A local newer/development version is not silently downgraded.
The public index names the stable release; a preview is used only when selected.

Apply the user's update instructions and normal harness installation permissions.
An existing standing update grant can cover replacement without another question.
Where it does not, report the available update and use the host's ordinary
authorization route. The skill introduces no separate approval policy and no
automatic consent to broaden privileges.

Stage the whole new folder before replacing a working installation. Compare
existing installed files with their published version or the native installer's
recorded source so local modifications remain visible. When no source record
exists, use the matching released Skill ZIP named by the stable manifest and
verify its digest before comparing the folder.

For a modified copy, preserve the modifications and explain the actual difference
before choosing replacement, migration to separate local instructions, or keeping
that custom copy under the user's instructions. A customized copy is not reported
as byte-identical official content. Unknown lineage is not proof of a clean copy.
No custom receipt database is required; native source tracking is enough when
available, and ordinary source comparison remains available without it.

Replace only the selected skill folder. Keep a recoverable old copy outside
active skill discovery until the replacement is complete. A failed download or
partial refresh leaves the prior complete version in service; finish or restore
the folder before activating a mixed set. Remove superseded official files as
part of that known folder update, while preserving unrelated user material.
Then repeat the host's discovery/load check.

## Offline and mismatched versions

With no network, use the installed core and references plus the available CLI
and local sources/saved reports. Unknown update freshness is not a failed analysis.

A missing index entry, malformed JSON, unavailable commit, version mismatch, or
incomplete download is an update-source problem. Keep the working installation
and report that update result, rather than claiming a new version arrived.

Skill and CLI version numbers do not have to match. For unfamiliar syntax,
inspect the executable's `--help`, schemas, and declarations. Use the supported
equivalent or normal package-update route when the task calls for a newer
capability. Updating instructions alone does not update a dependency or authorize
a new provider effect.

## Host references

Checked against the official documentation on 2026-09-18:
[OpenAI skills](https://learn.chatgpt.com/docs/build-skills),
[Claude Code skills](https://code.claude.com/docs/en/skills),
[Copilot skills](https://docs.github.com/en/copilot/concepts/agents/about-agent-skills),
and [Copilot CLI installation/reload](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-skills).
The folder structure follows the
[Agent Skills specification](https://agentskills.io/specification).
These sources document supported mechanics; they do not prove that a particular
installation or account has exercised them.
