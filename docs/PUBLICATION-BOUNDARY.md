# Release and publication procedure

## Meaning

This is the remaining operator path from a locally qualified candidate to a real
public release. It keeps the source tree, npm package, distributed Actions, hosted
canary, licence, and public availability distinct. It does not authorize those
external effects or claim that they have happened.

## Start in this checkout

This repository is the public-source candidate. Its `main` begins at a clean public
root and retains subsequent public refactoring commits. There is no second checkout
to select, no private ancestor to push, and no nested public-source ZIP to unpack.
Before the first push, inspect `git status --short --branch`, `git log --all --oneline`,
`git remote -v`, and `git ls-files`. No remote was configured during preparation.

`docs/reference/` preserves cleaned technical research and substantive returned
evidence. Private originals are not public source. Local transfer material under
ignored paths is never a release asset: push the reviewed Git history, not a ZIP of
the entire working directory. A clean worktree alone does not prove history privacy.

## Local qualification

With the exact source checkout and the locked dependencies installed:

```sh
npm run verify
npm run test:conformance
npm run test:package
npm run test:actions
```

The [current qualification](QUALIFICATION.md) records a native Windows/Node 24
pass for this candidate. Node 22 remains the CLI/library floor, with earlier
Linux Node 22 evidence. Re-run affected commands after a source or release-identity
change rather than treating an earlier runtime result as fresh evidence.
`test:package` exercises installed CLI dispatch, declarations, and package metadata;
`test:actions` exercises all four distributed paths outside the checkout. Neither
needs a real token or live GitHub. Retain the JSON evidence and logs for the exact
candidate. See [Development](DEVELOPMENT.md) for the command scope.

Read the source/effect boundary independently before a write-capable canary. The
same author's final inspection is useful but is not an independent security review.
Review trusted policy acquisition, stale comparison checks, comment ownership,
partial write journals, output transport, and the install-free dependency tree.
The code can be reviewed directly; no reconstruction or new implementation is
expected for those boundaries.

## Use the selected licences and select release identity

Wolf and Nyxara selected **MIT** for the reusable engine, package, CLI and Actions,
and **AGPL-3.0-only** for application and hosted-service software. The [licence
map](../LICENSES/README.md), both full texts, and matching package/Action SPDX
metadata are in this checkout. Content and asset rights remain a separate open
decision. The npm package remains `private: true`, version
`0.0.0-development`. Select the release version and intentionally change
`private` before npm publication. Dependency licences are preserved separately
in the Action distribution.

Use npm's version command without creating a Git tag, or update `package.json`
and the root lockfile metadata together. Rebuild the generated distribution with
`npm run build:actions`; then run the four qualification commands again. The CLI
version follows installed package metadata. The package test includes a different
release-version specimen to prevent a frozen development banner from surviving.
Review current advisories for the exact dependency lock before external release;
offline installation is not an advisory check.

Update only release-sensitive copy after selecting real coordinates. The user
quickstart intentionally targets `Wolfsblvt/diffdevil@v1` but does not claim the ref
exists yet. An immutable reviewed SHA can be used instead. Do not invent a SHA,
CI badge, package version badge, or a private security contact.

## Create source and qualify hosted behavior when authorized

Create/connect the public repository and push the clean publication history only
under the separate publication grant. Shipped Action code must be present in that
commit; GitHub consumers do not run `npm install`. A push can activate included
workflows and repository settings, so inspect those effects first.

Use an authorized disposable repository for the canary. Copy the quickstart with
the candidate's exact public commit SHA, allow its declared permission, and verify
size-label creation/reconciliation and summary output on an ordinary and a fork PR.
Then verify a custom base-policy file, a changed/retargeted PR, read-only analyze,
and an opt-in comment. Record the actual actor, effective permissions, source
revision, labels/comments, outputs, and partial failures. Do not test against a
valuable repository as a substitute for a disposable target.

No personal token setup is required for the standard workflow-token recipe. A
provider denial may reflect repository policy rather than an engine defect.
Do not weaken trust checks just to obtain a green canary.

## Publish the selected surfaces

A public repository alone does not publish npm or create a `v1` Action ref. After
local and hosted acceptance, the release operator separately publishes the
selected npm version, creates the immutable version release and intended `v1`
major alias, and configures Marketplace only if selected. Follow current official
provider publication instructions at execution time rather than relying on this
local cut to authorize or perform them.

Confirm the real npm install, all remote Action coordinates, and release assets
from an outside consumer. Establish a real private security-reporting route and
responsible receiver before promising one. The website, wiki-like help rendering,
logo/social preview, and Marketplace visuals may follow; repository user guides
already work as the canonical documentation source.
