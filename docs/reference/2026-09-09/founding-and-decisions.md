# Language founding and decisions: September 9, 2026

## Meaning

This dated companion preserves how the diffdevil language design reached its selected shape, including the selected product corrections, meaningful alternatives, and the reasons behind choices made in this package. It is historical decision evidence, not the maintained language manual or an implementation-completion claim. Later changes should supersede this record with a new dated record rather than rewrite its account of September 9.

## Public edition and provenance

This is the public technical edition prepared on September 15, 2026. The original
September 9 record and supplied conversations are preserved privately. Personal
instructions, internal consumer coordinates, and activation context are omitted;
the measurement, product, language, alternatives, rationale, and scope decisions
remain here. This is not a byte-identical transcript or a new qualification run.
Current maintained manuals supersede historical syntax or standing when changed.

The founding discussion established replacement-aware measurement and the portable
CLI/API/Action destination. The language design selected Chevrotain, optional
expression depth, and a no-config size-label workflow. The source register records
external research; the canonical branding reference owns current naming.

## Founding trajectory

### 1. The measurement problem

The starting problem was that a raw `+3/-3` replacement normally appears as six lines of churn while the intended replacement-aware count is three changed positions. The selected primitive algorithm pairs additions and deletions within one contiguous edit block, not across an entire file. Context and hunk/file boundaries separate blocks. Raw statistics remain available alongside the mutually exclusive replacement-aware categories.

Why it matters: the product's useful distinctions disappear if the formula language merely renames raw churn or cancels unrelated changes. Fuzzy similarity and semantic code analysis were rejected because they introduce a different measurement question and unstable thresholds. The language therefore consumes versioned primitives rather than making the meaning of `modified` a user-defined parser option.

### 2. A portable engine, not one labeling workflow

The design expanded the destination to one repository, one public npm package with CLI/API, multiple Action entry points, named metrics/scopes, queries/checks, and optional labels/comments. Shell and coding-agent composition became first-class rather than afterthoughts. Analysis, policy evaluation, planning, and application are distinct transitions.

Why it matters: a public tool must not inherit the implementation restrictions of one particular automation consumer. GitHub API, local Git, and unified-diff sources are legitimate adapters to the same pure engine. The language is not a GitHub-specific expression wrapper.

### 3. Dedicated language research

The preceding research compared CEL, declarative JSON-style logic, query languages, and a small purpose-built language. The decisive domain requirement was evidence-preserving arithmetic and collections: unknown values, incomplete file enumeration, correlated primitive facts, and bands that can sometimes be proved from bounds.

The selected architectural winner remains structured policy plus one constrained expression language. CEL remains the strongest runner-up when interoperability with CEL policies becomes more valuable than the direct domain syntax, or when an implementation proves the entire uncertainty model without a semantic fork. No new implementation study established that circumstance here.

### 4. Branding and latest owner correction

The product name is now `diffdevil`. The prior provisional name is superseded. The brand prohibits turning ordinary concepts into a system of demon or ritual metaphors. It also contains several clauses reflecting the earlier “no default label taxonomy” stance.

The later selected direction is clear: ship sensible default size labels and a no-config workflow that ensures and maintains them without automatic comments. That is an explicit product decision, not a contradiction to conceal with a clever reading of the old text. The narrow branding amendments are carried separately.

## D-01: Chevrotain, not Peggy

**Standing:** Owner-selected; adopted in this package.

**Decision:** Use Chevrotain's lexer and `CstParser`, a dedicated AST visitor, and a separate binder/checker/interpreter. Do not retain two parser implementations.

**Why:** Existing maintainer experience extending and testing Chevrotain supplied concrete maintenance evidence. The grammar is small, bounded, and suitable for that toolkit. No material requirement makes Peggy superior here. A familiar grammar-in-TypeScript tool with clean semantic seams is a strong fit for a maintained custom language.

**Superseded:** The previous recommendation to use Peggy-generated parsing. Its build-time parser/runtime footprint was a genuine advantage, but not decisive enough to outweigh the selected maintainability fit.

**Consequence:** Toolkit convenience does not define the language. The EBNF, AST, types, evidence model, and conformance cases remain product-owned. Production recovery is disabled; editor recovery is separate. Current Chevrotain release/API facts are recorded in the source register, not guessed from older examples.

## D-02: Name the language detail

**Standing:** Design choice selected in the September 9 record.

**Decision:** Use lowercase **detail**, introduced as “the diffdevil expression language.” Keep technical identity `diffdevil-expr/1` and file extension `.ddexpr`.

**Why:** The product exists because details inside a diff matter. This is a small, readable name without creating an occult command vocabulary or an independent package brand. It does not require ordinary users to encounter a second brand before measuring a diff.

**Rejected:** Demon/sigil/spell vocabulary conflicts with the branding reference. A backronym would add memorization without meaning. Keeping only “expression syntax” would work technically, but misses the opportunity for a small product-contained language name.

**Consequence:** No external namespace availability or trademark clearance is claimed. `detail` is a product-contained language name; consumers identify serialized semantics through the scoped machine ID. Commands remain ordinary verbs such as query/check/plan.

## D-03: Presets and shortcuts are first-class

**Standing:** Owner requirement; concrete lowering design selected here.

**Decision:** Ordinary metric selection, thresholds, any/all file checks, path selection, and projection have structured CLI flags and Action inputs. Built-in presets provide complete policies. These compile into the same typed core as advanced expressions.

**Why:** Extensibility is useful only when basic usage does not require establishing a miniature programming environment. The preceding long language recommendation was not a demand that every Action user write lambda expressions.

**Rejected:** A simplified second evaluator, an expression-only CLI with a few documentation examples, or basic mode that silently changes unknown to false. Also rejected: generating executable source by concatenating user paths and thresholds.

**Consequence:** The package contains explicit shorthand catalogs, equivalence examples, and parity cases. A user can inspect/export the complete effective policy. Moving from a shortcut to a formula is a change in authoring depth, not numerical meaning.

## D-04: A useful no-config size workflow

**Standing:** Owner-selected reversal of the earlier no-default-label position.

**Decision:** The root Action defaults to applying `size@1`, creates missing required label definitions, reconciles one managed size assignment, and posts no comments. `/analyze` is the obvious read-only route. `labels verify` and `labels apply` expose deliberate definition checking/reconciliation.

**Why:** A tiny workflow should deliver the actual first useful result. Requiring a user to manually create labels, copy rules, and learn configuration before the flagship example works is avoidable integration labor. The selected first-use experience includes sensible defaults.

**Rejected:** Default labels as documentation-only examples; a separate mandatory setup workflow; token-presence-driven mutation; automatic PR replies; default XL failures; replacement of unrelated PR labels.

**Consequence:** Selecting the root Action is selecting its documented label effects. Existing definition metadata is preserved in default ensure-missing mode. The canonical default labels are `size/XS`, `size/S`, `size/M`, `size/L`, `size/XL`, and `size/Unknown`, with 20/100/500/1000 exclusive cut points. Definition synchronization remains separately available.

## D-05: No hidden path exclusions in size@1

**Standing:** New default-policy choice selected here.

**Decision:** The default size preset includes all tracked diff material and displays limitations honestly. Project exclusions are explicit and inspectable.

**Why:** A language-neutral public tool cannot reliably infer whether generated-looking, vendor, snapshot, or lockfile changes are irrelevant to a repository's review orientation. Hidden exclusions would make the first reported number difficult to explain. This keeps the no-config experience truthful while one small config or Action input can add known exclusions.

**Rejected:** Reusing an internal company's broad exclusion list as universal public truth, or using an unreviewed generated-file classifier as a prerequisite for useful defaults.

**Consequence:** This is a chosen default, not a retreat from configurable presets or path scopes. Future ecosystem presets can add explicit named exclusions without changing `size@1` silently. Included binary/submodule material can yield Unknown rather than pretending zero.

## D-06: One language, several constrained contexts

**Standing:** Retained and made concrete.

**Decision:** Metrics require numeric results, conditions/checks require booleans, and queries may produce supported data values/collections. The same operators and functions retain their meaning across contexts. Bands and effects remain structured YAML. Templates remain lookup/formatting only.

**Why:** Familiar source syntax and one evaluator reduce re-learning and cross-surface drift. Structured bands can prevent gaps and overlaps by construction; making them nested ternaries would lose useful validation. Effect functions would blur the pure-core boundary.

**Rejected:** One general-purpose executable language for everything, four unrelated languages for four commands, and a nested JSON logic tree as the normal hand-authoring surface.

**Consequence:** Context is a binder environment/result constraint, not separate parsers. No runtime callback registration, arbitrary reduction function, regex execution, or implicit current-file root is introduced.

## D-07: Evidence-aware values and collections

**Standing:** Retained and expanded for implementation precision.

**Decision:** Numeric exact/bounded/unknown/unmeasurable states remain distinct from missing, null, and errors. Conditions are three-valued. Collections retain possible membership and unseen remainder. Strict scalar/path output refuses unresolved selected results.

**Why:** A syntactically convenient query that drops uncertain files can produce an unjustified “all clear.” A min/average over a possibly empty collection has unresolved presence, not merely an unknown number. Bounded band classification can often prove a useful result without an exact count.

**Rejected:** Null-as-everything, unknown-as-false, silent filtering of nulls, singleton unboxing, `otherwise` as an unknown bucket, and reporting the largest observed file as the proven global largest.

**Consequence:** `certain` is an explicit observed-only projection. Numeric primitive-family correlations preserve destructive-line identities. Boolean short-circuiting follows source order and never absorbs an encountered error. The wire result carries these distinctions instead of asking scripts to infer them from prose.

## D-08: Checked integers and finite binary64

**Standing:** Retained with explicit numeric details.

**Decision:** Count integers remain in the exact safe range, integer arithmetic is checked, fractional calculations use finite binary64, and observable negative zero is normalized. No hidden epsilon or decimal rounding policy is introduced.

**Why:** Counts must survive normal JSON/TypeScript/PowerShell consumers without silent rounding. Fractional weights are useful but should have familiar explicit machine-number semantics rather than an undeclared arbitrary-precision package dependency.

**Rejected:** Unsafe JavaScript integers as apparently exact counts, NaN/infinity values in JSON, or silently treating exact measurement as exact real arithmetic.

**Consequence:** Primitive integer correlations use a finite affine model. Float expressions do not inherit general symbolic cancellation. Any future numeric model requires an explicit semantic profile.

## D-09: Structured cut-point bands

**Standing:** Retained.

**Decision:** Use increasing exclusive upper cut points and one final numeric otherwise. Validate IDs, ordering, domain floor, final-tail placement, and mappings.

**Why:** This prevents gaps/overlaps structurally, including the original ambiguous 1000 boundary, and gives a stable result reusable by labels, comments, CLI, and JSON.

**Rejected:** Independently authored overlapping intervals or arbitrary boolean predicates for ordinary numeric bands. Advanced boolean rules remain available for non-band policy.

**Consequence:** A bound wholly within a band resolves it, including a one-sided lower bound proving the unbounded tail. Crossing boundaries is unknown. Unmeasurable never becomes the numeric tail.

## D-10: Pure compilation/evaluation and deliberate adapters

**Standing:** Retained; no internal company policy exported.

**Decision:** Diff acquisition, language evaluation, and GitHub application are separate responsibilities. The public root Action composes them conveniently but does not merge their trust boundaries.

**Why:** This supports local scripts, agents, direct TypeScript, CI systems, reusable plans, and trusted fork-safe GitHub automation from one product. One internal consumer's stricter workflow restrictions are not universal product authority.

**Rejected:** A global ban on local Git/checkouts, arbitrary command hooks in policy, untrusted head policy under privileged credentials, and hashes treated as authentication.

**Consequence:** The default privileged workflow consumes API diff data without head-code execution. A custom config is loaded from a trusted selected source. Apply validates current target identity and reads back managed effects; provider operations are not falsely called transactional.

## D-11: Reference package, not a condensed handoff

**Standing:** Explicit owner request.

**Decision:** Separate the two front-door docs from detailed language/integration pages, machine assets, complete examples, and dated references. Include a durable parser architecture and a distinct dated implementation guide.

**Why:** Grammar decisions, error edge cases, collection evidence, CLI quoting, and preset expansion cannot be reconstructed reliably from a short summary. The reference needs enough information for implementation and later extension without re-opening every settled fork.

**Rejected:** One compressed all-purpose Markdown, or duplicated canonical specs hidden inside historical notes. Also rejected: pretending this reference package is an implemented repository scaffold.

**Consequence:** Each document owns one subject and links related truth. Sources remain attributable. Qualification distinguishes asset checks from parser/evaluator/platform tests that were not run.

## What could still change without reopening the product

The implementation can adapt module filenames to the real repository, choose its existing healthy test runner, measure budgets and bundle costs, and select a qualified patch version of Chevrotain. Those are implementation choices as long as they preserve the selected language/preset/CLI semantics.

Changes to the language name, operator meaning, unknown handling, primitive precision, default size policy, or root mutation contract are product changes and must be recorded as such. A smaller implementation tranche may expose fewer capabilities honestly; it must not erase their preserved destination.

## Material limitations of this record

The exact current diffdevil repository was not inspected. No package was published, no Action release was created, and no source repository was modified. The owner's statement that verify/apply label operations already exist is treated as the selected vocabulary and product context, not independently verified code evidence.

The current selected-tool research is primary-source documentation review, not a benchmark or security audit. The supplied conformance vectors are expectations to implement and execute. They do not imply a runtime passed them.
