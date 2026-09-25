# Releases

A source commit, npm publication, Action ref, application deployment, and extension listing are different releases. Success at one boundary does not publish the others. Choose the artifact for the surface you actually use, then verify its version or exact source identity.

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

The same ref choice applies to `/actions/analyze`, `/actions/apply`, and `/actions/sync-labels`. Their committed Node runtime is install-free for consumers; installing the npm package in a workflow does not change the source selected by an Action's `uses:` ref. Likewise, moving a maintained alias can update Action consumers without changing their workflow text.

Read [GitHub Actions](../use/github-actions.md) for the task and [Action distribution](https://diffdevil.dev/source/?f=docs%2Fintegration%2Faction-distribution.md) for packaging. Provider permissions, event activation, fork behavior, and a real effect readback still need their own evidence; a Git ref alone does not supply it.

## Skill and install-free carriers

The canonical Skill has its own SemVer in `SKILL.md` metadata. It does not have to equal the npm package version. Its selected release manifest names the immutable source commit, Skill version, asset names, and SHA-256 digests for the Skill-only, standalone install-free runtime, and bundled Skill/runtime carriers.

Verify the manifest and asset digest, install the complete folder through the actual harness's supported persistent route, then read back discovery and loaded content. A bundled runtime still needs actual execution verification. Downloaded instructions, files in a transient sandbox, and a persistent personal installation are not the same outcome.

The carrier builder and consumer qualification exist in source. The current `v1.0.0` release has no published custom carrier assets; the selected stable manifest must not be described as available merely because its URL or builder exists. An explicitly requested development installation resolves one full commit and preserves that standing instead of following mutable `main` as if it were a release. [With a coding agent](../use/coding-agent.md) and the [maintained install/update procedure](https://diffdevil.dev/source/?f=skills%2Fdiffdevil%2Freferences%2Finstall-and-update.md) own the complete route.

## Application and website standing

| Surface | Current established boundary | Separate release work |
| --- | --- | --- |
| Managed App | Worker/Queue/D1 source and a contained deployed backend canary | General admission, complete authenticated administration, history/export/offboarding qualification, final dashboard co-design, and public/commercial availability |
| Browser extension | Local-first Chrome source, build and browser qualification | Live/installed acceptance for the selected release, Store submission/publication, and any authenticated App report delivery |
| Playground | An earlier read-only measurement Worker is deployed; the complete configurable website Playground exists in source | Deploying that exact richer application/API and qualifying the public visitor journey |
| Product website and manual | Repository-owned source, explicit routes, two-host static build and joined search | Remote publication, configured live destinations, hosting/DNS adoption, and actual public-route readback |

A configured installation/dashboard/Store destination does not expose it. A Worker version created by the credential helper is not deployed. An unpacked extension is not a Store publication. An accepted website build or reserved domain is not a reachable public site.

The [Managed App](../use/managed-app/README.md) chapters describe the complete selected first-public-release capability with their top availability note. Final dashboard labels, composition, controls, routes, and interaction sequence remain co-design, not frozen release instructions. Exact commercial prices/quotas and a supported non-Cloudflare operating stack are not supplied by current source.

## Compatibility and historical accounts

Keep the package/API version separate from report, policy, expression, metric, path, and host-limit identities. A saved artifact may be structurally readable without being suitable for privileged execution. [Schemas and compatibility](../reference/language-and-contracts/schemas-and-compatibility.md) owns validation, additive reading, migration limits, and semantic-profile changes.

Dated release notes stay dated. A note correctly saying that an App or hosted Playground was absent at `v1.0.0` is not a claim that later source/deployments never happened. Conversely, a new source commit does not retroactively change that artifact. Current implementation and deployment standing belongs to [Direction](https://diffdevil.dev/source/?f=docs%2FDIRECTION.md); exact observations belong to [Qualification](https://diffdevil.dev/source/?f=docs%2Fqualification.md).

Historical notes remain available through the repository router rather than competing with current manual pages in ordinary search. For an upgrade mismatch, start with [Troubleshooting](troubleshooting.md) and include the actual surface and version/commit you ran.
