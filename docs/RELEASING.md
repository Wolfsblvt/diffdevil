# Release families and versioning

## Meaning

diffdevil is one product family with one deterministic engine and independently shipped tools. Versions identify the release a person installs or operates, not the state of the entire repository. This document is the maintainer contract for version ownership, compatibility, release identity and publication. [D044](DECISIONS.md#d044-version-the-tools-people-install-not-the-whole-repository) records the decision and rejected alternatives; the reader-facing [Releases](manual/help/releases.md) page explains updates and mismatched version numbers.

This contract does not publish a package, move an Action alias, submit an extension, deploy an application or announce availability. [Publication procedure](publication-boundary.md) retains those separately authorized effects. Existing published versions and historical release accounts remain immutable.

## Release families

| Family | One shared version covers | Version authority | Release tag |
| --- | --- | --- | --- |
| Open tool | npm library and its public exports, CLI, root Action, three sub-actions, standalone runtime | Root `package.json` version; lock and generated distributions agree with it | `vX.Y.Z` |
| Browser extension | diffdevil for GitHub and its distributed browser builds | `apps/browser-extension/manifest.json` version, not the root package version | `extension-vX.Y.Z` |
| App | Managed App server and dashboard as one service release; the same release offered to self-hosters | App-owned release metadata established before its first named release; never inferred from the root package or a deployment counter | `app-vX.Y.Z` |
| Agent Skill | Canonical `skills/diffdevil/` instructions and their distribution formats | `metadata.version` in `skills/diffdevil/SKILL.md` | `skill-vX.Y.Z` |

`X.Y.Z` denotes the selected family version, not a shared generation. The existing open-tool `v1.0.0` and maintained Action alias `v1` keep their meanings. Browser builds of the same extension release do not become independent products merely because stores publish them at different times. A material browser-specific behavior or packaging change is still an extension release change.

The website, manual, Playground and internal implementation packages do not acquire additional public SemVer tracks merely by being deployed or residing in their own directories. Record their exact deployed/build source. A Playground build also identifies the engine it contains. A genuinely new independently consumed package needs an explicit release-boundary decision, not an automatic version counter.

The App currently has no established public service-release number. Selecting its first number and adding its app-owned metadata are release preparation, not a reason to label today's deployed canary as a published App release. The server and dashboard are not separately numbered by default.

## What causes a version change

Each family follows [Semantic Versioning](https://semver.org/) against its own documented public contract. A merged PR does not automatically produce a release or increment every manifest. Collect and classify changes since that family's previous release, then select its next version before cutting its artifacts.

| Change | Version consequence |
| --- | --- |
| Backward-compatible fix to a family's shipped behavior, security or packaging | Patch release of that family |
| Backward-compatible capability added to that family | Minor release of that family |
| Incompatible change to that family's public contract | Major release of that family, with migration guidance |
| Shared engine/dependency change | Assess every consuming family; release those whose shipped contents or supported behavior change |
| Documentation/site-only change outside a selected artifact | No forced executable release |
| Action-only public-interface or distribution change | Open-tool family release; explicitly say when CLI behavior is unchanged |
| Extension-only GitHub layout or settings fix | Extension release only, unless the candidate also adopts changed shared-engine bytes |
| App-only dashboard or operational fix | App release/deployment only; no npm, Action, Skill or Store publication by association |
| Canonical Skill instruction fix | Skill release; an existing compatible runtime need not be released again |

The open tool deliberately accepts bounded coupling: an Action-only fix can advance the npm/CLI/standalone family version even when those consumers have unchanged behavior. These are closely related distributions of one open tool. This exception does not extend to the extension, App or Skill.

Version numbers never catch up for cosmetic consistency, including at major or minor boundaries. A breaking library API change does not automatically require an extension major release when its user contract remains compatible. A policy-language or measurement change can require coordinated upgrades across several families, but their resulting version numbers need not match.

Family contracts include more than function signatures: supported runtimes, command and Action interfaces, documented settings/configuration, machine outputs, promised semantics, persisted data and upgrade behavior can all matter. Classify an engine dependency change by the actual effect on each consumer. Do not classify every dependency update as either a patch or a breaking change without examining it.

## One engine, explicit contents

A product version and its contained engine version answer different questions. For example, an extension `1.3.0` can contain open-tool engine `1.7.4`; both can be current. These are illustrative versions, not release assignments.

Each released distribution or service build must make the following inspectable through its artifact metadata and support/diagnostic route:

- its family, version and channel;
- the included engine's declared open-tool version and exact source/build identity;
- the exact source revision of the application or wrapper when different;
- for a compound download, the individual Skill and runtime identities and their verified compatibility.

Keep this information in existing manifests, receipts and build/deployment metadata. Do not add a second engine implementation, a universal version service, whole-source hash locks or a new mandatory public suite version. Archive digests remain useful integrity checks; the Action input-hash approach rejected by D041 stays rejected.

A checkout whose `package.json` still says `1.0.0` can contain newer code than the immutable published `1.0.0` package. Development metadata must therefore label it as an unreleased/source build and retain its exact revision. It must not identify those bytes as the published engine solely by copying the package version. A stable consumer must either use the qualified published engine bytes or qualify and identify the changed engine as a new open-tool release. Unrelated commits do not force an engine release when the selected engine closure is unchanged and that equivalence is established.

Bundling unpublished changed core code into an extension while continuing to report the old stable engine identity is not an extension-only fix. Conversely, adopting an already released unchanged engine does not authorize publishing that engine again.

## Shared changes and compatibility

Independent releases must not create independent meanings of Changed, policy evaluation or evidence. For an engine correctness, security, policy or schema change, identify affected npm/Action/standalone, extension, App and Playground consumers in the change or release account. State which builds include it, which are unaffected, and any remaining rollout or mitigation. Do not call the change shipped everywhere because npm succeeded.

Exercise shared conformance with equivalent inputs, policy and available evidence. Host acquisition and execution differences must remain explicit; matching numbers alone do not establish parity. An unchanged consumer does not need publication merely to satisfy a checklist.

Report, configuration, expression, metric, agent-projection and protocol/schema identities retain their own compatibility rules. Neither an application major nor an npm version silently changes `version: 1`, `diffdevil-expr/1` or a metric profile. See [Schemas and compatibility](manual/reference/language-and-contracts/schemas-and-compatibility.md).

The Skill declares and verifies the runtime capabilities/version range it actually needs. Installing newer instructions must not silently upgrade or repin a user's executable. A bundled runtime is selected explicitly and exercised as an installed consumer. The App documents supported self-hosted upgrade paths and any data migrations; a service rollback does not imply its database can safely be rolled back.

## Channels, tags and update discovery

Exact release tags are immutable. Stable tags follow the family table. Prerelease tags use that same prefix and a SemVer prerelease suffix, for example `extension-v1.4.0-rc.1`; they are not stable update candidates. Development builds retain a source revision and development standing rather than inventing a published release.

Only the open-tool family owns the existing moving Action major aliases such as `v1`. An App, extension or Skill release must never move them. Exact-SHA Action pins stay exact. See [Action distribution](integration/action-distribution.md).

A repository-wide GitHub `latest` result is not a family-aware update answer. Reserve the repository's promoted Latest release for the stable open tool when publishing: explicitly select `make_latest` for that open-tool promotion and set it to `false` for other families. Even with that convention, family discovery filters the actual release records rather than depending on a global shortcut.

For stable family discovery, read the repository's [GitHub Releases API collection](https://api.github.com/repos/Wolfsblvt/diffdevil/releases), follow its pagination, exclude drafts and prereleases, require the intended tag prefix and a valid stable version, and compare versions numerically within that family. Read the actual selected release's assets. Do not assume the first API page or most recent publication is the highest version, and do not invent a download URL for an absent asset. See the [GitHub release API](https://docs.github.com/en/rest/releases/releases).

A tool is up to date relative to its own family and selected distribution channel. The latest GitHub extension source/archive is not proof that the same version has cleared a browser store. Registry, Store, GitHub release assets and managed-service deployment readback are separate availability facts. No update UI compares an extension version with the npm version or upgrades a stable installation to a prerelease without a channel choice.

## Browser version constraints

The source manifest owns the extension version. Builders preserve it and record the engine version separately; they must not overwrite it from root `package.json`. Stable extension releases use three numeric components that satisfy [Chrome's manifest version rules](https://developer.chrome.com/docs/extensions/reference/manifest/version), including the per-component limit of 65535. `version_name` is display text, not an update-ordering mechanism.

A SemVer prerelease suffix cannot be copied directly into Chrome's numeric `version`. For development previews retain explicit candidate/source standing. Before publishing a prerelease update channel, choose and document a monotonic numeric mapping and separate channel/listing that cannot overtake stable consumers accidentally. Never silently strip a suffix or use build metadata as an update-ordering workaround. The existing unpublished-candidate `version_name` must not survive an actual stable Store submission as if it were still source-only.

## Skill, runtime and compound archives

The canonical Skill version is independent of the runtime. Existing archive flavors remain useful:

| Archive | Identity and owning release |
| --- | --- |
| Skill-only | Skill version; published under the Skill family |
| Standalone runtime | Open-tool version; published under the open-tool family |
| Bundled Skill/runtime | Explicit pair of Skill and open-tool versions, plus source and integrity metadata; no third suite version |

The existing `productVersion` field in release-carrier metadata names the open-tool/runtime version. It is not an umbrella version for the extension, App or Skill. `skillVersion` and `skills.diffdevil.version` name the canonical Skill. Keep these meanings consistent in builders, examples and consumers.

`npm run build:release` may build several candidate flavors together as a qualification convenience. That does not require publishing every flavor or publishing npm. The selected release's manifest and attached assets must agree exactly: a Skill-only release must not advertise standalone or bundled downloads that were not attached. Family publication may reuse an already published, verified unchanged component; it may not silently rebuild different bytes under that component's old version.

A compound archive is identified by its exact component tuple and qualified contents. A release account states where that bundle is published and which engine it includes. Reusing a bundle elsewhere means reusing the identical archive bytes; a changed component, wrapper, executable closure or material installation payload requires a new applicable version/identity, not replacing the previous asset. Do not derive a bundled filename from whatever unrelated release happens to be Latest.

A Skill-only update remains possible when no new bundle is warranted. The consumer can install that Skill beside an already compatible runtime. If the selected release has no bundled asset, say so and use the explicitly supported separate-install route; do not silently choose an older Skill or claim an absent bundle exists. The maintained [Skill distribution contract](integration/agent-skill-distribution.md) and [install/update procedure](../skills/diffdevil/references/install-and-update.md) own the full routes.

## Present versions without making users decode the repository

Use surface-qualified labels: `diffdevil CLI 1.7.4`, `diffdevil for GitHub 1.3.0`, `diffdevil App 1.2.0`, `diffdevil Skill 1.1.0`. Keep the actual engine version and exact source in About/diagnostic details. Preserve the CLI's existing machine-consumable version interface rather than changing it just to add branding.

The extension can say `Extension 1.3.0; analysis engine 1.7.4`. Hosted users normally need service availability and feature information, not an upgrade prompt; operators and self-hosters need the exact App release/build. Never display an unverified Up to date claim. Support requests identify the surface, its version/channel, engine/source and relevant comparison evidence, not merely “diffdevil 1.x”.

Maintain one joined product release history with clearly labeled family entries. A coordinated feature announcement names which releases contain it and each channel's availability. A family-specific fix does not need a fictional suite launch, nor does a docs-only PR need an invented executable release note. Dated notes remain dated; current guidance links to them without rewriting historical availability.

## Preparing and publishing a family release

Resolve the chosen family, its previous immutable release, the intended new version and the candidate source. Account for all changes included since that family's previous release, including shared code and packaging. Update only the owning metadata and genuinely affected derivatives; do not run a blanket repository version bump.

Build and exercise the actual distributed consumer. Check version/source identities, compatibility, dependency closure, notices, archive contents and any migration/update behavior. Keep generated Actions under their existing rebuild-and-compare procedure. Qualification is performed on the exact candidate; an old green run or a matching manifest number is not proof for changed bytes.

Prepare the family-scoped release account and manifest using actual assets and availability. Keep one coherent explanation of the user result, breaking changes, upgrade path and affected surfaces. Do not advertise Store/service availability before provider readback. Publication needs its own authorization; this versioning decision is not that grant.

Publish only the selected family effects under [Publication procedure](publication-boundary.md), read them back, and record the actual resulting release/registry/store/deployment identities. Never overwrite an already published exact version. Moving an Action alias, accepting App traffic, applying migrations and submitting to a Store are distinct effects even when several are coordinated.

## Adoption in the current repository

This decision does not retroactively renumber `v1.0.0`, change its bytes, publish custom assets that are not present, or declare the App/extension generally available. Existing source versions can remain as unreleased candidates until the relevant family is actually cut.

Before the next release, use this contract to verify the chosen family's metadata, scoped tag/discovery, manifest-to-asset agreement, engine provenance and public display. The extension build's former root-version overwrite must be removed. Skill install instructions must select a Skill release rather than use a repository-wide `latest/download` URL. App release metadata and operator build identity must be established before its first named release. These are concrete release obligations, not a new product-design fork or permission to ship inconsistent metadata.
