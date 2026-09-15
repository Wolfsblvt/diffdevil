# diffdevil Implementation Horizon

## Meaning

This document preserves the complete implementation destination and the substantial fronts required to reach it. It is deliberately not a calendar roadmap or a command-by-command build recipe. The implementation session may change sequence, module layout, dependencies, and intermediate cuts while preserving the selected product and the evidence each public claim requires.

## Destination

Leave one locally runnable repository that is close to a public release candidate:

- the core measurements and evidence model work;
- the detail language is implemented against its specification;
- the CLI and TypeScript API are genuinely useful;
- policy compilation and effect planning work;
- the GitHub Action entry points are bundled and exercised;
- label assignments, comments, and label definitions have an implemented adapter;
- reports, plans, presets, shortcuts, and schemas agree;
- actual package consumers can install and invoke the built result;
- documentation clearly marks any remaining unimplemented or unqualified surface.

Near-complete does not mean every future adapter, optimisation, or visual asset exists. It does mean the selected product is recognisable and joined, rather than six disconnected prototypes.

## Build from useful behavior

The first user-visible path should cross real boundaries:

```text
real Git or unified diff
  → normalized file facts
  → raw and replacement-aware measurements
  → versioned report
  → useful query or check
```

That path makes measurement, evidence status, machine output, and CLI behavior judgeable early. It should use production seams, not a disposable alternate model that will later be replaced.

## Joined implementation fronts

### Diff sources and normalized facts

Implement a shared source contract for:

- local Git comparisons, including the selected working-tree default;
- explicit revision comparisons;
- complete unified-diff input;
- GitHub pull-request data;
- saved normalized reports where appropriate.

Normalize paths, statuses, hunks/edit blocks, raw counts, file evidence, and source identity. Source adapters acquire evidence; they do not evaluate policy.

Do not force every source to pretend it has identical evidence. Preserve source limitations in the report.

### Replacement-aware measurement and evidence

Implement stable `replacement-lines-v1` semantics:

- pair additions and deletions only within one contiguous edit block;
- reset at context, hunk, and file boundaries;
- preserve raw additions, raw deletions, and raw churn;
- derive added-only, deleted-only, modified, and replacement-aware changed counts;
- represent pure renames, binary material, submodules, malformed/truncated patches, and excluded material honestly;
- preserve exact and bounded relationships rather than treating every interval as independent.

This is a central product contract, not one configurable formula.

### The detail language

Implement the selected Chevrotain lexer and CST parser, followed by separate AST construction, binding, type checking, evaluation, and diagnostics.

Use the grammar, catalogs, AST/value schemas, environments, diagnostics, limits, and conformance cases as executable inputs where practical.

The interpreter is closed and deterministic:

- no JavaScript evaluation;
- no shell, network, filesystem, reflection, dynamic import, regex execution, or host callback registration from expressions;
- explicit function/operator catalog;
- bounded work and value sizes;
- context-aware root availability;
- source-positioned failures;
- unknown decisions and invalid operations remain distinct.

### Policies, presets, shortcuts, templates, reports, and plans

Join configuration structure and detail expressions through one compiler/evaluator.

Implement:

- path defaults and named scopes;
- named metrics and dependency validation;
- bands and ordered cut points;
- boolean rules;
- the `size@1` preset;
- shortcut lowering and parity;
- parameter binding;
- template placeholders and lifecycle triggers;
- report and plan schemas;
- plan target/provenance validation.

The root Action's default experience remains no-config size labels with no comments. `/analyze` remains read-only.

### CLI and TypeScript API

Make the CLI a first-class automation tool, not a human report wrapper.

Support the intended command neighborhood:

```text
analyze
query
check
plan
apply
labels validate
labels sync
schema
explain
```

Preserve:

- machine-clean stdout;
- diagnostics on stderr;
- distinct true, false, error, and unresolved exits;
- scalar, line, NUL, JSON, JSONL, environment, human, Markdown, and agent projections only where their contract is complete;
- saved reports and plans;
- PowerShell and Bash usability;
- public TypeScript result unions that preserve unknown versus failure.

The TypeScript API should expose coherent operations and deliberate subpath exports from one package. Do not split public packages without evidence that independent versioning or dependency weight requires it.

### GitHub acquisition and effects

Implement GitHub behavior as an adapter around the same core:

- trusted configuration selection;
- complete pagination and provider-limit handling;
- root, `/analyze`, `/apply`, and `/sync-labels` entry points;
- common scalar outputs plus report/plan artifacts;
- managed-label-group reconciliation;
- definition ensure/validate/sync behavior;
- comment create/once/upsert/transition/band-change behavior;
- exact comment ownership and safe update/delete;
- stale target and stale plan refusal;
- permissions and fork-event behavior;
- effect readback and ambiguous-response recovery.

Support safe API-only privileged use and ordinary checked-out Git use where appropriate. The product boundary is not “checkout forbidden”; it is “do not execute hostile pull-request content with credentials it should not possess.”

### Packaging and consumer truth

Produce and test what users will actually receive:

- npm tarball contents;
- CLI bin and Windows-generated launcher;
- public declarations and exports;
- source maps where selected;
- bundled Action entry points and metadata;
- Node 24 Action runtime;
- examples that execute against the built product;
- schema and preset availability from the installed package;
- no runtime dependency installation in consumer Action jobs.

Build output is generated product. Keep authored source and generated distribution responsibilities clear.

## Shortcut usability seam

Do not settle shortcut quality by counting characters.

Test complete tasks:

| Task | Question |
| --- | --- |
| Total changed lines | Does the shortcut communicate the selected metric more clearly than the expression? |
| Threshold check | Does it reduce quoting and exit-handling friction? |
| Any large file | Does it eliminate collection syntax users should not need for a common check? |
| Return matching paths | Does it make a safe determined-membership projection obvious? |
| Custom formula | Does the full grammar become the clearer and more honest route? |
| Action rule | Does inline shorthand remain readable in YAML and GitHub expressions? |

The product may teach presets, selected shortcuts, and full expressions at different depths. It does not need to pretend every operation deserves both spellings.

## Verification shape

Keep pure contract tests cheap and numerous. Add integration tests where a boundary genuinely changes:

- parser/AST/binder/type/evaluator;
- uncertainty and collection semantics;
- path matching and source acquisition;
- policy and shortcut compilation;
- output serializers and exit codes;
- package consumers and launchers;
- Action bundles and outputs;
- mocked GitHub effects;
- focused live-provider canary only after separate authorization.

Use the 189 returned cases as a starting corpus, not a quota or proof of completeness. Add counterexamples discovered through implementation.

## Documentation movement

Update maintained documents when behavior changes. Preserve source-derived terminology. Move implementation-specific truth into architecture, development, command, and API references rather than rewriting the founding record.

Public-facing copy must remain truthful to the implemented release. The complete Vision and brand destination may remain broader than the first release.

## Completion judgment

A credible implementation return states:

- what useful paths work end to end;
- exact build/test/package/Action evidence;
- which specification suites pass;
- which selected surfaces remain incomplete;
- any contract contradiction and its disposition;
- dependency/runtime choices and why;
- the current local Git coordinate;
- the best next product movement.

Do not call source code, a green unit suite, a tarball, and a live GitHub effect the same fact.
