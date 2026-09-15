# Versioning and interchange

## Meaning

This document defines the public representation and evolution boundary for detail-backed diffdevil reports, query results, plans, and semantic profiles. It preserves exact/bounded/unknown/unmeasurable evidence outside the evaluator and prevents a saved formula from changing meaning after an ordinary dependency update. Internal CST/AST objects are not persisted public programs.

## Separate versioned meanings

| Identity | Governs |
| --- | --- |
| npm/Action version | Distribution, package API, and supported host runtime. |
| Configuration `version: 1` | Policy document structure and its frozen default language binding. |
| `diffdevil-expr/1` | Syntax, type rules, functions, uncertainty behavior, and evaluation order. |
| `diffdevil-number/1` | Safe integers and finite binary64 numeric semantics. |
| `replacement-lines-v1` | Meaning of added-only, deleted-only, modified, and changed lines. |
| `diffdevil-glob/1` | Path-pattern and endpoint matching semantics. |
| `size@1` | Shipped size metric, thresholds, labels, path defaults, and comment policy. |
| `diffdevil-limits/1` | Logical cost accounting and the selected default budget profile. |
| Report/query/plan schema `1.0` | The corresponding serialized artifact shape. |

Expression version 1 binds its numeric and standard-library profile; users do not have to repeat every identity in a small config. Artifacts record the resolved set. A Chevrotain dependency version is implementation provenance, not a new language identity.

## Report envelope

A full report has `kind: diffdevil.report`, `schemaVersion: "1.0"`, `semantics`, `source`, `measurement`, `fileSet`, `totals`, and observed `files`. Optional evaluated policy sections contain compatible `metrics`, `bands`, `rules`, and `scopes`, plus their policy identity.

Standard numeric facts are tagged measurements:

```json
{
  "kind": "diffdevil.report",
  "schemaVersion": "1.0",
  "semantics": {
    "language": "diffdevil-expr/1",
    "numbers": "diffdevil-number/1",
    "replacementLines": "replacement-lines-v1",
    "paths": "diffdevil-glob/1"
  },
  "totals": {
    "lines": {
      "changed": {"status":"bounded","lower":60,"upper":70}
    }
  }
}
```

This excerpt omits required fields to show the measurement encoding. Complete valid examples are in [reports](../../examples/reports/exact.json).

Inside detail, `totals.lines.changed` denotes the typed measurement itself. External JSON consumers inspect `.status`, `.value`, `.lower`, or `.upper`. The wire format never switches unpredictably between a number and null. Convenience scalar output unwraps an exact measurement only when that projection is valid.

## Files and completeness

Observed files are a normal JSON array, useful for jq and PowerShell. Each file has `id`, `path`, optional `oldPath`, `changeType`, `kind`, `included`, numeric `raw`/`lines`, and measurement evidence.

`fileSet` contains `complete` and a `total` integer measurement. A complete set must have exact total equal to the observed count. An incomplete set can still have an exact total greater than observed count. Report validation rejects impossible totals, duplicate IDs, invalid paths, and contradictory complete flags.

The evaluator constructs logical collection membership/remainder from these fields. Query selections use a separate rich value encoding because filtering can introduce uncertainty that did not exist in the original observed array.

Scope records contain the selected observed file IDs, scope completeness/cardinality metadata, and selected totals. They do not duplicate entire file records. All referenced IDs must exist in the report. A scope cannot claim complete selection when incomplete global evidence permits unseen matches, except for a selection proven empty by its definition.

For known text primitive families, source/count evidence records whether raw counts and block measurement were established. The reader validates exact identities and permissible bounds before reconstructing affine correlations. Reports may retain per-block evidence when requested; the line language does not require every consumer to deserialize full patch text.

## Query-result encoding

A query result has `kind: diffdevil.query`, schema/semantic identities, source/report identity, `value`, and evidence notes. Value variants are explicit:

```text
number      measurement with numericType
boolean     resolved/unknown decision
string      exact present string
null        explicit null
missing     structural absence
unknown     typed unknown nonnumeric value or uncertain optional presence
record      named fields, each another typed value
collection  entries with definite/possible membership, unseen count, and order
```

Numeric unknown and unmeasurable use the numeric measurement variant. Unknown boolean uses the decision variant. A generic unknown value supplies an explicit type description, including optional presence when needed. This prevents an unresolved optional average from being mistaken for a present unknown number.

A collection stores observed entries in stable order, each with `membership` and `value`. Its `unseen` object carries `possible`, minimum count, and an optional maximum. `order` is `known` or `unknown`. A definite-only projection retains an evidence note even though its new observed-only collection is complete.

This encoding favors correctness over pretending that every query is raw JSON transformation. Users who want raw exact scalars or plain JSONL records have explicit strict output modes. Those modes do not alter the canonical envelope.

## Report JSONL and compact Action summaries

`analyze --format jsonl` is a sequence with a header record containing schema/semantics/source, file records containing normalized file data, and a final summary containing fileSet/totals/policy results. Each line has a `recordType`. A consumer must see the final summary to treat the stream as a completed report. An interrupted stream is not a successful complete report.

`query --format jsonl` is deliberately different: a strict determined collection serialized as one plain JSON value per item. It has no report header and cannot encode unresolved membership. The command selects the protocol; consumers must not infer it from the first field they happen to recognize.

The Action's `report-json` compact output has `kind: diffdevil.summary`, explicit schema/semantics, totals, selected metric/decision/band, and `reportPath`. It is not accepted by `--report` as a complete report. The full artifact remains available through `report-path`.

## Plan encoding

A plan has `kind: diffdevil.plan`, schema/semantic identities, source comparison identity, report identity, policy identity, target, rule decisions, held effects, and supported operation records. Operations are data variants such as ensure/sync label definition, add/remove PR label, and reconcile owned comment.

A pure desired-state plan can leave exact provider changes unresolved until the adapter reads current labels/comments. Its `stage` distinguishes `desired` from `materialized`. A materialized plan records the provider-state preconditions it relied on. An adapter never treats an unknown operation kind as a harmless field to skip.

Unknown rules can produce held records without invalidating the whole plan. Explicit policy conflict, unsupported semantics, or `onUnknown: fail` prevents application. Plan validity does not establish that any external effect happened.

## Source identity and freshness

A source identifies the comparison kind, base/head or worktree snapshot identity as applicable, repository/PR where relevant, and selected comparison semantics. GitHub apply binds to the exact analyzed PR head and relevant base comparison. Local worktree reports are useful for scripts but are not automatically authorized PR mutation evidence.

Stable content hashes can connect report, policy, and plan bytes. They are not signatures and do not establish trust in an artifact. An apply adapter requires a trusted source/provenance route and current target validation in addition to structural/hash checks.

Descriptions such as “same job” or “came from an artifact” do not themselves authenticate data. The declared workflow trust boundary determines whether a report is acceptable or must be reacquired.

## Forward-compatible consumption

Readers accept unknown additive fields within a supported report major version while validating fields they use. A new unknown numeric state, source kind affecting comparison meaning, or required capability is not an additive cosmetic field. Reject or explicitly report unsupported semantics rather than coercing it to exact/zero.

Configuration remains strict because unknown keys are often misspellings. Plan execution remains strict because skipping an unknown effect can violate desired state. Forward-compatible reading is not permission for permissive execution.

A minor report version may add optional fields. It must not change the meaning of existing fields, alter required presence, or repurpose an enum value. Producers should emit only a version they actually implement, and readers should report their supported profiles through `schema` discovery.

## No silent semantic drift

Within `diffdevil-expr/1`, do not change operator precedence, numeric rounding/promotion, truthiness, optional handling, empty collection results, interval comparisons, unknown filtering, supported correlation precision, path matching, or function behavior.

An improvement that changes an unresolved decision into a resolved effect can be observable policy change even when it feels like an optimization. The finite affine family model and conservative collection rules are therefore versioned. A new proof strategy that changes results needs a new explicit semantic profile, not a quiet library patch.

Fixes that restore the published contract are defect corrections. Release notes should identify affected cases and accompanying conformance changes. A security correction may disable an unsafe route, but must not silently reinterpret old source text.

Default-size threshold/color/name changes require a new preset identity. Package updates can add a new preset while retaining `size@1`. A new major root Action may deliberately select a newer default with a documented migration; the existing major cannot silently replace its selected policy meaning.

## Persist authored source, not parser internals

Persist original expression text, its language identity, normalized policy identity, required schema context, selected semantics, result evidence, and source comparison identity. Do not serialize Chevrotain tokens/CSTs, mutable AST classes, closures, or a VM instruction object as the portable program contract.

An implementation cache is disposable and bound to compiler implementation/profile identity. It can be rebuilt from source. A public report is not allowed to supply executable cache contents.

## Migration posture

Pre-release provisional names and parser experiments do not automatically create legacy obligations. The earlier provisional product spelling and Peggy mechanism need no permanent compatibility layer because this package identifies no released consumer requiring one.

After release, a migration command can write a reviewable candidate:

```text
diffdevil migrate --from 1 --to 2 --write candidate.yml
```

This is the future migration interface direction, not a command implemented by this package. It must explain semantic changes and mark cases requiring judgment. Never rewrite configuration silently during analyze/query/apply.

Older released language profiles remain supported while real consumers depend on them or receive an explicit migration policy. A profile's implementation must be testable against its own conformance cases, not reconstructed from current syntax by guesswork.

## Schema scope and qualification

The supplied Draft 2020-12 schemas cover the selected structural contracts. Semantic validation additionally checks bounds/order, integer categories, metric graphs, references, scope membership, primitive identities, plan freshness, and ownership. JSON Schema alone does not prove any of those relational claims. See [S1](../../reference/2026-09-09/sources-and-research.md#s1).

The package qualification report distinguishes schema/example checks from unexecuted parser, evaluator, shell, and GitHub behavior. A well-formed schema is useful groundwork, not evidence of a working Action.

## Pre-release saved metric type repair

The current report contract pairs `metrics` with a matching `metricTypes` map of
`integer` or `float`. An exact JSON value such as `1` does not retain whether a
formula produced an integer or a float. Both maps must be present together and
have identical keys. This is a pre-release contract repair, recorded in D018,
not a backwards-compatible change to a released report profile.
