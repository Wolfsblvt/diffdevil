# Agent Skill distribution

## Meaning

This document owns the source/version/content relationship for the diffdevil
Agent Skill and its GitHub Release carriers. It supports repository, package,
website, standalone-runtime, and bundled delivery without a second manual or an
update service. The installed installation reference owns consumer installation
and refresh; this document owns carrier preparation and publication mechanics.
[Release families and versioning](../RELEASING.md) owns the product-wide contract.

## One independently versioned source folder

`skills/diffdevil/SKILL.md` contains the everyday guide and `metadata.version`.
`skills/diffdevil/references/` contains its installed deeper instructions.
Any notices included in that folder travel with it.

The initial proposed skill version is `1.0.0`. This is the skill's identity,
not a claim that its first publication has happened or a requirement to match
npm `1.0.0`. A changed released instruction set receives its own version:
patch for corrections/clarifications, minor for additive capabilities, major
for a breaking skill installation or instruction interface change. Unreleased
source edits do not each require a release or version bump.

There is no universal skill-to-CLI compatibility-range matrix. Actual command
support is resolved through the installed CLI, schemas, and declarations. Keep
known required capabilities and any concrete runtime prerequisite explicit;
verify a selected bundle's actual commands. A Skill update does not implicitly
upgrade or repin a user's executable.

`skills/versions.json` is a plain projection of the Skill's declared source SemVer:

```json
{
  "diffdevil": "1.0.0"
}
```

This file is a native source projection, not a published release index. The release
builder rejects extra keys, malformed versions, and any value that differs from
canonical frontmatter. Change the frontmatter and projection together when cutting
the Skill's independently versioned instruction set.

## Build only the selected carriers

The builder supports three selections. `COMMIT` below means the full 40-character
source revision of the exact qualified checkout, not a branch name or a literal
argument to copy unchanged.

For a Skill-only candidate, use the builder directly:

```sh
node tools/build-release.mjs --family skill --source-ref COMMIT
```

This creates `diffdevil-release-manifest.json` and
`diffdevil-skill-SKILL_VERSION.zip` under
`artifacts/release/skill/SKILL_VERSION/`. It needs Node, the canonical Skill source
and repository metadata, but no compiled CLI, runtime dependency installation or
npm publication. Do not use the npm build wrapper for this path: that wrapper
intentionally compiles the engine before invoking the builder.

For the open tool's standalone runtime:

```sh
npm run build:release -- --family open-tool --source-ref COMMIT
```

This builds the engine and creates the manifest plus
`diffdevil-standalone-PRODUCT_VERSION-node22.zip` under
`artifacts/release/open-tool/PRODUCT_VERSION/`. Its runtime contains the complete
locked production dependency closure and redistribution notices, not Node itself.

Add `--include-bundle` to a selected family when that publication also supplies
an explicitly qualified Skill/runtime pair. A bundle requires the built engine
and its dependencies, even under `--family skill`; use the npm build wrapper or
prepare the engine first. The bundle is named
`diffdevil-skill-SKILL_VERSION-with-diffdevil-PRODUCT_VERSION-node22.zip` and includes
the complete canonical Skill, runtime and root launcher. It is not a third version
series. Verify that the included engine corresponds to its declared published or
newly qualified open-tool release rather than merely trusting `package.json`.

The default `--family all` retains the existing all-three-carrier qualification
path and output under `artifacts/release/PRODUCT_VERSION/`. Its manifest is marked
`family: candidate`; it is not an instruction to publish every component. Explicit
family selection prepares the actual publication manifest and only its selected
asset entries. Publish the manifest's exact asset set, not a directory wildcard
that could include stale files from an earlier build.

## Identities, integrity and publication

`productVersion` identifies the open-tool runtime, never the whole product suite.
`skillVersion` and `skills.diffdevil.version` identify the canonical instructions.
Skill-only manifests omit the unrelated runtime version; standalone internal
manifests omit the unrelated Skill version. Bundled manifests identify both.
The builder rejects a runtime `--product-version` override that disagrees with the
package it would actually include.

The manifest binds selected asset names, download URLs, SHA-256 digests,
compressed and uncompressed byte budgets, member counts, largest members,
executable/native extensions, and major dependency contributors. It also binds
the immutable source revision and, where a Skill is included, its canonical tree
digest (`treeSha256`, excluding generated carrier `MANIFEST.json`). These metadata
and integrity checks do not prove that a provider has published the assets.

A Skill release uses `skill-vSKILL_VERSION`; an open-tool release uses
`vPRODUCT_VERSION`. The builder derives corresponding default download paths.
`--release-base` can explicitly select the actual intended asset location; it must
agree with the release that is really published. Exact published assets and tags
are immutable. A new bundle may package a verified compatible component alongside
a changed one, but must identify its exact contents and must not replace an
already published archive with different bytes. Reusing an existing archive
elsewhere means reusing those exact archive bytes.

Stable discovery reads the native GitHub Releases collection, follows pagination,
filters stable tags for the requested family, and compares SemVer. The collection
is not itself a carrier manifest. Read the selected release's actual manifest
asset and confirm every advertised asset is attached. A repository-wide Latest
result cannot identify the latest Skill. The full procedure lives in
[Install and update](../../skills/diffdevil/references/install-and-update.md).

A Skill-only release need not include a bundle or standalone runtime. Missing
assets must not become invented URLs or a silent downgrade to older instructions.
The separate Skill plus compatible-runtime installation remains available. Source
projections such as `/skill/version` do not prove a newer stable release exists.

`npm run test:release` builds all carriers twice, compares bytes, reads archive
budgets and digests back, extracts standalone and bundled carriers into clean
temporary directories, verifies internal manifests, and runs `--version` plus
real analysis through both launchers. Ordinary native tests additionally exercise
the family selectors, genuinely dependency-free Skill-only packaging, manifest
asset selection and mismatched runtime identities. Hosted Verify runs these
checks on its configured platforms. A passing source-built candidate still does
not prove GitHub attachment readback or native host discovery/load.

Preserve UTF-8 LF bytes for installed Markdown. Repository attributes for
`skills/**` should express that behavior. Raw Git objects and transport bytes
avoid accidental checkout conversion; inspect installed bytes, not only Git's
normalized representation.

## Public routes

| Public route | Canonical source and behavior |
| --- | --- |
| Family release discovery | Native GitHub Releases collection, filtered for the intended stable tag family |
| Selected release manifest | The actual attached `diffdevil-release-manifest.json`, identifying only that release's selected assets |
| Released Skill ZIP | Complete canonical Skill folder named by `assets.skill`, when attached |
| Released standalone ZIP | Node 22+ install-free CLI named by `assets.standalone`, when attached |
| Released bundled ZIP | Explicit Skill/runtime pair named by `assets.bundled`, when attached |
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
injection, or minification. For stable installation, the setup handoff selects
one actual released immutable snapshot. A source-linked handoff must distinguish
that selection from the static site's own potentially older copy.

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

A released Skill change updates its relevant core/reference and version projection.
A tool behavior change updates the affected product manual and agent teaching
when needed. Reading views can contain compact examples, while complete existing
example assets and schemas retain their authoritative homes.

Qualify the actual payload: frontmatter/projection equality, local links,
family-scoped release selection, actual asset and digest readback, existing
clean/modified install, offline use, interrupted update, and host discovery/reload.
Exercise representative CLI commands separately from provider writes. No universal
compatibility test estate is required by this content contract.

Source admission, npm inclusion, website raw delivery, native host installation,
proactive activation, and provider effects each have their own observed result.
Source-only delivery does not claim those later consumer outcomes.
