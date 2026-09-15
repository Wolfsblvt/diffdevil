# Historical qualification return

## Meaning

This public evidence edition preserves the substantive qualification
return from the pre-Action implementation sequence, as archived before the
September 15, 2026 publication-preparation pass. Counts, commands, limits, and
recommendations below describe that earlier checkpoint, not current standing.
The exact original is preserved privately. Current behavior and proof are in
[Qualification](../../QUALIFICATION.md) and the maintained manuals. Artifact
paths below identify historical local evidence, not downloadable public files.

## Current observed environment

Node 22.16.0, npm 10.9.2, Git 2.47.3, TypeScript 5.8.3 and Node typings 22.15.33
were used in the Linux recovery container. No live credentials, GitHub effects,
remote, publication, public tag, or licence selection occurred.

## Commands and results

| Boundary | Actual command | Result |
| --- | --- | --- |
| Specification assets | `npm run check:prep` | 189 declared cases validated as assets, not passing runtime tests. |
| Source/declarations | `npm run build` | Passed using the installed pinned toolchain. |
| Ordinary suite | `npm test` | 130 passed; 0 failed; 0 skipped. |
| Packaged consumer | `npm run test:package` | Passed: offline installation, CLI bin, scalar query, schema asset, ESM exports, strict TypeScript consumer, closed private subpaths, bands/templates. |
| Shortcut comparison | `npm run demo:shortcuts` | Four CLI tasks and public-API formula/named retrieval pass; text selectors explicitly unavailable; Action task unimplemented. |
| Windows launchers | npm's `cmd-shim` generator inside package test | CMD and PowerShell content generated and inspected; native execution unobserved. |
| Node 24 Action | Not run | No bundles or runtime qualification yet. |
| Live GitHub | Not run | Deliberately outside this assignment. |

Transcripts are under ignored `artifacts/evidence/`; the packed artifact and its
integrity, file count, and exercised checks are in
`artifacts/package/qualification.json`. A tarball test does not qualify a later
modified tarball until rerun against those bytes.

## Supplied conformance standing

| Suite | Whole supplied cases executed | Semantic-only vectors | Remaining |
| --- | ---: | ---: | ---: |
| Paths | 14 | 0 | 0 |
| Machine output | 8 | 0 | 0 |
| Bands | 16 | 0 | 0 |
| Invalid bands | 5 | 0 | 0 |
| Templates | 7 | 0 | 0 |
| Shortcuts | 3 argument conflicts | 6 AST parity vectors | 0 without at least partial evidence |
| Boolean truth tables | 0 | 18 explicit AST inputs | 0 without at least partial evidence |
| All other supplied suites | 0 | 0 | 112 |
| **Total supplied cases** | **53** | **24** | **112** |

All executed assertions pass. The 24 semantic-only cases have **not** passed
source-text conformance: tests construct explicit ASTs instead of passing their
source strings through Chevrotain. Therefore full supplied conformance is
**53 passed, 0 observed failing, 136 not fully qualified**, not 77 or 189 passed.
Additional implementation tests account for the ordinary suite's separate total.

## Missing or unobserved at that checkpoint

Chevrotain lexing/CST parsing and source spans; YAML/configuration composition;
presets and complete rule planning; GitHub acquisition, permissions, pagination,
label assignments/definitions, comment ownership/lifecycle and retries; bundled
root and sub-Actions under Node 24; native Windows invocation; live canary and
publication. Bands and template primitives are implemented, but their presence
does not establish the full policy compiler or provider lifecycle.

The selected destination is unchanged. These are active remainder and evidence
gaps, not features removed from the product.
