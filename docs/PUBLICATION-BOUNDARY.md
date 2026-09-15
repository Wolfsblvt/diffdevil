# Release and publication procedure

## Meaning

This is the remaining operator path from a locally qualified candidate to a real
public release. It keeps the source tree, npm package, distributed Actions, hosted
canary, licence, and public availability distinct. It does not authorize those
external effects or claim that they have happened.

## Use the publication repository, not the private development archive

The final private development return preserves full earlier history, caches, raw
references, and recovery material. It is not a public upload. The separately
prepared **public repository carrier** contains the reviewed tracked tree and a
clean-root Git history. Start the public repository from that carrier; do not push
all branches from the private development repository. No historical development
commit has been destroyed to prepare the clean publication root.

The public edition of `reference/` keeps substantive research and qualification
returns. It does not depend on private source-input links. Before the first push,
inspect `git status --short --branch`, `git log --all --oneline`, `git remote -v`,
and `git ls-files`. No remote is configured in the prepared carrier. A Git history
can disclose material absent from today's files; a clean worktree is not a history
privacy check.

## Local qualification

With the exact source checkout and the locked dependencies installed:

```sh
npm run verify
npm run test:conformance
npm run test:package
npm run test:actions
```

Run under Node 24 on native Windows to close the outstanding platform boundary.
Node 22 remains the CLI/library floor; both Node 22 and 24 are exercised on Linux.
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

## Select licence and release identity

The current package remains `private: true`, `license: UNLICENSED`, version
`0.0.0-development`. No project licence has been selected. An authorized release
change must add the owner's chosen licence text and matching package metadata,
select the release version, and intentionally change `private` before npm
publication. Dependency licences are preserved in the Action distribution and do
not choose a project licence.

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
