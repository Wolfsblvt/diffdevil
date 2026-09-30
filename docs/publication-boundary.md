# Release and publication procedure

## Meaning

This is the operator path from accepted public source to a real diffdevil family
release. It keeps source, npm, immutable and maintained Action refs, GitHub Release,
Marketplace, security intake, hosted applications, and outside-consumer behavior
as distinct effects. It neither authorizes those effects nor calls them complete
merely because another surface succeeded.

[Release families and versioning](RELEASING.md) owns the current version, tag,
manifest and update-discovery contract. The completed `v1.0.0` sequence below is
retained as concrete open-tool evidence, not an instruction to repeat it for
extension, App or Skill releases.

## Select the family before selecting effects

The open-tool family contains npm/library, CLI, Actions and standalone runtime.
The extension, App server/dashboard and canonical Skill each have independent
versions. Select the family's candidate and exact tag from `RELEASING.md`; never
blanket-bump the repository or move an Action alias for another family's release.

| Selected release | Applicable publication and readback |
| --- | --- |
| Open tool | Registry artifact, immutable `vX.Y.Z`, corresponding release/assets and authorized Action major-alias promotion; retain Marketplace and real consumer evidence |
| Extension | `extension-vX.Y.Z`, qualified extension archive and explicitly authorized Store submission; read back the actual listing/version and installed result separately |
| App | `app-vX.Y.Z`, App-owned version/build metadata and qualified self-hosted release; explicitly authorized deployment/migrations and operator journey remain separate |
| Skill | `skill-vX.Y.Z`, complete canonical Skill archive and matching manifest; an optional bundle names both Skill and runtime versions; no npm or Action effect is implied |

Prepare only the selected manifest/assets. The family-scoped carrier builder and
its commands are documented in [Skill distribution](integration/agent-skill-distribution.md).
Publish the exact manifest asset set, not a directory wildcard. Preserve published
asset bytes and tags. Set other families' GitHub releases not to become the
repository's promoted Latest; promotion of an open-tool release is explicit.
Consumers still use family-aware discovery rather than trusting that global badge.

For each family, inspect exact-head checks, actual included engine/source,
applicable dependencies/notices and installed or operated consumer behavior.
Inspect npm ownership only for an npm effect, Store credentials only for a Store
effect, and service/migration authority only for those operations. Do not turn
unrelated providers into prerequisites. A shared correctness/security change still
accounts for all affected consumers and any outstanding rollout.

## Start from the accepted source

The public repository is the delivery root. There is no private ancestor, nested
source archive, or second checkout to publish. Inspect the exact current candidate,
tracked files, remotes, generated distribution, and workflow effects before every
release operation rather than relying on a recorded clean state.

The selected first stable identity is `@wolfsblvt/diffdevil@1.0.0`. Package and
lock metadata already carry `1.0.0`, and the committed Action distribution carries
the same version. **A release operator must not claim an npm package, immutable
tag, GitHub Release, maintained Action alias, or Marketplace listing until its
provider readback says so.** For `v1.0.0`, all five publication coordinates are
now read back public; remote Action execution remains a separate consumer result.

Private originals, Company-room coordinates, local dependency caches, transfer
archives, worktrees, and verification artifacts are not public release assets.
Publish reviewed Git history and the package files selected by `package.json`, not
a working-directory ZIP. A clean worktree alone does not prove history privacy.

## Re-resolve the final candidate

Before the first external open-tool effect:

1. read the current owning release room and final candidate commit;
2. confirm the candidate tree contains the accepted release copy, qualification,
   mixed-content licence dispatch, `SECURITY.md`, generated Action bytes, and no
   unintended application/source artifact in the npm package;
3. inspect current GitHub checks for that exact head and every red, missing,
   skipped, pending, or wrong-head result;
4. rerun the exact-lock advisory check against the registry;
5. confirm npm package ownership/authentication and the GitHub release/Marketplace
   operator route without creating an effect; and
6. apply the complete-destination comparison: the CLI/package/Action release may
   ship while the hosted playground and managed App remain explicitly owned active
   product Work.

The repository's exact-candidate verification remains required before integration,
even when a change does not trigger an executable publication. Earlier executable
evidence remains true for its own tree; it is not silently borrowed across a
changed candidate or substituted for actual publication readback.

## Qualification already established

The maintained [Qualification](qualification.md) records the accepted source
boundaries separately:

- native Windows Node 24 verification, conformance, installed-package launchers,
  declarations, schemas, presets, and all four install-free Actions;
- hosted Linux Node 22/24 and Windows Node 24 consumer matrices;
- independent cold review and the accepted source repairs;
- a private live canary for label-definition creation/readback, managed assignment
  change and no-op, hostile-head policy confinement, stale-plan refusal, one owned
  comment update, and split policy/effect credentials; and
- explicit unobserved boundaries, including native macOS, a genuine external-fork
  event, and a real live partial-write failure.

The automated suites use fake GitHub HTTP. The live canary proves its own provider
journeys; neither form of evidence substitutes for the other.

## Licence and content boundary

The npm artifact contains more than one kind of content:

- reusable engine, TypeScript API, CLI, Actions, tools, and mapped executable
  examples: **MIT**;
- application and hosted-service software when present: **AGPL-3.0-only**;
- original documentation prose and reusable explanation: **CC BY 4.0**;
- product name, slogans, logo, mascot, artwork, screenshots, and other visual
  identity: reserved unless separately licensed; and
- third-party dependencies: their own licences and notices.

Root package metadata uses `SEE LICENSE IN LICENSE.md`; the shipped dispatch points
to the component map. The separate install-free Action runtime remains MIT plus
third-party notices. Verify these bytes in the packed artifact rather than
assuming repository placement becomes npm placement.

## Prepare only real release copy

Before publication, release-sensitive copy may describe the accepted candidate
and exact qualification, but it keeps unavailable coordinates conditional:

- no registry/version badge before npm readback;
- no claim that `@v1` resolves before the alias exists;
- no Marketplace claim before the provider listing resolves;
- no hosted-playground or managed-App link before that service is publicly read
  back; and
- no private canary or Company-room link in public package documentation.

Repository-owned dated release notes carry each family's product result,
compatibility, trust model, rights, qualification and deliberately unfinished
surfaces. [Current release guidance](manual/help/releases.md) is the reader entry
point. At publication, currentize the selected note's availability and exact
immutable identity. Do not rewrite old dated accounts or make one family's
success imply another channel is available.

## Publication effects and order

Perform each newly authorized effect once, reconcile it before any retry, and
read it back before independent copy claims it exists. The first open-tool release
used this sequence; its exact version is already published and is not republished.

1. **npm:** publish `@wolfsblvt/diffdevil@1.0.0`; read registry metadata, tarball
   integrity, README, licence dispatch, exports, bin, engines, and package contents.
2. **Immutable Git ref:** create `v1.0.0` at the exact accepted release commit and
   verify the remote object.
3. **GitHub Release:** publish `v1.0.0` with the repository-owned release notes and
   verify rendered release state.
4. **Maintained Action alias:** create or move `v1` to that same commit, then read
   both refs before remote Action execution.
5. **Marketplace:** publish the root Action with primary category **Continuous
   integration** and secondary **Utilities**. `Code quality` is deliberately not
   selected; diffdevil does not claim that line counts establish quality, risk,
   complexity, or merge authority.
6. **Security:** read back repository private vulnerability reporting and the
   public `SECURITY.md` route.

The `v1.0.0` publication completed this sequence. Its Marketplace listing is
public at [GitHub Marketplace](https://github.com/marketplace/actions/diffdevil)
with the selected categories **Continuous integration** and **Utilities**.
The outside-consumer journey below is also complete: private canaries exercised
both `v1.0.0` and `v1` through root, `/actions/analyze`, `/actions/apply`, and
`/actions/sync-labels`, with real provider reads and bounded effects. A genuine
external-fork event and a live partial-write failure remain unobserved.

The Marketplace UI may require an owner-bound Developer Agreement, 2FA, or account
confirmation. Surface the exact physical step only if the live UI requires it;
do not invent owner homework from documentation or perform a substitute effect.

A public repository alone publishes none of these surfaces. npm success does not
create Action refs. A tag does not create Marketplace availability. A Release does
not prove remote Actions start. Preserve the furthest exact fact when one later
surface fails.

## Outside-consumer proof

After publication, prove the real coordinates outside every source checkout.
The examples below identify the completed first open-tool release. Subsequent
releases use their actual selected version, never republish or relabel `1.0.0`.

### npm package

1. create a fresh directory containing only a private ESM `package.json`;
2. install `@wolfsblvt/diffdevil@1.0.0` from the registry, without a local tarball,
   path, or source-checkout dependency;
3. execute the installed platform launcher, `--version`, analyze/query/check, root
   ESM API, `/core`, `/language`, `/policy`, `/git`, `/github`, and strict TypeScript
   declarations;
4. inspect installed schemas, presets, documentation, package metadata and licence
   dispatch; and
5. prove the consumer cannot borrow diffdevil's checkout dependencies or source.

### GitHub Actions

The completed authorized disposable canary ran root, `/actions/analyze`,
`/actions/apply`, and `/actions/sync-labels` against both immutable `v1.0.0` and
maintained `v1`. It compared meaningful reports, outputs, and effects rather
than run IDs or timestamps, and retained:

- one read-only analysis;
- one real no-op;
- one managed-label change;
- definition verify/apply;
- the split `policy-token` / `github-token` route; and
- successful startup from every remote metadata coordinate with no consumer
  installation.

The live canary also covered definition creation/readback, managed-label change
and no-op reconciliation, trusted-base policy confinement, stale-plan refusal,
and an owned-comment update. Its evidence does not claim a genuine external-fork
event or a live partial-write failure.

Retire only the canary's temporary workflow/fixture through its existing owning
Work after the final state and evidence remain encounterable.

## Ambiguous or partial effects

npm publication, ref movement, GitHub Release creation, and Marketplace submission
are externally durable operations. When a response is ambiguous, reconcile the
original attempt before retrying. Never republish an unknown npm version, move
`v1` while its current target is unknown, or create a second Release because the
first response was inconveniently vague.

A failed later surface holds that surface and its dependent public claim, not
already-read-back earlier effects. Record the exact performed state, repair the
remaining route, and currentize copy to the truth that exists. The same rule applies
to extension Store submission and App deployments/migrations: a timeout does not
prove the original operation had no effect.

## Hosted applications remain separate

The first read-only playground Worker is public at
[`diffdevil-playground.wolfsblvt.workers.dev`](https://diffdevil-playground.wolfsblvt.workers.dev)
from accepted `main@a2fb057`. Its richer configurable experience and the managed
GitHub App retain their own source, review, provider, deployment, installation,
retention, and lived-use evidence. Neither blocks the open package/CLI/Action
release, and that release does not claim or erase them.

A documentation website, custom domain, social preview, richer history, and App
administration remain product Work in their natural homes. Repository guides are
the canonical documentation source meanwhile; do not create a separately edited
wiki or CMS merely to make the first release look furnished.
