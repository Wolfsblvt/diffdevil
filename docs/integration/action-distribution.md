# Action distribution

## Meaning

This manual owns the install-free artifact consumed by all four diffdevil Actions:
its paths, native-ESM packaging choice, dependency and generated-source boundaries,
rebuild contract, consumer qualification and limitations. The Action behavior and
input/output contract remain in [GitHub Actions](github-actions.md).

## What a consumer receives

| Metadata | Executed path, relative to that metadata | Shared implementation |
| --- | --- | --- |
| `/action.yml` | `actions/runtime/lib/actions/root.js` | `actionMain('root')` → `runAction` |
| `/actions/analyze/action.yml` | `index.mjs` | imports `../runtime/lib/actions/analyze.js` |
| `/actions/apply/action.yml` | `index.mjs` | imports `../runtime/lib/actions/apply.js` |
| `/actions/sync-labels/action.yml` | `index.mjs` | imports `../runtime/lib/actions/sync-labels.js` |

Every metadata file selects `runs.using: node24`. No `pre` script, package install,
compiler invocation, network download or global tool is needed in the consumer
workflow. The three sub-actions are siblings of the shared runtime; copying only
one subdirectory is not a complete distribution. An ordinary repository checkout
or Git archive containing all tracked files carries the necessary siblings.

The runtime contains compiled ESM/CJS, source maps, standalone schema validators,
its own ESM package boundary, 12 exact locked runtime package trees, their original
redistribution notices, and `MANIFEST.json`. Including metadata, wrappers, the
surface catalog and manifest, this cut has **1,141 generated files**. This is a
**multi-file native-ESM distribution**, not a single-file minified bundle.

The root npm package is separate: its tarball installs normal runtime dependencies
and exposes the CLI and public TypeScript APIs. It does not carry this entire
Action runtime. Package success and Action success are separately qualified.

## Why this route

The current dependency closure is JavaScript/data, with no native addon or
platform executable in the shipped runtime. Chevrotain is ESM; YAML/Ajv and the
standalone validator have existing package/CommonJS boundaries. Native Node
resolution preserves those boundaries and their relative assets without adding
an import rewriter, dynamic-require shim, custom resolver or bundler plugin chain.

GitHub's JavaScript-Action guide requires dependencies to be present, warns that
checking in `node_modules` can cause problems, and presents bundling as an
alternative. This implementation does **not** copy the development installation
indiscriminately: it selects the lockfile's production closure, checks installed
versions, refuses symlink/special-file distribution inputs, preserves package
notices and verifies reproducible bytes. The root `node_modules` remains ignored.
This is a deliberate packaging choice, not a claim that GitHub recommends
vendoring or that a bundle would be worse for every project.

A single-file Rollup/ncc-style bundle could reduce file count and download size,
but would add a toolchain closure and require proof for ESM, relative schemas,
CommonJS and third-party notices. No such package was needed or fetched here.
The chosen route satisfies installation-free operation without downgrading the
runtime or changing semantics. Its visible cost is a larger generated tree;
original upstream sources/readmes shipped in package trees are retained rather
than guessing which files are dispensable.

The exit cost is small: replace `tools/build-actions.mjs` and the generated
entry paths, retain the shared runners and the same isolated consumer journey.
Revisit packaging when measured startup/download cost, a changed dependency shape
or maintenance experience makes bundling materially preferable. No performance
advantage, native Windows result or supply-chain audit is inferred from this choice.

## Dependency and rights boundary

Exact package versions, lock integrity strings, package licence fields and notice
paths are in `actions/runtime/MANIFEST.json`. The current closure contains the
Chevrotain family under Apache-2.0, Ajv and several small helpers under MIT,
fast-uri under BSD-3-Clause and YAML under ISC, as identified by their supplied
packages. Original notices are included; these labels are not a fresh legal or
vulnerability review. TypeScript, Node typings and their development-only closure
are not runtime dependencies in the distribution.

Reusable diffdevil Action code is [MIT](../../LICENSES/MIT.txt), with its
[scope notice](../../LICENSES/README.md) copied into `actions/runtime/LICENSES/`.
The Action runtime package metadata records `MIT`; original third-party notices
remain distinct. npm `@wolfsblvt/diffdevil@1.0.0`, immutable `v1.0.0`, and the
maintained `v1` Action ref are public. Original documentation
prose is CC BY 4.0, runnable examples are MIT, and brand/visual assets remain
reserved under the component map.

## Regenerate and inspect

```sh
npm run build:actions
npm run verify
npm run test:actions
```

`build:actions` first uses the pinned TypeScript/Ajv build, then packages the result.
`check:actions` reconstructs it in temporary storage and compares exact bytes;
ordinary `verify` includes that comparison. The generator owns the runtime,
metadata, sub-action wrappers and generated surface fields in the catalog.
Authored behavior and input/output definitions live under `src/diffdevil/actions/`.

The manifest binds input source files and generated output hashes. It is evidence
of content/parity, **not** a signature or authentication scheme. Restore the exact
lock before rebuilding; do not upgrade or patch a vendored package by hand.
`.gitattributes` disables text normalization for the runtime so Git does not
change third-party CRLF bytes after hashing. Upstream whitespace is preserved,
while ordinary authored-source whitespace checking remains active.

## Consumer evidence

`test:actions` copies only the generated runtime and four entry surfaces to a
fresh directory outside the checkout. That consumer has no source tree, root
package manifest or root `node_modules`; it executes the exact paths named by
metadata. An external test preload replaces HTTP with an in-memory provider.
No production runner is patched and no consumer installation is performed.

The journey exercises root no-config labeling, bounded read-only analysis,
root planning, saved-report/plan application, stale report refusal, base policy,
explicit multiline comments, definition verification/reconciliation and partial
write journals. Each successful or partial result checks every declared output.
The current distributed paths execute under Node 24, with the native and hosted
consumer results bound in [Qualification](../QUALIFICATION.md). These local
processes do not emulate every GitHub-runner behavior or certify secret masking,
fork execution or the summary UI.

`artifacts/verification/actions/consumer.json` records each local execution and
runtime. The published `v1.0.0` and `v1` refs have additionally been exercised
by private live canaries across all four entry points, with real provider reads
and bounded effects. Native macOS, a genuine external-fork event, a live
partial-write failure, and the summary UI remain separate unobserved boundaries.
Full standing is in [Qualification](../QUALIFICATION.md).

## Primary sources

Consulted on September 14, 2026; the dated reasoning and exact boundaries are
preserved in [Action distribution evidence](../reference/2026-09-14/action-distribution.md).

- [Action metadata](https://docs.github.com/en/actions/reference/workflows-and-actions/metadata-syntax)
- [Creating a JavaScript Action](https://docs.github.com/en/actions/tutorials/create-actions/create-a-javascript-action)
- [Workflow commands](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands)
