# Release families and versioning

## Meaning

diffdevil is one product family with one deterministic engine and independently shipped tools. Versions identify what a person installs or operates, not the state of the entire repository. [D044](DECISIONS.md#d044-version-the-tools-people-install-not-the-whole-repository) records this decision and its rationale. This document owns the maintainer contract; the reader-facing [Releases](manual/help/releases.md) page explains updates and different version numbers.

This contract does not publish a package, move an Action alias, submit an extension, deploy an application or announce availability. [Publication procedure](publication-boundary.md) retains those separately authorized effects. Published versions and historical release accounts remain immutable.

## Version ownership

| Family | One shared version covers | Canonical metadata | Exact release tag |
| --- | --- | --- | --- |
| Open tool | npm library/core and public exports, CLI, root Action, three sub-actions, standalone runtime | Root `package.json`; lock and generated distributions agree | `vX.Y.Z` |
| Browser extension | diffdevil for GitHub and its distributed browser builds | `apps/browser-extension/manifest.json` | `extension-vX.Y.Z` |
| App | Managed App server and dashboard together, including the corresponding self-hosted release | `apps/github-app/release.json` | `app-vX.Y.Z` |
| Agent Skill | Canonical `skills/diffdevil/` instructions across distribution formats | `metadata.version` in `skills/diffdevil/SKILL.md`; `skills/versions.json` is its source projection | `skill-vX.Y.Z` |

`X.Y.Z` is the selected family version, not a shared generation. Existing open-tool `v1.0.0` and the maintained Action alias `v1` keep their meanings. Browser stores can publish the same extension release at different times without becoming separate version families. Material browser-specific behavior or packaging changes are still extension changes.

The App metadata currently contains `version: null`: no named App release has been selected. It is not version zero, an npm version, or a declaration that the existing canary is a published service release. Before its first named release, select the App SemVer there and include it with the exact source/deployment identity in operator diagnostics. Server and dashboard share that service version; a deployment ID or database migration counter does not replace it.

The website, manual, Playground and internal implementation packages do not gain public SemVer tracks merely because they are separate directories or deployments. Record their exact deployed/build source; a Playground build also identifies its engine. A genuinely new independently consumed package needs a release-boundary decision, not an automatic counter.

## When a version changes

Apply [Semantic Versioning](https://semver.org/) to each family's own public contract. A merged PR does not automatically produce a release or increment every manifest. Classify all changes included since the family's previous release, then select the next version before cutting artifacts.

| Change | Consequence |
| --- | --- |
| Backward-compatible fix to shipped behavior, security or packaging | Patch release of the affected family |
| Backward-compatible capability | Minor release of the affected family |
| Incompatible public-contract change | Major release of the affected family, with migration guidance |
| Shared engine/dependency change | Assess every consuming family and release those adopting changed contents or behavior |
| Documentation/site-only change outside a selected executable artifact | No forced executable release |
| Action-only interface/distribution fix | Open-tool release; state when CLI behavior is unchanged |
| Extension-only GitHub layout or settings fix | Extension release only, unless its candidate also adopts shared-engine changes |
| App-only dashboard/operation fix | App release/deployment only, not npm, Actions or Store publication |
| Canonical Skill instruction fix | Skill release; an existing compatible runtime need not be released again |

The open tool deliberately accepts bounded coupling: an Action-only fix can advance the npm/CLI/standalone family even when those consumers' behavior is unchanged. These are closely related distributions of one open tool. This exception does not extend to the extension, App or Skill.

Never align major or minor numbers for appearance. A breaking library API change need not make the extension a major release when its user contract remains compatible. A shared policy-language change can require coordinated upgrades across several families, but their resulting version numbers need not match.

Public contracts include supported runtimes, CLI and Action interfaces, settings/configuration, machine outputs, promised semantics, persisted data and upgrade behavior. Classify a dependency change by its actual effect on that consumer, not automatically as either patch or major. A shared engine fix is not an excuse to publish unchanged unrelated tools.

## Identify the actual contained engine

Tool and engine versions answer different questions. An extension `1.3.0` can contain engine `1.7.4`, matching CLI `1.7.4`; these are illustrative numbers, not release assignments.

Each released distribution or service build makes its family, version, channel, included engine and exact source/build identity inspectable. A compound download identifies both Skill and runtime versions and the compatibility actually exercised. Keep this in existing manifests, receipts and build/deployment metadata; do not introduce a universal version service, suite counter, whole-source hash locks or a second engine. D041's rejection of Action input-hash churn remains intact.

A later checkout whose `package.json` still says `1.0.0` is not necessarily the published `1.0.0` package. Development metadata retains its exact revision and unreleased standing rather than presenting that declared version as proof of stable bytes. Dirty or unavailable source identity stays explicit. A stable consumer uses qualified published engine contents or identifies changed engine contents as a new qualified open-tool release. Unrelated commits do not require a new engine version when its selected closure is unchanged and that equivalence is established.

An extension release that also bundles changed core code is not merely an extension-only fix. Repackaging an already qualified unchanged engine with a changed wrapper does not itself require republishing npm, but its compound artifact must identify what it actually contains. An already published archive is never replaced with different bytes under the same identity.

The extension builder preserves the source manifest's version, uses the root package version only as the declared engine identity, and emits packaged `build-info.json` plus its build receipt. These record both versions and source/cleanliness with unpublished-build standing. They are build evidence, not Store availability. The existing candidate `version_name` remains source-only until deliberately prepared for an actual release.

## Shared changes and compatibility

Independent releases must not introduce independent meanings of Changed, policy evaluation or evidence. For an engine correctness, security, policy or schema change, account for affected npm/Action/standalone, extension, App and Playground consumers in the change or release account. State which builds include it, which are unaffected, and any outstanding rollout or mitigation. npm success does not establish that a fix shipped everywhere.

Exercise shared conformance with equivalent inputs, policy and available evidence. Preserve host acquisition/execution differences explicitly; matching version numbers alone do not prove parity. Avoid a mandatory matrix for unchanged consumers when cheaper relevant evidence establishes their standing.

Report, configuration, expression, metric, agent-projection and protocol/schema identities retain their own compatibility rules. An application or npm major does not silently change `version: 1`, `diffdevil-expr/1` or a metric profile. See [Schemas and compatibility](manual/reference/language-and-contracts/schemas-and-compatibility.md).

The Skill makes known required capabilities and concrete runtime prerequisites explicit, then verifies the executable's actual help, schemas and supported commands. No universal Skill-to-CLI compatibility matrix is introduced. A bundled runtime is selected and exercised explicitly. App releases document supported self-hosted upgrades and data migrations; rolling back service code does not establish that its database can safely roll back.

## Tags, channels and latest-version discovery

Exact release tags are immutable. Stable tags use the family table. Prerelease tags retain that prefix and a SemVer suffix, such as `extension-v1.4.0-rc.1`; they are not stable update candidates. Development builds retain source identity and development standing rather than inventing a published release.

Only the open tool owns moving Action major aliases such as `v1`. Extension, App and Skill publication must never move them. Exact-SHA Action pins remain exact. See [Action distribution](integration/action-distribution.md).

Reserve GitHub's promoted Latest release for the stable open tool: promotion is explicit, and other families use `make_latest: false`. That display convention is not a family-aware discovery API. Consumers still filter actual release records.

For stable discovery, read the repository's [GitHub Releases collection](https://api.github.com/repos/Wolfsblvt/diffdevil/releases), follow pagination, exclude drafts and prereleases, require the intended tag prefix and a valid stable version, and compare SemVer numerically within that family. Read the selected release's actual attached manifest/assets. Do not assume the first page or most recent publication has the greatest version, invent missing asset URLs, or silently substitute an older release when a selected release is inconsistent. See the [GitHub release API](https://docs.github.com/en/rest/releases/releases).

Up to date is relative to the tool and selected channel. A GitHub extension archive does not prove the same version cleared a Store. Registry, Store, release-asset and managed-deployment readbacks are separate facts. No update prompt compares an extension number with npm, or moves a stable installation to a prerelease without a channel choice. Unknown freshness remains unknown, not a failure of the installed tool.

## Browser version constraints

The extension manifest, never root `package.json`, owns the browser update number. Stable extension releases use three numeric components satisfying [Chrome's version rules](https://developer.chrome.com/docs/extensions/reference/manifest/version): no leading zeroes, no all-zero version, and each component at most 65535. `version_name` is display text, not update ordering.

A SemVer prerelease suffix cannot be copied into Chrome's numeric `version`. Development previews retain explicit candidate/source standing. Before publishing a prerelease update channel, document its monotonic numeric mapping and separate channel/listing so it cannot accidentally overtake stable consumers. Do not silently strip a suffix or rely on build metadata for ordering. Stable submission must deliberately remove or replace the unpublished-candidate display text; this document does not submit anything.

## Skill, standalone and bundled carriers

| Carrier | Release identity |
| --- | --- |
| Skill-only | Skill version under `skill-vX.Y.Z` |
| Standalone runtime | Open-tool version under `vX.Y.Z` |
| Bundled Skill/runtime | Explicit pair of versions, source and integrity metadata; no third suite version |

In carrier metadata, `productVersion` means open-tool/runtime, not an umbrella version. `skillVersion` and `skills.diffdevil.version` mean canonical instructions. Skill-only metadata omits unrelated runtime versions; standalone internal metadata omits unrelated Skill versions. A bundle names both.

`tools/build-release.mjs --family skill` produces only the Skill archive and manifest without building the engine. `--family open-tool` selects the standalone runtime; `--include-bundle` adds a qualified pair when intended. The default `all` preserves all-three-carrier qualification and marks its manifest as a candidate. Exact commands, inputs and output paths belong to [Skill distribution](integration/agent-skill-distribution.md), not a second copied recipe here.

A selected publication advertises only its actual attached assets. Use a clean intended output or select the manifest's exact asset list; never publish a directory wildcard containing stale files. A Skill-only update need not include a new bundle. A consumer can install those instructions beside a compatible existing runtime. An absent bundle is disclosed, not invented or replaced with older instructions silently.

A changed wrapper or material installation payload is classified in its owning family or explicit component-pair artifact, not hidden by reusing a published archive identity. Reusing an existing archive in another location means identical bytes. Published assets, canonical components and compound wrappers remain distinguishable.

## Public presentation and release communication

Label the installed surface: `diffdevil CLI 1.7.4`, `diffdevil for GitHub 1.3.0`, `diffdevil App 1.2.0`, `diffdevil Skill 1.1.0`. Put engine/source detail in About or diagnostics. Preserve the CLI's existing machine-consumable version output rather than changing it just for branding.

Hosted users normally need service/feature availability, not a version-management chore. Operators and self-hosters need exact App release/build identity. Support requests identify the surface, version/channel, engine/source and relevant comparison evidence rather than merely “diffdevil 1.x”. Do not display unverified Up to date claims.

Keep [one joined release history](releases/README.md) with clearly labeled family entries. A coordinated announcement states which releases contain the feature and each channel's availability. Family-specific fixes do not require suite launches; documentation-only PRs do not invent executable release notes. Dated notes stay dated.

## Preparing the next release

Resolve the chosen family, previous immutable release, new version and exact candidate. Classify everything newly included, including shared code, packaging and dependencies. Update only the owning metadata and affected derivatives, never a blanket repository bump.

Build and exercise the actual distributed consumer. Check version/source identity, supported runtime, compatibility, dependency closure, notices, archive contents and migration/update behavior. Generated Actions retain their rebuild-and-compare procedure. An old green run or matching metadata is not proof for changed bytes.

Prepare the family-scoped release account and exact asset manifest, then perform only separately authorized effects through [Publication procedure](publication-boundary.md). Read actual registry, tag, alias, Store and deployment identities back. A failed later channel does not erase an earlier successful publication, nor does earlier success prove the later one.

This adoption does not renumber `v1.0.0`, publish absent custom assets, or declare the App or extension generally available. Current source versions remain candidates until cut. The App's first named release still needs its selected non-null version and operator diagnostic/deployment integration; Store release preparation still needs truthful candidate display/channel handling. Those are concrete release obligations under this settled contract, not another product-design fork.
