# diffdevil Decisions

## Meaning

This document records durable product and repository choices whose rationale would be expensive to reconstruct from code alone. It separates settled direction from genuinely open choices. Dated research and founding evidence remain in `reference/`; this file carries the current usable decision.

## Current decisions

### D001 — The product is `diffdevil`

**Status:** Settled
**Selected:** Lowercase `diffdevil` on every product-facing surface. Repository `Wolfsblvt/diffdevil`, package `@wolfsblvt/diffdevil`, command `diffdevil`, and configuration `.diffdevil.yml`.

**Why:** The name is self-explanatory enough for developer tooling and carries a small authored dark-cute edge through “The devil is in the diff.” The product language remains precise and composed.

**Source:** `docs/BRANDING.md`.

### D002 — One repository and one public npm package

**Status:** Settled
**Selected:** One repository contains the CLI, library, GitHub Actions, specifications, examples, and distribution build. One npm package exposes the CLI and public TypeScript API, with subpath exports where useful.

**Why:** All surfaces consume one semantic engine and should version together. Separate packages would add publication and compatibility burden before independent consumers require it.

### D003 — diffdevil is a portable diff-policy engine

**Status:** Settled
**Selected:** Pull-request size labeling is a flagship use case, not the category. The product turns diff sources into normalized facts, metrics, queries/checks, rules/bands, reports/plans, and optional GitHub effects.

**Why:** The intended value is reusable conditional power across local scripts, CI, agents, TypeScript, and GitHub, not one fixed labeler.

### D004 — Preserve raw and replacement-aware facts separately

**Status:** Settled
**Selected:** Raw additions, raw deletions, and raw churn remain visible. `replacement-lines-v1` derives mutually exclusive added-only, deleted-only, modified, and changed facts by pairing within contiguous edit blocks.

**Why:** A `+3/-3` replacement should be representable as three modified positions without hiding the six raw churn lines. Pairing across unrelated locations would invent a relationship; fuzzy semantic matching would answer a different question.

### D005 — Unknown evidence is first-class data

**Status:** Settled
**Selected:** Exact, bounded, incomplete, unmeasurable, invalid, false, zero, and empty are distinct states. The evidence model preserves correlated quantities and incomplete collections where they affect sound conclusions.

**Why:** Convenience does not justify false precision or silent loss of possible matches.

### D006 — The optional expression language is detail

**Status:** Settled
**Selected:** Human name **detail**, described as the diffdevil expression language. Machine identity `diffdevil-expr/1`; standalone files use `.ddexpr`.

**Why:** The product needs a small, deterministic language for formulas, queries, and conditions without executing user JavaScript.

### D007 — Chevrotain parses detail

**Status:** Settled
**Selected:** Chevrotain provides lexing and CST parsing. Separate AST construction, binding, type checking, evaluation, and diagnostics own meaning.

**Why:** It fits the grammar, testability, extensibility, and existing maintainer familiarity. Parser convenience must not collapse semantic phases.

### D008 — Basic use remains language-free

**Status:** Settled; aliases and teaching order are distinct
**Selected:** Presets and convenience authoring expose common CLI and Action use without requiring detail. They lower into the same policy/expression representation.

**Why:** Full depth is a product capability, not an entrance exam.

**Presentation:** Retention and teaching are settled separately; see D013.

### D009 — Action entry points and mutation stages

**Status:** Settled
**Selected:** Root Action plus `/analyze`, `/apply`, and `/sync-labels`. Analysis, plan, and apply remain distinct. The Action may perform configured label/comment effects when given appropriate permissions.

**Why:** A convenient one-step path and composable separated paths can share one core. Mutation must be explicit and inspectable.

### D010 — Root Action default

**Status:** Implemented and locally consumer-qualified; hosted evidence is separate
**Selected:** With no configuration, the root Action uses `size@1`, `replacement-lines-v1`, ensures missing size-label definitions, reconciles only the managed size group, and posts no comments. `/analyze` is read-only.

**Why:** The product should be useful immediately without a config file while remaining clear about the behavior selected by the root entry point.

### D011 — One ordinary size preset has no hidden path exclusions

**Status:** Implemented and locally consumer-qualified; hosted evidence is separate
**Selected:** `size@1` counts tracked diff material unless the user configures exclusions. It does not silently guess generated or vendor paths in an unfamiliar repository.

**Why:** Explainable defaults are safer than a universal ignore list that hides authored work or becomes stale.

### D012 — Comments and label definitions are product capability

**Status:** Implemented and locally qualified
**Selected:** Optional owned-comment lifecycle and label-definition verify/ensure/sync belong in the full product. They may arrive after the first executable analysis cut but are designed and implemented as joined product surfaces, not indefinite extras.

**Why:** The product supports convenient, reusable GitHub automation rather than a read-only counter.

### D013 — Keep aliases; teach the clearer form

**Status:** Settled, 2026-09-14.

**Selected:** Keep every supported alias. Retain collection, quantifier and path
shortcuts where they remove actual complexity. Author simple matches and arithmetic
as ordinary detail/custom formulas in examples and presentation.

**Why:** The executable comparison showed that file shortcuts remove filtering and
lambda boilerplate, while a second vocabulary for simple formulas makes teaching
harder. Retention and prominence are different choices: an alias can stay available
without being the default way every example teaches a calculation.

**Rejected:** Deleting language-free use, or blindly presenting every operation
through flags. Both routes continue to use one compiler with parity tests.

**Evidence:** The retained shortcut comparison and executable parity cases separate ergonomics from semantic equivalence.

### D014 — Public licence

**Status:** Open owner decision
**Question:** Which licence will govern the public repository and npm package?

**Current repository standing:** `UNLICENSED`, private local candidate. No public publication until selected.

### D015 — Visual identity

**Status:** Open co-design
**Selected textual boundary:** `docs/BRANDING.md`.
**Open:** Icon, logo construction, wordmark treatment, palette, visual examples, README hero composition, social/Marketplace assets, and whether a mascot earns a role.

**Revisit:** When visual assets are designed. Visual work must preserve serious developer-tool trust and the “one good pun, then competent software” rule.

### D016: Separate qualification from publication

**Status:** Settled release boundary
**Selected:** Source, packaged consumers, hosted workflows, and public publication have distinct evidence. Local qualification does not itself publish a package or authorize provider effects.

**Why:** A useful local release candidate can exist before the licence, public repository, and publication coordinates are selected. A release procedure must make those consequences explicit instead of hiding them inside verification.

### D017 — Shared TypeScript core and explicit offline qualification

**Status:** Implemented first core checkpoint, 2026-09-13.
**Selected:** Native Node tests and assertions, explicit finite numeric values,
private affine provenance for validated replacement families, and a small
Unicode-scalar path matcher implementing the selected grammar exactly. Git is
invoked as a data source with external diff and textconv disabled.

**Why:** These choices preserve the concrete selected semantics without a second
engine or a dependency on provider mutation. Generic glob libraries do not by
themselves establish the selected scalar, escaping, and globstar contract.

**Evidence boundary:** The offline compiler and Node 22 test run are not current
Node 24 Action or Chevrotain qualification. The dependency-acquisition failure
changes the available evidence, not the chosen language or complete product.

### D018 — Preserve saved custom metric numeric types

**Status:** Implemented prerelease contract repair, 2026-09-14.
**Selected:** Reports that contain `metrics` also contain an exactly matching
`metricTypes` map whose entries are `integer` or `float`. Built-in raw, line and
file measurements retain their fixed integer types.

**Why:** The prepared report stored only measurements for custom metrics. An
integral-looking float would become indistinguishable from an integer after JSON
serialization, changing typing, overflow and later arithmetic. Inferring from
the current value is incorrect. There are no released consumers or persisted
compatibility obligations in this local prerelease cut.

**Consequence:** The report schema, examples, loader, environment and tests are
updated together. Saved metric measurements do not acquire affine provenance;
formula relationships are preserved during evaluation or re-established by
re-evaluating the selected policy, never guessed from names or values.

## D019: Qualify the installed artifact and keep the offline toolchain explicit

The continuation selected one ESM package with generated declarations and a CLI
bin, using `.js` import specifiers in TypeScript source. The first package check
showed that rewritten JavaScript alone did not repair `.ts` declaration imports.
Correcting source specifiers removes a fragile declaration-postprocessing step.
The installed tarball, not the working checkout, is the consumer proof surface.

Registry DNS and CDN downloads failed in the recovery container. The available
TypeScript 5.8.3 and Node typings 22.15.33 are therefore pinned as an explicit
reproducible development toolchain, not represented as the latest releases.
Current-release dependency and Node 24 qualification remain active work. This does
not replace Chevrotain, reduce supported product intent, or select a licence.


### D020: Chevrotain source parsing joins the existing engine

**Status:** Implemented, 2026-09-14.

**Selected:** Use the SHA-256-verified Chevrotain 13.2.0 package closure as an npm cache,
install the exact runtime dependency and its closure, and retain the existing
AST, binder, type checker, evidence algebra, and interpreter. No user expression
is evaluated as JavaScript, and no fallback parser is introduced.

**Why:** Dependency transport was the obstacle, not the selected language or
runtime design. Adding a second semantic implementation would create avoidable
parity problems. The public npm artifact is unbundled ESM, so Chevrotain belongs
in runtime dependencies even though the supplied carrier is called a dev bundle.
Token/CST types remain internal; public parsing returns implementation-owned ASTs.

**Consequence:** Inline CLI source, expression files and stdin use the same
production pipeline. The complete locked dependency cache is carried in the
private return so a fresh extraction can perform `npm ci --offline`. It is neither
committed nor shipped in npm. Installed consumer evidence includes actual source
compilation, not only structured ASTs or version reads.

**Shortcut judgment:** Retain aliases, simple thresholds, file quantifiers and
path projections. Prefer normal detail for formulas rather than arithmetic flags.
The first four complete comparisons now execute both forms and the fifth executes
text definition plus named retrieval. The sixth Action comparison and YAML formula
loading remain unimplemented; D013 is not falsely closed by the local CLI result.

### D021: Keep policy semantics independent of unavailable authoring dependencies

**Status:** Implemented JSON/object slice; dependency limitation superseded by D023 on 2026-09-14.

**Selected:** Join inert version-1 objects and explicit JSON configuration to the
existing detail compiler and interpreter. Implement preset composition, static
metric graphs and numeric types, lazy read-only evaluation and desired plans in
one shared production path. Reuse existing structural validation conventions;
independently check emitted specimens against the supplied JSON Schemas. Preserve
YAML/Ajv acquisition and exact YAML source mapping as active work.

**Why:** Registry acquisition still fails and neither requested package is in the
cache. That is a transport gap, not evidence against the selected policy design.
JSON is an ordinary inert authoring/embedding surface. Writing a substitute YAML
parser or waiting with no semantic progress would increase cost without preserving
more capability. The generated size preset is checked against its authored YAML
bytes and an independently derived value digest; it does not implement YAML input.

**Consequence:** An existing `.diffdevil.yml` is never silently ignored. JSON
configuration must be explicit; `--no-config` deliberately bypasses discovery.
The two supplied YAML conformance cases stay unexecuted. Independent Python
jsonschema observations are not Ajv qualification or a new product dependency.

### D022: Keep query/check phases and desired effects semantically explicit

**Status:** Implemented, 2026-09-14.

**Selected:** A CLI/saved check is a read-only query whose result must be boolean.
It can consume completed rules, unlike a rule's own condition. Optional decision
fields still require `requirePresent` or an explicit fallback. All declarations
are statically checked; only requested roots execute. Private numeric provenance
survives named metric chains inside that request, not arbitrary JSON replay.

**Why:** Installed-package qualification exposed the incorrect reuse of the
rule-condition context for CLI checks. That restriction contradicted the selected
phase contract. A read-only check does not create inter-rule execution semantics.
Separating boolean typing from root availability repairs the capability without
weakening rule isolation or unknown handling.

**Desired-effect boundary:** Plans reject contradictory assignments and preserve
held rules' owned labels. Bound parameters and resolved template text affect policy
identity. Local diff plan targets use `--target-repo`/`--target-pr`, separate from
`--repo`/`--pr` GitHub source selection. The plan schema's PR minima were corrected
from zero to one to agree with the existing report reader and positive-PR target
contract. A transported plan is validated data, never proof of current provider
state, trusted policy or write authority.

### D023 — Use the supplied authoring dependencies without replacing the engine

**Status:** Implemented, 2026-09-14.

**Selected:** Restore locked YAML 2.9.1 and Ajv 8.20.0, including their offline package closure. YAML's
CST/document pipeline owns YAML parsing; diffdevil adds bounded inert conversion
and source provenance. Fixed product schemas become standalone validators at build
time. Runtime policy and expressions never compile arbitrary host code.

**Why:** The supplied cache removed the acquisition problem described in D021.
Using the real loader avoids a subset YAML implementation. Character mapping must
survive decoding, folding, CRLF and alias reuse so a diagnostic points to authored
text, not a plausible but wrong offset. Declaration spans and alias use spans have
different meanings and remain separate.

**Rejected:** Continuing to treat YAML as missing, substituting a handwritten
parser, or compiling caller-supplied schemas at runtime. JSON remains an ordinary
supported authoring surface; it is not retired by adding YAML.

**Consequence:** The same compiler accepts objects and parsed JSON/YAML sources.
Schema checks and model invariants remain distinct. A mapper disagreement retains
scalar precision and decoded coordinates rather than claiming a character map.
The private recovery archive carries the fifteen-package offline closure.

**Sources:** Locked YAML/Ajv package closure; the maintained diagnostics/source-map
contract; `scripts/schema-build.mjs`; executed YAML, schema and package evidence in
`docs/QUALIFICATION.md`.

## D024: Verify executable contracts without freezing narrative

**Decision.** Preparation validates machine assets and case identities, not exact
branding sentences, required document presence, or a fixed case-count quota.
The ordinary runner requires actual per-file test registrations.

**Why.** Repository verification inspection found prose locks in the preparation script and reproduced Node reporting an
empty test module as a passing wrapper. Those checks could obstruct harmless
copy changes while accepting missing executable evidence.

**Rejected.** A new documentation linter or a larger list of phrase checks would
not establish document meaning. Removing the existing 189 concrete cases is not
part of this decision; they remain independently executed by the runtime.

**Current consequence.** `npm run verify` remains the root entry. Native test
summaries determine registration; actual failures and zero discovery stay red.
Documentation quality and brand consistency remain contextual review judgments.

**Evidence.** The empty-file specimen and regression in `tests/repository-runner.test.mjs`, observed on September 14, 2026.

## D025: Keep GitHub transport small and effect evidence explicit

**Decision.** Use Node's native fetch with a narrow GitHub API client, explicit
trusted-policy selection, separate acquisition/reconciliation modules and an
operation readback journal. Retain the shared compiler and engine for every host.

**Why.** The current endpoint set needs origin-confined pagination, safe-read
backoff, inert response validation and precise partial-effect reporting. Those
behaviors fit a small platform-native adapter without another SDK/toolchain or
policy implementation. A provider acknowledgement can arrive before the desired
state is established, and an interrupted write can have succeeded.

**Rejected.** Blind mutation retries risk duplicate comments. Replacing the whole
label set can destroy unrelated metadata. Treating a saved report or plan hash as
authentication lets an untrusted artifact choose privileged effects. Adding an
SDK would not supply those product-specific trust and lifecycle decisions.

**Current consequence.** Read-only acquisition and explicit application are
separate APIs. The default apply path reacquires evidence; an explicitly trusted
report still requires fresh revision checks. Each attempted write records its
request and readback separately. Unknown and partial outcomes remain visible.
Public consumers choose their own GitHub principal; repository-specific actor rules
are not embedded as a product restriction.

**Sources.** The accepted complete-product assignment; maintained GitHub and
interchange contracts; [current API evidence](../reference/2026-09-14/github-api.md);
mocked provider and installed-package tests in `docs/QUALIFICATION.md`.

## D026: Keep local Git data-only without losing PR comparison identity

**Decision.** Disable configured clean/smudge/process filters and filesystem
monitors during Git acquisition. A PR-bound local comparison retains its merge
base in `source.base` and the current provider base tip in `source.baseTip`.

**Why.** An executed regression showed that `--no-ext-diff --no-textconv` still
lets a worktree comparison run a clean driver. Separately, a real diverged-branch
fixture showed that the correct merge base can differ from the current PR base.
Conflating those values either rejects a correct comparison or misses stale policy.

**Rejected.** Banning local Git would reduce a selected source capability.
Ignoring the executable filter would violate data-only acquisition. Replacing
the merge base with the base tip would count the wrong diff.

**Current consequence.** Git remains available through CLI, API and the implemented
Action source. The host can load trusted policy independently of hostile diff
content and binds base-loaded policy to the base observed at acquisition.

**Sources.** Accepted local-Git/trust boundary; executed filter and diverged-branch
specimens in `tests/github-git.test.mjs`; shared before-write validation.

## D027: Ship a complete native-ESM Action closure without workflow installation

**Decision.** All four Node 24 Actions use one shared runner and a deterministic,
multi-file distribution containing compiled code, static validators and the exact
production dependency closure. Runtime package boundaries and original notices
are preserved. Source, generated distribution, developer dependencies and private
handoff material remain visibly separate.

**Why.** The current JavaScript/data closure can execute directly through native
Node resolution; no bundler, Action SDK, custom resolver or runtime installation is
needed. Real isolated consumers on Node 22 and 24 exercise metadata-selected paths,
so the choice is supported by more than an in-checkout import. It retains the full
selected host behavior rather than substituting a dependency-starved size labeler.

**Trade-off.** GitHub warns that checked-in dependencies can cause problems and
presents bundling as an alternative. This closure is selected from the exact lock,
not a blind copy of development `node_modules`, and rejects symlink/special files.
Its larger file count and retained upstream sources are a real cost. There is no
claimed performance, security-audit or universal portability advantage. No new
package was fetched or required, and no project licence was selected.

**Consequence and exit.** `build:actions` owns generated bytes; `check:actions` is
part of ordinary verification, while the isolated consumer journey stays separate.
A later bundler can replace the packaging script and generated paths without
changing host semantics or tests. Reopen on measured download/startup cost,
maintenance evidence, or a dependency shape that no longer fits native resolution.

**Sources.** The accepted install-free Action frontier;
[distribution manual](integration/action-distribution.md);
[dated primary-source evidence](../reference/2026-09-14/action-distribution.md);
executed consumer and parity results in [Qualification](QUALIFICATION.md).
