# Agent Skill distribution

## Meaning

This document owns the source/version/content relationship for the diffdevil
Agent Skill and the three GitHub Release carriers built from it. It supports
repository, package, website, standalone-runtime, and bundled delivery without
a second manual or an update service. The installed installation reference owns
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

This file is a native source projection, not a second release index. The release
builder rejects extra keys, malformed versions, and any value that differs from
canonical frontmatter. Change the frontmatter and projection together when the
Skill's independently versioned instruction set changes.

## Build one coherent release family

`npm run build:release -- --source-ref COMMIT` builds four files from one full
40-character source commit:

- `diffdevil-release-manifest.json`, the stable machine-readable projection;
- `diffdevil-skill-SKILL_VERSION.zip`, the complete canonical Skill folder;
- `diffdevil-standalone-PRODUCT_VERSION-node22.zip`, the install-free Node 22+
  CLI runtime and locked production dependency closure; and
- `diffdevil-skill-SKILL_VERSION-with-diffdevil-PRODUCT_VERSION-node22.zip`,
  the Skill plus that same runtime and a root launcher.

The manifest binds every asset name, immutable download URL, SHA-256 digest,
compressed and uncompressed byte budget, member count, largest members,
executable/native extensions, and major dependency contributors. It also binds
the independent product and Skill versions, source commit, and canonical Skill
tree digest (the canonical source files, excluding the generated carrier
`MANIFEST.json`). Release publication attaches these exact files to the authorized
GitHub Release; `releases/latest/download/diffdevil-release-manifest.json` is the
stable discovery route, while each asset URL is immutable through the release tag.

Keep released identity consistent: a changed released Skill instruction set
increments Skill SemVer rather than silently reusing it. Product and Skill
versions may advance independently, so the bundled filename carries both.

`npm run test:release` builds the family twice, compares bytes, reads every
archive budget and digest back, extracts the standalone and bundled carriers
into clean temporary directories, verifies their internal manifests, and runs
`--version` plus real analysis through both launchers. Hosted Verify repeats this
on Linux and Windows at Node 22 and 24. Those checks prove the source-built
carriers; GitHub attachment readback and actual host discovery/load remain
different qualifications.

Preserve UTF-8 LF bytes for installed Markdown. Repository attributes for
`skills/**` should express that behavior. Raw Git objects and transport bytes
avoid accidental checkout conversion; inspect installed bytes, not only Git's
normalized representation.

## Public routes

| Public route | Canonical source and behavior |
| --- | --- |
| Stable release manifest | Serve the released `diffdevil-release-manifest.json`; it is the update and immutable-asset projection |
| Released Skill ZIP | Serve the complete canonical Skill folder named by `assets.skill` |
| Released standalone ZIP | Serve the Node 22+ install-free CLI named by `assets.standalone` |
| Released bundled ZIP | Serve the Skill and runtime named by `assets.bundled` |
| `/skill/version` | Serve `skills/versions.json` as a source projection without another maintained version value |
| `/skill/SKILL.md` | Serve canonical `skills/diffdevil/SKILL.md` as Markdown |
| `/skill/references/cli-and-evidence.md` | Serve the corresponding installed reference |
| `/skill/references/policy-and-effects.md` | Serve the corresponding installed reference |
| `/skill/references/integrations.md` | Serve the corresponding installed reference |
| `/skill/references/install-and-update.md` | Serve the corresponding installed reference |
| `/skill/references/restricted-harnesses.md` | Serve the corresponding installed reference |
| `/skill/notice.md` | Serve the accompanying source and licence notice |
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
plus `skills/versions.json`. Package qualification rejects their absence. The
containing npm release can carry an older Skill; its own frontmatter remains the
truth. A subsequent standalone Skill update does not need a new CLI release.

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

Qualify the actual payload: frontmatter/projection equality, local links, stable
manifest lookup, immutable digest readback, existing clean/modified install,
offline use, interrupted update, and host discovery/reload. Exercise representative
CLI commands separately from provider writes. No universal compatibility test
estate is required by this content contract.

Source admission, npm inclusion, website raw delivery, native host installation,
proactive activation, and provider effects each have their own observed result.
Source-only delivery does not claim those later consumer outcomes.
