# Agent Skill distribution

## Meaning

This document owns the source/version/content relationship for the diffdevil
Agent Skill. It supports repository, package, and website delivery without a
second manual or an update service. The installed installation reference owns
consumer installation and refresh; this document owns publication mechanics.

## One independently versioned source folder

`skills/diffdevil/SKILL.md` contains the everyday guide and `metadata.version`.
`skills/diffdevil/references/` contains its installed deeper instructions.
Any notices included in that folder travel with it.

The initial proposed skill version is `1.0.0`. This is the skill's identity,
not a claim that its first publication has happened or a requirement to match
npm `1.0.0`. A changed released instruction set receives its own version:
patch for corrections/clarifications, minor for additive capabilities, major
for a breaking skill installation or instruction interface change.

There is no skill-to-CLI compatibility-range matrix. Actual command support is
resolved through the installed CLI, schemas, and declarations. The skill retains
important known interface distinctions as teaching, not as a release gate.

`skills/versions.json` is a plain map from skill name to current stable SemVer:

```json
{
  "diffdevil": "1.0.0"
}
```

Generate this projection from canonical frontmatter when releasing, or use the
existing release tooling to update and verify it in the same source change.
Its meaning is not maintained independently from `metadata.version`.

## Publish a coherent snapshot

Publish the complete accepted folder and matching index together on the authorized
durable branch. A new consumer resolves `main` once to a Git commit and reads
the descriptor and whole folder at that commit. This avoids a core/reference mix
if main moves between downloads.

The snapshot commit is the immutable source coordinate. No additional skill tags,
hash manifest, release registry, scheduled check, new npm package, or service is
required. Ordinary Git history of the version-map changes locates prior releases.
Keep released version identity consistent: a change to released installed files
increments the skill version rather than silently reusing it.

A packaging or publication check should compare the canonical file set and raw
bytes with the delivered set, including references and line endings, and check
the frontmatter/index version match. The check proves byte delivery; actual
host discovery/load remains a different qualification.

Preserve UTF-8 LF bytes for installed Markdown. Repository attributes for
`skills/**` should express that behavior. Raw Git objects and transport bytes
avoid accidental checkout conversion; inspect installed bytes, not only Git's
normalized representation.

## Public routes

| Public route | Canonical source and behavior |
| --- | --- |
| `/skill/version` | Serve `skills/versions.json` as JSON without another maintained version value |
| `/skill/SKILL.md` | Serve canonical `skills/diffdevil/SKILL.md` as Markdown |
| `/skill/references/cli-and-evidence.md` | Serve the corresponding installed reference |
| `/skill/references/policy-and-effects.md` | Serve the corresponding installed reference |
| `/skill/references/integrations.md` | Serve the corresponding installed reference |
| `/skill/references/install-and-update.md` | Serve the corresponding installed reference |
| `/skill/references/restricted-harnesses.md` | Serve the corresponding installed reference |
| `/skill/NOTICE.md` | Serve the accompanying source and licence notice |
| `/setup/skill.md` | Serve `docs/setup/skill.md` |
| Human installation page | Render `docs/integration/agent-skill.md` through the selected docs source mapping |
| Copy installation prompt | Use `docs/setup/skill-prompt.txt` |

The raw public prompt deliberately uses the established GitHub origin, so no
unconfirmed website domain is needed. A site may project the same prompt to its
configured absolute `/setup/skill.md` URL at build/render time. It must substitute
an actual origin, not copy an origin-less route or placeholder to another agent.

Raw routes preserve source bytes without HTML wrappers, navigation, frontmatter
injection, or minification. For stable installation, the setup handoff points
to one immutable repository snapshot. An old website deployment can therefore
still hand off to the current repository source without pretending its own static
copy has updated.

No route is live merely because it appears in this table. Public route exposure,
headers, byte comparisons, relative reference links, and the copy interaction
are verified through the website's ordinary authorized delivery work.

## npm and discovery

The npm artifact includes `skills/diffdevil/` in that same discoverable folder,
plus `skills/versions.json`. Copy the canonical source unchanged. The containing
npm release can carry an older skill; its own frontmatter remains the truth.
A subsequent standalone skill update does not need a new CLI release.

Link the folder and installation guide from the npm package's README surface.
Do not silently rewrite the root project README to achieve an npm-only instruction.
Where packaging currently reuses that root README, introduce or select the intended
package-specific README source through the packaging work.

CLI help may point to the skill folder/install guide. It does not automatically
install a skill or add a banner to machine output. Native plugin packaging can
wrap the same folder when selected for a host; it does not fork the instruction
body or create a second version series.

## Maintenance and qualification

A skill change updates the relevant core/reference and version projection.
A tool behavior change updates the affected product manual and agent teaching
when needed. Reading views can contain compact examples, while complete existing
example assets and schemas retain their authoritative homes.

Qualify the actual payload: frontmatter, local links, version lookup, a same-commit
download, existing clean/modified install, offline use, interrupted update, and
host discovery/reload. Exercise representative CLI commands separately from
provider writes. No new framework or universal compatibility test estate is
required by this content contract.

Source admission, npm inclusion, website raw delivery, native host installation,
proactive activation, and provider effects each have their own observed result.
Source-only delivery does not claim those later consumer outcomes.
