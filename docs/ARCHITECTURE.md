# diffdevil Architecture

## Meaning

This document explains the shared facts, detail, policy, host and provider boundaries implemented by diffdevil, together with the package and Action distribution that expose them. It preserves the complete product architecture without turning the current folder layout into a permanent class hierarchy or delivery sequence.

## Data movement

```text
diff source
  → source evidence
  → normalized files, hunks, edit blocks, and raw facts
  → replacement-aware facts and evidence domains
  → scopes and named metrics
  → queries, checks, bands, and rules
  → versioned report
  → optional effect plan
  → explicit provider adapter
  → applied effects and readback
```

Every arrow is a meaningful boundary. A source result is not policy. A report is not a plan. A plan is not an applied effect.

## Responsibilities

### Source adapters

Acquire evidence from local Git, complete unified diff, GitHub pull-request APIs, or saved artifacts. They identify the comparison, normalize provider-specific data, and preserve limitations.

They do not decide labels, render comments, or execute policy.

### Diff normalization and measurement

Parse file and hunk structure, identify contiguous edit blocks, retain raw counts, and derive replacement-aware facts.

The measurement layer owns versioned primitive semantics. User formulas combine primitives; they do not redefine what `modified` means.

### Evidence domain

Represent exact values, bounded values, unmeasurable quantities, unknown decisions, and incomplete collections. Preserve known relationships where treating values independently would lose a sound result.

This domain is shared by measurement, detail evaluation, queries, bands, and output.

### detail compiler and evaluator

Use Chevrotain for lexing and CST parsing. Convert to an implementation-owned AST. Bind names against a static environment, type-check, then evaluate through a closed function/operator catalog and resource budget.

No expression receives arbitrary host objects or executable callbacks.

### Policy compiler

Load and validate policy structure, compose presets and overrides, build scopes/metrics/bands/rules/templates, detect cycles and invalid ownership, compile embedded detail expressions, and produce an immutable executable policy.

Shortcut inputs lower into this same representation.

### Report and plan model

A report carries versioned facts and evaluated results. A plan carries intended effects bound to target and policy provenance.

These models are stable interoperability surfaces for CLI, API, Actions, saved artifacts, and agents.

### CLI and serializers

The CLI orchestrates sources, compilation, evaluation, output, and exit behavior. Human formatting is separate from machine serializers. Machine stdout is never contaminated by human diagnostics.

### GitHub adapter

Acquire PR evidence and apply declared provider effects. It owns pagination, provider limits, permissions, trusted policy selection, stale target handling, label-group reconciliation, comment ownership/lifecycle, definition synchronization, and readback.

It consumes plans; it does not become a second policy engine.

### Distribution

Build the npm package, public declarations, CLI launcher, and a self-contained native-ESM Action distribution. Consumer verification tests the installed artifact, not only source imports.

## Public package shape

One package exposes these deliberate runtime subpaths:

```text
@wolfsblvt/diffdevil
@wolfsblvt/diffdevil/core
@wolfsblvt/diffdevil/language
@wolfsblvt/diffdevil/policy
@wolfsblvt/diffdevil/git
@wolfsblvt/diffdevil/github
```

`/package.json` is also exported. Internal modules are closed; the package does not expose every file merely because it exists.

## GitHub Action shape

```text
action.yml
analyze/action.yml
apply/action.yml
sync-labels/action.yml
```

All entry points use shared compiled implementation. The root is convenience composition, not an alternate engine.

## Trust boundary

Diff content, paths, titles, bodies, branch names, and provider payloads may be hostile data.

Policy or templates that control privileged effects must come from a trusted source selected for that event. The implementation may support checked-out PR analysis. It must not execute hostile repository code while holding credentials that code should not possess.

The engine itself performs no arbitrary shell or JavaScript evaluation.

## Performance character

The core operations should be linear or predictably bounded in input size. Chevrotain grammar construction should be performed once per process where practical. Resource limits protect expression depth, collection work, output size, and pathological input without converting ordinary use into a ceremony.

Measure real initialization, parse, bind, evaluate, report, and bundle costs before declaring budgets or performance claims.

## Implementation freedom

The implementation session may choose:

- exact source layout;
- classes versus functions;
- immutable data representation;
- test runner and assertion library;
- YAML and schema-validation libraries;
- CLI framework;
- GitHub API client;
- bundler and packaging tools;
- generated versus handwritten public types;

provided those choices preserve the contracts above and are recorded when their maintenance consequence matters.

## Implemented recovery checkpoint

The shared TypeScript core now has actual modules:

- `src/sources/patch.ts`: strict unified-diff and provider-fragment normalization.
- `src/sources/git.ts`: tracked worktree, staged, direct, and merge-base acquisition.
- `src/numeric.ts`: finite numeric domains and validated affine replacement families.
- `src/paths.ts`: the selected Unicode-scalar glob and rename-selection semantics.
- `src/report.ts`: normalization, aggregation, scopes, and saved-report validation.
- `src/inert.ts`: inert boundary copying, immutable results, canonical identities.
- `src/model.ts`, `errors.ts`, and `limits.ts`: shared data, diagnostics, and budgets.

These modules are shared production code. The CLI and detail front end now consume
them. The policy compiler and desired-plan join are now implemented; provider
acquisition and effects remain separate work.

### Typed semantic execution

`src/language/` separates AST builders, schema/type operations, static binding,
validated environments, collection operations and interpretation. Compiled
programs and environments are process-local branded objects. A program is bound
to a schema, not one report's values; reuse requires the same schema. Runtime
primitive correlation remains private and is reconstructed only from validated
normalized report families. Host parameters cannot import affine provenance.

Structured shortcuts and Chevrotain CST conversion feed the same AST binder and
interpreter. No fallback text parser or JavaScript expression execution exists.
The interpreter implements the closed function catalog, ordered short-circuiting,
static branch checking, optional presence and uncertain collection membership.
Unknown source order does not turn `take` into an observed-only slice.

Saved custom metrics carry `metricTypes` alongside their evidence. Deserialization
preserves numeric type, but does not infer arbitrary formula correlations from
names or coincident numeric values. Policy evaluation may preserve those forms
within the same request.

## Current CLI and distribution joins

`language/shortcuts.ts` lowers typed flags directly into the same AST, binder,
checker, and evaluator. Its printed equivalent is an explanation, never the
execution path. `format.ts` validates strict scalar/list output before producing
any stdout. `cli/run.ts` returns data; the thin CLI main owns streams and exit.

`policy/bands.ts` resolves ordered ranges over numeric evidence.
`policy/templates.ts` has its own small substitution-path scanner and compiles
paths through the shared binder. It is not a detail parser. Band/rule payloads in
saved reports are validated before entering template or query environments.

The package exports generated ESM and declarations with `.js` specifiers. A real
installed-consumer check reaches the package's CLI, schema assets, API exports and
TypeScript declarations. The Node 24 Action distribution has its own isolated
consumer journey; its evidence is not inferred from the npm test. Provider
behavior is exercised through mocked HTTP, not a live-GitHub claim.

## Implemented detail front end

`language/source.ts` owns expression identity and original UTF-16 source positions.
`lexer.ts` supplies Chevrotain token definitions and strict literal validation.
`parser.ts` owns the grammar and one-time self-analysis. `cst-to-ast.ts` is a
validated independent visitor. `text.ts` joins them to the existing binder and
checker through `parseExpression` and `compileExpression`.

Chevrotain 13.2.0 is a pinned runtime dependency. The lexer and parser disable
recovery, the entry rule consumes EOF, and no recovered or partial tree is executed.
Integer spellings are checked before conversion; finite floats and string escapes
are validated explicitly. Longer tokens and keyword prefixes remain unambiguous.
Mixed operators retain written order through token categories, not reconstruction
from unordered CST property names.

The parser is synchronous and initialized once per process. Invocation state is
reset in `finally`; no user callback can re-enter it. The only grammar ACTIONs
count recursive syntax against the selected nesting budget. They never bind or
evaluate expressions. Byte/token checks precede translation and AST size/depth
checks precede binding. Parenthesis, member, key, operator, and binder ranges use
half-open UTF-16 offsets in the original source, including a single leading BOM.
Chevrotain's virtual EOF may have unavailable offsets; the semantic expression
child, not that sentinel, supplies the returned source interval.

Text and shortcut CLI selectors converge before interpretation and formatting.
Diagnostics carry phase, code, range, optional source name, and one-based line and
UTF-16 column details. The YAML authoring adapter maps decoded expressions back
to their original container positions. The public API has no Chevrotain object dependency in its
argument or result shapes.

## Implemented policy compilation and planning

`policy/validation.ts` validates inert version-1 authoring structure.
`normalize.ts` composes the bundled preset, whole named declaration replacements,
size overrides and append/replace path policy, retaining override origins.
`size-preset.ts` is generated from `presets/size-v1.yml`, not a second normative
preset. Tests bind both its source bytes and independently derived canonical
value digest. No YAML runtime is hidden inside this generated data.

`policy/source.ts` accepts native JSON and adds a bounded location walk after
`JSON.parse`: duplicate decoded keys, numeric spelling and original UTF-16
locations are checked. Decoded string boundaries rebase expression ASTs into the
configuration file before binding, so compile and runtime errors retain their
source. YAML uses the same source registry and diagnostic translation.

`compile.ts` collects declarations before binding, checks every expression,
extracts bound references, detects metric cycles and infers numeric types in
stable topological order. Final binding uses the completed schema. Metrics and
bands cannot read later-phase roots; rule conditions cannot read other rules.
CLI/saved checks are read-only queries with a boolean result requirement, not
rule conditions, so they may read completed rules. Optional result fields still
require explicit presence handling.

`evaluate.ts` owns one request's lazy dependency closure, memoized NumberValues,
rule/band results and logical work budget. Private affine quantities survive
metric-to-metric arithmetic. Report serialization retains numeric type but does
not invent those formula relationships after replay. Analysis calculates metrics
and bands; the rules phase adds read-only decisions. Policy values are copied
before immutable environment construction, leaving the evaluator's memo table
under its own ownership. IDs bind normalized policy, resolved template text and
typed parameter values, not the process-local handles.

`plan.ts` builds desired label assignments, managed-group selections, explicit
ensure/sync definition operations, held rules and rendered comment intentions.
It rejects conflicting assignments, competing group selections and assignments
that would disturb a held rule's owned labels. Unknown-band label fallback does
not establish a comment occasion. Target identity and known analyzed head/base
must agree. `readPlan` validates transported structure and these local invariants;
it does not authenticate policy, verify current GitHub state or authorize writes.
The GitHub adapter consumes these intentions through actor-bound ownership,
lifecycle observations, fresh-source checks and explicit readback, described below.

`hosts/policy.ts` acquires local policy and relative template files for the CLI and
explicit read-only workspace Action selection.
Saved reports do not trigger discovery unless policy re-evaluation is explicitly
selected. Discovered YAML is loaded and validated; malformed policy never causes fallback. The pure
`compileActionShortcut` lowers supported scalar inputs through structured ASTs
into the same compiler. Shared Action runners supply provider inputs and select
explicit execution modes; the pure shortcut compiler itself never acquires or mutates GitHub.

## YAML and fixed-schema boundary

`policy/yaml.ts` uses the YAML package's iterative CST parser, bounds nesting
before recursive document composition, then converts core-schema nodes to inert
data. It preserves ordinary bounded aliases, rejects cycles and duplicate keys,
and checks integer spellings before conversion from BigInt. Only YAML 1.2 core
values and tags enter policy data.

`policy/yaml-source-map.ts` carries scalar provenance through escapes, CRLF,
indentation, folding and chomping. The library owns scalar values; the mapper
checks its decoded projection against that value. An unhandled form reports a
scalar range and decoded coordinates rather than fabricating a character caret.
Alias diagnostics identify the anchored declaration and the alias use separately.

`scripts/schema-build.mjs` compiles only repository-owned Draft 2020-12 schemas
with Ajv into `dist/lib/validation/schemas.cjs`. Runtime `schema.ts` performs no
schema compilation. Structural validation supplements the semantic invariants
owned by report/policy/plan readers; schema success is not authorization or a
proof of arithmetic consistency. A subprocess executes the compiler with Node's
string-code-generation permission disabled.

## GitHub acquisition and explicit application

`github/client.ts` is the native-fetch boundary for a selected HTTPS GitHub API
origin, including Enterprise API prefixes. It follows only same-endpoint page
links, bounds response/collection bytes and retries safe reads with provider
backoff. It never blindly retries a write or follows a credentialed redirect.

`source.ts` normalizes PR-file evidence through the existing measurement engine.
Complete patches give exact counts; missing text patches retain bounded values.
The 3,000-file provider ceiling remains incomplete membership, not an empty tail.
Zero-count ambiguous files may be refined from a raw diff; absence is not proof
of text, binary, submodule or identity-only change. Revisions are read again after
acquisition to detect changed comparisons.

`policy.ts` loads inert policy and relative template files from an explicit full
commit SHA through Contents endpoints. It rejects symlinks, non-file objects and
escapes above the repository root. It never executes repository code. The caller
selects the trusted source; a SHA or matching hash alone is not authentication.

`apply.ts` evaluates a selected compiled policy against freshly acquired evidence
unless the host explicitly asserts report trust. Supplied plans must match the
newly derived desired plan. Before each write and after reconciliation it checks
the open PR, API/target identity and exact head/base. GitHub has no transaction
covering those reads and writes: an intervening change can leave partial effects,
which remain explicit in an incomplete result.

`labels.ts` owns case-insensitive provider identity. Definitions use verify,
ensure-missing or explicit sync; assignments add/read back before removing old
managed members. It never replaces the complete label set. Held rules reserve
their labels; conflicting case-folded intentions fail rather than using order.

`comments.ts` requires the host-selected author and valid target/policy/rule
metadata. Upsert, once, create and transition/band triggers operate on observed
owned comments. A false transition may update existing metadata without posting
a false-state comment; unresolved evidence never resets the state. Create needs
a stable host occasion ID. Duplicate ownership sequences are conflicts, not
permission to delete or arbitrarily choose a comment.

`observation.ts` owns the serial mutation journal and discriminates request
acknowledgement from readback. Ambiguous writes are reconciled by observation,
not retried blindly. A verified postcondition does not establish which concurrent
actor caused it. The returned changed count is verified changed operations, not
a count of individual labels or an atomic transaction claim.

## Host policy, output and local-Git joins

`hosts/policy.ts` owns the shared host-side JSON/YAML and relative-template
acquisition around the pure compiler. `hosts/github-policy.ts` selects bundled,
base, pinned or deliberately trusted workspace input. CLI write commands never
discover workspace policy implicitly; a base-loaded policy carries its observed
base into the before-write check. `hosts/io.ts` owns bounded UTF-8 input and
atomic complete-output replacement.

`analyzeGitHubGit` reads the PR's exact current revisions from the provider,
compares existing local objects through controlled Git commands, and binds the
result to that provider target. `source.base` remains the comparison merge base;
`source.baseTip` retains the current PR base tip for freshness checks. Clean,
smudge and process filters, external diff, text conversion and filesystem
monitors are disabled for this data-only path. Nothing is checked out or fetched.

`cli/effects.ts` selects policy and passes it to the same provider application
functions used by the library. Saved plans are rederived, not interpreted as
authorization. Rule selection restricts desired effects and needed definitions
without removing declarations, changing policy identity or skipping static
validation. Partial write outcomes retain their observation journal.

## Shared Action host and committed runtime

Four tiny entry modules call `actionMain`, then `runAction`. `surface.ts` owns
input and output names for both metadata generation and runtime validation.
`inputs.ts` treats `INPUT_*` strings and event target identity as host transport,
not policy semantics. `policy.ts` selects the shared host loader or the existing
shortcut compiler. Root, analyze, apply and sync-labels do not fork evaluation.

Root's default is an explicit convenience composition: size@1, missing-definition
creation, managed-group reconciliation and no comments. Analyze rejects effect
inputs and performs no mutation. Definition verification is read-only; definition
application requires its own selected operation. Tokens do not choose modes.

Base policy is bound to the observed base revision. Pinned policy requires a full
commit SHA. Workspace policy and template paths are confined to the checkout and
remain read-only in Actions; the intentionally trusted local CLI is a different
host. Repository-base definition synchronization rechecks its source revision
before each write and at completion. PR application checks head and base separately.

The apply Action always acquires fresh evidence. A supplied report is compared
against fresh facts after evaluation with the selected trusted policy; a supplied
plan must match a newly derived desired plan. Neither a valid schema, an embedded
hash, nor a same-job pathname authenticates a carrier. This may repeat acquisition
across analyze/apply steps, but does not trade away freshness for a convenient cache.

`outputs.ts` preflights distinct runner and artifact paths before effects, checks
the compact output budget, and persists the provider journal before other output.
Exact scalars, known bounds, unknown decisions and unobserved effects stay distinct.
Compact envelopes omit per-file and potentially large reason/candidate lists by
contract, while full files retain them. Only `main.ts` emits escaped workflow
commands. Summaries escape provider-controlled markup and distinguish desired
operations, request acknowledgment and observed readback. They expose the source
comparison, raw and replacement-aware facts, file-list completeness and bounded
policy metrics without turning unavailable scalars into zero. The display has a
fixed budget; full report and journal files retain the detail.

`scripts/build-actions.mjs` packages ordinary ESM without rewriting imports or
introducing a bundler. It carries the complete locked runtime package trees and
static Ajv validators in `action-runtime/`. The 4 metadata files and 3 sub-action
wrappers are generated from the same surface. A manifest binds source and shipped
file bytes; regeneration parity belongs to ordinary verification. Isolated
metadata-selected process execution belongs to `test:actions`. Original vendor
line endings are preserved in Git rather than normalizing bytes after hashing.

This format has a larger file count than a single-file bundle but a small,
replaceable packaging seam and no custom module resolver. Dependency evaluation
and exact consumer paths are in [Action distribution](integration/action-distribution.md).

## User documentation and examples

`docs/guides/` owns task-oriented user journeys; `docs/DOCUMENTATION.md` owns the
teaching order and future website/help source boundary. Executable examples under
`examples/` feed the same compiler and host, and ordinary tests read the actual
workflow and CLI specimens. These assets are shipped with the npm package. They
are not a second runtime or a separately maintained website implementation.
