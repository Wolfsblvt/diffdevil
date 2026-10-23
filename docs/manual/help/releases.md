# Releases

A source commit, npm publication, Action ref, application deployment, and extension listing are different releases. Success at one boundary does not publish the others. Choose the artifact for the surface you actually use, then verify its version or exact source identity.

## Why your tools can have different versions

diffdevil is one product family with independently released tools. The library, CLI, Actions and standalone runtime share an open-tool version. The browser extension, App and Agent Skill each have their own version; their numbers do not need to catch up with one another.

| Tool | What its version identifies | Update against |
| --- | --- | --- |
| CLI, TypeScript library, Actions and standalone runtime | The open-tool release | That package/release and your selected pin or Action alias |
| diffdevil for GitHub | The browser extension release | Your browser's extension channel or the selected extension release |
| diffdevil App | The server and dashboard service release | The operated/deployed App release; self-hosters follow its upgrade instructions |
| diffdevil Skill | The canonical agent instructions | The published Skill release, independently of npm |

For example, an extension `1.3.0` can contain analysis engine `1.7.4`, matching CLI `1.7.4`. These illustrative numbers describe different things; a lower extension number does not establish that it is outdated. About/support details should distinguish the tool version from the engine and exact source it contains. Do not update one tool merely to match another's number.

Release tags identify their family: `vX.Y.Z` for the open tool, `extension-vX.Y.Z`, `app-vX.Y.Z`, and `skill-vX.Y.Z`. A repository-wide Latest badge is not a latest-version answer for every family. Check the release and distribution channel you actually use; a GitHub extension release does not prove the same version is already available in the Store. Release notes identify which tools contain a shared improvement and any separate rollout.

The App's current metadata has no named release selected. A deployed backend or an npm `1.0.0` package is not an `app-v1.0.0` release. Server and signed-in application share the App family, including self-hosted Community; an operator also records the exact source/build and database migration state. The website, manual and learning surface use build/source identity rather than additional public SemVer families.

## Published open tools and current source

The published open-tool release is `v1.0.0`: npm `@wolfsblvt/diffdevil@1.0.0`, the CLI and TypeScript API, the root and three sub-actions, the `v1.0.0` source ref, maintained Action alias `v1`, GitHub Release, and Marketplace entry. The [dated release account](https://diffdevil.dev/source/?f=docs%2Freleases%2Fv1.0.0.md) and [Qualification](https://diffdevil.dev/source/?f=docs%2Fqualification.md) retain its exact source and consumer/provider evidence.

Current repository source includes later application, browser, documentation, and release-carrier work. A checkout still declaring package version `1.0.0` does not make those later bytes part of the published `1.0.0` npm artifact. Source-linked reference pages describe the selected source snapshot; compare that identity with your installed distribution when a feature differs.

The source identities below are generated from this checkout's metadata. They are not a query of npm, GitHub release assets, a Store listing, or deployed versions.

<!-- manual:generated release-source-identities -->
| Source identity | Declared value | Canonical metadata |
| --- | --- | --- |
| Package source version | `1.0.0` | [Package metadata](../../../package.json) |
| Package Node.js floor | `>=22` | [Runtime requirement](../../../package.json) |
| Skill source version | `1.0.0` | [Complete Skill source](../../../skills/diffdevil/SKILL.md) |
| Extension source version | `1.0.0` | [Extension manifest](../../../apps/browser-extension/manifest.json) |
| App named release version | Not selected | [App release metadata](../../../apps/github-app/release.json) |
| action.yml | `node24` | [Action runtime declaration](../../../action.yml) |
| actions/analyze/action.yml | `node24` | [Action runtime declaration](../../../actions/analyze/action.yml) |
| actions/apply/action.yml | `node24` | [Action runtime declaration](../../../actions/apply/action.yml) |
| actions/sync-labels/action.yml | `node24` | [Action runtime declaration](../../../actions/sync-labels/action.yml) |
<!-- /manual:generated release-source-identities -->

## Choose and verify an npm version

Use an exact package version when reproducibility matters; use your project's lockfile to retain the resolved distribution. Verify the executable that your shell or script actually selects rather than assuming a global install and a project-local package are the same copy.

```sh
npm install --save-dev @wolfsblvt/diffdevil@1.0.0
npx diffdevil --version
```

The install command contacts the registry and changes the project dependency/lock files. It is an adoption command, not an offline qualification specimen. For an existing installation, inspecting its version need not update it. [CLI](../use/cli.md) owns the local setup and [TypeScript library](../use/typescript-library.md) owns package import boundaries.

Before updating, read the relevant release account and compatibility contract, preserve working policy, and exercise representative exact and unresolved results. An npm update does not install a Skill into a persistent agent scope, upgrade an independently deployed App, or submit an extension.

## Pin Actions at the intended stability boundary

`Wolfsblvt/diffdevil@v1` selects the maintained major alias. A version tag such as `v1.0.0` selects a named release; a full commit SHA is the strongest exact-byte source pin. The release source for `v1.0.0` is `0827485c9d3795ef58a7934cd7a4b8b3fb5cc9c5`.

The same ref choice applies to `/actions/analyze`, `/actions/apply`, and `/actions/sync-labels`. Their committed Node runtime is install-free for consumers; installing the npm package in a workflow does not change the source selected by an Action's `uses:` ref. Likewise, moving a maintained alias can update Action consumers without changing their workflow text. Extension, App and Skill releases do not move those aliases.

Read [GitHub Actions](../use/github-actions.md) for the task and [Action distribution](https://diffdevil.dev/source/?f=docs%2Fintegration%2Faction-distribution.md) for packaging. Provider permissions, event activation, fork behavior, and a real effect readback still need their own evidence; a Git ref alone does not supply it.

## Skill and install-free carriers

The canonical Skill has its own SemVer in `SKILL.md` metadata. It does not have to equal the npm package version. Select a published `skill-vX.Y.Z` release for Skill updates and an open-tool `vX.Y.Z` release for standalone runtime updates. Read the actual selected release's manifest and attached assets rather than constructing a repository-wide `latest/download` URL.

A Skill-only release need not contain a standalone or bundled runtime. A bundled archive identifies both the Skill and runtime versions and must be used as that explicit combination; newer instructions alone do not silently upgrade your executable. When no matching bundle is published, the supported separate Skill/runtime installation remains available.

Verify the manifest and asset digest, install the complete folder through the actual harness's supported persistent route, then read back discovery and loaded content. A bundled runtime still needs actual execution verification. Downloaded instructions, files in a transient sandbox, and a persistent personal installation are not the same outcome.

The carrier builder and consumer qualification exist in source. The current `v1.0.0` release has no published custom carrier assets; the selected stable manifest must not be described as available merely because its URL or builder exists. An explicitly requested development installation resolves one full commit and preserves that standing instead of following mutable `main` as if it were a release. [With a coding agent](../use/coding-agent.md) and the [maintained install/update procedure](https://diffdevil.dev/source/?f=skills%2Fdiffdevil%2Freferences%2Finstall-and-update.md) own the complete route.

## Application and website standing

| Surface | Current established boundary | Separate release work |
| --- | --- | --- |
| Managed App | Six analytical destinations, chart/cloud system and Manage implemented and locally qualified; separate runtime/backend canary and ingress evidence | Named App release, joined production deployment and real authentication, repository/history/brief/commercial journeys; general public admission and paid availability |
| Browser extension | Local-first Chrome source, installed-build qualification and signed-in acquisition, with rebuildable caches and explicit continuation | Acceptance of the exact distributed release, Store submission/publication, and any authenticated App report delivery |
| Lens Studio (Playground) | An earlier read-only measurement Worker is deployed; the configurable browser learning surface and report/head API exist in source | Deploying the matching richer application/API and qualifying the public visitor journey |
| Product website and manual | Repository-owned source, explicit routes, two-host static build and joined search | Remote publication, configured live destinations, hosting/DNS adoption, and actual public-route readback |

A configured installation/dashboard/Store destination does not expose it. A Worker version created by the credential helper is not deployed. An unpacked extension is not a Store publication. An accepted website build or reserved domain is not a reachable public site.

The [Managed App](../use/managed-app/README.md) chapters describe the implemented analytical and Manage experience with their top availability note. The selected desktop design and controls exist in source; whole-App light theme, phone, public analytics and operator views remain separate work. [Planned prices and repository allowances](../use/managed-app/plans-and-sharing.md) are selected, while monthly import budgets, production operating qualification and purchasable availability remain outstanding. Cloudflare is the supported first adapter; a Docker deployment is not supplied by this contract.

## Take the next action for your surface

For the extension, rebuild the selected source, reload its Chrome extension card and reload open GitHub tabs. Inspect its packaged build information when diagnosing a version mismatch. A source manifest number does not establish that those bytes reached the Store; the product page offers a Store link only when an actual destination is configured and available.

For the App, use the operator's admitted installation/sign-in route. Self-hosters select the complete Community source or a verified App release manifest, review migrations and qualify the actual deployment unit before enabling repositories. A public App release describes Community source; a privately composed premium edition has an additional source/composition boundary. A frozen archive, installed billing connector or plan card is not evidence that premium code or live payments are available.

For website downloads and agent carriers, select the family and actual attached assets from the release you intend to use. Verify their integrity and consumer requirements. The public site's download instructions, its own static build, the Lens Studio API and the two documentation/product hosts each require matching publication. Opening a frozen teaching example does not prove that live public-PR acquisition works.

## Compatibility and historical accounts

Keep the package/API version separate from report, policy, expression, metric, path, and host-limit identities. A saved artifact may be structurally readable without being suitable for privileged execution. [Schemas and compatibility](../reference/language-and-contracts/schemas-and-compatibility.md) owns validation, additive reading, migration limits, and semantic-profile changes.

Dated release notes stay dated. A note correctly saying that an App or hosted Playground was absent at `v1.0.0` is not a claim that later source/deployments never happened. Conversely, a new source commit does not retroactively change that artifact. Current implementation and deployment standing belongs to [Direction](https://diffdevil.dev/source/?f=docs%2FDIRECTION.md); exact observations belong to [Qualification](https://diffdevil.dev/source/?f=docs%2Fqualification.md).

Historical notes remain available through the repository router rather than competing with current manual pages in ordinary search. For an upgrade mismatch, start with [Troubleshooting](troubleshooting.md) and include the actual surface, version/channel, and engine/source you ran.
