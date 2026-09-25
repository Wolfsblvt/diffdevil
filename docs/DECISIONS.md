# diffdevil Decisions

## Meaning

This document records durable product and repository choices whose rationale would be expensive to reconstruct from code alone. It separates settled direction from genuinely open choices. Dated research and founding evidence remain in `docs/reference/`; this file carries the current usable decision.

## Current decisions

### D001 — The product is `diffdevil`

**Status:** Settled
**Selected:** Lowercase `diffdevil` on every product-facing surface. Repository `Wolfsblvt/diffdevil`, package `@wolfsblvt/diffdevil`, command `diffdevil`, and configuration `.diffdevil.yml`.

**Why:** The name is self-explanatory enough for developer tooling and carries a small authored dark-cute edge through “The devil is in the diff.” The product language remains precise and composed.

**Source:** `docs/branding.md`.

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

### D014 — License reusable components under MIT and application/service components under AGPL-3.0-only (2026-09-15)

**Status:** Settled by Wolf and Nyxara for the reusable/application software split. D030 separately settles documentation, example, and product-identity rights.

**Decision:** `diffdevil` uses different open-source licences according to the role of each product surface. Reusable components intended for unrestricted embedding and downstream integration are licensed under the **MIT License**. This includes the portable diff engine, public TypeScript API/npm package, CLI, GitHub Action, and comparable reusable integration surfaces. Application and hosted-service components are licensed under **GNU AGPL-3.0-only**. This includes the website application, interactive hosted functionality, GitHub App runtime, hosted service backend, and comparable product/application surfaces. These components may remain in the same repository and release lifecycle. Repository topology is not determined by licence boundaries.

**Why:** `diffdevil` is deliberately designed as infrastructure that other developers and companies can embed in CI, scripts, GitHub Actions, coding-agent workflows, internal tooling, and other software. A permissive licence materially reduces adoption and integration friction for those reusable surfaces. The website and hosted runtime serve a different purpose. They are applications rather than embedding primitives, and there is no product requirement to enable proprietary modified forks of those applications. AGPL-3.0-only preserves source reciprocity for modified network-operated derivatives while allowing the MIT-licensed engine to remain broadly reusable. A single repository-wide licence would optimize one product surface at the expense of the other.

**Consequences:**

- The repository is intentionally multi-licensed by component. [The licence map](../LICENSES/README.md) names current paths and their material standing.
- MIT-covered reusable code may be consumed by AGPL-covered diffdevil application code while retaining its MIT notices.
- Consumers embedding the reusable engine, CLI, package, or GitHub Action receive the permissive MIT terms applicable to those components.
- Modified derivatives of AGPL-covered application/service components remain subject to AGPL-3.0-only, including its network-use source-availability requirements where applicable.
- The website and documentation remain colocated with the product when that serves contribution and release coherence; licensing does not require a repository split.
- Package metadata, licence notices, and ambiguous source files must make their applicable licence explicit.
- D030 assigns original documentation prose to CC BY 4.0, runnable examples to MIT where practical, and reserves product and visual identity. Those terms remain distinct from this software split rather than inheriting by proximity.

**Rejected alternatives:** Licensing the entire repository under AGPL-3.0-only would create unnecessary adoption and legal-review friction for the public library, CLI, and GitHub Action surfaces explicitly intended for broad integration. Licensing the entire repository under MIT would enable proprietary modified forks of the website and hosted application/runtime where reciprocal open-source terms better match the product model.

**Source:** Wolf's 2026-09-15 licensing instruction in this named diffdevil release conversation; Nyxara joined the decision. Reopen only for a concrete legal incompatibility or a product surface that does not cleanly fit either category.

### D015 — Visual identity

**Status:** Settled visual system; production adoption remains open.

**Decision:** diffdevil uses E3/W1/T2 with Foundation A: the E3 heavy-face split devil-head symbol with a literal tilde and negative-space gutter, a lowercase W1 technical wordmark, and the T2 tail only on standalone wordmarks. The system is smoky dark by default and system-adaptive with an authored light theme; IBM Plex Sans and IBM Plex Mono are its product typefaces. Magenta carries brand and interaction, never evidence or status. [`../packages/design/`](../packages/design/) is the canonical reusable design package; its SVG assets remain reserved.

**Why:** The selected identity gives diffdevil a memorable authored presence while retaining the serious, precise posture required for developer infrastructure. Keeping the complete supplied reference package avoids reducing the decision to a logo summary or treating a design sheet as executable website source.

**Consequences:** `docs/branding.md`, this decision, the project map, and the licence map name the settled system and its source home. The admitted reference bytes remain preserved; the explicit-light `--accent-text` cascade defect is recorded separately in [`../packages/design/ERRATA.md`](../packages/design/ERRATA.md). The GitHub App uses the same product mark. Favicon, App-upload, and social rasters are reproducible, untracked derivatives of the canonical SVGs unless a named consumer requires one exact source-served raster. Production still owes the derivation path, self-hosted font subsets, runtime theme behavior, and accessibility/responsive qualification through [the visual implementation Work](https://github.com/Wolfsblvt/emergency-meeting/issues/475). This decision does not implement those surfaces or settle later dashboard co-design.

**Rejected or superseded:** The prior open visual-co-design standing is superseded. Generic mascot-led, horror-oriented, or novelty-package visual directions were not selected; neither is a second identity exploration required before source adoption.

**Source:** Wolf's accepted identity/public-surface return, preserved by [the design source-input record](https://github.com/Wolfsblvt/emergency-meeting/issues/483#issuecomment-5722715573) and admitted at `main@efdc72f`; [the reconciliation Work](https://github.com/Wolfsblvt/emergency-meeting/issues/474) carries this durable-source update. Reopen only for a material product or visual-system change.

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
contract; `tools/schema-build.mjs`; executed YAML, schema and package evidence in
`docs/qualification.md`.

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

**Evidence.** The empty-file specimen and regression in `src/diffdevil/tests/repository-runner.test.mjs`, observed on September 14, 2026.

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
interchange contracts; [current API evidence](reference/2026-09-14/github-api.md);
mocked provider and installed-package tests in `docs/qualification.md`.

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
specimens in `src/diffdevil/tests/github-git.test.mjs`; shared before-write validation.

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
[dated primary-source evidence](reference/2026-09-14/action-distribution.md);
executed consumer and parity results in [Qualification](qualification.md).

## D028: Group the single product and nest prerelease sub-actions

**Decision.** Keep one package. Product code, tests, schemas, language contracts
and presets share `src/diffdevil/`. Documentation, runnable examples and dated
research share `docs/`. Repository tools share `tools/`. Shipped Action code and
sub-action entry points share `actions/`; only the one-step `action.yml` remains
at the root as a provider entry convention.

**Why.** The previous root exposed implementation details, examples, presets,
schemas, language contracts, tests, build scripts and three small wrappers as
separate peers. That made ownership and handoff harder without creating any real
independent product or release boundary.

**Consumer consequence.** Root Action, CLI command and public library imports are
unchanged. The three sub-action addresses become `/actions/analyze`,
`/actions/apply`, and `/actions/sync-labels`. This is an intentional prerelease path
change; no published compatibility is claimed and no duplicate old-root wrappers
are maintained. Metadata, generators, tests, tarball paths and user examples move
together. Generated runtime dependencies remain complete and notices are preserved.

**Limits.** This is a responsibility grouping, not an npm workspace split, a new
build system, or a directory-count enforcement rule. Current consumers are proved
by the ordinary suite, installed-package journey and isolated distributed Actions.
See [the project map](PROJECT-MAP.md) and [Qualification](qualification.md).

## D029: Keep one engine across reusable and managed application surfaces

**Status:** Settled product destination, 2026-09-15. Implementation sequence remains current Work.

**Decision.** The complete diffdevil product includes the public npm package and
TypeScript API, CLI, root and three sub-actions, the *diffdevil for GitHub* browser
extension, managed GitHub App, public read-only PR playground, and
website/documentation experience. Every surface uses the same deterministic engine,
policy semantics, report and plan contracts, and effect boundaries. The extension
projects those same facts and local or repository policy into a personal GitHub view;
it does not become a second analyser merely because it runs in the browser.
Repository-owned policy remains authoritative over hosted defaults. The application
surfaces remain in the same repository and release lifecycle; this decision does not
freeze their exact directory layout.

**Why.** A repository should be able to move from local scripts to Actions, add a
personal in-place GitHub view, and then use managed operation without changing what a
measurement, policy, decision, or effect means. The playground should demonstrate the
real product rather than a hand-maintained approximation, the browser extension should
bring Changed into GitHub without requiring repository installation or writes, and the
GitHub App should remove operating burden rather than introduce a second engine or
hidden policy system. Keeping the joined surfaces together also preserves contribution
and documentation coherence.

**Rejected.** Treating the current CLI/library/Action cut as the complete product;
classifying the extension, website, playground, or App as optional presentation;
making the extension a website-specific approximation or independent policy engine;
building a second hosted measurement or policy implementation; splitting application
code into another repository before an independent lifecycle requires it; or reducing
the open product to create artificial hosted-service value.

**Current consequence.** The MIT package, API, CLI, and Actions remain fully capable.
Browser extension, website, playground, GitHub App runtime, hosted configuration,
orchestration, and service software use AGPL-3.0-only under D014. Hosted value comes
from operation, administration, continuity, scheduling, history, scale, and support.
Application implementation proceeds inside out from useful vertical behavior and
shared contracts rather than beginning with a generic hosting control plane.

**Sources.** [Vision](VISION.md), [Direction](DIRECTION.md), and D014.

## D030: License original documentation openly while reserving product identity

**Decision.** Original documentation prose and reusable explanation are CC BY 4.0. Runnable code, workflow, shell, expression, and policy/configuration examples are MIT. The product name, slogans, logo, mascot, artwork, screenshots, and comparable brand or visual assets remain reserved unless an asset-specific decision later changes that boundary. The [component map](../LICENSES/README.md) states the file and npm-artifact scope.

**Why.** The first stable npm artifact includes the root README and user documentation beside MIT engine code. Readers need permission to reuse teaching material without being told that all package content is MIT, while the identity and future visual presentation need their own deliberate policy. The selected licences follow what each surface is meant to do, not its proximity in the repository or tarball.

**Rejected.** Treating all npm contents as MIT would misstate the prose and brand boundary. Leaving original docs without a public reuse grant would make the released manual less useful. Applying a software licence to marks and artwork merely because they appear in docs is not selected.

**Current consequence.** The reusable engine, API, CLI, and Action software remain MIT, and the separate Action runtime package keeps `MIT` metadata. The mixed npm artifact uses `SEE LICENSE IN LICENSE.md`; that top-level dispatch points to the component map for its MIT software, CC BY 4.0 documentation, MIT examples, reserved identifiers, and third-party terms. Quoted or linked third-party material does not receive a diffdevil grant. The first stable identity `@wolfsblvt/diffdevil@1.0.0` is a candidate until npm and release refs are actually published and read back.

**Sources.** D014, the inspected npm file list, [npm package licence metadata](https://docs.npmjs.com/files/package.json/#license), and [Creative Commons legal code](https://creativecommons.org/licenses/by/4.0/legalcode).

## D031: Allow a separate read credential for trusted Action policy

**Decision.** The Actions accept an optional `policy-token`. When present, it is
used only to acquire base or immutable pinned policy and repository-relative
templates. `github-token` remains the credential for PR acquisition and every
label/comment effect. Both credentials are masked and redacted. Without
`policy-token`, the existing single-credential route is unchanged.

**Why.** A live private canary showed that the deliberately PR-write-only
Automaton installation can reconcile labels and owned comments but cannot read
repository Contents, while the ordinary workflow token can perform the narrow
trusted-policy read. Expanding the App installation would collapse two distinct
responsibilities and is unnecessary for the selected operation.

**Rejected.** Requiring every writer to gain Contents read would broaden its
credential role. Restricting custom policy to inline workflow text would remove a
supported repository-owned policy path. Treating a read credential as an
alternate writer would make the separation cosmetic.

**Current consequence.** Callers may combine a read-only policy credential with a
separate PR-write credential. The policy transport is passed only to the trusted
policy loader; acquisition and effect modules receive the GitHub transport.
Focused two-client tests prove the separation in both directions. This does not
grant credentials, change provider permissions, or establish live behavior until
the distributed Action is rerun with both real tokens.

**Sources.** The current provider qualification and settled public-v1 direction;
[Action guide](manual/start/label-pull-requests.md); two-client Action tests.

## D032: Keep the open tool primary and the optional App complete

**Decision.** diffdevil is an open-source CLI, TypeScript library, and workflow Actions tool with an optional managed App. The playground is a separate free public learning/configuration experience, not the App or an account funnel. The complete App includes native check summaries, labels, owned comments, installation/preset setup, a configuration dashboard, and opt-in history. Its selected repository permission set includes `Checks: write`.

**Why.** Optional hosted operation removes maintenance and adds administration/continuity; it does not redefine the product as a paid service with a restricted open tier. A canary is evidence for part of the selected result, not authority to discard another part. Native checks were part of the intended App experience and were incorrectly excluded by the narrow first-tranche contract.

**Rejected or superseded.** Hosted-first positioning; making open-tool behavior deliberately inconvenient to encourage subscriptions; treating a labels-only installed canary as App completion; the earlier App-wide interpretation of the first tranche's Checks/dashboard exclusions. This joins D029's complete-product destination rather than replacing it with only the open-tool release.

**Current consequence.** The full App and standalone playground journeys remain selected implementation beyond the current local measurement form. The source remains one repository: reusable software MIT, application/service software AGPL-3.0-only under D014, with D030's separate content/brand rights. Self-hosting is intentional and documented in the operator material, not hidden or made the primary homepage pitch. A source licence does not grant official-service identity.

**Sources.** Owner-directed co-design settlement of 2026-09-17; [Vision](VISION.md); [App architecture](integration/github-app.md); [playground experience](manual/use/playground.md); [GitHub Checks API](https://docs.github.com/en/rest/checks/runs); [GNU AGPL v3](https://www.gnu.org/licenses/agpl-3.0.en.html).

## D033: One conventional config, explicit host layers, and partial settings

**Decision.** Retain root `.diffdevil.yml` as the single conventional repository file. Do not add automatic alternative-path discovery or automatic `<owner>/.github` configuration. Explicit file paths and immutable trusted external policy reuse remain supported. CLI/Actions compose presets, selected repository policy, and supported invocation/Action step-level overrides; the App composes presets, account/organization defaults, and explicitly supplied repository overrides.

**Why.** A provider-neutral CLI deserves a provider-neutral configuration home. Another implicit repository fetch would add trust, network, version, and precedence surprises. Keeping the current name is a deliberate product choice, not a requirement to preserve an unused prerelease convention. Optional hosting earns its convenience without sabotaging deliberate self-operated reuse.

**Rejected or superseded.** Maintaining two automatically discovered file locations; four universal layers applied to every host; hidden dashboard inheritance in Actions; requiring a whole configuration copy when only one convenience setting changes; generic deep-merging of executable rule definitions. Existing append/replace controls and valid explicit policy-source routes are not removed.

**Current consequence.** Only supplied values override inherited settings. Partial convenience maps, including individual size thresholds/labels, resolve against lower layers before complete validation and coherent generated-group rewriting. Named executable declarations continue to replace the same-ID declaration as a whole; arrays retain their documented replace/explicit-append semantics. The current compiler still requires complete supplied size maps, so shared resolver/schema/CLI/Action support is an explicit implementation remainder, not a claim that new partial examples run already. The dashboard and `explain` show origins and export ordinary policy.

**Sources.** Owner-directed co-design settlement of 2026-09-17; D001; [presets and shortcuts](manual/policy/configure.md#know-which-host-supplies-each-layer); [current Action interface](manual/use/github-actions.md).

## D034: Separate seven-day recovery from opted-in quantitative history

**Decision.** Keep minimized operational records for seven days. Do not create permanent analysis history before installation-admin opt-in. Opted-in history retains aggregate and pathless per-file numeric measurements, evidence/coverage, source/policy versions, PR/revision references, and compact policy/effect results. Free hosted history has a thirty-day rolling window. The paid-history design has no automatic age expiry while the entitlement and service remain active, with user-selected shorter retention, deletion, and disclosed usage/storage terms.

**Why.** Useful statistics require actual measurements and per-file distributions, not only a size band. Those facts can explain broad or concentrated changes without archiving source, filenames, contributor identities, or conversations. Operational recovery and product memory have different purposes; neither a lease TTL nor a future dashboard should choose collection consent by accident.

**Rejected or superseded.** An unresolved permanent-minimal-row fork; collecting durable history for every installation and asking consent later; storing only bands while promising numeric trends; serializing full reports and redacting a few fields; treating linkable PR/commit references or filename hashes as anonymous; retaining expired data through hidden rollups; counting retries or every PR revision as another unique PR.

**Current consequence.** [Privacy and data](PRIVACY-AND-DATA.md) owns the allowlist and lifetimes. Paths, previous paths, authors, prose, patches, arbitrary labels/templates, and full reports are not retained in analysis history, queues, logs, or exports. Context is reacquired from GitHub under current authorization and kept transient. Necessary service/account configuration is a separate disclosed store, not a history exemption. No-age-expiry is not unlimited resources or a lifetime hosting promise; pricing and usage allowances remain a future commercial release decision. Data collection, expiry, deletion, authorization, export, and recovery still require implementation and qualification. Offboarding transitions and restore-resistant deletion are selected in D036.

**Sources.** Owner-directed co-design settlement of 2026-09-17; [quantitative history contract](PRIVACY-AND-DATA.md); [App architecture](integration/github-app.md). These are selected product decisions, not a legal privacy notice or deployed retention evidence.

## D035: Target Cloudflare directly with concrete portability boundaries

**Decision.** Keep Cloudflare Workers, Queues, and D1 as the first managed App adapter and Worker hosting as the selected public-playground runtime. Do not deliberately build a temporary VPS-specific App merely to migrate it later. Keep engine/application semantics, persisted identities, and retention outside provider bindings; preserve Node consumers and a qualified material-data export/import path.

**Why.** A conventional Node/Docker host fits the existing local playground and can be a useful alternative. But recreating reliable ingress, queue/retry/lease operation, and durable application state there before moving to the already-selected Worker route creates an avoidable second operating implementation. Direct Worker qualification discovers the real portability limits early. Provider-specific adapters should remain replaceable without pretending that all providers share identical semantics.

**Rejected.** Treating spare server rental as zero total operating cost; assuming paid included usage is a hard ceiling that forces migration; coupling the engine or public report model to Queue/D1 APIs; declaring portability from interface names alone; implementing a generic multi-provider framework or two complete production stacks before either is useful.

**Current consequence.** The shared static-validator repair remains necessary for both hosted consumers and preserves Node/package/Action behavior. Queue/lease/storage/secret/ingress details stay in narrow application adapters. Persist ordinary data identities and useful export/import semantics, including opt-in, expiry, and deletion. Replacing an adapter still needs real qualification; no automatic cheap migration is claimed. Runtime, database, upstream API, service allowance, and metered cost limits are separate. D1's current 10 GB per-database limit must not be hidden by the paid no-age-expiry history design.

**Sources.** Owner-directed co-design settlement of 2026-09-17; [App operating adapter](integration/github-app.md#first-operating-adapter-and-portability); [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/); [Workers limits](https://developers.cloudflare.com/workers/platform/limits/); [D1 limits](https://developers.cloudflare.com/d1/platform/limits/); [D1 import/export](https://developers.cloudflare.com/d1/best-practices/import-export-data/). Provider documentation was checked on 2026-09-17; account usage, expenditure, deployment, and actual migration remain separately observable.

## D036: Offboard retained history without stranded access

**Decision.** Stop collection immediately for a repository deselection, provider-confirmed installation removal, paid-history entitlement end, or confirmed service-account closure. Repository deselection, installation removal, and entitlement end start a thirty-day offboarding grace; confirmed account closure skips grace after export is offered before final confirmation. During grace, the only history access exception is an independently authenticated service-account or organization administrator whose role existed before access loss. That administrator may inspect already retained numeric history, export it, shorten the grace, or delete it, but may not restore repository access, use an installation credential, reacquire GitHub context, or perform repository cleanup writes. If no valid administrator remains, the history expires on schedule. Grace expiry or account closure deletes primary history, pathless per-file rows, rollups, caches, and pending exports within seven days, with deletion/expiry tombstones reapplied across the longest supported backup-restore window plus seven days. Restoration does not resume collection without explicit re-enable, and transient or unverified access failures do not select destructive offboarding.

**Why.** Current-installation-only control combined with paid history without automatic age expiry can otherwise strand minimized but linkable numeric history after access disappears. The selected transition preserves an honest exit without treating lost repository authority as permanent retention permission or turning an outage, billing retry, or ambiguous provider response into deletion.

**Rejected.** Waiting indefinitely for a future claimant; immediate deletion for every installation or repository access loss; using an installation credential or GitHub reacquisition during grace; allowing restoration to resume collection implicitly; treating temporary failure as confirmed offboarding; or retaining the analysis projection in legally, financially, or abuse-prevention account records by convenience.

**Current consequence.** [Privacy and data](PRIVACY-AND-DATA.md#offboarding-transitions) owns the collection stop, independent-admin grace, expiry/deletion, and restore-tombstone contract. [App architecture](integration/github-app.md#permissions-and-current-access) makes that grace the sole post-installation authorization exception and keeps queued work terminal after access loss. These are selected product mechanics requiring implementation and qualification, not a deployed retention or deletion claim.

**Sources.** Owner-directed disposition of Katja's one-round review and Nyxara's selected correction in [Issue #471](https://github.com/Wolfsblvt/emergency-meeting/issues/471); [quantitative history decision](#d034-separate-seven-day-recovery-from-opted-in-quantitative-history); [Privacy and data](PRIVACY-AND-DATA.md); [App architecture](integration/github-app.md). This is a selected engineering/product contract, not a legal privacy notice or live deletion evidence.

## D037: Render the manual from repository Markdown through a generated, manifest-selected collection

**Decision.** The public website's manual is Starlight content generated at build time from an explicit manifest of repository Markdown sources (`apps/website/docs-manifest.mjs` → `tools/website-docs.mjs`). Each page keeps its source body, lifts the H1 into the title, rewrites relative links to site routes for selected pages and to the repository on GitHub for everything else, and carries provenance (source path, edit URL, applicable version, executed-example standing) in front matter. The generated collection is ignored build input. Internal records (Vision, Direction, Decisions, qualification, dated references, publication procedure) are not published.

**Why.** The repository Markdown and tested examples are canonical whether read on GitHub or on the site. Copying prose into a website tree would create a second manual that drifts; publishing `docs/**` through a glob would expose internal records and force website constraints onto every file. A manifest makes the reader-facing selection explicit and reviewable, and a generator keeps the site's front matter and link rewriting out of the maintained sources.

**Rejected.** A second website-owned copy of the manual; a broad `docs/**` glob; symlinks (fragile on Windows); a custom content loader that would bypass Starlight's maintained document pipeline.

**Current consequence.** `npm run website:build` and `check:website` regenerate the collection; the manifest is tested for existing sources and unique slugs. Optional sources (the Agent Skill, setup instructions) render and are served raw only when present. The playground's "Try it" companions are added by the generator where a page links to an asset the playground carries as a fixture.

**Sources.** [Documentation design](documentation.md); [website README](../apps/website/README.md); the accepted public-surface design's build notes.

## D038: Run the shared engine in the browser for the playground; replay saved reports instead of refetching

**Decision.** The website playground evaluates policy in the browser with the same engine the CLI ships, bundled from `dist/lib` through two small stand-ins for its only Node-bound imports (a synchronous SHA-256 for content identities and a proxy guard). Public pull requests are acquired once through the playground API's `/api/report` route, which returns the complete engine report; fixtures and curated real-PR snapshots ship their reports as static documents. Configuration edits re-evaluate that acquired report locally; nothing is refetched. Curated snapshots are captured and audited by a local maintainer tool, never by a service.

**Why.** The playground must show the real presenters, not a website re-rendering, and must let a visitor change exclusions, thresholds and whole policies against an already acquired comparison. A saved `diffdevil.report` carries the per-file facts the engine needs to recompute inclusion, scopes, metrics, bands, rules and plans, exactly as `--report` does in the CLI. Evaluating on the client keeps public compute and the shared GitHub read allowance out of every keystroke and keeps curated examples working without any server.

**Rejected.** A website-only measurement implementation; an evaluation API that uploads the report on every edit; caching only final numbers (insufficient for changed exclusions or custom metrics); a hosted engine fork for the browser.

**Current consequence.** `src/diffdevil/policy/yaml.ts` counts bytes with the portable helper instead of `Buffer`; the Action runtime was regenerated. The playground API gained `/api/report` (refusing, not truncating, above a file ceiling) and `/api/head`, with CORS on its read-only JSON. The engine's browser bundle is one lazy chunk on the playground page only.

**Sources.** [Playground experience](manual/use/playground.md); [App architecture](integration/github-app.md#shared-engine-worker-prerequisite); the design-discovered replay consequence recorded during the public-surface co-design; `apps/website/website.test.mjs` and `apps/website/qa/run.mjs`.

## D039: Keep one stable public shell across product pages and the generated manual

**Decision.** The public website and generated manual use one shared product shell.
Its stable header keeps the product identity and current location, one whole-site
search, a page-only Install menu, direct source access, a Community disclosure, one
compact cycling theme control, and at most one trailing product action. Install rows
are whole-row links to the extension, GitHub App, and open CLI/Actions product pages;
installation and store actions live on those destination pages rather than inside the
navigation menu. The footer, Support surface, site routes, generated manual shell, and
search index consume the same product-owned route and destination truth. Exact pixel
geometry may adapt by product and viewport without changing that relationship.

**Why.** Visitors should be able to move among the homepage, product routes,
playground, and manual without relearning where search, source, community, install
choices, or appearance live. One shell makes the website and repository-authored
manual feel like one product while keeping navigation distinct from conversion
actions. Whole-row destination links are clearer and more accessible than tiny nested
install actions, and a single cycling theme control avoids three competing hit zones
while preserving Dark, Automatic, and Light.

**Rejected.** Separate website and manual navigation; page-specific header clusters;
a header Install menu that mixes product-page navigation with direct store or App
installation actions; one icon-sized hit target per theme state; runtime icon or search
services; a second copy of manual content; and freezing invented Support/Sponsor art or
copy merely because the shell needs a structural slot.

**Current consequence.** `apps/website/` owns the shared shell, route/destination
sources, before-paint theme behavior, Pagefind search integration, and the structural
Support slot. D037 still owns how maintained repository Markdown becomes the manual;
this decision joins that generated content to the public shell rather than changing its
source authority. Unconfigured external destinations remain visibly unavailable and
no URL is fabricated. Final Support/Sponsor treatment and the authenticated dashboard
experience retain their separate owner/design custody. The website remains locally
qualified source only until its publication boundary is separately satisfied.

**Sources.** Wolf's complete [first lived website review](https://github.com/Wolfsblvt/emergency-meeting/issues/475#issuecomment-5736061064), [header and navigation round](https://github.com/Wolfsblvt/emergency-meeting/issues/475#issuecomment-5753098953), and [Install/theme correction](https://github.com/Wolfsblvt/emergency-meeting/issues/475#issuecomment-5753617604); [website implementation contract](../apps/website/README.md); [documentation design](documentation.md); and D037.

## D040: Make Changed the human focus and give agents a versioned compact projection

**Decision.** Human report output uses replacement-aware `Changed` as its permanent primary metric, attached to its added-only, deleted-only, and modified decomposition as one two-line block. The normal summary keeps raw facts, file facts, and relevant configured policy standing compact; `--detail full` expands complete aggregate identity/evidence/categories/scopes/metrics/bands/rules without dumping individual file records. Human evidence always uses glyph plus word. Human report and plan output support restrained `--color auto|always|never`: brand magenta identifies the lowercase product name, semantic green/rose reinforces additions/deletions, and all meaning survives in plain text. Desired plans promote the concrete selected provider label while remaining explicit that nothing was applied or read back. Agent report and plan output are materially different fixed-order line-record projections, versioned independently as `diffdevil.agent-report/1` and `diffdevil.agent-plan/1`; canonical JSON/JSONL remain the exhaustive structured contracts.

**Why.** The previous implementation rendered human and agent views from one flat row list, so neither audience received a useful hierarchy. Humans need one result to pop, its meaning nearby, and lower-priority facts subdued rather than sixteen equal-weight lines. Agents do not benefit from human alignment or decorative whitespace; they benefit from stable semantic grouping, explicit identities, typed uncertainty, and low context cost. Reports, desired plans, and observed provider results also need visibly different language so an internal band never masquerades as a provider label and a proposed effect never reads as applied.

**Rejected.** A configurable presentation-focus metric; making every configured number equally prominent; printing all zero exception states by default; separating `Changed` from its decomposition; using brand magenta for data/status/evidence; color-only meaning; agents receiving verbose human output by default; retaining `DIFFDEVIL REPORT` plus the human rows; inventing a second agent data model; reducing agent output to JSON merely because JSON already exists; deriving `size/M` from band `m`; a website-only formatter or hard-coded transcript.

**Current consequence.** [`presentation.md`](presentation.md) is the normative interface. The CLI and public library share the report/plan presenters; the website consumes them rather than maintaining display semantics. `--detail` and `--color` are confined to human report/plan presentation. Agent and machine formats never contain ANSI. Material textual changes receive public interface/release documentation without changing the canonical report schema by fiction. Provider results continue to own applied/readback standing.

**Sources.** Wolf and Nyxara's owner co-design in [emergency-meeting #491](https://github.com/Wolfsblvt/emergency-meeting/issues/491#issuecomment-5737100063); [textual branding](branding.md); [versioning and interchange](manual/reference/language-and-contracts/schemas-and-compatibility.md); [human and agent presentation](presentation.md).


## D041: Record what the Action ships, not hashes of its inputs

**Decision.** `actions/runtime/MANIFEST.json` records the distribution's target, compiler version and each vendored runtime package with its version, lock integrity, licence and notice paths. It no longer records SHA-256 hashes of source inputs (including whole `package.json` and `package-lock.json`) or of generated files. `npm run check:actions` remains the stale-distribution check: it rebuilds in temporary storage and compares every tracked byte.

**Why.** Whole-file input hashes made every development-only dependency update, such as Astro, wrangler or type packages, fail Verify on a stale manifest although no shipped byte changed. Every Dependabot PR then needed a local rebuild commit, and parallel PRs editing `package.json` conflicted on the manifest. Git already binds the committed distribution to the lockfile in the same tree, and the byte comparison catches every change that alters what runs. Wolf selected this directly: "I never asked for hash recording. … This is not needed, it just makes everything more complicated."

**Rejected.** Keeping exact-lockfile provenance with a local rebuild on every dependency PR; keeping it and letting an automated writer commit the refreshed manifest on dependency PRs, which adds a privileged machine writer for a claim no consumer reads.

**Current consequence.** A development-only dependency update can pass Verify on its own. A change to the shipped closure, compiler output or project version still fails until `npm run build:actions` is run and the generated diff is inspected. The separate release-carrier manifests used for published Skill and standalone archives are unchanged by this decision.

**Sources.** Juno's finding in [emergency-meeting #453](https://github.com/Wolfsblvt/emergency-meeting/issues/453#issuecomment-5770682443); Wolf's decision in [#453](https://github.com/Wolfsblvt/emergency-meeting/issues/453#issuecomment-5782985671); [Action distribution](integration/action-distribution.md).

## D042: Separate manual source identity from routes and preserve whole-source cutovers

**Decision.** Maintain reader-facing chapters in `docs/manual/` and render only the
explicit manifest at `docs.diffdevil.dev`. Keep the FAQ source there but render its
single product-shell route at `diffdevil.dev/faq/`. Source paths, public routes and
stable resolver identities remain separate explicit facts. Retain existing sources
until every successor in a split and its links, fragments, redirects and search
selection can transfer together. Do not create Markdown forwarding stubs.

**Why.** A task-led manual should be readable on GitHub without exposing all internal
records or making repository reorganizations change public URLs. Moving one part of
a split prematurely would create two competing current explanations or lose readers'
existing links. A finite resolver preserves selected technical source access without
turning arbitrary query input into a repository path or redirect destination.

**Implementation consequence.** D037's generated-collection model remains; the new
manual uses its own selected manifest while legacy projections survive until their
cutover. Source and Edit links identify maintained bytes. One Pagefind index joins
both static outputs and individual FAQ records, with explicit result kinds. The
shared Works shell and before-paint theme behavior remain product-owned under D039.
Linked categories and five alerts come from the accepted `starlight-works` source
package, using its supported isolated peer graph rather than copying implementation
or claiming an npm release. The build emits a native static-assets request handler
for the exact 308 host and route rules, not an unsupported domain rule in a static
redirect file. Hosting and publication remain separate effects.

**Rejected.** A second website-owned manual; source-derived public slugs; a broad
publication glob; duplicated FAQ answers; arbitrary-path source resolution; partial
retirement of split sources; and local copies of the shared navigation/alert package.

**Final reconciliation consequence.** The root README is the quick manual, the
manual root owns public learning, and the repository map owns technical discovery.
The apex's old Starlight collection is retired rather than retained as a competing
manual. Its explicit legacy inventory supplies redirects and captured semantic
fragments; retained specialist sources keep their exact source IDs. FAQ source
links and all product/manual links use one route/provenance contract, and the
joined current search excludes legacy and historical projections. The canonical
Skill installer consumes the complete folder through its maintained setup payload,
not a single-file website instruction. Source, build, publication and owner-use
standing remain distinct; this consequence grants none of the latter effects.

**Sources.** [Documentation design](documentation.md), [manual implementation
contract](../apps/manual/README.md), its explicit source/route and migration
manifests, and the accepted shared package at
`Wolfsblvt/starlight-works@22d4567006ec7a33d890fab2f3d3515332498a90`.

## D043: Give application surfaces their own top-level category

**Decision.** `apps/` is the repository category for application and hosted-service product surfaces, including shared application code. Keep app-specific runtime configuration with the application it configures.

**Why.** These surfaces have a different product and licence boundary from the reusable engine and Actions. Naming `apps/` makes that boundary visible in the repository layout and gives application-owned files, including the playground's Worker configuration, a natural home beside their code.

**Rejected.** Splitting `apps/` into the starter categories `products/` (extension, website) and `services/` (App, playground). That would cut one licence boundary in two and force `apps/shared/`, which the website and the App both use, onto one side of it, for little benefit. Standard root folder names are suggestions, and this boundary is a good reason to differ. Also rejected: leaving application configuration at the repository root solely because the tool discovers it there by default, and placing application code beside reusable package or Action implementation without a category boundary.

**Current consequence.** The playground Worker config lives at `apps/playground/wrangler.jsonc`; local Worker and dry-run commands select it explicitly. Its Worker name and deployed identity remain unchanged. The category reflects the application surfaces and their explicit licence map in [`LICENSES/README.md`](../LICENSES/README.md); it does not create another package or deployment boundary.

**Sources.** Wolf's question about root-level sprawl in [emergency-meeting #453](https://github.com/Wolfsblvt/emergency-meeting/issues/453#issuecomment-5822920184); Juno's [root check](https://github.com/Wolfsblvt/emergency-meeting/issues/453#issuecomment-5822992831); Wolf's decision in [#453](https://github.com/Wolfsblvt/emergency-meeting/issues/453#issuecomment-5823081536); [Component and licence map](../LICENSES/README.md).
